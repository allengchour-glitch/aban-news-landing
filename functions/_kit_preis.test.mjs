// Originalclient mit erfundenem DOM/Katalog ausführen; keine Netz- oder Anbieteraufrufe.
import fs from 'node:fs';
import vm from 'node:vm';
import { setImmediate as weiter } from 'node:timers/promises';

const quelle = fs.readFileSync(process.argv[2] || new URL('../js/kit-preis.js', import.meta.url), 'utf8');
let anzahl = 0, fehler = 0;
function pruefe(wert, text) {
  anzahl++;
  if (!wert) { fehler++; console.error('FEHLER: ' + text); }
}

function kasten(slug = 'demo', mitKnopf = true) {
  const knopf = {
    href: 'https://example.invalid/alter-checkout', target: '_blank', rel: 'noopener',
    textContent: 'Alter Titel — CHF 19',
    removeAttribute(name) { delete this[name]; },
  };
  const attrs = { 'data-kit-slug': slug, 'aria-label': 'Alter Titel kaufen' };
  return {
    knopf, attrs,
    getAttribute(name) { return attrs[name]; },
    setAttribute(name, wert) { attrs[name] = wert; },
    querySelector() { return mitKnopf ? knopf : null; },
  };
}

async function lauf(liste, { kaesten = [kasten()], ok = true, netzfehler = false, jsonfehler = false } = {}) {
  const aufrufe = [];
  vm.runInNewContext(quelle, {
    document: { querySelectorAll: () => kaesten },
    fetch: async (url, optionen) => {
      aufrufe.push({ url, optionen });
      if (netzfehler) throw new Error('Nur synthetischer Netzfehler');
      return { ok, json: async () => {
        if (jsonfehler) throw new Error('Nur synthetischer JSON-Fehler');
        return liste;
      } };
    },
  });
  await weiter();
  return { kaesten, aufrufe };
}

function unveraendert(k, fall) {
  pruefe(k.knopf.href === 'https://example.invalid/alter-checkout', fall + ': Ziel erhalten');
  pruefe(k.knopf.textContent === 'Alter Titel — CHF 19', fall + ': Text erhalten');
  pruefe(k.knopf.target === '_blank', fall + ': Fensterziel erhalten');
  pruefe(k.attrs['aria-label'] === 'Alter Titel kaufen', fall + ': Beschriftung erhalten');
}

for (const slug of ['demo', 'demo & mehr/ä']) {
  const ziel = kasten(slug), fremd = kasten('andere-branche');
  const { aufrufe } = await lauf([{ slug, title: 'Neues Kit', price: 'CHF 14', buy: '' }], { kaesten: [ziel, fremd] });
  pruefe(ziel.knopf.href === '/shop.html#kit-' + encodeURIComponent(slug), 'Leerziel: interner Produktanker');
  pruefe(!('target' in ziel.knopf) && !('rel' in ziel.knopf), 'Leerziel: kein neues Checkoutfenster');
  pruefe(ziel.knopf.textContent === 'Neues Kit im Shop ansehen', 'Leerziel: kein alter Kaufpreis');
  pruefe(ziel.attrs['aria-label'] === 'Neues Kit im Shop ansehen', 'Leerziel: passende Beschriftung');
  unveraendert(fremd, 'Anderes Produkt');
  pruefe(aufrufe.length === 1 && aufrufe[0].url === '/data/shop-products.json', 'Nur ein eigener Katalogabruf');
  pruefe(aufrufe[0].optionen.cache === 'no-cache', 'Katalog frisch abgleichen');
}

for (const titel of [undefined, null, '']) {
  const { kaesten } = await lauf([{ slug: 'demo', title: titel, buy: '' }]);
  pruefe(kaesten[0].knopf.href === '/shop.html#kit-demo', 'Leerziel bleibt auch ohne Titel zurückgezogen');
  pruefe(kaesten[0].knopf.textContent === 'Dieses Kit im Shop ansehen', 'Neutraler Titel ohne alte Preiszusage');
}

for (const start of [kasten(), (() => { const k = kasten(); k.knopf.href = '/shop.html#kit-demo'; return k; })()]) {
  await lauf([{ slug: 'demo', title: 'Aktuelles Kit', price: 'CHF 12.95', buy: 'https://example.invalid/neuer-checkout' }], { kaesten: [start] });
  pruefe(start.knopf.href === 'https://example.invalid/neuer-checkout', 'Passendes Kaufziel aktualisiert');
  pruefe(start.knopf.textContent === 'Aktuelles Kit — CHF 12.95', 'Titel und Centpreis aktualisiert');
  pruefe(start.knopf.target === '_blank' && start.knopf.rel === 'noopener', 'Kaufziel mit ursprünglichen Linkattributen');
  pruefe(start.attrs['aria-label'] === 'Aktuelles Kit kaufen', 'Kaufbeschriftung aktualisiert');
}

const bestaetigt = { slug: 'demo', title: 'Demo', price: 'CHF 14', buy: '' };
for (const [name, liste, optionen] of [
  ['Netzfehler', [bestaetigt], { netzfehler: true }],
  ['HTTP-Fehler', [bestaetigt], { ok: false }],
  ['JSON-Fehler', [bestaetigt], { jsonfehler: true }],
  ['Fehlender Eintrag', [{ ...bestaetigt, slug: 'anderes-kit' }], {}],
  ['Leere Liste', [], {}],
  ['Keine Liste', { length: 1 }, {}],
  ['Null', null, {}],
  ['Fehlender Kaufbeleg', [{ slug: 'demo' }], {}],
  ['Ungültiger Kaufbeleg', [{ ...bestaetigt, buy: null }], {}],
  ['Boolescher Kaufbeleg', [{ ...bestaetigt, buy: false }], {}],
  ['Leerzeichen als Kaufziel', [{ ...bestaetigt, buy: ' ' }], {}],
  ['Doppelte Zuordnung', [bestaetigt, { ...bestaetigt, buy: 'https://example.invalid/anderes' }], {}],
  ['Unbekannter Preis', [{ ...bestaetigt, buy: 'https://example.invalid/neu', price: null }], {}],
]) {
  const { kaesten } = await lauf(liste, optionen);
  unveraendert(kaesten[0], name);
}

const ohne = await lauf([bestaetigt], { kaesten: [] });
pruefe(ohne.aufrufe.length === 0, 'Seite ohne Kaufkasten lädt keinen Katalog');
const gut = kasten();
await lauf([null, bestaetigt], { kaesten: [kasten('demo', false), gut] });
pruefe(gut.knopf.href === '/shop.html#kit-demo', 'Leerer Listeneintrag und Kasten ohne Knopf stören gültige Zuordnung nicht');

console.log(`${anzahl - fehler} ok, ${fehler} Fehler`);
process.exitCode = fehler ? 1 : 0;
