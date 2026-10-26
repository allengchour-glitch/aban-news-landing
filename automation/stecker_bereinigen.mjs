#!/usr/bin/env node
/**
 * Stecker-Prüfung für die Schweiz: nimmt weg, was in Schweizer Steckdosen nicht passt.
 *
 * WARUM (25.10.2026): Der User sah eine Steckdosenleiste mit Euro-Stecker (Schuko) und eine Ladestation mit amerikanischem Stecker auf dem Bild.
 * Schweizer Steckdosen (Typ J) nehmen den flachen Euro-Stecker (Typ C) auf, aber NICHT den Schuko-Stecker (Typ F), keinen UK-, US- oder AU-Stecker.
 * Gemessen: 179 Produkte tragen Stecker-Varianten (US/UK/AU, 110 V); dazu Steckdosenleisten, Smart-Steckdosen und Unterputz-Steckdosen.
 *
 * Zwei Schritte, beide mit Trockenlauf als Vorgabe (LIVE=1 schreibt):
 *  A) STECKDOSEN-WARE (Leisten, Smart-/Funk-Steckdosen, Zeitschaltuhren, Thermostat-Steckdosen, Tischsteckdosen mit Schuko): → DRAFT + Tag «stecker-nicht-ch».
 *     Sie stecken selbst in der Wand ODER nehmen einen Stecker auf — beides geht mit dem Euro-/Schuko-Aufbau nicht.
 *  B) VARIANTEN mit fremdem Stecker (US/UK/AU/JP, 110/120/100 V): Variante löschen. Bleibt keine übrig, wird das Produkt DRAFT.
 *     Varianten ohne Steckerangabe und solche mit EU/220 V bleiben (der Euro-Stecker Typ C passt).
 *
 * Aufruf:  node automation/stecker_bereinigen.mjs                (Trockenlauf; braucht /tmp/katalog_voll.json und /tmp/stecker_optionen.json)
 *          LIVE=1 node automation/stecker_bereinigen.mjs
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';

const LIVE = process.env.LIVE === '1';
const buch = 'a-zäöüß0-9';
const tok = re => new RegExp(`(^|[^${buch}])(${re})(?![${buch}])`, 'i');
/** Fremder Stecker/Spannung in einem Variantenwert: US, UK, AU, AUS, JP, USA, 110/120/100 V. Rein, getestet. */
const NICHT_CH_KLEIN = tok('us|uk|au|jp|cn|usa|us/cn|110 ?v|120 ?v|100 ?v|us[- ]?stecker|uk[- ]?stecker|au[- ]?stecker|us plug|uk plug|au plug|aus plug|british standard|american standard|us standard|american version|china[- ]?stecker|cn plug');
const AUS_GROSS = new RegExp('(^|[^' + buch + '])AUS(?![' + buch + '])'); // «aus» (Holz) ist deutsch, «AUS» der Stecker
export const NICHT_CH = { test: t => NICHT_CH_KLEIN.test(t) || AUS_GROSS.test(t) };
// 220/230 V ist eine SPANNUNG, kein Steckertyp: «Netzstecker-220 V US» ist ein US-Stecker an 220 V und passt nicht (nachgemessen 26.10., retro-super-console, air-fryer «UK 220 V»).
export const EURO = tok('eu|eu[- ]?stecker|eu plug|schuko|euro');
/** Steckdosen-Ware: Leisten, Smart-/Funk-Steckdosen, Zeitschaltuhren, Thermostat-Steckdosen, Tischsteckdosen. Rein, getestet. */
export const STECKDOSE_RE = /steckdosenleiste|steckerleiste|mehrfachsteckdose|mehrfachstecker|steckdosenverteiler|steckdosenpanel|vierfachstecker|tischsteckdose|funksteckdose|smart[- ]?plug|wlan-?steckdose|wifi-?steckdose|smart[- ]?(home )?steckdose|zeitschaltuhr-?steckdose|thermostat[- ]?steckdose|thermostatische smart steckdose|steckdosenadapter|überspannungsschutz|steckdose mit (timer|überspannung)|wasserdichte steckdose|insekten kletterwand smart steckdose|rubik'?s cube mehrfach/i;
export const STECKDOSE_AUSSER = /schutz(deckel|abdeckung)|halterung|organizer|tester|reiseadapter|ladesteckdose|usb-hub|helligkeitssensor|nachttischlampe|ersatz/i;
export const STECKDOSE_G = /Power Strips|Power Outlets & Sockets|Power Control Units|Wall Socket Controls|Surge Protection/;
export const istSteckdosenWare = p => (STECKDOSE_G.test(p.g || '') || STECKDOSE_RE.test(p.title || '')) && !STECKDOSE_AUSER(p.title || '');
function STECKDOSE_AUSER(t) { return STECKDOSE_AUSSER.test(t); }

/** Entscheidung je Variante. 'weg' | 'bleibt'. Euro oder ohne Angabe bleibt; fremd ohne Euro-Zusatz fliegt. Rein, getestet. */
export function variantenUrteil(werte) {
  const text = werte.join(' | ');
  if (EURO.test(text)) return 'bleibt';
  if (NICHT_CH.test(text)) return 'weg';
  return 'bleibt';
}
/** Entscheidung je Produkt: { loeschen: [variantenIds], draft: bool }. Rein, getestet. */
export function produktUrteil(varianten) {
  const weg = varianten.filter(v => variantenUrteil(v.werte) === 'weg');
  if (!weg.length) return { loeschen: [], draft: false };
  const bleiben = varianten.length - weg.length;
  return { loeschen: bleiben ? weg.map(v => v.id) : [], draft: bleiben === 0 };
}

