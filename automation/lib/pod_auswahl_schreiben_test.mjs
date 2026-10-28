// Tests für den SCHREIBWEG der «Selbst gestalten»-Auswahl gegen einen Shopify-ATTRAPPE im Speicher (es wird nie ein echter Dienst berührt).
// Lauf: /opt/node22/bin/node automation/lib/pod_auswahl_schreiben_test.mjs
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planeAlles, pfIdAusSku, PLATZHALTER_VARIANTE, PLATZHALTER_BILD } from './pod_auswahl_plan.mjs';
import { ladePaket, ohneKnoten, BESTAND_Q } from './pod_auswahl_daten.mjs';
import { lauf, pruefeAntwort, TageslimitFehler, variantenEingabe, vergleiche, leseFrisch, nurText, sicherungsName, produktSetEingabe, ledgerLesen, CHUNK, endeCode, EXIT_TEXT, zusammenfassung, bestaetigt,
  beschreibungSeitPlanVeraendert, pruefeVorhandenesProdukt, Q_PRODUKT, M_REORDER, M_OPTION_WERTE_LOESCHEN, M_OPTION, M_OPTION_WERTE, M_VARIANTEN,
  AbweichungFehler, LESEGRENZE_VARIANTEN, leereWerte as leereWerteLib, leereWerteEntfernen, materialStand, zustandsText, stelleReihenfolgeHer } from './pod_auswahl_schreiben.mjs';
import { DATEN_MAX_ALTER_H } from './pod_auswahl_daten.mjs';
import { MARKE_AUF } from './pod_auswahl_spec.mjs';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 500)}\n   soll: ${JSON.stringify(b).slice(0, 500)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);
const klon = (x) => JSON.parse(JSON.stringify(x));

const paket = ladePaket();
const planVon = (nur = null, bestand = paket.bestand, extra = {}) => planeAlles({ katalog: paket.katalog, beschreibungen: paket.beschreibungen, versand: paket.versand, bestand, skuPruefung: paket.skuPruefung, skuIndex: paket.skuIndex, skuIndexAbgeschnitten: paket.skuIndexAbgeschnitten, nur, ...extra });
/** «<handle>:<code>» für jeden Blocker-Befund des Plans (so, als hätte der Besitzer alles bestätigt). */
const alleBestaetigt = (plan) => plan.produkte.flatMap((p) => [...new Set(p.befunde.filter((b) => b.schwere === 'blocker').map((b) => b.code))].map((c) => `${p.handle}:${c}`));
const HANDLES = { poster: 'poster-zum-selbstgestalten', hoodie: 'unisex-hoodie-selbst-gestalten', shirt: 'unisex-t-shirt-selbst-gestalten', iphone: 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten', samsung: 'samsung-huelle-selbst-gestalten' };

// ───────────────────────────────────────────────────────── Shopify-Attrappe (so streng wie nötig: neue Optionswerte müssen vorher angelegt sein)
// WIRKLICHKEITSNAH (Runde 4, Schema + Doku productOptionUpdate): Der Zustand je Option speichert in `values` ALLE Werte (wie Shopifys optionValues, auch ohne Variante). Die ANTWORT leitet daraus ab:
//   ProductOption.values       nur Werte mit mindestens EINER Variante (Werte ohne Variante fehlen dort)
//   ProductOption.optionValues ALLE Werte, jeder mit id und hasVariants (true, sobald eine Variante den Wert trägt, auch durch productVariantsBulkCreate)
// Es kommen nur die Felder, die die Abfrage verlangt (Auswahl der Abfrage wird ausgewertet): fragt ein Lesepfad nur `values`, fehlen optionValues und der Lauf scheitert laut.
// productOptionUpdate mit einem schon vorhandenen Namen antwortet wie Shopify mit OPTION_VALUE_ALREADY_EXISTS, das Löschen eines Werts mit Varianten mit OPTION_VALUE_HAS_VARIANTS (Codes aus ProductOptionUpdateUserErrorCode).
// Strenger als Shopify: productVariantsBulkCreate legt in Wirklichkeit einen fehlenden Optionswert selbst an (Doku); die Attrappe verlangt ihn vorher (so bleibt jeder Pfad sichtbar, auf dem ein Wert ohne Variante entstehen kann).
// Optionen der Attrappe (alle optional):
//   alleFehlschlagen, fehlerFuerHandle, tageslimitAb (ganzer Aufruf scheitert, wenn er das Limit überschritte), verschluckeSku, preisAendern, beschreibungVerfaelschen
//   positionIgnorieren   productOptionsCreate ignoriert `position` und hängt die Option hinten an (die Doku verspricht nur «Position of the option»)
//   reorderIgnoriert     productOptionsReorder meldet Erfolg, ändert aber nichts
//   beiErsterVariantenanlage(p)   Hook im ersten productVariantsBulkCreate (ein anderer Prozess ändert gerade etwas)
//   wertLoeschenFehler   productOptionUpdate mit optionValuesToDelete scheitert (Aufräumen nicht möglich)
//   verliereAntwortNach {name, nr}   die nr-te Mutation `name` wird AUSGEFÜHRT, die Antwort geht aber verloren (Netzfehler: gql wirft)
//   lesenScheitertNach <name>        nach der ersten Mutation `name` scheitert die NÄCHSTE Abfrage einmal (Zurücklesen)
//   variantenFehlerBei <k>           der k-te productVariantsBulkCreate-Aufruf (zählt über alle Produkte) scheitert mit einem gewöhnlichen Fehler (kein Tageslimit), nichts wird angelegt
//   lesenTotNach {name, nr}          nach der nr-ten Mutation `name` scheitert JEDE weitere Abfrage (Netz dauerhaft tot beim Lesen)
//   shop.lies(handle, query)         die Antwort auf eine Abfrage, wie der Schreibweg sie bekäme (auch BESTAND_Q); shop.antwortVon(handle) für Tests der Attrappe selbst
/** Auswahl `feld{ … }` einer Abfrage als Baum {name: true | Unterbaum}; null, wenn die Abfrage das Feld nicht verlangt. */
function auswahlVon(query, feld) {
  const i = query.indexOf(feld + '{'); if (i < 0) return null;
  const tok = query.slice(i + feld.length).match(/[A-Za-z_]\w*|[{}]/g); let k = 0;
  const lies = () => { k++; const t = {}; while (tok[k] !== '}') { const n = tok[k++]; t[n] = tok[k] === '{' ? lies() : true; } k++; return t; };
  return lies();
}
/** Nur die verlangten Felder (Antwort-Projektion wie bei GraphQL). */
const waehle = (sel, o) => (Array.isArray(o) ? o.map((x) => waehle(sel, x)) : Object.fromEntries(Object.entries(sel).map(([k, t]) => [k, t === true ? o[k] : waehle(t, o[k])])));
function neuerShop(bestand, o = {}) {
  const produkte = new Map(); let n = 5000; const aufrufe = []; let hookGelaufen = false; const zaehler = {}; let lesenKaputt = false, lesenGescheitert = false, lesenTot = false, variantenAufrufe = 0;
  for (const b of Object.values(bestand)) produkte.set(b.handle, {
    id: b.id, handle: b.handle, title: b.title, status: b.status, productType: b.productType, vendor: b.vendor, tags: [...b.tags], descriptionHtml: b.descriptionHtml, seo: b.seo, category: null,
    options: b.options.map((x, i) => ({ id: `gid://shopify/ProductOption/${b.handle.length}${i}`, name: x.name, position: x.position, values: [...x.values] })),
    variants: b.variants.map((v) => ({ id: v.id, sku: v.sku, price: v.price, inventoryPolicy: v.inventoryPolicy, selectedOptions: v.selectedOptions.map((s) => ({ ...s })), inventoryItem: { tracked: true, requiresShipping: true } })),
    media: [], metafields: [] });
  let angelegteVarianten = 0;
  const wertId = (p, x, v) => `gid://shopify/ProductOptionValue/${p.handle.length}-${x.name}-${v}`;   // eindeutig je Wert (für optionValuesToDelete)
  const traegt = (p, x, w) => p.variants.some((va) => va.selectedOptions.some((s) => s.name === x.name && s.value === w));   // hasVariants: trägt irgendeine Variante den Wert?
  /** Die Optionen so, wie Shopify sie antwortet: `values` nur mit Variante, `optionValues` alle mit hasVariants; nur die verlangten Felder (query), ohne query alle. */
  const optionenAntwort = (p, query) => {
    const voll = p.options.map((x) => ({ id: x.id, name: x.name, position: x.position, values: x.values.filter((w) => traegt(p, x, w)), optionValues: x.values.map((w) => ({ id: wertId(p, x, w), name: w, hasVariants: traegt(p, x, w) })) }));
    const sel = query ? auswahlVon(query, 'options') : null;
    return sel ? waehle(sel, voll) : voll;
  };
  const alsAntwort = (p, query) => ({ id: p.id, handle: p.handle, title: p.title, status: p.status, productType: p.productType, vendor: p.vendor, tags: p.tags, descriptionHtml: p.descriptionHtml, seo: p.seo, category: p.category && { id: p.category },
    options: optionenAntwort(p, query),
    variants: { edges: p.variants.map((v) => ({ node: v })) }, media: { edges: p.media.map((m) => ({ node: m })) }, metafields: { edges: p.metafields.map((m) => ({ node: m })) } });
  const nachId = (id) => [...produkte.values()].find((p) => p.id === id);
  const sortiere = (p) => { p.options.sort((a, b) => a.position - b.position); p.options.forEach((x, i) => { x.position = i + 1; }); for (const v of p.variants) v.selectedOptions.sort((a, b) => p.options.findIndex((x) => x.name === a.name) - p.options.findIndex((x) => x.name === b.name)); };
  async function gql(query, v) {
    const name = (query.match(/(productByIdentifier|productOptionsCreate|productOptionsReorder|productOptionUpdate|productVariantsBulkCreate|productUpdate|productSet|metafieldsSet)/) || [])[1];
    const antwort = await ausfuehren(query, v, name);
    if (name !== 'productByIdentifier') {
      zaehler[name] = (zaehler[name] || 0) + 1;
      if (o.verliereAntwortNach && o.verliereAntwortNach.name === name && o.verliereAntwortNach.nr === zaehler[name]) throw new Error('fetch failed (Antwort verloren)');
      if (o.lesenScheitertNach === name && !lesenGescheitert) lesenKaputt = true;
      if (o.lesenTotNach && o.lesenTotNach.name === name && o.lesenTotNach.nr === zaehler[name]) lesenTot = true;
    }
    return antwort;
  }
  async function ausfuehren(query, v, name) {
    aufrufe.push({ name, v });
    if (name === 'productByIdentifier' && lesenTot) return { errors: [{ message: 'Netz dauerhaft tot beim Lesen' }] };
    if (name === 'productByIdentifier' && lesenKaputt) { lesenKaputt = false; lesenGescheitert = true; return { errors: [{ message: 'Internal error beim Lesen' }] }; }
    if (name !== 'productByIdentifier' && o.alleFehlschlagen) return { errors: [{ message: 'Internal error' }] };
    if (name !== 'productByIdentifier' && o.fehlerFuerHandle && [v.pid, v.p?.id].includes(produkte.get(o.fehlerFuerHandle)?.id)) return { errors: [{ message: 'Internal error' }] };
    if (name === 'productByIdentifier') { const p = produkte.get(v.h); return { data: { productByIdentifier: p ? alsAntwort(p, query) : null } }; }
    if (name === 'productOptionsCreate') {
      const p = nachId(v.pid);
      for (const op of v.opts) {
        if (p.options.some((x) => x.name === op.name)) return { data: { productOptionsCreate: { userErrors: [{ code: 'OPTION_ALREADY_EXISTS', message: 'exists' }] } } };
        const pos = o.positionIgnorieren ? p.options.length + 1 : op.position;
        p.options.forEach((x) => { if (x.position >= pos) x.position++; });
        p.options.push({ id: 'gid://shopify/ProductOption/neu' + (n++), name: op.name, position: pos, values: [op.values[0].name] });
        for (const va of p.variants) va.selectedOptions.push({ name: op.name, value: op.values[0].name });   // LEAVE_AS_IS: alle vorhandenen bekommen den ersten Wert
      }
      p.options.sort((a, b) => a.position - b.position);   // die Positionen bleiben, wie die API sie vergibt (bei positionIgnorieren: hinten)
      for (const x of p.options) x.position = p.options.indexOf(x) + 1;
      for (const va of p.variants) va.selectedOptions.sort((a, b) => p.options.findIndex((x) => x.name === a.name) - p.options.findIndex((x) => x.name === b.name));
      return { data: { productOptionsCreate: { product: alsAntwort(p), userErrors: [] } } };
    }
    if (name === 'productOptionsReorder') {
      const p = nachId(v.pid);
      if (!o.reorderIgnoriert) {
        const namen = v.opts.map((x) => x.name);
        if (namen.length !== p.options.length || namen.some((x) => !p.options.some((q) => q.name === x))) return { data: { productOptionsReorder: { userErrors: [{ code: 'OPTIONS_MISMATCH', message: 'alle Optionen angeben' }] } } };
        p.options.forEach((x) => { x.position = namen.indexOf(x.name) + 1; });
        sortiere(p);
      }
      return { data: { productOptionsReorder: { product: alsAntwort(p), userErrors: [] } } };
    }
    if (name === 'productOptionUpdate') {
      const p = nachId(v.pid), op = p.options.find((x) => x.id === v.opt.id);
      if (v.del) {
        if (o.wertLoeschenFehler) return { data: { productOptionUpdate: { userErrors: [{ code: 'KAPUTT', message: 'Löschen nicht möglich' }] } } };
        for (const id of v.del) {
          const wert = op.values.find((w) => wertId(p, op, w) === id);
          if (!wert) return { data: { productOptionUpdate: { userErrors: [{ code: 'OPTION_VALUE_DOES_NOT_EXIST', message: id }] } } };
          if (traegt(p, op, wert)) return { data: { productOptionUpdate: { userErrors: [{ code: 'OPTION_VALUE_HAS_VARIANTS', message: 'Wert trägt Varianten: sie würden mitgelöscht' }] } } };
          op.values = op.values.filter((w) => w !== wert);
        }
        return { data: { productOptionUpdate: { product: alsAntwort(p), userErrors: [] } } };
      }
      for (const a of v.add) { if (op.values.includes(a.name)) return { data: { productOptionUpdate: { userErrors: [{ code: 'OPTION_VALUE_ALREADY_EXISTS', message: 'exists' }] } } }; op.values.push(a.name); }
      return { data: { productOptionUpdate: { product: alsAntwort(p), userErrors: [] } } };
    }
    if (name === 'productVariantsBulkCreate') {
      const p = nachId(v.pid);
      variantenAufrufe++;
      if (o.variantenFehlerBei === variantenAufrufe) return { errors: [{ message: 'Internal error' }] };
      if (o.beiErsterVariantenanlage && !hookGelaufen) { hookGelaufen = true; o.beiErsterVariantenanlage(p); }
      if (o.tageslimitAb !== undefined && angelegteVarianten + v.vs.length > o.tageslimitAb) return { data: { productVariantsBulkCreate: { productVariants: null, userErrors: [{ field: null, code: 'VARIANT_THROTTLE_EXCEEDED', message: 'Daily variant creation limit reached. Try again tomorrow.' }] } } };
      const erzeugt = [];
      for (const x of v.vs) {
        const sel = [];
        for (const ov of x.optionValues) {
          const op = p.options.find((q) => q.name === ov.optionName);
          if (!op || !op.values.includes(ov.name)) return { data: { productVariantsBulkCreate: { productVariants: null, userErrors: [{ code: 'OPTION_VALUE_DOES_NOT_EXIST', message: `${ov.optionName}=${ov.name}` }] } } };
          sel.push({ name: ov.optionName, value: ov.name });
        }
        if (p.variants.some((q) => q.sku === x.inventoryItem.sku)) return { data: { productVariantsBulkCreate: { productVariants: null, userErrors: [{ code: 'DUPLICATE', message: 'sku ' + x.inventoryItem.sku }] } } };
        if (o.verschluckeSku === x.inventoryItem.sku) { angelegteVarianten++; continue; }
        const nv = { id: 'gid://shopify/ProductVariant/' + (n++), sku: x.inventoryItem.sku, price: o.preisAendern?.[x.inventoryItem.sku] ?? x.price, inventoryPolicy: x.inventoryPolicy, selectedOptions: sel, inventoryItem: x.inventoryItem };
        p.variants.push(nv); erzeugt.push({ id: nv.id, sku: nv.sku }); angelegteVarianten++;
      }
      sortiere(p); return { data: { productVariantsBulkCreate: { productVariants: erzeugt, userErrors: [] } } };
    }
    if (name === 'productUpdate') { const p = nachId(v.p.id); p.descriptionHtml = o.beschreibungVerfaelschen ? v.p.descriptionHtml + '<p>fremd</p>' : v.p.descriptionHtml; return { data: { productUpdate: { product: { id: p.id }, userErrors: [] } } }; }
    if (name === 'productSet') {
      const i = v.input; const id = 'gid://shopify/Product/' + (n++);
      const p = { id, handle: i.handle, title: i.title, status: i.status, productType: i.productType, vendor: i.vendor, tags: [...i.tags], descriptionHtml: i.descriptionHtml, seo: i.seo, category: i.category,
        options: i.productOptions.map((x, k) => ({ id: 'gid://shopify/ProductOption/s' + (n++), name: x.name, position: x.position, values: x.values.map((y) => y.name) })),
        variants: [], media: i.files.map((f, k) => ({ id: 'm' + k, alt: f.alt, image: { url: f.originalSource } })), metafields: [] };
      for (const x of i.variants) {
        for (const ov of x.optionValues) if (!p.options.find((q) => q.name === ov.optionName)?.values.includes(ov.name)) return { data: { productSet: { product: null, userErrors: [{ message: 'Optionswert fehlt ' + ov.name }] } } };
        angelegteVarianten++; p.variants.push({ id: 'gid://shopify/ProductVariant/' + (n++), sku: x.sku, price: x.price, inventoryPolicy: x.inventoryPolicy, selectedOptions: x.optionValues.map((ov) => ({ name: ov.optionName, value: ov.name })), inventoryItem: x.inventoryItem });
      }
      produkte.set(p.handle, p); return { data: { productSet: { product: { id, handle: p.handle, status: p.status }, userErrors: [] } } };
    }
    if (name === 'metafieldsSet') { const p = nachId(v.mf[0].ownerId); for (const m of v.mf) p.metafields.push({ namespace: m.namespace, key: m.key, type: m.type, value: m.value }); return { data: { metafieldsSet: { metafields: v.mf.map((m) => ({ key: m.key })), userErrors: [] } } }; }
    throw new Error('Attrappe kennt die Abfrage nicht: ' + query.slice(0, 60));
  }
  return { gql, produkte, aufrufe, zaehle: (nm) => aufrufe.filter((a) => a.name === nm).length, reihenfolge: () => aufrufe.map((a) => a.name),
    lies: (handle, query = Q_PRODUKT) => alsAntwort(produkte.get(handle), query), antwortVon: (handle) => alsAntwort(produkte.get(handle)) };
}

/**
 * Bestand in der Form von bestand.json aus dem Zustand der Attrappe: so rechnet ein neuer Trockenlauf/LIVE-Lauf den Plan «aus dem Halbzustand» neu.
 * Läuft über den ECHTEN Lesepfad (BESTAND_Q-Antwort der Attrappe → ohneKnoten), nicht über eine von Hand gebaute Kopie des internen Zustands (Runde 4).
 */
const bestandAusShop = (shop, handle) => {
  const g = ohneKnoten(shop.lies(handle, BESTAND_Q)), b = klon(paket.bestand);
  b[handle] = { ...b[handle], descriptionHtml: g.descriptionHtml, options: g.options, variants: g.variants };
  return b;
};

const angelegt = [];
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'pod-auswahl-test-')); angelegt.push(d); return d; };   // alle Ordner werden am Ende entfernt
const still = () => {};
// Vorgabe der Tests: Der Besitzer hat das Produkt-Metafeld «Material» des POSTERS entschieden (BEFUND_OK=poster…:material-metafeld). Alle anderen Befunde sind offen, solange ein Test sie nicht ausdrücklich bestätigt.
const POSTER_MF = [HANDLES.poster + ':material-metafeld'];
const cfg = (dir, extra = {}) => ({ ledgerPfad: join(dir, 'ledger.txt'), sicherungsDir: join(dir, 'sicherung'), log: still, jetzt: () => '2026-10-27T12:00:00.000Z', befundOk: POSTER_MF, ...extra });

