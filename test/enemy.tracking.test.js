'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const L = require('../js/logic.js');
const sandbox = {window:{DFJ:{}}, Math, Number}; vm.createContext(sandbox);
for (const f of ['core','entities']) vm.runInContext(fs.readFileSync(require.resolve('../js/'+f+'.js'),'utf8'),sandbox);
const E = sandbox.window.DFJ.Entities;
function spawn(type, difficulty='normal') { return E.spawnEnemy(type,360,L.difficulty(1,difficulty)); }
function step(e, dt=1/60, x=290, y=650) { E.updateEnemy(e,dt,360,800,x,y,100); }
let e=spawn('grunt'); e.x=60; e.y=120;
step(e); const first=e.target.x; step(e,0.05,40); assert.strictEqual(e.target.x,first,'reaction delay');
step(e,0.4,350); assert(e.target.x<=340,'prediction stays on screen');
function pursuit(level, dt) { const e=spawn('grunt',level); e.x=60;e.y=120;e.vy=100; for(let t=0;t<1-1e-8;t+=dt) step(e,dt); return e.x; }
assert(pursuit('hard',1/60)>pursuit('normal',1/60));
assert(pursuit('normal',1/60)>pursuit('easy',1/60));
assert(Math.abs(pursuit('normal',1/30)-pursuit('normal',1/120))<3,'frame rate stability');
e=spawn('grunt'); e.x=60;e.y=650;e.steerV=0; step(e,0.05,300,600); assert.strictEqual(e.x,60,'no rear pursuit');
e=spawn('diver'); e.y=180;e.x=70;step(e);assert(e.charge>0);const startY=e.y;
step(e,0.2);assert.strictEqual(e.y,startY,'dive telegraph stops motion');
let previousAngle=e.diveAngle;
for(let i=0;i<90;i++){step(e,1/60,i%2?30:330,650);assert(Math.abs(e.diveAngle-previousAngle)<=0.8*e.aggro/60+1e-9);assert(e.diveSpeed<=480);assert(e.vy>=0);previousAngle=e.diveAngle;}
assert(e.missed,'dive eventually commits');
e=spawn('gunner');e.y=230;e.target={x:290,y:650};e.fireCd=0;
assert(!E.prepareEnemyShot(e,0.05,800,650,100));assert.strictEqual(e.fireCd,0.45);
const aim=e.aimLock.angle;e.target.x=30;
assert(!E.prepareEnemyShot(e,0.2,800,650,100));assert.strictEqual(e.aimLock.angle,aim,'locked aim cannot track during warning');
assert(E.prepareEnemyShot(e,0.26,800,650,100),'gunner above old firing ceiling still fires');
assert(!E.prepareEnemyShot(e,0.05,800,180,100));assert.strictEqual(e.aimLock,null,'no firing behind player');
e=spawn('mirror');e.y=230;e.fireCd=0;e.target={x:10,y:650};E.prepareEnemyShot(e,0.05,800,650,100);assert.strictEqual(e.aimLock.angle,Math.PI/2);
for(const width of [280,360,900]) for(const type of ['grunt','sine','gunner','tank','diver','splitter','sniper','weaver','bomber','mirror','healer','phantom']) {
 const enemy=E.spawnEnemy(type,width,L.difficulty(12,'hard'));
 for(let i=0;i<600&&!enemy.dead;i++) {
  E.updateEnemy(enemy,1/60,width,700,width*(0.5+0.4*Math.sin(i/90)),610,100);
  assert(Number.isFinite(enemy.x)&&Number.isFinite(enemy.y),type);
  if(type!=='diver')assert(enemy.x>=0&&enemy.x<=width,type+' remains in bounds');
 }
}
console.log('PASS: reaction delay, bounded prediction, difficulty, frame rate, no rear pursuit, dive turn/speed, firing lock, 36 enemy/viewport simulations');
