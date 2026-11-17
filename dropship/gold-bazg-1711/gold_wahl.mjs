// Gold-Wächter, reiner Kern (kein Netz): aus dem gelesenen Katalog die Liste für gold_entwurf.mjs bauen.
// Regel: automation/lib/gold_feingehalt.mjs («massiv» = Gold-/Platin-Feingehalt ohne Plattierung im Text → Entwurf; «plattiert-mit-zahl» nur Hinweis).
// Jeder Eintrag trägt Belegsätze: Ausschnitte des Textes (klein geschrieben, Leerraum zusammengefasst), die gold_entwurf.mjs vor dem Schreiben im frisch gelesenen Produkt wiederfinden muss
// (hat jemand den Text berichtigt, bleibt das Produkt aktiv). Ein Treffer, dessen Beleg sich nicht aus dem Text schneiden lässt, wird NICHT entworfen, sondern gemeldet (`ohneBeleg`).
import { waehleGold } from '../../automation/lib/gold_feingehalt.mjs';
import { textVon } from './gold_entwurf.mjs';

/** Höchstens so viele Produkte je Lauf (mehr = kein normaler Zufluss: Halt und Meldung, nichts wird geändert). */
export const MAX_JE_LAUF = 12;
const FENSTER = 14;

/** Belegsätze aus dem Text des Produkts: um jede Fundstelle (`kern`) herum, höchstens drei; nur was wörtlich im Text von gold_entwurf.textVon steht (der Ausschnitt ist ein Stück davon und mit dem Trenner « ¦ » mindestens 6 Zeichen lang, wie es das Listen-Tor von gold_entwurf.mjs verlangt). */
export function baueBelege(p, treffer) {
  const roh = textVon(p);
  const aus = [];
  for (const t of treffer || []) {
    const kern = String(t?.kern ?? '').toLowerCase();
    const i = kern ? roh.indexOf(kern) : -1;
    if (i < 0) continue;
    const b = roh.slice(Math.max(0, i - FENSTER), i + kern.length + FENSTER).trim();
    if (!aus.includes(b)) aus.push(b);
    if (aus.length >= 3) break;
  }
  return aus;
}

/**
 * Liste für einen Lauf. `alle` = gelesene aktive Produkte {id, handle, title, description, productType, tags, options:[{name, values}]}.
 * Rückgabe {gelesenAktiv, anzahl, eintraege, ohneBeleg, hinweise, zuViele, max}: `eintraege` im Format von gold_entwurf.mjs ({handle, id, beleg, art, treffer}).
 */
export function baueListe(alle, { ausnahmen = new Set(), max = MAX_JE_LAUF } = {}) {
  const { eintraege, hinweise } = waehleGold(alle, { ausnahmen });
  const produkt = new Map((alle || []).filter(Boolean).map((p) => [p.handle, p]));
  const gut = [], ohneBeleg = [];
  for (const e of eintraege) {
    const beleg = baueBelege(produkt.get(e.handle), e.treffer);
    if (beleg.length) gut.push({ ...e, beleg }); else ohneBeleg.push(e);
  }
  return { gelesenAktiv: (alle || []).length, anzahl: gut.length, eintraege: gut, ohneBeleg, hinweise, zuViele: gut.length > max, max };
}
