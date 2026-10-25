# LuxeStyle: verlustfreie Menü-Migrationszuordnung

**Status: lokaler Entwurf, nicht angewendet.** Vorhandene archivierte Quellen vom 25.10.2026 wiederverwendet. Keine Connectorabfrage, kein neuer Seitenabruf, keine Shopänderung und keine neue Prototypfunktion.

Die Sicherung enthält jedes Linkvorkommen des gerenderten Desktopheaders mit ursprünglichem Titel, exaktem Ziel, DOM-Pfad und sichtbarer Hierarchie. Die JSON-Datei bewahrt die Originalzeichen; dieser Bericht verwendet Titel ohne Emojis. Eine native Shopify-Menüquelle mit ID, Handle und Eintrags-IDs ist lokal nicht bestätigt. Aussagen zur Vollständigkeit gelten deshalb ausschliesslich für diese archivierten Darstellungen.

| Gegenstand | Belegter Umfang |
|---|---|
| Bisheriger JSON-Auszug | 13 Hauptlinks + 201 verschachtelte Collectionlinks = 214 Einträge; 191 eindeutige Ziele |
| Vollständiger archivierter Desktopheader | 218 Linkvorkommen; 195 eindeutige Ziele; Ebenen 1/2/3: 13/174/31 |
| Zusätzlich gesicherte Nicht-Collectionlinks | Selbst gestalten, Ratgeber, Alle Kategorien, Schnell finden |
| Archivierter Mobilheader | 196 Linkvorkommen, 181 eindeutige Ziele; keine zusätzlichen Ziele gegenüber Desktop |
| Desktopziele ohne mobile href | 14; Darstellung und mögliche Eltern-Trigger separat prüfen |
| Bisherige lokale Vorschau | 44 Einstiege; kein vollständiges Migrationsmenü |
| Vorgeschlagene Zuordnung | 204 Vorkommen einem der sechs Bereiche zugeordnet; 14 Platzierungen ausdrücklich offen |

Alle 195 ursprünglichen Desktopziele bleiben in `preserved_destinations` verpflichtend gesichert. Ein offener Platz ist kein gelöschter Link. Verschiedene Vorkommen derselben URL bleiben einzeln identifizierbar.

## Quellnachweise

| Lokale Datei | SHA-256 |
|---|---|
| `structure/sources/technik.html` | `e7bc6bde7108565b69d0ef68a5e03beca4d79b0da175788fcf88438ceed88951` |
| `structure/CURRENT-EVIDENCE.json` | `948d922bd0af43f513227d910f96fb6db85b60ad858817ba6efd4e737e76dedd` |
| `structure/START.json` | `bb8337df27181357bd84baae98e90fb2337130818754e3ed35d2c7807d8a316d` |

## Sechs Zielbereiche und Zuordnungsregel

Mode & Accessoires; Wohnen & Licht; Technik & Gaming; Beauty & Pflege; Familie & Freizeit; Geschenke & Saison. Die Zuordnung folgt zunächst dem nachgewiesenen bisherigen Elternkontext. Sport und Party werden anhand ihrer vorhandenen Themenbezeichnung getrennt. Warenzugehörigkeit, Collectionregeln, Lagerstatus und Suchfilter werden daraus nicht abgeleitet.

Die 31 bisherigen Einträge auf Ebene 3 würden durch eine zusätzliche Sammelstufe teilweise eine vierte Ebene erhalten. Der Entwurf zieht in diesen Fällen den bisherigen unmittelbaren Elternbereich unter den neuen Hauptbereich; dessen bisheriger Oberbereich bleibt als eigener gesicherter Link erhalten. Das ist eine Platzierungsskizze, kein freigegebener nativer Menübaum.

## Vollständige Eintragszuordnung

