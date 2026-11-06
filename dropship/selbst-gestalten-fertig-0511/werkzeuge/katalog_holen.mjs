#!/usr/bin/env node
/**
 * katalog_holen.mjs: Printful-Katalog («Selbst gestalten») lesen, schlank speichern, Index bauen,
 * gegen die 38 Shop-Produkte abgleichen. NUR LESEN: kein Schreibzugriff bei Printful, Shopify oder CJ.
 *
 * WARUM: Der Editor der Shop-Produkte arbeitet mit einer quadratischen Leinwand und einer festen
 * Druckdatei von 1200 x 1200 px. Für einen Editor mit echter Druckgeometrie braucht jedes Modell
 * seine Druckdateien (Breite, Höhe, dpi), Platzierungen, Aufpreise und Vorlagen. Das Skript holt sie
 * einmal vollständig und speichert je Produkt EINE Datei.
 *
 * Je Katalogprodukt (GET /products, nur is_discontinued=false) vier Abrufe:
 *   GET /products/<id>                       Typ, Titel, Beschreibung, Techniken, Dateien (Platzierungen
 *                                            mit Aufpreis), Varianten (Farbe, Grösse, Preis USD, Regionen)
 *   GET /mockup-generator/printfiles/<id>    Platzierungen, Druckdateien (Breite, Höhe, dpi), je Variante
 *   GET /mockup-generator/templates/<id>     Vorlagen (Bild-URL, Druckfläche, Ansicht), min_dpi
 *   GET /products/<id>/sizes                 Grössentabellen (falls vorhanden)
 *
 * Fortsetzbar: eine Datei <SG>/katalog/<id>.json mit schema=2 wird übersprungen. Technische Fehler
 * (Netz, 5xx nach Wiederholungen) schreiben KEINE Datei, der nächste Lauf holt das Produkt neu.
 * Ein 4xx von printfiles/templates/sizes ist ein Befund («gibt es nicht») und wird mit Status gespeichert.
 *
 * Verdichten (Vermerk im Feld «verdichtet» jeder Datei): Produkte mit bis zu 24 Vorlagen bleiben
 * unverändert. Darüber (T-Shirt: 672 Vorlagen) wird je Platzierung und Ansicht (Vorderseite/Rückseite,
 * Ausrichtung) die Vorlage der ersten Variante behalten, dazu alle verschiedenen Geometrien
 * (Druckfläche in Template-Pixeln) mit Zähler. Die Bild-URLs der übrigen Vorlagen entfallen (es sind
 * Farbvarianten desselben Fotos). Die Zuordnung Variante -> Druckdatei bleibt verlustfrei, gruppiert.
 *
 * Aufruf (Node 22):
 *   PRINTFUL_API_KEY=... PRINTFUL_STORE_ID=... node katalog_holen.mjs
 *   ONLY=19,71 node katalog_holen.mjs        nur diese Katalog-IDs holen
 *   NUR_INDEX=1 node katalog_holen.mjs       nichts holen, nur Index + Abgleich aus den Dateien neu bauen
 *   node katalog_holen.mjs --selbsttest      Rechenkern prüfen (kein Netz)
 *
 * Ausgabe (SG = Scratch-Ordner, Vorgabe unten, mit SG_DIR änderbar):
 *   <SG>/katalog/<id>.json        je Produkt eine Datei
 *   <SG>/katalog_liste.json       Antwort von GET /products (schlank)
 *   <SG>/katalog_index.json       Index aller Produkte + Zähler
 *   <SG>/katalog_abgleich.json    Abgleich mit den Shop-Produkten (matrix.json)
 *   <SG>/katalog_fehler.json      Produkte, die technisch nicht geholt werden konnten
 *
 * Zugang nie ausgeben: PRINTFUL_API_KEY und PRINTFUL_STORE_ID kommen nur aus der Umgebung.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, renameSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

export const SCHEMA = 2;
const SG = process.env.SG_DIR || '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg';
const KAT = join(SG, 'katalog');
const API = 'https://api.printful.com';
const PAUSE_MS = Number(process.env.PAUSE_MS || 650);   // Grenze rund 120 Anfragen/min: mindestens 600 ms Abstand
const VORLAGEN_GRENZE = 24;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------------------------
// Rechenkern (rein, ohne Netz; vom Selbsttest geprüft)
// ---------------------------------------------------------------------------------------------

export function schlankeVariante(v) {
  return {
    id: v.id, name: v.name, size: v.size ?? null, color: v.color ?? null,
    color_code: v.color_code ?? null, color_code2: v.color_code2 ?? null,
    image: v.image ?? null, price: v.price ?? null, in_stock: v.in_stock ?? null,
    status: Object.fromEntries((v.availability_status || []).map((s) => [s.region, s.status])),
    regionen: Object.keys(v.availability_regions || {}),
    material: v.material || [],
  };
}

/** Variante -> Druckdatei je Platzierung, verlustfrei gruppiert (gleiche Zuordnung = eine Gruppe). */
export function gruppiereVariantenDruckdateien(variantPrintfiles) {
  const gruppen = new Map();
  for (const vp of variantPrintfiles || []) {
    const k = JSON.stringify(Object.entries(vp.placements || {}).sort(([a], [b]) => (a < b ? -1 : 1)));
    let g = gruppen.get(k);
    if (!g) { g = { placements: vp.placements || {}, varianten: [] }; gruppen.set(k, g); }
    g.varianten.push(vp.variant_id);
  }
  return [...gruppen.values()];
}

