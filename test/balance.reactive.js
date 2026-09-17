'use strict';
const fs=require('fs'),make=require('./balance.audit');
const results=[];
for(const mode of ['endless','campaign','roguelike'])for(const difficulty of ['easy','normal','hard']){
 for(const width of [390,900])for(let seed=1;seed<=6;seed++){
  const r=make(seed,width,width===390?844:760);r.api.start(mode,difficulty,true);let target=width/2,seconds=0;
  for(let frame=0;frame<3600;frame++){
   const s=r.api.peek(),p=s.player;
   if(frame%5===0){
    let best=Infinity;
    const loot=s.powerups.filter(q=>!q.dead&&q.y>p.y-160).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    const enemy=s.boss||s.enemies.filter(e=>!e.dead).sort((a,b)=>b.y-a.y)[0];
    const desired=loot?loot.x:enemy?enemy.x:width/2;
    const shots=s.bullets.filter(b=>!b.dead).map(b=>({...b,delay:0}));
    if(s.boss&&s.boss.pending)shots.push(...s.boss.pending.shots.map(b=>({...b,delay:Math.max(0,s.boss.fireCd)})));
    for(let x=24;x<=width-24;x+=(width-48)/20){
     let risk=Math.abs(x-desired)*.012+Math.abs(x-p.x)*.004;
     for(const b of shots){
      for(const t of [.15,.3,.5,.75]){
       if(t<b.delay)continue;
       const bx=b.x+b.vx*(t-b.delay),by=b.y+b.vy*(t-b.delay);
       const px=p.x+Math.max(-p.speed*t,Math.min(p.speed*t,x-p.x));
       const dist=Math.hypot(bx-px,by-p.y);
       risk+=Math.max(0,55-dist)*1.5;
      }
     }
     for(const e of s.enemies){if(Math.abs(e.y-p.y)<95)risk+=Math.max(0,75-Math.hypot(e.x-x,e.y-p.y));}
     if(risk<best){best=risk;target=x;}
    }
   }
   // Bound the target's speed instead of teleporting toward a safe lane.
   const command=p.x+Math.max(-p.speed/30,Math.min(p.speed/30,target-p.x));
   r.advance(1/30);r.api.tick(1/30,command);seconds=(frame+1)/30;
   if(['gameover','victory'].includes(r.api.peek().STATE))break;
  }
  const s=r.api.peek();results.push({mode,difficulty,width,seed,alive:s.STATE!=='gameover',seconds,wave:s.wave,level:s.level,...r.stats()});
 }
 const a=results.filter(r=>r.mode===mode&&r.difficulty===difficulty);console.log(mode,difficulty,a.filter(r=>r.alive).length+'/'+a.length);
}
fs.writeFileSync('test/reports/balance-reactive.json',JSON.stringify({method:'Late-stage fixed equipment; six seeds, two viewports; heuristic visible-bullet/telegraph avoidance, enemy alignment and nearby loot; automatic EMP; not human win rates',results},null,2));
