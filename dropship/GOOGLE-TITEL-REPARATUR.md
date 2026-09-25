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

## Letzter Lauf 2026-09-25T00:35:32Z — SCHARF

Gescannt 49888 aktive von 49888 (EXACT); Wächter-Stand 19 h alt; Kanarienvögel und Taxonomie-IDs geprüft. Eimer-Etikette: 0x gewartet, 0 s gesamt.

| Produkt | Regel | Änderung | Status |
|---|---|---|---|
| portable-auto-waschburste-4-teilig-605000 | POLICY | +google-policy-drogen,google-policy-flag | ok |
| retro-ohrringe-im-used-look-mit-kettendetail-626900 | USED-TEXT | Beschreibung | ok |
| 1-zoll-zapfpistole-fur-diesel-und-benzin-257024 | EINZEL | Beschreibung | ok |
| biden-herrenuhr-ultraflach-mit-kalender-611776 | EINZEL | Beschreibung | ok |
| twill-umhangetasche-im-used-look-676544 | USED-TEXT | Beschreibung | ok |

## Beständig gemeldet, kein Titelbefund (beobachten, nicht umschreiben)

- reflektierendes-hundehalsband-mit-cartoon-must-614100: Inappropriate title
- slim-fit-jeans-in-lila-schwarz-606200: Inappropriate title
- stahlarmband-mit-fallschirmschlie-e-618900: Inappropriate title
- stylische-crossbody-bag-aus-rindsleder-639500: Inappropriate title
- vintage-boho-damenkleid-615700: Inappropriate title

## Ledger gesamt

45 Produkte mit rückgelesenen Änderungen; 0 Beschreibungen noch offen (Text-Sperre belegt — der nächste Lauf holt sie nach).

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
- portable-auto-waschburste-4-teilig-605000: tags_dazu google-policy-drogen,google-policy-flag
- portabler-luftreiniger-aschenbecher-437952: typ Raucherzubehör; tags_dazu smoke-zubehoer
- runder-aschenbecher-aus-keramik-2cef8b: typ Raucherzubehör; tags_dazu raucher,smoke-zubehoer
- schockresistenter-schutz-625600: typ Handy-Zubehör
- smarter-aschenbecher-mit-luftreiniger-fur-auto-042304: typ Raucherzubehör; tags_dazu raucher,smoke-zubehoer
- spiral-pipe-atomizer-fur-trockene-krauter-467392: typ Raucherzubehör; tags_dazu raucher,smoke-zubehoer
- strandtuch-kleid-new-style-f6bb03: typ Pool & Strand
- taktisches-outdoor-stativ-faltbar-ausziehbar-519234: tags_dazu google-policy-flag,google-policy-waffen
- zisha-keramik-gongfu-teetasse-tenmoku-glasur-638100: typ Küche & Bar

## Nachmessung (≥ 20 h nach dem Schreiben, Google live)

- zisha-keramik-gongfu-teetasse-tenmoku-glasur-638100: keine Google-Meldung
- used-look-jeans-mit-leicht-ausgestelltem-bein-621700: keine Google-Meldung
- taktisches-outdoor-stativ-faltbar-ausziehbar-519234: keine Google-Meldung
- herren-jeansjacke-im-used-look-609500: keine Google-Meldung
- portabler-luftreiniger-aschenbecher-437952: keine Google-Meldung
- erhohende-board-schuhe-im-used-look-605300: keine Google-Meldung
- strandtuch-kleid-new-style-f6bb03: keine Google-Meldung
- multifunktionaler-aschenbecher-mit-luftreinige-617900: keine Google-Meldung
- menstruationscup-fur-frauen-625600: keine Google-Meldung
- keramik-aschenbecher-mit-spiral-muster-629100: keine Google-Meldung
- aschenbecher-mit-deckel-602700: keine Google-Meldung
- ombre-t-shirt-mit-used-look-602800: keine Google-Meldung
- schockresistenter-schutz-625600: keine Google-Meldung
- herren-hoodie-im-used-look-633500: keine Google-Meldung
- distressed-washed-denim-jeans-615500: keine Google-Meldung
- patchwork-wide-leg-jeans-im-used-look-612400: keine Google-Meldung
- sassy-distressed-hoodie-625300: keine Google-Meldung
- loose-fit-wide-leg-hose-im-used-look-614900: keine Google-Meldung
- rebellious-washed-distressed-short-sleeve-top-633300: keine Google-Meldung
- herren-jeans-im-used-look-636600: keine Google-Meldung
- used-look-patchwork-jeans-fur-herren-625300: keine Google-Meldung
- st-michael-distressed-zip-up-hoodie-616100: keine Google-Meldung
- retro-straight-jeans-mit-used-look-628400: keine Google-Meldung
- slim-fit-used-look-jeans-fur-herren-616600: keine Google-Meldung
- heavyweight-kapuzenjacke-im-used-look-631300: keine Google-Meldung
- used-look-jeans-fur-herren-600800: keine Google-Meldung
- elektronischer-auto-aschenbecher-mit-ladefunkt-629500: keine Google-Meldung
- auberginen-zigarrenanzunder-mit-doppelflamme-947328: keine Google-Meldung
- elektronisches-zigarren-hygrometer-619800: keine Google-Meldung
- kompakter-zigarrenkasten-627900: keine Google-Meldung
- eisige-meeresoberflache-607000: keine Google-Meldung
- laser-silber-rippband-75mm-50-yards-026496: keine Google-Meldung
- herren-langarmhemd-im-used-look-620200: keine Google-Meldung
- spiral-pipe-atomizer-fur-trockene-krauter-467392: keine Google-Meldung
- baustein-luxuslimousine-auf-raedern-334528: keine Google-Meldung
- retro-ohrringe-im-used-look-mit-kettendetail-626900: keine Google-Meldung
- 1-zoll-zapfpistole-fur-diesel-und-benzin-257024: keine Google-Meldung
- biden-herrenuhr-ultraflach-mit-kalender-611776: keine Google-Meldung
- biden-herren-quarzuhr-hohl-leger-052544: keine Google-Meldung
- k68-signal-detektor-46ae1c: keine Google-Meldung
- twill-umhangetasche-im-used-look-676544: keine Google-Meldung
- smarter-aschenbecher-mit-luftreiniger-fur-auto-042304: keine Google-Meldung
- intelligenter-intimreiniger-fur-die-frau-723136: keine Google-Meldung
- runder-aschenbecher-aus-keramik-2cef8b: keine Google-Meldung
