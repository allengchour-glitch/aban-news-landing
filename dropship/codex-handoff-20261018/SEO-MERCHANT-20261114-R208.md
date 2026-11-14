# LuxeStyle: SEO- und Merchant-Fortschritt, 14.11.2026 (R208)

**Tatsächlich umgesetzt:** eine frische, unveröffentlichte Kopie des aktuellen Live-Themes angelegt und darin einen eng begrenzten SEO-Fix gespeichert. **Noch nicht live:** kein Theme-Publish. Merchant wurde gezielt geprüft, nicht geändert.

Shopify LuxeStyle / luxestyle.ch / CHF und Metricool 6227837 / Europe/Zurich mit allen sechs erwarteten Kanalidentitäten wurden zu Beginn frisch bestätigt. Dieser ausdrückliche SEO-/Merchant-Auftrag ergänzt den R207-Lauf; Kennzahlen, Klaviyo, Bestellungen und die Social-Queue wurden dafür nicht nochmals gelesen. Kein neuer Social-Post, kein Render, kein Workflowstart oder Deployment.

## Gespeicherter SEO-Fix

Die tatsächliche Quelle ist jetzt belegt: `layout/theme.liquid` rendert `snippets/meta-tags.liquid`. Dort überschreibt ein Homepage-Zweig die Beschreibung mit pauschalen Lieferzeitangaben. Ein blindes Update von `Shop.description` hätte diesen Override nicht beseitigt.

Frische MAIN-Quelle: **213013037447, LuxeStyle – Schrift und Banner 02.11.2026**. Neue Kopie: **213991391623, LuxeStyle – SEO 14.11.2026**, weiterhin **UNPUBLISHED**. Die zwei betroffenen Quelldateien waren vor dem Write zwischen MAIN und Kopie checksumgleich. Keine ältere, inzwischen veraltete Theme-Kopie verwendet.

Genau zwei Dateien wurden über Admin GraphQL gespeichert, mit leerer Fehlerliste und danach vollständigem Inhalts-Readback:

- `config/settings_schema.json`: neues editierbares Textfeld unter «LuxeStyle SEO».
- `snippets/meta-tags.liquid`: nur die deutsche Startseite nutzt dieses Feld; Ausgabe einmal escaped.

Neuer Text für Meta-, Open-Graph- und Twitter-Beschreibung:

> Entdecke Mode, Wohnideen und ausgewählte Geschenke bei LuxeStyle. Vergleiche Varianten und Preise in CHF und finde etwas für deinen Alltag.

Eine mit Cookies verifizierte Vorschau bestätigt die richtige neue Theme-ID und alle drei Beschreibungen exakt. Titel und Canonical stimmen mit der Live-Seite überein. Französische Startseite und Nachttischlampen-Kategorieseite haben in der Vorschau identische geprüfte Head-Felder wie live. Der übrige Locale-Fallback, Produkt-/Artikel-/Canonical-/Titelcode und `settings_data.json` bleiben erhalten. Eine mobile Screenshot-Vorschau wurde geöffnet; daraus folgt keine vollständige CRO- oder Designabnahme. Keine Versandgrenze, Preise, Rabatte, Kundendomäne oder andere Shopkonfiguration geändert.

Die ersten öffentlichen Preview-Requests ohne Cookieverwaltung landeten beim MAIN-Theme und zählen ausdrücklich nicht als Vorschauabnahme. Erst der anschliessende Cookie-Read hat die neue ID und den neuen Text bewiesen. `theme_bash` war zuvor vor Ausführung gedrosselt; die unterstützte Admin-API hat die Quelle gelesen und den unveröffentlichten Patch gespeichert. Kein Live-Write und kein leeres/404-Ergebnis aus einer Drosselung abgeleitet.

Vor einem späteren Publish den dann aktuellen MAIN-Stand gegen diese Vorlage prüfen, damit zwischenzeitliche fremde Änderungen nicht zurückgesetzt werden. Der Shopify-Theme-Skill verlangt die ausdrückliche Bestätigung für die Veröffentlichung dieses Themes; bisher keine Veröffentlichung ausgeführt.

## Google-Index: zwei konkrete Seiten geprüft

| Seite | Aktueller Auskunftsstand aus Search Console |
|---|---|
| Startseite | Submitted and indexed / PASS; Google-Canonical passt; letzter Crawl 12.11.2026 |
| /collections/nachttischlampen | Submitted and indexed / PASS; Google-Canonical passt; letzter Crawl 31.10.2026 |