export function schlankePrintfiles(r) {
  if (!r) return null;
  return {
    product_id: r.product_id ?? null,
    available_placements: r.available_placements || {},
    printfiles: r.printfiles || [],
    variant_printfiles_gruppen: gruppiereVariantenDruckdateien(r.variant_printfiles),
    option_groups: r.option_groups || [],
    options: r.options || [],
  };
}

/** Vorlagen verdichten (siehe Kopf). Gibt {daten, notiz} zurück; notiz ist null, wenn nichts wegfiel. */
export function verdichteVorlagen(r, grenze = VORLAGEN_GRENZE) {
  if (!r) return { daten: null, notiz: null };
  const tpls = r.templates || [];
  const vm = r.variant_mapping || [];
  if (tpls.length <= grenze) return { daten: { ...r }, notiz: null };
  const nachId = new Map(tpls.map((t) => [t.template_id, t]));
  const gruppen = new Map();
  const benutzt = new Set();
  let ohneVorlage = 0;
  for (const v of vm) {
    for (const m of v.templates || []) {
      const t = nachId.get(m.template_id);
      if (!t) { ohneVorlage++; continue; }
      benutzt.add(m.template_id);
      const k = [m.placement, t.is_template_on_front, t.orientation ?? ''].join('|');
      let g = gruppen.get(k);
      if (!g) {
        g = { placement: m.placement, is_template_on_front: t.is_template_on_front, orientation: t.orientation ?? null,
          anzahl_zuordnungen: 0, template_ids: new Set(), beispiel: { variant_id: v.variant_id, template: t }, geometrien: new Map() };
        gruppen.set(k, g);
      }
      g.anzahl_zuordnungen++;
      g.template_ids.add(m.template_id);
      const gk = [t.printfile_id, t.template_width, t.template_height, t.print_area_width, t.print_area_height, t.print_area_top, t.print_area_left].join('/');
      let ge = g.geometrien.get(gk);
      if (!ge) {
        ge = { printfile_id: t.printfile_id, template_width: t.template_width, template_height: t.template_height,
          print_area_width: t.print_area_width, print_area_height: t.print_area_height,
          print_area_top: t.print_area_top, print_area_left: t.print_area_left,
          anzahl_zuordnungen: 0, beispiel_variant_id: v.variant_id, beispiel_template_id: m.template_id };
        g.geometrien.set(gk, ge);
      }
      ge.anzahl_zuordnungen++;
    }
  }
  const out = [...gruppen.values()].map((g) => ({
    placement: g.placement, is_template_on_front: g.is_template_on_front, orientation: g.orientation,
    anzahl_zuordnungen: g.anzahl_zuordnungen, anzahl_verschiedene_vorlagen: g.template_ids.size,
    beispiel: g.beispiel, geometrien: [...g.geometrien.values()],
  }));
  const daten = {
    version: r.version ?? null, min_dpi: r.min_dpi ?? null,
    conflicting_placements: r.conflicting_placements || [],
    gruppen: out,
    verdichtung: { vorlagen_gesamt: tpls.length, varianten_gesamt: vm.length,
      vorlagen_ohne_zuordnung: tpls.length - benutzt.size, zuordnungen_ohne_vorlage: ohneVorlage },
  };
  const notiz = `templates: ${tpls.length} Vorlagen und variant_mapping von ${vm.length} Varianten auf ${out.length} Gruppen `
    + '(Platzierung x Ansicht x Ausrichtung) mit je einer Beispielvorlage (erste Variante) und allen verschiedenen Geometrien verdichtet; '
    + 'Bild-URLs der übrigen Vorlagen weggelassen (Farbvarianten desselben Fotos)';
  return { daten, notiz };
}

/** Aus den Rohantworten die Datei bauen, die gespeichert wird. */
export function baueDatei({ id, produkt, printfiles, vorlagen, groessen, status }) {
  const verdichtet = [];
  const p = produkt?.product ? { ...produkt.product } : null;
  const varianten = (produkt?.variants || []).map(schlankeVariante);
  if (produkt?.variants) verdichtet.push(`varianten: ${varianten.length} Varianten schlank (availability_status als Karte Region -> Status; availability_regions als Liste)`);
  const pf = schlankePrintfiles(printfiles);
  if (printfiles?.variant_printfiles) verdichtet.push(`printfiles: variant_printfiles (${printfiles.variant_printfiles.length}) verlustfrei in ${pf.variant_printfiles_gruppen.length} Gruppen`);
  const vd = verdichteVorlagen(vorlagen);
  if (vd.notiz) verdichtet.push(vd.notiz);
  return {
    schema: SCHEMA, id, geholt: new Date().toISOString(),
    quelle_status: status, verdichtet,
    produkt: p, varianten, printfiles: pf, templates: vd.daten, sizes: groessen ?? null,
  };
}

const num = (x) => (x === null || x === undefined || x === '' ? null : Number(x));

function druckdateienJePlatzierung(pf) {
  // Platzierung -> [{printfile_id, w, h, dpi, anzahl_varianten}]
  const nach = new Map((pf?.printfiles || []).map((f) => [f.printfile_id, f]));
  const out = {};
  for (const g of pf?.variant_printfiles_gruppen || []) {
    for (const [pl, pid] of Object.entries(g.placements)) {
      const f = nach.get(pid);
      const liste = (out[pl] ||= []);
      let e = liste.find((x) => x.printfile_id === pid);
      if (!e) { e = { printfile_id: pid, w: f?.width ?? null, h: f?.height ?? null, dpi: f?.dpi ?? null, fill_mode: f?.fill_mode ?? null, anzahl_varianten: 0 }; liste.push(e); }
      e.anzahl_varianten += g.varianten.length;
    }
  }
  return out;
}

