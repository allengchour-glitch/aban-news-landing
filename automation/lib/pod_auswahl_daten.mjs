/**
 * Datenpaket «Selbst gestalten» (dropship/pod-auswahl/*.json): Laden, Auffrischen (NUR LESENDE Abfragen) und Kürzen.
 *
 *   katalog.json       Printful-Katalog der gemeinten Produkte (GET /products/{id}, öffentlich), Textilien nur in der gewählten Farbe
 *   beschreibungen.json Printful-Beschreibungen (Englisch) als Beleg für die Materialtexte
 *   versand.json       Printful-Versand nach CH je Variante (POST /shipping/rates = reine Berechnung, schreibt nichts)
 *   bestand.json       vorhandene Shopify-Produkte (Abfrage, schreibt nichts)
 *   sku_pruefung.json  was die vorhandenen SKUs bei Printful WIRKLICH sind (GET /products/variant/{id})
 *
 * Alles hier ist lesend. Die Netzfunktionen nehmen `fetchFn` entgegen (Tests reichen eine Attrappe hinein).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const PAKET_DIR = fileURLToPath(new URL('../../dropship/pod-auswahl/', import.meta.url));
export const DATEIEN = Object.freeze({ katalog: 'katalog.json', beschreibungen: 'beschreibungen.json', versand: 'versand.json', bestand: 'bestand.json', skuPruefung: 'sku_pruefung.json' });

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
    meta: { katalog: { quelle: roh.katalog.quelle, stand: roh.katalog.stand }, versand: { stand: roh.versand.stand, ziel: roh.versand.ziel }, bestand: { stand: roh.bestand.stand }, skuPruefung: { stand: roh.skuPruefung.stand } },
  };
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
export const BESTAND_Q = `query($h:String!){ productByHandle(handle:$h){ id handle title status productType vendor tags descriptionHtml seo{ title description }
  options{ name position values }
  variants(first:250){ edges{ node{ id sku price inventoryPolicy selectedOptions{ name value } } } } } }`;

export const ohneKnoten = (p) => ({
  id: p.id, handle: p.handle, title: p.title, status: p.status, productType: p.productType, vendor: p.vendor, tags: p.tags, descriptionHtml: p.descriptionHtml, seo: p.seo,
  options: p.options.map((o) => ({ name: o.name, position: o.position, values: o.values })),
  variants: p.variants.edges.map((e) => ({ id: e.node.id, sku: e.node.sku, price: e.node.price, inventoryPolicy: e.node.inventoryPolicy, selectedOptions: e.node.selectedOptions })),
});

/** `gql(query, variables)` → Antwort-JSON. Liest die vorhandenen Produkte (nur Abfrage). */
export async function leseBestand(gql, handles) {
  const out = {};
  for (const h of handles) {
    const j = await gql(BESTAND_Q, { h });
    if (j.errors) throw new Error('Shopify-Abfrage: ' + JSON.stringify(j.errors).slice(0, 200));
    const p = j.data?.productByHandle;
    if (!p) throw new Error(`Produkt «${h}» nicht gefunden`);
    out[h] = ohneKnoten(p);
  }
  return out;
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
export const belegIdsAusSpec = (spec) => [...new Set(spec.flatMap((s) => s.vergleich.flatMap((e) => e.fakten.map((x) => x.b.p))))].sort((a, b) => a - b);
