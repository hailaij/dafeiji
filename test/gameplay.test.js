'use strict';
const assert=require('assert'),L=require('../js/logic'),make=require('./balance.audit');
for(const d of ['easy','normal','hard'])for(let n=1;n<=50;n++)for(let wave=1;wave<=3;wave++){
 const types=Array.from({length:n},(_,i)=>i%2?'gunner':'grunt'),plan=L.formation(types,wave,d);
 assert.deepStrictEqual(plan.map(x=>x.type).sort(),types.slice().sort());assert(Math.abs(plan.reduce((a,x)=>a+x.gap,0)-n)<1e-8);
 assert(plan.every(x=>x.lane>=.2&&x.lane<=.8&&x.gap>0));
}
assert.equal(L.synergies({}).length,0);
for(const [ids,name] of [[['crit','critdmg'],'critical'],[['emp','magnet'],'pulse'],[['reflect','vamp'],'sustain']]){
 let s=L.rogueState({});s=L.rogueApply(s,ids[0]);assert(!L.hasSynergy(s,name));s=L.rogueApply(s,ids[1]);assert(L.hasSynergy(s,name));
}
for(let seed=0;seed<30;seed++){const offers=L.rogueRoll({crit:1},3,L.mulberry32(seed));assert(offers.some(p=>p.id==='critdmg'));assert.equal(new Set(offers.map(p=>p.id)).size,3);}
function setup(){const r=make(7);r.api.start('roguelike','normal',false);return {r,c:r.api.combat()};}
{
 const {c}=setup();c.player.crit=10;c.player.critDmg=1;c.fire();
 assert(c.bullets.length>0);assert.equal(c.bullets[0].dmg,2.5);assert.equal(c.bullets[0].bonus,.5);
 const enemy={hp:1};c.damage(enemy,2.5,'weapon',.5);assert.equal(c.stats.weapon,1);assert.equal(c.stats.synergyDamage,.2);
}
{
 const {c}=setup();c.player.emp=.4;c.player.magnet=1;
 for(let i=0;i<8;i++)c.enemies.push({x:c.player.x,y:c.player.y,hp:1,type:'grunt',score:1});
 c.enemies.push({dead:true,x:c.player.x,y:c.player.y,hp:0,type:'grunt',score:1});
 c.enemyBullets.push({dead:false},{dead:false},{dead:true});c.emp();
 assert.equal(c.stats.kills,8);assert.equal(c.stats.emp,8);assert.equal(c.stats.refund,3);assert.equal(c.cooldown(),7000);assert.equal(c.stats.cleared,2);
 c.emp();assert.equal(c.stats.empUses,1);
 const corpse={hp:0,type:'grunt',score:1,x:50,y:50};c.kill(corpse);c.kill(corpse);assert.equal(c.stats.kills,9);
}
{
 const {c}=setup();c.player.invUntil=0;c.player.reflect=1;c.player.vamp=.04;c.player.hp=2;c.hurt('敌机碰撞');
 assert.equal(c.bullets.length,8);assert(c.bullets.every(b=>b.source==='reflect'&&b.dmg===2));
 c.hurt('敌方弹幕');assert.equal(c.bullets.length,8);assert.equal(c.stats.cause,'敌机碰撞');
 for(let i=0;i<11;i++)c.kill({hp:0,type:'grunt',score:1,x:50,y:50});
 c.player.hp=1;c.kill({hp:0,type:'grunt',score:1,x:50,y:50});assert.equal(c.stats.healing,1);assert(c.player.hp>=2);
}
{
 const {r,c}=setup();c.player.invUntil=0;c.player.hp=1;c.player.lives=1;c.hurt('敌方弹幕');assert.equal(r.api.peek().STATE,'gameover');
 const seconds=c.stats.seconds;r.advance(1);r.api.tick(1,100);assert.equal(c.stats.seconds,seconds);
 r.api.start('roguelike','normal',false);assert.equal(r.api.combat().stats.kills,0);assert.equal(L.synergies(r.api.peek().player).length,0);
}
console.log('PASS: formation budgets, three synergy unlocks, actual crit/EMP/reflect/heal effects, effective damage accounting, death and restart');
