/** Test für lib/hero_bild_wahl.mjs (Wahl des Kategorie-Bildes im hero_image_guard).
 *  Lauf: /opt/node22/bin/node automation/lib/hero_bild_wahl_test.mjs   */
import { ausschlussGrund, waehleBildProdukt, entscheid, exitCode, HERO_SPERR_TAGS, MIN_KANTE } from './hero_bild_wahl.mjs';
let fehler = 0, n = 0;
const pruef = (name, ok, extra = '') => { n++; if (!ok) { fehler++; console.log(`FAIL ${name} ${extra}`); } else console.log(`ok   ${name}`); };

const P = (x = {}) => ({ handle: 'p', status: 'ACTIVE', onlineStoreUrl: 'https://luxestyle.ch/products/p', tags: [],
  featuredImage: { url: 'https://cdn.shopify.com/a.jpg', width: 1200, height: 1200 }, variants: { nodes: [{ availableForSale: true }] }, ...x });

// 1. Das gute Produkt taugt
pruef('aktiv, online, lieferbar, grosses Bild → taugt', ausschlussGrund(P()) === null);
// 2. Jede Bedingung einzeln (Gegenproben)
pruef('Entwurf → nicht-aktiv', ausschlussGrund(P({ status: 'DRAFT' })) === 'nicht-aktiv');
pruef('archiviert → nicht-aktiv', ausschlussGrund(P({ status: 'ARCHIVED' })) === 'nicht-aktiv');
pruef('ohne Onlineshop-Adresse → nicht-im-onlineshop', ausschlussGrund(P({ onlineStoreUrl: null })) === 'nicht-im-onlineshop');
pruef('alle Varianten nicht lieferbar → nicht-lieferbar', ausschlussGrund(P({ variants: { nodes: [{ availableForSale: false }, { availableForSale: false }] } })) === 'nicht-lieferbar');
pruef('keine Varianten gelesen → nicht-lieferbar (unbekannt ist kein Ja)', ausschlussGrund(P({ variants: { nodes: [] } })) === 'nicht-lieferbar');
pruef('availableForSale fehlt → nicht-lieferbar', ausschlussGrund(P({ variants: { nodes: [{}] } })) === 'nicht-lieferbar');
pruef('eine von zwei Varianten lieferbar → taugt', ausschlussGrund(P({ variants: { nodes: [{ availableForSale: false }, { availableForSale: true }] } })) === null);
pruef('ohne Titelbild → ohne-bild', ausschlussGrund(P({ featuredImage: null })) === 'ohne-bild');
pruef('Bild ohne Adresse → ohne-bild', ausschlussGrund(P({ featuredImage: { width: 2000, height: 2000 } })) === 'ohne-bild');
pruef(`Breite unter ${MIN_KANTE} → bild-zu-klein`, ausschlussGrund(P({ featuredImage: { url: 'u', width: MIN_KANTE - 1, height: 2000 } })) === 'bild-zu-klein');
pruef(`Höhe unter ${MIN_KANTE} → bild-zu-klein`, ausschlussGrund(P({ featuredImage: { url: 'u', width: 2000, height: MIN_KANTE - 1 } })) === 'bild-zu-klein');
pruef(`genau ${MIN_KANTE} × ${MIN_KANTE} → taugt`, ausschlussGrund(P({ featuredImage: { url: 'u', width: MIN_KANTE, height: MIN_KANTE } })) === null);
pruef('Masse unbekannt → bild-zu-klein (unbekannt ist kein Ja)', ausschlussGrund(P({ featuredImage: { url: 'u' } })) === 'bild-zu-klein');
pruef('leeres Produkt → leer', ausschlussGrund(null) === 'leer');

