'use strict';
const assert=require('assert'),make=require('./balance.audit');
const r=make(3),E=r.DFJ.Entities,L=r.DFJ.Logic;r.api.start('endless','normal',false);const c=r.api.combat(),d=L.difficulty(6,'normal');
const g=E.spawnEnemy('guardian',390,d);g.x=180;g.y=300;
const friends=Array.from({length:4},(_,i)=>Object.assign(E.spawnEnemy('grunt',390,d),{x:185+i*15,y:310}));
const g2=Object.assign(E.spawnEnemy('guardian',390,d),{x:185,y:300});
E.updateShields([g,...friends],0);assert.equal(friends.filter(e=>E.shieldScale(e,0)<1).length,2);assert.equal(E.shieldScale(g,0),1);
E.updateShields([g,g2,...friends],0);assert(friends.every(e=>E.shieldScale(e,0)===.65));
g.dead=true;assert.equal(E.shieldScale(friends[0],0),1);g.dead=false;g.__stunUntil=1000;assert.equal(E.shieldScale(friends[0],500),1);
E.updateShields([g,...friends],1500);assert.equal(E.shieldScale(friends[0],1500),.65);
{
 const t=E.spawnEnemy('transport',390,d),x=t.x;E.updateEnemy(t,.6,390,844,190,690,100);assert.equal(t.x,x);
 for(let i=0;i<600&&!t.dead;i++)E.updateEnemy(t,1/30,390,844,190,690,100);
 assert(t.dead);assert(t.optional);
}
{
 const b=E.spawnBoss(390,{kind:'fortress',bossHp:200,difficulty:'normal'});b.x=195;b.y=200;b.phase=1;
 const full=L.bossAttack(b,390,195,690);b.pending=full;
 const fullCount=full.shots.length; const hp=b.hp,t=b.turrets[0];assert.equal(L.damageTurret(b,t,999),t.maxHp);assert.equal(b.hp,hp);
 assert(b.pending.shots.every(s=>s.turret!==0));
 const half=L.bossAttack(b,390,195,690);assert(half.shots.length<fullCount);
 L.damageTurret(b,b.turrets[1],999);assert.equal(L.bossAttack(b,390,195,690).shots.length,1);
 assert.equal(L.damageTurret(b,t,999),0);
}
// Runtime integration: EMP disables shield before damage and destroys parts separately.
{
 const rr=make(3);rr.api.start('endless','normal',false);const cc=rr.api.combat();
 const guard=Object.assign(E.spawnEnemy('guardian',390,d),{x:cc.player.x,y:cc.player.y,hp:100});
 const target=Object.assign(E.spawnEnemy('grunt',390,d),{x:cc.player.x,y:cc.player.y,hp:10});cc.enemies.push(target,guard);E.updateShields(cc.enemies,0);
 cc.emp();assert.equal(target.hp,7);assert(guard.__stunUntil>0);
}
// Optional transport must not hold a cleared wave or award loot on escape.
{
 const rr=make(1);rr.api.start('endless','normal',false);const cc=rr.api.combat();
 const t=E.spawnEnemy('transport',390,d);t.x=cc.player.x;t.y=cc.player.y;t.warning=0;cc.enemies.push(t);
 const before=rr.api.peek().powerups.length;cc.kill(t);assert.equal(rr.api.peek().powerups.length,before+1);cc.kill(t);assert.equal(rr.api.peek().powerups.length,before+1);
}
console.log('PASS: support target cap/nonstack/stun/death, transport warning/escape/drop, fortress parts/core/pending attacks and EMP integration');

for(const n of [3,4,6,18]){
 const cfg=L.waveConfig(n,'normal'),seq=c.plan(cfg,n);
 assert.equal(seq.length,Object.values(cfg.counts).reduce((a,x)=>a+x,0));
 assert.equal(seq.filter(x=>x.type==='guardian').length,n>=4?1:0);
 assert.equal(seq.filter(x=>x.type==='transport').length,n%3===0?1:0);
}
{
 const rr=make(1);rr.api.start('endless','normal',false);const cc=rr.api.combat();cc.clearSpawn();
 cc.enemies.push(E.spawnEnemy('transport',390,d));assert.equal(cc.clear(),true);
 cc.enemies.push(E.spawnEnemy('guardian',390,d));assert.equal(cc.clear(),false);
}
{
 const rr=make(1);rr.api.start('endless','normal',false);const cc=rr.api.combat();cc.player.fireCd=100;
 const b=E.spawnBoss(390,{kind:'fortress',bossHp:200,difficulty:'normal'});b.y=180;b.targetY=180;b.fireCd=100;cc.setBoss(b);
 const pos=L.turretPosition(b,b.turrets[0]),core=b.hp,part=b.turrets[0].hp;
 cc.bullets.push({x:pos.x,y:pos.y,vx:0,vy:0,r:3,dmg:2,source:'weapon',bonus:0,dead:false});
 rr.advance(.001);rr.api.tick(.001,195);assert.equal(b.hp,core);assert.equal(b.turrets[0].hp,part-2);assert.equal(cc.stats.weapon,2);
}
console.log('PASS: replacement budgets, optional wave completion and actual bullet-to-turret collision');

for(const mode of ['endless','campaign','roguelike']){
 const rr=make(1);rr.api.start(mode,'normal',false);const cc=rr.api.combat();cc.clearSpawn();cc.bossWave();
 cc.enemies.push(Object.assign(E.spawnEnemy('grunt',390,d),{dead:true}),E.spawnEnemy('transport',390,d));
 assert.equal(cc.clear(),false,'must not skip unspawned Boss: '+mode);
 rr.advance(.001);rr.api.tick(.001,195);assert(rr.api.peek().boss,'Boss spawns despite optional transport');
}
for(const width of [280,390,844]){
 const b=E.spawnBoss(width,{kind:'fortress',bossHp:200});b.y=b.targetY;
 for(let i=0;i<1000;i++){E.updateBoss(b,.03,width);b.turrets.forEach(t=>{const pos=L.turretPosition(b,t);assert(pos.x-t.r>=0&&pos.x+t.r<=width);});}
}
console.log('PASS: Boss cannot be skipped by optional/dead enemies; turret bounds on narrow screens');

{
 const rr=make(1);rr.api.start('endless','normal',false);const cc=rr.api.combat();
 const b=E.spawnBoss(390,{kind:'fortress',bossHp:200});b.y=200;cc.setBoss(b);cc.player.x=b.x;cc.player.y=b.y+18;
 const hp=b.hp,parts=b.turrets.map(t=>t.hp);cc.emp();
 assert(Math.abs(b.hp-(hp-.63))<1e-8);b.turrets.forEach((t,i)=>assert(Math.abs(t.hp-(parts[i]-1.05))<1e-8));
 assert(Math.abs(cc.stats.emp-2.73)<1e-8);assert.equal(cc.stats.kills,0);
}
console.log('PASS: EMP damages core and both in-range turrets with no part kill rewards');
