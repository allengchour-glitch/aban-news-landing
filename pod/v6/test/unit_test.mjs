/**
 * Tests ohne Browser und ohne Netz für den Editor v6: die reinen Funktionen von lspod-designer-v6.js (in einer vm geladen), der Kartenbau
 * (werkzeug/karte_fuer_editor.mjs: Einzelkarte, Kartenbündel, Filter, Prüfungen) und der Vertrag der Warenkorb-Eigenschaften mit der Auftragsabwicklung
 * (automation/lib/printful_bestellweg.mjs wird nur gelesen/importiert, nicht verändert).
 * Die Vergleiche mit preisformel.mjs und schweizer_masse.mjs sind der Beleg, dass die in den Editor kopierten Formeln dieselben Zahlen liefern.
 * Aufruf: node unit_test.mjs
 */
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { hier, repo, V6_DATEI, V5_DATEI, istUmgebungsfehler } from './lib.mjs';
import { aufpreisChf as aufpreisRef } from '../../../dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs';
import { schweizerZahl as zahlRef } from '../../../dropship/selbst-gestalten-fertig-0511/werkzeuge/schweizer_masse.mjs';
import { pathToFileURL } from 'node:url';
// V6_KARTENBAUER: andere Fassung des Kartenbauers (für die Mutationsprobe)
const { karteFuerEditor, kartenbuendelFuerEditor, shopVariantenNormalisieren, podKarteGroesstmoeglich, kartenWarnungen, BEKANNTE_HINWEIS_CODES, POD_KARTE_MAX } =
  await import(process.env.V6_KARTENBAUER ? pathToFileURL(process.env.V6_KARTENBAUER).href : '../werkzeug/karte_fuer_editor.mjs');
import { dateienAusEigenschaften } from '../../../automation/lib/printful_bestellweg.mjs';
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
// V6_VORSCHAUBAUER: andere Fassung des Vorschaubauers (für die Mutationsprobe)
const VB_PFAD = process.env.V6_VORSCHAUBAUER || join(hier, '..', 'werkzeug', 'vorschau_daten_bauen.mjs');
const VB = await import(pathToFileURL(VB_PFAD).href);

let n = 0; const fehler = [];
function pruefe(name, ok, detail = '') { n++; if (!ok) { fehler.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); if (process.env.V6_ABBRUCH) process.exit(1); } }   // V6_ABBRUCH=1 (nur Mutationsprobe): beim ersten Fehler beenden, das genügt zum Erkennen
function gleich(name, ist, soll) { pruefe(name, JSON.stringify(ist) === JSON.stringify(soll), `ist=${JSON.stringify(ist)} soll=${JSON.stringify(soll)}`); }
function nahe(name, ist, soll, eps = 1e-9) { pruefe(name, Math.abs(ist - soll) <= eps, `ist=${ist} soll=${soll}`); }

// ── v6 in einer vm laden (keine Seite: es wird nichts gemountet) ───────────────────────────────────
function neuerGlobal() {
  const g = { Shopify: { locale: 'de' }, location: { search: '' }, console, setTimeout: () => 0, addEventListener() {} };
  g.window = g;
  g.document = { readyState: 'complete', documentElement: { lang: 'de' }, querySelectorAll: () => [], getElementById: () => null, addEventListener() {} };
  return vm.createContext(g);
}
function ladeV6(datei = V6_DATEI, g = neuerGlobal()) {
  vm.runInContext(readFileSync(datei, 'utf8'), g, { filename: 'lspod-designer-v6.js' });
  return g;
}
const win = ladeV6();
const H = win.LSPOD6.hilfen;
const SOLL_VERSION = process.env.V6_VERSION || '6.2.0';   // V6_VERSION=6.1.0 mit V6_DATEI=…/lspod-designer-v6.js prüft die Rücknahme-Fassung
const NEU = SOLL_VERSION !== '6.1.0';   // die Hilfen und der Vorschaubauer von 6.2.0 gibt es in 6.1.0 nicht
pruefe('v6 lädt ohne Seite und meldet seine Version', win.LSPOD6.version === SOLL_VERSION, win.LSPOD6.version);
pruefe('Guard gegen Doppelladen gesetzt', win.__lspodDesignerLoaded === undefined && win.__lspodDesignerV6Loaded === true, 'v6 darf den Guard von v5 nicht setzen');
{
  const g = ladeV6(); const erste = g.LSPOD6; ladeV6(V6_DATEI, g);
  pruefe('Guard: zweites Laden in derselben Seite ersetzt nichts', g.LSPOD6 === erste);
}

// ── Aufpreis: gleiche Zahlen wie preisformel.aufpreisChf ───────────────────────────────────────────
let abw = 0;
for (let c = 0; c <= 3000; c++) { const usd = c / 100; if (Math.abs(H.aufpreisChf(usd) - aufpreisRef(usd)) > 1e-9) abw++; }
pruefe('aufpreisChf = preisformel.aufpreisChf für 0 bis 30 USD in Cent-Schritten (3001 Werte)', abw === 0, `${abw} Abweichungen`);
gleich('Rückseite 5.95 USD → CHF 6.10', H.aufpreisChf(5.95), 6.1);
gleich('Ärmel 2.49 USD → CHF 2.60', H.aufpreisChf(2.49), 2.6);
gleich('Stickerei 2.95 USD → CHF 3.00', H.aufpreisChf(2.95), 3.0);
gleich('negativer Aufpreis ergibt null', H.aufpreisChf(-1), null);
gleich('platzierungAufpreisChf: Wert der Karte hat Vorrang', H.platzierungAufpreisChf({ aufpreisChf: 7.7, aufpreisUsd: 5.95 }), 7.7);
gleich('platzierungAufpreisChf: aus USD gerechnet', H.platzierungAufpreisChf({ aufpreisUsd: 5.95 }), 6.1);
gleich('platzierungAufpreisChf: im Preis enthalten = 0', H.platzierungAufpreisChf({ aufpreisUsd: null }), 0);

// ── Zahlen wie schweizer_masse.schweizerZahl ───────────────────────────────────────────────────────
abw = 0;
for (let i = 0; i < 4000; i++) { const x = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 200 - 50; for (const d of [0, 1, 2]) if (H.schweizerZahl(x, d) !== zahlRef(x, d)) abw++; }
pruefe('schweizerZahl = schweizer_masse.schweizerZahl (12 000 Werte)', abw === 0, `${abw} Abweichungen`);
for (const [x, d] of [[30.48, 1], [21, 1], [0.05, 1], [-0.04, 1], [2.5, 0], [1e-9, 1]]) pruefe(`schweizerZahl(${x},${d})`, H.schweizerZahl(x, d) === zahlRef(x, d));
pruefe('schweizerZahl: kein «-0»', !H.schweizerZahl(-0.04, 1).startsWith('-'));

// ── Dateigrösse und Pixel ──────────────────────────────────────────────────────────────────────────
const m1 = H.dateiMasse({ breitePx: 1800, hoehePx: 2400, dpi: 150 });
nahe('dateiMasse 1800 px bei 150 dpi = 30,48 cm', m1.breite, 30.48, 1e-9); nahe('dateiMasse 2400 px = 40,64 cm', m1.hoehe, 40.64, 1e-9);
gleich('dateiMasse ohne dpi (Strick, v5-Modus) = null', H.dateiMasse({ breitePx: 100, hoehePx: 100, dpi: null }), null);
gleich('dateiMasse mit dpi unter 10 (Maschen) = null', H.dateiMasse({ breitePx: 100, hoehePx: 100, dpi: 1 }), null);
gleich('renderGroesse: T-Shirt bleibt in echter Grösse', H.renderGroesse({ breitePx: 1800, hoehePx: 2400 }, H.MAX_PIXEL), { w: 1800, h: 2400, k: 1 });
const rp = H.renderGroesse({ breitePx: 9933, hoehePx: 7016 }, H.MAX_PIXEL);
pruefe('renderGroesse: Poster 69,7 Mpx wird unter die Grenze gebracht', rp.w * rp.h <= H.MAX_PIXEL && rp.k < 1, JSON.stringify(rp));
pruefe('renderGroesse: Seitenverhältnis des Posters bleibt (auf 1 Pixel)', Math.abs(rp.w / rp.h - 9933 / 7016) < 1.5 / rp.h, JSON.stringify(rp));
gleich('renderGroesse: Hoodie 6000² → 4096²', H.renderGroesse({ breitePx: 6000, hoehePx: 6000 }, H.MAX_PIXEL), { w: 4096, h: 4096, k: 4096 / 6000 });
gleich('renderGroesse: Grenze 0 = keine Grenze', H.renderGroesse({ breitePx: 9933, hoehePx: 7016 }, 0), { w: 9933, h: 7016, k: 1 });
pruefe('renderGroesse: genau an der Grenze keine Verkleinerung', H.renderGroesse({ breitePx: 4096, hoehePx: 4096 }, 16777216).k === 1);

// ── Sichtfenster ───────────────────────────────────────────────────────────────────────────────────
const vlTee = { vorlageBreite: 3000, vorlageHoehe: 3000, flaecheLinks: 1006, flaecheOben: 530, flaecheBreite: 1010, flaecheHoehe: 1346 };
const wz = H.sichtfenster(vlTee, 'flaeche');
pruefe('Sichtfenster enthält die Druckfläche', wz.x <= 1006 && wz.y <= 530 && wz.x + wz.w >= 2016 && wz.y + wz.h >= 1876, JSON.stringify(wz));
pruefe('Sichtfenster liegt in der Vorlage', wz.x >= 0 && wz.y >= 0 && wz.x + wz.w <= 3000 && wz.y + wz.h <= 3000);
nahe('Sichtfenster: 10 % Rand um die längere Seite', wz.x, 1006 - 134.6, 1e-9);
gleich('Sichtfenster «vorlage» = ganze Vorlage', H.sichtfenster(vlTee, 'vorlage'), { x: 0, y: 0, w: 3000, h: 3000 });
const wh = H.sichtfenster({ vorlageBreite: 3000, vorlageHoehe: 3000, flaecheLinks: 182, flaecheOben: -14, flaecheBreite: 2636, flaecheHoehe: 2636 }, 'flaeche');
pruefe('Sichtfenster: Fläche ragt über den Rand (Hoodie, oben −14): Fenster enthält sie trotzdem', wh.y <= -14 && wh.y + wh.h >= 2622 && wh.x <= 182, JSON.stringify(wh));
const wm = H.sichtfenster({ vorlageBreite: 728, vorlageHoehe: 728, flaecheLinks: 29, flaecheOben: 163, flaecheBreite: 671, flaecheHoehe: 261 }, 'flaeche');
pruefe('Sichtfenster Tasse: nie breiter als die Vorlage', wm.x >= 0 && wm.x + wm.w <= 728, JSON.stringify(wm));

