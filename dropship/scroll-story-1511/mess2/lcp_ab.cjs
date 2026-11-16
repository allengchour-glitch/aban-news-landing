// LCP gedrosselt, abwechselnd heutige Startseite und Testvorlage, frischer Browser je Lauf.
// node lcp.cjs <handy|desktop> <paare> <aus.json>
const { chromium } = require('playwright');
const fs = require('fs');
const [form, paareS, aus] = process.argv.slice(2);
const paare = Number(paareS || 3);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const H = form === 'handy';
const F = H ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, userAgent: UAM, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, userAgent: UA };
const NET = H ? { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 } : { latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8 };
const CPU = H ? 4 : 1;
const STRIP_A = /<div id="shopify-section-template--\d+__lx_story_platz" class="shopify-section">[\s\S]*?<\/div>/;
const STRIP_B = /<div id="shopify-section-template--\d+__lx_story" class="shopify-section lx-story-abschnitt">[\s\S]*?<\/section>\s*<script>[\s\S]*?<\/script>\s*<\/div>/;
async function lauf(url, ohne) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...F, locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  let ersetzt = null;
  await page.route((u) => u.href === url, async (route) => { const resp = await route.fetch(); let body = await resp.text(); const n0 = body.length; if (ohne) body = body.replace(STRIP_A, '').replace(STRIP_B, ''); ersetzt = n0 - body.length; await route.fulfill({ response: resp, body }); });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NET });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  let bytes = 0, doc = 0, story = 0; const req = new Map();
  cdp.on('Network.requestWillBeSent', (e) => req.set(e.requestId, e));
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; const r = req.get(e.requestId); if (r && r.type === 'Document') doc = e.encodedDataLength; if (r && /lx-story/.test(r.request.url)) story += e.encodedDataLength; });
  await page.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} window.__lcp = []; window.__cls = 0; window.__fcp = null;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push([Math.round(e.startTime), e.element ? e.element.tagName : (e.url || '').slice(-40)]); }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__fcp = Math.round(e.startTime); }).observe({ type: 'paint', buffered: true }); });
  const t0 = Date.now();
  const resp = await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(H ? 9000 : 5000);
  const r = await page.evaluate(() => ({ lcp: window.__lcp[window.__lcp.length - 1], fcp: window.__fcp, cls: +window.__cls.toFixed(4), dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd), tbt: window.__lt.reduce((a, d) => a + Math.max(0, d - 50), 0), story: !!document.querySelector('[data-lx-story]') }));
  await b.close();
  return { url: ohne ? 'ohne' : 'mit', entfernt: ersetzt, storyDa: r.story, tbt: r.tbt, status: resp.status(), lcp: r.lcp && r.lcp[0], lcpEl: r.lcp && r.lcp[1], fcp: r.fcp, dcl: r.dcl, cls: r.cls, loadMs, bytesBisWarten: bytes, htmlBytes: doc, storyBytes: story };
}
(async () => {
  const erg = [];
  for (let i = 0; i < paare; i++) {
    for (const ohne of (i % 2 ? [false, true] : [true, false])) {
      const r = await lauf(process.env.ADRESSE || 'https://luxestyle.ch/?view=lxstory', ohne); erg.push(r); console.log(new Date().toISOString().slice(11, 19), JSON.stringify(r));
      await new Promise((x) => setTimeout(x, 15000));
    }
  }
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  for (const k of ['ohne', 'mit']) { const e = erg.filter((x) => x.url === k); console.log(k, 'Median LCP', med(e.map((x) => x.lcp)), 'FCP', med(e.map((x) => x.fcp)), 'DCL', med(e.map((x) => x.dcl)), 'TBT', med(e.map((x) => x.tbt)), 'HTML', med(e.map((x) => x.htmlBytes)), 'Bytes', med(e.map((x) => x.bytesBisWarten))); }
  fs.writeFileSync(aus, JSON.stringify(erg, null, 1));
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
