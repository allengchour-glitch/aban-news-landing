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

## Eigenen Roman schreiben

Kopiere `roman.json` und passe an:

- `praemisse`, `ton`, `erzaehlperspektive`, `stilregeln` - der Stil.
- `welt` - Schauplatz, Regeln (z. B. das Magiesystem), zentraler Konflikt.
- `figuren` - jede mit `wunsch`, `geheimnis` (bleibt der Leserschaft verborgen)
  und `stimme`.
- `kapitel` - pro Kapitel `ziel` und konkrete `beats` (Handlungsschritte).

Je konkreter die Beats, desto gezielter das Kapitel.

## Hinweise

- Jedes Kapitel ist ein Entwurf. Lies gegen, kuerze, schaerfe die Stimme.
- Kosten skalieren mit Laenge; das Caching der Plot-Bibel senkt den
  wiederkehrenden Anteil deutlich.
- Generierte Kapitel werden nicht eingecheckt (siehe `.gitignore`).
