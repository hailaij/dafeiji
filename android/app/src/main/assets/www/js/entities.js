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
    } else { /* sniper */
      /* 狙击手:悬停后三连发瞄准弹 */
      e.r = 14;
      e.hp = 5 * diff.hpMul;
      e.x = U.rand(40, w - 40); e.y = -34;
      e.vy = U.rand(70, 95) * diff.speedMul;
      e.fireCd = U.rand(1.2, 1.8);
      e.score = 500;
    }
    return e;
  };

  E.spawnBoss = function (w, cfg) {
    return {
      type: 'boss', t: 0, dead: false, flash: 0,
      x: w / 2, y: -110, targetY: 130,
      r: 44, hp: cfg.bossHp, maxHp: cfg.bossHp,
      score: 5000, fireCd: 1.6, phase: 1, strafeT: 0, summonT: 3
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
    } else { /* sniper:入场后悬停缓漂 */
      if (e.y < 180) {
        e.y += e.vy * dt;
      } else {
        e.y += Math.sin(e.t * 0.7) * 12 * dt;
        e.x += Math.cos(e.t * 0.6) * 22 * dt;
      }
      e.x = U.clamp(e.x, e.r + 6, w - e.r - 6);
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
