/**
 * Browser-Tests (Playwright, Chromium) für die Ansicht «Auf dem Produkt» des Editors v6.2.0 (WP3): Zeichenreihenfolge und Lage gemessen an Pixeln, Adapter für Tasse und Poster,
 * ehrlicher Hinweis bei Stickerei und Rundum-Druck, Rückfall auf die Druckfläche bei fehlendem Bild und bei CORS-Fehler, JPEG-Export, Eigenschaft «_vorschau», Kontrast-Hinweis, Zeichenzeit.
 * Die Vorschaudaten kommen vom echten Werkzeug werkzeug/vorschau_daten_bauen.mjs (der Test-Server baut sie aus den Test-Katalogen im Repo); die Vorlagenbilder sind Nachbauten
 * (lib.mjs: geisterPng, tassePng) mit der Struktur der echten Printful-Bilder. Netz: nur der lokale Server.
 * Aufruf: node vorschau_test.mjs [Teil]   (Teil: Name oder Anfang eines Szenarios; ohne Angabe alle; «kern» = die schnellen für die Mutationsprobe)
 * Umgebung: V6_DATEI (andere Fassung des Editors, für die Mutationsprobe).
 */
import { playwright, starteServer, seiteOeffnen, editorBereit, pngRauschen, geisterPng, GEISTER_RECHTECK, tassePng, TASSE_FOTO } from './lib.mjs';
import { dateienAusEigenschaften } from '../../../automation/lib/printful_bestellweg.mjs';

const { chromium } = playwright();
let n = 0; const fehler = [];
function pruefe(name, ok, detail = '') { n++; if (!ok) { fehler.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); if (process.env.V6_ABBRUCH) process.exit(1); } }   // V6_ABBRUCH=1 (nur Mutationsprobe): beim ersten Fehler beenden, das genügt zum Erkennen
function nahe(name, ist, soll, eps) { pruefe(name, Math.abs(ist - soll) <= eps, `ist=${ist} soll=${soll} (±${eps})`); }
const nur = process.argv[2] || '';
const szenarien = [];
function szenario(name, kern, fn) { szenarien.push({ name, kern, fn }); }

const PC = { breite: 1440, hoehe: 900 };
const MOBIL = { breite: 390, hoehe: 844, mobil: true };
/** Test-Varianten des T-Shirts 71: weiss (#ffffff), schwarz (#0c0c0c), pink (#c02773), laut Farbtabelle der Karte. */
const SHOP = 'shop=1001:4012,1002:4020,1003:4045';
const TASSE = 'karte=19&shop=1001:1320,1002:4830,1003:16586&vorschau=19';
const TSHIRT = `karte=71&${SHOP}&vorschau=71`;
/** Modell 1592 (echter Katalog, im Repo unter testdaten/katalog): Vorder- und Rückseite haben ein festes Farbfoto als Vorlage bei 9 Farben, das Etikett innen hat eine Hintergrundfarbe. */
const FARBFEST = 'karte=1592&shop=1001:50079,1002:50077,1003:50082&vorschau=1592&varianten=1001:Black,1002:White,1003:DarkGrey';
/** Vorschaudaten eines Modells vom Test-Server holen, in der Seite verändern und dem Editor geben (für Fälle, die der Bauer nicht erzeugt: fremde oder ältere Daten). */
async function datenSetzen(p, modell, aendern) {
  return p.evaluate(async ([m, fn]) => {
    const roh = await (await fetch('/vorschau/' + m + '.json?spiegel=1')).json();
    // eslint-disable-next-line no-new-func
    new Function('d', fn)(roh);
    return window.LSPOD6.editors[0].vorschauDatenSetzen(roh);
  }, [modell, aendern]);
}
/** Grau, das auf Weiss (Leuchtdichte 1) das Kontrastverhältnis `v` ergibt (WCAG-Formel). */
function grauFuerVerhaeltnis(v) {
  const l = 1.05 / v - 0.05;
  const c = l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  const h = Math.round(c * 255).toString(16).padStart(2, '0');
  return '#' + h + h + h;
}
const GEISTER_OHNE_SPIEGEL = { printfulBild: (u) => (/\/m\//.test(u) ? { typ: 'image/png', body: geisterPng() } : null) };

async function oeffnen(b, srv, query, opt = {}) {
  const s = await seiteOeffnen(b, srv.url, { ...PC, ...opt, query });
  await editorBereit(s.page);
  return s;
}
const sichtWarten = (p) => p.waitForSelector('[data-feld="sicht"]:not([hidden])', { timeout: 10000 });
async function textHinzufuegen(p, text) {
  await p.getByRole('button', { name: '➕ Text' }).click();
  await p.locator('.lsp6-text').fill(text);
}
async function produktAnsicht(p) {
  const vorher = Number(await p.locator('.lsp6-pv').getAttribute('data-gezeichnet')) || 0;
  await p.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await p.waitForFunction((v) => (Number(document.querySelector('.lsp6-pv').getAttribute('data-gezeichnet')) || 0) > v, vorher, { timeout: 10000 });
}
/** Platzierung auf eine neue Leinwand px × px zeichnen (die Leinwand bleibt in window.__cv zum Lesen der Pixel). */
async function zeichne(p, o = {}) {
  return p.evaluate(async (a) => {
    const ed = window.LSPOD6.editors[0];
    const cv = document.createElement('canvas'); cv.width = a.px || 800; cv.height = a.px || 800;
    const opt = { overlay: a.overlay };
    if (a.platz) opt.p = ed.karte.platzierungen.find((x) => x.id === a.platz);
    const r = await ed.vorschauZeichnen(cv, opt);
    window.__cv = cv;
    return { ok: r.ok, grund: r.grund || null, ms: r.ms || 0, stoff: r.stoff || null };
  }, o);
}
const pixel = (p, pts) => p.evaluate((q) => q.map(([x, y]) => Array.from(window.__cv.getContext('2d').getImageData(x, y, 1, 1).data)), pts);
/** Umriss der dunklen Pixel (Helligkeit unter `schwelle`) in einem Rechteck der Leinwand; zaehlt auch die hellsten Pixel (für weisse Schrift auf Schwarz). */
const umriss = (p, r, schwelle = 110, hell = false) => p.evaluate(([rect, sw, h]) => {
  const c = window.__cv.getContext('2d'); const d = c.getImageData(rect[0], rect[1], rect[2], rect[3]).data;
  let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, cnt = 0, maxHell = 0;
  for (let y = 0; y < rect[3]; y++) for (let x = 0; x < rect[2]; x++) {
    const i = (y * rect[2] + x) * 4; const v = (d[i] + d[i + 1] + d[i + 2]) / 3; if (v > maxHell) maxHell = v;
    if (h ? v > sw : v < sw) { cnt++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  }
  return { cnt, minx: minx + rect[0], maxx: maxx + rect[0], miny: miny + rect[1], maxy: maxy + rect[1], maxHell };
}, [r, schwelle, hell]);
const nah = (a, b, e) => a.every((x, i) => Math.abs(x - b[i]) <= e);
const G = GEISTER_RECHTECK;
// Lage des T-Shirts 71 «front» auf 800 × 800 (Vorlage 3000 × 3000, Druckfläche 1006/530, 1010 × 1346): Massstab 800/3000
const S = 800 / 3000;
const FL = { ax: 1006 * S, ay: 530 * S, aw: 1010 * S, ah: 1346 * S };

// ── 1. Umschalter, Sichtbarkeit, Wechsel der Ansicht ────────────────────────────────────────────
szenario('umschalter', true, async (b, srv) => {
  const o = await oeffnen(b, srv, `karte=71&${SHOP}`);   // ohne Vorschaudaten
  pruefe('ohne Vorschaudaten gibt es keinen Umschalter', await o.page.locator('[data-feld="sicht"]').isHidden());
  pruefe('ohne Vorschaudaten bleibt die Bühne', await o.page.locator('.lsp6-stagewrap').isVisible() && await o.page.locator('.lsp6-pvwrap').isHidden());
  await o.schliessen();
  const s = await oeffnen(b, srv, TSHIRT);
  const p = s.page;
  await sichtWarten(p);
  const knoepfe = await p.locator('.lsp6-sbtn').allInnerTexts();
  pruefe('Umschalter «Druckfläche» und «Auf dem Produkt»', knoepfe.join('|') === 'Druckfläche|Auf dem Produkt', knoepfe.join('|'));
  pruefe('Vorgabe: Druckfläche gewählt, Produktansicht verborgen', (await p.locator('.lsp6-sbtn[data-sicht="druck"]').getAttribute('aria-pressed')) === 'true' && await p.locator('.lsp6-pvwrap').isHidden());
  const hoch = await p.locator('.lsp6-sbtn').evaluateAll((e) => e.map((x) => x.getBoundingClientRect().height));
  pruefe('Umschalter mindestens 44 px hoch', hoch.every((h) => h >= 44), hoch.join(','));
  await textHinzufuegen(p, 'Hallo');
  await produktAnsicht(p);
  pruefe('Produktansicht: Canvas sichtbar, Bühne verborgen', await p.locator('.lsp6-pv').isVisible() && await p.locator('.lsp6-stagewrap').isHidden());
  pruefe('Produktansicht: Umschalter zeigt den Zustand an (aria-pressed)', (await p.locator('.lsp6-sbtn[data-sicht="produkt"]').getAttribute('aria-pressed')) === 'true' && (await p.locator('.lsp6-sbtn[data-sicht="druck"]').getAttribute('aria-pressed')) === 'false');
  const cv = await p.locator('.lsp6-pv').evaluate((c) => ({ w: c.width, h: c.height, b: c.getBoundingClientRect().width, label: c.getAttribute('aria-label') }));
  pruefe('Canvas quadratisch und lesbar beschriftet', cv.w === cv.h && cv.w >= 300 && cv.w <= 1000 && /Vorschau/.test(cv.label), JSON.stringify(cv));
  pruefe('Hinweis «Annäherung» steht unter der Vorschau, kein Gedankenstrich', /Annäherung/.test(await p.locator('.lsp6-pvwrap').innerText()) && !/—/.test(await p.locator('.lsp6').innerText()));
  await p.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  pruefe('zurück: Bühne wieder da, die Ebene ist unverändert', await p.locator('.lsp6-stagewrap').isVisible() && await p.locator('.lsp6-layer').count() === 1);
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // inline statt Datei
  const t = await oeffnen(b, srv, `${TSHIRT}&vorschauinline=1`);
  await sichtWarten(t.page);
  pruefe('Vorschaudaten auch als <script id="lspod-vorschau"> im Container', await t.page.locator('[data-feld="sicht"]').isVisible());
  await t.schliessen();
  // Handy
  const m = await seiteOeffnen(b, srv.url, { ...MOBIL, query: TSHIRT });
  await editorBereit(m.page); await sichtWarten(m.page);
  await textHinzufuegen(m.page, 'Hi');
  await produktAnsicht(m.page);
  const mb = await m.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, pv: document.querySelector('.lsp6-pv').getBoundingClientRect().width }));
  pruefe('Handy 390 px: kein seitliches Scrollen, Canvas passt in die Breite', mb.sw <= mb.cw && mb.pv <= mb.cw, JSON.stringify(mb));
  pruefe('Handy: keine Seitenfehler', m.fehler.length === 0, m.fehler.join(' | '));
  await m.schliessen();
});

