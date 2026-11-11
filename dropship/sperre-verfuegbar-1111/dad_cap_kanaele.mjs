// Dad-Cap (gesperrtes «Selbst gestalten»-Produkt): Zwischenlösung über die Verkaufskanäle (11.11.2026).
//
// Warum: Der Bestand des Dad-Cap liegt am Standort des Printful-Dienstes; Shopify lehnt unser Schreiben dort ab
// (inventorySetQuantities: INVALID_LOCATION, gemessen 11.11. 09:06 UTC). sperr_verfuegbar.mjs kann ihn darum nicht
// «nicht kaufbar» stellen. Entscheid des Besitzers am 11.11.: «1, solange nicht du fix» = von den Kanälen nehmen,
// bis das Produkt richtig freigeschaltet ist.
//
// Was das Skript tut: nimmt das Produkt von allen Verkaufskanälen ausser dem Onlineshop und setzt das Tag
// `editor-gesperrt-nicht-live`. Der Montags-Wächter (automation/publish_guard.mjs) holt Produkte mit einem Tag,
// das «nicht-live» enthält, nicht auf die Kanäle zurück (automation/lib/kanal_sperren.mjs). Status, Seite im
// Onlineshop, Beschreibung, Preis und Bestand bleiben. Restlücke: ein direkter Warenkorb-Link im Onlineshop.
//
// Aufrufe:  node dad_cap_kanaele.mjs                     Trockenlauf (Vorgabe)
//           LIVE=1 node dad_cap_kanaele.mjs              schreibt, legt sicherung_dad_cap.json an, liest zurück
//           ZURUECK=1 LIVE=1 node dad_cap_kanaele.mjs    veröffentlicht wieder auf den Kanälen der Sicherung, Tag weg
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = process.env.SICHERUNG || join(HIER, 'sicherung_dad_cap.json');
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const HANDLE = 'dad-cap-selbst-gestalten';
const PRODUKT = 'gid://shopify/Product/15422849188225';
const TAG = 'editor-gesperrt-nicht-live';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2026-01';

let token = null;
async function gql(query, variables = {}) {
  if (!token) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
    const j = await r.json(); if (!j.access_token) throw new Error('kein Zugang (Client-Credentials)'); token = j.access_token;
  }
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
  const j = await r.json(); if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 400));
  return j.data;
}
function fehler(d, feld) { const e = d?.[feld]?.userErrors || []; if (e.length) throw new Error(`${feld}: ${JSON.stringify(e).slice(0, 300)}`); }
const istOnlineshop = (titel) => / for Online Store$/i.test(String(titel || '').trim());

async function lesen() {
  const d = await gql(`query($id:ID!){ product(id:$id){ id handle status tags descriptionHtml resourcePublicationsV2(first:30){ nodes{ isPublished publication{ id catalog{ title } } } } } }`, { id: PRODUKT });
  const p = d.product; if (!p || p.handle !== HANDLE) throw new Error('Produkt nicht gefunden oder anderes Handle');
  return { id: p.id, handle: p.handle, status: p.status, tags: p.tags, gesperrt: /lx-v63-editor:start product=gid:\/\/shopify\/Product\/15422849188225 mode=blocked/.test(p.descriptionHtml || ''),
    kanaele: p.resourcePublicationsV2.nodes.filter((n) => n.isPublished).map((n) => ({ id: n.publication.id, titel: n.publication.catalog?.title || '' })) };
}
const namen = (ks) => ks.map((k) => k.titel.replace(/^Channel Catalog \d+ for /, '')).join(', ') || 'keiner';

const ist = await lesen();
console.log(`IST ${ist.handle} | ${ist.status} | Sperre in der Beschreibung: ${ist.gesperrt} | Tag gesetzt: ${ist.tags.includes(TAG)} | Kanäle: ${namen(ist.kanaele)}`);

