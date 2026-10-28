# LuxeStyle: Produktangaben weiterbearbeitet

Stand: 29.10.2026, Europe/Zurich. Task `product-attribute-completeness`. Claude koordiniert. Das Paket enthält lokal entwickelte und geprüfte Codekorrekturen sowie Produktentwürfe; keine produktive Übernahme oder Kenntnisnahme durch Claude bestätigt.

## Was neu und belegt ist

| Bereich | Ergebnis |
|---|---|
| Fortschrittsberechnung | GEMESSEN: Fehlende Kandidatenliste ergab im Original fälschlich 100 %, fehlende Ledger falsche Nullen. Lokal korrigiert: unbekannte Quellen bleiben null, mit sichtbarem Grund. Der Varianten-Arbeitsvorrat wird nicht als Farbe-/Grösse-Katalogquote ausgegeben. |
| Materialqualität | GEMESSEN: «Seide (Imitat)» wurde zu Seide; CJ «titanium steel» umging die deutsche Sperre. Lokal korrigiert, einschliesslich widersprechender zweiter Materialzeilen/CJ-Fallbacks und letzter Prüfung vor Planaufnahme. Eindeutige Stoffe bleiben zulässig. |
| Material-Nachträger | GEMESSEN: Folgepläne überschrieben bisher Altwerte. Neue Pläne werden exklusiv angelegt, identische wiederverwendet und abweichende blockiert. Manuelle Belege durchlaufen Parser und Konfliktprüfung; vorhandene CJ-Hinweise werden auch bei Übersetzungen berücksichtigt. |
| Aktuelle Produkte | GEMESSEN: zwei Auswahltext-Diffs mit unveränderten 13 Variantenbindungen vorbereitet. Dritter gezielter Fall: Baumwolle im Google-Feld widerspricht den nicht eindeutig zugeordneten Materialangaben der Schneestiefel. Kein blindes Ersetzen. |
| Zugriff und Identität | GEMESSEN: Shopify luxestyle.ch/CHF und Metricool 6227837/Europe/Zurich samt sechs vorgegebenen Kanalidentitäten bestätigt. Aktuelle Cloud-Umgebung hat keine gebundenen CJ-/Shopify-Laufzeit-Zugangswerte; bestehende Repo-Helfer sind vorhanden. |

## Paket und Integration

- [Übertragbarer Patch](PRODUKTANGABEN-KORREKTUREN-20261029.patch)
- [Codepaket mit Originalhashes und vollständigen Kandidatdateien](CODEPAKET-PRODUKTANGABEN-20261029.json)
- [Aktuelle Produktbelege und genaue Auswahltext-Diffs](PRODUKTANGABEN-GEGENPROBEN-20261029.json)
- [Unveränderliches Reviewpaket](aufgaben/product-attribute-completeness.r1.packet.json)

Gepinnte Basis und erneut gelesener main: `b708c809c2b9ef074bf48999fdfe5b28d0ee3bbe`. Sieben Zielpfade: Materialbibliothek und vorhandener Test; Material-Runner und neuer isolierter Lauftest; Fortschrittsbericht und neuer isolierter Test; bestehender LuxeStyle-Testworkflow mit genau zwei zusätzlichen Testbefehlen. Keine Zeitplan-, Freigabe- oder Produktdatenänderung im Codepatch.

Vor Integration alle erwarteten Originalhashes frisch gegen den tatsächlichen Zielstand prüfen. Materialbibliothek und Runner gemeinsam übernehmen; die neue Laufprüfung benötigt die korrigierte Bibliothek. Bestehendes Kooperationspaket R3 bleibt unverändert und getrennt. Dessen Workflow-Diff kann denselben Dateipfad betreffen: die Testzeilen im aktuellen Stand zusammenführen, nie die gesamte Workflowdatei aus einem alten Paket blind ersetzen.

## Begrenzte Validierung

GEMESSEN auf Node 24.19.0: 190 Materialprüfungen + 12 Fortschrittsprüfungen + 16 isolierte Runnerprüfungen = **218 bestanden, 0 fehlgeschlagen**. Sechs JavaScript-Dateien syntaktisch geprüft; YAML geparst und beide neuen Testbefehle genau einmal vorhanden; gesamter Patch gegen die Originaldateien anwendbar.

Die neuen Gegenproben scheitern am fehlerhaften Original: Material 36 Fehler, Fortschritt 9 Fehler, Runner 10 Fehler. Beim Runner wurde dieselbe korrigierte Bibliothek verwendet, um die Runnerwirkung getrennt zu prüfen. Fortschritts-Mutanten «fehlender Nenner = fertig» und «SKU_GESETZT = nachgezogene Auswahl» wurden erkannt. Diese roten Gegenproben sind keine produktiven Fehlerzählungen.

`bash automation/ci_simulation.sh` wurde auch am zusammengeführten lokalen Snapshot versucht und endet vor den Tests mit `unshare: unshare failed: Operation not permitted`. Node 22 und vollständige CI auf einem integrierten Commit bleiben offen. Der lokale Snapshot ist kein vollständiger Git-Checkout. Kein PR, Merge, Workflowstart, Deployment oder LIVE-Produktlauf durch Codex.

Der Runner ist damit **nicht als vollständig produktionsbereit bestätigt**: atomare `metafieldsSet`-Fehlerzählung, frische Wertegegenprobe/compareDigest, Quellenalter, Rücklesen jedes einzelnen Writes und ein tatsächliche Änderungen belegender Rücksetz-Ledger benötigen vor Live-Nutzung weitere Prüfung. Der Fortschrittsseiten-Verbraucher muss null als unbekannt darstellen; dessen Implementierung wurde nicht belegt. Parserregeln ersetzen kein Lieferantendatenblatt und erkennen nicht beliebige Widersprüche im Fliesstext.