// ── Karten laden und prüfen ────────────────────────────────────────────────────────────────────────
const lies = (id) => JSON.parse(readFileSync(join(hier, 'testdaten', `${id}.karte.json`), 'utf8'));
const K = {};
for (const id of [71, 19, 268, 206, 388, 586, 456]) { const r = H.karteNormalisieren(lies(id)); pruefe(`Karte ${id} ist gültig`, !!r.karte, r.fehler); K[id] = r.karte; }
gleich('Platzierungen T-Shirt', K[71].platzierungen.map((p) => p.id), ['front', 'front_large', 'back', 'sleeve_left', 'sleeve_right', 'label_inside', 'label_outside', 'label_inside_dtf']);
gleich('Platzierungen Tasse', K[19].platzierungen.map((p) => p.id), ['default']);
gleich('Platzierungen Dad-Cap', K[206].platzierungen.map((p) => p.id), ['embroidery_front_large', 'embroidery_back', 'embroidery_right', 'embroidery_left']);
gleich('Platzierungen Hoodie (Schnittteile)', K[388].platzierungen.map((p) => p.id), ['front', 'back', 'sleeve_right', 'sleeve_left', 'pocket', 'hood', 'label_panel', 'label_inside']);
pruefe('Mindest-dpi: T-Shirt 75 und Poster 150 aus der Karte', K[71].minDpi === 75 && K[268].minDpi === 150, `${K[71].minDpi}/${K[268].minDpi}`);
pruefe('Mindest-dpi fehlt in der Karte → Vorgabe 100', H.karteNormalisieren({ ...lies(71), minDpi: undefined }).karte.minDpi === 100);
pruefe('Mindest-dpi ungültig (0, Text) → Vorgabe 100', H.karteNormalisieren({ ...lies(71), minDpi: 0 }).karte.minDpi === 100 && H.karteNormalisieren({ ...lies(71), minDpi: 'x' }).karte.minDpi === 100);
// Konflikte: symmetrisch und nur gegen Platzierungen des Editors
pruefe('Konflikte: front ↔ front_large (beide Richtungen)', K[71].konflikte.front.front_large && K[71].konflikte.front_large.front);
pruefe('Konflikte: back ↔ label_outside', K[71].konflikte.back.label_outside && K[71].konflikte.label_outside.back);
pruefe('Konflikte: Platzierungen ausserhalb des Editors (front_dtf) tauchen nicht auf', !Object.keys(K[71].konflikte.front).includes('front_dtf'));
pruefe('Konflikte: front und back kollidieren nicht', !K[71].konflikte.front.back);
{
  // Der Katalog nennt Konflikte meist in beiden Richtungen; die Karte muss auch eine einseitige Angabe in beide Richtungen sperren
  const ein = lies(71); ein.platzierungen.forEach((p) => { if (p.id === 'front_large') p.kollidiertMit = []; });
  const kk = H.karteNormalisieren(ein).karte;
  pruefe('Konflikte: einseitige Angabe (front nennt front_large, nicht umgekehrt) sperrt beide Richtungen', kk.konflikte.front_large.front === true && kk.konflikte.front.front_large === true);
  pruefe('Konflikte: eine Platzierung kollidiert nie mit sich selbst', Object.keys(K[71].konflikte).every((id) => !K[71].konflikte[id][id]));
}
gleich('Konflikte Dad-Cap: keine im Editor', Object.values(K[206].konflikte).map((o) => Object.keys(o).length), [0, 0, 0, 0]);
gleich('blockierer: back mit Ebenen blockiert label_outside', H.blockierer(K[71], 'label_outside', { back: [{}], front: [] }), ['back']);
gleich('blockierer: leere Ebenen blockieren nicht', H.blockierer(K[71], 'label_outside', { back: [], front: [{}] }), []);
gleich('blockierer: eigene Ebenen blockieren sich nicht', H.blockierer(K[71], 'front', { front: [{}] }), []);

// Ungültige Karten
pruefe('null → Fehler', !!H.karteNormalisieren(null).fehler);
pruefe('Schema 2 → Fehler', /unbekannt/.test(H.karteNormalisieren({ schema: 2, platzierungen: [] }).fehler));
pruefe('ohne platzierungen → Fehler', !!H.karteNormalisieren({ schema: 1 }).fehler);
pruefe('leere platzierungen → Fehler', !!H.karteNormalisieren({ schema: 1, platzierungen: [] }).fehler);
const kaputt = lies(71); kaputt.platzierungen[0].printfile.breitePx = 0;
pruefe('Platzierung mit Breite 0 wird verworfen, der Rest bleibt', H.karteNormalisieren(kaputt).karte.platzierungen.length === 7);
const kaputt2 = lies(71); delete kaputt2.platzierungen[1].vorlage.flaecheBreite;
pruefe('Platzierung ohne Flächenbreite wird verworfen', H.karteNormalisieren(kaputt2).karte.platzierungen.length === 7);
const ohneSchema = lies(71); delete ohneSchema.schema;
pruefe('Karte ohne Feld «schema» ist erlaubt (Versionsfeld optional)', !!H.karteNormalisieren(ohneSchema).karte);
pruefe('Eingabe wird nicht verändert', (() => { const k = lies(71); const vorher = JSON.stringify(k); H.karteNormalisieren(k); return JSON.stringify(k) === vorher; })());

// Shop-Zuordnung
const mitShop = lies(19); mitShop.shop = { varianten: { 1001: 1320, 1002: { printfulVariantId: 4830 }, 1003: '', 1004: null } };
const sn = H.karteNormalisieren(mitShop).karte.shop;
gleich('Shop-Zuordnung: Zahl und Objekt gelesen, leer verworfen', sn, { 1001: 1320, 1002: 4830 });
// Farben
const fk = H.karteNormalisieren({ ...lies(71), farben: { '#ffffff': [1, 2], 'rot': [3], '#000000': 'x' } }).karte.farbeVon;
gleich('Farben: nur gültige Hex-Werte mit Liste', fk, { 1: '#ffffff', 2: '#ffffff' });

// Kartenbündel (ein Shop-Produkt aus mehreren Printful-Modellen)
{
  const buendel = { schema: 1, modelle: { 71: lies(71), 586: lies(586) }, shop: { varianten: { 1001: { pv: 4012, m: 71 }, 1002: { pv: 15124, m: 586 }, 1003: { pv: 1, m: 999 }, 1004: { pv: null, m: 71 }, 1005: 4013 } } };
  const r = H.karteNormalisieren(buendel);
  pruefe('Bündel: gültig', !!r.karte && r.karte.buendel === true && r.karte.legacy === false, r.fehler);
  gleich('Bündel: Modelle in der Reihenfolge der Schlüssel', r.karte.reihenfolge, ['71', '586']);
  gleich('Bündel: Zuordnung nur gültige Einträge (Modell fehlt, pv fehlt, Zahl ohne Modell werden verworfen)', r.karte.zuordnung, { 1001: { pv: 4012, m: '71' }, 1002: { pv: 15124, m: '586' } });
  pruefe('Bündel: Vereinigung der Platzierungen enthält front_large (nur Modell 71) und label_inside_dtf', r.karte.alleIds.includes('front_large') && r.karte.alleIds.includes('label_inside_dtf'));
  pruefe('Bündel: Modell 586 hat kein front_large', !r.karte.modelle[586].platzierungen.some((p) => p.id === 'front_large') && r.karte.modelle[71].platzierungen.some((p) => p.id === 'front_large'));
  pruefe('Bündel: Konflikte je Modell getrennt', !!r.karte.modelle[71].konflikte.front.front_large && !r.karte.modelle[586].konflikte.front_large);
  pruefe('Bündel ohne Modelle → Fehler', !!H.karteNormalisieren({ schema: 1, modelle: {} }).fehler);
  pruefe('Bündel ohne Zuordnung → Fehler (jede Variante wäre gesperrt)', /ohne Zuordnung/.test(H.karteNormalisieren({ schema: 1, modelle: { 71: lies(71) } }).fehler));
  pruefe('Bündel mit unbrauchbarem Modell → ganzes Bündel unbrauchbar', /Modell 586/.test(H.karteNormalisieren({ ...buendel, modelle: { 71: lies(71), 586: { schema: 1, platzierungen: [] } } }).fehler));
  pruefe('Bündel: Schlüssel und printfulProductId müssen übereinstimmen', /passt nicht zum Schlüssel/.test(H.karteNormalisieren({ ...buendel, modelle: { 71: lies(71), 586: lies(71) } }).fehler));
  pruefe('Bündel im Bündel → Fehler', !!H.karteNormalisieren({ schema: 1, modelle: { 71: { modelle: {} } }, shop: { varianten: { 1: { pv: 1, m: 71 } } } }).fehler);
  pruefe('Bündel: Schema 2 → Fehler', /unbekannt/.test(H.karteNormalisieren({ ...buendel, schema: 2 }).fehler));
  pruefe('Bündel: Eingabe wird nicht verändert', (() => { const b = JSON.parse(JSON.stringify(buendel)); const v = JSON.stringify(b); H.karteNormalisieren(b); return JSON.stringify(b) === v; })());
}

// ── Geometrie je Variante ──────────────────────────────────────────────────────────────────────────
const tasse = K[19]; const tp = tasse.platzierungen[0];
const dim = (g) => `${g.printfile.breitePx}x${g.printfile.hoehePx}`;
gleich('Tasse 11 oz (Variante 1320)', dim(H.geometrieFuer(tasse, tp, 1320)), '2700x1050');
const pf15 = tasse.druckdateien[tasse.druckdateiGruppen[1].platzierungen.default]; const pf20 = tasse.druckdateien[tasse.druckdateiGruppen[2].platzierungen.default];
gleich('Tasse 15 oz (Variante 4830) aus Gruppe', dim(H.geometrieFuer(tasse, tp, 4830)), `${pf15.breitePx}x${pf15.hoehePx}`);
gleich('Tasse 20 oz (Variante 16586) aus Gruppe', dim(H.geometrieFuer(tasse, tp, 16586)), `${pf20.breitePx}x${pf20.hoehePx}`);
pruefe('Tasse: die drei Grössen sind verschieden', new Set([1320, 4830, 16586].map((v) => dim(H.geometrieFuer(tasse, tp, v)))).size === 3);
pruefe('Tasse: Vorlage folgt der Variante (Fläche 15 oz ≠ 11 oz)', H.geometrieFuer(tasse, tp, 4830).vorlage.flaecheBreite !== H.geometrieFuer(tasse, tp, 1320).vorlage.flaecheBreite || H.geometrieFuer(tasse, tp, 4830).vorlage.flaecheHoehe !== H.geometrieFuer(tasse, tp, 1320).vorlage.flaecheHoehe);
gleich('Tasse: unbekannte Variante = Standard', dim(H.geometrieFuer(tasse, tp, 999999)), '2700x1050');
gleich('Tasse: keine Variante = Standard', dim(H.geometrieFuer(tasse, tp, null)), '2700x1050');
gleich('T-Shirt: Variante ohne Gruppen = Standard', dim(H.geometrieFuer(K[71], K[71].platzierungen[0], 4012)), '1800x2400');
const poster = K[268]; const pop = poster.platzierungen[0];
pruefe('Poster: 7 Varianten, 7 verschiedene Druckdateien', new Set(Object.keys(poster.varianten).map((v) => dim(H.geometrieFuer(poster, pop, Number(v))))).size === 7);
pruefe('Poster: jede Variante nimmt die Grösse ihrer Gruppe', Object.values(poster.varianten).every((v) => { const id = poster.druckdateiGruppen[v.druckdateiGruppe].platzierungen.default; const g = H.geometrieFuer(poster, pop, v.printfulVariantId); return g.printfile.breitePx === poster.druckdateien[id].breitePx && g.printfile.hoehePx === poster.druckdateien[id].hoehePx; }));

