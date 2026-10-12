# Masstabellen des Modells + Kassen-Lieferdatum — 12.10.2026 («weiter verbessern alles mögliche»)

## 1. Masstabellen (Klasse aus der Messrunde, Platz «Top-Produktseiten»)
**GEMESSEN:** 23 der 60 meistbesuchten Produktseiten = CJ-Kleidung/-Schuhe mit Grösse (64 % der Sitzungen), keine mit den
Massen des Modells; shopweit 14'187 von 14'367 CJ-Mode-Produkten ohne Massangabe. CJ liefert die Tabelle als Bild.
**GETAN:**
- Workflow «masstabellen-lesen» (10 Agenten, Vision): 21 Produkte, je Bild der Beschreibung durchgesehen → 15 mit Tabelle,
  6 ehrlich ohne (Sirène, Aria, 2 Sneaker/Sandalen, Herrenjacke, Kapuzenpullover — nur Modelfotos). Jede Tabelle von einem
  zweiten Leser unabhängig abgeschrieben.
- `automation/masstabelle_schreiben.py` (Selbsttest 12/12): schreibt nur, wenn beide Lesungen «hoch sicher» sind, Spalten
  gleich bedeuten (Rocklänge = Länge), jede Zahl ≤ 1 cm abweicht, Werte mit der Grösse steigen; Zeilen, die der Shop nicht
  verkauft, fallen weg (≥ 50 % der Shop-Grössen müssen bleiben). Kopie des allgemeinen Guides wird ersetzt. Bereinigt
  verglichen (Shopify setzt Zeilenumbrüche, entfernt Kommentare) → idempotent.
- **7 geschrieben**, live geprüft (Aurora): Aurora, Lino-Set, Lino-Herrenhose, Halterneck-Kleid, Boho-Resort-Set, Mesh-Bluse,
  Schnurkleid «Noir». Nicht geschrieben (Grund in `dropship/MASSTABELLEN.md`): Provence (Spalten «Relax»/«Ärmel 99–104» unklar),
  Plateau-Sneaker (allgemeine 5-mm-Tabelle), Fleurette/Lumea/Chiffon/Denim-Rock/Sandalette (ein Leser nur «mittel» sicher),
  Pullover (Grössen «0XL/1XL» passen nicht).
- Aufseher täglich (idempotent, hält die Blöcke stehen). Daten `dropship/_masstabellen.json`, Rückweg `_masstabellen_ledger.tsv`.
- Nebenfund: Plateau-Sneaker wirbt im Bild mit «6CM», Titel sagt 8 cm (CJ-Farbname «increased by 8CM») — offen.
**NÄCHSTER SCHRITT:** weitere Top-Seiten im CJ-Vorrang-Fenster (00:00–01:30 UTC, CJ-Punkte 10/Produkt) holen und gleich lesen.

## 2. Kassen-Lieferdatum = Produktseite
**GEMESSEN:** Kasse = Bearbeitungszeit P3D + Tarif-Transit 10–20 → 13–23 WT, Produktseite/Richtlinie 10–20 WT (Kaufweg 10.10.:
Kasse «29. Okt – 12. Nov» gegen Seite «26. Okt – 9. Nov»). `versand_transit_wache.py --scharf` hielt den Fehler täglich fest.
**GETAN:** Regel nennt jetzt die GESAMT-Zusage; die Wache liest `deliveryPromiseSettings.processingTime` live und setzt
Transit = Zusage − Bearbeitung → CH/Rest 7–17, LI 12–42; 5 Tarife gesetzt + zurückgelesen, Preise unverändert (Testkorb CHF 7).
Kassen-Wache «ok». Offen (Theme/Profil): Schweizer-Lager-Ware bleibt in der Kasse bei 3 + 7–17 (eigenes Profil würde
gemischte Körbe doppelt belasten — Messrunde).

## 3. Google Ads
Aurora fiel 30 min nach der Label-Änderung ebenfalls aus dem Werbe-Kontingent («Over capacity … [CH]») → jede Produktänderung
schickt das Produkt neu an Google; bei vollem Kontingent fällt es aus der Werbung. **Kampagne pausiert (Betreiber).**
Offen: Kontingent im Merchant Center erhöhen lassen.
