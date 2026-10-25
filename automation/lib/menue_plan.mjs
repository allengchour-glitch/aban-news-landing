/**
 * Menü-Umbau als reine Funktionen auf dem Eingabe-Baum von `menuUpdate` (Einträge: { id?, title, type, resourceId?, url?, tags?, items }).
 *
 * WARUM REIN UND GETESTET: `menuUpdate` ERSETZT den ganzen Baum. Ein vergessener oder verschobener Eintrag ist danach weg oder
 * hängt falsch. Darum wird jede Änderung erst lokal angewendet, die Tiefe geprüft (Shopify: höchstens 3 Ebenen) und nach dem
 * Schreiben der zurückgelesene Baum mit dem gesendeten verglichen (`gleicherBaum`).
 *
 * Pfade sind Listen von Titeln: ['Wohnen & Garten', 'Küche & Kochen']. [] = oberste Ebene.
 */
const kopie = x => JSON.parse(JSON.stringify(x));

export function suche(baum, pfad) {
  let liste = baum, eintrag = null;
  for (const t of pfad) {
    const i = liste.findIndex(x => x.title === t);
    if (i < 0) return null;
    eintrag = liste[i]; liste = eintrag.items;
  }
  return eintrag;
}
const listeVon = (baum, pfad) => pfad.length ? suche(baum, pfad)?.items : baum;

export function alleRessourcen(baum) {
  const s = new Set();
  (function lauf(l) { for (const i of l) { if (i.resourceId) s.add(i.resourceId); lauf(i.items || []); } })(baum);
  return s;
}
export function tiefe(baum) {
  const t = l => l.length ? 1 + Math.max(...l.map(i => t(i.items || []))) : 0;
  return t(baum);
}
/** Fügt `neu` unter `eltern` ein, nach dem Geschwister `nach` (sonst ans Ende). Wirft, wenn der Eltern-Eintrag fehlt. */
export function einfuegenPfad(baum, { eltern, nach, neu }) {
  const b = kopie(baum);
  const liste = listeVon(b, eltern);
  if (!liste) throw new Error(`Eltern-Eintrag «${eltern.join(' > ')}» nicht gefunden`);
  const pos = nach ? liste.findIndex(x => x.title === nach) : -1;
  liste.splice(pos >= 0 ? pos + 1 : liste.length, 0, { items: [], ...neu });
  return b;
}
/** Nimmt den Eintrag unter `von` (inkl. Kinder) heraus und setzt ihn unter `nach` (Pfad) ein. `hinter` = Geschwister davor. */
export function verschiebe(baum, { von, nach, hinter, titel }) {
  const b = kopie(baum);
  const elternVon = von.slice(0, -1), t = von.at(-1);
  const quelle = listeVon(b, elternVon);
  if (!quelle) throw new Error(`Quelle «${elternVon.join(' > ')}» nicht gefunden`);
  const i = quelle.findIndex(x => x.title === t);
  if (i < 0) throw new Error(`Eintrag «${von.join(' > ')}» nicht gefunden`);
  const [eintrag] = quelle.splice(i, 1);
  if (titel) eintrag.title = titel;
  const ziel = listeVon(b, nach);
  if (!ziel) throw new Error(`Ziel «${nach.join(' > ')}» nicht gefunden`);
  const pos = hinter ? ziel.findIndex(x => x.title === hinter) : -1;
  ziel.splice(pos >= 0 ? pos + 1 : ziel.length, 0, eintrag);
  return b;
}
/** Eintrag auf die oberste Ebene heben (hinter dem Geschwister `hinter`), optional umbenennen. */
export const befoerdern = (baum, { von, hinter, titel }) => verschiebe(baum, { von, nach: [], hinter, titel });

export function umbenennen(baum, { pfad, titel, ressource }) {
  const b = kopie(baum);
  const e = suche(b, pfad);
  if (!e) throw new Error(`Eintrag «${pfad.join(' > ')}» nicht gefunden`);
  e.title = titel;
  if (ressource) { e.resourceId = ressource; e.type = 'COLLECTION'; delete e.url; }
  return b;
}
/** Entfernt einen Eintrag (nur für Dubletten gedacht: gleiches Ziel wie der Eltern-Eintrag oder durch zwei neue ersetzt). */
export function entfernen(baum, { pfad }) {
  const b = kopie(baum);
  const liste = listeVon(b, pfad.slice(0, -1));
  const i = liste ? liste.findIndex(x => x.title === pfad.at(-1)) : -1;
  if (i < 0) throw new Error(`Eintrag «${pfad.join(' > ')}» nicht gefunden`);
  liste.splice(i, 1);
  return b;
}
/** Wendet eine Operation an. */
export function anwenden(baum, op) {
  if (op.op === 'verschiebe') return verschiebe(baum, op);
  if (op.op === 'befoerdern') return befoerdern(baum, op);
  if (op.op === 'umbenennen') return umbenennen(baum, op);
  if (op.op === 'einfuegen') return einfuegenPfad(baum, op);
  if (op.op === 'entfernen') return entfernen(baum, op);
  throw new Error('Unbekannte Operation ' + op.op);
}

