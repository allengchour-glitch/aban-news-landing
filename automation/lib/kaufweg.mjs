/**
 * Kaufweg-Wächter (09.11.2026): prüft OHNE Browser, ob der Weg vom Produkt bis zur Kasse im Live-Shop funktioniert.
 *
 * WARUM: `site-health.mjs` fragt nur, ob Seiten antworten, und hat seit 13.06. keinen Zeitplan mehr. Ob jemand ein Produkt in den
 * Warenkorb legen, Versand nach Zürich berechnen lassen und zur Kasse kommen kann, prüfte niemand. Bei rund einer Bestellung am Tag
 * bliebe ein stiller Bruch (Theme-Änderung, Versandprofil, Zahlungsart, Bestandsregel) tagelang unbemerkt.
 *
 * SCHRITTE (alles ohne JavaScript, mit Browser-Kopf und Geduld bei 429, wie `url_status.mjs`):
 *   1 Testprodukt (das erste lieferbare einer kurzen Liste)   2 Produktseite   3 In den Warenkorb
 *   4 Warenkorb-Seite (Artikel, Zahlungs-Symbole)   5 Versand nach Zürich   6 Kasse (Weiterleitung auf /checkouts/, Seite lädt)
 *   7 Korb leeren (nur Aufräumen, zählt nicht)
 *
 * URTEIL je Schritt:
 *   problem   = klarer Fehler (Telegram + Exit 1)
 *   unmessbar = Drosselung (429), Sperrseite, Server-5xx, Netzfehler, Zeitlimit: KEIN Alarm (eine Drosselung ist kein kaputter Shop)
 *   hinweis   = Auffälligkeit, die nichts blockiert (steht im Protokoll)
 *   ok
 *
 * Reine Funktionen und ein eingespritzter `fetch`: der Test (kaufweg_test.mjs) läuft ohne Netz gegen einen nachgebauten Shop.
 */

export const BROWSER_KOPF = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'de-CH,de;q=0.9',
};

// Dauerhaft angebotene Produkte mit Bestandsregel «verkaufbar»: das erste lieferbare gilt. Fällt eines weg, springt das nächste ein.
export const TESTPRODUKTE = [
  'rizinusol-wickel-wiederverwendbar-bauch-nacken',
  'rizinusol-wimpernserum-313025',
  'tunmate-rizinusol-382081',
];

// Zahlungsarten, die im Shop sichtbar sein müssen (Symbole der Fusszeile, aus `shop.enabled_payment_types`).
export const PFLICHT_ZAHLUNG = ['twint'];

// Versand nach Zürich: höchster erwarteter Preis der günstigsten Versandart bei einem Artikel unter CHF 50 (Text im Shop: «Versand CHF 7»).
export const VERSAND_MAX_CHF = 25;

const SPERR_MARKER = /Verifying your connection|Just a moment|cf-chl|Attention Required|captcha/i;

export const liquidFehler = (html) => (String(html || '').match(/Liquid (syntax )?error/gi) || []).length;

// Die Zahlungsart steckt in der Beschriftung des Shopify-Symbols (`<svg aria-labelledby="fuss-pi-twint"><title id="fuss-pi-twint">`);
// jede Symbolreihe des Shops trägt einen eigenen Präfix (`fuss-`, …), ohne Präfix heisst es `pi-twint`. Gemessen am echten Shop 09.11.2026.
export const zahlungsarten = (html) => [...new Set([...String(html || '').matchAll(/(?:aria-labelledby|id)="(?:[a-z0-9_]+-)*pi-([a-z0-9_]+)"/g)].map((m) => m[1]))];

// Kleiner Cookie-Speicher (nur name=value): der Warenkorb hängt am Cookie `cart`.
export function cookieKrug() {
  const m = new Map();
  return {
    aufnehmen(headers) {
      const liste = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : (headers.get('set-cookie') ? [headers.get('set-cookie')] : []);
      for (const zeile of liste) {
        const [nv, ...attr] = zeile.split(';');
        const i = nv.indexOf('=');
        if (i < 1) continue;
        const name = nv.slice(0, i).trim();
        const wert = nv.slice(i + 1).trim();
        const abgelaufen = attr.some((a) => /^\s*max-age\s*=\s*0\s*$/i.test(a))
          || attr.some((a) => /^\s*expires\s*=/i.test(a) && Date.parse(a.split('=').slice(1).join('=')) < Date.now());
        if (abgelaufen || wert === '') m.delete(name); else m.set(name, wert);
      }
    },
    kopf: () => [...m].map(([k, v]) => `${k}=${v}`).join('; '),
    anzahl: () => m.size,
  };
}

