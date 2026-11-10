# Live-Anzeige für Konto und Gewinn

Auftrag: «live anzeige, profit, etc». Branch `codex/krypto-live-anzeige`, auf dem bisherigen Abschlussstand aufgebaut. Neue Anwendung in `0c3395fab`, ergänzende Testumgebungskorrektur in `1bca686cd`, letzter Hinweis und Lieferpaket in `f18a61147`. Die zuvor zusammengeführten Website-, Wochenbericht- und Forschungskorrekturen bleiben enthalten.

## Im Cockpit

- Oben stehen Verbindungsstatus, tatsächlicher Kontoabruf mit Alter und der getrennte Datenstand der Gewinnhistorie. Kontowerte werden alle 15 Sekunden abgefragt, Einkommen höchstens einmal pro Minute; mehrere Fenster teilen weiterhin den bestehenden Server-Zwischenspeicher.
- «Jetzt aktualisieren» liest erneut. Eine laufende Anfrage wird nicht verdoppelt. Nach Rückkehr in den Browser-Tab wird neu gelesen. Hängt die Verbindung, endet die Browseranfrage nach 20 Sekunden.
- Die Gewinnkarte zeigt Kontowert einschließlich offener Positionen, laut Börse frei verfügbares Guthaben und offenen Gewinn/Verlust. Fehlende oder ungültige Angaben zum verfügbaren Guthaben bleiben unbekannt.
- Heute / 7 Tage / 30 Tage / seit Start sind auswählbar. Der große Gewinnbetrag und die Aufschlüsselung in Realisiert, Veränderung offen, Funding und Gebühren folgen der Auswahl. Ein- und Auszahlungen zählen weiterhin nicht als Gewinn. Markt-Summen und historische Kurven sind ausdrücklich vom ausgewählten Zeitraum getrennt.
- Es sind **Werte des gesamten Futures-Kontos**, keine ausschließlich dem Bot zugeschriebene Leistung und keine Gewinnprognose. Testnetz und Echtgeld bleiben getrennt gekennzeichnet.
- Fehlt der offene Anfangsstand eines Zeitraums, bleibt der bestehende Sternhinweis erhalten: Es ist dann nur der abgeschlossene Teil bekannt. Nicht umgerechnete Gebühren und beschädigte Bücher bleiben ausdrücklich gemeldet.
- Ist die Gewinnhistorie nicht aktuell, bleiben die Gewinnbeträge unbekannt. Ein erreichbarer Kontostand allein bestätigt keine vollständige Gewinnhistorie. Ein Kontoabruf über 45 Sekunden alt oder ohne gültigen Zeitstempel gilt nicht mehr als aktuell. Auch ohne neue Antwort schaltet die Anzeige auf veraltet; eine Bildschirmgrößenänderung setzt die Zeit nicht zurück.
- Die vorhandene geschützte Handy-Ansicht erhält dieselbe Anzeige. Auswahl und Aktualisierung sind reine Leseaktionen; Handels-, Konto- und Freigabeschalter werden nicht verändert.

Der Zeitstempel wird direkt nach Konto-/Positionsabruf festgehalten. Ein anschließend langsamer Abruf historischer Einkünfte darf Kontowerte nicht künstlich verjüngen. Die Herkunft der Zeitstempel wird nicht als unabhängig bewiesen behauptet; bei einer deutlich abweichenden Browseruhr zeigt die Ansicht einen unbekannten Stand.

## Prüfen

```bash
python3 -B tools/trading/krypto_bot/test_profit.py
python3 -B tools/trading/krypto_bot/test_cockpit.py
node tools/qa_krypto_live.mjs
```

Der Browserlauf verwendet die echte HTML-Datei, ausschließlich erfundene Kontodaten und vollständig abgefangene Anfragen; kein Server, Konto, Modell oder Broker wird kontaktiert. Chromium liegt in dieser Cloud unter `/usr/bin/chromium`; andernorts `CHROMIUM_PATH` setzen. Playwright ist bereits eine vorhandene Entwicklungsabhängigkeit. Der Browserprüfer liegt außerhalb des PC-Programmpakets und führt dort keine zusätzliche Pflichtabhängigkeit ein.

GEMESSEN: 59 Profitprüfungen, 510 Cockpitprüfungen und 37 Browser-Prüfungen bestanden. Darunter Einkommensausfall mit erreichbarem Konto, Erholung, erhaltene tatsächliche Abrufzeit, unbekannte Verfügbarkeit, ungültige Zeitstempel, HTTP-/JSON-Fehler, konkurrierende Aktualisierung, passives Veralten und 320/390/1280px. Desktop- und Handy-Lesemodus wurden geprüft; keine schreibenden oder externen Anfragen.