| ID | Ursprünglicher Pfad | Exaktes Ziel | Vorschlag / Status |
|---|---|---|
| desktop-001 | Geschenke & Weihnachten | https://luxestyle.ch/collections/premium-geschenke | Geschenke & Saison > Geschenke & Weihnachten – Übersicht |
| desktop-002 | Geschenke & Weihnachten > Weihnachten | https://luxestyle.ch/collections/weihnachten-2026 | Geschenke & Saison > Geschenke & Weihnachten > Weihnachten |
| desktop-003 | Geschenke & Weihnachten > Adventskalender | https://luxestyle.ch/collections/adventskalender | Geschenke & Saison > Geschenke & Weihnachten > Adventskalender |
| desktop-004 | Geschenke & Weihnachten > Weihnachtspyjamas für die Familie | https://luxestyle.ch/collections/weihnachtspyjama-familie | Geschenke & Saison > Geschenke & Weihnachten > Weihnachtspyjamas für die Familie |
| desktop-005 | Geschenke & Weihnachten > Geschenke für Sie | https://luxestyle.ch/collections/geschenke-fuer-sie | Geschenke & Saison > Geschenke & Weihnachten > Geschenke für Sie |
| desktop-006 | Geschenke & Weihnachten > Geschenke für Ihn | https://luxestyle.ch/collections/geschenke-fuer-ihn | Geschenke & Saison > Geschenke & Weihnachten > Geschenke für Ihn |
| desktop-007 | Geschenke & Weihnachten > Geschenke für Kinder | https://luxestyle.ch/collections/geschenke-fuer-kinder | Geschenke & Saison > Geschenke & Weihnachten > Geschenke für Kinder |
| desktop-008 | Geschenke & Weihnachten > Hochzeitsgeschenke | https://luxestyle.ch/collections/hochzeitsgeschenke | Geschenke & Saison > Geschenke & Weihnachten > Hochzeitsgeschenke |
| desktop-009 | Geschenke & Weihnachten > Kleine Mitbringsel unter CHF 20 | https://luxestyle.ch/collections/kleine-geschenke-mitbringsel | Geschenke & Saison > Geschenke & Weihnachten > Kleine Mitbringsel unter CHF 20 |
| desktop-010 | Geschenke & Weihnachten > Preis-Hits unter CHF 25 | https://luxestyle.ch/collections/unter-chf-25 | Geschenke & Saison > Geschenke & Weihnachten > Preis-Hits unter CHF 25 |
| desktop-011 | Geschenke & Weihnachten > Geschenke bis CHF 30 | https://luxestyle.ch/collections/%F0%9F%8E%81-geschenke-bis-chf-30 | Geschenke & Saison > Geschenke & Weihnachten > Geschenke bis CHF 30 |
| desktop-012 | Geschenke & Weihnachten > Geschenke unter CHF 50 | https://luxestyle.ch/collections/geschenke-unter-50-franken | Geschenke & Saison > Geschenke & Weihnachten > Geschenke unter CHF 50 |
| desktop-013 | Geschenke & Weihnachten > Geschenke unter CHF 100 | https://luxestyle.ch/collections/geschenke-unter-100-franken | Geschenke & Saison > Geschenke & Weihnachten > Geschenke unter CHF 100 |
| desktop-014 | Geschenke & Weihnachten > Sets & Bundles | https://luxestyle.ch/collections/sets-bundles | Geschenke & Saison > Geschenke & Weihnachten > Sets & Bundles |
| desktop-015 | Geschenke & Weihnachten > Premium ab CHF 80 | https://luxestyle.ch/collections/%F0%9F%92%8E-premium-ab-chf-80 | Geschenke & Saison > Geschenke & Weihnachten > Premium ab CHF 80 |
| desktop-016 | Geschenke & Weihnachten > Kiffer-Zubehör (18+) | https://luxestyle.ch/collections/smoke-zubehoer | OFFEN: OPEN_CROSS_CUTTING_OR_SENSITIVE |
| desktop-017 | Geschenke & Weihnachten > Selbst gestalten | https://luxestyle.ch/pages/selbst-gestalten | OFFEN: OPEN_REQUIRES_PAGE_PURPOSE |
| desktop-018 | Geschenke & Weihnachten > Ratgeber | https://luxestyle.ch/blogs/ratgeber | OFFEN: UTILITY_PLACEMENT_OPEN |
| desktop-019 | Geschenke & Weihnachten > Alle Kategorien | https://luxestyle.ch/pages/alle-kategorien | OFFEN: UTILITY_PLACEMENT_OPEN |
| desktop-020 | Damen | https://luxestyle.ch/collections/damen-mode | Mode & Accessoires > Damen – Übersicht |
| desktop-021 | Damen > Taschen & Rucksäcke | https://luxestyle.ch/collections/sub-taschen | Mode & Accessoires > Damen > Taschen & Rucksäcke |
| desktop-022 | Damen > Bauchtaschen & Gürteltaschen | https://luxestyle.ch/collections/bauchtaschen | Mode & Accessoires > Damen > Bauchtaschen & Gürteltaschen |
| desktop-023 | Damen > Accessoires: Schals, Mützen & Gürtel | https://luxestyle.ch/collections/accessoires | Mode & Accessoires > Damen > Accessoires: Schals, Mützen & Gürtel |
| desktop-024 | Damen > Kleider | https://luxestyle.ch/collections/sub-kleider | Mode & Accessoires > Damen > Kleider |
| desktop-025 | Damen > Midikleider | https://luxestyle.ch/collections/midikleider | Mode & Accessoires > Damen > Midikleider |
| desktop-026 | Damen > Abendkleider & Cocktailkleider | https://luxestyle.ch/collections/abendkleider | Mode & Accessoires > Damen > Abendkleider & Cocktailkleider |
| desktop-027 | Damen > Schuhe | https://luxestyle.ch/collections/damen-schuhe | Mode & Accessoires > Damen > Schuhe |
| desktop-028 | Damen > T-Shirts & Tops | https://luxestyle.ch/collections/t-shirts-tops | Mode & Accessoires > Damen > T-Shirts & Tops |
| desktop-029 | Damen > Strick & Pullover | https://luxestyle.ch/collections/damen-strick-pullover | Mode & Accessoires > Damen > Strick & Pullover |
| desktop-030 | Damen > Jeans & Denim | https://luxestyle.ch/collections/jeans-denim | Mode & Accessoires > Damen > Jeans & Denim |
| desktop-031 | Damen > Jacken & Mäntel | https://luxestyle.ch/collections/damen-jacken-maentel | Mode & Accessoires > Damen > Jacken & Mäntel |
| desktop-032 | Damen > Jacken & Outdoor-Mode | https://luxestyle.ch/collections/jacken-outdoor | Mode & Accessoires > Damen > Jacken & Outdoor-Mode |
| desktop-033 | Damen > Jumpsuits & Overalls | https://luxestyle.ch/collections/jumpsuits-overalls | Mode & Accessoires > Damen > Jumpsuits & Overalls |
| desktop-034 | Damen > Blusen & Tops | https://luxestyle.ch/collections/damen-blusen | Mode & Accessoires > Damen > Blusen & Tops |
| desktop-035 | Damen > Hosen & Leggings | https://luxestyle.ch/collections/damen-hosen | Mode & Accessoires > Damen > Hosen & Leggings |
| desktop-036 | Damen > Röcke | https://luxestyle.ch/collections/sub-roecke | Mode & Accessoires > Damen > Röcke |
| desktop-037 | Damen > Shorts & Bermudas | https://luxestyle.ch/collections/shorts-bermudas | Mode & Accessoires > Damen > Shorts & Bermudas |
| desktop-038 | Damen > Nachtwäsche & Pyjamas | https://luxestyle.ch/collections/nachtwaesche-pyjamas | Mode & Accessoires > Damen > Nachtwäsche & Pyjamas |
| desktop-039 | Herren | https://luxestyle.ch/collections/fur-ihn | Mode & Accessoires > Herren – Übersicht |
| desktop-040 | Herren > Schuhe | https://luxestyle.ch/collections/herren-schuhe | Mode & Accessoires > Herren > Schuhe |
| desktop-041 | Herren > Hemden | https://luxestyle.ch/collections/herren-hemden | Mode & Accessoires > Herren > Hemden |
| desktop-042 | Herren > Shirts & Polos | https://luxestyle.ch/collections/herren-shirts | Mode & Accessoires > Herren > Shirts & Polos |
| desktop-043 | Herren > Hosen | https://luxestyle.ch/collections/herren-hosen | Mode & Accessoires > Herren > Hosen |
| desktop-044 | Herren > Herren-Jeans | https://luxestyle.ch/collections/herren-jeans | Mode & Accessoires > Herren > Herren-Jeans |
| desktop-045 | Herren > Pullover | https://luxestyle.ch/collections/herren-pullover | Mode & Accessoires > Herren > Pullover |
| desktop-046 | Herren > Jacken | https://luxestyle.ch/collections/herren-jacken | Mode & Accessoires > Herren > Jacken |
| desktop-047 | Herren > Uhren | https://luxestyle.ch/collections/herren-uhren | Mode & Accessoires > Herren > Uhren |
| desktop-048 | Herren > Bart & Rasur | https://luxestyle.ch/collections/sub-bart-rasur | Mode & Accessoires > Herren > Bart & Rasur |
| desktop-049 | Schuhe | https://luxestyle.ch/collections/schuhe | Mode & Accessoires > Schuhe – Übersicht |
| desktop-050 | Schuhe > Damenschuhe | https://luxestyle.ch/collections/damen-schuhe | Mode & Accessoires > Schuhe > Damenschuhe |
| desktop-051 | Schuhe > Herrenschuhe | https://luxestyle.ch/collections/herren-schuhe | Mode & Accessoires > Schuhe > Herrenschuhe |
| desktop-052 | Schuhe > Sandalen | https://luxestyle.ch/collections/sub-sandalen | Mode & Accessoires > Schuhe > Sandalen |
| desktop-053 | Schuhe > Kinderschuhe | https://luxestyle.ch/collections/kinderschuhe | Mode & Accessoires > Schuhe > Kinderschuhe |
| desktop-054 | Schuhe > Lauf- & Sportschuhe | https://luxestyle.ch/collections/sub-laufschuhe | Mode & Accessoires > Schuhe > Lauf- & Sportschuhe |
| desktop-055 | Schuhe > Stiefel & Boots | https://luxestyle.ch/collections/sub-stiefel-boots | Mode & Accessoires > Schuhe > Stiefel & Boots |
| desktop-056 | Schuhe > Winterschuhe & Winterstiefel | https://luxestyle.ch/collections/winterschuhe | Mode & Accessoires > Schuhe > Winterschuhe & Winterstiefel |
| desktop-057 | Schuhe > Sneaker & Sport | https://luxestyle.ch/collections/sneaker-sportschuhe | Mode & Accessoires > Schuhe > Sneaker & Sport |
| desktop-058 | Schuhe > Pumps & High Heels | https://luxestyle.ch/collections/sub-pumps-heels | Mode & Accessoires > Schuhe > Pumps & High Heels |
| desktop-059 | Schuhe > Ballerinas & Flats | https://luxestyle.ch/collections/sub-ballerinas | Mode & Accessoires > Schuhe > Ballerinas & Flats |
| desktop-060 | Schuhe > Hausschuhe & Slipper | https://luxestyle.ch/collections/sub-hausschuhe | Mode & Accessoires > Schuhe > Hausschuhe & Slipper |
| desktop-061 | Schuhe > Wander- & Arbeitsschuhe | https://luxestyle.ch/collections/sub-wander-arbeitsschuhe | Mode & Accessoires > Schuhe > Wander- & Arbeitsschuhe |
| desktop-062 | Schmuck & Uhren | https://luxestyle.ch/collections/schmuck-uhren | Mode & Accessoires > Schmuck & Uhren – Übersicht |
| desktop-063 | Schmuck & Uhren > Premium Schmuck | https://luxestyle.ch/collections/premium-schmuck | Mode & Accessoires > Schmuck & Uhren > Premium Schmuck |
| desktop-064 | Schmuck & Uhren > Uhren | https://luxestyle.ch/collections/uhren | Mode & Accessoires > Schmuck & Uhren > Uhren |
| desktop-065 | Schmuck & Uhren > Uhren > Smartwatches & Wearables | https://luxestyle.ch/collections/smartwatches-wearables | Mode & Accessoires > Uhren > Smartwatches & Wearables |
| desktop-066 | Schmuck & Uhren > Uhren > Herrenuhren | https://luxestyle.ch/collections/uhren-herren | Mode & Accessoires > Uhren > Herrenuhren |
| desktop-067 | Schmuck & Uhren > Uhren > Damenuhren | https://luxestyle.ch/collections/uhren-damen | Mode & Accessoires > Uhren > Damenuhren |
| desktop-068 | Schmuck & Uhren > Uhren > Uhrenarmbänder & Smartwatch-Armbänder | https://luxestyle.ch/collections/uhrenarmbaender | Mode & Accessoires > Uhren > Uhrenarmbänder & Smartwatch-Armbänder |
| desktop-069 | Schmuck & Uhren > Uhren > Chronographen & Automatik | https://luxestyle.ch/collections/chronographen-automatik | Mode & Accessoires > Uhren > Chronographen & Automatik |
| desktop-070 | Schmuck & Uhren > Armbänder | https://luxestyle.ch/collections/sub-armbaender | Mode & Accessoires > Schmuck & Uhren > Armbänder |
| desktop-071 | Schmuck & Uhren > Ringe | https://luxestyle.ch/collections/sub-ringe | Mode & Accessoires > Schmuck & Uhren > Ringe |
| desktop-072 | Schmuck & Uhren > Halsketten | https://luxestyle.ch/collections/sub-halsketten | Mode & Accessoires > Schmuck & Uhren > Halsketten |
| desktop-073 | Schmuck & Uhren > Ohrringe | https://luxestyle.ch/collections/sub-ohrringe | Mode & Accessoires > Schmuck & Uhren > Ohrringe |
| desktop-074 | Schmuck & Uhren > Sets | https://luxestyle.ch/collections/schmuck-sets | Mode & Accessoires > Schmuck & Uhren > Sets |
| desktop-075 | Schmuck & Uhren > Sonnenbrillen | https://luxestyle.ch/collections/sonnenbrillen-alle | Mode & Accessoires > Schmuck & Uhren > Sonnenbrillen |
| desktop-076 | Beauty & Pflege | https://luxestyle.ch/collections/beauty-pflege | Beauty & Pflege > Beauty & Pflege – Übersicht |
| desktop-077 | Beauty & Pflege > Beauty & Pflege | https://luxestyle.ch/collections/beauty-pflege | Beauty & Pflege > Beauty & Pflege |
| desktop-078 | Beauty & Pflege > Make-up & Kosmetik | https://luxestyle.ch/collections/make-up | Beauty & Pflege > Make-up & Kosmetik |
| desktop-079 | Beauty & Pflege > Hautpflege & Skincare | https://luxestyle.ch/collections/hautpflege-skincare | Beauty & Pflege > Hautpflege & Skincare |
| desktop-080 | Beauty & Pflege > Haarpflege & Styling | https://luxestyle.ch/collections/beauty-haar | Beauty & Pflege > Haarpflege & Styling |
| desktop-081 | Beauty & Pflege > Haarstyling-Geräte | https://luxestyle.ch/collections/haarstyling-geraete | Beauty & Pflege > Haarstyling-Geräte |
| desktop-082 | Beauty & Pflege > Nägel & Maniküre | https://luxestyle.ch/collections/naegel-manikuere | Beauty & Pflege > Nägel & Maniküre |
| desktop-083 | Beauty & Pflege > Wimpern & Lashes | https://luxestyle.ch/collections/wimpern-lashes | Beauty & Pflege > Wimpern & Lashes |
| desktop-084 | Beauty & Pflege > Parfum & Düfte | https://luxestyle.ch/collections/parfum-duefte | Beauty & Pflege > Parfum & Düfte |
| desktop-085 | Beauty & Pflege > Beauty-Geräte & Haarentfernung | https://luxestyle.ch/collections/beauty-geraete | Beauty & Pflege > Beauty-Geräte & Haarentfernung |
| desktop-086 | Beauty & Pflege > Gesichtspflege-Geräte | https://luxestyle.ch/collections/gesichtspflege-geraete | Beauty & Pflege > Gesichtspflege-Geräte |
| desktop-087 | Beauty & Pflege > Aroma & Diffuser | https://luxestyle.ch/collections/sub-aroma-diffuser | Beauty & Pflege > Aroma & Diffuser |
| desktop-088 | Beauty & Pflege > Luftbefeuchter | https://luxestyle.ch/collections/luftbefeuchter | Beauty & Pflege > Luftbefeuchter |
| desktop-089 | Beauty & Pflege > Schminkspiegel | https://luxestyle.ch/collections/schminkspiegel | Beauty & Pflege > Schminkspiegel |
| desktop-090 | Wohnen & Garten | https://luxestyle.ch/collections/wohnen-dekoration | Wohnen & Licht > Wohnen & Garten – Übersicht |
| desktop-091 | Wohnen & Garten > Wohnen & Deko | https://luxestyle.ch/collections/wohnen-dekoration | Wohnen & Licht > Wohnen & Garten > Wohnen & Deko |
| desktop-092 | Wohnen & Garten > Aufbewahrung | https://luxestyle.ch/collections/aufbewahrung-sub | Wohnen & Licht > Wohnen & Garten > Aufbewahrung |
| desktop-093 | Wohnen & Garten > Wäschekörbe | https://luxestyle.ch/collections/waeschekoerbe | Wohnen & Licht > Wohnen & Garten > Wäschekörbe |
| desktop-094 | Wohnen & Garten > Wandregale | https://luxestyle.ch/collections/wandregale | Wohnen & Licht > Wohnen & Garten > Wandregale |
| desktop-095 | Wohnen & Garten > Küche & Kochen | https://luxestyle.ch/collections/sub-kueche | Wohnen & Licht > Wohnen & Garten > Küche & Kochen |
| desktop-096 | Wohnen & Garten > Schneidebretter | https://luxestyle.ch/collections/schneidebretter | Wohnen & Licht > Wohnen & Garten > Schneidebretter |
| desktop-097 | Wohnen & Garten > Woks & Wokpfannen | https://luxestyle.ch/collections/woks | Wohnen & Licht > Wohnen & Garten > Woks & Wokpfannen |
| desktop-098 | Wohnen & Garten > Etageren | https://luxestyle.ch/collections/etageren | Wohnen & Licht > Wohnen & Garten > Etageren |
| desktop-099 | Wohnen & Garten > Küchenhelfer & Gadgets | https://luxestyle.ch/collections/kuechenhelfer | Wohnen & Licht > Wohnen & Garten > Küchenhelfer & Gadgets |
| desktop-100 | Wohnen & Garten > Lunchboxen & Bento-Boxen | https://luxestyle.ch/collections/lunchboxen | Wohnen & Licht > Wohnen & Garten > Lunchboxen & Bento-Boxen |
| desktop-101 | Wohnen & Garten > Kissen & Wohntextilien | https://luxestyle.ch/collections/kissen-wohntextilien | Wohnen & Licht > Wohnen & Garten > Kissen & Wohntextilien |
| desktop-102 | Wohnen & Garten > Teppiche | https://luxestyle.ch/collections/teppiche | Wohnen & Licht > Wohnen & Garten > Teppiche |
| desktop-103 | Wohnen & Garten > Bettwäsche | https://luxestyle.ch/collections/bettwaesche | Wohnen & Licht > Wohnen & Garten > Bettwäsche |
| desktop-104 | Wohnen & Garten > Vorhänge | https://luxestyle.ch/collections/vorhaenge | Wohnen & Licht > Wohnen & Garten > Vorhänge |
| desktop-105 | Wohnen & Garten > Duschvorhänge | https://luxestyle.ch/collections/duschvorhaenge | Wohnen & Licht > Wohnen & Garten > Duschvorhänge |
| desktop-106 | Wohnen & Garten > Basteln & DIY | https://luxestyle.ch/collections/basteln-diy | Wohnen & Licht > Wohnen & Garten > Basteln & DIY |
| desktop-107 | Wohnen & Garten > Basteln & DIY > Malen nach Zahlen | https://luxestyle.ch/collections/malen-nach-zahlen | Wohnen & Licht > Basteln & DIY > Malen nach Zahlen |
| desktop-108 | Wohnen & Garten > Basteln & DIY > Diamond Painting | https://luxestyle.ch/collections/diamond-painting | Wohnen & Licht > Basteln & DIY > Diamond Painting |
| desktop-109 | Wohnen & Garten > Garten & Outdoor | https://luxestyle.ch/collections/outdoor-garten | Wohnen & Licht > Wohnen & Garten > Garten & Outdoor |
| desktop-110 | Wohnen & Garten > Hängematten | https://luxestyle.ch/collections/haengematten | Wohnen & Licht > Wohnen & Garten > Hängematten |
| desktop-111 | Wohnen & Garten > Werkzeug & Maschinen | https://luxestyle.ch/collections/werkzeug-maschinen | Wohnen & Licht > Wohnen & Garten > Werkzeug & Maschinen |
| desktop-112 | Wohnen & Garten > Aroma & Diffuser | https://luxestyle.ch/collections/sub-aroma-diffuser | Wohnen & Licht > Wohnen & Garten > Aroma & Diffuser |
| desktop-113 | Wohnen & Garten > Vasen & Deko | https://luxestyle.ch/collections/sub-deko | Wohnen & Licht > Wohnen & Garten > Vasen & Deko |
| desktop-114 | Wohnen & Garten > Wanddeko | https://luxestyle.ch/collections/wanddeko | Wohnen & Licht > Wohnen & Garten > Wanddeko |
| desktop-115 | Wohnen & Garten > Wandteppiche & Wandbehänge | https://luxestyle.ch/collections/wandteppiche | Wohnen & Licht > Wohnen & Garten > Wandteppiche & Wandbehänge |
| desktop-116 | Wohnen & Garten > Wanduhren | https://luxestyle.ch/collections/wanduhren | Wohnen & Licht > Wohnen & Garten > Wanduhren |
| desktop-117 | Wohnen & Garten > Ersatzteile & Zubehör | https://luxestyle.ch/collections/ersatzteile-zubehoer | Wohnen & Licht > Wohnen & Garten > Ersatzteile & Zubehör |
| desktop-118 | Wohnen & Garten > Beleuchtung | https://luxestyle.ch/collections/sub-beleuchtung | Wohnen & Licht > Wohnen & Garten > Beleuchtung |
| desktop-119 | Wohnen & Garten > Wecker | https://luxestyle.ch/collections/wecker | Wohnen & Licht > Wohnen & Garten > Wecker |
| desktop-120 | Wohnen & Garten > Geschenkverpackung | https://luxestyle.ch/collections/geschenkverpackung | Wohnen & Licht > Wohnen & Garten > Geschenkverpackung |
| desktop-121 | Wohnen & Garten > Kuschel- & Heizdecken | https://luxestyle.ch/collections/kuschel-heizdecken | Wohnen & Licht > Wohnen & Garten > Kuschel- & Heizdecken |
| desktop-122 | Wohnen & Garten > Haushaltsgeräte | https://luxestyle.ch/collections/haushaltsgeraete | Wohnen & Licht > Wohnen & Garten > Haushaltsgeräte |
| desktop-123 | Wohnen & Garten > LED-Strips & Lichterketten | https://luxestyle.ch/collections/licht-led-strip | Wohnen & Licht > Wohnen & Garten > LED-Strips & Lichterketten |
| desktop-124 | Technik & Gaming | https://luxestyle.ch/collections/elektronik-technik | Technik & Gaming > Technik & Gaming – Übersicht |
| desktop-125 | Technik & Gaming > Elektronik & Technik | https://luxestyle.ch/collections/elektronik-technik | Technik & Gaming > Elektronik & Technik |
| desktop-126 | Technik & Gaming > Smartwatches & Wearables | https://luxestyle.ch/collections/smartwatches-wearables | Technik & Gaming > Smartwatches & Wearables |
| desktop-127 | Technik & Gaming > Smartwatches & Wearables > Uhrenarmbänder & Smartwatch-Armbänder | https://luxestyle.ch/collections/uhrenarmbaender | Technik & Gaming > Smartwatches & Wearables > Uhrenarmbänder & Smartwatch-Armbänder |
| desktop-128 | Technik & Gaming > Kopfhörer & Audio | https://luxestyle.ch/collections/kopfhoerer-audio | Technik & Gaming > Kopfhörer & Audio |
| desktop-129 | Technik & Gaming > Kopfhörer & Audio > Lautsprecher & Boxen | https://luxestyle.ch/collections/lautsprecher | Technik & Gaming > Kopfhörer & Audio > Lautsprecher & Boxen |
| desktop-130 | Technik & Gaming > Kopfhörer & Audio > Mikrofone & Streaming | https://luxestyle.ch/collections/mikrofone | Technik & Gaming > Kopfhörer & Audio > Mikrofone & Streaming |
| desktop-131 | Technik & Gaming > Ladegeräte & Powerbanks | https://luxestyle.ch/collections/elektronik-laden | Technik & Gaming > Ladegeräte & Powerbanks |
| desktop-132 | Technik & Gaming > Handy-Zubehör | https://luxestyle.ch/collections/handy-zubehoer | Technik & Gaming > Handy-Zubehör |
| desktop-133 | Technik & Gaming > Handy-Zubehör > Halterungen & MagSafe | https://luxestyle.ch/collections/handy-halterungen | Technik & Gaming > Handy-Zubehör > Halterungen & MagSafe |
| desktop-134 | Technik & Gaming > Handy-Zubehör > Handyhüllen & Cases | https://luxestyle.ch/collections/handy-huellen | Technik & Gaming > Handy-Zubehör > Handyhüllen & Cases |
| desktop-135 | Technik & Gaming > Kabel & Adapter | https://luxestyle.ch/collections/kabel-adapter | Technik & Gaming > Kabel & Adapter |
| desktop-136 | Technik & Gaming > Gaming | https://luxestyle.ch/collections/gaming | Technik & Gaming > Gaming |
| desktop-137 | Technik & Gaming > Gaming > Controller & Gamepads | https://luxestyle.ch/collections/gaming-controller | Technik & Gaming > Gaming > Controller & Gamepads |
| desktop-138 | Technik & Gaming > Gaming > PC-Gaming | https://luxestyle.ch/collections/pc-gaming | Technik & Gaming > Gaming > PC-Gaming |
| desktop-139 | Technik & Gaming > Gaming > Retro & Handheld-Gaming | https://luxestyle.ch/collections/retro-handheld | Technik & Gaming > Gaming > Retro & Handheld-Gaming |
| desktop-140 | Technik & Gaming > Drohnen & Kameras | https://luxestyle.ch/collections/drohnen-kameras | Technik & Gaming > Drohnen & Kameras |
| desktop-141 | Technik & Gaming > Drohnen & Kameras > Drohnen & FPV | https://luxestyle.ch/collections/drohnen-fpv | Technik & Gaming > Drohnen & Kameras > Drohnen & FPV |
| desktop-142 | Technik & Gaming > Drohnen & Kameras > Foto & Video | https://luxestyle.ch/collections/foto-tech | Technik & Gaming > Drohnen & Kameras > Foto & Video |
| desktop-143 | Technik & Gaming > Beamer & Heimkino | https://luxestyle.ch/collections/beamer-heimkino | Technik & Gaming > Beamer & Heimkino |
| desktop-144 | Technik & Gaming > PC & Homeoffice | https://luxestyle.ch/collections/pc-homeoffice | Technik & Gaming > PC & Homeoffice |
| desktop-145 | Technik & Gaming > PC & Homeoffice > Tastaturen & Mäuse | https://luxestyle.ch/collections/tastatur-maus | Technik & Gaming > PC & Homeoffice > Tastaturen & Mäuse |
| desktop-146 | Technik & Gaming > PC & Homeoffice > Laptop- & Tablet-Zubehör | https://luxestyle.ch/collections/laptop-tablet-zubehoer | Technik & Gaming > PC & Homeoffice > Laptop- & Tablet-Zubehör |
| desktop-147 | Technik & Gaming > PC & Homeoffice > PC-Komponenten & Speicher | https://luxestyle.ch/collections/pc-komponenten | Technik & Gaming > PC & Homeoffice > PC-Komponenten & Speicher |
| desktop-148 | Technik & Gaming > PC & Homeoffice > Netzwerk & WLAN | https://luxestyle.ch/collections/netzwerk-router | Technik & Gaming > PC & Homeoffice > Netzwerk & WLAN |
| desktop-149 | Technik & Gaming > Büro & Home Office | https://luxestyle.ch/collections/buro-home-office | Technik & Gaming > Büro & Home Office |
| desktop-150 | Technik & Gaming > Smart Home & smarte Gadgets | https://luxestyle.ch/collections/smart-home-gadgets | Technik & Gaming > Smart Home & smarte Gadgets |
| desktop-151 | Technik & Gaming > USB-Sticks | https://luxestyle.ch/collections/usb-sticks | Technik & Gaming > USB-Sticks |
| desktop-152 | Technik & Gaming > Auto & KFZ-Zubehör | https://luxestyle.ch/collections/auto-kfz-zubehoer | Technik & Gaming > Auto & KFZ-Zubehör |
| desktop-153 | Technik & Gaming > Elektronik-Kleinteile | https://luxestyle.ch/collections/elektronik-kleinteile | Technik & Gaming > Elektronik-Kleinteile |
| desktop-154 | Technik & Gaming > Lifestyle & Trends | https://luxestyle.ch/collections/trends-gadgets | Technik & Gaming > Lifestyle & Trends |
| desktop-155 | Kinder & Haustier | https://luxestyle.ch/collections/sub-baby-kids | Familie & Freizeit > Kinder & Haustier – Übersicht |
| desktop-156 | Kinder & Haustier > Kinder & Baby | https://luxestyle.ch/collections/sub-baby-kids | Familie & Freizeit > Kinder & Haustier > Kinder & Baby |
| desktop-157 | Kinder & Haustier > Babykleidung & Kindermode | https://luxestyle.ch/collections/babykleidung | Familie & Freizeit > Kinder & Haustier > Babykleidung & Kindermode |
| desktop-158 | Kinder & Haustier > Babykleidung & Kindermode > Strampler & Bodys | https://luxestyle.ch/collections/strampler-bodys | Familie & Freizeit > Babykleidung & Kindermode > Strampler & Bodys |
| desktop-159 | Kinder & Haustier > Babykleidung & Kindermode > Baby- & Kinder-Sets | https://luxestyle.ch/collections/baby-kinder-sets | Familie & Freizeit > Babykleidung & Kindermode > Baby- & Kinder-Sets |
| desktop-160 | Kinder & Haustier > Haustierwelt | https://luxestyle.ch/collections/sub-haustier | Familie & Freizeit > Kinder & Haustier > Haustierwelt |
| desktop-161 | Kinder & Haustier > Haustierwelt > Hunde | https://luxestyle.ch/collections/haustier-hunde | Familie & Freizeit > Haustierwelt > Hunde |
| desktop-162 | Kinder & Haustier > Haustierwelt > Katzen | https://luxestyle.ch/collections/haustier-katzen | Familie & Freizeit > Haustierwelt > Katzen |
| desktop-163 | Kinder & Haustier > Haustierwelt > Leinen & Tierkleidung | https://luxestyle.ch/collections/tier-leinen-kleidung | Familie & Freizeit > Haustierwelt > Leinen & Tierkleidung |
| desktop-164 | Kinder & Haustier > Haustierwelt > Tierspielzeug | https://luxestyle.ch/collections/tierspielzeug | Familie & Freizeit > Haustierwelt > Tierspielzeug |
| desktop-165 | Kinder & Haustier > Haustierwelt > Näpfe & Füttern | https://luxestyle.ch/collections/tier-naepfe-fuettern | Familie & Freizeit > Haustierwelt > Näpfe & Füttern |
| desktop-166 | Kinder & Haustier > Haustierwelt > Pflege & Unterwegs | https://luxestyle.ch/collections/tier-pflege-unterwegs | Familie & Freizeit > Haustierwelt > Pflege & Unterwegs |
| desktop-167 | Kinder & Haustier > Haustierwelt > Kratzbäume | https://luxestyle.ch/collections/kratzbaeume | Familie & Freizeit > Haustierwelt > Kratzbäume |
| desktop-168 | Kinder & Haustier > Haustierwelt > Hundebetten | https://luxestyle.ch/collections/hundebetten | Familie & Freizeit > Haustierwelt > Hundebetten |
| desktop-169 | Kinder & Haustier > Spielzeug & Plüsch | https://luxestyle.ch/collections/spielzeug | Familie & Freizeit > Kinder & Haustier > Spielzeug & Plüsch |
| desktop-170 | Kinder & Haustier > Kinderschuhe | https://luxestyle.ch/collections/kinderschuhe | Familie & Freizeit > Kinder & Haustier > Kinderschuhe |
| desktop-171 | Kinder & Haustier > Fahrzeuge & RC | https://luxestyle.ch/collections/spielzeug-fahrzeuge | Familie & Freizeit > Kinder & Haustier > Fahrzeuge & RC |
| desktop-172 | Kinder & Haustier > Spielzeug ab CH-Lager | https://luxestyle.ch/collections/spielzeug-ch-lager | Familie & Freizeit > Kinder & Haustier > Spielzeug ab CH-Lager |
| desktop-173 | Kinder & Haustier > Klemmbausteine & Bausätze | https://luxestyle.ch/collections/klemmbausteine-bausaetze | Familie & Freizeit > Kinder & Haustier > Klemmbausteine & Bausätze |
| desktop-174 | Kinder & Haustier > Geschenke für Kinder | https://luxestyle.ch/collections/geschenke-fuer-kinder | Familie & Freizeit > Kinder & Haustier > Geschenke für Kinder |
| desktop-175 | Highlights | https://luxestyle.ch/collections/bestseller | OFFEN: OPEN_CROSS_CUTTING_OR_SENSITIVE |
| desktop-176 | Highlights > Topseller | https://luxestyle.ch/collections/bestseller | OFFEN: OPEN_CROSS_CUTTING_OR_SENSITIVE |
| desktop-177 | Highlights > Ab Schweizer Lager | https://luxestyle.ch/collections/blitzversand-schweiz | OFFEN: OPEN_CROSS_CUTTING_OR_SENSITIVE |
| desktop-178 | Highlights > Kostüme ab CH-Lager | https://luxestyle.ch/collections/kostueme-ch-lager | Geschenke & Saison > Highlights > Kostüme ab CH-Lager |
| desktop-179 | Highlights > Viral-Hits | https://luxestyle.ch/collections/viral-hits | OFFEN: OPEN_CROSS_CUTTING_OR_SENSITIVE |
| desktop-180 | Highlights > EU-Lager | https://luxestyle.ch/collections/eu-lager-schnell | OFFEN: OPEN_CROSS_CUTTING_OR_SENSITIVE |
| desktop-181 | Highlights > Schweizer Editionen | https://luxestyle.ch/collections/erste-august | Geschenke & Saison > Highlights > Schweizer Editionen |
| desktop-182 | Highlights > Premium & Marken | https://luxestyle.ch/collections/luxestyle-premium | OFFEN: OPEN_CROSS_CUTTING_OR_SENSITIVE |
| desktop-183 | Highlights > Ventilatoren & Kühlung | https://luxestyle.ch/collections/ventilatoren | Wohnen & Licht > Highlights > Ventilatoren & Kühlung |
| desktop-184 | Highlights > Fussball & Fanshop | https://luxestyle.ch/collections/fussball-fanshop | Familie & Freizeit > Highlights > Fussball & Fanshop |
| desktop-185 | Highlights > VR, AI & Neuheiten | https://luxestyle.ch/collections/vr-ai-neuheiten | Technik & Gaming > Highlights > VR, AI & Neuheiten |
| desktop-186 | Highlights > Schnell finden | https://luxestyle.ch/pages/marken-kategorien | OFFEN: UTILITY_PLACEMENT_OPEN |
| desktop-187 | Herbst & Übergang | https://luxestyle.ch/collections/jacken-outdoor | Mode & Accessoires > Herbst & Übergang – Übersicht |
| desktop-188 | Herbst & Übergang > Herbst-Favoriten | https://luxestyle.ch/collections/herbst-favoriten | Mode & Accessoires > Herbst & Übergang > Herbst-Favoriten |
| desktop-189 | Herbst & Übergang > Jacken & Mäntel | https://luxestyle.ch/collections/jacken-outdoor | Mode & Accessoires > Herbst & Übergang > Jacken & Mäntel |
| desktop-190 | Herbst & Übergang > Winterjacken & Daunenjacken | https://luxestyle.ch/collections/winterjacken | Mode & Accessoires > Herbst & Übergang > Winterjacken & Daunenjacken |
| desktop-191 | Herbst & Übergang > Damen-Strick & Pullover | https://luxestyle.ch/collections/damen-strick-pullover | Mode & Accessoires > Herbst & Übergang > Damen-Strick & Pullover |
| desktop-192 | Herbst & Übergang > Hoodies & Sweatshirts | https://luxestyle.ch/collections/hoodies-sweatshirts | Mode & Accessoires > Herbst & Übergang > Hoodies & Sweatshirts |
| desktop-193 | Herbst & Übergang > Herren-Pullover & Strick | https://luxestyle.ch/collections/herren-pullover | Mode & Accessoires > Herbst & Übergang > Herren-Pullover & Strick |
| desktop-194 | Herbst & Übergang > Weihnachtspullover | https://luxestyle.ch/collections/weihnachtspullover | Mode & Accessoires > Herbst & Übergang > Weihnachtspullover |
| desktop-195 | Herbst & Übergang > Stiefel & Boots | https://luxestyle.ch/collections/sub-stiefel-boots | Mode & Accessoires > Herbst & Übergang > Stiefel & Boots |
| desktop-196 | Herbst & Übergang > Mützen & Schals | https://luxestyle.ch/collections/muetzen-schals | Mode & Accessoires > Herbst & Übergang > Mützen & Schals |
| desktop-197 | Herbst & Übergang > Westen & Gilets | https://luxestyle.ch/collections/westen-gilets | Mode & Accessoires > Herbst & Übergang > Westen & Gilets |
| desktop-198 | Herbst & Übergang > Kuschel- & Heizdecken | https://luxestyle.ch/collections/kuschel-heizdecken | Wohnen & Licht > Herbst & Übergang > Kuschel- & Heizdecken |
| desktop-199 | Herbst & Übergang > Wärme & Komfort | https://luxestyle.ch/collections/waerme-komfort | OFFEN: OPEN_CROSS_CUTTING_OR_SENSITIVE |
| desktop-200 | Herbst & Übergang > Handwärmer | https://luxestyle.ch/collections/handwaermer | OFFEN: OPEN_CROSS_CUTTING_OR_SENSITIVE |
| desktop-201 | Herbst & Übergang > Reisen & Outdoor | https://luxestyle.ch/collections/sub-reise | Familie & Freizeit > Herbst & Übergang > Reisen & Outdoor |
| desktop-202 | Sport & Party | https://luxestyle.ch/collections/fitness-training | Familie & Freizeit > Sport & Party – Übersicht |
| desktop-203 | Sport & Party > Sport & Fitness | https://luxestyle.ch/collections/fitness-training | Familie & Freizeit > Sport & Party > Sport & Fitness |
| desktop-204 | Sport & Party > Rucksäcke | https://luxestyle.ch/collections/rucksaecke | Familie & Freizeit > Sport & Party > Rucksäcke |
| desktop-205 | Sport & Party > Kostüme ab CH-Lager | https://luxestyle.ch/collections/kostueme-ch-lager | Geschenke & Saison > Sport & Party > Kostüme ab CH-Lager |
| desktop-206 | Sport & Party > Kostüme & Party | https://luxestyle.ch/collections/kostueme-fasnacht | Geschenke & Saison > Sport & Party > Kostüme & Party |
| desktop-207 | Sport & Party > Partydeko & Ballone | https://luxestyle.ch/collections/party-deko-ch | Geschenke & Saison > Sport & Party > Partydeko & Ballone |
| desktop-208 | Sport & Party > Süsses & Esswaren | https://luxestyle.ch/collections/suesses-esswaren | Geschenke & Saison > Sport & Party > Süsses & Esswaren |
| desktop-209 | Sport & Party > Reisen & Outdoor | https://luxestyle.ch/collections/sub-reise | Familie & Freizeit > Sport & Party > Reisen & Outdoor |
| desktop-210 | Sport & Party > Yoga & Fitness | https://luxestyle.ch/collections/sub-yoga-fitness | Familie & Freizeit > Sport & Party > Yoga & Fitness |
| desktop-211 | Sport & Party > Halloween | https://luxestyle.ch/collections/halloween | Geschenke & Saison > Sport & Party > Halloween |
| desktop-212 | Sport & Party > Weihnachten | https://luxestyle.ch/collections/weihnachten-2026 | Geschenke & Saison > Sport & Party > Weihnachten |
| desktop-213 | Sport & Party > Wandern & Trekking | https://luxestyle.ch/collections/wandern-trekking | Familie & Freizeit > Sport & Party > Wandern & Trekking |
| desktop-214 | Sport & Party > Fussball & Fanshop | https://luxestyle.ch/collections/fussball-fanshop | Familie & Freizeit > Sport & Party > Fussball & Fanshop |
| desktop-215 | Sport & Party > Camping & Outdoor | https://luxestyle.ch/collections/camping-outdoor | Familie & Freizeit > Sport & Party > Camping & Outdoor |
| desktop-216 | Sport & Party > Taschenlampen & Stirnlampen | https://luxestyle.ch/collections/taschenlampen | Familie & Freizeit > Sport & Party > Taschenlampen & Stirnlampen |
| desktop-217 | Sport & Party > Velo & Radsport | https://luxestyle.ch/collections/velo-radsport | Familie & Freizeit > Sport & Party > Velo & Radsport |
| desktop-218 | Merkliste | https://luxestyle.ch/pages/merkliste | OFFEN: UTILITY_PLACEMENT_OPEN |