/** Flache Form für den Vergleich: Pfad, Titel, Typ, Ziel — in Reihenfolge. */
export function flach(baum, pfad = '') {
  return baum.flatMap(i => [`${pfad}/${i.title}|${i.type}|${i.resourceId || i.url || ''}`, ...flach(i.items || [], `${pfad}/${i.title}`)]);
}
/** Gleich, wenn Pfad, Titel, Typ, Ziel und Reihenfolge übereinstimmen (Shopify-IDs und URLs von Collections zählen nicht). */
export function gleicherBaum(gesendet, zurueck) {
  const norm = l => l.map(x => x.replace(/\|(COLLECTION|HTTP|PAGE|BLOG|CATALOG|COLLECTIONS|FRONTPAGE|SEARCH|SHOP_POLICY|PRODUCT|METAOBJECT|ARTICLE)\|.*$/, '|$1'));
  // Ziele unterscheiden sich bei Collections nur im Format (GID vs. URL) — Titel/Typ/Pfad/Reihenfolge entscheiden
  const a = norm(flach(gesendet)), b = norm(flach(zurueck));
  return { gleich: JSON.stringify(a) === JSON.stringify(b), nurGesendet: a.filter(x => !b.includes(x)), nurZurueck: b.filter(x => !a.includes(x)) };
}

/** Der Umbau dieser Sitzung, in dieser Reihenfolge (Verschieben vor Einfügen). `ressourceHandle` wird zur Laufzeit zur GID aufgelöst. */
export const UMBAU = [
  // Küche & Tisch: Küchen-Seiten gehören unter «Küche & Kochen», nicht als 40 Geschwister unter «Wohnen & Garten»
  ...['Tassen & Becher', 'Schneidebretter', 'Woks & Wokpfannen', 'Etageren', 'Küchenhelfer & Gadgets', 'Lunchboxen & Bento-Boxen']
    .map(t => ({ op: 'verschiebe', von: ['Wohnen & Garten', t], nach: ['Wohnen & Garten', 'Küche & Kochen'] })),
  // Wohntextilien zusammen
  ...['Teppiche', 'Bettwäsche', 'Vorhänge', 'Duschvorhänge', 'Kuschel- & Heizdecken']
    .map(t => ({ op: 'verschiebe', von: ['Wohnen & Garten', t], nach: ['Wohnen & Garten', 'Kissen & Wohntextilien'] })),
  { op: 'verschiebe', von: ['Wohnen & Garten', 'LED-Strips & Lichterketten'], nach: ['Wohnen & Garten', 'Beleuchtung'] },
  // Vasen & Deko trennen
  { op: 'umbenennen', pfad: ['Wohnen & Garten', 'Vasen & Deko'], titel: 'Dekoration' },
  // Schmuck und Uhren trennen
  { op: 'umbenennen', pfad: ['Schmuck & Uhren'], titel: 'Schmuck', ressourceHandle: 'schmuck' },
  { op: 'befoerdern', von: ['Schmuck', 'Uhren'], hinter: 'Schmuck' },
  // Elektronik und Technik/Gaming trennen
  { op: 'umbenennen', pfad: ['Technik & Gaming'], titel: 'Elektronik' },
  { op: 'befoerdern', von: ['Elektronik', 'Gaming'], hinter: 'Elektronik', titel: 'Gaming & Gadgets' },
  { op: 'verschiebe', von: ['Elektronik', 'Lifestyle & Trends'], nach: ['Gaming & Gadgets'] },
  // Taschen & Rucksäcke eigene Welt (waren nur ein Unterpunkt von «Damen»)
  { op: 'befoerdern', von: ['Damen', 'Taschen & Rucksäcke'], hinter: 'Schuhe' },
  { op: 'verschiebe', von: ['Damen', 'Bauchtaschen & Gürteltaschen'], nach: ['Taschen & Rucksäcke'] },
  // Kinder und Haustiere trennen
  { op: 'umbenennen', pfad: ['Kinder & Haustier'], titel: 'Kinder & Baby' },
  { op: 'entfernen', pfad: ['Kinder & Baby', 'Kinder & Baby'] },
  { op: 'befoerdern', von: ['Kinder & Baby', 'Haustierwelt'], hinter: 'Kinder & Baby', titel: 'Haustiere' },
  { op: 'entfernen', pfad: ['Haustiere', 'Leinen & Tierkleidung'] },
];
