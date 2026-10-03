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

## Vollautomatisch über Alpaca (Start in 10 Minuten)

1. **Konto:** gratis auf alpaca.markets registrieren. Ein Papierkonto (Spielgeld, 100'000 USD) ist sofort da, ohne
   Einzahlung. Die **Alpaca-App** (iPhone/Android) zeigt dir jeden Auftrag des Bots live.
2. **Schlüssel:** im Alpaca-Dashboard links „Paper“ wählen → „API Keys“ → „Generate“. Beide Werte kopieren.
3. **Python** installieren (python.org, Häkchen „Add to PATH“) und den Ordner `tools/trading/` auf den PC kopieren.
4. **Einstellen** (Eingabeaufforderung, einmalig, dann Fenster neu öffnen):
   ```
   setx ALPACA_KEY_ID "dein-key"
   setx ALPACA_SECRET_KEY "dein-secret"
   setx KI_BOT_NTFY "dein-langes-zufalls-thema"   (optional: jedes Signal aufs Handy, siehe ntfy unten)
   ```
5. **Trocken testen:** `python tools/trading/ki_bot/bot.py --lauf --broker alpaca --trocken` zeigt die Aufträge, sendet nichts.
6. **Starten:** Doppelklick auf `start-auto.bat`. Er macht den Selbsttest, schichtet einmal am Tag das Depot um
   (Strategie „Ausgleich“) und handelt tagsüber nur Signale mit Gütesiegel als Bracket-Auftrag (Stop + Ziel). 20 Minuten
   vor US-Börsenschluss stellt er alles glatt. Fenster schliessen = Bot aus.
7. **Not-Aus:** Doppelklick auf `stop.bat`. Danach gehen keine neuen Aufträge mehr raus. Mit `weiter.bat` wieder freigeben.
8. **Automatisch jeden Tag:** Windows-Aufgabenplanung → „Einfache Aufgabe erstellen“ → täglich 15:00 (US-Börse öffnet
   15:30 Schweizer Zeit) → Programm `start-auto.bat`.

Läuft er mindestens **3 Monate** im Papierkonto, vergleiche mit `python tools/trading/ki_bot/signale.py --rueckblick`
und mit einfachem Halten. Erst dann über echtes Geld nachdenken. Ein automatischer Lauf auf GitHub ist bewusst
**nicht** eingerichtet: Einen Bot mit Broker-Schlüsseln lässt man nur auf dem eigenen Rechner und bewusst laufen.
Hinweis: Hat kein Markt das Gütesiegel, handelt der Daytrading-Teil nicht. Das ist Absicht, kein Fehler.

**Sicherungen:** Papier ist Standard. Echtes Geld nur, wenn `ALPACA_PAPER=false` **und**
`KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD"` gesetzt sind. Höchstens `KI_BOT_ANTEIL` (Standard 0.5) des Kontos investiert, jeder
Auftrag höchstens `KI_BOT_MAX_AUFTRAG` USD (Standard 1000), kein Leerverkauf, kein Margin. **Not-Aus:** `KI_BOT_STOP=1`
oder eine leere Datei `STOP` in diesem Ordner. Protokoll ohne Schlüssel: `data/ki-bot-broker.json`.
Strategie für Tages-Aufträge: `KI_BOT_STRATEGIE` = `Ausgleich` (Standard), `KI-Bot` oder `Trendfilter 200`.

## Gratis-Werkzeuge rund um den Bot

| Werkzeug | Kostet | Wofür |
|---|---|---|
| **ntfy** (App für iPhone/Android, ntfy.sh) | gratis, kein Konto | Signale und Lagebericht aufs Handy, ohne Telegram-Bot einzurichten |
| **Alpaca-Papierkonto** + Alpaca-App | gratis | Bot handelt mit Spielgeld, du siehst jeden Auftrag live in der App |
| **Alpaca MCP-Server** (offiziell, github.com/alpacahq/alpaca-mcp-server) | gratis | Dein Claude auf dem PC sieht Depot, Kurse und Aufträge und kann im Chat Aufträge geben |
| **Yahoo Finance** | gratis, ohne Schlüssel | Tageskurse, VIX, US-Zinsen (nutzt der Bot schon) |

**ntfy einrichten (2 Minuten):** App „ntfy“ installieren → „+“ → ein langes, zufälliges Thema ausdenken (z. B.
`kibot-7f3k9q2xw`) und abonnieren → am PC `setx KI_BOT_NTFY "kibot-7f3k9q2xw"`. Test:
`python tools/trading/ki_bot/signale.py --test-push`. Achtung: Wer den Themennamen kennt, kann mitlesen. Darum lang und zufällig.

**Alpaca MCP für Claude Desktop** (Einstellungen → Developer → Edit Config, braucht `uv` von astral.sh):
```json
{"mcpServers": {"alpaca": {"command": "uvx", "args": ["alpaca-mcp-server"],
  "env": {"ALPACA_API_KEY": "dein-key", "ALPACA_SECRET_KEY": "dein-secret", "ALPACA_PAPER_TRADE": "true"}}}}
```
Für Claude Code: `claude mcp add alpaca --scope user --transport stdio uvx alpaca-mcp-server --env ALPACA_API_KEY=... --env ALPACA_SECRET_KEY=... --env ALPACA_PAPER_TRADE=true`.
Danach im Chat z. B.: „Zeig mein Alpaca-Depot und die Aufträge des KI-Bots von heute.“ `ALPACA_PAPER_TRADE` auf `true` lassen:
Ein Sprachmodell, das per Chat mit echtem Geld handelt, ist genau das, wovor die Seite `ki-trading-bot.html` warnt.

**Helfen Gratis-Zusatzdaten?** `python3 tools/trading/ki_bot/zusatzdaten.py` testet vorab festgelegte Regeln mit VIX
und Zinskurve auf dem S&P 500 (Signal am Folgetag, 0.1 % Kosten, Test 2013–2026 ungesehen). Stand 03.10.2026:

| Regel | pro Jahr | schlimmster Einbruch | Skill |
|---|---|---|---|
| Kaufen und Halten | +13.1 % | −30 % | – |
| VIX unter 30 | +9.5 % | −32 % | 18 % |
| VIX unter 50-Tage-Ø | +4.3 % | −26 % | 76 % |
| Zinskurve positiv | +10.6 % | −25 % | 56 % |
| VIX unter 30 + Kurs über 200-Tage-Ø | +7.8 % | −22 % | 57 % |

Keine Regel schlägt Halten, keine ist klar besser als Zufall (Gegenprobe „kennt morgen“: 100 %). Wer bei hohem VIX
aussteigt, verpasst die stärksten Erholungstage. Darum kommen diese Daten **nicht** in den Bot.

## Prüfen

```
python3 tools/trading/ki_bot/test_ki_bot.py   # 39 Tests, inkl. nachgebautem Alpaca-Server
python3 tools/trading/ki_bot/bot.py --pruefen  # Gegenproben: Wahrsager ~100 %, Zufallsmarkt nicht extrem
```
