# CJ-Sourcing: alle 17 Antworten durchgemessen (Stand 2026-10-24, nachmittags)

Auslöser: der Besitzer schrieb „erledige alle mails" — CJ hatte inzwischen jede Anfrage
beantwortet. Gemessen mit **`node automation/cj_sourcing_pruefen.mjs`** (nur lesend); das
Werkzeug holt den Stand, löst jede vorgeschlagene CJ-pid auf und misst
`logistic/freightCalculate` CN→CH je Variante. Ledger: `dropship/cj_sourcing_ledger.txt`.

## 🚨 Das Ergebnis in einem Satz

**13 von 17 Ersatzlieferanten versenden nicht in die Schweiz** — obwohl CJ bei allen
„Sourcing Succeeded" meldet.

| Urteil | Anzahl |
|---|---|
| lieferbar | **3** (zwei davon stehen schon live) |
| nicht lieferbar (null Frachtlinien CN→CH) | **13** |
| unbekannt | **1** |

CJs Statuswort misst, ob *irgendein* Lieferant gefunden wurde — nicht, ob er in die Schweiz
liefert. **Ohne eigene Frachtmessung wären hier dreizehn nicht lieferbare Produkte live
gegangen**, genau die Ursache aller elf Erstattungen des Shops.

## Die drei lieferbaren

| Produkt | Linien | Fracht | EK | gelandet | Stand |
|---|---|---|---|---|---|
| `leuchtender-halloween-schaukelgeist-627400` | 16 | USD 15.09 | USD 4.92 | CHF 16.50 | **live** |
| `elektrischer-fleischwolf-5l-kuchenmaschine-656962` | 7 | USD 35.52 | USD 9.55 | CHF 37.15 | **live** |
| `sternenhimmel-projektor-baby-nachtlicht-mit-musik` | 16 | USD 11.46 | USD 11.88 | CHF 19.24 | **bleibt DRAFT, siehe unten** |

## 🚨 Der dritte Treffer ist ein ANDERES GERÄT — und das sieht man nur am Bild

CJ meldet für den Sternenhimmel-Projektor **`Similar Products`**, nicht „Succeeded": es ist
ausdrücklich ein ähnliches, kein gleiches Produkt. Die Zahlen sahen gut aus (16 Linien,
gelandet CHF 19.24 gegen VK CHF 39.90 = Marge ≈ CHF 20.66), also wäre es verlockend gewesen,
den Entwurf einfach auf ACTIVE zu stellen.

**Beide Bilder nebeneinander gelegt zeigen zwei verschiedene Geräte:**

| | Shop-Seite | CJs Ersatz (`1633069064715251712`) |
|---|---|---|
| Form | tropfenförmig, seitliche Linse | tierförmiges Gehäuse, **Kristallkugel oben** |
| Projektion | Laser-Sternenfeld + Nebel | **Wasserwellen-Muster + Mond** |
| Musik | 12 **integrierte** Schlaflieder mit Timer | **Bluetooth** (Musik kommt vom Handy) |
| Bedienung | Fernbedienung mit STAR/NEBULA | Tastenreihe mit USB/LED + Fernbedienung |

Die Produktseite verspricht „12 integrierte Schlaflieder mit Timer" und „8 Farbmodi".
Mit diesem Gerät stimmt **keine** der beiden Angaben. Ein Tausch hätte die Seite zur
Falschauszeichnung gemacht — dieselbe Klasse wie der „Mini-Kühlschrank", der eine
Insulin-Kühlbox war. **Der Entwurf bleibt DRAFT**, Tag `cj-ersatz-anderes-geraet-1024`.

**Ein eigenes neues Produkt dafür anzulegen lohnt auch nicht, und das ist gemessen:** der
Shop führt bereits **73 aktive „Projektor"-Produkte**, darunter zwei aktive
Sternenhimmel-Projektoren (`led-sternenhimmel-projektor-lampe-417728`,
`romantischer-sternenhimmel-projektor-066dbc`, je CHF 15.90). Gegenprobe mit
`lieferbarkeit_guard.mjs`: **beide sind lieferbar (2 von 2 geprüft, 0 Befunde)**. Die Nische
ist also versorgt; ein weiteres Gerät wäre mehr Katalog ohne mehr Umsatz.

## Die dreizehn ohne Versandlinie

Je `product/query` gelesen, je Variante Fracht gemessen, **alle null Linien CN→CH**:

| Produkt | EK neuer Lieferant |
|---|---|
| `rizinusol-wickel-set-mit-bio-ol-323457` | USD 7.85 |
| `ubersetzer-kopfhorer-144-sprachen-echtzeit-bluetooth-5-3` | USD 29.37 |
| `full-hd-dashcam-1080p-auto-kamera-90-weitwinkel-nachtsicht-loop` | USD 23.89 |
| `bausteine-set-widebody-racer-321-teile` | USD 14.00 |
| `bausteine-set-police-racer-318-teile` | USD 15.00 |
| `quallen-diffuser-medusa-mit-musik-led` | USD 19.00 |
| `spulbecken-organizer-schwamm-seifenhalter-mit-ablauf` | USD 12.50 |
| `reed-diffuser-aroma-duftstabchen-ohne-flamme` | USD 2.94 |
| `schaum-abflussreiniger-604000` | USD 2.81 |
| `4l-luftbefeuchter-cool-mist-fur-grosse-raume-leise-lang-anhaltend` | USD 20.40 |
| `resistance-bands-set-5-teilig-fitnessbander-heim-training` | USD 26.04 |
| `selbstklebende-3d-wimpern-wiederverwendbar-ohne-kleber-naturlicher-look` | USD 10.91 |
| `silikon-abtropfmatte-xl-rutschfest-hitzebestandig-furs-spulbecken` | USD 16.99 |

Alle tragen jetzt `cj-ersatz-nicht-lieferbar-1024`, damit keine spätere Sitzung dasselbe
Tagesbudget noch einmal dafür ausgibt. **Alle 14 betroffenen Produkte sind DRAFT** —
nachgeprüft, es steht nichts davon im Verkauf.

**Besonders bitter bleibt das `rizinusol-wickel-set-mit-bio-ol-323457`:** die vierthäufigste
Produktseite des ganzen Shops (64 von 2619 Sitzungen) und rentabel — auch der gesuchte
Ersatzlieferant versendet nicht in die Schweiz.

## Der eine unbekannte Fall

`schwingerhose-fgahb2887ml` bekam `Similar Products` mit einer **internen UUID**
(`DDD50071-…`) statt einer CJ-SKU. Nach der Regel in `automation/lib/lieferbarkeit.mjs` ist
das **unbekannt** — nicht lieferbar und nicht unlieferbar. Nichts geändert, Tag
`cj-ersatz-unklar-1024`.

## Was das fürs nächste Mal heisst

1. **Eine CJ-Erfolgsmeldung ist kein Lieferversprechen.** Die Quote dieser Runde ist
   3 von 17, und zwei der drei kannte man schon. Sourcing-Anfragen sind billig, aber ihr
   Ertrag ist klein — das Tagesbudget gehört den meistbesuchten Produktseiten
   (`BESUCHT=1 TAGE=30`), nicht der Marge.
2. **`Similar Products` nie als Ersatz behandeln, ohne die Bilder zu vergleichen.** Die
   Zahlen stimmten hier, das Gerät nicht.
3. **Vor einem neuen Produkt den eigenen Katalog zählen.** 73 Projektoren sind die Antwort
   auf die Frage, ob sich ein 74. lohnt.
