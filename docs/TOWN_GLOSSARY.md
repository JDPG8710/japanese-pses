# Piko Town glossary (zh / en / ja)

Covers the town, its minigames/arcade and the Playroom town card. Each language is written for its
own young players. These strings are **not** literal translations of each other. Keep these terms
consistent whenever you add text. `tests/test_town_i18n.mjs` fails on missing keys, untranslated
copies, CJK characters in English and Chinese-only hanzi in Japanese.

## Voice

| | Style |
|---|---|
| **中文** | Natural Simplified Chinese for primary-school kids. Short sentences with a light 啦/吧/哦 where it feels natural. Avoid stiff written words such as 此, 无法, 暂无 and 委托; prefer 这台设备, 打不开, 还没有. |
| **English** | Like a native kids' game: contractions, upbeat ("Great job!", "Not quite!"), and **British spelling** to match the site (Maths, colour, neighbour, tyre, harbour, practise). No adult jargon ("Fuselage", "flagship", "randomized"). |
| **日本語** | Game tone for elementary kids: mostly hiragana, katakana for loanwords, and only easy grade 1–2 kanji (上下左右, 小, 大, 人, 何, 数, 入る, 出す, 見る, 読む, 歩く, 会う, 金, 同じ, 高い, 走る…). Endings like 〜しよう, 〜だよ and 〜ね. No 分かち書き spaces except one light break in long hints. No 直訳 (e.g. use おしごと, not 委託). The player is addressed as きみ. |

## Core terms

| Concept | 中文 | English | 日本語 |
|---|---|---|---|
| Town (brand) | Piko 学习小镇 | Piko Town | ピコタウン |
| the town (common noun) | 小镇 | town | まち |
| Piko / Mia / Noah (NPCs) | 皮可 / 米娅 / 诺亚 | Piko / Mia / Noah | ピコ / ミア / ノア |
| Square | 广场 / 皮可广场 | Piko Square | ひろば / ピコひろば |
| Shop | 阳光商店 | Sunshine Shop | ひだまりショップ |
| Home | 我的小屋 | My Home | おうち / わたしのおうち |
| Mission (story step) | 任务 | Mission | おしごと |
| Currency | 星币 | Star coins (Coins in tight HUDs) | スターコイン (コイン in tight HUDs) |
| XP | 经验值 | XP | けいけんち (wallet chip: けいけん) |
| Level (town progression) | 等级 / 第 N 级 | Level | レベル |
| Stage (island / minigame round) | 关卡 / 下一关 | Stage / Next stage | ステージ / つぎのステージ |
| Endless mode | 无尽挑战 | Endless challenge | エンドレスチャレンジ |
| Best score | 最高分 | Best | ベスト |
| Rankings | 排行榜 | Rankings | ランキング |
| Try again / Play again | 再来一次 / 再玩一次 | Try again / Play again | もういちど |
| Hint | 提示 | Hint | ヒント |
| Difficulty Easy/Medium/Hard | 入门 / 进阶 / 挑战 | Easy / Medium / Hard | かんたん / ふつう / むずかしい |
| English / Maths (subjects) | 英语 / 数学 | English / Maths | えいご / さんすう |
| Order, total, change, checkout | 订单, 合计, 找零, 结账 | order, total, change, till | ちゅうもん, ごうけい, おつり, おかいけい |
| Goods / shelf / floor / decoration / plant | 商品 / 货架 / 地板 / 装饰 / 盆栽 | items / shelf / floor / decoration / plant | しなもの / たな / ゆか / かざり / うえき |
| Camera view (1st / 3rd person) | 第一人称 / 第三人称 | My view / Follow view | じぶん目線 / うしろから |
| Walk / Drive / Fly | 步行 / 开汽车 / 开飞机 | Walk / Drive / Fly | 歩く / くるま / ひこうき |
| Invite link / room code | 邀请链接 / 房间码 | invite link / room code | しょうたいリンク / ルームコード |
| Grown-up approval | 家长确认 | a grown-up's OK | おうちの人のOK |
| Lives (arcade) | 生命 | Lives | ライフ |
| Combo | 连击 | Combo | コンボ |

## Game and place names

| id | 中文 | English | 日本語 |
|---|---|---|---|
| Learning islands (portal) | 学习群岛 | Learning Islands | まなびアイランド |
| obby | 数学跳跳岛 | Maths Sky Islands | さんすうスカイアイランド |
| tower | 算术高塔 | Number Tower | すうじタワー |
| runner | 英语传送门 | English Portals | えいごゲート |
| memory | 记忆地板 | Memory Floor | メモリーフロア |
| garden | 双语小农场 | Word & Number Farm | まなびのはたけ |
| race | 皮可赛道 | Piko Circuit | ピコサーキット |
| breakout | 砖块大作战 | Brick Blitz | ブロックだいさくせん (short: ブロックくずし) |
| fruit | 水果风暴 | Fruit Storm | フルーツストーム |
| ninja | 忍者打字 | Ninja Typing | にんじゃタイピング |
| bubble (designer) | 小小设计师 | Little Designer | ちいさなデザイナー |
| rhythm | 节奏鼓队 | Rhythm Parade | リズムたいこ |
| Arcade section | 游戏街 | Arcade | ゲームセンター |
| Districts | 果园区 · 忍者道场 · 游戏街 · 夜间赛道 · 学习街 · 广场 | Orchard · Ninja Dojo · Arcade Alley · Night Track · Learning Lane · Plaza | くだものばたけ · にんじゃどうじょう · ゲームよこちょう · ナイトコース · まなびストリート · ひろば |

## Rules of thumb

- **Not translated:** English learning content such as shop orders ("Please deliver the…"), runner words, product names inside orders, and typing-practice word pools. Change these only for pedagogical reasons.
- **Proper nouns that stay the same in all languages:** Piko Game, WASD, Esc, Shift, GT, USB-C, iPhone, Huawei. If you add one, put it in the `SAME_OK` allowlist in the test.
- **Onomatopoeia gets adapted, never copied:** BOOM! ↔ 轰！ ↔ ドカーン！; spring boots → ぴょんぴょんブーツ; speed shoes → 飞毛腿跑鞋 / びゅんびゅんシューズ.
- **Template placeholders (`${…}`) must survive unchanged.** Word order may move around them.
- **Watch the length:** HUD labels should be at most about 12 full-width characters in zh/ja and about 18 characters in en. Check at 375 px wide.
