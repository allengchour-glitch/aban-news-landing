#!/usr/bin/env node
/**
 * Mengenrabatt für passende Produkte: Plan, Tags, Sammlungen, automatische Rabatte, Rücknahme. Regeln: lib/mengenrabatt.mjs (mit Tests).
 *
 *   node automation/mengenrabatt.mjs plan                  liest den Shop (Bulk, ~3 Min.), schreibt /tmp/mr/plan.json, zeigt Zahlen. Schreibt NICHTS im Shop.
 *   node automation/mengenrabatt.mjs status                zeigt Tags, Sammlungen und Rabatte im Shop (nur lesen)
 *   LIVE=1 node automation/mengenrabatt.mjs tags           Tags mengenrabatt-a/-b setzen und veraltete entfernen (nur Unterschiede zum Soll)
 *   LIVE=1 node automation/mengenrabatt.mjs sammlungen     die zwei Sammlungen anlegen (Regel «Tag ist …»), veröffentlichen
 *   LIVE=1 STARTS=2026-10-27T08:00:00Z node automation/mengenrabatt.mjs rabatte    die drei automatischen Rabatte anlegen (Start ZWINGEND angeben)
 *   LIVE=1 node automation/mengenrabatt.mjs stopp          Rabatte deaktivieren UND alle Rabatt-Tags entfernen (Rücknahme)
 * Vorgabe ist immer der Trockenlauf; LIVE=1 schreibt. Zugang: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET.
 * Zwischenspeicher /tmp/mr/varianten.jsonl (QUELLE=…): höchstens 6 Stunden alt für LIVE (NEU=1 liest neu). Ledger: dropship/mengenrabatt_ledger.txt.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { STUFEN, RABATT_TAGS, sicherheitspruefung, stufeFuer, tagDiff, rabattEingaben, planen } from './lib/mengenrabatt.mjs';

const PHASE = process.argv[2] || 'plan';
const LIVE = process.env.LIVE === '1';
const QUELLE = process.env.QUELLE || '/tmp/mr/varianten.jsonl';
const LEDGER = 'dropship/mengenrabatt_ledger.txt';
const MAX_ALTER_MS = 6 * 3600 * 1000;
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const ledger = z => { try { appendFileSync(LEDGER, `${z} · ${new Date().toISOString()}\n`); } catch { /* egal */ } };

sicherheitspruefung(); // wirft, wenn Stufen und Marge/Versandschwelle nicht zusammenpassen

const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
if (!SHOP || !process.env.SHOPIFY_CLIENT_ID || !CS) { console.error('SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET fehlen'); process.exit(1); }
const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) })).json()).access_token;
if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

/** Bulk-Abfrage aller aktiven Produkte mit Preis und Kosten je Variante → JSONL (wartet, wenn schon eine andere Bulk-Abfrage läuft). */
async function bulkLesen() {
  mkdirSync('/tmp/mr', { recursive: true });
  for (let i = 0; i < 40; i++) { const l = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation; if (!l || !['CREATED', 'RUNNING'].includes(l.status)) break; console.log('andere Bulk-Abfrage läuft, warte 30 s'); await schlaf(30000); }
  const inner = `{ products(query:"status:active") { edges { node { id handle title tags g:metafield(namespace:"mm-google-shopping", key:"google_product_category"){ value } variants { edges { node { id price inventoryItem { unitCost { amount } } } } } } } } }`;
  const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
  if (m.userErrors?.length) throw new Error('Bulk: ' + JSON.stringify(m.userErrors));
  for (let i = 0; i < 300; i++) {
    await schlaf(10000);
    const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
    if (s.status === 'COMPLETED') { const text = await (await fetch(s.url)).text(); writeFileSync(QUELLE, text); return; }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) throw new Error(`Bulk ${s.status} ${s.errorCode}`);
  }
  throw new Error('Bulk dauert zu lange');
}

