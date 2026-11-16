const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', locale: 'de-CH' });
  const page = await ctx.newPage(); await page.goto('https://luxestyle.ch/?view=lxstory', { waitUntil: 'domcontentloaded', timeout: 90000 });
  const r = await page.evaluate(async () => { const sc = [...document.scripts].find((s) => /lx-story\.js/.test(s.src)); const t = await (await fetch(sc.src)).text(); const i = t.indexOf('999'); return { src: sc.src, len: t.length, stelle: t.slice(Math.max(0, i - 40), i + 20), alt: t.includes('0.97') || t.includes('.97;') }; });
  console.log(JSON.stringify(r)); await b.close();
})();
