# Weihnachten 🎄 zeigte Kunstblumen, Tortenformen und Halloween-Deko — 12.10.2026

## Gemessen
- Kollektion «Weihnachten 🎄» (`weihnachten-2026`, Tag-Regel `weihnachten`, neueste zuerst; Startseiten-Reihe, Hauptmenü):
  344 aktive mit dem Tag, **62 ohne Weihnachtsbezug im Titel** — auf der Startseite **5 von 8 Karten** (Gestrickter
  Blumenstrauss, Hochzeitskleid-Modell, Mona-Lisa-Sisal …).
- Ursache: Die CJ-Gruppe `cjpartydeko` (`automation/cj_groups_extra.json`) hängt `weihnachten` fest an ALLE sechs Kategorien
  (Kunstblumen, Tortendeko, Partymasken, Einladungskarten …). 77 Neuimporte in 48 h mit dem Tag, 35 ohne Bezug.
- Grenzfälle im Trockenlauf: Lichtervorhang «mit Sternen», «Lichterbaum-Musikbox», «Aromakerze für festliche Dekoration»,
  «Lichterkette mit Stern» → zählen als Weihnachten (Saison-Beleuchtung). Laterne, Windlicht, Kranz ohne Anlasswort: nein.

## Getan
- Regel `data/weihnachten_tag_regel.json`: `weihnachten` bleibt nur mit Weihnachtswort im **Titel** (17 Kanarien, Python und JS gleich).
- `automation/weihnachten_tag_wache.py` (Standard trocken, `SCHARF=1` schreibt, liest zurück, Ledger `_weihnachten_tag.tsv`):
  **56 Partydeko-Artikel** verloren das Tag (Fehler 0). Sie bleiben im Shop und in ihren Sachkollektionen.
  Andere Quellen (Dirndl, Geschenkbox) werden nur gemeldet.
- Importer `cj_category_fill.mjs`: entfernt `weihnachten` vor dem Anlegen, wenn der Titel kein Weihnachtswort trägt
  (dieselbe Regeldatei — sonst würde die Wache es am nächsten Tag wieder abnehmen).
- Aufseher `fixer_keepalive.sh`: täglich, Kanarien zuerst.

## Nachgemessen
- Wache danach: 286 verdient · 0 unverdient Partydeko · 2 andere nur gemeldet.
- `weihnachten-2026` oben 12/12 mit Weihnachtswort (Kranz, Baum-Anhänger, Girlande, Christbaumaufsatz, Adventskalender …).

## Rückweg
- `dropship/_weihnachten_tag.tsv` (Handle, Datum, Titel) → Tag wieder setzen.
