# Piko Game 合规与儿童安全改造需求说明

**文档类型：** 工程需求（交给高级编码工程师实现）  
**提出方：** 高级审计专员  
**项目：** `D:\Japanese PSES`（Piko Game / まなびぽっぷ）  
**生产：** `https://piko-game.com`（Cloudflare Pages `manabi-pop` + Worker `japanese-pses` + D1）  
**日期：** 2026-09-10  
**优先级总原则：** 儿童隐私与广告门控 > 支付/退款说明与家长确认 > 多人安全 > 文案/数据来源声明 > 中国市场降级策略  

> 本需求来自合规风险审计。实现以「可测试、可回滚、与现有 Cloudflare 架构一致」为准。正式法律意见仍需律师确认；工程师按本需求完成产品与技术加固。

---

## 1. 背景与目标

### 1.1 背景
产品明确面向日本小学 1–6 年级儿童，同时具备：
- Google 登录与云同步
- 访客指纹相关机制
- 免费用户 Google H5 广告（约 5 分钟间隔）
- Stripe 永久去广告会员（约 ¥500）
- 多人对战 / Playroom（围棋、象棋、房间、公开在线名单）
- 中文路径 `zh/` 与中国年级相关内容

审计发现隐私文案与实现不一致、儿童广告门控不完整、支付条款不足、对战缺少举报、课程数据表述易被误读为官方背书、中国路径在未获教材授权与境内资质时存在过高经营暗示等问题。

### 1.2 目标（完成定义）
1. **儿童默认安全：** 广告、云同步、付费、陌生人匹配均默认按「需家长」路径处理。  
2. **隐私政策与代码一致：** 实际收集字段、同意逻辑、跨境处理与 `privacy.html` / `terms.html` 对齐。  
3. **广告合规加固：** 儿童向标记完整；同意门控对生产广告加载生效；儿童无法一键打开行为广告。  
4. **支付可解释：** 退款/数字商品说明齐全；结账前家长确认；文档与 `paymentAvailable` 状态一致。  
5. **多人可治理：** 昵称过滤、默认非公开、举报/拉黑、未成年人限制陌生人匹配。  
6. **表述去官方化：** 汉字/都道府县等数据标题去掉易误解的官方转载措辞。  
7. **中国路径降级：** 对 `country=CN`（或等价检测）可关闭付费与广告，并避免未授权教材内容上线。  
8. **仓库与生产一致：** `src/arena/`、`updates.html` 等与线上一致，纳入测试与发布物。

### 1.3 非目标（本迭代不做）
- 不申请中国 ICP / 游戏版号 / 经营许可（属商务/法务）
- 不接入微信登录或国内支付（可列为后续）
- 不重写全部课程内容
- 不做「可验证家长同意（COPPA VPC）」的完整第三方身份验证（可预留接口；本迭代先做强家长门控 + 同意存证）

---

## 2. 范围与模块

| ID | 模块 | 优先级 | 预估影响面 |
|----|------|--------|------------|
| R1 | 学习者资料最小化 + 隐私文案对齐 | P0 | `src/profile/`, `privacy.html`, 云同步 state |
| R2 | 家长门控（登录云同步 / 付费 / 广告同意） | P0 | `src/auth/`, `src/membership/`, `src/privacy/`, `src/ads/` |
| R3 | 儿童广告标记与加载门控 | P0 | `index.html` 等入口、`H5AdManager.js`、`ConsentManager.mjs`、Worker membership API |
| R4 | 会员条款、退款说明、结账确认 | P0 | `terms.html`、`MembershipManager.js`、结账 UI |
| R5 | Playroom / Arena 安全 | P1 | `src/arena/`、Worker playroom/go/chess、UI |
| R6 | 数据来源与免责声明 | P1 | `data/*.json` 标题、README、页面脚注 |
| R7 | 中国（CN）降级开关 | P1 | 地理/国家检测、membership、ads、GradePaths 文案 |
| R8 | 仓库同步与回归测试 | P1 | 补齐 `src/arena/`、`updates.html`、测试与 docs |

---

## 3. 详细需求

### R1 — 学习者资料最小化与隐私对齐（P0）

**问题：** `LearnerProfile` 收集精确年龄 5–15 + 性别 + 昵称；隐私页写「age range」等，不一致。

**要求：**
1. 将「精确年龄」改为 **年龄段枚举**（例如：`under_6` / `6_8` / `9_11` / `12_14` / `prefer_not`），**禁止**存储具体周岁整数（除非已有数据迁移策略：旧整数映射到年龄段后停止写入整数）。  
2. **性别字段默认不收集**；若产品需要，改为可选且默认跳过，隐私页明确「可选、非必需」。  
3. 昵称：长度限制、禁止 URL/联系方式模式、基础敏感词过滤（与 R5 共用过滤库）。  
4. 更新 `privacy.html`（及 en/ja/zh 若分离）准确列出：收集项、目的、存哪里（D1/IndexedDB）、是否用于广告（默认否）、如何删除。  
5. 提供「删除云端学习资料 / 注销会话数据」入口（登录用户），调用现有或新增 API，并在隐私页写明路径。

