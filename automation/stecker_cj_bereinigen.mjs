#!/usr/bin/env node
/**
 * Fremdstecker-Varianten aus dem Shop nehmen, erkannt am CJ-Datenblatt (nicht am Shop-Text). Regeln: lib/stecker_cj.mjs (getestet).
 *
 * WARUM (26.10.2026): stecker_bereinigen.mjs prüft den Optionstext im Shop. Der Auswahl-Lauf hatte aus CJ-Varianten «White-US | Pink-US | Blue-US» aber die Farben
 * «Weiss | Rosa | Blau» gemacht — der Stecker stand nirgends mehr. Gemessen: 34 aktive Produkte, 85 Varianten mit US/UK/AU-Stecker.
 *
 * Eingabe A (Vorgabe): der CJ-Zwischenspeicher /tmp/cj_fakten_cache/<handle>.json (schreiben cj_varianten_nachziehen.mjs und cj_fakten_block.mjs; CACHE_DIR ändert den Ordner).
 * Eingabe B (QUELLE=shop): die Optionswerte ALLER Shop-Varianten aus einer Bulk-Abfrage (/tmp/varianten_bulk.jsonl, BULK_DATEI ändert den Pfad; Zeilen mit id, title, selectedOptions,
 *   product{id,handle,title,status}). Für Produkte ohne CJ-Datenblatt, z. B. Küchengeräte (26.10.: Fleischwolf mit US/UK-Varianten, in vier Social-Posts beworben).
 * Je Produkt: Shop-Variante → SKU → CJ-Schlüssel. Fremdstecker-Variante löschen; bleibt keine, Produkt DRAFT + Tag «stecker-nicht-ch».
 * Gelöschte bekommen den Tag «stecker-bereinigt-2510». TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Der Plan liegt in /tmp/stecker_cj_plan.json.
 */
import { readFileSync, writeFileSync, readdirSync, appendFileSync, existsSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { steckerUrteil, steckerUrteilOptionen } from './lib/stecker_cj.mjs';

const SHOP_QUELLE = process.env.QUELLE === 'shop', BULK = process.env.BULK_DATEI || '/tmp/varianten_bulk.jsonl';
const LIVE = process.env.LIVE === '1', DIR = (process.env.CACHE_DIR || '/tmp/cj_fakten_cache').replace(/\/?$/, '/');
const schlaf = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  if (SHOP_QUELLE ? !existsSync(BULK) : !existsSync(DIR)) { console.error(SHOP_QUELLE ? `Bulk-Datei ${BULK} fehlt` : `Zwischenspeicher ${DIR} fehlt`); process.exit(1); }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const retry = async (m, v = {}) => { for (let n = 0; ; n++) { try { return await q(m, v); } catch (e) { if (n >= 6 || !/Throttled|THROTTLED|429/.test(e.message)) throw e; await schlaf(15000 * (n + 1)); } } };

  // 1) Kandidaten rein lokal: Produkte, bei denen CJ selbst Fremdstecker-Varianten führt
  const kand = [];
  let gelesen = 0;
  for (const f of SHOP_QUELLE ? [] : readdirSync(DIR)) {
    if (!f.endsWith('.json')) continue;
    let j; try { j = JSON.parse(readFileSync(DIR + f, 'utf8')); } catch { continue; }
    gelesen++;
    const vs = j.variants || [];
    const cj = Object.fromEntries(vs.map(v => [v.variantSku, String(v.variantKey || '')]));
    if (steckerUrteil(vs.map(v => ({ id: v.vid, sku: v.variantSku })), cj).fremd) kand.push({ handle: f.replace(/\.json$/, ''), cj, keyNames: j.productKeyEn });
  }
  if (!SHOP_QUELLE) console.log(`Zwischenspeicher: ${gelesen} Produkte · CJ führt Fremdstecker-Varianten bei ${kand.length}`);

  // 2) gegen den Shop abgleichen
  const plan = [];
  if (SHOP_QUELLE) {
    const P = new Map(); let n = 0;
    for await (const z of createInterface({ input: createReadStream(BULK) })) {
      const v = JSON.parse(z); if (!v.product || v.product.status !== 'ACTIVE') continue; n++;
      const e = P.get(v.product.id) || { handle: v.product.handle, titel: v.product.title, vs: [] };
      e.vs.push({ id: v.id, werte: v.selectedOptions.map(o => o.value.trim()) }); P.set(v.product.id, e);
    }
    for (const [id, e] of P) { const u = steckerUrteilOptionen(e.vs); if (u.draft || u.loeschen.length) plan.push({ id, handle: e.handle, titel: e.titel, gesamt: e.vs.length, ...u }); }
    console.log(`Bulk: ${n} Varianten aktiver Produkte, ${P.size} Produkte`);
  }
  for (const k of kand) {
    const p = (await retry(`query($h:String!){productByHandle(handle:$h){id status title variants(first:250){nodes{id sku}}}}`, { h: k.handle })).productByHandle;
    if (!p) { console.log(`  ${k.handle}: im Shop nicht gefunden`); continue; }
    if (p.status !== 'ACTIVE') continue;
    const u = steckerUrteil(p.variants.nodes.map(v => ({ id: v.id, sku: v.sku })), k.cj);
    if (u.draft || u.loeschen.length) plan.push({ id: p.id, handle: k.handle, titel: p.title, gesamt: p.variants.nodes.length, ...u });
  }
  const dr = plan.filter(x => x.draft), lo = plan.filter(x => x.loeschen.length);
  console.log(`\nPlan: ${plan.length} Produkte · Entwurf: ${dr.length} · Varianten löschen bei ${lo.length} Produkten (${lo.reduce((a, x) => a + x.loeschen.length, 0)} Varianten)`);
  for (const x of plan) console.log(`  ${x.draft ? 'ENTWURF ' : 'löschen '} ${x.handle.slice(0, 56).padEnd(56)} ${x.grund}`);
  writeFileSync('/tmp/stecker_cj_plan.json', JSON.stringify(plan, null, 1));
  if (!LIVE) { console.log('\nTrockenlauf — nichts geschrieben.'); return; }

  const ledger = z => appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · stecker-cj ${z}\n`);
  for (const x of dr) {
    const d = await retry(`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`, { i: { id: x.id, status: 'DRAFT' } });
    if (d.productUpdate.userErrors.length) { console.error('  ✗', x.handle, JSON.stringify(d.productUpdate.userErrors)); continue; }
    await retry(`mutation($id:ID!){tagsAdd(id:$id,tags:["stecker-nicht-ch"]){userErrors{message}}}`, { id: x.id });
    ledger(`draft ${x.handle}`);
  }
  for (const x of lo) {
    for (let i = 0; i < x.loeschen.length; i += 100) {
      const d = await retry(`mutation($p:ID!,$v:[ID!]!){productVariantsBulkDelete(productId:$p,variantsIds:$v){userErrors{message}}}`, { p: x.id, v: x.loeschen.slice(i, i + 100) });
      if (d.productVariantsBulkDelete.userErrors.length) console.error('  ✗', x.handle, JSON.stringify(d.productVariantsBulkDelete.userErrors));
    }
    await retry(`mutation($id:ID!){tagsAdd(id:$id,tags:["stecker-bereinigt-2510"]){userErrors{message}}}`, { id: x.id });
    ledger(`varianten ${x.handle} ${x.loeschen.length}`);
  }
  console.log('Fertig.');
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
