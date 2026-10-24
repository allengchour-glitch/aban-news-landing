/** Test für den Google-Merchant-Feed-Eintrag.
 *  Die Tag-Sätze und Barcodes unten sind ECHT, am 2026-10-17 aus dem Live-Katalog gelesen.
 *  Lauf: /opt/node22/bin/node automation/lib/gmc_feed_item_test.mjs   */
import { feedItem, pruefeProdukt, kuerzeTitel, escXml, RISIKO, LIZENZ } from './gmc_feed_item.mjs';

let fehler = 0;
const pruef = (name, ist, soll) => {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) { fehler++; console.log(`FAIL ${name}\n     ist  ${JSON.stringify(ist)}\n     soll ${JSON.stringify(soll)}`); }
  else console.log(`ok   ${name}`);
};
const hat = (xml, teil) => String(xml).includes(teil);

const BASIS = {
  id: 'CJYD291530101AZ', titel: 'Sommerkleid ärmellos · Damen', beschreibung: 'Leichtes Sommerkleid.',
  link: 'https://luxestyle.ch/products/sommerkleid', bild: 'https://cdn.shopify.com/a.jpg',
  preis: '29.90', marke: 'LuxeStyle', tags: ['damen', 'kleider', 'bild-ok'],
  googleKategorie: 'Apparel & Accessories > Clothing > Dresses', produktTyp: 'Damenmode',
};

// ── 1. Sperrtags: der eigentliche Grund für dieses Modul ──
// Echte Tag-Sätze von Produkten, die am 17.10. NICHT auf dem Google-Kanal lagen.
const GESPERRT = {
  'Date-Night-Brettspiel': ['18plus', 'adult-nicht-bewerben', 'gaming'],
  'Strumpfhose (GMC-Flag)': ['google-policy-flag', 'nicht-google-bewerben', 'damen'],
  'Mesh-Minikleid': ['adult-nicht-bewerben', 'gmc-adult-pull', 'kleid'],
  'LED-Laser-Scheinwerfer': ['compliance-pruefen', 'nicht-bewerben', 'rueckhol-0907'],
  'Lederriemen': ['harness-google-raus-2026-08-21', 'nicht-bewerben'],
  'Aschenbecher (Tabak)': ['18plus', 'raucher-rueckhol-0809'],
  'Sommerkleid schwach bewertet': ['niedrig-bewertet-nicht-bewerben', 'damen'],
  'IR-Kamera-Stift': ['verdeckte-ueberwachung', 'gadgets'],
};
for (const [name, tags] of Object.entries(GESPERRT)) {
  pruef(`gesperrt: ${name}`, feedItem({ ...BASIS, tags }), null);
  pruef(`gesperrt mit Grund: ${name}`, pruefeProdukt({ ...BASIS, tags }).grund.startsWith('Sperrtag'), true);
}
// Gegenprobe: eine zu breite Regel wäre hier sofort sichtbar.
pruef('harmlose Tags gehen durch', pruefeProdukt(BASIS), { ok: true, grund: 'im Feed' });
pruef('„bild-ok"/„neu"/„sommer-2026" sperren nicht',
  pruefeProdukt({ ...BASIS, tags: ['bild-ok', 'neu', 'sommer-2026', 'beauty'] }).ok, true);

// ── 2. GTIN statt pauschalem identifier_exists:no (der alte Fehler) ──
const mitGtin = feedItem({ ...BASIS, gtin: '4005249012345' });          // echter Widmann-EAN-Aufbau
pruef('GTIN wird gesendet', hat(mitGtin, '<g:gtin>4005249012345</g:gtin>'), true);
pruef('mit GTIN kein identifier_exists', hat(mitGtin, 'identifier_exists'), false);
const mitSku = feedItem({ ...BASIS, sku: 'CJYD291530101AZ' });
pruef('ohne GTIN, mit SKU → mpn', hat(mitSku, '<g:mpn>CJYD291530101AZ</g:mpn>'), true);
pruef('ohne GTIN und ohne SKU → identifier_exists:no',
  hat(feedItem({ ...BASIS, id: 'handle-x' }), '<g:identifier_exists>no</g:identifier_exists>'), true);
// Gegenprobe: Unsinn darf NICHT als GTIN durchgehen.
pruef('zu kurze Nummer ist keine GTIN', hat(feedItem({ ...BASIS, gtin: '12345', sku: 'S1' }), '<g:gtin>'), false);
pruef('Buchstaben sind keine GTIN', hat(feedItem({ ...BASIS, gtin: 'CJ123456789012', sku: 'S1' }), '<g:gtin>'), false);

// ── 3. Preis und Aktionspreis ──
pruef('Preis zweistellig gerundet', hat(feedItem({ ...BASIS, preis: '19.9' }), '<g:price>19.90 CHF</g:price>'), true);
const aktion = feedItem({ ...BASIS, preis: '19.90', vergleichspreis: '29.90' });
pruef('Aktion: price = Listenpreis', hat(aktion, '<g:price>29.90 CHF</g:price>'), true);
pruef('Aktion: sale_price = Verkaufspreis', hat(aktion, '<g:sale_price>19.90 CHF</g:sale_price>'), true);
// Gegenprobe: gleicher oder tieferer Vergleichspreis darf KEINE Aktion erzeugen.
pruef('kein sale_price ohne echte Senkung',
  hat(feedItem({ ...BASIS, preis: '29.90', vergleichspreis: '29.90' }), 'sale_price'), false);
pruef('Preis 0 fliegt raus', feedItem({ ...BASIS, preis: '0' }), null);