Der vollständige Selbsttestlauf bestätigte außerdem alle 18 Suiten vor der abschließenden Paketprüfung, einschließlich 731 strenger Pilot-Prüfungen und 451 Prüfungen der geschützten Handy-Ansicht. Die letzte Paketprüfung brach zunächst wegen fehlender Git-HEAD-Metadaten in der isolierten Testkopie ab. Nach Ergänzung einer ausdrücklich als Testkopie gekennzeichneten lokalen Git-HEAD bestanden dieselben unveränderten 35 Prüfungen; zusätzlich bestanden sie auf dem tatsächlichen `f18a61147`-Checkout. Der rote Vorlauf bleibt dokumentiert, statt als grüner Gesamtlauf ausgegeben zu werden.

Alle neun allgemeinen CI-Abschnitte bestanden auf `0c3395fab`. Die 647 dort ausgewählten Quelldateien sind per Inhalts-/Pfad-/Modus-Fingerabdruck identisch zu `1bca686cd` und `f18a61147`; die späteren Änderungen lagen außerhalb dieses Sparse-Dateisatzes. Das ursprüngliche Hostskript scheitert weiterhin am schreibgeschützten HOME; geprüft wurde der bereits dokumentierte isolierte Containerweg. Es ist kein echter GitHub-Check.

Das abschließende Programmpaket `2026-11-10.f18a611` enthält 128 Dateien. SHA256 wurde frisch nachgerechnet; das ZIP wurde entpackt und bestand Syntaxprüfung sowie alle zehn vorhandenen PC-Selbsttests. Geschützte Schalter und Datenbücher werden durch den bestehenden Paketbau ausgeschlossen. Der letzte Hinweis zur Kurve erklärt korrekt, dass für einen Linienverlauf zwei Tagesstände nötig sind; ein einzelner vorhandener Gewinntag wird nicht mehr fälschlich als fehlender Gewinn bezeichnet.

[Strukturierter Nachweis mit tatsächlichen Revisionen und Grenzen](KRYPTO-LIVE-NACHWEIS.json). Rohprotokolle bleiben außerhalb Git unter `/workspace/ci-ergebnisse/live-anzeige-ci`, `live-anzeige-paket-final` und `live-anzeige-lieferung`. Der Browserprüfer kann die ausschließlich synthetischen Oberflächenfälle wiederholen.

## Gefundener Fehler in der bestehenden Testumgebung

Der erste vollständige Paket-Probelauf auf `0c3395fab` war rot: `test_pilot2_live.py` bestand 150 von 156 Prüfungen. Die Broker-/Pilot-Implementierung war zum Ausgangsstand unverändert. Nachgestellt: Der Test entfernte die geerbte `NO_PROXY`-Regel; `urllib` behielt seinen zuvor erzeugten Proxy-Handler, prüfte die Ausnahme aber erneut. Der lokale Börsennachbau war anschließend nicht mehr erreichbar. Eine reine Diagnose ohne Netzverkehr zeigte: Loopback-Ausnahme vor Filter `True`, nach bisherigem Filter `False`, mit erhaltener Umgebungsregel wieder `True`.

Die Testumgebung erhält nun die vorhandenen Proxyvariablen einschließlich `NO_PROXY`. Es werden keine neuen Ausnahmen, Hosts oder Zugangsdaten gesetzt und keine Handelsprüfung entfernt. Danach 156 von 156 Prüfungen bestanden. Pilot-Regel, Broker, Risikogrenzen, Stopps, Not-Aus und Echtgeld-/Auto-Handel-Schalter bleiben unverändert. Der rote Vorversuch bleibt als solcher dokumentiert.

## Bereitstellung

Die tatsächlichen GitHub-Checks, der Merge, das Release `krypto-latest` und die Installation auf dem PC sind getrennt zu prüfen. Hier stehen keine echten Binance-Kontowerte zur Verfügung. Die Netzwerkfreigaben liegen im Cloud-Entwurf; die GitHub-API war beim letzten tatsächlichen Abruf weiterhin gesperrt. Ein gepushter Branch ist weder eine veröffentlichte PC-Version noch der Nachweis aktuell erzielter Gewinne. Die bestehende Updatekette bleibt maßgeblich; keinen manuellen Dateitausch an Schutzdateien oder Logbüchern vornehmen.
