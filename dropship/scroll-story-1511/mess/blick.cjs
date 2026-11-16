// Bildschirmfotos einer Liste von Adressen (Desktop 1440 oder Handy 390), mit Pausen.
const { chromium } = require('playwright');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
(async () => {
  const [url, out, form, scrollStr] = process.argv.slice(2);
  const handy = form === 'handy';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: handy ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, userAgent: handy ? UAM : UA, locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' }, isMobile: handy, hasTouch: handy });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  const r = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(4000);
  const info = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, title: document.title, heroY: (document.querySelector('.lx-hero')||{getBoundingClientRect:()=>({top:-1})}).getBoundingClientRect().top + scrollY, css: [...document.styleSheets].map(s=>s.href||'inline').filter(h=>/luxe-edit|lx-/.test(h)) }));
  console.log(r.status(), JSON.stringify(info), errs.length + ' Fehler');
  const ys = (scrollStr || '0').split(',').map(Number);
  let i = 0;
  for (const y of ys) { await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(1200); await p.screenshot({ path: out + '_' + (i++) + '.jpg', type: 'jpeg', quality: 70 }); }
  await b.close();
})();
