'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const L = require('../js/logic.js');
const sandbox = { window: { DFJ: { Logic: L } } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(require.resolve('../js/bosses.js'), 'utf8'), sandbox);
let count = 0;
for (const width of [280, 360, 900]) for (const entry of L.BOSS_ROSTER) {
  for (const phase of [1, 2]) for (let turn = 0; turn < 12; turn++) {
    const b = {kind: entry.id, x: width / 2, y: 130, phase, attackIndex: turn};
    const a = L.bossAttack(b, width, width / 2, 650);
    assert(a.warning >= 0.75 && a.rest >= 0.35);
    assert(a.shots.length > 0 && a.shots.length <= 32);
    a.shots.forEach(s => {
      assert(Object.values(s).every(Number.isFinite));
      assert(s.x >= 0 && s.x <= width);
    });
    assert.deepStrictEqual(a, L.bossAttack(b, width, width / 2, 650));
    if (entry.id === 'fortress') {
      const gap = width * (turn % 2 ? 0.7 : 0.3);
      assert(a.shots.every(s => Math.abs(s.x - gap) > 40));
    }
    if (!['hive', 'boss'].includes(entry.id)) assert.strictEqual(a.summon, null);
    count++;
  }
}
assert.strictEqual(new Set(L.BOSS_ROSTER.map(b => b.music.title)).size, 11);
assert.strictEqual(new Set(L.BOSS_ROSTER.map(b => b.music.motif.join(','))).size, 11);
assert.strictEqual(L.bossDamageScale({kind:'fortress', recovery:0}), 0.6);
assert.strictEqual(L.bossDamageScale({kind:'fortress', recovery:1}), 1.5);
assert.strictEqual(L.bossDamageScale({kind:'nexus', recovery:1}), 1.35);
// Exercise the audio scheduler and lifecycle without speakers or browser dependencies.
let ac, started = 0, stopped = 0;
function param() { return {value:0, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}}; }
function node() { return {gain:param(), frequency:param(), connect(){}, disconnect(){}, start(){ started++; }, stop(){ stopped++; }}; }
sandbox.window.AudioContext = function () {
  ac = this; this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000;
  this.createGain = node; this.createOscillator = node;
  this.createBuffer = () => ({getChannelData: () => new Float32Array(4000)});
};
vm.runInContext(fs.readFileSync(require.resolve('../js/audio.js'), 'utf8'), sandbox);
const A = sandbox.window.DFJ.Audio;
assert(A.init());
for (const entry of L.BOSS_ROSTER) {
  const before = started;
  for (let step = 0; step < 160; step++) {
    ac.currentTime += 0.05;
    A.updateMusic(entry.id, step < 80 ? 1 : 2);
  }
  assert(started > before, entry.id + ' music silent');
  A.updateMusic(null, 1);
}
A.setMuted(true); const before = started;
A.updateMusic('boss', 2); assert.strictEqual(started, before);
A.setMuted(false); A.updateMusic('boss', 1); assert(started > before);
A.stopMusic(); assert(stopped > 0);
console.log(`PASS: ${count} boss patterns; gaps, damage windows, 11 music scores and audio lifecycle`);
