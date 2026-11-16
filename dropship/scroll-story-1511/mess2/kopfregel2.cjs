const { chromium } = require('playwright');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 768, height: 1024 }, userAgent: UA, isMobile: true, hasTouch: true, locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const p = await ctx.newPage();
  await p.goto('https://luxestyle.ch/?view=lxstory', { waitUntil: 'load', timeout: 90000 });
  const r = await p.evaluate(() => {
    // Höhe des Headers und seiner Kinder; dazu Regeln mit hover/pointer/any-hover-Medienbedingung
    const h = document.querySelector('header.shopify-section');
    const kinder = [...h.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().height > 40).slice(0, 8).map((e) => e.tagName + '.' + String(e.className).slice(0, 50) + ' h=' + Math.round(e.getBoundingClientRect().height) + ' pad=' + getComputedStyle(e).paddingTop);
    const conds = new Set();
    for (const s of document.styleSheets) { let rules; try { rules = s.cssRules; } catch (e) { continue; }
      const walk = (rs) => { for (const x of rs) { if (x.conditionText !== undefined && x.cssRules) { if (/hover|pointer/.test(x.conditionText)) conds.add(x.conditionText + ' -> ' + [...x.cssRules].slice(0, 3).map((y) => (y.selectorText || '').slice(0, 60)).join(' | ')); walk(x.cssRules); } } };
      walk(rules); }
    return { kinder, conds: [...conds].slice(0, 40), hcls: document.getElementById('header-component').outerHTML.slice(0, 300) };
  });
  console.log(r.kinder.join('\n')); console.log('---'); console.log(r.conds.join('\n')); console.log(r.hcls);
  await b.close();
})();
