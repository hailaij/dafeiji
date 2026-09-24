'use strict';
const {chromium}=require('playwright'),assert=require('assert'),{pathToFileURL}=require('url'),path=require('path');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
for(const mobile of [false,true]){
 const page=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(path.resolve('index.html')).href);await page.locator('#btn-launch').click();
 if(mobile){const c=await page.context().newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y:550,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:300,y:550,id:1}]});await page.waitForTimeout(100);const p=await page.evaluate(()=>__DFJ_PROBE.state().player);assert(Math.abs(p.x-300)<2&&Math.abs(p.y-480)<2,JSON.stringify(p));await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else {await page.mouse.move(100,450);await page.waitForTimeout(100);await page.mouse.move(1100,450);await page.waitForTimeout(100);const p=await page.evaluate(()=>__DFJ_PROBE.state().player);assert(Math.abs(p.x-1100)<2&&Math.abs(p.y-450)<2,JSON.stringify(p));}
 assert.deepEqual(errors,[]);console.log('PASS browser '+(mobile?'touch + finger offset':'mouse large move'));await page.close();
}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
