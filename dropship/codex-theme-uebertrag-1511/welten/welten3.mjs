// Einkaufswelten Stufe 3 (15.11.2026, Urteil der Stufe-2-Prüfung): Beauty und Sport bekommen Motive im selben Stil
// (statt der festen Szenen vom 01.11.), Hundewelt ein Motiv mit Hund im Pullover (Bestseller sind Pullover, nicht Betten),
// Titel brechen nicht mehr mitten im Wort (Schrift je Breite, Silbentrennung).
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
  { key: 'beauty', datei: 'luxestyle-einkaufswelt-beauty-20261115.png', job: '31bb31af-8c2a-49c0-90fa-2c5143b39154', zeit: '231531', alt: 'Illustratives Kategoriemotiv Beauty und Pflege in Cream und Taupe', label_de: 'Kategoriemotiv Beauty und Pflege', label_en: 'Beauty and care category image' },
  { key: 'sport', datei: 'luxestyle-einkaufswelt-sport-20261115.png', job: '6b5b8b64-d08c-40c4-8555-53cb41ab0e18', zeit: '231530', alt: 'Illustratives Kategoriemotiv Sport und Outdoor in Cream und Taupe', label_de: 'Kategoriemotiv Sport und Outdoor', label_en: 'Sport and outdoor category image' },
];
// Hundewelt: nur die Datei im Bildwähler wechseln (das Feld gibt es seit Stufe 2).
export const HUND = { datei: 'luxestyle-einkaufswelt-hundewelt-pullover-20261115.png', job: '243d028f-1bc8-4c7b-8a97-141bf96b1323', zeit: '231532', alt: 'Illustratives Kategoriemotiv Hundewelt mit Hund im Strickpullover', alt_datei: 'luxestyle-einkaufswelt-hundewelt-20261115.png' };
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
  const anker = `{% elsif lx_standard_home and lx_parts[1] == 'dogs' and section.settings.worlds_dogs_image != blank %}\n                  {% assign lx_world_image = section.settings.worlds_dogs_image %}`;
  if (s.split(anker).length !== 2) throw new Error('Sektion: Anker Hunde-Zweig nicht genau einmal');
  const zweige = MOTIVE.map(m => `\n                {% elsif lx_standard_home and lx_parts[1] == '${m.key}' and section.settings.worlds_${m.key}_image != blank %}\n                  {% assign lx_world_image = section.settings.worlds_${m.key}_image %}{% assign lx_eigenes_motiv = true %}`).join('');
  let t = s.replace(anker, anker + zweige);
  const start = '{% assign lx_world_image = lx_collection.image %}';
  if (t.split(start).length !== 2) throw new Error('Sektion: Start-Zuweisung nicht genau einmal');
  t = t.replace(start, start + '{% assign lx_eigenes_motiv = false %}');
  for (const [alt, neu] of [["{% if lx_collection.handle == 'beauty-pflege' %}", "{% if lx_collection.handle == 'beauty-pflege' and lx_eigenes_motiv == false %}"], ["{% elsif lx_collection.handle == 'sport-outdoor' %}", "{% elsif lx_collection.handle == 'sport-outdoor' and lx_eigenes_motiv == false %}"]]) {
    if (t.split(alt).length !== 2) throw new Error('Sektion: feste Szene nicht genau einmal: ' + alt);
    t = t.replace(alt, neu);
  }
  const schemaAnker = `{"type":"image_picker","id":"worlds_dogs_image","label":"t:luxe_world_cards.dogs_image"}`;
  if (t.split(schemaAnker).length !== 2) throw new Error('Sektion: Schema-Anker nicht genau einmal');
  const felder = MOTIVE.map(m => `,\n    {"type":"image_picker","id":"worlds_${m.key}_image","label":"t:luxe_world_cards.${m.key}_image"}`).join('');
  t = t.replace(schemaAnker, schemaAnker + felder);
  for (const m of MOTIVE) if (!t.includes(`'${m.key}' and section.settings.worlds_${m.key}_image`)) throw new Error('Sektion: Zweig fehlt ' + m.key);
  return t;
}
export function aendereSchemaLocale(s, sprache) {
  const anker = sprache === 'de' ? `"dogs_image": "Kategoriemotiv Hundewelt"` : `"dogs_image": "Dog world category image"`;
  if (s.split(anker).length !== 2) throw new Error(`Locale ${sprache}: Anker nicht genau einmal`);
  const zus = MOTIVE.map(m => `,\n    "${m.key}_image": ${JSON.stringify(sprache === 'de' ? m.label_de : m.label_en)}`).join('');
  return s.replace(anker, anker + zus);
}
export function aendereIndex(s) {
  const anker = `"worlds_dogs_image": "shopify://shop_images/${HUND.alt_datei}"`;
  if (s.split(anker).length !== 2) throw new Error('index.json: Anker nicht genau einmal');
  const zus = MOTIVE.map(m => `,\n        "worlds_${m.key}_image": "shopify://shop_images/${m.datei}"`).join('');
  return s.replace(anker, `"worlds_dogs_image": "shopify://shop_images/${HUND.datei}"` + zus);
}
// Ruhige Rückmeldung beim Überfahren: Bild zoomt leicht (nur mit Maus, nicht bei reduzierter Bewegung).
export const CSS_ZUSATZ = `\n/* lx-welten-1511c: Titel nicht mitten im Wort trennen (Schrift je Breite, Silbentrennung) */.lx-home.lx-browse-home .lx-worlds--photo-grid .lx-category-name{overflow-wrap:break-word;word-break:normal;-webkit-hyphens:auto;hyphens:auto}@media(min-width:761px) and (max-width:1099px){.lx-home.lx-browse-home .lx-worlds--photo-grid .lx-category-tile{padding:14px}.lx-home.lx-browse-home .lx-worlds--photo-grid .lx-category-name{font-size:clamp(15px,1.8vw,20px);max-width:calc(100% - 22px)}.lx-home.lx-browse-home .lx-worlds--photo-grid .lx-category-arrow{right:14px;bottom:16px}}@media(max-width:760px){.lx-home.lx-browse-home .lx-worlds--photo-grid .lx-category-name{font-size:clamp(14px,4.3vw,17px)}}.lx-home.lx-browse-home .lx-worlds--photo-grid .lx-category-tile[data-category-handle="hundewelt"] .lx-category-thumb img{object-position:50% 12%}\n`;
export function aendereCss(s) {
  if (s.includes('lx-welten-1511c')) throw new Error('CSS: Zusatz schon vorhanden');
  if (!s.includes('lx-welten-1511b')) throw new Error('CSS: Stufe 2 fehlt');
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
  for (const m of [...MOTIVE, HUND]) {
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
    for (const m of [...MOTIVE, HUND]) { const da = await dateiSuchen(m.datei); st.push(da[0]?.fileStatus || 'FEHLT'); }
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
  const nachDatei = f => join(SICHERUNG, 'welten3.' + f.replace(/\//g, '__') + '.nach');
  const vorDatei = f => join(SICHERUNG, 'welten3.' + f.replace(/\//g, '__') + '.vor');
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
  for (const m of [...MOTIVE, HUND]) { const da = await dateiSuchen(m.datei); if (da[0]?.fileStatus !== 'READY') throw new Error('Bild nicht bereit: ' + m.datei); }
  const plan = [];
  for (const f of namen) {
    const d = th.dateien[f];
    if (!d) throw new Error('Datei fehlt in MAIN: ' + f);
    const erwartet = md5(readFileSync(join(HIER, 'sicherung', 'welten2.' + f.replace(/\//g, '__') + '.nach'), 'utf8'));
    if (d.checksumMd5 !== erwartet) throw new Error(`${f}: MAIN-md5 ${d.checksumMd5} weicht von der Basis ${erwartet} ab (inzwischen geändert?)`);
    const neu = AENDERN[f](d.body.content);
    if (f.endsWith('.json')) jsonc(neu);
    plan.push({ filename: f, alt: d.body.content, inhalt: neu });
    console.log(`${f}: ${d.body.content.length} -> ${neu.length} Zeichen (+${neu.length - d.body.content.length})`);
  }
  if (!LIVE) { console.log('[TROCKEN] nichts geschrieben'); return; }
  for (const p of plan) { writeFileSync(vorDatei(p.filename), p.alt); writeFileSync(nachDatei(p.filename), p.inhalt); }
  const zuerst = plan.filter(p => p.filename !== 'templates/index.json');
  await schreiben(th.id, zuerst.map(p => ({ filename: p.filename, inhalt: p.inhalt })));
  const vorlage = plan.find(p => p.filename === 'templates/index.json');
  // Lehre 15.11.: 1 s nach der Sektion verwarf Shopify die neuen Felder in der Vorlage still. Darum warten und erst
  // schreiben, wenn die Sektion die neuen Felder sicher kennt (frisch gelesen).
  if (vorlage) { await new Promise(r => setTimeout(r, 15000)); await schreiben(th.id, [{ filename: vorlage.filename, inhalt: vorlage.inhalt }]); }
  const nach = await mainTheme(namen);
  for (const p of plan) {
    const ok = nach.dateien[p.filename].body.content === p.inhalt;
    console.log('RÜCKLESEN', p.filename, ok ? 'GLEICH' : 'ABWEICHUNG');
    if (!ok) process.exitCode = 3;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (PHASE === 'dateien') await phaseDateien();
  else if (PHASE === 'theme') await phaseTheme();
  else { console.error('PHASE=dateien oder PHASE=theme'); process.exit(2); }
}
