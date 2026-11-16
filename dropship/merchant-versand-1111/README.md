# Merchant-Versand Liechtenstein

Werkzeug `automation/merchant_versand.py`, Workflow `.github/workflows/merchant-versand.yml`, Offline-Test `automation/merchant_versand_test.py`.

## Warum

- **Ursprung:** Der Shop verkauft nach Liechtenstein (Shopify: Markt «Switzerland» = CH und LI, Zone «Liechtenstein», CHF 14.90). Die Google-App in Shopify überträgt aber nur die Schweizer Versanddienste ins Merchant Center. Ohne Dienst für LI sperrt Google die Artikel dort.
- **11.11.2026:** Dienst «Standard Liechtenstein» angelegt (Variante A des Besitzers vom 10.11.).
- **15.11.2026:** Der Dienst war wieder weg (gemessen 23:18 und 23:22 UTC).
  - Google sperrte rund 160 000 Artikel in den kostenlosen Einträgen in LI.
  - Die Mail von Google meldete −33 %.
  - Hypothese: Die Google-App schreibt die Versanddienste neu und löscht den von Hand angelegten.
- **Wieder angelegt 15.11. 23:52 UTC** (Besitzer «a du kannst alles fixen»). Frisch gelesen: vier Dienste, die drei Schweizer unverändert.

## Tägliche Prüfung (Modus `waechter`)

- **Zeitplan:** 05:29 UTC. GitHub startet hier oft Stunden später.
- **Ablauf:**
  - Steht ein aktiver Dienst für LI mit Zustellung (beliebiger Name, mindestens eine Tarifgruppe für alle Artikel, die nicht «kein Versand» ist), wird nichts geschrieben.
  - Fehlt er, wird er angelegt: Lieferzeit vom ersten aktiven Schweizer Dienst mit Zustellung und Lieferzeit. Die drei Schweizer Dienste und die Lager werden unverändert mitgeschickt, zusammen mit dem `etag`. Hat sich der Stand seit dem Lesen geändert, lehnt Google ab. Ohne `etag` schreibt das Werkzeug nichts.
  - Danach wird bis zu 8-mal im Abstand von 15 Sekunden zurückgelesen. Direkt nach dem Schreiben zeigt das Lesen noch den alten Stand, gemessen am 11.11. und am 15.11. Ein Lesefehler dabei zählt als «noch nicht sichtbar». Jede Meldung nach dem Senden sagt, dass schon gesendet wurde.
  - Bestätigt die Antwort von Google den Dienst, ist er aber nach 8 Versuchen noch nicht lesbar: Exit 0 mit Hinweis, der nächste Lauf prüft. Haben sich die übrigen Dienste oder Lager verändert, ist unser Dienst inaktiv oder anders gespeichert, oder scheitert jedes Zurücklesen: Exit 7.
- **Telegram:** Eine Meldung kommt nur, wenn der Wächter eingreifen musste oder ein Fehler auftrat. Scheitert der Zeitplanlauf, bevor das Skript läuft (Test rot, Installation), meldet der Job `meldung`.
- **Keine Merchant-Nummer im Log:** Fehlertexte werden geschwärzt (`accounts/…`, Zahlen ab 7 Stellen), unerwartete Fehler nur mit ihrem Typ gemeldet (Exit 9). Das Artefakt `versand-vorher` enthält nur die Dienste.
- **Exit-Codes:**
  - 0 fertig oder nichts zu tun
  - 2 unbekannter Modus
  - 3 Kontoliste nicht lesbar oder mehr als ein Konto
  - 4 Lesefehler oder kein `etag`
  - 5 kein aktiver Schweizer Dienst mit Zustellung und Lieferzeit als Vorlage
  - 6 Google lehnt das Schreiben ab (z. B. Stand inzwischen geändert)
  - 7 Zurücklesen bestätigt nicht, scheitert, oder übrige Dienste/Lager verändert
  - 8 unklarer Dienst für LI (inaktiv, ohne Versand, unser Name mit anderem Zustand): von Hand prüfen
  - 9 unerwarteter Fehler (Netz, Zeitlimit, Anmeldung)
  - 10 nur im Zeitplan mit ausgeschaltetem Wächter: LI fehlt, nichts geschrieben
- **Schalter:** Datei `WAECHTER` in diesem Ordner. «an» heisst scharf. Alles andere oder Löschen der Datei heisst: Der Zeitplan liest nur, und der Lauf wird rot, wenn LI fehlt.
- **Handstart:** Actions → «Merchant-Versand Liechtenstein» → Eingabe `modus`:
  - `pruefen` liest nur
  - `waechter` und `schreiben` legen den Dienst an, wenn er fehlt (`schreiben` meldet nicht per Telegram)
  - `zurueck` entfernt nur den Dienst «Standard Liechtenstein» mit genau LI und CHF 14.90; ein gleichnamiger Dienst mit anderem Zustand stoppt mit Exit 8
  - `datei` nimmt den Modus aus der Datei `MODUS` (Vorgabe `pruefen`)
- **Nicht innerhalb von 2 Minuten nach einem Schreiblauf von Hand wiederholen:** Das Lesen kann noch den alten Stand zeigen, der zweite Lauf hielte den Dienst dann für fehlend. Google lehnt ein zweites Anlegen wegen des `etag` meist ab (Exit 6), sicher belegt ist das nicht.

## Prüfung

- Offline-Test 125 Prüfungen (gefälschte Merchant API mit Verzögerung und etag-Prüfung wie Google, Lager, fremden LI-Diensten, Tabellen und Versandlabels, Lese- und Netzfehlern mit Kontonummer im Text, Telegram), läuft bei jedem Pull Request und vor jedem Lauf.
- Mutationsprobe 16.11.: 82 von 82 Mutanten erkannt (Skript im Scratch, nicht im Repo). Zwei unabhängige Prüfer: Runde 1 Kontonummer-Leck über Fehlertexte, fehlender etag-Schutz; Runde 2 kein Blocker, neun kleine Funde, alle behoben und an den Nachstellungen des Prüfers nachgemessen.

## Offen

- Ungemessen ist, wann und warum die Google-App die Dienste neu schreibt. Der Wächter repariert höchstens einmal am Tag. Dazwischen kann LI für Stunden gesperrt sein.
- Wirkung auf Verkäufe: klein (bisher eine Bestellung aus LI).
- Der alte Zweig `claude/merchant-li-schreiben-1511` (Datei `MODUS` = `schreiben`) liess sich nicht löschen (HTTP 403). Er schreibt nur bei einem Handstart auf genau diesem Zweig. Der Zweig `claude/shop-bilder-1111` trägt noch eine ältere Fassung des Workflows mit Push-Auslöser; ein Push dorthin startet einen Lauf mit der alten Fassung.
