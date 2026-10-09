# Nagel-Titel: «Rüstung», «Tabletten», «Nagelstifte» → Press-on-Nägel (09.10.2026, 05:20–05:50 UTC)

Betreiber «weiter». Anlass war ein Einzelfund aus der Essbar-Runde: **«Nagelverstärkungstabletten»** stand bei Google unter
«Vitamine & Nahrungsergänzung» — das Bild zeigt ein Press-on-Set mit rosa Herzen.

## Ursache

CJ übersetzt **穿戴甲** («tragbarer Nagel» = Press-on) wörtlich. 甲 heisst Nagel **und** Panzer. Daraus wurden «Wear Armor»,
«Long Wear Armor», «Rüstung», «Nagelarmor», «Nagelverstärkungstabletten», «Nagelstifte», «Handpflaster», «Schutzgeflecht»,
«Spider-Überzug», «Händchenkunst». Bei Geräten steht «polishing» als «Nagelpiercing».

## Gemessen (Export 05:01 UTC, 51'904 aktive)

- 1'039 aktive Nagel-Produkte (Typ «Nageldesign» oder Nagel-Tag), **120 ohne ehrliches Warenwort** im Titel.
- **Bildsichtung**: Kontaktbogen aller 120, dazu ein Detailbogen mit je 6 Bildern für 12 unklare Fälle und ein Bogen mit 23
  «Armor/Patch»-Titeln. Ergebnis: rund 70 Press-on-Sets und 12 Geräte oder Zubehör mit falschem Warenwort.
  Beispiele: «Nagelreiniger» ist ein Staubabsauger, «Viskose Nagelstift» ist Strass-Kleber, «Porzellanweiss Nageldesign-Blatt»
  sind Soft-Gel-Tips (550 Stück), und «3A Common Style Add Resin Jelly Glue Wear Armor · Press-on-Nägel» sind Klebepads.
- **Nagel-Korb**: 21 aktive Produkte mit Typ «Nageldesign» liegen ausserhalb der Kosmetik, darunter Mauspad, MP3-Player,
  Angelhaken, Uhrenarmband, Kühlschrankregal, 6 Tattoo-Geräte und eine Perücke. Ursache ist dieselbe wie bei der
  Büro-Klasse vom 08.10.: Die CJ-Suchgruppe hat das Warenurteil gestempelt. Dazu kam der Tag «ring» aus «Augenringe»
  (Kompositum-Falle).

## Getan: 106 Änderungen, 0 Fehler (Ledger `dropship/_nagel_korb.tsv`)

| Was | Anzahl |
|---|---|
| Titel nach Bildsichtung (Press-on) | 71 |
| Titel nach Bildsichtung (Gerät/Zubehör) | 12 |
| Titel per Regel («Wear Armor», «Wearable Nails») | 3 |
| Neue Adresse mit 301 (alte Adresse trug ein Unsinnswort) | 51 |
| Bild-Alt-Texte nachgezogen | 596 (0 Fehler) |
| Kategorie Vitamine → Künstliche Nägel (Google + Shopify) | 1 |
| Fremdartikel: Nagel-Tags weg, Typ nach der Ware | 20 |
| Hauptbild: Model im Kleid → Nagelbild (French Gelb) | 1 |

Mit jedem neuen Titel wurden auch Beschreibung und SEO angepasst: Der alte Titel wurde durch den neuen ersetzt, und die harte
Regel lief über den Text. Live geprüft: `/products/nagelverstarkungstabletten-434560` leitet per 301 auf
«Press-on-Nägel mit Herzen in Rosa» weiter, und die H1 ist neu. Ein zweiter Lauf fand nichts mehr (idempotent).

## Regel und Wächter (gilt auch für neue Importe)

- **Regeldatei `automation/data/nagel_titel_regel.json`**, die Wächter und Importer gemeinsam lesen:
  - Harte Muster: «Wear Armor» fällt weg. «Wearable Nails», «Nagelarmor», «Nagel…tabletten» und «Rüstung» werden zu
    «Press-on-Nägel». «Armor» vor «Nägel» fällt weg.
  - Fehlt danach das Warenwort, wird das Sticker-Wort ersetzt oder «· Press-on-Nägel» angehängt. Ein Adjektiv davor kommt in
    die Mehrzahl («Weisses» → «Weisse»).
  - 29 Kanarien, darunter Köder wie «Night Armor», «Schaufel-Rüstung», «Hundegesundheits-Tabletten» und «Steam Armour».
  - Die 83 handgeprüften Titel werden nur gesetzt, solange der Live-Titel noch der alte ist. Damit gibt es keinen Kampf mit
    späteren Änderungen.
- **Wächter `automation/nagel_titel.py`** läuft täglich im Aufseher in der Kategorie-Kette, VOR kosmetik_fein und nagel_fein.
  So ordnet kosmetik_fein die neuen «Press-on-Nägel»-Titel danach selbst auf False Nails.
- **Importer**: `nagel_titel.mjs` hängt in `fallenSicher` (`cj_copy_prompt.mjs`) und deckt damit alle drei CJ-Importer ab.
  Der Nagel-Kontext kommt auch aus dem CJ-Namen, so wird «Handgemachte Rüstung» + «Wear Armor» erkannt. Zusätzlich hat der
  Prompt neue Einträge unter «Bekannte Übersetzungsfallen» (wear armor/nail patch/tablets = Press-on-Nägel, polishing =
  Nagelfräse, rhinestone glue = Strass-Kleber).
- **Gleichlauf** `nagel_titel_gleichlauf_test.mjs`: JS-Kanarien 29/29, py=js über 51'933 Titel mit 0 Abweichungen.

## Offen (gemeldet, nicht Teil dieser Klasse)

- **Tattoo-Geräte (6), PMU-Pigment, Ohrlochstech-Set**: Sie sind jetzt richtig typisiert. Tätowierfarben unterliegen in der
  Schweiz eigenen Vorschriften. Ob sie verkauft werden dürfen, ist eine eigene Prüfung.
- **«DIY Rubik's Cube Diamond Aufbewahrungsbox»**: Markenname im Titel (Marken-Filter-Klasse).
- **«Massagegerät gegen Augenringe»**: möglicher Wirkversprechen-Titel.
- Viele Beschreibungen nennen weiter «in verschiedenen Grössen» bzw. «Love-Heart- und Schmetterlingsmuster» bei einem
  Tulpen-Set. Das ist die Wahlversprechen- bzw. Bild-Text-Klasse (`WAHLVERSPRECHEN.md`).
- «Fake Nails», «French Nails», «Nagelspitzen» sind ehrlich (englisch bzw. deutsch) und bleiben.

## Lehre

**Ein chinesisches Schriftzeichen mit zwei Bedeutungen erzeugt eine ganze Wortfamilie von Fehlern.** Der Fehler zeigte sich
nicht als ein Wort, sondern als zehn: Armor, Rüstung, Tabletten, Stifte, Pflaster, Überzug, Geflecht, Kunst, Eyeline, Patch.
Eine Titel-Suche nach einem Wort hätte ein Zehntel gefunden. Gefunden hat sie die umgekehrte Frage: **Welcher Titel nennt KEIN
ehrliches Warenwort?** Danach kam der Blick aufs Bild.
