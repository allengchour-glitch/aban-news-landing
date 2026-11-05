/**
 * Modellkarte für «Selbst gestalten» (Aufgabe C, 05.11.2026): aus EINER Katalogdatei (katalog/<id>.json, geholt von katalog_holen.mjs) wird eine Karte, aus der
 * ein Bearbeitungstool mit der ECHTEN Druckgeometrie von Printful arbeiten kann. Rein: kein Netz, keine Schreibzugriffe, kein Zufall.
 *
 * Eingabe: das geparste Objekt einer Katalogdatei (Schlüssel produkt, varianten, printfiles, templates, sizes). Beide Vorlagenformate werden gelesen:
 *   - ROH:        templates.templates[] + templates.variant_mapping[]  (kleine Produkte)
 *   - VERDICHTET: templates.gruppen[]                                  (grosse Produkte, z. B. T-Shirt 71; Bild-URL nur für die Beispielvorlage je Gruppe)
 *
 * MODELLKARTEN-SCHEMA (schema 1; Felder mit «Platzhalter» sind noch nicht übersetzt/ausgefüllt, nie geraten):
 * {
 *   schema: 1, erzeugtAus: { katalogGeholt, quelle },
 *   printfulProductId, typ, typName, titelEn, titelDe: null, titelDeStatus: 'platzhalter', marke, modell, bildUrl,
 *   klasse: 'FLACH'|'FLACH_MIT_HINWEIS'|'PANEL'|'UNGEEIGNET', klasseGrund, klasseGrundCode,   // endgültig (mit Lieferbarkeit)
 *   technischeKlasse, technischerGrund, technischerGrundCode,                                  // nur nach Druckgeometrie, ohne Lieferbarkeit
 *   panelAnzahl: number|null,
 *   techniken: [{ key, name, standard }], standardTechnik,
 *   platzierungen: [{                                    // nur Platzierungen MIT Druckdatei UND Vorlage (das, was ein Editor zeichnen kann)
 *     id,                      // Printful-Platzierung («front», «back», «sleeve_left», «embroidery_front_large» …)
 *     dateiTyp,                // Schlüssel für Aufträge (files[].id der Produktdaten, z. B. «default» für die Vorderseite), null wenn keiner
 *     titelEn, titelDe, titelDeStatus,                    // titelDe: kleine Übersetzungstabelle; unbekannte Teile → null + 'platzhalter'
 *     art: 'flaeche'|'etikett', technik (abgeleitet aus dem Platzierungsnamen, sonst Standardtechnik),
 *     printfile: { printfileId, breitePx, hoehePx, dpi, fillMode, kannDrehen, groesseCm: {breite,hoehe}|null },     // Standard = Druckdatei der meisten Varianten (bei Gleichstand die erste); groesseCm = Pixel/dpi, die Grösse der DATEI (bei Allover nicht die Grösse des Schnittteils, bei Strick null)
 *     vorlage:   { vorlageId, bildUrl, hintergrundUrl, hintergrundFarbe, vorlageBreite, vorlageHoehe, flaecheLinks, flaecheOben, flaecheBreite, flaecheHoehe, ausrichtung, vorderansicht },
 *     vorlageBeispielVarianteId,   // zu dieser Variante gehört das Vorlagenbild; in den VERDICHTETEN Katalogdateien (154 von 577 Produkten) ist bildUrl nur für die Beispielvariante je Gruppe bekannt, sonst null
 *     geometrien: [{ printfileId, vorlage, anzahlVarianten, beispielVarianteId }],   // ALLE verschiedenen Kombinationen (Poster: je Format eine)
 *     aufpreisUsd: number|null,                           // null = im Preis enthalten
 *     kollidiertMit: [Platzierung], kollidiertMitImEditor: [Platzierung]
 *   }],
 *   nichtImEditor: [{ dateiTyp, platzierung, titelEn, aufpreisUsd, grund }],   // Dateien der Produktdaten ohne Druckdatei/Vorlage (z. B. Stickerei-Platzierungen beim T-Shirt)
 *   druckdateien: { <printfileId>: { printfileId, breitePx, hoehePx, dpi, fillMode, kannDrehen, groesseCm } },
 *   druckdateiGruppen: [{ platzierungen: { <Platzierung>: printfileId }, anzahlVarianten }],   // verlustfrei aus dem Katalog: welche Variante welche Druckdatei braucht
 *   optionen: { farbe: [{ name, hex, hex2, bildUrl, anzahlVarianten, anzahlBestellbarEU }], groesse: [{ wert, anzeige, geaendert, markiert, anzahlVarianten }], weitere: [{ id, titel, typ, anzahlWerte }] },
 *   varianten: [{ printfulVariantId, farbe, farbeHex, farbeHex2, groesse, groesseAnzeige, groesseMarkiert, kostenUsd, lieferbarEU, lieferbarEUAufAnfrage, statusEU, druckdateiGruppe }],
 *   groessentabelle: { tabellen: [...] },               // Zoll → cm, lb → kg, US/UK/Japan unverändert und markiert (schweizer_masse.masstabelleSchweiz)
 *   produktMasse: [{ schluessel, schluesselAnzeige, roh, cm: [b,h]|null, anzeige }],
 *   beschreibung: { original, metrisch, aenderungen, abweichungen, markiert },    // Text ohne HTML; «metrisch» noch Englisch, nur die Einheiten sind Schweizer Mass
 *   lieferbarkeit: { varianten, euInStock, euAufAnfrage, euBestellbar, usInStock, nurUs, keinEu, regionen },
 *   kosten: { waehrung: 'USD', min, max, hinweis },
 *   hinweise: [{ code, art: 'einschraenkung'|'info', text, quelle: 'katalog'|'annahme' }]
 * }
 *
 * KLASSEN (Entscheid nach Struktur der Katalogdaten; was nur Annahme ist, steht als quelle:'annahme' in den Hinweisen):
 *   FLACH              eine oder mehrere unabhängige flache Druckflächen mit Druckdatei und Vorlage: Poster, Leinwand, Tasse, Hülle, T-Shirt (Vorne/Hinten/Ärmel)
 *   FLACH_MIT_HINWEIS  wie FLACH, aber die Technik oder die Form schränkt ein (Stickerei, Strick, Kappe, Tasche, Allover mit nur EINER Datei)
 *   PANEL              Teile, die vor dem Nähen bedruckt werden (CUT-SEW, DIRECT-TO-FABRIC) mit mindestens 2 Flächen (Etiketten zählen nicht), mehrseitige Drucksachen
 *                      (Kalender, Bücher: mindestens 3 Seiten), Sets (first/second/…) und Sublimations-Teile aus Beinen/Seiten: ein Einzelbild reicht nicht
 *   UNGEEIGNET         keine Druckdatei/Vorlage, Schuhe (3D-Leisten, Teile links/rechts), nur Etiketten, kein gestaltbares Produkt, ODER in der EU nicht bestellbar
 *                      (Printful beliefert die Schweiz nach Annahme aus der Region EU; keine einzige Variante «in_stock»/«stocked_on_demand» in der EU)
 */
