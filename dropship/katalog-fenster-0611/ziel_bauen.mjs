// Baut den Soll-Stand (zwölf Dateien) aus sicherung/*.vor + den drei Datenquellen und legt ihn unter ziel/ ab; schreibt daten/pruefstand.json (MD5 alt/neu).
//   node dropship/katalog-fenster-0611/ziel_bauen.mjs            # schreibt ziel/ und daten/pruefstand.json
//   node dropship/katalog-fenster-0611/ziel_bauen.mjs --pruefen  # schreibt nichts, vergleicht nur mit ziel/ und daten/pruefstand.json (Exit 1 bei Abweichung)
// Die Prüfsummen in daten/pruefstand.json dürfen nur nach einem erneuten Browsertest geändert werden (README «Prüfstand»).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DATEIEN, NEUE_DATEIEN, MD5_VOR, anwendenKombi, lesenDaten } from './kombi.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const nur = process.argv.includes('--pruefen');
const ALT = Object.values(DATEIEN), NEU = Object.values(NEUE_DATEIEN), ALLE = [...ALT, ...NEU];
const dateiName = (f) => f.replace('/', '__');

const sich = Object.fromEntries(ALT.map((f) => [f, readFileSync(HIER + 'sicherung/' + dateiName(f) + '.vor', 'utf8')]));
for (const f of ALT) if (md5(sich[f]) !== MD5_VOR[f]) { console.error('Sicherung weicht vom Ausgangsstand ab:', f); process.exit(1); }
const soll = anwendenKombi(sich, lesenDaten());
const neu = Object.fromEntries(ALLE.map((f) => [f, md5(soll[f])]));
const alt = Object.fromEntries(ALLE.map((f) => [f, MD5_VOR[f] ?? null]));

if (nur) {
  let abw = 0;
  for (const f of ALLE) {
    const p = HIER + 'ziel/' + dateiName(f);
    const ist = existsSync(p) ? md5(readFileSync(p, 'utf8')) : null;
    if (ist !== neu[f]) { abw++; console.log('ABWEICHUNG ziel/', f, ist, neu[f]); }
  }
  const pf = JSON.parse(readFileSync(HIER + 'daten/pruefstand.json', 'utf8'));
  if (JSON.stringify(pf.md5) !== JSON.stringify(neu)) { abw++; console.log('ABWEICHUNG daten/pruefstand.json (md5 neu)'); }
  if (JSON.stringify(pf.md5Alt) !== JSON.stringify(alt)) { abw++; console.log('ABWEICHUNG daten/pruefstand.json (md5 alt)'); }
  console.log(abw ? `${abw} Abweichungen` : 'ziel/ und daten/pruefstand.json gleich dem berechneten Soll-Stand');
  process.exit(abw ? 1 : 0);
}

mkdirSync(HIER + 'ziel', { recursive: true });
for (const f of ALLE) writeFileSync(HIER + 'ziel/' + dateiName(f), soll[f]);
const bisher = existsSync(HIER + 'daten/pruefstand.json') ? JSON.parse(readFileSync(HIER + 'daten/pruefstand.json', 'utf8')) : {};
writeFileSync(HIER + 'daten/pruefstand.json', JSON.stringify({
  hinweis: 'Soll-Stand der zwölf Theme-Dateien (MD5 von anwendenKombi() auf sicherung/*.vor mit den drei Datenquellen), die Dateien selbst liegen unter ziel/. Gleich der Nachbildung, die im Browser geprüft wurde (Playwright gegen das Live-Dokument, 1440 und 390 px). md5Alt: Ausgangsstand (null = Datei fehlt im Live-Theme). Nur ändern, nachdem BEIDE Browsertests am neuen Stand wiederholt wurden.',
  geprueft: bisher.geprueft ?? 'noch nicht im Browser geprüft',
  md5Alt: alt,
  md5: neu,
}, null, 1) + '\n');
for (const f of ALLE) console.log(f.padEnd(48), alt[f] ?? '(neu)'.padEnd(32), '->', neu[f], Buffer.byteLength(soll[f]), 'Byte');
