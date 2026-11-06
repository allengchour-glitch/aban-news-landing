#!/usr/bin/env node
// NUR RECHNEN. Aufgabe B (Selbst gestalten, 05.11.2026): Printful-Kostenschätzung (POST /orders/estimate-costs, legt KEINEN Auftrag an) für JEDE Variante, Lieferung nach CH 8001, Menge 1.
// Warum: der Katalogpreis (GET /products/variant → price) und die Schätzung weichen je Produkt um bis zu etwa ±13 % ab (GEMESSEN 05.11.2026); die Schätzung ist die Rechnung, die Printful stellen würde.
// Zahl der Aufträge (GET /orders → paging.total) wird vor und nach dem Lauf gelesen und muss gleich sein, sonst Exit 2.
// Fehlende Pflichtoptionen (z. B. stitch_color, thread_colors) werden aus der Fehlermeldung gelesen und mit dem ersten erlaubten Wert wiederholt (nur für die Schätzung).
//
// ENV: PRINTFUL_API_KEY, PRINTFUL_STORE_ID (nie ausgeben) · OUT=<Ordner mit pf_varianten.json, pf_produkte.json> · DATEI=<öffentliche Bild-URL> · PAUSE_MS=700
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.env.OUT || './kosten_daten';
const DATEI = process.env.DATEI || 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/blank-tee-white.png?v=1781027029';
const PAUSE_MS = Math.max(600, parseInt(process.env.PAUSE_MS || '700', 10) || 700);
const pause = (ms) => new Promise((s) => setTimeout(s, ms));
const lies = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d);
const H = { Authorization: 'Bearer ' + process.env.PRINTFUL_API_KEY, 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID, 'Content-Type': 'application/json' };
async function pf(method, path, body) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch('https://api.printful.com' + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 429) { await pause((parseInt(r.headers.get('retry-after') || '15', 10) + 1) * 1000); continue; }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  }
  return { status: 429, j: {} };
}
const auftraege = async () => (await pf('GET', '/orders?limit=1')).j?.paging?.total ?? null;

/** Erlaubte Werte aus einer Fehlermeldung wie «Item 'stitch_color' option missing or has an invalid value! Allowed values: white, black;…». */
export function optionenAusFehler(text) {
  const aus = [];
  for (const teil of String(text || '').split(/;(?=\s*(?:Item \d+:|Item '|[a-z_]+ option))/i)) {
    const m = teil.match(/'?([a-z][a-z_0-9]*)'? option (?:is )?(?:missing|incorrect)[^!]*!?\s*Allowed values:\s*(.+)$/i);
    if (!m) continue;
    const werte = m[2].split(',').map((x) => x.trim()).filter(Boolean);
    if (werte.length) aus.push({ id: m[1], wert: m[1] === 'thread_colors' ? [werte[0]] : werte[0], erlaubt: werte.length });
  }
  return aus;
}

async function main() {
  const c = lies(join(OUT, 'pf_varianten.json'), {});
  const k = lies(join(OUT, 'pf_produkte.json'), {});
  const f = join(OUT, 'schaetzung_alle.json'); const erg = lies(f, { ziel: 'CH 8001', waehrung: 'USD', menge: 1, datei: DATEI, vid: {} });
  const vorher = await auftraege(); console.log('Aufträge vorher:', vorher);
  const alle = Object.keys(c).filter((id) => c[id].preisUsd != null).map(Number);
  const vertreter = new Map();   // «Produkt|Katalogpreis» → erste Variante; die übrigen mit gleichem Katalogpreis übernehmen deren Schätzung
  for (const id of alle) { const key = c[id].produktId + '|' + c[id].preisUsd; if (!vertreter.has(key)) vertreter.set(key, id); }
  const vids = [...vertreter.values()];
  let n = 0;
  for (const vid of vids) {
    if (erg.vid[vid] && !erg.vid[vid].fehler) continue;
    const dateien = (k[c[vid].produktId]?.dateien || []).map((d) => d.id).filter((t) => t && t !== 'preview');
    const typen = dateien.includes('default') ? ['default'] : (dateien.includes('left_leg') ? ['right_leg', 'left_leg'] : dateien.slice(0, 1));
    const files = (typen.length ? typen : ['default']).map((type) => ({ type, url: DATEI }));
    let options = [], antwort = null;
    for (let versuch = 0; versuch < 3; versuch++) {
      antwort = await pf('POST', '/orders/estimate-costs', { recipient: { name: 'Schaetzung', address1: 'Bahnhofstrasse 1', city: 'Zuerich', country_code: 'CH', zip: '8001' },
        items: [{ variant_id: vid, quantity: 1, files, ...(options.length ? { options: options.map((o) => ({ id: o.id, value: o.wert })) } : {}) }], currency: 'USD' });
      if (antwort.status === 200) break;
      const neu = optionenAusFehler(antwort.j?.result).filter((o) => !options.some((x) => x.id === o.id));
      if (!neu.length) break;
      options = options.concat(neu); await pause(PAUSE_MS);
    }
    const co = antwort.j?.result?.costs;
    erg.vid[vid] = antwort.status === 200 && co ? { zwischensumme: co.subtotal, versand: co.shipping, steuer: co.tax, mwst: co.vat, aufpreis: co.additional_fee, digitalisierung: co.digitization, gesamt: co.total, katalog: c[vid].preisUsd, dateien: typen, optionen: options.map((o) => o.id + '=' + JSON.stringify(o.wert)) }
      : { fehler: `HTTP ${antwort.status} ${typeof antwort.j?.result === 'string' ? antwort.j.result : ''}`.trim().slice(0, 200), dateien: typen };
    n++; if (n % 20 === 0) { writeFileSync(f, JSON.stringify(erg)); console.log('Schätzungen', n, '/', vids.length); }
    await pause(PAUSE_MS);
  }
  for (const id of alle) {   // Geschwister kopieren (Versand der Schätzung gilt nur für den Vertreter; der Versand je Variante kommt aus kosten_holen.mjs)
    const v = vertreter.get(c[id].produktId + '|' + c[id].preisUsd);
    if (v !== id && erg.vid[v] && !erg.vid[v].fehler) erg.vid[id] = { ...erg.vid[v], von: v, versand: null, gesamt: null };
  }
  writeFileSync(f, JSON.stringify(erg));
  console.log('Schätzungen fertig:', Object.keys(erg.vid).length, 'Fehler', Object.values(erg.vid).filter((x) => x.fehler).length);
  const nachher = await auftraege(); console.log('Aufträge nachher:', nachher);
  if (vorher !== nachher) { console.error('ABBRUCH: Die Zahl der Aufträge hat sich geändert!'); process.exit(2); }
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
