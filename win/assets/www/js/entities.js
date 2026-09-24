/* NEON STRIKE - entities.js : 实体工厂与运动更新(不含渲染/输入) */
(function () {
  'use strict';
  var DFJ = (window.DFJ = window.DFJ || {});
  var U = DFJ.U;
  var E = (DFJ.Entities = {});

  E.createPlayer = function (w, h, shipId, weaponId) {
    var ship=DFJ.Logic.shipPreset(shipId);
    return {
      x: w / 2, y: h - 90, r: ship.r,
      weaponId:DFJ.Logic.weaponPreset(weaponId).id, ship:ship.id, speed: 430*ship.speed,
      hp: ship.hp, lives: 3, shield: ship.shield, weapon: 1,
      hpMax: ship.hp, fireRate: 1, damage: 1, spread: 0, speedMul: 1, scoreMul: 1,
      crit: 0, critDmg: 0.5, magnet: 0, reflect: 0, vamp: 0, emp: 0,
      rageUntil: 0, frostUntil: 0,
      invUntil: 0, fireCd: 0,
      tx: null, ty: null   /* 指针目标点 */
    };
  };

  /* 敌机工厂(每次新建;数量少不做池化) */
  E.spawnEnemy = function (type, w, diff) {
    var e = { type: type, t: 0, dead: false, flash: 0, fireCd: U.rand(0.8, 2.0), aggro: (diff && diff.aggroMul) || 1 };
    e.fireWarning = diff.fireWarning || 0.45; e.fireRest = diff.fireRest || 1;
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
      /* 俯冲者:入场蓄力后俯冲，限制转向与最高速度 */
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
    if (type === 'guardian' || type === 'transport') {
      e.r = type === 'guardian' ? 15 : 19;
      e.hp = (type === 'guardian' ? 4 : 5) * diff.hpMul;
      e.x = w/2; e.y = -36; e.vy = 65 * diff.speedMul; e.score = 450;
      if (type === 'transport') { e.optional = true; e.warning = 1.2; e.side = Math.random()<0.5?-1:1; e.x=e.side<0?-24:w+24; e.vx=-e.side*Math.max(65,w/6); }
    }
    return e;
  };

  E.updateShields = function(enemies, now) {
    enemies.forEach(function(e){e.protectedBy=null;});
    enemies.forEach(function(g){
      if(g.type!=='guardian'||g.dead||g.y<0||g.__stunUntil>now)return;
      enemies.filter(function(e){return e!==g&&!e.dead&&e.y>=0&&!e.protectedBy&&e.type!=='guardian'&&!e.optional&&Math.hypot(e.x-g.x,e.y-g.y)<=140;})
        .sort(function(a,b){return Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b.x-g.x,b.y-g.y);}).slice(0,2)
        .forEach(function(e){e.protectedBy=g;});
    });
  };
  E.shieldScale = function(e,now) {
    var g=e.protectedBy;
    return g&&!g.dead&&!(g.__stunUntil>now)&&Math.hypot(e.x-g.x,e.y-g.y)<=140?0.65:1;
  };

  /* Boss 工厂:v1.2 起按 Logic.BOSS_ROSTER 生成 11 种 Boss;kind 缺省 'boss'
   * 每种 Boss 附带专属弹幕参数(fireKind/spreadN/spreadRad 等)与二阶段行为 */
  E.spawnBoss = function (w, cfg) {
    var roster = (window.DFJ && window.DFJ.Logic && window.DFJ.Logic.BOSS_ROSTER) || [{ id: 'boss', hp: 1, score: 5000 }];
    var entry = roster[0];
    var i;
    for (i = 0; i < roster.length; i++) { if (roster[i].id === cfg.kind) { entry = roster[i]; break; } }
    return {
      turrets: entry.id === 'fortress' ? [-1,1].map(function(side){var hp=Math.max(6,Math.round(cfg.bossHp*entry.hp*.14));return {side:side,hp:hp,maxHp:hp,r:14};}) : null,
      type: 'boss', difficulty: cfg.difficulty || 'normal', kind: entry.id, name: entry.name, t: 0, dead: false, flash: 0,
      x: w / 2, y: -110, targetY: 180,
      r: 44, hp: Math.round(cfg.bossHp * entry.hp), maxHp: Math.round(cfg.bossHp * entry.hp),
      score: entry.score, fireCd: 1.6, phase: 1, strafeT: 0, summonT: 3,
      /* v1.2.3: 重甲 Boss 横移更慢,凸显体量差 */
      speedMul: entry.id === 'juggernaut' ? 0.65 : 1,
      fireKind: cfg.fireKind || 'fan', fireT: 0
    };
  };

  E.spawnPowerup = function (x, y, kind) {
    return { x: x, y: y, r: 12, kind: kind, vy: 70, t: 0, dead: false };
  };

  /* ---- 运动更新 ---- */

  /* Sample perception instead of reading the player's coordinates every frame.
   * Prediction is capped, and passing/close targets stop lateral pursuit. */
  E.trackTarget = function (e, dt, w, h, px, py) {
    e.thinkCd = (e.thinkCd || 0) - dt;
    e.seenTime = (e.seenTime || 0) + dt;
    if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
    if (!e.target || e.thinkCd <= 0) {
      var lead = 0.16 * e.aggro;
      var vx = e.seenX === undefined ? 0 : (px - e.seenX) / Math.max(0.05, e.seenTime);
      var vy = e.seenY === undefined ? 0 : (py - e.seenY) / Math.max(0.05, e.seenTime);
      e.target = { x: U.clamp(px + U.clamp(vx * lead, -64, 64), 20, w - 20),
        y: U.clamp(py + U.clamp(vy * lead, -40, 40), 20, h - 20) };
      e.seenX = px; e.seenY = py; e.seenTime = 0;
      e.thinkCd = 0.42 - 0.2 * U.clamp(e.aggro, 0, 1);
    }
    return py > e.y + 48 && Math.hypot(px - e.x, py - e.y) > 85 ? e.target : null;
  };

  function steer(e, key, target, speed, dt, w, margin) {
    var desired = target ? U.clamp((target.x - e[key]) * 2.5, -speed * e.aggro, speed * e.aggro) : 0;
    e.steerV = (e.steerV || 0) + U.clamp(desired - (e.steerV || 0), -240 * dt, 240 * dt);
    e[key] = U.clamp(e[key] + e.steerV * dt, margin, w - margin);
  }

  E.updateEnemy = function (e, dt, w, h, px, py, hudBottom) {
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if(e.type==='transport') {
      e.y=Math.min(h-90, (hudBottom||0)+65);
      if(e.warning>0){e.warning=Math.max(0,e.warning-dt);return;}
      e.x+=e.vx*dt;
      if(e.x < -40 || e.x > w+40)e.dead=true;
      return;
    }
    if(e.type==='guardian') {e.y+=e.vy*dt;if(e.y>h+50)e.dead=true;return;}
    var target = E.trackTarget(e, dt, w, h, px, py);
    var top = (hudBottom || 0) + e.r + 12;
    var hover = Math.max(top, Math.min(h * 0.28, h - 140));
    if (e.type === 'grunt' || e.type === 'tank' || e.type === 'splitter') {
      e.y += e.vy * dt;
      steer(e, 'x', target, e.type === 'grunt' ? 100 : e.type === 'tank' ? 52 : 65, dt, w, e.r + 4);
    } else if (e.type === 'sine' || e.type === 'weaver') {
      e.y += e.vy * dt;
      steer(e, 'baseX', target, e.type === 'weaver' ? 85 : 65, dt, w, e.r + e.amp + 4);
      e.x = e.baseX + Math.sin(e.t * e.freq) * e.amp;
    } else if (e.type === 'diver') {
      if (!e.armed) {
        e.y += e.vy * dt;
        if (e.y >= Math.max(top, Math.min(110, h * 0.22))) {
          e.armed = true; e.diveSpeed = e.vy; e.charge = 0.4;
          e.diveTarget = target ? {x:target.x,y:target.y} : {x:e.x,y:h + 80};
          e.diveAngle = Math.atan2(Math.max(60, e.diveTarget.y - e.y), e.diveTarget.x - e.x);
        }
      } else if (e.charge > 0) {
        e.charge = Math.max(0, e.charge - dt);
      } else {
        e.diveT += dt;
        if (!e.missed && target && e.diveT < 0.45) {
          var wanted = Math.atan2(Math.max(60, target.y - e.y), target.x - e.x);
          e.diveAngle += U.clamp(wanted - e.diveAngle, -0.8 * e.aggro * dt, 0.8 * e.aggro * dt);
        } else e.missed = true;
        e.diveSpeed = Math.min(480, e.diveSpeed + 420 * dt);
        e.vx = Math.cos(e.diveAngle) * e.diveSpeed;
        e.vy = Math.sin(e.diveAngle) * e.diveSpeed;
        e.x += e.vx * dt; e.y += e.vy * dt;
      }
    } else if (['gunner', 'sniper', 'bomber', 'mirror', 'healer'].indexOf(e.type) >= 0) {
      // Stable firing band follows the viewport/HUD rather than a fixed y limit.
      var hoverY = e.type === 'healer' ? top : hover;
      if (!e.aimLock) e.y += U.clamp(hoverY - e.y, -e.vy * dt, e.vy * dt);
      if (!e.aimLock) {
        if (e.type === 'healer') e.x = U.clamp(e.x + Math.cos(e.t * 0.35) * 26 * dt, e.r + 6, w - e.r - 6);
        else {
          var firingTarget = target;
          if (target && e.type === 'sniper') {
            // Snipers flank instead of stacking directly on the gunner's lane.
            firingTarget = {x:U.clamp(target.x + (e.flank || (e.flank = e.x < w / 2 ? -1 : 1)) * Math.min(80, w * 0.18), e.r + 6, w - e.r - 6)};
          }
          steer(e, 'x', firingTarget, {gunner:85,sniper:62,bomber:44,mirror:145}[e.type], dt, w, e.r + 6);
        }
      }
    } else if (e.type === 'phantom') {
      e.phaseT += dt;
      // Reacquire only when entering the solid phase; keep a readable crossing path.
      var phase = Math.floor(e.phaseT / 2.4);
      if (e.reacquired !== phase && target) {
        e.reacquired = phase;
        e.vx = (target.x >= e.x ? 1 : -1) * Math.abs(e.vx);
      }
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x < e.r + 4) { e.x = e.r + 4; e.vx = Math.abs(e.vx); }
      if (e.x > w - e.r - 4) { e.x = w - e.r - 4; e.vx = -Math.abs(e.vx); }
    }
    if (e.y > h + 80 || e.x < -80 || e.x > w + 80) e.dead = true;
  };

  E.prepareEnemyShot = function (e, dt, h, py, hudBottom) {
    var intervals = {gunner:1.4,sniper:1.9,bomber:2.4,mirror:1.3};
    if (!intervals[e.type]) return false;
    if (e.y < (hudBottom || 0) + e.r || e.y > h - 70 || py <= e.y + 55) {
      e.aimLock = null; e.fireCd = Math.max(0.55, e.fireCd); return false;
    }
    e.fireCd -= dt;
    if (!e.aimLock && e.fireCd <= (e.fireWarning || 0.4)) {
      var target = e.target || {x:e.x,y:h};
      e.aimLock = {x:e.x,y:e.y + 14,angle:e.type === 'mirror' ? Math.PI / 2 : Math.atan2(Math.max(55, target.y - e.y - 14), target.x - e.x)};
      e.fireCd = e.fireWarning || 0.4; // Always provide a full warning, even after a long entry.
    } else if (e.aimLock && e.fireCd <= 0) {
      e.fireCd = intervals[e.type] * (1.2 - 0.25 * e.aggro) * (e.fireRest || 1);
      return true;
    }
    return false;
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
    var range = (w - 2 * (b.turrets ? 72 : b.r) - 40) / 2;
    if (range < 0) range = 0;
    b.x = w / 2 + Math.sin(b.strafeT * (b.phase === 1 ? 0.9 : 1.5) * (b.speedMul || 1)) * range;
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
