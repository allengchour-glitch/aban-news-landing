// Gesperrte «Selbst gestalten»-Produkte auch serverseitig nicht kaufbar machen (11.11.2026).
//
// Warum: Magnet, Dad-Cap und Bügeltransfer tragen seit 08.11. in der Beschreibung die Sperre «Personalisierung
// derzeit nicht bestellbar» (Marker «lx-v63-editor:start … mode=blocked», Review-Gate des Editor-Rollouts). Die
// Sperre wirkt nur im Browser der Produktseite. GEMESSEN am 11.11.: POST /cart/add.js nimmt die Variante trotzdem
// an (HTTP 200), alle fünf Varianten sind «availableForSale», die Produkte stehen auf acht Kanälen (auch
// Google & YouTube) und ihr JSON-LD meldet «InStock».
//
// Was das Skript tut (nur diese drei Produkte, nur solange die Beschreibung «mode=blocked» trägt), je Variante:
//   Bestandsführung an (tracked = true), Mengen über 0 auf 0, zuletzt die Regel «bei 0 nicht verkaufen» (DENY).
//   Folge: nicht kaufbar auf allen Kanälen, JSON-LD «OutOfStock». Status, Kanäle, Beschreibung, Preise und Tags
//   bleiben unverändert. Mengen von 0 oder darunter werden nicht angefasst.
// Reihenfolge: bis zum letzten Schritt bleibt eine Variante kaufbar wie vorher; ein Abbruch hinterlässt keinen
//   schlechteren Zustand, ein erneuter Lauf setzt fort. Rücknahme: Menge, dann Regel, zuletzt Bestandsführung aus.
// Der Dad-Cap liegt am Standort des Printful-Dienstes: er läuft zuletzt, und Printful kann die Menge wieder auf
//   9999 setzen (dann wieder kaufbar). Darum: PRUEFEN=1 regelmässig fahren.
//
// Aufrufe:   node sperr_verfuegbar.mjs                    Trockenlauf (Vorgabe): liest und zeigt den Plan
//            LIVE=1 node sperr_verfuegbar.mjs             sperrt, liest frisch zurück (Exit 1 bei Abweichung)
//            PRUEFEN=1 node sperr_verfuegbar.mjs          nur lesen: Exit 2, wenn ein gesperrtes Produkt kaufbar ist
//            PRUEFEN=1 BEKANNT_KAUFBAR=handle1,handle2 …        dieselbe Prüfung; die genannten Produkte zählen nicht (bekannte Lücke, z. B. Dad-Cap)
//            ZURUECK=1 LIVE=1 node sperr_verfuegbar.mjs   stellt den Ausgangsstand wieder her
//            NUR=handle1[,handle2] …                      jeder der Aufrufe oben, aber nur für die genannten Produkte: die übrigen
//                                                         werden weder geändert noch zurückgelesen noch geprüft. Ein unbekanntes
//                                                         Handle bricht ab, bevor irgendetwas gelesen wird.
// WICHTIG für den Editor-Rollout: VOR dem Entsperren eines der drei Produkte die Rücknahme NUR für dieses Produkt fahren
//   (Magnet: ZURUECK=1 LIVE=1 NUR=magnet-zum-selbstgestalten), sonst meldet das Rollout-Werkzeug «keine kaufbare Variante».
//   Ohne NUR würden auch die Produkte wieder kaufbar, die gesperrt bleiben sollen.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = process.env.SICHERUNG || join(HIER, 'sicherung.json');
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const PRUEFEN = process.env.PRUEFEN === '1';
const BEKANNT = new Set((process.env.BEKANNT_KAUFBAR || '').split(',').map((s) => s.trim()).filter(Boolean));   // nur für PRUEFEN: bekannte Lücken zählen nicht
const HANDLES = ['magnet-zum-selbstgestalten', 'buegeltransfer-selbst-gestalten', 'dad-cap-selbst-gestalten'];
// NUR=<handle>[,<handle>]: Eingrenzung auf einzelne Produkte (alle Modi). Leer oder nicht gesetzt = alle drei wie bisher.
// Gelesen werden immer alle drei (die Sicherung bleibt vollständig); bearbeitet, zurückgelesen und geprüft nur die gewählten.
const NUR_ROH = process.env.NUR ?? '';
const NUR = NUR_ROH.split(',').map((s) => s.trim()).filter(Boolean);
{
  const fremd = NUR.filter((h) => !HANDLES.includes(h));
  // «NUR=,» oder ein Tippfehler darf nie still zu «alle drei» werden: das würde bei ZURUECK auch die anderen Sperren aufheben.
  if (fremd.length || (NUR_ROH.trim() !== '' && !NUR.length) || new Set(NUR).size !== NUR.length) {
    console.error(`NUR ist unbrauchbar (${JSON.stringify(NUR_ROH)}): erlaubt sind ${HANDLES.join(', ')}, je höchstens einmal. Nichts gelesen, nichts geschrieben.`);
    process.exit(1);
  }
}
const gewaehlt = (p) => !NUR.length || NUR.includes(p.handle);
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2026-01';
const V = (n) => 'gid://shopify/ProductVariant/' + n;
// Ausgangsstand, gemessen am 11.11.2026 08:55 UTC vor der ersten Änderung. Nur aus diesem Stand entsteht eine Sicherung.
const AUSGANG = {
  [V('55791941812609')]: { tracked: false, policy: 'CONTINUE', menge: 0 },      // Magnet 7,6 × 7,6 cm
  [V('55791941845377')]: { tracked: false, policy: 'CONTINUE', menge: 0 },      // Magnet 10 × 10 cm
  [V('55791941878145')]: { tracked: false, policy: 'CONTINUE', menge: 0 },      // Magnet 15 × 15 cm
  [V('55784678654337')]: { tracked: false, policy: 'CONTINUE', menge: -1 },     // Bügeltransfer A3
  [V('55778063843713')]: { tracked: true, policy: 'CONTINUE', menge: 9999 },    // Dad-Cap (Standort Printful)
};

