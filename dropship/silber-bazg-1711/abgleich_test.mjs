// Abgleichtest: die Regel (automation/lib/silber_feingehalt.mjs) gegen die Einzelurteile (urteile.json), die Ausnahmeliste, die Liste und die Sicherung. Kein Netz.
// urteile.json: je Kandidat zwei unabhängige Durchgänge (a, b) am echten Text von Titel, Beschreibung und Optionen vom 17.11.2026 (Workflow wf_b7d1ead4-208).
//   urteil = 'silber-feingehalt' (beide) | 'kein-feingehalt' (beide) | 'unklar' (alles andere, wird wie ein Treffer behandelt: vorsichtshalber Entwurf).
//   regel  = ob die Regel an diesem Text angeschlagen hat.
// Prüft: die Regel verpasst kein Produkt, das die Urteile als Feingehaltsangabe oder unklar führen; jeder Fehltreffer steht in ausnahmen.json; Liste und Sicherung sind vollständig.
// Lauf: node dropship/silber-bazg-1711/abgleich_test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { istSilberFeingehalt } from '../../automation/lib/silber_feingehalt.mjs';
import { hat925, MARKER } from './lib.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const lies = (n) => JSON.parse(readFileSync(join(HIER, n), 'utf8'));
let ok = 0, schlecht = 0;
const pruefe = (name, bed, info = '') => { if (bed) ok++; else { schlecht++; console.error('FEHLER:', name, info); } };

const urteile = lies('urteile.json').urteile;
const ausn = new Set(lies('ausnahmen.json').handles);
const liste = lies('liste.json');
const sicherung = lies('sicherung.json');
const handles = Object.keys(urteile);

pruefe('Urteile vorhanden (mindestens 200)', handles.length >= 200, String(handles.length));
for (const h of handles) {
  const u = urteile[h];
  pruefe(`Urteil ${h}: Felder`, ['silber-feingehalt', 'kein-feingehalt', 'unklar'].includes(u.urteil) && typeof u.regel === 'boolean', JSON.stringify(u));
  // Gesamturteil folgt aus den zwei Durchgängen
  if (u.a && u.b) {
    const soll = u.a === 'kein-feingehalt' && u.b === 'kein-feingehalt' ? 'kein-feingehalt' : u.a === 'silber-feingehalt' && u.b === 'silber-feingehalt' ? 'silber-feingehalt' : 'unklar';
    pruefe(`Urteil ${h}: Gesamturteil aus a und b`, u.urteil === soll, `${u.a}/${u.b} → ${u.urteil}`);
  } else pruefe(`Urteil ${h}: fehlender Durchgang ist vermerkt`, !!u.vermerk, JSON.stringify(u));
}

// 1. Die Regel verpasst nichts: wo die Einzelurteile eine Angabe oder «unklar» führen, hat die Regel angeschlagen.
for (const h of handles) {
  const u = urteile[h];
  if (u.urteil !== 'kein-feingehalt') pruefe(`Regel erfasst ${h}`, u.regel === true, `${u.urteil}, Regel ${u.regel}`);
}
// 2. Jeder Fehltreffer der Regel (Regel an, Urteil «kein») steht in der Ausnahmeliste, und die Ausnahmeliste enthält nur solche.
const fehltreffer = handles.filter((h) => urteile[h].regel && urteile[h].urteil === 'kein-feingehalt').sort();
pruefe('Ausnahmeliste = Fehltreffer der Regel', JSON.stringify([...ausn].sort()) === JSON.stringify(fehltreffer), JSON.stringify([[...ausn].sort(), fehltreffer]));
for (const h of ausn) pruefe(`Ausnahme ${h} hat zwei Urteile «kein-feingehalt»`, urteile[h]?.a === 'kein-feingehalt' && urteile[h]?.b === 'kein-feingehalt');
// 3. Die Liste (aktive Produkte vom 17.11.) = alle Treffer ausser den Ausnahmen; keine Ausnahme darin.
const inListe = new Set(liste.eintraege.map((e) => e.handle));
pruefe('Liste: keine Ausnahme enthalten', [...ausn].every((h) => !inListe.has(h)));
pruefe('Liste: Zahl stimmt mit Kopf überein', liste.anzahl === liste.eintraege.length);
pruefe('Liste: keine doppelten Handles', inListe.size === liste.eintraege.length);
for (const h of handles) {
  const u = urteile[h];
  if (u.regel && u.urteil !== 'kein-feingehalt') pruefe(`Liste enthält ${h}`, inListe.has(h));
  if (!u.regel) pruefe(`Liste enthält ${h} nicht (Regel schlägt nicht an)`, !inListe.has(h));
}
// 4. Die Sicherung deckt alle Listeneinträge ab (Voraussetzung für die Rücknahme), jeder Eintrag ist vollständig.
const sichIds = new Set(sicherung.map((e) => e.id));
pruefe('Sicherung: keine doppelten IDs', sichIds.size === sicherung.length);
for (const e of liste.eintraege) pruefe(`Sicherung enthält ${e.handle}`, sichIds.has(e.id));
for (const e of sicherung) {
  pruefe(`Sicherung ${e.handle}: Status, Tags und Kanäle vorhanden`, e.status === 'ACTIVE' && Array.isArray(e.tags) && Array.isArray(e.pubs) && e.pubs.length > 0 && !e.tags.includes(MARKER), `${e.status} ${e.tags?.length} ${e.pubs?.length}`);
}
// 5. Die erste Fassung (925 im Titel, 207 Produkte) bleibt von der erweiterten Regel erfasst.
const mit925 = sicherung.filter((e) => hat925(e.title));
pruefe('Sicherung: die 207 Titel der ersten Fassung sind enthalten', mit925.length >= 207, String(mit925.length));
for (const e of mit925) pruefe(`Regel erfasst Titel «${e.title}»`, istSilberFeingehalt({ title: e.title }));

console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
