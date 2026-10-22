# LuxeStyle: Codex-Übergabe für die nächste Claude-Session

**Sichtbarkeits-Maximalplan 22.10.:** [Prüf- und Freigabepaket](SICHTBARKEIT-MAX-20261022.md). Enthält Search-&-Discovery, Filter, Collection-Architektur, Merchant-/Free-Listings-Grenzen, SEO, Social und Conversion. Keine Live-Aktivierung; Merchant-Leistungsabfrage heute wegen inkompatibler Feldkombinationen/Timeout unbekannt.

**Neue Filtermatrix für Claude:** [Technik & Schuhe – Filtermatrix](FILTERMATRIX-TECHNIK-SCHUHE.md). Der Entwurf definiert kundenrelevante Filter, normalisierte Werte und interne Tags, die verborgen bleiben müssen. Er ist noch nicht im Shopify-Shop aktiviert. Die nächste sinnvolle Prüfung ist der Abgleich mit den bestehenden Search-&-Discovery-Regeln.

**Aktueller Stand 22.10., Abendprüfung gegen 20:47 Zürich:** [Freigabepaket mit sechs Kanalentwürfen](FREIGABEPAKET-20261022.md), [fortlaufende Tagestabelle](TAGESPROTOKOLL.md), [Briefkasten-Empfang und Diagnose](BRIEFKASTEN-20261022.md), [begrenzte Prüfbelege](PRUEFBELEGE-20261022.json). Neu: separater Assist-MCP-Metadatenfehler in [Entwurfs-PR 2708](https://github.com/allengchour-glitch/aban-news-landing/pull/2708) korrigiert; 174 lokale Tests und beide LuxeStyle-CIs erfolgreich, vier Commit-Blobs bestätigt. Nicht gemergt oder als Inhaber-Clientbetrieb bestätigt. Der Briefkasten zählt alte Video-Slots, keine Handoffs: Morgenbefund 15 fehlend / drei abgelaufen, keine Lieferbestätigung. Originalauftrag/Marker erhalten; Claude-Lesebestätigung unbekannt. Identitäten passend; 85 Planungsobjekte bis 28.10., davon 65 PENDING und 20 mit 22 PUBLISHED-Kanalmeldungen bestehender Fremdabläufe; keine eigenen Social-Writes. 26.–28.10. leer. Projektor CHF 34.90 und Paperang-Grundmodell CHF 31.90 kaufbar; rueckhol-Sperre erhalten. Gezielte paperang-Suchanhebung bleibt Entwurf, private Suchregeln unbekannt. Tageskennzahlen/Flow-Report nur einmal gelesen; Datenlücken unbekannt. Neuer 18-s-Master weiter ohne passende Premium-Originale, Modell-/Motivnachweis, Rechte und Abnahme. Vier DNS-Ergänzungen bereits genehmigt, authentifizierter Zugriff fehlt. Keine operative Aktivierung, kein Kundenkontakt oder kostenpflichtiger Render; Prüf-/Berichtsrhythmus unverändert.

**Aktueller Stand 21.10., Planung/Konten gegen 17:52 Zürich:** [Heutiges Freigabepaket](FREIGABEPAKET-20261021.md), [fortlaufende Tagestabelle](TAGESPROTOKOLL.md), [neue Claude-Code-Erweiterung](CLAUDE-ASSIST-20261021.md) und [vollständiger geprüfter Patch](CLAUDE-ASSIST-20261021.patch). Dieselben 107 Planungsobjekte: 93 PENDING / 14 mit insgesamt 16 PUBLISHED-Kanalmeldungen aus bestehenden Fremdabläufen, keine eigenen Social-Writes. Lücken am 26./27.10.; volle kreative Historie unbekannt. Projektor ACTIVE/CHF34.90, neu beobachtetes auswahl-offen; Paperang ACTIVE/Grundmodell CHF31.90 und rueckhol-Social-Sperre erhalten. Mobile Standardkarte zeigt korrekten Preis; gezielt belegte Suchlücke bleibt Verkaufspriorität. Shopping_ads-Metafeld ist kein Free-Listings-Nachweis. Tageskennzahlen/Flow-Report morgens einmal gelesen, Lücken unbekannt; genau ein TTuuTS-Tracking-Entwurf. Neuer Master weiterhin ohne passende Premium-Originale, Modell-/Motivbeleg, Filmrechte und Abnahme. PR2669 frisch als gemergt bestätigt; keine produktive Ausführung daraus abgeleitet. Neue Assist-Vorbereitung prüft lokale Übergabe-/Datumsblöcke automatisch im Doctor; 181 Tests auf Node24 bestanden und Patch bytegenau gegengeprüft. Nur Dokumentations-/Patchablage auf dieser Branch, kein Merge/Deployment oder bestätigter Inhaber-Clientstart. Zusätzliche Subagent-Prüfungen am Nutzungslimit beendet; Hauptreview abgeschlossen. Vier DNS-Records bereits genehmigt, Schreibzugang fehlt. Zeitplan und alle operativen Grenzen erhalten.

**Nachgetragener Abendstand 20.10.:** [Gesichertes Abendpaket mit Suchgegenprobe, Warenkorb-Textdiff und CJ-Parser-Vorbereitung](ABENDLAUF-20261020.md). Tätigkeiten im 20.10.-Datumsblock erhalten; kein neuer Umsatz- oder Produktivnachweis.

**Aktueller Folgelauf 20.10., gegen 14:05–14:08 Zürich:** [Neue kanalbezogene Belege und 15-Gruppen-Produktnachweismatrix](FOLGELAUF-20261020-1400.md), [fortgeführte Tagestabelle](TAGESPROTOKOLL.md). Identitäten/Projektor frisch passend. Dieselben 129 Planungs-UUIDs: 119 PENDING / zehn PUBLISHED-Objekte; elf zusätzliche Kanalzustände an neun bestehenden Postobjekten, keine eigenen Social-Writes. Der alte 15-s-Projektor ist auf Facebook/Instagram/TikTok PUBLISHED gemeldet, kein neuer 18-s-Master. Neue Facebook-URL-Zuordnung zu 399450504 bleibt offen. 26.10. weiterhin ohne Planung. Frische Produktvideo-Abfrage liefert nur bekannte 960×540-Quelle, keine neue Premiumquelle. Neu: aktuelle Angaben zu Massen, Material, Lebensdauer, elektrischen Werten, Zusatzfunktionen und Bannerclaims nachvollziehbar von unabhängigen Nachweisen getrennt; kurzer Prüftext/Diff nur vorbereitet, kein Shopwrite. Morgen-Kennzahlen/Flow-Report hashgeprüft wiederverwendet; TTuuTS-Tracking frisch weiter false, einziger Flow-Vorschlag zur Freigabe. Musik aktuell hashgleich, Rechte-/Masterabnahme weiterhin offen. Runtime-Netzpolicy nun enforced, kein CJ-/DNS-Kontozugriff daraus. Vier DNS-Ergänzungen bereits genehmigt, Schreibzugang fehlt. Keine operativen Aktivierungen, Kundenkontakte oder kostenpflichtigen Renders. Datierte Beobachtungen ersetzen keine neuen Gates oder Rechtefreigabe.

**Aktueller Morgenlauf 20.10., gegen 08:01–08:05 Zürich:** [Heutiger Bericht mit präzisiertem Master und sechs Kanaltexten](MORGENLAUF-20261020.md), [fortgeführtes Tagesprotokoll](TAGESPROTOKOLL.md). Identitäten und Projektor frisch passend. 20.–26.10.: 129 Objekte, 128 PENDING / ein PUBLISHED / keine Entwürfe; am 26.10. sechs Kanäle ohne Planung. Der Fensterwechsel ist kein gemessener Rückgang. Ein bestehender YouTube-Post neu PUBLISHED gemeldet, keine eigenen Social-Writes; vier zusätzliche und zwei nicht mehr gelieferte UUIDs im Überlappungsfenster, keine behauptete Löschung oder Ersatzposts. Neu korrigiert: Bedienungsquelle mindestens 8 nutzbare Sekunden, Projektionsquelle 7, je 1 s Vor-/Nachlauf zusätzlich; TikTok-Caption unabhängig von der offenen Hook-Wahl. Drei echte Produkt-/Collection-Ziele HTTP 200/Canonical passend, Capture-Code XWqMAD/T2VHfu; Review-Herkunft und Merchant-Zulassung unbekannt. Kennzahlen/Flow-Report heute einmal gelesen, Lücken unbekannt; einziger Welcome-Tracking-Diff weiter zur Freigabe. Native Originalaufnahmen, Default-/Motivzuordnung, Filmrechte und fertige abgenommene MP4 fehlen weiterhin. Musik aktuell hashgleich, kein neuer Render. DNS vier Records bereits genehmigt, legitimer Schreibzugang fehlt. Keine Shop-/Feed-/Flow-/DNS-Änderung. Datierte Belege ersetzen keine frischen Gates oder Freigabe.

**Aktueller Abendlauf 19.10., gegen 19:05 Zürich:** [Abendbericht mit kanalbezogenen Statusbelegen](ABENDLAUF-20261019.md), [neuer konkreter Aufnahme-/Rechteauftrag](PRODUKTIONSAUFTRAG-PROJEKTOR-20261019.md) und [fortgeführte Tagestabelle](TAGESPROTOKOLL.md). Identitäten/Produkt erneut passend; 151 Objekte, 135 aktive Termine, 15 PUBLISHED-Meldungen, ein Entwurf. Acht zusätzliche Kanalzustände bestehender Abläufe seit dem 14-Uhr-Beleg, keine eigenen Social-Writes. Projektor-Termin 20.10., 10:00 unverändert alter 15-s-Clip; neuer 18-s-Master weiterhin ohne freigabefähige Originalaufnahmen, Modell-/Motivnachweis, Filmrechte oder fertige abgenommene MP4. Neu: vier präzise Originalshots und dateibezogene Rechteanforderungen vorbereitet, nicht versendet/beauftragt. Produkt-JSON-LD mit Preis/SKU/Variante passend, kein Google-Zulassungsnachweis. Merchant-Produktabruf ohne verwertbare Antwort, Zustand unbekannt. Tageskennzahlen/Flow-Report wiederverwendet; einziger Welcome-Tracking-Diff bleibt zur Freigabe. DNS vier Records bereits genehmigt, Schreibzugang fehlt. Keine Shop-/Flow-/Feed-/DNS-Änderung oder bezahlter Render. Datierte Belege ersetzen keine frischen Gates oder Masterabnahme.

**Aktueller Folgelauf 19.10., gegen 14:00 Zürich:** [Neue Statusbelege und konkrete Master-Endshot-Korrektur](FOLGELAUF-20261019-1400.md). Identitäten erneut passend; dieselben 149 Planungs-UUIDs, nun 139 Termine / neun PUBLISHED-Meldungen / ein Entwurf. Fünf bestehende Beiträge zusätzlich veröffentlicht gemeldet, keine eigenen neuen Posts. Ein Facebook-URL-Bezug ist ungeklärt. Der offene 18-Sekunden-Master braucht für Sekunde 14–18 eine zusätzliche echte Geräteaufnahme; die alte Quelle zeigt dort nur Projektion. Alter 15-Sekunden-Upload unverändert, kein neuer Master. Kennzahlen und Flow-Report heute nicht wiederholt; einziger Welcome-Tracking-Diff weiter zur Freigabe. DNS bereits genehmigt, Schreibzugang weiter fehlend. Diese datierten Beobachtungen ersetzen keine frischen Gates oder Rechte-/Filmabnahme.

**Aktueller Helferstand 2.4 und Geschäftsprüfung, 19.10.2026:** [PR 2704](https://github.com/allengchour-glitch/aban-news-landing/pull/2704) ist nach main gemergt, Merge-Commit `f617f7058ce0fea15d7e745dc32abe2732ea17fb`, geprüfter PR-Commit `1cc14f1ee9877461ed0451d4aeba292d638dc8ab`. Alle 29 betroffenen Dateien anhand der Blob-SHAs geprüft; der frisch gelesene main-/Merge-Tree entspricht exakt dem geprüften Upload. 170 Regressionen auf Node 24 lokal und Node 22.23.3 in GitHub CI bestanden. Zwei LuxeStyle-Testläufe und sieben relevante Repository-Checks erfolgreich; nur die drei dokumentiert ausgenommenen Worker-Checks rot. Der aktuelle Skip-Grund wurde in den PR-/Commit-Kommentaren nicht geliefert; keine neue Fehlerfreiheit dieser Worker behauptet. Zusätzliche Vorprüfung/Preview beim Merge noch laufend. Neu: optionale Originalbyte-Quellenpins für Handoffs, erneute Quellenprüfung beim Wiederaufnehmen, Vorher-/Nachher-Fingerprints fester Testinputs und erneute Pfadabdeckung nach Tests. Geänderte/unlesbare Belege bleiben unbekannt, echte Fehler behalten Vorrang. Zwei Beobachtungen sind kein eingefrorener Snapshot. MCP-Abbrüche und ungültiges CLI-UTF-8 gegengeprüft. Zehn Tools, Server 2.4.0; echte isolierte Claude-CLI 2.1.303 erneut in drei Fällen verbunden, elf aktuelle Laufzeit-/Konfigurationshashes im [Clientbeleg](https://github.com/allengchour-glitch/aban-news-landing/blob/f617f7058ce0fea15d7e745dc32abe2732ea17fb/dropship/assistant/CLAUDE-CLIENT-CHECK.json). Inhaberprofil und dortige Projektfreigabe unbekannt; keine Modellanfrage. Siebter Handoff angehängt, sämtliche früheren Journalbytes erhalten. [Benutzung](https://github.com/allengchour-glitch/aban-news-landing/blob/main/dropship/assistant/README.md).

**Aktuelles Content-/Verkaufspaket:** [Freigabepaket 19.10.](https://github.com/allengchour-glitch/aban-news-landing/blob/f617f7058ce0fea15d7e745dc32abe2732ea17fb/dropship/owner-review-20261019/FREIGABEPAKET.md), mit Storyboard, sechs Text-/UTM-Entwürfen und begrenzten Belegen. Shopify luxestyle.ch/CHF und Metricool 6227837/EuropeZurich samt sechs Kanalidentitäten frisch passend. 19.–25.10.: 149 Post-Objekte, 144 Termine, vier bereits veröffentlicht gemeldete, ein Entwurf; keine Tages-/Kanallücke, keine identischen Medien-URLs je Kanal gefunden, vollständige Filmhistorie weiter unbekannt. Zwei bestehende Termine nennen KI-Stimme; nur Metadatenbefund, Termine erhalten. Der offene Projektor ist ACTIVE und für CHF 34.90 kaufbar, Tags geprüft, untracked/CONTINUE; dies nicht als Lager-/Lieferzeitversprechen verwenden. Der eine 18-Sekunden-Master ist weiterhin nur Storyboard: native Qualität, Default-/Motivzuordnung und kommerzielle Filmrechte offen. Vorhandener 15-Sekunden-Termin ist kein Ersatzmaster. Kein neuer Social-Write, Render, Kundenkontakt oder Shop-/Flow-/DNS-Write. Kennzahlen 12.–18.10. am 19.10. bereits einmal gelesen; Lücken unbekannt, keine Verkäufe aus Views ableiten. Aktiver Checkout-Flow XEGbTB und Welcome-Capture auf T2VHfu vorhanden. Einzige Klaviyo-Verbesserung zur Freigabe: TTuuTS add_tracking_params false zu true; nichts aktiviert. Vier genaue DNS-Ergänzungen sind bereits genehmigt, öffentlich nicht nachweisbar; Schreibzugang fehlt. Versandgrenzen CHF 50/45 und Kundendomäne erhalten. Für Folgeaktionen immer aktuelle Chat-Vorgaben und Live-Gegenprobe; dieses datierte Wissen erteilt keine neue Freigabe.

**Historischer Helferstand Version 2.3, 19.10.2026:** [PR 2702](https://github.com/allengchour-glitch/aban-news-landing/pull/2702) ist bestätigt nach main gemergt, Merge-Commit `97fd40c21dc78316e18290cd7e48c775e989567f` (geprüfter PR-Stand `a4ccb51449afce15c2c92b426c563414fbb98765`). Alle 16 betroffenen Dateien vor und nach Merge exakt bestätigt. Neu: `luxe_change_plan` vergleicht optional das vollständige Paar `baseCommit`/`headCommit` aus je40Hex-IDs ausschliesslich lokal, sodass ein sauberer gepullter Checkout bereits committierte Änderungen nicht mehr aus dem Prüfplan verliert. Lokale Commitobjekte/Vorfahrbeziehung und direkte Snapshots geprüft; keine automatische andere Basis, keine Fetches/Checkouts/Tests. Fehlende/flache/nicht lineare Historie und unvollständige/zu grosse Ergebnisse bleiben unbekannt. Ausgabe nennt beide Grenzen, nicht gescannte lokale Änderungen und executedTests=false. Feste Prüfprofile und check changed laufen weiterhin gegen die aktuelle Arbeitskopie; kein Testnachweis des angegebenen Ziel-Commits. Ohne Argumente bleibt der bisherige Arbeitskopie-Plan erhalten. 136 Regressionen über den echten begrenzten Assist-Runner, beide LuxeStyle-CIs, relevante Repo-Qualitätsprüfungen und unabhängiger enger Review bestanden. Drei Worker-Fehler als Deployment skipped bestätigt; zusätzliche Vorprüfung/Preview-Build beim Merge noch laufend. Direkter Selbsttest: zehn Werkzeuge, Server2.3.0. Echte Claude-Code-CLI2.1.303 erneut im isolierten Pilot verbunden aus Root, Unterordner und mit störenden Node-Elternoptionen; zehn aktuelle Quellhashes im [Clientbeleg](https://github.com/allengchour-glitch/aban-news-landing/blob/main/dropship/assistant/CLAUDE-CLIENT-CHECK.json). Alle alten Journalzeilen erhalten, sechster Handoff angehängt. [Benutzung](https://github.com/allengchour-glitch/aban-news-landing/blob/main/dropship/assistant/README.md): aktuellen main sicher übernehmen, `node automation/claude-assist.mjs self-check`, in Claude `/mcp` und `/luxestyle-assist`. Inhaberprofil, Anmeldung und lokale MCP-Freigabe bleiben unbekannt; bestehende Sicherheitsentscheidungen erhalten. Kein Modellaufruf, Shop-/Feed-/Flow-/DNS-/Metricool-Write oder bezahlter Render durch diesen Lauf.

**Umsetzung aus vorhandenen Semrush-Ergebnissen, 18.10., 21:43 Uhr Europe/Zurich:** Separate Entwurfs-PR [2694](https://github.com/allengchour-glitch/aban-news-landing/pull/2694), Commit `51325e7c2fc8cd3596412130367c1fdc117c2b81`: gezielter SEO-Helfer mit Feldschutz, höchstens sechs expliziten Produkten und Review-Workflow; 22 neue Offline-Tests plus bestehende Titelprüfungen bestanden. Drei descriptionHtml-Diffs mit Vorher/Nachher-Vorschau liegen dort unter `dropship/seo-review-20261018/`. Alle 20 hochgeladenen Dateien wurden inhaltlich zurückgelesen. Kein Merge, Deployment, Dispatch oder Shop-Write; Seitenänderungen bleiben zur Inhaberfreigabe. Alte externe Aufrufe ohne PRODUCT_IDS sind vor Merge abzugleichen. Native READ-Abfrage geprüft, echte Mutation nicht ausgeführt. Historische Semrush-Ränge sind keine heutigen Messwerte.

**Semrush-Abgleich nach Inhaberhinweis:** [Vorhandene Claude-Semrush-Arbeit zuerst wiederverwenden](SEMRUSH-BESTAND.md). Direkte MCP-Nutzung und übernommene CH-Berichte sind belegt. Fehlender Windsor-Anschluss ist davon getrennt; keine neue Einrichtung oder kostenpflichtige Abfrage als Voraussetzung darstellen. Alte Rangwerte bleiben datiert.


**Gratis-Sichtbarkeit, 18.10.:** [Geprüfter Plan für Google-Produkteinträge, Search Console, Bing, Pinterest und Semrush Free](GRATIS-SICHTBARKEIT.md). Windsor meldet TRIAL, keine bestätigte dauerhafte Gratisbrücke; Standard-Semrush-SEO-API ist kostenpflichtig. Vorhandene Verifizierungsmarker und Shopify-Google-Kanalflag beweisen keinen Kontozugriff oder Merchant-Freigabe. Keine Konten, Feeds, Indexmeldungen oder Apps aktiviert.


**Nachtrag 18.10., ca. 19:44 Uhr:** [Neue Verbesserungen und native Gegenprobe](VERBESSERUNGEN-1944.md). Im allgemeinen Versandprofil ist aktuell CHF 40.50 aktiv und CHF 45 deaktiviert; die Projektor-Variante ist diesem Profil zugeordnet. CHF 50 öffentlich / CHF 45 intern bleibt die Inhabervorgabe, ist aber kein bestätigter aktueller Tarif. Keine Tarifänderung vorgenommen. Weitere Text- und Ledger-Diffs sind nur Entwürfe.


Wissensstand: 18.10.2026, ca. 19:08 Uhr Europe/Zurich. Übergabe auf ausdrücklichen Auftrag des Inhabers: «lade dein wissen hoch für claude session». Dies ist eine datierte Übergabe, keine erneute Live-Prüfung und kein Deployment. Neuere ausdrückliche Inhaberanweisungen gehen vor. Sprache Deutsch (Schweiz), keine Emojis.

## Zuerst lesen: gültiger Umfang

- LuxeStyle/luxestyle.ch bearbeiten. ABAN, Spiele und andere Marken bleiben ausserhalb dieses Auftrags, obwohl sie dasselbe Repo verwenden.
- Automatische Social-Publikationen und Terminierungen über Metricool sind seit 18.10. ausdrücklich erlaubt, ausschliesslich für inhaltlich freigegebene, tatsächlich gerenderte professionelle Master mit belegten kommerziellen Bearbeitungs-/Werberechten und bestandener Qualitätsprüfung. Die frühere reine Vorbereitungsvorgabe ist nur dafür ersetzt.
- Die allgemeine Automatisierungserlaubnis ist keine kreative oder rechtliche Freigabe des offenen Projektorfilms. Der neue professionelle Master ist noch nicht fertig oder abgenommen. Keine alten Entwürfe pauschal aktivieren.
- Sonstige Verkaufsaktionen bleiben zur Freigabe vorbereitet: keine Kunden anschreiben, keine Rabatte/Budgets/Shop-Einstellungen/Flows aktivieren oder ändern, keine kostenpflichtigen Renders, Käufe oder Lizenzkäufe. Kein ungeprüftes Workflow-Dispatch oder Deployment.
- Einmalige DNS-Ausnahme: Genau die vier unten genannten Klaviyo-Ergänzungen sind durch «ja mach du» bereits genehmigt. Nicht nochmals dieselbe Zustimmung verlangen. Sicherer DNS-Schreibzugang fehlt; Umsetzung ist nicht erfolgt. Keine weiteren DNS-/Nameserver-/Mail-/Flow-Änderungen oder Domain-Aktivierung umfasst.
- Öffentliche Gratisversand-Schwelle CHF 50, interne CHF 45 nach Rabatt und Kundenkonto `account.luxestyle.com.co` erhalten.
- Nur echte Produktbilder, Eigenschaften, Reviews, Masse und Materialien. Keine Swiss-made-, Bestands-, Lieferzeit- oder Umsatzbehauptungen ohne Nachweis.

Ältere Repo-Runbooks enthalten breitere Autonomie-, Import-, Merge- und Veröffentlichungsaufträge. Sie heben diese konkreten Chat-Grenzen nicht auf. Insbesondere keine DRAFT-Produkte oder fehlenden Kanäle pauschal aktivieren. Historische Berichte mit «DNS noch zur Freigabe» sind für diese vier Ergänzungen überholt.

## Tatsächlich geändert und weiterhin offen

| Gegenstand | Bestätigter Stand |
|---|---|
| Bestehende ChatGPT-Aufgabe «LuxeStyle Metricool steuern» | Auf drei flexible tägliche Fenster 08–09, 14–15, 19–20 Uhr Europe/Zurich umgestellt und zurückgelesen; keine zweite Aufgabe anlegen. Keine minutengenaue Ausführung garantiert. |
| Aufgabenregeln | Stabile Master-/Kanal-Nachweise, kanalbezogenes Rücklesen, korrigierte Schnittreferenz und bereits erteilte DNS-Freigabe im Auftrag gespeichert. |
| Letzter beobachteter Aufgabenstart | 18.10. um 19:03:17 Schweizer Zeit. Ein Start ist kein Publikationsbeleg. |
| Abendlicher Content-Diff | Nur TikTok-Einstieg korrigiert auf «Ein Lichtmoment für deinen Raum.» Die frühere Behauptung «Gerät zuerst» passte nicht zu Hook A mit Projektion zuerst. |
| Film/Publikationen | Kein neuer professioneller Master, keine neuen Posts oder Termine in den beschriebenen Prüfungen. Sechs vorhandene Entwürfe unverändert deaktiviert. |
| DNS | Vier Ergänzungen genehmigt, Zugriff fehlt, nichts umgesetzt. |
| Lokale Technik | Musik am kanonischen lokalen Pfad wiederhergestellt; weitere Prüfhelfer und Diffs nur lokale Entwürfe, siehe unten. |

Diese Wissensübergabe ändert keine Shop-, Feed-, Flow-, DNS- oder Metricool-Daten. Ihre Ablage ist kein Deployment lokaler Prüfhelfer.

## Identität vor jedem möglichen Metricool-Write frisch prüfen

Shop muss LuxeStyle, `luxestyle.ch`, Währung CHF sein. Metricool muss Marke `6227837`, Zeitzone `Europe/Zurich` und die folgenden Konten zeigen. Abweichung bedeutet keine Writes.

| Kanal | Erwartete Identität |
|---|---|
| Instagram | luxestyle.ch |
| Threads | luxestyle.ch |
| TikTok | luxestyle.ch |
| Facebook | 1049840534888592 |
| Pinterest | luxestyleCH |
| YouTube | UCSfCEYjAsdOyYxyfTClXRZA |

Abends frisch bestätigt. Das ersetzt keine Prüfung im nächsten Lauf. CJ-/Shopify-Helfer existieren im Repo; ein fehlendes ChatGPT-Plugin beweist keinen fehlenden CJ-Connector. Nur die aktuelle Codex-Laufzeit hatte keine bereitgestellten CJ-/DNS-Credentials. Das ist keine Aussage über andere Claude-Sessions oder vorhandene Repo-Secrets. Keine Geheimnisse im Chat oder Repo anfordern/ablegen.

## Ein Produkt, ein offener Master

- Titel: Sternenlicht-Projektor für Schlafzimmer.
- Product: `gid://shopify/Product/15521256604033`; Variante `56197916361089`; SKU `CJ-1477820492730732544`.
- Stabile masterId: `luxe_sternenprojektor_master_20261018`. Nach Re-Encoding bleibt es derselbe Master.
- Am 18.10. abends: ACTIVE, CHF 34.90, `tracked=false`, `inventoryPolicy=CONTINUE`, `availableForSale=true`. Menge 0 ist hier kein Ausverkaufs- oder Liefernachweis.
- Acht aktuelle Tags: `beleuchtung`, `bild-ok`, `bildmass-ok-0906`, `cj-real`, `dropship`, `elektronik`, `gadget`, `tech`. Basiswächter plus zusätzliche rueckhol-Regel ohne Treffer.
- Produkt: https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544 — HTTP 200, passender Canonical und öffentliche Varianten-/Kaufbarkeitsgegenprobe am Abend bestätigt.
- Echtes Referenzbild: https://cdn.shopify.com/s/files/1/0943/6856/3585/files/680d1ad3-95b3-47bd-9522-899efd79a301.jpg?v=1788153090 — 1920 × 1919; frisch geladen, SHA-256 `bb5526ce54c7eca8ac2bb38bb720d53a590a97e6df5bc1904de9cef8e8544b5d`.
- Gezielt alle 13 Medien dieses Produkts gelesen, keine weitere Seite. Genau ein Shopify-Video `gid://shopify/Video/77496185356679`, READY; keine neue hochwertige Quelle in diesem begrenzten Mediensatz.
- Original: https://cdn.shopify.com/videos/c/o/v/6490c6357dae4df69bb910178acb2912.mp4 — 960 × 540, 25 fps, 27.960 s, 699 Bilder, ca. 0.95 Mbit/s; SHA-256 `2bb28156f28beed60f7db0980e870fff89c5e0648911a06ab91324f27fdf1d57`. Ableitungen nur 852 × 480. Quelle im Oktober angelegt; keine ungeprüften Juni-Clips verwenden.

**Konkrete Produktionsblocker:** Zuordnung des sichtbaren Motivsets zur tatsächlich verkauften Default-Ausführung und kommerzielle Bearbeitungs-/Social-Werberechte für den Film sind nicht belegt. Das 540p/25-fps-Material liefert zudem keine native Premium-Hochkantauflösung. Benötigt werden passendes hochwertiges Originalmaterial oder ein kontrollierter Ergänzungsdreh. Kein generischer Stock, keine erfundene Handlung, keine Foto-Zoom-Slideshow als Ersatz. Verfügbarkeit/Kauf-/Gratis-Flags bei CJ sind kein Lizenznachweis.

### Präziser 18-Sekunden-Schnittplan

Ziel 1080 × 1920, flüssig 30 fps, Premium-Cream/Taupe, kontrolliertes Licht, konsistente Farbkorrektur, präziser Schnitt. Keine Stimme. [Maschinenlesbarer Schnittplan](MASTER-CUT-PLAN.json); weiterhin Entwurf, keine MP4.

| Masterzeit | Quelle, exklusives Ende | Bild/Schnitt und Overlay |
|---|---|---|
| 0.00–2.00 | 20.52–22.52 | Hook A: tatsächliche Projektion; «Dein Raum. Neues Licht.» |
| 2.00–7.60 | 3.00–8.60 | Bedienung, quadratischer Crop x=300/y=0/w=540/h=540. «Sternenlicht-Projektor», ab Master 4.60 «Aus der Nähe entdecken.» |
| 7.60–12.40 | 12.36–17.16 | Projektion, Crop x=210; «Für besondere Lichtmomente.» |
| 12.40–14.00 | 17.20–18.80 | Produktdetail ohne Text über der Linse. |
| 14.00–18.00 | 23.52–27.52 | CTA «Produkt ansehen»; «CHF 34.90 · luxestyle.ch». Preis vor Verwendung neu prüfen. |

Hook B ist nur eine alternative Eröffnung desselben Masters: Quelle 3.48–4.48 Bedienung mit Crop x=300, danach 20.52–21.52 Projektion mit x=210; Text «Licht im Detail.». Zuerst eine finale Master-Fassung abnehmen, keine Variantenserie erzeugen.

Detail 17.20–18.80 ersetzt den früheren ungeeigneten Bereich 17.00–20.00: vermeidet einen Quell-Zwischenschnitt und das späte Hauben-Abheben. Bedienungs-Crop x=300 behält mehr Hand als x=210, ergänzt aber keine im Original abgeschnittenen Bildteile. Alle Grenzen auf echten 25-fps-Bildern; keine erfundene KI-Bewegung. Cream `#F4F0E9`, Taupe `#8B796A`, Text `#302B27`. Geplantes 900er Bildfenster x=90/y=420; Text innerhalb x=96–900/y=460–1380. Diese Geometrie ist keine Prüfung eines fertigen Exports.

**Einzige erlaubte Musik:** `automation/music/luxe-premium.wav`. Lokal wiederhergestellt und mit aktuellem Repo abgeglichen: SHA-256 `a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688`, Git-Blob `61de48704b2b3ae22fb028e6cf0a3c88e4826a7c`, 11'343'950 Bytes, 44.1 kHz Stereo, 64.308 s. Repo-Credits/FluidSynth-/GM-Herkunft geprüft; vor Verwendung Datei und kommerzielle Rechte erneut gegenprüfen. Das ersetzt keine Hörabnahme. Keine V2/V3-Musik und kein Voiceover aus Altclips übernehmen.

[Sechs aktuelle Plattformtexte mit eindeutigen Produkt-UTMs](PLATFORM-COPY.md). Instagram/TikTok brauchen ein verifiziertes Bio-Ziel; Caption-Links nicht als klickbar darstellen. Pinterest-Board unbekannt, nicht erfinden. YouTube-Zielgruppe/Made-for-kids ungeklärt. Diese fehlenden Angaben blockieren jeweils den betreffenden Kanal.

## Planung, Schutzregeln und Kontinuität

Planfenster 18.–24.10. am Abend gelesen: sechs Entwürfe, alle `draft=true`, global `autoPublish=false`, Instagram ebenfalls false. Provider-PENDING ist kein Publikationsbeleg.

| Post-ID | UUID | Zeitpunkt Europe/Zurich | Inhalt |
|---|---|---|---|
| 398726093 | -1477230028740210853 | 18.10. 18:30, inzwischen vergangen | Tasche |
| 398780796 | -8605894141948965916 | 18.10. 18:45, inzwischen vergangen | Tasche, inhaltliche Überschneidung |
| 398726684 | 4898581426697749305 | 19.10. 18:30 | Hasen-Wecker |
| 398780820 | -4173766366821857517 | 19.10. 18:45 | Hasen-Wecker, inhaltliche Überschneidung |
| 398915997 | 2789149365522222304 | 20.10. 10:00 | Alter 15-s-Projektorentwurf, kein neuer 18-s-Master |
| 398915679 | -5073672472074043374 | 21.10. 10:00 | Hundegeschirr |

22.–24.10. ohne Einträge; Threads/Pinterest/YouTube ohne Einträge im Fenster. Planungswerkzeug schliesst publizierte Posts aus: daraus keine leere Vergangenheit ableiten. Vier Sprachfassungen und zwei weitere ungeprüfte Altmedien erfüllen die aktuellen Bedingungen nicht. Keine Mindestzahl an Posts erzwingen.

Vor jedem möglichen Push: aktuelle Identitäten, Produkt ACTIVE, nicht leere gültige Tags, Produkt-/Varianten-ID, CHF-Preis, echtes Bild, Tracking/Policy und Storefront-Kaufbarkeit prüfen. `automation/lib/kanal_sperren.mjs` verwenden; zusätzlich jedes `rueckhol` sperrt neue Social-Ausspielung. Fehlende/leere/ungültige Tags sperren. Weitere Sperren u.a. `nicht-bewerben`, `18plus`, `adult`, `compliance-pruefen`, `social-pause`, `-raus-`, `marge-verlust`, `medizinprodukt`, `nicht-versendbar`. Den breiteren Social-Auftrag nicht durch Entfernen von Tags oder Verändern des allgemeinen Repo-Wächters umgehen.

Höchstens eine inhaltlich neue geeignete Master-Veröffentlichung pro Kanal und Lauf. Vor Neuanlage den letzten beständigen Master-/Kanal-Beleg und gezielt dessen Historie prüfen, auch ausserhalb des 7-Tage-Fensters. Ein bestehender passender Entwurf ist einer Kopie vorzuziehen. Vor Update Original mit allen Feldern lesen, expliziten Diff und Kollisionsprüfung erstellen; künftigen geeigneten Slot mit bestätigten Bestzeiten verwenden. Für einen tatsächlich zugelassenen konkreten Post `draft=false`, global und je nötigem Kanal `autoPublish=true` setzen; keine sechs alten Entwürfe pauschal aktivieren.

Nach Write jeden Kanal getrennt zurücklesen: UUID/alte-neue numerische ID, Zeitpunkt/Zeitzone, Text, tatsächliche MP4, Flags und gelieferter Kanalzustand; Plattform-ID/URL speichern, falls geliefert. Globale ID/Status beweist nicht alle Plattformen. Nur bestätigter Published-Status ist «veröffentlicht», davor «terminiert»/«Entwurf». Unklarer Write = unknown; keine blinden Retries oder Ersatzposts. Bekannte Identität nicht wegen leerer Rücklesung löschen. Stabile UUID kann numerischen ID-Wechsel zuordnen.

Publikationsregister pro `masterId + brandId + Kanal`: Produkt/Variante, SHA-256 tatsächlicher MP4, ggf. Export-Hash, Metricool-ID/UUID, Zeitpunkt/Zeitzone, Status und kanalbezogene Belege. Neue URL/UUID/Queue-ID/Export-Hash macht denselben Film nicht zu neuem Inhalt. Fehlendes/unlesbares/beschädigtes Register = unbekannte Vergangenheit, nicht leer. Erstinitialisierung nur ausdrücklich mit begrenztem Master-/Marken-/Kanal-Scope und dokumentierter Gegenprüfung; vorhandenes Register niemals zurücksetzen. Locks/Checkpoints erhalten; inflight/unknown/uncertain nicht erneut senden.

Der lokale Registerhelfer ist **nicht deployt und kein als dauerhaft verfügbar bestätigtes Register**. Kein operatives Ledger initialisiert. Die Aufgabe enthält die Regel, das beweist keine technische Integration des Helfers. Repo-Publisher erst nach aktueller Code-/Credential-/Identitäts-/Queue-/Schutzregelprüfung nutzen. `metricool-schedule.yml` ist manuell, Standard Dry-run; nicht als laufenden dreimal täglichen Repo-Cron darstellen. Die drei Fenster gehören zur vorhandenen ChatGPT-Aufgabe.

## Tagesdaten: einmal am Tag, Lücken bleiben unbekannt

Die folgenden kleinen Metricool-Abfragen wurden am 18.10. morgens nach Entdeckung gültiger IDs für 11.–17.10. ausgeführt und abends wiederverwendet, nicht neu erhoben. Umfangreiche Reports höchstens einmal täglich, sofern kein neuer Befund eine gezielte Gegenprüfung rechtfertigt.

| Kanal | Sichtbarkeit | Interaktionen und Abdeckung |
|---|---|---|
| Instagram | 1'652 Account-Ansichten, IGEV05, 7/7 Tage | 22 Post-/Reel-Interaktionen, IGEV38, nur 11.–15.; 16./17. unbekannt |
| TikTok | 4'765 Views, TKEV02, 6/7 Tage | 23 Interaktionen, TKEV06; 16. unbekannt. Views beziehen sich auf im Zeitraum gepostete Videos. |
| Facebook | 1'320 Content-Views, FBEV49, 7/7 Tage | Wocheninteraktionen FBEV34 unbekannt |
| Threads | Nur Teilwert 1 Ansicht am 17., THEV06 | Wocheninteraktionen THEV05 unbekannt |
| Pinterest | Teilwert 7'590 Impressionen, PIEV01, nur 11.–15. | Teilwert 135 Interaktionen, PIEV04; 16./17. unbekannt |
| YouTube | Teilwert 2'304 Views, YTEV02, nur 11.–15. | Teilwerte 34 Likes/1 Share, YTEV14/18; 16./17. unbekannt |

Nicht kanalübergreifend zu einer Erfolgsquote vermischen, keine Verkäufe oder verlässliches Ranking daraus ableiten. Fehler/Auth/429/Quota/Transport niemals als 0, leere Daten oder 404 ausgeben.

Klaviyo frisch identifiziert als LuxeStyle CH, Konto `XWqMAD`, URL luxestyle.ch, Europe/Zurich, Kontowährung **USD**; Shop **CHF** getrennt halten. Placed-Order-Metrik `W7XTVD` vor dem heutigen Flow-Report entdeckt. Erfolgreich leerer Flow-Report und Gegenprobe ergeben unbekannte Flow-Kennzahlen, keine Null-Conversions. Zeitraum 11.–17.10. Schweizer Zeit: vier Placed-Order- und 18 Checkout-Started-Ereignisse; keine eindeutigen Käufer oder belastbare Funnelrate. Erfasste Nullwerte bei Added-to-Cart/Email-Subscribed beweisen keine tatsächliche Inaktivität.

- Alter Abandoned Checkout `Vse76a`: draft. Separater neuerer Recovery `XEGbTB`: live, Mail nach 1 h und 23 h, Placed-Order-Ausschluss und Smart Sending. **Nicht Vse76a zusätzlich aktivieren oder Recovery als fehlend darstellen.**
- Welcome `VbLQj6`: live, Liste `T2VHfu` mit vier Profilen/single opt-in im Morgen-Snapshot; Capture-Vollständigkeit unbekannt. Leere Forms-API beweist kein fehlendes Formular, öffentlicher Newsletter existiert.
- Post-Purchase `RnTvsY`: live; Bestätigungsaktion draft, Review-Aktion live mit echtem Delay 21 Tage trotz T+10-Name. Keine Flow-Änderung vorgenommen.
- Frühere acht Shop-Bestellungen/CHF 356.68 und acht Placed-Order-Ereignisse für den früheren abgefragten Rahmen sind datierte Vorbefunde, keine heutige Umsatzmessung. Nicht pauschal behaupten, Käufe oder Bestell-Sync fehlten. Einzelauftragsabgleich separat.
- Enge neue Bestellprobe 18.10., 19:06:49 Schweizer Zeit: keine neuen bezahlten Nicht-Testbestellungen seit 08:21. Kein Nachweis fehlender historischer Käufe und keine Social-Attribution.

## Genau eine Verkaufsverbesserung: vier bereits genehmigte DNS-Ergänzungen

Klaviyo `send.luxestyle.ch` bleibt pending. Letzte öffentliche Resolver-Gegenprobe 18.10., ca. 19:05 Schweizer Zeit: drei CNAME-Namen NXDOMAIN, Root-TXT erfolgreich gelesen ohne erwarteten Klaviyo-Wert. DMARC/SPF/Zoho/TikTok vorhanden. Das ist keine vollständige autoritative Zone. Eine frühere leere Sending-Domains-Liste ist durch den aktuellen pending-Domain-Befund überholt.

| Typ | Host für luxestyle.ch | Ziel/Wert |
|---|---|---|
| CNAME | send | 3848818023763335087.klaviyodns.com |
| CNAME | mtd1._domainkey | mtd1._domainkey.3848818023763335087.klaviyodns.com |
| CNAME | mtd2._domainkey | mtd2._domainkey.3848818023763335087.klaviyodns.com |
| TXT | @ | klaviyo-site-verification=XWqMAD |

Genehmigt, nicht umgesetzt. Nameserver `dns1.registrar-servers.com`/`dns2.registrar-servers.com` deuten auf Namecheap BasicDNS, beweisen aber weder Registrar-/Kontozugriff noch vollständige Zone. Es fehlt authentifizierter DNS-Schreibzugang; Anfrage nach Anbieter und sicherer Zugangseinrichtung ist offen. Keine Passwörter/API-Schlüssel im Chat verlangen. Ein anderer Claude-Worker kann andere legitime Zugänge haben: dort frisch prüfen, keine Umgehung.

Nach Zugang: vollständige autorisierte Zone lesen und sichern, Erhaltungs-Diff gegenprüfen, nur diese vier Ergänzungen anwenden und zurücklesen. Bestehende SPF/DMARC/Zoho/TikTok und ungesehene Records erhalten. `setHosts` kann die gesamte Zone ersetzen; niemals aus öffentlicher Stichprobe einen Vollzonen-Replace bauen. Keine weiteren Änderungen, keine Domain-Aktivierung, Flow-Aktivierung oder Testmail. DNS-Authentifizierung ist kein garantierter Kaufhebel.

## Suche, Merchant und Conversion

Verkaufspriorität: Suche/SEO, tatsächlich erreichbare Ranking-Landeseiten, Google-Shopping-Ausschlüsse, belegte Masse/Produktinformationen und Bestell-Sync vor Postingvolumen.

- Windsor-Zugang zuletzt nur Google Merchant `5797470070`/LuxeStyle CH; Search Console/Semrush dort nicht verbunden. Kein aktueller Ranking-/Suchbegriffbericht. Historisches `dropship/SEO-SEMRUSH-BEFUND.md` nicht als heutigen Befund wiedergeben.
- Sechs explizit geprüfte Produkt-/Collection-URLs lieferten am Vormittag HTTP 200 mit korrektem Canonical: kein daraus begründeter aktueller 404-Fix. `dropship/CHANCEN-LIVE-ABGLEICH.md` enthält spätere Korrekturen zur alten Chancenliste.
- Negative Merchant-Zähler machen die gesamte betroffene Zeile unbrauchbar, auch positive Felder derselben Zeile verwerfen. Keine Feed-Änderung daraus.
- Frühere gezielte Stichprobe 12 cj-real-Produkte, zwei Shopping_ads-Ausschlüsse: weder Katalogquote noch Free-Listings-Ausschluss ableiten. Fehlende GTIN rechtfertigt nicht automatisch `identifier_exists=false`.
- Drucker-/Ballettstichprobe tatsächlich `Shopping_ads` ausgeschlossen; Free Listings unbekannt. Möbelfolie/Flasche/Drucker/Ballett tragen rueckhol und bleiben für neue Social-Ausspielung blockiert.
- Produktbeschreibung des Projektors: lokaler enger Diff entfernt mehrdeutige Aussagen über modellabhängige Lade-/Musik-/Bluetooth-/Filmset-Funktionen bei nur einer Default-Variante. Nicht angewendet; übrige technische Aussagen dadurch nicht bestätigt.
- Lokaler Theme-Diff für Folienprodukt `15449480135041`: bestehender Fallback labelt letzte Zahl aus 500 × 90 cm als «Masse»; Entwurf macht produktbezogen daraus «Breite 90 cm». Nicht live angewendet. Extrahiertes Liquid und neue de/en-Keys validiert; komplette Template-Validierung wegen lokal fehlendem Kontext nicht abschliessend möglich. Kein pauschales «Theme vollständig validiert».
- PR [2669](https://github.com/allengchour-glitch/aban-news-landing/pull/2669) wurde später live als am 17.10. gemergt bestätigt. Die frühere Aussage «noch Entwurfs-PR» ist überholt. Merge ist kein Nachweis eines aktiven Deployments. Bewertungen-/CJ-Punktezahlen aus parallelen Claude-Notizen wurden hier nicht unabhängig bestätigt; keine Werbeaussagen daraus übernehmen.

## Lokale Arbeit ist nicht automatisch in der nächsten Session verfügbar

Die folgenden Dateien existierten in dieser Codex-Arbeitsumgebung. Diese Übergabe bewahrt Wissen, Schnittplan und Texte; sie lädt diese lokalen Code-/Testdateien nicht als Runtime-Code hoch. Fehlende lokale Pfade in einer anderen Session beweisen weder fehlende Connectoren noch fertige Medien. Vor Integration Quellversion, Diff, Tests und echten Speicherort prüfen.

| Lokaler Entwurf unter /workspace/luxestyle-review/ | Geprüfter Umfang, kein Deployment |
|---|---|
| `sales-improvements-20261018/code/preflight/after/` | Content-Preflight: 20 Tests grün; fehlende/ungültige Tags und jedes rueckhol sperren, 15–20 s; bleibt bewusst review-only, kein Autopublish-Enabler. |
| `conversion-next-20261018/code/seo_landing_preflight.mjs` | Korrigierter jüngster SEO-Prüfer: 35 Tests grün; Relative-Canonical-/Template-/Input-Output-Aliasfehler behoben. Maximal sechs explizite LuxeStyle-URLs, begrenzte Versuche; Auth/429/Transport unbekannt statt 404. Älterer Entwurf ersetzt. |
| `next-improvements-20261018/automation/master_publication_ledger.mjs` | 12 aussagekräftige Offline-Tests grün, inklusive konkurrierender Prozesse; Lock/fsync/atomarer Rename, stabile Master-/Kanal-Identität, Unknown-/UUID-/ID-Wechsel behandelt. Kein operatives Register angelegt, keine dauerhafte workerübergreifende Verfügbarkeit bestätigt. |
| `next-improvements-20261018/source/cj_video_proof_parser.mjs` | Vier Tests grün; produktbegrenzter reiner CJ-Leseplan, kein Auth-/Kauf-/Download-Job ausgeführt. |
| `conversion-next-20261018/master/description.diff`, `conversion-next-20261018/theme/` | Beschreibung/Theme nur Diffs zur Freigabe, keine Shopify-Writes. |

CJ-Leseplan nach Prüfung legitimer Credentials/Quota: einmal `GET /api2.0/v1/product/query?pid=<bestätigte PID>&features=enable_video` (Erfolg `result:true,code:200`), dann genau dieses bestätigte Produkt über readonly `POST /api2.0/v1/product/queryVideosByProductId` (Erfolg `success:true,code:0`). `1477820492730732544` ist nur aus Import-SKU abgeleiteter PID-Kandidat, keine bestätigte CJ-Varianten-SKU. Produkt-/Videoantwortformat unterscheiden. Kosten-/Kauf-/Gratis-Flags sind keine Bearbeitungs-/Werbelizenz. Vorhandenes `cj_category_fill.mjs` kann Shopify schreiben/publizieren: nicht als vermeintlichen Read-Job starten.

Weitere lokale Nachweise: `evening-check-20261018/ABENDPRUEFUNG.md` und `content/MASTER.md`, `owner-review-20261018/metricool/BERICHT.md`, `owner-review-20261018/klaviyo/report.md`, `dns-approved-20261018/authorized-change.json` und `STATUS.md`, `next-improvements-20261018/quality/BERICHT.md`. Ältere lokale Sammeldateien enthalten widersprüchliche historische Absätze; den neuesten datierten Stand verwenden.

## Nächster sinnvoller Schritt für Claude

1. Diese Übergabe und die beiden Anlagen lesen; aktuelle Inhabervorgaben und verfügbare legitime Zugänge gegenprüfen. Bestehende Aufgabe/Queue nicht duplizieren.
2. Für denselben Master exakte Produkt-/Motivset-Zuordnung, schriftlich nachvollziehbare kommerzielle Bearbeitungs-/Werberechte und hochwertige Quelle beschaffen beziehungsweise einen konkreten Ergänzungsdreh vorbereiten. Niemanden ohne ausdrücklichen Auftrag anschreiben, keine Käufe/Renders auslösen.
3. Erst eine hochwertige Master-MP4 fertigstellen, visuell/akustisch und auf Plattform-Crops prüfen und dem Inhaber vorlegen. Bis dahin keine alten Filme als Ersatz aktivieren.
4. Beim bereitgestellten sicheren DNS-Zugang ausschliesslich die vier bereits genehmigten Ergänzungen mit Vollzonen-Sicherung/Diff durchführen. Zugangsmangel berichten, nicht erneut dieselbe Freigabe verlangen.
5. Sonstige Conversion-/SEO-/Feed-/Flow-Änderungen als konkrete belegte Diffs zur Freigabe vorbereiten. Käufe nur durch aktuelle Shopify-/Bestellbelege melden; keine Kaufgarantie und kein Verkauf aus Views ableiten.

## Dokumentationsablage

Root-`CLAUDE.md` und `SHARED-MEMORY.md` verlinken diese Übergabe auf demselben Dokumentationsbranch. Der alte feste Branch `claude/luxestyle-product-CizQ6` wurde nur lesend verglichen: 3271 Commits voraus und 2477 hinter dem geprüften main, mit zahlreichen anderen Änderungen. Er wird für diese Wissensübergabe weder zurückgesetzt noch pauschal gemergt. Die getrennte Ablage verhindert die Vermischung mit Runtime-/Queue-Änderungen. Ein Branch/PR ist nicht automatisch main oder ein Deployment.
