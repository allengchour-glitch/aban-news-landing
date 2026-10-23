/**
 * Ziel-Collection für die Querverweis-Box von `automation/cross_sell.mjs` bestimmen.
 *
 * WARUM ES DIESES MODUL GIBT (gemessen 2026-10-18, 300 aktive Produkte, Trockenlauf):
 * Die Auswahl lief über einen zusammengeklebten String aus allen Tags plus Produkttyp. Darin
 * traf das Muster `schweiz` den **Versand-Tag `schweiz-versand`** — eine Lieferangabe, kein Thema.
 * **79 von 300 Produkten (26 %)** hätten dadurch eine Box nach „Schweizer Editionen" bekommen:
 * Smartwatches, Aromadiffusoren, Taschenradios neben Edelweiss-Stickern und Matterhorn-Postern.
 * Katalogweit tragen **2376 aktive Produkte `schweiz-versand`**, aber nur **228 `schweiz-edition`**
 * — der Fehler hätte also das Zehnfache der echten Schweiz-Ware falsch verlinkt.
 *
 * Dieselbe Fehlerklasse wie `rueckhol` im Google-Sperrmuster: **ein zu breites Muster sieht aus
 * wie ein anderes Ergebnis, nicht wie ein Fehler.** Darum nennt `zielFinden` jetzt den Grund,
 * und der Trockenlauf zählt je Ziel, statt nur eine Gesamtzahl zu melden.
 *
 * Bewusst NICHT geändert: `uhr` in `kategorie-uhr` und `aroma` in `kat-aroma` sind Treffer mitten
 * im Wort, aber **inhaltlich richtig** — es sind Kategorie-Tags. Wortgrenzen zu erzwingen hätte
 * diese 36 richtigen Zuordnungen zerstört. Gemessen, nicht vermutet.
 */

/**
 * Verifizierte Collection-Handles → Label. Die ersten neun am 2026-10-18 live geprüft, die drei
 * neuen (`auto-handy`, `gaming`, `sub-kueche`) am 2026-10-23 — alle HTTP 200.
 * **Nie einen Handle raten:** derselbe Gegencheck gab für `auto-handy-laden` 404 (eine der 16 nie
 * publizierten Dubletten vom 18.10.), und meine geratenen `fuer-ihn`/`wohnen-deko` ebenfalls.
 */
export const ZIELE = {
  schmuck:  ['premium-schmuck', 'Schmuck & Uhren'],
  herren:   ['fur-ihn', 'Für Ihn'],
  damen:    ['damen-mode', 'Damenmode'],
  premium:  ['luxestyle-premium', 'Premium-Marken'],
  wohnen:   ['wohnen-dekoration', 'Wohnen & Deko'],
  gadget:   ['trends-gadgets', 'Trends & Gadgets'],
  schweiz:  ['erste-august', 'Schweiz-Edition'],
  sommer:   ['sommer', 'Sommer'],
  geschenk: ['premium-geschenke', 'Geschenkideen'],
  auto:     ['auto-handy', 'Auto & Handy'],
  gaming:   ['gaming', 'Gaming'],
  kueche:   ['sub-kueche', 'Küche & Kochen'],
};

/**
 * Tags, die eine Liefer- oder Ablaufangabe sind und kein Thema. Bewusst eng: nur `versand`,
 * weil genau dieser Tag den Fehlfund erzeugt hat. Ein Tag wie `cj-nicht-versendbar-ch` bleibt
 * erhalten — er enthält „versendbar", nicht „versand".
 */
export const NICHT_THEMA = /(^|-)versand(-|$)/;

/**
 * Nur die Schweiz-EDITION ist ein Thema, nicht die Schweiz als Lagerort — und auch nicht die
 * Darreichungsform. GEMESSEN 2026-10-23 im aeltesten Katalogteil (600 aktive Produkte,
 * Trockenlauf): 331 von 373 Zuordnungen gingen nach „Schweiz-Edition", davon **265 allein
 * wegen des Wortes `sticker`** und 21 wegen `poster` — nur 45 wegen `schweiz-edition`.
 * Beleg: „Kiss-Cut Aufkleber – Selbst gestalten" (Tags printful_personalized_product,
 * sg-accessoires, wunschdesign) haette einen Link auf die 1.-August-Collection bekommen.
 * Ein Aufkleber, ein Poster oder ein Mauspad ist eine Form, kein Thema; dass die Poster in
 * genau dieser Region schweizerisch sind, ist Zufall der Region, keine Regel.
 * Dieselbe Fehlerklasse wie `schweiz-versand` darueber und `rueckhol` im Google-Sperrmuster:
 * **ein zu breites Muster sieht aus wie ein anderes Ergebnis, nicht wie ein Fehler.**
 * Echte Schweiz-Ware traegt ohnehin `schweiz-edition` oder einen Motivnamen — die bleiben drin.
 * Ohne Thema faellt so ein Produkt in den Rueckfall und bekommt unter NUR_THEMA gar keine Box:
 * keine Box ist besser als eine falsche.
 */
