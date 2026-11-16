# R258 – Ausführliche Produktangaben im Gesamtkatalog fortführen

16.11.2026, ausdrücklicher Inhaberauftrag «alle produkte ausführliche angaben». Sechs weitere bestehende Angebote sind live mit überarbeiteten Titeln, Beschreibungen und individuellen SEO-Paaren. Sechs initiale productUpdate-Mutationen plus zwei gezielte Body-Korrekturen nach neuem sichtbarem Tabellenbefund, alle mit userErrors=[] und unabhängiger vollständiger nativer Rückleseprüfung. Keine blinden Wiederholungen oder unklaren Schreibantworten.

| Produkt | Wörter ungefähr | SEO-Titel / Meta Zeichen |
|---|---:|---:|
| [Magnetische LED-Leuchte mit vier Lichtpunkten](https://luxestyle.ch/products/magnetische-led-lampe-zum-aufkleben-kabellos-621500) | 247 | 57/145 |
| [LED-Tischleuchte in Baumform mit Kristalloptik](https://luxestyle.ch/products/multicolor-kristall-lampe-fur-tisch-616500) | 243 | 58/143 |
| [Pferdehalfter, Standardausführung](https://luxestyle.ch/products/pferdezaumzeug-anpassbar-919232) | 243 | 62/147 |
| [Kunststoff-Tränkebecken für Rinder, Pferde und Schafe](https://luxestyle.ch/products/trankebecken-aus-kunststoff-fur-vieh-477c77) | 238 | 52/144 |
| [City Ranger Umhängetasche Schwarz mit MOLLE-System](https://luxestyle.ch/products/city-ranger-outdoor-tasche-48412d) | 245 | 55/149 |
| [Multifunktionale Nylon-Reisetasche Schwarz](https://luxestyle.ch/products/multifunktionale-outdoor-tasche-485376) | 236 | 57/143 |

## Inhaltlich verbessert

Die Texte erklären Material, sichtbaren Aufbau, aktuelle Standardausführung, verfügbare Auswahl, Lieferumfang und produktbezogene Fragen vor dem Kauf. Alle sechs haben genau eine Default-Variante. Farben, S/M/L, Lichtmodi, Volumenbereiche oder Sonderanfertigungen aus einem Lieferantentext werden nicht zu neuen bestellbaren Optionen erklärt. Wortzahlen sind eine Beschreibung des tatsächlich geschriebenen Umfangs, kein automatisches Qualitätsziel.

- Vierfach-LED-Leuchte: präziserer Name statt unbelegter Schrank-Klebeleuchtenbeschreibung. Magnetisch/kabellos/wiederaufladbar als Lieferantenangabe; keine erfundene Montage, Leuchtstärke, Laufzeit oder zugesagte Fernbedienung.
- Baumleuchte: tatsächliche Baumform und Kristalloptik statt unbestätigtem Kristallglas, separat bestellbaren Lichtfarben, Bluetooth oder festen Laufzeiten. 5 V aus Text/Bild, genaue Modi und Masse offen.
- Pferdehalfter: Bauform aus Produktbildern, keine vollständige Reittrense oder beworbene S/M/L-/Logobestellung. PP oder Nylon und Neopren bleiben als nicht abschliessend zugeordnete Materialangaben kenntlich.
- Tränkebecken: Kunststoff, 4 L, 28 × 26 cm und Lieferantenfunktion erklärt. Keine garantierte Überlaufsicherheit oder erfundene Anschluss-/Montagedaten.
- City Ranger: Nylon und Canvas sind im CJ-Fliesstext ausdrücklich genannt; die allgemeine Taxonomie fabric widerlegt das nicht. MOLLE, verstellbarer Gurt und Ausführung beschrieben; Zubehör und Masse nicht erfunden.
- Nylon-Reisetasche: 56–75L als Lieferantenbezeichnung der einen Variante erklärt. Keine angeblich auswählbaren 56-/75-Liter-Grössen, bewiesene Erweiterung, Traglast oder Fluggepäckzulassung.

Die alten pauschalen Liefer-/Qualitäts-Trustboxen und unbelegten Produktbehauptungen wurden aus diesen sechs Beschreibungen entfernt. Das ist keine Änderung der Versand- oder Rückgaberichtlinie. Öffentliche Gratisversandgrenze CHF 50, interne CHF 45 nach Rabatt und Kundendomäne sind unberührt. Verwaltete Cross-Sell-Suffixe der beiden Leuchten erhalten; zwei Taschen-Kategorielinks aus tatsächlich geprüftem HTTP200-HTML übernommen. Für Pferd/Vieh keine passende Kategorie erfunden.

## Abgesichert und geprüft

Die echte Handyabnahme entdeckte danach zwei abweichende separate Tabellenwerte: 230 g aus dem Versandgewicht-Fallback bei der Magnetleuchte und festes Nylon aus dem Metafeld beim Halfter. Das aktuelle Theme 213991391623 wurde nur gelesen: der Renderer liegt als verschachtelter Custom-Liquid-Block in templates/product.json und übernimmt erkannte Beschreibungs-Detailzeilen vor dem Fallback. Zwei zusätzliche, einzeln bestätigte Body-Updates führen dort jetzt «Produktgewicht noch nicht bestätigt» und «PP oder Nylon laut Lieferant; genaue Ausführung offen». Die übrigen vier Gewichtsdarstellungen 420/400/290/1800 g stimmen mit dem ausdrücklich bezeichneten Lieferanten-Produktgewicht überein; City Ranger hat keine solche Zeile. Theme, Versandgewichte und Merchant-Metafelder wurden nicht geändert. Die nachträgliche gezielte öffentliche/mobile Gegenprobe dieser zwei Seiten ist im Beleg enthalten. Die bisherige feste Nylon-Metadatenangabe bleibt ein separater offener Feed-Datenpunkt, keine erledigte Merchant-Korrektur. Auch die aktuell gelesene Google-Kategorie Exercise & Fitness der Vierfachleuchte und die Bridles-Zuordnung des Halfterangebots sind konkrete Prüfhinweise; in diesem Textlauf wurde keine Taxonomie umgestellt oder Freigabe daraus abgeleitet.

Zwei Theme-Bash-Reads lieferten rate_limited/nothingran, auch nach Ablauf der genannten 60 Sekunden; kein Theme-Skript lief. Die zulässige native GraphQL-Dateilesung wurde schema-validiert. Zwei erwartete alte Dateipfade waren tatsächlich NOT_FOUND; der aktive Renderer wurde im vorhandenen Product-Template gefunden. Es gab keinen Theme-Write und keinen neuen Workflowstart. Eine zu grosse lokale Persistenzübergabe wurde in Chunks aus derselben gehaltenen Antwort gesichert; die API musste dafür nicht nochmals gelesen werden.

Unmittelbar vor jeder Änderung: richtige aktuelle Shopidentität, natives Original, vollständige Preis-/SKU-/Options-/Medien-/Tag-/Inventardaten und konkreter Diff. Danach alle geänderten und geschützten Felder erneut gelesen. Erhalten sind sechs Varianten-IDs, sechs Options-IDs, sechs Optionswert-IDs,35Medien samt Reihenfolge, CHF-Preise, Bestand/Tracking/Policy, Status, Tags, Handles und URLs. Insbesondere rueckhol-0907 bleibt am Reisetaschenprodukt erhalten; kein Socialwrite.

Je Produkt genau ein erfolgreicher gespeicherter CJ-Detailread. Bestehende Fotos wurden von Root für die Textidentität betrachtet, keine neuen Bilddateien oder Rechtefreigaben. Quellenzuordnung ersetzt keine physische Messung und keine CJ-Backend-Verknüpfung.

Öffentliches HTML/JSON aller sechs Seiten und mobile Ansichten wurden gezielt gegen den nativen Stand geprüft. Details und Grenzen im [Prüfbeleg](PRODUKTDETAILS-BELEGE-20261116-R258.json). Root sah aktuelle mobile Text-/Auswahlansichten. Ein gespeicherter Text ist keine Google-Indexierung, Merchant-Zulassung oder belegte Umsatzwirkung.

## Gesamtkatalog: Umfang und nächste Arbeit

Eine aktuelle schema-validierte Shopify-Zählung meldet 87’789 Produkte, 56’495 mit ACTIVE-Status und 53’613 ACTIVE+cj-real. Alle Zähler tragen precision:EXACT. Gegenprobe mit bekanntem Produkt: 1; nicht existentem ID 1: 0. ACTIVE ist keine Aussage über öffentliche Sichtbarkeit oder vollständige Produktangaben. Es wurde nicht der gesamte Katalog paginiert.

Die [fortgeschriebene Arbeitsliste](PRODUKTDETAILS-ARBEITSLISTE-20261116-R258.csv) enthält 44 belegte Produktidentitäten: 36 Konsolen aus früheren Blöcken, Katze und Hängematte aus R256/R257 sowie diese sechs weiteren Artikel. Das ist keine Vollabdeckungs- oder Fehlerfreiheitsquote. Quellenfragen bleiben OPEN; historische Tätigkeiten ausserhalb dieser Liste sind UNKNOWN und werden nicht als unbearbeitet oder erledigt eingestuft.

Nächster Schritt im bestehenden Ablauf: eine weitere kleine Gruppe mit kurzen oder irreführenden Angaben auswählen, aktuelle Quelle und Variante belegen und klare Ausführung/Material/Masse/Bedienung/Lieferumfang ergänzen. Fehlende Primärangaben weiter sichtbar als offen führen. Bestehende 44 Zeilen und frühere Belege erhalten; keine Massenpagination, neue Automation oder Frequenzänderung. Keine Kennzahl-, GSC-, Flow- oder umfangreichen Verkaufsreports wiederholt; beendete Kaufwatch bleibt beendet. Keine Kunden-/Lieferantenansprache. Claude-Empfang unbekannt.
