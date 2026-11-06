/**
 * Schreibt die Test-Karten (schlanke Karten aus echten Printful-Katalogdaten) nach test/testdaten/<id>.karte.json.
 * Aufruf: node karten_erzeugen.mjs <Ordner mit katalog/<id>.json>   (die Katalogdateien liegen nicht im Repo, die erzeugten Karten schon: rund 22 KB)
 * Mit --pruefen werden die vorhandenen Dateien nur mit einem frischen Bau verglichen (Exit 1 bei Abweichung).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { karteFuerEditor } from '../werkzeug/karte_fuer_editor.mjs';

export const MODELLE = Object.freeze({ 1592: 'Oversized Boxy Tee (Vorlage mit festem Farbfoto, 9 Farben)', 71: 'T-Shirt', 19: 'Tasse', 268: 'Poster', 206: 'Dad-Cap', 388: 'Allover-Hoodie', 586: 'T-Shirt Heavyweight (zweites Modell des T-Shirt-Produkts)', 456: 'T-Shirt Bio (drittes Modell des T-Shirt-Produkts)' });
const hier = dirname(fileURLToPath(import.meta.url));

if (import.meta.url === `file://${process.argv[1]}`) {
  const [katalogOrdner, flag] = process.argv.slice(2);
  if (!katalogOrdner) { console.error('Aufruf: node karten_erzeugen.mjs <Katalogordner> [--pruefen]'); process.exit(2); }
  let abweichungen = 0;
  for (const id of Object.keys(MODELLE)) {
    const datei = [join(katalogOrdner, `${id}.json`), join(hier, 'testdaten', 'katalog', `${id}.json`)].find((d) => existsSync(d));   // Modell 1592 liegt als Testdatei im Repo
    if (!datei) { console.error('fehlt:', join(katalogOrdner, `${id}.json`)); process.exit(2); }
    const neu = JSON.stringify(karteFuerEditor(JSON.parse(readFileSync(datei, 'utf8')), { panelErlauben: true }), null, 1) + '\n';
    const ziel = join(hier, 'testdaten', `${id}.karte.json`);
    if (flag === '--pruefen') { if (!existsSync(ziel) || readFileSync(ziel, 'utf8') !== neu) { console.log('ABWEICHUNG', id); abweichungen++; } else console.log('gleich', id); }
    else { writeFileSync(ziel, neu); console.log('geschrieben', ziel, neu.length, 'Zeichen'); }
  }
  process.exit(abweichungen ? 1 : 0);
}
