# Prüfbeleg vom 18.10.2026

- 29 eigene Regressionstests bestanden: MCP-Protokoll, strikte Argumente, 64-KiB-Grenze, Backpressure, falsche/fehlende Repo-Identität, beschädigte Übergabe, Hash-Gegenprobe, Lock, Symlink-Abwehr, feste Testprofile, bereinigte Umgebung, Timeout, Ausgabegrenze und Redaktion.
- CLI und MCP an einem echten temporären Git-Checkout gemeinsam geprüft; gespeicherte Übergabe über beide Oberflächen zurückgelesen.
- Sechs parallele Prozesse: jeder bestätigte Datensatz blieb erhalten; blockierte Versuche wurden ohne Retry gemeldet.
- Bestehendes Core-Profil real über den neuen Runner ausgeführt: Shopify-GraphQL-, Secret- und Kanalhelfer grün. Quellstand dieser Helfer: f6a4d1f012332accbf80443fbe46fda91775f0ca. Technische Altregeln sind keine neue Social-Freigabe.
- Echte CLI-Statusprobe: lokales Repo passend, fehlende Live-Konten/Publikationen/Umsätze unbekannt. Erster eigener Übergabeeintrag mit unbekannter Vorgeschichte gespeichert.
- Neue Konfigurationsdatei `.mcp.json` und Workflow strukturell geprüft. Bestehende `.claude/settings.json` und deren SessionStart-Hook nicht geändert oder gestartet.
- Keine npm-Installation, kein Modellaufruf, keine Business-API, kein externer Write, kein manueller Workflow-Dispatch, kein Merge/Deployment ausgeführt.

Laufzeit hier: Node 24. CI zielt auf Node 22. Claude Code ist hier nicht installiert; kein echter Claude-Clientstart behauptet. Codex CLI war vorhanden, wurde aber nur mit `exec --help` gelesen. Die neue MCP-Konfiguration ist erst nach Übernahme des Branches und lokaler Bestätigung auf dem jeweiligen Claude-Rechner nutzbar. Ein Upload ist keine aktivierte Verbindung.
