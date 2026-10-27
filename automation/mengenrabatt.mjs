#!/usr/bin/env node
/**
 * Mengenrabatt für passende Produkte: Plan, Tags, Sammlungen, automatische Rabatte, Rücknahme. Regeln: lib/mengenrabatt.mjs (mit Tests).
 *
 *   node automation/mengenrabatt.mjs plan                  liest den Shop (Bulk, ~3 Min.), schreibt /tmp/mr/plan.json (PLAN_DATEI=…), zeigt Zahlen. Schreibt NICHTS im Shop.
 *   node automation/mengenrabatt.mjs status                zeigt Tags, Sammlungen, Rabatte, fremde Mengenrabatte und die Gratis-Versandregel (nur lesen)
 *   LIVE=1 node automation/mengenrabatt.mjs tags           Tags mengenrabatt-a/-b setzen und veraltete entfernen (nur Unterschiede zum Soll)
 *   LIVE=1 node automation/mengenrabatt.mjs sammlungen     die zwei Sammlungen anlegen (Regel «Tag ist …»), veröffentlichen (auch eine früher unveröffentlicht gebliebene)
 *   LIVE=1 STARTS=2026-10-27T08:00:00Z node automation/mengenrabatt.mjs rabatte    die drei automatischen Rabatte anlegen (Start ZWINGEND, mind. 10 Min. in der Zukunft)
 *   LIVE=1 node automation/mengenrabatt.mjs stopp          Rabatte deaktivieren UND alle Rabatt-Tags entfernen (Rücknahme, mit Gegenprobe ohne Suchindex)
 * Vorgabe ist immer der Trockenlauf; LIVE=1 schreibt. Zugang: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET.
 *
 * SCHUTZ (Code-Prüfung 26.10.2026):
 *   - LIVE tags/sammlungen/rabatte nur, wenn die Datei dropship/MENGENRABATT-FREI.txt existiert (Besitzerfreigabe; löschen = Stopp). `stopp` geht immer.
 *   - `rabatte` prüft vor dem Anlegen: Gratis-Versandregel gilt ab ≤ 45 CHF (sonst zahlen Körbe von 50 bis 55,56 CHF nach 10 % Rabatt Versand), keine fremden aktiven
 *     Mengenrabatte (sonst gewinnt der bessere für den Kunden), Sammlungen gefüllt. Befund = LIVE bricht ab; TROTZDEM=1 hebt das auf (nur mit Besitzerentscheid).
 *   - `tags` bricht LIVE ab bei unplausiblem Plan (> 5 % ohne Kosten, > 20 % der vorhandenen Tags würden entfernt); TROTZDEM=1 hebt das auf.
 *   - Zwischenspeicher /tmp/mr/varianten.jsonl (QUELLE=…): für LIVE höchstens 2 Stunden alt (NEU=1 liest neu); nach einem LIVE-Tag-Lauf wird er entwertet.
 * Ledger: dropship/mengenrabatt_ledger.txt (neben dem Skript aufgelöst, nicht im aktuellen Ordner).
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, statSync, mkdirSync, utimesSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { STUFEN, RABATT_TAGS, sicherheitspruefung, stufeFuer, tagDiff, rabattEingaben, planen, parseBulk, pruefeStarts, freiesVersandAb, versandProblem, eigeneRabatte, fremdeMengenrabatte, stufenText } from './lib/mengenrabatt.mjs';

const PHASE = process.argv[2] || 'plan';
const LIVE = process.env.LIVE === '1';
const QUELLE = process.env.QUELLE || '/tmp/mr/varianten.jsonl';
const PLAN_DATEI = process.env.PLAN_DATEI || '/tmp/mr/plan.json';
const hier = p => fileURLToPath(new URL(p, import.meta.url));
const LEDGER = hier('../dropship/mengenrabatt_ledger.txt'), FREIGABE = hier('../dropship/MENGENRABATT-FREI.txt');
const MAX_ALTER_MS = (LIVE ? 2 : 6) * 3600 * 1000;
const STOPP_PAUSE_MS = Number(process.env.STOPP_PAUSE_MS || 25000); // Suchindex und Zähler hinken ~20 s nach
const schlaf = ms => new Promise(r => setTimeout(r, ms));
let ledgerWarnung = false;
const ledger = z => { try { appendFileSync(LEDGER, `${z} · ${new Date().toISOString()}\n`); } catch (e) { if (!ledgerWarnung) { ledgerWarnung = true; console.error(`WARNUNG: Ledger ${LEDGER} nicht beschreibbar (${e.code || e.message})`); } } };

if (['plan', 'tags', 'sammlungen', 'rabatte'].includes(PHASE)) sicherheitspruefung(); // wirft, wenn Stufen und Marge/Versandschwelle nicht zusammenpassen; die Rücknahme (stopp) hängt NICHT daran
if (LIVE && ['tags', 'sammlungen', 'rabatte'].includes(PHASE)) {
  if (!existsSync(FREIGABE)) { console.error(`LIVE gesperrt: Besitzerfreigabe fehlt. Datei ${FREIGABE} anlegen (löschen = Stopp). Die Rücknahme «stopp» ist immer erlaubt.`); process.exit(3); }
  try { appendFileSync(LEDGER, ''); } catch (e) { console.error(`LIVE gesperrt: Ledger ${LEDGER} nicht beschreibbar (${e.code || e.message})`); process.exit(3); }
}

const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
if (!SHOP || !process.env.SHOPIFY_CLIENT_ID || !CS) { console.error('SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET fehlen'); process.exit(1); }
const tokAntwort = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await tokAntwort.json().catch(() => ({}))).access_token;
if (!tok) { console.error(`Kein Shopify-Token (HTTP ${tokAntwort.status})`); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

/** Bulk-Abfrage aller aktiven Produkte mit Preis und Kosten je Variante → JSONL (wartet, wenn schon eine andere Bulk-Abfrage läuft). */
async function bulkLesen() {
  mkdirSync(dirname(QUELLE), { recursive: true });
  for (let i = 0; i < 40; i++) { const l = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation; if (!l || !['CREATED', 'RUNNING'].includes(l.status)) break; console.log('andere Bulk-Abfrage läuft, warte 30 s'); await schlaf(30000); }
  const inner = `{ products(query:"status:active") { edges { node { id handle title tags g:metafield(namespace:"mm-google-shopping", key:"google_product_category"){ value } variants { edges { node { id price inventoryItem { unitCost { amount } } } } } } } } }`;
  const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
  if (m.userErrors?.length) throw new Error('Bulk: ' + JSON.stringify(m.userErrors));
  for (let i = 0; i < 300; i++) {
    await schlaf(10000);
    const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
    if (!s) continue;
    if (s.status === 'COMPLETED') { const text = await (await fetch(s.url)).text(); writeFileSync(QUELLE, text); return; }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) throw new Error(`Bulk ${s.status} ${s.errorCode}`);
  }
  throw new Error('Bulk dauert zu lange');
}

