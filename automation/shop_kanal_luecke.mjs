#!/usr/bin/env node
/**
 * shop_kanal_luecke.mjs (27.11.2026) — zieht AKTIVE Produkte, die nicht auf der Shop-Publikation liegen, NUR dort nach.
 *
 * ANLASS: Betreiber «shop camping push». GEMESSEN 27.11. ~20 UTC (Bulk, 56'423 aktive): 43 aktive NICHT auf Shop —
 * 38 Shisha/Raucher-Zubehör (Tags raucher/smoke-zubehoer/18plus), 1 Mini-Kamera (ueberwachungstechnik/nicht-bewerben),
 * 1 Editor/POD, 3 übrige = Neuware von Minuten (cj_publish publiziert sie selbst) → echte Lücke ≈ 0. Die «3.xxx unveröffentlicht»
 * im Admin sind NICHT die Publikation (0 Entwürfe auf Shop, 43 aktive ohne Shop) — das ist der Angebotsstatus der Shop-App selbst
 * (Prüfung/Eignung), über die Admin-API nur als product.feedback der App «Shop» sichtbar (dropship/GOOGLE-FEEDBACK.md).
 *
 * SPERRLOGIK = publish_guard.mjs (importiert, nicht abgeschrieben): sperrQuellenLaden/sperrGruende/titelUrteile
 * (AUSSCHLUSS_TAGS, ALLE_WERBEKANAELE, Präfixe/Muster, 5 Ledger, Social-Pause, Werbetest, Klingenregel, Feuerzeug/Heil-Schmuck/
 * Schusswaffen). ZUSÄTZLICH hier (nur strenger, nie lockerer): Editor/POD (in der Shop-App nicht gestaltbar), Geschenkkarten,
 * Neuware < 2 h (cj_publish publiziert sie selbst), Versand-Klinge (klingenregel.istHandklinge), Medizin-Zweck in Titel+Text
 * (medizin_zweck.mjs, Text erst bei der Nachprüfung je Produkt), Überwachung (Tag ueberwachungstechnik + Titel),
 * Tabak/Shisha/Vape und Erotik per Titel (ZUSATZ_TITEL unten).
 * FAIL-CLOSED: Sperrquelle unklar, Modul nicht ladbar, Shop-Publikation nicht genau 301971014017/«Shop», Export unvollständig,
 * Titelregeln unklar, mehr Kandidaten als DECKEL (Standard 4000) → es wird NICHT geschrieben (Exit 1/3).
 * SCHREIBT NUR mit LIVE=1 UND APPROVE_PUBLISH=1, und NUR publishablePublish auf die Shop-Publikation.
 * LEDGER dropship/_shop_kanal_publiziert_2711.tsv: Zeit · Produkt-ID · Handle · Aktion (publish = VOR dem Schreiben, ok, fehler,
 * zurueck). Rückweg `--zurueck` = publishableUnpublish NUR Shop, NUR IDs mit «publish» ohne «fehler»/«zurueck» (auch nur scharf).
 *
 *   node automation/shop_kanal_luecke.mjs                                     Trockenlauf (eigener Bulk-Export)
 *   EXPORT=/pfad/aktiv.jsonl node automation/shop_kanal_luecke.mjs            Trockenlauf auf vorhandenem Export (Felder siehe Q_BULK)
 *   LIVE=1 APPROVE_PUBLISH=1 node automation/shop_kanal_luecke.mjs            scharf (nur Shop, Deckel 4000)
 *   node automation/shop_kanal_luecke.mjs --nachmessen                        Stichprobe: 20 freie auf Shop? 10 gesperrte NICHT auf Shop?
 *   LIVE=1 APPROVE_PUBLISH=1 node automation/shop_kanal_luecke.mjs --zurueck  Rückweg aus dem Ledger
 * ENV: SHOPIFY_SHOP + (SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET | SHOPIFY_ADMIN_TOKEN) [DECKEL=4000] [SAVE_EXPORT=datei]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sperrQuellenLaden, sperrGruende, hostOk } from './publish_guard.mjs';
import { istHandklinge } from './klingenregel.mjs';     // statisch: fehlt das Modul, bricht der Lauf VOR jeder Anfrage ab
import { medizinZweck } from './medizin_zweck.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const LEDGER = path.join(HIER, '..', 'dropship', '_shop_kanal_publiziert_2711.tsv');
const SHOP_PUB = 'gid://shopify/Publication/301971014017';
const API = '2026-01';
const env = process.env, argv = process.argv.slice(2);
const LIVE = env.LIVE === '1' && env.APPROVE_PUBLISH === '1', ZURUECK = argv.includes('--zurueck'), NACHMESSEN = argv.includes('--nachmessen');
const DECKEL = Math.max(1, parseInt(env.DECKEL || '4000', 10) || 4000);

// Editor/POD: in der Shop-App nicht gestaltbar → nie in den Shop. Tag-Formen wie mindest_stueckgewinn.SPERR_TAGS + Editor-Tags.
const POD_TAG = /^(?:printful.*|pod|selbst-gestalten|shirt-zum-selbstgestalten|wunschdesign|editor.*)$/i;
export const istEditorPod = p => /luxe-studio/i.test(p.templateSuffix || '') || (p.tags || []).some(t => POD_TAG.test(String(t).trim()));
// Zusatzregeln NUR für diesen Nachzieher (strenger als publish_guard; ein Fehltreffer heisst nur «nicht nachgezogen»).
const ZUSATZ_TAGS = new Set(['ueberwachungstechnik', 'verdeckte-ueberwachung', 'raucher', 'smoke-zubehoer', '18plus', 'erotik', 'medizinprodukt-pruefen']);
const ZUSATZ_TITEL = [
  ['titel:ueberwachung', /\b(?:mini[- ]?kamera|spy|spionage|versteckte\s+kamera|hidden\s+camera|abhör|wanze)/i],
  ['titel:tabak', /\b(?:shisha|hookah|wasserpfeife|tabak|zigarette|e-?zig|vape|bong|grinder|rauchen|raucher)/i],
  ['titel:erotik', /\b(?:erotik|erotisch|sex(?:spielzeug|toy|y\s+dessous)?\b|vibrator|dildo|bdsm|fetisch)/i],
];
export function zusatzGruende(p, text = '') {
  const g = [];
  for (const t of (p.tags || []).map(x => String(x).trim().toLowerCase())) if (ZUSATZ_TAGS.has(t)) g.push('zusatz-tag:' + t);
  for (const [n, re] of ZUSATZ_TITEL) if (re.test(p.title || '')) g.push(n);
  if (istHandklinge(p.title || '')) g.push('titel:handklinge');
  const m = medizinZweck(p.title || '', text);
  if (m) g.push('medizin:' + m.grund);
  return g;
}

const SHOP = String(env.SHOPIFY_SHOP || '').trim();
const fehl = (m, code = 1) => { console.error('FEHLER: ' + m + ' — es wird NICHT geschrieben'); process.exit(code); };
if (!hostOk(SHOP)) fehl('SHOPIFY_SHOP fehlt oder ist kein *.myshopify.com-Host', 2);

async function token() {
  if (env.SHOPIFY_CLIENT_ID && env.SHOPIFY_CLIENT_SECRET) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
    const j = r.ok ? await r.json().catch(() => null) : null;
    if (!j?.access_token) fehl(`OAuth: HTTP ${r.status}`);
    return j.access_token;
  }
  if (!env.SHOPIFY_ADMIN_TOKEN) fehl('keine Shopify-Zugangsdaten', 2);
  return env.SHOPIFY_ADMIN_TOKEN;
}
const TOK = await token();
const warte = ms => new Promise(s => setTimeout(s, ms));
// Drosselung: HTTP 429/5xx und THROTTLED → warten (2 s … 30 s, bis 8 Versuche); bei knappem Punktestand vorsorglich bremsen.
async function gql(query, variables) {
  for (let v = 0; ; v++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60000),
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOK }, body: JSON.stringify({ query, variables }) });
    if ((r.status === 429 || r.status >= 500) && v < 8) { await warte(Math.min(30000, 2000 * 2 ** v)); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (j.errors?.length) {
      if (v < 8 && j.errors.some(e => e?.extensions?.code === 'THROTTLED')) { await warte(Math.min(30000, 2000 * 2 ** v)); continue; }
      throw new Error('GraphQL: ' + JSON.stringify(j.errors.map(e => e.message)).slice(0, 200));
    }
    const ts = j.extensions?.cost?.throttleStatus;
    if (ts && ts.currentlyAvailable < 200) await warte(Math.ceil((200 - ts.currentlyAvailable) / Math.max(1, ts.restoreRate)) * 1000);
    return j.data;
  }
}
const ledgerZeile = (aktion, id, handle) => fs.appendFileSync(LEDGER, [new Date().toISOString(), id, handle, aktion].join('\t') + '\n');
const ledgerLesen = () => (fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').trim().split('\n').filter(Boolean).map(z => z.split('\t')) : []);
const mischen = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// Shop-Publikation: ID UND Name müssen stimmen
const pubs = (await gql('{ publications(first:25){ nodes{ id name } } }')).publications.nodes;
const shop = pubs.find(p => p.id === SHOP_PUB);
if (!shop || !/^shop$/i.test(shop.name.trim())) fehl(`Publikation ${SHOP_PUB} heisst nicht «Shop» (${shop?.name ?? 'fehlt'})`);

const M_PUB = 'mutation($id:ID!,$p:ID!){ publishablePublish(id:$id, input:[{publicationId:$p}]){ userErrors{ field message } } }';
const M_UNPUB = 'mutation($id:ID!,$p:ID!){ publishableUnpublish(id:$id, input:[{publicationId:$p}]){ userErrors{ field message } } }';
const F_PROD = `id handle title productType status tags templateSuffix isGiftCard onShop:publishedOnPublication(publicationId:"${SHOP_PUB}")`;

if (ZURUECK) {
  const offen = new Map();
  for (const [, id, h, a] of ledgerLesen()) { if (a === 'publish') offen.set(id, h); else if (a === 'zurueck' || a === 'fehler') offen.delete(id); }
  console.log(`Rückweg: ${offen.size} Produkt(e) aus dem Ledger · ${LIVE ? 'SCHARF' : 'Trockenlauf'}`);
  if (offen.size > DECKEL) fehl(`${offen.size} > DECKEL ${DECKEL}`, 3);
  for (const [id, h] of offen) {
    if (!LIVE) { console.log('  würde entfernen (nur Shop): ' + h); continue; }
    const e = (await gql(M_UNPUB, { id, p: SHOP_PUB })).publishableUnpublish.userErrors;
    if (e.length) { console.log('  FEHLER ' + h + ': ' + e.map(x => x.message).join('; ')); continue; }
    ledgerZeile('zurueck', id, h); console.log('  entfernt: ' + h);
  }
  process.exit(0);
}

const sq = sperrQuellenLaden();
if (!sq.ok) fehl('Sperrquelle unklar: ' + sq.probleme.join('; '));

if (NACHMESSEN) {
  // (a) bis zu 20 aus dem Ledger («ok»), Rest zufällig über ID-Bereich gezogen (nur aktive, ohne jede Sperre) → sollen auf Shop liegen.
  // (b) 10 aktive mit Sperr-Tag (raucher/smoke-zubehoer/ueberwachungstechnik/18plus) → dürfen NICHT auf Shop liegen.
  const ok = [...new Set(ledgerLesen().filter(z => z[3] === 'ok').map(z => z[1]))];
  const proben = [];
  for (const id of mischen(ok).slice(0, 20)) { const n = (await gql(`query($id:ID!){ product(id:$id){ ${F_PROD} } }`, { id })).product; if (n) proben.push({ ...n, quelle: 'ledger' }); }
  const rand = (await gql('{ a:products(first:1, sortKey:ID){ nodes{ id } } z:products(first:1, sortKey:ID, reverse:true){ nodes{ id } } }'));
  const lo = BigInt(rand.a.nodes[0].id.split('/').pop()), hi = BigInt(rand.z.nodes[0].id.split('/').pop());
  for (let i = 0; proben.length < 20 && i < 400; i++) {   // ID-Lücken ziehen dasselbe Produkt öfter → genug Versuche
    const n0 = lo + BigInt(Math.floor(Math.random() * Number(hi - lo)));
    const n = (await gql(`query($q:String!){ products(first:1, sortKey:ID, query:$q){ nodes{ ${F_PROD} } } }`, { q: `status:active AND id:>${n0}` })).products.nodes[0];
    if (!n || proben.some(x => x.id === n.id) || n.isGiftCard || istEditorPod(n) || sperrGruende(n, sq).length || zusatzGruende(n).length) continue;
    proben.push({ ...n, quelle: 'zufall' });
  }
  // Gegenprobe «weiterhin nicht auf Shop»: mit EXPORT (Vorher-Stand) aus den damals NICHT auf Shop liegenden gesperrten; sonst live gezogen.
  const SPERR4 = ['raucher', 'smoke-zubehoer', 'ueberwachungstechnik', '18plus'];
  const ges = (await gql(`{ products(first:250, query:"status:active AND (tag:raucher OR tag:smoke-zubehoer OR tag:ueberwachungstechnik OR tag:18plus)"){ nodes{ ${F_PROD} } } }`)).products.nodes;
  let gegen;
  if (env.EXPORT) {
    const vorher = fs.readFileSync(env.EXPORT, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
      .filter(p => p.onShop === false && p.tags.some(t => SPERR4.includes(String(t).toLowerCase())));
    gegen = [];
    for (const p of mischen(vorher).slice(0, 10)) { const n = (await gql(`query($id:ID!){ product(id:$id){ ${F_PROD} } }`, { id: p.id })).product; if (n) gegen.push(n); }
  } else gegen = mischen(ges).slice(0, 10);
  const unsere = new Set(ledgerLesen().filter(z => z[3] === 'publish').map(z => z[1]));
  const leck = gegen.filter(p => p.onShop !== false);
  const r = { auf_shop: { geprueft: proben.length, true: proben.filter(p => p.onShop === true).length, aus_ledger: proben.filter(p => p.quelle === 'ledger').length,
      falsch: proben.filter(p => p.onShop !== true).map(p => p.handle) },
    gesperrt_nicht_auf_shop: { quelle: env.EXPORT ? 'Vorher-Export (damals nicht auf Shop)' : 'live', geprueft: gegen.length, nicht_auf_shop: gegen.filter(p => p.onShop === false).length,
      leck: leck.map(p => p.handle), leck_durch_diesen_nachzieher: leck.filter(p => unsere.has(p.id)).map(p => p.handle) },
    gesamtstand_gesperrt_aktiv: { anzahl: ges.length, davon_auf_shop: ges.filter(p => p.onShop).length },
    proben: proben.map(p => `${p.onShop ? 'JA ' : 'NEIN'} ${p.quelle} ${p.title.slice(0, 60)}`),
    gegenprobe: gegen.map(p => `${p.onShop ? 'AUF SHOP' : 'nicht   '} [${p.tags.filter(t => ZUSATZ_TAGS.has(t)).join(',')}] ${p.title.slice(0, 55)}`) };
  console.log(JSON.stringify(r, null, 2));
  // Exit 1 nur, wenn DIESER Nachzieher etwas falsch gemacht hat (Ledger-Probe nicht auf Shop, oder ein von uns publiziertes gesperrtes Produkt)
  process.exit(r.auf_shop.falsch.length || r.gesperrt_nicht_auf_shop.leck_durch_diesen_nachzieher.length ? 1 : 0);
}

// Export: vorhandene Datei oder eigener Bulk (eigene ID abfragen, nie currentBulkOperation — Lehre 25.11.)
const Q_BULK = `{ products(query:"status:active"){ edges{ node{ id handle title productType status tags templateSuffix isGiftCard createdAt
  onShop:publishedOnPublication(publicationId:"${SHOP_PUB}") } } } }`;
let roh;
if (env.EXPORT) roh = fs.readFileSync(env.EXPORT, 'utf8');
else {
  const b = (await gql('mutation($q:String!){ bulkOperationRunQuery(query:$q){ bulkOperation{ id } userErrors{ message } } }', { q: Q_BULK })).bulkOperationRunQuery;
  if (!b.bulkOperation) fehl('Bulk nicht gestartet: ' + b.userErrors.map(e => e.message).join('; '));
  let op;
  for (let i = 0; i < 120; i++) {
    op = (await gql('query($id:ID!){ node(id:$id){ ... on BulkOperation{ status objectCount url errorCode } } }', { id: b.bulkOperation.id })).node;
    if (['COMPLETED', 'FAILED', 'CANCELED', 'EXPIRED'].includes(op.status)) break;
    await warte(10000);
  }
  if (op.status !== 'COMPLETED' || !op.url) fehl(`Bulk ${op.status} ${op.errorCode || ''}`);
  roh = await (await fetch(op.url)).text();
  if (env.SAVE_EXPORT) fs.writeFileSync(env.SAVE_EXPORT, roh);
}
const prods = roh.split('\n').filter(Boolean).map(l => JSON.parse(l));
const zahlAktiv = (await gql('{ productsCount(query:"status:active", limit:null){ count } }')).productsCount.count;
if (prods.length < zahlAktiv * 0.98) fehl(`Export unvollständig (${prods.length} von ${zahlAktiv} aktiven)`);
if (prods.some(p => typeof p.onShop !== 'boolean' || !Array.isArray(p.tags) || typeof p.status !== 'string' || typeof p.title !== 'string')) fehl('Export ohne onShop/tags/status/title-Feld');

const luecke = prods.filter(p => p.status === 'ACTIVE' && p.onShop === false);
const vorfrei = luecke.filter(p => !sperrGruende(p, sq).length);
if (vorfrei.length) sq.titel = sq.titelUrteile(vorfrei);   // wirft bei unklaren Titelregeln
const gruende = new Map(), z = { gesperrt: 0, zusatzregel: 0, editor_pod: 0, geschenkkarte: 0, frisch_unter_2h: 0, publizierbar: 0 }, frei = [], frischListe = [];
// Neuware < 2 h: cj_publish.mjs (PUBS) publiziert sie gerade selbst (GEMESSEN 27.11.: 3 von 3 «publizierbaren» waren Minuten alt)
const frisch = p => !p.createdAt || Date.now() - Date.parse(p.createdAt) < 2 * 3600e3;
for (const p of luecke) {
  const g = sperrGruende(p, sq), zg = g.length ? [] : zusatzGruende(p);
  const k = g.length ? 'gesperrt' : zg.length ? 'zusatzregel' : istEditorPod(p) ? 'editor_pod' : p.isGiftCard ? 'geschenkkarte' : frisch(p) ? 'frisch_unter_2h' : 'publizierbar';
  z[k]++;
  for (const x of new Set([...g, ...zg])) gruende.set(x, (gruende.get(x) || 0) + 1);
  if (k === 'frisch_unter_2h') frischListe.push(`${p.createdAt} ${p.title.slice(0, 70)}`);
  if (k === 'publizierbar') frei.push(p);
}
console.log(JSON.stringify({ modus: LIVE ? `SCHARF (nur Shop, Deckel ${DECKEL})` : 'Trockenlauf', aktiv: prods.length, nicht_im_shop: luecke.length, ...z,
  gruende: Object.fromEntries([...gruende].sort((a, b) => b[1] - a[1]).slice(0, 20)), frisch: frischListe.slice(0, 20),
  stichprobe_zufall_15: mischen(frei).slice(0, 15).map(p => p.title) }, null, 2));
if (frei.length > DECKEL) fehl(`${frei.length} publizierbare > DECKEL ${DECKEL} (bewusst anheben: DECKEL=…)`, 3);
if (!LIVE) process.exit(0);

let serie = 0, ok = 0, uebersprungen = 0;
for (const p of frei) {
  // frisch prüfen: noch aktiv, noch nicht auf Shop, Sperren/Zusatzregeln (jetzt MIT Beschreibungstext für die Medizinregel)
  const n = (await gql(`query($id:ID!){ product(id:$id){ ${F_PROD} descriptionHtml } }`, { id: p.id })).product;
  if (!n || n.status !== 'ACTIVE' || n.onShop || sperrGruende(n, sq).length || zusatzGruende(n, n.descriptionHtml || '').length || istEditorPod(n) || n.isGiftCard) { uebersprungen++; continue; }
  ledgerZeile('publish', n.id, n.handle);
  try {
    const e = (await gql(M_PUB, { id: n.id, p: SHOP_PUB })).publishablePublish.userErrors;
    if (e.length) { console.log('FEHLER ' + n.handle + ': ' + e.map(x => x.message).join('; ')); ledgerZeile('fehler', n.id, n.handle); serie++; }
    else { ledgerZeile('ok', n.id, n.handle); ok++; serie = 0; }
  } catch (err) {
    // Ausgang unklar (Zeitüberschreitung): nachsehen, ob es geklappt hat — sonst «fehler», damit der Rückweg nichts Fremdes entfernt
    let jetzt = null; try { jetzt = (await gql(`query($id:ID!){ product(id:$id){ onShop:publishedOnPublication(publicationId:"${SHOP_PUB}") } }`, { id: n.id })).product?.onShop; } catch {}
    if (jetzt === true) { ledgerZeile('ok', n.id, n.handle); ok++; serie = 0; }
    else { console.log('FEHLER ' + n.handle + ': ' + err.message); ledgerZeile('fehler', n.id, n.handle); serie++; }
  }
  if (serie >= 5) fehl('5 Fehler in Folge — Schleife gestoppt');
}
console.log(`publiziert (nur Shop): ${ok} · übersprungen bei Nachprüfung: ${uebersprungen} · Ledger ${path.relative(process.cwd(), LEDGER)}`);
