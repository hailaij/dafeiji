# NEON STRIKE · 霓虹突袭 创意工坊

项目 slug：`neon-strike`。公共 API：`window.NeonStrikeMods`，API 版本 `1.0.0`，当前正式游戏版本为 v1.8.0，也兼容此前 v1.7.0 的工坊预接入及保持 API v1 的后续版本。旧 v1.7.0 安装包没有此接口，必须检测 `apiVersion`，不能只检测游戏版本。游戏目前是单机，没有房间或联机入口。

## 可以制作的 Mod

- `visual.player-marker`：飞机装饰光环，可用不同颜色和半径组合制作定位圈。装饰不代表护盾或碰撞范围。
- `hud.readout`：EMP 倒计时、生命摘要、分数或波次文字仪表。可用事件实现仅存在当前页面内的统计。

当前角色、武器、道具、关卡、伤害、AI 和音频均由现有内部模块管理，尚无稳定注册协议，因此不开放这些扩展。能力目录是开发约定，不是安全沙箱；平台不扫描 Mod 源码，也不能保证阻止越权代码。只启用可信 Mod。

## 公共 API

所有注册 ID 必须为作者命名空间，例如 `alice.emp-clock`；3–96 个小写字母、数字、点、横线或下划线，首字符为字母或数字。注册函数返回注销函数，可重复调用。参数不合法、重复 ID 或超出容量会抛错。

| 方法/属性 | 参数与行为 |
|---|---|
| `apiVersion` | 当前为字符串 `1.0.0`；破坏性变更升级主版本，不重新解释旧能力 ID。 |
| `gameVersion` | 当前游戏版本字符串。 |
| `getSnapshot()` | 初始化前为 `null`；初始化后为最近的只读快照，通常约每 100ms 更新，状态变化立即更新。 |
| `registerPlayerMarker(id, {color, radius})` | `color` 为六位十六进制色值（如 `#55ffff`），`radius` 为 18–60 的有限数值，单位为 CSS 像素。只在战斗中跟随飞机绘制，不改变碰撞。 |
| `registerReadout(id, render)` | `render(snapshot)` 同步返回文字字符串，空字符串隐藏。本地战斗中调用；最多显示三个非空仪表，每项截取前 48 个 UTF-16 单元，固定绘制于左下方，不能返回 HTML。不要在回调内注册、发请求或执行耗时任务。 |
| `on(event, id, callback)` | 监听 `ready`、`state` 或 `snapshot`，参数均为只读快照；返回取消监听函数。初始化后订阅 `ready` 会立即调用一次。 |
| `assertMultiplayerAllowed()` | 未来任何联机入口必须先调用。官方 Loader 存在已启用 Mod，或本地仍有任一注册时抛错，提示关闭全部 Mod 后重新启动；否则返回 `true`。这不创建联机连接。 |

快照字段：`state`（start/playing/paused/upgrade/decision/gameover/victory）、`mode`（endless/campaign/roguelike/challenge/bossrush）、`difficulty`、`score`、`wave`、`level`、`width`、`height`、`empCooldown`（剩余秒）。`player` 为 `null` 或 `{x,y,hp,lives,shield,ship,weaponId}`；`boss` 为 `null` 或 `{kind,hp,maxHp,phase}`。坐标为画布 CSS 像素。快照和内嵌对象已冻结，是复制数据，不是可写战斗对象。部分主菜单字段保留上一局数值，判断时应先看 `state`。

事件顺序：初次启动依次派发 `ready`、`state`、`snapshot`；随后状态发生变化时先派发 `state`，再派发 `snapshot`。仅游戏派发事件，没有公共 emit 接口。回调抛错时注销对应回调并输出控制台警告，不中断游戏循环。异常处理不能阻止恶意无限循环。

## 启动顺序与加载阶段

游戏依次载入 core、logic、bosses、entities、audio、render、input、hangar，建立 `NeonStrikeMods` API，再定义尚未执行的游戏启动函数。VibeHub 托管版本等待官方 Loader 及 `beforeStart`，然后初始化 DOM、输入、渲染器、机库和主循环，调用 `markGameReady()`，最后等待 `afterStart`。`ready` 表示主菜单可用，不表示玩家已经开始一局。

