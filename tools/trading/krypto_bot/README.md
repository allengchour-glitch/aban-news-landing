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
(`KRYPTO_PILOT_MAERKTE=BTC` = nur Bitcoin):
- **Richtung:** über dem Trend-Schnitt long, darunter short (`KRYPTO_SHORT=0` = nur long).
  **Bitcoin 150 Tage, Ethereum 200 Tage** (siehe Prüfstand unten).
- **Grösse:** Schwankungsziel 40 % pro Jahr, also bei wildem Markt automatisch kleiner. Höchstens `KRYPTO_MAX_HEBEL`
  (Standard 1×, hart gedeckelt auf 2×).
- **Stop an der Börse:** 4 Tages-Schwankungen unter bzw. über dem Kurs, auf den Markpreis, nach jedem Lauf neu gesetzt.
- **Lügendetektor:** misst täglich, ob die Regel in den letzten 2 Jahren besser war als Zufall, und meldet es aufs Handy.
  Er handelt bewusst **nicht**: Als Abschalter getestet, kostete er ab 2022 über 20 Prozentpunkte Rendite pro Jahr.
- **MVRV-Bremse:** kein Short, solange der Kurs unter dem Einstandswert aller Coins liegt (MVRV < 1, CoinMetrics). Die
  einzige von 13 freien Markt-Infos, die den Test bestand (siehe «Alle Infos» unten).
- **Lagebild:** Angst & Gier, Funding, MVRV, VIX und US-Zins stehen bei jedem Lauf dabei — nur zur Information.
- **Wochenbericht:** einmal pro Woche kommt der Kontostand aufs Handy (seit Start, seit Vorwoche, Abstand zum Höchststand).
  Jederzeit: `pilot.py --bericht`.

`pilot.py --backtest` (Futures-Modell mit Gebühren, Funding, Stop mit 0,1 % Schlupf, Liquidation; BTC und ETH jeden Tag
neu 50/50 aus dem Gesamtkonto aufgeteilt — wie live; Stand 09.10.2026):

| ab | Variante | pro Jahr | schlimmster Einbruch | Rendite ÷ Einbruch |
|---|---|---|---|---|
| 2019 | **+ MVRV-Bremse (live)** | **+38,4 %** | **−33 %** | **1,15** |
| 2019 | BTC 150 + ETH 200 | +30,3 % | −40 % | 0,76 |
| 2019 | nur BTC 150 | +29,2 % | −48 % | 0,61 |
| 2019 | nur BTC 200 (bisher) | +14,3 % | −70 % | 0,20 |
| 2019 | BTC long 1× halten | +34,7 % | −82 % | 0,43 |
| 2022 | **+ MVRV-Bremse (live)** | **+30,4 %** | **−27 %** | **1,13** |
| 2022 | BTC 150 + ETH 200 | +25,1 % | −27 % | 0,93 |
| 2022 | nur BTC 150 | +27,4 % | −36 % | 0,75 |
| 2022 | nur BTC 200 (bisher) | +30,1 % | −44 % | 0,69 |
| 2022 | BTC long 1× halten | +0,7 % | −73 % | 0,01 |

Bis 08.10.2026 rechneten alle Backtests BTC und ETH als zwei getrennte Töpfe, die nie ausgeglichen werden (ab 2019:
+36,3 %, −35 %). Live bemisst der Pilot aber jede Position aus dem ganzen Konto — das ist eine tägliche Neuaufteilung.
Seither rechnen Backtest, Prüfstände und Cockpit-Kurve so (Näherung über die Tagesrenditen); die Urteile blieben gleich.

**Prüfstand** (`pilot_pruefung.py`, Regel vorab festgelegt: ein Standardwert ändert sich nur, wenn die Alternative in
**allen** Zeiträumen ein besseres Verhältnis Rendite ÷ Einbruch hat):
- **Trendlänge Bitcoin 150 statt 200:** auf drei getrennten Abschnitten jedes Mal besser (2015–18: 2,85 vs. 2,59;
  2018–22: 0,78 vs. −0,05; 2022–heute: 0,77 vs. 0,69). Bei **Ethereum** war 200 in beiden Abschnitten besser → bleibt 200.
- **Ethereum dazu:** in beiden Zeiträumen kleinerer Einbruch (ab 2019 −52 statt −66 %, ab 2022 −27 statt −42 %).
- **Stop 4σ bleibt:** 3σ war ab 2015/2018 besser, ab 2022 nicht → nach der Regel keine Änderung.
- **Schwankungsziel 40 % bleibt:** keine Alternative war überall besser.
- Ehrlich: Die Trendlänge wurde aus 5 Kandidaten gewählt. Diese Auswahl schönt die Zahlen etwas, getrennte Abschnitte
  mildern das nur. In der Hausse 2019–2021 verdiente einfaches Halten mehr, der Pilot gewinnt vor allem in Baissen.

