// LCP gedrosselt: heutige Startseite gegen Testvorlage, abwechselnd, mit Pausen (Schutz vor 429).
// Aufruf: node test/lcp.cjs <handy|desktop> <läufe> <aus.json>
const { chromium } = require('playwright');
const fs = require('fs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const SEITEN = { heute: 'https://luxestyle.ch/', test: 'https://luxestyle.ch/?view=lxstory' };
(async () => {
  const [form, n, aus] = process.argv.slice(2);
  const handy = form === 'handy';
  const netz = handy ? { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, offline: false } : { latency: 40, downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (5 * 1024 * 1024) / 8, offline: false };
  const cpu = handy ? 4 : 1;
  const b = await chromium.launch();
  const erg = [];
  for (let i = 0; i < Number(n); i++) {
    for (const name of (i % 2 ? ['test', 'heute'] : ['heute', 'test'])) {
      const ctx = await b.newContext({ viewport: handy ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: handy ? 2 : 1, userAgent: handy ? UAM : UA, locale: 'de-CH', isMobile: handy, hasTouch: handy, extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', netz);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      let bytes = 0, story = 0; cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
      cdp.on('Network.requestWillBeSent', (e) => { if (/lx-story-s\d\d/.test(e.request.url)) story++; });
      await page.addInitScript(() => { window.__lcp = null; window.__cls = 0; new PerformanceObserver((l) => { const e = l.getEntries().pop(); window.__lcp = { t: Math.round(e.startTime), el: e.element ? e.element.tagName + '.' + String(e.element.className).slice(0, 40) : (e.url || '').slice(-60), size: e.size }; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
      const t0 = Date.now();
      const r = await page.goto(SEITEN[name], { waitUntil: 'load', timeout: 120000 }).catch((e) => null);
      await page.waitForTimeout(8000);
      const m = await page.evaluate(() => ({ lcp: window.__lcp, cls: +window.__cls.toFixed(4), fcp: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0) }));
      const z = { lauf: i + 1, seite: name, http: r ? r.status() : 'fehler', lcp: m.lcp && m.lcp.t, lcpElement: m.lcp && m.lcp.el, fcp: m.fcp, cls: m.cls, bytes, storyAnfragen: story, ms: Date.now() - t0, zeit: new Date().toISOString() };
      console.log(JSON.stringify(z)); erg.push(z);
      await ctx.close();
      await new Promise((res) => setTimeout(res, 20000));
    }
  }
  await b.close();
  const med = (s) => { const a = erg.filter((e) => e.seite === s && e.lcp).map((e) => e.lcp).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
  const zus = { form, netz, cpu, median_heute: med('heute'), median_test: med('test'), differenz_ms: med('test') - med('heute'), laeufe: erg };
  console.log('Median heute', zus.median_heute, 'Median Test', zus.median_test, 'Differenz', zus.differenz_ms, 'ms');
  fs.writeFileSync(aus, JSON.stringify(zus, null, 1));
})();
