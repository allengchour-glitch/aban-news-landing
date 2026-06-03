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

## Daten-API (`functions/api/ki-tools.js`)

Cloudflare Pages Function zum Datensatz. Zwei Modi:
- **Gratis-Sample (offen, CORS):** `GET /api/ki-tools` → 30 Tools als JSON + Meta + Kauf-Link.
  Taugt als Entwickler-Vorschau und Lead-Gen. Kein Key nötig.
- **Voll (per Key):** `GET /api/ki-tools?full` mit Header `X-API-Key`. Liefert den kompletten
  Datensatz — **nur** wenn beides eingerichtet ist:
  1. Env-Var **`DATENSATZ_API_KEY`** = dein geheimer Zugriffs-Key (an Käufer:innen ausgegeben).
  2. KV-Binding **`DATENSATZ_KV`** mit dem KV-Key `datensatz` = der volle Datensatz als JSON.

### Warum KV statt eingebettet
Das Repo ist **öffentlich** — der volle Datensatz darf nicht in den committeten Code, sonst
wäre das bezahlte CSV-Produkt gratis einsehbar. Darum liegt das Sample (frei) im Code, die
Volldaten aber nur im KV-Store, den du befüllst. Solange KV/Key fehlen, antwortet der
Voll-Endpoint ehrlich mit 402/503 + Kauf-Hinweis.

### Voll-API aktivieren
```bash
cd daten-produkt && python3 generate_datensatz.py      # erzeugt dist/ki-tools-dach-voll.json
# In Cloudflare: KV-Namespace anlegen, als DATENSATZ_KV ans Pages-Projekt binden,
# den Inhalt von dist/ki-tools-dach-voll.json unter dem KV-Key "datensatz" speichern.
# Env-Var DATENSATZ_API_KEY setzen. Key an Käufer:innen (über Lemon Squeezy) ausliefern.
```
Ehrlich: Die Daten sind aus öffentlichen Quellen aggregiert; der Key kauft Bequemlichkeit,
Updates und Support. Für echte Exklusivität ist diese Nische ohnehin zu offen.