Beide Zielseiten wurden separat öffentlich mit HTTP 200 und passenden Canonicals gelesen. Google liefert einen Index-/Crawl-Snapshot, keine heutige Ranking-, Traffic- oder Umsatzsteigerung. Mobile Usability blieb VERDICT_UNSPECIFIED und ist unbekannt. Zwei Seiten sind keine Katalogvollprüfung. Keine erneute Indexierungsanforderung oder Sitemapänderung ohne belegten Anlass.

## Merchant: tatsächliche Quellen weiter eingegrenzt

Merchant-Konto **5797470070 / LuxeStyle CH** stimmt. Eine einzige kleine Produktseite mit fünf tatsächlichen Ressourcen und ein darauf basierender Einzelartikel-Read haben lesbare Produktressourcen, Primärquelle, Bild- und Produktlinks geliefert. Die zwei bekannten Nagellack-Offers waren nicht in dieser Teilstichprobe; daraus keine Katalogquote oder Nichtexistenz ableiten. Der gelesene andere Einzelartikel war zugelassen und wurde nicht geändert.

Die getrennte Windsor-Abfrage wurde auf gültige reine Produktfelder und zwei konkrete Offer-IDs begrenzt. Der alte Zeitbereich wurde vom Trial abgelehnt; die korrigierte zulässige Abfrage endete mit einem MCP-Timeout. Ergebnis unbekannt, keine Datenzeilen erhalten, kein weiterer Retry. Kein bezahlter Refresh und keine Interpretation als Null/404.

Ein aktueller Shopify-Read und anschliessend eine Schema-gestützte Abfrage genau zweier Variant-Knoten belegen jetzt:

| Variante | Tatsächlich zugeordnetes erstes Shopify-Medium |
|---|---|
| Modell 1 / 55877809340801 / CJYD273330501AZ | MediaImage 78014931960199, «Ansicht 9»; noch nicht visuell abgenommen |
| Modell 6 / 67652260430215 / CJYD273330506FU | MediaImage 78014932091271, «Ansicht 1»; beim Download kein sichtbares Text-Overlay |

Produkt 15448834736513 ist ACTIVE. Seine Tags enthalten `rueckhol-0907`: daraus wird keine neue Social-Ausspielung vorbereitet. Lagerzähler 0 wurden nicht als Ausverkaufsbeweis verwendet; keine Lieferzusage. Ein anderes Galerie-Bild zeigt sichtbar DT267, Farbfelder und Temperaturbeschriftungen. **Nicht belegt ist, dass Google für eines dieser beiden Offers dieses Bild aktuell verwendet.** Shopify-Medienzuordnung und sichtbare Overlayfreiheit beweisen zudem weder Rechte noch Produkt-/Farbtreue.

Konkreter verbleibender Merchant-Blocker: im authentifizierten Einzelartikel der beiden Offers den tatsächlich eingereichten primären `image_link` und die aktive Datenquelle lesen. Erst danach einen minimalen, variantengetreuen und rechtengeprüften Bild-Diff ausführen. Kein Blindtausch, kein pauschales Entfernen von Sperren oder Shopping-Ausschlüssen und keine aus fehlender GTIN erfundene `identifier_exists=false`-Änderung. Heute kein Feed- oder Produkt-Write und kein pauschaler Refresh/Resubmit.

## Nächster konkreter Schritt und Kontinuität

Zur Freigabe liegt jetzt der **konkrete gespeicherte SEO-Theme-Fix** vor. Vorherige R201-Projektor-Textkorrektur und R207-Aufnahmebrief bleiben eigene bestehende Entwürfe, keine heute neu umgesetzten Aktionen. Derselbe professionelle Master bleibt an geeignetem Bild-/Filmmaterial, Rechten und Endabnahme blockiert; keine Altclips oder Zoomserie als Ersatz.

R200-Tagesberichte, R207-Planung und R206-Sperren bleiben datierte Vorbefunde und werden hier nicht als frisch erneut geprüft oder eigene neue Auslieferungen ausgegeben. Kauf-Watch beendet; keine neue Bestellung abgefragt. Öffentliche CHF 50 / interne CHF 45, Kundendomäne, Budgets, Flows, DNS und bestehende 08/14/19-Läufe bleiben unverändert. Vier DNS-Records bleiben bereits genehmigt, der authentifizierte Writer ist weiterhin nicht bestätigt. 24 Aufgaben-IDs und Historie erhalten; Claude-Empfang ohne Beleg unbekannt.

Belege: [Theme und Render-QA](SEO-THEME-ENTWURF-20261114-R208.json), [Zwei-Datei-Diff](SEO-THEME-20261114-R208.patch), [Indexauskünfte](SEO-INDEXPRUEFUNG-20261114-R208.json), [Merchant-Quellen](MERCHANT-QUELLENABGLEICH-20261114-R208.json).
