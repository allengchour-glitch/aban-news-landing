# Betriebscheck 08.11.2026: geplante Aufgaben und GitHub-Workflows

Auftrag des Besitzers (08.11. abends, Screenshot «Geplante Aufgaben»): «alle anpassen und github workflow check», davor «fix alles was du kannst, nicht dass du doppelt machst oder kollidierst».
Auslegung (meine, nicht bestätigt): die fünf sichtbaren Aufgaben der Seite «Geplante Aufgaben» an die heutige Lage anpassen, Doppelungen und Kollisionen mit GitHub-Workflows und der Shop-Sitzung vermeiden, dazu alle GitHub-Workflows prüfen.
Die elf ausgeblendeten Aufgaben (von Sitzungen angelegt) habe ich **nicht** angefasst.

## 1. Die fünf geplanten Aufgaben

Alle fünf stammen vom 04./05.09.2026 und laufen auf `claude-opus-5` mit 19 angehängten Connectoren; vier der fünf sind am 07./08.11. mit «Nutzungslimit erreicht» gescheitert (GEMESSEN über `get_trigger`, `last_run`).

| Aufgabe | Zeitplan | Letzter Lauf | Befund (GEMESSEN) | Änderung |
|---|---|---|---|---|
| Bestellwächter `trig_01WN8eRRFJ5q4qEegtgoQTzg` | alle 2 h | 08.11. 20:22 UTC grün; Zustandsfeld 20:23 UTC, 23 Bestellnummern gesehen, zuletzt #1039 | läuft, wird gebraucht, kein GitHub-Gegenstück | **unverändert** |
| Produktzahl-Wächter `trig_019RPGRJ8niCo12zteCi42N5` | 8× täglich | 08.11. 18:49 UTC Nutzungslimit | Zweck entfallen: der Aufseher-Keepalive (`trig_01Uy3zVefXbzCZn9Dr2qvkwh`) ist seit 26.10. aus, die Schalterdateien `dropship/_GRIND_RUNNER_ZAHL` und `_GRIND_PAUSE_BIS` gibt es auf `main` nicht mehr; dieselbe Zahl (neue Produkte) misst die Lagebeurteilung (`neu24h`) und täglich `shop_pulse.mjs` im Workflow `shop-autopilot.yml`; jeder Lauf rief `list_triggers` auf (Antwort mehr als zehntausend Tokens) | **pausiert**, Name nennt den Grund |
| Social-Redaktion `trig_01TNNTAY6na4VLpntL28mB5c` | täglich 06:00 | 08.11. 05:01 UTC Nutzungslimit; Feld zuletzt 07.11. 05:11 UTC geschrieben | Warteschlange `luxestyle.social_queue`: 28 Einträge (17.10. bis 13.11.), 27 «bereit», 1 «pausiert», **keiner «gepostet»**; alle Social-Workflows (`metricool-schedule`, `social-queue-build`, `video-meta-autopost`, `social-meta-autopost`, `social-autopost`) laufen nur von Hand; Social liegt bei der Shop-Sitzung (Metricool); die Texte tragen überholte Aussagen (Halloween, «meist 2–3 Werktage») | **pausiert**, Name nennt den Grund |
| Lagebeurteilung `trig_017r619TeGtaS9Rsjjw24E96` | 07:30 + 17:30 | 08.11. 16:34 UTC Nutzungslimit; Zustandsfeld zuletzt 07.11. 15:42 UTC, nur 2 Läufe im Speicher | Dauer-Fehlalarm: gespeichert `katalogEntwurfOk: false`, weil der Katalog-Entwurf seit 14.09. mit Absicht pausiert ist; `list_triggers`-Aufruf; «Arbeitsauftrag Allen: höchstens 3 Punkte» widerspricht der Inhabervorgabe «Routinearbeit gehört zum Assistenten» (08.11.) | **Prompt angepasst** (siehe unten), Zeitplan und Modell unverändert |
| Katalog-Entwurf `trig_013xE8LpGFW2QGuziRJywbHV` | stündlich | pausiert seit 14.09. | würde ungeprüfte aktive Produkte auf Entwurf setzen (`restOffen` zuletzt gespeichert 8 424, 07.11.) | **nur umbenannt**: Name warnt «NICHT einschalten» |

