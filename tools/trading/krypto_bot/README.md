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

## 🛩️ Krypto-Pilot (Bitcoin + Ethereum Futures)

`pilot.py` handelt die einzige Regel, die alle Prüfungen überstanden hat, auf **Bitcoin und Ethereum je zur Hälfte**
(`KRYPTO_PILOT_MAERKTE=BTC` = nur Bitcoin; eine noch offene Position im abgewählten Markt schliesst der nächste Lauf):
- **Richtung:** über dem Trend-Schnitt long, darunter short (`KRYPTO_SHORT=0` = nur long).
  **Bitcoin 150 Tage, Ethereum 200 Tage** (siehe Prüfstand unten).
- **Grösse:** Schwankungsziel 40 % pro Jahr, also bei wildem Markt automatisch kleiner. Höchstens `KRYPTO_MAX_HEBEL`
  (Standard 1×, hart gedeckelt auf 2×).
- **Stop an der Börse:** 3 Tages-Schwankungen unter bzw. über dem Kurs (bis 11.10.2026: 4), auf den Markpreis, nach
  jedem Lauf neu gesetzt.
- **Lügendetektor:** misst täglich, ob die Regel in den letzten 2 Jahren besser war als Zufall, und meldet es aufs Handy.
  Er handelt bewusst **nicht**: Als Abschalter getestet, kostete er ab 2022 über 20 Prozentpunkte Rendite pro Jahr.
- **MVRV-Bremse:** kein Short, solange der Kurs unter dem Einstandswert aller Coins liegt (MVRV < 1, CoinMetrics). Die
  einzige von 13 freien Markt-Infos, die den Test bestand (siehe «Alle Infos» unten).
- **Lagebild:** Angst & Gier, Funding, MVRV, VIX und US-Zins stehen bei jedem Lauf dabei — nur zur Information.
- **Wochenbericht:** einmal pro Woche kommt der Kontostand aufs Handy (seit Start, seit Vorwoche, Abstand zum Höchststand).
  Jederzeit: `pilot.py --bericht`.

`pilot.py --backtest` (Futures-Modell mit Gebühren, Funding für Longs, Stop 3σ mit 0,1 % Schlupf, Liquidation; BTC und ETH
jeden Tag neu 50/50 aus dem Gesamtkonto aufgeteilt — wie live; Stand 11.10.2026):

| ab | Variante | pro Jahr | schlimmster Einbruch | Rendite ÷ Einbruch |
|---|---|---|---|---|
| 2019 | **+ MVRV-Bremse (live)** | **+37,4 %** | **−29 %** | **1,30** |
| 2019 | BTC 150 + ETH 200 | +29,5 % | −35 % | 0,84 |
| 2019 | nur BTC 150 | +27,0 % | −44 % | 0,62 |
| 2019 | nur BTC 200 (bisher) | +13,2 % | −65 % | 0,20 |
| 2019 | Bitcoin halten (Spot) | **+48,9 %** | −77 % | 0,64 |
| 2022 | **+ MVRV-Bremse (live)** | **+28,1 %** | **−26 %** | **1,07** |
| 2022 | BTC 150 + ETH 200 | +22,8 % | −26 % | 0,87 |
| 2022 | nur BTC 150 | +25,8 % | −41 % | 0,63 |
| 2022 | nur BTC 200 (bisher) | +27,2 % | −49 % | 0,55 |
| 2022 | Bitcoin halten (Spot) | +13,0 % | −67 % | 0,19 |

**Ehrlich: Seit 2019 verdiente einfaches Bitcoin-Halten mehr** (+48,9 % statt +37,4 % pro Jahr) — mit einem Einbruch von
−77 % statt −29 %. Der Pilot ist ein Risiko-Werkzeug; er gewann vor allem in den Baissen (ab 2022 +28,1 % gegen +13,0 %).

Seit 11.10.2026 rechnen alle Backtests strenger: **Shorts bekommen kein Funding gutgeschrieben** (vorher ja — echtes Funding
ist zeitweise negativ, dann zahlen Shorts), und **«Halten» ist Bitcoin auf Spot** ohne Funding. Vorher stand dort ein
Long-Future 1× mit Funding (ab 2019 +34,7 %) — das machte Halten schlechter, als es ist. Der Pilot fiel dadurch ab 2019 von
+38,4 % auf +36,0 % (mit Stop 4σ); der Wechsel auf 3σ (unten) brachte +37,4 %.

Bis 08.10.2026 rechneten alle Backtests BTC und ETH als zwei getrennte Töpfe, die nie ausgeglichen werden (ab 2019:
+36,3 %, −35 %). Live bemisst der Pilot aber jede Position aus dem ganzen Konto — das ist eine tägliche Neuaufteilung.
Seither rechnen Backtest, Prüfstände und Cockpit-Kurve so (Näherung über die Tagesrenditen); die Urteile blieben gleich.

**Prüfstand** (`pilot_pruefung.py`, Regel vorab festgelegt: ein Standardwert ändert sich nur, wenn die Alternative in
**allen** Zeiträumen ein besseres Verhältnis Rendite ÷ Einbruch hat):
- **Trendlänge Bitcoin 150 statt 200:** auf drei getrennten Abschnitten jedes Mal besser (2015–18: 2,74 vs. 2,49;
  2018–22: 0,69 vs. −0,06; 2022–heute: 0,62 vs. 0,58). Bei **Ethereum** war 200 in beiden Abschnitten besser → bleibt 200.
- **Ethereum dazu:** in beiden Zeiträumen kleinerer Einbruch (ab 2019 −54 statt −66 %, ab 2022 −30 statt −44 %).
- **Stop 3σ statt 4σ (seit 11.10.2026):** Die frühere Prüfung lief nur auf der alten Einzel-Regel (BTC 200 allein) und
  ergab «4σ bleibt». Auf der **Live-Konfiguration** (BTC 150 + ETH 200 + MVRV-Bremse, täglich neu aufgeteilt) war 3σ in
  allen drei Feldern besser: ab 2019 1,30 statt 1,03, 2019–2021 2,01 statt 1,60, 2022–heute 1,07 statt 1,00.
  Der Nachbarwert 3,5σ war ebenfalls überall besser als 4σ (1,19 / 1,99 / 1,07) — 3σ ist also kein einzelner Glückstreffer.
  Ehrlich: Ab 2022 ist der Vorsprung klein, und **ohne Stop** war es dort sogar am besten (1,12) — der Stop half vor allem
  im Crash vom März 2020. Ein Prüfer hatte 3σ auf denselben Daten schon gesehen, bevor die Prüfung lief; eine unabhängige
  Bestätigung ist das nicht. Der engere Stop löst öfter aus (seit 2019 84-mal statt 36-mal, jedes Mal mit Gebühr und
  0,1 % Schlupf — eingerechnet).
- **Schwankungsziel 40 % bleibt** (auch auf der Live-Konfiguration): 30 % war ab 2022 schlechter (0,79 statt 1,07),
  50 % überall schlechter.
- Ehrlich: Die Trendlänge wurde aus 5 Kandidaten gewählt. Diese Auswahl schönt die Zahlen etwas, getrennte Abschnitte
  mildern das nur. In der Hausse 2019–2021 verdiente einfaches Halten mehr, der Pilot gewinnt vor allem in Baissen.

**Alle Infos** (`info_pruefung.py`, Regel vorab festgelegt): 13 freie Markt-Infos als Filter auf die Pilot-Position.
Übernommen wird eine Info nur, wenn sie in **allen vier Feldern** (Bitcoin und Ethereum × 2018–2021 und 2022–heute) ein
besseres Rendite ÷ Einbruch bringt **und** mindestens 90 % von 200 zeitversetzten Kopien derselben Info schlägt
(sonst ist der «Vorteil» nur weniger Risiko, das jede beliebige Bremse auch gebracht hätte). Stand 11.10.2026:

| Info (Quelle) | Regel | Felder besser | Zufallsprobe | Urteil |
|---|---|---|---|---|
| **MVRV tief** (CoinMetrics) | MVRV < 1 → kein Short | **4 von 4** | **94 %** | **übernommen** |
| Funding negativ (BitMEX/OKX) | Funding 7 T. < 0 → kein Short | 2 von 4 | 100 % | nein, ab 2022 schlechter |
| Dollar (FRED, wöchentlich → 7 Tage Verzug) | Dollar über 200-T.-Schnitt → Long halb | 2 von 4 | 100 % | nein, 2018–2021 schlechter |
| Alle zusammen (Abstimmung) | ≥ 3 Long- bzw. ≥ 2 Short-Bremsen | 2 von 4 | 98 % | nein, ab 2022 schlechter |
| Angst & Gier (alternative.me) | ≤ 20 → kein Short | 3 von 4 | 84 % | nein |
| Angst & Gier | ≥ 80 → Long halb | 1 von 4 | 68 % | nein |
| VIX (FRED) | > 30 → Long halb | 1 von 4 | 72 % | nein |
| Hashrate (CoinMetrics) | 30 T. unter 60 T. → kein Short | 2 von 2 (nur BTC) | 80 % | nein |
| Funding hoch, MVRV hoch, US-Zins, Notenbank-Bilanz, Stablecoins | Long halb | 0–1 von 4 | 23–91 % | nein |

- Die MVRV-Bremse ist nicht an die Schwelle 1 gebunden: von 0,8 bis 1,2 war sie jedes Mal in allen 4 Feldern besser.
  Sie wirkt nur auf Shorts: Unter dem Einstandswert aller Coins ist der Ausverkauf meist schon weit fortgeschritten.
- **Ehrlich:** 13 Kandidaten getestet. Bei einer 90-%-Schwelle besteht rein zufällig etwa einer die Zufallsprobe —
  94 % liegt knapp darüber. Darum zusätzlich die Bedingung «alle vier Felder besser». Ein Beweis ist das nicht.
- Keine Zukunftsdaten: jede Info zählt erst einen Tag nach ihrem Datum (Notenbank-Bilanz zwei Tage, Dollar-Index sieben —
  FRED veröffentlicht ihn nur wöchentlich), getestet in
  `test_infos.py`. Fehlt MVRV oder ist es älter als 5 Tage, handelt der Pilot nach der Grundregel ohne Bremse.
- Daten: alternative.me, BitMEX + OKX, CoinMetrics Community, FRED, DefiLlama — alle gratis, ohne Konto. Zwischenspeicher
  in `tools/trading/daten/info_*.json`, täglich nachgeladen. `py tools\trading\krypto_bot\infos.py` zeigt das Lagebild.

