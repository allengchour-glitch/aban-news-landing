// Spielt den Karussell-Patch ins MAIN-Theme (Sicherung vorher, Rücklesen nachher). Trockenlauf ist Vorgabe.
// Einspielen: LIVE=1 node dropship/karussell-0411/apply_live.mjs dropship/karussell-0411/sicherung
// Zurücknehmen: ZURUECK=1 LIVE=1 node dropship/karussell-0411/apply_live.mjs dropship/karussell-0411/sicherung (nur wenn MAIN noch den eingespielten Stand trägt, sonst Abbruch)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const OUT = process.argv[2]; if (!OUT) { console.error('Sicherungsordner fehlt'); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);
const F = ['sections/luxe-edit-home.liquid', 'assets/luxe-edit.css'];
const lesen = async () => { const n = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:10){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f: F })).theme.files.nodes; return Object.fromEntries(n.map(x => [x.filename, x.body.content])); };
const md5 = (s) => createHash('md5').update(s).digest('hex');
const jetzt = await lesen();
console.log('jetzt', F.map(f => f + ' ' + md5(jetzt[f]) + ' ' + jetzt[f].length).join(' | '));
const MARKE_JS = 'lxCarousel', MARKE_CSS = 'karussell wie vorher bei produkten';
let neu;
if (ZURUECK) {
  if (!jetzt[F[0]].includes(MARKE_JS) || !jetzt[F[1]].includes(MARKE_CSS)) { console.error('Patch nicht (mehr) drin: nichts zurückzunehmen'); process.exit(3); }
  const vor = Object.fromEntries(F.map(f => [f, readFileSync(`${OUT}/${f.replace(/\//g, '__')}.vor`, 'utf8')]));
  neu = vor;
} else {
  if (jetzt[F[0]].includes(MARKE_JS) || jetzt[F[1]].includes(MARKE_CSS)) { console.error('Patch schon drin'); process.exit(3); }
  for (const f of F) writeFileSync(`${OUT}/${f.replace(/\//g, '__')}.vor`, jetzt[f]);
  const js = readFileSync(new URL('./patch/carousel.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./patch/carousel.css', import.meta.url), 'utf8');
  const anker = '  </script>\n</div>\n\n{% schema %}';
  if (jetzt[F[0]].split(anker).length !== 2) { console.error('Anker im Liquid nicht eindeutig'); process.exit(4); }
  neu = {
    [F[0]]: jetzt[F[0]].replace(anker, '  </script>\n' + js.replace(/\s+$/, '') + '\n</div>\n\n{% schema %}'),
    [F[1]]: jetzt[F[1]].replace(/\s*$/, '\n') + css,
  };
}
for (const f of F) console.log('neu', f, md5(neu[f]), neu[f].length, 'Δ', neu[f].length - jetzt[f].length);
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
const up = (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: [F[1], F[0]].map(f => ({ filename: f, body: { type: 'TEXT', value: neu[f] } })) })).themeFilesUpsert;
console.log('upsert', JSON.stringify(up));
if (up.userErrors?.length) process.exit(5);
await new Promise(r => setTimeout(r, 75000));
const nach = await lesen();
let ok = true;
for (const f of F) { const gleich = nach[f] === neu[f]; ok = ok && gleich; console.log('rücklesen', f, gleich ? 'GLEICH' : 'ABWEICHUNG', md5(nach[f])); }
process.exit(ok ? 0 : 6);
