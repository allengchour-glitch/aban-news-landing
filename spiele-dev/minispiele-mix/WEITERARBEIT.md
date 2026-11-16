# Claude Code: Arbeitsstand der Mix Arena

## Auftrag und Grenzen

Besitzer am 16.11.2026: «verbessere mehr alles wie ein komplettes spiel», anschließend «mache ohne pause verbesserung … speichere regelmässig für claude code». Bestehende Live- und Mehragenten-Freigabe gilt weiter. Traumhaus wird von einer anderen Sitzung bearbeitet. Keine Shop-, Social-, Konto- oder Secret-Änderungen.

## Aktueller Stand: Umsetzung, noch nicht veröffentlicht

- Worktree `/workspace/aban-minispiele-party`, Branch `codex/minispiele-komplettes-spiel`, Basis `c3088227d`.
- Vorheriger Minispiele-Mix ist über PR3210 live; diese neue Arena ist noch in Prüfung.
- Gemeinsame Arena-Grafik als leichtes SVG, neue mobile Oberfläche, Figurenwahl, Rundenkarte, Einführung und Countdown.
- Neue `MixRules`-Metadaten: stabile Match-ID, zwei Avatare, alte Spielstände migrierbar, Revanche mit gleicher Reihenfolge. Die ersten drei Disziplinen decken Kopf/Tempo/Geschick ab.
- Reines `MixProgress`: 20XP pro gewerteter Runde plus40 für vollständig gespieltes Match, Level alle100XP, vier Erfolge, Eule abLevel3/Drache abLevel5. Keine Belohnung durch reine Abbrüche, idempotente Match-Abrechnung.
- Neues Speicherfeld `aban_mix_arena_v2` hält Run, Profil und Einstellungen in einer gemeinsamen Speicherung. Alter `aban_mini_mix_v1` wird beim ersten Laden gelesen und bleibt erhalten.
- Aktive Runde lässt sich unterbrechen und beginnt danach ungewertet neu; alte Punkte bleiben. Nur eine Disziplin gleichzeitig geladen. Bei verborgenem Tab wird die Runde ebenfalls unterbrochen.
- Katalog/Einbettung fertig: alle20 Anleitungen, sichere Namenslabels, Klangschalter, Originalstart per Countdown und sanftes Styling. Ein zusätzlicher Agent korrigiert derzeit kurze Querformat-Layouts in einer eigenen CSS-Datei. Keine Spielregeln geändert.

## Nächste Schritte

1. Ergebnis des Einbettungs-Agenten integrieren, Simon-Klang an Arena-Schalter koppeln, Hashreferenzen erneuern.
2. Echte Eingaben für mindestens drei aufeinanderfolgende Disziplinen; Profil/Reload/Revanche/Unterbrechen/Fehlerpfade prüfen. Alle20 eingebetteten Seiten laden und mobile Darstellung untersuchen.
3. Bestehende Originalabschluss-Prüfungen erhalten. Neue Regeln/Spielstände/Abrechnung mit Gegenproben testen. HTML-/Diffprüfung und verlangte CI-Simulation durchführen.
4. README, Memory und Übergabe aktualisieren; gezielt stagen, Draft-PR, sechs echte CI-Prüfungen, exakten geprüften Head mergen, Hauptseiten-Deploy und öffentliche Quellen/Assets prüfen.

## Bisherige Messung

194/194 Node-Prüfungen,24/24 Arena-Browserbedingungen mit drei echten Ergebnissen und121/121 Einbettungsbedingungen in zwei Touchformaten grün. Visuell bestätigter Restfehler: mehrere Brettspiele ragen im640×360-Querformat unter den Bildrand, obwohl Rückkehr/Scrolling funktionieren. Korrektur läuft; danach neu messen. Index-HTML gültig. Vorschau: Port8184 mit `spiele-dev/neon-flug/server.cjs`. Playwright unter `/tmp/aban-games-audit/node_modules/playwright`, Chromium `/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome`.

Vorherige Runde: öffentliches Chromium vertraute dem Umgebungsproxy-Zertifikat nicht, während normales System-Curl TLS verifiziert. TLS nicht ausschalten; öffentlichen Browsernachweis nur behaupten, wenn tatsächlich erfolgreich.

## Folgeauftrag Lebenspfad

Besitzer: «lebenspfad mit higgsfield und co verb.», bestätigt mit «ja». Parallel eigener Worktree `/workspace/aban-lebenspfad-atmosphaere`, Branch `codex/lebenspfad-atmosphaere`. Direkter Higgsfield/3D-Jutsu-Anschluss trotz Toolsuche nicht verfügbar; lokales Blender vorhanden. Agent arbeitet an tatsächlicher Web-3D-Licht-/Atmosphärenverbesserung und dokumentiert in `spiele-dev/lebenspfad/ATMOSPHAERE.md`. Keine Higgsfield-Ausführung oder bezahlte Generierung behaupten. Arena zuerst fertigstellen und veröffentlichen, danach Lebenspfad übernehmen.
