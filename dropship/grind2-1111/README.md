# Grind 2.0 am 11.11.2026: Lückenliste neu, Suchwort-Pflicht, Decals

Auftrag des Besitzers 11.11.: «kannst du cj weiter grinden?»

## Was fehlte

Die Lückenanalyse vom 27.10. (`/tmp/grind2/luecken.json`) lag nur im temporären Ordner und ging beim Neustart verloren;
`dropship/grind2_bedarf.json` (der Ersatzpfad von `grind2.mjs`) gab es nie. Ohne sie läuft der Grind nicht.

## Neu

- `automation/grind2_bedarf_bauen.mjs`: baut die Liste aus den Zielen in `automation/lib/grind_google_daten.json`
  (`regeln[].ziel` = «<id> (<rang>)», 54 Ziele) und einem frischen Katalog (`node automation/katalog_bulk.mjs /tmp/katalog_voll.json`).
  Bestand je Ziel GEMESSEN als Titel-Treffer der `titel_muss`-Regeln (ohne `titel_nicht`); Lücke = 30 (Saison) bzw. 45 minus Bestand.
  Saison jetzt (S): Lichterketten, Fensterdeko, Geschenkband, Skibrillen, Schneeschuhe, Bettdecken, Babyschlafsack, Babyoveralls,
  Kinderuhren, Joysticks, Actioncams, Trockenblumen, Kronleuchter, Taschenlampen (SETZUNG). Sommerware zurückgestellt (R).
  Suchwörter englisch, von Hand. **Grenze:** der Bestand ist eine Titel-Zählung (Hypothese: eher zu tief), keine Nachfrage-Messung.
- `dropship/grind2_bedarf.json`: Stand 11.11.2026 19:09 UTC (56 498 aktive Produkte, 51 von 54 Zielen mit Lücke).
- **Suchwort-Pflicht** (`suchwortPasst`, Grund `suchwort-fehlt`, Schalter `SUCHWORT_PFLICHT=0`): ein Treffer einer CJ-Suche muss
  jedes Wort des Suchbegriffs im englischen Namen tragen (ganzes Wort, Mehrzahl -s/-es, Füllwörter frei). Belegte CJ-Kategorien
  werden nicht geprüft. GEMESSEN 11.11.: ohne die Pflicht lieferten «window sticker» und «string lights» Eiskratzer, Auto-Sonnenschutz,
  Tischlampen und ein Bikini (0 von 10 Kandidaten passend); mit ihr sind 20 von 20 Kandidaten thematisch richtig.
- **Decals**: der Zubehör-Wächter wertete «Fenstersticker» unter «Home Decor Decals» als Zubehör-Konflikt; bei Wandtattoos und
  Fensterstickern ist der Sticker die Ware selbst (`ZUBEHOER_PFAD_RE` + «Decals»).

## Prüfung

`node automation/grind2_test.mjs`: 692 ok, 0 Fehler (vorher 671). Mutationsprobe Suchwort 13 von 13 erkannt, Decals 1 von 1.

## Trockenläufe 11.11. (nur CJ gelesen, nichts geschrieben)

| Lauf | Ziele | Kandidaten | durch alle Tore | Hauptgründe |
|---|---|---|---|---|
| a (ohne Pflicht) | 8 Saison | 10 | 0 | Google-Kategorie unsicher (Fremdware aus der unscharfen Suche) |
| b (mit Pflicht) | 8 Saison | 20 | 0 | keine Shop-Kategorie (Skibrillen, Schneeschuhe, Trockenblumen), Optionswerte nicht sicher übersetzt, über 40 Varianten, Zubehör-Fehlalarm (behoben), dünnes Datenblatt, Fremdstecker |

**Offen:** für Skibrillen, Schneeschuhe und Trockenblumen fehlt eine Shop-Kategorie (`sort-`-Tag mit Collection); erst danach können
dort Produkte kommen (Skill kategorien-nach-google).