async function produkte() {
  const alt = existsSync(QUELLE) ? Date.now() - statSync(QUELLE).mtimeMs : Infinity;
  if (process.env.NEU === '1' || alt > MAX_ALTER_MS) { console.log(alt === Infinity ? 'kein Zwischenspeicher: lese den Shop' : `Zwischenspeicher ${(alt / 3600000).toFixed(1)} h alt: lese neu`); await bulkLesen(); }
  else if (LIVE) console.log(`Zwischenspeicher ${(alt / 60000).toFixed(0)} Min. alt (höchstens ${MAX_ALTER_MS / 60000} für LIVE)`);
  const { produkte: liste, varianten, waisen } = parseBulk(readFileSync(QUELLE, 'utf8'));
  console.log(`Produkte ${liste.length}, Varianten ${varianten}`);
  if (waisen) throw new Error(`Bulk-Datei unbrauchbar: ${waisen} Variantenzeilen ohne Produktzeile (NEU=1 liest den Shop neu)`);
  return liste;
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
  mkdirSync(dirname(PLAN_DATEI), { recursive: true });
  writeFileSync(PLAN_DATEI, JSON.stringify({ info, aktionen, a: plan.a, b: plan.b }));
  console.log(JSON.stringify(info, null, 1));
  return { info, aktionen, P };
}

