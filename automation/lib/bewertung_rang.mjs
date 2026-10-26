/**
 * Rangfolge «gut bewertete zuerst» für Kategorieseiten. Reine Rechnung, getestet (bewertung_rang_test.mjs).
 *
 * WARUM (25.10.2026): Der User sah auf den Kategorieseiten Produkte mit Bewertungen irgendwo in der Mitte, daneben bewertungslose.
 * Gemessen: 2084 von 56 636 aktiven Produkten tragen Judge.me-Bewertungen (2023 mit ≥ 4 Sternen). Shopify kann nicht nach Bewertung sortieren;
 * möglich ist die manuelle Reihenfolge einer Collection. Bewertete Produkte kommen darum vorn, danach die Bestseller, der Rest bleibt.
 *
 * Wer unter 4 Sternen liegt, wird NICHT nach vorn gehoben (er bleibt, wo er ist) — ein schlecht bewertetes Produkt zu bewerben wäre das Gegenteil des Ziels.
 * Eine einzelne 5-Sterne-Bewertung schlägt keine 4,8 aus vierzehn: der Wert zieht Produkte mit wenig Stimmen zum Prior (4,0, Gewicht 3 Stimmen) hin.
 */
export const PRIOR = 4.0, GEWICHT = 3, MIN_STERNE = 4.0;

/** Bayes-Mittel: wenige Stimmen zählen weniger. Rein, getestet. */
export const wert = (mittel, stimmen, prior = PRIOR, gewicht = GEWICHT) => (mittel * stimmen + prior * gewicht) / (stimmen + gewicht);

/** @param {Map<string,{a:number,c:number}>} bewertet  id → Mittel/Stimmen
 *  @param {{id:string}[]} mitglieder  aktive Mitglieder der Collection
 *  @returns {string[]} Produkt-IDs, beste zuerst; nur ≥ MIN_STERNE, höchstens `max`. */
export function rangliste(bewertet, mitglieder, { max = 120, minSterne = MIN_STERNE } = {}) {
  const gut = [];
  for (const p of mitglieder) {
    const b = bewertet.get(p.id);
    if (!b || !(b.c > 0) || b.a < minSterne) continue;
    gut.push({ id: p.id, w: wert(b.a, b.c), c: b.c });
  }
  gut.sort((x, y) => y.w - x.w || y.c - x.c || (x.id < y.id ? -1 : 1));
  return gut.slice(0, max).map(x => x.id);
}

/** Vorn die Bewerteten, dann die Bestseller (ohne Doppelte). Liefert die Verschiebungen für collectionReorderProducts. Rein, getestet. */
export function bewegungen(bewertetOben, bestseller, { nachBestseller = 100 } = {}) {
  const gesehen = new Set(), reihe = [];
  for (const id of [...bewertetOben, ...bestseller.slice(0, nachBestseller)]) { if (!gesehen.has(id)) { gesehen.add(id); reihe.push(id); } }
  return reihe.map((id, i) => ({ id, newPosition: String(i) }));
}

/** Judge.me-Metafeld (review_widget_data) → {a, c} oder null. Rein, getestet. */
export function bewertungAus(json) {
  let d; try { d = typeof json === 'string' ? JSON.parse(json) : json; } catch { return null; }
  const c = Number(d?.number_of_reviews), a = Number(d?.average_rating);
  return c > 0 && a > 0 ? { a, c } : null;
}
