const { chromium } = require('playwright');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 768, height: 1024 }, userAgent: UA, isMobile: true, hasTouch: true, locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const p = await ctx.newPage();
  await p.goto('https://luxestyle.ch/?view=lxstory', { waitUntil: 'load', timeout: 90000 });
  const r = await p.evaluate(() => {
    const out = [];
    for (const s of document.styleSheets) { let rules; try { rules = s.cssRules; } catch (e) { continue; }
      const walk = (rs, cond) => { for (const x of rs) { if (x.media || x.conditionText) { walk(x.cssRules, (x.conditionText || x.media.mediaText)); } else if (cond && /hover|pointer/.test(cond) && /header/i.test(x.selectorText || '')) out.push(cond + ' :: ' + (x.cssText || '').slice(0, 220) + ' @ ' + (s.href || 'inline').slice(-50)); } };
      walk(rules, ''); }
    return out.slice(0, 30);
  });
  console.log(r.join('\n'));
  await b.close();
})();
