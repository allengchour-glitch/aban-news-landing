# Anfragen Assistent für kleine Betriebe

Version 0.3.0 ist ein vorführbarer Prototyp für Schweizer Handwerks- und Dienstleistungsbetriebe. Eine CSV mit Anfragen wird nach Offerten, Terminen, Rechnungen, Reklamationen und allgemeinen Anliegen sortiert. Dringlichkeitswörter erzeugen eine Markierung zur Sichtung. Zu jeder Anfrage entsteht ein Antwortentwurf aus einer festen Vorlage.

```bash
python3 assistent.py demo.csv /tmp/anfragen-demo --firma "Beispielbetrieb (Demo)"
python3 -m unittest discover -s . -p 'test_*.py'
```

Der Ausgabeordner muss neu sein. Die CSV braucht `id,betreff,nachricht`; Kennungen müssen eindeutig sein. Ausgabe: `uebersicht.csv`, einzelne Entwürfe und `bericht.json`. Die Beispieldaten sind erfunden.

## Was ein Kunde bekommt

Einrichtung für einen Betrieb, Anpassung der Antwortvorlagen an dessen Leistungen und eine begleitete Probe mit freigegebenen Beispielen. Eignung und Nutzen werden im Pilot geprüft: korrekte Zuordnung, übersehene dringende Fälle und tatsächlich gesparte Bearbeitungszeit. Die erste Fassung verarbeitet CSV-Exporte und gespeicherte E-Mail-Dateien; die Anbindung an E-Mail, Formular oder CRM gehört noch nicht zum Lieferumfang.

## Grenzen

Die erste Fassung nutzt deutsche Wortregeln und feste Vorlagen, kein Sprachmodell. Verneinungen, fremdsprachige Texte und komplexe Fälle können falsch zugeordnet werden. Jeder Entwurf muss gegen die Anfrage geprüft werden; bereits vorhandene Angaben können erneut erfragt werden. Es gibt keine automatische Versendung, Preiszusage, Buchung oder Zahlungsbestätigung. Dringlichkeitsmarkierungen sind keine Notfallbewertung und keine zugesicherte Reaktionszeit.

Produktive Kundendaten gehören in den freigegebenen Speicher des Betriebs, niemals ins Repository oder in Versionsverwaltung. Vor einem echten Einsatz sind Datenzugriff, Aufbewahrung und Verantwortlichkeiten mit dem Betrieb zu klären. Ein bestandenes Demopaket ist noch kein Nachweis für einen produktiven Kundenbetrieb.

## E-Mail-Beantworter im Entwurfsmodus

```bash
python3 email_antworter.py demo-email.eml /tmp/email-demo --firma "Beispielbetrieb (Demo)" --absender buero@example.invalid
```

Als Eingabe geht auch ein Ordner mit EML-Dateien. Der neue Ausgabeordner enthält eine lokale Prüfseite `index.html`, Antwortdateien `antwort-0001.eml` usw. und einen Bericht. Sie sind ungesendete Entwürfe mit Empfänger, Betreff und Thread-Bezug. Ob der eigene Mailclient EML als bearbeitbaren Entwurf importiert, muss dort geprüft werden. Es werden keine Postfächer gelesen und keine E-Mails verschickt.

Öffne `index.html` im Browser, auch auf dem Handy. Jede Nachricht nennt ihre Quelldatei, auch bei manueller Prüfung oder übersprungenen Nachrichten. Danach lässt sich in der Prüfseite suchen; `bericht.json` enthält dieselbe Zuordnung als `quelldatei`. Der Dateiname ist kein Öffnungslink, die Originaldatei bleibt im Eingabeordner. Auch Dateinamen können vertrauliche Angaben enthalten und gehören deshalb nur in den freigegebenen Speicher. Die Seite zeigt ursprünglichen Text und Antwortentwurf, sucht nach Inhalt oder Empfänger und filtert übersprungene Nachrichten. Mit „Antwort kopieren“ übernimmst du den Text ins Mailprogramm; ohne Zwischenablage-Zugriff wird der Text zur manuellen Kopie ausgewählt. „EML herunterladen“ öffnet beziehungsweise speichert den unveränderten Entwurf. Die Prüfseite ist schreibgeschützt, funktioniert ohne externe Dienste und enthält lokale Nachrichten: im freigegebenen Speicher behalten. Es gibt keine Versandfunktion und keine gespeicherten Freigaben.

