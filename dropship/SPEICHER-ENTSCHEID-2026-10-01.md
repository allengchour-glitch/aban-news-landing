# Dateispeicher: was Aufräumen bringt — und was nicht (01.10.2026)

Betreiber 01.10.: «ja fix mal speicherplatz und sag wieviel noch — grow plan nur wegen speicherplatz und für cj produkten wieder pushen».

## GEMESSEN (zwei Bulk-Exporte, `automation/speicher_messen.py`, Bericht `SPEICHER-STAND.md`)
- **Belegt 107,71 GB von 100 GB** (452'829 Dateien; jede Produktdatei einem Produkt zugeordnet).
- **Aktive Produkte allein: 91,53 GB** (49'189 Produkte, 382'609 Bilder, Median 7 Bilder je Produkt, 9'142 mit mehr als 10).
- Entwürfe 15,6 GB: CJ-Entwürfe 13,77 GB (8'411), übrige 1,81 GB. Davon eindeutig tot: praktisch nichts mehr —
  die Duplikat-Bilder (6,82 GB, 4'706 Produkte) sind seit 30.09. weg.
- Bibliothek ohne Produkt (Reels, Werbebilder): 0,54 GB. Grosse Einzelbilder sind kein Hebel (> 2 MB: 230 Bilder, 0,63 GB).

## GEPRÜFT UND VERWORFEN
- «alt-einzelgroesse-ersetzt» (alte Fortura-Einzelgrössen): Ertrag 0,35 GB, und nur 728 von 1'369 haben einen auffindbaren
  aktiven Nachfolger → nicht gelöscht (Sicherheitsannahme nicht belegbar). `speicher_duplikat_bilder.py` lässt die Klasse nicht zu.

## Folgerung
**Mit dem Löschen toter Entwürfe kommt der Shop nicht mehr unter 100 GB.** Der Speicher ist voll mit dem, was verkauft wird.
Und: der CJ-Import legte ~1 GB pro Tag an — auf Basic ist ein Wiederanlaufen des Imports ausgeschlossen, egal wie aufgeräumt wird.

| Weg | Frei danach (ca.) | Preis |
|---|---|---|
| A. Aktive Produkte auf max. 10 Bilder (ab Bild 11; Variantenbilder + POD geschützt) | ~3 GB unter dem Limit (≈ 10,9 GB vor Variantenschutz) | weniger Detailbilder bei 9'142 Produkten; reicht für Fotos/Uploads, NICHT für CJ-Import |
| B. Bilder der 8'411 CJ-Entwürfe löschen | ~6 GB unter dem Limit | Rückholung dieser Entwürfe nur mit Bild-Neuimport von CJ |
| A + B | ~19 GB frei | beides oben; CJ-Import trotzdem nur ~3 Wochen |
| C. Grow (300 GB) | ~190 GB frei | ~CHF 50–70/Monat mehr als Basic |

**Empfehlung:** Für «CJ wieder pushen» führt kein Weg an Grow vorbei. Bis dahin genügt A (Uploads gehen wieder), ohne
Verkaufsverlust — Entscheid beim Betreiber, weil es aktive Produkte betrifft und nicht rückgängig zu machen ist.
