import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { OI_SYSTEM_PROMPT } from '../prompt.js'
import { OI_COMMAND, oiProjection, targetOf } from '../projection.js'

const url = (path) => new URL(`../${path}`, import.meta.url)
const read = (path) => readFileSync(url(path), 'utf8')
const readJson = (path) => JSON.parse(read(path))

function run(commandId, args) {
  return {
    type: 'command/run',
    data: { name: OI_COMMAND, args, commandId },
  }
}

function done(commandId, kind = 'success') {
  return {
    type: 'command/done',
    data: { commandId, kind },
  }
}

function fold(events) {
  return events.reduce((state, event) => oiProjection.apply(state, event), oiProjection.init())
}

test('projection starts closed', () => {
  assert.deepEqual(oiProjection.init(), { active: false, running: {} })
  assert.deepEqual(oiProjection.wire.view(oiProjection.init()), { active: false })
})

test('toggle starts a run and only commits on success', () => {
  const started = fold([run('cmd-1', 'toggle')])
  assert.equal(started.active, false)
  assert.deepEqual(started.running, { 'cmd-1': true })

  const committed = fold([run('cmd-1', 'toggle'), done('cmd-1', 'success')])
  assert.equal(committed.active, true)
  assert.deepEqual(committed.running, {})
})

test('off and on are explicit', () => {
  assert.equal(fold([run('cmd-1', 'on'), done('cmd-1')]).active, true)
  assert.equal(
    fold([
      run('cmd-1', 'on'),
      done('cmd-1'),
      run('cmd-2', 'off'),
      done('cmd-2'),
    ]).active,
    false,
  )
})

test('status and invalid arguments never change state', () => {
  const initial = oiProjection.init()
  for (const args of ['status', 'wat', 'on extra']) {
    const afterRun = oiProjection.apply(initial, run(`cmd-${args}`, args))
    assert.equal(afterRun, initial)
    assert.equal(oiProjection.apply(afterRun, done(`cmd-${args}`)), initial)
  }
})

test('an errored or cancelled command removes the pending target without committing', () => {
  for (const kind of ['error', 'cancelled']) {
    const initial = oiProjection.init()
    const started = oiProjection.apply(initial, run('cmd-1', 'toggle'))
    assert.deepEqual(started.running, { 'cmd-1': true })
    const settled = oiProjection.apply(started, done('cmd-1', kind))
    assert.equal(settled.active, false)
    assert.deepEqual(settled.running, {})
  }
})

test('unrelated commands and unknown done events are ignored', () => {
  const initial = oiProjection.init()
  assert.equal(
    oiProjection.apply(initial, {
      type: 'command/run',
      data: { name: 'plan', args: '', commandId: 'p1' },
    }),
    initial,
  )
  assert.equal(oiProjection.apply(initial, done('missing')), initial)
  assert.equal(oiProjection.apply(initial, { type: 'message/user' }), initial)
})

test('targetOf is the single argument parser used by the command', () => {
  assert.equal(targetOf('', false), true)
  assert.equal(targetOf(' on ', false), true)
  assert.equal(targetOf('off', true), false)
  assert.equal(targetOf('toggle', false), true)
  assert.equal(targetOf('toggle', true), false)
  assert.equal(targetOf('status', false), undefined)
  assert.equal(targetOf('nope', false), undefined)
  assert.equal(targetOf(undefined, false), true)
})

test('state and wire schemas reject malformed values', () => {
  assert.deepEqual(
    oiProjection.stateSchema.parse({ active: true, running: { c: false } }),
    { active: true, running: { c: false } },
  )
  assert.throws(() => oiProjection.stateSchema.parse({ active: 'yes', running: {} }))
  assert.throws(() => oiProjection.stateSchema.parse({ active: false, running: [] }))
  assert.throws(() => oiProjection.stateSchema.parse({ active: false, running: { c: 'yes' } }))
  assert.deepEqual(oiProjection.wire.viewSchema.parse({ active: false }), { active: false })
  assert.throws(() => oiProjection.wire.viewSchema.parse({ active: 1 }))
})

test('prompt models capabilities as parallel, on-demand tools', () => {
  assert.match(OI_SYSTEM_PROMPT, /能力清单：并列能力，按需调用/)
  assert.match(OI_SYSTEM_PROMPT, /不要按固定顺序把全部能力走一遍/)
  assert.match(OI_SYSTEM_PROMPT, /用户只问一件事时不要自动追加/)
  assert.match(OI_SYSTEM_PROMPT, /确认做法/)
  assert.match(OI_SYSTEM_PROMPT, /提供 hint/)
  assert.match(OI_SYSTEM_PROMPT, /寻找相似题目/)
  assert.match(OI_SYSTEM_PROMPT, /简述题意/)
  assert.match(OI_SYSTEM_PROMPT, /回复尽量简短/)
  assert.match(OI_SYSTEM_PROMPT, /回复 \*\*人话\*\*/)
  assert.match(OI_SYSTEM_PROMPT, /指代明确/)
  assert.doesNotMatch(OI_SYSTEM_PROMPT, /先确认做法/)
})

