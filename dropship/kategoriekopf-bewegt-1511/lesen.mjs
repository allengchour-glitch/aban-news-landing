import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { mainTheme, themeLesen } from './shop.mjs';
const HIER = path.dirname(new URL(import.meta.url).pathname);
const namen = process.argv.slice(2);
const t = await mainTheme();
console.log('MAIN', t.id, t.name);
const d = await themeLesen(t.id, namen);
for (const n of namen) {
  const x = d[n];
  if (!x) { console.log('FEHLT', n); continue; }
  const ziel = path.join(HIER, 'live', n); fs.mkdirSync(path.dirname(ziel), { recursive: true });
  fs.writeFileSync(ziel, x.content ?? '');
  const eig = crypto.createHash('md5').update(x.content ?? '').digest('hex');
  console.log(n, x.size, x.md5, eig === x.md5 ? 'md5=eigene' : 'md5≠eigene ' + eig);
}
