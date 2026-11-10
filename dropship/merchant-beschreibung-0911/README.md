# Merchant Center: Google bekommt als Beschreibung unsere Werbezeile (Befund 09.11.2026)

**Anlass:** Der Besitzer schickte am 09.11. abends nur den Link auf seinen Drive-Ordner `luxestyle` (acht Merchant-Center-Exporte). Auslegung (meine, nicht bestätigt): die Berichte auswerten, soweit sie lesbar und noch nicht genutzt sind. **Nichts im Shop geändert.**

## Befund (GEMESSEN)

Quelle: `Update product descriptions to include details customers are looking for_2026-10-24_06-29-32.csv` (3,56 MB, Filter «Category = Women's Sweaters», 11 897 Zeilen = **634 Produkte**, Feed-Etikett `CHF_99383214465`, Artikel-IDs `shopify_ZZ_<Produkt>_<Variante>` = die App «Google & YouTube»).

**Was Google als Beschreibung eines Artikels trägt** (Vergleich jedes Produkts mit Shopify von heute, `klassifizieren.py`):

| Klasse | Produkte | Anteil |
|---|---|---|
| Google trägt die **SEO-Werbezeile** (gleich der heutigen `seo.description`) | 562 (559 aktiv, 3 Entwurf) | 88,6 % |
| Google trägt eine SEO-Werbezeile älteren Wortlauts | 39 | 6,2 % |
| Google trägt die echte Produktbeschreibung | 29 (26 aktiv, 3 Entwurf) | 4,6 % |
| anderes (ebenfalls Werbezeile in anderem Wortlaut) | 4 | 0,6 % |

**Rund 95 % der Produkte haben bei Google als Beschreibung** nur: «`<Titel>` bei LuxeStyle – Schweizer Online-Shop. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. Jetzt –10% mit Code WELCOME10.» Mittlere Länge 148 Zeichen (kleinste 63, grösste 1 414). **Die Produktseite selbst trägt die echte Beschreibung:** das JSON-LD (`ProductGroup.description`) von `strickpullover-aus-merinowolle-600900` ist 1 250 Zeichen lang, die echte Beschreibung. Nur der Weg über die App zu Google trägt die Werbezeile.

**Google empfiehlt entsprechend** (Spalten «Key details» / «Add to description», 11 897 Zeilen): Kunden suchen nach **Grösse** (in 9 936 + 1 246 + … Zeilen als Schlüsselangabe genannt); hinzuzufügen sind **«Muster, Material»** (9 936 Zeilen), «Muster» (1 246), «Grösse, Muster und Material» (480), «Material» (157), «Grösse, Muster» (48).

## Deutung (Hypothese, nicht belegt)

- Die App nimmt `seo.description`, **wenn sie gesetzt ist**. Beleg: 95 % Übereinstimmung; von den 29 Produkten mit echter Beschreibung haben heute 26 eine `seo.description`, die dem Anfang der Beschreibung entspricht (kein Werbetext gesetzt), 3 tragen heute die Werbezeile (seit dem Bericht geändert). Die Werbezeile stammt aus den SEO-Runden des Shops (u. a. `automation/seo-optimizer.mjs`, `automation/catalog_enrich.py`; die SEO-Runde vom 23.10. erfasste 56 668 aktive Produkte, `STAND-ARCHIV.md`); wann genau die Beschreibungen dieser 634 Produkte gesetzt wurden, ist nicht einzeln geprüft.
- Folgen für Google (Hypothese): keine Angaben zu Material, Muster, Grösse in der Beschreibung (genau das meldet die Empfehlung); Werbetext («Gratis-Versand», «–10 % mit Code») in einem Beschreibungsfeld, das Google nach der Datenspezifikation für Produktinformationen vorsieht (Richtlinie nicht gegengelesen). Ob das Rang oder Sichtbarkeit kostet, ist **ungemessen**; zur Einordnung die Search Console (Darstellung, 28 Tage bis 06.11.): «Merchant listings» nur 11 Einblendungen, «Product snippets» 9 995 auf Position 61 (`dropship/ranking-0911/gsc_basis_0911.json`).
- Das Feld ist doppelt belegt: dieselbe `seo.description` ist die **Meta-Beschreibung** in den Suchergebnissen (Werbezeile gewollt, ≤ 160 Zeichen). Eine Änderung muss beides bedienen oder den Weg zu Google trennen.

## Grenzen

- Nur **eine Kategorie** (Frauenpullover, 634 Produkte) und der Stand vom 24.10.; der Weg «App nimmt SEO-Text» ist nicht an der App-Dokumentation belegt, nur an den Daten. Kein Zugang zum Merchant Center von hier.
- Ob es heute noch so ist: ein neuer Bericht aus dem Merchant Center zeigt es (gleicher Bericht, gleiche Spalte «Description»).

## Vorschlag (Entscheid des Besitzers, nichts getan)

**Pilot an den 634 Pullover-Produkten:** `seo.description` mit Material, Muster und Grössen aus den Produktdaten (nur belegte Angaben, ≤ 160 Zeichen, kurzer Versandhinweis am Ende), danach nach etwa sieben Tagen den **gleichen Bericht** neu aus dem Merchant Center ziehen: verschwindet die Empfehlung «Muster, Material» und zeigt die Spalte «Description» den neuen Text, ist der Weg bewiesen, und die Umstellung lässt sich auf den Katalog ausdehnen. Rücknahme: Originaltexte vorher sichern (Werkzeug wie `dropship/ranking-0911/apply_*.py`). Alternative ohne Meta-Text-Änderung: bei der App eine eigene Google-Beschreibung hinterlegen, falls die App dafür ein Feld kennt (ungeprüft).

## Messrezept

`python3 dropship/merchant-beschreibung-0911/klassifizieren.py <Bericht.csv>` (nur lesend, Selbsttest `--selbsttest`). Den Bericht liefert das Merchant Center unter den Empfehlungen («Update product descriptions to include details customers are looking for», Filter: Kategorie wählen, CSV laden); die Drive-Anbindung liest nur Dateien bis 10 MB.

## Die übrigen Dateien im Ordner `luxestyle` (Stand 09.11., nichts Neueres als der 08.11. dabei)

- `product_issues_2026-11-08_07-46-23.csv` (110 MB) und weitere Artikelprobleme-Exporte vom 24.10. (332 MB), 28.10. (38 und 43 MB) und 29.10. (38 MB): über die Drive-Anbindung nicht lesbar (Grenze 10 MB). Die Auswertung vom 08.11. stützt sich auf die kleine Fassung (`dropship/merchant-probleme-0811/README.md`), die 0,2-MB-Datei vom 28.10. war die Grundlage der Zahlen vom 28.10.
- `Products and brands customers are buying on Google_2026-10-24_06-37-36.csv` (60 KB): Land CH, Kategorie «Shirts & Tops», Zeitraum September 2026, 572 Zeilen nach Beliebtheit; H&M (203 Zeilen), adidas (181), Ralph Lauren (86), PUMA (45); 147 Trikots (Fussball-WM). **Für uns nicht verwertbar** (Markenware, Saison vorbei); als Beleg taugt nur: die Schweizer Nachfrage in dieser Kategorie liegt bei Marken.
- Messung nach dem Schaufenster-Budget 78 000 (lief am 09.11. 13:29 UTC, 1 388 Produkte vom Kanal genommen): braucht einen **neuen** Export «Probleme mit Artikeln» in der kleinen Fassung (unter 10 MB), frühestens 11.11.

## Lehren

1. **Ein Bericht des Merchant Centers ist auch ein Messgerät für das, was bei Google ankommt:** die Spalte «Description» zeigte, dass die Werbezeile statt der Beschreibung ankommt; auf der Seite (JSON-LD) sieht man das nicht.
2. **Erst Tags entfernen, dann Entitäten auflösen:** die erste Fassung von `klartext` löste `&lt;` vor dem Entfernen der Tags auf und schnitt Text weg; der Selbsttest hat es gefunden.
3. **Eine Aussage über einen Datenweg erst am Anteil messen:** 95 % von 634 Produkten sind kein Zufall, 4 Produkte wären einer.
