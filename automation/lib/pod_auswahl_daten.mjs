/**
 * Datenpaket «Selbst gestalten» (dropship/pod-auswahl/*.json): Laden, Auffrischen (NUR LESENDE Abfragen) und Kürzen.
 *
 *   katalog.json       Printful-Katalog der gemeinten Produkte (GET /products/{id}, öffentlich), Textilien nur in der gewählten Farbe
 *   beschreibungen.json Printful-Beschreibungen (Englisch) als Beleg für die Materialtexte
 *   versand.json       Printful-Versand nach CH je Variante (POST /shipping/rates = reine Berechnung, schreibt nichts)
 *   bestand.json       vorhandene Shopify-Produkte (Abfrage, schreibt nichts)
 *   sku_pruefung.json  was die vorhandenen SKUs bei Printful WIRKLICH sind (GET /products/variant/{id})
 *   sku_index.json     welche Printful-Variantennummern des Katalogs im Shop schon in ANDEREN Produkten als SKU «<Präfix>_<Nummer>» vorkommen (Abfrage)
 *
 * Alles hier ist lesend. Die Netzfunktionen nehmen `fetchFn` entgegen (Tests reichen eine Attrappe hinein).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const PAKET_DIR = fileURLToPath(new URL('../../dropship/pod-auswahl/', import.meta.url));
export const DATEIEN = Object.freeze({ katalog: 'katalog.json', beschreibungen: 'beschreibungen.json', versand: 'versand.json', bestand: 'bestand.json', skuPruefung: 'sku_pruefung.json', skuIndex: 'sku_index.json' });

const lies = (pfad) => JSON.parse(readFileSync(pfad, 'utf8'));
export function schreibeJson(pfad, daten) {   // atomar: erst .tmp, dann umbenennen (eine volle Platte hinterlässt keine halbe Datei)
  mkdirSync(dirname(pfad), { recursive: true });
  writeFileSync(pfad + '.tmp', JSON.stringify(daten, null, 1) + '\n');
  renameSync(pfad + '.tmp', pfad);
}

/** Lädt das Datenpaket. `pfade` überschreibt einzelne Dateien (z. B. VERSAND=/tmp/pod/versand_cache.json). */
export function ladePaket({ dir = PAKET_DIR, pfade = {} } = {}) {
  const p = (k) => pfade[k] || join(dir, DATEIEN[k]);
  const roh = {};
  for (const k of Object.keys(DATEIEN)) {
    const f = p(k);
    if (!existsSync(f)) throw new Error(`pod_auswahl: Datei fehlt: ${f}`);
    roh[k] = lies(f);
  }
  return {
    katalog: roh.katalog.produkte, beschreibungen: roh.beschreibungen.eintraege, versand: roh.versand.raten, bestand: roh.bestand.produkte, skuPruefung: roh.skuPruefung.varianten,
    skuIndex: roh.skuIndex.treffer, skuIndexAbgeschnitten: roh.skuIndex.abgeschnitten || [],
    meta: { katalog: { quelle: roh.katalog.quelle, stand: roh.katalog.stand }, beschreibungen: { stand: roh.beschreibungen.stand }, versand: { stand: roh.versand.stand, ziel: roh.versand.ziel }, bestand: { stand: roh.bestand.stand }, skuPruefung: { stand: roh.skuPruefung.stand },
      skuIndex: { stand: roh.skuIndex.stand, produkteGelesen: roh.skuIndex.produkteGelesen ?? null } },
  };
}

// ─────────────────────────────────────────────────────────────── Alter des Datenpakets (LIVE verweigert veraltete Daten)
/** Höchstalter der Printful-Daten (Katalog mit EU-Lager und Einkaufspreisen, Beschreibungen, Versandraten, SKU-Prüfung) bei LIVE=1. Ausdrücklich änderbar: DATEN_MAX_ALTER_H. */
export const DATEN_MAX_ALTER_H = 72;

