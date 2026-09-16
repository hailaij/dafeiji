/* NEON STRIKE - logic.js : 纯游戏逻辑(无 DOM/canvas 依赖,可在 Node 中单测)
 * UMD 双端导出:Node 走 module.exports,浏览器挂到 DFJ.Logic
 */
(function (root) {
  'use strict';
  var Logic = {};

  Logic.VERSION = '1.2.3';
  Logic.COMBO_WINDOW_MS = 2000;
  Logic.WEAPON_MAX = 3;
  Logic.HP_MAX = 3;
  Logic.SHIELD_MAX = 3;

  /* 确定性随机(便于测试复现) */
  Logic.mulberry32 = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* 圆形碰撞(相切不算命中) */
  Logic.circleHit = function (x1, y1, r1, x2, y2, r2) {
    var dx = x2 - x1, dy = y2 - y1, rr = r1 + r2;
    return dx * dx + dy * dy < rr * rr;
  };

  /* ---- 难度档位:影响血量/速度/弹速/出怪节奏与玩家命数 ---- */
  Logic.DIFFICULTIES = {
    easy:   { id: 'easy',   label: '简单', lives: 5, hpMul: 0.70, speedMul: 0.82, bulletSpeedMul: 0.78, spawnIntervalMul: 1.35, scoreMul: 1.0, aggroMul: 0.40, dropRate: 0.16 },
    normal: { id: 'normal', label: '中等', lives: 3, hpMul: 1.00, speedMul: 1.00, bulletSpeedMul: 1.00, spawnIntervalMul: 1.00, scoreMul: 1.0, aggroMul: 0.45, dropRate: 0.12 },
    hard:   { id: 'hard',   label: '困难', lives: 2, hpMul: 1.45, speedMul: 1.22, bulletSpeedMul: 1.30, spawnIntervalMul: 0.78, scoreMul: 1.3, aggroMul: 1.00, dropRate: 0.10 }
  };

  Logic.difficultyPreset = function (id) {
    return Logic.DIFFICULTIES[id] || Logic.DIFFICULTIES.normal;
  };

  /* 难度曲线:波次越高,生成越密、越肉、越快,均有上限;diffId 叠加难度档位 */
  Logic.difficulty = function (wave, diffId) {
    var w = Math.max(1, Math.floor(wave || 1));
    var p = Logic.difficultyPreset(diffId);
    return {
      spawnInterval: Math.round(Math.max(300, 950 - (w - 1) * 45) * p.spawnIntervalMul),  /* ms/架 */
      hpMul: Math.min(4, 1 + (w - 1) * 0.18) * p.hpMul,
      speedMul: Math.min(2.2, 1 + (w - 1) * 0.07) * p.speedMul,
      bulletSpeedMul: Math.min(2, 1 + (w - 1) * 0.06) * p.bulletSpeedMul,
      scoreMul: p.scoreMul,
      lives: p.lives,
      aggroMul: p.aggroMul,
      dropRate: p.dropRate
    };
  };

  /* 波次表:每 5 波 Boss;敌机类型按波次解锁,数量有上限 */
  Logic.waveConfig = function (wave, diffId) {
    var w = Math.max(1, Math.floor(wave || 1));
    var boss = w % 5 === 0;
    var d = Logic.difficulty(w, diffId);
    return {
      wave: w,
      boss: boss,
      bossHp: boss ? 60 + w * 12 : 0,
      counts: {
        grunt: Math.min(30, 8 + w * 2),
        sine: w >= 2 ? Math.min(18, 4 + w) : 0,
        gunner: w >= 3 ? Math.min(8, 1 + Math.floor(w / 2)) : 0,
        tank: w >= 4 ? Math.min(5, 1 + Math.floor(w / 4)) : 0,
        diver: w >= 3 ? Math.min(10, 2 + Math.floor(w / 2)) : 0,
        splitter: w >= 5 ? Math.min(4, Math.floor(w / 5)) : 0,
        sniper: w >= 6 ? Math.min(4, Math.floor(w / 6)) : 0,
        weaver: w >= 7 ? Math.min(12, 2 + Math.floor(w / 3)) : 0,
        bomber: w >= 8 ? Math.min(6, 1 + Math.floor(w / 4)) : 0,
        mirror: w >= 9 ? Math.min(5, 1 + Math.floor(w / 5)) : 0,
        healer: w >= 10 ? Math.min(4, Math.floor(w / 6)) : 0,
        phantom: w >= 12 ? Math.min(4, Math.floor(w / 7)) : 0
      },
      spawnInterval: d.spawnInterval
    };
  };

  /* ---- 游戏模式 ---- */
  Logic.ENDLESS = 'endless';
  Logic.CAMPAIGN = 'campaign';
  Logic.CAMPAIGN_LEVELS = 10;   /* 闯关模式总关卡数 */
  Logic.WAVES_PER_LEVEL = 4;    /* 每关波数,最后一波为 Boss */

  /* 闯关模式关卡配置:每关 = 3 波杂兵 + 1 波 Boss */
  Logic.campaignConfig = function (level, diffId) {
    var lv = Math.max(1, Math.floor(level || 1));
    var d = Logic.difficulty(lv * 2, diffId);
    var waves = [];
    var i;
    for (i = 0; i < Logic.WAVES_PER_LEVEL - 1; i++) {
      waves.push({
        boss: false,
        counts: {
          grunt: Math.max(2, Math.round(Math.min(24, 5 + lv * 2) / 3)),
          sine: i >= 1 && lv >= 2 ? Math.max(1, Math.round(Math.min(10, 2 + lv) / 2)) : 0,
          gunner: i === Logic.WAVES_PER_LEVEL - 2 && lv >= 3 ? Math.max(1, Math.min(4, Math.floor(lv / 2))) : 0,
          tank: lv >= 4 && i >= 1 ? Math.max(1, Math.min(3, Math.floor(lv / 3))) : 0,
          diver: lv >= 3 && i >= 1 ? Math.max(1, Math.min(5, 1 + Math.floor(lv / 2))) : 0,
          splitter: lv >= 5 && i >= 2 ? Math.max(1, Math.min(2, Math.floor(lv / 4))) : 0,
          sniper: lv >= 5 && i >= 2 ? Math.max(1, Math.min(2, Math.floor(lv / 4))) : 0,
          weaver: lv >= 6 && i >= 1 ? Math.max(1, Math.min(3, Math.floor(lv / 3))) : 0,
          bomber: lv >= 7 && i >= 2 ? Math.max(1, Math.min(2, Math.floor(lv / 4))) : 0,
          mirror: lv >= 8 && i >= 2 ? 1 : 0,
          healer: lv >= 9 && i >= 2 ? 1 : 0,
          phantom: lv >= 10 ? 1 : 0
        },
        spawnInterval: d.spawnInterval
      });
    }
    waves.push({
      boss: true,
      bossHp: 40 + lv * 18,
      counts: { grunt: Math.max(1, Math.round(lv / 2)), sine: 0, gunner: 0 },
      spawnInterval: Math.max(340, Math.round(d.spawnInterval * 0.85))
    });
    return { level: lv, waves: waves };
  };

  /* ---- 肉鸽模式(Roguelike) ---- */
  Logic.ROGUELIKE = 'roguelike';
  Logic.ROGUE_WAVES_PER_PERK = 3;   /* 每 3 波出现一次三选一升级 */

  /* 升级池:field 用于封顶判断(有 max 才封顶),apply 直接改写 state */
  Logic.ROGUELIKE_PERKS = [
    { id: 'power',  field: 'weapon', max: 3, label: '火力强化', desc: '主炮火力 +1（最高 3）',  apply: function (s) { s.weapon = Math.min(3, s.weapon + 1); } },
    { id: 'rapid',  label: '急速射击', desc: '射速 +18%',                apply: function (s) { s.fireRate *= 1.18; } },
    { id: 'damage', label: '穿甲弹',   desc: '子弹伤害 +1',                apply: function (s) { s.damage += 1; } },
    { id: 'spread', label: '散射弹幕', desc: '额外 +1 外斜弹道',          apply: function (s) { s.spread += 1; } },
    { id: 'shield', field: 'shield', max: 3, label: '能量护盾', desc: '+1 护盾（最高 3）',      apply: function (s) { s.shield = Math.min(3, s.shield + 1); } },
    { id: 'repair', label: '纳米修复', desc: 'HP 上限 +1 并回满',         apply: function (s) { s.hpMax += 1; s.hp = s.hpMax; } },
    { id: 'speed',  label: '矢量推进', desc: '移速 +15%',                apply: function (s) { s.speedMul *= 1.15; } },
    { id: 'life',   field: 'lives', max: 5, label: '备用机体', desc: '生命 +1（最高 5）',      apply: function (s) { s.lives = Math.min(5, s.lives + 1); } },
    { id: 'score',  label: '赏金芯片', desc: '得分 +25%',                apply: function (s) { s.scoreMul *= 1.25; } },
    { id: 'crit',   field: 'crit', max: 3, label: '弱点分析', desc: '暴击率 +10%（最高 30%）',      apply: function (s) { s.crit = Math.min(3, s.crit + 1); } },
    { id: 'critdmg', label: '致命一击', desc: '暴击伤害 +50%',              apply: function (s) { s.critDmg += 0.5; } },
    { id: 'magnet', field: 'magnet', max: 3, label: '磁力收集', desc: '道具吸附范围 +50%',        apply: function (s) { s.magnet = Math.min(3, s.magnet + 1); } },
    { id: 'reflect', field: 'reflect', max: 2, label: '回旋护板', desc: '受击时向四周散射弹片',    apply: function (s) { s.reflect = Math.min(2, s.reflect + 1); } },
    { id: 'vamp',   label: '虹吸协议', desc: '击杀 12% 概率回 1 HP',        apply: function (s) { s.vamp += 0.04; } },
    { id: 'emp',    label: '过载线圈', desc: 'EMP 冲击范围与眩晕 +40%',    apply: function (s) { s.emp += 0.4; } }
  ];

  /* 归一化肉鸽状态(补齐默认字段) */
  Logic.rogueState = function (s) {
    s = s && typeof s === 'object' ? s : {};
    function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
    return {
      weapon: num(s.weapon, 1),
      shield: num(s.shield, 0),
      hp: num(s.hp, Logic.HP_MAX),
      hpMax: num(s.hpMax, Logic.HP_MAX),
      lives: num(s.lives, 3),
      fireRate: num(s.fireRate, 1),
      damage: num(s.damage, 1),
      spread: num(s.spread, 0),
      speedMul: num(s.speedMul, 1),
      scoreMul: num(s.scoreMul, 1),
      crit: num(s.crit, 0),
      critDmg: num(s.critDmg, 0.5),
      magnet: num(s.magnet, 0),
      reflect: num(s.reflect, 0),
      vamp: num(s.vamp, 0),
      emp: num(s.emp, 0)
    };
  };

  /* 当前可选升级(排除已封顶项) */
  Logic.rogueAvailable = function (state) {
    var s = Logic.rogueState(state);
    return Logic.ROGUELIKE_PERKS.filter(function (p) {
      return !(p.field && s[p.field] >= p.max);
    });
  };

  /* 随机抽 count 个不重复升级(rng 缺省 Math.random) */
  Logic.rogueRoll = function (state, count, rng) {
    if (typeof rng !== 'function') rng = Math.random;
    var pool = Logic.rogueAvailable(state).slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, Math.max(1, Math.floor(count || 3)));
  };

  /* 应用某个升级,返回新 state(不修改入参);未知 id 原样返回 */
  Logic.rogueApply = function (state, perkId) {
    var s = Logic.rogueState(state);
    for (var i = 0; i < Logic.ROGUELIKE_PERKS.length; i++) {
      if (Logic.ROGUELIKE_PERKS[i].id === perkId) {
        Logic.ROGUELIKE_PERKS[i].apply(s);
        return s;
      }
    }
    return s;
  };

  /* 连击:2s 窗口,倍率 1 + min(combo,10)*0.1,最高 x2 */
  Logic.comboMultiplier = function (combo) {
    var c = Math.max(0, Math.floor(combo || 0));
    return 1 + Math.min(c, 10) * 0.1;
  };

  Logic.nextCombo = function (combo, now, lastKillAt, windowMs) {
    var win = windowMs == null ? Logic.COMBO_WINDOW_MS : windowMs;
    if (lastKillAt != null && now - lastKillAt <= win) {
      return { combo: combo + 1, lastKillAt: now };
    }
    return { combo: 1, lastKillAt: now };
  };

  Logic.scoreKill = function (base, combo) {
    return Math.round(base * Logic.comboMultiplier(combo));
  };

  /* 道具效果(W 火力 / S 护盾 / H 修复),防御式输入;maxHp 可选(肉鸽 HP 上限可成长) */
  Logic.applyPowerup = function (state, type, maxHp) {
    var s = state && typeof state === 'object' ? state : {};
    var cap = typeof maxHp === 'number' && maxHp > 0 ? maxHp : Logic.HP_MAX;
    var out = {
      weapon: typeof s.weapon === 'number' ? s.weapon : 1,
      shield: typeof s.shield === 'number' ? s.shield : 0,
      hp: typeof s.hp === 'number' ? s.hp : cap
    };
    if (type === 'W') out.weapon = Math.min(Logic.WEAPON_MAX, out.weapon + 1);
    else if (type === 'S') out.shield = Logic.SHIELD_MAX;
    else if (type === 'H') out.hp = Math.min(cap, out.hp + 1);
    return out;
  };

  /* Boss 阶段:血量 >50% 一阶段,否则二阶段 */
  Logic.bossPhase = function (hpRatio) {
    return hpRatio > 0.5 ? 1 : 2;
  };

  /* ---- Boss 图鉴:10 个新 Boss + 经典首领,每 5 波按序轮换 ---- */
  Logic.BOSS_ROSTER = [
    { id: 'boss',      name: '经典首领',   hp: 1.0, score: 5000, color: 'magenta' },
    { id: 'hive',      name: '蜂巢母舰',   hp: 1.1, score: 5600, color: 'magenta' },
    { id: 'phantom',   name: '幻影核心',   hp: 0.9, score: 6200, color: 'red'     },
    { id: 'fortress',  name: '移动堡垒',   hp: 1.6, score: 7000, color: 'yellow'  },
    { id: 'storm',     name: '风暴支配者', hp: 1.15, score: 7600, color: 'cyan'   },
    { id: 'nexus',     name: '涅槃中枢',   hp: 1.3, score: 8200, color: 'magenta' },
    { id: 'vortex',    name: '湮灭漩涡',   hp: 1.25, score: 8800, color: 'red'    },
    { id: 'juggernaut', name: '无敌重炮',  hp: 1.8, score: 9400, color: 'yellow'  },
    { id: 'nova',      name: '超新星',     hp: 1.1, score: 10000, color: 'orange' },
    { id: 'twin',      name: '双子星环',   hp: 1.35, score: 10600, color: 'cyan'   },
    { id: 'omega',     name: '欧米茄终局', hp: 2.0, score: 12000, color: 'red'    }
  ];

  /* 第 bossIndex 个 Boss(从 0 计)应使用的配置 */
  Logic.bossOf = function (bossOrdinal) {
    var idx = (Math.max(0, bossOrdinal) % Logic.BOSS_ROSTER.length);
    return Logic.BOSS_ROSTER[idx];
  };

  /* 生成权重:grunt 50% / sine 30% / gunner 20% */
  Logic.spawnType = function (rng) {
    var r = rng();
    if (r < 0.5) return 'grunt';
    if (r < 0.8) return 'sine';
    return 'gunner';
  };

  /* ---- 暴击判定:crit 每级 +10% 概率,倍率 1 + critDmg(默认 1.5x) ---- */
  Logic.rollCrit = function (state, rng) {
    var s = state || {};
    var chance = (s.crit || 0) * 0.1;
    var r = (rng || Math.random)();
    var hit = r < chance;
    return { crit: hit, mul: hit ? 1 + (s.critDmg != null ? s.critDmg : 0.5) : 1 };
  };

  /* ---- 主动技能:EMP 电磁脉冲(键盘 E / 技能钮) ----
   * 冷却 20s;对范围内敌机造成伤害+眩晕,清除屏上敌弹。
   * radius = min(W,H)*0.28*(1+emp) ; dmg = 3+emp*2 ; stun 1.2s*(1+emp)
   */
  Logic.EMP_COOLDOWN = 20;
  Logic.empParams = function (emp, size) {
    return {
      radius: Math.round(Math.max(size, 200) * 0.28 * (1 + (emp || 0))),
      dmg: 3 + (emp || 0) * 2,
      stun: 1.2 * (1 + (emp || 0))
    };
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = Logic; }
  else { root.DFJ = root.DFJ || {}; root.DFJ.Logic = Logic; }
})(typeof self !== 'undefined' ? self : this);
