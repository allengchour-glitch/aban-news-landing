# Personnalisation – Suche und Variantenlinks auf Französisch

Stand 28. November 2026, 19.28 Uhr Zürich. Der Patch liegt zur Vorschau vor. Die 42 öffentlichen FR-Inhaltsübersetzungen sind separat in Shopify gespeichert.

## Herkunft und Geltungsbereich

Die Basis stammt unmittelbar aus dem aktiven Shopify-Theme 214565814663 «LuxeStyle – Startseite 21.11.2026», Shop 94368563585, luxestyle.ch, CHF. Die zwei Dateien sind auf dem geprüften Besitzerbranch claude/luxestyle-status-tztnn1 (ffce2bef) nicht als verwaltete Theme-Quelldateien vorhanden.

| Datei im Shopify-Theme | Shopify-MD5 der Ausgangsdatei |
| --- | --- |
| assets/luxe-clothing.js | aa759708998cf30c817f71d32e8f9c58 |
| snippets/luxe-clothing-shop-offers.liquid | 26042af512c4dcfa2b3197dc085773d5 |

| Theme-Datei | SHA-256 der Quelle | SHA-256 nach Patch |
| --- | --- | --- |
| assets/luxe-clothing.js | 375db484029319e7f04063c437519774e4354736f9897839cca466847d8c20af | 5b9fdf5250005689c393839824f8671a8b6a0d35397462bf9b97d176319764b9 |
| snippets/luxe-clothing-shop-offers.liquid | 3e1f2816ab70d4d1a990db50778e684eba6a12afaa3f0133fee5bb9d21ed4677 | aa9191c2f6c23981783d17f14b8249eba03c2dfa30bdc5b063f86c2ab69d308d |

Der Patch baut Variantenlinks aus der von Shopify für die aktuelle Sprache gelieferten Produkt-URL. Die Varianten-ID und der Anker für den Designer bleiben erhalten. Für Französisch nimmt der Katalog die Titel der bereits geprüften, verfügbaren Shopangebote in die Suche auf. Einem Modell mit mehreren unterschiedlichen Titeln bleibt sein Herstellername erhalten.

## Lokale Prüfung

In einer isolierten Kopie des frisch gelesenen Themes die Prüfsummen beider Quelldateien mit der Tabelle vergleichen. Die Befehle im Wurzelverzeichnis der Kopie ausführen.

```sh
git apply --check /pfad/katalog-fr-suche-und-varianten-2811.patch
git apply /pfad/katalog-fr-suche-und-varianten-2811.patch
node --check assets/luxe-clothing.js
```

Der öffentliche Pfad lautet `/fr/collections/selbst-gestalten-1?view=luxe-gestalten`; die deutsche Kontrollseite hat denselben Pfad ohne `/fr`. Die Vorschau simulierte im Browser die neue JS-Datei und die Liquid-Ausgabe mit den auf der Seite durch Shopify gerenderten, produkt-ID-genau abgeglichenen URLs. Sie umfasste 231 französische Angebotspfade.

| Mobile Stichprobe, 390 × 844 | Live vor dem Codepatch | Lokale Vorschau |
| --- | --- | --- |
| FR «coque» | 0 Treffer | 3 Treffer |
| FR «tasse» | 1 Treffer | 1 Treffer |
| FR Startansicht, dynamische Karten mit französischem Ziel | 0 von 12 | 12 von 12 |
| FR statische Shopkarten mit französischem Ziel | 18 von 18 | 18 von 18 |
| FR Dialog beim Suchtreffer «tasse» | 0 von 2 französische Ziele | 2 von 2 französische Ziele |
| DE Kontrollsuche | 6 Hüllen, 1 Tasse | 6 Hüllen, 1 Tasse |

Der angeklickte Samsung-Link der FR-Vorschau lieferte HTTP 200, die Sprache `fr` und Variante 67813423448455. Der Name «White Glossy Mug» bleibt bei mehreren unterschiedlich betitelten Shopangeboten die Herstellerbezeichnung. Der Codepatch wurde lokal angewendet und geprüft. Eine Auslieferung des Theme-Codes ist offen.

## Auf Shopify eingerichtete Vorschau

Die bereits vorhandene, unveröffentlichte Vorschau «LuxeStyle – Printful Fix 08.11.2026» (213482963335) hatte vor der Änderung dieselben vier Prüfsummen wie das Haupttheme für JS, Angebots-Snippet, Katalogsektion und Spezialtemplate. Die zwei geprüften Änderungen wurden in dieser Vorschau gespeichert. Shopify meldete für JS `0ff7623282d7f6f289dc9fa3052df0a9`, für Liquid `ac20ab4b17d19d507fd0bb34fa3934e9`. Beide Werte wurden separat zurückgelesen. Das Haupttheme lieferte die ursprünglichen Werte. Die 42 französischen Texte wurden anhand der passenden deutschen Quellen in die Vorschau übernommen und zurückgelesen.

Auf dem Handy öffnete der Vorschaulink das Theme 213482963335. Alle zwölf geprüften dynamischen Variantenkarten hielten Französisch. Die Suche nach «coque» fand drei Modelle. Der Klick auf Samsung öffnete die französische Produktseite mit Variante 67813423448455 und HTTP 200. Auf Deutsch fand «Hülle» sechs Modelle. [Shopify-Vorschau auf Französisch](https://luxestyle.ch/fr/collections/selbst-gestalten-1?view=luxe-gestalten&preview_theme_id=213482963335)

Für die spätere Übernahme nur die zwei geprüften Quelldateien am dann aktuellen Haupttheme vergleichen. Die bestehende Vorschau stammt vom 8. November und enthält weitere ältere Shopstände.