/**
 * Eine Anfrage mit Geduld. 429, 5xx, Netzfehler, Zeitlimit und Sperrseiten (Cloudflare «Verifying your connection») gelten als
 * UNSICHER und werden mit wachsender Pause wiederholt; bleibt es dabei, kommt `unsicher: true` zurück (KEIN Befund).
 * Jede andere Antwort (auch 404, 422) gilt sofort. Weiterleitungen werden nicht verfolgt (der Schritt «Kasse» liest den Ort).
 */
export async function frage(ctx, methode, pfad, opt = {}) {
  const versuche = opt.versuche ?? ctx.versuche ?? 3;
  let letzte = { status: 0, text: '', location: '', unsicher: true, grund: 'kein Versuch' };
  for (let i = 0; i < versuche; i++) {
    const ac = new AbortController();
    const uhr = setTimeout(() => ac.abort(), ctx.zeitlimitMs ?? 20000);
    try {
      const kopf = { ...BROWSER_KOPF, ...(opt.kopf || {}) };
      const cookie = ctx.krug.kopf();
      if (cookie) kopf.cookie = cookie;
      const r = await ctx.fetch(ctx.basis + pfad, { method: methode, headers: kopf, body: opt.body, redirect: 'manual', signal: ac.signal });
      const text = await r.text();
      ctx.krug.aufnehmen(r.headers);
      const gesperrt = [403, 429, 503].includes(r.status) && SPERR_MARKER.test(text);
      const unsicher = r.status === 429 || r.status >= 500 || gesperrt;
      letzte = { status: r.status, text, location: r.headers.get('location') || '', unsicher, gesperrt };
      if (!unsicher) return letzte;
    } catch (e) {
      letzte = { status: 0, text: '', location: '', unsicher: true, grund: String(e && e.message || e).slice(0, 80) };
    } finally {
      clearTimeout(uhr);
    }
    if (i + 1 < versuche) await ctx.warte((ctx.basisMs ?? 2000) * 2 ** i);
  }
  return letzte;
}

const statusText = (r) => (r.gesperrt ? 'Sperrseite' : r.status ? `HTTP ${r.status}` : `Netzfehler${r.grund ? ' (' + r.grund + ')' : ''}`);
const kurz = (s, n = 90) => String(s || '').replace(/\s+/g, ' ').slice(0, n);

/** Urteil aus der Schrittliste: {ok, problems, unmessbar, hinweise} (nur Texte, keine Geheimnisse). */
export function urteil(schritte) {
  const aus = { ok: true, problems: [], unmessbar: [], hinweise: [] };
  for (const s of schritte) {
    if (s.art === 'problem') aus.problems.push(`❌ ${s.name}: ${s.text}`);
    else if (s.art === 'unmessbar') aus.unmessbar.push(`🕓 ${s.name}: ${s.text}`);
    else if (s.art === 'hinweis') aus.hinweise.push(`⚠️ ${s.name}: ${s.text}`);
  }
  aus.ok = aus.problems.length === 0;
  return aus;
}

export function nachricht(erg, zeit = new Date()) {
  const kopf = `🛒 LuxeStyle Kaufweg-Check ${zeit.toISOString().slice(0, 16).replace('T', ' ')}`;
  const zeilen = [kopf];
  if (erg.ok) zeilen.push(erg.unmessbar.length ? '✅ Kein Fehler gefunden (siehe nicht messbare Schritte).' : `✅ Kaufweg in Ordnung: ${erg.anzahlOk} Schritte geprüft.`);
  zeilen.push(...erg.problems, ...erg.unmessbar, ...erg.hinweise);
  if (erg.produkt) zeilen.push(`ℹ️ Testprodukt: ${erg.produkt}`);
  return zeilen.join('\n');
}

/**
 * Der ganze Lauf. Eingespritzt werden können `fetch`, `warte`, `basis`, `handles`, `pflichtZahlung`, `pauseMs`, `basisMs`, `versuche`.
 * Rückgabe: {ok, problems, unmessbar, hinweise, schritte, produkt, anzahlOk}
 */
