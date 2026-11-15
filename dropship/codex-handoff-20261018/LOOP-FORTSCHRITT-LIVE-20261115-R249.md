# LuxeStyle CH – Fortschritt R249

Stand: 15. November 2026. Zusammenfassung aus den gespeicherten Shopify-, Merchant-Center-, öffentlichen Shop- und Metricool-Nachweisen. Keine weiteren externen Änderungen in diesem Abschlussbericht.

## Tatsächlich ausgeführte Änderungen

| System | Aktivität | Verifizierter Schutz / Ergebnis |
|---|---|---|
| Shopify | 10 Schreibvorgänge an 4 bestehenden Produkten; 19 bereits vorhandene Variant-Media-IDs zugeordnet, keine Uploads | 60 Varianten-IDs, 38 Optionswert-IDs, 36 Produktmedien sowie alle abgefragten Preise/SKUs/Bestands-/Tracking-/Inventarrichtlinien unverändert. Die 19 Bildzuordnungen stammen aus vorhandenen Medien; Farb-Mapping anhand Supplier-/Shopify-Bilddateien geprüft. Öffentliche Mobilprüfung nach Bildkorrektur für Rosa/64G und Schwarz/X6 bestätigt Variant-ID, Preis und passendes Hero-Bild. |
| Merchant Center | 9 Schreibvorgänge für 8 bestehende AUTOFEED-Angebote; Hauptquelle `10678939025` blieb primär, Ergänzungsquelle `10795447118` verwendet | Bestehende Angebote und übrige Attribute geschützt. Das Ergänzungsregister enthält nun 12 exakte Offer-Einträge. Kein neues Offer und keine neue Quelle. |
| Metricool | 46 geplante Einträge einmalig gelesen; keine Schreibvorgänge | Kein exakt identischer vollständiger Text-plus-Medien-Satz und keine wiederverwendete exakte Video-URL innerhalb desselben Kanals im betrachteten Wochenfenster gefunden. |

**Vier Shopify-Produkte**

