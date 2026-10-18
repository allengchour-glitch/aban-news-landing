/**
 * Entscheidet, ob das Hauptbild eines Produkts getauscht werden soll — und gegen welches.
 *
 * WARUM ES DIESES MODUL GIBT (2026-10-18):
 * `image-audit.mjs` fragte das Vision-Modell, ob die prominenteste Person „ost-/südostasiatisch
 * wirkt", und sortierte das Hauptbild genau dann nach hinten (`(person && asian) || low_quality`).
 * Damit wurde die **Herkunft eines Menschen auf dem Foto** zum Ausschlussgrund. Das ist keine
 * Qualitätsmessung, und ein Shop, der so sortiert, benachteiligt Abgebildete nach Aussehen.
 * Der Lauf hing an einem Wochen-Cron (Di 04:30 UTC) mit „anwenden" als Vorgabe — er wäre beim
 * nächsten Mal von selbst über den Katalog gegangen.
 *
 * Geblieben ist der Teil, der wirklich etwas misst: Auflösung, Unschärfe, Wasserzeichen,
 * Text-Overlay, Collage — und ob das Bild das Produkt überhaupt zeigt. Das ist auch der Teil,
 * der die Arbeit macht: ein verwackeltes Collagen-Bild schadet der Kachel, ein Model nicht.
 */

/** Die Merkmale, die das Vision-Modell liefern soll. */
export const MERKMALE = ['zeigt_produkt', 'unscharf', 'wasserzeichen', 'text_overlay', 'collage'];

/** Ein Bild ist schwach, wenn es handwerklich schlecht ist ODER das Produkt nicht zeigt. */
export function istSchwach(b) {
  if (!b) return false;
  return Boolean(b.unscharf || b.wasserzeichen || b.text_overlay || b.collage || b.zeigt_produkt === false);
}

/** Eine Alternative taugt nur, wenn sie das Produkt zeigt und selbst keinen Mangel hat. */
export function istBessereAlternative(b) {
  return Boolean(b && b.zeigt_produkt === true && !istSchwach(b));
}

/** Kurzer Grund für den Bericht — nennt den ersten zutreffenden Mangel. */
export function grund(b, zuKlein) {
  if (zuKlein) return 'zu-kleine-aufloesung';
  if (!b) return 'nicht-bewertbar';
  if (b.unscharf) return 'unscharf';
  if (b.wasserzeichen) return 'wasserzeichen';
  if (b.text_overlay) return 'text-im-bild';
  if (b.collage) return 'collage';
  if (b.zeigt_produkt === false) return 'zeigt-das-produkt-nicht';
  return 'ok';
}