## Doppelte Ziele, Titel und Filterfamilien

22 wiederholte URL-Gruppen ergeben 23 zusätzliche Vorkommen. Jacken & Outdoor erscheint dreimal; die anderen Gruppen zweimal. Dies sind Crosslinks beziehungsweise wiederholte Einstiege, keine Löschbelege. Ein gleicher Titel kann je Kontext auf andere Collections zeigen. Die JSON-Datei enthält dafür getrennte Listen `repeated_targets` und `title_url_families`.

| Gleicher Titel | Unterschiedliche erhaltene Ziele |
|---|---|
| schuhe | https://luxestyle.ch/collections/damen-schuhe; https://luxestyle.ch/collections/herren-schuhe; https://luxestyle.ch/collections/schuhe |
| jacken & mäntel | https://luxestyle.ch/collections/damen-jacken-maentel; https://luxestyle.ch/collections/jacken-outdoor |
| uhren | https://luxestyle.ch/collections/herren-uhren; https://luxestyle.ch/collections/uhren |

Im Header befinden sich keine Query-, Fragment- oder Tagfilterpfade. Im Technik-Hauptinhalt sind fünf zusätzliche Collection-Unterpfade belegt; sie sind keine weiteren Menüeinträge und nicht als eigenständige Collections oder geprüfte Adminattribute bestätigt:

