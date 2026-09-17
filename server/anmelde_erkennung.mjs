/**
 * anmelde_erkennung.mjs — erkennt, ob eine URL eine ANMELDESEITE ist.
 *
 * Eigenes Modul, damit es diese Regel genau EINMAL gibt: der Auftrags-Runner
 * braucht sie (sonst liefert ein Merchant-Auftrag stolz einen Screenshot der
 * Login-Maske), und die Browser-Skripte brauchen sie auch. Zwei Kopien laufen
 * garantiert auseinander.
 *
 * Konservativ: schlaegt nur an, wenn die ENDGUELTIGE URL wie eine Anmeldung
 * aussieht. Lieber ein verpasster Fall als ein falscher Alarm, der ein echtes
 * Ergebnis als «nicht angemeldet» abtut.
 *
 * ⚠️ Gegenprobe ist Pflicht (Hausregel): der Melder muss beide Antworten koennen.
 * Testfaelle stehen in `server/anmelde_erkennung.test.mjs` — darunter der Koeder
 * `/collections/login-armband`, der NICHT anschlagen darf.
 */
export const LOGIN_MUSTER = [
  /^https:\/\/accounts\.google\.com\//i,
  /^https:\/\/accounts\.shopify\.com\//i,
  /^https:\/\/[^/]*\.myshopify\.com\/admin\/auth/i,
  /^https:\/\/www\.tiktok\.com\/login/i,
  /^https:\/\/[^/]*\.pinterest\.[a-z.]+\/login/i,
  /^https:\/\/[^/]*\.facebook\.com\/(login|checkpoint)/i,
  /^https:\/\/[^/]*\bbigbuy\.eu\/[a-z-]*\/?(login|customer\/account\/login)/i,
  /^https:\/\/[^/]*\/(users\/)?(sign_?in|log_?in|login)(\?|$|\/)/i,
];

export function ist_anmeldeseite(url) {
  return LOGIN_MUSTER.some(r => r.test(url || ''));
}