// ───────────────────────────────────────────────────────── 1. Bausteine
ist('variantenEingabe: Form (Optionen in Reihenfolge, Preis als Text, kein sku auf oberster Ebene)', variantenEingabe([{ sku: '9000001_6875', preisChf: 28.9, optionen: { Material: 'Foto-Glanzpapier', 'Grösse': '30×40 cm' } }], ['Material', 'Grösse']),
  [{ optionValues: [{ optionName: 'Material', name: 'Foto-Glanzpapier' }, { optionName: 'Grösse', name: '30×40 cm' }], price: '28.90', inventoryPolicy: 'CONTINUE', inventoryItem: { sku: '9000001_6875', tracked: false, requiresShipping: true } }]);
ist('pruefeAntwort: Erfolg gibt den Teil zurück', pruefeAntwort({ data: { x: { a: 1, userErrors: [] } } }, 't', 'x').a, 1);
for (const [n, j] of [['userErrors VARIANT_THROTTLE_EXCEEDED', { data: { x: { userErrors: [{ code: 'VARIANT_THROTTLE_EXCEEDED', message: 'm' }] } } }], ['errors «Daily variant creation limit»', { errors: [{ message: 'Daily variant creation limit reached' }] }]]) {
  let e; try { pruefeAntwort(j, 't', 'x'); } catch (x) { e = x; } wahr(`pruefeAntwort: ${n} → TageslimitFehler`, e instanceof TageslimitFehler);
}
{ let e; try { pruefeAntwort({ data: { x: { userErrors: [{ message: 'kaputt' }] } } }, 't', 'x'); } catch (x) { e = x; } wahr('pruefeAntwort: userErrors → Fehler (kein Tageslimit)', e && !(e instanceof TageslimitFehler) && /kaputt/.test(e.message)); }
ist('sicherungsName: Sonderzeichen (®) ersetzt', sicherungsName('hardcase-iphone®-hulle'), 'hardcase-iphone_-hulle.json');
ist('nurText: Markup und Entitäten egal', nurText('<p>a &amp; b</p>\n<!-- x -->  <b>c</b>'), 'a & b c');
ist('CHUNK ist 50', CHUNK, 50);

