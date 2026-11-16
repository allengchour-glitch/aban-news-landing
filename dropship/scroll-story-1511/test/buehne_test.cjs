// Browsertest der Scroll-Geschichte im Nachbau (echte Startseite + lokal gerenderter Abschnitt). Kein Storefront-Seitenaufruf.
// Aufruf: node test/buehne_test.cjs [theme-ordner]   Exit 0 = alles bestanden.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const BASIS = path.join(__dirname, '..');
const THEME = process.argv[2] || path.join(BASIS, 'theme');
const { einrichten, kontext, START } = require(path.join(BASIS, 'harness', 'nachbau.cjs'));
const KAP = JSON.parse(fs.readFileSync(path.join(BASIS, 'kapitel.json'), 'utf8'));
const WORTE = KAP.map((k) => k.wort);
let ok = 0, fehl = 0;
function pruef(bed, name, info) { if (bed) { ok++; } else { fehl++; console.log('FEHLER:', name, info === undefined ? '' : JSON.stringify(info)); } }
function render(fall) { return execFileSync(process.execPath, [path.join(BASIS, 'harness', 'render.mjs'), THEME, '-', fall], { encoding: 'utf8' }); }

async function laden(b, form, opt = {}) {
  const ctx = await kontext(b, form, opt.ctx || {});
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => { const s = String(e); if (!/Failed to fetch|NetworkError|Load failed/.test(s)) fehler.push(s.slice(0, 160)); });
  if (opt.init) await page.addInitScript(opt.init);
  // Platzhalter beobachten: wird er gesetzt, und zwar direkt hinter dem Hero, bevor die Geschichte ihn ersetzt?
  await page.addInitScript(() => { window.__lxPlatz = []; new MutationObserver((l) => { for (const m of l) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList && n.classList.contains('lx-story-platzhalter')) window.__lxPlatz.push({ nachHero: !!(n.previousElementSibling && n.previousElementSibling.classList.contains('lx-hero')), hoehe: n.style.height, story: !!document.querySelector('[data-lx-story-platz]') }); }).observe(document, { childList: true, subtree: true }); });
  const stat = await einrichten(page, opt.html || render(opt.fall || 'normal'), Object.assign({ theme: THEME }, opt.nachbau || {}));
  await page.goto(START, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const bn = [...document.querySelectorAll('#lx-cookie-banner button')].find((x) => /notwendig/i.test(x.textContent)); if (bn) bn.click(); });
  // Newsletter-Fenster und Hilfe-Knopf des Themes legen sich nach einigen Sekunden über alles (Theme-Verhalten, nicht Teil der Geschichte): im Test aus.
  await page.addStyleTag({ content: '#lx-pop{display:none!important}' });
  return { ctx, page, stat, fehler };
}
async function scrollZu(page, y) {
  const von = await page.evaluate(() => scrollY);
  for (let j = 1; j <= 6; j++) { await page.evaluate((yy) => window.scrollTo(0, yy), von + ((y - von) * j) / 6); await page.waitForTimeout(40); }
  await page.waitForTimeout(400);
}
async function kapitelMitte(page, i) {
  return page.evaluate((i) => { const k = document.querySelectorAll('.lx-story__kapitel')[i]; const r = k.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; }, i);
}

// Text und Karte eines Kapitels dürfen sich nie überdecken, solange der Text sichtbar ist (Deckkraft >= 0,5).
async function ueberdeckung(page, kapitelListe, schritte = 15) {
  const vh = page.viewportSize().height; const funde = []; let gezaehlt = 0;
  for (const j of kapitelListe) {
    const mitte = await kapitelMitte(page, j);
    for (let q = 0; q <= schritte; q++) {
      const y = mitte - 0.75 * vh + (1.5 * vh * q) / schritte;
      await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const r = await page.evaluate((j) => { const k = document.querySelectorAll('.lx-story__kapitel')[j]; const o = +getComputedStyle(k.querySelector('.lx-story__text')).opacity; const ka = k.querySelector('.lx-story__karte').getBoundingClientRect(); const ue = (a) => { const x = Math.max(0, Math.min(a.right, ka.right) - Math.max(a.left, ka.left)); const y = Math.max(0, Math.min(a.bottom, ka.bottom) - Math.max(a.top, ka.top)); return x * y > 0 ? Math.round(y) : 0; }; return { o, wort: ue(k.querySelector('.lx-story__wort').getBoundingClientRect()), zeile: ue(k.querySelector('.lx-story__zeile').getBoundingClientRect()) }; }, j);
      if (r.o >= 0.5) { gezaehlt++; if (r.wort || r.zeile) funde.push({ j, q, ...r }); }
    }
  }
  return { gezaehlt, funde };
}
// Pause-Knopf ist an jeder Position mit klebender Bühne der oberste Treffer in seiner Mitte.
async function pauseErreichbar(page, schritt = 0.25) {
  await page.addStyleTag({ content: '#lx-pop{display:none!important}' });   // Hilfe-Knopf des Themes bleibt bewusst sichtbar
  const vh = page.viewportSize().height;
  const { oben, unten } = await page.evaluate(() => { const r = document.querySelector('[data-lx-story]').getBoundingClientRect(); return { oben: r.top + scrollY, unten: r.bottom + scrollY }; });
  let gezaehlt = 0; const funde = [];
  for (let y = oben; y <= unten - vh; y += vh * schritt) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const r = await page.evaluate(() => { const p = document.querySelector('.lx-story__pause'); const b = p.getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { ok: !!t && (t === p || p.contains(t)), was: t ? t.className && String(t.className).slice(0, 40) : null, ende: document.querySelector('[data-lx-story]').hasAttribute('data-ende') }; });
    gezaehlt++; if (!r.ok) funde.push({ y: Math.round(y - oben), was: r.was });
  }
  return { gezaehlt, funde };
}

