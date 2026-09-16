/* NEON STRIKE - logic 单元测试(零依赖)
 * 运行: node test/logic.test.js
 */
'use strict';
const path = require('path');
const Logic = require(path.join(__dirname, '..', 'js', 'logic.js'));

let passed = 0;
let failed = 0;
const failures = [];

function t(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (e) { failed++; failures.push(name + ' :: ' + e.message); console.log('FAIL  ' + name + ' :: ' + e.message); }
}
function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy, got ' + v); }
function near(a, b, eps, msg) { if (Math.abs(a - b) > (eps || 1e-9)) throw new Error((msg || '') + ' expected ~' + b + ' got ' + a); }

/* ---------- 碰撞 ---------- */
t('circleHit: 相交为真', () => { ok(Logic.circleHit(0, 0, 10, 15, 0, 10)); });
t('circleHit: 分离为假', () => { ok(!Logic.circleHit(0, 0, 5, 20, 0, 5)); });
t('circleHit: 相切不算命中', () => { ok(!Logic.circleHit(0, 0, 10, 20, 0, 10)); });
t('circleHit: 斜向距离判定', () => { ok(Logic.circleHit(0, 0, 10, 7, 7, 5)); });

/* ---------- 难度曲线 ---------- */
t('difficulty: 第 1 波基准值', () => { const d = Logic.difficulty(1); near(d.spawnInterval, 950); near(d.hpMul, 1); near(d.speedMul, 1); });
t('difficulty: 波次越高越难(单调)', () => {
  const a = Logic.difficulty(3), b = Logic.difficulty(10);
  ok(b.spawnInterval < a.spawnInterval, 'spawnInterval 应递减');
  ok(b.hpMul > a.hpMul, 'hpMul 应递增');
  ok(b.speedMul > a.speedMul, 'speedMul 应递增');
});
t('difficulty: 各项有上限', () => { const c = Logic.difficulty(999); near(c.hpMul, 4); near(c.speedMul, 2.2); near(c.bulletSpeedMul, 2); ok(c.spawnInterval >= 300); });
t('difficulty: 非法波次回退第 1 波', () => { near(Logic.difficulty(0).hpMul, 1); near(Logic.difficulty(-5).spawnInterval, 950); });

/* ---------- 波次表 ---------- */
t('waveConfig: 普通波无 Boss', () => { ok(!Logic.waveConfig(1).boss); ok(!Logic.waveConfig(4).boss); });
t('waveConfig: 每 5 波 Boss', () => { ok(Logic.waveConfig(5).boss); ok(Logic.waveConfig(10).boss); ok(Logic.waveConfig(5).bossHp > 0); });
t('waveConfig: 敌机类型随波次解锁', () => {
  const c1 = Logic.waveConfig(1);
  near(c1.counts.sine, 0); near(c1.counts.gunner, 0); ok(c1.counts.grunt > 0);
  const c3 = Logic.waveConfig(3);
  ok(c3.counts.sine > 0 && c3.counts.gunner > 0, '第 3 波应同时有 sine 与 gunner');
});
t('waveConfig: 数量有上限', () => {
  const c = Logic.waveConfig(500);
  ok(c.counts.grunt <= 30 && c.counts.sine <= 18 && c.counts.gunner <= 8, JSON.stringify(c.counts));
});

