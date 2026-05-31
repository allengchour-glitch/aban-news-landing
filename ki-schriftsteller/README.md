# KI-Schriftsteller

Schreibt einen Roman Kapitel fuer Kapitel mit Claude (Opus 4.8) - aus einer
Plot-Bibel als deutsche Fantasy-/Drama-Prosa.

## Was es kann

- Liest `roman.json` (Konzept, Welt, Magiesystem, Figuren, Kapitelplan).
- Schreibt jedes Kapitel als fertige Prosa in `kapitel/kapitel-NN.md`.
- Haelt Kontinuitaet: bereits geschriebene Kapitel fliessen als kurze
  Synopse in den naechsten Aufruf ein.

## Technik

- **Modell:** `claude-opus-4-8` (Prosa), **adaptives Denken**, **Streaming**
  (Kapitel koennen lang werden).
- **Prompt-Caching:** Die Plot-Bibel ist der stabile System-Praefix und wird
  mit `cache_control` gecacht. Ab dem zweiten Kapitel liest Claude sie aus dem
  Cache (~0.1x statt vollem Preis). Pruefbar an `cache_read` in der Ausgabe.
- Reine Anthropic-SDK-Nutzung, API-Key nur ueber Umgebungsvariable.

## Installation

```bash
pip install anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Verwendung

```bash
python3 schreibe_roman.py                 # alle Kapitel
python3 schreibe_roman.py --kapitel 1     # nur Kapitel 1
python3 schreibe_roman.py --neu           # vorhandene ueberschreiben
python3 schreibe_roman.py --roman mein.json --out kapitel/
```

Danach zu einem lieferbaren Buch (Markdown + EPUB3) kompilieren:

```bash
python3 buch_bauen.py --roman roman.json   # -> ausgabe/<slug>.md + .epub
```

## Eigenen Roman schreiben

Kopiere `roman.json` und passe an:

- `praemisse`, `ton`, `erzaehlperspektive`, `stilregeln` - der Stil.
- `welt` - Schauplatz, Regeln (z. B. das Magiesystem), zentraler Konflikt.
- `figuren` - jede mit `wunsch`, `geheimnis` (bleibt der Leserschaft verborgen)
  und `stimme`.
- `kapitel` - pro Kapitel `ziel` und konkrete `beats` (Handlungsschritte).

Je konkreter die Beats, desto gezielter das Kapitel.

## Trilogie / Mehrband-Romane

Ein Roman kann statt eines flachen `kapitel`-Arrays mehrere **Bände** haben.
Welt, Ton, Stilregeln und Figuren bleiben oben geteilt (ein Gesamtbogen, ein
gecachter System-Präfix); nur die Kapitel liegen pro Band:

```json
{
  "titel": "...", "genre": "Drama", "...": "...",
  "welt": { "...": "..." }, "figuren": [ ... ],
  "baende": [
    { "nummer": 1, "titel": "Der Hang", "untertitel": "1961-1963",
      "kapitel": [ {"nummer":1,"titel":"...","ziel":"...","beats":[...]} ] },
    { "nummer": 2, "titel": "Die Mitte", "kapitel": [ ... ] },
    { "nummer": 3, "titel": "Das Wasser", "kapitel": [ ... ] }
  ]
}
```

Fertiges Beispiel: **`roman-drama-trilogie.json`** ("Das Tal hält den Atem an",
3 Bände). Bibeln ohne `baende` (z. B. `roman.json`, `roman-thriller.json`)
verhalten sich unverändert wie ein Einzelbuch.

```bash
python3 schreibe_roman.py --roman roman-drama-trilogie.json            # ganze Trilogie
python3 schreibe_roman.py --roman roman-drama-trilogie.json --band 1   # nur Band 1
python3 schreibe_roman.py --roman roman-drama-trilogie.json --band 1 --kapitel 3
python3 buch_bauen.py     --roman roman-drama-trilogie.json            # je Band + Gesamt
python3 plane_kapitel.py  --roman roman-drama-trilogie.json --band 2 --anzahl 6 --schreiben
python3 lektor.py         --roman roman-drama-trilogie.json --band 1 --kapitel 3
python3 ueberarbeiten.py  --roman roman-drama-trilogie.json --band 1 --kapitel 3 --feedback "..."
```

Output-Layout der Trilogie:

- Kapitel: `kapitel/band-0N/kapitel-NN.md` (Einzelbuch weiterhin `kapitel/kapitel-NN.md`).
- Kompilat: `ausgabe/<slug>-band-0N.{md,epub}` pro Band **und**
  `ausgabe/<slug>-gesamt.{md,epub}` als Omnibus mit Band-Trennseiten.

Die Kontinuität läuft über Bandgrenzen hinweg: Kapitel früherer Bände gehen als
kurze Synopsen in spätere Aufrufe ein.

### Wie lang wird das?

Ziellänge ist 1200–2000 Wörter pro Kapitel (~5–7 Seiten). Die Beispiel-Trilogie
hat 3 × 12 = 36 Kapitel → grob ~65.000 Wörter / ~250 Seiten als Erstdurchlauf.
Für ein dickes Buch (~1000 Seiten) gibt es zwei Hebel: mehr Kapitel pro Band
(`plane_kapitel.py --band N --anzahl …`) oder eine höhere Ziellänge in
`baue_kapitel_auftrag()` (`schreibe_roman.py`).

## Hinweise

- Jedes Kapitel ist ein Entwurf. Lies gegen, kuerze, schaerfe die Stimme.
- Kosten skalieren mit Laenge; das Caching der Plot-Bibel senkt den
  wiederkehrenden Anteil deutlich.
- Generierte Kapitel werden nicht eingecheckt (siehe `.gitignore`).
