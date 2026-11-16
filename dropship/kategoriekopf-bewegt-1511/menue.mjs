import fs from 'node:fs'; import { gql } from './shop.mjs';
const d = await gql(`{menus(first:20){nodes{handle title items{title url resourceId type items{title url resourceId type items{title url type}}}}}}`);
const m = d.menus.nodes.find((x) => x.handle === 'main-menu');
fs.writeFileSync(new URL('./live/main-menu.json', import.meta.url), JSON.stringify(m, null, 1));
for (const a of m.items) {
  console.log('■', a.title, '|', a.url);
  for (const b of a.items || []) console.log('   ·', b.title, '|', b.url, '(' + (b.items || []).length + ')');
}
