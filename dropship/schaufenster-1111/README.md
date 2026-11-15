# Weihnachts-Schaufenster (Pins auf den Plätzen 1 bis 4)

Stand: 15.11.2026. Besitzer 11.11.2026: «Ja, Weihnachten jetzt» (je 4 handverlesene, lieferbare Produkte mit sauberem Foto vorn in den Weihnachts- und Geschenk-Kategorien; die Sortierläufe respektieren das).

## Was es ist

- Pin-Datei: `dropship/kategorie-schaufenster-pins.json`.
  - modus «reihenfolge» (7 Kategorien, alle MANUAL): `weihnachten-2026`, `premium-geschenke`, `geschenke-fuer-sie`, `geschenke-fuer-ihn`, `geschenke-fuer-kinder`, `kleine-geschenke-mitbringsel`, `🎁-geschenke-bis-chf-30`.
    Der Lager-Wächter (`.github/workflows/lager-waechter.yml`, `automation/verfuegbar_zuerst.mjs`) hält die Pins auf den Plätzen 1 bis 4 in Pin-Reihenfolge.
  - modus «kopf» (3 Kategorien, BEST_SELLING bleibt): `weihnachtspyjama-familie`, `weihnachtspullover`, `adventskalender`. Nur ein Vorschlag für die Kopf-Fotos (Collection-Metafeld `luxe.kopf_produkte`), keine Umsortierung.
- Ein Pin zählt nur, wenn er Mitglied der Kategorie, aktiv, im Onlineshop veröffentlicht und lieferbar ist. Sonst rückt er nach hinten, die anderen Pins rücken auf, und der Lauf meldet «PIN-BEFUND» (im Lager-Wächter als Warnung).
- Eine fehlerhafte Pin-Datei macht den Lager-Wächter rot (Schritt «Zusammenfassung»). Fehlerhafte Einträge werden nicht verwendet, der Rest läuft weiter.
- Fehlt die Pin-Datei, verhält sich alles wie vor dem 11.11.

## Achtung: der Merge ist der Live-Schalter

`dropship/LAGER-WAECHTER-FREI.txt` liegt auf `main`. Der nächste Zeitplanlauf des Lager-Wächters nach dem Merge stellt die Köpfe von selbst um (nur die 4 Pins, der Rest bleibt). Der Zeitplan steht auf 05:17 UTC; GEMESSEN liefen die Zeitplanläufe vom 06. bis 11.11. zwischen 11:47 und 14:00 UTC.

## Dateien in diesem Ordner

| Datei | Zweck |
|---|---|
| `reihenfolge-vorher.json` | Sicherung der Handreihenfolge der 7 Kategorien, gelesen 15.11.2026 21:03 UTC (gleich der Lesung vom 11.11. 23:58 UTC: 0 Plätze verschieden) |
| `reihenfolge.mjs` | `MODUS=sichern` (nur lesen) und `MODUS=zurueck` (Trockenlauf Vorgabe, `LIVE=1` schreibt, liest nach, Exit 1 bei Abweichung) |
| `kopf_setzen.mjs` | Kopf-Fotos aus der Pin-Datei setzen (Trockenlauf Vorgabe), `HANDLES=a,b` wählt aus, Sicherung `kopf-sicherung.json`, `ZURUECK=1` liest zurück |
| `shop.mjs` | Token und GraphQL für die beiden Werkzeuge |
| `werkzeuge_test.mjs` | Test der beiden Werkzeuge gegen die Shop-Attrappe (in der CI) |

## Sofort umstellen (statt auf den Zeitplan zu warten)

Aus dem Repo-Wurzelordner, nach dem Merge:

```
HANDLES='weihnachten-2026,premium-geschenke,geschenke-fuer-sie,geschenke-fuer-ihn,geschenke-fuer-kinder,kleine-geschenke-mitbringsel,🎁-geschenke-bis-chf-30' SCHWELLE=0.1 ZEIGE_PLAETZE=8 node automation/verfuegbar_zuerst.mjs
# erwartet: 7 × «nur Kopf», 0 PIN-BEFUND; dann derselbe Befehl mit LIVE=1 (erwartet: 7 × «✓ nachgelesen, Kopf steht (Pins geprüft)»)
```

Kopf-Fotos (optional, nach Absprache mit der Banner-Sitzung, die `luxe.kopf_produkte` angelegt hat):

```
node dropship/schaufenster-1111/kopf_setzen.mjs                                        # Trockenlauf: Pyjama, Pullover, Adventskalender
LIVE=1 node dropship/schaufenster-1111/kopf_setzen.mjs
HANDLES=weihnachten-2026,geschenke-fuer-ihn node dropship/schaufenster-1111/kopf_setzen.mjs   # dort steht heute ein altes Metafeld VOR den Pins
```

## Rücknahme (Reihenfolge einhalten)

1. Pin-Einträge oder die ganze Pin-Datei **auf `main`** löschen (PR mergen), und zwar vor dem nächsten Zeitplanlauf. Sonst stellt der Lager-Wächter die Pins wieder vorn.
2. Danach die Handreihenfolge zurück: `MODUS=zurueck DATEI=dropship/schaufenster-1111/reihenfolge-vorher.json node dropship/schaufenster-1111/reihenfolge.mjs` (Trockenlauf), dann mit `LIVE=1`.
3. Kopf-Fotos zurück: `ZURUECK=1 LIVE=1 node dropship/schaufenster-1111/kopf_setzen.mjs` (braucht `kopf-sicherung.json` aus dem Setz-Lauf; diese Datei committen).

`ZURUECK=1` in `verfuegbar_zuerst.mjs` setzt nur `sortOrder` zurück, nicht die Handreihenfolge.

## Wiedervorlage

- Täglich die Zeilen «PIN-BEFUND» in der Zusammenfassung des Lager-Wächters lesen (ausverkaufter Pin: ersetzen oder stehen lassen).
- Nach Weihnachten (spätestens 27.12.2026): Pin-Datei löschen, Rücknahme wie oben oder bewusst so lassen.

## Bekannte Mängel gepinnter Produkte (nicht geändert, Produkt-Schreibzugriffe gehören zu den Titel-/Auswahl-Werkzeugen)

- `led-tintenfisch-nachtlicht-1d969a` (Mitbringsel): Titel «Tintenfisch», das Bild zeigt eine Qualle; Varianten «A/B/C/D».
- `quadratische-damenuhr-mit-strasssteinen-333440` (Für Sie): Titel «Quadratische», das Gehäuse wirkt rund.
- `geometrisches-schneeflocken-armband-617900` (Für Sie): Variantenwerte «Farbe», «Fanta Farben».
- `quarzuhr-fur-damen-mit-farbverlauf-a9cdbd` (Für Sie, Platz 1): kleines Herstellerlogo auf dem Zifferblatt.
- Bewertungen der Pins sind importierte CJ-Bewertungen mit 1 bis 8 Stimmen; echte Verkäufe fehlen fast ganz.
