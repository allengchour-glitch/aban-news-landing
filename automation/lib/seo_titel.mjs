/**
 * SEO-Titel und -Beschreibung aus einem Produkttitel bauen.
 *
 * WARUM ES DIESES MODUL GIBT (gemessen 2026-10-17): `seo-optimizer.mjs` normalisierte Trennzeichen
 * mit `\s*[·–—-]\s*` → ` – `. Das Muster trifft auch den **Bindestrich MITTEN im Wort**, und so wurde
 * aus „Gaming-Controller" → „Gaming – Controller", aus „Joy-Con" → „Joy – Con", aus „Type-C" →
 * „Type – C". Betroffen wären **985 von 2415** Produkten ohne SEO-Titel (41 %) — falsches Deutsch,
 * und zwar als Überschrift in der Google-Trefferliste.
 *
 * Das ist dieselbe Fehlerklasse wie „3-5 Minuten" → „3." auf 264 Seiten (Lehre vom 07.09.):
 * **BEI MASSENERSETZUNGEN DEN DIFF LESEN, NICHT DIE ZAHL.**
 *
 * Zweiter Fund: `clip(titel + ' | LuxeStyle CH', 60)` schnitt bei langen Titeln die Marke ab und
 * hinterliess ein hängendes „|…" (255 von 2415 = 11 %). Die Marke kommt jetzt nur dran, wenn sie passt.
 *
 * Dritter Fund: die Beschreibung versprach „schnelle Lieferung". CJ-Produkte liefern in **10–20
 * Werktagen** — das wäre eine falsche Zusage auf tausenden Seiten. Stattdessen nur geprüfte Fakten:
 * Schweizer Shop · Gratis-Versand ab CHF 50 (bewusst 50, s. dropship/VERSAND-SCHWELLE.md) ·
 * 30 Tage Rückgabe · WELCOME10 (live geprüft: ACTIVE bis 31.12.2027).
 */
export const MARKE = ' | LuxeStyle CH';
export const MAX_TITEL = 60;
export const MAX_BESCHREIBUNG = 155;

/** Nur ECHTE Trennzeichen vereinheitlichen — niemals den Bindestrich innerhalb eines Wortes. */
export function titelNormalisieren(roh) {
  return String(roh || '')
    .replace(/[·•]/g, ' – ')          // Mittelpunkt ist immer ein Trenner
    .replace(/\s+[–—]\s+/g, ' – ')    // Halbgeviert/Geviert MIT Leerzeichen = Trenner
    .replace(/\s+-\s+/g, ' – ')       // Bindestrich MIT Leerzeichen = Trenner
    .replace(/\s+/g, ' ')
    .trim();
}

/** Auf n Zeichen kürzen, an der Wortgrenze, ohne hängendes Trennzeichen. */
export function kuerzen(s, n) {
  s = String(s || '');
  if (s.length <= n) return s;
  let t = s.slice(0, n - 1).replace(/\s+\S*$/, '');
  t = t.replace(/[\s|·–—,:;.-]+$/, '');            // kein hängendes Trennzeichen vor dem Auslassungszeichen
  return (t || s.slice(0, n - 1)) + '…';
}

/**
 * @returns {{title: string, description: string}}
 */
export function seoTitel(roh) {
  const basis = titelNormalisieren(roh);
  if (!basis) return { title: '', description: '' };
  // Marke nur, wenn sie ganz hineinpasst — sonst lieber ein sauber gekürzter Titel ohne Marke
  const title = (basis.length + MARKE.length <= MAX_TITEL)
    ? basis + MARKE
    : kuerzen(basis, MAX_TITEL);
  const description = kuerzen(
    `${basis} bei LuxeStyle – Schweizer Online-Shop. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. `
    + `Jetzt –10% mit Code WELCOME10.`, MAX_BESCHREIBUNG);
  return { title, description };
}

