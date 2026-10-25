/**
 * OI assistant mode — Host half.
 *
 * State is per session and derived from the durable `/oi` command lifecycle:
 * the projection folds `command/run` and `command/done`, so resume, fork, and
 * reload keep the mode without any private event types. The prompt itself is a
 * volatile plugin config field (global, editable in Settings), not session
 * state.
 */

import { createRequire } from 'node:module'
import { join } from 'node:path'

import { OI_SYSTEM_PROMPT } from './prompt.js'
import { OI_COMMAND, oiProjection, targetOf } from './projection.js'

const require = createRequire(import.meta.url)

/**
 * Load the schema library the Host already ships.
 *
 * Local-directory installs are often linked into the profile, in which case a
 * package-local `require('@deepseek-ai/schemastery')` cannot resolve. The
 * desktop app's own copy is the same version and is the reliable fallback.
 *
 * @returns {any} schemastery's default export.
 */
function loadSchemastery() {
  try {
    const loaded = require('@deepseek-ai/schemastery')
    return loaded.default ?? loaded
  } catch {
    const resources = process.resourcesPath
    if (typeof resources !== 'string' || resources === '') {
      throw new Error(
        'OI assistant: cannot locate @deepseek-ai/schemastery (this plugin runs inside the DSH desktop app)',
      )
    }
    const loaded = require(
      join(resources, 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'schemastery'),
    )
    return loaded.default ?? loaded
  }
}

const z = loadSchemastery()

/**
 * Editable prompt configuration.
 *
 * `.volatile()` is what makes the field appear in the settings form and lets a
 * saved value take effect without remounting the plugin. The value is exposed
 * as a volatile accessor, read through `.get()` in {@link readPrompt}.
 */
export const Config = z.object({
  prompt: z.string().min(1).default(OI_SYSTEM_PROMPT).volatile(),
})

/** Services this Host plugin requires. */
export const inject = ['systemPrompt', 'sessionProjections']

/**
 * Read the current prompt, tolerating both a volatile accessor and a plain
 * string (for example if a future Host normalizes the config shape).
 *
 * @param {any} config Parsed plugin config.
 * @returns {string} The effective prompt.
 */
function readPrompt(config) {
  const field = config?.prompt
  let value
  try {
    value = typeof field?.get === 'function' ? field.get() : field
  } catch {
    value = undefined
  }
  return typeof value === 'string' && value.trim().length > 0 ? value : OI_SYSTEM_PROMPT
}

/**
 * Whether the calling agent's session has OI mode committed.
 *
 * @param {any} ctx Host plugin context.
 * @param {any} session Agent session.
 * @returns {boolean}
 */
function isActive(ctx, session) {
  return ctx.sessionProjections.stateOf(session, 'oi')?.active === true
}

/**
 * Mount the projection, prompt section, `/oi` command, and settings policy.
 *
 * @param {any} ctx Host plugin context.
 * @param {any} config Parsed plugin config.
 */
export function apply(ctx, config) {
  ctx.sessionProjections.register(oiProjection)

  // Order 550 sits just after plan mode's 500. The prompt is literal text, so
  // disable interpolation: braces in a user-edited prompt are not variables.
  ctx.systemPrompt.section({
    name: 'oi:policy',
    order: 550,
    interpolate: false,
    text: (context) => {
      const session = context.agent?.session
      if (session === undefined) return ''
      if (!isActive(ctx, session)) return ''
      return readPrompt(config)
    },
  })

  ctx.inject(['commands'], (commandCtx) => {
    commandCtx.commands.register({
      definitionId: 'dsh-oi-assistant',
      name: OI_COMMAND,
      description: '开启或关闭 OI 助手模式',
      input: { hint: '[on|off|toggle|status]' },
      handler: ({ agent, rawInput }) => {
        if (agent === undefined) {
          return { kind: 'error', text: '/oi 需要一个活动会话。' }
        }
        const argument = typeof rawInput === 'string' ? rawInput.trim() : ''
        const active = isActive(ctx, agent.session)
        if (argument === 'status') {
          return {
            kind: 'success',
            text: active ? 'OI 助手模式当前为开启。' : 'OI 助手模式当前为关闭。',
          }
        }
        const target = targetOf(argument, active)
        if (target === undefined) {
          return { kind: 'error', text: '用法：/oi [on|off|toggle|status]' }
        }
        return {
          kind: 'success',
          text: target
            ? 'OI 助手模式已开启（从下一次模型步骤生效）。'
            : 'OI 助手模式已关闭（从下一次模型步骤生效）。',
        }
      },
    })
  })

  // This plugin owns its Settings page (“OI 助手提示词”), so tell the Settings
  // service not to auto-generate one from the schema.
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
}
