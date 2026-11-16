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
  - Fehlt er, wird er angelegt. Lieferzeit: Bearbeitung 1 bis 3 und Transit 10 bis 29 Werktage (`LIEFERZEIT_LI`), aus der Vorlage nur die Annahmezeit (erster aktiver Schweizer Dienst mit Zustellung und Lieferzeit, einer mit Annahmezeit wird vorgezogen). Die Werktage setzt das Werkzeug ausdrücklich auf Montag bis Freitag. Die drei Schweizer Dienste und die Lager werden unverändert mitgeschickt, zusammen mit dem `etag`. Hat sich der Stand seit dem Lesen geändert, lehnt Google ab. Ohne `etag` schreibt das Werkzeug nichts.
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

## Lieferzeit Liechtenstein (seit 16.11.)

- **Warum eigene Werte:** Bis 16.11. übernahm der Dienst die Schweizer Lieferzeit (Transit 9 bis 19 Werktage). Die Sendungen nach Liechtenstein laufen aber über PostNL, 15 bis 45 Kalendertage (Versandseite des Shops; #1032 im Oktober: PostNL). Google zeigte damit eine zu kurze Lieferzeit.
- **Werte:** Bearbeitung 1 bis 3, Transit 10 bis 29 Werktage, Werktage Montag bis Freitag (beide Felder ausdrücklich gesetzt). Das sind 11 bis 32 Werktage, rund 15 bis 45 Kalendertage (gerechnet, nicht gemessen).
- **Warum die Werktage ausdrücklich:** Google beschreibt den Vorgabewert widersprüchlich. Die API-Referenz sagt «If not provided, Monday to Friday business days will be assumed», die Merchant-Center-Hilfe nennt Montag bis Samstag (beides gelesen 16.11.). Mit Samstag versprächen dieselben Zahlen nur rund 13 bis 37 Kalendertage.
- **Angleichen:** Nur der Modus `schreiben` ändert die Lieferzeit eines schon vorhandenen eigenen Dienstes («Standard Liechtenstein», LI, CHF 14.90). Er schickt die übrigen Dienste und Lager unverändert mit dem `etag` mit und liest danach zurück wie beim Anlegen.
- **Wächter und Prüfung gleichen nie an:** Weicht die Lieferzeit ab, steht im Protokoll «weicht von der Vorgabe … ab (angleichen mit MODUS schreiben)», Exit 0, keine Meldung per Telegram. So überschreibt der tägliche Lauf keine Lieferzeit, die jemand im Merchant Center von Hand gesetzt hat.
- Ein fremder Dienst für Liechtenstein (anderer Name) wird nie angefasst.
- **Gleich heisst:** die vier Tageszahlen stimmen (auch wenn Google sie als Text liefert), die Werktage fehlen oder sind genau Montag bis Freitag, und es gibt keine Transit-Tabelle und keine Lager-Lieferzeiten. Trägt unser Dienst eine Tabelle oder Lager-Lieferzeiten, endet `schreiben` mit Exit 8 (von Hand prüfen) und sendet nichts.
- **Nur Zustellung nach Hause:** Ein eigener Dienst mit anderer Versandart (z. B. lokale Zustellung) wird nie angeglichen.
- **Nach dem Senden:** Jeder aktive eigene Dienst muss ausser der Lieferzeit gleich bleiben und die neue Lieferzeit tragen; alle übrigen Dienste (auch ein inaktiver eigener) und die Lager unverändert. Zeigt das Zurücklesen ein neues `etag`, aber nicht den gesendeten Stand, oder unseren Dienst inaktiv, endet der Lauf sofort mit Exit 7 statt zu warten.
- **Auch beim Anlegen** wird die Lieferzeit geprüft (Antwort und Zurücklesen). Zeigt das Zurücklesen ein neues `etag` ohne unseren Dienst (vermutlich hat die Google-App neu geschrieben), endet der Lauf mit Exit 7; der Wächter legt ihn am nächsten Tag neu an.
- **Lesefehler beim Zurücklesen** ohne Bestätigung ergeben Exit 7, nie Erfolg. Weicht die insert-Antwort ab, wird der Stand einmal gelesen und gezeigt, dann Exit 7.
- **Veralteter Lesestand und `etag` (gemessen 16.11. 01:31 UTC):** Beim ersten echten Angleichen zeigte das erste Zurücklesen noch den alten Stand und meldete «fertig=False» (also auch das alte `etag`), das zweite bestätigte. Darauf stützt sich der schnelle Abbruch bei neuem `etag`; eine einzelne Messung, kein Beweis für jeden Fall (Fehlalarm Exit 7 wäre die Folge, kein falscher Erfolg).
- **Mitgeschickt wird jedes gelesene Feld ausser `name`:** insert ersetzt alles, ein künftiges Feld ginge sonst still verloren.
- **Zeitlimit oder Netzfehler beim Senden:** Exit 9 mit «möglicherweise gesendet»; nicht sofort wiederholen, der nächste Lauf prüft. Das gilt auch beim Anlegen und bei der Rücknahme.

## Einmaliger Handlauf zum Angleichen

1. Actions → «Merchant-Versand Liechtenstein» → `modus` = `schreiben`. Erwartet: «Lieferzeit Liechtenstein angeglichen, übrige Dienste unverändert (GLEICH)».
2. Frühestens 2 Minuten später `modus` = `pruefen`. Erwartet: «nichts zu tun» und in der Liste beim Dienst «Standard Liechtenstein» `Bearbeitung=1-3 Transit=10-29 Werktage=Mo-Fr` (oder `Werktage=Vorgabe`, falls Google den Vorgabewert weglässt).
3. Der Wächter meldet eine spätere Abweichung der Lieferzeit nicht per Telegram, nur im Protokoll.

**Ausgeführt 16.11.:** `schreiben` 01:31 UTC «angeglichen … (GLEICH)», `pruefen` 01:34 UTC «nichts zu tun», Dienst «Standard Liechtenstein» mit `Bearbeitung=1-3 Transit=10-29 Werktage=Mo-Fr`. Google behält die ausdrücklich gesendeten Werktage. Die drei Schweizer Dienste sind unverändert.

## Prüfung

- Offline-Test 256 Prüfungen (seit 16.11. mit Lieferzeit: Anlegen mit den neuen Werten, Angleichen nur in `schreiben`, Hinweis ohne Schreiben in Wächter und Prüfung, Verzug, Antwort ohne neue Zeit, Lager verändert, Fehler nach dem Senden, jede Meldung nach dem Senden in einer Schleife über 16 Fehlerfälle; drei Prüfrunden mit Nachstellungen; dazu gefälschte Merchant API mit Verzögerung und etag-Prüfung wie Google, Lager, fremden LI-Diensten, Tabellen und Versandlabels, Lese- und Netzfehlern mit Kontonummer im Text, Telegram), läuft bei jedem Pull Request und vor jedem Lauf.
- Mutationsprobe 16.11. mit Lieferzeit: 159 von 159 Mutanten erkannt (davor 82 von 82; Skript im Scratch, nicht im Repo). Die 55 eigenen Mutanten des Testprüfers der dritten Runde: 29 erkannt, 17 auf der neuen Fassung nicht mehr anwendbar (ihre Fälle sind durch neue Tests abgedeckt), 9 überleben und sind nach seiner Einstufung gleichwertig (z. B. Status 2xx statt 200, Fehlerwert 0 statt None bei Tageszahlen ohne 0). Die Attrappe lehnt wie Google doppelte Dienstnamen und gemischte Transitfelder ab. Zwei unabhängige Prüfer: Runde 1 Kontonummer-Leck über Fehlertexte, fehlender etag-Schutz; Runde 2 kein Blocker, neun kleine Funde, alle behoben und an den Nachstellungen des Prüfers nachgemessen.

- **Alte Protokolle geprüft (16.11.):** alle neun Läufe dieses Workflows (11.11. bis 15.11.) enthalten kein «accounts/» und keine Merchant-Nummer. Die langen Zahlen in den Dienstnamen der Google-App (`flat_7.00_CHF_<12 Ziffern>_<13 Ziffern>_standard`) sind Shopify-Kennungen von Versandzone und Tarif (gegen `deliveryProfiles` abgeglichen). Die neue Fassung schwärzt sie in der Anzeige trotzdem (Regel: jede Zahl ab 7 Stellen).

## Offen

- Ungemessen ist, wann und warum die Google-App die Dienste neu schreibt. Der Wächter repariert höchstens einmal am Tag. Dazwischen kann LI für Stunden gesperrt sein.
- Wirkung auf Verkäufe: klein (bisher eine Bestellung aus LI).
- Der alte Zweig `claude/merchant-li-schreiben-1511` (Datei `MODUS` = `schreiben`) liess sich nicht löschen (HTTP 403). Er schreibt nur bei einem Handstart auf genau diesem Zweig. Der Zweig `claude/shop-bilder-1111` trägt noch eine ältere Fassung des Workflows mit Push-Auslöser; ein Push dorthin startet einen Lauf mit der alten Fassung.
