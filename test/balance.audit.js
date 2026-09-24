'use strict';
// Runs the actual production game loop in a deterministic VM. Rendering/audio/DOM
// are stubbed; combat, collisions, loot, EMP, deaths and progression are unmodified.
const fs=require('fs'), vm=require('vm'), path=require('path');
const L=require('../js/logic.js');
const root=path.resolve(__dirname,'..');
function make(seed,width=390,height=844){
 let time=0,hits=0,explosionSounds=0,cardIndex=0; const nodes=new Map(); const noop=()=>{};
 const context=new Proxy({}, {get:(o,k)=>o[k] || noop,set:(o,k,v)=>(o[k]=v,true)});
 function element(id){ if(nodes.has(id))return nodes.get(id); const classes=new Set(id==='boss-hud'?['hidden']:[]);
 const el={style:{setProperty:noop},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,v)=>{if(v===undefined)v=!classes.has(x);v?classes.add(x):classes.delete(x);}},addEventListener:noop,setAttribute:noop,appendChild:noop,getContext:()=>context,getBoundingClientRect:()=>({bottom:element('boss-hud').classList.contains('hidden')?100:155}),getAttribute:()=>'',textContent:'',innerHTML:''}; nodes.set(id,el);return el; }
 const math=Object.create(Math);math.random=L.mulberry32(seed);
 const w={innerWidth:width,innerHeight:height,devicePixelRatio:1,addEventListener:noop};
 const s={window:w,self:w,Math:math,Number,console,performance:{now:()=>time},requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element('card'+cardIndex++)}};
 vm.createContext(s);
 for(const f of ['core','logic','bosses','entities','input'])vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),s);
 w.DFJ.Audio={init:noop,stopMusic:noop,updateMusic:noop,play:n=>{if(n==='hurt')hits++;if(n==='boom'||n==='bigBoom')explosionSounds++;}};
 w.DFJ.Render=new Proxy({C:{cyan:'#0ff',red:'#f00',yellow:'#ff0',magenta:'#f0f'},makeStars:()=>[],sprite:()=>({width:48,height:48})},{get:(o,k)=>o[k]||noop});
 let code=fs.readFileSync(path.join(root,'js/game.js'),'utf8');
 const marker='  /* ---- 启动 ---- */';
 if(!code.includes(marker))throw Error('Game audit hook missing');
 code=code.replace(marker,`window.__audit={combat:function(){return {stats:runStats,player:player,enemies:enemies,clear:parentWaveClear,bossWave:function(){wave=5;levelWave=4;},clearSpawn:function(){spawnSeq=[];},plan:function(cfg,n){var old=wave;wave=n;var seq=buildSpawnSeq(cfg);wave=old;return seq;},setBoss:function(b){boss=b;},bullets:pbullets.active,enemyBullets:ebullets.active,hurt:hurtPlayer,emp:triggerEMP,damage:dealDamage,kill:killEnemy,fire:playerFire,fireStep:function(dt,x,y){now=performance.now();if(x!==undefined){pointer.active=true;pointer.x=x;pointer.y=y;}movePlayer(dt);},finish:gameOver,upgrade:openUpgrade,cooldown:function(){return empCdUntil-now;}};},start:function(mode,difficulty,late,ship,weaponId){DFJ.Hangar={selected:function(){return ship||'falcon';},selectedWeapon:function(){return weaponId||'pulse';}};DIFFICULTY=difficulty;startGame(mode);if(late){if(mode===L.CAMPAIGN){level=8;levelWave=0;}else wave=19;nextWave();player.weapon=3;player.damage=2;}},tick:function(dt,x){pointer.active=true;pointer.x=x;pointer.y=H*.82;triggerEMP();if(STATE==='upgrade'){var order=player.hp<2?['repair','shield','life','damage','rapid']:['damage','power','rapid','repair','emp','crit'];var best=rogueChoices.slice().sort(function(a,b){var ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?99:ai)-(bi<0?99:bi);})[0];choosePerk(best.id);}update(dt);layoutBattlefield();draw();},peek:function(){return {STATE:STATE,player:player,boss:boss,enemies:enemies,wave:wave,level:level,levelWave:levelWave,bullets:ebullets.active,powerups:powerups,spawnInterval:waveSpawnInterval,difficulty:currentDiff()};},apply:function(id){choosePerk(id);return JSON.parse(JSON.stringify(player));},probe:function(){if(MODE===L.CAMPAIGN){level=1;levelWave=4;}else wave=5;var speed=[];var original=fireEnemyBullet;fireEnemyBullet=function(x,y,vx,vy){original(x,y,vx,vy);var shot=ebullets.active[ebullets.active.length-1];speed.push(Math.hypot(shot.vx,shot.vy));};var en=E.spawnEnemy('gunner',W,currentDiff());en.aimLock={x:100,y:150,angle:Math.PI/2};enemyShoot(en);fireEnemyBullet=original;var bh=currentBossHp();var old=player.crit;choosePerk('crit');return {gunnerSpeed:speed[0],bossHp:bh,critBefore:old,critAfter:player.crit};}};\n`+marker);
 vm.runInContext(code,s);
 return {api:w.__audit,advance:dt=>time+=dt*1000,stats:()=>({hits,explosionSounds}),DFJ:w.DFJ};
}
if(require.main===module){
 const reportDir=path.resolve(root,process.env.BALANCE_REPORT_DIR || 'test/reports');
 const results=[];const seeds=6, duration=120, dt=1/30;
 for(const stage of ['opening','late'])for(const mode of ['endless','campaign','roguelike'])for(const difficulty of ['easy','normal','hard']){
  for(const width of [390,900])for(const pilot of ['stationary','sweep'])for(let seed=1;seed<=seeds;seed++){
   const run=make(seed,width,width===390?844:760);run.api.start(mode,difficulty,stage==='late');let seconds=0;
   for(;seconds<duration;seconds+=dt){run.advance(dt);const x=pilot==='stationary'?width/2:width*(.5+.35*Math.sin(seconds*Math.PI/3));run.api.tick(dt,x);const state=run.api.peek();if(state.STATE==='gameover'||state.STATE==='victory')break;}
   const p=run.api.peek();results.push({stage,mode,difficulty,width,pilot,seed,seconds:Math.round(seconds),alive:p.STATE!=='gameover',victory:p.STATE==='victory',wave:p.wave,level:p.level,levelWave:p.levelWave,hp:p.player.hp,lives:p.player.lives,damage:p.player.damage,weapon:p.player.weapon,...run.stats()});
  }
  const group=results.filter(r=>r.stage===stage&&r.mode===mode&&r.difficulty===difficulty);
  console.log(stage,mode,difficulty,JSON.stringify({runs:group.length,alive:group.filter(r=>r.alive).length,avgHits:group.reduce((a,r)=>a+r.hits,0)/group.length,avgWave:group.reduce((a,r)=>a+(mode==='campaign'?(r.level-1)*4+r.levelWave:r.wave),0)/group.length}));
 }
 fs.mkdirSync(path.join(reportDir),{recursive:true});fs.writeFileSync(path.join(reportDir,'balance-results.json'),JSON.stringify({method:{seeds,duration,dt,description:'Actual game loop, stub DOM/audio/render; stationary and sinusoidal bots, automatic EMP and ranked offered upgrades; late stage starts with weapon 3 / damage 2, not a natural playthrough',lateStart:'wave 20 for endless/roguelike; level 8 wave 1 for campaign; no accumulated rogue upgrades',layout:'Mock HUD bottom 100px without Boss / 155px with Boss; 390x844 and 900x760; no human reaction model'},results},null,2));
 const probes=[];for(const mode of ['endless','campaign','roguelike'])for(const d of ['easy','normal','hard']){const r=make(1);r.api.start(mode,d,true);probes.push({mode,difficulty:d,...r.api.probe()});}console.log('PROBES',JSON.stringify(probes));fs.writeFileSync(path.join(reportDir,'balance-probes.json'),JSON.stringify(probes,null,2));
 const perks=[];for(const perk of L.ROGUELIKE_PERKS){const r=make(1);r.api.start('roguelike','normal',false);const before=JSON.parse(JSON.stringify(r.api.peek().player));const expected=L.rogueApply(before,perk.id);const actual=r.api.apply(perk.id);const fields=Object.keys(expected).filter(k=>expected[k]!==before[k]);perks.push({id:perk.id,fields,applied:fields.every(k=>expected[k]===actual[k]),differences:fields.filter(k=>expected[k]!==actual[k]).map(k=>({field:k,expected:expected[k],actual:actual[k]}))});}
 fs.writeFileSync(path.join(reportDir,'balance-perks.json'),JSON.stringify(perks,null,2));
 const hashes={};for(const f of ['core','logic','bosses','entities','game','input'])hashes['js/'+f+'.js']=require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'js',f+'.js'))).digest('hex');fs.writeFileSync(path.join(reportDir,'balance-source-hashes.json'),JSON.stringify(hashes,null,2));

}
module.exports=make;
