/**
 * Explizite Freigabe fuer alte CJ-Importer.
 *
 * LIVE=1 ist zwingend. DRY=1 bleibt auch dann eine zusaetzliche Schreibsperre.
 */
export function importModus(env = {}) {
  const live = env.LIVE === '1';
  const trockenlauf = env.DRY === '1';
  return Object.freeze({ live, trockenlauf, schreiben: live && !trockenlauf });
}
