# Leere Kollektionen — was füllen, was abmelden (Messung 15.09.2026)

Betreiber-Frage: «118 von 518 in Entwurf? oder fix». **Die Antwort ist beides, aber nicht pauschal.**
Am 14.09. stand «Weihnachten» im Menü und führte auf 4 Artikel, während 162 passende im Katalog
lagen — es fehlte nur der Tag. Diese Frage wurde deshalb für alle 118 einzeln gestellt:
**Gibt es die Ware im Katalog, oder gibt es sie nicht mehr?**

Gemessen wurde je Kollektion mit ihrem EIGENEN definierenden Merkmal (Regel-Tag bzw. Hersteller),
nicht mit Wörtern aus dem Kollektionstitel. Das ist der Unterschied zwischen 39 und 18 «füllbaren»:
generische Titelwörter wie «Herren» (4'711 Treffer) oder «Damen» (2'487) messen nichts.

## Das Ergebnis in vier Gruppen

| Gruppe | Zahl | Was damit zu tun ist |
|---|---|---|
| **A FÜLLBAR** | **18** | Die Ware ist da, der Tag fehlt. Füllen. |
| **B TOT** | **76** | Null passende aktive Artikel. Abmelden und weiterleiten. |
| **C DÜNN** | **13** | 1 bis 7 Artikel. Einzeln ansehen, meist Saison. |
| **M ohne Regel** | **11** | Handverlesen, Ware inzwischen Entwurf. Einzeln. |

## A — füllbar (18)

| Handle | Titel | passende aktive Artikel |
|---|---|---|
| `spielzeug-kostueme` | Kostüme & Verkleidung | 549 |
| `ladegeraete` | Ladegeräte | 290 |
| `velo` | Velo & Radsport | 223 |
| `spielzeug-puzzles` | Puzzles | 186 |
| `spielzeug-figuren` | Action- & Sammelfiguren | 186 |
| `spielzeug-brettspiele` | Brett- & Gesellschaftsspiele | 186 |
| `spielzeug-puppen` | Puppen & Puppenhaus | 186 |
| `kaffee-maschinen` | Kaffee & Espresso | 104 |
| `bar-tools` | Bar-Tools | 97 |
| `bar-wein` | Bar & Wein | 97 |
| `premium-beauty` | Beauty · Premium | 59 |
| `made-in-switzerland-premium` | Curated Premium | 41 |
| `smart-home-sub` | Smart Home | 27 |
| `beamer-projektoren` | Beamer & Projektoren | 23 |
| `vasen` | Vasen | 15 |
| `maker-elektronik` | Elektronik für Bastler | 13 |
| `e-scooter-trottinett` | E-Scooter & Trottinett | 12 |
| `klima-ventilatoren` | Klima & Ventilatoren | 10 |

**Davon am 15.09. wirklich gefüllt: vier.** Bei den übrigen ist das Suchwort mehrdeutig, und
Shopify kennt keine Wortgrenze (`title:Velo` ohne Sternchen liefert 0, `title:*velo*` liefert
«Velours»). Gemessen und deshalb verworfen:

| Kollektion | Suchwort | was es fälschlich trifft |
|---|---|---|
| bar-tools, bar-wein | Bar | Ohrringe «Barque», «Schoggi Bar»-Tasse, Pilates Bar |
| maker-elektronik | maker | Waffel-Maker, Sandwich-Maker, Smoothie-Maker — **alle sechs Stichproben** |
| velo | velo | Velours-Cap, Sneaker «Velocità» |
| kaffee-maschinen | kaffee | Daunenjacke «Kaffeebraun», Kaffee-Nagelsticker |
| premium-beauty | beauty | Jumpsuit mit «Beauty-Rücken» |
| smart-home-sub | Smart Home | «Nice Smart» Gemüseschneider |
| klima-ventilatoren | klima | Halsschal für klimatisierte Räume, Haustierbett |
| spielzeug-kostueme | Kostüm | trifft sauber, aber es gibt schon zwei Kostüm-Kategorien |

Diese acht brauchen ein besseres Merkmal als ein Titelwort, zum Beispiel den Produkttyp. Das ist
Handarbeit pro Kollektion und lohnt sich erst, wenn eine davon Verkehr bekommt.

## B — tot (76): abmelden und weiterleiten

Das sind fast ausschliesslich **BigBuy-Markenregale**, deren Lieferant seit dem 15.09. weg ist:
Michael Kors, Calvin Klein, Hugo Boss, Swatch, Casio, Adidas, Puma, Lancôme und so weiter. Dazu
abgelaufene Anlässe (WM 2026) und Kategorien ohne Ware (Tauchen, Servieren).
Sie füllen sich **nie wieder**, weil es den Lieferanten nicht mehr gibt.

Vorschlag unverändert: aus dem Onlineshop nehmen, dann 301 auf die passende Oberkategorie.
**Nicht ausgeführt** — das ist der Punkt, an dem «Katalog nicht verkleinern» und «keine leeren
Regale» sich widersprechen, und das entscheidest du.

## C — dünn (13) und M — ohne Regel (11)

| Handle | Titel | aktive Artikel |
|---|---|---|
| `silvester-neujahr` | New Year & Silvester | 7 |
| `auto-power` | Auto-Power | 7 |
| `akupressur` | Akupressur | 6 |
| `wandkunst` | Wandkunst | 5 |
| `elektriker-werkzeug` | Elektriker & Installation | 5 |
| `auto-reinigung` | Auto-Reinigung | 4 |
| `metalldetektoren-schatzsuche` | Metalldetektoren & Schatzsuche | 4 |
| `metalldetektor` | Metalldetektoren & Schatzsuche | 4 |
| `premium-marken-lager` | Premium & Marken | 4 |
| `indoor-grow` | Indoor-Gärtnern & Grow | 2 |
| `vatertag-2026-papa` | Vatertag 2026 – Geschenke für Papa | 1 |
| `mystery-top-deals` | Mystery & Top-Deals | 1 |
| `vereins-fanartikel` | Vereins-Fanartikel | 1 |

Die Saison-Kollektionen darunter (Vatertag, Silvester, Black Friday) sind kein Befund: Sie füllen
sich, wenn die Saison kommt und der Tag gesetzt wird.

Ohne Smart-Regel, also handverlesen und inzwischen leer:
`naturkosmetik-beauty`, `reise-outdoor`, `self-care-wellness-1`, `express-lieferung`, `tiktok-ads-ready`, `home-family`, `wellness-bundles`, `tiktok-viral`, `tiktok-hero-products`, `premium-bundles`, `angebote`

## Werkzeug

`automation/leere_kategorien_fuellen.py` trägt die geprüften Paare aus Suchwort und Tag; jedes neue
Paar wird erst als Stichprobe angesehen, dann eingetragen. Ledger
`dropship/_leere_kategorien_gefuellt.txt`, `DRY=1` zeigt nur.
