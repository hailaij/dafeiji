/* NEON STRIKE - entities.js : 实体工厂与运动更新(不含渲染/输入) */
(function () {
  'use strict';
  var DFJ = (window.DFJ = window.DFJ || {});
  var U = DFJ.U;
  var E = (DFJ.Entities = {});

  E.createPlayer = function (w, h) {
    return {
      x: w / 2, y: h - 90, r: 12,
      speed: 430,
      hp: 3, lives: 3, shield: 0, weapon: 1,
      hpMax: 3, fireRate: 1, damage: 1, spread: 0, speedMul: 1, scoreMul: 1,
      crit: 0, critDmg: 0.5, magnet: 0, reflect: 0, vamp: 0, emp: 0,
      rageUntil: 0, frostUntil: 0,
      invUntil: 0, fireCd: 0,
      tx: null, ty: null   /* 指针目标点 */
    };
  };

  /* 敌机工厂(每次新建;数量少不做池化) */
  E.spawnEnemy = function (type, w, diff) {
    var e = { type: type, t: 0, dead: false, flash: 0, fireCd: U.rand(0.8, 2.0), aggro: (diff && diff.aggroMul) || 1 };
    if (type === 'grunt') {
      e.r = 12;
      e.hp = 2 * diff.hpMul;
      e.x = U.rand(30, w - 30); e.y = -30;
      e.vy = U.rand(90, 140) * diff.speedMul;
      e.score = 100;
    } else if (type === 'sine') {
      e.r = 13;
      e.hp = 3 * diff.hpMul;
      e.baseX = U.rand(70, w - 70);
      e.amp = U.rand(40, 80);
      e.amp = Math.min(e.amp, e.baseX - e.r - 4, w - e.baseX - e.r - 4);
      if (e.amp < 10) { e.amp = 10; e.baseX = U.clamp(e.baseX, e.r + 14, w - e.r - 14); }
      e.x = e.baseX; e.y = -30;
      e.vy = U.rand(65, 105) * diff.speedMul;
      e.freq = U.rand(2.0, 3.2);
      e.score = 200;
    } else if (type === 'gunner') {
      e.r = 18;
      e.hp = 6 * diff.hpMul;
      e.x = U.rand(45, w - 45); e.y = -44;
      e.vy = U.rand(42, 60) * diff.speedMul;
      e.fireCd = U.rand(1.0, 1.6);
      e.score = 400;
    } else if (type === 'tank') {
      /* 重装坦克:高血低速大体积肉盾 */
      e.r = 26;
      e.hp = 14 * diff.hpMul;
      e.x = U.rand(40, w - 40); e.y = -52;
      e.vy = U.rand(38, 52) * diff.speedMul;
      e.score = 600;
    } else if (type === 'diver') {
      /* 俯冲者:入场后持续追踪玩家俯冲,超时未命中则取消跟踪 */
      e.r = 11;
      e.hp = 3 * diff.hpMul;
      e.x = U.rand(24, w - 24); e.y = -28;
      e.vy = U.rand(120, 160) * diff.speedMul;
      e.armed = false; e.missed = false; e.diveSpeed = 0; e.diveT = 0;
      e.vx = 0;
      e.tx = U.rand(20, w - 20); /* fallback 目标(无玩家坐标时) */
      e.score = 300;
    } else if (type === 'splitter') {
      /* 分裂母体:死亡后分裂出两个小 grunt */
      e.r = 20;
      e.hp = 5 * diff.hpMul;
      e.x = U.rand(40, w - 40); e.y = -44;
      e.vy = U.rand(50, 70) * diff.speedMul;
      e.score = 350;
    } else if (type === 'sniper') { /* sniper */
      /* 狙击手:悬停后三连发瞄准弹 */
      e.r = 14;
      e.hp = 5 * diff.hpMul;
      e.x = U.rand(40, w - 40); e.y = -34;
      e.vy = U.rand(70, 95) * diff.speedMul;
      e.fireCd = U.rand(1.2, 1.8);
      e.score = 500;
    }
    /* ---- v1.2 新敌人 ---- */
    if (type === 'weaver') {
      /* 织网者:大幅蛇形快速下冲,难以命中 */
      e.r = 11;
      e.hp = 4 * diff.hpMul;
      e.baseX = U.rand(60, w - 60);
      e.amp = U.rand(60, 110);
      e.amp = Math.min(e.amp, e.baseX - e.r - 4, w - e.baseX - e.r - 4);
      if (e.amp < 12) { e.amp = 12; e.baseX = U.clamp(e.baseX, e.r + 16, w - e.r - 16); }
      e.x = e.baseX; e.y = -26;
      e.vy = U.rand(120, 165) * diff.speedMul;
      e.freq = U.rand(3.6, 5.2);
      e.score = 260;
    } else if (type === 'bomber') {
      /* 轰炸机:缓慢下压,周期性投掷 8 向环形弹幕 */
      e.r = 22;
      e.hp = 10 * diff.hpMul;
      e.x = U.rand(50, w - 50); e.y = -46;
      e.vy = U.rand(30, 42) * diff.speedMul;
      e.fireCd = U.rand(1.4, 2.0);
      e.score = 550;
    } else if (type === 'mirror') {
      /* 镜像机:与玩家保持同 X 轴位置,同步镜像移动 */
      e.r = 15;
      e.hp = 7 * diff.hpMul;
      e.x = w / 2; e.y = -40;
      e.vy = U.rand(55, 75) * diff.speedMul;
      e.score = 650;
    } else if (type === 'healer') {
      /* 治疗者:悬停后方,周期性为周围友军回复 HP */
      e.r = 16;
      e.hp = 6 * diff.hpMul;
      e.x = U.rand(40, w - 40); e.y = -36;
      e.vy = U.rand(45, 60) * diff.speedMul;
      e.fireCd = U.rand(2.0, 2.8);
      e.score = 700;
    } else if (type === 'phantom') {
      /* 幽灵机:相位闪烁,实体态才能被命中,快速斜穿 */
      e.r = 12;
      e.hp = 5 * diff.hpMul;
      e.x = U.rand(30, w - 30); e.y = -30;
      e.vx = (Math.random() < 0.5 ? -1 : 1) * U.rand(90, 150) * diff.speedMul;
      e.vy = U.rand(70, 100) * diff.speedMul;
      e.phaseT = 0;
      e.score = 800;
    }
    return e;
  };

  /* Boss 工厂:v1.2 起按 Logic.BOSS_ROSTER 生成 11 种 Boss;kind 缺省 'boss'
   * 每种 Boss 附带专属弹幕参数(fireKind/spreadN/spreadRad 等)与二阶段行为 */
  E.spawnBoss = function (w, cfg) {
    var roster = (window.DFJ && window.DFJ.Logic && window.DFJ.Logic.BOSS_ROSTER) || [{ id: 'boss', hp: 1, score: 5000 }];
    var entry = roster[0];
    var i;
    for (i = 0; i < roster.length; i++) { if (roster[i].id === cfg.kind) { entry = roster[i]; break; } }
    return {
      type: 'boss', kind: entry.id, name: entry.name, t: 0, dead: false, flash: 0,
      x: w / 2, y: -110, targetY: 130,
      r: 44, hp: Math.round(cfg.bossHp * entry.hp), maxHp: Math.round(cfg.bossHp * entry.hp),
      score: entry.score, fireCd: 1.6, phase: 1, strafeT: 0, summonT: 3,
      fireKind: cfg.fireKind || 'fan', fireT: 0
    };
  };

  E.spawnPowerup = function (x, y, kind) {
    return { x: x, y: y, r: 12, kind: kind, vy: 70, t: 0, dead: false };
  };

  /* ---- 运动更新 ---- */

  E.updateEnemy = function (e, dt, w, h, px, py) {
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.type === 'grunt') {
      e.y += e.vy * dt;
      /* 攻击意愿:水平追踪玩家,强度随难度 */
      if (px !== undefined) {
        e.x += U.clamp(px - e.x, -70 * e.aggro * dt, 70 * e.aggro * dt);
      }
    } else if (e.type === 'sine') {
      e.y += e.vy * dt;
      /* 蛇形中心向玩家漂移,强度随难度 */
      if (px !== undefined) {
        e.baseX += U.clamp(px - e.baseX, -40 * e.aggro * dt, 40 * e.aggro * dt);
        e.baseX = U.clamp(e.baseX, e.r + e.amp + 2, w - e.r - e.amp - 2);
      }
      e.x = e.baseX + Math.sin(e.t * e.freq) * e.amp;
    } else if (e.type === 'gunner') { /* 入场后悬停缓漂 */
      if (e.y < 150) {
        e.y += e.vy * dt;
      } else {
        e.y += Math.sin(e.t * 0.8) * 14 * dt;
        e.x += Math.cos(e.t * 0.5) * 30 * dt;
      }
      e.x = U.clamp(e.x, e.r + 6, w - e.r - 6);
    } else if (e.type === 'tank') { /* 慢速下冲,水平追踪玩家(强度随难度) */
      e.y += e.vy * dt;
      if (px !== undefined) {
        e.x += U.clamp(px - e.x, -45 * e.aggro * dt, 45 * e.aggro * dt);
      }
    } else if (e.type === 'diver') { /* 追踪玩家俯冲,超时未命中则取消跟踪 */
      if (!e.armed) {
        /* 入场段:垂直下降 */
        e.y += e.vy * dt;
        if (e.y > 90) { e.armed = true; e.diveSpeed = e.vy; }
      } else if (!e.missed) {
        /* 俯冲追踪:速度方向指向玩家实时位置,速率递增 */
        e.diveT += dt;
        e.diveSpeed += 620 * dt;
        var tx = (px !== undefined ? px : e.tx);
        var ty = (py !== undefined ? py : (h + 120));
        var dx = tx - e.x, dy = ty - e.y;
        var dl = Math.sqrt(dx * dx + dy * dy) || 1;
        e.vx = (dx / dl) * e.diveSpeed;
        e.vy = (dy / dl) * e.diveSpeed;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.diveT >= 1.0) e.missed = true; /* 超时未命中,取消跟踪 */
      } else {
        /* 取消跟踪:沿当前速度方向直线飞出 */
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
    } else if (e.type === 'splitter') { /* 慢速下冲 */
      e.y += e.vy * dt;
    } else if (e.type === 'sniper') { /* sniper:入场后悬停缓漂 */
      if (e.y < 180) {
        e.y += e.vy * dt;
      } else {
        e.y += Math.sin(e.t * 0.7) * 12 * dt;
        e.x += Math.cos(e.t * 0.6) * 22 * dt;
      }
      e.x = U.clamp(e.x, e.r + 6, w - e.r - 6);
    }
    if (e.type === 'weaver') {
      e.y += e.vy * dt;
      if (px !== undefined) {
        e.baseX += U.clamp(px - e.baseX, -55 * e.aggro * dt, 55 * e.aggro * dt);
        e.baseX = U.clamp(e.baseX, e.r + e.amp + 2, w - e.r - e.amp - 2);
      }
      e.x = e.baseX + Math.sin(e.t * e.freq) * e.amp;
    } else if (e.type === 'bomber') {
      /* 缓慢下压,到中段后悬停左右缓漂 */
      if (e.y < 120) {
        e.y += e.vy * dt;
      } else {
        e.y += Math.sin(e.t * 0.6) * 10 * dt;
        e.x += Math.cos(e.t * 0.4) * 24 * dt;
      }
      e.x = U.clamp(e.x, e.r + 6, w - e.r - 6);
    } else if (e.type === 'mirror') {
      /* 缓慢下压到固定高度后,横向镜像跟踪玩家 */
      if (e.y < 110) {
        e.y += e.vy * dt;
      } else if (px !== undefined) {
        e.x += U.clamp(px - e.x, -130 * e.aggro * dt, 130 * e.aggro * dt);
        e.y += Math.sin(e.t * 1.1) * 8 * dt;
      }
      e.x = U.clamp(e.x, e.r + 6, w - e.r - 6);
    } else if (e.type === 'healer') {
      /* 悬停在场后方,左右缓慢漂移 */
      if (e.y < 90) {
        e.y += e.vy * dt;
      } else {
        e.y += Math.sin(e.t * 0.5) * 8 * dt;
        e.x += Math.cos(e.t * 0.35) * 26 * dt;
      }
      e.x = U.clamp(e.x, e.r + 6, w - e.r - 6);
    } else if (e.type === 'phantom') {
      /* 斜向快速穿屏 + 相位闪烁;碰壁反弹一次 */
      e.phaseT += dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < e.r + 4) { e.x = e.r + 4; e.vx = Math.abs(e.vx); }
      if (e.x > w - e.r - 4) { e.x = w - e.r - 4; e.vx = -Math.abs(e.vx); }
    }
    if (e.y > h + 80 || e.x < -80 || e.x > w + 80) e.dead = true;
  };

  E.updateBoss = function (b, dt, w) {
    b.t += dt;
    if (b.flash > 0) b.flash -= dt;
    if (b.y < b.targetY) {
      b.y += 90 * dt;
      if (b.y >= b.targetY) b.y = b.targetY;
      return;
    }
    b.strafeT += dt;
    var range = (w - 2 * b.r - 40) / 2;
    if (range < 0) range = 0;
    b.x = w / 2 + Math.sin(b.strafeT * (b.phase === 1 ? 0.9 : 1.5)) * range;
  };

  E.updatePowerup = function (p, dt, h) {
    p.t += dt;
    p.y += p.vy * dt;
    p.x += Math.sin(p.t * 3) * 18 * dt;
    if (p.y > h + 30) p.dead = true;
  };

  E.updateParticle = function (p, dt) {
    p.life -= dt;
    if (p.life <= 0) { p.dead = true; return; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= (1 - 1.6 * dt);
    p.vy *= (1 - 1.6 * dt);
    if (p.grav) p.vy += 260 * dt;
  };
})();