// ───────────────────────────────────────────────────────── 2. Poster komplett: Reihenfolge der Aufrufe, Zustand danach, Sicherung, Ledger, Idempotenz
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand);
  const vorher = klon(paket.bestand[HANDLES.poster]);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Poster: Exit 0, Status OK', [r.exit, r.ergebnisse.map((x) => x.status)], [0, ['OK']]);
  const p = shop.produkte.get(HANDLES.poster);
  ist('Poster: Optionen danach Material (1) → Grösse (2)', p.options.map((o) => [o.name, o.position]), [['Material', 1], ['Grösse', 2]]);
  ist('Poster: 18 Varianten', p.variants.length, 18);
  ist('Poster: vorhandene Varianten behalten ID, SKU, Preis', vorher.variants.map((v) => { const x = p.variants.find((q) => q.id === v.id); return [x.sku, x.price]; }), vorher.variants.map((v) => [v.sku, v.price]));
  wahr('Poster: vorhandene Varianten haben «Poster matt»', vorher.variants.every((v) => p.variants.find((q) => q.id === v.id).selectedOptions.find((s) => s.name === 'Material').value === 'Poster matt'));
  ist('Poster: Material-Werte im Shop', p.options[0].values, ['Poster matt', 'Foto-Glanzpapier', 'Leinwand', 'Gerahmt · Schwarz', 'Gerahmt · Weiss', 'Gerahmt · Eiche']);
  wahr('Poster: neue Varianten tracked=false, CONTINUE', p.variants.filter((v) => !vorher.variants.some((q) => q.id === v.id)).every((v) => v.inventoryItem.tracked === false && v.inventoryPolicy === 'CONTINUE'));
  wahr('Poster: Beschreibung mit Block', p.descriptionHtml.includes(MARKE_AUF) && p.descriptionHtml.includes('Materialien im Vergleich'));
  const reihe = shop.reihenfolge().filter((x) => x !== 'productByIdentifier');
  ist('Poster: Reihenfolge der Schreibaufrufe: Option → je Material (EIN Optionswert, direkt danach seine Varianten) → Beschreibung; kein Reorder nötig, kein Metafeld geschrieben', reihe,
    ['productOptionsCreate', ...Array(5).fill(['productOptionUpdate', 'productVariantsBulkCreate']).flat(), 'productUpdate']);
  ist('Poster: erste Mutation kommt NACH dem ersten Lesen', shop.reihenfolge()[0], 'productByIdentifier');
  ist('Poster: Option mit LEAVE_AS_IS-Eingabe (Position 1, erster Wert = «Poster matt»)', shop.aufrufe.find((a) => a.name === 'productOptionsCreate').v.opts, [{ name: 'Material', position: 1, values: [{ name: 'Poster matt' }] }]);
  { const adds = shop.aufrufe.filter((a) => a.name === 'productOptionUpdate').map((a) => a.v.add.map((x) => x.name));
    ist('Poster: ein Optionswert je Aufruf, in Planreihenfolge (5 neue Material-Werte)', adds, [['Foto-Glanzpapier'], ['Leinwand'], ['Gerahmt · Schwarz'], ['Gerahmt · Weiss'], ['Gerahmt · Eiche']]);
    const vs = shop.aufrufe.filter((a) => a.name === 'productVariantsBulkCreate').map((a) => [...new Set(a.v.vs.map((x) => x.optionValues[0].name))]);
    ist('Poster: jeder Variantenaufruf trägt genau das Material, dessen Wert eben angelegt wurde', vs, adds); }
  // Sicherung
  const sf = join(dir, 'sicherung', sicherungsName(HANDLES.poster));
  wahr('Poster: Sicherung des Ausgangszustands geschrieben', existsSync(sf));
  const sj = JSON.parse(readFileSync(sf, 'utf8'));
  ist('Poster: Sicherung enthält den Zustand VOR dem Schreiben (1 Option, 4 Varianten)', [sj.zustand.options.length, sj.zustand.variants.length, sj.zustand.descriptionHtml === vorher.descriptionHtml], [1, 4, true]);
  // Ledger
  const lg = readFileSync(join(dir, 'ledger.txt'), 'utf8').trim().split('\n');
  ist('Poster: Ledger hat eine Zeile mit OK', [lg.length, lg[0].split('\t')[0], /^OK 18 Varianten/.test(lg[0].split('\t')[3])], [1, HANDLES.poster, true]);
  // zweiter Lauf: laut Ledger erledigt, keine Mutation
  const vor = shop.aufrufe.length;
  const r2 = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Poster: zweiter Lauf überspringt laut Ledger, kein Aufruf', [r2.ergebnisse.map((x) => x.status), shop.aufrufe.length - vor], [['UEBERSPRUNGEN'], 0]);
  // dritter Lauf ohne Ledger gegen den schon geschriebenen Shop: Plan neu berechnen (Bestand = Zustand jetzt) → nichts mehr zu schreiben
  rmSync(join(dir, 'ledger.txt'));
  const plan3 = planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster));
  ist('Poster: neu geplant nach dem Schreiben → 0 neue Varianten, alle 14 «schonDa»', [plan3.produkte[0].neu.length, plan3.produkte[0].schonDa.length, plan3.produkte[0].bestehende.length], [0, 14, 4]);
  const vor3 = shop.zaehle('productVariantsBulkCreate') + shop.zaehle('productOptionsCreate');
  const r3 = await lauf({ plan: plan3, gql: shop.gql, ...cfg(dir) });
  ist('Poster: dritter Lauf (ohne Ledger) legt nichts doppelt an', [r3.exit, shop.zaehle('productVariantsBulkCreate') + shop.zaehle('productOptionsCreate') - vor3, shop.produkte.get(HANDLES.poster).variants.length], [0, 0, 18]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 3. Hoodie: Blocker-Befund sperrt, mit BEFUND_OK läuft er
{
  const dir = tmp(); const plan = planVon([HANDLES.hoodie]); const shop = neuerShop(paket.bestand);
  const codes = plan.produkte[0].befunde.filter((b) => b.schwere === 'blocker').map((b) => b.code).sort();
  ist('Hoodie: drei Blocker-Befunde (Sweatshirt-SKUs, Premium-Hoodie schon als eigenes Produkt, Produkt-Metafeld «Material»)', codes, ['material-metafeld', 'sku-anderes-produkt', 'sku-in-anderem-produkt']);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Hoodie: ohne Bestätigung GESPERRT (Exit 5), nichts geschrieben', [r.exit, r.ergebnisse.map((x) => x.status), shop.aufrufe.length], [5, ['GESPERRT'], 0]);
  const r1 = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: [HANDLES.hoodie + ':sku-anderes-produkt'] }) });
  ist('Hoodie: nur EIN Befund bestätigt → bleibt GESPERRT durch den anderen (keine Pauschalbestätigung)', [r1.exit, r1.ergebnisse.map((x) => [x.status, x.befunde]), shop.aufrufe.length], [5, [['GESPERRT', ['material-metafeld', 'sku-in-anderem-produkt']]], 0]);
  const rp = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: [HANDLES.hoodie] }) });
  ist('Hoodie: der blosse Handle bestätigt nichts mehr', [rp.exit, rp.ergebnisse.map((x) => x.status), shop.aufrufe.length], [5, ['GESPERRT'], 0]);
  const r2 = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }) });
  ist('Hoodie: mit beiden Bestätigungen OK, 19 Varianten', [r2.exit, r2.ergebnisse.map((x) => x.status), shop.produkte.get(HANDLES.hoodie).variants.length], [0, ['OK'], 19]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 4. Samsung (neu): productSet, Metafelder, Editor-Baustein, DRAFT
{
  const dir = tmp(); const plan = planVon([HANDLES.samsung]); const shop = neuerShop(paket.bestand);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Samsung: Exit 0, OK', [r.exit, r.ergebnisse.map((x) => x.status)], [0, ['OK']]);
  const p = shop.produkte.get(HANDLES.samsung);
  ist('Samsung: DRAFT, 84 Varianten, Optionen Material → Handymodell', [p.status, p.variants.length, p.options.map((o) => o.name)], ['DRAFT', 84, ['Material', 'Handymodell']]);
  ist('Samsung: genau ein productSet, genau eine Mutation für Metafelder (7 Felder, < 25)', [shop.zaehle('productSet'), shop.zaehle('metafieldsSet'), p.metafields.length], [1, 1, 7]);
  wahr('Samsung: Editor-Baustein ohne Platzhalter, mit numerischer Variantennummer und erstem Bild', !p.descriptionHtml.includes(PLATZHALTER_VARIANTE) && !p.descriptionHtml.includes(PLATZHALTER_BILD)
    && /data-variant="\d+"/.test(p.descriptionHtml) && p.descriptionHtml.includes(plan.produkte[0].neuesProdukt.bilder[0].url));
  const ersteSku = plan.produkte[0].neu[0].sku, v1 = p.variants.find((v) => v.sku === ersteSku);
  wahr('Samsung: data-variant ist die Nummer der ersten geplanten Variante', p.descriptionHtml.includes(`data-variant="${v1.id.split('/').pop()}"`));
  wahr('Samsung: Tags wie im Plan, nicht «bild-ok»', p.tags.includes('wunschdesign') && !p.tags.includes('bild-ok'));
  wahr('Samsung: Kategorie wie beim iPhone-Produkt', p.category === 'gid://shopify/TaxonomyCategory/el-4-8-4-2');
  ist('Samsung: drei Bilder (Hartschale, Klar, Slim; matt und glänzend waren byte-identisch)', p.media.length, 3);
  ist('Samsung: Plan-Eingabe von productSet = was der Trockenlauf zeigt', produktSetEingabe(plan.produkte[0]).variants.length, 84);
  wahr('Samsung: Sicherung entfällt (es gibt keinen Ausgangszustand)', !existsSync(join(dir, 'sicherung', sicherungsName(HANDLES.samsung))));
  // zweiter Lauf ohne Ledger: Produkt gibt es schon → ergänzt nur, legt es nicht noch einmal an
  rmSync(join(dir, 'ledger.txt'));
  const r2 = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Samsung: Wiederholung ohne Ledger legt das Produkt nicht doppelt an', [r2.exit, shop.zaehle('productSet'), shop.produkte.size], [0, 1, Object.keys(paket.bestand).length + 1]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 5. Alles zusammen (Hoodie bestätigt): 165 neue Varianten, alle OK
{
  const dir = tmp(); const plan = planVon(); const shop = neuerShop(paket.bestand);
  const vorab = Object.values(paket.bestand).map((b) => b.variants.length).reduce((a, c) => a + c, 0);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }) });
  ist('Alle fünf: Exit 0, fünf OK', [r.exit, r.ergebnisse.map((x) => x.status)], [0, ['OK', 'OK', 'OK', 'OK', 'OK']]);
  const gesamt = [...shop.produkte.values()].reduce((a, p) => a + p.variants.length, 0);
  ist('Alle fünf: 165 Varianten mehr als vorher', gesamt - vorab, 165);
  wahr('Alle: höchstens 100 Varianten je Produkt', [...shop.produkte.values()].every((p) => p.variants.length <= 100));
  ist('Alle: Option «Material» steht überall an Position 1', [...shop.produkte.values()].map((p) => p.options[0].name + p.options[0].position), Array(5).fill('Material1'));
  ist('Alle: SKUs je Produkt eindeutig', [...shop.produkte.values()].map((p) => new Set(p.variants.map((v) => v.sku)).size === p.variants.length), Array(5).fill(true));
  wahr('Alle: jede SKU endet auf eine Printful-Nummer', [...shop.produkte.values()].every((p) => p.variants.every((v) => pfIdAusSku(v.sku))));
  ist('Alle: iPhone braucht zwei Variantenaufrufe (je Material einer: 16 + 16 ≤ 50)', shop.aufrufe.filter((a) => a.name === 'productVariantsBulkCreate' && a.v.pid === paket.bestand[HANDLES.iphone].id).length, 2);
  ist('Alle: T-Shirt braucht drei Aufrufe (je Material einer: 3 × 8 ≤ 50)', shop.aufrufe.filter((a) => a.name === 'productVariantsBulkCreate' && a.v.pid === paket.bestand[HANDLES.shirt].id).length, 3);
  ist('Ledger: fünf Erfolge', [...ledgerLesen(join(dir, 'ledger.txt')).keys()].length, 5);
  ist('Sicherungen: vier Dateien (Samsung hat keinen Ausgangszustand)', readdirSync(join(dir, 'sicherung')).length, 4);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 6. Stückelung: mehr als 50 neue Varianten in einem erweiterten Produkt → mehrere Aufrufe zu höchstens 50
{
  const dir = tmp(); const bestand = klon(paket.bestand);
  // künstlich: iPhone-Plan mit 120 neuen Varianten
  const plan = planVon([HANDLES.iphone]); const pr = plan.produkte[0];
  const basis = pr.neu[0]; const mehr = [];
  for (let i = 0; i < 120; i++) mehr.push({ ...basis, sku: `3615382_9${String(i).padStart(4, '0')}`, optionen: { Material: 'Klare Hülle', Handymodell: pr.optionen.nachher[1].werte[i % 16] } });
  // gleiche Kombination mehrfach ist in der Attrappe erlaubt (nur SKU zählt)
  pr.neu = mehr; pr.summe = { ...pr.summe, neu: 120, gesamt: 136 };
  const shop = neuerShop(bestand);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }), maxFehlerFolge: 3 });
  const stuecke = shop.aufrufe.filter((a) => a.name === 'productVariantsBulkCreate').map((a) => a.v.vs.length);
  ist('Stückelung: 120 Varianten → 50 + 50 + 20', stuecke, [50, 50, 20]);
  wahr('Stückelung: Ergebnis nicht Exit 1 (Zustand weicht wegen der künstlichen Plan-Änderung höchstens ab)', [0, 3].includes(r.exit));
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 7. Tageslimit: Exit 4, vorherige Produkte bleiben im Ledger, spätere unberührt
{
  const dir = tmp(); const plan = planVon(); const shop = neuerShop(paket.bestand, { tageslimitAb: 14 + 11 + 5 });   // Poster (14) + Hoodie (11) gehen, das T-Shirt (24) scheitert
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }) });
  ist('Tageslimit: Exit 4', r.exit, 4);
  ist('Tageslimit: Poster und Hoodie OK, T-Shirt TAGESLIMIT, nichts danach', r.ergebnisse.map((x) => `${x.handle.slice(0, 12)}:${x.status}`), ['poster-zum-s:OK', 'unisex-hoodi:OK', 'unisex-t-shi:TAGESLIMIT']);
  ist('Tageslimit: iPhone und Samsung nicht angefasst', [shop.produkte.get(HANDLES.iphone).variants.length, shop.produkte.has(HANDLES.samsung)], [16, false]);
  ist('Tageslimit: Ledger kennt nur die zwei Erfolge (nicht wiederholen, was scheiterte)', [...ledgerLesen(join(dir, 'ledger.txt')).keys()].length, 2);
  const stand = shop.zaehle('productVariantsBulkCreate');
  ist('Tageslimit: nach dem Fehler kein weiterer Versuch', shop.zaehle('productVariantsBulkCreate'), stand);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 8. Abweichung nach dem Schreiben: Exit 3, sofort Schluss
{
  const dir = tmp(); const plan = planVon([HANDLES.poster, HANDLES.shirt]);
  const shop = neuerShop(paket.bestand, { verschluckeSku: '9000001_6875' });    // Shopify meldet Erfolg, die Variante fehlt aber
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Abweichung (Variante verschwunden): Exit 3', [r.exit, r.ergebnisse.map((x) => x.status)], [3, ['ABWEICHUNG']]);
  wahr('Abweichung: Liste nennt die fehlende SKU', r.ergebnisse[0].liste.some((x) => /9000001_6875/.test(x)));
  ist('Abweichung: nächstes Produkt (T-Shirt) wird nicht mehr angefasst', shop.produkte.get(HANDLES.shirt).variants.length, 9);
  ist('Abweichung: kein Ledger-Erfolg', existsSync(join(dir, 'ledger.txt')) ? [...ledgerLesen(join(dir, 'ledger.txt')).keys()].length : 0, 0);
  rmSync(dir, { recursive: true, force: true });
}
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]);
  const shop = neuerShop(paket.bestand, { preisAendern: { '9000001_6875': '99.90' } });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Abweichung (falscher Preis im Shop): Exit 3', [r.exit, r.ergebnisse[0].status, r.ergebnisse[0].liste.some((x) => /Preis 9000001_6875/.test(x))], [3, 'ABWEICHUNG', true]);
  rmSync(dir, { recursive: true, force: true });
}
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]);
  const shop = neuerShop(paket.bestand, { beschreibungVerfaelschen: true });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Abweichung (Beschreibung ausserhalb des Blocks verändert): Exit 3', [r.exit, r.ergebnisse[0].status], [3, 'ABWEICHUNG']);
  rmSync(dir, { recursive: true, force: true });
}
{ // Ausgangszustand ≠ Plan (jemand hat den Preis einer vorhandenen Variante geändert): Exit 3, KEINE Mutation
  const dir = tmp(); const plan = planVon([HANDLES.poster]);
  const b2 = klon(paket.bestand); b2[HANDLES.poster].variants[0].price = '27.90';
  const shop = neuerShop(b2);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Vorab: geänderter Preis seit dem Plan → Exit 3, keine Mutation, keine Sicherung', [r.exit, r.ergebnisse[0].status, shop.aufrufe.filter((a) => a.name !== 'productByIdentifier').length, existsSync(join(dir, 'sicherung'))], [3, 'ABWEICHUNG', 0, false]);
  rmSync(dir, { recursive: true, force: true });
}
{ // Produkt-ID im Shop ≠ Plan
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand);
  shop.produkte.get(HANDLES.poster).id = 'gid://shopify/Product/1';
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Vorab: andere Produkt-ID → Exit 3', [r.exit, r.ergebnisse[0].status], [3, 'ABWEICHUNG']);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 9. Drei Fehler in Folge → Abbruch (Exit 1)
{
  const dir = tmp(); const plan = planVon(); const shop = neuerShop(paket.bestand, { alleFehlschlagen: true });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }) });
  ist('Fehlerfolge: Exit 1 nach dem dritten Fehler', [r.exit, r.ergebnisse.map((x) => x.status)], [1, ['FEHLER', 'FEHLER', 'FEHLER']]);
  ist('Fehlerfolge: iPhone und Samsung nie versucht', [shop.produkte.get(HANDLES.iphone).variants.length, shop.produkte.has(HANDLES.samsung)], [16, false]);
  rmSync(dir, { recursive: true, force: true });
}
{ // ein Fehler dazwischen setzt die Folge nicht fort, wenn danach etwas gelingt (hier: Hoodie gesperrt zählt nicht als Fehler)
  const dir = tmp(); const plan = planVon([HANDLES.hoodie, HANDLES.poster]); const shop = neuerShop(paket.bestand);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Gesperrtes Produkt (Hoodie) bremst die übrigen nicht, Reihenfolge wie in der Spezifikation; der Lauf endet mit Exit 5 (nicht alles ausgeführt)', [r.exit, r.ergebnisse.map((x) => x.status)], [5, ['OK', 'GESPERRT']]);
  const nurPoster = await lauf({ plan: planVon([HANDLES.hoodie, HANDLES.poster]), gql: neuerShop(paket.bestand).gql, ...cfg(tmp()), nur: [HANDLES.poster] });
  ist('Mit ONLY (nur) ausserhalb des gesperrten Produkts: Exit 0', [nurPoster.exit, nurPoster.ergebnisse.map((x) => x.status)], [0, ['OK']]);
  const nurHoodie = await lauf({ plan: planVon([HANDLES.hoodie]), gql: neuerShop(paket.bestand).gql, ...cfg(tmp()), nur: [HANDLES.hoodie] });
  ist('Mit ONLY auf das gesperrte Produkt selbst: Exit 5 (nichts ausgeführt ist kein Erfolg)', [nurHoodie.exit, nurHoodie.ergebnisse.map((x) => x.status)], [5, ['GESPERRT']]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 10. Sicherung wird nie überschrieben
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand);
  const sd = join(dir, 'sicherung'); const sf = join(sd, sicherungsName(HANDLES.poster));
  const { mkdirSync } = await import('node:fs'); mkdirSync(sd, { recursive: true }); writeFileSync(sf, '{"alt":true}\n');
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Sicherung: vorhandene Datei bleibt unverändert, das Produkt wird trotzdem geschrieben (kein Fehler)', [r.exit, r.ergebnisse.map((x) => x.status), readFileSync(sf, 'utf8'), shop.produkte.get(HANDLES.poster).variants.length], [0, ['OK'], '{"alt":true}\n', 18]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 11. vergleiche(): erkennt jede Art von Abweichung
{
  const plan = planVon([HANDLES.poster]); const pr = plan.produkte[0];
  const shop = neuerShop(paket.bestand); await lauf({ plan, gql: shop.gql, ...cfg(tmp()) });
  const gut = await leseFrisch(shop.gql, HANDLES.poster);
  ist('vergleiche: geschriebener Zustand = Plan', vergleiche(pr, gut), []);
  const a = klon(gut); a.variants.pop(); wahr('vergleiche: fehlende Variante', vergleiche(pr, a).length > 0);
  const b = klon(gut); b.options.reverse(); wahr('vergleiche: Option an falscher Stelle', vergleiche(pr, b).some((x) => /Optionen/.test(x)));
  const c = klon(gut); c.variants[0].price = '1.00'; wahr('vergleiche: falscher Preis', vergleiche(pr, c).some((x) => /Preis/.test(x)));
  const d = klon(gut); d.variants[5].optionen.Material = 'Leinwand'; wahr('vergleiche: falscher Optionswert', vergleiche(pr, d).some((x) => /Option /.test(x)));
  const e = klon(gut); e.descriptionHtml = e.descriptionHtml.replace(/<!-- lx-material-v1 -->[\s\S]*<!-- \/lx-material-v1 -->/, ''); wahr('vergleiche: Block fehlt', vergleiche(pr, e).some((x) => /Materialblock fehlt/.test(x)));
  const f = klon(gut); f.variants[0].id = 'gid://shopify/ProductVariant/42'; wahr('vergleiche: vorhandene Variante ersetzt (andere ID)', vergleiche(pr, f).some((x) => /ersetzt/.test(x)));
  const g = klon(gut); g.variants[g.variants.length - 1].inventoryPolicy = 'DENY'; wahr('vergleiche: inventoryPolicy der neuen Variante', vergleiche(pr, g).some((x) => /inventoryPolicy/.test(x)));
  ist('vergleiche: nicht lesbares Produkt', vergleiche(pr, null), [`Produkt ${HANDLES.poster} nicht lesbar`]);
}

// ───────────────────────────────────────────────────────── 12. Exit-Codes: Exit 0 NUR, wenn alles Geplante ausgeführt ist
{ // ein FEHLER unter fünf Produkten (die Folge wird durch Erfolge unterbrochen, also kein «drei Fehler in Folge») → Exit 1
  const dir = tmp(); const plan = planVon(); const shop = neuerShop(paket.bestand, { fehlerFuerHandle: HANDLES.shirt });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }) });
  ist('Ein FEHLER unter fünf OK → Exit 1 (nicht 0)', [r.exit, r.ergebnisse.map((x) => x.status)], [1, ['OK', 'OK', 'FEHLER', 'OK', 'OK']]);
  rmSync(dir, { recursive: true, force: true });
}
{ // FEHLER und GESPERRT zugleich: FEHLER gewinnt (1 vor 5)
  const dir = tmp(); const plan = planVon(); const shop = neuerShop(paket.bestand, { fehlerFuerHandle: HANDLES.shirt });
  const bestaetigt = alleBestaetigt(plan).filter((x) => !x.startsWith(HANDLES.iphone));
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: bestaetigt }) });
  ist('FEHLER + GESPERRT → Exit 1', [r.exit, r.ergebnisse.map((x) => x.status)], [1, ['OK', 'OK', 'FEHLER', 'GESPERRT', 'OK']]);
  rmSync(dir, { recursive: true, force: true });
}
{ // Tageslimit und Abweichung behalten Vorrang (Exit 4 / 3), auch wenn vorher etwas GESPERRT war
  const dir = tmp(); const plan = planVon(); const shop = neuerShop(paket.bestand, { tageslimitAb: 14 });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: [...alleBestaetigt(plan).filter((x) => x.startsWith(HANDLES.iphone)), ...POSTER_MF] }) });   // Poster geht, Hoodie und T-Shirt GESPERRT, iPhone (bestätigt) scheitert am Limit
  ist('Tageslimit nach gesperrten Produkten: Exit 4, danach nichts mehr', [r.exit, r.ergebnisse.map((x) => x.status)], [4, ['OK', 'GESPERRT', 'GESPERRT', 'TAGESLIMIT']]);
  rmSync(dir, { recursive: true, force: true });
}
ist('endeCode: leer → 0, nur OK/UEBERSPRUNGEN/NICHTS_ZU_TUN → 0', [endeCode([]), endeCode([{ status: 'OK' }, { status: 'UEBERSPRUNGEN' }, { status: 'NICHTS_ZU_TUN' }])], [0, 0]);
ist('endeCode: GESPERRT → 5, FEHLER → 1, beides → 1', [endeCode([{ status: 'OK' }, { status: 'GESPERRT' }]), endeCode([{ status: 'FEHLER' }]), endeCode([{ status: 'GESPERRT' }, { status: 'FEHLER' }])], [5, 1, 1]);
ist('EXIT_TEXT kennt 0, 1, 3, 4, 5', Object.keys(EXIT_TEXT).map(Number), [0, 1, 3, 4, 5]);
{
  const z = zusammenfassung({ ergebnisse: [{ handle: 'a', status: 'OK' }, { handle: 'b', status: 'GESPERRT' }, { handle: 'c', status: 'FEHLER' }], exit: 1 }).split('\n');
  ist('zusammenfassung: Ergebnis, Zähler, ENDE als letzte Zeile', [z.length, z[0].startsWith('Ergebnis:'), z[1], z[2].startsWith('ENDE: Exit 1 – ')], [3, true, 'Zähler: OK 1 · GESPERRT 1 · FEHLER 1', true]);
  ist('zusammenfassung: leerer Lauf', zusammenfassung({ ergebnisse: [], exit: 0 }).split('\n')[1], 'Zähler: keine Produkte');
}
ist('bestaetigt: nur «handle:code» zählt', [bestaetigt(['h:c'], 'h', 'c'), bestaetigt(['h'], 'h', 'c'), bestaetigt(['h:x'], 'h', 'c'), bestaetigt(undefined, 'h', 'c'), bestaetigt(['hh:c'], 'h', 'c')], [true, false, false, false, false]);

