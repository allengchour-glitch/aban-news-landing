# AGENTS.md — Regeln für Codex in diesem Repo

Dieses Repo enthält mehrere Projekte. Das aktive Arbeitsgebiet ist der Shopify-Shop **LuxeStyle CH** (luxestyle.ch, Importe aus CJ und Fortura). Die ausführliche Fassung steht in `CLAUDE.md`; hier nur, was Codex nicht vergessen darf. Das Plugin `codex-mods/luxe-codex` setzt einen Teil davon maschinell durch (siehe `codex-mods/README.md`).

## Rolle
- Standard ist **lesen und prüfen**. Schreiben nur, wenn der Auftrag es ausdrücklich verlangt, und nur Dateien, die der Auftrag nennt.
- Preise, Rechtliches, Veröffentlichung und Kundenkontakt entscheidet der Besitzer, nicht Codex.
- Ein Fund ist eine **Behauptung**, bis er am echten Code mit einer Eingabe und dem falschen Ergebnis nachgestellt ist. Unbestätigtes steht als «unklar» da.

## Harte Regeln
- **Nie Force-Push**, nie `git add -A` / `git add .` (Dateien einzeln nennen), nie `pkill -f` / `killall`.
- **Trockenlauf vor `LIVE=1`**: neuere Werkzeuge laufen ohne `LIVE=1` im Trockenlauf; `seo-optimizer.mjs` schreibt ohne `DRY_RUN=1`; `cj_reviews_import.mjs` ist seit 28.10.2026 Trockenlauf-Vorgabe und schreibt nur mit `DRY_RUN=0` (ohne die Variable endet es mit Exit 0 und «TROCKENLAUF», ohne etwas zu senden). Die Liste lesen (beide Seiten), nicht nur die Zahl.
- Keine Geheimnisse, keine Kundendaten in Dateien, Logs oder Berichten. Zugänge liegen in der Umgebung.
- `dropship/_SOCIAL_STOPP` wird nie neu angelegt.
- Nie Fake-Bewertungen, nie erfundene Zahlen. Jede Zahl trägt GEMESSEN, QUELLE, BEHAUPTUNG oder SETZUNG.
- Eine Drosselung (HTTP 429, `Throttled`) ist keine Antwort und wird nicht umgangen.

## Arbeiten
- Node: `/opt/node22/bin/node`. Tests: `node automation/lib/<name>_test.mjs`, letzte Zeile «N ok, 0 Fehler». Nach Änderungen an Tests oder Workflows: `bash automation/ci_simulation.sh`.
- Neue Branches von `origin/main`, nie direkt nach `main`. Pull-Requests als Entwurf; gemergt wird, wenn die echten Prüfungen grün sind (`tests`, `check`, `Brand-Voice check on changed .md files`, `Deploy to Cloudflare Pages`). Die drei «Workers Builds»-Prüfungen sind immer rot und kein Fehler.
- Texte, Kommentare und Meldungen deutsch und kurz.
- Messen statt raten: Messgerät in beide Richtungen prüfen, nach dem Schreiben frisch lesen, den Grund eines Laufendes nennen. Details: `.claude/skills/shop-messen-nicht-raten/SKILL.md`.
