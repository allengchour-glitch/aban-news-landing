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
import { hier, repo, V6_DATEI, V5_DATEI } from './lib.mjs';
import { aufpreisChf as aufpreisRef } from '../../../dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs';
import { schweizerZahl as zahlRef } from '../../../dropship/selbst-gestalten-fertig-0511/werkzeuge/schweizer_masse.mjs';
import { karteFuerEditor, kartenbuendelFuerEditor, shopVariantenNormalisieren, podKarteGroesstmoeglich, kartenWarnungen, BEKANNTE_HINWEIS_CODES, POD_KARTE_MAX } from '../werkzeug/karte_fuer_editor.mjs';
import { dateienAusEigenschaften } from '../../../automation/lib/printful_bestellweg.mjs';

let n = 0; const fehler = [];
function pruefe(name, ok, detail = '') { n++; if (!ok) { fehler.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); } }
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
pruefe('v6 lädt ohne Seite und meldet seine Version', win.LSPOD6.version === '6.1.0');
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
if (katalogOrdner && existsSync(join(katalogOrdner, '71.json'))) {
  for (const id of [71, 19, 268, 206, 388]) {
    const neu = karteFuerEditor(JSON.parse(readFileSync(join(katalogOrdner, `${id}.json`), 'utf8')));
    pruefe(`Test-Karte ${id} = frischer Bau aus dem Katalog`, readFileSync(join(hier, 'testdaten', `${id}.karte.json`), 'utf8') === JSON.stringify(neu, null, 1) + '\n');
    pruefe(`Karte ${id} schlank (unter 12 KB)`, JSON.stringify(neu).length < 12000, String(JSON.stringify(neu).length));
    pruefe(`Karte ${id} hat keine internen Texte (Erfahrungswert, Messdatei, USD)`, !/Erfahrungswert|messung_0511|1:1 an Printful/.test(JSON.stringify(neu)));
    pruefe(`Karte ${id}: Aufpreise nur in CHF der Preisformel`, neu.platzierungen.every((p) => (p.aufpreisUsd ? p.aufpreisChf === aufpreisRef(p.aufpreisUsd) : p.aufpreisChf === 0)));
  }
  const mit = karteFuerEditor(JSON.parse(readFileSync(join(katalogOrdner, '19.json'), 'utf8')), { shopVarianten: { 111: 1320 } });
  gleich('Kartenbau: Shop-Zuordnung wird durchgereicht', mit.shop, { varianten: { 111: 1320 } });
  pruefe('Kartenbau: ohne Zuordnung kein Feld «shop»', !('shop' in karteFuerEditor(JSON.parse(readFileSync(join(katalogOrdner, '19.json'), 'utf8')))));
} else console.log('  (Katalogordner V6_KATALOG nicht gesetzt: Vergleich Test-Karten gegen frischen Bau übersprungen)');
for (const id of [71, 19, 268, 206, 388]) {
  const k = lies(id);
  pruefe(`Test-Karte ${id}: keine internen Texte`, !/Erfahrungswert|messung_0511|1:1 an Printful/.test(JSON.stringify(k)));
  pruefe(`Test-Karte ${id}: Mindest-dpi vorhanden`, typeof k.minDpi === 'number' && k.minDpi > 0);
  pruefe(`Test-Karte ${id}: jede Platzierung hat Druckdatei und Vorlage mit Zahlen`, k.platzierungen.every((p) => H.platzierungOk(p)));
}
pruefe('Test-Karte T-Shirt: Rückseite kostet CHF 6.10, Vorderseite nichts', lies(71).platzierungen.find((p) => p.id === 'back').aufpreisChf === 6.1 && lies(71).platzierungen[0].aufpreisChf === 0);
pruefe('Test-Karte Dad-Cap: Stickerei und Kappe als Einschränkung', lies(206).hinweise.filter((h) => h.art === 'einschraenkung').map((h) => h.code).sort().join() === 'kappe,stickerei');
pruefe('Test-Karte T-Shirt: Hinweise der Art «info» nur mit bekanntem Code oder gar nicht', lies(71).hinweise.every((h) => h.art === 'einschraenkung' || BEKANNTE_HINWEIS_CODES.includes(h.code)));

