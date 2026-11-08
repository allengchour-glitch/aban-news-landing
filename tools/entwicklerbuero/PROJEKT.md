# Entwicklerbüro für Automationen für Unternehmen

Ziel ist, kleine wiederverwendbare Automationen als betreutes Einrichtungspaket zu verkaufen. Der erste gewählte Zielmarkt sind Schweizer Handwerks- und Dienstleistungsbetriebe. Der Anfragen-Assistent ist die erste Demonstration: Anfrage sortieren, Sichtung markieren, Antwort vorbereiten.

## Angebot als Entwurf

«Wir richten dir einen Assistenten ein, der deine Kundenanfragen vorsortiert und Antwortentwürfe vorbereitet. Dein Betrieb prüft und versendet die Antworten.»

Lieferumfang des möglichen Pilots: ein Betrieb, eine vereinbarte Eingabequelle, angepasste Kategorien und Vorlagen, begleitete Prüfung und Übergabe. Aktuell vorhanden sind eine lokale CSV-Demo und ein EML-Beantworter im Entwurfsmodus. Eine produktive Postfach- oder CRM-Anbindung muss für den jeweiligen Betrieb erst gebaut und getestet werden.

Preis und Supportumfang sind offen. Der Besitzer entscheidet den tatsächlichen Verkaufspreis. Für diese Automationen ist noch kein eigener Checkout eingerichtet. Im Gesamtprojekt besteht bereits eine Stripe-Anbindung mit geschützter Download-Auslieferung; Details stehen in PROJEKTE.md. Es gibt keine bestätigten Kunden oder Einnahmen für dieses neue Projekt.

## Nächster wirtschaftlicher Nachweis

1. Eine Demo mit erfundenen Daten vorführen und mit einem interessierten Betrieb klären, welche Anfragen Zeit kosten.
2. Einen bezahlten Pilot mit klar begrenztem Umfang, Preis und Datenzugriff vereinbaren.
3. Vorher/nachher messen: Bearbeitungszeit und fehlerhafte Zuordnungen; bei unzuverlässiger Sortierung verbessern oder stoppen.
4. Erst nach einem erfolgreichen Pilot die häufigsten Anforderungen standardisieren. Onlineshops und weitere Branchen folgen als eigene Vorlagen.

Akquise-Nachrichten sind nicht versendet. Kontaktaufnahme und Veröffentlichungen erfordern einen konkreten Auftrag mit Empfängern bzw. Zielkanal. Es wird keine unbelegte Nachfrage oder Einsparung behauptet.

## Arbeitsweise des Entwicklerbüros

`werkstatt.py` führt Tests aus, erzeugt eine Demo und baut ein ZIP mit ausgewählten Produktdateien. Ein Bericht dokumentiert diesen tatsächlichen Durchlauf und kann ins Büro übernommen werden. Die Stationen zeigen Bau, Prüfung und Angebotsvorbereitung. Dauerhaft laufende KI-Agenten sind nicht eingerichtet.

Neue Produkte selbständig erfinden, Code mit einem Sprachmodell erzeugen und Änderungen unbeaufsichtigt veröffentlichen ist nicht eingerichtet. Dafür fehlen ein begrenzter Aufgabenbestand, ein laufender Dienst, der Modellzugang und ein Kostenlimit. Die jetzige Werkstatt hat keine Netzabhängigkeiten oder Modellkosten und startet auf Befehl.

```bash
python3 tools/entwicklerbuero/werkstatt.py /tmp/entwicklerbuero-lauf
python3 -I tools/buero/make_buero.py /tmp/buero.json --werkstatt-status /tmp/entwicklerbuero-lauf/status.json
```

## E-Mail-Beantworter als erstes Verkaufsprodukt

Der Auftrag vom 07.11. konkretisiert das erste Produkt als E-Mail-Beantworter. Version 0.2.0 liest gespeicherte EML-Dateien und erstellt Antworten als ungesendete EML-Entwürfe. Die Werkstatt prüft und paketiert jetzt auch diesen Modus. Postfachanbieter und Kontoverbindung sind noch offen. Der mögliche Pilot umfasst nach Anbieterwahl eine begrenzte Postfachanbindung und eine Prüfung der Antwortqualität anhand freigegebener Beispiele. Automatischer Versand ist nicht eingerichtet.

## Kommentar-Beantworter als zweiter Einsatzfall

Version 0.3.0 ergänzt Social-Media-Kommentare: CSV einlesen, Fragen gegen freigegebene FAQ prüfen, Antwortentwürfe und manuelle Prüffälle ausgeben. Die Werkstatt prüft und paketiert auch diesen Modus. Die Demo enthält nur erfundene Kommentare. Echte Plattformanbindung, Freigabe der Firmenantworten und Veröffentlichung sind noch offen. Ein möglicher Pilot kann E-Mail- oder Kommentarentwürfe anbieten; ein konkreter Kundenbedarf ist weiterhin zu prüfen.

## Projektbüros und Fortschritt

Vier Projekte sind in `projekte.py` verbunden: E-Mail, Kommentare, Angebots-Nachfassen und Webseiten-Prüfung. Die tägliche Werkstatt exportiert überprüfte Meilensteine und Lieferpakete. Die Büroanzeige berechnet daraus den Prozentstand. Details und Grenzen stehen in `PROJEKTE.md`.
