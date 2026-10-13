# Trendreihe «🔥 Gerade im Trend»: Recherche, Bildprüfung, Regeln für jedes Mitglied (13.10.2026)

Anlass: Dauerauftrag «Hype-Produkte recherchieren und die Startseite frisch halten» (CLAUDE.md) + Betreiber «mach bitte du alles weiter und verbesserung».

## Recherche (Web, 13.10.)
- Quellen: eprolo, sellthetrend «Winning Products» Oktober 2026, wholesale2b, cjdropshipping-Blog, TikTok-Newsroom (Holiday 2025). Umsatz- und Wachstumszahlen dort = Anbieter-Werbung (**BEHAUPTUNG**).
- Am eigenen Bestand **GEMESSEN** (`productsCount status:active`):

| Trendlisten-Nennung | Bestand | Entscheid |
|---|---:|---|
| drehbares Gewürzregal (rotating spice rack) | 4 (3 ab CHF 19) | **neu: Thema «Drehbares Gewürzregal»** |
| schwebende / unsichtbare Regale | 0 | nichts da |
| LED-Streifen | 6 | generisch, Thema «LED-Strip» gibt es schon |
| Familien-/Weihnachts-Pyjamas (TikTok-Newsroom: «matching pajamas» +407 % 09/2025, **QUELLE**) | 12 / 9 | alle ab CHF 14.90 = unter dem Reihen-Boden 19 → gehören in die Weihnachts-Reihe |
| Fellpflege-Handschuh | — | steckt schon in «Haustier-Fellpflege» |
| Pimple Patches | — | weiter abgelehnt (Wundauflage) |

Kanarie: `title:*Haarbürste*` = 3 → die Messmethode sieht Treffer.

## Bildprüfung (betreute Neuaufnahme)
- Probelauf: 15 Kandidaten (je Thema einer). Kontaktbogen angesehen: **8 untauglich**:
  - englischer Werbetext (Seifenspender «contact free», Haustierdecke-Infografik)
  - Bild ≠ Titel («Shapewear» = Abendkleid, «Karaoke-Mikrofon» = Lautsprecher)
  - Produkt unklar (Gewürzregal zeigt nur den Drehfuss, flaches EMS-Band)
  - wirkt wie Plüschspielzeug (Schwangerschaftskissen)
  - Collage mit «4.0 Bluetooth»
  
  Alle bekamen `hype-bild-schwach` mit Grund in `dropship/_hype_bild_schwach.tsv`.
- Danach frischer Export (`MAXALTER=60`) und zweiter Probelauf mit Ersatzkandidaten. **2 weitere untauglich**: Gewürzregal-Box ohne Gewürze; Shapewear-Rückansicht mit Körperfokus.
- **12 Produkte aufgenommen**, alle angesehen: Mini-Beamer P330, Reise-Organizer, 3-in-1-Ladestation, Flammen-Diffuser, Ringlicht-Stativ, Futterspender, Katzenspielzeug mit Fernbedienung, Hautverjüngungsgerät, Nackenstützkissen, Seifenspender (Spüle), Massageroller, Karaoke-System.
- Gesamtsicht aller 74 Mitglieder: **5 ältere Aufnahmen mit Bildtext** aus der Reihe genommen:
  - chinesisch «带条形码» (Ringlicht)
  - englisch «USB charging» (Katzenspielzeug)
  - englische Masse (Aufbewahrungsbox)
  - grosses «UK» (LED-Maske)
  - Produkt unklar (LED-Leisten)

## Neue Klasse: Mitglieder ohne Aufnahmedatum verstiessen gegen die Reihenregeln
- **GEMESSEN:** 8 Produkte trugen `hype-jetzt` OHNE `hype-seit-…`:
  - Spinnennetz-Deko, Knicklichter, Skelett-Handschuhe mit LED
  - Plüsch «Patrick Star» (fremde Marke), Bruder-LKW, Plüsch-Dino, Plüsch-Schneeeule
  - 1.-August-Lampion-Set
  
  Spielzeug, Partydeko und Kostüm sind genau die Typen, die die Aufnahme ausschliesst (`RAUS_TYP`).
- **Herkunft unbekannt:** Kein Skript im Repo und auch keines im alten Zweig CizQ6 setzt den Tag ohne Datum (`grep` über `.py`/`.mjs`/`.js`/`.sh`).
- Die alte Regel «ohne Datum = von Hand = bleibt für immer» liess sie nie ablaufen.
- **Fix in `automation/hype_kuratieren.py` → `abgelaufene_raeumen()`**. Dieser Teil läuft täglich im Aufseher (`NUR_RAEUMEN=1`):
  1. **Regelbruch → sofort raus, egal woher der Tag kommt:** `RAUS_TYP`, `NICHT_STARTSEITE`, `hype-bild-schwach`, nicht aktiv.
  2. **Ohne Datum → zurückdatiert** auf HEUTE − (HYPE_TAGE − 7). Solche Mitglieder haben noch 7 Tage Frist und stehen hinten.

     Mit HEUTE als Datum stand das Lampion-Set als «jüngste Aufnahme» auf Platz 12 (**GEMESSEN**, korrigiert).
- Scharfer Lauf: 9 Regelbrüche entfernt, davon 7 vom Typ Spielzeug/Partydeko/Kostüm und 2 Entwürfe. 1 Mitglied ohne Datum zurückdatiert. Danach: **Regelbruch 0, ohne Datum 0, 60 Mitglieder**, die geprüften Neuen vorn.

## Nebenbefund: Judge.me-Wächter «unklar» ist ehrlich
- `/reviews/count?rating=5` = **11'283**. Die Liste liefert je Filter höchstens 100 Seiten × 100 Bewertungen = 10'000.
- Die 1'283 ältesten 5★-Bewertungen (vor dem 29.08.) sind über die Liste nicht erreichbar. Getestet und wirkungslos: `sort_by`, `sort_dir`, `order`, `direction`, `published`, `curated`, `created_at_min`, `since`.
- Die Ampel-Zeile «JUDGEME: unklar» bleibt deshalb stehen. Sie ist eine wahre Aussage über eine Messlücke, kein Fehler.

## Befehle
```
DRY=1 python3 automation/hype_kuratieren.py                     # Kandidaten je Thema
MAXALTER=60 python3 automation/hype_export_bauen.py             # frischer Export (sonst bis 24 h alt)
KONTAKT=1 python3 automation/hype_kuratieren.py                 # Kontaktbogen /tmp/hype_kontakt.png (erste 24)
DRY=1 NUR_RAEUMEN=1 python3 automation/hype_kuratieren.py       # Regelbrüche / ohne Datum anzeigen
```
