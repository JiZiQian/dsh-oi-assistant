import assert from 'node:assert/strict'

let clientModule
globalThis.window = {
  __ModuleLoader__: {
    load({ id, factory }) {
      const require = (name) => {
        if (name === 'react') {
          return {
            createElement(type, props, ...children) {
              return { type, props: props ?? {}, children }
            },
            useState(initial) {
              return [typeof initial === 'function' ? initial() : initial, () => {}]
            },
          }
        }
        if (name === '@deepseek-ai/dsh-client-ui-primitives') {
          return {
            SettingsForm: function SettingsForm() {},
            settingsTextField: (field) => ({ field }),
            SettingsFormModel: class SettingsFormModel {
              constructor(scope, fields) {
                this.scope = scope
                this.fields = fields
              }
              bind(projection) {
                this.projection = projection
                return {
                  getSnapshot: projection,
                  subscribe: () => () => {},
                }
              }
              shell() {
                return {
                  available: true,
                  writable: true,
                  dirty: false,
                  invalid: false,
                  saving: false,
                  failed: false,
                }
              }
              field(name) {
                return { text: 'PROMPT', overridden: true, invalid: false, field: name }
              }
              actions() {
                return {
                  edit() {},
                  resetField() {},
                  save() {},
                  discard() {},
                }
              }
              dispose() {}
            },
          }
        }
        throw new Error(`unexpected require: ${name}`)
      }
      clientModule = factory(require)
      assert.equal(id, 'dsh-oi-assistant')
    },
  },
}

await import('../client.js')
assert.ok(clientModule)
assert.deepEqual(clientModule.inject, ['slots', 'locale', 'remote', 'remote.commands', 'configForms'])

const slots = []
let chipSlot
let settingsSlot
let formScope
let whileServedNamespaces

const ctx = {
  locale: {
    bind: (ns) => (key) => `${ns}.${key}`,
    register() {},
  },
  effect(fn) {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  slots: {
    inject(name, register) {
      register()
      return () => {}
    },
    register(options, component) {
      slots.push({ options, component })
      if (options.name === 'conversation.input.left') chipSlot = { options, component }
      if (options.name === 'settings.section') settingsSlot = { options, component }
      return () => {}
    },
  },
  configForms: {
    get(ns) {
      formScope = ns
      return { ns }
    },
    whileServed(namespaces, register) {
      whileServedNamespaces = namespaces
      register()
      return () => {}
    },
  },
  remote: {
    commands: {
      async execute(sessionId, line, attachments) {
        return { ok: true, value: { sessionId, line, attachments } }
      },
    },
  },
}

clientModule.apply(ctx)
assert.equal(formScope, 'oi-assistant')
assert.deepEqual(whileServedNamespaces, ['oi-assistant'])
assert.equal(chipSlot.options.id, 'oi-assistant')
assert.equal(chipSlot.options.locale, 'dsh-oi-assistant')
assert.equal(settingsSlot.options.id, 'oi-assistant')
assert.equal(settingsSlot.options.order, 20)
assert.equal(settingsSlot.options.label(), 'dsh-oi-assistant.title')

const chipProps = {
  t: (key) => key,
  useProjection: () => undefined,
  toggleMode: chipSlot.options.inject('session-1').toggleMode,
}
const chipTree = chipSlot.component(chipProps)
assert.equal(chipTree.type, 'span')
const chipButton = chipTree.children[0]
assert.equal(chipButton.props.role, 'switch')
assert.equal(chipButton.props['aria-checked'], false)
assert.equal(await chipProps.toggleMode(), null)

const settingsProps = {
  t: (key) => key,
  useOiPrompt: () => ({
    available: true,
    writable: true,
    dirty: false,
    invalid: false,
    saving: false,
    failed: false,
    prompt: { text: 'PROMPT', overridden: true, invalid: false },
  }),
  save() {},
  discard() {},
  edit() {},
  resetField() {},
}
const settingsTree = settingsSlot.component(settingsProps)
assert.equal(settingsTree.type, 'div')
console.log('client smoke ok; slots', slots.map((slot) => slot.options.name).join(', '))