// ───────────────────────────────────────────────────────── 13. OHNE: ein Material weglassen entfernt den Befund, der Rest läuft ohne Bestätigung
{
  const dir = tmp(); const ohne = [{ handle: HANDLES.shirt, material: 'Klassische Baumwolle' }];
  const plan = planVon([HANDLES.shirt], paket.bestand, { ohne }); const shop = neuerShop(paket.bestand);
  ist('OHNE Klassische Baumwolle: kein Blocker mehr, 16 statt 24 neue Varianten', [plan.produkte[0].befunde.filter((b) => b.schwere === 'blocker').length, plan.produkte[0].neu.length], [0, 16]);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  const t = shop.produkte.get(HANDLES.shirt);
  ist('OHNE: Lauf ohne Bestätigung OK, keine Variante der ausgelassenen SKUs (8481330 …/Printful 11576–12652) im Shop', [r.exit, r.ergebnisse.map((x) => x.status), t.variants.length, t.variants.some((v) => /_(11576|11577|11578|11579|11580|12650|12651|12652)$/.test(v.sku)), t.options[0].values.includes('Klassische Baumwolle')], [0, ['OK'], 9 + 16, false, false]);
  rmSync(dir, { recursive: true, force: true });
}


// ───────────────────────────────────────────────────────── 14. Tageslimit MITTEN im Produkt (Befund 10): kein ausgegrauter Wert bleibt stehen, Wiederaufnahme mit gleichem Hash
/** Optionswerte ohne jede Variante im Shop («Option=Wert»): so sähe ein ausgegrauter Wert aus. */
const leereWerte = (shop, handle) => { const p = shop.produkte.get(handle); return p.options.flatMap((o) => o.values.filter((w) => !p.variants.some((v) => v.selectedOptions.some((q) => q.name === o.name && q.value === w))).map((w) => `${o.name}=${w}`)); };
const nurSchreib = (shop) => shop.aufrufe.filter((a) => a.name !== 'productByIdentifier').length;
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const pr = plan.produkte[0];
  const g = pr.optionen.nachher[0].werte.slice(1).map((w) => pr.neu.filter((n) => n.optionen.Material === w).length);
  const opt = { tageslimitAb: g[0] + g[1] };      // die ersten zwei Materialien gehen, das dritte scheitert am Tageslimit
  const shop = neuerShop(paket.bestand, opt);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  const p = shop.produkte.get(HANDLES.poster);
  ist('Tageslimit mitten im Produkt: Exit 4, Status TAGESLIMIT, Zustandstext mit Wiederaufnahme', [r.exit, r.ergebnisse.map((x) => x.status), /Wiederaufnahme: denselben Befehl später wiederholen/.test(r.ergebnisse[0].zustand), /leerer Wert wieder entfernt/.test(r.ergebnisse[0].zustand)], [4, ['TAGESLIMIT'], true, true]);
  ist('Tageslimit mitten im Produkt: nur fertige Materialien im Shop, KEIN Optionswert ohne Variante', [p.options[0].values, leereWerte(shop, HANDLES.poster)], [['Poster matt', 'Foto-Glanzpapier', 'Leinwand'], []]);
  ist('Tageslimit mitten im Produkt: Varianten der fertigen Materialien da, Produkt bleibt ACTIVE', [p.variants.length, p.status], [4 + g[0] + g[1], 'ACTIVE']);
  ist('Tageslimit mitten im Produkt: genau ein Aufräumen (productOptionUpdate mit optionValuesToDelete), Beschreibung unberührt', [shop.aufrufe.filter((a) => a.name === 'productOptionUpdate' && a.v.del).length, shop.zaehle('productUpdate'), shop.zaehle('metafieldsSet')], [1, 0, 0]);
  ist('Tageslimit mitten im Produkt: Ledger kennt das Produkt nicht', existsSync(join(dir, 'ledger.txt')) ? [...ledgerLesen(join(dir, 'ledger.txt')).keys()].length : 0, 0);
  // Wiederaufnahme: neuer Plan aus dem Halbzustand
  const plan2 = planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster));
  ist('Wiederaufnahme: der Plan aus dem Halbzustand hat DENSELBEN Hash (der geprüfte Plan gilt weiter)', plan2.hash, plan.hash);
  ist('Wiederaufnahme: nur die fehlenden Varianten sind neu, die angelegten zählen als «schonDa»', [plan2.produkte[0].neu.length, plan2.produkte[0].schonDa.length], [pr.neu.length - g[0] - g[1], g[0] + g[1]]);
  delete opt.tageslimitAb;
  const r2 = await lauf({ plan: plan2, gql: shop.gql, ...cfg(dir) });
  ist('Wiederaufnahme: Exit 0, 18 Varianten, Option «Material» nicht noch einmal angelegt', [r2.exit, p.variants.length, shop.zaehle('productOptionsCreate'), leereWerte(shop, HANDLES.poster)], [0, 18, 1, []]);
  rmSync(dir, { recursive: true, force: true });
}
{ // Limit schon beim ersten Material: nichts Halbes, Material-Option nur mit dem vorhandenen Wert
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand, { tageslimitAb: 0 });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  const p = shop.produkte.get(HANDLES.poster);
  ist('Tageslimit sofort: Exit 4; «Material» hat nur den vorhandenen Wert, kein Wert ohne Variante, 4 Varianten', [r.exit, p.options.map((o) => [o.name, o.position, o.values.length]), leereWerte(shop, HANDLES.poster), p.variants.length], [4, [['Material', 1, 1], ['Grösse', 2, 4]], [], 4]);
  rmSync(dir, { recursive: true, force: true });
}
{ // Aufräumen scheitert: der Zustandstext sagt es laut; die Wiederholung legt die Varianten zum stehengebliebenen Wert an
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const opt = { tageslimitAb: 0, wertLoeschenFehler: true }; const shop = neuerShop(paket.bestand, opt);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Aufräumen scheitert: Exit 4, Zustandstext nennt den stehengebliebenen Wert (ACHTUNG), der Wert steht noch', [r.exit, /ACHTUNG: leerer Wert «Foto-Glanzpapier»/.test(r.ergebnisse[0].zustand), leereWerte(shop, HANDLES.poster)], [4, true, ['Material=Foto-Glanzpapier']]);
  delete opt.tageslimitAb; delete opt.wertLoeschenFehler;
  const r2 = await lauf({ plan: planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster)), gql: shop.gql, ...cfg(dir) });
  ist('Aufräumen scheitert: die Wiederholung füllt den leeren Wert (Exit 0, 18 Varianten, kein Wert ohne Variante)', [r2.exit, shop.produkte.get(HANDLES.poster).variants.length, leereWerte(shop, HANDLES.poster)], [0, 18, []]);
  rmSync(dir, { recursive: true, force: true });
}
{ // Aufräumen löscht NIE einen Wert, der Varianten trägt: das Limit trifft den zweiten Stück-Aufruf desselben Materials (50 + 50 + 20), der Wert trägt dann schon 50 Varianten
  const dir = tmp(); const plan = planVon([HANDLES.iphone]); const pr = plan.produkte[0];
  const basis = pr.neu[0]; const mehr = [];
  for (let i = 0; i < 120; i++) mehr.push({ ...basis, sku: `3615382_9${String(i).padStart(4, '0')}`, optionen: { Material: 'Klare Hülle', Handymodell: pr.optionen.nachher[1].werte[i % 16] } });
  pr.neu = mehr;
  const shop = neuerShop(paket.bestand, { tageslimitAb: 60 });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }) });
  const p = shop.produkte.get(HANDLES.iphone);
  ist('Limit im zweiten Stück: Exit 4, der Wert «Klare Hülle» trägt 50 Varianten und BLEIBT (kein Löschversuch, kein «ACHTUNG»)',
    [r.exit, p.variants.filter((v) => v.sku.startsWith('3615382_9')).length, p.options[0].values.includes('Klare Hülle'), shop.aufrufe.filter((a) => a.name === 'productOptionUpdate' && a.v.del).length, /ACHTUNG/.test(r.ergebnisse[0].zustand ?? ''), /leerer Wert wieder entfernt/.test(r.ergebnisse[0].zustand ?? '')],
    [4, 50, true, 0, false, false]);
  rmSync(dir, { recursive: true, force: true });
}
{ // Aufräumen löscht NIE einen Wert, der Varianten trägt (frisch gelesen): ein Fehlschlag NACH einer angelegten Variante lässt den Wert stehen
  const dir = tmp(); const plan = planVon([HANDLES.iphone]); const opt = { tageslimitAb: 16 + 5 }; const shop = neuerShop(paket.bestand, opt);   // Hartschale (16) geht, Klare Hülle (16) scheitert
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }) });
  const p = shop.produkte.get(HANDLES.iphone);
  ist('iPhone: Hartschale fertig, Klare Hülle am Limit: Exit 4, Hartschale bleibt, kein leerer Wert', [r.exit, p.options[0].values, p.variants.length, leereWerte(shop, HANDLES.iphone)], [4, ['Hartschale MagSafe', 'Hartschale'], 32, []]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 15. Vorprüfung des Variantenbudgets (VARIANT_BUDGET): ein Produkt, das nicht mehr hineinpasst, wird gar nicht erst begonnen
{
  const dir = tmp(); const plan = planVon([HANDLES.poster, HANDLES.shirt]); const shop = neuerShop(paket.bestand);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }), variantenBudget: 5 });
  ist('Budget 5 < 14 neue Poster-Varianten: Exit 4 VOR dem ersten Aufruf (nichts gelesen, nichts geschrieben)', [r.exit, r.ergebnisse.map((x) => [x.status, x.vorab, x.geplant, x.budget]), shop.aufrufe.length], [4, [['TAGESLIMIT', true, 14, 5]], 0]);
  const shop2 = neuerShop(paket.bestand);
  const r2 = await lauf({ plan, gql: shop2.gql, ...cfg(tmp(), { befundOk: alleBestaetigt(plan) }), variantenBudget: 30 });
  ist('Budget 30: Poster (14) geht, das T-Shirt (24 > 16 Rest) wird nicht begonnen: Exit 4, T-Shirt unberührt', [r2.exit, r2.ergebnisse.map((x) => x.status), shop2.produkte.get(HANDLES.shirt).variants.length, shop2.produkte.get(HANDLES.shirt).options.length], [4, ['OK', 'TAGESLIMIT'], 9, 1]);
  const shop3 = neuerShop(paket.bestand);
  const r3 = await lauf({ plan, gql: shop3.gql, ...cfg(tmp(), { befundOk: alleBestaetigt(plan) }), variantenBudget: 38 });
  ist('Budget 38 = 14 + 24: beides geht (Exit 0)', [r3.exit, r3.ergebnisse.map((x) => x.status)], [0, ['OK', 'OK']]);
  const shop4 = neuerShop(paket.bestand);
  const r4 = await lauf({ plan, gql: shop4.gql, ...cfg(tmp(), { befundOk: alleBestaetigt(plan) }) });
  ist('ohne Budget keine Vorprüfung (Exit 0)', r4.exit, 0);
}

// ───────────────────────────────────────────────────────── 16. Optionsreihenfolge HERSTELLEN (Befund 12), wiederholbar
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand, { positionIgnorieren: true });   // die API hängt «Material» hinten an
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  const p = shop.produkte.get(HANDLES.poster);
  ist('Reihenfolge: «Material» landet hinten → productOptionsReorder stellt Material (1) → Grösse (2) her, Exit 0, 18 Varianten', [r.exit, p.options.map((o) => [o.name, o.position]), p.variants.length], [0, [['Material', 1], ['Grösse', 2]], 18]);
  ist('Reihenfolge: genau ein Reorder mit allen Optionen in Planreihenfolge, VOR dem ersten Optionswert', [shop.aufrufe.filter((a) => a.name === 'productOptionsReorder').map((a) => a.v.opts), shop.reihenfolge().filter((x) => x !== 'productByIdentifier').slice(0, 3)],
    [[[{ name: 'Material' }, { name: 'Grösse' }]], ['productOptionsCreate', 'productOptionsReorder', 'productOptionUpdate']]);
  rmSync(dir, { recursive: true, force: true });
}
{ // Reorder wirkungslos: Exit 3, nichts weiter geschrieben; später (API richtig) repariert derselbe Befehl den Zustand
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const opt = { positionIgnorieren: true, reorderIgnoriert: true }; const shop = neuerShop(paket.bestand, opt);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Reihenfolge nicht herstellbar: Exit 3, keine Variante, kein Optionswert angelegt', [r.exit, r.ergebnisse[0].status, shop.zaehle('productVariantsBulkCreate'), shop.zaehle('productOptionUpdate'), r.ergebnisse[0].liste.some((x) => /Optionen/.test(x))], [3, 'ABWEICHUNG', 0, 0, true]);
  delete opt.reorderIgnoriert; delete opt.positionIgnorieren;
  const r2 = await lauf({ plan: planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster)), gql: shop.gql, ...cfg(dir) });
  const p = shop.produkte.get(HANDLES.poster);
  ist('Reihenfolge: die Wiederholung stellt sie her (Option nicht noch einmal angelegt), Exit 0', [r2.exit, p.options.map((o) => [o.name, o.position]), shop.zaehle('productOptionsCreate'), p.variants.length], [0, [['Material', 1], ['Grösse', 2]], 1, 18]);
  rmSync(dir, { recursive: true, force: true });
}
{ // fremde Option im Shop (Namen passen nicht zum Plan): keine Raterei, Exit 3
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand, { positionIgnorieren: true });
  const p = shop.produkte.get(HANDLES.poster); p.options.push({ id: 'gid://shopify/ProductOption/fremd', name: 'Rahmenfarbe', position: 2, values: ['x'] });
  for (const v of p.variants) v.selectedOptions.push({ name: 'Rahmenfarbe', value: 'x' });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Reihenfolge: eine Option, die der Plan nicht kennt → Exit 3, kein Reorder, keine Variante', [r.exit, shop.zaehle('productOptionsReorder'), shop.zaehle('productVariantsBulkCreate')], [3, 0, 0]);
  rmSync(dir, { recursive: true, force: true });
}
wahr('M_REORDER und M_OPTION_WERTE_LOESCHEN sind Mutationen mit den geprüften Feldnamen', /^mutation/.test(M_REORDER) && /productOptionsReorder\(productId:\$pid, options:\$opts\)/.test(M_REORDER) && /^mutation/.test(M_OPTION_WERTE_LOESCHEN) && /optionValuesToDelete:\$del/.test(M_OPTION_WERTE_LOESCHEN));

