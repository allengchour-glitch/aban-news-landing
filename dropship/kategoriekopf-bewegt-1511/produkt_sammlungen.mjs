import fs from 'node:fs'; import { gql } from './shop.mjs';
const P = { S01: 'led-tulpen-planet-nachtlicht-fur-tisch-618400', S03: 'dreifachklinken-tennisarmband-mit-zirkon-613400', S05: 'weihnachtskugeln-beflockt-9-stuck-625300', S06: 'reisebeutel-aus-rindsleder-44x20x28-cm-01ba7c', S08: 'gusseisen-teekanne-sandguss-unbeschichtet-609800', S10: 'kristallspitzen-set-8-teilig-holzbox' };
const menu = JSON.parse(fs.readFileSync(new URL('./live/main-menu.json', import.meta.url)));
const mh = new Set(); const walk = (it, tiefe) => { for (const x of it || []) { const m = (x.url || '').match(/\/collections\/([^/?#]+)/); if (m) mh.add(decodeURIComponent(m[1])); walk(x.items, tiefe + 1); } }; walk(menu.items, 0);
const top = menu.items.map((x) => (x.url.match(/\/collections\/([^/?#]+)/) || [])[1]).filter(Boolean).map(decodeURIComponent);
const out = {};
for (const [id, h] of Object.entries(P)) {
  const d = await gql(`query($h:String!){productByHandle(handle:$h){title status productType tags collections(first:100){nodes{handle title}}}}`, { h });
  const p = d.productByHandle; const hs = p.collections.nodes.map((c) => c.handle);
  out[id] = { handle: h, title: p.title, status: p.status, type: p.productType, collections: hs };
  console.log(id, p.title, p.status, '| Typ', p.productType);
  console.log('   Top-Level im Menü:', hs.filter((x) => top.includes(x)).join(', ') || '–');
  console.log('   im Menü:', hs.filter((x) => mh.has(x)).join(', '));
}
fs.writeFileSync(new URL('./live/produkt_sammlungen.json', import.meta.url), JSON.stringify({ top, out }, null, 1));
