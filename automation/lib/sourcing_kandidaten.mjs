/**
 * Urteil: darf dieses gesperrte Produkt eine CJ-Lieferantensuche bekommen?
 *
 * WARUM (gemessen 2026-10-23): elf von elf Erstattungen des Shops hatten den Grund „nicht
 * lieferbar" (siehe automation/lib/lieferbarkeit.mjs). Der Wächter dort findet die Sperre,
 * kann sie aber nicht aufheben — er setzt das Produkt nur auf DRAFT. `product/sourcing/create`
 * ist der Gegenzug: CJ sucht einen Lieferanten für ein benanntes Produkt. Seit dem
 * Prime-Abo (23.10.2026) stehen 25 Anfragen am Tag statt 5, und die Endpunkt-Quote des Kontos
 * ist unbegrenzt (`setting/get` meldet `quotaLimit: -1`).
 *
 * EINE ANFRAGE IST NICHT UMSONST UND NICHT STILL: sie geht an CJs Einkauf, ein Mensch sieht
 * sie, und das Tagesbudget ist klein. Darum entscheidet dieses Modul, nicht der Lauf.
 *
 * DIE WICHTIGSTE REGEL IST DIE ZURÜCKHALTUNG, und sie kostet absichtlich die beste Nachfrage:
 * das **Fuda Taschenmesser** ist das einzige Produkt, das ZWEIMAL gekauft wurde (#1016, #1017,
 * je CHF 40.90) — und bekommt trotzdem keine Anfrage. CJ schickte es als verbotenen Artikel
 * zurück; ob eine Klinge in die Schweiz darf, entscheidet das Waffenrecht und nicht die
 * Logistik. Ein anderer Lieferant ändert daran nichts. Dasselbe gilt für Lizenz- und
 * Erwachsenenware. Solche Fälle bekommen `nurMitEntscheid` und landen im Bericht, nie in einer
 * Anfrage.
 *
 * ZWEI MUSTER-FALLEN, in beide Richtungen gegengeprüft (Tests):
 *   1. Ein zu breites Klingen-Muster. `messer` ohne Wortgrenze trifft „Messgerät" nicht, aber
 *      `saege` als Teilwort und `klinge` in „Klingelschild". Darum Wortgrenzen und eine kurze,
 *      belegte Liste statt Fantasie — dieselbe Lehre wie `rueckhol-0907` im Merchant-Feed und
 *      `sticker` in den Querverweisen: ein zu breites Muster sieht aus wie ein anderes
 *      Ergebnis, nicht wie ein Fehler.
 *   2. Markennamen als Teilwort. `intex` steckt in „Textilreiniger" nicht, `denver` nirgends —
 *      aber ohne Wortgrenze träfe `bona` („BONA Classics") auch „Carbonat". Markenware braucht
 *      ohnehin einen Entscheid: ein „ähnliches" Xiaomi ist kein Xiaomi.
 *
 * Eine fehlende Marge ist KEIN Ausschluss, sondern ein eigener Grund: findet CJ einen
 * günstigeren Lieferanten, wird aus einem `marge-verlust`-Entwurf verkäufliche Ware.
 */

/**
 * Klingen und Waffen: Entscheid des Waffenrechts, nicht der Logistik.
 *
 * ZUERST STAND HIER EINE WORTGRENZE VORNE — und sie war falsch. Deutsche Zusammensetzungen
 * tragen das Klingenwort am ENDE: „SchalenSÄGE", „TaschenMESSER". Mit `(^|[^a-z])säge` fiel
 * die „Schalensäge für Fisch" durch die Prüfung (Test rot). Darum bindet das Muster HINTEN:
 * das Klingenwort muss ein Wort beenden, eine deutsche Endung oder ein bekanntes Anhängsel
 * tragen. Das hält „Klingelschild" (klinge + l), „Beilage" (beil + a) und „messerscharf"
 * draussen und fängt „Messerset", „Äxte", „Schalensäge".
 */
export const KLINGE_MUSTER = /(messer|s(?:ä|ae)ge|klinge|schwert|machete|dolch|axt|beil|armbrust|wurfstern|schlagring)(n|s|e|chen|set|sets|block|bloecke|blöcke)?([^a-zà-ÿ]|$)/i;
const KLINGE_TAGS = ['handklinge-kein-ch-versand', 'messer-outdoor', 'outdoor-messer'];

/** Rechtlich heikel: Lizenz, Erwachsene, Überwachung, Medizin, Tabak. */
const HEIKEL_TAGS = ['lizenz-nicht-bewerben', 'adult-nicht-bewerben', '18plus', 'gmc-adult-pull',
  'verdeckte-ueberwachung', 'medizinprodukt-pruefen', 'compliance-pruefen', 'geprueft-gesperrt-0410',
  'raucher-rueckhol-0809', 'us-netzteil-110v'];

