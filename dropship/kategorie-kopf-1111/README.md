# Kompakter Kategoriekopf (live seit 15.11.2026 21:58 UTC)

Besitzer 11.11.2026: Handy-Kopf «Jetzt umsetzen». Ziel: auf dem Handy liegt das erste Produktbild im ersten Bildschirm.
Bau, Prüfrunden und Messwerte: `BERICHT.md`, `PRUEFUNG.md`. Dieser Ordner war bis 15.11. nur im Sitzungs-Scratch und ist jetzt im Repo.

## Was live ist (MAIN-Theme `213991391623`, «LuxeStyle SEO 14.11.2026» (Name mit Strich))
- `templates/collection.json`: drei Snippets `lx-kopf-pfad`, `lx-kopf-kompakt`, `lx-kopf-chips`, der Abschnitt `lux_usp_coll` ist weg. `sections/main-collection.liquid`: die ersten Karten laden sofort (Eager-Block). Werkzeug `umschalten.mjs`, LIVE 21:58:50 UTC, Rücklesen gleich.
- 22:15 UTC: eine Zeile `{%- render 'lx-ankuendigung-stabil' -%}` vor `</head>` in `layout/theme.liquid` (`ank_setzen.mjs`). Grund: die Live-Nachmessung fand am Desktop CLS bis 0,19 (Ankündigungsleiste wird 12 px höher). **GEMESSEN danach:** 6 Aufrufe (`haustier-hunde`, `weihnachten-2026`, je 3, 1440 × 900), CLS 0 bis 0,0035, 0 Liquid-Fehler.
- 22:20 UTC: zwei CSS-Zeilen (`css_nachtrag.mjs`, Marker `lx-1511a`, `lx-1511b`): Pfadzeile am Handy rechts ausgeblendet (vorher brach der Versandtext mitten im Wort ab), Zwischentitel in «Mehr anzeigen» am Handy 1,2 rem statt 36 px (Seitentitel 23 px). **GEMESSEN** am Handy 390 px: Maske aktiv, h2 19,2 px, kein seitliches Scrollen.

## Live-Nachmessung 15.11. (Workflow, 2 Messer und 1 unabhängiger Urteiler)
- Handy 390 × 664 und 360 × 640: Unterkante des ersten Kartenbilds 606 bis 648 px (Soll unter der Fensterhöhe), CLS 0 bis 0,0235, alle Seiten HTTP 200.
- Urteil «mit Änderungen»: 1 wichtig (Desktop-Sprung, behoben), 4 klein (2 behoben). Offen und nicht vom Kopf verursacht: die Anrisszeile trägt bei Sammlungen mit Link im ersten Absatz `aria-hidden` (7 Fälle); einige Tag-Chips passen nicht zur Kategorie («Halsketten» bei Hunde, «Gürtel» bei Uhren), der Kopf übernimmt die alten Chips 1:1.
- Ungemessen: Safari/iPhone, echte Geräte, Wirkung auf Absprünge und Käufe.

## Rücknahme (in umgekehrter Reihenfolge)
1. `ZURUECK=1 LIVE=1 node css_nachtrag.mjs`
2. `ZURUECK=1 LIVE=1 node ank_setzen.mjs`
3. `ZURUECK=1 LIVE=1 node umschalten.mjs` (stellt `collection.json` und `main-collection.liquid` aus `sicherung/` her)

Trockenlauf ist überall Vorgabe. `test_kopf.mjs` und `test_umschalten.mjs` liefen in der Sitzung mit LiquidJS aus dem Scratch (Pfad im Kopf der Datei) und sind nicht in der CI.
