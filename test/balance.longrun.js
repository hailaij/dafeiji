'use strict';
// Actual combat loop, seeded randomness, no rendering/audio. No invulnerability or
// granted upgrades: runs stop on death, victory or the declared observation limit.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),make=require('./balance.audit');
const out=path.resolve(process.env.LONGRUN_REPORT_DIR||'test/reports/longrun');fs.mkdirSync(out,{recursive:true});
const suite=process.argv[2]||'baseline',jobs=[];
function add(o){jobs.push({ship:'falcon',weapon:'pulse',pilot:'reactive',route:'repair',seed:1,width:390,...o});}
if(suite==='baseline')for(const mode of ['endless','campaign','roguelike','challenge','bossrush'])for(const difficulty of ['easy','normal','hard'])for(const width of [390,900])for(const pilot of ['sweep','reactive'])for(let seed=1;seed<=4;seed++)add({mode,difficulty,width,pilot,seed});
if(suite==='loadouts')for(const mode of ['endless','roguelike','bossrush'])for(const difficulty of ['easy','normal','hard'])for(const ship of ['falcon','bulwark','wisp'])for(const weapon of ['pulse','heavy','fan'])for(let seed=1;seed<=2;seed++)add({mode,difficulty,ship,weapon,seed});
if(suite==='branches')for(const difficulty of ['easy','normal','hard'])for(const [weapon,evolutions] of Object.entries(require('../js/logic').EVOLUTIONS))for(const evolution of evolutions)for(const route of ['repair','supply','elite'])for(let seed=1;seed<=3;seed++)add({mode:'roguelike',difficulty,weapon,evolution:evolution.id,route,seed});
if(suite==='smoke')add({mode:'roguelike',difficulty:'easy'});
if(suite==='endurance')for(const mode of ['endless','roguelike'])for(const difficulty of ['easy','normal','hard'])for(const width of [390,900])for(let seed=1;seed<=2;seed++)for(const build of mode==='roguelike'?['damage','sustain','rapid']:['damage'])add({mode,difficulty,width,seed,build,limit:3600,route:build==='damage'?'elite':'supply'});
if(suite==='focused'){
 for(const mode of ['campaign','bossrush'])for(const pilot of ['reactive','forward','anchor'])for(let seed=1;seed<=4;seed++)add({mode,difficulty:'hard',width:900,pilot,seed,limit:600});
 for(const difficulty of ['easy','normal','hard'])for(const weapon of ['pulse','heavy','fan'])for(let seed=1;seed<=2;seed++)add({mode:'bossrush',difficulty,weapon,seed});
}
if(!jobs.length)throw Error('Unknown suite '+suite);
const hashes={};for(const f of ['core','logic','bosses','entities','input','game'])hashes['js/'+f+'.js']=crypto.createHash('sha256').update(fs.readFileSync('js/'+f+'.js')).digest('hex');
function simulate(job){
 const height=job.width===390?844:760,r=make(job.seed,job.width,height);r.api.start(job.mode,job.difficulty,false,job.ship,job.weapon);
 const updateBoss=r.DFJ.Entities.updateBoss;r.DFJ.Entities.updateBoss=function(b,dt,w){updateBoss(b,dt,w);if(b.y>=b.targetY)b.__auditArrived=true;};
 const limit=job.limit||(job.mode==='challenge'?181:job.mode==='campaign'?1800:1200),dt=1/30,options={noDraw:true,route:job.route,evolution:job.evolution};
 if(job.build==='sustain')options.perks=['vamp','reflect','repair','life','power','damage','rapid'];
 if(job.build==='rapid')options.perks=['rapid','power','damage','repair','life','vamp'];
 if(job.pilot==='forward')options.y=height*.55;
 function bossResult(b,seconds){return {kind:b.kind,seconds,killed:b.dead,hp:b.hp,attacks:b.attackIndex||0,arrived:!!b.__auditArrived};}
 let target=job.width/2,lastBoss=null,bossStart=0,lastBossHp=0,previousWave=0,lastProgress=0,peakBullets=0;
 const samples=[],bosses=[];let frame=0;
 for(;frame<limit*30;frame++){
  const s=r.api.peek(),p=s.player,t=frame*dt;
  if(['gameover','victory'].includes(s.STATE))break;
  const ordinal=job.mode==='campaign'?(s.level-1)*4+s.levelWave:s.wave;
  if(ordinal!==previousWave){lastProgress=t;previousWave=ordinal;}
  if(s.boss!==lastBoss){if(lastBoss)bosses.push(bossResult(lastBoss,t-bossStart));lastBoss=s.boss;if(lastBoss)bossStart=t;}
  if(lastBoss)lastBossHp=lastBoss.hp;
  peakBullets=Math.max(peakBullets,s.bullets.length);
  if(frame%1800===0)samples.push({seconds:t,wave:ordinal,hp:p.hp,hpMax:p.hpMax,lives:p.lives,weapon:p.weapon,damage:p.damage,fireRate:p.fireRate,spread:p.spread,vamp:p.vamp,evolution:p.evolution||null,...r.stats()});
  if(job.pilot==='sweep')target=job.width*(.5+.35*Math.sin(t*Math.PI/3));
  else if(frame%5===0){
   const loot=s.powerups.filter(q=>!q.dead&&q.y>p.y-150&&q.y<p.y+35).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
   const enemy=s.boss||s.enemies.filter(e=>!e.dead&&!e.optional).sort((a,b)=>b.y-a.y)[0];
   const desired=job.pilot==='anchor'&&s.boss&&s.boss.kind==='phantom'?(r.DFJ.Logic.phantomLanding?r.DFJ.Logic.phantomLanding({attackIndex:2},job.width):job.width*.25):loot?loot.x:enemy?enemy.x:job.width/2;
   const shots=s.bullets.filter(b=>!b.dead&&b.y>p.y-350&&b.y<p.y+100).map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy,r:b.r,delay:0}));
   if(s.boss&&s.boss.pending)shots.push(...s.boss.pending.shots.map(b=>({...b,delay:Math.max(0,s.boss.fireCd)})));
   let best=Infinity;
   for(let lane=0;lane<=16;lane++){
    const x=24+(job.width-48)*lane/16;
    let risk=Math.abs(x-desired)*.012+Math.abs(x-p.x)*.004;
    for(const b of shots)for(const ahead of [.15,.35,.65]){
     if(ahead<b.delay)continue;
     const bx=b.x+b.vx*(ahead-b.delay),by=b.y+b.vy*(ahead-b.delay);
     const px=p.x+Math.max(-p.speed*ahead,Math.min(p.speed*ahead,x-p.x));
     risk+=Math.max(0,50-Math.hypot(bx-px,by-p.y))*1.5;
    }
    for(const e of s.enemies)if(!e.dead&&Math.abs(e.y-p.y)<95)risk+=Math.max(0,75-Math.hypot(e.x-x,e.y-p.y));
    if(risk<best){best=risk;target=x;}
   }
  }
  const command=job.pilot==='sweep'?target:p.x+Math.max(-p.speed*dt,Math.min(p.speed*dt,target-p.x));
  r.advance(dt);r.api.tick(dt,command,options);
 }
 const s=r.api.peek(),c=r.api.combat(),p=s.player;
 if(lastBoss)bosses.push(bossResult(lastBoss,frame*dt-bossStart));
 return {...job,limit,seconds:frame*dt,combatSeconds:c.stats.seconds,outcome:s.STATE==='gameover'?'dead':s.STATE==='victory'?'victory':'censored',wave:job.mode==='campaign'?Math.min(40,(s.level-1)*4+s.levelWave):s.wave,level:s.level,hp:p.hp,hpMax:p.hpMax,lives:p.lives,damage:p.damage,weaponTier:p.weapon,fireRate:p.fireRate,spread:p.spread,vamp:p.vamp,evolved:p.evolution||null,routePicks:c.stats.routes.length,stats:{...c.stats},peakBullets,secondsSinceWave:frame*dt-lastProgress,bosses,samples};
}
const results=[],started=Date.now();
for(const job of jobs){results.push(simulate(job));if(results.length%6===0||results.length===jobs.length){fs.writeFileSync(path.join(out,suite+'.json'),JSON.stringify({method:{suite,dt:1/30,seeds:'paired initial seeds; branching consumes RNG differently',pilot:'166.7ms reactive horizontal lane planning, speed-limited command, fixed vertical position, visible shots/telegraphs and nearby loot, automatic EMP, ranked actual offered perks; or sinusoidal sweep',limits:'Per-result limit: standard 1200s, campaign 1800s, challenge 181s (victory at 180s), endurance 3600s, focused wide-screen 600s; natural starts, no invulnerability; censored survivors are not victories',layout:'390x844 and/or 900x760; mocked HUD bounds 100/155px; no rendering or human reaction model'},hashes,complete:results.length===jobs.length,planned:jobs.length,wallSeconds:(Date.now()-started)/1000,results},null,2));console.log(suite,results.length+'/'+jobs.length,'wall',Math.round((Date.now()-started)/1000)+'s',results.at(-1).outcome,results.at(-1).seconds.toFixed(0)+'s','wave',results.at(-1).wave);}}