async function tags() {
  const { aktionen, info, P } = await planErstellen();
  console.log(`\nTAGS: ${aktionen.length} Produkte mit Änderung (${aktionen.filter(a => a.add.length).length} setzen, ${aktionen.filter(a => a.remove.length).length} entfernen)`);
  // Plausibilität: ein kaputtes Messgerät (Token ohne Kostenrecht, halber Katalog) darf nicht Tausende Tags setzen oder entfernen
  const kostenAnteil = (info.gruende.kosten || 0) / Math.max(info.produkte, 1), bisher = P.filter(p => p.tags.some(t => RABATT_TAGS.includes(t))).length, sorgen = [];
  if (kostenAnteil > 0.05) sorgen.push(`${(kostenAnteil * 100).toFixed(1)} % der Produkte ohne Kosten (Token ohne Recht read_inventory?)`);
  if (info.entfernteTags > 50 && info.entfernteTags > 0.2 * bisher) sorgen.push(`${info.entfernteTags} Rabatt-Tags würden entfernt (mehr als 20 % der ${bisher} vorhandenen)`);
  if (sorgen.length) { console.log('PLAUSIBILITÄT: ' + sorgen.join(' · ')); if (LIVE && process.env.TROTZDEM !== '1') throw new Error('LIVE abgebrochen (TROTZDEM=1 hebt das auf)'); }
  if (!LIVE) { console.log('Trockenlauf (LIVE=1 schreibt). Beispiele:'); aktionen.slice(0, 8).forEach(a => console.log('  ', a.handle, JSON.stringify({ add: a.add, remove: a.remove, marge: a.marge && +a.marge.toFixed(2) }))); return; }
  let fertig = 0, fehler = 0;
  for (let i = 0; i < aktionen.length; i += 20) {
    const block = aktionen.slice(i, i + 20); let n = 0; const teile = [], besitzer = {};
    for (const a of block) {
      if (a.add.length) { besitzer['t' + n] = a; teile.push(`t${n}: tagsAdd(id:"${a.id}", tags:${JSON.stringify(a.add)}){userErrors{message}}`); n++; }
      if (a.remove.length) { besitzer['t' + n] = a; teile.push(`t${n}: tagsRemove(id:"${a.id}", tags:${JSON.stringify(a.remove)}){userErrors{message}}`); n++; }
    }
    const d = await q(`mutation{${teile.join(' ')}}`);
    const kaputt = new Set();
    for (const [k, v] of Object.entries(d)) if (!v || v.userErrors?.length) { fehler++; kaputt.add(besitzer[k].handle); console.log('  Fehler', k, besitzer[k].handle, JSON.stringify(v?.userErrors ?? 'leere Antwort')); }
    for (const a of block) ledger(`${kaputt.has(a.handle) ? 'FEHLER ' : ''}${a.handle} +${a.add.join(',') || '-'} -${a.remove.join(',') || '-'}`);
    fertig += block.length; if (fertig % 500 === 0 || fertig === aktionen.length) console.log(`  ${fertig}/${aktionen.length}`);
  }
  // Rücklesen direkt am Produkt (nicht über die Suche): Stichprobe, hinzugefügte Tags müssen da sein, entfernte weg
  const probe = [...aktionen].sort(() => 0.5 - Math.random()).slice(0, 12); let abw = 0;
  await schlaf(3000);
  for (const a of probe) { const t = (await q(`query($id:ID!){product(id:$id){tags}}`, { id: a.id })).product?.tags || []; if (!a.add.every(x => t.includes(x)) || a.remove.some(x => t.includes(x))) { abw++; console.log('  Abweichung beim Zurücklesen', a.handle, t.filter(x => x.startsWith('mengenrabatt'))); } }
  console.log(`fertig: ${fertig} Produkte, Fehler ${fehler}, Rücklesen ${probe.length - abw}/${probe.length} stimmen`); if (fehler || abw) process.exitCode = 2;
  // Der Zwischenspeicher kennt die neuen Tags nicht: der nächste Lauf würde alles noch einmal senden. Entwerten (Inhalt bleibt, Alter = 1970).
  if (fertig) try { utimesSync(QUELLE, new Date(0), new Date(0)); console.log('Zwischenspeicher entwertet: der nächste Lauf liest den Shop neu'); } catch { /* egal */ }
}

