// Replay: Dokument aus Datei, alles andere echt (CDN). Handy Pixel 5, Netz/CPU gedrosselt.
import { startArgumente, PLAYWRIGHT } from '/home/user/aban-news-landing/tools/browser.mjs';
import { readFileSync } from 'node:fs';
const { chromium, devices } = await import(PLAYWRIGHT);
const [varianten, profil, runs, geraet] = [process.argv[2].split(','), process.argv[3] || '4g', +(process.argv[4] || 3), process.argv[5] || 'handy'];
const NET = { langsam: [1.6e6, 150, 4], '4g': [9e6, 60, 4], schnell: [50e6, 20, 1] }[profil];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: startArgumente() });
const html = Object.fromEntries(varianten.map(v => [v, readFileSync(`replay_${v}.html`)]));
const ergebnisse = Object.fromEntries(varianten.map(v => [v, []]));
for (let r = 0; r < runs; r++) for (const v of (r % 2 ? [...varianten].reverse() : varianten)) {
  const ctx = await browser.newContext(geraet === 'handy' ? { ...devices['Pixel 5'], locale: 'de-CH' } : { viewport: { width: 1440, height: 900 }, locale: 'de-CH' });
  await ctx.route(u => u.hostname === 'luxestyle.ch' && (u.pathname === '/' ), rt => rt.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html[v] }));
  const p = await ctx.newPage(); const c = await ctx.newCDPSession(p);
  await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: NET[1], downloadThroughput: NET[0] / 8, uploadThroughput: 1.5e6 / 8 });
  await c.send('Emulation.setCPUThrottlingRate', { rate: NET[2] });
  await p.addInitScript(() => {
    window.__lcp = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), el: e.element ? e.element.tagName : null, url: (e.url || '').split('/').pop().split('?')[0] }); }).observe({ type: 'largest-contentful-paint', buffered: true });
    window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    window.__ev = {}; const log = n => { if (!(n in window.__ev)) window.__ev[n] = Math.round(performance.now()); };
    new MutationObserver(ms => { for (const m of ms) { if (m.target.tagName === 'VIDEO' && m.attributeName === 'src') log('src'); if (m.attributeName === 'data-has-frame' && m.target.hasAttribute('data-has-frame')) log('sichtbar'); } }).observe(document, { subtree: true, attributes: true, attributeFilter: ['src', 'data-has-frame'] });
    document.addEventListener('playing', e => { if (e.target.tagName === 'VIDEO') log('playing'); }, true);
  });
  await p.goto('https://luxestyle.ch/?cb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
  await p.waitForTimeout(4000);
  const m = await p.evaluate(() => { const res = performance.getEntriesByType('resource'); const img = document.querySelector('.lx-campaign-hero__media img'); const v = document.querySelector('.lx-scroll-hero__video');
    const bild = res.filter(x => /standbild|erstbild/.test(x.name)).map(x => x.name.split('/').pop().split('?')[0] + '@' + Math.round(x.startTime) + '-' + Math.round(x.responseEnd) + ':' + Math.round(x.transferSize / 1024) + 'KB');
    const vid = res.filter(x => /\.mp4/.test(x.name)).map(x => Math.round(x.startTime) + '-' + Math.round(x.responseEnd) + ':' + Math.round(x.transferSize / 1024) + 'KB');
    const l = window.__lcp.slice(-1)[0] || {};
    return { lcp: l.t, lcpEl: l.el, lcpUrl: l.url, cls: +window.__cls.toFixed(4), ...window.__ev, bild, vid, current: img && img.currentSrc.split('/').pop().split('?')[0], vSrc: v && (v.getAttribute('src') || '').split('/').pop().split('?')[0], vPaused: v && v.paused, load: Math.round(performance.getEntriesByType('navigation')[0].loadEventEnd) }; });
  ergebnisse[v].push(m); console.log(v, r + 1, JSON.stringify(m));
  await ctx.close();
}
const med = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
for (const v of varianten) { const e = ergebnisse[v]; console.log('MEDIAN', v, JSON.stringify({ lcp: med(e.map(x => x.lcp)), src: med(e.map(x => x.src)), playing: med(e.map(x => x.playing)), sichtbar: med(e.map(x => x.sichtbar)), cls: med(e.map(x => x.cls)), load: med(e.map(x => x.load)), n: e.length })); }
await browser.close();
