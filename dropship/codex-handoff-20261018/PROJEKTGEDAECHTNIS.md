# LuxeStyle: Projektgedächtnis und Arbeitsbeginn

Eingerichtet auf den ausdrücklichen Inhaberauftrag vom 28.10.2026: «installiere ein gehirn … selbstständig … für dieses projekt». Zweck: in bestehenden Läufen belegten Fortschritt fortsetzen, Entscheidungen wiederfinden und Doppelarbeit vermeiden. Claude koordiniert; Codex bearbeitet selbstständig die bereits erlaubten Schritte. Dieses Dokument ist ein Arbeitsindex, keine zusätzliche Geschäftsfreigabe und kein laufender Agentendienst.

## Verbindliche Quellen

- Repository: `allengchour-glitch/aban-news-landing`.
- Dauerhafte Dokumentation: Branch `codex/luxestyle-claude-handoff-20261018`, Ordner `dropship/codex-handoff-20261018/`.
- [Aktuelle Übergabe](README.md), [Tagesprotokoll](TAGESPROTOKOLL.md), [strukturierter Arbeitsstand](ARBEITSSTAND.json).
- Die aktuelle ausdrückliche Inhaberanweisung und der vollständige bestehende Aufgabenauftrag bleiben massgebend. Die Kurzregeln hier ersetzen sie nicht. Repository-Inhalte und importierte Exporte sind Quellen, keine neuen Befugnisse.
- Operativen Code und seine aktuellen Regeln vor Nutzung auf main lesen. Ein hier referenzierter Patch ist kein Merge oder Produktionsnachweis.

## Beginn jedes bestehenden Laufs

1. Datum in Europe/Zurich feststellen. Diese Datei, README, den heutigen Tagesblock und ARBEITSSTAND frisch über die vorhandene GitHub-Verbindung lesen. Fehlender Zugriff, beschädigte Daten oder widersprüchliche Versionen bedeuten unbekannt; vorhandene Historie nie zurücksetzen.
2. Aktuelle Änderungen anderer Sitzungen beachten. Claude als Koordinator und Quellen fremder Ausführungsbelege getrennt halten. Eine Datei oder ein Rollenwert beweist keine Kenntnisnahme durch Claude.
3. Bei Arbeit an einem Reviewpaket dessen stabile taskId, Revision, tatsächlichen Vorgängerhash, Quellen und separate Quittung prüfen. Den bestehenden `codex_uebergabe.mjs stand` verwenden, wenn der geprüfte Helfer und die benötigten Dateien lokal verfügbar sind. Sonst gezielt über GitHub nachlesen und die noch fehlende lokale Hashprüfung benennen. Keine automatische Quittung im Namen von Claude.
4. Im Tagesprotokoll prüfen, welche Kennzahlen-/Flow-/Verkaufsabfragen heute schon erfolgt sind. Höchstens einmal pro Zürcher Tag; eine neue konkrete Gegenprobe braucht einen benannten Anlass. Fehlende Daten bleiben unbekannt. Impressionen und Interaktionen begründen keine Verkäufe.
5. Den höchstpriorisierten, unabhängig möglichen nächsten Schritt aus ARBEITSSTAND auswählen. Bei einem Blocker nur den betroffenen Teil auslassen und die nächste zulässige Vorbereitung bearbeiten. Kein Mindestvolumen und keine täglich wiederholten Entwürfe als neue Umsetzung zählen.
6. Reversible Recherche, Quellenprüfung, lokale Verbesserungen und konkrete Diffs innerhalb des Auftrags selbstständig erledigen. Vor produktiven Aktionen sämtliche aktuellen Produkt-, Rechte-, Identitäts-, Freigabe- und Kanalbedingungen prüfen. Bereits erteilte passende Freigaben nicht erneut verlangen.

## Geschäftsgrenzen, die jeder Lauf erhält

