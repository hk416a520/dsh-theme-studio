# DSH 外观工作室（Theme Studio）

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 界面用的外观面板：左侧栏一个调色盘入口，用 RGB 值改工作台配色、切换明暗主题，并可从本地文件设置背景图。

所有数据都留在本机：配色与背景图存在浏览器的 `localStorage`，插件不发起任何网络请求。

[English](./README.md) | 中文

## 功能

- **左侧栏入口** —— 调色盘图标打开整页面板，和内置的「插件」「自动化任务」并列。
- **RGB 调色** —— 13 个主题令牌，分为背景 / 文字 / 强调 / 边框 / 状态五组。每行直接输入 `R G B`（0–255）与 `A%` 不透明度，每行可单独重置。
- **两套配色** —— 亮色与暗色分开编辑，避免切换方案后出现“深底深字”。
- **背景图** —— 从本机选图，浏览器内重编码（长边 ≤ 1920px）后本地保存；支持填充 / 适应 / 平铺、暗化滑块与预览。
- **主题选择** —— 方案区除了内置的亮色 / 暗色 / 跟随系统，还会列出运行中客户端注册的其它主题，装了第三方主题也能在这里切换。第三方主题的卡名取自 `locale/*.json` 里的 `theme.<id>` 键，没有该键时直接显示 id。
- **即时且可逆** —— 改动立即生效、刷新后保留，卸载插件即完全还原。

## 环境要求

- DSH Web 界面 `>= 0.2.1-rc.5`：面板依赖 `ctx.theme.overrideTokens`、`main` / `sidebar.panellist` 插槽以及 `--dsw-alias-*` 令牌层。

## 安装

DSH 通过插件管理器安装 bundle：把包装进 profile 并选中它的 patch 层。在 DSH 会话里对助手说：

> 安装这个插件：<本地路径 / Git 地址 / 压缩包>。

或者调用 `plugin_manager` 工具的 `install_bundle`，target 传上面的地址。本地目录、Git 地址、tarball 都可用。

注意：`dsh plugin --profile <名称> add <spec>` 只记录依赖，不会选中 bundle 层，所以请优先用插件管理器。

## 使用

1. 点击左侧栏的调色盘图标。
2. **主题模式** —— 选亮色 / 暗色 / 跟随系统，或某个额外主题卡。
3. **颜色** —— 选择亮色或暗色配色页签，输入 RGB，或点色块取色。`A` 是不透明度（百分比）：调低它能让背景图从该表面透出来。
4. **背景图** —— 选文件，然后设置适配方式、暗化与预览；移除即恢复纯色表面。
5. 右上角 **全部重置** 把所有令牌与背景图还原为主题自带的值。

## 实现说明

- 面板向 `main` 插槽注册一张页面、向 `sidebar.panellist` 注册一个图标，两者都是 root 作用域，切换面板不丢失。
- 颜色通过 `ctx.theme.overrideTokens(source, { '<令牌>': { light, dark } })` 施加：不写主题注册表、不碰会话数据，插件卸载时该图层随之移除。
- 叠加层**优先于**当前主题。这正是本面板能配合任意主题的原因，也意味着它会盖过第三方主题自己的配色 —— 当启用的是非内置主题时，「颜色」区会出现提示，并指向「全部重置」。
- 背景图画在文档根元素上，仅为了让页面底色透出；自己绘制表面的面板仍不透明，这就是每个表面都有不透明度通道的原因。
- 全部样式只用文档化的 `--dsw-alias-*` / `--dsw-specific-*` 令牌；某个令牌若被重命名，该元素退回默认色，而不会让面板崩掉。

## 存储与隐私

| 键 | 内容 |
| --- | --- |
| `dsh-theme-studio:v1` | 两套配色、背景图 data URL、适配方式与暗化值 |

- 无网络请求、无遥测、不读取会话数据。
- 背景图先在浏览器内解码、缩放、重编码再写入；data URL 上限约 2.6MB，超限会给出可见提示而不是静默丢弃。
- 清除该站点的浏览器数据即重置插件。

## 开发

无需构建：`client.js` 是普通浏览器 JavaScript，以 `window.__ModuleLoader__` 工厂形式加载；React 取自页面模块表，不引入任何 Harness Client 包。

```
package.json        清单：dsh.bundle.patch + dsh.client
cordis.patch.yml    插入 `theme-studio` 一行
index.js            Host 半边（不注册任何东西）
client.js           面板、调色、背景图、持久化
locale/en.json      插件管理里的标题与说明
locale/zh.json      同上，中文
icon.svg            插件图标（导出为 ./icon）
scripts/check.mjs   清单 + 语法 + 语言文件 + 图标检查
```

```sh
npm run check
```

## 发布清单

1. 填写 `package.json` 里的 `author`、`homepage`、`repository`、`bugs`。
2. 改包名要同步三处，缺一不可：
   - `package.json` → `name`
   - `cordis.patch.yml` → 插入行的 `name`
   - `client.js` → 模块 `id` 与 `SOURCE` 前缀
3. 升 `version` 并在 `CHANGELOG.md` 记录。
4. `npm publish`，或只发布 GitHub —— 两种方式都能通过 Git 地址安装。

## 许可

[MIT](./LICENSE)
