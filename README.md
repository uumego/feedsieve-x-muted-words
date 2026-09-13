# X Muted Words Manager / X 批量隐藏词管理器

Tampermonkey（油猴）用户脚本，用于批量导入和管理 X（Twitter）的隐藏词。不是 X 官方功能，也不是浏览器扩展。

## 版本 / Editions

- 中文词库版：`x-muted-words-zh.user.js` — 当前主版本 **v4.1.5**，内置中文词库、已添加去重、15 条分批、暂停/继续、自定义间隔和关键词管理。
- English pack: `x-muted-words-en.user.js` — English-focused keyword pack with the same batch workflow.

建议只启用其中一个版本。

## 功能 / Features

- 关键词直接内置在用户脚本中，运行时不自动下载词库。
- 每批最多添加 15 条。
- 每批开始前扫描 X 已有隐藏词并去重。
- 自动继续间隔可自行设置，单位为秒。
- 默认间隔 300 秒，最低 60 秒。
- 支持暂停 / 继续，进度保存在 Tampermonkey 本地。
- 连续失败 2 次会自动暂停，不尝试绕过 X 限流。
- 支持关键词搜索、启用/停用内置词、添加/删除自定义词、导出启用词。
- 中文 v4.1.5 使用横向控制栏面板，可快速开始/暂停，并通过 Filter Settings 展开详细设置。

## 安装 / Installation

1. 安装 Tampermonkey。
2. 打开需要的 `.user.js` 文件。
3. 点击 GitHub **Raw**。
4. 在 Tampermonkey 安装页面点击安装。
5. 登录 X，打开 `Settings → Privacy and safety → Mute and block → Muted words`。

## 后台运行 / Background use

X 的设置标签页可以放到后台，但标签页必须保持打开。浏览器的睡眠标签页、内存节省、电脑睡眠或休眠都可能暂停计时器。

## 限流 / Rate limits

脚本不会绕过 X 的限制。如果连续保存失败会自动暂停。如果手动添加也失败，请等待 X 恢复后再继续。

## 隐私 / Privacy

关键词设置、自定义词、成功/失败记录和自动继续间隔均保存在 Tampermonkey 本地。

## Disclaimer / 免责声明

Independent project; not affiliated with or endorsed by X Corp. 本项目为独立工具，与 X Corp. 无官方合作或隶属关系。

## License

MIT