const SAMMLUNGEN = {
  a: { handle: 'mengenrabatt-ab-2-stueck', titel: `Mengenrabatt: ${stufenText('a')}`, tag: STUFEN.a.tag,
    text: `<p>Bei diesen Artikeln sinkt der Preis mit der Menge: ${stufenText('a', ' Rabatt')}. Der Rabatt wird im Warenkorb automatisch abgezogen und gilt für beliebige Artikel dieser Auswahl, auch gemischt.</p>` },
  b: { handle: 'mengenrabatt-ab-3-stueck', titel: `Mengenrabatt: ${stufenText('b')}`, tag: STUFEN.b.tag,
    text: `<p>Bei diesen Artikeln gibt es ${stufenText('b', ' Rabatt')}. Der Rabatt wird im Warenkorb automatisch abgezogen und gilt für beliebige Artikel dieser Auswahl, auch gemischt.</p>` },
};
const sammlungId = async handle => (await q(`query($h:String!){collectionByHandle(handle:$h){id}}`, { h: handle })).collectionByHandle?.id || null;
const sammlungVeroeffentlicht = async handle => ((await q(`query($h:String!){collectionByHandle(handle:$h){resourcePublicationsV2(first:30){nodes{isPublished}}}}`, { h: handle })).collectionByHandle?.resourcePublicationsV2?.nodes || []).some(n => n.isPublished);

/** Veröffentlicht wie die Vorbild-Sammlung hype-jetzt; ohne Kanäle wirft es (sonst bleibt die Sammlung still unveröffentlicht = 404). */
async function veroeffentlichen(id) {
  const vorbild = (await q(`{collectionByHandle(handle:"hype-jetzt"){resourcePublicationsV2(first:30){nodes{isPublished publication{id}}}}}`)).collectionByHandle;
  const pubs = (vorbild?.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).map(n => ({ publicationId: n.publication.id }));
  if (!pubs.length) throw new Error('Vorbild-Sammlung hype-jetzt fehlt oder ist nirgends veröffentlicht: keine Kanäle zum Veröffentlichen (die Sammlung bliebe unveröffentlicht)');
  const p = await q(`mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id, i: pubs });
  if (p.publishablePublish.userErrors.length) throw new Error('publishablePublish ' + JSON.stringify(p.publishablePublish.userErrors));
  console.log(`  veröffentlicht in ${pubs.length} Kanälen`); ledger(`veroeffentlicht ${id} ${pubs.length} Kanäle`);
}

async function sammlungen() {
  const ids = {};
  for (const [name, s] of Object.entries(SAMMLUNGEN)) {
    let id = await sammlungId(s.handle); ids[name] = id;
    const pub = id ? await sammlungVeroeffentlicht(s.handle) : false;
    console.log(`${s.handle}: ${id ? 'vorhanden ' + id + (pub ? ', veröffentlicht' : ', NICHT veröffentlicht') : 'fehlt'}`);
    if (!LIVE) continue;
    if (!id) {
      const d = (await q(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id} userErrors{field message}}}`, { i: { title: s.titel, handle: s.handle, descriptionHtml: s.text,
        ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: s.tag }] }, sortOrder: 'BEST_SELLING' } })).collectionCreate;
      if (d.userErrors.length) throw new Error(`collectionCreate ${s.handle} ${JSON.stringify(d.userErrors)}`);
      id = d.collection.id; ids[name] = id; ledger(`sammlung ${s.handle} ${id}`); console.log(`  angelegt ${id}`);
    }
    if (!pub) await veroeffentlichen(id);
  }
  if (!LIVE) console.log('Trockenlauf (LIVE=1 legt an)');
  return ids;
}

