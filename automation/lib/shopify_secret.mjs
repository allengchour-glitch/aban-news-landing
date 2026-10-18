/**
 * Shopify-Client-Secret aus der Umgebung holen — robust gegen vertauschte Env-Felder.
 *
 * WARUM DAS NOETIG IST (gemessen 2026-10-17):
 * In der Umgebung des Users sind Name und Wert mancher Variablen vertauscht angelegt
 * (Notiz vom 04.10. in CLAUDE.md). SHOPIFY_CLIENT_SECRET kommt dadurch als
 *   "shpss_<32 hex>=SHOPIFY_CLIENT_SECRET"   (60 Zeichen)
 * an statt als nackte 38 Zeichen. Der Client-Credentials-Grant antwortet darauf mit
 * HTTP 400 — und weil fast jedes Skript den Fehler zu einem stillen „Keine Shopify-Creds
 * → No-op" macht, sieht ein kaputtes Geheimnis genauso aus wie ein fehlendes.
 * Dieselbe Fehlerklasse wie der apiKey/password-Auth-Bug und der pid-SKU-Skip:
 * EIN STUMMER SKIP SIEHT AUS WIE „KEINE DATEN".
 *
 * Diese Funktion schneidet deshalb das echte Geheimnis heraus, wenn der Wert laenger ist
 * als ein Shopify-Secret sein kann. In einer saubereren Umgebung (exakt 38 Zeichen)
 * aendert sie nichts — sie ist in beiden Faellen richtig.
 */
export function shopifyClientSecret(roh = process.env.SHOPIFY_CLIENT_SECRET) {
  const s = String(roh || '').trim();
  const m = s.match(/^shpss_[0-9a-f]{32}/);
  return m ? m[0] : s;
}