async function steuerUeberKapiteln(page, art) {
  // Zwei Schutzschichten einzeln prüfen: 'stapel' zwingt die Kapitel zum Treffen (prüft z-index der Steuerleiste),
  // 'durchlass' legt die Steuerleiste unter die Kapitel (prüft pointer-events:none der Kapitel)
  const css = art === 'stapel' ? '.lx-story .lx-story__kapitel,.lx-story .lx-story__kapitel *{pointer-events:auto!important}' : '.lx-story .lx-story__steuer{z-index:0!important}';
  const tag = await page.addStyleTag({ content: css });
  const funde = []; let gezaehlt = 0;
  for (const i of [1, 2, 3, 4]) {
    await scrollZu(page, await kapitelMitte(page, i));
    const r = await page.evaluate(() => {
      const s = document.querySelector('.lx-story__steuer');
      const ziele = [document.querySelector('.lx-story__pause'), ...document.querySelectorAll('.lx-story__punkte a')];
      return ziele.map((z) => { const b = z.getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { ok: !!t && s.contains(t), was: t ? String(t.className).slice(0, 40) : null }; });
    });
    for (const x of r) { gezaehlt++; if (!x.ok) funde.push({ i, was: x.was }); }
  }
  await tag.evaluate((e) => e.remove());
  return { gezaehlt, funde };
}

