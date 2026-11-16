const { chromium } = require('playwright');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const F = { touchDeskUA: { userAgent: UA, isMobile: true, hasTouch: true }, mobUAnoTouch: { userAgent: UAM } };
(async () => {
  const b = await chromium.launch();
  for (const [n, f] of Object.entries(F)) {
    const ctx = await b.newContext({ viewport: { width: 768, height: 1024 }, ...f, locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
    const p = await ctx.newPage();
    await p.goto('https://luxestyle.ch/?view=lxstory', { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { let e = document.getElementById('header-component'), b = -1; while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.position === 'sticky' || cs.position === 'fixed') { b = e.getBoundingClientRect().height + (parseFloat(cs.top) || 0); break; } e = e.parentElement; } return { b, iw: innerWidth, hov: matchMedia('(hover:none)').matches, coarse: matchMedia('(pointer:coarse)').matches, htmlcls: document.documentElement.className.slice(0, 200), bodycls: document.body.className.slice(0, 200) }; });
    console.log(n, JSON.stringify(r));
    await ctx.close(); await new Promise((s) => setTimeout(s, 3000));
  }
  await b.close();
})();