// ───────────────────────────────────────────────────────── 17. Beschreibung: frisch gelesen, fremde Änderungen werden nie überschrieben (Befund 15)
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand);
  shop.produkte.get(HANDLES.poster).descriptionHtml = '<p>NEU VON ANDEREM PROZESS</p>' + shop.produkte.get(HANDLES.poster).descriptionHtml;
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Beschreibung schon vor dem Lauf von einem anderen Prozess geändert: Exit 3, KEINE Mutation, Änderung bleibt', [r.exit, nurSchreib(shop), shop.produkte.get(HANDLES.poster).descriptionHtml.includes('NEU VON ANDEREM PROZESS')], [3, 0, true]);
  rmSync(dir, { recursive: true, force: true });
}
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]);
  const shop = neuerShop(paket.bestand, { beiErsterVariantenanlage: (p) => { p.descriptionHtml = '<p>NEU VON ANDEREM PROZESS</p>' + p.descriptionHtml; } });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Beschreibung WÄHREND des Laufs geändert: Exit 3, productUpdate nie gesendet, Änderung bleibt', [r.exit, shop.zaehle('productUpdate'), shop.produkte.get(HANDLES.poster).descriptionHtml.includes('NEU VON ANDEREM PROZESS')], [3, 0, true]);
  rmSync(dir, { recursive: true, force: true });
}
{
  const p = { beschreibung: { vorher: '<p>Text</p>\n<!-- lx-material-v1 -->alt<!-- /lx-material-v1 -->' } };
  ist('beschreibungSeitPlanVeraendert: Block und Markup egal, fremder Text zählt; ohne «vorher» (neues Produkt) nie',
    [beschreibungSeitPlanVeraendert(p, '<p>Text</p>'), beschreibungSeitPlanVeraendert(p, '<div>Text</div><!-- lx-material-v1 -->neu<!-- /lx-material-v1 -->'), beschreibungSeitPlanVeraendert(p, '<p>Text</p><p>fremd</p>'), beschreibungSeitPlanVeraendert({ beschreibung: { vorher: null } }, '<p>egal</p>')], [false, false, true, false]);
}

// ───────────────────────────────────────────────────────── 18. Neues Produkt: ein vorhandener Handle wird nur übernommen, wenn es das eigene DRAFT ist (Befund 19)
{
  const fremd = (extra = {}) => ({ id: 'gid://shopify/Product/777', handle: HANDLES.samsung, title: 'Fremdes Produkt', status: 'ACTIVE', productType: 'Anderes', vendor: 'Jemand', tags: ['fremd'], descriptionHtml: '<p>x</p>', seo: {}, category: null,
    options: [{ id: 'gid://shopify/ProductOption/777', name: 'Titel', position: 1, values: ['Default Title'] }], variants: [{ id: 'gid://shopify/ProductVariant/777', sku: 'FREMD-1', price: '1.00', inventoryPolicy: 'DENY', selectedOptions: [{ name: 'Titel', value: 'Default Title' }], inventoryItem: { tracked: true } }], media: [], metafields: [], ...extra });
  const dir = tmp(); const plan = planVon([HANDLES.samsung]); const shop = neuerShop(paket.bestand);
  shop.produkte.set(HANDLES.samsung, fremd());
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Handle gehört einem fremden ACTIVE-Produkt: Exit 3, nichts geschrieben (kein productSet, keine Metafelder, kein productUpdate)', [r.exit, r.ergebnisse[0].status, nurSchreib(shop), shop.produkte.get(HANDLES.samsung).metafields.length], [3, 'ABWEICHUNG', 0, 0]);
  wahr('Befund nennt Status, Titel und fremde SKU', ['Status ACTIVE ≠ DRAFT', 'Titel «Fremdes Produkt»', 'SKU FREMD-1 gehört nicht zum Plan'].every((t) => r.ergebnisse[0].liste.some((x) => x.includes(t))), JSON.stringify(r.ergebnisse[0].liste));
  // DRAFT mit den richtigen Tags, aber fremder SKU: ebenfalls abgelehnt
  const np = plan.produkte[0].neuesProdukt;
  const shop2 = neuerShop(paket.bestand);
  shop2.produkte.set(HANDLES.samsung, fremd({ status: 'DRAFT', title: np.titel, vendor: np.vendor, productType: np.produktart, tags: [...np.tags], options: plan.produkte[0].optionen.nachher.map((o, i) => ({ id: 'o' + i, name: o.name, position: o.position, values: o.werte })) }));
  const r2 = await lauf({ plan, gql: shop2.gql, ...cfg(tmp()) });
  ist('Eigener Titel, DRAFT, Tags, Optionen – aber eine fremde SKU: Exit 3, nichts geschrieben', [r2.exit, nurSchreib(shop2), r2.ergebnisse[0].liste], [3, 0, ['SKU FREMD-1 gehört nicht zum Plan']]);
  // das eigene halb fertige Produkt (nach einem ersten Lauf) wird übernommen
  const shop3 = neuerShop(paket.bestand);
  const ok1 = await lauf({ plan, gql: shop3.gql, ...cfg(tmp()) });
  const eigen = shop3.produkte.get(HANDLES.samsung);
  ist('Das eigene DRAFT aus einem früheren Lauf besteht die Prüfung (keine Befunde)', [ok1.exit, pruefeVorhandenesProdukt(plan.produkte[0], await leseFrisch(shop3.gql, HANDLES.samsung))], [0, []]);
  eigen.tags.push('fremd-dazu');
  ist('pruefeVorhandenesProdukt: zusätzlicher Tag fällt auf', pruefeVorhandenesProdukt(plan.produkte[0], await leseFrisch(shop3.gql, HANDLES.samsung)).length, 1);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 19. Das Metafeld «Material» wird bei vorhandenen Produkten NIE geschrieben (Befund 13)
{
  const dir = tmp(); const plan = planVon([HANDLES.poster, HANDLES.hoodie, HANDLES.shirt, HANDLES.iphone]); const shop = neuerShop(paket.bestand);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }) });
  ist('Vier vorhandene Produkte geschrieben (alle Befunde bestätigt): kein einziger metafieldsSet-Aufruf, die Metafelder bleiben unberührt', [r.exit, shop.zaehle('metafieldsSet'), [...shop.produkte.values()].filter((p) => p.metafields.length).length], [0, 0, 0]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 20. Korrekturrunde 3 (28.10.2026) A: Optionswert-Anlage und Zurücklesen stehen in derselben Fehlerbehandlung wie die Variantenanlage
const mitLog = () => { const zeilen = []; return { zeilen, log: (m) => zeilen.push(String(m)) }; };
const loeschAufrufe = (shop) => shop.aufrufe.filter((a) => a.name === 'productOptionUpdate' && a.v.del).length;
{ // A1: Shopify legt den Optionswert an, die Antwort geht verloren (Netzfehler NACH dem Anlegen)
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand, { verliereAntwortNach: { name: 'productOptionUpdate', nr: 1 } });
  const L = mitLog(); const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { log: L.log }) });
  const p = shop.produkte.get(HANDLES.poster);
  ist('A1 Antwort nach dem Anlegen des Optionswerts verloren: Exit 1 (FEHLER), KEIN Wert ohne Variante im Shop, Produkt unverändert 4 Varianten ACTIVE', [r.exit, r.ergebnisse.map((x) => x.status), leereWerte(shop, HANDLES.poster), p.options[0].values, p.variants.length, p.status], [1, ['FEHLER'], [], ['Poster matt'], 4, 'ACTIVE']);
  ist('A1: genau ein Aufräumen, keine Variantenanlage versucht, Beschreibung unberührt, Ledger leer', [loeschAufrufe(shop), shop.zaehle('productVariantsBulkCreate'), shop.zaehle('productUpdate'), existsSync(join(dir, 'ledger.txt'))], [1, 0, 0, false]);
  wahr('A1: Ergebnis und Ausgabe tragen den Zustandstext (leerer Wert wieder entfernt, Wiederaufnahme nach Behebung der Ursache)', /leerer Wert wieder entfernt \(Material=Foto-Glanzpapier\)/.test(r.ergebnisse[0].zustand) && /Wiederaufnahme: nach Behebung der Ursache denselben Befehl wiederholen/.test(r.ergebnisse[0].zustand) && L.zeilen.some((z) => z.includes(r.ergebnisse[0].zustand)));
  const r2 = await lauf({ plan: planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster)), gql: shop.gql, ...cfg(dir) });
  ist('A1: Wiederaufnahme (neu geplant) gelingt: Exit 0, 18 Varianten, kein Wert ohne Variante, Option nur einmal angelegt', [r2.exit, p.variants.length, leereWerte(shop, HANDLES.poster), shop.zaehle('productOptionsCreate')], [0, 18, [], 1]);
  rmSync(dir, { recursive: true, force: true });
}
{ // A2: das Zurücklesen direkt nach dem Anlegen des Optionswerts scheitert
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand, { lesenScheitertNach: 'productOptionUpdate' });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('A2 Zurücklesen nach dem Anlegen scheitert: Exit 1, Wert wieder entfernt (frisch gelesen, dann gelöscht), keine Variante angelegt', [r.exit, r.ergebnisse.map((x) => x.status), leereWerte(shop, HANDLES.poster), loeschAufrufe(shop), shop.zaehle('productVariantsBulkCreate')], [1, ['FEHLER'], [], 1, 0]);
  rmSync(dir, { recursive: true, force: true });
}
{ // A3: ein Wert einer ANDEREN Option (Grösse), den dieser Aufruf ergänzt, dessen Antwort aber verloren geht, wird ebenfalls entfernt (er wird VOR dem Senden notiert)
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const pr = plan.produkte[0];
  const ziel = pr.neu.find((n) => n.optionen.Material === 'Foto-Glanzpapier'); ziel.optionen = { ...ziel.optionen, 'Grösse': 'XXL-Test' }; pr.optionen.nachher[1].werte.push('XXL-Test');
  const shop = neuerShop(paket.bestand, { verliereAntwortNach: { name: 'productOptionUpdate', nr: 2 } });   // 1 = Material-Wert, 2 = Grösse-Wert
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  const p = shop.produkte.get(HANDLES.poster);
  ist('A3 Grösse-Wert «XXL-Test» ergänzt, Antwort verloren: Exit 1, beide leeren Werte (Material und Grösse) entfernt, Grösse wieder wie vorher', [r.exit, leereWerte(shop, HANDLES.poster), p.options[1].values, p.options[0].values], [1, [], paket.bestand[HANDLES.poster].options[0].values, ['Poster matt']]);
  ist('A3: ein Aufräumen je Option (Material, Grösse)', loeschAufrufe(shop), 2);
  rmSync(dir, { recursive: true, force: true });
}
{ // A4: ein gewöhnlicher Fehler (kein Tageslimit) in der Variantenanlage räumt ebenfalls auf (der Zweig war ungeschützt)
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand, { variantenFehlerBei: 1 });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('A4 gewöhnlicher Fehler in productVariantsBulkCreate: Exit 1 (FEHLER, nicht Exit 4), Wert wieder entfernt, ein Aufräumen', [r.exit, r.ergebnisse.map((x) => x.status), leereWerte(shop, HANDLES.poster), loeschAufrufe(shop)], [1, ['FEHLER'], [], 1]);
  wahr('A4: Zustandstext nennt keine Tageslimit-Wiederaufnahme, sondern «nach Behebung der Ursache»', !/später wiederholen/.test(r.ergebnisse[0].zustand) && /nach Behebung der Ursache/.test(r.ergebnisse[0].zustand));
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 21. B: Aufräumen ZUSTANDSBASIERT (Wiederaufnahme repariert den liegengebliebenen Halbzustand), nie ein fremder Wert, nie ein Wert mit Variante
{ // B1 (Codex 2 / Prüfer S1): Lauf 1 hinterlässt einen leeren Wert (Antwort verloren UND Aufräumen scheitert); Lauf 2 scheitert sofort wieder am Tageslimit und räumt trotzdem auf
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const opt = { verliereAntwortNach: { name: 'productOptionUpdate', nr: 1 }, wertLoeschenFehler: true };
  const shop = neuerShop(paket.bestand, opt);
  const r1 = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('B1 Lauf 1: Wert bleibt stehen (Aufräumen scheitert) und der Text sagt es laut', [r1.exit, leereWerte(shop, HANDLES.poster), /ACHTUNG: leerer Wert «Foto-Glanzpapier»/.test(r1.ergebnisse[0].zustand)], [1, ['Material=Foto-Glanzpapier'], true]);
  delete opt.verliereAntwortNach; delete opt.wertLoeschenFehler; opt.tageslimitAb = 0;
  const r2 = await lauf({ plan: planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster)), gql: shop.gql, ...cfg(dir) });
  ist('B1 Lauf 2 (sofort wieder Tageslimit): Exit 4, der liegengebliebene Wert ist trotz leerer Ergänzungsliste ENTFERNT', [r2.exit, leereWerte(shop, HANDLES.poster), shop.produkte.get(HANDLES.poster).options[0].values], [4, [], ['Poster matt']]);
  wahr('B1 Lauf 2: der Zustandstext sagt «leerer Wert wieder entfernt» und KEIN «ACHTUNG»; Wiederaufnahme später', /leerer Wert wieder entfernt \(Material=Foto-Glanzpapier\)/.test(r2.ergebnisse[0].zustand) && !/ACHTUNG/.test(r2.ergebnisse[0].zustand) && /Wiederaufnahme: denselben Befehl später wiederholen/.test(r2.ergebnisse[0].zustand));
  delete opt.tageslimitAb;
  const r3 = await lauf({ plan: planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster)), gql: shop.gql, ...cfg(dir) });
  ist('B1 Lauf 3 (Limit weg): Exit 0, 18 Varianten, kein leerer Wert', [r3.exit, shop.produkte.get(HANDLES.poster).variants.length, leereWerte(shop, HANDLES.poster)], [0, 18, []]);
  rmSync(dir, { recursive: true, force: true });
}
{ // B2: nie fremde Werte: ein während des Laufs von jemand anderem angelegter leerer Wert (Material UND Grösse) bleibt stehen und wird nur genannt
  const dir = tmp(); const plan = planVon([HANDLES.poster]);
  const shop = neuerShop(paket.bestand, { tageslimitAb: 0, beiErsterVariantenanlage: (p) => { p.options.find((x) => x.name === 'Material').values.push('Fremd-M'); p.options.find((x) => x.name === 'Grösse').values.push('Fremd-G'); } });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  const p = shop.produkte.get(HANDLES.poster);
  ist('B2 fremde leere Werte («Fremd-M» in Material, «Fremd-G» in Grösse) bleiben, der eigene leere Wert («Foto-Glanzpapier») geht', [r.exit, p.options[0].values, p.options[1].values.includes('Fremd-G'), leereWerte(shop, HANDLES.poster)], [4, ['Poster matt', 'Fremd-M'], true, ['Material=Fremd-M', 'Grösse=Fremd-G']]);
  wahr('B2: der Text nennt den fremden Material-Wert als Hinweis (nicht angefasst), ohne «ACHTUNG»', /Hinweis: leerer Wert «Fremd-M» der Option «Material» steht nicht im Plan und wurde nicht angefasst/.test(r.ergebnisse[0].zustand) && !/ACHTUNG/.test(r.ergebnisse[0].zustand));
  rmSync(dir, { recursive: true, force: true });
}
{ // B3: Werte einer Fremdoption (Grösse), die dieser Aufruf NICHT ergänzt hat, bleiben auch dann, wenn sie leer sind; ein ergänzter leerer Wert geht
  const ist1 = { id: 'gid://shopify/Product/1', variants: [{ sku: 'a', optionen: { Material: 'M1', 'Grösse': 'S' } }],
    options: [{ id: 'o1', name: 'Material', optionValues: [{ id: 'm1', name: 'M1', hasVariants: true }, { id: 'm2', name: 'M2', hasVariants: false }, { id: 'm3', name: 'Fremd', hasVariants: false }] }, { id: 'o2', name: 'Grösse', optionValues: [{ id: 'g1', name: 'S', hasVariants: true }, { id: 'g2', name: 'L-neu', hasVariants: false }, { id: 'g3', name: 'XL-fremd', hasVariants: false }] }] };
  const w = leereWerteLib(ist1, { materialOption: 'Material', planWerte: ['M1', 'M2'], hinzu: [{ optionName: 'Grösse', wert: 'L-neu' }] });
  ist('leereWerte: Material-Plan-Werte ohne Variante und ergänzte Grösse-Werte sind eigene; Material-Wert ausserhalb des Plans ist fremd; fremder Grösse-Wert kommt nirgends vor', [w.eigene.map((x) => `${x.optionName}=${x.wert}`), w.fremde.map((x) => `${x.optionName}=${x.wert}`)], [['Material=M2', 'Grösse=L-neu'], ['Material=Fremd']]);
  ist('leereWerte: ein Wert MIT Variante ist nie leer (auch wenn er in der Ergänzungsliste steht)', leereWerteLib(ist1, { materialOption: 'Material', planWerte: ['M1', 'M2'], hinzu: [{ optionName: 'Grösse', wert: 'S' }, { optionName: 'Material', wert: 'M1' }] }).eigene.map((x) => x.wert), ['M2']);
}
{ // B4: ein Material mit Varianten wird nie gelöscht, auch nicht, wenn es leer gemeldet würde (Aufräumen liest frisch): Abbruch NACH der ersten Variante des zweiten Materials
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const pr = plan.produkte[0];
  const g = pr.optionen.nachher[0].werte.slice(1).map((w) => pr.neu.filter((n) => n.optionen.Material === w).length);
  const shop = neuerShop(paket.bestand, { tageslimitAb: g[0] + 1 });   // das zweite Material (Leinwand) bekommt keine einzige Variante, weil sein Aufruf als GANZES scheitert
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('B4 zweites Material scheitert als Ganzes: nur das erste bleibt, Leinwand-Wert entfernt, erstes Material unberührt', [r.exit, shop.produkte.get(HANDLES.poster).options[0].values, leereWerte(shop, HANDLES.poster)], [4, ['Poster matt', 'Foto-Glanzpapier'], []]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 22. C: ehrlicher Zustandstext — ein Material mit nur TEIL seiner Grössen bleibt und wird «teilweise» genannt
{
  const dir = tmp(); const plan = planVon([HANDLES.iphone]); const pr = plan.produkte[0];
  const basis = pr.neu[0]; const mehr = [];
  for (let i = 0; i < 120; i++) mehr.push({ ...basis, sku: `3615382_9${String(i).padStart(4, '0')}`, optionen: { Material: 'Klare Hülle', Handymodell: pr.optionen.nachher[1].werte[i % 16] } });
  pr.neu = mehr;
  const shop = neuerShop(paket.bestand, { tageslimitAb: 60 });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }) });
  const z = r.ergebnisse[0].zustand;
  wahr('C Teilzustand: der Text nennt «TEILWEISE angelegt: Klare Hülle (50 von 120 Handymodelle)» und dass das Material mit seinen Varianten stehen bleibt', /TEILWEISE angelegt: Klare Hülle \(50 von 120 Handymodelle\); diese Materialien bleiben mit ihren vorhandenen Varianten im Shop stehen/.test(z), z);
  wahr('C Teilzustand: der Text sagt nicht «höchstens ein Wert ohne Variante», meldet keinen leeren Wert und kein ACHTUNG', !/höchstens ein Wert/.test(z) && !/leerer Wert/.test(z) && !/ACHTUNG/.test(z), z);
  ist('C Teilzustand: Zahl der Varianten im Text = Zahl im Shop (50 von 120 neuen + Hartschale-Material vorhanden)', /50 von 120 geplanten neuen Varianten im Shop, 70 fehlen noch/.test(z), true);
  rmSync(dir, { recursive: true, force: true });
}
{ // zustandsText und materialStand rein: Gegenprobe jedes Satzteils
  const stand = { werte: ['A', 'B'], imShop: 7, geplant: 10, teilweise: [{ wert: 'B', da: 3, soll: 6 }], fertig: ['A'], ohneVariante: [], neuAngelegt: 3 };
  const t = zustandsText({ handle: 'h', matName: 'Material', zweiteOption: 'Grösse', stand, tageslimit: true });
  wahr('zustandsText (Tageslimit): Werte, «7 von 10 … 3 fehlen noch», TEILWEISE mit Grössen, Wiederaufnahme später mit Altersgrenze', t.startsWith('Zustand h: Option «Material» mit den Werten A, B; 7 von 10 geplanten neuen Varianten im Shop, 3 fehlen noch; TEILWEISE angelegt: B (3 von 6 Grössen);') && t.includes(`Wiederaufnahme: denselben Befehl später wiederholen (der geprüfte Plan bleibt gültig, der Hash ändert sich nicht; die Daten dürfen höchstens ${DATEN_MAX_ALTER_H} Stunden alt sein, sonst zuerst DATEN=holen)`), t);
  wahr('zustandsText: ohne Teilzustand kein «TEILWEISE», ohne Aufräumen kein «entfernt»', !/TEILWEISE|entfernt|ACHTUNG/.test(zustandsText({ handle: 'h', matName: 'Material', stand: { ...stand, teilweise: [] }, tageslimit: true })));
  wahr('zustandsText: entfernter Wert wird genannt', /leerer Wert wieder entfernt \(Material=X, Grösse=Y\)/.test(zustandsText({ handle: 'h', matName: 'Material', stand, entfernt: ['Material=X', 'Grösse=Y'] })));
  wahr('zustandsText: stehengebliebener eigener Wert → ACHTUNG mit Option (nur bei fremder Option) und Fehlertext', /ACHTUNG: leerer Wert «X» konnte nicht entfernt werden \(boom\)/.test(zustandsText({ handle: 'h', matName: 'Material', stand, uebrig: [{ optionName: 'Material', wert: 'X' }], aufraeumFehler: new Error('boom') })) && /ACHTUNG: leerer Wert «Y» \(Grösse\) konnte/.test(zustandsText({ handle: 'h', matName: 'Material', stand, uebrig: [{ optionName: 'Grösse', wert: 'Y' }] })));
  wahr('zustandsText: Zustand nicht lesbar → ACHTUNG statt Zahlen', /^Zustand h: ACHTUNG: der Zustand nach dem Abbruch ist nicht lesbar/.test(zustandsText({ handle: 'h', matName: 'Material', stand: null })));
  wahr('zustandsText: Mehrzahl nach Option (Grösse → Grössen, Handymodell → Handymodelle, sonst Varianten)', ['Grösse', 'Handymodell', 'Farbe'].map((o) => zustandsText({ handle: 'h', matName: 'Material', zweiteOption: o, stand }).match(/\(3 von 6 (\S+?)\)/)[1]).join(',') === 'Grössen,Handymodelle,Varianten');
  const ist2 = { variants: [{ sku: 'a' }, { sku: 'b' }, { sku: 'c' }], options: [{ name: 'Material', values: ['M1', 'M2', 'M3'] }] };
  const p2 = { optionen: { materialOption: 'Material' }, schonDa: [{ sku: 'a', optionen: { Material: 'M1' } }], neu: [{ sku: 'b', optionen: { Material: 'M2' } }, { sku: 'x', optionen: { Material: 'M2' } }, { sku: 'y', optionen: { Material: 'M3' } }] };
  const st = materialStand(p2, ist2, ['b', 'x', 'y']);
  ist('materialStand: M1 fertig (schon angelegt), M2 teilweise 1 von 2, M3 ohne Variante; 2 von 4 im Shop; von den offenen ist 1 da', [st.fertig, st.teilweise, st.ohneVariante, st.imShop, st.geplant, st.neuAngelegt], [['M1'], [{ wert: 'M2', da: 1, soll: 2 }], ['M3'], 2, 4, 1]);
}

