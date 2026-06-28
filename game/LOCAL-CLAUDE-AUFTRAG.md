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

## ⭐ NEU 2026-06-28 — `Main.gd` ist jetzt der MEISTERKLASSE-Build (cloud-seitig komplett neu)
Die Cloud hat `game/Main.gd` substanziell hochgezogen (kein Wegwerf-Prototyp mehr). Statisch verifiziert:
`gdparse` exit 0 (Grammatik gültig), nur Tabs, Dictionary-Zugriff per `["key"]` (nicht `.key`), Event-Handling
mit expliziten Casts (`var ke: InputEventKey = event`). **Aber: NICHT GPU-getestet → das ist dein Job.**
Neue Systeme, die du im Spielgefühl prüfst/tunst:
- **Flow/Combo:** Near-Miss (knapp an Hindernis vorbei) + Orb bauen Combo → Multiplikator ×1..9, verfällt nach
  `combo_time` s. **Kern-Sucht-Loop** — prüfe, ob das Near-Miss-Fenster (`near_window`) sich gut anfühlt.
- **Dash:** LEER/↑, lädt durch Orbs (`dash_charge`), `DASH_TIME`s Boost + Unverwundbarkeit. Tunen: Dauer/Bonus/Recharge.
- **Biome:** alle `PHASE_TIME`s Farb-/Schwierigkeitswechsel mit Ansage. Prüfe Lesbarkeit & Glow.
- **Juice:** `CPUParticles3D` Trail/Pickup/Explosion (bewusst CPU = code-only), Screen-Flash, Shake, dyn. FOV.
- **Tages-Challenge:** `[D]` im Menü → `rng.seed = day_no` (wie `neon-flug.html`). Menü/Pause/Ton(M) drin.

## Schritt 1 — VERIFIZIEREN & FIXEN (wichtigste Aufgabe)
Starte mit F5 und prüfe:
- Läuft es ohne Fehler im **Output/Debugger**? Wenn rote GDScript-Fehler → **fixen** und in `GAME-LEARNINGS.md`
  notieren (damit die Cloud daraus lernt). Stolperstellen, die ich blind NICHT 100% prüfen kann:
  CPUParticles3D-Property-Namen (`scale_amount_min/max`, `initial_velocity_min/max`), `Environment.fog_light_color`,
  `Control.anchors_preset`, `create_tween()/tween_callback`, `ResourceLoader.exists` + `load()` der SFX.
- **SFX:** `assets/sfx/*.mp3` müssen beim ersten Editor-Öffnen importiert werden (.import wird erzeugt) →
  sonst greift der `ResourceLoader.exists`-Guard und es läuft stumm (kein Crash). Prüfe, ob Töne kommen.
- Spielgefühl: Steuerung, Combo-Aufbau, Dash, Upgrade-Wahl 1/2/3, Biome-Wechsel, Game-Over → Menü → Neustart.

## Schritt 2 — PHASE 4b (Feintuning + Upgrade, jetzt mit echtem GPU-Test)
- **Partikel-Upgrade:** wenn Performance ok, optional `GPUParticles3D` statt `CPUParticles3D` (mehr Dichte).
- **Balancing:** Schwierigkeitskurve (`speed_growth`, Spawn-Rate, `near_window`, Dash-Werte) tunen bis süchtig.
- **Objekt-Pooling** statt `queue_free`-Spam bei Hindernissen/Orbs/Stripes (Performance bei langen Runs).
- **Musik:** Loop via ElevenLabs/Suno (du hast die Keys) → `AudioStreamPlayer` mit `stream.loop`.

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
