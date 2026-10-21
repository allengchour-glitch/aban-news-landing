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
   Ruhezustand, holt Windows den Lauf beim nächsten Start nach. Der Knopf legt dazu eine **zweite Aufgabe «Krypto-Pilot-Nachkontrolle»**
   an: alle 10 Minuten (und, sobald Windows den Benutzer meldet, zusätzlich bei der Anmeldung) startet sie **unsichtbar** (`krypto-nachkontrolle-still.vbs` → `krypto-auto.bat nachkontrolle`)
   die Nachkontrolle von Pilot 2.0 — ohne Vermerk im Buch ist sie nach einer Sekunde fertig, mit Vermerk setzt sie fehlende Stops nach,
   auch wenn der Tageslauf mit dem Prozess gestorben ist (Fenster zu, Neustart). Sie schreibt bei jedem Start ein Lebenszeichen
   (`data\krypto-nachkontrolle-lebt.txt`) und nach jedem Durchgang den Rückgabewert (`data\krypto-nachkontrolle-rc.txt`, auch wenn kein Buch da ist); die Cockpit-Ampel «Nachkontrolle (Aufgabenplanung)» ist grün (Rückgabewert 0), grau mit ⚠ «WARNUNG» (3: ein Markt weiterhin nicht vollständig gesichert — die Meldung kommt aufs Handy, höchstens einmal je Stunde; die Kopfzeile der Gesundheits-Karte zählt sie mit) und rot bei 30 Minuten Stille, bei einem Absturz (jeder andere Rückgabewert, auch negative), wenn ein Durchgang seit mehr als 15 Minuten nie zu Ende ging, wenn bei frischem Lebenszeichen der letzte Rückgabewert älter als 30 Minuten ist, wenn die Warnung in zwei Durchgängen hintereinander steht (rund 20 Minuten) oder wenn vier Durchgänge hintereinander übersprungen wurden, weil ein anderer Lauf die Lauf-Sperre hielt (dafür führt `pilot.py` die Reihe in `data\krypto-nachkontrolle-serie.json`). Beide Aufgaben laufen nur, solange du am PC angemeldet bist
   (wie die tägliche: `InteractiveToken`).
   Von Hand (ohne diese beiden Einstellungen) — die inneren
   Anführungszeichen sind nötig, sobald der Pfad ein Leerzeichen enthält (`C:\Users\Max Muster\…`, OneDrive):
   `schtasks /create /sc daily /st 02:30 /tn "Krypto-Pilot" /tr "\"C:\…\tools\trading\krypto_bot\krypto-auto.bat\" auto" /f`
   und `schtasks /create /sc minute /mo 10 /tn "Krypto-Pilot-Nachkontrolle" /tr "wscript.exe //B //Nologo \"C:\…\tools\trading\krypto_bot\krypto-nachkontrolle-still.vbs\"" /f`.
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
Windows-Aufgaben «Krypto-Pilot» für 02:30 und «Krypto-Pilot-Nachkontrolle» alle 10 Minuten an — kein schtasks-Befehl mehr von Hand) · **⬇️ Update holen** (`git pull --ff-only`,
danach Cockpit neu starten) · und rot **🛑 Not-Aus** (schliesst
sofort alle Pilot-Positionen und stoppt alles). Darunter die **🩺 Gesundheit**: Schlüssel gesetzt? letzter Lauf frisch? tägliche Aufgabe eingerichtet? Not-Aus? Markt-Infos
aktuell? letzter Lauf mit Aufträgen ohne Warnung? tägliche Datei `krypto-auto.bat` gelaufen? Nachkontroll-Aufgabe läuft (Lebenszeichen frisch)? — rot heisst handeln, grau ist optional. Jeder Knopf startet genau das Skript, das man sonst von Hand startet —
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
- **Die Tabelle gilt fürs GANZE Konto.** Der Pilot setzt aber standardmässig nur `KI_BOT_ANTEIL` = 50 % des Kontos ein (und baut höchstens
  `KI_BOT_MAX_AUFTRAG` = 1000 USDT je Auftrag und Lauf auf). Mit dem Standard wirken Rendite UND Einbruch aufs Gesamtkonto etwa halb so
  stark (1,75× bei 50 % ≈ 0,875× Gesamtkonto). Mehr Rendite lässt sich also auch über den Anteil holen — dieselbe Risiko-Abwägung wie
  bei der Stufe, und beides zusammen multipliziert sich. Das Cockpit nennt den eingestellten Anteil in der Rückfrage vor der Stufenwahl.

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

