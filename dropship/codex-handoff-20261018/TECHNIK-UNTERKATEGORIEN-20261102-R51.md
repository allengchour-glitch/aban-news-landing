# LuxeStyle: Technik sortiert und Unterkategorien verknüpft, 02.11.2026, R51

Die Produktsortierung und die feinere Kategorienavigation sind **live**. Die kleine mobile Breitenkorrektur ist **im vorhandenen Entwurf fertig geprüft, aber noch nicht im Live-Theme umgesetzt**.

| Bereich | Tatsächliche Änderung | Bestätigung |
| --- | --- | --- |
| Technikübersicht | Sechs ausgewählte Einstiegsprodukte vor die bisherige Folge vieler ähnlicher Fernbedienungen und Schlüsselartikel verschoben | Native Jobausführung abgeschlossen; neue erste sechs IDs und erste zwölf Positionen bestätigt. 20 öffentliche Prüfbedingungen bei 390/1440 px bestanden |
| Unterkategorien | Zehn vorhandene Technikbereiche mit 60 bestehenden feinen Kategorien verbunden | 69 neue typisierte Referenzfelder, als create-only abgesichert und exakt zurückgelesen. Bestehende eigene Rucksack-Unterfilter geschützt |
| Erreichbarkeit | Zehn Gruppenseiten und 60 bekannte Blattziele geprüft | Alle 60 Links in richtiger Reihenfolge vorhanden; alle 60 Ziele mit HTTP 200 bei genau einer HEAD-Anfrage je Ziel erreichbar; native Produktzähler positiv |
| Zuordnung | Bestehende Sammelregel der Technikübersicht um zwölf positive Unterkategorie-Tags ergänzt | Alte elektronik-Bedingung bleibt enthalten; Ausschlüsse, Texte, SEO und Sortierart erhalten. Native Zahl 6018 → 6223, keine Anzahl öffentlich kaufbarer Produkte behauptet |
| Mobile Feinkorrektur | Eine CSS-Regel für die neue Unterfilterzeile im Entwurf korrigiert | Entwurf 212978598279 nativ exakt bestätigt; 36/36 Prüfbedingungen in drei Vorschauansichten bestanden. Aktueller MAIN 213013037447 unverändert |

