# KI-Bot-Trader

Drei Teile, alle ohne Zusatzpakete (reines Python 3.9+):

| Teil | Datei | Läuft wo | Was er tut |
|---|---|---|---|
| **Tages-Depot** | `bot.py --lauf` | auf deinem PC, 1×/Tag (Aufgabenplanung) | drei Strategien handeln mit je 10'000 Spielgeld, unveränderliches Logbuch `data/ki-bot.json` |
| **Daytrading-Signale** (Plus500) | `signale.py` | auf deinem PC während der Handelszeiten | Signal mit Einstieg, Stop und Grösse per Telegram aufs Handy — **du** klickst bei Plus500 |
| **Auto-Handel** (Broker mit Schnittstelle) | `--broker alpaca` | auf deinem PC | Aufträge an Alpaca, **Standard: Papierkonto** |

Plus500 bietet für CFD-Konten weder eine Schnittstelle (API) noch MetaTrader. Ein Bot kann dort nicht selbst handeln,
und die Webseite per Skript fernzusteuern verstösst gegen die Nutzungsbedingungen. Darum: Signale aufs Handy für Plus500,
echter Auto-Handel nur über einen Broker mit Schnittstelle.

## Was die Messungen zeigen (ehrlich)

`python3 tools/trading/ki_bot/bot.py --backtest` — Ergebnisse in `data/ki-bot-backtest.json`.

- Der **KI-Bot** (Komitee aus 18 Experten, lernender Gewichter, Online-Logit, Risikosteuerung) senkt die schlimmsten
  Einbrüche stark (S&P 500 −14 % statt −57 %, Bitcoin −22 % statt −83 %), verdient aber deutlich weniger als Halten.
  Das Lernen bringt im Test **keinen** Vorteil gegenüber einem Komitee ohne Lernen; je stärker er lernt, desto schlechter.
- Über alle Märkte in einem Depot gewinnt die einfachste Strategie: **gleich verteilt halten und monatlich ausgleichen**
  (2004–heute ohne Bitcoin: +8,1 % pro Jahr, Sharpe 0,65; KI-Bot: +0,8 %, Sharpe 0,29). Darum ist „Ausgleich“ die
  Standard-Strategie für echte Aufträge.
- **Daytrading:** Im Test auf zwei Jahren Stundenkerzen (`reports/DAYTRADING.md`) lagen die meisten Märkte nach Kosten im
  Minus. Der Signal-Bot schickt deshalb nur Signale mit **Gütesiegel** (letzte 240 ungesehene Tage nach Kosten im Plus
  und nicht durch Münzwurf erklärbar). Beim Start (Oktober 2026) hatte **kein** Markt das Siegel — er meldet dann ehrlich
  „heute kein Signal“.
- Laut ESMA verlieren 74–89 % der Privatkonten mit CFDs Geld. Keine Anlageberatung.

## Tages-Depot auf deinem PC

Einmal pro Tag (z. B. Aufgabenplanung um 07:00): `python tools/trading/ki_bot/bot.py --lauf` — zuerst läuft der Selbsttest,
schlägt er fehl, wird nichts geschrieben. Ein zweiter Lauf am selben Tag ändert nichts.

## Daytrading-Signale für Plus500 auf deinem PC

1. **Python** installieren (python.org, Häkchen „Add to PATH“).
2. Den Ordner `tools/trading/` aus dem Repo auf den PC kopieren (braucht `lern_bot.py`, `daytrading.py`, `stil_labor.py`
   und `ki_bot/`).
3. **Telegram-Bot** anlegen: in Telegram `@BotFather` → `/newbot` → Token kopieren. Deinem Bot eine Nachricht schreiben,
   dann `https://api.telegram.org/bot<TOKEN>/getUpdates` im Browser öffnen und die `chat` → `id` ablesen.
4. Einstellungen (Windows-Eingabeaufforderung, einmalig):
   ```
   setx TELEGRAM_BOT_TOKEN "dein-token"
   setx TELEGRAM_CHAT_ID "deine-chat-id"
   setx KI_BOT_KONTO "1000"
   setx KI_BOT_WAEHRUNG "CHF"
   setx KI_BOT_RISIKO "1"
   ```
   Neues Fenster öffnen, dann testen: `python tools/trading/ki_bot/signale.py --test-push`
5. **Starten:** `python tools/trading/ki_bot/signale.py --dauer --minuten 15` (läuft, bis du das Fenster schliesst),
   oder in der Windows-Aufgabenplanung alle 15 Minuten `python ...\signale.py --einmal`.
6. **Signal umsetzen bei Plus500:** Markt öffnen → Kaufen/Verkaufen wie im Signal → Menge = „Einheiten“ aus dem Signal →
   „Stop Loss“ auf den Stop-Kurs setzen → spätestens zum Tagesschluss schliessen. Das Gütesiegel gilt für „halten bis
   Tagesschluss“; der Stop ist deine Notbremse.
7. **Bilanz:** `python tools/trading/ki_bot/signale.py --rueckblick` — gesendete Signale und Schattenbuch (Signale ohne
   Siegel, nur mitgebucht) mit echtem Ausgang.

## Auto-Handel über Alpaca (Papierkonto)

1. Gratis-Konto auf alpaca.markets, „Paper Trading“ wählen, API-Schlüssel erzeugen.
2. `setx ALPACA_KEY_ID "..."` und `setx ALPACA_SECRET_KEY "..."`.
   Ein automatischer Lauf auf GitHub ist bewusst **nicht** eingerichtet: Wer einen Bot mit Broker-Schlüsseln unbeaufsichtigt
   laufen lässt, soll das selbst und bewusst tun.
3. Zuerst trocken: `python tools/trading/ki_bot/bot.py --lauf --broker alpaca --trocken`
4. Daytrading automatisch: `python tools/trading/ki_bot/signale.py --dauer --broker alpaca` — nur Signale mit Gütesiegel,
   nur Kauf-Signale, als Bracket-Auftrag (Stop + Ziel), 20 Minuten vor US-Börsenschluss wird glattgestellt.

**Sicherungen:** Papier ist Standard. Echtes Geld nur, wenn `ALPACA_PAPER=false` **und**
`KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD"` gesetzt sind. Höchstens `KI_BOT_ANTEIL` (Standard 0.5) des Kontos investiert, jeder
Auftrag höchstens `KI_BOT_MAX_AUFTRAG` USD (Standard 1000), kein Leerverkauf, kein Margin. **Not-Aus:** `KI_BOT_STOP=1`
oder eine leere Datei `STOP` in diesem Ordner. Protokoll ohne Schlüssel: `data/ki-bot-broker.json`.
Strategie für Tages-Aufträge: `KI_BOT_STRATEGIE` = `Ausgleich` (Standard), `KI-Bot` oder `Trendfilter 200`.

## Prüfen

```
python3 tools/trading/ki_bot/test_ki_bot.py   # 37 Tests, inkl. nachgebautem Alpaca-Server
python3 tools/trading/ki_bot/bot.py --pruefen  # Gegenproben: Wahrsager ~100 %, Zufallsmarkt nicht extrem
```