import { kontextAusKatalog, groesseAnzeige, masstabelleSchweiz, umrechneText, anzeigeCmReihe, zollNachCm, parseZahl, schweizerZahl } from './schweizer_masse.mjs';

export const SCHEMA = 1;
export const KLASSEN = Object.freeze(['FLACH', 'FLACH_MIT_HINWEIS', 'PANEL', 'UNGEEIGNET']);

const zahl = (x) => { const n = Number(x); return Number.isFinite(n) ? n : null; };
const txt = (x) => (x === null || x === undefined ? '' : String(x));

// ── Deutsche Platzierungstitel (kleine Tabelle, kein Raten: ein unbekanntes Wort ergibt null + Platzhalter) ──
const VOLL = {
  default: 'Druckfläche', front: 'Vorderseite', back: 'Rückseite', front_large: 'Vorderseite gross', back_large: 'Rückseite gross',
  sleeve_left: 'Ärmel links', sleeve_right: 'Ärmel rechts', label_inside: 'Etikett innen', label_outside: 'Etikett aussen', label_panel: 'Etikettenteil',
  pocket: 'Tasche', hood: 'Kapuze', cover: 'Umschlag', background: 'Hintergrund', details: 'Details', sides: 'Seitenteile', top: 'Oberteil', bottom: 'Unterteil',
  belt: 'Bund', collar: 'Kragen', yoke: 'Passe', facing: 'Besatz', preview: 'Vorschau',
};
const TOKEN = {
  front: 'vorne', back: 'hinten', left: 'links', right: 'rechts', sleeve: 'Ärmel', chest: 'Brust', center: 'Mitte', large: 'gross', small: 'klein',
  label: 'Etikett', inside: 'innen', outside: 'aussen', pocket: 'Tasche', hood: 'Kapuze', top: 'oben', bottom: 'unten', leg: 'Bein', belt: 'Bund', side: 'Seite',
  shoe: 'Schuh', tongue: 'Zunge', quarters: 'Seitenteile', wrist: 'Handgelenk', hat: 'Hut', apparel: 'Kleidung', corner: 'Ecke', patch: 'Aufnäher', panel: 'Teil',
  embroidery: 'Stickerei', dtf: '(DTF)', dtfabric: '(Stoffdruck)', long: 'lang', short: 'kurz', lining: 'Futter', details: 'Details', yoke: 'Passe', sides: 'Seitenteile',
  outer: 'aussen', inner: 'innen', first: '1', second: '2', third: '3', fourth: '4', spread: 'Doppelseite', page: 'Seite', inside1: 'innen 1', inside2: 'innen 2', facing: 'Besatz',
  january: 'Januar', february: 'Februar', march: 'März', april: 'April', may: 'Mai', june: 'Juni', july: 'Juli', august: 'August', september: 'September', october: 'Oktober', november: 'November', december: 'Dezember',
  default: 'Druckfläche', mug: 'Tasse', wrap: 'Rundum',
};
const gross = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** Deutscher Titel einer Platzierung oder null (Platzhalter), wenn ein Wortteil nicht in der Tabelle steht. */
export function platzierungTitelDe(key) {
  if (VOLL[key]) return VOLL[key];
  const teile = txt(key).split('_').filter(Boolean);
  if (!teile.length) return null;
  const aus = [];
  for (let i = 0; i < teile.length; i++) {
    const t = teile[i];
    if (/^\d+$/.test(t)) { aus.push(t); continue; }
    if (i === 0 && t === 'front') { aus.push('Vorderseite'); continue; }
    if (i === 0 && t === 'back') { aus.push('Rückseite'); continue; }
    if (i === 0 && t === 'top') { aus.push('Oberteil'); continue; }
    if (i === 0 && t === 'bottom') { aus.push('Unterteil'); continue; }
    if (!(t in TOKEN)) return null;
    aus.push(TOKEN[t]);
  }
  return gross(aus.join(' ').replace(/\s+/g, ' ').trim());
}

