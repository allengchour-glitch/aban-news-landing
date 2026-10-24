# Übergabe Firecrawl / Widmann-Preise (24.10.2026, abends)

Besitzer-Stopp: alles angehalten, andere Sitzung macht weiter. Kein Shop-Schreibzugriff offen.

## Stand
- Widmann gegen Galaxus gemessen (751 Barcodes, 737 Credits): 60 % der vergleichbaren teurer, Median 1.29.
  Bericht `dropship/FORTURA-GALAXUS-VERGLEICH-2410.md`, Daten `fortura_galaxus_vergleich.csv`.
- Auf Wunsch "nur 12 Artikel ohne Verlust anpassen": 9 gesenkt (`FORTURA-PREISANPASSUNG-2410.csv`, Spalte `alt` = Rücksetzquelle),
  3 Waggis-Hosen ausgelassen (Galaxus-Treffer hatten fremde Titel). Galaxus liegt bei allen 12 UNTER unserem Einkauf.
- Besitzer, zuletzt: "nix verbilligen" -> KEINE weiteren Preissenkungen. Ob die 9 zurückgesetzt werden, ist nicht entschieden
  (angeboten, keine Antwort).
- B2B-Weg: `widmannsrl.com/de/partner`, Maskworld-B2B, HL Grosshandel, Scherzwelt. Preise nur nach Händlerfreischaltung,
  die der Besitzer selbst beantragen muss.
- Besitzer sagte "habe noch 3900 token" (Firecrawl-Credits) und auf "wofür sonst?" nur "alles".

## Zuletzt gestartet und abgebrochen
- Bruder-Lauf (289 Spielwaren-Barcodes, Kandidatenliste lag nur in /tmp) nach ca. 9 Artikeln gestoppt.
  Neu erzeugen: `MARKE="Bruder Spielwaren" AUS=<csv> node automation/fortura_preis_kandidaten.mjs`, dann
  `EIN=<csv> AUS=dropship/fortura_galaxus_bruder.csv MAX_CREDITS=300 node automation/fortura_galaxus_lauf.mjs`.
  Ledger erkennt schon bezahlte Barcodes. Nur lesend. Dauer ca. 35 Min (9 Anfragen/Min).
- Marke-Name ist "Bruder Spielwaren" (nicht "Bruder"), sonst 0 Treffer.

## Fallen
- Schlüssel liegt als Umgebungsvariable `FIRECRAWL_API_KEY`; nie in Repo/Memory schreiben.
- Hobby-Plan 10 Anfragen/Min, abgelehnte zählen mit. Ein Barcode-Treffer kann ein falsches Produkt sein: Titel gegenlesen.
- Preisentscheid liegt allein beim Besitzer.
