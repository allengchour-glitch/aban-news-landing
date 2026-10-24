/** Test fuer sourcingUrteil und auswahl — reine Funktionen, keine Netzaufrufe.
 *  Lauf: /opt/node22/bin/node automation/lib/sourcing_kandidaten_test.mjs
 *
 *  Die Gegenprobe in die ANDERE Richtung ist hier die wichtigere: eine Anfrage geht an
 *  einen Menschen bei CJ und das Tagesbudget ist klein. Zu breit verbrennt es; zu eng laesst
 *  bezahlte Nachfrage liegen. Beides wird geprueft, dazu beide Muster-Fallen (Klinge, Marke). */
import { sourcingUrteil, auswahl, marge } from './sourcing_kandidaten.mjs';
let fehler = 0;
const pruef = (n, ok, extra = '') => { if (!ok) { fehler++; console.log(`FAIL ${n} ${extra}`); } else console.log(`ok   ${n}`); };
const bild = 'https://cdn.shopify.com/x.jpg';

// ── Richtung 1: echte Kandidaten muessen durchkommen ────────────────────────────────
// Der Halloween-Schaukelgeist (#1019, CHF 17.90) wurde bezahlt und erstattet, CJ hat ihn
// selbst ausgelistet.
{ const u = sourcingUrteil({ titel: 'Leuchtender Halloween-Schaukelgeist', tags: ['cj-entfernt', 'cj-real'],
    bild, preis: 17.9, ek: 9.5, bestellt: true });
  pruef('bezahlt + erstattet → Anfrage, Rang 1', u.anfragen && u.rang === 1, JSON.stringify(u)); }
// Gesperrt, aber gesunde Marge: Ersatz suchen.
{ const u = sourcingUrteil({ titel: 'Duftende Mini-Teelichter', tags: ['cj-nicht-versendbar-ch'],
    bild, preis: 15.9, ek: 5.61 });
  pruef('gesperrt + Marge ok → Anfrage, Rang 2', u.anfragen && u.rang === 2, JSON.stringify(u)); }
// Kaputte Marge ist KEIN Ausschluss, sondern ein eigener Grund.
{ const u = sourcingUrteil({ titel: 'Geschenkset Pflegeset', tags: ['ausverkauft-lieferant'],
    bild, preis: 32.0, ek: 63.78 });
  pruef('EK ueber VK → guenstigeren Lieferanten suchen', u.anfragen && u.grund === 'guenstigeren-lieferanten-suchen', JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'Mobile Klimaanlage', tags: ['nicht-lieferbar-ch', 'bigbuy'],
    bild, preis: 265.9, ek: 180, bestellt: true });
  pruef('BigBuy-Ausfall, bezahlt → Anfrage', u.anfragen && u.rang === 1, JSON.stringify(u)); }

// ── Richtung 2: GEGENPROBE — was keine Anfrage bekommen darf ────────────────────────
// Das Taschenmesser ist die STAERKSTE Nachfrage im Shop (zweimal bezahlt) und bleibt
// trotzdem draussen. Wird diese Zeile rot, ist die Zurueckhaltung kaputt.
{ const u = sourcingUrteil({ titel: 'Fuda Taschenmesser aus Damaststahl',
    tags: ['cj-nicht-versendbar-ch', 'handklinge-kein-ch-versand'], bild, preis: 40.9, ek: 20, bestellt: true });
  pruef('Taschenmesser trotz zwei Kaeufen → KEINE Anfrage, Entscheid', !u.anfragen && u.nurMitEntscheid && u.grund === 'klinge-waffenrecht', JSON.stringify(u)); }
