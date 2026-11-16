# Merchant und Ringgrössen – Übergabe 15.11.2026

## Nachweislich erledigt
- Ringgrössen-Messanleitung mit EU-Tabelle und Innendurchmesser ist öffentlich: https://luxestyle.ch/pages/ringgroesse-richtig-messen. Der Geburtsstein-Ring verlinkt sie in der Beschreibung.
- Lieferant nennt Grössen 6–10 ohne bestätigtes Grössensystem. Deshalb keine erfundene US/EU-Umrechnung. Verpackungsmasse sind keine Ringmasse. Option im Admin auf „Ringgrösse (Hersteller)“ geändert; öffentlich erscheint noch „Abmessung“. Die Anleitung ist öffentlich sichtbar.
- Alle 30 Varianten des Geburtsstein-Rings haben jetzt passende Bilder mit mindestens 500 Pixeln pro Seite (1254 oder 1920). IDs, SKUs und Preise erhalten. Nachweise: Läufe 43751169041 und 43753211007, öffentliche Produktdaten frisch gelesen.
- Vier Bilder bei Konsole, Brauengel und Drohne ohne Werbeeinblendungen ersetzt; physische Markenaufdrucke erhalten. Lauf 43752729854. Originale gesichert.
- 39 Google-Bildlinks korrigiert beziehungsweise bereits aktuell vorgefunden und alle 39 frisch bestätigt (43752452354, 43753181692). Zusätzlich Drohnen-Abgleich 43755196635 erfolgreich. Das bestätigt Bildfelder, keine Freigabe durch Google.
- Werbetext „Hot Sale“ aus 18 Schuhvarianten entfernt; IDs, SKUs, Preise und Grössenzuordnung erhalten (43749061222).

## Offen – keine vollständige Fehlerfreiheit behaupten
- 21 Varianten von Kapuzenkleid/Babyset: Lieferantenoriginale nur rund 200 Pixel. Passende hochauflösende Originalfotos fehlen; andere Muster nicht untergeschoben.
- AutoFeed: fehlende Preise/Verfügbarkeit lassen sich über die vorhandene Produkt-API nicht ändern. Ein eng begrenzter Pilot wurde mit HTTP 400 abgewiesen, weil die Datenquelle keinen API-Eingabetyp hat (43754504002). Kein Preis geschrieben. Native Merchant-Datenquellenkorrektur/erneute Verarbeitung nötig; keine statischen Ersatzpreise erfinden.
- 979 DE-Versandmeldungen betreffen zugleich für CH/LI zugelassene Einträge. Nicht löschen: das würde gültige CH/LI-Angebote treffen. Trockenlauf hat das erkannt (43751565346). Keine DE-Tarife erfunden.
- Checkout und Merchant verwenden Gratisversand ab CHF 45; öffentliche Versandseite nennt CHF 50 nach Rabatt. Geschäftliche Schwelle klären, keine Gebühren eigenmächtig geändert. LI CHF 14.90 frisch bestätigt.
- Richtlinien-/Fehlklassifizierungen brauchen native Google-Prüfung. Keine Beschwerde versendet und keine Einschränkung durch falsche Texte umgangen. Manche Kategorien betreffen nur Display/Demand Gen, nicht kostenlose Einträge.
- Eine von Google gemeldete 500-Zielseite antwortete beim frischen Desktop-/Mobilabruf mit 200. Keine unbelegte Serverreparatur behaupten.
- Aktualisierte Shopbilder und Texte brauchen bei alten AutoFeed-Angeboten erneutes Crawling. Alte Google-Fehlerzahlen sind kein aktueller Freigabenachweis.

## Prüfung und sichere Fortsetzung
14 gezielte Schutztests bestanden; API- und öffentliche Rückleseprüfungen durchgeführt. Vollständige lokale CI-Simulation scheiterte an einem Schreibversuch im schreibgeschützten HOME; nicht als bestanden ausgeben. Zweigprüfungen auf GitHub zuletzt grün. Alle Schreibmodi nach Abschluss auf Prüfen beziehungsweise fertig zurückgesetzt. Entwurfs-PR 3152 bleibt ungemergt. Keine Zugangsdaten im Bericht.

Arbeitsverzeichnis: /tmp/luxestyle-merchant-work. Lokale Belege: /tmp/luxestyle-merchant-fix/. Wichtige Unterordner: final-verification, ring-25-live, overlays-live, erweiterte-diagnose, shipping-issues, cj-small-image-sources, price-pilot, issue-actions.
