# FeedSieve → X Muted Words Manager / X 批量隐藏词管理器

**Tampermonkey（油猴）用户脚本 / Tampermonkey userscripts** for importing and managing X (Twitter) muted words. 这不是 X 官方功能，也不是 Chrome 扩展。

## 选择版本 / Choose an edition

- **中文词库版 / Chinese-focused:** [`feedsieve-x-muted-zh.user.js`](./feedsieve-x-muted-zh.user.js) — 面向中文用户与中文社区，使用 v4.1 当前确认的单文件词库。根据用户要求，直接发布当前词集，不再因之前发现的缺词差异阻塞更新。
- **English pack:** [`feedsieve-x-muted-en.user.js`](./feedsieve-x-muted-en.user.js) — for Western / English-speaking users. It focuses on adult-bait/promo spam, profile/DM funnels, hookup/escort bait, creator-platform promos, and crypto giveaway/airdrop scams. Broad English terms are included but disabled by default.

> 建议只启用其中一个脚本。 / Enable only one edition at a time.

## 功能 / Features

两个版本功能一致：

- 关键词直接内置在 `.user.js`，运行时**不自动获取/更新词库**。
- 每批最多添加 **15** 条。
- 每批开始前扫描 X 已有隐藏词并去重。
- 自动继续间隔可以自行输入，**单位为秒**。
- 默认间隔 **300 秒**，最低 **60 秒**。
- 支持 **暂停 / 继续**；进度保存在 Tampermonkey 本地。
- 连续失败 2 次会自动暂停，不尝试绕过 X 限流。
- 关键词管理：搜索、启用/停用内置词、添加/删除自定义词、导出当前启用词。

Both editions use the same workflow: scan existing muted words → add up to 15 → wait the user-defined number of seconds → scan again → continue until complete or paused.

## 安装 / Installation

1. 安装 Tampermonkey。
2. 打开需要的 `.user.js` 文件。
3. 点击 GitHub **Raw**。
4. 在 Tampermonkey 安装页面点击安装。
5. 登录 X，打开 `Settings → Privacy and safety → Mute and block → Muted words`。

English: install Tampermonkey, open the desired script above, click **Raw**, install it, then open X's **Muted words** settings page.

## 后台运行 / Background use

X 的设置标签页可以放到后台，不需要一直盯着，但标签页必须保持打开。浏览器的“睡眠标签页/内存节省”可能暂停计时器；电脑睡眠或休眠时也不会继续执行。

The X settings tab may remain in the background, but it must stay open. Browser tab sleeping/memory-saver features can suspend timers.

## 限流 / Rate limits

脚本不会绕过 X 的限制。若连续保存失败会自动暂停。如果连手动添加也失败，请等 X 恢复后再继续。

The script does not bypass X rate limits or anti-abuse protections. If manual additions fail too, pause and resume later.

## Privacy / 隐私

关键词、自定义设置、成功/失败记录和自动继续间隔均保存在 Tampermonkey 本地。v4.1 不需要运行时访问 FeedSieve 来下载词库。

Keyword settings and progress are stored locally by Tampermonkey. v4.1 does not fetch keyword-pack updates from FeedSieve at runtime.

## Disclaimer / 免责声明

Independent project; not affiliated with or endorsed by X Corp. or FeedSieve. 本项目为独立工具，与 X Corp. 或 FeedSieve 无官方合作或隶属关系。

## License

MIT
