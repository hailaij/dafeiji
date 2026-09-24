/* NEON STRIKE - render.js : canvas 渲染
 * 精灵预烘焙到离屏 canvas(发光已烤入),逐帧只 drawImage,避免 shadowBlur 卡顿。
 */
(function () {
  'use strict';
  var DFJ = (window.DFJ = window.DFJ || {});
  var R = (DFJ.Render = {});
  var C = { cyan: '#00f0ff', magenta: '#ff00e5', yellow: '#ffe600', orange: '#ff8c00', red: '#ff3355', green: '#74e7a1' };
  R.C = C;

  var S = {}; /* 精灵表 */

  function makeSprite(size, draw) {
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var g = c.getContext('2d');
    g.translate(size / 2, size / 2);
    g.lineJoin = 'round';
    draw(g);
    return c;
  }
  function neon(g, color, fill, lw) {
    g.shadowColor = color;
    g.shadowBlur = 14;
    g.strokeStyle = color;
    g.lineWidth = lw || 2.5;
    g.fillStyle = fill;
    g.stroke();
    g.fill();
    g.shadowBlur = 0;
  }
  function poly(g, pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  }
  function hexPts(r, rot) {
    var p = [];
    for (var i = 0; i < 6; i++) {
      var a = rot + i * Math.PI / 3;
      p.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return p;
  }

  // Enemy hulls use opaque armour and a narrow rim; projectile glow stays dominant.
  function armour(g, pts, color) {
    poly(g,pts);g.fillStyle='#17202f';g.fill();g.strokeStyle=color;g.lineWidth=1.5;
    g.shadowColor=color;g.shadowBlur=3;g.stroke();g.shadowBlur=0;
  }
  function lens(g,color,x,y,r) {g.fillStyle=color;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
  function seam(g,pts) {g.strokeStyle='#607184';g.lineWidth=1;g.beginPath();pts.forEach(function(p,i){if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);});g.stroke();}

  R.init = function () {
    if (S.player) return;

    S.player = makeSprite(64, function (g) {
      poly(g, [[0, -18], [6, -6], [16, 10], [5, 7], [0, 12], [-5, 7], [-16, 10], [-6, -6]]);
      neon(g, C.cyan, 'rgba(0,240,255,0.14)', 2.5);
      g.shadowColor = C.cyan; g.shadowBlur = 8;
      g.fillStyle = '#dffbff';
      g.fillRect(-1.5, -8, 3, 7); /* 驾驶舱 */
      g.shadowBlur = 0;
    });

    S['player-bulwark']=makeSprite(72,function(g){armour(g,[[-19,12],[-18,-7],[-9,-17],[0,-12],[9,-17],[18,-7],[19,12],[7,8],[0,14],[-7,8]],'#a8d9ff');g.fillStyle='#e2f5ff';g.fillRect(-3,-8,6,12);[-1,1].forEach(function(a){g.fillStyle='#748ba7';g.fillRect(a*12-3,-2,6,10);});});
    S['player-wisp']=makeSprite(72,function(g){armour(g,[[0,-19],[7,-5],[4,11],[0,15],[-4,11],[-7,-5]],'#96ffe2');[-1,1].forEach(function(a){g.save();g.scale(a,1);armour(g,[[11,-9],[19,8],[10,4]],'#64beac');g.restore();});lens(g,'#d9fff3',0,-5,3);});
    S.grunt = makeSprite(72, function(g) { armour(g,[[0,12],[-10,-8],[-3,-5],[0,-10],[3,-5],[10,-8]],C.magenta);lens(g,'#ff9de8',0,1,2); });

    S.sine = makeSprite(72, function(g) { armour(g,[[-13,-5],[-6,-11],[0,-4],[6,-11],[13,-5],[7,8],[0,12],[-7,8]],C.magenta);seam(g,[[-9,-3],[0,5],[9,-3]]);lens(g,C.orange,0,1,2); });

    S.gunner = makeSprite(72, function(g) { armour(g,[[-15,-8],[-8,-14],[8,-14],[15,-8],[15,5],[7,12],[-7,12],[-15,5]],C.orange);g.fillStyle='#344357';g.fillRect(-4,2,8,14);g.strokeStyle=C.orange;g.strokeRect(-3,3,6,13);lens(g,'#ffd392',0,-4,4); });

    S.tank = makeSprite(72, function(g) { armour(g,[[-22,-8],[-14,-20],[14,-20],[22,-8],[20,14],[10,21],[-10,21],[-20,14]],C.yellow);[-1,1].forEach(function(a){g.fillStyle='#394653';g.fillRect(a<0?-21:13,-9,8,21);seam(g,[[a*14,-10],[a*14,13]]);});armour(g,[[-10,-10],[10,-10],[10,9],[-10,9]],'#b5a879');lens(g,C.orange,0,1,4); });

    S.diver = makeSprite(72, function(g) { armour(g,[[0,11],[-9,-8],[-3,-5],[0,-12],[3,-5],[9,-8]],C.red);g.fillStyle=C.red;g.fillRect(-2,-10,4,7);seam(g,[[0,-2],[0,7]]); });

    S.splitter = makeSprite(72, function(g) { [-1,1].forEach(function(a){g.save();g.translate(a*9,0);armour(g,[[0,-17],[8,-7],[8,11],[0,17],[-7,8],[-7,-8]],C.magenta);lens(g,'#e994e8',0,2,3);g.restore();});seam(g,[[0,-9],[0,9]]); });

    S.sniper = makeSprite(72, function(g) { armour(g,[[0,-13],[6,-5],[11,-2],[6,5],[3,5],[3,15],[-3,15],[-3,5],[-6,5],[-11,-2],[-6,-5]],C.orange);lens(g,'#fff1c0',0,-3,3);g.fillStyle=C.red;g.fillRect(-1,7,2,8); });

    S.boss = makeSprite(128,function(g){ armour(g,[[-37,-12],[-23,-32],[23,-32],[37,-12],[30,22],[0,39],[-30,22]],'#dc75c6');[-1,1].forEach(function(a){armour(g,[[a*12,-16],[a*29,-9],[a*23,18],[a*13,10]],'#8b7599');});lens(g,'#cf8dbf',0,-3,10);seam(g,[[-22,18],[0,29],[22,18]]); });

    /* ---- v1.2 新敌人精灵 ---- */
    S.weaver = makeSprite(72, function(g) { armour(g,[[-10,-7],[-3,-4],[5,-10],[10,-5],[4,0],[9,7],[2,10],[-3,3],[-10,6],[-6,-1]],C.magenta);lens(g,'#ffb0ef',0,0,2); });

    S.bomber = makeSprite(72, function(g) { armour(g,[[-20,-7],[-12,-15],[12,-15],[20,-7],[17,10],[8,18],[-8,18],[-17,10]],C.orange);[-1,1].forEach(function(a){g.fillStyle='#4c3540';g.fillRect(a*8-4,-8,8,18);g.strokeStyle=C.orange;g.strokeRect(a*8-4,-8,8,18);});lens(g,C.red,0,10,3); });

    S.mirror = makeSprite(72, function(g) { [-1,1].forEach(function(a){g.save();g.scale(a,1);armour(g,[[3,-13],[12,-6],[12,6],[3,13],[6,0]],'#b58aff');g.restore();});seam(g,[[0,-10],[0,10]]);lens(g,'#e2caff',0,0,2); });

    S.healer = makeSprite(72, function(g) { g.beginPath();g.arc(0,0,14,0,Math.PI*2);g.fillStyle='#102c25';g.fill();g.strokeStyle='#74e7a1';g.lineWidth=1.5;g.stroke();[-1,1].forEach(function(a){g.fillStyle='#40564d';g.fillRect(a<0?-16:11,-5,5,10);});g.fillStyle='#b2ffd0';g.fillRect(-3,-9,6,18);g.fillRect(-9,-3,18,6); });

    S.phantom = makeSprite(72, function(g) { armour(g,[[0,-12],[8,-3],[5,5],[1,11],[-4,5],[-8,-2]],C.red);armour(g,[[-10,-8],[-8,-2],[-10,5],[-12,1]],'#84576c');lens(g,'#ffc0ca',1,-1,2); });

    /* ---- v1.2 Boss 图鉴精灵(11 种,按配色区分 + 标志性形状) ---- */
    S['boss'] = S['boss'] || S.boss;
    S['boss-hive'] = makeSprite(128,function(g){ armour(g,hexPts(42,Math.PI/6),'#bba165');for(var i=0;i<6;i++){var a=i*Math.PI/3;g.save();g.translate(Math.cos(a)*25,Math.sin(a)*25);armour(g,hexPts(10,Math.PI/6),'#d39a48');g.fillStyle='#0b111a';g.fillRect(-4,-3,8,6);g.restore();}lens(g,'#be6e41',0,0,9); });
    S['boss-phantom'] = makeSprite(128,function(g){ armour(g,[[0,-36],[24,-17],[17,3],[30,24],[6,37],[-12,16],[-29,9],[-17,-13]],'#d1758b');armour(g,[[-29,-23],[-20,-17],[-25,-3],[-38,-8]],'#766079');armour(g,[[25,-31],[36,-13],[24,-7]],'#766079');lens(g,'#f6a3b6',2,0,7); });
    S.guardian = makeSprite(72, function(g) { [-1,1].forEach(function(a){g.save();g.scale(a,1);armour(g,[[7,-12],[14,-8],[14,5],[8,12],[9,1]],'#53cddd');g.restore();});armour(g,[[-6,-8],[6,-8],[6,3],[0,10],[-6,3]],'#87e9ef');seam(g,[[-3,-3],[0,1],[3,-3]]); });

    S.transport = makeSprite(72, function(g) { armour(g,[[-18,-6],[-12,-11],[12,-11],[18,-6],[18,7],[12,11],[-12,11],[-18,7]],'#dab55b');[-1,1].forEach(function(a){g.fillStyle='#ffe68e';g.fillRect(a<0?-19:16,-4,3,8);});g.strokeStyle='#e1c581';g.strokeRect(-9,-7,18,14);seam(g,[[-8,-6],[8,6]]); });

    S['boss-fortress'] = makeSprite(176,function(g){
      // The solid central hull fits the 44px core hit circle; side struts are dark decoration.
      g.fillStyle='#293444';g.fillRect(-58,9,116,14);
      armour(g,[[-39,-16],[-25,-34],[25,-34],[39,-16],[36,17],[23,32],[-23,32],[-36,17]],'#b8a66b');
      [-1,1].forEach(function(a){g.save();g.scale(a,1);
        armour(g,[[17,-27],[31,-17],[32,16],[20,26],[13,15],[13,-17]],'#8b927f');
        for(var y=-14;y<15;y+=7){g.fillStyle='#0b121c';g.fillRect(22,y,8,3);}g.restore();});
      armour(g,[[-13,-23],[13,-23],[17,-12],[17,16],[0,26],[-17,16],[-17,-12]],'#ddaa53');
      g.fillStyle='#080d17';g.fillRect(-10,-12,20,27);
      seam(g,[[-28,-22],[-18,-16]]);seam(g,[[28,-22],[18,-16]]);
    });
    S['fortress-turret'] = makeSprite(48,function(g){
      armour(g,[[-10,-8],[-5,-12],[6,-12],[11,-7],[10,7],[5,11],[-6,11],[-11,6]],'#c29d63');
      g.fillStyle='#3c4b5d';g.fillRect(-5,-3,10,13);g.strokeStyle='#e4b05f';g.lineWidth=1.5;g.strokeRect(-4,-2,8,14);
      g.fillStyle='#080e19';g.fillRect(-3,9,6,4);lens(g,'#ffad57',0,-6,2);
    });
    S['fortress-wreck'] = makeSprite(48,function(g){
      armour(g,[[-10,-8],[-3,-11],[0,-5],[7,-10],[10,4],[4,10],[-8,7]],'#596272');
      seam(g,[[-7,-6],[1,1],[-3,7]]);g.fillStyle='#080b11';g.fillRect(-4,-3,8,8);
    });
    S['boss-storm'] = makeSprite(128,function(g){ for(var i=0;i<3;i++){g.save();g.rotate(i*Math.PI*2/3);armour(g,[[6,-6],[32,-24],[39,-7],[23,1],[11,14]],'#719fb1');seam(g,[[15,-4],[30,-12]]);g.restore();}armour(g,hexPts(14,0),'#a5d1dc');lens(g,'#94d4df',0,0,6); });
    S['boss-nexus'] = makeSprite(128,function(g){ armour(g,hexPts(41,Math.PI/6),'#b697cc');for(var i=0;i<6;i++){g.save();g.rotate(i*Math.PI/3);armour(g,[[-8,-35],[8,-35],[6,-20],[-6,-20]],'#8e78a5');g.restore();}armour(g,hexPts(17,0),'#dac2e9');lens(g,'#b097d6',0,0,8); });
    S['boss-vortex'] = makeSprite(128,function(g){ for(var i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2);armour(g,[[8,-10],[19,-35],[33,-24],[31,-7],[20,-16],[16,3]],'#c7829e');g.restore();}g.fillStyle='#03060d';g.beginPath();g.arc(0,0,15,0,Math.PI*2);g.fill();g.strokeStyle='#d8b1c6';g.lineWidth=2;g.stroke(); });
    S['boss-juggernaut'] = makeSprite(128,function(g){ armour(g,[[-32,-21],[-16,-34],[16,-34],[32,-21],[32,16],[17,27],[-17,27],[-32,16]],'#bfa873');[-1,1].forEach(function(a){g.fillStyle='#394557';g.fillRect(a<0?-30:17,-17,13,30);});armour(g,[[-11,-18],[11,-18],[11,37],[-11,37]],'#d4a35c');g.fillStyle='#070c14';g.fillRect(-7,25,14,12);seam(g,[[-7,-9],[7,-9]]);seam(g,[[-7,4],[7,4]]); });
    S['boss-nova'] = makeSprite(128,function(g){ for(var i=0;i<8;i++){g.save();g.rotate(i*Math.PI/4);armour(g,[[-5,-19],[0,-42],[6,-26],[8,-17]],'#d3a064');g.restore();}armour(g,hexPts(19,Math.PI/6),'#d1a96c');lens(g,'#ffcd87',0,0,11); });
    S['boss-twin'] = makeSprite(128,function(g){ armour(g,[[-37,-12],[-23,-29],[-5,-16],[5,-16],[23,-29],[37,-12],[34,13],[19,28],[0,16],[-19,28],[-34,13]],'#8294c5');[-1,1].forEach(function(a){g.save();g.translate(a*18,0);armour(g,hexPts(15,Math.PI/6),a<0?'#d69bbe':'#90b5dc');lens(g,a<0?'#d69bbe':'#90b5dc',0,0,6);g.restore();}); });
    S['boss-omega'] = makeSprite(128,function(g){ armour(g,[[0,-41],[12,-25],[33,-25],[26,-5],[40,7],[20,19],[14,38],[0,29],[-14,38],[-20,19],[-40,7],[-26,-5],[-33,-25],[-12,-25]],'#d1938d');armour(g,hexPts(24,Math.PI/6),'#8c829e');armour(g,hexPts(14,0),'#e1bd9c');lens(g,'#ffd6ab',0,0,7); });

    S.pb = makeSprite(24, function (g) {
      g.shadowColor = C.cyan; g.shadowBlur = 10;
      g.fillStyle = '#bffcff';
      g.fillRect(-2, -8, 4, 16);
      g.shadowBlur = 0;
    });

    S.eb = makeSprite(24, function (g) {
      g.shadowColor = C.magenta; g.shadowBlur = 10;
      g.fillStyle = '#ffb3f5';
      g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
    });

    function puSprite(letter) {
      return makeSprite(40, function (g) {
        g.shadowColor = C.yellow; g.shadowBlur = 12;
        g.strokeStyle = C.yellow; g.lineWidth = 2;
        g.fillStyle = 'rgba(255,230,0,0.12)';
        poly(g, [[-11, -11], [11, -11], [11, 11], [-11, 11]]);
        g.stroke(); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = '#ffffff';
        g.font = 'bold 13px ui-monospace, Menlo, Consolas, monospace';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.shadowColor = C.yellow; g.shadowBlur = 6;
        g.fillText(letter, 0, 1);
        g.shadowBlur = 0;
      });
    }
    S.puW = puSprite('W');
    S.puS = puSprite('S');
    S.puH = puSprite('H');
    S.puB = puSprite('B');
    S.puF = puSprite('F');

    /* 新道具特效精灵:狂暴(B)红、冰霜(F)青 */
    S.puB = makeSprite(40, function (g) {
      g.shadowColor = C.red; g.shadowBlur = 12;
      g.strokeStyle = C.red; g.lineWidth = 2;
      g.fillStyle = 'rgba(255,51,85,0.12)';
      poly(g, [[-11, -11], [11, -11], [11, 11], [-11, 11]]);
      g.stroke(); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#ffffff';
      g.font = 'bold 13px ui-monospace, Menlo, Consolas, monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = C.red; g.shadowBlur = 6;
      g.fillText('B', 0, 1);
      g.shadowBlur = 0;
    });
    S.puF = makeSprite(40, function (g) {
      g.shadowColor = C.cyan; g.shadowBlur = 12;
      g.strokeStyle = C.cyan; g.lineWidth = 2;
      g.fillStyle = 'rgba(0,240,255,0.12)';
      poly(g, [[-11, -11], [11, -11], [11, 11], [-11, 11]]);
      g.stroke(); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#ffffff';
      g.font = 'bold 13px ui-monospace, Menlo, Consolas, monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = C.cyan; g.shadowBlur = 6;
      g.fillText('F', 0, 1);
      g.shadowBlur = 0;
    });
  };

  R.drawPlayer = function(ctx,p,time) {
    var ship=window.DFJ.Logic.shipPreset(p.ship);ctx.save();ctx.fillStyle=ship.color;ctx.globalAlpha=.55;
    var tail=7+Math.sin(time*14)*2;[-1,1].forEach(function(a){ctx.fillRect(p.x+a*6-1,p.y+9,2,tail);});ctx.restore();
    R.drawC(ctx,S['player-'+ship.id]||S.player,p.x,p.y);
  };
  R.drawPlayerShot = function(ctx,b) {
    if(b.source==='reflect'){R.drawC(ctx,S.pb,b.x,b.y);return;}
    var ship=window.DFJ.Logic.weaponPreset(b.weaponId);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vx,-b.vy));
    ctx.fillStyle=ship.color;ctx.globalAlpha=.25;ctx.fillRect(-1,0,2,8+(b.tier||1)*3);ctx.globalAlpha=1;
    if(ship.id==='heavy'){ctx.fillRect(-3,-6,6,11);ctx.fillStyle='#effaff';ctx.fillRect(-1,-5,2,8);}
    else if(ship.id==='fan'){poly(ctx,[[0,-6],[3,0],[0,4],[-3,0]]);ctx.fill();}
    else {ctx.fillRect(-2,-7,1.5,12);ctx.fillRect(1,-7,1.5,12);}
    ctx.restore();
  };

  R.drawEnemy = function(ctx,e,now) {
    ctx.save();
    var stunned=e.__stunUntil>now,charge=!!e.aimLock||(e.type==='diver'&&e.charge>0);
    if(e.type==='phantom'&&e.ghosted){
      ctx.save();ctx.globalAlpha*=.4;R.drawC(ctx,S.phantom,e.x-5,e.y-3);ctx.restore();
    }
    if(stunned)ctx.globalAlpha*=.55;
    R.drawC(ctx,S[e.type],e.x,e.y);
    if(charge&&!stunned){
      ctx.fillStyle='#ffb27f';ctx.beginPath();ctx.arc(e.x,e.y+(e.type==='bomber'?4:e.r*.6),2.5,0,Math.PI*2);ctx.fill();
      if(e.type==='bomber'){ctx.strokeStyle='#d89659';ctx.lineWidth=1;ctx.strokeRect(e.x-11,e.y-9,7,18);ctx.strokeRect(e.x+4,e.y-9,7,18);}
    }
    if(e.type==='transport'){ctx.fillStyle='#e5c36d';ctx.globalAlpha*=.65+.2*Math.sin((e.t||0)*5);ctx.fillRect(e.x-7,e.y-7,14,2);}
    ctx.restore();
  };

  // Pure presentation: driven by combat state, never modifies attack timing or geometry.
  R.drawBoss = function(ctx,b) {
    if(b.kind==='fortress'){R.drawFortress(ctx,b);return;}
    var charging=!!b.pending,open=b.recovery>0,t=b.t||0;
    var color={boss:'#e99acd',hive:'#edb55f',phantom:'#ee9aa9',storm:'#9dcedc',nexus:'#c8adeb',vortex:'#d99dbb',juggernaut:'#e8b777',nova:'#ffc789',twin:'#b0bcf2',omega:'#efb5a0'}[b.kind]||C.orange;
    ctx.save();
    if(b.kind==='phantom'&&charging){ctx.save();ctx.globalAlpha*=.18;R.drawC(ctx,S['boss-phantom'],b.x-7,b.y-4);ctx.restore();}
    ctx.translate(b.x,b.y);
    var rotating=b.kind==='storm'||b.kind==='vortex';
    if(rotating){ctx.save();ctx.rotate(t*(b.phase===2?-.35:.2));R.drawC(ctx,S['boss-'+b.kind],0,0);ctx.restore();}
    else R.drawC(ctx,S['boss-'+b.kind]||S.boss,0,0);
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.5;
    if(b.kind==='hive'){
      for(var i=0;i<6;i++){var a=i*Math.PI/3,x=Math.cos(a)*25,y=Math.sin(a)*25;
        ctx.globalAlpha=charging?(.45+.5*((i+Math.floor(t*6))%6)/5):.35;
        ctx.fillRect(x-3,y-2,6,4);if(open){ctx.strokeRect(x-5,y-5,10,10);}}
      ctx.globalAlpha=1;
    } else if(b.kind==='juggernaut'){
      var recoil=b.lastShotT==null?0:3*Math.max(0,1-(t-b.lastShotT)/.2);
      ctx.fillStyle=charging?'#ffe2b0':'#775934';ctx.fillRect(-5,23-recoil,10,7);
      if(charging)for(var j=0;j<3;j++)ctx.fillRect(-7,-12+j*11,14,2);
    } else if(b.kind==='twin'){
      var side=(b.attackIndex||0)%2?1:-1;
      ctx.globalAlpha=charging?1:.45;ctx.beginPath();ctx.arc(side*18,0,9,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    } else {
      var r=b.kind==='nova'?13:b.kind==='vortex'?16:10;
      ctx.globalAlpha=charging?.9:open?.55:.25;
      ctx.beginPath();ctx.arc(0,0,r+(open?3:0),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      if(charging&&b.kind!=='vortex')lens(ctx,color,0,0,3);
    }
    if(open&&['boss','nexus','omega'].indexOf(b.kind)>=0){
      [-1,1].forEach(function(side){ctx.fillStyle='#647386';ctx.fillRect(side*20-2,-9,4,18);});
    }
    if(b.phase===2){
      ctx.strokeStyle='#de926e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-23,-18);ctx.lineTo(-17,-6);ctx.lineTo(-25,2);ctx.moveTo(22,13);ctx.lineTo(16,22);ctx.stroke();
      if(b.kind==='omega'||b.kind==='nova'){ctx.strokeStyle=color;for(var k=0;k<4;k++){var ang=k*Math.PI/2+.4;ctx.beginPath();ctx.moveTo(Math.cos(ang)*27,Math.sin(ang)*27);ctx.lineTo(Math.cos(ang)*38,Math.sin(ang)*38);ctx.stroke();}}
    }
    ctx.restore();
  };

  R.drawSupportEffect = function(ctx,e,now) {
    if(e.type==='healer'&&e.healAt!=null){
      var age=e.t-e.healAt;if(age<0||age>.55)return;
      ctx.save();ctx.strokeStyle=C.green;ctx.globalAlpha=.4*(1-age/.55);ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(e.x,e.y,18+age*95,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    if(e.type==='guardian'&&e.__stunUntil>now){
      ctx.save();ctx.strokeStyle='#9eacbb';ctx.lineWidth=2;ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.arc(e.x,e.y,19,.2,Math.PI*.8);ctx.arc(e.x,e.y,19,Math.PI*1.2,Math.PI*1.8);ctx.stroke();ctx.restore();
    }
  };

  R.drawFortress = function(ctx,b) {
    R.drawC(ctx,S['boss-fortress'],b.x,b.y);
    ctx.save();ctx.translate(b.x,b.y);
    var charging=!!b.pending,open=b.recovery>0;
    ctx.fillStyle=charging?'#ff8b59':open?'#ffe2a0':'#715331';
    ctx.fillRect(-5,-9,10,22);
    // Retracting shutters expose the same central weak point during recovery.
    var gap=open?9:3;ctx.fillStyle='#354355';ctx.strokeStyle='#a39576';ctx.lineWidth=1;
    [-1,1].forEach(function(side){var x=side<0?-15-gap:gap;ctx.fillRect(x,-12,15,27);ctx.strokeRect(x,-12,15,27);});
    if(charging){ctx.fillStyle='#ffd6a2';ctx.fillRect(-3,-6,6,Math.max(3,18*(1-b.fireCd/b.pending.warning)));}
    if(b.phase===2){ctx.strokeStyle='#ff8c59';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-28,-19);ctx.lineTo(-20,-6);ctx.lineTo(-28,5);ctx.moveTo(24,3);ctx.lineTo(18,13);ctx.lineTo(25,21);ctx.stroke();}
    ctx.restore();
    (b.turrets||[]).forEach(function(t){
      var pos=window.DFJ.Logic.turretPosition(b,t),alive=t.hp>0;
      // Recoil is bounded to 2px and never changes the actual collision position.
      var recoil=alive&&b.lastShotT!=null?2*Math.max(0,1-((b.t||0)-b.lastShotT)/.18):0;
      R.drawC(ctx,S[alive?'fortress-turret':'fortress-wreck'],pos.x,pos.y-recoil);
      ctx.save();ctx.fillStyle='#080d17';ctx.fillRect(pos.x-14,pos.y-22,28,3);
      ctx.fillStyle=alive?'#e6b971':'#505969';ctx.fillRect(pos.x-14,pos.y-22,28*Math.max(0,t.hp/t.maxHp),3);
      if(alive&&charging){ctx.fillStyle='#ffb36e';ctx.fillRect(pos.x-2,pos.y+9,4,3);}
      if(!alive){ctx.fillStyle='#d88848';ctx.globalAlpha=.45+.25*Math.sin((b.t||0)*7+t.side);ctx.fillRect(pos.x+3,pos.y-2,2,2);}
      ctx.restore();
    });
  };

  R.sprite = function (name) { return S[name]; };

  R.drawC = function (ctx, img, x, y) {
    ctx.drawImage(img, x - img.width / 2, y - img.height / 2);
  };

  /* ---- 星空(三层视差) ---- */
  R.makeStars = function (w, h) {
    var stars = [];
    var layers = [
      { n: Math.max(14, Math.round(w * h / 9000)),  sp: 22,  s: 1,   c: 'rgba(138,138,160,0.55)' },
      { n: Math.max(10, Math.round(w * h / 16000)), sp: 55,  s: 1.6, c: 'rgba(0,240,255,0.40)' },
      { n: Math.max(6,  Math.round(w * h / 30000)), sp: 110, s: 2.2, c: 'rgba(232,232,240,0.80)' }
    ];
    for (var li = 0; li < layers.length; li++) {
      var L = layers[li];
      for (var i = 0; i < L.n; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          sp: L.sp * (0.8 + Math.random() * 0.4),
          s: L.s, c: L.c
        });
      }
    }
    return stars;
  };

  R.updateStars = function (stars, dt, h) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y += s.sp * dt;
      if (s.y > h + 2) s.y = -2;
    }
  };

  /* ---- 背景:渐变底 + 滚动网格 + 星空 ---- */
  R.drawBackground = function (ctx, w, h, stars, gridOff) {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0a12');
    grad.addColorStop(1, '#10101e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0,240,255,0.05)';
    ctx.lineWidth = 1;
    var step = 44, off = gridOff % step;
    ctx.beginPath();
    var x;
    for (x = 0.5; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (x = off - step; x < h; x += step) { ctx.moveTo(0, x + 0.5); ctx.lineTo(w, x + 0.5); }
    ctx.stroke();

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.fillStyle = s.c;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
  };

  /* ---- Boss 血条 ---- */
  /* ---- EMP 冲击波环(由 game 层在触发时绘制一次) ---- */
  R.drawEmpWave = function (ctx, x, y, radius, progress) {
    if (progress >= 1) return;
    var r = radius * progress;
    var alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 4 - progress * 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
})();
