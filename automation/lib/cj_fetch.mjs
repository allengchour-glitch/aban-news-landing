/**
 * CJ-Abfrage mit Geduld: wartet bei Drosselung, statt das Produkt als Fehler abzuhaken.
 *
 * WARUM (gemessen 2026-10-17 abends): ein Lauf `QUERY="tag:gadgets AND tag:cj-real"` meldete
 * 45 Fehler, davon 36 `CJ_HTTP: HTTP 429`. `cjGet()` hatte keine einzige Wiederholung — CJ
 * erlaubt nur ~1 Abfrage je Sekunde, und die Pause von 1100 ms stand NACH dem Aufruf. Jeder
 * 429 verbrannte damit ein Produkt, ohne dass es je geprueft wurde. Dieselbe Fehlerklasse wie
 * bei den acht Shopify-Waechtern (automation/lib/shopify_gql.mjs) und bei site-health
 * (automation/lib/url_status.mjs): HTTP 429 ist keine Antwort, sondern eine Bitte zu warten.
 *
 * GEGENPROBE, die hier wichtiger ist als die Wiederholung selbst: erschoepfte Tagespunkte und
 * echte API-Fehler muessen SOFORT fliegen. Wer sie in eine Warteschleife steckt, erzeugt wieder
 * den teuren Fehlschluss „CJ hat keine Kommentare" (siehe dropship/CJ-REVIEWS-QUOTE-1710.md).
 *
 * Haelt die Drosselung durch, wird CJ_THROTTLED geworfen — ein eigener Grund, damit der Aufrufer
 * den Lauf beenden kann, statt hundert Produkte als „Fehler" durchzureichen.
 */
import { assertCjSuccess } from './cj_response.mjs';

const QUOTA = /insufficient api points|daily.*(?:quota|limit)|points.*exhaust/i;

/**
 * WEICHE CODES (gemessen 2026-10-18 direkt an der CJ-API):
 *   1602001 „Product not found"                        → diese Strategie trifft nicht
 *   1602002 „Product has been removed from shelves"    → Produkt ausgelistet
 *   1602003 „Variant has been removed from shelves"    → Variante ausgelistet
 * Das sind ANTWORTEN, keine Fehler. Wer sie fliegen laesst, bricht die Strategie-Kette im
 * Resolver beim ersten Versuch ab und haelt ein ausgelistetes Produkt fuer unlesbar — obwohl
 * `product/productComments` fuer genau diese pid weiter mit code 200 antwortet (nachgeprueft an
 * pid 2038889763034939394). Dieselbe Fehlerklasse wie „HTTP 429 ist nicht 404": eine nicht
 * fatale Antwort als fatal behandeln. Alles andere bleibt hart.
 */
export const WEICHE_CODES = [1602001, 1602002, 1602003];
/** Zeitlimit je CJ-Versuch (opt.timeoutMs überschreibt). SETZUNG: die langsamste gemessene Antwort (Fracht) kam nach wenigen Sekunden. */
export const CJ_ZEITLIMIT_MS = 60000;

export async function cjFetch(url, opt = {}) {
  const context = opt.context || 'CJ';
  const versuche = opt.versuche ?? 5;
  const basis = opt.basisMs ?? Number(process.env.CJ_BACKOFF_MS ?? 2000);   // CJ_BACKOFF_MS nur in Tests (0)
  const fetchFn = opt.fetch ?? fetch;
  const warte = opt.warte ?? (ms => new Promise(r => setTimeout(r, ms)));
  const init = { headers: opt.headers || {}, ...(opt.init || {}) };
  let letzter = '';
  for (let i = 0; i < versuche; i++) {
    let r;
    try {
      // Ohne eigenes Zeitlimit hängt ein stehengebliebener CJ-Aufruf bis zum Standard von undici (5 Minuten je Versuch, bis zu 5 Versuche); die Shopify-Seite hat 30 s (shopify_gql.mjs).
      // Jeder Versuch bekommt sein EIGENES Signal (ein abgelaufenes darf den nächsten nicht sofort abbrechen); ein vom Aufrufer mitgegebenes `init.signal` gilt unverändert.
      r = await fetchFn(url, init.signal || typeof AbortSignal?.timeout !== 'function' ? init : { ...init, signal: AbortSignal.timeout(opt.timeoutMs ?? CJ_ZEITLIMIT_MS) });
    } catch (e) {                                  // Netzfehler: auch das ist ein Warte-Fall
      letzter = 'Netzfehler: ' + e.message;
      if (i + 1 < versuche) { await warte(basis * 2 ** i); continue; }
      throw new Error(`CJ_NETZ: ${letzter} (${context})`);
    }
    let body;
    try { body = await r.json(); } catch { body = null; }
    // Punkte zuerst: CJ meldet das teils MIT 429. Ein Wartefall ist es nicht — morgen erst wieder.
    if (QUOTA.test(String(body?.message || ''))) {
      throw new Error(`CJ_QUOTA: Tagespunkte erschöpft (${context})`);
    }
    if (r.status === 429 || r.status >= 500) {
      letzter = `HTTP ${r.status}`;
      if (i + 1 < versuche) { await warte(basis * 2 ** i); continue; }
      throw new Error(`CJ_THROTTLED: ${letzter} bleibt bestehen (${context})`);
    }
    if (body === null) throw new Error(`CJ_JSON: Antwort nicht lesbar, HTTP ${r.status} (${context})`);
    // Weiche Antwort: der Aufrufer entscheidet (naechste Strategie, pid trotzdem nutzen).
    // Nur wenn er sie ausdruecklich angefordert hat — sonst bleibt alles hart wie bisher.
    const weich = opt.weicheCodes || [];
    if (weich.length && body.result !== true && weich.includes(Number(body.code))) return body;
    return assertCjSuccess(body, r.status, context, { ohneResult: opt.erfolgOhneResult === true });   // echte Fehler fliegen hier unveraendert (erfolgOhneResult: nur getInventoryByPid)
  }
  throw new Error(`CJ_THROTTLED: ${letzter} (${context})`);
}