> ⛔ **NOCH NICHT FREIGEGEBEN (20.10.2026).** Sechzehn unabhängige Prüfungen fanden Lücken. Die Wurzel der Runden 3–6 war ein
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
> Verkaufen nie Coins — gilt nur ohne einen zweiten, gleichzeitigen Not-Aus, Hinweis der 14. Prüfung), R12-M23 (nach einer Ablehnung überspringt `nur_ergaenzen` wirksame Stops ohnehin), R12-M34 (nur eine
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
> Buch schützen bis zum Rückkauf), statt «Short evtl. OHNE Stop» zu melden (Lauf-Seed 12027, 13.F5). Die Mutationsprobe auf dem Endstand der 13. Runde (153 Muster) meldete 19 nicht erkannte oder
> nicht mehr passende: 5 durch den Umbau verschobene Muster (neu formuliert, erkannt), 1 wirkungsloses (`set() or X` ist `X`; ersetzt,
> erkannt), 7 echte Lücken (6 neue Szenarien: 13.p4c, 13.G1–13.G5) und R12-M21, das seit Runde 13 doppelt abgesichert ist (beide Stellen
> zusammen erkennt 12.S4). **148 von 153 erkannt; die 5 offenen sind gleichwertig:** R10-M4b («Not-Aus offen» setzt einen gestarteten
> Modus voraus, dann gilt «mit Bestand» ohnehin) und R11-M19, R12-M5, R12-M23, R12-M34 (siehe oben).
> Die **14. Prüfung** (Technik «echte Verzahnung»: ein Tageslauf hält vor seiner n-ten Anfrage an, ein zweiter Lauf läuft ganz mittendrin —
> viermal 959 Verzahnungen von Tageslauf und Not-Aus/STOP/Nachkontrolle, dazu 2'877 mit einem unklaren Auftrag des anderen Laufs, dazu
> 5'200 + 2'200 Zufalls-Seeds: 0 Befunde) fand **einen Blocker unter einer Bedingung**, drei wichtige und sechs kleine Funde. Der Blocker
> (F1): zeigt Binance einen eben gesetzten Algo-Stop mehrere Listenabfragen lang nicht (Antwort verloren, die Liste hinkt nach — ob das
> real vorkommt, klärt nur das Testnetz: neue Prüfpunkte A6–A8), wurde er am Laufende vergessen, und neben dem kleinen stand ein zweiter,
> zu grosser Perp-Stop, der beim Auslösen die Absicherung zurückkaufte (7'880 USDT). Jetzt wird jeder im Buch bekannte Stop, den die
> lesbare Liste nicht zeigt, nach dem neuen Stop über seine Kennung gelöscht (14.F1; Spot-Gegenstück 14.F1s). F2: kein −2022-Rückfall bei
> unlesbarer Perp-Liste (9'400 USDT; im strengen Fuzzer bis 30'637): jetzt mit frisch gelesener Position, und würde auch der kleinere
> Stop sofort auslösen, steigt er zum Markt aus. F3: der Spot-Abgleich ohne lesbare Liste stieg bei fallendem Kurs nicht zum Markt aus
> (9'092 USDT). W: die Prüf-Werkzeuge waren zu gutmütig — der Fuzzer hat jetzt einen **strengen Modus** (`PRUEF_STRENG=1`: reduceOnly
> über der Position wird abgelehnt, Störungen auf den ersten Anfragen mit endlichen Anzahlen, «unsichtbar» bis zu 8 Listenabfragen,
> Kurssprünge im Listen-Fuzzer). **Er fand sofort weitere echte Lücken (E2–E5, nur im Tageslauf-Fuzzer):** E2 ein Spot-Stop, den die
> Liste verzögert zeigt, sperrt Absicherungs-Coins — die Stops lagen still über der Netto-Richtung (Lauf-Seeds 20568, 20803, 20473, 20736;
> bis 4'066 USDT): jetzt zählen gesperrte, aber nicht gelistete Coins als gedeckt, und eine Kontoprobe nach jeder Abgleich-Runde sichert
> den Markt beidseitig, wenn mehr gesperrt ist als nötig. E3 der Not-Aus löschte mit veralteten Zahlen (Kontostand nicht lesbar) den
> Perp-Stop, während ein Spot-Stop über Paar-Coins blieb (Lauf-Seed 20557): auf veralteten Zahlen verkleinert und löscht er nie einen
> Stop. E3b ein Not-Stop über offenem plus unklarem Short wurde mit −2022 abgelehnt (Lauf-Seed 20369). E4 Prüf-Werkzeug: gestapelte
> endliche Störungen auf dem Schutzpfad, die Pilot 2.0 alle Versuche nehmen, zählen wie eine dauerhafte; Coins, die das Buch nicht kennt,
> sind am Ende kein Befund. E5 der Vorab-Stop (nach dem Ernte-Kauf, vor dem Short) richtete sich nach dem ungekürzten Endziel des Plans:
> beim Auftragsdeckel (`KI_BOT_MAX_AUFTRAG`) oder einem zu kleinen Kauf blieb ein Teil des Shorts bis zum Abgleich am Laufende ohne Stop —
> bricht der Lauf vorher ab (STOP, Absturz), bis zur Nachkontrolle (Lauf-Seed 22466): jetzt zählen die tatsächlichen Coins und die noch
> ausstehenden neuen Shorts dieses Laufs (die Mutation R11-M12 «Gebühr beim Plan-Ende» entfällt damit, die Gebühr steckt in den
> tatsächlichen Coins). **E6** (Standard-Fuzzer der Schlusskampagne, eine Regression von E5; Lauf-Seeds 17244, 17363, 17706, 221–943 USDT): die
> Vorab-Stufe 2 verkleinerte den Perp-Stop auf den Stand vor dem neuen Short; konnte der Abgleich danach nicht lesen (Kontostand dauerhaft
> unlesbar), blieb der neue Short bis zur Nachkontrolle teilweise ohne Stop — laut gemeldet, aber von Pilot 2.0 selbst verursacht (am Stand
> vor E5 gab es die Lücke nicht). Jetzt nie unter das Plan-Ende (tatsächliche Coins plus ausstehende neue Shorts); ein darüber liegender Stop
> wird weiter auf das Plan-Ende verkleinert. **Lehre:** jede Änderung am Schutzpfad, die Stops verkleinert oder vergrössert, braucht die GANZE
> Kampagne neu (Standard- und strenger Modus), nicht nur den Seed, der sie auslöste — und die Neuauflage fand prompt **E7** (Standard-Lauf-Seed
> 15519, 33 USDT): Vorab ersetzte einen Perp-Stop schon bei EINEM Schritt Überschuss (den die Rundung des Plans ohnehin erklärt); war die Position danach
> dauerhaft unlesbar, blieb ein alter Spot-Stop über der Netto-Richtung, den der Abgleich hätte verkleinern sollen, und der verkleinerte Perp-Stop
> deckte seine Folge nicht mehr. Jetzt ersetzt Vorab nur bei mehr als `VORAB_TOLERANZ` = 2 Schritten Überschuss. Klein: K1 beide Läufe ändern den Perp-Stop (die Kennung des anderen kommt ins Gedächtnis), K2 die unklaren
> Aufträge werden in jeder Abgleich-Runde frisch gelesen, K3 Short-Staub ≤ 10 USDT, K4 kein Dauer-Alarm der Nachkontrolle nach einer
> Ablehnung, K5 zwei gestartete Modi (Not-Aus und Nachkontrolle binden je Modus dessen eigene Verbindung; der Tageslauf schliesst bei
> STOP auch einen fremden Modus), K6 `krypto-auto.bat` ruft im Not-Aus-Zweig die Nachkontrolle.
> **Endstand der 14. Runde (Stand `13ea88432` eingefroren, danach nur Tests und Doku):** Schlusskampagne **212 Aufträge = 25'000 Fuzzer-Läufe, 0 echte
> Befunde** (735 begründete Einträge der bekannten Klassen) — Standardmodus Not-Aus/Listen/Monotonie/Läufe ×30 je 15000–18000, strenger Modus
> Not-Aus/Listen/Monotonie 20000–23000 und Läufe ×30 20000–24000; die Kampagne wurde dreimal gestartet — die ersten beiden Läufe brach ich nach einem
> Befund ab (E6, E7, siehe oben), der dritte lief vollständig durch. Mutationsprobe am Endstand
> (208 Muster, davon 57 der 14. Runde): erst 187 erkannt, 21 offen. 12 davon waren Lücken meiner eigenen Korrekturen, die kein Test einzeln pinnte oder die
> seit E2/E3/K2 eine zweite Schicht verdeckt (Kontoprobe, «nie löschen auf veralteten Zahlen»): neue Tests 14.F1a–f (Zweige der F1-Korrektur),
> 14.D1–D7 (die ÄLTERE Schicht allein: direkter Aufruf bzw. zweite Schicht abgeschaltet), 14.F2a/b, 14.F3b, 14.K1b, 14.K5b, 14.E2c/d, 14.E3-Spot/-Perp.
> **199 von 208 erkannt; die 9 offenen sind gleichwertig:** R10-M4b, R11-M19, R12-M5, R12-M23, R12-M34 (siehe oben) und neu M14 (K2 setzt `unklar_sell` in
> jeder Abgleich-Runde, die Zuweisung davor ist tot), R14-M7 (der Schutzgurt `aktuell_cid` greift nur, wenn die Kennung des NEUEN bzw. des sichtbar
> passenden Stops schon als «versteckt» im Buch stünde — sie ist frisch bzw. in der Liste sichtbar), R14-M49 (die Zuweisung `stand_frisch = True` nach der
> erneuten Lesung wird nur erreicht, wenn der Stand schon frisch war) und R14-M53 (ein reduceOnly-SELL gibt es auf dem Futures-Konto nicht; reduceOnly-Schritte
> sind Rückkäufe). Tests: streng 286, live 154, pilot 91, cockpit 123, testnetz 61, plan 23 (alle grün). Alle Funde sind behoben und
> als feste Szenarien in `test_pilot2_streng.py`. `FREIGEGEBEN = False` bleibt, bis eine weitere unabhängige Prüfung keine Blocker
> mehr findet — bis dahin wirkt `KRYPTO_PILOT2=an` nicht (siehe «Starten» unten).
> **Folge-PR zur 14. Runde (Zusatzkampagnen auf frischen Seeds, die 15. unabhängige Prüfung, die Lücken-Kampagne `luecken2`):** vier Kampagnen ausserhalb der Schlusskampagne —
> Tageslauf-Fuzzer im Standardmodus (Lauf-Seeds 50000–52000) und im strengen Modus (60000–62000), Not-Aus-/Listen-/Monotonie-Fuzzer (Standard 30000–33000, streng 40000–43000)
> und ein neuer gezielter Modus `PRUEF_LUECKEN=1` (Konto IMMER ohne STOP_LOSS, dreimal so viele Kurssprünge — der Weg «hängender Stop-Limit»; Lauf-Seeds 90000–90600,
> streng 92000–92600, dazu Not-Aus 94000–96040 und streng 97000–99000). Sie fanden acht weitere echte Lücken, **alle älter als die 14. Runde** (am Stand davor ebenso
> ein Befund), keine ist eine Regression. **E8** (Lauf-Seed 50802): der Not-Aus (und die UID-Prüfung der Nachkontrolle) las die Lage VOR dem Handeln mit dem kurzen Budget
> (3 Versuche); nach drei Fehlversuchen in Folge gab er auf («NICHTS angefasst»), und eine eben gekaufte Position blieb bis zur Nachkontrolle ohne Stop. Jetzt das lange
> Budget (5 Versuche). **E9** (Lauf-Seed 51170, 387 USDT): Vorab verkleinerte den Perp-Stop auch dann, wenn die Spot-Stops noch zu gross waren (eben noch beidseitig
> gesichert) — war das Konto danach dauerhaft unlesbar, konnte der Abgleich die Spot-Stops nicht mehr korrigieren, und der kleinere Perp-Stop deckte ihre Folge nicht
> mehr. Jetzt verkleinert Vorab erst, wenn die Spot-Stops nicht grösser sind als nötig. **E10** (Lauf-Seed 51587, 279 USDT; im Szenario 8'445 und 16'898 USDT): ein
> ausgelöster STOP_LOSS_LIMIT hängt über dem Kurs (Kurslücke, Konto ohne STOP_LOSS), der Ausstieg per cancelReplace bleibt in allen drei Abgleich-Runden unklar (503) —
> den Rückfall «Not-Stop an seine Stelle» gab es nur bei «abgelehnt», nicht bei «unklar»; die Coins des hängenden Auftrags galten als «Stop ausserhalb der Liste», der Long
> stand ohne wirksamen Stop da. Jetzt kommt auch nach «unklar» zum Schluss ein Not-Stop, und geht cancelReplace dauerhaft nicht (oder kennt Binance es nicht), wird der
> hängende — er schützt ohnehin nichts, wie im Not-Aus — normal gelöscht und aus den freien Coins (höchstens seine Menge) ein Not-Stop gesetzt; war er schon weg (−2011),
> kam einer der unklaren Versuche an, und es wird nichts weiter gesetzt (`Spot.abbrechen` meldet jetzt, ob es storniert hat). **E11** (Not-Aus-Seed 30189, später
> auch 42117): ohne Buch sieht der Not-Aus das Pilot-Konto nur an; ein Rest knapp über 5 USDT, den Binance nach dem Abrunden auf die Schrittweite nicht verkauft
> (4,995e-05 BTC: roh 5,006, abgerundet 4,0 USDT), galt als «das Buch kennt es nicht» — jeder weitere Not-Aus meldete «NICHT alles zu». Jetzt zählt wie beim Schliessen
> der verkaufbare Teil. **E12** (Lücken-Lauf-Seed 90256, 300 USDT): STOP kommt mitten im Lauf nach einem neuen Short (sein Stop folgt erst im Abgleich am Laufende) und das
> Konto ist dauerhaft unlesbar — der Not-Aus des Laufs liest die UID nicht («NICHTS angefasst»). Wird STOP wieder aufgehoben, schützte die Nachkontrolle den neuen Short
> nicht (`schutz_offen` war leer). Jetzt vermerkt der Lauf, sobald STOP mitten im Lauf kommt, die Märkte, in denen er gehandelt hat, in `schutz_offen`, bevor er den Not-Aus
> versucht. (Ein Vermerk schon VOR dem ersten Auftrag deckte auch den harten Prozess-Abbruch ab, öffnete aber der Nachkontrolle ein Fenster, in dem sie Stops für einen Markt
> setzte, den der Tageslauf noch bearbeitete — der Verzahnungsscan der 14. Prüfung fand dabei 2'500 USDT; verworfen, siehe «Bekannte Restrisiken».) **E13** (strenger Lücken-Lauf-Seed 92202, 218 USDT): es hängen MEHRERE
> ausgelöste Stop-Limits (Stop + Zusatz-Stop); der Ausstieg bricht nach der ersten Ablehnung ab, und der Rückfall kannte nur den einen, dessen Verkauf gescheitert war.
> Jetzt merkt sich der Abbruch alle hängenden dahinter (mit der Soll-Menge verteilt), und der Rückfall am Ende ersetzt jeden. **E14** (strenger Lücken-Lauf-Seed 92330,
> 296 USDT): «würde sofort auslösen» führte nur beim ERSTEN Stop-Preis zum Ausstieg zum Markt; scheiterte der erste Preis an Verbindungsabrissen und sprang der Kurs dann über den
> Not-Stop-Preis, blieb der Short «OHNE Stop». Jetzt bei jedem Preis. **E15** (Lücken-Not-Aus-Seed 95297, 59 USDT): ein ausgelöster STOP_LOSS_LIMIT hängt, der Rückkauf des
> Shorts geht nicht und der Kurs-Abruf ist dauerhaft gesperrt — der Not-Aus-Schutz erkannte den hängenden Stop nur, wenn der (veraltete) Kurs unter seinem Limit lag; der alte
> Kurs lag darüber, also blieb der Long ohne wirksamen Stop. Jetzt zeigt «isWorking» allein den hängenden Stop (ein ausführbarer Limit-Auftrag wäre sofort weg), im
> Not-Aus-Schutz, im Spot-Abgleich und im Rückfall am Ende. **Prüf-Werkzeuge:** der Fuzzer stufte ein «Perp-Stop über Netto», das nur vom selben ungesehenen
> hängenden Stop-Limit herrührt, nicht wie dessen `LONG_OHNE_STOP` als bekannte Limit-Lücke ein (strenger Lauf-Seed 60471, Not-Aus bei dauerhaft unlesbarer Spot-Liste); das
> Löschen eines hängenden Stop-Limits zählt nicht als «Pilot 2.0 hat einen Stop selbst entfernt» (die Prüf-Börse markiert es); neu der Börsen-Schalter `ersetzen_fehlt`
> (HTTP 404) und der Fuzzer-Modus `PRUEF_LUECKEN=1` (`laeufe`, `notaus`). **Bekanntes Restrisiko:** ist die Spot-Liste dauerhaft unlesbar, sieht Pilot 2.0 einen hängenden Stop-Limit
> nicht (aus dem Buch liesse sich ableiten, dass sein Stop-Kurs erreicht ist — nicht gebaut); das bleibt als `LIMIT_LUECKE_` eingestuft und betrifft nur Konten ohne STOP_LOSS-Typ.
> **15. unabhängige Prüfung** (Belege p1–p22, enger Auftrag; Technik «Ausfall-Raster»: Tag 0 baut eine Lage, Tag 1 läuft mit zwei gekoppelten Störungen — eine schreibende und
> eine lesende, ab demselben Zeitpunkt —, geprüft wird nach dem Lauf, nach der Nachkontrolle und nach einem Kurssprung; dazu der Erhaltungssatz «kein dem Buch unbekannter eigener
> Perp-Stop an der Börse»): **1 Blocker + 1 wichtig + 1 Lücke im Testnetz-Prüfplan + 4 klein.** **G1 (Blocker, 7'880 USDT im Test, im Raster bis 9'985)**: Vorab setzt den
> kleineren Perp-Stop und löscht dann die alten; scheitert das Löschen (503) und ist danach die Perp-Liste unlesbar, standen alt und neu zusammen über dem Short — niemand
> kannte den alten, und beim Auslösen kaufte er die Absicherung zurück. Der zufällige Fuzzer fand das auf Tausenden Seeds nie, weil es eine genaue Folge braucht (Löschen
> scheitert NACH dem Setzen UND danach ist die Liste unlesbar). Jetzt merkt das Buch jeden nicht gelöschten alten Stop (`perp_weitere`), der Markt ist beidseitig gesichert
> (`_zu_gross`) und die Nachkontrolle angestossen. **G1b (5'369 USDT)**: kam der NEUE Stop trotz Fehlermeldung an (Antwort verloren) und lässt sich seine Kennung nicht löschen,
> war er ebenso unbekannt: jetzt gemerkt, derselbe Schutz. **G2 (5'423 USDT)**: `_buch_vereinen` mischte (algoId, Kennung) des aktuellen Perp-Stops feldweise — änderten beide Läufe
> den Stop, entstand ein Hybrid aus der ID des einen und der Kennung des anderen; jetzt ist das Paar EINE Identität (nur ich geändert → meines, nur der andere → seines, beide →
> meines, ausser es ist leer; der Stop des anderen kommt als Paar ins Gedächtnis). **W3**: das Testnetz-Prüfskript prüfte A6/A8 nur, wenn Binance den Stop ohne Position (A1) annahm
> — der wahrscheinlichste Ausgang ist die Ablehnung, dann blieben sie unbeantwortet. Jetzt holt es A6/A8 mit offenem Short nach, und neu **A9** (Storno unmittelbar nach dem Setzen,
> ohne vorher die Liste zu lesen — meldet Binance «Erfolg» oder «−2011», der Stop steht aber, ist «weg» falsch: Gespenst-Stop) und **A10** (Storno eines schon AUSGELÖSTEN Stops;
> der Stop sitzt knapp über dem Markt, das Skript wartet bis 60 s auf die Aufwärtsbewegung, sonst «nicht geprüft»). **K-a** die Startprüfung zählt wie der Not-Aus (abgerundet auf die
> Schrittweite, Mindestbetrag) statt roh 5 USDT — 4,995e-05 BTC sind Staub, kein Grund, den Start zu verweigern. **K-c** Fuzzer-Einstufung: die Störung `nur_storno` (409: der alte Stop
> storniert, der neue abgelehnt) ist dasselbe Restrisiko wie die Börsen-Lesart «Storno zuerst» (Testnetz-Prüfpunkt B). **K-d** die Statuszeile behauptete «beidseitig gesichert (unklarer
> Auftrag)», auch wenn die Stops scheiterten. **K-e** scheiterte ein Perp-Stop-Versuch und liess sich seine Kennung nicht löschen, merkte nur `_stops_vorab` sie — jetzt an allen fünf
> Stellen (`_perp_notstop`, weiter Not-Stop, Ersatz des zu grossen Stops, fehlender Schutz-Stop, Stop über den offenen Short nach −2022). **Prüf-Werkzeuge:** `pruef_raster.py` (12
> Szenarien × 12 schreibende Störungen × 4 Zeitpunkte × 15 Lese-Kopplungen = 8'640 Fälle je Modus, Befundarten `NACH_NK`, `UNBEKANNT_NACH_NK`, `NACH_LAUF_STILL`, …) mit dem Erhaltungssatz
> `unbekannte()`; Fuzzer-Einstufung `nur_storno`. **Lücken-Kampagne `luecken2`** (Lauf-Seeds 100000–101000 Standard, 102000–103000 streng; 40 Aufträge, auf dem Stand nach E15) fand drei weitere
> Befunde: **E16** (strenger Lauf-Seed 102857, Pilot 2.0): der Not-Stop an der Stelle eines hängenden Stop-Limits wurde nur gesetzt, wenn gar nichts scheiterte — scheiterte die Perp-Seite (hier:
> reduceOnly-Stop für einen unklaren Short ohne Position abgelehnt, −2022), blieb der hängende Stop bis zur Nachkontrolle ohne Ersatz; jetzt nur noch dann nicht, wenn der Kontostand nicht lesbar war.
> **E17** (strenger Lauf-Seed 102030, Prüf-Werkzeug): im beidseitigen Zweig galt jeder Long-Rest über der Toleranz als echter Befund — im einseitigen Zweig bis `STAUB_MAX_USDT` (10) als Staub; 7,3 USDT
> ETH, am Stop-Kurs 4,7 USDT unter dem Mindestbetrag, lassen sich bis zur Nachkontrolle nicht stoppen (sie setzt den Stop mit dem Kurs aus dem Buch). **E18** (Lauf-Seed 100890, Prüf-Werkzeug): der
> Folgeschaden-Test wertete den hängenden Stop-Limit, den Pilot 2.0 nicht sehen konnte (Liste seit dem Hängen nicht lesbar), als echten Befund, während die Prüfung vor dem Sprung dieselbe Lücke als
> `LIMIT_LUECKE_` führte. **LEHREN:** (1) **Ein gezielter, deterministischer Raster findet, was ein Zufalls-Fuzzer nie trifft** — die 15. Prüfung rechnete ALLE Kopplungen «schreibende Störung ×
> lesende Störung × Zeitpunkt» durch; der Fuzzer sah G1 auf Tausenden Seeds nicht. (2) **Ein Erhaltungssatz über WISSEN schlägt eine Lücken-Messung:** «kein eigener Stop an der Börse, den das Buch nicht
> kennt» fängt die Wurzel (ein vergessener Stop), egal ob die Lücke im Test schon sichtbar wird. (3) Wer ein Löschen mit «Erfolg ODER −2011» als «weg» liest, muss prüfen, ob der Auftrag danach
> doch auftaucht (A9) — erst das Testnetz klärt es. (4) Ein Vermerk «hier könnte etwas offen sein» VOR der ersten Handlung deckt mehr ab, kann aber ein zweites Programm in einen Markt locken, den das
> erste noch bearbeitet — Verzahnung messen, bevor man ihn behält.
> **Schlusskampagne, Lücken-Bereich 112000–112450** (auf dem Stand nach E18; frische Seeds, die ersten Lücken-Läufe überhaupt auf diesem Stand) fand weitere drei Befunde. **E19** (Lücken-Lauf-Seed 112159, Pilot 2.0, 6'238 USDT): geht cancelReplace nicht, löscht `_haengenden_loeschen` den hängenden Stop-Limit normal und setzt aus den freien Coins einen Not-Stop. Kam das Löschen an und ging nur seine Antwort verloren (503), hörte die Wiederholung «unbekannt» (−2011) und las das als «war schon weg — einer der unklaren Versuche kam an» — es wurde nichts gesetzt, und die eben freigegebenen Coins standen ohne Stop. Jetzt vergleicht die Funktion die freien Coins vor und nach dem Löschen: nur was das Löschen freigegeben hat (höchstens die Menge des hängenden), bekommt einen Not-Stop; war der Stop schon vorher weg, hat das Löschen nichts freigegeben, und die freien Coins daneben bleiben die Absicherung des Shorts. **E20** (Lücken-Lauf-Seed 112196, Prüf-Werkzeug): die Einstufung `LIMIT_LUECKE_` kannte nur «Spot-Liste seit dem Hängen nicht mehr gelesen»; stand der hängende Stop wegen der Listenverzögerung der Prüf-Börse (`sichtbar_ab`) in der LETZTEN Liste noch gar nicht, konnte Pilot 2.0 ihn ebenso wenig sehen — die Börse merkt sich jetzt, welche Aufträge die letzte Liste verbarg (`liste_verborgen`), der Fuzzer zählt sie als unvermeidbar. **E21** (strenger Lücken-Lauf-Seed 112383, Pilot 2.0, 1'008 USDT): kommt ein unklarer Auftrag erst in der LETZTEN Abgleich-Runde ins Buch, braucht der Markt noch seinen beidseitigen Schutz (Spot-Stop über alle Coins neben dem Perp-Stop über den ganzen Short), aber es gab keine Runde mehr — der Perp-Stop über den Short stand, die Coins nicht. Jetzt folgen auf eine so späte Meldung bis zu `SCHLUSSRUNDEN` (2) zusätzliche Runden. **LEHREN:** (5) **Die Kampagne auf FRISCHEN Seeds findet weiter echte Fehler, auch nachdem die unabhängige Prüfung durch ist** — E19 und E21 standen schon vor der 14. Runde im Code; jede Änderung am Schutzpfad verlangt die ganze Kampagne neu, nicht nur den Seed des Fundes. (6) **Ein Storno, dessen Antwort verloren ging, ist nicht «schon weg»:** wer −2011 beim WIEDERHOLTEN Löschen als «war vorher weg» liest, übersieht, dass das eigene erste Löschen angekommen sein kann — der Unterschied der freien Coins entscheidet, nicht die Antwort. (7) **Eine Information, die in der letzten Runde eintrifft, braucht Schlussrunden:** sonst gilt sie für die Entscheidung nicht mehr. (8) **Die Sichtbarkeit im Prüf-Werkzeug am letzten LESEN messen**, nicht am letzten Ereignis: was die Liste noch nicht zeigte, kann der Bot nicht wissen.
> **Raster für den Weg «hängender Stop-Limit»** (Schlusskampagne, nach `luecken3`): sieben der vierzehn eigenen Funde dieses Folge-PR (E10, E13–E16, E19, E21) lagen bei hängenden Stop-Limits
> (Konto ohne STOP_LOSS, eine Kurslücke lässt den ausgelösten Spot-Stop über dem Kurs liegen) — der Zufalls-Fuzzer fand sie erst im gezielten Modus `PRUEF_LUECKEN=1`, und E19 erst nach Hunderten
> Seeds. `pruef_raster.py` zählt den Weg deshalb deterministisch durch: **`--haengend`** (Konto ohne STOP_LOSS, zwischen Tag 0 und Tag 1 fällt der Kurs unter das tiefste Limit, jeder Spot-Stop hängt;
> Lagen ohne Spot-Stop zählen als «kein_spotstop»), dazu vier zusätzliche Einzelstörungen (Löschen / Ersetzen / Marktverkauf mit verlorener Antwort bzw. abgelehnt) und **zehn PAARE schreibender
> Störungen mit gleichem Beginn** — das Ersetzen des hängenden Stops scheitert dauerhaft (503) oder Binance kennt `cancelReplace` nicht (404, Schalter `ersetzen_fehlt`), UND das Löschen bzw. der
> Not-Stop-Auftrag geht schief (503 vor oder nach der Verarbeitung, ×1 oder ×3). Jede Zelle läuft mit allen 15 Lese-Kopplungen. Neu ausserdem **`--notaus`**: Tag 1 ist der Not-Aus, gemessen
> wie `notaus_runde` des Fuzzers (Schutz direkt danach, Nachkontrolle im Not-Aus-Modus, `FALSCH_ALLES_ZU`, `SAUBER_NICHT_ZU`). Die Paare fanden in Minuten zwei Lücken: **E22** (Pilot 2.0, 16'828 /
> 8'410 / 4'200 USDT in den Lagen BTC +1,0 → +0,25 / +0,5 → +1,0 / +0,25 → +0,5; Paar «`cancelReplace` unbekannt × Löschen scheitert»): `_spot_stops_verkaufen` meldete beim Weg «`cancelReplace`
> unbekannt, Löschen scheitert» nur «der Spot-Stop bleibt stehen» — anders als bei «unklar» und «abgelehnt» wurde der hängende Stop nicht für den Not-Stop am Laufende vorgemerkt; die Coins galten
> als «durch einen Auftrag gesperrt, der nicht in der Liste steht — gilt als Stop», der Long stand bis zum nächsten Tageslauf ohne wirksamen Stop. Jetzt merkt auch dieser Weg ihn vor. **E23**
> (Pilot 2.0, 0,1988 BTC ≈ 16'800 USDT; Paare × unlesbare Spot-Liste, 18 von 44 Zellen vor den Korrekturen): die Schlusswarnung «Richtung … OHNE Stop» kam erst NACH der Vergabe von `schutz_offen` —
> der Lauf warnte laut, die Nachkontrolle wurde aber nicht angestossen, obwohl die Liste kurz darauf wieder lesbar war. Jetzt wird die Bedingung (`ohne_stop`) vor `schutz_offen` berechnet; ausserdem
> vermerkt `_spot_ohne_liste` («die gesperrten Coins gelten als gesichert») den Markt jetzt selbst («nicht geprüft»). Das Restrisiko «Spot-Liste dauerhaft unlesbar + hängender Stop» schrumpft damit auf
> «die Liste bleibt auch während der ganzen Nachkontrolle (11 Minuten) unlesbar». **E24** (Pilot 2.0, Muster «unverifizierter Endstand», gefunden bei der Suche nach weiteren Meldungen, die einen ungeschützten oder ungeprüften Zustand beschreiben, den Markt aber nicht für die
> Nachkontrolle vermerken): ändert sich der Kontostand in JEDER Abgleich-Runde (hier: ein Coin-Zufluss bei jeder Kontoabfrage), endet der Abgleich nach drei Runden ohne Stabilität — der Lauf warnte «Kontostand hat sich
> während des Stop-Abgleichs mehrmals geändert … bitte prüfen!», der letzte Stand blieb aber ungeprüft. Jetzt vermerkt er den Markt (`unstabil`) — aber nur, wenn sich der Kontostand in jeder Runde änderte, NICHT bei «Kontostand gleich, der Kurs liegt jenseits des Stop-Kurses, der Ausstieg gelang nicht» (`jenseits_offen`): bei einer Position von praktisch null (Paar, Rundungsrest) ist das ein Dauerzustand, den jede Nachkontrolle wieder fände. Die erste, weitere Fassung liess 16 Fuzzer-Tests mit «Nachkontrolle: nicht alles geklärt» rot werden — eine neue Markierung gehört gegen die ganze Testsuite, bevor man sie behält. Die Warn-Hülle in `_stops_setzen` erkennt nur Meldungen mit «OHNE Stop»,
> «ohne Stop», «nicht geprüft» oder «Stop abgelehnt» im Text; E23 und E24 waren genau Meldungen ohne diese Wörter bzw. nach der Vergabe von `schutz_offen`.
> **Schlusskampagnen `camp15d`–`camp15g`** fanden drei weitere Lücken (strenger Lücken-Modus), eine davon in drei Anläufen. **E25** (Lücken-Läufe 110000–110150, 7 × «NACHKONTROLLE_OFFEN»; Folge von E23): die Schlusswarnung «Richtung … OHNE Stop
> (zu klein für Binance …)» bei einem Paar mit einem Netto-Rest von wenigen USDT (der Stop läge am Stop-Kurs unter dem Mindestbetrag) oder einem Short-Rest unter einem halben Futures-Schritt (bewusst ohne Perp-Stop)
> beschreibt einen Dauerzustand — E23 vermerkte jeden solchen Markt für die Nachkontrolle, die ihn nie loswird. Jetzt vermerkt die Schlusswarnung den Markt nur, wenn Binance den Rest überhaupt absichern kann
> (`_schutzbar`: Spot — Stop-Menge × min(Kurs, Stop-Kurs) ≥ Mindestbetrag; Perp — ein Perp-Stop ist geplant). **E26** (Not-Aus-Fuzzer, Seed 117727, 1'669 USDT; im Tageslauf bis 9'736 USDT; Raster `--geist`: 4'828 / 7'167 / 3'920 USDT):
> ein Perp-Stop kam an, die Antwort ging verloren (`nach503`), jede Wiederholung scheiterte am Rate-Limit (429) — Pilot 2.0 löschte den «Geister-Stop» danach über seine Kennung (15. Prüfung K-e: «nie zwei Stops über denselben Short»)
> und stand ohne Stop da, obwohl dieser Stop der einzige Schutz des Shorts war. Die Familie «Aufräumen nach einem unklaren Ergebnis» sass an allen Stellen, die einen gescheiterten Perp-Stop-Versuch aufräumen. Gelöst in drei
> Schritten, jeder von einer anderen Messung gefunden: (1) der Fuzzer-Seed → `_geisterstop()`, ein Geister-Stop wird nur gelöscht, wenn ein anderer Stop die Menge schon deckt; (2) der neue Raster-Modus **`--geist`** (sechs Paare
> «Perp-Stop kommt an, Antwort verloren × jede Wiederholung scheitert», je zwei Zeitpunkte, 15 Lese-Kopplungen; im Not-Aus dazu ein toter Marktverkauf, sonst setzt er gar keine Perp-Stops) mit der neuen Befundart **`SELBST_ENTFERNT`**
> (der Fuzzer-Begriff `_selbst_entfernt` im Raster: es fehlt Schutz, und Pilot 2.0 hat in diesem Markt selbst einen Stop der betroffenen Seite entfernt — auch wenn die Nachkontrolle es später heilt; 36 Befunde je Szenario am Altstand)
> zeigte, dass «ein anderer Stop deckt» eine Momentaufnahme ist: ändert sich der Bedarf danach (zu grosser alter Stop → beidseitig → der ganze Short; Short heute gewachsen oder abgebaut), fehlt der gelöschte; (3) deshalb
> bleibt der vielleicht angekommene Stop überall, wo die Liste lesbar ist (`_stops_vorab` Stufe 2, `_perp_abgleich`), im Buch vermerkt (`perp_weitere`), und der Abgleich liest die FRISCHE Liste und räumt nach Mengen auf
> (`_perp_ueberzaehlige_weg` behält so viele, wie in den Short passen — der Geister-Stop wird so der aktuelle Stop und der zu grosse alte fällt weg); im Szenario BTC −0,25 → 0,0 endet der Tag mit genau einem Stop über den Bedarf
> statt mit 3'920 USDT ohne. Bei unlesbarer Liste (`_perp_ohne_liste`) wird nur gelöscht, wenn das Buch einen bisherigen Stop kennt UND er den heutigen Bedarf deckt (`_alt_deckt`: Netto-Short vor den heutigen Aufträgen aus
> Stand jetzt minus `erg["auftraege"]`, ein Futures-Schritt Toleranz — zugekaufte Absicherung zählt nicht als Wachstum); im Not-Aus bleiben der weite Not-Stop, der Stop über die fehlende Menge (bei «ganz» auch mit bekanntem altem
> Stop) und der kleinere Stop nach −2022; gelöscht wird nur dort, wo die alten Stops noch stehen und schützen (`_perp_notstop(alt_steht)`, Ersatz für einen zu grossen alten Stop). **E27** (Not-Aus-Fuzzer, Seed 117974,
> 0,000248 BTC ≈ 38 USDT): ein alter Spot-Stop über 0,02168 von 0,025432 Coins steht, die Spot-Aufträge sind nicht lesbar — der Not-Aus behandelte die gesperrten Coins als «gesichert», der Perp-Stop deckte nur das Nötigste, nach dem
> Auslösen beider Stops blieb ein Short ohne Coins und ohne Stop. Mehr Coins gesperrt als nötig bei unlesbarer Liste heisst: ein zu grosser Stop kann stehen — wie bei veralteten Zahlen (und wie `_spot_ohne_liste` im Tageslauf)
> bekommt der Short seinen Stop über die ganze Menge, die übrigen Coins einen eigenen Spot-Stop. **LEHRE:** (1) **Aufräumen nach einem unklaren Ergebnis ist nur sicher, wenn etwas anderes schützt — und «etwas anderes schützt» ist
> eine Momentaufnahme:** besser behalten, im Buch vermerken und später nach Mengen aufräumen lassen, als nach Teilinformation löschen. (2) **Das Gegenmittel muss im HÄUFIGEN Fehlerfall harmlos sein:** die erste Fassung sicherte den
> Markt «beidseitig», sobald ein Geister-Stop neben einem bekannten alten stehen konnte — im häufigsten Fall (Auftrag vor der Verarbeitung abgelehnt, nie angekommen) stand dann ein Spot-Stop über alle Coins neben einem Perp-Stop nur über
> den Netto-Short, ein älterer Test (10.p1c) fing es. (3) **Ein Rest von «einem Schritt» ist zuerst ein Zustands-, dann ein Rundungsverdacht:** E27 sah nach einem Rundungsfehler aus (nächster statt abgerundeter Futures-Schritt) —
> abgerundet wanderte der Rest nur auf die Long-Seite (122 USDT statt 38); die Ursache war der unbehandelte Zustand «Liste unlesbar». (4) **Eine Befundart aus dem Fuzzer gehört auch in den Raster:** `SELBST_ENTFERNT` fand in
> Minuten, wofür der Zufalls-Fuzzer Tausende Seeds braucht — und ein Raster, dessen Störungen am Ende ausgeschaltet sind, entschuldigt jede Lücke, die die Nachkontrolle heilt; nur die Frage «war sie vermeidbar?» trennt. (5) Ein
> Szenario-Rahmen, der Regeln mit Zählern (`anzahl`) teilt, entwertet das zweite Szenario still (Gegenprobe E26a' prüfte zuerst nichts, M45 blieb unerkannt) — Regeln je Aufruf neu erzeugen. (6) Messen, bevor man einen Befund einer
> Seite zuschreibt: der erste Befund im Szenario BTC −0,25 → 0,0 sah wie der Geister-Stop aus; er war es auch, aber erst die Spur (welcher Aufrufer löschte, was verlangte der Bedarf danach) zeigte, dass das Löschen in `_stops_vorab`
> sass und nicht im Abgleich.
> **Endstand der 15. Folge-Runde (Code `07057e648` eingefroren, danach nur Tests und Doku; alle Zahlen am eingefrorenen Stand gemessen):**
> - **Schlusskampagne `camp15h`: 292 Aufträge = 31'000 Fuzzer-Läufe, 0 echte Befunde** (1'024 begründete Einträge der bekannten Klassen). Standardmodus: Läufe ×30, Listen, Monotonie und Not-Aus je 15000–18000;
>   strenger Modus: Läufe ×30 20000–24000, Listen, Monotonie und Not-Aus 20000–23000; gezielter Lücken-Modus (Konto IMMER ohne STOP_LOSS): Läufe ×30 110000–111000 (Standard) und 112000–113000 (streng),
>   Not-Aus 114000–116000 und 116000–118000; dazu das Basis-Raster (12 Szenarien × Standard/streng: 2'452 gemessene Läufe, 0 Befunde).
> - **Raster-Kette `r15h` auf demselben Stand: 168 Aufträge = 31'870 gemessene Läufe (Fälle, in denen die Störung wirklich traf), 0 Befunde** — `--geist --paare` 1'392, `--notaus --geist --paare` 1'296, `--notaus` 3'542,
>   `--haengend` 3'732, `--haengend --kurs --paare` 7'680, `--notaus --haengend` 4'420, `--kurs` 9'808 (je 12 Szenarien × Standard/streng). In 836 davon (2,6 %: `--geist` 102, `--haengend` 150,
>   `--haengend --kurs --paare` 242, `--notaus --haengend` 342) stand direkt nach dem Lauf bzw. Not-Aus ein Long oder Short bis zur Nachkontrolle (30-Sekunden-Takt) ohne wirksamen Stop — laut gemeldet, die Nachkontrolle heilte es
>   (Statistik `bis_nk_ungeschuetzt`, kein Befund; zwei gleichzeitige Störungen, z. B. `cancelReplace` tot × Spot-Liste unlesbar bei hängendem Stop, lassen sich bis dahin nicht schützen).
> - **Verzahnungsscans** (der Tageslauf hält vor seiner n-ten Anfrage an, ein zweiter Lauf läuft mittendrin: Not-Aus / Nachkontrolle / Stop kommt und geht / Stop nur): 4 × 1'050 Verzahnungen, 0 Befunde.
> - **Tests: 1'497 in 22 Dateien, alle grün** — streng 475, live 154, pilot 91, cockpit 123, testnetz 97, plan 23.
> - **Mutationsprobe** (288 Muster, davon 54 dieser Folge-Runde, R15-M1–M54; `python3 -B`, fail-fast): am eingefrorenen Stand **270 erkannt, 18 offen**. Neun der offenen haben jetzt ein eigenes Szenario und werden am Endstand
>   erkannt (**279 von 288**): R12-M33 (15.M33), R13-M12 (15.K3), R13-M22 (15.F3), R13-M26 (15.F4), N-R10-M18 (15.W1), R10-M4b (15.M4b) und R14-M7 (15.F1) — die letzten beiden hielt die 14. Runde noch für gleichwertig, es fehlte nur
>   das Szenario —, dazu R15-M29 (15.E19b: beide Lesungen der freien Coins vor und nach dem Löschen eines hängenden Stop-Limits nutzen das lange Budget; ein Spion auf `lesen()` zählt sie) und R15-M48 (15.E26i: Not-Aus «ganz»,
>   Perp-Liste unlesbar, der bisherige Stop deckt nur 0,02 von 0,05 Short — der Geister-Stop über den ganzen Short bleibt; mutiert blieben 2'821 USDT Short ohne Coins und ohne Stop). **Offen bleiben neun**, sieben davon aus früheren
>   Runden als gleichwertig begründet: M14 (K2 setzt `unklar_sell` in jeder Abgleich-Runde, die Zuweisung davor ist tot), R11-M19 (Staub-Paar), R12-M5 (der Not-Aus sperrt zwischen Lesen und Verkaufen nie Coins — gilt nur ohne einen
>   zweiten, gleichzeitigen Not-Aus), R12-M23 (nach einer Ablehnung überspringt `nur_ergaenzen` wirksame Stops ohnehin), R12-M34 (nur eine Abgleich-Runde mehr), R14-M49 (die Zuweisung `stand_frisch = True` nach der erneuten Lesung wird nur
>   erreicht, wenn der Stand schon frisch war), R14-M53 (ein reduceOnly-SELL gibt es auf dem Futures-Konto nicht). Zwei sind neu offen, beide durch eine NEUERE Schicht überdeckt: **R10-M17** (die Rechnung `noetig` im Not-Aus, Szenario 13.p7:
>   seit E27 läuft jeder Zustand, in dem mehr Coins unter einem Stop liegen als nötig, in den Modus «ganz» — unlesbare Liste: E27, lesbare: `spot_zu_gross`; eine Spur in einer Kopie des Codes zeigt: in den 475 + 154 Tests und 1'100 Not-Aus-Fuzzer-Seeds (Standard 15000–15300, streng 20000–20300, Lücken-Modus 114000–114250 und 116000–116250) ändert die Rechnung `soll_p = max(soll_p, noetig)` nie etwas) und **R15-M31** (die Bedingung `ohne_stop` der Schlusswarnung E23
>   neben `fehlt[0]`, `gescheitert`, `nochmal` und `unstabil`: der Eigenvermerk von `_spot_ohne_liste` (M32/M33, erkannt) und die Warn-Hülle decken alle bekannten Fälle; eine Spur zeigt: in 625 Tests (streng 471 + live 154 zum Zeitpunkt der Messung), 200 Lücken-Läufen (110000–110100 Standard, 112000–112100 streng, je 30 Tage) und 3'736 gemessenen Raster-Läufen (`--haengend`, `--haengend --paare`, `--notaus --haengend --paare`) steht der Markt nie allein wegen dieser Bedingung in der Nachkontrolle; denkbar ist allenfalls ein winziger gesperrter Rest unter dem Staubwert). Beide sind KEIN Gleichwertigkeitsbeweis, sondern
>   «kein unterscheidender Zustand gefunden» — die Zeilen bleiben als zweite Schicht stehen.
> - **Lehre aus der Probe:** (1) Eine Mutation, die nach einer Code-Änderung plötzlich offen ist, verdeckt meist eine NEUERE Schicht (R10-M17 durch E27, R15-M31 durch den Eigenvermerk) — erst mit einer Spur in einer Kopie des Codes messen, ob der
>   Zustand überhaupt noch vorkommt, dann entscheiden (Test oder Dokumentation). (2) Die Probe läuft gegen die Tests des eingefrorenen Stands: Tests, die nach dem Einfrieren dazukommen, zählen erst, wenn man die offenen Muster am Endstand
>   nochmals laufen lässt (hier: 9 der 18 offenen erkannt, 9 weiter offen).
> **16. unabhängige Prüfung** (Stand `39c74b066`, enger Auftrag, Belege b1–b18, neue Raster-Achsen; die Prüferin veränderte das Repo nicht): ohne Störung kein Fund, unter gekoppelten Störungen **1 Blocker, 6 wichtig, 8 klein**.
> Die Kernlogik der 15. Runde hielt, die Funde sitzen an ihren Rändern, wo zwei Störungen mit VERSCHOBENEM Beginn zusammentreffen — die Achse, die das erste Raster (gemeinsamer Beginn) und der Zufalls-Fuzzer nicht hatten.
> Jeder Fund wurde nachgemessen (rot am Stand der 15. Runde, grün am neuen), dann behoben; die Szenarien stehen als Block `16.*` in `test_pilot2_streng.py` (87 von 160 Prüfungen des Blocks sind am alten Stand rot: 85 schlagen fehl, 2 sind dort gar nicht ausführbar (die Funktion gab es noch nicht)):
> - **H6 (Blocker, 10'145–20'885 USDT, 7 von 7 Lagen mit Short-Stop):** `_perp_raus` (Ausstieg zum Markt, «Kurs schon über dem Stop») löschte die alten Perp-Stops nach einem UNKLAREN oder nur TEILWEISE ausgeführten Rückkauf, bevor ein
>   Ersatz stand — kam der Rückkauf nie an und lehnte Binance die neuen Stops dauerhaft ab (429), stand der Short ohne jeden Stop da. Jetzt werden die alten Stops erst gelöscht, wenn der Rückkauf BESTÄTIGT (vollständig ausgeführt) ist;
>   sonst bleiben sie, bis ein passender Not-Stop über den Rest steht (`_perp_raus` gibt zurück, ob bestätigt; `_perp_abgleich` löscht die nur verzögert sichtbaren alten nur dann). Es bleibt der durch Coins gedeckte Teil (4'925–10'132 USDT) ohne
>   Perp-Stop unter Dauer-429 — der Spot-Stop deckt ihn, Restrisiko.
> - **Harter Prozess-Abbruch (wichtig; Messung der Prüferin: bei 48 von 97 Abbruchstellen eine Position ohne Stop, bis 14'596 USDT, die Nachkontrolle tat nichts)** — die in der 14. Runde verworfene «Idee: Vermerk mit Herzschlag», jetzt gebaut: (1) Jeder
>   Markt mit Aufträgen steht VOR dem ersten Auftrag in `schutz_offen` (der Abgleich am Laufende löscht den Vermerk je Markt wieder); (2) die Sperre hat einen Herzschlag (alle `HERZSCHLAG` = 30 s) und gilt nach `ALT_NACH_TOT` = 150 s (fünf verpasste Schläge)
>   als tot — Nachkontrolle, Not-Aus (pilot.py und Cockpit/Telegram) und Tageslauf übernehmen sie dann, statt bis zu 900 s zu warten (vorher lief die Nachkontrolle nach einem Abbruch GAR NICHT: sie wartete 120 s auf eine Sperre, die erst nach 900 s als
>   verwaist galt); (3) das Cockpit startet nach «Jetzt handeln» die Nachkontrolle (wie `krypto-auto.bat`). Die Sperre ist gehärtet (nach dem Einfrieren der Kampagne, `sperre.py`): die Datei trägt die Marke des Halters (nur die EIGENE Sperre wird aufgefrischt und gelöscht), der Herzschlag überlebt kurze Zugriffsfehler (Windows: Virenscanner, OneDrive), Freigabe und Übernahme wiederholen ein kurz gehaltenes Löschen, und die Übernahme einer toten Sperre läuft unter einer kurzlebigen Wache — zwei Prozesse, die sie zugleich als verwaist sahen, löschten nacheinander, der zweite die FRISCH angelegte des ersten, und beide hielten sie (am alten Stand im Test mit angehaltenem Prozess nachgewiesen); die Buch-Sperre nutzt dieselbe Funktion, darum liefen die Abbruch-Scans mit dem endgültigen Stand nochmals (Nachlauf `camp16m` auf `38efaa5da`: 149 Aufträge — alle 96 Abbruch-Scans erneut, dazu 24 Scans mit ZWEI Störungen vorher (2'976 Abbrüche), die zwei Fuzzer-Artefakt-Aufträge (E43/E44) und 27 Fuzzer-Stichproben (3'450 Seeds): 0 echte Befunde). Neues Werkzeug **`pruef_kill.py`** (der Abbruch-Scan: ein Kind-Prozess endet mit `os._exit(9)` nach dem n-ten schreibenden Auftrag, danach die Nachkontrolle):
>   am Tageslauf der 15. Runde **48 von 97 Abbruchstellen mit einer Position ohne Stop nach der Nachkontrolle** (bis 16'055 USDT nach Kurssprung, Standard- und strenger Modus gleich; gemessen mit der neuen Sperre, damit die Nachkontrolle überhaupt anläuft — der Markt stand noch nicht im Vermerk, sie tat nichts), am neuen **0 Befunde** in 194 Abbrüchen (mit EINER Störung vorher, mit sterbender Nachkontrolle und mit sterbendem Not-Aus 1'312 weitere Abbrüche, ebenfalls ohne Befund). Die Nachkontrolle läuft nie neben dem Tageslauf
>   (dieselbe Sperre); erzwingt man es trotzdem (Verzahnungsscan «Nachkontrolle», zeigt eine Sperre, die versagt), sind es 3 von 1'050 Verzahnungen (ein überzähliger Perp-Stop über dem Short, im schlimmsten Fall 2'582 USDT zu viel Stop nach einem Kurssprung; der nächste Lauf räumt auf) — bewusst hingenommen.
> - **H1 (wichtig, 9'859 USDT):** Binance kennt cancelReplace nicht (404) UND das Löschen des alten Spot-Stops scheitert (503 ×3): `_spot_abgleich` meldete nur «alter Spot-Stop ist noch offen — kein zweiter gesetzt»; wuchs der Long heute, deckte der alte Stop nur
>   den alten Teil. Jetzt bekommt der Rest einen Zusatz-Stop (freie Coins, nie doppelt), ein zu grosser alter macht den Markt beidseitig, der Markt wird für die Nachkontrolle vermerkt. **F-a (wichtig, 8'410/16'828 USDT):** der Frühausstieg «Konto nicht lesbar» vermerkte
>   nichts — ein inzwischen hängender Stop-Limit blieb bis zum nächsten Tageslauf unbemerkt; jetzt werden alle Märkte mit Stops vermerkt. **H7 (wichtig, 8'410 USDT):** `_haengenden_loeschen` hielt «nichts freigegeben» für «geschützt», obwohl ein Ersatz auch nur
>   als Storno (Antwort verloren) angekommen sein kann; jetzt vermerkt der Zweig den Markt.
> - **H5/H5b (wichtig, 4'650 USDT; 14.E10 bei Hebel 0,5: nackter Short von 3'995 USDT):** im BEIDSEITIGEN Modus (unklarer Perp-Auftrag, zu grosser Stop) ist die Stop-Grösse ALLE Coins; der Ausstieg zum Markt verkaufte dieselbe Menge — also auch die Absicherung des
>   Shorts. Jetzt verkauft er nur die Netto-Richtung (`_soll_netto`; ein unklarer Perp-Verkauf zählt als ausgeführt), geschützt wird bis zur Stop-Grösse. Der alte Test 14.E10 zählte nur Coins als «flach» (jetzt: netto flach). Raster b15 (hängend × Kurssprung × unklarer
>   Perp): von 69 Netto-Short-Zellen von 396 auf 0.
> - **Klein:** **G2'** (`_buch_vereinen` verglich nur Kennungen: trägt ein Schreiber nur die algoId desselben Stops nach, fiel der lebende Stop des anderen aus dem Gedächtnis; Eigenschaftstest `pruef_vereinen.py` mit drei Schreibern: 9 von 2'000 Folgen am alten, 0 am
>   neuen Stand) · **H3** (nur verzögert sichtbare Geister-Stops fielen aus dem Gedächtnis, 1'870 USDT unbekannt) · **H4** (der Not-Aus löschte den angekommenen Stop, obwohl der alte den Short nicht ganz deckt: 0,049 statt 0,074 von 0,095 BTC) · **Seed 120116/122288** (ein
>   Vorsorge-Stop nach einer verlorenen Löschantwort — das eigene Löschen sieht wie ein Auslösen aus; laut gemeldet, vermerkt, von der Nachkontrolle geheilt: Einstufung `VORSORGE_`, Restrisiko) · **`_alt_deckt` bei Teilfüllung** (`erg["auftraege"]` verbuchte die BESTELLTE statt der
>   ausgeführten Menge: 0,02388 statt 0,011928 BTC) · **Meldung** («beidseitig gesichert» stand schon vor dem Setzen der Stops) · **Testnetz-Prüfplan** (A9 endet bei abgelehntem Stop als «nicht geprüft»; ob das echte Konto `STOP_LOSS` kennt, zeigte nur das Testnetz) ·
>   **Einstufungen** (`STORNO_ZUERST_` und `DAUER_` sind grosse dokumentierte Restrisiken; das Raster fand ihre Kopplungen 717-mal, der Zufalls-Fuzzer nie) · **Werkzeuge** (`nur_storno_verloren` und die neuen Raster gehören ins Repo).
> - **Gemessene Tatsache zu den hängenden Stop-Limits (20.10.2026, öffentlicher Datenendpunkt `data-api.binance.vision/api/v3/exchangeInfo`):** BTCUSDT und ETHUSDT erlauben `STOP_LOSS` (Markt-Stop) — Pilot 2.0 nimmt dann nie `STOP_LOSS_LIMIT`; die Pfade für hängende Stop-Limits
>   (E10, E13–E16, E19, E21–E23, F-a, H7) sind Rückfall für Konten/Paare ohne `STOP_LOSS`. Selbst nachprüfen: `curl -s "https://api.binance.com/api/v3/exchangeInfo?symbol=BTCUSDT"` und `orderTypes` ansehen.
> - **Zweite gemessene Tatsache (20.10.2026, derselbe Endpunkt): BTCUSDT und ETHUSDT haben im Spot `MAX_NUM_ALGO_ORDERS` = 5** (höchstens fünf Stop-Aufträge je Paar) — das Limit, an dem E39 scheiterte, ist echt und nicht nur ein Modell der Prüf-Börse. Das Limit der bedingten Aufträge auf der Futures-Seite lässt sich von hier aus nicht messen (die Futures-Schnittstelle antwortet mit HTTP 451) → Testnetz-Prüfpunkt: wie viele `STOP_MARKET`-Aufträge nimmt ein Paar an, bevor Binance ablehnt?
> - **Eigene Funde der Folge-Runde (E28–E44; Suchläufe der Schlusskampagne, der neuen Scans und eine erste Schlusskampagne `camp16i` auf `a1cc2bc19`, die sieben echte Fälle fand — jeder am Stand davor rot, jeder mit festem Szenario in `16.*`; E43/E44 sind Fuzzer-Artefakte, kein Fehler von Pilot 2.0):**
>   **E28** (strenger Lücken-Lauf-Seed 102857, 26 USDT; Regression durch H5) lehnt cancelReplace JEDEN Not-Stop ab (Rate-Limit-Welle), blieb der hängende Stop stehen und der Long ohne wirksamen Stop → der hängende schützt ohnehin nichts: er wird gelöscht und ein
>   Not-Stop aus den freien Coins gesetzt. **E29** (Raster II, Kurssprung zu jeder Anfrage, BTC +0,5 → +1,0, 15'604 USDT): Konto ohne `STOP_LOSS`, `nur_storno_verloren`, der Kurs springt unmittelbar vor einem der letzten Blicke durch den frisch gesetzten Stop-Limit — er hing,
>   stand sogar in der letzten Liste, und der Lauf endete stumm → der letzte Blick am Abgleich-Ende gibt jedem in der Liste hängenden Stop-Limit einen Not-Stop. **E30** (Abbruch-Scan `--nk`, 4'747 USDT): die Nachkontrolle rechnete im zweiten Durchgang den Perp-Teil mit der Stop-Grösse
>   vom Rundenanfang («Perp-Stop nicht nötig») — nachdem der Spot-Teil den Markt beidseitig gemacht hatte, löschte sie den frisch gesetzten Perp-Stop als «verwaist» und setzte ihn erst in der nächsten Runde neu; starb sie dazwischen, stand der Short ohne Stop und ohne Vermerk.
>   **E31** (Lauf-Seed 192881, 6'907 USDT im beidseitigen Markt): nach H5 verkauft der Ausstieg nur die Netto-Richtung, die Absicherungs-Coins schützt ein Not-Stop — mit EINEM Preis (5 %); sprang der Kurs genau davor um −10,6 %, lehnte Binance ihn ab und niemand versuchte einen weiteren →
>   `_not_preise()` (5/10/20/35 %) in `_spot_raus`, `_spot_rest_sichern`, `_spot_vorsorge` und `_perp_notstop` (dort nur, wenn kein alter Stop mehr schützt). **E32/E33** (strenge Lauf-Seeds 200479/200540, auch am Stand der 15. Runde): der Not-Aus lief kurz nach dem Tageslauf, dessen Perp-Stop die Liste
>   noch nicht zeigte (Verzögerung) — er hielt sie für leer und setzte einen ZWEITEN Stop über denselben Short (2 × 2,212 ETH über einen Netto-Short von 2,211: beim Auslösen kaufte er die Absicherung zurück), bzw. er löschte den überflüssigen nicht, als der Netto-Short zurückgekauft war und das Paar blieb
>   (0,001 BTC) → der Not-Aus kennt jetzt die im Buch bekannten, nur nicht sichtbaren Stops (`_perp_versteckte`) und löscht sie über die Kennung (`_notaus_versteckte_weg`) — nach dem neuen Stop bzw. wenn keiner nötig ist. **E34** (strenger Lauf-Seed 203507, 811 USDT; Regression durch E30): ein alter Perp-Stop löste mitten im
>   Abgleich aus (Kurssprung), der Perp-Teil wollte einen Stop über den schon geschlossenen Short setzen (reduceOnly ohne Position: −2022) und warf damit den ganzen Abgleich ab — die 0,19 ETH, die der Spot-Teil in der nächsten Runde gesichert hätte, blieben ohne Stop → «−2022, frisch gelesen: keine Position» ist
>   kein Fehler, sondern eine weitere Runde. **E35** (Lücken-Lauf-Seed 210028, auch am Stand der 15. Runde): der Frühausstieg «Konto nicht lesbar» (F-a) vermerkte nur Märkte, deren Stop-ID das Buch kennt — nach einer verlorenen Antwort («Duplicate order») steht nur der Stop-Kurs im Buch (`spot: null`) → jeder Stop-Eintrag zählt.
>   **E36** (streng + Lücken, Lauf-Seed 212699): zwei hängende Stop-Limits, cancelReplace stornierte beide ohne Ersatz («nur_storno») — `_haengenden_ersetzen` kannte den Ausgang nicht (jetzt `_nach_storno_stoppen`), und die Menge für den zweiten stammte vom Rundenanfang (0,1992 statt 0,2545) → der Schluss rechnet den Bedarf frisch.
>   **E37** (Lücken-Not-Aus-Seed 214139, 3'288 USDT): drei Ablehnungen (503) in Folge verbrauchten die drei Versuche beim Löschen eines hängenden Stops im Not-Aus — jetzt das lange Budget (`SCHUTZ_WARTEN`). **E38** (Lücken-Not-Aus-Seed 214517): Fuzzer-Artefakt — ein Coin-Rest unter dem Binance-Minimum wurde durch einen Kurssprung NACH dem Entscheid verkäuflich;
>   der Fuzzer unterscheidet das jetzt (`_nur_coins_uebrig`).
>   **E39** (strenge Lauf-Seeds 240021/240838, auch am Stand der 15. Runde, 241 USDT; Suchteil der zweiten Kampagne `camp16j`): nach Ablehnungen setzt Pilot 2.0 für gewachsene Positionen Zusatz-Stops statt eines grösseren (cancelReplace ist dann gesperrt) — über Tage standen fünf Spot-Stops am selben Preis, das Maximum (Filter `MAX_NUM_ALGO_ORDERS`); ein weiterer war nicht möglich, und jede Nachkontrolle scheiterte ebenso («weiterhin nicht gesichert») → `_stops_zusammenlegen` vergrössert den grössten wirksamen Stop per cancelReplace (die Zahl der Aufträge bleibt gleich). **E40** (strenger Lauf-Seed 242916, auch am Stand der 15. Runde, 0,112 ETH ≈ 294 USDT): der Not-Aus kaufte den Netto-Short zurück, die Coins waren nicht verkäuflich (`PERCENT_PRICE_BY_SIDE`), der alte Perp-Stop (über den Netto-Short, jetzt zu gross) liess sich nicht löschen (503) → die Coins bekamen einen Spot-Stop über ALLES; löste der aus, stand der Short nur zu 0,094 von 0,2059 unter einem Stop → bleibt ein zu grosser Perp-Stop stehen, stehen die Perp-Stops zusammen über dem GANZEN Short (`perp_ganz_ergaenzen`; nur, wenn die Coins ihren Spot-Stop wirklich haben — sonst löste der ergänzende Stop die ungeschützte Absicherung auf). **E41** (Nachprüfung zu E40, kein Seed): in jedem weiteren Takt der Nachkontrolle räumte der Not-Aus den Spot-Stop über die Absicherung als «zu gross» ab (löschen) und setzte ihn gleich neu — ein Fenster ohne Schutz, solange der Perp-Stop nicht löschbar war → steht der Markt schon beidseitig vollständig (alle Coins unter eigenen Spot-Stops UND der ganze Short unter Perp-Stops), wird nichts angefasst. **E42** (Lücken-Not-Aus-Seed 257630, strenger Modus, 10'711 USDT; Suchteil von `camp16j`): ein ausgelöster Stop-Limit hängt über dem Kurs (Kurslücke, Konto ohne `STOP_LOSS`), das Verkaufen wird abgelehnt UND das Löschen scheitert dauerhaft (429) — die Coins (netto +0,149 BTC) blieben bis zur Nachkontrolle ohne wirksamen Stop; der Tageslauf ersetzt einen hängenden Stop per cancelReplace durch einen Not-Stop (`_haengenden_ersetzen`), der Not-Aus kannte nur das Löschen → `haengenden_ersetzen` (5/10/20/35 % unter dem frischen Kurs; Binance prüft den neuen Auftrag zuerst, lehnt es ihn ab, bleibt der hängende), bleibt der Stop trotzdem hängen, meldet der Not-Aus es laut («weder löschen noch ersetzen») und gilt nicht als ok. **E43** (Lücken-Not-Aus-Seed 324065, Fuzzer-Artefakt; Suchteil der dritten Kampagne): der hängende Stop-Limit sperrte die Coins, Löschen UND cancelReplace waren dauerhaft abgelehnt (503) und der Perp-Stop dauerhaft (429) — jeder Weg war zu, die Lücke ist unvermeidbar und wird laut gemeldet (E42); der Fuzzer stufte sie als echten Befund ein und unterscheidet jetzt: beides zusammen bei einem hängenden Stop ist `DAUER_` (jede der beiden Störungen allein nicht, K1). Dazu die **Einstufung** (Fuzzer): `LIMIT_LUECKE_` entschuldigt nur noch, wenn der Lauf den Markt angesehen oder für die Nachkontrolle vermerkt hat — F-a wurde vom Etikett verdeckt (16.Einstufung, drei Fälle). **E44** (strenger Lauf-Seed 312454 der Schlusskampagne `camp16l`, Fuzzer-Artefakt wie E38): in einem Konto OHNE echtes Geld kam der STOP mitten im Tageslauf, ein Coin-Rest (6e-05 BTC) lag unter dem Binance-Minimum (3,86 USDT), ein Kurssprung (+31 %) machte ihn später verkäuflich (5,08 USDT) — den verkauft der Not-Aus nie von selbst (das Buch kennt ihn nicht) und meldet ihn in einem Testnetz-Konto nicht einmal; der Fuzzer wertete den Rest als falsches «alles zu». Jetzt merkt er sich, dass irgendein Lauf dieser Runde einen Rest «unter dem Binance-Minimum» liegen liess (`MINIMUM_GESEHEN`), und entschuldigt das nur ohne echtes Geld (`_nur_coins_uebrig(..., marke=...)`) — bei echtem Geld meldet der Not-Aus solche Coins, und ein «alles zu» mit verkäuflichem Rest oder mit einer offenen Position bleibt ein Befund (16.E44, 6 Prüfungen).
> - **Neue Werkzeuge:** `pruef_raster2.py` (Raster II: Ereignisse mit eigenem Beginn, Paare/Tripel, Kurssprung zu JEDER Anfrage, Versatz schreibend × lesend, Geister-Stop × Kurssprung/Löschen/Rückkauf, Basisbedingung «cancelReplace unbekannt», Not-Aus × cancelReplace,
>   `--jeder N` für Stichproben), `pruef_kill.py` (Abbruch-Scan), `pruef_vereinen.py` (Eigenschaftstest für `_buch_vereinen` mit drei Schreibern), die neue Störungsart `nur_storno_verloren` der Prüf-Börse (cancelReplace storniert, der neue Auftrag wird abgelehnt, die Antwort geht
>   verloren) und `vermerkt_je_markt()` im Fuzzer.
> - **Lehren der 16. Runde:** (1) **Ein Scan über die Dimension «Prozess-Tod» findet, was kein Fuzzer findet:** der Abbruch-Scan brauchte keine Zufallsfolgen — jede Abbruchstelle EINMAL — und zeigte eine tatenlose Nachkontrolle bei fast jeder zweiten Stelle. (2) **Die Reparatur
>   braucht denselben Scan:** `--nk` (die Nachkontrolle stirbt im zweiten Durchgang) fand E30 in der frisch reparierten Nachkontrolle selbst. (3) **Zwei Störungen mit VERSCHOBENEM Beginn sind eine eigene Achse:** H6, H7 und E29 liessen sich nur finden, wenn jedes Ereignis seinen eigenen
>   Auslöser hat (Raster II); der Zufalls-Fuzzer trifft diese Kopplungen auf Tausenden Seeds nicht. (4) **Ein Etikett kann einen Fund verdecken:** `LIMIT_LUECKE_` entschuldigte F-a, weil es nur «Konto ohne STOP_LOSS» prüfte, nicht «hat der Lauf den Markt angesehen oder vermerkt?» —
>   jede Entschuldigung braucht eine Bedingung und einen Test, der sie bricht. (5) **Eine neue Schutzschicht entwertet alte Tests:** H5 machte 14.E10 («flach» = Coins 0) zu einem Szenario, das einen nackten Short für sicher hielt, und kippte den Seed 102857 (E28) — nach jeder Änderung
>   die GANZE Kampagne, nicht nur die neuen Szenarien. (6) **Messen, was Binance wirklich kann, statt es anzunehmen:** BTCUSDT/ETHUSDT erlauben `STOP_LOSS` — die ganze Familie der hängenden Stop-Limits betrifft damit nur Konten/Paare ohne Markt-Stop. (7) **Eine erste Schlusskampagne ist ein Suchlauf:** auf frischen Seeds fand `camp16i` nach allen Prüfer-Funden noch sieben echte Fälle (E31–E37) — drei in Pfaden, die schon in der 15. Runde so waren (Not-Aus × Listenverzögerung, F-a ohne Stop-ID, Löschbudget), eine Regression der eigenen Verschärfung (E34), eine seltene Kopplung (E31, E36). Erst die Kampagne NACH dem letzten Code-Änderung zählt als Endstand; jede Behebung braucht ihren Seed als festes Szenario und die ganze Kampagne neu. (8) **Ein Rechner-Neustart mitten in der Kampagne** (zweimal) tötete alle Prozesse, die Dateien blieben: der Auftrags-Runner muss idempotent sein (`fertig.txt`), und Auftragsnamen müssen eindeutig sein (zwei Varianten `r2tripelh_N` überschrieben dieselbe Logdatei).
> **Endstand der 16. Folge-Runde (Endstand `38efaa5da`: der Produktionscode von Pilot 2.0 — `pilot2_live.py`, `pilot.py`, `cockpit.py` — ist seit `072b60a06` eingefroren; danach änderten sich nur die Sperre (Wache bei der Übernahme), Prüf-Werkzeuge, Tests und Doku. Die Schlusskampagne `camp16l` lief auf `072b60a06` mit frischen Seeds 300000 ff.; Abbruch-Scans und Fuzzer-Stichproben liefen auf `38efaa5da` nochmals, siehe Nachlauf):**
> - **Schlusskampagne `camp16l` (967 Aufträge) samt 24 neuen Abbruch-Scans des Nachlaufs: 991 Aufträge, darunter 31'000 Fuzzer-Läufe, 0 echte Befunde** (953 begründete Einträge der bekannten Klassen). Standardmodus: Läufe ×30, Listen, Monotonie und Not-Aus je 300000–303000;
>   strenger Modus: Läufe ×30 310000–314000, Listen, Monotonie und Not-Aus 310000–313000; gezielter Lücken-Modus (Konto IMMER ohne STOP_LOSS): Läufe ×30 320000–321000 (Standard) und 322000–323000 (streng),
>   Not-Aus 324000–326000 und 326000–328000; dazu das Basis-Raster (12 Szenarien × Standard/streng: 2'452 gemessene Läufe, 0 Befunde).
> - **Raster-Kette (Raster I) auf demselben Stand: 168 Aufträge = 31'870 gemessene Läufe (Fälle, in denen die Störung wirklich traf), 0 Befunde** — `--geist --paare` 1'392, `--notaus --geist --paare` 1'296, `--notaus` 3'542,
>   `--haengend` 3'732, `--haengend --kurs --paare` 7'680, `--notaus --haengend` 4'420, `--kurs` 9'808 (je 12 Szenarien × Standard/streng). In 570 davon stand direkt nach dem Lauf bzw. Not-Aus ein Long oder Short bis zur Nachkontrolle (30-Sekunden-Takt) ohne
>   wirksamen Stop — laut gemeldet, die Nachkontrolle heilte es (Statistik `bis_nk_ungeschuetzt`, kein Befund).
> - **Raster II auf demselben Stand: 410 Aufträge = 46'510 gemessene Läufe, 0 Befunde** — Basis (Einzelstörungen × normal/«cancelReplace unbekannt», auch mit hängenden Stop-Limits) 3'824, Paare 4'490, Tripel 2'892, Versatz schreibend × lesend 8'410,
>   Kurssprung zu jeder Anfrage 9'712, Geister-Stop 16'878, Not-Aus × cancelReplace 304 (je Standard/streng; Stichproben `--jeder N` bei den grossen Achsen). In 1'806 davon stand direkt danach etwas bis zur Nachkontrolle ohne wirksamen Stop (laut gemeldet, von ihr geheilt),
>   in 68 davon hatte Pilot 2.0 selbst einen Stop entfernt (cancelReplace «Storno zuerst», Vorsorge-Stop), den Markt vermerkt, und die Nachkontrolle heilte es — der grösste Betrag dabei 12'044 USDT (Klasse `SELBST_ENTFERNT`, dokumentiertes Restrisiko «Storno zuerst»).
> - **Abbruch-Scans (`pruef_kill.py`) auf demselben Stand:** 194 Abbrüche des Tageslaufs (Standard/streng), 916 mit einer Störung vorher, 248 mit sterbender Nachkontrolle, 148 mit sterbendem Not-Aus und 2'976 mit ZWEI Störungen vorher (Stichprobe jeder 10. Stelle, im Nachlauf auf dem endgültigen Stand) — **0 Befunde** (nach dem Lauf der Nachkontrolle ist nichts ungeschützt;
>   unmittelbar nach dem Tod, vor der Nachkontrolle, stand in 96 von 194 Abbrüchen des Tageslaufs eine Position ohne Stop: das ist das Fenster, das die Nachkontrolle schliesst). Eigenschaftstest `pruef_vereinen.py`: 50'000 Folgen mit drei Schreibern, 0 Verstösse.
> - **Verzahnungsscans** (der Tageslauf hält vor seiner n-ten Anfrage an, ein zweiter Lauf läuft mittendrin: Not-Aus / Nachkontrolle / Stop kommt und geht / Stop nur): Not-Aus: **0 von 1'050**; Nachkontrolle: **3 von 1'050**; Stop kommt und geht: **0 von 1'050**; Stop nur: **0 von 1'050** — die drei Fälle der Nachkontrolle: ein überzähliger Perp-Stop, bis 2'582 USDT zu viel Stop nach Kurssprung (der nächste Lauf räumt auf; Restrisiko, siehe oben)
> - **Tests: 1'674 in 22 Dateien, alle grün** — streng 635, live 154, pilot 105, cockpit 126, testnetz 97, plan 23.
> - **Mutationsprobe** (383 Muster, davon 114 dieser Folge-Runde, R16-M1–M114; `python3 -B`, fail-fast): am eingefrorenen Stand **353 erkannt, 30 offen**. **Erste Fassung der Probe war wertlos — ehrlich:** der Läufer kopierte nur `.py`/`.bat` in den Sandkasten, `test_cockpit.py` liest aber `markt.html`; jede Mutation galt als «erkannt» (alle 383 in 75 Sekunden, sichtbar daran, dass nie ein Muster offen war). Behoben (alle Dateien werden kopiert), die Kontrolle «unmutiert grün in allen vier Testdateien» läuft vorab, die Zahlen hier sind die der zweiten, echten Probe. Acht der 30 offenen haben jetzt ein eigenes Szenario und werden am Endstand erkannt (**361 von 383**, nachgelaufen mit den endgültigen Tests): R13-M10 (`16.Probe`: ein Teil-Verkauf lässt einen Rest unter dem Minimum, der Kurs springt vor der Nachprüfung — der Seed-Test 13.K2 traf die Lage nicht mehr), R14-M69 (`_nach_storno_stoppen` bei einer Menge unter dem Minimum ist kein Fehlschlag), R14-M79 (zwei hängende Stop-Limits, `cancelReplace` scheitert dauerhaft: der Rückfall ersetzt JEDEN), R16-M2/M3/M4 (`16.H6b`: jeder Rückkauf nur zur Hälfte; verzögert sichtbare alte Perp-Stops dürfen bei unbestätigtem Rückkauf weder gelöscht noch vergessen werden — die Tests 16.H6 prüften nur das Endergebnis «kein Short ohne Stop», das auch der Code erreicht, der die alten Stops zu früh löscht, weil eine spätere Runde den Rückkauf nachholt) und R16-M10/M12 (`16.H5`: `_soll_netto` zählt einen unklaren Perp-Verkauf, `_spot_ohne_liste` verkauft beim Ausstieg nur die Netto-Richtung). Bei allen acht war es dasselbe: Seed-Tests, deren Anfragefolge durch spätere Änderungen verrutscht ist, oder Tests auf das Endergebnis allein. **Offen bleiben 22:** (a) neun aus früheren Runden als gleichwertig begründet (M14, R10-M17, R11-M19, R12-M5, R12-M23, R12-M34, R14-M49, R14-M53, R15-M31, siehe dort), (b) zwei aus dieser Runde: R16-M66 (im beidseitigen Markt ist der Short schon ganz gestoppt, der ergänzende Stop wäre 0) und R16-M81 (die weiteren Preise der Schleife unterscheidet die Prüf-Börse nicht), (c) **elf, für die ich keinen unterscheidenden Zustand gefunden habe** (kein Gleichwertigkeitsbeweis, die Zeilen bleiben als zweite Schicht stehen) — sieben davon untersucht: R14-M77 (seit dem Vermerk VOR dem ersten Auftrag ist `gehandelt` immer eine Teilmenge von `vorab_` — Spur in einer Kopie des Codes über `test_pilot2_live`, `test_pilot` und `test_pilot2_streng`: 63 Aufrufe, nie ein Markt ausserhalb; bei STOP mitten im Lauf (47) steht der Vermerk schon, bei STOP nach dem Abgleich (16) stehen die Stops), R16-M5 (`_kontoprobe` setzt bei mehr gesperrten Coins als nötig dasselbe `_zu_gross`), R16-M17 (der Zweig `verloren` fügt den Stop des anderen Schreibers wieder ein; 6'000 Seeds des Eigenschaftstests unterscheiden die Mutation nicht), R16-M23 (18 Szenarien × alle Abbruchstellen: der Vermerk fehlt auch mit der Mutation nie — jeder Plan dieser Szenarien hat mehr als einen Schritt), R16-M36/M37 (der Abbruch-Scan `--nk` über alle 12 Szenarien findet auch mit den Mutationen nichts; E30 wurde im Stand davor gefunden, seither haben weitere Änderungen die Lage verändert — warum genau, habe ich nicht geklärt), R16-M52 (ein direktes Szenario — Not-Aus bei dauerhaft unlesbarem Konto, verzögert sichtbarer Perp-Stop im Buch — unterscheidet die Mutation nicht; ältere Gurte wie «Lage zuerst lesen, sonst nichts anfassen» fangen den Fall ab); vier nicht weiter untersucht: R16-M54 und R16-M94 (Seed-Tests E34/E32), R12-M29 (Seed 9330) und R15-M17 (die Mutation ändert nur den Text der Statuszeile in einem Fall ohne Ausnahme). Alle elf sind für die Folge-Runde vorgemerkt: direkte Szenarien statt Seeds. Das Netz darunter ist die Schlusskampagne (31'000 Fuzzer-Läufe, 80'832 Raster-Fälle, 4'482 Abbruchstellen, 0 echte Befunde). **Lehre:** (1) Die Probe selbst braucht eine Kontrolle (unmutiert grün, mindestens ein Muster offen) — ein Läufer, der nie «offen» meldet, ist kaputt, nicht die Tests gut. (2) Tests auf das Endergebnis («kein Short ohne Stop») entdecken eine Mutation nicht, wenn eine spätere Runde den Fehler heilt; das Zwischenergebnis (Buch, Reihenfolge der Aufträge) prüfen. (3) Seed-Tests driften: jede Änderung der Anfragefolge verschiebt, was ein Seed trifft — wichtige Fälle brauchen ein direktes Szenario NEBEN dem Seed. 
> - **17. unabhängige Prüfung** (Stand `072b60a06` des Folge-PR, enger Auftrag, Belege `scratchpad/pruefung17/`, parallel zur Schlusskampagne gelaufen): **kein Blocker.** Die Fixes der Folge-Runde halten auf allen Achsen des Rasters — H6 2 × 1'680 Zellen, H5/H5b 2 × 513, F-a/H1/H7 2 × 85,
>   alle 97 Abbruchstellen × Standard/streng, Not-Aus × Nachkontrolle über 24 Durchgänge (~1'060 Fälle, E41 hält), Fuzzer ab 340000 (4'400 Seeds), `pruef_vereinen` 30'000 Seeds: 0 echte Befunde. Drei neue Achsen (Störung erst NACH dem Tod, Speicherfehler beim Vermerk, Übernahme und Einfrieren der Sperre) fanden
>   **vier wichtige Lücken und fünf kleine — für die nächste Folge-Runde vorgemerkt** (Bericht: `scratchpad/pruefung17/BERICHT.md`; W3 a ist schon behoben):
>   **W1** der Vermerk vor dem ersten Auftrag wird nicht zwingend gespeichert (`speichern()` schluckt Fehler; ist das Buch nicht beschreibbar — Virenscanner, OneDrive, Platte voll — UND stirbt der Lauf hart, tut die Nachkontrolle nichts: 48 von 170 Abbruchstellen, bis 14'596 USDT) → Fix: dreimal versuchen, sonst kein Auftrag (wie beim Start);
>   **W2** die blinden Perp-Zweige von `_perp_ohne_liste` (Perp-Liste in der Nachkontrolle dauerhaft unlesbar) vermerken nichts (18 von 194 Abbruchstellen, 2'556–5'498 USDT Long ohne Stop nach einem Kurssprung; die Spot-Seite ist sicher) → `d["nachkontrolle"] = True` in beiden Zweigen, besser die Kennung vorab ins Buch;
>   **W3** (a) die Übernahme einer toten Sperre durch zwei Prozesse zugleich — **behoben** (Wache bei der Übernahme; Stress mit echten Prozessen: 41 von 600 Versuchen hielten zwei Prozesse die Sperre zugleich, mit der Wache 0 von 600), (b) ein eingefrorener Lauf (Ruhezustand des Rechners) führt nach dem Aufwachen seinen veralteten Plan aus
>   (Abweichung bis 12'318 USDT Netto, alles geschützt, in 15 Fällen kippte das Vorzeichen) → Fix: die Marke vor jedem schreibenden Auftrag prüfen oder eine Betriebssystem-Sperre (`fcntl.flock`/`msvcrt.locking`, auf dem PC zu prüfen), (c) die Wanduhr (ein Uhrensprung ≥ 150 s lässt einen lebenden Halter tot erscheinen);
>   **W4** die Nachkontrolle hat keinen eigenen Takt: sie läuft nur aus `krypto-auto.bat` und «Jetzt handeln»; stirbt die Bat mit dem Prozess (Fenster zu, Neustart), bleibt der Rest bis zum nächsten Tageslauf (02:30) → zweite Aufgabe `pilot.py --nachkontrolle` alle 10 Minuten und bei der Anmeldung.
>   Klein: **K1** Stop-Anhäufung bei unlesbarer Perp-Liste und nicht löschbarem Stop (pro Takt ein weiterer, bis 10; alle geschützt) · **K2** `schritt()` Perp ignoriert `executedQty` · **K3** ein veralteter Kommentar · **K4** der Cockpit-Not-Aus wartet 60 s auf die Sperre, eine tote braucht 150 s · **K5** die Nachkontrolle meldet «geklärt» trotz Blind-Warnungen, und `VORSORGE_` wertet den Endstand mit dem Vermerk von vor der Nachkontrolle.
>   Zur offenen Verzahnung «Nachkontrolle läuft mitten im Tageslauf» (Restrisiko oben): ein Schlussnachlesen am Ende von `_perp_abgleich` (Perp-Liste frisch lesen; deckt der neue Stop den Bedarf allein, die anderen eigenen löschen, ~12 Zeilen) schloss sie im Versuch — 3 von 1'050 Verzahnungen → 0 von 1'054; besser an der Quelle: eine Sperre, die den Tageslauf wirklich ausschliesst (W3).
> **Folge-Runde zur 17., 18. und 19. unabhängigen Prüfung** (R17 + R18 + R19 in einem PR, zuerst R17, danach — am selben Code — die Funde der 18. Prüfung als R18 und die der 19. als R19, siehe unten). **Teil 1: 17. Prüfung (R17).** Die Prüfung (Stand `072b60a06` des Vorgänger-PR #2705, Belege `scratchpad/pruefung17/`, die Prüferin veränderte das Repo nicht) fand **keinen Blocker, 4 wichtige und 5 kleine Lücken** — alle an drei NEUEN Achsen:
> Störung erst NACH dem Tod (gegen die Nachkontrolle), Speicherfehler beim Vermerk, Übernahme und Einfrieren der Sperre. Die Fixes der 16. Runde hielten auf allen Achsen des Rasters (H6 2 × 1'680 Zellen, H5/H5b 2 × 513, F-a/H1/H7 2 × 85, alle 97 Abbruchstellen,
> Not-Aus × Nachkontrolle über 24 Durchgänge, Fuzzer ab 340000, `pruef_vereinen` 30'000 Seeds). Alle neun Lücken sind behoben, dazu der Vorschlag (e); jede hat ein festes Szenario im Block `17.*` von `test_pilot2_streng.py`, in `test_pilot.py` oder `test_cockpit.py`:
> - **W1 — Vermerk strikt speichern (48 von 170 Abbruchstellen ohne Stop, bis 14'596 USDT; Voraussetzung: das Buch lässt sich nicht beschreiben UND der Lauf stirbt hart):** `speichern()` schluckte den Fehler (anders als der Start), der Lauf handelte trotzdem, die Nachkontrolle wusste von den Märkten nichts.
>   Jetzt speichert der Lauf den Vermerk `schutz_offen` dreimal (`VERMERK_VERSUCHE` = 3, Pausen `VERMERK_WARTEN` = 1 s und 3 s; nur der LETZTE gescheiterte Versuch warnt «Buch nicht gespeichert»). Gelingt es nicht, geht heute KEIN Auftrag raus («Vermerk für die Nachkontrolle nicht gespeichert — heute kein Auftrag»; Ordner/Datei prüfen: Virenscanner, OneDrive, Platte voll, offener Editor); der nächste Lauf versucht es wieder.
> - **W2 — blinde Perp-Zweige vermerken (18 von 194 Abbruchstellen; 2'556–5'498 USDT Long ohne Stop nach einem Kurssprung):** ist die Perp-Liste in der Nachkontrolle dauerhaft unlesbar, setzt `_perp_ohne_liste` blind einen weiteren Stop und löscht den bekannten — ein unbekannter bleibt stehen, der Vermerk war weg, die Meldung «geklärt». Beide blinden Zweige setzen jetzt `d["nachkontrolle"] = True` (der Markt bleibt im Buch, bis die Liste wieder lesbar ist und die Nachkontrolle nach Mengen aufräumt).
> - **W3 — Sperre:** (a) das Übernahme-Rennen zweier Prozesse ist schon im Vorgänger-PR behoben (Wache bei der Übernahme; Stress mit echten Prozessen 41 von 600 → 0 von 600). (b) **Der eingefrorene Lauf** (Ruhezustand des Rechners: Herzschlag UND Lauf stehen; die Nachkontrolle übernimmt die «tote» Sperre; der Lauf wacht auf und führt seinen veralteten Plan aus — Abweichung bis 12'318 USDT Netto, das Vorzeichen kippte in 15 Fällen, alles geschützt):
>   `sperre.pruefen()` liest vor JEDEM schreibenden, signierten Auftrag (Spot und Futures: POST, DELETE, PUT — `broker_binance.py`, `broker_futures.py`) die Marke der Sperrdatei; gehört die Sperre nicht mehr diesem Prozess (Marke weicht ab oder Datei fehlt), wirft sie `SperreVerloren`, und es geht kein Auftrag mehr raus (seit R18 auch kein Schreiben des Buchs mehr, W1′). Der Tageslauf endet mit den Warnungen, der Markt steht im Buch (Vermerk), die Nachkontrolle übernimmt. Eine kurz nicht lesbare Datei (Virenscanner, OneDrive) gilt als «unbekannt» und lässt den Auftrag zu.
>   (c) **Wanduhr / Uhrensprung** (≥ 150 s lässt einen lebenden Halter als tot erscheinen): durch (b) entschärft, nicht beseitigt — der übernommene Halter schreibt nichts mehr; offen bleibt das Fenster bis zu seinem nächsten schreibenden Auftrag (Sekunden). Dokumentiertes Restrisiko.
> - **W4 — die Nachkontrolle bekam einen eigenen Takt (48 von 97 Stellen, bis 14'596 USDT bis 02:30 des Folgetags, wenn die `krypto-auto.bat` mit dem Prozess stirbt — Fenster zu, Neustart; Pause und gescheiterter Selbsttest übersprangen sie ebenfalls):** zweite Aufgabe der Aufgabenplanung «Krypto-Pilot-Nachkontrolle», vom Knopf «Täglich automatisch einrichten» VOR der täglichen angelegt (deren Befehl bleibt der letzte):
>   alle 10 Minuten (und, sobald Windows den Benutzer meldet, zusätzlich bei der Anmeldung — ein Anmelde-Auslöser OHNE Benutzer braucht Administratorrechte, E46), auch auf Akku, nie zwei Instanzen, höchstens 30 Minuten, verpasste Takte werden nachgeholt, nur bei angemeldetem Benutzer (wie die tägliche); ohne Vermerk im Buch ist sie nach einer Sekunde fertig, und seit R18 macht sie nur EINEN Durchgang (`pilot.py --nachkontrolle --einmal`, W3′). **Unsichtbar:** ein Konsolenfenster alle 10 Minuten würde stören und dazu verleiten, die Aufgabe abzuschalten — darum startet sie `krypto-nachkontrolle-still.vbs` (`wscript.exe //B //Nologo`, Fensterstil 0), das `krypto-auto.bat nachkontrolle` aufruft.
>   **Weil ein stiller Ausfall** (Windows Script Host gesperrt, Virenscanner, falscher Pfad) sonst nicht auffiele, schreibt die Bat bei JEDEM Start ein **Lebenszeichen** (`data\krypto-nachkontrolle-lebt.txt`, VOR der Prüfung auf das Buch); die Ampel «Nachkontrolle (Aufgabenplanung)» im Cockpit ist grün mit «zuletzt vor N Min.», grau mit «noch kein Lauf gesehen» (frisch eingerichtet) und rot ab 30 Minuten Stille oder fehlender Aufgabe.
>   **Auf Windows nicht von hier prüfbar:** das XML und der Starter sind auf Form geprüft (gültiges XML, Trigger, Einstellungen; die VBScript-Zeichenketten werden im Test wie VBScript gelesen und müssen `cmd /c ""<Ordner>\krypto-auto.bat" nachkontrolle"` ergeben, auch mit Leerzeichen im Pfad), der Lauf auf dem PC des Users ist der **Windows-Prüfpunkt N1** (kein Binance-Verhalten, darum nicht in `testnetz_pruefung.py`): Knopf drücken, 10 Minuten warten, im Cockpit die Ampel ansehen, in der Aufgabenplanung den Verlauf von «Krypto-Pilot-Nachkontrolle».
> - **Klein:** **K1** Stop-Anhäufung (Perp-Liste unlesbar + Löschen scheitert: pro Takt ein weiterer blinder Perp-Stop, bis 10 × Short; alle geschützt): `PERP_BLIND_MAX` = 3 — kennt das Buch schon so viele, kommt keiner mehr dazu, der Markt ist beidseitig gesichert und vermerkt · **K2** `schritt()` Perp bucht die AUSGEFÜHRTE Menge (`_ausgefuehrt`) statt der bestellten ·
>   **K3** ein veralteter Kommentar · **K4** die Meldung des Cockpit-Not-Aus bei besetzter Sperre nennt den Absturz und die 150 s (die Nachkontrolle im Not-Aus-Modus schliesst, sobald die Sperre frei oder tot ist) · **K5** die Einstufung `VORSORGE_` im Fuzzer wertet den Vermerk NACH der Nachkontrolle (`tag_info_nach`), nicht den vom Laufende; die «geklärt»-Zeile der Nachkontrolle kann nicht mehr zugleich Blind-Warnungen tragen, weil W2 den Vermerk hält.
> - **(e) Schlussnachlesen** am Ende von `_perp_abgleich` (Vorschlag der Prüferin): hat ein anderer Schreiber (die Nachkontrolle trotz Sperre) zwischen meinem Lesen und Setzen einen eigenen Perp-Stop gesetzt und deckt der NEUE allein den ganzen Bedarf, werden die anderen eigenen gelöscht (nicht im beidseitigen Markt, nicht in einer neuen Runde). Verzahnung «Nachkontrolle»: 3 von 1'050 → 0 von 1'054.
> - **Eigene Funde der Folge-Runde** (beim Prüfen der eigenen Fixes und von der Schlusskampagne gefunden; alle behoben, jeder mit festem Szenario):
>   **E45 — Lot-Rundung (Schlusskampagne `camp17a`, strenger Lücken-Not-Aus-Seed 526741; ~28'700 USDT Short ohne ausreichenden Perp-Stop):** gestoppt werden können nur GANZE Lots (7,099893 Coins → 7,0998). Zwei Vergleiche in `_notaus_schutz` rechneten mit den rohen Coins (`gestoppt ≥ coins − Lot/2`): hatten die Coins einen Rest unter einem Lot, aber über dem halben Lot, galten sie als «nicht ganz gestoppt». Folge (a): der ergänzende Perp-Stop (E40) kam nicht, und der nicht löschbare, zu grosse Perp-Stop deckte den Short nur zum Teil;
>   Folge (b): der Aufräum-Schutz (E41) hielt den vollständigen Markt für unvollständig und löschte den Spot-Stop in JEDEM Takt der Nachkontrolle, um ihn neu zu setzen (ein Fenster ohne Schutz). Jetzt `PL.runde(coins, step) − step/2` an beiden Stellen. Belege: `17.Lot` (der Seed, zwei direkte Lagen mit 0,200008 Coins, die Gegenprobe mit 0,200003, E41 mit Rest-Coins; drei von vier am Stand vor dem Fix rot), das neue Werkzeug **`pruef_lot.py`**
>   (Lot-Scan: Coins mit Bruchteilen eines Lots × Short × alter Spot-Stop × alte Perp-Stops × «nicht löschbar», `_notaus_schutz` je dreimal — **3'240 Lagen: am Stand vor dem Fix 84 Befunde, danach 0**, auch gegen die strenge Prüf-Börse), Muster R17-M40/M41. **Warum der Fuzzer es spät fand:** er braucht genau diesen Rest UND einen nicht löschbaren Stop; die Schlusskampagne `camp17a` (auf dem Stand vor dem Fix) fand es unter ihren ersten 59 von 991 Aufträgen und wurde abgebrochen — die Kampagnen auf dem Stand mit dem Fix (`camp17b` 234 Aufträge, `camp18` 333 Aufträge, danach die Delta-Kampagne `camp19` mit 319) fanden nichts Gleichartiges mehr.
>   **E46 — Anmelde-Auslöser ohne Benutzer (W4):** ein `LogonTrigger` ohne `<UserId>` gilt für JEDEN Benutzer und lässt sich unter Windows nur mit Administratorrechten anlegen («Zugriff verweigert») — der Knopf «Täglich automatisch einrichten» wäre für den normalen Benutzer bei der XML-Variante gescheitert, die einfache Rückfall-Variante hätte keinen Anmelde-Auslöser gehabt. Jetzt trägt der Auslöser den angemeldeten Benutzer (`USERDOMAIN\USERNAME`); ist er nicht bekannt, gibt es nur den 10-Minuten-Takt (`StartWhenAvailable` holt ihn nach dem Einschalten nach). Tests im XML (mit und ohne Benutzer), Muster R17-M37–M39.
>   **E47 — Lücken der Mutationsprobe dieser Folge-Runden geschlossen:** die Probe der R17 fand **R17-M39** (der Benutzer des Anmelde-Auslösers wird nicht aus der Umgebung gelesen — kein Test merkte es; jetzt ein Test mit gesetzter Umgebung), die der R19 **R19-M21** (eine Sperre aus der Zukunft gilt sofort als tot: das Ergebnis bleibt «besetzt», aber die Schleife dreht Δ Sekunden — der Test prüft jetzt auch die Dauer; ohne Korrektur 20 s bzw. 200 s Dauerlauf). Die älteren, in den Abschnitten oben begründeten offenen Muster der 16. Runde bleiben, wie sie waren.
> **Teil 2: 18. unabhängige Prüfung (R18).** Die Prüfung (Stand `99bb37a00` der R17 mit Nachtrag `e87230c5e`, Belege `scratchpad/pruefung18/`, parallel zur Schlusskampagne gelaufen, die Prüferin veränderte das Repo nicht) fand **keinen Blocker, 3 wichtige und 6 kleine Lücken.**
>   Der Lot-Fix E45 ist richtig und vollständig (ihr unabhängiger Lot-Raster: am Stand davor 132 stille Löcher, danach 0; im Tageslauf kein Lot-Effekt; keine weiteren rohen Vergleiche). Die R17-Fixes hielten nachweislich: W3b-Veto (~760 Fälle × Standard/streng/Lücken, dazu echte Prozesse mit SIGSTOP/SIGCONT: Abweichung zum Einzellauf 0), W1 (15 Schreibfehler-Muster × alle Abbruchstellen × 12 Szenarien × Standard/streng = 2'910 Fälle, 0 Befunde),
>   W2/K1 (194 + 1'338 Fälle, 0), Fuzzer (alter Export 2'500 Seeds, neuer Stand 1'800 Not-Aus + 150 × 30 Läufe + 150 Listen: 0 echte). Die Funde, alle in diesem PR behoben, jeder mit festem Szenario im Block `18.*` von `test_pilot2_streng.py`, in `test_pilot.py` oder `test_cockpit.py`:
> - **W1′ — ein Zombie schreibt weiter das BUCH (bis 16'055 USDT bis zur nächsten Nachkontrolle; 90 von 623 Lagen):** `sperre.pruefen()` hält die AUFTRÄGE eines als tot übernommenen Laufs (Ruhezustand) auf, aber `_buch_speichern_zusammen`, `speichern()` und `buch_schreiben` schrieben das Buch weiter. Erwacht der Zombie MITTEN in der Nachkontrolle, die für ihn arbeitet, sieht diese ein «von einem anderen Lauf geändertes» Buch und beendet sich, bevor sie geheilt hat (`fremd_geaendert`).
>   Jetzt prüft `_sperre_pruefen()` die Lauf-Sperre unmittelbar vor JEDEM Schreiben des Buchs (Tageslauf, Start, Not-Aus, Zurücksetzen, Speichern der Nachkontrolle): `SperreVerloren` wird zu `OSError` «Lauf-Sperre verloren» — der Zombie meldet «Buch nicht gespeichert», die Datei bleibt, wie sie war. **Gemessen:** der Aufwach-Scan der 18. Prüfung (Szenarien 0–1) hatte 90 von 623 Fällen mit einem Rest ohne Stop bis 16'055 USDT; am R18-Stand 1'808 Fälle je Modus (Standard und streng), 0 Befunde; am R19-Stand siehe die Zombie-Scans unten.
> - **W2′ — Zählen statt Mengen: eine stille Teil-Absicherung (9'405 USDT; 168 von 5'760 Lagen des Lot-Rasters, unabhängig vom Lot-Rest):** `perp_ganz_ergaenzen` verweigerte den ergänzenden Perp-Stop, sobald das Buch ≥ 2 Stops kennt (gleiche Bauart wie `PERP_BLIND_MAX`: es zählt Stops, das Buch führt nur Kennungen), und `_notaus_schutz` meldete trotzdem `ok`. Beleg: Paar 0,2 BTC, das Buch kennt zwei Stops à 0,05, Perp-Liste unlesbar, Löschen scheitert → Spot-Stop über alle Coins, Perp nur 0,1 von 0,2 → nach dem Auslösen 0,1 BTC Short ohne Stop, still.
>   Jetzt LAUT: `fehlt_schutz(…)` («ob sie zusammen den ganzen Short decken, ist unbekannt (das Buch führt keine Mengen) … Sofort prüfen!»), der Not-Aus gilt als nicht ok. Die Vorbedingung (kleine Stops im Buch) erzeugt der Code selbst nicht — die beidseitigen Runden setzen den ganzen Short —, darum wichtig, nicht Blocker; die vollständige Lösung (die Menge je Stop im Buch führen, rund zehn Stellen plus Zusammenführen) bleibt offen. **Gemessen** (Lot-Raster der Prüferin am R18-Stand, 5'760 Lagen): stille Lücken 168 → 0, Schutz-Verlust ohne Meldung 6 → 0.
> - **W3′ — die 10-Minuten-Nachkontrolle hielt die Sperre bis 690 s und liess den Tageslauf still ausfallen:** bei einem dauerhaft offenen Markt (z. B. ein hängender Stop, der sich weder löschen noch ersetzen lässt) lief jede Instanz die volle `NACHKONTROLLE_MAX_S`; mit `IgnoreNew` war die Sperre rund 57 % der Zeit belegt, der Tageslauf wartet nur 190 s, endete mit «handelt nicht» und rc 0, die Bat meldete «alles gelaufen» (rechnerisch ~41 % der Tage in diesem Zustand), dazu ein Push je Instanz (~72 am Tag). Jetzt:
>   (a) die Aufgabe ruft `pilot.py --nachkontrolle --einmal` — **EIN Durchgang ohne Warten**, die Sperre ist nach Sekunden frei; jüngere unklare Aufträge bleiben im Buch (der nächste Takt fragt wieder nach, der Markt ist beidseitig gesichert), nach `UNKLAR_MAX_ALTER_MS` meldet sie «noch immer unklar». Die lange Fassung läuft weiter hinter dem Tageslauf und nach `stop.bat`. (b) Ein Tageslauf, der die Sperre nicht bekommt, ist **LAUT**: rc 3 und ein Push «der Lauf hat NICHT gehandelt» (Probelauf: rc 0).
>   (c) **Push-Drosselung:** im 10-Minuten-Takt geht dieselbe Meldung höchstens einmal je Stunde raus (`data/krypto-nachkontrolle-push.json`), eine andere sofort, die lange Fassung immer.
> - **Klein:** **K1** der Test `17.W3b` «Tageslauf» war tot (`A and B and C or (A and B)` ≡ `A and B`, und die Übernahme kam vor dem Vermerk) → die Übernahme erfolgt nach dem Vermerk, der Vermerk wird geprüft · **K2** ein «gespeicherter» Vermerk fehlte im vereinten Stand, wenn ein Schreiber ohne Sperre ihn nach meinem Lesen löschte (`_buch_vereinen`: Basis 1 / Platte 0 / ich 1 → 0) → die Schleife prüft `set(vorab_) <= buch["schutz_offen"]` und trägt ihn erneut ein ·
>   **K3** `sperre.pruefen()` nahm eine Momentaufnahme: gab ein anderer Thread (Cockpit) eine ANDERE Sperre genau dazwischen ordnungsgemäss frei, warf es ein falsches Veto → bei fehlender oder abweichender Datei zählt nur, was noch angemeldet ist · **K4** `SperreVerloren` entwich im Zombie-Not-Aus ungefangen (`spot.ersetzen`) → `notaus_alle` meldet «Sperre übernommen — der Lauf, der sie hat, schliesst», nie «alles zu» ·
>   **K5** Windows: die Bat schrieb das Lebenszeichen VOR Python, ein abstürzendes `pilot.py` liess die Ampel grün → neu `data\krypto-nachkontrolle-rc.txt` («<Zeit> rc=N»), die Ampel wird bei N ∉ {0, 3} rot (ein veralteter Wert zählt nicht); die Meldung der einfachen Rückfall-Variante sagt, dass ihr «auch auf Akku» und «verpassten Lauf nachholen» fehlen; die Umleitung steht VOR dem Befehl (`>"datei" echo …`), damit eine Ziffer davor nie als Handle gilt.
>   **K6 — nicht behoben (Restrisiko, jetzt laut):** Not-Aus-Schutz bei dauerhaft unlesbarer Perp-Liste UND nicht löschbaren Perp-Stops (Doppelstörung): der Spot-Stop über die Absicherung wird in jedem Takt gelöscht und gleich neu gesetzt (ein Fenster von Sekunden; wird das Neusetzen abgelehnt, Dreifachstörung, ist er weg). Der Vorschlag der Prüferin («Perp-Seite zuerst») verlangt eine Umordnung im empfindlichsten Code, und der Perp-Teil ohne lesbare Liste kennt keine Obergrenze (der Spot-Stop liefe in den ungebundenen `ganz`-Pfad). Seit W2′ ist es laut (`ok` = False, «Not-Aus wiederholen»): im Raster 264 von 288 gemessenen Fällen, 0 still.
> - **Eigener Fund der R18 (E48):** die Laufzeit-Dateien der neuen Aufgabe (`data/krypto-nachkontrolle-lebt.txt`, `-rc.txt`, `-push.json`, `.log`) standen nicht in `.gitignore` — auf dem PC des Users wären sie «ungetrackt» gewesen und hätten das Aktualisieren gestört → `data/krypto-nachkontrolle*`, mit Test.
> - **Lehren der Folge-Runde:** (1) **Die Mutationsprobe braucht eine Vorab-Kontrolle, die sie selbst nicht umgehen kann:** die erste Fassung der Probe der 16. Runde kopierte nicht alle Dateien in den Sandkasten (`test_cockpit.py` liest `markt.html`), und jede Mutation galt als «erkannt», weil schon der unmutierte Test rot war; in der 18. Runde stolperte die Probe über einen Test, der die `.gitignore` im Wurzelverzeichnis las (im Sandkasten nicht vorhanden). Der Läufer kopiert jetzt ALLE Dateien, prüft vorab, dass unmutiert alle Testdateien grün sind (`KONTROLLE: unmutiert grün in allen Testdateien`, sonst Abbruch), erhält die Zeilenenden (die Bat ist CRLF — im Textmodus galt jede Bat-Mutation als «erkannt»), und die Tests sind sandkastentauglich. (2) **Ein Test, der nichts sendet, prüft nichts:** der Test `17.W3b` «Tageslauf» sendete nach der Übernahme der Sperre nie einen Auftrag (die Übernahme kam vor dem Vermerk, und `A and B and C or (A and B)` ist `A and B`) — er konnte nicht rot werden; ebenso ersetzte `test_pilot.py` `signale.push` durch ein `append` ohne Rückgabewert (R19 W1). Jetzt kommt die Übernahme NACH dem Vermerk, der Vermerk wird geprüft, und jeder neue Veto-Test hat eine Gegenprobe, in der der Auftrag tatsächlich rausgeht. (3) **Ein Schutz, den man nicht sieht, braucht ein Lebenszeichen:** der unsichtbare Starter der Nachkontrolle (W4) ist ein Schutz, dessen Ausfall niemand bemerkt, weil er nichts anzeigt — darum das Lebenszeichen und die Ampel; auf einer Plattform, die ich nicht ausführen kann, ist das Messen des Ausfalls
>   wichtiger als das Vertrauen in die Form. (4) **Redundante Schutzzeilen sind gleichwertige Mutanten:** M11/M14 von R17 sind absichtliche Doppelsicherungen (`_zu_gross` setzt den Vermerk schon; die Bedingung «der neue Stop deckt allein» ist beim Setzen des Stops immer wahr) — sie bleiben als zweite Schicht stehen und stehen so im README, statt dass ein Test sie künstlich «erkennt». (5) **Ein Veto muss ALLE Schreibwege schliessen, nicht nur die Aufträge:** W3b stoppte die Aufträge des Zombies, das Buch schrieb er weiter (W1′) — bei jedem neuen Zaun fragen, was der Aufgehaltene sonst noch tut. (6) **Zählen ist kein Messen:** `PERP_BLIND_MAX` und die Zwei-Stops-Regel (W2′) behandelten Stops gleich, obwohl das Buch ihre Menge nicht kennt — wo eine Grösse fehlt, muss der Fehlerfall laut sein. (7) **Ein neuer Takt verlangt, die Haltedauer der Sperre mitzurechnen** (W3′): eine Aufgabe alle 10 Minuten darf die Sperre nicht 11 Minuten halten. (8) **Jede Stelle, die eine gestoppte Menge mit Coins vergleicht, muss auf ganze Lots runden** (E45) — der Fehler zeigte sich nur mit Rest UND nicht löschbarem Stop: eine eigene Achse (`pruef_lot.py`) statt Zufalls-Seeds. (9) **Ein Fund der Schlusskampagne heisst: alles neu einfrieren und die GANZE Kampagne nochmals** — und ein Prüfbericht mit Änderungen am Schutzcode ebenso (R18).
> **Teil 3: 19. unabhängige Prüfung (R19).** Die Prüfung (Stand `0ddd2d37c` = R18, Belege `scratchpad/pruefung19/`, die Prüferin veränderte das Repo nicht) fand **keinen Blocker, 2 wichtige und 6 kleine Lücken** — nach ernsthaften Versuchen auf neuen Achsen (Einfrieren NACH der Prüfung, Aufwachen mitten in der Nachkontrolle, der 10-Minuten-Takt in allen Rastern und Fuzzern, Uhr, Push, Sperren-Threads; Bat und Aufgaben-XML kritisch gelesen).
>   Nachweislich gehalten haben: das Buch-Veto (Zombie-Scan `tag` 158 / `nk` 281 / `notaus` 57 / `aufwachen` 365 Fälle, 0 Befunde; erneutes Zusammenführen nach einem Veto ist idempotent: 6'000 Zufallstripel), `pruefen()` (3'000 Aufrufe gegen einen Thread, der andere Sperren in Dauerschleife nimmt und gibt: 0 falsche Vetos), W2′ (alle `return` ohne Meldung in `_notaus_schutz`, `_perp_abgleich` und `_perp_ohne_liste` einzeln durchgesehen: keine weitere stille Teil-Absicherung),
>   **die Folge von Ein-Durchgang-Nachkontrollen ≙ die lange Fassung** (Fuzzer `einmal`×3: Läufe 300 × 30 Tage, Not-Aus 600, Listen 200, Monotonie 200; Raster 1'675 Zellen; Abbruch-Scan 124 Abbrüche: 0 echte Befunde), 19 von 19 nachgespielten R18-Mutationen erkannt. Die Funde, alle in diesem PR behoben (K2 durch Prüfwerkzeuge, K4 als dokumentiertes Restrisiko), jeder mit festem Szenario im Block `19.*` von `test_pilot2_streng.py`, in `test_pilot.py` oder `test_cockpit.py`:
> - **W1 — die Push-Drosselung zählte einen gescheiterten Push als gesendet (Alarmverlust, kein Schutzverlust):** `_push_nachkontrolle` ignorierte den Rückgabewert von `signale.push` (False bei Telegram-/ntfy-Fehler oder Netz weg) und vermerkte die Meldung trotzdem — danach schwieg derselbe Text eine Stunde, ausgerechnet nach einem Netzausfall, der auch die Binance-Aufrufe stört (der Alarm «Markt ohne Stop» kam nie an).
>   Jetzt vermerkt NUR eine ZUGESTELLTE Meldung. **Die Tests hatten es verdeckt:** der Fake-Push gab nichts zurück, und drei Mutanten überlebten (Abstand 10⁹ s, «negative Zeitspanne = gedrosselt», Kennung nur über die erste Zeile) — jetzt Fake mit Rückgabewert, Fehlschlag, Uhr zurück (die Meldung geht wieder raus), geänderte ZWEITE Zeile (andere Meldung), feste Stunde (58 Minuten gedrosselt, 62 Minuten gesendet).
> - **W2 — ein `einmal`-Durchgang hielt die Lauf-Sperre bis 244 s (schnelle Fehler) bzw. 49 Minuten (hängendes Netz); der Tageslauf wartet nur 190 s:** (80 Fälle in virtueller Zeit mit den echten Wartezeiten; 6 von 80 über 190 s schon bei schnellen Fehlern, 40 von 80 bei hängendem Netz; der Tageslauf wurde dann laut abgewiesen — rc 3 + Push —, aber der Tag fiel aus.) Ursache: `stops_setzen()` lief in der Schleife UND danach, je mit allen Wiederholungen.
>   Jetzt: (a) das zweite `stops_setzen()` nur, wenn die Schleife keines ausführte; (b) die Wiederholungs-Pausen eines Durchgangs `einmal` gehören zu einem **Budget von `EINMAL_RETRY_S` = 60 s** (`_pause` in `_nochmal` UND `_platziere`): ist es aufgebraucht, gilt der erste Fehler sofort, der nächste Takt versucht es wieder; (c) das Schliessen im Not-Aus innerhalb eines Durchgangs ist NICHT budgetiert. Preis des 10-Minuten-Takts: die Heilung nach einer kurzen Störung kommt bis zu 10 statt 0,5 Minuten später — die lange Fassung läuft weiter hinter dem Tageslauf und nach `stop.bat`.
>   **Grenze:** das Budget zählt die Pausen, nicht die Zeit der Anfragen selbst; bei einem HÄNGENDEN Netz (jede Anfrage läuft ins Zeitlimit von 20 s) kann ein Durchgang trotzdem lange dauern (Restrisiko, siehe unten).
> - **Klein:** **K1** das Fenster zwischen der Prüfung und dem Schreiben des Buchs (die Prüferin: 292 Fälle ohne Schutzverlust, aber in 4 % ein dem Buch unbekannter eigener Perp-Stop; wacht der Zombie mitten in der Nachkontrolle auf, bis 4'747 USDT bis zur nächsten) → `_buch_schreiben_roh` prüft die Lauf-Sperre ein zweites Mal UNMITTELBAR vor dem Umbenennen der Temp-Datei, bei Verlust wird sie gelöscht · **K2** die Prüfwerkzeuge deckten `einmal` nicht ab → `PRUEF_NK_EINMAL=N` (R18) und neu `PRUEF_EINMAL_BUDGET=0` (Budget aufgebraucht: der schlimmste Fall) in allen Fuzzern, Rastern und Scans;
>   `pruef_zombie.py` ersetzt `sperre.pruefen()` durch eine Marke — die echte Prüfung testen `17.W3b`, `18.W1′` und `18.K3` · **K3** Uhr zurück: eine Sperre, deren Änderungszeit mehr als `alt_nach` in der Zukunft liegt (der Halter starb, danach sprang die Uhr zurück), gilt als tot (vorher erst nach Δ + 150 s; der Tageslauf wurde abgewiesen, die Nachkontrolle übersprang still) · **K4** `pruefen()` ist prozessweit mit einer Marke je Pfad: nimmt derselbe Prozess dieselbe Sperre in einem anderen Thread neu, wird der eingefrorene Thread nicht mehr gebremst — nur im Cockpit-Prozess möglich, dokumentiert ·
>   **K5** Ampel und Bat: `rc=3` (Dauerwarnung «weiterhin nicht vollständig gesichert») ist jetzt GRAU mit Warntext statt grün; negative Rückgabewerte (NTSTATUS bei Kill/Absturz) sind rot (die Regex kannte nur Ziffern); die Bat schreibt auch ohne Buch `rc=0` (eine alte `rc=1` hielt die Ampel bis zu 30 Minuten zu Unrecht rot); ein Durchgang, der seit mehr als 15 Minuten nie zu Ende ging (Rückgabewert älter als der letzte Start, `NK_ENDE_MAX_MIN`), ist rot — das Lebenszeichen allein zeigte «läuft», auch wenn das Zeitlimit der Aufgabe jeden Durchgang beendete ·
>   **K6** die Schwelle in `perp_ganz_ergaenzen` lag bei 2 Stops statt `PERP_BLIND_MAX` = 3: jetzt kommt bei zwei bekannten Stops und unlesbarer Liste noch ein dritter GANZER reduceOnly-Stop über den Short, und erst ab drei bekannten Stops ist es laut — das 9'405-USDT-Loch von W2′ ist damit für diesen Fall geschlossen (drei Tests, die den alten Wert festhielten — `16.E40`, `12.S4`, `18.W2′` —, wurden auf die Schwelle 3 umgestellt).
> - **Eigener Fund der R19 (E49):** das Zeitbudget zählte zuerst nur `_nochmal`. Ein Messversuch mit den ECHTEN Wartezeiten (der Prüf-Fuzzer nullt sie) zeigte, dass ein Durchgang bei scheiternden Stops trotz Budget 8 s schlief: die Stop-Platzierung `_platziere` — der Hauptteil der Dauer, jeder Preis × alle Wiederholungen — hatte ihre eigene Pause. Jetzt laufen beide über `_pause`; der Test misst die Pausen eines ganzen Durchgangs (ohne Budget ≥ 6 s, mit 3 s Budget höchstens 3 s), Muster R19-M9.
> - **Lehren der Folge-Runde (Fortsetzung):** (10) **Eine Drosselung muss vom ERFOLG abhängen, nicht vom Versuch** (W1) — und ein Fake, der nichts zurückgibt, prüft den Rückgabewert nicht. (11) **Ein Zeitbudget muss die Stelle zählen, an der die Zeit wirklich vergeht** (E49) — erst die Messung am ganzen Durchgang zeigte, dass die Platzierung der Stops am Budget vorbeilief. (12) **Ein Test, der eine Konstante benutzt, prüft die Konstante nicht** (`PUSH_ABSTAND_S`): feste Zahlen (58/62 Minuten).
>   (13) **Wer eine Schwelle ändert, sucht zuerst alle Tests, die sie bei ihrem alten Wert festhielten** (K6: drei Tests). (14) **Ein Prüfbericht mit kleinen Funden verlangt trotzdem eine eigene, eingefrorene Delta-Messung** — aber keine Wiederholung der ganzen Kampagne: gemessen wird, was sich geändert hat, und im Text steht, welcher Commit welche Zahl trägt.
> **Endstand der Folge-Runden R17 – R19.** Die Hauptmessung (Kampagne, Raster, Scans, Verzahnung, volle Mutationsprobe) lief auf dem Produktionscode `c08d4fae5` (R17 + R18); die 19. Prüfung verlangte danach kleine Änderungen am Schutzcode — diese sind auf dem eingefrorenen Stand `914701359` (R19) mit einer **Delta-Kampagne** gemessen, die nur die berührten Achsen plus Basis fährt (die Hauptkampagne wurde dafür nach 333 von 991 Aufträgen beendet, ohne Befund). Jede Zahl nennt ihren Commit; danach nur Tests, Prüfwerkzeuge und Doku.
> **Hauptmessung auf `c08d4fae5` (Schlusskampagne `camp18` auf frischen Seeds 800000 ff.):**
> - **Schlusskampagne `camp18` (beendet nach 333 von 991 Aufträgen, frische Seeds 800000 ff.): 333 Aufträge = 8'700 Fuzzer-Läufe, 0 echte Befunde** (268 begründete Einträge der bekannten Klassen). Fuzzer-Läufe nach Modus: Standard 4'000, streng 3'750, Lücken-Modus (Konto IMMER ohne STOP_LOSS) 350 (Standard) und 600 (streng) — Läufe × 30 Tage, Listen, Monotonie, Not-Aus;
>   dazu das Basis-Raster (12 Szenarien × Standard/streng: 212 gemessene Läufe, 0 Befunde).
> - **Raster-Kette (Raster I): 54 Aufträge = 12'799 gemessene Läufe, 0 Befunde** — `--geist --paare` 492, `--notaus --geist --paare` 90, `--notaus` 513, `--haengend` 1'557, `--haengend --kurs --paare` 3'120, `--notaus --haengend` 1'571, `--kurs` 5'456 (je 12 Szenarien × Standard/streng, soweit die Kampagne sie erreichte).
>   In 212 davon stand direkt nach dem Lauf bzw. Not-Aus bis zur Nachkontrolle etwas ohne wirksamen Stop — laut gemeldet, von ihr geheilt (Statistik `bis_nk_ungeschuetzt`, kein Befund).
> - **Raster II: 158 Aufträge = 14'645 gemessene Läufe, 0 Befunde** — Basis 1'622, Paare 1'412, Tripel 1'017, Versatz schreibend × lesend 3'415, Kurssprung zu jeder Anfrage 3'817, Geister-Stop 3'210, Not-Aus × cancelReplace 152.
>   In 581 davon stand direkt danach etwas bis zur Nachkontrolle ohne wirksamen Stop (laut gemeldet, von ihr geheilt), in 22 davon hatte Pilot 2.0 selbst einen Stop entfernt («Storno zuerst», Vorsorge-Stop), den Markt vermerkt, und die Nachkontrolle heilte es — der grösste Betrag dabei 12'044 USDT (dokumentiertes Restrisiko).
> - **Abbruch-Scans (`pruef_kill.py`):** 65 Abbrüche des Tageslaufs (Standard/streng), 492 mit einer Störung vorher, 43 mit sterbender Nachkontrolle, 43 mit sterbendem Not-Aus und 603 mit ZWEI Störungen vorher (Stichprobe jeder 10. Stelle) — **0 Befunde**.
> - **Lot-Scan (`pruef_lot.py`):** 3'240 Lagen (Coins mit Bruchteilen eines Lots × Short × alter Spot-Stop × alte Perp-Stops × «nicht löschbar», `_notaus_schutz` je dreimal): **0 Befunde**, gegen die strenge Prüf-Börse 0; am Stand VOR dem Fix (Gegenprobe) 84 Befunde.
> - **Verzahnungsscans** (der Tageslauf hält vor seiner n-ten Anfrage an, ein zweiter Lauf läuft mittendrin): Not-Aus: **0 von 1'054**; Nachkontrolle: **0 von 1'054**; Stop kommt und geht: **0 von 1'054**; Stop nur: **0 von 1'054**
> - **Mutationsprobe** (die Liste hat 483 Muster, davon 100 dieser Folge-Runden: R17-M1–M41, R18-M1–M29, R19-M1–M30; `python3 -B`, fail-fast, mit automatischer Vorab-Kontrolle «unmutiert grün»): 203 Muster wurden auf dem R18-Stand `0ddd2d37c` bewertet, weitere 54 danach auf dem Endstand (der Läufer wurde dafür auf den neuen Stand umgestellt; alle 483 zu fahren hätte viele Stunden gedauert) — zusammen **247 erkannt, 10 offen** von 257 bewerteten. Offen sind 10, alle schon aus den Runden 12–16 bekannt und dort einzeln dokumentiert: 9 als gleichwertig begründet (M14, R10-M17, R11-M19, R12-M5, R12-M23, R12-M34, R14-M49, R14-M53, R15-M31); 1 ohne unterscheidenden Zustand (R14-M77) — seit der 16. Runde vorgemerkt (direkte Szenarien statt Seeds) und in dieser Folge-Runde NICHT geschlossen. Ein neues offenes Muster gibt es in dieser Folge-Runde nicht (die Muster R19-M1–M30 stehen in der Delta-Messung unten).
> - **R17-Zwischenläufe:** die Schlusskampagne auf dem Stand vor der 18. Prüfung (`camp17a`, Stand `99bb37a00`) fand E45 und wurde abgebrochen; `camp17b` (Stand `e87230c5e`, mit dem Lot-Fix) lief 234 von 991 Aufträgen ohne Befund und wurde zugunsten von R18 abgebrochen; die Verzahnungsscans auf `e87230c5e`: Not-Aus 0, Nachkontrolle 0, Stop kommt und geht 0, Stop nur 0 von je 1'054.
> **Delta-Messung auf `914701359` (R19; Kampagne `camp19`, frische Seeds 1100000 ff.):**
> - **Delta-Kampagne `camp19`: 319 Aufträge, 0 echte Befunde** (301 begründete Einträge der bekannten Klassen). Lange Nachkontrolle: Fuzzer 4'700 Läufe (Läufe × 30 Tage, Listen, Monotonie, Not-Aus; Standard, streng, Lücken), Raster 3'684 Fälle, Abbruch-Scans 4'482 Abbrüche.
>   **Nachkontrolle im 10-Minuten-Takt** (`PRUEF_NK_EINMAL=3`, drei Durchgänge): Fuzzer 4'700 Läufe, Raster I und II 3'024 Fälle, Abbruch-Scans der Nachkontrolle und des Not-Aus 396 Abbrüche. **Mit aufgebrauchtem Budget** (`PRUEF_EINMAL_BUDGET=0`: keine Wiederholung innerhalb des Durchgangs, der schlimmste Fall): Fuzzer 2'200 Läufe, Raster 718 Fälle.
> - **Eigenschaftstest `pruef_vereinen.py`:** 50'000 Folgen mit drei Schreibern, 0 Verstösse.
> - **Zombie-Scans (`pruef_zombie.py`) auf `914701359`:** der Zombie wacht mitten in der Nachkontrolle auf: 3'593 Fälle, **0 Befunde**; die Nachkontrolle friert ein: 503 Fälle, **0 Befunde**; der Not-Aus friert ein: 68 Fälle, **0 Befunde**; der Tageslauf friert ein: 231 Fälle, **0 Befunde**; der Zombie wacht mitten in der Nachkontrolle auf (Szenarien 0–3), streng: 1'356 Fälle, **0 Befunde**; die Nachkontrolle friert ein, streng: 503 Fälle, **0 Befunde**; der Not-Aus friert ein, streng: 68 Fälle, **0 Befunde**; der Tageslauf friert ein, streng: 231 Fälle, **0 Befunde**; der Zombie wacht mitten in der Nachkontrolle auf (Szenarien 0–3), 10-Minuten-Takt mit aufgebrauchtem Budget: 861 Fälle, **0 Befunde**; der Zombie wacht mitten in der Nachkontrolle auf (Szenarien 0–3), Nachkontrolle im 10-Minuten-Takt: 861 Fälle, **0 Befunde**; die Nachkontrolle friert ein, Nachkontrolle im 10-Minuten-Takt: 281 Fälle, **0 Befunde**; der Not-Aus friert ein, Nachkontrolle im 10-Minuten-Takt: 68 Fälle, **0 Befunde**.
> - **Verzahnungsscans auf `914701359`:** Not-Aus: **0 von 1'054**; Nachkontrolle: **0 von 1'054**; Stop kommt und geht: **0 von 1'054**; Stop nur: **0 von 1'054**
> - **Lot-Scan (`pruef_lot.py`) auf `914701359`:** 3'240 Lagen: **0 Befunde**, gegen die strenge Prüf-Börse 0.
> - **Tests auf dem Endstand: 1'790 in 22 Dateien, alle grün** — streng 697, live 154, pilot 123, cockpit 162, testnetz 97, plan 23.
> - **Mutationsprobe der R19-Änderungen auf `914701359`:** 43/45 erkannt. Offen waren **R16-M66** (ein altes Muster der 16. Runde, dort begründet) und **R19-M21** («Sperre aus der Zukunft gilt sofort als tot» — gleiches Ergebnis, aber Δ Sekunden Dauerlauf): der Test prüft jetzt auch die Dauer und erkennt sie (einzeln nachgeprüft: zwei Fälle rot, 20 s und 200 s); R19-M20 und die Ersatzfassungen älterer Muster sind erkannt.
> - **20. unabhängige Prüfung:** erledigt (Stand `57cf79ef3`, verglichen mit `0ddd2d37c`): **kein Blocker, 1 wichtig, 8 klein** — alles Weitere steht in der Folge-Runde R20 unten. `FREIGEGEBEN = False` bleibt, bis eine Prüfung ohne Blocker UND ohne wichtige Lücken bleibt (die 20. hatte keinen Blocker, aber eine wichtige Lücke in der Anzeige).
>
> **Folge-Runde R20 (zur 20. unabhängigen Prüfung: kein Blocker, 1 wichtig, 8 klein).** Die Prüfung hielt die Fixes der R19 auf allen gemessenen Achsen: ein **Einzelfehler-Raster** (genau EINE Störung bei jeder Anfrage eines Durchgangs `einmal` mit aufgebrauchtem Budget; Standard, streng, junge Aufträge, Abriss und 429, Tod des Tageslaufs nach dem n-ten Auftrag — rund 34'000 Läufe), 2'232 Doppelfehler, 2'520 Läufe mit zwei offenen Märkten, Ausfälle über 1–6 Takte (6 × 1'120 Fälle + 144 Folgetag-Läufe), Fuzzer, Raster, Zombie-, Lot- und Abbruch-Scans mit Budget 0 und eine Echtzeit-Messung (ein Durchgang bei schnellen Fehlern: 60,1 s) — **0 Befunde**. Gefunden hat sie nur Lücken am Rand:
> - **Wichtig 1 — die Kopfzeile der Gesundheits-Karte (kein Schutzverlust, eine Fehlmeldung):** die graue Zeile der Dauerwarnung (Rückgabewert 3) liess die Kopfzeile auf «alles in Ordnung» stehen — `cockpit.html` zählte nur rote Zeilen. Behoben: die Zeile trägt das Kennzeichen `warnung`, die Kopfzeile zählt Warnungen mit («1 Warnung — bitte unten ansehen», neben roten Punkten «· 1 Warnung»), und `pilot.py --nachkontrolle --einmal` führt Buch über die **Reihe** gleichartiger Durchgänge (`data\krypto-nachkontrolle-serie.json`: ok / warnung / besetzt, Anzahl, Beginn; eine Lücke von mehr als 30 Minuten oder ein Zeitsprung zurück beginnt sie neu): **zwei Warnungen in Folge (rund 20 Minuten) sind rot** («steht seit N Durchgängen in Folge»), eine einzelne bleibt grau mit ⚠. Die Kopfzeile besteht aus reinen Funktionen (`gesundZeichen`, `gesundKopfzeile`, Block `gesund:start … gesund:ende`), der Test führt sie mit node aus (die Datei per stdin; fehlt node oder startet es nicht, prüft der Test nur die Bauform — er gehört zum Selbsttest vor dem Handeln). **Lehre:** eine Anzeige hat zwei Ebenen, die Zeile UND ihre Zusammenfassung — die R19 färbte die Zeile grau, die Kopfzeile zählte weiter nur Rot.
> - **Klein 1 — Ampel «Dauerhänger»:** beendete das Zeitlimit der Aufgabe jeden Durchgang, stand die Ampel in den ersten 15 Minuten nach jedem Start grün (rund 43 % der Zeit) und blieb dauerhaft grün, wenn die Rückgabewert-Datei nie erneuert wurde. Jetzt ist ein Rückgabewert, der bei einem Start vor mehr als 5 Minuten älter als 30 Minuten ist — oder ganz fehlt —, rot («die Durchgänge gehen nicht zu Ende»).
> - **Klein 2 — die Temp-Datei des Buchs:** alle Schreiber teilten den Namen `<Buch>.neu`. Verlor ein Zombie sein Veto erst NACH dem Schreiben seiner Temp-Datei, konnte er die Temp-Datei des rechtmässigen Schreibers überschreiben, und dessen `replace` übernahm den veralteten Inhalt (zwei Millisekunden-Fenster müssen zusammenfallen; Endzustand wie klein 1 der 19. Prüfung: bis 4'747 USDT bis zum nächsten Takt). Jetzt hat jeder Schreiber einen eigenen Namen (`<Buch>.<Prozess>-<Thread>-<Zähler>.neu`), bei Fehler und Veto bleibt nie eine EIGENE Temp-Datei liegen (nie die eines anderen gelöscht), und verwaiste (älter als eine Stunde, auch die gemeinsame der früheren Fassung) werden beim nächsten Schreiben aufgeräumt; `.gitignore` kennt `data/*.neu`. Dass ein Zombie, dessen Sperre schon weg ist, gar keine Temp-Datei mehr schreibt (die erste Prüfung der Aufrufer), prüfen drei neue Tests mit einem Zähler der Temp-Schreibungen — das schliesst die Muster R18-M1–M3, die seit der zweiten Prüfung vor dem Umbenennen (R19) nicht mehr erkannt wurden (gleiches Ergebnis, aber der Zombie hätte die Temp-Datei geschrieben). **Das Zurücklesen nach dem Umbenennen** (Vorschlag der Prüfung) **ist nicht gebaut:** mit eigenen Namen kann ein Zombie keine fremde Temp-Datei mehr treffen; es bleibt der Fall «der Zombie besteht beide Prüfungen und benennt NACH dem rechtmässigen Schreiber um» — ein Fenster von Mikrosekunden (siehe Restrisiken oben).
> - **Klein 5 — Push:** `signale.push` gab bei eingerichtetem Telegram nur dessen Antwort zurück: kam die Nachricht über ntfy an und Telegram scheiterte, galt sie als nicht zugestellt und wurde nie gedrosselt (sechs gleiche Pushes je Stunde, 144 am Tag); wechselnde Texte (A, B, A, B) kamen alle an, weil nur die LETZTE Kennung gemerkt wurde. Jetzt gilt eine Meldung als zugestellt, sobald EIN Kanal sie annahm (`push_kanaele` liefert die Kanäle einzeln, ein nicht eingerichteter ist `None`; `--test-push` verlangt weiterhin ALLE eingerichteten), und die Drosselung merkt die Kennungen der letzten Stunde (bis 8; die Datei der früheren Fassung wird verstanden). Das gilt nur INNERHALB einer Folge gleicher Art: eine Entwarnung («geklärt», `warnung=False`) beendet die Folge der Warnungen — kehrt dieselbe Warnung zurück, geht sie sofort raus (ein erster Entwurf hätte sie eine Stunde lang unterdrückt). Die Kennung ignoriert nur, was sich ändert, WEIL ZEIT VERGEHT (Alter wie «seit 12 s», Kurse wie «@ 4242»): sonst bekäme jeder Takt eine neue; Mengen bleiben Teil der Kennung («0,003» und «0,5 BTC unklar» sind verschieden grosse Probleme). Ein Push, der mit einer Ausnahme scheitert (z. B. ein ntfy-Server ohne `https://`), beendet nie einen Durchgang.
> - **Klein 6 — Wache aus der Zukunft:** `sperre._wache` prüfte das Alter nur gegen die Vergangenheit; eine Wache mit Änderungszeit in der Zukunft (Uhr zurückgesprungen) blockierte jede Übernahme (Besetzt nach 2 s). Jetzt `abs(…)`. Der andere Teil des Fundes — springt die Uhr um mehr als `alt_nach` zurück, übernimmt ein Beobachter eine lebende Sperre sofort, und der Halter bekommt das Veto — ist der akzeptierte Preis der R19 (zwei Prozesse geprüft).
> - **Klein 7 — Prüfwerkzeuge:** der Einzelfehler-Raster der Prüfung liegt im Repo (`pruef_nk_einzelfehler.py`, mit Rauchprobe UND Negativkontrolle im Test: gegen den Produktionscode findet er nichts, gegen eine Nachkontrolle ohne Folge-Durchgänge die Lücke); `PRUEF_NK_JUNG=1` für den Fuzzer (Durchgang 1 sieht unklare Aufträge als junge, vorher schon als alte); `PRUEF_KILL_NK_EINMAL=1` für `pruef_kill.py --nk` (das sterbende Kind ist ein Durchgang `einmal`, nicht die lange Fassung). Der Zufalls-Fuzzer ist blind für «Vermerk vergessen bei Budget 0» — dafür ist der Raster da.
> - **Klein 8 (latent):** das Wiederholungs-Budget ist jetzt je Thread getrennt (`_ThreadZelle`, Schnittstelle `_RETRY_BUDGET[0]` unverändert) und ein Durchgang `einmal` stellt ein vorher gesetztes Budget wieder her: ein Durchgang `einmal` darf keinen Not-Aus im selben Prozess einschränken (heute läuft er nur in `pilot.py --nachkontrolle --einmal`, einem eigenen Prozess; der Cockpit-Prozess startet die Nachkontrolle als Unterprozess, führt den Not-Aus aber in Handler-Threads aus — die Trennung schützt einen künftigen Aufruf im Cockpit-Prozess). Dass ein Durchgang bei belegter Sperre mit Rückgabewert 0 endet, bleibt (ein einzelner Überlapp mit dem Tageslauf ist normal) — aber die Reihe zählt ihn: **vier übersprungene Durchgänge in Folge (rund 40 Minuten) sind rot UND gehen einmal aufs Handy** («die Lauf-Sperre hält ein anderer Lauf — hängt der Tageslauf? Ein angeklicktes Konsolenfenster hält ein Programm an, sein Herzschlag läuft weiter; solange prüft niemand die Stops»): die Lampe sieht nur, wer das Cockpit offen hat.
> - **Eigene Code-Reviews der R20 (fünf Durchgänge über den Diff, rund 40 Funde; alle behoben bis auf drei begründet belassene):** die Durchgänge liefen mit dem Skill «code-review» (ein unabhängiger Leser, der Befunde nachstellt); die Funde der späteren Durchgänge sassen zu einem guten Teil in den Korrekturen der früheren. *Ampel:* eine FEHLENDE Rückgabewert-Datei hielt sie bis 15 Minuten nach dem Start grün; eine überholte Reihe («besetzt ×4», danach beendete die Bat einen Durchgang ohne `pilot.py`: kein Buch) hielt sie bis 30 Minuten rot — jetzt zählt eine Reihe nicht, die mehr als 2 Minuten VOR dem Rückgabewert endet; das Warnzeichen war im hellen Thema zu blass (Kontrast 1,8:1 → ≥ 4,5:1). *Protokoll* (`protokoll_schreiben`, nicht Teil der Prüfung, gleiche Fehlerklasse wie klein 2): teilte sich `<Protokoll>.neu`, verlor bei gleichzeitigen Schreibern Einträge, warf bei einem Schreibfehler eine Ausnahme in einen Lauf, dessen Aufträge schon raus waren, überstand weder «{}»/«null» noch unlesbare Bytes, und ein EINMAL nicht lesbares Protokoll (Windows: Virenscanner) wurde für leer gehalten und überschrieben — jetzt ein Name je Schreiber, eine kurze Schreib-Sperre (höchstens 1 s), Wiederholungen, ein Nicht-Protokoll wird beiseitegelegt (wie das Logbuch), ein dauerhaft unlesbares nie überschrieben, best effort; der Eintrag des unterbrochenen Laufs steht NACH dem Schliessen (ein langsames Protokoll hielte sonst den Not-Aus auf) und, per `finally`, auch wenn der Not-Aus eine Ausnahme wirft. *Tests des Selbsttests vor dem Handeln* (`krypto-auto.bat`: alle Testdateien müssen grün sein): hingen von `KI_BOT_STOP`/node ab, überschrieben die Dateien des Nutzers (`data/krypto-nachkontrolle-serie.json`) und liessen einen JS-Fehler als «node fehlt» durchgehen — jetzt umgebogen (`testumgebung`), node erst auf Lauffähigkeit geprüft, ein Skriptfehler ist ein echter Fehler; ein Test hält die Dateinamen und Schwellen von `pilot.py` und `cockpit.py` zusammen. *Werkzeug/Sonstiges:* `_serie_merken` schreibt atomar und meldet Fehler; Aufräumen und Strg-C im Werkzeug. **Belassen:** (a) `_ThreadZelle` — der Reviewer hält sie für spekulativ (ein künftiger Kind-Thread sähe kein Budget); sie schlägt auf der sicheren Seite fehl (ein Not-Aus wird nie vom Budget eines anderen Threads begrenzt), der Preis sind unbegrenzte Wiederholungen in einem Kind-Thread, den es heute nicht gibt; (b) Buch- und Protokoll-Schreiben teilen nur `_buch_tmp`/`_buch_temp_aufraeumen`, die Wiederholungsschleifen sind doppelt — ein gemeinsamer Helfer wäre ein Umbau im Schutzcode; (c) die Ampel liest drei Dateien (Lebenszeichen, Rückgabewert, Reihe) und gleicht ihre Zeiten ab — ein einziger Statussatz von Bat und `pilot.py` wäre ein Umbau der nicht prüfbaren Windows-Seite.
> - **Kampagnenfund der Delta-Kampagne `camp20` (älter als die R20, schon im Stand der R19 — kein Rückschritt):** strenger Not-Aus-Seed 1510735 (Auftrag `notaus_1510500_1510750`, Befund `PERP_STOP_UEBER_NETTO`). ETH-Paar mit Coins 0,1647, Short 0,053 und einem Spot-Stop über die Netto-Richtung (0,1117); der Not-Aus verkauft die freien Coins, das Verkleinern des Spot-Stops (`cancelReplace`) wird zweimal mit 429 abgewiesen, beim dritten Mal **kommt es an, aber die Antwort geht verloren**. Der Schutz rechnete danach pessimistisch («vielleicht steht der alte, zu grosse noch» → der Short bekommt seinen Stop über die GANZE Menge) — richtig, falls das Ersetzen nie ankam. Kam es an, waren 0,053 Coins frei und **ohne Stop**, und löste der Perp-Stop aus (Kurs +5 %), blieben **0,053 ETH ≈ 244 USDT bis zur Wiederholung des Not-Aus ohne Stop** (laut gemeldet; die zweite Schutz-Runde vergleicht nur die Summe der Coins, nicht deren Aufteilung in frei und gesperrt, und blieb darum aus). Der Tageslauf macht es seit der 16. Prüfung richtig (nach «Ersetzen unklar» frisch lesen, `_spot_rest_sichern`), der Not-Aus-Schutz nicht. Behoben: nach einem unklaren Verkleinern liest er Coins frisch (`bestand`), die Entscheidung «zu gross → Perp-Stop über die ganze Menge» bleibt pessimistisch, und der vorhandene Zusatz-Stop («Spot-Stop über die übrigen Coins») fasst die freigegebenen Coins. Steht der alte Stop noch, sind keine frei (alles wie bisher); ist der Kontostand genau dann nicht lesbar, bleibt es beim bisherigen Verhalten — der Perp-Stop über die ganze Menge steht, die freien Coins sichert die Wiederholung des Not-Aus (Restrisiko nur bei BEIDEM: Antwort verloren UND Konto nicht lesbar). Tests `20.F1` (der Seed; Variante mit unlesbarem Konto), Muster R20-M77/M78. Die anderen Aufrufer des Verkleinerns (`_spot_abgleich` im Tageslauf, `_spot_freigeben` im Verkaufsweg des Not-Aus) lesen nach: im Tageslauf zu Beginn der nächsten Runde, im Not-Aus vor dem Schutz («4) nachprüfen»). Ein sechster Review-Durchgang über die Korrektur (8 Funde): **3 übernommen** (das stille `except: pass` beim Neulesen ist jetzt laut — «Antwort verloren UND Kontostand nicht lesbar», der Markt zählt als nicht vollständig gesichert und ist für die Nachkontrolle vermerkt; die Meldung, dass das Verkleinern doch ankam; der Test «Verkleinern kam nicht an»), **1 widerlegt** (das Löschen eines überzähligen Stops mit Ausnahme: `Spot.abbrechen` macht aus -2011 ein `False`, und ein überzähliger Stop gehört nicht zum Bedarf — es entsteht keine Lücke), **4 begründet belassen**: (a) das Ersetzen kommt erst NACH dem Lesen an (verspätete Ausführung; Restrisiko wie im Tageslauf, die Wiederholung des Not-Aus holt es nach — oben unter «Bekannte Restrisiken»); (b) die Entscheidung «zu gross → Perp-Stop über die ganze Menge» bleibt auch nach einem bestätigten Verkleinern pessimistisch (beidseitig ist sicher, nur teurer); (c) alte `coins`/`soll_s` neben frischem `frei`/`gebunden` — der Zusatz-Stop wird durch `frei` begrenzt, ein Nachziehen von `coins` änderte nichts Messbares; (d) die ID des Spot-Stops im Buch wird im regulären Weg nach einem erfolgreichen Verkleinern ebenso wenig nachgeführt (die Stops werden am Konto gefunden, nicht im Buch), und ein gemeinsamer Helfer für «frisch lesen oder alten Stand behalten» wäre ein Umbau im Schutzcode. **Weil die Korrektur Schutzcode ändert, lief die Kampagne auf dem neuen Stand von vorn** (`camp20b`, frische Seeds; die alte Kampagne wurde nach 354 von 429 Aufträgen beendet, sie fand sonst nichts — siehe Messungen).
> - **Zweiter Kampagnenfund (`camp20b`, Tageslauf — nicht behoben, dokumentiert):** Seed 2500034, Tag 21 (Standard-Fuzzer; ebenfalls schon im Stand der R19, reproduziert auf `2dc096366` und `3fa8f1fdb`), Klasse `LAUT_SPOT_STOP_UEBER_NETTO`. ETH-Paar, Ziel +1,0 (vorher Coins 0,566, Short 1,136, Perp-Stop 0,571): der Lauf kauft Short und Coins um, `_stops_vorab` setzt den kleineren Perp-Stop (0,289) und löscht den alten (ausgeführt, Antwort verloren); danach lehnt Binance **jeden** Perp-Stop-Auftrag ab (503 × 99 — eine Dauerstörung genau der Schutzhandlung), und der Markt ist «beidseitig» (zuvor «Perp-Stop nach dem Kauf nicht anpassbar»): der Spot-Stop steht über ALLE Coins (0,8478), der Perp-Stop deckt nur 0,289 von 0,854 Short. Löst der Spot-Stop aus, stehen **0,565 ETH Short (≈ 2'000 USDT) ohne Stop**, bis Binance Perp-Stops wieder annimmt und die Nachkontrolle sie setzt (laut gemeldet: «beidseitig vorgesehen … aber noch nicht alles gesichert»). Der Fuzzer entschuldigt Dauerstörungen nur, wenn Pilot 2.0 im Schritt keinen eigenen Stop entfernt hat — hier hat er (den alten Perp-Stop, im Voraus verkleinert), darum zählt es. **Nicht behoben:** die Lösung wäre ein Spot-Stop über genau `S = P + (Coins − Short)` (P = was die Perp-Stops decken) statt «alle Coins», wenn die Perp-Seite nicht vollständig wird — das hält beide Auslösungen ohne Lücke —, oder die Perp-Seite zuerst; beides ändert Reihenfolge und Rechnung im empfindlichsten Code des Tageslaufs, und die Folge (bis zu einem Takt, nur solange Binance Perp-Stops dauerhaft ablehnt UND ein Stop schon entfernt war) ist laut gemeldet. **Kandidat für die nächste Runde.** Nachspielen: `python3 -B pruef_fuzzer.py laeufe 2500034 2500035 30` (zeigt `LAUT_SPOT_STOP_UEBER_NETTO`, Tag 21); die Klasse bleibt im Fuzzer sichtbar (kein Ausnahmefall eingebaut), neue Kampagnen melden sie wieder, bis sie behoben ist.
> - **Bewusst nicht geändert:** *klein 3* (Spot-Stops zersplittern: ist die Spot-Liste mindestens drei Takte unlesbar, entsteht je Takt ein Stop mehr bis zum Limit 5) — gemessen über neun Takte mit dauerhaft unlesbarer Liste: die Stops erreichen das Limit 5 und bleiben dort (der kleinste wird ersetzt), alle Coins stehen unter Stops, 0 USDT ohne Stop (der Markt ist «beidseitig» gesichert); ein Deckel wie bei Perp (`PERP_BLIND_MAX`) liesse neu gekaufte Coins ungeschützt, und bei sehr langer Lesestörung räumt der nächste lesbare Lauf auf. *Klein 4* (hängendes Netz) siehe den Abschnitt zur Haltedauer der Sperre oben.
> - **Preis des 10-Minuten-Takts (Messung der Prüfung, kein Fund):** mit aufgebrauchtem Wiederholungs-Budget (dem schlimmsten Fall) bleibt nach Durchgang 1 in 12,5 % der Einzelfehler (1'155 von 9'240) etwas ohne Stop, bis 15'967 USDT; nach Durchgang 2 nie. Das sind bis zu 10 Minuten (der nächste Takt), laut gemeldet und vermerkt.
> - **Lehren der Folge-Runde:** (15) **Ein zweiter, späterer Schutz macht den ersten unsichtbar:** nach der zweiten Prüfung vor dem Umbenennen (R19) waren drei Muster der R18 (R18-M1–M3: die Prüfung der Aufrufer VOR dem Schreiben fehlt) nicht mehr erkannt — das Ergebnis ist gleich, nur dass der Zombie seine Temp-Datei schon geschrieben hätte. Ein Test muss die FRÜHE Prüfung einzeln beobachten (hier: ein Zähler der Temp-Schreibungen), nicht nur das Endergebnis. (16) **Ein Warnzustand braucht ein Gedächtnis:** ein Rückgabewert (3) sagt nicht, ob die Warnung seit einem Takt oder seit Stunden steht, und ein überspringender Durchgang (0) nicht, ob die Sperre kurz oder dauernd belegt ist — erst die Reihe zeigt es. (17) **Die Mutationsprobe auf dem Endstand findet, was die Zwischenstände nicht sehen:** die 16 offenen Muster der Probe `probe19c` (225 Muster auf dem R19-Endstand: 209 erkannt) waren nur zur Hälfte bekannt — darunter drei neue (R18-M1–M3), die jetzt geschlossen sind. **Auch die gezielte Probe der R20 genügte nicht:** R16-M66 lag ausserhalb der Auswahl und war unbemerkt offen, weil ein Seed-Test sein Muster nur über feste Anfragenummern erkannt hatte, die sich seit der R17 verschoben haben; erst die vollständige Probe auf dem Endstand fand es und zwei weitere (R14-M53 und die gleichwertigen M14/R14-M49). Seed-Tests sind Belege, keine Wächter — neben jeden gehört ein Test ohne Zufall. (18) **Tests, die zum Selbsttest vor dem Handeln gehören, dürfen nie von der Umgebung abhängen** (node, Umgebungsvariablen wie `KI_BOT_STOP`, Dateien des Nutzers): sonst blockiert eine optionale Prüfung das Handeln — oder überschreibt ein Test den Zustand, den die Ampel anzeigt. (19) **Eine Korrektur ist neuer Code und braucht denselben Review:** ein grosser Teil der Funde der späteren Review-Durchgänge sass in den Korrekturen der früheren (der Schreiber des Protokolls wuchs von einem Temp-Namen über Sperre, Wiederholungen und beiseitegelegte Dateien bis zur Reihenfolge im Not-Aus) — die kleinste Korrektur wählen und erst ausbauen, wenn ein Fund es verlangt. (20) **Ein Test dicht an einer Grenze braucht Abstand:** die Zeile für R20-M27 (veraltete Reihe zählt nicht) lag mit genau 2 Minuten Abstand auf der Grenze der ANDEREN Prüfung («Reihe endet zu lange vor dem Rückgabewert») — die Zeit, die der Test selbst brauchte, schlug über den Rand, und die andere Prüfung verwarf die Reihe schon: der Test bestand, ohne die gemeinte Prüfung je zu erreichen; erst die Mutationsprobe zeigte es (jetzt 30,5 statt 31 Minuten). Gleiche Klasse wie Lehre 15: zwei Wächter, der frühere wird nur sichtbar, wenn der spätere ihn nicht schon abfängt. (21) **Zwei Wege für dieselbe Aufgabe laufen auseinander:** der Tageslauf las nach einem unklaren Ersetzen des Spot-Stops seit der 16. Prüfung neu, der Not-Aus-Schutz nicht — eine Kampagne mit frischen Seeds fand die Lücke erst jetzt (nach 305 von 429 Aufträgen). Wird ein Fund in einem Weg behoben, den anderen mitlesen; und die Delta-Kampagne ist keine Nachprüfung nur der Änderungen, sondern eine neue Stichprobe des ganzen Codes. (22) **Seed-Tests sind Belege, keine Wächter:** R16-M66 war unbemerkt offen, weil sich die Anfragenummern des Seed-Tests 16.E40 seit der R17 verschoben hatten (Lehre 17 gilt auch für die gezielte Probe — nur die vollständige Probe auf dem Endstand fand es).
> **Messungen der R20** (Produktionscode `fd65a6dcc`, eingefroren; danach nur Tests und Doku):
> - **Tests: 1'878 in 22 Dateien, alle grün** — streng 731, live 156, pilot 140, cockpit 192, testnetz 97, plan 23, ki_bot 53.
> - **Mutationsprobe** (565 Muster, davon 82 neue R20-M1–M82 und die angepassten älteren; `python3 -B`, fail-fast, mit Vorab-Kontrolle «unmutiert grün» in allen Testdateien samt ki_bot): alle 565 Muster haben ein Urteil auf dem Endstand — in drei Läufen, weil die Probe mitwuchs: **(1) 192 Kennungen gezielt** (alle Muster in den geänderten Dateien, an den berührten Stellen von `pilot2_live.py`, alle R19-/R20-Muster, die bekannt offenen) auf `3fa8f1fdb`: 184 erkannt, 8 offen — R17-M11 und R17-M14 gleichwertig (unten); für R19-M18, R20-M27, R20-M40, R20-M47, R20-M49 und R20-M52 fehlte ein Test (jetzt je einer, erneut erkannt). **(2) 22 Muster nahe der Korrektur des Kampagnenfunds** (R20-M77–M82 und alle, deren Text `unsicher`, `gestoppt`, `zusatz`, `vorher` oder das Konto-Lesen berührt) auf `fd65a6dcc`: 21 erkannt, offen R16-M66 — schon auf `3fa8f1fdb` offen, nicht durch die Korrektur: der Seed-Test 16.E40 hatte es nur über feste Anfragenummern erkannt, die sich seit der R17 verschoben haben; neuer Test ohne Zufall, erkannt. **(3) die übrigen 360 Muster** auf `ba5469d74` (vollständige Probe, ausgelöst durch R16-M66; rund fünf Stunden): 341 erkannt, 19 offen — 16 schon dokumentiert (die elf der 16. Runde R14-M77, R15-M17, R15-M31, R16-M5, M17, M23, M36, M37, M52, M54, M81 und die fünf gleichwertigen R10-M17, R11-M19, R12-M5, R12-M23, R12-M34), drei neu: **R14-M53** (ein reduceOnly-Verkauf zählt im Vorab-Plan als neuer Short — jetzt eine Zeile im Test 11.S12, erkannt), **M14** und **R14-M49** (beide gleichwertig: `_stops_setzen` setzt `unklar_sell` in jeder Abgleich-Runde frisch, die frühere Zuweisung wird nie gelesen; der Zweig `stand_frisch = True` im zweiten Schutz-Durchgang läuft nur mit `pruefbar`, wo `stand_frisch = pruefbar` schon wahr ist). **Ergebnis über alle 565: 545 erkannt (darunter die acht mit neuen Tests), 20 offen — 9 gleichwertig, 11 in der 16. Runde dokumentiert, keins ohne Einordnung.** Die Urteile der 192 stammen von `3fa8f1fdb` (dazwischen liegt nur die Korrektur des Kampagnenfunds; die 22 nahe an ihr wurden auf `fd65a6dcc` neu gemessen)
> - **Delta-Kampagnen `camp20` und `camp20b`** (frische Seeds ab 1500000 bzw. 2500000): **`camp20`** (Stand `3fa8f1fdb`, nach 354 von 429 Aufträgen beendet, als die Korrektur des ersten Fundes fest stand): 59'550 Fuzzer- und Eigenschaftsläufe (davon 50'000 des Eigenschaftstests der Buch-Vereinigung), 17'213 Raster-/Scan-Fälle, 4'114 Abbruchstellen — **1 Befund** (Not-Aus-Seed 1510735, behoben). **`camp20b`** (Stand `fd65a6dcc`, alle 429 Aufträge: Tageslauf-, Not-Aus-, Listen- und Monotonie-Fuzzer — Standard, streng, Lücken —, die Nachkontrolle im 10-Minuten-Takt mit normalem und aufgebrauchtem Budget und mit jungen Aufträgen, Ausfall-Raster, Abbruch-, Zombie- und Einzelfehler-Scans, Eigenschaftstest der Buch-Vereinigung): 63'400 Läufe (davon 50'000 Eigenschaftstest), 23'895 Raster-/Scan-Fälle, 5'126 Abbruchstellen — **1 Befund** (Tageslauf-Seed 2500034, nicht behoben, siehe oben); der zweite Treffer desselben Auftrags (Seed 2500026, `DAUER_LAUT_LONG_OHNE_STOP`) ist die entschuldigte Dauerstörung, laut gemeldet
> - **Offene Muster, begründet:** *R17-M11* («nach dem Deckel kein Vermerk für die Nachkontrolle») ist gleichwertig: `_zu_gross(d)` setzt `d["nachkontrolle"]` schon selbst (Standard `merken=True`), die Zeile dahinter ist ein Gurt. *R17-M14* (das Schlussnachlesen löscht auch, wenn der neue Stop den Bedarf nicht allein deckt): gleichwertig, solange Binance den Stop in der gesetzten Menge speichert (der neue Stop wird mit genau `soll` gesetzt, die Summenprüfung ist ein Gurt gegen eine abweichende Börse). Die elf Muster der 16. Runde (R14-M77, R15-M17, R15-M31, R16-M5, M17, M23, M36, M37, M52, M54, M81) sind dort einzeln dokumentiert und unverändert offen.

Gleiche Signale wie der Pilot, klügere Ausführung über **beide** Binance-Konten (`pilot2_plan.py` rechnet, `pilot2_live.py`
handelt; 23 + 156 + 731 Tests gegen zwei streng nachgebaute Binance, Fuzzer, Mutationsproben). Ohne `KRYPTO_PILOT2=an` handelt der
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
python tools\trading\krypto_bot\testnetz_pruefung.py --los    (prüft A1–A10 und B1–B6, rund 1–2 Minuten, räumt auf)
```
- **A — reduceOnly-Perp-Stop über mehr als den offenen Short** (so sichert Pilot 2.0 einen Markt beidseitig): angenommen? bleibt
  er stehen? zwei gleichzeitig (Phase «zuerst neu setzen, dann alten löschen»)? Lehnt Binance ab, sichert er wenigstens den
  offenen Short und meldet es.
- **A6–A8 (seit der 14. Prüfung) — Sichtbarkeit und Storno über die Kennung:** Wie schnell zeigt die Liste der offenen Algo-Aufträge einen
  eben gesetzten Stop (sofort / erst nach mehreren Abfragen / nie)? Davon hängt ab, wie real der Fall F1 der 14. Prüfung ist (Antwort
  verloren + Liste hinkt nach → zwei Stops; Pilot 2.0 löscht seit der 14. Runde bekannte, nicht gezeigte Stops über die Kennung). Und: Was
  meldet Binance beim Storno einer nie gesetzten bzw. schon gelöschten Kennung — Erfolg oder −2011 (= «weg», so liest es Pilot 2.0), oder
  einen anderen Code (dann hielte er das Löschen für gescheitert: Dauer-Alarm statt Schutzverlust)? Lehnt Binance in A1 den Stop ohne Position ab (der
  wahrscheinlichste Ausgang), holt das Skript A6 und A8 nach dem Eröffnen des Shorts nach.
- **A9/A10 (seit der 15. Prüfung, W3) — Storno im Grenzfall:** **A9**: Storno UNMITTELBAR nach dem Setzen, ohne die Liste vorher zu lesen — so löscht
  Pilot 2.0 einen Stop, dessen Antwort verloren ging. Meldet Binance «Erfolg» oder «−2011», der Stop steht aber trotzdem (oder erscheint danach in der Liste),
  wäre «weg» falsch (Gespenst-Stop: als zu grosser reduceOnly-Stop kaufte er beim Auslösen die Absicherung zurück). **A10**: Storno eines schon AUSGELÖSTEN
  Stops (knapp über dem Markt; das Skript wartet bis zu 60 s auf die Aufwärtsbewegung, sonst «nicht geprüft» — bei bewegtem Markt nochmals laufen lassen).
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
zum Markt aus; lehnt Binance das bis zum Schluss ab, kommt an seine Stelle ein Not-Stop unter dem Kurs). Ist die Spot-Liste dauerhaft
unlesbar, sieht er einen hängenden Stop-Limit nicht (Klasse `LIMIT_LUECKE_`, nur Konten ohne STOP_LOSS-Typ). Ist die **Perp**-Liste unlesbar, kennt das Buch einen bisherigen Perp-Stop und überschätzt `_alt_deckt` dessen Deckung (die Schätzung kennt die Grösse des alten Stops nicht, nur den Netto-Short vor den heutigen Aufträgen), löscht Pilot 2.0 einen vielleicht angekommenen neuen Stop wie bisher: der Rest des Shorts bleibt ohne Stop, bis die Nachkontrolle die Liste lesen kann (Raster `--geist`: im Tageslauf 0 Befunde in 696 Läufen; die Lücke bleibt theoretisch, weil das Buch keine Stop-Mengen führt — ein Gegenmittel «beidseitig sichern» schadet im häufigen Fall «nie angekommen»). **Harter Prozess-Abbruch** (Stromausfall, Absturz, Prozess beendet, Fenster geschlossen) zwischen dem ersten Auftrag eines Laufs und seinem Stop-Abgleich am Laufende: seit der 16. Folge-Runde steht jeder Markt mit Aufträgen
VOR dem ersten Auftrag in `schutz_offen` (seit der 17. Folge-Runde dreimal gespeichert, sonst heute kein Auftrag), die Sperre hat einen Herzschlag (alle 30 s) und gilt nach 150 s als tot, und die Nachkontrolle (wie der Not-Aus aus `pilot.py`, Cockpit und Telegram) übernimmt sie — **seit der 17. Folge-Runde hat sie einen eigenen Takt**
(zweite Windows-Aufgabe alle 10 Minuten, unsichtbar, ein Durchgang `--einmal` mit einem Wiederholungs-Budget von 60 s (`EINMAL_RETRY_S`), mit Lebenszeichen, Rückgabewert und Ampel; sie läuft nur bei angemeldetem Benutzer und ist auf Windows nicht von hier prüfbar → Prüfpunkt N1). Der Abbruch-Scan `pruef_kill.py`
findet nach der Nachkontrolle keinen Markt mehr ohne Stop. **Restrisiko:** fällt der GANZE Rechner aus (Strom, Absturz des Betriebssystems), läuft auch die Nachkontrolle nicht — schon gesetzte Stops bleiben an der Börse, eine eben geöffnete
Position ohne Stop bleibt es, bis der Rechner wieder an ist (dann übernimmt sie die tote Sperre nach höchstens 150 s; der nächste Tageslauf findet sie ohnehin über den Kontostand, «Konto = Wahrheit»). **Ein eingefrorener, aber nicht toter Lauf**
(Ruhezustand: Herzschlag und Lauf stehen): übernimmt die Nachkontrolle die «tote» Sperre, sendet der erwachte Lauf keinen Auftrag mehr UND schreibt das Buch nicht mehr (`sperre.pruefen()` vor jedem schreibenden Auftrag und vor jedem Schreiben des Buchs; Zombie-Scan `pruef_zombie.py`: 0 Befunde). Offen bleiben das Fenster zwischen der Prüfung
und dem Senden bzw. Schreiben (Auftrag: der Zeitstempel entsteht erst nach der Prüfung, und Binance weist ältere Aufträge nach `recvWindow` = 10 s ab; Buch: seit R19 prüft `_buch_schreiben_roh` ein zweites Mal UNMITTELBAR vor dem Umbenennen der Temp-Datei, es bleibt ein Rest von Mikrosekunden) und ein Uhrensprung ≥ 150 s (ein lebender Halter erscheint tot; der übernommene schreibt dann nichts mehr; seit R19 gilt auch eine Sperre, deren Änderungszeit mehr als `alt_nach` in der Zukunft liegt, als tot). Die frühere Verzahnung «Nachkontrolle läuft mitten im Tageslauf»
(3 von 1'050: zwei Perp-Stops, 2'582 USDT zu viel Stop) schliesst das Schlussnachlesen (e) — gemessen 0 von 1'054.
Übernehmen zwei Prozesse eine tote Sperre zugleich, entscheidet das Löschen und Neuanlegen (die Datei trägt die Marke des Halters; Tests «Sperre …»). **Dauerhaft offener Markt:** der 10-Minuten-Takt hält die Sperre nur Sekunden (kein 11-Minuten-Warten mehr); ein Tageslauf, der die Sperre trotzdem nicht bekommt, meldet es (rc 3 + Push). Das Budget von 60 s begrenzt die Pausen zwischen den Wiederholungen (`_pause` in `_nochmal` und `_platziere`), nicht die Zeit der Anfragen selbst: bei einem HÄNGENDEN Netz (jede Anfrage läuft ins Zeitlimit von 20 s) kann ein Durchgang trotzdem lange dauern (900 s bei einem, 1'020–1'300 s bei zwei Märkten; 20. Prüfung klein 4) — dann wird der Tageslauf laut abgewiesen und die Ampel «Nachkontrolle (Aufgabenplanung)» steht nach 15 Minuten auf Rot («nie zu Ende gegangen») bzw. nach vier übersprungenen Durchgängen in Folge («Lauf-Sperre belegt»). **Bewusst nicht mit einer Wanduhr-Frist (~120 s) gedeckelt:** sie bräche den Durchgang ab und verhinderte die Heilung genau dann, wenn das Netz zurückkommt — der laufende Durchgang macht dann einfach weiter; und ohne Netz lässt sich ohnehin nichts sichern. Ein Rest, der am Stop-Kurs unter
dem Mindestbetrag von Binance liegt (z. B. 7,3 USDT am Markt, 4,7 USDT am Stop-Kurs), bekommt keinen Stop — bis 10 USDT gilt er als Staub; die Nachkontrolle setzt den Stop mit dem Kurs aus dem Buch, wenn das reicht.
**Beidseitiger Markt bleibt stehen (E40/E41):** lässt sich ein zu grosser Perp-Stop nicht löschen, stehen Spot-Stops über ALLE Coins und Perp-Stops zusammen über den ganzen Short; der Not-Aus räumt das nicht auf, solange das Paar nicht zu schliessen ist — löst
eine Seite aus, schützt die andere den Rest, aber das Paar wird dann zum Kurs des Auslösens aufgelöst. Bleibt ein hängender Stop-Limit weder löschbar noch ersetzbar (E42), steht der Long bis zur Nachkontrolle ohne wirksamen Stop (laut gemeldet).
Das Limit der bedingten Aufträge auf der Futures-Seite ist nicht gemessen (Testnetz-Prüfpunkt); häufen sich nicht löschbare Perp-Stops, kann ein neuer abgelehnt werden (laut gemeldet, die Nachkontrolle versucht es nochmals).
Bei dauerhaft unlesbarer Perp-Liste UND nicht löschbaren Perp-Stops (Doppelstörung) löscht und setzt der Not-Aus den Spot-Stop über die Absicherung in jedem Takt neu — ein Fenster von Sekunden ohne Spot-Stop; wird das Neusetzen abgelehnt, ist er weg. Es ist laut (der Not-Aus gilt als nicht ok, «Not-Aus wiederholen»); behoben ist es nicht (18. Prüfung K6, siehe oben). Kennt das Buch bei unlesbarer Liste schon zwei Stops, kommt kein weiterer dazu und der Not-Aus meldet laut «ob sie den ganzen Short decken, ist unbekannt» (18. Prüfung W2′): das Buch führt nur Kennungen, keine Mengen.
**Verkleinern des Spot-Stops im Not-Aus mit verlorener Antwort (R20-Kampagnenfund):** der Schutz liest danach den Kontostand frisch und sichert die freigegebenen Coins. Kommt das Ersetzen erst NACH dem Lesen an (verspätete Ausführung), oder ist der Kontostand genau dann nicht lesbar (laut gemeldet, der Markt ist für die Nachkontrolle vermerkt), können die freigegebenen Coins bis zur Wiederholung des Not-Aus (höchstens ein Takt) ohne Stop sein — und löst vorher der Perp-Stop über die ganze Menge aus, stehen sie ungesichert (im Seed 1510735 0,053 ETH ≈ 244 USDT).
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
python3 tools/trading/krypto_bot/test_pilot.py    # 140 Tests, inkl. Risiko-Stufen (1 / 1,5 / 1,75 / 2), Sperre, Not-Aus mitten im Lauf, Algo-Stops und nachgebautem Binance-Futures-Server
python3 tools/trading/krypto_bot/test_sammler.py  # 48 Tests, inkl. nachgebautem Binance-Server mit Staking, verlorenen Antworten, Ablehnungen und Opt-in
python3 tools/trading/krypto_bot/test_infos.py    # 26 Tests: keine Zukunftsdaten, MVRV-Bremse, Zwischenspeicher
python3 tools/trading/krypto_bot/test_profit.py   # 45 Tests: getrennte Bücher, offen unbekannt, BNB-Gebühren, Ein-/Auszahlungen, Seitengrenze, Drosselung
python3 tools/trading/krypto_bot/test_cockpit.py  # 192 Tests: Claude, Schattenkonto, Cockpit, Knöpfe, Host/Einbetten, Ampel (Reihe der Durchgänge, Kopfzeile mit node), Not-Aus, Telegram, Startdateien
python3 tools/trading/krypto_bot/test_calls.py    # 84 Tests: 40 typische Call-Formate, Plausibilität, Antworten/Wiederholungen, Nachspielen, Zufallsprobe, Kopierer gegen nachgebauten Binance-Server
python3 tools/trading/krypto_bot/test_binance.py  # 21 Tests, inkl. nachgebautem Binance-Server mit Signaturprüfung
python3 tools/trading/krypto_bot/test_pilot2_plan.py  # 23 Tests: Pilot-2.0-Rechnung (Richtung, Ernte, Pfand, Mindestbeträge)
python3 tools/trading/krypto_bot/test_pilot2_live.py  # 156 Tests: Pilot 2.0 («Konto = Wahrheit») gegen eine strenge nachgebaute Binance
python3 -B tools/trading/krypto_bot/test_pilot2_streng.py  # 731 Tests: Belege der 8.–20. Prüfung (Blöcke 8.–20.), Schlussproben, Fuzzer-Funde gegen die Prüf-Börse, kleine Fuzzer, Ausfall-Raster (--geist, 15.G)
python3 -B tools/trading/krypto_bot/test_maxprofit.py      # 55 Tests: Max-Profit-Kern (gleiches Modell wie der Pilot, Kelly-Optimum, keine Zukunftsdaten, Kosten; Pilot 2.0 mit Hebel: = lauf2 bei 1×, Pfand-Regel, bei festem Kurs nie liquidiert)
python3 -B tools/trading/krypto_bot/test_testnetz_pruefung.py  # 97 Tests: das Testnetz-Prüfskript (A1–A10, B1–B6) gegen die Prüf-Börse (nur 127.0.0.1)
python3 -B tools/trading/krypto_bot/pruef_fuzzer.py notaus 0 1600     # grosser Fuzzer (für Prüfungen): Not-Aus unter harten Störungen
python3 -B tools/trading/krypto_bot/pruef_fuzzer.py laeufe 0 200 30   # … Läufe über 30 Tage, Störungen in jedem Schritt
python3 -B tools/trading/krypto_bot/pruef_fuzzer.py monotonie 0 400   # … Phase «nur Stornieren» (ab Laufbeginn oder mittendrin): nie Schutz verlieren
python3 -B tools/trading/krypto_bot/pruef_fuzzer.py listen 0 400      # … eine eigene Auftragsliste dauerhaft unlesbar (13. Prüfung)
PRUEF_STRENG=1 python3 -B tools/trading/krypto_bot/pruef_fuzzer.py laeufe 20000 20400 30  # … alle vier Arten im STRENGEN Modus (14. Prüfung): reduceOnly-Stop über der Position wird
                                                                      # abgelehnt (−2022), Störungen auf den ersten Anfragen mit endlichen Anzahlen, «unsichtbar» bis 8 Listenabfragen
PRUEF_LUECKEN=1 python3 -B tools/trading/krypto_bot/pruef_fuzzer.py laeufe 110000 110100 30  # … gezielter Modus (15. Prüfung): Konto IMMER ohne STOP_LOSS, dreimal so viele Kurssprünge (Weg «hängender Stop-Limit»); auch `notaus`
PRUEF_NK_EINMAL=3 python3 -B tools/trading/krypto_bot/pruef_fuzzer.py laeufe 950000 950300 30  # … die Nachkontrolle im Takt der Aufgabenplanung (18. Prüfung W3′): 3 Durchgänge `einmal=True` im Abstand von «10 Minuten» statt EINER langen Fassung (gilt für alle Fuzzer, Raster und Scans über `P.nachkontrolle`)
PRUEF_NK_EINMAL=3 PRUEF_EINMAL_BUDGET=0 python3 -B tools/trading/krypto_bot/pruef_fuzzer.py notaus 972000 972300  # … mit AUFGEBRAUCHTEM Wiederholungs-Budget (19. Prüfung W2): kein vorübergehender Fehler wird innerhalb des Durchgangs wiederholt — der schlimmste Fall des 10-Minuten-Takts
python3 -B tools/trading/krypto_bot/pruef_raster.py 0 12 [--kurs] [--haengend] [--notaus] [--geist] [--paare]  # deterministischer Ausfall-Raster (15. Prüfung): schreibende × lesende Störung × Zeitpunkt, Paare gekoppelter
                                                                      # Störungen, Kurssprünge, Not-Aus; Befundarten und Aufruf im Kopf der Datei (PRUEF_STRENG=1 für die strenge Prüf-Börse)
python3 -B tools/trading/krypto_bot/pruef_raster2.py paare 0 12 [--tripel] [--haengend] [--notaus] [--basis fehlt] [--jeder N]  # Raster II (16. Prüfung): Ereignisse mit EIGENEM Beginn, Paare/Tripel, Kurssprung zu jeder
                                                                      # Anfrage (`kurs`), Versatz schreibend × lesend (`versatz`), Geister-Stop × Kurssprung/Löschen/Rückkauf (`geist`), cancelReplace unbekannt (`basis`), `notaus_cr`, `tripel_h`
python3 -B tools/trading/krypto_bot/pruef_kill.py 0 12 [--stoerungen] [--paare] [--nk] [--notaus] [--jeder N]   # Abbruch-Scan (16. Prüfung): der Prozess endet hart nach dem n-ten Auftrag (Tageslauf; mit --stoerungen nach einer Störung;
                                                                      # --paare nach zwei Störungen: schreibend × schreibend/lesend/Kurssprung; --nk die Nachkontrolle; --notaus der Not-Aus), danach die Nachkontrolle —
                                                                      # was bleibt ohne Stop? (Befundart NACH_ABBRUCH_NK)
python3 -B tools/trading/krypto_bot/pruef_nk_einzelfehler.py 0 12 [AUSGABE.json] [--jung] [--doppel] [--tot|--nurtot] [--mehrarten] [--keinbudget]   # Einzelfehler-Raster (20. Prüfung): genau EINE Störung bei JEDER Anfrage eines Durchgangs `einmal`
                                                                      # (Budget aufgebraucht), danach zwei ungestörte Durchgänge — nach drei Durchgängen darf nichts ohne Stop bleiben; `--jung`: unklare Aufträge im ersten Durchgang jung (PRUEF_NK_JUNG=1 im Fuzzer)
PRUEF_KILL_NK_EINMAL=1 PRUEF_NK_EINMAL=3 python3 -B tools/trading/krypto_bot/pruef_kill.py 0 12 --nk   # Abbruch-Scan der Nachkontrolle mit einem Kind, das ein Durchgang `einmal` ist (statt der langen Fassung), danach 3 Durchgänge
python3 -B tools/trading/krypto_bot/pruef_vereinen.py 0 50000          # Eigenschaftstest für das Zusammenführen des Buchs mit drei Schreibern (Tageslauf, Not-Aus, Nachkontrolle): kein lebender Stop geht verloren
python3 -B tools/trading/krypto_bot/pruef_lot.py [--schnell]       # Lot-Scan (17. Folge-Runde): Coins mit Bruchteilen eines Lots × Short × alter Spot-Stop × alte Perp-Stops × «nicht löschbar», `_notaus_schutz` je dreimal —
                                                                      # gestoppt werden nur GANZE Lots (3'240 Lagen; PRUEF_STRENG=1 gegen die strenge Prüf-Börse)
python3 -B tools/trading/krypto_bot/pruef_zombie.py tag|notaus|nk|aufwachen 0 12 [AUSGABE.json]   # Zombie-Scan (17./18. Prüfung): ein eingefrorener Lauf (Ruhezustand) wacht nach der Übernahme seiner Sperre durch die Nachkontrolle auf —
                                                                      # Aufträge UND Buch sind vetoed (`sperre.pruefen()`); `aufwachen` = er wacht MITTEN in der Nachkontrolle auf (W1′). Gemessen wird, was danach ohne Stop bleibt
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
