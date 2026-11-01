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


## Ergänzung 30.10.2026 – Revision 16

Nur unbedruckte Basisprodukte werden für die Gestaltung vorbereitet. Die geprüfte Ausgangskollektion enthält 32 Produkte; 31 erfüllen den positiven Blanko-/POD-Vertrag. Ein Bügeltransfer ohne POD-Zuordnung ist ausgeschlossen. Fünf bestehende Unterkategorien sind gegen diese Auswahl geprüft. Farb-/Grössennamen stammen aus tatsächlichen Varianten; drei Quellenfarbwerte sind für 15 gemappte T-Shirt-Varianten hinterlegt. Keine erfundenen Materialoptionen und keine fremden Standardmotive.

Im bestehenden UNPUBLISHED-Theme 212752499079 sind 15 Dateien nativ gespeichert, 14 textuell exakt und eine JSON-Vorlage semantisch identisch zurückgelesen. Drei geschützte Dateien sind hashgleich erhalten; 18 Rückleseprüfungen bestanden. MAIN 212656488839 bleibt MAIN, 212752499079 bleibt UNPUBLISHED; keine Veröffentlichung. 37 neue funktionale native Prüfungen bestanden: 19 Katalog und 18 Kategorie, ohne historische r15-Tests mitzuzählen. Pickerseiten 11/12/8 ergeben 31 eindeutige Produkte, Kategorieseiten 12/12/7. Drei echte Hero-Bilder geladen, 31 Karten, zunächst 12 sichtbar; 1440px und 390px ohne horizontalen Überlauf geprüft. Desktop- und geöffnetes Mobilmenü führen zur eigenen Kategorie; 23 Samsung-Modelle sind ausklappbar. Read-only-Browsertests blockierten Nicht-GET-Analyseaufrufe und protokollierten dabei Failed-to-fetch-Meldungen; keine globale Fehlerfreiheits- oder Produktionsabnahmebehauptung. Die tatsächliche Navy/2XL-Variante wird gewählt und beim Schrittwechsel erhalten. Ein passendes aktuelles Navy-Variantenfoto ist nicht belegt; das weisse allgemeine Referenzfoto ist keine farbgetreue Navy-Vorschau. [Geprüfte Kategorievorschau](https://luxestyle.ch/collections/selbst-gestalten-1?preview_theme_id=212752499079&view=luxe-gestalten).

Am 29.10. öffentlich gelesener Printful-Katalog: 571 Original-Stammsätze, davon Detaildaten für Modell 71 mit 628 Varianten/84 Farben und Modell 390 mit sieben Varianten. Das ist weder ein 571-Produkte-Shopangebot noch eine Retail-/CH-Versandfreigabe. Die API-Antworten enthalten kein ACAO; direkte Browserabfragen sind daher nicht als Anbindung bestätigt. Offizielle Template-/Printfile-GETs für 390 ergeben 401, keine belastbare Druckgeometrie.

Der Inhaber hat Printful EDM für luxestyle.ch ausdrücklich als freigeschaltet bestätigt. Diese Angabe ersetzt keine technische Token-/Serverprüfung, verlangt aber keine erneute Freischaltungsfrage. Die lokale offizielle EDM-Integrationsvorbereitung ist mit 11 isolierten Offlineprüfungen geprüft; kein Originaleditor oder Bestellfluss ist dadurch live. Inhaber beurteilt die geprüfte Kategorievorschau. Passende echte Variantenbilder für Navy und weitere Varianten belegen; danach die bereits vom Inhaber bestätigte EDM-Freischaltung über legitime serverseitige Token-/Noncebindung und variantengenaue Templates technisch verifizieren. Keine erneute Freischaltungsfrage, keine automatische Live-Publikation, Cart-/Produktionsanbindung oder Übernahme von Supplierpreisen.

Die bestehende Aufgabe `personalizer-fullscreen-20261029` wird fortgeführt. Alle 16 Aufgaben-IDs, historischen Belege, Kaufziel, tägliche Abfragegrenze und bestehender Zeitplan bleiben erhalten. Keine zusätzliche Kennzahl-/Flow-/Bestellabfrage, kein Kauf erzeugt und keine Kenntnisnahme durch Claude behauptet. Die folgenden vier Reviewartefakte sind im Handoff erstellt und exakt zurückgelesen; Datei-SHAs und URLs stehen im Arbeitsstand: [BLANK-KATALOG-20261030.md](BLANK-KATALOG-20261030.md) · [BLANK-KATALOG-BELEGE-20261030.json](BLANK-KATALOG-BELEGE-20261030.json) · [BLANK-KATALOG-THEME-20261030.patch](BLANK-KATALOG-THEME-20261030.patch) · [PRINTFUL-EDM-VORBEREITUNG-20261030.patch](PRINTFUL-EDM-VORBEREITUNG-20261030.patch)

## 01.11.2026 – Kaufziel erreicht, bestehender Master weitergeführt

[Content- und Verkaufs-Paket](LAUFPAKET-20261101.md) · [Belege](LAUFBELEGE-20261101.json) · [unabhängige Prüfung](LAUFREVIEW-20261101.md).

Frisch passender Shop und Metricool-Marke. Erster qualifizierender neuer Kauf **#1032**, 30.10.2026 **22:00:11 Europe/Zurich**, **CHF 31.80**, **PAID** und erfolgreiche positive Nicht-Test-SALE über Shopify Payments; nicht storniert oder erstattet. Baselinefenster bis 31.10.23:46:17Z vollständig gelesen, zwei neue qualifizierende Bestellungen. Keine Ads-/Codex-Verursachung. Der Kauf-Watch in der bestehenden Aufgabe ist mit #1032 als **ERREICHT** gespeichert und exakt zurückgelesen. Nur diesen Watchteil beendet: keine weiteren Watchabfragen und keine Wiederholungsmeldung desselben Treffers. Alle übrigen Aufgaben, 08:00/14:00/19:00 Europe/Zurich und Aktivierung erhalten. Frühere OFFEN-Angaben und Prüfregeln sind historisch, die frühere Aufforderung zu einem Kaufcheck je Lauf gilt nicht mehr.

Einmalige Metricool-/Klaviyo-Reports für 25.–31.10. am Zürcher 01.11. gelesen. Social-Wochenwerte bleiben wegen fehlender Tage unbekannt; Welcome liefert 3 Zustellungen und 1 eindeutigen Klick, explizit 0 dieser Nachricht zugeschriebene Conversions. Das widerlegt keine Shopkäufe; Einzelauftrags-Sync mangels datensparsamer Order-ID-Auswahl unbekannt. Recovery ist live, alter Abbruchflow bleibt draft. Acht bestehende Metricool-Planobjekte mit 15 PENDING-Kanalzuständen gelesen; keine exakten Doppel im begrenzten Fenster, keine eigene Publikation oder Terminierung.

Derselbe Master `luxe_sternenprojektor_master_20261018` hat einen lokalen Originaltake-/Varianten-/Hash-/Rechtenachweisprüfer, 14 synthetische Prüfungen bestanden. [Reviewpatch](MASTER-ORIGINALTAKE-PRUEFUNG-20261101.patch). Kein fertiger Film, keine Rechte-/Qualitätsfreigabe, keine operative Integration. Projektor CHF 34.90 kaufbar, Pyjama mit rueckhol-Socialsperre. Auto-Tagging neu True; Kampagne 24403263741 weiterhin PAUSED, CHF 58 Gesamtlaufzeitbudget und Enddatum 05.11. erhalten; kampagnenspezifische Kaufziele offen.

Genau ein [Welcome-Service-Diff](WELCOME-SERVICE-20261101.diff) bleibt zur Freigabe: zwei Zeilen, Policyverweise statt pauschaler Zusagen, keine Flowaktivierung oder Nachricht. Derselbe Entwurf vom 29.10. wurde an aktueller Vorlage und erreichbaren Policies gegengeprüft. Die vier DNS-Ergänzungen sind bereits genehmigt; öffentliche Recordstichprobe weiterhin ohne erwartete Einträge, Sending-Domain pending, kein authentifizierter Schreibzugang. Keine erneute Genehmigungsfrage.

Arbeitsstand Revision 17 erhält alle 16 Aufgaben-IDs und die vollständige Historie. Andere Shop-/Designstudio-/Merchant-/Codeaufgaben bleiben unverändert offen; dieser Lauf veröffentlicht kein Theme. Claude-Kenntnisnahme bleibt unbekannt. Nächste Arbeit: passende native Originaltakes und Rechte prüfen, konkreten Welcome-Diff beurteilen und den nativen Ads-Kaufzielbeleg beschaffen; keine Wiederholung des erfüllten Kauf-Watchs.




## 01.11.2026 – Selbst gestalten, Bewertungen und mobile Website fortgeführt

Die ausdrücklichen Inhaberaufträge «online stellen», «mache autonom weiter», vollständige Printful-Produkte und Varianten, Merchant-Fix und mobile Gestaltung sind massgebend. Ältere Hinweise, erst erneut eine Veröffentlichungsgenehmigung einzuholen, sind für diesen konkreten Umfang überholt. Die technische Grenze bleibt: Der verbundene Shopify-Zugang blockiert MAIN-Dateiwrites und Theme-Publikation; Vorschau 212752499079 ist weiterhin UNPUBLISHED, MAIN 212656488839 unverändert.

572 Lieferantenmodelle / 13’160 Originalvarianten / 177 Kategorien als vollständige Quellenreferenz in der Vorschau; 52 Datenassets nativ bestätigt. Echte Farb-, Grössen- und Materialwahl sowie Bilder; aktuelle CHF-Preise aus 31 Blankprodukten / 309 Shopvarianten, 7 mehrfach belegte IDs mit expliziter Angebotswahl. Alle 31 haben bestätigt 0 Bewertungen: «Noch keine Bewertungen»; spätere echte Sterne und Anzahl dynamisch, unbekannte Werte verborgen. Suchkonflikt «tasse» unter T-Shirts mit bewusst wählbarer globaler Suche lösbar, &amp;-Anzeige korrigiert. Quellenwiderspruch beim Material mit 102% kenntlich gemacht; keine erfundene Korrektur. Mobile Startseite im Stil der App mit echten Preisen und Zielen weiterentwickelt. Inline-Editor in der Vorschau gegen fehlerhafte Uploads und Variantenwahl abgesichert; 6 native Fälle mit simulierten POSTs, keine echte Bestellung.

Kein vollständig kaufbarer Shop mit 572 Produkten behauptet: kontrollierter POD-Bulk-Read mit 492 Rootprodukten / 2146 Objekten COMPLETED (Job 12890114032007), aber Exportlinks vom Connector blockiert; ganze SKU-Matrix unbekannt. CH-Versand- und Technikkosten, Original-EDM-Laufzeit und alle Druckstellenübergaben fehlen; 57 Varianten über dem bisherigen Preisdeckel erhalten. Keine neuen Produkte oder Varianten und keine Shoppreisänderungen.

Neuere Merchant-CSV mit 53’333 IDs mit fehlendem Preis; beide Dateien vollständig geprüft. 18 exakte positive CHF-Kandidaten vorbereitet, kein Feedwrite. Quelle nach MCP-Timeout unbekannt, Connector ohne Schreibaktion. Das ist ein technischer Blocker, keine fehlende erneute Freigabe.

[Arbeitsbericht](SELBSTGESTALTEN-WEBSITE-20261101.md) · [Belege](SELBSTGESTALTEN-BELEGE-20261101.json) · [Theme-Diff](SELBSTGESTALTEN-THEME-20261101.patch) · [Importabgleich](SELBSTGESTALTEN-IMPORT-20261101.md) · [Merchant](MERCHANT-PREISPRUEFUNG-20261101.md).

Alle 16 Aufgaben-IDs und Historien erhalten. Kaufziel weiterhin ERREICHT, kein weiterer Watch-Check; Tageskennzahlen und Flows nicht wiederholt. Keine weitere Automation, Zeitplan-, Budget-, DNS- oder Flowänderung, Kundenansprache oder Social-Publikation. Versandgrenzen CHF 50 / CHF 45 und Kundendomäne erhalten. Claude-Kenntnisnahme unbekannt.


## 01.11.2026 – Zentimeter und bisherige Titelbilder

Auf «zoll in cm und die titelbiöd wie vorher» die expliziten Zollmasse für die Anzeige in cm umgerechnet (1 Zoll = 2,54 cm). Bestehende cm-/mm-Angaben haben Vorrang; Varianten-IDs, rohe Filterwerte, Zuordnungen und Preise bleiben erhalten. Beispiel: 8″ × 10″ → 20,32 × 25,4 cm; 22–23″ → 55,88–58,42 cm. Volumenangaben und Konfektionsgrössen nicht als Zoll behandelt.

Die belegte frühere Titelbild-Collage aus T-Shirt, Jutebeutel und Tasse ist wieder im Selbstgestalten-Kopf. Vier Dateien im UNPUBLISHED-Theme 212752499079 gespeichert und abschliessend exakt zurückgelesen. 27 gezielte native Browserprüfungen bestanden; Mobil/Desktop, Originalvariante, drei Bilder, Bewertungen und Vorschau-Navigation geprüft. Shopify-Validierung mit bestehenden offiziellen Schemas aus dem Cache grün. CDN-Minifizierung und Admin-Quelltext haben getrennte Hashbelege. Ein anfänglich veralteter API-Body wurde durch frische Lesegegenprobe geklärt, ohne blinden erneuten Write.

MAIN 212656488839 unverändert und weiterhin technisch nicht über diesen Connector veröffentlichbar. Keine neue Produkt-, Preis-, Feed- oder Bestelländerung; keine weitere Tageskennzahl-/Flow-/Kauf-Watch-Abfrage. Der vollständige Bestell-/EDM-Status wird dadurch nicht als fertig bezeichnet. [Bericht](SELBSTGESTALTEN-CM-TITELBILDER-20261101.md) · [Belege](SELBSTGESTALTEN-CM-TITELBILDER-BELEGE-20261101.json) · [Diff](SELBSTGESTALTEN-CM-TITELBILDER-20261101.patch).
