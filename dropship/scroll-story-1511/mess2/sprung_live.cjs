// Live: Punkt-Sprung 1 -> 6 lädt nur das Zielvideo (echter weicher Bildlauf des Themes). Ein Seitenaufruf je Form.
const { chromium } = require('playwright');
const URL_ = process.env.ADRESSE || 'https://luxestyle.ch/?view=lxstory';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
(async () => {
  const form = process.argv[2]; const handy = form === 'handy';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: handy ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: handy ? 2 : 1, userAgent: handy ? UAM : UA, locale: 'de-CH', isMobile: handy, hasTouch: handy });
  const page = await ctx.newPage();
  const mp4 = []; page.on('request', (r) => { const m = r.url().match(/lx-story-(s\d\d)-(quer|hoch)-v1\.mp4/); if (m) mp4.push(m[1]); });
  const fehler = []; page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(5000);
  const js = await page.evaluate(async () => { const sc = [...document.scripts].find((s) => /lx-story\.js/.test(s.src)); const t = await (await fetch(sc.src)).text(); return { src: sc.src.replace(/^.*\/assets\//, ''), sprung: t.includes('a[data-i]') && /3e3/.test(t), len: t.length }; });
  const y0 = await page.evaluate(() => { const k = document.querySelector('.lx-story__kapitel'); const r = k.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; });
  const von = await page.evaluate(() => scrollY);
  for (let j = 1; j <= 8; j++) { await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), von + ((y0 - von) * j) / 8); await page.waitForTimeout(100); }
  await page.waitForTimeout(2500);
  const vor = mp4.length;
  const pos = await page.evaluate(() => { const a = document.querySelector('.lx-story__punkte a[data-i="5"]'); const r = a.getBoundingClientRect(); return { x: r.right - 8, y: r.top + r.height / 2 }; });
  if (handy) await page.touchscreen.tap(pos.x, pos.y); else await page.mouse.click(pos.x, pos.y);
  let k = null; const t0 = Date.now();
  for (let w = 0; w < 50 && k !== '5'; w++) { await page.waitForTimeout(200); k = await page.evaluate(() => document.querySelector('[data-lx-story]').getAttribute('data-kapitel')); }
  const ankunftMs = Date.now() - t0;
  await page.waitForTimeout(2000);
  console.log(JSON.stringify({ form, zeit: new Date().toISOString(), js, k, ankunftMs, nachKlick: mp4.slice(vor), fehler }));
  await b.close();
})();
