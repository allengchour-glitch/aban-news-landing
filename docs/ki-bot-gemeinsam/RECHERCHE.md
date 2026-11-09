# Recherche vor weiterer Entwicklung

**Aktualisierung:** Der spätere Nutzerauftrag «baue alles rein» erlaubt die Umsetzung der belegten technischen Erkenntnisse. Der folgende Text dokumentiert die vorherige Recherchephase; aktueller Implementierungsstand und Grenzen stehen in [README.md](README.md) und [INTEGRATION.md](INTEGRATION.md). Noch ungelesene Originaltexte bleiben ungelesen.

## Verbindlicher Stand

Neuester Nutzerauftrag: «informiere dich überall zuerst bevor du baust». Weitere Implementierung, Parametertests und Handelsintegration sind pausiert. Der vorhandene Konsens-Prototyp bleibt ein Forschungsentwurf. Er ist weder eine wissenschaftlich ausgewählte Strategie noch ein von Claude bestätigter Bot. Der ältere Auftrag zur Veröffentlichung ist kein Auftrag, diesen neuen Forschungsentwurf live zu handeln.

Diese erste Quellenrunde deckt offizielle Projekt-/Börsendokumentation und vorhandene Repository-Ergebnisse ab. Eine vollständige Literaturrecherche ist noch nicht abgeschlossen. Es gibt hier keine allgemeine Websuche; Quellen wurden direkt bei den offiziellen GitHub-Repositories gelesen. Mehrere wissenschaftliche Originalquellen sind durch die Cloud-Netzwerkregeln blockiert. Keine neue Handelssoftware wurde installiert oder gebaut.

## Tatsächlich gelesene externe Quellen

URLs, SHA256 der heruntergeladenen Fassungen und gelesener Umfang stehen in [quellen.json](quellen.json). Projekt-READMEs sind Selbstdarstellungen der Anbieter; Leistungsbehauptungen daraus sind keine unabhängig bestätigten Ergebnisse. Die beweglichen Branch-URLs sind keine unveränderlichen Publikationsfassungen; der Hash bezeichnet die lokal gelesenen Bytes.

