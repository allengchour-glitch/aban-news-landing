# Sammelkorb «Büro & Home Office»: Tastatur, Maus und Tischtennis-Kleber standen bei Google unter «Office Supplies» (08.10.2026, 12:30–13:15 UTC)

Autonome Verbesserungsrunde 12:26 UTC. Die Plan-Tage 1–11 sind erledigt, Tag 12 (Auswertung) folgt am 12.10.

## GEMESSEN
- **Kanäle 7 T (Mensch):** direkt 195, TikTok 143, Facebook 28, Google 24, keine Käufe. TikTok kam fast ganz vom 01. bis 04.10.
  (37–53 Social-Sitzungen pro Tag, danach 0–1). Das war die bezahlte Lernkampagne mit CHF 80 Gesamtbudget
  (`TIKTOK-LERN-KAMPAGNE.md`); sie lief wie geplant aus, das ist kein Fehler. Das Werbekonto ist über den Konnektor derzeit
  nicht lesbar (40001 «No permission»).
- **Neuimporte der letzten 4 h: 33** (alle ACTIVE, ≥ 2 Bilder, alle im Google-Kanal, alle mit Google-Kategorie). 11 davon
  stammen aus der CJ-Gruppe «Büro & Home Office», und alle 11 tragen Google «Office Supplies», auch Bluetooth-Tastatur,
  Bluetooth-Maus, Diskettenlaufwerk, Tischtennis-Kleber, Golf-Adventskalender und Moissanit-Tester.
- **Bestand Typ «Büro & Home Office»:** 55 aktive, davon 14 auf der Oberklasse «Office Supplies». Die Ampel meldet den Typ
  zudem als «unbekannt» (3 ohne Shopify-Kategorie).
- **Warum das liegen blieb:** Die Tabelle `google_kategorie.mjs` macht aus dem Typ «Office Supplies». `oberklasse_lernen` fand
  keine Regel. Die KI-Stufe darf nur INNERHALB der Oberklasse verfeinern, eine Tastatur kommt dort also nie in den
  Elektronik-Zweig. Gleiches Muster wie beim Werkzeug-Sammelkorb vom 07.10.: Der Gruppen-Stempel ist kein Warenurteil.
- Nebenbefund ohne Handlungsbedarf: Die «HTTP 429»-Zeilen in `/tmp/google_fein_ki_3/4.log` stammen vom 02.10. Die KI-Stufe
  pausiert seit 00:42 planmässig, weil das Groq-Tageskontingent leer ist.

## GETAN
- **EINE Regeldatei** `automation/data/buero_korb.json` (17 Regeln, erste gewinnt): Tastenkappen, Handgelenkauflagen, Mauspads,
  Tastatur (nicht Klavier/Reinigung), Maus (nicht Falle/Plüsch, nur mit Bluetooth/Funk/DPI-Merkmal), Diskettenlaufwerk,
  Monitor-/Laptopständer, Tischtennis (Kleber/Beläge → Schläger-Zubehör), Adventskalender, Moissanit-/Diamant-Tester,
  Übersetzer, Rechner (nicht Kalorien/Notizbuch), Haftnotizen, Ordner, Mappen, Etuis (nicht Brille/Schmuck/Handy).
  Alle Zielpfade sind gegen Googles Taxonomie geprüft. Unklares («Kinder-Schreibtraining-Set», «Stoffhalter») bleibt «Office Supplies».
- **Importer** `google_kategorie.mjs` → `bueroKorb()` für die Typen «Büro & Home Office»/«Büro». Neuware steht damit schon beim
  Anlegen richtig, und `cj_category_fill.mjs` leitet daraus auch den Produkttyp ab.
- **Täglicher Umzug** `google_kategorie_umzug.py`: Die Quelle genau «Office Supplies» liest dieselbe Datei (Aufseher, GKU-Kette).
- **Kanarien:** 25 aus echten Titeln plus Köder (Mausefalle, Plüsch-Maus, Keyboard-Klavier, Tastatur-Reinigungsgel, Brillenetui,
  Kalorienrechner-Notizbuch), Gesamtlauf **120/120**. **Gleichlauf py = js über 51'586 Titel: 0 Abweichungen.**
- **Geschrieben:** 13 Produkte (12 Büro-Typ + 1 Federmäppchen aus einem anderen Typ), **13 gesetzt / 0 Fehler, Rücklesen 13/13**.
  Ledger `dropship/_google_kategorie_umzug.tsv` (Rückweg: alter Wert = «Office Supplies»).

## Nachher
Auf «Office Supplies» bleiben 5 Produkte, alle ohne eindeutiges Warenwort (Feinstufe/KI). Die Shopify-Kategorie zieht
`kategorie_fein` in der Nacht aus der Google-Kategorie nach; damit verschwindet auch die Ampel-Meldung «unbekannte Typen».

## OFFEN
- Keine Betreiber-Klicks für diese Klasse. Bekannt und unverändert: OpenAI-Guthaben leer seit 08.10. 10:30 UTC (die
  Zweitprüfer laufen auf Groq), TikTok-Werbekonto über den Konnektor nicht lesbar.
