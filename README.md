# dsh-oi-assistant

DSH 桌面端 OI 助手模式插件。开启后，Agent 会以信息学竞赛选手/教练的身份工作，并优先使用 Chrome MCP 查题、核对链接和寻找相似题。

设计重点是**并列能力，而不是固定流程**：确认做法、提供 hint、寻找相似题目、简述题意、调试、复杂度与实现等能力按需调用；用户只问一项时就只做那一项。

## 功能

- 输入框左侧的 **OI 助手** chip：按会话开启/关闭，状态持久化到会话日志。
- `/oi` 命令：`/oi`、`/oi on`、`/oi off`、`/oi toggle`、`/oi status`。
- 并列能力提示词：确认做法、hint、相似题、题意简述、调试验证、复杂度与实现、其他 OI 任务。
- 简述题意的硬性约束：不得添加题面没有的信息，不得省略数据范围、输入输出、子任务、特殊定义、多测、取模、时限/空间等有效信息；不确定时标注“题面未说明”。
- Chrome MCP 优先：题面、题解、提交记录、OJ 页面和相似题核对优先使用 `mcp__chrome-devtools__` 工具；不可用时回退到 `web_search` / `web_fetch`。
- **Settings → “OI 助手提示词”**：在设置中直接编辑系统提示词，支持保存、关闭设置页时放弃未保存草稿、恢复默认；修改全局生效。
- 比赛诚信：进行中的比赛只给思路和提示，不给可直接提交的完整代码。

## 安装

桌面端 `desktop` profile 由 Electron 独占管理，不能用 CLI 直接改配置。先在本地准备仓库：

```bash
git clone https://github.com/JiZiQian/dsh-oi-assistant.git
cd dsh-oi-assistant
```

然后在应用内安装：

1. 侧边栏 **Plugins**；
2. **Add plugin** → **Install a third-party plugin**；
3. 选择本地目录，填入本仓库的**绝对路径**（例如克隆后的 `~/dsh_plugin/dsh-oi-assistant`；可在仓库根目录执行 `pwd` 获取）；
4. 确认预览中的标题/描述/图标，等待安装和启用完成。

本插件不声明 npm 运行时依赖。Host 侧的 `@deepseek-ai/schemastery` 从当前 DSH 桌面安装读取同版本，因此安装不需要联网；如果宿主和 app 内副本都找不到，插件会以明确错误加载失败。

安装后如果 DSH 要求重启应用，请按应用提示操作。

## 使用

### 开关

新会话默认关闭。点击输入框工具条里的 **OI 助手** chip 开启；再次点击关闭。chip 的开关状态来自会话 projection，因此刷新、恢复会话、fork 后仍然保持。

也可以直接输入：

```text
/oi            # 开启
/oi on         # 开启
/oi off        # 关闭
/oi toggle     # 切换
/oi status     # 查看当前状态
```

非法参数返回用法，不会改变状态。`/oi` 只控制模式，不会把命令文本发给模型。

### 编辑提示词

打开侧边栏 **Settings（设置）**，在左侧选择 **OI 助手提示词**：

- 页面中的 textarea 是当前系统提示词；
- 修改后点击 **保存**；关闭设置页（或按 Esc）会丢弃未保存的草稿；
- 点击 **恢复默认** 会清除覆盖值，回到 `prompt.js` 中的默认文本；
- 留空并保存也会恢复默认；
- 提示词是全局配置，对所有会话生效；保存后从下一次模型请求开始使用。

如果设置页没有出现，说明 Host 的 `settings` 服务或插件的 `prompt` 配置命名空间没有被提供。先确认插件已启用；仍不可用时可修改 `prompt.js` 中的默认文本并重新加载插件。

### 建议的提问方式

```text
简述一下这道题的题意，不要给做法。
给我一个 hint，不要完整题解。
帮我确认这个做法对不对：……
找两道和这道题相似的题，说明相似点和差异。
```

这些请求是并列的，不需要先说“请先确认做法”。插件提示词也明确禁止机械地依次执行全部能力。

## 工作原理

- **Host**：注册 session projection `oi`，折叠 `/oi` 的 `command/run` / `command/done`；注册 `oi:policy` 系统提示词 section；用 `/oi` 命令提交状态；导出 volatile `prompt` 配置；通过 `settings.configure({ auto: false })` 声明自定义设置页。
- **Client**：注册 `conversation.input.left` chip 和 `settings.section` 的“OI 助手提示词”页面；设置页使用 DSH 的 `SettingsFormModel` / `SettingsForm`，保存走 settings/config-editor。
- 提示词只在模式开启时注入；关闭时 section 返回空串，不占 token。
- 模式按会话独立，新会话默认关闭，子 Agent 默认不继承。

## 已知限制

- 提示词是全局配置，不是每个会话一份；OI 开关是每会话的。
- 不自动安装或复制 `chrome-devtools` MCP，也不代替用户提交代码或参加比赛。
- 不做题目数据库、评测机、自动提交或题解抓取流水线。
- 设置页依赖 DSH 桌面端的 Settings/plugin 管理能力；纯 CLI 或没有 Settings 服务的部署只能修改 `prompt.js` 默认值。
- 默认提示词为中文；英文 UI 文案已提供，但提示词本身可由用户在设置中替换。

## 开发与检查

```bash
node --check index.js
node --check projection.js
node --check prompt.js
node --check client.js
node --test test/oi-mode.test.mjs
node test/_client-smoke.mjs
```

`test/oi-mode.test.mjs` 只导入 `projection.js` / `prompt.js` 并做 manifest/源码静态检查，不需要安装 Host 依赖；`test/_client-smoke.mjs` 用最小桩检查 client 模块的注册结构，也不会访问宿主。

## License

MIT
