# Privater Finanzmonitor

Die Standardansicht des Geldmanagers zeigt Summen, eine Tabelle und Monatsumsätze. Du musst keine Beträge eintippen. Die bisherige Planung bleibt als optionaler, anfangs geschlossener Bereich erhalten. Der Chefbüro-Bildschirm übernimmt dieselben formatierten Werte aus dem privaten Bericht im Browser.

`finanzmonitor.js` liest einen begrenzten Bericht mit Cent-Beträgen, lückenlosen und eindeutigen Umsatztagen, getrennten Werbedaten und Kostenstatus. Unbekannte Beträge sind keine Null. Warenrückgaben sind bereits im Umsatz berücksichtigt. Fehlende Warenkosten, Gebühren, Versand- oder laufende Kosten verhindern eine Gewinnausweisung. Eine Teilsumme bekannter Kosten bleibt als unvollständig markiert. Teilzeiträume bekommen keine frei verteilten Fixkosten; Währungen werden nicht zusammengerechnet.

Echte Finanzdaten gehören nicht in die öffentliche Webseite, Statusdateien oder das Repository. `finanzbericht.py` baut eine private HTML-Ansicht ausserhalb des Repositories. Der Bericht wird lokal gelesen, ohne Upload, Zugangsdaten oder dauerhafte Browserablage. Die öffentliche Büroansicht startet ohne private Beträge. Eine Berichtsdatei kannst du lokal öffnen; der Stand bleibt beim Ansichtswechsel erhalten und lässt sich wieder leeren.

Die Ansicht zeigt einen gespeicherten Datenstand, keinen laufenden Kontosync. Für neue Werte ist ein neuer autorisierter Datenabruf nötig. Zahlungslinks und erfolgreich geprüfte Lizenzschranken liefern weder Umsätze noch vollständige Kosten.

## Statistikdarstellung

Kennzahlen, Zeitfilter und Monatsdiagramm stehen vor den Detailpositionen. Das Diagramm lässt sich zwischen Balken und Linie umschalten; die Wahl bleibt beim Zeitraumwechsel erhalten. Negative Monatswerte liegen unter der Nulllinie. Die Monatswerte umfassen nur den gewählten Zeitraum, ein angefangener Monat ist kein vollständiger Monatsvergleich. Antippen oder Tastaturwahl eines Monats zeigt den exakten Betrag unter dem Diagramm. Die Monatswahl bleibt beim Wechsel des Diagrammtyps erhalten. Exakte Beträge stehen auch in den zugänglichen Beschriftungen der Diagrammmarken.

Fünf Statuskacheln trennen Warenkosten, Werbung, Versandkosten, Gebühren und Fixkosten. Die Kacheln zeigen den bereits berechneten Kostenstand, keinen erfundenen Fortschrittsprozentsatz. Unbekannte Werte und gespeicherte/alte Messzeiten bleiben erkennbar. Die Finanzberechnung, Quellen und Datenabrufe werden durch das Design nicht geändert.