/** Eine Zeile des Index aus der gespeicherten Datei. */
export function indexZeile(d) {
  const p = d.produkt || {};
  const vs = d.varianten || [];
  const pf = d.printfiles;
  const verfPl = pf?.available_placements || {};
  const plKeys = Object.keys(verfPl);
  const dd = druckdateienJePlatzierung(pf);

  // Platzierungen: Dateien des Produkts (files, ohne Mockup) mit der Druckdatei verknüpfen.
  // Dateikennung und Platzierung weichen ab (files.id «default» hat type «front»): erst type, dann id.
  const platz = [];
  const gebraucht = new Set();
  for (const f of (p.files || []).filter((x) => x.type !== 'mockup')) {
    const key = plKeys.includes(f.type) ? f.type : plKeys.includes(f.id) ? f.id : null;
    if (key) gebraucht.add(key);
    platz.push({ datei_id: f.id, typ: f.type, titel: f.title ?? null, aufpreis_usd: num(f.additional_price),
      platzierung: key, hat_druckdatei: !!key, druckdateien: key ? dd[key] || [] : [] });
  }
  for (const key of plKeys) {
    if (gebraucht.has(key)) continue;
    platz.push({ datei_id: null, typ: key, titel: verfPl[key], aufpreis_usd: null,
      platzierung: key, hat_druckdatei: true, druckdateien: dd[key] || [] });
  }

  const preise = vs.map((v) => num(v.price)).filter((x) => x !== null && Number.isFinite(x));
  const farben = [...new Set(vs.map((v) => v.color).filter(Boolean))];
  // Grössen in der Reihenfolge der Grössentabelle (XS..5XL), sonst in der Reihenfolge der Varianten
  const grVar = [...new Set(vs.map((v) => v.size).filter(Boolean))];
  const grTab = d.sizes?.available_sizes || [];
  const groessen = [...grVar].sort((a, b) => {
    const ia = grTab.indexOf(a), ib = grTab.indexOf(b);
    return (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib);
  });
  const stat = (region) => {
    const z = { gelistet: 0, in_stock: 0 };
    for (const v of vs) {
      if (Object.prototype.hasOwnProperty.call(v.status || {}, region)) {
        z.gelistet++;
        if (v.status[region] === 'in_stock') z.in_stock++;
      }
    }
    return z;
  };
  const eu = stat('EU');
  const us = stat('US');
  const regionen = [...new Set(vs.flatMap((v) => Object.keys(v.status || {})))].sort();
  const euPreise = vs.filter((v) => v.status?.EU === 'in_stock').map((v) => num(v.price)).filter(Number.isFinite);
  const tpl = d.templates;
  const hatPrintfiles = !!(pf && (pf.printfiles || []).length > 0 && plKeys.length > 0);
  const hatVorlagen = !!(tpl && ((tpl.templates || []).length > 0 || (tpl.gruppen || []).length > 0));
  const size = d.sizes;
  return {
    id: d.id, typ: p.type ?? null, typ_name: p.type_name ?? null, titel: p.title ?? null,
    techniken: (p.techniques || []).map((t) => ({ key: t.key, name: t.display_name, default: !!t.is_default })),
    platzierungen: platz,
    n_druckplatzierungen: plKeys.length,
    n_dateien: (p.files || []).filter((x) => x.type !== 'mockup').length,
    n_varianten: vs.length,
    farben: { anzahl: farben.length, namen: farben },
    groessen,
    kosten_usd: { min: preise.length ? Math.min(...preise) : null, max: preise.length ? Math.max(...preise) : null },
    kosten_eu_in_stock_usd: { min: euPreise.length ? Math.min(...euPreise) : null, max: euPreise.length ? Math.max(...euPreise) : null },
    lieferbar: {
      eu, us, regionen,
      nur_usa: eu.in_stock === 0 && us.in_stock > 0,                       // EU nirgends in_stock, USA schon
      nur_region_us: regionen.length > 0 && regionen.every((r) => r === 'US'), // strikt: nur die Region US ist gelistet
      nicht_in_eu: eu.in_stock === 0,
      eu_vollstaendig: vs.length > 0 && eu.in_stock === vs.length,
      eu_teilweise: eu.in_stock > 0 && eu.in_stock < vs.length,
    },
    has_printfiles: hatPrintfiles,
    has_templates: hatVorlagen,
    min_dpi: tpl?.min_dpi ?? null,
    hat_groessentabelle: !!(size && (size.size_tables || []).length > 0),
    groessentabelle_einheiten: size ? [...new Set((size.size_tables || []).map((t) => t.unit).filter(Boolean))] : [],
    dimensions: p.dimensions ?? null,
    quelle_status: d.quelle_status,
    datei: `katalog/${d.id}.json`,
  };
}

