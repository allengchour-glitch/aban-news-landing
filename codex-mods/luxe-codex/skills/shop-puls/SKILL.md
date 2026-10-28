---
name: shop-puls
description: Zeigt den Shop-Puls von LuxeStyle nur lesend (Bestellungen, Umsatz und Katalog der letzten Tage, ohne Nachricht aufs Handy). Verwenden bei «Shop-Puls», «wie läuft der Shop» oder «Bestellungen und Umsatz». Nicht für den Git-Stand (dafür stand) und nicht für einzelne Bestellungen oder Produkte.
---

# Shop-Puls

Bestellungen, Umsatz und Katalog-Kennzahlen des Shops LuxeStyle (24 Stunden, 7 und 30 Tage). Am Shop wird nur gelesen: nichts ändern, nichts bestellen, nichts verschicken.

## Ablauf

1. Im Hauptordner des Repos (dort liegt `automation/`; `git rev-parse --show-toplevel` nennt den Ordner) ausführen:

   ```
   env -u TELEGRAM_BOT_TOKEN -u TELEGRAM_CHAT_ID node automation/autopilot/shop_pulse.mjs
   ```

   `env -u …` ENTFERNT die Telegram-Zugänge. Ohne das schickt das Skript den Bericht ungefragt aufs Handy des Besitzers. Diesen Teil nie weglassen und die beiden Variablen nie selbst setzen. Fehlt `node` im Pfad, `/opt/node22/bin/node` nehmen.
2. Die Zahlen so wiedergeben, wie das Skript sie nennt (Bestellungen 24h / 7T / 30T, Umsatz in CHF, aktive Produkte, neue Produkte heute), ohne Schönfärben und ohne Hochrechnen. Eine lange Ausgabe auf etwa 3000 Zeichen kürzen und sagen, dass gekürzt wurde.

Der Lauf dauert bis zu zwei Minuten und braucht Netz und den Shopify-Zugang in der Umgebung.

## Nebenwirkungen, ehrlich nennen

- Das Skript überschreibt die versionierte Datei `automation/autopilot/SHOP-PULSE.md` mit dem Bericht. Das ist kein Eingriff in den Shop, aber `git status` zeigt die Datei danach als geändert: in der Antwort kurz erwähnen und sie nicht mit einchecken.
- Ist `GEMINI_API_KEY` gesetzt, holt das Skript eine Kurz-Empfehlung bei Gemini; gesendet werden nur die Zahlen, keine Kundendaten.

## Wenn es nicht klappt

- Exit ungleich 0 oder nicht gelaufen (Start fehlgeschlagen, Zeitlimit): «Exit N» oder «konnte nicht laufen» nennen, dazu den Fehlertext (stderr, höchstens etwa 1500 Zeichen). Kein Ersatz-Bericht aus dem Gedächtnis.
- «Keine Shopify-Creds → No-Op.» (Exit 0) heisst: es wurde NICHTS gemessen. Das ist kein Ergebnis und nie «0 Bestellungen». Codex entfernt vermutlich Umgebungsvariablen mit KEY, TOKEN oder SECRET im Namen aus Shell-Befehlen (laut Binärdatei die Vorgabe, im Lauf nicht bestätigt); der Besitzer müsste sie in der Codex-Konfiguration (`shell_environment_policy`) freigeben. Zugangsdaten nie selbst suchen oder eintragen.
- Netzfehler («fetch failed», «ENOTFOUND») bedeuten meist, dass die Sandbox das Netz sperrt: die Freigabe erbitten und nichts umgehen.
- Läuft das Skript durch und gibt nichts aus, genau das sagen.
- Eine Null bei den Bestellungen ist nicht immer ein Ergebnis: das Skript wertet Fehlermeldungen von Shopify nicht aus. Lehnt Shopify die Bestellabfrage ab (zum Beispiel weil die Berechtigung `read_orders` fehlt) oder ist der Token ungültig, steht trotzdem «Bestellungen: 0 (24h) · 0 (7T) · 0 (30T)» und «Umsatz: 0.00 …». Das ist mit nachgebautem Shopify gemessen (`test/befehle_test.mjs`), nicht an einem echten Fehler.
  - Steht in der Katalogzeile «–» statt Zahlen («Katalog: – aktiv · +– heute neu»), wurde der Zugang abgelehnt: dann wurde NICHTS gemessen, wie bei «Keine Shopify-Creds».
  - Ist mindestens eine der drei Bestellzahlen grösser als 0, hat die Abfrage funktioniert, und die Nullen daneben sind echt.
  - Sind alle drei 0 und die Katalogzeile hat Zahlen, nur sagen: «Das Skript meldet 0 Bestellungen. Ob das stimmt oder die Berechtigung zum Lesen der Bestellungen fehlt, ist aus der Ausgabe nicht zu erkennen; die Bestellliste im Shopify-Admin zeigt es.» Nie «keine Bestellungen» als Tatsache melden.