- Neu: https://luxestyle.ch/collections/elektronik-technik/neu
- Uhren: https://luxestyle.ch/collections/elektronik-technik/uhren
- Gadgets: https://luxestyle.ch/collections/elektronik-technik/gadget
- Laden & Strom: https://luxestyle.ch/collections/elektronik-technik/ladegeraet
- Geschenkidee: https://luxestyle.ch/collections/elektronik-technik/geschenk

Diese fünf Routen separat erhalten. Die vorhandenen Filterfamilien Verfügbarkeit, Preis, Produkttyp, Farbe, Grösse und Kategorie bleiben in `filter_form_families` belegt; ihnen wird kein neuer Attributstatus zugeschrieben. Die zwei prozentkodierten Geschenk-/Premium-Handles bleiben bytegetreu unverändert. Titelbereinigung erlaubt keine Handleänderung.

## Offene Platzierungen

| ID | Vorhandener Titel / Ziel | Weshalb offen |
|---|---|---|
| desktop-016 | Kiffer-Zubehör (18+) / https://luxestyle.ch/collections/smoke-zubehoer | Bereichsübergreifende Auswahl, Lager-/Werbeversprechen oder gesonderter Alterskontext; kein belegter eindeutiger Hauptbereich. Keine Löschung oder Aktivierung. |
| desktop-017 | Selbst gestalten / https://luxestyle.ch/pages/selbst-gestalten | Im Geschenkmenü verlinkt; Seitenzweck nicht aus lokaler Menüquelle bestätigt. Ziel bis Klärung erhalten. |
| desktop-018 | Ratgeber / https://luxestyle.ch/blogs/ratgeber | Shopweite Hilfs-/Redaktionsfunktion; Platzierung ausserhalb der sechs Kaufbereiche offen. Ziel vollständig sichern. |
| desktop-019 | Alle Kategorien / https://luxestyle.ch/pages/alle-kategorien | Shopweite Hilfs-/Redaktionsfunktion; Platzierung ausserhalb der sechs Kaufbereiche offen. Ziel vollständig sichern. |
| desktop-175 | Highlights / https://luxestyle.ch/collections/bestseller | Bereichsübergreifende Auswahl, Lager-/Werbeversprechen oder gesonderter Alterskontext; kein belegter eindeutiger Hauptbereich. Keine Löschung oder Aktivierung. |
| desktop-176 | Topseller / https://luxestyle.ch/collections/bestseller | Bereichsübergreifende Auswahl, Lager-/Werbeversprechen oder gesonderter Alterskontext; kein belegter eindeutiger Hauptbereich. Keine Löschung oder Aktivierung. |
| desktop-177 | Ab Schweizer Lager / https://luxestyle.ch/collections/blitzversand-schweiz | Bereichsübergreifende Auswahl, Lager-/Werbeversprechen oder gesonderter Alterskontext; kein belegter eindeutiger Hauptbereich. Keine Löschung oder Aktivierung. |
| desktop-179 | Viral-Hits / https://luxestyle.ch/collections/viral-hits | Bereichsübergreifende Auswahl, Lager-/Werbeversprechen oder gesonderter Alterskontext; kein belegter eindeutiger Hauptbereich. Keine Löschung oder Aktivierung. |
| desktop-180 | EU-Lager / https://luxestyle.ch/collections/eu-lager-schnell | Bereichsübergreifende Auswahl, Lager-/Werbeversprechen oder gesonderter Alterskontext; kein belegter eindeutiger Hauptbereich. Keine Löschung oder Aktivierung. |
| desktop-182 | Premium & Marken / https://luxestyle.ch/collections/luxestyle-premium | Bereichsübergreifende Auswahl, Lager-/Werbeversprechen oder gesonderter Alterskontext; kein belegter eindeutiger Hauptbereich. Keine Löschung oder Aktivierung. |
| desktop-186 | Schnell finden / https://luxestyle.ch/pages/marken-kategorien | Shopweite Hilfs-/Redaktionsfunktion; Platzierung ausserhalb der sechs Kaufbereiche offen. Ziel vollständig sichern. |
| desktop-199 | Wärme & Komfort / https://luxestyle.ch/collections/waerme-komfort | Bereichsübergreifende Auswahl, Lager-/Werbeversprechen oder gesonderter Alterskontext; kein belegter eindeutiger Hauptbereich. Keine Löschung oder Aktivierung. |
| desktop-200 | Handwärmer / https://luxestyle.ch/collections/handwaermer | Bereichsübergreifende Auswahl, Lager-/Werbeversprechen oder gesonderter Alterskontext; kein belegter eindeutiger Hauptbereich. Keine Löschung oder Aktivierung. |
| desktop-218 | Merkliste / https://luxestyle.ch/pages/merkliste | Shopweite Hilfs-/Redaktionsfunktion; Platzierung ausserhalb der sechs Kaufbereiche offen. Ziel vollständig sichern. |

