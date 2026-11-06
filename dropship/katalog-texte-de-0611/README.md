# Katalogfenster «Selbst gestalten»: deutsche Texte, Schweizer Einheiten (Stand 06.11.2026, NICHT live)

Auftrag (Besitzer 05.11.): «auf schweizer masse … bei jedem selbstgestalten produkt», Screenshots mit englischer Herstellerbeschreibung und oz/lb/Zoll im Katalogfenster `https://luxestyle.ch/collections/selbst-gestalten-1?view=luxe-gestalten`.
Workflow `katalog-texte-de` (Run `wf_438ff91e-ce5`, 68 Agenten: 20 Übersetzer, 20 Gegenleser, Wörterbuch, Bau, 4 unabhängige Prüfer, Korrektur, Nachprüfung). Ergebnis: **kein Blocker, kein wichtiger Fund offen**, Nachprüfung «einspielbereit mit zwei Bedingungen».

## Inhalt
- `luxe-clothing-texts-de.json` (401 815 Byte, md5 `86cbb866…`): 571 Beschreibungen, 155 Positionen, 34 Optionstitel, 58 Optionswerte, 9 Techniken, 20 Regionen, 33 Materialnamen; neues Theme-Asset `assets/luxe-clothing-texts-de.json`, wird erst beim ersten Öffnen einer Detailansicht geladen (0 Anfragen beim Seitenaufbau), nur bei deutscher Seitensprache; Rückfall auf den englischen Originaltext, wenn die Datei fehlt oder kaputt ist (nie leer).
- `theme/*.orig` = Stand der vier Live-Dateien am 05./06.11. (md5 Alt: JS `198328a6…`, de.json `74704b4a…`, en.default.json `75522c42…`, Section `71c1406c…`); `theme/*` = geänderte Fassung. `patch_bauen.py` baut sie aus den `.orig` durch verankerte Ersetzungen (jede genau einmal, sonst Abbruch; Kommentarmarke `LX-KATALOGTEXTE-0511`). `aenderungen.diff` zeigt den Unterschied.
- Quellen: `stapel_in/` (Eingabe, 20 Stapel + `woerter.json`), `stapel_out/` (Übersetzung nach Gegenlesen), `zusammenfuehren.py` baut die Textdatei (bricht bei imperialen Resten, ß, Gedankenstrich, fehlenden Ids ab), `pruefen_texte.py`/`pruefen_texte2.py` (mechanische Prüfung, bekannte Fehlalarme: Brüche, °F, mil, pt), `korrektur_bis.py`, `test_texte.cjs` (Playwright über `page.route()`, Modi `schnell`, `szenarien`, `voll`: 453 + 103 + 6 284 Prüfungen grün), `unsicher.json` (70 belegte Umrechnungen).
- Die Skripte tragen noch die Scratch-Pfade der Sitzung (`…/scratchpad/ds/work/bau/`); vor dem Wiederverwenden die Konstante `D` anpassen.

## Was sich ändert
Beschreibung, Positions-, Options- und Techniknamen, Regionen («USA: auf Lager»), Statusschlüssel («beim Lieferanten derzeit nicht verfügbar» statt Rohschlüssel), Material, Grössen/Basisfarben, Modellzeile ohne oz; Hinweis über der Beschreibung «maschinell übersetzt … in Schweizer Einheiten umgerechnet». Händlersätze, Regionssätze ohne Schweiz, widersprüchliche Stoffgewichte (16 Modelle) und «garantiert» wurden entfernt oder abgeschwächt.

## Bedingungen zum Einspielen
1. **Ein gemeinsamer Schritt mit `katalog-nur-bestellbar-0511`**: beide ändern `assets/luxe-clothing.js`; der Patch passt nur, solange die Live-Datei noch md5 `198328a6…` hat. Reihenfolge: Textdatei, `de.json` und `en.default.json` in EINEM `themeFilesUpsert`, Section, ganz zuletzt das JS; vor jedem Schreiben `checksumMd5` gegen md5Alt prüfen, danach zurücklesen. Rücknahme umgekehrt, bei den Locales nur die fünf neuen Schlüssel entfernen (nicht die `.orig` roh zurückschreiben).
2. Optional (klein): die Kalendertexte 804 («im Jahr 2025») und 1011 («des Jahres 2026») nennen überholte Jahreszahlen.

Offene Grenzen: Der Patch deckt Beschreibung, Positionen, Techniken, Optionen, Regionen, Material und Grössen ab; weitere englische Stellen im Fenster, die der Besitzer nennt, kommen als zweite Etappe. Übersetzung ist maschinell, bei Eigennamen/Farbwörtern teils holprig; Wirkung auf Käufe unbekannt (Hypothese: weniger Abbrüche im Katalog).
