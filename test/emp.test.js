'use strict';
const assert=require('assert'),make=require('./balance.audit');
function setup(){const r=make(8);r.api.start('endless','normal');return {r,c:r.api.combat()};}
{
 const {r,c}=setup();c.player.invUntil=0;c.emp();assert.equal(c.cooldown(),10000);
 c.hurt('collision');assert.equal(c.player.hp,3);
 r.advance(.24);c.step(.24);c.hurt('bullet');assert.equal(c.player.hp,3);
 r.advance(.02);c.step(.02);c.hurt('bullet');assert.equal(c.player.hp,2);
 c.emp();assert.equal(c.stats.empUses,1);
}
{
 const {r,c}=setup();c.emp();r.advance(.1);c.step(.1);const cd=c.cooldown();
 c.pause();r.advance(60);c.step(60);assert.equal(c.cooldown(),cd);c.emp();assert.equal(c.stats.empUses,1);
 c.resume();c.player.invUntil=0;c.hurt('collision');assert.equal(c.player.hp,3,'Protection also freezes during pause');
 r.advance(.1);c.step(.1);assert(Math.abs(c.cooldown()-(cd-100))<1e-7);
 c.upgrade();const menuCD=c.cooldown();r.advance(60);c.step(60);assert.equal(c.cooldown(),menuCD);
}
{
 const {r,c}=setup();c.player.invUntil=100000;c.emp();assert.equal(c.player.invUntil,100000,'EMP must not shorten existing invulnerability');
 const order=[];r.DFJ.Render.drawBackground=()=>order.push('background');r.DFJ.Render.drawEmpWave=()=>order.push('emp');
 c.step(.05);assert.equal(order.length,0,'Simulation must not paint');c.draw();assert(order.indexOf('emp')>order.indexOf('background'));
}
{
 const {r,c}=setup();c.emp();c.player.invUntil=1e10;
 for(let i=0;i<600;i++){r.advance(1/60);c.step(1/60);}
 assert.equal(c.cooldown(),0);c.emp();assert.equal(c.stats.empUses,2);assert.equal(c.cooldown(),10000);
 r.api.start('endless','normal');assert.equal(r.api.combat().cooldown(),0);
}
console.log('PASS: 10s combat cooldown, pause/choice freeze, 250ms protection, existing invulnerability, single release, rendering order and reset');
