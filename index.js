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
import { join, resolve as resolvePath } from 'node:path'

import { OI_SYSTEM_PROMPT } from './prompt.js'
import { OI_COMMAND, oiProjection, targetOf } from './projection.js'

const require = createRequire(import.meta.url)

/**
 * Create a `require` whose module lookup starts at one Host anchor.
 *
 * `createRequire` wants an absolute filename or a file URL; relative paths are
 * resolved against the current working directory first.
 *
 * @param {string} anchor Absolute path or `file:` URL to the Host entry.
 * @returns {NodeRequire} A require bound to that anchor.
 */
function requireFrom(anchor) {
  return createRequire(anchor.startsWith('file:') ? anchor : resolvePath(anchor))
}

/**
 * Load the schema library the Host already ships.
 *
 * Both carriers install `@deepseek-ai/schemastery` beside their own packages:
 * the desktop app keeps it inside `app.asar`, while the web/CLI host keeps it
 * in its installation's `node_modules`. A linked plugin normally has no copy
 * of its own, so the first attempt relies on DSH's runtime resolution: the
 * optional peer dependency declared in package.json routes the request to the
 * Host copy on both carriers. The remaining attempts are explicit anchors for
 * Host versions that do not install that routing or for unusual link layouts.
 *
 * @returns {any} schemastery's default export.
 */
function loadSchemastery() {
  /** @type {{ label: string, load: () => any }[]} */
  const attempts = [
    { label: 'plugin-local resolution', load: () => require('@deepseek-ai/schemastery') },
  ]

  // Web, headless, SDK, ACP, and other CLI profiles all start from the dsh
  // launcher entry. Its own node_modules contains the schema library.
  const entry = process.argv[1]
  if (typeof entry === 'string' && entry.length > 0) {
    attempts.push({
      label: 'DSH launcher',
      load: () => requireFrom(entry)('@deepseek-ai/schemastery'),
    })
  }

  // The desktop app packages the same tree inside its resources directory.
  const resources = process.resourcesPath
  if (typeof resources === 'string' && resources.length > 0) {
    attempts.push({
      label: 'desktop app resources',
      load: () =>
        requireFrom(join(resources, 'app.asar', 'dsh', 'package.json'))(
          '@deepseek-ai/schemastery',
        ),
    })
    attempts.push({
      label: 'desktop app asar package',
      load: () =>
        require(
          join(resources, 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'schemastery'),
        ),
    })
  }

  const failures = []
  for (const { label, load } of attempts) {
    try {
      const loaded = load()
      const schema = loaded?.default ?? loaded
      if (schema !== undefined) return schema
      failures.push(`${label}: module has no default export`)
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(
    'OI assistant: cannot locate @deepseek-ai/schemastery. Install this plugin into a DSH ' +
      'profile (the desktop app or `dsh web`/CLI) so it can reuse the Host copy.\n' +
      failures.map((failure) => `- ${failure}`).join('\n'),
  )
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
