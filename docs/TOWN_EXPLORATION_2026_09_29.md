# 小镇摇杆、全屏、主题建筑与载具

## 交付范围

用户目标 → 小镇跨学年探索入口 → 保留数学／英语难度与五种学习关卡 → 统一摇杆、十座主题建筑、汽车和飞机 → `/town?locale=zh` → 原学习回归、移动输入和载具物理检查。

- 左下圆形模拟摇杆取代四个方向键和两个转向按钮：上下控制前进／后退，左右控制朝向，斜向同时移动和转向。支持力度、死区、指针捕获、第二指跳跃／爬升；松手、取消触摸、页面失焦停止输入。原键盘操作保留。
- 全屏原先只请求原生 API，缺少接口或请求失败时错误被忽略，表现为按钮没有反应。现在先进入铺满可视区的游戏模式，再尝试原生全屏；失败仍可玩。`visualViewport` 尺寸变化、退出按钮、Escape、滚动位置恢复、全屏内帮助对话框均有处理。兼容模式不能隐藏浏览器自身的地址栏。
- 十种原创 Three.js 建筑：浮岛入口、螺旋塔、双火箭传送门、彩色记忆方块馆、拱顶温室、齿轮工坊、水果市集、霓虹街机馆、赛车维修站和多层忍者道场。几何体、屋顶、立面、门窗、招牌分别建模；延续原建筑入口与地面碰撞范围。
- 顶部交通工具选择器提供步行、汽车、飞机。汽车具有轮胎、车灯、座舱与驾驶角色姿态；飞机具有机翼、尾翼、座舱和旋转螺旋桨。汽车受车身碰撞约束，飞机按机翼空间与建筑高度避让，可按住 ↑ / ↓ 升降，键盘 Space / Shift 也可升降。
- 载具选择保存在原 `piko-town-v1` 存档的 `expansion.vehicle` 中；旧存档默认为步行。切换到步行选择安全地面位置；飞机选择开阔地面起飞，飞行高度不作为重载出生高度。载具仅在镇上使用，学习关卡仍采用原步行和手动跳跃规则。

## 实现文件

- `TownControls.mjs`：摇杆、多指输入和交通方式控件。
- `TownFullscreen.mjs`：原生／兼容全屏及视区、退出处理。
- `TownLandmarks.mjs`：按玩法独立建模的建筑。
- `TownVehicles.mjs`：模型、车身碰撞、飞行净空、分步移动和安全停靠。
- `TownScene3D.mjs`、`TownExpansion.mjs`、`TownApp.mjs`、`ArcadeRules.mjs`、`expansion.css`：场景、界面与兼容存档接入。

## 已执行的验证

- 主回归 44 组、212 项通过。
- 购物主线浏览器 18 组、完整 3D 浏览器 16 组通过。
- 5,400 个学习关卡规则流程、建筑入口／碰撞规则通过。
- 三种全屏环境（API 不存在、请求拒绝、原生可用）均可进入、操作、打开帮助及退出。
- 实际 CDP 多点触控事件验证摇杆移动＋转向＋第二指跳跃，以及手机飞机爬升／下降和松手停止。
- 汽车驾驶、保存重载、飞机飞行与落地，旧存档和非法载具字段恢复通过。
- 十种建筑逐栋浏览器渲染、两种视角 × 四种宽度的答案可读性、控制器避让通过。
- 车辆分步移动验证墙体阻挡、低空建筑阻挡、高空越过建筑、场景边界、安全停靠。
- 发布门禁新增 `test:town:exploration`，正式资源核对新增四个模块。

移动验证使用 Chrome 移动视口／多点触控模拟，未使用实体 iOS／Android 设备。没有后端或数据库变更。

## 设计与兼容性参考

参考 Roblox 官方关于独立轮廓、分区配色与模块化环境的设计方法，所有本次建筑和载具均为本仓库原创建模，未导入 Roblox 游戏资产。

- [Roblox：Construct your world](https://create.roblox.com/docs/tutorials/curriculums/environmental-art/construct-your-world)
- [Roblox：Assemble modular environments](https://create.roblox.com/docs/tutorials/use-case-tutorials/modeling/assemble-modular-environments)
- [MDN：requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen)

## 正式发布结果

- 源码 `d7f08aa` 已合入远端 main，正式部署为 https://e6fea1e1.manabi-pop.pages.dev 。
- 正式域名 https://piko-game.com/town?locale=zh 上复测通过：三种全屏路径、摇杆转向／移动与双指跳跃、手机飞机升降、汽车驾驶与重载保存、安全步行切换。
- 正式 320／390／820／1440px 的真实 WebGL、十座建筑、移动、视角保存和控制器边界均通过。
- 正式 49 个 URL、21 个关键文件与最终 dist 字节一致、三语言教材及 17／17 健康检查通过。
- 最终逐栋渲染检查：建筑包含 42～84 个网格部件，包含专属立面、门窗、屋顶与装饰。截图保存在 `.wrangler/town-landmarks/`；全屏与飞机截图保存在 `.wrangler/town-exploration/`。


## Rooftop game names

Replaced small facade labels on all ten venues with high-resolution billboard signs above the measured model bounds, including flags and antennae. Dark panels preserve contrast as pastel lettering and borders cycle through colors. The signs gently roll and float while a halo rotates; lettering remains camera-facing. Distance scaling improves phone readability, with an upper size limit. Reduced-motion preferences stop the animation. Existing scene disposal releases sign textures and geometry.

The walking third-person camera raises its focus smoothly near tall landmarks so the tower sign fits alongside the player. The instructional tip is hidden when that framing would put it over a roof sign. Learning-game cameras and controls retain their existing behavior.

Validation: ten landmark browser renders; all ten roof clearances, rotation changes and hue transitions checked in Chrome; 390px mobile tower screenshot inspected. Standard release gates cover content, SEO, login, Japanese entry, 320/390/820/1440px WebGL layouts, joystick, vehicles and native/fallback fullscreen. Mobile verification uses browser emulation, not physical devices.