Lager-, Bestseller-, Premium-, Viral- oder Altersangaben in Quelltiteln sind beobachtete Beschriftungen, keine bestätigten Eigenschaften. Die Zuordnung aktiviert keine altersbezogene Kategorie und stellt keine Lager- oder Bestsellerwerbung neu bereit.

## Konkrete nächste Schritte für Claude

1. Diesen lokalen Bericht und die quellgehashten Dateien lesen; read-only Prüfer ausführen. Keine erneuten Shopabrufe nur für diese Dokumentation.
2. Für eine spätere konkrete Migration gezielt das tatsächlich zugewiesene native Shopify-Menü mit ID/Handle, Eintrags-IDs, Typen, Reihenfolge und Ressourcenreferenzen lesend sichern. Die jetzigen 218 href sind kein vollständiger Adminbaum.
3. Die offenen Eintrags-IDs mit sichtbarer Vorschau getrennt klären: allgemeine Highlights/Lager-/Viral-/Premiumauswahl, Alterskontext, Selbst gestalten sowie shopweite Hilfsseiten. Ziele erhalten, bis ihre Platzierung feststeht.
4. Alle 195 Desktopziele und die fünf getrennten Technik-Tagrouten in der späteren Zielvorschau nachweisen; 22 Crosslinkgruppen sowie gleiche Titel mit anderen Zielen einzeln prüfen. Keine automatische Löschung oder Zusammenführung.
5. Die 31 bisherigen Einträge auf Ebene3 bei Einfügen neuer Sammelbereiche in höchstens drei sichtbare Ebenen überführen; Ziel und gesicherter übergeordneter Link müssen erhalten bleiben. Reihenfolge und Crosslinks separat abnehmen.
6. Die 14 Desktopziele ohne mobile href am späteren Stagingmenü prüfen. Ein Mobildialogtitel ersetzt keinen nachgewiesenen klickbaren Übersichtslink.
7. Erst einen vollständigen exakten nativen Menu-Diff mit Rücksetzreferenz und Desktop-/Mobilprüfung vorbereiten. Keine Liveschreibaktion, Aktivierung, Handleänderung oder zusätzliche Prototypfunktion ist hier beauftragt.

Reproduzierbare Prüfung ohne Schreibzugriff oder Netzwerk:

```bash
python /workspace/luxestyle-review/sitewide-20261025/migration/check_menu_migration.py
```

Der Prüfer liest nur die drei Quellen und die erzeugte JSON-Datei. Er vergleicht sämtliche archivierten Desktop-href-Vorkommen, Quellpfade, Hashes, Zielschutz und die vorhandenen JSON-Einträge. Keine Prüfaussage zur vollen Shopify-Menüquelle oder zu Live-Zielseiten.