/** Wie weit ein Stand in der Zukunft liegen darf (Uhrenabweichung zwischen zwei Rechnern), ohne dass er verdächtig wird. Ein Datum weiter vorn gilt als NICHT frisch (Tippfehler im Jahr, falsch gehende Uhr). */
export const ZUKUNFT_TOLERANZ_H = 1;

/** Alter in Stunden eines Standes «JJJJ-MM-TT» (0 Uhr UTC); null, wenn der Stand fehlt oder kein Datum ist. Negativ = der Stand liegt in der Zukunft. */
export function standAlterH(stand, jetzt = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(stand ?? ''))) return null;
  const t = Date.parse(`${stand}T00:00:00Z`);
  return Number.isFinite(t) ? (jetzt.getTime() - t) / 3.6e6 : null;
}

/**
 * Welche Dateien des Datenpakets sind älter als `maxStunden` (oder haben keinen lesbaren Stand)? Leere Liste = frisch genug.
 * Geprüft werden die Dateien, die Preise, Lager und Texte bei Printful festhalten: katalog, beschreibungen, versand, skuPruefung. Ein Stand in der Zukunft (mehr als ZUKUNFT_TOLERANZ_H) zählt wie ein unlesbarer: nicht frisch.
 * Der Shopify-Bestand und der SKU-Index zählen nicht: sie werden bei LIVE ohnehin frisch aus dem Shop gelesen.
 */
