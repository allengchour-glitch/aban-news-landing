# aban Namens-Shop (`pod-shop/`)

Statische Storefront für **personalisierte Print-on-Demand-Produkte** (Schlüsselanhänger,
3D-Namensschild, Grußkarte, Tasse, Poster — alle mit Name/Wort). Das Design erstellt der
bestehende **Namens-Generator** auf der Hauptseite (`/namen-generator.html`); dieser Shop
ist der Katalog + Verkauf drumherum.

- **Domain (geplant):** `shop.abannews.com` — Cloudflare-Projekt noch anzulegen.
- Reines Python-stdlib-Generat → `dist/`, DSGVO-sicher (System-Fonts, kein Tracking),
  Aban-Voice (anti-hype, du-Form). `dist/` ist gitignored.

## Bauen

```bash
cd pod-shop
python3 generate.py            # -> dist/
```

## Status: bis zum Konto-Klick vorbereitet

Der Shop ist **fertig gebaut, aber noch nicht verbunden**. Solange kein Checkout
hinterlegt ist, zeigt jede Produktseite einen **Mail-Fallback** statt eines toten Buttons.

### So schaltest du live (3 Schritte)

1. **Shopify-Store anlegen** und Produkte importieren:
   - Entweder `shopify-import.csv` im Shopify-Admin importieren (Produkte → Importieren),
   - oder per Shopify-MCP/Admin anlegen. Die CSV hat **bewusst leere Preise** und `Status=draft` —
     trag erst echte Preise ein (siehe Schritt 2), dann auf „aktiv" schalten.
2. **POD-Anbieter verbinden** (Druck + Versand, EU-Lager bevorzugt):
   - Druck (Karten/Tassen/Poster): Gelato. 3D (Namensschild): Craftcloud o. Ä. Acryl: EU-Laser-Anbieter.
   - App mit Shopify verbinden, Produkte mappen, **Druckkosten ablesen** → Verkaufspreis = Druckkosten + Marge.
   - Diese realen Preise in `data/produkte.json` (`preis_eur`) und in Shopify eintragen.
3. **Shop-Link aktivieren:** in `pod-config.json` unter `shopify` das führende `_` bei
   `_produkt_basis_url` entfernen und deine echte URL eintragen, dann `python3 generate.py`.
   Ab jetzt zeigt jede Produktseite den direkten „Jetzt bestellen"-Button statt der Mail.

## Daten-Integrität

- **Keine erfundenen Preise:** `preis_eur`/Lieferzeit bleiben `null`, bis beim Anbieter real
  kalkuliert. Die Storefront zeigt dann „Preis folgt" und es wird **kein `Offer`-JSON-LD**
  ausgegeben (nur `Product`), damit keine Falsch-Preise in Google/KI landen.
- **Keine Secrets im Repo:** `pod-config.json` enthält nur öffentliche Links/IDs. API-Keys/Tokens
  gehören in die Umgebungsvariablen von Shopify/Cloudflare, niemals hierher.

## Dateien

- `generate.py` — Storefront-Generator (Home, Produktseiten, Impressum, Datenschutz, 404, sitemap, robots, `_headers`).
- `data/produkte.json` — Produktkatalog (Material, Personalisierung, POD-Anbieter, Preis `null`).
- `pod-config.json` — Shopify-/POD-Konfiguration (alle Slots `_`-deaktiviert → Mail-Fallback).
- `shopify-import.csv` — Produkt-Import-Vorlage für Shopify (Preise leer, Status `draft`).
- Deployment: Cloudflare Pages, Output = `dist/`, kein Build-Command.
