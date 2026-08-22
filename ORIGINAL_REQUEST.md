# Original User Request

## 2026-08-22T01:49:05Z

升级与打磨日本小学全学科“星图教育游戏”（Japanese PSES Galaxy Engine），建立多智能体协作与产品经理（Product Manager Agent）主导的研发架构，全面提升游戏趣味性、小学生交互体验、声光反馈（Web Audio 原生合成音效 + 粒子爆炸/震屏动效）、容错与错误提示引导，并完善全学科知识图谱。

Working directory: d:/Japanese PSES
Integrity mode: development

## Requirements

### R1. 多智能体架构规范化与新增产品经理角色 (Multi-Agent Teamwork Architecture & PM Agent)
- 检查与整理 .agents/agents/ 下现有各个智能体配置（director_agent, game_designer_agent, graph_evolution_agent, qa_player_agent, ug_repair_agent），统一契合多智能体协同流水线。
- 新增 product_manager_agent（教育产品经理 / Lead Game Producer），定义其角色定位、核心职责（把控小学各年龄段认知心理、定义游戏趣味度/挑战度指标、规划声光激励反馈与知识图谱演进蓝图）、约束条件与协作输入输出规范。

### R2. 小学生声光视听反馈与容错引导系统 (Audio-Visual FX & Friendly Error Feedback)
- 构建轻量化、免外部静态资源依赖的 Web Audio API 原生音效合成系统（包含：答对清脆叮咚/升级琶音、连击 Combo 激昂音效、答错温柔提示音、按钮点击触感声）。
- 增加 Canvas / CSS 粒子爆炸动效（答对爆出星尘/金币）、屏幕微震动反馈（Screen Shake）。
- 完善操作容错体验：点击错误时提供明确且富有鼓励性的卡通提示（友好震颤、高亮正确线索、错误解释气泡），杜绝点击无效或无任何反馈的冷冰冰体验。

### R3. 小游戏玩法丰富度与新鲜度升级 (Gameplay Variety & Child-Friendly Interactivity)
- 扩充并升级现有的单调小游戏，为各科目（国语、算数、理科、社会、英语、生活）打造专属趣味交互机制，例如：
  - 国语：汉字偏旁部首拼装 / 星流汉字捕获
  - 算数：九九乘法星际连击 / 星舰能量天平称重平衡
  - 理科：天体/杠杆/电路沙盒互动实验
  - 社会：日本列岛47都道府县拼图与特产寻宝
  - 英语/生活：情景趣味配对与分类
- 优化操作判定（支持移动端大触控区与 PC 鼠标交互，消除 Hitbox 判定过小或误触问题）。

### R4. 知识图谱完整度与自适应进化 (Knowledge Graph Integrity & DAG Evolution)
- 结合文部科学省教学大纲（1-6年级1026汉字、各学科核心知识点），校验 data/ 目录与 CurriculumData.js，保证 DAG 拓扑无死锁、无环路、层级过渡平滑自然。
- 完善 graph_evolution_agent 的断层检测与平滑修复逻辑，确保学习路径梯度合理。

## Acceptance Criteria

### 1. 智能体规范与文档 (Agent Architecture)
- [ ] .agents/agents/product_manager_agent/agent.md 已创建并具备完整的角色定义、工作流程、输入输出规范。
- [ ] 所有 agent 的 markdown 定义清晰互通，director_agent 调度逻辑已吸纳 PM Agent 的产品规划职责。

### 2. 音频与视效系统 (Audio & Visual FX)
- [ ] 游戏中集成基于 Web Audio API 的即时音效合成引擎，支持正反馈音、负反馈音、连击音、通关音，并提供静音/开启控制。
- [ ] 答对有粒子特效与星光爆破动画，答错有温和抖动、明确的错误提示引导与线索高亮。

### 3. 小游戏可玩性与稳定性 (Mini-Game Polish)
- [ ] 全教科小游戏均能正常加载与游玩，界面响应灵敏，无未捕获的 JavaScript 异常。
- [ ] 移动端视口与 PC 端视口自适应良好，触控点击反馈及时。

### 4. 知识图谱与数据 (Curriculum Data & Stability)
- [ ] 知识图谱数据结构完整，无损坏节点。
- [ ] 在浏览器中打开 index.html 能流畅体验星图浏览、节点点击进入对应科目游戏、通关结算与声光全流程。