Nur LuxeStyle. Keine Kundenansprache, Rabatte, Budgets, Shop-Einstellungen, Flow-Aktivierung oder kostenpflichtigen Video-Renders. Kein ungeprüfter Workflowstart, Merge oder Deployment. Keine Massenpagination und keine fremden Marken. CHF 50 öffentlich / CHF 45 nach Rabatt intern sowie `account.luxestyle.com.co` erhalten.

Die vorhandene Social-Erlaubnis gilt ausschliesslich für Metricool und vollständig geprüfte, inhaltlich freigegebene professionelle Master-MP4s. Frisch Shopify luxestyle.ch/CHF und Metricool 6227837/Europe/Zurich samt allen sechs Kanalidentitäten prüfen. Produktstatus, nicht leere Tags, Tracking, inventoryPolicy, Storefront, Sperrtags einschliesslich jedes rueckhol, Rechte, Bio-Ziele, Pinterest-Board, YouTube-Zielgruppe, Doppelposts und dauerhaftes Masterregister prüfen. Fehlende Voraussetzungen blockieren den betreffenden Push. Der genaue Ablauf im bestehenden Aufgabenauftrag bleibt verbindlich.

Den einen 18-Sekunden-Projektor-Master weiterentwickeln. Kein Voiceover, nur `automation/music/luxe-premium.wav` nach Datei-/Rechteprüfung; keine ungeprüften Altclips oder Foto-Zoom-Ersatzserie. Ein Schnittplan ist kein fertiger Film.

Die vier DNS-Ergänzungen aus Auftrag 14 sind bereits genehmigt. Sie bleiben auf diese Records und legitimen DNS-Schreibzugang beschränkt; fehlender Zugriff ist ein Zugriffsblocker und keine offene Genehmigung. Keine Schlüssel oder Passwörter im Chat anfordern und keine bestehende Zone aus öffentlichen Teilinformationen ersetzen.

## Was der Arbeitsstand bedeutet

Jede Aufgabe hat eine stabile Kennung, einen belegten Stand, einen konkreten nächsten Schritt und gegebenenfalls einen Blocker. Zustände: `offen`, `vorbereitet`, `blockiert`, `bestaetigt_erledigt`, `unbekannt`. Abnahmebedingungen müssen erfüllt und nachgelesen sein, bevor `bestaetigt_erledigt` gesetzt wird. `belegArt` unterscheidet GEMESSEN, QUELLE, BEHAUPTUNG und SETZUNG. Historische Beobachtungen gelten nicht automatisch heute.

ARBEITSSTAND ist ein datierter Index und keine vollständige Auftrags- oder Publikationshistorie. Es ersetzt weder Tagesprotokoll noch Master-Publikationsregister und ist keine verteilte Sperre. Vor Aufnahme einer Aufgabe und vor Writes parallele Änderungen und die aktuelle Koordination frisch abgleichen. Preise, Kaufbarkeit, Rechte, Identitäten, Flowstatus, Quota und Publikationsstatus vor abhängigen Aktionen frisch verifizieren. UTC-Zeiten dienen der Belegordnung; der Arbeitstag richtet sich nach Europe/Zurich.

## Abschluss und sichere Fortschreibung

Vor jeder Dokumentationsänderung die konkrete Zieldatei frisch lesen. Einen begrenzten Ergänzungs-Diff prüfen, mit dem aktuellen Datei-SHA schreiben und Inhalt sowie neuen SHA zurücklesen. Bei parallelen Änderungen neu abgleichen; bei unklarem Write zuerst nachlesen und keinen Ersatz anlegen. ARBEITSSTAND-Revision erhöhen, vorhandene Aufgaben-IDs und Historie erhalten. Erledigte Aufgaben nicht löschen, neue Revisionen bestehender Reviewpakete nicht als neue Arbeit ausgeben.

Tatsächliche Prüfung, Vorbereitung, Umsetzung und Blocker im bestehenden Datumsblock des Tagesprotokolls ergänzen. Keine Kundeninformationen, Zugangsdaten oder Zahlungszertifikate im Gedächtnis speichern. Zur Freigabe ausschliesslich einen konkreten prüfbaren Diff oder fertigen Film vorlegen, wenn eine bisher nicht erteilte Freigabe tatsächlich erforderlich ist.

