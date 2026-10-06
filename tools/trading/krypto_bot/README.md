# KI-Krypto-Bot

Handelt Bitcoin automatisch über **Alpaca** oder **Binance**. Standard ist immer Spielgeld (Alpaca-Papierkonto bzw.
Binance-Testnetz), Krypto handelt rund um die Uhr. Reines Python 3.9+, keine Zusatzpakete. Keine Anlageberatung.

## Was der Test zeigt (ehrlich)

`python3 tools/trading/krypto_bot/analyse.py` prüft acht vorab festgelegte Strategien auf zehn grossen Coins.
Bedingungen: Signal am Tagesschluss, Handel am Folgetag, 0,25 % Kosten je Umsatz (Alpaca), Gewichte laufen zwischen den
Handelstagen frei. Entwickelt bis Ende 2021, gezählt wird nur der ungesehene Teil ab 2022. Stand 04.10.2026:

| Strategie | pro Jahr | schlimmster Einbruch | Skill |
|---|---|---|---|
| Bitcoin halten | +13,6 % | −67 % | – |
| **Bitcoin mit Schwankungsziel 40 %** (Standard) | **+13,3 %** | **−53 %** | 78 % |
| Bitcoin, Schwankungsziel + Handelsband | +12,2 % | −52 % | 63 % |
| Trend 200 (alle Coins) | +7,3 % | −48 % | 82 % |
| Alle 10 Coins gleich verteilt | −2,4 % | −74 % | – |
| Momentum-Rotation (Top 3) | −5,0 % | −74 % | 55 % |
| KI-Komitee (Modell des KI-Bots) | +0,4 % | −13 % | 28 % |

- **Keine Strategie schlägt einfaches Bitcoin-Halten.** Das Schwankungsziel kam auf fast dieselbe Rendite mit kleinerem
  Einbruch. In den Boomjahren davor (2015–2021) verdiente es aber viel weniger (+55 % statt +88 % pro Jahr). Es ist eine
  Risikobremse, keine Geldmaschine.
- **Altcoins dazunehmen hat geschadet** (−2,4 % pro Jahr), obwohl nur Coins getestet wurden, die es heute noch gibt.
  Diese Überlebens-Verzerrung schönt alle Zahlen, die echten Ergebnisse wären eher schlechter.
- Keine Timing-Strategie ist klar besser als Zufall: Skill 78 % heisst, 22 % der zeitversetzten Zufallskopien waren besser.
- Gegenprobe: Eine Regel, die den nächsten Tag kennt, erreicht 100 % Skill. Der Test findet echte Vorteile also.

## Regel

Jeden Tag mit den Kursen bis gestern: Schwankung = EWMA der Tagesrenditen (λ 0,94), auf ein Jahr hochgerechnet.
Bitcoin-Anteil = min(100 %, 40 % ÷ Schwankung). Ruhiger Markt: voll investiert. Wilder Markt: weniger.
Andere Strategie wählen: `setx KRYPTO_STRATEGIE "halten"` (immer 100 %) oder `"trend200"`.

## Starten (auf deinem PC)

Wie beim KI-Bot (`tools/trading/ki_bot/README.md`): Alpaca-Papierkonto, `ALPACA_KEY_ID` und `ALPACA_SECRET_KEY` setzen.
In den Alpaca-Einstellungen muss **Krypto-Handel** für das Konto freigeschaltet sein.

```
python tools/trading/krypto_bot/krypto.py --status           # was der Bot heute tun würde
python tools/trading/krypto_bot/krypto.py --lauf --trocken   # Aufträge nur anzeigen
python tools/trading/krypto_bot/krypto.py --lauf             # handeln
```

Einmal pro Tag reicht. `start-auto.bat` im Ordner `ki_bot` startet den Krypto-Bot mit. Bei einer Änderung von 5 Prozentpunkten
oder mehr oder bei einem Auftrag kommt eine Nachricht aufs Handy (Telegram oder ntfy).

## Mit Binance statt Alpaca

1. **Erst Spielgeld:** auf [testnet.binance.vision](https://testnet.binance.vision) mit GitHub anmelden →
   „Generate HMAC_SHA256 Key“. Das Testkonto hat Spielgeld in USDT und BTC.
2. Am PC einstellen (Eingabeaufforderung, dann neues Fenster öffnen):
   ```
   setx KRYPTO_BROKER "binance"
   setx BINANCE_API_KEY "dein-key"
   setx BINANCE_API_SECRET "dein-secret"
   ```
3. Testen: `python tools/trading/krypto_bot/krypto.py --lauf --trocken`, dann ohne `--trocken`.
4. **Echtes Geld** (erst nach Monaten mit Spielgeld): Auf binance.com unter API-Verwaltung einen **neuen** Schlüssel anlegen,
   nur „Spot-Handel aktivieren“ ankreuzen, **keine Auszahlungen, kein Margin, keine Futures**, und den Zugriff auf deine
   IP-Adresse beschränken. Dann `setx BINANCE_TESTNET "false"` und `setx KI_BOT_ECHTGELD "JA, MIT ECHTEM GELD"`.
   Der Bot prüft die Rechte des Schlüssels vor jedem Lauf und **handelt nicht**, wenn Auszahlungen, Margin oder Futures
   erlaubt sind.

Gehandelt wird BTC gegen USDT (`KRYPTO_QUOTE` ändert die Gegenwährung, z. B. `USDC`), nur Marktaufträge, nur Spot.
Binance-Gebühr 0,1 % je Handel (der Test rechnet vorsichtig mit 0,25 %). Meldet der Bot **HTTP 451**, sperrt Binance dein
Land oder Netz. Krypto-Guthaben bei einer Börse sind nicht durch eine Einlagensicherung geschützt: nur so viel dort lassen,
wie der Bot braucht.

**Sicherungen** (gemeinsam mit dem KI-Bot): Papier ist Standard. Echtes Geld nur, wenn `ALPACA_PAPER=false` **und**
`KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD"` gesetzt sind. Höchstens `KI_BOT_ANTEIL` (Standard 0.5) des Kontos, je Auftrag
höchstens `KI_BOT_MAX_AUFTRAG` USD (Standard 1000), grössere Umschichtungen über mehrere Tage, kein Hebel, kein
Leerverkauf. **Not-Aus:** `stop.bat` im Ordner `ki_bot`. Protokoll ohne Schlüssel: `data/ki-bot-broker.json`.

## Prüfen

```
python3 tools/trading/krypto_bot/test_krypto.py   # 15 Tests, inkl. nachgebautem Alpaca-Server
python3 tools/trading/krypto_bot/test_binance.py  # 18 Tests, inkl. nachgebautem Binance-Server mit Signaturprüfung
```