export function zaehle(zeilen) {
  const z = {
    produkte: zeilen.length,
    ohne_druckdateien: zeilen.filter((x) => !x.has_printfiles).length,
    ohne_vorlagen: zeilen.filter((x) => !x.has_templates).length,
    ohne_beides: zeilen.filter((x) => !x.has_printfiles && !x.has_templates).length,
    ohne_eines_von_beiden: zeilen.filter((x) => !x.has_printfiles || !x.has_templates).length,
    mit_druckdateien_und_vorlagen: zeilen.filter((x) => x.has_printfiles && x.has_templates).length,
    mehrere_druckplatzierungen: zeilen.filter((x) => x.n_druckplatzierungen > 1).length,
    mehrere_dateien_ohne_mockup: zeilen.filter((x) => x.n_dateien > 1).length,
    genau_eine_druckplatzierung: zeilen.filter((x) => x.n_druckplatzierungen === 1).length,
    nur_usa_lieferbar: zeilen.filter((x) => x.lieferbar.nur_usa).length,
    nur_region_us_gelistet: zeilen.filter((x) => x.lieferbar.nur_region_us).length,
    eu_alle_varianten_in_stock: zeilen.filter((x) => x.lieferbar.eu_vollstaendig).length,
    eu_nur_teilweise: zeilen.filter((x) => x.lieferbar.eu_teilweise).length,
    ohne_jede_region: zeilen.filter((x) => x.lieferbar.regionen.length === 0).length,
    eu_varianten_in_stock: zeilen.reduce((a, x) => a + x.lieferbar.eu.in_stock, 0),
    nicht_in_eu_in_stock: zeilen.filter((x) => x.lieferbar.nicht_in_eu).length,
    eu_gelistet_aber_nichts_in_stock: zeilen.filter((x) => x.lieferbar.eu.gelistet > 0 && x.lieferbar.eu.in_stock === 0).length,
    mit_groessentabelle: zeilen.filter((x) => x.hat_groessentabelle).length,
    varianten_gesamt: zeilen.reduce((a, x) => a + x.n_varianten, 0),
    nach_typ: {},
  };
  for (const x of zeilen) z.nach_typ[x.typ] = (z.nach_typ[x.typ] || 0) + 1;
  return z;
}

/**
 * Abgleich Shop-Produkte (matrix.json) gegen den Katalog. Reine Rechnung.
 * variantInfo: Map variant_id -> { produkt, eu, us, regionen } (aus den gespeicherten Dateien).
 * Ein Shop-Produkt kann Varianten aus MEHREREN Katalogprodukten tragen (z. B. T-Shirt: 3 Materialien):
 * darum wird jedes Katalogprodukt der SKU-Endungen geprüft, nicht nur das der ersten Variante.
 */
export function gleicheAb(matrix, indexNachId, variantInfo) {
  const zeilen = [];
  for (const m of matrix) {
    const vids = [...new Set((m.varianten || []).map((v) => v.vid).filter(Boolean))];
    const info = (v) => variantInfo.get(v);
    const produkteAusVids = [...new Set(vids.map((v) => info(v)?.produkt).filter((x) => x !== undefined))];
    const vidsFehlend = vids.filter((v) => !info(v));
    const pid = m.pf?.produktId ?? null;
    const katZeile = pid ? indexNachId.get(pid) : null;
    const katProdukte = [...new Set([...(pid ? [pid] : []), ...produkteAusVids])].map((id) => {
      const z = indexNachId.get(id);
      return z ? { id, titel: z.titel, typ: z.typ, has_printfiles: z.has_printfiles, has_templates: z.has_templates,
        nur_usa: z.lieferbar.nur_usa, nicht_in_eu: z.lieferbar.nicht_in_eu, regionen: z.lieferbar.regionen } : { id, im_katalog: false };
    });
    const euOk = vids.filter((v) => info(v)?.eu === 'in_stock');
    const euNicht = vids.filter((v) => info(v) && info(v).eu !== 'in_stock')
      .map((v) => ({ variant_id: v, eu: info(v).eu ?? 'nicht gelistet', regionen: info(v).regionen }));
    zeilen.push({
      handle: m.handle, status: m.status, sku_varianten: (m.varianten || []).length,
      printful_produkt_id: pid, printful_typ: m.pf?.typ ?? null,
      im_katalog: !!katZeile,
      katalog_titel: katZeile?.titel ?? null,
      produkte_aus_variant_ids: produkteAusVids,
      katalog_produkte: katProdukte,
      variant_ids: vids.length, variant_ids_im_katalog: vids.length - vidsFehlend.length, variant_ids_fehlend: vidsFehlend,
      mehrere_katalogprodukte: produkteAusVids.length > 1,
      vid_produkt_weicht_von_matrix_ab: pid !== null && produkteAusVids.some((x) => x !== pid),
      katalog_hat_druckdateien: katProdukte.every((k) => k.has_printfiles === true),
      katalog_hat_vorlagen: katProdukte.every((k) => k.has_templates === true),
      vids_eu_in_stock: euOk.length,
      vids_nicht_eu_in_stock: euNicht,
    });
  }
  return zeilen;
}

// ---------------------------------------------------------------------------------------------
// Selbsttest
// ---------------------------------------------------------------------------------------------

