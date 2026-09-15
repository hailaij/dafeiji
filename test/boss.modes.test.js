'use strict';
/* 三模式 boss 波回归验证(基于 __DFJ_PROBE 内部状态):
 * 流程:无敌+秒伤扫屏清怪 → 到 boss 波后关秒伤、压 boss 血线到二阶段 → 等召唤杂兵在场(复现原 bug 条件) → 开秒伤击杀
 * 断言:boss 死亡后推进下一波/下一关,boss 不复活,无运行时错误
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const gameUrl = 'file:///D:/ai/biancheng/worksplace/dafeiji/index.html';
  const probe = () => page.evaluate(() => window.__DFJ_PROBE.state());
  const god = on => page.evaluate(on => window.__DFJ_PROBE.godmode(on), on);
  const shot = on => page.evaluate(on => window.__DFJ_PROBE.oneshot(on), on);

  /* 三角波扫屏:匀速往返覆盖全屏宽度 */
  function sweepX(t) {
    const period = 4.5, half = period / 2;
    const ph = (t % period) / half;            /* 0..2 */
    return ph < 1 ? 60 + ph * 780 : 840 - (ph - 1) * 780;
  }

  async function testMode(modeData, label, isBossWave, isAdvanced) {
    errors.length = 0;
    await page.goto(gameUrl);
    await page.waitForTimeout(500);
    await page.click('.mode-btn[data-mode="' + modeData + '"]');
    await page.waitForTimeout(250);
    await god(true); await shot(true);        /* 无敌+秒伤清小怪 */

    /* 阶段1:推进到 boss 波 */
    let t = 0, guard = 0, reached = false, bossS = null;
    while (guard++ < 4000) {
      t += 0.04;
      const s = await probe();
      if (s.STATE === 'upgrade') { await page.click('.perk-card'); await page.waitForTimeout(200); continue; }
      if (isBossWave(s)) {
        /* 等 boss 登场 */
        let g2 = 0;
        while (g2++ < 300) {
          const s2 = await probe();
          if (s2.boss) { bossS = s2.boss; break; }
          await page.mouse.move(sweepX(t += 0.04), 660);
          await page.waitForTimeout(40);
        }
        if (bossS) reached = true;
        break;
      }
      await page.mouse.move(sweepX(t), 660);
      await page.waitForTimeout(40);
    }
    if (!reached) { console.log('=== ' + label + ' ===\nFAIL: 未能到达 boss 波/BOSS 未登场'); return { pass: false }; }
    console.log('=== ' + label + ' ===');
    console.log('boss 登场: maxHp=' + bossS.maxHp + ' | ' + (await probe()).hudWave);

    /* 阶段2:压血线至二阶段(普通伤害,跟踪 boss),然后停手等召唤杂兵 */
    await shot(false);
    let minionsAtKill = [], killed = false, phase2Seen = false;
    guard = 0;
    while (guard++ < 2000) {
      const s = await probe();
      if (!s.boss) { killed = true; break; }                 /* 意外击杀 */
      const ratio = s.boss.hp / s.boss.maxHp;
      if (s.boss.phase === 2) phase2Seen = true;
      if (phase2Seen && s.enemies.length > 0 && !s.boss.dead) {
        /* 召唤杂兵(或残余杂兵)在场 → 复现原 bug 条件,秒杀 */
        minionsAtKill = s.enemies.map(e => e.type);
        await shot(true);
        let g3 = 0;
        while (g3++ < 300) {
          const s3 = await probe();
          if (!s3.boss) { killed = true; break; }
          await page.mouse.move(Math.max(40, Math.min(860, s3.boss.x)), 660);
          await page.waitForTimeout(40);
        }
        await shot(false);
        break;
      }
      if (phase2Seen && !s.boss.dead) {
        /* 二阶段但还没杂兵:玩家让开 boss 线,等召唤 */
        await page.mouse.move(60, 660);
      } else {
        /* 一阶段:跟踪 boss 输出压血线 */
        await page.mouse.move(Math.max(40, Math.min(860, s.boss.x)), 660);
      }
      await page.waitForTimeout(40);
    }
    const afterKill = await probe();

    /* 阶段3:断言推进 + boss 不复活 */
    let advanced = false, respawned = false;
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(50);
      const s = await probe();
      if (s.boss) { respawned = true; break; }
      if (s.STATE === 'upgrade') { await page.click('.perk-card'); await page.waitForTimeout(300); continue; }
      if (isAdvanced(s)) { advanced = true; break; }
    }
    console.log('二阶段出现: ' + phase2Seen + ' | 击杀时杂兵在场: ' + (minionsAtKill.length > 0) + (minionsAtKill.length ? ' (' + minionsAtKill.join(',') + ')' : ''));
    console.log('boss 死亡: ' + killed + ' | 推进: ' + advanced + ' | boss 复活: ' + respawned);
    console.log('击杀后瞬间: ' + JSON.stringify({ wave: afterKill.wave, level: afterKill.level, levelWave: afterKill.levelWave, bossKilled: afterKill.bossKilled, enemies: afterKill.enemies.length }));
    console.log('最终 HUD: ' + (await probe()).hudWave + ' | 运行时错误: ' + (errors.length ? JSON.stringify(errors) : '无'));
    const pass = killed && advanced && !respawned && errors.length === 0;
    console.log(pass ? '>>> PASS' : '>>> FAIL');
    return { pass: pass };
  }

  const results = [];
  results.push(await testMode('endless', '无限模式(第5波 boss)', s => s.wave >= 5, s => s.wave >= 6));
  results.push(await testMode('campaign', '闯关模式(第1关第4波 boss)', s => s.level === 1 && s.levelWave >= 4, s => s.level >= 2));
  results.push(await testMode('roguelike', '肉鸽模式(第5波 boss)', s => s.wave >= 5, s => s.wave >= 6));

  await browser.close();
  console.log('=== 总结 ===');
  const names = ['无限', '闯关', '肉鸽'];
  let allPass = true;
  results.forEach((r, i) => { console.log(names[i] + ': ' + (r.pass ? 'PASS' : 'FAIL')); if (!r.pass) allPass = false; });
  console.log(allPass ? 'ALL PASS' : 'SOME FAIL');
  process.exit(allPass ? 0 : 1);
})().catch(e => { console.error('TEST ERROR:', e); process.exit(2); });
