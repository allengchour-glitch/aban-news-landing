# LuxeStyle — woran die Verkäufe hängen (alles gemessen, 2026-09-12)

Auftrag des Users: „lerne für luxestyle.ch viele verkäufe". Alles hier ist live gemessen,
nichts aus dem Gedächtnis übernommen. Drei Aussagen des Gedächtnisses sind dabei widerlegt.

---

## 1. Das Gedächtnis war beim Wichtigsten überholt

`CLAUDE.md` sagt (Stand 2026-07-05): **„2 bezahlte Bestellungen"**, und (Stand 2026-06-13):
**„0 Käufe, Conversion 0,0 %, Engpass = Traffic-QUALITÄT"**.

Gemessen über die Order-API: **14 Bestellungen seit 1. Juli.** Der Shop konvertiert.

| Order | Datum | Produkt | CHF | Status |
|---|---|---|---|---|
| #1005 | 03.07. | WM-Trikot (Printful) | 41.90 | bezahlt, geliefert |
| #1011 | 03.08. | — | 21.90 | bezahlt, geliefert |
| #1014 | 15.08. | Leinen-Set «Provence» (CJ) | 41.90 | bezahlt, geliefert |
| #1017 | 07.09. | Fuda Taschenmesser (CJ) | 40.90 | bezahlt, versandt |
| #1018 | 07.09. | E-Scooter Ladegerät (CJ) | 28.90 | bezahlt, geliefert |

**Fünf echte Kundenbestellungen**, rund eine alle zwölf Tage, Warenkorb CHF 21.90 bis 41.90.
Dazu drei Testbestellungen des Shop-Inhabers.

## 2. Mehr Geld wurde zurückerstattet als eingenommen — und warum

| Order | Datum | Produkt | SKU | CHF |
|---|---|---|---|---|
| #1006 | 07.07. | Kompakte Kühlung (Klimagerät) | `BB-S0465893` | 426.51 |
| #1007 | 07.07. | Flexible Raumkühlung (Klimagerät) | `BB-S91120937` | 265.90 |
| #1008 | 08.07. | Schlauchboot Intex Excursion 5, 366 cm | **`null`** | 177.21 |