(async () => {
  const b = await chromium.launch();
  try {
    for (const form of ['desktop', 'handy']) {
      const fmt = form === 'desktop' ? 'quer' : 'hoch';
      const { ctx, page, stat, fehler } = await laden(b, form);
      // T1 Reihenfolge
      const r1 = await page.evaluate(() => ({ worte: [...document.querySelectorAll('.lx-story__wort')].map((x) => x.textContent.trim()), punkte: [...document.querySelectorAll('.lx-story__punkte a')].map((a) => a.getAttribute('href').split('-k').pop()), ebenen: [...document.querySelectorAll('.lx-story__ebene')].map((e) => e.dataset.i), nr: [...document.querySelectorAll('.lx-story__nr')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()) }));
      pruef(JSON.stringify(r1.worte) === JSON.stringify(WORTE), form + ' T1 Kapitelworte in Reihenfolge', r1.worte);
      pruef(r1.punkte.join(',') === '0,1,2,3,4,5' && r1.ebenen.join(',') === '0,1,2,3,4,5', form + ' T1 Punkte und Ebenen in Reihenfolge', r1);
      pruef(r1.nr[0] === '01 / 06' && r1.nr[5] === '06 / 06', form + ' T1 Nummern', r1.nr);
      // T2 Platz direkt nach dem Hero
      const r2 = await page.evaluate(() => { const h = document.querySelector('.lx-hero'); const n = h && h.nextElementSibling; return !!(n && n.querySelector('[data-lx-story]')); });
      pruef(r2, form + ' T2 direkt nach dem Hero');
      const r2b = await page.evaluate(() => ({ ph: document.querySelectorAll('.lx-story-platzhalter').length, sicht: getComputedStyle(document.querySelector('[data-lx-story]').closest('.shopify-section')).display, kopf: parseFloat(getComputedStyle(document.querySelector('[data-lx-story]')).getPropertyValue('--lx-oben')) }));
      pruef(r2b.ph === 0 && r2b.sicht === 'block', form + ' T2 Platzhalter ersetzt, Abschnitt sichtbar', r2b);
      const r2d = await page.evaluate(() => window.__lxPlatz);
      pruef(r2d.length === 1 && r2d[0].nachHero && !r2d[0].story && (form === 'desktop' ? /^calc\(790s?vh\)$/ : /^calc\(735s?vh\)$/).test(r2d[0].hoehe), form + ' T2 Platzhalter direkt hinter dem Hero gesetzt, bevor die Geschichte kommt', r2d);
      pruef(Math.abs(r2b.kopf - (form === 'desktop' ? 88 : 59)) <= 2, form + ' T2 Bühne beginnt unter der Kopfzeile', r2b.kopf);
      // T3 vor dem ersten Scrollen: nur Poster Kapitel 1, keine Video-Bytes
      const r3 = await page.evaluate(() => ({ y: scrollY, src: [...document.querySelectorAll('.lx-story__video')].filter((v) => v.getAttribute('src')).length, imgs: [...document.querySelectorAll('.lx-story__buehne img')].filter((i) => i.getAttribute('src')).length }));
      pruef(r3.y === 0 && stat.videoAnfragen.length === 0 && stat.videoBytes === 0 && r3.src === 0, form + ' T3 keine Video-Bytes vor dem Scrollen', { anfragen: stat.videoAnfragen.length, bytes: stat.videoBytes, src: r3.src });
      pruef(stat.posterAnfragen.length === 1 && stat.posterAnfragen[0] === `lx-story-s01-${fmt}-v1.webp` && r3.imgs === 1, form + ' T3 nur ein Poster (Kapitel 1, richtiges Format)', stat.posterAnfragen);
      const stil = await page.evaluate(() => { const k = document.querySelector('head style[data-lx-kompiliert]'); return { kopf: !!(k && /\.lx-story \.lx-story__buehne\{/.test(k.textContent) && /\.lx-story-platzhalter\{/.test(k.textContent)), body: document.querySelectorAll('body style').length ? [...document.querySelectorAll('body style')].filter((x) => /lx-story/.test(x.textContent)).length : 0, link: !!document.querySelector('link[href*="lx-story.css"]') }; });
      pruef(stat.storyDateien.includes('lx-story.js') && !stat.storyDateien.includes('lx-story.css') && stil.kopf && stil.body === 0 && !stil.link, form + ' T3 Skript geladen, Stil im Kopf (kein Stil der Geschichte im body)', { d: stat.storyDateien, stil });
      // T4 Kapitel folgen der Scrollposition, Video spielt
      for (let i = 0; i < 6; i++) {
        await scrollZu(page, await kapitelMitte(page, i));
        await page.waitForTimeout(900);
        const r = await page.evaluate(() => { const s = document.querySelector('[data-lx-story]'); return { k: s.getAttribute('data-kapitel'), aktiv: [...s.querySelectorAll('.lx-story__ebene[data-aktiv]')].map((e) => e.dataset.i), spielt: [...s.querySelectorAll('.lx-story__ebene[data-aktiv] video')].map((v) => !v.paused && v.hasAttribute('data-spielt')), andereSpielen: [...s.querySelectorAll('.lx-story__ebene:not([data-aktiv]) video')].filter((v) => !v.paused).length, current: [...s.querySelectorAll('.lx-story__punkte a[aria-current]')].map((a) => a.dataset.i) }; });
        pruef(r.k === String(i) && r.aktiv.join() === String(i) && r.current.join() === String(i), `${form} T4 Kapitel ${i + 1} aktiv`, r);
        pruef(r.spielt[0] === true && r.andereSpielen === 0, `${form} T4 Video Kapitel ${i + 1} spielt allein`, r);
      }
      const r24 = await page.evaluate(() => [...document.querySelectorAll('.lx-story__video')].map((v, i) => v.getAttribute('src') ? i : -1).filter((i) => i >= 0));
      pruef(r24.length <= 2 && r24.every((i) => i >= 4), form + ' T24 entfernte Videos freigegeben (höchstens aktives und Nachbar)', r24);
      const vids = stat.videoAnfragen.map((v) => v.datei);
      pruef(vids.every((d) => d.includes(`-${fmt}-`)) && new Set(vids).size === 6, form + ' T4 sechs Videos im richtigen Format', vids);
      // T20 Vorhang: Kapitelmitte zeigt genau eine Ebene; zwischen zwei Kapiteln schiebt sich die nächste von unten herein
      {
        const vh0 = page.viewportSize().height;
        await scrollZu(page, await kapitelMitte(page, 2)); await page.waitForTimeout(200);
        const sicht = () => page.evaluate(() => [...document.querySelectorAll('.lx-story__ebene')].map((e, i) => e.style.visibility === 'visible' ? i : -1).filter((i) => i >= 0));
        const s1 = await sicht();
        const yz = await page.evaluate((vh) => document.querySelectorAll('.lx-story__kapitel')[3].getBoundingClientRect().top + scrollY - 0.61 * vh, vh0);
        await scrollZu(page, yz); await page.waitForTimeout(200);
        const s2 = await sicht();
        const off = await page.evaluate(() => +((document.querySelectorAll('.lx-story__ebene')[3].style.transform.match(/translate3d\(0(?:px)?,\s*(-?[0-9.]+)%/) || [0, -1])[1]));
        pruef(s1.join() === '2' && s2.join() === '2,3' && off > 20 && off < 80, form + ' T20 Vorhang: nächstes Kapitel schiebt sich gebunden ans Scrollen herein', { s1, s2, off });
      }
      // T23 Sprung per Punkt 1 -> 6 lädt keine Zwischenvideos
      {
        await scrollZu(page, await kapitelMitte(page, 0)); await page.waitForTimeout(1500);
        const vor = stat.videoAnfragen.length;
        const pos = await page.evaluate(() => { const a = document.querySelector('.lx-story__punkte a[data-i="5"]'); const r = a.getBoundingClientRect(); return { x: r.right - 8, y: r.top + r.height / 2 }; });
        await page.mouse.click(pos.x, pos.y);
        // Das Theme scrollt weich (html{scroll-behavior:smooth}); unter Last dauert der Sprung länger: auf Ankunft warten (bis 8 s), dann auf das Video (bis 3 s)
        let k = null;
        for (let w = 0; w < 40 && k !== '5'; w++) { await page.waitForTimeout(200); k = await page.evaluate(() => document.querySelector('[data-lx-story]').getAttribute('data-kapitel')); }
        for (let w = 0; w < 15 && stat.videoAnfragen.length === vor; w++) await page.waitForTimeout(200);
        await page.waitForTimeout(600);
        const neu = stat.videoAnfragen.slice(vor).map((v) => v.datei.replace(/-(quer|hoch)-v1\.mp4$/, ''));
        pruef(k === '5' && neu.length >= 1 && neu.every((d) => d === 'lx-story-' + KAP[5].id.toLowerCase()), form + ' T23 Punkt-Sprung 1 nach 6 lädt nur das Zielvideo', { k, neu });
      }
      // T5 Hintergrund bewegt sich mit der Scrollposition; T6 Parallaxe
      const y0 = await kapitelMitte(page, 2);
      const vh = page.viewportSize().height;
      const m = async (j) => page.evaluate((j) => { const e = document.querySelectorAll('.lx-story__ebene')[j]; const k = document.querySelectorAll('.lx-story__kapitel')[j]; const tr = e.querySelector('video').style.transform; const z = +(tr.match(/scale\(([0-9.]+)\)/) || [0, 0])[1]; const x = +(tr.match(/scale\([0-9.]+\) translate3d\((-?[0-9.]+)%/) || [0, 0])[1]; return { z, x, tr, text: k.querySelector('.lx-story__text').getBoundingClientRect().top, karte: k.querySelector('.lx-story__karte').getBoundingClientRect().top }; }, j);
      await scrollZu(page, y0 - vh * 0.2); const a = await m(2);
      await scrollZu(page, y0 + vh * 0.2); const c = await m(2);
      pruef(a.z - c.z > 0.03 && a.x !== c.x, form + ' T5 Hintergrund zoomt deutlich und schwenkt mit dem Scrollen', { a: a.z, c: c.z, ax: a.x, cx: c.x });
      const y1 = await kapitelMitte(page, 1);
      await scrollZu(page, y1 - vh * 0.2); const b1 = await m(1);
      pruef(Math.sign(b1.x) !== 0 && Math.sign(b1.x) !== Math.sign(a.x), form + ' T5 Schwenk wechselt die Richtung je Kapitel', { k2: a.x, k1: b1.x });
      const dText = a.text - c.text, dKarte = a.karte - c.karte, dScroll = vh * 0.4;
      pruef(dText > 0.5 * dScroll && dText < 0.9 * dScroll && Math.abs(dKarte - dText) < 2, form + ' T6 Text und Karte gemeinsam langsamer als Scroll (Parallaxe)', { dText, dKarte, dScroll });
      // T8 Kaufkarten verlinken die eingestellte Ausführung
      const hrefs = await page.evaluate(() => [...document.querySelectorAll('.lx-story__karte')].map((a) => a.getAttribute('href')));
      pruef(hrefs.length === 6 && hrefs.every((h, i) => h === `/products/${KAP[i].produkt}?variant=${KAP[i].variante}`), form + ' T8 Karten verlinken die Ausführung', hrefs);
      // T9 Tastatur erreicht jede Kaufkarte, Fokus liegt im Bild
      await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); const s = document.querySelector('.lx-story__skip'); s.focus(); });
      const erreicht = []; let sicht = true; const t9aus = [];
      for (let j = 0; j < 40 && erreicht.length < 6; j++) {
        await page.keyboard.press('Tab');
        // Das Theme setzt html{scroll-behavior:smooth}: das Zentrieren läuft weich. Bis 2,5 s warten, dann urteilen.
        let f = null;
        for (let w = 0; w < 17; w++) {
          await page.waitForTimeout(150);
          f = await page.evaluate(() => { const a = document.activeElement; if (!a || !a.classList.contains('lx-story__karte')) return null; const r = a.getBoundingClientRect(); return { href: a.getAttribute('href'), drin: r.top >= 0 && r.bottom <= innerHeight, top: Math.round(r.top), bottom: Math.round(r.bottom) }; });
          if (!f || f.drin) break;
        }
        if (f) { if (!erreicht.includes(f.href)) erreicht.push(f.href); if (!f.drin) { sicht = false; t9aus.push(f); } }
      }
      pruef(erreicht.length === 6, form + ' T9 Tab erreicht alle 6 Kaufkarten', erreicht.length);
      pruef(sicht, form + ' T9 fokussierte Karte liegt im sichtbaren Bereich', t9aus);
      // T10 kein seitliches Scrollen, T11 keine Seitenfehler
      const r10 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      pruef(r10.sw <= r10.cw, form + ' T10 kein seitliches Scrollen', r10);
      // T15 Pause-Knopf
      await scrollZu(page, await kapitelMitte(page, 1)); await page.waitForTimeout(800);
      await page.click('.lx-story__pause');
      await page.waitForTimeout(300);
      const r15 = await page.evaluate(() => { const p = document.querySelector('.lx-story__pause'); return { pressed: p.getAttribute('aria-pressed'), text: p.textContent.trim(), laufen: [...document.querySelectorAll('.lx-story__video')].filter((v) => !v.paused).length }; });
      pruef(r15.pressed === 'true' && r15.laufen === 0 && /fortsetzen/.test(r15.text), form + ' T15 Pause hält alle Videos an', r15);
      await page.click('.lx-story__pause'); await page.waitForTimeout(800);
      const r15b = await page.evaluate(() => [...document.querySelectorAll('.lx-story__video')].filter((v) => !v.paused).length);
      pruef(r15b === 1, form + ' T15 Fortsetzen spielt wieder', r15b);
      // T18 Maus: Punkt (unter den Kapiteln) springt zum Kapitel, Karte ist anklickbar
      {
        const pos = await page.evaluate(() => { const a = document.querySelector('.lx-story__punkte a[data-i="3"]'); const r = a.getBoundingClientRect(); return { x: r.right - 8, y: r.top + r.height / 2 }; });
        await page.mouse.click(pos.x, pos.y); await page.waitForTimeout(2500);
        const k = await page.evaluate(() => document.querySelector('[data-lx-story]').getAttribute('data-kapitel'));
        pruef(k === '3', form + ' T18 Klick auf Punkt 4 zeigt Kapitel 4', k);
        let ziel = null;
        await page.route('**/products/**', (r) => { if (r.request().isNavigationRequest()) { ziel = r.request().url(); return r.fulfill({ status: 204, body: '' }); } return r.continue(); });
        await page.evaluate(() => document.querySelectorAll('.lx-story__karte')[3].scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(600);
        const kp = await page.evaluate(() => { const a = document.querySelectorAll('.lx-story__karte')[3]; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, drin: r.top > 0 && r.bottom < innerHeight }; });
        if (kp.drin) { await page.mouse.click(kp.x, kp.y); await page.waitForTimeout(800); }
        pruef(kp.drin && ziel && ziel.includes(KAP[3].produkt) && ziel.includes('variant=' + KAP[3].variante), form + ' T18 Klick auf Kaufkarte öffnet die Ausführung', { kp, ziel });
      }
      // T19 Karte überdeckt nie Wort oder Zeile, solange der Text sichtbar ist
      { const u = await ueberdeckung(page, [0, 3, 5]); pruef(u.gezaehlt >= 20 && u.funde.length === 0, form + ' T19 Karte überdeckt Text nie (Deckkraft >= 0,5)', { n: u.gezaehlt, funde: u.funde.slice(0, 4) }); }
      // T26 Ende: Steuerleiste verschwindet, keine leere Bühne mit Punkten
      {
        const lage = () => page.evaluate(() => { const p = document.querySelector('.lx-story__pause'); const b = p.getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { ende: document.querySelector('[data-lx-story]').hasAttribute('data-ende'), punkte: getComputedStyle(document.querySelector('.lx-story__punkte')).visibility, pause: getComputedStyle(p).visibility, pauseOben: !!t && (t === p || p.contains(t)), imBild: b.top >= 0 && b.bottom <= innerHeight }; });
        const g = async (z) => { const y = await page.evaluate((z) => { const s = document.querySelector('[data-lx-story]'); const r = s.getBoundingClientRect(); return r.top + scrollY + z * (r.height - innerHeight); }, z); await scrollZu(page, y); await page.waitForTimeout(700); return lage(); };
        const mitte = await g(0.5);
        await scrollZu(page, await kapitelMitte(page, 5)); await page.waitForTimeout(700); const letztes = await lage();
        const schluss = await g(1);
        pruef(!mitte.ende && mitte.punkte === 'visible' && schluss.ende && schluss.punkte === 'hidden', form + ' T26 Punkte am Ende ausgeblendet', { mitte, schluss });
        pruef(!letztes.ende && letztes.punkte === 'visible' && letztes.pause === 'visible' && letztes.pauseOben, form + ' T26b letztes Kapitel: Pause und Punkte da, solange das Video läuft', letztes);
        pruef(schluss.pause === 'visible' && schluss.pauseOben && schluss.imBild, form + ' T26c Pause bleibt bis die Bühne wegscrollt', schluss);
      }
      // T27 Platzhalter so hoch wie die Geschichte
      {
        const r = await page.evaluate(() => { const d = document.createElement('div'); d.style.height = window.lxStoryPlatzHoehe(); document.body.appendChild(d); const p = d.getBoundingClientRect().height; d.remove(); return { p, s: document.querySelector('[data-lx-story]').getBoundingClientRect().height }; });
        pruef(Math.abs(r.p - r.s) <= 2, form + ' T27 Platzhalter so hoch wie die Geschichte', r);
      }
      // T21 Pause-Knopf überall bedienbar (über den Kapiteln)
      { const r = await pauseErreichbar(page); pruef(r.gezaehlt >= 15 && r.funde.length === 0, form + ' T21 Pause-Knopf an jeder Position oberster Treffer', { n: r.gezaehlt, funde: r.funde.slice(0, 4) }); }
      { const r = await steuerUeberKapiteln(page, 'stapel'); pruef(r.gezaehlt >= 20 && r.funde.length === 0, form + ' T21b Steuerleiste liegt über den Kapiteln (auch wenn Kapitel Klicks annähmen)', { n: r.gezaehlt, funde: r.funde.slice(0, 4) }); }
      { const r = await steuerUeberKapiteln(page, 'durchlass'); pruef(r.gezaehlt >= 20 && r.funde.length === 0, form + ' T21c Kapitel lassen Klicks durch (auch wenn die Steuerleiste tiefer läge)', { n: r.gezaehlt, funde: r.funde.slice(0, 4) }); }
      // T22b Kapitelabstände hängen nicht an der Kopfzeilen-Messung
      { const r = await page.evaluate(() => { const el = document.querySelector('[data-lx-story]'); const k = document.querySelectorAll('.lx-story__kapitel'); const vor = [...k].map((x) => getComputedStyle(x).paddingTop + '/' + x.offsetHeight); const alt = el.style.getPropertyValue('--lx-story-kopf'); el.style.setProperty('--lx-story-kopf', '140px'); const nach = [...k].map((x) => getComputedStyle(x).paddingTop + '/' + x.offsetHeight); if (alt) el.style.setProperty('--lx-story-kopf', alt); else el.style.removeProperty('--lx-story-kopf'); return { gleich: vor.join() === nach.join(), vor: vor[1], nach: nach[1] }; }); pruef(r.gleich, form + ' T22b Kapitelabstände unabhängig von der Kopfzeilen-Messung', r); }
      // T17 Layout-Verschiebung
      const cls = await page.evaluate(() => new Promise((res) => { let s = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) s += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => res(s), 200); }));
      pruef(cls <= 0.1, form + ' T17 CLS höchstens 0,1', cls);
      pruef(fehler.length === 0, form + ' T11 keine Seitenfehler', fehler);
      // T25 reduzierte Bewegung wird während des Besuchs eingeschaltet: sofort Stillstand
      {
        await scrollZu(page, await kapitelMitte(page, 2)); await page.waitForTimeout(1200);
        await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(500);
        const r = await page.evaluate(() => ({ rf: document.querySelector('[data-lx-story]').getAttribute('data-rueckfall'), laufen: [...document.querySelectorAll('.lx-story__video')].filter((v) => !v.paused || v.getAttribute('src')).length, buehne: getComputedStyle(document.querySelector('.lx-story__buehne')).display }));
        pruef(r.rf === 'bewegung' && r.laufen === 0 && r.buehne === 'none', form + ' T25 reduzierte Bewegung zur Laufzeit: Videos aus, Bühne weg', r);
      }
      await ctx.close();
    }
    // Tablet mit Touch (Kopfzeile des Themes 59 px): T22 keine Verschiebung beim Laden, T19, T21
    {
      const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
      const { ctx, page, fehler } = await laden(b, 'desktop', { ctx: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, userAgent: UAM } });
      await page.waitForTimeout(2000);
      const cls = await page.evaluate(() => new Promise((res) => { let s = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) s += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => res(s), 200); }));
      const kopf = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-lx-story]')).getPropertyValue('--lx-oben')));
      pruef(cls < 0.01, 'tablet T22 keine Layout-Verschiebung beim Laden (CLS < 0,01)', { cls, kopf });
      const korr = await page.evaluate(() => document.querySelector('[data-lx-story]').style.getPropertyValue('--lx-story-kopf'));
      pruef(korr === '' && Math.abs(kopf - 59) < 1, 'tablet T22b Touch-Vorgabe 59 px trifft, keine Korrektur durch das Skript', { korr, kopf });
      const u = await ueberdeckung(page, [1, 4]); pruef(u.gezaehlt >= 10 && u.funde.length === 0, 'tablet T19 Karte überdeckt Text nie', { n: u.gezaehlt, funde: u.funde.slice(0, 4) });
      const r = await pauseErreichbar(page, 0.35); pruef(r.gezaehlt >= 10 && r.funde.length === 0, 'tablet T21 Pause-Knopf überall oberster Treffer', { n: r.gezaehlt, funde: r.funde.slice(0, 4) });
      pruef(fehler.length === 0, 'tablet T11 keine Seitenfehler', fehler);
      await ctx.close();
    }
    // T23b Langsames Gerät: Bilder kommen 500 ms verspätet, der Ruhe-Zeitgeber läuft vorher ab. Er darf kein Zwischenvideo laden.
    {
      const { ctx, page, stat } = await laden(b, 'desktop');
      const mitte = (i) => page.evaluate((i) => { const k = document.querySelectorAll('.lx-story__kapitel')[i]; const r = k.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; }, i);
      await scrollZu(page, await mitte(0)); await page.waitForTimeout(1500);
      await page.evaluate(() => { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (f) => setTimeout(() => raf(f), 500); });
      const vor = stat.videoAnfragen.length;
      const y2 = await mitte(2), y5 = await mitte(5);
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y2);
      let k = null; for (let w = 0; w < 100 && k !== '2'; w++) { await page.waitForTimeout(20); k = await page.evaluate(() => document.querySelector('[data-lx-story]').getAttribute('data-kapitel')); }
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y5);
      await page.waitForTimeout(3000);
      const neu = stat.videoAnfragen.slice(vor).map((v) => v.datei.replace(/-(quer|hoch)-v1\.mp4$/, ''));
      const k2 = await page.evaluate(() => document.querySelector('[data-lx-story]').getAttribute('data-kapitel'));
      pruef(k === '2' && k2 === '5' && neu.length >= 1 && neu.every((d) => d === 'lx-story-' + KAP[5].id.toLowerCase()), 'desktop T23b langsames Gerät: Ruhe-Zeitgeber lädt kein Zwischenvideo', { k, k2, neu });
      await ctx.close();
    }
    // T23c/d/e Sprung per Punkt, langsam nachgestellt (weicher Bildlauf des Themes unterdrückt, Test scrollt selbst):
    // c: Zwischenkapitel wird übersprungen; d: nach 3 s ohne Ankunft lädt das aktuelle Kapitel doch; e: eigene Eingabe (Mausrad) bricht den Sprung ab.
    {
      const { ctx, page, stat } = await laden(b, 'desktop');
      const mitte = (i) => page.evaluate((i) => { const k = document.querySelectorAll('.lx-story__kapitel')[i]; const r = k.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; }, i);
      const hin = async (i) => { const y = await mitte(i); await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y); };
      const klick = async (i) => { const pos = await page.evaluate((i) => { const a = document.querySelector('.lx-story__punkte a[data-i="' + i + '"]'); const r = a.getBoundingClientRect(); return { x: r.right - 8, y: r.top + r.height / 2 }; }, i); await page.mouse.click(pos.x, pos.y); };
      const geladen = (vor) => stat.videoAnfragen.slice(vor).map((v) => v.datei.replace(/-(quer|hoch)-v1\.mp4$/, ''));
      const clip = (i) => 'lx-story-' + KAP[i].id.toLowerCase();
      await scrollZu(page, await mitte(0)); await page.waitForTimeout(1500);
      await page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.lx-story__punkte a')) e.preventDefault(); }, true));
      let vor = stat.videoAnfragen.length;
      await klick(5); await hin(3); await page.waitForTimeout(1000); await hin(5); await page.waitForTimeout(1500);
      const c = geladen(vor);
      pruef(c.length >= 1 && c.every((d) => d === clip(5)), 'desktop T23c Sprung per Punkt: Zwischenkapitel lädt kein Video, auch wenn der Bildlauf dort verweilt', c);
      vor = stat.videoAnfragen.length;
      await klick(0); await hin(2); await page.waitForTimeout(1000);
      const d1 = geladen(vor); await page.waitForTimeout(2800); const d2 = geladen(vor);
      pruef(!d1.includes(clip(2)) && d2.includes(clip(2)), 'desktop T23d Sprung ohne Ankunft: nach 3 s lädt das aktuelle Kapitel doch', { d1, d2 });
      vor = stat.videoAnfragen.length;
      await klick(0); await hin(4); await page.waitForTimeout(400); await page.mouse.wheel(0, 2); await page.waitForTimeout(1200);
      const e1 = geladen(vor);
      pruef(e1.includes(clip(4)), 'desktop T23e eigene Eingabe bricht den Sprung ab: Kapitel lädt sofort', e1);
      await ctx.close();
    }
    // T7 reduzierte Bewegung: keine Bühne, kein Video, Standbilder
    {
      const { ctx, page, stat } = await laden(b, 'handy', { ctx: { reducedMotion: 'reduce' } });
      const h = await page.evaluate(() => document.querySelector('[data-lx-story]').getBoundingClientRect().height + scrollY + 2000);
      await scrollZu(page, h); await page.waitForTimeout(800);
      const r = await page.evaluate(() => { const s = document.querySelector('[data-lx-story]'); return { rf: s.getAttribute('data-rueckfall'), buehne: getComputedStyle(s.querySelector('.lx-story__buehne')).display + getComputedStyle(s.querySelector('.lx-story__steuer')).display, stills: [...s.querySelectorAll('.lx-story__still')].filter((p) => getComputedStyle(p).display !== 'none').length, op: [...s.querySelectorAll('.lx-story__text')].map((t) => getComputedStyle(t).opacity), tr: [...s.querySelectorAll('.lx-story__text')].map((t) => getComputedStyle(t).transform) }; });
      pruef(r.rf === 'bewegung' && r.buehne === 'nonenone' && r.stills === 6, 'T7 reduzierte Bewegung: Standbilder statt Bühne', r);
      pruef(stat.videoAnfragen.length === 0 && stat.videoBytes === 0, 'T7 reduzierte Bewegung: 0 Video-Bytes', stat.videoAnfragen.length);
      pruef(r.op.every((o) => o === '1') && r.tr.every((t) => t === 'none'), 'T7 Text ohne Bewegung und voll sichtbar', r);
      await ctx.close();
    }
    // T12 Video-Fehler: Poster bleibt, kein Absturz
    {
      const { ctx, page, fehler } = await laden(b, 'desktop', { nachbau: { videoFehler: true } });
      await scrollZu(page, await kapitelMitte(page, 0)); await page.waitForTimeout(1500);
      const r = await page.evaluate(() => { const e = document.querySelector('.lx-story__ebene[data-aktiv]'); return { poster: !!e.querySelector('img').getAttribute('src') && e.querySelector('img').complete, spielt: !!e.querySelector('video[data-spielt]'), sichtbar: getComputedStyle(e).visibility }; });
      pruef(r.poster && !r.spielt && r.sichtbar === 'visible' && fehler.length === 0, 'T12 Videofehler: Poster bleibt sichtbar', r);
      await ctx.close();
    }
    // T13 Autoplay gesperrt
    {
      const init = () => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('gesperrt', 'NotAllowedError')); }; };
      const { ctx, page, stat } = await laden(b, 'handy', { init });
      await scrollZu(page, await kapitelMitte(page, 1)); await page.waitForTimeout(1200);
      const r = await page.evaluate(() => { const s = document.querySelector('[data-lx-story]'); return { rf: s.getAttribute('data-rueckfall'), src: [...s.querySelectorAll('video')].filter((v) => v.getAttribute('src')).length, poster: !!s.querySelector('.lx-story__ebene[data-aktiv] img').getAttribute('src') }; });
      pruef(r.rf === 'autoplay' && r.src === 0 && r.poster, 'T13 Autoplay gesperrt: Rückfall auf Poster', r);
      await ctx.close();
    }
    // T14 Datensparmodus
    {
      const init = () => { Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true }); };
      const { ctx, page, stat } = await laden(b, 'handy', { init });
      await scrollZu(page, await kapitelMitte(page, 2)); await page.waitForTimeout(1200);
      const r = await page.evaluate(() => ({ rf: document.querySelector('[data-lx-story]').getAttribute('data-rueckfall'), aktiv: document.querySelector('[data-lx-story]').getAttribute('data-kapitel') }));
      pruef(r.rf === 'daten' && stat.videoAnfragen.length === 0 && r.aktiv === '2', 'T14 Datensparmodus: keine Videos, Kapitel wechseln trotzdem', { r, n: stat.videoAnfragen.length });
      await ctx.close();
    }
    // T2c weniger als zwei Kapitel: Platzhalter verschwindet, keine Lücke
    {
      const { ctx, page } = await laden(b, 'desktop', { html: render('eins') });
      const r = await page.evaluate(() => ({ ph: document.querySelectorAll('.lx-story-platzhalter').length, story: document.querySelectorAll('[data-lx-story]').length, nachHero: document.querySelector('.lx-hero').nextElementSibling.className }));
      pruef(r.ph === 0 && r.story === 0 && /lx-worlds/.test(r.nachHero), 'T2c Geschichte aus: Platzhalter entfernt, Seite wie heute', r);
      await ctx.close();
    }
    // T16 Liquid: Wahrheit fail closed
    {
      const n = (fall) => (render(fall).match(/class="lx-story__kapitel"/g) || []).length;
      pruef(n('ausverkauft') === 5 && !render('ausverkauft').includes(KAP[1].variante), 'T16 ausverkaufte Ausführung: Kapitel fällt weg');
      pruef(n('produkt_weg') === 5, 'T16 Produkt nicht sichtbar: Kapitel fällt weg');
      pruef(n('fremd_cdn') === 5, 'T16 Poster nicht von cdn.shopify.com: Kapitel fällt weg');
      const fv = render('fremd_video');
      pruef(n('fremd_video') === 6 && !fv.includes('example.com'), 'T16 Video nicht von cdn.shopify.com: nur Poster');
      pruef(render('eins').includes('lx-story: aus') && !render('eins').includes('<section'), 'T16 weniger als zwei Kapitel: nichts');
      const fr = render('fr');
      pruef(fr.includes('Lumière') && fr.includes('Voir le produit') && !fr.includes('Produkt ansehen'), 'T16 Französisch');
      const nrm = render('normal');
      pruef(!/\b(Rabatt|Lieferung|liefern|Werktag|gratis|%|heilt|Wirkung)\b/i.test(nrm.replace(/<[^>]*>/g, ' ').replace(/CHF [0-9.]+/g, '')), 'T16 Text ohne Preise, Rabatte, Lieferzeiten, Wirkversprechen');
      pruef((nrm.match(/CHF [0-9]+\.[0-9]{2}/g) || []).length === 6 && (nrm.match(/class="lx-story__karte-preis"/g) || []).length === 6, 'T16 Preis nur in den Kaufkarten');
      pruef(n('abgelaufen') === 5 && !render('abgelaufen').includes('>Wohnen<'), 'T16 abgelaufenes Kapitel («bis» vorbei) fällt weg');
      const vz = (h) => (h.match(/class="lx-story__karte-var"/g) || []).length;
      pruef(vz(nrm) === KAP.filter((k) => k.variante_zeigen !== false).length - 1 && !/7 Zoll/.test(nrm) && vz(render('ohne_varzeile')) === 0, 'T16 Ausführungszeile nur wo erlaubt (Armband ohne Zoll)', vz(nrm));
      pruef(!/<style/i.test(nrm.replace(/<!--LXCSS-->[\s\S]*?<!--\/LXCSS-->/g, '')) && (nrm.match(/<!--LXCSS-->/g) || []).length === 1, 'T16 Stil nur im {% stylesheet %}-Block (kein <style> im Abschnitt)');
      const ohneStil = nrm.replace(/<!--LXCSS-->[\s\S]*?<!--\/LXCSS-->/g, '');
      pruef(/data-i="5" data-letztes/.test(ohneStil) && (ohneStil.match(/data-letztes/g) || []).length === 1, 'T16 letztes Kapitel markiert');
    }
  } finally { await b.close(); }
  console.log(`buehne_test: ${ok} bestanden, ${fehl} Fehler`);
  process.exit(fehl ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH', e.message); process.exit(2); });
