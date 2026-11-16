const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const p = await ctx.newPage();
  await p.goto('https://luxestyle.ch/?view=lxstory', { waitUntil: 'load', timeout: 90000 });
  for (const w of [1440, 1200, 1024, 1000, 990, 989, 900, 844, 768, 750, 749, 390]) {
    await p.setViewportSize({ width: w, height: w < 750 ? 844 : 900 });
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => { let e = document.getElementById('header-component'), b = -1, pos = ''; while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.position === 'sticky' || cs.position === 'fixed') { b = e.getBoundingClientRect().height + (parseFloat(cs.top) || 0); pos = e.tagName + '.' + e.className.slice(0, 40); break; } e = e.parentElement; } return { b, pos }; });
    console.log(w, JSON.stringify(r));
  }
  await b.close();
})();
