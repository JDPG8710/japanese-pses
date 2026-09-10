# Piko Playroom 国际象棋（2026-09-09）

## 已完成

- 共用 `/arena.html` 入口；`?game=chess` 打开国际象棋，Piko Playroom 品牌保持中、日、英一致。
- 支持邀请链接、快速匹配、15 分钟双方计时、断线恢复、认输与提议和棋。
- 服务端使用 `chess.js` 验证每一步，覆盖将军、将死、逼和、升变、王车易位、吃过路兵、三次重复局面、五十回合规则和子力不足。
- 双方在结束页选择“再来一局”后交换黑白并立即开局；旧局存入 D1，可回放并导出 PGN。
- 家庭房最多 8 人，可在开局前选择围棋或国际象棋以及本局双方；进行中的棋局不能被房主切换。
- 新手课共 8 步，使用实际棋盘练习兵、车、象、马、吃子、升变、将军和将死，并以儿童可读的中、日、英文字说明特殊规则。

## 数据与运行时

- D1 migration：`migrations/0014_chess.sql`
- Durable Object：`ChessRoom`，binding `CHESS_ROOMS`，migration tag `chess-v1`
- 对局记录：`chess_games`
- 通用教程进度：`playroom_tutorial_progress`
- 规则依赖：`chess.js` 1.4.x（BSD-2-Clause）；浏览器版本与许可证保存在 `src/arena/vendor/`。

## 验证

```powershell
node tests/test_chess.mjs
node tests/test_chess_browser.mjs
node tests/test_playroom.mjs
node tests/test_playroom_browser.mjs
node tests/test_e2e_runner.js
node scripts/build.mjs
```

国际象棋集成测试包含规则、房间权限、匹配、实时连接、和棋、重赛、归档、家庭房与教程进度。浏览器测试使用两个独立身份验证实际走子、重赛换色、教程与手机布局。

## 后续边界

这一阶段只提供真人对局。电脑棋手、等级分、观战和锦标赛留到后续版本。自动和棋采用适合家庭对局的简化方式：服务器在三次重复局面或五十回合条件达到时直接判和。

## 生产发布记录

- D1：`0014_chess.sql` 已应用
- Worker version：`4fd4d188-29f0-44bf-80b7-76091df07679`
- Pages deployment：`https://4b48e3f3.manabi-pop.pages.dev`
- 正式入口：`https://piko-game.com/arena.html?game=chess&lang=zh`
- 生产双玩家验收：9 项通过；两个不公开 QA 昵称完成走子、认输、换色重赛、教程和手机布局检查。