async function produkte() {
  const alt = existsSync(QUELLE) ? Date.now() - statSync(QUELLE).mtimeMs : Infinity;
  if (process.env.NEU === '1' || alt > MAX_ALTER_MS) { console.log(alt === Infinity ? 'kein Zwischenspeicher: lese den Shop' : `Zwischenspeicher ${(alt / 3600000).toFixed(1)} h alt: lese neu`); await bulkLesen(); }
  else if (LIVE) console.log(`Zwischenspeicher ${(alt / 60000).toFixed(0)} Min. alt (höchstens 360 für LIVE)`);
  const map = new Map(); let nVar = 0;
  for (const z of readFileSync(QUELLE, 'utf8').split('\n')) {
    if (!z) continue; const o = JSON.parse(z);
    if (o.__parentId) { const p = map.get(o.__parentId); if (p) { p.variants.push({ price: o.price, cost: o.inventoryItem?.unitCost?.amount ?? null }); nVar++; } }
    else map.set(o.id, { id: o.id, handle: o.handle, title: o.title, tags: o.tags || [], g: o.g?.value || '', variants: [] });
  }
  console.log(`Produkte ${map.size}, Varianten ${nVar}`);
  return [...map.values()];
}

async function planErstellen() {
  const P = await produkte(); const plan = planen(P);
  const aktionen = []; let zuViele = 0;
  for (const p of P) {
    const r = stufeFuer(p); const d = tagDiff(p.tags, r.stufe);
    if (d.add.length || d.remove.length) aktionen.push({ id: p.id, handle: p.handle, add: d.add, remove: d.remove, stufe: r.stufe, marge: r.marge });
    if (r.stufe && r.marge > 0.9) zuViele++;
  }
  const info = { erstellt: new Date().toISOString(), produkte: plan.summe, a: plan.a.length, b: plan.b.length, gruende: plan.gruende, neueTags: aktionen.filter(a => a.add.length).length, entfernteTags: aktionen.filter(a => a.remove.length).length, margeUeber90: zuViele };
  writeFileSync('/tmp/mr/plan.json', JSON.stringify({ info, aktionen, a: plan.a, b: plan.b }));
  console.log(JSON.stringify(info, null, 1));
  return { info, aktionen, P };
}

async function tags() {
  const { aktionen } = await planErstellen();
  console.log(`\nTAGS: ${aktionen.length} Produkte mit Änderung (${aktionen.filter(a => a.add.length).length} setzen, ${aktionen.filter(a => a.remove.length).length} entfernen)`);
  if (!LIVE) { console.log('Trockenlauf (LIVE=1 schreibt). Beispiele:'); aktionen.slice(0, 8).forEach(a => console.log('  ', a.handle, JSON.stringify({ add: a.add, remove: a.remove, marge: a.marge && +a.marge.toFixed(2) }))); return; }
  let fertig = 0, fehler = 0;
  for (let i = 0; i < aktionen.length; i += 20) {
    const block = aktionen.slice(i, i + 20); let n = 0; const teile = [], vars = {};
    for (const a of block) {
      if (a.add.length) { teile.push(`t${n}: tagsAdd(id:"${a.id}", tags:${JSON.stringify(a.add)}){userErrors{message}}`); n++; }
      if (a.remove.length) { teile.push(`t${n}: tagsRemove(id:"${a.id}", tags:${JSON.stringify(a.remove)}){userErrors{message}}`); n++; }
    }
    const d = await q(`mutation{${teile.join(' ')}}`, vars);
    for (const [k, v] of Object.entries(d)) if (v.userErrors?.length) { fehler++; console.log('  Fehler', k, JSON.stringify(v.userErrors)); }
    for (const a of block) ledger(`${a.handle} +${a.add.join(',') || '-'} -${a.remove.join(',') || '-'}`);
    fertig += block.length; if (fertig % 500 === 0 || fertig === aktionen.length) console.log(`  ${fertig}/${aktionen.length}`);
  }
  // Rücklesen: Stichprobe aus den Änderungen
  const probe = aktionen.filter(a => a.add.length).sort(() => 0.5 - Math.random()).slice(0, 12); let abw = 0;
  await schlaf(3000);
  for (const a of probe) { const t = (await q(`query($id:ID!){product(id:$id){tags}}`, { id: a.id })).product?.tags || []; if (!a.add.every(x => t.includes(x))) { abw++; console.log('  Abweichung beim Zurücklesen', a.handle, t.filter(x => x.startsWith('mengenrabatt'))); } }
  console.log(`fertig: ${fertig} Produkte, Fehler ${fehler}, Rücklesen ${probe.length - abw}/${probe.length} stimmen`); if (fehler || abw) process.exitCode = 2;
}

