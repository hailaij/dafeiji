'use strict';
const assert = require('assert');
const make = require('./balance.audit');
const run = make(1), E = run.DFJ.Entities, L = run.DFJ.Logic;
let cases = 0;
for (const width of [280, 390, 900, 1920]) {
  for (const entry of L.BOSS_ROSTER) {
    for (const fps of [30, 60, 120]) {
      for (const elapsed of [0.5, 2, 7, 20, 63]) {
        const b = E.spawnBoss(width, {kind: entry.id, bossHp: 200});
        b.y = b.targetY;
        E.updateBoss(b, elapsed, width);
        const before = b.x, angle = b.strafeAngle;
        b.phase = 2;
        E.updateBoss(b, 0, width);
        assert.strictEqual(b.x, before, 'Phase alone must not change position');
        assert.strictEqual(b.strafeAngle, angle);
        const radius = Math.max(0, (width - 2 * (b.turrets ? 72 : b.r) - 40) / 2);
        E.updateBoss(b, 1 / fps, width);
        assert(Math.abs(b.x - before) <= radius * 1.5 * b.speedMul / fps + 1e-8,
          `${entry.id}: phase transition jumps at ${elapsed}s/${fps}fps`);
        assert(b.strafeSpeed > .9 && b.strafeSpeed < 1.5, 'Speed must ramp, not jump');
        // Same duration, different timestep partitions must yield the same path.
        const whole = {...b}, split = {...b};
        E.updateBoss(whole, 1, width);
        for (let i = 0; i < fps; i++) E.updateBoss(split, 1 / fps, width);
        assert(Math.abs(whole.x - split.x) < 1e-7);
        cases++;
      }
    }
  }
}
// Exercise the real HP-based stage switch, including switching during a telegraph.
for (const entry of L.BOSS_ROSTER) for (const warning of [false, true]) {
  const r = make(2); r.api.start('endless', 'normal');
  const c = r.api.combat(), b = r.DFJ.Entities.spawnBoss(390, {kind: entry.id, bossHp: 200});
  b.y = b.targetY; b.fireCd = 999;
  r.DFJ.Entities.updateBoss(b, 7, 390);
  c.setBoss(b); c.player.fireCd = 999;
  const x = b.x;
  if (warning) b.pending = {shots: []};
  b.hp = b.maxHp * .49;
  c.step(0);
  assert.equal(b.phase, 2); assert.equal(b.x, x);
  c.step(1 / 60);
  if (warning) {assert.equal(b.x, x); b.pending = null;}
  const previous = b.x;
  c.step(1 / 60);
  assert(Math.abs(b.x - previous) < 4);
}
// Phantom's deliberate teleport must not snap back when its warning finishes.
for (const phase of [1, 2]) for (const fraction of [.25, .75]) {
  const b = E.spawnBoss(390, {kind:'phantom', bossHp:200});
  b.y = b.targetY; b.phase = phase;
  E.updateBoss(b, 5, 390);
  b.x = 390 * fraction;
  E.reanchorBoss(b, 390);
  const x = b.x;
  E.updateBoss(b, 0, 390);
  assert(Math.abs(b.x - x) < 1e-8);
  E.updateBoss(b, 1 / 60, 390);
  assert(Math.abs(b.x - x) < 4);
}
console.log(`PASS: ${cases} Boss movement cases; real HP transitions, telegraph freeze/resume and Phantom relocation`);