**验收：**
- [ ] 新用户资料写入 payload **不含**精确年龄整数、默认不含性别  
- [ ] 隐私页字段列表与 `LearnerProfile` + Worker state 字段一致（测试快照或契约测试）  
- [ ] 删除流程可在测试中模拟成功  

---

### R2 — 家长门控（P0）

**问题：** 仅文案要求家长管理，无技术门控。

**要求：**
1. 新增共享模块（建议 `src/privacy/ParentalGate.mjs`）：  
   - 适龄挑战题（例如简单算术，**非**安全认证，但提高儿童误操作门槛）  
   - 或「我是家长/监护人」确认 + 时间戳写入 `localStorage`/账号 meta（`parental_ack_at`, `parental_ack_version`）  
2. **必须经过家长门控** 才能：  
   - 将广告同意设为「允许可选广告」  
   - 发起 Stripe Checkout  
   - 首次将本地进度绑定到 Google 云同步（可选：每次新设备）  
3. 门控文案三语（ja/en/zh），明确：本产品面向小学生，需监护人同意。  
4. 记录同意版本号（与隐私政策版本绑定），便于审计。

**验收：**
- [ ] 儿童路径无法直接打开广告「允许」或结账  
- [ ] 门控失败不产生付费会话、不写入 `advertisingAllowed=true`  
- [ ] 有单元/浏览器测试覆盖  

---

### R3 — 儿童广告标记与加载门控（P0）

**问题：** 线上脚本有儿童标记，但首页 HTML 缺测试期望属性；配置分叉；儿童可点同意。

**要求：**
1. 所有投放广告的 HTML 入口补充 Google 儿童向所需标记（与 `tests/test_content_safety.js` CS8 对齐），例如：  
   - `data-tag-for-child-directed-treatment="1"`  
   - `data-tag-for-under-age-of-consent="1"`  
   （以当前 Google H5 / AdSense 儿童文档与现有测试为准，勿发明参数。）  
2. `H5AdManager`：  
   - **仅当** `ConsentManager.advertisingAllowed === true` **且** 已通过 R2 家长门控 时才加载广告脚本 / 请求 ad break  
   - 默认 `advertisingAllowed = false`  
   - 监听 `PIKO_PRIVACY_CHOICE_CHANGED`，撤销同意立即停广告  
3. EEA/UK/CH 等 `GOOGLE_CERTIFIED_CMP_REGIONS`：保持不投个性化广告；若无认证 CMP，则 **这些地区完全不加载广告**（比「假装同意」更安全）。  
4. Worker `/api/membership` 的 `googleH5AdsPublisherId` 与页面 `ca-pub-…` **单一来源**（推荐：仅页面或仅 API，另一处删除或只读同步）。  
5. 同步本地 `src/ads/H5AdManager.js` 与生产行为，避免仓库落后。

**验收：**
- [ ] `npm run test` 中 content safety / privacy 相关用例通过（含 CS8）  
- [ ] 未同意或未过家长门控时，网络面板无 AdSense/H5 广告脚本请求（测试或文档化手动检查步骤）  
- [ ] CN 降级开启时（R7）不加载广告  

---

### R4 — 会员、退款与结账确认（P0）

**问题：** 永久 ¥500 会员可结账；条款几乎无退款；文档过时；品牌文案混用。

**要求：**
1. `terms.html`（及多语言若有）增加 **Purchases** 专节：  
   - 商品：永久去除广告的数字会员（非实物）  
   - 价格币种（JPY）  
   - 退款政策（至少：法律规定的消费者权利不被限制 + 产品自身的申请渠道/邮箱 + 数字内容一经开通是否可退的清晰陈述）  
   - 需监护人购买  
2. Checkout 前强制 R2 家长门控 + 复选框「我已阅读购买条款」。  
3. 统一商品展示名称为 **Piko Game**（去掉过时「まなびぽっぷ！」混用，或按产品决策统一一处）。  
4. 更新 `docs/` 中「支付未启用」等过时描述；以 `paymentAvailable` 与代码为准。  
5. （可选 P1）结账成功页展示收据与「联系支持」入口。

**验收：**
- [ ] 条款与结账 UI 文案一致  
- [ ] 无家长门控无法调用 `startCheckout`  
- [ ] 文档不再声称支付未启用（若生产已启用）  

---

### R5 — Playroom / Arena 安全（P1）

**问题：** 公开在线名单、昵称 UGC、邀请链接；缺举报/拉黑；本地缺 `src/arena/`。

**要求：**
1. **把线上 `src/arena/` 与相关 Worker/API 完整纳入本仓库**，与生产同构。  
2. 默认：  
   - 未成年人 / 未过家长门控：**禁止加入公开匹配与公开在线名单**；仅允许「家庭房邀请码」或人机练习  
   - 公开名单改为 opt-in，默认关闭  
3. 昵称：复用 R1 过滤；服务端再校验（Worker）。  
4. UI：举报、拉黑（本地 + 尽可能服务端记录 `report` 表或日志）；无自由文本聊天则保持禁止开放聊天。  
5. `updates.html`、sitemap 视产品决定是否收录 arena；但源码与测试必须进仓。

