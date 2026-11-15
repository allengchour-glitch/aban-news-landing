// Einkaufswelten der Startseite: 5 Karten mit alter Bannerschrift bekommen saubere Motive (15.11.2026).
// PHASE=dateien  lädt die gewählten Bilder in Shopify Files (Trockenlauf Vorgabe, LIVE=1 schreibt).
// PHASE=theme    erweitert die Sektion um 5 Bildwähler, setzt sie in templates/index.json und
//                ergänzt einen ruhigen Hover-Effekt (Trockenlauf Vorgabe, LIVE=1 schreibt, ZURUECK=1 LIVE=1 nimmt zurück).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const PHASE = process.env.PHASE || '';
const SICHERUNG = join(HIER, 'sicherung');
export const jsonc = s => JSON.parse(s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(z => !/^\s*\/\//.test(z)).join('\n'));
const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');

// Gewählte Motive (von Hand gesichtet 15.11.2026 22:5x UTC: keine Schrift, keine Logos, Ausschnitt 4:3 und 1:1 geprüft).
export const MOTIVE = [
  { key: 'women', datei: 'luxestyle-einkaufswelt-damenmode-20261115.png', job: '6a464a3d-9ca8-4d7b-93b1-de0f3692f317', zeit: '224927', alt: 'Illustratives Kategoriemotiv Damenmode in Cream und Taupe', label_de: 'Kategoriemotiv Damenmode', label_en: 'Women’s fashion category image' },
  { key: 'men', datei: 'luxestyle-einkaufswelt-herrenmode-20261115.png', job: 'e948d766-8633-495d-beda-d2d4f1a55557', zeit: '224926', alt: 'Illustratives Kategoriemotiv Herrenmode in Cream und Taupe', label_de: 'Kategoriemotiv Herrenmode', label_en: 'Men’s fashion category image' },
  { key: 'shoes', datei: 'luxestyle-einkaufswelt-schuhe-20261115.png', job: '2836ade3-745c-48de-a887-2958079603ca', zeit: '224926', alt: 'Illustratives Kategoriemotiv Schuhe in warmen Brauntönen', label_de: 'Kategoriemotiv Schuhe', label_en: 'Shoes category image' },
  { key: 'home', datei: 'luxestyle-einkaufswelt-wohnen-20261115.png', job: '00e88538-3832-4baa-ae87-23b4ab458088', zeit: '224927', alt: 'Illustratives Kategoriemotiv Wohnen und Deko in Cream und Taupe', label_de: 'Kategoriemotiv Wohnen und Deko', label_en: 'Home and decor category image' },
  { key: 'gifts', datei: 'luxestyle-einkaufswelt-geschenke-20261115.png', job: 'bd622d27-3ca1-4e43-949a-c06b616445ef', zeit: '224927', alt: 'Illustratives Kategoriemotiv Geschenkideen in Cream und Taupe', label_de: 'Kategoriemotiv Geschenkideen', label_en: 'Gift ideas category image' },
];
const quelle = m => `https://d8j0ntlcm91z4.cloudfront.net/user_3Ly9t2SDIlj5VDIADsgpzL1SPBh/hf_20261115_${m.zeit}_${m.job}.png`;

// Erwarteter Stand von MAIN (Fassung «nach» der Übernahme 22:35:02 UTC, frisch geprüft 22:43:58 UTC).
const BASIS = {
  'sections/luxe-edit-home.liquid': '__NACH__',
  'locales/de.schema.json': '__NACH__',
  'locales/en.default.schema.json': '__NACH__',
  'templates/index.json': '__NACH__',
  'assets/luxe-edit.css': '__NACH__',
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

async function dateiSuchen(name) {
  const d = await gql(`query($q:String){files(first:5,query:$q){nodes{... on MediaImage{id fileStatus alt image{url width height}}}}}`, { q: `filename:${name.replace(/\.png$/, '')}*` });
  return d.files.nodes.filter(n => n.image?.url && n.image.url.split('?')[0].endsWith('/' + name));
}

// ---------- Theme-Änderungen (rein, ohne Netz) ----------
export function aendereSektion(s) {
  const anker = `{% elsif lx_standard_home and lx_parts[1] == 'jewellery' and section.settings.worlds_jewellery_image != blank %}\n                  {% assign lx_world_image = section.settings.worlds_jewellery_image %}`;
  if (s.split(anker).length !== 2) throw new Error('Sektion: Anker Schmuck-Zweig nicht genau einmal');
  const zweige = MOTIVE.map(m => `\n                {% elsif lx_standard_home and lx_parts[1] == '${m.key}' and section.settings.worlds_${m.key}_image != blank %}\n                  {% assign lx_world_image = section.settings.worlds_${m.key}_image %}`).join('');
  let t = s.replace(anker, anker + zweige);
  const schemaAnker = `{"type":"image_picker","id":"worlds_jewellery_image","label":"t:luxe_world_cards.jewellery_image"}`;
  if (t.split(schemaAnker).length !== 2) throw new Error('Sektion: Schema-Anker nicht genau einmal');
  const felder = MOTIVE.map(m => `,\n    {"type":"image_picker","id":"worlds_${m.key}_image","label":"t:luxe_world_cards.${m.key}_image"}`).join('');
  t = t.replace(schemaAnker, schemaAnker + felder);
  for (const m of MOTIVE) if (!t.includes(`'${m.key}' and section.settings.worlds_${m.key}_image`)) throw new Error('Sektion: Zweig fehlt ' + m.key);
  return t;
}
export function aendereSchemaLocale(s, sprache) {
  const anker = sprache === 'de' ? `"jewellery_image": "Kategoriemotiv Schmuck"` : `"jewellery_image": "Jewellery category image"`;
  if (s.split(anker).length !== 2) throw new Error(`Locale ${sprache}: Anker nicht genau einmal`);
  const zus = MOTIVE.map(m => `,\n    "${m.key}_image": ${JSON.stringify(sprache === 'de' ? m.label_de : m.label_en)}`).join('');
  return s.replace(anker, anker + zus);
}
export function aendereIndex(s) {
  const anker = `"worlds_jewellery_image": "shopify://shop_images/luxestyle-einkaufswelt-schmuck-20261115.png"`;
  if (s.split(anker).length !== 2) throw new Error('index.json: Anker nicht genau einmal');
  const zus = MOTIVE.map(m => `,\n        "worlds_${m.key}_image": "shopify://shop_images/${m.datei}"`).join('');
  return s.replace(anker, anker + zus);
}
// Ruhige Rückmeldung beim Überfahren: Bild zoomt leicht (nur mit Maus, nicht bei reduzierter Bewegung).
export const CSS_ZUSATZ = `\n/* lx-welten-1511: Hover-Rückmeldung der Bildkarten */@media (hover:hover) and (prefers-reduced-motion:no-preference){.lx-home.lx-browse-home .lx-worlds--photo-grid .lx-category-thumb img{transition:transform .6s cubic-bezier(.2,.7,.2,1)}.lx-home.lx-browse-home .lx-worlds--photo-grid .lx-category-tile:hover .lx-category-thumb img,.lx-home.lx-browse-home .lx-worlds--photo-grid .lx-category-tile:focus-visible .lx-category-thumb img{transform:scale(1.045)}}\n`;
export function aendereCss(s) {
  if (s.includes('lx-welten-1511')) throw new Error('CSS: Zusatz schon vorhanden');
  return s + CSS_ZUSATZ;
}
const AENDERN = {
  'sections/luxe-edit-home.liquid': aendereSektion,
  'locales/de.schema.json': s => aendereSchemaLocale(s, 'de'),
  'locales/en.default.schema.json': s => aendereSchemaLocale(s, 'en'),
  'templates/index.json': aendereIndex,
  'assets/luxe-edit.css': aendereCss,
};

// ---------- Netz ----------
async function mainTheme(namen) {
  const d = await gql(`query($f:[String!]){themes(first:3,roles:[MAIN]){nodes{id name files(filenames:$f,first:20){nodes{filename checksumMd5 updatedAt body{... on OnlineStoreThemeFileBodyText{content}}}}}}}`, { f: namen });
  const t = d.themes.nodes[0];
  const dateien = Object.fromEntries(t.files.nodes.map(n => [n.filename, n]));
  return { id: t.id, name: t.name, dateien };
}
async function schreiben(themeId, files) {
  const d = await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message code filename}}}`, { id: themeId, files: files.map(f => ({ filename: f.filename, body: { type: 'TEXT', value: f.inhalt } })) });
  const e = d.themeFilesUpsert.userErrors;
  if (e.length) throw new Error('themeFilesUpsert: ' + JSON.stringify(e));
}

async function phaseDateien() {
  for (const m of MOTIVE) {
    const da = await dateiSuchen(m.datei);
    if (da.length) { console.log('VORHANDEN', m.datei, da[0].id, da[0].fileStatus, da[0].image.width + 'x' + da[0].image.height); continue; }
    if (!LIVE) { console.log('[TROCKEN] würde hochladen', m.datei, '<-', quelle(m)); continue; }
    const d = await gql(`mutation($f:[FileCreateInput!]!){fileCreate(files:$f){files{id fileStatus} userErrors{field message code}}}`, { f: [{ originalSource: quelle(m), filename: m.datei, alt: m.alt, contentType: 'IMAGE' }] });
    if (d.fileCreate.userErrors.length) throw new Error(m.datei + ': ' + JSON.stringify(d.fileCreate.userErrors));
    console.log('ANGELEGT', m.datei, d.fileCreate.files[0].id);
  }
  if (!LIVE) return;
  for (let i = 0; i < 30; i++) {
    const st = [];
    for (const m of MOTIVE) { const da = await dateiSuchen(m.datei); st.push(da[0]?.fileStatus || 'FEHLT'); }
    console.log('Status', st.join(' '));
    if (st.every(s => s === 'READY')) return;
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error('Dateien nicht READY');
}

async function phaseTheme() {
  const namen = Object.keys(AENDERN);
  const th = await mainTheme(namen);
  console.log('MAIN', th.id, th.name);
  mkdirSync(SICHERUNG, { recursive: true });
  const nachDatei = f => join(SICHERUNG, 'welten.' + f.replace(/\//g, '__') + '.nach');
  const vorDatei = f => join(SICHERUNG, 'welten.' + f.replace(/\//g, '__') + '.vor');
  if (ZURUECK) {
    const zurueck = [];
    for (const f of namen) {
      if (!existsSync(vorDatei(f)) || !existsSync(nachDatei(f))) throw new Error('Sicherung fehlt ' + f);
      const jetzt = th.dateien[f].body.content;
      if (md5(jetzt) !== md5(readFileSync(nachDatei(f), 'utf8'))) { console.log('UNVERÄNDERT LASSEN (inzwischen geändert):', f); continue; }
      zurueck.push({ filename: f, inhalt: readFileSync(vorDatei(f), 'utf8') });
    }
    console.log((LIVE ? '' : '[TROCKEN] ') + 'zurück:', zurueck.map(z => z.filename).join(', ') || 'nichts');
    if (LIVE && zurueck.length) await schreiben(th.id, zurueck);
    return;
  }
  // Bilder müssen bereitstehen
  for (const m of MOTIVE) { const da = await dateiSuchen(m.datei); if (da[0]?.fileStatus !== 'READY') throw new Error('Bild nicht bereit: ' + m.datei); }
  const plan = [];
  for (const f of namen) {
    const d = th.dateien[f];
    if (!d) throw new Error('Datei fehlt in MAIN: ' + f);
    const erwartet = BASIS[f] === '__NACH__' ? md5(readFileSync(join(HIER, '..', 'themevergleich', 'sicherung', basisDatei(f)), 'utf8')) : BASIS[f];
    if (d.checksumMd5 !== erwartet) throw new Error(`${f}: MAIN-md5 ${d.checksumMd5} weicht von der Basis ${erwartet} ab (inzwischen geändert?)`);
    const neu = AENDERN[f](d.body.content);
    if (f.endsWith('.json')) jsonc(neu);
    plan.push({ filename: f, alt: d.body.content, inhalt: neu });
    console.log(`${f}: ${d.body.content.length} -> ${neu.length} Zeichen (+${neu.length - d.body.content.length})`);
  }
  if (!LIVE) { console.log('[TROCKEN] nichts geschrieben'); return; }
  for (const p of plan) { writeFileSync(vorDatei(p.filename), p.alt); writeFileSync(nachDatei(p.filename), p.inhalt); }
  await schreiben(th.id, plan.map(p => ({ filename: p.filename, inhalt: p.inhalt })));
  const nach = await mainTheme(namen);
  for (const p of plan) {
    const ok = nach.dateien[p.filename].body.content === p.inhalt;
    console.log('RÜCKLESEN', p.filename, ok ? 'GLEICH' : 'ABWEICHUNG');
    if (!ok) process.exitCode = 3;
  }
}
function basisDatei(f) {
  const dir = join(HIER, '..', 'sicherung');
  const pref = 'uebertrag.' + f.replace(/\//g, '__') + '.nach-';
  const liste = readdirSync(dir);
  const treffer = liste.filter(n => n.startsWith(pref));
  if (treffer.length !== 1) throw new Error('Basisdatei nicht eindeutig: ' + f);
  return treffer[0];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (PHASE === 'dateien') await phaseDateien();
  else if (PHASE === 'theme') await phaseTheme();
  else { console.error('PHASE=dateien oder PHASE=theme'); process.exit(2); }
}