| Quelle | Gelesener Befund | Bedeutung für unseren Auftrag |
| --- | --- | --- |
| [Freqtrade: Lookahead analysis](https://github.com/freqtrade/freqtrade/blob/develop/docs/lookahead-analysis.md) | Vollständig vorliegende Kursreihen können Zukunftswissen in Features und Signalen verstecken. Die Prüfung vergleicht veränderte/schnittweise Berechnungen. Nicht ausgelöste Signale sind dadurch nicht geprüft. | Unser bisheriger Präfixtest ist sinnvoll, aber keine vollständige Bestätigung aller Entscheidungspfade. Alle Signaltypen gezielt auslösen und unabhängig überprüfen. |
| [Freqtrade: Recursive analysis](https://github.com/freqtrade/freqtrade/blob/develop/docs/recursive-analysis.md) | Rekursive Indikatoren können bei kürzerer Live-Vorgeschichte andere Werte ergeben als im langen Rückblick. | Historienlänge und Aufwärmphase müssen zum späteren Datenabruf passen. Kausalität allein sichert die Übereinstimmung nicht. |
| [Freqtrade: Backtesting](https://github.com/freqtrade/freqtrade/blob/develop/docs/backtesting.md) | Das dokumentierte Modell verwendet Annahmen zu Kerzenreihenfolge und Ausführungen, darunter keine Slippage bei zulässigen Preisen. Historisch dynamische Marktlisten sind problematisch. Die Dokumentation warnt zudem vor abhängigen Trades und vielen getesteten Strategien bei der Deutung von p-Werten. | Kein fremdes Backtestergebnis ungeprüft übernehmen. Gebühren, Spread, Schlupf, Delistings, Marktuniversum und versuchte Varianten müssen nachvollziehbar sein. Backtest ersetzt keinen beobachteten Probelauf. |
| [FreqAI: Running FreqAI](https://github.com/freqtrade/freqtrade/blob/develop/docs/freqai-running.md) | Zeitlich gleitende Trainings-/Testfenster und gespeicherte Live-Vorhersagen werden unterstützt. Features werden teilweise über einen ganzen Zeitraum vorbereitet und müssen selbst frei von Zukunftswissen sein. | Ein KI-System braucht zeitlich korrekte Features, getrennte Datenfenster und nachvollziehbar gespeicherte Vorhersagen. Das Framework allein verhindert kein Datenleck. |
| [Microsoft Qlib](https://github.com/microsoft/qlib) | Die Projektbeschreibung umfasst Datenverarbeitung, Modelltraining, Backtesting und Ausführung; mehrere Modellfamilien statt nur Sprachmodelle. | Vor einem eigenen Komplettbau vorhandene Forschungsinfrastruktur anhand derselben Aufgabe vergleichen. Die Beschreibung ist noch kein Nachweis der Eignung für unseren Kryptobroker. |
| [Microsoft R&D-Agent](https://github.com/microsoft/RD-Agent) | Der Quant-Bereich beschreibt automatisierte Faktor-/Modellforschung und verlinkt ein Paper. Die Rendite-/Kostenangaben sind Behauptungen des Projekts. | Agenten können Hypothesen und Prüfungen organisieren. Die verlinkte wissenschaftliche Originalarbeit muss vor einer Leistungsbewertung gelesen werden; mehr Agenten beweisen keinen Handelsvorteil. |
| [FinRL](https://github.com/AI4Finance-Foundation/FinRL) | Das aktuelle README ordnet das klassische Projekt als Bildungs-/Forschungsrahmen ein und verweist für die neuere Architektur auf FinRL-Trading/FinRL-X. | Keine Architekturentscheidung allein auf ältere FinRL-Tutorials stützen. Auch den tatsächlich gepflegten Nachfolger prüfen. |
| [FinRL-Trading / FinRL-X](https://github.com/AI4Finance-Foundation/FinRL-Trading) | Die Projektbeschreibung trennt Daten, Strategie, Backtest und Ausführung; Zielgewichte sind die gemeinsame Schnittstelle. Beschrieben sind auch Portfolio-Risiko und Brokerprüfungen. | Eine solche Schnittstelle könnte Abweichungen zwischen Forschung und Ausführung verringern. Die behauptete Produktionsreife und Modellleistung wurden hier nicht durch Code-/Laufprüfung bestätigt. |
| [Binance Spot REST API](https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md) | Timeout und HTTP5xx können einen unbekannten Ausführungsstatus bedeuten. Rate-Limits verlangen Rückzug; wiederholte Verstösse können Sperren auslösen. | Unklare Orderantworten vor erneutem Senden abgleichen; keine blinden Wiederholungen. Spot-Regeln nicht ungeprüft auf Futures übertragen. |
| [Binance Spot filters](https://github.com/binance/binance-spot-api-docs/blob/master/filters.md) | Preisraster, Mengenraster und Mindest-/Maximalwerte sind getrennte Symbolregeln. | Eine gültige Modellquote ist noch kein zulässiger Auftrag. Symbolregeln und Rundung sind Teil der Ausführungsprüfung. Keine Futures-Anforderung aus dieser Spot-Quelle ableiten. |

## Bisherige eigene Vorarbeiten ernst nehmen

QUELLE: `reports/TRADING-BOT.md`, `reports/DAYTRADING.md`, `tools/trading/ki_bot/README.md`, `tools/trading/krypto_bot/README.md` sowie die Prüfwerkzeuge in `tools/trading/krypto_bot/`. Die folgenden Befunde wurden aus diesen Unterlagen gelesen und hier nicht neu unabhängig reproduziert:

- Mehr Strategieauswahl erhöhte teils Lernleistung, ohne die ungesehene Leistung zu verbessern. Stärkeres Lernen im KI-Komitee brachte laut bestehender Dokumentation keinen Vorteil.
- Die vorhandenen Daytrading-Ergebnisse verschlechterten sich nach Kosten deutlich; Gewinne einzelner Markt-/Startpunktkombinationen sind keine robuste Gesamtbestätigung.
- Das bestehende Krypto-Projekt hat bereits Funding-, Hebel-, Ausführungs-, Walk-Forward- und Block-Bootstrap-Prüfungen. Ein zweiter Eigenbau darf deren Erkenntnisse nicht verlieren.
- Bestehende Unterlagen dokumentieren frühere Korrekturen an Funding-Annahmen und am Halten-Vergleich. Alte Renditetabellen sind deshalb nur mit Modellversion und Annahmen brauchbar.
- `reports/KI-BOT.md` wird von Code/Anleitungen genannt, lag im geprüften Checkout aber nicht vor. Seine Ergebnisse gelten hier nicht als gelesen. Stattdessen standen die README-Angaben zur Verfügung.

## Noch ungelesene Originalquellen und offene Recherche

| Quelle | Warum erforderlich | Tatsächlicher Status |
| --- | --- | --- |
| [Bailey u.a.: The Probability of Backtest Overfitting](https://www.davidhbailey.com/dhbpapers/backtest-prob.pdf) | Überanpassung durch Auswahl vieler Versuche und Grenzen einfacher Holdouts untersuchen. | Direkter Abruf HTTP403; Originaltext nicht gelesen. |
| [Bailey/López de Prado: The Deflated Sharpe Ratio](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2460551) | Auswahlverzerrung und nichtnormale Renditen bei Kennzahlen beurteilen. | Als Literaturkandidat erfasst; Originaltext nicht abgerufen/gelesen. |
| [R&D-Agent-Quant](https://arxiv.org/abs/2505.15155) | Die Behauptungen zu agentischer Quant-Forschung anhand der Versuchsbedingungen prüfen. | arXiv-Abruf HTTP403; nur offizielle Projektbeschreibung gelesen. |
| [Qlib](https://arxiv.org/abs/2009.11189) und [FinRL-X](https://arxiv.org/abs/2603.21330) | Wissenschaftliche Methodik und Benchmarks von Projektbeschreibungen trennen. | Verlinkte Originalarbeiten noch nicht gelesen. |
| [Binance Developers](https://developers.binance.com/) und [Alpaca Docs](https://docs.alpaca.markets/) | Aktuelle Futures- statt nur Spot-Regeln, Brokerauftragszustände, Papier-/Live-Abweichungen, Streams und Reconnects prüfen. | Offene Recherche; keine Vollständigkeit aus der gelesenen Spot-Dokumentation ableiten. |

Die benötigten Domains wurden dem vorhandenen Cloud-Konfigurationsentwurf hinzugefügt; vorhandene Freigaben blieben erhalten. Ein gespeicherter Entwurf ändert den Laufzeitzugriff nicht. Falls Claude Code eine andere Umgebung hat, dort den tatsächlichen Zugriff prüfen und die Originaltexte lesen.

Zusätzlich offen: unabhängige Reproduktionen, alternative Erklärungen für KI-Leistung, verfügbare Point-in-Time-Kryptodaten inklusive Delistings, datierte Nachrichtenmerkmale, Datenlizenzen, reale Gebührenstufen, Orderbuchtiefe, Marktimpact sowie Betriebs-/Rechenkosten. Ein Aktienbenchmark überträgt sich nicht automatisch auf Bitcoin/Futures. Noch kein Framework installiert, kein externer Benchmark reproduziert und keine Modellentscheidung getroffen.

## Konsequenz für den bisherigen Prototyp

EINORDNUNG aus der Recherche: Das aktuelle Schlusskurs-Labor ist als kleine Rechengegenprobe brauchbar, aber für die Wahl des besten KI-Bots unzureichend. Es vergleicht nur eine Spot-/Long-Cash-Idee auf bekannten Bitcoin-Daten und hat weder einen unabhängigen Holdout noch echte KI-Features, Orderbuch-/Intraday-Ausführung oder ein vollständiges Futures-Modell. Kleinere Einbrüche könnten durch geringere durchschnittliche Marktexposition erklärt werden. Dieser Zusammenhang wurde noch nicht gegen passend risikoskaliertes Halten und gleich skalierte einfache Trendregeln untersucht. Neue Modellkomplexität wäre ohne diesen Vergleich nicht begründet.

Die zwei überlappenden historischen Teilperioden sind keine unabhängigen Bestätigungen. Ein Mindestzeitraum von180 Tagen im Entwurf ist eine SETZUNG, kein statistischer Eignungsnachweis. Keine Auswahl nach dem höchsten Rückblickgewinn und keine Schlussfolgerung «mehr KI ist besser».

## Erst nach Abschluss der Recherche entscheiden

1. Claude liest die offenen Originaltexte unabhängig und ergänzt pro Quelle belegte Aussagen, Gegenargumente und Grenzen. Keine erfundene Zustimmung zwischen Agenten.
2. Daten-, Ausführungs- und Bewertungsanforderungen festlegen. Alle bisherigen Versuche erfassen; tatsächlich neue Testdaten und Kriterien vor der nächsten Auswahl bestimmen.
3. Bestehendes System, Freqtrade/FreqAI und Qlib/FinRL-X anhand derselben Anforderungen vergleichen: Eignung für BTC/ETH-Spot/Futures, Daten-/Brokerintegration, Reproduzierbarkeit, Lizenz, Betriebskosten und Wartbarkeit. Noch keine dieser Optionen ist ausgewählt.
4. Dann höchstens eine begründete Änderung bauen. Zuerst einfache und hinsichtlich Risiko/Exposure faire Vergleiche; Modell nur behalten, wenn sein Zusatznutzen unter denselben Bedingungen nachgewiesen ist.

Bis diese Punkte geklärt sind: Recherche und Dokumentation fortsetzen, keinen weiteren Strategiecode bauen und den Entwurf nicht handeln lassen.
