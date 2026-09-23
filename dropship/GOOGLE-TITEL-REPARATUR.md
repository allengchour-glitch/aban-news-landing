# Google-Titelreparatur (Befund 26) — `automation/google_titel_reparatur.py`

**Messung 23.09.2026, die den Umfang festlegt** (Vollscan 50'016 aktive, Wächter-Stand 09:52 UTC gegen Live 18:20 UTC):

| Google-Klasse | morgens | abends live | davon morgens schon da | Entscheid |
|---|---:|---:|---:|---|
| Title under review | 836 | 637 | 15 von 300 gespeicherten | **kein Titelfehler** — Prüfzustand, 95 % Umschlag in 9 h, 55 % Kleidung, kein Titelmuster → nichts umschreiben |
| Inappropriate title | 9 | 10 | 4 | nur beständige UND sachlich falsche Titel (Politiker-Marke, Hygiene im Sammeltyp) |
| Illegal drugs | 1 | 2 | 1 | Kräuterpfeife → RAUCH-Regel; Auto-Waschbürste = Bildfall, nicht Titel |
| Guns and Parts | 3 | 3 | 3 | Band/Zapfventil umbenannt (Fehlalarm am Wort), taktisches Stativ → POLICY |
| Hacking | 1 | 1 | 1 | Wanzen-Detektor → POLICY |
| Vehicles | 1 | 1 | 1 | Bauset → Titel mit Produktnomen, Typ Spielzeug |
| Additional text found | 2 | 2 | 2 | «New Style» aus dem Titel; Fleece-Schuh ohne erkennbaren Titelgrund → beobachten |
| Invalid product condition for Discover | 1 | 1 | 0 | «Used-Look» liest Google als Zustand → 20 Titel «Vintage-Look» |

Gegenproben: «Sexy» im Titel (45) trägt 0 «Inappropriate title»; RAUCH-Regex über 50'016 Titel = 45 Treffer, alle
echtes Rauchzubehör; Such-Kanarienvogel `title:*zzzkanari*` = 0.

## Letzter Lauf 2026-09-23T18:57:53Z — DRY

Gescannt 50010 aktive von 50010 (EXACT); Wächter-Stand 9 h alt; Kanarienvögel und Taxonomie-IDs geprüft. Eimer-Etikette: 0x gewartet, 0 s gesamt.

| Produkt | Regel | Änderung | Status |
|---|---|---|---|
| used-look-jeans-mit-leicht-ausgestelltem-bein-621700 | USED-TEXT | Beschreibung | DRY |
| erhohende-board-schuhe-im-used-look-605300 | USED-TEXT | Beschreibung | DRY |
| ombre-t-shirt-mit-used-look-602800 | USED-TEXT | Beschreibung | DRY |
| herren-hoodie-im-used-look-633500 | USED-TEXT | Beschreibung | DRY |
| patchwork-wide-leg-jeans-im-used-look-612400 | USED-TEXT | Beschreibung | DRY |
| rebellious-washed-distressed-short-sleeve-top-633300 | USED-TEXT | Beschreibung | DRY |
| herren-jeans-im-used-look-636600 | USED-TEXT | Beschreibung | DRY |
| used-look-patchwork-jeans-fur-herren-625300 | USED-TEXT | Beschreibung | DRY |
| retro-straight-jeans-mit-used-look-628400 | USED-TEXT | Beschreibung | DRY |
| slim-fit-used-look-jeans-fur-herren-616600 | USED-TEXT | Beschreibung | DRY |
| heavyweight-kapuzenjacke-im-used-look-631300 | USED-TEXT | Beschreibung | DRY |
| used-look-jeans-fur-herren-600800 | USED-TEXT | Beschreibung | DRY |
| herren-langarmhemd-im-used-look-620200 | USED-TEXT | Beschreibung | DRY |
| retro-ohrringe-im-used-look-mit-kettendetail-626900 | USED-TEXT | Beschreibung | DRY |
| biden-herrenuhr-ultraflach-mit-kalender-611776 | EINZEL | Beschreibung | DRY |
| twill-umhangetasche-im-used-look-676544 | USED-TEXT | Beschreibung | DRY |

## Beständig gemeldet, kein Titelbefund (beobachten, nicht umschreiben)

- eleganter-wollmantel-fur-damen-601200: Title under review

## Ledger gesamt

44 Produkte mit rückgelesenen Änderungen; 16 Beschreibungen noch offen (Text-Sperre belegt — der nächste Lauf holt sie nach).
- used-look-jeans-mit-leicht-ausgestelltem-bein-621700: USED
- erhohende-board-schuhe-im-used-look-605300: USED
- ombre-t-shirt-mit-used-look-602800: USED
- herren-hoodie-im-used-look-633500: USED
- patchwork-wide-leg-jeans-im-used-look-612400: USED
- rebellious-washed-distressed-short-sleeve-top-633300: USED
- herren-jeans-im-used-look-636600: USED
- used-look-patchwork-jeans-fur-herren-625300: USED
- retro-straight-jeans-mit-used-look-628400: USED
- slim-fit-used-look-jeans-fur-herren-616600: USED
- heavyweight-kapuzenjacke-im-used-look-631300: USED
- used-look-jeans-fur-herren-600800: USED
- herren-langarmhemd-im-used-look-620200: USED
- retro-ohrringe-im-used-look-mit-kettendetail-626900: USED
- biden-herrenuhr-ultraflach-mit-kalender-611776: EINZEL
- twill-umhangetasche-im-used-look-676544: USED
