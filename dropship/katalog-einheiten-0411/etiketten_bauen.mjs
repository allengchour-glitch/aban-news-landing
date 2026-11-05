// Erzeugt daten/etiketten.json aus den Katalog-Datenschalen (assets/luxe-clothing-details-sNNN.json) und der Schuhtabelle.
//   node dropship/katalog-einheiten-0411/etiketten_bauen.mjs <ordner-mit-den-schalen> [<zweiter-ordner>]
// Die Schalen liegen im Theme, nicht im Repo (Ordner mit allen 51 Dateien angeben; s004 und s023 liefert die Theme-API als URL-Body).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { bauen } from './etiketten.mjs';
const HIER = new URL('.', import.meta.url).pathname;
const ordner = process.argv.slice(2);
if (!ordner.length) { console.error('Ordner mit den Katalog-Schalen angeben'); process.exit(2); }
const katalog = [];
const gesehen = new Set();
for (const o of ordner) for (const f of readdirSync(o).filter((n) => /^luxe-clothing-details-s\d+\.json$/.test(n)).sort()) {
  if (gesehen.has(f)) continue; gesehen.add(f);
  const d = JSON.parse(readFileSync(o + '/' + f, 'utf8'));
  katalog.push(...Object.values(d.products));
}
console.log('Schalen', gesehen.size, 'Produkte', katalog.length, 'Varianten', katalog.reduce((a, p) => a + p.variants.length, 0));
if (gesehen.size !== 51 || katalog.length !== 572) { console.error('Erwartet 51 Schalen und 572 Produkte (Stand 04.11.2026): Datenbasis prüfen'); process.exit(3); }
const tabellen = JSON.parse(readFileSync(HIER + 'daten/schuh_eu_tabellen.json', 'utf8')).tabellen;
const { produkte, protokoll, titel } = bauen(katalog, tabellen);
const n = Object.values(produkte).reduce((a, v) => a + v.length, 0);
writeFileSync(HIER + 'daten/etiketten.json', JSON.stringify({ schemaVersion: 1, erzeugt: '2026-11-04', hinweis: 'Etiketten für variants[].displaySizeCh und Titel (titleDe) mit ml/g; erzeugt von etiketten_bauen.mjs', produkte, titel }, null, 1) + '\n');
console.log('Produkte mit Etiketten', Object.keys(produkte).length, 'Varianten', n, 'Titel', Object.keys(titel).length);
for (const p of protokoll) console.log('PROTOKOLL', JSON.stringify(p));
