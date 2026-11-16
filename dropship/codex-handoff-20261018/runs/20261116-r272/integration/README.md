# R272 – Lokaler Scroll-Film-Kandidat

Nur lokal vorbereitet. Keine Shopify-Datei geschrieben, kein Theme gespeichert oder veröffentlicht. Der aktuelle MAIN-Aufbau wurde ausschliesslich gelesen; seine relevanten Quell-MD5 stimmen mit der vorhandenen R269-Arbeitsgrundlage überein.

Der eine geprüfte Review-Export `luxestyle-atelier-15s-review-r272.mp4` ist 1080 × 1440, 15 Sekunden und stumm. Sein SHA-256 lautet `84b01590961a9f6f85d27921118c658d9839c5df1290ccfe82592fc2763f38f6`. Kreative Inhaberabnahme und native Theme-Vorschau bleiben separat offen.

## Gestaltung und Verhalten

- Desktop: unveränderter Text und unveränderte Kaufwege links auf dunkler Fläche, Film rechts. Mobil: Film, Steuerung und Text untereinander in derselben DOM-/Lesereihenfolge. `object-fit: contain` erhält den vollständigen Film; Titel liegen nicht auf hellen Produktbildern. Cream-Text auf Ink erreicht rechnerisch 13.96:1 Kontrast. Die bestehende Serif-/Sans-Schriftfamilie wird erhalten; nur die Desktop-Schriftgrösse und der obere Innenabstand werden an die schmalere Textspalte angepasst.
- Bestehendes R269-Bild bleibt als Poster über einen `image_picker` editierbar. Neue `video`-Auswahl und Aktivierung sind eigene Section-Einstellungen. Der Video-Picker ist absichtlich ungebunden und `hero_scroll_enabled=false`, bis ein realer Shopify-Video-Datensatz samt fertigen Quellen geprüft ist. Kein lokaler Pfad oder erfundener Medienverweis wird eingesetzt.
- Der neue Pfad verwendet `luxe-scroll-hero` als nativen `Component`-Owner und importiert das vorhandene `@theme/component`. Das einzige neue selbständige Modul enthält Controller und Adapter; ein zusätzlicher Import-Map-Eintrag ist nicht nötig. Der alte `[data-hero-media]`-Controller erhält im aktiven Scroll-Pfad keine Zielknoten.
- Metadaten eines bereits geladenen Videos werden bei erneutem Mount übernommen. Dadurch bleibt die Bedienung nach wiederholtem `updatedCallback` verfügbar. Subclass-Ressourcen werden vor erneutem Mount und beim Disconnect aufgeräumt; alle drei Lifecycle-Methoden rufen ihre Basis auf.
- Normales Scrollen positioniert den Film, rückwärts entsprechend zurück. Kein `play()`, kein Wheel-/Touch-Abfangen und keine Scrollsperre. Pause und native Range-Steuerung erlauben Halt und Tastaturposition. Reduced Motion zeigt ausschliesslich das Poster.
- Ist die vollständige Bühne höher als der verfügbare Bildschirm, wird sie nicht festgehalten und bekommt keine zusätzliche Scroll-Strecke. Der Film beginnt trotzdem bei 0; natürliche Fortschrittsberechnung startet erst am Header-Inset und läuft über eine sichtbare Medienhöhe. Auf kleinen/kurzen Bildschirmen wandert das Bild dabei normal aus dem Blickfeld: keine Behauptung einer vollständig sichtbaren filmischen Pin-Sequenz auf jedem Gerät.

## Dateien und Einbauvertrag

`candidate/sections/luxe-edit-home.liquid`, `candidate/assets/luxe-scroll-hero.js`, `candidate/templates/index.json` und die drei `*.schema.json` sind vollständige lokale Kandidaten. Die drei `*.additions.json` sind **nur Merge-Ergänzungen für bestehende Laufzeit-Sprachdateien**; sie dürfen nicht als eigenständige Shopify-Sprachdateien hochgeladen werden. Vor einem späteren Einbau alle betroffenen Originale frisch lesen und die Ergänzung `lx_scroll_hero` mit der jeweiligen bestehenden Sprache zusammenführen. Bestehende Schema-JSONC-Kommentare und Schlüssel bleiben erhalten.

`CANDIDATE.diff` und `MANIFEST.json` gehören zum abschliessenden Stand. Das Index-Diff verwendet das echte alte `templates-index.json` als Basis. Seine übrigen Sections und Einstellungen bleiben erhalten; der Film wird nicht automatisch aktiviert.

## Begrenzte Validierung

`qa/REPORT.json` hält den tatsächlichen Chromium-Lauf mit der echten Review-MP4 und lokal simulierten HTTP-Range-Antworten fest. Keine externen Requests oder Store-Writes. Geprüft wurden 320×900, 390×900, 1440×900 und 390×640: Filmstart bei 0, vorwärts/rückwärts, Halt, Tastatur-Endposition, wiederholter nativer Component-Update-Aufruf, Reduced Motion, keine horizontalen Überläufe und mindestens 44 px hohe Steuerungen. Die 640-px-Ansicht nutzt den natürlichen ungepinnten Pfad. Produkt-Frames und Poster sind als lokale Screenshots abgelegt.

Ein echter Film wurde im lokalen Chromium dekodiert; das ist kein nativer Shopify-Liquid-Render, kein vollständiger Header-/App-Integrationsnachweis und keine iPhone-/Safari-Abnahme. Der Browser-Test benutzt eine minimale Kopie des Hero-Markups und die unveränderte echte Theme-Component-Klasse; deren Utility-Idle-Helfer ist im Test durch einen lokalen Timer ersetzt. Vor Publikation sind legitimer aktueller Entwurf, native Speicherung/Rücklesung, echter MP4-/Range-/Seek-Test über Shopify-CDN, reale Header-Geometrie, Mobile Safari sowie Sprache/Theme-Editor-Lifecycle zu prüfen. Kein Theme-Check-Tool wurde hier installiert oder als ausgeführt behauptet.
