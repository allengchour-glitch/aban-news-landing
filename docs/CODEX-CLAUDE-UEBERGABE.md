# Codex → Claude: verbindlicher Lesestand · 08.11.2026, Fortsetzung 21:00 Schweizer Zeit

Diese Übergabe enthält nur belegte Arbeit und ausdrücklich bezeichnete Grenzen. Finanz- und Kundendaten bleiben ausserhalb des Repositories. QUELLE bedeutet: aus dem genannten Beleg übernommen, nicht in dieser Übergabe erneut live gemessen.

## Inhabervorgabe: Routinearbeit gehört zum Assistenten

Der Inhaber hat am08.11.2026 ausdrücklich klargestellt: «ich erledige nichts, das solltest du machen nachher». Die acht Konto-Verknüpfungen im bisherigen Bereich «Kurz erledigen» sind keine manuellen Inhaberaufträge. Routineprüfungen mit vorhandenen Zugängen/Freigaben übernimmt der Assistent im beauftragten Arbeitslauf. Bei echten Zugriffshürden unabhängig mögliche Arbeit fortsetzen; nur notwendige Entscheidungen konkret benennen. Keine zusätzliche Freigabe für Kundennachrichten, Veröffentlichung, Zahlungen, Preis/Budget, Konten, DNS oder Secrets daraus ableiten.

- Umsetzung auf Branch `codex/buero-assistentenarbeit`: Überschrift «Arbeitsübersicht des Assistenten», ausdrückliche Zuständigkeit, Konto-Verknüpfungen in zunächst geschlossenem Bereich «Konten und Quellen ansehen (optional)». Imperative Navigationsbeschriftungen durch Quellenbezeichnungen ersetzt. Finanzmonitor bleibt vor den optionalen Quellen zugänglich, seine manuelle Kalkulation startet eingeklappt. Gewählte Aufklappzustände bleiben beim Neuzeichnen erhalten. Keine neue Rolle, neue Automation oder Frequenzänderung.
- **GEMESSEN:** 66 Büro- und25 Entwicklerprüfungen lokal grün; Desktop1440×1000 und Handy390×844 geprüft: acht Quellen anfangs verborgen, Finanzmonitor erhalten, optionales Öffnen/Schliessen und Neuzeichnen funktionieren. Keine Konto-Verknüpfung im Test geöffnet. Quelle und öffentliche HTML-Datei gleich geändert.
- Diese Oberfläche startet keinen laufenden KI-Dienst und beweist keine bereits ausgeführten Kontoaufgaben. Finanzielle Wirkung nicht gemessen. Aktuellen Merge-/Deploystand über den Branch und zugehörigen PR prüfen. Lokaler Browserbeleg: `/workspace/buero-assistentenarbeit-nachweis/lokal.json`.
- Vorheriger Downloadauftrag **abgeschlossen**: PR2981 als `93f93e4acc674bed6cf45deabd8489fc98280e53` übernommen; Produktionslauf42509488776 erfolgreich. Sichere Live-Gegenprobe nach Deploy mit derselben ungültigen Kennung/User-Agent wie vorher: HTTP400/«Ungültige Session», kein Download-Link. Keine echte Zahlung, Stripe-Abfrage oder geschützter Download ausgelöst. Lokaler Beleg: `/workspace/download-bereitschaft-20261108/live-after.json`. Bezahlter Live-Download weiterhin nicht durch einen echten Kauf verifiziert.

## Weiterarbeit: Stripe-Zuordnung und vollständiger Paketbau

