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

  DFJ.Audio = {
    init: init,
    play: function (name) { if (SFX[name]) SFX[name](); },
    setMuted: function (m) {
      muted = !!m;
      if (master) { try { master.gain.value = muted ? 0 : VOL; } catch (e) {} }
    },
    isMuted: function () { return muted; },
    toggle: function () { this.setMuted(!muted); return muted; }
  };
})();
