# 🟧 Blender MCP — Setup (nur lokaler Claude, GPU-Laptop)

> Damit steuert der **lokale Claude** Blender direkt (3D-Modelle aufräumen, Retopo, Materialien/Shader,
> Animationen, eigene Modelle) — der „Polish"-Schritt für die Meshy-Modelle.
> **Nicht in der Cloud** (kein Blender/GPU/Display). Nur auf dem 3070-Laptop.

## Voraussetzung
- **Blender** installiert (blender.org).
- **uv** (für `uvx`): PowerShell → `winget install astral-sh.uv` (oder `pip install uv`).

## 1. Blender-Addon installieren
- `addon.py` aus dem Repo **ahujasid/blender-mcp** laden (github.com/ahujasid/blender-mcp).
- Blender → **Edit → Preferences → Add-ons → Install…** → `addon.py` wählen → Häkchen aktivieren.

## 2. MCP beim lokalen Claude Code registrieren
PowerShell (im Projektordner):
```
claude mcp add blender -- uvx blender-mcp
```
(Falls `uvx` nicht im PATH: vollen Pfad angeben, z. B. `…\Scripts\uvx.exe`.)

## 3. Blender mit Claude verbinden
- In Blender: **N** drücken (Sidebar) → Tab **BlenderMCP** → **Connect to Claude** / **Start MCP Server**
  (meldet „MCP Server started on port 9876"). Optional **Poly Haven** aktivieren (gratis Assets/HDRIs).

## 4. Lokalen Claude neu starten
- Claude Code beenden + neu starten → der `blender`-MCP ist verfügbar.

## Nutzung (Beispiele für den lokalen Claude)
- „Importiere `game/assets/glider.glb`, mach Retopo, gib ihm ein Neon-Emissions-Material, exportiere als .glb zurück."
- „Baue ein Low-Poly-Boss-Modell, Stil wie die anderen Assets, animiere ein leichtes Schweben."
- „Render 3 Marketing-Screenshots der Szene."

## Hinweise
- **Nur EINE** MCP-Instanz gleichzeitig (nicht in mehreren Claude-Fenstern parallel auf Blender).
- Reihenfolge: Blender offen + Addon-Server „Start" → dann Claude. Sonst „connection refused".
- Polish ist **optional** — die Meshy-Modelle (mit `refine` = texturiert) + Godot reichen schon für ein gutes Spiel.
  Blender MCP = die Kür (Custom-Modelle, Animationen, AAA-Materialien).
