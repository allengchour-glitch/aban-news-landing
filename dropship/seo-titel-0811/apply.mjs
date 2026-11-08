// Spielt die zwei Liquid-Blöcke in snippets/meta-tags.liquid des MAIN-Themes ein.
//   node apply.mjs                (Trockenlauf: liest live, prüft Anker, zeigt Änderung, schreibt nichts)
//   LIVE=1 node apply.mjs         (sichert die Live-Datei in sicherung/, schreibt, liest zurück)
//   ERSETZEN=1 LIVE=1 node apply.mjs  (neue Fassung der Blöcke über den eingespielten Stand legen, Basis = Sicherung)
//   ZURUECK=1 LIVE=1 node apply.mjs   (schreibt die Sicherung zurück, nur wenn die Live-Datei dem eingespielten Stand gleicht)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const hier = path.dirname(fileURLToPath(import.meta.url));
const shop = process.env.SHOPIFY_SHOP, tok = fs.readFileSync(process.env.TOKEN_DATEI || '/tmp/cj_shop_token.txt', 'utf8').trim();
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const gql = async (q, v) => { const r = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 300)); return r.data; };
const DATEI = 'snippets/meta-tags.liquid';
const main = (await gql(`{themes(first:30){nodes{id role name}}}`)).themes.nodes.find(t => t.role === 'MAIN');
const lesen = async () => (await gql(`query($id:ID!,$n:[String!]!){theme(id:$id){files(filenames:$n,first:1){nodes{body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: main.id, n: [DATEI] })).theme.files.nodes[0].body.content;
const schreiben = async (inhalt) => { const r = (await gql(`mutation($id:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$f){upsertedThemeFiles{filename} userErrors{field message code}}}`, { id: main.id, f: [{ filename: DATEI, body: { type: 'TEXT', value: inhalt } }] })).themeFilesUpsert; if (r.userErrors?.length) throw new Error(JSON.stringify(r.userErrors)); };
const T = fs.readFileSync(path.join(hier, 'titel_block.liquid'), 'utf8').trimEnd() + '\n';
const B = fs.readFileSync(path.join(hier, 'beschreibung_block.liquid'), 'utf8').trimEnd() + '\n';
export function patch(s) {
  const eins = (a) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('Anker nicht genau einmal (' + n + '): ' + a.slice(0, 60)); };
  if (s.includes('lx_title')) throw new Error('schon eingespielt (lx_title gefunden)');
  const a1 = "  elsif request.page_type == 'password'\n    assign og_url = request.origin\n  endif\n%}\n"; eins(a1);
  s = s.replace(a1, a1 + T);
  const a2 = '<title>\n  {{ page_title }}\n'; eins(a2); s = s.replace(a2, '<title>\n  {{ lx_title }}\n');
  const a3 = '<meta\n    name="description"\n    content="{% if request.page_type == \'index\' %}{{ meta_desc }}{% else %}{{ meta_desc | replace: \'&amp;\', \'&\' | replace: \'&quot;\', \'"\' | replace: \'&#39;\', "\'" | replace: \'&lt;\', \'<\' | replace: \'&gt;\', \'>\' | escape }}{% endif %}"\n  >\n';
  eins(a3);
  s = s.replace(a3, B + '<meta\n    name="description"\n    content="{% if request.page_type == \'index\' %}{{ meta_desc }}{% else %}{{ lx_md | escape }}{% endif %}"\n  >\n');
  return s;
}
const live = await lesen();
if (ZURUECK) {
  const vor = fs.readFileSync(path.join(hier, 'sicherung', 'meta-tags.liquid.vor'), 'utf8');
  if (patch(vor) !== live) throw new Error('Live-Datei weicht vom eingespielten Stand ab: nicht zurückgeschrieben');
  console.log('Rücknahme', LIVE ? '(LIVE)' : '(Trockenlauf)'); if (LIVE) { await schreiben(vor); console.log('zurückgeschrieben, Rücklesen gleich:', (await lesen()) === vor); }
  process.exit(0);
}
const ERSETZEN = process.env.ERSETZEN === '1'; // eigenen, schon eingespielten Stand durch die neue Fassung der Blöcke ersetzen
if (ERSETZEN && !live.includes('lx_title')) throw new Error('ERSETZEN=1, aber die Live-Datei trägt den Patch nicht');
const basis = ERSETZEN ? fs.readFileSync(path.join(hier, 'sicherung', 'meta-tags.liquid.vor'), 'utf8') : live;
const neu = patch(basis);
console.log('Live', live.length, 'Zeichen → neu', neu.length, '(+' + (neu.length - live.length) + ')');
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
if (!ERSETZEN) fs.writeFileSync(path.join(hier, 'sicherung', 'meta-tags.liquid.vor'), live);
await schreiben(neu);
console.log('geschrieben; sofort zurückgelesen gleich:', (await lesen()) === neu);
