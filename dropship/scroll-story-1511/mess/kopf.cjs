const { chromium } = require('playwright'); const fs = require('fs');
const { einrichten, kontext, START } = require('../harness/nachbau.cjs');
(async () => {
  const b = await chromium.launch();
  for (const form of ['desktop', 'handy']) {
    const ctx = await kontext(b, form); const page = await ctx.newPage();
    await einrichten(page, fs.readFileSync(process.argv[2], 'utf8'));
    await page.goto(START, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
    await page.evaluate(() => scrollTo(0, 2500)); await page.waitForTimeout(800);
    const r = await page.evaluate(() => { const h = document.getElementById('header-component'); const kette = []; let e = h; while (e && e !== document.body) { const cs = getComputedStyle(e); kette.push(e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 50) + ' pos=' + cs.position + ' top=' + cs.top + ' h=' + Math.round(e.getBoundingClientRect().height) + ' y=' + Math.round(e.getBoundingClientRect().top)); e = e.parentElement; } return kette; });
    console.log(form); r.forEach((x) => console.log('  ', x));
    await ctx.close();
  }
  await b.close();
})();
