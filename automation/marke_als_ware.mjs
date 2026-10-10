/* marke_als_ware.mjs — Fremdmarke als WARE im Titel (10.10.2026), Gegenstück zu marke_als_ware.py.
 * Regel: automation/data/marke_als_ware_regel.json. Die CJ-Importer überspringen Treffer VOR dem Anlegen
 * («Harrods Keramik-Tasse», «Xbox 360 Wireless Controller», «iPhone 12» = Smartwatch) — Kompatibilität
 * («Hülle für iPhone», «für PS4/PS5/Xbox») bleibt erlaubt.
 *   node automation/marke_als_ware.mjs --test      Kanarien
 *   node automation/marke_als_ware.mjs --stapel    stdin JSON-Liste Titel → stdout JSON-Liste Marke|""
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const REGEL = JSON.parse(readFileSync(join(HIER, 'data', 'marke_als_ware_regel.json'), 'utf8'));
const RX_MARKE = new RegExp(`(?<![\\wäöüßÄÖÜ])(?:${REGEL.marken})(?![\\wäöüßÄÖÜ])`, 'giu');
const RX_KOMPAT = new RegExp(REGEL.kompat, 'iu');
const RX_KOMPAT_VOR = new RegExp(REGEL.kompat_vor, 'iu');
const RX_KOMPAT_NACH = new RegExp(REGEL.kompat_nach, 'isu');

export function markeAlsWare(titel) {
  const t = String(titel || '');
  let ende = null;                               // Ende der letzten ERLAUBTEN Marke (Kette «für Samsung Galaxy Watch»)
  for (const m of t.matchAll(RX_MARKE)) {
    const vor = t.slice(0, m.index), nach = t.slice(m.index + m[0].length);
    if ((ende !== null && !t.slice(ende, m.index).trim()) ||
        RX_KOMPAT.test(vor) || RX_KOMPAT_VOR.test(vor) || RX_KOMPAT_NACH.test(nach)) {
      ende = m.index + m[0].length;
      continue;
    }
    return m[0];
  }
  return '';
}

export function kanarienGruen() {
  const f = [...REGEL.kanarien.treffer.filter(t => !markeAlsWare(t)),
             ...REGEL.kanarien.frei.filter(t => markeAlsWare(t))];
  return { ok: f.length === 0, fehler: f, n: REGEL.kanarien.treffer.length + REGEL.kanarien.frei.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--test')) {
    const k = kanarienGruen();
    console.log(`Kanarien ${k.n - k.fehler.length}/${k.n}`);
    for (const f of k.fehler) console.log('   ✗', f);
    process.exit(k.ok ? 0 : 1);
  }
  if (process.argv.includes('--stapel')) {
    const titel = JSON.parse(readFileSync(0, 'utf8'));
    process.stdout.write(JSON.stringify(titel.map(markeAlsWare)));
  }
}