/* ---------- 难度档位 ---------- */
t('difficulty: 单参数默认 normal 且与旧行为一致', () => {
  const d = Logic.difficulty(1);
  near(d.hpMul, 1); near(d.speedMul, 1); near(d.bulletSpeedMul, 1); near(d.spawnInterval, 950);
});
t('difficultyPreset: 合法 id 返回对应档位', () => {
  near(Logic.difficultyPreset('easy').lives, 5);
  near(Logic.difficultyPreset('normal').lives, 3);
  near(Logic.difficultyPreset('hard').lives, 2);
});
t('difficultyPreset: 非法 id 回退 normal', () => {
  near(Logic.difficultyPreset('nightmare').lives, 3);
});
t('difficulty: easy 更慢更脆、hard 更快更肉', () => {
  const base = Logic.difficulty(5, 'normal');
  const easy = Logic.difficulty(5, 'easy');
  const hard = Logic.difficulty(5, 'hard');
  ok(easy.hpMul < base.hpMul, 'easy hpMul 应更低');
  ok(easy.spawnInterval > base.spawnInterval, 'easy 出怪应更慢');
  ok(hard.hpMul > base.hpMul, 'hard hpMul 应更高');
  ok(hard.spawnInterval < base.spawnInterval, 'hard 出怪应更快');
  ok(hard.speedMul > base.speedMul, 'hard 应更快');
});
t('difficulty: hard 得分倍率更高', () => {
  ok(Logic.difficulty(1, 'hard').scoreMul > 1);
  near(Logic.difficulty(1, 'normal').scoreMul, 1);
});
t('difficulty: aggroMul 攻击意愿随难度提升', () => {
  const easy = Logic.difficulty(1, 'easy');
  const normal = Logic.difficulty(1, 'normal');
  const hard = Logic.difficulty(1, 'hard');
  ok(easy.aggroMul < normal.aggroMul, 'easy 攻击意愿应低于 normal');
  ok(normal.aggroMul < hard.aggroMul, 'normal 攻击意愿应低于 hard');
  ok(hard.aggroMul === 1, 'hard 应为基准 1');
});
t('difficulty: v1.2.1 dropRate 按难度递减', () => {
  const easy = Logic.difficulty(1, 'easy');
  const normal = Logic.difficulty(1, 'normal');
  const hard = Logic.difficulty(1, 'hard');
  ok(easy.dropRate > normal.dropRate, 'easy 掉率应高于 normal');
  ok(normal.dropRate > hard.dropRate, 'normal 掉率应高于 hard');
  near(easy.dropRate, 0.16); near(normal.dropRate, 0.12); near(hard.dropRate, 0.10);
});

/* ---------- 新增敌机解锁 ---------- */
t('waveConfig: 新敌机随波次解锁', () => {
  const c1 = Logic.waveConfig(1);
  near(c1.counts.tank, 0); near(c1.counts.diver, 0); near(c1.counts.splitter, 0); near(c1.counts.sniper, 0);
  const c4 = Logic.waveConfig(4);
  ok(c4.counts.tank > 0, '第 4 波应解锁 tank');
  ok(c4.counts.diver > 0, '第 3 波应解锁 diver');
  const c6 = Logic.waveConfig(6);
  ok(c6.counts.sniper > 0, '第 6 波应解锁 sniper');
});
t('waveConfig: 新敌机数量有上限', () => {
  const c = Logic.waveConfig(500);
  ok(c.counts.tank <= 5 && c.counts.diver <= 10 && c.counts.splitter <= 4 && c.counts.sniper <= 4, JSON.stringify(c.counts));
});
t('campaign: 第 1 关不含新敌机', () => {
  const c = Logic.campaignConfig(1);
  ok(c.waves[0].counts.tank === 0 && c.waves[0].counts.diver === 0 && c.waves[0].counts.splitter === 0 && c.waves[0].counts.sniper === 0);
});

/* ---------- 连击与计分 ---------- */
t('combo: 倍率 1 起步、x2 封顶', () => { near(Logic.comboMultiplier(0), 1); near(Logic.comboMultiplier(5), 1.5); near(Logic.comboMultiplier(50), 2); });
t('combo: 窗口内连击累加', () => { const r = Logic.nextCombo(3, 5000, 4000); near(r.combo, 4); });
t('combo: 超窗重置为 1', () => { const r = Logic.nextCombo(3, 8000, 4000); near(r.combo, 1); });
t('combo: 首杀为 1', () => { const r = Logic.nextCombo(0, 1000, -1); near(r.combo, 1); });
t('score: 基础分 x 倍率', () => { near(Logic.scoreKill(100, 0), 100); near(Logic.scoreKill(100, 5), 150); near(Logic.scoreKill(100, 50), 200); });

