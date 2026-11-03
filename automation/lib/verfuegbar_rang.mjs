/**
 * «Verfügbares zuerst»: Rechenkern für automation/verfuegbar_zuerst.mjs. Rein, ohne Netz, getestet (verfuegbar_rang_test.mjs).
 *
 * Bestand je Produkt-ID: Zahl = aktives Produkt mit diesem Gesamtbestand, Infinity = aktiv OHNE Bestandsführung (CJ-Ware: Bestand 0, aber kaufbar —
 * ein erster Wurf zählte sie als ausverkauft und stellte sie ans Ende), null = nicht aktiv (Entwurf/archiviert, im Shop unsichtbar).
 * «Verfügbar» heisst aktiv UND Bestand > 0. Alles andere (ausverkauft, Entwurf, unbekannt) geht stabil ans Ende — die bisherige
 * Reihenfolge (neu zuerst, Bewertung zuerst, Handsortierung) bleibt innerhalb jeder der beiden Gruppen unverändert.
 */

export const verfuegbar = (bestand, id) => { const b = bestand.get(id); return typeof b === 'number' && b > 0; };

/** Stabile Teilung: erst die verfügbaren, dann der Rest. */
export function zielReihenfolge(ids, bestand) {
  return [...ids.filter(id => verfuegbar(bestand, id)), ...ids.filter(id => !verfuegbar(bestand, id))];
}

/**
 * Verschiebungen für collectionReorderProducts: das Produkt der Zielposition i wird an Stelle i gezogen, wenn es dort noch nicht liegt.
 * Die Liste wird lokal durchgespielt, damit die Positionen zum jeweiligen Zwischenstand passen.
 */
export function zuege(ist, ziel) {
  const arr = [...ist], moves = [];
  for (let i = 0; i < ziel.length; i++) {
    if (arr[i] === ziel[i]) continue;
    const von = arr.indexOf(ziel[i]);
    if (von < 0) continue;
    arr.splice(von, 1); arr.splice(i, 0, ziel[i]);
    moves.push({ id: ziel[i], newPosition: String(i) });
  }
  return moves;
}

/** Wie viele der ersten n AKTIVEN Produkte ausverkauft sind (so sieht es ein Kunde auf der ersten Seite). */
export function ausverkauftVorn(ids, bestand, n = 48) {
  const aktiv = ids.filter(id => bestand.get(id) !== null && bestand.get(id) !== undefined).slice(0, n);
  return { von: aktiv.length, aus: aktiv.filter(id => !verfuegbar(bestand, id)).length };
}

/** Anteil 0..1 ausverkaufter Produkte unter den ersten n aktiven (0 bei leerer Collection). */
export function anteilVorn(ids, bestand, n = 48) {
  const { von, aus } = ausverkauftVorn(ids, bestand, n);
  return von ? aus / von : 0;
}

/** Sind alle verfügbaren Produkte vor allen übrigen? (Nachlese nach dem Schreiben.) */
export function istVerfuegbarVorn(ids, bestand) {
  const erstesRest = ids.findIndex(id => !verfuegbar(bestand, id));
  if (erstesRest === -1) return true;
  const letztesOk = ids.map(id => verfuegbar(bestand, id)).lastIndexOf(true);
  return letztesOk < erstesRest;
}
