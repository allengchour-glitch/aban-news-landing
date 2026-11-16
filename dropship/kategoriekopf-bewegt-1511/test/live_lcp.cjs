// Live: LCP heute gegen ?view=lxbewegt, abwechselnd, frischer Kontext, gedrosselt (40 ms, 10 Mbit/s), Desktop 1440x900. Takt 7 s.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const HIER = path.join(__dirname, '..'); const LOG = path.join(HIER, 'abrufe.log');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
async function takt() { const z = fs.readFileSync(LOG, 'utf8').trim().split('\n'); const w = Date.parse(z[z.length - 1].split(' ')[0]) + 7000 - Date.now(); if (w > 0) await schlaf(w); }
(async () => {
  const [h, n] = process.argv.slice(2); const b = await chromium.launch(); const erg = { heute: [], test: [] };
  for (let i = 0; i < Number(n || 3); i++) for (const art of ['heute', 'test']) {
    await takt();
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'de-CH' });
    await ctx.route('**/*', (r) => (/monorail|web-pixels|\/api\/collect|clarity\.ms|google-analytics|googletagmanager|facebook|tiktok|pinterest|klaviyo/.test(r.request().url()) ? r.abort() : r.continue()));
    const p = await ctx.newPage(); const c = await ctx.newCDPSession(p); await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8 });
    await p.addInitScript(() => { window.__lcp = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), cls: e.element && String(e.element.className).slice(0, 20), url: (e.url || '').split('/').pop().slice(0, 36) }); }).observe({ type: 'largest-contentful-paint', buffered: true }); });
    const url = `https://luxestyle.ch/collections/${h}` + (art === 'test' ? '?view=lxbewegt' : '');
    const r = await p.goto(url, { waitUntil: 'load', timeout: 90000 }); fs.appendFileSync(LOG, `${new Date().toISOString()} ${url} ${r.status()}\n`);
    await p.waitForTimeout(2500); erg[art].push(await p.evaluate(() => { const l = window.__lcp.slice(-1)[0] || {}; const n = performance.getEntriesByType('navigation')[0]; return { ...l, ttfb: Math.round(n.responseStart), nachTtfb: Math.round(l.t - n.responseStart) }; })); await ctx.close();
  }
  await b.close();
  const med = (a) => { const s = a.map((x) => x.t).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  console.log(JSON.stringify(erg)); const medk = (a, k) => { const s = a.map((x) => x[k]).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  console.log(h, 'LIVE LCP Median heute', med(erg.heute), 'ms, test', med(erg.test), 'ms | TTFB heute', medk(erg.heute, 'ttfb'), 'test', medk(erg.test, 'ttfb'), '| LCP minus TTFB heute', medk(erg.heute, 'nachTtfb'), 'test', medk(erg.test, 'nachTtfb'));
})();
