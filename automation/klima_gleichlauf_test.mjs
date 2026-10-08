// klima_gleichlauf_test.mjs — klimaSaeubern (Importer, JS) gegen dieselben Kanarienvögel wie klimaaussagen_wache.py (08.10.2026).
// Mit Argument <tsv>: gibt für jede Ledger-Zeile (Spalte 5 = alter Text als JSON) das JS-Ergebnis als JSON-Zeile aus,
// damit der Python-Gegenlauf es vergleichen kann (scratchpad-Probe im Bericht KLIMAAUSSAGEN-2026-10-08.md).
import fs from 'node:fs';
import { klimaSaeubern } from './cj_copy_prompt.mjs';
const R = JSON.parse(fs.readFileSync(new URL('./data/klima_regel.json', import.meta.url), 'utf8'));
const klar = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
if (process.argv[2]) {
  for (const z of fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean)) {
    const alt = JSON.parse(z.split('\t')[4]);
    console.log(JSON.stringify(klimaSaeubern(alt)));
  }
  process.exit(0);
}
let ok = 0;
for (const [text, sollAnspruch, sollText] of R.kanarien) {
  const neu = klimaSaeubern(`<p>${text}</p>`);
  const geaendert = neu !== `<p>${text}</p>`;
  const gut = geaendert === sollAnspruch && (sollText === null || klar(neu) === sollText);
  ok += gut;
  if (!gut) console.log(`  ✗ ${JSON.stringify(text)} → ${JSON.stringify(klar(neu))} (soll ${JSON.stringify(sollText)})`);
}
console.log(`KLIMA-KANARIEN (JS) ${ok}/${R.kanarien.length}`);
process.exit(ok === R.kanarien.length ? 0 : 1);
