// Spielt den CSS-Block `lx-editor-vorlage-0911` ins MAIN-Theme (layout/theme.liquid): Sicherung vorher, Rücklesen nachher, Seitenprüfung, Rückweg.
//
//   node dropship/editor-vorlage-0911/apply.mjs             Trockenlauf (Vorgabe): liest live, zeigt den Unterschied, schreibt nichts
//   LIVE=1 node dropship/editor-vorlage-0911/apply.mjs      Sicherung, themeFilesUpsert, Rücklesen, Prüfung der Storefront; bei Fehler Rückweg
//   ZURUECK=1 LIVE=1 node …/apply.mjs                       schreibt die Sicherung zurück (nur wenn das Theme genau dem eingespielten Stand gleicht)
//
// Zugang: SHOPIFY_SHOP (Vorgabe au3j0y-hq.myshopify.com) und ein Admin-Token in /tmp/cj_shop_token.txt (oder TOKEN_DATEI).
// Exit: 0 ok · 3 schon eingespielt · 4 unerwarteter Stand · 5 userErrors · 6 Rücklesen weicht ab · 7 Seitenprüfung fehlgeschlagen (Rückweg gelaufen) · 8 Rückweg selbst fehlgeschlagen
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { THEME_DATEI, MARKE, anwenden, zuruecknehmen } from './patch.mjs';

const hier = path.dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const tok = fs.readFileSync(process.env.TOKEN_DATEI || '/tmp/cj_shop_token.txt', 'utf8').trim();
const SICHERUNG = path.join(hier, 'sicherung', 'layout__theme.liquid.vor');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

const gql = async (q, v) => {
  const r = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }),
  })).json();
  if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 400));
  return r.data;
};
const main = (await gql(`{themes(first:5,roles:[MAIN]){nodes{id name role}}}`)).themes.nodes[0];
if (!main) { console.error('Kein MAIN-Theme'); process.exit(4); }
console.log('MAIN', main.id, main.name);
const lesen = async () => {
  const n = (await gql(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:1){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: main.id, f: [THEME_DATEI] })).theme.files.nodes[0];
  return n && n.body && typeof n.body.content === 'string' ? n.body.content : null;
};
const schreiben = async (content) => {
  const r = (await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename code message}}}`,
    { id: main.id, files: [{ filename: THEME_DATEI, body: { type: 'TEXT', value: content } }] })).themeFilesUpsert;
  if (r.userErrors?.length) { console.error('userErrors', JSON.stringify(r.userErrors)); process.exit(5); }
};
// Rücklesen: Shopify liefert direkt nach dem Schreiben manchmal noch den alten Stand (CLAUDE.md-Lehre): bis zu 150 s abfragen.
const zurueckLesenBis = async (soll) => {
  for (let i = 0; i < 10; i++) {
    await warte(15000);
    const j = await lesen();
    if (j === soll) return true;
    console.log('  Rücklesen noch nicht gleich (Versuch', i + 1, ')');
  }
  return false;
};
const seite = async (url) => {
  const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now(), { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' } });
  return { status: r.status, text: await r.text() };
};
// Storefront prüfen: Produktseite HTTP 200, ohne Liquid-Fehlertext, Block vorhanden; Startseite ohne den Block.
const storefrontPruefen = async (erwarteBlock) => {
  const produkt = 'https://luxestyle.ch/products/tasse-zum-selbstgestalten';
  let letzter = '';
  for (let i = 0; i < 8; i++) {
    const p = await seite(produkt), h = await seite('https://luxestyle.ch/');
    const liquidFehler = /Liquid (syntax )?error/i.test(p.text) || /Liquid (syntax )?error/i.test(h.text);
    const hatP = p.text.includes(`id="${MARKE}"`), hatH = h.text.includes(`id="${MARKE}"`);
    letzter = `Produkt ${p.status} Block ${hatP} | Start ${h.status} Block ${hatH} | Liquid-Fehler ${liquidFehler}`;
    console.log('  Storefront:', letzter);
    if (p.status !== 200 || h.status !== 200 || liquidFehler) return false;
    if (!erwarteBlock ? (!hatP && !hatH) : (hatP && !hatH)) return true;
    await warte(20000);   // Rand-Cache
  }
  return false;
};

const jetzt = await lesen();
if (jetzt == null) { console.error('theme.liquid nicht lesbar'); process.exit(4); }
console.log(THEME_DATEI, jetzt.length, 'Zeichen, md5', md5(jetzt));

if (ZURUECK) {
  if (!fs.existsSync(SICHERUNG)) { console.error('Keine Sicherung vorhanden:', SICHERUNG); process.exit(4); }
  const vor = fs.readFileSync(SICHERUNG, 'utf8');
  if (jetzt !== anwenden(vor)) { console.error('theme.liquid entspricht nicht mehr genau dem eingespielten Stand (jemand hat es seither geändert): nichts zurückgeschrieben'); process.exit(4); }
  console.log('Rücknahme auf den Stand vor dem Block:', vor.length, 'Zeichen');
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  await schreiben(vor);
  if (!(await zurueckLesenBis(vor))) { console.error('Rücklesen nach der Rücknahme weicht ab'); process.exit(6); }
  console.log('Zurückgenommen und zurückgelesen: GLEICH');
  process.exit((await storefrontPruefen(false)) ? 0 : 7);
}

let neu;
try { neu = anwenden(jetzt); } catch (e) { console.error(String(e.message)); process.exit(String(e.message).startsWith('schon') ? 3 : 4); }
console.log('Neuer Stand:', neu.length, 'Zeichen (+' + (neu.length - jetzt.length) + ')');
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }

fs.mkdirSync(path.dirname(SICHERUNG), { recursive: true });
fs.writeFileSync(SICHERUNG, jetzt);
console.log('Sicherung geschrieben:', SICHERUNG, md5(jetzt));
const nochmal = await lesen();
if (nochmal !== jetzt) { console.error('theme.liquid hat sich seit dem ersten Lesen geändert: nichts geschrieben'); process.exit(4); }
await schreiben(neu);
if (!(await zurueckLesenBis(neu))) {
  console.error('Rücklesen weicht ab: Rückweg');
  await schreiben(jetzt);
  process.exit((await zurueckLesenBis(jetzt)) ? 6 : 8);
}
console.log('Rücklesen GLEICH');
if (!(await storefrontPruefen(true))) {
  console.error('Seitenprüfung fehlgeschlagen: Rückweg');
  await schreiben(jetzt);
  const ok = await zurueckLesenBis(jetzt);
  console.error(ok ? 'Rückweg gelaufen, Stand wie vorher' : 'RÜCKWEG FEHLGESCHLAGEN: theme.liquid von Hand prüfen, Sicherung liegt in ' + SICHERUNG);
  process.exit(ok ? 7 : 8);
}
console.log('Fertig: Block eingespielt, zurückgelesen, Storefront geprüft');
