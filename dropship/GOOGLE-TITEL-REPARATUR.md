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

## Letzter Lauf 2026-09-23T22:26:18Z — SCHARF

Gescannt 50003 aktive von 50003 (EXACT); Wächter-Stand 12 h alt; Kanarienvögel und Taxonomie-IDs geprüft. Eimer-Etikette: 0x gewartet, 0 s gesamt.

| Produkt | Regel | Änderung | Status |
|---|---|---|---|
| used-look-jeans-mit-leicht-ausgestelltem-bein-621700 | USED-TEXT | Beschreibung; 5 Bild-Alt-Texte | ok; text-sperre-belegt |
| herren-jeansjacke-im-used-look-609500 | USED-TEXT | Beschreibung; 7 Bild-Alt-Texte | ok; text-sperre-belegt |
| erhohende-board-schuhe-im-used-look-605300 | USED-TEXT | Beschreibung; 6 Bild-Alt-Texte | ok; text-sperre-belegt |
| strandtuch-kleid-new-style-f6bb03 | EINZEL | 10 Bild-Alt-Texte | ok |
| ombre-t-shirt-mit-used-look-602800 | USED-TEXT | Beschreibung; 2 Bild-Alt-Texte | ok; text-sperre-belegt |
| schockresistenter-schutz-625600 | EINZEL | 5 Bild-Alt-Texte | ok |
| herren-hoodie-im-used-look-633500 | USED-TEXT | Beschreibung; 8 Bild-Alt-Texte | ok; text-sperre-belegt |
| patchwork-wide-leg-jeans-im-used-look-612400 | USED-TEXT | Beschreibung; 5 Bild-Alt-Texte | ok; text-sperre-belegt |
| loose-fit-wide-leg-hose-im-used-look-614900 | USED-TEXT | 5 Bild-Alt-Texte | ok |
| rebellious-washed-distressed-short-sleeve-top-633300 | USED-TEXT | Beschreibung | text-sperre-belegt |
| herren-jeans-im-used-look-636600 | USED-TEXT | Beschreibung; 6 Bild-Alt-Texte | ok; text-sperre-belegt |
| used-look-patchwork-jeans-fur-herren-625300 | USED-TEXT | Beschreibung; 5 Bild-Alt-Texte | ok; text-sperre-belegt |
| st-michael-distressed-zip-up-hoodie-616100 | USED-TEXT | Beschreibung | text-sperre-belegt |
| retro-straight-jeans-mit-used-look-628400 | USED-TEXT | Beschreibung; 7 Bild-Alt-Texte | ok; text-sperre-belegt |
| slim-fit-used-look-jeans-fur-herren-616600 | USED-TEXT | Beschreibung; 6 Bild-Alt-Texte | ok; text-sperre-belegt |
| heavyweight-kapuzenjacke-im-used-look-631300 | USED-TEXT | Beschreibung; 4 Bild-Alt-Texte | ok; text-sperre-belegt |
| used-look-jeans-fur-herren-600800 | USED-TEXT | Beschreibung; 5 Bild-Alt-Texte | ok; text-sperre-belegt |
| laser-silber-rippband-75mm-50-yards-026496 | EINZEL | Beschreibung | text-sperre-belegt |
| herren-langarmhemd-im-used-look-620200 | USED-TEXT | Beschreibung; 23 Bild-Alt-Texte | ok; text-sperre-belegt |
| baustein-luxuslimousine-auf-raedern-334528 | EINZEL | SEO; 5 Bild-Alt-Texte; ⚠️ POLICY ['Vehicles']: Titel am 23.09. repariert — wartet auf Google-Neuprüfung | ok |
| retro-ohrringe-im-used-look-mit-kettendetail-626900 | USED-TEXT | Beschreibung; 5 Bild-Alt-Texte | ok; text-sperre-belegt |
| 1-zoll-zapfpistole-fur-diesel-und-benzin-257024 | EINZEL | Beschreibung; 4 Bild-Alt-Texte | ok; text-sperre-belegt |
| biden-herrenuhr-ultraflach-mit-kalender-611776 | EINZEL | Beschreibung; 5 Bild-Alt-Texte | ok; text-sperre-belegt |
| biden-herren-quarzuhr-hohl-leger-052544 | EINZEL | 5 Bild-Alt-Texte | ok |
| twill-umhangetasche-im-used-look-676544 | USED-TEXT | Beschreibung; 5 Bild-Alt-Texte | ok; text-sperre-belegt |