function selbsttest() {
  // 1) Gruppieren verlustfrei
  const g = gruppiereVariantenDruckdateien([
    { variant_id: 1, placements: { front: 1, back: 2 } },
    { variant_id: 2, placements: { back: 2, front: 1 } },
    { variant_id: 3, placements: { front: 5, back: 2 } },
  ]);
  assert.equal(g.length, 2);
  assert.deepEqual(g[0].varianten, [1, 2]);
  assert.deepEqual(g[1].varianten, [3]);

  // 2) Wenige Vorlagen bleiben unverändert
  const klein = { version: 1, templates: [{ template_id: 1 }], variant_mapping: [{ variant_id: 1, templates: [{ placement: 'default', template_id: 1 }] }], min_dpi: 150, conflicting_placements: [] };
  const k = verdichteVorlagen(klein);
  assert.equal(k.notiz, null);
  assert.deepEqual(k.daten.templates, klein.templates);
  assert.equal(verdichteVorlagen(null).daten, null);

  // 3) Viele Vorlagen: 30 Varianten, Vorder- und Rückseite, zwei Geometrien
  const templates = [];
  const vm = [];
  for (let i = 0; i < 30; i++) {
    const tf = { template_id: 1000 + i, image_url: 'f' + i, printfile_id: i < 20 ? 1 : 2, template_width: 3000, template_height: 3000, print_area_width: i < 20 ? 1010 : 900, print_area_height: 1346, print_area_top: 530, print_area_left: 1006, is_template_on_front: true, orientation: 'any' };
    const tb = { template_id: 2000 + i, image_url: 'b' + i, printfile_id: 1, template_width: 3000, template_height: 3000, print_area_width: 1010, print_area_height: 1346, print_area_top: 530, print_area_left: 1006, is_template_on_front: false, orientation: 'any' };
    templates.push(tf, tb);
    vm.push({ variant_id: 5000 + i, templates: [{ placement: 'front', template_id: tf.template_id }, { placement: 'back', template_id: tb.template_id }] });
  }
  const gross = { version: 1, templates, variant_mapping: vm, min_dpi: 150, conflicting_placements: [{ placement: 'front', conflicts: ['x'] }] };
  const v = verdichteVorlagen(gross);
  assert.ok(v.notiz && /60 Vorlagen/.test(v.notiz));
  assert.equal(v.daten.gruppen.length, 2);
  const front = v.daten.gruppen.find((x) => x.placement === 'front');
  assert.equal(front.beispiel.variant_id, 5000);
  assert.equal(front.beispiel.template.template_id, 1000);
  assert.equal(front.geometrien.length, 2);
  assert.equal(front.geometrien[0].anzahl_zuordnungen, 20);
  assert.equal(front.geometrien[1].anzahl_zuordnungen, 10);
  assert.equal(front.anzahl_verschiedene_vorlagen, 30);
  assert.equal(v.daten.verdichtung.vorlagen_ohne_zuordnung, 0);
  assert.deepEqual(v.daten.conflicting_placements, gross.conflicting_placements);

  // 4) Index: Dateikennung «default» (type «front») wird der Platzierung «front» zugeordnet
  const datei = baueDatei({
    id: 71,
    produkt: { product: { type: 'T-SHIRT', title: 'Shirt', techniques: [{ key: 'DTG', display_name: 'DTG', is_default: true }],
      files: [{ id: 'default', type: 'front', title: 'Front', additional_price: null }, { id: 'back', type: 'back', title: 'Back', additional_price: '5.95' },
        { id: 'embroidery_chest_left', type: 'embroidery_chest_left', title: 'Stick', additional_price: '2.95' }, { id: 'preview', type: 'mockup', title: 'Mockup', additional_price: null }] },
      variants: [
        { id: 1, name: 'A', size: 'S', color: 'Rot', price: '10.00', availability_status: [{ region: 'EU', status: 'in_stock' }, { region: 'US', status: 'in_stock' }], availability_regions: { EU: 'x', US: 'y' } },
        { id: 2, name: 'B', size: 'M', color: 'Rot', price: '12.50', availability_status: [{ region: 'US', status: 'in_stock' }], availability_regions: { US: 'y' } }] },
    printfiles: { product_id: 71, available_placements: { front: 'Front print', back: 'Back print' },
      printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150, fill_mode: 'fit' }],
      variant_printfiles: [{ variant_id: 1, placements: { front: 1, back: 1 } }, { variant_id: 2, placements: { front: 1, back: 1 } }] },
    vorlagen: klein, groessen: { size_tables: [{ type: 'measure_yourself', unit: 'inches' }] },
    status: { produkt: 200, printfiles: 200, templates: 200, sizes: 200 },
  });
  const z = indexZeile(datei);
  assert.equal(z.n_druckplatzierungen, 2);
  assert.equal(z.n_dateien, 3);
  const fr = z.platzierungen.find((x) => x.datei_id === 'default');
  assert.equal(fr.platzierung, 'front');
  assert.deepEqual(fr.druckdateien[0], { printfile_id: 1, w: 1800, h: 2400, dpi: 150, fill_mode: 'fit', anzahl_varianten: 2 });
  assert.equal(z.platzierungen.find((x) => x.datei_id === 'back').aufpreis_usd, 5.95);
  assert.equal(z.platzierungen.find((x) => x.datei_id === 'embroidery_chest_left').hat_druckdatei, false);
  assert.deepEqual(z.kosten_usd, { min: 10, max: 12.5 });
  assert.deepEqual(z.lieferbar.eu, { gelistet: 1, in_stock: 1 });
  assert.equal(z.lieferbar.nur_usa, false);
  assert.equal(z.farben.anzahl, 1);
  assert.equal(z.has_printfiles, true);
  assert.equal(z.has_templates, true);
  assert.equal(z.hat_groessentabelle, true);

  // 5) nur USA, ohne Vorlagen und Druckdateien
  const nurUs = indexZeile(baueDatei({
    id: 9, produkt: { product: { type: 'DECOR', title: 'X', files: [{ id: 'default', type: 'default', additional_price: null }] },
      variants: [{ id: 7, name: 'v', price: '1', availability_status: [{ region: 'US', status: 'in_stock' }, { region: 'EU', status: 'out_of_stock' }], availability_regions: { US: 'y', EU: 'e' } }] },
    printfiles: null, vorlagen: null, groessen: null, status: { produkt: 200, printfiles: 404, templates: 404, sizes: 200 },
  }));
  assert.equal(nurUs.lieferbar.nur_usa, true);
  assert.equal(nurUs.lieferbar.eu.gelistet, 1);
  assert.equal(nurUs.has_printfiles, false);
  assert.equal(nurUs.has_templates, false);
  const zz = zaehle([z, nurUs]);
  assert.equal(zz.ohne_beides, 1);
  assert.equal(zz.nur_usa_lieferbar, 1);
  assert.equal(zz.eu_gelistet_aber_nichts_in_stock, 1);
  assert.equal(zz.mehrere_druckplatzierungen, 1);

  // 6) Abgleich
  const idx = new Map([[71, z], [99, nurUs]]);
  const vinfo = new Map([[1, { produkt: 71, eu: 'in_stock', us: 'in_stock', regionen: ['EU', 'US'] }], [2, { produkt: 71, eu: undefined, us: 'in_stock', regionen: ['US'] }],
    [3, { produkt: 99, eu: 'out_of_stock', us: 'in_stock', regionen: ['EU', 'US'] }]]);
  const ab = gleicheAb([
    { handle: 'a', status: 'ACTIVE', pf: { produktId: 71, typ: 'T-SHIRT' }, varianten: [{ vid: 1 }, { vid: 2 }] },
    { handle: 'b', status: 'DRAFT', pf: { produktId: 55, typ: 'X' }, varianten: [{ vid: 8 }] },
    { handle: 'c', status: 'DRAFT', pf: null, varianten: [{ vid: null }] },
    { handle: 'd', status: 'ACTIVE', pf: { produktId: 71 }, varianten: [{ vid: 1 }, { vid: 3 }] },
  ], idx, vinfo);
  assert.equal(ab[0].im_katalog, true);
  assert.equal(ab[0].mehrere_katalogprodukte, false);
  assert.equal(ab[0].vids_eu_in_stock, 1);
  assert.deepEqual(ab[0].vids_nicht_eu_in_stock, [{ variant_id: 2, eu: 'nicht gelistet', regionen: ['US'] }]);
  assert.equal(ab[1].im_katalog, false);
  assert.deepEqual(ab[1].variant_ids_fehlend, [8]);
  assert.equal(ab[2].printful_produkt_id, null);
  assert.equal(ab[3].mehrere_katalogprodukte, true);
  assert.equal(ab[3].vid_produkt_weicht_von_matrix_ab, true);
  assert.equal(ab[3].katalog_produkte.length, 2);
  assert.equal(ab[3].vids_nicht_eu_in_stock[0].eu, 'out_of_stock');
  console.log('Selbsttest: alle Prüfungen bestanden');
}

