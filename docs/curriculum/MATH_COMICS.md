# 小学数学漫画首批教材

2026-09-08。本地制作与接入；未发布生产环境，未进行儿童学习效果试验或外部教师审校。

## 交付范围

六篇微课：分数、周长、面积、体积、百分数、比。每篇四格，中文、日文、英文，共24个分镜内容单元；三语言共用插画与精确图形，不计为72幅独立生成插画。每课第一格有场景插画，其余格以数学图解推进。日语说明使用假名，公式保留数学记法。

一幅AI生成的四场景插画板：分享面包、花园围栏与地砖、积木、调配饮料。它只承担叙事；数量、等分、数轴、长度、单位网格等由SVG确定性绘制。分数长条在不同分格下保持相同整体尺寸，体积按分开的层示意，每格对应一个单位小正方体位置。

## 课程追踪与边界

- 国际路线：地区学制 → 原有学年 → 数学 → fractions / measure / area / volume / percent / ratio → 挑战前漫画入口 → 原有10题。只给当前已解锁、有效的目标提供入口。漫画语言切换不改变路线语言、年级或成绩键。
- 日本路线：MATH_G3_DIV_FRACTION → 分数；MATH_G4_AREA_DECIMAL → 面积；MATH_G5_RATIO → 体积、百分数；MATH_G6_PROPORTION_SPEED → 比。未解锁单元不添加入口。
- 不新增课程节点，不修改题池、奖励、倒计时、保存与解锁。阅读不记录为通关，也未新增阅读追踪数据。
- 最后一格是可重试的概念练习，没有通关奖励；答案均带正确单位。计时挑战中不开放漫画，避免暂停接口或答案泄漏问题。
- 当前是四个主题方向拆成六课的第一版；等值分数系统教学、公式剪拼动画、语音朗读、错题自动推荐、阅读完成记录和延迟学习效果评估尚未实现。

## 文件与预览

- `src/comics/preview.html`：六篇教材预览。
- `src/comics/MathComicData.mjs`：三语言脚本和映射。
- `src/comics/MathComic.mjs`：SVG、可访问模态阅读器、切换与练习。
- `assets/comics/piko-math-scenes.png`：已保存到项目的原始生成插画。
- `GalaxyEngine.js`、`src/world/FoundationPlay.mjs`：入口。

## 生成方式与最终提示

使用内置 image_gen 工具，一次生成四场景插画板；未使用CLI/API。最终提示如下：

> Use case: illustration-story. Create a polished children's educational comic illustration sheet, square image, four equal panels arranged 2 by 2 with clear straight gutters. Same friendly small golden five-point star mascot with face, tiny arms and feet in every panel, named Piko but NO TEXT anywhere. Soft expressive ink outlines and pastel watercolor, cozy playful picture-book art, cream backgrounds, teal and warm gold palette. Top left: star sharing a round bread with a child at a picnic table (no precise division marks, no mathematical claims). Top right: star and child beside a small garden with fence and a few loose paving tiles, thinking about building. Bottom left: star and child building with wooden cubes. Bottom right: star and child mixing berry juice in clear pitchers. Story scenes only; precise mathematics will be separately rendered in code. No letters, numbers, labels, speech bubbles, equations, logos or watermark. Keep characters and important objects within each panel, readable at small size. All four scenes equally sized.

## 验证

- `node tests/test_math_comics.mjs`：三语言完整性、单位、网格数量与目标映射。
- `node tests/test_math_comics_browser.mjs`：Chrome，1280/375/320宽度，六篇教材共18次阅读流程；切换三语言、答错重试、关闭与焦点恢复、中国与日本课程入口。
- `node tests/test_e2e_runner.js`：207/207通过。
- `node tests/test_grade_paths.mjs`、`node tests/test_grade_journey.mjs`：通过，68个地区学年地图。
- `node tests/test_foundations.mjs`：1035个本地化路线、42231项内容检查通过。
- `node tests/test_foundation_api.mjs`：25项通过。
- `node scripts/build.mjs`：构建通过。

本机npm启动脚本引用缺失文件，以上使用node直接运行package.json对应入口。浏览器运行时由PLAYWRIGHT_MODULE_PATH指定现有Playwright安装。手机面积样课截图位于`.wrangler/comic-qa/area-375.png`。
