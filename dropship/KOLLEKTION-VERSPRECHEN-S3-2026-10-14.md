# Kollektions-Versprechen S3 — umgesetzt (14.10.2026)

Plan S3 aus `dropship/MEHR-KAEUFER-2026-10-13.md`: Kollektionstexte versprechen nur, was die Kasse hält.

## GEMESSEN vorher
- Rund 313 veröffentlichte Kollektionen mit mindestens einem Verstoss (Wächter-Finder). Die Arten:
  - R6: «Gratis-Versand ab CHF 50» ohne Land. Für Liechtenstein falsch, dort kostet der Versand CHF 14.90.
  - R1: Trust-Zeile «✔ Geprüfte Angaben».
  - R3: «geprüft» ohne Beleg.
  - R4: Tempo-Zusage wie «schnelle Lieferung» oder «2–3 Werktage», obwohl die Ware nicht ab Schweizer Lager kommt.
  - R5: «Premium-Auswahl».
  - R7: «Selbst gestalten» ohne Ersatzregel.
  - R8: abgeschnittene SEO-Texte («…»).
  - R9: Ware oder Marke im Text, die in der Kollektion nicht aktiv ist.

## GETAN
- **Werkzeug** `automation/kollektion_versprechen_s3.py`: Standard ist der Trockenlauf.
  - Mit `SCHARF=1` läuft zuerst der Selbsttest als Tor. Dann wird jede Kollektion frisch gelesen und neu geplant.
  - Je Feld steht vor dem Schreiben eine fsync-te Ledger-Zeile «geplant». Nach dem Rücklesen folgt «ok» (Text + Tag-Bilanz).
  - Rückweg `--zurueck` mit Kettenprüfung oder `--zurueck-regel R4 <handle>`. Unbekannte Argumente geben Exit 2.
- **EINE Regelquelle** `automation/data/versprechen_regel.json` (Abschnitt «kollektion») für Werkzeug und Wächter.
  - Ein Land zählt nur, wenn es höchstens 25 Zeichen neben der Gratis-Aussage steht. «Schweizer Shop» zählt nicht als Land.
  - Tempo-Stufen nach dem live gemessenen Anteil `profil-ch-lager`:
    - ≥ 95 %: volle Zusage.
    - ≥ 50 %: «viele/vieles».
    - darunter: keine Werktage.
  - Premium-Liste und Marken ohne Ware stehen ebenfalls dort.
  - `ware_im_text` bewacht jede Ware, die ein Ersatztext nennt: 125 Muster, jede Ware hat heute mindestens 2 aktive Produkte.
- **Wächter** `versprechen_wache.py` (Kollektionsteil):
  - Titel und SEO-Titel weist er getrennt als «manuell» aus, ebenso Premium-Hinweise und Kanäle ausserhalb des Onlineshops.
  - Die Stand-Datei `/tmp/koll_versprechen_stand.json` speist die Ampel-Zeile `koll_versprechen()`.
  - `versand_band_wache.py` zählt Regel 2 auch in Kollektionen.
- **Lauf 14:51–15:20 UTC:** Probe mit CAP=5, dann der volle Lauf. **478 Kollektionen geschrieben, 855 Felder.** Je Feld steht im Ledger «geplant» und «ok», 0 Abweichungen, 0 Fehler (`dropship/_kollektion_versprechen_s3.tsv`).

## NACHGEMESSEN (15:22 UTC)
- Wächter: **0 veröffentlicht** (vorher ~313) / 46 unveröffentlicht. Die 46 sind 45 Marken-Kollektionen ohne Ware und `express-lieferung`. JSON-LD Organization 1 (Soll 1), Slogan ok.
- WebFetch (Besuchersicht) Küche & Kochen: «Gratis-Versand in der Schweiz ab CHF 50 · 30 Tage Rückgabe». Kein «Premium-Auswahl», kein «schnelle Lieferung».

## OFFEN
- **Ware in älteren Sätzen**, die S3 nur an der Gratis-Aussage ändert (z. B. «Kapsel-Kaffeemaschinen» in kuche-kochen). Das ist eine eigene Klasse, nächste Runde. Weg: Nomen im Text gegen aktive Titel prüfen und Satzpaare nach Messung anlegen.
- **Manuell, 9 Ware-Hinweise** in Titeln und SEO-Titeln veröffentlichter Kollektionen: 3d-drucker, 3d-filament, auto-pflege, bar-glaeser, bar-wein-accessoires, gesichtspflege-geraete, ipl-haarentfernung, reise-gadgets, wellness-gesundheit.
- **Navigation** «EU-Lager — Schnell geliefert» (Menülabel) ist ausserhalb von S3, das Menü fasst das Werkzeug nicht an.
- **Stufe-3-Kandidaten** nach dem 17.10. neu messen: ft-wohndeko-ft, ft-ballone, blitzversand-highlights, spielzeug-ch-lager, suesses-esswaren. Danach `--zurueck-regel R4 <handle>` und S3 erneut laufen lassen.
- **Betreiber-Entscheide:**
  - 45 unveröffentlichte Marken-Kollektionen ohne Ware: löschen oder lassen. 6 davon sind in Shop/Meta/Google/TikTok/Pinterest veröffentlicht.
  - `PREMIUM_VOLL`: 4 veröffentlichte Premium-Kollektionen behalten «Gratis ab CHF 50» ohne Land.
  - `express-lieferung` umbenennen.

## Regel
Ein Kollektionstext darf nur versprechen, was die Kasse und der aktive Bestand halten. Jede Ersetzung wird vor dem Schreiben gegen die live gemessene Ware geprüft. Werkzeug und Wächter lesen dieselbe Regeldatei. Sonst wird die Ampel nie grün.
