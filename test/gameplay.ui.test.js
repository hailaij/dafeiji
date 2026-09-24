const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
(async()=>{
 fs.mkdirSync('test/artifacts',{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 for(const [width,height] of [[390,844],[844,390],[1280,800]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 let code=fs.readFileSync('js/game.js','utf8').replace('  /* ---- 启动 ---- */',`window.__playtest={start:startGame,upgrade:openUpgrade,select:choosePerk,finish:gameOver,win:victory,seed:function(){player.crit=1;player.emp=.4;player.reflect=1;},stats:function(){return runStats;}};\n  /* ---- 启动 ---- */`);
 await page.route('**/js/game.js',r=>r.fulfill({contentType:'text/javascript',body:code}));
 await page.goto(pathToFileURL(path.resolve('index.html')).href);
 for(const mode of ['endless','campaign','roguelike']){
 await page.evaluate(m=>window.__playtest.start(m),mode);await page.waitForTimeout(100);
 await page.evaluate(()=>window.__playtest.finish());assert((await page.locator('#run-over').innerText()).includes('主炮伤害'));
 }
 await page.evaluate(()=>{window.__playtest.start('roguelike');window.__playtest.seed();window.__playtest.upgrade();});
 assert((await page.locator('#build-progress').innerText()).includes('1/2'));
 assert.equal(await page.locator('#upgrade-cards button').count(),3);
 await page.locator('#upgrade-cards button').first().click();
 await page.evaluate(()=>window.__playtest.win());assert(await page.locator('#run-victory').isVisible());
 const bounds=await page.locator('#panel-victory').boundingBox();assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(width===390){await page.screenshot({path:'test/artifacts/gameplay-mobile.png'});await page.evaluate(()=>{window.__playtest.start('roguelike');window.__playtest.seed();window.__playtest.upgrade();});await page.screenshot({path:'test/artifacts/gameplay-upgrade.png'});}
 assert.deepStrictEqual(errors,[]);await page.close();console.log('PASS UI '+width+'x'+height);
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
