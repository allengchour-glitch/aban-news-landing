// Skeptiker-Messgeraet (Kopie/Erweiterung von ../replay.mjs). Nur lesen, nichts schreiben ausser Ergebnis-JSON.
// Aufruf: node messen2.mjs <varianten> <profil> <runs> <geraet> <modus> [docDelayMs]
//   modus: fulfill (wie replay.mjs) | verzoegert (Dokument erst nach docDelayMs ausliefern) | live (echtes luxestyle.ch, nur 'vor' sinnvoll)
// Zusaetzlich zu replay.mjs: Navigation-Timing des Dokuments (wird es gedrosselt?), Anfrage-Log (page.on request),
// erstes praesentiertes Videobild (requestVideoFrameCallback), Opazitaet des Videos per rAF, Long-Tasks bis 'sichtbar'.
import { startArgumente, PROXY_SPKI, PLAYWRIGHT } from '/home/user/aban-news-landing/tools/browser.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium, devices } = await import(PLAYWRIGHT);
const BASIS = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/live2311/';
const [varianten, profil, runs, geraet, modus, docDelay] = [process.argv[2].split(','), process.argv[3] || '4g', +(process.argv[4] || 3), process.argv[5] || 'handy', process.argv[6] || 'fulfill', +(process.argv[7] || 0)];
const NET = { langsam: [1.6e6, 150, 4], '4g': [9e6, 60, 4], schnell: [50e6, 20, 1] }[profil];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: startArgumente([...PROXY_SPKI, ...(process.env.LOKAL_SPKI ? [process.env.LOKAL_SPKI] : [])]) });
const html = Object.fromEntries(varianten.map(v => [v, v === 'live' ? null : readFileSync(BASIS + `replay_${v}.html`)]));
const ergebnisse = Object.fromEntries(varianten.map(v => [v, []]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let r = 0; r < runs; r++) for (const v of (r % 2 ? [...varianten].reverse() : varianten)) {
  const ctx = await browser.newContext(geraet === 'handy' ? { ...devices['Pixel 5'], locale: 'de-CH' } : { viewport: { width: 1440, height: 900 }, locale: 'de-CH' });
  if (modus === 'netz' && v !== 'live') await ctx.route(u => u.hostname === 'luxestyle.ch' && u.pathname === '/', rt => rt.continue({ url: `${process.env.NETZ_URL}/replay_${v}.html` }));
  else if (modus !== 'live' && v !== 'live') await ctx.route(u => u.hostname === 'luxestyle.ch' && u.pathname === '/', async rt => { if (docDelay) await sleep(docDelay); await rt.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html[v] }); });
  const p = await ctx.newPage(); const c = await ctx.newCDPSession(p);
  const anfragen = []; const t0 = Date.now();
  p.on('request', q => { const u = q.url(); if (/standbild|erstbild|\.mp4/.test(u)) anfragen.push((Date.now() - t0) + ' ' + u.split('/').pop().slice(0, 70)); });
  await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: NET[1], downloadThroughput: NET[0] / 8, uploadThroughput: 1.5e6 / 8 });
  await c.send('Emulation.setCPUThrottlingRate', { rate: NET[2] });
  await p.addInitScript(() => {
    window.__lcp = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), el: e.element ? e.element.tagName : null, cls: e.element ? (e.element.className || '').toString().slice(0, 40) : null, size: e.size, url: (e.url || '').split('/').pop().split('?')[0] }); }).observe({ type: 'largest-contentful-paint', buffered: true });
    window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
    window.__ev = {}; const log = n => { if (!(n in window.__ev)) window.__ev[n] = Math.round(performance.now()); };
    let rvfc = false;
    const opaz = v => { const tick = () => { const o = +getComputedStyle(v).opacity; if (o > 0 && !('opak>0' in window.__ev)) log('opak>0'); if (o >= 0.99) { log('opak=1'); return; } requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
    new MutationObserver(ms => { for (const m of ms) {
      if (m.target.tagName === 'VIDEO' && m.attributeName === 'src' && m.target.getAttribute('src')) { log('src'); if (!rvfc && m.target.requestVideoFrameCallback) { rvfc = true; const v = m.target; v.requestVideoFrameCallback((now, md) => { window.__ev.frame = Math.round(now); window.__ev.frameMedia = +md.mediaTime.toFixed(3); window.__ev.frames = md.presentedFrames; }); } }
      if (m.attributeName === 'data-has-frame' && m.target.hasAttribute('data-has-frame')) { log('sichtbar'); const v = m.target.querySelector('video'); if (v) opaz(v); }
      if (m.attributeName === 'data-has-frame' && !m.target.hasAttribute('data-has-frame') && 'sichtbar' in window.__ev) log('wiederWeg');
    } }).observe(document, { subtree: true, attributes: true, attributeFilter: ['src', 'data-has-frame'] });
    document.addEventListener('playing', e => { if (e.target.tagName === 'VIDEO') log('playing'); }, true);
    document.addEventListener('DOMContentLoaded', () => log('dcl'));
  });
  const url = (modus === 'live' || v === 'live') ? 'https://luxestyle.ch/?cb=' + Date.now() : 'https://luxestyle.ch/?cb=' + Date.now();
  await p.goto(url, { waitUntil: 'load', timeout: 180000 });
  await p.waitForTimeout(5000);
  const m = await p.evaluate(() => { const res = performance.getEntriesByType('resource'); const img = document.querySelector('.lx-campaign-hero__media img'); const v = document.querySelector('.lx-scroll-hero__video');
    const bild = res.filter(x => /standbild|erstbild/.test(x.name)).map(x => x.name.split('/').pop().split('?')[0].slice(0, 32) + (x.name.match(/width=\d+/) || [''])[0] + '@' + Math.round(x.startTime) + '-' + Math.round(x.responseEnd) + ':' + Math.round(x.transferSize / 1024) + 'KB');
    const vid = res.filter(x => /\.mp4/.test(x.name)).map(x => x.name.split('/').pop().split('?')[0].slice(0, 34) + '@' + Math.round(x.startTime) + '-' + Math.round(x.responseEnd) + ':' + Math.round(x.transferSize / 1024) + 'KB');
    const n = performance.getEntriesByType('navigation')[0];
    const l = window.__lcp.slice(-1)[0] || {};
    const sicht = window.__ev.sichtbar || 1e9;
    const tbtBis = window.__lt.filter(([s]) => s < sicht).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
    const fcpE = performance.getEntriesByName('first-contentful-paint')[0];
    return { fcp: fcpE && Math.round(fcpE.startTime), eff: navigator.connection && navigator.connection.effectiveType, saveData: navigator.connection && navigator.connection.saveData, lcp: l.t, lcpEl: l.el, lcpCls: l.cls, lcpSize: l.size, lcpUrl: l.url, lcpAlle: window.__lcp.map(e => e.t + ':' + e.el + ':' + e.url.slice(0, 30)).join(' | '), cls: +window.__cls.toFixed(4), ...window.__ev,
      doc: { reqStart: Math.round(n.requestStart), respStart: Math.round(n.responseStart), respEnd: Math.round(n.responseEnd), transfer: n.transferSize, domInteractive: Math.round(n.domInteractive) },
      tbtBisSichtbar: tbtBis, bild, vid, current: img && img.currentSrc.split('/').pop().split('?')[0], vSrc: v && (v.getAttribute('src') || '').split('/').pop().split('?')[0], vPaused: v && v.paused, vOpacity: v && getComputedStyle(v).opacity, vPoster: v && (v.getAttribute('poster') || '').split('/').pop().slice(0, 40), load: Math.round(n.loadEventEnd) }; });
  m.anfragen = anfragen;
  ergebnisse[v].push(m); console.log(v, r + 1, JSON.stringify(m));
  await ctx.close();
}
const med = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
for (const v of varianten) { const e = ergebnisse[v]; console.log('MEDIAN', v, JSON.stringify({ lcp: med(e.map(x => x.lcp)), src: med(e.map(x => x.src)), playing: med(e.map(x => x.playing)), sichtbar: med(e.map(x => x.sichtbar)), frame: med(e.map(x => x.frame)), fcp: med(e.map(x => x.fcp)), opak1: med(e.map(x => x['opak=1'])), dcl: med(e.map(x => x.dcl)), cls: med(e.map(x => x.cls)), load: med(e.map(x => x.load)), docRespEnd: med(e.map(x => x.doc.respEnd)), tbt: med(e.map(x => x.tbtBisSichtbar)), n: e.length })); }
writeFileSync(BASIS + `skeptiker/erg_${varianten.join('-')}_${profil}_${geraet}_${modus}${docDelay ? '_d' + docDelay : ''}_${Date.now()}.json`, JSON.stringify(ergebnisse, null, 1));
await browser.close();