**Starten (Testnetz):**
1. Auf [testnet.binancefuture.com](https://testnet.binancefuture.com) anmelden, API-Schlüssel erzeugen (Spielgeld in USDT).
   Antwortet die Adresse nicht mehr: `setx BINANCE_FUTURES_URL "https://demo-fapi.binance.com"` (Binance-Demo-Handel).
2. `setx BINANCE_FUTURES_API_KEY "…"` und `setx BINANCE_FUTURES_API_SECRET "…"`, dann **neues Fenster öffnen**
   (`setx` wirkt nur in neuen Fenstern).
3. `py tools\trading\krypto_bot\pilot.py --status`, dann `--lauf --trocken`, dann `--lauf`.
4. Im Futures-Konto muss der **Einweg-Modus** eingestellt sein (kein Hedge-Modus), sonst verweigert der Pilot.
5. **Täglich automatisch:** `krypto-auto.bat` (braucht kein Alpaca) startet Pilot, ETH-Sammler und KI-Trader. Am einfachsten
   im Cockpit mit **🗓️ Täglich automatisch**: Die Aufgabe läuft dann um 02:30 **auch auf Akku**, und war der PC aus oder im
   Ruhezustand, holt Windows den Lauf beim nächsten Start nach. Von Hand (ohne diese beiden Einstellungen) — die inneren
   Anführungszeichen sind nötig, sobald der Pfad ein Leerzeichen enthält (`C:\Users\Max Muster\…`, OneDrive):
   `schtasks /create /sc daily /st 02:30 /tn "Krypto-Pilot" /tr "\"C:\…\tools\trading\krypto_bot\krypto-auto.bat\" auto" /f`.
   Die Tageskerze schliesst um 00:00 UTC (02:00 Sommerzeit), darum kurz danach. Mit «auto» schreibt die Datei alles in
   `data\krypto-auto.log`; scheitert ein Selbsttest oder stürzt ein Bot ab, kommt eine Nachricht aufs Handy und die
   Cockpit-Ampel «Täglicher Lauf» wird rot.

**Echtes Geld** nur mit `BINANCE_FUTURES_TESTNET=false` **und** `KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD"`, nur mit einem
Schlüssel **ohne** Auszahlungsrecht (wird geprüft) und erst nach Monaten im Testnetz. Futures können in deinem Land
eingeschränkt sein. Not-Aus `stop.bat` (oder der rote Cockpit-Knopf, Telegram `/stop`): Der Pilot schliesst dann seine
Positionen und eröffnet keine neuen; danach meldet er je Markt, ob die Position WIRKLICH zu ist. Der Not-Aus hat Vorrang vor
der Pause, braucht keine Kurse von Yahoo (schliessen geht auch, wenn Yahoo ausfällt), schliesst **alle** Märkte — auch einen,
den du inzwischen abgewählt hast — und greift auch mitten in einem laufenden Handel (nichts Neues wird mehr eröffnet).
**Pause** (Cockpit-Schalter «Auto-Handel aus») ist etwas anderes: nichts wird gehandelt — Pilot, ETH-Sammler, Spot-Bot und
Alpaca-Bots —, offene Positionen bleiben mit ihrem Stop stehen. `weiter.bat` hebt beides auf.

**Sicherungen bei Fehlern** (aus einer Code-Prüfung mit nachgebautem Binance-Server, alle getestet):
- Der Börsen-Stop geht über den **Algo-Auftragsdienst** (`POST /fapi/v1/algoOrder`, `algoType=CONDITIONAL`): Seit dem
  09.12.2025 lehnt Binance Stop-Aufträge über den alten Weg `/fapi/v1/order` ab (Fehler −4120) — ohne diese Umstellung
  stünde jede Position ohne Stop. Geprüft gegen das offizielle Binance-SDK; den ersten echten Testnetz-Lauf trotzdem
  im Binance-Konto unter «Offene Aufträge → Bedingt» kontrollieren.
- Ein alter Stop wird nie ersatzlos gelöscht. Lehnt Binance den neuen Stop ab, wird der alte wieder gesetzt; geht beides nicht,
  steht «OHNE Stop» in der Handy-Nachricht.
- Jeder Abbruch (Schlüssel ungültig, Standort gesperrt, Hedge-Modus, falsche Adresse, Netz) ist eine Warnung aufs Handy und
  macht die Cockpit-Ampel rot — nie still.
- Zeitüberschreitung, abgerissene Verbindung oder Binance-Antwort «Unknown error» (HTTP 503 — laut Binance KEIN Fehlschlag):
  Jeder Auftrag hat eine eigene Kennung, der Pilot fragt nach, ob er ausgeführt wurde. Bleibt es unklar, werden die Stops
  nicht gelöscht, und es kommt eine Warnung. Der Stop wird passend zur tatsächlichen Position gesetzt.
- Risiko-Stufe senken bei offener Position: Binance lässt den Hebel dann nicht senken (−4161) — der Pilot handelt trotzdem
  mit der kleineren Grösse weiter, der Börsen-Hebel sinkt, sobald die Position flach ist.
- Das Cockpit liest bei jedem Not-Aus, Knopf und Seitenaufruf die aktuellen Einstellungen (`setx` landet in der
  Windows-Registry): Nach einem Wechsel auf Echtgeld prüft der Not-Aus das richtige Konto und nennt es in jeder Zeile.
- Not-Aus geht auch über die Variable `KI_BOT_STOP=1` (gleiche Wirkung wie die Datei STOP). Zahlen in Einstellungen dürfen
  ein Komma haben (`0,5`, `1'000`).
- Handels-Knöpfe im Cockpit werden nie nach Minuten abgebrochen (ein Abbruch zwischen Auftrag und Stop wäre gefährlich);
  das Lagebild holt der Pilot erst nach den Aufträgen. Lange Läufe halten ihre Sperre frisch.
- Liegt der Kurs schon jenseits des heutigen Stops, eröffnet der Pilot nichts (der Stop würde sofort auslösen).
- Nie zwei Läufe gleichzeitig (Sperre in `data/`), auch nicht Aufgabenplanung + Cockpit-Knopf.
- Eine einzelne Adress-Variable (`BINANCE_FUTURES_URL`, `BINANCE_BASIS_URL`) kann nie auf echtes Geld umschalten.
- ETH-Sammler: jeder Kauf wird sofort gebucht; geht eine Antwort verloren (oder antwortet Binance mit einem Serverfehler),
  wird «unklar» gebucht statt doppelt zu kaufen oder ETH zu staken, die der Bot nicht gekauft hat. Eine klare Ablehnung
  (z. B. zu wenig Guthaben) heisst «nicht gekauft»: Warnung aufs Handy, der nächste Lauf kauft normal weiter.
- Logbücher werden atomar geschrieben (erst Zwischendatei, dann umbenennen); eine beschädigte Datei wird beiseitegelegt
  (`….kaputt-Datum`) statt still überschrieben.

## 🚀 Pilot 2.0 + Funding-Ernte + Mehr-Horizont-Trend (Recherche und Prüfung, 12.10.2026)

Drei Ideen aus der Forschung, jede mit **echten Binance-Fundingraten** (data.binance.vision, alle 8 Stunden seit 2020) und mit
Regeln, die vor dem Rechnen festgelegt wurden.

**1. Funding-Ernte («Cash and Carry», `carry_pruefung.py`, 8 Tests)** — Spot kaufen + gleich viel Perpetual verkaufen,
marktneutral, verdient das Funding (BIS Working Paper 1087 «Crypto carry»). Kapital 1,5× Volumen, 0,15 % je Wechsel:

| Variante | 2020–2021 | ab 2022 | 2025 | schlimmster Einbruch |
|---|---|---|---|---|
| A immer an (BTC+ETH) | +20,6 %/J. | **+4,3 %/J.** | +3,4 % | −0,5 % |
| B mit Filter (Funding 7 T. > 0) | +19,9 %/J. | +3,5 %/J. | +2,8 % | −0,9 % |
| C breit, 8 Coins mit Filter | +19,9 %/J. | +3,0 %/J. | +1,4 % | −0,8 % |

Seit 2022 kaum mehr als ein Zinskonto, aber fast ohne Schwankung → **als Parkplatz für freies Geld** nützlich, nicht als Geldmaschine.
Nicht abgebildet: Spot/Future-Kursdifferenz, Börsenausfall (FTX 2022).

**2. Mehr-Horizont-Trend (`trend_pruefung.py`)** — 4 Zeiträume abstimmen lassen statt eines Schnitts. **Abgelehnt:** ab 2022
+10,8 % (E1) bzw. +18,9 % (E2) gegen +23,0 % beim Pilot, bei grösserem Einbruch.

**3. Pilot 2.0 (`pilot2_pruefung.py`)** — gleiche Signale, klügere Ausführung, echtes Funding:

| Variante | ab 2020 | ab 2022 | ab 2024 |
|---|---|---|---|
| P0 live (alles Futures) | +26,0 % / −30 % | +25,1 % / −26 % | +18,6 % / −26 % |
| P1 Long über Spot | +33,4 % / −29 % | +28,6 % / −24 % | +22,4 % / −24 % |
| **P2 + Parkplatz (Funding-Ernte)** | **+37,5 % / −28 %** | **+29,5 % / −23 %** | **+23,9 % / −23 %** |

P2 ist in **allen** Zeiträumen besser (Rendite ÷ Einbruch). Gegenprobe: ohne Funding sind P1/P2 leicht **schlechter** (höhere
Spot-Gebühr) — der Vorsprung kommt also ganz aus gespartem bzw. kassiertem Funding, nicht aus einem Rechenfehler.
**Belastungstest (`pilot2_robust.py`, 13.10.2026, Regeln vorab festgelegt, alle bestanden):**

| Prüfung | Ergebnis |
|---|---|
| Kosten doppelt (Futures 0,10 %, Spot 0,20 %, Ernte 0,30 %) | P2 +26,6 % / −25 % gegen P0 +24,0 % / −27 % |
| Parkplatz verdient nur die Hälfte | P2 +29,3 % gegen P0 +25,1 % |
| 36 Nachbar-Parameter (Trend, Schwankungsziel) | P2 besser in **36/36**, kleinster Vorsprung +3,4 Pp. |
| 69 Jahresfenster, monatlich verschoben ab 2020 | P2 ≥ P0 in **96 %**; P2 nach 12 Monaten im Minus in **13 %**, schlechtestes −11 %, Median +30 % |
| 5000 Zufallsjahre aus echten Tagesrenditen | Jahr im Minus **17 %**, schlechteste 5 % **−21 %**, Einbruch im Jahr typisch −23 %, schlechteste 5 % **−39 %** |

Heisst: Pilot 2.0 ist robust besser als der Pilot, aber **kein sicheres Geld**. Rechne damit, dass das Konto zwischendurch
um 20–40 % fällt und etwa jedes sechste Jahr im Minus endet.

**Status:** Pilot 2.0 läuft ab 12.10.2026 im Spielgeld-Schattenbuch neben dem Piloten (`tools/trading/schatten/`, echtes Funding
über OKX). Die Live-Ausführung auf dem PC wird erst umgestellt, wenn er dort mindestens 3 Monate nicht schlechter ist.

## 🪙 ETH-Sammler (Sparplan + Staking)

`eth_sammler.py` kauft regelmässig Ethereum für einen festen Betrag und legt ihn auf Binance ins **ETH-Staking**.
Er verkauft nie, nutzt keinen Hebel, gibt nie mehr aus als das freie USDT-Guthaben und stakt nur ETH, die er selbst
gekauft hat (andere ETH im Konto fasst er nicht an).

| Einstellung | Standard | Bedeutung |
|---|---|---|
| `ETH_SPARPLAN_BETRAG` | — | **schaltet den Sparplan ein**: USDT je Kauf (z. B. 50, höchstens `KI_BOT_MAX_AUFTRAG`). Ohne diese Variable kauft er nie — der Spot-Schlüssel allein (z. B. für `krypto.py`) reicht nicht |
| `ETH_SPARPLAN_TAGE` | 7 | Abstand der Käufe in Tagen |
| `ETH_SPARPLAN_MAX` | 5000 | Obergrenze für den gesamten Einsatz, danach kauft er nicht mehr |
| `ETH_STAKEN` | 0 | 1 = gekaufte ETH ins Binance-Staking legen (nur echtes Geld) |

Schlüssel: dieselben **Spot**-Schlüssel wie `krypto.py` (`BINANCE_API_KEY` / `BINANCE_API_SECRET`). Testnetz ist Standard,
dort gibt es **kein Staking**, die ETH bleiben im Spot-Konto. Test- und Echtgeld-Käufe werden getrennt gebucht
(`data/eth-sammler.json`). Täglich starten ist richtig: Er kauft nur, wenn der nächste Termin fällig ist. Echtes Geld:
`BINANCE_TESTNET=false` **und** `KI_BOT_ECHTGELD` (gilt für alle Spot-Bots); `ETH_STAKEN` steuert nur das Staking.
Ein Kauf mit verlorener Antwort wird «unklar» gebucht und aus Ø-Preis und Ergebnis herausgehalten (Cockpit zeigt ihn getrennt).

```
py tools\trading\krypto_bot\eth_sammler.py --status            # Bestand, Ø-Preis, nächster Kauf, Staking-Ertrag
py tools\trading\krypto_bot\eth_sammler.py --lauf --trocken    # zeigen, was er kaufen würde
py tools\trading\krypto_bot\eth_sammler.py --lauf              # fälligen Kauf ausführen
py tools\trading\krypto_bot\eth_sammler.py --backtest          # ehrlicher Sparplan-Test
```

`--backtest` (50 USD pro Woche, Gebühr 0,1 %, **ohne** Staking-Ertrag, Tagesschlusskurse, Stand 07.10.2026):

| Start | eingesetzt | Wert heute | Ergebnis | Ø-Preis | schlimmster Moment |
|---|---|---|---|---|---|
| Jan. 2018 | 22'900 | 105'971 | +363 % | 556 | −75 % (Dez. 2018) |
| Nov. 2021 (damaliges Allzeithoch) | 12'850 | 14'968 | +16,5 % | 2'209 | −65 % (Juni 2022) |
| Jan. 2022 | 12'450 | 14'740 | +18,4 % | 2'174 | −59 % (Juni 2022) |

Ein Sparplan glättet den Einstiegspreis, gegen einen langen Preiszerfall schützt er nicht. Wer am Hoch 2021 begann, lag
an 817 von 1796 Tagen im Minus, zuletzt noch im August 2026.

**Staking, ehrlich:**
- Binance tauscht die gestakten ETH in **WBETH** (Binance-Token, wächst mit dem Ertrag). Der Ertrag schwankt und hängt
  vom Ethereum-Netz ab. `--status` zeigt den echten Ertrag der letzten 30 Tage aus deinem Konto, hochgerechnet aufs Jahr.
- **Zurückholen dauert** (Binance-Warteschlange, je nach Andrang Tage). WBETH kann am Markt kurzzeitig unter dem
  ETH-Wert handeln.
- **Plattform-Risiko:** Gestakte ETH liegen bei Binance, ohne Einlagensicherung. Dazu kommt das Netz-Risiko
  (Strafabzug «Slashing» bei Validator-Fehlern).
- **Steuern Schweiz:** Staking-Erträge gelten in der Regel als steuerbares Einkommen (ESTV-Arbeitspapier
  Kryptowährungen). ETH-Bestand gehört ins Wertschriftenverzeichnis. Im Zweifel beim Steueramt fragen.
- **Echtes Geld:** `BINANCE_TESTNET=false` **und** `KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD"` **und** `ETH_STAKEN=1`.
  Der Schlüssel braucht nur „Spot- und Margin-Handel aktivieren“. Mit Auszahlungs-, Margin-Leihe- oder Futures-Recht
  verweigert der Sammler. Lehnt Binance das Staking ab, bleiben die ETH im Spot-Konto, der nächste Lauf versucht es wieder.

## 🖥️ Cockpit, Claude als Trader, Telegram-Steuerung — wie die YouTube-Bots, aber ehrlich

Was die Bots auf YouTube zeigen, gibt es hier auch: ein Live-Dashboard, eine KI, die jeden Tag entscheidet und begründet,
und Steuerung per Handy. Der Unterschied liegt in den Zahlen:

| YouTube-Bot | Hier |
|---|---|
| «KI hat im Backtest +900 % gemacht» | Für Claude gibt es **keinen** ehrlichen Backtest: Das Modell kennt die Kursgeschichte aus dem Training. Darum läuft Claude ab dem ersten Tag **vorwärts** in einem Schattenkonto gegen den Pilot und gegen Halten — mit Gebühren und Funding. |
| KI handelt echtes Geld | Echtes Geld handelt nur der getestete Pilot. Claude bekommt erst mehr, wenn das Schattenkonto über Monate besser ist. |
| Gewinnkurve ohne Kosten | Jede Kurve rechnet Gebühr 0,05 % je Umschichtung und Funding. |

**Cockpit** (`cockpit.bat` oder `py tools\trading\krypto_bot\cockpit.py`) öffnet `http://127.0.0.1:8765`:
Konto, BTC/ETH mit Richtung, Trend, Stop, MVRV und Bremse, Claudes Einschätzung mit Begründung, die Kurve
«Claude gegen Pilot gegen Halten», der Kontostand, der Backtest seit 2019, das Lagebild, die letzten Aufträge und der
ETH-Sammler. Dazu ein **Not-Aus-Knopf**: Er schliesst die Pilot-Positionen sofort (nur verkleinern), stoppt alle Bots und
meldet je Markt ehrlich «geschlossen», «NICHT geschlossen» oder «unklar».
Das Cockpit liest nur die Logbücher auf deinem PC, lauscht nur auf 127.0.0.1 und lehnt Anfragen fremder Webseiten ab.

**💰 Profit-Anzeige** (ganz oben im Cockpit, alle 15 Sekunden): Gewinn seit Start in USDT und Prozent, dazu Heute,
7 Tage, 30 Tage; aufgeteilt in realisiert, offen, Funding und Gebühren sowie pro Markt; Kurve des abgeschlossenen
Gewinns, Balken pro Tag und die offenen Positionen mit Einstieg, aktuellem Preis, Gewinn und Liquidationspreis.
Die Zahlen kommen direkt vom Binance-Konto (`/fapi/v1/income`, nur lesen). **Ein- und Auszahlungen zählen nicht als
Gewinn.** Weil Binance die Geschichte nur einige Monate herausgibt, speichert `profit.py` jeden Eintrag in
`data/krypto-profit.json` (ohne Schlüssel). Auch per Telegram: `/profit`. Im Terminal: `py tools\trading\krypto_bot\profit.py`.
Ehrlich gerechnet: **Testnetz und Echtgeld haben getrennte Bücher** (Spielgeld-Gewinne erscheinen nie als echter Gewinn).
Gebühren in BNB werden in USDT umgerechnet, Rückvergütungen senken die Gebühren. Der offene Gewinn eines Zeitraums braucht
einen gemerkten Stand an dessen Beginn (der tägliche Lauf merkt ihn vor seinen Aufträgen, das offene Cockpit alle 15 Min.);
fehlt er, steht «*»/«offen ?» und nur der abgeschlossene Teil zählt — statt einer erfundenen Zahl. Die Prozente beziehen sich
auf das eingesetzte Kapital, Ein- und Auszahlungen nach ihrer Verweildauer gewichtet. Binance wird höchstens einmal pro
Minute nach neuen Einträgen gefragt; bremst Binance (HTTP 429/418), pausiert die Anzeige, damit Pilot und Not-Aus nicht
gesperrt werden. Die Kacheln «Konto seit Start/Vorwoche» darunter sind der reine Kontostand — inklusive Ein- und Auszahlungen.
Der ETH-Sammler zeigt zusätzlich seinen Wert und Gewinn zum aktuellen Kurs.

**🎛️ Steuerung im Cockpit** — Knöpfe wie in den Bot-Videos, mit Terminal-Fenster für die Ausgabe:
**Auto-Handel AN/AUS** (aus = die Bots handeln nicht, offene Positionen bleiben mit ihrem Börsen-Stop stehen) ·
**▶ Probelauf** (zeigt, was der Pilot tun würde) · **⚡ Jetzt handeln** · **🤖 Claude fragen** · **🪙 Sparplan** ·
**📨 Bericht aufs Handy** · **🔄 Markt-Infos** · **📊 Backtest** · **🧪 Selbsttest** · **🗓️ Täglich automatisch** (legt die
Windows-Aufgabe «Krypto-Pilot» für 02:30 an — kein schtasks-Befehl mehr von Hand) · **⬇️ Update holen** (`git pull --ff-only`,
danach Cockpit neu starten) · und rot **🛑 Not-Aus** (schliesst
sofort alle Pilot-Positionen und stoppt alles). Darunter die **🩺 Gesundheit**: Schlüssel gesetzt? letzter Lauf frisch? tägliche Aufgabe eingerichtet? Not-Aus? Markt-Infos
aktuell? letzter Lauf mit Aufträgen ohne Warnung? tägliche Datei `krypto-auto.bat` gelaufen? — rot heisst handeln, grau ist optional. Jeder Knopf startet genau das Skript, das man sonst von Hand startet —
im Hintergrund, mit Rückfrage vor Handel und Kosten. «Jetzt handeln» geht nicht, solange Auto-Handel aus ist (der Lauf
würde sonst die Positionen schliessen). Echtes Geld bleibt doppelt gesperrt wie überall. Nur feste Aktionen, kein
beliebiger Befehl, nur von diesem PC aus (127.0.0.1) und nicht von fremden Webseiten: Das Cockpit prüft Herkunft und
Host-Namen (gegen DNS-Rebinding) und lässt sich nicht in fremde Seiten einbetten (gegen Klick-Fallen); auch «Auto-Handel an»
fragt nach. Nicht geschützt ist es gegen Programme oder andere Benutzer **auf demselben PC** — wer dort mitarbeitet, braucht
ein eigenes Windows-Konto ohne Zugriff auf deinen Benutzerordner und sollte das Cockpit nur bei Bedarf starten.

**📈 Live-Markt** (Knopf oben im Cockpit, `http://127.0.0.1:8765/markt`) — die Börsen-Ansicht wie bei Binance:
Live-Kerzen (1 Minute bis 1 Woche) mit Volumen, MA 7/25/99 und Bollinger-Bändern, RSI und MACD darunter (gekoppelt
beim Zoomen), Orderbuch mit Tiefenbalken, Markttiefe-Grafik, letzte Trades und 16 Top-Coins mit 7-Tage-Mini-Chart,
sortierbar nach Gewinnern und Verlierern des Tages. «Bot» blendet Trend-Schnitt, Stop und die Aufträge des Piloten ein.
Die Kurse holt der Browser direkt bei Binance (öffentliche Marktdaten `data-api.binance.vision`, ohne Schlüssel, live
per WebSocket). Die Chart-Bibliothek ist TradingViews «Lightweight Charts» (Apache-2.0, mit Prüfsumme geladen).
Die Indikatoren sind Anzeigen, keine Handelssignale — getestet und handelnd ist nur der Pilot.

**KI-Trader** (`ki_trader.py --lauf`, einmal pro Tag, läuft in `krypto-auto.bat` mit):
1. Schlüssel auf [console.anthropic.com](https://console.anthropic.com) anlegen, `setx ANTHROPIC_API_KEY "…"`, neues Fenster.
2. `py -m pip install anthropic`
3. `py tools\trading\krypto_bot\ki_trader.py --lauf`, später `--stand` für den Vergleich.

Claude (Modell `claude-opus-5-5`, änderbar mit `KI_TRADER_MODELL`) bekommt nur abgeschlossene Tage: Kurse,
Veränderungen, Abstand zu den Trend-Schnitten, Schwankung und das Lagebild. Daraus gibt es pro Coin eine Position
von −1 bis +1, eine Begründung, eine Sicherheit und einen Marktkommentar. Den Entscheid des Piloten sieht Claude nicht —
sonst wäre der Vergleich nicht fair. Lehnt das Modell eine Anfrage ab, übernimmt serverseitig ein Ersatzmodell.
**Kosten (Schätzung):** pro Lauf rund 2'000 Tokens hinein und 1'500–4'000 heraus (inkl. Denken), nach Preisliste
(4 / 20 USD je Million) also etwa 4–10 US-Cent pro Tag. Die echten Kosten jedes Laufs stehen im Logbuch `data/ki-trader.json` und im Cockpit.

**Telegram-Steuerung** läuft mit dem Cockpit, sobald `TELEGRAM_BOT_TOKEN` und `TELEGRAM_CHAT_ID` gesetzt sind
(Einrichtung: `tools/trading/ki_bot/README.md`). Befehle nur aus deinem eigenen Chat: `/status`, `/konto`, `/ki`, `/lage`,
`/stop` (Not-Aus mit Schliessen), `/weiter`, `/profit`, `/calls`, `/hilfe`. Was ankam, während das Cockpit aus war, wird
**nicht** ausgeführt (sonst könnte ein altes `/weiter` einen Not-Aus aufheben); der Bot antwortet dann «bitte nochmals
senden». Das hängt nicht an der PC-Uhr und gilt auch, wenn beim Start das Netz noch fehlt (dann wird bis dahin nichts
ausgeführt). `/stop` und `/weiter` laufen sofort — langsame Info-Befehle (`/lage`, `/status`, `/profit`) laufen nebenher
und halten den Not-Aus nie auf.

## 📰 News-Wächter — immer im Bild, aber kein News-Trading (`news_waechter.py`)

Läuft mit dem Cockpit (`cockpit.py`) auf deinem PC und prüft **alle 30 Minuten**: Binance-Ankündigungen (Delistings,
neue Listings, Binance-News), die Krypto-Nachrichten von Cointelegraph, Decrypt, The Block und CoinDesk und **öffentliche
Telegram-Kanäle** über die Web-Vorschau `t.me/s/…` — ohne Konto: **Watcher.Guru** und **Wu Blockchain** (beide spiegeln ihre
X/Twitter-Meldungen, oft die schnellsten). Eigene öffentliche Kanäle: `setx NEWS_TELEGRAM "whale_alert_io,kanal2"`. Mit
`CRYPTOPANIC_KEY` zusätzlich CryptoPanic. **Binance-Delistings prüft er jede Minute** (nächster Abschnitt: nach der
Ankündigung fällt der Kurs im Median −4 % in der ersten Minute und −17 % in den ersten 30 Minuten). Wichtiges kommt sofort
aufs Handy, `/news` in Telegram zeigt die letzten Alarme:
**Hack** · **Abhebungen gestoppt** · **Insolvenz** · **Stablecoin-Depeg** · **SEC/ETF-Entscheid** · **Delisting** von BTC/ETH
und von deinen eigenen Coins: `setx NEWS_COINS "SOL,DOGE,PEPE"` (alle Coins, die du irgendwo hältst).
Jeder Eintrag kommt nur einmal, dieselbe Schlagzeile aus mehreren Quellen auch; beim allerersten Start wird nichts gemeldet
(sonst käme die ganze Liste), und Meldungen älter als 12 Stunden lösen keinen Alarm mehr aus (neue Quelle, PC war aus).
- **Twitter/X direkt:** nur mit bezahltem X-Zugang lesbar — darum über die Telegram-Spiegel (oben). **Private Telegram-Gruppen**
  (z. B. VIP-Calls) liest dein PC mit deinem Konto (`calls_leser.py`, siehe «Telegram-Call-Gruppen»).
- **Warum der Bot nicht nach News handelt:** Bis eine Schlagzeile da ist, ist der Kurs meist schon gelaufen — und unsere
  Stimmungs-Daten (Angst & Gier enthält auch Social-Media-Stimmung) haben den Prüfstand nicht bestanden (siehe «Alle Infos»).
  Der Wächter meldet; entscheiden kannst du (z. B. Not-Aus per `/stop`).

## 📉 Delisting-News: Short nach der Ankündigung? — ehrlich geprüft: durchgefallen (`delisting_pruefung.py`)

Die klarste Krypto-News überhaupt: «Binance Will Delist …». Regeln vorab festgelegt (Commit `fe3daf7`), dann echte Daten:
138 Coins aus 35 Ankündigungen 01.2022–09.2026 (ohne Stablecoins), 1-Minuten-Kurse von Spot und Perpetual, echtes Funding,
Kosten (Taker 0,05 % + Schlupf 0,2 % je Seite). Zufallsprobe: derselbe Coin an 200 zufälligen Tagen 180–7 Tage vorher.

- **Der Absturz kommt sofort:** 1 Minute nach der Veröffentlichung steht der Kurs im Median schon **−4,4 %** tiefer, nach
  5 Minuten **−12,9 %**, nach 30 Minuten **−16,6 %** (112 Coins mit Spot-Kursen).
- **Danach fällt er meist weiter:** Ein Short über den Perpetual (65 Coins hatten einen) verdiente im Mittel bis +12 %,
  in beiden Hälften, und schlug den Zufall (gleicher Coin, andere Tage: ±1 %) fast immer.
- **Trotzdem durchgefallen — an der vorab festgelegten Regel «kein Short schlechter als −50 %»:** Einzelne Delisting-Coins
  werden nach der Ankündigung hochgejagt (Short-Squeeze). **ALPACA** stieg nach der Ankündigung vom 24.04.2025 innert einer
  Stunde auf das 2,3-Fache und in 6 Tagen auf das **19-Fache**, **HFT** (03.08.2026) auf das 5-Fache, **VIC** auf das 2,4-Fache.
  Ein Short ohne Hebel verliert dabei alles. Ein Stop-Loss hätte das begrenzt, war aber nicht Teil der Regel — ihn jetzt,
  nach dem Blick auf die Daten, einzubauen, wäre Anpassen an die Vergangenheit.
- **Für Halter ist es eindeutig:** Wer einen Coin hält, den Binance delistet, sparte mit sofortigem Verkauf (nach 1 Minute)
  gegenüber Halten im Median **12 %** (1 Stunde) bis **34 %** (6 Tage); nach 30 Minuten Zögern nur noch 3–26 %. Darum
  prüft der News-Wächter Delistings jetzt jede Minute und meldet sie für deine Coins (`NEWS_COINS`) sofort.
- **Folge: kein Delisting-Short-Bot.** Ehrlicher nächster Schritt wäre ein Vorwärts-Test (Schatten, ohne Geld) mit Stop über
  die nächsten Delistings — erst danach neu entscheiden. Keine Anlageberatung.

| Reaktion / Halten | Shorts | Mittel netto | Median | im Plus | Hälfte 1 / 2 (Mittel) | Zufall: Mittel | Zufallsprobe | schlimmster | bestanden |
|---|---|---|---|---|---|---|---|---|---|
| 1 Min./1h | 65 | +1,2 % | +1,7 % | 57 % | +3,2 % / +0,9 % | −0,5 % | 100 % | −100,0 % | ❌ |
| 1 Min./24h | 65 | +5,5 % | +9,5 % | 63 % | +9,2 % / +4,9 % | −0,3 % | 100 % | −100,0 % | ❌ |
| 1 Min./72h | 65 | +9,2 % | +8,7 % | 63 % | +10,3 % / +9,0 % | +0,2 % | 100 % | −100,0 % | ❌ |
| 1 Min./6T | 65 | +11,9 % | +21,3 % | 65 % | +12,1 % / +11,8 % | +1,2 % | 100 % | −100,0 % | ❌ |
| 5 Min./1h | 65 | −0,3 % | +1,3 % | 54 % | +2,8 % / −0,8 % | −0,5 % | 96 % | −100,0 % | ❌ |
| 5 Min./24h | 65 | +4,0 % | +7,1 % | 58 % | +8,3 % / +3,3 % | −0,3 % | 100 % | −100,0 % | ❌ |
| 5 Min./72h | 65 | +8,0 % | +9,4 % | 63 % | +9,7 % / +7,7 % | +0,2 % | 100 % | −100,0 % | ❌ |
| 5 Min./6T | 65 | +11,0 % | +19,8 % | 63 % | +11,4 % / +10,9 % | +1,2 % | 100 % | −100,0 % | ❌ |
| 30 Min./1h | 65 | +0,5 % | +1,2 % | 55 % | +3,2 % / +0,1 % | −0,5 % | 100 % | −100,0 % | ❌ |
| 30 Min./24h | 65 | +3,5 % | +7,3 % | 63 % | +7,8 % / +2,7 % | −0,3 % | 100 % | −100,0 % | ❌ |
| 30 Min./72h | 65 | +8,3 % | +11,3 % | 68 % | +9,9 % / +8,1 % | +0,2 % | 100 % | −100,0 % | ❌ |
| 30 Min./6T | 65 | +11,2 % | +17,7 % | 68 % | +11,2 % / +11,2 % | +1,2 % | 100 % | −100,0 % | ❌ |

## 📣 Telegram-Call-Gruppen kopieren — erst ehrlich prüfen, dann (vielleicht) kopieren

Viele Call-Gruppen zeigen nur ihre Gewinner, löschen Verlierer oder sind Pump-Gruppen. Darum geht es in drei Stufen:
**1. Mitlesen → 2. an den eigenen alten Calls messen → 3. kopieren** (erst Schatten, dann Testnetz, echtes Geld nur nach
bestandener Prüfung). Alles läuft auf deinem PC; aus der Cloud kann niemand deine Gruppen lesen.

**Einrichten (einmal):**
1. https://my.telegram.org → «API development tools» → App anlegen → `api_id` und `api_hash`.
2. `setx TELEGRAM_API_ID "…"` und `setx TELEGRAM_API_HASH "…"`, `py -m pip install telethon`, **neues Fenster**.
3. `py tools\trading\krypto_bot\calls_leser.py --login` (Telefonnummer, Code aus Telegram, ggf. 2FA-Passwort).
   Ein Bot kann fremde Gruppen nicht lesen — darum liest das Skript mit deinem Konto (nur lesen, es schreibt nie).
   ⚠️ `data\telegram-calls.session` ist ein voller Zugang zu deinem Telegram-Konto: nie weitergeben (ist in .gitignore).
4. `…\calls_leser.py --gruppen` zeigt deine Gruppen mit Nummer → `setx TELEGRAM_CALL_GRUPPEN "-100…,-100…"`.

**Prüfen:** `…\calls_leser.py --verlauf --tage 365` holt die alten Nachrichten, `…\calls_pruefung.py` spielt jeden Call
mit echten Binance-Kursen (15 Minuten) nach. Regeln vorher festgelegt und für jede Gruppe gleich: Einstieg frühestens 1 Min.
nach der Nachricht, Zone 24 Std. gültig, Stop wie angegeben (sonst 10 %), Ziele zu gleichen Teilen, nach 7 Tagen zu,
Stop vor Ziel in derselben Kerze, Gebühren, Schlupf und Funding. **«Kopierwürdig» nur mit ≥ 30 abgeschlossenen Calls, Plus
in beiden zeitlichen Hälften und ≥ 90 % von 200 Zufallskopien geschlagen** (gleiche Calls zu verschobenen Zeitpunkten —
sonst war es Glück mit dem Markt). Gelöschte Nachrichten zählen mit. Telegram liefert im Verlauf nur die **letzte**
Fassung einer Nachricht: Wurde ein Call später als 5 Minuten nach dem Senden bearbeitet (z. B. Stop nachträglich
verschoben), zählt er nicht und wird als «bearbeitet» ausgewiesen — live liest das Skript die erste Fassung mit.
Ehrlich: Im Verlauf fehlen Calls, die die Gruppe schon früher gelöscht hat — die Schatten-Bilanz ab heute ist ehrlicher.

**Was als Call zählt** (geprüft an 40 typischen Formaten, `calls_korpus.py`): genau eine Richtung (LONG/SHORT, sonst
BUY/SELL; «Short-term» ist keine Richtung), ein Coin, Einstieg, Stop und Ziele, auch mit Emoji-Nummern, Prozent-Zielen
und «Sell/Buy back»-Abschnitten. **Nicht** gezählt: Antworten auf frühere Nachrichten, Erfolgsmeldungen («TP1 ✅»,
«all targets hit»), Wiederholungen desselben Calls (gleiche Werte innerhalb von 7 Tagen). Ausbruch-Calls («Kauf über
0,52») und Stops nur in Prozent ohne Einstiegspreis stehen im Protokoll, zählen aber nicht in die Wertung und werden
nie kopiert. Fehlt der Stop ganz, rechnen Prüfung und Kopierer mit 10 %. Ein Call, dessen Preise nicht zum Kurs passen
(Einstieg oder Stop mehr als 1,5-fach daneben, Ziele mehr als 3-fach), gilt als unplausibel; sind mehr als 10 % der Nachrichten
unlesbar oder unplausibel, kann die Gruppe nicht «kopierwürdig» werden. Meme-Coins handelt Binance teils als
`1000PEPEUSDT` — der Kopierer rechnet die Preise um.

**Mitlesen und kopieren:** `calls.bat` (Fenster offen lassen, startet bei Netz-Ausfall neu). Jeder erkannte Call kommt
aufs Handy und ins Cockpit-Feld «📣 Telegram-Calls». `CALLS_MODUS`:
- `schatten` (Standard): nur mitrechnen, nie Aufträge.
- `testnetz`: kopiert mit den Futures-Testnetz-Schlüsseln des Piloten (Spielgeld), jede Gruppe
  (`CALLS_NUR_GEPRUEFT=1` = nur bestandene).
- `echtgeld`: nur mit der Echtgeld-Freigabe des Piloten **und** `CALLS_ECHTGELD_GRUPPEN` **und** bestandener Prüfung
  (höchstens 30 Tage alt).

Sicherungen: Börsen-Stop sofort nach dem Einstieg — klappt er nicht, wird die Position sofort geschlossen. Ziele als
Teil-Gewinnmitnahmen an der Börse. 1 % Risiko je Call (`CALLS_RISIKO`, höchstens 3 %), **Hebel höchstens 2×, auch wenn der
Call 50× sagt**, höchstens 25 % des Kontos (`CALLS_ANTEIL`) und 1000 USDT (`CALLS_MAX_AUFTRAG`) je Call, höchstens 3 Calls
gleichzeitig (`CALLS_MAX_OFFEN`), je Coin einer. Bitcoin und Ethereum gehören dem Pilot (nur Schatten). Not-Aus schliesst
auch kopierte Calls, Pause = keine neuen. Telegram `/calls` zeigt die Bilanz. Unlesbare Formate kann Claude lesen
(`CALLS_CLAUDE=1`, ein paar Zehntel-Cent je Nachricht) — Claude liest nur ab, entscheidet nichts.
`…\calls_kopierer.py --probe "LONG #SOLUSDT Entry 145-148 TP 152 SL 140"` zeigt, was mit einer Nachricht passieren würde.

## 👥 «Die Besten kopieren» (Binance Copy-Trading) — ehrlich geprüft (`copytrading_pruefung.py`)

Binance zeigt öffentlich, was jeder Leadtrader erreicht hat — auch, ob **seine Kopierer** Geld verdient haben, und wie oft
er schon ein Portfolio geschlossen und neu angefangen hat. Fragen und Filter standen fest, bevor die Daten geladen wurden
(Commit `2e8b5a7`). Stand 13.10.2026, 472 Leadtrader aus den Top 150 von fünf Ranglisten:

| Rangliste (Binance) | Median-ROI der Top 10 | Top 10: Kopierer im Minus | Top 150: Kopierer im Minus | Schon neu gestartet (Top 150) |
|---|---|---|---|---|
| ROI 30 Tage | +3'816 % | 40 % | 32 % | 73 % |
| ROI 90 Tage | +4'814 % | 30 % | 36 % | 76 % |
| ROI 180 Tage | +5'834 % | 30 % | 41 % | 79 % |
| Gewinn 90 Tage | +341 % | 30 % | 43 % | 56 % |
| Kopierer-Gewinn 90 Tage | +482 % | 0 % | 0 % | 60 % |

- **Die Rangliste zeigt vor allem Glück und Neustarts.** Rund drei Viertel der ROI-Besten haben schon Portfolios geschlossen
  und neu angefangen — ein Totalverlust verschwindet so aus der Statistik. Bei 30–40 % der Besten sind die Kopierer
  insgesamt im Minus, obwohl der Leadtrader Tausende Prozent zeigt (Beispiel: Platz 2 der 90-Tage-Liste +7'453 %,
  Kopierer −477'739 USDT).
- **Ein guter Rang hält nicht — er kippt.** Bei 217 Leadtradern mit mindestens 120 Tagen Kurve: Wer in der ersten
  Hälfte zu den besten 10 % gehörte, machte in der zweiten Hälfte im Median **+16 %**,
  alle anderen **+58 %** (Rangkorrelation **−0,40**: je besser vorher,
  desto schlechter nachher). 32 % der Besten lagen in der zweiten Hälfte im Minus.
  Und das ist noch geschönt: Wer pleite ging, fehlt in den Daten.
- **Filter «kopierbar»** (≥ 180 Tage, nie neu gestartet, Kopierer im Plus, 30/90/180 Tage im Plus, Einbruch ≤ 25 %, kein
  Hebel > 20×, kein Martingale-Muster): **3 von 472** bleiben. Die Hürden, an denen die meisten scheitern:
  zu kurz dabei (309), schon neu gestartet (82), Kopierer im Minus (55).
- Die 3 sind **keine Empfehlung**, sondern Kandidaten für den **Vorwärts-Test**: Ab heute werden sie mit den naiven Top 10
  verglichen; nach 30 Tagen zählt, was Kopieren seither gebracht hätte (`copytrading_pruefung.py --auswerten`, fällig ab
  12.11.2026, Daten `data/copytrading-schatten.json`). **Warnzeichen** trotz bestandenem Filter: «Kristofer Hogon SAzs»
  schloss 253 Positionen ohne einen einzigen Verlust, mit bis zu 50× Hebel — so sieht es aus, wenn Verlierer offen liegen
  bleiben (die zählen in der Statistik nicht). «iiTrader» (Hebel höchstens 3×, 300 Positionen,
  Trefferquote 41 %) und «CryptoWizards» (446 Tage, Einbruch 7,8 %) sehen
  solider aus. Dazu kommt die Gewinnbeteiligung (10–20 % deines Gewinns gehen an den Leadtrader).
- **Wer trotzdem kopiert:** kleiner fester Betrag («Fixed Amount»), in Binance einen Copy-Stop-Loss setzen, keinen höheren
  Hebel als der Leadtrader, und den Vorwärts-Test abwarten. Keine Anlageberatung.

## 🐸 Meme-Coins, Top 10 und «alles traden» — ehrlich getestet: schlechter als Bitcoin (`alle_coins_pruefung.py`)

Die Trend-Regel des Piloten auf JEDEN Coin angewendet, mit allen Binance-USDT-Paaren seit 2017 — auch den abgemeldeten
(LUNA, FTT …), sonst würde der Test die Verlierer weglassen. Regeln vorab festgelegt (Commit `249b1d8`): wöchentlich
entschieden, höchstens 10 Plätze, Trendlänge nur 2018–2021 gewählt (Top 10: 50 Tage, alle Coins/Memes: 150 Tage), Kosten
0,15 % (Top 10) bzw. 0,3 % (dünnere Märkte) je Umschichtung. 26 Meme-Coins mit Binance-Daten (1000CAT, 1000CHEEMS, 1000SATS, 1MBABYDOGE, ACT, BABY, BANANAS31, BOME, BONK, BROCCOLI714, DOGE, DOGS, FLOKI, MEME, MUBARAK, NEIRO, NOT, PENGU, PEOPLE, PEPE, PNUT, SHIB, TRUMP, TST, TURBO, WIF).
Stand 2026-10-12:

| Gruppe / Regel | 2022–2023 pro Jahr | 2024–heute pro Jahr | ab 2022: aus 1 wurde | schlimmster Einbruch | Zufall geschlagen | Urteil |
|---|---|---|---|---|---|---|
| Top 10: alles halten | −46,4 % | −6,1 % | × 0,25 | −85 % | – | ❌ |
| Top 10: Trend je Coin | −6,3 % | +15,4 % | × 1,37 | −45 % | 96 % | ❌ |
| Top 10: Trend + Bitcoin-Filter | +19,5 % | +15,3 % | × 2,22 | −38 % | 93 % | ❌ |
| Meme-Coins: alles halten | −38,8 % | −32,1 % | × 0,13 | −94 % | – | ❌ |
| Meme-Coins: Trend je Coin | −4,8 % | −8,8 % | × 0,71 | −71 % | 99 % | ❌ |
| Meme-Coins: Trend + Bitcoin-Filter | −1,8 % | −4,0 % | × 0,88 | −69 % | 100 % | ❌ |
| alle Coins: alles halten | −49,1 % | −55,2 % | × 0,03 | −98 % | – | ❌ |
| alle Coins: Trend je Coin | −76,3 % | −57,2 % | × 0,01 | −100 % | 57 % | ❌ |
| alle Coins: Trend + Bitcoin-Filter | +2,7 % | −1,4 % | × 1,06 | −58 % | 100 % | ❌ |
| **Bitcoin mit Trend 150 (Pilot-Kern)** | +33,0 % | +22,7 % | × 3,27 | −28 % | | |
| Bitcoin halten | −5,9 % | +24,8 % | × 1,71 | −67 % | | |

- **Keine Gruppe besteht.** Bitcoin mit Trend 150 machte ab 2022 aus 1 → 3,27 bei höchstens −28 % Einbruch; die beste
  Alternative (Top 10 mit Trend + Bitcoin-Filter) nur × 2,22 bei −38 %.
- **Meme-Coins halten: −94 %** Einbruch, aus 1 wurden 0,13. Auch mit Trend-Regel und Bitcoin-Filter im Minus. Die Regel
  schlägt zwar fast alle Zufallskopien (sie meidet die schlimmsten Abstürze) — aber «weniger schlecht» reicht nicht.
- **Alle Coins mit Trend-Regel: aus 1 wurden 0,01** (−100 % Einbruch). Bei hunderten Altcoins kauft die Regel ständig
  kurze Ausbrüche, die sofort wieder einbrechen — und zahlt jedes Mal Gebühren.
- **Darum handelt der Bot weiter nur Bitcoin und Ethereum.** Meme-Coins sind für ihn nur Beobachtung (News-Wächter).
  Keine Anlageberatung.

## 🏆 «Top-Krypto traden, Gewinnern folgen» — ehrlich getestet: verliert

`gewinner_pruefung.py` testet die beliebteste YouTube-Idee: jede Woche die Coins mit dem stärksten Anstieg kaufen.
Damit das Ergebnis nicht geschönt ist:
- **Alle 685 USDT-Paare von Binance seit 2017, auch die toten** (LUNA, FTT und über 200 abgemeldete Coins,
  `binance_daten.py`). Wer nur die Coins testet, die es heute noch gibt, lässt die Verlierer weg.
- Das «Top-20»-Universum wird jede Woche **nur mit damaligen Daten** bestimmt (Handelsvolumen der letzten 30 Tage).
- Regel und Entscheid vorab festgelegt, 0,15 % Kosten je Umschichtung, kein Hebel, Zufallsprobe mit 200 Kopien.

Stand 07.10.2026 (1 = Startkapital Februar 2018):

| Strategie | 2018–2021 pro Jahr | 2022–heute pro Jahr | schlimmster Einbruch ab 2022 | aus 1 wurde |
|---|---|---|---|---|
| G1 Gewinner folgen (Top 3 der letzten 30 Tage) | +39,6 % | **−67,6 %** | −100 % | **0,02** |
| G2 Gewinner + Trendfilter (nur steigende, Bitcoin über Trend) | +8,8 % | −13,0 % | −84 % | 0,72 |
| G3 Gewinner 90 Tage + Filter (Top 5) | +34,9 % | −17,8 % | −81 % | 1,27 |
| Top 20 gleich verteilt | +13,1 % | −42,7 % | −95 % | 0,12 |
| **Bitcoin halten** | +50,9 % | +12,4 % | −67 % | **9,02** |
| **Bitcoin mit Trend 150** (sonst USDT) | +26,2 % | +28,7 % | **−28 %** | **8,28** |

- **Gewinnern folgen hat 98 % des Geldes vernichtet.** Die Coins mit dem grössten Anstieg sind meist die, die danach am
  stärksten fallen. Die mittlere Woche war leicht positiv (+0,4 %), die typische Woche (Median) aber −1,2 %, und
  41 % der Coins wechselten jede Woche — die Verlustwochen fressen das Konto auf.
- Gegen Zufall: Die echten «Gewinner» schlugen nur 44–72 % von 200 Kopien mit zufällig gewählten Coins aus denselben
  Top 20. Das Auswählen bringt also nichts — es ist der Altcoin-Markt selbst, der seit 2022 verliert.
- **Darum gibt es dafür keinen Handels-Bot.** Im Live-Markt (`/markt`) kannst du die Gewinner und Verlierer des Tages
  trotzdem sortiert ansehen — als Anzeige. Gehandelt werden nur Bitcoin und Ethereum mit Trendregel (Krypto-Pilot).

## ⚡ Mehr Hebel? — ehrlich getestet (`hebel_pruefung.py`)

Der Pilot (BTC 150 + ETH 200, MVRV-Bremse, Stop 3σ) im Futures-Modell mit Gebühren, Funding für Longs und Liquidation,
BTC/ETH täglich neu aufgeteilt wie live, Stand 11.10.2026. «Alles × L» heisst: Schwankungsziel und Deckel L-mal so gross (jede Position
L-mal so gross):

| Hebel | ab 2019 pro Jahr | schlimmster Einbruch | ab 2022 pro Jahr | Einbruch ab 2022 |
|---|---|---|---|---|
| **1× (Standard)** | **+37,4 %** | **−29 %** | **+28,1 %** | **−26 %** |
| 1,5× | +51,0 % | −44 % | +35,6 % | −40 % |
| 2× | +62,7 % | −60 % | +41,9 % | −57 % |
| 3× | +80,1 % | −81 % | +43,6 % | −81 % |
| 5× | +56,5 % | −97 % | +9,3 % | −97 % |
| 10× | −88,5 % | **−100 %** | −93,6 % | −100 % |

- Mehr Hebel bringt bis 3× mehr Rendite, aber die Einbrüche wachsen schneller als der Gewinn: Rendite ÷ Einbruch ist bei
  1× am besten (1,30), bei 3× fällt das Konto zwischendurch um 81 %. Ab 5× bleiben vom Höchststand zeitweise nur 3 %
  übrig, ab 10× ist das Konto weg — schon eine einzige schlechte Woche reicht.
- Nur den Deckel höher stellen (Schwankungsziel bleibt) bringt nichts: ab 2022 sogar schlechter (0,78 statt 1,07), weil
  der Pilot dann in ruhigen Phasen grösser wird — und ruhige Phasen endeten oft mit einem Einbruch.
- Regel vorab: mehr Hebel nur, wenn nie liquidiert, Einbruch nie tiefer als −50 % und Rendite ÷ Einbruch überall besser
  als 1×. **Keine Stufe hat bestanden.** Darum bleibt 1× Standard und 2× die harte Grenze.
- **100× («x100 Futures»)**: `hebel_pruefung.py --minuten` mit echten Bitcoin-Minutenkursen (09.09.–09.10.2026,
  3000 zufällige Einstiege je Zeile). Liquidation bei 1/Hebel − 0,4 % Wartungsmarge − Gebühr:

  | Hebel | liquidiert bei Gegenbewegung von | Long: liquidiert / Median | Short: liquidiert / Median |
  |---|---|---|---|
  | 10× | 9,55 % | 0 % | 30 % / nach 170 Std. |
  | 20× | 4,55 % | 36 % / nach 142 Std. | 42 % / nach 78 Std. |
  | 50× | 1,55 % | 78 % / nach 42 Std. | 80 % / nach 30 Std. |
  | **100×** | **0,55 %** | **92 % / nach 7,7 Std.** | **93 % / nach 6,4 Std.** |

  Bei 100× reicht eine Bewegung von gut einem halben Prozent — das schafft Bitcoin fast jeden Tag, in beide Richtungen.
  Ob Long oder Short ist dabei fast egal: Das Rauschen liquidiert die Position, bevor die Richtung zählt. Darum gibt es
  im Pilot kein 100× (und nichts über 2×).
- Wer bewusst mehr Risiko will: im Cockpit **Risiko-Stufe 1,5×, 1,75× oder 2×** wählen (oder `setx KRYPTO_RISIKO "1.75"`), mit
  Rückfrage und den Zahlen (seit 18.10.2026 aus dem Max-Profit-Prüfstand, siehe unten). Der Pilot nutzt dabei weiterhin höchstens `KI_BOT_ANTEIL` (Standard 50 %) des Kontos —
  die Prozente oben gelten für diesen Teil.

## 💰 «Max Profit» — welcher Hebel bringt auf Dauer am meisten? (`maxprofit_pruefung.py`)

Frage (14.10.2026): Wie holt der Pilot den grössten Gewinn heraus? «Max Profit» heisst hier das grösste **Vermögenswachstum
auf Dauer** (Rendite pro Jahr) — nicht der grösste Erwartungswert: der wird mit Alles-auf-Hebel maximiert und endet im Ruin
(oben: ab 5× ist das Konto weg). Die Regeln standen fest, bevor gerechnet wurde (Git-Commit `fb9a08cad`, Kopf von
`maxprofit_pruefung.py`):
- gleiche Signale wie der Live-Pilot (nichts Neues gesucht);
- echtes Binance-Funding und Liquidation;
- gezählt nur **ab 2020** — der Kelly-Hebel wird jedes Jahr nur aus den Jahren davor geschätzt;
- dazu ab 2022, doppelte Kosten und 10'000 Zufallsjahre aus den echten Tagesrenditen.

| Kandidat | ⌀ Hebel | ab 2020 pro Jahr / Einbruch | ab 2022 | doppelte Kosten | P(Einbruch < −60 % im Jahr) | schlechtestes 5-%-Jahr | Urteil |
|---|---|---|---|---|---|---|---|
| 1× (live) | 1,00 | +33,4 % / −30 % | +29,3 % / −26 % | +27,8 % | 0,0 % | −20 % | bestanden |
| 1,25× | 1,25 | +36,2 % / −39 % | +32,7 % / −33 % | +28,3 % | 0,2 % | −27 % | bestanden |
| 1,5× | 1,50 | +43,5 % / −45 % | +38,2 % / −38 % | +33,2 % | 1,1 % | −33 % | bestanden |
| **1,75×** | **1,75** | **+48,7 % / −53 %** | **+43,8 % / −45 %** | **+38,4 %** | **3,6 %** | **−39 %** | **bestanden → Empfehlung** |
| 2× | 2,00 | +51,7 % / −61 % | +45,4 % / −53 % | +39,0 % | 8,2 % | −45 % | nein (Einbruch-Risiko) |
| 2,5× | 2,50 | +57,7 % / −69 % | +46,2 % / −68 % | +40,9 % | 22,8 % | −55 % | nein |
| 3× | 3,00 | +61,4 % / −79 % | +48,7 % / −79 % | +38,7 % | 40,9 % | −65 % | nein |
| Kelly ¼ (je Jahr neu) | 1,20 | +37,3 % / −44 % | +29,9 % / −28 % | +29,1 % | 0,3 % | −29 % | bestanden |
| Kelly ½ | 2,37 | +59,7 % / −73 % | +46,4 % / −54 % | +40,9 % | 22,6 % | −55 % | nein |
| Kelly ¾ / voll | 2,97 / 3,00 | +59,9 % / +61,4 %, −79 % | +46,7 % / +48,7 % | +37,4 % / +38,7 % | 40 % | −65 % | nein |
| **Pilot 2.0 (1×)** | 1,00 | **+45,4 % / −24 %** | +33,7 % / −23 % | +41,5 % | 0,0 % | −14 % | bestanden |
| Bitcoin halten (Spot) | – | +43,4 % / −77 % | +13,0 % / −67 % | – | – | – | Vergleich |

- **Das Wachstum steigt mit dem Hebel — bis zur Klippe.** 3× brachte ab 2020 am meisten (+61 % pro Jahr). In 41 % der
  Zufallsjahre fällt das Konto dabei aber tiefer als −60 %. Der Kelly-Hebel, nur aus den Vorjahren geschätzt, wollte jedes Jahr
  3× oder mehr (gedeckelt). Wer so handelt, erlebt sehr wahrscheinlich einen fast totalen Einbruch, bevor die Rendite kommt.
- **Empfehlung nach der Regel: 1,75×.**
  - Ab 2020 +48,7 % statt +33,4 % pro Jahr, ab 2022 +43,8 % statt +29,3 %, auch mit doppelten Kosten besser.
  - Der Preis: schlimmster Einbruch −53 %, und jedes 20. Jahr endet bei −39 % oder schlechter.
  - Bitcoin halten schlägt sie in beiden Zeiträumen, mit kleinerem Einbruch.
- **Effizienter ist Pilot 2.0 mit 1×:** +45,4 % pro Jahr bei nur −24 % Einbruch, also fast so viel wie 1,75× bei halbem Risiko.
  Mit doppelten Kosten ist er sogar besser (+41,5 % gegen +38,4 %). Pilot 2.0 ist aber noch gesperrt (unabhängige Prüfungen).
  «Pilot 2.0 mit Hebel» steht als eigener Prüfstand im nächsten Abschnitt.
- Ehrlich:
  - Bei 12 Kandidaten schönt die Auswahl die beste Zahl etwas.
  - Yahoo-Tageskurse: Echte Dochte an der Börse können tiefer sein, eine Liquidation käme dann früher.
  - Ein Börsenausfall (FTX 2022) ist nicht abgebildet.
  - Korrektur nach dem ersten Lauf: Die «teure» Zahl für Pilot 2.0 rechnete die Funding-*Einnahme* versehentlich × 1,5
    (44,9 % statt richtig 41,5 %). Die Empfehlung blieb gleich; ein Test fängt das jetzt.
- Live: Die Risiko-Stufen 1,5× und **1,75×** sind im Cockpit wählbar (`KRYPTO_RISIKO=1.5` bzw. `1.75`; 1,75× seit 18.10.2026). Werte
  werden auf 1 / 1,5 / 1,75 / 2 gerundet, bei Gleichstand auf die kleinere. Der Standard bleibt 1× — der Pilot wechselt nie von
  selbst. Die Rückfrage im Cockpit nennt die Zahlen dieser Tabelle (ab 2020, ab 2022, Wahrscheinlichkeit eines Jahres unter −60 %).
  Keine Anlageberatung — nur Geld einsetzen, dessen Verlust du verkraftest.

## 💰 «Max Profit 2» — Pilot 2.0 mit Hebel (`maxprofit_p2_pruefung.py`)

Frage (14.10.2026): Pilot 2.0 mit 1× war oben der effizienteste Kandidat. Bringt er **mit Hebel** noch mehr, ohne das Konto zu
riskieren?

Die Regeln standen fest, bevor gerechnet wurde (Git-Commit `f330a1421`, Kopf von `maxprofit_p2_pruefung.py`): gleiche Signale,
Daten, Risikomasse und Entscheidungsregel wie oben, Basis ist Pilot 2.0 mit 1×.

Das Modell (`maxprofit_kern.lauf_p2`):
- Long bis 1× ganz über Spot (kein Funding), darüber teils über einen Futures-Long (zahlt Funding).
- Short über Futures.
- Pfand je Futures-Position = Volumen ÷ Hebel. Spot-Coins zählen nicht als Pfand.
- Freies Geld liegt in der Funding-Ernte.

| Kandidat | ab 2020 pro Jahr / Einbruch | ab 2022 | doppelte Kosten | P(Einbruch < −60 % im Jahr) | schlechtestes 5-%-Jahr | Urteil |
|---|---|---|---|---|---|---|
| Pilot 2.0 1× | +45,7 % / −24 % | +34,0 % / −23 % | +42,1 % | 0,0 % | −14 % | Basis |
| 1,25× | +48,5 % / −34 % | +36,5 % / −31 % | +43,4 % | 0,1 % | −22 % | bestanden |
| 1,5× | +55,4 % / −40 % | +40,3 % / −37 % | +48,7 % | 0,7 % | −28 % | bestanden |
| **1,75×** | **+58,7 % / −49 %** | **+44,1 % / −44 %** | **+50,1 %** | **3,0 %** | **−35 %** | **bestanden → Empfehlung** |
| 2× | +62,9 % / −58 % | +47,0 % / −51 % | +51,2 % | 7,2 % | −42 % | nein (Einbruch-Risiko) |
| zum Vergleich: Live-Pilot 1,75× (alles Futures) | +48,7 % / −53 % | +43,8 % / −45 % | +38,4 % | 3,6 % | −39 % | erster Prüfstand |

- **Pilot 2.0 mit 1,75× schlägt den Live-Pilot mit 1,75×**, also die Empfehlung des ersten Prüfstands:
  - +58,7 % statt +48,7 % pro Jahr, bei kleinerem Einbruch (−49 % statt −53 %);
  - mit doppelten Kosten +50,1 % statt +38,4 %.
  Grund: Longs bis 1× laufen über Spot ohne Funding, und freies Geld verdient in der Ernte.
- **Die Effizienz sinkt mit dem Hebel.** 1× bringt +45,7 % bei −24 % Einbruch, 1,75× bringt +58,7 % bei −49 %: doppelter
  Einbruch für 13 Prozentpunkte mehr. Bei 1,75× liegt das Einbruch-Risiko mit 3,0 % nahe an der Grenze von 5 %.
- **Korrektur nach dem ersten Lauf (Modellfehler, offen gelegt):**
  - Was passierte: Der erste Lauf meldete bei 1,75× und 2× mit doppelten Kosten «BTC liquidiert».
  - Warum: Der Umbau zog Gebühren und das Auflösen der Ernte erst nach dem Pfand ab. Bei einem winzigen Futures-Long fiel das
    Futures-Konto so unter null, obwohl sich der Kurs kaum bewegte.
  - Behoben: Tests 13b prüfen jetzt, dass bei festem Kurs nie liquidiert wird. Am alten Code scheitern sie.
  - Folge: Der erste Lauf empfahl 1,5× (1,75× mit doppelten Kosten nur 30,9 %), korrigiert ist es 1,75×. Die Zahlen ohne
    doppelte Kosten änderten sich höchstens um 0,1 Prozentpunkte.
  - Beide Läufe stehen in `data/krypto-maxprofit-p2-pruefung.json`.
- Ehrlich:
  - Kurslücken über den Stop hinaus sind nicht abgebildet. Bei 1,75× wird der Futures-Teil nach einer Gegenbewegung von 57 %
    liquidiert (Pfand = Volumen ÷ 1,75).
  - Ein Börsenausfall ist nicht abgebildet.
  - Bei 5 Kandidaten schönt die Auswahl die beste Zahl nur wenig.
- Live: **Pilot 2.0 ist gesperrt und kann nur 1×.** Ein Hebel wäre ein Umbau (Futures-Long-Teil, Pfand-Regel) mit eigenen
  Prüfungen. Die Reihenfolge:
  1. 1× freigeben: unabhängige Prüfung ohne Blocker → Testnetz → Probelauf → kleiner Betrag.
  2. Monatelang mit 1× laufen lassen.
  3. Erst danach den Hebel in Stufen erhöhen.
  Keine Anlageberatung.

## ⏱️ Scalping (Minuten-Handel) — ehrlich getestet: verliert (`scalping_pruefung.py`)

Frage: Lässt sich auf Binance-Futures mit Minuten-Handel **nach Gebühren** Geld verdienen? Die Regeln standen fest, bevor
ein einziger echter Kurs gerechnet wurde (Git-Commit `198f2b1`, Kopf von `scalping_pruefung.py`):

- **Daten:** BTCUSDT und ETHUSDT Perpetual, jede Minute vom 01.01.2022 bis 30.09.2026 (je 2'496'960 Minuten, keine Lücke),
  mit Taker-Kauf-Volumen und Funding. **Lernen** bis Ende 2023, **Prüfen** 01.2024–09.2026 (in zwei Hälften).
- **Kosten wie für dich:** Binance VIP 0 — Maker 0,02 %, Taker 0,05 % je Seite, dazu Schlupf (BTC 0,01 %, ETH 0,015 %)
  und Funding. Ein Taker-Trade hin und zurück kostet damit rund **0,12 % (12 bp)**.
- **Strenge Füll-Regeln:** Limit nur gefüllt, wenn der Kurs es durchstösst; Stop und Ziel in derselben Kerze → Stop;
  Kurslücken zum schlechteren Kurs; ein Signal, das erst am Schluss feststeht, wird zur nächsten Eröffnung ausgeführt.
- **7 Strategien** aus Praxis und Forschung, Variante nur im Lernzeitraum gewählt: Band-Abpraller (Mean-Reversion mit
  Maker-Limits), Ausbruch (Donchian), RSI(2)-Extrem, Order-Flow folgen, Umkehr nach Fluss-Kerze
  ([arXiv 2026](https://arxiv.org/pdf/2608.21888)), Halbstunden-Momentum
  ([Shen/Urquhart/Wang 2022](https://research.birmingham.ac.uk/en/publications/bitcoin-intraday-time-series-momentum/)),
  Tageszeit-Muster.
- **Bestanden** nur mit Gewinn in beiden Hälften, ≥ 200 Trades, ≥ 1 bp netto je Trade, besser als 90 % von 200
  Zufallskopien (gleiche Anzahl, Richtung, Haltedauer, zufälliger Zeitpunkt) und Gewinn auch bei Gebühren +20 % und
  doppeltem Schlupf. «Handelbar» erst, wenn BTC **und** ETH bestehen.

Ergebnis im Prüfzeitraum (Stand 13.10.2026, direkt aus `data/krypto-scalping-pruefung.json` erzeugt):

| Markt | Strategie (gewählte Variante) | Trades | Brutto je Trade | Netto je Trade | Treffer | Zufall geschlagen | Urteil (durchgefallen an) |
|---|---|---|---|---|---|---|---|
| BTC | S1 Band-Abpraller (Mean-Reversion, Maker) (k=3.5) | 30'618 | −0,5 bp | −6,9 bp | 43 % | 0 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |
| BTC | S2 Ausbruch (Donchian, Stop-Einstieg) (n=240) | 5'471 | +1,6 bp | −10,4 bp | 27 % | 84 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |
| BTC | S3 RSI(2)-Extrem 5m (<5 +Trend) | 6'523 | +1,8 bp | −10,2 bp | 26 % | 100 % | ❌ Hälften, ≥ 1 bp, Stress |
| BTC | S4 Order-Flow folgen 1m (5m/15m) | 763 | +1,0 bp | −11,0 bp | 21 % | 84 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |
| BTC | S5 Umkehr nach Fluss-Kerze 15m (3σ/1×15m) | 1'564 | −2,1 bp | −14,1 bp | 37 % | 0 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |
| BTC | S6 Halbstunden-Momentum (us) | 718 | −1,3 bp | −13,3 bp | 33 % | 17 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |
| BTC | S7 Tageszeit-Muster 1h (1 Std.) | 2'008 | −1,1 bp | −13,1 bp | 35 % | 14 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |
| ETH | S1 Band-Abpraller (Mean-Reversion, Maker) (k=3.5) | 34'093 | −0,7 bp | −7,5 bp | 45 % | 0 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |
| ETH | S2 Ausbruch (Donchian, Stop-Einstieg) (n=240) | 5'400 | +4,8 bp | −8,2 bp | 30 % | 100 % | ❌ Hälften, ≥ 1 bp, Stress |
| ETH | S3 RSI(2)-Extrem 5m (<5 +Trend) | 6'393 | +1,1 bp | −11,9 bp | 33 % | 100 % | ❌ Hälften, ≥ 1 bp, Stress |
| ETH | S4 Order-Flow folgen 1m (60m/60m) | 813 | +0,8 bp | −12,2 bp | 32 % | 68 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |
| ETH | S5 Umkehr nach Fluss-Kerze 15m (3σ/1×15m) | 1'478 | −2,9 bp | −15,9 bp | 44 % | 0 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |
| ETH | S6 Halbstunden-Momentum (utc_stark) | 475 | −1,0 bp | −14,0 bp | 30 % | 31 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |
| ETH | S7 Tageszeit-Muster 1h (1 Std.) | 2'008 | −3,5 bp | −16,5 bp | 35 % | 2 % | ❌ Hälften, ≥ 1 bp, Zufall, Stress |

- **Keine einzige Strategie besteht — 0 von 14.** Selbst mit Schummeln (die beste der je 26 Varianten erst NACHTRÄGLICH im
  Prüfzeitraum ausgesucht) bleibt jede im Minus: bestenfalls −6,9 bp (BTC) bzw. −7,5 bp (ETH) je Trade; **0 von 52
  Varianten** verdienen netto. Mit BNB-Rabatt bestenfalls −6,3 bp je Trade.
- **Die Gebühren sind die Wand, nicht die Idee.** Es gibt echte Muster: Ausbruch auf ETH (+4,8 bp brutto) und RSI(2) auf
  beiden Märkten schlagen 100 % der Zufallskopien — aber ein Trade kostet ~12–13 bp. Der Vorteil müsste 2,5- bis 10-mal
  so gross sein. Das deckt sich mit der neuesten Studie (183 Binance-Paare: ~1,3 bp Vorteil gegen 5 bp Kosten).
- **Limit-Orders (Maker) sind kein Ausweg:** Der Band-Abpraller zahlt nur 0,02 %, wird aber genau dann gefüllt, wenn der
  Kurs weiterläuft (adverse Auswahl) — schlechter als **jede** der 200 Zufallskopien.
- **Hebel macht es nur schneller:** −6,9 bp je Trade sind bei 100× **−6,9 % je Trade** (und Liquidation schon bei 0,55 %,
  siehe oben). Schon bei 1× wäre das Konto nach den 30'618 Trades des Band-Abprallers mehrfach weg (Summe −2'121 %).
- Wer am Scalping verdient: die Börse (Gebühren) und Market-Maker mit Gebühren-Rabatten und Rechnern neben der Börse —
  nicht Privatpersonen mit 0,05 %. **Darum gibt es dafür keinen Handels-Bot.** In den Backtests bestehen nur die langsamen
  Regeln: der Pilot (Tageskerzen, Trend) und Pilot 2.0 (dieser bleibt gesperrt, bis eine Prüfung keine Blocker mehr findet).

## Futures (Hebel) — ehrlich gerechnet

`python3 tools/trading/krypto_bot/futures.py` rechnet Bitcoin-Perpetuals wie bei Binance Futures: Entscheidung am
Tagesschluss, Gebühr 0,05 %, Funding (Longs zahlen, Shorts bekommen), Liquidation über das Tagestief bzw. -hoch.
Stand 06.10.2026, Funding 0,01 % je 8 Stunden (in Boomphasen oft 0,03 %, dann noch schlechter für Longs):

| Strategie | ab 2015 pro Jahr | ab 2022 pro Jahr | schlimmster Einbruch ab 2022 |
|---|---|---|---|
| Long 1× (wie Halten, plus Funding) | +47,5 % | +1,6 % | −73 % |
| Long 2× | +24,1 % | −21,8 % | −94 % |
| Long 3× | **Konto weg** (12.03.2020) | −51,7 % | −99 % |
| Long 5× / 10× | **Konto weg** (Januar 2015) | −93,5 % / Konto weg | −100 % |
| Trend 200 Long/Short 1× | +35,0 % | **+33,6 %** | −56 % |
| Trend 200 Long/Short 2× | +7,2 % | +35,4 % | −86 % |
| Nur Short unter 200-Tage-Schnitt 1× | −11,1 % | +7,6 % | −57 % |

- **Hebel zerstört Geld.** Funding kostet Longs rund 11 % pro Jahr, und Schwankungen fressen bei Hebel überproportional
  (−50 % und +50 % ergibt −25 %). Ab 3× war das Konto in einem einzigen Crash-Tag weg.
- **Einziger Kandidat: Trend 200 Long/Short ohne Hebel.** Er schlug 95 % von 200 zeitversetzten Zufallskopien, in beiden
  Zeiträumen. Aber: Der Vorsprung ab 2022 stammt vor allem aus einer einzigen Baisse (2022), ab 2015 lag er unter Halten,
  und es wurden mehrere Regeln getestet. Das ist ein Hinweis, kein Beweis. Mit 2× Hebel stieg die Rendite kaum, der
  Einbruch aber auf −86 %.
- Gegenprobe: Eine Regel, die den nächsten Tag kennt, kommt ab 2022 auf über 50'000 % pro Jahr. Der Test findet echte
  Vorteile also.
- Tageskurse von Yahoo: An der Börse waren die Ausschläge innerhalb des Tages teils tiefer (März 2020). Echte Liquidationen
  kämen eher früher.

Der Spot-Anschluss (`broker_binance.py`) verweigert weiterhin jeden Schlüssel mit Futures-Recht. Futures laufen nur über
den Krypto-Pilot oben, mit eigenen Schlüsseln und Testnetz als Standard.

## Regel

Jeden Tag mit den Kursen bis gestern: Schwankung = EWMA der Tagesrenditen (λ 0,94), auf ein Jahr hochgerechnet.
Bitcoin-Anteil = min(100 %, 40 % ÷ Schwankung). Ruhiger Markt: voll investiert. Wilder Markt: weniger.
Andere Strategie wählen: `setx KRYPTO_STRATEGIE "halten"` (immer 100 %) oder `"trend200"`.

## 🚀 Pilot 2.0 einschalten (Spot-Long + Short + Funding-Ernte)

> ⛔ **NOCH NICHT FREIGEGEBEN (14.10.2026).** Dreizehn unabhängige Prüfungen fanden Lücken. Die Wurzel der Runden 3–6 war ein
> eigenes Coin- und USDT-Buch, das vom Konto abweichen konnte — darum ist Pilot 2.0 umgebaut auf **«Konto = Wahrheit»**: Er
> handelt nur in einem Binance-**Unterkonto**, das ihm allein gehört, und liest jeden Lauf den Kontostand. Die 8. Prüfung brachte
> eine noch strengere nachgebaute Binance und Fuzzer mit (`pruef_boerse.py`, `pruef_fuzzer.py`), die 9. Aufträge, die bis zu
> ihrer verspäteten Ankunft unbekannt sind, und Phasen «nur Stornieren», die 10. die Regel «nie Schutz verlieren, solange sich
> nichts ändern kann» (Monotonie-Fuzzer) und einen Not-Aus, der nie ein abgesichertes Paar aufbricht, die 11. einen Not-Aus-Schutz,
> der sich nach dem frischen Kurs richtet (sonst sofort zum Markt schliesst) und nie fälschlich «gesichert» meldet; ihre
> Mutationsprobe fand 15 eingebaute Fehler, die kein Test bemerkte (14 haben jetzt ein eigenes Szenario, einer ist gleichwertig),
> und dabei drei echte Fehler (Szenarien 11.F/11.S); die 12. einen Not-Aus, der zum Markt mit Teil-Ausführungen und unklaren
> Antworten umgehen kann (nachfassen bis zum Ziel, sonst ein weiter Not-Stop), ohne Kurs das Ungesicherte trotzdem schliesst und
> bei zwei gleichzeitigen Not-Aus das Buch zusammenführt statt überschreibt; die eigene Prüfkampagne danach fand vier weitere
> Fehler (Szenarien 12.F1–12.F4); ihre Mutationsprobe fand 18 eingebaute Fehler, die kein Test bemerkte — 13 haben jetzt ein
> eigenes Szenario (12.S1–12.S10, geschärft 12.p1/12.p5b), gleichwertig sind R12-M5 (der Not-Aus sperrt zwischen Lesen und
> Verkaufen nie Coins), R12-M23 (nach einer Ablehnung überspringt `nur_ergaenzen` wirksame Stops ohnehin), R12-M34 (nur eine
> Abgleich-Runde mehr) und R11-M19 (Staub-Paar) — R10-M17 hielt die 13. Prüfung zu Recht für NICHT gleichwertig (Spot-Liste im
> Not-Aus unlesbar → der Short braucht den Stop über die ganze Menge), es hat jetzt das Szenario 13.p7. Die 13. Prüfung brachte
> einen Tageslauf, der einen Not-Aus mitten im Lauf selbst zu Ende führt (er hält die Sperre; vorher handelte er nur nicht mehr
> und schloss nichts), das Buch nie über die Einträge eines gleichzeitigen Not-Aus hinweg überschreibt (3-Wege-Zusammenführen),
> einen zu grossen alten Perp-Stop auch ohne lesbare Liste über seine Kennung löscht, eine zweite Not-Aus-Schutzrunde, sobald
> dort ein Auftrag unklar wird (ist der Stand dann nicht lesbar: Lage unbekannt, beidseitig, alle Coins als frei — das fand die
> eigene Schlusskampagne, Not-Aus-Seed 9123, Szenario 13.F1), und strengere Prüfwerkzeuge (unlesbare Auftragsliste entschuldigt
> keine Lücke mehr; Limit-Lücken je Auftrag; neuer Listen-Fuzzer). Der neue Listen-Fuzzer fand dabei einen älteren stillen Fehler:
> stehen ZWEI Stops und kennt das Buch nur einen, blieb bei unlesbarer Liste der unbekannte über der Absicherung (Listen-Seed 302,
> 13.F2; Perp-Gegenstück 13.F3) — jetzt prüft der Spot-Abgleich am Kontostand nach (noch zu viel gesperrt → beidseitig), und
> nicht löschbare alte Perp-Stops merkt das Buch, bis sie weg sind. Und: was ein Not-Aus nicht sichern konnte, kommt in
> «schutz_offen» — ist STOP danach wieder weg, setzt die Nachkontrolle wenigstens die Stops (Lauf-Seed 137, 13.F4). Und: ist die Perp-Liste unlesbar und springt der Kurs vor
> dem Setzen über den Stop-Kurs UND den Not-Stop, steigt Pilot 2.0 jetzt auch ohne Liste zum Markt aus (die alten Stops aus dem
> Buch schützen bis zum Rückkauf), statt «Short evtl. OHNE Stop» zu melden (Lauf-Seed 12027, 13.F5). Alle Funde
> sind behoben und
> als feste Szenarien in `test_pilot2_streng.py`. `FREIGEGEBEN = False` bleibt, bis eine weitere unabhängige Prüfung keine Blocker
> mehr findet — bis dahin wirkt `KRYPTO_PILOT2=an` nicht (siehe «Starten» unten).

Gleiche Signale wie der Pilot, klügere Ausführung über **beide** Binance-Konten (`pilot2_plan.py` rechnet, `pilot2_live.py`
handelt; 23 + 154 + 183 Tests gegen zwei streng nachgebaute Binance, Fuzzer, Mutationsproben). Ohne `KRYPTO_PILOT2=an` handelt der
Pilot wie bisher.

**Was er tut:** Richtung long → Coin im Spot-Konto (kein Funding). Richtung short → Short-Perpetual (Hebel 1, bekommt Funding).
Freier Teil → Funding-Ernte: Coin im Spot + gleich grosser Short (marktneutral, Pfand 110 %, CROSS-Marge). Er verschiebt USDT
selbst zwischen Spot- und Futures-Teil des Unterkontos (wenn der Schlüssel das darf). Stops nur auf den Richtungsteil.

**So ist er gesichert:**
- **Ein Unterkonto nur für Pilot 2.0 («Konto = Wahrheit»):** Mit echtem Geld handelt er nur im Binance-Unterkonto, dessen
  Schlüssel `PILOT2_API_KEY` ist. Alles darin gehört ihm. Er führt kein eigenes Coin- oder USDT-Buch, das abweichen könnte, sondern
  liest jeden Lauf den Kontostand. Lege nur so viel hinein, wie er höchstens verwalten — und verlieren — darf: **mehr als im
  Unterkonto liegt, kann er nicht verlieren.** Was du später hineinlegst, setzt er ein.
- **Start nur mit leerem Unterkonto:** beim ersten Lauf nur USDT darin (keine BTC/ETH, keine Aufträge, keine Futures-Position,
  kein Futures-Guthaben) und höchstens `KRYPTO_PILOT2_KAPITAL`. Sonst handelt er nicht. Der Start wird gespeichert, BEVOR ein
  Auftrag rausgeht (ist die Datei gesperrt, z. B. durch Virenscanner oder OneDrive: kein Auftrag).
- **An dieses Konto gebunden:** Die Binance-Konto-ID (UID) merkt er beim Start. Zeigt der Schlüssel später auf ein anderes Konto
  (oder meldet Binance keine UID), handelt er nicht — und der Not-Aus fasst ein fremdes Konto nie an.
- **Not-Aus hat Vorrang vor allem** (Pause, fehlende Einstellungen, andere Bots): `stop.bat`, Cockpit, Telegram `/stop` und die
  Tagesaufgabe schliessen jeden gestarteten Modus mit dessen Schlüsseln — auch wenn du die Schalter schon umgestellt hast. Er
  liest zuerst die ganze Lage — geht das nicht, fasst er nichts an. **Nie ein Bein allein:** Coins und Short gleicher Menge (die
  Ernte) sind ein abgesichertes Paar und werden zuletzt aufgelöst. Zuerst die ungesicherten Teile: der Short über die Coins hinaus
  (Perpetual), dann die Coins über den Short hinaus — zuerst die **freien**, danach die vom Stop gesperrten, **Stop und Verkauf in
  EINER Anfrage** (cancelReplace: lehnt Binance den Verkauf ab, bleibt der Stop stehen). Dann das Paar: erst die Coins verkaufen,
  danach den Short auf die verbliebenen Coins zurückkaufen (gerundet auf den nächsten Futures-Schritt). Geht Verkaufen gerade
  nicht, bleibt das Paar stehen (netto 0); lehnt Binance den Rückkauf des Shorts ab, kauft er die verkauften Coins zurück
  (wieder netto 0) — und die Nachkontrolle löst dieses Paar danach 15 Minuten lang nicht nochmals auf (sonst kostete jeder Takt
  Gebühren); ein Not-Aus von Hand versucht es immer. Staub-Coins unter dem Binance-Minimum (unverkäuflich) sichern nichts ab: der
  Short darf dann ganz zurück, der Staub bleibt. Futures-Aufträge löscht er erst, wenn keine Position mehr offen ist (bis
  dahin schützt ein Stop den Short).
  Was danach ungesichert ist, bekommt sofort einen **Schutz-Stop**: bestehende eigene Stops bleiben (gesperrte Coins gelten als
  gesichert; ein ausgelöster, über dem Kurs hängender STOP_LOSS_LIMIT nicht), zu grosse werden verkleinert (Spot per
  cancelReplace, Perp: zuerst der passende), und ein Short über die Coins OHNE Stop hinaus behält seinen Perp-Stop. Ist das
  Verkleinern unklar oder lässt sich ein zu grosser Stop nicht löschen, sichert er die andere Seite ganz (wie beidseitig). Würde ein
  Schutz-Stop sofort auslösen (der Kurs ist inzwischen gesprungen), nimmt er den **frischen** Kurs — vom Spot-Ticker, sonst den
  Futures-Markpreis; ist auch der jenseits oder gar kein Kurs lesbar, schliesst er sofort zum Markt (Short reduceOnly
  zurückkaufen — kann nie überschiessen —, Coins verkaufen). Zum Markt schliesst er bis zu einem frisch gelesenen Ziel (der Stand
  minus das Ungesicherte — nie die Absicherung mit): führt Binance nur teilweise aus oder bleibt eine Antwort unklar, fasst er mit
  dem Rest nach (bis 5 Versuche, einen unklaren Auftrag schickt er höchstens einmal neu); geht zum Markt gar nicht (abgelehnt,
  Rate-Limit), setzt er wenigstens einen **weiten Not-Stop** (10/20/35 % vom letzten Kurs). Ist gar kein Kurs lesbar, nimmt er
  den zuletzt bekannten (jeder Lauf merkt ihn sich); fehlt auch der, schliesst er trotzdem das Ungesicherte (Short reduceOnly,
  freie Coins über den Short hinaus) und lässt das abgesicherte Paar stehen. Ist die Perp-Auftragsliste nicht lesbar, löscht er
  den im Buch bekannten alten Stop, sobald der neue steht (über seine Kennung); geht das nicht, kommen die Coins unter einen
  Spot-Stop. «Beidseitig gesichert» meldet er nur, wenn die Stops wirklich stehen; sonst «NICHT vollständig gesichert». Zwei
  Not-Aus zugleich (z. B. Cockpit und `stop.bat`) überschreiben das Buch nie: wer zuletzt speichert, führt zusammen (unklare
  Aufträge, offene Märkte, «Not-Aus offen» bleiben) und meldet dann nicht «alles zu»; hält ein anderer Lauf die Lauf-Sperre,
  schliesst der Cockpit-Not-Aus Pilot 2.0 nicht parallel (der andere Lauf sieht die STOP-Datei). «Alles zu»
  meldet er nur, wenn nachgeprüft, kein Futures-Auftrag mehr offen und kein Auftrag mehr unklar ist — danach beginnt Pilot 2.0
  beim nächsten Einschalten neu (mit Startprüfung). Sonst merkt er sich «Not-Aus offen», und die **Nachkontrolle** von `stop.bat`
  (und der Tagesaufgabe) schliesst in jedem Takt nochmals (alle 30 s, bis 11 Minuten): was verspätet ankam, was eben noch
  abgelehnt wurde. Cockpit und Telegram `/stop` starten diese Nachkontrolle selbst (wie `stop.bat`). Auch ein Not-Aus mitten im
  Lauf stoppt den Aufbau.
- **Stops nach dem Kontostand:** am Ende jedes Laufs auf die TATSÄCHLICHE Netto-Richtung (Spot-Coins + Perpetual), auch für Reste
  eines mehrtägigen Richtungswechsels: long → Spot-Stop (STOP_LOSS, beim Auslösen ein Marktauftrag), short → Perp-Stop mit Menge +
  reduceOnly (trifft nie die Ernte-Absicherung). Ein passender Stop **bleibt stehen**; muss einer ersetzt werden (anderer Kurs
  oder andere Menge), wird er **nie vorher weggenommen** — auch nicht vor dem Handeln: beim Perp-Stop steht zuerst der neue, dann
  wird der alte gelöscht; beim Spot-Stop geschehen Storno und neuer Stop in EINER Anfrage (cancelReplace) — lehnt Binance den
  neuen ab (z. B. in einer Phase «nur Stornieren»), bleibt der alte. Mehrere Spot-Stops passt er einzeln an (nie alle löschen).
  Für einen Verkauf verkauft er zuerst freie Coins; gesperrte gibt erst danach EIN cancelReplace frei (Stop → kleinerer Stop oder
  Stop → Verkauf). Lehnte Binance heute in einem Markt etwas ab (oder meldet sie das Symbol als nicht im Handel), ersetzt der
  Abgleich dort **keinen** Stop per cancelReplace: ein nicht zu grosser bleibt (er ergänzt nur), ein zu grosser bleibt AUCH stehen
  und der Markt wird beidseitig gesichert — der nächste reguläre Lauf korrigiert; ebenso die Nachkontrolle. Lässt sich ein zu
  grosser Stop nicht korrigieren (er träfe die Absicherung), sichert er den Markt beidseitig und merkt ihn für die Nachkontrolle.
  Den Perp-Stop verkleinert er erst, NACHDEM die Position verkleinert ist, und nur auf das, was dann ungesichert ist; auf die
  Grösse am Plan-Ende erst, wenn die neuen Ernte-Coins wirklich gekauft sind (frisch gelesen, Kauf-Gebühr in Coins eingerechnet) —
  wird ein Schritt abgelehnt oder bleibt er unklar, bleibt der grössere Stop. Zeigt die Auftragsliste einen eben gesetzten eigenen
  Stop noch nicht an (Coins gesperrt, Liste leer) und braucht es dort keinen Stop, löscht er ihn über die im Buch gemerkte ID; ist
  ein solcher unsichtbarer Stop grösser als nötig, sichert er beidseitig. Liegt der Kurs schon jenseits eines Stops
  (oder hängt ein ausgelöster STOP_LOSS_LIMIT über dem Kurs — auch wenn kein Stop-Kurs bekannt ist), steigt er zum Markt aus — die
  gesperrten Coins mit ihrem Stop in einer Anfrage, höchstens über die Netto-Richtung (die Ernte-Absicherung nie mit). Lehnte
  Binance heute in diesem Markt ab, bleibt ein noch wirksamer Stop stehen (kein cancelReplace) und zählt als Schutz: verkauft
  wird dann nur, was nicht darunter liegt — nie die freien Absicherungs-Coins; deckt der stehende Stop mehr als die
  Netto-Richtung, wird beidseitig gesichert. Lehnt
  Binance einen Short-Rückkauf ab, bleibt der alte Stop bzw. ein passender Not-Stop ersetzt ihn (zuerst der neue). Gibt ein Lauf
  gesperrte Coins für einen Verkauf frei, setzt er den verkleinerten Stop nie zu einem schon erreichten Kurs (Binance würde
  stornieren und den neuen dann ablehnen); storniert Binance trotzdem und lehnt den Ersatz ab, verkauft er, was der Plan
  verkaufen wollte, und der Rest bekommt am Laufende seinen Stop. Netto short: der Coin-Rest unter einem Futures-Schritt bekommt einen eigenen Spot-Stop
  (sonst wäre er nach dem Auslösen des Short-Stops ein Long ohne Stop). Liegt der Kurs schon jenseits des Stops
  (Sturz während des Laufs, Binance «würde sofort auslösen»), schliesst er sofort zum Markt — wie ein ausgelöster Stop; geht auch
  das nicht, setzt er einen Not-Stop 5 % vom frischen Kurs. Fehlt ein gültiger Stop-Kurs: der zuletzt benutzte, sonst 5 % vom
  Kurs. Kurze Störungen (503, 429) wiederholt er. Eigene Stops tragen eine Kennung (`p2s…`/`p2a…`): keine Doppel-Stops, verwaiste
  löscht der nächste Lauf. Fällt das Konto mitten im Lauf aus, setzt er die Stops trotzdem und meldet alles. Ist die Auftragsliste
  oder der Kontostand nicht lesbar, sichert er trotzdem: länger warten, sonst nach dem Stand von vorhin; gesperrte Coins gelten im
  Pilot-Konto als von einem eigenen Stop gehalten (ein neuer deckt nur den Rest — nie doppelt über die Absicherung). Was danach
  noch offen ist, meldet er laut («OHNE Stop») und merkt sich den Markt: die **Nachkontrolle** versucht es bis 11 Minuten weiter.
  Lässt sich ein alter Perp-Stop nicht löschen (zwei stehen), kommen die Coins ganz unter einen Spot-Stop (beidseitig). Ist die
  Perp-Liste nicht lesbar und kein Short mehr ungesichert (die Coins sichern ihn ganz ab), löscht er den bekannten alten Perp-Stop
  über seine Kennung — er träfe sonst die Absicherung; geht das nicht (oder kennt das Buch keinen, obwohl heute gehandelt wurde):
  beidseitig, die Nachkontrolle prüft nochmals. Das Buch kennt je Markt einen Spot- und einen Perp-Stop: liess sich ein alter
  Perp-Stop nicht löschen, merkt es ihn (`perp_weitere`) — jeder Abgleich, die Nachkontrolle und der Not-Aus löschen ihn zuerst
  (Kennung, auch ohne Liste), bis dahin bleibt der Markt beidseitig; sind nach dem Löschen eines Spot-Stops laut Kontostand noch
  mehr Coins gesperrt als nötig (ein zweiter, unbekannter Stop), wird ebenfalls beidseitig gesichert. Löst
  während des Ersetzens ein alter Stop aus und ist das Konto danach nicht lesbar, sichert ein Vorsorge-Stop die Coins.
- **Unklare Antworten** (Spot und Futures, im Lauf, beim Ausstieg und im Not-Aus): Der Markt ist für den Rest des Laufs gesperrt;
  nichts wird nachträglich «verbucht». Am Laufende fragt er per Kennung nach (mehrmals; noch offen → storniert). Bleibt ein
  Auftrag unklar, steht er im Buch, sperrt den Markt, bis Binance ihn bestätigt (nach 10 Minuten unbekannt = nie ausgeführt), und
  der Markt wird **beidseitig** gesichert: Spot-Stop über alle Coins, reduceOnly-Perp-Stop über den ganzen Short plus die unklaren
  Shorts. Löst einer aus, schützt der andere den Rest (die Ernte endet dann). Danach läuft die **Nachkontrolle**
  (`pilot.py --nachkontrolle`, in der Tagesaufgabe nach dem Lauf): alle 30 s nachfragen, bis 11 Minuten; kommt etwas an, setzt sie
  sofort die Stops nach dem Kontostand — ein verspäteter Kauf liegt höchstens einen Takt ohne Stop, ein verspäteter Short ist nie
  nackt. Ohne Offenes ist sie sofort fertig. Erscheint STOP während sie läuft, schliesst sie sofort selbst und endet (der Not-Aus
  von `stop.bat` bekommt die Sperre); hat ein anderer Lauf das Buch inzwischen geändert, überschreibt sie nichts. Ist im
  Not-Aus-Modus ein anderer Lauf aktiv, wartet sie statt still auszufallen und meldet sich, wenn es nicht klappt; im
  Not-Aus-Modus schliesst sie immer, sobald Pilot 2.0 Bestand hat (auch ohne «Not-Aus offen» im Buch). Erscheint STOP während
  eines **Tageslaufs** (Cockpit, Telegram, `stop.bat`), gibt er keine Aufträge mehr, gleicht keine Stops mehr ab (er entfernt
  oder ersetzt dann nichts) und schliesst am Ende selbst — er hält die Sperre, darum überspringt ihn das Cockpit. Grundlage für
  «nach 10 Minuten nie ausgeführt»: Binance prüft das Zeitfenster `recvWindow` (hier 10 s) beim Spot auch unmittelbar vor der
  Weitergabe an die Matching Engine (Doku «Timing security»); für Futures nennt die Doku nur «Status unbekannt» — dort ist die
  Regel eine **Annahme** (die Nachkontrolle läuft als Reserve 11½ Minuten; siehe Restrisiken).
- **Keine ungesicherte Ernte:** Pfand-Puffer in der Basis, Marge vor dem Short geprüft. Wird ein Kauf gekürzt, wird der Short
  gleich stark gekürzt; bliebe er unter dem Binance-Minimum, kauft er heute nur die Richtung. Lehnt Binance den Short ab, verkauft
  er nur die ungesicherten Ernte-Coins zurück — nie den Richtungs-Long.
- **CROSS-Marge** im Unterkonto: Der 10-%-Puffer im Futures-Teil schützt den Ernte-Short wirklich (bei ISOLATED wäre er fix).
  Das Pfand zählt nach dem **Eigenkapital** (offene Verluste des Shorts gehen ab) und wird bei jedem Lauf wieder auf 110 % des
  Shorts gebracht (aus dem Spot-Teil bzw. durch eine kleinere Ernte). Grenze: steigt ein Coin **zwischen zwei Läufen** um rund
  +100 % (oder läuft der PC tagelang nicht), schliesst Binance die Shorts zwangsweise; dann liegen die Ernte-Coins ohne
  Absicherung da. Der tägliche Lauf und der Not-Aus melden das.
- **Probelauf** (`--trocken`) sendet nichts und schreibt nichts (auch die Startprüfung bleibt scharf).
- **Buch** (`data/krypto-pilot2-bestand.json`) enthält nur Start, Konto-ID und Stop-Kennungen. Ist es unlesbar: kein Handel, nie
  überschreiben, der Not-Aus meldet nie «alles zu». Lauf, Nachkontrolle und Not-Aus speichern unter einer kurzen Buch-Sperre;
  hat ein anderer Lauf (z. B. der Not-Aus von `stop.bat`, der nach 120 s ohne Lauf-Sperre schliesst) die Datei inzwischen
  geändert, wird **zusammengeführt** (3-Wege mit dem gelesenen Stand: von jedem gilt nur, was er selbst geändert hat; unklare
  Aufträge und «Not-Aus offen» gehen nie verloren).
- Er weigert sich aufzubauen, wenn der Spot-Bot (`KRYPTO_BROKER=binance`), der ETH-Sparplan oder kopierte Telegram-Calls im
  selben Konto laufen (mit echtem Geld: nur, wenn sie denselben Schlüssel wie `PILOT2_API_KEY` benutzen).
  Echtgeld-Schlüssel: keine Auszahlungen, keine Margin-Leihe, keine Überweisung an Dritte («Universal Transfer» erlaubt, nicht nötig).
- **Nie still unverwaltet:** Wer `KRYPTO_PILOT2` entfernt, während Pilot 2.0 gestartet ist, bekommt bei jedem Lauf eine Warnung
  (seine Positionen verwaltet dann niemand); im selben Konto handelt der alte Pilot dann nicht. Ein zweiter Modus (Testnetz/echt)
  startet nie, solange einer gestartet ist; fehlen die Schlüssel eines gestarteten Modus, warnt er laut. Hat der alte Pilot beim
  Einschalten noch Positionen in seinem eigenen Konto, startet Pilot 2.0 nicht (erst `stop.bat`, das schliesst beide). Ein
  Testnetz-Stand, dessen Schlüssel das Testnetz nicht mehr annimmt, wird beim Not-Aus verworfen (Spielgeld). Erst Not-Aus, dann
  umstellen. Ein aus `KRYPTO_PILOT_MAERKTE` entfernter Markt wird automatisch abgebaut.
- Pilot 2.0 nutzt höchstens Hebel 1 (die Risiko-Stufen 1,5/1,75/2 gelten nur für den alten Pilot). Steht der Futures-Hebel wegen
  einer Position noch höher, eröffnet er keinen grösseren Short, bis er 1 ist.

**1. Zuerst im Testnetz** (Spielgeld, getrennte Test-Konten, dort kein Verschieben → beide Test-Konten brauchen USDT; alles in
den Test-Konten zählt Pilot 2.0 als seins):
```
setx BINANCE_API_KEY "spot-testnetz-key"          (testnet.binance.vision)
setx BINANCE_API_SECRET "…"
setx BINANCE_FUTURES_API_KEY "futures-testnetz-key" (testnet.binancefuture.com)
setx BINANCE_FUTURES_API_SECRET "…"
setx KRYPTO_PILOT2 "an"
python tools\trading\krypto_bot\pilot.py --lauf --trocken     (zeigt den Plan, sendet nichts)
python tools\trading\krypto_bot\pilot.py --lauf
```
Im Testnetz zusätzlich prüfen (Binance-Verhalten, das die Doku offen lässt) — das macht **`testnetz_pruefung.py`** automatisch,
mit genau den Anschlüssen von Pilot 2.0 (nur Testnetz-Adressen, nur ein Futures-Symbol ohne Position und ohne Aufträge, eigene
Aufträge `p2t…`, räumt danach auf). In einem NEUEN Fenster die Testnetz-Schlüssel nur für dieses Fenster setzen (`set`, nicht
`setx` — die echten bleiben):
```
set BINANCE_API_KEY=…   set BINANCE_API_SECRET=…   set BINANCE_FUTURES_API_KEY=…   set BINANCE_FUTURES_API_SECRET=…
python tools\trading\krypto_bot\testnetz_pruefung.py          (liest nur: Schlüssel, Regeln, Symbol leer? — sendet nichts)
python tools\trading\krypto_bot\testnetz_pruefung.py --los    (prüft A1–A5 und B1–B6, rund 1 Minute, räumt auf)
```
- **A — reduceOnly-Perp-Stop über mehr als den offenen Short** (so sichert Pilot 2.0 einen Markt beidseitig): angenommen? bleibt
  er stehen? zwei gleichzeitig (Phase «zuerst neu setzen, dann alten löschen»)? Lehnt Binance ab, sichert er wenigstens den
  offenen Short und meldet es.
- **B — `POST /api/v3/order/cancelReplace`** (Stop ersetzen, Not-Aus-Verkauf): Bleibt der alte Stop stehen, wenn Binance den
  neuen Auftrag ablehnt (würde sofort auslösen, Filter, zu wenig Coins), und liest Pilot 2.0 jede Antwort richtig? Kennt Binance
  den Weg nicht (404), arbeitet Pilot 2.0 wie früher (stornieren, dann neu).
Ergebnis: Bildschirm und `data/krypto-pilot2-testnetz-pruefung.json` (Rückgabe 0 = wie erwartet, 1 = Abweichung, 2 = nicht
geprüft). Weicht etwas ab, gehört das vor dem Echtgeld-Start in die nächste Prüfung.
**Bekannte Restrisiken (kein Code kann sie ganz ausschliessen):** springt der Kurs genau in den Millisekunden zwischen «neuen
Perp-Stop setzen» und «alten löschen» über beide, lösen beide aus (überkaufen bis zur Absicherung) — ist dann zugleich Spot nicht
lesbar UND lehnt Binance jeden Spot-Auftrag ab, bleiben Coins kurz ohne Stop. Storniert Binance bei cancelReplace in einer Phase
«nur Stornieren» entgegen der Doku zuerst und lehnt dann ab, geht der ersetzte Stop verloren (Prüfpunkt B zeigt das Verhalten;
Pilot 2.0 ersetzt darum nach einer Ablehnung — und wenn Binance das Symbol nicht im Handel meldet — keine Stops mehr; ist der
erste Schreibauftrag eines Laufs ein cancelReplace, bleibt das Risiko). Kommt ein unklarer **Futures**-Auftrag erst nach mehr als
10 Minuten an (die Doku belegt das Zeitfenster nur für Spot), ist er bis zum nächsten Lauf ohne Stop; der Lauf sieht ihn am
Kontostand («Konto = Wahrheit») und setzt die Stops danach. Bietet Binance für ein Paar keinen Markt-Stop (STOP_LOSS) an,
nimmt Pilot 2.0 STOP_LOSS_LIMIT (Limit 5 % unter dem Stop-Kurs): springt der Kurs in einer Lücke über das Limit, bleibt der
ausgelöste Stop unausgeführt liegen, bis Pilot 2.0 ihn sieht (nächster Abgleich, Nachkontrolle oder Tageslauf — dann steigt er
zum Markt aus; lehnt Binance das bis zum Schluss ab, kommt an seine Stelle ein Not-Stop unter dem Kurs).
**2. Echtes Geld — mit eigenem Unterkonto, klein anfangen:**
1. Binance → Konto → **Unterkonten** → «Unterkonto erstellen» (für verifizierte Konten mit 2FA, laut
   [Binance-FAQ](https://www.binance.com/en/support/faq/binance-sub-account-functions-and-frequently-asked-questions-360020632811)
   bis zu 5 Unterkonten). Im Unterkonto **Futures eröffnen** (Einweg-Modus).
2. Vom Hauptkonto **nur den Einsatz** ins Spot-Konto des Unterkontos überweisen (gebührenfrei), z. B. 500 USDT. Nichts anderes hineinlegen.
3. **Im Unterkonto** einen API-Schlüssel erstellen: ✅ Spot-Handel, ✅ Futures, optional ✅ Universal Transfer, ❌ Auszahlungen,
   ❌ Margin, ❌ interne Überweisung; am besten auf deine IP beschränkt.
```
setx PILOT2_API_KEY "…"                   (Schlüssel des UNTERKONTOS)
setx PILOT2_API_SECRET "…"
setx KRYPTO_PILOT2_KAPITAL "500"          (so viel liegt im Unterkonto — Pflicht)
setx BINANCE_TESTNET "false"
setx BINANCE_FUTURES_TESTNET "false"
setx KI_BOT_ECHTGELD "JA, MIT ECHTEM GELD"
```
Danach **zuerst** `pilot.py --lauf --trocken` und den Plan lesen. Ohne «Universal Transfer» meldet er, wie viel USDT du im
Unterkonto von Hand in den Futures-Teil schieben sollst. **Mindestbetrag:** Binance verlangt für einen BTC-Short mindestens
100 USDT — unter rund 500 USDT läuft die Ernte für BTC nicht, dann liegt der freie Teil einfach als USDT da.
**Risiko (Belastungstest oben):** zwischendurch −20 bis −40 % möglich, etwa jedes sechste Jahr im Minus. Nur Geld einsetzen,
dessen Verlust du verkraftest. Keine Anlageberatung.

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
python3 tools/trading/krypto_bot/test_krypto.py   # 19 Tests, inkl. Futures-Mechanik und nachgebautem Alpaca-Server
python3 tools/trading/krypto_bot/test_pilot.py    # 91 Tests, inkl. Risiko-Stufen (1 / 1,5 / 1,75 / 2), Sperre, Not-Aus mitten im Lauf, Algo-Stops und nachgebautem Binance-Futures-Server
python3 tools/trading/krypto_bot/test_sammler.py  # 48 Tests, inkl. nachgebautem Binance-Server mit Staking, verlorenen Antworten, Ablehnungen und Opt-in
python3 tools/trading/krypto_bot/test_infos.py    # 26 Tests: keine Zukunftsdaten, MVRV-Bremse, Zwischenspeicher
python3 tools/trading/krypto_bot/test_profit.py   # 45 Tests: getrennte Bücher, offen unbekannt, BNB-Gebühren, Ein-/Auszahlungen, Seitengrenze, Drosselung
python3 tools/trading/krypto_bot/test_cockpit.py  # 120 Tests: Claude, Schattenkonto, Cockpit, Knöpfe, Host/Einbetten, Ampel, Not-Aus, Telegram, Startdateien
python3 tools/trading/krypto_bot/test_calls.py    # 84 Tests: 40 typische Call-Formate, Plausibilität, Antworten/Wiederholungen, Nachspielen, Zufallsprobe, Kopierer gegen nachgebauten Binance-Server
python3 tools/trading/krypto_bot/test_binance.py  # 21 Tests, inkl. nachgebautem Binance-Server mit Signaturprüfung
python3 tools/trading/krypto_bot/test_pilot2_plan.py  # 23 Tests: Pilot-2.0-Rechnung (Richtung, Ernte, Pfand, Mindestbeträge)
python3 tools/trading/krypto_bot/test_pilot2_live.py  # 154 Tests: Pilot 2.0 («Konto = Wahrheit») gegen eine strenge nachgebaute Binance
python3 -B tools/trading/krypto_bot/test_pilot2_streng.py  # 183 Tests: Belege der 8.–13. Prüfung, Schlussproben, Fuzzer-Funde gegen die Prüf-Börse, kleine Fuzzer
python3 -B tools/trading/krypto_bot/test_maxprofit.py      # 55 Tests: Max-Profit-Kern (gleiches Modell wie der Pilot, Kelly-Optimum, keine Zukunftsdaten, Kosten; Pilot 2.0 mit Hebel: = lauf2 bei 1×, Pfand-Regel, bei festem Kurs nie liquidiert)
python3 -B tools/trading/krypto_bot/test_testnetz_pruefung.py  # 47 Tests: das Testnetz-Prüfskript gegen die Prüf-Börse (nur 127.0.0.1)
python3 -B tools/trading/krypto_bot/pruef_fuzzer.py notaus 0 1600     # grosser Fuzzer (für Prüfungen): Not-Aus unter harten Störungen
python3 -B tools/trading/krypto_bot/pruef_fuzzer.py laeufe 0 200 30   # … Läufe über 30 Tage, Störungen in jedem Schritt
python3 -B tools/trading/krypto_bot/pruef_fuzzer.py monotonie 0 400   # … Phase «nur Stornieren» (ab Laufbeginn oder mittendrin): nie Schutz verlieren
python3 -B tools/trading/krypto_bot/pruef_fuzzer.py listen 0 400      # … eine eigene Auftragsliste dauerhaft unlesbar (13. Prüfung)
python3 tools/trading/krypto_bot/test_scalping.py      # 50 Tests: kein Blick in die Zukunft, strenge Füll-Regeln, Kosten exakt, Entscheidungsregeln
python3 tools/trading/krypto_bot/test_news_waechter.py # 32 Tests: Alarm-Regeln, keine Fehlalarme, nur einmal melden, kein Fluten, Delistings jede Minute, Telegram-Kanäle
python3 tools/trading/krypto_bot/test_delisting.py     # 36 Tests: Ankündigungen lesen, Einstieg/Ausstieg, Funding, Zufallsprobe (ohne Netz)
python3 tools/trading/krypto_bot/delisting_pruefung.py # Prüfstand Delisting-Short (lädt Binance-Kurse); --bericht = Tabelle
python3 tools/trading/krypto_bot/test_alle_coins.py    # 12 Tests: Universen Top 10/Meme/Alle, Trend-Auswahl, kein Blick in die Zukunft
python3 tools/trading/krypto_bot/alle_coins_pruefung.py # Prüfstand Meme-Coins, Top 10 und alles (lädt alle Binance-Paare)
python3 tools/trading/krypto_bot/test_copytrading.py   # 24 Tests: Filter «kopierbar», Rangkorrelation, Vorwärts-Test (ohne Netz)
python3 tools/trading/krypto_bot/copytrading_pruefung.py  # Prüfstand Copy-Trading (Binance-Leadtrader); --auswerten = Vorwärts-Test nach 30 Tagen
python3 tools/trading/krypto_bot/scalping_pruefung.py  # Prüfstand Scalping (lädt beim ersten Lauf ~200 MB Binance-Minutenarchive); --bericht = Tabelle
python3 tools/trading/krypto_bot/pilot_pruefung.py   # Prüfstand: Stop, Trendlänge, Schwankungsziel, Ethereum
python3 tools/trading/krypto_bot/info_pruefung.py    # Prüfstand: 13 freie Markt-Infos
python3 tools/trading/krypto_bot/hebel_pruefung.py   # Prüfstand: 1× bis 10× Hebel
python3 tools/trading/krypto_bot/test_gewinner.py     # 12 Tests: tote Coins, keine Zukunftsdaten, Filter, Simulation
python3 tools/trading/krypto_bot/gewinner_pruefung.py # Prüfstand «Gewinnern folgen» (lädt zuerst alle Binance-Paare)
```
