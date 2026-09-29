// _katalog_audit.mjs — die Pruefer des Katalog-Audits, EINE Quelle fuer beide Seiten:
//   * tools/katalog_audit.mjs     (Kommandozeile + Selbsttests)
//   * functions/api/shop-check.js (oeffentliche Seite am Cloudflare-Rand)
// Liegt in functions/, weil Cloudflare Pages nur von dort ausliefert. Dateien mit
// fuehrendem _ sind gemeinsame Module und werden NICHT als eigene Route veroeffentlicht.

/**
 * katalog_audit.mjs — prueft den Katalog eines BELIEBIGEN Shopify-Shops auf Defekte,
 * die Geld kosten — ohne Zugangsdaten, nur aus oeffentlichen Daten.
 *
 *   node tools/katalog_audit.mjs --selbsttest
 *   node tools/katalog_audit.mjs luxestyle.ch
 *   node tools/katalog_audit.mjs luxestyle.ch --seiten 5 --json bericht.json
 *
 * WARUM ES DIESES GERAET GIBT
 * GEMESSEN 2026-09-29: `https://<shop>/products.json` liefert auf JEDEM Shopify-Shop
 * HTTP 200 (geprueft an luxestyle.ch, gymshark.com, allbirds.com) — mit Titel, Optionen,
 * Varianten, Preis, `compare_at_price`, SKU und Bildern. Ein Katalogfehler laesst sich
 * damit von aussen belegen, ohne dass der Haendler irgendetwas freigibt.
 *
 * WAS ES FINDET (jeder Befund ist woertlich zitierbar, nicht geschaetzt)
 *  1. rohe_variante        Lieferantentext im Variantennamen (`Set20-YellowLXS`, `BlackS`)
 *  2. fremdsprache         englische Variantenwerte in einem deutschsprachigen Shop
 *  3. streichpreis_defekt  `compare_at_price` <= `price` — der durchgestrichene Preis ist
 *                          nicht hoeher, also ist die Ersparnis keine. In CH/EU heikel.
 *  4. gleiche_ware_preis   Varianten, die sich NUR in der Farbe unterscheiden, kosten
 *                          verschieden viel — ohne Groessen- oder Ausstattungsgrund
 *  5. ohne_bild            Produkt ohne ein einziges Bild
 *  6. doppelter_titel      zwei Produkte mit exakt demselben Titel
 *
 * DREI HAUSREGELN, die als Gegenprobe im Selbsttest stehen
 *  - HTTP 429/430/503 heisst „warte", nicht „Shop hat nichts". (Lehre 20.09.2026)
 *  - Jedes Muster braucht eine Wortgrenze. `/schal/` fing „Wasserschale"; `3to4` wurde
 *    zu `3to 4`. Darum muss JEDER Sucher eine Gegenprobe haben, die NICHT ausschlaegt.
 *  - Ein nicht gepruefter Wert ist UNBEKANNT, nicht „in Ordnung".
 */

export const GEDROSSELT = new Set([429, 430, 503]);

/** Englische Farbwoerter, die in einem deutschsprachigen Shop nichts verloren haben. */
export const ENGLISCHE_FARBEN = [
  'red', 'blue', 'green', 'yellow', 'grey', 'gray', 'black', 'white', 'pink',
  'purple', 'brown', 'orange', 'beige', 'navy', 'gold', 'silver',
];

/** Deutsche Farbwoerter — sie duerfen NIE als Fremdsprache gelten. */
export const DEUTSCHE_FARBEN = [
  'rot', 'blau', 'gruen', 'grün', 'gelb', 'grau', 'schwarz', 'weiss', 'weiß',
  'rosa', 'lila', 'braun', 'orange', 'beige', 'gold', 'silber',
];

/** Sieht der Shop deutschsprachig aus? Entschieden an den TITELN, nicht geraten. */
export function istDeutsch(titel) {
  if (!Array.isArray(titel) || titel.length === 0) return null; // unbekannt, nicht false
  const marker = /(\b(?:für|und|mit|aus|der|die|das|zum|zur|ohne)\b)|[äöüß]/i;
  const treffer = titel.filter((t) => marker.test(String(t))).length;
  return treffer / titel.length >= 0.3;
}

