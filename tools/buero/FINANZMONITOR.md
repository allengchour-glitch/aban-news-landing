# Privater Finanzmonitor

Die Standardansicht des Geldmanagers zeigt Summen, eine Tabelle und Monatsumsätze. Du musst keine Beträge eintippen. Die bisherige Planung bleibt als optionaler, anfangs geschlossener Bereich erhalten. Der Chefbüro-Bildschirm übernimmt dieselben formatierten Werte aus dem privaten Bericht im Browser.

`finanzmonitor.js` liest einen begrenzten Bericht mit Cent-Beträgen, lückenlosen und eindeutigen Umsatztagen, getrennten Werbedaten und Kostenstatus. Unbekannte Beträge sind keine Null. Warenrückgaben sind bereits im Umsatz berücksichtigt. Fehlende Warenkosten, Gebühren, Versand- oder laufende Kosten verhindern eine Gewinnausweisung. Eine Teilsumme bekannter Kosten bleibt als unvollständig markiert. Teilzeiträume bekommen keine frei verteilten Fixkosten; Währungen werden nicht zusammengerechnet.

Echte Finanzdaten gehören nicht in die öffentliche Webseite, Statusdateien oder das Repository. `finanzbericht.py` baut eine private HTML-Ansicht ausserhalb des Repositories. Der Bericht wird lokal gelesen, ohne Upload, Zugangsdaten oder dauerhafte Browserablage. Die öffentliche Büroansicht startet ohne private Beträge. Eine Berichtsdatei kannst du lokal öffnen; der Stand bleibt beim Ansichtswechsel erhalten und lässt sich wieder leeren.

Die Ansicht zeigt einen gespeicherten Datenstand, keinen laufenden Kontosync. Für neue Werte ist ein neuer autorisierter Datenabruf nötig. Zahlungslinks und erfolgreich geprüfte Lizenzschranken liefern weder Umsätze noch vollständige Kosten.
