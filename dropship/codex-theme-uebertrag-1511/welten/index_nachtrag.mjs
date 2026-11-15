// Nachtrag: Shopify hat die 5 neuen Einstellungen in templates/index.json beim gemeinsamen Schreiben verworfen
// (Schema der Sektion galt noch nicht). Jetzt kennt die Sektion die Felder: index.json allein nachschreiben.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const W = new URL('.', import.meta.url).pathname;
const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const LIVE = process.env.LIVE === '1';
const shop = process.env.SHOPIFY_SHOP;
const tok = (await (await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json()).access_token;
const gql = async (query, variables) => { const r = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; };
const lies = async () => { const d = await gql(`{themes(first:2,roles:[MAIN]){nodes{id files(filenames:["templates/index.json","sections/luxe-edit-home.liquid"]){nodes{filename checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}}`); const t = d.themes.nodes[0]; return { id: t.id, f: Object.fromEntries(t.files.nodes.map(n => [n.filename, n])) }; };
const th = await lies();
const ERWARTET = process.env.ERWARTET_MD5;
const jetzt = th.f['templates/index.json'];
if (jetzt.checksumMd5 !== ERWARTET) throw new Error('index.json inzwischen geändert: ' + jetzt.checksumMd5);
const sek = th.f['sections/luxe-edit-home.liquid'].body.content;
if (md5(sek) !== md5(readFileSync(W + 'sicherung/' + (process.env.STUFE || 'welten') + '.sections__luxe-edit-home.liquid.nach', 'utf8'))) throw new Error('Sektion nicht auf dem neuen Stand');
const soll = readFileSync(W + 'sicherung/' + (process.env.STUFE || 'welten') + '.templates__index.json.nach', 'utf8');
if (!LIVE) { console.log('[TROCKEN] würde index.json schreiben (' + jetzt.body.content.length + ' -> ' + soll.length + ')'); process.exit(0); }
const d = await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message code filename}}}`, { id: th.id, files: [{ filename: 'templates/index.json', body: { type: 'TEXT', value: soll } }] });
if (d.themeFilesUpsert.userErrors.length) throw new Error(JSON.stringify(d.themeFilesUpsert.userErrors));
const nach = (await lies()).f['templates/index.json'].body.content;
console.log('RÜCKLESEN templates/index.json', nach === soll ? 'GLEICH' : 'ABWEICHUNG');
for (const k of ['women', 'men', 'shoes', 'home', 'gifts', 'design', 'bags', 'watches', 'kitchen', 'electronics', 'gaming', 'dogs']) console.log(k, nach.includes(`"worlds_${k}_image"`));