// ── Auflösung ──────────────────────────────────────────────────────────────────────────────────────
const pfTee = { breitePx: 1800, hoehePx: 2400, dpi: 150 };
nahe('bildDpi: 300 px Foto bei Breite 0,5 · 1800 px = 6 Zoll → 50 dpi', H.bildDpi({ scale: 1, _origW: 300, edit: { cw: 1, ch: 1, rotQ: 0 } }, pfTee, { k: 1 }), 50, 1e-9);
nahe('bildDpi: Zuschnitt auf die Hälfte halbiert die Pixel', H.bildDpi({ scale: 1, _origW: 300, edit: { cw: 0.5, ch: 1, rotQ: 0 } }, pfTee, { k: 1 }), 25, 1e-9);
nahe('bildDpi: gedreht um 90° zählt die Höhe des Ausschnitts', H.bildDpi({ scale: 1, _origW: 300, _origH: 400, edit: { cw: 1, ch: 1, rotQ: 1 } }, pfTee, { k: 1 }), 400 / 6, 1e-9);
nahe('bildDpi: nie mehr als die Pixeldichte der Druckdatei (Obergrenze greift)', H.bildDpi({ scale: 1, _origW: 99999, edit: { cw: 1, ch: 1, rotQ: 0 } }, pfTee, { k: 1 }), 150, 1e-9);
nahe('bildDpi: bei verkleinerter Druckdatei sinkt die Obergrenze', H.bildDpi({ scale: 1, _origW: 99999, edit: { cw: 1, ch: 1, rotQ: 0 } }, pfTee, { k: 0.5 }), 75, 1e-9);
gleich('bildDpi ohne bekannte Originalgrösse = null', H.bildDpi({ scale: 1, edit: { cw: 1, ch: 1, rotQ: 0 } }, pfTee, { k: 1 }), null);
gleich('bildDpi ohne dpi der Druckdatei = null', H.bildDpi({ scale: 1, _origW: 300, edit: { cw: 1, ch: 1, rotQ: 0 } }, { breitePx: 1200, hoehePx: 1200, dpi: null }, { k: 1 }), null);

// ── v5-Modus: Karte aus den Attributen ─────────────────────────────────────────────────────────────
const fake = (a) => ({ getAttribute: (k) => (k in a ? a[k] : null) });
const lk = H.legacyKarte(fake({ 'data-img-front': '/a.png', 'data-img-back': '/b.png', 'data-ratio': '1.2', 'data-variant': '77', 'data-img-map': '{"77":"/c.png"}' }));
gleich('v5-Modus: Leinwand 1200 × 1440 bei ratio 1,2', [lk.platzierungen[0].printfile.breitePx, lk.platzierungen[0].printfile.hoehePx], [1200, 1440]);
gleich('v5-Modus: Vorne und Hinten', lk.platzierungen.map((p) => p.id), ['front', 'back']);
gleich('v5-Modus: ohne Rückseite nur Vorne', H.legacyKarte(fake({ 'data-img-front': '/a.png' })).platzierungen.map((p) => p.id), ['front']);
gleich('v5-Modus: Rückseite gleich Vorderseite = nur Vorne', H.legacyKarte(fake({ 'data-img-front': '/a.png', 'data-img-back': '/a.png' })).platzierungen.length, 1);
gleich('v5-Modus: data-ref unter 600 → 1200', H.legacyKarte(fake({ 'data-ref': '100' })).platzierungen[0].printfile.breitePx, 1200);
gleich('v5-Modus: data-ref 800 gilt', H.legacyKarte(fake({ 'data-ref': '800', 'data-ratio': '1' })).platzierungen[0].printfile.hoehePx, 800);
gleich('v5-Modus: ratio ungültig → 1', H.legacyKarte(fake({ 'data-ratio': 'x' })).platzierungen[0].printfile.hoehePx, 1200);
gleich('v5-Modus: kaputtes data-img-map → leer', H.legacyKarte(fake({ 'data-img-map': '{' })).imgMap, {});
gleich('v5-Modus: data-img als Rückfall für die Vorderseite', H.legacyKarte(fake({ 'data-img': '/z.png' })).platzierungen[0].vorlage.bildUrl, '/z.png');
pruefe('v5-Modus: ohne dpi (keine cm)', H.dateiMasse(lk.platzierungen[0].printfile) === null);

// ── Kartenbau ──────────────────────────────────────────────────────────────────────────────────────
pruefe('Hinweis-Codes des Kartenbaus = Kundentexte im Editor', JSON.stringify([...BEKANNTE_HINWEIS_CODES].sort()) === JSON.stringify([...H.HINWEIS_CODES].sort()), `${BEKANNTE_HINWEIS_CODES} / ${H.HINWEIS_CODES}`);
const katalogOrdner = process.env.V6_KATALOG || '';
const OPT_TEST = { panelErlauben: true };
if (katalogOrdner && existsSync(join(katalogOrdner, '71.json'))) {
  for (const id of [71, 19, 268, 206, 388, 586, 456]) {
    const neu = karteFuerEditor(JSON.parse(readFileSync(join(katalogOrdner, `${id}.json`), 'utf8')), OPT_TEST);
    pruefe(`Test-Karte ${id} = frischer Bau aus dem Katalog`, readFileSync(join(hier, 'testdaten', `${id}.karte.json`), 'utf8') === JSON.stringify(neu, null, 1) + '\n');
    pruefe(`Karte ${id} schlank (unter 12 KB)`, JSON.stringify(neu).length < 12000, String(JSON.stringify(neu).length));
    pruefe(`Karte ${id} hat keine internen Texte (Erfahrungswert, Messdatei, USD)`, !/Erfahrungswert|messung_0511|1:1 an Printful/.test(JSON.stringify(neu)));
    pruefe(`Karte ${id}: Aufpreise nur in CHF der Preisformel`, neu.platzierungen.every((p) => (p.aufpreisUsd ? p.aufpreisChf === aufpreisRef(p.aufpreisUsd) : p.aufpreisChf === 0)));
  }
} else console.log('  (Katalogordner V6_KATALOG nicht gesetzt: Vergleich Test-Karten gegen frischen Bau übersprungen)');
// Kartenbau gegen die Test-Kataloge im Repo (dropship/selbst-gestalten-fertig-0511/werkzeuge/testdaten/katalog): läuft immer
{
  const KAT = join(repo, 'dropship', 'selbst-gestalten-fertig-0511', 'werkzeuge', 'testdaten', 'katalog');
  const kat = (id) => JSON.parse(readFileSync(join(KAT, `${id}.json`), 'utf8'));
  const werft = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };
  const v19 = kat(19).varianten[0].id, v206 = kat(206).varianten[0].id;
  const mit = karteFuerEditor(kat(19), { shopVarianten: { 111: v19 } });
  gleich('Kartenbau: Shop-Zuordnung wird durchgereicht', mit.shop, { varianten: { 111: v19 } });
  pruefe('Kartenbau: ohne Zuordnung kein Feld «shop»', !('shop' in karteFuerEditor(kat(19))));
  gleich('Kartenbau: GID-Schlüssel werden zu Zahlen', karteFuerEditor(kat(19), { shopVarianten: { 'gid://shopify/ProductVariant/4455': v19 } }).shop, { varianten: { 4455: v19 } });
  pruefe('Kartenbau: Printful-Variante eines anderen Modells → Abbruch (Gegenleser 1, Fund 1)', /gehören nicht zu diesem Modell/.test(werft(() => karteFuerEditor(kat(19), { shopVarianten: { 111: v206 } })) || ''));
  pruefe('Kartenbau: Tippfehler in der Printful-Variante → Abbruch', /gehören nicht zu diesem Modell/.test(werft(() => karteFuerEditor(kat(19), { shopVarianten: { 111: 999999991 } })) || ''));
  pruefe('Kartenbau: Schlüssel ohne Zahl → Abbruch', /keine Zahl/.test(werft(() => shopVariantenNormalisieren({ abc: 1 })) || ''));
  pruefe('Kartenbau: Printful-Variante 0, negativ, Bruch, Text → Abbruch', ['0', '-5', '1.5', 'x'].every((w) => werft(() => shopVariantenNormalisieren({ 1: w === 'x' ? 'x' : Number(w) })) !== null));
  gleich('Kartenbau: Objekt {pv} wird gelesen', shopVariantenNormalisieren({ 7: { pv: 12 } }), { 7: 12 });
  // Filter
  const k71 = karteFuerEditor(kat(71));
  const ohneAp = karteFuerEditor(kat(71), { ohneAufpreis: true });
  gleich('ohneAufpreis: nur Platzierungen ohne Aufpreis bleiben (T-Shirt: Vorderseite)', ohneAp.platzierungen.map((p) => p.id), ['front']);
  pruefe('ohneAufpreis: kein Aufpreis mehr in der Karte', ohneAp.platzierungen.every((p) => p.aufpreisChf === 0 && !p.aufpreisUsd));
  pruefe('ohneAufpreis: Konflikte nennen keine entfernten Platzierungen', ohneAp.platzierungen.every((p) => p.kollidiertMit.every((q) => ohneAp.platzierungen.some((x) => x.id === q))));
  const ohneEt = karteFuerEditor(kat(71), { ohneEtiketten: true });
  pruefe('ohneEtiketten: keine Etiketten, Vorderseite und Rückseite bleiben', !ohneEt.platzierungen.some((p) => p.art === 'etikett') && ohneEt.platzierungen.some((p) => p.id === 'back') && k71.platzierungen.some((p) => p.art === 'etikett'));
  pruefe('ohneAufpreis bei Dad-Cap (jede Stickerei kostet extra) → Abbruch statt leerer Karte', /bleibt keine Platzierung/.test(werft(() => karteFuerEditor(kat(206), { ohneAufpreis: true })) || ''));
  pruefe('Rundum-Druck (PANEL) → Abbruch ohne panelErlauben (Gegenleser 2, F8)', /PANEL/.test(werft(() => karteFuerEditor(kat(388))) || '') && karteFuerEditor(kat(388), OPT_TEST).klasse === 'PANEL');
  // Bündel
  const b = kartenbuendelFuerEditor([kat(19), kat(206)], { 111: v19, 222: v206 });
  gleich('Bündel: Modelle', Object.keys(b.modelle).sort(), ['19', '206']);
  gleich('Bündel: Zuordnung mit Modell', b.shop.varianten, { 111: { pv: v19, m: 19 }, 222: { pv: v206, m: 206 } });
  pruefe('Bündel: der Editor liest es', !!H.karteNormalisieren(b).karte && H.karteNormalisieren(b).karte.zuordnung['222'].m === '206');
  gleich('Bündel: nicht verkaufte Modelle fallen heraus', Object.keys(kartenbuendelFuerEditor([kat(19), kat(206)], { 111: v19 }).modelle), ['19']);
  pruefe('Bündel: Printful-Variante in keinem Katalog → Abbruch', /stehen in keinem/.test(werft(() => kartenbuendelFuerEditor([kat(19), kat(206)], { 111: 999999991 })) || ''));
  const k206doppelt = JSON.parse(JSON.stringify(kat(206))); k206doppelt.varianten[0].id = v19;   // eine Printful-Variante steht in zwei Katalogen
  pruefe('Bündel: Printful-Variante in zwei Katalogen → Abbruch', /steht in den Katalogen von/.test(werft(() => kartenbuendelFuerEditor([kat(19), k206doppelt], { 111: v19 })) || ''));
  pruefe('Bündel: dasselbe Modell zweimal → Abbruch', /doppelt/.test(werft(() => kartenbuendelFuerEditor([kat(19), kat(19)], { 111: v19 })) || ''));
  pruefe('Bündel: ohne Zuordnung → Abbruch', /keine Zuordnung/.test(werft(() => kartenbuendelFuerEditor([kat(19)], {})) || ''));
  pruefe('Bündel: Filter gelten für jedes Modell', Object.values(kartenbuendelFuerEditor([kat(71), kat(19)], { 1: kat(71).varianten[0].id, 2: v19 }, { ohneAufpreis: true }).modelle).every((m) => m.platzierungen.every((p) => p.aufpreisChf === 0)));
  // Länge von _pod_karte im ungünstigsten Fall
  pruefe('podKarteGroesstmoeglich: Tasse (eine Platzierung) bleibt weit unter 255', podKarteGroesstmoeglich(karteFuerEditor(kat(19))) < 160, String(podKarteGroesstmoeglich(karteFuerEditor(kat(19)))));
  pruefe('podKarteGroesstmoeglich: T-Shirt mit allen 8 Platzierungen', podKarteGroesstmoeglich(k71) <= POD_KARTE_MAX, String(podKarteGroesstmoeglich(k71)));
  pruefe('kartenWarnungen: Rundum-Druck wird genannt', kartenWarnungen(karteFuerEditor(kat(388), OPT_TEST)).some((w) => /Druckbogen/.test(w)));
  pruefe('kartenWarnungen: sonst nichts bei Tasse und T-Shirt', kartenWarnungen(karteFuerEditor(kat(19))).length === 0 && kartenWarnungen(k71).length === 0);
}
for (const id of [71, 19, 268, 206, 388, 586, 456]) {
  const k = lies(id);
  pruefe(`Test-Karte ${id}: keine internen Texte`, !/Erfahrungswert|messung_0511|1:1 an Printful/.test(JSON.stringify(k)));
  pruefe(`Test-Karte ${id}: Mindest-dpi vorhanden`, typeof k.minDpi === 'number' && k.minDpi > 0);
  pruefe(`Test-Karte ${id}: jede Platzierung hat Druckdatei und Vorlage mit Zahlen`, k.platzierungen.every((p) => H.platzierungOk(p)));
}
pruefe('Test-Karte T-Shirt: Rückseite kostet CHF 6.10, Vorderseite nichts', lies(71).platzierungen.find((p) => p.id === 'back').aufpreisChf === 6.1 && lies(71).platzierungen[0].aufpreisChf === 0);
pruefe('Test-Karte Dad-Cap: Stickerei und Kappe als Einschränkung', lies(206).hinweise.filter((h) => h.art === 'einschraenkung').map((h) => h.code).sort().join() === 'kappe,stickerei');
pruefe('Test-Karte T-Shirt: Hinweise der Art «info» nur mit bekanntem Code oder gar nicht', lies(71).hinweise.every((h) => h.art === 'einschraenkung' || BEKANNTE_HINWEIS_CODES.includes(h.code)));