/* ---------- 道具 ---------- */
t('powerup: W 升火力且 3 级封顶', () => {
  near(Logic.applyPowerup({ weapon: 1, shield: 0, hp: 3 }, 'W').weapon, 2);
  near(Logic.applyPowerup({ weapon: 3, shield: 0, hp: 3 }, 'W').weapon, 3);
});
t('powerup: S 护盾回满', () => { near(Logic.applyPowerup({ weapon: 1, shield: 1, hp: 3 }, 'S').shield, 3); });
t('powerup: H 回血且封顶', () => {
  near(Logic.applyPowerup({ weapon: 1, shield: 0, hp: 2 }, 'H').hp, 3);
  near(Logic.applyPowerup({ weapon: 1, shield: 0, hp: 3 }, 'H').hp, 3);
});
t('powerup: 未知类型原样返回', () => {
  const o = Logic.applyPowerup({ weapon: 2, shield: 1, hp: 2 }, 'X');
  near(o.weapon, 2); near(o.shield, 1); near(o.hp, 2);
});
t('powerup: 非法输入不抛异常', () => { near(Logic.applyPowerup(null, 'W').weapon, 2); });

/* ---------- Boss 阶段 ---------- */
t('boss: 血量>50% 为一阶段', () => { near(Logic.bossPhase(0.8), 1); near(Logic.bossPhase(0.51), 1); });
t('boss: 血量<=50% 为二阶段', () => { near(Logic.bossPhase(0.5), 2); near(Logic.bossPhase(0.1), 2); near(Logic.bossPhase(0), 2); });

/* ---------- 种子随机与生成 ---------- */
t('rng: 同种子序列可复现', () => {
  const a = Logic.mulberry32(42), b = Logic.mulberry32(42);
  for (let i = 0; i < 10; i++) near(a(), b(), 0, '第 ' + i + ' 个样本不一致');
});
t('rng: 产出落在 [0,1)', () => {
  const r = Logic.mulberry32(7);
  for (let i = 0; i < 1000; i++) { const v = r(); ok(v >= 0 && v < 1, '越界值 ' + v); }
});
t('spawnType: 只产出合法类型', () => {
  const r = Logic.mulberry32(1);
  for (let i = 0; i < 200; i++) {
    const ty = Logic.spawnType(r);
    ok(ty === 'grunt' || ty === 'sine' || ty === 'gunner', '非法类型 ' + ty);
  }
});
t('spawnType: 权重 grunt>sine>gunner', () => {
  const r = Logic.mulberry32(9);
  const n = { grunt: 0, sine: 0, gunner: 0 };
  for (let i = 0; i < 3000; i++) n[Logic.spawnType(r)]++;
  ok(n.grunt > n.sine && n.sine > n.gunner, JSON.stringify(n));
});

/* ---------- 闯关模式 ---------- */
t('campaign: 每关波数固定', () => { near(Logic.campaignConfig(1).waves.length, Logic.WAVES_PER_LEVEL); });
t('campaign: 前 3 波普通、末波 Boss', () => {
  const c = Logic.campaignConfig(1);
  ok(!c.waves[0].boss && !c.waves[1].boss && !c.waves[2].boss, '普通波不应有 Boss');
  ok(c.waves[3].boss, '第 4 波应为 Boss');
});
t('campaign: Boss 血量随关卡递增', () => {
  ok(Logic.campaignConfig(5).waves[3].bossHp > Logic.campaignConfig(1).waves[3].bossHp);
});
t('campaign: 非法关卡回退第 1 关', () => { near(Logic.campaignConfig(0).level, 1); near(Logic.campaignConfig(-3).level, 1); });
t('campaign: 普通波必有杂兵', () => {
  const c = Logic.campaignConfig(2);
  for (let i = 0; i < 3; i++) ok(c.waves[i].counts.grunt > 0, '第 ' + (i + 1) + ' 波应有 grunt');
});
t('campaign: 第 1 关无 sine/gunner(难度爬坡)', () => {
  const c = Logic.campaignConfig(1);
  ok(c.waves[0].counts.sine === 0 && c.waves[0].counts.gunner === 0, '第 1 关第 1 波应只有 grunt');
});

