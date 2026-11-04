#!/usr/bin/env node
/**
 * Rücknahme der Menü-Trennung «Küche & Kochen» / «Geschirr & Tisch»: stellt das Hauptmenü aus der Sicherung wieder her, die kueche_geschirr_menue.mjs mit LIVE=1 angelegt hat
 * (dropship/menu-sicherung/main-menu-vor-kueche-geschirr-0311.json; mit SICHERUNG=<Datei> eine andere, etwa die mit Zeitstempel).
 *
 * WARUM NICHT EINFACH DIE SICHERUNG ZURÜCKSCHREIBEN: die fünf Gruppen und ihre Kinder wurden beim Umbau als NEUE Menü-Einträge angelegt, ihre alten Ids gibt es danach nicht mehr
 * (menuUpdate meldet für eine unbekannte Id NOT_FOUND). Hier werden darum nur die Ids gestrichen, die im aktuellen Menü nicht mehr vorkommen; alle anderen bleiben (Übersetzungen hängen an der Id).
 * Die zwei neuen Köpfe fehlen in der Sicherung und fallen damit weg. Die sieben neuen Sammlungen bleiben im Shop (harmlos, nur nicht mehr verlinkt).
 *
 * TROCKENLAUF IST VORGABE (liest und rechnet). LIVE=1: aktuelles Menü sichern (eine vorhandene Sicherungsdatei wird NIE überschrieben), menuUpdate, STRENG nachlesen gegen die Sicherung
 * (Titel, Typ, Reihenfolge, Ziel UND Ids der behaltenen Einträge). Exit 0 in Ordnung, 1 Aufruffehler/Sicherung unlesbar, 2 Prüffehler (nichts geschrieben), 3 Abweichung beim Nachlesen
 * (geschrieben, Sicherung des Zwischenstands liegt vor), 4 Menü während des Laufs verändert (nichts geschrieben).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { eingabeAus } from './menu_eintrag_einfuegen.mjs';
import { gleicherBaum, gleicheZiele } from './lib/menue_plan.mjs';
import { rueckgaengigEingabe, ziele, ELTERN, KUECHE, GESCHIRR, ALTE_KOPFTITEL } from './lib/kueche_geschirr_menue.mjs';

const FELDER = 'id title type resourceId url tags';
const MENU_Q = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;
export const SICHERUNG = 'dropship/menu-sicherung/main-menu-vor-kueche-geschirr-0311.json';
const ZWISCHEN = 'dropship/menu-sicherung/main-menu-nach-kueche-geschirr-0311.json';
const LEDGER = 'dropship/kategorien_ledger.txt';
const idsFlach = items => items.flatMap(i => [i.id ?? null, ...idsFlach(i.items || [])]);

export async function kuecheGeschirrZurueckLauf(q, { live = false, sicherung = SICHERUNG, zwischen = ZWISCHEN, ledger = LEDGER, jetzt = () => new Date(), out = console.log, err = console.error } = {}) {
  let alt;
  try { alt = JSON.parse(readFileSync(sicherung, 'utf8')); } catch (e) { err(`Sicherung ${sicherung} nicht lesbar (${e.message})`); return { code: 1 }; }
  if (!alt?.id || alt.handle !== 'main-menu' || !Array.isArray(alt.items) || !alt.items.length) { err('Die Sicherung ist kein Hauptmenü (id, handle main-menu, items fehlen)'); return { code: 1 }; }
  const m = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  if (!m || m.handle !== 'main-menu' || m.id !== alt.id) { err('ABBRUCH: das gelesene Menü ist nicht das der Sicherung'); return { code: 1 }; }
  const jetztEingabe = eingabeAus(m.items);
  const soll = rueckgaengigEingabe(alt.items, m.items);
  const sollRoh = eingabeAus(alt.items);
  const gestrichen = idsFlach(sollRoh).filter(x => x && !idsFlach(soll).includes(x)).length;
  out(`Sicherung: ${alt.items.length} oberste Einträge (${ziele(sollRoh).length} Einträge), aktuell ${m.items.length}; ${gestrichen} Ids der Sicherung gibt es nicht mehr (neue Einträge werden angelegt)`);
  // Die Sicherung muss der Stand VOR dem Umbau sein: wer versehentlich den Zwischenstand (nach dem Umbau) übergibt, würde den Umbau «wiederherstellen».
  if (alt.items.some(x => [KUECHE.titel, GESCHIRR.titel, ...Object.keys(ALTE_KOPFTITEL)].includes(x.title)) || !alt.items.some(x => x.title === ELTERN)) { err(`ABBRUCH, nichts geschrieben: die Sicherung ist nicht der Stand VOR dem Umbau («${ELTERN}» fehlt oder «${KUECHE.titel}»/«${GESCHIRR.titel}» stehen schon darin)`); return { code: 2, fehler: ['Sicherung ist nicht der Stand vor dem Umbau'] }; }
  if (!live) { out(`Trockenlauf - nichts geschrieben. Oberste Ebene danach: ${soll.map(x => x.title).join(' | ')}`); return { code: 0, soll }; }

  const frisch = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  if (!frisch || frisch.id !== m.id || JSON.stringify(eingabeAus(frisch.items)) !== JSON.stringify(jetztEingabe)) { err('ABBRUCH, nichts geschrieben: das Hauptmenü hat sich seit dem Lesen verändert. Bitte neu starten.'); return { code: 4, fehler: ['Menü während des Laufs verändert'] }; }
  mkdirSync(dirname(zwischen), { recursive: true });
  const datei = existsSync(zwischen) ? zwischen.replace(/\.json$/, `-${jetzt().toISOString().replace(/[:.]/g, '-')}.json`) : zwischen;
  writeFileSync(datei, JSON.stringify(frisch, null, 1));
  out(`Sicherung des aktuellen Stands: ${datei}`);
  const w = await q(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`, { id: frisch.id, t: frisch.title, h: frisch.handle, i: soll });
  if (w.menuUpdate.userErrors.length) throw new Error('menuUpdate ' + JSON.stringify(w.menuUpdate.userErrors));
  let zurueck;
  try { zurueck = eingabeAus((await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0].items); }
  catch (e) { err(`FEHLER beim Nachlesen NACH dem Schreiben (${e.message}): das Menü ist zurückgesetzt, nicht geprüft. Zwischenstand: ${datei}`); return { code: 3, fehler: ['Nachlesen fehlgeschlagen'] }; }
  const v2 = gleicherBaum(sollRoh, zurueck), z2 = gleicheZiele(sollRoh, zurueck);
  // Ids der behaltenen Einträge müssen die der Sicherung sein
  const idsSoll = idsFlach(soll).filter(Boolean), idsIst = new Set(idsFlach(zurueck));
  const idFehlt = idsSoll.filter(x => !idsIst.has(x));
  out('Vergleich Sicherung ↔ zurückgelesen:', JSON.stringify({ gleich: v2.gleich && z2.gleich, nurSicherung: v2.nurGesendet.length, nurZurueck: v2.nurZurueck.length, zielAbweichungen: z2.abweichungen.length, idsFehlen: idFehlt.length }));
  if (!v2.gleich || !z2.gleich || idFehlt.length) { err('ABWEICHUNG!', v2.nurGesendet.slice(0, 8), v2.nurZurueck.slice(0, 8), z2.abweichungen.slice(0, 8), idFehlt.slice(0, 5), '- Zwischenstand liegt in', datei); return { code: 3, fehler: ['Abweichung'] }; }
  try { appendFileSync(ledger, `${jetzt().toISOString()} · menü küche/geschirr zurückgenommen\n`); } catch (e) { err(`HINWEIS: zurückgenommen, aber der Ledger-Eintrag ging nicht (${e.message})`); }
  out('OK: Menü aus der Sicherung wiederhergestellt und streng nachgelesen. Oberste Ebene:', zurueck.map(x => x.title).join(' | '));
  return { code: 0, soll };
}

export const optionenAusEnv = env => ({ live: env.LIVE === '1', ...(env.SICHERUNG ? { sicherung: env.SICHERUNG } : {}) });

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const res = await kuecheGeschirrZurueckLauf(q, optionenAusEnv(process.env));
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
