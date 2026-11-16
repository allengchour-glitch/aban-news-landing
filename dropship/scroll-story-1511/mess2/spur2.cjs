// Ein Seitenaufruf der Testvorlage: Stilarbeit je Bild beim Scrollen durch die Geschichte (gleiches Verfahren wie der Prüfer:
// 1 px/ms, scrollTo instant je Bild) und Bewegung des Hintergrunds je 300 px. Aufruf: node spur2.cjs <desktop|handy>
const { chromium } = require('playwright');
const form = process.argv[2] || 'desktop';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const F = form === 'handy' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, userAgent: UAM, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, userAgent: UA };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...F, locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const page = await ctx.newPage(); const fehler = []; page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
  const resp = await page.goto('https://luxestyle.ch/?view=lxstory', { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { const bn = [...document.querySelectorAll('#lx-cookie-banner button')].find((x) => /notwendig/i.test(x.textContent)); if (bn) bn.click(); });
  await page.addStyleTag({ content: '#lx-pop{display:none!important}' });
  const st = await page.evaluate(() => { const s = document.querySelector('[data-lx-story]'); return { top: Math.round(s.getBoundingClientRect().top + scrollY), h: Math.round(s.getBoundingClientRect().height), n: s.querySelectorAll('*').length }; });
  const spur = async () => {
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), st.top + 200); await page.waitForTimeout(1500);
  await b.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
  const fr = await page.evaluate(async (st) => { const a = st.top + 200, z = st.top + st.h - innerHeight - 200; const t0 = performance.now(); let n = 0, last = t0; const d = []; await new Promise((res) => { (function f(now) { n++; d.push(now - last); last = now; const y = Math.min(z, a + (now - t0) * 1.0); scrollTo({ top: y, behavior: 'instant' }); if (y < z) requestAnimationFrame(f); else res(); })(t0); }); d.sort((x, y) => x - y); return { bilder: n, p95: Math.round(d[Math.floor(d.length * 0.95)] * 10) / 10 }; }, st);
  const buf = await b.stopTracing();
  const ev = JSON.parse(buf.toString()).traceEvents;
  const ult = ev.filter((e) => e.name === 'UpdateLayoutTree' && e.ph === 'X');
  const counts = ult.map((e) => (e.args && (e.args.elementCount ?? (e.args.beginData && e.args.beginData.elementCount))) || 0);
  const c = [...counts].sort((x, y) => x - y);
  const layout = ev.filter((e) => e.name === 'Layout' && e.ph === 'X');
  return { ...fr, stilRechnungen: ult.length, elementeSumme: counts.reduce((a, x) => a + x, 0), elementeMedian: c[Math.floor(c.length / 2)] || 0, elementeMax: c[c.length - 1] || 0, groesste: c.slice(-8), stilMs: Math.round(ult.reduce((a, e) => a + (e.dur || 0), 0) / 1000), layouts: layout.length, layoutMs: Math.round(layout.reduce((a, e) => a + (e.dur || 0), 0) / 1000) };
  };
  const r = await spur();
  const r2 = await spur();
  await page.evaluate(() => window.lxStory.weg());
  const r0 = await spur();
  console.log('ohne Skript der Geschichte (gleicher Tab):', JSON.stringify(r0));
  console.log('zweiter Lauf mit Skript:', JSON.stringify(r2));
  // Gegenprobe im selben Tab: Schreibweise der Fassung 1 (geerbte Variablen am Abschnitt und an jedem Kapitel)
  const v1 = require('fs').readFileSync(__dirname + '/../theme_v1/assets/lx-story.js', 'utf8');
  await page.evaluate((code) => { const s = document.createElement('script'); s.textContent = code; document.body.appendChild(s); }, v1);
  await page.waitForTimeout(1000);
  const rv1 = await spur();
  console.log('Schreibweise Fassung 1 (gleicher Tab):', JSON.stringify(rv1));
  await page.evaluate(() => window.lxStory.weg());
  const v2 = require('fs').readFileSync(__dirname + '/../theme/assets/lx-story.js', 'utf8');
  await page.evaluate((code) => { const s = document.createElement('script'); s.textContent = code; document.body.appendChild(s); }, v2);
  // Bewegung des Hintergrunds: Kapitel 2, Video angehalten, 5 Positionen über 1 200 px
  const bew = [];
  const k1 = await page.evaluate(() => { const k = document.querySelectorAll('.lx-story__kapitel')[1]; const q = k.getBoundingClientRect(); return q.top + scrollY + q.height / 2 - innerHeight / 2; });
  for (let i = 0; i < 5; i++) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), k1 - 600 + i * 300); await page.waitForTimeout(250);
    bew.push(await page.evaluate(() => { const e = document.querySelectorAll('.lx-story__ebene')[1]; const m = e.querySelector('video') || e.querySelector('img'); const q = m.getBoundingClientRect(); return { breite: Math.round(q.width), links: Math.round(q.left), oben: Math.round(q.top), vorhang: e.style.transform }; }));
  }
  console.log('HTTP', resp.status(), form, JSON.stringify(st));
  console.log('Stil beim Scrollen', JSON.stringify(r));
  console.log('Bewegung je 300 px (Kapitel 2):', JSON.stringify(bew));
  console.log('Fehler', JSON.stringify(fehler));
  await b.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
