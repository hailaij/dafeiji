'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
(async()=>{
 fs.mkdirSync('test/artifacts',{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
 try {for(const [width,height] of [[280,720],[390,844],[844,390],[1280,800]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const code=fs.readFileSync('js/game.js','utf8').replace('  /* ---- 启动 ---- */',`window.__enemyFixture=function(){
 startGame('endless');spawnSeq=[];player.invUntil=1e15;player.fireCd=1e6;
 boss=E.spawnBoss(W,{kind:'fortress',bossHp:200,difficulty:'normal'});layoutBattlefield();boss.y=boss.targetY;boss.fireCd=100;
 var g=E.spawnEnemy('guardian',W,currentDiff());g.x=W*.5;g.y=H*.48;enemies.push(g);
 [-1,1].forEach(function(i){var e=E.spawnEnemy('grunt',W,currentDiff());e.x=g.x+i*50;e.y=g.y+28;enemies.push(e);});
 var t=E.spawnEnemy('transport',W,currentDiff());enemies.push(t);};
  /* ---- 启动 ---- */`);
 await page.route('**/js/game.js',r=>r.fulfill({contentType:'text/javascript',body:code}));
 await page.goto(pathToFileURL(path.resolve('index.html')).href);await page.evaluate(()=>window.__enemyFixture());await page.waitForTimeout(250);
 assert((await page.locator('#boss-phase').innerText()).includes('炮台 2/2'));
 assert(await page.evaluate(()=>!!window.DFJ.Render.sprite('guardian')&&!!window.DFJ.Render.sprite('transport')));
 await page.screenshot({path:'test/artifacts/enemies-'+width+'.png'});await page.waitForTimeout(1300);
 assert.deepStrictEqual(errors,[]);await page.close();console.log('PASS new enemies/fortress rendering '+width+'x'+height);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
