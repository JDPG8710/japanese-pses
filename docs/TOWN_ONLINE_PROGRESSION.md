# Piko 小镇：晋级、多人和互动升级

## 玩法

小镇的 11 款游戏共用晋级进度。完成任意游戏后，小镇从第 1 关逐步升到第 20 关；完成第 20 关后进入无限挑战，继续累计轮数。所有游戏在入场时固定本轮难度，下一轮采用最新小镇等级。无限模式难度逐渐增加并保留儿童可玩的上限。

有效通关奖励小镇积分、等量金币及经验。失败、退出、零分和重复结算不发奖励。旧存档保留故事、金币、装修和游戏进度，不补发历史奖励。

新增「彩色泡泡」与「节奏小鼓」，支持触屏、鼠标和数字键，使用相同的暂停、退出、晋级与奖励规则。小镇共有 12 个场馆，包括装备店。

步行、汽车和地面飞机与 NPC 发生实体碰撞，会出现弹开、旋转和星星等无伤害效果。碰撞冷却不取消实体阻挡；自动寻路会绕过 NPC，空中飞行按高度检测。

## 多人

真实 WebSocket 房间由 Cloudflare Durable Objects 管理，每房最多 12 人。默认创建私人邀请房间，也可经家长入口加入公共房间。同步位置、朝向、角色、服装、交通工具、当前游戏和小镇等级；固定表情用于互动，没有自由聊天。

同等级玩家可邀请对方开始相同种子的游戏挑战，各自操作、各自结算积分。学习挑战使用统一公开规则，不传输个人年级设置。积分和学习存档仍保存在各自浏览器，这不是服务器权威的竞技排行榜。

服务端签发身份和短期连接票据，限制来源、消息长度、频率和人数。支持断线重连、同身份替换连接及离开清理。远端玩家具有真实 3D 模型和插值动画。

## 本地试玩及验证

```sh
npm ci
npm run build
node scripts/preview-town-online.mjs --built --port=4192
```

打开 `http://127.0.0.1:4192/town.html?locale=zh`。此预览使用实际 Worker 与本地 Durable Objects，不连接生产房间。两个独立浏览器可通过邀请链接进入同一房间。

```sh
npm test
npm run test:town:upgrade
npm run test:town:upgrade:browser
npm run test:town:browser
npm run test:town:release
```

2026-10-03 验证：主回归复跑 212/212；原小镇故事、购物、装修浏览器回归 18 组；多人后端 14 项；NPC 碰撞 1425 项；晋级 19→20→无限、重复奖励防护；桌面及手机新游戏通关、失败、暂停、重试与退出；两个独立浏览器的真实联机、移动、交通工具、表情、共同挑战、断线重连与退出；最终构建 320/390/820/1440 像素布局检查均通过。原有题库 QB12 检查在首次总回归中偶发六年级阅读焦点重复，复跑通过；本次未修改题库。

## 发布

本次只完成本地实现与验证，未发布线上。发布时先部署 `wrangler.toml` 对应 Worker，使 `TOWN_ROOMS` 绑定及 `town-v1` SQLite Durable Object 迁移生效，再发布本次 `dist` 到 Pages。现有 Pages `/api/*` 代理继续转发到 Worker；本功能不需要 D1 教材迁移或重新导入教材。

已执行 Worker `deploy --dry-run`，确认包含 `TOWN_ROOMS`。上线后应以两个独立浏览器检查同房、不同房、重连及实际代理 WebSocket 升级。

主要代码：`src/town/TownProgression.mjs`、`TownMultiplayer.mjs`、`TownRemotePlayers.mjs`、`TownLife.mjs`，`src/arcade/BubbleGame.mjs`、`RhythmGame.mjs`，以及 `worker/town-api.mjs`、`town-room.mjs`。