**Alle Infos** (`info_pruefung.py`, Regel vorab festgelegt): 13 freie Markt-Infos als Filter auf die Pilot-Position.
Übernommen wird eine Info nur, wenn sie in **allen vier Feldern** (Bitcoin und Ethereum × 2018–2021 und 2022–heute) ein
besseres Rendite ÷ Einbruch bringt **und** mindestens 90 % von 200 zeitversetzten Kopien derselben Info schlägt
(sonst ist der «Vorteil» nur weniger Risiko, das jede beliebige Bremse auch gebracht hätte). Stand 09.10.2026:

| Info (Quelle) | Regel | Felder besser | Zufallsprobe | Urteil |
|---|---|---|---|---|
| **MVRV tief** (CoinMetrics) | MVRV < 1 → kein Short | **4 von 4** | **93 %** | **übernommen** |
| Funding negativ (BitMEX/OKX) | Funding 7 T. < 0 → kein Short | 2 von 4 | 99 % | nein, ab 2022 schlechter |
| Dollar (FRED, wöchentlich → 7 Tage Verzug) | Dollar über 200-T.-Schnitt → Long halb | 3 von 4 | 98 % | nein |
| Alle zusammen (Abstimmung) | ≥ 3 Long- bzw. ≥ 2 Short-Bremsen | 2 von 4 | 94 % | nein, ab 2022 schlechter |
| Angst & Gier (alternative.me) | ≤ 20 → kein Short | 3 von 4 | 80 % | nein |
| Angst & Gier | ≥ 80 → Long halb | 1 von 4 | 22 % | nein |
| VIX (FRED) | > 30 → Long halb | 2 von 4 | 90 % | nein |
| Hashrate (CoinMetrics) | 30 T. unter 60 T. → kein Short | 2 von 2 (nur BTC) | 80 % | nein |
| Funding hoch, MVRV hoch, US-Zins, Notenbank-Bilanz, Stablecoins | Long halb | 0–2 von 4 | 10–91 % | nein |

- Die MVRV-Bremse ist nicht an die Schwelle 1 gebunden: von 0,8 bis 1,2 war sie jedes Mal in allen 4 Feldern besser.
  Sie wirkt nur auf Shorts: Unter dem Einstandswert aller Coins ist der Ausverkauf meist schon weit fortgeschritten.
- **Ehrlich:** 13 Kandidaten getestet. Bei einer 90-%-Schwelle besteht rein zufällig etwa einer die Zufallsprobe —
  93 % liegt knapp darüber. Darum zusätzlich die Bedingung «alle vier Felder besser». Ein Beweis ist das nicht.
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
- Zeitüberschreitung oder abgerissene Verbindung: kein Absturz, der Stop wird passend zur tatsächlichen Position gesetzt.
- Liegt der Kurs schon jenseits des heutigen Stops, eröffnet der Pilot nichts (der Stop würde sofort auslösen).
- Nie zwei Läufe gleichzeitig (Sperre in `data/`), auch nicht Aufgabenplanung + Cockpit-Knopf.
- Eine einzelne Adress-Variable (`BINANCE_FUTURES_URL`, `BINANCE_BASIS_URL`) kann nie auf echtes Geld umschalten.
- ETH-Sammler: jeder Kauf wird sofort gebucht; geht eine Antwort verloren (oder antwortet Binance mit einem Serverfehler),
  wird «unklar» gebucht statt doppelt zu kaufen oder ETH zu staken, die der Bot nicht gekauft hat. Eine klare Ablehnung
  (z. B. zu wenig Guthaben) heisst «nicht gekauft»: Warnung aufs Handy, der nächste Lauf kauft normal weiter.
- Logbücher werden atomar geschrieben (erst Zwischendatei, dann umbenennen); eine beschädigte Datei wird beiseitegelegt
  (`….kaputt-Datum`) statt still überschrieben.

## 🪙 ETH-Sammler (Sparplan + Staking)

`eth_sammler.py` kauft regelmässig Ethereum für einen festen Betrag und legt ihn auf Binance ins **ETH-Staking**.
Er verkauft nie, nutzt keinen Hebel, gibt nie mehr aus als das freie USDT-Guthaben und stakt nur ETH, die er selbst
gekauft hat (andere ETH im Konto fasst er nicht an).

| Einstellung | Standard | Bedeutung |
|---|---|---|
| `ETH_SPARPLAN_BETRAG` | 50 | USDT je Kauf (höchstens `KI_BOT_MAX_AUFTRAG`) |
| `ETH_SPARPLAN_TAGE` | 7 | Abstand der Käufe in Tagen |
| `ETH_SPARPLAN_MAX` | 5000 | Obergrenze für den gesamten Einsatz, danach kauft er nicht mehr |
| `ETH_STAKEN` | 0 | 1 = gekaufte ETH ins Binance-Staking legen (nur echtes Geld) |

