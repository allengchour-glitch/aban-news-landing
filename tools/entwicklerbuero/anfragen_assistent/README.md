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

Öffne `index.html` im Browser, auch auf dem Handy. Die Seite zeigt ursprünglichen Text und Antwortentwurf, sucht nach Inhalt oder Empfänger und filtert übersprungene Nachrichten. Mit „Antwort kopieren“ übernimmst du den Text ins Mailprogramm; ohne Zwischenablage-Zugriff wird der Text zur manuellen Kopie ausgewählt. „EML herunterladen“ öffnet beziehungsweise speichert den unveränderten Entwurf. Die Prüfseite ist schreibgeschützt, funktioniert ohne externe Dienste und enthält lokale Nachrichten: im freigegebenen Speicher behalten. Es gibt keine Versandfunktion und keine gespeicherten Freigaben.

Text-Mails und einfache HTML-Mails werden unterstützt; Anhänge werden nicht gelesen oder kopiert. Newsletter, Zustellberichte, automatische Antworten, eigene Absender und No-Reply-Adressen werden ausgesondert. Mehrere oder unklare Antwortadressen gehen in die manuelle Prüfung. Die Erkennung ist heuristisch und ersetzt keine Prüfung der Empfänger oder des Inhalts. Doppelte Message-IDs werden innerhalb eines Stapels ausgesondert; es gibt noch keine dauerhafte Postfach-Synchronisierung.

Die Entwürfe nutzen weiterhin feste Vorlagen. Eine kontextbezogene KI-Antwort, die verbindliche Firmendaten, vollständige Mailverläufe oder Anhänge versteht, ist noch nicht angebunden. Die Gmail-/Outlook-Anbindung ist offen; Zugangsdaten gehören nicht in das Repository oder in den Chat.

## Kommentar-Beantworter im Entwurfsmodus

```bash
python3 kommentar_antworter.py demo-kommentare.csv /tmp/kommentar-demo --wissen demo-faq.json
```

Eingabe: CSV mit `id,plattform,text`, eindeutige Kennungen, höchstens 5000 Kommentare. Plattformwerte: instagram, facebook, tiktok, youtube, linkedin, pinterest, threads, andere. Ausgabe: `antwortentwuerfe.csv` und ein Bericht mit null veröffentlichten Antworten. Die Plattformspalte ist nur eine Zuordnung; keine Plattform-API ist verbunden.

Die FAQ-Datei enthält `faq` mit Einträgen aus `stichwoerter` (Liste) und `antwort`. Für einen Kunden müssen die Demoantworten durch dessen freigegebene Angaben ersetzt werden. Ein eindeutiger Stichworttreffer übernimmt die hinterlegte Antwort. Lob erhält einen kurzen Dank. Unbekannte oder mehrere Fragen bleiben ohne Antwortentwurf; Beschwerden erhalten einen Hinweisentwurf zur privaten Klärung und bleiben manuell zu prüfen. Hinweise auf persönliche Daten sowie Spamverdacht erhalten keine Antwort.

Worterkennung ist keine vollständige Inhaltsmoderation: Sarkasmus, Verneinungen, Mehrsprachigkeit und nicht erkannte persönliche Daten können falsch eingeordnet werden. Vor jeder Veröffentlichung müssen Inhalt, Kontext und Datenschutz geprüft werden. Das Programm veröffentlicht, löscht und versteckt nichts; Antworten und Empfänger sind nicht mit Social-Media-Konten synchronisiert. Es gibt keine automatische dauerhafte Entdoppelung über mehrere CSV-Dateien hinweg.
