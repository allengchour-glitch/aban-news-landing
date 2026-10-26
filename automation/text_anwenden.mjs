#!/usr/bin/env node
/**
 * Setzt die von Agenten geschriebenen Fliesstexte auf die Produktseiten — aber nur, was die Prüfung besteht.
 * Eingabe: /tmp/text_eingabe/<handle>.json (was der Agent sehen durfte), Ausgabe des Agenten: /tmp/text_ausgabe/<handle>.json = {"handle","html"}.
 * Prüfung: lib/text_prosa.mjs (nur schlichtes HTML, jede Zahl muss in den Quellen stehen, keine Marken/Heilversprechen/Preise, Mindestlänge).
 * TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Der Bericht nennt je abgelehntem Text den Grund; abgelehnte Texte ändern nichts.
 * Aufruf: [LIVE=1] node automation/text_anwenden.mjs [IN=/tmp/text_eingabe] [AUS=/tmp/text_ausgabe]
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { zahlen } from './lib/fakten_block.mjs';
import { zerlege, schlichtesProsa, prosaPruefen, prosaEinsetzen } from './lib/text_prosa.mjs';

const LIVE = process.env.LIVE === '1', IN = process.env.IN || '/tmp/text_eingabe', AUS = process.env.AUS || '/tmp/text_ausgabe';
const dateien = existsSync(AUS) ? readdirSync(AUS).filter(f => f.endsWith('.json')) : [];
if (!dateien.length) { console.log('Keine Ausgaben in', AUS); process.exit(0); }
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
mkdirSync('/tmp/text_bericht', { recursive: true });
const stat = { ok: 0, abgelehnt: 0, geschrieben: 0, fehler: 0 }; const abgelehnt = [];
for (const f of dateien) {
  let a, e; try { a = JSON.parse(readFileSync(`${AUS}/${f}`, 'utf8')); e = JSON.parse(readFileSync(`${IN}/${a.handle}.json`, 'utf8')); } catch (x) { stat.fehler++; abgelehnt.push(`${f}: nicht lesbar (${x.message.slice(0, 50)})`); continue; }
  const quellen = [e.cjQuelle, e.alterText, e.faktenBlock, e.titel, ...e.optionen.flatMap(o => [o.name, ...o.werte])].join('\n');
  const erlaubt = new Set(zahlen(quellen)); for (const z of [...erlaubt]) erlaubt.add(String(Number(z)));
  const pr = prosaPruefen(a.html, erlaubt, { titel: e.titel, beleg: e.cjQuelle });
  if (!pr.ok) { stat.abgelehnt++; abgelehnt.push(`${a.handle}: ${pr.gruende.join(' | ')}`); continue; }
  stat.ok++;
  if (!LIVE) continue;
  try {
    const p = (await q(`query($h:String!){productByHandle(handle:$h){id status descriptionHtml}}`, { h: a.handle })).productByHandle;
    if (!p || p.status !== 'ACTIVE') { stat.fehler++; abgelehnt.push(`${a.handle}: nicht aktiv/nicht gefunden`); continue; }
    if (!zerlege(p.descriptionHtml).markiert && !schlichtesProsa(zerlege(p.descriptionHtml).prosa)) { stat.fehler++; abgelehnt.push(`${a.handle}: Prosa inzwischen nicht mehr schlicht`); continue; }
    const neu = prosaEinsetzen(p.descriptionHtml, a.html);
    const u = (await q(`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`, { i: { id: p.id, descriptionHtml: neu } })).productUpdate;
    if (u.userErrors.length) { stat.fehler++; abgelehnt.push(`${a.handle}: ${JSON.stringify(u.userErrors)}`); continue; }
    appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · text-v2 ${a.handle}\n`); stat.geschrieben++;
  } catch (x) { stat.fehler++; abgelehnt.push(`${a.handle}: ${x.message.slice(0, 80)}`); }
}
writeFileSync('/tmp/text_bericht/abgelehnt.txt', abgelehnt.join('\n'));
console.log(`${LIVE ? 'GESCHRIEBEN' : 'BESTEHT PRÜFUNG'}: ${LIVE ? stat.geschrieben : stat.ok} · abgelehnt ${stat.abgelehnt} · Fehler ${stat.fehler} (von ${dateien.length})`);
for (const z of abgelehnt.slice(0, 40)) console.log('  ✗', z.slice(0, 220));
