# Prüfbelege für LuxeStyle Assist

## Quellenkontinuität und Testbelege in Version 2.4

170 Regressionen bestanden im vollständigen echten begrenzten Assist-Profil: Exit 0, kein Timeout, keine abgeschnittene Ausgabe, bekannte Profilinputs vor/nach dem Lauf unverändert. Neuer direkter Selbsttest bestätigt zehn Werkzeuge und Serverversion 2.4.0. Lokaler Lauf auf Node 24; der separate CI-Lauf auf Node 22 ist nur über den konkreten PR-/Commitbeleg zu beurteilen.

Übergaben können jetzt bis zu sechs vorhandene LuxeStyle-Dateien mit Originalbyte-SHA-256 pinnen. Gegenproben decken eine spätere Sitzung, geänderte/gelöschte Quellen, ungültige UTF-8-Dateien, Symlinks, unzulässige Pfade, leere Altbelege und unveränderte bisherige Journalbytes ab. Der echte MCP-Schreibweg und anschliessende CLI-Wiederaufnahme sind zusammen geprüft. Manuelle Herkunft und unbekannte Quellen bleiben ausdrücklich sichtbar; keine Modellantwort erfunden.

Feste Prüfprofile vergleichen bekannte Tests, direkte Helfer und optional package.json vor und nach dem Lauf. Gegenproben verändern Quelle, Test oder Preload, löschen Inputs, ergänzen Paketmetadaten und verändern nach Tests die Git-Pfadabdeckung. Veränderte oder unlesbare Belege bleiben unbekannt; bekannte echte Testfehler behalten Vorrang. Fehlende, verlinkte, zu grosse oder nicht reguläre Pflichtdateien verhindern den Teststart. Die begrenzten Beobachtungen sind ausdrücklich kein eingefrorener Snapshot und keine vollständige transitive Abhängigkeitsprüfung.

Transport-Gegenproben decken Client-Abbruch während Backpressure, bereits geschlossene Ausgaben, asynchrone Schreibfehler mit und ohne Backpressure sowie Abbruch während eines laufenden Handlers ab. CLI-stdin verwirft ungültiges UTF-8 ohne Journaländerung; gültiges Deutsch und Unicode bleiben erhalten.

Die echte Claude-Code-CLI 2.1.303 verbindet erneut im isolierten Pilot in allen drei bisherigen Startfällen. Der aktuelle strukturierte Beleg enthält elf Laufzeit-/Konfigurationshashes einschliesslich neuem Belegmodul. Kein Modellaufruf, keine Kundennachricht und keine Business-Änderung. Das Inhaberprofil und dessen Freigabe auf anderen Rechnern bleiben unbekannt. Zwei parallele Fachreviews endeten wegen ausgeschöpftem Agent-Kontingent; deren Teilmeldungen sind keine abgeschlossene unabhängige Gesamtprüfung. Integration und vollständige Regressionen wurden anschliessend selbst abgeschlossen.

## Explizite Commit-Planung in Version 2.3

136 Regressionstests bestanden, einschliesslich 21 neuer Gegenproben. Der vollständige Lauf über das echte begrenzte Assist-Profil endete mit Exit 0, ohne Timeout oder abgeschnittene Ausgabe. Der direkte MCP-Selbsttest bestätigt weiterhin zehn Werkzeuge und Serverversion 2.3.0.

Die praktische Lücke ist mit einem echten sauberen Git-Checkout reproduziert: Nach einem neuen Commit findet der bisherige Arbeitskopie-Plan keine Änderungen. Der zusätzliche explizite Vergleich zweier voller Commit-IDs liefert die betroffenen Pfade und dieselben festen Testvorschläge. Reale CLI- und MCP-Integration sind gegengeprüft; weder Tests noch Journal-Schreibzugriffe werden durch den Plan ausgeführt.

Gegenproben umfassen ungültige/einseitige IDs einschliesslich abschliessender Zeilenumbrüche, Tags/Bäume, fehlende Objekte, flache Historie, umgekehrte/nicht verwandte Commits, identische Snapshots, Renames/Löschungen, unbekannte und Submodul-Pfade sowie unvollständige/zu grosse/fehlgeschlagene Git-Ausgaben. Git erhält No-Lazy-Fetch-/No-Replace-Flags und gesperrte Transportprotokolle. Beide Vergleichsgrenzen und die nicht geprüfte Arbeitskopie sind ausgewiesen; daraus entsteht kein Testnachweis des Ziel-Commits. Ein unabhängiger enger Review fand keine konkreten Fehler.

Die echte Claude-Code-CLI 2.1.303 wurde mit den zehn aktuellen Laufzeit-/Konfigurationsdateien erneut im isolierten Pilot geprüft: Root, Unterordner und störende Node-Elternoptionen jeweils verbunden, Exit 0 und leeres stderr. Der strukturierte Beleg enthält die aktuellen SHA-256-Werte. Das Inhaberprofil und dessen lokale Projektfreigabe bleiben unbekannt; keine Modellanfrage und keine Business-Aktion.

## Zuverlässige Abbrüche und Review-Wiederaufnahme in Version 2.2.1

115 Regressionstests bestanden, einschliesslich 14 neuer Gegenproben. Der vollständige Lauf erfolgte über das echte begrenzte Assist-Profil: Exit 0, kein Timeout und keine abgeschnittene Ausgabe. Ein ursprünglich noch auf fünf Testdateien abgestimmter Erwartungswert wurde bei der Integration auf sechs Dateien korrigiert.

Reproduzierter Abbruchfehler: Ein 300-ms-Timeout wartete bei von Enkelprozessen offen gehaltenen Pipes mehr als zwei Sekunden; ein dauerhaft laufender Enkel hätte die Rückgabe unbegrenzt verhindern können. Der neue Runner startet auf POSIX eine eigene Prozessgruppe, beendet nur diese bei Timeout/Ausgabelimit und hat einen zusätzlichen begrenzten 100-ms-Abschlussweg. Echte Nachkommen, bereits beendete Eltern, eine bewusst abgekoppelte Testgruppe und ein fremder Geschwisterprozess sind gegengeprüft. Unvollständige Bereinigung bleibt unbekannt; ein bekannter Exitcode 0 macht ein Timeout nicht zu Erfolg. Windows nutzt den begrenzten Stream-Abschluss, wurde hier aber nicht nativ geprüft. Keine Betriebssystem-Sandbox behauptet.

Reproduzierter Wiederaufnahmefehler: Eine neuere manuelle Review-Antwort verlor ihren nächsten Schritt und ihre Blocker gegen einen älteren Handoff. Ohne ältere offene Anfrage gilt jetzt die nach Journal-Sequenz jüngste Antwort oder Übergabe. Verdict, manuelle Herkunft, Blocker und aktuelle Quellenprüfung bleiben erhalten. Veränderte oder fehlende Quellen führen zur Gegenprüfung; ein späterer Handoff übernimmt wieder den Vorrang. Keine Live- oder Modellfreigabe daraus abgeleitet.

Die echte Claude-Code-CLI 2.1.303 wurde nach Integration mit den neun aktuellen Laufzeit-/Konfigurationsdateien erneut geprüft: Root, Unterordner und störende Node-Elternoptionen jeweils verbunden, Exit 0 und leeres stderr. Der strukturierte Beleg enthält deren aktuelle SHA-256-Werte und Serverversion 2.2.1. Weiterhin nur der ausdrücklich konfigurierte isolierte Pilot, kein verifiziertes Inhaberprofil und keine Modellanfrage. Bestehende Journalzeilen und Inhabervorgaben bleiben erhalten.

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