Text-Mails und einfache HTML-Mails werden unterstützt; Anhänge werden nicht gelesen oder kopiert. Newsletter, Zustellberichte, automatische Antworten, eigene Absender und No-Reply-Adressen werden ausgesondert. Mehrere oder unklare Antwortadressen gehen in die manuelle Prüfung. Die Erkennung ist heuristisch und ersetzt keine Prüfung der Empfänger oder des Inhalts. Doppelte Message-IDs werden innerhalb eines Stapels ausgesondert; es gibt noch keine dauerhafte Postfach-Synchronisierung.

Ohne Firmenwissen nutzen die Entwürfe feste Vorlagen. Mit `--wissen /pfad/firmen-faq.json` übernimmt der Beantworter bei genau einem Stichworttreffer die dort freigegebene Antwort. Die Datei hat dasselbe Format wie die Kommentar-FAQ unten. Unbekannte und mehrdeutige Anliegen, erkannte Beschwerden, Rechnungsfragen und Dringlichkeitswörter bleiben ohne Antwortentwurf in der manuellen Prüfung; Originaltext und Grund stehen in der lokalen Prüfseite. Ungültige FAQ stoppen den Lauf vor der Ausgabe. Die Demo-FAQ enthält Social-Antworten und muss für E-Mails durch passende Firmenangaben ersetzt werden.

Stichworttreffer verstehen weder Verneinungen noch vollständige Mailverläufe. Auch ein eindeutiger Treffer kann unpassend sein und muss vor Verwendung geprüft werden. Eine kontextbezogene KI-Antwort oder Verarbeitung von Anhängen ist nicht angebunden. Die Gmail-/Outlook-Anbindung ist offen; Zugangsdaten gehören nicht in das Repository oder in den Chat.

## Gespeicherte Gmail-Rohdaten übernehmen

`gmail_import.py` schliesst die lokale Formatlücke zwischen einem vorhandenen lesenden Gmail-Zugang und dem EML-Beantworter. Das Werkzeug ruft selbst kein Konto auf und braucht keine Zugangsdaten. Ein freigegebener lesender Zugang muss die gewählten Nachrichten zuerst im Gmail-Format `raw` liefern. Speichere die eigentliche Antwort als JSON mit `id` und `raw`, oder als Liste solcher Objekte, im privaten Betriebsspeicher. `raw` ist der Base64url-kodierte vollständige Nachrichtentext der Gmail-API; eine Nachrichtensuche oder ein Textauszug reicht nicht.

```bash
python3 gmail_import.py /privat/gmail-raw.json /privat/email-import
python3 email_antworter.py /privat/email-import /privat/email-pruefen --firma "Pilotbetrieb" --absender buero@example.invalid --wissen /privat/freigegebene-faq.json
```

Beide Ausgabeordner müssen neu sein. Der Import nimmt höchstens 100 Nachrichten, 2 MiB je dekodierter Nachricht und 8 MiB je Exportdatei an. Vor der Ausgabe wird der gesamte Stapel geprüft; ungültige Rohdaten oder doppelte Gmail-Kennungen werden abgewiesen. Bei Schreibfehlern kann ein unvollständiger Ausgabeordner zurückbleiben; Fehlermeldung prüfen, statt ihn als fertige Lieferung zu verwenden. Es gibt keine automatische Wiederholung.

Die EML-Dateien bleiben bytegleich zur gelesenen Quelle. Dateinamen sind neutral nummeriert; `import.json` verbindet sie mit der Gmail-Kennung. Die Prüfseite des Beantworters nennt anschliessend diese Quelldateien. Ganze EML-Dateien können Anhänge und vertrauliche Header enthalten; sie werden nur lokal gespeichert, Anhänge vom Beantworter weiterhin nicht ausgewertet oder in Antworten übernommen. Importdateien, Kennungen und Ausgaben niemals ins Repository oder in öffentliche Anzeigen schreiben.

Der Import erzeugt keine Gmail-Entwürfe, ändert keine Labels, markiert nichts als gelesen und versendet nichts. Er ist keine dauerhafte Postfachsynchronisierung und führt kein Senderecht oder Firmenkonto ein. Für einen echten Pilot bleiben freigegebener Exportzugriff, passende Firmen-FAQ, Inhalts-/Empfängerprüfung und Importprüfung im vorgesehenen Mailclient erforderlich. Eine in dieser Sitzung lesbare Verbindung ist keine Kontoverbindung des Programms.

## Kommentar-Beantworter im Entwurfsmodus

