#!/usr/bin/env node
/**
 * Menü der Bekleidung auf die Mode-Taxonomie umstellen (Damen, Herren, Kinder & Baby). Regeln: lib/mode_menue.mjs (getestet).
 *
 * TROCKENLAUF IST VORGABE: ohne LIVE=1 wird nur gerechnet und die Vorschau gezeigt. Mit LIVE=1: Sicherung des ganzen Menüs nach
 * dropship/menu-sicherung/main-menu-vor-mode-2610.json, menuUpdate, danach NACHLESEN und Vergleich (bei Abweichung Exit 3).
 * Voraussetzung: die Collections existieren (kategorien_anlegen.mjs PREFIX=m- PHASE=sammlungen). Fehlende werden übersprungen und gemeldet.
 */
import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { eingabeAus } from './menu_eintrag_einfuegen.mjs';
import { gleicherBaum } from './lib/menue_plan.mjs';
import { modeMenue, pruefeMenue, PFADE } from './lib/mode_menue.mjs';
import { menueEintraege } from './lib/mode_taxonomie.mjs';

const LIVE = process.env.LIVE === '1';
const FELDER = 'id title type resourceId url tags';
const MENU_Q = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

  const m = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  const alt = eingabeAus(m.items);
  const plan = Object.fromEntries(Object.keys(PFADE).map(t => [t, menueEintraege(t)]));
  const handles = new Set(Object.values(plan).flatMap(l => l.flatMap(e => [e.handle, ...(e.unterfilter || []).map(u => u.handle)])));
  const gids = {};
  for (const h of handles) { gids[h] = (await q(`query($h:String!){collectionByHandle(handle:$h){id}}`, { h })).collectionByHandle?.id || null; }
  console.log(`Collections im Shop: ${Object.values(gids).filter(Boolean).length} von ${handles.size} geprüft`);

  const { baum, log } = modeMenue(alt, plan, gids);
  console.log(log.join('\n'));
  const fehler = pruefeMenue(alt, baum);
  if (fehler.length) { console.error('\nABBRUCH, nichts geschrieben:\n- ' + fehler.join('\n- ')); process.exit(2); }

  const zeige = (items, d = 0) => items.forEach(i => { console.log('  '.repeat(d) + '· ' + i.title); zeige(i.items || [], d + 1); });
  const vorschau = Object.values(PFADE).map(p => p.join(' > '));
  console.log('\nVORSCHAU der drei umgebauten Äste:');
  for (const pfad of Object.values(PFADE)) { let e = { items: baum }; for (const t of pfad) e = e.items.find(x => x.title === t); console.log(`\n${pfad.join(' > ')} (${e.items.length} Einträge)`); zeige(e.items, 1); }
  if (!LIVE) { console.log('\nTrockenlauf — nichts geschrieben.'); return; }

  mkdirSync('dropship/menu-sicherung', { recursive: true });
  const datei = 'dropship/menu-sicherung/main-menu-vor-mode-2610.json';
  writeFileSync(datei, JSON.stringify(m, null, 1));
  const w = await q(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`, { id: m.id, t: m.title, h: m.handle, i: baum });
  if (w.menuUpdate.userErrors.length) throw new Error('menuUpdate ' + JSON.stringify(w.menuUpdate.userErrors));
  const zurueck = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  const v = gleicherBaum(baum, eingabeAus(zurueck.items));
  console.log('Vergleich gesendet ↔ zurückgelesen:', JSON.stringify({ gleich: v.gleich, nurGesendet: v.nurGesendet.length, nurZurueck: v.nurZurueck.length }));
  if (!v.gleich) { console.error('ABWEICHUNG!', v.nurGesendet.slice(0, 8), v.nurZurueck.slice(0, 8), '— Sicherung liegt in', datei); process.exit(3); }
  appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · menü mode-bekleidung umgebaut\n`);
  console.log('OK: Menü umgebaut und nachgelesen. Oberste Ebene:', zurueck.items.map(x => x.title).join(' | '));
}
main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
