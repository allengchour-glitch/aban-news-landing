import { startArgumente, PLAYWRIGHT } from '/home/user/aban-news-landing/tools/browser.mjs';
const { chromium, devices } = await import(PLAYWRIGHT);
const [url, profil, runs] = [process.argv[2], process.argv[3] || 'langsam', +(process.argv[4] || 2)];
const NET = { langsam: { d: 1.6e6, u: 750e3, rtt: 150, cpu: 4 }, '4g': { d: 9e6, u: 1.5e6, rtt: 60, cpu: 4 }, schnell: { d: 50e6, u: 10e6, rtt: 20, cpu: 2 } }[profil];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: startArgumente() });
for (let r = 0; r < runs; r++) {
  const ctx = await browser.newContext({ ...devices['Pixel 5'], locale: 'de-CH' });
  const p = await ctx.newPage();
  const c = await ctx.newCDPSession(p);
  await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: NET.rtt, downloadThroughput: NET.d / 8, uploadThroughput: NET.u / 8 });
  await c.send('Emulation.setCPUThrottlingRate', { rate: NET.cpu });
  await p.addInitScript(() => {
    window.__lcp = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), el: e.element ? e.element.tagName + '.' + (e.element.className || '').toString().slice(0, 40) : null, url: (e.url || '').split('/').pop().slice(0, 70), size: e.size }); }).observe({ type: 'largest-contentful-paint', buffered: true });
    window.__vid = null; window.__src=null; window.__can=null; new MutationObserver(ms=>{for(const m of ms){if(m.target.tagName==='VIDEO'&&m.attributeName==='src'&&!window.__src) window.__src=Math.round(performance.now());}}).observe(document,{subtree:true,attributes:true,attributeFilter:['src']}); document.addEventListener('canplay', e => { if (!window.__can && e.target.tagName === 'VIDEO') window.__can = Math.round(performance.now()); }, true); window.__def=null; customElements.whenDefined('luxe-scroll-hero').then(()=>window.__def=Math.round(performance.now())); document.addEventListener('playing', e => { if (!window.__vid && e.target.tagName === 'VIDEO') window.__vid = Math.round(performance.now()); }, true);
  });
  await p.goto(url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now() + r, { waitUntil: 'load', timeout: 180000 });
  await p.waitForTimeout(5000);
  const m = await p.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const hero = res.filter(x => /standbild|hero/i.test(x.name)).map(x => ({ n: x.name.split('/').pop().slice(0, 80), start: Math.round(x.startTime), ende: Math.round(x.responseEnd), kb: Math.round(x.transferSize / 1024), typ: x.initiatorType }));
    const img = document.querySelector('.lx-scroll-hero img, [class*="campaign"] img');
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const vorHero = res.filter(x => x.startTime < (hero[0]?.start ?? 1e9)).length;
    const kbVor = Math.round(res.filter(x => x.responseEnd < (hero[0]?.ende ?? 1e9)).reduce((a, x) => a + x.transferSize, 0) / 1024);
    return { docEnde: Math.round(nav.responseEnd), docKB: Math.round(nav.transferSize / 1024), fcp: fcp && Math.round(fcp.startTime), lcp: window.__lcp.slice(-1)[0], lcpAlle: window.__lcp.map(x => x.t + ':' + x.el), heroAbrufe: hero, currentSrc: img && (img.currentSrc || '').split('?')[1], heroBox: img && [Math.round(img.getBoundingClientRect().width), Math.round(img.getBoundingClientRect().height)], dcl: Math.round(nav.domContentLoadedEventEnd), heroDefiniert: window.__def, videoSrcGesetzt: window.__src, videoCanplay: window.__can, videoPlaying: window.__vid, abrufeVorHero: vorHero, kbFertigVorHeroEnde: kbVor, load: Math.round(nav.loadEventEnd) };
  });
  console.log(profil, 'lauf', r + 1, JSON.stringify(m));
  await ctx.close();
}
await browser.close();