test('prompt makes statement-summary fidelity a hard requirement', () => {
  assert.match(OI_SYSTEM_PROMPT, /简述题意的硬性要求/)
  assert.match(OI_SYSTEM_PROMPT, /不得添加/)
  assert.match(OI_SYSTEM_PROMPT, /不得缺失/)
  assert.match(OI_SYSTEM_PROMPT, /数据范围/)
  assert.match(OI_SYSTEM_PROMPT, /输入\/输出格式/)
  assert.match(OI_SYSTEM_PROMPT, /子任务/)
  assert.match(OI_SYSTEM_PROMPT, /样例解释/)
  assert.match(OI_SYSTEM_PROMPT, /题面未说明/)
  assert.match(OI_SYSTEM_PROMPT, /不要混入做法/)
})

test('prompt points at Chrome MCP first and handles its absence', () => {
  assert.match(OI_SYSTEM_PROMPT, /chrome-devtools/)
  assert.match(OI_SYSTEM_PROMPT, /mcp__chrome-devtools__/)
  assert.match(OI_SYSTEM_PROMPT, /new_page/)
  assert.match(OI_SYSTEM_PROMPT, /take_snapshot/)
  assert.match(OI_SYSTEM_PROMPT, /web_search \/ web_fetch/)
  assert.match(OI_SYSTEM_PROMPT, /不要假装已经打开网页/)
})

test('prompt includes contest integrity and the one-time confirmation', () => {
  assert.match(OI_SYSTEM_PROMPT, /正在进行的比赛/)
  assert.match(OI_SYSTEM_PROMPT, /只给思路和提示/)
  assert.match(OI_SYSTEM_PROMPT, /不提供可直接提交的完整代码/)
  assert.match(OI_SYSTEM_PROMPT, /第一次在该会话看到本提示词/)
})

test('bundle manifest declares the patch, client, files, and no npm dependencies', () => {
  const pkg = readJson('package.json')
  assert.equal(pkg.name, 'dsh-oi-assistant')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-settings'))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-conversation'))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-api-remotes'))
  assert.equal(pkg.dependencies, undefined)
  assert.deepEqual(pkg.peerDependencies, { '@deepseek-ai/schemastery': '*' })
  assert.equal(pkg.peerDependenciesMeta['@deepseek-ai/schemastery'].optional, true)
  assert.ok(pkg.files.includes('projection.js'))
  assert.ok(pkg.files.includes('prompt.js'))
  assert.ok(pkg.files.includes('client.js'))
})

test('patch inserts the oi-assistant row under the package', () => {
  const patch = read('cordis.patch.yml')
  assert.match(patch, /id: oi-assistant/)
  assert.match(patch, /name: dsh-oi-assistant/)
})

test('host source wires projection, prompt, command, and cross-runtime schema loading', () => {
  const source = read('index.js')
  assert.match(source, /sessionProjections\.register\(oiProjection\)/)
  assert.match(source, /name: 'oi:policy'/)
  assert.match(source, /interpolate: false/)
  assert.match(source, /config\?\.prompt/)
  assert.match(source, /settings\.configure\(\{ auto: false \}/)
  assert.match(source, /name: OI_COMMAND/)
  assert.match(source, /usage: \/oi|用法：\/oi/)
  assert.match(source, /prompt: z\.string\(\)\.min\(1\)\.default\(OI_SYSTEM_PROMPT\)\.volatile\(\)/)
  assert.match(source, /process\.argv\[1\]/)
  assert.match(source, /process\.resourcesPath/)
  assert.match(source, /app\.asar/)
  assert.doesNotMatch(source, /runs inside the DSH desktop app/)
})

test('client source mounts the Settings section and composer chip', () => {
  const source = read('client.js')
  assert.match(source, /name: 'conversation\.input\.left'/)
  assert.match(source, /id: 'oi-assistant'/)
  assert.match(source, /name: 'settings\.section'/)
  assert.match(source, /label: \(\) => t\('title'\)/)
  assert.match(source, /configForms\.whileServed\(\[OI_NS\]/)
  assert.match(source, /SettingsFormModel/)
  assert.match(source, /settingsTextField\('prompt'\)/)
  assert.match(source, /title: 'OI 助手提示词'/)
  assert.match(source, /\/oi toggle/)
  assert.match(source, /hooks: \{ oiPrompt: store \}/)
})

test('locale metadata, icon, and README exist', () => {
  for (const locale of ['zh', 'en']) {
    const meta = readJson(`locale/${locale}.json`)
    assert.equal(typeof meta.meta.title, 'string')
    assert.equal(typeof meta.meta.description, 'string')
    assert.ok(meta.meta.title.length > 0)
    assert.ok(meta.meta.description.length > 0)
  }
  assert.ok(existsSync(url('icon.svg')))
  assert.match(read('icon.svg'), /<svg/)
  assert.match(read('README.md'), /OI 助手提示词/)
  assert.match(read('README.md'), /Settings/)
  assert.match(read('README.md'), /桌面端与 Web 端/)
  assert.match(read('README.md'), /dsh plugin --profile web add/)
})
