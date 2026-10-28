---
name: shop-puls
description: Zeigt den Shop-Puls von LuxeStyle nur lesend (Bestellungen, Umsatz und Katalog der letzten Tage, ohne Nachricht aufs Handy). Verwenden bei «Shop-Puls», «wie läuft der Shop» oder «Bestellungen und Umsatz». Nicht für den Git-Stand (dafür stand) und nicht für einzelne Bestellungen oder Produkte.
---

# Shop-Puls

Bestellungen, Umsatz und Katalog-Kennzahlen des Shops LuxeStyle (24 Stunden, 7 und 30 Tage). Am Shop wird nur gelesen: nichts ändern, nichts bestellen, nichts verschicken.

## Ablauf

1. Im Hauptordner des Repos (dort liegt `automation/`; `git rev-parse --show-toplevel` nennt den Ordner) ausführen:

   ```
   env -u TELEGRAM_BOT_TOKEN -u TELEGRAM_CHAT_ID /opt/node22/bin/node automation/autopilot/shop_pulse.mjs
   ```

   `env -u …` ENTFERNT die Telegram-Zugänge. Ohne das schickt das Skript den Bericht ungefragt aufs Handy des Besitzers. Diesen Teil nie weglassen und die beiden Variablen nie selbst setzen.
2. Die Zahlen so wiedergeben, wie das Skript sie nennt (Bestellungen 24h / 7T / 30T, Umsatz in CHF, aktive Produkte, neue Produkte heute), ohne Schönfärben und ohne Hochrechnen. Eine lange Ausgabe auf etwa 3000 Zeichen kürzen und sagen, dass gekürzt wurde.

Der Lauf dauert bis zu zwei Minuten und braucht Netz und den Shopify-Zugang in der Umgebung.

## Nebenwirkungen, ehrlich nennen

- Das Skript überschreibt die versionierte Datei `automation/autopilot/SHOP-PULSE.md` mit dem Bericht. Das ist kein Eingriff in den Shop, aber `git status` zeigt die Datei danach als geändert: in der Antwort kurz erwähnen und sie nicht mit einchecken.
- Ist `GEMINI_API_KEY` gesetzt, holt das Skript eine Kurz-Empfehlung bei Gemini; gesendet werden nur die Zahlen, keine Kundendaten.

## Wenn es nicht klappt

- Exit ungleich 0 oder nicht gelaufen (Start fehlgeschlagen, Zeitlimit): «Exit N» oder «konnte nicht laufen» nennen, dazu den Fehlertext (stderr, höchstens etwa 1500 Zeichen). Kein Ersatz-Bericht aus dem Gedächtnis.
- «Keine Shopify-Creds → No-Op.» (Exit 0) heisst: es wurde NICHTS gemessen. Das ist kein Ergebnis und nie «0 Bestellungen». Codex entfernt vermutlich Umgebungsvariablen mit KEY, TOKEN oder SECRET im Namen aus Shell-Befehlen (laut Binärdatei die Vorgabe, im Lauf nicht bestätigt); der Besitzer müsste sie in der Codex-Konfiguration (`shell_environment_policy`) freigeben. Zugangsdaten nie selbst suchen oder eintragen.
- Netzfehler («fetch failed», «ENOTFOUND») bedeuten meist, dass die Sandbox das Netz sperrt: die Freigabe erbitten und nichts umgehen.
- Läuft das Skript durch und gibt nichts aus, genau das sagen. «0 Bestellungen (24h)» ist dagegen ein echtes Ergebnis, wenn der Bericht es so nennt.
