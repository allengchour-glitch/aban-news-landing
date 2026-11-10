# Mehrere Krypto-Trades: vorhandener Ablauf und gemessener Probelauf

Auftrag: «verschidene trades mached». Der bestehende Bot unterstützt bereits mehrere Märkte. Es wurde keine weitere Handelsstrategie oder zweite Ausführungsschicht eingebaut.

| Vorhandener Weg | Märkte und Einordnung |
| --- | --- |
| Pilot | BTC und ETH nach der festgelegten Trend-Regel, Long/Short/Flat abhängig vom Signal. |
| Satellit | Zusätzliche Altcoins ausschließlich im Testnetz. Bestehender Standard: 20 % Kontoanteil, zehn Plätze, höchstens 2 % Konto-Nennwert je Platz bei Hebel 1. BTC und ETH bleiben dem Piloten vorbehalten. |
| Scalping-Labor | Mehrere Varianten auf Papier. Keine Testnetz- oder Echtgeld-Aufträge. |

Die festgelegten Regeln bleiben maßgeblich: [KRYPTO-AUTONOMIE.md](KRYPTO-AUTONOMIE.md). Ein fehlendes Signal wird nicht durch einen erzwungenen Trade ersetzt. Ob der vorhandene Satellit auf dem tatsächlichen PC läuft, wurde hier nicht beobachtet.

## Tatsächlich ausgeführter Probelauf

GEMESSEN mit unverändertem `satellit.py`, `satellit_kern.py` und `broker_futures.py` auf einer lokalen Börsenattrappe. Die Attrappe stammt unverändert aus `test_satellit_lauf.py`; Kursdaten ausschließlich aus `satellit_testdaten.synthetisch(7)`. Kein Signal wurde durch eine feste Kaufliste ersetzt. Die Seed-/Tag-Suche dient demselben Mehrcoin-Funktionsfall wie im vorhandenen Test, keiner Renditeauswahl.

SETZUNG: erfundenes Konto mit 5 000 USDT; vorhandener Standard ergibt höchstens 100 USDT Nennwert je Platz. Die fiktiven Tage sind keine echten historischen Marktbeobachtungen, auch wenn Kalenderdaten verwendet werden.

| Simulierter Schritt | Ergebnis |
| --- | --- |
| Vorschau | Kaufvorhaben angezeigt; kein Auftrag und kein Buch geschrieben. |
| Erster Regeltermin | Fünf parallele Käufe: AVAX, DOT, SOL, TRX, XRP; je Position genau ein simulierter Stop-Auftrag. |
| Folgetag | Bestehende Positionen gehalten; keine erzwungenen weiteren Käufe oder Verkäufe. |
| Nächster Regeltermin | DOT und TRX verkauft. |
| Weiterer Regeltermin | AVAX verkauft, SOL verkleinert, LINK neu gekauft. |
| Pause | Kein Auftrag. |
| Not-Aus im Demonstrationskonto | Restliche Positionen ausschließlich verkleinert/geschlossen; danach keine offene Position. |

Insgesamt sechs simulierte Käufe und sieben simulierte Verkäufe/Verkleinerungen über sieben Phasen. Alle 17 Gegenprüfungen bestanden. Vor neuen Käufen liefen die bestehenden Satelliten-Selbsttests erfolgreich. BTC und ETH wurden nicht angefasst.

Der Container hatte kein Netzwerk, das Repository war nur lesbar eingebunden. Alle Zustandsdateien lagen in einem Wegwerf-Ordner; Nachrichten wurden abgefangen. **Tatsächliche Börsenaufträge: 0.** Kein Gewinn berechnet, keine echten Kurse oder Kontowerte verwendet, keine echten Stop-Füllungen geprüft. [Vollständiger Nachweis mit Quellhashes](KRYPTO-MEHRERE-TRADES-NACHWEIS.json).

## Für Claude Code auf dem vorhandenen PC

1. Aktuellen Branch `codex/mehrere-trades`, die Übergabe und `docs/KRYPTO-AUTONOMIE.md` lesen. Der vorherige Live-Anzeige-Stand ist enthalten. Die aktuelle Installation und ihre tatsächliche Version zuerst lesen, statt eine erfolgreiche Verteilung anzunehmen.
2. Die offene Nutzerfrage nach Testnetz/Spielgeld oder Echtgeld klären. Bisherige Testnetz-Freigabe des Satelliten ist in der Autonomie-Datei dokumentiert; daraus keine Echtgeld-Freigabe oder neue Scalping-Strategie ableiten. Keine Schlüssel in Chat oder Repository kopieren.
3. Nur den bestehenden Status und Probelauf ansehen:

```bat
py tools\trading\krypto_bot\satellit.py --status
py tools\trading\krypto_bot\satellit.py --lauf --trocken
```

4. Tatsächliche Ziel-Coins, Kontomodus, nächste Entscheidung und den Unterschied zwischen bereits offener Position und neuem Auftrag rückmelden. Kein erzwungener Kauf eines Coins aus diesem künstlichen Beispiel. Der normale Lauf entscheidet selbst nach seinen Regeln.

Hier besteht kein Zugriff auf das PC-Konto; der Cloud-GitHub-API-Zugang ist weiterhin blockiert. Ein gepushter Nachweis ersetzt weder den tatsächlichen Kontozugriff noch einen ausgeführten Testnetz-Trade. Handelsstrategie, Risikowerte, Schalter und Zeitpläne wurden nicht verändert.