export async function lauf(opt = {}) {
  const ctx = {
    fetch: opt.fetch ?? fetch,
    basis: String(opt.basis ?? 'https://luxestyle.ch').replace(/\/$/, ''),
    krug: cookieKrug(),
    warte: opt.warte ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
    basisMs: opt.basisMs ?? 2000,
    versuche: opt.versuche ?? 3,
    zeitlimitMs: opt.zeitlimitMs ?? 20000,
  };
  const pauseMs = opt.pauseMs ?? 1500;
  const handles = opt.handles && opt.handles.length ? opt.handles : TESTPRODUKTE;
  const pflicht = opt.pflichtZahlung ?? PFLICHT_ZAHLUNG;
  const schritte = [];
  const buche = (name, art, text = '') => { schritte.push({ name, art, text }); return art; };
  const pause = () => ctx.warte(pauseMs);
  const fertig = (produkt) => {
    const u = urteil(schritte);
    return { ...u, schritte, produkt: produkt || '', anzahlOk: schritte.filter((s) => s.art === 'ok').length };
  };

  // 1 Testprodukt
  const notizen = [];
  let alleUnsicher = true;
  let wahl = null;
  for (const h of handles) {
    const r = await frage(ctx, 'GET', `/products/${h}.js`);
    await pause();
    if (r.unsicher) { notizen.push(`${h}: ${statusText(r)}`); continue; }
    alleUnsicher = false;
    if (r.status !== 200) { notizen.push(`${h}: HTTP ${r.status}`); continue; }
    let p = null;
    try { p = JSON.parse(r.text); } catch { notizen.push(`${h}: Antwort nicht lesbar`); continue; }
    const v = (p.variants || []).find((x) => x.available);
    if (!p.available || !v) { notizen.push(`${h}: nicht lieferbar`); continue; }
    wahl = { handle: h, titel: p.title, variantId: v.id };
    break;
  }
  if (!wahl) {
    if (alleUnsicher) buche('Testprodukt', 'unmessbar', `Shop nicht messbar (${notizen.join('; ')})`);
    else buche('Testprodukt', 'problem', `keines der Testprodukte ist lieferbar (${notizen.join('; ')})`);
    return fertig('');
  }
  buche('Testprodukt', 'ok');

  // 2 Produktseite
  {
    const r = await frage(ctx, 'GET', `/products/${wahl.handle}`);
    await pause();
    if (r.unsicher) buche('Produktseite', 'unmessbar', statusText(r));
    else if (r.status !== 200) buche('Produktseite', 'problem', `HTTP ${r.status}`);
    else if (liquidFehler(r.text)) buche('Produktseite', 'problem', `Liquid-Fehler im Text (${liquidFehler(r.text)}×)`);
    else {
      buche('Produktseite', 'ok');
      if (!/"@type"\s*:\s*"(Product|ProductGroup)"/.test(r.text)) buche('Produktseite', 'hinweis', 'keine strukturierten Produktdaten gefunden');
      if (!r.text.includes('/cart/add')) buche('Produktseite', 'hinweis', 'kein Formular zum Warenkorb (/cart/add) gefunden');
    }
  }

  // 3 In den Warenkorb
  {
    const r = await frage(ctx, 'POST', '/cart/add.js', {
      kopf: { 'content-type': 'application/json', accept: 'application/json', 'x-requested-with': 'XMLHttpRequest' },
      body: JSON.stringify({ items: [{ id: wahl.variantId, quantity: 1 }] }),
    });
    await pause();
    if (r.unsicher) { buche('In den Warenkorb', 'unmessbar', statusText(r)); return fertig(wahl.handle); }
    let j = null;
    try { j = JSON.parse(r.text); } catch { /* bleibt null */ }
    const zeile = j && Array.isArray(j.items) ? j.items[0] : null;
    if (r.status === 200 && zeile && Number(zeile.id ?? zeile.variant_id) === Number(wahl.variantId)) buche('In den Warenkorb', 'ok');
    else {
      buche('In den Warenkorb', 'problem', `HTTP ${r.status}${j && (j.description || j.message) ? ': ' + kurz(j.description || j.message) : ''}`);
      return fertig(wahl.handle);
    }
  }

  // 4 Warenkorb-Seite
  {
    const r = await frage(ctx, 'GET', '/cart');
    await pause();
    if (r.unsicher) buche('Warenkorb-Seite', 'unmessbar', statusText(r));
    else if (r.status !== 200) buche('Warenkorb-Seite', 'problem', `HTTP ${r.status}`);
    else if (liquidFehler(r.text)) buche('Warenkorb-Seite', 'problem', `Liquid-Fehler im Text (${liquidFehler(r.text)}×)`);
    else if (!r.text.includes(`/products/${wahl.handle}`)) buche('Warenkorb-Seite', 'problem', 'der Artikel steht nach dem Hinzufügen nicht im Warenkorb');
    else {
      buche('Warenkorb-Seite', 'ok');
      const arten = zahlungsarten(r.text);
      const fehlt = pflicht.filter((z) => !arten.includes(z));
      if (!arten.length) buche('Zahlungs-Symbole', 'hinweis', 'keine Zahlungs-Symbole im Seitentext gefunden (Markup geändert?)');
      else if (fehlt.length) buche('Zahlungs-Symbole', 'problem', `${fehlt.join(', ')} fehlt unter den Zahlungsarten (vorhanden: ${arten.join(', ')})`);
      else buche('Zahlungs-Symbole', 'ok', arten.join(', '));
    }
  }

  // 5 Versand nach Zürich
  {
    const q = 'shipping_address%5Bzip%5D=8001&shipping_address%5Bcountry%5D=Switzerland&shipping_address%5Bprovince%5D=';
    const vor = await frage(ctx, 'POST', `/cart/prepare_shipping_rates.json?${q}`);
    await pause();
    let raten = null; let unsicher = false; let grund = '';
    if (vor.unsicher) { unsicher = true; grund = statusText(vor); }
    else if (vor.status === 404) {
      const alt = await frage(ctx, 'GET', `/cart/shipping_rates.json?${q}`);
      if (alt.unsicher) { unsicher = true; grund = statusText(alt); }
      else if (alt.status === 200) { try { raten = JSON.parse(alt.text).shipping_rates || []; } catch { grund = 'Antwort nicht lesbar'; } }
      else grund = `HTTP ${alt.status}`;
    } else if (vor.status >= 200 && vor.status < 300) {
      for (let i = 0; i < 8 && raten === null && !unsicher; i++) {
        const r = await frage(ctx, 'GET', `/cart/async_shipping_rates.json?${q}`);
        if (r.unsicher) { unsicher = true; grund = statusText(r); break; }
        if (r.status === 200) { try { raten = JSON.parse(r.text).shipping_rates || []; } catch { grund = 'Antwort nicht lesbar'; break; } }
        else if (r.status === 202) await ctx.warte(opt.pollMs ?? 2000);
        else { grund = `HTTP ${r.status}`; break; }
      }
      if (raten === null && !unsicher && !grund) { unsicher = true; grund = 'Berechnung wird nicht fertig'; }
    } else grund = `HTTP ${vor.status}`;
    await pause();
    if (unsicher) buche('Versand nach Zürich', 'unmessbar', grund);
    else if (raten === null) buche('Versand nach Zürich', 'problem', grund || 'keine Antwort der Versandberechnung');
    else if (!raten.length) buche('Versand nach Zürich', 'problem', 'keine Versandart für die Schweiz berechenbar (Versandprofil prüfen)');
    else {
      const preise = raten.map((x) => Number(x.price)).filter((x) => Number.isFinite(x));
      const min = preise.length ? Math.min(...preise) : NaN;
      if (!Number.isFinite(min)) buche('Versand nach Zürich', 'problem', 'Versandarten ohne lesbaren Preis');
      else if (min > (opt.versandMax ?? VERSAND_MAX_CHF)) buche('Versand nach Zürich', 'problem', `günstigste Versandart kostet ${min.toFixed(2)} (erwartet höchstens ${opt.versandMax ?? VERSAND_MAX_CHF})`);
      else buche('Versand nach Zürich', 'ok', `günstigste Art ${min.toFixed(2)} (${raten.length} Versandarten)`);
    }
  }

  // 6 Kasse
  {
    const r = await frage(ctx, 'POST', '/cart', { kopf: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'updates%5B%5D=1&checkout=' });
    await pause();
    if (r.unsicher) buche('Kasse', 'unmessbar', statusText(r));
    else if (![301, 302, 303, 307, 308].includes(r.status) || !r.location) buche('Kasse', 'problem', `keine Weiterleitung zur Kasse (${statusText(r)})`);
    else {
      let ziel = r.location;
      try { const u = new URL(ziel, ctx.basis); if (u.origin === ctx.basis) ziel = u.pathname + u.search; else ziel = ''; } catch { ziel = ''; }
      if (!/\/checkouts?\//.test(r.location)) buche('Kasse', 'problem', `Weiterleitung führt nicht in die Kasse (${kurz(r.location.replace(/[?#].*$/, ''), 60)})`);
      else if (!ziel) buche('Kasse', 'ok');
      else {
        const k = await frage(ctx, 'GET', ziel);
        if (k.unsicher) buche('Kasse', 'unmessbar', statusText(k));
        else if ([301, 302, 303, 307, 308].includes(k.status) && /password|\/cart(\b|$)/.test(k.location)) buche('Kasse', 'problem', `Kasse leitet zurück (${kurz(k.location.replace(/[?#].*$/, ''), 60)})`);
        else if (k.status !== 200 && ![301, 302, 303, 307, 308].includes(k.status)) buche('Kasse', 'problem', `Kassenseite antwortet mit HTTP ${k.status}`);
        else buche('Kasse', 'ok');
      }
    }
  }

  // 7 Aufräumen (kein Befund)
  await frage(ctx, 'POST', '/cart/clear.js', { versuche: 1, kopf: { 'content-type': 'application/json', accept: 'application/json' }, body: '{}' });

  return fertig(wahl.handle);
}