// ── 4. Pflichtfelder, die stumm fehlen könnten ──
pruef('ohne Bild kein Eintrag', feedItem({ ...BASIS, bild: '' }), null);
pruef('ohne Link kein Eintrag', feedItem({ ...BASIS, link: '' }), null);
pruef('ohne ID kein Eintrag', feedItem({ ...BASIS, id: '', sku: '', handle: '' }), null);
pruef('Grund wird benannt', pruefeProdukt({ ...BASIS, bild: '' }).grund, 'kein Titelbild');

// ── 5. Marken-/Safety-Risiko (Google sperrt Konten) ──
pruef('Nike im Titel raus', feedItem({ ...BASIS, titel: 'Sporthose im Nike-Stil' }), null);
pruef('Schwimmring raus', feedItem({ ...BASIS, titel: 'Aufblasbarer Schwimmring für Kinder' }), null);
// Gegenprobe: harmlose Wörter, die Teilstrings enthalten, dürfen NICHT greifen.
pruef('„Vanille" ist nicht „vans"', RISIKO.test('Vanille Duftkerze'), false);
pruef('„Pumas" als Wort greift, „Pumpe" nicht', [RISIKO.test('Puma Shirt'), RISIKO.test('Vakuumpumpe')], [true, false]);

// ── 5b. Lizenznamen (Kontosperr-Risiko) ──
// Alle 17 Titel unten sind ECHT, am 2026-10-24 aus der Fortura-Ware gelesen; sie gingen
// vorher ALLE in den Feed, weil `RISIKO` nur `disney|frozen` kannte.
const LIZENZTITEL = [
  'Set Zauberlehrling Harry Potter', 'Harry Potter Besen 90 cm', 'Kostüm Harry Potter',
  'Kostüm Batman Classic', 'Kostüm Batman Dark Knight', 'Kostüm Superman · Widmann Nr. 58026',
  'Kostüm Rubble Paw Patrol', 'Kostüm Marshall Paw Patrol', 'Kostüm Pokemon Pikachu Anzug',
  'Kostüm Pokemon Bulbasaur', 'Kostüm Hello Kitty · Erwachsene', 'Kinderkostüm Super Mario',
  'Plüsch Super Mario', 'Kostüm Sonic Movie für Kinder', 'Plüsch Sonic Classic',
  'Folienballon Mickey Mouse', 'Maske Spiderman', 'Kinderkostüm Peppa Fairy Dress',
  'Kostüm Barbie Rollerblades',
];
for (const titel of LIZENZTITEL) {
  pruef(`Lizenz raus: ${titel}`, feedItem({ ...BASIS, titel }), null);
}
pruef('Lizenz-Grund wird benannt',
  pruefeProdukt({ ...BASIS, titel: 'Kostüm Batman Classic' }).grund, 'Lizenzname: Batman');
// GEGENPROBE IN DIE ANDERE RICHTUNG — ein zu breites Muster würde harmlose Ware stumm
// verschlucken. Genau diese Wörter brachen frühere Muster (`rueckhol`, `/ring\b/`).
const HARMLOS = [
  'Ultrasonic Luftbefeuchter 300 ml', 'Marionette Holzfigur 30 cm', 'Hula-Hoop-Reifen',
  'Annahme-Set für Pakete', 'Elsass-Weinglas 2er-Set', 'Markenlose Sonnenbrille',
  'Supermarkt-Einkaufstasche', 'Batterie-Ladegerät USB-C', 'Kapuzenpullover «Anna-Lena»',
  'Hulahoop Fitness', 'Mikrofon-Ständer', 'Marvellous Duftkerze',
];
for (const titel of HARMLOS) {
  pruef(`harmlos bleibt: ${titel}`, LIZENZ.test(titel), false);
}
pruef('harmloses Kostüm geht durch', pruefeProdukt({ ...BASIS, titel: 'Kostüm Pirat · Erwachsene' }).ok, true);
pruef('„Supermann" ohne Lizenzbezug? → Wortgrenze greift',
  [LIZENZ.test('Superman Kostüm'), LIZENZ.test('Supermanschette')], [true, false]);

// ── 6. XML-Sicherheit und Titellänge ──
pruef('XML wird maskiert', escXml(`Kleid & "Spitze" <neu>`), 'Kleid &amp; &quot;Spitze&quot; &lt;neu&gt;');
pruef('kurzer Titel bleibt', kuerzeTitel('Kurz'), 'Kurz');
const lang = kuerzeTitel('Wort '.repeat(60));
pruef('langer Titel ≤150', lang.length <= 150, true);
pruef('langer Titel endet auf ganzem Wort', /Wort$/.test(lang), true);

// ── 7. Versand (behebt „Missing shipping info in some countries") ──
pruef('Versandblock', hat(feedItem(BASIS, { versandLand: 'CH', versandPreis: 7 }),
  '<g:shipping><g:country>CH</g:country><g:price>7.00 CHF</g:price></g:shipping>'), true);
pruef('ohne Option kein Versandblock', hat(feedItem(BASIS), '<g:shipping>'), false);

// ── 8. Kategorie aus dem Metafeld (wurde vorher nie gesendet) ──
pruef('google_product_category', hat(feedItem(BASIS),
  '<g:google_product_category>Apparel &amp; Accessories &gt; Clothing &gt; Dresses</g:google_product_category>'), true);
pruef('fehlende Kategorie lässt das Feld weg',
  hat(feedItem({ ...BASIS, googleKategorie: '' }), 'google_product_category'), false);

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
