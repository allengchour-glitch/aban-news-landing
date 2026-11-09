# Integration der belegten Rechercheergebnisse

Nutzerauftrag: «baue alles rein». Umgesetzt wurde das zusammenhängende Paket zur besseren Messung und Prüfung des vorhandenen Forschungsentwurfs. Kein ungeprüftes Komplettframework installiert, kein Broker an das Labor angeschlossen und keine Handelsfreigabe erteilt. Der bisherige Handelsbot bleibt unverändert.

| Erkenntnis | Stand | Beleg oder Grenze |
| --- | --- | --- |
| Zukunftswissen verhindern | Im Labor integriert | Präfixvergleich und unabhängige Änderung zukünftiger Preise; absichtlich hellseherische Strategie wird erkannt. Nicht alle möglichen Datenpfade bewiesen. |
| Historienabhängige Indikatoren | Im Labor integriert | Letztes Signal auf250/400/1000 Kerzen gegen Vollhistorie geprüft; künstlich rekursive Strategie wird erkannt. |
| Datenqualität und abgeschlossene Kerzen | Im Labor integriert | Struktur-, Datums-, Lücken-, Zahlen- und Reihenfolgeprüfung; zukünftige/unfertige Kerze verhindert Bericht. Alte Daten ausdrücklich historisch, keine aktuelle Signalentscheidung. |
| Gleiche Risikobudgets vergleichen | Im Labor integriert | Drei zusätzliche Vergleiche mit identischer Volatilitäts-Zielregel und gleichem Handelsband. Tatsächliche Exposure und Schwankung werden mit ausgegeben. Keine Garantie identischer realisierter Risiken. |
| Unabhängigkeit historischer Zeitfenster | Im Labor verbessert | Version2 verwendet getrennte Abschnitte statt überlappender Auswertungen. Bekannte Daten bleiben bekannte Daten; kein nachträglich unabhängiger Holdout. |
| Ausführungs- und Kostenmodell | Im Labor verbessert | Verzögerung, Positionsdrift, Ein-/Ausstieg, Gebühren, halber Spread und Schlupf in drei festgelegten Szenarien. Kein Orderbuch-/Intraday-/Futures-Modell. |
| Mehr als Rendite messen | Im Labor integriert | Einbruch, Unterwasserphase, Erholung, Umsatz, simulierte Aufträge, Kosten, Exposure und realisierte Schwankung. |
| Einheitliche Strategie-/Ausführungsschnittstelle | Im Labor integriert | Quotenreihen werden vor Simulation validiert. Keine Änderung am bestehenden Brokerauftragspfad. |
| Reproduzierbare Belege | Im Labor integriert | Daten-/Code-/Protokollhash, Prüfdatum, historische Zielquoten und Versuch-ID; keine Überschreibung vorhandener Berichte. Kein vollständiges Register aller früheren Versuche. |
| Modelle sauber trainieren und bewerten | Noch offen | Keine echten neuen KI-Features eingebaut; Datenstand und vollständige unabhängige Modellprüfung fehlen. Kein Renditeversprechen aus Projekt-READMEs. |
| Qlib, FreqAI, FinRL-X, R&D-Agent | Als Quellen ausgewertet | Kein Leistungsnachweis für unsere Aufgabe, deshalb keine ungeprüften Installationen oder parallelen Handelsdienste. |
| Brokerfehler, Rate-Limits, Schutzcode | Bestehenden Code erhalten |21 vorhandene Binance-Spot-Prüfungen mit lokalem Server bestanden. Kein Nachweis aller Futures-Anforderungen. Offene Auftragszustände nicht mit einem neuen ungeprüften Pfad überlagert. |
| Unabhängige Claude-Prüfung und Originalarbeiten | Noch offen | Auftrag und Quellen im Repository; keine laufende Claude-Sitzung erreichbar und keine Zustimmung behauptet. |

## Prüfung

GEMESSEN:20 dauerhafte Offline-Tests bestanden. Der bestehende `Deploy Check` führt sie bei vorhandenem Forschungs-Testmodul aus; vollständiger Checkout ist dort bereits konfiguriert, kein Sparse-Checkout-Nachtrag nötig. Keine Änderung an Handels-/Paketzeitplänen.

Zusätzlich derselbe Testlauf in einem isolierten temporären Baum ohne Repository-Kursdateien bestanden. Vier absichtliche Fehler jeweils erkannt: Signal einen Tag zu früh verwenden, Cash-Ausstieg unter dem Handelsband verhindern, unfertige Tageskerzen zulassen und Spread/Schlupf ignorieren. Unveränderte Kopie wurde vor den Fehlervarianten erfolgreich geprüft; Fehlervarianten nur im Temp-Baum.

Der Bericht `ergebnis-v2.json` wurde aus den vorhandenen Bitcoin-Daten mit ausdrücklich gewähltem Stichtag2026-10-29 erzeugt; die letzte Kerze liegt36 Tage davor. Seine gespeicherten Code-/Daten-/Protokollhashes dienen der Reproduktion, nicht dem Beweis einer Vorregistrierung oder zeitlichen Unabhängigkeit. Version1 bleibt separat erhalten.

Die vollständige lokale CI-Simulation und der aktuelle Remote-CI-/Merge-/Deploymentstand sind getrennt zu prüfen. Lokale Testergebnisse und ein eingetragener CI-Schritt bedeuten nicht, dass die GitHub-Prüfung bereits gelaufen ist. Ohne bestätigten Merge/Deployment keine Live-Behauptung. Historischer Forschungsbericht ist niemals eine Echtgeldfreigabe.

GEMESSEN nach dem Integrationscommit: `bash automation/ci_simulation.sh` endete mit Fehler bei `mktemp` unter `/home/agent` (schreibgeschütztes Dateisystem), bevor Tests starteten. Daher kein bestandener vollständiger CI-Simulationslauf. Die20 Labortests und der isolierte Temp-Baum wurden separat erfolgreich ausgeführt.
