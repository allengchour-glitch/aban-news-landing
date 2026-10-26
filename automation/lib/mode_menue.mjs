/**
 * Menü-Umbau für die Mode-Taxonomie: ersetzt die Bekleidungs-Einträge unter «Damen», «Herren» und «Kinder & Baby > Babykleidung & Kindermode»
 * durch die neuen Kategorien (Reihenfolge der Taxonomie). Alles, was NICHT Bekleidung ist (Schuhe, Accessoires, Uhren, Bart & Rasur), bleibt
 * stehen — die Taxonomie deckt Schuhe und Accessoires in dieser Etappe nicht ab.
 *
 * Rein, ohne Netz (getestet in mode_menue_test.mjs). Die Gruppen der Taxonomie («Oberteile», «Hosen & Röcke») sind im Shop-Menü keine
 * Einträge: ein Menüpunkt braucht ein Ziel. Die Reihenfolge der Taxonomie bleibt, die Gruppen entfallen.
 */
import { suche, tiefe, alleRessourcen } from './menue_plan.mjs';

const kopie = x => JSON.parse(JSON.stringify(x));

/** Bisherige Bekleidungs-Einträge, die durch die neuen Kategorien ersetzt werden (Titel im Live-Menü am 26.10.2026). */
export const ENTFERNEN = {
  Damen: ['Kleider', 'Midikleider', 'Abendkleider & Cocktailkleider', 'T-Shirts & Tops', 'Strick & Pullover', 'Jeans & Denim', 'Jacken & Mäntel',
    'Jacken & Outdoor-Mode', 'Jumpsuits & Overalls', 'Blusen & Tops', 'Hosen & Leggings', 'Röcke', 'Shorts & Bermudas', 'Nachtwäsche & Pyjamas'],
  Herren: ['Hemden', 'Shirts & Polos', 'Hosen', 'Herren-Jeans', 'Pullover', 'Jacken'],
  Kinder: ['Strampler & Bodys', 'Baby- & Kinder-Sets'],
};
/** Wo im Menü die Einträge stehen. */
export const PFADE = { Damen: ['Damen'], Herren: ['Herren'], Kinder: ['Kinder & Baby', '👶 Babykleidung & Kindermode'] };
/** Welche Kategorien ihre Unterfilter als dritte Menüebene zeigen (die grösste: Kleider, 15 Filter). */
export const MIT_FILTER = new Set(['damen-kleider']);

/**
 * @param baum   Menü-Eingabe (wie eingabeAus liefert)
 * @param plan   { Damen: [eintrag], Herren: [...], Kinder: [...] }, eintrag = { handle, titel, verweis, unterfilter: [{handle, titel}] }
 * @param gids   { handle: GID } — nur Collections, die es im Shop gibt; fehlende Einträge werden übersprungen und gemeldet
 */
export function modeMenue(baum, plan, gids) {
  let b = kopie(baum); const log = [];
  for (const top of Object.keys(PFADE)) {
    const eltern = suche(b, PFADE[top]);
    if (!eltern) { log.push(`ÜBERSPRUNGEN ${top}: «${PFADE[top].join(' > ')}» nicht gefunden`); continue; }
    const behalten = [];
    for (const i of eltern.items) { if (ENTFERNEN[top].includes(i.title)) log.push(`entfernt  ${top} > ${i.title}`); else behalten.push(i); }
    const neu = [];
    for (const e of plan[top] || []) {
      const id = gids[e.handle];
      if (!id) { log.push(`fehlt     ${e.handle}: Collection existiert nicht — Eintrag übersprungen`); continue; }
      const unter = MIT_FILTER.has(e.handle) ? (e.unterfilter || []).filter(u => gids[u.handle]).map(u => ({ title: u.titel, type: 'COLLECTION', resourceId: gids[u.handle], items: [] })) : [];
      neu.push({ title: e.titel, type: 'COLLECTION', resourceId: id, items: unter });
      log.push(`neu       ${top} > ${e.titel}${unter.length ? ` (+${unter.length} Filter)` : ''}${e.verweis ? ' [Verweis]' : ''}`);
    }
    eltern.items = [...neu, ...behalten];
  }
  return { baum: b, log };
}

/** Prüfungen vor dem Schreiben: Tiefe, doppelte Ziele im selben Elternknoten, nichts Fremdes verloren. */
export function pruefeMenue(alt, neu) {
  const fehler = [];
  if (tiefe(neu) > 3) fehler.push(`Menü hätte ${tiefe(neu)} Ebenen (Shopify erlaubt 3)`);
  (function lauf(l, pfad) {
    const ziele = new Map();
    for (const i of l) { if (i.resourceId) { if (ziele.has(i.resourceId)) fehler.push(`doppeltes Ziel unter «${pfad || '(oben)'}»: ${i.title} = ${ziele.get(i.resourceId)}`); ziele.set(i.resourceId, i.title); } lauf(i.items || [], `${pfad}/${i.title}`); }
  })(neu, '');
  // Oberste Ebene muss gleich bleiben (Titel und Reihenfolge)
  if (JSON.stringify(alt.map(x => x.title)) !== JSON.stringify(neu.map(x => x.title))) fehler.push('oberste Ebene verändert');
  // Nicht-Bekleidung unter den drei Elternknoten bleibt vollständig erhalten
  for (const top of Object.keys(PFADE)) {
    const a = suche(alt, PFADE[top])?.items.map(x => x.title).filter(t => !ENTFERNEN[top].includes(t)) || [];
    const n = suche(neu, PFADE[top])?.items.map(x => x.title) || [];
    for (const t of a) if (!n.includes(t)) fehler.push(`verloren: ${top} > ${t}`);
  }
  return fehler;
}
export { alleRessourcen };