// ── Warenkorb-Eigenschaften lesen (Vertrag zwischen Editor und Auftragsabwicklung) ─────────────────
const pod = { v: 6, s: 1, m: 71, pv: 4012, sv: '1001', pl: ['front', 'sleeve_left'], dt: { front: 'default' }, px: ['1800x2400', '600x525'], ap: 2.6 };
const props = {
  '🎨 Design (front)': 'Text: "Hallo"', '🖼️ Druckdatei (front)': 'https://res.cloudinary.com/x/1.png', '🖼️ Druckdatei (sleeve_left)': 'https://res.cloudinary.com/x/2.png', _pod_karte: JSON.stringify(pod),
};
const r1 = dateienAusEigenschaften(props);
gleich('Eigenschaften v6: Platzierung und Dateityp', r1.dateien.map((d) => [d.platzierung, d.dateiTyp]), [['front', 'default'], ['sleeve_left', 'sleeve_left']]);
gleich('Eigenschaften v6: keine Probleme', r1.probleme, []);
pruefe('Eigenschaften v6: Ärmel wird NICHT als Vorderseite gelesen (Fehler der alten pickFiles)', r1.dateien.every((d) => d.quelle === 'v6') && r1.dateien[1].platzierung === 'sleeve_left');
gleich('Eigenschaften als Shopify-Liste (key/value) gelesen', dateienAusEigenschaften(Object.entries(props).map(([key, value]) => ({ key, value }))).dateien.length, 2);
gleich('Eigenschaften v5: Hinten', dateienAusEigenschaften({ 'Hinten · 🖼️ Druckdatei': 'https://x/y.png', 'Vorne · 🖼️ Druckdatei': 'https://x/z.png' }).dateien.map((d) => d.platzierung), ['back', 'front']);
gleich('Eigenschaften v5: eine Seite ohne Präfix', dateienAusEigenschaften({ '🖼️ Druckdatei': 'https://x/z.png' }).dateien.map((d) => d.platzierung), ['front']);
pruefe('Eigenschaften: http (nicht https) wird gemeldet und übersprungen', (() => { const r = dateienAusEigenschaften({ '🖼️ Druckdatei (front)': 'http://x/y.png' }); return r.dateien.length === 0 && r.probleme.length === 1; })());
pruefe('Eigenschaften: Druckdatei, die _pod_karte nicht kennt, wird gemeldet', dateienAusEigenschaften({ '🖼️ Druckdatei (back)': 'https://x/y.png', _pod_karte: JSON.stringify({ v: 6, pl: ['front'] }) }).probleme.some((p) => /nicht in _pod_karte/.test(p)));
pruefe('Eigenschaften: Platzierung ohne Druckdatei wird gemeldet', dateienAusEigenschaften({ _pod_karte: JSON.stringify({ v: 6, pl: ['front'] }) }).probleme.some((p) => /ohne Druckdatei/.test(p)));
pruefe('Eigenschaften: kaputtes _pod_karte wird gemeldet', dateienAusEigenschaften({ _pod_karte: '{' }).probleme.length === 1);
pruefe('Eigenschaften: leer ergibt nichts', dateienAusEigenschaften(null).dateien.length === 0 && dateienAusEigenschaften([]).dateien.length === 0);

// ── v5 ist unverändert ─────────────────────────────────────────────────────────────────────────────
const v5 = readFileSync(V5_DATEI);
pruefe('v5 (pod/live) ist unverändert: 51 378 Byte', v5.length === 51378, String(v5.length));
pruefe('v5 (pod/live) ist unverändert: SHA-256 beginnt mit 70140421381326aff999', createHash('sha256').update(v5).digest('hex').startsWith('70140421381326aff999'));
pruefe('v6 greift nicht auf die v5-Kennungen zu (Klasse, Guard, Eingabefeld)', (() => { const s = readFileSync(V6_DATEI, 'utf8'); return !/['"]\.lspod-designer['"]/.test(s) && !/__lspodDesignerLoaded\s*=/.test(s) && !/data-lspod="1"/.test(s); })());

console.log(fehler.length ? `\n${fehler.length} von ${n} Prüfungen FEHLGESCHLAGEN` : `\n${n} Prüfungen bestanden`);
process.exit(fehler.length ? 1 : 0);
