# Bewegter Kategoriekopf 23.11.2026 (lx-collection-welten) und Higgsfield-Kopfclips

Grundlage: Der Besitzer wählte am 22.11. «Bewegten Kopf einschalten (Empfohlen)» und gab danach den Auftrag «live machen nachher».

## LIVE (MAIN-Theme 214565814663, 23.11.2026 10:55 bis 10:56 UTC)
- `snippets/lx-welten-bewegt.liquid` (neu, md5 9aeef984…): Die Bilder im Kategoriekopf driften langsam, Ken-Burns-Effekt, mit einem Durchlauf. Auf 18 Kategorieseiten liegt ein echter CJ-Produktclip über Feld 1 (Tennisarmband, Tulpen-Nachtlicht, Weihnachtskugeln, Reisebeutel, Vogelbecher). Das gilt nur ab 1100 px Breite und nie bei Save-Data, 2G oder «reduzierte Bewegung». Es gibt einen Pause-Knopf (die Wahl wird gespeichert). Der Clip erscheint nur, wenn er kleiner ist als das bisher grösste LCP-Element. Der Link führt auf die Clip-Ausführung (`?variant=`).
- `templates/collection.json`: Abschnitt `lx_welten_bewegt` (custom-liquid) direkt nach `worlds` (Sicherung `sicherung/templates__collection.json.vor-kopf`, neu `.nach`).
- `templates/collection.lxbewegt2.json` (Testvorlage, inhaltsgleich mit dem neuen collection.json; harmlos, kann bleiben).

Geprüft vor dem Einschalten: drei Bau-/Prüfrunden (Logik, Optik, Tempo). In Runde 3 lautete das Urteil bei allen drei «ok mit kleinen Funden», ohne Blocker. Dazu kamen Matrixtests (1 990 bestanden, 0 fehlgeschlagen), Szenarien (82 von 82), Liquid (65 von 65) und eine Mutationsprobe (42 von 46 erkannt, die 4 übrigen sind begründet). Die Testvorlage habe ich live gerendert: schmuck, geschirr-tisch und kueche-kochen liefern HTTP 200 ohne Liquid-Fehler, Clip s03 bzw. s09, bei kueche-kochen gibt es nur Drift.

**Live gemessen (23.11. 10:57 UTC, /collections/schmuck):** Desktop 1440: Clip spielt (readyState 4), Pause-Knopf sichtbar, CLS 0,005, keine Seitenfehler, kein seitliches Scrollen. Handy 390: Kopf ruhig (so gewollt), CLS 0,0009.

Kleine offene Funde (Runde 3, nicht behoben): Randfall beim Verkleinern vor `load`; französischer Titel bei s05/s06 fehlt (aria-label deutsch auf /fr); `will-change` bleibt an stehenden Feldern; Fokusrahmen auf hellen Bildern schwach.

## Rücknahme
```bash
cd dropship/kategoriekopf-bewegt-2311 && ./tok.sh
python3 hochladen.py templates/collection.json=sicherung/templates__collection.json.vor-kopf
```
(Das Snippet ist ohne den Abschnitt wirkungslos und darf bleiben.)

## Higgsfield-Kopfclips (nicht eingebunden)
- Higgsfield-Guthaben am 23.11. um 10:1x UTC: **0,74 Credits** (aufgebraucht).
- 63 Kategorien geplant. In 6 fand sich kein passendes Produkt. Für 32 abgelehnte Clips gab es keine Credits mehr für einen zweiten Versuch. 4 zweite Versuche endeten ohne Clip (3 Credits leer, 1 Szene abgelehnt). Nach unabhängiger Prüfung **angenommen: 11** (`geschenke-fuer-kinder`, `damen-schals-tuecher`, `kopfhoerer-audio`, `trends-gadgets`, `damen-jacken-maentel`, `kochen-grillen-backen`, `aroma-diffuser-duftlampen`, `parfum-duefte`, `sub-baby-kids`, `rucksaecke`, `geschenke-fuer-ihn`). In Runde 2 wurden 10 von 11 abgelehnt, meist wegen einer sichtbaren Schleifennaht (Kodierung) oder weil das Produkt vom Foto abweicht (Teilezahl, Farbe).
- Die angenommenen Clips (mp4, webp-Poster, meta.json) liegen in `higgsfield-clips/`, noch nicht im Shop. Um sie einzubinden, müssten sie als Datei hochgeladen werden, ins Snippet kommen (Zuordnung, Randfarben, Produktprüfung) und eine Prüfrunde durchlaufen. Das ist wegen des Sparmodus des Besitzers (23.11.) nicht begonnen.
