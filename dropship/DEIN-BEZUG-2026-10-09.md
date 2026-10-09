# «dein … Design» am Satzanfang (09.10.2026, 07:15–07:45 UTC)

Gefunden beim Lesen der Uhrentexte aus der Händlerwort-Runde: Dort stand «dein mechanisches Uhrwerk garantiert Präzision»,
klein geschrieben am Satzanfang, und die Kundin wurde als Besitzerin des Uhrwerks angesprochen.

## Gemessen (Export 05:01 UTC, 51'904 aktive)

- **596 Beschreibungen** (599 Stellen) beginnen einen Satz mit kleinem «dein/deine/deiner».
- Am häufigsten: «dein … Design» 223×, «dein … Schnitt» 33×, «deine … Grösse» 26×, «dein … Stil» 25×, «dein Gehäuse» 12×,
  «deine … Textur», «dein … Uhrwerk», «dein … Zifferblatt», «deine … Formel».
- Rund 85 % meinen ein Merkmal der Ware («Ihr minimalistisches Design» = das Design der Maske). Nur rund 15 % sprechen
  wirklich die Kundin an («deine Katze liebt es …», «dein Kunstdruck wird ungerahmt geliefert», «deiner Kreativität …»).
- **Quelle:** 624 von 625 betroffenen Produkten liefen durch die Sie→du-Umstellung (`_du_form_done.txt`).
  `kollektionstexte_du_form.um()` tauscht jedes «Ihr» gegen «dein». Am Satzanfang ist «Ihr» aber mehrdeutig: Es kann die
  Höflichkeitsform sein oder «ihr/sein» im Sinn von «der Ware». Der Importer ist nicht die Quelle, er schreibt direkt in
  der du-Form.

## Regel (`automation/data/dein_bezug_regel.json`, Werkzeug `automation/dein_bezug.py`)

Satzanfang + «dein/deine/deiner» + bis zu 3 Adjektive + Nomen:

- **Nomen der Kundin** (Liste: Katze, Hund, Haustier, Haut, Haare, Kunstdruck, Kind, Baby, Zuhause, Sneaker, Kreativität
  usw.) → nur gross: «Deine Katze».
- **Merkmal der Ware** → bestimmter Artikel. Das Geschlecht kommt aus der Adjektivendung oder, ohne Adjektiv, aus der
  Nomen-Endung (Listen in der Regeldatei):
  - «deine kompakte Grösse» → «Die kompakte Grösse»
  - «dein minimalistisches Design» → «Das minimalistische Design»
  - «dein schlanker Schnitt» → «Der schlanke Schnitt»
  - «dein Gehäuse» → «Das Gehäuse»
  - «dein markantes D-förmiges Grosszifferblatt» → «Das markante D-förmige Grosszifferblatt»
- **Unklar** → «Dein» gross. Der Bezug bleibt dann offen, aber kein Satz beginnt mehr klein. Diese Fälle stehen im Bericht
  `DEIN-BEZUG.md` unter «Unklar».
- 31 Kanarien, darunter Köder wie «dein kleiner Teufel» (Kinderkostüm = das Kind), «deine Sneaker sehen wieder aus wie
  neu» (Reiniger), «Für dich und dein Zuhause» (kein Satzanfang), «Damit dein Hund …».

## Quelle repariert

`kollektionstexte_du_form.um()` ruft jetzt VOR dem pauschalen Tausch `dein_bezug.ihr_satzanfang()` auf. Probe:

- «Die Maske ist leicht. Ihr minimalistisches Design passt zu allem.» → «… Das minimalistische Design passt zu allem.»
- «Pflege für Sie. Ihre Haut fühlt sich weich an.» → «Pflege für dich. Deine Haut fühlt sich weich an.»
- «Ihr Hund wird es lieben. Wir liefern an Ihre Adresse.» → «Dein Hund wird es lieben. Wir liefern an deine Adresse.»

`um()` nutzen auch `produkttexte_du_form` (täglich), `besuchte_seiten_lieferbar`, `ratgeber_du_form` und die zwei
Reparatur-Läufe. Alle bekommen die Korrektur damit automatisch.

## Getan

Der Bestandslauf ist SCHARF gestartet (Ledger `dropship/_dein_bezug.tsv`); Endzahlen unten. Zurückgelesen per Admin-API:
«Maulbeerseiden-Gesichtsmaske für Damen» → «… Das minimalistische Design und die vollständige Gesichtsbedeckung machen sie
…». Der Wächter läuft täglich im Aufseher (VSW-Block).

## Lehre

**Eine Ersetzung, die die Wortbedeutung nicht kennt, braucht einen Blick auf die Stellung.** «Ihr» hat im Deutschen drei
Bedeutungen (Höflichkeitsform «Ihr», Possessiv «ihr» der Ware, Personalpronomen «ihr»). Gross geschrieben wird es auch am
Satzanfang. Ein Tausch ohne Satzanfang-Prüfung hat 596 Texte verdorben, und die Warnmuster des Laufs (Pluralverben,
«denst») haben es nicht gesehen, weil die Grammatik formal stimmte.
