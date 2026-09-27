'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const dir=path.resolve('test/reports/longrun'),names=['baseline','loadouts','branches','endurance','focused'];
const data=Object.fromEntries(names.map(n=>[n,JSON.parse(fs.readFileSync(path.join(dir,n+'.json'),'utf8'))]));
for(const d of Object.values(data)){assert(d.complete);assert.equal(d.results.length,d.planned);assert.deepEqual(d.hashes,data.baseline.hashes);}
const all=Object.values(data).flatMap(d=>d.results),B=data.baseline.results;
const avg=a=>a.reduce((s,x)=>s+x,0)/a.length,median=a=>{a=[...a].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const count=(a,outcome)=>a.filter(x=>x.outcome===outcome).length;
const dl={easy:'简单',normal:'中等',hard:'困难'},ml={endless:'无限',campaign:'闯关',roguelike:'肉鸽',challenge:'180 秒挑战',bossrush:'Boss 连战'};
const lines=[];const put=s=>lines.push(s);
put('# 长期难度平衡测试报告\n');
put('测试日期：2026-09-27。对象为当前未发布工作区，包含新玩法与 Boss 二阶段连续移动修复；本轮只增加测试和报告，没有调整游戏数值。\n');
put(`完成 **${all.length} 局模拟**，累计 **${(all.reduce((s,x)=>s+x.seconds,0)/3600).toFixed(2)} 小时游戏时间**，单局最长 60 分钟，最高到第 ${Math.max(...all.map(x=>x.wave))} 波。结论：**尚不能判定整体平衡通过**。原有难度大体分层，但短挑战、Boss 入场与长局成长存在明确问题。\n`);
put('## 方法与解释边界\n');
put('- 使用实际生产战斗、碰撞、掉落、Boss、EMP、强化与路线代码，固定随机种子，从正常开局开始；不无敌、不赠送升级、不跳波。30 FPS 固定步长。渲染、音频和 DOM 使用替身，不是浏览器性能或真人手感测试。\n- 基础组 240 局：五模式 × 三难度 × 两屏幕 × 两策略 × 四种子。20 分钟观察窗，闯关 30 分钟，挑战按 180 秒结束。\n- 搭配组 162 局：九种机型/武器 × 无限/肉鸽/连战 × 三难度 × 两种子，390 像素宽。\n- 分支组 162 局：六条进化 × 三路线 × 三难度 × 三种子，390 像素宽；只在实际获得选择时选取指定分支。\n- 耐久组 48 局：无限与肉鸽，三难度、两屏幕、两种子；肉鸽额外比较优先伤害+精英、优先续航+补给、优先射速+补给，单局 60 分钟。构筑与路线同时变化，不能将其差异单独归因于其中一个。\n- 针对性复核 42 局：宽屏幽影追踪/前移/守落点策略，以及窄屏三武器连战入场和攻击次数。\n- 屏幕为 390×844 / 900×760；HUD 底部模拟为普通 100、Boss 155 像素。自动玩家固定纵向位置（复核前移策略除外）；反应策略每 166.7ms 选择横向安全区、追踪敌人与近处掉落，横移指令限速，自动释放 EMP。另一策略是固定正弦横扫。均不等价于真人。\n- **到时存活 ≠ 通关**，尤其可能只是对 Boss 打不出伤害。相同初始种子在不同策略下会因随机数消耗不同而分叉；部分短连战样本完全相同，不能当作独立真人样本估计胜率。每个搭配或分支仅 2–3 种子，适合发现明显缺陷，不足以精确排名。\n');
put('## 基础组结果\n每格难度 16 局；时间是死亡/胜利/观察结束的中位时长。闯关原始内部波次 44 代表已越过第十关，报告不解释为第 44 个关卡。\n');
put('| 模式 | 难度 | 死亡 | 通关 | 到时存活 | 中位时长（秒） |\n|---|---|---:|---:|---:|---:|');
for(const mode of Object.keys(ml))for(const d of Object.keys(dl)){const a=B.filter(x=>x.mode===mode&&x.difficulty===d);put(`| ${ml[mode]} | ${dl[d]} | ${count(a,'dead')}/16 | ${count(a,'victory')}/16 | ${count(a,'censored')}/16 | ${median(a.map(x=>x.seconds)).toFixed(1)} |`);}
put('\n### 按操作策略分层\n不能把会躲弹与固定横扫的结果混成“玩家胜率”。每行 8 局，含两屏幕。\n');
put('| 模式 | 难度 | 策略 | 死亡 / 通关 / 到时 | 中位秒数 |\n|---|---|---|---|---:|');
for(const mode of Object.keys(ml))for(const d of Object.keys(dl))for(const pilot of ['sweep','reactive']){const a=B.filter(x=>x.mode===mode&&x.difficulty===d&&x.pilot===pilot);put(`| ${ml[mode]} | ${dl[d]} | ${pilot==='sweep'?'横扫':'躲弹追踪'} | ${count(a,'dead')} / ${count(a,'victory')} / ${count(a,'censored')} | ${median(a.map(x=>x.seconds)).toFixed(1)} |`);}
put('\n## 主要发现与优先级\n');
put('### P1：Boss 连战短得不符合五场战斗的定位\n窄屏游隼+脉冲，追踪策略五场连战中位用时：简单约 23 秒、中等约 28 秒、困难约 44 秒，包含入场。复核三种武器共 18 局、90 次 Boss 战，其中 **12 次在入场完成前被击杀，28 次未发出第一轮攻击就被击杀**。这不是纯粹的自动躲弹能力问题：入场即可受伤，固定三级主炮与基础伤害 2 让部分 Boss 没机会展示机制。\n建议先处理入场伤害保护/短暂减伤，并让首轮预警有展示机会，再校准连战专用 HP 或起始火力；不建议把所有模式 Boss HP 一起加厚。\n');
put('### P1：肉鸽后期成长超出敌人增长\n60 分钟困难窄屏精英路线样本到 101–102 波，基础伤害 16–18、射速倍率约 11.97，后期多场 Boss 从生成到死亡约 0.8–1.5 秒。普通敌人 HP、弹速和数量存在上限，玩家射速乘算、伤害和多项续航强化仍可反复获取，导致中后期反而失去压力。简单/中等耐久肉鸽样本全部存活到 60 分钟，也不代表每个人都能做到。\n建议对重复射速与续航引入递减收益/软上限，对精英奖励预算做分段控制，并靠编队和机制提高后期压力，保留弹速可读性上限。先修成长曲线，再考虑增加敌人基础血量。\n');
put('### P1：180 秒挑战的难度区分不足\n基础组简单、中等、困难分别 16/16 通关，连固定横扫策略也全部通关。该结果只说明当前两种自动策略下门槛低，不能称真人 100% 通关；但固定高火力开局配普通早期刷怪，确实缺少后半程挑战。\n建议做专用三段节奏（前 60 秒熟悉、60–120 秒编队压力、最后 60 秒精英/终局目标），独立调难度，保留固定装备的可比较性。\n');
put('### P2：宽屏幽影存在“追着打反而长期打不中”\n困难宽屏连战追踪策略 4/4 卡在第 15 波幽影直到 20 分钟；闯关 3/4 追踪样本在第三关 Boss 拖到 30 分钟。Boss 仍在正常攻击，不是状态机停转。针对性复核，守住幽影 25% 横向落点时，连战四个样本均在约 12.8 秒击破幽影，整体 57–59 秒通关。单纯前移也可在入场期击杀，但那是在利用入场弱点，不能视为攻击窗口已合理。\n建议为瞬移设置更明确的落点提示和稳定停驻/恢复窗口，并按屏幕宽度约束位移距离；避免直接把这个现象归为 Boss 无敌或必败。\n');
put('### P2：精英路线长期收益偏大，但困难早期仍有风险\n');
put('| 难度 | 路线 | 到时存活 / 18 | 平均到达波次 | 平均基础伤害 |\n|---|---|---:|---:|---:|');
for(const d of Object.keys(dl))for(const route of ['repair','supply','elite']){const a=data.branches.results.filter(x=>x.difficulty===d&&x.route===route);put(`| ${dl[d]} | ${{repair:'维修',supply:'补给',elite:'精英'}[route]} | ${count(a,'censored')}/18 | ${avg(a.map(x=>x.wave)).toFixed(1)} | ${avg(a.map(x=>x.damage)).toFixed(2)} |`);}
put('\n简单和中等全部路线都活到 20 分钟，精英平均伤害更高；困难精英 13/18 存活，低于补给 15/18，说明额外风险并非完全无效。不能仅凭本样本认定精英在所有阶段都是最优选择；问题在于长期累积和敌人封顶的组合。\n');
put('## 九种搭配与六条进化\n搭配组和分支组均为窄屏躲弹追踪策略，表格汇总三档难度。生存到时与胜利分列；不能跨模式合并计算胜率。\n');
put('| 模式 | 机型 | 武器 | 局数 | 死亡 / 通关 / 到时 | 平均秒数 |\n|---|---|---|---:|---|---:|');
for(const mode of ['endless','roguelike','bossrush'])for(const ship of ['falcon','bulwark','wisp'])for(const weapon of ['pulse','heavy','fan']){const a=data.loadouts.results.filter(x=>x.mode===mode&&x.ship===ship&&x.weapon===weapon);put(`| ${ml[mode]} | ${ship} | ${weapon} | ${a.length} | ${count(a,'dead')} / ${count(a,'victory')} / ${count(a,'censored')} | ${avg(a.map(x=>x.seconds)).toFixed(1)} |`);}
put('\n| 进化 | 难度 | 实际进化局数 / 测试局数 | 到时存活 | 平均波次 |\n|---|---|---:|---:|---:|');
for(const evolution of ['pierce','chain','charge','blast','focus','wide'])for(const d of Object.keys(dl)){const a=data.branches.results.filter(x=>x.evolution===evolution&&x.difficulty===d);put(`| ${evolution} | ${dl[d]} | ${a.filter(x=>x.evolved===evolution).length}/${a.length} | ${count(a,'censored')}/${a.length} | ${avg(a.map(x=>x.wave)).toFixed(1)} |`);}
put('\n上述样本不足以断言九种组合或六分支完全等强；不同敌人密度、弹道集中度和 Boss 窗口会改变有效伤害。优先修复模式层面的明显偏差，再进行更大种子的武器排名测试。\n');
put('## 60 分钟耐久明细\n“到时”只是右删失样本。第 15 波附近停留的困难宽屏样本不可解释为稳定生存构筑。\n');
put('| 模式 | 难度 | 宽度 | 策略 | 种子 | 结局 | 秒数 | 波次 | 基础伤害 | 射速倍率 | HP 上限 |\n|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|');
for(const x of data.endurance.results)put(`| ${ml[x.mode]} | ${dl[x.difficulty]} | ${x.width} | ${x.build}/${x.route} | ${x.seed} | ${x.outcome==='dead'?'死亡':'到时'} | ${x.seconds.toFixed(0)} | ${x.wave} | ${x.damage} | ${x.fireRate.toFixed(2)} | ${x.hpMax} |`);
put('\n## 复现与原始数据\n');
put('```powershell\nnode test/balance.longrun.js baseline\nnode test/balance.longrun.js loadouts\nnode test/balance.longrun.js branches\nnode test/balance.longrun.js endurance\nnode test/balance.longrun.js focused\nnode test/balance.longrun.report.js\n```\n');
put('五组 JSON 位于 `test/reports/longrun/`，包含每局参数、分钟采样、Boss 时长、战斗统计与生产源码 SHA-256。所有组的生产源码哈希已校验一致。早期批次 Boss 的 hp 字段采集于死亡前最后一帧，不能用正数判断其未死，应看 killed；focused 批次记录最终 HP、是否完成入场与攻击次数。\n');
put('观察窗以每局 limit 字段为准（耐久 3600 秒、宽屏复核 600 秒），日志 wallSeconds 为实际机器运行耗时，154 小时是累计加速模拟的游戏时间。这里只验证逻辑和统计，不包含音视频渲染开销、移动设备发热、内存泄漏或真实网络/安装包测试。\n');
put('建议调整顺序：**Boss 入场与连战预算 → 肉鸽重复强化收益 → 挑战专用波次 → 幽影宽屏窗口 → 更大样本搭配复测**。调整后必须复跑同组，并安排手机与鼠标各至少一轮真人长局，才能对可读性、操作负担与目标难度做最终验收。\n');
const report=path.resolve('docs/reports/longrun-balance.md');fs.writeFileSync(report,lines.join('\n'));
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify({runs:all.length,simulatedHours:all.reduce((s,x)=>s+x.seconds,0)/3600,maxWave:Math.max(...all.map(x=>x.wave)),hashes:data.baseline.hashes},null,2));
console.log(report,all.length,'runs, matching source hashes');