/** Marken: ein „ähnliches" Produkt ist eine andere Ware. Braucht einen Entscheid. */
export const MARKE_MUSTER = /(^|[^a-zà-ÿ])(xiaomi|denver|intex|ksix|nibosi|bona|apple|samsung|sony|bosch|philips|dyson|nintendo|playstation|ps4|ps5|xbox|lego|disney|pokemon|harry potter|batman|paw patrol)([^a-zà-ÿ]|$)/i;

/** Sperrgründe, gegen die eine Lieferantensuche überhaupt etwas ausrichten kann. */
const SPERRE_TAGS = ['cj-nicht-versendbar-ch', 'nicht-lieferbar-ch', 'ausverkauft-lieferant',
  'cj-entfernt', 'ohne-ek-cj-weg', 'bigbuy-paket-ausgelaufen', 'lager-unbekannt-draft'];

/** Sperrig: der Frachtpreis frisst die Marge, egal welcher Lieferant. */
const SPERRIG_TAGS = ['nicht-live-moebel-sperrig'];

const hat = (tags, liste) => (tags || []).some(t => liste.includes(String(t).toLowerCase()));
const trifft = (text, muster) => muster.test(' ' + String(text || '') + ' ');

/**
 * @param {object} p Produkt
 *   p.titel       Produkttitel
 *   p.tags        Shopify-Tags
 *   p.bild        URL des Hauptbildes (CJ verlangt ein Bild — ohne Bild keine Anfrage)
 *   p.preis       Verkaufspreis
 *   p.ek          Einkaufspreis (optional)
 *   p.bestellt    true, wenn das Produkt schon einmal bezahlt und erstattet wurde
 *   p.cjEntfernt  true, wenn CJ das Produkt selbst ausgelistet hat
 * @returns {{anfragen:boolean, nurMitEntscheid:boolean, grund:string, rang:number}}
 *   rang: je kleiner, je dringender (1 = schon bezahlt worden)
 */
export function sourcingUrteil(p = {}) {
  const tags = (p.tags || []).map(t => String(t).toLowerCase());
  const titel = p.titel || '';
  const nein = (grund, entscheid = false) =>
    ({ anfragen: false, nurMitEntscheid: entscheid, grund, rang: 99 });

  if (hat(tags, KLINGE_TAGS) || trifft(titel, KLINGE_MUSTER))
    return nein('klinge-waffenrecht', true);
  if (hat(tags, HEIKEL_TAGS)) return nein('rechtlich-heikel', true);
  if (trifft(titel, MARKE_MUSTER)) return nein('markenware', true);
  if (hat(tags, SPERRIG_TAGS)) return nein('sperrig-fracht');
  if (!p.bild) return nein('kein-bild');

  const gesperrt = hat(tags, SPERRE_TAGS) || p.cjEntfernt === true;
  if (!gesperrt) return nein('nicht-gesperrt');

  const preis = Number(p.preis), ek = Number(p.ek);
  const margeKaputt = Number.isFinite(preis) && Number.isFinite(ek) && ek > 0 && ek >= preis;

  if (p.bestellt === true)
    return { anfragen: true, nurMitEntscheid: false, grund: 'schon-bezahlt-und-erstattet', rang: 1 };
  if (margeKaputt)
    return { anfragen: true, nurMitEntscheid: false, grund: 'guenstigeren-lieferanten-suchen', rang: 3 };
  return { anfragen: true, nurMitEntscheid: false, grund: 'gesperrt-ersatz-suchen', rang: 2 };
}

/** Sortiert und schneidet auf das Tagesbudget zu. Stabil: gleicher Rang → Titel. */
/**
 * Die Marge in Franken, oder null, wenn eine der beiden Zahlen fehlt.
 *
 * Absichtlich der ABSOLUTE Betrag und nicht die Prozentmarge: das Tagesbudget ist eine Zahl von
 * Anfragen, nicht ein Anteil. Eine Anfrage, die 86 Franken je Stück frei macht, ist mehr wert
 * als eine, die 70 Prozent auf 7 Franken frei macht. Fehlt eine Zahl, wird nicht geraten.
 */
export function marge(p = {}) {
  const vk = Number(p.preis);
  const ek = Number(p.ek);
  if (!Number.isFinite(vk) || !Number.isFinite(ek)) return null;
  return vk - ek;
}

export function auswahl(produkte, max) {
  const offen = (produkte || [])
    .map(p => ({ p, u: sourcingUrteil(p) }))
    .filter(x => x.u.anfragen)
    .sort((a, b) => {
      if (a.u.rang !== b.u.rang) return a.u.rang - b.u.rang;
      // Innerhalb eines Rangs die grössere Marge zuerst; ohne Zahlen bleibt es beim Titel,
      // damit die Reihenfolge stabil und nachvollziehbar ist.
      const ma = marge(a.p), mb = marge(b.p);
      if (ma !== null && mb !== null && ma !== mb) return mb - ma;
      if (ma !== null && mb === null) return -1;
      if (ma === null && mb !== null) return 1;
      return String(a.p.titel).localeCompare(String(b.p.titel));
    });
  const deckel = Number.isFinite(Number(max)) ? Math.max(0, Number(max)) : offen.length;
  return offen.slice(0, deckel);
}
