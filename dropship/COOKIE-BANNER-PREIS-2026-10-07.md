# Cookie-Banner verdeckte den Preis auf den TikTok-Landeseiten — 07.10.2026 20:45 UTC

## GEMESSEN (ShopifyQL, 14 Tage)
| Landeseite (TikTok, fast nur Handy) | Sitzungen | Warenkorb | Kasse | Kauf | Absprung | Ø Dauer |
|---|---|---|---|---|---|---|
| Abendkleid «Sirène» | 227 | 4 | 2 | 0 | 93 % | 15 s |
| Leinen-Set «Provence» | 178 | 4 | 4 | 0 | 96 % | 7 s |
| Abendkleid «Aurora» | 158 | **0** | 0 | 0 | 94 % | 19 s |
Social insgesamt 728 Sitzungen → 4 Warenkörbe → 0 Käufe. Alle 74 Varianten kaufbar (kein Lagerproblem).
Bild 390×844 (`tools/browser.mjs`): Der eigene Banner `#lx-cookie-banner` (theme.liquid) erschien nach 0,8 s und lag **genau
über Titel und Preis**. Ein TikTok-Besucher sah das Kleid und den Banner, aber nicht, was es kostet.

## GETAN (live Theme 187533001089, Backup `dropship/_theme_backup_theme.liquid_2026-10-07_vor-cookie.liquid`)
- Auf Produktseiten erscheint der Banner erst **nach dem ersten Scrollen** (Rückfall 20 s). Alle anderen Seiten wie bisher
  (0,8 s).
- Auf dem Handy (< 750 px) ist er kompakt: kleinere Schrift und Abstände, Text oben, Knöpfe nebeneinander darunter.
- Nachher-Bild 390×844: Titel und «CHF 69.90» frei im ersten Bildschirm.

## NACHMESSEN
14.10.: dieselbe Abfrage (landing_page_path, sessions_with_cart_additions) für die drei Seiten. Vorher 8 Warenkörbe auf
563 Sitzungen (1,4 %). Der Banner ist nur eine Ursache — die Lieferzeit 10–20 Werktage steht direkt unter dem Knopf.

## REGEL
Auf Seiten, auf denen bezahlter oder sozialer Verkehr landet, darf in den ersten Sekunden nichts über **Preis und
Kaufknopf** liegen (Cookie, Popup, Chat). Das Bild zuerst im Handy-Format prüfen, 390×844.