**验收：**
- [ ] 仓库含 arena 源码；`npm` 相关 playroom/go 测试可跑  
- [ ] 默认配置下儿童游客不能进入公开陌生人匹配  
- [ ] 存在举报入口与基础服务端接收  

---

### R6 — 数据来源与免责声明（P1）

**问题：** 「文部科学省…完全収録」等表述易被理解为官方数据库转载/背书。

**要求：**
1. 修改 `data/kanji_1026.json`、`data/prefectures_47.json` 等 **title/description** 字段：改为「参照文部科学省公开的学年别汉字配当表等公开资料自行编制的学习数据；非官方、非监修、非转载数据库全文」。  
2. README / 关于或页脚增加同样声明；保持 `terms.html`「不替代学校/考试」表述。  
3. `docs/curriculum/CHINA_PRIMARY_OUTLINE.md`：增加工程级约束注释或 `CONTENT_POLICY.md`——**禁止**合入未授权中国教材原文/插图；CI 或测试可抽查敏感关键词（人教版课文标题等）可选。  
4. 保留已有 `COUNTRIES_LICENSE.md`、flags LICENSE。

**验收：**
- [ ] 仓库内无「完全収録」「官方认证」「教育部认定」「监修」等易误导营销句（允许客观「参照」「对应学年」）  
- [ ] 文档明确中国教材未授权则不上正文  

---

### R7 — 中国（CN）降级开关（P1）

**问题：** 有 zh 路径与 CN 年级；Stripe/Google/广告在大陆不稳定；主动经营风险高。

**要求：**
1. 统一读取现有 `/api/location` 或等价国家检测，得到 `country === 'CN'`。  
2. 当 CN 降级开启（建议环境变量 / Worker var `CN_SAFE_MODE=true` 默认 **true**）：  
   - **不加载广告**  
   - **隐藏或禁用 Stripe 结账**（API 层也要拒绝创建 checkout）  
   - UI 提示：部分登录/云同步依赖的第三方服务在当地可能不可用；可继续游客本地学习  
3. 弱化「中国正式教材/提分培训」营销措辞；不引导用户「翻墙」。  
4. 不在本迭代做国内备案或微信登录。

**验收：**
- [ ] 模拟 `country=CN` 时 membership checkout 返回明确错误；前端无购买按钮或按钮禁用  
- [ ] 模拟 CN 时不请求广告脚本  
- [ ] 游客本地玩法仍可用  

---

### R8 — 仓库同步与回归（P1）

**要求：**
1. 对齐本地与生产：`src/arena/`、`updates.html`、广告门控版 `H5AdManager`。  
2. 扩展/修复测试：  
   - `tests/test_privacy_consent.mjs` / browser  
   - `tests/test_content_safety.js`（CS8）  
   - `tests/test_oauth.mjs`、membership 相关  
   - playroom/go 既有测试  
3. 更新 `worker/README.md` / 相关 docs：部署顺序、密钥、CN_SAFE_MODE、家长门控版本号。  
4. 变更经 `npm test`（或文档列出的最小测试集）后，再按现有 `npm run deploy` 流程由运维/负责人发布（本需求不强制工程师自行生产发布，除非用户另指示）。

---

## 4. 技术约束

- 栈：静态 Pages + `functions/api` Service Binding → Worker `worker/arena-entry.mjs` + D1 + Durable Objects。  
- 密钥仍只放 Worker Secrets；禁止提交 `secrets/`、`.dev.vars`。  
- `preview_database_id` 与生产同 ID 的问题**本需求不修**（另开运维任务），但禁止在预览环境对生产 D1 跑破坏性实验。  
- 多语言：ja 为产品主语言；en/zh 关键合规文案需同步。  
- 代码风格与现有 ES Module / 现有测试运行器一致。

---

## 5. 交付物

1. 代码 PR / 提交（建议分支名：`fix/child-safety-compliance`）  
2. 本需求各验收清单的自检结果（在 PR 描述勾选）  
3. 若有 DB 迁移：`migrations/00xx_*.sql` + 本地/远程 migrate 说明  
4. 简短 **CHANGELOG** 面向用户的说明（隐私更新、购买条款、对战安全），供 `updates.html` 使用  

---

## 6. 建议实现顺序

1. R3 广告默认关闭 + HTML 标记（立刻降低曝光风险）  
2. R2 家长门控  
3. R1 资料字段 + 隐私页  
4. R4 条款与结账  
5. R7 CN 降级  
6. R5 Arena 安全 + 进仓  
7. R6 文案与内容政策  
8. R8 测试与文档收尾  

---

## 7. 给工程师的上下文摘要

- 仓库：`https://github.com/JDPG8710/japanese-pses.git`  
- 本地路径：`D:\Japanese PSES`  
- 相关审计结论：儿童向 + H5 广告 + Stripe + 多人房间是主风险；中国主动营销/收费需法务，工程侧先做 CN 降级。  
- 协作：有疑问就默认「更保守的儿童保护」选项，并在 PR 说明取舍。

---

**文档结束**
