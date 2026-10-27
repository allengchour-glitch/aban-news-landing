# Kundenstimmen der Startseite (27.10.2026)

**Anlass:** Das Judge.me-Karussell zeigte die 15 neuesten Bewertungen, und die stammen blockweise vom selben Produkt (Ladegerät ×4, Blechschild ×5, Rucksack ×4).
Besitzer: «keine doppelten Produkte, lieber unregelmässig abwechseln».

**Lösung (3 Teile):**
1. `automation/lib/kundenstimmen.mjs` (56 Prüfungen, 6 Mutanten rot): wählt aus den echten Judge.me-Bewertungen EINE je Produkt. Regeln: 5 Sterne, veröffentlicht,
   35–180 Zeichen, deutsch, ein Lobwort, keine Einschränkung («aber», «leider» …), keine Lieferdauer/Herkunft, keine Marktschreier-Texte («AAA++»), keine Hersteller-/CJ-Hinweise,
   Produkt aktiv mit Bild, höchstens 3 je Produktart (Randsortiment 1), derselbe Text bei zwei Produkten fliegt ganz raus (Querimport). Der Text wird nie verändert.
   Namen: maskiert; tragen mehrere Karten denselben Namen (CJ liefert fast überall «C***t»), gar keiner.
2. `automation/kundenstimmen_bauen.mjs` (Trockenlauf Vorgabe, `LIVE=1` schreibt): liest 6 000 Bewertungen, schreibt `shop.metafields.lux.kundenstimmen` (json, 24 Karten) und liest frisch zurück.
   Stand 27.10.: 24 Karten, 24 verschiedene Produkte (`pool-2710.json`). Bei neuen Bewertungen wiederholen.
3. Theme-Abschnitt `lux_kundenstimmen` (`abschnitt_lux_kundenstimmen.liquid`, im Entwurf `212656488839`): zeigt 12 der 24 Karten, bei JEDEM Seitenaufruf neu gemischt (md5 aus Produkt + Sekunde, dann sortiert),
   je Produkt höchstens eine Karte, Produktbild und Titel verlinken auf das Produkt, eigene Pfeile. Fehlt das Metafeld, zeigt der Abschnitt wie bisher das Judge.me-Karussell.

**Gemessen im Entwurf (3 Aufrufe, Cookie-Vorschau):** 12 Karten, 12 verschiedene Produkte, Reihenfolge und Auswahl jedes Mal anders, kein Liquid-Fehler; Screenshot Desktop und Handy ok.
**Veröffentlichen = Klick beim Besitzer** (Theme `212656488839`; Rückfall `212645413255`). Achtung: der Entwurf ist eine Kopie des Live-Themes von 21:5x UTC; Änderungen am Live-Theme danach gehen beim Veröffentlichen verloren.

**Nebenfund (Judge.me, 23.10.):** echte 1-Sterne-Shop-Bewertung (Paola): «Schrottuhr geliefert, 7 × reklamiert, keine Antwort … Betrug». Unbeantwortet? In Judge.me und im Postfach prüfen.
