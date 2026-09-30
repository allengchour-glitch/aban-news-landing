# Etsy-Pakete: Budget-Plan und Schulden-Plan

Fertig zum Hochladen in `content/etsy/<produkt>/` (nicht öffentlich, `content/` ist vom Deploy ausgeschlossen):

- `ETSY-LISTING.txt` – Titel, Preisvorschlag, 13 Tags, Beschreibung, Formular-Einstellungen
- `dateien/` – was der Käufer bekommt: Excel-Vorlage, Offline-App (HTML), Anleitung (PDF)
- `bilder/01.png … 05.png` – Produktbilder 2400 × 1800 (4:3), 01 = Titelbild

## Neu bauen

```
pip install openpyxl markdown
python3 tools/etsy/budget_xlsx.py && python3 tools/etsy/schulden_xlsx.py
python3 tools/etsy/anleitung_pdf.py
CH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/etsy/pdf.mjs
cp content/packs/de/budget-plan/budget-plan.html content/etsy/budget-plan/dateien/Budget-Plan-App.html
cp content/packs/de/schulden-plan/schulden-plan.html content/etsy/schulden-plan/dateien/Schulden-Plan-App.html
```

Bilder (`tools/etsy/bilder.mjs`) brauchen die nachgerechneten Excel-Werte in `/tmp/lo/werte.json`:
LibreOffice-Calc muss installiert sein (`apt-get install libreoffice-calc`, im Container fehlte es), dann
`soffice --headless --convert-to "xlsx:Calc MS Excel 2007 XML" --outdir /tmp/lo/out <datei>.xlsx` in einem Ordner
**ohne** führenden Bindestrich im Pfad (der Scratchpad-Pfad `/-home-…` wird als Option gelesen → „source file could
not be loaded"). Werte mit openpyxl `data_only=True` auslesen.

## Geprüft (30.09.2026)

- **Excel = Engine:** Budget 10/10 Kennzahlen gleich wie `tools/budget/engine.js`. Schulden: schuldenfrei-Monat,
  Zinsen Lawine/Schneeball/nur Mindestraten und frei-ab-Monat je Schuld identisch mit `tools/schulden/engine.js`,
  auch mit 5 Schulden und einer Rate unter dem Zins (Warnung erscheint).
- **Keine Matrixformeln** (Google Sheets rechnet `INDEX((A)+(B),0)` nicht verlässlich) → Hilfsspalte „offen total“.
- **Gefundener Fehler in der App behoben:** `datum()` machte aus dem 30. + n Monate einen „30. Februar“ = März
  (schuldenfrei-Datum einen Monat zu spät). Jetzt `setDate(1)`; betrifft auch die Version auf abannews.com.

## Englische Versionen (für den internationalen Etsy-Markt)

`content/etsy/en/budget-planner/` und `content/etsy/en/debt-payoff-planner/`: Excel, Kurzanleitung (PDF),
5 Bilder, `ETSY-LISTING.txt`. Suchbegriffe: „sinking funds“, „debt snowball“, „debt avalanche“. Währung neutral.

- **Erzeugt aus den geprüften deutschen Dateien** (`tools/etsy/uebersetzen_en.py`): übersetzt Zelltexte,
  Formel-Literale („Muss“→„Need“, „Lawine“→„Avalanche“), Blattnamen und Auswahllisten. Die Formeln bleiben gleich.
- **Gegenprobe:** EN-Budget 10/10 Werte = Engine; EN-Schulden alle Kennzahlen = Engine; Umschalten auf „Snowball“
  vertauscht die Zinsen korrekt (2'713.12 ↔ 2'341.95) → die übersetzten Literale in den Formeln greifen.
- Bilder: `tools/etsy/bilder_en.mjs` (nur Excel-Vorschau, die Apps sind deutsch). Kurzanleitungen: `tools/etsy/pdf_en.mjs`
  rendert `files/_guide.html` (Texte wurden einmalig erzeugt, das PDF ist die Quelle).

## Gumroad / Payhip

Dieselben Dateien und Texte passen auch dort. Gumroad: pro Produkt die Dateien aus `dateien/` bzw. `files/` hochladen
(oder als ZIP), Titel und Beschreibung aus `ETSY-LISTING.txt`, Titelbild `01.png`.

## Automatisch hochladen (Etsy Open API v3, ohne Klicken pro Eintrag)

`tools/etsy/etsy_upload.mjs` legt alle 4 Pakete als **Entwürfe** an: Titel, Beschreibung, 13 Tags, Preis in der
Shop-Währung (`PREISE` im Skript), Kategorie aus dem Etsy-Baum, 5 Bilder, Dateien. Idempotent über
`data/etsy-listings.json`. Start: Actions → „Etsy-Upload“ (Standard = Probelauf, prüft alle Etsy-Regeln).

**Einmalig nötig (nur der User kann das):**
1. Etsy-Shop eröffnen (etsy.com/sell: Identität, Bankkonto, Zahlungsmittel für Gebühren).
2. Etsy-App anlegen: etsy.com/developers/register → Name z. B. „aban Upload“ → **Callback-URL**
   `https://abannews.com/api/etsy-callback` eintragen → Keystring + Shared Secret kopieren.
3. GitHub-Secret **`ETSY_API_KEY`** = `keystring:shared_secret` (mit Doppelpunkt). Der nächste Deploy schreibt ihn
   automatisch auch ins Cloudflare-Projekt.
4. `https://abannews.com/api/etsy-auth` öffnen → bei Etsy freigeben → angezeigten Schlüssel als GitHub-Secret
   **`ETSY_REFRESH_TOKEN`** speichern (gilt 90 Tage).
5. Actions → „Etsy-Upload“ → Probelauf **aus** → Entwürfe erscheinen im Shop. Mit „veröffentlichen“ gehen sie live
   (USD 0.20 je Eintrag).

**Geprüft ohne echten Zugang:** `node tools/etsy/test_etsy_upload.mjs` — Regelprüfung mit Gegenproben und ein
nachgebauter Etsy-Server, der Reihenfolge, Formate (form-urlencoded / multipart) und alle Pflichtfelder laut
OpenAPI-Spezifikation (Stand 30.09.2026) kontrolliert, inkl. Idempotenz. 18/18 grün. Der erste echte Lauf ist
trotzdem der eigentliche Test: Fehlermeldungen von Etsy stehen im Workflow-Log.
