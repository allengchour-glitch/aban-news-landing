# Personalisierter Schmuck ohne Eingabefeld (16.11.2026)

Anlass: Der Besitzer meldete am 16.11. «editor oder so fehlt»: Bei personalisiertem Schmuck kann
man keinen Namen eingeben. Gemessen wurde mit einem Workflow (Katalog, CJ-Datenblätter, Theme,
Bestell-Engine, Bestellungen) und zwei Gegenprüfern. Es wurde nur gelesen, im Shop nichts geändert.

## Befund (GEMESSEN)

- 1 647 aktive Produkte tragen ein Personalisierungswort. Gelesen wurden 1 647 CJ-Abfragen, davon
  1 509 mit Datenblatt.
- **Klasse B (rund 213 Produkte):** Sie versprechen eine Eingabe oder Auswahl, die der Shop nicht
  erfasst. 181 davon führt CJ als `DIY_PRODUCT`.
  - 166 brauchen freien Text, ein Foto oder eine Gravur.
  - Bei 21 fehlt nur die Auswahl: Buchstaben oder Monate fehlen oder sind falsch übersetzt, zum
    Beispiel beim Zirkon-Armreif aus «Gold-B, C, D» die Farben «Blau, Creme, Denim».
  - Bei 25 ist die Personalisierung versteckt.
  - Liste: `klasse_b.json`.
- In der Sammlung «Personalisierter Schmuck» (136 Produkte) sind 105 B-Produkte, 5 A-Produkte und
  26 normale Ware ohne Anpassung.
- **Kein Eingabefeld:** Alle nutzen die Standardvorlage. Das Theme hat den Block
  `product-custom-property`, er ist aber nicht eingebaut.
- **Auch mit Feld käme nichts bei CJ an:** Die Bestell-Engine liest keine Eigenschaften der
  Bestellpositionen und schickt nur Variante und Menge. Laut CJ-Doku nimmt `createOrderV2` beim
  Auftrag nur Bild-Links an (`podProperties`).
- **Falsche Ware bei 5 Ringen:** Die Grösse steckt in der Option «Farbe». Wer Grösse 10 wählt,
  bekommt Grösse 5 (an 601400 nachgelesen).
- Seit 01.06. gab es 0 Bestellungen und 0 abgebrochene Kassen mit B-Produkten. Die Seiten hatten
  rund 40 Einstiege in 120 Tagen.
- **Klasse A (7 Produkte):** Sie lassen sich über Ausführungen lösen und stehen in `klasse_a.json`.

## Sofort umgesetzt (ohne Ja nötig, am Shop ändert sich nichts)

Die CJ-Zahlungswache hält Bestellungen mit B-Artikeln zurück. Sie legt sie nicht bei CJ an und
meldet sie mit ⚠️ (`dropship/cj-zahlungswache-0411/sperre.py`, Liste `personalisierung_sperre.json`
mit 213 Produkten).

- Abweichungen von `klasse_b.json` nach der Gegenprüfung:
  - Dazu kommen das Halsband 621800 und das Set «Eternità».
  - Nicht gesperrt ist «Malen nach Zahlen 144640»: Das Motiv ist fest.
- Sind die Produkte nicht lesbar, wird zurückgehalten.
- Getestet mit Attrappe und im Trockenlauf gegen die echten offenen Bestellungen (16.11. 21:0x UTC).

## Entscheide des Besitzers (Empfehlung zuerst)

1. **B-Produkte vorläufig auf Entwurf** (empfohlen). Es geht um rund 213 von 56 495 Produkten, 0 Bestellungen in 5 Monaten. Die Rücknahme geht per Skript.
2. **Gravur als Pilot:** zuerst ein CJ-Ticket, ob Text oder nur Bilder angenommen werden. Danach 5 Produkte mit Pflichtfeld und Engine-Erweiterung. Aufwand mehrere Tage, Ausgang unbekannt.
3. **Ohne Ja machbar, folgt:**
   - die 5 Ringe mit vertauschter Grösse ordnen;
   - die 26 Fremdprodukte aus der Sammlung nehmen;
   - 112 Titel und 104 Texte mit unbelegtem Personalisierungsversprechen korrigieren;
   - für 21 Produkte die Buchstaben- und Monatsvarianten nachziehen.
