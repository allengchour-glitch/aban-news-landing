// Audit 07./08.11.2026: (1) noindex für nicht übersetzte /fr/-Seiten,
// (2) FAQ-Satz in templates/collection.json ohne eingesetzten Sammlungstitel.
// Trockenlauf Vorgabe; LIVE=1 schreibt (themeFilesUpsert) und liest zurück; ZURUECK=1 LIVE=1 stellt die Sicherungen (.vor) wieder her.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const HIER = dirname(fileURLToPath(import.meta.url));
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const TOKEN_DATEI = process.env.TOKEN_DATEI || '/tmp/cj_shop_token.txt';
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const MARKE = 'lx-audit-0711';
const MARKE_V2 = 'lx-audit-0711-v2';

export const LEGACY_NOINDEX_BLOCK = `  {%- comment -%} ${MARKE}: 07.11.2026 GEMESSEN: 0 von 120 zufälligen Produkten haben eine französische Übersetzung, /fr/ zeigt deutschen Text. Nicht übersetzte Seiten bleiben aus dem Index (Nutzer sehen sie weiter). Startseite und Seiten unberührt. Rücknahme: diesen Block löschen. {%- endcomment -%}
  {%- if request.locale.primary == false -%}
    {%- if template.name == 'product' or template.name == 'collection' or template.name == 'article' or template.name == 'blog' -%}
      <meta name="robots" content="noindex, follow">
    {%- endif -%}
  {%- endif -%}
`;
export const NOINDEX_TEMPLATES = Object.freeze(['product', 'collection', 'article', 'blog', 'index', 'page', 'list-collections']);
const NOINDEX_TEMPLATE_CONDITION = NOINDEX_TEMPLATES.map(name => `template.name == '${name}'`).join(' or ');
export const NOINDEX_BLOCK = `  {%- comment -%} ${MARKE_V2}: 08.11.2026 GEGENPROBE: /fr/, /fr/pages/* und die bereits gesperrten Katalog-/Blogpfade sind erst nach vollständig belegter französischer Abdeckung indexierbar. Das boolesche Shop-Metafeld luxe.fr_index_ready darf erst nach dieser Prüfung true sein. Rücknahme: diesen Block löschen. {%- endcomment -%}
  {%- assign lx_locale_prefix = request.locale.iso_code | slice: 0, 2 -%}
  {%- assign lx_fr_index_ready = shop.metafields.luxe.fr_index_ready.value | default: false -%}
  {%- if request.locale.primary == false and lx_locale_prefix == 'fr' and lx_fr_index_ready != true -%}
    {%- if ${NOINDEX_TEMPLATE_CONDITION} -%}
      <meta name="robots" content="noindex, follow">
    {%- endif -%}
  {%- endif -%}
`;
export const FAQ_ALT = 'Alles rund um {{ collection.title }} bei LuxeStyle – kuratierte Auswahl, faire Preise, Lieferdatum beim Artikel und in der Kasse.';
export const FAQ_NEU = 'Kuratierte Auswahl, faire Preise, Lieferdatum beim Artikel und in der Kasse – bei LuxeStyle.';

export function aendereLayout(src) {
  if (src.includes(NOINDEX_BLOCK)) {
    if (src.split(NOINDEX_BLOCK).length !== 2) throw new Error('neuer noindex-Block mehrfach vorhanden');
    return { text: src, geaendert: false };
  }
  if (src.includes(MARKE_V2)) throw new Error('neuer noindex-Block weicht vom geprüften Zieltext ab');
  if (src.includes(LEGACY_NOINDEX_BLOCK)) {
    if (src.split(LEGACY_NOINDEX_BLOCK).length !== 2) throw new Error('alter noindex-Block mehrfach vorhanden');
    return { text: src.replace(LEGACY_NOINDEX_BLOCK, NOINDEX_BLOCK), geaendert: true };
  }
  if (src.includes(MARKE)) throw new Error('alter noindex-Block weicht vom geprüften Ausgangstext ab');
  const n = (src.match(/<\/head>/g) || []).length;
  if (n !== 1) throw new Error(`</head> kommt ${n}x vor, erwartet 1`);
  return { text: src.replace('</head>', NOINDEX_BLOCK + '</head>'), geaendert: true };
}

export function sollNoindex({ primary, isoCode, templateName, frIndexReady = false }) {
  return primary === false
    && String(isoCode || '').slice(0, 2).toLowerCase() === 'fr'
    && frIndexReady !== true
    && NOINDEX_TEMPLATES.includes(templateName);
}
export function aendereCollection(src) {
  if (!src.includes(FAQ_ALT)) {
    if (src.includes(FAQ_NEU)) return { text: src, geaendert: false };
    throw new Error('FAQ-Satz nicht gefunden');
  }
  if (src.split(FAQ_ALT).length !== 2) throw new Error('FAQ-Satz mehrfach vorhanden');
  return { text: src.replace(FAQ_ALT, FAQ_NEU), geaendert: true };
}

async function gql(q, v) {
  const tok = readFileSync(TOKEN_DATEI, 'utf8').trim();
  const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: v || {} }) });
  const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data;
}
async function lies(themeId, namen) {
  const d = await gql('query($id:ID!,$n:[String!]!){theme(id:$id){files(filenames:$n){nodes{filename checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}', { id: themeId, n: namen });
  return Object.fromEntries(d.theme.files.nodes.map(n => [n.filename, n.body.content]));
}
const DATEIEN = [['layout/theme.liquid', 'layout__theme.liquid.vor', aendereLayout], ['templates/collection.json', 'templates__collection.json.vor', aendereCollection]];

if (import.meta.url === `file://${process.argv[1]}`) {
  const themen = (await gql('{themes(first:30){nodes{id role name}}}')).themes.nodes.filter(t => t.role === 'MAIN');
  if (themen.length !== 1) throw new Error('MAIN-Theme nicht eindeutig');
  const tid = themen[0].id; console.log('MAIN', themen[0].name, tid, ZURUECK ? '[ZURUECK]' : '', LIVE ? '[LIVE]' : '[Trockenlauf]');
  const jetzt = await lies(tid, DATEIEN.map(d => d[0]));
  const schreiben = [];
  for (const [fn, vor, fkt] of DATEIEN) {
    if (ZURUECK) { schreiben.push({ filename: fn, body: { type: 'TEXT', value: readFileSync(join(HIER, 'sicherung', vor), 'utf8') } }); continue; }
    const { text, geaendert } = fkt(jetzt[fn]);
    console.log(fn, geaendert ? `+${text.length - jetzt[fn].length} Zeichen` : 'schon angewandt');
    if (geaendert) schreiben.push({ filename: fn, body: { type: 'TEXT', value: text } });
  }
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben,', schreiben.length, 'Dateien würden geschrieben'); process.exit(0); }
  if (schreiben.length) {
    const r = await gql('mutation($id:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$f){upsertedThemeFiles{filename} userErrors{filename message code}}}', { id: tid, f: schreiben });
    const e = r.themeFilesUpsert.userErrors; if (e.length) { console.error('FEHLER', JSON.stringify(e)); process.exit(2); }
    console.log('geschrieben:', r.themeFilesUpsert.upsertedThemeFiles.map(x => x.filename).join(', '));
  }
  await new Promise(r => setTimeout(r, 8000));
  const nach = await lies(tid, DATEIEN.map(d => d[0]));
  let ok = true;
  for (const s of schreiben) { const gleich = nach[s.filename] === s.body.value; console.log('Rücklesen', s.filename, gleich ? 'GLEICH' : 'ABWEICHUNG'); ok = ok && gleich; }
  process.exit(ok ? 0 : 3);
}
