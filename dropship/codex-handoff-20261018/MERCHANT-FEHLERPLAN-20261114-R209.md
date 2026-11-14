# LuxeStyle: Arbeitsplan für die 16 zusätzlichen Merchant-Problemarten (R209)

Die kleinere Datei enthält drei Arten (Preis, availability, ausstehende Verarbeitung); der grössere Export enthält **genau 16 zusätzliche Arten**, insgesamt 19. Das erklärt den Dateiunterschied, belegt aber keine Auswahl von genau 16 Produkten.

Beide CSVs vollständig und mit Grössen-/SHA-256-Gegenprobe gelesen. Sie sind Snapshots: 4’603 Rohzeilen, 1’048 exakte dateiübergreifende Überschneidungen, **3’555 unterschiedliche Kontextzeilen / 2’005 eindeutige rohe Artikel-IDs**. IDs sind weder Zeilen noch eine Anzahl einzigartiger Shopify-Produkte. Keine Addition der pro Fehlerklasse überlappenden IDs. 18 Problemtitel haben DISAPPROVED-Schweregrad, einer PENDING. Der separate Artikelstatus bleibt erhalten.

| Problemart | Eindeutige Artikel-IDs je Klasse | Unterschiedliche Kontextzeilen | Konkreter nächster Schritt |
|---|---:|---:|---|
| Für einige Länder fehlen Versandinformationen | 995 | 995 | 995 IDs betreffen nur Label DE/Deutschland. Aktive Artikel-/Quellen-Länderzuweisung prüfen; CH/LI beibehalten, keinen Deutschland-Versand hinzufügen. |
| Produktpreis fehlt | 517 | 1034 | Exakte eingereichte Quelle und price/CHF je Offer lesen. Beispiel ist DRAFT mit vorhandenem Shoppreis; nicht Preis erfinden oder Entwurf aktivieren. |
| Personalisierte Anzeigen: Schwierigkeiten im privaten Bereich | 159 | 442 | Betroffene Originalangebote, Klassifikation und Richtlinienkontext einzeln prüfen. Bestehende Sperren/Ausschlüsse erhalten; keine Umbenennung oder unbelegte Beschwerde zur Umgehung. |
| Anzeigen-Overlay auf Bild | 121 | 433 | Tatsächlich eingereichten image_link an Variante binden; dann echtes passendes Original ohne Werbeoverlay und mit Rechten prüfen. |
| Bild ist zu klein | 71 | 142 | Eingereichte Originaldatei und Pixelmasse prüfen; geeignete echte grössere Quelle beschaffen. Die 500×500/2027-Angabe stammt aus diesem Export, keine separat verifizierte allgemeine Richtlinie. |
| Fehlendes Attribut [availability] | 36 | 72 | Je konkrete Quelle Verfügbarkeit, Tracking, Policy und Storefront prüfen. 0 Bestand ist kein Ausverkaufsbeweis; nicht pauschal in_stock oder preorder setzen. |
| Eingeschränkte Inhalte nur für Erwachsene | 27 | 76 | Betroffene Originalangebote, Klassifikation und Richtlinienkontext einzeln prüfen. Bestehende Sperren/Ausschlüsse erhalten; keine Umbenennung oder unbelegte Beschwerde zur Umgehung. |
| Personalisierte Anzeigen: Sexuelle Interessen | 27 | 76 | Betroffene Originalangebote, Klassifikation und Richtlinienkontext einzeln prüfen. Bestehende Sperren/Ausschlüsse erhalten; keine Umbenennung oder unbelegte Beschwerde zur Umgehung. |
| Tabakprodukte und Zubehör für Tabakkonsum | 18 | 60 | Betroffene Originalangebote, Klassifikation und Richtlinienkontext einzeln prüfen. Bestehende Sperren/Ausschlüsse erhalten; keine Umbenennung oder unbelegte Beschwerde zur Umgehung. |
| Zusätzlicher Text gefunden | 18 | 36 | Exaktes betroffenes Produktattribut und eingereichten Text lesen; nur belegten Werbe-/irrelevanten Zusatz korrigieren, keine Produktfakten erfinden. |
| Personalisierte Anzeigen: rechtliche Einschränkungen | 17 | 33 | Betroffene Originalangebote, Klassifikation und Richtlinienkontext einzeln prüfen. Bestehende Sperren/Ausschlüsse erhalten; keine Umbenennung oder unbelegte Beschwerde zur Umgehung. |
| Schusswaffen und Schusswaffenteile | 9 | 54 | Betroffene Originalangebote, Klassifikation und Richtlinienkontext einzeln prüfen. Bestehende Sperren/Ausschlüsse erhalten; keine Umbenennung oder unbelegte Beschwerde zur Umgehung. |
| Alkoholische Getränke | 8 | 16 | Betroffene Originalangebote, Klassifikation und Richtlinienkontext einzeln prüfen. Bestehende Sperren/Ausschlüsse erhalten; keine Umbenennung oder unbelegte Beschwerde zur Umgehung. |
| Verkauf lebender Tiere | 8 | 24 | Betroffene Originalangebote, Klassifikation und Richtlinienkontext einzeln prüfen. Bestehende Sperren/Ausschlüsse erhalten; keine Umbenennung oder unbelegte Beschwerde zur Umgehung. |
| Inhalte nur für Erwachsene | 6 | 18 | Betroffene Originalangebote, Klassifikation und Richtlinienkontext einzeln prüfen. Bestehende Sperren/Ausschlüsse erhalten; keine Umbenennung oder unbelegte Beschwerde zur Umgehung. |
| Personalisierte Werbung: Identität und Glaube | 5 | 15 | Betroffene Originalangebote, Klassifikation und Richtlinienkontext einzeln prüfen. Bestehende Sperren/Ausschlüsse erhalten; keine Umbenennung oder unbelegte Beschwerde zur Umgehung. |
| Produktseite nicht verfügbar | 3 | 18 | Drei Offers im Export; zwei Elternprodukte gezielt geprüft: DRAFT, keine öffentliche Shop-URL, alte Variant-GIDs null. Eingereichten Link und Quelle prüfen, keine Aktivierung oder Varianten-Umbiegung. |
| Lokale Anforderungen | 1 | 9 | Genauen Einzelartikel-Fehler und konkretes Liefermodell samt Sicherheits-/Zulässigkeitsunterlagen verifizieren; keine pauschale Freigabe. |
| Verarbeitung des Artikels ausstehend | 1 | 2 | Als PENDING beobachten. Nicht als erfolgte Freigabe zählen und keinen Doppel-Upload oder blinden Resubmit auslösen. |