// Auch ohne Klingen-Tag muss der Titel reichen.
{ const u = sourcingUrteil({ titel: 'Schalensäge für Fisch', tags: ['cj-nicht-versendbar-ch'], bild, preis: 31.9, ek: 21.11 });
  pruef('Saege nur am Titel erkannt → KEINE Anfrage', !u.anfragen && u.grund === 'klinge-waffenrecht', JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'Kopfhörer mit Mikrofon Xiaomi Buds 6 Active',
    tags: ['ausverkauft-lieferant'], bild, preis: 33.9, ek: 25, bestellt: true });
  pruef('Markenware trotz Kauf → Entscheid statt Anfrage', !u.anfragen && u.grund === 'markenware', JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'PS5-Controller Hülle', tags: ['cj-nicht-versendbar-ch', 'lizenz-nicht-bewerben'], bild, preis: 29.9 });
  pruef('Lizenzware → Entscheid', !u.anfragen && u.nurMitEntscheid, JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'IR-Nachtsicht-Kamera-Stift', tags: ['verdeckte-ueberwachung', 'nicht-lieferbar-ch'], bild, preis: 59.9 });
  pruef('Ueberwachung → rechtlich heikel', !u.anfragen && u.grund === 'rechtlich-heikel', JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'Schuhschrank mit Sitzbank', tags: ['cj-nicht-versendbar-ch', 'nicht-live-moebel-sperrig'], bild, preis: 281.9 });
  pruef('sperriges Moebel → kein Lieferantenwechsel hilft', !u.anfragen && u.grund === 'sperrig-fracht', JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'Wäschekorb aus Bambus', tags: ['cj-nicht-versendbar-ch'], bild: null, preis: 298.9 });
  pruef('ohne Bild → CJ verlangt ein Bild', !u.anfragen && u.grund === 'kein-bild', JSON.stringify(u)); }
// Gesunde, aktive Ware darf NIE eine Anfrage ausloesen.
{ const u = sourcingUrteil({ titel: 'Abendkleid «Sirène»', tags: ['cj-real', 'damen', 'rueckhol-0907'], bild, preis: 79.9, ek: 30 });
  pruef('nicht gesperrt → keine Anfrage', !u.anfragen && u.grund === 'nicht-gesperrt', JSON.stringify(u)); }

// ── Die zwei Muster-Fallen, beide Richtungen ────────────────────────────────────────
// Zu breit: ein Teilwort darf nicht treffen. „Messgeraet" hat kein „messer", aber
// „Klingelschild" enthaelt „klinge" und „Carbonat" enthaelt „bona".
{ const u = sourcingUrteil({ titel: 'Klingelschild aus Messing', tags: ['cj-nicht-versendbar-ch'], bild, preis: 19.9, ek: 8 });
  pruef('Klingelschild ist keine Klinge', u.anfragen, JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'Calciumcarbonat-Pulver', tags: ['cj-nicht-versendbar-ch'], bild, preis: 12.9, ek: 4 });
  pruef('Carbonat ist keine Marke BONA', u.anfragen, JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'Textilreiniger Spray', tags: ['ausverkauft-lieferant'], bild, preis: 14.9, ek: 5 });
  pruef('Textilreiniger ist kein Intex', u.anfragen, JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'Digitales Messgerät für Längen', tags: ['cj-nicht-versendbar-ch'], bild, preis: 24.9, ek: 9 });
  pruef('Messgeraet ist kein Messer', u.anfragen, JSON.stringify(u)); }
// Zusammensetzungen: das Klingenwort steht im Deutschen am ENDE. Vorher band das Muster
// vorne und liess „Schalensaege" durch — diese vier Zeilen halten beide Richtungen fest.
{ const u = sourcingUrteil({ titel: 'Messerset 5-teilig', tags: ['cj-nicht-versendbar-ch'], bild, preis: 49.9, ek: 20 });
  pruef('Messerset → Klinge erkannt', !u.anfragen && u.grund === 'klinge-waffenrecht', JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'Beilagenteller aus Porzellan', tags: ['cj-nicht-versendbar-ch'], bild, preis: 18.9, ek: 7 });
  pruef('Beilagenteller ist keine Axt', u.anfragen, JSON.stringify(u)); }
{ const u = sourcingUrteil({ titel: 'Messerscharfe Bildqualität Monitor', tags: ['cj-nicht-versendbar-ch'], bild, preis: 199, ek: 120 });
  pruef('messerscharf ist kein Messer', u.anfragen, JSON.stringify(u)); }

