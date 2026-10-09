# Händlerwörter und fremde Uhren-Modellnamen (09.10.2026, 06:50–07:15 UTC)

Betreiber: «weiter». Dahinter steht die Lehre aus 穿戴甲 (`NAGEL-TITEL-2026-10-09.md`): CJ übersetzt chinesische Händlerwörter
wörtlich. Diesmal habe ich den ganzen Katalog nach diesen Wortfamilien abgesucht (Export 05:01 UTC, 51'904 aktive Produkte).

## Gemessen

| Chinesisch | Wörtlich im Shop | Gemeint | Treffer |
|---|---|---|---|
| 防爆 | «explosionsgeschützt», «explosionssicher», «Explosionsschutz» | reissfest, berstsicher | 75 Produkte (50 Leinen, Halsbänder und Geschirre; Schraubendreher, Powerbanks, Reissverschlüsse, Glasdeckel, Boxhandschuhe) |
| 爆款 | «Explosive Y2HDMAX …», «Explosion Money – …», «Holzofen Explosion» | Verkaufsschlager | 8 Titel |
| ins风 | «Ins Wind», «Wild Ins Wind», «Ins-Stil», «INS-Wind-Design» | Instagram-Trendstil | 7 Titel und rund 90 Beschreibungen |
| 百搭 | «All-match», «All-Matching» | passt zu allem | 12 Titel |
| 韩版 / 懒人 | «Koreanische Version», «Fauler Handy-Halter» | koreanischer Stil / Flexibler Halter | 2 |

**Gefährlich daran:** Bei Schraubendrehern («explosionsgeschützt und isoliert für sicheres Arbeiten») und Akkus
(«Explosionsgeschützter Polymer-Lithium-Akku») ist «explosionsgeschützt» eine Sicherheitsangabe aus dem ATEX-Bereich. Wer ihr
glaubt, benutzt das Werkzeug an einer Stelle, für die es nicht gebaut ist.

**Uhren mit fremden Modellnamen im Titel:** «Submariner», «Daytona», «Datejust» (Rolex) und «Nautilus» (Patek Philippe), 5 Uhren.
Die Bilder habe ich vergrössert geprüft. Auf den Zifferblättern stehen Eigenmarken (OLEVS, FAIRWHALE, CADISEN, SHIRLEY), also
keine Fälschungen. Nur der Titel lehnt sich an die fremde Marke an. Erlaubt bleiben Passt-für-Angaben wie «für Apple Watch»
(80×) und «Silikonarmband für Aquanaut», ebenso das Tier «Nautilus Stofftier» und die echte Markenware «SANTOS Schwimmbrille»
(BECO).

## Getan: 200 Produkte, 0 Fehler (Ledger `dropship/_haendlerwort.tsv`)

| Was | Anzahl |
|---|---|
| Titel «explosionsgeschützt» → «reissfest» (Tier/Reissverschluss) | 20 |
| Titel «Explosive …» / «Explosion» weg | 6 |
| Titel Händlerwort weg | 20 |
| Titel Uhren-Modellname weg | 4 |
| Titel von Hand (neuer Titel wäre eine Dublette gewesen) | 4 |
| Nur Beschreibung oder SEO | 146 |
| Neue Adresse mit 301 | 55 |
| Bild-Alt-Texte nachgezogen | 414 |

Beispiele:
- «Explosionsgeschütztes, bissfestes Haustierhalsband» → «Reissfestes, bissfestes Haustierhalsband»
- «Explosive Datejust Automatikuhr für Herren» → «Automatikuhr für Herren mit Saphirglas und Kalender»
- «Das Set ist explosionsgeschützt und magnetisch» → «Das Set ist magnetisch»
- «Integrierter Explosionsschutz für erhöhte Sicherheit.» → Satz entfällt
- «im angesagten Ins-Stil gehalten» → «im angesagten Trend-Stil gehalten» (im Fliesstext wird ersetzt, nicht gestrichen)

Live geprüft (WebFetch): `/products/explosionssichere-6-in-1-hundeleine-285248` leitet per 301 auf «Reissfeste 6-in-1
Hundeleine» weiter, und auf der Seite steht kein «explosion» mehr.

## Regel, Wächter, Importer

- **Regeldatei `automation/data/haendlerwort_regel.json`** mit Abschnitten für Titel und Text, Kontext «reissfest» (Tier,
  Leine, Reissverschluss), Uhren-Modellen mit Passt-für-Ausnahme und einer Hand-Titelliste. Sie hat 63 Kanarien, darunter Köder
  wie «Explosives Krafttraining», «Sequins», «Fünf-in-eins», «Daytona Beach», «für Apple Watch» und «Nautilus Stofftier».
- **Wächter `automation/haendlerwort.py`** läuft täglich im Aufseher (VSW-Block, gleicher Export wie versprechen_wache).
  - Ein Satz, der nach dem Streichen zerbricht, fällt ganz weg. Dazu gehören ein Satzanfang mit Präposition, ein hängendes
    Artikelwort, weniger als 4 Wörter, ein verwaister Bindestrich und ein neuer leerer Anführungsblock.
  - Neue Titel, die eine Dublette wären, bleiben stehen und werden gemeldet.
- **Importer**: `haendlerwort.mjs` hängt in `fallenSicher` und deckt damit alle drei CJ-Importer ab. Der Prompt hat neue
  Einträge unter «Bekannte Übersetzungsfallen» (explosion-proof, hot-selling, ins style, all-match, Uhren-Modellnamen).
  Rauchtest: «Explosionsgeschützte Hundeleine» wird zu «Reissfeste Hundeleine», «Submariner Taucheruhr» zu «Taucheruhr für
  Herren».
- **Gleichlauf** `haendlerwort_gleichlauf_test.mjs`: JS-Kanarien 63/63, py=js über 52'094 Proben mit 0 Abweichungen.

## Offen

- **Kleines «dein» am Satzanfang: 685 Beschreibungen.** Es gibt zwei Fälle:
  - Nur Rechtschreibung: «dein Kunstdruck wird ungerahmt geliefert», «deine Haut fühlt sich …».
  - Falscher Bezug aus der Sie→du-Umstellung: «Ihr» im Sinn von «sein/ihr» wurde zu «dein». Beispiele: «dein mechanisches
    Uhrwerk», «dein minimalistisches Design» bei einer Maske, «deine verstellbare Höhe», «deine natürliche Formel».
  
  Das ist die nächste Klasse.
- «Martin Boots» (马丁靴 = Dr.-Martens-artige Schnürstiefel) steht noch in einem Kindertitel.
- Englische Lieferanten-Namen stehen im Fliesstext, z. B. «Die Pigskin Men's Tods Casual Shoes» (Tod's ist eine Marke).
- Schutzschuhe und Tattoo-Geräte (persönliche Schutzausrüstung bzw. regulierte Ware) haben noch keine Prüfung.

## Lehre

**Eine Wortfamilie folgt aus der Quellsprache, nicht aus unserem Text.** «Explosion» steckte in fünf Bedeutungen:
reissfest, berstsicher, Verkaufsschlager, gehärtetes Glas und echter Explosionsschutz, den es hier nie gibt. Die Frage war
deshalb nicht «wo steht Explosion?», sondern «was hat der Lieferant gemeint?». Danach richtet sich, ob ersetzt
(reissfest), gestrichen (Werkzeug, Akku) oder umgeschrieben (Ins-Stil → Trend-Stil) wird.
