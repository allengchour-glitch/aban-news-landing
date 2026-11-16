# Traumhaus: Stadtleben und Entdecken

Stand: 16. November 2026. Auftrag: Stadt optisch und spielerisch ausbauen, zuerst recherchieren und das Handy berücksichtigen.

## Recherche und Entscheidungen

- [Design-Lektionen aus Breath of the Wild, Game Developer](https://www.gamedeveloper.com/design/5-design-lessons-learned-from-i-the-legend-of-zelda-breath-of-the-wild-i-): Orientierung durch erkennbare Orte und Freiheit beim Erkunden. Umsetzung: sechs Fotomotive über die bestehende Stadt verteilt, Anreise frei zu Fuss, im Auto oder per ÖV. Kein Zeitlimit. Der Artikel wurde gelesen; das zugehörige GDC-Video wurde nicht angesehen.
- [Career Progress, Rockstar Games](https://www.rockstargames.com/newswire/article/392323k2721571/climb-the-corporate-ladder-in-gta-online-with-executive-bonuses): sichtbarer Fortschritt über abgeschlossene Aktivitäten. Umsetzung: dauerhaftes Stadtalbum mit eigenen Spielaufnahmen und Fortschritt von null bis sechs Motiven. Die zeitgebundenen Angebote des Artikels werden nicht übernommen.
- [Touch-Bedienung, Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/ensure-interactive-elements-virtual-controls-are-large-and-well-spaced-particularly-on-small-or-touch-screens/): grosse, gut getrennte Ziele. Umsetzung: Albumaktionen mit mindestens 48 CSS-Pixeln Höhe, scrollbar auch im Querformat, erreichbarer Schliessen-Knopf. CSS-Pixel sind keine garantierte physische Tastengrösse.
- [WebGL Best Practices, MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): Zeichenaufrufe bündeln und unnötige Arbeit vermeiden. Umsetzung: Platzmöbel in einem InstancedMesh, 20 Passanten mit zusammen 120 Körperteilen in einem weiteren. Figuren höchstens 20-mal pro Sekunde aktualisieren, ausserhalb der Umgebung ausblenden. Bildschirmkopie nur beim Auslösen eines Fotos.

## Spielinhalt

Das Oststadt-Forum erhält acht begrünte Inseln, vier Bänke, zwei Cafékioske und einen Brunnen. Die Hochhäuser erhalten farbige Geschäftssockel, Eingänge, teilweise Balkone und Dachaufbauten. Die Cafékioske sind Stadtdekoration; sie haben keinen eigenen Verkaufsmodus.

20 einfache, animierte Stadtbewohner bewegen sich auf vier festen Wegen. Sie dienen der Belebung; die bisherigen ansprechbaren NPCs bleiben das Gesprächssystem. Die Einstellung für ruhige Stadtanimationen reduziert ihre Arm- und Beinbewegungen. Ohne gespeicherte Wahl gilt die Systemeinstellung für reduzierte Bewegung.

Unter dem Pokalmenü liegt «Stadtleben & Fotoalbum». Motive: Kathedrale, Seepark, Freizeitpark, Burgdorf, Oststadt und Motorsportpark. GPS endet auf freiem Boden in der Nähe. Aufnahmen sind nur vor Ort, zu Fuss und ausserhalb einer laufenden Spielrunde möglich. Das Foto ist ein verkleinertes JPEG der tatsächlichen 3D-Ansicht; die Oberfläche wird nicht mitfotografiert. Die sechs Aufnahmen und die Animationseinstellung liegen lokal auf dem Gerät, unabhängig vom gemeinsamen Haus-Spielstand. Bei vollem Speicher bleibt ein vorhandenes Foto erhalten und eine Meldung erscheint.

## Prüfung

Browser: Chromium mit Software-WebGL, Handyformat 844 × 390. GEMESSEN: Platz und Passanten brauchen zusammen zwei zusätzliche Zeichenaufrufe und 2'028 Dreiecke; aus der Ferne null Aufrufe. Die 20 Passantenwege wurden in Ein-Meter-Schritten gegen die tatsächlichen Weltkollisionen geprüft: keine Überschneidung. Eine Aufnahme am Forum wurde erzeugt und gespeichert; alle Albumaktionen hatten 48 CSS-Pixel Höhe. Keine JavaScript-Fehler im ersten Browserlauf.

Der zweite Browserlauf prüfte alle sechs Fotoziele gegen Gebäude und Wasser: alle frei. Aufnahme per Klick, Album und Animationseinstellung nach Neuladen erhalten. Dialog ohne seitlichen Überlauf bei 568 × 320 und 390 × 844, Schliessen jeweils erreichbar. Vier ÖV-Linien und der Rundkurs sind weiterhin initialisiert. Der anschliessende Regressionstest bestätigt Gehen und Fahren in der Oststadt, Ein- und Aussteigen des zweiten Spielers sowie erreichbare Kartenknöpfe. Keine JavaScript-Fehler. Die öffentliche Bereitstellung ist im zugehörigen Pull Request dokumentiert. Diese Messung belegt keine 60 FPS auf einem echten Handy. Das Gerät des Besitzers ist nur als «Handy» bekannt.
