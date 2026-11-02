# Banner für jede Kategorie und Unterkategorie (Theme-Entwurf 2.11.2026)

Auftrag des Besitzers 2.11.: «banner bei jede unterkategorie erstellen … war nur ein beispiel für alle» (das Schuhe-Banner war das Muster).

## Lösung
- **Automatisch, ohne Bilddatei je Sammlung:** `templates/collection.json` im Entwurf-Theme `213013037447` («LuxeStyle – Schrift und Banner 02.11.2026») rendert den Titelblock jeder Sammlung als Banner: Titel und Beschreibung in Weiss vor einem Streifen aus den **ersten vier Produktfotos der Sammlung** (Reihenfolge der Sammlung: gut bewertete zuerst, dann Bestseller), dunkler Verlauf für die Lesbarkeit. Handy: zwei Fotos. Fotos kleiner als 500 px werden übersprungen.
- **Schuhe:** das von Hand aus vier sauberen Fotos gebaute Bild `assets/kategorie-banner-schuhe.jpg` (Liste `lx_banner_liste` im Abschnitt, erweiterbar um weitere Handles).
- Vorteil: gilt für alle Sammlungen (auch neue), bleibt aktuell, kostet keinen Bildgenerator und keinen Upload; die Fotos sind die, die in der Sammlung unten ohnehin stehen.
- Schrift oben (Pfad, Unterkategorien, Filterchips, Titel) ist im selben Entwurf kräftiger.
- Die Datei in diesem Ordner (`theme-entwuerfe-0211/collection.json`) ist der Stand des Entwurfs zum Nachlesen; Veröffentlichen des Themes entscheidet der Besitzer.

## Gemessen (Playwright, Handy 390 px und PC 1280 px, Entwurf-Vorschau)
Geprüft an `schuhe`, `led-streifen-lichterketten`, `silberringe`, `haustier-hunde`: Titel lesbar, Beschreibung lesbar, Filterzeilen und Produktraster darunter unverändert. Nicht geprüft: alle übrigen rund 700 Sammlungen einzeln.

## Grenzen (ehrlich)
- Die Fotos kommen automatisch und sind **nicht** einzeln auf Schrift oder Logos geprüft (Gemini-Guthaben leer): einzelne Produktfotos mit Aufdruck («RoHS», «COLOR/red») sind abgedunkelt sichtbar. Weisse Freisteller wirken im Verlauf grau.
- Die Bilder folgen der aktuellen Sortierung der Seite (Filter oder «Sortieren nach Preis» ändern sie).
- Wirkung auf Verkäufe: unbekannt.

## Offen
- Besitzer: Entwurf ansehen (Link in der Antwort) und veröffentlichen.
- Wenn einzelne Kategorien ein handgebautes Bild bekommen sollen: Handle in `lx_banner_liste` eintragen und `assets/kategorie-banner-<handle>.jpg` hochladen.
