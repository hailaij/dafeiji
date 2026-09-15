/* NEON STRIKE - render.js : canvas 渲染
 * 精灵预烘焙到离屏 canvas(发光已烤入),逐帧只 drawImage,避免 shadowBlur 卡顿。
 */
(function () {
  'use strict';
  var DFJ = (window.DFJ = window.DFJ || {});
  var R = (DFJ.Render = {});
  var C = { cyan: '#00f0ff', magenta: '#ff00e5', yellow: '#ffe600', orange: '#ff8c00', red: '#ff3355' };
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

    S.grunt = makeSprite(48, function (g) {
      poly(g, [[0, 13], [-11, -9], [0, -4], [11, -9]]);
      neon(g, C.magenta, 'rgba(255,0,229,0.14)', 2.5);
    });

    S.sine = makeSprite(48, function (g) {
      poly(g, [[0, -14], [11, 0], [0, 14], [-11, 0]]);
      neon(g, C.magenta, 'rgba(255,0,229,0.12)', 2.5);
      g.shadowColor = C.magenta; g.shadowBlur = 6;
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1;
      poly(g, [[0, -6], [5, 0], [0, 6], [-5, 0]]);
      g.stroke();
      g.shadowBlur = 0;
    });

    S.gunner = makeSprite(64, function (g) {
      poly(g, hexPts(16, Math.PI / 6));
      neon(g, C.magenta, 'rgba(255,0,229,0.12)', 3);
      g.shadowColor = C.yellow; g.shadowBlur = 8;
      g.strokeStyle = 'rgba(255,230,0,0.8)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.stroke();
      g.shadowBlur = 0;
    });

    S.tank = makeSprite(72, function (g) {
      poly(g, [[-20, 20], [-22, -12], [-12, -20], [12, -20], [22, -12], [20, 20]]);
      neon(g, C.yellow, 'rgba(255,230,0,0.12)', 3);
      g.shadowColor = C.yellow; g.shadowBlur = 8;
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.5;
      g.strokeRect(-14, -6, 28, 10);
      g.shadowBlur = 0;
    });

    S.diver = makeSprite(48, function (g) {
      poly(g, [[0, -16], [7, 4], [16, 16], [0, 10], [-16, 16], [-7, 4]]);
      neon(g, C.red, 'rgba(255,51,85,0.14)', 2.5);
    });

    S.splitter = makeSprite(64, function (g) {
      poly(g, [[0, -18], [18, 0], [10, 18], [-10, 18], [-18, 0]]);
      neon(g, C.magenta, 'rgba(255,0,229,0.14)', 3);
      g.shadowColor = C.magenta; g.shadowBlur = 8;
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 10); g.stroke();
      g.shadowBlur = 0;
    });

    S.sniper = makeSprite(56, function (g) {
      poly(g, [[0, -14], [13, 0], [0, 14], [-13, 0]]);
      neon(g, C.orange, 'rgba(255,140,0,0.14)', 2.5);
      g.shadowColor = C.orange; g.shadowBlur = 8;
      g.strokeStyle = 'rgba(255,140,0,0.9)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.stroke();
      g.shadowBlur = 0;
    });

    S.boss = makeSprite(128, function (g) {
      poly(g, hexPts(44, 0));
      neon(g, C.magenta, 'rgba(255,0,229,0.10)', 4);
      g.shadowColor = C.magenta; g.shadowBlur = 10;
      g.strokeStyle = 'rgba(255,0,229,0.6)'; g.lineWidth = 2;
      poly(g, hexPts(28, Math.PI / 6));
      g.stroke();
      g.shadowColor = C.cyan; g.shadowBlur = 12;
      g.strokeStyle = C.cyan; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.stroke();
      g.shadowBlur = 0;
    });

    /* ---- v1.2 新敌人精灵 ---- */
    S.weaver = makeSprite(48, function (g) {
      poly(g, [[0, -14], [8, 0], [14, 12], [0, 6], [-14, 12], [-8, 0]]);
      neon(g, C.magenta, 'rgba(255,0,229,0.14)', 2);
      g.shadowColor = C.magenta; g.shadowBlur = 6;
      g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-10, 2); g.lineTo(10, 2); g.stroke();
      g.shadowBlur = 0;
    });

    S.bomber = makeSprite(72, function (g) {
      poly(g, [[-22, 16], [-16, -14], [0, -20], [16, -14], [22, 16], [10, 20], [-10, 20]]);
      neon(g, C.yellow, 'rgba(255,230,0,0.10)', 3);
      g.shadowColor = C.yellow; g.shadowBlur = 8;
      g.fillStyle = 'rgba(255,230,0,0.85)';
      g.beginPath(); g.arc(0, 4, 5, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
    });

    S.mirror = makeSprite(56, function (g) {
      poly(g, [[0, -16], [10, -6], [10, 8], [0, 16], [-10, 8], [-10, -6]]);
      neon(g, C.cyan, 'rgba(0,240,255,0.12)', 2.5);
      g.shadowColor = C.cyan; g.shadowBlur = 8;
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, -8); g.lineTo(0, 8); g.stroke();
      g.shadowBlur = 0;
    });

    S.healer = makeSprite(56, function (g) {
      poly(g, hexPts(16, Math.PI / 6));
      neon(g, C.cyan, 'rgba(0,240,255,0.10)', 2.5);
      g.shadowColor = C.cyan; g.shadowBlur = 8;
      g.strokeStyle = C.cyan; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.moveTo(0, -6); g.lineTo(0, 6); g.stroke();
      g.shadowBlur = 0;
    });

    S.phantom = makeSprite(48, function (g) {
      poly(g, [[0, -14], [9, 2], [4, 14], [-4, 14], [-9, 2]]);
      neon(g, C.red, 'rgba(255,51,85,0.10)', 2);
      g.shadowColor = C.red; g.shadowBlur = 10;
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1;
      poly(g, [[0, -7], [5, 2], [0, 8], [-5, 2]]);
      g.stroke();
      g.shadowBlur = 0;
    });

    /* ---- v1.2 Boss 图鉴精灵(11 种,按配色区分 + 标志性形状) ---- */
    S['boss'] = S['boss'] || S.boss;
    S['boss-hive'] = makeSprite(128, function (g) {
      poly(g, hexPts(44, 0));
      neon(g, C.magenta, 'rgba(255,0,229,0.10)', 4);
      var k;
      for (k = 0; k < 6; k++) {
        var a = Math.PI / 6 + k * Math.PI / 3;
        g.beginPath();
        g.arc(Math.cos(a) * 30, Math.sin(a) * 30, 9, 0, Math.PI * 2);
        g.stroke();
      }
    });
    S['boss-phantom'] = makeSprite(128, function (g) {
      poly(g, [[0, -44], [30, -10], [18, 40], [-18, 40], [-30, -10]]);
      neon(g, C.red, 'rgba(255,51,85,0.08)', 3);
      g.shadowColor = C.red; g.shadowBlur = 14;
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
      poly(g, [[0, -24], [14, 0], [0, 22], [-14, 0]]);
      g.stroke();
      g.shadowBlur = 0;
    });
    S['boss-fortress'] = makeSprite(136, function (g) {
      poly(g, [[-44, 34], [-44, -24], [-22, -40], [22, -40], [44, -24], [44, 34]]);
      neon(g, C.yellow, 'rgba(255,230,0,0.10)', 4);
      g.shadowColor = C.yellow; g.shadowBlur = 8;
      g.strokeRect(-28, -10, 56, 20);
      g.strokeRect(-12, -30, 24, 14);
      g.shadowBlur = 0;
    });
    S['boss-storm'] = makeSprite(128, function (g) {
      var i;
      for (i = 0; i < 3; i++) {
        g.shadowColor = C.cyan; g.shadowBlur = 10;
        g.strokeStyle = C.cyan; g.lineWidth = 2.5;
        g.beginPath();
        g.arc(0, 0, 44 - i * 14, i * 1.1, i * 1.1 + Math.PI * 1.4);
        g.stroke();
      }
      g.shadowBlur = 0;
    });
    S['boss-nexus'] = makeSprite(128, function (g) {
      poly(g, hexPts(44, 0));
      neon(g, C.magenta, 'rgba(255,0,229,0.10)', 3);
      g.shadowColor = C.magenta; g.shadowBlur = 10;
      g.strokeStyle = C.magenta; g.lineWidth = 2;
      var k;
      for (k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(Math.cos(k * Math.PI / 3) * 44, Math.sin(k * Math.PI / 3) * 44);
        g.lineTo(Math.cos(k * Math.PI / 3 + Math.PI) * 44, Math.sin(k * Math.PI / 3 + Math.PI) * 44);
        g.stroke();
      }
      g.shadowColor = C.cyan; g.shadowBlur = 12;
      g.strokeStyle = C.cyan;
      g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.stroke();
      g.shadowBlur = 0;
    });
    S['boss-vortex'] = makeSprite(128, function (g) {
      var i;
      g.shadowColor = C.red; g.shadowBlur = 12;
      g.strokeStyle = C.red; g.lineWidth = 3;
      for (i = 0; i < 4; i++) {
        g.beginPath();
        var a0 = i * Math.PI / 2;
        var r;
        for (r = 6; r < 44; r += 4) {
          var a = a0 + r * 0.11;
          if (r === 6) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.stroke();
      }
      g.shadowBlur = 0;
    });
    S['boss-juggernaut'] = makeSprite(140, function (g) {
      poly(g, [[-46, 20], [-34, -36], [0, -46], [34, -36], [46, 20], [30, 40], [-30, 40]]);
      neon(g, C.yellow, 'rgba(255,230,0,0.10)', 5);
      g.shadowColor = C.yellow; g.shadowBlur = 10;
      g.strokeRect(-30, -6, 60, 18);
      g.strokeRect(-8, -30, 16, 16);
      g.shadowBlur = 0;
    });
    S['boss-nova'] = makeSprite(128, function (g) {
      var i;
      g.shadowColor = C.orange; g.shadowBlur = 14;
      g.strokeStyle = C.orange; g.lineWidth = 2.5;
      for (i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        g.beginPath();
        g.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
        g.lineTo(Math.cos(a) * 42, Math.sin(a) * 42);
        g.stroke();
      }
      g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2);
      g.stroke();
      g.shadowBlur = 0;
    });
    S['boss-twin'] = makeSprite(128, function (g) {
      g.shadowColor = C.cyan; g.shadowBlur = 12;
      g.strokeStyle = C.cyan; g.lineWidth = 3;
      g.beginPath(); g.arc(-20, 0, 20, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(20, 0, 20, 0, Math.PI * 2); g.stroke();
      g.shadowColor = C.magenta; g.shadowBlur = 10;
      g.strokeStyle = C.magenta; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 38, 0, Math.PI * 2); g.stroke();
      g.shadowBlur = 0;
    });
    S['boss-omega'] = makeSprite(144, function (g) {
      poly(g, hexPts(48, 0));
      neon(g, C.red, 'rgba(255,51,85,0.12)', 5);
      g.shadowColor = C.red; g.shadowBlur = 14;
      g.strokeStyle = C.red; g.lineWidth = 2.5;
      poly(g, hexPts(30, Math.PI / 6));
      g.stroke();
      g.shadowColor = C.cyan; g.shadowBlur = 14;
      g.strokeStyle = C.cyan;
      poly(g, hexPts(16, 0));
      g.stroke();
      g.shadowBlur = 0;
    });

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
  R.drawBossBar = function (ctx, w, boss) {
    if (!boss || boss.dead || boss.y < boss.targetY - 2) return;
    var bw = Math.min(w - 90, 300), bh = 10;
    var bx = (w - bw) / 2, by = 56;
    var ratio = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.strokeStyle = 'rgba(255,0,229,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 2.5, by - 2.5, bw + 5, bh + 5);
    ctx.shadowColor = C.magenta;
    ctx.shadowBlur = 8;
    ctx.fillStyle = ratio > 0.5 ? C.magenta : C.yellow;
    ctx.fillRect(bx, by, bw * ratio, bh);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(232,232,240,0.85)';
    ctx.font = 'bold 10px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WARNING / ' + (boss.name || 'BOSS'), w / 2, by - 8);
  };

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
