---
name: sparmodus
description: Schaltet den Sparmodus von luxe-codex an oder aus und zeigt den Stand (kurze Antworten, keine Unteragenten ohne Auftrag). Verwenden bei «Sparmodus an», «Sparmodus aus», «Sparmodus status» oder wenn der Besitzer Token sparen will.
---

# Sparmodus

Der Sparmodus ist ein Schalter, der in jeder Sitzung gilt, bis er wieder ausgeschaltet wird. Vorgabe ist AUS.
Bei AN geben die Hooks von luxe-codex dem Modell einen Stil-Hinweis (kurz antworten, keine Unteragenten ohne Auftrag).

## Ablauf

1. Das Argument bestimmen: `an`, `aus` oder `status`. Sagt der Besitzer nichts davon, nimm `status`; rate nie zwischen `an` und `aus`.
2. Das Skript `scripts/schalten.mjs` ausführen. Es liegt im Ordner dieses Skills: nimm den Ordner, aus dem du diese `SKILL.md` gelesen hast, und hänge `scripts/schalten.mjs` an. Einen anderen Pfad nicht verwenden.

   ```
   node "<Skill-Ordner>/scripts/schalten.mjs" an
   ```

3. Die Ausgabe des Skripts in einer Zeile wiedergeben. Nichts weiter tun.

## Ausgang des Skripts

- Exit 0: gelungen, die Ausgabe nennt den Stand (`Sparmodus: AN` oder `Sparmodus: AUS`).
- Exit 2: unbekanntes oder fehlendes Argument. Die Hilfe nennt den unveränderten Stand. Den Besitzer fragen, welches Argument gemeint war.
- Exit 1: Speichern fehlgeschlagen, der Stand bleibt unverändert. Das Skript schreibt eine kleine Datei in den Zustandsordner von luxe-codex ausserhalb des Arbeitsordners. Verweigert die Sandbox das, die Freigabe erbitten und nichts umgehen.

## Wirkung

- AN: ab der nächsten Eingabe kommt eine kurze Erinnerung, bei jedem neuen Sitzungsstart der volle Stil-Text.
- AUS: keine Erinnerung mehr. Was beim Start dieser Sitzung schon im Kontext steht, bleibt bis zur nächsten Sitzung.