// Zu eng: die Marke muss am Wortanfang eines Titels greifen.
{ const u = sourcingUrteil({ titel: 'BONA Classics Damen Laufschuhe', tags: ['ausverkauft-lieferant'], bild, preis: 46.9, ek: 37.72 });
  pruef('BONA am Titelanfang → Markenware', !u.anfragen && u.grund === 'markenware', JSON.stringify(u)); }

// ── auswahl: Reihenfolge und Tagesbudget ────────────────────────────────────────────
{ const liste = [
    { titel: 'Zebra Teelicht', tags: ['cj-nicht-versendbar-ch'], bild, preis: 15.9, ek: 5 },
    { titel: 'Alpha Klimaanlage', tags: ['nicht-lieferbar-ch'], bild, preis: 265.9, ek: 180, bestellt: true },
    { titel: 'Beta Pflegeset', tags: ['ausverkauft-lieferant'], bild, preis: 32, ek: 63.78 },
    { titel: 'Fuda Taschenmesser', tags: ['handklinge-kein-ch-versand'], bild, preis: 40.9, bestellt: true },
  ];
  const a = auswahl(liste, 10).map(x => x.p.titel);
  pruef('Bezahltes zuerst, Klinge nie dabei', a[0] === 'Alpha Klimaanlage' && a.length === 3 && !a.includes('Fuda Taschenmesser'), JSON.stringify(a));
  pruef('Tagesbudget schneidet zu', auswahl(liste, 2).length === 2);
  pruef('Budget 0 → nichts', auswahl(liste, 0).length === 0);
  // Gegenprobe: gleicher Rang muss stabil sortiert sein, sonst ist ein Lauf nicht wiederholbar.
  const b = auswahl(liste, 10).map(x => x.p.titel);
  pruef('zweimal dieselbe Reihenfolge', JSON.stringify(a) === JSON.stringify(b)); }

// --- Reihenfolge nach Marge (ergänzt 24.10.2026) ---------------------------------
// Warum: das Tagesbudget ist eine Zahl von Anfragen. Vorher entschied das Alphabet, welche
// gesperrten Produkte die 25 Anfragen bekommen — ein Pinselset vor einem Koffer. Gegenprobe
// in beide Richtungen: der Rang schlägt weiter die Marge, und fehlende Zahlen werfen nichts weg.
{
  const g = (titel, preis, ek) => ({ titel, tags: ['cj-nicht-versendbar-ch'], bild, preis, ek });

  pruef('Marge rechnet VK minus EK', marge({ preis: '325.90', ek: '239.16' }).toFixed(2) === '86.74');
  pruef('Marge ohne EK ist null', marge({ preis: '25.90' }) === null);
  pruef('Marge ohne Zahlen ist null', marge({}) === null);

  const nachMarge = auswahl([g('Zebra-Koffer', 325.9, 239.16), g('Aal-Pinselset', 25.9, 7.83)], 5);
  pruef('grössere Marge zuerst, nicht das Alphabet', nachMarge[0].p.titel === 'Zebra-Koffer');

  // Gegenprobe: ein bestelltes Produkt (Rang 1) bleibt vor einer viel grösseren Marge in Rang 2.
  const bestellt = { titel: 'Schwingerhose', tags: ['ausverkauft-lieferant'], bild,
    bestellt: true, preis: 61.9, ek: 37.29 };
  const mitRang = auswahl([g('Zebra-Koffer', 325.9, 239.16), bestellt], 5);
  pruef('Rang schlägt die Marge', mitRang[0].p.titel === 'Schwingerhose');

  // Gegenprobe: ohne Zahlen wird nichts verworfen, es rutscht nur nach hinten.
  const ohneZahlen = auswahl([g('Aal-ohne-Zahlen'), g('Zebra-mit-Marge', 100, 10)], 5);
  pruef('ohne Zahlen bleibt dabei, aber hinten',
    ohneZahlen.length === 2 && ohneZahlen[0].p.titel === 'Zebra-mit-Marge');
}

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
