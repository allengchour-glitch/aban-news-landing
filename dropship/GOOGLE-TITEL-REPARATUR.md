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

## Letzter Lauf 2026-09-23T18:40:39Z — DRY

Gescannt 50010 aktive von 50016 (EXACT); Wächter-Stand 9 h alt; Kanarienvögel und Taxonomie-IDs geprüft. Eimer-Etikette: 39x gewartet, 274 s gesamt.

| Produkt | Regel | Änderung | Status |
|---|---|---|---|
| zisha-keramik-gongfu-teetasse-tenmoku-glasur-638100 | EINZEL | Typ Aufbewahrung & Organizer → Küche & Bar; Kategorie → hg-11-10-5-2; −aufbewahrung,organizer | DRY |
| used-look-jeans-mit-leicht-ausgestelltem-bein-621700 | USED | Titel «Used-Look Jeans mit leicht ausgestelltem Bein» → «Vintage-Look Jeans mit leicht ausgestelltem Bein»; Beschreibung; SEO | DRY |
| taktisches-outdoor-stativ-faltbar-ausziehbar-519234 | POLICY | +google-policy-flag,google-policy-waffen | DRY |
| herren-jeansjacke-im-used-look-609500 | USED | Titel «Herren Jeansjacke im Used-Look» → «Herren Jeansjacke im Vintage-Look»; SEO | DRY |
| portabler-luftreiniger-aschenbecher-437952 | RAUCH | Typ Trend-Gadget → Raucherzubehör; Kategorie → hg-19-1; +smoke-zubehoer; −becher | DRY |
| erhohende-board-schuhe-im-used-look-605300 | USED | Titel «Erhöhende Board-Schuhe im Used-Look» → «Erhöhende Board-Schuhe im Vintage-Look»; Beschreibung; SEO | DRY |
| strandtuch-kleid-new-style-f6bb03 | EINZEL | Titel «Strandtuch-Kleid «New Style»» → «Strandtuch-Kleid – Badetuch zum Anziehen»; Typ Trend-Gadget → Pool & Strand; Kategorie → hg-15-4-2; SEO | DRY |
| multifunktionaler-aschenbecher-mit-luftreinige-617900 | RAUCH | Typ Gadgets → Raucherzubehör; Kategorie → hg-19-1; +smoke-zubehoer; −becher | DRY |
| menstruationscup-fur-frauen-625600 | HYGIENE+POLICY | Typ Aufbewahrung & Organizer → Wellness & Gesundheit; Kategorie → hb-3-8-5; +google-policy-flag,google-policy-titel,intimpflege; −aufbewahrung,haushalt,organizer,wohnen | DRY |
| keramik-aschenbecher-mit-spiral-muster-629100 | RAUCH | Typ Aufbewahrung & Organizer → Raucherzubehör; Kategorie → hg-19-1; +smoke-zubehoer; −aufbewahrung,becher,organizer | DRY |
| aschenbecher-mit-deckel-602700 | RAUCH | Typ Aufbewahrung & Organizer → Raucherzubehör; Kategorie → hg-19-1; +smoke-zubehoer; −aufbewahrung,becher,organizer | DRY |
| ombre-t-shirt-mit-used-look-602800 | USED | Titel «Ombre T-Shirt mit Used-Look» → «Ombre T-Shirt mit Vintage-Look»; Beschreibung; SEO | DRY |
| schockresistenter-schutz-625600 | EINZEL | Titel «Schockresistenter Schutz» → «Stossfeste iPhone-Hülle aus Silikon, transparent»; Typ Trend-Produkt → Handy-Zubehör; Kategorie → el-4-8-4-2; −damen-taschen; SEO | DRY |
| herren-hoodie-im-used-look-633500 | USED | Titel «Herren Hoodie im Used-Look» → «Herren Hoodie im Vintage-Look»; Beschreibung; SEO | DRY |
| distressed-washed-denim-jeans-615500 | USED | Titel «Used-Look-Jeans, gewaschen» → «Vintage-Look-Jeans, gewaschen» | DRY |
| patchwork-wide-leg-jeans-im-used-look-612400 | USED | Titel «Patchwork Wide-leg Jeans im Used-Look» → «Patchwork Wide-leg Jeans im Vintage-Look»; Beschreibung; SEO | DRY |
| sassy-distressed-hoodie-625300 | USED | Titel «Hoodie im Used-Look» → «Hoodie im Vintage-Look» | DRY |
| loose-fit-wide-leg-hose-im-used-look-614900 | USED | Titel «Loose-Fit Wide-Leg Hose im Used-Look» → «Loose-Fit Wide-Leg Hose im Vintage-Look»; SEO | DRY |
| rebellious-washed-distressed-short-sleeve-top-633300 | USED | Titel «Kurzarm-Top im Used-Look, gewaschen» → «Kurzarm-Top im Vintage-Look, gewaschen»; Beschreibung | DRY |
| herren-jeans-im-used-look-636600 | USED | Titel «Herren Jeans im Used-Look» → «Herren Jeans im Vintage-Look»; Beschreibung; SEO | DRY |
| used-look-patchwork-jeans-fur-herren-625300 | USED | Titel «Used-Look Patchwork Jeans für Herren» → «Vintage-Look Patchwork Jeans für Herren»; Beschreibung; SEO | DRY |
| st-michael-distressed-zip-up-hoodie-616100 | USED | Titel «Zip-Hoodie im Used-Look mit St.-Michael-Print» → «Zip-Hoodie im Vintage-Look mit St.-Michael-Print» | DRY |
| retro-straight-jeans-mit-used-look-628400 | USED | Titel «Retro Straight Jeans mit Used-Look» → «Retro Straight Jeans mit Vintage-Look»; Beschreibung; SEO | DRY |
| slim-fit-used-look-jeans-fur-herren-616600 | USED | Titel «Slim Fit Used-Look Jeans für Herren» → «Slim Fit Vintage-Look Jeans für Herren»; Beschreibung; SEO | DRY |
| heavyweight-kapuzenjacke-im-used-look-631300 | USED | Titel «Heavyweight Kapuzenjacke im Used-Look» → «Heavyweight Kapuzenjacke im Vintage-Look»; Beschreibung; SEO | DRY |
| used-look-jeans-fur-herren-600800 | USED | Titel «Used-Look Jeans für Herren» → «Vintage-Look Jeans für Herren»; Beschreibung; SEO | DRY |
| elektronischer-auto-aschenbecher-mit-ladefunkt-629500 | RAUCH | Typ Elektronik → Raucherzubehör; Kategorie → hg-19-1; +smoke-zubehoer; −becher | DRY |
| auberginen-zigarrenanzunder-mit-doppelflamme-947328 | RAUCH | Typ Küche & Bar → Raucherzubehör; Kategorie → hg-19; +smoke-zubehoer; −kochen,kueche | DRY |
| elektronisches-zigarren-hygrometer-619800 | RAUCH | Typ Werkzeug & Heimwerken → Raucherzubehör; Kategorie → hg-19; +smoke-zubehoer; −heimwerken,werkzeug | DRY |
| kompakter-zigarrenkasten-627900 | RAUCH | Typ Aufbewahrung & Organizer → Raucherzubehör; Kategorie → hg-19; +smoke-zubehoer; −aufbewahrung,organizer | DRY |
| eisige-meeresoberflache-607000 | EINZEL | Titel «Eisige Meeresoberfläche» → «Press-on-Nägel «Eisige Meeresoberfläche», 10 Stück»; SEO | DRY |
| laser-silber-rippband-75mm-50-yards-026496 | EINZEL | Titel «Laser-Silber-Rippband, 75mm, 50 Yards» → «Ripsband in Silber mit Glanzeffekt, 75 mm, 50 Yards»; SEO; ⚠️ POLICY ['Guns and Parts']: Titel wird heute repariert — Google prüft neu, 7 Tage warten | DRY |
| herren-langarmhemd-im-used-look-620200 | USED | Titel «Herren Langarmhemd im Used-Look» → «Herren Langarmhemd im Vintage-Look»; Beschreibung; SEO | DRY |
| spiral-pipe-atomizer-fur-trockene-krauter-467392 | RAUCH | Typ Werkzeug & Heimwerken → Raucherzubehör; Kategorie → hg-19; +raucher,smoke-zubehoer; −heimwerken,werkzeug; ⚠️ POLICY ['Illegal drugs']: schon ausgeschlossen (raucher, smoke-zubehoer) | DRY |
| baustein-luxuslimousine-auf-raedern-334528 | EINZEL | Titel «Luxus-Limousine · Baustein-Auto auf Rädern» → «Baustein-Set Luxus-Limousine – Spielzeugauto zum Bauen»; Typ Spass-Elektronik → Spielzeug; −rc; ⚠️ POLICY ['Vehicles']: Titel wird heute repariert — Google prüft neu, 7 Tage warten | DRY |
| retro-ohrringe-im-used-look-mit-kettendetail-626900 | USED | Titel «Retro-Ohrringe im Used-Look mit Kettendetail» → «Retro-Ohrringe im Vintage-Look mit Kettendetail»; Beschreibung; SEO | DRY |
| 1-zoll-zapfpistole-fur-diesel-und-benzin-257024 | EINZEL | Titel «1-Zoll-Zapfpistole für Diesel und Benzin» → «1-Zoll-Zapfventil für Diesel und Benzin»; SEO; ⚠️ POLICY ['Guns and Parts']: Titel wird heute repariert — Google prüft neu, 7 Tage warten | DRY |
| biden-herrenuhr-ultraflach-mit-kalender-611776 | EINZEL | Titel «BIDEN Herrenuhr ultraflach mit Kalender» → «Ultraflache Herrenuhr mit Kalender»; Beschreibung; SEO | DRY |
| biden-herren-quarzuhr-hohl-leger-052544 | EINZEL | Titel «Biden Herren-Quarzuhr, hohl, leger» → «Legere Herren-Quarzuhr mit Kalender»; Typ Elektronik → Uhren; Kategorie → aa-6-11; +uhren; −elektronik,gadget,tech; SEO | DRY |
| k68-signal-detektor-46ae1c | POLICY | +google-policy-flag,google-policy-hacking | DRY |
| twill-umhangetasche-im-used-look-676544 | USED | Titel «Twill Umhängetasche im Used-Look» → «Twill Umhängetasche im Vintage-Look»; Beschreibung; SEO | DRY |
| smarter-aschenbecher-mit-luftreiniger-fur-auto-042304 | RAUCH | Typ Gadget → Raucherzubehör; Kategorie → hg-19-1; +raucher,smoke-zubehoer; −becher | DRY |
| intelligenter-intimreiniger-fur-die-frau-723136 | HYGIENE+POLICY | Typ Aufbewahrung & Organizer → Wellness & Gesundheit; Kategorie → hb-3-8-3; +google-policy-flag,google-policy-titel,intimpflege; −aufbewahrung,haushalt,organizer,wohnen | DRY |
| runder-aschenbecher-aus-keramik-2cef8b | RAUCH | Typ Küche & Bar → Raucherzubehör; Kategorie → hg-19-1; +raucher,smoke-zubehoer; −becher,kochen,kueche | DRY |

## Beständig gemeldet, kein Titelbefund (beobachten, nicht umschreiben)

- eleganter-wollmantel-fur-damen-601200: Title under review
