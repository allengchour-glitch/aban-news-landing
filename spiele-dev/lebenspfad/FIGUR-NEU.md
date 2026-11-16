# Lebenspfad: Figurenentwurf – gesicherter Zwischenstand

Letzter Besitzerwunsch: «langsam speichern alles und token sparen». Entwicklung kontrolliert pausiert; **Entwurf nicht fertig geprüft und nicht veröffentlicht**. Der Agent wurde beendet. Worktree `/workspace/aban-lebenspfad-figur`, Branch `codex/lebenspfad-figur-neu`, Basis `e6cb011254fd88ef4947dc5b287ad8a43193a9e4`.

Verbindlich gewählter Stil: **kleine niedliche Figur, großer Kopf, kompakter Körper, verspielt**. Diese Wahl ersetzt die vorherige allgemeine Comic-Annahme.

## Gesichert

- Neues lokales Geometriemodul `js/lebenspfad/character-art.js` und dessen HTML-Einbindung. Native Figurenkonstruktion ist in den neuen Hersteller ausgelagert; alte Vorlage bleibt über die Basisrevision rekonstruierbar.
- `figur-neu-runtime.patch` sichert den Zwischenpatch zusätzlich. Im aktuellen Branch ist die HTML-Integration bereits enthalten: Patch nicht nochmals blind anwenden.
- `figur-portrait-qa.cjs` sowie Vorher-/Entwurfaufnahmen unter `belege-figur-neu/vorher/` und `entwurf1/`. Beide Ergebnisdateien enthalten keine JS-Fehler. Das ist nur eine begrenzte Portraitprobe; Parent hat den neuen Entwurf noch nicht gestalterisch freigegeben.
- Syntax von Modul und Portraitskript durch Parent geprüft, Diffprüfung sauber. Die vorgeschriebene Gesamt-CI scheitert vor Start am read-only HOME; Log `belege-figur-neu/ci-simulation.txt`.
- Preview8187 mit echten `_headers`; Playwright unter `/tmp/aban-games-audit/node_modules/playwright`, Chromium `/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome`. Temporäre Pfade sind nicht dauerhaft vorauszusetzen.

## Wiederaufnahme

1. Frisches main und Neon-PR3217 lesen; normale Merge-Integration, kein Force-Push. Den gesicherten Entwurf erhalten.
2. Neue Portraits wirklich ansehen: Gesicht, Augen, Haare, Körper-/Kleiderformen, Farbtrennung und Profil. Gegen die ausdrücklich gewählte niedliche Stilrichtung prüfen und weiter verfeinern.
3. Erst danach alle vier Altersstufen, Outfit-/Haut-/Haarvarianten, native Familie, Spezial-GLBs und normale Spielkamera prüfen. Aktuell kein vollständiger Funktions-/Bildnachweis dafür.
4. Sohlen/Standhöhe, Animationen, Speichern/Laden und Online-Look/Replay prüfen. Die alten Funktionen dürfen durch den neuen Hersteller keine Daten oder Bewegungen verlieren.
5. Quellenhash, Dokumentation und begrenzte aussagekräftige Belege aktualisieren. Draft-PR erst nach vollständiger Prüfung zur Veröffentlichung freigeben; echte CI, Hauptseiten-Deploy und normale öffentliche HTTPS-Prüfung gehören dazu.

Keine Änderung an Traumhaus, Shop, Social, Konten oder Secrets. Projektübergreifender Stand: `spiele-dev/CLAUDE-SPIELE-AKTUELL.md`. Mix Arena und Lebenspfad-Atmosphäre sind bereits live; Neonv4 ist separat als geprüfter Draft gespeichert.
