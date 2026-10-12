# Google-Restklassen — Messung und Behebung (12.10.2026, Verbesserungsrunde)

## 1. «Image too small» (2)
- **brustgeschirr-und-leine-fur-katzen-645632** — GEMESSEN: Hauptbild 720×72 px (Banner-Streifen), alle anderen 800×800.
  **BEHOBEN:** quadratisches 800×800-Bild per `productReorderMedia` nach vorne (Rücklesen: Position 1 = 800×800).
  Der Streifen bleibt als Bild 2 in der Galerie (nicht gelöscht).
- **kinder-freizeitschuhe-e3de89** — GEMESSEN: alle 6 Bilder kleiner als 500 px (grösstes 494×339).
  **Offen:** neues Quellbild nötig (CJ-Bildliste auf grössere Fassung prüfen). Nicht erfunden.

## 2. «Additional text found» (1) — herren-fleece-sport-freizeitschuhe-483776
- GEMESSEN (Bilder 1–3 angesehen): Auf dem Schuh steht die Marke «AIB», im Hintergrund Schrift (Buchcover, «Vault»-Karte).
  Die Bilder 2–3 sind Lifestyle-Fotos mit Schrift im Bild. **Offen:** sauberes Produktfoto ohne Schrift beschaffen.
  Die Marke «AIB» auf dem Schuh ist eine Fremdmarke-Frage (Markenware-Regel prüfen, siehe MARKE-ALS-WARE).

## 3. «Product page unavailable» (23) — Google-Diagnose vom 00:35 UTC ist überholt
- GEMESSEN: 20 von 23 Produktseiten antworten HTTP 200 (öffentlich, Stichprobe). 3 antworten 429 (Drosselung unseres Zugangs,
  nicht belegt). Google hat die Diagnose also nicht aktualisiert. **Nachmessen:** nächster Google-Wächter-Lauf und die 3
  Handles (`keramik-futternapf-fur-katzen-erhoht-065024`, `herren-sommer-t-shirt-mit-reverskragen-606700`,
  `vintage-leder-halbschuhe-fur-madchen-337728`) später erneut abrufen.

## Nachtrag 10:xx — Kinder-Freizeitschuhe: Quelle geprüft
- GEMESSEN: CJ-Produktabfrage (`product/query?productSku=CJWJXDNY00138`) liefert 9 Bilder, grösstes 527×351 px.
  Im Shop liegen dieselben Dateien (grösstes 527×351). **Kein grösseres Bild beim Lieferanten.**
- Hochrechnen würde unscharf und ist keine Verbesserung. Nicht getan.
- Entscheid nötig: Produkt ohne Google-Eintrag lassen (Ware bleibt im Shop) ODER Bildqualität beim Lieferanten anfragen.
- Ein Entzug aus dem Google-Kanal wäre hier keine Policy-Massnahme (Qualitätsklasse), deshalb nicht gemacht.