let token = null;
async function gql(query, variables = {}) {
  if (!token) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
    const j = await r.json(); if (!j.access_token) throw new Error('kein Zugang (Client-Credentials)'); token = j.access_token;
  }
  for (let versuch = 1; ; versuch++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
    const j = await r.json();
    const gedrosselt = (j.errors || []).some((e) => e.extensions?.code === 'THROTTLED');
    if (gedrosselt && versuch < 5) { await new Promise((ok) => setTimeout(ok, 2000 * versuch)); continue; }
    if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 400));
    return j.data;
  }
}
const warte = (ms) => new Promise((ok) => setTimeout(ok, ms));

const LESEN = `query($q:String!){ products(first:10, query:$q){ nodes{ id handle status descriptionHtml variants(first:100){ nodes{ id title sku availableForSale inventoryPolicy inventoryItem{ id tracked inventoryLevels(first:5){ nodes{ location{ id name isFulfillmentService } quantities(names:["available"]){ quantity } } } } } } } } }`;
async function lesen() {
  const d = await gql(LESEN, { q: HANDLES.map((h) => 'handle:' + h).join(' OR ') });
  const ps = d.products.nodes.filter((p) => HANDLES.includes(p.handle));
  if (ps.length !== HANDLES.length) throw new Error(`erwartet ${HANDLES.length} Produkte, gelesen ${ps.length}`);
  const liste = ps.map((p) => ({ id: p.id, handle: p.handle, status: p.status,
    gesperrt: new RegExp(`lx-v63-editor:start product=${p.id.replace(/[/.]/g, '\\$&')} mode=blocked`).test(p.descriptionHtml || ''),
    varianten: p.variants.nodes.map((v) => ({ id: v.id, titel: v.title, sku: v.sku, kaufbar: v.availableForSale, policy: v.inventoryPolicy, item: v.inventoryItem.id, tracked: v.inventoryItem.tracked, staende: v.inventoryItem.inventoryLevels.nodes.map((l) => ({ ort: l.location.id, name: l.location.name, dienst: l.location.isFulfillmentService, menge: l.quantities[0]?.quantity ?? null })) })) }));
  const dienst = (p) => Number(p.varianten.some((v) => v.staende.some((s) => s.dienst)));
  return liste.sort((a, b) => dienst(a) - dienst(b) || HANDLES.indexOf(a.handle) - HANDLES.indexOf(b.handle));   // Produkte am Dienst-Standort zuletzt
}
const zeile = (v) => `kaufbar=${v.kaufbar} tracked=${v.tracked} ${v.policy} menge=${v.staende.map((s) => `${s.name}:${s.menge}`).join(',')}`;