- **GEMESSEN, 08.11.2026:** Stripe-Plugin ist für das bestehende Livekonto Abannews lesend erreichbar. Aktive Produkte vollständig ohne weitere Ergebnisseite gelesen; bekannte öffentliche Shop-Produkt-IDs stimmen mit dem verbundenen Konto überein. Keine Kunden-/Zahlungs-/Abo-Daten abgefragt, keine Stripe-Objekte angelegt oder geändert. Konto-ID und Rohdaten bleiben ausserhalb des Repositories.
- Audit-Workbook weiterhin **nicht direkt aktivierbar**: weder exakte Slug-Suche noch Audit-/Workbook-Namenssuche oder vollständiger aktiver Produktabgleich liefern eine eindeutig eigene Workbook-Zuordnung. Der Monitor ist ein anderes Produkt. Verkaufsseite nennt29 EUR, Katalog `ki-sichtbarkeit-audit`29 CHF; Preis-/Währungsentscheidung nicht belegt. Nicht eigenmächtig korrigieren oder einen fremden Payment-Link einsetzen. Für vollständige Freischaltung müssen eigenes Produkt, Preis/Währung, Lieferung und signaturgeprüfte Erfüllungs-Webhooks (auch asynchrone Zahlung) verifiziert werden; ein Rückleitungslink allein ist kein vollständiger Erfüllungsnachweis.
- **GEMESSEN:** Unabhängigen Lieferfehler mit erfundenen Dateien reproduziert: `build_kit_zips.main()` meldete trotz Paketfehler Exit0 und löschte vorher vorhandene Test-ZIPs. `build-pages.sh` verschluckte zudem Fehler des Kit-Baus. Der letzte reale Produktionslauf42510504284 baute laut bereinigtem Log54 von54 Katalogpaketen ohne Kit-Warnung; kein tatsächlich betroffener Kunde und kein finanzieller Schaden nachgewiesen.
- Korrektur auf Branch `codex/audit-kaufweg`: erst DE/EN-Pakete in temporärem, öffentlich ausgeschlossenem `automation/`-Arbeitsordner bauen; nichtleere ZIPs samt CRC prüfen; doppelte Slugs und unvollständige/fehlende Kataloge abweisen. Erst danach Dateien übernehmen und alte Salt-Dateien entfernen. Paketfehler lassen vorhandene ZIPs unangetastet. Fehler bei der Übernahme brechen ebenfalls ab; eine vollständige lokale Rücksetzung nach I/O-Fehler ist nicht zugesichert. Der öffentliche Stand bleibt erhalten, weil `build-pages.sh` nun den Fehler weitergibt und der reguläre Uploadschritt keinen `always()`-Override hat. Ohne Salt weiterhin no-op.
- **GEMESSEN:**13 neue Paket-/Shell-Gegenproben,13 bestehende Audit- und66 Büroprüfungen lokal grün (92). Zwei absichtliche Mutanten erkannt. Echter privater lokaler Audit-Workbook-Bau erfolgreich:1 Paket/3 Dateien, CRC gültig, Modellzugriff ausdrücklich gesperrt, erzeugte Schutzdateien anschliessend gelöscht. Keine echte Zahlung und kein geschützter Netzwerkdownload. Nichtprivater lokaler Beleg: `/workspace/audit-kaufweg-nachweis/privater-workbook-bau.json`.
- Lokale CI-Simulation erneut am schreibgeschützten HOME blockiert; kein bestandenes CI daraus ableiten. Neue Tests laufen im **bestehenden** Quality-Check; auch Änderungen an Build-/Testkonfiguration lösen diesen Check aus. Kein neuer Workflow, Zeitplan, Publisher oder kostenpflichtiger Dienst. Preis-/Konto-/Secretänderungen unterblieben. Remote-Prüfungen und Merge-/Deploystand über den Branch und zugehörigen PR frisch lesen. Finanzielle Wirkung nicht gemessen.
- Routineübersicht PR2982 ist inzwischen gemergt (`3a7c5fbec9ae197720183e935d0be2defe2cbe07`), Produktionslauf42510504284 erfolgreich; Desktop/Handy live geprüft. Die Vorgabe «Routinearbeit gehört zum Assistenten» bleibt verbindlich.

## Verkaufsweg: Download-Bereitschaft vom 08.11.2026

