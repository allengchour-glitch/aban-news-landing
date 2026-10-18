# LuxeStyle Assist für Claude Code und Codex

Der Helfer bündelt lokale Projektprüfung, feste Regressionstests und eine beständige Aufgabenübergabe. Keine Zusatzpakete, keine neue API-Verbindung und kein laufender Serverdienst nötig. Er ruft kein KI-Modell auf, veröffentlicht nichts und importiert keine operativen Publisher. Er kann nicht garantieren, dass alle Automationen funktionieren oder jemand kauft.

## Benutzung in Claude Code

Nach Übernahme dieses Branches enthält `.mcp.json` den Projektserver `luxestyle-assist`. Claude Code kann eine lokale Zustimmung zum Projekt-MCP verlangen; bestehende Sicherheitsregeln und lokale Ablehnungen bleiben wirksam. Die bestehende `.claude/settings.json` mit ihrem SessionStart-Hook bleibt unverändert. Der neue Helfer ist nicht dieser alte Hook und startet ihn nicht.

Claude Code im Repository öffnen, Projekt-MCP prüfen (`/mcp`) und `/luxestyle-assist` verwenden. Der Slash-Befehl liegt unter `.claude/commands/`. Er liest Status/Übergabe, wählt passende Tests und speichert den nächsten Schritt. Das ist keine im Hintergrund laufende ChatGPT-Session. Projektkonfiguration im Repo ist kein Beleg, dass ein anderer Rechner den Server bereits geladen oder freigegeben hat.

| Werkzeug | Wirkung |
|---|---|
| `luxe_doctor` | Lokale Repo-Zuordnung, Datei-Hashes, Regelhinweise und Übergabestatus |
| `luxe_checks` | Festes Profil `core` oder `seo`, begrenzt auf lokale Tests |
| `luxe_handoff_read` | Letzte zehn datierte Übergaben; fehlende Historie bleibt unbekannt |
| `luxe_handoff_save` | Manuellen Stand und nächsten Schritt lokal sichern |
| `luxe_review_request` | Konkrete Codex-Frage mit Dateihashes in derselben Übergabe vormerken |

Eine Codex-Prüfaufgabe erhält `awaiting_codex`, keine erfundene Antwort. Die nächste Codex- oder Claude-Sitzung liest die Aufgabe und prüft die aktuellen Dateien gegen die gespeicherten Hashes. Ein neuer Datensatz mit Ergebnis kann auf die bestehende Anfrage-ID verweisen. Es gibt keinen Bot-zu-Bot-Dauerloop und keine automatische Nutzung von API-/Abo-Kontingenten. Codex CLI wurde hier nur mit `--help` geprüft; eine dauerhaft angemeldete Modell-Verbindung ist nicht nachgewiesen.

## Direkter Aufruf

Voraussetzungen: Node.js 22 oder neuer und Git. Vom Repo-Root aus:

```sh
node automation/claude-assist.mjs doctor
node automation/claude-assist.mjs check core
node automation/claude-assist.mjs check seo
node automation/claude-assist.mjs handoff-read
```

Notizen werden als JSON auf stdin übergeben; keine freien Dateipfade oder Shellbefehle als Argumente:

```sh
node automation/claude-assist.mjs handoff-save <<'JSON'
{"summary":"Konkrete bestätigte Codeänderung und Prüfergebnis.","nextStep":"Ein klarer nächster Arbeitsschritt.","blockers":["Noch fehlender Nachweis."]}
JSON
node automation/claude-assist.mjs review-request <<'JSON'
{"question":"Bitte die Fehlerbehandlung dieses Helfers prüfen.","files":["automation/lib/claude_assist.mjs"]}
JSON
```

`doctor` liest lokal. Eine unbekannte/falsche Git-Origin blockiert Testläufe und neue Übergaben; der Status bleibt lesbar. Erwartetes Repository ist `allengchour-glitch/aban-news-landing`. Der lokale Origin-Nachweis ersetzt keine frische Identitätsprüfung verbundener Shopify-/Metricool-Konten. Ein Export ohne `.git` bleibt unbekannt. Git-/Cloud-Zugangsdaten werden nicht ausgegeben.

## Tests und Fehlermeldungen

