window.__ModuleLoader__.load({
	id: 'dsh-oi-assistant',
	factory(require) {
		const module = { exports: {} }
		const exports = module.exports
		const React = require('react')
		const {
			SettingsForm,
			SettingsFormModel,
			settingsTextField,
		} = require('@deepseek-ai/dsh-client-ui-primitives')

		const NS = 'dsh-oi-assistant'
		const OI_NS = 'oi-assistant'
		const h = React.createElement

		/** @type {Record<string, string>} */
		const zh = {
			title: 'OI 助手提示词',
			intro: '编辑 OI 助手模式的系统提示词。修改对所有会话生效。',
			label: '系统提示词',
			hint: '保存后下一次模型请求开始使用；恢复默认会回到 prompt.js 中的默认文本。留空并保存也会恢复默认。',
			overridden: '已覆盖',
			reset: '恢复默认',
			invalid: '提示词无效，请检查后重试。',
			unavailable: 'OI 助手当前未加载，暂时无法配置。',
			readOnly: '当前部署的设置为只读。',
			save: '保存',
			saving: '保存中…',
			saveFailed: '保存失败，已保留你的修改，请重试。',
			chipOff: 'OI 助手',
			chipOn: 'OI 助手',
			ariaOff: '开启 OI 助手模式',
			ariaOn: '关闭 OI 助手模式',
			titleOff: '开启 OI 助手模式；提示词在 设置 → OI 助手提示词 中编辑',
			titleOn: '关闭 OI 助手模式；提示词在 设置 → OI 助手提示词 中编辑',
		}

		/** @type {Record<string, string>} */
		const en = {
			title: 'OI assistant prompt',
			intro: 'Edit the system prompt used in OI assistant mode. Changes apply to every session.',
			label: 'System prompt',
			hint: 'The next model request uses the saved prompt. Restore default returns to the text in prompt.js; an empty save also restores the default.',
			overridden: 'Overridden',
			reset: 'Restore default',
			invalid: 'The prompt is invalid; check it and try again.',
			unavailable: 'The OI assistant plugin is not loaded, so it cannot be configured right now.',
			readOnly: 'This deployment stores settings read-only.',
			save: 'Save',
			saving: 'Saving…',
			saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
			chipOff: 'OI assistant',
			chipOn: 'OI assistant',
			ariaOff: 'Turn on OI assistant mode',
			ariaOn: 'Turn off OI assistant mode',
			titleOff: 'Turn on OI assistant mode; edit the prompt in Settings → OI assistant prompt',
			titleOn: 'Turn off OI assistant mode; edit the prompt in Settings → OI assistant prompt',
		}

		const css = `
.dsh-oi-chip-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}
.dsh-oi-chip {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  cursor: pointer;
}
.dsh-oi-chip:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-oi-chip:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.dsh-oi-chip:disabled {
  opacity: 0.55;
  cursor: default;
}
.dsh-oi-chip-on {
  border-color: transparent;
  background: var(--dsw-alias-state-business-tertiary);
  color: var(--dsw-alias-state-business-primary);
}
.dsh-oi-chip-on:hover:not(:disabled) {
  background: var(--dsw-alias-state-business-tertiary);
  filter: brightness(0.98);
}
.dsh-oi-dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
}
.dsh-oi-chip-on .dsh-oi-dot {
  background: var(--dsw-alias-state-business-primary);
}
.dsh-oi-chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsh-oi-error {
  max-width: 150px;
  overflow: hidden;
  color: var(--dsw-alias-state-error-primary);
  font-size: 11px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-oi-settings {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 760px;
  color: var(--dsw-alias-label-primary);
}
.dsh-oi-settings-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
}
.dsh-oi-settings-intro {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 1.6;
}
.dsh-oi-prompt-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dsh-oi-prompt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.dsh-oi-prompt-label {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}
.dsh-oi-prompt-options {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.dsh-oi-prompt-badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
}
.dsh-oi-prompt-reset {
  padding: 0;
  border: 0;
  background: none;
  color: var(--dsw-alias-link);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}
.dsh-oi-prompt-reset:hover:not(:disabled) {
  text-decoration: underline;
}
.dsh-oi-prompt-reset:disabled {
  opacity: 0.55;
  cursor: default;
}
.dsh-oi-prompt-textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 360px;
  max-height: 60vh;
  padding: 12px;
  resize: vertical;
  border: 1px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  outline: none;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 13px;
  line-height: 1.6;
  tab-size: 2;
}
.dsh-oi-prompt-textarea:focus {
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 var(--dsw-focus-ring-width) var(--dsw-focus-ring-color, transparent);
}
.dsh-oi-prompt-textarea:disabled {
  opacity: 0.65;
  cursor: default;
}
.dsh-oi-prompt-hint {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.6;
}
.dsh-oi-prompt-error {
  margin: 0;
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 1.6;
}
`

		const tagId = 'dsh-oi-assistant/style.css'
		if (
			typeof document !== 'undefined' &&
			document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null
		) {
			const tag = document.createElement('style')
			tag.dataset.plugin = 'dsh-oi-assistant'
			tag.dataset.pluginCss = tagId
			tag.textContent = css
			document.head.appendChild(tag)
		}

		/** @param {(key: string) => string} t */
		function formLabels(t) {
			return {
				unavailable: t('unavailable'),
				readOnly: t('readOnly'),
				saveFailed: t('saveFailed'),
				save: t('save'),
				saving: t('saving'),
			}
		}

		/**
		 * Composer switch. The projection is undefined until the first `/oi`
		 * lifecycle event, and that must render as off rather than a dead cell.
		 */
		function OiModeChip(props) {
			const { t } = props
			const projection = props.useProjection('oi')
			const active = projection?.active === true
			const [pending, setPending] = React.useState(false)
			const [error, setError] = React.useState(null)

			const onToggle = async () => {
				if (pending) return
				setPending(true)
				setError(null)
				try {
					const message = await props.toggleMode()
					if (typeof message === 'string' && message.length > 0) setError(message)
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason))
				} finally {
					setPending(false)
				}
			}

			return h(
				'span',
				{ className: 'dsh-oi-chip-wrap' },
				h(
					'button',
					{
						type: 'button',
						role: 'switch',
						'aria-checked': active,
						'aria-label': active ? t('ariaOn') : t('ariaOff'),
						title: active ? t('titleOn') : t('titleOff'),
						className: active ? 'dsh-oi-chip dsh-oi-chip-on' : 'dsh-oi-chip',
						disabled: pending,
						onClick: onToggle,
					},
					h('span', { className: 'dsh-oi-dot', 'aria-hidden': true }),
					h(
						'span',
						{ className: 'dsh-oi-chip-label' },
						active ? t('chipOn') : t('chipOff'),
					),
				),
				error === null
					? null
					: h('span', { className: 'dsh-oi-error', role: 'status', title: error }, error),
			)
		}

		/**
		 * The Settings → “OI 助手提示词” page. It edits the plugin's global
		 * volatile prompt field through the shared staged settings form.
		 */
		function OiPromptSection(props) {
			const { t } = props
			const state = props.useOiPrompt((snapshot) => snapshot) ?? {}
			const prompt = state.prompt ?? { text: '', overridden: false, invalid: false }
			const disabled = state.writable !== true || state.saving === true
			const text = typeof prompt.text === 'string' ? prompt.text : ''

			return h(
				'div',
				{ className: 'dsh-oi-settings' },
				h('h2', { className: 'dsh-oi-settings-title' }, t('title')),
				h('p', { className: 'dsh-oi-settings-intro' }, t('intro')),
				h(
					SettingsForm,
					{
						labels: formLabels(t),
						state,
						onSave: props.save,
						onDiscard: props.discard,
					},
					h(
						'div',
						{ className: 'dsh-oi-prompt-field' },
						h(
							'div',
							{ className: 'dsh-oi-prompt-head' },
							h(
								'label',
								{ className: 'dsh-oi-prompt-label', htmlFor: 'dsh-oi-prompt' },
								t('label'),
							),
							prompt.overridden === true
								? h(
									'div',
									{ className: 'dsh-oi-prompt-options' },
									h('span', { className: 'dsh-oi-prompt-badge' }, t('overridden')),
									h(
										'button',
										{
											type: 'button',
											className: 'dsh-oi-prompt-reset',
											disabled,
											onClick: () => props.resetField('prompt'),
										},
										t('reset'),
									),
								)
								: null,
						),
						h('textarea', {
							id: 'dsh-oi-prompt',
							className: 'dsh-oi-prompt-textarea',
							value: text,
							rows: 18,
							spellCheck: false,
							disabled,
							onChange: (event) => props.edit('prompt', event.target.value),
							'aria-describedby': 'dsh-oi-prompt-hint',
							'aria-invalid': prompt.invalid === true ? 'true' : undefined,
						}),
						h(
							'p',
							{ id: 'dsh-oi-prompt-hint', className: 'dsh-oi-prompt-hint' },
							t('hint'),
						),
						prompt.invalid === true
							? h(
								'p',
								{ role: 'status', className: 'dsh-oi-prompt-error' },
								t('invalid'),
							)
							: null,
					),
				),
			)
		}

		// Preserve whitespace and newlines in the prompt; an all-whitespace draft
		// is a clear (restore default), not an invalid set.
		const promptField = {
			...settingsTextField('prompt'),
			parse(text) {
				const value = typeof text === 'string' ? text : ''
				return value.trim().length === 0
					? { kind: 'clear' }
					: { kind: 'set', value }
			},
		}

		/** Client services this plugin uses. */
		const inject = ['slots', 'locale', 'remote', 'remote.commands', 'configForms']

		/**
		 * @param {any} ctx Client plugin context.
		 */
		function apply(ctx) {
			const t = ctx.locale.bind(NS)
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-oi-assistant: dictionaries')

			ctx.slots.inject('conversation.input.left', () =>
				ctx.slots.register(
					{
						name: 'conversation.input.left',
						id: 'oi-assistant',
						order: 10,
						locale: NS,
						inject: (sessionId) => ({
							toggleMode: async () => {
								const result = await ctx.remote.commands.execute(sessionId, '/oi toggle', [])
								if (!result.ok) return result.error.code + ': ' + result.error.message
								if (result.value === undefined) return 'unknown command: /oi toggle'
								return null
							},
						}),
					},
					OiModeChip,
				),
			)

			const form = new SettingsFormModel(ctx.configForms.get(OI_NS), [promptField])
			const store = form.bind(() => ({
				...form.shell(),
				prompt: form.field('prompt'),
			}))

			ctx.effect(() => () => form.dispose(), 'dsh-oi-assistant: prompt form')

			ctx.effect(
				() =>
					ctx.configForms.whileServed([OI_NS], () =>
						ctx.slots.inject('settings.section', () =>
							ctx.slots.register(
								{
									name: 'settings.section',
									id: 'oi-assistant',
									order: 20,
									label: () => t('title'),
									locale: NS,
									inject: () => ({
										hooks: { oiPrompt: store },
										...form.actions(),
									}),
								},
								OiPromptSection,
							),
						),
					),
				'dsh-oi-assistant: settings section',
			)
		}

		exports.NS = NS
		exports.OI_NS = OI_NS
		exports.apply = apply
		exports.inject = inject
		return module.exports
	},
})
