# LuxeStyle Assist 2.4 für Claude Code und Codex

Der Helfer bündelt lokale Projektprüfung, feste Regressionstests und eine beständige Aufgabenübergabe. Keine Zusatzpakete, keine neue API-Verbindung und kein laufender Serverdienst nötig. Er ruft kein KI-Modell auf, veröffentlicht nichts und importiert keine operativen Publisher. Er kann nicht garantieren, dass alle Automationen funktionieren oder jemand kauft.

## Benutzung in Claude Code

Nach Übernahme dieses Branches enthält `.mcp.json` den Projektserver `luxestyle-assist`. Claude Code kann eine lokale Zustimmung zum Projekt-MCP verlangen; bestehende Sicherheitsregeln und lokale Ablehnungen bleiben wirksam. Die bestehende `.claude/settings.json` mit ihrem SessionStart-Hook bleibt unverändert. Der neue Helfer ist nicht dieser alte Hook und startet ihn nicht.

Claude Code im Repository öffnen, Projekt-MCP prüfen (`/mcp`) und `/luxestyle-assist` verwenden. Der Slash-Befehl liegt unter `.claude/commands/`. Er liest Status/Übergabe, wählt passende Tests und speichert den nächsten Schritt. Das ist keine im Hintergrund laufende ChatGPT-Session. Projektkonfiguration im Repo ist kein Beleg, dass ein anderer Rechner den Server bereits geladen oder freigegeben hat.

Die offizielle Claude-Code-CLI 2.1.303 wurde in einem isolierten Pilotprojekt ohne Modellanfrage geprüft. `claude mcp get luxestyle-assist` meldete dort Connected im Repo-Root, aus einem Unterordner und bei störenden Node-Optionen des Elternprozesses. Das belegt diese lokale Client-Anbindung; die Installation und Projektfreigabe auf dem Rechner des Inhabers bleiben separat. Ein frischer Projekt-MCP wurde zunächst korrekt als Pending approval erkannt; die erfolgreiche Verbindung erfolgte danach über einen ausdrücklich angelegten lokalen Eintrag nur im isolierten Pilotprojekt. Bestehende Benutzerprofile und Projektentscheidungen wurden nicht verändert. [Strukturierter Prüfbeleg](CLAUDE-CLIENT-CHECK.json).

Vor dem ersten Clientstart vom Repo-Root aus `node automation/claude-assist.mjs self-check` ausführen. Der Befehl prüft lokale Voraussetzungen und startet das feste lokale Skript für `initialize`, `ping` und `tools/list`. Er verwendet bereinigte Umgebung und Offline-Preload, kein frei konfiguriertes Programm. Der Test ruft keine Business-Tools auf und schreibt keine Historie. Er bestätigt den eigenen Serverstart, nicht die Verbindung oder Freigabe im echten Claude-Client.

| Werkzeug | Wirkung |
|---|---|
| `luxe_doctor` | Lokale Startvoraussetzungen, Blocker und nächster belegter Arbeitsschritt |
| `luxe_checks` | Feste Profile `core`, `seo`, `assist` oder daraus gewähltes `changed` |
| `luxe_handoff_read` | Höchstens zehn letzte Übergaben innerhalb 128 KiB; Teilansicht wird ausgewiesen |
| `luxe_handoff_save` | Manuellen Stand und nächsten Schritt optional mit bis zu sechs Quellenpins lokal sichern |
| `luxe_review_request` | Konkrete Codex-Frage mit Dateihashes in derselben Übergabe vormerken |
| `luxe_change_plan` | Arbeitskopie oder zwei explizite lokale Commits vergleichen; feste Tests vorschlagen |
| `luxe_review_list` | Alle Review-Aufträge zählen und fünf pro Seite mit Status/Hash-Gegenprobe anzeigen |
| `luxe_review_get` | Einen Auftrag samt voller Frage, manueller Antwort und aktuellem Dateiabgleich lesen |
| `luxe_review_answer` | Ein manuelles Review eindeutig einem offenen Auftrag und dessen Dateistand zuordnen |
| `luxe_context` | Begrenzte lokale Dateiauszüge mit Original-Hashes und geltendem Umfang vorbereiten |