const istEtikett = (key) => /(^|_)label(_|$)/.test(key);
function technikAusPlatzierung(key, standard) {
  if (/embroidery/.test(key)) return 'EMBROIDERY';
  if (/dtfabric/.test(key)) return 'DIRECT-TO-FABRIC';
  if (/(^|_)dtf(_|$)/.test(key)) return 'DTFILM';
  return standard ?? null;
}

// ── Druckdateien, Gruppen, Vorlagen ───────────────────────────────────────────────────────────────
function druckdateienRegister(katalog) {
  const reg = {};
  for (const f of katalog.printfiles?.printfiles ?? []) {
    const dpi = zahl(f.dpi);
    reg[f.printfile_id] = {
      printfileId: f.printfile_id, breitePx: zahl(f.width), hoehePx: zahl(f.height), dpi, fillMode: f.fill_mode ?? null, kannDrehen: Boolean(f.can_rotate),
      // Bei dpi < 10 (Strick: 1 Pixel = 1 Masche) ist px/dpi keine Länge
      groesseCm: dpi && dpi >= 10 ? { breite: Math.round((f.width / dpi) * 2.54 * 10) / 10, hoehe: Math.round((f.height / dpi) * 2.54 * 10) / 10 } : null,
    };
  }
  return reg;
}

function vorlageAusTemplate(t) {
  return {
    vorlageId: zahl(t.template_id), bildUrl: t.image_url ?? null, hintergrundUrl: t.background_url ?? null, hintergrundFarbe: t.background_color ?? null,
    vorlageBreite: zahl(t.template_width), vorlageHoehe: zahl(t.template_height), flaecheLinks: zahl(t.print_area_left), flaecheOben: zahl(t.print_area_top),
    flaecheBreite: zahl(t.print_area_width), flaecheHoehe: zahl(t.print_area_height), ausrichtung: t.orientation ?? null, vorderansicht: t.is_template_on_front ?? null,
  };
}

/** Platzierung → Liste verschiedener (Druckdatei, Vorlage)-Kombinationen mit Anzahl. */
function geometrienJePlatzierung(katalog) {
  const aus = new Map();
  const add = (pl, g) => { if (!aus.has(pl)) aus.set(pl, []); aus.get(pl).push(g); };
  const t = katalog.templates ?? {};
  if (Array.isArray(t.gruppen)) {
    for (const gr of t.gruppen) {
      const bsp = gr.beispiel?.template;
      for (const geo of gr.geometrien ?? []) {
        const istBeispiel = bsp && zahl(geo.beispiel_template_id) === zahl(bsp.template_id);
        const vorl = vorlageAusTemplate({
          template_id: geo.beispiel_template_id, image_url: istBeispiel ? bsp.image_url : null, background_url: istBeispiel ? bsp.background_url : null, background_color: istBeispiel ? bsp.background_color : null,
          template_width: geo.template_width, template_height: geo.template_height, print_area_width: geo.print_area_width, print_area_height: geo.print_area_height,
          print_area_top: geo.print_area_top, print_area_left: geo.print_area_left, orientation: gr.orientation, is_template_on_front: gr.is_template_on_front,
        });
        add(gr.placement, { printfileId: zahl(geo.printfile_id), vorlage: vorl, anzahlVarianten: zahl(geo.anzahl_zuordnungen) ?? 0, beispielVarianteId: zahl(geo.beispiel_variant_id) });
      }
    }
    return aus;
  }
  const vorlagen = new Map((t.templates ?? []).map((x) => [x.template_id, x]));
  const sig = (x) => [x.printfile_id, x.template_width, x.template_height, x.print_area_width, x.print_area_height, x.print_area_top, x.print_area_left, x.orientation, x.is_template_on_front].join('|');
  const bucket = new Map();
  for (const m of t.variant_mapping ?? []) {
    for (const z of m.templates ?? []) {
      const vl = vorlagen.get(z.template_id);
      if (!vl) continue;
      const key = `${z.placement}#${sig(vl)}`;
      if (!bucket.has(key)) bucket.set(key, { placement: z.placement, vl, n: 0, bsp: m.variant_id });
      bucket.get(key).n++;
    }
  }
  for (const b of bucket.values()) add(b.placement, { printfileId: zahl(b.vl.printfile_id), vorlage: vorlageAusTemplate(b.vl), anzahlVarianten: b.n, beispielVarianteId: zahl(b.bsp) });
  return aus;
}

function waehleStandard(geos, standardPf) {
  let kand = geos.filter((g) => g.printfileId === standardPf);
  if (!kand.length) kand = geos;
  return [...kand].sort((a, b) => (b.anzahlVarianten - a.anzahlVarianten) || ((b.vorlage.vorderansicht === true) - (a.vorlage.vorderansicht === true)) || ((b.vorlage.bildUrl ? 1 : 0) - (a.vorlage.bildUrl ? 1 : 0)))[0];
}

