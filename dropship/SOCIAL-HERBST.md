# Herbst auf Social — Stand 25.09.2026 (Betreiber «herbstsachen auf sozial pushen»)

## Gemessen vorher
| Kanal | Herbst-Vorrang? | wartende Herbst-Posts |
|---|---|---|
| IG-Karussell (24 h) | ja, 1 Herbst-Set täglich (seit 24.09.) | – |
| Pinterest-Pins (6 h) | ja, `_pinterest_vorrang.txt` (wechselt je Pin) | – |
| TikTok-Produkt-Set | ja, gerade Tage | – |
| **Bild-Posts IG+FB (6 h)** | **nein** — Nachschub nahm nur die neuesten CJ-Produkte | **0 von 56** |
| **Reels IG+FB (8 h)** | **nein** — Reel-Motor ordnet nach hype/neu | **0 von 51** |
| **TikTok + YouTube Shorts (Metricool, 12 h)** | **nein** — ziehen aus `reels_seed.csv` | 0 |

## Getan (Kadenz unverändert)
- `social_saison_vorrang.py` (Tageslauf im Aufseher): 118 Herbst-Handles → `dropship/_social_vorrang.txt`, 117 CJ-pids →
  `dropship/_reel_vorrang.txt` (Halloween-Zeile bleibt vorne, läuft früher ab). Nach dem 30.11. leert sich die Liste selbst.
- `post_guard.nachVorrang()`: Bild-Poster, Reel-Poster und Metricool-Poster (TikTok/Shorts) ziehen Vorrang-Zeilen vor.
  Nur die Reihenfolge — Doppelpost-, Familien-, Preis- und Kaufbarkeits-Sperren gelten unverändert.
- Saison-Nachschub in `social_autopilot.sh`: liegen < 4 wartende Herbst-Bildposts in der Queue, reiht
  `queue_new_products.mjs VORRANG_TAG=herbst-2026` bis 4 ein (Kopfzeile «🍂 Herbst-Favorit»), unabhängig vom Gesamtvorrat.
- Erste 4 live eingereiht: Kapuzen-Sweatshirt, Fleece-Kapuzenpullover, USB-Aroma-Diffusor, Martin-Ankle-Boots.

## Zwei Fallen im ersten Lauf
1. **Doppel-Einreihung:** Die Doppelsperre des Nachschubs suchte den Handle nur als `/products/`-Link in der Caption.
   Seit 23.09. tragen die Captions «Link in Bio»; der Handle steht nur noch in der id-Spalte → derselbe Hoodie kam zweimal.
   Sperre liest jetzt auch die id-Spalte; Doppelzeile entfernt (Bestand: sonst keine Doppel-ids).
2. **Bild zeigt mehr als geliefert:** «Vintage Teetasse» CHF 32.90 — Titelbild zeigt 4 Tassen, geliefert wird 1 Tasse +
   Geschenkbox, «Blumen oder Pfingstrosen» ohne Auswahl → Post `skip-bild-zeigt-mehr-als-lieferumfang`, durch Boots ersetzt.
   Die Produktseite selbst hat dasselbe Problem (offen, Klasse «Auswahl fehlt» / Lieferumfang).

## Offen
- Reels: nur Herbstartikel mit CJ-Video kommen in Frage; der nächste Runner-Lauf meldet «Reel-Vorrang: … → N unter den Kandidaten».
