/**
 * The `/oi` command's durable projection.
 *
 * This file is deliberately dependency-free so the state machine can be
 * exercised by `node --test` without the DSH host or its schema library.
 */

/** The command name this projection owns. */
export const OI_COMMAND = 'oi'

/**
 * Parse the argument text into the state the command wants.
 *
 * `status` (and anything unknown) returns `undefined`: the projection then
 * records no pending target, so the logged `command/done` cannot change state.
 *
 * @param {unknown} raw Argument text after the command name.
 * @param {boolean} active The committed state when the command starts.
 * @returns {boolean | undefined} Wanted state, or undefined for status/invalid.
 */
export function targetOf(raw, active) {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (value === '' || value === 'on') return true
  if (value === 'off') return false
  if (value === 'toggle') return !active
  return undefined
}

/** @param {unknown} value */
function parseState(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('oi projection state must be an object')
  }
  const state = /** @type {{ active?: unknown, running?: unknown }} */ (value)
  if (typeof state.active !== 'boolean') {
    throw new TypeError('oi projection state.active must be a boolean')
  }
  const running = state.running
  if (running === null || typeof running !== 'object' || Array.isArray(running)) {
    throw new TypeError('oi projection state.running must be an object')
  }
  const checked = {}
  for (const [commandId, target] of Object.entries(running)) {
    if (commandId.length === 0 || typeof target !== 'boolean') {
      throw new TypeError('oi projection state.running must map command ids to booleans')
    }
    checked[commandId] = target
  }
  return { active: state.active, running: checked }
}

/** @param {unknown} value */
function parseView(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('oi projection view must be an object')
  }
  const view = /** @type {{ active?: unknown }} */ (value)
  if (typeof view.active !== 'boolean') {
    throw new TypeError('oi projection view.active must be a boolean')
  }
  return { active: view.active }
}

/** @type {import('@deepseek-ai/dsh-session-projection').SessionProjectionDefinition} */
export const oiProjection = {
  key: 'oi',
  stateVersion: 1,
  stateSchema: { parse: parseState },
  init: () => ({ active: false, running: {} }),
  apply: (state, event) => {
    if (event.type === 'command/run' && event.data.name === OI_COMMAND) {
      const target = targetOf(event.data.args, state.active)
      if (target === undefined) return state
      return {
        ...state,
        running: { ...state.running, [event.data.commandId]: target },
      }
    }

    if (event.type === 'command/done' && Object.hasOwn(state.running, event.data.commandId)) {
      const target = state.running[event.data.commandId]
      const running = { ...state.running }
      delete running[event.data.commandId]
      return {
        ...state,
        running,
        active: event.data.kind === 'success' ? target : state.active,
      }
    }

    return state
  },
  wire: {
    viewSchema: { parse: parseView },
    view: (state) => ({ active: state.active }),
  },
}