// ---------------------------------------------------------------------------------------------
// Netz
// ---------------------------------------------------------------------------------------------

let letzterAufruf = 0;
const zaehler = { anfragen: 0, wiederholungen: 0, r429: 0 };

async function pfGet(pfad) {
  const kopf = { Authorization: 'Bearer ' + process.env.PRINTFUL_API_KEY, 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID };
  for (let versuch = 0; versuch < 6; versuch++) {
    const warte = Math.max(0, PAUSE_MS - (Date.now() - letzterAufruf));
    if (warte) await sleep(warte);
    letzterAufruf = Date.now();
    let res;
    zaehler.anfragen++;
    try {
      res = await fetch(API + pfad, { headers: kopf, signal: AbortSignal.timeout(120000) });
    } catch {
      zaehler.wiederholungen++;
      await sleep(2000 * 2 ** versuch);
      continue;
    }
    if (res.status === 429) {
      zaehler.r429++;
      const ra = Number(res.headers.get('retry-after')) || 15;
      await sleep((ra + 1) * 1000);
      continue;
    }
    if (res.status >= 500) {
      zaehler.wiederholungen++;
      await sleep(2000 * 2 ** versuch);
      continue;
    }
    let j = null;
    try { j = await res.json(); } catch { /* Körper nicht lesbar */ }
    const rest = Number(res.headers.get('x-ratelimit-remaining'));
    if (Number.isFinite(rest) && rest <= 3) {
      const reset = Number(res.headers.get('x-ratelimit-reset')) || 60;
      await sleep(Math.min(reset, 60) * 1000 + 500);
    }
    return { status: res.status, j };
  }
  return { status: 0, j: null };   // technischer Fehler: nichts speichern
}

const fehlertext = (j) => String(j?.error?.message || (typeof j?.result === 'string' ? j.result : '') || '').slice(0, 160);

async function holeProdukt(id) {
  const a = await pfGet(`/products/${id}`);
  if (a.status !== 200 || !a.j?.result?.product) return { fehler: `products/${id}: HTTP ${a.status} ${fehlertext(a.j)}`.trim() };
  const b = await pfGet(`/mockup-generator/printfiles/${id}`);
  if (b.status === 0) return { fehler: `printfiles/${id}: technischer Fehler` };
  const c = await pfGet(`/mockup-generator/templates/${id}`);
  if (c.status === 0) return { fehler: `templates/${id}: technischer Fehler` };
  const d = await pfGet(`/products/${id}/sizes`);
  if (d.status === 0) return { fehler: `sizes/${id}: technischer Fehler` };
  const gut = (x) => (x.status === 200 ? x.j?.result ?? null : null);
  const status = { produkt: a.status, printfiles: b.status, templates: c.status, sizes: d.status };
  for (const [k, x] of [['printfiles', b], ['templates', c], ['sizes', d]]) {
    if (x.status !== 200) status[k + '_meldung'] = fehlertext(x.j);
  }
  return {
    datei: baueDatei({ id, produkt: a.j.result, printfiles: gut(b), vorlagen: gut(c), groessen: gut(d), status }),
  };
}