// ── Warenkorb-Eigenschaften: Vertrag mit der Auftragsabwicklung ────────────────────────────────────
// Gelesen wird mit dem Parser der Auftragsabwicklung selbst (automation/lib/printful_bestellweg.mjs, nur importiert). Die Eigenschaften, die der Editor wirklich schreibt,
// prüft editor_test.mjs («vertrag-bestellweg») gegen denselben Parser.
{
  const pod = { v: 6, m: 71, pv: 4012, sv: '1001', pl: ['front', 'sleeve_left'], dt: { front: 'default' }, ap: 2.6 };
  const props = {
    '🎨 Design (front)': 'Text: "Hallo"', '🖼️ Druckdatei (front)': 'https://res.cloudinary.com/x/1.png', '🖼️ Druckdatei (sleeve_left)': 'https://res.cloudinary.com/x/2.png', _pod_karte: JSON.stringify(pod),
  };
  const r1 = dateienAusEigenschaften(props);
  gleich('Vertrag: Platzierung und Dateityp', r1.dateien.map((d) => [d.platzierung, d.dateiTyp]), [['front', 'default'], ['sleeve_left', 'sleeve_left']]);
  gleich('Vertrag: keine Probleme', r1.probleme, []);
  pruefe('Vertrag: der Parser kennt weder «s» noch «px» (beide dürfen fehlen)', r1.karte && r1.karte.v === 6 && !('s' in r1.karte) && !('px' in r1.karte));
  pruefe('Vertrag: mit «px» (Verkleinerung) bleibt es lesbar', dateienAusEigenschaften({ ...props, _pod_karte: JSON.stringify({ ...pod, px: ['900x1200', '600x525'] }) }).probleme.length === 0);
  pruefe('Vertrag: die längste _pod_karte des T-Shirts (alle Platzierungen, 14-stellige Shopify-Variante, 3-stelliges qd) hat höchstens 255 Zeichen, und der Parser der Bestellstrecke liest alle Positionen ohne Befund', (() => {
    const ids = K[71].platzierungen.map((p) => p.id);
    const text = JSON.stringify({ v: 6, m: 71, pv: 123456, sv: '55777948008833', pl: ids, dt: { front: 'default' }, ap: 99.95, qd: 999 });
    const eig = { _pod_karte: text };
    ids.forEach((id) => { eig['\u{1F5BC}\uFE0F Druckdatei (' + id + ')'] = 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/' + id + '.png'; });
    const g = dateienAusEigenschaften(eig);
    return ids.length >= 8 && text.length <= 255 && g.dateien.length === ids.length && g.probleme.length === 0;
  })());
}

// ── 6.2.0: Qualitätstor, Vorschau-Geometrie, Kontrast, Vorschaudaten, Entwurf (reine Funktionen) ───────
if (NEU) {
  const { qualitaetStufe, dpiGanz, einpassRechteck, vorlageLage, kontrastAnalyse, vorschauNormalisieren, tasseOk, ebeneFuerEntwurf, ebeneAusEntwurf } = H;
  // Qualitätstor: unter dem Mindestwert gesperrt, bis 150 Warnung, darüber nichts; ±0,01 um jede Grenze
  gleich('Stufe: 74,99 dpi bei Mindestwert 75 = Sperre', qualitaetStufe(74.99, 75, null), 'sperre');
  gleich('Stufe: genau 75 dpi = nicht mehr gesperrt (Warnung)', qualitaetStufe(75, 75, null), 'mittel');
  gleich('Stufe: 75,01 dpi = Warnung', qualitaetStufe(75.01, 75, null), 'mittel');
  gleich('Stufe: 149,99 dpi = Warnung', qualitaetStufe(149.99, 75, null), 'mittel');
  gleich('Stufe: genau 150 dpi = gut', qualitaetStufe(150, 75, null), 'gut');
  gleich('Stufe: 300 dpi = gut', qualitaetStufe(300, 75, null), 'gut');
  gleich('Stufe: 0 dpi = Sperre', qualitaetStufe(0, 75, null), 'sperre');
  gleich('Stufe: Dichte 0 oder fehlend wird ignoriert', [qualitaetStufe(100, 75, 0), qualitaetStufe(100, 75, undefined), qualitaetStufe(100, 75, -3)], ['mittel', 'mittel', 'mittel']);
  gleich('Stufe: keine Zahl = null', [qualitaetStufe(NaN, 75, null), qualitaetStufe(-1, 75, null), qualitaetStufe(undefined, 75, null)], [null, null, null]);
  gleich('Stufe: Mindestwert 150 und Druckdatei trägt nur 146,6 dpi: ab 146,6 gut (sonst wäre jedes Foto gesperrt)', [qualitaetStufe(146.6, 150, 146.6), qualitaetStufe(146.5, 150, 146.6), qualitaetStufe(146.0, 150, 146.6)], ['gut', 'sperre', 'sperre']);
  gleich('Stufe: Mindestwert 75 und Dichte 146,6: 146,5 = Warnung, 146,6 = gut', [qualitaetStufe(146.5, 75, 146.6), qualitaetStufe(146.6, 75, 146.6)], ['mittel', 'gut']);
  gleich('Stufe: Dichte niedriger als der Mindestwert (60 gegen 75): ab 60 nicht gesperrt', [qualitaetStufe(59.99, 75, 60), qualitaetStufe(60, 75, 60)], ['sperre', 'gut']);
  gleich('DPI_GUT ist 150', H.DPI_GUT, 150);
  // Anzeige: unter der Sperre abgerundet, sonst gerundet
  gleich('dpiGanz: 74,8 bei Sperre = 74 (nie «75» neben der Sperre)', dpiGanz(74.8, 'sperre'), 74);
  gleich('dpiGanz: 74,8 bei Warnung = 75', dpiGanz(74.8, 'mittel'), 75);
  gleich('dpiGanz: 74,0 bei Sperre = 74 (Gleitkomma-Rest)', dpiGanz(73.9999999999, 'sperre'), 74);
  gleich('dpiGanz: 149,5 = 150, 149,49 = 149', [dpiGanz(149.5, 'mittel'), dpiGanz(149.49, 'mittel')], [150, 149]);
  // Einpassen und Füllen in eine Fläche (Ursprung links oben)
  const gl = (name, r, soll) => pruefe(name, ['x', 'y', 'w', 'h'].every((k) => Math.abs(r[k] - soll[k]) < 1e-9), JSON.stringify(r));
  gl('einpassen: Breitformat in Quadrat', einpassRechteck(100, 100, 2, 'einpassen'), { x: 0, y: 25, w: 100, h: 50 });
  gl('einpassen: Hochformat in Quadrat', einpassRechteck(100, 100, 0.5, 'einpassen'), { x: 25, y: 0, w: 50, h: 100 });
  gl('füllen: Breitformat in Quadrat (seitlich beschnitten)', einpassRechteck(100, 100, 2, 'fuellen'), { x: -50, y: 0, w: 200, h: 100 });
  gl('füllen: Hochformat in Quadrat (oben und unten beschnitten)', einpassRechteck(100, 100, 0.5, 'fuellen'), { x: 0, y: -50, w: 100, h: 200 });
  gl('einpassen: gleiches Verhältnis füllt die Fläche', einpassRechteck(200, 100, 2, 'einpassen'), { x: 0, y: 0, w: 200, h: 100 });
  // Lage der Vorlage in der Zeichenfläche
  {
    const vl = { vorlageBreite: 3000, vorlageHoehe: 3000, flaecheLinks: 1006, flaecheOben: 530, flaecheBreite: 1010, flaecheHoehe: 1346 };
    const L = vorlageLage(vl, 800, 800);
    nahe('Vorlage 3000 px in 800 px: Massstab', L.s, 800 / 3000);
    nahe('Vorlage: Druckfläche links', L.ax, 1006 * 800 / 3000); nahe('Vorlage: Druckfläche oben', L.ay, 530 * 800 / 3000);
    nahe('Vorlage: Druckfläche Breite', L.aw, 1010 * 800 / 3000); nahe('Vorlage: Druckfläche Höhe', L.ah, 1346 * 800 / 3000);
    const Q = vorlageLage({ vorlageBreite: 1000, vorlageHoehe: 500, flaecheLinks: 100, flaecheOben: 50, flaecheBreite: 200, flaecheHoehe: 100 }, 800, 800);
    nahe('Vorlage im Breitformat: Massstab nach der Breite', Q.s, 0.8); nahe('Vorlage im Breitformat: oberer Rand zentriert', Q.oy, 200); nahe('Vorlage im Breitformat: Druckfläche oben mit Rand', Q.ay, 200 + 50 * 0.8);
  }
  // Kontrast Design gegen Stoff (RGBA-Pixel)
  {
    const flaeche = (r, g, b, a, n = 100) => { const d = new Uint8ClampedArray(n * 4); for (let i = 0; i < n; i++) d.set([r, g, b, a], i * 4); return d; };
    const sw = kontrastAnalyse(flaeche(10, 10, 10, 255), [11, 11, 11]);
    pruefe('Kontrast: Schwarz auf Schwarz = 100 % schlecht, Art «dunkel»', sw.anteil === 1 && sw.art === 'dunkel' && sw.flaeche === 100, JSON.stringify(sw));
    const ws = kontrastAnalyse(flaeche(250, 250, 250, 255), [255, 255, 255]);
    pruefe('Kontrast: Weiss auf Weiss = 100 % schlecht, Art «hell»', ws.anteil === 1 && ws.art === 'hell', JSON.stringify(ws));
    pruefe('Kontrast: Weiss auf Schwarz = gut', kontrastAnalyse(flaeche(255, 255, 255, 255), [10, 10, 10]).anteil === 0);
    pruefe('Kontrast: Schwarz auf Weiss = gut', kontrastAnalyse(flaeche(0, 0, 0, 255), [255, 255, 255]).anteil === 0);
    const leer = kontrastAnalyse(flaeche(0, 0, 0, 0), [0, 0, 0]);
    pruefe('Kontrast: durchsichtiges Design = nichts zu warnen', leer.anteil === 0 && leer.flaeche === 0);
    pruefe('Kontrast: Pixel unter Alpha 20 % zählen nicht', kontrastAnalyse(flaeche(0, 0, 0, 40), [0, 0, 0]).flaeche === 0);
    const halb = new Uint8ClampedArray(400); halb.set(flaeche(0, 0, 0, 255, 50), 0); halb.set(flaeche(255, 255, 255, 255, 50), 200);
    nahe('Kontrast: halb schwarz, halb weiss auf Schwarz = 50 % schlecht', kontrastAnalyse(halb, [0, 0, 0]).anteil, 0.5);
    nahe('Kontrast-Verhältnis Schwarz zu Weiss = 21', H.kontrastVerhaeltnis(H.leuchtdichte(0, 0, 0), H.leuchtdichte(255, 255, 255)), 21, 1e-9);
    nahe('Leuchtdichte Weiss = 1', H.leuchtdichte(255, 255, 255), 1, 1e-9);
  }
  // Tassen-Eichung und Vorschaudaten
  const T = { foto: 'https://cdn.shopify.com/s/files/x/luxe-vorschau-abc.png', quelle: 'https://files.cdn.printful.com/products/19/x.jpg', fotoBreite: 700, fotoHoehe: 1000, mitteX: 407, radius: 194, oben: 290, unten: 735, winkel: 330, ausschnitt: [0, 165, 700, 700] };
  pruefe('tasseOk: gültige Eichung', tasseOk(T));
  pruefe('tasseOk: nur die Printful-Adresse (noch nicht gespiegelt) genügt', tasseOk({ ...T, foto: null }));
  pruefe('tasseOk: ohne jede Adresse abgelehnt', !tasseOk({ ...T, foto: null, quelle: null }));
  pruefe('tasseOk: Adresse ohne https abgelehnt', !tasseOk({ ...T, foto: 'http://x/y.png', quelle: 'ftp://x' }));
  for (const [k, v] of [['radius', 0], ['radius', -5], ['unten', 290], ['unten', 100], ['fotoBreite', 0], ['fotoHoehe', 0], ['mitteX', 'a'], ['oben', NaN], ['winkel', 90], ['winkel', 361], ['winkel', 'x'], ['ausschnitt', [0, 0, 0, 10]], ['ausschnitt', [0, 0, 10]], ['ausschnitt', [0, 0, 10, 'x']]]) {
    pruefe(`tasseOk: ${k}=${JSON.stringify(v)} abgelehnt`, !tasseOk({ ...T, [k]: v }));
  }
  pruefe('tasseOk: Winkel 360 und ohne Winkel/Ausschnitt gültig', tasseOk({ ...T, winkel: 360 }) && tasseOk({ ...T, winkel: undefined, ausschnitt: undefined }));
  pruefe('tasseOk: kein Objekt', !tasseOk(null) && !tasseOk('x') && !tasseOk(undefined));
  const roh = { schema: 1, modelle: { 71: { adapter: 'flach', grund: null, bilder: { 'https://files.cdn.printful.com/m/a.png': 'https://cdn.shopify.com/a.png', 'https://files.cdn.printful.com/m/b.png': null }, tasse: {} },
    19: { adapter: 'tasse', bilder: {}, tasse: { 1320: T, 4830: { ...T, radius: -1 } } }, 388: { adapter: 'keine', grund: 'rundum' } } };
  {
    const r = vorschauNormalisieren(JSON.parse(JSON.stringify(roh)));
    pruefe('Vorschaudaten: gültig', r.daten && Object.keys(r.daten.modelle).sort().join() === '19,388,71', JSON.stringify(r).slice(0, 200));
    pruefe('Vorschaudaten: null (noch nicht gespiegelt) bleibt null', r.daten.modelle[71].bilder['https://files.cdn.printful.com/m/b.png'] === null);
    pruefe('Vorschaudaten: ungültige Tassen-Eichung fällt heraus, die gültige bleibt', Object.keys(r.daten.modelle[19].tasse).join() === '1320');
    pruefe('Vorschaudaten: «keine» mit Grund bleibt, Felder fehlen nicht', r.daten.modelle[388].grund === 'rundum' && typeof r.daten.modelle[388].bilder === 'object' && r.daten.modelle[388].tasse && Object.keys(r.daten.modelle[388].tasse).length === 0);
    pruefe('Vorschaudaten: «vorlagen» (Gegenprobe) wird nicht übernommen', !('vorlagen' in r.daten.modelle[71]) && !('titel' in r.daten.modelle[71]));
  }
  gleich('Vorschaudaten: Schema 2 abgelehnt', !!vorschauNormalisieren({ ...roh, schema: 2 }).fehler, true);
  gleich('Vorschaudaten: ohne Schema abgelehnt', !!vorschauNormalisieren({ modelle: roh.modelle }).fehler, true);
  gleich('Vorschaudaten: kein Objekt abgelehnt', [vorschauNormalisieren(null), vorschauNormalisieren('x'), vorschauNormalisieren(5)].every((r) => !!r.fehler), true);
  gleich('Vorschaudaten: «modelle» als Liste abgelehnt', !!vorschauNormalisieren({ schema: 1, modelle: [] }).fehler, true);
  gleich('Vorschaudaten: nur unbekannte Adapter = Fehler', !!vorschauNormalisieren({ schema: 1, modelle: { 1: { adapter: 'gross' }, 2: null, 3: 'x' } }).fehler, true);
  {
    const r = vorschauNormalisieren({ schema: 1, modelle: { 1: { adapter: 'gross' }, 71: roh.modelle[71] } });
    pruefe('Vorschaudaten: ein unbekannter Adapter lässt die übrigen Modelle gelten', r.daten && Object.keys(r.daten.modelle).join() === '71');
    const f = vorschauNormalisieren({ schema: 1, modelle: { 71: { adapter: 'flach', bilder: { 'http://x/a.png': 'https://cdn.shopify.com/a.png', 'https://x/a.png': 'http://cdn/a.png', 'https://x/c.png': 5, 'https://x/ok.png': 'https://cdn.shopify.com/ok.png' } } } });
    pruefe('Vorschaudaten: Bilder ohne https (Quelle oder Spiegel) oder mit Fremdtyp fallen heraus', Object.keys(f.daten.modelle[71].bilder).join() === 'https://x/ok.png', JSON.stringify(f.daten.modelle[71].bilder));
  }
  // Entwurf: eine Ebene hin und zurück
  const text = { id: 'L3', type: 'text', cx: 0.4, cy: 0.6, scale: 1.2, rot: 15, op: 0.8, text: 'Hallo', font: 'Pacifico', color: '#112233', bold: true, italic: false, align: 'center', ls: 2, outl: 3, outc: '#fff', lh: 1.1, _cache: {}, edit: {} };
  {
    const n = ebeneFuerEntwurf(text);
    pruefe('Entwurf: Textebene ohne interne Felder (kein _cache, kein edit)', !('_cache' in n) && !('edit' in n) && n.text === 'Hallo' && n.op === 0.8, JSON.stringify(n));
    const zurueck = ebeneAusEntwurf(JSON.parse(JSON.stringify(n)));
    pruefe('Entwurf: Textebene kommt gleich zurück', zurueck && zurueck.text === 'Hallo' && zurueck.font === 'Pacifico' && zurueck.color === '#112233' && zurueck.bold === true && zurueck.italic === false && zurueck.align === 'center' && zurueck.ls === 2 && zurueck.outl === 3 && zurueck.outc === '#fff' && zurueck.lh === 1.1 && zurueck.cx === 0.4 && zurueck.rot === 15 && zurueck.op === 0.8);
  }
  {
    const s = ebeneFuerEntwurf({ id: 'L4', type: 'sticker', cx: 0.5, cy: 0.5, scale: 1, rot: 0, name: 'herz-rot', src: 'x' });
    const z = ebeneAusEntwurf(JSON.parse(JSON.stringify(s)));
    pruefe('Entwurf: Sticker kommt mit Adresse zurück', z && z.name === 'herz-rot' && /^https:\/\/cdn\.shopify\.com\/.*stk-herz-rot\.png$/.test(z.src) && z.printUrl === z.src && z.uploading === false, JSON.stringify(z));
    pruefe('Entwurf: Sticker mit Schrägstrich im Namen abgelehnt', ebeneAusEntwurf({ ...s, name: '../x' }) === null && ebeneAusEntwurf({ ...s, name: 'A B' }) === null);
  }
  {
    const bild = { id: 'L5', type: 'image', cx: 0.5, cy: 0.5, scale: 0.7, rot: 0, printUrl: 'https://res.cloudinary.com/x/image/upload/v1/p.png', _origW: 2000, _origH: 1500, edit: { cx0: 0, cy0: 0, cw: 0.5, ch: 0.5, rotQ: 0, flipH: false, flipV: false, bri: 100, con: 100, sat: 100, gray: 0, bg: 0, frame: 0, sharp: 0 } };
    const n = ebeneFuerEntwurf(bild);
    pruefe('Entwurf: Foto speichert die Adresse der fertigen Druckdatei und die Ausschnittgrösse (1000 × 750)', n && n.printUrl === bild.printUrl && n.aw === 1000 && n.ah === 750, JSON.stringify(n));
    const z = ebeneAusEntwurf(JSON.parse(JSON.stringify(n)));
    pruefe('Entwurf: Foto kommt mit zurückgesetzter Bearbeitung und Ausschnittgrösse als Original zurück', z && z._origW === 1000 && z._origH === 750 && z.edit.cw === 1 && z.edit.ch === 1 && z.src === bild.printUrl && z.uploading === false, JSON.stringify(z));
    pruefe('Entwurf: Foto ohne Datei (lädt noch) wird nicht gespeichert', ebeneFuerEntwurf({ ...bild, uploading: true }) === null && ebeneFuerEntwurf({ ...bild, printUrl: '' }) === null && ebeneFuerEntwurf({ ...bild, printUrl: 'blob:abc' }) === null && ebeneFuerEntwurf({ ...bild, printUrl: 'http://x/y.png' }) === null);
    pruefe('Entwurf: Foto mit gedrehtem Ausschnitt tauscht Breite und Höhe', (() => { const g = ebeneFuerEntwurf({ ...bild, edit: { ...bild.edit, cw: 1, ch: 1, rotQ: 1 } }); return g.aw === 1500 && g.ah === 2000; })());
    pruefe('Entwurf: unbekannter Typ wird nicht gespeichert', ebeneFuerEntwurf({ id: 'L6', type: 'kreis', cx: 0, cy: 0, scale: 1, rot: 0 }) === null);
    for (const [k, v] of [['printUrl', 'http://x/y.png'], ['printUrl', 'javascript:alert(1)'], ['printUrl', 5], ['aw', 0], ['aw', -4]]) pruefe(`Entwurf: Foto mit ${k}=${JSON.stringify(v)} abgelehnt`, ebeneAusEntwurf({ ...n, [k]: v }) === null);
  }
  {
    const n = ebeneFuerEntwurf(text);
    for (const [name, aend] of [['ohne Nummer', { id: 'x' }], ['Nummer mit Buchstaben', { id: 'L1a' }], ['ohne cx', { cx: 'a' }], ['cy NaN', { cy: NaN }], ['scale unendlich', { scale: Infinity }], ['rot Text', { rot: '9' }], ['Text keine Zeichenkette', { text: 5 }], ['ohne Schrift', { font: undefined }], ['ohne Farbe', { color: null }], ['unbekannter Typ', { type: 'bild' }]]) {
      pruefe(`Entwurf: Ebene ${name} abgelehnt`, ebeneAusEntwurf({ ...n, ...aend }) === null);
    }
    pruefe('Entwurf: kein Objekt abgelehnt', ebeneAusEntwurf(null) === null && ebeneAusEntwurf('x') === null && ebeneAusEntwurf(undefined) === null);
    const g = ebeneAusEntwurf({ ...n, cx: 7, cy: -3, scale: 99, op: 4 });
    pruefe('Entwurf: Lage, Grösse und Deckkraft werden begrenzt', g.cx === 1 && g.cy === 0 && g.scale === 3 && g.op === 1, JSON.stringify(g));
    pruefe('Entwurf: Text wird auf 200 Zeichen gekürzt', ebeneAusEntwurf({ ...n, text: 'x'.repeat(500) }).text.length === 200);
    pruefe('Entwurf: ausgerichtet nur links, rechts, mitte', ebeneAusEntwurf({ ...n, align: 'justify' }).align === undefined);
  }
  pruefe('VORSCHAU_PX = 800, VORSCHAU_MAX_BYTES = 80 KB', H.VORSCHAU_PX === 800 && H.VORSCHAU_MAX_BYTES === 80 * 1024);

  // ── Vorschaudaten-Bauer (werkzeug/vorschau_daten_bauen.mjs) auf den Test-Katalogen im Repo ──────────
  {
    const KAT = join(repo, 'dropship', 'selbst-gestalten-fertig-0511', 'werkzeuge', 'testdaten', 'katalog');
    const STAND = '2026-11-06';
    const r = VB.bauen({ katalogOrdner: KAT, stand: STAND });
    const adp = Object.fromEntries(r.ergebnisse.map((e) => [e.pid, e.eintrag.adapter + (e.eintrag.grund ? ':' + e.eintrag.grund : '')]));
    gleich('Bauer: Adapter je Testmodell', adp, { 19: 'tasse', 71: 'flach', 206: 'flach', 268: 'papier', 388: 'keine:rundum', 574: 'keine:ungeeignet', 764: 'keine:layout', 769: 'keine:layout', 798: 'flach', 861: 'flach' });
    gleich('Bauer: keine Fehler', r.bericht.fehler, []);
    pruefe('Bauer: Schema 1 und Stand in jeder Datei', Object.values(r.dateien).every((d) => d.schema === 1 && d.stand === STAND));
    pruefe('Bauer: jede Datei hat ihre Modellnummer als Schlüssel', Object.entries(r.dateien).every(([name, d]) => Object.keys(d.modelle).join() === name.split('.')[0]));
    const alleBilder = r.ergebnisse.flatMap((e) => Object.keys(e.eintrag.bilder));
    pruefe('Bauer: «bilder» enthält nur Fotos von files.cdn.printful.com/m/ (kein Raster, nichts Fremdes)', alleBilder.length > 0 && alleBilder.every((u) => VB.bildArt(u) === 'foto' && new URL(u).hostname === 'files.cdn.printful.com' && /^\/m\//.test(new URL(u).pathname)));
    pruefe('Bauer: ohne --spiegel steht überall null', r.ergebnisse.every((e) => Object.values(e.eintrag.bilder).every((v) => v === null) && Object.values(e.eintrag.tasse).every((t) => t.foto === null)));
    pruefe('Bauer: Tasse hat drei geeichte Varianten mit den Zahlen aus TASSEN_EICHUNG', (() => { const t = r.ergebnisse.find((e) => e.pid === '19').eintrag.tasse; return Object.keys(t).sort().join() === '1320,16586,4830' && Object.entries(t).every(([id, v]) => v.radius === VB.TASSEN_EICHUNG[id].radius && v.oben === VB.TASSEN_EICHUNG[id].oben && v.winkel === 330 && /^https:\/\//.test(v.quelle)); })());
    // Gegenprobe der Geometrie gegen die eingecheckten Karten (anderer Weg: karte_fuer_editor)
    for (const id of [71, 206, 268, 19]) {
      const karte = lies(id);
      const vor = r.ergebnisse.find((e) => e.pid === String(id)).eintrag.vorlagen;
      pruefe(`Bauer: Vorlagen-Zahlen von Modell ${id} gleich den Zahlen der Karte`, karte.platzierungen.every((p) => p.vorlage && vor[p.id] && vor[p.id].tw === p.vorlage.vorlageBreite && vor[p.id].th === p.vorlage.vorlageHoehe && vor[p.id].fl === p.vorlage.flaecheLinks && vor[p.id].fo === p.vorlage.flaecheOben && vor[p.id].fb === p.vorlage.flaecheBreite && vor[p.id].fh === p.vorlage.flaecheHoehe && vor[p.id].printfile.b === p.printfile.breitePx && vor[p.id].printfile.h === p.printfile.hoehePx && vor[p.id].printfile.dpi === p.printfile.dpi && vor[p.id].vorne === (p.vorlage.vorderansicht !== false)), String(id));
    }
    // Dateiplan
    const plan = r.plan;
    pruefe('Plan: eine Zeile je Quelladresse, Dateinamen eindeutig', new Set(plan.dateien.map((d) => d.quelle)).size === plan.dateien.length && new Set(plan.dateien.map((d) => d.dateiname)).size === plan.dateien.length && plan.anzahl === plan.dateien.length && plan.anzahl === 15, `${plan.anzahl}`);
    pruefe('Plan: Modelle ohne Vorschau (Rundum, ungeeignet, Raster) bringen keine Bilder in den Plan, Tassenfotos und Fotos der Vorschau-Modelle schon', r.ergebnisse.filter((e) => e.eintrag.adapter === 'keine').every((e) => Object.keys(e.eintrag.bilder).length === 0 && e.dateien.length === 0) && r.ergebnisse.find((e) => e.pid === '19').dateien.length === 3 && r.ergebnisse.find((e) => e.pid === '71').dateien.length === 8);
    pruefe('Plan: Dateinamen luxe-vorschau-<10 Hex>.png/jpg/webp, Art bekannt, Modelle sortiert', plan.dateien.every((d) => /^luxe-vorschau-[0-9a-f]{10}\.(png|jpg|webp)$/.test(d.dateiname) && ['vorlage', 'hintergrund', 'tassenfoto'].includes(d.art) && d.modelle.every((m, i, a) => i === 0 || a[i - 1] < m)));
    pruefe('Plan: Dateiname hängt an der ganzen Adresse (mit ?v=), nicht am Pfad', VB.dateiname('https://files.cdn.printful.com/m/a/b.png?v=1') !== VB.dateiname('https://files.cdn.printful.com/m/a/b.png?v=2') && VB.dateiname('https://files.cdn.printful.com/m/a/b.png?v=1') === VB.dateiname('https://files.cdn.printful.com/m/a/b.png?v=1'));
    gleich('Plan: Endungen .jpeg wird zu .jpg, ohne Endung .png', [VB.dateiname('https://files.cdn.printful.com/m/x.JPEG?v=1').split('.').pop(), VB.dateiname('https://files.cdn.printful.com/m/x?v=1').split('.').pop()], ['jpg', 'png']);
    pruefe('Plan: nach Dateiname sortiert', plan.dateien.every((d, i, a) => i === 0 || a[i - 1].dateiname.localeCompare(d.dateiname) < 0));
    {
      const t1320 = r.ergebnisse.find((e) => e.pid === '19').eintrag.tasse[1320];
      gleich('Tasse 11 oz: festgeschriebene Eichung (Körper, Druckband, Ausschnitt)', [t1320.fotoBreite, t1320.fotoHoehe, t1320.mitteX, t1320.radius, t1320.oben, t1320.unten, t1320.winkel, t1320.ausschnitt], [700, 1000, 407, 194, 290, 735, 330, [0, 165, 700, 700]]);
      const v71 = r.ergebnisse.find((e) => e.pid === '71').eintrag.vorlagen;
      pruefe('Gegenprobe: eine Vorlage hinter dem Druck (Etikett aussen) trägt vorne=false, die übrigen true', v71.label_outside.vorne === false && v71.front.vorne === true, JSON.stringify([v71.label_outside.vorne, v71.front.vorne]));
      const k19 = JSON.parse(readFileSync(join(KAT, '19.json'), 'utf8'));
      const fremd = JSON.parse(JSON.stringify(k19)); fremd.varianten[0].id = 99999;
      const ohneFoto = JSON.parse(JSON.stringify(k19)); ohneFoto.varianten[0].image = null;
      for (const [name, kk] of [['Tasse mit einer nicht geeichten Variante', fremd], ['Tasse ohne Katalogfoto einer Variante', ohneFoto]]) {
        const e = VB.vorschauModell(kk).eintrag;
        pruefe(`Bauer: ${name} = keine Vorschau (ungeeignet), keine halbe Eichung`, e.adapter === 'keine' && e.grund === 'ungeeignet' && Object.keys(e.tasse).length === 0, JSON.stringify([e.adapter, e.grund]));
      }
    }
    // ── Platzierungen mit festem Farbfoto (farbfest) ──
    {
      const farbCodes = (kk, c) => { const x = JSON.parse(JSON.stringify(kk)); x.varianten.forEach((v) => { v.color_code = c; }); return x; };
      const k71 = JSON.parse(readFileSync(join(KAT, '71.json'), 'utf8'));
      const strippen = (kk, ids) => { const x = JSON.parse(JSON.stringify(kk)); for (const g of x.templates.gruppen) if (!ids || ids.includes(g.placement)) { g.beispiel.template.background_url = null; g.beispiel.template.background_color = null; } return x; };
      nahe('farbenImModell: T-Shirt 71 hat viele Farbcodes', VB.farbenImModell(k71) > 20 ? 1 : 0, 1);
      gleich('farbenImModell: Duftkerze 861 (im Feld color steht der Duft, kein Farbcode) = 0', VB.farbenImModell(JSON.parse(readFileSync(join(KAT, '861.json'), 'utf8'))), 0);
      gleich('farbenImModell: Gross- und Kleinschreibung und Leerzeichen zählen nicht', VB.farbenImModell({ varianten: [{ color_code: '#ABCDEF' }, { color_code: ' #abcdef ' }, { color_code: '#000000' }, { color_code: null }, {}] }), 2);
      const e0 = VB.vorschauModell(k71).eintrag;
      gleich('Modell mit Hintergrundfarbe oder -bild je Vorlage: keine farbfeste Platzierung, Vorschau «flach»', [e0.adapter, e0.farbfest], ['flach', []]);
      const alle = VB.vorschauModell(strippen(k71));
      pruefe('alle Vorlagen ohne Farbquelle, mehrere Farben: Adapter «keine», Grund «farbfest», keine Bilder im Plan', alle.eintrag.adapter === 'keine' && alle.eintrag.grund === 'farbfest' && alle.eintrag.farbfest.length >= 4 && Object.keys(alle.eintrag.bilder).length === 0 && alle.dateien.length === 0, JSON.stringify([alle.eintrag.adapter, alle.eintrag.grund, alle.eintrag.farbfest, alle.dateien.length]));
      const teil = VB.vorschauModell(strippen(k71, ['front']));
      gleich('nur die Vorderseite ohne Farbquelle: Adapter bleibt «flach», nur «front» ist farbfest', [teil.eintrag.adapter, teil.eintrag.farbfest], ['flach', ['front']]);
      const vorn = VB.vorschauModell(strippen(k71, ['front', 'front_large']));
      pruefe('farbfeste Vorderseiten: ihr Vorlagenbild steht weder in «bilder» noch im Plan, das der Rückseite schon', !Object.keys(vorn.eintrag.bilder).some((u) => /ghost\/front\/05_bc3001_ghost_front_base_whitebg/.test(u)) && !vorn.dateien.some((d) => /ghost\/front\//.test(d.quelle)) && Object.keys(vorn.eintrag.bilder).some((u) => /ghost\/back\//.test(u)), JSON.stringify(Object.keys(vorn.eintrag.bilder).map((u) => u.slice(-60))));
      pruefe('ein von einer anderen, nicht farbfesten Platzierung mitbenutztes Bild bleibt im Plan', Object.keys(teil.eintrag.bilder).some((u) => /ghost\/front\/05_bc3001_ghost_front_base_whitebg/.test(u)), 'front_large nutzt dasselbe Geisterbild');
      const einf = VB.vorschauModell(farbCodes(strippen(k71), '#000000')).eintrag;
      gleich('nur EINE Stofffarbe im Modell: kein farbfest (die Vorlage zeigt diese Farbe), Vorschau «flach»', [einf.adapter, einf.farbfest], ['flach', []]);
      const cap = JSON.parse(readFileSync(join(KAT, '206.json'), 'utf8'));
      const stick = VB.vorschauModell(strippen(cap)).eintrag;
      pruefe('Stickerei-Platzierungen zählen nicht als farbfest, auch ohne Hintergrundfarbe und bei 11 Farben (sie zeigen ohnehin einen Hinweis)', VB.farbenImModell(cap) > 1 && stick.farbfest.length === 0 && stick.adapter === 'flach', JSON.stringify([VB.farbenImModell(cap), stick.farbfest, stick.adapter]));
      // echte Katalogdatei: Unisex Oversized Boxy Tee (Modell 1592): 9 Farbvorlagen, der verdichtete Katalog behält nur das Beispiel
      const k1592 = JSON.parse(readFileSync(join(hier, 'testdaten', 'katalog', '1592.json'), 'utf8'));
      const e92 = VB.vorschauModell(k1592);
      gleich('Modell 1592 (echter Katalog): Vorderseite und Rückseite farbfest, Etikett innen mit Hintergrundfarbe nicht; Adapter «flach»', [e92.eintrag.adapter, e92.eintrag.farbfest], ['flach', ['back', 'front']]);
      pruefe('Modell 1592: Gegenprobe der Zahlen: 9 verschiedene Vorlagen je Platzierung bei 63 Zuordnungen, ohne Hintergrund und ohne Farbe', k1592.templates.gruppen.filter((g) => ['front', 'back'].includes(g.placement)).every((g) => g.anzahl_verschiedene_vorlagen === 9 && g.anzahl_zuordnungen === 63 && !g.beispiel.template.background_url && !g.beispiel.template.background_color) && VB.farbenImModell(k1592) === 9);
      pruefe('Modell 1592: nur die Bilder des Etiketts im Plan (kein Farbfoto der Vorder- oder Rückseite)', e92.dateien.length > 0 && e92.dateien.every((d) => !/Front_black|Back_Black/.test(d.quelle)), JSON.stringify(e92.dateien.map((d) => d.quelle.slice(-50))));
      // Editor liest die Liste
      const nd = vorschauNormalisieren(JSON.parse(JSON.stringify({ schema: 1, modelle: { 1592: e92.eintrag, 5: { adapter: 'flach', farbfest: 'front' }, 6: { adapter: 'flach', farbfest: ['front', 5, '', null, 'back'] }, 7: { adapter: 'flach' } } }))).daten;
      gleich('Editor: farbfest wird als Liste von Zeichenketten gelesen, alles andere ergibt eine leere Liste', [nd.modelle[1592].farbfest, nd.modelle[5].farbfest, nd.modelle[6].farbfest, nd.modelle[7].farbfest], [['back', 'front'], [], ['front', 'back'], []]);
    }
    const r2 = VB.bauen({ katalogOrdner: KAT, stand: STAND });
    pruefe('Bauer: zweimal gebaut = Byte für Byte gleich (stabil)', JSON.stringify([r.dateien, r.plan, r.bericht]) === JSON.stringify([r2.dateien, r2.plan, r2.bericht]));
    // Zusammenspiel mit dem Editor: was der Bauer schreibt, nimmt der Editor an
    for (const [name, d] of Object.entries(r.dateien)) {
      const n = vorschauNormalisieren(JSON.parse(JSON.stringify(d)));
      pruefe(`Editor liest ${name} ohne Verlust`, n.daten && Object.keys(n.daten.modelle).join() === Object.keys(d.modelle).join() && Object.entries(d.modelle).every(([pid, m]) => Object.keys(n.daten.modelle[pid].bilder).length === Object.keys(m.bilder).length && Object.keys(n.daten.modelle[pid].tasse).length === Object.keys(m.tasse).length), name);
    }
    // eingebackene Spiegel-Adressen
    const erste = plan.dateien.find((d) => d.art === 'vorlage');
    const foto = plan.dateien.find((d) => d.art === 'tassenfoto');
    const ziel = 'https://cdn.shopify.com/s/files/1/0001/files/' + erste.dateiname;
    const rs = VB.bauen({ katalogOrdner: KAT, stand: STAND, spiegel: { [erste.dateiname]: ziel, [foto.dateiname]: 'https://cdn.shopify.com/s/files/1/0001/files/' + foto.dateiname, [plan.dateien[0].dateiname === erste.dateiname ? plan.dateien[1].dateiname : plan.dateien[0].dateiname]: 'http://unsicher.example/x.png' } });
    const gesetzt = rs.ergebnisse.flatMap((e) => Object.entries(e.eintrag.bilder).filter(([, v]) => v));
    pruefe('Spiegel: bekannte Datei wird eingebacken, alle anderen bleiben null, http-Adresse wird nie übernommen', gesetzt.length >= 1 && gesetzt.every(([q, v]) => VB.dateiname(q) === erste.dateiname && v === ziel) && rs.ergebnisse.every((e) => Object.values(e.eintrag.bilder).every((v) => v === null || /^https:\/\/cdn\.shopify\.com\//.test(v))), JSON.stringify(gesetzt));
    pruefe('Spiegel: Tassenfoto gespiegelt, die übrigen zwei Varianten nicht', (() => { const t = Object.values(rs.ergebnisse.find((e) => e.pid === '19').eintrag.tasse); return t.filter((x) => x.foto).length === 1 && t.every((x) => /^https:\/\/files\.cdn\.printful\.com\//.test(x.quelle)); })());
    pruefe('Spiegel ändert den Plan nicht (der Plan bleibt die Liste der Quellen)', JSON.stringify(rs.plan) === JSON.stringify(r.plan));
    // Bündel
    const rb = VB.bauen({ katalogOrdner: KAT, stand: STAND, modelle: [71, 19], buendel: { demo: [71, 19] } });
    pruefe('Bündel: eine Datei mit beiden Modellen, nach Nummer sortiert', rb.dateien['buendel-demo.vorschau.json'] && Object.keys(rb.dateien['buendel-demo.vorschau.json'].modelle).join() === '19,71', Object.keys(rb.dateien).join());
    pruefe('Bündel mit nicht gebautem Modell = Fehler, keine halbe Datei', (() => { const x = VB.bauen({ katalogOrdner: KAT, stand: STAND, modelle: [71], buendel: { demo: [71, 19] } }); return x.bericht.fehler.some((f) => /Bündel demo/.test(f)) && !('buendel-demo.vorschau.json' in x.dateien); })());
    pruefe('Bauer: mehrere Katalogordner: die Datei kommt aus dem ersten Ordner, der sie hat; «alle» vereint die Ordner', (() => { const z = VB.bauen({ katalogOrdner: [KAT, join(hier, 'testdaten', 'katalog')], stand: STAND, modelle: [71, 1592] }); const a = VB.bauen({ katalogOrdner: [KAT, join(hier, 'testdaten', 'katalog')], stand: STAND }); return z.bericht.fehler.length === 0 && z.ergebnisse.length === 2 && a.ergebnisse.length === 11 && a.ergebnisse.some((e) => e.pid === '1592'); })());
    {
      // Reihenfolge der Ordner: die erste Datei gewinnt
      const tmp2 = mkdtempSync(join(tmpdir(), 'v6-bauer2-'));
      try {
        const k = JSON.parse(readFileSync(join(KAT, '71.json'), 'utf8'));
        for (const g of k.templates.gruppen) { g.beispiel.template.background_url = null; g.beispiel.template.background_color = null; }
        writeFileSync(join(tmp2, '71.json'), JSON.stringify(k));
        const ab = VB.bauen({ katalogOrdner: [KAT, tmp2], stand: STAND, modelle: [71] }).ergebnisse[0].eintrag.adapter;
        const ba = VB.bauen({ katalogOrdner: [tmp2, KAT], stand: STAND, modelle: [71] }).ergebnisse[0].eintrag.adapter;
        const einzeln = VB.bauen({ katalogOrdner: tmp2, stand: STAND, modelle: [71] }).ergebnisse[0].eintrag.adapter;
        gleich('mehrere Katalogordner: der erste Ordner mit der Datei gewinnt (KAT zuerst: flach, Kopie zuerst: keine), ein einzelner Ordner als Zeichenkette geht weiter', [ab, ba, einzeln], ['flach', 'keine', 'keine']);
      } finally { rmSync(tmp2, { recursive: true, force: true }); }
    }
    pruefe('Fehlende Katalogdatei = Fehler im Bericht, die übrigen Modelle werden gebaut', (() => { const x = VB.bauen({ katalogOrdner: KAT, stand: STAND, modelle: [71, 999999] }); return x.bericht.fehler.length === 1 && /999999.*fehlt/.test(x.bericht.fehler[0]) && x.ergebnisse.length === 1; })());
    gleich('bildArt: Foto, Raster, fremder Host, kein https, keine Zeichenkette', [VB.bildArt('https://files.cdn.printful.com/m/57-x/medium/ghost/front/a.png?v=1'), VB.bildArt('https://files.cdn.printful.com/generator/api-template/x.png'), VB.bildArt('https://example.com/m/a.png'), VB.bildArt('http://files.cdn.printful.com/m/a.png'), VB.bildArt(null)], ['foto', 'layout', null, null, null]);
    // Kommandozeile: kein Netz, nur --out, kein Live-Schalter
    const quelle = readFileSync(VB_PFAD, 'utf8');
    pruefe('Bauer: keine Netz- und Prozessaufrufe im Quelltext', !/\bfetch\s*\(|node:https?|node:net|node:child_process|XMLHttpRequest|\bhttps?\.(get|request)\b|\bspawn|\bexec\w*\(/.test(quelle));
    const tmp = mkdtempSync(join(tmpdir(), 'v6-bauer-'));
    try {
      const lauf = (...args) => spawnSync(process.execPath, [VB_PFAD, ...args], { cwd: tmp, encoding: 'utf8', env: { ...process.env, HTTPS_PROXY: 'http://127.0.0.1:9', HTTP_PROXY: 'http://127.0.0.1:9' } });
      const a = lauf('--katalog', KAT, '--stand', STAND);
      pruefe('CLI: ohne --out Exit 0 und nichts geschrieben', a.status === 0 && /nichts geschrieben/.test(a.stdout) && readdirSync(tmp).length === 0, `${a.status} ${a.stderr}`);
      for (const opt of [['--live'], ['--upload'], ['--hochladen'], ['--shopify'], ['--force']]) {
        const x = lauf('--katalog', KAT, ...opt);
        pruefe(`CLI: ${opt[0]} ist unbekannt (Exit 2, nichts geschrieben)`, x.status === 2 && /unbekannte Option/.test(x.stderr) && readdirSync(tmp).length === 0, `${x.status} ${x.stderr.slice(0, 80)}`);
      }
      pruefe('CLI: ohne --katalog Exit 2', lauf().status === 2);
      pruefe('CLI: Option ohne Wert Exit 2', lauf('--katalog').status === 2);
      pruefe('CLI: --buendel mit ungültigem Namen Exit 2', lauf('--katalog', KAT, '--buendel', 'Gross Name=71').status === 2);
      const out = join(tmp, 'aus');
      const b = lauf('--katalog', KAT, '--stand', STAND, '--out', out, '--buendel', 'demo=71,19');
      const dateien = existsSync(out) ? readdirSync(out).sort() : [];
      pruefe('CLI: --out schreibt genau die Vorschaudateien, den Plan und den Bericht, sonst nirgends', b.status === 0 && readdirSync(tmp).join() === 'aus' && dateien.length === 10 + 1 + 2 && dateien.includes('spiegel_plan.json') && dateien.includes('bericht.json') && dateien.includes('buendel-demo.vorschau.json') && dateien.includes('71.vorschau.json'), `${b.status} ${dateien.join()} ${b.stderr}`);
      pruefe('CLI: geschriebene Dateien sind gültiges JSON und gleich dem Rechenergebnis', JSON.parse(readFileSync(join(out, '71.vorschau.json'), 'utf8')).modelle[71].adapter === 'flach' && JSON.parse(readFileSync(join(out, 'spiegel_plan.json'), 'utf8')).anzahl === 15 && JSON.parse(readFileSync(join(out, 'bericht.json'), 'utf8')).modelle === 10);
      // --spiegel backt ein
      const sp = join(tmp, 'hochgeladen.json'); writeFileSync(sp, JSON.stringify({ [foto.dateiname]: 'https://cdn.shopify.com/s/files/1/0001/files/' + foto.dateiname }));
      const out2 = join(tmp, 'aus2');
      const c = lauf('--katalog', KAT, '--stand', STAND, '--modelle', '19', '--out', out2, '--spiegel', sp);
      const t19 = c.status === 0 ? Object.values(JSON.parse(readFileSync(join(out2, '19.vorschau.json'), 'utf8')).modelle[19].tasse) : [];
      pruefe('CLI: --spiegel backt die Adresse ins Tassenfoto ein, ohne sie bleibt null', t19.filter((x) => x.foto).length === 1 && JSON.parse(readFileSync(join(out, '19.vorschau.json'), 'utf8')).modelle[19].tasse[1320].foto === null, `${c.status} ${c.stderr}`);
      pruefe('CLI: --modelle 19 baut nur dieses Modell', c.status === 0 && readdirSync(out2).filter((f) => /\.vorschau\.json$/.test(f)).join() === '19.vorschau.json');
      const d = lauf('--katalog', KAT, '--modelle', '71,999999');
      pruefe('CLI: fehlendes Modell = Exit 1 und Meldung', d.status === 1 && /999999/.test(d.stdout), `${d.status}`);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }
}

// ── Mutationsprobe: Umgebungsfehler zählen nie als «erkannt» (Fund Gegenleser 1, Container-Absturz mitten im Lauf: 27 Zeilen «browser has been closed» wären als erkannte Mutanten gezählt worden) ──
{
  for (const [text, soll] of [
    ["  ✗ qd-entfaellt-bei-255: Ausnahme browser.newContext: Target page, context or browser has been closed", true],
    ["browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium-1234/chrome-linux/headless_shell", true],
    ["Error: ENOSPC: no space left on device, write", true],
    ["Error: listen EADDRINUSE: address already in use 127.0.0.1:4455", true],
    ["Error: spawn /opt/node22/bin/node ENOENT", true],
    ["  ✗ fristen: Ausnahme locator.waitFor: Timeout 8000ms exceeded.", false],
    ["  ✗ Sichtfenster: 10 % Rand um die längere Seite ist=736.8 soll=871.4", false],
    ["  ✗ keine Seitenfehler pageerror: TypeError: Cannot read properties of undefined (reading 'st')", false],
    ["", false],
  ]) pruefe('Mutationsprobe: Umgebungsfehler erkannt = ' + soll + ' für «' + text.slice(0, 60) + '»', istUmgebungsfehler(text) === soll);
}

// ── v5 ist unverändert ─────────────────────────────────────────────────────────────────────────────
const v5 = readFileSync(V5_DATEI);
pruefe('v5 (pod/live) ist unverändert: 51 378 Byte', v5.length === 51378, String(v5.length));
pruefe('v5 (pod/live) ist unverändert: SHA-256 beginnt mit 70140421381326aff999', createHash('sha256').update(v5).digest('hex').startsWith('70140421381326aff999'));
pruefe('v6 greift nicht auf die v5-Kennungen zu (Klasse, Guard, Eingabefeld)', (() => { const s = readFileSync(V6_DATEI, 'utf8'); return !/['"]\.lspod-designer['"]/.test(s) && !/__lspodDesignerLoaded\s*=/.test(s) && !/data-lspod="1"/.test(s); })());

// 6.3.0 bleibt wegen der bereits veröffentlichten SRI-Tags bytegleich. Die sichtbare Korrektur
// liegt deshalb ausschliesslich auf dem neuen unveränderlichen 6.3.1-Pfad.
const v630 = readFileSync(join(hier, '..', 'lspod-designer-v6-6.3.0.js'));
pruefe('v6.3.0 bleibt für bestehende SRI-Tags bytegleich',
  createHash('sha256').update(v630).digest('hex') === 'e58e5c277e9ff45ec5680150d96657b7f1cac0c66a777f46ce1fd65d2166c76b');

// Die Namen sind nur sichtbare Auswahlbeschriftungen. Die technisch verwendeten CSS-Schriften
// stehen separat in SCHRIFT_CSS und bleiben unverändert. Darum müssen die aktiv weiterentwickelten
// v6-Fassungen vollständig deutsch sein, während die englische Locale englisch bleibt.
for (const name of ['lspod-designer-v6.js', 'lspod-designer-v6-6.2.0.js', 'lspod-designer-v6-6.3.1.js']) {
  const s = readFileSync(join(hier, '..', name), 'utf8');
  pruefe(`${name}: deutsche Schriftauswahl ohne englische Stilnamen`,
    s.includes("['Modern ohne Serifen', 'Elegant mit Serifen', 'Handschrift', 'Kräftige Überschrift', 'Schreibmaschine']")
      && !s.includes(": ['Modern Sans', 'Elegant Serif', 'Handschrift', 'Bold Display', 'Mono']"));
  pruefe(`${name}: englische Locale und fünf technische CSS-Schriften bleiben erhalten`,
    s.includes("EN ? ['Modern Sans', 'Elegant Serif', 'Handwriting', 'Bold Display', 'Mono']")
      && /var SCHRIFT_CSS = \[[^;]+\];/.test(s));
}

console.log(fehler.length ? `\n${fehler.length} von ${n} Prüfungen FEHLGESCHLAGEN` : `\n${n} Prüfungen bestanden`);
process.exit(fehler.length ? 1 : 0);
