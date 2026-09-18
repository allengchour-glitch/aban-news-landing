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
  // ⚠️ 17.09.2026, zweiter Akt: Auftrag 18 lief gegen BigBuy und bekam Cloudflares
  // DEUTSCHE Fassung — «Sicherheitsüberprüfung wird durchgeführt». Die stand hier nicht,
  // also meldete die Quittung «ok» fuer eine Seite mit null Formularfeldern. Und schlimmer:
  // dieselbe Wand hatte kurz vorher «BigBuy angemeldet: true» erzeugt, weil sie weder
  // Anmeldemaske noch Gastgeberwechsel ist. **Eine Musterliste ist nur so gut wie ihre
  // Sprachen** — wer sie in EINER Sprache pflegt, hat eine Wache fuer EINE Sprache.
  /Sicherheits(überprüfung|prüfung|check)/i,
  /vor böswilligen Bots/i,
  /Ray ID:/i,
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


/* ───────────────────────────────────────────────────────────────────────────────
 * VIERTE SCHICHT: der HTTP-Status — und die Fehlerseite, die 200 liefert.
 *
 * ⚠️ GEMESSEN 18.09.2026 an Auftrag 32, und es ist genau dieselbe Familie wie die
 * Einwilligungswand vom 17.09.: Der Befund fuer CJdropshipping lautete
 * **`angemeldet: true`** — bei der Endadresse **`https://cjdropshipping.com/404`**.
 *
 * Jede der drei bestehenden Schichten hatte recht und war nutzlos:
 *   - `ist_anmeldeseite` sah keine Anmeldemaske. Eine 404-Seite hat naemlich keine.
 *   - `hat_ziel_erreicht` sah keinen Gastgeberwechsel. cjdropshipping.com ->
 *     cjdropshipping.com ist derselbe Gastgeber; die 404 liegt INNERHALB des Ziels.
 *   - `ist_wandtext` sah keine Bot-Wand. War auch keine.
 * Und die eindeutigste Aussage von allen — die, die der Server selbst mitschickt —
 * wurde von keiner gelesen: `grep -nE "status\(\)|\.status" ` ueber Melder, Pruefskript
 * und Runner gab **0 Treffer**.
 *
 * **Die Abwesenheit eines bekannten Fehlers ist kein Beweis fuer Erfolg.** Drei
 * Schichten, die je eine Art des Scheiterns kennen, melden gemeinsam «alles gut»,
 * sobald es auf eine vierte Art scheitert.
 *
 * Zwei Erkennungen, weil eine nicht genuegt:
 *  (1) der Statuscode — 404/403/410/5xx sind unmissverstaendlich;
 *  (2) das ADRESSMUSTER — moderne Einzelseiten-Anwendungen (CJ ist eine) leiten
 *      intern auf `/404` um und antworten dabei mit **200**. Wer nur den Status
 *      prueft, haelt genau diesen Fall fuer eine gesunde Seite.
 *
 * Und weil Muster in diesem Projekt schon mehrfach zu breit waren («schleif» traf
 * «Schleife», «rock» traf «GT Line ROCK», «IPL» traf «L-IPL-iner»): `/404` wird nur
 * als eigenes Pfadsegment erkannt. Ein Produkt `…/lampe-404-lumen` oder eine
 * Kollektion `…/artikel-4040` ist eine gesunde Seite und muss durchgehen.
 */
export const FEHLER_STATUS = new Set([400, 401, 403, 404, 405, 408, 410, 429,
                                      500, 502, 503, 504]);

/** `/404` (oder /500, /403 …) als eigenes Pfadsegment — nicht mitten in einem Wort. */
export function ist_fehler_adresse(url) {
  if (typeof url !== 'string' || !url) return false;
  let pfad;
  try { pfad = new URL(url).pathname; } catch { return false; }
  // Segmente einzeln pruefen: "404" ja, "lampe-404-lumen" nein, "4040" nein.
  return pfad.split('/').some(s => /^(40[0-9]|41[0-9]|429|50[0-9])$/.test(s))
      || /^\/(error|not-?found|fehler)$/i.test(pfad);
}

/**
 * Sagt, ob die Seite ueberhaupt eine Seite ist.
 * Rueckgabe: null = unauffaellig · sonst ein Grund als Text.
 * `status` darf fehlen (Playwright gibt bei manchen Navigationen keine Antwort) —
 * dann wird das GESAGT und nicht als in Ordnung verbucht.
 */
export function ist_fehlerseite(status, url) {
  if (ist_fehler_adresse(url)) return `Fehlerseite (Adresse endet auf ein Fehler-Segment: ${url})`;
  if (status === null || status === undefined) return null;   // unbekannt ist kein Befund, aber auch kein Freispruch
  if (typeof status !== 'number') return null;
  if (FEHLER_STATUS.has(status) || status >= 500) return `HTTP ${status}`;
  return null;
}