Schlüssel: dieselben **Spot**-Schlüssel wie `krypto.py` (`BINANCE_API_KEY` / `BINANCE_API_SECRET`). Testnetz ist Standard,
dort gibt es **kein Staking**, die ETH bleiben im Spot-Konto. Test- und Echtgeld-Käufe werden getrennt gebucht
(`data/eth-sammler.json`). Täglich starten ist richtig: Er kauft nur, wenn der nächste Termin fällig ist.

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
`/stop` (Not-Aus mit Schliessen), `/weiter`, `/profit`, `/hilfe`. Was ankam, während das Cockpit aus war, wird **nicht**
ausgeführt (sonst könnte ein altes `/weiter` einen Not-Aus aufheben); der Bot antwortet dann «bitte nochmals senden».
Das hängt nicht an der PC-Uhr.

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

Der Pilot (BTC 150 + ETH 200, MVRV-Bremse, Stop 4σ) im Futures-Modell mit Gebühren, Funding und Liquidation, BTC/ETH täglich
neu aufgeteilt wie live, Stand 09.10.2026. «Alles × L» heisst: Schwankungsziel und Deckel L-mal so gross (jede Position
L-mal so gross):

| Hebel | ab 2019 pro Jahr | schlimmster Einbruch | ab 2022 pro Jahr | Einbruch ab 2022 |
|---|---|---|---|---|
| **1× (Standard)** | **+38,4 %** | **−33 %** | **+30,4 %** | **−27 %** |
| 1,5× | +55,0 % | −49 % | +42,3 % | −40 % |
| 2× | +65,9 % | −65 % | +50,4 % | −50 % |
| 3× | +81,4 % | −83 % | +54,2 % | −77 % |
| 5× | +55,8 % | −97 % | +20,3 % | −97 % |
| 10× | −92,3 % | **−100 %** | −94,0 % | −100 % |

- Mehr Hebel bringt bis 3× mehr Rendite, aber die Einbrüche wachsen schneller als der Gewinn: Rendite ÷ Einbruch ist bei
  1× am besten (1,15), bei 3× fällt das Konto zwischendurch um 83 %. Ab 5× bleiben vom Höchststand zeitweise nur 3 %
  übrig, ab 10× ist das Konto weg — schon eine einzige schlechte Woche reicht.
- Nur den Deckel höher stellen (Schwankungsziel bleibt) ändert fast nichts: Das Schwankungsziel hält den Hebel ohnehin klein.
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
- Wer bewusst mehr Risiko will: im Cockpit **Risiko-Stufe 1,5× oder 2×** wählen (oder `setx KRYPTO_RISIKO "1.5"`), mit
  Rückfrage und den Zahlen oben. Der Pilot nutzt dabei weiterhin höchstens `KI_BOT_ANTEIL` (Standard 50 %) des Kontos —
  die Prozente oben gelten für diesen Teil.

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
python3 tools/trading/krypto_bot/test_pilot.py    # 76 Tests, inkl. Risiko-Stufen, Sperre, Not-Aus mitten im Lauf, Algo-Stops und nachgebautem Binance-Futures-Server
python3 tools/trading/krypto_bot/test_sammler.py  # 44 Tests, inkl. nachgebautem Binance-Server mit Staking, verlorenen Antworten und Ablehnungen
python3 tools/trading/krypto_bot/test_infos.py    # 26 Tests: keine Zukunftsdaten, MVRV-Bremse, Zwischenspeicher
python3 tools/trading/krypto_bot/test_profit.py   # 40 Tests: getrennte Bücher, offen unbekannt, BNB-Gebühren, Ein-/Auszahlungen, Seitengrenze, Drosselung
python3 tools/trading/krypto_bot/test_cockpit.py  # 94 Tests: Claude, Schattenkonto, Cockpit, Knöpfe, Host/Einbetten, Ampel, Not-Aus, Telegram, Startdateien
python3 tools/trading/krypto_bot/test_binance.py  # 21 Tests, inkl. nachgebautem Binance-Server mit Signaturprüfung
python3 tools/trading/krypto_bot/pilot_pruefung.py   # Prüfstand: Stop, Trendlänge, Schwankungsziel, Ethereum
python3 tools/trading/krypto_bot/info_pruefung.py    # Prüfstand: 13 freie Markt-Infos
python3 tools/trading/krypto_bot/hebel_pruefung.py   # Prüfstand: 1× bis 10× Hebel
python3 tools/trading/krypto_bot/test_gewinner.py     # 12 Tests: tote Coins, keine Zukunftsdaten, Filter, Simulation
python3 tools/trading/krypto_bot/gewinner_pruefung.py # Prüfstand «Gewinnern folgen» (lädt zuerst alle Binance-Paare)
```
