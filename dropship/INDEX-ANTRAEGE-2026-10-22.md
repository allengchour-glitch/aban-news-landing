# Search Console: «Indexierung beantragen» — Klickliste für Do 22.10.2026

Nur im eingeloggten Google-Konto möglich (Kontingent ca. 10 Anträge/Tag). Property **`https://luxestyle.ch/`**. Jeder Link öffnet direkt die Prüfung der Adresse → **«Indexierung beantragen»** → ca. 1 Minute warten → nächster Link.

## Warum diese 10 (GEMESSEN 22.10. 00:33 UTC)

`tools/index_probe.py` (OpenSEO `inspect_urls`, 0 Credits), 60 Adressen im Messbestand:

- **Von den 34 Adressen, die du beantragt hast, stehen 34 im Index.** Die 10 vom 20.10. abends («alle geklappt») waren bei der Nachmessung **10 von 10 indexiert**, binnen etwa einem Tag.
- **Die 10 Adressen unten hast du nie beantragt — und keine davon ist indexiert** (8× «Discovered/unknown», `fur-ihn` und `sub-beleuchtung` seit Juni «Crawled – currently not indexed»).
- Gesamtstand 50 von 60 indexiert (13.10.: 15 von 45). Der Unterschied sitzt fast vollständig in «beantragt» gegen «nie beantragt». IndexNow erreicht nur Bing, nicht Google.

Folge: jeder weitere Antrag hat auf dieser Seite eine gemessene Trefferquote von 34 von 34. Mehr als ca. 10 pro Tag nimmt Google nicht an — die Liste ist darum nach Nutzen geordnet, der Rest folgt morgen.

**Falls ein Link nicht öffnet:** oben in Search Console in die Leiste «Jede URL in „https://luxestyle.ch/“ prüfen» die Adresse einfügen (`https://luxestyle.ch/collections/<Name>`), Enter, dann «Indexierung beantragen».

## Heute (10 Anträge) — Reihenfolge nach Nutzen

1. [collections/schuhe](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=Yo83rkajNY9-qDFlkMa7IA&utm_medium=link&utm_source=api) — Hauptkategorie (Hauptmenü) — Stand: Discovered
2. [collections/schmuck-uhren](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=4KXTNqFjBeIkAATa1ZQEeQ&utm_medium=link&utm_source=api) — Hauptkategorie — Stand: unknown
3. [collections/beauty-pflege](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=_JikWR2YCTUMyou9kWu3Vw&utm_medium=link&utm_source=api) — Hauptkategorie — Stand: Discovered
4. [collections/elektronik-technik](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=0fx7ROBwP0jJWtgY6_pOnQ&utm_medium=link&utm_source=api) — Hauptkategorie — Stand: Discovered
5. [collections/fur-ihn](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=8uaCvMt62GzpizUtSq8Q-A&utm_medium=link&utm_source=api) — Hauptkategorie «Für ihn» — Stand: Crawled – currently not indexed (letzter Abruf 12.06.)
6. [collections/sub-beleuchtung](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=RHmRSzbFMY2orXDkoxpklw&utm_medium=link&utm_source=api) — Unterkategorie Beleuchtung im Menü «Wohnen & Garten» — Stand: Crawled – currently not indexed (letzter Abruf 22.06.)
7. [collections/sicherheitsschuhe](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=yWoia0tA8aYPj2aJ_5HdMg&utm_medium=link&utm_source=api) — Such-Kollektion — Stand: Discovered
8. [collections/camisole-traegertops](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=hu1eAF43X_zzTBqQ-1rNaw&utm_medium=link&utm_source=api) — Such-Kollektion — Stand: unknown
9. [collections/smart-ring](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=6CuWBclyQOwdOK7wfoQhgA&utm_medium=link&utm_source=api) — Such-Kollektion — Stand: Discovered
10. [collections/schrank-organizer](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=be-kGcJT7inzaj6zxXz-Pg&utm_medium=link&utm_source=api) — Such-Kollektion — Stand: Discovered

Begründung der Reihenfolge: zuerst die Hauptkategorien im Menü (sie tragen die internen Links an alle Unterseiten), dann die zwei «Crawled – currently not indexed»-Fälle, zuletzt die Such-Kollektionen.

