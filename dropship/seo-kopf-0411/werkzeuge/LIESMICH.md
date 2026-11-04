# Werkzeuge der Seitenverschlankung (Scratch-Stand, Pfade fest auf die Arbeitsordner der Sitzung vom 04.11.2026)
- `zerlegen.mjs`, `seite_zerlegen.mjs`: rohe Seite (gespeichert mit `curl -A <Chrome-Kennung>`) in Bereiche und Leerraum-Anteile zerlegen (nur lesen).
- `equiv.cjs`: Browser-Äquivalenz Filter/Karten (`node equiv.cjs <seite> <breite>`; erwartet gespeicherte Seiten unter `seo/pages/<seite>.html`); die Seite wird über `page.route` einmal unverändert (zweimal) und einmal verdichtet ausgeliefert und verglichen.
- `ruby_snippet.rb`: rendert `snippets/lx-verdichten.liquid` mit dem Ruby-Referenz-Liquid (gem `liquid` 5.14.0) gegen die JS-Nachbildung.
Vor einer Wiederverwendung die Pfade `/tmp/claude-0/...` anpassen.
