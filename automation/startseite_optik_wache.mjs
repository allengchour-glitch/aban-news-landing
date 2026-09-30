/**
 * startseite_optik_wache.mjs — die Startseite so ansehen, wie eine Kundin sie auf dem Handy sieht (30.09.2026).
 *
 * ANLASS: Betreiber-Screenshot 30.09. «bild fehlt» — die Kundenstimmen-Sektion (Judge.me-Karussell) zeigte über
 * den Sternen ~110 px leere Fläche (48 px Innenabstand + 24 px Rand + ein 124 px hoher Textblock mit 47 px Text) und
 * das Produktbild nur 56 px klein am Kartenende. Kein Wächter hat das gesehen: alle prüfen Daten (API), keiner die
 * GERENDERTE Seite. Betreiber: «solche und ähnliche Fehler nicht mehr passieren».
 *
 * WAS GEPRÜFT WIRD (390×844, echter Chromium über tools/browser.mjs, langsames Scrollen für Lazy-Load):
 *   LUECKE   senkrechter Leerraum > LUECKE_PX (Standard 90) INNERHALB einer Sektion (zwischen sichtbarem Text/Bild)
 *   BILD_KAPUTT  <img> sichtbar, geladen, aber naturalWidth 0 (404/defekt)
 *   BILD_LEER    <img> sichtbar mit data-src, aber ohne src nach dem Scrollen (Lazy-Load nie ausgelöst)
 *   BILD_WINZIG  Produkt-/Bewertungsbild sichtbar < 64 px breit (Karten, Karussells)
 *   BREITE       Seite breiter als das Fenster (waagrechtes Scrollen, Lehre 15.09. Kundenstimmen 1488 px)
 * Kanarienvogel (--selbsttest): dieselbe Seite mit eingespritztem Fehler-CSS (Lücke 200 px, Bild 40 px, 1600 px
 * breiter Block) MUSS 3 Befunde liefern, die unveränderte darf keinen neuen der drei haben.
 * ⚠️ Unsere IP bekommt teils eine alte Cache-Kopie (Lehre 19.08.) — ein Befund wird darum vor dem Melden mit
 * einem zweiten Abruf (?lx_optik=<zeit>) bestätigt.
 *
 *   /opt/node22/bin/node automation/startseite_optik_wache.mjs [url]        → Bericht dropship/STARTSEITE-OPTIK.md
 *   /opt/node22/bin/node automation/startseite_optik_wache.mjs --selbsttest
 */
import fs from 'fs';
import { starte } from '../tools/browser.mjs';

const LUECKE_PX = +(process.env.LUECKE_PX || 90);
const WINZIG_PX = +(process.env.WINZIG_PX || 64);
const BERICHT = new URL('../dropship/STARTSEITE-OPTIK.md', import.meta.url).pathname;
const STAND = new URL('../dropship/_startseite_optik.json', import.meta.url).pathname;

async function pruefe(browser, url, fehlerCss = '') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  // Popups/Cookie-Banner verdecken sonst Inhalt (ausblenden, nie klicken)
  await p.addStyleTag({ content: '[id*=popup],[class*=popup],[class*=cookie],[id*=cookie],.klaviyo-form{display:none!important}' + fehlerCss });
  const hoehe = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hoehe; y += 600) { await p.evaluate(yy => window.scrollTo(0, yy), y); await p.waitForTimeout(250); }
  await p.waitForTimeout(1500);
  const befunde = await p.evaluate(({ LUECKE_PX, WINZIG_PX }) => {
    const out = [];
    const sichtbar = e => { const s = getComputedStyle(e); const r = e.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && r.width > 2 && r.height > 2; };
    const docW = document.documentElement.scrollWidth, winW = window.innerWidth;
    if (docW > winW + 2) out.push({ art: 'BREITE', wo: 'Seite', wert: `${docW}px bei ${winW}px Fenster` });
    const sektionen = [...document.querySelectorAll('main .shopify-section, main > section, #MainContent > .shopify-section')];
    for (const sek of sektionen) {
      if (!sichtbar(sek)) continue;
      const name = (sek.id || '').replace('shopify-section-template--', '').slice(0, 60) || sek.className.slice(0, 40);
      const sr = sek.getBoundingClientRect(), top0 = sr.top + scrollY;
      // Inhaltsbänder: sichtbare Textknoten und Bilder
      const baender = [];
      const walker = document.createTreeWalker(sek, NodeFilter.SHOW_TEXT);
      let n; while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || !sichtbar(el)) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const r of rg.getClientRects()) if (r.width > 1 && r.height > 1) baender.push([r.top + scrollY, r.bottom + scrollY]);
      }
      for (const img of sek.querySelectorAll('img, svg, video, picture, iframe')) if (sichtbar(img)) { const r = img.getBoundingClientRect(); baender.push([r.top + scrollY, r.bottom + scrollY]); }
      baender.sort((a, b) => a[0] - b[0]);
      let ende = null, groess = 0, bei = 0;
      for (const [a, b] of baender) { if (ende !== null && a - ende > groess) { groess = a - ende; bei = ende; } ende = ende === null ? b : Math.max(ende, b); }
      if (groess > LUECKE_PX) out.push({ art: 'LUECKE', wo: name, wert: `${Math.round(groess)}px Leerraum ab y=${Math.round(bei - top0)} der Sektion` });
      for (const img of sek.querySelectorAll('img')) {
        if (!sichtbar(img)) continue; const r = img.getBoundingClientRect();
        const kurz = (img.getAttribute('alt') || img.currentSrc || img.src || '').slice(0, 50);
        if (!img.getAttribute('src') && (img.dataset.src || img.getAttribute('data-srcset'))) out.push({ art: 'BILD_LEER', wo: name, wert: kurz });
        else if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) out.push({ art: 'BILD_KAPUTT', wo: name, wert: kurz });
        else if (r.width < WINZIG_PX && img.closest('[class*=card],[class*=product],[class*=carousel],[class*=review],[class*=jdgm]'))
          out.push({ art: 'BILD_WINZIG', wo: name, wert: `${Math.round(r.width)}px · ${kurz}` });
      }
    }
    return out;
  }, { LUECKE_PX, WINZIG_PX });
  await ctx.close();
  // gleiche Art+Ort nur einmal
  const seen = new Set(); return befunde.filter(b => { const k = b.art + b.wo + b.wert; if (seen.has(k)) return false; seen.add(k); return true; });
}

