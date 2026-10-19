# Search Console: «Indexierung beantragen» — Klickliste (19.10.2026)

Nur im eingeloggten Konto möglich (Kontingent ca. 10 Anträge pro Tag). Property: **URL-Präfix `https://luxestyle.ch/`**
Link: https://search.google.com/search-console?resource_id=https%3A%2F%2Fluxestyle.ch%2F

**So:** oben in die Leiste «Jede URL in „https://luxestyle.ch/“ prüfen» die Adresse einfügen → Enter → wenn «URL ist nicht bei Google» /
«Gefunden – zurzeit nicht indexiert» steht: **«Indexierung beantragen»** → warten (ca. 1 Minute) → nächste Adresse.

Messung: GEMESSEN 19.10. mit OpenSEO `inspect_urls` (0 Credits). Reihenfolge = Wirkung auf die Geschenkwoche und den Werbetest A «geschenke-test» (bis 24.10.).
Stand je Adresse steht in `dropship/_index_beantragt.tsv`; die Sitzung misst am Montag/Donnerstag nach (`tools/index_probe.py`).

## Heute (10 Anträge)
1. https://luxestyle.ch/collections/geschenke-fuer-ihn — «Discovered – currently not indexed», 401 Produkte, SEO-Titel seit 19.10. «Geschenke für Männer»
2. https://luxestyle.ch/collections/premium-geschenke — «URL is unknown to Google» (Hauptmenü-Eintrag!), 400 Produkte
3. https://luxestyle.ch/collections/kleine-geschenke-mitbringsel — «Discovered», 304 Produkte
4. https://luxestyle.ch/collections/geschenke-unter-50-franken — «Discovered», 400 Produkte
5. https://luxestyle.ch/collections/geschenke-unter-100-franken — «Discovered», 400 Produkte
6. https://luxestyle.ch/blogs/ratgeber/weihnachtsgeschenke-2026-schweiz-ideen — «Discovered»
7. https://luxestyle.ch/blogs/ratgeber/geschenke-fuer-maenner-2026-schweiz — «Crawled – currently not indexed», letzter Abruf 16.09.
8. https://luxestyle.ch/blogs/ratgeber/adventskalender-zum-befuellen-24-kleine-geschenke-ratgeber — «Discovered»
9. https://luxestyle.ch/collections/holzuhren — «Discovered», 99 Produkte (zuvor «URL is unknown to Google»)
10. https://luxestyle.ch/collections/schlafmasken — «Discovered», 22 Produkte

## Morgen (20.10.)
11. https://luxestyle.ch/collections/kleiderstaender — «Discovered», 10 Produkte (zurückgestellt wegen des Tageskontingents)

## Schon erledigt (nicht nochmal)
geschenke-fuer-sie, weihnachtspyjama-familie, halloween, weihnachten-2026, weihnachtspullover, handwaermer, kostueme-ch-lager, futterautomaten, trinkbrunnen-katzen,
gps-tracker, handstaubsauger, licht-nachtlicht-projektor, schminkspiegel — alle «Submitted and indexed».

## Wenn es nicht greift
«Indexierung beantragen» ist keine Garantie; Google entscheidet. Nach 7 Tagen steht der Zustand im nächsten Messlauf (`python3 tools/index_probe.py --stand`).
Mehr Anträge als das Kontingent erlaubt bringen nichts — die Reihenfolge oben ist absichtlich nach Nutzen sortiert.
