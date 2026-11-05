# LuxeStyle R103 – Merchant-Bildprüfung und zwei exakte Variantenbindungen

Stand: 2026-11-05T21:11:44+01:00. Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs erwarteten Kanälen wurden vor den Änderungen frisch passend gelesen.

## Umfang

Der in R102 vollständig ausgewertete Export `product_issues_2026-11-05_09-03-46.csv` enthält zehn Varianten mit «Promotional overlay on image». Eine Rollball-Variante war bereits in R102 korrigiert. R103 prüfte ausschliesslich die neun verbliebenen Item-IDs gegen die aktuellen Shopify-Varianten und sämtliche vorhandenen READY-Medien. Alle Kandidaten wurden visuell auf Produkt, Farbe, Ausführung, Stückzahl und störende Texte geprüft.

## Ausgeführte Korrekturen

### Futterautomat mit 6 Fächern

- Produkt `gid://shopify/Product/15524857381249`, Variante `gid://shopify/ProductVariant/56222333239681`
- SKU `CJ-B25622D2-49E6-41E0-BD64-C4634981D6EC`, CHF 38.90, ACTIVE und kaufbar
- vorher keine Varianten-Medienbindung; öffentlicher Fallback auf eine beschriftete Werbegrafik
- nachher bestehendes READY-Medium `gid://shopify/MediaImage/70800517923201`, 400×400
- Bild: `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/6410007415048.jpg?v=1788515551`
- visuell: vollständige Ansicht desselben Futterautomaten mit Display, ohne Werbetext oder störende Elemente

### Haarfärbekamm Einweg 10-Farben

- Produkt `gid://shopify/Product/15447629332865`, Variante `gid://shopify/ProductVariant/55872852328833`
- SKU `CJ-2014618520334143489`, CHF 15.90, ACTIVE und kaufbar
- vorher keine Varianten-Medienbindung; öffentlicher Fallback auf ein Bild mit grossen Werbe-, Mengen- und Zertifikatstexten
- nachher bestehendes READY-Medium `gid://shopify/MediaImage/69851240726913`, 466×466
- Bild: `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/18a25243-a25f-4868-adc7-e20a3eca3185.jpg?v=1783106056`
- visuell: zehn tatsächliche Farbkämme mit Haaransicht, ohne sichtbaren Text, Badge, Rahmen oder Wasserzeichen

Beide `productVariantsBulkUpdate`-Mutationen liefen mit `allowPartialUpdates=false`, ohne `userErrors` und ohne Retry. Shopify Admin und die öffentlichen Produkt-JSON-Daten bestätigen danach jeweils die neue Medienbindung, die unveränderte SKU, den CHF-Preis, die Kaufbarkeit, ungetracktes Inventar mit `CONTINUE` und sieben weiterhin publizierte Kanäle. Beim Haarfärbekamm blieb insbesondere `rueckhol-0907` erhalten. Menge 0 bei deaktiviertem Tracking und `CONTINUE` ist kein physischer Bestands- oder Lieferzeitbeleg.

## Sieben bewusst nicht geänderte Varianten

| Merchant-Item-ID | Grund |
|---|---|
| `shopify_ZZ_16606108123527_67789999440263` | Rote Pedale: kein sauberes rotes Bild vorhanden; das einzige saubere Bild zeigt Schwarz. |
| `shopify_ZZ_15450836566401_55889781588353` | Wasserwellenleuchte Set 8: vorhandene Bilder mischen Würfel, Kugeln, Kronen und weitere Produkte; keine eindeutige Set-Zuordnung. |
| `shopify_ZZ_15433464381825_67788517900679` | Hall Magnetic Rocker PS4: kein textfreies Medium mit belegter exakter PS4-Zuordnung. |
| `shopify_ZZ_15450836697473_55889785094529` | Wimpernzange Pink expensive: saubere pinke Einzelbilder vorhanden, aber keines ist zweifelsfrei dieser SKU zugeordnet. |
| `shopify_ZZ_15520398311809_67680512835975` | Holzuhr Grün: einziges einzelnes grünes Bild enthält eine grosse freigestellte Zeitangabe; andere Farben wären Variantenfehler. |
| `shopify_ZZ_15450832961921_55889732862337` | Rollball 3 Stück Pink, englische Verpackung: kein sauberes Bild mit exakt Farbe, Verpackung und Stückzahl. |
| `shopify_ZZ_15450832961921_55889732927873` | Rollball 2 Stück: sauberes Bild mit einem grünen und einem pinken Ball vorhanden, aber diese Farbkombination ist für die Variante nicht belegt. |

## Schutz und Abgrenzung

Die beiden Mutationen adressierten ausschliesslich `mediaId` der jeweiligen Variante. Die vollständigen Vorher-/Nachher-Reads bestätigen unveränderte Produktstatus, Titel, Handle, SEO, Tags, Optionen, Varianten-IDs/-Titel, SKUs, Preise, Compare-at-Preise, Kaufbarkeit, Tracking, `inventoryPolicy`, Galeriedateien und -reihenfolge sowie Publikationen. Beschreibung, Produkttyp, Kategorie, Barcode, Gewicht und sonstige Varianten wurden nicht als Mutationsfelder gesendet.

Die 21’862 CSS-Kapazitätszeilen sind kein Produktbildproblem und wurden nicht als Katalogkorrektur gezählt. Ein aktueller authentifizierter Merchant-Einzelstatus der Angebote wurde nicht gelesen. Google-Neuverarbeitung, aktive Datenquelle und tatsächlich eingereichter `image_link` bleiben unbekannt; die Shopify-Korrekturen sind kein Beleg, dass Google die Meldungen bereits entfernt hat.

Der strenge Katalogfortschritt bleibt bei 32 von 56’506 ACTIVE, rund 0,06 %. R103 hat zwei präzise Medienbindungen repariert, aber keinen vollständigen neuen SEO-/Qualitätslauf abgeschlossen.

Nächster Schritt: Nach Merchant-Neuverarbeitung die aktiven Quellen und eingereichten Bildlinks der drei korrigierten R102/R103-Varianten einzeln lesen. Für die sieben blockierten Varianten nur nach verifizierter CJ-/Lieferanten-Zuordnung oder einem vorhandenen exakten Originalbild weiterarbeiten; keine fremde Farbe, Menge oder Ausführung verwenden.
