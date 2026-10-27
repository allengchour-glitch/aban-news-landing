#!/usr/bin/env node
/**
 * Optionswerte reparieren, die der Auswahl-Lauf bis 27.10.2026 mit drei Mängeln geschrieben hat:
 *   (a) gemischte Farbwörter: «Gold black», «Gold white» (der Anfang «Gold» galt als «bereits deutsch») → «Gold / Schwarz», «Gold / Weiss»
 *   (b) Modell-Kürzel unter «Farbe»: «A, B, C, D» → Option «Modell», Werte «Modell A» …
 *   (c) Schuhgrössen mit englischem «To»: «36 To 37» → «36–37» (Option «Grösse»)
 * Alles erzeugt `lib/cj_varianten.mjs` jetzt richtig; hier werden die schon geschriebenen Produkte nachgezogen.
 *
 * Liest alle aktiven Produkte per Bulk-Abfrage (keine CJ-Punkte), rechnet mit denselben reinen Funktionen wie der Lauf.
 * TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Namen ändern sich — Varianten, Preise, Bilder, Bestellungen bleiben.
 * Schalter: LIMIT=n (nur die ersten n Produkte schreiben), NEU=1 (Zwischenspeicher /tmp/optionen_bulk.jsonl ignorieren)
 */
import { readFileSync, writeFileSync, existsSync, statSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { farbeDeutsch, groesseNormal } from './lib/cj_varianten.mjs';

const LIVE = process.env.LIVE === '1', LIMIT = Number(process.env.LIMIT || 1e9), CACHE = '/tmp/optionen_bulk.jsonl';
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const istCode = x => /^[a-z]$/i.test(String(x).trim());   // nur Buchstaben — Zahlen sind oft Ringgrössen

/** Schuhgrössen «36 To 37» (englisches «To» zwischen zwei Zahlen, bis PR #2755 vom Lauf so geschrieben) → «36–37».
 *  Nur dieses Muster; andere Grössenwerte bleiben unangetastet. Zwei Werte dürfen nicht denselben Namen bekommen. */
function planeGroesse(werte) {
  const liste = [...new Set(werte)], map = {};
  for (const w of liste) {
    if (!/^\d{1,3}(?:[.,]\d)?\s*to\s*\d{1,3}(?:[.,]\d)?$/i.test(w.trim())) continue;
    const neu = groesseNormal(w);
    if (neu !== w) map[w] = neu;
  }
  if (!Object.keys(map).length) return null;
  const danach = liste.map(w => map[w] ?? w);
  if (new Set(danach).size !== danach.length) return null;
  return { art: 'groesse', werte: map };
}

/** Reiner Plan für EINE Option → null (nichts zu tun) oder { neuerName?, werte: {alt: neu}, art }. Getestet in optionen_reparieren_test.mjs. */
export function planeOption(name, werte, optionsNamen = []) {
  if (/^(gr(?:ö|o|oe)(?:ss|ß)e|size)$/i.test(name.trim())) return planeGroesse(werte);
  if (!/^farbe$/i.test(name)) return null;
  const liste = [...new Set(werte)];
  if (liste.length >= 2 && liste.filter(istCode).length / liste.length >= 0.5) {
    const map = {}; let unsicher = false;
    for (const w of liste) {
      if (istCode(w)) map[w] = `Modell ${w.trim().toUpperCase()}`;
      else { const f = farbeDeutsch(w); if (!f.sicher) unsicher = true; else if (f.text !== w) map[w] = f.text; }
    }
    if (unsicher) return null;    // ein unbekanntes Wort daneben: nicht raten
    if (optionsNamen.some(n => /^modell$/i.test(String(n).trim()))) return null;    // Option «Modell» gibt es schon (Shopify: OPTION_ALREADY_EXISTS) — Bedeutung von A/B nicht raten
    return { art: 'modell', neuerName: 'Modell', werte: map };
  }
  const map = {};
  // Nur MEHRWORT-Werte mit englischem Rest («Gold black»). Einwort-Werte («Pink», «Gray») sind nicht Gegenstand dieses Fehlers und bleiben unangetastet.
  for (const w of liste) { if (!/[\s/&+,-]/.test(w.trim())) continue; const f = farbeDeutsch(w); if (f.sicher && f.text !== w) map[w] = f.text; }
  if (!Object.keys(map).length) return null;
  // Zwei Werte dürfen nicht denselben Namen bekommen (Varianten würden verschmelzen)
  const danach = liste.map(w => map[w] ?? w);
  if (new Set(danach).size !== danach.length) return null;
  return { art: 'farbe', werte: map };
}

export async function bulk(q) {
  if (process.env.NEU !== '1' && existsSync(CACHE) && Date.now() - statSync(CACHE).mtimeMs < 20 * 60 * 1000) return readFileSync(CACHE, 'utf8');
  const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
  if (lauf && ['CREATED', 'RUNNING'].includes(lauf.status)) throw new Error('Es läuft schon eine Bulk-Abfrage — abwarten');
  const inner = `{ products(query:"status:active") { edges { node { id handle variantsCount{count} options{id name values} } } } }`;
  const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
  if (m.userErrors?.length) throw new Error(JSON.stringify(m.userErrors));
  for (let i = 0; i < 240; i++) {
    await schlaf(15000);
    const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode url}}`)).currentBulkOperation;
    if (s.status === 'COMPLETED') { const t = await (await fetch(s.url)).text(); writeFileSync(CACHE, t); return t; }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) throw new Error(`Bulk ${s.status} ${s.errorCode || ''}`);
  }
  throw new Error('Bulk-Abfrage dauert zu lange');
}

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const roh = await bulk(q);
  const aufgaben = [];
  let gelesen = 0;
  for (const z of roh.split('\n')) {
    if (!z) continue; const p = JSON.parse(z); if (!p.options) continue; gelesen++;
    for (const o of p.options) { const pl = planeOption(o.name, o.values || [], p.options.map(x => x.name)); if (pl) aufgaben.push({ id: p.id, handle: p.handle, optionId: o.id, optionName: o.name, ...pl }); }
  }
  const nach = a => aufgaben.filter(x => x.art === a);
  console.log(`Produkte gelesen: ${gelesen} · Aufgaben: ${aufgaben.length} (Modell-Kürzel ${nach('modell').length}, gemischte Farbwörter ${nach('farbe').length}, Grössen mit «To» ${nach('groesse').length})`);
  for (const a of aufgaben.slice(0, 8)) console.log(`  ${a.handle.slice(0, 44)} · ${a.optionName}${a.neuerName ? ' → ' + a.neuerName : ''}: ${Object.entries(a.werte).slice(0, 4).map(([k, v]) => `«${k}»→«${v}»`).join(', ')}`);
  if (!LIVE) { console.log('\nTrockenlauf — nichts geschrieben.'); return; }

  let ok = 0, fehler = 0;
  for (const a of aufgaben.slice(0, LIMIT)) {
    try {
      const p = (await q(`query($id:ID!){product(id:$id){options{id name optionValues{id name}}}}`, { id: a.id })).product;
      const o = p?.options.find(x => x.id === a.optionId); if (!o) continue;
      const werte = o.optionValues.filter(v => a.werte[v.name]).map(v => ({ id: v.id, name: a.werte[v.name] }));
      const opt = { id: a.optionId, ...(a.neuerName ? { name: a.neuerName } : {}) };
      const d = (await q(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$v){userErrors{message code}}}`, { p: a.id, o: opt, v: werte })).productOptionUpdate;
      if (d.userErrors.length) { fehler++; console.log('  ✗', a.handle, JSON.stringify(d.userErrors).slice(0, 160)); continue; }
      appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · optionen-repariert ${a.handle} ${a.art}\n`);
      ok++;
    } catch (e) { fehler++; console.log('  ✗', a.handle, e.message.slice(0, 120)); }
  }
  console.log(`\nREPARIERT: ${ok} · Fehler ${fehler}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
