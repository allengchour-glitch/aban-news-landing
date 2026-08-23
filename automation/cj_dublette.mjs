// cj_dublette.mjs — EINE Dubletten-Wache für alle CJ-Importer.
//
// ⚠️ 23.08.2026. Der Katalog-Audit fand 484 aktive Produkte, die sich einen Titel mit einem
// anderen aktiven Produkt teilen (352 davon im Google-Kanal) — bei 84 von 232 datierbaren
// Gruppen sind ALLE Mitglieder seit dem 01.08. entstanden. Die Klasse wächst also täglich.
// Die Ursache steckte in zwei Ebenen:
//
// 1. `cj_category_fill.mjs` hatte eine Handle-Wache, aber ihr Muster verlangte ZIFFERN als
//    Suffix (`^slug-\d+$`). Der Handle-Bau hängt `String(pid).slice(-6)` an, und CJs pid ist
//    nicht immer eine Zahl: Bei einer UUID-pid endet der Handle auf HEX. So entstanden
//    «Make-up Pinselset, 10-teilig» (…-155840) und «Make-up Pinselset (10-teilig)»
//    (…-c71e9b) — beide aktiv, beide CHF 15.90, beide im Google-Kanal.
// 2. `cj_sku_import.mjs` und `cj_trending_import.mjs` hatten GAR KEINE Handle-Wache, nur eine
//    `title:"…"`-Suche. Genau die ist unzuverlässig: Shopify tokenisiert Bindestriche nicht,
//    «Keramik Futternapf» findet «Keramik-Futternapf» nicht (Lehre 20.08.).
//
// Fünfte Wiederholung der Geschwister-Lehre nach Farbtabelle, Preisformel, Grössenliste und
// publishVerified(). NEUE DUBLETTEN-REGELN NUR HIER.

// Der Stamm, den alle drei Importer für den Handle benutzen: slugifizierter Titel, 46 Zeichen.
// ⚠️ Eine Wache, die anders normalisiert als der Erzeuger, prüft eine Zeichenkette, die es
// nie gibt (dritter Akt, 20.08.: gesucht «…-blumen-landschaft», im Shop «…-blumen-lands-166720»).
export const slugStamm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 46);

// Slugs, die der LAUFENDE Prozess schon vergeben hat. Shopifys `query:`-Suche liest den
// Suchindex, der Sekunden bis Minuten nachhinkt: die beiden «DIY Digital-Ölgemälde» vom
// 20.08. entstanden 47 Sekunden auseinander im selben Lauf — die zweite Prüfung sah die
// erste noch nicht. Der lokale Merker kennt sie sofort.
export const laufSlugs = new Set();

// Als Dublette gilt nur `<stamm>-<suffix ohne Bindestrich>`. Ein längerer Slug
// («…-erhohte-position») ist ein ANDERES Produkt — sonst erschlüge «Kissen» auch
// «Kissenbezug» (Regel vom 20.08., unverändert).
const DUP = stamm => new RegExp('^' + stamm + '-[0-9a-z]{4,10}$');

/** Gibt den Titel eines aktiven Doppelgängers zurück, sonst null.
 *  `sgql` ist die GraphQL-Funktion des aufrufenden Importers (Token bereits gesetzt). */
export async function dubletteFinden(sgql, st, title) {
  const stamm = slugStamm(title);
  if (stamm.length <= 8) return null;
  if (laufSlugs.has(stamm)) return '(im selben Lauf angelegt)';
  const hq = await sgql(st, `query($q:String!){products(first:25,query:$q){edges{node{handle title}}}}`,
                        { q: `handle:${stamm}* status:active` });
  const treffer = (hq?.data?.products?.edges || []).find(e => DUP(stamm).test(e.node.handle));
  return treffer ? treffer.node.title : null;
}

export function slugMerken(title) {
  const s = slugStamm(title);
  if (s.length > 8) laufSlugs.add(s);
}
