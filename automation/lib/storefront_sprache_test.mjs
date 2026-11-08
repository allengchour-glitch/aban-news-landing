import assert from 'node:assert/strict';
import { pruefeDeSeite, pruefeDeText, pruefeFrDeutschDuplikat } from './storefront_sprache.mjs';
import { holeSeiten, MAX_URLS, pruefeSnapshot, seiteAusHtml } from '../storefront_sprache_pruefen.mjs';

let ok = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('englische UI-Phrasen werden blockiert', () => {
  for (const text of ['Add to cart', 'Buy it now', 'Choose options', 'Sold out', 'Search']) {
    assert.equal(pruefeDeText(text, { art: 'ui' }).status, 'BLOCKED', text);
  }
});
test('deutsche UI bleibt erlaubt', () => {
  for (const text of ['In den Warenkorb', 'Jetzt kaufen', 'Optionen wählen', 'Ausverkauft', 'Suche']) {
    assert.equal(pruefeDeText(text, { art: 'ui' }).status, 'OK', text);
  }
});
test('eindeutig englische und gemischte Produkttitel werden blockiert', () => {
  for (const text of [
    'Small Blanket Nap Blanket',
    'Baby Gentleman Jumpsuit aus Baumwolle',
    'Soft Comfort Elefanten-Plüschtier',
    'Spaghetti Strap Jumpsuit für Sport und Yoga',
    'Jellyfish Luftbefeuchter mit Nachtlicht',
    'Wireless Game Handle',
  ]) assert.equal(pruefeDeText(text).status, 'BLOCKED', text);
});
test('übliche deutsche Shop-Titel mit Lehnwörtern schlagen nicht an', () => {
  for (const text of [
    'Gaming-Headset mit Mikrofon',
    'Beauty & Pflege online entdecken',
    'T-Shirt selbst gestalten',
    'Hoodie mit eigenem Foto',
    'USB-C-Ladestation für Controller',
    'Yoga-Set für Damen',
    'Sternenlicht-Projektor fürs Schlafzimmer',
  ]) assert.equal(pruefeDeText(text).status, 'OK', text);
});
test('englische Meta-Beschreibung wird blockiert', () => {
  assert.equal(pruefeDeText('Discover our new blanket collection with selected products.', { art: 'meta' }).status, 'BLOCKED');
});
test('fehlende Felder bleiben unbekannt statt sauber', () => {
  assert.equal(pruefeDeSeite({}).status, 'UNKNOWN');
});
test('deutsche Seite nennt den konkreten blockierten Feldpfad', () => {
  const result = pruefeDeSeite({ title: 'Jellyfish Luftbefeuchter mit Nachtlicht', metaDescription: 'Deutscher Text', h1: 'Luftbefeuchter' });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.blocker[0].feld, 'title');
});
test('/fr/-Kopie mit deutschem Titel, Meta und H1 wird blockiert', () => {
  const de = { title: 'Sommerkleid kaufen', metaDescription: 'Sommerkleid für Damen in der Schweiz entdecken.', h1: 'Sommerkleid für Damen' };
  const fr = { ...de };
  const result = pruefeFrDeutschDuplikat({ de, fr });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.gleich.includes('metaDescription'));
});
test('identischer Eigenname allein blockiert eine gute französische Seite nicht', () => {
  const de = { title: 'LuxeStyle', metaDescription: 'Produkte für die Schweiz entdecken.', h1: 'LuxeStyle' };
  const fr = { title: 'LuxeStyle', metaDescription: 'Découvrez des produits pour la Suisse.', h1: 'LuxeStyle' };
  assert.equal(pruefeFrDeutschDuplikat({ de, fr }).status, 'OK');
});
test('französischer Text ohne deutsche Kopie besteht', () => {
  const fr = { title: 'Robe pour femmes', metaDescription: 'Découvrez notre robe avec livraison en Suisse.', h1: 'Robe élégante' };
  assert.equal(pruefeFrDeutschDuplikat({ fr }).status, 'OK');
});
test('klar deutscher FR-Text wird auch ohne DE-Paar blockiert', () => {
  const fr = { title: 'Produkt für Damen', metaDescription: 'Jetzt in der Schweiz kaufen und in den Warenkorb legen.', h1: 'Produkt entdecken' };
  assert.equal(pruefeFrDeutschDuplikat({ fr }).status, 'BLOCKED');
});
test('Snapshot paart /fr/-URL mit deutschem Pfad und bleibt schreibfrei', () => {
  const result = pruefeSnapshot({ pages: [
    { url: 'https://luxestyle.ch/products/test', locale: 'de', title: 'Tasse selbst gestalten', metaDescription: 'Eigene Tasse gestalten.', h1: 'Tasse gestalten' },
    { url: 'https://luxestyle.ch/fr/products/test', locale: 'fr', title: 'Tasse selbst gestalten', metaDescription: 'Eigene Tasse gestalten.', h1: 'Tasse gestalten' },
  ] });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.blocked, 1);
});
test('HTML-Extraktion liest Title, Meta, H1 und UI ohne Skripte auszuführen', () => {
  const page = seiteAusHtml('https://luxestyle.ch/products/test', `<!doctype html><html lang="de-CH"><head>
    <title>Wireless Game Handle</title><meta content="Discover our products with care." name="description">
    <script>throw new Error('darf nie laufen')</script></head><body><h1>Game Handle</h1><button>Add to cart</button></body></html>`);
  assert.equal(page.locale, 'de-CH');
  assert.equal(page.metaDescription, 'Discover our products with care.');
  assert.deepEqual(page.uiTexts, ['Add to cart']);
  assert.equal(pruefeSnapshot({ pages: [page] }).status, 'BLOCKED');
});
test('Live-Leser begrenzt URLs, bleibt beim Host und macht nur GET', async () => {
  const calls = [];
  const pages = await holeSeiten(['https://luxestyle.ch/products/a'], { fetchFn: async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, url, text: async () => '<html lang="de"><title>Tasse gestalten</title><h1>Tasse gestalten</h1></html>' };
  } });
  assert.equal(pages.length, 1);
  assert.equal(calls[0].init.method, 'GET');
  await assert.rejects(() => holeSeiten(Array.from({ length: MAX_URLS + 1 }, (_, index) => `https://luxestyle.ch/p/${index}`)), /Hoechstens/);
  await assert.rejects(() => holeSeiten(['https://example.org/']), /ausserhalb/);
});
test('HTTP 429 bleibt unbekannt und wird nicht als leere oder 404-Seite ausgegeben', async () => {
  const pages = await holeSeiten(['https://luxestyle.ch/products/a'], { fetchFn: async url => ({
    ok: false, status: 429, url, text: async () => '',
  }) });
  assert.match(pages[0].fetchError, /HTTP 429/);
  const result = pruefeSnapshot({ pages });
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.seiten[0].fehler, 'HTTP 429');
});

for (const [name, fn] of tests) {
  try { await fn(); ok++; console.log(`ok  ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}

if (process.exitCode) console.error(`\n${ok} ok, mindestens ein Fehler`);
else console.log(`\n${ok} ok, 0 Fehler`);