Rechnung (Sitzungen am Tag): vorher 12 + 8 + 2 + 1 = 23, jetzt 12 + 2 = 14 (−39 %), dazu entfallen die `list_triggers`-Aufrufe (10 am Tag).
Die Wirkung auf das Nutzungslimit ist **eine Rechnung, keine Messung**; sie zeigt sich erst über mehrere Tage in `last_run`.

### Rücknahme

- Produktzahl-Wächter, Social-Redaktion: in claude.ai unter «Geplante Aufgaben» fortsetzen (oder `update_trigger enabled=true`) und den alten Namen zurückgeben: «LuxeStyle: Produktzahl-Wächter (nur lesen, meldet Zuwachs)», «LuxeStyle: Social-Redaktion (füllt Warteschlange, postet nie)». Der Prompt blieb bei beiden unverändert.
- Katalog-Entwurf: alter Name «LuxeStyle: Katalog-Entwurf (setzt ungeprüfte Produkte stückweise auf Entwurf)». **Nicht einschalten** (Prompt unverändert).
- Lagebeurteilung: die geänderten Absätze standen vorher so:

```
SCHRITT 2 d) Über den Claude_Code_Remote-Connector list_triggers: Prüfen, dass der «Produktzahl-Wächter» (trig_019RPGRJ8niCo12zteCi42N5) in den letzten 4 Stunden gelaufen ist (last_run.fired_at). Wenn nicht: ALARM «Wächter steht». Ebenso prüfen, dass der «Katalog-Entwurf» (trig_013xE8LpGFW2QGuziRJywbHV, stündlich, setzt ungeprüfte Produkte auf DRAFT mit Tag auto-entwurf-0926) in den letzten 2 Stunden gelaufen ist und dass autoEntwurf seit dem letzten Lauf gestiegen ist, solange restOffen > 0. Wenn nicht: ALARM «Katalog-Entwurf steht». Nur LESEN — kein update_trigger, an keiner Routine.
SCHRITT 3 - erledigtSeitLetztem: ... z. B. «Katalog-Entwurf abgeschlossen», wenn restOffen == 0; «Token entzogen» plausibel, wenn ruhigeTageInFolge >= 2; ...
SCHRITT 3 - Fortschritt Katalog-Entwurf: autoEntwurf und restOffen im Lauf speichern; im Bericht eine Zeile «Katalog-Entwurf: X erledigt, Y offen, Tempo Z pro Stunde» (Tempo aus der Differenz zum letzten Lauf).
SCHRITT 4 Felder je Lauf: ..., auftragOffen, erledigtSeitLetztem, waechterOk, katalogEntwurfOk.
SCHRITT 5 LAGE — aktive Produkte (Δ zum letzten Lauf), davon geprüft; Katalog-Entwurf erledigt/offen/Tempo; Zuwachs 24 h und Import ja/nein; Bestellungen 24 h; ruhige Tage in Folge.
SCHRITT 5 ALARM — ... / Kundenmail offen / Wächter steht / Katalog-Entwurf steht.
SCHRITT 5 ARBEITSAUFTRAG
• Claude Code (PC): höchstens 3 Punkte, nur Skript-Aufgaben mit lokalem Token (Poster-Fix, Social-Pipeline, Captions). katalog-fix.mjs --apply gehört NICHT mehr hierher — den Katalog-Entwurf erledigt seit 05.09. die Cloud-Routine stündlich.
• Allen: höchstens 3 Punkte, in Reihenfolge der Wirkung.
• Cloud: was der nächste Lauf gezielt prüfen soll.
```

### Nicht geändert, mit Grund

