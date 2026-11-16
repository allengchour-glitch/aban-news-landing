// CLS-Quellen im Nachbau: mit und ohne Geschichte, ohne Scrollen und nach Scrollen.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const { einrichten, kontext, START } = require('../harness/nachbau.cjs');
(async () => {
  const [storyDatei, form] = process.argv.slice(2);
  const b = await chromium.launch();
  for (const ohne of [true, false]) {
    const ctx = await kontext(b, form); const page = await ctx.newPage();
    await page.addInitScript(() => { window.__ls = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ls.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), inp: e.hadRecentInput, src: (e.sources || []).map((s) => (s.node && s.node.nodeType === 1 ? s.node.tagName + '.' + String(s.node.className).slice(0, 40) : String(s.node && s.node.nodeName)) + ' ' + JSON.stringify(s.previousRect && [Math.round(s.previousRect.y), Math.round(s.currentRect.y)])) }); }).observe({ type: 'layout-shift', buffered: true }); });
    await einrichten(page, fs.readFileSync(storyDatei, 'utf8'), { ohneStory: ohne });
    await page.goto(START, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3500);
    const vor = await page.evaluate(() => window.__ls.slice());
    for (let y = 0; y < 9000; y += 300) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(50); }
    await page.waitForTimeout(1000);
    const nach = await page.evaluate(() => window.__ls.slice());
    const sum = (a) => a.filter((e) => !e.inp).reduce((s, e) => s + e.v, 0).toFixed(4);
    console.log(ohne ? 'OHNE Geschichte' : 'MIT Geschichte', 'vor Scroll', sum(vor), 'gesamt', sum(nach));
    for (const e of nach) console.log('  ', JSON.stringify(e));
    await ctx.close();
  }
  await b.close();
})();
