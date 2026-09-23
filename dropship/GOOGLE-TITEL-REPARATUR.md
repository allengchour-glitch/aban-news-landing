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

## Letzter Lauf 2026-09-23T18:47:14Z — SCHARF

Gescannt 50010 aktive von 50010 (EXACT); Wächter-Stand 9 h alt; Kanarienvögel und Taxonomie-IDs geprüft. Eimer-Etikette: 0x gewartet, 0 s gesamt.

| Produkt | Regel | Änderung | Status |
|---|---|---|---|
| menstruationscup-fur-frauen-625600 | HYGIENE+POLICY | Typ Aufbewahrung & Organizer → Wellness & Gesundheit; Kategorie → hb-3-8-5; +google-policy-flag,google-policy-titel,intimpflege; −aufbewahrung,haushalt,organizer,wohnen | ok |
| biden-herrenuhr-ultraflach-mit-kalender-611776 | EINZEL | Titel «BIDEN Herrenuhr ultraflach mit Kalender» → «Ultraflache Herrenuhr mit Kalender»; Beschreibung; SEO | ok; text-sperre-belegt |

## Beständig gemeldet, kein Titelbefund (beobachten, nicht umschreiben)

- 1-zoll-zapfpistole-fur-diesel-und-benzin-257024: Guns and Parts
- baustein-luxuslimousine-auf-raedern-334528: Vehicles
- eleganter-wollmantel-fur-damen-601200: Title under review
- intelligenter-intimreiniger-fur-die-frau-723136: Inappropriate title
- k68-signal-detektor-46ae1c: Hacking
- laser-silber-rippband-75mm-50-yards-026496: Guns and Parts
- spiral-pipe-atomizer-fur-trockene-krauter-467392: Illegal drugs
- taktisches-outdoor-stativ-faltbar-ausziehbar-519234: Guns and Parts
- zisha-keramik-gongfu-teetasse-tenmoku-glasur-638100: Inappropriate title, Title under review
