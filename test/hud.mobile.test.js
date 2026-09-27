'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const baseline=process.argv.includes('--baseline'),rows=[];
(async()=>{fs.mkdirSync('test/artifacts',{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const [width,height] of [[280,720],[320,568],[360,640],[390,844],[430,932],[568,320],[667,375],[844,390],[932,430],[1280,800]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:width!==1280}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 const code=fs.readFileSync('js/game.js','utf8').replace('  /* ---- 启动 ---- */',`window.__hudTest={setup:function(kind){startGame('roguelike');player.invUntil=1e12;player.fireCd=1e12;score=123456789;combo=24;player.rageUntil=now+12000;player.frostUntil=now+9000;player.crit=1;player.critDmg=1;player.emp=.4;player.magnet=1;player.reflect=1;player.vamp=.04;if(kind){boss=E.spawnBoss(W,{kind:kind,bossHp:200});layoutBattlefield();boss.y=boss.targetY;boss.fireCd=100;boss.phase=2;boss.hp=boss.maxHp*.4;}updateHUD();},buffsOff:function(){player.rageUntil=0;player.frostUntil=0;updateHUD();},state:function(){return {hudBottom:hudBottom,target:boss&&boss.targetY};}};\n  /* ---- 启动 ---- */`);
 await p.route('**/js/game.js',r=>r.fulfill({body:code,contentType:'text/javascript'}));await p.goto(pathToFileURL(path.resolve('index.html')).href);
 for(const kind of [null,'fortress']){
  await p.evaluate(k=>__hudTest.setup(k),kind);await p.waitForFunction(()=>Math.abs(__hudTest.state().hudBottom-document.querySelector('#hud').getBoundingClientRect().bottom)<2,{},{timeout:3000});
  const measurements=await p.evaluate(()=>({bottom:document.querySelector('#hud').getBoundingClientRect().bottom,height:document.querySelector('#hud').getBoundingClientRect().height,scroll:document.documentElement.scrollWidth,live:__hudTest.state(),pause:document.querySelector('#btn-pause').getBoundingClientRect().width,emp:document.querySelector('#btn-emp').getBoundingClientRect().width}));
  rows.push({width,viewportHeight:height,boss:!!kind,...measurements});
  if(!baseline){assert(measurements.scroll<=width);assert(measurements.pause>=44);assert(measurements.emp>=56);assert(await p.locator('#hud-hp').isVisible());assert(await p.locator('#hud-shield').isVisible());assert(await p.locator('#hud-lives').isVisible());if(kind)assert(await p.locator('#boss-skill').isVisible());assert(Math.abs(measurements.live.hudBottom-measurements.bottom)<2,JSON.stringify({width,kind,measurements,errors}));if(width!==1280){assert(measurements.height<=(kind?104:76),JSON.stringify(rows.at(-1)));}}
  if(!baseline&&kind&&width!==1280){const oldHeight=measurements.height;await p.evaluate(()=>__hudTest.buffsOff());assert.equal((await p.locator('#hud').boundingBox()).height,oldHeight,'Buff expiry must not move the battlefield');}
  if(kind)await p.screenshot({path:`test/artifacts/hud-${baseline?'before':'after'}-${width}.png`});
 }
 if(!baseline&&width===390){
  await p.locator('#btn-pause').click();const details=await p.locator('#pause-details').innerText();assert(details.includes('肉鸽模式')&&details.includes('游隼')&&details.includes('荆棘再生')&&details.includes('♫'));await p.locator('#btn-resume').click();
  await p.setViewportSize({width:844,height:390});await p.waitForFunction(()=>__hudTest.state().hudBottom===81);assert.equal(await p.locator('#boss-skill').isVisible(),true);
  await p.evaluate(()=>{const h=document.querySelector('#hud');h.style.paddingTop='36px';h.style.paddingLeft='44px';h.style.paddingRight='44px';});await p.waitForFunction(()=>__hudTest.state().hudBottom===113);const pause=await p.locator('#btn-pause').boundingBox();assert(pause.x+pause.width<=800);assert((await p.evaluate(()=>__hudTest.state().target))===171);
  await p.screenshot({path:'test/artifacts/hud-safe-area.png'});
 }
 assert.deepEqual(errors,[]);await p.close();
}
fs.writeFileSync(`test/artifacts/hud-${baseline?'before':'after'}.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.map(({width,viewportHeight,boss,bottom})=>({width,viewportHeight,boss,bottom})),null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
