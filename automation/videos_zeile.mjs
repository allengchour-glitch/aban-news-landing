#!/usr/bin/env node
/* 🎬 videos_zeile.mjs — hält die Video-Zeile des Shops aktuell (TikTok / YouTube).
 *
 * WAS: liest data/luxe-videos-quellen.json ({"tiktok":[Video-URLs], "youtube":[Kanal-IDs oder Video-URLs]}),
 * holt für TikTok-Adressen die oEmbed-Daten (Titel, Vorschaubild), für YouTube-Kanal-IDs den RSS-Feed
 * (neueste 6) und für einzelne YouTube-Videos die Vorschau aus der Video-ID, baut daraus die Liste
 * (neueste zuerst, höchstens 12, doppelte Adressen raus) und schreibt sie per metafieldsSet in das
 * Shop-Metafeld luxe.videos (Typ json). Das Theme (sections/luxe-videos.liquid) liest genau dieses Feld.
 *
 * TROCKENLAUF IST DIE VORGABE: ohne LIVE=1 wird nichts geschrieben und keine Zugangsdaten gebraucht.
 * Der HTTP-Fehler eines einzelnen Eintrags bricht den Lauf NICHT ab (Eintrag übersprungen, im Bericht
 * genannt); 429/5xx werden mit wachsender Pause nachgefasst (automation/lib/videos_zeile.mjs).
 *
 * SICHERUNGEN vor dem Schreiben (lib `darfSchreiben`): eine leere Liste oder ein Lauf, in dem über die
 * Hälfte der Quellen ausfiel, ersetzt die bisherige Liste NICHT (Vorgabe). `LEER=1` erlaubt die leere
 * Liste, `TROTZDEM=1` erzwingt auch den Ausfall-Fall — die Gültigkeitsprüfung (nur https, nur TikTok/
 * YouTube) lässt sich nie umgehen. Nach dem Schreiben wird das Metafeld FRISCH gelesen und verglichen.
 *
 * ENV: LIVE=1 · QUELLEN (Pfad, Vorgabe data/luxe-videos-quellen.json) · LEER=1 · TROTZDEM=1 ·
 *      SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (+ SHOPIFY_SHOP) ODER SHOPIFY_ADMIN_TOKEN (nur bei LIVE=1)
 *
 * Lauf: /opt/node22/bin/node automation/videos_zeile.mjs            (Trockenlauf)
 *       LIVE=1 /opt/node22/bin/node automation/videos_zeile.mjs      (schreibt)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { sammle, darfSchreiben, metafieldsSetEingabe, NAMESPACE, KEY } from './lib/videos_zeile.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const QUELLEN = process.env.QUELLEN || resolve(HIER, '..', 'data', 'luxe-videos-quellen.json');
const LIVE = process.env.LIVE === '1';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2025-01';

export const SHOP_ID_ABFRAGE = `query { shop { id } }`;
export const SETZEN = `mutation($m:[MetafieldsSetInput!]!){
  metafieldsSet(metafields:$m){ metafields{ namespace key type value } userErrors{ field message code } } }`;
export const LESEN = `query { shop { metafield(namespace:"${NAMESPACE}", key:"${KEY}"){ type value } } }`;

let quellen;
try { quellen = JSON.parse(readFileSync(QUELLEN, 'utf8')); }
catch (e) { console.log(`ABBRUCH: Quellendatei ${QUELLEN} nicht lesbar: ${e.message}`); process.exit(1); }

const { liste, bericht } = await sammle(quellen, { pauseMs: 400 });

console.log(`Quellen gelesen: ${bericht.quellen} · abgelehnt (fremde/ungültige Adresse): ${bericht.abgelehnt.length} · ausgefallen: ${bericht.ausgefallen} · Nachfassungen: ${bericht.nachgefasst}`);
for (const a of bericht.abgelehnt) console.log(`  abgelehnt:    ${a.quelle}  (${a.grund})`);
for (const u of bericht.uebersprungen) console.log(`  übersprungen: ${u.quelle}  (${u.grund})`);
console.log(`Liste: ${liste.length} Einträge (neueste zuerst)`);
liste.forEach((e, i) => console.log(`  ${String(i + 1).padStart(2)}. [${e.plattform}] ${e.titel}  ${e.url}${e.vorschau ? '' : '  (ohne Vorschau)'}`));

const entscheid = darfSchreiben(liste, {
  quellen: bericht.quellen, ausgefallen: bericht.ausgefallen,
  trotzdem: process.env.TROTZDEM === '1' || (process.env.LEER === '1' && liste.length === 0),
});
console.log(`Schreiben: ${entscheid.ja ? 'ja' : 'NEIN'} — ${entscheid.grund}`);

if (!LIVE) {
  console.log('\nTROCKENLAUF — nichts geschrieben. Mit LIVE=1 würde in das Shop-Metafeld luxe.videos geschrieben:');
  console.log(JSON.stringify(metafieldsSetEingabe('gid://shopify/Shop/<ID>', liste), null, 1).slice(0, 1500));
  process.exit(0);
}
if (!entscheid.ja) { console.log('LIVE=1 gesetzt, aber das Schreiben ist verweigert (siehe oben). Nichts geändert.'); process.exit(2); }

// ── Schreiben (nur LIVE=1) ──
const { shopifyClientSecret } = await import('./lib/shopify_secret.mjs');
const { shopifyGql } = await import('./lib/shopify_gql.mjs');
async function holeToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID;
  const sec = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!id || !sec) { console.log('ABBRUCH: SHOPIFY_CLIENT_ID oder _SECRET fehlt.'); return null; }
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }) });
  const txt = await r.text();
  let j = {}; try { j = JSON.parse(txt); } catch {}
  if (!j.access_token) { console.log(`ABBRUCH: Token HTTP ${r.status} · ${txt.slice(0, 200)}`); return null; }
  return j.access_token;
}
const TOKEN = await holeToken();
if (!TOKEN) process.exit(1);
const q = (a, b) => shopifyGql(SHOP, API, TOKEN, a, b);

const shopId = (await q(SHOP_ID_ABFRAGE)).shop.id;
const antwort = (await q(SETZEN, { m: metafieldsSetEingabe(shopId, liste) })).metafieldsSet;
if (antwort.userErrors?.length) { console.log('FEHLER beim Schreiben:', JSON.stringify(antwort.userErrors)); process.exit(1); }

// Frisch nachlesen: schreiben, dann LESEN — nur so sieht man, was wirklich im Shop steht.
const gelesen = (await q(LESEN)).shop.metafield;
let gleich = false;
try { gleich = gelesen?.type === 'json' && JSON.stringify(JSON.parse(gelesen.value)) === JSON.stringify(liste); } catch {}
console.log(gleich ? `GESCHRIEBEN und frisch nachgelesen: ${liste.length} Einträge in ${NAMESPACE}.${KEY} (Typ json).`
                   : 'WARNUNG: geschrieben, aber die frische Lesung weicht ab — Metafeld prüfen.');
process.exit(gleich ? 0 : 1);
