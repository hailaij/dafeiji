'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('https://apps.gamesvibe.app/**',route=>{
   const name=new URL(route.request().url()).pathname.replace(/^\//,'')||'index.html';
   const file=path.join(root,name);
   return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'}):route.abort();
  });
  await page.route('https://gamesvibe.app/workshop/loader/v1.js',route=>route.fulfill({contentType:'text/javascript',body:`
   window.order=['loader'];
   window.VibeHubWorkshop={beforeStart:new Promise(r=>window.releaseBefore=r),afterStart:new Promise(r=>window.releaseAfter=r),getEnabledMods:()=>[{id:'test'}],markGameReady(){order.push('marked');if(!NeonStrikeMods.getSnapshot())throw Error('Not initialized');NeonStrikeMods.registerReadout('test.after',s=>'EMP '+s.empCooldown);releaseAfter({mods:[],errors:[]});}};
  `}));
  await page.goto('https://apps.gamesvibe.app/index.html',{waitUntil:'load'});
  assert.equal(await page.evaluate(()=>NeonStrikeMods.getSnapshot()),null,'Game must not start before beforeStart');
  await page.evaluate(()=>{
   const a=NeonStrikeMods;
   a.registerPlayerMarker('test.ring',{color:'#cc88ff',radius:28});
   a.on('ready','test.ready',()=>order.push('ready'));
   a.on('snapshot','test.error',()=>{throw Error('Expected isolated callback failure')});
   releaseBefore({mods:[],errors:[]});
  });
  await page.evaluate(()=>window.__neonBoot);
  assert.deepEqual(await page.evaluate(()=>order),['loader','ready','marked']);
  await page.locator('#btn-launch').click();
  await page.waitForFunction(()=>NeonStrikeMods.getSnapshot().state==='playing');
  assert(await page.evaluate(()=>{
   const a=NeonStrikeMods,s=a.getSnapshot();let duplicate=false,blocked=false,invalid=false;
   try{a.registerPlayerMarker('test.ring',{color:'#ffffff',radius:20})}catch{duplicate=true}
   try{a.registerPlayerMarker('test.invalid',{color:'red',radius:NaN})}catch{invalid=true}
   try{a.assertMultiplayerAllowed()}catch{blocked=true}
   s.player.hp=999;
   return duplicate&&blocked&&invalid&&Object.isFrozen(s)&&Object.isFrozen(s.player)&&s.player.hp!==999;
  }));
  await page.locator('#btn-pause').click();
  await page.waitForFunction(()=>NeonStrikeMods.getSnapshot().state==='paused');
  await page.evaluate(()=>DFJ.start());
  assert.equal(await page.evaluate(()=>NeonStrikeMods.getSnapshot().state),'paused','Repeated start must be idempotent');
  assert.deepEqual(errors,[]);
  await page.close();
  const offline=await browser.newPage();
  await offline.route('https://gamesvibe.app/**',r=>r.abort());
  await offline.goto(pathToFileURL(path.join(root,'index.html')).href);
  await offline.locator('#btn-launch').click();
  await offline.waitForFunction(()=>NeonStrikeMods.getSnapshot().state==='playing');
  assert(await offline.evaluate(()=>NeonStrikeMods.assertMultiplayerAllowed()));
  await offline.close();
  const failed=await browser.newPage();
  await failed.route('https://apps.gamesvibe.app/**',r=>{const n=new URL(r.request().url()).pathname.slice(1)||'index.html';const f=path.join(root,n);return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:n.endsWith('.js')?'text/javascript':n.endsWith('.css')?'text/css':'text/html'}):r.abort();});
  await failed.route('https://gamesvibe.app/**',r=>r.abort());
  await failed.goto('https://apps.gamesvibe.app/index.html');
  await failed.locator('[role="alert"]').waitFor();
  assert.equal(await failed.evaluate(()=>NeonStrikeMods.getSnapshot()),null);
  await failed.close();
  console.log('PASS workshop startup barriers, before/after mods, immutable snapshots, conflicts, errors, offline fallback and multiplayer guard');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
