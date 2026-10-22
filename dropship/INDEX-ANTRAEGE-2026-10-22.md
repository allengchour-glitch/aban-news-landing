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

## Danach
- Meldung genügt («22.10. alle 10 beantragt») — die Sitzung trägt die Zeilen in `dropship/_index_beantragt.tsv` ein.
- Nachmessung nach 1–3 Tagen: `python3 tools/index_probe.py` (Mo + Do automatisch), danach `python3 tools/index_probe.py --antraege`. **Wirkungslos** (beantragt, nach 3+ Tagen weiter draussen) wäre ein Befund an der Seite selbst, nicht am fehlenden Antrag — davon gibt es bisher 0.
- Die Ampel zeigt ab jetzt «🔎 INDEX-ANTRÄGE: n nicht indexiert OHNE Antrag», solange die letzte Messung höchstens 8 Tage alt ist.
- «Indexierung beantragen» ist keine Garantie; Google entscheidet. Die 34 von 34 sind eine Beobachtung an dieser Seite, kein Versprechen.
