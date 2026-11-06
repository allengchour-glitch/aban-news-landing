# Rückgabe-Texte «Selbst gestalten» wie bei Printful (Besitzer 06.11.2026: «5 wie im printful schreibe das»)

**Regel (Entwurf des Texters, zwei Gegenleser):** Selbst gestaltete Artikel werden erst nach der Bestellung nach dem Entwurf gedruckt.
Rückgabe/Umtausch aus Meinungsänderung oder falscher Grössen-/Farbwahl ist ausgeschlossen; bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust
Ersatz oder Erstattung (Bitte um Meldung innert 30 Tagen nach Erhalt, bei nicht angekommenem Paket bis 30 Tage nach dem voraussichtlichen Lieferdatum);
gesetzliche Mängelrechte bleiben unberührt. Liechtenstein: Ausnahme für Anfertigung nach Vorgaben (Art. 19 Abs. 1 Bst. c FAGG, Anwendbarkeit = Hypothese).

## Welle 1 (LIVE 06.11.2026 ca. 00:15 UTC, Rücklesen GLEICH Soll)
- `apply.mjs` (Trockenlauf Vorgabe, `LIVE=1` schreibt, `ZURUECK=1 LIVE=1` nimmt zurück, nur wenn Produkt/Datei noch genau den geschriebenen Stand hat), Daten `daten/welle1.json` (71 Einträge), Test `apply_test.mjs` (30 Prüfungen).
- **40 Produkte:** SEO-Beschreibung von 27 («30 Tage Rückgabe» → «Ersatz bei Druckfehlern», seo.title unverändert mitgeschickt), Rückgabe-Kasten `div.ls-pod-retoure` von 37 ersetzt, pauschale USP-Zeile in 2, Kasten an 3 Entwürfe angehängt.
  Der Marker `lspod-designer` bleibt in jeder Beschreibung (die Theme-Weichen hängen daran; Schutz im Skript).
- **Theme `templates/product.json` (MAIN):** nur der Editor-Zweig: Aufklappbereich «Rückgabe & Umtausch» (G7) und Vertrauenszeile (G8, «Ersatz bei Druckfehlern, keine Rückgabe bei Meinungsänderung»); der `else`-Zweig (30 Tage für alle anderen Produkte) bleibt. Rohtext-Ersetzung, Format und Kommentarkopf unverändert. Sicherung `sicherung/product.json.vor` und `sicherung/welle1.json`.
- Gemessen am Live-Shop (curl, Tasse und T-Shirt): neuer Kasten und Meta-Beschreibung sichtbar, alter Satz «Jedes Stück wird eigens …» und «Rückgabe bei personalisierter Ware» weg; Normalprodukt (Perlencollier) zeigt weiter «30 Tage», kein «Ersatz bei Druckfehlern».

## Welle 2 (NICHT eingespielt, wartet auf das Ja des Besitzers zum Rechtstext)
Rückgaberichtlinie (neuer Abschnitt `#selbst-gestaltete-artikel`, auf den der Kasten schon verlinkt: bis dahin springt der Link nur auf die Richtlinie), AGB §7/§8, Seiten (Garantie & Rückgabe, Rückgabe & Widerruf, FAQ, Grössen-Guide, Selbst gestalten, Fan-Trikot),
Warenkorb, Ankündigungsleiste und Fusszeile (zeigen weiter «30 Tage Rückgabe» auf JEDER Seite, auch auf den Editor-Produkten), Chat-Assistent, FR/EN, Sammlungstext, Blog, Merchant Center, Generatoren im Repo, die den alten Satz wieder schreiben
(seo_titel.mjs, pod_modell/beschreibung.mjs, shop_brain.mjs, shop_autopilot.mjs, workers/shop-brain/worker.js, seo_catalog_fix.py, catalog_enrich.py, titel_korrigieren.mjs, seo-optimizer.mjs).
**Übergangs-Widerspruch (bekannt):** die Produktseite bittet um Meldung innert 30 Tagen, die Rückgaberichtlinie nennt für Defekte noch 7 Tage; die 30 Tage sind für Kundinnen günstiger, niemand wird benachteiligt.

## Offene Entscheide des Besitzers
Fertigprodukte (464, nicht angefasst) · Kulanz nach Tag 30 · «Ersatz oder Erstattung» (wir entscheiden nach Prüfung) · Meldeweg (Mail info@luxestyle.ch mit Bestellnummer und Foto) · Liechtenstein-Satz · Wortlaut der Richtlinie/AGB (Welle 2).
