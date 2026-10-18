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
const DROSSEL = /throttled|exceeded.*cost|rate limit/i;

export async function shopifyGql(shop, api, token, query, variables, opt = {}) {
  const versuche = opt.versuche ?? 6;
  const basis = opt.basisMs ?? 1500;
  const fetchFn = opt.fetch ?? fetch;
  const warte = opt.warte ?? (ms => new Promise(r => setTimeout(r, ms)));
  let letzter = '';
  for (let i = 0; i < versuche; i++) {
    let r, j;
    try {
      r = await fetchFn(`https://${shop}/admin/api/${api}/graphql.json`, { method: 'POST',
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
    return j.data;
  }
  throw new Error('GraphQL: ' + letzter);
}