const RABATT_FELDER = `__typename ... on DiscountAutomaticBasic{ title status startsAt endsAt minimumRequirement{ __typename ... on DiscountMinimumQuantity{ greaterThanOrEqualToQuantity } } customerGets{ items{ __typename } } } ... on DiscountAutomaticFreeShipping{ title status } ... on DiscountAutomaticBxgy{ title status } ... on DiscountAutomaticApp{ title status }`;
const rabatteAlle = async () => { const d = (await q(`{ discountNodes(first:100, query:"method:automatic"){ pageInfo{ hasNextPage } nodes{ id discount{ ${RABATT_FELDER} } } } }`)).discountNodes;
  if (d.pageInfo?.hasNextPage) throw new Error('Mehr als 100 automatische Rabatte: Liste unvollständig, Werkzeug muss Seiten lesen'); return d.nodes; };
const rabatteImShop = async () => eigeneRabatte(await rabatteAlle());

/** Befunde, die einen LIVE-Start der Rabatte unwirksam oder für Kunden nachteilig machen. */
async function voraussetzungen(ids) {
  const probleme = [];
  const profile = (await q(`{deliveryProfiles(first:5){nodes{name default profileLocationGroups{locationGroupZones(first:25){nodes{zone{name countries{name}} methodDefinitions(first:25){nodes{name active rateProvider{__typename ... on DeliveryRateDefinition{price{amount}}} methodConditions{field operator conditionCriteria{__typename ... on MoneyV2{amount}}}}}}}}}}}`)).deliveryProfiles.nodes;
  const vp = versandProblem(freiesVersandAb(profile)); if (vp) probleme.push(vp);
  for (const f of fremdeMengenrabatte(await rabatteAlle())) probleme.push(`Konkurrierender Rabatt «${f.title}» (${f.status}, ab ${f.minimumRequirement.greaterThanOrEqualToQuantity} Stück, ${f.customerGets?.items?.__typename}): bei nicht kombinierbaren Produktrabatten gilt der bessere für den Kunden, die neuen wirken dann nicht oder nur teilweise`);
  for (const [name, s] of Object.entries(SAMMLUNGEN)) {
    if (!ids[name]) continue;
    const mitglieder = (await q(`query($h:String!){collectionByHandle(handle:$h){productsCount{count}}}`, { h: s.handle })).collectionByHandle.productsCount.count;
    const getaggt = (await q(`query($q:String!){productsCount(query:$q, limit:null){count}}`, { q: `tag:${s.tag}` })).productsCount.count;
    if (!getaggt) probleme.push(`Tag ${s.tag} steht an keinem Produkt (zuerst «tags»)`);
    else if (mitglieder < 0.98 * getaggt) probleme.push(`Sammlung ${s.handle} hat erst ${mitglieder} von ${getaggt} getaggten Produkten (Smart-Sammlungen füllen sich im Hintergrund)`);
  }
  return probleme;
}

