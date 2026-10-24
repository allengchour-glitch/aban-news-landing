/**
 * Shopify-GraphQL mit Geduld: wartet bei Drosselung, statt aufzugeben.
 *
 * WARUM (gemessen 2026-10-17): Die acht Wächter (alt_text_guard, publish_guard, price_guard,
 * rating_guard, link_guard, hero_image_guard, discount_guard, cross_sell) hatten alle denselben
 * `gql()`-Block — ohne jede Wiederholung. Ein `SCAN=3000`-Lauf des alt_text_guard brach nach
 * wenigen Seiten mit `{"message":"Throttled"}` ab und schrieb KEINEN einzigen Alt-Text.
 * Shopifys Punkte-Eimer füllt sich laufend wieder auf — kurz warten genügt.
 *
 * Ebenfalls behandelt: HTTP 429 und 5xx (Shopify-Seite). Alles andere wird wie bisher geworfen,
 * damit echte Fehler (falsches Feld, fehlendes Recht) NICHT in einer Warteschleife verschwinden.
 */
import { normalizeShopifyHost } from './shopify_host.mjs';
const DROSSEL = /throttled|exceeded.*cost|rate limit/i;

/**
 * Selbst-Takt: wie lange warten, damit der naechste gleich teure Aufruf wieder hineinpasst?
 *
 * WARUM (gemessen 2026-10-18 am echten Shop): Shopify fuehrt einen Punkte-Eimer — 2000 Punkte,
 * 100 Punkte/s fliessen nach, eine Produktseite mit `first:50` kostet 51. Ein Massenlauf leert
 * den Eimer in Sekunden und arbeitet danach am Rand. Dort hilft die wachsende Pause oben nicht
 * mehr zuverlaessig, weil der naechste Aufruf den gerade nachgefuellten Rest sofort wieder
 * aufbraucht: der fuenfte SEO-Lauf desselben Abends endete so nach 680 von 5000 Titeln mit
 * „Throttled", obwohl die Wiederholung eingebaut war. Shopify sagt in jeder Antwort selbst,
 * wie voll der Eimer ist — danach takten ist genauer als raten.
 *
 * Unbekannt ist KEIN Befund (Lehre aus url_status.mjs): fehlt `extensions.cost`, nennt Shopify
 * keine Restorerate oder ist sie 0, wird NICHT gewartet, statt eine Zahl zu erfinden.
 */
export function taktPause(j, opt = {}) {
  const kosten = j?.extensions?.cost?.requestedQueryCost;
  const t = j?.extensions?.cost?.throttleStatus;
  if (typeof kosten !== 'number' || kosten <= 0 || !t) return 0;
  const frei = t.currentlyAvailable, rate = t.restoreRate;
  if (typeof frei !== 'number' || typeof rate !== 'number' || rate <= 0) return 0;
  if (frei >= kosten) return 0;                       // passt noch — nicht bremsen
  const ms = Math.ceil(((kosten - frei) / rate) * 1000);
  return Math.min(ms, opt.maxPauseMs ?? 10000);       // Deckel: nie unbegrenzt stehen bleiben
}

export async function shopifyGql(shop, api, token, query, variables, opt = {}) {
  shop=normalizeShopifyHost(shop);
  if (!shop) throw new Error('SHOPIFY_HOST: Shop-Domain fehlt');
  const versuche = opt.versuche ?? 6;
  const basis = opt.basisMs ?? 1500;
  const fetchFn = opt.fetch ?? fetch;
  const warte = opt.warte ?? (ms => new Promise(r => setTimeout(r, ms)));
  let letzter = '';
  for (let i = 0; i < versuche; i++) {
    let r, j;
    try {
      r = await fetchFn(`https://${shop}/admin/api/${api}/graphql.json`, { method: 'POST',
        redirect:'error', signal:AbortSignal.timeout(opt.timeoutMs ?? 30000),
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
        body: JSON.stringify({ query, variables }) });
    } catch (e) {                                   // Netzfehler: auch das ist ein Warte-Fall
      letzter = 'fetch: ' + e.message;
      if (i + 1 < versuche) { await warte(basis * 2 ** i); continue; }
      throw new Error('GraphQL: ' + letzter);
    }
    if (r.status === 429 || r.status >= 500) {
      letzter = `HTTP ${r.status}`;
      if (i + 1 < versuche) { await warte(basis * 2 ** i); continue; }
      throw new Error('GraphQL: ' + letzter);
    }
    if (r.status < 200 || r.status >= 300) {
      throw new Error(`GraphQL: HTTP ${r.status}`);
    }
    try { j = await r.json(); } catch (e) { throw new Error('GraphQL: Antwort nicht lesbar (HTTP ' + r.status + ')'); }
    if (j?.errors?.length) {
      const txt = JSON.stringify(j.errors).slice(0, 300);
      if (DROSSEL.test(txt) && i + 1 < versuche) { letzter = txt; await warte(basis * 2 ** i); continue; }
      throw new Error('GraphQL: ' + txt);
    }
    if (!j || typeof j.data !== 'object' || j.data === null) {
      throw new Error('GraphQL: Antwort enthält keine Daten');
    }
    const takt = taktPause(j, opt);
    if (takt > 0) await warte(takt);
    return j.data;
  }
  throw new Error('GraphQL: ' + letzter);
}