- `before-start`：注册初始光环、只依赖快照的仪表或基础工具。此时快照可能为 null；回调应在调用时再读取状态。
- `after-start`：注册仪表、订阅状态或统计事件；`ready` 会立即回放当前快照。两类注册均支持两个阶段，不允许依赖私有 DOM。
- 启动前 Mod **不能依赖启动后 Mod**；启动后 Mod 可依赖任一阶段。必要依赖使用平台返回的准确 Mod ID，禁止循环、自依赖。
- 启停 Mod 在下一次启动生效，不热重载。依赖先于调用者，其他同阶段 Mod 不应假定彼此先后。
- 托管版本 Loader 网络失败会显示错误并停止启动，不静默跳过 Mod。普通本地、GitHub Pages 与离线壳不要求工坊网络可用；没有 Loader 时直接启动原版。

## 最小可运行 Mod

独立目录包含下面两个 UTF-8 文件，使用官方 Mod 发布流程。它会增加一个紫色装饰圈和 EMP 文字仪表，不需要图片或远程资源。

`vibehub.mod.json`：

```json
{
  "title": "霓虹导航仪",
  "summary": "装饰光环与 EMP 倒计时",
  "description": "仅改变本地显示，不修改游戏数值。",
  "version": "1.0.0",
  "releaseNotes": "首次发布",
  "entry": "main.js",
  "entryType": "classic",
  "styles": [],
  "loadPhase": "before-start",
  "dependencyIds": [],
  "capabilities": ["visual.player-marker", "hud.readout"]
}
```

`main.js`：

```js
(() => {
  const api = window.NeonStrikeMods;
  if (!api || api.apiVersion.split('.')[0] !== '1') throw new Error('需要 NeonStrikeMods v1');
  api.registerPlayerMarker('example.navigator-ring', { color: '#cc88ff', radius: 28 });
  api.registerReadout('example.emp-clock', s => s ? 'EMP ' + s.empCooldown.toFixed(1) + 's' : '');
})();
```

## 基础依赖与冲突

`NeonStrikeMods` 是游戏自带前置 API，不需要作为平台 Mod 依赖。公共基础 Mod 可以封装只读快照格式化等函数，发布独立的带版本全局命名空间（例如 `window.AliceNeonToolsV1`），并在其开发说明写明接口；不能覆写 `NeonStrikeMods` 或其他 Mod 的命名空间。下游须显式声明该基础 Mod 的平台 ID，并遵守上述阶段限制。游戏不提供任意代码插件管理器，也不承诺第三方基础库兼容性。

光环、仪表、事件订阅各允许最多 32 个注册，分别检查唯一 ID；事件订阅 ID 在全部事件之间也须唯一。重复注册抛错，不覆盖既有项；注销后才可复用。光环按注册顺序叠加；仪表按注册顺序只显示前三个非空项。作者应少量注册，必要时合并文字；该上限不代表平台限制启用 Mod 数量。返回的注销函数只注销原注册，不会误删后来复用同 ID 的新项。

## 存档、联网与禁止能力

- Mod API 不开放持久存档。统计仅在当前页面内存保存，刷新归零，不读写原版 localStorage、高分或配置。原版高分规则保持不变；显示类 Mod 仍可能改变体验，不能据此声称公平竞技。
- 联机策略固定为 **mods-disabled**：未来进入联机前必须检查全部已启用 Mod，任何一个启用都拒绝进入，包括标为 `local` 的显示 Mod。当前无联机功能，不能把这个检查描述成已有联机系统或防作弊系统。
- 禁止访问账号凭据、Token、Cookie、管理接口或其他秘密；禁止自建后端、外传玩家数据、修改排行榜、付费和其他玩家数据。
- 禁止覆盖内部函数、访问 `DFJ` / `__DFJ_PROBE` 等私有或测试接口、修改私有 DOM、劫持键鼠触摸输入、修改伤害碰撞或替换游戏主循环。
- 不注入远程脚本、样式或音频。资源须随 Mod 包提交并使用官方资源解析接口；本版公共 API 不接受外部资源或音频。
- 不使用无限循环、同步阻塞任务或每帧网络请求。注册回调应快速、无副作用；作者约定不能隔离恶意 JavaScript。
