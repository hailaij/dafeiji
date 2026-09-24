'use strict';
const assert=require('assert'),make=require('./balance.audit'),L=require('../js/logic');
// Exercise real movement, including playfield clamps; do not replace it with the formula.
for(const ship of L.SHIPS)for(const fps of [30,60,120,144]){
 const r=make(1,900,760);r.api.start('endless','normal',false,ship.id,'pulse');const c=r.api.combat();
 c.player.x=100;c.player.y=450;
 const n=Math.ceil(.05*fps);for(let i=0;i<n;i++)c.fireStep(1/fps,700,450);
 assert(700-c.player.x<18,`${ship.id} ${fps}Hz: large jump must reach >97% in ~50ms`);
 // Track a rapid sweep (900 px/s); no hundreds-of-pixels backlog.
 c.player.x=100;let worst=0;
 for(let i=1;i<=Math.floor(fps*.6);i++){const target=100+900*i/fps;c.fireStep(1/fps,target,450);worst=Math.max(worst,target-c.player.x);}
 assert(worst<16,`${ship.id} ${fps}Hz sweep lag ${worst}`);
 for(let i=0;i<fps/5;i++)c.fireStep(1/fps,640,450);
 assert.equal(c.player.x,640,'Settles without residual drift');
 c.fireStep(1/fps,-10000,-10000);assert(c.player.x>=c.player.r+4&&c.player.y>c.player.r,'Safe top/left bounds');
 c.fireStep(1/fps,10000,10000);assert(c.player.x<=900-c.player.r-4&&c.player.y<=760-c.player.r-4,'Safe bottom/right bounds');
}
const endpoints=[];
for(const ship of L.SHIPS){const r=make(1,900,760);r.api.start('roguelike','normal',false,ship.id,'pulse');const c=r.api.combat();c.player.x=100;c.player.y=450;c.fireStep(1/60,700,450);endpoints.push(c.player.x);c.player.x=100;r.api.apply('speed');c.fireStep(1/60,700,450);assert(c.player.x>endpoints.at(-1),'Rogue speed improves response');}
assert(endpoints[1]<endpoints[0]&&endpoints[0]<endpoints[2],'Hull response ordering is preserved');
console.log('PASS: actual pointer tracking at 30/60/120/144Hz, rapid sweeps, settling, playfield limits and mobility upgrades');