const SCHWEIZ_EDITION = /schweiz-edition|edelweiss|matterhorn|alphorn|fondue|raclette|grueezi|mundart/;

/**
 * Autozubehör: das BLANKE Tag `auto` zählt, nicht jedes Tag, in dem „auto" vorkommt.
 * `themenTags` fügt die Tags mit Leerzeichen zusammen, darum ist `(^| )auto( |$)` genau das
 * ganze Tag. GEMESSEN 2026-10-23: ohne diese Wortgrenze träfe das Muster auch die
 * Chargen-Markierung `auto-entwurf-0926` (3223 Produkte, 30 davon aktiv) und
 * `duplikat-auto-draft` — Haushaltsmarkierungen, kein Thema. Am Katalog nachgezählt richtet
 * das heute keinen Schaden an (alle 30 aktiven `auto-entwurf-0926` landen anderswo oder sind
 * schon verlinkt), aber die Wortgrenze kostet nichts und hält, wenn die nächste Charge kommt.
 * Dieselbe Klasse wie `schweiz-versand` und `rueckhol` — nur diesmal vorher gemessen.
 */
const AUTO = /(^| )auto( |$)|auto-zubehoer|autoschluessel|autowaesche|autoladegeraet|kfz|motorrad/;

/**
 * Spielkonsolen-Zubehör. `konsole` braucht die Wortgrenze, sonst trifft es `mittelkonsole`
 * (Auto-Innenraum) — darum steht die Auto-Regel ohnehin davor.
 */
const GAMING = /gaming|(^| )konsole( |$)|ps4|ps5|xbox|nintendo/;

/**
 * GEMESSEN 2026-10-23 im Fenster ab 25.07. (3000 aktive Produkte, Trockenlauf): von 776
 * Zuordnungen nach „Trends & Gadgets" kamen **544 über `elektronik`** (echte Elektronik,
 * richtig), aber **118 über `auto`** (Sitzbezüge, Lenkradbezüge, Autoschlüssel-Etuis),
 * **99 über `gadget`** (ausnahmslos PS4/PS5/Xbox-Controller) und **5 über `haushalt`**
 * (Latte-Art-Kännchen, Teekannen-Set). Für alle drei gibt es eine eigene, live geprüfte
 * Collection — ein Lenkradbezug unter „Trends & Gadgets" ist kein falscher Link, aber ein
 * schwacher. Die Küchen-Regel steht ABSICHTLICH NACH `gadget`: so behält ein Gerät mit
 * `elektronik`-Tag sein Ziel, und nur echtes Geschirr ohne Elektronik-Tag landet in der Küche.
 */
const REGELN = [
  ['schmuck', /schmuck|ring|kette|armband|ohrring|halskette|uhr/],
  ['herren',  /herren|männer|manner|mann\b/],
  ['schweiz', SCHWEIZ_EDITION],
  ['wohnen',  /diffuser|aroma|wohnen|deko|kissen|lampe|beleuchtung|kerze/],
  ['auto',    AUTO],
  ['gaming',  GAMING],
  ['gadget',  /gadget|tech|elektronik/],
  ['kueche',  /küche|kueche|kochen|haushalt|geschirr/],
  ['sommer',  /sommer|bikini|bademode|strand/],
  ['damen',   /damen|kleid|rock|bluse|mode/],
  ['premium', /highend|premium|luxus|bigbuy/],
];

/** Die Tags, über die überhaupt entschieden werden darf, plus Produkttyp — kleingeschrieben. */
export function themenTags(tags, produktTyp) {
  const sauber = (tags || []).filter((t) => !NICHT_THEMA.test(String(t).toLowerCase()));
  return (sauber.join(' ') + ' ' + (produktTyp || '')).toLowerCase().trim();
}

/**
 * @returns {{schluessel:string, handle:string, label:string, grund:string}}
 *          `grund` nennt das Wort, das entschieden hat — damit ein Trockenlauf prüfbar ist.
 */
export function zielFinden(tags, produktTyp) {
  const heu = themenTags(tags, produktTyp);
  for (const [schluessel, muster] of REGELN) {
    const treffer = heu.match(muster);
    if (treffer) {
      const [handle, label] = ZIELE[schluessel];
      return { schluessel, handle, label, grund: treffer[0] };
    }
  }
  const [handle, label] = ZIELE.geschenk;
  return { schluessel: 'geschenk', handle, label, grund: 'kein Thema erkannt' };
}