/**
 * Fehlt an diesem Produkt wirklich ein SEO-Feld?
 *
 * WARUM (am 2026-10-23 am Live-Shop gemessen): Shopify speichert einen SEO-Titel NICHT, der Wort
 * fuer Wort dem Produkttitel entspricht — `seo.title` bleibt `null`, und die Seite traegt ohnehin
 * genau diesen Titel. Genau das erzeugt `seoTitel` fuer jeden Produkttitel, der zu lang fuer die
 * Marke und zu kurz fuers Kuerzen ist: dann kommt der Titel unveraendert zurueck. Ein Lauf, der
 * nur `!seo.title` prueft, meldet diese Produkte bei JEDEM Lauf als offen und verbraucht jedes Mal
 * eine Schreib-Abfrage, die nichts aendert. Belegt am Produkt „Relaxed-Fit Hoodie «Cosy» – mit
 * Fell-Panel & Kordelzug" (54 Zeichen): Beschreibung gesetzt, `seo.title` nach dem Schreiben null.
 *
 * Dieselbe Fehlerklasse wie der stille Skip, nur umgekehrt: ein stiller ERFOLG sieht aus wie eine
 * Luecke. Darum gilt `null` als „wie der Produkttitel", sobald genau das erzeugt wuerde.
 */
export function seoOffen(produktTitel, seo) {
  const erzeugt = seoTitel(produktTitel);
  if (!erzeugt.title && !erzeugt.description) return false;   // es gibt nichts zu setzen
  if (!seo?.description) return true;                         // Beschreibung fehlt — nachtragen
  if (seo?.title) return false;                               // beides da
  return erzeugt.title !== produktTitel;                      // null = wie der Produkttitel
}

/**
 * Nur die FEHLENDEN SEO-Felder zurueckgeben — niemals einen vorhandenen Wert.
 *
 * Der Grund stammt aus ChatGPTs Entwurf #2694 („preserve existing metadata") und ist echt:
 * `seoOffen` meldet ein Produkt auch dann als offen, wenn nur die BESCHREIBUNG fehlt
 * (Zeile „Beschreibung fehlt — nachtragen"). Der Lauf sendete danach `seoTitel(titel)`
 * vollstaendig, also auch den Titel — und haette damit einen vorhandenen, von Hand
 * geschriebenen Keyword-Titel durch den erzeugten Standardtitel ersetzt. Genau das darf
 * nicht passieren: CLAUDE.md haelt fuer die 164 handgeschriebenen Titel ausdruecklich fest,
 * dass sie besser sind und unangetastet bleiben, „der Optimizer fuellt nur fehlende".
 *
 * Gemessen am 24.10.2026 ueber 5000 aktive Produkte (3000 aelteste nach CREATED_AT,
 * 2000 nach UPDATED_AT): 1 offenes Produkt, **0 im Risikofall** — heute gibt es also keinen
 * Altschaden. Die Luecke war ein Fehler im Code, kein Schaden im Katalog; sie haette erst
 * beim naechsten Produkt mit eigenem Titel ohne Beschreibung zugeschlagen.
 *
 * Gibt {} zurueck, wenn nichts zu setzen ist — der Aufrufer schreibt dann nicht.
 */
export function seoNachtrag(produktTitel, seo) {
  const erzeugt = seoTitel(produktTitel);
  const patch = {};
  // Ein vorhandener Titel bleibt stehen. `null`/leer gilt als fehlend.
  // Und ein Vorschlag, der dem Produkttitel GLEICHT, gehoert nicht in den Patch: Shopify
  // speichert ihn nicht (siehe `seoOffen`), die Schreib-Abfrage waere umsonst. Gefunden hat
  // das die Gegenprobe des Tests, nicht der Haupttest.
  if (!seo?.title && erzeugt.title && erzeugt.title !== produktTitel) patch.title = erzeugt.title;
  if (!seo?.description && erzeugt.description) patch.description = erzeugt.description;
  return patch;
}