// ── Varianten und Lieferbarkeit ──────────────────────────────────────────────────────────────────
function statusEU(v) {
  const s = v.status && typeof v.status === 'object' ? v.status : null;
  if (s && s.EU !== undefined) return s.EU;
  return null; // Region EU nicht gelistet
}
const statusUS = (v) => (v.status && typeof v.status === 'object' ? v.status.US ?? null : null);

// ── Beschreibung ─────────────────────────────────────────────────────────────────────────────────
function htmlZuText(h) {
  return txt(h).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|h\d)>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, '’').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Karte ────────────────────────────────────────────────────────────────────────────────────────
export function modellkarteBauen(katalog) {
  if (!katalog || typeof katalog !== 'object' || !katalog.produkt) throw new Error('modellkarteBauen: keine Katalogdatei (Feld «produkt» fehlt)');
  const p = katalog.produkt;
  const kontext = kontextAusKatalog(katalog);
  const techniken = (p.techniques ?? []).map((t) => ({ key: t.key, name: t.display_name ?? null, standard: Boolean(t.is_default) }));
  const standardTechnik = (techniken.find((t) => t.standard) ?? techniken[0] ?? {}).key ?? null;

  const reg = druckdateienRegister(katalog);
  const vpg = katalog.printfiles?.variant_printfiles_gruppen ?? [];
  const gruppen = vpg.map((g) => ({ platzierungen: { ...g.placements }, anzahlVarianten: (g.varianten ?? []).length }));
  const gruppeJeVariante = new Map();
  vpg.forEach((g, i) => (g.varianten ?? []).forEach((id) => gruppeJeVariante.set(id, i)));

  // Varianten
  const varianten = (katalog.varianten ?? []).map((v) => {
    const eu = statusEU(v);
    const gz = groesseAnzeige(v.size, kontext);
    return {
      printfulVariantId: v.id, farbe: v.color ?? null, farbeHex: v.color_code ?? null, farbeHex2: v.color_code2 ?? null,
      groesse: v.size ?? null, groesseAnzeige: gz.anzeige, groesseMarkiert: gz.markiert, kostenUsd: zahl(v.price),
      lieferbarEU: eu === 'in_stock', lieferbarEUAufAnfrage: eu === 'stocked_on_demand', statusEU: eu,
      druckdateiGruppe: gruppeJeVariante.has(v.id) ? gruppeJeVariante.get(v.id) : null,
      _bild: v.image ?? null, _us: statusUS(v),
    };
  });

  // Optionen
  const farben = new Map();
  const groessen = new Map();
  for (const v of varianten) {
    const fk = `${v.farbe}|${v.farbeHex}|${v.farbeHex2}`;
    if (!farben.has(fk)) farben.set(fk, { name: v.farbe, hex: v.farbeHex, hex2: v.farbeHex2, bildUrl: v._bild, anzahlVarianten: 0, anzahlBestellbarEU: 0 });
    const f = farben.get(fk); f.anzahlVarianten++; if (v.lieferbarEU || v.lieferbarEUAufAnfrage) f.anzahlBestellbarEU++;
    const gk = String(v.groesse);
    if (!groessen.has(gk)) { const gz = groesseAnzeige(v.groesse, kontext); groessen.set(gk, { wert: v.groesse, anzeige: gz.anzeige, geaendert: gz.geaendert, markiert: gz.markiert, anzahlVarianten: 0 }); }
    groessen.get(gk).anzahlVarianten++;
  }
  const kanon = (katalog.sizes?.available_sizes ?? []).map((x) => String(x));
  const groesseListe = [...groessen.values()].sort((a, b) => {
    const ia = kanon.indexOf(String(a.wert)); const ib = kanon.indexOf(String(b.wert));
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return 0; // stabil: Reihenfolge des ersten Auftretens
  });
  const weitere = (p.options ?? []).map((o) => ({ id: o.id, titel: o.title ?? null, typ: o.type ?? null, anzahlWerte: o.values && typeof o.values === 'object' ? Object.keys(o.values).length : 0 }));

  // Platzierungen
  const alleGeos = geometrienJePlatzierung(katalog);
  const verfuegbar = katalog.printfiles?.available_placements ?? {};
  const keysMitDruckdatei = [];
  for (const g of vpg) for (const k of Object.keys(g.placements ?? {})) if (!keysMitDruckdatei.includes(k)) keysMitDruckdatei.push(k);
  for (const k of Object.keys(verfuegbar)) if (!keysMitDruckdatei.includes(k) && alleGeos.has(k)) keysMitDruckdatei.push(k);
  const dateien = p.files ?? [];
  const dateiJeTyp = new Map();
  for (const d of dateien) if (!dateiJeTyp.has(d.type)) dateiJeTyp.set(d.type, d);
  const konflikte = new Map((katalog.templates?.conflicting_placements ?? []).map((c) => [c.placement, c.conflicts ?? []]));

  const platzierungen = [];
  const keinTemplate = [];
  for (const key of keysMitDruckdatei) {
    const geos = alleGeos.get(key) ?? [];
    if (!geos.length) { keinTemplate.push(key); continue; }
    const zaehler = new Map();
    for (const g of vpg) { const id = g.placements?.[key]; if (id !== undefined) zaehler.set(id, (zaehler.get(id) ?? 0) + (g.varianten ?? []).length); }
    let standardPf = null;
    for (const [id, n] of zaehler) if (standardPf === null || n > zaehler.get(standardPf)) standardPf = id;
    const std = waehleStandard(geos, standardPf);
    const pfId = standardPf ?? std.printfileId;
    const pf = reg[pfId];
    if (!pf) { keinTemplate.push(key); continue; }
    const datei = dateiJeTyp.get(key) ?? null;
    const aufpreis = datei && datei.additional_price !== null && datei.additional_price !== undefined ? zahl(datei.additional_price) : null;
    const titelDe = platzierungTitelDe(key);
    const konf = konflikte.get(key) ?? [];
    platzierungen.push({
      id: key, dateiTyp: datei ? datei.id : null, titelEn: verfuegbar[key] ?? datei?.title ?? null, titelDe, titelDeStatus: titelDe ? 'tabelle' : 'platzhalter',
      art: istEtikett(key) ? 'etikett' : 'flaeche', technik: technikAusPlatzierung(key, standardTechnik),
      printfile: { ...pf }, vorlage: { ...std.vorlage }, vorlageBeispielVarianteId: std.beispielVarianteId ?? null,
      geometrien: geos.map((g) => ({ printfileId: g.printfileId, vorlage: { ...g.vorlage }, anzahlVarianten: g.anzahlVarianten, beispielVarianteId: g.beispielVarianteId })),
      aufpreisUsd: aufpreis, kollidiertMit: [...konf], kollidiertMitImEditor: konf.filter((x) => keysMitDruckdatei.includes(x)),
    });
  }
  const editorKeys = new Set(platzierungen.map((x) => x.id));
  const nichtImEditor = [];
  for (const d of dateien) {
    if (d.type === 'mockup') continue;
    if (editorKeys.has(d.type)) continue;
    nichtImEditor.push({
      dateiTyp: d.id, platzierung: d.type, titelEn: d.title ?? null, aufpreisUsd: d.additional_price !== null && d.additional_price !== undefined ? zahl(d.additional_price) : null,
      grund: keinTemplate.includes(d.type) ? 'Druckdatei, aber keine Vorlage im Katalog' : 'keine Druckdatei/Vorlage im Katalog',
    });
  }

  // Lieferbarkeit
  const euInStock = varianten.filter((v) => v.lieferbarEU).length;
  const euAufAnfrage = varianten.filter((v) => v.lieferbarEUAufAnfrage).length;
  const euBestellbar = euInStock + euAufAnfrage;
  const usInStock = varianten.filter((v) => v._us === 'in_stock').length;
  const regionen = [...new Set((katalog.varianten ?? []).flatMap((v) => (Array.isArray(v.regionen) ? v.regionen : Object.keys(v.status ?? {}))))].sort();
  const lieferbarkeit = { varianten: varianten.length, euInStock, euAufAnfrage, euBestellbar, usInStock, nurUs: euBestellbar === 0 && usInStock > 0, keinEu: euBestellbar === 0, regionen };

  // Kosten
  const preise = varianten.map((v) => v.kostenUsd).filter((x) => x !== null);
  const kosten = { waehrung: 'USD', min: preise.length ? Math.min(...preise) : null, max: preise.length ? Math.max(...preise) : null, hinweis: 'Katalogpreis je Variante; die Rechnung für CH weicht je Produkt um −24 % bis +26 % ab (Median 1.01), siehe preisformel.mjs' };

  // Masse in Schweizer Einheiten
  const produktMasse = [];
  if (p.dimensions && typeof p.dimensions === 'object') {
    for (const [k, v] of Object.entries(p.dimensions)) {
      const m = txt(v).match(/^\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*$/i);
      const cm = m ? [zollNachCm(Number(m[1])), zollNachCm(Number(m[2]))].map((x) => Math.round(x * 10) / 10) : null;
      produktMasse.push({ schluessel: k, schluesselAnzeige: groesseAnzeige(k, kontext).anzeige, roh: v, cm, anzeige: cm ? anzeigeCmReihe(cm) : null });
    }
  }
  const beschr = htmlZuText(p.description);
  const bu = umrechneText(beschr, { ozArt: kontext.ozArt });
  const beschreibung = { original: beschr, metrisch: bu.text, aenderungen: bu.aenderungen.length, abweichungen: bu.abweichungen, markiert: bu.markiert };

  const karte = {
    schema: SCHEMA, erzeugtAus: { katalogGeholt: katalog.geholt ?? null, quelle: 'Printful-Katalog-API (katalog_holen.mjs)' },
    printfulProductId: p.id ?? katalog.id, typ: p.type ?? null, typName: p.type_name ?? null, titelEn: p.title ?? null, titelDe: null, titelDeStatus: 'platzhalter',
    marke: p.brand ?? null, modell: p.model ?? null, bildUrl: p.image ?? null,
    klasse: null, klasseGrund: null, klasseGrundCode: null, technischeKlasse: null, technischerGrund: null, technischerGrundCode: null, panelAnzahl: null,
    techniken, standardTechnik,
    platzierungen, nichtImEditor, druckdateien: reg, druckdateiGruppen: gruppen,
    optionen: { farbe: [...farben.values()], groesse: groesseListe, weitere },
    varianten: varianten.map(({ _bild, _us, ...rest }) => rest),
    groessentabelle: masstabelleSchweiz(katalog.sizes, kontext), produktMasse, beschreibung, lieferbarkeit, kosten,
    hinweise: [],
    _intern: { keinTemplate, minDpi: zahl(katalog.templates?.min_dpi), hatTemplates: platzierungen.length > 0, hatDruckdateien: Object.keys(reg).length > 0 && vpg.length > 0, produktOptionen: p.options ?? [], dateien },
  };
  const k = klassifizieren(karte);
  Object.assign(karte, k.felder);
  karte.hinweise = k.hinweise;
  delete karte._intern;
  return karte;
}

