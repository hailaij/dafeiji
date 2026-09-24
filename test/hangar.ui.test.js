'use strict';
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
(async()=>{fs.mkdirSync('test/artifacts',{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const [width,height] of [[390,844],[844,390],[1280,800]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const code=fs.readFileSync('js/game.js','utf8').replace('  /* ---- 启动 ---- */','window.__hangarTest={player:function(){return player;},upgrade:openUpgrade};\n  /* ---- 启动 ---- */');
 await page.route('**/js/game.js',r=>r.fulfill({body:code,contentType:'text/javascript'}));
 const url=pathToFileURL(path.resolve('index.html')).href;await page.goto(url);
 assert.equal(await page.evaluate(()=>__DFJ_PROBE.state().STATE),'start');
 await page.locator('#btn-hangar').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>__DFJ_PROBE.state().STATE),'start');
 for(const ship of ['falcon','bulwark','wisp']){
 if(await page.locator('#hangar-options').isHidden())await page.locator('#btn-hangar').click();
 await page.locator('[data-ship="'+ship+'"]').click();assert.equal(await page.locator('[data-ship="'+ship+'"]').getAttribute('aria-pressed'),'true');
 for(const weaponId of ['pulse','heavy','fan'])for(const mode of ['endless','campaign','roguelike']){
 await page.locator('[data-weapon="'+weaponId+'"]').click();
 assert.equal(await page.evaluate(()=>DFJ.Hangar.selected()),ship);
 await page.locator('[data-mode="'+mode+'"]').click();assert.equal(await page.evaluate(()=>__DFJ_PROBE.state().STATE),'start');
 await page.locator('#btn-launch').click();await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>__DFJ_PROBE.state().mode),mode);assert.equal(await page.evaluate(()=>__hangarTest.player().ship),ship);
 await page.locator('#btn-pause').click();await page.locator('#btn-pause-restart').click();assert.equal(await page.evaluate(()=>__hangarTest.player().ship),ship);
 assert.equal(await page.evaluate(()=>__hangarTest.player().weaponId),weaponId);
 await page.locator('#btn-pause').click();await page.locator('#btn-pause-menu').click();
 }
 }
 await page.reload();assert.equal(await page.evaluate(()=>DFJ.Hangar.selected()),'wisp');
 assert.equal(await page.evaluate(()=>DFJ.Hangar.selectedWeapon()),'fan');
 await page.waitForTimeout(200);const launch=await page.locator('#btn-launch').boundingBox();assert(launch.y+launch.height<=height,'Launch visible without scrolling');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'test/artifacts/hangar-'+width+'.png'});// A legacy fixed loadout migrates once; changing hull must never change weapon.
 await page.evaluate(()=>{localStorage.setItem('neon-strike-ship','bulwark');localStorage.removeItem('neon-strike-weapon');});await page.reload();
 assert.equal(await page.evaluate(()=>DFJ.Hangar.selectedWeapon()),'heavy');
 await page.locator('#btn-hangar').click();await page.locator('[data-ship="falcon"]').click();await page.reload();
 assert.equal(await page.evaluate(()=>DFJ.Hangar.selectedWeapon()),'heavy');
 await page.evaluate(()=>{localStorage.setItem('neon-strike-ship','invalid');localStorage.setItem('neon-strike-weapon','invalid');});await page.reload();
 assert.equal(await page.evaluate(()=>DFJ.Hangar.selected()),'falcon');assert.equal(await page.evaluate(()=>DFJ.Hangar.selectedWeapon()),'pulse');
 assert.deepStrictEqual(errors,[]);await page.close();console.log('PASS hangar/modes/restart/persistence '+width+'x'+height);
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
