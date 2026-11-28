// Tatsächlichen Audit-Inlineclient mit erfundenen Katalogantworten ausführen.
// Optional: node functions/_audit_checkout.test.mjs /privat/audit-vorher.html
// Keine Checkout-Klicks, Zahlungen, Anbieter- oder echten Netzaufrufe.
import fs from 'node:fs';
import vm from 'node:vm';
import { setImmediate as weiter } from 'node:timers/promises';

const html = fs.readFileSync(process.argv[2] || new URL('../ki-sichtbarkeit-audit.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const source = scripts.find(m => m[1].includes('AUDIT_BUY_URL') && m[1].includes('buybtn'))?.[1];
const anchor = html.match(/<a\b[^>]*\bid="buybtn"[^>]*>([\s\S]*?)<\/a>/i);
const note = html.match(/<p\b[^>]*\bid="bestellhinweis"[^>]*>([\s\S]*?)<\/p>/i);
if (!source || !anchor || !note) throw new Error('Auditclient oder bestehender Anfrageknopf fehlt.');
const text = s => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const initialHref = text(anchor[0].match(/\bhref="([^"]*)"/i)[1]);
const initialText = text(anchor[1]), initialNote = text(note[1]);
const base = 'https://demo.invalid/ki-sichtbarkeit-audit.html';
const own = { slug: 'ki-sichtbarkeit-audit', buy: 'https://demo.invalid/audit-workbook', price: '29 €' };
let ok = 0, fehler = 0;
function pruefe(wert, name) {
  if (wert) ok++;
  else { fehler++; console.error('FEHLER: ' + name); }
}

async function lauf(katalog, { zentral = '', ohneConfig = false, status = 200, netzfehler = false, jsonfehler = false } = {}) {
  const b = { target: '', rel: '', textContent: initialText, _href: new URL(initialHref, base).href,
    setAttribute(name, value) { this[name] = String(value); },
    removeAttribute(name) { this[name] = ''; } };
  // Wie beim echten HTMLAnchorElement werden auch falsche Werte in URLs umgewandelt.
  Object.defineProperty(b, 'href', {
    get() { return this._href; },
    set(value) {
      try { this._href = new URL(String(value), base).href; }
      catch { this._href = String(value); } // Der Browser wirft beim href-Setzen nicht.
    },
  });
  const hint = { textContent: initialNote }, calls = [];
  const window = ohneConfig ? {} : { ABAN_CHECKOUT: { AUDIT_BUY_URL: zentral } };
  vm.runInNewContext(source, { window, URL,
    document: { getElementById: id => id === 'buybtn' ? b : id === 'bestellhinweis' ? hint : null },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url !== '/data/shop-products.json') throw new Error('Nur die lokale Demo-Katalogantwort ist erlaubt.');
      if (netzfehler) throw new Error('Synthetischer Netzfehler');
      return { ok: status >= 200 && status < 300, status, json: async () => {
        if (jsonfehler) throw new Error('Synthetischer JSON-Fehler');
        return katalog;
      } };
    },
  });
  for (let i = 0; i < 4; i++) await weiter();
  return { b, hint, calls };
}

function anfrage(h, name) {
  pruefe(h.b.href === new URL(initialHref, base).href, name + ': bestehendes Anfrageziel erhalten');
  pruefe(h.b.textContent === initialText, name + ': Anfragetext erhalten');
  pruefe(h.hint.textContent === initialNote, name + ': Zahlungs-/Lieferhinweis nicht unbewiesen geändert');
  pruefe(h.b.target === '' && h.b.rel === '', name + ': keine Checkout-Fensterattribute gesetzt');
  pruefe(h.calls.length <= 1, name + ': kein automatischer Wiederholungsaufruf');
}
function checkout(h, url, name, preis = null) {
  pruefe(h.b.href === new URL(url).href, name + ': genau das bestätigte Kaufziel');
  pruefe(h.b.target === '_blank' && h.b.rel === 'noopener', name + ': vorhandene Fensterattribute');
  pruefe(h.b.textContent === (preis ? 'Workbook holen — ' + preis : 'Zum Workbook-Checkout'), name + ': passender Knopftext');
  pruefe(/Checkout für das Audit-Workbook/.test(h.hint.textContent), name + ': bestehender produktspezifischer Checkout-Hinweis');
}