if (ZURUECK) {
  if (!existsSync(SICHERUNG)) { console.error('keine Sicherung vorhanden: ' + SICHERUNG); process.exit(1); }
  const alt = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
  const fehlend = alt.kanaele.filter((k) => !ist.kanaele.some((x) => x.id === k.id));
  console.log(`${LIVE ? 'LIVE' : 'PLAN'} Rücknahme: wieder veröffentlichen auf ${namen(fehlend)}; Tag ${TAG} entfernen`);
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
  if (fehlend.length) fehler(await gql(`mutation($id:ID!,$input:[PublicationInput!]!){ publishablePublish(id:$id, input:$input){ userErrors{ field message } } }`, { id: PRODUKT, input: fehlend.map((k) => ({ publicationId: k.id })) }), 'publishablePublish');
  fehler(await gql(`mutation($id:ID!,$tags:[String!]!){ tagsRemove(id:$id, tags:$tags){ userErrors{ field message } } }`, { id: PRODUKT, tags: [TAG] }), 'tagsRemove');
  await new Promise((ok) => setTimeout(ok, 5000));
  const neu = await lesen(); const ok = alt.kanaele.every((k) => neu.kanaele.some((x) => x.id === k.id)) && !neu.tags.includes(TAG);
  console.log(`NACHGELESEN Kanäle: ${namen(neu.kanaele)} | Tag gesetzt: ${neu.tags.includes(TAG)} | ${ok ? 'OK' : 'ABWEICHUNG'}`); process.exit(ok ? 0 : 1);
}

if (!ist.gesperrt) { console.log('Die Beschreibung trägt kein «mode=blocked» mehr: nichts zu tun (Produkt ist entsperrt).'); process.exit(0); }
const weg = ist.kanaele.filter((k) => !istOnlineshop(k.titel));
const bleibt = ist.kanaele.filter((k) => istOnlineshop(k.titel));
if (bleibt.length !== 1) { console.error(`erwartet genau einen Onlineshop-Kanal, gefunden ${bleibt.length}: Abbruch`); process.exit(1); }
console.log(`${LIVE ? 'LIVE' : 'PLAN'} abwählen: ${namen(weg)} | bleibt: ${namen(bleibt)} | Tag ${TAG} ${ist.tags.includes(TAG) ? 'schon gesetzt' : 'setzen'}`);
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
if (!existsSync(SICHERUNG)) {
  if (weg.length < 2) { console.error('Kanäle sind schon abgewählt und es gibt keine Sicherung: nichts geschrieben.'); process.exit(1); }
  writeFileSync(SICHERUNG, JSON.stringify({ gelesen: new Date().toISOString(), produkt: ist.id, handle: ist.handle, tags: ist.tags, kanaele: ist.kanaele }, null, 1), { flag: 'wx' });
}
if (!ist.tags.includes(TAG)) fehler(await gql(`mutation($id:ID!,$tags:[String!]!){ tagsAdd(id:$id, tags:$tags){ userErrors{ field message } } }`, { id: PRODUKT, tags: [TAG] }), 'tagsAdd');   // Tag zuerst: ein Wächterlauf dazwischen holt nichts zurück
if (weg.length) fehler(await gql(`mutation($id:ID!,$input:[PublicationInput!]!){ publishableUnpublish(id:$id, input:$input){ userErrors{ field message } } }`, { id: PRODUKT, input: weg.map((k) => ({ publicationId: k.id })) }), 'publishableUnpublish');
await new Promise((ok) => setTimeout(ok, 5000));
const neu = await lesen();
const ok = neu.kanaele.length === 1 && istOnlineshop(neu.kanaele[0].titel) && neu.tags.includes(TAG) && neu.status === 'ACTIVE';
console.log(`NACHGELESEN ${neu.status} | Kanäle: ${namen(neu.kanaele)} | Tag gesetzt: ${neu.tags.includes(TAG)} | ${ok ? 'OK' : 'ABWEICHUNG'}`);
process.exit(ok ? 0 : 1);
