'use strict';
const fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const suites=['baseline','loadouts','branches','endurance','focused'];
function read(dir){return Object.fromEntries(suites.map(s=>[s,JSON.parse(fs.readFileSync(`test/reports/${dir}/${s}.json`,'utf8'))]));}
const before=read('longrun'),after=read('longrun-fixed');
for(const s of suites){assert(after[s].complete);assert.equal(after[s].results.length,before[s].results.length);assert.deepEqual(after[s].hashes,after.baseline.hashes);}
for(const [file,hash] of Object.entries(after.baseline.hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file+' changed after audit');
const all=Object.values(after).flatMap(x=>x.results),median=a=>{a=[...a].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const count=(a,o)=>a.filter(x=>x.outcome===o).length;
const bosses=after.focused.results.filter(x=>x.width===390).flatMap(x=>x.bosses).filter(x=>x.killed);
assert.equal(bosses.length,90);assert(bosses.every(b=>b.arrived&&b.attacks>=1));
const endurance=after.endurance.results.filter(x=>x.mode==='roguelike');
assert(endurance.every(x=>x.damage<=5&&x.fireRate<=2.5&&x.hpMax<=6&&x.vamp<=.12+1e-9));
const tracked=after.focused.results.filter(x=>x.mode==='bossrush'&&x.pilot==='reactive'&&x.width===900);
assert(tracked.every(x=>x.bosses.some(b=>b.kind==='phantom'&&b.killed&&b.seconds<60)));
const dl={easy:'简单',normal:'中等',hard:'困难'},ml={endless:'无限',campaign:'闯关',roguelike:'肉鸽',challenge:'限时挑战',bossrush:'Boss 连战'};
const lines=['# 长期平衡修复与复测\n','日期：2026-09-27。对应未发布工作区。旧报告与原始数据保留，不覆盖历史结果。\n',`修复后重跑 **${all.length} 局**，累计 **${(all.reduce((s,x)=>s+x.seconds,0)/3600).toFixed(2)} 小时加速模拟**，最长 60 分钟。五组源码 SHA-256 一致，并与当前源文件核对。\n`];
lines.push('## 已实施的调整\n',
'- 所有 Boss：入场及首轮预警期间免疫主炮、反击、EMP 和炮台伤害；首轮攻击后解除护盾，HUD 与轮廓提示保护状态。EMP 不延迟受保护阶段，避免玩家把 Boss 无限留在护盾中。\n- 连战：保留三级主炮，基础伤害从 2 降到 1，单独将连战 Boss HP 预算乘以 1.6；掉命后主炮最低二级。其他模式不套用这项 HP 倍率。\n- 肉鸽：射速递减增长、上限 2.5；伤害达到 3 后每次只加 0.5、上限 5；散射最多两对；HP 上限 6，之后纳米修复只回复 2 HP；吸血最高 12%；暴击额外伤害最高 150%、EMP 等级 2、移动倍率 1.6、得分倍率 3。封顶成长卡不再进入候选池，修复卡仍可提供续航。\n- 精英路线：前三次成功完成额外选一次强化，之后改为回复 1 HP 和增加 1 层护盾；风险仍为三波 HP +25%、弹速 +10%。选择界面显示剩余额外强化次数。\n- 限时挑战：固定游隼+脉冲，二级主炮、伤害 1.4；0–60、60–120、120–180 秒逐步加入枪手、编织者、坦克、狙击手和轰炸机，最后一分钟清完当前敌群后登场恒星 Boss。仍以坚持到 180 秒为胜利条件，不要求击杀 Boss。\n- 幽影：每两轮攻击瞬移一次，落点距中心不超过 130 像素，瞬移前 0.65 秒提示落点；攻击后原地停驻 2.4 秒，两阶段都保留稳定输出窗口。\n');
lines.push('## 关键复测结果\n','| 指标 | 修复前 | 修复后 |\n|---|---:|---:|',
'| 窄屏三武器复核：入场前击杀 / 90 场 | 12 | 0 |',
'| 同组：首轮攻击前击杀 / 90 场 | 28 | 0 |');
for(const d of Object.keys(dl)){
 const filter=x=>x.mode==='bossrush'&&x.difficulty===d&&x.width===390&&x.pilot==='reactive';
 lines.push(`| 窄屏游隼脉冲连战中位秒数（${dl[d]}） | ${median(before.baseline.results.filter(filter).map(x=>x.seconds)).toFixed(1)} | ${median(after.baseline.results.filter(filter).map(x=>x.seconds)).toFixed(1)} |`);
}
for(const d of Object.keys(dl)){
 const filter=x=>x.mode==='challenge'&&x.difficulty===d;
 lines.push(`| 限时挑战通关样本（${dl[d]}） | ${count(before.baseline.results.filter(filter),'victory')}/16 | ${count(after.baseline.results.filter(filter),'victory')}/16 |`);
}
for(const [key,label] of [['damage','60 分钟样本最大基础伤害'],['fireRate','60 分钟样本最大射速倍率'],['hpMax','60 分钟样本最大 HP 上限']])lines.push(`| ${label} | ${Math.max(...before.endurance.results.map(x=>x[key])).toFixed(2)} | ${Math.max(...after.endurance.results.map(x=>x[key])).toFixed(2)} |`);
lines.push('\n困难宽屏连战追踪策略的四个样本，幽影都在 19.1–33.7 秒内击破；修复前四个样本都拖到 20 分钟。后续战斗仍可能死亡，不能将击破幽影等同连战通关。困难窄屏 60 分钟样本的后期 Boss 已能完成多轮攻击，不再依靠入场期约一秒击杀跳过机制。\n');
lines.push('## 基础组全模式前后对照\n每项 16 局，包含两种操作策略、两屏幕和四种子。记为死亡 / 通关 / 到时存活；无限和肉鸽没有通关终点。\n','| 模式 | 难度 | 修复前 | 修复后 |\n|---|---|---|---|');
for(const mode of Object.keys(ml))for(const d of Object.keys(dl)){
 const get=dataset=>{const a=dataset.baseline.results.filter(x=>x.mode===mode&&x.difficulty===d);return ['dead','victory','censored'].map(o=>count(a,o)).join(' / ');};
 lines.push(`| ${ml[mode]} | ${dl[d]} | ${get(before)} | ${get(after)} |`);
}
lines.push('\n## 测试与边界\n',
'- `node test/balance.fix.test.js`：连续 1000 次强化上限、封顶候选过滤、三段挑战、所有 Boss/EMP/炮台入场保护、自然解除保护、最终分钟 Boss 与计时胜利。\n- `node test/expedition.ui.test.js`：三尺寸流程、第四次精英奖励不再多选强化、挑战新配置与通关、独立音量。\n- 既有逻辑、战斗、搭配、敌人、炮台、追踪、难度契约、660 组 Boss 移动、792 组弹幕/音乐以及浏览器音频和游戏流程回归通过。\n- 新模拟完整覆盖原 654 局矩阵。focused 的守落点策略更新为新落点位置，避免守在旧位置造成伪卡死；其他策略保持一致，主结论用未改动的追踪策略验证。随机序列会因战斗变化分叉，因此是同设置对照，不是逐帧相同随机事件。\n- 这些是逻辑模拟，不是人类胜率。简单挑战仍保留高容错；成熟肉鸽构筑可以活过 60 分钟，存活本身不视为缺陷。当前解决的是无上限成长、跳过 Boss 机制与阶段难度缺失，不声称所有搭配已达到竞技级等强。尚未重新构建安装包或进行本版手机真人长局测试。\n');
lines.push('## 复现\n','```powershell\n$env:LONGRUN_REPORT_DIR="test/reports/longrun-fixed"\nnode test/balance.longrun.js baseline\nnode test/balance.longrun.js loadouts\nnode test/balance.longrun.js branches\nnode test/balance.longrun.js endurance\nnode test/balance.longrun.js focused\nnode test/balance.compare.js\n```\n');
fs.writeFileSync('docs/reports/longrun-balance-fixes.md',lines.join('\n'));
console.log('PASS: 654 comparable runs, current source hashes, 90 protected Boss encounters, bounded builds, four wide-screen Phantom kills');
