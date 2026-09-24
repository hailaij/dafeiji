# 测试入口

以下命令均在仓库根目录执行。纯逻辑与游戏循环测试只需 Node.js，无须安装游戏运行依赖。

```powershell
node test/logic.test.js
node test/input.test.js
node test/enemy.tracking.test.js
node test/boss.design.test.js
node test/balance.contract.test.js
node test/gameplay.test.js
node test/hangar.test.js
node test/enemy.expansion.test.js
```

## 浏览器测试

需要 Playwright Node 包及本机 Chrome；`require('playwright')` 须能解析（本地安装或通过 NODE_PATH 指定已有工具包）。

```powershell
node test/boss.modes.test.js
node test/gameplay.ui.test.js
node test/enemy.expansion.ui.test.js
node test/art.ui.test.js
node test/hangar.ui.test.js
```

UI 截图写入 `test/artifacts/`，可重复生成，不纳入 Git。浏览器回归中的测试状态只注入测试页面，不写入发布代码。手动 Boss 试战与试听入口为 [boss-lab.html](boss-lab.html)。

美术预览入口：[敌机与堡垒图鉴](art-lab.html)，支持灰度与碰撞圆。

## 平衡数据

`reports/` 保存可复现 JSON 数据；根目录数据为 v1.4.2 阶段，`gameplay/` 为流派/编队阶段，`enemy-expansion/` 为敌人/炮台阶段。不要直接覆盖历史报告。

```powershell
# 用新子目录保存本次 432 条模拟
$env:BALANCE_REPORT_DIR='test/reports/local-audit'
node test/balance.audit.js
Remove-Item Env:BALANCE_REPORT_DIR
```

不设置 BALANCE_REPORT_DIR 时会覆盖 `test/reports/` 下同名结果。`balance.reactive.js` 的额外躲避模拟目前固定写入 `test/reports/balance-reactive.json`；再次运行会覆盖该文件。

[报告索引](../docs/README.md)

自由搭配开局比较：`node test/hangar.audit.js`，写入 `test/reports/loadouts/opening.json`（486 条开局模拟）。

自由搭配后段比较：`node test/loadout.reactive.js`，写入 `test/reports/loadouts/late-reactive.json`（324 条启发式避弹模拟）。

指针手感回归：`node test/player.movement.test.js` 检查多刷新率追踪与边界，`node test/player.movement.ui.test.js` 检查浏览器真实鼠标事件与模拟触屏事件（需 Playwright）。

Boss 音频回归：`node test/audio.ui.test.js` 使用真实 WebAudio 检测 11 首配乐采样输出，并验证音频挂起后继续/指针手势恢复及静音切换（需 Playwright）。

主机护盾：`test/player-shield-lab.html` 对照三机型 0–3 层效果；`node test/player.shield.ui.test.js` 检查样式、层数、空盾及绘制状态隔离。
