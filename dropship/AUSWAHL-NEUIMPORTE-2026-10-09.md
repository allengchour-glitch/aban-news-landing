# Neuimporte ohne Auswahl, obwohl CJ mehrere Varianten führt (09.10.2026, Verbesserungsrunde 20:26)

## Gemessen

**Neuimporte der letzten 24 h:**
- 452 aktive Neuimporte.
- Davon **320 mit genau EINER Variante** und Produkt-SKU `CJ-<pid>`.
- Alle 320 tragen den Tag `cj-real`. Der Importer ist `cj_category_fill.mjs`.
- Beispiele: «Weihnachtspullover für Hund – S», «Hundemütze aus Wolle XS», «Hundeschüssel Anti-Rutsch – M (mittel)», Rucksäcke,
  Näpfe, Yogamatte, Smartwatch-Armbänder.

**Stichprobe:** 40 zufällig gezogene dieser 320 bei CJ gemessen (`LISTE=… auswahl_fehlt_messen.py`, Vorrang-Weg). Ergebnis:
**30 von 40 (75 %) mit mehreren CJ-Varianten**, bei 28 davon hängen alle Variantenbilder schon am Produkt (hochgerechnet ~240 der 320 aus 24 h). Beispiele mit mehreren CJ-Varianten:

| Shop-Produkt | CJ-Varianten | Beispiel-Schlüssel |
|---|---|---|
| Armband aus Naturstein für Smartwatches | 6 | S-20MM, S-22mm, M-20MM … |
| Pedal-Spannvorrichtung für Sit-Ups | 9 | Fixed red, Fixed blue … |
| Hundeschüssel Anti-Rutsch – M (mittel) | 3 | Blue-M, White-M, Green-M |
| Yogamatte für Training und Fitness | 3 | Blue, Pink, Violet |
| Bluetooth Smartwatch Outdoor | 3 | Black, Denim Blue, ArmyGreen |

**Ganzer Messbestand** (`dropship/_auswahl_fehlt.jsonl`): 2'519 gemessen, davon 2'387 (95 %) mit mehreren CJ-Varianten.
577 sind bisher nachgerüstet.

## Ursache

**1. Der Importer baut Varianten nur für Mode-Gruppen.** In `cj_category_fill.mjs` steht
`const fash=(grp.fashion&&!FAST)?buildFashion(d):null`. Alles ausserhalb der Mode bekommt eine einzige Variante «Standard»
mit der SKU `CJ-<pid>`, auch wenn CJ Farben oder Grössen führt. Das betrifft Haustier, Sport, Taschen, Uhrenzubehör.

**2. Der Wächter sah diese Produkte nie.** Der Nachrüster im Aufseher misst nur die Klassenliste
`_klassen/auswahl-versprechen-bei-einer-variante.txt`. Das sind Produkte, deren Text eine Wahl verspricht. Beim Import
macht `wahlSicher()` den Text jeder Ein-Varianten-Ware aber genau davon frei. Ein Neuimport kommt also nie auf die Liste.

**Folgen:**
- Die Kundin kann Farbe oder Grösse nicht wählen.
- Der Bestell-Automat bekommt `CJ-<pid>` ohne Variante und stellt die Bestellung auf «manuell prüfen» (`cj_order_engine.py`).

## Getan

**Wächter:** Der Aufseher misst seit heute zusätzlich jede aktive Ein-Varianten-CJ-Ware der letzten 3 Tage
(`QUERY="status:active AND created_at:>=<heute−3>"`, LIMIT 1500, eigener Bericht `AUSWAHL-FEHLT-NEUIMPORTE.md`).
- Die Messung ist idempotent über `_auswahl_fehlt.jsonl` und läuft stündlich, mit flock.
- Der Nachrüster liest dieselbe Messdatei. Er baut die Auswahl, wo CJ mehrere Varianten führt: exakte CJ-SKU je Variante,
  Variantenbild, Preis nie tiefer, Rücklesen. Höchstens 150 pro Stunde.
- Fälle, bei denen der Titel eine Grösse festlegt («– S», «XS»), gehen wie bisher an MANUELL.

**Bestand:** Die 40 gemessenen Stichprobenprodukte stehen in der Messdatei. Der nächste Nachrüster-Lauf nimmt sie mit.

## Offen

- **Altbestand:** Rund 30'000 aktive Produkte haben eine Variante (Export 08.10.). Gemessen sind 2'519. Bei 95 % mehrfacher
  Varianten in der Messung ist das die grösste offene Bestell-Lücke im Shop.
  - Vorschlag für die nächste Runde: ein dritter Messlauf, zuerst über besuchte Seiten (30 T), dann nach Alter.
  - Er braucht ein CJ-Budget: rund 1 Aufruf je Produkt, bei ~1'200/h etwa 25 h.
- **Importer an der Quelle:** Varianten auch ausserhalb der Mode anlegen, sobald `d.variants.length > 1`. `buildFashion`
  versteht aber nur Farbe/Grösse. Schlüssel wie «Fixed red» oder «38wide 41MM Large size» brauchen die Logik aus
  `auswahl_werte.plane_optionen` (Stecker-Filter, KI-Rest mit Zweitprüfer). Bis das portiert ist, schliesst der Nachrüster
  die Lücke binnen Stunden.

## Lehre

Ein Wächter, dessen Eingangsliste von einem Merkmal abhängt, das der Importer selbst entfernt, sieht keine Neuware.
- `wahlSicher()` löscht das Versprechen, und damit fällt der Neuimport aus der Liste.
- Die Frage muss am Bestand gestellt werden, nicht am Text: Wie viele Varianten führt CJ?
