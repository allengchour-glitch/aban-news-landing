// essbar_gleichlauf_test.mjs — Kanarien aus data/essbar_regel.json gegen die Importer-Fassung (essbar.mjs);
// essbar_wache.py --selbsttest prüft dieselben gegen die Python-Fassung (09.10.2026).
import fs from 'fs';
import { essbar } from './essbar.mjs';
const R = JSON.parse(fs.readFileSync(new URL('./data/essbar_regel.json', import.meta.url), 'utf8'));
let f = 0;
for (const [t, en, kat, sku, soll] of R.kanarien) {
  const ist = !!essbar(t, en, kat, sku);
  if (ist !== soll) { f++; console.log(`  ✗ ${t} → ${ist} (soll ${soll})`); }
}
console.log(`Gleichlauf JS: ${R.kanarien.length - f}/${R.kanarien.length} ok`);
process.exit(f ? 1 : 0);