/**
 * Lieferantentext im Variantennamen?
 * Zwei Kennzeichen, beide aus echten Faellen dieses Repos:
 *  a) Set-/Artikelcode:  `Set20-YellowLXS`, `Set 3-GreenSXL`, `JJF106230color-`
 *  b) angeklebte Groesse: ein Grossbuchstaben-Groessencode direkt an einem Kleinbuchstaben
 *     (`BlackS`, `GreyLXS`, `FatherS`) — mit Leerzeichen davor ist es sauber (`Rot · Papa S`).
 */
export function istRoheVariante(wert) {
  if (typeof wert !== 'string' || wert.trim() === '') return false;
  const s = wert.trim();
  if (/\bSet\s?\d+\s?[-–]/i.test(s)) return true;
  if (/\b[A-Z]{2,}\d{3,}/.test(s)) return true;
  if (/[a-zäöü](?:XS|S|M|L|XL|XXL|XXXL|\dXL)(?![a-zäöüß])/.test(s)) return true;
  return false;
}

/** Englischer Farbwert in einem deutschen Shop? Wortgrenze ist Pflicht. */
export function istFremdsprachigeFarbe(wert) {
  if (typeof wert !== 'string') return false;
  const s = wert.toLowerCase();
  for (const d of DEUTSCHE_FARBEN) {
    if (new RegExp(`(^|[^a-zäöüß])${d}([^a-zäöüß]|$)`, 'i').test(s)) return false;
  }
  for (const e of ENGLISCHE_FARBEN) {
    if (e === 'orange' || e === 'beige' || e === 'gold') continue; // in beiden Sprachen gleich
    if (new RegExp(`(^|[^a-z])${e}([^a-z]|$)`, 'i').test(s)) return true;
  }
  return false;
}