function schreibe(pfad, obj) {
  const tmp = pfad + '.tmp';
  writeFileSync(tmp, JSON.stringify(obj));
  renameSync(tmp, pfad);
}

function dateiLesen(pfad) {
  try { return JSON.parse(readFileSync(pfad, 'utf8')); } catch { return null; }
}

// ---------------------------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------------------------

function baueIndexUndAbgleich(liste) {
  const zeilen = [];
  const variantInfo = new Map();
  const fehlen = [];
  for (const p of liste) {
    const d = dateiLesen(join(KAT, `${p.id}.json`));
    if (!d || d.schema !== SCHEMA) { fehlen.push(p.id); continue; }
    zeilen.push(indexZeile(d));
    for (const v of d.varianten || []) variantInfo.set(v.id, { produkt: p.id, eu: v.status?.EU, us: v.status?.US, regionen: Object.keys(v.status || {}) });
  }
  zeilen.sort((a, b) => a.id - b.id);
  const index = { erstellt: new Date().toISOString(), schema: SCHEMA, zaehler: zaehle(zeilen), ohne_datei: fehlen, produkte: zeilen };
  schreibe(join(SG, 'katalog_index.json'), index);

  let abgleich = null;
  const mp = join(SG, 'matrix.json');
  if (existsSync(mp)) {
    const matrix = dateiLesen(mp) || [];
    const nachId = new Map(zeilen.map((z) => [z.id, z]));
    const rows = gleicheAb(matrix, nachId, variantInfo);
    const mitId = rows.filter((r) => r.printful_produkt_id);
    abgleich = {
      erstellt: new Date().toISOString(),
      shop_produkte: rows.length,
      mit_printful_id: mitId.length,
      ohne_printful_id: rows.filter((r) => !r.printful_produkt_id).map((r) => r.handle),
      im_katalog: rows.filter((r) => r.im_katalog).length,
      nicht_im_katalog: rows.filter((r) => r.printful_produkt_id && !r.im_katalog).map((r) => ({ handle: r.handle, printful_produkt_id: r.printful_produkt_id })),
      verschiedene_katalogprodukte: [...new Set(mitId.map((r) => r.printful_produkt_id))].length,
      verschiedene_katalogprodukte_im_katalog: [...new Set(rows.filter((r) => r.im_katalog).map((r) => r.printful_produkt_id))].length,
      variant_ids_gesamt: rows.reduce((a, r) => a + r.variant_ids, 0),
      variant_ids_im_katalog: rows.reduce((a, r) => a + r.variant_ids_im_katalog, 0),
      variant_ids_fehlend: rows.flatMap((r) => r.variant_ids_fehlend.map((v) => ({ handle: r.handle, variant_id: v }))),
      shop_produkte_mit_mehreren_katalogprodukten: rows.filter((r) => r.mehrere_katalogprodukte).map((r) => ({ handle: r.handle, katalogprodukte: r.produkte_aus_variant_ids })),
      verschiedene_katalogprodukte_aus_sku: [...new Set(rows.flatMap((r) => r.produkte_aus_variant_ids))].length,
      im_katalog_ohne_druckdateien: rows.filter((r) => r.im_katalog && !r.katalog_hat_druckdateien).map((r) => r.handle),
      im_katalog_ohne_vorlagen: rows.filter((r) => r.im_katalog && !r.katalog_hat_vorlagen).map((r) => r.handle),
      sku_varianten_eu_in_stock: rows.reduce((a, r) => a + r.vids_eu_in_stock, 0),
      sku_varianten_nicht_eu_in_stock: rows.flatMap((r) => r.vids_nicht_eu_in_stock.map((x) => ({ handle: r.handle, ...x }))),
      produkte_ohne_jede_eu_variante: rows.filter((r) => r.variant_ids > 0 && r.vids_eu_in_stock === 0).map((r) => ({ handle: r.handle, status: r.status, regionen: [...new Set(r.vids_nicht_eu_in_stock.flatMap((x) => x.regionen))] })),
      zeilen: rows,
    };
    schreibe(join(SG, 'katalog_abgleich.json'), abgleich);
  }
  return { index, abgleich };
}

