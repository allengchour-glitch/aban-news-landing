// Nachbau: gespeichertes HTML (echt) wird als Dokument ausgeliefert, Assets kommen aus dem Netz.
// Optional wird der Testkopf (lokal gerendert) hinter dem Skript von lx-kopf-kompakt eingesetzt.
// Aufruf als Modul: const {seite} = require('./nachbau.cjs'); await seite(browser, {html, profil, einsatz, reduziert})
const { chromium } = require('playwright');
const fs = require('fs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const PROFIL = { d: [1440, 900], d1280: [1280, 800], d1100: [1100, 800], d1099: [1099, 800], d1024: [1024, 768], d1000: [1000, 800], d800: [800, 800], m664: [390, 664], m844: [390, 844] };
function einsetzen(html, einsatz) {
  if (!einsatz) return html;
  // Der Kopf steht im Abschnitt lux_hero: <style>…</style><div class="lx-kk…">…</div><script>…</script>
  const i = html.indexOf('<div class="lx-kk');
  if (i < 0) throw new Error('kein lx-kk im HTML');
  const s = html.indexOf('</script>', i);
  const vor = html.lastIndexOf('<style>', i);
  if (einsatz.vor) return html.slice(0, vor) + einsatz.vor + html.slice(vor, s + 9) + (einsatz.nach || '') + html.slice(s + 9);
  return html.slice(0, s + 9) + einsatz.nach + html.slice(s + 9);
}
const INIT = () => {
  window.__cls = 0; window.__shifts = []; window.__lcp = []; window.__err = [];
  addEventListener('error', (e) => window.__err.push(String(e.message || e)));
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; window.__cls += e.value; const qs = (e.sources || []).filter((s) => s.node && s.node.nodeType === 1 && s.node.closest); const imKopf = qs.length > 0 && qs.every((s) => s.node.closest('.lx-kk')); if (imKopf) window.__clsKopf = (window.__clsKopf || 0) + e.value; window.__shifts.push({ v: +e.value.toFixed(4), kopf: imKopf, t: Math.round(e.startTime), src: (e.sources || []).slice(0, 3).map((s) => (s.node && s.node.nodeType === 1 ? s.node.tagName + '.' + String(s.node.className).slice(0, 40) : '?')) }); } }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { const el = e.element; window.__lcp.push({ t: Math.round(e.startTime), size: e.size, url: (e.url || '').slice(-70), tag: el ? el.tagName : null, cls: el ? String(el.className).slice(0, 40) : null }); } }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
};
async function seite(browser, o) {
  const [w, h] = PROFIL[o.profil];
  const m = o.profil.startsWith('m');
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: m ? UAM : UA, isMobile: m, hasTouch: m, deviceScaleFactor: o.dpr || 1, locale: 'de-CH', javaScriptEnabled: o.javaScript !== false, reducedMotion: o.reduziert ? 'reduce' : 'no-preference', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const body = o.html != null ? einsetzen(fs.readFileSync(o.html, 'utf8'), o.einsatz) : null;
  const netz = { videoBytes: 0, video: [], poster: [], alle: 0 };
  await ctx.route('**/*', async (route) => {
    const q = route.request(); const u = q.url();
    if (q.resourceType() === 'document' && q.isNavigationRequest() && /luxestyle\.ch\//.test(u) && body != null) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
    if (body != null && /luxestyle\.ch/.test(u) && !/\/cdn\//.test(u)) return route.abort();
    if (/monorail|web-pixels|\/api\/collect|clarity\.ms|google-analytics|googletagmanager|facebook|tiktok|pinterest|klaviyo|shop\.app/.test(u)) return route.abort();
    return route.continue();
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => (o.fehler = o.fehler || []).push(String(e).slice(0, 200)));
  page.on('response', async (r) => { const u = r.url(); netz.alle++; if (/lx-(story|kb)-s\d\d-(quer|hoch)-(v1|960)\.mp4/.test(u)) { const l = Number(r.headers()['content-length'] || 0); netz.video.push([u.split('/').pop().split('?')[0], r.status(), l]); netz.videoBytes += l; } if (/lx-(story|kb)-s\d\d-(quer|hoch)-(v1|960)\.webp/.test(u)) netz.poster.push([u.split('/').pop().split('?')[0], r.status()]); });
  await page.addInitScript(INIT);
  if (o.vorLaden) await o.vorLaden(page);
  const url = o.url || 'https://luxestyle.ch/collections/' + (o.handle || 'schmuck');
  const resp = await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  return { ctx, page, netz, status: resp.status() };
}
const GEOM = () => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
  const k = document.querySelector('.lx-kk');
  const karte = document.querySelector('results-list li.product-grid__item');
  const img = karte ? [...karte.querySelectorAll('img')].find((i) => i.getBoundingClientRect().width > 0) : null;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const hdr = document.querySelector('header');
  return { fenster: innerWidth + 'x' + innerHeight, rem, ueberlauf: document.documentElement.scrollWidth - innerWidth,
    kk: r(k), text: r(k && k.querySelector('.lx-kk__text')), h1: r(k && k.querySelector('h1')), beschr: r(k && k.querySelector('.lx-kk__beschr')), anriss: r(k && k.querySelector('.lx-kk__anriss')), summary: r(k && k.querySelector('summary')),
    bilder: r(k && k.querySelector('.lx-kk__bilder')), nBilder: k ? k.querySelectorAll('.lx-kk__bilder img').length : 0,
    karte: r(karte), karteBild: r(img), headerPos: hdr ? getComputedStyle(hdr).position : null, headerStickyAttr: hdr ? (hdr.closest('[class*="sticky"],[data-sticky],header-component') || {}).tagName : null,
    cls: +window.__cls.toFixed(4), clsKopf: +(window.__clsKopf || 0).toFixed(4), shifts: window.__shifts.slice(0, 6), lcp: window.__lcp.slice(-1)[0] || null, err: window.__err.slice(0, 5) };
};
module.exports = { seite, GEOM, PROFIL, einsetzen, chromium };
if (require.main === module) {
  (async () => {
    const [html, profil, bild] = process.argv.slice(2);
    const b = await chromium.launch();
    const { page, ctx } = await seite(b, { html, profil });
    await page.waitForTimeout(2500);
    console.log(JSON.stringify(await page.evaluate(GEOM)));
    if (bild) await page.screenshot({ path: bild, type: 'jpeg', quality: 70 });
    await ctx.close(); await b.close();
  })();
}