## Testnebenwirkung transparent festgehalten

Ein früher lokaler Nachstellungslauf schrieb künstliche Daten nach `/tmp/material_plan.jsonl` und entfernte den Pfad im damaligen Cleanup. Der Vorzustand wurde nicht geprüft und bleibt unbekannt; ein Verlust eines älteren Plans ist nicht nachgewiesen. Nachträglich war die Datei nicht vorhanden. Der korrigierte Test nutzt ausschliesslich eigene Fixture-Verzeichnisse, prüft zurückgelieferte Pfade vor dem Lesen und löscht nur sein eigenes Verzeichnis. Keine echte Shopify-/CJ-Anfrage oder Mutation erfolgte dabei.

## Konkrete Produktarbeit und nächster Schritt



| Produkt | Aktueller Befund | Vorbereiteter Diff |
|---|---|---|
| [Ladegerät Typ-C](https://luxestyle.ch/products/ladegerat-typ-c-eu-standard-613900) · 15447560520065 | Option «Farbe» enthält sechs EU-Watt-Bezeichnungen | Genau diesen Optionsnamen in «Ausführung» ändern. Alle sechs Werte, Varianten-IDs, SKUs und CHF-15.90-Preise erhalten. Die Bezeichnungen sind kein geprüfter Leistungs- oder Konformitätsnachweis. |
| [Plüschtier für Hunde](https://luxestyle.ch/products/schnuffel-und-quietsch-pluschtier-fur-hunde-618800) · 15446272016769 | Eine Option mischt Tiermotiv, Farbe und Höhe; zwei Werte sind englisch | Optionsname «Ausführung»; «Pink Elephant-21CM High» → «Rosa Elefant, 21 cm hoch», «Orange Elephant-21CM High» → «Orangefarbener Elefant, 21 cm hoch»; bei fünf deutschen Werten nur «Hoch» → «hoch». Alle sieben Varianten-IDs, SKUs und CHF-15.90-Preise erhalten. |

`AUSWAHLTEXT-DIFF.json` im Gegenprobenpaket enthält alle Option-/Wert-IDs und die 13 unveränderten Variantenbindungen. Keine Namenskollision; beide Variantenlisten vollständig, hasNextPage=false. Die eingebetteten 21 cm stammen aus dem vorhandenen Auswahltext, nicht aus einer neuen Messung. Die Änderung benennt die Auswahl verständlicher; sie ergänzt keine separat bestätigten Google-Farb-/Grössenattribute. Vor Anwendung frisch gegenlesen, nur die benannten Namen ändern, danach alle IDs/Preise/SKUs und Texte zurücklesen. Kein produktiver Writer gestartet.

## Materialkonflikt mit höherer Priorität

[Gefütterte Damen-Schneestiefel](https://luxestyle.ch/products/gefutterte-damen-schneestiefel-mit-kunstfellkr-601700), Produkt 15495118520705:

- Materialmetafeld `mm-google-shopping.material`: «Baumwolle», zuletzt geändert 27.10.2026 20:55:30 UTC.
- Aktuell gelesener Text: «Baumwollfutter»; Detailblock «Material: Kunststoff»; Sohle als Polyurethan bezeichnet. Diese Shoptexte sind widersprüchlich und keine unabhängige Lieferantenbestätigung.
- Drei Farbwerte Schwarz/Grau/Blau und neun Grössen 36–44 ergeben die 27 gelesenen Varianten. Zwei aktuelle Galeriebilder waren erreichbar (HTTP 200) und visuell geprüft: Produktfotos, keine Mass- oder Materialtabellen.
- Keine belegte Fusslängen-Zuordnung pro Grösse aus diesen Gegenproben. 23 cm Schaft und 3.5 cm Absatz stehen im bestehenden Text, wurden nicht unabhängig gemessen.

**Nächster Schritt:** aktuelles, exakt diesem Modell zugeordnetes Lieferantendatenblatt lesen und Obermaterial, Futter, Sohle sowie Grössen-/Fusslängentabelle getrennt abgleichen. «Baumwolle» weder pauschal als korrekt akzeptieren noch blind durch «Kunststoff» ersetzen. Der bestehende Material-Nachträger lässt deutsche Bestandswerte stehen; eine Quellenkorrektur ist ein eigener enger Diff.

Blocker: im aktuellen Lauf keine CJ-Laufzeit-Credentials gebunden. Vorhandene CJ-/Shopify-Helfer sind im Repo vorhanden; kein Connector wurde als fehlend behauptet oder neu installiert.

## Grenzen

Diese drei gezielten Fälle erlauben keine Fehlerquote für den Katalog. Die frühere Gegenprobe 8/8 belegte gespeicherte Werte, keine physische Materialrichtigkeit. Die bisherige grobe Material-Restschätzung 49.8 % stammt aus dem Vollabgleich vom 27.10.; heute nicht neu katalogweit gemessen. Für Farbe, Grösse und echte Masse bleibt eine vollständige aktuelle Restquote unbekannt.

Alle drei Produkte tragen rueckhol-0907. Daraus wurde keine Social-Ausspielung vorbereitet. Bestandszähler 0 wurde weder als ausverkauft noch als Lieferzusage ausgelegt. Kein Kaufbarkeitstest nötig, da keine Veröffentlichung oder Kauftransaktion ausgeführt wurde.

Nachweise: die vier gleichnamigen Abschnitte im verlinkten Gegenprobenpaket. GraphQL-Vorabvalidator meldete SKIPPED; die tatsächlichen read-only Abfragen wurden erfolgreich beantwortet.
