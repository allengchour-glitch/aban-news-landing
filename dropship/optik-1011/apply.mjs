// Spielt den CSS-Block `lx-optik-1011` ins MAIN-Theme (layout/theme.liquid): Sicherung vorher, Rücklesen nachher, Seitenprüfung, Rückweg.
//
//   node dropship/optik-1011/apply.mjs             Trockenlauf (Vorgabe): liest live, zeigt den Unterschied, schreibt nichts
//   LIVE=1 node dropship/optik-1011/apply.mjs      Sicherung, themeFilesUpsert, Rücklesen, Prüfung der Storefront; bei Fehler Rückweg
//   ZURUECK=1 LIVE=1 node …/apply.mjs              entfernt den Block wieder (nur ihn; spätere Änderungen anderer an der Datei bleiben)
//
// Zugang: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (Client-Credentials-Grant) oder ein Admin-Token in TOKEN_DATEI.
// Der Ablauf selbst steht in ablauf.mjs (mit Attrappen-Test apply_test.mjs). Exit-Codes: siehe dort.
// Laufzeit bis rund 10 Minuten (Rücklesen bis 150 s, Storefront-Prüfung): nur im Hintergrund oder mit Zeitlimit von mindestens 20 Minuten starten. THEME_ID (Vorgabe: das Theme vom 10.11.) schützt davor,
// dass nach einem Wechsel des veröffentlichten Themes versehentlich ein anderes beschrieben wird.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_DATEI, MARKE, anwenden, zuruecknehmen } from './patch.mjs';
import { ablauf } from './ablauf.mjs';

const hier = path.dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const SICHERUNG = path.join(hier, 'sicherung', 'layout__theme.liquid.vor');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
process.stdout.on('error', () => {});   // `| head` o. ä. darf einen Lauf nach dem Schreiben nicht abbrechen
const ERWARTET_THEME = process.env.THEME_ID || 'gid://shopify/OnlineStoreTheme/213013037447';

// Jede Antwort: Status prüfen, JSON lesen, sonst eine lesbare Meldung statt einer rohen Ausnahme; jeder Aufruf mit Zeitlimit.
async function json(r, was) {
  const t = await r.text();
  if (!r.ok) throw new Error(`${was}: HTTP ${r.status} ${t.slice(0, 120).replace(/\s+/g, ' ')}`);
  try { return JSON.parse(t); } catch { throw new Error(`${was}: keine JSON-Antwort: ${t.slice(0, 120).replace(/\s+/g, ' ')}`); }
}
async function holeToken() {
  if (process.env.TOKEN_DATEI) return fs.readFileSync(process.env.TOKEN_DATEI, 'utf8').trim();
  const r = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }),
  });
  const t = (await json(r, 'Token')).access_token;
  if (!t) throw new Error('Token: Antwort ohne access_token (SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET gesetzt?)');
  return t;
}
let tok;
try { tok = await holeToken(); } catch (e) { console.error(String(e.message)); process.exit(4); }
const gql = async (q, v) => {
  for (let i = 0; i < 4; i++) {
    const r = await json(await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, signal: AbortSignal.timeout(30000), body: JSON.stringify({ query: q, variables: v }),
    }), 'GraphQL');
    if (r.errors) {
      if (JSON.stringify(r.errors).includes('THROTTLED') && i < 3) { await warte(3000 * (i + 1)); continue; }
      throw new Error('GraphQL: ' + JSON.stringify(r.errors).slice(0, 300));
    }
    return r.data;
  }
};
let main;
try { main = (await gql(`{themes(first:5,roles:[MAIN]){nodes{id name role}}}`)).themes.nodes[0]; } catch (e) { console.error(String(e.message)); process.exit(4); }
if (!main) { console.error('Kein MAIN-Theme'); process.exit(4); }
console.log('MAIN', main.id, main.name);

const lesen = async () => {
  const n = (await gql(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:1){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: main.id, f: [THEME_DATEI] })).theme.files.nodes[0];
  return n && n.body && typeof n.body.content === 'string' ? n.body.content : null;
};
const schreiben = async (content) => {
  const r = (await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename code message}}}`,
    { id: main.id, files: [{ filename: THEME_DATEI, body: { type: 'TEXT', value: content } }] })).themeFilesUpsert;
  if (r.userErrors?.length) { const e = new Error('userErrors ' + JSON.stringify(r.userErrors)); e.code = 5; throw e; }
};
const seite = async (url) => {
  const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now(), { signal: AbortSignal.timeout(20000), headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml', 'accept-language': 'de-CH,de;q=0.9' } });
  return { status: r.status, text: await r.text() };
};
const sicherungLesen = () => (fs.existsSync(SICHERUNG) ? fs.readFileSync(SICHERUNG, 'utf8') : null);
const sicherungSchreiben = (t) => { fs.mkdirSync(path.dirname(SICHERUNG), { recursive: true }); fs.writeFileSync(SICHERUNG, t); };

const code = await ablauf({ lesen, schreiben, seite, warte, log, anwenden, zuruecknehmen, MARKE, sicherungLesen, sicherungSchreiben }, { live: LIVE, zurueck: ZURUECK, themeId: main.id, erwartetThemeId: ERWARTET_THEME });
process.exit(code);
