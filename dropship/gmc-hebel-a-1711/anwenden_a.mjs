// GMC Hebel A (Tag am Produkt), Charge-Werkzeug. Trockenlauf ist Vorgabe: schreibt nichts in den Shop, nur die Planliste.
// LIVE=1: setzt den Tag bei den Produkten der Planliste (Tore werden direkt vorher noch einmal geprueft), Abbruch beim ersten Fehler.
// ZURUECK=1 LIVE=1: entfernt den Tag bei allen Eintraegen des Ledgers mit ok=true.
// Eingaben: POOL (Datei mit Produktnummern, kommagetrennt, Reihenfolge = Rang), N (Anzahl je Charge, Vorgabe 150), PLAN (Planliste), LEDGER.
import { gql } from './gql.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const TAG = 'gmc-sync-1511';
const GOOGLE_KANAL = 'gid://shopify/Publication/302872297857';
const POOL = process.env.POOL || 'pool-rang-1-300.txt', PLAN = process.env.PLAN || 'plan-charge1.json', LEDGER = process.env.LEDGER || 'ledger-a.json';
const N = Number(process.env.N || 150), AB = Number(process.env.AB || 0);
const SPERR = /^(adult|18plus|nicht-bewerben|compliance|google-bild|google-gesperrt|lizenz-nicht|stecker-nicht|text-offen|grind-gehalten|bazg|feingehalt|gold-pruef|silber-pruef|waffen|sperr)/i;
const warte = ms => new Promise(r => setTimeout(r, ms));
const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : [];
const log = e => { ledger.push({ zeit: new Date().toISOString(), ...e }); writeFileSync(LEDGER, JSON.stringify(ledger, null, 1)); };
const Q = `query($id:ID!,$pub:ID!){ product(id:$id){ id handle status tags updatedAt publishedOnPublication(publicationId:$pub) variants(first:100){ nodes{ availableForSale price } } } }`;
const lesen = async pid => (await gql(Q, { id: `gid://shopify/Product/${pid}`, pub: GOOGLE_KANAL })).product;
const tore = p => {
  if (!p) return 'Produkt fehlt';
  if (p.status !== 'ACTIVE') return 'nicht ACTIVE';
  if (!p.publishedOnPublication) return 'nicht im Google-Kanal';
  const v = p.variants.nodes;
  if (!v.some(x => x.availableForSale)) return 'keine Variante verkaufbar';
  if (!v.every(x => Number(x.price) > 0)) return 'Preis 0';
  if (p.tags.some(t => SPERR.test(t))) return 'Sperr-Tag';
  if (p.tags.includes(TAG)) return 'Tag schon gesetzt';
  return null;
};

if (ZURUECK) {
  const ids = ledger.filter(e => e.aktion === 'tagsAdd' && e.ok).map(e => e.pid);
  console.log('Rücknahme für', ids.length, 'Produkte', LIVE ? '(LIVE)' : '(Trockenlauf)');
  for (const pid of ids) {
    if (!LIVE) { console.log('[TROCKEN] tagsRemove', pid); continue; }
    const r = await gql(`mutation($id:ID!,$t:[String!]!){ tagsRemove(id:$id, tags:$t){ userErrors{ message } } }`, { id: pid, t: [TAG] });
    log({ aktion: 'tagsRemove', pid, fehler: r.tagsRemove.userErrors });
    if (r.tagsRemove.userErrors.length) { console.log('FEHLER', pid, JSON.stringify(r.tagsRemove.userErrors)); process.exit(1); }
    await warte(1000);
  }
  process.exit(0);
}

if (!LIVE) {
  // Trockenlauf: Planliste bauen
  const pool = readFileSync(POOL, 'utf8').trim().split(',').slice(AB);
  const gruende = {}; const plan = [];
  for (const pid of pool) {
    if (plan.length >= N) break;
    const p = await lesen(pid); const g = tore(p);
    if (g) { gruende[g] = (gruende[g] || 0) + 1; continue; }
    plan.push({ pid: p.id, handle: p.handle, tagsVorher: p.tags, updatedAtVorher: p.updatedAt });
    await warte(150);
  }
  writeFileSync(PLAN, JSON.stringify(plan, null, 1));
  console.log(`Trockenlauf: ${plan.length} Produkte in ${PLAN}; abgelehnt:`, JSON.stringify(gruende));
  process.exit(0);
}

// LIVE
const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
const schon = new Set(ledger.filter(e => e.aktion === 'tagsAdd' && e.ok).map(e => e.pid));
let ok = 0;
for (const e of plan) {
  if (schon.has(e.pid)) continue;
  const p = (await gql(Q, { id: e.pid, pub: GOOGLE_KANAL })).product; const g = tore(p);
  if (g) { log({ aktion: 'uebersprungen', handle: e.handle, pid: e.pid, grund: g }); console.log('übersprungen', e.handle, g); continue; }
  const r = await gql(`mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id, tags:$t){ userErrors{ message } } }`, { id: e.pid, t: [TAG] });
  await warte(1500);
  const nachher = (await gql(Q, { id: e.pid, pub: GOOGLE_KANAL })).product;
  const gut = !r.tagsAdd.userErrors.length && nachher.tags.includes(TAG) && nachher.updatedAt !== p.updatedAt;
  log({ aktion: 'tagsAdd', handle: e.handle, pid: e.pid, vorher: p.updatedAt, nachher: nachher.updatedAt, ok: gut, fehler: r.tagsAdd.userErrors });
  if (!gut) { console.log('ABWEICHUNG, Abbruch:', e.handle, JSON.stringify(r.tagsAdd.userErrors)); process.exit(1); }
  ok++;
}
console.log(`LIVE fertig: ${ok} Produkte mit Tag ${TAG}`);
