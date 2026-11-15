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

/*
 * ── Schaufenster-Pins (11.11.2026) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
 * Bis zu 4 handverlesene Produkte je Kategorie stehen auf den Plätzen 1 bis 4, in der Reihenfolge der Pin-Liste (dropship/kategorie-schaufenster-pins.json,
 * geladen mit lib/schaufenster_pins.mjs). Ein Pin zählt nur, wenn er Mitglied der Collection, aktiv und verfügbar ist (dieselbe Regel `verfuegbar` wie oben).
 * Ein ausverkauftes oder inaktives gepinntes Produkt rückt wie jedes andere nach hinten und wird als Befund gemeldet; die übrigen Pins rücken auf.
 * Ohne Pins ist alles wie vorher (planen() liefert dann dieselbe Entscheidung und dasselbe Ziel wie die alte Logik).
 */
export const MAX_KOPF = 4;

/** Die Pins, die heute vorn stehen dürfen: Mitglied, aktiv, verfügbar; Reihenfolge der Pin-Liste; ohne Doppelte; höchstens max. */
export function pinKopf(ids, bestand, pins = [], max = MAX_KOPF) {
  const drin = new Set(ids), kopf = [];
  for (const id of pins.slice(0, max)) if (drin.has(id) && verfuegbar(bestand, id) && !kopf.includes(id)) kopf.push(id);
  return kopf;
}

/** Befunde je Pin, der NICHT vorn stehen kann: { id, grund: 'kein Mitglied' | 'nicht aktiv' | 'ausverkauft' } (genauer: befundeMitSichtbarkeit weiter unten). */
export function pinBefunde(ids, bestand, pins = [], max = MAX_KOPF) {
  const drin = new Set(ids), out = [];
  for (const id of [...new Set(pins.slice(0, max))]) {
    if (!drin.has(id)) out.push({ id, grund: 'kein Mitglied' });
    else if (bestand.get(id) === null || bestand.get(id) === undefined) out.push({ id, grund: 'nicht aktiv' });
    else if (!verfuegbar(bestand, id)) out.push({ id, grund: 'ausverkauft' });
  }
  return out;
}

/** Gepinnte Mitglieder, die nicht vorn stehen dürfen (ausverkauft oder inaktiv). */
const pinsHinten = (ids, bestand, pins, max) => { const kopf = new Set(pinKopf(ids, bestand, pins, max)), drin = new Set(ids); return [...new Set(pins.slice(0, max))].filter(id => drin.has(id) && !kopf.has(id)); };

/**
 * Stimmt der Kopf? Die ersten Plätze sind genau der Pin-Kopf (in Pin-Reihenfolge) UND jeder nicht verfügbare Pin steht hinter dem letzten
 * verfügbaren Produkt («rückt nach hinten» wie bei der Teilung). Ohne Pins immer wahr.
 */
export function kopfStimmt(ids, bestand, pins = [], max = MAX_KOPF) {
  const kopf = pinKopf(ids, bestand, pins, max);
  for (let i = 0; i < kopf.length; i++) if (ids[i] !== kopf[i]) return false;
  const letzteVerfuegbar = ids.map(id => verfuegbar(bestand, id)).lastIndexOf(true);
  return pinsHinten(ids, bestand, pins, max).every(id => ids.indexOf(id) > letzteVerfuegbar);
}

/**
 * Zielreihenfolge mit Pins. voll=true: Pin-Kopf, danach die stabile Teilung des Rests (wie zielReihenfolge).
 * voll=false: Pin-Kopf, danach der Rest in der heutigen Reihenfolge; nur nicht verfügbare Pins gehen ans Ende (sonst bleibt alles, wie es ist).
 */
export function zielMitPins(ids, bestand, pins = [], { voll = true, max = MAX_KOPF } = {}) {
  const kopf = pinKopf(ids, bestand, pins, max), k = new Set(kopf);
  const rest = ids.filter(id => !k.has(id));
  if (voll) return [...kopf, ...zielReihenfolge(rest, bestand)];
  const hinten = new Set(pinsHinten(ids, bestand, pins, max));
  return [...kopf, ...rest.filter(id => !hinten.has(id)), ...rest.filter(id => hinten.has(id))];
}

/**
 * Entscheidung je Collection (rein, getestet). Alte Regel: umsortieren, wenn der Anteil Ausverkaufter unter den ersten n aktiven ≥ schwelle ist
 * (bei schwelle 0: wenn irgendetwas nicht stimmt). Neu: stimmt der Pin-Kopf nicht, wird auch unter der Schwelle umgestellt, dann aber NUR der Kopf
 * (aktion 'nurKopf'); über der Schwelle die volle Teilung mit Pins (aktion 'voll'); sonst 'nichts'.
 */
export function planen(ids, bestand, pins = [], schwelle = 0.2, n = 48) {
  const anteil = anteilVorn(ids, bestand, n), { von, aus } = ausverkauftVorn(ids, bestand, n);
  const ueber = !(anteil < schwelle || (schwelle === 0 && aus === 0 && istVerfuegbarVorn(ids, bestand)));
  const kopf = pinKopf(ids, bestand, pins), befunde = pinBefunde(ids, bestand, pins);
  const basis = { anteil, von, aus, kopf, befunde };
  if (!ueber && kopfStimmt(ids, bestand, pins)) return { ...basis, aktion: 'nichts', ziel: ids };
  const voll = ueber;
  return { ...basis, aktion: voll ? 'voll' : 'nurKopf', ziel: zielMitPins(ids, bestand, pins, { voll }) };
}

/** Nachlese nach dem Schreiben: Kopf stimmt und (bei voller Teilung) alles Verfügbare steht vor allem Übrigen. */
export function nachleseOk(ids, bestand, pins = [], voll = true) {
  return kopfStimmt(ids, bestand, pins) && (!voll || istVerfuegbarVorn(ids, bestand));
}

/*
 * Sichtbarkeit der Pins (15.11.2026, Prüfer-Fund): ein gepinntes Produkt, das aktiv, aber NICHT im Onlineshop veröffentlicht ist, sieht der Kunde nicht.
 * Es darf keinen der Plätze 1 bis 4 belegen und zählt darum wie «nicht aktiv» (null). `unsichtbar` = Set der gepinnten Produkt-IDs ohne Veröffentlichung
 * im Onlineshop (nur Pins werden abgefragt, der übrige Bestand bleibt wie vorher). Ohne unsichtbare Pins kommt derselbe Bestand zurück (gleiches Objekt).
 */
export function mitSichtbarkeit(bestand, unsichtbar = new Set()) {
  if (!unsichtbar.size) return bestand;
  const b = new Map(bestand);
  for (const id of unsichtbar) if (b.get(id) !== null && b.get(id) !== undefined) b.set(id, null);
  return b;
}

/** Befunde mit genauerem Grund: ein Pin, der nur wegen fehlender Veröffentlichung «nicht aktiv» ist, heisst «nicht im Onlineshop». bestand = Originalbestand. */
export function befundeMitSichtbarkeit(befunde, bestand, unsichtbar = new Set()) {
  return befunde.map(b => (b.grund === 'nicht aktiv' && unsichtbar.has(b.id) && bestand.get(b.id) !== null && bestand.get(b.id) !== undefined) ? { ...b, grund: 'nicht im Onlineshop' } : b);
}