```bash
python3 kommentar_antworter.py demo-kommentare.csv /tmp/kommentar-demo --wissen demo-faq.json
```

Eingabe: CSV mit `id,plattform,text`, eindeutige Kennungen, höchstens 5000 Kommentare. Plattformwerte: instagram, facebook, tiktok, youtube, linkedin, pinterest, threads, andere. Ausgabe: eine lokale Prüfseite `index.html`, `antwortentwuerfe.csv` und ein Bericht mit null veröffentlichten Antworten. Die Plattformspalte ist nur eine Zuordnung; keine Plattform-API ist verbunden.

Die FAQ-Datei enthält `faq` mit Einträgen aus `stichwoerter` (Liste) und `antwort`. Für einen Kunden müssen die Demoantworten durch dessen freigegebene Angaben ersetzt werden. Ein eindeutiger Stichworttreffer übernimmt die hinterlegte Antwort. Lob erhält einen kurzen Dank. Unbekannte oder mehrere Fragen bleiben ohne Antwortentwurf; Beschwerden erhalten einen Hinweisentwurf zur privaten Klärung und bleiben manuell zu prüfen. Hinweise auf persönliche Daten sowie Spamverdacht erhalten keine Antwort.

Worterkennung ist keine vollständige Inhaltsmoderation: Sarkasmus, Verneinungen, Mehrsprachigkeit und nicht erkannte persönliche Daten können falsch eingeordnet werden. Vor jeder Veröffentlichung müssen Inhalt, Kontext und Datenschutz geprüft werden. Das Programm veröffentlicht, löscht und versteckt nichts; Antworten und Empfänger sind nicht mit Social-Media-Konten synchronisiert. Für wiederholte Durchläufe kann derselbe lokale Verlauf verwendet werden:

```bash
python3 kommentar_antworter.py demo-kommentare.csv /tmp/kommentar-neu --wissen demo-faq.json --verlauf /tmp/kommentar-verlauf.json
```

Mit `--verlauf` werden bereits vorbereitete Entwürfe bei unverändertem Kommentar, Kennung, Plattform und FAQ nicht erneut erzeugt. Sie stehen als „Bereits vorbereitet“ in der neuen Übersicht; den ursprünglichen Entwurf im vorherigen Ausgabeordner aufbewahren. Das bedeutet weder veröffentlicht noch erledigt. Geänderter Text, geänderte FAQ oder eine geänderte Antwortvorlage erzeugt einen neuen Entwurf. Manuelle Prüffälle bleiben bei jedem Durchlauf sichtbar. Ohne `--verlauf` bleibt jeder Stapel unabhängig.

Der Verlauf enthält SHA-256-Prüfsummen statt Nachrichten oder Kennungen im Klartext und wird nach erfolgreicher Ausgabe atomar gespeichert. Eine Sperrdatei verhindert parallele Zugriffe auf denselben Verlauf. Beschädigte Verläufe werden nicht ersetzt; zurückgebliebene Sperren müssen nach Prüfung des laufenden Prozesses entfernt werden. Pro Betrieb einen eigenen Verlauf im freigegebenen Speicher verwenden und aufbewahren. Die Prüfseite selbst enthält Originalkommentare und Entwürfe und gehört ebenfalls in diesen Speicher. Sie bietet Suche, Statusfilter und eine Kopierhilfe mit manueller Alternative. Der tägliche Projektbau testet diese Funktionen mit Demodaten; Kundeneingänge und Zeitpläne für deren Verarbeitung sind dadurch nicht neu angebunden.

## Wiederkehrende offene Fragen erkennen

Der Kommentar-Arbeiter erstellt zusätzlich `wissensluecken.json`. Mindestens zweimal im selben Stapel vorkommende offene Fragen werden nach Schreibweise und Satzzeichen gruppiert und in der Prüfseite angezeigt, höchstens 100 Gruppen. Das zählt Vorkommen, keine eindeutigen Personen. Bereits beantwortete Fragen, erkannte persönliche Daten, Beschwerden und Spamverdacht kommen nicht in diese Vorschlagsliste. Die Erkennung persönlicher Daten bleibt heuristisch. Neue FAQ-Antworten müssen aus freigegebenem Wissen ergänzt und geprüft werden; das Programm erfindet keine Antworten und veröffentlicht nichts. Die Datei enthält lokale Fragestellungen und gehört in den freigegebenen Betriebsspeicher. Die erweiterten Demokommentare zeigen diesen Ablauf mit erfundenen Beispielen.
