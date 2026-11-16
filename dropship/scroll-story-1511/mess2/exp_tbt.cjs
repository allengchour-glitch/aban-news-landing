// Ladephase: Varianten derselben Testvorlage (nur im Prüfbrowser verändert), Handy, CPU x4, Netz gedrosselt.
// node exp_tbt.cjs <aus.json> <var1,var2,...> <runden>
const { chromium } = require('playwright');
const fs = require('fs');
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const URL_ = process.env.ADRESSE || 'https://luxestyle.ch/?view=lxstory';
const STRIP_A = /<div id="shopify-section-template--\d+__lx_story_platz" class="shopify-section">[\s\S]*?<\/div>/;
const STRIP_B = /<div id="shopify-section-template--\d+__lx_story" class="shopify-section lx-story-abschnitt">[\s\S]*?<\/section>\s*<script>[\s\S]*?<\/script>\s*<\/div>/;
const VAR = {
  mit: (b) => b,
  ohne: (b) => b.replace(STRIP_A, '').replace(STRIP_B, ''),
  kopf: (b) => { const st = []; b = b.replace(/<style id="lx-story-stil">[\s\S]*?<\/style>/, (m) => { st.push(m); return ''; }); b = b.replace(/(<div id="shopify-section-template--\d+__lx_story_platz" class="shopify-section">)(<style>[\s\S]*?<\/style>)/, (m, a, s) => { st.push(s); return a; }); return b.replace('</head>', st.join('') + '</head>'); },
  nojs: (b) => b.replace(/<script src="[^"]*lx-story\.js[^"]*" defer><\/script>/, ''),
  lokal: (b) => { const h = fs.readFileSync(process.env.LOKAL, 'utf8'); return b.replace(STRIP_A, '').replace(STRIP_B, h); }
};
async function lauf(v) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, userAgent: UAM, isMobile: true, hasTouch: true, locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let diff = 0;
  await page.route((u) => u.href === URL_, async (route) => { const resp = await route.fetch(); let body = await resp.text(); const n0 = body.length; body = VAR[v](body); diff = n0 - body.length; await route.fulfill({ response: resp, body }); });
  if (process.env.JSLOKAL) await page.route(/lx-story\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(process.env.JSLOKAL, 'utf8') }));
  await page.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} window.__lcp = []; window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push(Math.round(e.startTime)); }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
  await b.startTracing(page, { categories: ['devtools.timeline'] });
  await page.goto(URL_, { waitUntil: 'load', timeout: 180000 });
  await page.waitForTimeout(6000);
  const r = await page.evaluate(() => ({ lcp: window.__lcp[window.__lcp.length - 1], cls: +window.__cls.toFixed(4), tbt: window.__lt.reduce((a, d) => a + Math.max(0, d - 50), 0), story: !!document.querySelector('[data-lx-story]') }));
  const buf = await b.stopTracing();
  await b.close();
  const ev = JSON.parse(buf.toString()).traceEvents;
  const tid = Object.entries(ev.filter((e) => e.name === 'ParseHTML').reduce((a, e) => { a[e.pid + ':' + e.tid] = (a[e.pid + ':' + e.tid] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1])[0][0];
  const main = ev.filter((e) => e.pid + ':' + e.tid === tid && e.ph === 'X');
  const sum = (f) => Math.round(main.filter(f).reduce((a, e) => a + (e.dur || 0), 0) / 1000);
  const stil = main.filter((e) => e.name === 'UpdateLayoutTree');
  const groessteStil = stil.map((e) => [Math.round(e.dur / 1000), (e.args && e.args.elementCount) || (e.args && e.args.beginData && e.args.beginData.elementCount) || null]).sort((a, c) => c[0] - a[0]).slice(0, 6);
  return { v, entfernt: diff, ...r, stilMs: sum((e) => e.name === 'UpdateLayoutTree'), layoutMs: sum((e) => e.name === 'Layout'), parseMs: sum((e) => e.name === 'ParseHTML'), groessteStil };
}
(async () => {
  const [aus, vs, rS] = process.argv.slice(2);
  const varianten = vs.split(','); const runden = Number(rS || 2); const r = [];
  for (let i = 0; i < runden; i++) for (const v of (i % 2 ? [...varianten].reverse() : varianten)) { const x = await lauf(v); r.push(x); console.log(new Date().toISOString().slice(11, 19), JSON.stringify(x)); fs.writeFileSync(aus, JSON.stringify(r, null, 1)); await new Promise((s) => setTimeout(s, 10000)); }
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  for (const v of varianten) { const e = r.filter((x) => x.v === v); console.log(v, 'TBT', e.map((x) => x.tbt).join('/'), 'Stil', e.map((x) => x.stilMs).join('/'), 'LCP', e.map((x) => x.lcp).join('/'), 'CLS', e.map((x) => x.cls).join('/')); }
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
