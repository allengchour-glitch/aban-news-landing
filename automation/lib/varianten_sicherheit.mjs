/**
 * Sicherheitsregeln des Varianten-Nachziehens (cj_varianten_nachziehen.mjs). Rein, getestet, kein Netz.
 *
 * 1) ledgerGedaechtnis: welche Handles ein Lauf NICHT erneut anfasst.
 *    WARUM (26.10.2026, Prüfung des Nacht-Workflows): Ein Überspringer ohne Ledger-Zeile stand in jedem Stapel wieder vorn und zählte gegen
 *    LIMIT. Mit 40 solchen Produkten pro Scheibe dreht sich der Lauf im Kreis (jede Runde kostet CJ-Abfragen und -Punkte), ohne je
 *    ein neues Produkt zu erreichen. Darum bekommt JEDER Ausgang eine Ledger-Zeile:
 *      GESCHRIEBEN                        für immer erledigt
 *      UEBERSPRUNGEN (endgültiger Grund)  14 Tage Ruhe («CJ führt nur eine Variante» ändert sich nicht)
 *      UEBERSPRUNGEN · zurückgestellt: …  7 Tage Ruhe: Gründe, die sich nicht von selbst ändern («unsicher übersetzt», «viele Varianten», «Auswahl nicht
 *                                         baubar», «nur N lieferbare Variante(n)»). Jeder Wiederholungsversuch kostet CJ-Punkte (Produktabfrage + Fracht), und
 *                                         CJ-Punkte sind knapp: ein Produkt, das gestern an «Retro Gold» unverändert scheiterte, scheitert heute wieder.
 *      UEBERSPRUNGEN · vorläufig: …       20 Stunden Ruhe: vorübergehende Gründe («seit dem Plan verändert»): im selben Lauf (höchstens 6 h) nie doppelt,
 *                                         in der nächsten Nacht wieder
 *      SKU_GESETZT                        14 Tage Ruhe (nur die SKU der Standardvariante wurde auf die CJ-Variantennummer gesetzt; der Zustand selbst verhindert eine Wiederholung. Bewusst
 *                                         NICHT «GESCHRIEBEN»: Abgleich, Fortschritt und Nachtbericht zählen das als Auswahl-Bau, und kommen später echte Varianten dazu, soll das Produkt wieder drankommen)
 *      FEHLER                             20 Stunden Ruhe (ein dauerhaft scheiternder Schreibversuch wird nicht in jeder Runde wiederholt)
 *    FORCE hebt alles ausser GESCHRIEBEN auf.
 *
 * 2) veraendertSeitPlan: productSet ersetzt Beschreibung, Tags und die ganze Bildergalerie durch den Stand des Plans. Hat eine andere
 *    Sitzung (Text-Lauf, Kategorie-Tags, neue Bilder) das Produkt seit dem Plan verändert, würde das stillschweigend überschrieben.
 *    Der Plan kann bis zu 3 Stunden alt sein (Weiterverwendung aus dem Trockenlauf). Darum wird unmittelbar vor dem Schreiben frisch gelesen.
 */
export const VORLAEUFIG = 'vorläufig';
export const ZURUECKGESTELLT = 'zurückgestellt';
export const VORLAEUFIG_MS = 20 * 3600 * 1000;
export const ZURUECKGESTELLT_MS = 7 * 24 * 3600 * 1000;
export const ENDGUELTIG_MS = 14 * 24 * 3600 * 1000;

export function ledgerGedaechtnis(text, { jetzt = Date.now(), force = false } = {}) {
  const erledigt = new Set();
  for (const z of String(text || '').split('\n')) {
    const [h, zeit, e, grund = ''] = z.split('·').map(s => s.trim());
    if (!h) continue;
    if (e === 'GESCHRIEBEN') { erledigt.add(h); continue; }
    if (force) continue;
    const alter = jetzt - Date.parse(zeit);   // ungültiges Datum → NaN → nicht erledigt (im Zweifel erneut versuchen)
    if (e === 'UEBERSPRUNGEN') {
      const frist = grund.startsWith(VORLAEUFIG) ? VORLAEUFIG_MS : grund.startsWith(ZURUECKGESTELLT) ? ZURUECKGESTELLT_MS : ENDGUELTIG_MS;
      if (alter < frist) erledigt.add(h);
    } else if (e === 'SKU_GESETZT') { if (alter < ENDGUELTIG_MS) erledigt.add(h); }
    else if (e === 'FEHLER' && alter < VORLAEUFIG_MS) erledigt.add(h);
  }
  return erledigt;
}

/** Frische Abfrage unmittelbar vor productSet (eine Abfrage je Produkt). */
export const FRISCH = `query($id:ID!){product(id:$id){updatedAt descriptionHtml tags variantsCount{count} media(first:100){nodes{id status}}}}`;

/** '' = unverändert (schreiben), sonst der Grund, warum nicht geschrieben wird. */
export function veraendertSeitPlan(plan, frisch) {
  if (!frisch) return 'Produkt nicht mehr da';
  const n = frisch.variantsCount?.count;
  if (n !== 1) return `inzwischen ${n} Varianten`;
  // Der Zeitstempel fängt ALLES ab, was die Einzelprüfungen unten nicht sehen (Preis, Kosten, SKU, Metafelder): productSet setzt Preis und Kosten der neuen
  // Varianten aus dem Plan; hätte eine andere Sitzung den Preis seither erhöht, würde der alte Preis zurückgeschrieben. Pläne aus der Zeit vor dem Feld haben keinen.
  if (plan.updatedAt && frisch.updatedAt && plan.updatedAt !== frisch.updatedAt) return 'Produkt inzwischen geändert (updatedAt)';
  if (String(frisch.descriptionHtml ?? '') !== String(plan.beschreibungHtml ?? '')) return 'Beschreibung inzwischen geändert';
  const tags = l => [...(l || [])].sort().join('\u0001');
  if (tags(frisch.tags) !== tags(plan.tags)) return 'Tags inzwischen geändert';
  // `files` definiert beim Schreiben die ganze Galerie: ein Medium, das der Plan nicht kennt, ginge verloren.
  const bekannt = new Set(plan.medienIds || []);
  const neu = (frisch.media?.nodes || []).filter(m => m.status === 'READY' && !bekannt.has(m.id));
  if (neu.length) return `${neu.length} Medium/Medien inzwischen hinzugekommen`;
  // Umgekehrt: nennt `files` ein Bild, das es nicht mehr gibt, scheitert das Schreiben oder hängt ein bewusst gelöschtes Bild wieder an.
  const da = new Set((frisch.media?.nodes || []).map(m => m.id));
  const weg = [...bekannt].filter(id => !da.has(id));
  if (weg.length) return `${weg.length} Medium/Medien inzwischen entfernt`;
  return '';
}

/**
 * Ist MEHR ALS DIE HÄLFTE der Variantenbilder unlesbar (Download oder ffmpeg gescheitert)? Dann nicht schreiben: setInput() lässt unlesbare Bilder weg, und der Marker
 * im Text hielte das Produkt danach für immer aus der Kandidatenliste — die Varianten blieben für immer ohne eigenes Bild (Prüfung 26.10.2026).
 * Ein einzelner toter CJ-Bildlink unter mehreren guten ist normal und verhindert das Schreiben nicht.
 */
export function bilderUnbrauchbar(plan) {
  const b = plan?.bilder; if (!b) return false;
  const unlesbar = b.unlesbar || 0, gesamt = (b.zugeordnet || 0) + (b.neuHochzuladen || 0) + unlesbar;
  return unlesbar > 0 && unlesbar * 2 > gesamt;
}
