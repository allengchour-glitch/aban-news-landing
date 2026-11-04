// Spielt die Kopfzeilen-Verschlankung (04.11.2026) ins MAIN-Theme: snippets/header-drawer.liquid. Trockenlauf ist Vorgabe.
//   Einspielen:  LIVE=1 node dropship/seo-kopf-0411/apply.mjs
//   Rücknahme:   ZURUECK=1 LIVE=1 node dropship/seo-kopf-0411/apply.mjs   (nur wenn das Snippet noch exakt dem eingespielten Stand entspricht)
// Ablauf Einspielen: Ausgangsstand (md5) prüfen -> schreiben -> Rücklesen -> Seiten abrufen (Liquid-Fehler? genau ein Drawer? Grösse?)
// -> bei JEDEM Fehler schreibt das Skript die Sicherung selbst zurück (Exit 7).
// Exit: 0 ok · 3 Stand unerwartet · 4 Datei fehlt/abweichender Ausgangsstand · 5 userErrors · 6 Rücklesen weicht ab · 7 Seitenprüfung fehlgeschlagen, zurückgeschrieben · 8 Wirkung nach 3 Minuten nicht sichtbar
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { DATEI, MD5_VOR, anwenden } from './patches.mjs';

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
const lesen = async () => { const n = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:5){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f: [DATEI] })).theme.files.nodes; return n[0]?.body?.content ?? null; };
const schreiben = async (text) => (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: [{ filename: DATEI, body: { type: 'TEXT', value: text } }] })).themeFilesUpsert;

// Seitenprüfung wie ein Besucher (normale Chrome-Kennung, sequentiell, mit Pausen)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SEITEN = ['/', '/collections/uhren', '/collections/damen-schuhe', '/collections/spielzeug', '/collections/viral-hits', '/products/rizinusol-wickel-wiederverwendbar-bauch-nacken', '/fr', '/cart', '/pages/versand-lieferung'];
async function seite(pfad) {
  for (let v = 0; v < 3; v++) {
    const res = await fetch('https://luxestyle.ch' + pfad, { headers: { 'User-Agent': UA, 'Accept-Language': 'de-CH,de;q=0.9', 'Accept-Encoding': 'identity' } });
    if (res.status === 429) { await warte(65000); continue; }
    const t = await res.text();
    const m = t.match(/<header-drawer[\s\S]*?<\/header-drawer>/g) || [];
    return { pfad, status: res.status, bytes: Buffer.byteLength(t), liquidFehler: /liquid error/i.test(t), drawer: m.length, drawerBytes: m[0] ? Buffer.byteLength(m[0]) : 0, ersteZwei: Buffer.byteLength(t.slice(0, 2097152)) };
  }
  return { pfad, status: 429, bytes: 0, liquidFehler: false, drawer: 0, drawerBytes: 0 };
}
async function pruefeSeiten(erwarte) { // erwarte: 'neu' | 'alt'
  const aus = []; let ok = true;
  for (const p of SEITEN) {
    const s = await seite(p); aus.push(s);
    const gut = s.status === 200 && !s.liquidFehler && s.drawer === 1 && (erwarte === 'neu' ? s.drawerBytes > 200000 && s.drawerBytes < 520000 : s.drawerBytes > 600000);
    ok = ok && gut;
    console.log((gut ? '  ok  ' : '  FEHLER ') + p.padEnd(62) + `HTTP ${s.status} · ${s.bytes} Byte · Drawer ${s.drawer}× ${s.drawerBytes} Byte${s.liquidFehler ? ' · LIQUID-FEHLER' : ''}`);
    await warte(3000);
  }
  return { ok, aus };
}
async function warteBisWirksam(erwarte, maxMs = 180000) { // Schnellprobe an der Startseite, bis der neue/alte Stand ausgeliefert wird
  const ende = Date.now() + maxMs;
  while (Date.now() < ende) {
    const s = await seite('/');
    if (s.liquidFehler) return 'fehler';
    if (erwarte === 'neu' ? (s.drawerBytes > 200000 && s.drawerBytes < 520000) : s.drawerBytes > 600000) return 'ja';
    await warte(15000);
  }
  return 'nein';
}

