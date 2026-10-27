#!/usr/bin/env node
/**
 * Unterfilter-Metafelder der Mode-Kategorien setzen (Chip-Zeile auf der Kategorieseite; Theme-Entwurf 212498841991 liest sie).
 * Plan und Tests: lib/unterfilter_plan.mjs. Das Menü zeigt nur Geschwister der zweiten Ebene; die Filter-Seiten (z. B. «Abendkleider», «Flare-Jeans»)
 * wären sonst nirgends verlinkt. Ablauf: Definitionen anlegen (lux.unterfilter = Liste, lux.eltern = Verweis, beide im Shop-Frontend lesbar)
 * → Collection-IDs der Handles holen → metafieldsSet in Paketen zu 25 → Stichprobe nachlesen.
 *
 * TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Aufruf: MODE_BEREICHE=bekleidung,schuhe,taschen,accessoires [LIVE=1] node automation/kategorie_unterfilter.mjs
 * Schmuck (Bereichsdatei schmuck-uhren.json, ids s-…): SCHMUCK=1 PREFIX=s- [ANNAHME_ALLE=1] node automation/kategorie_unterfilter.mjs
 *   PREFIX=<id-Präfix> begrenzt die Kategorien (m- = Mode, s- = Schmuck). ANNAHME_ALLE=1 (nur Trockenlauf) tut so, als gäbe es alle Collections, und zeigt den Plan,
 *   wie er nach dem Anlegen aussähe (die Schmuck-Collections gibt es erst nach kategorien_anlegen.mjs PHASE=sammlungen).
 * Rückgängig: metafieldsDelete je Eigentümer/Key, oder die Definitionen löschen (löscht die Werte mit).
 */
import { appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { KATEGORIEN } from './lib/kategorien.mjs';
import { planMetafelder, pakete, NAMESPACE, KEY_FILTER, KEY_ELTERN } from './lib/unterfilter_plan.mjs';

const LIVE = process.env.LIVE === '1';
const PREFIX = process.env.PREFIX || '';
const ANNAHME = !LIVE && process.env.ANNAHME_ALLE === '1';
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = async (a, b) => { for (let n = 0; ; n++) { try { return await shopifyGql(SHOP, '2025-01', tok, a, b); } catch (e) { if (n >= 5 || !/Throttled|THROTTLED|429/.test(e.message)) throw e; await schlaf(10000 * (n + 1)); } } };

// Mode (k.mode) und die Kategorien aus Bereichsdateien (k.aus_datei, z. B. Schmuck mit SCHMUCK=1) tragen ihre Unterfilter als Chips.
const kats = KATEGORIEN.filter(k => (k.mode || k.aus_datei) && (!PREFIX || k.id.startsWith(PREFIX)));
const handles = kats.map(k => k.handle);
console.log(`Kategorien: ${kats.filter(k => !k.filter).length} · Unterfilter: ${kats.filter(k => k.filter).length}`);

// Collection-IDs
const gids = {};
for (let i = 0; i < handles.length; i += 25) {
  const teil = handles.slice(i, i + 25);
  const d = await q(`{${teil.map((h, n) => `c${n}:collectionByHandle(handle:${JSON.stringify(h)}){id}`).join(' ')}}`);
  teil.forEach((h, n) => { gids[h] = d[`c${n}`]?.id || null; });
}
if (ANNAHME) { for (const h of handles) gids[h] ||= `gid://annahme/${h}`; console.log('ANNAHME_ALLE: alle Collections gelten als vorhanden - nur Vorschau des Plans'); }
const plan = planMetafelder(kats, gids);
console.log(`Schreibungen: ${plan.writes.length} (Listenfelder ${plan.writes.filter(w => w.key === KEY_FILTER).length}, Rückverweise ${plan.writes.filter(w => w.key === KEY_ELTERN).length}) · fehlende Collections: ${plan.fehlend.length}${plan.fehlend.length ? ' → ' + plan.fehlend.slice(0, 8).join(', ') : ''} · übersprungen: ${plan.uebersprungen.length}`);
if (!LIVE) { console.log('\nTrockenlauf — nichts geschrieben.'); process.exit(0); }

// Definitionen (Storefront lesbar), «bereits vorhanden» ist in Ordnung
for (const def of [{ name: 'Unterfilter', namespace: NAMESPACE, key: KEY_FILTER, type: 'list.collection_reference', description: 'Filter-Seiten dieser Kategorie (Chip-Zeile)' },
                   { name: 'Elternkategorie', namespace: NAMESPACE, key: KEY_ELTERN, type: 'collection_reference', description: 'Kategorie, zu der dieser Filter gehört' }]) {
  const d = (await q(`mutation($d:MetafieldDefinitionInput!){metafieldDefinitionCreate(definition:$d){createdDefinition{id} userErrors{code message}}}`, { d: { ...def, ownerType: 'COLLECTION', access: { storefront: 'PUBLIC_READ' } } })).metafieldDefinitionCreate;
  const echte = d.userErrors.filter(e => e.code !== 'TAKEN');
  if (echte.length) { console.error('Definition fehlgeschlagen:', JSON.stringify(echte)); process.exit(2); }
  console.log(`Definition ${NAMESPACE}.${def.key}: ${d.createdDefinition ? 'angelegt' : 'war schon da'}`);
}
let ok = 0, fehler = 0;
for (const p of pakete(plan.writes, 25)) {
  const d = (await q(`mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{id} userErrors{field message code}}}`, { m: p.map(w => ({ ownerId: w.ownerId, namespace: NAMESPACE, key: w.key, type: w.type, value: w.value })) })).metafieldsSet;
  if (d.userErrors.length) { fehler += d.userErrors.length; console.error('  ✗', JSON.stringify(d.userErrors).slice(0, 300)); } else ok += p.length;
  await schlaf(300);
}
console.log(`geschrieben: ${ok} · Fehler: ${fehler}`);
// Stichprobe nachlesen: Anzahl der Filter je Elternteil
const eltern = plan.writes.filter(w => w.key === KEY_FILTER).slice(0, 8);
for (const w of eltern) {
  const m = (await q(`query($id:ID!){collection(id:$id){metafield(namespace:"${NAMESPACE}",key:"${KEY_FILTER}"){value}}}`, { id: w.ownerId })).collection?.metafield?.value;
  const soll = JSON.parse(w.value).length, ist = m ? JSON.parse(m).length : 0;
  console.log(`  ${w.handle}: ${ist}/${soll} ${ist === soll ? '✓' : '✗ ABWEICHUNG'}`);
}
appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · unterfilter-metafelder ${ok}\n`);
process.exit(fehler ? 3 : 0);
