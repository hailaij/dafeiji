/* NEON STRIKE - audio.js : WebAudio 合成音效(零素材) + 静音
 * AudioContext 在用户手势中懒创建;创建失败静默降级为无声。
 */
(function () {
  'use strict';
  var DFJ = (window.DFJ = window.DFJ || {});
  var ctx = null, master = null, noiseBuf = null, muted = false;
  var VOL = 0.35;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} } return true; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOL;
      master.connect(ctx.destination);
      var len = Math.floor(ctx.sampleRate * 0.5);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { ctx = null; return false; }
  }

  function tone(type, f0, f1, dur, vol, delay) {
    if (!ctx || muted) return;
    try {
      var t0 = ctx.currentTime + (delay || 0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(1, f0), t0);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
  }

  function noise(dur, vol, cutoff) {
    if (!ctx || muted || !noiseBuf) return;
    try {
      var t0 = ctx.currentTime;
      var src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff || 1000;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t0); src.stop(t0 + dur + 0.02);
    } catch (e) {}
  }

  var SFX = {
    shoot: function () { tone('square', 880, 220, 0.07, 0.10); },
    enemyShoot: function () { tone('sawtooth', 300, 180, 0.06, 0.05); },
    hit: function () { noise(0.05, 0.10, 2500); },
    boom: function () { noise(0.32, 0.28, 900); tone('sine', 160, 40, 0.3, 0.22); },
    bigBoom: function () { noise(0.7, 0.38, 700); tone('sine', 120, 30, 0.6, 0.28); },
    pickup: function () { tone('sine', 660, 660, 0.08, 0.14); tone('sine', 990, 990, 0.10, 0.14, 0.07); },
    hurt: function () { tone('sawtooth', 220, 60, 0.25, 0.22); noise(0.2, 0.18, 800); },
    boss: function () {
      tone('square', 440, 440, 0.18, 0.18);
      tone('square', 330, 330, 0.18, 0.18, 0.2);
      tone('square', 440, 440, 0.18, 0.18, 0.4);
    },
    over: function () { tone('sawtooth', 400, 60, 0.9, 0.22); },
    wave: function () { tone('triangle', 520, 780, 0.15, 0.13); },
    victory: function () {
      tone('square', 523, 523, 0.12, 0.16);
      tone('square', 659, 659, 0.12, 0.16, 0.12);
      tone('square', 784, 784, 0.12, 0.16, 0.24);
      tone('square', 1047, 1047, 0.3, 0.18, 0.36);
    }
  };

  // Dedicated music bus; bounded lookahead, no timers while paused or hidden.
  var musicKind = null, musicBus = null, musicStep = 0, musicNext = 0;
  var musicNodes = [];
  function stopMusic() {
    musicNodes.forEach(function (o) { try { o.stop(); o.disconnect(); } catch (e) {} });
    musicNodes = [];
    if (musicBus) { musicBus.disconnect(); musicBus = null; }
    musicKind = null;
  }
  function note(type, midi, time, duration, volume, slide) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    var hz = 440 * Math.pow(2, (midi - 69) / 12);
    o.type = type; o.frequency.setValueAtTime(hz, time);
    if (slide) o.frequency.exponentialRampToValueAtTime(35, time + duration);
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(volume, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);
    o.connect(g); g.connect(musicBus);
    musicNodes.push(o);
    o.onended = function () {
      o.disconnect(); g.disconnect();
      var i = musicNodes.indexOf(o); if (i >= 0) musicNodes.splice(i, 1);
    };
    o.start(time); o.stop(time + duration + 0.02);
  }
  function updateMusic(kind, phase) {
    if (!ctx || muted || !kind || ctx.state !== 'running') { if (musicKind) stopMusic(); return; }
    try {
      if (kind !== musicKind) {
        stopMusic(); musicKind = kind; musicStep = 0; musicNext = ctx.currentTime + 0.02;
        musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
      }
      var profile = DFJ.Logic.bossProfile(kind), m = profile.music;
      var stepTime = 60 / m.bpm / 4;
      if (musicNext < ctx.currentTime - 0.1) musicNext = ctx.currentTime + 0.01;
      while (musicNext < ctx.currentTime + 0.10) {
        var step = musicStep % 64, beat = step % 16;
        // Four-bar harmony, individual melody, bass, kick and metallic backbeat.
        var chord = [0, -3, -5, -2][Math.floor(step / 16)];
        var accent = LIndex(kind);
        if (step % 2 === 0) {
          note(m.voice, m.root + 24 + m.motif[(step / 2) % 8] + chord, musicNext, stepTime * 1.6, 0.055);
        }
        if (beat % 4 === 0 || (phase === 2 && beat % 4 === 3)) {
          note('triangle', m.root + chord, musicNext, stepTime * 2.4, 0.10);
        }
        if (beat === 0 || beat === 8 || (phase === 2 && beat === 11)) note('sine', 48, musicNext, 0.13, 0.20, true);
        if (beat === 4 || beat === 12) note('triangle', 91 + accent, musicNext, 0.055, 0.055);
        if (beat % 2 === accent % 2) note('square', 108 + accent, musicNext, 0.025, 0.012);
        if (phase === 2 && step % 4 === 3) note('sine', m.root + 36 + m.motif[step % 8], musicNext, stepTime, 0.035);
        musicNext += stepTime; musicStep++;
      }
    } catch (e) { stopMusic(); }
  }
  function LIndex(kind) {
    return Math.max(0, DFJ.Logic.BOSS_ROSTER.findIndex(function (b) { return b.id === kind; }));
  }

  DFJ.Audio = {
    init: init,
    updateMusic: updateMusic,
    stopMusic: stopMusic,
    play: function (name) { if (SFX[name]) SFX[name](); },
    setMuted: function (m) {
      muted = !!m;
      if (muted) stopMusic();
      if (master) { try { master.gain.value = muted ? 0 : VOL; } catch (e) {} }
    },
    isMuted: function () { return muted; },
    toggle: function () { this.setMuted(!muted); return muted; }
  };
})();