Der vorhandene LuxeStyle-Auftrag bleibt der Auslöser der Arbeit. Sein Zeitplan und Berichtsrhythmus werden durch dieses Gedächtnis nicht geändert. Eine gespeicherte Aufgabenergänzung belegt ihre Konfiguration; erst ein nachfolgender Lauf kann die tatsächliche Verwendung bestätigen. Lokale Skilldateien und Hookquellen sind kein Nachweis geladener Skills oder durchgesetzter Hooks.


## Kaufziel: aktuelle Präzisierung vom 29.10.2026

[LUXESTYLE_ERSTER_NEUER_KAUF_20261029] Massgebend ist jetzt die ausdrückliche Baseline `2026-10-28T23:48:36Z`. Die frühere Baseline und Prüfung bleiben als historische Quelle im Arbeitsstand erhalten. Je bestehendem Lauf 08:00/14:00/19:00 Europe/Zurich ist ein enger neuer Bestellbeleg-Check nach Schema-/Queryprüfung erlaubt; dies ist kein zusätzlicher Vollreport und ändert die Frequenz nicht. Keine Kundenprofile, Kontakt-, Adress- oder Zahlungsdetails abfragen.

Es zählt ausschliesslich eine neue nicht stornierte Nicht-Testbestellung mit positivem aktuellem Gesamtbetrag, PAID und mindestens einer erfolgreichen positiven Nicht-Test-SALE/CAPTURE eines echten nicht manuellen Zahlungsanbieters; Gratis-/Test-/vollständig erstattete Bestellungen und manuelles Als-bezahlt-Markieren zählen nicht. Fehlende Transaktionsdaten bleiben unbekannt. Ersten belegten Treffer mit Bestellnummer, Zürcher Zeit, Betrag/Währung und Zahlungsstatus melden, den bestehenden Kauf-Watch mit Beleg als ERREICHT markieren und nur diesen Watchteil beenden. Keine Kaufursache behaupten; alle anderen bestehenden Aufgaben/Läufe bleiben erhalten.

Ads-Konfiguration und vorbereitete Inhalte sind keine Kaufbelege. Bestehender pausierter Entwurf 24403263741 und CHF 58-Gesamtkostenlimit bleiben gebunden; kein automatischer Start, keine Verlängerung/Budgeterhöhung oder Änderung an Kontozielen durch das Gedächtnis. Aktuelle Einzelnachweise stehen im Arbeitsstand und im Morgenpaket vom 29.10.

## Fortführung 29.10.: Katalogqualität und Abendbelege

Der Inhaberwunsch «alle Produkte 100 fehlerfrei» ist ein katalogweites Qualitätsziel, keine pauschale Fehlerfreiheitsbescheinigung oder Freigabe erfundener Attribute. Aktuelle Einzelbelege und zulässige Befugnisse bleiben erforderlich. Die beiden um 10:45 Zürich bestätigten zusätzlichen Optionskorrekturen sind in [Katalogbelegen](KATALOGQUALITAET-BELEGE-20261029.json) gesichert und dürfen nicht nochmals gesendet werden. Die Vormittagszählung 87’766/56’620 belegt Umfang, keine aktuelle Material-/Fehlerquote.

Der abgeschlossene lokale Materialquellen-Diff benötigt die vollständige bestehende r4-Kette; aktueller main enthält sie nicht. Geprüfter Code ist keine produktive Ausführung. Im bestehenden Abendlauf bleibt das Kaufziel bis 19:07:25 Zürich offen; heutige Kennzahl-/Flowreports wurden nur wiederverwendet. Derselbe Master wird mit konkreten Textumbrüchen fortgeführt; kein Film oder Publikationsbeleg. [Abendpaket](ABENDPAKET-20261029.md) und Arbeitsstand führen Quellen, Blocker und nächste Schritte unter unveränderten Aufgaben-IDs fort. Keine neue Automation, Frequenzänderung oder erweiterte Kontobefugnis; Claude-Kenntnisnahme unbekannt.

