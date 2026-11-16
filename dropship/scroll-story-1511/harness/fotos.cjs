// Bildschirmfotos des Nachbaus: vor dem Scrollen, Übergang Hero -> Geschichte, jedes Kapitel (Mitte), danach.
// Aufruf: node harness/fotos.cjs <story.html> <ausPrefix> <desktop|handy> [--reduziert] [--live URL]
const { chromium } = require('playwright');
const fs = require('fs');
const { einrichten, kontext, START } = require('./nachbau.cjs');
(async () => {
  const [storyDatei, aus, form] = process.argv.slice(2);
  const reduziert = process.argv.includes('--reduziert');
  const liveIdx = process.argv.indexOf('--live');
  const live = liveIdx > 0 ? process.argv[liveIdx + 1] : null;
  const b = await chromium.launch();
  const ctx = await kontext(b, form, reduziert ? { reducedMotion: 'reduce' } : {});
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
  let stat = null;
  if (!live) stat = await einrichten(page, fs.readFileSync(storyDatei, 'utf8'));
  await page.goto(live || START, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3500);
  // Cookie-Hinweis schliessen (wie eine Kundin), damit er die Fotos nicht verdeckt
  await page.evaluate(() => { const b = [...document.querySelectorAll('#lx-cookie-banner button')].find((x) => /notwendig/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: aus + '_00_start.jpg', type: 'jpeg', quality: 72 });
  const info = await page.evaluate(() => {
    const s = document.querySelector('[data-lx-story]'); const h = document.querySelector('.lx-hero');
    if (!s) return null;
    const r = s.getBoundingClientRect();
    return { top: r.top + scrollY, hoehe: r.height, heroUnten: h ? h.getBoundingClientRect().bottom + scrollY : null, kapitel: [...s.querySelectorAll('.lx-story__kapitel')].map((k) => { const q = k.getBoundingClientRect(); return { top: q.top + scrollY, h: q.height }; }), breite: document.documentElement.scrollWidth, platz: s.closest('.shopify-section') && s.closest('.shopify-section').previousElementSibling && s.closest('.shopify-section').previousElementSibling.className };
  });
  console.log(JSON.stringify(info));
  if (!info) { await b.close(); return; }
  const vh = page.viewportSize().height;
  const ziele = [['01_eingang', info.top - vh * 0.45]];
  info.kapitel.forEach((k, i) => ziele.push([String(i + 2).padStart(2, '0') + '_kapitel' + (i + 1), k.top + k.h / 2 - vh / 2]));
  ziele.push(['09_ende', info.top + info.hoehe - vh * 0.5]);
  for (const [name, y] of ziele) {
    // in Schritten scrollen, damit Scroll-Ereignisse wie bei einer Kundin entstehen
    const von = await page.evaluate(() => scrollY);
    const n = 8;
    for (let j = 1; j <= n; j++) { await page.evaluate((yy) => window.scrollTo(0, yy), von + ((y - von) * j) / n); await page.waitForTimeout(60); }
    await page.waitForTimeout(1600);
    await page.screenshot({ path: aus + '_' + name + '.jpg', type: 'jpeg', quality: 72 });
  }
  const zust = await page.evaluate(() => { const s = document.querySelector('[data-lx-story]'); return { kapitel: s.getAttribute('data-kapitel'), rueckfall: s.getAttribute('data-rueckfall'), spielt: [...s.querySelectorAll('video[data-spielt]')].length, breite: document.documentElement.scrollWidth }; });
  console.log(JSON.stringify(zust), 'Seitenfehler:', fehler.length, fehler.join(' | '), stat ? 'Video-Bytes ' + stat.videoBytes + ' Videos ' + stat.videoAnfragen.map((v) => v.datei).join(',') : '');
  await b.close();
})();
