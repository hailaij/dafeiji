"use strict";
const make=require('./balance.audit'),fs=require('fs'),crypto=require('crypto');const results=[];
for(const ship of ['falcon','bulwark','wisp'])for(const weaponId of ['pulse','heavy','fan'])for(const mode of ['endless','campaign','roguelike'])for(const difficulty of ['easy','normal','hard']){
 for(const width of [390,900])for(let seed=1;seed<=3;seed++){
 const r=make(seed,width,width===390?844:760);r.api.start(mode,difficulty,false,ship,weaponId);let frame=0;
 for(;frame<3600;frame++){r.advance(1/30);r.api.tick(1/30,width*(.5+.35*Math.sin(frame/30*Math.PI/3)));if(['gameover','victory'].includes(r.api.peek().STATE))break;}
 const p=r.api.peek();results.push({ship,weaponId,mode,difficulty,width,seed,seconds:Math.min(120,frame/30),alive:p.STATE!=='gameover',wave:p.wave,level:p.level,hits:r.stats().hits});
 }
 const group=results.filter(x=>x.ship===ship&&x.weaponId===weaponId&&x.mode===mode&&x.difficulty===difficulty);console.log(ship,weaponId,mode,difficulty,group.filter(x=>x.alive).length+'/6');
}
const hashes={};for(const f of ['logic','entities','game','render','hangar'])hashes['js/'+f+'.js']=crypto.createHash('sha256').update(fs.readFileSync('js/'+f+'.js')).digest('hex');
fs.mkdirSync('test/reports/loadouts',{recursive:true});fs.writeFileSync('test/reports/loadouts/opening.json',JSON.stringify({method:'486 opening runs; 120s, 30fps, sinusoidal horizontal pilot, auto EMP, ranked offered rogue upgrades; 3 seeds, 2 viewports; not human winrates or long-run balance',hashes,results},null,2));
