/* Menu-only hangar. Selected hull is fixed when a run starts. */
(function(){'use strict';var D=window.DFJ,L=D.Logic,R=D.Render,id='falcon',weaponId='pulse',mode='endless',diff='normal',ctx,nodes={};
try{id=L.shipPreset(localStorage.getItem('neon-strike-ship')).id;weaponId=L.weaponPreset(localStorage.getItem('neon-strike-weapon')||({falcon:'pulse',bulwark:'heavy',wisp:'fan'}[id])).id;localStorage.setItem('neon-strike-weapon',weaponId);}catch(e){}
function refresh(){var ship=L.shipPreset(id),weapon=L.weaponPreset(weaponId);nodes['ship-name'].textContent=ship.name+' · '+weapon.name;nodes['ship-description'].textContent=ship.desc+' / '+weapon.desc;
nodes['launch-summary'].textContent=ship.name+' / '+weapon.name+' · '+({endless:'无限',campaign:'闯关',roguelike:'肉鸽'}[mode])+' · '+L.difficultyPreset(diff).label;
Array.prototype.forEach.call(nodes['hangar-options'].children,function(btn){var active=btn.getAttribute('data-ship')===id||btn.getAttribute('data-weapon')===weaponId;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});}
D.Hangar={selected:function(){return id;},selectedWeapon:function(){return weaponId;},mode:function(v){mode=v;refresh();},difficulty:function(v){diff=v;refresh();},init:function(){
['hangar-canvas','ship-name','ship-description','launch-summary','hangar-options','btn-hangar'].forEach(function(k){nodes[k]=document.getElementById(k);});ctx=nodes['hangar-canvas'].getContext('2d');
L.SHIPS.forEach(function(ship){var btn=document.createElement('button');btn.type='button';btn.setAttribute('data-ship',ship.id);btn.textContent='机体 · '+ship.name;btn.onclick=function(){id=ship.id;try{localStorage.setItem('neon-strike-ship',id);}catch(e){}refresh();};nodes['hangar-options'].appendChild(btn);});
L.WEAPONS.forEach(function(weapon){var btn=document.createElement('button');btn.type='button';btn.setAttribute('data-weapon',weapon.id);btn.textContent='武器 · '+weapon.name;btn.onclick=function(){weaponId=weapon.id;try{localStorage.setItem('neon-strike-weapon',weaponId);}catch(e){}refresh();};nodes['hangar-options'].appendChild(btn);});
nodes['btn-hangar'].onclick=function(){var open=nodes['hangar-options'].classList.contains('hidden');nodes['hangar-options'].classList.toggle('hidden',!open);nodes['btn-hangar'].setAttribute('aria-expanded',String(open));};refresh();},draw:function(time){
if(!ctx)return;ctx.clearRect(0,0,420,170);ctx.strokeStyle='#203e50';ctx.lineWidth=1;for(var x=0;x<420;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,170);ctx.stroke();}
var ship=L.shipPreset(id),p={ship:id,x:210,y:(ship.shield?108:128)+Math.sin(time*2)*2};
ctx.save();ctx.translate(p.x,p.y);ctx.scale(1.7,1.7);R.drawPlayer(ctx,{ship:id,shield:ship.shield,x:0,y:0},time);ctx.restore();
var cycle=.16*L.weaponPreset(weaponId).interval;
L.weaponShots(weaponId,1,0).forEach(function(s){for(var i=0;i<4;i++){var age=(time%cycle)+i*cycle,x=p.x+s.x+s.vx*age,y=p.y+s.y+s.vy*age;if(y>0)R.drawPlayerShot(ctx,{x:x,y:y,vx:s.vx,vy:s.vy,weaponId:weaponId,tier:1,source:'weapon'});}});
}};})();