## Beständig gemeldet, kein Titelbefund (beobachten, nicht umschreiben)

- eleganter-wollmantel-fur-damen-601200: Title under review

## Ledger gesamt

44 Produkte mit rückgelesenen Änderungen; 20 Beschreibungen noch offen (Text-Sperre belegt — der nächste Lauf holt sie nach).

Geschriebene Titel (rückgelesen):

- 2026-09-23 EINZEL: «BIDEN Herrenuhr ultraflach mit Kalender» → «Ultraflache Herrenuhr mit Kalender»
- 2026-09-23 USED: «Used-Look Jeans mit leicht ausgestelltem Bein» → «Vintage-Look Jeans mit leicht ausgestelltem Bein»
- 2026-09-23 USED: «Herren Jeansjacke im Used-Look» → «Herren Jeansjacke im Vintage-Look»
- 2026-09-23 USED: «Erhöhende Board-Schuhe im Used-Look» → «Erhöhende Board-Schuhe im Vintage-Look»
- 2026-09-23 EINZEL: «Strandtuch-Kleid «New Style»» → «Strandtuch-Kleid – Badetuch zum Anziehen»
- 2026-09-23 USED: «Ombre T-Shirt mit Used-Look» → «Ombre T-Shirt mit Vintage-Look»
- 2026-09-23 EINZEL: «Schockresistenter Schutz» → «Stossfeste iPhone-Hülle aus Silikon, transparent»
- 2026-09-23 USED: «Herren Hoodie im Used-Look» → «Herren Hoodie im Vintage-Look»
- 2026-09-23 USED: «Used-Look-Jeans, gewaschen» → «Vintage-Look-Jeans, gewaschen»
- 2026-09-23 USED: «Patchwork Wide-leg Jeans im Used-Look» → «Patchwork Wide-leg Jeans im Vintage-Look»
- 2026-09-23 USED: «Hoodie im Used-Look» → «Hoodie im Vintage-Look»
- 2026-09-23 USED: «Loose-Fit Wide-Leg Hose im Used-Look» → «Loose-Fit Wide-Leg Hose im Vintage-Look»
- 2026-09-23 USED: «Kurzarm-Top im Used-Look, gewaschen» → «Kurzarm-Top im Vintage-Look, gewaschen»
- 2026-09-23 USED: «Herren Jeans im Used-Look» → «Herren Jeans im Vintage-Look»
- 2026-09-23 USED: «Used-Look Patchwork Jeans für Herren» → «Vintage-Look Patchwork Jeans für Herren»
- 2026-09-23 USED: «Zip-Hoodie im Used-Look mit St.-Michael-Print» → «Zip-Hoodie im Vintage-Look mit St.-Michael-Print»
- 2026-09-23 USED: «Retro Straight Jeans mit Used-Look» → «Retro Straight Jeans mit Vintage-Look»
- 2026-09-23 USED: «Slim Fit Used-Look Jeans für Herren» → «Slim Fit Vintage-Look Jeans für Herren»
- 2026-09-23 USED: «Heavyweight Kapuzenjacke im Used-Look» → «Heavyweight Kapuzenjacke im Vintage-Look»
- 2026-09-23 USED: «Used-Look Jeans für Herren» → «Vintage-Look Jeans für Herren»
- 2026-09-23 EINZEL: «Eisige Meeresoberfläche» → «Press-on-Nägel «Eisige Meeresoberfläche», 10 Stück»
- 2026-09-23 EINZEL: «Laser-Silber-Rippband, 75mm, 50 Yards» → «Ripsband in Silber mit Glanzeffekt, 75 mm, 50 Yards»
- 2026-09-23 USED: «Herren Langarmhemd im Used-Look» → «Herren Langarmhemd im Vintage-Look»
- 2026-09-23 EINZEL: «Luxus-Limousine · Baustein-Auto auf Rädern» → «Baustein-Set Luxus-Limousine – Spielzeugauto zum Bauen»
- 2026-09-23 USED: «Retro-Ohrringe im Used-Look mit Kettendetail» → «Retro-Ohrringe im Vintage-Look mit Kettendetail»
- 2026-09-23 EINZEL: «1-Zoll-Zapfpistole für Diesel und Benzin» → «1-Zoll-Zapfventil für Diesel und Benzin»
- 2026-09-23 EINZEL: «Biden Herren-Quarzuhr, hohl, leger» → «Legere Herren-Quarzuhr mit Kalender»
- 2026-09-23 USED: «Twill Umhängetasche im Used-Look» → «Twill Umhängetasche im Vintage-Look»
- 2026-09-23 EINZEL: «Ripsband in Silber mit Glanzeffekt, 75 mm, 50 Yards» → «Ripsband in Gold mit Hologramm-Glanz, 75 mm, 50 Yards»