/* ---------- 肉鸽模式 ---------- */
t('rogue: rogueState 补齐默认字段', () => {
  const s = Logic.rogueState(null);
  near(s.weapon, 1); near(s.shield, 0); near(s.hp, 3); near(s.hpMax, 3);
  near(s.lives, 3); near(s.fireRate, 1); near(s.damage, 1); near(s.spread, 0);
  near(s.speedMul, 1); near(s.scoreMul, 1);
});
t('rogue: rougeRoll 默认抽 3 个且不重复', () => {
  const r = Logic.rogueRoll(null, 3, Logic.mulberry32(5));
  near(r.length, 3);
  const ids = r.map(p => p.id);
  ok(ids[0] !== ids[1] && ids[1] !== ids[2] && ids[0] !== ids[2], 'ID 应互不相同');
});
t('rogue: rogueRoll 排除已封顶项', () => {
  const s = { weapon: 3, shield: 3, lives: 5 };
  const r = Logic.rogueRoll(s, 30, Logic.mulberry32(5));
  const ids = r.map(p => p.id);
  ok(!ids.includes('power'), 'weapon 满级不应再出 power');
  ok(!ids.includes('shield'), 'shield 满级不应再出 shield');
  ok(!ids.includes('life'), 'lives 满级不应再出 life');
});
t('rogue: rogueApply power 升火力且封顶 3', () => {
  near(Logic.rogueApply({ weapon: 1 }, 'power').weapon, 2);
  near(Logic.rogueApply({ weapon: 3 }, 'power').weapon, 3);
});
t('rogue: rogueApply rapid 射速提升(fireRate 变大)', () => {
  ok(Logic.rogueApply({ fireRate: 1 }, 'rapid').fireRate > 1);
});
t('rogue: rogueApply damage/spread 累加', () => {
  near(Logic.rogueApply({ damage: 1 }, 'damage').damage, 2);
  near(Logic.rogueApply({ spread: 0 }, 'spread').spread, 1);
});
t('rogue: rogueApply shield 封顶 3', () => {
  near(Logic.rogueApply({ shield: 2 }, 'shield').shield, 3);
  near(Logic.rogueApply({ shield: 3 }, 'shield').shield, 3);
});
t('rogue: rogueApply repair 涨上限并回满', () => {
  const s = Logic.rogueApply({ hpMax: 3, hp: 1 }, 'repair');
  near(s.hpMax, 4); near(s.hp, 4);
});
t('rogue: rogueApply speed/score 乘算', () => {
  ok(Logic.rogueApply({ speedMul: 1 }, 'speed').speedMul > 1);
  ok(Logic.rogueApply({ scoreMul: 1 }, 'score').scoreMul > 1);
});
t('rogue: rogueApply life 涨命且封顶 5', () => {
  near(Logic.rogueApply({ lives: 3 }, 'life').lives, 4);
  near(Logic.rogueApply({ lives: 5 }, 'life').lives, 5);
});
t('rogue: rogueApply 不修改入参', () => {
  const inp = { weapon: 1, damage: 1 };
  Logic.rogueApply(inp, 'damage');
  near(inp.damage, 1); near(inp.weapon, 1);
});
t('rogue: rogueApply 未知 id 原样返回', () => {
  near(Logic.rogueApply({ weapon: 1 }, 'nope').weapon, 1);
});


