'use strict';
const assert=require('assert');const make=require('./balance.audit');const L=require('../js/logic');
for(const mode of ['endless','campaign','roguelike']){
 const probes=['easy','normal','hard'].map(d=>{const run=make(1);run.api.start(mode,d,false);return run.api.probe();});
 assert(probes[0].gunnerSpeed<probes[1].gunnerSpeed&&probes[1].gunnerSpeed<probes[2].gunnerSpeed,mode+' actual bullet scaling');
 assert(probes[0].bossHp<probes[1].bossHp&&probes[1].bossHp<probes[2].bossHp,mode+' actual boss health');
}
for(const perk of L.ROGUELIKE_PERKS){const r=make(1);r.api.start('roguelike','normal',false);const before=JSON.parse(JSON.stringify(r.api.peek().player));const expected=L.rogueApply(before,perk.id);const actual=r.api.apply(perk.id);for(const key of Object.keys(expected))assert.strictEqual(actual[key],expected[key],perk.id+': '+key);}
for(const d of ['easy','normal','hard']){const r=make(1);let prev=0;for(const wave of [1,5,20,1000]){const diff=L.difficulty(wave,d);assert(diff.bulletSpeedMul>=prev);assert(diff.bulletSpeedMul<=1.233);prev=diff.bulletSpeedMul;}
 for(const kind of r.DFJ.Logic.BOSS_ROSTER.map(b=>b.id))for(const phase of [1,2]){const b={kind,x:180,y:200,phase,difficulty:d};const a=r.DFJ.Logic.bossAttack(b,360,180,650);assert(a.warning>=.75);assert(a.rest>=.35);}
}
console.log('PASS: actual bullet/Boss difficulty scaling in all modes, all 15 applied perks, capped bullet growth and readable Boss warnings');

for(const mode of ['endless','campaign','roguelike'])for(const difficulty of ['easy','normal','hard'])for(const late of [false,true]){
 const r=make(1);r.api.start(mode,difficulty,late);const state=r.api.peek();
 const expected=mode==='campaign'?L.campaignConfig(state.level,difficulty).waves[state.levelWave-1]:L.waveConfig(state.wave,difficulty);
 assert.equal(state.spawnInterval,expected.spawnInterval,mode+' planned spawn cadence');
 const diff=mode==='campaign'?L.campaignDifficulty(state.level,difficulty):L.difficulty(state.wave,difficulty);
 assert.equal(state.difficulty.hpMul,diff.hpMul,mode+' runtime wave curve');
}
console.log('PASS: planned spawn cadence and runtime curve agree in all modes/difficulties/stages');
