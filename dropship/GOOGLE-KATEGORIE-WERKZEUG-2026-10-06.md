# Google-Kategorie: Küchen-/Pflegeware unter «Hardware > Tools» (Verbesserungsrunde 06.10.2026)

## GEMESSEN
- 315 Neuimporte in 30 h, davon 65 mit Google-Kategorie `Hardware > Tools` — die CJ-Gruppe «Werkzeug & Heimwerken»
  liefert auch Backformen, Haarschneider, Nagelknipser und Küchentücher.
- `google_kategorie_umzug.py` kannte für den Quellzweig Tools nur Werkzeug-Feinziele; Kreuz-Umzüge in andere Zweige fehlten.
- Erster Trockenlauf mit «silikonform» als Warenwort: **Kerzen-, Epoxid- und Gipsformen** wären als Bakeware gelandet
  («Silikonform: Tulpenblüten-Kerze», «DIY Silikonform: Meeresmotive für Epoxidharz») → Regel nachgeschärft.

## GETAN
- `UMZUG[Tools]` + 4 Kreuz-Regeln: Backform/Kuchenform/Silikonform (ohne Kerze/Harz/Epoxid/Gips/Vase/Schale/DIY/Seife)
  → Bakeware · Haarschneider/Bartschneider/Haartrimmer → Hair Clippers & Trimmers · Nagelknipser/-schere/-feile → Nail Tools ·
  Küchen-/Spültuch/Putzschwamm → Household Cleaning Supplies. Ziele gegen die Google-Taxonomie geprüft.
- Kanarienvögel 39/39 (u. a. Kerzenform, Epoxidform, Sushi-Rohrform, Rasentrimmer, Lötkolben, Meissel bleiben stehen).
- Frischer Bulk-Export, Trockenlauf, scharf: **21 umgezogen, 0 Fehler** (17 aus Tools: 13 Bakeware, 2 Haarschneider,
  1 Nagelset, 1 Küchentuch; dazu 4 Nackenkissen Decor → Pillows aus der bestehenden Regel).
- Wächter: läuft bereits täglich im Aufseher (`fixer_keepalive.sh`, Lock `google_kategorie_umzug`) und erfasst neue Importe.
- `ZEIGEN=n` zeigt im Plan n Beispiele je Quellzweig (Standard 4) — für die Fehltreffer-Prüfung vor SCHARF.

## OFFEN
- Die **Shopify-Standardkategorie** derselben Produkte bleibt `Hardware > Tools` (`kategorie_wache` füllt nur fehlende).
  Sie speist den Shop-Filter «Kategorie» (Betreiber-Klick Search & Discovery, noch aus). Folgeklasse: Standardkategorie
  nach demselben Warenwort-Muster umziehen.
