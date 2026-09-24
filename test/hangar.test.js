'use strict';
const assert=require('assert'),L=require('../js/logic'),make=require('./balance.audit');
assert.equal(L.shipPreset('missing').id,'falcon');assert.equal(L.weaponPreset('missing').id,'pulse');
for(const ship of L.SHIPS)for(const weapon of L.WEAPONS)for(const level of [1,2,3])for(const spread of [0,2]){
 const shots=L.weaponShots(weapon.id,level,spread);assert(shots.every(s=>Number.isFinite(s.vx)&&s.vy<0&&s.mul>0));
 const total=shots.reduce((s,b)=>s+b.mul,0),expected=([0,1,2,4][level]+spread*2)*weapon.damage*(weapon.id==='fan'?1.2:1);
 assert(Math.abs(total-expected)<1e-8);
 const r=make(1);r.api.start('roguelike','normal',false,ship.id,weapon.id);const c=r.api.combat();c.player.weapon=level;c.player.spread=spread;c.fire();
 assert.equal(c.bullets.length,shots.length);assert(Math.abs(c.bullets.reduce((n,b)=>n+b.dmg,0)-total)<1e-8);assert(c.bullets.every(b=>b.weaponId===weapon.id));
 r.api.apply('damage');assert.equal(c.player.ship,ship.id);assert.equal(c.player.weaponId,weapon.id);assert.equal(c.player.damage,2);
 const p=c.player;assert.equal(p.speed,430*ship.speed);assert.equal(p.shield,ship.shield);assert.equal(p.hpMax,ship.hp);assert.equal(p.r,ship.r);
}
// Timed actual volleys must retain interval remainders at both frame rates.
for(const fps of [30,60])for(const weapon of L.WEAPONS){
 const r=make(1);r.api.start('endless','normal',false,'falcon',weapon.id);const c=r.api.combat();c.clearSpawn();
 let damage=0;for(let i=0;i<fps*10;i++){c.bullets.length=0;r.advance(1/fps);c.fireStep(1/fps);damage+=c.bullets.reduce((n,b)=>n+b.dmg,0);}
 const expected=10/.16*(weapon.id==='fan'?1.2:1);assert(Math.abs(damage-expected)<=weapon.damage*1.21,`${weapon.id} ${fps}fps damage ${damage}`);
}
console.log('PASS: nine independent loadouts, all tiers/spread, rogue retention, hull stats and 30/60fps firing budgets');

for(const ship of L.SHIPS){const r=make(1);r.api.start('endless','normal',false,ship.id,'pulse');const c=r.api.combat();c.player.x=100;c.player.y=400;c.fireStep(.01,350,400);assert(Math.abs(c.player.x-100-430*ship.speed*.01)<1e-8,'Touch movement must respect hull speed');}