function fehler(d, feld) { const e = d?.[feld]?.userErrors || []; if (e.length) throw new Error(`${feld}: ${JSON.stringify(e).slice(0, 300)}`); }
const M_ITEM = `mutation($id:ID!,$input:InventoryItemInput!){ inventoryItemUpdate(id:$id, input:$input){ inventoryItem{ id tracked } userErrors{ field message } } }`;
const M_VAR = `mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$p, variants:$v){ productVariants{ id inventoryPolicy } userErrors{ field message } } }`;
const M_MENGE = `mutation($input:InventorySetQuantitiesInput!,$key:String!){ inventorySetQuantities(input:$input) @idempotent(key:$key){ inventoryAdjustmentGroup{ id } userErrors{ field message code } } }`;

async function setze(produkt, v, ziel) {
  if (ziel.tracked && !v.tracked) fehler(await gql(M_ITEM, { id: v.item, input: { tracked: true } }), 'inventoryItemUpdate');
  for (const s of ziel.staende) {
    const jetzt = v.staende.find((x) => x.ort === s.ort)?.menge ?? null;
    if (jetzt === s.menge) continue;
    // changeFromQuantity = eben gelesene Menge: hat ein anderer inzwischen geschrieben, meldet Shopify das, statt zu überschreiben
    fehler(await gql(M_MENGE, { key: randomUUID(), input: { name: 'available', reason: 'correction', quantities: [{ inventoryItemId: v.item, locationId: s.ort, quantity: s.menge, changeFromQuantity: jetzt }] } }), 'inventorySetQuantities');
  }
  if (v.policy !== ziel.policy) fehler(await gql(M_VAR, { p: produkt.id, v: [{ id: v.id, inventoryPolicy: ziel.policy }] }), 'productVariantsBulkUpdate');
  if (!ziel.tracked && v.tracked) fehler(await gql(M_ITEM, { id: v.item, input: { tracked: false } }), 'inventoryItemUpdate');
}

const alle = await lesen();
const ist = alle.filter(gewaehlt);
if (NUR.length) console.log(`NUR ${NUR.join(', ')}: ${alle.filter((p) => !gewaehlt(p)).map((p) => p.handle).join(', ')} werden weder geändert noch zurückgelesen noch geprüft.`);

if (PRUEFEN) {
  let offen = 0;
  for (const p of ist) for (const v of p.varianten) {
    const kaufbarTrotzSperre = p.gesperrt && v.kaufbar;
    const bekannt = kaufbarTrotzSperre && BEKANNT.has(p.handle);
    const schlecht = kaufbarTrotzSperre && !bekannt;
    if (schlecht) offen++;
    console.log(`${schlecht ? 'KAUFBAR TROTZ SPERRE' : bekannt ? 'bekannte Lücke (zählt nicht)' : 'ok'} ${p.handle} | ${v.titel} | sperre=${p.gesperrt} ${zeile(v)}`);
  }
  console.log(offen ? `${offen} Variante(n) gesperrter Produkte sind kaufbar.` : 'Kein gesperrtes Produkt ist kaufbar.');
  process.exit(offen ? 2 : 0);
}

const wieAusgang = alle.every((p) => p.varianten.every((v) => { const a = AUSGANG[v.id]; return a && v.tracked === a.tracked && v.policy === a.policy && v.staende.length === 1 && v.staende[0].menge === a.menge; }));
if (!existsSync(SICHERUNG)) {
  if (ZURUECK) { console.error('keine Sicherung vorhanden: ' + SICHERUNG); process.exit(1); }
  if (LIVE) {
    if (!wieAusgang) { console.error('Shop ist nicht im Ausgangsstand vom 11.11. und es gibt keine Sicherung: nichts geschrieben.'); process.exit(1); }
    writeFileSync(SICHERUNG, JSON.stringify({ gelesen: new Date().toISOString(), produkte: alle.map(({ gesperrt, ...p }) => p) }, null, 1), { flag: 'wx' });
  }
}
const sicherung = existsSync(SICHERUNG) ? JSON.parse(readFileSync(SICHERUNG, 'utf8')) : { produkte: alle };
const ausSicherung = (pid, vid) => sicherung.produkte.find((x) => x.id === pid)?.varianten.find((x) => x.id === vid);
for (const p of sicherung.produkte) for (const v of p.varianten) {
  const a = AUSGANG[v.id];
  if (existsSync(SICHERUNG) && !(a && v.tracked === a.tracked && v.policy === a.policy && v.staende[0]?.menge === a.menge)) { console.error(`Sicherung weicht vom Ausgangsstand ab (${p.handle} ${v.titel}): Abbruch, nichts geschrieben.`); process.exit(1); }
}

