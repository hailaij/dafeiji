'use strict';
const assert=require('assert'),make=require('./balance.audit'),L=require('../js/logic');
const caps={rapid:['fireRate',2.5],damage:['damage',5],spread:['spread',2],repair:['hpMax',6],speed:['speedMul',1.6],score:['scoreMul',3],critdmg:['critDmg',1.5],vamp:['vamp',.12],emp:['emp',2]};
for(const [id,[field,cap]] of Object.entries(caps)){
 let p=L.rogueState({});for(let i=0;i<1000;i++)p=L.rogueApply(p,id);
 assert(p[field]<=cap+1e-10,id);assert.equal(p[field],cap,id);
 if(id!=='repair')assert(!L.rogueAvailable(p).some(x=>x.id===id),id+' offered past cap');
}
assert.equal(L.rogueApply({hp:1,hpMax:6},'repair').hp,3);
for(const d of ['easy','normal','hard']){
 const stages=[0,60,120].map(t=>L.challengeConfig(t,d));
 const n=stages.map(s=>Object.values(s.counts).reduce((a,b)=>a+b,0));
 assert(n[0]<n[1]&&n[1]<n[2]);assert(stages[0].spawnInterval>stages[1].spawnInterval&&stages[1].spawnInterval>stages[2].spawnInterval);
}
for(const kind of L.BOSS_ROSTER.map(x=>x.id)){
 const r=make(1);r.api.start('bossrush','normal');const c=r.api.combat(),b=r.DFJ.Entities.spawnBoss(390,{kind,bossHp:200});
 c.setBoss(b);const hp=b.hp;c.damage(b,99999,'weapon',0);assert.equal(b.hp,hp);
 b.y=b.targetY;c.damage(b,99999,'emp',0);assert.equal(b.hp,hp);
 if(b.turrets){const t=b.turrets[0],th=t.hp;assert.equal(r.DFJ.Logic.damageTurret(b,t,999),0);assert.equal(t.hp,th);}
 b.attackIndex=1;c.damage(b,1,'weapon',0);assert.equal(b.hp,hp-1);
}
// The shield must release naturally; EMP must not postpone its release forever.
{
 const r=make(3);r.api.start('bossrush','normal');let first;
 for(let i=0;i<300;i++){r.advance(1/30);r.api.tick(1/30,195,{noDraw:true});const b=r.api.peek().boss;if(b)first=b;}
 assert(first&&first.attackIndex>0);assert(!r.DFJ.Logic.bossProtected(first));
}
console.log('PASS: repeated perk caps, staged challenge, all Boss/EMP/turret entry shields and natural shield release');
{
 const r=make(4);r.api.start('challenge','normal');const c=r.api.combat();
 c.stats.seconds=120;c.clearSpawn();c.enemies.length=0;c.step(1/30);
 const b=r.api.peek().boss;assert(b&&b.kind==='nova');assert(r.DFJ.Logic.bossProtected(b));
 c.stats.seconds=179.99;c.step(.02);assert.equal(r.api.peek().STATE,'victory');
}
console.log('PASS: challenge final-minute Boss and survival timer');
