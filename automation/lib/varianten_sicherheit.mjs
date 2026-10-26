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
    } else if (e === 'FEHLER' && alter < VORLAEUFIG_MS) erledigt.add(h);
  }
  return erledigt;
}

/** Frische Abfrage unmittelbar vor productSet (eine Abfrage je Produkt). */
export const FRISCH = `query($id:ID!){product(id:$id){descriptionHtml tags variantsCount{count} media(first:100){nodes{id status}}}}`;

/** '' = unverändert (schreiben), sonst der Grund, warum nicht geschrieben wird. */
export function veraendertSeitPlan(plan, frisch) {
  if (!frisch) return 'Produkt nicht mehr da';
  const n = frisch.variantsCount?.count;
  if (n !== 1) return `inzwischen ${n} Varianten`;
  if (String(frisch.descriptionHtml ?? '') !== String(plan.beschreibungHtml ?? '')) return 'Beschreibung inzwischen geändert';
  const tags = l => [...(l || [])].sort().join('\u0001');
  if (tags(frisch.tags) !== tags(plan.tags)) return 'Tags inzwischen geändert';
  // `files` definiert beim Schreiben die ganze Galerie: ein Medium, das der Plan nicht kennt, ginge verloren.
  const bekannt = new Set(plan.medienIds || []);
  const neu = (frisch.media?.nodes || []).filter(m => m.status === 'READY' && !bekannt.has(m.id));
  if (neu.length) return `${neu.length} Medium/Medien inzwischen hinzugekommen`;
  return '';
}
