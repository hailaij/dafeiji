/* NEON STRIKE - game.js : 游戏循环(rAF) / 状态机 / 输入 / 碰撞调度 / HUD
 * 依赖加载顺序: core → logic → entities → audio → render → game
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
  var wave = 0, spawnSeq = [], spawnTimer = 0;
  var MODE = L.ENDLESS; /* endless | campaign | roguelike */
  var DIFFICULTY = 'normal'; /* easy | normal | hard */
  var level = 0, levelWave = 0, levelPlan = [], campaignClearT = -1;
  var rogueChoices = [];
  var lastMode = L.ENDLESS;
  var score = 0, combo = 0, lastKillAt = -1;
  var hiScore = 0;
  var pointer = { active: false, x: 0, y: 0 };
  var keys = {};
  var shake = 0;

  var dom = {};
  var HISCORE_KEY = 'neon-strike-hiscore';
  var pauseBtn;

  /* ---- 对象池构造器 ---- */
  function makeBullet() {
    return { x: 0, y: 0, vx: 0, vy: 0, r: 3, dead: false };
  }
  function makeParticle() {
    return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, grav: false, color: '#fff', size: 2, dead: false };
  }

  /* ---- DOM / HUD ---- */
  function cacheDom() {
    var ids = ['hud-score', 'hud-wave', 'hud-combo', 'hud-weapon', 'hud-shield', 'hud-lives', 'hud-hp',
      'overlay', 'panel-start', 'panel-pause', 'panel-over', 'panel-victory', 'panel-upgrade',
      'final-score', 'victory-score', 'new-record', 'victory-record', 'btn-mute', 'mode-tag', 'upgrade-cards'];
    for (var i = 0; i < ids.length; i++) dom[ids[i]] = document.getElementById(ids[i]);
    pauseBtn = document.getElementById('btn-pause');
  }

  function pad(n, w) { var s = String(Math.floor(n)); while (s.length < (w || 6)) s = '0' + s; return s; }

  function updateHUD() {
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
    dom['hud-weapon'].textContent = 'PWR ' + player.weapon;
    dom['hud-shield'].textContent = 'SHIELD ' + player.shield;
    dom['hud-lives'].textContent = 'LIVES ' + player.lives;
    dom['hud-hp'].textContent = 'HP ' + player.hp + '/' + player.hpMax;
  }

  function setPanel(name) {
    dom['overlay'].classList.toggle('hidden', name === 'none');
    ['panel-start', 'panel-pause', 'panel-over', 'panel-victory', 'panel-upgrade'].forEach(function (p) {
      dom[p].classList.toggle('hidden', p !== name);
    });
    /* 暂停按钮只在 playing 状态显示 */
    if (pauseBtn) pauseBtn.style.display = (STATE === 'playing') ? '' : 'none';
  }

  /* ---- 尺寸 / DPR ---- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    stars = R.makeStars(W, H);
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
    return seq;
  }

  /* 当前波难度 */
  function currentDiff() {
    if (MODE === L.CAMPAIGN) return L.difficulty(level * 2, DIFFICULTY);
    if (MODE === L.ROGUELIKE) return L.difficulty(wave + 2, DIFFICULTY); /* 肉鸽起步即更凶 */
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
    var type = spawnSeq.shift();
    enemies.push(E.spawnEnemy(type, W, currentDiff()));
  }

  /* ---- 射击 ---- */
  function firePlayerBullet(x, y, vx, vy) {
    var b = pbullets.obtain();
    b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.r = 3; b.dead = false;
  }

  function playerFire() {
    var sp = 560;
    if (player.weapon === 1) {
      firePlayerBullet(player.x, player.y - 16, 0, -sp);
    } else if (player.weapon === 2) {
      firePlayerBullet(player.x - 7, player.y - 12, 0, -sp);
      firePlayerBullet(player.x + 7, player.y - 12, 0, -sp);
    } else {
      firePlayerBullet(player.x - 8, player.y - 12, 0, -sp);
      firePlayerBullet(player.x + 8, player.y - 12, 0, -sp);
      firePlayerBullet(player.x - 16, player.y - 8, -sp * 0.28, -sp * 0.96);
      firePlayerBullet(player.x + 16, player.y - 8, sp * 0.28, -sp * 0.96);
    }
    /* 肉鸽 spread:额外外斜弹道 */
    for (var s = 0; s < (player.spread || 0); s++) {
      var off = 22 + s * 8;
      var ang = 0.42 + s * 0.14;
      firePlayerBullet(player.x - off, player.y - 8, -sp * Math.sin(ang), -sp * Math.cos(ang));
      firePlayerBullet(player.x + off, player.y - 8, sp * Math.sin(ang), -sp * Math.cos(ang));
    }
    A.play('shoot');
  }

  function fireEnemyBullet(x, y, vx, vy) {
    var b = ebullets.obtain();
    b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.r = 4; b.dead = false;
  }

  function aimAtPlayer(x, y, speed) {
    var dx = player.x - x, dy = player.y - y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    fireEnemyBullet(x, y, dx / d * speed, dy / d * speed);
  }

  function enemyShoot(e) {
    if (e.type === 'gunner') {
      aimAtPlayer(e.x, e.y + 10, 220);
      A.play('enemyShoot');
    } else if (e.type === 'sniper') {
      /* 三连发瞄准弹:直射 + 左右小偏移 */
      aimAtPlayer(e.x, e.y + 8, 300);
      var sp = 300;
      var dx = player.x - e.x, dy = player.y - (e.y + 8);
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var base = Math.atan2(dy, dx);
      fireEnemyBullet(e.x, e.y + 8, Math.cos(base + 0.16) * sp, Math.sin(base + 0.16) * sp);
      fireEnemyBullet(e.x, e.y + 8, Math.cos(base - 0.16) * sp, Math.sin(base - 0.16) * sp);
      A.play('enemyShoot');
    }
  }

  function bossShoot(b) {
    var n = b.phase === 1 ? 5 : 9;
    var sp = b.phase === 1 ? 210 : 260;
    var base = Math.PI / 2; /* 朝下 */
    var spread = Math.PI * 0.5;
    for (var i = 0; i < n; i++) {
      var ang = base - spread / 2 + (spread * i) / (n - 1);
      fireEnemyBullet(b.x, b.y + 30, Math.cos(ang) * sp, Math.sin(ang) * sp);
    }
    if (b.phase === 2) {
      aimAtPlayer(b.x, b.y + 20, 280);
      if (b.summonT > 3 && enemies.length < 6) {
        b.summonT = 0;
        enemies.push(E.spawnEnemy('grunt', W, currentDiff()));
      }
    }
    A.play('boss');
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

  function killEnemy(e) {
    e.dead = true;
    var color = e.type === 'boss' ? R.C.magenta : R.C.magenta;
    burst(e.x, e.y, color, e.type === 'boss' ? 42 : 14, e.type === 'boss' ? 260 : 180);
    if (e.type === 'boss') A.play('bigBoom'); else A.play('boom');
    shake = Math.max(shake, e.type === 'boss' ? 12 : 4);

    combo = L.nextCombo(combo, now, lastKillAt).combo;
    lastKillAt = now;
    score += Math.round(L.scoreKill(e.score || 0, combo) * (player.scoreMul || 1) * currentDiff().scoreMul);

    /* 道具掉落 */
    if (e.type === 'boss') { dropPowerup(e.x, e.y, true); }
    else if (e.type === 'splitter') {
      /* 分裂成两个小 grunt */
      for (var s = -1; s <= 1; s += 2) {
        var mini = E.spawnEnemy('grunt', W, currentDiff());
        mini.x = U.clamp(e.x + s * 16, mini.r + 4, W - mini.r - 4);
        mini.y = e.y;
        enemies.push(mini);
      }
    }
    else if (Math.random() < 0.14) { dropPowerup(e.x, e.y, false); }
  }

  function dropPowerup(x, y, force) {
    var kinds = ['W', 'S', 'H'];
    var kind = force
      ? (player.hp < player.hpMax ? 'H' : 'W')
      : kinds[Math.floor(Math.random() * kinds.length)];
    powerups.push(E.spawnPowerup(x, y, kind));
  }

  function applyPowerup(p) {
    p.dead = true;
    var r = L.applyPowerup(player, p.kind, player.hpMax);
    player.weapon = r.weapon; player.shield = r.shield; player.hp = r.hp;
    A.play('pickup');
    burst(p.x, p.y, R.C.yellow, 12, 140);
  }

  function hurtPlayer() {
    if (player.invUntil > now) return;
    if (player.shield > 0) {
      player.shield--;
      player.invUntil = now + 0.8;
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
      player.invUntil = now + 1.6;
      player.weapon = Math.max(1, player.weapon - 1);
      player.shield = 0;
    } else {
      player.invUntil = now + 0.8;
    }
  }

  /* ---- 状态机 ---- */
  function startGame(mode) {
    MODE = mode || lastMode || L.ENDLESS;
    lastMode = MODE;
    A.init();
    player = E.createPlayer(W, H);
    player.lives = L.difficultyPreset(DIFFICULTY).lives; /* 难度决定命数 */
    enemies = []; boss = null; bossKilled = false; powerups = [];
    pbullets.clear(); ebullets.clear(); particles.clear();
    wave = 0; level = 1; levelWave = 0;
    score = 0; combo = 0; lastKillAt = -1;
    spawnSeq = []; spawnTimer = 0; shake = 0;
    rogueChoices = [];
    nextWave();
    setPanel('none');
    STATE = 'playing';
    updateHUD();
  }

  function gameOver() {
    STATE = 'gameover';
    A.play('over');
    saveHi();
    var isNew = score >= hiScore && score > 0;
    dom['final-score'].textContent = String(score);
    dom['new-record'].classList.toggle('hidden', !isNew);
    setPanel('panel-over');
  }

  function victory() {
    STATE = 'victory';
    A.play('victory');
    saveHi();
    var isNew = score >= hiScore && score > 0;
    dom['victory-score'].textContent = String(score);
    dom['victory-record'].classList.toggle('hidden', !isNew);
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
    var host = dom['upgrade-cards'];
    host.innerHTML = '';
    for (var i = 0; i < rogueChoices.length; i++) {
      (function (perk) {
        var card = document.createElement('button');
        card.className = 'perk-card';
        card.innerHTML = '<span class="perk-label">' + perk.label + '</span><span class="perk-desc">' + perk.desc + '</span>';
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
    A.play('pickup');
    STATE = 'playing';
    setPanel('none');
    nextWave();
    updateHUD();
  }

  function pause() {
    if (STATE !== 'playing') return;
    STATE = 'paused';
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
      if (k === 'm') { A.toggle(); syncMuteBtn(); }
      if (k === 'enter') {
        if (STATE === 'start') startGame(lastMode || L.ENDLESS);
        else if (STATE === 'gameover' || STATE === 'victory') startGame(lastMode || L.ENDLESS);
      }
      keys[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

    canvas.addEventListener('pointermove', function (e) {
      pointer.active = true;
      pointer.x = e.clientX; pointer.y = e.clientY;
      if (e.pointerType === 'touch') pointer.y -= 70; /* 手指上方偏移 */
    });
    canvas.addEventListener('pointerdown', function (e) {
      if (STATE === 'playing') {
        pointer.active = true;
        pointer.x = e.clientX; pointer.y = e.clientY - (e.pointerType === 'touch' ? 70 : 0);
      }
    });
    canvas.addEventListener('pointerleave', function () { pointer.active = false; });

    /* 模式选择按钮 */
    var modeBtns = document.querySelectorAll('.mode-btn');
    for (var mi = 0; mi < modeBtns.length; mi++) {
      modeBtns[mi].addEventListener('click', function () {
        A.init();
        startGame(this.getAttribute('data-mode'));
      });
    }
    document.getElementById('btn-resume').addEventListener('click', resume);
    document.getElementById('btn-pause-restart').addEventListener('click', function () { startGame(lastMode || L.ENDLESS); });
    document.getElementById('btn-pause-menu').addEventListener('click', goMenu);
    document.getElementById('btn-restart').addEventListener('click', function () { startGame(lastMode || L.ENDLESS); });
    document.getElementById('btn-menu-over').addEventListener('click', goMenu);
    document.getElementById('btn-victory-restart').addEventListener('click', function () { startGame(lastMode || L.ENDLESS); });
    document.getElementById('btn-menu-victory').addEventListener('click', goMenu);
    document.getElementById('btn-mute').addEventListener('click', function () { A.toggle(); syncMuteBtn(); });

    /* 暂停按钮(右上角) - 支持触屏和鼠标 */
    document.getElementById('btn-pause').addEventListener('click', function (e) {
      e.stopPropagation();
      if (STATE === 'playing') pause();
      else if (STATE === 'paused') resume();
    });

    /* 难度选择按钮 */
    var diffBtns = document.querySelectorAll('.diff-btn');
    for (var di = 0; di < diffBtns.length; di++) {
      diffBtns[di].addEventListener('click', function () {
        DIFFICULTY = this.getAttribute('data-diff');
        syncDiffBtns();
        A.play('pickup');
      });
    }

    window.addEventListener('blur', function () { if (STATE === 'playing') pause(); });
    window.addEventListener('resize', resize);
  }

  function startBtn() { A.init(); startGame(lastMode || L.ENDLESS); }
  function syncMuteBtn() {
    var b = dom['btn-mute'];
    b.classList.toggle('muted', A.isMuted());
    b.textContent = A.isMuted() ? '\u266a\u0338' : '\u266a';
  }
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
        /* 指数平滑跟随:大位移快速追上、接近时平滑减速,帧率无关,跟手不拖沓 */
        var f = Math.min(1, 20 * player.speedMul * dt);
        player.x += dx * f;
        player.y += dy * f;
      }
    }

    player.x = U.clamp(player.x, player.r + 4, W - player.r - 4);
    player.y = U.clamp(player.y, player.r + 4, H - player.r - 4);

    /* 自动开火 */
    player.fireCd -= dt;
    if (player.fireCd <= 0) {
      player.fireCd = (player.weapon === 1 ? 0.16 : player.weapon === 2 ? 0.14 : 0.11) / player.fireRate;
      playerFire();
    }
  }

  /* ---- 更新 ---- */
  function update(dt) {
    now = performance.now();
    if (STATE !== 'playing') return;

    movePlayer(dt);
    gridOff += 40 * dt;
    R.updateStars(stars, dt, H);

    /* 生成敌机 */
    spawnTimer -= dt;
    if (spawnTimer <= 0 && spawnSeq.length) {
      spawnFromSeq();
      spawnTimer = currentDiff().spawnInterval / 1000;
    }

    /* 更新敌机 */
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (e.dead) { enemies.splice(i, 1); continue; } /* 已被击杀/撞击,仅移除 */
      E.updateEnemy(e, dt, W, H, player.x, player.y);
      if (e.dead) { enemies.splice(i, 1); continue; } /* 越界逃逸,移除(不计分) */
      e.fireCd -= dt;
      if (e.type === 'gunner' && e.fireCd <= 0 && e.y > 60 && e.y < 160) {
        e.fireCd = 1.4; enemyShoot(e);
      } else if (e.type === 'sniper' && e.fireCd <= 0 && e.y > 150) {
        e.fireCd = 1.8; enemyShoot(e);
      }
    }

    /* Boss 登场 (在清理死敌机之后,避免时序错位漏触发;该波 Boss 已死则不再登场) */
    if (boss === null && !bossKilled && spawnSeq.length === 0 && enemies.length === 0) {
      var bossHp = currentBossHp();
      if (bossHp > 0) {
        boss = E.spawnBoss(W, { bossHp: bossHp });
        boss.maxHp = bossHp;
        A.play('boss');
      }
    }

    /* 更新 Boss */
    if (boss) {
      boss.phase = L.bossPhase(boss.hp / boss.maxHp);
      E.updateBoss(boss, dt, W);
      boss.fireCd -= dt;
      if (boss.y >= boss.targetY && boss.fireCd <= 0) {
        boss.fireCd = boss.phase === 1 ? 1.7 : 1.3;
        bossShoot(boss);
      }
      boss.summonT += dt;
      if (boss.dead) { boss = null; bossKilled = true; }
    }

    /* 更新玩家子弹 */
    pbullets.forEach(function (b) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -20 || b.x < -20 || b.x > W + 20) b.dead = true;
    });

    /* 更新敌弹 */
    ebullets.forEach(function (b) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > H + 20 || b.y < -20 || b.x < -20 || b.x > W + 20) b.dead = true;
    });

    /* 玩家子弹命中 */
    pbullets.forEach(function (b) {
      if (b.dead) return;
      for (var j = enemies.length - 1; j >= 0; j--) {
        var en = enemies[j];
        if (!en.dead && L.circleHit(b.x, b.y, b.r, en.x, en.y, en.r)) {
          en.hp -= player.damage; b.dead = true;
          en.flash = 0.08;
          if (en.hp <= 0) { en.dead = true; killEnemy(en); }
          break;
        }
      }
      if (!b.dead && boss && !boss.dead && L.circleHit(b.x, b.y, b.r, boss.x, boss.y, boss.r)) {
        boss.hp -= player.damage; b.dead = true; boss.flash = 0.08;
        if (boss.hp <= 0) { boss.dead = true; killEnemy(boss); boss = null; bossKilled = true; }
      }
    });

    /* 敌弹命中玩家 */
    ebullets.forEach(function (b) {
      if (!b.dead && L.circleHit(b.x, b.y, b.r, player.x, player.y, player.r)) {
        b.dead = true; hurtPlayer();
      }
    });

    /* 敌机撞击玩家 */
    for (var k = enemies.length - 1; k >= 0; k--) {
      var ee = enemies[k];
      if (!ee.dead && L.circleHit(ee.x, ee.y, ee.r, player.x, player.y, player.r)) {
        ee.dead = true; burst(ee.x, ee.y, R.C.magenta, 10, 160); A.play('boom'); hurtPlayer();
      }
    }
    if (boss && !boss.dead && L.circleHit(boss.x, boss.y, boss.r, player.x, player.y, player.r)) {
      hurtPlayer();
    }

    /* 道具 */
    for (var m = powerups.length - 1; m >= 0; m--) {
      var p = powerups[m];
      E.updatePowerup(p, dt, H);
      if (p.dead) { powerups.splice(m, 1); continue; }
      if (L.circleHit(p.x, p.y, p.r, player.x, player.y, player.r)) {
        applyPowerup(p); powerups.splice(m, 1);
      }
    }

    /* 粒子 */
    particles.forEach(function (p) { E.updateParticle(p, dt); });

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
    if (enemies.length) return false;
    if (boss) return false;
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
      R.drawC(ctx, R.sprite(e.type), e.x, e.y);
    }

    /* Boss */
    if (boss) {
      if (!(boss.flash > 0 && Math.floor(boss.flash * 20) % 2 === 0))
        R.drawC(ctx, R.sprite('boss'), boss.x, boss.y);
      R.drawBossBar(ctx, W, boss);
    }

    /* 子弹 */
    pbullets.forEach(function (b) { if (!b.dead) R.drawC(ctx, R.sprite('pb'), b.x, b.y); });
    ebullets.forEach(function (b) { if (!b.dead) R.drawC(ctx, R.sprite('eb'), b.x, b.y); });

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
        R.drawC(ctx, R.sprite('player'), player.x, player.y);
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
    draw();
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
        boss: boss ? { hp: boss.hp, maxHp: boss.maxHp, x: boss.x, y: boss.y, phase: boss.phase, dead: boss.dead } : null,
        enemies: enemies.map(function (e) { return { type: e.type, x: e.x, y: e.y, hp: e.hp }; }),
        spawnSeqLen: spawnSeq.length,
        player: player ? { x: player.x, y: player.y, hp: player.hp, lives: player.lives } : null,
        hudWave: dom['hud-wave'] ? dom['hud-wave'].textContent : ''
      };
    },
    /* 测试辅助:无敌/秒伤分开控制,便于复现“二阶段召唤杂兵在场时击杀 boss” */
    godmode: function (on) {
      if (player) player.invUntil = on ? 1e15 : 0;
    },
    oneshot: function (on) {
      if (player) player.damage = on ? 999 : 1;
    }
  };

  /* ---- 启动 ---- */
  cacheDom();
  resize();
  loadHi();
  bindInput();
  syncDiffBtns();
  R.init();
  setPanel('panel-start');
  updateHUD();
  requestAnimationFrame(function (ts) { lastT = ts; loop(ts); });
})();