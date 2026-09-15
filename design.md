# NEON STRIKE · 霓虹突袭 — 设计文档

日期:2026-09-05 · 状态:已经用户批准 · 流程:brainstorming(architectural,精简版)

## 1. 目标

网页版打飞机游戏(纵版射击),赛博朋克霓虹风格,双击 index.html 即可离线游玩,零构建零第三方依赖。

## 2. 风格规范(cyberpunk)

- 底色 #0a0a12 / #12121f,霓虹青 #00f0ff(主色/己方)、品红 #ff00e5(敌方/危险)、黄 #ffe600(点缀/道具)
- 发光:标题/按钮/HUD 用多层 text-shadow / box-shadow glow
- 装饰:扫描线叠加层、滚动网格、HUD 角标、故障(glitch)标题
- 标题粗黑体,标签等宽字体 10-12px uppercase 字距 0.2em;卡片圆角 ≤ 8px
- 禁止:柔和低对比、大面积留白、细字体标题、>2 主霓虹色并存

## 3. 玩法(用户选定:标准完整)

- 玩家:鼠标跟随 / WASD·方向键 / 触屏拖动(手指上方偏移 70px),自动开火
- 火力 3 级:单发 → 双发 → 双发+侧向散射
- 敌机:grunt(直线下落)、sine(正弦侧移)、gunner(缓速+瞄准弹);波次解锁
- 每 5 波 Boss:血条、扇形弹幕、二阶段(加速+瞄准弹+召唤杂兵)
- 道具掉落:W 火力+1 / S 护盾回满(吸收 3 次) / H 生命+1;击杀 × 连击倍率(2s 窗口,最高 ×2)
- 生命 3 条,HP 3 点,受击无敌闪烁;最高分 localStorage 持久化
- 音效:WebAudio 全合成(射击/命中/爆炸/拾取/受伤/Boss 警报/结算),可静音

## 4. 架构

经典 script 按序加载(file:// 下 ES module 会因 CORS 失败,故不用模块),共享命名空间 DFJ:

    index.html   骨架 + HUD + 覆盖层(开始/暂停/结束)
    style.css    cyberpunk token + HUD/UI
    js/core.js      命名空间 / 工具 / 对象池(子弹·粒子·道具走池防 GC)
    js/logic.js     纯逻辑:碰撞·难度曲线·波次表·连击计分·道具效果(可 Node 单测)
    js/audio.js     WebAudio 合成音效 + 静音;AudioContext 在用户手势中懒创建
    js/entities.js  实体工厂与运动更新(不含渲染/输入)
    js/render.js    canvas 渲染:预烘焙霓虹精灵(离屏 canvas,避免逐帧 shadowBlur)、视差星空、Boss 血条
    js/game.js      游戏循环(rAF,dt≤50ms)、状态机 start/playing/paused/gameover、输入、碰撞调度、HUD
    test/logic.test.js  Node 零依赖单测
    design.md / README.md

数据流:输入(键/鼠/触) → game.update(dt) → entities 运动 → 碰撞(logic.circleHit) → 计分/掉落 → render 绘制 → HUD DOM 差量更新。

## 5. 健壮性

- localStorage 异常(隐私模式)→ 内存最高分降级;AudioContext 创建失败 → 静默无声
- 页面失焦自动暂停;rAF dt 钳制防切页跳帧;resize/DPR 自适应;window.onerror 收集到 __DFJ_ERRORS 供冒烟检查

## 6. 测试策略

- TDD:先写 test/logic.test.js(碰撞/难度单调与上限/波次表/连击/道具/Boss 阶段/种子随机),node 运行 RED → 实现 logic.js → GREEN
- 渲染/输入/音效:本地 http.server + 无头浏览器冒烟(打开→点 START→截图验证渲染→查 __DFJ_ERRORS)
- 验收:双击可玩、触屏可玩、无报错、帧率稳定

## 7. 非目标(YAGNI)

不做:排行榜联网、多人、皮肤系统、构建工具、外部字体/图片素材。
