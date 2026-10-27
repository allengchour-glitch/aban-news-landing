/**
 * Kundensicht einer Collection: ist sie im Onlineshop wirklich erreichbar und zeigt sie Produkte?
 *
 * WARUM: Die Admin-API täuscht. `resourcePublicationsV2` meldete 169 Collections «nicht im Onlineshop», live waren 4 von 5 Stichproben 200 (und umgekehrt kann eine
 * per API angelegte Collection «veröffentlicht» heissen und trotzdem 404 liefern, Publish-Falle vom 18.10.). Nur der HTTP-Abruf zählt (Skill kategorien-nach-google, Falle 4).
 * Eine Weiterleitung zählt NICHT: eine unveröffentlichte Collection kann auf eine andere Seite umleiten und täuscht dann «200» vor (haustier-tech, 26.10.).
 *
 * Geprüft wird `/collections/<handle>/products.json?limit=1`: HTTP 200 ohne Weiterleitung UND mindestens ein Produkt. Eine leere Smart-Collection
 * (Mitgliedschaft füllt Shopify verzögert) ist als Menüziel genauso schlecht wie eine fehlende.
 * `fetchFn` und `warte` sind einspeisbar (Tests spielen eine Attrappe ein; es gibt hier kein Netz im Test).
 */
const schlaf = ms => new Promise(r => setTimeout(r, ms));

/**
 * @returns {Promise<{ok:boolean, status:number, n:number, grund:string}>}  ok nur bei HTTP 200 (ohne Weiterleitung) und mindestens einem Produkt
 */
export async function collectionImWeb(handle, { fetchFn = fetch, basis = 'https://luxestyle.ch', jetzt = () => Date.now(), warte = schlaf, versuche = 3 } = {}) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(handle))) return { ok: false, status: 0, n: 0, grund: `ungültiger Handle «${handle}»` };
  const url = `${basis}/collections/${handle}/products.json?limit=1&cb=${jetzt()}`;
  let letzter = { ok: false, status: 0, n: 0, grund: 'nicht geprüft' };
  for (let i = 1; i <= versuche; i++) {
    try {
      const r = await fetchFn(url, { redirect: 'manual', headers: { Accept: 'application/json' } });
      if (r.status === 200) {
        let j = null; try { j = await r.json(); } catch { /* kein JSON */ }
        const n = Array.isArray(j?.products) ? j.products.length : -1;
        letzter = n < 0 ? { ok: false, status: 200, n: 0, grund: 'HTTP 200, aber keine Produktliste' } : n === 0 ? { ok: false, status: 200, n: 0, grund: 'HTTP 200, aber leer (keine Produkte)' } : { ok: true, status: 200, n, grund: '' };
        return letzter;                                   // 200 ist entschieden (leer kann sich später füllen, aber das klärt der Aufrufer)
      }
      const umleitung = r.status >= 300 && r.status < 400;
      letzter = { ok: false, status: r.status, n: 0, grund: umleitung ? `HTTP ${r.status} (Weiterleitung: nicht veröffentlicht oder umbenannt)` : `HTTP ${r.status}` };
      if (r.status !== 429 && r.status < 500) return letzter;      // 404/3xx: eindeutig; nur Drosselung und Serverfehler wiederholen
    } catch (e) { letzter = { ok: false, status: 0, n: 0, grund: `Abruf gescheitert: ${e.message}` }; }
    if (i < versuche) await warte(1500 * i);
  }
  return letzter;
}

/** Mehrere Handles, höchstens `parallel` gleichzeitig. @returns {Promise<Record<string, {ok:boolean, status:number, n:number, grund:string}>>} */
export async function collectionsImWeb(handles, opt = {}, parallel = 6) {
  const aus = {}, liste = [...new Set(handles)];
  for (let i = 0; i < liste.length; i += parallel) {
    const teil = liste.slice(i, i + parallel);
    const r = await Promise.all(teil.map(h => collectionImWeb(h, opt)));
    teil.forEach((h, n) => { aus[h] = r[n]; });
  }
  return aus;
}