Typ-/Tag-Korrekturen (rückgelesen):

- aschenbecher-mit-deckel-602700: typ Raucherzubehör; tags_dazu smoke-zubehoer
- auberginen-zigarrenanzunder-mit-doppelflamme-947328: typ Raucherzubehör; tags_dazu smoke-zubehoer
- baustein-luxuslimousine-auf-raedern-334528: typ Spielzeug
- biden-herren-quarzuhr-hohl-leger-052544: typ Uhren; tags_dazu uhren
- elektronischer-auto-aschenbecher-mit-ladefunkt-629500: typ Raucherzubehör; tags_dazu smoke-zubehoer
- elektronisches-zigarren-hygrometer-619800: typ Raucherzubehör; tags_dazu smoke-zubehoer
- intelligenter-intimreiniger-fur-die-frau-723136: typ Wellness & Gesundheit; tags_dazu google-policy-flag,google-policy-titel,intimpflege
- k68-signal-detektor-46ae1c: tags_dazu google-policy-flag,google-policy-hacking
- keramik-aschenbecher-mit-spiral-muster-629100: typ Raucherzubehör; tags_dazu smoke-zubehoer
- kompakter-zigarrenkasten-627900: typ Raucherzubehör; tags_dazu smoke-zubehoer
- menstruationscup-fur-frauen-625600: typ Wellness & Gesundheit; tags_dazu google-policy-flag,google-policy-titel,intimpflege
- multifunktionaler-aschenbecher-mit-luftreinige-617900: typ Raucherzubehör; tags_dazu smoke-zubehoer
- portabler-luftreiniger-aschenbecher-437952: typ Raucherzubehör; tags_dazu smoke-zubehoer
- runder-aschenbecher-aus-keramik-2cef8b: typ Raucherzubehör; tags_dazu raucher,smoke-zubehoer
- schockresistenter-schutz-625600: typ Handy-Zubehör
- smarter-aschenbecher-mit-luftreiniger-fur-auto-042304: typ Raucherzubehör; tags_dazu raucher,smoke-zubehoer
- spiral-pipe-atomizer-fur-trockene-krauter-467392: typ Raucherzubehör; tags_dazu raucher,smoke-zubehoer
- strandtuch-kleid-new-style-f6bb03: typ Pool & Strand
- taktisches-outdoor-stativ-faltbar-ausziehbar-519234: tags_dazu google-policy-flag,google-policy-waffen
- zisha-keramik-gongfu-teetasse-tenmoku-glasur-638100: typ Küche & Bar

Noch offene Beschreibungen:

- used-look-jeans-mit-leicht-ausgestelltem-bein-621700: USED
- herren-jeansjacke-im-used-look-609500: USED
- erhohende-board-schuhe-im-used-look-605300: USED
- ombre-t-shirt-mit-used-look-602800: USED
- herren-hoodie-im-used-look-633500: USED
- patchwork-wide-leg-jeans-im-used-look-612400: USED
- rebellious-washed-distressed-short-sleeve-top-633300: USED
- herren-jeans-im-used-look-636600: USED
- used-look-patchwork-jeans-fur-herren-625300: USED
- st-michael-distressed-zip-up-hoodie-616100: USED
- retro-straight-jeans-mit-used-look-628400: USED
- slim-fit-used-look-jeans-fur-herren-616600: USED
- heavyweight-kapuzenjacke-im-used-look-631300: USED
- used-look-jeans-fur-herren-600800: USED
- laser-silber-rippband-75mm-50-yards-026496: EINZEL
- herren-langarmhemd-im-used-look-620200: USED
- retro-ohrringe-im-used-look-mit-kettendetail-626900: USED
- 1-zoll-zapfpistole-fur-diesel-und-benzin-257024: EINZEL
- biden-herrenuhr-ultraflach-mit-kalender-611776: EINZEL
- twill-umhangetasche-im-used-look-676544: USED
