# LuxeStyle-Shop — Preis & Listings (`luxestyle-shop/`)

Werkzeuge, um aus den fertigen 3D-Modellen (`../luxestyle-3d/`) **verkaufsfertige
Shopify-Produkte** zu machen: ehrlicher Preis aus echten Kosten + Listing-Entwürfe.

> Getrennt von `luxestyle-3d/` (dort entstehen die Modelle). Hier geht es nur um
> **Preis + Shop-Eintrag**. Keine erfundenen Preise — Preis nur, wenn echte Werte
> (Gewicht/Druckzeit aus Bambu Studio) vorliegen.

## 1) Preis-Rechner — `preis_rechner.py`

Rechnet Selbstkosten (Material + Maschine + Arbeit + Verpackung) × Marge → CHF.

```bash
# Gewicht aus der STL schätzen (zum Starten):
python3 preis_rechner.py --stl ../luxestyle-3d/products/mimi/mimi_einfarbig_komplett.stl --zeit 2.5

# Genauer: echtes Slicer-Gewicht + Druckzeit aus Bambu Studio:
python3 preis_rechner.py --gramm 18 --zeit 2.5
```

Annahmen (Filamentpreis, Maschinensatz, Marge, Rundung) stehen in `config.json` —
**anpassen, bevor du echt verkaufst**. Schätzung ≠ Slicer-Wahrheit (Wände+Infill
wiegen weniger als das volle Volumen → `--fuellfaktor`, Default 0.4).

## 2) Listing-Generator — `listing_generator.py`

```bash
python3 listing_generator.py     # -> dist/shopify-import.csv + dist/listings.md
```

- Liest `data/produkte.json`, baut anti-hype Beschreibungen (du-Form) + eine
  **Shopify-Import-CSV**.
- **Preis** wird nur gesetzt, wenn beim Produkt echte `gramm` + `druckzeit_h`
  hinterlegt sind; sonst leer („Preis folgt").
- Alle Produkte gehen als **Entwurf (`draft`, `Published=FALSE`)** rein — **live
  schalten machst nur du** im Shopify-Admin, nach Foto + Preis-Check.

`dist/` ist git-ignored (wird neu erzeugt). In Shopify: **Produkte → Importieren →
`shopify-import.csv`**.

## Produkte pflegen — `data/produkte.json`

Pro Produkt: `name`, `typ`, `kurz`, `punkte[]`, `varianten[]`, `tags[]`, dazu
`gramm`/`druckzeit_h` (echte Slicer-Werte; `null` = noch nicht gemessen → kein Preis)
und optional `bild`. Neues Produkt = Objekt ergänzen, Generator neu laufen lassen.

## Shop verbessern

Priorisierte, ehrliche Checkliste für luxestyle.ch: **`SHOP-CHECKLISTE.md`**.
