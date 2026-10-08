# Auswahl nachrüsten — ganzer Katalog (08.10.2026)

**Auftrag (Betreiber, 08.10.):** «rot oder pink auswahl, checke das auch bei anderen produkten» (Screenshot
Adventskalender-Geschenkbox: Text «in Rot oder Pink», keine Auswahl) → «ja fix das alles sehr sauber ganze katalog».

## Befund (GEMESSEN)

| Zahl | Was |
|---|---|
| 51'720 | aktive Produkte mit Beschreibung im Bulk-Export |
| 30'273 | davon mit EINER Shop-Variante |
| **5'511** | davon versprechen im Text eine Wahl (4'326 alte Muster + 1'162 neue «in Rot oder Pink erhältlich») — `dropship/_klassen/auswahl-versprechen-bei-einer-variante.txt` |
| 5'498 | davon mit CJ-SKU (messbar) |
| 604 | bis 19:40 UTC bei CJ gemessen (CJ-Tagesbudget seit ~18:40 leer, Reset 00:00 UTC) |
| 528 / 63 / 10 | davon 2–60 / ≤ 1 / > 60 CJ-Varianten → **~87 % führt CJ wirklich in mehreren Varianten** |

Die Kundin sieht «Rot oder Pink», kann nicht wählen; der Bestell-Automat bekommt `CJ-<pid>` ohne Variante und legt die
Bestellung auf «manuell prüfen» (`cj_order_engine.py`). Beides ist dieselbe Lücke.

## Was gebaut wurde

**`automation/auswahl_werte.py`** (neu, 45 Kanarien, `--selbsttest`) — CJ-`variantKey` → deutsche Shop-Optionen:
- Stecker-Teil («-EU/-UK», «Europlug», «American Standard Plug», «European Standard Black») → nur die EU-Varianten bleiben.
- Zerlegen am Bindestrich (wenn alle Schlüssel gleich viele Teile haben), konstante Teile weg → bis zu **drei Optionen**.
- Übersetzt nur Belegtes: Hauslexika (`farbe_deutsch`, `phrase_de`, `farblexikon`), Buchstaben-/Wortgrössen, Masse und
  Mengen mit Einheit (Zahl bleibt), Codes/Zählwerte → «Modell N» (Importer-Regel 14.08.), Nagel-Wortschatz.
  «Black Large» / «Black 15inches» → Farbe + Grösse.
- An 144 gecachten CJ-Antworten: **94 deterministisch** (vorher 48 von 120 mit dem alten Wortschatz).
- Rest per Sprachmodell (OpenAI → Groq gpt-oss-120b) mit **harter Prüfung** (Anzahl, eindeutig, jede Zahl bleibt, «×» und
  Bereiche bleiben, Grundfarben bleiben, kein englisches Restwort) **und Zweitprüfer** (qwen3.8-27b, andere Modellfamilie).
  Ledger `dropship/_auswahl_uebersetzt.jsonl` (v3: 37 Anfragen, 20 angenommen).
  ⚠️ v1 ohne Zweitprüfer liess «Bean paste → Bohnenpaste» (gemeint: Altrosa) und «90to140 → 90×140» durch — formal
  gültig, inhaltlich falsch. Der Zweitprüfer lehnte beide ab; «5th Gang» ebenso.

**`automation/auswahl_nachruesten.py`** (erweitert):
- Raster nicht voll → `productOptionsCreate` legt jede Kombination an, die fehlenden werden sofort gelöscht; die
  Ursprungsvariante ist immer die erste Kombination. **Am Wegwerf-Entwurf zweimal getestet** (2×2-Raster, 1 gelöscht,
  Rücklesen, Rückbau auf «Default Title» mit derselben Varianten-ID, Entwurf gelöscht).
- Je Variante exakte CJ-`variantSku`, eigenes Bild (fehlende werden nachgeladen), Preis nie tiefer (Stufen proportional),
  EK/Gewicht/Streichpreis mit, **Google-Farbe und -Grösse je Variante** (sonst erbt jede Variante die eine Produktfarbe);
  die Produktfarbe wird danach gelöscht.
- Grenzen je Auswahlliste (≤ 60 bei einer Option, ≤ 40 je Option bei mehreren, ≤ 250 Varianten); Preisspreizung bis 4×,
  aber kein Sprung > 2,5× zwischen zwei Stufen (Datenfehler-Muster der Sandale 147 → 1'332).
- Bildpflicht für sichtbare Optionen (Farbe, Modell, Motiv …): jeder Wert ein anderes Bild.
- MANUELL-/Fehlerfälle gemerkt (`_auswahl_manuell.tsv` 7 Tage, `_auswahl_fehler.tsv` 30 Tage), Zeitbudget `ZEIT_S`
  statt hartem `timeout` (ein SIGTERM mitten im Schreiben hinterliesse ein halbes Produkt).

**Aufseher** (`fixer_keepalive.sh`, stündlich, flock): messen (Vorrang im CJ-Takt) → `SCHARF=1 CAP=150 MAX_FEHLER=3
ZEIT_S=1200`. Notbremse: Datei `dropship/_auswahl_scharf_aus`.

**Text** (`wahlversprechen.py`): ehrlich gemacht wird nur noch, wo CJ **gemessen** ≤ 1 Variante führt — `cj: null`
(CJ nicht erreicht) zählte bisher als «≤ 1» (behoben) — und neu, wo der Umbau ≥ 3 Tage dauerhaft MANUELL bleibt.

## Ergebnis heute (GEMESSEN)

- **46 Produkte umgebaut, 0 Fehler, 0 Rückbau** (Ledger `dropship/_auswahl_nachgeruestet.txt`): 25 Farbe, 7 Farbe ×
  Grösse, je 1 Farbe × Typ / × Menge / × Akku / × Ausführung × Grösse, 14 mit KI-Werten.
- Live (WebFetch luxestyle.ch): «Futterspender-Kreisel für Katze» zeigt Farbe Grün/Orange + Grösse M/L, Warenkorb aktiv;
  Admin: 4 Varianten mit CJ-SKU `CJYD2144249…`, eigenes Bild, Google color/size je Variante.
- Von Hand nachgebessert: «Pedal» → «Fusshocker» (Sitzsack-Bezug), «100×80CM» → «100×80 cm» (Tatami-Bezug); Regeln
  nachgezogen (Einheiten-Normalisierung, «Pedal» kein Lehnwort).

## Offen

- ~4'900 Kandidaten noch nicht gemessen → läuft ab 00:00 UTC (Budget-Reset) im Aufseher; ~150 Umbauten/h.
- Dauerhaft MANUELL (bisher 8): KI abgelehnt, Preissprung, Bilder nicht unterscheidbar → nach 3 Tagen Text ehrlich.