function berichte({ index, abgleich }) {
  const z = index.zaehler;
  console.log('\n=== ZUSAMMENFASSUNG (GEMESSEN, Printful-API, ' + new Date().toISOString().slice(0, 16) + ' UTC) ===');
  console.log('Produkte (nicht eingestellt):', z.produkte, '| Varianten gesamt:', z.varianten_gesamt, '| ohne Datei (nicht geholt):', index.ohne_datei.length);
  console.log('Ohne Druckdateien:', z.ohne_druckdateien, '| ohne Vorlagen:', z.ohne_vorlagen, '| ohne beides:', z.ohne_beides, '| mindestens eines fehlt:', z.ohne_eines_von_beiden);
  console.log('Mehrere Druckplatzierungen:', z.mehrere_druckplatzierungen, '| genau eine:', z.genau_eine_druckplatzierung, '| mehrere Dateien (ohne Mockup):', z.mehrere_dateien_ohne_mockup);
  console.log('Nur USA lieferbar (EU nirgends in_stock, USA schon):', z.nur_usa_lieferbar, '| nur Region US gelistet (strikt):', z.nur_region_us_gelistet, '| EU nirgends in_stock (alle Fälle):', z.nicht_in_eu_in_stock, '| EU gelistet, aber nichts in_stock:', z.eu_gelistet_aber_nichts_in_stock);
  console.log('EU: alle Varianten in_stock:', z.eu_alle_varianten_in_stock, '| nur teilweise:', z.eu_nur_teilweise, '| Varianten EU in_stock:', z.eu_varianten_in_stock, 'von', z.varianten_gesamt, '| ohne jede Region:', z.ohne_jede_region);
  console.log('Mit Grössentabelle:', z.mit_groessentabelle);
  console.log('Nach Typ:', JSON.stringify(z.nach_typ));
  if (abgleich) {
    console.log('\n--- Abgleich mit den Shop-Produkten (matrix.json) ---');
    console.log('Shop-Produkte:', abgleich.shop_produkte, '| mit Printful-ID:', abgleich.mit_printful_id, '| im Katalog:', abgleich.im_katalog, '| verschiedene Katalogprodukte:', abgleich.verschiedene_katalogprodukte);
    console.log('Ohne Printful-ID:', abgleich.ohne_printful_id.join(', ') || '-');
    console.log('Nicht im Katalog:', JSON.stringify(abgleich.nicht_im_katalog));
    console.log('Variant-IDs (SKU-Endung):', abgleich.variant_ids_gesamt, '| davon im Katalog:', abgleich.variant_ids_im_katalog, '| fehlend:', abgleich.variant_ids_fehlend.length);
    console.log('Shop-Produkte mit Varianten aus mehreren Katalogprodukten:', JSON.stringify(abgleich.shop_produkte_mit_mehreren_katalogprodukten));
    console.log('SKU-Varianten EU in_stock:', abgleich.sku_varianten_eu_in_stock, 'von', abgleich.variant_ids_gesamt, '| nicht EU in_stock:', abgleich.sku_varianten_nicht_eu_in_stock.length);
    console.log('Shop-Produkte ohne jede EU-Variante:', JSON.stringify(abgleich.produkte_ohne_jede_eu_variante));
    console.log('Im Katalog, aber ohne Druckdateien:', abgleich.im_katalog_ohne_druckdateien.join(', ') || '-');
    console.log('Im Katalog, aber ohne Vorlagen:', abgleich.im_katalog_ohne_vorlagen.join(', ') || '-');
  }
}

async function haupt() {
  mkdirSync(KAT, { recursive: true });
  if (process.env.NUR_INDEX === '1') {
    const liste = dateiLesen(join(SG, 'katalog_liste.json'));
    if (!liste) { console.error('katalog_liste.json fehlt: erst ohne NUR_INDEX laufen lassen'); process.exit(1); }
    berichte(baueIndexUndAbgleich(liste.produkte));
    return;
  }
  if (!process.env.PRINTFUL_API_KEY || !process.env.PRINTFUL_STORE_ID) { console.error('PRINTFUL_API_KEY und PRINTFUL_STORE_ID müssen gesetzt sein'); process.exit(1); }

  const l = await pfGet('/products');
  if (l.status !== 200 || !Array.isArray(l.j?.result)) { console.error('GET /products: HTTP', l.status, fehlertext(l.j)); process.exit(1); }
  const alle = l.j.result;
  let liste = alle.filter((p) => !p.is_discontinued).map((p) => ({ id: p.id, type: p.type, type_name: p.type_name, title: p.title, variant_count: p.variant_count, is_discontinued: !!p.is_discontinued }));
  const eingestellt = alle.length - liste.length;
  schreibe(join(SG, 'katalog_liste.json'), { geholt: new Date().toISOString(), gesamt: alle.length, eingestellt, produkte: liste });
  console.log(`Katalog: ${alle.length} Produkte, davon eingestellt ${eingestellt}, zu holen ${liste.length}`);

  let ziel = liste;
  if (process.env.ONLY) {
    const nur = new Set(process.env.ONLY.split(',').map((x) => Number(x.trim())));
    ziel = liste.filter((p) => nur.has(p.id));
  }
  if (process.env.LIMIT) ziel = ziel.slice(0, Number(process.env.LIMIT));

  const fehler = [];
  let neu = 0, uebersprungen = 0, i = 0;
  const start = Date.now();
  for (const p of ziel) {
    i++;
    const pfad = join(KAT, `${p.id}.json`);
    const alt = existsSync(pfad) ? dateiLesen(pfad) : null;
    if (alt && alt.schema === SCHEMA && alt.produkt) { uebersprungen++; continue; }
    const r = await holeProdukt(p.id);
    if (r.fehler) {
      fehler.push({ id: p.id, titel: p.title, fehler: r.fehler });
      console.log(`[${i}/${ziel.length}] ${p.id} ${p.type} FEHLER ${r.fehler}`);
      continue;
    }
    schreibe(pfad, r.datei);
    neu++;
    const s = r.datei.quelle_status;
    if (neu % 10 === 1 || s.printfiles !== 200 || s.templates !== 200) {
      const min = ((Date.now() - start) / 60000).toFixed(1);
      console.log(`[${i}/${ziel.length}] ${p.id} ${p.type} ${String(p.title).slice(0, 40)} | pf ${s.printfiles} tpl ${s.templates} size ${s.sizes} | neu ${neu} | ${min} min | anfragen ${zaehler.anfragen}, 429 ${zaehler.r429}`);
    }
  }
  schreibe(join(SG, 'katalog_fehler.json'), fehler);
  console.log(`Geholt: ${neu}, übersprungen (schon da): ${uebersprungen}, Fehler: ${fehler.length}, Anfragen: ${zaehler.anfragen}, 429: ${zaehler.r429}, Wiederholungen: ${zaehler.wiederholungen}`);

  berichte(baueIndexUndAbgleich(liste));
  if (fehler.length) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--selbsttest')) selbsttest();
  else await haupt();
}
