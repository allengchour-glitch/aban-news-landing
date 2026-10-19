# Search Console: «Indexierung beantragen» — Klickliste (19.10.2026)

Nur im eingeloggten Konto möglich (Kontingent ca. 10 Anträge pro Tag). Property: **URL-Präfix `https://luxestyle.ch/`**
Link: https://search.google.com/search-console?resource_id=https%3A%2F%2Fluxestyle.ch%2F

**So:** oben in die Leiste «Jede URL in „https://luxestyle.ch/“ prüfen» die Adresse einfügen → Enter → wenn «URL ist nicht bei Google» /
«Gefunden – zurzeit nicht indexiert» steht: **«Indexierung beantragen»** → warten (ca. 1 Minute) → nächste Adresse.

Messung: GEMESSEN 19.10. mit OpenSEO `inspect_urls` (0 Credits). Reihenfolge = Wirkung auf die Geschenkwoche und den Werbetest A «geschenke-test» (bis 24.10.).
Stand je Adresse steht in `dropship/_index_beantragt.tsv`; die Sitzung misst am Montag/Donnerstag nach (`tools/index_probe.py`).

## Was ich schon erledigt habe (19.10. abends) — und was nur du kannst
- **Der Knopf «Indexierung beantragen» geht nur im eingeloggten Google-Konto.** Dafür gibt es keine Schnittstelle: Googles Indexing-API gilt offiziell nur für Stellenanzeigen und Livestreams, und ich habe hier kein Google-Login und keinen Browser mit deinem Konto (keine Chrome-Anbindung, keine erreichbare PC-Sitzung).
- **IndexNow an Bing gemeldet** (HTTP 200): alle 11 Adressen unten plus die drei geänderten Kollektionen (Hausschuhe & Slipper, Schuhe, T-Shirts & Tops). Bing speist ChatGPT-Suche, Copilot und DuckDuckGo; Google nimmt IndexNow nicht an.
- **Interne Links gemessen:** alle 402 Kollektionen mit ≥ 3 aktiven Produkten haben einen eingehenden Link (`interne_links.py --waisen`); die 5 Geschenk-Kollektionen sind sogar von Startseite, Hubs und indexierten Seiten verlinkt. Der Engpass ist also nicht das Auffinden, sondern Googles Entscheidung — genau dafür ist dein Klick der einzige Hebel.

## Direktlinks (je ein Klick öffnet die Prüfung der Adresse in Search Console)
GEMESSEN 19.10. abends: die Links stammen aus der URL-Inspection-API (`inspectionResultLink`, über OpenSEO `inspect_urls`, 0 Credits). Das `id` ist eine undurchsichtige Kennung der Prüfung, NICHT die Seitenadresse. **Korrektur:** meine erste Fassung baute `id=<Seitenadresse>` selbst zusammen — die gab auf search.google.com «404» (Betreiber-Screenshot 19.10.). Nie wieder ein Linkformat raten, den Link immer aus der API holen. Stand-Spalte: `unknown` = «URL is unknown to Google», `Discovered` = «Discovered – currently not indexed», `Crawled` = «Crawled – currently not indexed».

1. [collections/geschenke-fuer-ihn](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=g1lVxhAggumrSNHOGD8gzg&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: Discovered
2. [collections/premium-geschenke](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=E6ptIBVDA5-joLyxdUxW2w&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: unknown
3. [collections/kleine-geschenke-mitbringsel](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=xqwJVu_vubucm3Gf5TZ_yw&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: unknown
4. [collections/geschenke-unter-50-franken](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=Oi1ptULxcC3OpyMjh7RM2g&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: unknown
5. [collections/geschenke-unter-100-franken](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=nCazs_PSxz8tpQ_fKwpnsQ&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: Discovered
6. [blogs/ratgeber/weihnachtsgeschenke-2026-schweiz-ideen](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=m07FRsPtcAYi8CTIqyWyKQ&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: unknown
7. [blogs/ratgeber/geschenke-fuer-maenner-2026-schweiz](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=JzoOX7IGMXOZzCN2xGuFKg&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: Crawled
8. [blogs/ratgeber/adventskalender-zum-befuellen-24-kleine-geschenke-ratgeber](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=gGO9jQjpD9xI2FfIoK0ggg&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: unknown
9. [collections/holzuhren](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=8gmzWq9VdiyjTKMYi_4a-g&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: unknown
10. [collections/schlafmasken](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=JDLKs1bR92-zrFogE0RJ9A&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: unknown
11. [collections/kleiderstaender](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=J2mdPTraO49hvjGaIj5d-w&utm_medium=link&utm_source=api) — Stand 19.10. 21:00: Discovered

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
