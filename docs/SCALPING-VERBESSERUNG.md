# Scalping: Datenprüfung und Kostenanalyse

Auftrag: «scalping perfektionieren». Auf `codex/scalping-qualitaet` wurden ein nachgestellter Datenfehler korrigiert und die Ursachen der Papierergebnisse sichtbar gemacht. Anwendungscode: `c53b7a366d0933ce9cfd15fa76a251a993e924a2`.

## Was verbessert wurde

**Keine Zukunftskerzen durch falsche Zeitfelder.** Vorher prüfte der Abruf nur die behauptete Schlusszeit. Eine Kerze mit Öffnungszeit eine Stunde in der Zukunft und gefälschter Schlusszeit in der Vergangenheit wurde angenommen; es gab keinen Hinweis. Der Abruf verlangt jetzt ganzzahlige, nichtnegative Öffnungszeiten auf dem Minutenraster und die dazugehörige Schlusszeit `Öffnung + 59 999 ms`. Boolesche Preise, falsche Zeilentypen und ungültige Zeiten werden verworfen und gemeldet. Eine Objekt-Zeile verursachte bisher einen nicht abgefangenen `KeyError`. Die tatsächliche Binance-Kerzenspezifikation wurde vorher gelesen; URL und Inhaltsfingerabdruck stehen im Nachweis.

Gültige Kerzen werden unverändert weitergereicht. Die Signalmaschine, Buchung, Kostenkonstanten, Stufen und das vorab festgelegte Urteil wurden nicht angepasst. Die Quellen der Funktionen `kosten_von`, `_stat`, `kerze`, `buche`, `kennzahlen`, `lauf` und `urteil` sind zum Ausgangsstand unverändert; die vorhandenen Vergleiche zur Rechenreferenz bestehen weiter. Historische Bücher wurden nicht umgeschrieben. Vollständige alte Rohkerzen sind im Buch nicht enthalten; eine nachträgliche vollständige Prüfung ihrer Herkunft wird nicht behauptet.

**Kosten und fehlender Vorteil werden getrennt.** Das Cockpit zeigt je Variante Bruttoertrag, modellierte Kosten, Nettoertrag, Abstand zur Mindestkante von +1 bp und die Ursache. Negative Kursbewegung vor Kosten wird von einem positiven, durch Kosten verbrauchten Vorteil unterschieden. Das beobachtete Kostenbudget bis zur schwarzen Null ist nur eine vergangene Rechengrenze, keine Prognose zukünftiger Gewinne oder Gebühren.

**Offline-Kostenprüfung ohne Seiteneffekte.** Der neue Aufruf liest das vorhandene Papierbuch und gibt einen nachvollziehbaren JSON-Bericht über alle acht Varianten aus:

```bash
python3 tools/trading/krypto_bot/scalping_labor.py --kostencheck
```

Er lädt keine Kurse, schreibt oder repariert kein Buch und sendet keine Nachricht. Auch beschädigte Bücher werden dabei nicht umbenannt. Kombinationen mit `--einmal`, `--dauer` oder `--push` werden abgewiesen. Der Bericht trägt den Fingerabdruck des gelesenen Buchinhalts und des Auswertungscodes; der Codehash ist kein Nachweis der früheren Erzeugung des Buchs. Die Gebühren sind ausdrücklich Modellannahmen. Funding, tatsächliche Warteschlangen/Teilfüllungen und Unterschiede zwischen Spot- und Futures-Kursen fehlen im Modell. Keine zusätzliche Abhängigkeit oder Automation.

## Was die gespeicherten Papierdaten zeigen

QUELLE: `data/krypto-scalping-labor.json` aus main `1c4dc25c8`, gemeldeter letzter Lauf `2026-11-10T12:42:49+00:00`. Rund 7,02 Datentage einschließlich der anfänglichen Rückrechnung. Keine Live-Kontowerte und keine eigenständige neue Kursabfrage. [Eingangsdaten-Fingerabdruck und vollständige Auswertung](SCALPING-KOSTENSTAND.json).

GEMESSEN je Trade, in Basispunkten (1 bp = 0,01 %):