// 3. Sperr-Tags (jede Liste aus sperr_tags.mjs + Bildbefunde), auch in anderer Schreibweise
for (const t of ['adult-nicht-bewerben', 'stecker-nicht-ch', 'lizenz-nicht-bewerben', 'fortura', 'google-bild-abgelehnt', 'bild-zu-klein', 'cj-ausgelistet']) {
  pruef(`Sperr-Tag ${t} → ausgeschlossen`, ausschlussGrund(P({ tags: ['x', t] })) === `sperr-tag:${t}`);
}
pruef('Sperr-Tag in Grossschreibung → ausgeschlossen', String(ausschlussGrund(P({ tags: ['Google-Bild-Abgelehnt'] }))).startsWith('sperr-tag:'));
pruef('gewöhnliche Tags sperren nicht', ausschlussGrund(P({ tags: ['cj-real', 'sort-kissen', 'bewerben'] })) === null);
pruef('Teilwort sperrt nicht («fortura-ähnlich» ist kein Tag fortura)', ausschlussGrund(P({ tags: ['fortura-aehnlich'] })) === null);
pruef('Sperrliste enthält die Bildbefunde', ['google-bild-abgelehnt', 'bild-zu-klein', 'cj-ausgelistet'].every(t => HERO_SPERR_TAGS.includes(t)));

// 4. Reihenfolge: das ERSTE taugliche Produkt der Collection, Gründe gezählt
{
  const r = waehleBildProdukt([P({ handle: 'd', status: 'DRAFT' }), P({ handle: 'f', tags: ['fortura'] }), P({ handle: 'gut1' }), P({ handle: 'gut2' })]);
  pruef('überspringt Entwurf und Sperr-Tag, nimmt das erste taugliche', r.produkt?.handle === 'gut1', JSON.stringify(r));
  pruef('zählt die Ablehnungen', r.abgelehnt['nicht-aktiv'] === 1 && r.abgelehnt['sperr-tag'] === 1, JSON.stringify(r.abgelehnt));
}
{
  const r = waehleBildProdukt([P({ status: 'DRAFT' }), P({ onlineStoreUrl: '' })]);
  pruef('kein taugliches → produkt null', r.produkt === null && r.abgelehnt['nicht-aktiv'] === 1 && r.abgelehnt['nicht-im-onlineshop'] === 1, JSON.stringify(r));
}
pruef('leere Liste → produkt null', waehleBildProdukt([]).produkt === null && waehleBildProdukt(undefined).produkt === null);

// 5. Entscheid je Collection: nie überschreiben
pruef('Collection mit Bild → hat-bild (auch wenn ein taugliches Produkt da ist)',
  entscheid({ image: { url: 'x' }, products: { nodes: [P()] } }).art === 'hat-bild');
pruef('Collection ohne Bild, taugliches Produkt → setzen', (() => { const e = entscheid({ image: null, products: { nodes: [P({ handle: 'q' })] } }); return e.art === 'setzen' && e.produkt.handle === 'q'; })());
pruef('Collection ohne Bild, nur Entwürfe → kein-taugliches-produkt', entscheid({ image: null, products: { nodes: [P({ status: 'DRAFT' })] } }).art === 'kein-taugliches-produkt');
pruef('Collection nicht gefunden → fehlt', entscheid(null).art === 'fehlt');
pruef('Bild-Objekt ohne Adresse zählt als ohne Bild', entscheid({ image: {}, products: { nodes: [P()] } }).art === 'setzen');

// 6. Exit-Code: Fehler sind sichtbar
pruef('sauberer Lauf → 0', exitCode({ menuCollections: 5, leseFehler: [], schreibFehler: [] }) === 0);
pruef('Menü nicht lesbar → 1', exitCode({ menuError: 'x', menuCollections: 0 }) === 1);
pruef('Menüfehler auch bei schon gesammelten Collections → 1', exitCode({ menuError: 'x', menuCollections: 5, leseFehler: [], schreibFehler: [] }) === 1);
pruef('Menü ohne Collections → 1 (Wächter hätte nichts geprüft)', exitCode({ menuCollections: 0, leseFehler: [], schreibFehler: [] }) === 1);
pruef('Lesefehler → 1', exitCode({ menuCollections: 5, leseFehler: [{}], schreibFehler: [] }) === 1);
pruef('Schreibfehler → 1', exitCode({ menuCollections: 5, leseFehler: [], schreibFehler: [{}] }) === 1);

console.log(`\n${n - fehler} von ${n} Prüfungen bestanden`);
if (fehler) process.exit(1);
