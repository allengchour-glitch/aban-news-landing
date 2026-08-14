/* measure.mjs — misst live auf dem Handy (390x844), ob der Kauf-Knopf der Sticky-Kaufleiste
 * antippbar ist, wo die Suchleiste liegt und ob das Footer-Menue gerendert wird.
 * Ruft die Seite ueber den Agent-Proxy (curl) ab wie automation/site_shot.mjs. */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2] || 'https://luxestyle.ch/products/edelstahl-uhr-herren-klassisch';
const SHOT = process.argv[3] || '';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url) {
  return new Promise((res) => {
    const f = '/tmp/_ms' + (seq++);
    execFile('curl', ['-sSL', '--max-time', '30', '-x', PROXY, '-o', f, '-w', '%{content_type}', url, '--compressed'],
      { maxBuffer: 1e8 }, (e, out) => {
        if (e) { try { fs.unlinkSync(f) } catch {}; return res(null); }
        try { const body = fs.readFileSync(f); fs.unlinkSync(f); res({ ct: (out || '').trim() || 'text/html', body }); } catch { res(null); }
      });
  });
}
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME) ? CHROME : undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await ctx.route('**/*', async (route) => {
  const u = route.request().url();
  if (!/^https?:/.test(u)) return route.continue();
  const r = await curlGet(u);
  if (!r) return route.abort();
  try { await route.fulfill({ status: 200, contentType: r.ct, body: r.body }); } catch { try { route.abort() } catch {} }
});
if (process.env.NOPOP === '1') { await ctx.addInitScript(() => { try { localStorage.setItem('lx_popup_v1', 'dismissed'); } catch (e) {} }); }
const p = await ctx.newPage();
const bust = URL + (URL.includes('?') ? '&' : '?') + 'nc=' + Math.floor(Date.now() / 1000);
try { await p.goto(bust, { waitUntil: 'domcontentloaded', timeout: 90000 }); } catch (e) { console.log('nav:', e.message); }
await p.waitForTimeout(4000);
await p.evaluate(() => window.scrollTo(0, 2200));
await p.waitForTimeout(2000);
await p.evaluate(() => window.scrollBy(0, 400));
await p.waitForTimeout(4000); // Banner erscheint nach 800 ms

const r = await p.evaluate(() => {
  const out = {};
  const q = (s) => document.querySelector(s);
  const rect = (e) => e ? (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(e.getBoundingClientRect()) : null;
  const banner = q('#lx-cookie-banner');
  out.body_class = document.body.className;
  out.marker_neu = document.documentElement.innerHTML.indexOf('lux-fix-20260814-kaufknopf') > -1;
  out.banner_inline = banner ? banner.getAttribute('style').slice(0,90) : null;
  out.bar_h_jetzt = (function(){var b=document.querySelector('.sticky-add-to-cart__bar');return b?b.getBoundingClientRect().height:'kein bar';})();
  out.banner = banner ? { rect: rect(banner), display: getComputedStyle(banner).display, bottom: getComputedStyle(banner).bottom, z: getComputedStyle(banner).zIndex } : null;
  const bar = q('.sticky-add-to-cart__bar');
  out.bar = bar ? { rect: rect(bar), z: getComputedStyle(bar).zIndex } : null;
  let btn = null;
  if (bar) btn = bar.querySelector('button[type=submit], .add-to-cart-button, [class*="add-to-cart"] button, button');
  out.btn = btn ? { rect: rect(btn), text: (btn.innerText || '').trim().slice(0, 40) } : null;
  if (btn) {
    const b0 = btn.getBoundingClientRect();
    let hit = 0, tot = 0; const who = {};
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const x = b0.left + b0.width * (i + 0.5) / 5, y = b0.top + b0.height * (j + 0.5) / 5;
      const el = document.elementFromPoint(x, y);
      tot++;
      const top = el ? (el.closest('#lx-cookie-banner') ? '#lx-cookie-banner' : (el.closest('.sticky-add-to-cart__bar') ? 'KAUFLEISTE' : (el.tagName + '.' + (el.className || '').toString().slice(0, 30)))) : 'null';
      who[top] = (who[top] || 0) + 1;
      if (top === '#lx-cookie-banner') hit++;
    }
    out.verdeckt = hit + '/' + tot;
    out.treffer = who;
    var mid = document.elementFromPoint(b0.left + b0.width/2, b0.top + b0.height/2);
    var chain = []; var e = mid;
    while (e && chain.length < 6) { chain.push(e.tagName + (e.id ? '#'+e.id : '') + (e.className ? '.'+String(e.className).slice(0,40) : '')); e = e.parentElement; }
    out.knopf_mitte_kette = chain;
    out.knopf_mitte_ist_knopf = !!(mid && (mid === btn || btn.contains(mid) || (mid.closest && mid.closest('.sticky-add-to-cart__bar'))));
    out.knopf_mitte_html = mid ? mid.outerHTML.slice(0,140) : null;
  }
  // Sind die Banner-Knoepfe selbst noch antippbar?
  const btns = banner ? [...banner.querySelectorAll('button')] : [];
  out.banner_knoepfe = btns.map((x) => {
    const r0 = x.getBoundingClientRect();
    const el = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2);
    return { text: x.textContent.trim().slice(0, 20), erreichbar: !!(el && banner.contains(el)) };
  });
  const pop = q('#lx-pop');
  out.emailpopup = pop ? { display: getComputedStyle(pop).display, z: getComputedStyle(pop).zIndex, rect: rect(pop) } : null;
  const sb = q('#luxsb-wrap');
  out.suchleiste = sb ? { rect: rect(sb), display: getComputedStyle(sb).display } : null;
  const links = ['/pages/impressum', '/pages/agb', '/pages/faq', '/pages/widerruf', '/pages/versand-lieferung', '/pages/tracking', '/pages/rueckgabe', '/pages/garantie', '/pages/kontakt-support', '/pages/ueber-uns', '/blogs/magazin', '/pages/datenschutz', '/pages/cookie-richtlinie', '/pages/data-sharing-opt-out'];
  out.footer_links = {};
  for (const l of links) out.footer_links[l] = document.querySelectorAll('a[href*="' + l + '"]').length;
  const main = q('main#MainContent');
  out.main_rect = rect(main);
  out.main_template = main ? main.dataset.template : null;
  return out;
});
console.log(JSON.stringify(r, null, 1));
if (SHOT) { await p.screenshot({ path: SHOT }); console.log('shot ->', SHOT); }
await b.close();
