#!/usr/bin/env node
/**
 * Setzt die Übersetzungsvorschläge der Auswahl-Prüfung um: Optionswerte umbenennen (productOptionUpdate). Plan und Sicherungen: lib/option_umbenennen.mjs.
 * Eingabe: /tmp/auswahl_qa/_urteil_*.json (Liste von {handle, uebersetzung:{Option:{alt:neu}}}). TROCKENLAUF IST VORGABE (LIVE=1 schreibt).
 * Namen ändern sich, Varianten, Preise, Bilder und Bestellungen bleiben. Abgelehnte Vorschläge (unbekannter Wert, Kollision, erfundene Zahl) ändern nichts.
 */
import { readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { plane } from './lib/option_umbenennen.mjs';
const LIVE = process.env.LIVE === '1', DIR = process.env.DIR || '/tmp/auswahl_qa';
const urteile = readdirSync(DIR).filter(f => /^_urteil_\d+\.json$/.test(f)).flatMap(f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')));
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const stat = { produkte: 0, werte: 0, abgelehnt: 0, fehler: 0 }; const log = [];
for (const u of urteile.filter(x => x.uebersetzung && Object.keys(x.uebersetzung).length)) {
  try {
    const p = (await q(`query($h:String!){productByHandle(handle:$h){id options{id name optionValues{id name}}}}`, { h: u.handle })).productByHandle;
    if (!p) { log.push(`${u.handle}: Produkt fehlt`); continue; }
    const pl = plane(p.options, u.uebersetzung);
    stat.abgelehnt += pl.abgelehnt.length; for (const a of pl.abgelehnt) log.push(`  ✗ ${u.handle}: ${a}`);
    if (!pl.aenderungen.length) continue;
    stat.produkte++; stat.werte += pl.aenderungen.length;
    if (!LIVE) { for (const a of pl.aenderungen.slice(0, 2)) log.push(`  ${u.handle.slice(0, 40)}: ${a.option}: «${a.alt}» → «${a.neu}»`); continue; }
    const nachOption = new Map(); for (const a of pl.aenderungen) nachOption.set(a.optionId, [...(nachOption.get(a.optionId) || []), { id: a.valueId, name: a.neu }]);
    for (const [optionId, werte] of nachOption) {
      const d = (await q(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$v){userErrors{message code}}}`, { p: p.id, o: { id: optionId }, v: werte })).productOptionUpdate;
      if (d.userErrors.length) { stat.fehler++; log.push(`  ✗ ${u.handle}: ${JSON.stringify(d.userErrors).slice(0, 160)}`); }
    }
    appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · optionen-umbenannt ${u.handle} ${pl.aenderungen.length}\n`);
  } catch (e) { stat.fehler++; log.push(`${u.handle}: FEHLER ${e.message.slice(0, 100)}`); }
}
console.log(log.slice(0, 60).join('\n'));
console.log(`\n${LIVE ? 'UMBENANNT' : 'WÜRDE UMBENENNEN'}: ${stat.werte} Werte in ${stat.produkte} Produkten · abgelehnt ${stat.abgelehnt} · Fehler ${stat.fehler}`);