**CHF 869.62 von echten Schweizer Kunden, alle drei unerfüllt und zurückerstattet.**
Gegenüber CHF 175.50, die geblieben sind. Das Muster ist eindeutig: alle drei sind
**BigBuy-Schwergut** — zwei mobile Klimageräte und ein 3,66-Meter-Boot. Bei #1008 fehlte
die Lieferanten-SKU vollständig, das Produkt war also von Anfang an nicht lieferbar
(genau die „Fake-SKU-Falle", Master-Lesson 6, und die Sperrgut-Regel, Master-Lesson 9).

**Bereits behoben:** beide Klimageräte stehen auf DRAFT, das Schlauchboot existiert nicht mehr.
Eine frühere Session hat die Blutung gestoppt.

Die vierte Rückerstattung, #1016 (47.90, 03.09.), war **kein** Produktfehler: dasselbe
Taschenmesser, derselbe Kunde, gelöst durch die Ersatzlieferung #1017 (Tag `ersatz-1016`).
Auffällig ist nur, dass #1016 den rohen Lieferanten-Variantentext trug
(„Blue Wooden Handle-213mm-Blue Wooden Handle") und #1017 das übersetzte „Blau, Holzgriff".

**Regel daraus:** was sich erfüllen lässt, ist CJ-Kleinware mit echter `CJ-`-SKU zwischen
CHF 20 und 45. Was sich nicht erfüllen lässt, ist BigBuy-Sperrgut. Alle fünf bezahlten
Bestellungen liegen in der ersten Gruppe, alle drei echten Rückerstattungen in der zweiten.

## 3. Der Traffic hat sich halbiert, die Conversion ist trotzdem entstanden

| | Gedächtnis (13.06.) | Gemessen (12.09.) |
|---|---|---|
| Sessions 30 Tage | 2994 | **1248** |
| Käufe | 0 | 5 echte |

Quellen der 1248 Sessions: direct 871, social 227, **search 124**, unbekannt 25.

Damit ist die alte Diagnose „Engpass = Traffic-Qualität" nicht mehr die ganze Wahrheit.
Bei halbiertem Traffic entstanden Verkäufe. Auffällig ist die **Suche mit nur 124 Sessions**,
obwohl laut Gedächtnis 32 812 Produkte in Google Shopping für die Schweiz freigegeben sind.

## 4. Der grösste gemessene Defekt — die Startseite

Messgerät: `tools/shop_startseite.mjs`, 12 Abrufe je Adresse, Gegenprobe eingebaut
(eine erfundene Adresse muss 100 % Fehler ergeben, `robots.txt` 0 %).

| Adresse | Erfolg | Fehlerquote | Grösse | Server |
|---|---|---|---|---|
| **Startseite** | 10/12 | **17 %** (HTTP 500) | **6,91 MB** | 654 ms |
| Produktseite | 12/12 | 0 % | 0,55 MB | 286 ms |
| Collection `sommer` | 12/12 | 0 % | 1,13 MB | 350 ms |

Produktseite und Collection liegen auf derselben Shopify-Infrastruktur und sind fehlerfrei.
Es ist also **diese Seite**, nicht der Shop. Die Fehlerseite ist Shopifys eigene
„Something went wrong" — das erscheint, wenn das Rendern die Grenzen überschreitet.

### Die Ursache, Abschnitt für Abschnitt gezählt

Die Startseite hat **17 Produktreihen**. Jede rendert **72 Produktlinks bei 12 verschiedenen
Produkten** — jedes Produkt also **sechsmal**, nachgezählt über die Häufigkeit jedes Links:

```
=== mode_row ===
  Links gesamt: 72 · verschiedene Produkte: 12
  Häufigkeit je Produkt: [6]
```

Gesamtbilanz der gerenderten Seite: **1108 Produktlinks, 1130 Bilder, 1896 eingebettete
SVGs**. 17 Produktreihen à rund 430 KB ergeben 6,6 der 7,0 MB. Fünf von sechs Kopien jeder
Produktkarte sind reine Verschwendung.

### Und der Treffer, der das mit den Verkäufen verbindet

Alle drei nachprüfbar verkauften Produkte liegen in **denselben** Collections:

- `bestseller-unter-50` („Lieblinge unter CHF 50")
- `geschenke-unter-50-franken` („Geschenke unter CHF 50")
- `geschenke-unter-100-franken`

**Keine** der 17 Startseiten-Reihen nutzt eine davon. Die Reihen bewerben `hype-jetzt`,
`damen-mode`, `premium-schmuck`, `gaming`, `sub-haustier` und elf weitere Kategorien — aber
nicht die Preisklasse, aus der jeder einzelne echte Verkauf kam.

## 5. Was daraus gebaut wurde

`automation/homepage_slim.mjs` stellt die Startseite um, idempotent, mit fünf Selbsttests:

| | vorher | nachher |
|---|---|---|
| Produktreihen | 17 | **4** |
| konfigurierte Karten | 184 | **32** |
| erwartete Produktlinks | 1108 | **192** |
| Grösse der Vorlage | 139 497 B | **51 475 B** |

Die vier bleibenden Reihen, in dieser Reihenfolge:

1. **Geschenke unter CHF 50** — die bewiesene Verkaufsklasse, ganz oben
2. **Unsere Bestseller** (44 kuratierte Produkte)
3. **Neuheiten**
4. **Ab Schweizer Lager, 1–2 Tage** — beantwortet den Haupteinwand im Schweizer Dropshipping

Hero, USP-Leiste, Kategorie-Raster, Trust-Blöcke, Video-Spot und JSON-LD bleiben unberührt.

**Das Skript schreibt nie in das aktive Theme.** Es legt eine Kopie an und schreibt dort;
es hat einen Sicherheitshalt, falls das Ziel doch das aktive Theme wäre.

## 6. Was nur der User kann

Ein **Mensch muss das Theme veröffentlichen**. Die Sicherheitsregel des Shopify-Zugangs
blockiert Schreibzugriffe auf das aktive Theme mit genau dieser Begründung, und
`themePublish` ist ebenfalls gesperrt. Es ist ein Klick:
Shopify-Admin → Onlineshop → Themes → Kopie → Veröffentlichen.

Zum Scharfstellen des Skripts braucht es ausserdem die Secrets
`SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SHOP`. Dann läuft es per
Actions-Dispatch („Startseite schlank (LuxeStyle)"), erst mit `dry_run`, dann scharf.

## 7. Zwei Dinge, die ich bewusst NICHT angefasst habe

**`bestseller-unter-50` ist nur in „Point of Sale" und „Inbox" publiziert, nicht im
Onlineshop.** Das sieht nach der Collections-Publish-Falle aus. Es ist aber keine: die
Adresse liefert **301** und leitet auf `geschenke-unter-50-franken`, die in 8 Kanälen steht
und 200 liefert. Hätte ich „reparierend" publiziert, wäre ein Duplikat entstanden und die
Weiterleitung zerstört.

**279 aktive BigBuy-Produkte haben kein Gewicht** (alle Messwerte leer), und darunter steht
**Markenware**: Michael Kors, Jimmy Choo, Puma Ferrari, Oral-B, Pesavento, Lechuza. Nach der
Rückerstattungs-Historie und Master-Lesson 9 ist das ein Kandidat zum Aussortieren — aber
das ist eine Katalog-Entscheidung über 279 Produkte und gehört in eine eigene, gemessene
Runde, nicht als Nebenwirkung dieser.

## 8. Eine Messfalle, die andere Sessions Zeit kosten wird

`productsCount` **ignoriert Preisfilter stillschweigend**:

```
productsCount(query:"status:active variants.price:>99999")  →  10000
productsCount(query:"status:active sku:zzzgibtesnicht*")    →      0
```

Der SKU-Filter greift, der Preisfilter nicht. Wer nach `variants.price` zählt, bekommt die
Gesamtzahl zurück und hält sie für ein Ergebnis. Aufgefallen ist es nur, weil vier
verschiedene Abfragen exakt dieselbe Zahl lieferten.
