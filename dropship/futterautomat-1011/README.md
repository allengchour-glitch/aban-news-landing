# Katzen-Futterautomat: Edelstahl-Angabe auf das belegte Mass (10.11.2026)

Produkt `gid://shopify/Product/15523986473345`, Handle `futterautomat-fur-katze-527488`, CHF 96.90, eine Variante.

## Anlass
Codex (R165, 10.11.) wollte Text und SEO auf einen Zweizeiler kürzen, weil «Edelstahl», «automatische Fütterung», «Abwesenheit» und «2,2 kg» durch Bilder und Shopify-Daten allein nicht belegt seien. Er sieht das CJ-Datenblatt nicht. Ich habe es selbst gelesen (CJ API `product/query`, pid `1418384701726527488`, 10.11. ca. 07:27 UTC):

- Titel «Pet Smart Feeder **Timing** Cat **Automatic Feeding** Machine», Beschreibung «Material: stainless steel · Features: automatic feeding · Colour: White», Packliste «Pet smart feeder*1», Gewicht 2200 g. Das strukturierte Materialfeld sagt «Others» (widerspricht der Beschreibung).
- Bilder (alle fünf gesichtet): weisses Gehäuse, **sichtbare Edelstahlschale**; Bild 3 zeigt «APP timing quantitative».

**Ergebnis:** Automatik und Gewicht sind durch das Datenblatt belegt, ein Zweizeiler wäre ein Rückschritt für Kaufentscheid und Suche. **Nicht belegt ist, dass das ganze Gerät aus Edelstahl ist:** auf den Bildern ist nur die Schale Edelstahl, das Gehäuse ist weiss (vermutlich Kunststoff, nicht belegt).

## Geändert (LIVE 10.11. ca. 07:28 UTC, zurückgelesen GLEICH, Storefront 200, 0 alte Formulierungen)
- Text: «Er besteht aus Edelstahl und hat eine automatische Fütterungsfunktion.» → «Er hat eine automatische Fütterungsfunktion und eine Futterschale aus Edelstahl.»; Listenpunkt «Aus Edelstahl gefertigt» → «Futterschale aus Edelstahl».
- SEO-Beschreibung: «Aus Edelstahl gefertigt und für die Futterausgabe während deiner Abwesenheit» → «in Weiss mit Fütterungsfunktion und Futterschale aus Edelstahl. Für die Futterausgabe, auch wenn du nicht zu Hause bist.»
- Metafeld `mm-google-shopping.material`: «Edelstahl» → «Edelstahl (Futterschale)».
- Unverändert: Titel, Preis, Variante, SKU, Bilder, Tags, Kanäle, SEO-Titel.

## Rücknahme
`ZURUECK=1 LIVE=1 node dropship/futterautomat-1011/apply.mjs` (stellt `sicherung.json` wieder her). Trockenlauf ist Vorgabe, `LIVE=1` schreibt.

## Offen (nicht geändert, nicht belegt)
- Das Gerät sieht aus wie ein Markenprodukt: Bild 5 trägt den Schriftzug «Xiao Pei ®», der chinesische CJ-Titel nennt «PETKIT». **Hypothese:** Markenware; Rechte und Echtheit ungeprüft. Entscheid beim Besitzer, ob Bild 5 raus soll.
- Stromversorgung (Steckertyp für die Schweiz), App-Verfügbarkeit ausserhalb Chinas und Fassungsvermögen stehen nicht im Datenblatt; Bilder nennen «2,85 L ~ 1,5 kg» und «15 Tage», das sind Bildtexte des Lieferanten und wurden nicht übernommen.
- Auf den Bildern steht englischer Text (Bild 3 und 5).
