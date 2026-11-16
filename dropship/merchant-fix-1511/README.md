# Merchant-Korrektur 15.11.2026

Auftrag des Besitzers in dieser Sitzung: «merchant fix».

## Live korrigiert und zurückgelesen

Bei `herren-fleece-sport-freizeitschuhe-483776` enthielten drei Werte der Option Farbe Werbetext. Google meldete 18 `non_product_data`-Problemzeilen. Die Farbwerte heissen jetzt:

- Beige Hot Sale → Beige – Modell 3
- Grau Hot Sale → Grau – Modell 3
- Weiss Hot Sale → Weiss – Modell 3

Die Option-Wert-IDs bleiben gleich; 18 Variantentitel ergeben sich aus den drei Werten und sechs Grössen. Frisch geprüft: alle 66 Varianten-IDs, SKUs, Preise, Vergleichspreise und Grössenzuordnungen erhalten. Produktstatus/Titel unverändert.

Belege: Trockenlauf [43748909715](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/43748909715), bestätigter Schreiblauf [43749061222](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/43749061222), jeweils Artefakt `merchant-option-fix` mit `before.json`, `plan.json`; Schreiblauf zusätzlich `after.json`, `verified.json`.

Google muss die Änderung neu einlesen. Eine Aufhebung der Beanstandung ist noch nicht gemessen.

## Frische Diagnose, keine Änderung daraus ableiten

Merchant-Gesamtdiagnose [43748361054](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/43748361054), Stand 15.11. 18:47 UTC; Vergleich [43105240668](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/43105240668), 11.11.:

| Problem | 11.11. | 15.11. |
|---|---:|---:|
| fehlender Versand – Problemzeilen | 252256 | 979 |
| CSS-Artikelgrenze – Problemzeilen | 1179 | 0 |
| fehlende Pflichtattribute – Problemzeilen | 1190 | 624 |
| Bildprobleme – unterschiedliche Angebote | 198 | 192 |
| zu kleine Bilder – Problemzeilen | 26 | 75 |
| Werbeeinblendungen im Bild – Problemzeilen | 182 | 129 |

Zeilen sind keine eindeutigen Produkte. Ein Angebot kann mehrere Probleme oder Länder haben. Keine Kausalität für die alten Korrekturen behaupten.

Versandprüfung [43748386425](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/43748386425): Liechtenstein aktiv, CHF 14.90, kein Gratisversand. Keine Änderung nötig. Quellenprobe [43748368175](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/43748368175): die acht noch gefundenen alten Autofeed-Beispiele haben jetzt Preise und Verfügbarkeit. Das ist keine Prüfung aller 624 fehlenden Attribute.

Shopify-Versandprofil im Trockenlauf: kostenlos ab CHF 45 aktiv, CHF-50-Regel inaktiv. Merchant Center stimmt damit überein. Die öffentliche Versandseite verspricht dagegen erst CHF 50 nach Rabatt. Deshalb Merchant nicht blind auf CHF 50 ändern. Tarif-/Kommunikationsentscheidung separat behandeln; nichts an Tarifen oder Checkout geändert. Die Profilliste ist wegen first:10 gegebenenfalls unvollständig.

## Kleine Bilder gezielt zuordnen

Die 75 Meldungen verteilen sich auf sechs Produktgruppen:

- Geburtsstein-Ring 30: Variantenbilder teils nur 88–96 Pixel hoch, Steinzahlen/Farben müssen erhalten bleiben. Hochauflösende Originale nötig; keine Details erfinden.
- Figurformender Einteiler 21: aktuelles Hauptbild 800×800, keine Variantenbilder. Ursache des Google-Befunds/Quellbild separat prüfen.
- Kapuzenkleid Regenbogen 16: Gelb/Bunt-Variantenbilder ca. 204×207. Grössere Galeriebilder sind nicht eindeutig dieselbe Ausführung. Kein pauschaler Tausch.
- Baby-Set 5: kaffeebraune Variantenbilder 224×222, grössere Galerie zeigt andere Ausschnitte. Bessere Originalquelle nötig.
- Hasenkostüm 2: aktuelles Hauptbild 880×2048; alter Befund kann Abrufstand betreffen.
- Drachenkelch 1: aktuelles Variantenbild 1024×1024; alter Befund kann Abrufstand betreffen.

Keine Bilder editiert, keine Autofeed-Datenquelle deaktiviert und keine Richtlinienfehler nur durch Umbenennen versteckt.

## Ausführung und Rücknahme

Werkzeug: `automation/merchant-fix-1511/fix.mjs`. Ohne `LIVE=1` nur lesen. `ROLLBACK=1 LIVE=1` kehrt ausschliesslich die drei bekannten Werte um; gleicher Schutz gegen Kollisionen, unvollständige Variantenlisten und Änderungen zwischen Lesen/Schreiben. Bei Timeout keine automatische Mutationswiederholung.

Der branchgebundene Workflow liest den Modus aus `MODUS`: `pruefen`, `schreiben`, `zurueck`. Nach bestätigtem Schreiben auf `pruefen` zurückgestellt. Kein Zeitplan, kein Schreiben beim Merge nach main.

Tests: `node automation/merchant-fix-1511/fix_test.mjs` (14 Schutzprüfungen). Die lokale vollständige `ci_simulation.sh` konnte hier nicht starten: sie legt ihren Plan unter `$HOME` an, das im Cloud-Sandbox schreibgeschützt ist. Der gezielte Actions-Test und der Live-Trockenlauf sind grün. Kein vollständiger CI-Erfolg behauptet.
