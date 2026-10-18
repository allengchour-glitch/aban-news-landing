# Prüfbeleg vom 18.10.2026

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
