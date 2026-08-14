/* handy_kaufknopf_pruefen.mjs — misst LIVE auf dem Telefon (iPhone 390x844), ob der Kauf-Knopf
 * der Sticky-Kaufleiste wirklich antippbar ist, wo die eigene Suchleiste liegt und ob das
 * Footer-Menue gerendert wird. Gehoert zu automation/theme_reparatur_14_08.py — das Skript
 * repariert, dieses hier beweist.
 *
 * WARUM ES DIESES WERKZEUG BRAUCHT (14.08.2026): Die Reparatur vom 09.08. stand als CSS-Regel
 * im Theme und sah im Code aus wie erledigt. Sie war tot — der Cookie-Banner trug seine
 * Position als Inline-Style. Ein Blick in die Datei haette das nie gezeigt; nur
 * document.elementFromPoint() ueber dem Knopf zeigt es. Regel daraus: eine Handy-Reparatur
 * gilt erst als fertig, wenn ein Rasterpunkt-Test sagt, WAS an der Knopfstelle obenauf liegt.
 *
 * DREI FALLEN, die im Probelauf zu falschen Ergebnissen fuehrten — alle drei sind hier behoben:
 *   1. Zu wenig gescrollt: Bei scrollTo(0,1400) lag der Knopf bei y=884, also unterhalb des
 *      844-px-Bildschirms; elementFromPoint gab null zurueck und die Messung meldete
 *      "0/25 verdeckt" — es sah aus wie ein Erfolg und war ein Messfehler. Darum
 *      scrollTo(0,2200) + scrollBy(0,400) und erst dann messen.
 *   2. "Nicht der Banner" ist nicht "der Knopf": nach der Reparatur trafen alle 25 Punkte ein
 *      klassenloses DIV — das E-Mail-Popup #lx-pop (z-index 99998, inset:0), das 7 s nach dem
 *      Laden erscheint. Darum wird geprueft, ob die Treffer die KAUFLEISTE sind, und das Popup
 *      per NOPOP=1 stummgeschaltet, wenn man den Banner allein pruefen will.
 *   3. Der Cache-Buster "?nc=..." bringt NICHTS: Shopify streicht unbekannte Query-Parameter,
 *      die URL bleibt dieselbe und das Wiederholen haelt ausgerechnet den alten Eintrag warm.
 *      Darum wird die nackte URL geladen und "marker_neu" mitgemeldet — eine Messung auf altem
 *      HTML ist kein Ergebnis, sie muss verworfen und wiederholt werden.
 *
 * Die Cloud-Umgebung erreicht luxestyle.ch nicht direkt im Browser (ERR_CONNECTION_RESET);
 * wie in automation/site_shot.mjs holt curl ueber $HTTPS_PROXY jede Anfrage.
 *
 * Nutzung: [NOPOP=1] /opt/node22/bin/node automation/handy_kaufknopf_pruefen.mjs <url> [shot.png]
 *   NOPOP=1  E-Mail-Popup vorab stummschalten (localStorage), um den Banner allein zu messen.
 *
 * ABNAHME nach der Reparatur vom 14.08.2026, auf /products/premium-leder-geldborse-slim:
 *   verdeckt 0/25, alle Treffer KAUFLEISTE, Kette endet auf BUTTON.sticky-add-to-cart__button;
 *   beide Cookie-Knoepfe weiterhin erreichbar; Suchleiste display:none; 14 Footer-Links da.
 */
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
const bust = URL;
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
  out.marker_neu = document.documentElement.innerHTML.indexOf('lux-fix-20260814-suchleiste') > -1;
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
  out.footer_links_gesamt = Object.values(out.footer_links).reduce(function(a,b){return a+b;},0);
  return out;
});
console.log(JSON.stringify(r, null, 1));
if (SHOT) { await p.screenshot({ path: SHOT }); console.log('shot ->', SHOT); }
await b.close();
