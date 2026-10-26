// node sa_zeige.mjs <handle> [n] [saat]   -> zufaellige Treffer einer Kategorie (aus dem Bau), mit Geschlechtsquelle
import { baueAlle, gesch } from './schuhe-accessoires_bauen.mjs';
import { stichprobe } from './sa_lib.mjs';
const [h, n = 30, saat = ''] = process.argv.slice(2);
const k = baueAlle().find(x => x.handle === h);
if (!k) { console.log('unbekannt', h); process.exit(1); }
console.log(`# ${h}: ${k._n} Treffer`);
stichprobe(k._mitglieder, +n, h + saat).forEach((p, i) => console.log(String(i + 1).padStart(2), p.title.slice(0, 92), '[' + gesch.get(p.handle).join('/') + ']'));