async function rabatte() {
  const ids = {};
  for (const [name, s] of Object.entries(SAMMLUNGEN)) {
    ids[name] = await sammlungId(s.handle);
    if (!ids[name]) { if (LIVE) throw new Error(`Sammlung ${s.handle} fehlt: zuerst «sammlungen»`); console.log(`Sammlung ${s.handle} fehlt noch: Vorschau mit Platzhalter`); }
  }
  const STARTS = process.env.STARTS;
  if (LIVE) { const f = pruefeStarts(STARTS); if (f) throw new Error(f); }
  const probleme = await voraussetzungen(ids);
  probleme.forEach(p => console.log('WARNUNG: ' + p));
  if (probleme.length && LIVE && process.env.TROTZDEM !== '1') throw new Error(`LIVE abgebrochen: ${probleme.length} Befund(e) oben. Erst beheben oder als Besitzerentscheid mit TROTZDEM=1 bestätigen.`);
  const vorhanden = await rabatteImShop(); const aktiv = new Set(vorhanden.filter(v => ['ACTIVE', 'SCHEDULED'].includes(v.status)).map(v => v.title)); // abgelaufene (nach «stopp») zählen NICHT als vorhanden
  vorhanden.forEach(v => console.log(`vorhanden: ${v.title} · ${v.status} · ab ${v.startsAt}`));
  const platz = Object.fromEntries(Object.keys(SAMMLUNGEN).map(k => [k, ids[k] || 'gid://shopify/Collection/0']));
  for (const e of rabattEingaben(platz, STARTS || '2099-01-01T00:00:00Z')) {
    if (aktiv.has(e.eingabe.title)) { console.log(`schon da: ${e.eingabe.title}`); continue; }
    console.log(`${LIVE ? 'lege an' : 'würde anlegen'}: ${e.eingabe.title} (Sammlung ${e.stufe.toUpperCase()}, Menge ≥ ${e.ab}, ${e.prozent} %)`);
    if (!LIVE) continue;
    const d = (await q(`mutation($i:DiscountAutomaticBasicInput!){discountAutomaticBasicCreate(automaticBasicDiscount:$i){automaticDiscountNode{id} userErrors{field message code}}}`, { i: e.eingabe })).discountAutomaticBasicCreate;
    if (d.userErrors.length) throw new Error('discountAutomaticBasicCreate ' + JSON.stringify(d.userErrors));
    ledger(`rabatt ${e.eingabe.title} ${d.automaticDiscountNode.id} ab ${STARTS}`);
  }
  if (!LIVE) console.log('Trockenlauf (LIVE=1 und STARTS=… legen an)');
}

async function status() {
  for (const t of RABATT_TAGS) { const c = (await q(`query($q:String!){productsCount(query:$q, limit:null){count precision}}`, { q: `tag:${t} AND status:active` })).productsCount; console.log(`Tag ${t}: ${c.count} aktive Produkte (${c.precision})`); }
  for (const s of Object.values(SAMMLUNGEN)) { const c = (await q(`query($h:String!){collectionByHandle(handle:$h){id productsCount{count}}}`, { h: s.handle })).collectionByHandle; console.log(`Sammlung ${s.handle}: ${c ? c.productsCount.count + ' Produkte' : 'fehlt'}`); }
  const r = await rabatteImShop(); if (!r.length) console.log('Keine automatischen Mengenrabatte dieses Werkzeugs im Shop'); r.forEach(v => console.log(`Rabatt: ${v.title} · ${v.status} · ab ${v.startsAt}`));
  fremdeMengenrabatte(await rabatteAlle()).forEach(f => console.log(`FREMDER Mengenrabatt: ${f.title} · ${f.status} · ab ${f.minimumRequirement.greaterThanOrEqualToQuantity} Stück`));
}

/** Tag-Suche über alle Seiten; mit `entfernen` fliegt der Tag von jedem Fund. Liefert die Zahl der Funde. Die Suche liest den Index (~20 s Verzug): 0 beweist nichts. */
async function tagSuche(t, entfernen) {
  let nach = null, n = 0;
  for (;;) {
    const d = (await q(`query($q:String!,$a:String){products(first:100,query:$q,after:$a){pageInfo{hasNextPage endCursor} nodes{id handle}}}`, { q: `tag:${t}`, a: nach })).products;
    if (entfernen) for (let i = 0; i < d.nodes.length; i += 20) { await q(`mutation{${d.nodes.slice(i, i + 20).map((p, k) => `r${k}: tagsRemove(id:"${p.id}", tags:["${t}"]){userErrors{message}}`).join(' ')}}`); }
    n += d.nodes.length; if (!d.pageInfo.hasNextPage) break; nach = d.pageInfo.endCursor;
  }
  return n;
}

