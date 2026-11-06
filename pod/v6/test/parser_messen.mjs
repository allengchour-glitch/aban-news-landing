/**
 * Misst, wie ein Parser der Bestellstrecke die Warenkorb-Eigenschaften der Editor-Fassungen 6.2.0 (Schlüssel «🖼️ Druckdatei (…)») und 6.2.1 (Schlüssel «_Druckdatei (…)») liest.
 * Gedacht für die Vorbedingung des Live-Plans (README): der Parser MUSS beide Schreibweisen lesen, bevor 6.2.1 an einem Produkt eingebunden wird.
 *
 * Aufruf:  node parser_messen.mjs [Pfad zu printful_bestellweg.mjs]    (Vorgabe: automation/lib/printful_bestellweg.mjs im Repo)
 *          Ausgabe: je Fall Zahl und Art der gelesenen Dateien und die Befunde; Exit 0, wenn alle drei Fälle vollständig und ohne Befund gelesen werden, sonst 1.
 */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { repo } from './lib.mjs';

const pfad = process.argv[2] || join(repo, 'automation', 'lib', 'printful_bestellweg.mjs');
const { dateienAusEigenschaften } = await import(pathToFileURL(pfad).href);
const url = (n) => `https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/${n}.png`;
const karte = (pl, dt) => JSON.stringify({ v: 6, m: 71, pv: 4012, sv: '1001', pl, ...(dt ? { dt } : {}), ap: 12.2 });
const drei = ['front_large', 'back', 'sleeve_left'];
const fall = (schluessel, ids, dt) => Object.fromEntries([...ids.flatMap((i) => [[`\u{1F3A8} Design (${i})`, 'Text: "x"'], [schluessel(i), url(i)]]), ['_pod_karte', karte(ids, dt)]]);
const faelle = {
  '6.2.0, drei Platzierungen': { props: fall((i) => `\u{1F5BC}\uFE0F Druckdatei (${i})`, drei), soll: drei },
  '6.2.1, drei Platzierungen': { props: fall((i) => `_Druckdatei (${i})`, drei), soll: drei },
  '6.2.1, Vorderseite und Rückseite': { props: fall((i) => `_Druckdatei (${i})`, ['front', 'back'], { front: 'default' }), soll: ['front', 'back'] },
};
let schlecht = 0;
for (const [name, { props, soll }] of Object.entries(faelle)) {
  const r = dateienAusEigenschaften(props);
  const platz = r.dateien.map((d) => d.platzierung);
  const ok = r.dateien.length === soll.length && r.probleme.length === 0 && JSON.stringify(platz) === JSON.stringify(soll) && r.dateien.every((d) => d.quelle === 'v6');
  if (!ok) schlecht++;
  console.log(`${ok ? 'ok ' : 'FALSCH'}  ${name}: ${r.dateien.length} Dateien [${r.dateien.map((d) => `${d.quelle}:${d.platzierung ?? d.seite}`).join(', ')}]; Befunde: ${r.probleme.map((p) => (p.hart ? 'HART ' : 'weich ') + p.art).join(', ') || 'keine'}`);
}
console.log(schlecht ? `\n${schlecht} von ${Object.keys(faelle).length} Fällen falsch gelesen: dieser Parser darf nicht vor 6.2.1 live sein.` : '\nDer Parser liest beide Schreibweisen vollständig und ohne Befund.');
process.exit(schlecht ? 1 : 0);
