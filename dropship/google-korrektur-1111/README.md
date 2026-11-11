# Google-Korrekturen 11.11.2026: 7 bewährte Produkte bereinigt, 6 zurück im Google-Kanal

Ausgangslage: zehn «Stufe-0»-Produkte (gekauft oder gut bewertet) waren nicht im Kanal «Google & YouTube».
Drei kamen am 11.11. nachmittags und abends direkt zurück (Rizinusöl-Wickel, Lesebrille TR90, Tennisarmband; PR #3111/#3113).
Die übrigen sieben trugen Bildmängel, die Google ablehnt (Farbetiketten, Werbetext, Collagen, chinesische Schrift)
oder falsche Angaben (Gürtel «Material: Denim», Uhr «Gold» bei 6 Farben, Titel «Chronograph»).

## LIVE 11.11. 22:26 bis 22:33 UTC

| Produkt | neue Bilder | gelöst | Varianten gebunden | Text/Optionen/Metafelder | Google |
|---|---|---|---|---|---|
| taillierte-weste-fur-anzuge-635100 | 0 | 2 | 0 | 4 Textstellen | aufgenommen |
| echtleder-gurtel-mit-dornschliesse-605400 | 4 | 10 | 16 | 3 Textstellen | aufgenommen |
| kariertes-freizeit-set-fur-die-ganze-familie-738944 | 3 | 6 | 20 | Titel, SEO, 4 Textstellen, 21 Optionswerte (Y→J, Romper→Strampler), gender unisex, Google-Kategorie | aufgenommen |
| yoga-tanktop-mit-uberkreuztem-rucken-609800 | 8 | 15 | 21 | 7 Textstellen, Campinggrün→Türkis | aufgenommen |
| smartwatch-mit-bluetooth-headset-sportarmband-617400 | 4 | 9 | 4 | 3 Textstellen, 4 Optionswerte | aufgenommen |
| antihaft-silikon-kuchenhelfer-set-602100 | 10 | 13 | 36 | 4 Textstellen | aufgenommen |
| wasserdichte-armbanduhr-gold-chronograph-604800 | 7 | 9 | 6 | Titel «Digitale Armbanduhr wasserdicht 5 bar mit Stoppuhr und Beleuchtung», SEO, 5 Textstellen, Metafeld color gelöscht | **bleibt draussen** (Marken-Entscheid) |

Jedes Produkt: Trockenlauf als eigener Aufruf, dann `LIVE=1 NUR=<handle>`, danach «NACHGELESEN OK» (Galerie, Hauptbild,
Variantenbilder, Titel, Beschreibung, SEO, Optionen, Metafelder). Gelöste Medien bleiben als Dateien in Shopify (nicht gelöscht).
Kontaktbögen aller sieben vor dem Lauf gesichtet. Werkzeug: `anwenden.mjs` (Anleitung `WERKZEUG.md`), Test 388 Prüfungen,
Mutationsprobe 61 von 61, Gegenprüfer fand 8 Fehler (alle behoben, je mit Test).

Google-Kanal: `PHASE=aufnehmen BUDGET=78000 ONLY=<6 Handles>` (Trockenlauf, dann LIVE 6 von 6, 0 Fehler), danach
`PHASE=pruefen`: 77 769 Varianten auf Google (Quote 150 000), 0 Defekt, 0 ausserhalb des Schaufensters.

## Rücknahme

`ZURUECK=1 NUR=<handle> node dropship/google-korrektur-1111/anwenden.mjs` (Trockenlauf), dann mit `LIVE=1`.
`SICHERUNG=dropship/google-korrektur-1111/sicherung.json`, `PLAENE=dropship/google-korrektur-1111/alle_plaene_v2.json`
(Uhr: `alle_plaene_v2_diag_uhr.json`). Die Rücknahme bricht ab (Exit 6), wenn jemand das Produkt inzwischen geändert hat;
`ZURUECK_FREMD=1` übersteuert. Aus dem Google-Kanal: `PHASE=abwaehlen ONLY=<handle>` in `automation/gmc_schaufenster.mjs`.

## Offen (Besitzer)

- **Uhr:** Vendor und JSON-LD nennen «LuxeStyle», alle Bilder zeigen die Marke SKMEI (Aufdruck auf der Ware). Entweder
  vendor «SKMEI» + `custom_product` false (MPN 2710) und dann Google, oder das Produkt bleibt ausserhalb von Google.
- Kariertes Set: Altersgruppe je Variante und Aufteilen der Option nicht gemacht (nicht Teil des Werkzeugs).
- Gürtel: neue Bilder 700 × 700 aus Quellen mit 617 bis 655 px (weiss aufgefüllt, nicht hochskaliert).
- Wirkung bei Google ungemessen (Prüfung dauert Stunden bis Tage).

## Lehre

**Der lokale Arbeitsbaum steht auf einem alten Zweig.** `gmc_schaufenster.mjs` liest das Manifest aus der Datei im Arbeitsbaum.
Darum fehlten dort die «auf»-Einträge vom Nachmittag, und `PHASE=pruefen` meldete Rizinusöl-Wickel, Tennisarmband und
Lesebrille fälschlich als «Defekt». Vor jedem Lauf das Manifest von `origin/main` holen
(`git show origin/main:dropship/gmc_schaufenster_manifest.jsonl > dropship/gmc_schaufenster_manifest.jsonl`) und neue Zeilen
an diese Fassung anhängen.
