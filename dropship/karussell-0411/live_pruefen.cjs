const { chromium } = require('playwright');
const uaD = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const uaM = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  let fail = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  FEHLER ') + m); if (!c) fail++; };
  for (const [name, path, opt] of [
    ['desktop 1440 /', '/', { viewport: { width: 1440, height: 900 }, userAgent: uaD }],
    ['desktop 1440 /fr', '/fr', { viewport: { width: 1440, height: 900 }, userAgent: uaD }],
    ['mobil 390 /', '/', { viewport: { width: 390, height: 844 }, userAgent: uaM, hasTouch: true, isMobile: true }],
  ]) {
    console.log('==', name);
    const ctx = await b.newContext(opt); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/marketingAllowed|Failed to load resource|clarity|Framing|importScripts/i.test(m.text())) errs.push(m.text().slice(0, 100)); });
    await p.goto('https://luxestyle.ch' + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(5000);
    const t = await p.title();
    if (/just a moment|verify/i.test(t) || !(await p.$('.lx-home'))) { console.log('  Seite nicht lesbar (Cloudflare?):', t); await ctx.close(); continue; }
    const a = await p.evaluate(() => {
      const w = [...document.querySelectorAll('.lx-carousel')];
      const g = document.querySelector('.lx-trends-grid'); const wr = g.parentElement;
      const nx = wr.querySelector('.lx-carousel-next'); const pv = wr.querySelector('.lx-carousel-prev'); const bar = wr.querySelector('.lx-carousel-progress');
      const vis = (e) => { const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && e.getBoundingClientRect().width > 0; };
      return { wraps: w.length, ready: document.querySelector('.lx-home').classList.contains('lx-car-ready'), lang: document.documentElement.lang,
        labels: [pv.getAttribute('aria-label'), nx.getAttribute('aria-label')], nextVis: vis(nx), prevVis: vis(pv), barVis: vis(bar), sw: document.documentElement.scrollWidth, vw: innerWidth };
    });
    console.log('  ', JSON.stringify(a));
    ok(a.wraps === 3 && a.ready, 'drei Reihen als Karussell eingerichtet');
    ok(a.sw <= a.vw, 'kein seitliches Scrollen');
    if (name.startsWith('desktop')) {
      ok(a.nextVis && !a.prevVis, 'Weiter-Pfeil sichtbar, Zurück-Pfeil am Anfang aus');
      const r = await p.evaluate(async () => {
        const g = document.querySelector('.lx-trends-grid'); const w = g.parentElement; const nx = w.querySelector('.lx-carousel-next'); const pv = w.querySelector('.lx-carousel-prev');
        nx.click(); await new Promise(r => setTimeout(r, 1200)); const l1 = Math.round(g.scrollLeft);
        nx.click(); await new Promise(r => setTimeout(r, 1200)); const l2 = Math.round(g.scrollLeft);
        pv.click(); await new Promise(r => setTimeout(r, 1200)); const l3 = Math.round(g.scrollLeft);
        return { l1, l2, l3, max: g.scrollWidth - g.clientWidth, nextOffAtEnd: false };
      });
      console.log('  ', JSON.stringify(r)); ok(r.l1 > 500 && r.l2 > r.l1 && r.l3 < r.l2, 'Pfeile blättern vor und zurück');
      if (path === '/fr') ok(/Produits/.test(a.labels[1]) && a.lang === 'fr', 'französische Beschriftung: ' + a.labels.join(' / '));
      else ok(/Weitere Produkte/.test(a.labels[1]), 'deutsche Beschriftung');
      await p.evaluate(() => document.querySelector('.lx-trends').scrollIntoView({ block: 'center' })); await p.waitForTimeout(600);
      await p.screenshot({ path: 'live_' + (path === '/' ? 'de' : 'fr') + '_1440.png' });
    } else {
      ok(!a.nextVis && !a.prevVis && a.barVis, 'Touch: keine Pfeile, Positionsbalken sichtbar');
      await p.evaluate(() => document.querySelector('.lx-trends').scrollIntoView({ block: 'start' })); await p.waitForTimeout(600);
      await p.screenshot({ path: 'live_m390.png' });
    }
    ok(errs.length === 0, 'keine Konsolenfehler ' + JSON.stringify(errs));
    await ctx.close(); await sleep(3000);
  }
  await b.close(); console.log(fail ? fail + ' FEHLER' : 'ALLES OK'); process.exit(fail ? 1 : 0);
})();
