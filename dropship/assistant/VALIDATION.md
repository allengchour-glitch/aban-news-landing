# Prüfbelege für LuxeStyle Assist

## Tatsächliche Claude-Code-Anbindung in Version 2.2

101 Regressionstests bestanden. Zwei reale Pilotbefunde behoben: Geerbte Node-Ladeoptionen konnten Text vor JSON-RPC ausgeben; relative Startargumente scheiterten bei einem anderen Arbeitsverzeichnis. Der fixe, begrenzte Git-Root-Launcher und explizit leere NODE_OPTIONS/NODE_PATH sind als tatsächlich konfigurierte Startstrecke gegengeprüft, inklusive Git-Worktrees, Pfaden mit Leerzeichen, falscher Origin, Symlinks, Importfehlern und Git-Umgebungsinjektion.

Die offizielle Claude-Code-CLI 2.1.303 wurde isoliert installiert. Ohne Modellanfrage oder Authentifizierung einer Unterhaltung meldeten die drei Health-Checks Connected: Repo-Root, Unterordner, störende Eltern-Node-Optionen. Frische Projektfreigaben wurden nicht umgangen: der zunächst ungenehmigte Projekt-Eintrag blieb Pending approval; nur ein explizit hinzugefügter lokaler Eintrag im separaten Pilotprofil wurde verbunden. Bestehende Claude-Einstellungen und der alte SessionStart-Hook blieben unberührt. Der strukturierte Clientbeleg enthält Paketversion/Integrität und Quellhashes, keine fremden Profile oder Zugangsdaten.

Der inzwischen aktualisierte Shopify-GraphQL-Helfer von main 7ad65edc07c6c2ef26cb445566ee0764b3f1699f wurde separat mit seinem echten aktuellen Test unter dem Offline-Preload geprüft; alle Gegenproben grün. Keine Shopify-Anfrage, kein Import, kein Shop-/Flow-/DNS-/Metricool-Write. Die folgenden Abschnitte dokumentieren frühere Stände und werden durch diesen Nachtrag ergänzt; die frühere Aussage, Claude Code sei nicht installiert/getestet, ist für den isolierten Pilot jetzt überholt.

## Start und Wiederaufnahme in Version 2.1

86 Regressionstests bestanden. Der neue lokale Bereitschaftsbericht prüft Node, genaue Helferkonfiguration, CLI/Slash-Datei, Repo, Lock und vorhandene Historie. Zusätzliche ungeprüfte Startoptionen bleiben unbekannt; fremde MCP-Konfiguration wird nicht ausgegeben. Der CLI-Exitcode zeigt Startblocker nun an.

Echter `self-check` am lokalen Server bestanden: initialize, ping und tools/list bestätigten die zehn Werkzeuge der Serverversion 2.1.0. Kein Business-Tool, Modellaufruf oder Historien-Write. Zusätzliche Gegenproben decken unvollständige Protokolle, unbeabsichtigte Config-Befehle und fehlende Historie ab. Ein direkter Protokolltest bestätigt keinen verbundenen Claude-Client.

Die Wiederaufnahme findet einen sechsten offenen Review hinter fünf beantworteten Einträgen auch nach späteren Notizen. Veraltete Dateien führen zur Quellen-Gegenprüfung; ein Lock oder kaputtes Journal blockiert die Arbeitsempfehlung. Der unabhängige Review der korrigierten Strecke fand keine weiteren reproduzierbaren Fehler; seine enge Runner-Probe bestätigte UTF-8 über Chunkgrenzen und getrennte Diagnoseausgabe.

Die eigene Slash-/CI-Integration kann nun gezielt als Review-Referenz dienen. Die MCP-Datei wird nur per Hash referenziert, nie roh als Kontext exportiert. Ein unbekannter Cursor meldet einen Cursorfehler, keinen erfundenen Historiedefekt. Alle alten Journalzeilen bleiben erhalten.

## Erweiterung auf Version 2

64 Regressionstests bestanden: zusätzlich exakte Änderungszuordnung, echte Git-Index-/Arbeitskopie-/Untracked-Gegenprobe, veraltete/gelöschte Review-Quellen, doppelte Fragen, paginierte offene Aufgaben, voller Detailabruf, manuelle Antworten, Originalbyte-Hashes, begrenzte UTF-8-Auszüge und Geheimnis-/Markensperren. Echte CLI/MCP-Integration umfasst nun Anfrage, Kontext, Detail, Antwort und Rücklesung. Der neue Assist-Testplaner ist bewusst eine feste Allowlist; nicht abgedeckte Dateien bleiben unbekannt.

64 statt zuvor 29 Tests. Das Protokoll wurde rückwärtskompatibel erweitert und nicht zurückgesetzt. Ein zusätzlicher Datensatz bewahrt den neuen Arbeitsstand. Zehn maximal lange gültige Unicode-Notizen wurden gegengeprüft: die Rückgabe bleibt innerhalb 128 KiB und meldet die Teilansicht; das Originaljournal bleibt vollständig. Review-Listen sind auf fünf Einträge pro Seite begrenzt, ganze Einzelaufträge gesondert abrufbar.

Unabhängiger Code-Review fand eine zu breite Fremdmarkenfreigabe, den fehlenden vollständigen Abruf alter langer Fragen und einen Unicode-Ausgabeüberlauf. Alle drei Befunde wurden korrigiert und durch Gegenproben abgedeckt. Es wird keine dauerhafte Modellverbindung, kein fertiger Produktfilm und keine Produktionsfreigabe behauptet.

## Frühere Prüfung der ersten Version

- 29 eigene Regressionstests bestanden: MCP-Protokoll, strikte Argumente, 64-KiB-Grenze, Backpressure, falsche/fehlende Repo-Identität, beschädigte Übergabe, Hash-Gegenprobe, Lock, Symlink-Abwehr, feste Testprofile, bereinigte Umgebung, Timeout, Ausgabegrenze und Redaktion.
- CLI und MCP an einem echten temporären Git-Checkout gemeinsam geprüft; gespeicherte Übergabe über beide Oberflächen zurückgelesen.
- Sechs parallele Prozesse: jeder bestätigte Datensatz blieb erhalten; blockierte Versuche wurden ohne Retry gemeldet.
- Bestehendes Core-Profil real über den neuen Runner ausgeführt: Shopify-GraphQL-, Secret- und Kanalhelfer grün. Quellstand dieser Helfer: f6a4d1f012332accbf80443fbe46fda91775f0ca. Technische Altregeln sind keine neue Social-Freigabe.
- Echte CLI-Statusprobe: lokales Repo passend, fehlende Live-Konten/Publikationen/Umsätze unbekannt. Erster eigener Übergabeeintrag mit unbekannter Vorgeschichte gespeichert.
- Neue Konfigurationsdatei `.mcp.json` und Workflow strukturell geprüft. Bestehende `.claude/settings.json` und deren SessionStart-Hook nicht geändert oder gestartet.
- Keine npm-Installation, kein Modellaufruf, keine Business-API, kein externer Write, kein manueller Workflow-Dispatch, kein Merge/Deployment ausgeführt.

Laufzeit hier: Node 24. CI zielt auf Node 22. Claude Code ist hier nicht installiert; kein echter Claude-Clientstart behauptet. Codex CLI war vorhanden, wurde aber nur mit `exec --help` gelesen. Die neue MCP-Konfiguration ist erst nach Übernahme des Branches und lokaler Bestätigung auf dem jeweiligen Claude-Rechner nutzbar. Ein Upload ist keine aktivierte Verbindung.
