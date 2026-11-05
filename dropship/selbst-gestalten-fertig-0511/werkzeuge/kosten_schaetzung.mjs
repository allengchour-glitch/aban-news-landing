#!/usr/bin/env node
// NUR RECHNEN. Aufgabe B (Selbst gestalten, 05.11.2026): Printful-Kostenschätzung für eine Lieferung nach CH 8001 OHNE Auftrag.
// POST /orders/estimate-costs ist laut Printful-Doku eine reine Berechnung; die Zahl der Aufträge (GET /orders → paging.total) wird vor und nach dem Lauf gelesen
// und muss gleich sein, sonst bricht das Skript mit Exit 2 ab.
// Je Printful-Produkt: eine Variante, Menge 1 und 2 mit der Standard-Druckdatei («default»), dazu je Zusatzplatzierung mit Aufpreis eine Schätzung
// «default + Platzierung». Vergleicht Katalogpreis (GET /products/variant) und Schätzung (Zwischensumme, Versand, Steuer).
//
// ENV: PRINTFUL_API_KEY, PRINTFUL_STORE_ID (nie ausgeben) · OUT=<Ordner mit pf_varianten.json, pf_produkte.json, shop_preise.json> · DATEI=<öffentliche Bild-URL>
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.env.OUT || './kosten_daten';
const DATEI = process.env.DATEI || 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/blank-tee-white.png?v=1781027029';
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

const c = lies(join(OUT, 'pf_varianten.json'), {});
const k = lies(join(OUT, 'pf_produkte.json'), {});
const f = join(OUT, 'schaetzung_ch.json');
const erg = lies(f, { ziel: 'CH 8001', waehrung: 'USD', proProdukt: {} });
const vorher = await auftraege();
console.log('Aufträge vorher:', vorher);

const proProdukt = {};
for (const [vid, x] of Object.entries(c)) if (x.preisUsd != null) (proProdukt[x.produktId] ||= []).push(Number(vid));

const schaetze = async (items) => {
  const a = await pf('POST', '/orders/estimate-costs', { recipient: { name: 'Schaetzung', address1: 'Bahnhofstrasse 1', city: 'Zuerich', country_code: 'CH', zip: '8001' }, items, currency: 'USD' });
  if (a.status !== 200) return { fehler: `HTTP ${a.status} ${typeof a.j.result === 'string' ? a.j.result : ''}`.trim().slice(0, 160) };
  const co = a.j.result?.costs || {};
  return { zwischensumme: co.subtotal, versand: co.shipping, steuer: co.tax, mwst: co.vat, aufpreis: co.additional_fee, digitalisierung: co.digitization, gesamt: co.total, extra: a.j.extra };
};

for (const [pid, vids] of Object.entries(proProdukt)) {
  if (erg.proProdukt[pid]?.q1 && !erg.proProdukt[pid].q1.fehler) continue;
  const vid = vids.slice().sort((a, b) => c[a].preisUsd - c[b].preisUsd)[0];   // billigste Variante des Produkts
  const e = { vid, katalogUsd: c[vid].preisUsd, titel: c[vid].produktTitel };
  e.q1 = await schaetze([{ variant_id: vid, quantity: 1, files: [{ type: 'default', url: DATEI }] }]); await pause(800);
  e.q2 = await schaetze([{ variant_id: vid, quantity: 2, files: [{ type: 'default', url: DATEI }] }]); await pause(800);
  e.platzierungen = {};
  for (const d of k[pid]?.dateien || []) {
    const ap = parseFloat(d.aufpreis);
    if (!Number.isFinite(ap) || ap <= 0 || d.typ === 'default' || d.typ === 'preview') continue;
    e.platzierungen[d.typ] = { katalogAufpreisUsd: ap, ...(await schaetze([{ variant_id: vid, quantity: 1, files: [{ type: 'default', url: DATEI }, { type: d.typ, url: DATEI }] }])) };
    await pause(800);
  }
  erg.proProdukt[pid] = e;
  writeFileSync(f, JSON.stringify(erg, null, 1));
  console.log(pid, e.titel?.slice(0, 40), 'Katalog', e.katalogUsd, 'Schätzung', e.q1.zwischensumme, 'Versand', e.q1.versand, 'Steuer', e.q1.steuer, e.q1.fehler || '');
}
const nachher = await auftraege();
console.log('Aufträge nachher:', nachher);
if (vorher !== nachher) { console.error('ABBRUCH: Die Zahl der Aufträge hat sich geändert!'); process.exit(2); }