Eine Codex-Prüfaufgabe erhält `awaiting_codex`, keine erfundene Antwort. Identische offene Fragen zu denselben Dateihashes werden wiedergefunden statt doppelt angelegt. Die nächste Codex- oder Claude-Sitzung liest den Auftrag und kann ein manuelles Ergebnis mit `requestId`, `verdict` (`findings`, `no_findings`, `blocked`), `summary`, `nextStep` und optional `blockers` sichern. Antworten werden als manuell deklariert; Autorenschaft oder tatsächlicher Modellaufruf werden nicht behauptet. Positive Abschlüsse benötigen unveränderte gepinnte Dateien; bei fehlenden/geänderten Quellen nur einen Blocker erfassen oder einen neuen Auftrag zum neuen Stand erstellen. Bestehende Antworten nicht überschreiben. Eine spätere Dateiänderung macht die Anwendbarkeit veraltet, ohne den historischen Befund zu löschen.

Die Liste wertet das ganze begrenzte Journal aus; offene Aufgaben verschwinden nicht nach zehn späteren Notizen. Pro Seite fünf Einträge, `nextCursor` gegebenenfalls als `after` an die nächste Abfrage übergeben. Lange Listentexte sind gekennzeichnet gekürzt; `luxe_review_get` liefert den vollen Einzelauftrag. Fehlende/beschädigte Historie oder ungültiger Cursor bleibt unbekannt. Es gibt keinen Bot-zu-Bot-Dauerloop und keine automatische Nutzung von API-/Abo-Kontingenten. Codex CLI wurde hier nur mit `--help` geprüft; eine dauerhaft angemeldete Modell-Verbindung ist nicht nachgewiesen.

## Direkter Aufruf

Voraussetzungen: Node.js 22 oder neuer und Git. Vom Repo-Root aus:

```sh
node automation/claude-assist.mjs doctor
node automation/claude-assist.mjs self-check
node automation/claude-assist.mjs check core
node automation/claude-assist.mjs check seo
node automation/claude-assist.mjs change-plan
node automation/claude-assist.mjs check changed
node automation/claude-assist.mjs check assist
node automation/claude-assist.mjs handoff-read
node automation/claude-assist.mjs review-list
```

Notizen werden als JSON auf stdin übergeben; keine freien Dateipfade oder Shellbefehle als Argumente:

```sh
node automation/claude-assist.mjs handoff-save <<'JSON'
{"summary":"Konkrete bestätigte Codeänderung und Prüfergebnis.","nextStep":"Ein klarer nächster Arbeitsschritt.","blockers":["Noch fehlender Nachweis."],"files":["automation/lib/claude_assist.mjs"]}
JSON
node automation/claude-assist.mjs review-request <<'JSON'
{"question":"Bitte die Fehlerbehandlung dieses Helfers prüfen.","files":["automation/lib/claude_assist.mjs"]}
JSON
```

`doctor` liest lokal. Eine unbekannte/falsche Git-Origin blockiert Testläufe und neue Übergaben; der Status bleibt lesbar. Erwartetes Repository ist `allengchour-glitch/aban-news-landing`. Der lokale Origin-Nachweis ersetzt keine frische Identitätsprüfung verbundener Shopify-/Metricool-Konten. Ein Export ohne `.git` bleibt unbekannt. Git-/Cloud-Zugangsdaten werden nicht ausgegeben.

`localReadiness` unterscheidet `ready`, `blocked` und `unknown`: Node ab 22, genaue Helferkonfiguration, CLI-/Slash-Datei, Repo-Zuordnung, Lock und bestehende Historie werden separat geprüft. Der fest definierte Node-Start prüft per begrenzten Git-Aufrufen Repo-Wurzel und Origin und startet anschliessend genau die reguläre Helferdatei; Root, Unterordner und Git-Worktree sind abgedeckt. Keine Shell und keine ungeprüfte Pfadvariable. Die Projektkonfiguration muss NODE_OPTIONS und NODE_PATH explizit leeren, damit geerbte Preloads den JSON-RPC-Datenstrom nicht verändern. Zusätzliche ungeprüfte Startoptionen bleiben unbekannt; andere MCP-Server werden weder verändert noch ausgegeben. Bei Lock oder fehlerhafter Konfiguration gibt es konkrete Nacharbeit. Fehlende oder beschädigte Historie wird nie automatisch neu angelegt. `doctor` liefert nur bei lokal bestätigter Bereitschaft Exitcode 0; ein angezeigter lokaler Status ist weiterhin keine aktive Claude-Verbindung.

