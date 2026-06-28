# 🎮🤖 Auftrag für den LOKALEN Claude (GPU-Laptop, GTX 3070)

> Du läufst auf dem Laptop **mit Godot 4 + GPU**. Deine Rolle: der **Test-/Build-/Fix-Loop** für das
> Steam-Spiel **Neon Drift** (`game/`). Die Cloud-Session schreibt GDScript blind (kann nicht ausführen) —
> **du führst aus, findest Bugs, fixt sie, baust weiter, exportierst.** So wird's bug-frei & „super".
> Lies zuerst: `game/GAME-DESIGN.md`, `game/MARKT-RESEARCH.md`, `game/GAME-LEARNINGS.md`.

## Setup (einmal)
```
cd ~/aban-game        # oder wo das Repo liegt
git pull              # neuesten Stand holen
```
Godot 4 öffnen → `game/project.godot` importieren → **F5**.

## Schritt 1 — VERIFIZIEREN & FIXEN (wichtigste Aufgabe)
P2–P4a wurden **blind** geschrieben. Starte mit F5 und prüfe:
- Läuft es ohne Fehler im **Output/Debugger**? Wenn rote GDScript-Fehler → **fixen** (häufig: API-Namen,
  `match`, `Array.slice/shuffle`, `FileAccess`, `add_theme_*_override`).
- Spielgefühl ok? Steuerung ← →/A D, Orbs sammeln → Upgrade-Wahl 1/2/3, Säulen ausweichen, Game-Over → Leertaste.
- Jeden Fix in `game/GAME-LEARNINGS.md` notieren (damit die Cloud daraus lernt).

## Schritt 2 — PHASE 4b (jetzt mit echtem GPU-Test)
- **Sound:** `AudioStreamPlayer` für Pickup/Crash/Upgrade (kurze .ogg ODER `AudioStreamGenerator`-Töne).
- **Partikel:** `GPUParticles3D` für Orb-Pickup + Crash (statt der simplen Code-Bursts).
- **Tägliche Challenge:** deterministischer Seed aus Datum (wie im Web-Prototyp `neon-flug.html`) → teilbarer Score.
- **Objekt-Pooling** statt `queue_free`-Spam (Performance).

## Schritt 3 — PHASE 5 (Richtung Release)
- **Blender** (du hast GPU): echte Low-Poly-Modelle für Gleiter/Hindernisse statt Box/Sphere + Glow-Shader.
- **Menü/Settings/Pause**, Lokalisierung DE/EN.
- **Export:** Project → Export → Windows/Linux (Steam), Android (Play), iOS (Mac nötig), Web.
  Store-Accounts setzt der User (Steam $100, Google $25, Apple $99/J).

## Regeln (wie alle Sessions)
- **Branch + PR + push** (nie direkt nach `main`). Nach Aktionen `SHARED-MEMORY.md` (Abschnitt Live-Stand) updaten.
- Original bauen, kein fremdes IP. Fremde Lanes (`dropship/`, `video-prototypes/`, `social/`) nicht anfassen.
- Web-Spiele macht die Cloud-Session — du fokussierst auf das Godot/Steam-Spiel.

## Arbeitsteilung
- **Du (lokal, GPU):** Godot ausführen/testen/fixen/exportieren, Blender-Assets, P4b–P5.
- **Cloud-Session:** GDScript-Vorschläge (Text), Web-Spiele, Recherche, Design, Memory. Sync über Git + SHARED-MEMORY.
