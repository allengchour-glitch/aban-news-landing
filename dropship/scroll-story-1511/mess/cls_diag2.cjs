const { chromium } = require('playwright'); const fs = require('fs');
const { einrichten, kontext, START } = require('../harness/nachbau.cjs');
(async () => {
  const b = await chromium.launch(); const ctx = await kontext(b, 'desktop'); const page = await ctx.newPage();
  await page.addInitScript(() => { window.__log = []; const t0 = performance.now(); const f = () => { const v = document.querySelector('.lx-story__video'); const s = document.querySelector('[data-lx-story]'); if (v) { const r = v.getBoundingClientRect(); window.__log.push([Math.round(performance.now() - t0), Math.round(r.y), Math.round(r.height), Math.round(s.getBoundingClientRect().y), getComputedStyle(v).position, getComputedStyle(s.querySelector('.lx-story__medien')).top]); } if (performance.now() - t0 < 2500) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await einrichten(page, fs.readFileSync(process.argv[2], 'utf8'));
  await page.goto(START, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3000);
  const l = await page.evaluate(() => window.__log); let last = '';
  for (const e of l) { const k = JSON.stringify(e.slice(1)); if (k !== last) { console.log(JSON.stringify(e)); last = k; } }
  await b.close();
})();
