#!/usr/bin/env node
/**
 * Fügt einer Collection im Hauptmenü einen Eintrag hinzu — ohne das übrige Menü zu verändern.
 *
 * WARUM SO VORSICHTIG: `menuUpdate` ERSETZT den ganzen Baum. Ein Eintrag, den die Eingabe vergisst, ist danach weg
 * (404 im Menü, Kundinnen sehen eine Kategorie weniger). Darum: 1) altes Menü als Datei sichern, 2) Eingabe AUS dem gelesenen Baum
 * bauen (nichts von Hand), 3) nach dem Schreiben den Baum neu lesen und gegen den alten vergleichen — alles ausser dem neuen
 * Eintrag muss gleich sein, sonst ist das Ergebnis ein Fehler und die Sicherungsdatei zeigt den alten Stand.
 *
 * Trockenlauf ist Vorgabe.
 * Aufruf: ELTERN="Wohnen & Garten" NACH="Küche & Kochen" HANDLE=tassen-becher TITEL="Tassen & Becher" [LIVE=1] node automation/menu_eintrag_einfuegen.mjs
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const LIVE = process.env.LIVE === '1';
const MENUE = process.env.MENUE || 'main-menu';

const FELDER = 'id title type resourceId url tags';
const ABFRAGE = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;

/** Reiner Umbau: aus dem gelesenen Baum die Eingabe für menuUpdate (IDs bleiben, damit nichts neu angelegt wird). */
export function eingabeAus(items) {
  return items.map(i => ({ id: i.id, title: i.title, type: i.type, ...(i.resourceId ? { resourceId: i.resourceId } : {}), ...(i.url ? { url: i.url } : {}),
    ...(i.tags?.length ? { tags: i.tags } : {}), items: eingabeAus(i.items || []) }));
}
/** Fügt den neuen Eintrag unter ELTERN ein (nach NACH, sonst am Ende). Wirft, wenn ELTERN fehlt oder der Eintrag schon da ist. */
export function einfuegen(eingabe, { eltern, nach, neu }) {
  const e = eingabe.find(x => x.title === eltern);
  if (!e) throw new Error(`Eltern-Eintrag «${eltern}» nicht gefunden`);
  if (e.items.some(x => x.title === neu.title || (neu.resourceId && x.resourceId === neu.resourceId))) throw new Error('Eintrag ist schon vorhanden');
  const pos = nach ? e.items.findIndex(x => x.title === nach) : -1;
  const kopie = JSON.parse(JSON.stringify(eingabe));
  const ziel = kopie.find(x => x.title === eltern);
  ziel.items.splice(pos >= 0 ? pos + 1 : ziel.items.length, 0, neu);
  return kopie;
}
/** Vergleich alt/neu: alles ausser dem einen neuen Eintrag muss unverändert sein (Titel, Typ, Ziel, Reihenfolge, Tiefe). */
export function unterschiede(alt, neu) {
  const flach = (items, pfad = '') => items.flatMap(i => [`${pfad}/${i.title}|${i.type}|${i.url || i.resourceId || ''}`, ...flach(i.items || [], `${pfad}/${i.title}`)]);
  const a = flach(alt), n = flach(neu);
  return { fehlend: a.filter(x => !n.includes(x)), neu: n.filter(x => !a.includes(x)), reihenfolgeGleich: JSON.stringify(a.filter(x => n.includes(x))) === JSON.stringify(n.filter(x => a.includes(x))) };
}

async function main() {
  const { ELTERN, NACH, HANDLE, TITEL } = process.env;
  if (!ELTERN || !HANDLE || !TITEL) { console.error('ELTERN, HANDLE und TITEL sind Pflicht'); process.exit(1); }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  const q = (query, variables) => shopifyGql(SHOP, '2025-01', tok, query, variables);

  const m = (await q(ABFRAGE, { h: `handle:${MENUE}` })).menus.nodes[0];
  if (!m) throw new Error('Menü nicht gefunden');
  const col = (await q(`query($h:String!){collectionByHandle(handle:$h){id title}}`, { h: HANDLE })).collectionByHandle;
  if (!col) throw new Error(`Collection ${HANDLE} nicht gefunden`);

  mkdirSync('dropship/menu-sicherung', { recursive: true });
  const datei = `dropship/menu-sicherung/${MENUE}-vor-${HANDLE}.json`;
  writeFileSync(datei, JSON.stringify(m, null, 1));
  console.log('Sicherung:', datei, '| oberste Einträge', m.items.length);

  const eingabe = eingabeAus(m.items);
  const neu = einfuegen(eingabe, { eltern: ELTERN, nach: NACH, neu: { title: TITEL, type: 'COLLECTION', resourceId: col.id, items: [] } });
  const kinder = neu.find(x => x.title === ELTERN).items.map(x => x.title);
  console.log(`Neue Reihenfolge unter «${ELTERN}» (${kinder.length}):`, kinder.slice(0, 8).join(' | '), kinder.length > 8 ? '…' : '');
  if (!LIVE) { console.log('Trockenlauf — nichts geschrieben.'); return; }

  const w = await q(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`,
    { id: m.id, t: m.title, h: m.handle, i: neu });
  if (w.menuUpdate.userErrors.length) throw new Error('menuUpdate ' + JSON.stringify(w.menuUpdate.userErrors));
  const nach_ = (await q(ABFRAGE, { h: `handle:${MENUE}` })).menus.nodes[0];
  const u = unterschiede(m.items, nach_.items);
  console.log('Vergleich nach dem Schreiben:', JSON.stringify({ fehlend: u.fehlend.length, neu: u.neu, reihenfolgeGleich: u.reihenfolgeGleich }));
  if (u.fehlend.length || !u.reihenfolgeGleich || u.neu.length !== 1) {
    console.error('ABWEICHUNG! Fehlende Einträge:', u.fehlend.slice(0, 10), '— Sicherung liegt in', datei);
    process.exit(2);
  }
  console.log('OK: genau ein neuer Eintrag, alles andere unverändert.');
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