export function pruefeDatenAlter(meta, { jetzt = new Date(), maxStunden = DATEN_MAX_ALTER_H } = {}) {
  const out = [];
  for (const k of ['katalog', 'beschreibungen', 'versand', 'skuPruefung']) {
    const stand = meta?.[k]?.stand, h = standAlterH(stand, jetzt);
    if (h === null) out.push({ datei: DATEIEN[k], stand: stand ?? null, alterH: null, grund: `${DATEIEN[k]}: kein lesbarer Stand` });
    else if (h < -ZUKUNFT_TOLERANZ_H) out.push({ datei: DATEIEN[k], stand, alterH: Math.round(h), grund: `${DATEIEN[k]}: Stand ${stand} liegt in der Zukunft (Uhr falsch oder Datum vertippt?), er gilt als nicht frisch` });
    else if (h > maxStunden) out.push({ datei: DATEIEN[k], stand, alterH: Math.round(h), grund: `${DATEIEN[k]}: Stand ${stand} ist ${Math.round(h)} Stunden alt (erlaubt: ${maxStunden})` });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────── Printful (lesend)
const pfKopf = (key, store, json = false) => { const h = { Authorization: 'Bearer ' + key }; if (store) h['X-PF-Store-Id'] = store; if (json) h['Content-Type'] = 'application/json'; return h; };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET mit Geduld bei 429 (Retry-After). Gibt {status, j} zurück. */
export async function pfGet(pfad, { key, store, fetchFn = fetch, versuche = 4, pause = warte } = {}) {
  for (let i = 0; i < versuche; i++) {
    const r = await fetchFn('https://api.printful.com' + pfad, { headers: pfKopf(key, store) });
    if (r.status === 429) { await pause((parseInt(r.headers?.get?.('retry-after') || '20', 10) + 1) * 1000); continue; }
    const j = await r.json().catch(() => ({}));
    return { status: r.status, j };
  }
  return { status: 429, j: {} };
}

/**
 * Vor dem Schreiben jede NEUE Variante des Plans bei Printful nachfragen (GET /products/variant/<id>, nur lesend): Einkaufspreis wie im Plan, EU-Lager lieferbar.
 * Gibt die Abweichungen zurück (leer = alles wie geplant). Eine Variante, die nicht lesbar ist, zählt als Abweichung (nichts raten).
 */
export async function pruefeNeueVarianten(plan, { key, store, fetchFn = fetch, pause = warte, pauseMs = 700, log = () => {} } = {}) {
  const abw = []; const gesehen = new Set(); let n = 0;
  for (const p of plan.produkte) for (const v of p.neu) {
    if (gesehen.has(v.pf)) continue; gesehen.add(v.pf);
    const { status, j } = await pfGet('/products/variant/' + v.pf, { key, store, fetchFn, pause });
    n++; await pause(pauseMs);
    const pv = j?.result?.variant;
    if (status !== 200 || !pv) { abw.push(`Printful ${v.pf} (${v.sku}): nicht lesbar (HTTP ${status})`); continue; }
    if (!(Math.abs(Number(pv.price) - Number(v.einkaufUsd)) <= 0.005)) abw.push(`Printful ${v.pf} (${v.sku}): Einkauf jetzt ${pv.price} USD, im Plan ${Number(v.einkaufUsd).toFixed(2)} USD`);
    const eu = Array.isArray(pv.availability_status) ? pv.availability_status.find((a) => a.region === 'EU')?.status : undefined;
    if (eu === undefined ? pv.in_stock !== true : eu !== 'in_stock') abw.push(`Printful ${v.pf} (${v.sku}): Lager EU jetzt ${eu ?? (pv.in_stock === true ? 'in_stock' : 'nicht lieferbar')}, im Plan lieferbar`);
  }
  log(`Gegenprüfung bei Printful: ${n} Varianten gelesen, ${abw.length} Abweichungen`);
  return abw;
}

/** Katalogprodukte holen und kürzen: Textilien nur in `farbe`; Felder wie im Datenpaket. */
export function kuerzeProdukt(p, farbe = null) {
  const vs = (p.variants || []).map((x) => ({
    id: x.id, name: x.name, size: x.size, color: x.color, price: x.price, in_stock: x.in_stock,
    eu: (x.availability_status && x.availability_status.find((a) => a.region === 'EU')?.status) ?? (x.avail && x.avail.EU) ?? null,
  }));
  return { id: p.product?.id ?? p.id, title: p.product?.title ?? p.title, type: p.product?.type ?? p.type,
    files: (p.product?.files || p.files || []).map((f) => (typeof f === 'string' ? f : `${f.id}:${f.title}`)),
    variants: farbe ? vs.filter((v) => v.color === farbe) : vs };
}

/** Kürzt einen vorhandenen Roh-Schnappschuss (/tmp/pod/katalog_pod.json) auf die gebrauchten Produkte. */
export function kuerzeRohKatalog(roh, ids, farben = {}) {
  const out = {};
  for (const id of ids) {
    const p = roh[String(id)];
    if (!p) throw new Error(`pod_auswahl: Produkt ${id} fehlt im Roh-Katalog`);
    const farbe = farben[id] ?? null;
    out[String(id)] = {
      id: p.id, title: p.title, type: p.type, files: p.files,
      variants: p.variants.filter((v) => !farbe || v.color === farbe).map((v) => ({ id: v.id, name: v.name, size: v.size, color: v.color, price: v.price, in_stock: v.in_stock, eu: (v.avail && v.avail.EU) ?? null })),
    };
  }
  return out;
}

/** Eine Versandrate (Standard, sonst die billigste) nach CH für EINE Variante, in USD. Reine Berechnung bei Printful. */
export async function holeVersandRate(vid, { key, store, fetchFn = fetch, versuche = 4, pause = warte, heute = new Date().toISOString().slice(0, 10) } = {}) {
  for (let i = 0; i < versuche; i++) {
    const r = await fetchFn('https://api.printful.com/shipping/rates', { method: 'POST', headers: pfKopf(key, store, true),
      body: JSON.stringify({ recipient: { country_code: 'CH', zip: '8001' }, items: [{ variant_id: vid, quantity: 1 }], currency: 'USD' }) });
    if (r.status === 429) { await pause((parseInt(r.headers?.get?.('retry-after') || '20', 10) + 1) * 1000); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { fehler: `HTTP ${r.status} ${typeof j.result === 'string' ? j.result : j.error?.message || ''}`.trim().slice(0, 140) };
    const liste = (j.result || []).filter((x) => x && Number.isFinite(parseFloat(x.rate)));
    if (!liste.length) return { fehler: 'keine Versandart für CH' };
    const wahl = liste.find((x) => x.id === 'STANDARD') || liste.slice().sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
    return { usd: parseFloat(wahl.rate), id: wahl.id, name: wahl.name, tage: [wahl.minDeliveryDays ?? null, wahl.maxDeliveryDays ?? null], gemessen: heute };
  }
  return { fehler: 'Rate-Limit (429) nach mehreren Versuchen' };
}

/** Fehlende Raten nachholen (900 ms Pause zwischen den Aufrufen), `raten` wird fortlaufend ergänzt; `sichern()` nach jeder Rate. */
export async function holeFehlendeRaten(ids, raten, { key, store, fetchFn = fetch, pauseMs = 900, pause = warte, sichern = () => {}, erneut = false, log = () => {} } = {}) {
  let geholt = 0;
  for (const id of ids) {
    const vorhanden = raten[String(id)];
    if (vorhanden && (typeof vorhanden.usd === 'number' || !erneut)) continue;
    raten[String(id)] = await holeVersandRate(id, { key, store, fetchFn, pause });
    geholt++; sichern(); log(id, raten[String(id)]);
    await pause(pauseMs);
  }
  return geholt;
}

/** Was ist die vorhandene SKU bei Printful wirklich? GET /products/variant/{id}. */
export async function holeSkuIdentitaet(vid, opt) {
  const { status, j } = await pfGet('/products/variant/' + vid, opt);
  const v = j?.result?.variant, p = j?.result?.product;
  if (status !== 200 || !v || !p) return { fehler: `HTTP ${status}` };
  return { produkt: p.id, typ: p.type, name: v.name, farbe: v.color ?? null, groesse: v.size ?? null, preisUsd: Number(v.price), imLager: v.in_stock === true };
}

// ─────────────────────────────────────────────────────────────── Shopify (lesend)
/**
 * OPTIONEN LESEN: IMMER über `optionValues { id name hasVariants }`, NIE über `ProductOption.values`. Shopify-Schema: `values` = «The corresponding value to the product option name»
 * (Werte OHNE jede Variante fehlen dort), `optionValues` = «all the corresponding option value objects to the product option, including values not assigned to any variants».
 * Beleg: Doku productOptionUpdate, Beispiel «Add and update product option values» (Antwort `values: ["Purple"]`, `optionValues`: Purple hasVariants true, Yellow false, Red false).
 * Ein liegengebliebener leerer Wert (Abbruch, Aufräumen gescheitert) wäre über `values` für die Wiederaufnahme UNSICHTBAR. Die ID aus optionValues braucht productOptionUpdate/optionValuesToDelete.
 * Eine Stelle für alle Lesepfade (Bestand, frisches Lesen, Antworten der Schreibaufrufe).
 */
export const OPTIONEN_FELDER = 'options{ id name position optionValues{ id name hasVariants } }';

/**
 * Optionen einer Shopify-Antwort (Auswahl OPTIONEN_FELDER) → Form des Werkzeugs: {id, name, position, values, optionValues}.
 * `values` = Namen ALLER Optionswerte (aus optionValues), auch derer ohne Variante: das ist die EXISTENZ eines Werts, nicht Shopifys `ProductOption.values`.
 * `optionValues` = [{id, name, hasVariants}]: die ID für optionValuesToDelete, hasVariants = «leer» (false). Fehlt optionValues in der Antwort, wird geworfen:
 * ein stiller Rückgriff auf `values` brächte den Fehler (leere Werte unsichtbar) unbemerkt zurück.
 */
export function optionenAusAntwort(options, wo = 'Antwort') {
  return (options || []).map((o) => {
    if (!Array.isArray(o.optionValues)) throw new Error(`${wo}: Option «${o.name}» ohne optionValues (die Abfrage muss OPTIONEN_FELDER lesen; ProductOption.values nennt Werte ohne Variante nicht)`);
    const optionValues = o.optionValues.map((v) => ({ id: v.id, name: v.name, hasVariants: v.hasVariants }));
    return { id: o.id, name: o.name, position: o.position, values: optionValues.map((v) => v.name), optionValues };
  });
}

export const BESTAND_Q = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status productType vendor tags descriptionHtml seo{ title description }
  materialMetafeld: metafield(namespace:"mm-google-shopping", key:"material"){ value }
  ${OPTIONEN_FELDER}
  variants(first:250){ edges{ node{ id sku price inventoryPolicy selectedOptions{ name value } } } } } }`;

export const ohneKnoten = (p) => ({
  id: p.id, handle: p.handle, title: p.title, status: p.status, productType: p.productType, vendor: p.vendor, tags: p.tags, descriptionHtml: p.descriptionHtml, seo: p.seo,
  // Form des Datenpakets bleibt {name, position, values}: der Plan braucht nur die NAMEN aller vorhandenen Werte (inkl. leerer); IDs und hasVariants gehören zum frischen Lesen (Schreibweg), nicht in ein Paket, das veraltet.
  options: optionenAusAntwort(p.options, `Produkt ${p.handle}`).map((o) => ({ name: o.name, position: o.position, values: o.values })),
  variants: p.variants.edges.map((e) => ({ id: e.node.id, sku: e.node.sku, price: e.node.price, inventoryPolicy: e.node.inventoryPolicy, selectedOptions: e.node.selectedOptions })),
  // Produkt-Metafeld mm-google-shopping.material: EIN Wert je Produkt (speist Merchant-Attribut UND die Zeile «Material» in «Spezifikationen & Details»). Fehlt der Schlüssel, wurde es nicht gelesen.
  ...('materialMetafeld' in p ? { materialMetafeld: p.materialMetafeld?.value ?? null } : {}),
});

/** `gql(query, variables)` → Antwort-JSON. Liest die vorhandenen Produkte (nur Abfrage). */
export async function leseBestand(gql, handles) {
  const out = {};
  for (const h of handles) {
    const j = await gql(BESTAND_Q, { h });
    if (j.errors) throw new Error('Shopify-Abfrage: ' + JSON.stringify(j.errors).slice(0, 200));
    const p = j.data?.productByIdentifier;
    if (!p) throw new Error(`Produkt «${h}» nicht gefunden`);
    out[h] = ohneKnoten(p);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────── SKU-Index: gibt es die Printful-Variante im Shop schon in einem anderen Produkt?
/** Alle Produkte, die Printful-SKUs («<Präfix>_<Zahl>») tragen können: Tags der POD-Familie ODER eine SKU mit Unterstrich (Suche wie bei der Prüfung am 27.10.2026: 491 Produkte). */
export const SKU_INDEX_SUCHE = 'tag:wunschdesign OR tag:printful_personalized_product OR sku:*_*';
export const SKU_INDEX_Q = `query($q:String!,$c:String){ products(first:50, query:$q, after:$c){ pageInfo{ hasNextPage endCursor } edges{ node{ handle title status tags
  variants(first:100){ pageInfo{ hasNextPage } edges{ node{ sku price selectedOptions{ name value } } } } } } } }`;

/**
 * Printful-Variantennummern, die der Plan als NEUE Variante anlegen könnte: alle Katalogvarianten der Produkte hinter den neuen Materialien
 * (nicht die der vorhandenen Materialien: diese SKUs tragen die Zielprodukte selbst und viele fertige Motiv-Produkte auf gleichem Rohling mit Absicht).
 */
export function kandidatenIds(spec, katalog) {
  const ids = new Set();
  for (const s of spec) for (const m of s.materialien) {
    if (m.bestand) continue;
    for (const v of katalog[String(m.printfulProdukt)]?.variants || []) ids.add(v.id);
  }
  return [...ids].sort((a, b) => a - b);
}

/**
 * Rein: Produkt-Knoten (Antwort von SKU_INDEX_Q) → Treffer je Printful-Variantennummer. Eigene Produkte (`eigeneHandles`) zählen nicht, ebenso keine SKU ohne «_<Zahl>».
 * Produkte mit mehr als 100 Varianten sind nur zu Teilen gelesen: ihre Handles stehen in `abgeschnitten` (der Plan meldet dann «Index unvollständig»).
 */
export function baueSkuIndex(produkte, pfIds, eigeneHandles = []) {
  const ids = new Set(pfIds.map(String)), eigene = new Set(eigeneHandles), treffer = {}, abgeschnitten = [];
  for (const p of produkte) {
    if (eigene.has(p.handle)) continue;
    if (p.variants?.pageInfo?.hasNextPage) abgeschnitten.push(p.handle);
    for (const e of p.variants?.edges || []) {
      const v = e.node, m = String(v.sku || '').match(/_(\d+)\s*$/);
      if (!m || !ids.has(m[1])) continue;
      (treffer[m[1]] ||= []).push({ handle: p.handle, titel: p.title, status: p.status, tags: [...(p.tags || [])].sort(), sku: v.sku, preis: v.price, optionen: (v.selectedOptions || []).map((o) => o.value).join(' / ') });
    }
  }
  for (const k of Object.keys(treffer)) treffer[k].sort((a, b) => a.handle.localeCompare(b.handle) || a.sku.localeCompare(b.sku));
  return { treffer, abgeschnitten: abgeschnitten.sort() };
}

/** `gql(query, variables)` → Antwort-JSON. Liest ALLE Seiten (nur Abfrage). Wirft bei GraphQL-Fehlern, statt einen unvollständigen Index zu liefern. */
export async function leseSkuIndex(gql, pfIds, eigeneHandles = []) {
  const produkte = []; let cursor = null;
  do {
    const j = await gql(SKU_INDEX_Q, { q: SKU_INDEX_SUCHE, c: cursor });
    if (j.errors) throw new Error('SKU-Index-Abfrage: ' + JSON.stringify(j.errors).slice(0, 200));
    const seite = j.data?.products;
    if (!seite) throw new Error('SKU-Index-Abfrage: Antwort ohne products');
    produkte.push(...seite.edges.map((e) => e.node));
    cursor = seite.pageInfo.hasNextPage ? seite.pageInfo.endCursor : null;
  } while (cursor);
  return { produkteGelesen: produkte.length, ...baueSkuIndex(produkte, pfIds, eigeneHandles) };
}

// ─────────────────────────────────────────────────────────────── was die Spezifikation an Daten braucht
/** Printful-Produkte, die im Katalog-Datenpaket stehen müssen. */
export const katalogIdsAusSpec = (spec) => [...new Set(spec.flatMap((s) => s.materialien.map((m) => m.printfulProdukt)))].sort((a, b) => a - b);
/** Farbe je Textil-Produkt (Textilien werden nur in dieser Farbe gespeichert). */
export function farbenAusSpec(spec) {
  const f = {};
  for (const s of spec) for (const m of s.materialien) {
    const farbe = m.zuordnung?.farbe ?? (m.bestand ? s.bestand.farbe : null);
    if (farbe) f[m.printfulProdukt] = farbe;
  }
  return f;
}
/** Printful-Produkte, deren Beschreibung als Beleg dient. */
export const belegIdsAusSpec = (spec) => [...new Set(spec.flatMap((s) => s.vergleich.flatMap((e) => e.fakten.flatMap((x) => [x.b.p, ...(x.b.vergleichMit ? [x.b.vergleichMit] : [])]))))].sort((a, b) => a - b);
