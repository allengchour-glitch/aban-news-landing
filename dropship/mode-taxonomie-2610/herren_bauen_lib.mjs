// Wandelt die Kurzschreibweise der Spec in das Ausgabeformat. Ausschlüsse gegenüber vorrangigen Kategorien (Reihenfolge der Spec) werden
// AUSDRÜCKLICH in titel_nicht eingetragen, damit jede Kategorie für sich ausführbar ist und kein Produkt in zwei Blättern landet.
// Exakt ist das nur, wenn die Google-Kategorien der späteren Kategorie ganz in denen der früheren liegen UND die spätere alle
// eigenen Ausschlüsse (titel_nicht) der früheren ebenfalls führt (sonst würde ein dort ausgeschlossenes Produkt doppelt verdrängt).
import { SPERR_TAGS } from '/home/user/aban-news-landing/automation/lib/kategorien.mjs';
const teilmenge = (gi, gj) => gi.every(x => gj.some(y => x.startsWith(y)));
export function bauKategorien(spec, eltern = 'herren') {
  return spec.map((k, i) => {
    const nicht = [...(k.nicht || [])];
    const add = x => { if (!nicht.includes(x)) nicht.push(x); };
    for (let j = 0; j < i; j++) {
      const v = spec[j];
      if (!teilmenge(k.g, v.g)) continue;
      for (const x of (v.nicht || [])) add(x);   // was der Vorrang ausschliesst, schliesse auch ich aus
      for (const x of v.muss) add(x);            // was der Vorrang aufnimmt, nehme ich nicht
    }
    return {
      handle: k.handle, titel: k.titel, eltern, geschlecht: k.geschlecht || 'herren',
      g_prefix: k.g, g_nicht: k.g_nicht || [], titel_muss: k.muss, titel_nicht: nicht,
      tags_muss_eines: k.tags_muss_eines || [], tags_nicht: k.tags_nicht || SPERR_TAGS, beschreibung: k.beschreibung || '',
    };
  });
}