const SAMMLUNGEN = {
  a: { handle: 'mengenrabatt-ab-2-stueck', titel: 'Mengenrabatt: ab 2 Stück 5 %, ab 3 Stück 10 %', tag: STUFEN.a.tag,
    text: '<p>Bei diesen Artikeln sinkt der Preis mit der Menge: ab 2 Stück 5 % Rabatt, ab 3 Stück 10 % Rabatt. Der Rabatt wird im Warenkorb automatisch abgezogen und gilt für beliebige Artikel dieser Auswahl, auch gemischt.</p>' },
  b: { handle: 'mengenrabatt-ab-3-stueck', titel: 'Mengenrabatt: ab 3 Stück 5 %', tag: STUFEN.b.tag,
    text: '<p>Bei diesen Artikeln gibt es ab 3 Stück 5 % Rabatt. Der Rabatt wird im Warenkorb automatisch abgezogen und gilt für beliebige Artikel dieser Auswahl, auch gemischt.</p>' },
};
const sammlungId = async handle => (await q(`query($h:String!){collectionByHandle(handle:$h){id}}`, { h: handle })).collectionByHandle?.id || null;

async function sammlungen() {
  const ids = {};
  for (const [name, s] of Object.entries(SAMMLUNGEN)) {
    const id = await sammlungId(s.handle); ids[name] = id;
    console.log(`${s.handle}: ${id ? 'vorhanden ' + id : 'fehlt'}`);
    if (id || !LIVE) continue;
    const d = (await q(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id} userErrors{field message}}}`, { i: { title: s.titel, handle: s.handle, descriptionHtml: s.text,
      ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: s.tag }] }, sortOrder: 'BEST_SELLING' } })).collectionCreate;
    if (d.userErrors.length) throw new Error(`collectionCreate ${s.handle} ${JSON.stringify(d.userErrors)}`);
    ids[name] = d.collection.id; ledger(`sammlung ${s.handle} ${d.collection.id}`);
    const vorbild = (await q(`{collectionByHandle(handle:"hype-jetzt"){resourcePublicationsV2(first:30){nodes{isPublished publication{id}}}}}`)).collectionByHandle;
    const pubs = (vorbild?.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).map(n => ({ publicationId: n.publication.id }));
    const p = await q(`mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id: d.collection.id, i: pubs });
    if (p.publishablePublish.userErrors.length) throw new Error('publishablePublish ' + JSON.stringify(p.publishablePublish.userErrors));
    console.log(`  angelegt ${d.collection.id}, veröffentlicht in ${pubs.length} Kanälen`);
  }
  if (!LIVE) console.log('Trockenlauf (LIVE=1 legt an)');
  return ids;
}

const rabatteImShop = async () => (await q(`{ discountNodes(first:100, query:"method:automatic"){ nodes{ id discount{ __typename ... on DiscountAutomaticBasic{ title status startsAt endsAt } } } } }`)).discountNodes.nodes
  .filter(n => n.discount.__typename === 'DiscountAutomaticBasic' && /^Mengenrabatt:/.test(n.discount.title)).map(n => ({ id: n.id, ...n.discount }));