## Neue gezielte Gegenproben

Vier zurückgelieferte Datenquellen: 10667445201 Shopify App API/de/CH+LI; 10762220830 Shopify App API/fr/CH; 10678939025 luxestyle.ch AUTOFEED/CH+LI; 10668966945 Promotionsquelle. Keine der Produktquellen nennt DE. Das erklärt noch nicht die 995 DE-Artikelkontexte: Datenquellenmetadaten und einzelne eingereichte Artikel sind nicht dasselbe, Cachealter unbekannt. Keine Quelle gelöscht oder umgestellt.

Ein Preis-Fall: Offer `15421165404545_cjtz292404406fu` lässt sich über Produkt-ID und exakte SKU an Variante 55775110463873 binden. Shopify meldet CHF44.90, DRAFT und keine öffentliche Shop-URL; Tag `cj-keine-ch-versandoption`. Die neue kleine Merchant-Einzelfallabfrage endet mit MCP-Timeout. Der tatsächliche Merchant-Preis, Link und dessen Quelle bleiben unbekannt. Kein Retry und kein Shopify-Preis-/Statuswrite.

Zwei URL-Fälle: Elternprodukte 15516154462593 und 15516156395905 sind DRAFT und nicht im Onlineshop veröffentlicht; keine `onlineStoreUrl`. Die exakt angefragten Export-Varianten 56177866178945 und 56177868177793 liefern null. Aktuelle anders nummerierte Farbvarianten bleiben separat; keine belegte Migration. Keine öffentliche URL erfunden und keine HTTP404-/Googlebot-Ursache behauptet. Dritter URL-Offer des Exports hier nicht einzeln geprüft.

## Umsetzung bleibt gezielt

Noch kein Merchant-Fall als behoben bestätigt. Die priorisierte Aktion ist ein geprüfter Abgleich der exakten eingereichten Angebote/Quellen gegen die absichtlich unveröffentlichten Shopzustände; danach nur die passende Quellenkorrektur. Keine pauschale Ländererweiterung, Reaktivierung, Preis-/availability-Erfindung, GTIN-Regel, Ausschlussentfernung, Produktlöschung oder Kontobereinigung. CSV-Behauptungen allein beweisen keine Rechtsverletzung oder zulässige Beschwerde.
