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

/**
 * ── Zweite, UNABHAENGIGE Frage (17.09.2026, nach zwei Fehlalarmen) ──────────
 *
 * `ist_anmeldeseite` beantwortet «ist das eine Anmeldemaske?». Gebraucht wird aber
 * «bin ich dort angekommen, wo ich hinwollte?». Das sind zwei Fragen, und die
 * erste allein hat zweimal Erfolg gemeldet, wo keiner war:
 *
 *   Auftrag 03: angefragt admin.shopify.com/.../marketing, gelandet auf einer
 *               Bot-Pruefseite («Deine Verbindung muss verifiziert werden»)   -> «ok»
 *   Auftrag 06: angefragt merchants.google.com/mc/products/diagnostics,
 *               gelandet auf consent.google.com mit «Sign in» oben rechts
 *               -> «angemeldet: true», obwohl das Konto NICHT angemeldet ist.
 *
 * Beide Seiten sind keine Anmeldemasken — der Melder hatte also recht und lag
 * trotzdem falsch. Deshalb hier eine Pruefung, die einen ANDEREN Massstab anlegt:
 * den angefragten Gastgeber. Wechselt er, ist das Ziel nicht erreicht, egal wie
 * die Seite aussieht.
 */
export const ZWISCHENSEITEN = [
  /^https:\/\/consent\.(google|youtube)\.[a-z.]+\//i,   // Googles Einwilligungswand
  /^https:\/\/[^/]*\/sorry\//i,                        // Googles Drosselseite
  /\b(captcha|challenge|checkpoint|verify)\b/i,          // Bot-Pruefungen aller Art
];

export function ist_zwischenseite(url) {
  return ZWISCHENSEITEN.some(r => r.test(url || ''));
}

/** Registrierbarer Gastgeber, also «pinterest.com» aus «ch.pinterest.com». */
function grundhost(url) {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    const t = h.split('.');
    // Zweistufige Endungen (co.uk) beruehren uns hier nicht — alle geprueften
    // Dienste liegen auf einstufigen. Lieber schlicht als scheingenau.
    return t.length > 2 ? t.slice(-2).join('.') : h;
  } catch { return ''; }
}

/**
 * true = die Seite, die wir wollten, ist wirklich da.
 *
 * Bewusst grosszuegig beim Gastgeber (ch.pinterest.com zaehlt als pinterest.com,
 * admin.shopify.com als shopify.com) und bewusst streng bei Zwischenseiten: eine
 * Einwilligungswand auf demselben Gastgeber ist trotzdem nicht das Ziel.
 */
/**
 * Gastgeber, die derselbe Dienst sind. AUSDRUECKLICH aufgezaehlt, nicht geraten:
 * Shopify leitet jeden Laden planmaessig von <laden>.myshopify.com nach
 * admin.shopify.com um — das ist kein Abweichen vom Ziel, sondern der Weg dorthin.
 * Eine unscharfe Regel («Name enthaelt shopify») wuerde hier zwar auch passen und
 * spaeter etwas durchlassen, das nur so heisst. Lieber eine Liste, die man liest.
 */
export const VERWANDTE = [
  new Set(['shopify.com', 'myshopify.com']),
  // Pinterest leitet jedes Land auf <land>.pinterest.com um — gemessen 17.09.:
  // aus www.pinterest.ch wurde ch.pinterest.com. Auch das ist der Weg, nicht das Abweichen.
  new Set(['pinterest.com', 'pinterest.ch', 'pinterest.de', 'pinterest.at']),
];
// (merchants.google.com braucht keinen Eintrag — grundhost() kuerzt es ohnehin auf
//  google.com, genau wie consent.google.com. Der Unterschied wird dort ueber
//  ist_zwischenseite() gemacht, nicht ueber den Gastgeber.)

export function hat_ziel_erreicht(gefragt, gelandet) {
  if (!gelandet) return false;
  if (ist_anmeldeseite(gelandet) || ist_zwischenseite(gelandet)) return false;
  const a = grundhost(gefragt), b = grundhost(gelandet);
  if (!a || !b) return false;
  if (a === b) return true;
  return VERWANDTE.some(g => g.has(a) && g.has(b));
}

/**
 * ── Dritte Schicht: die Bot-Wand, die die URL NICHT verraet (17.09.2026) ────
 *
 * Auftrag 09 war die Gegenprobe zu Auftrag 03 — mit der neuen Ziel-Pruefung. Sie
 * meldete wieder «ok», und diesmal zu Recht nach ihren eigenen Massstaeben: die
 * Endadresse war unveraendert `admin.shopify.com/store/.../marketing`, kein
 * Gastgeberwechsel, keine Anmeldemaske. Im Screenshot stand trotzdem nur eine
 * Cloudflare-Wand: «Deine Verbindung muss verifiziert werden».
 *
 * Eine URL-Pruefung kann das GRUNDSAETZLICH nicht sehen — die Wand behaelt die
 * Adresse. Wer nur die Adresse liest, wird sie nie finden, egal wie gut die Regel
 * ist. Deshalb eine Pruefung mit einem anderen Sinnesorgan: dem Seitentext.
 */
export const WAND_TEXTE = [
  /Verbindung muss verifiziert werden/i,
  /Bestätigen Sie, dass Sie ein Mensch sind/i,
  /(checking|verifying) (if )?you are (a )?human/i,
  /just a moment/i,
  /enable javascript and cookies to continue/i,
  /unusual traffic from your computer network/i,
];

/** true = das ist eine Wand, kein Inhalt. Nur bei KURZEN Seiten pruefen. */
export function ist_wandtext(text) {
  const t = (text || '').trim();
  // ⚠️ Nur kurze Seiten: sonst wuerde ein Blogartikel ueber Captchas als Wand gelten.
  // Echte Wandseiten haben ein paar Hundert Zeichen, echte Seiten Tausende.
  if (t.length > 1200) return false;
  return WAND_TEXTE.some(r => r.test(t));
}

