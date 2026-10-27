# Startseite 27.10.2026 (Entwurf-Theme `212645413255`, vom Besitzer zu veröffentlichen)

Hero mit laufender Produktwand (Video), Willkommen-Block, USP-Leiste mit Linien-Icons, «Selbst gestalten: Foto & Print» statt des Trend-Blocks,
neutrales `scheme-2` (kein Beige hinter Elektronik/Uhren), Navigation in eigener Zeile unten, neues Mega-Menü (Spalten mit Überschriften).

- `neu_bauen.py`: liest die Dateien des Entwurfs (`THEME_ARBEIT/entwurf`, Stand des Live-Themes vor der Änderung, geholt mit `theme_lesen`) und schreibt
  `THEME_ARBEIT/neu` (`templates/index.json`, `config/settings_data.json`, `sections/hero.liquid`). Videonamen und Beispielbilder stehen im Skript.
- `hero_video_bauen.py`: Produktwand aus Katalogbildern (PIL → ffmpeg), nahtlose Schleife. Aufruf `OUT_W=1800 OUT_H=720 python3 hero_video_bauen.py desktop 20 24`
  und `OUT_W=720 OUT_H=1000 … mobil 20 24` (die Grösse begrenzt die Shopify-Umkodierung auf 720p: 1080p-Quelle ergab 2,5 Mbit/s = 9 MB bei 30 s).
- `datei_hoch.mjs`: Datei in die Shopify-Dateien (stagedUploadsCreate → fileCreate → wartet auf READY). `theme_schreiben.mjs`: schreibt NUR in einen Entwurf
  (bricht bei Rolle MAIN ab). `mega-menu-list.liquid`: Ersatz der Horizon-Vorlage.
- Gelernte Fallen: Rich-Text-Felder in `index.json` erlauben kein `style` an `<span>`; `.overflow-menu` ist der Vorfahr ALLER Menüpunkte (nicht nur des «Mehr»-Überlaufs);
  `container-type:inline-size` im Menü ist unkritisch; Produktkacheln im Menü wurden getestet und verworfen (die ersten zwei Produkte sind selten die schönsten, Platz).
- Prüfung: 3 unabhängige Prüfer (Optik, Texte, Code) + je Fund ein Gegenprüfer; behoben: Menü-Spalten, Hero-Einzug, Handy-Fakten, Tablet-Hochformat, Videogewicht,
  Wortlaut «Lieferantenlager», Zahl «Über 1'500» (gemessen: 1'653 von 2'371 Artikeln mit Schweizer-Lager-Tag lieferbar).