// ── 2. Zeichenreihenfolge und Lage (T-Shirt 71) ─────────────────────────────────────────────────
szenario('flach-komposition', true, async (b, srv) => {
  const s = await oeffnen(b, srv, TSHIRT);
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Hallo');
  const r = await zeichne(p);
  pruefe('Zeichnen gelingt', r.ok, JSON.stringify(r));
  pruefe('Stoffe: die Farbe der Variante 4012 ist weiss', r.stoff === '#ffffff', r.stoff);
  const [aussen, stoff, falte] = await pixel(p, [[50, 50], [220, 400], [400, 650]]);
  pruefe('ausserhalb des Kleidungsstücks opakes Weiss (Vorlagenbild liegt darüber)', nah(aussen, [255, 255, 255, 255], 1), aussen.join(','));
  const schatten = Math.round(255 * (1 - G.alpha / 255));
  pruefe(`Stoff weiss: Schatten des Vorlagenbildes darüber (255 → ${schatten})`, nah(stoff, [schatten, schatten, schatten, 255], 2), stoff.join(','));
  const fa = Math.round(255 * (1 - G.alphaFalte / 255));
  pruefe(`Falte im Vorlagenbild dunkelt den Stoff ab (255 → ${fa})`, nah(falte, [fa, fa, fa, 255], 3), falte.join(','));
  // Lage des Designs: Mitte der Druckfläche, 42 % von oben (Text startet bei cx 0,5, cy 0,42)
  const u = await umriss(p, [Math.floor(FL.ax), Math.floor(FL.ay), Math.ceil(FL.aw), Math.ceil(FL.ah)]);
  pruefe('Text gezeichnet', u.cnt > 80, JSON.stringify(u));
  nahe('Text mittig in der Druckfläche (x, bei 800 px)', (u.minx + u.maxx) / 2, FL.ax + FL.aw / 2, 4);
  nahe('Text bei 42 % der Druckfläche (y)', (u.miny + u.maxy) / 2, FL.ay + 0.42 * FL.ah, 10);
  pruefe('Text liegt in der Druckfläche', u.minx >= FL.ax && u.maxx <= FL.ax + FL.aw && u.miny >= FL.ay && u.maxy <= FL.ay + FL.ah);
  // Beschnitten auf die Druckfläche: ein Motiv, das darüber hinausragt, bleibt ausserhalb der Fläche unsichtbar
  await p.evaluate(() => { const e = window.LSPOD6.editors[0].st.ebenen.front[0]; e.cx = 0.02; e.text = 'MMMMMMMM'; e.scale = 2.6; });
  await zeichne(p);
  const rand = await umriss(p, [Math.floor(FL.ax) - 60, Math.floor(FL.ay), 60, Math.ceil(FL.ah)]);
  pruefe('Motiv über dem linken Rand der Druckfläche wird beschnitten (links davon keine dunklen Pixel)', rand.cnt === 0, JSON.stringify(rand));
  await p.evaluate(() => { const e = window.LSPOD6.editors[0].st.ebenen.front[0]; e.cx = 0.5; e.text = 'Hallo'; e.scale = 0.55; });
  // Farbe der gewählten Variante: schwarz und pink
  await p.locator('input[name="id"][value="1002"]').check();
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.pfVariante === 4020);
  await zeichne(p);
  const [sw] = await pixel(p, [[220, 400]]);
  const sch = Math.round(12 * (1 - G.alpha / 255));
  pruefe(`Stoff schwarz (#0c0c0c): ${sch}`, nah(sw, [sch, sch, sch, 255], 2), sw.join(','));
  await p.locator('input[name="id"][value="1003"]').check();
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.pfVariante === 4045);
  await zeichne(p);
  const [pk] = await pixel(p, [[220, 400]]);
  const k = 1 - G.alpha / 255;
  pruefe('Stoff pink (#c02773) mit Schatten', nah(pk, [Math.round(192 * k), Math.round(39 * k), Math.round(115 * k), 255], 2), pk.join(','));
  await p.locator('input[name="id"][value="1001"]').check();
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.pfVariante === 4012);
  // Reihenfolge: liegt die Vorlage HINTER dem Druck (vorderansicht false), ist weisse Schrift an der Falte nicht abgedunkelt
  await p.locator('input[name="id"][value="1002"]').check();
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.pfVariante === 4020);
  await p.evaluate(() => { const e = window.LSPOD6.editors[0].st.ebenen.front[0]; e.color = '#ffffff'; e.text = 'IIIII'; e.scale = 2.2; e.bold = true; });
  await zeichne(p);
  const falteBand = [Math.floor(384), Math.floor(FL.ay), 31, Math.ceil(FL.ah)];
  const vorn = await umriss(p, falteBand, 100, true);
  await p.evaluate(() => { window.LSPOD6.editors[0].karte.platzierungen[0].vorlage.vorderansicht = false; });
  await zeichne(p);
  const hinten = await umriss(p, falteBand, 100, true);
  pruefe('Vorlage über dem Druck: weisse Schrift an der Falte gedämpft (höchstens ~ 255 · (1 − α))', vorn.maxHell <= 255 * (1 - G.alphaFalte / 255) + 6 && vorn.maxHell > 150, `${vorn.maxHell}`);
  pruefe('Vorlage unter dem Druck: weisse Schrift voll weiss, nicht abgedunkelt', hinten.maxHell >= 250, `${hinten.maxHell}`);
  await p.evaluate(() => { window.LSPOD6.editors[0].karte.platzierungen[0].vorlage.vorderansicht = true; });
  // multiply (nur für die Messung gegen Printful): das Weiss des Vorlagenbildes färbt die Stofffarbe, darum gilt im Editor «normal»
  await p.evaluate(() => { const e = window.LSPOD6.editors[0].st.ebenen.front[0]; e.color = '#111111'; e.text = 'Hallo'; e.scale = 0.55; });
  const mul = await zeichne(p, { overlay: 'multiply' });
  const [mAussen] = await pixel(p, [[50, 50]]);
  pruefe('mit multiply wäre das Weiss ausserhalb des Kleidungsstücks schwarz (Stofffarbe): darum ist «normal» die Vorgabe', mul.ok && mAussen[0] < 30, mAussen.join(','));
  const stdr = await zeichne(p);
  const [sAussen, sInnen] = await pixel(p, [[50, 50], [Math.round(G.x0 * 0.8 + 60), 400]]);
  pruefe('Standardmodus, schwarze Variante: ausserhalb des Kleidungsstücks bleibt das Weiss der Vorlage weiss (Vorlage wird normal darübergelegt, nie multipliziert)', stdr.ok && nah(sAussen, [255, 255, 255, 255], 1), sAussen.join(','));
  pruefe('Standardmodus, schwarze Variante: im Kleidungsstück schimmert die Stofffarbe durch den Schatten (dunkel, nicht weiss)', sInnen[0] < 40, sInnen.join(','));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 3. Platzierungs-Reiter wechselt die Vorlage; Bilder kommen vom Spiegel ──────────────────────
szenario('reiter-vorlage', true, async (b, srv) => {
  const s = await oeffnen(b, srv, TSHIRT);
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Vorne');
  await produktAnsicht(p);
  const spiegel = () => [...new Set(s.bildAnfragen.filter((u) => /cdn\.shopify\.com\/s\/files\/test\/luxe-vorschau-/.test(u)))];
  pruefe('das Vorlagenbild kommt vom Spiegel auf Shopify Files, nicht von Printful (für die Zeichenfläche)', spiegel().length === 1, spiegel().join(','));
  const vorher = Number(await p.locator('.lsp6-pv').getAttribute('data-gezeichnet'));
  await p.locator('.lsp6-tab', { hasText: 'Rückseite' }).click();
  await p.waitForFunction((v) => Number(document.querySelector('.lsp6-pv').getAttribute('data-gezeichnet')) > v, vorher, { timeout: 10000 });
  pruefe('Reiter «Rückseite»: die Vorschau wird neu gezeichnet', Number(await p.locator('.lsp6-pv').getAttribute('data-gezeichnet')) > vorher);
  // die Anfrage nach dem zweiten Vorlagenbild darf dem Zählerstand um einen Augenblick hinterherhinken: bis zu 5 s abwarten (nie ein Schlag auf die Uhrzeit)
  for (let i = 0; i < 50 && spiegel().length < 2; i++) await p.waitForTimeout(100);
  pruefe('Reiter «Rückseite»: eine andere Vorlage (zweites Bild vom Spiegel)', spiegel().length === 2, spiegel().join(','));
  pruefe('Produktansicht bleibt beim Reiterwechsel gewählt', await p.locator('.lsp6-pv').isVisible());
  // das Vorne-Motiv liegt nicht auf der Rückseite: dort ist nur Stoff
  const r = await zeichne(p);
  const u = await umriss(p, [0, 0, 800, 800], 60);
  pruefe('Rückseite ohne Ebenen zeigt kein Motiv', r.ok && u.cnt === 0, JSON.stringify(u));
  await s.schliessen();
  // ohne Spiegel (null): die Printful-Adresse unter /m/ (sendet CORS) genügt
  const t = await oeffnen(b, srv, `${TSHIRT}&spiegel=0`, GEISTER_OHNE_SPIEGEL);
  await sichtWarten(t.page);
  await textHinzufuegen(t.page, 'Hallo');
  await produktAnsicht(t.page);
  pruefe('ohne Spiegel wird die Printful-Adresse geladen, nicht der Spiegel', t.bildAnfragen.some((u) => /files\.cdn\.printful\.com\/m\/.*ghost\/front/.test(u)) && !t.bildAnfragen.some((u) => /luxe-vorschau-/.test(u)));
  pruefe('ohne Spiegel: keine Seitenfehler', t.fehler.length === 0, t.fehler.join(' | '));
  await t.schliessen();
});