// ── Klassifizierung ──────────────────────────────────────────────────────────────────────────────
const KAPPE_RE = /\b(cap|caps|hat|hats|beanie|bucket|visor|snapback|trucker)\b/i;
const TASCHE_RE = /\b(bag|bags|tote|backpack|pouch|sling|fanny|duffle|sack|suitcase|satchel|crossbody)\b/i;
const SET_RE = /^(first|second|third|fourth|fifth)$/;
const SEITEN_RE = /^(cover|outside_cover|inside_cover|inside\d|page_?\d+.*|spread_\d+|january|february|march|april|may|june|july|august|september|october|november|december)$/;
const SCHUH_RE = /^shoe_/;

const rundenUsd = (x) => Number(x).toFixed(2);

/**
 * Klasse und Hinweise einer Karte. Eingang: eine Karte (auch eine synthetische mit denselben Feldern). Kein Zugriff auf Dateien.
 * Gibt { felder, hinweise } zurück; `felder` enthält klasse, klasseGrund, klasseGrundCode, technischeKlasse, technischerGrund, technischerGrundCode, panelAnzahl.
 */
export function klassifizieren(karte) {
  const intern = karte._intern ?? {};
  const pl = karte.platzierungen ?? [];
  const flaechen = pl.filter((x) => x.art === 'flaeche');
  const etiketten = pl.filter((x) => x.art === 'etikett');
  const std = karte.standardTechnik;
  const titel = txt(karte.titelEn);
  const hinweise = [];
  const info = (code, text, quelle = 'katalog') => hinweise.push({ code, art: 'info', text, quelle });
  const grenze = (code, text, quelle = 'katalog') => hinweise.push({ code, art: 'einschraenkung', text, quelle });
  const lf = karte.lieferbarkeit ?? { keinEu: false };
  const hatTemplates = intern.hatTemplates ?? pl.length > 0;
  const hatDruckdateien = intern.hatDruckdateien ?? pl.length > 0;

  // Hinweise, die unabhängig von der Klasse gelten
  const aufpreise = pl.filter((x) => (x.aufpreisUsd ?? 0) > 0);
  if (aufpreise.length) info('aufpreis', `Aufpreis je Platzierung laut Katalog (USD, 1:1 an Printful): ${aufpreise.map((x) => `${x.titelDe ?? x.titelEn ?? x.id} ${rundenUsd(x.aufpreisUsd)}`).join(', ')}.`);
  const stickNichtImEditor = (karte.nichtImEditor ?? []).filter((x) => /embroidery/.test(x.platzierung));
  if (stickNichtImEditor.length) info('stickerei_nicht_im_editor', `${stickNichtImEditor.length} Stickerei-Platzierung(en) ohne Druckdatei/Vorlage im Katalog (${stickNichtImEditor.map((x) => x.platzierung).join(', ')}): im Editor nicht zeichenbar.`);
  const ohneStandard = (karte.nichtImEditor ?? []).filter((x) => x.dateiTyp === 'default');
  if (ohneStandard.length) info('standardflaeche_ohne_druckdatei', `Die Standardfläche «${ohneStandard[0].platzierung}» hat im Katalog keine Druckdatei/Vorlage.`);
  if ((karte.druckdateiGruppen ?? []).length > 1) info('druckdatei_je_variante', `Die Druckdatei hängt von der Variante ab (${karte.druckdateiGruppen.length} Gruppen): der Editor muss die Fläche je Variante nehmen (variante.druckdateiGruppe).`);
  const rund = flaechen.find((x) => (karte.typ === 'MUG' || karte.typ === 'DRINKWARE') && x.printfile.breitePx / x.printfile.hoehePx >= 2.2);
  if (rund) info('rundumdruck', `Die Druckdatei (${rund.printfile.breitePx}×${rund.printfile.hoehePx} px) umschliesst das Gefäss; der Bereich am Henkel/Rand ist nach Erfahrung frei zu halten (nicht gemessen).`, 'annahme');
  if (lf.euBestellbar > 0 && lf.euBestellbar < lf.varianten) info('eu_teilweise', `Nur ${lf.euBestellbar} von ${lf.varianten} Varianten sind in der Region EU bestellbar; Variante.lieferbarEU/lieferbarEUAufAnfrage beachten.`);
  if (lf.euAufAnfrage > 0) info('eu_auf_anfrage', `${lf.euAufAnfrage} Variante(n) in der EU nur «stocked_on_demand» (Lieferung auf Anfrage, nicht ab Lager).`);
  if (intern.minDpi !== null && intern.minDpi !== undefined && intern.minDpi < 72 && std !== 'KNITWEAR') info('niedrige_aufloesung', `Der Katalog nennt eine Mindestauflösung von ${intern.minDpi} dpi.`);
  if (lf.keinEu) info(lf.nurUs ? 'nur_us' : 'nicht_in_eu', lf.nurUs ? `Keine Variante in der EU bestellbar, aber ${lf.usInStock} in den USA («in_stock»): für den Schweizer Shop nicht sinnvoll.` : 'Keine Variante in der EU bestellbar (nur andere Regionen oder nichts auf Lager).');

  // Einschränkungen (machen aus FLACH ein FLACH_MIT_HINWEIS)
  const opt = intern.produktOptionen ?? [];
  const stickerei = std === 'EMBROIDERY' || (flaechen.length > 0 && flaechen.every((x) => x.technik === 'EMBROIDERY'));
  if (stickerei) {
    const garn = Math.max(0, ...opt.filter((o) => /^thread_colors/.test(o.id)).map((o) => (o.values && typeof o.values === 'object' ? Object.keys(o.values).length : 0)));
    const unbegrenzt = (intern.dateien ?? []).filter((d) => (d.options ?? []).some((o) => o.id === 'full_color')).map((d) => d.type);
    grenze('stickerei', `Stickerei: das Motiv wird in Garnfarben umgesetzt${garn ? ` (Katalog: ${garn} Garnfarben zur Auswahl${unbegrenzt.length ? `, Option «Unlimited color» nur bei ${unbegrenzt.join(', ')}` : ''})` : ''}; Fotos, Verläufe und feine Linien lassen sich nicht sticken (Erfahrungswert, nicht gemessen). Die Digitalisierung kostet je Motiv einmalig 6.50 USD (gemessen an einer Schätzung für die Dad-Cap, siehe messung_0511.json).`, garn ? 'katalog' : 'annahme');
  }
  if (std === 'KNITWEAR') {
    const garn = Math.max(0, ...opt.filter((o) => o.id === 'yarn_colors').map((o) => (o.values && typeof o.values === 'object' ? Object.keys(o.values).length : 0)));
    const eins = flaechen[0]?.printfile;
    grenze('gestrickt', `Gestrickt: die Druckdatei ist ein Maschenraster (${eins ? `${eins.breitePx}×${eins.hoehePx}` : '?'} Pixel bei ${eins?.dpi ?? '?'} dpi, 1 Pixel = 1 Masche)${garn ? ` mit ${garn} Garnfarben` : ''}; feine Details und Fotos gehen verloren.`);
  }
  const cutSewArt = std === 'CUT-SEW' || std === 'DIRECT-TO-FABRIC';
  if (cutSewArt && flaechen.length === 1) grenze('allover_einzeldatei', 'Allover-Teil mit nur EINER Druckdatei: das Motiv läuft über das ganze Teil und über die Nähte (Annahme: die Vorlage zeigt die Lage der Schnittteile).', 'annahme');
  if (KAPPE_RE.test(titel)) grenze('kappe', 'Kappe/Mütze: kleine, gewölbte Fläche; Motiv klein und ohne feine Details halten (Erfahrungswert, nicht gemessen).', 'annahme');
  if (TASCHE_RE.test(titel)) grenze('tasche', 'Tasche: die Druckfläche endet vor Nähten und Henkeln; Motiv nicht an den Rand setzen (Erfahrungswert, nicht gemessen).', 'annahme');

  // ── Technische Klasse (nur Druckgeometrie)
  let technisch; let tGrund; let tCode; let panelAnzahl = null;
  const keys = flaechen.map((x) => x.id);
  if (!hatDruckdateien || !hatTemplates || pl.length === 0) { technisch = 'UNGEEIGNET'; tCode = 'kein_template_oder_druckdatei'; tGrund = `Kein Druckdatei-/Vorlagenpaar im Katalog (Druckdateien: ${hatDruckdateien ? 'ja' : 'nein'}, Vorlagen: ${hatTemplates ? 'ja' : 'nein'}).`; }
  else if (karte.typ === 'SHOES' || keys.some((x) => SCHUH_RE.test(x)) || etiketten.some((x) => SCHUH_RE.test(x.id))) {
    technisch = 'UNGEEIGNET'; tCode = 'schuh_3d_leisten';
    tGrund = `Schuh: Schnittteile links/rechts (${keys.join(', ')}) werden vor dem Leisten bedruckt, ein flaches Vorlagenbild zeigt nicht, wie das Motiv am fertigen Schuh sitzt (Entscheid, nicht gemessen).`;
  } else if (/\b(gift ?card|voucher|gutschein|sample|swatch)\b/i.test(titel)) { technisch = 'UNGEEIGNET'; tCode = 'kein_gestaltbares_produkt'; tGrund = 'Kein bedruckbares Produkt (Gutschein/Muster).'; }
  else if (flaechen.length === 0) { technisch = 'UNGEEIGNET'; tCode = 'nur_etiketten'; tGrund = `Nur Etiketten-Platzierungen (${etiketten.map((x) => x.id).join(', ')}), keine Gestaltungsfläche.`; }
  else if (cutSewArt && flaechen.length >= 2) { technisch = 'PANEL'; tCode = 'schnittteile'; panelAnzahl = flaechen.length; tGrund = `${std}: ${flaechen.length} Schnittteile (${keys.join(', ')}) werden vor dem Nähen bedruckt; ein Einzelbild reicht nicht, jedes Teil braucht seine Datei (nicht belegte Teile bleiben nach Annahme unbedruckt).${etiketten.length ? ` Dazu ${etiketten.length} Etikett(en).` : ''}`; }
  else if (karte.typ === 'POSTCARD' && flaechen.filter((x) => SEITEN_RE.test(x.id)).length >= 3) { technisch = 'PANEL'; tCode = 'mehrseitig'; panelAnzahl = flaechen.length; tGrund = `Mehrseitige Drucksache mit ${flaechen.length} Seiten/Flächen (${keys.slice(0, 4).join(', ')} …): jede Seite braucht eine eigene Datei.`; }
  else if (keys.filter((x) => SET_RE.test(x)).length >= 2) { technisch = 'PANEL'; tCode = 'set'; panelAnzahl = flaechen.length; tGrund = `Set aus mehreren Teilen (${keys.join(', ')}): je Teil eine Datei.`; }
  else if (std === 'SUBLIMATION' && keys.filter((x) => /^(leg_|side_)/.test(x)).length >= 2) { technisch = 'PANEL'; tCode = 'segmentiert'; panelAnzahl = flaechen.length; tGrund = `Sublimation in Einzelteilen (${keys.join(', ')}): ein Einzelbild reicht nicht.`; }
  else {
    const grenzen = hinweise.filter((h) => h.art === 'einschraenkung');
    if (grenzen.length) {
      technisch = 'FLACH_MIT_HINWEIS'; tCode = grenzen.map((h) => h.code).join('+');
      tGrund = `${flaechen.length} flache Fläche(n) mit Druckdatei und Vorlage, aber eingeschränkt: ${grenzen.map((h) => h.code).join(', ')} (Technik ${std ?? 'unbekannt'}).`;
    } else {
      technisch = 'FLACH'; tCode = 'flach';
      const e = flaechen[0].printfile;
      tGrund = `${flaechen.length} unabhängige flache Fläche(n) (${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ' …' : ''}) mit Druckdatei und Vorlage, Technik ${std ?? 'unbekannt'}; Standard-Druckdatei ${e.breitePx}×${e.hoehePx} px bei ${e.dpi} dpi.`;
    }
  }

  // ── Endgültige Klasse: Lieferbarkeit entscheidet über UNGEEIGNET
  let klasse = technisch; let grund = tGrund; let code = tCode;
  if (lf.keinEu) {
    const lieferGrund = lf.nurUs ? `Keine Variante in der EU bestellbar, ${lf.usInStock} von ${lf.varianten} nur in den USA lieferbar.` : 'Keine Variante in der EU bestellbar (nur andere Regionen oder nichts auf Lager).';
    klasse = 'UNGEEIGNET'; code = technisch === 'UNGEEIGNET' ? `${tCode}+${lf.nurUs ? 'nur_us' : 'nicht_in_eu'}` : (lf.nurUs ? 'nur_us' : 'nicht_in_eu');
    grund = technisch === 'UNGEEIGNET' ? `${lieferGrund} Dazu: ${tGrund}` : `${lieferGrund} Technisch wäre es ${technisch}.`;
  }
  return { felder: { klasse, klasseGrund: grund, klasseGrundCode: code, technischeKlasse: technisch, technischerGrund: tGrund, technischerGrundCode: tCode, panelAnzahl }, hinweise };
}

