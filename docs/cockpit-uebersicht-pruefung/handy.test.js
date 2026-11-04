// Handy-Fassung des Cockpits (cockpit.html) mit echtem Chromium, Berührung statt Maus, deviceScaleFactor 2.
//   python3 fixtures.py && node handy.test.js          (COCKPIT_HTML=<Datei> prüft eine andere Fassung, z. B. für die Mutationsprobe)
let playwright; try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const HTML = process.env.COCKPIT_HTML || path.resolve(__dirname, '../../tools/trading/krypto_bot/cockpit.html');
const FX = path.join(__dirname, 'fx');
let fails = 0, passes = 0;
const ok = (c, msg, info) => { if (c) passes++; else { fails++; console.log('FAIL ' + msg + (info !== undefined ? ' :: ' + JSON.stringify(info) : '')); } };
const norm = s => String(s == null ? '' : s).replace(/[‘’]/g, "'").replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const GROESSEN = [[360, 640], [390, 844], [412, 915]];
const ABSCHNITT = (process.env.ABSCHNITT || '').split(',').filter(Boolean), lauf = n => !ABSCHNITT.length || ABSCHNITT.includes(String(n));   // ABSCHNITT=2,3 prüft nur diese Abschnitte

(async () => {
  const server = http.createServer((q, a) => { a.setHeader('Content-Type', 'text/html; charset=utf-8'); a.end(fs.readFileSync(HTML)); }).listen(0);
  const BASIS = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();

  async function seite(fall, { w = 390, h = 844, thema = 'dunkel', reduziert = false, touch = true } = {}) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: touch, hasTouch: touch, colorScheme: thema === 'hell' ? 'light' : 'dark', locale: 'de-CH', timezoneId: 'Europe/Zurich', reducedMotion: reduziert ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    await page.addInitScript(() => { window.__maxBreite = 0; const f = () => { window.__maxBreite = Math.max(window.__maxBreite, innerWidth, document.documentElement.scrollWidth); requestAnimationFrame(f); }; requestAnimationFrame(f); });   // jedes Bild: wie breit war die Seite? (am Handy zoomt der Browser heraus, sobald Inhalt breiter als das Fenster ist)
    const info = { fehler: [], fremd: [], ctx };
    page.on('pageerror', e => info.fehler.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) info.fehler.push(m.type() + ' ' + m.text()); });
    await page.route('**/*', r => {
      const u = new URL(r.request().url());
      if (u.hostname !== '127.0.0.1') { info.fremd.push(u.href); return r.abort(); }
      if (!u.pathname.startsWith('/api/')) return r.continue();
      if (r.request().method() === 'POST') return r.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ gestartet: 'x', meldung: 'ok' }) });
      r.fulfill({ contentType: 'application/json', body: fs.readFileSync(path.join(FX, fall, u.pathname.split('/').pop() + '.json')) });
    });
    await page.goto(BASIS);
    await page.waitForSelector('#uebersicht .ukarte', { timeout: 8000 });
    await page.waitForTimeout(500);
    page.info = info;
    return page;
  }
  const zu = async p => { await p.info.ctx.close(); };
  const text = (p, sel) => p.$eval(sel, e => e.innerText).then(norm);
  const alle = (p, sel) => p.$$eval(sel, es => es.map(e => e.innerText.replace(/[‘’]/g, "'").replace(/ /g, ' ').replace(/\s+/g, ' ').trim()));
  const ruhe = async p => { let letzte = -1, gleich = 0; for (let i = 0; i < 80 && gleich < 4; i++) { const y = await p.evaluate(() => scrollY); gleich = y === letzte ? gleich + 1 : 0; letzte = y; await p.waitForTimeout(60); } return letzte; };

  // Abstand eines Elements zu allen anderen bedienbaren Elementen (die drei nächsten)
  const nachbarn = (p, id) => p.evaluate(id => {
    const sicht = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const alle = [...document.querySelectorAll('button, a[href], summary, [role="button"], input, select, textarea')].filter(sicht);
    const z = document.getElementById(id).getBoundingClientRect();
    const dist = (a, b) => Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom));
    return alle.filter(e => e.id !== id).map(e => ({ n: e.id || String(e.className) || e.tagName, d: Math.round(dist(z, e.getBoundingClientRect())) })).sort((a, b) => a.d - b.d).slice(0, 3);
  }, id);

  // Kontrast aller sichtbaren Texte in den gegebenen Bereichen
  const kontrast = () => {
    const rgbaVon = s => { let m = s.match(/rgba?\(([^)]+)\)/); if (m) { const t = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: t[0], g: t[1], b: t[2], a: t.length > 3 ? t[3] : 1 }; }
      m = s.match(/color\(srgb ([^)]+)\)/); if (m) { const t = m[1].split(/[ \/]+/).filter(Boolean).map(Number); return { r: t[0] * 255, g: t[1] * 255, b: t[2] * 255, a: t.length > 3 ? t[3] : 1 }; } return { r: 0, g: 0, b: 0, a: 0 }; };
    const misch = (v, h) => ({ r: v.r * v.a + h.r * (1 - v.a), g: v.g * v.a + h.g * (1 - v.a), b: v.b * v.a + h.b * (1 - v.a), a: 1 });
    const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const grund = el => { const e = []; for (let x = el; x; x = x.parentElement) { const c = rgbaVon(getComputedStyle(x).backgroundColor); if (c.a > 0) e.push(c); if (c.a >= 1) break; }
      let h = { r: 255, g: 255, b: 255, a: 1 }; if (!e.length || e[e.length - 1].a < 1) h = rgbaVon(getComputedStyle(document.body).backgroundColor); for (let i = e.length - 1; i >= 0; i--) h = misch(e[i], h); return h; };
    const schlecht = [], gesehen = new Set();
    document.querySelectorAll('.band, .status-zeile, #uebersicht, #ampelListe:not([hidden]), #sprung, #blase:not([hidden])').forEach(b => [b, ...b.querySelectorAll('*')].forEach(el => {
      if (gesehen.has(el) || el.closest('.nur-leser') || el.closest('defs')) return;
      const eigen = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (!eigen) return;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      gesehen.add(el);
      const cs = getComputedStyle(el), svgText = el instanceof SVGElement;
      const bg = grund(svgText ? el.closest('svg').parentElement : el), fgm = misch(rgbaVon(svgText ? cs.fill : cs.color), bg);
      const a = lum(fgm), b2 = lum(bg), v = (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05);
      const px = parseFloat(cs.fontSize), fett = parseInt(cs.fontWeight, 10) >= 700, gross = px >= 24 || (px >= 18.66 && fett);
      if (v < (gross ? 3 : 4.5)) schlecht.push({ t: eigen.slice(0, 40), v: +v.toFixed(2), px });
    }));
    return schlecht;
  };

  // Elemente, die rechts oder links aus dem Fenster ragen (ohne fest Verborgenes und Vorlesetext)
  const ueberstand = () => { const w = innerWidth, aus = [];
    document.querySelectorAll('body *').forEach(e => { if (e.closest('.nur-leser') || e.closest('svg') && e.tagName !== 'svg' || e.closest('[hidden]')) return;
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return;
      if (r.right > w + 0.5 || r.left < -0.5) aus.push({ e: e.tagName + '.' + String(e.className && e.className.baseVal !== undefined ? '' : e.className).slice(0, 30) + '#' + e.id, l: Math.round(r.left), r: Math.round(r.right) }); });
    return aus.slice(0, 6); };

  // ───────── 1. Je Größe und Design: Aufbau, Daumenzone, Sprungleiste, Kacheln, Tabellen ─────────
  if (lauf(1)) {
  for (const thema of ['dunkel', 'hell']) {
    for (const [w, h] of GROESSEN) {
      const T = `${w}×${h} ${thema}`;
      const p = await seite('voll', { w, h, thema });
      ok(p.info.fehler.length === 0, `${T}: keine Konsolen-/Seitenfehler`, p.info.fehler);
      ok(p.info.fremd.length === 0, `${T}: keine Anfrage ausserhalb von 127.0.0.1`, p.info.fremd);
      await p.evaluate(() => { zeichne(letzterStand); zeigeProfit(letzterProfit); }); await p.waitForTimeout(300);   // ein Neuzeichnen der alten Abschnitte (Tabellen, Diagramme) darf die Seite nie verbreitern
      const breite = await p.evaluate(() => ({ iw: innerWidth, max: window.__maxBreite, skala: visualViewport ? +visualViewport.scale.toFixed(3) : 1 }));
      ok(breite.iw === w && breite.max === w && breite.skala === 1, `${T}: die Seite ist nie breiter als das Fenster (kein Herauszoomen am Handy, auch nicht für ein einzelnes Bild beim Neuzeichnen)`, breite);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${T}: kein seitliches Scrollen`, await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
      const ueb = await p.evaluate(ueberstand);
      ok(ueb.length === 0, `${T}: kein Element ragt aus dem Fenster`, ueb);
      ok(await p.evaluate(() => { const a = []; document.querySelectorAll('*').forEach(e => { const cs = getComputedStyle(e); if (['auto', 'scroll'].includes(cs.overflowX) && e.scrollWidth > e.clientWidth + 1) a.push(e.tagName + '.' + e.className); }); return a.length === 0; }), `${T}: nirgends ein waagerecht scrollender Behälter`);

      // Daumenzone: Not-Aus und Auto-Handel gross, mit Abstand, nicht neben kleinen Knöpfen
      const knopf = await p.evaluate(() => ['notaus', 'autoK'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return { id, b: Math.round(r.width), h: Math.round(r.height), oben: Math.round(r.top), unten: Math.round(r.bottom) }; }));
      ok(knopf.every(k => k.h >= 48 && k.b >= 96), `${T}: Not-Aus und Auto-Handel mindestens 48 px hoch und breit`, knopf);
      for (const id of ['notaus', 'autoK']) { const n = await nachbarn(p, id); ok(n[0].d >= 16, `${T}: ${id} hat zu jedem anderen Knopf mindestens 16 px Abstand`, n); }
      ok(knopf.every(k => k.unten <= h - 52), `${T}: Not-Aus und Auto-Handel liegen im ersten Bildschirm über der Sprungleiste`, knopf);
      ok(await text(p, '#autoKText') === 'Auto-Handel AN' && await p.$eval('#autoKText .zust', e => e.className.includes('an')), `${T}: Auto-Handel zeigt «AN» als eigenes Zustandswort`);
      const hero = await p.evaluate(() => { const e = document.getElementById('u-konto'), r = e.getBoundingClientRect(); return { px: parseFloat(getComputedStyle(e).fontSize), unten: Math.round(r.bottom), text: e.innerText.replace(/\s+/g, ' ').replace(/[‘’]/g, "'").trim(), voll: e.scrollWidth <= e.clientWidth + 1 }; });
      ok(hero.px >= 40 && hero.text === "5'122.95 USDT" && hero.voll, `${T}: Kontostand gross (≥ 40 px), de-CH «5'122.95 USDT», nicht abgeschnitten`, hero);
      ok(hero.unten <= h - 52 - 8, `${T}: der Kontostand ist im ersten Bildschirm sichtbar (nicht hinter der Sprungleiste)`, hero);
      const ampelKachel = await p.evaluate(() => { const r = document.getElementById('ampel').getBoundingClientRect(), z = [...document.querySelectorAll('#ampelZaehler .az')].map(e => e.innerText.trim() + '|' + e.className.replace('az ', '')); return { h: Math.round(r.height), b: Math.round(r.width), z, unten: Math.round(r.bottom), sichtbar: getComputedStyle(document.getElementById('ampelZaehler')).display }; });
      ok(ampelKachel.h >= 56 && ampelKachel.b >= w - 40 && ampelKachel.unten <= h - 52, `${T}: Gesundheit ist eine breite Kachel (≥ 56 px hoch) im ersten Bildschirm`, ampelKachel);
      ok(ampelKachel.z.join(',') === '✕ 4|rot,! 1|gelb,○ 2|grau,✓ 6|gut' && ampelKachel.sichtbar === 'flex', `${T}: Kachel zeigt Zähler ✕ 4 · ! 1 · ○ 2 · ✓ 6`, ampelKachel.z);
      ok(await p.$eval('#ampelListe', e => e.hidden), `${T}: die lange Liste ist zu Beginn zu`);
      await p.tap('#ampel'); await p.waitForTimeout(120);
      const liste = await p.evaluate(() => ({ auf: [...document.querySelectorAll('#ampelListe > .ampel-grid .achip')].map(e => e.className.replace('achip ', '')), rest: document.querySelector('#ampelListe details.ampel-rest') ? { offen: document.querySelector('#ampelListe details.ampel-rest').open, kopf: document.querySelector('#ampelListe details.ampel-rest summary').innerText.replace(/\s+/g, ' ').trim(), n: document.querySelectorAll('#ampelListe details.ampel-rest .achip').length } : null }));
      ok(liste.auf.join(',') === 'rot,rot,rot,rot,gelb' && liste.rest && !liste.rest.offen && liste.rest.kopf === '8 weitere Punkte (6 in Ordnung, 2 Info)' && liste.rest.n === 8, `${T}: Tippen öffnet nur die 5 Punkte mit Handlungsbedarf, 8 weitere klappen zu`, liste);
      await p.tap('#ampelListe details.ampel-rest summary'); await p.waitForTimeout(100);
      ok(await p.$eval('#ampelListe details.ampel-rest', e => e.open), `${T}: «8 weitere Punkte» klappt auf`);
      await p.evaluate(() => kopfZeichnen(letzterStand));
      ok(await p.$eval('#ampelListe details.ampel-rest', e => e.open), `${T}: aufgeklappt bleibt aufgeklappt nach dem Neuzeichnen`);
      const achipB = await p.$$eval('#ampelListe .achip', es => es.map(e => Math.round(e.getBoundingClientRect().width)));
      ok(achipB.length === 13 && achipB.every(b => b >= w - 80 && b <= w), `${T}: Gesundheitspunkte laufen einspaltig über die Breite`, achipB);
      await p.tap('#ampel'); await p.waitForTimeout(100);
      ok(await p.$eval('#ampelListe', e => e.hidden), `${T}: zweites Tippen schliesst die Liste`);

      // Sprungleiste
      const nav = await p.evaluate(() => { const n = document.getElementById('sprung'), r = n.getBoundingClientRect(), cs = getComputedStyle(n);
        return { pos: cs.position, disp: cs.display, unten: Math.round(r.bottom), hoch: Math.round(r.height), links: [...n.querySelectorAll('a')].map(a => { const q = a.getBoundingClientRect(); return { t: a.innerText.trim(), href: a.getAttribute('href'), b: Math.round(q.width), h: Math.round(q.height), passt: a.scrollWidth <= a.clientWidth + 1, ziel: !!document.getElementById(a.dataset.ziel) }; }) }; });
      ok(nav.pos === 'fixed' && nav.disp === 'grid' && nav.unten === h && nav.hoch >= 48, `${T}: Sprungleiste fest am unteren Rand, ≥ 48 px hoch`, nav);
      ok(nav.links.map(l => l.t).join('|') === 'Übersicht|Positionen|Satellit|Aufträge|Details', `${T}: fünf Ziele: Übersicht · Positionen · Satellit · Aufträge · Details`, nav.links.map(l => l.t));
      ok(nav.links.every(l => l.h >= 48 && l.b >= 60 && l.passt && l.ziel), `${T}: jedes Ziel ≥ 48 px hoch, Beschriftung passt hinein, Anker existiert`, nav.links);
      ok(await p.$eval('#sprung a[data-ziel="oben"]', e => e.getAttribute('aria-current')) === 'true', `${T}: am Anfang ist «Übersicht» markiert`);
      const verlauf0 = await p.evaluate(() => history.length);
      for (const [name, ziel] of [['Positionen', 'u-positionen'], ['Satellit', 'u-satellit'], ['Aufträge', 'u-auftraege'], ['Details', 'details'], ['Übersicht', 'oben']]) {
        await p.tap(`#sprung a[data-ziel="${ziel}"]`);
        const y = await ruhe(p);
        const r = await p.evaluate(z => ({ top: Math.round(document.getElementById(z).getBoundingClientRect().top), aktiv: [...document.querySelectorAll('#sprung a[aria-current="true"]')].map(a => a.dataset.ziel) }), ziel);
        ok(r.top >= -2 && r.top <= 130 && r.aktiv.join() === ziel, `${T}: Tippen auf «${name}» bringt den Abschnitt nach oben und markiert ihn`, { r, y });
      }
      const verlauf1 = await p.evaluate(() => ({ n: history.length, hash: location.hash }));
      ok(verlauf1.n === verlauf0 && verlauf1.hash === '#oben', `${T}: die Sprungleiste füllt den Verlauf nicht (replaceState): ein Zurück-Tippen verlässt die Seite in einem Schritt`, { verlauf0, verlauf1 });
      await p.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await ruhe(p);
      const ende = await p.evaluate(() => ({ foot: Math.round(document.querySelector('footer').getBoundingClientRect().bottom), nav: Math.round(document.getElementById('sprung').getBoundingClientRect().top), aktiv: document.querySelector('#sprung a[aria-current="true"]').dataset.ziel }));
      ok(ende.foot <= ende.nav + 1 && ende.aktiv === 'details', `${T}: am Seitenende liegt nichts unter der Sprungleiste; «Details» ist markiert`, ende);

      // Tabellen werden Karten
      const tab = await p.evaluate(() => [...document.querySelectorAll('table')].map(t => { const z = [...t.querySelectorAll('tr')]; const kopf = z.find(r => r.querySelector('th')), daten = z.find(r => !r.querySelector('th'));
        return { disp: getComputedStyle(t).display, kopfDisp: kopf ? getComputedStyle(kopf).display : null, datenDisp: daten ? getComputedStyle(daten).display : null, labels: daten ? [...daten.children].map(c => c.getAttribute('data-label') || '') : [], breit: t.getBoundingClientRect().width <= innerWidth }; }));
      ok(tab.length >= 3 && tab.every(t => t.disp === 'block' && t.kopfDisp === 'none' && t.datenDisp === 'grid' && t.breit), `${T}: alle Tabellen (${tab.length}) sind Karten: Block, Kopfzeile aus, Zeile als Raster`, tab);
      ok(tab.some(t => t.labels.join('|') === 'Markt · Stufe|Trades|Treffer|Netto je Trade|Prüfstand'), `${T}: jede Zelle der Labor-Tabelle trägt ihren Spaltennamen`, tab.map(t => t.labels.join('|')));
      // Scalping-Labor am Handy: die 8 Karten stehen hinter einer zugeklappten Zeile mit der Spanne; ein Tipp öffnet sie
      const labSum = await p.$eval('#u-labor details.labor-tab > summary', e => ({ text: e.innerText.replace(/\s+/g, ' ').trim(), h: Math.round(e.getBoundingClientRect().height) }));
      ok(labSum.text === '8 Bücher · netto −9.8 bis −7.8 bp je Trade' && labSum.h >= 44 && await p.$eval('#u-labor details.labor-tab', e => !e.open) && await p.$eval('#u-labor details.labor-tab .tabelle', e => !e.checkVisibility()), `${T}: Labor zugeklappt mit der Zeile «8 Bücher · netto −9.8 bis −7.8 bp je Trade», Tippfläche ≥ 44 px, Karten unsichtbar`, labSum);
      await p.click('#u-labor details.labor-tab > summary'); await p.waitForTimeout(150);
      const labOffen = await p.evaluate(() => { const zeilen = [...document.querySelectorAll('#u-labor details.labor-tab tbody tr')]; return { offen: document.querySelector('#u-labor details.labor-tab').open, sichtbar: document.querySelector('#u-labor details.labor-tab .tabelle').checkVisibility(), n: zeilen.length, grid: zeilen.every(r => getComputedStyle(r).display === 'grid'), breit: zeilen.every(r => r.getBoundingClientRect().right <= innerWidth), scroll: document.documentElement.scrollWidth <= innerWidth }; });
      ok(labOffen.offen && labOffen.sichtbar && labOffen.n === 8 && labOffen.grid && labOffen.breit && labOffen.scroll, `${T}: ein Tipp öffnet die 8 Labor-Karten (Raster, nichts ragt heraus, kein seitliches Scrollen)`, labOffen);
      await p.click('#u-labor details.labor-tab > summary'); await p.waitForTimeout(100);
      ok(await p.$eval('#u-labor details.labor-tab', e => !e.open), `${T}: ein zweiter Tipp klappt das Labor wieder zu`);
      const profitTab = tab.find(t => t.labels.length === 8);
      ok(profitTab && profitTab.labels.join('|') === 'Markt|Seite|Menge|Einstieg|Jetzt|Gewinn USDT|auf das Pfand|Liquidation', `${T}: jede Zelle der Positions-Tabelle trägt ihren Spaltennamen`, profitTab && profitTab.labels);
      const hinweisZelle = await p.evaluate(() => { const td = [...document.querySelectorAll('#auftraege td[colspan]')][0]; return td ? { label: td.getAttribute('data-label'), grid: getComputedStyle(td).gridColumnStart + '/' + getComputedStyle(td).gridColumnEnd } : null; });
      ok(hinweisZelle && hinweisZelle.label === null && hinweisZelle.grid === '1/-1', `${T}: eine Hinweiszeile über mehrere Spalten hat keinen Spaltennamen und füllt die Karte`, hinweisZelle);

      // Kursleiter und Satellit lesbar
      await p.evaluate(() => document.getElementById('u-positionen').scrollIntoView({ block: 'start', behavior: 'instant' })); await ruhe(p);
      const leiter = await p.evaluate(() => { const l = document.querySelector('.upos-fuss') && document.querySelector('.leiter'); const r = l.getBoundingClientRect(), j = document.querySelector('.leiter .marke.jetzt').getBoundingClientRect(), s = document.querySelector('.leiter .marke.stop').getBoundingClientRect(), lg = [...document.querySelectorAll('.leiter-legende')][0];
        const li = [...lg.querySelectorAll('li')].map(x => Math.round(x.getBoundingClientRect().left)); return { h: Math.round(r.height), jb: Math.round(j.width), sh: Math.round(s.height), spalten: new Set(li).size, wert: parseFloat(getComputedStyle(lg.querySelector('b')).fontSize), klein: parseFloat(getComputedStyle(lg.querySelector('small')).fontSize) }; });
      ok(leiter.h >= 60 && leiter.jb >= 28 && leiter.sh >= 40 && leiter.spalten === 2 && leiter.wert >= 17 && leiter.klein >= 13, `${T}: Kursleiter gross (Höhe, Kurs-Marke, Stop-Marke), Legende in 2 Spalten mit grossen Werten`, leiter);
      const satz = await p.evaluate(() => [...document.querySelectorAll('.sat-zeile')].map(z => { const c = z.querySelector('.coin').getBoundingClientRect(), b = z.querySelector('.sat-bar').getBoundingClientRect(), zz = z.querySelector('.sat-zahlen').getBoundingClientRect(), k = z.getBoundingClientRect(); return { bar: Math.round(b.width), unterhalb: b.top >= Math.max(c.bottom, zz.bottom) - 1, voll: b.width >= k.width - 12 }; }));
      ok(satz.length === 3 && satz.every(s => s.unterhalb && s.voll), `${T}: jede Satelliten-Position ist eine Karte mit der Leiter über die ganze Breite`, satz);
      ok(await p.$eval('details.sat-regel', e => !e.open) && await p.$eval('.sat-regel summary', e => getComputedStyle(e, '::after').content === '"▾"'), `${T}: die Satelliten-Spielregel ist zugeklappt, mit Aufklapp-Pfeil`);
      ok(await p.$$eval('details.sat-regel', es => es.length === 2 && es.every(e => !e.open)), `${T}: die Spielregeln von Satellit und Scalping-Labor sind beide zugeklappt`);

      // Kontrast
      await p.tap('#ampel'); await p.waitForTimeout(80);
      const kn = await p.evaluate(kontrast);
      ok(kn.length === 0, `${T}: jeder sichtbare Text hat Kontrast ≥ 4,5:1 (gross ≥ 3:1), auch Sprungleiste und Kachel`, kn.slice(0, 8));
      const tf1 = await p.evaluate(() => [...document.querySelectorAll('.band button, .band a[href], .status-zeile button, #uebersicht button, #uebersicht a[href], #uebersicht summary, #ampelListe summary, #sprung a')]
        .filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); })
        .map(e => { const r = e.getBoundingClientRect(); return { n: (e.id || String(e.className) || e.tagName).slice(0, 24), b: Math.round(r.width), h: Math.round(r.height) }; }).filter(z => Math.min(z.b, z.h) < 44));
      ok(tf1.length === 0, `${T}: jede Tippfläche mindestens 44 px in der kleinsten Seite (Kopf, Kacheln, Hinweis-Knöpfe, Sprungleiste)`, tf1);
      await zu(p);
    }
  }
  }

  // ───────── 2. Hinweis-Blase und Konto-Kurve per Finger (kein Schweben nötig) ─────────
  if (lauf(2)) {
  for (const [w, h] of GROESSEN) {
    const T = `${w}×${h}`;
    const p = await seite('voll', { w, h });
    const stern = await p.$('.chip .hinw.stern');
    ok(!!stern, `${T}: der Stern bei «30 Tage» ist ein Knopf`);
    await p.evaluate(() => document.querySelector('.chip .hinw.stern').scrollIntoView({ block: 'center', behavior: 'instant' })); await ruhe(p);
    const sb = await p.$eval('.chip .hinw.stern', e => { const r = e.getBoundingClientRect(); return { b: Math.round(r.width), h: Math.round(r.height), label: e.getAttribute('aria-label'), ex: e.getAttribute('aria-expanded') }; });
    ok(sb.b >= 44 && sb.h >= 44 && sb.label === 'Hinweis zu 30 Tage' && sb.ex === 'false', `${T}: Hinweis-Knopf mindestens 44×44 px, mit Beschriftung`, sb);
    await p.tap('.chip .hinw.stern'); await p.waitForTimeout(150);
    const bl = await p.evaluate(() => { const b = document.getElementById('blase'), r = b.getBoundingClientRect(), n = document.getElementById('sprung').getBoundingClientRect(); return { sichtbar: !b.hidden, t: b.innerText, l: Math.round(r.left), r: Math.round(r.right), unten: Math.round(r.bottom), navTop: Math.round(n.top), ex: document.querySelector('.chip .hinw.stern').getAttribute('aria-expanded') }; });
    ok(bl.sichtbar && bl.t.startsWith('Kein gemerkter Stand der offenen Positionen') && bl.l >= 11 && bl.r <= w - 11 && bl.unten <= bl.navTop && bl.ex === 'true', `${T}: Tippen auf den Stern zeigt die Blase im Fenster und über der Sprungleiste`, bl);
    await p.evaluate(() => uebersichtZeichnen());
    ok(await p.$eval('#blase', e => !e.hidden), `${T}: Neuzeichnen ohne neue Daten lässt die Blase stehen`);
    await p.tap('.u-label'); await p.waitForTimeout(100);
    ok(await p.$eval('#blase', e => e.hidden) && await p.$eval('.chip .hinw.stern', e => e.getAttribute('aria-expanded')) === 'false', `${T}: Tippen daneben schliesst die Blase`);
    await p.tap('.chip .hinw.stern'); await p.keyboard.press('Escape'); await p.waitForTimeout(80);
    ok(await p.$eval('#blase', e => e.hidden), `${T}: Escape schliesst die Blase`);
    await p.tap('.chip .hinw.stern'); await p.evaluate(() => scrollBy({ top: 300, behavior: 'instant' })); await p.waitForTimeout(150);
    ok(await p.$eval('#blase', e => e.hidden), `${T}: Scrollen schliesst die Blase (sie hängt sonst vom Knopf ab)`);
    // Tastatur: Tab erreicht die Hinweis-Knöpfe, sie zeigen einen Fokusring, Enter öffnet die Blase
    await p.evaluate(() => { scrollTo({ top: 0, behavior: 'instant' }); document.activeElement && document.activeElement.blur(); });
    let ring = null;
    for (let i = 0; i < 40 && !ring; i++) { await p.keyboard.press('Tab'); ring = await p.evaluate(() => { const e = document.activeElement, cs = getComputedStyle(e); return e.classList.contains('hinw') ? { stil: cs.outlineStyle, breit: cs.outlineWidth, etikett: e.getAttribute('aria-label') } : null; }); }
    ok(ring && ring.stil === 'solid' && parseFloat(ring.breit) >= 2, `${T}: Tab erreicht den Hinweis-Knopf, er zeigt einen sichtbaren Fokusring`, ring);
    await ruhe(p);   // der Fokus scrollt den Knopf weich ins Bild; erst danach Enter (ein Scrollen schliesst die Blase absichtlich)
    await p.keyboard.press('Enter'); await p.waitForTimeout(120);
    ok(await p.$eval('#blase', e => !e.hidden), `${T}: Enter am Hinweis-Knopf öffnet die Blase (ohne Maus, ohne Finger)`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(80);
    ok(await p.$eval('#blase', e => e.hidden) && await p.evaluate(() => document.activeElement.classList.contains('hinw')), `${T}: Escape schliesst die Blase, der Fokus bleibt am Knopf`);
    // Engagement und Lage
    await p.evaluate(() => document.querySelector('[aria-label="Engagement"] .hinw').scrollIntoView({ block: 'center', behavior: 'instant' })); await ruhe(p);
    ok(await p.$eval('[aria-label="Engagement"] .nur-gross', e => getComputedStyle(e).display) === 'none', `${T}: der lange Absatz im Engagement ist am Handy ausgeblendet, der Hinweis-Knopf zeigt ihn`);
    await p.tap('[aria-label="Engagement"] .hinw'); await p.waitForTimeout(120);
    ok(await text(p, '#blase') === 'Nennwert heisst: so viel Markt bewegt das Konto, nicht das Pfand. Über 1,00× arbeitet das Konto mit Hebel.', `${T}: Engagement-Hinweis per Tippen`, await text(p, '#blase'));
    await p.keyboard.press('Escape');
    await p.evaluate(() => document.querySelector('.lage-kacheln .hinw').scrollIntoView({ block: 'center', behavior: 'instant' })); await ruhe(p);
    await p.tap('.lage-kacheln .hinw'); await p.waitForTimeout(120);
    const lt = await p.evaluate(() => ({ blase: document.getElementById('blase').innerText, titel: document.querySelector('.lage-kacheln > div[title]').getAttribute('title'), sichtbar: !document.getElementById('blase').hidden }));
    ok(lt.sichtbar && lt.blase === lt.titel && lt.blase === 'Funding-Satz je 8 Stunden', `${T}: Lage-Kachel: Tippen zeigt dieselbe Erklärung wie der Mauszeiger`, lt);
    await p.keyboard.press('Escape');
    // nichts hängt nur am title
    const nurTitel = await p.evaluate(() => [...document.querySelectorAll('#uebersicht [title]')].filter(e => !e.matches('.hinw') && !e.querySelector('.hinw') && !e.matches('.marke.aussen')).map(e => e.outerHTML.slice(0, 80)));
    ok(nurTitel.length === 0, `${T}: keine Auskunft hängt nur an einem Mauszeiger-Hinweis (title)`, nurTitel);
    // Konto-Kurve per Finger
    await p.evaluate(() => document.getElementById('u-kurve').scrollIntoView({ block: 'center', behavior: 'instant' })); await ruhe(p);
    ok(await p.$eval('#u-kurve svg', e => getComputedStyle(e).touchAction) === 'pan-y', `${T}: Kurve lässt senkrechtes Wischen zum Scrollen durch (touch-action: pan-y)`);
    const kb = await (await p.$('#u-kurve svg')).boundingBox();
    await p.touchscreen.tap(kb.x + kb.width * 0.55, kb.y + kb.height * 0.5); await p.waitForTimeout(150);
    const tip = await p.$eval('#u-kurve .tip', e => ({ d: getComputedStyle(e).display, t: e.innerText.replace(/\s+/g, ' ') }));
    ok(tip.d === 'block' && /\d{4}-\d{2}-\d{2}/.test(tip.t) && tip.t.includes('USDT'), `${T}: Tippen auf die Kurve zeigt Tag und Wert`, tip);
    await p.waitForTimeout(400);
    ok(await p.$eval('#u-kurve .tip', e => getComputedStyle(e).display) === 'block', `${T}: die Anzeige bleibt nach dem Loslassen stehen`);
    await p.touchscreen.tap(w / 2, 4); await p.waitForTimeout(100);
    ok(await p.$eval('#u-kurve .tip', e => getComputedStyle(e).display) === 'none', `${T}: Tippen daneben blendet die Anzeige aus`);
    ok(p.info.fehler.length === 0, `${T}: keine Konsolenfehler bei Blase und Kurve`, p.info.fehler);
    await zu(p);
  }
  }

  // ───────── 3. Sichere Ränder, Adressleistenfarbe, Bewegung ─────────
  if (lauf(3)) {
  {
    const p = await seite('voll', { w: 390, h: 844 });
    ok((await p.$eval('meta[name="viewport"]', e => e.content)).includes('viewport-fit=cover'), 'viewport-fit=cover (Inhalt bis in die Kerbe, Ränder über env())');
    const metas = await p.$$eval('meta[name="theme-color"]', es => es.map(e => ({ c: e.content, m: e.media })));
    ok(metas.length === 2 && metas.some(m => m.m.includes('dark')) && metas.some(m => m.m.includes('light')), 'zwei theme-color-Angaben (hell und dunkel)', metas);
    ok(metas.every(m => m.c === '#111110'), 'dunkles System: theme-color ist die dunkle Hintergrundfarbe', metas);
    await p.tap('#thema'); await p.waitForTimeout(150);
    ok((await p.$$eval('meta[name="theme-color"]', es => es.map(e => e.content))).every(c => c === '#f4f4f2'), 'Design umschalten: theme-color folgt (hell)');
    await p.tap('#thema'); await p.waitForTimeout(150);
    ok((await p.$$eval('meta[name="theme-color"]', es => es.map(e => e.content))).every(c => c === '#111110'), 'Design zurückschalten: theme-color folgt (dunkel)');
    await p.evaluate(() => { const s = document.documentElement.style; s.setProperty('--sa-b', '34px'); s.setProperty('--sa-l', '47px'); s.setProperty('--sa-r', '47px'); s.setProperty('--sa-t', '47px'); });
    await p.waitForTimeout(100);
    const sa = await p.evaluate(() => { const n = document.getElementById('sprung'), m = document.querySelector('main'), ms = getComputedStyle(m), ns = getComputedStyle(n);
      return { navPad: ns.paddingBottom, navH: Math.round(n.getBoundingClientRect().height), navL: ns.paddingLeft, mL: ms.paddingLeft, mR: ms.paddingRight, mT: ms.paddingTop, mB: parseFloat(ms.paddingBottom), breit: document.documentElement.scrollWidth <= innerWidth }; });
    ok(sa.navPad === '34px' && sa.navH >= 52 + 34 && sa.navH <= 52 + 34 + 1 && sa.navL === '47px' && sa.mL === '47px' && sa.mR === '47px' && sa.mT === '47px' && sa.mB >= 52 + 34 + 28 && sa.breit, 'sichere Ränder (Kerbe 47 px, Home-Balken 34 px): Sprungleiste und Inhalt weichen aus, kein Überstand', sa);
    ok(p.info.fehler.length === 0, 'sichere Ränder: keine Konsolenfehler', p.info.fehler);
    await zu(p);
    const q = await seite('voll', { w: 390, h: 844, reduziert: true });
    ok(await q.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior) === 'auto', 'reduzierte Bewegung: Sprung ohne weiches Scrollen');
    await zu(q);
    const r = await seite('voll', { w: 390, h: 844 });
    ok(await r.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior) === 'smooth', 'sonst: weiches Scrollen zu den Abschnitten');
    await zu(r);
  }
  }

  // ───────── 4. Größenänderung: Höhe allein zeichnet nicht neu, Breite schon; Schwelle 700 px ─────────
  if (lauf(4)) {
  {
    const p = await seite('voll', { w: 390, h: 844 });
    await p.evaluate(() => document.getElementById('u-konto').setAttribute('data-m', '1'));
    await p.setViewportSize({ width: 390, height: 760 }); await p.waitForTimeout(450);
    ok(await p.evaluate(() => document.getElementById('u-konto').getAttribute('data-m')) === '1', 'nur die Höhe ändert sich (Adressleiste klappt ein): die Übersicht wird nicht neu gezeichnet');
    await p.setViewportSize({ width: 412, height: 915 }); await p.waitForFunction(() => gezeichneteBreite === 412, null, { timeout: 5000 }); await p.waitForTimeout(200);
    const nach = await p.evaluate(() => ({ m: document.getElementById('u-konto').getAttribute('data-m'), vb: +document.querySelector('#u-kurve svg').getAttribute('viewBox').split(' ')[2], karte: document.getElementById('u-kurve').clientWidth }));
    ok(nach.m === null && nach.vb === nach.karte, 'Breite ändert sich (Drehen): neu gezeichnet, die Kurve wird für die neue Breite gezeichnet (viewBox = Behälterbreite)', nach);
    await p.setViewportSize({ width: 800, height: 900 }); await p.waitForFunction(() => gezeichneteBreite === 800, null, { timeout: 5000 }); await p.waitForTimeout(200);
    const breit = await p.evaluate(() => ({ nav: getComputedStyle(document.getElementById('sprung')).display, details: document.querySelectorAll('details.sat-regel').length, absatz: document.querySelectorAll('p.sat-regel').length, scroll: document.documentElement.scrollWidth <= innerWidth }));
    ok(breit.nav === 'none' && breit.details === 0 && breit.absatz === 2 && breit.scroll, 'ab 701 px: keine Sprungleiste, Spielregeln (Satellit und Labor) als Absätze, kein Überstand', breit);
    await p.setViewportSize({ width: 640, height: 360 }); await p.waitForFunction(() => gezeichneteBreite === 640, null, { timeout: 5000 }); await p.waitForTimeout(200);
    const quer = await p.evaluate(() => ({ nav: getComputedStyle(document.getElementById('sprung')).display, scroll: document.documentElement.scrollWidth <= innerWidth, ueb: 0 }));
    ok(quer.nav === 'grid' && quer.scroll, 'Handy quer (640×360): Sprungleiste da, kein seitliches Scrollen', quer);
    ok(p.info.fehler.length === 0, 'Größenänderungen: keine Konsolenfehler', p.info.fehler);
    await zu(p);
  }
  }

  // ───────── 5. Weitere Fälle am Handy: Echtgeld, lange Zahlen, keine Daten, Server weg ─────────
  if (lauf(5)) {
  for (const [w, h] of GROESSEN) {
    const T = `${w}×${h}`;
    let p = await seite('echtgeld', { w, h });
    const eg = await p.evaluate(() => ({ band: document.querySelector('.band').classList.contains('echtgeld'), rand: getComputedStyle(document.querySelector('.band')).borderTopWidth, farbe: getComputedStyle(document.querySelector('.band')).borderTopColor, modus: document.getElementById('modus').innerText, label: document.querySelector('#uebersicht .u8 .u-label').innerText }));
    ok(eg.band && eg.rand === '4px' && eg.modus.includes('ECHTGELD') && eg.label.includes('ECHTGELD'), `${T}: Echtgeld: roter Streifen oben, «ECHTGELD» in Pille und Konto-Karte`, eg);
    await zu(p);

    p = await seite('gross', { w, h });
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${T}: Millionenkonto: kein seitliches Scrollen`);
    const ue = await p.evaluate(ueberstand); ok(ue.length === 0, `${T}: Millionenkonto: nichts ragt aus dem Fenster`, ue);
    const gr = await p.evaluate(() => ({ konto: document.getElementById('u-konto').innerText.replace(/\s+/g, ' ').replace(/[‘’]/g, "'").trim(), voll: document.getElementById('u-konto').scrollWidth <= document.getElementById('u-konto').clientWidth + 1, chips: [...document.querySelectorAll('.chip b')].every(b => b.scrollWidth <= b.clientWidth + 1 && b.getBoundingClientRect().right <= b.closest('.chip').getBoundingClientRect().right + 1) }));
    ok(gr.konto === "1'234'567.89 USDT" && gr.voll && gr.chips, `${T}: Millionenkonto «1'234'567.89 USDT» und die vier Kacheln passen in ihre Kästen`, gr);
    await zu(p);

    p = await seite('leer', { w, h });
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && (await text(p, '#uebersicht .u12')).includes('Keine offene Position des Piloten'), `${T}: keine Positionen: ehrlicher Text, kein Überstand`);
    ok(await p.$eval('#sprung a[data-ziel="u-positionen"]', e => !!document.getElementById(e.dataset.ziel)), `${T}: auch ohne Positionen gibt es das Sprungziel «Positionen»`);
    await zu(p);

    p = await seite('daten_fehlen', { w, h });
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && (await text(p, '#uebersicht')).includes('kein Kontostand'), `${T}: Daten fehlen: ehrliche Hinweise, kein Überstand`);
    const ziele = await p.$$eval('#sprung a[data-ziel]', es => es.map(e => [e.dataset.ziel, !!document.getElementById(e.dataset.ziel)]));
    ok(ziele.every(z => z[1]), `${T}: Daten fehlen: alle fünf Sprungziele existieren trotzdem`, ziele);
    ok(p.info.fehler.length === 0, `${T}: Daten fehlen: keine Konsolenfehler`, p.info.fehler);
    await zu(p);
  }
  for (const [w, h] of GROESSEN) for (const thema of ['dunkel', 'hell']) for (const fall of ['leer', 'echtgeld', 'daten_fehlen']) {
    const T = `${w}×${h} ${thema} ${fall}`;
    const p = await seite(fall, { w, h, thema });
    await p.tap('#ampel'); await p.waitForTimeout(80);
    const kn = await p.evaluate(kontrast), tf = await p.evaluate(() => [...document.querySelectorAll('.band button, .band a[href], .status-zeile button, #uebersicht button, #uebersicht a[href], #uebersicht summary, #ampelListe summary, #sprung a')]
      .filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); })
      .map(e => { const r = e.getBoundingClientRect(); return { n: (e.id || String(e.className) || e.tagName).slice(0, 24), b: Math.round(r.width), h: Math.round(r.height) }; }).filter(z => Math.min(z.b, z.h) < 44));
    ok(kn.length === 0, `${T}: Kontrast ≥ 4,5:1 (gross ≥ 3:1) auch im Sonderfall`, kn.slice(0, 5));
    ok(tf.length === 0, `${T}: jede Tippfläche mindestens 44 px (kleinste Seite), auch Sprungleiste und Hinweis-Knöpfe`, tf);
    ok(p.info.fehler.length === 0, `${T}: keine Konsolenfehler`, p.info.fehler);
    await zu(p);
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), q = await ctx.newPage();
    await q.route('**/*', r => new URL(r.request().url()).pathname.startsWith('/api/') ? r.abort() : r.continue());
    await q.goto(BASIS); await q.waitForTimeout(900);
    ok((await text(q, '#uebersicht')).includes('Cockpit-Server nicht erreichbar') && await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Server weg am Handy: Hinweis statt Absturz, kein Überstand');
    await ctx.close();
  }
  }

  // ───────── 6. Desktop bleibt Desktop: keine Sprungleiste, echte Tabellen, Blasen-Knöpfe nur am Handy ─────────
  if (lauf(6)) {
  {
    const p = await seite('voll', { w: 1440, h: 900, touch: false });
    const d = await p.evaluate(() => ({ nav: getComputedStyle(document.getElementById('sprung')).display, tab: [...document.querySelectorAll('table')].map(t => getComputedStyle(t).display), band: getComputedStyle(document.querySelector('.band')).position,
      live: getComputedStyle(document.querySelector('.band-rechts a.pill')).display, mk: getComputedStyle(document.querySelector('.mk-live')).display, hinw: [...document.querySelectorAll('.hinw.nur-handy')].every(e => getComputedStyle(e).display === 'none'), absatz: getComputedStyle(document.querySelector('[aria-label="Engagement"] .nur-gross')).display, regel: document.querySelectorAll('p.sat-regel').length,
      thema: document.getElementById('thema').closest('.status-zeile') ? 'status' : 'anders', zaehler: getComputedStyle(document.getElementById('ampelZaehler')).display }));
    ok(d.nav === 'none' && d.tab.every(t => t === 'table') && d.band === 'sticky' && d.live !== 'none' && d.mk === 'none' && d.hinw && d.absatz !== 'none' && d.regel === 2 && d.thema === 'status' && d.zaehler === 'none', 'Desktop unverändert: keine Sprungleiste, echte Tabellen, klebendes Kopfband, Live-Markt im Kopf, Absatz statt Hinweis-Knopf, Zähler nur am Handy', d);
    // Stern-Knopf funktioniert auch mit der Maus; title bleibt für den Mauszeiger
    await p.click('.chip .hinw.stern'); await p.waitForTimeout(100);
    ok(await p.$eval('#blase', e => !e.hidden) && await p.$eval('.chip .hinw.stern', e => e.title.startsWith('Kein gemerkter Stand')), 'Desktop: der Stern-Knopf öffnet die Blase mit der Maus; title bleibt');
    await zu(p);
  }
  }

  await browser.close(); server.close();
  console.log(`\n${passes} bestanden, ${fails} fehlgeschlagen`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ABSTURZ', e); process.exit(2); });