| Markt · Stufe | Trades | Brutto | Modellkosten | Netto |
| --- | ---: | ---: | ---: | ---: |
| BTC · 2,0 | 755 | −2,793 | 6,611 | −9,404 |
| BTC · 2,5 | 477 | −1,797 | 6,566 | −8,364 |
| BTC · 3,0 | 306 | −0,820 | 6,588 | −7,408 |
| BTC · 3,5 | 193 | −0,318 | 6,631 | −6,949 |
| ETH · 2,0 | 819 | −3,220 | 6,906 | −10,126 |
| ETH · 2,5 | 519 | −1,338 | 6,852 | −8,190 |
| ETH · 3,0 | 344 | −0,187 | 6,811 | −6,998 |
| ETH · 3,5 | 212 | +0,933 | 6,821 | −5,889 |

Kosten werden aus ungerundeten Summen berechnet; deshalb können gerundete Spalten um 0,001 bp voneinander abweichen. Die acht Bücher sind überlappende Versuche, kein addierbares Gesamtportfolio.

Alle acht Varianten liegen nach dem Kostenmodell im Minus. Selbst ohne Gebühren und Schlupf liegt ihr beobachteter Bruttoertrag unter der unveränderten Mindestkante von +1 bp. Der ETH-Bruttovorteil bei Stufe 3,5 ist kleiner als die modellierten Kosten; daraus wird kein Gewinner ausgewählt. Das Urteil bleibt «zu wenig Daten»: weiterhin mindestens 14 Tage, 200 Trades je Markt, dieselbe Stufe auf BTC und ETH sowie positive Ergebnisse in beiden Hälften der Tage mit Trades. Dieses Urteil und seine Grenzen stehen in [KRYPTO-AUTONOMIE.md](KRYPTO-AUTONOMIE.md).

Ein künftiger Kostenfilter müsste vor einer neuen Beobachtungsphase festgelegt und gegen eine gleichzeitig neu gestartete Referenz geprüft werden. Bereits bekannte profitable Einzeltrades nachträglich herauszufiltern wäre kein belastbarer Verbesserungsnachweis. Die aktuelle Änderung behauptet keinen verbesserten Handelsvorteil.

## Gegenprüfung und Übergabe

Vor der Korrektur: neun Datenvertragsfälle fehlgeschlagen, darunter die Zukunftskerze und der `KeyError`; dazu fehlte die neue Kostenprüfung. Danach bestehen die gezielten Prüfungen. Die Importbegrenzung erlaubt zusätzlich ausschließlich `hashlib` für den Fingerabdruck; Broker-/Auftragsmodule bleiben verboten.

```bash
python3 -B tools/trading/krypto_bot/test_scalping.py
python3 -B tools/trading/krypto_bot/test_scalping_labor.py
python3 -B tools/trading/krypto_bot/test_cockpit.py
node tools/qa_krypto_live.mjs
```

GEMESSEN: 50 Prüfstand-, 264 Labor-, 510 Cockpit- und 43 Browserprüfungen bestanden. Browserdaten sind künstlich und alle Anfragen abgefangen. Desktop und die aufgeklappten Handy-Karten wurden geprüft. Die Screenshot-Vorschau außerhalb Git zeigt dagegen ausschließlich die bereits gespeicherten Papierergebnisse, ausdrücklich ohne Live-Kontoverbindung.

Alle neun allgemeinen lokalen CI-Abschnitte auf `c53b7a366` bestanden, einschließlich der bestehenden 221 Mutationsproben. Das native Hostskript scheitert weiterhin am schreibgeschützten HOME; verwendet wurde der dokumentierte frische Containerweg. Zusätzlich bestanden 35 Paketbauprüfungen. Das tatsächlich gebaute Programmpaket `2026-11-10.c53b7a3` wurde per SHA256 zurückgelesen, entpackt und bestand Syntaxprüfung sowie alle zehn vorhandenen PC-Selbsttests ohne Netzwerk. [Strukturierter Prüf- und Paketnachweis](SCALPING-PRUEFNACHWEIS.json). Rohprotokolle bleiben unter `/workspace/ci-ergebnisse/scalping-ci` und `scalping-lieferung` außerhalb Git. Diese lokalen Ergebnisse sind keine tatsächlichen GitHub-Checks oder ein Installationsnachweis.

Claude sollte insbesondere Zeitgrenzen, fehlerhafte Seitenzeilen, Kostenarithmetik, nicht gemischte historische Daten und die rein lesende CLI unabhängig gegenprüfen. Die bestehenden Kontroll- und Handelswege bleiben maßgeblich. Es wurden keine echten Aufträge gesendet und kein Scalping auf Echtgeld oder im Testnetz aktiviert. Die unabhängige Prüfung dieser Änderung durch Claude und die Installation auf dem PC sind noch nicht belegt.