// ── 4. Tasse: Zylinder ───────────────────────────────────────────────────────────────────────────
szenario('tasse', true, async (b, srv) => {
  const s = await oeffnen(b, srv, TASSE);
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Hallo');
  const r = await zeichne(p);
  pruefe('Tasse 11 oz: Zeichnen gelingt', r.ok, JSON.stringify(r));
  // Ausschnitt [0,165,700,700] auf 800 × 800: k = 800/700 · 0,96
  const k = (800 / 700) * 0.96, off = (800 - 700 * k) / 2;
  const T1 = TASSE_FOTO;
  const mitteX = off + 407 * k;
  const [grund, koerper, henkelLoch] = await pixel(p, [[8, 8], [Math.round(off + 560 * k), Math.round(off + (640 - 165) * k)], [Math.round(off + 150 * k), Math.round(off + (520 - 165) * k)]]);
  pruefe('Grund ausserhalb der Tasse weiss', nah(grund, [255, 255, 255, 255], 1), grund.join(','));
  pruefe('Körper der Tasse: Katalogfoto multipliziert, hellgrau (236), wo kein Motiv liegt', nah(koerper, [236, 236, 236, 255], 2), koerper.join(','));
  pruefe('Innenraum des Henkels bleibt weiss', nah(henkelLoch, [255, 255, 255, 255], 1), henkelLoch.join(','));
  const y0 = off + (290 - 165) * k, y1 = off + (735 - 165) * k;
  const u = await umriss(p, [Math.floor(off + T1.x0 * k) + 2, Math.floor(y0), Math.floor((T1.x1 - T1.x0) * k) - 4, Math.floor(y1 - y0)], 100);
  pruefe('Motiv auf dem Zylinder gezeichnet', u.cnt > 100, JSON.stringify(u));
  nahe('Motiv mittig auf dem Körper (x)', (u.minx + u.maxx) / 2, mitteX, 8);
  nahe('Motiv bei 42 % der Druckhöhe (y)', (u.miny + u.maxy) / 2, y0 + 0.42 * (y1 - y0), 14);
  // Zylinder: das Motiv wird zum Rand hin schmaler (Zeichen in der Mitte breiter als am Rand)
  await p.evaluate(() => { const e = window.LSPOD6.editors[0].st.ebenen.default[0]; e.text = 'I  I  I  I  I'; e.scale = 1.6; e.ls = 0.1; });
  await zeichne(p);
  const mitte = await umriss(p, [Math.floor(mitteX - 30), Math.floor(y0), 60, Math.floor(y1 - y0)], 100);
  pruefe('Motiv auf dem Zylinder trägt (mehr dunkle Pixel in der Mitte)', mitte.cnt > 50, JSON.stringify(mitte));
  // alle drei Grössen: Eichung greift, auch wenn das Foto in anderer Pixelgrösse kommt (Skalierung fx, fy)
  for (const [val, name] of [['1002', '15 oz'], ['1003', '20 oz']]) {
    await p.locator(`input[name="id"][value="${val}"]`).check();
    await p.waitForFunction((v) => window.LSPOD6.editors[0].st.shopVariante === v, val);
    const q = await zeichne(p);
    pruefe(`Tasse ${name}: Zeichnen gelingt`, q.ok, JSON.stringify(q));
    const e = await p.evaluate(async () => { const blob = await window.LSPOD6.editors[0].vorschauExport(); return blob ? { typ: blob.type, size: blob.size } : null; });
    pruefe(`Tasse ${name}: JPEG-Export gelingt ohne SecurityError`, !!e && e.typ === 'image/jpeg' && e.size > 500 && e.size <= 81920, JSON.stringify(e));
  }
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // Tassenfoto nicht gespiegelt (null): Printful sendet für /products/ keinen CORS-Kopf (GEMESSEN). Es gibt dann gar keine Ansicht, aber einen klaren Hinweis (kein stiller Rückprall, kein Bildaufruf)
  const t = await oeffnen(b, srv, `${TASSE}&spiegel=0`, { corsErwartet: true, printfulBild: (u) => (/\/products\//.test(u) ? { typ: 'image/png', body: tassePng(), cors: false } : null) });
  await sichtWarten(t.page);
  await textHinzufuegen(t.page, 'Hallo');
  await t.page.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await t.page.locator('[data-feld="produktinfo"]').waitFor({ state: 'visible', timeout: 8000 });
  const ti = await t.page.locator('[data-feld="produktinfo"]').innerText();
  pruefe('Tasse ohne gespiegeltes Foto: klarer Hinweis «keine Produktvorschau» mit Verweis auf die Druckfläche (kein Rückprall)', /keine Produktvorschau/.test(ti) && /Druckfläche/.test(ti) && (await t.page.evaluate(() => window.LSPOD6.editors[0].st.sicht)) === 'produkt' && await t.page.locator('.lsp6-pv').isHidden(), ti);
  pruefe('Tasse ohne gespiegeltes Foto: das Katalogfoto (ohne CORS) wird gar nicht erst angefordert', !t.bildAnfragen.some((u) => /\/products\//.test(u)), JSON.stringify(t.bildAnfragen));
  const ex = await t.page.evaluate(async () => { const b2 = await window.LSPOD6.editors[0].vorschauExport(); return b2 ? b2.size : null; });
  pruefe('Tasse ohne gespiegeltes Foto: kein JPEG (die Zeichenfläche wäre verschmutzt)', ex === null, String(ex));
  await Promise.all([t.page.waitForURL('**/cart', { timeout: 20000 }), t.page.locator('.lsp6-cta').click()]);
  pruefe('Tasse ohne gespiegeltes Foto: Kauf ohne _vorschau und ohne JPEG', t.warenkorb.length === 1 && !('_vorschau' in t.warenkorb[0].properties) && !t.uploads.some((u) => u.typ === 'jpeg'));
  pruefe('Tasse ohne Spiegel: keine Seitenfehler', t.fehler.length === 0, t.fehler.join(' | '));
  await t.schliessen();
  // Daten mit Spiegel-Adresse, die nicht lädt (404 auf Shopify Files): sauberer Rückfall auf die Druckfläche mit dem ruhigen Hinweis
  const kp = await oeffnen(b, srv, TASSE, { shopifyBild: (x) => (/kaputt-tasse/.test(x) ? { status: 404 } : null) });
  await sichtWarten(kp.page);
  await textHinzufuegen(kp.page, 'Hallo');
  await datenSetzen(kp.page, 19, "for (const t of Object.values(d.modelle[19].tasse)) t.foto = 'https://cdn.shopify.com/s/files/test/kaputt-tasse.jpg';");
  await kp.page.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await kp.page.waitForFunction(() => document.querySelector('[data-feld="sichthinweis"]').textContent.length > 0, null, { timeout: 12000 });
  pruefe('Tasse: gespiegeltes Foto lädt nicht (404): Rückfall auf die Druckfläche mit ruhigem Hinweis', (await kp.page.evaluate(() => window.LSPOD6.editors[0].st.sicht)) === 'druck' && /nicht verfügbar/.test(await kp.page.locator('[data-feld="sichthinweis"]').innerText()) && await kp.page.locator('.lsp6-stagewrap').isVisible());
  pruefe('Tasse mit kaputtem Spiegel: keine Seitenfehler', kp.fehler.length === 0, kp.fehler.join(' | '));
  await kp.schliessen();
});

// ── 4b. Tasse: Geometrie des Zylinders (Lage eines schmalen Balkens, Winkel, Wölbung, Scheibenzahl) ──────
szenario('tasse-geometrie', true, async (b, srv) => {
  const s = await oeffnen(b, srv, TASSE);
  const p = s.page; await sichtWarten(p);
  // Ein schwarzer Balken (20 × 400 px) als Foto-Ebene an der Stelle u der Druckbreite (0 bis 1); gemessen wird seine linke und rechte Kante in den Zeilen 300 bis 500 der 800-px-Leinwand.
  async function balken(u, scale) {
    return p.evaluate(async ([u2, sc]) => {
      const ed = window.LSPOD6.editors[0];
      if (!window.__balken) { const c = document.createElement('canvas'); c.width = 20; c.height = 400; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 20, 400); window.__balken = ed.neuesBild(c.toDataURL('image/png'), 20, 400); }
      const e = window.__balken; e.cx = u2; e.cy = 0.5; e.scale = sc;
      const cv = document.createElement('canvas'); cv.width = 800; cv.height = 800;
      const z = await ed.vorschauZeichnen(cv, {});
      const d = cv.getContext('2d').getImageData(0, 0, 800, 800).data;
      let minx = 9999, maxx = -1, cnt = 0;
      for (let y = 300; y < 500; y++) for (let x = 0; x < 800; x++) { const i = (y * 800 + x) * 4; if (d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 60) { cnt++; if (x < minx) minx = x; if (x > maxx) maxx = x; } }
      return { ok: z.ok, minx, maxx, cnt };
    }, [u, scale]);
  }
  // Eichung der 11-oz-Tasse (Katalogfoto 700 × 1000, Ausschnitt [0,165,700,700]) auf 800 × 800: Mitte mx, Radius R
  const k = (800 / 700) * 0.96, off = (800 - 700 * k) / 2, mx = off + 407 * k, R = 194 * k;
  const WINKEL = 330, rad = (g) => g * Math.PI / 180;
  // der Balken ist 0,05 · 2700 · 0,5 = 67,5 Druckpixel breit = 2,5 % der Druckbreite = 8,25 Grad
  const halb = 0.025 / 2 * WINKEL;
  function erwartet(u) { const th = (u - 0.5) * WINKEL; return [mx + R * Math.sin(rad(th - halb)), mx + R * Math.sin(rad(th + halb))]; }
  for (const [u, name] of [[0.5, 'Mitte'], [0.65909, '52,5 Grad nach rechts (mitten in einer 15-Grad-Scheibe)'], [0.3409, '52,5 Grad nach links'], [0.72727, '75 Grad (nahe am Rand der sichtbaren Hälfte)']]) {
    const m = await balken(u, 0.05);
    const [e0, e1] = erwartet(u);
    pruefe(`Balken ${name}: gezeichnet`, m.ok && m.cnt > 20, JSON.stringify(m));
    nahe(`Balken ${name}: linke Kante auf dem Zylinder (Abweichung höchstens 2 px von ${e0.toFixed(1)})`, m.minx, e0, 2);
    nahe(`Balken ${name}: rechte Kante auf dem Zylinder (Abweichung höchstens 2 px von ${e1.toFixed(1)})`, m.maxx, e1, 2);
  }
  // Wölbung: zur Seite hin wird der Balken schmaler (am Rand um das Mehrfache), ein gerader Streifen bliebe gleich breit
  const mitte = await balken(0.5, 0.05), rand = await balken(0.72727, 0.05);
  pruefe('Wölbung: am Rand ist der Balken deutlich schmaler als in der Mitte (Zylinder, nicht gerade)', (rand.maxx - rand.minx) < (mitte.maxx - mitte.minx) * 0.6, JSON.stringify([mitte, rand]));
  // breiter Balken über die halbe Druckbreite: Kanten bei ± 82,5 Grad · sin
  const breit = await balken(0.5, 0.5);
  const hb = 0.5 * 2700 * 0.5 / 2700 / 2 * WINKEL;   // halbe Breite in Grad (Scale 0,5 · Breite 20 px → 0,5 · 2700 · 0,5 = 675 px = 25 % der Druckbreite)
  const w0 = mx + R * Math.sin(rad(-hb)), w1 = mx + R * Math.sin(rad(hb));
  pruefe('breiter Balken: Kanten bei sin(± halbe Breite)', Math.abs(breit.minx - w0) <= 4 && Math.abs(breit.maxx - w1) <= 4, JSON.stringify({ breit, w0, w1 }));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 4c. Platzierungen mit festem Farbfoto der Vorlage: Hinweis statt einer Vorschau in der falschen Farbe ───────
szenario('farbfest', true, async (b, srv) => {
  const s = await oeffnen(b, srv, FARBFEST);
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Hallo');
  const anfragenVorher = s.bildAnfragen.length;   // die Bühne («Druckfläche») hat das Vorlagenbild schon geholt
  await p.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  const info = p.locator('[data-feld="produktinfo"]');
  await info.waitFor({ state: 'visible', timeout: 8000 });
  await p.waitForTimeout(300);
  const t = await info.innerText();
  pruefe('Vorderseite mit festem Farbfoto (Modell 1592, 9 Farben): Hinweis «feste Stofffarbe» statt Vorschau, Verweis auf die Druckfläche, kein Gedankenstrich', /feste Stofffarbe/.test(t) && /Druckfläche/.test(t) && /keine Produktvorschau/.test(t) && !/—/.test(t), t);
  pruefe('Vorderseite: kein Canvas, keine Notiz «Annäherung», kein weiteres Bild für die Zeichenfläche angefordert', await p.locator('.lsp6-pv').isHidden() && !(await p.locator('.lsp6-pvnote').isVisible()) && s.bildAnfragen.length === anfragenVorher, JSON.stringify(s.bildAnfragen.slice(anfragenVorher)));
  const r = await zeichne(p);
  pruefe('Vorderseite: vorschauZeichnen meldet «hinweis», kein Export', !r.ok && r.grund === 'hinweis' && (await p.evaluate(async () => { const x = await window.LSPOD6.editors[0].vorschauExport(); return x ? x.size : null; })) === null, JSON.stringify(r));
  // eine andere Farbe ändert daran nichts (die Vorschau würde die Farbe der Beispielvorlage zeigen)
  await p.locator('input[name="id"][value="1002"]').check();
  await p.waitForTimeout(700);
  pruefe('andere Farbe gewählt: weiter der Hinweis, nie eine Vorschau in der falschen Farbe', await info.isVisible() && await p.locator('.lsp6-pv').isHidden());
  // Etikett innen hat eine Hintergrundfarbe: dort gibt es die Vorschau
  const v = Number((await p.locator('.lsp6-pv').getAttribute('data-gezeichnet')) || 0);
  await p.locator('.lsp6-tab', { hasText: 'Etikett innen' }).click();
  await p.waitForFunction((x) => Number(document.querySelector('.lsp6-pv').getAttribute('data-gezeichnet') || 0) > x, v, { timeout: 10000 });
  pruefe('Reiter «Etikett innen» (mit Hintergrundfarbe): Canvas sichtbar, Hinweis weg', await p.locator('.lsp6-pv').isVisible() && await info.isHidden());
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  // Kauf nur mit farbfester Platzierung: kein Vorschau-JPEG
  await p.locator('.lsp6-tab', { hasText: 'Vorderseite' }).click();
  await Promise.all([p.waitForURL('**/cart', { timeout: 20000 }), p.locator('.lsp6-cta').click()]);
  pruefe('Kauf der farbfesten Vorderseite: Druckdatei da, kein Vorschau-JPEG, keine Eigenschaft _vorschau', s.warenkorb.length === 1 && !('_vorschau' in s.warenkorb[0].properties) && !s.uploads.some((u) => u.typ === 'jpeg') && s.uploads.some((u) => u.typ === 'png'), JSON.stringify(s.uploads.map((u) => u.typ)));
  await s.schliessen();
  // Modell mit Liste «farbfest» (nur die Vorderseite) und Modell «keine» mit Grund «farbfest», von Hand gesetzt
  const m = await oeffnen(b, srv, TSHIRT);
  const q = m.page; await sichtWarten(q);
  await textHinzufuegen(q, 'Vorne');
  await datenSetzen(q, 71, "d.modelle[71].farbfest = ['front'];");
  await q.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await q.locator('[data-feld="produktinfo"]').waitFor({ state: 'visible', timeout: 8000 });
  pruefe('Liste «farbfest» = [front]: die Vorderseite zeigt den Hinweis', /feste Stofffarbe/.test(await q.locator('[data-feld="produktinfo"]').innerText()));
  const v2 = Number((await q.locator('.lsp6-pv').getAttribute('data-gezeichnet')) || 0);
  await q.locator('.lsp6-tab', { hasText: 'Rückseite' }).click();
  await q.waitForFunction((x) => Number(document.querySelector('.lsp6-pv').getAttribute('data-gezeichnet') || 0) > x, v2, { timeout: 10000 });
  pruefe('die Rückseite (nicht in der Liste) zeigt weiter die Vorschau', await q.locator('.lsp6-pv').isVisible() && await q.locator('[data-feld="produktinfo"]').isHidden());
  await datenSetzen(q, 71, "d.modelle[71].adapter = 'keine'; d.modelle[71].grund = 'farbfest';");
  await q.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  await q.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await q.locator('[data-feld="produktinfo"]').waitFor({ state: 'visible', timeout: 8000 });
  pruefe('Modell «keine» mit Grund «farbfest»: Hinweis «feste Stofffarbe» auf allen Platzierungen', /feste Stofffarbe/.test(await q.locator('[data-feld="produktinfo"]').innerText()));
  await datenSetzen(q, 71, "d.modelle[71].adapter = 'keine'; d.modelle[71].grund = 'ungeeignet';");
  await q.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  await q.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await q.locator('[data-feld="produktinfo"]').waitFor({ state: 'visible', timeout: 8000 });
  pruefe('Grund «ungeeignet»: allgemeiner Hinweis, nicht der Farbhinweis', !/feste Stofffarbe/.test(await q.locator('[data-feld="produktinfo"]').innerText()) && /keine Produktvorschau/.test(await q.locator('[data-feld="produktinfo"]').innerText()));
  // Rundum-Druck bleibt Hinweis, auch wenn fremde oder ältere Daten dem Modell einen Zeichen-Adapter geben (doppelte Absicherung im Editor)
  pruefe('keine Seitenfehler (Modell 71)', m.fehler.length === 0, m.fehler.join(' | '));
  await m.schliessen();
  const h = await oeffnen(b, srv, 'karte=388&vorschau=388');
  await sichtWarten(h.page);
  await textHinzufuegen(h.page, 'Hoodie');
  await datenSetzen(h.page, 388, "d.modelle[388].adapter = 'flach'; d.modelle[388].grund = null;");
  await h.page.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await h.page.locator('[data-feld="produktinfo"]').waitFor({ state: 'visible', timeout: 8000 });
  pruefe('Rundum-Druck mit falschen Daten (Adapter «flach»): der Editor zeigt trotzdem nur den Hinweis über Schnittteile und Nähte', /Rundum-Druck/.test(await h.page.locator('[data-feld="produktinfo"]').innerText()) && await h.page.locator('.lsp6-pv').isHidden());
  const ex = await h.page.evaluate(async () => { const x = await window.LSPOD6.editors[0].vorschauExport(); return x ? x.size : null; });
  pruefe('Rundum-Druck mit falschen Daten: kein Export', ex === null);
  await h.schliessen();
});

// ── 4d. Fristen: ein hängendes Vorlagenbild oder ein hängender Upload darf den Kauf nicht aufhalten ────────────────
szenario('fristen', true, async (b, srv) => {
  // A. sichtbare Ansicht: das Vorlagenbild hängt (Verbindung offen), Limit 700 ms (data-vorschau-zeit): Hinweis «Vorschau wird erstellt …», dann Rückfall auf die Druckfläche
  const a = await oeffnen(b, srv, `${TSHIRT}&spiegel=0&vzeit=700`, { printfulHaengt: (u) => /\/m\//.test(u) });
  await sichtWarten(a.page);
  await textHinzufuegen(a.page, 'Hallo');
  const t0 = Date.now();
  await a.page.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await a.page.locator('[data-feld="pvlaedt"]').waitFor({ state: 'visible', timeout: 3000 });
  const laed = await a.page.locator('[data-feld="pvlaedt"]').innerText();
  pruefe('hängendes Vorlagenbild: während des Wartens steht «Vorschau wird erstellt …»', /Vorschau wird erstellt/.test(laed), laed);
  await a.page.waitForFunction(() => window.LSPOD6.editors[0].st.sicht === 'druck' && document.querySelector('[data-feld="sichthinweis"]').textContent.length > 0, null, { timeout: 8000 });
  const dt = Date.now() - t0;
  pruefe('hängendes Vorlagenbild: Rückfall auf die Druckfläche nach dem Limit (700 ms), nicht erst nach dem Standardlimit', dt >= 600 && dt < 4000, String(dt));
  pruefe('hängendes Vorlagenbild: «Vorschau wird erstellt …» ist danach weg, ruhiger Hinweis steht', await a.page.locator('[data-feld="pvlaedt"]').isHidden() && /nicht verfügbar/.test(await a.page.locator('[data-feld="sichthinweis"]').innerText()));
  pruefe('hängendes Vorlagenbild: keine Seitenfehler', a.fehler.length === 0, a.fehler.join(' | '));
  await a.schliessen();
  // B. Kauf: das Vorlagenbild hängt, das Standardlimit der Ansicht wäre 10 s; beim Kauf gilt die Frist von 4 s (GEMESSEN vorher: 20 s Stillstand ohne Meldung)
  const k = await oeffnen(b, srv, `${TSHIRT}&spiegel=0`, { printfulHaengt: (u) => /\/m\//.test(u) });
  await sichtWarten(k.page);
  await textHinzufuegen(k.page, 'Hallo');
  const t1 = Date.now();
  await Promise.all([k.page.waitForURL('**/cart', { timeout: 20000 }), k.page.locator('.lsp6-cta').click()]);
  const dk = Date.now() - t1;
  pruefe('hängendes Vorlagenbild beim Kauf: Warenkorb nach rund 4 s (Frist der Vorschau), nicht erst nach dem Bildlimit von 10 s', dk >= 3500 && dk < 8000, String(dk));
  pruefe('hängendes Vorlagenbild beim Kauf: Druckdatei da, kein _vorschau, kein JPEG, keine Seitenfehler', k.warenkorb.length === 1 && !('_vorschau' in k.warenkorb[0].properties) && !k.uploads.some((x) => x.typ === 'jpeg') && k.uploads.some((x) => x.typ === 'png') && k.fehler.length === 0, k.fehler.join(' | '));
  await k.schliessen();
  // C. Kauf: der Upload des Vorschau-JPEG hängt (die Druckdatei ging als erster Upload durch)
  const u = await oeffnen(b, srv, TSHIRT, { cloudinaryHaengt: (nr) => nr >= 2 });
  await sichtWarten(u.page);
  await textHinzufuegen(u.page, 'Hallo');
  const t2 = Date.now();
  await Promise.all([u.page.waitForURL('**/cart', { timeout: 20000 }), u.page.locator('.lsp6-cta').click()]);
  const du = Date.now() - t2;
  pruefe('hängender JPEG-Upload beim Kauf: Warenkorb nach rund 4 s, nicht nach 90 s', du >= 3500 && du < 8000, String(du));
  pruefe('hängender JPEG-Upload beim Kauf: Druckdatei da, kein _vorschau, keine Seitenfehler', u.warenkorb.length === 1 && !('_vorschau' in u.warenkorb[0].properties) && /^https:/.test(u.warenkorb[0].properties['\u{1F5BC}️ Druckdatei (front)'] || '') && u.fehler.length === 0, u.fehler.join(' | '));
  await u.schliessen();
  // D. ohne Hänger kostet die Vorschau fast nichts: der Kauf mit Vorschau dauert nicht annähernd die Frist
  const n = await oeffnen(b, srv, TSHIRT);
  await sichtWarten(n.page);
  await textHinzufuegen(n.page, 'Hallo');
  const t3 = Date.now();
  await Promise.all([n.page.waitForURL('**/cart', { timeout: 20000 }), n.page.locator('.lsp6-cta').click()]);
  const dn = Date.now() - t3;
  pruefe('ohne Hänger: Kauf mit Vorschau in unter 3 s, _vorschau da', dn < 3000 && /^https:/.test(n.warenkorb[0].properties._vorschau || ''), String(dn));
  await n.schliessen();
});

// ── 5. Poster: Papier mit Schatten ───────────────────────────────────────────────────────────────
szenario('poster', true, async (b, srv) => {
  const s = await oeffnen(b, srv, 'karte=268&shop=1001:19515&vorschau=268');
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Poster');
  const r = await zeichne(p);
  pruefe('Poster: Zeichnen gelingt, ohne Vorlagenbild (Papier)', r.ok && !s.bildAnfragen.some((u) => /luxe-vorschau/.test(u)), JSON.stringify(r));
  // 9933 × 7016: Seitenverhältnis 1,4158; Rand 10 % → Blatt 640 × 452,0 bei 800 px
  const w = 640, h = w / (9933 / 7016), x = 80, y = (800 - h) / 2;
  const [bg, blatt, nebenBlatt] = await pixel(p, [[4, 4], [x + 10, y + 10], [x - 30, 400]]);
  pruefe('Hintergrund des Raumes (#f3f1ee)', nah(bg, [243, 241, 238, 255], 2), bg.join(','));
  pruefe('Blatt weiss', nah(blatt, [255, 255, 255, 255], 1), blatt.join(','));
  pruefe('neben dem Blatt Raumfarbe', nah(nebenBlatt, [243, 241, 238, 255], 6), nebenBlatt.join(','));
  const [unterSchatten] = await pixel(p, [[400, Math.round(y + h + 4)]]);
  pruefe('unter dem Blatt liegt ein Schatten (dunkler als der Raum)', unterSchatten[0] < 240, unterSchatten.join(','));
  const u = await umriss(p, [Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h)], 100);
  nahe('Motiv mittig auf dem Blatt (x)', (u.minx + u.maxx) / 2, 400, 6);
  nahe('Motiv bei 42 % der Blatthöhe (y)', (u.miny + u.maxy) / 2, y + 0.42 * h, 10);
  const e = await p.evaluate(async () => { const blob = await window.LSPOD6.editors[0].vorschauExport(); return blob ? { typ: blob.type, size: blob.size } : null; });
  pruefe('Poster: JPEG-Export gelingt', !!e && e.typ === 'image/jpeg' && e.size <= 81920, JSON.stringify(e));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 6. Stickerei und Rundum-Druck: Hinweis statt Vorschau ────────────────────────────────────────
szenario('hinweis-statt-vorschau', true, async (b, srv) => {
  const s = await oeffnen(b, srv, 'karte=206&vorschau=206');
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Cap');
  await p.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  const info = p.locator('[data-feld="produktinfo"]');
  await info.waitFor({ state: 'visible', timeout: 8000 });
  const t = await info.innerText();
  pruefe('Stickerei: ehrlicher Hinweis statt Vorschau', /Stickerei/.test(t) && /keine Produktvorschau/.test(t) && /Fäden/.test(t), t);
  pruefe('Stickerei: kein Canvas, keine Notiz «Annäherung»', await p.locator('.lsp6-pv').isHidden() && !(await p.locator('.lsp6-pvnote').isVisible()));
  pruefe('Stickerei: das Vorlagenbild wurde nicht für die Zeichenfläche geladen', !s.bildAnfragen.some((u) => /luxe-vorschau/.test(u)));
  const ex = await p.evaluate(async () => { const x = await window.LSPOD6.editors[0].vorschauExport(); return x ? x.size : null; });
  pruefe('Stickerei: kein Export', ex === null);
  const r = await zeichne(p);
  pruefe('Stickerei: vorschauZeichnen meldet «hinweis»', !r.ok && r.grund === 'hinweis', JSON.stringify(r));
  pruefe('Stickerei: der Hinweis nennt keine Zahlen oder Fremdwörter aus der Karte', !/USD|Erfahrungswert|Katalog/.test(t));
  pruefe('Stickerei: keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  const h = await oeffnen(b, srv, 'karte=388&vorschau=388');
  await sichtWarten(h.page);
  await textHinzufuegen(h.page, 'Hoodie');
  await h.page.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await h.page.locator('[data-feld="produktinfo"]').waitFor({ state: 'visible', timeout: 8000 });
  const th = await h.page.locator('[data-feld="produktinfo"]').innerText();
  pruefe('Rundum-Druck: ehrlicher Hinweis über Schnittteile und Nähte', /Rundum-Druck/.test(th) && /Schnittteile/.test(th) && /keine Produktvorschau/.test(th), th);
  pruefe('Rundum-Druck: kein Canvas', await h.page.locator('.lsp6-pv').isHidden());
  await h.page.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  pruefe('zurück zur Druckfläche geht immer', await h.page.locator('.lsp6-stagewrap').isVisible());
  pruefe('Rundum-Druck: keine Seitenfehler', h.fehler.length === 0, h.fehler.join(' | '));
  await h.schliessen();
});

// ── 7. Rückfall auf die Druckfläche: Bild fehlt, CORS-Fehler, Daten kaputt, Daten für ein anderes Modell ───
szenario('rueckfall', true, async (b, srv) => {
  async function rueckfallPruefen(name, query, opt) {
    if (process.env.V6_LAUT) console.log('    … ' + name);
    const s = await oeffnen(b, srv, query, opt);
    const p = s.page; await sichtWarten(p);
    await textHinzufuegen(p, 'Hallo');
    await p.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
    await p.waitForFunction(() => window.LSPOD6.editors[0].st.sicht === 'druck' && document.querySelector('[data-feld="sichthinweis"]').textContent.length > 0, null, { timeout: 15000 });
    const hinweis = await p.locator('[data-feld="sichthinweis"]').innerText();
    pruefe(`${name}: zurück auf die Druckfläche, Bühne sichtbar`, await p.locator('.lsp6-stagewrap').isVisible() && await p.locator('.lsp6-pvwrap').isHidden());
    pruefe(`${name}: ruhiger Hinweis ohne Fehlerton`, /nicht verfügbar/.test(hinweis) && /trotzdem gestalten/.test(hinweis) && !/Fehler|Error|CORS/.test(hinweis), hinweis);
    pruefe(`${name}: Umschalter zeigt «Druckfläche»`, (await p.locator('.lsp6-sbtn[data-sicht="druck"]').getAttribute('aria-pressed')) === 'true');
    // weiter gestalten und kaufen geht
    await p.locator('.lsp6-text').fill('Weiter');
    await Promise.all([p.waitForURL('**/cart', { timeout: 20000 }), p.locator('.lsp6-cta').click()]);
    pruefe(`${name}: der Kauf geht trotzdem durch (Druckdatei, ohne _vorschau)`, s.warenkorb.length === 1 && !('_vorschau' in s.warenkorb[0].properties) && !s.uploads.some((u) => u.typ === 'jpeg'), JSON.stringify(Object.keys(s.warenkorb[0]?.properties || {})));
    pruefe(`${name}: keine Seitenfehler`, s.fehler.length === 0, s.fehler.join(' | '));
    await s.schliessen();
  }
  await rueckfallPruefen('Bild nicht da (HTTP 404)', `${TSHIRT}&spiegel=0`, { printfulBild: (u) => (/\/m\//.test(u) ? { status: 404 } : null) });
  await rueckfallPruefen('Spiegel nicht da (HTTP 404)', TSHIRT, { shopifyBild: (u) => (/luxe-vorschau-/.test(u) ? { status: 404 } : null) });
  await rueckfallPruefen('CORS-Fehler (Bild ohne Freigabe)', `${TSHIRT}&spiegel=0`, { corsErwartet: true, printfulBild: (u) => (/\/m\//.test(u) ? { typ: 'image/png', body: geisterPng(), cors: false } : null) });
  // Daten kaputt oder fremd: es gibt gar keinen Umschalter, nichts bricht
  for (const [name, query] of [['Daten kein JSON', `${TSHIRT}&vkaputt=json`], ['Schema 2', `${TSHIRT}&vkaputt=schema`], ['unbekannter Adapter', `${TSHIRT}&vkaputt=modell`], ['Daten nur für ein anderes Modell', 'karte=19&shop=1001:1320,1002:4830,1003:16586&vorschau=71']]) {
    if (process.env.V6_LAUT) console.log('    … ' + name);
    const s = await oeffnen(b, srv, query);
    await s.page.waitForTimeout(700);
    pruefe(`${name}: kein Umschalter, Editor läuft`, await s.page.locator('[data-feld="sicht"]').isHidden() && await s.page.locator('.lsp6-stagewrap').isVisible());
    await textHinzufuegen(s.page, 'Hallo');
    await Promise.all([s.page.waitForURL('**/cart', { timeout: 20000 }), s.page.locator('.lsp6-cta').click()]);
    pruefe(`${name}: Kauf ohne _vorschau, keine Seitenfehler`, s.warenkorb.length === 1 && !('_vorschau' in s.warenkorb[0].properties) && s.fehler.length === 0, s.fehler.join(' | '));
    await s.schliessen();
  }
  // Kartenbündel: bei einer Ausführung eines Modells ohne Vorschaudaten verschwindet der Umschalter (und die Ansicht springt zurück)
  const s = await oeffnen(b, srv, 'karte=buendel&m=71,586&shop=1001:4012:71,1002:15124:586&varianten=1001:Shirt 71,1002:Shirt 586&vorschau=71');
  await sichtWarten(s.page);
  await textHinzufuegen(s.page, 'Hallo');
  await produktAnsicht(s.page);
  await s.page.locator('input[name="id"][value="1002"]').check();
  await s.page.waitForFunction(() => document.querySelector('[data-feld="sicht"]').hidden, null, { timeout: 8000 });
  pruefe('Bündel: Ausführung eines Modells ohne Vorschaudaten: Umschalter weg, Bühne wieder da', await s.page.locator('.lsp6-stagewrap').isVisible() && (await s.page.evaluate(() => window.LSPOD6.editors[0].st.sicht)) === 'druck');
  await s.page.locator('input[name="id"][value="1001"]').check();
  await s.page.waitForFunction(() => !document.querySelector('[data-feld="sicht"]').hidden, null, { timeout: 8000 });
  pruefe('Bündel: zurück zum Modell mit Daten: Umschalter wieder da', await s.page.locator('[data-feld="sicht"]').isVisible());
  pruefe('Bündel: keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 8. Export JPEG 800 × 800 ─────────────────────────────────────────────────────────────────────
szenario('export-jpeg', true, async (b, srv) => {
  const s = await oeffnen(b, srv, TSHIRT);
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Export');
  const info = () => p.evaluate(async () => {
    const blob = await window.LSPOD6.editors[0].vorschauExport();
    if (!blob) return null;
    const bm = await createImageBitmap(blob); const buf = new Uint8Array(await blob.arrayBuffer());
    return { typ: blob.type, size: blob.size, w: bm.width, h: bm.height, magic: Array.from(buf.slice(0, 3)) };
  });
  const e = await info();
  pruefe('JPEG, 800 × 800, höchstens 80 KB, echte JPEG-Kennung', !!e && e.typ === 'image/jpeg' && e.w === 800 && e.h === 800 && e.size <= 81920 && e.magic.join(',') === '255,216,255', JSON.stringify(e));
  pruefe('JPEG ohne SecurityError (Spiegel sendet CORS), keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  // Rauschen als Foto: der Editor senkt die JPEG-Qualität, bis die Datei höchstens 80 KB hat, sonst gibt es kein Bild (nie eine grössere Datei)
  await p.evaluate(() => { const ed = window.LSPOD6.editors[0]; ed.entfernen(ed.st.ebenen.front[0].id); });
  const rausch = pngRauschen(500, 500).toString('base64');
  await p.evaluate(async (b64) => { const ed = window.LSPOD6.editors[0]; const e2 = ed.neuesBild('data:image/png;base64,' + b64, 500, 500); e2.scale = 0.5; ed.st.ebenen.front.length && 0; }, rausch);
  const g = await info();
  pruefe('Foto mit viel Rauschen auf dem T-Shirt: ein Bild unter 80 KB (die Druckfläche ist klein, selbst Rauschen bleibt unter 52 KB, GEMESSEN); der Grenzfall «zu schwer» steht unten am Poster', !!g && g.size > 0 && g.size <= 81920, JSON.stringify(g));
  await p.evaluate(() => { const ed = window.LSPOD6.editors[0]; const e2 = ed.st.ebenen.front[0]; e2.scale = 0.18; });
  const k = await info();
  pruefe('kleineres Rausch-Foto passt unter 80 KB (die Qualität wird gesenkt, die Grösse bleibt 800 × 800)', !!k && k.size <= 81920 && k.w === 800, JSON.stringify(k));
  await s.schliessen();
  // Poster: die Papierfläche ist gross genug, dass Rauschen die Grenze wirklich reisst (auf dem T-Shirt bleibt selbst Rauschen unter 50 KB, GEMESSEN)
  const q = await oeffnen(b, srv, 'karte=268&shop=1001:19515&vorschau=268');
  const pq = q.page; await sichtWarten(pq);
  const stufen = (px, sc) => pq.evaluate(async ([b64, px2, sc2]) => {
    const ed = window.LSPOD6.editors[0];
    ed.st.ebenen[ed.st.aktiv].slice().forEach((x) => ed.entfernen(x.id));
    const e = ed.neuesBild('data:image/png;base64,' + b64, px2, px2); e.scale = sc2;
    const cv = document.createElement('canvas'); cv.width = 800; cv.height = 800;
    const z = await ed.vorschauZeichnen(cv, {});
    const groessen = []; for (const qq of [0.85, 0.72, 0.6, 0.48]) groessen.push(await new Promise((ok) => cv.toBlob((x) => ok(x.size), 'image/jpeg', qq)));
    const ex = await ed.vorschauExport();
    return { ok: z.ok, groessen, export: ex ? ex.size : null };
  }, [pngRauschen(px, px).toString('base64'), px, sc]);
  const leiter = await stufen(500, 1.2);
  pruefe('Qualitätsleiter: bei 0,85 wäre die Datei über 80 KB, der Editor senkt die Qualität und liefert ein Bild unter 80 KB', leiter.ok && leiter.groessen[0] > 81920 && leiter.export !== null && leiter.export > 0 && leiter.export <= 81920 && leiter.export < leiter.groessen[0], JSON.stringify(leiter));
  const schwer = await stufen(800, 3);
  pruefe('zu schweres Bild: selbst bei der niedrigsten Qualität über 80 KB, dann liefert der Editor KEIN Bild (nie eine zu grosse Datei)', schwer.ok && schwer.groessen.every((g) => g > 81920) && schwer.export === null, JSON.stringify(schwer));
  pruefe('Poster-Export: keine Seitenfehler', q.fehler.length === 0, q.fehler.join(' | '));
  await q.schliessen();
});

// ── 9. Warenkorb: Eigenschaft «_vorschau» ────────────────────────────────────────────────────────
szenario('warenkorb-vorschau', true, async (b, srv) => {
  const s = await oeffnen(b, srv, TSHIRT);
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Hallo');
  await Promise.all([p.waitForURL('**/cart', { timeout: 20000 }), p.locator('.lsp6-cta').click()]);
  const jpg = s.uploads.filter((u) => u.typ === 'jpeg'), png = s.uploads.filter((u) => u.typ === 'png');
  pruefe('ein PNG (Druckdatei) und ein JPEG (Vorschau) hochgeladen, die Druckdatei zuerst', png.length === 1 && jpg.length === 1 && s.uploads[0].typ === 'png', JSON.stringify(s.uploads.map((x) => x.typ)));
  pruefe('JPEG höchstens 80 KB', jpg[0].bytes <= 81920, String(jpg[0].bytes));
  const pr = s.warenkorb[0].properties;
  pruefe('Eigenschaft «_vorschau» ist die Adresse des JPEG bei Cloudinary (https, unter 255 Zeichen)', pr._vorschau === jpg[0].url && /^https:\/\/res\.cloudinary\.com\//.test(pr._vorschau) && pr._vorschau.length < 255, String(pr._vorschau));
  pruefe('weiter genau vier Eigenschaften (Design, Druckdatei, _pod_karte, _vorschau)', Object.keys(pr).length === 4, Object.keys(pr).join('|'));
  const pod = JSON.parse(pr._pod_karte);
  pruefe('_pod_karte unverändert aufgebaut (Modell, Variante, Platzierung), kein qd ohne Foto', pod.m === 71 && pod.pv === 4012 && pod.pl[0] === 'front' && !('qd' in pod) && pr._pod_karte.length <= 255, pr._pod_karte);
  // Vertrag mit der Bestellstrecke: der echte Parser ignoriert _vorschau und liest die Druckdatei
  const gelesen = dateienAusEigenschaften(pr);
  pruefe('Parser der Bestellstrecke: eine Druckdatei, kein Befund (_vorschau stört nicht)', gelesen.dateien.length === 1 && gelesen.probleme.length === 0 && gelesen.dateien[0].platzierung === 'front', JSON.stringify(gelesen.probleme));
  pruefe('Parser: _vorschau wird nicht als Druckdatei gelesen', !gelesen.dateien.some((d) => d.url === pr._vorschau));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // der JPEG-Upload scheitert: die Bestellung geht ohne _vorschau durch
  const t = await oeffnen(b, srv, TSHIRT, { cloudinaryJpegFehler: true });
  await sichtWarten(t.page);
  await textHinzufuegen(t.page, 'Hallo');
  await Promise.all([t.page.waitForURL('**/cart', { timeout: 20000 }), t.page.locator('.lsp6-cta').click()]);
  pruefe('JPEG-Upload scheitert: Warenkorb trotzdem gefüllt, ohne _vorschau, Druckdatei da', t.warenkorb.length === 1 && !('_vorschau' in t.warenkorb[0].properties) && /^https:/.test(t.warenkorb[0].properties['\u{1F5BC}️ Druckdatei (front)'] || ''), JSON.stringify(Object.keys(t.warenkorb[0]?.properties || {})));
  pruefe('JPEG-Upload scheitert: keine Seitenfehler', t.fehler.length === 0, t.fehler.join(' | '));
  await t.schliessen();
  // Der Warenkorb lehnt ab: die hochgeladene Vorschau-Adresse darf weder im Formular der Seite noch nach einer Änderung stehen bleiben (sie gehört zu einem älteren Stand des Entwurfs)
  const f = await oeffnen(b, srv, TSHIRT, { warenkorbFehler: true });
  await sichtWarten(f.page);
  await textHinzufuegen(f.page, 'Hallo');
  await f.page.locator('.lsp6-cta').click();
  await f.page.waitForFunction(() => /Could not|Hinzufügen|nicht/i.test(document.querySelector('.lsp6-status').textContent) && !document.querySelector('.lsp6-cta').disabled, null, { timeout: 20000 });
  const formVorschau = () => f.page.evaluate(() => Array.from(document.querySelectorAll('#produkt-form input[data-lspod6="1"]')).map((i) => i.name));
  pruefe('Warenkorb lehnt ab: JPEG wurde hochgeladen, aber im Formular der Seite steht keine «_vorschau»', f.uploads.some((u) => u.typ === 'jpeg') && !(await formVorschau()).some((n2) => /_vorschau/.test(n2)), JSON.stringify(await formVorschau()));
  await f.page.evaluate(() => { const ed = window.LSPOD6.editors[0]; const e = ed.st.ebenen.front[0]; e.text = 'Anderer Text'; ed.waehlen(e.id); });
  await f.page.locator('.lsp6-text').fill('Noch ein anderer Text');
  await f.page.waitForTimeout(200);
  pruefe('nach einer Änderung: weiter keine «_vorschau» im Formular (nur Design, Druckdatei-Platz und _pod_karte)', !(await formVorschau()).some((n2) => /_vorschau/.test(n2)), JSON.stringify(await formVorschau()));
  pruefe('Warenkorb-Fehler: keine Seitenfehler', f.fehler.length === 0, f.fehler.join(' | '));
  await f.schliessen();
  // Tasse: Vorschau aus dem Zylinder
  const m = await oeffnen(b, srv, TASSE);
  await sichtWarten(m.page);
  await textHinzufuegen(m.page, 'Tasse');
  await Promise.all([m.page.waitForURL('**/cart', { timeout: 20000 }), m.page.locator('.lsp6-cta').click()]);
  pruefe('Tasse: Vorschau-JPEG im Warenkorb', m.uploads.some((u) => u.typ === 'jpeg') && /^https:/.test(m.warenkorb[0].properties._vorschau || ''), JSON.stringify(Object.keys(m.warenkorb[0]?.properties || {})));
  await m.schliessen();
  // Stickerei: keine Vorschau, also auch kein JPEG
  const c = await oeffnen(b, srv, 'karte=206&vorschau=206');
  await sichtWarten(c.page);
  await textHinzufuegen(c.page, 'Cap');
  await Promise.all([c.page.waitForURL('**/cart', { timeout: 20000 }), c.page.locator('.lsp6-cta').click()]);
  pruefe('Stickerei: kein Vorschau-JPEG, keine Eigenschaft _vorschau', !c.uploads.some((u) => u.typ === 'jpeg') && !('_vorschau' in c.warenkorb[0].properties), JSON.stringify(c.uploads.map((u) => u.typ)));
  await c.schliessen();
  // zwei Platzierungen: die aktive gilt, sonst die erste benutzte, die sich zeigen lässt
  const z = await oeffnen(b, srv, TSHIRT);
  await sichtWarten(z.page);
  await textHinzufuegen(z.page, 'Vorne');
  await z.page.locator('.lsp6-tab', { hasText: 'Rückseite' }).click();
  await textHinzufuegen(z.page, 'Hinten');
  await Promise.all([z.page.waitForURL('**/cart', { timeout: 20000 }), z.page.locator('.lsp6-cta').click()]);
  pruefe('zwei Platzierungen: genau ein Vorschau-JPEG, zwei Druckdateien', z.uploads.filter((u) => u.typ === 'jpeg').length === 1 && z.uploads.filter((u) => u.typ === 'png').length === 2, JSON.stringify(z.uploads.map((u) => u.typ)));
  await z.schliessen();
});

// ── 10. Kontrast-Hinweis ─────────────────────────────────────────────────────────────────────────
szenario('kontrast', true, async (b, srv) => {
  const s = await oeffnen(b, srv, TSHIRT);
  const p = s.page; await sichtWarten(p);
  const hinweis = () => p.locator('[data-feld="kontrast"]');
  const warteGezeichnet = async (vorher) => p.waitForFunction((v) => (Number(document.querySelector('.lsp6-pv').getAttribute('data-gezeichnet')) || 0) > v, vorher, { timeout: 10000 });
  const zaehler = async () => Number(await p.locator('.lsp6-pv').getAttribute('data-gezeichnet')) || 0;
  await textHinzufuegen(p, 'Hallo');
  await produktAnsicht(p);
  pruefe('dunkles Motiv (#111111) auf weissem Stoff: kein Hinweis', await hinweis().isHidden());
  let v = await zaehler();
  await p.locator('input[name="id"][value="1002"]').check();
  await warteGezeichnet(v);
  await p.waitForFunction(() => !document.querySelector('[data-feld="kontrast"]').hidden, null, { timeout: 8000 });
  const t1 = await hinweis().innerText();
  pruefe('dunkles Motiv auf schwarzem Stoff: Kontrast-Hinweis (dunkel auf dunkel)', /dunkel/.test(t1) && /hellere/.test(t1) && !/—/.test(t1), t1);
  v = await zaehler();
  await p.locator('.lsp6-sw[data-c="#ffffff"]').click();
  await warteGezeichnet(v);
  await p.waitForFunction(() => document.querySelector('[data-feld="kontrast"]').hidden, null, { timeout: 8000 });
  pruefe('weisses Motiv auf schwarzem Stoff: Hinweis weg', await hinweis().isHidden());
  v = await zaehler();
  await p.locator('input[name="id"][value="1001"]').check();
  await warteGezeichnet(v);
  await p.waitForFunction(() => !document.querySelector('[data-feld="kontrast"]').hidden, null, { timeout: 8000 });
  const t2 = await hinweis().innerText();
  pruefe('weisses Motiv auf weissem Stoff: Hinweis (hell auf hell)', /hell/.test(t2) && /dunklere/.test(t2), t2);
  // ein farbiges Motiv mit gutem Kontrast: kein Hinweis
  v = await zaehler();
  await p.locator('.lsp6-sw[data-c="#b3122b"]').click();
  await warteGezeichnet(v);
  await p.waitForFunction(() => document.querySelector('[data-feld="kontrast"]').hidden, null, { timeout: 8000 });
  pruefe('rotes Motiv auf weissem Stoff: kein Hinweis', await hinweis().isHidden());
  // Schwelle des Kontrastverhältnisses (1,8 nach WCAG): auf Weiss ein Grau mit Verhältnis 1,5 = Hinweis, mit 2,6 = kein Hinweis
  const neuZeichnen = async () => {
    const w = await zaehler();
    await p.evaluate(() => { const ed = window.LSPOD6.editors[0]; ed.sichtSetzen('druck'); ed.sichtSetzen('produkt'); });
    await warteGezeichnet(w);
  };
  for (const [ver, erwartet] of [[1.5, true], [2.6, false], [1.7, true], [1.95, false]]) {
    const grau = grauFuerVerhaeltnis(ver);
    await p.evaluate((c) => { const e = window.LSPOD6.editors[0].st.ebenen.front[0]; e.color = c; e.bold = true; }, grau);
    await neuZeichnen();
    pruefe(`Schwelle: Motiv ${grau} auf weissem Stoff (Kontrastverhältnis ${ver}): ${erwartet ? 'Hinweis «hell auf hell»' : 'kein Hinweis'}`, (await hinweis().isVisible()) === erwartet, grau);
  }
  // Anteil der schlecht lesbaren Fläche (60 %): auf schwarzem Stoff dunkle und weisse Texte gleicher Grösse; Anteil vorher gemessen (wie im Editor: 48 px breit, nach Alpha gewichtet)
  await p.locator('input[name="id"][value="1002"]').check();
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.pfVariante === 4020);
  const anteil = () => p.evaluate(async () => {
    const ed = window.LSPOD6.editors[0];
    const cv = document.createElement('canvas'); cv.width = 800; cv.height = 800;
    const r = await ed.vorschauZeichnen(cv, {});
    const k = document.createElement('canvas'); k.width = 48; k.height = Math.max(8, Math.round(48 * r.dcv.height / r.dcv.width));
    k.getContext('2d').drawImage(r.dcv, 0, 0, k.width, k.height);
    const rgb = [parseInt(r.stoff.slice(1, 3), 16), parseInt(r.stoff.slice(3, 5), 16), parseInt(r.stoff.slice(5, 7), 16)];
    return window.LSPOD6.hilfen.kontrastAnalyse(k.getContext('2d').getImageData(0, 0, k.width, k.height).data, rgb).anteil;
  });
  const text3 = (farbe, cy) => p.evaluate(([f, y]) => { const ed = window.LSPOD6.editors[0]; const e = ed.neuerText('HHHH'); e.color = f; e.cx = 0.5; e.cy = y; return e.id; }, [farbe, cy]);
  await p.evaluate(() => { const ed = window.LSPOD6.editors[0]; ed.st.ebenen.front.slice().forEach((x) => ed.entfernen(x.id)); });
  await text3('#111111', 0.3); await text3('#111111', 0.5); await text3('#ffffff', 0.7);
  const a21 = await anteil();
  await neuZeichnen();
  pruefe(`Anteil: zwei dunkle und ein weisser Text auf Schwarz = ${(a21 * 100).toFixed(0)} % schlecht lesbar (unter 60 %): kein Hinweis`, a21 > 0.45 && a21 < 0.58 && await hinweis().isHidden(), String(a21));
  await text3('#111111', 0.15);
  const a31 = await anteil();
  await neuZeichnen();
  pruefe(`Anteil: drei dunkle und ein weisser Text auf Schwarz = ${(a31 * 100).toFixed(0)} % schlecht lesbar (über 60 %): Hinweis «dunkel auf dunkel»`, a31 > 0.62 && a31 < 0.85 && await hinweis().isVisible() && /dunkel/.test(await hinweis().innerText()), String(a31));
  // der Hinweis ist nur eine Warnung: der Kauf bleibt möglich
  pruefe('Kontrast-Hinweis sperrt den Kauf nicht', (await p.locator('.lsp6-cta').getAttribute('aria-disabled')) === null);
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 11. Live neu zeichnen ────────────────────────────────────────────────────────────────────────
szenario('live-neuzeichnen', true, async (b, srv) => {
  const s = await oeffnen(b, srv, TSHIRT);
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Hallo');
  await produktAnsicht(p);
  const hash = () => p.evaluate(() => { const c = document.querySelector('.lsp6-pv'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 37) h = (h * 31 + d[i]) | 0; return h; });
  const h1 = await hash();
  const v = Number(await p.locator('.lsp6-pv').getAttribute('data-gezeichnet'));
  await p.locator('.lsp6-text').fill('Viel längerer Text hier');
  await p.waitForFunction((x) => Number(document.querySelector('.lsp6-pv').getAttribute('data-gezeichnet')) > x, v, { timeout: 8000 });
  const h2 = await hash();
  pruefe('Text ändern in der Produktansicht zeichnet das Bild neu (ohne Wechsel der Ansicht)', h1 !== h2);
  // Zahlenfeld verschiebt das Motiv
  const v2 = Number(await p.locator('.lsp6-pv').getAttribute('data-gezeichnet'));
  await p.locator('.lsp6-field', { hasText: 'Y (cm)' }).locator('input').fill('30');
  await p.waitForFunction((x) => Number(document.querySelector('.lsp6-pv').getAttribute('data-gezeichnet')) > x, v2, { timeout: 8000 });
  pruefe('Zahlenfeld verschiebt das Motiv in der Vorschau', (await hash()) !== h2);
  // viele schnelle Änderungen: es bleibt bei wenigen Zeichenläufen (zusammengefasst), und das letzte gewinnt
  const v3 = Number(await p.locator('.lsp6-pv').getAttribute('data-gezeichnet'));
  await p.evaluate(() => { const ed = window.LSPOD6.editors[0]; const e = ed.st.ebenen.front[0]; for (let i = 0; i < 25; i++) { e.cx = 0.2 + i * 0.01; ed.waehlen(e.id); } e.text = 'Ende'; ed.waehlen(e.id); });
  await p.waitForTimeout(400);
  const v4 = Number(await p.locator('.lsp6-pv').getAttribute('data-gezeichnet'));
  pruefe('25 schnelle Änderungen ergeben höchstens 4 Zeichenläufe', v4 - v3 >= 1 && v4 - v3 <= 4, String(v4 - v3));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 11b. Zeichenflächen werden freigegeben (iOS-Safari begrenzt den Speicher aller Zeichenflächen) ────────────────
szenario('leinwaende-freigeben', true, async (b, srv) => {
  const zaehler = `(() => { const o = document.createElement.bind(document); window.__cvs = []; document.createElement = function (t, ...r) { const e = o(t, ...r); if (String(t).toLowerCase() === 'canvas') window.__cvs.push(e); return e; }; })();`;
  const s = await oeffnen(b, srv, TSHIRT, { initSkript: zaehler });
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Hallo');
  await produktAnsicht(p);
  for (let i = 0; i < 12; i++) {
    const v = Number(await p.locator('.lsp6-pv').getAttribute('data-gezeichnet'));
    await p.evaluate((i2) => { const ed = window.LSPOD6.editors[0]; const e = ed.st.ebenen.front[0]; e.text = 'Text ' + i2; ed.waehlen(e.id); }, i);
    await p.waitForFunction((x) => Number(document.querySelector('.lsp6-pv').getAttribute('data-gezeichnet')) > x, v, { timeout: 8000 });
  }
  await p.waitForTimeout(300);
  const z = await p.evaluate(() => ({ gesamt: window.__cvs.length, lebend: window.__cvs.filter((c) => !c.isConnected && c.width > 0 && c.height > 0).length }));
  pruefe(`nach 12 Neuzeichnungen sind ausserhalb der Seite höchstens 3 Zeichenflächen mit Inhalt übrig (${z.gesamt} wurden angelegt, ${z.lebend} nicht freigegeben)`, z.gesamt >= 24 && z.lebend <= 3, JSON.stringify(z));
  // der Export gibt seine Flächen ebenfalls frei
  await p.evaluate(async () => { const ed = window.LSPOD6.editors[0]; for (let i = 0; i < 4; i++) await ed.vorschauExport(); });
  const z2 = await p.evaluate(() => window.__cvs.filter((c) => !c.isConnected && c.width > 0 && c.height > 0).length);
  pruefe('nach vier Exporten bleibt es bei höchstens 3 nicht freigegebenen Zeichenflächen', z2 <= 3, String(z2));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 12. Zeichenzeit (nicht im Kern der Mutationsprobe: hängt von der Last ab) ─────────────────────
szenario('zeichenzeit', false, async (b, srv) => {
  const s = await oeffnen(b, srv, TSHIRT);
  const p = s.page; await sichtWarten(p);
  await textHinzufuegen(p, 'Zeichenzeit');
  // Gemessen wird bis zum fertigen Raster (getImageData erzwingt es: ohne das misst man nur das Aufzeichnen der Zeichenbefehle), ausserdem bis zum nächsten Bild des Browsers.
  const mess = await p.evaluate(async () => {
    const ed = window.LSPOD6.editors[0];
    const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 1000;
    const ctx = cv.getContext('2d', { willReadFrequently: false });
    await ed.vorschauZeichnen(cv, {});   // kalt: Bilder laden
    const raster = [], bild = [];
    for (let i = 0; i < 30; i++) {
      const t0 = performance.now();
      const r = await ed.vorschauZeichnen(cv, {});
      if (!r.ok) return { fehler: r.grund };
      ctx.getImageData(0, 0, 1, 1);
      raster.push(performance.now() - t0);
    }
    for (let i = 0; i < 30; i++) {
      const t0 = performance.now();
      await ed.vorschauZeichnen(cv, {});
      ctx.getImageData(0, 0, 1, 1);
      await new Promise((ok) => requestAnimationFrame(() => ok()));
      bild.push(performance.now() - t0);
    }
    raster.sort((a, b2) => a - b2); bild.sort((a, b2) => a - b2);
    return { median: raster[15], max: raster[29], min: raster[0], bildMedian: bild[15], bildMax: bild[29] };
  });
  console.log(`    Zeichenzeit bei 1000 px (30 Läufe, warm, bis zum Raster): min ${mess.min?.toFixed(1)} ms, Median ${mess.median?.toFixed(1)} ms, max ${mess.max?.toFixed(1)} ms; bis zum nächsten Bild: Median ${mess.bildMedian?.toFixed(1)} ms, max ${mess.bildMax?.toFixed(1)} ms`);
  pruefe('Neuzeichnen bei 1000 px: Median höchstens 30 ms (bis zum fertigen Raster)', mess.median <= 30, JSON.stringify(mess));
  pruefe('Neuzeichnen bei 1000 px: Median höchstens 30 ms bis zum nächsten Bild des Browsers', mess.bildMedian <= 30, JSON.stringify(mess));
  await s.schliessen();
  const t = await oeffnen(b, srv, TASSE);
  await sichtWarten(t.page);
  await textHinzufuegen(t.page, 'Tasse');
  const mt = await t.page.evaluate(async () => {
    const ed = window.LSPOD6.editors[0];
    const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 1000;
    const ctx = cv.getContext('2d');
    await ed.vorschauZeichnen(cv, {});
    const zeiten = [];
    for (let i = 0; i < 20; i++) { const t0 = performance.now(); await ed.vorschauZeichnen(cv, {}); ctx.getImageData(0, 0, 1, 1); zeiten.push(performance.now() - t0); }
    zeiten.sort((a, b2) => a - b2);
    return { median: zeiten[10], max: zeiten[19] };
  });
  console.log(`    Zeichenzeit Tasse bei 1000 px (bis zum Raster): Median ${mt.median.toFixed(1)} ms, max ${mt.max.toFixed(1)} ms`);
  pruefe('Tasse (Zylinder, 48 Scheiben) bei 1000 px: Median höchstens 30 ms', mt.median <= 30, JSON.stringify(mt));
  await t.schliessen();
});

// ── Lauf ────────────────────────────────────────────────────────────────────────────────────────
const srv = await starteServer();
const browser = await chromium.launch();
const auswahl = szenarien.filter((x) => (nur === 'kern' ? x.kern : !nur || x.name.startsWith(nur)));
for (const sz of auswahl) {
  const t0 = Date.now();
  const vorher = fehler.length;
  try { await sz.fn(browser, srv); } catch (e) { n++; fehler.push(`${sz.name}: Ausnahme ${e.message.split('\n')[0]}`); console.log(`  ✗ ${sz.name}: Ausnahme ${e.message.split('\n').slice(0, 3).join(' / ')}`); if (process.env.V6_ABBRUCH) process.exit(1); }
  console.log(`${fehler.length === vorher ? '✓' : '✗'} ${sz.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close(); await srv.stop();
console.log(fehler.length ? `\n${fehler.length} von ${n} Prüfungen FEHLGESCHLAGEN` : `\n${n} Prüfungen bestanden`);
process.exit(fehler.length ? 1 : 0);
