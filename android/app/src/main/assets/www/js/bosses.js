/* Deterministic boss scores: prepare -> telegraph -> fire -> recovery. */
(function () {
  'use strict';
  var L = window.DFJ.Logic;
  var data = [
    ['交叉火网', '指挥齐射', 112, 45, [0,7,3,7,0,10,7,3], 'square'],
    ['蜂群夹击', '蜂巢协议', 132, 48, [0,3,7,12,7,3,10,7], 'triangle'],
    ['相位猎杀', '失真幽影', 96, 49, [0,1,7,0,12,7,1,10], 'sine'],
    ['装甲闸门', '钢铁行军', 88, 38, [0,0,7,0,3,0,10,7], 'square'],
    ['逆转风暴', '电离层', 150, 50, [0,7,12,10,7,3,5,10], 'sawtooth'],
    ['六角重构', '重生矩阵', 108, 48, [0,4,7,11,12,7,4,2], 'triangle'],
    ['偏心涡流', '事件视界', 126, 43, [0,1,5,6,12,6,5,1], 'sawtooth'],
    ['坐标轰击', '攻城脉冲', 78, 36, [0,0,1,0,7,6,3,1], 'square'],
    ['恒星脉冲', '临界燃烧', 140, 53, [0,7,12,14,12,10,7,3], 'triangle'],
    ['双核交替', '镜像轨道', 120, 46, [0,7,2,9,3,10,2,7], 'sine'],
    ['终局审判', '最后指令', 156, 40, [0,1,7,6,12,10,7,1], 'sawtooth']
  ];
  L.BOSS_ROSTER.forEach(function (b, i) {
    b.skill = data[i][0];
    b.music = { title: data[i][1], bpm: data[i][2], root: data[i][3], motif: data[i][4], voice: data[i][5] };
  });
  L.bossProfile = function (kind) {
    return L.BOSS_ROSTER.filter(function (b) { return b.id === kind; })[0] || L.BOSS_ROSTER[0];
  };
  L.bossDamageScale = function (b) {
    if (b.kind === 'fortress') return b.recovery > 0 ? 1.5 : 0.6;
    if (b.kind === 'nexus' && b.recovery > 0) return 1.35;
    return 1;
  };
  L.turretPosition = function(b,t) {return {x:b.x+t.side*58,y:b.y+18};};
  L.damageTurret = function(b,t,amount) {
    var actual=Math.max(0,Math.min(t.hp,amount));t.hp=Math.max(0,t.hp-amount);
    if(t.hp===0 && b.pending)b.pending.shots=b.pending.shots.filter(function(s){return s.turret!==b.turrets.indexOf(t);});
    return actual;
  };
  L.bossAttack = function (b, width, px, py) {
    var shots = [], turn = b.attackIndex || 0, p2 = b.phase === 2;
    var x = b.x, y = b.y + 26, aim = Math.atan2(py - y, px - x);
    function shot(sx, sy, a, speed, r) {
      shots.push({ x: sx, y: sy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: r || 4 });
    }
    function fan(sx, sy, a, n, spread, speed) {
      for (var i = 0; i < n; i++) shot(sx, sy, a + (i / Math.max(1, n - 1) - 0.5) * spread, speed);
    }
    function ring(sx, sy, n, offset, speed) {
      for (var i = 0; i < n; i++) shot(sx, sy, i * Math.PI * 2 / n + offset, speed);
    }
    function gate(gap, speed) {
      var spacing = Math.max(28, width / 16), safe = Math.max(40, width * 0.095);
      for (var sx = 18; sx < width - 12; sx += spacing) {
        if (Math.abs(sx - gap) > safe) shot(sx, y, Math.PI / 2, speed);
      }
    }
    switch (b.kind) {
      case 'boss':
        fan(x, y, turn % 2 ? aim : Math.PI / 2, p2 ? 7 : 5, turn % 2 ? 0.7 : 1.6, 190);
        break;
      case 'hive':
        fan(Math.max(24, x - 65), y, 1.1, p2 ? 5 : 3, 0.65, 145);
        fan(Math.min(width - 24, x + 65), y, 2.04, p2 ? 5 : 3, 0.65, 145);
        break;
      case 'phantom': fan(x, y, aim, p2 ? 5 : 3, 0.42, 260); break;
      case 'fortress':
        gate(width * (turn % 2 ? 0.7 : 0.3), p2 ? 160 : 130);
        shots.forEach(function(s){s.turret=s.x<width/2?0:1;});
        if(b.turrets){
          shots=shots.filter(function(s){return b.turrets[s.turret].hp>0;});
          if(!b.turrets.some(function(t){return t.hp>0;}))shot(x,y,Math.PI/2,130);
        }
        break;
      case 'storm':
        for (var a = 0; a < 3; a++) fan(x, y, turn * (p2 ? -0.45 : 0.45) + a * Math.PI * 2 / 3, 3, 0.3, 175);
        break;
      case 'nexus':
        ring(x, y, 6, turn * Math.PI / 6, 145);
        if (p2) ring(x, y, 6, turn * Math.PI / 6 + Math.PI / 6, 205);
        break;
      case 'vortex':
        ring(width * (turn % 2 ? 0.7 : 0.3), y, p2 ? 12 : 8, turn * 0.35, 165);
        break;
      case 'juggernaut':
        for (var j = -1; j <= 1; j++) shot(Math.max(16, Math.min(width - 16, px + j * 48)), y, Math.PI / 2, p2 ? 255 : 210, 7);
        break;
      case 'nova':
        ring(x, y, p2 ? 18 : 12, turn * 0.23, turn % 2 ? 230 : 120);
        break;
      case 'twin':
        var sx = Math.max(24, Math.min(width - 24, x + (turn % 2 ? 60 : -60)));
        fan(sx, y, Math.atan2(py - y, px - sx), 3, 0.36, 230);
        if (p2) fan(width - sx, y, Math.PI / 2, 3, 0.7, 155);
        break;
      case 'omega':
        if (turn % 3 === 0) gate(width * (turn % 2 ? 0.7 : 0.3), 155);
        else if (turn % 3 === 1) ring(x, y, p2 ? 16 : 10, turn * 0.2, 165);
        else fan(x, y, aim, p2 ? 7 : 5, 0.9, 235);
        break;
    }
    var balance = L.balancePreset(b.difficulty);
    return { shots: shots, warning: balance.bossWarning * ( b.kind === 'juggernaut' ? 1.15 : 0.75),
      rest: balance.bossRest * (b.kind === 'storm' ? 0.45 : b.kind === 'juggernaut' ? 1.9 : 1.1) * (p2 ? 0.8 : 1),
      summon: b.kind === 'hive' && turn % (p2 ? 2 : 3) === 0 ? 'weaver' :
        b.kind === 'boss' && p2 && turn % 3 === 0 ? 'grunt' : null };
  };
})();