## Vorher geprüft (22.10. 07:55 UTC, Routine «Google-Index-Liste täglich»)
- **Admin-API:** alle 10 Kollektionen existieren, tragen Ware (schuhe 5'221 · schmuck-uhren 7'783 · beauty-pflege 7'022 · elektronik-technik 6'018 · fur-ihn 6'113 [Titel «Herren-Mode»] · sub-beleuchtung 579 · sicherheitsschuhe 113 · camisole-traegertops 42 · smart-ring 11 · schrank-organizer 7) und sind in Onlineshop, Google & YouTube und den übrigen Kanälen veröffentlicht.
- **`sicherheitsschuhe`** (Routine-Bedingung «Name und Ware nach der PSA-Umbenennung»): Titel heute «Arbeitsschuhe mit Stahlkappe», der Text sagt ausdrücklich «keine zertifizierten Sicherheitsschuhe (keine PSA nach EN ISO 20345)» — Name und Ware passen, der URL-Handle bleibt `sicherheitsschuhe`.
- **Besucher-Sicht (WebFetch):** `smart-ring` (11 Artikel) und `camisole-traegertops` (42 Artikel) laden ohne Fehler; die übrigen Abrufe liefen in HTTP 429 (Drosselung) und wurden nicht wiederholt — die Admin-Daten oben tragen die Aussage.
- **Geschenke-Seiten** stehen nicht mehr auf der Liste: alle 9 sind seit 19.10. indexiert.

## Danach
- Meldung genügt («22.10. alle 10 beantragt») — die Sitzung trägt die Zeilen in `dropship/_index_beantragt.tsv` ein.
- Nachmessung nach 1–3 Tagen: `python3 tools/index_probe.py` (Mo + Do automatisch), danach `python3 tools/index_probe.py --antraege`. **Wirkungslos** (beantragt, nach 3+ Tagen weiter draussen) wäre ein Befund an der Seite selbst, nicht am fehlenden Antrag — davon gibt es bisher 0.
- Die Ampel zeigt ab jetzt «🔎 INDEX-ANTRÄGE: n nicht indexiert OHNE Antrag», solange die letzte Messung höchstens 8 Tage alt ist.
- «Indexierung beantragen» ist keine Garantie; Google entscheidet. Die 34 von 34 sind eine Beobachtung an dieser Seite, kein Versprechen.

## Nachmessung 22.10. ~08:40 UTC (nach der Meldung «alle indexiert», `inspect_urls`, 0 Credits)
- **Im Index («Submitted and indexed», Abruf 08:31 UTC): 4 von 10** — sicherheitsschuhe, camisole-traegertops, smart-ring, schrank-organizer.
- **Heute 08:31 abgerufen, noch «Crawled – currently not indexed»: 5** — schuhe, schmuck-uhren, beauty-pflege, elektronik-technik, fur-ihn. Google hat sie auf den Antrag hin geholt und noch nicht aufgenommen; bei den 34 früheren folgte die Aufnahme binnen etwa einem Tag. Nachmessen am 23.10.
- **sub-beleuchtung: letzter Abruf weiter 22.06.** — der Antrag ist dort noch nicht verarbeitet (oder nicht abgeschickt). Nachmessen am 23.10.; steht sie dann unverändert, bitte den Antrag für diese Adresse einzeln wiederholen.
- Ledger: 10 Zeilen «Betreiber (Meldung 22.10.)» in `dropship/_index_beantragt.tsv`.

## Nächste Kandidaten aus der GSC-Liste «Gefunden – zurzeit nicht indexiert» (Betreiber-Screenshot 22.10., live nachgemessen ~09:10 UTC)
**Der GSC-Bericht hinkt:** `holzuhren` steht dort noch als «Gefunden», ist live aber seit dem Antrag vom 19.10. indexiert («Submitted and indexed», Abruf 19.10. 20:10); `herren-pullover` ist seit dem Abruf von 08:37 UTC heute indexiert (vermutlich Dein Antrag, im Ledger nicht eingetragen). Massgeblich ist die Einzel-Prüfung, nicht die Beispielliste.

Noch NICHT im Index (live gemessen), nach Nutzen geordnet:
1. [collections/spielzeug](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=jeqwbpOWC9lS1jfpS6b2Xg&utm_medium=link&utm_source=api) — Hauptkategorie, «URL is unknown to Google»
2. [collections/hochzeitsgeschenke](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=QSkS1-5-eIJ7x-EA6997Bw&utm_medium=link&utm_source=api) — «URL is unknown to Google»
3. [collections/garten-leuchten](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=m5HtjAUg7O0joLvZBtQVCQ&utm_medium=link&utm_source=api) — Discovered, nie abgerufen
4. [collections/gerade-auf-instagram](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=hxCmYc7SA-JihdgztHDEjQ&utm_medium=link&utm_source=api) — Discovered, nie abgerufen
5. [blogs/magazin/9-geschenkideen-fur-frauen-unter-chf-60-…](https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=LrmwqTImv-akaAJ02YmMog&utm_medium=link&utm_source=api) — Magazin-Artikel, Discovered (saisonal: Muttertag; niedrig)

Nicht beantragen: `collections/🎁-geschenke-bis-chf-30` (Emoji-Handle, Google kennt die Adresse nicht; die Geschenk-Kollektionen «unter 50/100 Franken» sind seit 19.10. indexiert) und die zwei `/fr/blogs/ratgeber/…`-Adressen (Sprachpfad, kaum Nachfrage).

## Nachmessung 22.10. ~10:30 UTC (`inspect_urls`, 0 Credits)
- **Alle 10 Adressen der Klickliste stehen im Index («Submitted and indexed», Abruf 08:31 UTC):** schuhe, schmuck-uhren, beauty-pflege, elektronik-technik, fur-ihn, sub-beleuchtung (der Abruf vom 22.06. war eine veraltete Anzeige — der Antrag war angekommen), sicherheitsschuhe, camisole-traegertops, smart-ring, schrank-organizer. Zusammen mit den früheren 34: **44 von 44 beantragte Adressen indexiert**, jeweils binnen ~1,5 Stunden bis 1 Tag.
- **Die vier neuen Kandidaten sind NICHT beantragt** (kein Abruf, `spielzeug` und `garten-leuchten` «URL is unknown to Google», `hochzeitsgeschenke` und `gerade-auf-instagram` «Discovered»). Direktlinks weiter oben im Abschnitt «Nächste Kandidaten».

## Ergebnis 23.10.2026 (Nachmessung, OpenSEO `inspect_urls`, GEMESSEN)
Alle 10 Adressen dieser Liste stehen im Index («Submitted and indexed»): schuhe (Abruf 23.10. 02:13 UTC), schmuck-uhren, beauty-pflege, elektronik-technik, fur-ihn, sub-beleuchtung, sicherheitsschuhe, camisole-traegertops, smart-ring, schrank-organizer (Abruf 22.10. 08:31 UTC). Beantragt 22.10. → indexiert binnen ~1 Tag, wie bei den 10 vom 20.10. Nächste Liste: `dropship/INDEX-ANTRAEGE-2026-10-23.md`.
