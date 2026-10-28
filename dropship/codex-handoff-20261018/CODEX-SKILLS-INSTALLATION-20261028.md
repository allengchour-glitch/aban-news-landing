# LuxeStyle: Codex-Skills eingerichtet, 28.10.2026

Auf den ausdrücklichen Inhaberauftrag «installiere skills und alles wie claude code» wurden acht native Skills projektlokal unter `/workspace/luxestyle-codex/.agents/skills/` eingerichtet: stand, regeln, zweitmeinung, uebergabe, sparmodus, shop-puls, lieferbar und trend. Es sind relative Verweise auf die belegten vorhandenen LuxeStyle-Quellen; alle acht Frontmatter-Dokumente sind gültig. 30 Quelldateien sind mit Repo-/lokalen Hashes zugeordnet, keine Zertifikate, Passwörter oder globalen Auth-Dateien kopiert. Die neue Übergabekomponente stammt aus dem lokal getesteten Reviewentwurf.

Die aufgerufene CLI ist0.159.2, der bestehende Mod wurde gegen0.165.0 entwickelt. Der globale Marketplace-Install ist tatsächlich am schreibgeschützten CODEX_HOME gescheitert, auch mit eng beantragtem zusätzlichem Schreibzugriff. Der entfernte Katalog lieferte451/no_biscuit_no_service. Nichts durch Umstellen von HOME/CODEX_HOME oder Trust-/Sandbox-Bypass umgangen.

**Ehrlicher Nutzungsstand:** Skilldateien und lokaler Startpfad eingerichtet; native CLI-Erkennung bleibt unbekannt. Der modellfreie App-server-Test kam nicht bis skills/list, weil die SQLite-Zustandsablage im schreibgeschützten globalen Verzeichnis nicht initialisiert werden konnte. Ein Verzeichnis mit SKILL.md ist kein Beweis für eine geladene Sitzung. Keine Installation auf dem Inhaber-PC oder in Claudes Sitzung behauptet.

Regelhilfe lief tatsächlich: Exit0, alle6Regelnwieerwartet. Sparmodusstatus tatsächlich AUS/Exit0; nichts umgeschaltet. Hooks liegen nur als Quellcode vor, sind weder registriert noch vertraut. `/hooks`-Vertrauensbestätigung bleibt dem Menschen in einer legitim installierten Codex-CLI vorbehalten. Es wurden keine Modelle, Shop-/CJ-Skripte oder Hintergrundjobs gestartet. Die drei Shop-/CJ-Skills brauchen bei späterer ausdrücklicher Nutzung weiterhin vollständige aktuelle Repohelfer und legitime Runtimezugänge.

[Installationsbeleg](CODEX-SKILLS-INSTALLATION-20261028.json) hält Pfade, Hashes und konkrete Fehler fest. Lokal starten: `bash /workspace/luxestyle-codex/start.sh` in einer passenden CLI-Umgebung; dieser Start wurde hier nicht als Modellsitzung ausgeführt.

Offizieller Installationsweg: https://developers.openai.com/codex/skills . Der vorhandene Mod bleibt die Quelle; keine neue fremde Skill-Sammlung oder weitere Kontoverbindung installiert.
