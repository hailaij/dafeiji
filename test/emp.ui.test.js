'use strict';
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const [width,height] of [[390,844],[844,390],[1280,800]]){
  const p=await browser.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.clock.install({time:new Date('2026-09-27T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));
  const code=fs.readFileSync('js/game.js','utf8').replace('  /* ---- 启动 ---- */',`window.__empTest={uses:function(){return runStats.empUses;},remaining:function(){return empCooldown;},boss:function(protectedPhase){boss=E.spawnBoss(W,{kind:'boss',bossHp:200});layoutBattlefield();boss.y=boss.targetY;boss.attackIndex=protectedPhase?0:1;boss.fireCd=100;player.x=boss.x;player.y=boss.y+70;},ready:function(){empCooldown=0;},bullets:function(){for(var i=0;i<7;i++){var b=ebullets.obtain();b.dead=false;b.x=20+i*30;b.y=H*.5;b.vx=0;b.vy=0;b.r=3;}},finish:gameOver};\n  /* ---- 启动 ---- */`);
  await p.route('**/js/game.js',r=>r.fulfill({body:code,contentType:'text/javascript'}));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.locator('#btn-launch').click();await p.evaluate(()=>__DFJ_PROBE.godmode(true));await p.clock.runFor(50);
  await p.evaluate(()=>__empTest.bullets());await p.keyboard.press('e');assert.equal(await p.locator('#emp-feedback').innerText(),'EMP 清除 7 发弹幕');assert.equal(await p.locator('#emp-cd').innerText(),'10s');
  await p.clock.runFor(100);await p.screenshot({path:`test/artifacts/emp-${width}.png`});
  await p.keyboard.press('e');assert((await p.locator('#emp-feedback').innerText()).includes('冷却中'));assert.equal(await p.evaluate(()=>__empTest.uses()),1);
  await p.locator('#btn-pause').click();const before=await p.evaluate(()=>__empTest.remaining());await p.clock.runFor(30000);assert.equal(await p.evaluate(()=>__empTest.remaining()),before);assert(await p.locator('#emp-feedback').isHidden());await p.locator('#btn-resume').click();
  await p.clock.runFor(9300);assert(/^0\.[1-9]s$/.test(await p.locator('#emp-cd').innerText()));await p.clock.runFor(700);assert.equal(await p.locator('#emp-cd').innerText(),'就绪');assert(await p.locator('#btn-emp').evaluate(e=>e.classList.contains('emp-ready')));await p.clock.runFor(650);assert(!(await p.locator('#btn-emp').evaluate(e=>e.classList.contains('emp-ready'))));
  await p.evaluate(()=>__empTest.boss(true));await p.keyboard.press('e');assert((await p.locator('#emp-feedback').innerText()).includes('免疫'));
  await p.evaluate(()=>{__empTest.ready();__empTest.boss(false);});await p.keyboard.press('e');assert((await p.locator('#emp-feedback').innerText()).includes('火控受扰'));
  // Use real multi-touch dispatch: the pilot finger stays down while EMP is pressed.
  await p.evaluate(()=>__empTest.ready());const cdp=await p.context().newCDPSession(p),box=await p.locator('#btn-emp').boundingBox();const finger={x:width*.3,y:height*.7,id:1},action={x:box.x+box.width/2,y:box.y+box.height/2,id:2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger]});const uses=await p.evaluate(()=>__empTest.uses());await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger,action]});assert.equal(await p.evaluate(()=>__empTest.uses()),uses+1);
  finger.x=width*.55;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger,action]});await p.clock.runFor(100);assert(Math.abs((await p.evaluate(()=>__DFJ_PROBE.state().player.x))-finger.x)<3);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await p.close();console.log('PASS EMP feedback, pause/resume, ready pulse, Boss immunity/disruption and multitouch '+width);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
