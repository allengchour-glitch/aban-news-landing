// publish_at.mjs — EIN Ort für den Sendetermin der Metricool-Poster (18.10.2026, 7-Tage-Vorlauf).
//
// Ohne Umgebungsvariable PUBLISH_AT verhält sich jeder Poster wie bisher (Termin = jetzt + Vorlauf). Mit PUBLISH_AT=<ISO-UTC>
// (z. B. 2026-10-22T08:05:00Z) plant er genau zu diesem Zeitpunkt — alle Wachen des Posters (Lock, Ledger, Produkt ACTIVE, Preis,
// Jury, Familie, Pause) bleiben unverändert, weil der Treiber `automation/social_vorlauf.py` den Poster als Unterprozess startet.
// Gültig: ≥ jetzt + 3 Minuten und ≤ jetzt + 14 Tage (Metricool-Planer; weiter voraus ist ungemessen). Sonst Exit 1 — nie still «jetzt».
// Zeitzonen-Falle: PUBLISH_AT ist IMMER UTC. Zürcher Sommerzeit endet am 25.10.2026 03:00 → 02:00 (01:00 UTC); der Treiber legt in diese
// Stunde keine Slots.
export function publishAt(vorlaufMs) {
  const roh = (process.env.PUBLISH_AT || '').trim();
  if ('PUBLISH_AT' in process.env && !roh) { console.error('PUBLISH_AT ist gesetzt, aber leer → kein Post (nie still «jetzt»)'); process.exit(1); }
  if (!roh) return new Date(Date.now() + vorlaufMs);
  const t = Date.parse(/Z$|[+-]\d\d:?\d\d$/.test(roh) ? roh : roh + 'Z');
  if (!Number.isFinite(t)) { console.error(`PUBLISH_AT «${roh}» ist keine Zeit (erwartet ISO-UTC, z. B. 2026-10-22T08:05:00Z)`); process.exit(1); }
  const jetzt = Date.now();
  if (t < jetzt + 3 * 60e3) { console.error(`PUBLISH_AT ${roh} liegt weniger als 3 Minuten voraus (oder in der Vergangenheit) → kein Post`); process.exit(1); }
  if (t > jetzt + 14 * 86400e3) { console.error(`PUBLISH_AT ${roh} liegt mehr als 14 Tage voraus → kein Post`); process.exit(1); }
  return new Date(t);
}
