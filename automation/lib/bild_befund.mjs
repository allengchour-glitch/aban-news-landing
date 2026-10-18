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

/**
 * Soll das Hauptbild getauscht werden, weil es zu klein ist?
 *
 * Gemessen am 2026-10-18 ueber 5000 aktive Produkte: **775 Hauptbilder liegen unter 800 px**,
 * und **411 davon haben weiter hinten ein groesseres Bild**. Auf der Kachel und in der
 * Google-Bildersuche ist ein 539x537-Bild sichtbar weicher als ein 800x800.
 *
 * Die Vorsicht steckt in der Gegenrichtung: „groesser" allein reicht NICHT. Ein Verpackungs-
 * oder Detailfoto kann groesser sein als das Produktfoto — es nach vorn zu holen waere eine
 * Verschlechterung, die wie eine Verbesserung aussieht. Darum muss die Alternative beides sein:
 * selbst gross genug UND vom Vision-Modell als sauberes Produktbild bestaetigt.
 *
 * @param {{breite:number,hoehe:number}} jetzt   Mass des aktuellen Hauptbilds
 * @param {{breite:number,hoehe:number}} alt     Mass des Kandidaten
 * @param {object|null} altBefund                Vision-Befund des Kandidaten
 * @param {number} minPx                         Schwelle (image-audit: MIN_PX, Vorgabe 800)
 */
export function groesserUndSauber(jetzt, alt, altBefund, minPx) {
  if (!jetzt || !alt || !minPx) return false;
  // Unbekannte Masse sind KEIN Befund (Lehre von url_status.mjs: lieber „nicht messbar" als
  // ein Urteil). Im eigenen Test aufgefallen: ohne diese Zeile gilt 0x0 als „zu klein" und
  // loest einen Tausch aus, obwohl ueber das Hauptbild nichts bekannt ist.
  const bekannt = (m) => Boolean(m.breite && m.hoehe);
  if (!bekannt(jetzt) || !bekannt(alt)) return false;
  const klein = (m) => m.breite < minPx || m.hoehe < minPx;
  if (!klein(jetzt)) return false;            // das Hauptbild ist gross genug — nichts zu tun
  if (klein(alt)) return false;               // die Alternative ist auch zu klein
  if (alt.breite * alt.hoehe <= jetzt.breite * jetzt.hoehe) return false;
  return istBessereAlternative(altBefund);    // und sie muss das Produkt sauber zeigen
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
