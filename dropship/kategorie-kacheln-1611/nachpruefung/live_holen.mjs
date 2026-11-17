import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const SHOP = process.env.SHOPIFY_SHOP;
const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json()).access_token;
const gql = async (q, v) => { const r = await fetch(`https://${SHOP}/admin/api/2025-10/graphql.json`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; };
const t = (await gql(`{ themes(first:5, roles:[MAIN]){ nodes{ id name } } }`)).themes.nodes[0];
console.log('MAIN', t.id, t.name);
const names = ['snippets/lx-menu-knoten.liquid','snippets/lx-collection-welten-card.liquid','snippets/lx-kopf-pfad.liquid','sections/lx-collection-details.liquid','sections/lx-collection-welten.liquid','templates/collection.json'];
const d = await gql(`query($id:ID!,$n:[String!]){ theme(id:$id){ files(filenames:$n, first:20){ nodes{ filename body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }`, { id: t.id, n: names });
for (const f of d.theme.files.nodes) { const c = f.body?.content ?? ''; writeFileSync('live/' + f.filename.replace('/', '__'), c); console.log(f.filename, c.length, createHash('md5').update(c).digest('hex')); }
const rest = await gql(`query($id:ID!){ theme(id:$id){ files(filenames:["*lxtest*"], first:20){ nodes{ filename } } } }`, { id: t.id });
console.log('lxtest-Dateien noch da:', rest.theme.files.nodes.map(x => x.filename));
