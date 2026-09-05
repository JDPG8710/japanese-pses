# 世界课程年级闯关覆盖说明

世界课程的年级路径按日本版现有年级总量对齐，而不是把少数小游戏重复显示成一个短列表。中国课程同时增加原创的小学生英语挑战；内容参考 CEFR 能力目标与英检五级的任务类型，但不复制真题，也不宣称是官方考试或认证。

| 年级 | 对齐后的关卡数 | 中国英语目标 | 主要英语任务 |
| --- | ---: | --- | --- |
| 一年级 | 58 | Pre-A1 | 词义互译、基础对话、语序、短文找信息 |
| 二年级 | 56 | Pre-A1 | 词义互译、基础对话、语序、短文找信息 |
| 三年级 | 102 | A1 | 日常表达、对话补全、语序、短文理解 |
| 四年级 | 102 | A1 | 日常表达、对话补全、语序、短文理解 |
| 五年级 | 102 | A1+ | 情境表达、理由和比较、短文理解 |
| 六年级 | 102 | A2 bridge | 原因、经历、建议、信息推断 |

每条路径保持以下证据链：`国家课程 → 年级 → 学科 → 学习目标 → 任务系列 → 具体关卡 → 题库 → 进度/排行榜路由`。低年级中文题面、选项、提示和讲解均在本地使用审核过的拼音表生成 `<ruby><rt>` 标注，不向第三方服务发送儿童内容。

实现与验证入口：

- 年级及课程目录：`src/world/FoundationCatalog.mjs`
- 关卡数量与路径：`src/world/GradeJourney.mjs`
- 英语原创题库：`src/world/FoundationEnglish.mjs`
- 拼音标注：`src/world/PinyinRuby.mjs`
- 互动声效：`src/world/InteractionFeedback.mjs`
- 自动回归：`tests/test_world_curriculum_enhancements.js`

参考标准：

- CEFR level descriptions: https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions
- EIKEN Grade 5 task overview: https://www.eiken.or.jp/eiken/en/grades/grade_5/