/** Franken/Euro als Zeichenkette -> ganzzahlig in Rappen/Cent. `null` bleibt `null`. */
export function zuRappen(p) {
  if (p === null || p === undefined || p === '') return null;
  const n = Number(String(p).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/**
 * Streichpreis-Defekt: `compare_at_price` ist gesetzt, aber NICHT hoeher als der Preis.
 * Dann ist die angezeigte Ersparnis keine. Nicht gesetzt = kein Befund (nicht „Defekt").
 */
export function istStreichpreisDefekt(preis, streich) {
  const p = zuRappen(preis);
  const s = zuRappen(streich);
  if (p === null || s === null) return false;
  return s <= p;
}

/**
 * Gibt es einen sichtbaren GRUND fuer einen Preisunterschied — Groesse, Menge oder Bundle?
 *
 * ⚠️ Die Mengenregel kam aus einem ECHTEN FEHLALARM (29.09.2026): der „Digitale
 * Praezisions-Messschieber" wurde mit 22.90 bis 96.90 als Defekt gemeldet. Nachgesehen an
 * der Kundenseite heissen die Varianten `Schwarz`, `Schwarz · 2 Stück`, `· 3 Stück`,
 * `· 5 Stück` — die Stueckzahl erklaert den Preis vollstaendig. Ohne diese Regel meldet
 * das Geraet jeden Mengenrabatt als Defekt, und ein Bericht voller Fehlalarme ist
 * schlimmer als keiner.
 */
export function hatPreisgrund(wert) {
  if (typeof wert !== 'string') return false;
  // Groesse
  if (/(^|[^A-Za-z])(XS|S|M|L|XL|XXL|XXXL|\dXL)([^A-Za-z]|$)/.test(wert)) return true;
  if (/\b\d{2,3}\s?(cm|mm|ml|l|kg|g|zoll|inch)\b/i.test(wert)) return true;
  if (/\b(klein|mittel|gross|grösse|groesse|size|small|medium|large)\b/i.test(wert)) return true;
  // Menge und Bundle
  if (/\b\d+\s?(stück|stueck|st\.|pcs|pieces|paar|pair|pack|set)\b/i.test(wert)) return true;
  if (/\b\d+er(\s?-?\s?(set|pack))?\b/i.test(wert)) return true;
  if (/\bset\s?\d+\b/i.test(wert)) return true;
  return false;
}

/** Alter Name, damit nichts bricht, das ihn schon benutzt. */
export const hatGroesse = hatPreisgrund;

/**
 * Traegt der Wert ueberhaupt ein Farbwort — egal ob deutsch oder englisch?
 *
 * ⚠️ ZUSAMMENGESETZTE FARBEN waren zuerst ein Fehlalarm (29.09.2026, an einem FREMDEN
 * Shop gefunden): `sandrot` und `rasengrün` SIND Farben, wurden aber nicht erkannt, weil
 * die Pruefung einen Wortanfang verlangte. Das ist die Wortgrenzen-Falle in umgekehrter
 * Richtung — zu streng statt zu locker. Ein Farbwort darf hier also auch MITTEN im Wort
 * stehen. Die Richtung ist bewusst grosszuegig: dieser Test UNTERDRUECKT Befunde, also
 * kostet ein Treffer zu viel nur einen entgangenen Befund, ein Treffer zu wenig aber
 * einen falschen Vorwurf an einen fremden Shop.
 */
export const FARBWOERTER = [...DEUTSCHE_FARBEN, ...ENGLISCHE_FARBEN, 'bunt', 'transparent',
  'multicolor', 'mehrfarbig', 'khaki', 'türkis', 'tuerkis', 'turquoise', 'sky', 'wine',
  'rose', 'creme', 'cream', 'ivory', 'nude', 'oliv', 'olive', 'bordeaux', 'anthrazit',
  'marine', 'petrol', 'flieder', 'senf', 'koralle', 'coral', 'mint', 'lila', 'violett'];

export function istFarbwert(wert) {
  if (typeof wert !== 'string') return false;
  const s = wert.toLowerCase();
  return FARBWOERTER.some((f) => f.length >= 3 && s.includes(f));
}

/**
 * Option heisst „Farbe", traegt aber gar keine Farben.
 *
 * ⚠️ ECHTER FALL (29.09.2026, an der Kundenseite nachgesehen): „Smart LED Schranklicht"
 * hat die Option `Farbe` mit den Werten `Human body induction`, `Hand sweep clock`,
 * `Hand sweep timing` und `Set` (51.90 statt 19.90). Wer dort eine Farbe zu waehlen
 * glaubt, waehlt in Wahrheit ein anderes Produkt. Dasselbe beim „Wasserhahnfilter":
 * unter `Farbe` stehen `Filter element` und `Sliver`.
 * Dieselbe Klasse wie die Familien-Pyjamas vom 12.09.2026, wo die ganze Variantenmatrix
 * in EINER Option namens „Farbe" steckte.
 *
 * Entschieden wird an der MEHRHEIT der Werte, nicht an einem einzelnen — ein Lieferanten-
 * Tippfehler soll kein ganzes Produkt anklagen.
 */
export function optionFarbeOhneFarben(option) {
  const name = typeof option === 'string' ? option : option?.name ?? '';
  if (!/^(farbe|color|colour|farben)$/i.test(String(name).trim())) return false;
  const werte = (option?.values ?? []).map(String).filter((w) => w && w !== 'Default Title');
  if (werte.length === 0) return false;
  const mitFarbe = werte.filter(istFarbwert).length;
  return mitFarbe * 2 < werte.length; // weniger als die Haelfte traegt ein Farbwort
}

/**
 * Heisst die Option selbst schon nach einem Preisgrund? Dann ist sie einer.
 * `Farbe` und `Color` erklaeren einen Preisunterschied NICHT.
 */
export function optionIstPreisgrund(name) {
  if (typeof name !== 'string') return false;
  const w = name.replace(/\s+/g, '').toLowerCase();
  return /(grösse|groesse|grosse|größe|size|menge|anzahl|stück|stueck|länge|laenge|length|ausführung|ausfuehrung|variante|modell|model|typ|type|style|set|paket|bundle|kapazität|kapazitaet|volumen|gewicht|material)/.test(w);
}

/**
 * Gleiche Ware, verschiedene Preise — nur wenn WIRKLICH nichts ausser der Farbe variiert.
 *
 * ⚠️ ZWEI ECHTE FEHLALARME (29.09.2026) haben diese Regel erzwungen, beide an der
 * Kundenseite nachgesehen statt geglaubt:
 *  - „Trachtensocken" unterscheidet `39-42` und `43-46` — Schuhgroessen OHNE Einheit,
 *    die kein Einheitenmuster faengt.
 *  - „Rizinusöl-Wickel" hat eine ZWEITE Option: `Bauchwickel` gegen `Set Bauch + Nacken`.
 *    Ein Set kostet zu Recht mehr.
 * Daraus die belastbare Regel: **mehr als eine Option = es variiert mehr als die Farbe**,
 * und eine Option, die nach Groesse, Menge oder Ausfuehrung heisst, erklaert sich selbst.
 * Am Variantentext zu raten war der Fehler.
 */
export function gleicheWareVerschiedenePreise(produkt) {
  const varianten = Array.isArray(produkt) ? produkt : (produkt?.variants ?? []);
  const optionen = Array.isArray(produkt) ? [] : (produkt?.options ?? []);
  if (!Array.isArray(varianten) || varianten.length < 2) return null;

  // 1. Mehr als eine Option: etwas anderes als die Farbe variiert.
  if (optionen.length > 1) return null;
  // 2. Die eine Option heisst schon nach einem Preisgrund.
  const namen = optionen.map((o) => (typeof o === 'string' ? o : o?.name ?? ''));
  if (namen.some(optionIstPreisgrund)) return null;
  // 3. Groesse, Menge oder Bundle steht im Variantentext.
  if (varianten.some((v) => hatPreisgrund(v.title))) return null;
  // 4. Zahlenbereich wie `39-42` ist eine Groessenangabe ohne Einheit.
  if (varianten.some((v) => /\b\d{2,3}\s?[-–]\s?\d{2,3}\b/.test(String(v.title ?? '')))) return null;
  // 5. ⚠️ Die entscheidende Verschaerfung (29.09.2026, erzwungen von einem FREMDEN Shop):
  //    Ein Preisunterschied ist nur dann unerklaert, wenn JEDE Variante wirklich eine
  //    FARBE ist. Heissen die Werte `Glass`, `Steel` oder `BOOST`, dann unterscheidet
  //    sich die Ware selbst — das ist der Befund `option_farbe_ohne_farben`, nicht dieser.
  //    Ohne diese Regel meldete das Geraet bei einem gepflegten Shop 15 Preisdefekte.
  if (!varianten.every((v) => istFarbwert(String(v.title ?? '')))) return null;

  const preise = varianten.map((v) => zuRappen(v.price)).filter((p) => p !== null);
  if (preise.length < 2) return null;
  const min = Math.min(...preise);
  const max = Math.max(...preise);
  if (max === min) return null;
  return { min: min / 100, max: max / 100, spanne: (max - min) / 100 };
}

/**
 * Eine Seite oeffentlicher Katalogdaten holen. Drosselung wird als solche gemeldet.
 *
 * ⚠️ Ein NICHT ERREICHBARER Shop darf das Geraet nicht mit einem Stacktrace beenden
 * (gemessen 29.09.2026 an `de.mrmarvis.com`: `getaddrinfo ENOTFOUND` riss den Lauf ab).
 * Wer Fremden erlaubt, eine beliebige Adresse einzugeben, bekommt beliebige Adressen.
 */
export async function holeSeite(shop, seite, limit = 250, hole = fetch) {
  const url = `https://${shop.replace(/^https?:\/\//, '').replace(/\/$/, '')}/products.json?limit=${limit}&page=${seite}`;
  let antwort;
  try {
    antwort = await hole(url, { headers: { 'user-agent': 'Mozilla/5.0 (Katalog-Audit)' } });
  } catch (fehler) {
    return { art: 'unerreichbar', status: null, grund: String(fehler?.cause?.code ?? fehler?.message ?? fehler), produkte: [] };
  }
  if (GEDROSSELT.has(antwort.status)) return { art: 'gedrosselt', status: antwort.status, produkte: [] };
  if (!antwort.ok) return { art: 'fehler', status: antwort.status, produkte: [] };
  try {
    const daten = await antwort.json();
    return { art: 'ok', status: antwort.status, produkte: Array.isArray(daten.products) ? daten.products : [] };
  } catch {
    // Kein JSON = kein Shopify-Shop. Das ist ein Befund ueber die Adresse, kein Absturz.
    return { art: 'kein_shopify', status: antwort.status, produkte: [] };
  }
}

/** Der eigentliche Pruefer. Bekommt fertige Produkte, damit er ohne Netz testbar ist. */
export function pruefe(produkte) {
  const deutsch = istDeutsch(produkte.map((p) => p.title));
  const befunde = [];
  const titelZaehler = new Map();

  for (const p of produkte) {
    const titel = String(p.title ?? '');
    titelZaehler.set(titel, (titelZaehler.get(titel) ?? 0) + 1);

    if (!Array.isArray(p.images) || p.images.length === 0) {
      befunde.push({ art: 'ohne_bild', titel, handle: p.handle, beleg: 'keine Bilder' });
    }

    const varianten = Array.isArray(p.variants) ? p.variants : [];
    for (const v of varianten) {
      const wert = String(v.title ?? '');
      if (wert === 'Default Title') continue;
      if (istRoheVariante(wert)) {
        befunde.push({ art: 'rohe_variante', titel, handle: p.handle, beleg: wert });
      } else if (deutsch === true && istFremdsprachigeFarbe(wert)) {
        befunde.push({ art: 'fremdsprache', titel, handle: p.handle, beleg: wert });
      }
      if (istStreichpreisDefekt(v.price, v.compare_at_price)) {
        befunde.push({
          art: 'streichpreis_defekt', titel, handle: p.handle,
          beleg: `Preis ${v.price}, durchgestrichen ${v.compare_at_price}`,
        });
      }
    }

    for (const o of (Array.isArray(p.options) ? p.options : [])) {
      if (optionFarbeOhneFarben(o)) {
        const werte = (o.values ?? []).filter((w) => w !== 'Default Title');
        befunde.push({
          art: 'option_farbe_ohne_farben', titel, handle: p.handle,
          beleg: `Option „${o.name}" mit ${werte.slice(0, 3).map((w) => `„${w}"`).join(', ')}`,
        });
      }
    }

    const spanne = gleicheWareVerschiedenePreise(p);
    if (spanne) {
      befunde.push({
        art: 'gleiche_ware_preis', titel, handle: p.handle,
        beleg: `${spanne.min.toFixed(2)} bis ${spanne.max.toFixed(2)} ohne Groessenunterschied`,
      });
    }
  }

  for (const [titel, anzahl] of titelZaehler) {
    if (anzahl > 1) befunde.push({ art: 'doppelter_titel', titel, handle: null, beleg: `${anzahl}x derselbe Titel` });
  }

  const nachArt = {};
  for (const b of befunde) nachArt[b.art] = (nachArt[b.art] ?? 0) + 1;
  const betroffen = new Set(befunde.map((b) => b.handle).filter(Boolean)).size;
  return { deutsch, produkte: produkte.length, befunde, nachArt, betroffeneProdukte: betroffen };
}

export function bericht(ergebnis, shop) {
  const z = [];
  z.push(`Katalog-Audit ${shop}`);
  z.push(`  Produkte geprueft: ${ergebnis.produkte}`);
  z.push(`  Shopsprache deutsch: ${ergebnis.deutsch === null ? 'unbekannt' : ergebnis.deutsch ? 'ja' : 'nein'}`);
  z.push(`  Produkte mit Befund: ${ergebnis.betroffeneProdukte}`);
  const namen = {
    rohe_variante: 'Rohe Lieferantentexte im Variantennamen',
    fremdsprache: 'Englische Farbwerte im deutschsprachigen Shop',
    streichpreis_defekt: 'Durchgestrichener Preis nicht hoeher als der Preis',
    gleiche_ware_preis: 'Gleiche Ware, verschiedene Preise (kein Groessengrund)',
    ohne_bild: 'Produkt ohne Bild',
    doppelter_titel: 'Doppelter Produkttitel',
    option_farbe_ohne_farben: 'Option heisst „Farbe", enthaelt aber keine Farben',
  };
  for (const [art, anzahl] of Object.entries(ergebnis.nachArt).sort((a, b) => b[1] - a[1])) {
    z.push(`  ${String(anzahl).padStart(5)}  ${namen[art] ?? art}`);
    for (const b of ergebnis.befunde.filter((x) => x.art === art).slice(0, 3)) {
      z.push(`         z. B. ${b.titel} -> ${b.beleg}`);
    }
  }
  return z.join('\n');
}