- [Retro-Handheld-Konsole mit MP4-Player](https://luxestyle.ch/products/retro-handheld-konsole-fur-psp-und-gba-630400)
- [Retro Handheld Arcade Konsole X6](https://luxestyle.ch/products/retro-handheld-arcade-konsole-611600)
- [Klassischer Rucksack für Schule und Alltag](https://luxestyle.ch/products/klassischer-rucksack-fur-schule-und-alltag-217728)
- [Hundejacke mit Futter](https://luxestyle.ch/products/wetterfestes-hundehemd-148771)

Änderungen präzisierten Produkttitel, SEO, Beschreibungen und Auswahltexte. Spiele-/Kartenumfang beim Handheld bleibt offen; für X6 wird keine Fotofunktion bei Standardvarianten zugesichert. Rucksackmaterial nennt jetzt Nylon, Baumwolle und Leinen sowie Polyesterfutter ohne Mischungsanteile. Hundetext und Merchant-Beschreibung entfernen die unbelegte Wetterfestigkeitszusage und kennzeichnen Oxford, Futter und «PP Cotton» als Lieferantenangaben.

## Merchant Center: Status und Grenzen

Von den acht veränderten Angeboten sind **fünf für kostenlose Einträge in CH/LI genehmigt**. Vier davon haben keine Artikelprobleme im Einzelreadback. Bei der genehmigten Wandleuchte bleibt ein Zertifizierungshinweis mit Schweregrad `NOT_IMPACTED`; eine Zertifizierung oder Konformitätsfreigabe wird daraus nicht abgeleitet. Drei weitere Angebote zeigen nach der bestätigten Availability-Korrektur weiterhin `landing_page_pending_crawl` mit Schweregrad `DISAPPROVED`, Auflösung `pending_processing` und Ländern CH/LI unter pending. Ihre Genehmigung steht noch aus.

Der Hundebeschreibungstext wurde als neunter Merchant-Schreibvorgang am bestehenden Hundejacken-Angebot aktualisiert. Ein frischer Readback bestätigt den korrigierten Text, APPROVED CH/LI und `itemLevelIssues=[]`.

Im historischen R240-Teilausschnitt waren 144 fehlende Preis- und 19 Availability-Fälle erfasst. Über R247–R249 sind davon 7 Preis- und 5 Availability-Fälle gezielt korrigiert. Die übrigen 137 Preis- und 14 Availability-Fälle sind **aktuell nicht erneut verifiziert**. Der Ausschnitt ist keine globale Katalogmessung; weder eine globale Null-Fehler-Aussage noch eine Quote für alle Offers ist belegt.

Ausgewählte, jetzt exakt gebundene Angebote:

- [Rucksack, Grün mit Anhänger – CHF 17.90](https://luxestyle.ch/products/klassischer-rucksack-fur-schule-und-alltag-217728?variant=67843394535815&country=CH&currency=CHF)
- [Hundejacke, Grau/L – CHF 24.90](https://luxestyle.ch/products/wetterfestes-hundehemd-148771?variant=67866334691719&country=CH&currency=CHF)
- [Picknicktasche, Mattschwarz, Set 1 – CHF 21.90](https://luxestyle.ch/products/kuhl-und-picknicktasche-10l-615100?variant=67841454113159&country=CH&currency=CHF)
- [Wandleuchte, einflammig, Warmlicht – CHF 47.90](https://luxestyle.ch/products/wandlampe-modern-1-oder-2-kopf-220-v-620700?variant=67801648038279&country=CH&currency=CHF). Das ist eine bewusste Auswahl aus bestehenden Varianten, keine Rekonstruktion des früheren Offers; Zertifizierungshinweis bleibt `NOT_IMPACTED`.

Zur Picknicktasche nennt der rohe CJ-Lieferantendatensatz ausdrücklich 10 L. Die Beschreibung vermeidet darüber hinausgehende Leistungsversprechen zur Kühlwirkung.

## Konsolenbilder und Social-Planung

Die 19 Konsolen-Variantenverknüpfungen verwenden bestehende, zum jeweiligen Farb-SKU passende Shopify-Medien. Die öffentliche Mobilkontrolle erfolgte bei 390 × 844 px mit sichtbaren Auswahlklicks; die beiden nach dem ersten Durchlauf korrigierten Hero-Bilder passen nun zu den gewählten Varianten. Öffentliche IDs, Preise und SKU-Zuordnungen blieben unverändert.

Metricool: Die Momentaufnahme umfasst nur 15.–22. November 2026. Es wurden keine identischen vollständigen Caption-/Medienlisten-Dubletten je Kanal gefunden. Vier Sternenprojektor-Masterposts sind im Snapshot weiterhin `draft=true`, `autoPublish=false`, `PENDING`. Von sieben Audio-Holds ist einer als weiterhin gehaltener Threads-Entwurf sichtbar; sechs fehlen ausserhalb des Snapshot-Fensters, ihr aktueller Status ist unbekannt. Keine Veröffentlichung wird aus Queue-Status abgeleitet. Andere Medien-URLs, Re-Encodings und frühere Publikationshistorie sind dadurch nicht als duplikatfrei belegt. Technische aktive Planung: Instagram/Facebook/TikTok/Pinterest an jedem Datum 15.–22. November, Threads ohne aktiven Beitrag am 15. November, YouTube nur am 16./17. November aktiv. Fehlende explizite kanalbezogene Autopublish-Felder bleiben unbekannt. Dies ist keine nachträgliche Qualitäts-/Rechtefreigabe der übrigen Termine.

## Nächste Prüfschritte

1. Die drei noch crawl-ausstehenden Availability-Angebote nach dem Google-Crawl gezielt erneut lesen; die Genehmigung erst nach frischem Status behaupten.
2. Für die verbleibenden 137 Preis- und 14 Availability-Fälle eine eng abgegrenzte aktuelle Prüfung priorisieren, bevor daraus weitere Änderungen oder globale Aussagen abgeleitet werden.
3. Vor künftigen Preis-Overrides Variante, CHF-Preis und Bestellbarkeit erneut gegen Shopify und öffentliche Variant-URL prüfen. Eine feste Ergänzung kann bei späterer Preis-/Variantenänderung veralten; nie aus Mindestpreis oder Titel ableiten.
4. Die Schmuckbox mit grauer Armbandbox bleibt wegen ungeklärter Bildrechte zurückgestellt; bis zur Rechtebestätigung kein passendes Bild behaupten oder zuordnen.
5. Nicht im Metricool-Wochenfenster sichtbare Audio-Holds bleiben status-unbekannt; die vier sichtbaren Projektorposts bleiben Drafts ohne Auto-Publish. Vor Freigabe Rechte-/Audio-Nachweise und Kanalstatus gezielt prüfen.

## Dauerhafte Belege im Handoff-Branch

- [Gesamtbeleg mit Quellen, Vorher/Nachher, Schutzvergleichen und Mobilchecks](LOOP-BELEGE-20261115-R249.json)
- [Produkt-/Auswahl-/Medien-Diff](PRODUKTDETAILS-MEDIEN-DIFF-20261115-R249.patch)
- [19 Konsolen-Bildzuordnungen](KONSOLEN-BILDZUORDNUNG-20261115-R249.csv)
- [Fortgeschriebene Konsolen-Arbeitsliste: 8/36 redaktionell bearbeitet, 28 offen](KONSOLEN-DETAILARBEIT-20261115-R242.csv)
- [Ergänzungsregister: 12 bestehende Angebote](MERCHANT-ERGAENZUNGEN-REGISTER-20261115-R249.json)
- [Historische Merchant-Restarbeitsliste, nicht importbereit](MERCHANT-RESTARBEIT-20261115-R249.csv)
- [Metricool-Wochenauszug, Holds und Duplikat-Gegenprobe](METRICOOL-PLANUNG-20261115-R249.json)

Tageskennzahlen, Klaviyo-Reports und beendete Kauf-Watch nicht erneut abgefragt. Keine weiteren Social-Writes, neue Automationen, Budgets, Einstellungen, Flows, DNS oder kostenpflichtige Renders. Claude-Empfang bleibt unbekannt.