/* ---------- v1.2: 新敌人解锁 ---------- */
t('waveConfig: v1.2 新敌人随波次解锁', () => {
  const c1 = Logic.waveConfig(1);
  near(c1.counts.weaver, 0); near(c1.counts.bomber, 0); near(c1.counts.mirror, 0); near(c1.counts.healer, 0); near(c1.counts.phantom, 0);
  ok(Logic.waveConfig(7).counts.weaver > 0, '第 7 波应解锁 weaver');
  ok(Logic.waveConfig(8).counts.bomber > 0, '第 8 波应解锁 bomber');
  ok(Logic.waveConfig(9).counts.mirror > 0, '第 9 波应解锁 mirror');
  ok(Logic.waveConfig(10).counts.healer > 0, '第 10 波应解锁 healer');
  ok(Logic.waveConfig(12).counts.phantom > 0, '第 12 波应解锁 phantom');
});
t('waveConfig: v1.2 新敌人数量有上限', () => {
  const c = Logic.waveConfig(500);
  ok(c.counts.weaver <= 12 && c.counts.bomber <= 6 && c.counts.mirror <= 5 && c.counts.healer <= 4 && c.counts.phantom <= 4, JSON.stringify(c.counts));
});

/* ---------- v1.2: Boss 图鉴轮换 ---------- */
t('bossOf: 共 11 种 Boss 且轮换', () => {
  ok(Logic.BOSS_ROSTER.length === 11, '应有 11 种 Boss');
  ok(Logic.bossOf(0).id === 'boss');
  ok(Logic.bossOf(10).id === 'omega');
  ok(Logic.bossOf(11).id === 'boss', '第 11 个轮回首');
  ok(Logic.bossOf(12).id === 'hive');
});
t('bossOf: 每种 Boss 有专属数据', () => {
  Logic.BOSS_ROSTER.forEach((b, i) => {
    ok(b.id && b.name && b.hp > 0 && b.score > 0 && b.color, 'Boss ' + i + ' 缺字段');
  });
});

/* ---------- v1.2: 暴击 ---------- */
t('rollCrit: 无暴击等级不触发', () => {
  const r = Logic.rollCrit({ crit: 0 }, () => 0);
  ok(!r.crit && r.mul === 1);
});
t('rollCrit: crit 1 级 10% 概率触发', () => {
  const r = Logic.rollCrit({ crit: 1, critDmg: 0.5 }, () => 0.05);
  ok(r.crit && r.mul === 1.5);
});
t('rollCrit: 超出概率不触发', () => {
  const r = Logic.rollCrit({ crit: 1 }, () => 0.2);
  ok(!r.crit);
});

/* ---------- v1.2: EMP 技能 ---------- */
t('empParams: 范围/伤害随等级提升', () => {
  const a = Logic.empParams(0, 400);
  const b = Logic.empParams(2, 400);
  ok(b.radius > a.radius && b.dmg > a.dmg && b.stun > a.stun);
  near(Logic.EMP_COOLDOWN, 20);
});

/* ---------- v1.2: 肉鸽新强化 ---------- */
t('rogue: v1.2 强化生效', () => {
  ok(Logic.rogueApply({ crit: 0 }, 'crit').crit === 1);
  ok(Logic.rogueApply({ magnet: 0 }, 'magnet').magnet === 1);
  ok(Logic.rogueApply({ reflect: 0 }, 'reflect').reflect === 1);
  ok(Logic.rogueApply({ emp: 0 }, 'emp').emp > 0);
  ok(Logic.rogueApply({}, 'vamp').vamp > 0);
});
t('rogue: 新强化封顶', () => {
  near(Logic.rogueApply({ crit: 3 }, 'crit').crit, 3);
  near(Logic.rogueApply({ magnet: 3 }, 'magnet').magnet, 3);
  near(Logic.rogueApply({ reflect: 2 }, 'reflect').reflect, 2);
});
t('rogue: 新强化出现在可用池', () => {
  const pool = Logic.ROGUELIKE_PERKS.map(p => p.id);
  ok(pool.includes('crit') && pool.includes('magnet') && pool.includes('reflect') && pool.includes('vamp') && pool.includes('emp'));
  ok(Logic.rogueState({}).crit === 0, '默认 crit 0');
  ok(Logic.rogueState({}).magnet === 0, '默认 magnet 0');
});

/* ---------- v1.2: 版本 ---------- */
t('version: v1.2.3', () => { near(Logic.VERSION, '1.2.3'); });

console.log('------------------------------');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('FAILURES:');
  failures.forEach(f => console.log('  - ' + f));
  process.exit(1);
}
