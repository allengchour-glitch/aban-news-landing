# Warum Google fünf Produkte wegen «Promotional overlay on image» ablehnt (Messung 10.11.2026)

Anlass: die fünf Produkte mit dem Tag `google-bild-abgelehnt` (vom Kanal «Google & YouTube» genommen am 08.11., `dropship/merchant-probleme-0811/README.md`). Meine Notiz vom 08./09.11. lautete «Hauptbild sauber, Ursache bei Google unbekannt». Sie war zu eng: ich hatte nur das Hauptbild gesichtet. Heute alle Bilder je Produkt angesehen (Kontaktbögen aus Galerie und Variantenbildern, Shopify-Abfrage 10.11. ca. 05:46 UTC).

## Befund (GEMESSEN, von Auge an den Kontaktbögen)
| Produkt (Handle) | Variantenbilder | Hauptbild |
|---|---|---|
| `led-wasserwellen-projektionsleuchte-677504` | 12 von 18 Varianten haben ein Bild, 8 verschiedene: **alle 8 tragen Textfelder** (Masse, «16color plug in square», «2pcs», Marke «MO…») | sauber (weisser Grund) |
| `wasserfester-lippenstift-mit-spiegel-141952` | 8 von 8 Varianten, 8 Bilder: **alle mit Farbcode unten rechts** («OR01», «RD01» …); ein Bild mit schwarzen Flächen, ein Bild mit Banner «DIFFERENT SHADES» | sauber |
| `digitale-armbanduhr-aus-holz-fur-herren-275264` | 4 von 4: **alle mit grosser Uhrzeit-Ziffer unten rechts** («10:45», «4:34» …) | trägt dieselbe Ziffer |
| `seal-eyeliner-doppelpack-425280` | 3 von 3: **alle mit Beschriftung** («#01 : black», «#03 : White», «#02 : dark brown») und Markenname KIMUSE | Markenaufdruck auf Stiften und Packung |
| `press-lock-schnursenkel-elastisch-bindefrei-755456` | keine Variantenbilder | **Band «CHOOSE» in der Ecke und Farbname** («ROYAL BLUE») |

## Folgerung
Bei Produkten mit Variantenbildern beurteilt Google sehr wahrscheinlich das Bild der Variante, nicht nur das Hauptbild (Hypothese: die App «Google & YouTube» schickt je Variante deren Bild als `image_link`; an der App-Dokumentation nicht belegt, nur aus dem Muster «alle beanstandeten Produkte tragen Text in den Variantenbildern oder im Hauptbild»). Lampe und Lippenstift fielen darum durch, obwohl ihr Hauptbild sauber ist. **Ungemessen:** welches Bild Google je Produkt beanstandet hat (das Merchant Center nennt die Bild-Adresse im Problem-Detail; der Besitzer kann sie aus «Probleme mit Artikeln» nennen).

## Entscheid (meiner)
Die fünf Produkte **bleiben vom Google-Kanal genommen**, im Shop bleiben sie verfügbar. Gründe: 5 von rund 28 000 Produkten im Schaufenster; die Beschriftungen (Farbcode, Farbname, Nummer der Ausführung) helfen den Kundinnen im Shop bei der Wahl, ein Zuschneiden nähme diese Hilfe; die Wirkung eines Zuschnitts auf Googles Urteil lässt sich erst nach Tagen messen und der Nutzen ist klein (die Lampe verkaufte sich über andere Wege). Keine Bildänderung, nichts geschrieben.

## Wann das wieder auf den Tisch kommt
- Melden weitere Produkte «Promotional overlay» (neuer Export «Probleme mit Artikeln», frühestens 11.11.), dann **Variantenbilder in den Bild-Audit aufnehmen**: `automation/image-audit.mjs` prüft heute nur Hauptbilder (Wochenlauf, 60 Produkte).
- Soll eines der fünf zurück auf den Kanal: Beschriftungen aus den Variantenbildern entfernen (Zuschnitt oder saubere Ersatzbilder), Tag `google-bild-abgelehnt` entfernen, `PHASE=aufnehmen ONLY=<handle>` (`dropship/GMC-SCHAUFENSTER-2810.md`), nach zwei Tagen im Merchant Center nachsehen.

## Lehre
Ein Hauptbild-Befund gilt nicht für Produkte mit Variantenbildern: **jedes Variantenbild einzeln ansehen** (Kontaktbogen mit `ffmpeg concat` und `tile`, Nummern mit `drawtext`; Pillow ist in der Sitzung kaputt). Variantenbilder verweisen bei diesen Produkten auf Galeriebilder (0 zusätzliche), die Abfrage `variants { image { url } }` genügt.

## Nebenmessung 10.11. (Besuchsquellen, ShopifyQL 30 Tage)
4 234 Sitzungen, davon 3 871 «direkt» (überwiegend Roboter, früher belegt). Echte Quellen: Google 134, Facebook 116, Pinterest 36, DuckDuckGo 27, Bing 15, Ecosia 7, **ChatGPT 5**, Startpage 2. Bestellungen 17 (11 ohne Quelle, 3 intern, **3 Google**). Die Hebel «ChatGPT» und «Bing» sind damit klein (zusammen rund 60 Sitzungen im Monat); `robots.txt` sperrt keinen KI-Crawler (nur die Gruppen `*` und `adsbot-google`). IndexNow (Bing, Yandex) braucht eine Schlüsseldatei im Stammverzeichnis der Domain; ob das mit Shopify geht, ist ungeprüft (Hypothese: nein ohne Umweg), nichts eingerichtet.
