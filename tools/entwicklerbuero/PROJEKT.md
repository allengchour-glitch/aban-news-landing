# Entwicklerbüro für Automationen für Unternehmen

Ziel ist, kleine wiederverwendbare Automationen als betreutes Einrichtungspaket zu verkaufen. Der erste gewählte Zielmarkt sind Schweizer Handwerks- und Dienstleistungsbetriebe. Der Anfragen-Assistent ist die erste Demonstration: Anfrage sortieren, Sichtung markieren, Antwort vorbereiten.

## Angebot als Entwurf

«Wir richten einen Assistenten ein, der Ihre Kundenanfragen vorsortiert und Antwortentwürfe vorbereitet. Ihr Betrieb prüft und versendet die Antworten.»

Lieferumfang des möglichen Pilots: ein Betrieb, eine vereinbarte Eingabequelle, angepasste Kategorien und Vorlagen, begleitete Prüfung und Übergabe. Aktuell vorhanden ist ausschließlich die lokale CSV-Demo. Eine produktive Postfach- oder CRM-Anbindung muss für den jeweiligen Betrieb erst gebaut und getestet werden.

Preis und Supportumfang sind offen. Der Besitzer entscheidet den tatsächlichen Verkaufspreis. Kein Checkout und kein Zahlungsanbieter sind eingerichtet. Es gibt keine bestätigten Kunden oder Einnahmen für dieses neue Projekt.

## Nächster wirtschaftlicher Nachweis

1. Eine Demo mit erfundenen Daten vorführen und mit einem interessierten Betrieb klären, welche Anfragen Zeit kosten.
2. Einen bezahlten Pilot mit klar begrenztem Umfang, Preis und Datenzugriff vereinbaren.
3. Vorher/nachher messen: Bearbeitungszeit und fehlerhafte Zuordnungen; bei unzuverlässiger Sortierung verbessern oder stoppen.
4. Erst nach einem erfolgreichen Pilot die häufigsten Anforderungen standardisieren. Onlineshops und weitere Branchen folgen als eigene Vorlagen.

Akquise-Nachrichten sind nicht versendet. Kontaktaufnahme und Veröffentlichungen erfordern einen konkreten Auftrag mit Empfängern bzw. Zielkanal. Es wird keine unbelegte Nachfrage oder Einsparung behauptet.

## Arbeitsweise des Entwicklerbüros

`werkstatt.py` führt Tests aus, erzeugt eine Demo und baut ein ZIP mit ausgewählten Produktdateien. Ein Bericht dokumentiert diesen tatsächlichen Durchlauf und kann ins Büro übernommen werden. Die Stationen zeigen Bau, Prüfung und Angebotsvorbereitung. Sie stellen keine dauerhaft laufenden KI-Agenten dar.

Neue Produkte selbständig erfinden, Code mit einem Sprachmodell erzeugen und Änderungen unbeaufsichtigt veröffentlichen ist nicht eingerichtet. Dafür fehlen ein begrenzter Aufgabenbestand, ein laufender Dienst, der Modellzugang und ein Kostenlimit. Die jetzige Werkstatt hat keine Netzabhängigkeiten oder Modellkosten und startet auf Befehl.

```bash
python3 tools/entwicklerbuero/werkstatt.py /tmp/entwicklerbuero-lauf
python3 -I tools/buero/make_buero.py /tmp/buero.json --werkstatt-status /tmp/entwicklerbuero-lauf/status.json
```
