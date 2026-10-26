/**
 * Plan für die Unterfilter-Metafelder der Mode-Kategorien (Chip-Zeile auf der Kategorieseite, Theme-Entwurf).
 *
 * Die Chips kommen NICHT aus dem Menü (das Theme zeigt dort nur Geschwister der zweiten Ebene), sondern aus zwei Collection-Metafeldern:
 *   lux.unterfilter  (Liste von Collections, am Elternteil)  → die Filter-Seiten dieser Kategorie
 *   lux.eltern       (eine Collection, an jedem Filter)      → zurück zur Kategorie, damit auf der Filter-Seite dieselbe Chip-Zeile steht
 * Rein, ohne Netz (getestet).
 */
export const NAMESPACE = 'lux', KEY_FILTER = 'unterfilter', KEY_ELTERN = 'eltern';

/**
 * @param {{id:string, handle:string, filter?:boolean, eltern_id?:string}[]} kategorien   (aus lib/kategorien.mjs; Filter tragen eltern_id)
 * @param {Record<string,string|null>} gids   { handle: GID } der im Shop vorhandenen Collections
 * @returns {{writes:{ownerId:string, key:string, type:string, value:string, handle:string}[], fehlend:string[], uebersprungen:string[]}}
 */
export function planMetafelder(kategorien, gids) {
  const writes = [], fehlend = [], uebersprungen = [];
  const eltern = new Map(kategorien.filter(k => !k.filter).map(k => [k.id, k]));
  const kinder = new Map();
  for (const k of kategorien.filter(k => k.filter)) {
    const p = eltern.get(k.eltern_id);
    if (!p) { uebersprungen.push(`${k.handle}: Eltern ${k.eltern_id} unbekannt`); continue; }
    if (!kinder.has(p.id)) kinder.set(p.id, []);
    kinder.get(p.id).push(k);
  }
  for (const [pid, liste] of kinder) {
    const p = eltern.get(pid), pg = gids[p.handle];
    if (!pg) { fehlend.push(p.handle); continue; }
    const da = liste.filter(k => gids[k.handle]);
    for (const k of liste) if (!gids[k.handle]) fehlend.push(k.handle);
    if (!da.length) continue;
    writes.push({ ownerId: pg, handle: p.handle, key: KEY_FILTER, type: 'list.collection_reference', value: JSON.stringify(da.map(k => gids[k.handle])) });
    for (const k of da) writes.push({ ownerId: gids[k.handle], handle: k.handle, key: KEY_ELTERN, type: 'collection_reference', value: pg });
  }
  return { writes, fehlend: [...new Set(fehlend)], uebersprungen };
}

/** Teilt die Schreibliste in Pakete (metafieldsSet nimmt höchstens 25 je Aufruf). Rein, getestet. */
export function pakete(writes, n = 25) { const aus = []; for (let i = 0; i < writes.length; i += n) aus.push(writes.slice(i, i + n)); return aus; }
