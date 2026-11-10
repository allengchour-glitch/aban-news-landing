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

## Nachtrag 10.11. 10:27 UTC: Kurzfassung von 08:46 UTC ersetzt, belegte Fassung wieder eingespielt
- **Anlass:** Um 08:46 UTC (`updatedAt`) standen Titel, Text und SEO wieder in einer Kurzfassung («Futterspender für Katzen in Weiss», zwei Sätze: «Dieser weisse Futterspender für Katzen ist in einer Ausführung erhältlich. Prüfe vor dem Kauf die aktuelle Produktseite.»). Der Titel hatte «Automatischer» verloren; die Seite steht in der Search Console für «elektrischer futterspender für katzen» auf Platz 18 bis 21 (189 Einblendungen in 35 Tagen). Urheber von hier nicht zu sehen (Codex' Lauf R165 endete 07:26 UTC); kein anderes Produkt trägt die Formel (Suche über die seit 08:30 UTC geänderten Produkte).
- **Beleg frisch gelesen (CJ API `product/query`, 10.11. 10:23 UTC):** Titel «Pet Smart Feeder Timing Cat Automatic Feeding Machine», Beschreibung «Material: stainless steel · Style: Fashion and simplicity · Features: automatic feeding · Colour: White · Packing list: Pet smart feeder*1», Gewicht 2200 g (Verpackung 2250 g), Produktmerkmal «ELECTRONIC», strukturiertes Materialfeld «Others». Gleich dem Befund von 07:27 UTC. Der chinesische Titel nennt «PETKIT» (Markenhersteller), siehe unten.
- **Entscheid:** Besitzer «ja fix alles» auf mein Angebot «belegte Fassung von 07:28 UTC wieder einspielen, Kurzfassung vorher sichern». `wiederherstellen.mjs` (Trockenlauf Vorgabe, `LIVE=1` schreibt) schrieb Titel «Automatischer Futterspender für Katzen», SEO-Titel «Automatischer Futterspender für Katzen | LuxeStyle CH», die SEO-Beschreibung und den Text von 07:28 UTC; das Material-Metafeld («Edelstahl (Futterschale)») war unverändert. Rücklesen GLEICH, Storefront 10:27 UTC: `<title>`, H1 und Meta im Soll, «Prüfe vor dem Kauf» weg, Canonical unverändert, Handle unverändert (kein Umleiten nötig).
- **Rücknahme (zurück auf die Kurzfassung):** `ZURUECK=1 LIVE=1 NODE_USE_ENV_PROXY=1 node dropship/futterautomat-1011/wiederherstellen.mjs` (liest `sicherung-kurzfassung-0846.json`). Schutz: schreibt nur, wenn der Text die bekannte Kurzfassung ist (sonst Exit 4: jemand hat dazwischen geändert; `FREMD_UEBERSCHREIBEN=1` übersteuert nach Blick auf den Stand).
- **Test:** `node dropship/futterautomat-1011/wiederherstellen_test.mjs` (Attrappe, 35 Prüfungen), Mutationsprobe 16 von 16 erkannt (der erste Lauf liess einen überleben: «elektrisch» gross geschrieben im Soll; Test auf Gross-/Kleinschreibung geschärft). Läuft nicht in der CI.
- **Lehren:** (1) Der Shopify-Schlüssel in der Umgebung trägt Anhängsel hinter den 38 Zeichen `shpss_` + 32 Hexzeichen (Länge 61): ein Node-Skript muss ihn wie `dropship/fr-produkte-0911/shop.py` kürzen, sonst «Missing or invalid client secret» (HTTP 400, ohne `Accept: application/json` als HTML-Seite, was als «kein JSON» erscheint). (2) Node braucht in der Cloud-Sitzung `NODE_USE_ENV_PROXY=1`. (3) Ein Arbeitsstand, der zwischen zwei Sitzungen hin und her geschrieben wird, braucht einen Vermerk, den beide beim Start lesen (`AGENTS.md`, Liste «Zuletzt von mehreren bearbeitet»).
- **Weiter offen (Entscheid des Besitzers):** das fünfte (letzte) Galeriebild (Katze; alt-Text «Bild 4», das Hauptbild trägt den alt-Text «Bild 5») trägt «Xiao Pei ®» (Marke von PETKIT): raus oder bleiben; Steckertyp, App-Verfügbarkeit und Fassungsvermögen sind nicht belegt und stehen nicht im Text.
- **Kontrolle 10.11. gegen 12:30 UTC:** Der Inhalt ist unverändert (`wiederherstellen.mjs` im Trockenlauf: «Schon im Soll: nichts zu tun.»). `updatedAt` stand auf 10:48:00Z, aber nur weil Judge.me sein Metafeld `review_widget_data` (10:47:57Z, enthält den Produktnamen) nach der Titeländerung neu schrieb: **die Änderungszeit taugt nicht als Beleg, der Trockenlauf schon.** Galerie (selbst angesehen): Position 1 sauber, Position 2 bis 5 mit englischem Lieferantentext; das fünfte Bild zeigt «Xiao Pei», «Capacity: 2.85L ~ 1.5kg», «can feed for 15 days», Position 3 «APP timing quantitative»: Angaben der Bilder, nicht im CJ-Datenblatt, darum nicht im Text.
