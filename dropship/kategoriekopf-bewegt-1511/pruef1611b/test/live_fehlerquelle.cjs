// Woher kommen die 3 «Failed to fetch»? Zwei Aufrufe derselben Testseite: (a) Messhuelle wie live_1611b (blockt luxestyle.ch ausser /cdn/),
// (b) nur Analytik blockiert. Protokolliert abgebrochene Anfragen und Seitenfehler.
const path = require('path'); const fs = require('fs');
const B = path.resolve(__dirname, '..', '..');
const { chromium, kontext, url, pause } = require(path.join(B, 'nachpruef-bildgeo', 'gemeinsam.cjs'));
const LOG = path.join(__dirname, '..', 'log');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
(async () => {
  const b = await chromium.launch(); const erg = {};
  for (const art of ['huelle', 'offen']) {
    if (art === 'offen') await pause(9000);
    let ctx;
    if (art === 'huelle') ({ ctx } = await kontext(b, { w: 1440, h: 900 }));
    else { ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } }); await ctx.route('**/*', (r) => (/monorail|web-pixels|\/api\/collect|clarity\.ms|google-analytics|googletagmanager|facebook|tiktok|pinterest|klaviyo|doubleclick|bat\.bing|hotjar|snapchat/.test(r.request().url()) ? r.abort() : r.continue())); }
    const page = await ctx.newPage(); const fe = [], rf = [];
    page.on('pageerror', (e) => fe.push(String(e.message).slice(0, 120)));
    page.on('requestfailed', (r) => { const u = r.url(); if (/luxestyle\.ch/.test(u)) rf.push(r.resourceType() + ' ' + u.replace('https://luxestyle.ch', '').slice(0, 90)); });
    const t0 = new Date().toISOString();
    const resp = await page.goto(url('sub-beleuchtung', 'test'), { waitUntil: 'load', timeout: 90000 });
    fs.appendFileSync(path.join(LOG, 'abrufe.log'), `${t0} ${url('sub-beleuchtung', 'test')} ${resp.status()} w1440 (${art})\n`);
    if (resp.status() === 429) { console.log('429'); break; }
    await page.waitForTimeout(6000);
    erg[art] = { status: resp.status(), seitenfehler: fe, abgebrochenLuxestyle: rf.filter((x) => /^(fetch|xhr)/.test(x)), clip: await page.evaluate(() => { const v = document.querySelector('.lx-kb__clip video'); return v ? { paused: v.paused, vw: v.videoWidth } : null; }) };
    await ctx.close();
  }
  await b.close(); console.log(JSON.stringify(erg, null, 1));
})();