`core` startet ausschliesslich die bestehenden Tests für Shopify-GraphQL-, Secret- und Kanalhelfer. `seo` startet ausschliesslich `seo-optimizer_test.mjs` und `seo_titel_test.mjs`; fehlen diese auf dem gewählten Branch, ist das Ergebnis unbekannt. Die SEO-Überarbeitung aus PR [2694](https://github.com/allengchour-glitch/aban-news-landing/pull/2694) war beim Aufbau noch ein Entwurf und wird nicht stillschweigend integriert.

Pro Test höchstens 15 Sekunden und 16 KiB Ausgabe; feste argv-Arrays, keine Shell, bereinigte Umgebung ohne Business-/LLM-/Telegram-Zugangsdaten. Der Preload blockiert gewöhnliche Node-Netzwerk- und Kindprozessaufrufe. Das ist zusätzliche Absicherung für vertrauenswürdige Repo-Tests und keine OS-Sandbox für absichtlich bösartigen Code. Die Tests laufen unverändert; deren technische Regeln können engeren Inhabervorgaben widersprechen. Insbesondere erlaubt der alte allgemeine Kanalhelfer manche `rueckhol`-Tags, während die aktuelle Inhabervorgabe jedes `rueckhol` für neue Social-Ausspielung sperrt. Ein grünes Kernprofil hebt diese zusätzliche Sperre nicht auf.

Fehler, Timeout, Ausgabelimit und fehlende Dateien bleiben unterscheidbar. Keine automatische Reparatur, Wiederholung von Writes oder Umdeutung von unbekannt zu Null. Eigene Regressionen: `node --test automation/lib/claude_assist_test.mjs automation/lib/claude_assist_mcp_test.mjs`.

## Speicher und Zusammenarbeit

`handoff.jsonl` gehört zu diesem Repository und ist bewusst nicht gitignoriert. Das Tool schreibt zunächst nur im lokalen Checkout. Für andere Rechner/Sitzungen muss die Datei zusammen mit der Arbeit committen und gepusht werden; ein lokaler Pfad allein ist keine dauerhafte Cloud-Speicherung. Offene Einträge nicht als erledigt darstellen.

Exklusiver `.handoff.lock`, fsync und atomarer Rename schützen lokale Änderungen. Der Hash-Verlauf erkennt beschädigte oder veränderte Einträge. Ein fehlender Verlauf liefert unbekannte Vergangenheit; der erste neue lokale Eintrag dokumentiert das ausdrücklich. Bestehendes Register wird nie automatisch zurückgesetzt, gekürzt oder migriert. Bei Git-Mergekonflikten/korrupten Daten oder altem Lock stoppen und die Originale sichern/gegenprüfen. Der Helfer löscht keine fremden Locks. Lokale Lock-/Temp-Dateien nicht committen. Maximal 1 MiB/1000 Einträge; danach explizit und nachvollziehbar archivieren.

Dieser Verlauf ist nur Aufgabenwissen. Er ersetzt weder den Master-Publikationsbeleg noch dessen Locks/UUIDs, Freigaben und kanalweise Rücklesungen.

## Weiter geltender Inhaberumfang vom 18.10.2026

Nur LuxeStyle/luxestyle.ch. Social-Autopublish nur über Metricool und nur nach sämtlichen frischen Identitäts-, Produkt-, Medien-, Rechte-, Qualitäts-, Kanal- und Doppelpostprüfungen. Ein professioneller Master zuerst, kein Voiceover; Musik ausschliesslich `automation/music/luxe-premium.wav` nach aktueller Datei-/Rechteprüfung. Fehlende Tags und jedes `rueckhol` blockieren neue Social-Verwendung. Dieser Helfer führt keinen dieser Live-Schritte aus und behauptet keinen fertigen Film.

Andere Shop-/Feed-/Flow-/Rabatt-/Budgetänderungen bleiben konkrete Entwürfe zur Freigabe. Keine Kundenansprache oder kostenpflichtigen Renders. Öffentliche Versandgrenze CHF 50, interne CHF 45 nach Rabatt und `account.luxestyle.com.co` erhalten; tatsächliche Tarife nicht daraus ableiten. Die vier exakt genehmigten Klaviyo-DNS-Ergänzungen benötigen keine erneute Genehmigung, aber legitimen Schreibzugang und vollständigen Erhaltungs-Diff. Kein DNS-Write durch diesen Helfer. Neue ausdrückliche Inhaberanweisungen gehen vor historischen Runbooks.

Wissensübergabe PR [2689](https://github.com/allengchour-glitch/aban-news-landing/pull/2689), SEO-Umsetzung PR [2694](https://github.com/allengchour-glitch/aban-news-landing/pull/2694): datierte Arbeitsquellen, keine Behauptung eines heutigen Deployments oder neuer Verkäufe.
