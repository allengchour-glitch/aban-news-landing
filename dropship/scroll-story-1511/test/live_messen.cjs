// Live-Messung der Testvorlage (echter Shop, ein Seitenaufruf je Lauf).
// Aufruf: node test/live_messen.cjs <desktop|handy> <ausPrefix> [--reduziert]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL_ = process.env.ADRESSE || 'https://luxestyle.ch/?view=lxstory';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
(async () => {
  const [form, aus] = process.argv.slice(2);
  const reduziert = process.argv.includes('--reduziert');
  const handy = form === 'handy';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: handy ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: handy ? 2 : 1, userAgent: handy ? UAM : UA, locale: 'de-CH', isMobile: handy, hasTouch: handy, reducedMotion: reduziert ? 'reduce' : 'no-preference', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const req = new Map(); const fertig = [];
  let phase = 'vor';
  cdp.on('Network.requestWillBeSent', (e) => req.set(e.requestId, { url: e.request.url, phase, typ: e.type }));
  cdp.on('Network.responseReceived', (e) => { const r = req.get(e.requestId); if (r) { r.status = e.response.status; r.mime = e.response.mimeType; } });
  cdp.on('Network.loadingFinished', (e) => { const r = req.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; fertig.push(r); } });
  const fehler = []; page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
  await page.addInitScript(() => { window.__cls = 0; window.__lsq = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__lsq.push([+e.value.toFixed(4), Math.round(e.startTime), (e.sources || []).map((s) => s.node && s.node.nodeType === 1 ? s.node.tagName + '.' + String(s.node.className).slice(0, 30) : '?').join(',')]); } }).observe({ type: 'layout-shift', buffered: true }); });
  const t0 = Date.now();
  const resp = await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);
  const story = (u) => /lx-story-s\d\d-(quer|hoch)-v1\.(mp4|webp)/.test(u);
  const vorScroll = fertig.filter((r) => story(r.url)).map((r) => ({ datei: r.url.match(/lx-story-[^?]+/)[0], bytes: r.bytes, status: r.status }));
  const info = await page.evaluate(() => {
    const s = document.querySelector('[data-lx-story]');
    if (!s) return { story: false, kommentar: (document.documentElement.innerHTML.match(/lx-story: aus[^>]*/) || [''])[0] };
    const h = document.querySelector('.lx-hero');
    return { story: true, nachHero: !!(h && h.nextElementSibling && h.nextElementSibling.querySelector('[data-lx-story]')), platzhalter: document.querySelectorAll('.lx-story-platzhalter').length,
      kapitel: [...s.querySelectorAll('.lx-story__wort')].map((x) => x.textContent.trim()), karten: [...s.querySelectorAll('.lx-story__karte')].map((a) => ({ href: a.getAttribute('href'), preis: a.querySelector('.lx-story__karte-preis').textContent.trim(), titel: a.querySelector('.lx-story__karte-titel').textContent.trim() })),
      kopf: getComputedStyle(s).getPropertyValue('--lx-oben').trim(), rueckfall: s.getAttribute('data-rueckfall'), scrollY: scrollY,
      editorialBody: document.body.classList.contains('lx-editorial-home'), doppelKopf: [...document.querySelectorAll('.lx-home > .lx-header')].filter((e) => getComputedStyle(e).display !== 'none').length };
  });
  console.log('HTTP', resp.status(), JSON.stringify(info));
  console.log('vor dem Scrollen (story-Dateien):', JSON.stringify(vorScroll));
  if (!info.story) { await b.close(); return; }
  await page.evaluate(() => { const bn = [...document.querySelectorAll('#lx-cookie-banner button')].find((x) => /notwendig/i.test(x.textContent)); if (bn) bn.click(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: aus + '_00_start.jpg', type: 'jpeg', quality: 72 });
  phase = 'nach';
  const kap = await page.evaluate(() => [...document.querySelectorAll('.lx-story__kapitel')].map((k) => { const r = k.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; }));
  const ergebnisse = [];
  for (let i = 0; i < kap.length; i++) {
    const von = await page.evaluate(() => scrollY);
    for (let j = 1; j <= 8; j++) { await page.evaluate((y) => scrollTo(0, y), von + ((kap[i] - von) * j) / 8); await page.waitForTimeout(70); }
    await page.waitForTimeout(2600);
    const z = await page.evaluate(() => { const s = document.querySelector('[data-lx-story]'); const v = s.querySelector('.lx-story__ebene[data-aktiv] video'); const q = v && v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null; return { k: s.getAttribute('data-kapitel'), spielt: !!(v && !v.paused && v.hasAttribute('data-spielt')), src: v && v.currentSrc.split('/').pop().split('?')[0], frames: q && q.totalVideoFrames, verloren: q && q.droppedVideoFrames, breite: document.documentElement.scrollWidth }; });
    ergebnisse.push(z);
    await page.screenshot({ path: `${aus}_${String(i + 1).padStart(2, '0')}_kapitel.jpg`, type: 'jpeg', quality: 72 });
  }
  console.log('Kapitel:', JSON.stringify(ergebnisse));
  const alle = fertig.filter((r) => story(r.url) && r.url.includes('.mp4'));
  const proDatei = {}; for (const r of alle) { const d = r.url.match(/lx-story-[^?]+/)[0]; proDatei[d] = (proDatei[d] || 0) + (r.bytes || 0); }
  const sum = Object.values(proDatei).reduce((a, b) => a + b, 0);
  const cls = await page.evaluate(() => ({ cls: +window.__cls.toFixed(4), q: window.__lsq }));
  console.log('Video-Bytes übertragen gesamt', sum, JSON.stringify(proDatei));
  console.log('CLS', JSON.stringify(cls), 'Seitenfehler', fehler.length, JSON.stringify(fehler), 'Dauer', Date.now() - t0, 'ms');
  fs.writeFileSync(aus + '_messung.json', JSON.stringify({ zeit: new Date().toISOString(), form, reduziert, http: resp.status(), info, vorScroll, kapitel: ergebnisse, videoBytes: sum, proDatei, cls, fehler }, null, 1));
  await b.close();
})();
