# Daten-Produkt — KI-Tools-Datensatz DACH (`daten-produkt/`)

Verkaufbarer Datensatz aus den bereits kuratierten Netzwerk-Daten (alle Tool-Radars
+ `data/tools.json`). Ein Asset, zwei Geld-Richtungen: **digitales Produkt** (Download)
und **Daten/„API"** (JSON). Ehrlich: keine erfundenen Preise/Wertungen — nicht
verifizierte Felder bleiben leer bzw. „unbekannt".

## Bauen
```bash
cd daten-produkt
python3 generate_datensatz.py
```
Erzeugt:
- `downloads/ki-tools-dach-sample.csv` — **kostenlose Probe** (30 Zeilen, committet, Lead-Magnet)
- `daten-produkt/dist/ki-tools-dach-voll.csv` + `.json` — **voller Datensatz** (git-ignored → bei Lemon Squeezy hochladen)

Spalten: `name`, `bereiche` (pipe-getrennt), `eu_hosting` (ja/nein/unbekannt), `offizielle_url`.

## Verkaufen (kein Kundenkontakt)
1. `python3 generate_datensatz.py` → `dist/ki-tools-dach-voll.csv|json`.
2. Bei **Lemon Squeezy** ein Produkt anlegen, beide Dateien als Download hochladen, Preis setzen (Vorschlag 19 €).
3. Produkt-/Checkout-URL in `ki-tools-datensatz.html` bei `DATENSATZ_BUY_URL` eintragen
   (leer → Mail-Fallback, kein toter Button). Fertig — Verkauf + Auslieferung laufen automatisch.

## Aktuell halten
Bei jeder Daten-Aktualisierung erneut `generate_datensatz.py` laufen lassen und die
Dateien bei Lemon Squeezy ersetzen. Käufer:innen bekommen das Update (LS-Funktion).