// html body … = höhere Spezifität als die Live-Korrektur (lx-ks-fix), sonst gewinnt sie (gemessen 30.09.)
const FEHLER_CSS = `html body .lx-kundenstimmen .jdgm-carousel{margin-top:220px!important}
html body .lx-kundenstimmen .jdgm-carousel-item__product-image{width:40px!important;height:40px!important}
body::after{content:"";display:block;width:1600px;height:10px}`;

async function main() {
  const url = process.argv.find(a => a.startsWith('http')) || 'https://luxestyle.ch/';
  const browser = await starte();
  try {
    console.log(`START ${new Date().toISOString().slice(0, 16)}Z: Startseiten-Optik ${url}`);
    if (process.argv.includes('--selbsttest')) {
      const echt = await pruefe(browser, url);
      const kaputt = await pruefe(browser, url, FEHLER_CSS);
      const art = l => new Set(l.map(b => b.art));
      const neu = kaputt.filter(b => !echt.some(e => e.art === b.art && e.wo === b.wo && e.wert === b.wert));
      const ok = ['LUECKE', 'BILD_WINZIG', 'BREITE'].every(a => neu.some(b => b.art === a));
      console.log(`Kanarienvogel: ${ok ? '✅' : '❌'} neue Befunde mit Fehler-CSS: ${[...art(neu)].join(', ') || 'keine'} (${neu.length})`);
      for (const b of neu) console.log('  +', b.art, b.wo, b.wert);
      console.log(`Unverändert: ${echt.length} Befunde`); for (const b of echt) console.log('  ·', b.art, b.wo, b.wert);
      process.exitCode = ok ? 0 : 1; return;
    }
    let bef = await pruefe(browser, url);
    if (bef.length) {  // zweiter Abruf gegen Cache-Kopien
      const zwei = await pruefe(browser, url + (url.includes('?') ? '&' : '?') + 'lx_optik=' + Date.now());
      bef = bef.filter(b => zwei.some(z => z.art === b.art && z.wo === b.wo));
    }
    const zeit = new Date().toISOString().slice(0, 16) + 'Z';
    fs.writeFileSync(STAND, JSON.stringify({ stand: zeit, url, befunde: bef }, null, 1));
    fs.writeFileSync(BERICHT, `# Startseiten-Optik (Handy 390 px) — Stand ${zeit}\n\n` +
      `Prüft die GERENDERTE Seite: Leerräume > ${LUECKE_PX} px in einer Sektion, kaputte/leere/winzige Bilder (< ${WINZIG_PX} px), ` +
      `waagrechtes Scrollen. Befunde doppelt abgerufen (Cache-Kopien).\n\n` +
      (bef.length ? bef.map(b => `- **${b.art}** · ${b.wo} · ${b.wert}`).join('\n') : '✅ keine Befunde') + '\n');
    console.log(`FERTIG: ${bef.length} Befunde`); for (const b of bef) console.log('  ', b.art, b.wo, b.wert);
  } finally { await browser.close(); }
}
main().catch(e => { console.error('FEHLER', e.message); process.exit(2); });