// ───────────────────────────────────────────────────────── 23. D: leseFrisch liest höchstens 250 Varianten ohne Seitenblätterung → kontrollierter Abbruch
{
  const roh = (n, weitere) => async () => ({ data: { productByIdentifier: { id: 'gid://shopify/Product/1', handle: 'h', options: [], media: { edges: [] }, metafields: { edges: [] },
    variants: { edges: Array.from({ length: n }, (_, i) => ({ node: { id: 'v' + i, sku: 's' + i, selectedOptions: [] } })), ...(weitere === undefined ? {} : { pageInfo: { hasNextPage: weitere } }) } } } });
  const versuch = async (n, w) => { try { const x = await leseFrisch(roh(n, w), 'h'); return 'gelesen ' + x.variants.length; } catch (e) { return [e instanceof AbweichungFehler, e.liste.length, /weitere Seite/.test(e.message)].join(); } };
  ist('LESEGRENZE_VARIANTEN ist 250 und steht in der Abfrage', [LESEGRENZE_VARIANTEN, /variants\(first:250\)/.test(Q_PRODUKT), /pageInfo\{ hasNextPage \}/.test(Q_PRODUKT)], [250, true, true]);
  ist('leseFrisch: 249 Varianten ohne weitere Seite werden gelesen', await versuch(249, false), 'gelesen 249');
  ist('leseFrisch: Antwort ohne pageInfo und 249 Varianten wird gelesen', await versuch(249, undefined), 'gelesen 249');
  ist('leseFrisch: genau 250 Varianten → kontrollierter Abbruch (AbweichungFehler mit Meldung zur Lesegrenze)', await versuch(250, false), 'true,1,false');
  ist('leseFrisch: pageInfo.hasNextPage → Abbruch, auch bei wenigen Varianten (Meldung nennt die weitere Seite)', await versuch(3, true), 'true,1,true');
  { let m = ''; try { await leseFrisch(roh(250, false), 'poster'); } catch (e) { m = e.message + '|' + e.liste[0]; } wahr('Meldung nennt Handle, Zahl, Grenze und «nicht vollständig lesbar»', /^poster: 250 Varianten gelesen, die Abfrage liest höchstens 250 ohne Seitenblätterung – der Zustand ist nicht vollständig lesbar/.test(m) && /Lesegrenze 250/.test(m), m); }
  // im Lauf: ein Produkt mit 250 Varianten wird nicht angefasst (Exit 3, keine Mutation), das Aufräumen/Wiederaufnahme rechnet nicht falsch
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand);
  const pp = shop.produkte.get(HANDLES.poster);
  for (let i = 0; i < 246; i++) pp.variants.push({ id: 'gid://shopify/ProductVariant/f' + i, sku: 'FILL-' + i, price: '1.00', inventoryPolicy: 'CONTINUE', selectedOptions: pp.options.map((o) => ({ name: o.name, value: o.values[0] })), inventoryItem: { tracked: false } });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('250 Varianten im Shop: Exit 3 (ABWEICHUNG), keine einzige Mutation, die Liste nennt die Lesegrenze', [r.exit, r.ergebnisse.map((x) => x.status), nurSchreib(shop), /Lesegrenze 250/.test(JSON.stringify(r.ergebnisse[0].liste))], [3, ['ABWEICHUNG'], 0, true]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 24. E: vorhandene Option «Material» mit Fremdwerten / abweichendem Material → Exit 3 VOR dem ersten Schreibaufruf (Szenario S6)
{ // E-S6a: von Hand angelegte Option «Material» («Holz») schon beim Planen da: der Plan hat Verstösse, und der Schreibweg lehnt vor jeder Mutation ab
  const holz = klon(paket.bestand); const hp = holz[HANDLES.poster];
  hp.options.unshift({ name: 'Material', position: 1, values: ['Holz'] }); hp.options.forEach((o, i) => { o.position = i + 1; });
  hp.variants.forEach((v) => v.selectedOptions.unshift({ name: 'Material', value: 'Holz' }));
  const dir = tmp(); const plan = planVon([HANDLES.poster], holz); const shop = neuerShop(holz);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('S6a Option «Material» mit Wert «Holz» von Hand: Exit 3, KEIN Schreibaufruf, keine Sicherung', [r.exit, r.ergebnisse.map((x) => x.status), nurSchreib(shop), existsSync(join(dir, 'sicherung'))], [3, ['ABWEICHUNG'], 0, false]);
  wahr('S6a: die Liste nennt den Fremdwert «Holz» und das abweichende Material der vorhandenen Varianten', r.ergebnisse[0].liste.some((x) => /Werte, die der Plan nicht kennt: «Holz»/.test(x)) && r.ergebnisse[0].liste.some((x) => /Material «Holz» ≠ «Poster matt»/.test(x)), JSON.stringify(r.ergebnisse[0].liste));
  rmSync(dir, { recursive: true, force: true });
}
{ // E-S6b: zwischen Plan und LIVE legt jemand die Option mit einem Fremdwert an (der Plan kennt sie nicht)
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand);
  const p = shop.produkte.get(HANDLES.poster);
  p.options.unshift({ id: 'gid://shopify/ProductOption/hand', name: 'Material', position: 1, values: ['Poster matt', 'Holz'] }); p.options.forEach((o, i) => { o.position = i + 1; });
  p.variants.forEach((v) => v.selectedOptions.unshift({ name: 'Material', value: 'Poster matt' }));
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('S6b Fremdwert «Holz» ohne Variante in einer von Hand angelegten Option: Exit 3, keine Mutation', [r.exit, nurSchreib(shop), r.ergebnisse[0].liste.length], [3, 0, 1]);
  rmSync(dir, { recursive: true, force: true });
}
{ // E-S6c: nur das Material EINER vorhandenen Variante weicht ab (Werte alle im Plan)
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand);
  const p = shop.produkte.get(HANDLES.poster);
  p.options.unshift({ id: 'gid://shopify/ProductOption/hand', name: 'Material', position: 1, values: ['Poster matt', 'Leinwand'] }); p.options.forEach((o, i) => { o.position = i + 1; });
  p.variants.forEach((v, i) => v.selectedOptions.unshift({ name: 'Material', value: i === 2 ? 'Leinwand' : 'Poster matt' }));
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('S6c eine vorhandene Variante trägt «Leinwand» statt «Poster matt»: Exit 3, keine Mutation, genau diese Variante genannt', [r.exit, nurSchreib(shop), r.ergebnisse[0].liste.map((x) => /Material «Leinwand» ≠ «Poster matt»/.test(x))], [3, 0, [true]]);
  rmSync(dir, { recursive: true, force: true });
}
{ // der eigene Halbzustand (Wiederaufnahme) passiert die Vorab-Prüfung weiterhin
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand, { variantenFehlerBei: 2 });
  const r1 = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  const r2 = await lauf({ plan: planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster)), gql: shop.gql, ...cfg(dir) });
  ist('Halbzustand nach Fehler im zweiten Material: Lauf 1 FEHLER (Exit 1), Wiederaufnahme besteht die Vorab-Prüfung und endet mit Exit 0, 18 Varianten', [r1.exit, r2.exit, shop.produkte.get(HANDLES.poster).variants.length, leereWerte(shop, HANDLES.poster)], [1, 0, 18, []]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 25. E: das Variantenbudget zieht auch bei einem Produkt ab, das nach angelegten Varianten mit einem gewöhnlichen Fehler endet
{
  const plan = planVon([HANDLES.poster, HANDLES.shirt]); const [po, sh] = plan.produkte;
  const gr = po.optionen.nachher[0].werte.slice(1).map((w) => po.neu.filter((n) => n.optionen.Material === w).length);
  const dir = tmp();
  // (a) gewöhnlicher Fehler im zweiten Material: das erste ist angelegt (gr[0] Varianten), die gr[1] des zweiten nicht
  const shop = neuerShop(paket.bestand, { variantenFehlerBei: 2 });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: alleBestaetigt(plan) }), variantenBudget: sh.neu.length + gr[0] - 1 });
  ist(`Budget: Poster endet nach ${gr[0]} angelegten Varianten mit einem Fehler → das T-Shirt (${sh.neu.length}) passt nicht mehr: Exit 4 VOR dem ersten Schreibaufruf des T-Shirts`, [r.exit, r.ergebnisse.map((x) => x.status + (x.vorab ? '/vorab' : '')), shop.produkte.get(HANDLES.shirt).variants.length, shop.produkte.get(HANDLES.shirt).options.length], [4, ['FEHLER', 'TAGESLIMIT/vorab'], 9, 1]);
  // (b) ausreichendes Budget: das T-Shirt läuft
  const shop2 = neuerShop(paket.bestand, { variantenFehlerBei: 2 });
  const r2 = await lauf({ plan, gql: shop2.gql, ...cfg(tmp(), { befundOk: alleBestaetigt(plan) }), variantenBudget: sh.neu.length + gr[0] });
  ist('Budget genau passend (Rest = 24): das T-Shirt läuft; Exit 1 wegen des Poster-Fehlers', [r2.exit, r2.ergebnisse.map((x) => x.status)], [1, ['FEHLER', 'OK']]);
  // (c) verlorene Antwort bei der Variantenanlage des zweiten Materials: die Varianten SIND angelegt, das Budget zählt, was frisch gelesen im Shop steht (nicht nur bestätigte Antworten)
  const shop3 = neuerShop(paket.bestand, { verliereAntwortNach: { name: 'productVariantsBulkCreate', nr: 2 } });
  const r3 = await lauf({ plan, gql: shop3.gql, ...cfg(tmp(), { befundOk: alleBestaetigt(plan) }), variantenBudget: sh.neu.length + gr[0] + gr[1] - 1 });
  ist(`Budget: Antwort des zweiten Materials verloren, ${gr[1]} Varianten stehen trotzdem im Shop → mitgezählt, das T-Shirt passt nicht mehr`, [r3.exit, r3.ergebnisse.map((x) => x.status + (x.vorab ? '/vorab' : '')), shop3.produkte.get(HANDLES.poster).variants.length], [4, ['FEHLER', 'TAGESLIMIT/vorab'], 4 + gr[0] + gr[1]]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 26. Mutations-Lücken der Prüfung 2 (Prüfer 1, wichtig 1): jede Schutzmassnahme des Schreibwegs hat einen Test
{ // Wächter-Tor «unbekannt»: eine neue Variante mit einem Material ausserhalb des Plans wird abgelehnt, BEVOR irgendein Wert oder eine Variante entsteht
  const dir = tmp(); const plan = planVon([HANDLES.poster]); plan.produkte[0].neu[0].optionen = { ...plan.produkte[0].neu[0].optionen, Material: 'Nicht im Plan' };
  const shop = neuerShop(paket.bestand);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('unbekannt: Exit 3, die Liste nennt SKU und Material, KEIN Optionswert und KEINE Variante angelegt', [r.exit, r.ergebnisse[0].liste.length, /«Nicht im Plan»/.test(r.ergebnisse[0].liste[0]), shop.zaehle('productOptionUpdate'), shop.zaehle('productVariantsBulkCreate')], [3, 1, true, 0, 0]);
  rmSync(dir, { recursive: true, force: true });
}
{ // Handle-Übernahme: JEDE der Bedingungen (Status, Titel, Verkäufer, Produktart, Tags, Optionsnamen, SKU) einzeln
  const plan = planVon([HANDLES.samsung]); const pr = plan.produkte[0]; const np = pr.neuesProdukt;
  const eigenes = (extra = {}) => ({ id: 'gid://shopify/Product/888', handle: HANDLES.samsung, title: np.titel, status: 'DRAFT', productType: np.produktart, vendor: np.vendor, tags: [...np.tags], descriptionHtml: '<p>x</p>', seo: {}, category: null,
    options: pr.optionen.nachher.map((o, i) => ({ id: 'gid://shopify/ProductOption/s' + i, name: o.name, position: o.position, values: [...o.werte] })), variants: [], media: [], metafields: [], ...extra });
  const faelle = [['Status', { status: 'ACTIVE' }, /^Status ACTIVE ≠ DRAFT$/], ['Titel', { title: 'Anderer Titel' }, /^Titel «Anderer Titel» ≠ /], ['Verkäufer', { vendor: 'Fremdverkäufer' }, /^Verkäufer «Fremdverkäufer» ≠ /], ['Produktart', { productType: 'Fremdart' }, /^Produktart «Fremdart» ≠ /],
    ['Tags', { tags: [...np.tags, 'fremd'] }, /^Tags «/], ['Optionsnamen', { options: [{ id: 'o1', name: 'Farbe', position: 1, values: ['Rot'] }] }, /^Optionen «Farbe» ≠ «Material, Handymodell»$/]];
  for (const [feld, extra, erwartet] of faelle) {
    const shop = neuerShop(paket.bestand); shop.produkte.set(HANDLES.samsung, eigenes(extra));
    const rein = pruefeVorhandenesProdukt(pr, await leseFrisch(shop.gql, HANDLES.samsung));
    ist(`Handle-Übernahme: nur ${feld} weicht ab → genau eine Meldung`, [rein.length, erwartet.test(rein[0] ?? '')], [1, true]);
    const dir = tmp(); const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
    ist(`Handle-Übernahme: nur ${feld} weicht ab → Exit 3 ohne jeden Schreibzugriff`, [r.exit, nurSchreib(shop), r.ergebnisse[0].status], [3, 0, 'ABWEICHUNG']);
    rmSync(dir, { recursive: true, force: true });
  }
  { const shop = neuerShop(paket.bestand); shop.produkte.set(HANDLES.samsung, eigenes());
    ist('Handle-Übernahme: das eigene DRAFT ohne Abweichung besteht (keine Meldung)', pruefeVorhandenesProdukt(pr, await leseFrisch(shop.gql, HANDLES.samsung)), []); }
}
{ // Positionsprüfung in der Optionsreihenfolge: richtige Reihenfolge der Namen, aber Positionen nicht 1..n (Lücke) → es wird neu geordnet; stimmt alles, wird NICHT geschrieben
  const prod = (pos) => ({ id: 'gid://shopify/Product/1', handle: 'h', options: [{ id: 'o1', name: 'Material', position: pos[0], values: [], optionValues: [] }, { id: 'o2', name: 'Grösse', position: pos[1], values: [], optionValues: [] }], variants: { edges: [] }, media: { edges: [] }, metafields: { edges: [] } });
  const pl = { handle: 'h', optionen: { nachher: [{ name: 'Material' }, { name: 'Grösse' }] } };
  const lauf1 = async (vorher, nachher) => { let reorder = 0; const gql = async (q) => { if (/productOptionsReorder/.test(q)) { reorder++; return { data: { productOptionsReorder: { product: { id: 'x' }, userErrors: [] } } }; } return { data: { productByIdentifier: prod(nachher) } }; };
    await stelleReihenfolgeHer({ gql, log: still, p: pl, ist: await leseFrisch(async () => ({ data: { productByIdentifier: prod(vorher) } }), 'h') }); return reorder; };
  ist('Optionsreihenfolge: Namen in Ordnung, aber Positionen 1 und 3 → genau ein productOptionsReorder', await lauf1([1, 3], [1, 2]), 1);
  ist('Optionsreihenfolge: Positionen 1 und 2 → kein Schreibaufruf', await lauf1([1, 2], [1, 2]), 0);
  ist('Optionsreihenfolge: Positionen 2 und 3 (Namen in Ordnung) → ein Reorder', await lauf1([2, 3], [1, 2]), 1);
}
{ // Aufräumen nach einem gewöhnlichen Fehler: schon in A4 getestet; hier zusätzlich die Wiederholung nach genau diesem Fehler (Wiederaufnahme)
  const dir = tmp(); const shop = neuerShop(paket.bestand, { variantenFehlerBei: 1 });
  const r1 = await lauf({ plan: planVon([HANDLES.poster]), gql: shop.gql, ...cfg(dir) });
  const r2 = await lauf({ plan: planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster)), gql: shop.gql, ...cfg(dir) });
  ist('nach einem gewöhnlichen Fehler: Exit 1, dann Wiederaufnahme Exit 0 mit 18 Varianten', [r1.exit, r2.exit, shop.produkte.get(HANDLES.poster).variants.length], [1, 0, 18]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 27. C: Wortlaut zu Exit 4 und zur Wiederaufnahme (Prüfer Klein 3)
{
  const t4 = EXIT_TEXT[4];
  wahr('EXIT_TEXT[4]: «nicht sofort wiederholen, später denselben Befehl», Altersgrenze der Daten und DATEN=holen — nicht mehr «nicht wiederholen» / «morgen neu planen»', /nicht sofort wiederholen, später denselben Befehl/.test(t4) && t4.includes(`${DATEN_MAX_ALTER_H} Stunden`) && /DATEN=holen/.test(t4) && !/nicht wiederholen|morgen neu planen/.test(t4), t4);
  const z = zusammenfassung({ ergebnisse: [{ handle: 'a', status: 'TAGESLIMIT' }], exit: 4 }).split('\n');
  wahr('Die letzte Ausgabezeile bei Exit 4 trägt diesen Wortlaut', z[z.length - 1] === `ENDE: Exit 4 – ${t4}`, z[z.length - 1]);
}


// ───────────────────────────────────────────────────────── 28. Runde 4 (28.10.2026): Optionen werden über `optionValues { id name hasVariants }` gelesen, NIE über `ProductOption.values`
// Der unabhängige Prüfer der Runde 3 fand: die Attrappe lieferte Werte OHNE Variante in `values`, Shopify tut das nicht (Schema: «including values not assigned to any variants» steht NUR bei optionValues).
// Ein liegengebliebener leerer Wert war für die Wiederaufnahme darum unsichtbar (Exit 1 mit OPTION_VALUE_ALREADY_EXISTS statt Exit 0/4).
const VALUES_ABFRAGE = 'query($h:String!){ productByIdentifier(identifier:{handle:$h}){ options{ id name values optionValues{ id name hasVariants } } } }';   // nur für Tests der Attrappe: fragt AUSDRÜCKLICH auch `values`
{ // 28a: die Attrappe verhält sich wie Shopify (Selbsttest)
  const shop = neuerShop(paket.bestand); const p = shop.produkte.get(HANDLES.poster);
  p.options.unshift({ id: 'gid://shopify/ProductOption/hand', name: 'Material', position: 1, values: ['Poster matt', 'Holz'] }); p.options.forEach((o, i) => { o.position = i + 1; });
  p.variants.forEach((v) => v.selectedOptions.unshift({ name: 'Material', value: 'Poster matt' }));
  const mat = () => shop.lies(HANDLES.poster, VALUES_ABFRAGE).options.find((o) => o.name === 'Material');
  ist('Attrappe: ProductOption.values nennt nur Werte MIT Variante («Holz» fehlt), optionValues nennt alle mit hasVariants', [mat().values, mat().optionValues.map((v) => [v.name, v.hasVariants])], [['Poster matt'], [['Poster matt', true], ['Holz', false]]]);
  ist('Attrappe: jeder optionValues-Eintrag trägt eine eigene id', new Set(mat().optionValues.map((v) => v.id)).size, 2);
  ist('Attrappe: die Antwort enthält nur die verlangten Felder (Q_PRODUKT: id, name, position, optionValues – KEIN values)', [Object.keys(shop.lies(HANDLES.poster, Q_PRODUKT).options[0]).sort(), Object.keys(shop.lies(HANDLES.poster, Q_PRODUKT).options[0].optionValues[0]).sort()], [['id', 'name', 'optionValues', 'position'], ['hasVariants', 'id', 'name']]);
  ist('Attrappe: BESTAND_Q liefert dieselben Felder', Object.keys(shop.lies(HANDLES.poster, BESTAND_Q).options[0]).sort(), ['id', 'name', 'optionValues', 'position']);
  const dopp = await shop.gql(M_OPTION_WERTE, { pid: p.id, opt: { id: 'gid://shopify/ProductOption/hand' }, add: [{ name: 'Holz' }] });
  ist('Attrappe: einen schon vorhandenen Optionswert (auch einen ohne Variante) noch einmal anlegen → OPTION_VALUE_ALREADY_EXISTS wie bei Shopify', dopp.data.productOptionUpdate.userErrors.map((e) => e.code), ['OPTION_VALUE_ALREADY_EXISTS']);
  const holzVar = [{ optionValues: [{ optionName: 'Material', name: 'Holz' }, { optionName: 'Grösse', name: p.options[1].values[0] }], price: '9.90', inventoryPolicy: 'CONTINUE', inventoryItem: { sku: 'T_1', tracked: false, requiresShipping: true } }];
  const nVar = await shop.gql(M_VARIANTEN, { pid: p.id, vs: holzVar });
  ist('Attrappe: productVariantsBulkCreate setzt hasVariants des Werts auf true, und values nennt ihn danach', [nVar.data.productVariantsBulkCreate.userErrors, mat().optionValues.map((v) => [v.name, v.hasVariants]), mat().values], [[], [['Poster matt', true], ['Holz', true]], ['Poster matt', 'Holz']]);
  const loesch = await shop.gql(M_OPTION_WERTE_LOESCHEN, { pid: p.id, opt: { id: 'gid://shopify/ProductOption/hand' }, del: [mat().optionValues[1].id] });
  ist('Attrappe: einen Wert MIT Variante löschen → OPTION_VALUE_HAS_VARIANTS (Code aus ProductOptionUpdateUserErrorCode)', loesch.data.productOptionUpdate.userErrors.map((e) => e.code), ['OPTION_VALUE_HAS_VARIANTS']);
}
{ // 28b: KEIN Lesepfad (Abfrage und Antworten der Schreibaufrufe) fragt ProductOption.values
  for (const [n, q] of [['Q_PRODUKT', Q_PRODUKT], ['BESTAND_Q', BESTAND_Q], ['M_OPTION', M_OPTION], ['M_OPTION_WERTE', M_OPTION_WERTE], ['M_OPTION_WERTE_LOESCHEN', M_OPTION_WERTE_LOESCHEN], ['M_REORDER', M_REORDER]]) {
    const sel = auswahlVon(q, 'options');
    ist(`${n}: liest Optionen über optionValues { id name hasVariants } und nie über ProductOption.values`, [Object.keys(sel).sort(), Object.keys(sel.optionValues).sort()], [['id', 'name', 'optionValues', 'position'], ['hasVariants', 'id', 'name']]);
  }
}
{ // 28c: (a) ein leerer Wert bleibt liegen: die Wiederaufnahme SIEHT ihn und füllt ihn mit Varianten, statt ihn neu anzulegen (vorher: OPTION_VALUE_ALREADY_EXISTS, Exit 1)
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const opt = { verliereAntwortNach: { name: 'productOptionUpdate', nr: 1 }, wertLoeschenFehler: true };
  const shop = neuerShop(paket.bestand, opt); const p = shop.produkte.get(HANDLES.poster);
  const r1 = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  const a1 = shop.lies(HANDLES.poster, VALUES_ABFRAGE).options.find((o) => o.name === 'Material');
  ist('(a) Lauf 1 hinterlässt «Foto-Glanzpapier» ohne Variante: in optionValues mit hasVariants false, in Shopifys values fehlt er', [r1.exit, a1.optionValues.filter((v) => !v.hasVariants).map((v) => v.name), a1.values], [1, ['Foto-Glanzpapier'], ['Poster matt']]);
  const gelesen = await leseFrisch(shop.gql, HANDLES.poster);
  ist('(a) leseFrisch (Schreibweg) sieht den leeren Wert: Existenz über optionValues, hasVariants false', [gelesen.options[0].values, gelesen.options[0].optionValues.map((v) => [v.name, v.hasVariants])], [['Poster matt', 'Foto-Glanzpapier'], [['Poster matt', true], ['Foto-Glanzpapier', false]]]);
  delete opt.verliereAntwortNach; delete opt.wertLoeschenFehler;
  const plan2 = planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster));
  ist('(a) der Plan aus dem Halbzustand hat DENSELBEN Hash (der leere Wert ändert den geprüften Plan nicht)', plan2.hash, plan.hash);
  const vor = shop.aufrufe.length;
  const r2 = await lauf({ plan: plan2, gql: shop.gql, ...cfg(dir) });
  const neuAdds = shop.aufrufe.slice(vor).filter((a) => a.name === 'productOptionUpdate' && a.v.add).map((a) => a.v.add.map((x) => x.name));
  ist('(a) Wiederaufnahme: Exit 0, 18 Varianten, kein Wert ohne Variante', [r2.exit, r2.ergebnisse.map((x) => x.status), p.variants.length, leereWerte(shop, HANDLES.poster)], [0, ['OK'], 18, []]);
  ist('(a) Wiederaufnahme legt den vorhandenen leeren Wert NICHT neu an (nur die vier übrigen Materialien), also kein OPTION_VALUE_ALREADY_EXISTS', neuAdds, [['Leinwand'], ['Gerahmt · Schwarz'], ['Gerahmt · Weiss'], ['Gerahmt · Eiche']]);
  ist('(a) die Varianten des leeren Werts sind jetzt da (Foto-Glanzpapier trägt Varianten)', p.variants.filter((v) => v.selectedOptions.some((s) => s.name === 'Material' && s.value === 'Foto-Glanzpapier')).length, plan.produkte[0].neu.filter((n) => n.optionen.Material === 'Foto-Glanzpapier').length);
  rmSync(dir, { recursive: true, force: true });
}
{ // 28d: (b) die Wiederaufnahme scheitert wieder am Tageslimit: der leere Wert wird entfernt, über die ID aus optionValues
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const opt = { verliereAntwortNach: { name: 'productOptionUpdate', nr: 1 }, wertLoeschenFehler: true };
  const shop = neuerShop(paket.bestand, opt);
  await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  const gelesen = await leseFrisch(shop.gql, HANDLES.poster);
  const optId = gelesen.options[0].id, wertId = gelesen.options[0].optionValues.find((v) => v.name === 'Foto-Glanzpapier').id;
  delete opt.verliereAntwortNach; delete opt.wertLoeschenFehler; opt.tageslimitAb = 0;
  const vor = shop.aufrufe.length;
  const r2 = await lauf({ plan: planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster)), gql: shop.gql, ...cfg(dir) });
  const sicht = shop.aufrufe.slice(vor).filter((a) => a.name === 'productOptionUpdate');
  ist('(b) Lauf 2 am Tageslimit: Exit 4 (nicht Exit 1 wegen OPTION_VALUE_ALREADY_EXISTS), der leere Wert ist entfernt, kein Wert ohne Variante', [r2.exit, leereWerte(shop, HANDLES.poster), shop.produkte.get(HANDLES.poster).options[0].values], [4, [], ['Poster matt']]);
  ist('(b) Lauf 2 legt den vorhandenen Wert nicht noch einmal an (kein add) und löscht genau einmal, mit Option-ID und Wert-ID aus optionValues', [sicht.filter((a) => a.v.add).length, sicht.filter((a) => a.v.del).map((a) => [a.v.opt, a.v.del])], [0, [[{ id: optId }, [wertId]]]]);
  wahr('(b) der Zustandstext sagt «leerer Wert wieder entfernt (Material=Foto-Glanzpapier)», kein ACHTUNG', /leerer Wert wieder entfernt \(Material=Foto-Glanzpapier\)/.test(r2.ergebnisse[0].zustand) && !/ACHTUNG/.test(r2.ergebnisse[0].zustand), r2.ergebnisse[0].zustand);
  rmSync(dir, { recursive: true, force: true });
}
{ // 28e: (c) die vorab angelegte fremde Option «Material» mit LEEREM Fremdwert «Holz» wird im Trockenlauf UND vor dem ersten Schreibaufruf gemeldet (über values blieb sie unsichtbar)
  const shop = neuerShop(paket.bestand); const p = shop.produkte.get(HANDLES.poster);
  p.options.unshift({ id: 'gid://shopify/ProductOption/hand', name: 'Material', position: 1, values: ['Poster matt', 'Holz'] }); p.options.forEach((o, i) => { o.position = i + 1; });
  p.variants.forEach((v) => v.selectedOptions.unshift({ name: 'Material', value: 'Poster matt' }));   // alle Varianten tragen «Poster matt»; «Holz» hat keine
  ist('(c) Shopify-values nennt «Holz» nicht (Gegenprobe der Voraussetzung)', shop.lies(HANDLES.poster, VALUES_ABFRAGE).options[0].values, ['Poster matt']);
  const bestandHolz = bestandAusShop(shop, HANDLES.poster);
  ist('(c) das Datenpaket aus dem Shop (echter Lesepfad) kennt «Holz» als vorhandenen Wert', bestandHolz[HANDLES.poster].options[0].values, ['Poster matt', 'Holz']);
  const planHolz = planVon([HANDLES.poster], bestandHolz);
  ist('(c) Trockenlauf: genau ein Verstoss, er nennt den leeren Fremdwert «Holz» (Plan nicht ausführbar)', [planHolz.verstoesse.length, /Option «Material» im Shop hat Werte, die der Plan nicht kennt: «Holz»/.test(planHolz.verstoesse[0] ?? '')], [1, true]);
  const dir = tmp(); const plan = planVon([HANDLES.poster]);   // der ursprünglich geprüfte Plan kennt die Option nicht
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('(c) LIVE: Exit 3 VOR dem ersten Schreibaufruf (kein Schreibaufruf, keine Sicherung), die Liste nennt «Holz»', [r.exit, nurSchreib(shop), existsSync(join(dir, 'sicherung')), r.ergebnisse[0].liste.some((x) => /Werte, die der Plan nicht kennt: «Holz»/.test(x))], [3, 0, false, true]);
  rmSync(dir, { recursive: true, force: true });
}
{ // 28f: leereWerte() – «leer» heisst: Shopify meldet hasVariants false UND keine gelesene Variante trägt den Wert; sonst NIE
  const mk = (hasVariants, getragen) => ({ id: 'gid://shopify/Product/1', variants: [{ sku: 'a', optionen: { Material: getragen ? 'M2' : 'M1' } }],
    options: [{ id: 'o1', name: 'Material', optionValues: [{ id: 'm1', name: 'M1', hasVariants: true }, { id: 'm2', name: 'M2', hasVariants }] }] });
  const eigene = (x) => leereWerteLib(x, { materialOption: 'Material', planWerte: ['M1', 'M2'] }).eigene.map((v) => [v.wert, v.id, v.optionId]);
  ist('leereWerte: hasVariants false und keine Variante trägt den Wert → leer, mit Wert-ID und Option-ID aus optionValues', eigene(mk(false, false)), [['M2', 'm2', 'o1']]);
  ist('leereWerte: Shopify meldet hasVariants true (die gelesenen Varianten tragen ihn aber nicht) → NIE leer', eigene(mk(true, false)), []);
  ist('leereWerte: Shopify meldet hasVariants false, aber eine gelesene Variante trägt ihn → NIE leer', eigene(mk(false, true)), []);
  ist('leereWerte: hasVariants fehlt (unbekannt) → nichts anfassen', eigene(mk(undefined, false)), []);
}
{ // 28g: die Weitergabe von `schonDa` an die Vorab-Prüfung der Option «Material» (Mutant `schonDa: []`): eine schon angelegte Variante mit anderem Material wird VOR dem ersten Schreibaufruf gemeldet
  const dir = tmp(); const shop = neuerShop(paket.bestand, { variantenFehlerBei: 3 });   // Foto-Glanzpapier und Leinwand sind angelegt, das dritte Material scheitert
  const r1 = await lauf({ plan: planVon([HANDLES.poster]), gql: shop.gql, ...cfg(dir) });
  const plan2 = planVon([HANDLES.poster], bestandAusShop(shop, HANDLES.poster)); const pr2 = plan2.produkte[0];
  const sd = pr2.schonDa.find((x) => x.optionen.Material === 'Foto-Glanzpapier');
  ist('schonDa: Lauf 1 endet mit FEHLER im dritten Material; die Wiederaufnahme kennt schonDa-Varianten, und Foto-Glanzpapier hat mehr als eine', [r1.exit, pr2.schonDa.length > 0, pr2.schonDa.filter((x) => x.optionen.Material === 'Foto-Glanzpapier').length > 1, pr2.optionPruefung], [1, true, true, []]);
  shop.produkte.get(HANDLES.poster).variants.find((v) => v.sku === sd.sku).selectedOptions.find((x) => x.name === 'Material').value = 'Leinwand';   // jemand ändert das Material einer schon angelegten Variante
  const vor = shop.aufrufe.length;
  const r2 = await lauf({ plan: plan2, gql: shop.gql, ...cfg(dir) });
  ist('schonDa: Exit 3 VOR dem ersten Schreibaufruf, die Liste nennt genau diese Variante mit Ist- und Plan-Material', [r2.exit, shop.aufrufe.slice(vor).filter((a) => a.name !== 'productByIdentifier').length, r2.ergebnisse[0].liste.filter((x) => x === `Variante ${sd.sku}: Material «Leinwand» ≠ «Foto-Glanzpapier» (Plan)`).length], [3, 0, 1]);
  rmSync(dir, { recursive: true, force: true });
}
{ // 28h: ABWEICHUNG mitten in Schritt 4 (Lesegrenze nach dem Ergänzen eines Optionswerts) trägt den Zustandstext im Ergebnis UND in der Ausgabe
  const dir = tmp(); const plan = planVon([HANDLES.poster]);
  const shop = neuerShop(paket.bestand, { beiErsterVariantenanlage: (p) => { for (let i = 0; i < 250; i++) p.variants.push({ id: 'gid://shopify/ProductVariant/g' + i, sku: 'FILL-' + i, price: '1.00', inventoryPolicy: 'CONTINUE', selectedOptions: p.options.map((o) => ({ name: o.name, value: o.values[0] })), inventoryItem: { tracked: false } }); } });
  const L = mitLog(); const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { log: L.log }) });
  const z = r.ergebnisse[0].zustand ?? '';
  ist('ABWEICHUNG mitten in Schritt 4 (Lesegrenze beim Zurücklesen des zweiten Materials): Exit 3, Status ABWEICHUNG', [r.exit, r.ergebnisse.map((x) => x.status)], [3, ['ABWEICHUNG']]);
  wahr('ABWEICHUNG: das Ergebnis trägt den Zustandstext (Zustand nicht lesbar, Wiederaufnahme nach Behebung der Ursache)', /^Zustand poster-zum-selbstgestalten: ACHTUNG: der Zustand nach dem Abbruch ist nicht lesbar/.test(z) && /Wiederaufnahme: nach Behebung der Ursache denselben Befehl wiederholen/.test(z), z);
  wahr('ABWEICHUNG: die Ausgabe (Log) trägt denselben Zustandstext', L.zeilen.some((x) => x.includes(z) && z.length > 0), L.zeilen.join(' | ').slice(0, 300));
  rmSync(dir, { recursive: true, force: true });
}
{ // 28i: Variantenbudget – die Zählung nach JEDEM Stück ist die einzige Quelle, wenn das Lesen nach dem Abbruch scheitert (Netz tot nach Stück 1)
  const plan = planVon([HANDLES.poster, HANDLES.shirt]); const [po, sh] = plan.produkte;
  const g0 = po.neu.filter((n) => n.optionen.Material === 'Foto-Glanzpapier').length;
  const shop = neuerShop(paket.bestand, { lesenTotNach: { name: 'productVariantsBulkCreate', nr: 1 } });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(tmp(), { befundOk: alleBestaetigt(plan) }), variantenBudget: sh.neu.length + g0 - 1 });
  ist(`Budget: Lesen scheitert nach Stück 1 (${g0} bestätigte Varianten) → nur die bestätigte Zählung bleibt, sie zieht ab, das T-Shirt (${sh.neu.length}) passt nicht mehr: Exit 4 vorab`, [r.exit, r.ergebnisse.map((x) => x.status + (x.vorab ? '/vorab' : '')), shop.produkte.get(HANDLES.poster).variants.length], [4, ['FEHLER', 'TAGESLIMIT/vorab'], 4 + g0]);
  // Math.max: bestätigt sind g0, im Shop steht eine weniger (Shopify meldet Erfolg, eine SKU fehlt) → es zählt das Grössere (die Vorsicht beim Tageslimit)
  const sku = po.neu.find((n) => n.optionen.Material === 'Foto-Glanzpapier').sku;
  const shop2 = neuerShop(paket.bestand, { verschluckeSku: sku, variantenFehlerBei: 2 });
  const r2 = await lauf({ plan, gql: shop2.gql, ...cfg(tmp(), { befundOk: alleBestaetigt(plan) }), variantenBudget: sh.neu.length + g0 - 1 });
  ist(`Budget: bestätigt ${g0}, im Shop ${g0 - 1} (eine SKU verschluckt) → es zählt das Grössere (${g0}), das T-Shirt passt nicht mehr`, [r2.exit, r2.ergebnisse.map((x) => x.status + (x.vorab ? '/vorab' : '')), shop2.produkte.get(HANDLES.poster).variants.length], [4, ['FEHLER', 'TAGESLIMIT/vorab'], 4 + g0 - 1]);
}

for (const d of angelegt) rmSync(d, { recursive: true, force: true });
console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
