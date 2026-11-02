# LuxeStyle: Merchant-Fortschritt vom 02.11.2026

GEMESSEN: Zwei konkrete Bildkorrekturen sind im Shop umgesetzt und sowohl nativ als auch über die öffentlichen Produktdaten bestätigt:

- [Goldene Smartwatch](https://luxestyle.ch/products/smartwatch-mit-touchscreen-bluetooth-herzfrequ-377728?variant=67801774555527): Das Variantenbild mit **217 × 245 Pixeln** ist durch das bereits vorhandene passende Original mit **1276 × 1702 Pixeln** ersetzt. Geändert wurde nur die Bildzuordnung dieser goldenen Variante.
- [Laser-Entfernungsmessgerät](https://luxestyle.ch/products/laser-entfernungsmessgerat-456064?variant=55904981713281): Die vorhandene dritte Aufnahme mit **1080 × 1080 Pixeln** steht jetzt an erster Stelle. Sie zeigt das Gerät ohne die bisherigen zusätzlichen Werbegrafiken. Der Shopify-Auftrag zur Neusortierung ist abgeschlossen; die relative Reihenfolge der übrigen Bilder bleibt erhalten.

Es wurden ausschliesslich vorhandene Originalaufnahmen verwendet, keine neuen Bilder hochgeladen oder bearbeitet. Preise, SKUs, Tags, Produktstatus, Inventardaten und Beschreibungen sind unverändert. **Eine erneute Freigabe durch Google ist noch nicht belegt.**

GEMESSEN in den vier gelieferten Dateien: Alle Exporte wurden vollständig geprüft: **4’390 Rohzeilen**, nach Zusammenfassen identischer Exportzeilen **4’386 unterschiedliche Problemkontexte** zu **1’592 Angebots-IDs**. Das sind die gelieferten Dateiausschnitte, keine Vollkatalogzahlen. Je nach Sprache, Land und Marketingkanal kann dieselbe Angebots-ID mehrfach vorkommen.

| Meldung in diesen Dateien | Unterschiedliche Angebots-IDs (GEMESSEN) |
|---|---:|
| Preis fehlt | 1’211 |
| Bildüberlagerung | 277 |
| Bild zu klein | 75 |
| Produktseite nicht erreichbar | 30 |
| Verfügbarkeit fehlt | 13 |
| CSS-Anzeigenkapazität | 32 |

Die Zeilen der Tabelle sind nicht addierbar: Ein Angebot kann mehrere Meldungen haben. Die CSS-Meldungen betreffen Shopping-Anzeigen beziehungsweise Remarketing; daraus folgt keine pauschale Sperre kostenloser Einträge.

Zusätzlich ist eine eng begrenzte Ausnahmeliste mit **30 Kontextzeilen zu 13 Angeboten** vorbereitet: zwölf Angebote gehören zur aktuell als Entwurf geführten Hose; die Varianten-ID eines alten Pad-Angebots wird in der gezielten nativen Abfrage aktuell nicht mehr geliefert. Diese Liste ist ein Prüfplan, kein Feed-Upload. Es wurden daraus keine Merchant-Einträge entfernt oder Preise beziehungsweise Verfügbarkeiten erfunden.

Der bereits geprüfte Auth-Fix in [PR #2830](https://github.com/allengchour-glitch/aban-news-landing/pull/2830) steht weiterhin als offener Entwurf und ist nicht gemergt. Seine Übernahme oder eine produktive Feed-Ausführung wird nicht als erledigt bezeichnet.

Für die gezielte Preis- und Verfügbarkeitskorrektur brauche ich als Nächstes den **Namen der aktiven primären Datenquelle**, die Merchant bei einem betroffenen Preisangebot anzeigt. Die Artikel-IDs liegen jetzt vor. Alle vier Exporte enthalten weder diesen Quellennamen noch den eingereichten Produktlink. Versandmeldungen fehlen in diesen Dateiausschnitten; ihr Zustand bleibt deshalb unbekannt. Ein Feedlabel wie `DE` belegt zudem kein Zielland: Die Daten enthalten solche Angebote auch für Schweiz und Liechtenstein.

[Strukturierte Belege](MERCHANT-EXPORT-BELEGE-20261102-R59.json) · [Begrenzte Ausnahmeliste – kein Upload](GEKLAERTE-AUSNAHMEN-20261102-R59-KEIN-UPLOAD.csv).
