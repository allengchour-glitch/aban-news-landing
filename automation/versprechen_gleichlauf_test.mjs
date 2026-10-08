// versprechen_gleichlauf_test.mjs — dieselben Kanarien wie versprechen_wache.py --selbsttest, aber gegen die Importer-Fassung
// (cj_copy_prompt.mjs). Eine Regeldatei, zwei Sprachen: beide müssen dasselbe Ergebnis liefern (08.10.2026).
import fs from 'fs';
import { versprechenTitel, versprechenSeo, versprechenTextLiefer, versprechenTextEigen, versprechenDiamant } from './cj_copy_prompt.mjs';
const R = JSON.parse(fs.readFileSync(new URL('./data/versprechen_regel.json', import.meta.url), 'utf8'));
const fn = { titel: versprechenTitel, seo: versprechenSeo, text: versprechenTextLiefer, eigen: versprechenTextEigen };
let f = 0;
for (const [art, ein, soll] of R.kanarien) {
  const ist = fn[art](ein);
  if (ist !== soll) { f++; console.log(`  ✗ ${art}: ${JSON.stringify(ein)}\n      ist  ${JSON.stringify(ist)}\n      soll ${JSON.stringify(soll)}`); }
}
for (const [ein, produkt, soll] of (R.diamant || {}).kanarien || []) {
  const ist = versprechenDiamant(ein, produkt);
  if (ist !== soll) { f++; console.log(`  ✗ diamant: ${JSON.stringify(ein)}\n      ist  ${JSON.stringify(ist)}\n      soll ${JSON.stringify(soll)}`); }
}
const n = R.kanarien.length + ((R.diamant || {}).kanarien || []).length;
console.log(`Gleichlauf JS: ${n - f}/${n} ok`);
process.exit(f ? 1 : 0);
