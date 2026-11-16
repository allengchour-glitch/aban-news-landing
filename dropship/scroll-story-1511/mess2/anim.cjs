const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const p = await ctx.newPage();
  await p.goto('https://luxestyle.ch/?view=lxstory', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (const t of [1500, 4000, 8000]) {
    await p.waitForTimeout(t === 1500 ? 1500 : t - 1500);
    const r = await p.evaluate(() => document.getAnimations().map((a) => { const e = a.effect && a.effect.target; return (a.animationName || a.transitionProperty || a.constructor.name) + ' @ ' + (e ? e.tagName + '.' + String(e.className).slice(0, 40) + ' kinder=' + e.querySelectorAll('*').length : '?') + ' ' + a.playState + (a.effect && a.effect.getComputedTiming ? ' iter=' + a.effect.getComputedTiming().iterations : ''); }));
    console.log(t, JSON.stringify(r.slice(0, 15)), 'gesamt', r.length);
  }
  await b.close();
})();
