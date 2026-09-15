/* NEON STRIKE - core.js : 全局命名空间 / 工具 / 对象池 */
(function () {
  'use strict';
  var DFJ = (window.DFJ = window.DFJ || {});

  var U = {
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    lerp: function (a, b, t) { return a + (b - a) * t; }
  };
  DFJ.U = U;

  /* 对象池:子弹/粒子/道具高频生灭,复用对象避免 GC 卡顿 */
  function Pool(create) {
    this.create = create;
    this.free = [];
    this.active = [];
  }
  Pool.prototype.obtain = function () {
    var o = this.free.pop();
    if (!o) o = this.create();
    this.active.push(o);
    return o;
  };
  Pool.prototype.releaseAll = function (keepFn) {
    var act = this.active;
    for (var i = act.length - 1; i >= 0; i--) {
      if (!keepFn || !keepFn(act[i])) {
        this.free.push(act[i]);
        act.splice(i, 1);
      }
    }
  };
  Pool.prototype.forEach = function (fn) {
    var act = this.active;
    for (var i = 0; i < act.length; i++) fn(act[i], i);
  };
  Pool.prototype.clear = function () {
    while (this.active.length) this.free.push(this.active.pop());
  };
  DFJ.Pool = Pool;
})();