{
  const h = await lauf([own]);
  checkout(h, own.buy, 'Eindeutiger Katalogeintrag', own.price);
  pruefe(h.calls.length === 1 && h.calls[0].url === '/data/shop-products.json' && h.calls[0].options.cache === 'no-cache', 'Bestehenden einzelnen Katalogabruf erhalten');
}
{
  const h = await lauf([null, 7, 'unbekannte Zeile', [], { slug: 'anderes-produkt', buy: 'https://demo.invalid/anderes' }, own]);
  checkout(h, own.buy, 'Unbrauchbare fremde Zeilen stören eindeutigen eigenen Eintrag nicht', own.price);
}
{
  const h = await lauf([own], { ohneConfig: true });
  checkout(h, own.buy, 'Fehlendes zentrales Configobjekt erlaubt vorhandenen Katalog', own.price);
}
for (const zentral of ['https://demo.invalid/zentral-audit?quelle=demo#kauf', ' https://demo.invalid/zentral-audit ']) {
  const h = await lauf([{ ...own, buy: 'https://demo.invalid/anderer-kataloglink' }], { zentral });
  checkout(h, zentral.trim(), 'Gültiger zentraler Link hat Vorrang');
  pruefe(h.calls.length === 0, 'Gültige zentrale Zuordnung braucht keinen Katalogabruf');
}

for (const [name, katalog] of [
  ['Leerer Katalog', []],
  ['Kein eigenes Produkt', [{ slug: 'anderes-produkt', buy: own.buy }]],
  ['Andere Schreibweise des Slugs', [{ ...own, slug: 'KI-Sichtbarkeit-Audit' }]],
  ['Slug nur als Teilstring', [{ ...own, slug: 'ki-sichtbarkeit-audit-demo' }]],
  ['Falsches Listenformat', { products: [own] }],
  ['Objekt statt Liste', { ...own }],
  ['Null statt Liste', null],
  ['Text statt Liste', 'keine Liste'],
  ['Boolescher Katalog', true],
  ['Zahl statt Katalog', 12],
  ['Fehlender Katalog', undefined],
]) anfrage(await lauf(katalog), name);

for (const [name, second] of [
  ['Widersprüchliches Kaufziel', { ...own, buy: 'https://demo.invalid/anderes-produkt', price: '19 €' }],
  ['Identische doppelte Zeile', { ...own }],
  ['Zweite Zeile ohne Kaufziel', { slug: own.slug, buy: '' }],
  ['Zweite Zeile mit falschem Kaufzieltyp', { slug: own.slug, buy: { url: own.buy } }],
]) {
  for (const katalog of [[own, second], [second, own]]) anfrage(await lauf(katalog), name + ': beide Reihenfolgen');
}

const badTargets = [null, undefined, false, true, 123, {}, [], [own.buy],
  '', '   ', '/anderes-produkt', 'anderes-produkt', '?kauf=1', '#kaufen', '//demo.invalid/anderes-produkt',
  'http://demo.invalid/anderes-produkt', 'mailto:anderes@example.invalid', 'javascript:alert(1)',
  'data:text/plain,nur-demo', 'https://', 'https://demo-user:demo-pass@demo.invalid/audit',
  'https://demo-user@demo.invalid/audit'];
for (const buy of badTargets) {
  anfrage(await lauf([{ ...own, buy }]), 'Ungültiges Katalogkaufziel ' + JSON.stringify(buy));
  anfrage(await lauf([], { zentral: buy }), 'Ungültiger zentraler Link ' + JSON.stringify(buy));
}

for (const price of [undefined, null, '', '   ', 29, true, {}, ['29 €']]) {
  checkout(await lauf([{ ...own, price }]), own.buy, 'Optionaler ungültiger Preis bleibt ohne erfundene Preisbeschriftung');
}
for (const buy of ['https://demo.invalid/audit?plan=workbook#zahlung', 'https://demo.invalid:8443/audit']) {
  checkout(await lauf([{ ...own, buy }]), buy, 'Absolute HTTPS-URLs bleiben zulässig', own.price);
}
for (const status of [401, 403, 404, 429, 500]) anfrage(await lauf([own], { status }), 'HTTP' + status);
anfrage(await lauf([own], { netzfehler: true }), 'Netzfehler');
anfrage(await lauf([own], { jsonfehler: true }), 'JSON-Fehler');

console.log(`${ok} ok, ${fehler} Fehler`);
process.exitCode = fehler ? 1 : 0;