Neue erste Produktauswahl in [Elektronik & Technik](https://luxestyle.ch/collections/elektronik-technik):

1. Kabellose In-Ear-Kopfhörer – CHF 16.90
2. Nordische Tischuhr mit Wecker und Nachtlicht – CHF 21.90
3. 2K HD Smart Wi-Fi Innenkamera – CHF 44.90
4. Smarter Thermostat für Heizsysteme – CHF 33.90
5. Sternenlicht-Projektor für Schlafzimmer – CHF 34.90
6. Sport-Kopfhörer mit Knochenschall – CHF 37.90

Für die sechs Produkte wurden ACTIVE-Status, Zugehörigkeit zur Mutterkollektion, eine verfügbare Variante, der passende CHF-Preis und echte geladene Bilder bestätigt. Daraus folgt keine Bestands- oder Lieferzusage. Die Auswahl ist kein gemessener Verkaufsrang. Andere Produkte wurden nicht entfernt. Die native API bewahrt bei den sechs sequenziellen Moves die relative Reihenfolge der übrigen Produkte; zusätzlich wurden die ersten zwölf Positionen geprüft, kein Gesamtscan der 6223 Positionen.

Feinere Unterkategorien sind jetzt in den Bereichen Handy & Laden, Kopfhörer & Audio, Smartwatches & Wearables, Kamera/Foto/Drohnen, TV/Beamer/Streaming, Gaming/VR, PC/Computer, Büro/Drucker, Sicherheit/Überwachung und Strom/Batterien/Solar verknüpft. Beispiele: [Handy-Zubehör](https://luxestyle.ch/collections/handy-zubehoer) mit Powerbanks, Ladegeräten, kabellosem Laden und Kabeln; [PC & Homeoffice](https://luxestyle.ch/collections/pc-homeoffice) mit Tastaturen, Mäusen, Speicher und Hubs. Blattseiten erben die passende Geschwisterauswahl. Die 60 Sammlungen existierten bereits; es wurden keine doppelten Kategorien angelegt. Das Hauptmenü und die 15 bestehenden Hauptgruppen bleiben erhalten.

Die Zuordnungsgegenprobe fand bei 13 von 36 eng geprüften Unterkategorie-Artikeln den bisherigen Muttertag elektronik nicht. Dies ist keine Katalogquote. Statt Produkttags zu überschreiben, wurde nur die bestehende positive ANY-Bedingung um zwölf nachgewiesene Sortiertags erweitert. Die vorherige Bedingung und alle beobachteten Ausschlüsse bleiben erhalten. Ein geprüftes Tastatur-Maus-Set gehört nun tatsächlich zur Mutterkollektion. Wegen seines unvollständigen Hauptbilds wurde es trotzdem nicht als Blickfänger ausgewählt. Verpackungsfoto und Massgrafik zweier weiterer Kandidaten wurden ebenfalls nicht hervorgehoben. Preise, Bilder, Tags und Varianten wurden nicht geändert.

**Noch offen: die mobile Breitenkorrektur im aktuellen Live-Theme.** Die neu aktivierte Unterfilterzeile legt eine bestehende CSS-Schwäche frei: 390 px Breite innerhalb einer 358 px breiten Gridspur erzeugen 16 px Seitenüberlauf. Die öffentliche Unterkategorienprüfung steht deshalb weiterhin bei 28/30; die beiden mobilen Fehler sind nicht als behoben markiert. Ziele, Vererbung und aktive Markierungen funktionieren. Die Technik-Mutterseite hat unabhängig davon bei 390/1440 px keinen Überlauf.

Der minimale Fix ist konkret vorbereitet: Bei lx-uf die Maxbreite auf 100 % des Elternbereichs beziehen und width:100% sowie min-width:0 setzen. Nur diese Regel ist im bestehenden UNPUBLISHED-Entwurf 212978598279 geändert; alle übrigen JSON-Inhalte bleiben erhalten. Datei templates/collection.json: vorher MD5 f7f61b522473dc280e7424cd300af19f, danach c7020b391b776427a1346a91540c646f. Liquid-Block VALID/SUCCESS. Die echte Vorschau bei 390 px für Handy-Zubehör/Ladekabel und 1440 px für Handy-Zubehör: 36/36 begrenzte Prüfbedingungen, kein Seitenüberlauf, keine DOM-/CSS-Overrides.

Der verfügbare Shopify-Mutationszugang erlaubt Theme-Dateiänderungen nur an unveröffentlichten Themes und blockiert MAIN-Dateiwrites/Publikation. Die bestehende Websitefreigabe gilt weiterhin. Es fehlt kein Einverständnis; eine erneute Freigabefrage ist nicht nötig. Ein legitimer Schreibzugang, der MAIN-Dateien ändern darf, muss nur diese kleine CSS-Korrektur am frisch gelesenen aktuellen MAIN 213013037447 anwenden und beide mobilen MAIN-Ansichten prüfen. Der aktuelle Quelldatei-Hash 6c0ccc1bf403cc94bf55d1dd98b3ea84 dient als Gegenprobe. Keine alte Theme-Kopie blind veröffentlichen; aktuelle Schrift-/Banneränderungen und alle übrigen Funktionen erhalten.

[Konkreter Fix in der Vorschau](https://luxestyle.ch/collections/handy-zubehoer?preview_theme_id=212978598279) · [Genaue Ausführung, Felder, Quellpatch und Prüfbelege](TECHNIK-UNTERKATEGORIEN-20261102-R51.json).

Prüfgrenzen: Die tatsächliche API akzeptierte die Operationen ohne userErrors; der native Vorvalidator übersprang die Prüfung und der vorhandene GraphQL-CLI-Prüfer konnte wegen fehlender Bundle-Assets nicht laufen. Keine grüne Voll-CI oder Checkout-/Tracking-/Indexierungs-/Ranking-/Verkaufsabnahme behauptet. Browserprüfungen blockierten Nicht-Lese- und Analytics-/Review-Anfragen; dabei auftretende Fetchfehler sind dokumentiert. HEAD 200 belegt Erreichbarkeit, nicht vollständige Produkt-/Varianten-Kaufbarkeit aller 60 Kategorien. Der vorherige unvollständige Beamer-Bodyabruf bleibt als eigener unbekannter Bodybeleg erhalten.

Die 17 bestehenden Aufgaben-IDs und Historien bleiben erhalten. Die eigene Strukturaufgabe tech-category-structure-20261102 wird ergänzt; damit sind es jetzt 18 IDs. Die bestehende Homepageaufgabe wird nur wegen des konkreten Entwurfsfixes fortgeschrieben; 16 andere Tasks bleiben unverändert. Keine neuen Analytics-, Flow-, Bestell- oder Kauf-Watchreports, Socialposts, Rabatte, Budgets, DNS- oder Shop-Einstellungen; keine neue Automation oder Frequenz, Installation oder kostenpflichtigen Renders. Die Versandgrenzen CHF 50 öffentlich und CHF 45 intern nach Rabatt sowie account.luxestyle.com.co bleiben erhalten. Der tatsächliche Empfang durch Claude ist unbekannt.
