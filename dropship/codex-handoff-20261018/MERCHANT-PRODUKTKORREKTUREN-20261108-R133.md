# R133 – Merchant-CSV-Diagnose und drei produktseitige Korrekturen

Stand: 08.11.2026, Europe/Zurich. Shopify wurde unmittelbar vor den Änderungen als LuxeStyle / `luxestyle.ch` / CHF / Schweiz bestätigt. Die vorliegenden Google-Merchant-Exporte sind Diagnosequellen; sie belegen weder eine aktuelle Katalogvollmessung noch die erfolgreiche Google-Neuverarbeitung nach einem Shopify-Write.

## Neue Exporte

Die vier neu gelieferten Dateien haben dieselben zwölf Spalten und sind UTF-8/kommagetrennt. Zeilen wurden nicht als Produkte addiert, weil dasselbe Angebot je Land, Ziel und Fehler mehrfach vorkommt.

| Export | Zeilen | eindeutige Item-IDs | Befund |
|---|---:|---:|---|
| `20-28-59` | 669 | 230 | 639 Personal-Hardships-Zeilen für 230 IDs im Dynamic Remarketing; zusätzlich 30 CSS-Kapazitätszeilen für 15 dieser IDs |
| `20-27-53` | 32 | 8 | acht Zubehör-/Herstellungsangebote, je Alkoholrichtlinie und personalisierte rechtliche Einschränkung |
| `20-28-16` | 24 | 8 | acht Tierzubehör-Angebote als Verkauf lebender Tiere fehlklassifiziert, je drei Ziele |
| `20-28-41` | 36 | 6 | sechs nicht erreichbare Produktseiten; aktuelle Shopify-Gegenprobe: alle sechs DRAFT und ohne Storefront-URL |

Die vier neuen Dateien enthalten zusammen 252 eindeutige IDs. 15 überschneiden sich mit den fünf vorherigen Dateien, 237 sind im gelieferten Neuscope zusätzlich. Über alle neun Dateien sind 5’662 eindeutige Item-IDs enthalten. Das ist keine aktuelle Zahl betroffener Shopify-Produkte und kein Fortschrittsnenner.

Die sechs DRAFT-Produkte wurden nicht aktiviert. Die acht Tierzubehör-Produkte wurden nicht inhaltlich verfälscht; ihr französischer Feedkontext enthält deutsche Titel und verlangt eine Locale-/Merchant-Neuprüfung. CSS-Kapazität ist ein Konto-/Programmthema und kein Produktattributfehler. Feedquelle, CSS-Kapazität und Merchant-Ziele wurden nicht geändert.

## Produktseitige Korrekturen

Nach Gegenprüfung mit aktuellem Adminzustand, tatsächlichen Bildern und dem bestehenden Projektgedächtnis wurden drei aktive Produkte eng korrigiert:

| Produkt | Korrektur | Erhalten |
|---|---|---|
| `15447901208961` | «Lendenwirbel-Stützgurt für Personen mit Behinderung» → **Transfergurt mit vier Griffen**; medizinische/therapeutische Aussagen und Rabatt-/Lieferblock entfernt; Produkttyp `Damenmode` → **Alltagshilfen**; neuer ASCII-Handle mit 301; Body/SEO und fünf Alttexte korrigiert | ACTIVE, eine Variante `55873495761281`, SKU, CHF 15.90, Tags einschliesslich `rueckhol-0907`, Menge 0, untracked/CONTINUE, fünf READY-Medien samt URLs |
| `15448954896769` | «Reithelm-Visier» → **Schirm-Aufsatz für Reithelm**; unbelegte Schutz-/Sicht-/PVC-/cm-Aussagen entfernt; neuer ASCII-Handle mit 301; Body/SEO und sechs Alttexte korrigiert | ACTIVE, Varianten M/L, beide SKUs und CHF 34.90, Tags einschliesslich `rueckhol-0907`, Menge 0, untracked/CONTINUE, sechs READY-Medien samt URLs |
| `16606127161735` | bereits in R63 geänderter erster Alttext nicht als neue Erstkorrektur gezählt; nun **Ventileinsatz-Werkzeug für Tubeless-Reifen** sowie Body/SEO/Handle und alle fünf Alttexte konsistent bereinigt; unbelegte Kupfer-, 500-g- und Universal-Kompatibilitätsangaben entfernt | ACTIVE, Variante `67622324535687`, SKU, CHF 21.90, Tags, Menge 0, untracked/CONTINUE, fünf READY-Medien samt URLs |

Die drei `productUpdate`- und drei `fileUpdate`-Calls waren erfolgreich und hatten keine `userErrors`. Der erste GraphQL-Versuch wurde wegen eines ungültigen Rückgabefelds vor Ausführung abgewiesen und war ein belegter No-Write. Erfolgreich waren damit sechs Mutationscalls mit 19 Inputzielen und drei logischen Produkten.

## Rücklesung und Grenzen

Alle drei neuen URLs liefern HTTP 200, Self-Canonical, den erwarteten H1, SEO-Titel und Meta-Text sowie eine Add-to-cart-Funktion. Die drei alten Handles antworten mit 301 auf den jeweiligen neuen Handle. Admin-Rücklesung bestätigt Varianten, SKUs, Preise, Status, Tags, Inventarlogik, Medien-IDs/-URLs und READY-Zustand unverändert. Für den Gurt bleibt `rueckhol-0907` wie beim Reithelm erhalten; keine Social-Ausspielung.

Google-Neuverarbeitung und Aufhebung der Richtlinienmeldungen sind unbekannt. Produktseitige Metadatenkorrektur ist kein Merchant-Freigabebeleg. Nächster Schritt ist die gezielte Neubewertung derselben drei Offer-IDs nach abgeschlossener Verarbeitung; bei Tierzubehör und DRAFT-Angeboten zuerst Feed-/Locale-/Quellenzustand statt Produkttexte ändern.

Keine Preis-, Varianten-, Lager-, Feed-, CSS-, Theme-, Social-, Flow-, DNS-, Budget-, Rabatt-, Kunden-, Bestell-, Render- oder Publikationsänderung ausser den beschriebenen Shopify-Produktfeldern.
