# «Geschenke bis CHF 30»: oben Vielfalt statt Partydeko und Schmuck (03.10.2026, Plan Tag 3 Rest)

## GEMESSEN
- Im Menü und in 9 Kanälen steht die Kollektion `🎁-geschenke-bis-chf-30`. Regel: Tag `geschenk` UND Preis < 30, sortiert CREATED_DESC, 15'518 Produkte. Bei über 5'000 Produkten zeigt Shopify keine Filter.
- Unter den ersten 24 Karten waren **12 «Partydeko & Ballone» und 11 Schmuck**. Die Zwillingskollektion `geschenke-unter-30` (1 Kanal) zeigte dasselbe.
- Es ist dieselbe Klasse wie bei «für Sie / Ihn / Kinder» am 02.10.: Die Zuordnung ist das Problem, nicht die Sortierung.

## GETAN
- `automation/geschenk_unterwelten.py` hat eine vierte Welt `unter30`:
  - eigenes Preisband CHF 12–30 (die anderen Welten bleiben bei 19–150), unisex, ohne Baby
  - 8 Warenarten: Schmuck, Duft/Kerze, Tasse/Tee, Deko/Licht, Spiel/Puzzle/Plüsch, Kuscheldecke, Beauty-Zubehör, Gadget
  - reihum gezogen, 400 Produkte, Tag `geschenkwelt-unter30`, Regel = dieser Tag, Plätze 1–48 manuell gemischt
- Die Bedingungen gelten wie bei den anderen Welten: aktiv, im Google-Kanal, mindestens 2 Bilder, keine Sperr-Tags oder Sperr-Wörter.
- Der Trockenlauf (Stichprobe 110) fand Fehlgriffe. Sie sind jetzt Ausschluss-Regeln in `ART_NICHT`; alle 10 Kanarienvögel sind draussen:
  - Nagelset «Sternenhimmel» als Deko
  - Herrenuhr und WC-Licht «mit Nachtlicht»
  - Perlenring
  - Taschenuhr mit Lupe als Gadget
  - Gewichts-Notizbuch
  - Kuscheldecke mit Oster-Print im Oktober
  - Fidget-Spinner-Schlüsselanhänger als Schmuck
  - «quietschendes Plüschtier zum Zähneknirschen» (Hundespielzeug)
- Altregeln liegen in `dropship/_geschenk_unterwelten_alt.json`. Der Aufseher fährt den Lauf täglich (bestehender Block).

## OFFEN
- Die Zwillingskollektion `geschenke-unter-30` (1 Kanal, nicht im Menü) bleibt vorerst. Kandidat zum Abmelden, sobald klar ist, welcher Kanal sie nutzt.

## Nebenbefund derselben Runde: Google-Vollscan kam nie ans Ziel
- **GEMESSEN:** `google_feedback_wache.py` startete heute um 07:11, 08:09, 08:26 und 08:31. Keiner der Läufe wurde fertig, der Stand blieb auf 02.10. 13:26. Der Scan braucht rund 206 Seiten plus Wartezeiten, also mehr als eine Stunde. Der Container startet etwa stündlich neu, und der Lauf schrieb erst am Ende.
- **GETAN:** Der Lauf setzt jetzt fort. Nach jeder Seite sichert er den Zwischenstand atomar nach `/tmp/google_feedback_teil.json`; ein Neustart innerhalb von 8 h setzt dort an. Nach dem fertigen Stand wird die Datei gelöscht.
- **Probe:** simulierter Abbruch nach 2 Seiten, dann «FORTSETZEN ab Seite 2», Ende mit 4 Seiten und 1000 gescannten Produkten. Danach existierte keine Teil-Datei mehr.
- **Folge:** Die Nachmessung von Bildtausch, Anstoss und Variantenbildern (`GOOGLE-BLOCKER-FIX-2026-10-03.md`) hing genau an diesem Scan.
