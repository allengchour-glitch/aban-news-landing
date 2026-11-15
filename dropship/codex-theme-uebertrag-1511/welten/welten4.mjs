// Einkaufswelten Stufe 4 (15.11.2026, Härtungen aus der Nachmessung von Stufe 3, Urteil «ok»):
//  1. «Geschenkideen» bekommt eine feste Trennstelle (weiches Trennzeichen). Die Silbentrennung per CSS hängt am
//     Wörterbuch des Browsers; ohne sie brach der Titel bei 320 und 344 px als «Geschenkidee / n».
//  2. Hundewelt: Bildausschnitt 50% 5% statt 50% 12%, damit das Kopffell oben nicht am Kartenrand klebt
//     (Ausschnitt 4:3 vorher simuliert: Kopf mit Luft, Leine ganz im Bild).
//  3. sizes der Bildkarten über 1440 px: 410px statt 320px (bei 1920 px ist die Karte 402 px breit, der Browser
//     wählte das 320er-Bild und zog es hoch).
// PHASE=theme (Trockenlauf Vorgabe, LIVE=1 schreibt, ZURUECK=1 LIVE=1 nimmt zurück). Basis = Fassung «nach» von Stufe 3.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const PHASE = process.env.PHASE || '';
const SICHERUNG = join(HIER, 'sicherung');
const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');

function ersetzeGenauEinmal(s, alt, neu, wo) {
  const n = s.split(alt).length - 1;
  if (n !== 1) throw new Error(`${wo}: «${alt.slice(0, 60)}» kommt ${n}-mal vor, erwartet 1`);
  return s.replace(alt, () => neu);
}

export const TITEL_ALT = '<span class="lx-category-name">{{ lx_label_key | t }}</span>';
export const TITEL_NEU = `<span class="lx-category-name">{{ lx_label_key | t | replace: 'Geschenkideen', 'Geschenk&shy;ideen' }}</span>`;
export const SIZES_ALT = "(max-width: 1440px) calc((100vw - 112px) / 4), 320px' %}";
export const SIZES_NEU = "(max-width: 1440px) calc((100vw - 112px) / 4), 410px' %}";
export const HUND_ALT = '.lx-category-tile[data-category-handle="hundewelt"] .lx-category-thumb img{object-position:50% 12%}';
export const HUND_NEU = '.lx-category-tile[data-category-handle="hundewelt"] .lx-category-thumb img{object-position:50% 5%}';

export function aendereSektion(s) {
  if (s.includes('Geschenk&shy;ideen')) throw new Error('Sektion: Stufe 4 schon vorhanden');
  if (!s.includes('lx_eigenes_motiv')) throw new Error('Sektion: Stufe 3 fehlt');
  s = ersetzeGenauEinmal(s, TITEL_ALT, TITEL_NEU, 'Sektion Titel');
  return ersetzeGenauEinmal(s, SIZES_ALT, SIZES_NEU, 'Sektion sizes');
}
export function aendereCss(s) {
  if (!s.includes('lx-welten-1511c')) throw new Error('CSS: Stufe 3 fehlt');
  return ersetzeGenauEinmal(s, HUND_ALT, HUND_NEU, 'CSS Hundewelt');
}
const AENDERN = {
  'sections/luxe-edit-home.liquid': aendereSektion,
  'assets/luxe-edit.css': aendereCss,
};

async function token() {
  const shop = process.env.SHOPIFY_SHOP;
  const r = await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
let TOK;
async function gql(query, variables = {}) {
  TOK ||= await token();
  const r = await fetch(`https://${process.env.SHOPIFY_SHOP}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Access-Token': TOK }, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}
async function mainTheme(namen) {
  const d = await gql(`query($f:[String!]){themes(first:3,roles:[MAIN]){nodes{id name files(filenames:$f,first:20){nodes{filename checksumMd5 updatedAt body{... on OnlineStoreThemeFileBodyText{content}}}}}}}`, { f: namen });
  const t = d.themes.nodes[0];
  return { id: t.id, name: t.name, dateien: Object.fromEntries(t.files.nodes.map(n => [n.filename, n])) };
}
async function schreiben(themeId, files) {
  const d = await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message code filename}}}`, { id: themeId, files: files.map(f => ({ filename: f.filename, body: { type: 'TEXT', value: f.inhalt } })) });
  const e = d.themeFilesUpsert.userErrors;
  if (e.length) throw new Error('themeFilesUpsert: ' + JSON.stringify(e));
}

async function phaseTheme() {
  const namen = Object.keys(AENDERN);
  const th = await mainTheme(namen);
  console.log('MAIN', th.id, th.name);
  mkdirSync(SICHERUNG, { recursive: true });
  const nachDatei = f => join(SICHERUNG, 'welten4.' + f.replace(/\//g, '__') + '.nach');
  const vorDatei = f => join(SICHERUNG, 'welten4.' + f.replace(/\//g, '__') + '.vor');
  if (ZURUECK) {
    const zurueck = [];
    for (const f of namen) {
      if (!existsSync(vorDatei(f)) || !existsSync(nachDatei(f))) throw new Error('Sicherung fehlt ' + f);
      if (md5(th.dateien[f].body.content) !== md5(readFileSync(nachDatei(f), 'utf8'))) { console.log('UNVERÄNDERT LASSEN (inzwischen geändert):', f); continue; }
      zurueck.push({ filename: f, inhalt: readFileSync(vorDatei(f), 'utf8') });
    }
    console.log((LIVE ? '' : '[TROCKEN] ') + 'zurück:', zurueck.map(z => z.filename).join(', ') || 'nichts');
    if (LIVE && zurueck.length) await schreiben(th.id, zurueck);
    return;
  }
  const plan = [];
  for (const f of namen) {
    const d = th.dateien[f];
    if (!d) throw new Error('Datei fehlt in MAIN: ' + f);
    const erwartet = md5(readFileSync(join(SICHERUNG, 'welten3.' + f.replace(/\//g, '__') + '.nach'), 'utf8'));
    if (d.checksumMd5 !== erwartet) throw new Error(`${f}: MAIN-md5 ${d.checksumMd5} weicht von der Basis ${erwartet} ab (inzwischen geändert?)`);
    const neu = AENDERN[f](d.body.content);
    plan.push({ filename: f, alt: d.body.content, inhalt: neu });
    console.log(`${f}: ${d.body.content.length} -> ${neu.length} Zeichen (+${neu.length - d.body.content.length})`);
  }
  if (!LIVE) { console.log('[TROCKEN] nichts geschrieben'); return; }
  for (const p of plan) { writeFileSync(vorDatei(p.filename), p.alt); writeFileSync(nachDatei(p.filename), p.inhalt); }
  await schreiben(th.id, plan.map(p => ({ filename: p.filename, inhalt: p.inhalt })));
  await new Promise(r => setTimeout(r, 3000));
  const nach = await mainTheme(namen);
  for (const p of plan) {
    const ok = nach.dateien[p.filename].body.content === p.inhalt;
    console.log('RÜCKLESEN', p.filename, ok ? 'GLEICH' : 'ABWEICHUNG');
    if (!ok) process.exitCode = 3;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (PHASE === 'theme') await phaseTheme();
  else { console.error('PHASE=theme'); process.exit(2); }
}