const jetzt = await lesen();
if (jetzt == null) { console.error(DATEI, 'fehlt'); process.exit(4); }
console.log(DATEI, jetzt.length, 'Zeichen · md5', md5(jetzt));
const sicherung = readFileSync(HIER + 'sicherung/snippets__header-drawer.liquid.vor', 'utf8');
if (md5(sicherung) !== MD5_VOR) { console.error('Sicherungsdatei im Repo hat den falschen md5'); process.exit(4); }
const neu = anwenden(sicherung);

if (ZURUECK) {
  if (jetzt !== neu) { console.error('Das Snippet entspricht nicht exakt dem eingespielten Stand: nichts zurückgenommen'); process.exit(3); }
  console.log('Rücknahme auf den Stand vor der Verschlankung');
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  const up = await schreiben(sicherung); console.log('upsert', JSON.stringify(up)); if (up.userErrors?.length) process.exit(5);
  await warte(60000);
  const nach = await lesen(); console.log('rücklesen', nach === sicherung ? 'GLEICH' : 'ABWEICHUNG'); if (nach !== sicherung) process.exit(6);
  console.log('Wirksam:', await warteBisWirksam('alt'));
  process.exit((await pruefeSeiten('alt')).ok ? 0 : 7);
}

if (jetzt === neu) { console.log('Schon eingespielt, nichts zu tun'); process.exit(0); }
if (md5(jetzt) !== MD5_VOR) { console.error('Das Live-Snippet weicht vom erwarteten Ausgangsstand ab (jemand hat es geändert): nichts geschrieben'); process.exit(4); }
console.log('neue Grösse', neu.length, 'Zeichen (+', neu.length - jetzt.length, ')');
console.log('Vorher-Stand der Seiten:'); const vorher = await pruefeSeiten('alt');
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
if (!vorher.ok) { console.error('Schon VOR dem Eingriff fehlerhafte Seiten: nichts geschrieben'); process.exit(3); }

const up = await schreiben(neu); console.log('upsert', JSON.stringify(up)); if (up.userErrors?.length) { console.error('userErrors, nichts weiter'); process.exit(5); }
await warte(45000);
const nach = await lesen(); console.log('rücklesen', nach === neu ? 'GLEICH' : 'ABWEICHUNG');
async function zurueck(grund) {
  console.error('ZURÜCKSCHREIBEN wegen:', grund);
  const u = await schreiben(sicherung); console.error('upsert Sicherung', JSON.stringify(u));
  await warte(60000); const n2 = await lesen(); console.error('rücklesen Sicherung', n2 === sicherung ? 'GLEICH' : 'ABWEICHUNG');
  console.error('Wirksam (alt):', await warteBisWirksam('alt')); process.exit(7);
}
if (nach !== neu) await zurueck('Rücklesen weicht ab');
const w = await warteBisWirksam('neu');
console.log('neuer Stand ausgeliefert:', w);
if (w === 'fehler') await zurueck('Liquid-Fehler auf der Startseite');
if (w === 'nein') { console.error('Nach 3 Minuten liefert die Startseite noch den alten Drawer: nicht zurückgeschrieben (Datei ist geschrieben); später prüfen'); process.exit(8); }
console.log('Nachher-Stand der Seiten:'); const nachher = await pruefeSeiten('neu');
if (!nachher.ok) await zurueck('Seitenprüfung nach dem Einspielen fehlgeschlagen');
console.log('\nGrössen (Byte, vorher -> nachher; ersteZwei = Teil der Seite, den Googlebot liest):');
for (let i = 0; i < SEITEN.length; i++) console.log(' ', SEITEN[i].padEnd(62), vorher.aus[i].bytes, '->', nachher.aus[i].bytes, nachher.aus[i].bytes <= 2097152 ? '(unter 2 MiB)' : '(ÜBER 2 MiB)');
process.exit(0);