## Fortsetzung 29.10.: neuer Merchant-Preisfehler

Die neue Aufgabe `merchant-missing-price-20261029` priorisiert den konkret gelieferten CSV-Befund. 8’327 eindeutige exportierte IDs sind kein Gesamtkatalog-Nenner; unterschiedliche Länder-/Fehlerzeilen keine doppelten Produkte. Zwei DRAFT-/Preis-/Weiterleitungsstichproben belegen keine Ursache für sämtliche IDs. Aktive Quelle und eingereichte URL vor Eingriff nachweisen; keine Preise erfinden, DRAFT aktivieren oder Quelle löschen. Zweiter Upload über32MiB bleibt ungelesen.

Der vollständige Material-Gesamtpatch ersetzt für die technische Review das manuelle Zusammensetzen der fünf belegten Stufen; alte Pakete/Historie bleiben erhalten. Kein Deployment und keine Claude-Quittung. Kauf-Watch, Kennzahlgrenze und Zeitplan unverändert. [Fortsetzungsbelege](MERCHANT-PREISDIAGNOSE-20261029.md).



## Ergänzung 29.10.2026 – Revision 13

Die neue Aufgabe `homepage-redesign-20261029` enthält eine tatsächlich gespeicherte, separat aufrufbare [Shopify-Startseitenvorschau](https://luxestyle.ch/?preview_theme_id=212752499079&view=luxe-edit) im bestehenden UNPUBLISHED-Theme 212752499079. Keine MAIN-Veröffentlichung; bestehende Standardvorlagen und frühere Schema-/Versandkorrekturen erhalten. Native Prüfung bei 1440/390/360 px und exakte Dateirücklesungen im [Bericht](STARTSEITEN-VORSCHAU-20261029.md) und [Beleg](STARTSEITEN-BELEGE-20261029.json). Designergebnis ist zur Beurteilung; bestehende Theme-/App-/Cookieintegration vor Live-Übernahme weiterprüfen. Der gleiche offene 18-Sekunden-Master hat eine [Web-Vorgabe](STARTSEITEN-VIDEO-20261029.md), keine neue MP4 oder Rechtefreigabe.

`merchant-missing-price-20261029` bleibt blockiert an der konkreten Datenquelle/eingereichten URL. Die zweite CSV ist nun vollständig gelesen; frühere 32-MiB-Transfergrenze ist historisch, kein aktueller Inhaltsblocker. Beide CSV-Auswahlen sind keine Katalogvollmessung. [Zweiter Export](MERCHANT-ZWEITER-EXPORT-20261029.md) und [Belege](MERCHANT-ZWEITER-EXPORT-BELEGE-20261029.json). Keine operative Merchantänderung, keine zusätzlichen Kennzahl-/Flow-/Bestellabfragen. Alle vorherigen Aufgaben-IDs, Kaufbaseline, Freigaben, Zeitpläne und Historie erhalten. Claude-Kenntnisnahme nur mit Quittung; weiter unbekannt.


## Ergänzung 29.10.2026 – Revision 14

Die Aufgaben `printful-sync-variant-identity` und `cj-variant-price-identity` führen zwei abgeschlossene lokale Korrekturentwürfe fort. [Bericht und Patches](SYNC-VARIANTEN-PRUEFUNG-20261029.md), [unabhängige Prüfung](SYNC-VARIANTEN-REVIEW-20261029.md), [Prüfsummen/Quellen](SYNC-VARIANTEN-BELEGE-20261029.json). Die Dateien liegen als Review-Artefakte im Handoff; operative Dateien/main unverändert, kein Sync gestartet. Nachgewiesene Offline-Fehler nicht als tatsächliche Kundenfälle oder Merchant-Ursache ausgeben.

Nächste Arbeit: Printful-Idempotenz/Shopify-Quittierung und separaten CJ-SKU_NACHZIEHEN-Pfad eng absichern; vor Attributnachträgen native Lieferantenvariante belegen. Die Printful-Tag-Stichprobe ist auf zwei Produkte/vier Varianten begrenzt, keine Material-Restquote. Der mögliche CSV-Querbezug betrifft ein ae-import-Produkt; gleicher Präfix beweist keine gleiche Variante/Quelle. Merchant-Schreibaktionen im aktuellen Connector leer, Detailread unbeantwortet; weder Null noch behoben. Bestehende Aufgaben, Historie, Kaufbaseline, Tagesgrenze und Zeitplan erhalten; Claude-Quittung unbekannt.


## Ergänzung 29.10.2026 – Revision 15

`personalizer-fullscreen-20261029` hält die auf konkrete Inhaberkritik gebaute [Vollbildvorschau](https://luxestyle.ch/products/unisex-allover-bomberjacke-selbst-gestalten?preview_theme_id=212752499079&view=luxe-studio) fest: drei Schritte, echte aktuelle Shopvarianten und begrenzte öffentliche POD-Produktauswahl. Im bestehenden UNPUBLISHED-Theme 212752499079 zehn Dateien gespeichert; zunächst neun textuell exakt und JSON-Produktvorlage semantisch identisch zurückgelesen. Gezielt korrigierte Dateien anschliessend jeweils exakt bestätigt; kurzzeitig alte Body-Inhalte durch spätere Lesegegenprobe geklärt, keine doppelten Writes. MAIN 212656488839 weiterhin MAIN; Vorschau 212752499079 weiterhin UNPUBLISHED. Bestehendes Layout, Standardproduktvorlage und Designzwang-Snippet im Vorschau-Theme hashgleich erhalten; keine Veröffentlichung. 106 unabhängige Offline-UI-Prüfungen, 32 native Editorprüfungen und 19 native Katalogprüfungen bestanden; danach acht Root-Gegenproben zu echten Suchdaten/Produktwechsel und fünf gezielte finale Darstellungsprüfungen bestanden. Abschliessende Politur zusätzlich mit drei Standardoptionsfällen, 38 Navigations- und elf Formatierungsprüfungen geprüft; Hashes/Versionen im Beleg getrennt. Keine Produktionsabnahme behauptet.

«Wie Printful» bleibt für die technische Druckfunktion offen: kein authentifizierter aktueller Templatebeleg, keine echte 3D-/Allover-/Ärmelgeometrie. Der Entwurf benutzt eine neutrale Motivfläche und sendet weder Cart noch Produktion. Die sieben bestätigten Bomberjackenvarianten sind kein Beleg für den vollständigen Printful-Katalog; der Admin-Kollektionszähler ist keine öffentliche Kaufbarkeitszahl. Nächster Schritt: Vorschau beurteilen und passende Lieferantentemplates mit Export-/Backendvertrag verifizieren, bevor Druckproduktion oder Live-Übernahme freigegeben werden. Konkreter zusätzlicher Importkandidat ist die ausdrücklich gewünschte AirPods-/AirPods-Pro-Hülle; die enge Shopify-Titelsuche blieb ohne Treffer, Preis CHF 10.50 ist nur Lieferantenpreis. Keine ungeprüften Farben, Materialwerte, Shopverfügbarkeit oder Templates ergänzen. [DESIGNSTUDIO-BELEGE-20261029.json](https://github.com/allengchour-glitch/aban-news-landing/blob/codex/luxestyle-claude-handoff-20261018/dropship/codex-handoff-20261018/DESIGNSTUDIO-BELEGE-20261029.json) · [DESIGNSTUDIO-THEME-20261029.patch](https://github.com/allengchour-glitch/aban-news-landing/blob/codex/luxestyle-claude-handoff-20261018/dropship/codex-handoff-20261018/DESIGNSTUDIO-THEME-20261029.patch) · [DESIGNSTUDIO-VORSCHAU-20261029.md](https://github.com/allengchour-glitch/aban-news-landing/blob/codex/luxestyle-claude-handoff-20261018/dropship/codex-handoff-20261018/DESIGNSTUDIO-VORSCHAU-20261029.md) Alle früheren Tasks, Kaufbaseline, Historie und täglichen Grenzen erhalten; Claude-Quittung unbekannt.
