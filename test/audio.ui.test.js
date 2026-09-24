'use strict';
const {chromium}=require('playwright'),assert=require('assert'),{pathToFileURL}=require('url'),path=require('path');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await b.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.testCtx=this;window.testGains=[];}createGain(){const g=super.createGain();window.testGains.push(g);return g;}};});
 await page.goto(pathToFileURL(path.resolve('index.html')).href);await page.locator('#btn-launch').click();
 const roster=await page.evaluate(()=>DFJ.Logic.BOSS_ROSTER.map(b=>b.id));
 for(const kind of roster){
  await page.evaluate(k=>{__DFJ_PROBE.debugSpawnBoss(k,1);__DFJ_PROBE.godmode(true);},kind);await page.waitForTimeout(100);
  const peak=await page.evaluate(async()=>{const bus=testGains.findLast(g=>g.gain.value===Math.fround(.55));if(!bus)throw Error('No music bus');const a=testCtx.createAnalyser();bus.connect(a);a.fftSize=2048;const data=new Float32Array(a.fftSize);let peak=0;for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,20));a.getFloatTimeDomainData(data);for(const v of data)peak=Math.max(peak,Math.abs(v));}bus.disconnect(a);return peak;});
  assert(peak>.0001,`${kind} has no real music signal`);assert.equal(await page.evaluate(()=>DFJ.Audio.status().musicKind),kind);
 }
 await page.locator('#btn-pause').click();assert.equal(await page.evaluate(()=>DFJ.Audio.status().musicKind),null);
 await page.evaluate(()=>testCtx.suspend());await page.locator('#btn-resume').click();await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>DFJ.Audio.status().contextState),'running');assert.equal(await page.evaluate(()=>DFJ.Audio.status().musicKind),roster.at(-1));
 await page.evaluate(()=>testCtx.suspend());await page.mouse.click(150,450);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>testCtx.state),'running');
 await page.evaluate(()=>DFJ.Audio.setMuted(true));await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>DFJ.Audio.status().musicKind),null);await page.evaluate(()=>DFJ.Audio.setMuted(false));await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>DFJ.Audio.status().musicKind),roster.at(-1));
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>DFJ.Audio.status().lastError),null);
 console.log('PASS: 11 Boss tracks emit real WebAudio samples; pause/resume unlock, pointer unlock, mute/unmute and error-free scheduling');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