- **Modelle** (`claude-opus-5` bei allen fünf): kein Wechsel ohne ausdrückliches Wort; Urteile (Lieferbarkeit beim Bestellwächter) bleiben beim Hauptmodell. Wer das Nutzungslimit weiter entlasten will: Bestellwächter auf ein kleineres Modell oder auf 4 Stunden stellen, das ist ein Entscheid des Besitzers.
- **Angehängte Connectoren** (19 je Aufgabe, gebraucht wird nur Shopify): lassen sich über `update_trigger` nicht ändern, nur durch Löschen und Neuanlegen (verliert den Lauf-Verlauf). Nicht gemacht.
- **Elf ausgeblendete Aufgaben** der Sitzungen: eine Doppelung gefunden, «Verfügbares zuerst täglich bis Fasnacht» (`trig_0178HsPYpwvGhAUp8NZeyBkQ`, 08:13 UTC, weckt die Shop-Sitzung) sortiert dieselben Sammlungen wie der Workflow `lager-waechter.yml` (täglich, LIVE seit 05.11.). Empfehlung: ausschalten; die Entscheidung liegt bei der Shop-Sitzung.
- **Bestellwächter**: Regeln (SKU-Muster, Ampel) nicht umgeschrieben, solange ich seine Meldungen nicht gelesen habe. Möglich, dass Fortura-Bestellungen als «gelb» erscheinen (SKU beginnt nicht mit `CJ-`): ungemessen.

## 2. GitHub-Workflows (193 Dateien, 18 mit Zeitplan)

Gelesen: alle Dateien statisch (Zeitplan, `timeout-minutes`, `concurrency`, Push auf `main`), die letzten Läufe der 18 Zeitplan-Workflows, alle Fehlschläge der letzten 48 Stunden (500 Läufe).

**Funde und Behebung (PR #2994):**

1. `deploy-check.yml` («Pre-deploy validation»): der erste Schritt rief `html-validate` für jede der 2 726 HTML-Dateien einzeln auf (gemessen mindestens 0,4 s je Aufruf, also über 18 Minuten bei 8 Minuten Zeitlimit). Ergebnis: **73 Abbrüche («cancelled») in 48 Stunden**, und die danach liegenden, blockierenden Schritte (JSON-LD, `launch.html` mit noindex, Sitemap) liefen nie. Lokal sind sie alle grün (14 608 JSON-LD-Blöcke in 5 497 Dateien). Jetzt nur die geänderten HTML-Dateien in einem Aufruf.
2. `bestseller-refresh`, `entwicklerbuero-tests`, `shop-autopilot`, `shop-guards`: Zeitplan ohne `timeout-minutes` (Standard 360 Minuten), jetzt 20, 10, 30 und 60 Minuten.
3. `image-audit.yml`: ebenfalls ohne Zeitlimit (Lauf 7 hing 20 Minuten), behoben in PR #2993 (45 Minuten); der Audit hatte ausserdem nie ein Bild beurteilt (Gemini-Antwort bei 80 Tokens abgeschnitten).

**In Ordnung (gemessen):** keine Zeitplan-Kollisionen beim Push auf `main`, jeder Zeitplan-Workflow mit Push hat eine `concurrency`-Gruppe, keine doppelten Namen, alle Zeitplan-Workflows zuletzt grün (Ausnahme der Handlauf des Bild-Audits). `cj-reviews` hat noch keinen Zeitplan-Lauf gehabt (nur Handläufe, Stand 22:02 UTC; GitHub startet Zeitpläne in diesem Repo oft Stunden verspätet). Fehlschläge sonst nur auf Entwurfs-Zweigen (`LuxeStyle automation tests` auf dem Codex-Zweig `codex/produktqualitaet-claude-memory`, `Voice Linter` auf `ccr-ddb1c57a-s4a0zc`).

**Gemeldet, nicht geändert (Codex-Entwurf):** PR #2932 sperrt `social-comment-moderate.yml` (`if: false`) und würde den am 06.11. vom Besitzer bejahten täglichen Spam-Wächter wieder abschalten (Kommentar auf dem PR).

**Immer rot, kein Fehler:** die drei «Workers Builds»-Meldungen von Cloudflare (siehe `CLAUDE.md`, «Vorbestehend rot»).
