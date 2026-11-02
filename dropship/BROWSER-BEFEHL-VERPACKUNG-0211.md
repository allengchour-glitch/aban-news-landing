# Auftrag für PC-Claude: CJ-Verpackung prüfen (2.11.2026)

Besitzer 2.11.: Kundinnen und Kunden sollen selbst entscheiden, ob sie für eine bessere Verpackung Aufpreis zahlen; sonst bleibt die Standardverpackung. Vorher muss geklärt sein, was CJ wirklich anbietet. **Nichts bezahlen, nichts bestellen, keine Verbindung (Packaging Connection) speichern, bevor der Besitzer die Zahlen gesehen hat.**

## Was im eingeloggten CJ-Konto (Browser) zu prüfen ist
1. Wo steht «Packaging» / «Custom Packaging» / «Private Packaging» im Dashboard (Menü, Direktlink)?
2. Welche Verpackungsarten gibt es (Beutel, Karton, Geschenkbox, bedruckter Karton, Karte/Beileger), je Art: Preis pro Stück in USD, Mindestmenge, Lieferzeit der Verpackung, ob sie CJ-Lager China oder ein anderes Lager betrifft.
3. Wird die Verpackung **je Produkt** verbunden (Packaging Connection) oder je Bestellung gewählt? Kann man beim Anlegen einer Bestellung (manuell und per API) die Verpackung pro Bestellung wählen? Welches API-Feld (falls dokumentiert, Quelle mit Link).
4. Geht eine **Mischung** (gleiches Produkt, Kunde A mit Geschenkverpackung, Kunde B ohne)? Oder gilt die Verbindung immer für alle Bestellungen dieses Produkts?
5. Gewicht und Versandkosten-Änderung durch die Verpackung (CJ-Frachtrechner mit und ohne, eine Beispielbestellung nach CH, nur Rechner, nicht bestellen).
6. Foto oder Screenshot jeder Verpackungsart (für die Shop-Seite, nur wenn die Nutzung erlaubt ist).

## Ergebnis
Datei `dropship/CJ-VERPACKUNG-ERGEBNIS-0211.md` mit Tabelle (Art | Preis USD | Mindestmenge | Lieferzeit | je Produkt/je Bestellung | API-Feld) und je Zeile **GEMESSEN** (im Konto gesehen) oder **QUELLE** (CJ-Hilfetext, Link). Screenshots in `dropship/cj-verpackung-0211/`.

## Danach (macht Claude im Shop, erst nach Besitzer-Ja)
- Zusatzartikel «Geschenkverpackung» (Preis = CJ-Preis + Marge, vom Besitzer festgelegt), als Zusatz im Warenkorb wählbar; ohne Wahl Standardverpackung.
- Nur zusagen, was CJ je Bestellung liefern kann (Punkt 3/4). Geht es nur je Produkt, wird die Option NICHT als «auf Wunsch» angeboten.
