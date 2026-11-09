/**
 * Test des Kaufweg-Wächters (automation/lib/kaufweg.mjs und automation/kaufweg_waechter.mjs): kein Zugang, kein Shop, kein Warten.
 * Ein nachgebauter Shop läuft zweifach: als `fetch`-Attrappe (schnell, jeder Fehlerfall) und als echter lokaler HTTP-Server
 * (echtes `fetch` von Node: Cookies, Weiterleitung ohne Folgen, das ganze Startskript samt Telegram-Meldung).
 * Lauf: node automation/lib/kaufweg_test.mjs
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { lauf, urteil, nachricht, cookieKrug, zahlungsarten, liquidFehler, frage, BROWSER_KOPF, TESTPRODUKTE, PFLICHT_ZAHLUNG, VERSAND_MAX_CHF } from './kaufweg.mjs';

let fehler = 0, n = 0;
const pruef = (name, ok, extra = '') => { n++; if (!ok) { fehler++; console.log(`FAIL ${name} ${extra}`); } else console.log(`ok   ${name}`); };
const [H1, H2, H3] = TESTPRODUKTE;

// ---------------------------------------------------------------------------------------------------------------- nachgebauter Shop
function neuerShop(o = {}) {
  const st = { korb: new Map(), tokens: 0, aufrufe: [], zaehler: {}, tg: [], koepfe: [] };
  const produkte = o.produkte ?? { [H1]: { id: 111, available: true }, [H2]: { id: 222, available: true }, [H3]: { id: 333, available: true } };
  const zahlung = o.zahlung ?? ['twint', 'visa', 'master', 'paypal'];
  const ikonen = () => (o.zahlungOhneSymbole ? '' : zahlung.map((z) => `<svg role="img" class="lx-pay__icon" aria-labelledby="fuss-pi-${z}"><title id="fuss-pi-${z}">${z}</title></svg>`).join(''));
  const zaehle = (k) => (st.zaehler[k] = (st.zaehler[k] || 0) + 1);
  const r = (status, body, kopf = []) => ({ status, body, kopf });
  const json = (status, obj, kopf = []) => r(status, JSON.stringify(obj), [['content-type', 'application/json'], ...kopf]);
  const handleZuId = (id) => Object.entries(produkte).find(([, p]) => p.id === Number(id))?.[0];
  const raten = () => {
    switch (o.versand) {
      case 'leer': return [];
      case 'teuer': return [{ name: 'Express', price: '99.00' }];
      case 'ohnePreis': return [{ name: 'Standard' }];
      case 'grenze': return [{ name: 'Standard', price: '25.00' }];
      case 'grenzeUeber': return [{ name: 'Standard', price: '25.01' }];
      case 'gemischt': return [{ name: 'Standard', price: '7.00' }, { name: 'Express', price: '99.00' }];
      default: return [{ name: 'Standard', price: '7.00' }, { name: 'Express', price: '15.00' }];
    }
  };

  function route(req) {
    const p = req.pfad;
    st.aufrufe.push(`${req.methode} ${p}`);
    st.koepfe.push(req.kopf);
    if (p.startsWith('/bot') && req.methode === 'POST') { st.tg.push(JSON.parse(req.body || '{}')); return json(200, { ok: true }); }
    if (o.immer429) return r(429, '<html>Too many requests</html>');
    if (o.sperre403) return r(403, '<html><title>Just a moment...</title>Verifying your connection</html>');
    if (o.einfach403) return r(403, 'Forbidden');
    if ((o.status429Pfade || []).includes(p)) return r(429, '<html>Too many requests</html>');
    if ((o.status503Pfade || []).includes(p)) return r(503, 'Service Unavailable');
    if (o.einmal429Pfade && o.einmal429Pfade[p] && zaehle('429:' + p) <= o.einmal429Pfade[p]) return r(429, '<html>Too many requests</html>');
    if (o.netzFehlerBei === `${req.methode} ${p}`) return { abbruch: true };
    if (o.haengtBei === `${req.methode} ${p}`) return { haengt: true };

    const tok = ((req.kopf.cookie || '').match(/(?:^|; )cart=([^;]+)/) || [])[1];

    let m = p.match(/^\/products\/([^/]+)\.js$/);
    if (m) {
      const pr = produkte[m[1]];
      if (!pr) return r(404, '<html>nicht gefunden</html>');
      if (o.produktJsonKaputt) return r(200, 'kein json');
      return json(200, { title: 'Test ' + m[1], available: pr.available, variants: [{ id: pr.id, available: pr.available, price: 2490 }] });
    }
    m = p.match(/^\/products\/([^/.]+)$/);
    if (m) {
      if (o.produktSeiteStatus) return r(o.produktSeiteStatus, '<html>fehler</html>');
      return r(200, `<html><body>${o.liquidIn === 'produkt' ? 'Liquid error (sections/main-product line 12): undefined' : ''}`
        + `${o.ohneJsonLd ? '' : '<script type="application/ld+json">{"@context":"http://schema.org/","@type":"Product","name":"x"}</script>'}`
        + `${o.ohneForm ? '' : '<form action="/cart/add" method="post"></form>'}</body></html>`);
    }
    if (p === '/cart/add.js' && req.methode === 'POST') {
      if (o.addStatus) return json(o.addStatus, { status: o.addStatus, message: 'Cannot find variant', description: 'Alle 5 Stück im Lager sind schon in deinem Warenkorb.' });
      const body = JSON.parse(req.body || '{}');
      const id = body.items && body.items[0] && body.items[0].id;
      if (o.addOhneArtikel) return json(200, { items: [] });
      const t = tok || 'T' + (++st.tokens);
      st.korb.set(t, [{ id, quantity: 1 }]);
      return json(200, { items: [{ id, variant_id: id, quantity: 1 }] }, tok ? [] : [['set-cookie', `cart=${t}; path=/; HttpOnly`], ['set-cookie', '_shopify_s=abc; path=/']]);
    }
    if (p === '/cart' && req.methode === 'GET') {
      if (o.cartStatus) return r(o.cartStatus, '<html>fehler</html>');
      const zeilen = (!o.cartIgnoriertCookie && tok && st.korb.get(tok)) || [];
      const links = zeilen.map((z) => `<a href="/products/${handleZuId(z.id)}">Artikel</a>`).join('');
      return r(200, `<html><body>${o.liquidIn === 'cart' ? 'Liquid syntax error (templates/cart line 3): Unknown tag' : ''}${links}<form action="/cart" method="post"><button name="checkout">Kasse</button></form><footer>${ikonen()}</footer></body></html>`);
    }
    if (/^\/cart\/(prepare_shipping_rates|async_shipping_rates|shipping_rates)\.json$/.test(p) && !(/country%5D=Switzerland/.test(req.query) && /zip%5D=8001/.test(req.query))) return json(422, { error: 'Adresse fehlt' });
    if (p === '/cart/prepare_shipping_rates.json' && req.methode === 'POST') {
      if (o.versand === 'legacy') return r(404, '<html>weg</html>');
      if (o.versand === 'fehler422') return json(422, { error: 'x' });
      return json(200, {});
    }
    if (p === '/cart/async_shipping_rates.json') {
      if (o.versand === 'zuLange202') return json(202, {});
      if (o.versand === 'fehler500') return r(500, 'boom');
      if (zaehle('poll') <= (o.polls202 ?? 0)) return json(202, {});
      if (o.versand === 'kaputt') return r(200, 'kein json');
      return json(200, { shipping_rates: raten() });
    }
    if (p === '/cart/shipping_rates.json') return json(200, { shipping_rates: raten() });
    if (p === '/cart' && req.methode === 'POST') {
      if (!/x-www-form-urlencoded/.test(req.kopf['content-type'] || '')) return r(400, 'falscher Inhaltstyp');
      if (!/(^|&)checkout=/.test(req.body)) return r(200, '<html><body>Warenkorb aktualisiert</body></html>');
      switch (o.kasse) {
        case 'keine': return r(200, '<html><body>Warenkorb</body></html>');
        case 'ohneOrt': return r(302, '');
        case 'passwort': return r(302, '', [['location', '/password']]);
        case 'zurueck': return r(302, '', [['location', '/cart']]);
        case 'anderswo': return r(302, '', [['location', '/collections/all']]);
        case 'extern': return r(302, '', [['location', 'https://checkout.shopify.com/12345/checkouts/cn/abc']]);
        default: return r(302, '', [['location', '/checkouts/cn/abc123?x=1']]);
      }
    }
    if (p.startsWith('/checkouts/')) {
      switch (o.kassenseite) {
        case '500': return r(500, 'boom');
        case '404': return r(404, '<html>weg</html>');
        case 'passwort': return r(302, '', [['location', '/password']]);
        case 'zurueck': return r(302, '', [['location', '/cart?x=1']]);
        default: return r(200, '<html><body>Kasse</body></html>');
      }
    }
    if (p === '/cart/clear.js' && req.methode === 'POST') { st.korb.clear(); return json(200, {}); }
    return r(404, '<html>nicht gefunden</html>');
  }

  // fetch-Attrappe mit derselben Antwortform wie echtes fetch
  async function fetchFn(url, init = {}) {
    const u = new URL(url);
    const kopf = {};
    for (const [k, v] of Object.entries(init.headers || {})) kopf[k.toLowerCase()] = v;
    st.optionen = { redirect: init.redirect };
    const out = route({ methode: init.method || 'GET', pfad: u.pathname, query: u.search, kopf, body: init.body || '' });
    if (out.abbruch) throw new Error('ECONNRESET');
    if (out.haengt) return new Promise((_, rej) => init.signal && init.signal.addEventListener('abort', () => rej(new Error('abgebrochen'))));
    const h = new Headers();
    for (const [k, v] of out.kopf) h.append(k, v);
    return new Response(out.body, { status: out.status, headers: h });
  }
  return { st, route, fetch: fetchFn };
}

function starteServer(shop) {
  return new Promise((fertig) => {
    const s = http.createServer((q, a) => {
      const teile = [];
      q.on('data', (c) => teile.push(c));
      q.on('end', () => {
        const u = new URL(q.url, 'http://x');
        const kopf = {};
        for (const [k, v] of Object.entries(q.headers)) kopf[k.toLowerCase()] = Array.isArray(v) ? v.join('; ') : v;
        const out = shop.route({ methode: q.method, pfad: u.pathname, query: u.search, kopf, body: Buffer.concat(teile).toString() });
        if (out.abbruch) { q.socket.destroy(); return; }
        if (out.haengt) return;
        const h = {};
        for (const [k, v] of out.kopf) { const key = k.toLowerCase(); h[key] = h[key] ? [].concat(h[key], v) : v; }
        a.writeHead(out.status, h);
        a.end(out.body);
      });
    });
    s.listen(0, '127.0.0.1', () => fertig(s));
  });
}

const schnell = (shop, extra = {}) => ({ fetch: shop.fetch, warte: async () => {}, pauseMs: 0, basisMs: 1, pollMs: 0, ...extra });
const art = (erg, name) => erg.schritte.filter((s) => s.name === name).map((s) => s.art);
const hat = (erg, name, a) => art(erg, name).includes(a);

// ---------------------------------------------------------------------------------------------------------------- 1 gesunder Shop
{
  const shop = neuerShop();
  const erg = await lauf(schnell(shop));
  pruef('gesund: ok, keine Probleme', erg.ok && erg.problems.length === 0, JSON.stringify(erg.problems));
  pruef('gesund: sieben Schritte ok', erg.anzahlOk === 7, String(erg.anzahlOk));
  pruef('gesund: erstes Testprodukt', erg.produkt === H1, erg.produkt);
  pruef('gesund: nichts nicht messbar', erg.unmessbar.length === 0 && erg.hinweise.length === 0, JSON.stringify(erg.unmessbar.concat(erg.hinweise)));
  pruef('gesund: Protokoll nennt Versandpreis und Zahlungsarten', erg.schritte.some((x) => x.name === 'Versand nach Zürich' && x.text === 'günstigste Art 7.00 (2 Versandarten)') && erg.schritte.some((x) => x.name === 'Zahlungs-Symbole' && x.text === 'twint, visa, master, paypal'), JSON.stringify(erg.schritte.filter((x) => x.text)));
  pruef('gesund: Korb wird am Ende geleert', shop.st.aufrufe[shop.st.aufrufe.length - 1] === 'POST /cart/clear.js' && shop.st.korb.size === 0, shop.st.aufrufe.slice(-2).join(' | '));
  pruef('gesund: Cookie des Warenkorbs wird mitgeschickt (Artikel steht im Korb)', hat(erg, 'Warenkorb-Seite', 'ok'));
  pruef('Browser-Kopf in jeder Anfrage', shop.st.koepfe.length > 5 && shop.st.koepfe.every((k) => /Chrome/.test(k['user-agent'] || '') && /de-CH/.test(k['accept-language'] || '')));
  pruef('Seitenabrufe fragen nach HTML, das Hinzufügen nach JSON', shop.st.koepfe.filter((k) => /text\/html/.test(k.accept || '')).length >= 3 && shop.st.koepfe.some((k) => k.accept === 'application/json'));
  pruef('Weiterleitungen werden nicht verfolgt', shop.st.optionen && shop.st.optionen.redirect === 'manual');
  pruef('add.js mit JSON-Kopf', shop.st.koepfe.some((k) => k['content-type'] === 'application/json' && k['x-requested-with'] === 'XMLHttpRequest'));
  pruef('Reihenfolge der Schritte', shop.st.aufrufe.join(',').replace(/\/products\/[^,]*\.js/g, 'J').startsWith('GET J,GET /products/' + H1 + ',POST /cart/add.js,GET /cart,POST /cart/prepare_shipping_rates.json,GET /cart/async_shipping_rates.json,POST /cart,GET /checkouts/cn/abc123'), shop.st.aufrufe.join(' | '));
}

// ---------------------------------------------------------------------------------------------------------------- 2 Testprodukt
{
  const shop = neuerShop({ produkte: { [H1]: { id: 111, available: false }, [H2]: { id: 222, available: true }, [H3]: { id: 333, available: true } } });
  const erg = await lauf(schnell(shop));
  pruef('Produkt 1 nicht lieferbar → Produkt 2', erg.ok && erg.produkt === H2, erg.produkt);
}
{
  const shop = neuerShop({ produkte: { [H1]: { id: 111, available: false }, [H2]: { id: 222, available: false }, [H3]: { id: 333, available: false } } });
  const erg = await lauf(schnell(shop));
  pruef('kein Produkt lieferbar → Problem', !erg.ok && hat(erg, 'Testprodukt', 'problem') && /nicht lieferbar/.test(erg.problems[0]), JSON.stringify(erg.problems));
  pruef('kein Produkt: kein Warenkorb-Versuch', !shop.st.aufrufe.includes('POST /cart/add.js'));
}
{
  const shop = neuerShop({ produkte: {} });
  const erg = await lauf(schnell(shop));
  pruef('alle Produkte 404 → Problem', !erg.ok && /HTTP 404/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const shop = neuerShop({ produktJsonKaputt: true });
  const erg = await lauf(schnell(shop));
  pruef('unlesbare Produktantwort → Problem, nicht Absturz', !erg.ok && /nicht lesbar/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const shop = neuerShop({ status429Pfade: [`/products/${H1}.js`] });
  const erg = await lauf(schnell(shop));
  pruef('Produkt 1 gedrosselt → Produkt 2, kein Alarm', erg.ok && erg.produkt === H2);
}
{
  const shop = neuerShop({ einfach403: true });
  const erg = await lauf(schnell(shop));
  pruef('schlichtes 403 (ohne Sperrseite) gilt als Problem', !erg.ok && /HTTP 403/.test(erg.problems[0]), JSON.stringify(erg));
}

// ---------------------------------------------------------------------------------------------------------------- 3 Drosselung ist kein Befund
{
  const shop = neuerShop({ immer429: true });
  const erg = await lauf(schnell(shop));
  pruef('Dauer-429 → nicht messbar, KEIN Problem', erg.ok && erg.problems.length === 0 && erg.unmessbar.length === 1 && /429/.test(erg.unmessbar[0]), JSON.stringify(erg));
  pruef('Dauer-429: es wird nur nachgefasst, nicht weitergemacht', !shop.st.aufrufe.includes('POST /cart/add.js'));
}
{
  const shop = neuerShop({ sperre403: true });
  const erg = await lauf(schnell(shop));
  pruef('Sperrseite (403 + «Verifying») → nicht messbar', erg.ok && erg.unmessbar.length === 1 && /Sperrseite/.test(erg.unmessbar[0]), JSON.stringify(erg));
}
{
  const shop = neuerShop({ einmal429Pfade: { '/cart': 1 } });
  const gewartet = [];
  const erg = await lauf(schnell(shop, { warte: async (ms) => { gewartet.push(ms); }, basisMs: 7 }));
  pruef('einmal 429, dann 200 → ok', erg.ok && erg.anzahlOk === 7, JSON.stringify(erg.problems));
  pruef('Nachfassen wartet basisMs', gewartet.includes(7), JSON.stringify(gewartet));
}
{
  const shop = neuerShop({ status503Pfade: ['/cart/add.js'] });
  const erg = await lauf(schnell(shop));
  pruef('Server-5xx beim Hinzufügen → nicht messbar, Lauf endet', erg.ok && hat(erg, 'In den Warenkorb', 'unmessbar') && !shop.st.aufrufe.includes('GET /cart'), JSON.stringify(erg));
}
{
  const shop = neuerShop({ netzFehlerBei: 'GET /cart' });
  const erg = await lauf(schnell(shop));
  pruef('Netzfehler bei der Warenkorb-Seite → nicht messbar, der Rest läuft', erg.ok && hat(erg, 'Warenkorb-Seite', 'unmessbar') && hat(erg, 'Kasse', 'ok'), JSON.stringify(erg));
}
{
  const shop = neuerShop({ haengtBei: 'GET /cart' });
  const erg = await lauf(schnell(shop, { zeitlimitMs: 15, versuche: 2 }));
  pruef('Zeitlimit → nicht messbar', erg.ok && hat(erg, 'Warenkorb-Seite', 'unmessbar'), JSON.stringify(erg));
}

// ---------------------------------------------------------------------------------------------------------------- 4 Produktseite, Warenkorb
{
  const erg = await lauf(schnell(neuerShop({ produktSeiteStatus: 404 })));
  pruef('Produktseite 404 → Problem', !erg.ok && hat(erg, 'Produktseite', 'problem') && /HTTP 404/.test(erg.problems[0]));
}
{
  const erg = await lauf(schnell(neuerShop({ liquidIn: 'produkt' })));
  pruef('Liquid-Fehler auf der Produktseite → Problem', !erg.ok && /Liquid-Fehler/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const erg = await lauf(schnell(neuerShop({ ohneJsonLd: true, ohneForm: true })));
  pruef('fehlende Produktdaten und Formular → nur Hinweise, Zähler zählt nur «ok»', erg.ok && erg.hinweise.length === 2 && erg.anzahlOk === 7, JSON.stringify(erg.hinweise) + erg.anzahlOk);
}
{
  const erg = await lauf(schnell(neuerShop({ addStatus: 422 })));
  pruef('Hinzufügen 422 → Problem mit Meldung', !erg.ok && /HTTP 422/.test(erg.problems[0]) && /Warenkorb/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const shop = neuerShop({ addOhneArtikel: true });
  const erg = await lauf(schnell(shop));
  pruef('Hinzufügen ohne Artikel in der Antwort → Problem, Lauf endet', !erg.ok && hat(erg, 'In den Warenkorb', 'problem') && !shop.st.aufrufe.includes('GET /cart'));
}
{
  const erg = await lauf(schnell(neuerShop({ cartIgnoriertCookie: true })));
  pruef('Artikel nicht im Warenkorb → Problem', !erg.ok && /nicht im Warenkorb/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const erg = await lauf(schnell(neuerShop({ liquidIn: 'cart' })));
  pruef('Liquid-Syntaxfehler im Warenkorb → Problem', !erg.ok && /Liquid-Fehler/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const erg = await lauf(schnell(neuerShop({ cartStatus: 500 })));
  pruef('Warenkorb-Seite 500 → nicht messbar', erg.ok && hat(erg, 'Warenkorb-Seite', 'unmessbar'));
}

// ---------------------------------------------------------------------------------------------------------------- 5 Zahlungsarten
{
  const erg = await lauf(schnell(neuerShop({ zahlung: ['visa', 'master', 'paypal'] })));
  pruef('TWINT fehlt, andere da → Problem', !erg.ok && /twint fehlt/.test(erg.problems[0]) && /visa/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const erg = await lauf(schnell(neuerShop({ zahlungOhneSymbole: true })));
  pruef('gar keine Symbole → nur Hinweis (Markup unbekannt)', erg.ok && erg.hinweise.length === 1 && /Zahlungs-Symbole/.test(erg.hinweise[0]), JSON.stringify(erg));
}
{
  const erg = await lauf(schnell(neuerShop({ zahlung: ['twint', 'visa'] }), { pflichtZahlung: ['twint', 'klarna'] }));
  pruef('eigene Pflichtliste: Klarna fehlt → Problem', !erg.ok && /klarna fehlt/.test(erg.problems[0]) && !/twint fehlt/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
pruef('Standard-Pflichtzahlung ist TWINT', JSON.stringify(PFLICHT_ZAHLUNG) === '["twint"]');

// ---------------------------------------------------------------------------------------------------------------- 6 Versand
{
  const shop = neuerShop({ polls202: 2 });
  const erg = await lauf(schnell(shop));
  pruef('Versand: zweimal «wird berechnet», dann Preise → ok', erg.ok && hat(erg, 'Versand nach Zürich', 'ok'), JSON.stringify(erg));
  pruef('Versand: es wird gefragt, bis fertig (3 Abfragen)', shop.st.aufrufe.filter((a) => a === 'GET /cart/async_shipping_rates.json').length === 3);
}
{
  const shop = neuerShop({ versand: 'legacy' });
  const erg = await lauf(schnell(shop));
  pruef('Versand: ältere Schnittstelle als Ersatz → ok', erg.ok && hat(erg, 'Versand nach Zürich', 'ok') && shop.st.aufrufe.includes('GET /cart/shipping_rates.json'), JSON.stringify(erg));
}
{
  const erg = await lauf(schnell(neuerShop({ versand: 'leer' })));
  pruef('Versand: keine Versandart → Problem', !erg.ok && /keine Versandart/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const erg = await lauf(schnell(neuerShop({ versand: 'teuer' })));
  pruef('Versand: günstigste Art zu teuer → Problem', !erg.ok && /99\.00/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const erg = await lauf(schnell(neuerShop({ versand: 'teuer' }), { versandMax: 120 }));
  pruef('Versand: eigene Obergrenze gilt', erg.ok);
}
pruef('Standard-Obergrenze Versand', VERSAND_MAX_CHF === 25);
{ const erg = await lauf(schnell(neuerShop({ versand: 'grenze' }))); pruef('Versand: genau die Obergrenze gilt noch', erg.ok, JSON.stringify(erg.problems)); }
{ const erg = await lauf(schnell(neuerShop({ versand: 'grenzeUeber' }))); pruef('Versand: knapp über der Obergrenze → Problem', !erg.ok && /25\.01/.test(erg.problems[0]), JSON.stringify(erg.problems)); }
{ const erg = await lauf(schnell(neuerShop({ versand: 'gemischt' }))); pruef('Versand: massgebend ist die günstigste Art', erg.ok, JSON.stringify(erg.problems)); }
{
  const gew = [];
  await lauf(schnell(neuerShop({ polls202: 1 }), { warte: async (ms) => { gew.push(ms); }, pollMs: 123 }));
  pruef('Versand: zwischen den Abfragen wird gewartet (pollMs)', gew.includes(123), JSON.stringify(gew));
}
{
  const erg = await lauf(schnell(neuerShop({ versand: 'ohnePreis' })));
  pruef('Versand: Arten ohne Preis → Problem', !erg.ok && /ohne lesbaren Preis/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const erg = await lauf(schnell(neuerShop({ versand: 'zuLange202' })));
  pruef('Versand: wird nie fertig → nicht messbar', erg.ok && hat(erg, 'Versand nach Zürich', 'unmessbar') && /nicht fertig/.test(erg.unmessbar[0]), JSON.stringify(erg));
}
{
  const erg = await lauf(schnell(neuerShop({ versand: 'fehler422' })));
  pruef('Versand: HTTP 422 → Problem', !erg.ok && /HTTP 422/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const erg = await lauf(schnell(neuerShop({ versand: 'fehler500' })));
  pruef('Versand: Server-5xx → nicht messbar', erg.ok && hat(erg, 'Versand nach Zürich', 'unmessbar'));
}
{
  const erg = await lauf(schnell(neuerShop({ versand: 'kaputt' })));
  pruef('Versand: unlesbare Antwort → Problem, kein Absturz', !erg.ok && /nicht lesbar/.test(erg.problems[0]), JSON.stringify(erg.problems));
}

// ---------------------------------------------------------------------------------------------------------------- 7 Kasse
for (const [kasse, muster, name] of [['keine', /keine Weiterleitung/, 'keine Weiterleitung'], ['ohneOrt', /keine Weiterleitung/, 'Weiterleitung ohne Zielangabe'], ['passwort', /nicht in die Kasse/, 'Weiterleitung ins Passwort'], ['zurueck', /nicht in die Kasse/, 'Weiterleitung zurück in den Warenkorb'], ['anderswo', /nicht in die Kasse/, 'Weiterleitung auf eine andere Seite']]) {
  const erg = await lauf(schnell(neuerShop({ kasse })));
  pruef(`Kasse: ${name} → Problem`, !erg.ok && muster.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const shop = neuerShop({ kasse: 'extern' });
  const erg = await lauf(schnell(shop));
  pruef('Kasse: Weiterleitung auf anderen Host → ok, keine Anfrage dorthin', erg.ok && !shop.st.aufrufe.some((a) => a.includes('/12345/')), JSON.stringify(erg));
}
{
  const erg = await lauf(schnell(neuerShop({ kassenseite: '404' })));
  pruef('Kassenseite 404 → Problem', !erg.ok && /HTTP 404/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const erg = await lauf(schnell(neuerShop({ kassenseite: '500' })));
  pruef('Kassenseite 500 → nicht messbar', erg.ok && hat(erg, 'Kasse', 'unmessbar'));
}
{
  const erg = await lauf(schnell(neuerShop({ kassenseite: 'zurueck' })));
  pruef('Kasse leitet in den Warenkorb zurück → Problem', !erg.ok && /leitet zurück/.test(erg.problems[0]), JSON.stringify(erg.problems));
}
{
  const erg = await lauf(schnell(neuerShop({ kassenseite: 'passwort' })));
  pruef('Kasse leitet auf die Passwortseite → Problem', !erg.ok && /leitet zurück/.test(erg.problems[0]), JSON.stringify(erg.problems));
}

// ---------------------------------------------------------------------------------------------------------------- 8 kleine Bausteine
{
  const k = cookieKrug();
  const h = new Headers();
  h.append('set-cookie', 'cart=abc; path=/; HttpOnly');
  h.append('set-cookie', '_s=1; Max-Age=3600');
  k.aufnehmen(h);
  pruef('Cookie-Speicher: zwei Cookies', k.kopf() === 'cart=abc; _s=1' && k.anzahl() === 2, k.kopf());
  const h2 = new Headers(); h2.append('set-cookie', 'cart=neu; path=/'); k.aufnehmen(h2);
  pruef('Cookie-Speicher: Wert wird ersetzt', k.kopf() === 'cart=neu; _s=1', k.kopf());
  const h3 = new Headers(); h3.append('set-cookie', '_s=; Max-Age=0; path=/'); k.aufnehmen(h3);
  pruef('Cookie-Speicher: Max-Age=0 löscht', k.kopf() === 'cart=neu', k.kopf());
  const h4 = new Headers(); h4.append('set-cookie', 'cart=x; Expires=Thu, 01 Jan 1970 00:00:00 GMT'); k.aufnehmen(h4);
  pruef('Cookie-Speicher: abgelaufen löscht', k.kopf() === '' && k.anzahl() === 0, k.kopf());
  const h5 = new Headers(); h5.append('set-cookie', 'ohnewert'); h5.append('set-cookie', '=x'); k.aufnehmen(h5);
  pruef('Cookie-Speicher: Unsinn wird ignoriert', k.anzahl() === 0);
}
pruef('zahlungsarten: findet und entdoppelt', JSON.stringify(zahlungsarten('<svg aria-labelledby="pi-twint"><title id="pi-twint">T</title></svg><svg aria-labelledby="pi-visa">')) === '["twint","visa"]');
pruef('zahlungsarten: Präfix der Symbolreihe (echtes Markup)', JSON.stringify(zahlungsarten('<svg class="lx-pay__icon" role="img" aria-labelledby="fuss-pi-twint"><title id="fuss-pi-twint">Twint</title></svg><svg aria-labelledby="pdp-reihe-pi-visa"><title id="pdp-reihe-pi-visa">Visa</title>')) === '["twint","visa"]');
pruef('zahlungsarten: fremde Ids ohne «pi-» zählen nicht', zahlungsarten('<svg aria-labelledby="spiel-twint"><title id="topic-twint">') .length === 0);
pruef('zahlungsarten: leer', zahlungsarten('<html>nichts</html>').length === 0 && zahlungsarten(undefined).length === 0);
pruef('liquidFehler zählt beide Arten', liquidFehler('Liquid error (a) … Liquid syntax error (b) … liquid error') === 3 && liquidFehler('') === 0 && liquidFehler(null) === 0);
{
  const u = urteil([{ name: 'A', art: 'ok' }, { name: 'B', art: 'hinweis', text: 'h' }, { name: 'C', art: 'unmessbar', text: 'u' }]);
  pruef('urteil: nur Hinweis/nicht messbar → ok', u.ok && u.hinweise.length === 1 && u.unmessbar.length === 1 && u.problems.length === 0);
  const v = urteil([{ name: 'A', art: 'ok' }, { name: 'B', art: 'problem', text: 'p' }]);
  pruef('urteil: Problem → nicht ok, Text mit Namen', !v.ok && v.problems[0] === '❌ B: p');
}
{
  const gut = nachricht({ ok: true, problems: [], unmessbar: [], hinweise: [], anzahlOk: 7, produkt: H1 }, new Date('2026-11-09T08:53:00Z'));
  pruef('Nachricht in Ordnung', /^🛒 LuxeStyle Kaufweg-Check 2026-11-09 08:53\n✅ Kaufweg in Ordnung: 7 Schritte geprüft\./.test(gut) && gut.includes(H1), gut);
  const schlecht = nachricht({ ok: false, problems: ['❌ Kasse: x'], unmessbar: ['🕓 Versand: y'], hinweise: [], anzahlOk: 3, produkt: '' }, new Date('2026-11-09T08:53:00Z'));
  pruef('Nachricht mit Fehler', schlecht.includes('❌ Kasse: x') && schlecht.includes('🕓 Versand: y') && !schlecht.includes('✅'), schlecht);
  const nm = nachricht({ ok: true, problems: [], unmessbar: ['🕓 Testprodukt: z'], hinweise: [], anzahlOk: 0, produkt: '' });
  pruef('Nachricht nur nicht messbar', /Kein Fehler gefunden/.test(nm) && nm.includes('🕓 Testprodukt: z'), nm);
}
{
  const shop = neuerShop();
  const ctx = { fetch: shop.fetch, basis: 'https://luxestyle.ch/', krug: cookieKrug(), warte: async () => {}, basisMs: 1 };
  const a = await frage(ctx, 'GET', '/nirgends');
  pruef('frage: 404 gilt sofort und wird nicht wiederholt', a.status === 404 && !a.unsicher && shop.st.aufrufe.length === 1, JSON.stringify(a.status));
}
{
  const shop = neuerShop({ immer429: true });
  const gew = [];
  const ctx = { fetch: shop.fetch, basis: 'https://luxestyle.ch', krug: cookieKrug(), warte: async (ms) => { gew.push(ms); }, basisMs: 5, versuche: 4 };
  const a = await frage(ctx, 'GET', '/x');
  pruef('frage: Pausen wachsen, eine weniger als Versuche', a.unsicher && gew.length === 3 && gew[1] > gew[0] && gew[2] > gew[1], JSON.stringify(gew));
  pruef('frage: Versuchszahl wird eingehalten', shop.st.aufrufe.length === 4, String(shop.st.aufrufe.length));
}
pruef('zahlungsarten: auch nur id oder nur aria-labelledby', JSON.stringify(zahlungsarten('<title id="pi-twint">T</title>')) === '["twint"]' && JSON.stringify(zahlungsarten('<svg aria-labelledby="pi-visa">')) === '["visa"]');
pruef('Browser-Kopf enthält Chrome und de-CH', /Chrome/.test(BROWSER_KOPF['user-agent']) && /de-CH/.test(BROWSER_KOPF['accept-language']));

// ---------------------------------------------------------------------------------------------------------------- 9 echtes HTTP (echtes fetch von Node)
{
  const shop = neuerShop();
  const s = await starteServer(shop);
  const basis = `http://127.0.0.1:${s.address().port}`;
  const erg = await lauf({ basis, warte: async () => {}, pauseMs: 0, basisMs: 1, pollMs: 0 });
  pruef('echtes HTTP: ganzer Kaufweg ok (Cookies, Weiterleitung ohne Folgen)', erg.ok && erg.anzahlOk === 7, JSON.stringify(erg));
  pruef('echtes HTTP: Korb geleert', shop.st.korb.size === 0);
  s.close();
}
{
  const shop = neuerShop({ kasse: 'keine' });
  const s = await starteServer(shop);
  const erg = await lauf({ basis: `http://127.0.0.1:${s.address().port}`, warte: async () => {}, pauseMs: 0, basisMs: 1, pollMs: 0 });
  pruef('echtes HTTP: kaputte Kasse wird gefunden', !erg.ok && /keine Weiterleitung/.test(erg.problems[0]), JSON.stringify(erg.problems));
  s.close();
}

// ---------------------------------------------------------------------------------------------------------------- 10 das ganze Startskript
const SKRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'kaufweg_waechter.mjs');
function startskript(env) {
  return new Promise((fertig) => {
    const k = spawn(process.execPath, [SKRIPT], { env: { PATH: process.env.PATH, KAUFWEG_PAUSE_MS: '0', KAUFWEG_BASIS_MS: '1', ...env } });
    let aus = '';
    k.stdout.on('data', (d) => { aus += d; });
    k.stderr.on('data', (d) => { aus += d; });
    k.on('close', (code) => fertig({ code, aus }));
  });
}
{
  const shop = neuerShop();
  const s = await starteServer(shop);
  const url = `http://127.0.0.1:${s.address().port}`;
  const e = { BASEURL: url, TELEGRAM_BOT_TOKEN: 'TESTTOKEN', TELEGRAM_CHAT_ID: '42', TELEGRAM_BASIS: url };
  const ok = await startskript(e);
  pruef('Startskript: gesunder Shop → Exit 0, keine Telegram-Meldung', ok.code === 0 && shop.st.tg.length === 0 && /Kaufweg in Ordnung/.test(ok.aus), ok.aus.slice(0, 300));
  const immer = await startskript({ ...e, ALWAYS_NOTIFY: '1' });
  pruef('Startskript: ALWAYS_NOTIFY meldet auch «in Ordnung»', immer.code === 0 && shop.st.tg.length === 1 && shop.st.tg[0].chat_id === '42' && /in Ordnung/.test(shop.st.tg[0].text), JSON.stringify(shop.st.tg));
  s.close();
}
{
  const shop = neuerShop({ kasse: 'keine' });
  const s = await starteServer(shop);
  const url = `http://127.0.0.1:${s.address().port}`;
  const e = { BASEURL: url, TELEGRAM_BOT_TOKEN: 'TESTTOKEN', TELEGRAM_CHAT_ID: '42', TELEGRAM_BASIS: url };
  const k = await startskript(e);
  pruef('Startskript: Fehler → Exit 1 und genau eine Telegram-Meldung', k.code === 1 && shop.st.tg.length === 1 && /Kasse/.test(shop.st.tg[0].text), `${k.code} ${JSON.stringify(shop.st.tg)}`);
  pruef('Startskript: Telegram-Adresse enthält den Token, die Meldung nicht', shop.st.aufrufe.some((a) => a === 'POST /botTESTTOKEN/sendMessage') && !JSON.stringify(shop.st.tg).includes('TESTTOKEN'));
  const dry = await startskript({ ...e, DRY: '1' });
  pruef('Startskript: DRY meldet nichts, Exit bleibt 1', dry.code === 1 && shop.st.tg.length === 1, `${dry.code} ${shop.st.tg.length}`);
  const ohne = await startskript({ BASEURL: url });
  pruef('Startskript: ohne Zugangsdaten keine Meldung, Exit 1', ohne.code === 1 && /Keine Telegram-Meldung/.test(ohne.aus) && shop.st.tg.length === 1);
  s.close();
}
{
  const shop = neuerShop({ immer429: true });
  const s = await starteServer(shop);
  const url = `http://127.0.0.1:${s.address().port}`;
  const k = await startskript({ BASEURL: url, TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: '1', TELEGRAM_BASIS: url, KAUFWEG_VERSUCHE: '2' });
  pruef('Startskript: Drosselung → Exit 0, keine Meldung', k.code === 0 && shop.st.tg.length === 0 && /Kein Fehler gefunden/.test(k.aus), k.aus.slice(0, 300));
  s.close();
}
{
  const shop = neuerShop({ zahlung: ['twint', 'klarna'] });
  const s = await starteServer(shop);
  const url = `http://127.0.0.1:${s.address().port}`;
  const k = await startskript({ BASEURL: url, DRY: '1', KAUFWEG_PFLICHT_ZAHLUNG: 'twint,visa', KAUFWEG_PRODUKTE: H3 });
  pruef('Startskript: Umgebung (Pflicht-Zahlung, Produktliste) wirkt', k.code === 1 && /visa fehlt/.test(k.aus) && shop.st.aufrufe.includes(`GET /products/${H3}.js`) && !shop.st.aufrufe.includes(`GET /products/${H1}.js`), k.aus.slice(0, 400));
  s.close();
}

console.log(fehler ? `\n${fehler} FEHLER von ${n}` : `\nalle ${n} Prüfungen grün`);
process.exit(fehler ? 1 : 0);
