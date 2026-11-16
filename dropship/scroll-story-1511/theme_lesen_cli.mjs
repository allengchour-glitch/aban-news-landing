import { mainTheme, themeLesen } from './shop.mjs';
const m = await mainTheme();
const r = await themeLesen(m.id, process.argv.slice(2));
for (const [k, v] of Object.entries(r)) { console.log('##', m.id, k, v.md5, v.size); if (process.env.ZEIGEN) console.log(v.content); }
