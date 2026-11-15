# Higgsfield-Gestaltung für das bestehende Büro

Private, editierbare Gestaltungsvorlage in 3D Jutsu: grosser Kontrollraum mit
Monitorwand, zentraler Konsole, Galerie, sieben Arbeitsbereichen, Treppe,
Schreibtischen, Sitzecke und Pflanzen. Eigene prozedurale Geometrie und Materialien;
keine externen Modelle, Bildtexturen oder generierten Kennzahlen.

Die Python-Dateien dokumentieren die ausgeführten Szenenschritte.
Sie laufen im vorhandenen Higgsfield-Szenenwerkzeug mit `bpy` und `artifacts`, nicht
als Browsercode oder lokaler Dienst. Vor einem erneuten Editieren immer das Projekt
frisch lesen und dessen echte Revisions-/Sequenzwerte verwenden. Ein erneutes
Ausführen erzeugt sonst zusätzliche Objekte. Keine Szenenschritte automatisch starten.

`04_farben.py` überarbeitet die vorhandenen Materialien und die Beleuchtung:
warmer Steinboden, helle Porzellanwand, dunkles Petrol, Eiche/Kupfer sowie sieben
gedeckte Bereichsfarben. Monitorflächen bleiben dunkel, Beschriftungen hell.
Der Schritt ändert die private Higgsfield-Szene; er färbt nicht automatisch das
Web-Büro um und stellt keine Datenverbindung her.

Der Higgsfield-Viewer ist eine Gestaltungsvorlage ohne verbundene Konten oder
ausführbare Arbeitsaufträge. Die bestehenden Datenanzeigen bleiben im Web-Büro.
Die komplette Szene ist nicht automatisch mit dessen eigenem WebGL-Renderer kompatibel.
Übertragen sind dort zunächst die grössere Monitorwand, Rahmen, Plattform und
angepasste Kamera. Modellpakete, Messwerte, Monitorfokus und Auftragsgrenzen bleiben.

Die private Projektkennung bleibt im zugehörigen privaten Chat.
Renderprüfung und endgültige Revision stehen in der Codex-Claude-Übergabe und im PR.
Es wurden keine Bild-/Videogenerierungen, Kreditkäufe oder GPU-Mieten gestartet.
Die Darstellung belegt keinen laufenden Geschäftsbetrieb und keine neue Datenquelle.

Für das private Claude-Dashboard nur den vollständigen Bau aus
`tools/buero/dashboard/bauen.py` zusammen mit passendem `kb3d-code.js` und den
unveränderten Modellpaketen verwenden; niemals die rohe Büro-Seite hochladen.
