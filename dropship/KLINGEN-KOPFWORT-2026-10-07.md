# Messer ACTIVE trotz Klingenregel, und eine Wache, die einen fremden Export las (07.10.2026, Verbesserungsrunde)

## GEMESSEN
- **Neuimporte der letzten 4 h:** 188, davon 187 ACTIVE.
  - 9 mit nur einem Bild.
  - 8 nicht im Google-Kanal, das ist gewollt (Shisha, Messer, Zielfernrohr-Halterung).
  - 31 ohne Shopify-Kategorie, die arbeitet kategorie_fein ab.
- **Zwei Handklingen ACTIVE**, obwohl seit #1017 gilt: keine Klinge in die Schweiz.
  - «Keramikmesser-Set mit vier Messern und Schäler»: Die Beigabe «Schäler» löste die Geräte-Ausnahme aus.
  - «Boningmesser MTG15 Blut Sandelholz ohne Schutzhülle»: «Schutzhülle» wurde als Zubehör gelesen, obwohl «ohne» davor steht.
  - Das ist dieselbe Klasse wie am 05.10. («Ausnahmelisten fressen echte Messer»).
- **klinge_ch_wache.py meldete scharf «0 Handklingen im Verkauf»**, obwohl der Trockenlauf kurz davor 2 gefunden hatte.
  - Sie las 47'084 statt 81'415 Produkte.
  - `currentBulkOperation` ist der zuletzt gestartete Export der App, hier der eines anderen Wächters.

## GETAN
- **Kopfwort-Regel** in `klingenregel.py` und `klingenregel.mjs` (gleiche Logik):
  - Ist das erste Wort ein Klingenwort ohne Zubehör-/Geräte-Endung, liegt eine Klinge im Paket.
  - Das Folgewort zählt mit: «Knife Sharpener» bleibt ein Schärfer.
  - Ein Ergänzungsstrich hebt die Regel auf: «Messer- und Schneidebretthalter» ist ein Halter.
  - Ein Gerätewort ohne «und/mit» davor ist das Produkt selbst: «Haarmesser … 12-Zahn-Schere».
- **Tests:**
  - handklingenregel_test 70/70 (5 neue Fälle aus dem Voll-Export), klingenregel_test grün, Klingen-Tor grün, JS 6/6.
  - Trockenlauf über 81'415 Produkte: 2 Treffer, 0 Fehlalarme. Die 3 Fehlalarme des ersten Entwurfs (Halter ×2, Effilierschere) wurden vorher behoben.
- **klinge_ch_wache.py:**
  - fragt den Bulk-Status über die eigene ID ab (`node(id:)`);
  - meldet einen Export mit weniger als 97 % von `productsCount` (aktiv + Entwurf) als Fehler statt als Ergebnis;
  - FIX=1: 2 gedraftet und mit Sperr-Tags versehen, zurückgelesen DRAFT. MESSUNG `status:active tag:handklinge-kein-ch-versand` = 0.
- **Zweites Gehirn:** Regel `fremder-bulk` (Köder und echter Fall, 22/22). Sie meldet 5 weitere Werkzeuge mit demselben Muster.

## OFFEN
- Die 5 gemeldeten Werkzeuge auf `node(id:)` umstellen: farbe_je_variante, hauptbild_grossbild, heilversprechen_seo_wache, hype_export_bauen, kosten_export_bauen. Kein Kundenschutz-Werkzeug darunter; die Gehirn-Wache meldet sie, bis sie umgestellt sind.
