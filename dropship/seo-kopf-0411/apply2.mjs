// Stufe 2 der Seitenverschlankung (04.11.2026): Filter und Produktkarten auf Kategorieseiten verdichten (neues Snippet + Section).
// Trockenlauf ist Vorgabe.
//   Einspielen:  LIVE=1 node dropship/seo-kopf-0411/apply2.mjs
//   Rücknahme:   ZURUECK=1 LIVE=1 node dropship/seo-kopf-0411/apply2.mjs   (nur wenn die Section noch exakt dem eingespielten Stand entspricht)
// Reihenfolge: erst das Snippet schreiben und lesen, dann die Section, die darauf verweist; bei Rücknahme umgekehrt.
// Bei JEDEM Fehler der Seitenprüfung schreibt das Skript die Section selbst zurück (Exit 7).
// Exit: 0 ok · 3 Stand unerwartet · 4 Ausgangsstand/Datei · 5 userErrors · 6 Rücklesen weicht ab · 7 Seitenprüfung fehlgeschlagen, zurückgeschrieben · 8 Wirkung nach 3 Minuten nicht sichtbar
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { DATEI, SNIPPET, SNIPPET_TEXT, MD5_VOR, anwenden } from './patches2.mjs';

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);
const lesen = async (namen) => { const n = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:10){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f: namen })).theme.files.nodes; return Object.fromEntries(n.map((x) => [x.filename, x.body?.content ?? null])); };
const schreiben = async (map) => (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: Object.entries(map).map(([filename, value]) => ({ filename, body: { type: 'TEXT', value } })) })).themeFilesUpsert;
const loeschen = async (namen) => (await q(`mutation($id:ID!,$f:[String!]!){themeFilesDelete(themeId:$id,files:$f){deletedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, f: namen })).themeFilesDelete;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const KATEGORIEN = ['/collections/uhren', '/collections/damen-schuhe', '/collections/spielzeug', '/collections/viral-hits', '/collections/kissen-wohntextilien', '/fr/collections/kleine-geschenke-mitbringsel', '/collections/herren-schuhe'];
const ANDERE = ['/', '/products/rizinusol-wickel-wiederverwendbar-bauch-nacken', '/cart'];
async function seite(pfad) {
  for (let v = 0; v < 3; v++) {
    const res = await fetch('https://luxestyle.ch' + pfad, { headers: { 'User-Agent': UA, 'Accept-Language': 'de-CH,de;q=0.9', 'Accept-Encoding': 'identity' } });
    if (res.status === 429) { await warte(65000); continue; }
    const t = await res.text();
    return { pfad, status: res.status, bytes: Buffer.byteLength(t), liquidFehler: /liquid error/i.test(t), karten: (t.match(/class="product-grid__item product-grid__item--\d+"/g) || []).length, filter: t.includes('id="filters-drawer"'), formulare: (t.match(/<facets-form-component/g) || []).length };
  }
  return { pfad, status: 429, bytes: 0, liquidFehler: false, karten: 0, filter: false, formulare: 0 };
}
async function pruefeSeiten(vorher) { // vorher = Array der Messungen vor dem Eingriff (oder null)
  const aus = []; let ok = true;
  for (const p of [...KATEGORIEN, ...ANDERE]) {
    const s = await seite(p); aus.push(s); const v = vorher?.find((x) => x.pfad === p);
    const kat = KATEGORIEN.includes(p);
    let gut = s.status === 200 && !s.liquidFehler;
    if (kat) gut = gut && s.karten >= 12 && s.filter && s.formulare >= 1 && (!v || s.karten === v.karten) && (!vorher || vorher.erwartetKleiner === undefined ? true : true);
    if (kat && v && vorher.neu) gut = gut && s.bytes < v.bytes - 100000;
    ok = ok && gut;
    console.log((gut ? '  ok  ' : '  FEHLER ') + p.padEnd(58) + `HTTP ${s.status} · ${s.bytes} Byte${kat ? ` · Karten ${s.karten} · Filter ${s.filter ? 'ja' : 'NEIN'}` : ''}${s.liquidFehler ? ' · LIQUID-FEHLER' : ''}`);
    await warte(3000);
  }
  return { ok, aus };
}
async function warteBisWirksam(erwarteNeu, referenz, maxMs = 180000) {
  const ende = Date.now() + maxMs; const p = '/collections/uhren';
  while (Date.now() < ende) {
    const s = await seite(p);
    if (s.liquidFehler) return 'fehler';
    if (erwarteNeu ? s.bytes < referenz - 100000 : s.bytes > referenz - 20000) return 'ja';
    await warte(15000);
  }
  return 'nein';
}

const jetzt = await lesen([DATEI, SNIPPET]);
const sec = jetzt[DATEI]; if (sec == null) { console.error(DATEI, 'fehlt'); process.exit(4); }
console.log(DATEI, sec.length, 'Zeichen · md5', md5(sec), '|', SNIPPET, jetzt[SNIPPET] == null ? 'nicht vorhanden' : 'VORHANDEN');
const sicherung = readFileSync(HIER + 'sicherung/sections__main-collection.liquid.vor', 'utf8');
if (md5(sicherung) !== MD5_VOR) { console.error('Sicherungsdatei im Repo hat den falschen md5'); process.exit(4); }
const neu = anwenden(sicherung);

if (ZURUECK) {
  if (sec !== neu) { console.error('Die Section entspricht nicht exakt dem eingespielten Stand: nichts zurückgenommen'); process.exit(3); }
  console.log('Rücknahme auf den Stand vor Stufe 2');
  const vor = await pruefeSeiten(null); const ref = vor.aus.find((x) => x.pfad === '/collections/uhren').bytes;
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  const up = await schreiben({ [DATEI]: sicherung }); console.log('upsert', JSON.stringify(up)); if (up.userErrors?.length) process.exit(5);
  await warte(45000);
  const nach = await lesen([DATEI]); console.log('rücklesen', nach[DATEI] === sicherung ? 'GLEICH' : 'ABWEICHUNG'); if (nach[DATEI] !== sicherung) process.exit(6);
  console.log('Wirksam (alt):', await warteBisWirksam(false, ref + 150000));
  const del = await loeschen([SNIPPET]); console.log('Snippet löschen', JSON.stringify(del));
  process.exit((await pruefeSeiten(null)).ok ? 0 : 7);
}

if (sec === neu && jetzt[SNIPPET] === SNIPPET_TEXT) { console.log('Schon eingespielt, nichts zu tun'); process.exit(0); }
if (jetzt[SNIPPET] != null) { console.error('Snippet ist schon vorhanden (oder teilweise eingespielt): nichts geschrieben'); process.exit(3); }
if (md5(sec) !== MD5_VOR) { console.error('Die Live-Section weicht vom erwarteten Ausgangsstand ab (jemand hat sie geändert): nichts geschrieben'); process.exit(4); }
console.log('neue Grösse', neu.length, 'Zeichen (+', neu.length - sec.length, ') · Snippet', SNIPPET_TEXT.length, 'Zeichen');
console.log('Vorher-Stand der Seiten:'); const vorher = await pruefeSeiten(null);
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
if (!vorher.ok) { console.error('Schon VOR dem Eingriff fehlerhafte Seiten: nichts geschrieben'); process.exit(3); }
const refUhren = vorher.aus.find((x) => x.pfad === '/collections/uhren').bytes;

const up1 = await schreiben({ [SNIPPET]: SNIPPET_TEXT }); console.log('upsert Snippet', JSON.stringify(up1)); if (up1.userErrors?.length) { console.error('userErrors beim Snippet, nichts weiter geschrieben'); process.exit(5); }
await warte(20000);
const probe = await lesen([SNIPPET]); if (probe[SNIPPET] !== SNIPPET_TEXT) { console.error('Snippet nach 20 s nicht lesbar: Section noch nicht geschrieben, bitte Stand prüfen'); process.exit(6); }
const up2 = await schreiben({ [DATEI]: neu }); console.log('upsert Section', JSON.stringify(up2));
async function zurueck(grund) {
  console.error('ZURÜCKSCHREIBEN wegen:', grund);
  const u = await schreiben({ [DATEI]: sicherung }); console.error('upsert Sicherung', JSON.stringify(u));
  await warte(60000); const n2 = await lesen([DATEI]); console.error('rücklesen Sicherung', n2[DATEI] === sicherung ? 'GLEICH' : 'ABWEICHUNG');
  console.error('Wirksam (alt):', await warteBisWirksam(false, refUhren + 150000));
  const d = await loeschen([SNIPPET]); console.error('Snippet gelöscht', JSON.stringify(d)); process.exit(7);
}
if (up2.userErrors?.length) await zurueck('userErrors beim Schreiben der Section');
await warte(45000);
const nach = await lesen([DATEI]); console.log('rücklesen', nach[DATEI] === neu ? 'GLEICH' : 'ABWEICHUNG');
if (nach[DATEI] !== neu) await zurueck('Rücklesen weicht ab');
const w = await warteBisWirksam(true, refUhren); console.log('neuer Stand ausgeliefert:', w);
if (w === 'fehler') await zurueck('Liquid-Fehler auf der Kategorieseite');
if (w === 'nein') { console.error('Nach 3 Minuten liefert die Kategorieseite noch den alten Stand: nicht zurückgeschrieben (Datei ist geschrieben); später prüfen'); process.exit(8); }
console.log('Nachher-Stand der Seiten:'); const vergleich = vorher.aus.map((x) => ({ ...x })); vergleich.neu = true;
const nachher = await pruefeSeiten(vergleich);
if (!nachher.ok) await zurueck('Seitenprüfung nach dem Einspielen fehlgeschlagen');
console.log('\nGrössen (Byte, vorher -> nachher):');
for (let i = 0; i < vorher.aus.length; i++) console.log(' ', vorher.aus[i].pfad.padEnd(58), vorher.aus[i].bytes, '->', nachher.aus[i].bytes, nachher.aus[i].bytes <= 2097152 ? '(unter 2 MiB)' : '(ÜBER 2 MiB)');
process.exit(0);
