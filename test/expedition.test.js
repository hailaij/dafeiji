'use strict';
const assert=require('assert'),make=require('./balance.audit'),L=require('../js/logic');
for(const weaponId of ['pulse','heavy','fan'])for(const evo of L.EVOLUTIONS[weaponId]){
 const r=make(7);r.api.start('roguelike','normal',false,'falcon',weaponId);const c=r.api.combat();c.player.evolution=evo.id;c.fire();const total=c.bullets.reduce((s,b)=>s+b.dmg,0);assert(Math.abs(total-L.weaponShots(weaponId,1,0).reduce((s,b)=>s+b.mul,0)*evo.damage)<1e-8);
 r.api.apply('damage');assert.equal(c.player.evolution,evo.id);
}
for(const id of ['chain','blast']){
 const r=make(7);r.api.start('roguelike','normal');const c=r.api.combat(),target={x:100,y:200};
 for(let i=0;i<5;i++)c.enemies.push({x:110+i*10,y:200,hp:10,r:5,dead:false});
 const bullet={source:'weapon',dmg:2,bonus:0,evolution:id};c.impact(bullet,target);assert.equal(c.enemies.filter(e=>e.hp<10).length,id==='chain'?1:3);const damage=c.stats.weapon;c.impact(bullet,target);assert.equal(c.stats.weapon,damage,'Secondary effects occur only once');
}
{
 const r=make(1);r.api.start('roguelike','normal');const c=r.api.combat();c.clearSpawn();c.player.evolution='pierce';c.player.fireCd=999;c.fire();const b=c.bullets[0];Object.assign(b,{x:100,y:300,vx:0,vy:0});
 for(let i=0;i<2;i++){const e=r.DFJ.Entities.spawnEnemy('tank',390,L.difficulty(1,'normal'));Object.assign(e,{x:100,y:300,hp:10,hp0:10,fireCd:999});c.enemies.push(e);}
 c.step(0);c.step(0);assert(c.enemies.every(e=>Math.abs(e.hp-9.15)<1e-8));assert(b.dead);
}
{
 const r=make(1);r.api.start('challenge','normal',false,'bulwark','heavy');const c=r.api.combat();assert.equal(c.player.ship,'falcon');assert.equal(c.player.weaponId,'pulse');assert.equal(c.player.weapon,2);c.stats.seconds=179.99;c.step(.02);assert.equal(r.api.peek().STATE,'victory');assert.equal(c.stats.seconds,180);
}
{
 const r=make(1);r.api.start('bossrush','normal');const c=r.api.combat();assert.equal(r.api.peek().wave,5);c.step(.01);assert(r.api.peek().boss);assert.equal(c.enemies.length,0);
}
console.log('PASS: six evolutions, secondary target caps/no repeat, distinct-target piercing, fixed challenge/time limit, immediate Boss rush');