/** Kurzeintrag für unterstuetzung.json (je Produkt). */
export function unterstuetzungEintrag(karte) {
  const pl = karte.platzierungen ?? [];
  const lf = karte.lieferbarkeit;
  return {
    id: karte.printfulProductId, titel: karte.titelEn, typ: karte.typ, klasse: karte.klasse, grund: karte.klasseGrund, grundCode: karte.klasseGrundCode,
    technischeKlasse: karte.technischeKlasse, technischerGrund: karte.technischerGrund, technischerGrundCode: karte.technischerGrundCode,
    anzahlPlatzierungen: pl.length, anzahlFlaechen: pl.filter((x) => x.art === 'flaeche').length, anzahlEtiketten: pl.filter((x) => x.art === 'etikett').length,
    panelAnzahl: karte.panelAnzahl, hatTemplates: pl.length > 0, hatDruckdateien: Object.keys(karte.druckdateien ?? {}).length > 0 && (karte.druckdateiGruppen ?? []).length > 0,
    nurUs: lf.nurUs, keinEu: lf.keinEu, euVarianten: { gesamt: lf.varianten, inStock: lf.euInStock, aufAnfrage: lf.euAufAnfrage, usInStock: lf.usInStock },
    standardTechnik: karte.standardTechnik, hinweisCodes: (karte.hinweise ?? []).map((h) => `${h.art === 'einschraenkung' ? '!' : ''}${h.code}`),
  };
}
