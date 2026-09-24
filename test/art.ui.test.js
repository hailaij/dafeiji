const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
(async()=>{fs.mkdirSync('test/artifacts',{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1100,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(path.resolve('test/art-lab.html')).href);
 const result=await page.evaluate(()=>{
 const b=DFJ.Entities.spawnBoss(390,{kind:'fortress',bossHp:200});b.x=120;b.y=60;b.phase=2;b.pending={warning:1};b.fireCd=.5;
 for(const profile of DFJ.Logic.BOSS_ROSTER)for(const state of [0,1,2]){
 const boss=DFJ.Entities.spawnBoss(390,{kind:profile.id,bossHp:200});boss.x=120;boss.y=60;boss.phase=state===2?2:1;boss.recovery=state===2?1:0;
 if(state===1){boss.pending={warning:1};boss.fireCd=.2;}
 const original=JSON.stringify(boss),ctx=document.createElement('canvas').getContext('2d');DFJ.Render.drawBoss(ctx,boss);
 if(JSON.stringify(boss)!==original)throw Error('Render changed '+profile.id);
 }
 for(const type of ['grunt','sine','gunner','tank','diver','splitter','sniper','weaver','bomber','mirror','healer','phantom','guardian','transport']){
 const enemy=DFJ.Entities.spawnEnemy(type,390,DFJ.Logic.difficulty(1,'normal'));enemy.x=100;enemy.y=80;enemy.aimLock={};enemy.ghosted=true;enemy.__stunUntil=100;
 const original=JSON.stringify(enemy),ctx=document.createElement('canvas').getContext('2d');DFJ.Render.drawEnemy(ctx,enemy,0);DFJ.Render.drawEnemy(ctx,enemy,200);
 if(JSON.stringify(enemy)!==original)throw Error('Enemy render mutation');
 }
 const before=JSON.stringify(b);DFJ.Render.drawFortress(document.createElement('canvas').getContext('2d'),b);
 return {unchanged:before===JSON.stringify(b),counts:Array.from(document.querySelectorAll('canvas')).map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n;})};});
 assert(result.unchanged);assert.equal(result.counts.length,51);assert(result.counts.every(n=>n>80));
 await page.screenshot({path:'test/artifacts/enemy-art-desktop.png',fullPage:true});
 await page.locator('#roster').screenshot({path:'test/artifacts/boss-art-roster.png'});
 await page.locator('#hit').check();await page.locator('#gray').click();await page.screenshot({path:'test/artifacts/enemy-art-hitboxes.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'test/artifacts/enemy-art-mobile.png',fullPage:true});assert.deepStrictEqual(errors,[]);
 await page.goto(pathToFileURL(path.resolve('index.html')).href);
 const kinds=await page.evaluate(()=>DFJ.Logic.BOSS_ROSTER.map(b=>b.id));
 for(const width of [280,390,844]){
 await page.setViewportSize({width,height:width===844?390:844});
 for(const kind of kinds){await page.evaluate(k=>{window.__DFJ_PROBE.debugSpawnBoss(k,2);window.__DFJ_PROBE.godmode(true);},kind);await page.waitForTimeout(100);}
 }
 assert.deepStrictEqual(errors,[]);
 console.log('PASS live 11 Bosses in phase 2 across three viewports');
 console.log('PASS: 14 enemy sprites, 4 fortress states and all 11 Bosses in 3 states render; render leaves battle state unchanged; desktop/mobile atlas and collision overlay');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
