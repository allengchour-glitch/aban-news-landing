#!/usr/bin/env node
/**
 * Menü «Schmuck» auf die Schmuck-Taxonomie umstellen: ersetzt NUR die Kinder des obersten Punkts «Schmuck» (Link /collections/schmuck),
 * alles andere im Hauptmenü bleibt, wie es ist. Regeln und Prüfungen: lib/schmuck_menue.mjs (getestet, schmuck_menue_test.mjs).
 *
 * TROCKENLAUF IST VORGABE: ohne LIVE=1 wird nur gerechnet und die Vorschau des Astes gezeigt. Mit LIVE=1: Sicherung des ganzen Hauptmenüs nach
 * dropship/menu-sicherung/main-menu-vor-schmuck-2710.json (eine vorhandene Sicherung wird NIE überschrieben, die neue bekommt dann einen Zeitstempel),
 * menuUpdate, danach NACHLESEN und Vergleich mit dem gesendeten Baum (Exit 3 bei Abweichung). Exit 2 = Prüffehler, nichts geschrieben.
 *
 * Voraussetzung für LIVE (Reihenfolge): 1) Tags und Collections der Kategorien (SCHMUCK=1 PREFIX=s- kategorien_anlegen.mjs, PHASE=tags, dann PHASE=sammlungen),
 * 2) die sechs Gruppen-Collections (schmuck_gruppen.mjs), 3) dieses Skript. Fehlende Collections werden gemeldet; im Trockenlauf werden sie übersprungen,
 * mit LIVE=1 bricht der Lauf ab (Exit 2), weil sonst Teile des heutigen Menüs ersatzlos wegfielen. Nur mit ERLAUBE_LUECKEN=1 werden sie auch live übersprungen.
 *
 * ANNAHME_ALLE=1 (nur Trockenlauf): tut so, als gäbe es alle geplanten Collections, und zeigt den Ast, wie er nach dem Anlegen aussähe.
 */
import { writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { eingabeAus } from './menu_eintrag_einfuegen.mjs';
import { gleicherBaum, suche } from './lib/menue_plan.mjs';
import { alleHandles, schmuckMenue, pruefeSchmuck, titelWarnungen, PFAD } from './lib/schmuck_menue.mjs';

const FELDER = 'id title type resourceId url tags';
const MENU_Q = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;
const SICHERUNG = 'dropship/menu-sicherung/main-menu-vor-schmuck-2710.json';
const LEDGER = 'dropship/kategorien_ledger.txt';

/**
 * Der ganze Lauf, mit eingespeister Abfrage `q(query, variables)` (Tests spielen eine Attrappe ein).
 * @returns {Promise<{code:number, baum?:object[], fehlend?:string[], fehler?:string[]}>}  code 0 = in Ordnung, 1 = Aufruffehler, 2 = Prüffehler/Lücken, 3 = Abweichung beim Nachlesen
 */
export async function menueLauf(q, { live = false, annahmeAlle = false, erlaubeLuecken = false, sicherung = SICHERUNG, ledger = LEDGER, jetzt = () => new Date(), out = console.log, err = console.error } = {}) {
  if (live && annahmeAlle) { err('ANNAHME_ALLE gibt es nur im Trockenlauf (LIVE=1 würde Ziele schreiben, die es nicht gibt)'); return { code: 1 }; }
  const m = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  if (!m) { err('Hauptmenü nicht gefunden'); return { code: 1 }; }
  const alt = eingabeAus(m.items);
  const gids = {}, titel = {};
  for (const h of alleHandles()) {
    const c = (await q(`query($h:String!){collectionByHandle(handle:$h){id title}}`, { h })).collectionByHandle;
    gids[h] = c?.id || null; if (c) titel[h] = c.title;
  }
  const imShop = Object.values(gids).filter(Boolean).length;
  out(`Collections im Shop: ${imShop} von ${alleHandles().length} geprüft`);
  if (annahmeAlle) {
    for (const h of alleHandles()) if (!gids[h]) gids[h] = `gid://annahme/${h}`;
    out(`ANNAHME_ALLE: ${alleHandles().length - imShop} fehlende Collections werden als vorhanden angenommen - nur Vorschau, so sähe der Ast nach dem Anlegen aus`);
  }
  const { baum, log, fehlend } = schmuckMenue(alt, gids, titel);
  out(log.join('\n'));
  const fehler = pruefeSchmuck(alt, baum);
  if (fehler.length) { err('\nABBRUCH, nichts geschrieben:\n- ' + fehler.join('\n- ')); return { code: 2, fehler }; }
  const lang = titelWarnungen(baum);
  if (lang.length) out(`\nHINWEIS: Menütitel über 34 Zeichen: ${lang.join('; ')}`);

  const zeige = (items, d = 0) => items.forEach(i => { out('  '.repeat(d) + '· ' + i.title); zeige(i.items || [], d + 1); });
  const ast = suche(baum, PFAD);
  out(`\nVORSCHAU des Astes «${PFAD.join(' > ')}» (${ast.items.length} Köpfe, ${ast.items.reduce((a, k) => a + k.items.length, 0)} Kinder):`);
  zeige(ast.items, 1);
  if (!live) { out('\nTrockenlauf - nichts geschrieben.'); return { code: 0, baum, fehlend }; }

  if (fehlend.length && !erlaubeLuecken) {
    err(`\nABBRUCH, nichts geschrieben: ${fehlend.length} Collections fehlen noch (${fehlend.slice(0, 8).join(', ')}${fehlend.length > 8 ? ' …' : ''}). Erst kategorien_anlegen.mjs (PHASE=sammlungen) und schmuck_gruppen.mjs, oder bewusst ERLAUBE_LUECKEN=1.`);
    return { code: 2, fehlend, fehler: ['Collections fehlen'] };
  }
  mkdirSync(dirname(sicherung), { recursive: true });
  const datei = existsSync(sicherung) ? sicherung.replace(/\.json$/, `-${jetzt().toISOString().replace(/[:.]/g, '-')}.json`) : sicherung;
  writeFileSync(datei, JSON.stringify(m, null, 1));
  out(`Sicherung: ${datei}`);
  const w = await q(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`, { id: m.id, t: m.title, h: m.handle, i: baum });
  if (w.menuUpdate.userErrors.length) throw new Error('menuUpdate ' + JSON.stringify(w.menuUpdate.userErrors));
  const zurueck = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  const v = gleicherBaum(baum, eingabeAus(zurueck.items));
  out('Vergleich gesendet ↔ zurückgelesen:', JSON.stringify({ gleich: v.gleich, nurGesendet: v.nurGesendet.length, nurZurueck: v.nurZurueck.length }));
  if (!v.gleich) { err('ABWEICHUNG!', v.nurGesendet.slice(0, 8), v.nurZurueck.slice(0, 8), '- Sicherung liegt in', datei); return { code: 3, baum, fehlend }; }
  appendFileSync(ledger, `${jetzt().toISOString()} · menü schmuck umgebaut\n`);
  out('OK: Menü umgebaut und nachgelesen. Oberste Ebene:', zurueck.items.map(x => x.title).join(' | '));
  return { code: 0, baum, fehlend };
}

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const res = await menueLauf(q, { live: process.env.LIVE === '1', annahmeAlle: process.env.ANNAHME_ALLE === '1', erlaubeLuecken: process.env.ERLAUBE_LUECKEN === '1' });
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
