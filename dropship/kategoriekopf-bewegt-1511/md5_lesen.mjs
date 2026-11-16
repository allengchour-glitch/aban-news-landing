// Liest checksumMd5 der eigenen und der fremden Dateien plus AGENTS.md (Theme) im MAIN-Theme.
import { mainTheme, themeLesen } from './shop.mjs';
const t = await mainTheme();
const N = ['snippets/lx-kopf-bewegt.liquid','templates/collection.lxbewegt.json','templates/collection.json','snippets/lx-kopf-kompakt.liquid','snippets/lx-kopf-pfad.liquid','snippets/lx-kopf-chips.liquid','sections/main-collection.liquid','layout/theme.liquid','AGENTS.md'];
const d = await themeLesen(t.id, N);
console.log(new Date().toISOString(), t.id, t.name);
for (const f of N) console.log(f.padEnd(40), d[f] ? d[f].md5 + ' ' + d[f].size : 'FEHLT');
