/* Public Mod API v1: presentation only. Never hand out live game objects. */
(function () {
  'use strict';
  var markers = new Map(), readouts = new Map(), listeners = new Map();
  var latest = null, ready = false, previousState = null, elapsed = 0;
  function id(value) {
    if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,95}$/.test(value)) throw new Error('Use a namespaced lowercase ID (3–96 characters)');
    return value;
  }
  function add(map, key, value) {
    id(key);
    if (map.has(key)) throw new Error('Duplicate Mod registration: ' + key);
    if (map.size >= 32) throw new Error('Mod registration limit reached');
    map.set(key, value);
    return function () { if (map.get(key) === value) map.delete(key); };
  }
  function freeze(snapshot) {
    Object.keys(snapshot).forEach(function (key) { if (snapshot[key] && typeof snapshot[key] === 'object') Object.freeze(snapshot[key]); });
    return Object.freeze(snapshot);
  }
  function emit(event, snapshot) {
    listeners.forEach(function (entry, key) {
      if (entry.event !== event) return;
      try { entry.fn(snapshot); } catch (e) { listeners.delete(key); console.warn('Mod listener disabled:', key, e); }
    });
  }
  window.NeonStrikeMods = Object.freeze({
    apiVersion: '1.0.0', gameVersion: window.DFJ.Logic.VERSION,
    getSnapshot: function () { return latest; },
    registerPlayerMarker: function (key, options) {
      if (!options || !/^#[0-9a-f]{6}$/i.test(options.color) || !Number.isFinite(options.radius) || options.radius < 18 || options.radius > 60) throw new Error('Marker requires #rrggbb color and radius 18–60');
      return add(markers, key, Object.freeze({color: options.color, radius: options.radius}));
    },
    registerReadout: function (key, fn) {
      if (typeof fn !== 'function') throw new Error('Readout requires a snapshot => string function');
      return add(readouts, key, function (snapshot) { return fn(snapshot); });
    },
    on: function (event, key, fn) {
      if (['ready', 'state', 'snapshot'].indexOf(event) < 0 || typeof fn !== 'function') throw new Error('Unknown event or invalid callback');
      var remove = add(listeners, key, {event: event, fn: fn});
      if (event === 'ready' && ready) {
        try { fn(latest); } catch (e) { remove(); console.warn('Mod ready listener disabled:', key, e); }
      }
      return remove;
    },
    assertMultiplayerAllowed: function () {
      var loader = window.VibeHubWorkshop;
      if (markers.size || readouts.size || listeners.size || (loader && loader.getEnabledMods().length)) throw new Error('请关闭所有 Mod 并重新启动后再进入联机');
      return true;
    }
  });
  // Internal bridge: not part of the supported Mod API.
  window.DFJ.Workshop = {
    publish: function (snapshot, dt, initial) {
      elapsed += dt || 0;
      if (!initial && snapshot.state === previousState && elapsed < 0.1) return;
      elapsed = 0;
      latest = freeze(snapshot);
      if (initial) { ready = true; emit('ready', latest); }
      if (previousState !== snapshot.state) { previousState = snapshot.state; emit('state', latest); }
      emit('snapshot', latest);
    },
    draw: function (ctx, snapshot) {
      if (snapshot.state !== 'playing' || !snapshot.player) return;
      ctx.save();
      try {
        markers.forEach(function (marker) {
          ctx.strokeStyle = marker.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.65;
          ctx.beginPath(); ctx.arc(snapshot.player.x, snapshot.player.y, marker.radius, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#baf8ff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
        var row = 0;
        readouts.forEach(function (fn, key) {
          if (row >= 3) return;
          try {
            var text = fn(latest);
            if (typeof text !== 'string') throw new Error('Readout must return a string');
            if (text) { ctx.fillText(text.slice(0, 48), 10, snapshot.height - 112 - row * 16, Math.max(40, snapshot.width - 100)); row++; }
          } catch (e) { readouts.delete(key); console.warn('Mod readout disabled:', key, e); }
        });
      } finally { ctx.restore(); }
    }
  };
})();
