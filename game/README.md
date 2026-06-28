# 🎮 Neon Drift — Godot-Projekt (aban Spielentwickler-Bot)

**Ein Codebase → Steam (Win/Mac/Linux) + Android + iOS + Web.** Engine: **Godot 4.x** (gratis, MIT).
Diese Foundation baut die 3D-Szene komplett im Code (keine externen Assets) → **garantiert importierbar**.

## Schnellstart (auf deinem GPU-Laptop, GTX 3070)
1. **Godot 4.x** laden: https://godotengine.org/download (eine ~115-MB-Datei, keine Installation nötig).
2. Godot starten → **Import** → diese `game/project.godot` wählen → **Run** (F5).
3. Steuerung: **← →** oder **A D**. (Stirbt bei Säulen-Treffer → Leertaste = neu.)

## Arbeitsteilung (so bleibt's bug-frei)
- **Cloud-Claude (diese Repo-Session):** schreibt/erweitert GDScript + Design + Web-Prototyp (Text, kein GPU nötig).
- **Lokaler Claude (auf dem 3070-Laptop, mit Godot installiert):** **führt aus, testet, fixt Bugs, exportiert.**
  → Claude Code lokal installieren, dieses Repo klonen, in `game/` arbeiten. Koordination über Git + `SHARED-MEMORY.md`.
- Der Web-Prototyp der Mechanik läuft schon: `/neon-flug.html` (zum Fühlen/Verfeinern des Game-Feels).

## Export (lokaler Claude / du)
Godot → **Project → Export** → Vorlage je Plattform (einmalig „Export Templates" laden):
- **Steam:** Windows/Linux/macOS-Build → Steamworks hochladen (Account $100/Spiel).
- **Android:** APK/AAB → Google Play (Dev-Account $25 einmalig). Braucht Android-SDK (Godot richtet's geführt ein).
- **iOS:** Xcode-Projekt → App Store (Apple Dev $99/Jahr, Mac nötig fürs Signieren).
- **Web:** HTML5-Export → direkt auf abannews.com/itch.io.

## Status
- ✅ Foundation: Spieler-Steuerung, Kamera, prozeduraler Boden, Säulen-Spawner, Orbs, Score, Tod/Restart.
- ⏭️ Nächste Schritte (lokaler Claude, mit GPU-Test): siehe `GAME-DESIGN.md` (Juice, Roguelite-Upgrades, Sound, Menü, Highscore, Touch/Tilt, bessere Modelle via Blender).

> Regel: original bauen, kein fremdes IP. Branch + PR. Veröffentlichen = User-Accounts.
