const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const w of process.argv.slice(2).map(Number)) {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
    const p = await ctx.newPage();
    await p.goto('https://luxestyle.ch/?view=lxstory', { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { let e = document.getElementById('header-component'), b = -1; while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.position === 'sticky' || cs.position === 'fixed') { b = e.getBoundingClientRect().height + (parseFloat(cs.top) || 0); break; } e = e.parentElement; } const h = document.getElementById('header-component'); return { b, hc: h && h.getBoundingClientRect().height, cls: h && h.className.slice(0, 120), kopf: getComputedStyle(document.querySelector('.lx-story')).getPropertyValue('--lx-story-kopf') }; });
    console.log(w, JSON.stringify(r));
    await ctx.close(); await new Promise((s) => setTimeout(s, 3000));
  }
  await b.close();
})();