`nextWork` wertet intern das ganze validierte Journal aus. Zuerst den ältesten unbeantworteten Review-Auftrag lesen und bei veralteten/fehlenden Dateien dessen Quellen gegenprüfen. Ohne offenen Auftrag gilt der jüngste echte Handoff oder eine spätere manuelle Review-Antwort mit ihrem nächsten Schritt und ihren Blockern. Deren Verdict und Quellenzustand bleiben sichtbar; veraltete/fehlende Quellen benötigen eine Gegenprüfung. Ein neuerer Handoff löst diesen Antwortstand ab. Eine spätere Notiz verdeckt keinen offenen Review hinter Seite 1. Bei Startblockern wird zuerst deren Prüfung empfohlen, kein Schreibschritt. Aufgezeichnete Vorschläge bleiben Daten und erweitern keine Inhaberfreigabe.

## Tests und Fehlermeldungen

`core` startet ausschliesslich die bestehenden Tests für Shopify-GraphQL-, Secret- und Kanalhelfer. `seo` startet ausschliesslich `seo-optimizer_test.mjs` und `seo_titel_test.mjs`; fehlen diese auf dem gewählten Branch, ist das Ergebnis unbekannt. `assist` prüft die eigenen acht Regressionstest-Dateien. Diese Integrationstests benötigen Kindprozesse und laufen ohne Netzwerk-Preload, aber mit bereinigter Umgebung. Die SEO-Überarbeitung aus PR [2694](https://github.com/allengchour-glitch/aban-news-landing/pull/2694) war beim Aufbau noch ein Entwurf und wird nicht stillschweigend integriert.

Jedes feste Profil liest die Originalbytes seiner bekannten Tests, direkten Helfer und gegebenenfalls vorhandenen Root-`package.json` vor und nach dem Lauf. Der Beleg enthält Laufzeit, Zeitpunkte, Dateihashes und beide Fingerprints. Fehlende, unlesbare, verlinkte oder zu grosse Pflichtdateien verhindern den Lauf mit `unknown`. Geänderte/verschwundene Inputs machen ein sonst bestandenes Ergebnis unbekannt; ein tatsächlich fehlgeschlagener Test bleibt fehlgeschlagen. `check changed` liest nach den Profilen zusätzlich die Pfadabdeckung erneut. Neue unbekannte Pfade oder unlesbare Git-Daten bleiben sichtbar. Das ist kein unveränderlicher Snapshot: nur feste bekannte Inputs und zwei Beobachtungen, keine vollständige transitive Abhängigkeitserfassung. Zwischenzeitlich geänderte und rechtzeitig zurückgesetzte Bytes können unerkannt bleiben.

`change-plan` liest getrennt Git-Index, Arbeitskopie und ungetrackte Dateien mit NUL-Trennung, deaktivierten externen Diff-/Textconv-/Fsmonitor-Helfern und festen Argumenten. Höchstens 200 Pfade; Fehler/Abschneiden bleiben unbekannt. Bereits committierte Änderungen werden nicht durch diesen lokalen Plan abgedeckt. Nur exakte bekannte Dateien wählen Profile aus; ähnlich benannte neue Skripte erhalten keine erfundene Testabdeckung. `check changed` führt diese festen Profile aus. Unbekannte Dateien bleiben `unmapped`; reine Dokumente oder keine Änderungen sind kein bestandener Testlauf. Ein tatsächlich fehlgeschlagener Test bleibt fehlgeschlagen, auch neben unbekannter Abdeckung. Andere Marken werden nicht bearbeitet.

Für bereits committierte Übergaben akzeptiert dasselbe Werkzeug zusätzlich ein vollständiges Paar `baseCommit` und `headCommit`, jeweils exakt 40 Hexzeichen. Keine Branchnamen, kurzen Hashes oder Git-Ausdrücke. Beide Objekte müssen lokal echte Commits sein; die Basis muss als Vorfahr des Ziels bestätigt sein. Direkter Vergleich der beiden angegebenen Snapshots, keine automatische andere Vergleichsbasis. Beispiel für zwei bekannte Projektstände:

```sh
node automation/claude-assist.mjs change-plan aab26b594657bcbc86e48aa23eb9580e537d3af0 06be8d276af624cdffd7275842598aa7198a82b5
```

MCP: `luxe_change_plan` mit `{"baseCommit":"aab26b594657bcbc86e48aa23eb9580e537d3af0","headCommit":"06be8d276af624cdffd7275842598aa7198a82b5"}`. Ohne Argumente bleibt die bisherige Prüfung der Arbeitskopie erhalten. Die Beispiele sind ein datierter Vergleich, keine automatische Auswahl des heutigen Auftrags.

Der Commit-Modus liest nur lokal: keine Fetches, Checkouts oder Tests. Lazy Fetch, Ersatzobjekte, externe Diff-/Textconv-Helfer und Git-Transporte sind für diese Leseaufrufe gesperrt. Fehlende Objekte, nicht unterstützte Git-Optionen, flache oder nicht lineare Historie, unerwartetes stderr sowie Zeit-/Ausgabe-/Pfadgrenzen bleiben `unknown`, niemals eine leere Änderungsliste. Die Ausgabe nennt beide Commit-IDs, `worktreeChanges: not_scanned` und `executedTests: false`. Lokale Änderungen deshalb bei Bedarf zusätzlich ohne Argumente prüfen. Vorgeschlagene feste Profile laufen über `luxe_checks` weiterhin gegen die aktuelle Arbeitskopie; `check changed` übernimmt keine Commit-IDs und ein grünes Profil beweist keine Prüfung des angegebenen Ziel-Commits.

Pro Test höchstens 15 Sekunden und 16 KiB Ausgabe, für das eigene Assist-Profil zusammen 30 Sekunden und 32 KiB; feste argv-Arrays, keine Shell, bereinigte Umgebung ohne Business-/LLM-/Telegram-Zugangsdaten. Der Preload blockiert gewöhnliche Node-Netzwerk- und Kindprozessaufrufe. Das ist zusätzliche Absicherung für vertrauenswürdige Repo-Tests und keine OS-Sandbox für absichtlich bösartigen Code. Die Tests laufen unverändert; deren technische Regeln können engeren Inhabervorgaben widersprechen. Insbesondere erlaubt der alte allgemeine Kanalhelfer manche `rueckhol`-Tags, während die aktuelle Inhabervorgabe jedes `rueckhol` für neue Social-Ausspielung sperrt. Ein grünes Kernprofil hebt diese zusätzliche Sperre nicht auf.

Bei Timeout oder Ausgabelimit wird auf POSIX nur die eigene neu gestartete Prozessgruppe beendet. Offene Ausgabekanäle von Unterprozessen dürfen die Rückgabe nicht unbegrenzt verzögern; ein begrenzter Abbruchpfad schliesst die lokalen Streams. Diese Prozessverwaltung ersetzt keine Betriebssystem-Sandbox und garantiert keine Kontrolle über absichtlich abgekoppelte Prozesse.

Fehler, Timeout, Ausgabelimit und fehlende Dateien bleiben unterscheidbar. Keine automatische Reparatur, Wiederholung von Writes oder Umdeutung von unbekannt zu Null. Eigene Regressionen: `node --test automation/lib/claude_assist_test.mjs automation/lib/claude_assist_mcp_test.mjs automation/lib/claude_assist_changes_test.mjs automation/lib/claude_assist_readiness_test.mjs automation/lib/claude_assist_launch_test.mjs automation/lib/claude_assist_runner_test.mjs automation/lib/claude_assist_commits_test.mjs automation/lib/claude_assist_evidence_test.mjs`.

MCP wartet auf abgeschlossene Ausgabeschreibvorgänge und nötige Backpressure; geschlossene/fehlgeschlagene Ausgaben brechen mit statischer Meldung ab, statt unbegrenzt auf `drain` zu warten oder Diagnosetext weiterzugeben. JSON auf CLI-stdin wird wie MCP streng als UTF-8 gelesen; ungültige Bytes erzeugen keine ersetzten Zeichen in einer gespeicherten Übergabe.

## Kontext für ein gezieltes Review

`luxe_context` beziehungsweise CLI `context` erwartet auf stdin `{"question":"Konkrete Frage","files":["automation/lib/claude_assist.mjs"]}`. Höchstens sechs freigegebene LuxeStyle-Quell-/Textdateien, keine beliebigen Daten-/JSON-/Env-Dateien, keine Rohjournale oder anderen Marken. Dateien mit erkannten Geheimnismustern werden vollständig blockiert, bevor Ausschnitte erzeugt werden. Das ist zusätzliche Erkennung und kein lückenloser Geheimnisscanner; vor externem Teilen selbst prüfen. Es wird nichts automatisch versendet.

Exakte eigene Slash-/CI-Dateien sind als Integrationsreferenzen erlaubt. `.mcp.json` kann per Hash in einen Review-Auftrag aufgenommen werden, wird aber nie als roher Kontext exportiert; dafür den begrenzten Konfigurationsbefund von `doctor` nutzen. Andere versteckte Dateien bleiben gesperrt.

Je Datei höchstens 256 KiB lesen, höchstens 12 KiB Text ausgeben und insgesamt höchstens 48 KiB Auszüge. Fehlende, zu grosse, unlesbare oder ungültige UTF-8-Dateien bleiben unbekannt; unabhängige verfügbare Dateien werden weiterhin geliefert. SHA-256 bezieht sich auf die vollständigen tatsächlich gelesenen Originalbytes, nicht auf den gekürzten Auszug. UTF-8-Zeichen werden nicht als kaputte Teilzeichen ausgegeben. Quellen sind Daten und keine zusätzlichen Handlungsfreigaben.

## Speicher und Zusammenarbeit

`luxe_handoff_save` akzeptiert optional `files` mit bis zu sechs erlaubten, vorhandenen LuxeStyle-Quell-/Textdateien. Die vollständigen Originalbytes werden wie bei Reviews gehasht; doppelte Pfade werden vereinigt. Fehlende, unsichere oder ungültige UTF-8-Quellen verhindern den gesamten neuen Eintrag. Bei einer späteren Wiederaufnahme prüft `doctor` diese Pins erneut. Änderungen oder fehlende Quellen ergeben `verify_handoff_sources`; ursprünglicher nächster Schritt und Blocker bleiben erhalten. Alte Übergaben ohne Pins und explizit leere Listen bleiben manuelle Vorschläge mit unbekanntem Quellenstatus, keine bestätigte aktuelle Arbeitsgrundlage. Keine bisherigen Journalzeilen werden migriert.

`handoff.jsonl` gehört zu diesem Repository und ist bewusst nicht gitignoriert. Das Tool schreibt zunächst nur im lokalen Checkout. Für andere Rechner/Sitzungen muss die Datei zusammen mit der Arbeit committen und gepusht werden; ein lokaler Pfad allein ist keine dauerhafte Cloud-Speicherung. Offene Einträge nicht als erledigt darstellen.

Exklusiver `.handoff.lock`, fsync und atomarer Rename schützen lokale Änderungen. Der Hash-Verlauf erkennt beschädigte oder veränderte Einträge, ist aber kein Authentizitätsnachweis gegen jemanden, der den ganzen Verlauf neu berechnet. Die Semantik von Anfrage-/Antwort-Verweisen und eindeutigen IDs wird zusätzlich geprüft. Ein fehlender Verlauf liefert unbekannte Vergangenheit; der erste neue lokale Eintrag dokumentiert das ausdrücklich. Bestehendes Register wird nie automatisch zurückgesetzt, gekürzt oder migriert. Bei Git-Mergekonflikten/korrupten Daten oder altem Lock stoppen und die Originale sichern/gegenprüfen. Der Helfer löscht keine fremden Locks. Lokale Lock-/Temp-Dateien nicht committen. Maximal 1 MiB/1000 Einträge; danach explizit und nachvollziehbar archivieren.

Dieser Verlauf ist nur Aufgabenwissen. Er ersetzt weder den Master-Publikationsbeleg noch dessen Locks/UUIDs, Freigaben und kanalweise Rücklesungen.

## Weiter geltender Inhaberumfang vom 18.10.2026

Nur LuxeStyle/luxestyle.ch. Social-Autopublish nur über Metricool und nur nach sämtlichen frischen Identitäts-, Produkt-, Medien-, Rechte-, Qualitäts-, Kanal- und Doppelpostprüfungen. Ein professioneller Master zuerst, kein Voiceover; Musik ausschliesslich `automation/music/luxe-premium.wav` nach aktueller Datei-/Rechteprüfung. Fehlende Tags und jedes `rueckhol` blockieren neue Social-Verwendung. Dieser Helfer führt keinen dieser Live-Schritte aus und behauptet keinen fertigen Film.

Andere Shop-/Feed-/Flow-/Rabatt-/Budgetänderungen bleiben konkrete Entwürfe zur Freigabe. Keine Kundenansprache oder kostenpflichtigen Renders. Öffentliche Versandgrenze CHF 50, interne CHF 45 nach Rabatt und `account.luxestyle.com.co` erhalten; tatsächliche Tarife nicht daraus ableiten. Die vier exakt genehmigten Klaviyo-DNS-Ergänzungen benötigen keine erneute Genehmigung, aber legitimen Schreibzugang und vollständigen Erhaltungs-Diff. Kein DNS-Write durch diesen Helfer. Neue ausdrückliche Inhaberanweisungen gehen vor historischen Runbooks.

Wissensübergabe PR [2689](https://github.com/allengchour-glitch/aban-news-landing/pull/2689), SEO-Umsetzung PR [2694](https://github.com/allengchour-glitch/aban-news-landing/pull/2694): datierte Arbeitsquellen, keine Behauptung eines heutigen Deployments oder neuer Verkäufe.
