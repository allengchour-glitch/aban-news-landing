# Zoll-Werte in der Auswahl auf Deutsch (LIVE 11.11.2026)

## Befund (GEMESSEN 11.11. ca. 11:45 UTC, Bulk-Abfrage aller 56 498 aktiven Produkte, nur lesend)

119 aktive Produkte tragen in mindestens einem Optionswert eine Zoll-Angabe auf Englisch («7inch», «15.6 inches», «6x 4 Inches»),
zusammen 472 Werte. Anlass: Bestellung #1039 (Kette, Titel «45 cm», gewählt «24inch»; `dropship/kette-1111/`).
**Messgerät-Falle:** das erste Muster «inch» traf auch «Kanin**chen**» (180 statt 119); gezählt wird mit Wortgrenze.

## Regeln (`zoll_lib.mjs`, Test `zoll_test.mjs`, 19 Prüfungen)

- «7inch» → «7 Zoll (18 cm)»; «7.5 Inches» → «7,5 Zoll (19 cm)»; «6x 4 Inches» → «6 × 4 Zoll (15 × 10 cm)».
- Bei Laptop-, Rucksack-, Koffer-, Velo-, Bildschirm-, Tablet- und TV-Grössen nur Zoll («15,6 Zoll»), wie im Handel üblich.
- Nicht angefasst (Urteil von Hand, `offen.json`, 67 Werte): englische Wörter danach («flat pan», «headset», «Screen»),
  Fuss-Angaben, zwei Zahlen vor «inch» («11 12Inch»), Werte mit schon vorhandener cm-Angabe, Titel mit cm-Angabe
  (Kupferpfanne «24 cm» mit Ausführung «10inch»), Kollisionen (zwei Werte würden gleich heissen).
- Nur Namen ändern sich; Varianten-IDs, SKUs und Preise werden nach dem Schreiben frisch gelesen und verglichen.

## Stand

Trockenlauf gegen den echten Shop: **409 Werte in 102 Produkten**, 0 Abweichungen, 67 offen.
Der erste Live-Versuch wurde vom Berechtigungsprüfer der Sitzung gesperrt (Massenänderung) und nicht umgangen; nach dem Ja
des Besitzers auf eine gezielte Frage («Ja, umbenennen», 11.11.) lief derselbe Befehl: **409 Werte in 102 Produkten
umbenannt, je Produkt frisch gelesen (Werte, Varianten-IDs, SKUs, Preise), 0 Abweichungen**. Gegenprobe: zweiter
Trockenlauf 0 Änderungen; Storefront `tennis-armband-mit-moissanite-608700` zeigt «6,5 Zoll (17 cm)». Protokoll
`lauf-1111.log`, Sicherung `sicherung.json`. Rücknahme: `ZURUECK=1 LIVE=1 node dropship/zoll-1111/apply.mjs`.

Offen: die 67 Werte in `offen.json` (Urteil je Produkt, z. B. Perücke «13x4 headset-18inch», Wanduhr «Sliver-10inch»,
Leggings «Nine inch pants», Vorhang «W52xL63inch»).
