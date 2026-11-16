// Bildschirmfotos 2.0: je Kapitel Mitte und Vorhang-Übergang zum nächsten, dazu Eingang und Ende.
// Aufruf: node harness/fotos2.cjs <aus-ordner> <desktop|handy|tablet> [--live URL]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { einrichten, kontext, START } = require('./nachbau.cjs');
const BASIS = path.join(__dirname, '..');
(async () => {
  const [aus, form] = process.argv.slice(2);
  const li = process.argv.indexOf('--live'); const live = li > 0 ? process.argv[li + 1] : null;
  fs.mkdirSync(aus, { recursive: true });
  const b = await chromium.launch();
  const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
  const ctx = form === 'tablet' ? await kontext(b, 'desktop', { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, userAgent: UAM }) : await kontext(b, form, form === 'handy' ? { deviceScaleFactor: 2 } : {});
  const page = await ctx.newPage(); const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
  if (!live) { const html = execFileSync(process.execPath, [path.join(BASIS, 'harness', 'render.mjs'), path.join(BASIS, 'theme'), '-', 'normal'], { encoding: 'utf8' }); await einrichten(page, html); }
  await page.goto(live || START, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { const x = [...document.querySelectorAll('#lx-cookie-banner button')].find((y) => /notwendig/i.test(y.textContent)); if (x) x.click(); });
  await page.addStyleTag({ content: '#lx-pop{display:none!important}' });
  await page.screenshot({ path: path.join(aus, '00_start.jpg'), type: 'jpeg', quality: 70 });
  const vh = page.viewportSize().height;
  const info = await page.evaluate(() => { const s = document.querySelector('[data-lx-story]'); const r = s.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, kap: [...s.querySelectorAll('.lx-story__kapitel')].map((k) => { const q = k.getBoundingClientRect(); return { top: q.top + scrollY, h: q.height }; }) }; });
  const ziele = [['01_eingang', info.top - vh * 0.35]];
  info.kap.forEach((k, i) => { ziele.push([`k${i + 1}_mitte`, k.top + k.h / 2 - vh / 2]); if (info.kap[i + 1]) ziele.push([`k${i + 1}_vorhang`, info.kap[i + 1].top - 0.6 * vh]); });
  ziele.push(['99_ende', info.top + info.h - vh * 0.6]);
  for (const [name, y] of ziele) {
    const von = await page.evaluate(() => scrollY);
    for (let j = 1; j <= 8; j++) { await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), von + ((y - von) * j) / 8); await page.waitForTimeout(50); }
    await page.waitForTimeout(name.includes('mitte') ? 1700 : 500);
    await page.screenshot({ path: path.join(aus, name + '.jpg'), type: 'jpeg', quality: 70 });
  }
  console.log('fertig', ziele.length, 'Fotos, Seitenfehler', fehler.length, fehler.join(' | '));
  await b.close();
})();
