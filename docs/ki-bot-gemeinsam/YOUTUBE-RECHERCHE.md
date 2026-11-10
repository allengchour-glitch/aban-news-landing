# YouTube-Ansätze: belegter Begleitcode und getrennte Videoprüfung

Auftrag: «nutze youtube wie sie die bots machen und mach es besser».

## Zugriff und tatsächlicher Umfang

Direkter Aufruf der YouTube-Suche scheiterte am Cloud-Proxy bereits beim CONNECT mit HTTP403. Kein Video und keine Untertitel wurden hier angesehen. `youtube.com` und `www.youtube.com` wurden dem vorhandenen Netzwerkentwurf hinzugefügt; eine Anwendung auf die laufende Umgebung ist damit nicht bestätigt. Keine Umgehung über fremde Video-/Transkript-Proxys.

Öffentlich erreichbare Begleitquellen wurden direkt auf GitHub gelesen. Umfang und Prüfsummen stehen in [youtube-quellen.json](youtube-quellen.json). Nicht vom README abgedeckte Videoinhalte werden nicht behauptet.

| Belegte Quelle | Gelesen | Noch offen |
| --- | --- | --- |
| [Supertrend Crypto Bot / Part Time Larry](https://github.com/hackingthemarkets/supertrend-crypto-bot), verlinktes [Video](https://www.youtube.com/watch?v=1PEyddA1y5E) | README: Python, pandas, ccxt und zugehöriger Videolink. | Video, vollständiger Strategiecode und Leistungsprüfung. Keine Supertrend-Überlegenheit belegt. |
| [TradingView–Binance-Webhook / Part Time Larry](https://github.com/hackingthemarkets/tradingview-binance-strategy-alert-webhook), verlinktes [Video](https://www.youtube.com/watch?v=gMRee2srpe8) | README mit Beschreibung und Videolink. | Video und vollständiger Auftrags-/Authentifizierungspfad. Kein fremder Webhook an unseren Broker angeschlossen. |
| [MLTradingBot / Nick Renotte](https://github.com/nicknochnack/MLTradingBot) | README, `tradingbot.py` und `finbert_utils.py` vollständig gelesen. News-Sentiment über FinBERT, tägliche Strategie, Alpaca, Bracket-Aufträge und historische Simulation werden im Code verwendet. | Kein konkreter Videolink im gelesenen README; Videozuordnung/Transkript nicht bestätigt. Kein Beispielcode ausgeführt und kein Modell geladen. |
| [Lumibot](https://github.com/Lumiwealth/lumibot) | README: gemeinsame Schnittstelle für Backtest und laufenden Handel. | Kein Framework-/Brokervergleich praktisch ausgeführt; Projektbeschreibung ist kein Leistungsnachweis. |

## Konkrete Gegenprobe am News-Beispiel

QUELLE: `finbert_utils.py` summiert die Logits der Nachrichten und wendet danach Softmax an. `tradingbot.py` nutzt unter anderem eine Schwelle über0,999. Die Nachrichtenauswahl wird dort vor der Modellbewertung auf Überschriften reduziert; Zeitstempel und Identität werden nicht an die Aggregation weitergegeben. Das beweist allein noch keine fehlerhafte Antwort des verwendeten News-API-Endpunkts, erschwert aber eine nachträgliche Prüfung.

GEMESSEN mit **künstlichen**, konstanten Beispiel-Logits `[2,1,0]`, ohne FinBERT-Ausführung: Eine Nachricht ergibt Softmax-Maximum0,66524; sieben identische Kopien ergeben0,999088; zehn Kopien0,999955. Die höhere Zahl entsteht ohne zusätzliche unabhängige Information. Kein gemessener FinBERT-Befund und keine gemessene Handelsrendite. Eine Stimmungs-Klassifikationskonfidenz ist ohnehin keine Wahrscheinlichkeit eines Kursgewinns.

## Daraus umgesetzt

`nachrichten.py` prüft ein offenes, brokerunabhängiges Offline-Datenformat:

- Nur das angeforderte Symbol; erforderliche Nachrichten-ID, Überschrift, Quelle und Modellkennung.
- Explizite Zeitzonen für Veröffentlichung, Empfang, Modelltrainings-Datenende und Klassifikationszeit. Nur vor der Entscheidungszeit bekannte/bewertete Einträge werden verwendet. Widersprüchliche Zeitfolgen werden verworfen. Das prüft deklarierte Angaben, beweist keine tatsächliche Modellprovenienz.
- Altersfenster statt unbegrenzt wiederholter Nachrichten; gleiche normalisierte Überschriften auch über Quellen hinweg nur einmal zählen. Früheste verfügbare Bewertung wählen, unabhängig von der Reihenfolge der Eingabe. Semantische Duplikate werden noch nicht vollständig erkannt.
- Klassenwahrscheinlichkeiten auf Form, Wertebereich und Summe prüfen. Keine unbemerkte Mischung verschiedener Modellversionen.
- Gleichgewichtiges Mittel der Einzelwahrscheinlichkeiten statt Summieren von Logits. Dieses Mittel ist ein Forschungsmerkmal und ausdrücklich keine kalibrierte Kurs-/Gewinnprognose. Keine automatische Handelsentscheidung daraus ableiten.
- Ohne verwendbare Nachrichten `null` statt einer erfundenen neutralen Marktprognose. Verworfene Einträge nach Grund zählen und verwendete Quellen-/Zeitbelege mitführen.

Das Labor kann die Prüfung optional aufnehmen, speichert Eingabe-/Modulhash und eine dadurch geänderte Versuch-ID. Die Nachrichten werden **nicht rückwirkend in die historischen Kurssignale eingemischt**. Die numerischen Strategieergebnisse bleiben unverändert; eine kombinierte News-Strategie wurde nicht entwickelt oder als profitabel behauptet. Kein Torch-/Modell-Download, keine Alpaca-Zugangsdaten und kein Webhook-Dienst.

## Reproduzierbare Demonstration

`nachrichten-testdaten.json` enthält ausschliesslich erfundene Artikel und erfundene Modellwerte. `nachrichten-beispiel-ergebnis.json` dokumentiert: ein verwendbarer Artikel, ein Duplikat, ein zu spät verfügbarer und ein zu alter Artikel. Kein echter Nachrichtenabruf.

```bash
python3 -B -m unittest discover -s docs/ki-bot-gemeinsam -p 'test_labor.py' -v
python3 docs/ki-bot-gemeinsam/labor.py --stichtag 2026-10-29 \
  --nachrichten docs/ki-bot-gemeinsam/nachrichten-testdaten.json \
  --entscheidungszeit 2026-10-29T13:00:00Z \
  --ausgabe /tmp/ki-news-demo-neuer-lauf.json
```

Die Zieldatei muss neu sein. Vorhandene `ergebnis-v2.json` bleibt der frühere reine Kurs-Messstand mit damaligem Codehash; zum Prüfen des aktuellen Codes einen neuen Bericht erzeugen.

## Prüfung und nächste Schritte

GEMESSEN:33 Offline-Tests bestanden, darunter13 neue News-/Integrationsfälle. Tests laufen über den bereits vorhandenen CI-Aufruf für `test_labor.py`; kein zusätzlicher Dienst oder Handelszeitplan. Getrennte Tests prüfen verspäteten Empfang, verspätete Modellbewertung/-daten, Zeitzonen, Duplikate, Mischmodelle, ungültige Klassenwerte, Altersgrenze und unveränderte Kursresultate im kompletten CLI-Datenfluss.

Claude Code soll zuerst die Video-/Untertitelprüfung nachholen und dann denselben Begleitcode unabhängig beurteilen. Aussagen zu angeblicher Profitabilität nur mit konkret verifizierbaren Daten aufnehmen. Für echte News-Merkmale fehlen weiterhin zeitgestempelte historische Nachrichten, tatsächlich belegte Modellstände, Kalibrierung und ein unberührter Vorwärtstest. Papier-/Live- und Futures-Abweichungen nicht aus dem Tutorial ableiten. Handelsregeln, Risikolimits und Echtgeld-Schalter des bestehenden Bots bleiben unverändert.

Zusätzliche GEMESSENE Gegenproben: unveränderter Testbaum ohne Repository-Kurse grün; drei separat eingebaute Fehler (Zukunftsfilter entfernt, quellenübergreifende Duplikate zugelassen, Modellversionen gemischt) jeweils erkannt. End-to-End-Demo mit den gespeicherten erfundenen Artikeln ebenfalls erfolgreich, keine Handelsfreigabe. Die vorgeschriebene vollständige CI-Simulation scheiterte erneut vor Testbeginn an schreibgeschütztem `/home/agent` (`mktemp`); kein bestandener Gesamtlauf und kein Remote-CI-/Live-Nachweis.