async function rabatte() {
  const ids = {}; for (const [name, s] of Object.entries(SAMMLUNGEN)) { ids[name] = await sammlungId(s.handle); if (!ids[name]) throw new Error(`Sammlung ${s.handle} fehlt: zuerst «sammlungen»`); }
  const STARTS = process.env.STARTS;
  if (LIVE && !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(STARTS || '')) throw new Error('STARTS=2026-10-27T08:00:00Z (UTC) ist für LIVE Pflicht');
  const vorhanden = await rabatteImShop(); const titel = new Set(vorhanden.map(v => v.title));
  vorhanden.forEach(v => console.log(`vorhanden: ${v.title} · ${v.status} · ab ${v.startsAt}`));
  for (const e of rabattEingaben(ids, STARTS || '2099-01-01T00:00:00Z')) {
    if (titel.has(e.eingabe.title)) { console.log(`schon da: ${e.eingabe.title}`); continue; }
    console.log(`${LIVE ? 'lege an' : 'würde anlegen'}: ${e.eingabe.title} (Sammlung ${e.stufe.toUpperCase()}, Menge ≥ ${e.ab}, ${e.prozent} %)`);
    if (!LIVE) continue;
    const d = (await q(`mutation($i:DiscountAutomaticBasicInput!){discountAutomaticBasicCreate(automaticBasicDiscount:$i){automaticDiscountNode{id} userErrors{field message code}}}`, { i: e.eingabe })).discountAutomaticBasicCreate;
    if (d.userErrors.length) throw new Error('discountAutomaticBasicCreate ' + JSON.stringify(d.userErrors));
    ledger(`rabatt ${e.eingabe.title} ${d.automaticDiscountNode.id} ab ${STARTS}`);
  }
  if (!LIVE) console.log('Trockenlauf (LIVE=1 und STARTS=… legen an)');
}

async function status() {
  for (const t of RABATT_TAGS) { const c = (await q(`query($q:String!){productsCount(query:$q){count}}`, { q: `tag:${t} AND status:active` })).productsCount.count; console.log(`Tag ${t}: ${c} aktive Produkte`); }
  for (const s of Object.values(SAMMLUNGEN)) { const c = (await q(`query($h:String!){collectionByHandle(handle:$h){id productsCount{count}}}`, { h: s.handle })).collectionByHandle; console.log(`Sammlung ${s.handle}: ${c ? c.productsCount.count + ' Produkte' : 'fehlt'}`); }
  const r = await rabatteImShop(); if (!r.length) console.log('Keine automatischen Mengenrabatte im Shop'); r.forEach(v => console.log(`Rabatt: ${v.title} · ${v.status} · ab ${v.startsAt}`));
}

async function stopp() {
  const r = await rabatteImShop();
  for (const v of r) { console.log(`${LIVE ? 'deaktiviere' : 'würde deaktivieren'}: ${v.title} (${v.status})`); if (LIVE && v.status !== 'EXPIRED') { const d = (await q(`mutation($id:ID!){discountAutomaticDeactivate(id:$id){userErrors{message}}}`, { id: v.id })).discountAutomaticDeactivate; if (d.userErrors.length) throw new Error(JSON.stringify(d.userErrors)); ledger(`stopp ${v.title}`); } }
  // alle Rabatt-Tags weg (frisch aus dem Shop, nicht aus dem Plan)
  for (const t of RABATT_TAGS) {
    let nach = null, n = 0;
    for (;;) {
      const d = (await q(`query($q:String!,$a:String){products(first:100,query:$q,after:$a){pageInfo{hasNextPage endCursor} nodes{id handle}}}`, { q: `tag:${t}`, a: nach })).products;
      if (LIVE) for (let i = 0; i < d.nodes.length; i += 20) { await q(`mutation{${d.nodes.slice(i, i + 20).map((p, k) => `r${k}: tagsRemove(id:"${p.id}", tags:["${t}"]){userErrors{message}}`).join(' ')}}`); }
      n += d.nodes.length; if (!d.pageInfo.hasNextPage) break; nach = d.pageInfo.endCursor;
    }
    console.log(`${LIVE ? 'entfernt' : 'würde entfernen'}: Tag ${t} an ${n} Produkten`); ledger(`stopp-tags ${t} ${n}`);
  }
  if (!LIVE) console.log('Trockenlauf (LIVE=1 schreibt)');
}

const PHASEN = { plan: planErstellen, tags, sammlungen, rabatte, status, stopp };
if (!PHASEN[PHASE]) { console.error('Phase: plan | status | tags | sammlungen | rabatte | stopp'); process.exit(1); }
await PHASEN[PHASE]();