async function stopp() {
  const r = await rabatteImShop();
  for (const v of r) { console.log(`${LIVE ? 'deaktiviere' : 'würde deaktivieren'}: ${v.title} (${v.status})`); if (LIVE && v.status !== 'EXPIRED') { const d = (await q(`mutation($id:ID!){discountAutomaticDeactivate(id:$id){userErrors{message}}}`, { id: v.id })).discountAutomaticDeactivate; if (d.userErrors.length) throw new Error(JSON.stringify(d.userErrors)); ledger(`stopp ${v.title}`); } }
  if (!LIVE) { for (const t of RABATT_TAGS) console.log(`würde entfernen: Tag ${t} an ${await tagSuche(t, false)} Produkten (Suchindex, kann ~20 s hinterherhinken)`); console.log('Trockenlauf (LIVE=1 schreibt)'); return; }
  // Runden, bis zwei Runden hintereinander nichts mehr finden (der Index zeigt frisch gesetzte Tags erst verzögert)
  let leer = 0;
  for (let runde = 1; runde <= 6 && leer < 2; runde++) {
    let n = 0; for (const t of RABATT_TAGS) { const k = await tagSuche(t, true); n += k; ledger(`stopp-tags ${t} ${k} (Runde ${runde})`); }
    console.log(`Runde ${runde}: ${n} Tag-Entfernungen`); leer = n === 0 ? leer + 1 : 0; if (leer < 2) await schlaf(STOPP_PAUSE_MS);
  }
  // Gegenprobe OHNE Suchindex: frische Bulk-Abfrage (Tags direkt am Produkt); sie sieht nur aktive Produkte, die Suche oben auch Entwürfe
  await bulkLesen();
  const { produkte: alle } = parseBulk(readFileSync(QUELLE, 'utf8'));
  const rest = alle.filter(p => p.tags.some(t => RABATT_TAGS.includes(t)));
  for (let i = 0; i < rest.length; i += 20) await q(`mutation{${rest.slice(i, i + 20).map((p, k) => `r${k}: tagsRemove(id:"${p.id}", tags:${JSON.stringify(RABATT_TAGS)}){userErrors{message}}`).join(' ')}}`);
  if (rest.length) { console.log(`GEGENPROBE: ${rest.length} aktive Produkte trugen noch einen Rabatt-Tag (Suchindex hatte sie nicht gezeigt), jetzt entfernt`); ledger(`stopp-gegenprobe ${rest.length}`); process.exitCode = 2; }
  else console.log('Gegenprobe (ohne Suchindex): kein aktives Produkt trägt noch einen Rabatt-Tag');
  if (process.env.SAMMLUNGEN_LOESCHEN === '1') for (const s of Object.values(SAMMLUNGEN)) {
    const id = await sammlungId(s.handle); if (!id) continue;
    const d = (await q(`mutation($i:CollectionDeleteInput!){collectionDelete(input:$i){deletedCollectionId userErrors{field message}}}`, { i: { id } })).collectionDelete;
    if (d.userErrors.length) throw new Error('collectionDelete ' + JSON.stringify(d.userErrors)); ledger(`sammlung-geloescht ${s.handle} ${id}`); console.log(`Sammlung ${s.handle} gelöscht`);
  }
}

const PHASEN = { plan: planErstellen, tags, sammlungen, rabatte, status, stopp };
if (!PHASEN[PHASE]) { console.error('Phase: plan | status | tags | sammlungen | rabatte | stopp'); process.exit(1); }
await PHASEN[PHASE]();