function zielFuer(p, v) {
  const va = ausSicherung(p.id, v.id);
  if (!va) return null;
  if (ZURUECK) return { tracked: va.tracked, policy: va.policy, staende: va.staende.filter((s) => s.menge > 0).map((s) => ({ ort: s.ort, menge: s.menge })) };
  return { tracked: true, policy: 'DENY', staende: v.staende.filter((s) => s.menge > 0).map((s) => ({ ort: s.ort, menge: 0 })) };
}
const erreicht = (v, ziel) => v.tracked === ziel.tracked && v.policy === ziel.policy && ziel.staende.every((s) => v.staende.find((x) => x.ort === s.ort)?.menge === s.menge);

let abweichung = 0;
for (const p of ist) {
  for (const v of p.varianten) {
    const ziel = zielFuer(p, v);
    if (!ziel) { console.error(`${p.handle} | ${v.titel}: Variante nicht in der Sicherung (neu?), nicht angefasst`); abweichung++; continue; }
    if (!ZURUECK && !p.gesperrt) { console.log(`ÜBERSPRUNGEN ${p.handle} | ${v.titel}: Beschreibung trägt kein «mode=blocked» mehr`); continue; }
    const gleich = erreicht(v, ziel);
    console.log(`${LIVE ? 'LIVE' : 'PLAN'} ${p.handle} | ${v.titel} | jetzt: ${zeile(v)} → Ziel: tracked=${ziel.tracked} ${ziel.policy} menge=${ziel.staende.map((s) => s.menge).join(',') || 'unverändert'}${gleich ? ' (schon so)' : ''}`);
    if (LIVE && !gleich) {
      try { await setze(p, v, ziel); } catch (e) { console.error(`FEHLER ${p.handle} | ${v.titel}: ${e.message}`); abweichung++; }
    }
  }
}
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(abweichung ? 1 : 0); }

// Frisch zurücklesen: erst die geschriebenen Felder, dann availableForSale (rechnet Shopify zeitversetzt nach, bis rund 90 s)
let neu = (await lesen()).filter(gewaehlt); let felder = 0;
for (const p of neu) for (const v of p.varianten) { const ziel = zielFuer(p, v); if (ziel && (ZURUECK || p.gesperrt) && !erreicht(v, ziel)) felder++; }
const sollKaufbar = (p, v) => (ZURUECK ? ausSicherung(p.id, v.id)?.kaufbar : !p.gesperrt);
let wartet = 0;
for (let versuch = 1; versuch <= 15; versuch++) {
  wartet = 0;
  for (const p of neu) for (const v of p.varianten) if (v.kaufbar !== sollKaufbar(p, v)) wartet++;
  if (!wartet) break;
  await warte(6000); neu = (await lesen()).filter(gewaehlt);
}
for (const p of neu) for (const v of p.varianten) {
  const ziel = zielFuer(p, v); const okFelder = !ziel || !(ZURUECK || p.gesperrt) || erreicht(v, ziel); const okKauf = v.kaufbar === sollKaufbar(p, v);
  console.log(`NACHGELESEN ${p.handle} | ${v.titel} | ${zeile(v)} | ${okFelder ? 'Felder OK' : 'FELDER WEICHEN AB'} | ${okKauf ? 'Kaufbarkeit OK' : 'KAUFBARKEIT WEICHT AB'}`);
}
if (felder || abweichung) { console.error(`Rücklesen: ${felder} Variante(n) mit abweichenden Feldern, ${abweichung} Fehler beim Schreiben.`); process.exit(1); }
if (wartet) { console.error(`Felder geschrieben, aber ${wartet} Variante(n) zeigen nach 90 s noch die alte Kaufbarkeit: später mit PRUEFEN=1 nachlesen.`); process.exit(3); }
console.log('Rücklesen: alles wie geplant.');