async function main() {
  const katalog = JSON.parse(readFileSync('/tmp/katalog_voll.json', 'utf8')).produkte;
  const opt = JSON.parse(readFileSync('/tmp/stecker_optionen.json', 'utf8'));
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const token = (await r.json()).access_token;
  const q = (query, variables) => shopifyGql(SHOP, '2025-01', token, query, variables);

  // A) Steckdosen-Ware
  const A = katalog.filter(istSteckdosenWare);
  console.log(`A) Steckdosen-Ware: ${A.length}`); for (const p of A) console.log('   ', p.handle.slice(0, 48).padEnd(48), '|', p.title.slice(0, 54));
  // B) Varianten
  const B = []; const nur = new Set(A.map(p => p.id));
  for (let i = 0; i < opt.length; i += 20) {
    const teil = opt.slice(i, i + 20).filter(o => !nur.has(o.id));
    if (!teil.length) continue;
    const d = await q(`query($ids:[ID!]!){nodes(ids:$ids){... on Product{id handle title variantsCount{count} variants(first:250){nodes{id title selectedOptions{name value}}}}}}`, { ids: teil.map(o => o.id) });
    for (const n of d.nodes.filter(Boolean)) {
      const vs = n.variants.nodes.map(v => ({ id: v.id, werte: v.selectedOptions.map(o => o.value) }));
      const u = produktUrteil(vs);
      if (u.loeschen.length || u.draft) B.push({ id: n.id, handle: n.handle, title: n.title, gesamt: vs.length, weg: vs.filter(v => variantenUrteil(v.werte) === 'weg').length, ...u });
    }
  }
  console.log(`\nB) Produkte mit fremden Steckervarianten: ${B.length} · davon ganz DRAFT: ${B.filter(b => b.draft).length} · Varianten zu löschen: ${B.reduce((a, b) => a + b.loeschen.length, 0)}`);
  for (const b of B) console.log('   ', b.handle.slice(0, 46).padEnd(46), `${b.weg}/${b.gesamt}`.padStart(7), b.draft ? 'DRAFT' : 'Varianten löschen');
  writeFileSync('/tmp/stecker_plan.json', JSON.stringify({ A: A.map(p => p.id), B }, null, 1));
  if (!LIVE) { console.log('\nTrockenlauf — nichts geschrieben. Plan: /tmp/stecker_plan.json'); return; }

  const ledger = z => appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · stecker ${z}\n`);
  const schlaf = ms => new Promise(r => setTimeout(r, ms));
  const retry = async (m, v = {}) => { for (let n = 0; ; n++) { try { return await q(m, v); } catch (e) { if (n >= 6 || !/Throttled|THROTTLED|429/.test(e.message)) throw e; await schlaf(15000 * (n + 1)); } } };
  const draft = async (ids) => { for (let i = 0; i < ids.length; i += 20) { const teil = ids.slice(i, i + 20);
    const m = `mutation{${teil.map((id, n) => `a${n}:productUpdate(input:{id:${JSON.stringify(id)},status:DRAFT,tags:[]}){userErrors{message}} t${n}:tagsAdd(id:${JSON.stringify(id)},tags:["stecker-nicht-ch"]){userErrors{message}}`).join(' ')}}`;
    const d = await q(m, {}); for (let n = 0; n < teil.length; n++) if (d[`a${n}`].userErrors.length) throw new Error(JSON.stringify(d[`a${n}`].userErrors)); } };
  // productUpdate mit tags:[] würde Tags LEEREN → bewusst nur Status setzen
  const statusDraft = async ids => { for (let i = 0; i < ids.length; i += 5) { const teil = ids.slice(i, i + 5);
    const m = `mutation{${teil.map((id, n) => `a${n}:productUpdate(input:{id:${JSON.stringify(id)},status:DRAFT}){userErrors{message}} t${n}:tagsAdd(id:${JSON.stringify(id)},tags:["stecker-nicht-ch"]){userErrors{message}}`).join(' ')}}`;
    const d = await retry(m); for (let n = 0; n < teil.length; n++) if (d[`a${n}`].userErrors.length) throw new Error(JSON.stringify(d[`a${n}`].userErrors)); } };
  void draft;
  await statusDraft([...A.map(p => p.id), ...B.filter(b => b.draft).map(b => b.id)]);
  ledger(`draft ${A.length + B.filter(b => b.draft).length}`);
  for (const b of B.filter(x => x.loeschen.length)) {
    for (let i = 0; i < b.loeschen.length; i += 100) {
      const d = await retry(`mutation($p:ID!,$v:[ID!]!){productVariantsBulkDelete(productId:$p,variantsIds:$v){userErrors{message}}}`, { p: b.id, v: b.loeschen.slice(i, i + 100) });
      if (d.productVariantsBulkDelete.userErrors.length) console.error('   ✗', b.handle, JSON.stringify(d.productVariantsBulkDelete.userErrors));
    }
    await retry(`mutation{tagsAdd(id:${JSON.stringify(b.id)},tags:["stecker-bereinigt-2510"]){userErrors{message}}}`);
  }
  ledger(`varianten ${B.filter(x => x.loeschen.length).length} Produkte`);
  console.log('Fertig.');
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
