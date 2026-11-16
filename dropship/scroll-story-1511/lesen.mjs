import fs from 'node:fs';
import { gql, mainTheme, themeLesen } from './shop.mjs';
const t = await mainTheme();
console.log(t);
const namen = process.argv.slice(2);
const f = await themeLesen(t.id, namen);
for (const [n, v] of Object.entries(f)) {
  console.log(n, v.md5, v.size);
  if (v.content != null) fs.writeFileSync('theme_alt/' + n.replace(/\//g, '__'), v.content);
}
