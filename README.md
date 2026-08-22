# 银河知识图谱 (Galaxy Knowledge Graph) - 模块一

全平台银河系星图视觉与响应式 UI 渲染引擎。

## 目录结构

- [GalaxyEngine.js](file:///d:/Japanese%20PSES/GalaxyEngine.js)：基于 Three.js 的银河系粒子星图渲染器（含星核、6条旋臂、知识节点、跨学科光束、触控补偿与响应式适配）。
- [index.html](file:///d:/Japanese%20PSES/index.html)：包含 PC 端与移动端（Bottom Sheet）自适应 UI 布局的单页应用。

## 运行方式

由于使用了原生 ES 模块（`import map`），建议通过任意本地静态服务器打开：

```bash
# 方式 1: 使用 npx serve
npx serve .

# 方式 2: 使用 Python
python -m http.server 8080

# 方式 3: VS Code Live Server 插件直接右键 index.html -> Open with Live Server
```
