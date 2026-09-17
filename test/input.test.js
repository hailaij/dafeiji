'use strict';
const assert = require('assert');
const Input = require('../js/input.js');
class Surface {
  constructor() { this.events = {}; this.captures = new Set(); }
  addEventListener(name, fn) { (this.events[name] ||= []).push(fn); }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  emit(name, extra = {}) {
    const e = {pointerId:1, pointerType:'touch', clientX:100, clientY:400, button:0, detail:1, preventDefault(){}, stopPropagation(){}, ...extra};
    (this.events[name] || []).forEach(fn => fn(e));
  }
}
const canvas = new Surface(), emp = new Surface(), pointer = {};
let playing = true, shots = 0;
const control = Input.bind(canvas, pointer, () => playing);
Input.action(emp, () => shots++);
canvas.emit('pointerdown'); assert.strictEqual(pointer.y, 330);
emp.emit('pointerdown', {pointerId:2}); assert.strictEqual(shots, 1); assert(pointer.active);
emp.emit('click'); assert.strictEqual(shots, 1, 'synthetic click must not duplicate EMP');
canvas.emit('pointermove', {pointerId:2, clientX:999}); assert.strictEqual(pointer.x, 100);
canvas.emit('pointermove', {clientX:150}); assert.strictEqual(pointer.x, 150, 'pilot keeps moving after EMP');
canvas.emit('pointerup', {pointerId:2}); assert(pointer.active);
canvas.emit('pointercancel'); assert(!pointer.active); assert.strictEqual(canvas.captures.size, 0);
canvas.emit('pointermove'); assert(!pointer.active, 'released finger must not reacquire control');
canvas.emit('pointerdown', {pointerId:3}); control.reset(); assert(!pointer.active);
canvas.emit('pointermove', {pointerType:'mouse', pointerId:8, clientY:200}); assert.strictEqual(pointer.y, 200);
canvas.emit('pointerleave', {pointerType:'mouse'}); assert(!pointer.active);
emp.emit('click', {detail:0}); assert.strictEqual(shots, 2, 'keyboard activation');
playing = false; canvas.emit('pointerdown'); assert(!pointer.active);
playing = true; canvas.emit('pointerdown', {pointerId:9}); canvas.emit('lostpointercapture', {pointerId:9}); assert(!pointer.active);
console.log('PASS: two-finger flight + EMP, ownership, cancel, pause reset, mouse and keyboard');
