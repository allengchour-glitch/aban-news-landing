# Jacken und Kleider sauber sortiert (2.11.2026)

Auftrag Besitzer: «jacken und kleider sauber sortieren?»

## Befund (GEMESSEN, frischer Katalog 56 529 Produkte)
- **Kleider:** 3 170 Produkte in `damen-kleider`, **1 035 (33 %) in keinem der 15 Unterfilter** (Wörter ohne Unterfilter: A-Linien, V-Ausschnitt, Neckholder, Puffärmel, Bodycon, Samt, Leinen, Plissee, Jeans …). Fremdkörper: Badeanzug und Unterkleider.
- **Jacken:** Die Unterfilter existierten (Damen 6, Herren 9) und die Seiten waren erreichbar, aber **im Menü hing unter «Damen/Herren › Jacken & Mäntel» nichts**; «Herbst & Übergang» zeigte die alte, gemischte Sammlung `jacken-outdoor` (693, Damen+Herren+Kostüme) und `winterjacken` (57).

## Geändert (LIVE)
1. **11 neue Kleider-Unterfilter** (A-Linien 324, Träger & Neckholder 395, Figurbetonte & Etui 224, Rüschen & Puffärmel 230, Satin/Seide/Chiffon 158, Samt & Pailletten 106, Gepunktet & gestreift 188, Leinen 72, Plissee 62, Jeans & Denim 56, Wickel 19) und **4 neue Damen-Jacken-Unterfilter** (Stepp & Puffer 78, Übergang & Bomber 29, Capes & Ponchos 21, Trenchcoats 19). Daten in `dropship/mode-taxonomie-2610/ALLES.json`, Test `mode_taxonomie_test` auf 161 Filter angepasst (47 ok; `kategorien_test` 132, `mode_menue_test` 67, `unterfilter_plan_test` 14 ok).
2. **Tags und Sammlungen** über `kategorien_anlegen.mjs` (`MODE_BEREICHE=bekleidung PREFIX=m-`): 1 985 Tag-Änderungen, 15 Sammlungen in 7 Kanälen, alle «Mitglieder n / erwartet n» gleich. Aus `damen-kleider` genommen: 3 Produkte (Badeanzug, Unterkleid; Regel `titel_nicht`).
3. **Chips:** `kategorie_unterfilter.mjs` (193 Metafelder, alle ✓). Die Kleider-Seite zeigt jetzt 26 Chips (Screenshot geprüft).
4. **Menü** (`dropship/jacken-kleider-0211/menue_jk.mjs`, Sicherung `menu-sicherung/main-menu-vor-jacken-kleider-0211.json`): Damen › Kleider +11, Damen › Jacken & Mäntel +10, Herren › Jacken & Mäntel +9, Herbst & Übergang: «Jacken & Mäntel» und «Winterjacken & Daunenjacken» (alte Sammlungen) ersetzt durch Damen/Herren-Einträge (je zwei). Trockenlauf = Live = Nachlesen: genau diese 34 neuen und 2 ersetzte Einträge, Rest unverändert, Tiefe 3.
5. **Seiten:** alle 19 geprüften Links HTTP 200 (ein 503, danach 200).

## Offen / unbekannt
- Menü Kleider hat jetzt 26 Einträge (lang); Kürzen oder Gruppieren ist Geschmackssache des Besitzers.
- Banner/«gut bewertete zuerst» für die 15 neuen Sammlungen nicht gemacht (Hero erscheint automatisch).
- Die alten Sammlungen `jacken-outdoor`/`winterjacken` bleiben bestehen (Links aus dem Menü entfernt, Seiten erreichbar).
- Index-Anträge für die 15 neuen Seiten: nicht gestellt (Kontingent).
