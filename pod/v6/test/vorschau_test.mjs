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
function pruefe(name, ok, detail = '') { n++; if (!ok) { fehler.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); } }
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
  // Tassenfoto nicht gespiegelt (null): Printful sendet für /products/ keinen CORS-Kopf → sauberer Rückfall auf die Druckfläche
  const t = await oeffnen(b, srv, `${TASSE}&spiegel=0`, { corsErwartet: true, printfulBild: (u) => (/\/products\//.test(u) ? { typ: 'image/png', body: tassePng(), cors: false } : null) });
  await sichtWarten(t.page);
  await textHinzufuegen(t.page, 'Hallo');
  await t.page.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await t.page.waitForFunction(() => document.querySelector('[data-feld="sichthinweis"]').textContent.length > 0, null, { timeout: 12000 });
  pruefe('Tasse ohne Spiegel (kein CORS): Rückfall auf die Druckfläche mit ruhigem Hinweis', (await t.page.evaluate(() => window.LSPOD6.editors[0].st.sicht)) === 'druck' && /nicht verfügbar/.test(await t.page.locator('[data-feld="sichthinweis"]').innerText()) && await t.page.locator('.lsp6-stagewrap').isVisible());
  const ex = await t.page.evaluate(async () => { const b2 = await window.LSPOD6.editors[0].vorschauExport(); return b2 ? b2.size : null; });
  pruefe('Tasse ohne Spiegel: kein JPEG (die Zeichenfläche wäre verschmutzt)', ex === null, String(ex));
  pruefe('Tasse ohne Spiegel: keine Seitenfehler', t.fehler.length === 0, t.fehler.join(' | '));
  await t.schliessen();
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
  pruefe('Foto mit viel Rauschen: entweder höchstens 80 KB oder kein Bild, nie eine zu grosse Datei', g === null || g.size <= 81920, JSON.stringify(g));
  await p.evaluate(() => { const ed = window.LSPOD6.editors[0]; const e2 = ed.st.ebenen.front[0]; e2.scale = 0.18; });
  const k = await info();
  pruefe('kleineres Rausch-Foto passt unter 80 KB (die Qualität wird gesenkt, die Grösse bleibt 800 × 800)', !!k && k.size <= 81920 && k.w === 800, JSON.stringify(k));
  await s.schliessen();
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
  pruefe('Tasse (Zylinder, 380 Streifen) bei 1000 px: Median höchstens 30 ms', mt.median <= 30, JSON.stringify(mt));
  await t.schliessen();
});

// ── Lauf ────────────────────────────────────────────────────────────────────────────────────────
const srv = await starteServer();
const browser = await chromium.launch();
const auswahl = szenarien.filter((x) => (nur === 'kern' ? x.kern : !nur || x.name.startsWith(nur)));
for (const sz of auswahl) {
  const t0 = Date.now();
  const vorher = fehler.length;
  try { await sz.fn(browser, srv); } catch (e) { n++; fehler.push(`${sz.name}: Ausnahme ${e.message.split('\n')[0]}`); console.log(`  ✗ ${sz.name}: Ausnahme ${e.message.split('\n').slice(0, 3).join(' / ')}`); }
  console.log(`${fehler.length === vorher ? '✓' : '✗'} ${sz.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close(); await srv.stop();
console.log(fehler.length ? `\n${fehler.length} von ${n} Prüfungen FEHLGESCHLAGEN` : `\n${n} Prüfungen bestanden`);
process.exit(fehler.length ? 1 : 0);