- Auf aktuellem main `924c022b50c22ebf9238f1ffe81742077b6c034e` begonnen; AGENTS, CLAUDE, Shared Memory und Übergabe gelesen. Der Pro-Audit-Redirect bleibt erledigt. Keine weitere Büro-/Planungsrolle und kein neuer Ablauf.
- **GEMESSEN:** `functions/api/kit-download.js` gab nach simuliert bestätigter Zahlung HTTP200/`ok=true` mit Download-Link zurück, obwohl der simulierte Assetserver für diese ZIP404 meldet. Der Assetserver wurde überhaupt nicht gefragt. Nur erfundene Session/Produktdaten benutzt; kein echter Kauf, kein geschützter Inhalt abgerufen.
- Korrektur: Nach bestehender Stripe-Prüfung und gültiger textlicher Produktzuordnung prüft genau ein interner `ASSETS.fetch` mit HEAD die berechnete ZIP. HTTP200 plus passende ZIP-/Binär-Metadaten sind Voraussetzung; bekannte Dateigrösse unter22 Byte, fehlende Datei, Redirect, HTML/JSON, Fehler und Zeitüberschreitung ergeben503 ohne Download-Link. Eine Deadline begrenzt die Dateiprüfung auf4 Sekunden auch dann, wenn die Bindung das Abbruchsignal ignoriert. Fehlende ASSETS-Bindung scheitert vor einem Stripe-Aufruf. Keine automatische Wiederholung.
- Alte Dateinamen/Hashberechnung und alle bisher unterstützten textlichen Slugs bleiben erhalten, auch ältere Schreibweisen. Keine Preis-, Konto-, Secret-, Checkout-Link- oder Frequenzänderung. ZIP-Inhalte werden nicht geladen; Stripe-Zugang und Käufer-Cookies werden nicht an die Assetbindung weitergegeben.
- **GEMESSEN:** 45 Kit-/Downloadprüfungen,84 Engine- und42 API-Prüfungen lokal grün, zusammen171. Gegenprobe ohne HTTP-Statusprüfung wird rot. Desktop1440×1000 und Handy390×844 mit simulierten Antworten: fehlende Datei zeigt keinen Download-Link und verhindert keinen manuellen Wiederanlauf; nach manuellem Klick erscheint der simulierte Erfolg. Kein automatisches Polling, kein Kauf/Download. Lokaler Browserbeleg: `/workspace/download-bereitschaft-20261108/browser.json`.
- Vorhandener Workflow `hype-filter-test.yml` führt den erweiterten Test bereits aus; keine neue Automation. Lokale vollständige CI-Simulation am schreibgeschützten HOME blockiert; das ist kein bestandenes CI. Remote-Test-, Merge- und Deploystand über **PR2981**, Branch `codex/download-bereitschaft`, frisch prüfen. Vor der Bereitstellung antwortete der Live-Endpunkt mit einer absichtlich ungültigen Kennung ohne `cs_` korrekt HTTP400/«Ungültige Session»; laut geprüftem Code kein Stripe-Aufruf. Das bestätigt keinen bezahlten Live-Download.
- **QUELLE:** [Cloudflare Pages Functions API](https://developers.cloudflare.com/pages/functions/api-reference/#envassetsfetch), frisch gelesen: `env.ASSETS.fetch(Request)` liest Projektassets und berücksichtigt Header-/Redirectregeln. Native Pages-Bindung, keine neue Kontoeinrichtung.
- Grenze: Dateikopfprüfung bestätigt weder den ZIP-Inhalt noch einen echten erfolgreichen Kauf. Finanzielle Wirkung nicht gemessen. Die Verbesserung vermeidet eine fälschliche Fertigmeldung bei fehlender Lieferung; mögliche Support-/Doppelkaufwirkung nicht als gemessene Einsparung ausgeben.
- Offene Voraussetzung für die nächsten Verkaufswege: `NOTFALL_BUY_URL`, `PAKET_BUY_URL`, `AUDIT_BUY_URL` in `js/checkout-config.js` sind leer; im aktuellen Shop-JSON fehlt auch die Audit-Workbook-Zuordnung. Mailtexte sind inzwischen korrekt als Anfrage gekennzeichnet. Für direkte Käufe jeweils eigenes Produkt, eigener Checkout und geschützte Lieferung bestätigen; keinen fremden Zahlungslink einsetzen. Monitor-Abo/Reportversand bleiben separat zu verifizieren.

## Agentenverbesserung vom 08.11.2026

- **GEMESSEN:** `experten.planen` meldete bei fehlgeschlagener oder veralteter Prüfung für Test-/Paketaufträge gleichzeitig «Wartet auf Prüfung» und `automatisch=true`. Reproduktion mit offenem Meilenstein2 und fehlgeschlagener Gesamtprüfung bestätigt.
- Korrektur: Projektarbeit erhält das Automatik-Kennzeichen nur beim Zustand «Nächster Schritt». Fehlgeschlagene, fehlende, ältere als24 Stunden und zukünftige Prüfstempel sperren es. Vorgesehene lokale Prüf-/Paketarbeit mit frischem bestandenem Prüfstand bleibt möglich. Es wird kein neuer Agentendienst gestartet.
- Alle27 vorhandenen Chat-Aufträge verlangen jetzt ausdrücklich Shared Memory und diese Übergabe, Abgleich laufender Arbeit, konkrete Fehlerreproduktion und frische Gegenprobe. Bei Drosselung oder unklarem schreibendem Ergebnis stoppen; keine neuen Automationen, Frequenz-, Konto-, DNS- oder Secretänderungen. Abgeschlossene Arbeit und Blocker ohne private Daten hier festhalten.
- **GEMESSEN:** 25 Entwickler- und66 Bürotests lokal bestanden. Regressionstest wird rot, wenn die Korrektur rückgängig gemacht wird. Desktop1440×1000 und Handy390×844: Erledigen-Link enthält neue Regeln, alle27 Aufträge aktuell; keine Chatnachricht gesendet. Lokale vollständige CI-Simulation weiterhin am schreibgeschützten HOME blockiert; keine erfolgreiche Simulation behaupten.
- Source und veröffentlichte HTML-Vorlage synchronisiert, vorhandene Statusdaten erhalten. Änderung in **PR2980**, Branch `codex/agenten-verbessern`: aktuellen Remote-Test-, Merge- und Bereitstellungsstand dort frisch prüfen. Echter lokaler Werkstattlauf `/workspace/agenten-nachweis-20261108` erfolgreich: Demo und Lieferpakete gebaut, Angebot bleibt Entwurf. Änderungen sind Aufgabenplanung und Chat-Instruktionen, kein Nachweis für ständig laufende KI-Arbeiter. Finanzielle Wirkung nicht gemessen.
- Die vorangehende reine Übergabe wurde mit ausdrücklicher Inhaberfreigabe trotz ausstehender Prüfungen in PR2979 übernommen, Merge `8aab972b23dfbe21562da36e35209a1777383842`. Diese einzelne Freigabe gilt nicht pauschal für neue Codeänderungen. Zähler-PR2978 bleibt Entwurf.

## Ausgangsstand und Reihenfolge

- Arbeitsbeginn von `origin/main` `1cf3fa734a8c02dc2fbe29ca6f908d8aee0aeaac` (PR2972); vor den Produktwrites frisch mit `f6289be` (PR2973, proportionale mobile POD-Druckvorschau) abgeglichen. POD-Produkte nicht gleichzeitig angefasst. Vor neuer Arbeit remote erneut abgleichen.
- Zuerst `AGENTS.md`, `CLAUDE.md`, `SHARED-MEMORY.md`, danach die aktuelle Hauptmodell-Übergabe und das neueste Tagesprotokoll lesen.
- `/tmp/luxe-projektgedaechtnis.md` beginnt noch mit R99 vom 05.11.2026. Das ist kein Beleg für den neuesten Arbeitsstand. `/tmp/luxe-tagesprotokoll.md` reicht bis R145 vom 08.11.2026.
- Die `/tmp`-Dateien und `/workspace`-Nachweise sind lokale Kopien. Für eine andere Entwicklungsumgebung muss die Hauptübergabe samt nötigen nichtprivaten Belegen im Repository gespeichert werden.

## Bereits umgesetzt – nicht doppelt bauen

### PR2968: Bewertungsimporter als sechster Shop-Arbeiter

- Merge: `58fbd5d30f95dd46a247debae26eb6945b1724a5`.
- Der vorhandene CJ→Judge.me-Ablauf ist als Shop-Arbeiter, Fachrolle und begrenzter Prüfauftrag erreichbar. Judge.me-Link wurde in beiden vorhandenen Host-Freigaben ergänzt und im Browser gegengeprüft.
- Ein erfolgreicher Ablauf bleibt gelb: Workflow-Erfolg allein unterscheidet Testlauf, No-op und bestätigte Veröffentlichung nicht. Keine Importmenge erfinden und keine Kunden- oder Bewertungstexte öffentlich anzeigen.
- QUELLE `/workspace/bewertungsimporter-nachweis.json`: 59 Büro- und 23 Entwicklerprüfungen bestanden; Desktop, Handy, 3D-Arbeitsplatz, Fachrolle, Link und Auftrag bestätigt. Produktions-Deploy `42495417172` erfolgreich, beide Live-Browserprüfungen bestätigt.
- Historischer Stand dieses PRs: kein Importstart und kein neuer Zeitplan. Der nachfolgende ausdrückliche Auftrag führte zu PR2969.

### PR2969: begrenzter Regelbetrieb desselben Importers

- Merge: `bfe3776133034b2a996c3365885384dceb86aefb`.
- Vorhandener `cj-reviews.yml` ist alle sechs Stunden bei Minute 47 UTC geplant. GitHub kann Zeitpläne verzögern. Kein zweiter Importdienst.
- Grenzen: höchstens fünf aktive CJ-Produkte, 50 gescannte Produkte und zwei Quellbewertungen je Produkt; 30-Minuten-Grenze und gemeinsame Laufsperre bleiben erhalten.
- Alle gültigen Sterne 1–5 sind im Regelbetrieb zugelassen. Neue Importe erhalten sichtbaren CJ-Herkunftshinweis und behaupten keinen verifizierten Kauf im eigenen Shop.
- `dropship/cj_review_scan.json` speichert Abfragekontext und Shopify-Fortsetzungscursor. Begrenzte Leerläufe setzen auf der nächsten Seite fort; am Katalogende beginnt die Suche neu. Importfehler überspringen keine Produktseite. Wiederholte/ungültige Cursor führen zum Abbruch. Trockenläufe verändern keinen Suchstand.
- Suchstand gehört zum Wiederherstellungsartefakt und zum vorhandenen Checkpoint-Commit. Nicht zurücksetzen oder einen unklaren Import blind wiederholen.
- QUELLE `/workspace/bewertungsimporter-regelbetrieb-nachweis.json`: 94 Import-/Workflow- und 59 Büroprüfungen bestanden; echter Trockenlauf `42496698885` erfolgreich.
- Erster echter Lauf `42497315454`: erfolgreich, fünf Produkte geprüft, **null neue Bewertungen importiert**, Suchfortschritt dauerhaft gespeichert. Das ist kein Beleg für eine erfolgreiche Judge.me-Veröffentlichung.
- Produktions-Deploy `42497308284` und Live-Bedienung Desktop/Handy bestätigt. Finanzielle Wirkung nicht gemessen.

### PR2970: Erledigen-Knöpfe mit vollständigem Auftrag

- Merge: `9e6ee4a79c44e263c8f9eee2aa7e8e0f4d7581b3`.
- „Offene Aufgabe erledigen“ öffnet den vollständigen Tagesrunden-Auftrag; zugeordnete Arbeiter haben „Erledigen – im Chat“. Vorschau und Kopieren bleiben erhalten.
- Aufträge verlangen Umsetzung und Gegenprüfung im vorhandenen erlaubten Umfang. Die Tagesrunde priorisiert genau eine bestehende Verkaufs- oder Kostenaufgabe.
- Die öffentliche Seite kann keine Nachricht in den laufenden Chat senden und übernimmt keine Entwicklungsumgebung oder Chatverlauf. Je nach ChatGPT-Oberfläche muss der vorausgefüllte Auftrag noch gesendet werden.
- Linkklick, kopierter Text und vorbereiteter Auftrag gelten nicht als ausgeführte Arbeit. Keine neue Hintergrundautomation oder Veröffentlichungsfreigabe.
- QUELLE Gespräch: 59 Büro- und 23 Entwicklerprüfungen sowie lokale und Live-Browserprüfungen auf Desktop/Handy bestanden. Produktions-Deploy `42498342642` erfolgreich. Promptübergabe, fehlende private Messdaten im Link und fehlende Schreibaufrufe geprüft; die ChatGPT-Zielseite wurde beim Linktest abgefangen, keine echte Nachricht gesendet.

### PR2972: privater Google- und Shop-Monitor

- Merge / gelesener `origin/main`: `1cf3fa734a8c02dc2fbe29ca6f908d8aee0aeaac`.
- „Google & Shop-Zahlen“ öffnet einen Monitor für lokal geladene private Berichte. Er trennt Shopify-Berichtstage, GA4s 30-Minuten-Fenster, Search-Console-Zeiträume und Merchant-Teilauszüge.
- Belegte Nullen bleiben Null; fehlende Werte bleiben unbekannt. Vorläufige Suchdaten, alte Messzeiten und begrenzte Katalogabdeckung sind markiert. Problemzahlen werden nicht addiert.
- Reale Beträge und private Konto-IDs sind nicht in der öffentlichen Seite enthalten. Lokale Berichtsladung lädt nichts hoch und speichert nichts dauerhaft im Browser. „Private Zahlen ausblenden“ leert die Anzeige.
- `tools/buero/quellenbericht.py` baut denselben Monitor als eigenständige private HTML-Datei außerhalb von Repositories; CSP blockiert Netzwerkabrufe. Private Berichte bleiben außerhalb des Git-Repositories und dürfen nicht in die Hauptübergabe kopiert werden.
- Offiziell bestätigter Shopify-Live-View-Link: `https://admin.shopify.com/analytics/live`. Beim Anbieter richtige Property und richtigen Shop wählen. Laufende Ansichten bleiben beim jeweiligen Anbieter authentifiziert.
- **Kein privater Büro-Dauersync:** Der Website-Code hat keinen geschützten Inhaber-Datenzugang und übernimmt keine Chat-Connector-Zugänge. Ein gespeicherter Bericht ist kein laufender Kontosync.
- QUELLE `/workspace/google-shop-monitor-nachweis.json`: Shopify, GA4, Search Console und Merchant Center erreichbar; 66 Büro- und 23 Entwicklerprüfungen bestanden. Desktop/Handy, private HTML, fehlende Uploads bestätigt. Produktions-Deploy `42502185000` erfolgreich. Finanzielle Wirkung nicht gemessen.

Die private Claude-Büroansicht wird durch diese Website-Merges nicht automatisch aktualisiert. Laut Repository-Dokumentation benötigt sie weiterhin eigenen Datenimport und das vollständige zusammengehörige Designpaket; bestehende private Daten erhalten.

## Koordination mit den neuesten LuxeStyle-Produktarbeiten

QUELLE: `dropship/codex-handoff-20261018/TAGESPROTOKOLL.md` auf `codex/luxestyle-claude-handoff-20261018`, lokal `/tmp/luxe-tagesprotokoll.md`.

- R144: Kuscheldecke und Baby-Strampler wurden exakt gebunden live auf Deutsch korrigiert; alte Handles mit Redirect erhalten. Beim Strampler wurden 17 deutsche Alttexte und „Wie abgebildet“ dokumentiert. Beide bleiben wegen `rueckhol-0907` für neue Social-Ausspielung gesperrt. Nicht erneut als unberührt behandeln.
- R144: Schweizer Markttexte, FR-Footer und konkrete Medien-Alttexte korrigiert. `/fr` bleibt laut Beleg gemischt: hardcodierte deutsche Meta-Beschreibung und fehlende Produktübersetzungen. Direkter MAIN-Theme-Write war connector-blockiert; kein Bypass oder Retry.
- R144: Zwei problematische Merchant-Offers wurden an ihre Shopify-Quelle und exakte Variante gebunden. DRAFT-Quelle und niedrig aufgelöstes passendes Bild bleiben abgegrenzte offene Befunde; keine Preis-, Status-, Bild- oder Feedänderung daraus ableiten.
- PR2966 ist mit `352c9010ca3e70fd7132faedadf46746cbe71e79` gemergt: CJ-Importe standardmäßig DRY/no-op, explizites Gate/Shopidentität, nur DRAFT plus `compliance-pruefen`, Sprach-/Varianten-/Fehlersperren. Kein neuer Import durch diese Übergabe.
- R145: Yoga-Produkt wurde frisch gelesen und deutsch korrigiert, einschließlich Beschreibung, SEO und sechs Alttexten; Admin und öffentliche Seite wurden zurückgelesen. Historischer Handle leitet laut Beleg um. `rueckhol-0907` bleibt erhalten. Nicht erneut denselben Sprachfehler implementieren.
- PR2971: Merge `47f1e77f89cb5c71494f2df017cba0c39b71ecc1`; CJ Reader bindet Varianten-SKUs exakt. Produktread akzeptiert PID/productSku/variantSku, Inventory nur PID. Uneindeutige oder unvollständige Variantensets bleiben UNKNOWN.
- R145 dokumentiert getrennte erfolgreiche Nur-Lese-Produkt- und Inventarläufe. Daraus folgt keine bestätigte CH-Lieferung. Keine Lager-/Lieferzusage, Bestellung oder kostenpflichtiges Prime-Upgrade ableiten.

## Fortgeltende Grenzen

- Keine Finanzbeträge, Kunden-/Bestell-/Trackingdaten, Secrets oder signierten Download-URLs in Repository-Übergaben schreiben.
- Vor Änderungen aktuelle Belege und offene Arbeiten frisch lesen. Ein gespeicherter Auftrag ist kein ausgeführter Auftrag; Workflow-Erfolg ist kein vollständiger Produkt-, Verkaufs- oder Liefernachweis.
- Preise, Budgets, Konten, DNS, Secrets und Kontakt/Veröffentlichung nur im jeweils konkret freigegebenen Umfang. Diese Übergabe erteilt keine zusätzliche Freigabe.
- Vor Massenänderungen Messgerät und Trockenlaufliste in beide Richtungen prüfen. Nach Writes direkt am Objekt frisch lesen. Drosselung ist kein negativer Produktbefund.
- Die folgende Produktmessung und begrenzte Live-Bereinigung wurden vom Hauptagenten ausgeführt; nicht als Vollkatalog-Bereinigung ausgeben.

## Produktqualität – ausgeführter Auftrag vom 08.11.2026

Zähler-Erweiterung: **PR2978 bleibt Entwurf** (`codex/produktqualitaet-claude-memory`). Die fertige Übergabe und die folgenden bereits produktiven Shopify-Korrekturen werden davon getrennt gesichert. Kein neuer Website-Flow oder Zeitplan durch diesen Auftrag. Vor Fortsetzung aktuelle PR-Stände frisch abgleichen.

### Messung und Grenzen

- **GEMESSEN:** Frische `productsCount(limit:null)`-Abfrage: exakt **56’492 ACTIVE-Produkte**, **87’775 Produkte aller Status**, Präzision jeweils `EXACT`. Nach den beiden Korrekturen erneut 56’492 ACTIVE. Die früheren 56’506 sind historisch.
- **QUELLE:** Alter strenger Abschlussstand R116 vom 06.11.: 61/56’506, rund 0,11 % Prüf-/Korrekturabdeckung. Das ist weder eine aktuelle Sauberkeitsquote noch ein Beleg, dass der Rest fehlerhaft ist. Spätere enge Korrekturen nicht blind dazuaddieren.
- **QUELLE:** Inhaber-Screenshot Merchant Center → Business info → Countries, am 08.11. übermittelt; Aufnahmezeit unbekannt. Schweiz 344’727 genehmigte von `349,20…` (Gesamtzahl rechts abgeschnitten): **ungefähr 98,7 %**, Setup Complete. Deutschland 0/1’389 = 0 %, Setup Incomplete. Liechtenstein 81’259/276’796 ≈ 29,4 %, Setup Incomplete.
- Diese Länderzahlen sind Feed-Einträge/Angebote/Varianten, nicht einzigartige Shopify-Produkte. Nicht länderübergreifend addieren. Google-Freigabe beweist weder inhaltliche Wahrheit noch Bildrechte, Gewinn, Versandfähigkeit oder vollständige Produktqualität.
- **GEMESSEN:** Eigener reiner Lese-Bulkauftrag `gid://shopify/BulkOperation/12955623391623` ist COMPLETED, 56’492 Wurzelprodukte und 530’241 Objekte, abgeschlossen 17:13:16 UTC. Felder: ID, Titel, Klartextbeschreibung, beide SEO-Felder und Medien mit Typ/Status/Alttext. Keine Kunden-, Bestell- oder Kostendaten.
- **BLOCKER:** Shopify-Connector verweigert die Ausgabe signierter `url`/`partialDataUrl`-Downloadlinks. Metadaten sind vorhanden, Ergebnisdaten nicht auswertbar. Keine technische Gesamtquote und keine globale Liste defekter Produkte daraus behaupten. Keine Umgehung über andere Identitäten, keine neue Bulkoperation ohne bestehenden Stand zu prüfen.
- **UNBEKANNT:** Aktueller Anteil «sehr sauberer» Produkte. Vor einer Massenänderung ist ein erlaubter vollständiger Ergebnisexport samt frischen Vergleichszählern nötig.

### Tatsächlich live korrigiert, nicht erneut anfassen

**GEMESSEN:** Zwei ältere ACTIVE-Fortura-Produkte mit positivem Admin-Bestand, jeweils einer Variante, gezielt aus der ältesten Änderungsgruppe gelesen. Kein zufälliges oder repräsentatives Sample und keine Hochrechnung.

1. `15469993394561` – **Engelsflügel Glam rosa**, unveränderter Handle `engelsflugel-glam-rosa-fgabo52892`: pauschale Qualitätsbehauptung durch visuell belegte Farbe, Oberfläche und Federoptik ersetzt; SEO-Beschreibung ohne generischen Rabatt-/Versandclaim; drei individuelle Alttexte für Produkt, Tragebeispiel und Rückseite mit Schlaufen.
2. `15470001521025` – **Engelsflügel Yara 49x44 cm**, unveränderter Handle `engelsflugel-yara-49x44-cm-fgabo52849`: konkrete Farben und sichtbare Glitzerlinien, Grösse ausdrücklich aus vorhandener Produktangabe; passende SEO-Beschreibung; zwei individuelle Alttexte für Tragebeispiel und ausgebreitete Flügel.

Fünf Bilder vor den Alttexten selbst angesehen. Schreibumfang nur Einleitungsabsatz, SEO (immer beide Felder) und fünf bestehende Medien-Alttexte. Vor jedem Write frisch gegen den gelesenen Stand verglichen. Danach Admin erneut gelesen: erwarteter Text und alle Alttexte stimmen; Titel, Handles, Status, Varianten/SKUs, Preise, Bestand, Tags und Bilddateien unverändert. Vorhandene Versand-, Rückgabe- und Zahlungsblöcke blieben unverändert und sind hier **nicht erneut verifiziert**. Kein vollständiges Qualitätszertifikat für diese Artikel.

**GEMESSEN:** Beide öffentlichen Produktseiten vor/nachher im frischen Browserkontext gelesen; nachher mobil 390×844, HTTP200, genau eine H1, neue Einleitung und Meta-Beschreibung sowie alle fünf Alttexte im DOM bestätigt, 17:27 UTC /18:27 Europe/Zurich. Kein Cart, Checkout oder Kauf. Produktänderungen sind bereits im Shopify-Shop sichtbar und benötigen keinen Website-Code-Deploy. Finanzielle Wirkung noch nicht gemessen.

Dauerhafter nichtprivater Beleg: [produktqualitaet-20261108.json](produktqualitaet-20261108.json). Ausführlicher lokaler Vorher-/Nachher-Browserbeleg: `/workspace/produkt-qualitaet-20261108/public-before.json` und `public-after.json`; lokale Pfade können der nächsten Umgebung fehlen.

### Wiederverwendbare Gegenprobe ohne neue Automation

**Nur im Entwurf PR2978, noch nicht auf main verfügbar:** `automation/lib/produktqualitaet.mjs` exportiert `Qualitaetszaehler.add(row)` und `finish({expectedRoots,expectedObjects,activeBefore,activeAfter})` für den lesenden JSONL-Auszug. Es gibt **keinen neuen Scheduler, Publisher, Netzwerkzugriff oder Shopwrite**.

**SETZUNG:** Sechs technische Mindestbedingungen: Titel und Klartextbeschreibung befüllt, explizite SEO-Beschreibung befüllt, mindestens ein IMAGE, alle Medien READY, alle IMAGE-Alttexte befüllt. `seo.title=null` ist ein zulässiger Titel-Fallback. Leere explizite SEO-Beschreibung ist ein Bearbeitungshinweis, kein Beweis für fehlendes gerendertes Meta. Die technische Quote ersetzt keine Inhaltsprüfung. Unvollständiger/leerer Auszug erhält keine Quote. Defekte, doppelte oder verwaiste Zeilen brechen ab; abgefangene Fehler lassen sich nicht nachträglich als saubere Messung ausgeben.

**GEMESSEN:** 56 lokale Prüfungen bestanden. Hauptagent hat Objektzählungs- und READY-Mutanten jeweils rot geprüft; Hilfsagent zusätzlich SEO-Fallback-Mutant erkannt. Nur mechanische Zähler-/Testarbeit delegiert; in der Repository-Fachregel genanntes Haiku-Modell war nicht verfügbar, daher geerbtes Modell. Neuer Test ist ausdrücklich im bestehenden `LuxeStyle automation tests`-Workflow eingetragen. Lokal `bash automation/ci_simulation.sh` am schreibgeschützten `$HOME` blockiert; das ist kein bestandenes CI. Remote-Matrix am Head `dcbd7bbfcb1e9a72e6f67a6bed976ac4df795e7f`, Run42505331368: `lagerbestand` grün; `selbst-gestalten` rot. Lokal reproduziert: 1/354 Prüfungen rot, «lspod-designer-v6-6.3.0.js: deutsche Schriftauswahl ohne englische Stilnamen». PR2977 hat zum Erhalt bestehender Produkt-SRI den alten Editor wiederhergestellt, der noch englische Stilnamen enthält. Den Editor nicht für diesen Auftrag ändern und keinen Test zur Erzeugung von Grün abschwächen. Koordinierter Editor-/SRI-Rollout liegt als PR2976 vor und verlangt ausdrücklich Plan/Canary/Full vor Merge/Apply. Zähler-PR deshalb Entwurf lassen.

### Konkrete Reihenfolge für Claude um 21:00

1. Diese Übergabe, aktuellen main/PR-Stand und neuestes LuxeStyle-Tagesprotokoll frisch lesen. R144/R145 und die zwei Flügel-Produkte nicht doppelt korrigieren. POD-Vorschau wurde parallel in PR2973 geändert und der Editor danach in PR2977 zum Schutz vorhandener SRI wiederhergestellt; PR2976 ist der noch offene koordinierte Rollout, nicht als produktiv fertig zählen.
2. Erlaubten lesenden Exportweg des **bestehenden** Bulkauftrags klären. Der Connector gibt signierte Links nicht aus; keine Umgehung. Wenn ein legitimer Export bereitsteht: rohe Daten nur temporär privat halten, Objekt-/Root-Zahl mit Quelle und frischen Vor-/Nachher-ACTIVE-Zählern prüfen, dann Zähler verwenden. Keine Produktdaten aus privaten Bestellungen beziehen.
3. Priorität Schweiz: tatsächliche Gründe der rund 1,3 % nicht genehmigten CH-Feed-Einträge nach exaktem Offer und Variante prüfen. Abgeschnittene Gesamtzahl erst präzisieren. Bekannte Overlay-, DRAFT-Quell- und niedrig aufgelöste Variantenbilder bleiben separate Befunde; keine erfundenen Ersatzbilder oder Preise.
4. Deutschland/Liechtenstein als unvollständige Ländereinrichtung separat diagnostizieren. Aus dem Screenshot folgt kein konkreter sicherer Einstellungsfix; Länder, Versand, Preise und Kontoregeln nicht eigenmächtig ändern.
5. Nächste kleine Produktgruppe aus belegten Befunden wählen, frisch lesen, sichtbare Bilder/Quellangaben prüfen, nur nachweisbare Text-/Alttextfehler korrigieren und öffentlich zurücklesen. Vorhandene Claim-/Rechte-/Variantenprobleme nicht mit Felderfüllung für erledigt erklären. Keine ungeprüfte Vollkatalog-Umschreibung.

Diese Datei nach abgeschlossenen Codex-Arbeiten aktualisieren. Ein 21:00-Start von Claude ist durch die gespeicherte Übergabe nicht technisch eingerichtet.
