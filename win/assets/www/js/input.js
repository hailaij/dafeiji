/* Independent pointer ownership: one pilot finger, other fingers may use controls. */
(function () {
  'use strict';
  var Input = {};
  Input.bind = function (canvas, pointer, isPlaying) {
    var owner = null;
    function position(e) {
      pointer.active = true; pointer.x = e.clientX;
      pointer.y = e.clientY - (e.pointerType === 'touch' ? 70 : 0);
    }
    function release(e) {
      if (e.pointerId !== owner) return;
      var id = owner; owner = null; pointer.active = false;
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (!isPlaying() || owner !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
      owner = e.pointerId; position(e); canvas.setPointerCapture(owner);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!isPlaying()) return;
      if (e.pointerId === owner || (owner === null && e.pointerType === 'mouse')) position(e);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (event) { canvas.addEventListener(event, release); });
    canvas.addEventListener('pointerleave', function (e) { if (owner === null && e.pointerType === 'mouse') pointer.active = false; });
    return { reset: function () {
      if (owner !== null) release({ pointerId: owner });
      pointer.active = false;
    } };
  };
  Input.action = function (button, action) {
    button.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault(); e.stopPropagation(); action();
    });
    // Pointer gestures act immediately; only keyboard/assistive clicks use click.
    button.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (e.detail === 0) action();
    });
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Input;
  else window.DFJ.Input = Input;
})();
