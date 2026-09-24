/* NEON STRIKE - game.js : 游戏循环(rAF) / 状态机 / 输入 / 碰撞调度 / HUD
 * 依赖加载顺序: core → logic → bosses → entities → audio → render → game
 */
(function () {
  'use strict';
  var DFJ = window.DFJ;
  var U = DFJ.U, L = DFJ.Logic, E = DFJ.Entities, A = DFJ.Audio, R = DFJ.Render;
  var Pool = DFJ.Pool;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  var stars = [], gridOff = 0, tAccum = 0;

  /* ---- 全局状态 ---- */
  var STATE = 'start'; /* start | playing | paused | upgrade | gameover | victory */
  var now = 0;
  var player = null;
  var enemies = [];
  var boss = null, bossKilled = false;
  var powerups = [];
  var pbullets = new Pool(makeBullet);
  var ebullets = new Pool(makeBullet);
  var particles = new Pool(makeParticle);
  var wave = 0, spawnSeq = [], spawnTimer = 0, waveSpawnInterval = 950;
  var MODE = L.ENDLESS; /* endless | campaign | roguelike */
  var DIFFICULTY = 'normal'; /* easy | normal | hard */
  var level = 0, levelWave = 0, levelPlan = [], campaignClearT = -1;
  var rogueChoices = [];
  var runStats, encounter = "", spawnGap = 1;
  var lastMode = L.ENDLESS;
  var score = 0, combo = 0, lastKillAt = -1;
  var hiScore = 0;
  var pointer = { active: false, x: 0, y: 0 };
  var keys = {};
  var shake = 0;
  /* v1.2: 主动技能 EMP 与新道具 buff 状态 */
  var empCdUntil = 0;      /* EMP 冷却截止时刻(performance.now 毫秒) */
  var empWave = null;      /* EMP 冲击波动画 {x,y,r,maxR,t0,dur} */
  var empBtn = null;

  var dom = {};
  var HISCORE_KEY = 'neon-strike-hiscore';
  var pauseBtn, flightInput;
  var hudBottom = 0, layoutDirty = true;

  /* ---- 对象池构造器 ---- */
  function makeBullet() {
    return { x: 0, y: 0, vx: 0, vy: 0, r: 3, dead: false, kind: '' };
  }
  function makeParticle() {
    return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, grav: false, color: '#fff', size: 2, dead: false };
  }

  /* ---- DOM / HUD ---- */
  function cacheDom() {
    var ids = ['hud-score', 'hud-wave', 'hud-combo', 'hud-weapon', 'hud-shield', 'hud-lives', 'hud-hp', 'hud-buff',
      'overlay', 'panel-start', 'panel-pause', 'panel-over', 'panel-victory', 'panel-upgrade',
      'final-score', 'victory-score', 'new-record', 'victory-record', 'mode-tag', 'upgrade-cards',
      'run-over', 'run-victory', 'build-progress', 'hud-build', 'btn-emp', 'emp-cd', 'hud', 'boss-hud', 'boss-name', 'boss-phase', 'boss-health', 'boss-health-fill', 'boss-skill', 'boss-music'];
    for (var i = 0; i < ids.length; i++) dom[ids[i]] = document.getElementById(ids[i]);
    pauseBtn = document.getElementById('btn-pause');
  }

  function pad(n, w) { var s = String(Math.floor(n)); while (s.length < (w || 6)) s = '0' + s; return s; }

  function updateBossHUD() {
    var visible = !!boss && !boss.dead;
    if (dom['boss-hud'].classList.contains('hidden') === visible) layoutDirty = true;
    dom['boss-hud'].classList.toggle('hidden', !visible);
    if (!visible) return;
    var profile = L.bossProfile(boss.kind);
    var ratio = U.clamp(boss.hp / boss.maxHp, 0, 1);
    dom['boss-name'].textContent = boss.name;
    dom['boss-phase'].textContent = '阶段 ' + boss.phase + (boss.turrets ? ' · 炮台 '+boss.turrets.filter(function(t){return t.hp>0;}).length+'/2' : '');
    dom['boss-health-fill'].style.transform = 'scaleX(' + ratio + ')';
    dom['boss-health'].setAttribute('aria-valuenow', Math.round(ratio * 100));
    dom['boss-skill'].textContent = profile.skill + (boss.pending ? ' · 蓄力' : ' · 装填');
    dom['boss-music'].textContent = '♫ ' + profile.music.title;
    dom['boss-hud'].classList.toggle('phase-two', boss.phase === 2);
    dom['boss-hud'].classList.toggle('charging', !!boss.pending);
  }
  function updateHUD() {
    updateBossHUD();
    dom['hud-score'].textContent = pad(score, 6);
    var dLabel = L.difficultyPreset(DIFFICULTY).label;
    if (MODE === L.CAMPAIGN) {
      dom['hud-wave'].textContent = 'LEVEL ' + pad(Math.max(1, level), 2) + ' · ' + levelWave + '/' + L.WAVES_PER_LEVEL;
      dom['mode-tag'].textContent = '闯关模式 · ' + dLabel;
    } else if (MODE === L.ROGUELIKE) {
      dom['hud-wave'].textContent = 'WAVE ' + pad(Math.max(1, wave), 2);
      dom['mode-tag'].textContent = '肉鸽模式 · ' + dLabel;
    } else {
      dom['hud-wave'].textContent = 'WAVE ' + pad(Math.max(1, wave), 2);
      dom['mode-tag'].textContent = '无限模式 · ' + dLabel;
    }
    dom['hud-combo'].textContent = combo > 1 ? 'COMBO \u00d7' + L.comboMultiplier(combo).toFixed(1) : 'COMBO \u00d71';
    if (!player) return; /* player 创建前的启动态,保留 HTML 默认值 */
    dom['hud-weapon'].textContent = L.shipPreset(player.ship).name + ' PWR ' + player.weapon;
    dom['hud-shield'].textContent = 'SHIELD ' + player.shield;
    dom['hud-lives'].textContent = 'LIVES ' + player.lives;
    dom['hud-hp'].textContent = 'HP ' + player.hp + '/' + player.hpMax;
    /* v1.2: buff 状态条(狂暴/冰霜剩余时间) */
    if (dom['hud-buff']) {
      var buffTxt = [];
      if (player.rageUntil > now) buffTxt.push('狂暴 ' + Math.ceil((player.rageUntil - now) / 1000) + 's');
      if (player.frostUntil > now) buffTxt.push('冰霜 ' + Math.ceil((player.frostUntil - now) / 1000) + 's');
      dom['hud-buff'].textContent = buffTxt.join('  ');
      dom['hud-buff'].style.display = buffTxt.length ? '' : 'none';
    }
    /* v1.2: EMP 冷却显示 */
    if (dom['emp-cd'] && dom['btn-emp']) {
      var cdLeft = Math.max(0, empCdUntil - now) / 1000;
      var cooling = cdLeft > 0;
      dom['emp-cd'].textContent = cooling ? Math.ceil(cdLeft) + 's' : '就绪';
      dom['btn-emp'].classList.toggle('cooldown', cooling);
      dom['btn-emp'].style.setProperty('--emp-charge', U.clamp(1 - cdLeft / L.EMP_COOLDOWN, 0, 1));
      dom['btn-emp'].setAttribute('aria-label', cooling ? 'EMP 冷却中，剩余 ' + Math.ceil(cdLeft) + ' 秒' : '释放 EMP');
      dom['btn-emp'].setAttribute('aria-disabled', cooling ? 'true' : 'false');
    }
  }

  function setPanel(name) {
    if (name !== 'none' && flightInput) { flightInput.reset(); keys = {}; }
    dom['overlay'].classList.toggle('hidden', name === 'none');
    ['panel-start', 'panel-pause', 'panel-over', 'panel-victory', 'panel-upgrade'].forEach(function (p) {
      dom[p].classList.toggle('hidden', p !== name);
    });
    /* 暂停按钮只在 playing 状态显示 */
    if (pauseBtn) pauseBtn.style.display = (STATE === 'playing') ? '' : 'none';
    /* EMP 技能钮只在 playing 状态显示 */
    if (empBtn) empBtn.style.display = (STATE === 'playing') ? 'block' : 'none';
  }

  /* ---- 尺寸 / DPR ---- */
  function layoutBattlefield() {
    if (!dom['hud']) return;
    if (layoutDirty || !window.ResizeObserver) {
      hudBottom = Math.ceil(dom['hud'].getBoundingClientRect().bottom);
      layoutDirty = false;
    }
    if (boss) {
      var target = hudBottom + 58;
      var arrived = boss.y >= boss.targetY;
      if (target !== boss.targetY) {
        boss.targetY = target;
        if (arrived) boss.y = target;
        // A resize must not leave an old, invisible aiming solution behind.
        boss.pending = null; boss.fireCd = Math.max(boss.fireCd, 0.75);
      }
    }
  }
  function resize() {
    layoutDirty = true;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    stars = R.makeStars(W, H);
    if (flightInput) flightInput.reset();
    enemies.forEach(function (e) { e.aimLock = null; e.target = null; e.fireCd = Math.max(e.fireCd, 0.6); });
    if (boss) {
      boss.x = U.clamp(boss.x, boss.r + 10, W - boss.r - 10);
      boss.pending = null; boss.fireCd = Math.max(boss.fireCd, 0.75);
    }
    layoutBattlefield();
  }

  /* ---- 高分持久化 ---- */
  function loadHi() {
    try { hiScore = parseInt(localStorage.getItem(HISCORE_KEY), 10) || 0; }
    catch (e) { hiScore = 0; }
  }
  function saveHi() {
    try { if (score > hiScore) { hiScore = score; localStorage.setItem(HISCORE_KEY, String(hiScore)); } }
    catch (e) {}
  }

  /* ---- 波次 ---- */
  function buildSpawnSeq(cfg) {
    var seq = [], t;
    var counts = cfg.counts || {};
    for (var type in counts) {
      if (!counts.hasOwnProperty(type)) continue;
      for (t = 0; t < counts[type]; t++) seq.push(type);
    }
    /* Fisher-Yates 洗牌 */
    for (var i = seq.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = seq[i]; seq[i] = seq[j]; seq[j] = tmp;
    }
    var ordinal=MODE===L.CAMPAIGN?(level-1)*4+levelWave:wave;
    if(!cfg.boss && ordinal>=4){var guard=seq.indexOf('grunt');if(guard>=0)seq[guard]='guardian';}
    if(!cfg.boss && ordinal>=3 && ordinal%3===0){var cargo=seq.lastIndexOf('grunt');if(cargo>=0)seq[cargo]='transport';}
    return L.formation(seq, MODE === L.CAMPAIGN ? (level-1)*4+levelWave : wave, DIFFICULTY);
  }

  /* 当前波难度 */
  function currentDiff() {
    if (MODE === L.CAMPAIGN) return L.campaignDifficulty(level, DIFFICULTY);
    return L.difficulty(wave, DIFFICULTY);
  }

  function nextWave() {
    bossKilled = false;
    if (MODE === L.CAMPAIGN) {
      /* 闯关:推进 levelPlan 的下一波 */
      var plan = L.campaignConfig(level, DIFFICULTY);
      if (levelWave >= L.WAVES_PER_LEVEL) {
        /* 过关:恢复 1 HP(封顶),进入下一关 */
        if (player) player.hp = Math.min(player.hpMax, player.hp + 1);
        level++;
        if (level > L.CAMPAIGN_LEVELS) { victory(); return; }
        plan = L.campaignConfig(level, DIFFICULTY);
        levelWave = 0;
      }
      levelWave++;
      var wcfg = plan.waves[levelWave - 1];
      spawnSeq = buildSpawnSeq(wcfg);
      waveSpawnInterval = wcfg.spawnInterval;
      spawnTimer = 1.2;
      if (wcfg.boss) {
        spawnSeq = spawnSeq.slice(0, Math.max(1, Math.ceil(spawnSeq.length / 2)));
      }
      A.play('wave');
    } else {
      /* 无限与肉鸽都复用 waveConfig 波次表 */
      wave++;
      var cfg = L.waveConfig(wave, DIFFICULTY);
      spawnSeq = buildSpawnSeq(cfg);
      waveSpawnInterval = cfg.spawnInterval;
      spawnTimer = 1.2;
      if (cfg.boss) {
        /* Boss 波:杂兵减半,出完后 Boss 登场 */
        spawnSeq = spawnSeq.slice(0, Math.max(1, Math.ceil(spawnSeq.length / 2)));
      }
      A.play('wave');
    }
  }

  function currentBossHp() {
    if (MODE === L.CAMPAIGN) {
      var plan = L.campaignConfig(level, DIFFICULTY);
      var w = plan.waves[levelWave - 1];
      return w && w.boss ? w.bossHp : 0;
    }
    var cfg = L.waveConfig(wave, DIFFICULTY);
    return cfg.boss ? cfg.bossHp : 0;
  }

  function spawnFromSeq() {
    if (!spawnSeq.length) return;
    var entry = spawnSeq.shift();
    var type = entry.type; spawnGap = entry.gap; encounter = entry.name;
    var en = E.spawnEnemy(type, W, currentDiff());
    /* v1.2: 精英怪 — 波次>=6 起 12% 概率,血量x2.5 体积x1.2 得分x3,紫色光环 */
    var eliteWave = (MODE === L.CAMPAIGN) ? level : wave;
    if (eliteWave >= 6 && type !== 'boss' && type !== 'guardian' && type !== 'transport' && Math.random() < 0.12) {
      en.elite = true;
      en.hp *= 2.5; en.hp0 = en.hp;
      en.r *= 1.2;
      en.score *= 3;
      en.vy *= 0.85;
    } else {
      en.hp0 = en.hp;
    }
    if (!en.optional) en.x = U.clamp(W * entry.lane, en.r + 20, W - en.r - 20);
    if (en.baseX != null) { en.baseX = en.x; en.amp = Math.min(en.amp, en.x-en.r-4, W-en.x-en.r-4); }
    enemies.push(en);
  }

  /* ---- 射击 ---- */
  function firePlayerBullet(x, y, vx, vy) {
    var b = pbullets.obtain();
    b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.r = 3; b.dead = false;
    b.dmg = player.__lastDmg || player.damage;
    b.weaponId = player.weaponId; b.tier=player.weapon;
    b.source = "weapon"; b.bonus = player.__lastBonus || 0;
  }

  function playerFire() {
    var rageOn = player.rageUntil > now;   /* 狂暴: 射速由 fireCd 端控制,此处弹速+伤害由 rollCrit 路径 */
    var crit = L.rollCrit(player);
    var dmg = player.damage * (crit.crit ? crit.mul : 1) * (rageOn ? 1.5 : 1);
    var extra = crit.crit && L.hasSynergy(player,"critical") ? player.damage * 0.5 * (rageOn ? 1.5 : 1) : 0;
    dmg += extra; player.__lastBonus = extra;
    if (crit.crit) A.play('hit');
    player.__lastDmg = dmg;
    L.weaponShots(player.weaponId,player.weapon,player.spread).forEach(function(shot){
      player.__lastDmg=dmg*shot.mul;player.__lastBonus=extra*shot.mul;
      firePlayerBullet(player.x+shot.x,player.y+shot.y,shot.vx,shot.vy);
    });
    A.play('shoot');
  }

  function fireEnemyBullet(x, y, vx, vy, r) {
    var speedMul = currentDiff().bulletSpeedMul;
    vx *= speedMul; vy *= speedMul;
    var b = ebullets.obtain();
    b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.r = r || 4; b.dead = false;
  }

  function enemyShoot(e) {
    var aim = e.aimLock;
    if (!aim) return;
    if (e.type === 'bomber') {
      for (var i = 0; i < 8; i++) {
        var angle = Math.PI * 2 * i / 8 + e.t * 0.7;
        fireEnemyBullet(aim.x, aim.y, Math.cos(angle) * 150, Math.sin(angle) * 150);
      }
    } else {
      var count = e.type === 'sniper' ? 3 : 1;
      var speed = {gunner:220,sniper:300,mirror:300}[e.type];
      for (var j = 0; j < count; j++) {
        var a = aim.angle + (j - (count - 1) / 2) * 0.16;
        fireEnemyBullet(aim.x, aim.y, Math.cos(a) * speed, Math.sin(a) * speed);
      }
    }
    e.aimLock = null;
    A.play('enemyShoot');
  }

  function bossShoot(b) {
    b.lastShotT = b.t;
    b.pending.shots.forEach(function (s) { fireEnemyBullet(s.x, s.y, s.vx, s.vy, s.r); });
    if (b.pending.summon && enemies.length < 4) {
      enemies.push(E.spawnEnemy(b.pending.summon, W, currentDiff()));
    }
    b.recovery = b.pending.rest;
    b.fireCd = b.pending.rest;
    b.pending = null;
    b.attackIndex = (b.attackIndex || 0) + 1;
    A.play('enemyShoot');
  }

  /* ---- 粒子/爆炸 ---- */
  function burst(x, y, color, count, speed) {
    for (var i = 0; i < count; i++) {
      var p = particles.obtain();
      var ang = Math.random() * Math.PI * 2;
      var sp = speed * (0.4 + Math.random() * 0.8);
      p.x = x; p.y = y;
      p.vx = Math.cos(ang) * sp;
      p.vy = Math.sin(ang) * sp;
      p.maxLife = p.life = 0.35 + Math.random() * 0.4;
      p.grav = Math.random() < 0.4;
      p.color = color;
      p.size = 1.5 + Math.random() * 2.5;
      p.dead = false;
    }
  }

  function dealDamage(e, amount, source, bonus) {
    var scale=E.shieldScale(e,now); amount*=scale; bonus=(bonus||0)*scale;
    var actual = Math.max(0, Math.min(e.hp, amount));
    runStats[source] += actual;
    if (bonus) runStats.synergyDamage += actual * Math.min(1, bonus / amount);
    e.hp -= amount;
  }
  function showSummary(id) {
    var names = L.synergies(player).map(function(x){return x.name;}).join(' / ') || '尚未成型';
    dom[id].textContent = (MODE === L.CAMPAIGN ? '第 '+level+' 关 · 第 '+levelWave+' 波' : '第 '+wave+' 波') + '\n作战 ' + Math.floor(runStats.seconds) + ' 秒 · 击破 ' + runStats.kills + ' 架 · Boss ' + runStats.bosses +
      '\n主炮伤害 ' + Math.round(runStats.weapon) + ' · EMP 伤害 ' + Math.round(runStats.emp) + ' · 反击伤害 ' + Math.round(runStats.reflect) +
      '\nEMP 使用 ' + runStats.empUses + ' 次 · 清弹 ' + runStats.cleared + ' 发 · 最高连击 ' + runStats.combo +
      '\n组合额外伤害 ' + Math.round(runStats.synergyDamage) + ' · 回能 ' + runStats.refund.toFixed(1) + ' 秒 · 再生 ' + runStats.healing + ' HP' +
      '\n流派：' + names + '\n' + (STATE === 'victory' ? '完成全部关卡' : '致命伤害：' + runStats.cause);
  }

  function killEnemy(e) {
    if (e.__rewarded) return;
    e.__rewarded = true;
    e.dead = true;
    runStats.kills++; if (e.type === "boss") runStats.bosses++;
    if (L.hasSynergy(player,"sustain")) {
      runStats.sustainKills++;
      if (runStats.sustainKills % 12 === 0 && player.hp < player.hpMax) { player.hp++; runStats.healing++; }
    }
    var color = e.type === 'boss' ? R.C.magenta : (e.type === 'phantom' ? R.C.red : (e.type === 'bomber' ? R.C.yellow : (e.type === 'healer' ? R.C.cyan : R.C.magenta)));
    burst(e.x, e.y, color, e.type === 'boss' ? 42 : 14, e.type === 'boss' ? 260 : 180);
    if (e.type === 'boss') A.play('bigBoom'); else A.play('boom');
    shake = Math.max(shake, e.type === 'boss' ? 12 : 4);

    combo = L.nextCombo(combo, now, lastKillAt).combo;
    lastKillAt = now;
    runStats.combo = Math.max(runStats.combo,combo);
    score += Math.round(L.scoreKill(e.score || 0, combo) * (player.scoreMul || 1) * currentDiff().scoreMul);

    /* v1.2: 虹吸协议 — 概率回 1 HP */
    if (player && player.vamp > 0 && Math.random() < player.vamp) {
      player.hp = Math.min(player.hpMax, player.hp + 1);
      burst(player.x, player.y, R.C.cyan, 6, 90);
    }

    /* 道具掉落 */
    if (e.type === 'transport') { dropPowerup(e.x,e.y,true); }
    else if (e.type === 'boss') { dropPowerup(e.x, e.y, true); }
    else if (e.type === 'splitter') {
      /* 分裂成两个小 grunt */
      for (var s = -1; s <= 1; s += 2) {
        var mini = E.spawnEnemy('grunt', W, currentDiff());
        mini.x = U.clamp(e.x + s * 16, mini.r + 4, W - mini.r - 4);
        mini.y = e.y;
        enemies.push(mini);
      }
    }
    else { var dr = currentDiff().dropRate || 0.12; if (Math.random() < dr) dropPowerup(e.x, e.y, false); }
  }

  function dropPowerup(x, y, force) {
    var kind;
    if (force) {
      if (player.hp < player.hpMax) kind = 'H';
      else if (player.shield < L.SHIELD_MAX) kind = 'S';
      else if (player.weapon < L.WEAPON_MAX) kind = 'W';
      else kind = 'B';
    } else {
      var roll = Math.random();
      if (roll < 0.28) kind = 'W';
      else if (roll < 0.49) kind = 'S';
      else if (roll < 0.70) kind = 'H';
      else if (roll < 0.85) kind = 'B';
      else kind = 'F';
    }
    powerups.push(E.spawnPowerup(x, y, kind));
  }

  function applyPowerup(p) {
    p.dead = true;
    if (p.kind === 'B') {
      player.rageUntil = now + 6000;  /* 狂暴 6s: 射速x2 + 伤害x1.5 */
      A.play('victory');
      burst(p.x, p.y, R.C.red, 16, 160);
      return;
    }
    if (p.kind === 'F') {
      player.frostUntil = now + 5000; /* 冰霜 5s: 敌机与敌弹减速 55% */
      A.play('pickup');
      burst(p.x, p.y, R.C.cyan, 16, 160);
      return;
    }
    var r = L.applyPowerup(player, p.kind, player.hpMax);
    player.weapon = r.weapon; player.shield = r.shield; player.hp = r.hp;
    A.play('pickup');
    burst(p.x, p.y, R.C.yellow, 12, 140);
  }

  function hurtPlayer(cause) {
    if (STATE !== 'playing' || player.invUntil > now) return;
    runStats.cause = cause || '敌方攻击';
    if (player.reflect > 0) {
      var enhanced = L.hasSynergy(player,'sustain');
      for (var ri=0;ri<8;ri++) {
        var a=ri*Math.PI/4, shot=pbullets.obtain();
        shot.x=player.x;shot.y=player.y;shot.vx=Math.cos(a)*320;shot.vy=Math.sin(a)*320;
        shot.r=3;shot.dead=false;shot.dmg=player.reflect*(enhanced?2:1);shot.source='reflect';shot.bonus=enhanced?player.reflect:0;
      }
    }
    if (player.shield > 0) {
      player.shield--;
      player.invUntil = now + 800;
      A.play('hit');
      burst(player.x, player.y, R.C.cyan, 8, 120);
      return;
    }
    player.hp--;
    A.play('hurt');
    burst(player.x, player.y, R.C.cyan, 16, 180);
    shake = Math.max(shake, 8);
    if (player.hp <= 0) {
      player.lives--;
      if (player.lives <= 0) {
        gameOver();
        return;
      }
      player.hp = player.hpMax;
      player.invUntil = now + 1600;
      player.weapon = Math.max(1, player.weapon - 1);
      player.shield = 0;
    } else {
      player.invUntil = now + 800;
    }
  }

  /* ---- 状态机 ---- */
  function startGame(mode) {
    MODE = mode || lastMode || L.ENDLESS;
    lastMode = MODE;
    A.init();
    runStats = {seconds:0,kills:0,bosses:0,weapon:0,emp:0,reflect:0,synergyDamage:0,empUses:0,cleared:0,combo:0,refund:0,healing:0,sustainKills:0,cause:"未知"};
    encounter = "编队接近";
    player = E.createPlayer(W, H, DFJ.Hangar ? DFJ.Hangar.selected() : 'falcon', DFJ.Hangar && DFJ.Hangar.selectedWeapon ? DFJ.Hangar.selectedWeapon() : 'pulse');
    player.lives = L.difficultyPreset(DIFFICULTY).lives; /* 难度决定命数 */
    enemies = []; boss = null; bossKilled = false; powerups = [];
    pbullets.clear(); ebullets.clear(); particles.clear();
    wave = 0; level = 1; levelWave = 0;
    score = 0; combo = 0; lastKillAt = -1;
    spawnSeq = []; spawnTimer = 0; shake = 0;
    rogueChoices = [];
    empCdUntil = 0; empWave = null;
    nextWave();
    STATE = 'playing';
    setPanel('none');
    updateHUD();
  }

  function gameOver() {
    STATE = 'gameover';
    A.play('over');
    saveHi();
    var isNew = score >= hiScore && score > 0;
    dom['final-score'].textContent = String(score);
    dom['new-record'].classList.toggle('hidden', !isNew);
    showSummary('run-over');
    setPanel('panel-over');
  }

  function victory() {
    STATE = 'victory';
    A.play('victory');
    saveHi();
    var isNew = score >= hiScore && score > 0;
    dom['victory-score'].textContent = String(score);
    dom['victory-record'].classList.toggle('hidden', !isNew);
    showSummary('run-victory');
    setPanel('panel-victory');
  }

  /* 返回主菜单(不丢最高分):清空战局并回到模式选择 */
  function goMenu() {
    STATE = 'start';
    player = null;
    enemies = []; boss = null; bossKilled = false; powerups = [];
    pbullets.clear(); ebullets.clear(); particles.clear();
    spawnSeq = []; rogueChoices = [];
    score = 0; combo = 0;
    wave = 0; level = 1; levelWave = 0;
    setPanel('panel-start');
    updateHUD();
  }

  /* ---- 肉鸽升级三选一 ---- */
  function openUpgrade() {
    ebullets.clear(); /* 清残余敌弹,避免升级面板结束后残留伤害 */
    rogueChoices = L.rogueRoll(player, 3, Math.random);
    dom['build-progress'].textContent = L.SYNERGIES.map(function(x){return (x.ready(player)?'✓ 已激活 · ':L.synergyProgress(player,x.id)+'/2 · ')+x.name+'：'+x.desc;}).join('\n');
    var host = dom['upgrade-cards'];
    host.innerHTML = '';
    for (var i = 0; i < rogueChoices.length; i++) {
      (function (perk) {
        var card = document.createElement('button');
        card.className = 'perk-card';
        card.innerHTML = '<span class="perk-label">' + perk.label + '</span><span class="perk-desc">' + perk.desc + '</span>';
        var future = L.rogueApply(player,perk.id);
        var unlock = L.synergies(future).filter(function(x){return !x.ready(player);});
        if (unlock.length) card.innerHTML += '<span class="perk-unlock">激活：'+unlock.map(function(x){return x.name;}).join(' / ')+'</span>';
        card.addEventListener('click', function () { choosePerk(perk.id); });
        host.appendChild(card);
      })(rogueChoices[i]);
    }
    STATE = 'upgrade';
    setPanel('panel-upgrade');
  }

  function choosePerk(id) {
    var s = L.rogueApply(player, id);
    player.weapon = s.weapon; player.shield = s.shield; player.hp = s.hp; player.hpMax = s.hpMax;
    player.lives = s.lives; player.fireRate = s.fireRate; player.damage = s.damage;
    player.spread = s.spread; player.speedMul = s.speedMul; player.scoreMul = s.scoreMul;
    player.crit = s.crit; player.critDmg = s.critDmg; player.magnet = s.magnet;
    player.reflect = s.reflect; player.vamp = s.vamp; player.emp = s.emp;
    A.play('pickup');
    STATE = 'playing';
    setPanel('none');
    nextWave();
    updateHUD();
  }

/* ---- v1.2 主动技能: EMP 电磁脉冲 ----
   * 冷却 10s;范围伤害+眩晕+清屏敌弹 */
  function triggerEMP() {
    if (STATE !== 'playing' || !player) return;
    if (now < empCdUntil) return;
    runStats.empUses++; var killsBefore = runStats.kills;
    var pm = L.empParams(player.emp, Math.min(W, H));
    empCdUntil = now + L.EMP_COOLDOWN * 1000;
    empWave = { x: player.x, y: player.y, maxR: pm.radius, t: 0, dur: 0.5 };
    var i, e;
    // Disable support links before applying any EMP damage, regardless of array order.
    enemies.forEach(function(g){if(g.type==='guardian'&&!g.dead&&Math.hypot(g.x-player.x,g.y-player.y)<=pm.radius)g.__stunUntil=now+pm.stun*1000;});
    /* 范围内敌机伤害+眩晕 */
    for (i = enemies.length - 1; i >= 0; i--) {
      e = enemies[i];
      if (e.dead || e.warning>0) continue;
      var dx = e.x - player.x, dy = e.y - player.y;
      if (dx * dx + dy * dy <= pm.radius * pm.radius) {
        dealDamage(e, pm.dmg, "emp", 0); e.flash = 0.12;
        e.__stunUntil = now + pm.stun * 1000;
        if (e.hp <= 0) { e.dead = true; killEnemy(e); enemies.splice(i, 1); }
      }
    }
    if (boss && !boss.dead) {
      (boss.turrets||[]).forEach(function(t){var pos=L.turretPosition(boss,t);if(t.hp>0&&Math.hypot(pos.x-player.x,pos.y-player.y)<=pm.radius)runStats.emp+=L.damageTurret(boss,t,pm.dmg*.35);});
      var bdx = boss.x - player.x, bdy = boss.y - player.y;
      if (bdx * bdx + bdy * bdy <= pm.radius * pm.radius) {
        dealDamage(boss, pm.dmg * 0.35 * L.bossDamageScale(boss), "emp", 0); boss.flash = 0.12;
        boss.fireCd += pm.stun * 0.6;  /* Boss 免疫全额眩晕,延长射击间隔 */
        if (boss.hp <= 0) { boss.dead = true; killEnemy(boss); boss = null; bossKilled = true; }
      }
    }
    /* 清除全场敌弹 */
    ebullets.forEach(function (b) { if (!b.dead) runStats.cleared++; b.dead = true; });
    if (L.hasSynergy(player,'pulse')) {
      var refund = Math.min(3, (runStats.kills-killsBefore)*0.6);
      empCdUntil -= refund*1000; runStats.refund += refund;
    }
    A.play('bigBoom');
    shake = Math.max(shake, 10);
    burst(player.x, player.y, R.C.cyan, 24, 220);
  }

  function pause() {
    if (STATE !== 'playing') return;
    STATE = 'paused';
    A.stopMusic();
    setPanel('panel-pause');
  }
  function resume() {
    if (STATE !== 'paused') return;
    STATE = 'playing';
    setPanel('none');
  }

  /* ---- 输入 ---- */
  function bindInput() {
    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if (k === 'p' || k === 'escape') {
        if (STATE === 'playing') pause(); else if (STATE === 'paused') resume();
      }
      if (k === 'e') triggerEMP();
      if (k === 'enter' && e.target && e.target.closest && e.target.closest('button,summary,input,select,textarea')) return;
      if (k === 'enter') {
        if (STATE === 'start') startGame(lastMode || L.ENDLESS);
        else if (STATE === 'gameover' || STATE === 'victory') startGame(lastMode || L.ENDLESS);
      }
      keys[k] = true;
      if (STATE === 'playing' && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

    flightInput = DFJ.Input.bind(canvas, pointer, function () { return STATE === 'playing'; });

    /* 模式选择按钮 */
    var modeBtns = document.querySelectorAll('.mode-btn');
    for (var mi = 0; mi < modeBtns.length; mi++) {
      modeBtns[mi].addEventListener('click', function () {
        A.init();
        lastMode=this.getAttribute('data-mode');
        if(DFJ.Hangar)DFJ.Hangar.mode(lastMode);
        for(var k=0;k<modeBtns.length;k++){var active=modeBtns[k]===this;modeBtns[k].classList.toggle('active',active);modeBtns[k].setAttribute('aria-pressed',String(active));}
      });
    }
    document.getElementById('btn-launch').addEventListener('click',startBtn);
    document.getElementById('btn-resume').addEventListener('click', resume);
    document.getElementById('btn-pause-restart').addEventListener('click', function () { startGame(lastMode || L.ENDLESS); });
    document.getElementById('btn-pause-menu').addEventListener('click', goMenu);
    document.getElementById('btn-restart').addEventListener('click', function () { startGame(lastMode || L.ENDLESS); });
    document.getElementById('btn-menu-over').addEventListener('click', goMenu);
    document.getElementById('btn-victory-restart').addEventListener('click', function () { startGame(lastMode || L.ENDLESS); });
    document.getElementById('btn-menu-victory').addEventListener('click', goMenu);
    /* v1.2: EMP 技能按钮(右下角) */
    empBtn = document.getElementById('btn-emp');
    if (empBtn) DFJ.Input.action(empBtn, triggerEMP);
    DFJ.Input.action(pauseBtn, function () {
      if (STATE === 'playing') pause();
      else if (STATE === 'paused') resume();
    });

    /* 难度选择按钮 */
    var diffBtns = document.querySelectorAll('.diff-btn');
    for (var di = 0; di < diffBtns.length; di++) {
      diffBtns[di].addEventListener('click', function () {
        DIFFICULTY = this.getAttribute('data-diff');
        syncDiffBtns();
        if(DFJ.Hangar)DFJ.Hangar.difficulty(DIFFICULTY);
        A.play('pickup');
      });
    }

    window.addEventListener('blur', function () { if (STATE === 'playing') pause(); });
    window.addEventListener('resize', resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(function () { layoutDirty = true; layoutBattlefield(); }).observe(dom['hud']);
  }

  function startBtn() { A.init(); startGame(lastMode || L.ENDLESS); }
  function syncDiffBtns() {
    var diffBtns = document.querySelectorAll('.diff-btn');
    for (var i = 0; i < diffBtns.length; i++) {
      diffBtns[i].classList.toggle('active', diffBtns[i].getAttribute('data-diff') === DIFFICULTY);
    }
  }

  /* ---- 玩家移动 ---- */
  function movePlayer(dt) {
    var speed = player.speed * player.speedMul;
    var kx = 0, ky = 0;
    if (keys['a'] || keys['arrowleft']) kx -= 1;
    if (keys['d'] || keys['arrowright']) kx += 1;
    if (keys['w'] || keys['arrowup']) ky -= 1;
    if (keys['s'] || keys['arrowdown']) ky += 1;

    if (kx || ky) {
      var d = Math.sqrt(kx * kx + ky * ky);
      player.x += (kx / d) * speed * dt;
      player.y += (ky / d) * speed * dt;
      pointer.active = false;
    } else if (pointer.active) {
      var dx = pointer.x - player.x, dy = pointer.y - player.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.5) {
        /* 与键盘共用机体速度上限，接近目标时指数平滑。 */
        var f = Math.min(1 - Math.exp(-20 * dt), speed * dt / dist);
        player.x += dx * f;
        player.y += dy * f;
      }
    }

    player.x = U.clamp(player.x, player.r + 4, W - player.r - 4);
    player.y = U.clamp(player.y, Math.min(hudBottom + player.r + 4, H - player.r - 4), H - player.r - 4);

    /* 自动开火 */
    player.fireCd -= dt;
    while (player.fireCd <= 0) {
      var rate = player.fireRate * (player.rageUntil > now ? 2 : 1); /* v1.2 狂暴射速x2 */
      player.fireCd += (player.weapon === 1 ? 0.16 : player.weapon === 2 ? 0.14 : 0.11) * L.weaponPreset(player.weaponId).interval / rate;
      playerFire();
    }
  }

  /* ---- 更新 ---- */
  function update(dt) {
    now = performance.now();
    if (STATE !== 'playing') return;

    runStats.seconds += dt;
    dom["hud-build"].textContent = encounter + (MODE === L.ROGUELIKE ? " · " + (L.synergies(player).map(function(x){return x.name;}).join(" / ") || "组合待成型") : "");
    movePlayer(dt);
    gridOff += 40 * dt;
    R.updateStars(stars, dt, H);

    /* 生成敌机 */
    spawnTimer -= dt;
    if (spawnTimer <= 0 && spawnSeq.length) {
      spawnFromSeq();
      spawnTimer = waveSpawnInterval / 1000 * spawnGap;
    }

    /* 更新敌机 */
    var frostOn = player.frostUntil > now;
    var frostMul = frostOn ? 0.45 : 1;   /* 冰霜: 敌机速度 x0.45 */
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (e.dead) { enemies.splice(i, 1); continue; } /* 已被击杀/撞击,仅移除 */
      if (e.__stunUntil > now) {
        /* EMP 眩晕: 停止移动与开火 */
        if (e.flash > 0) e.flash -= dt;
        continue;
      }
      E.updateEnemy(e, dt * frostMul, W, H, player.x, player.y, hudBottom);
      if (e.dead) { enemies.splice(i, 1); continue; } /* 越界逃逸,移除(不计分) */
      if (E.prepareEnemyShot(e, dt * frostMul, H, player.y, hudBottom)) enemyShoot(e);
      if (e.type === 'healer') e.fireCd -= dt * frostMul;
      if (e.type === 'healer' && e.fireCd <= 0) {
        /* v1.2 治疗者: 为半径 140 内友军回复 2 HP */
        e.fireCd = 2.6;
        var healed = 0;
        for (var hi = enemies.length - 1; hi >= 0; hi--) {
          var he = enemies[hi];
          if (he === e || he.dead) continue;
          var hdx = he.x - e.x, hdy = he.y - e.y;
          if (hdx * hdx + hdy * hdy <= 140 * 140 && he.hp < he.hp0) {
            he.hp = Math.min(he.hp0, he.hp + 2);
            he.flash = 0.1; healed++;
            burst(he.x, he.y, R.C.green, 4, 60);
          }
        }
        if (healed) { e.healAt=e.t; A.play('pickup'); }
      }
    }

    E.updateShields(enemies,now);

    /* Boss 登场 (在清理死敌机之后,避免时序错位漏触发;该波 Boss 已死则不再登场) */
    if (boss === null && !bossKilled && spawnSeq.length === 0 && !enemies.some(function(e){return !e.dead&&!e.optional;})) {
      var bossHp = currentBossHp();
      if (bossHp > 0) {
        /* v1.2: 按图鉴轮换 Boss 种类(第 N 个 Boss = bossOf(N-1)) */
        var ordinal;
        if (MODE === L.CAMPAIGN) {
          ordinal = Math.max(0, level - 1);
        } else {
          ordinal = Math.max(0, Math.floor(wave / 5) - 1);
        }
        var entry = L.bossOf(Math.max(0, ordinal));
        boss = E.spawnBoss(W, { bossHp: bossHp, kind: entry.id, difficulty: DIFFICULTY });
        boss.maxHp = boss.hp;
        A.play('boss');
      }
    }

    /* 更新 Boss */
    if (boss) {
      boss.phase = L.bossPhase(boss.hp / boss.maxHp);
      boss.recovery = Math.max(0, (boss.recovery || 0) - dt);
      if (!boss.pending) E.updateBoss(boss, dt, W);
      else {
        boss.t += dt;
        boss.flash = Math.max(0, boss.flash - dt);
      }
      boss.fireCd -= dt;
      if (boss.y >= boss.targetY && boss.fireCd <= 0) {
        if (boss.pending) bossShoot(boss);
        else {
          if (boss.kind === 'phantom') {
            burst(boss.x, boss.y, R.C.red, 14, 180);
            boss.x = W * ((boss.attackIndex || 0) % 2 ? 0.25 : 0.75);
            burst(boss.x, boss.y, R.C.red, 14, 180);
          }
          boss.pending = L.bossAttack(boss, W, player.x, player.y);
          boss.fireCd = boss.pending.warning;
        }
      }
      if (boss.dead) { boss = null; bossKilled = true; }
    }

    /* 更新玩家子弹 */
    pbullets.forEach(function (b) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -20 || b.x < -20 || b.x > W + 20) b.dead = true;
    });

    /* 更新敌弹(v1.2: 冰霜减速) */
    var ebDt = dt * (player.frostUntil > now ? 0.45 : 1);
    ebullets.forEach(function (b) {
      b.x += b.vx * ebDt; b.y += b.vy * ebDt;
      if (b.y > H + 20 || b.y < -20 || b.x < -20 || b.x > W + 20) b.dead = true;
    });

    /* 玩家子弹命中 */
    pbullets.forEach(function (b) {
      if (b.dead) return;
      for (var j = enemies.length - 1; j >= 0; j--) {
        var en = enemies[j];
        if (!en.dead && !(en.warning>0) && !en.ghosted && L.circleHit(b.x, b.y, b.r, en.x, en.y, en.r)) {
          dealDamage(en, b.dmg || player.damage, b.source || "weapon", b.bonus); b.dead = true;
          en.flash = 0.08;
          if (en.hp <= 0) { en.dead = true; killEnemy(en); }
          break;
        }
      }
      if(!b.dead&&boss&&!boss.dead&&boss.turrets){
        boss.turrets.forEach(function(t){var pos=L.turretPosition(boss,t);
          if(!b.dead&&t.hp>0&&L.circleHit(b.x,b.y,b.r,pos.x,pos.y,t.r)){
            var amount=b.dmg||player.damage,actual=L.damageTurret(boss,t,amount);
            runStats[b.source||'weapon']+=actual;runStats.synergyDamage+=actual*(b.bonus||0)/amount;b.dead=true;
            if(t.hp===0){burst(pos.x,pos.y,R.C.orange,18,140);A.play('boom');}
          }
        });
      }
      if (!b.dead && boss && !boss.dead && L.circleHit(b.x, b.y, b.r, boss.x, boss.y, boss.r)) {
        /* 移动堡垒重甲:受到伤害 ×0.6 */
        dealDamage(boss, (b.dmg || player.damage) * L.bossDamageScale(boss), b.source || "weapon", (b.bonus || 0)*L.bossDamageScale(boss));
        b.dead = true; boss.flash = 0.08;
        if (boss.hp <= 0) { boss.dead = true; killEnemy(boss); boss = null; bossKilled = true; }
      }
    });

    /* 敌弹命中玩家 */
    ebullets.forEach(function (b) {
      if (!b.dead && L.circleHit(b.x, b.y, b.r, player.x, player.y, player.r)) {
        b.dead = true; hurtPlayer("敌方弹幕");
      }
    });

    /* v1.2.4: 对象池回收 — 每帧释放死亡子弹/粒子,防止 active 数组无限膨胀 */
    pbullets.releaseAll(function (b) { return !b.dead; });
    ebullets.releaseAll(function (b) { return !b.dead; });

    /* 敌机撞击玩家 */
    for (var k = enemies.length - 1; k >= 0; k--) {
      var ee = enemies[k];
      if (!ee.dead && !ee.optional && L.circleHit(ee.x, ee.y, ee.r, player.x, player.y, player.r)) {
        ee.dead = true; burst(ee.x, ee.y, R.C.magenta, 10, 160); A.play('boom'); hurtPlayer('敌机碰撞');
      }
    }
    if (boss && !boss.dead && L.circleHit(boss.x, boss.y, boss.r, player.x, player.y, player.r)) {
      hurtPlayer("Boss 碰撞");
    }

    /* 道具 */
    for (var m = powerups.length - 1; m >= 0; m--) {
      var p = powerups[m];
      E.updatePowerup(p, dt, H);
      if (p.dead) { powerups.splice(m, 1); continue; }
      /* v1.2: 磁力收集 — magnet perk 吸附范围内道具 */
      var magR = player.r + (player.magnet || 0) * 60;
      if (!p.dead && magR > player.r) {
        var mdx = player.x - p.x, mdy = player.y - p.y;
        var md = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < magR && md > 1) {
          var pull = 260 * dt;
          p.x += (mdx / md) * pull;
          p.y += (mdy / md) * pull;
        }
      }
      if (L.circleHit(p.x, p.y, p.r, player.x, player.y, player.r)) {
        applyPowerup(p); powerups.splice(m, 1);
      }
    }

    /* v1.2: EMP 冲击波动画 */
    if (empWave) {
      empWave.t += dt;
      var prog = empWave.t / empWave.dur;
      R.drawEmpWave(ctx, empWave.x, empWave.y, empWave.maxR, prog);
      if (prog >= 1) empWave = null;
    }

    /* 粒子 */
    particles.forEach(function (p) { E.updateParticle(p, dt); });
    particles.releaseAll(function (p) { return !p.dead; });

    if (STATE !== "playing") return;
    /* 波次推进 */
    /* 波次推进:Boss 已死则立即推进(无视残留的召唤杂兵) */
    if ((STATE === 'playing' && bossKilled) || parentWaveClear()) {
      bossKilled = false;
      if (MODE === L.ROGUELIKE && wave > 0 && wave % L.ROGUE_WAVES_PER_PERK === 0) {
        openUpgrade(); /* 每 3 波触发三选一,选中后 nextWave */
      } else {
        nextWave();
      }
    }

    updateHUD();
  }

  function parentWaveClear() {
    if (STATE !== 'playing') return false;
    if (spawnSeq.length) return false;
    if (enemies.some(function(e){return !e.dead&&!e.optional;})) return false;
    if (boss) return false;
    if (currentBossHp()>0 && !bossKilled) return false;
    return true;
  }

  /* ---- 渲染 ---- */
  function draw() {
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      shake = Math.max(0, shake - 0.6);
    }

    R.drawBackground(ctx, W, H, stars, gridOff);

    /* 道具 */
    for (var i = 0; i < powerups.length; i++) {
      var p = powerups[i];
      R.drawC(ctx, R.sprite('pu' + p.kind), p.x, p.y);
    }

    /* 敌机 */
    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j];
      if (e.flash > 0 && Math.floor(e.flash * 20) % 2 === 0) continue;
      if (e.aimLock || (e.type === 'diver' && e.charge > 0)) {
        var hint = e.aimLock || {x:e.x,y:e.y,angle:e.diveAngle};
        ctx.save(); ctx.strokeStyle = R.C.red; ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5; ctx.setLineDash([5, 7]); ctx.beginPath();
        if (e.type === 'bomber') ctx.arc(hint.x, hint.y, 34, 0, Math.PI * 2);
        else {
          ctx.moveTo(hint.x, hint.y);
          ctx.lineTo(hint.x + Math.cos(hint.angle) * H, hint.y + Math.sin(hint.angle) * H);
        }
        ctx.stroke(); ctx.restore();
      }
      /* v1.2: phantom 相位闪烁 — 1.2s 周期,相位态半透明且不可被命中 */
      if (e.type === 'phantom') {
        var cyc = e.phaseT % 2.4;
        e.ghosted = cyc > 1.5;           /* 0.9s 实体 / 相位透明 */
        if (e.ghosted) ctx.globalAlpha = 0.25;
      }
      if (e.elite) {
        /* 精英怪:品红外圈 + 血条 */
        ctx.save();
        ctx.strokeStyle = 'rgba(255,0,229,0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = R.C.magenta; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        var ratio = Math.max(0, e.hp / e.hp0);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x - 16, e.y - e.r - 14, 32, 4);
        ctx.fillStyle = R.C.magenta;
        ctx.fillRect(e.x - 16, e.y - e.r - 14, 32 * ratio, 4);
      }
      if(e.protectedBy&&E.shieldScale(e,now)<1){
        ctx.save();ctx.strokeStyle=R.C.cyan;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.protectedBy.x,e.protectedBy.y);ctx.stroke();ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
      R.drawSupportEffect(ctx,e,now);
      if(e.type==='transport'&&e.warning>0){
        ctx.save();ctx.fillStyle=R.C.yellow;ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('补给运输机 '+(e.side<0?'→':'←'),e.side<0?70:W-70,e.y-26);ctx.restore();
      } else R.drawEnemy(ctx,e,now);
      if (e.type === 'phantom' && e.ghosted) ctx.globalAlpha = 1;
    }

    /* Boss */
    if (boss) {
      if (!(boss.flash > 0 && Math.floor(boss.flash * 20) % 2 === 0)) {
        R.drawBoss(ctx,boss);
      }
      if (boss.pending) {
        ctx.save();
        ctx.strokeStyle = R.C.red;
        ctx.globalAlpha = 0.25 + 0.3 * Math.max(0, 1 - boss.fireCd / boss.pending.warning);
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 10]);
        boss.pending.shots.forEach(function (s) {
          var speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1;
          ctx.beginPath(); ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + s.vx / speed * H * 1.5, s.y + s.vy / speed * H * 1.5);
          ctx.stroke();
        });
        ctx.restore();
      }

    }

    /* 子弹 */
    pbullets.forEach(function (b) { if (!b.dead) R.drawPlayerShot(ctx,b); });
    ebullets.forEach(function (b) {
      if (b.dead) return;
      var img = R.sprite('eb');
      if (b.r > 4.5) {
        /* v1.2.3: 大口径弹按半径缩放渲染 */
        var s = b.r / 5;
        ctx.drawImage(img, b.x - img.width * s / 2, b.y - img.height * s / 2, img.width * s, img.height * s);
      } else {
        R.drawC(ctx, img, b.x, b.y);
      }
    });

    /* 粒子 */
    particles.forEach(function (p) {
      var a = U.clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    });

    /* 玩家 */
    if (player) {
      if (!(player.invUntil > now && Math.floor(now / 90) % 2 === 0)) {
        R.drawPlayer(ctx,player,now/1000);
      }
    }

    ctx.restore();
  }

  /* ---- 主循环 ---- */
  var lastT = 0;
  function loop(ts) {
    var dt = Math.min((ts - lastT) / 1000, 0.05); /* 钳制防切页跳帧 */
    lastT = ts;
    if (dt > 0) update(dt);
    layoutBattlefield();
    A.updateMusic(STATE === 'playing' && boss ? boss.kind : null, boss ? boss.phase : 1);
    draw();
    if(STATE==='start'&&DFJ.Hangar)DFJ.Hangar.draw(now/1000);
    requestAnimationFrame(loop);
  }

  /* ---- 错误收集 ---- */
  window.__DFJ_ERRORS = [];
  window.addEventListener('error', function (e) {
    window.__DFJ_ERRORS.push(String(e.message || e.error));
  });

  /* ---- 自动化测试探针(只读快照,不影响游戏逻辑;生产环境无调用方,零开销) ---- */
  window.__DFJ_PROBE = {
    state: function () {
      return {
        STATE: STATE, mode: MODE, wave: wave, level: level, levelWave: levelWave,
        bossKilled: bossKilled,
        boss: boss ? { kind: boss.kind, hp: boss.hp, maxHp: boss.maxHp, x: boss.x, y: boss.y, phase: boss.phase, dead: boss.dead, blinkT: boss.blinkT } : null,
        enemies: enemies.map(function (e) { return { type: e.type, x: e.x, y: e.y, hp: e.hp }; }),
        spawnSeqLen: spawnSeq.length,
        ebulletCount: function () { var n = 0; ebullets.forEach(function (b) { if (!b.dead) n++; }); return n; }(),
        ebulletPool: ebullets.active.length,
        pbulletPool: pbullets.active.length,
        player: player ? { x: player.x, y: player.y, hp: player.hp, lives: player.lives, rage: !!(player.rageUntil > now), frost: !!(player.frostUntil > now) } : null,
        empCdLeft: Math.max(0, empCdUntil - now),
        hudWave: dom['hud-wave'] ? dom['hud-wave'].textContent : ''
      };
    },
    /* 测试辅助:无敌/秒伤分开控制,便于复现“二阶段召唤杂兵在场时击杀 boss” */
    godmode: function (on) {
      if (player) player.invUntil = on ? 1e15 : 0;
    },
    oneshot: function (on) {
      if (player) player.damage = on ? 999 : 1;
    },
    /* 测试辅助:直接生成指定 kind 的 Boss(仅测试环境调用) */
    debugSpawnBoss: function (kind, phase) {
      startGame(L.ENDLESS);
      spawnSeq = []; enemies = [];
      boss = E.spawnBoss(W, { bossHp: 60, kind: kind || 'boss', difficulty: DIFFICULTY });
      boss.y = boss.targetY;
      if (phase === 2) boss.hp = Math.round(boss.maxHp * 0.35); /* 压血线让 bossPhase 判定进入二阶段 */
      return { kind: boss.kind, name: boss.name, hp: boss.hp, phase: boss.phase };
    }
  };

  /* ---- 启动 ---- */
  cacheDom();
  resize();
  loadHi();
  bindInput();
  syncDiffBtns();
  R.init();
  if(DFJ.Hangar)DFJ.Hangar.init();
  setPanel('panel-start');
  updateHUD();
  requestAnimationFrame(function (ts) { lastT = ts; loop(ts); });
})();