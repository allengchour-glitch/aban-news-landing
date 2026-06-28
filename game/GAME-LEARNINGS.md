# 🧠 Game-Dev Learnings (wächst mit jeder Iteration)

> Selbst-Lern-Datei des Spielentwickler-Bots. Was funktioniert, was nicht, Godot-Fallen.
> Jede Session ergänzt hier — wie SECOND-BRAIN, aber fürs Spiel. Nur echte, getestete Erkenntnisse.

## ✅ Bewährter Workflow (funktioniert!)
- **Cloud-Claude schreibt GDScript blind → läuft tatsächlich auf dem User-Rechner.** (Neon Drift P1 startete sofort.)
- **Loop:** Cloud committet → User `cd ~/aban-game && git pull` → in Godot **F5** → Screenshot/Text-Feedback →
  Cloud fixt → wieder pull+F5. Schnell genug, kein lokaler Claude zwingend nötig (aber schneller damit).
- **Code-only Szene** (alles in `_ready()` per `.new()` gebaut) = **kein Asset-Import-Risiko**, garantiert importierbar.

## 📚 Godot-4-Fakten (verifiziert in der Praxis)
- `project.godot` mit `run/main_scene` + minimaler `Main.tscn` (nur Node3D + Script) reicht zum Start.
- `StandardMaterial3D` + `emission_enabled`/`emission`/`emission_energy_multiplier` → Neon-Look.
- HUD: `CanvasLayer` + `Label` + `add_theme_font_size_override("font_size", N)` + `add_theme_color_override`.
- Helligkeit/Neon: `Environment.glow_enabled`, `ambient_light_source = AMBIENT_SOURCE_COLOR`, `fog_density` niedrig halten.
- Arcade-Kollision = simpler Abstands-Check (kein PhysicsBody nötig) → billig + ruckelfrei.

## 🔧 Iterationen
- **P1:** lief, aber **zu dunkel + kein sichtbarer Score** (User-Screenshot).
- **P2 (jetzt):** Ambient+Glow+hellere Lichter, `fog_density` 0.02→0.006, **Neon-Randstreifen** (Canyon-Gefühl),
  **HUD** (Punkte + Rekord) + **Game-Over-Text** mit Neustart-Hinweis.

## ⏭️ Nächste Learnings/To-dos (für lokalen Claude mit GPU-Test)
- Sound (WebAudio-Äquivalent: `AudioStreamPlayer` + generierte Töne oder kleine .ogg).
- Partikel (`GPUParticles3D`) für Orb-Pickup + Crash. Objekt-Pooling statt `queue_free`-Spam.
- Touch/Tilt-Steuerung (Mobile). Roguelite-Upgrades (siehe GAME-DESIGN.md). Highscore persistent (`FileAccess`).
- Echte Low-Poly-Modelle in Blender (auf dem 3070) statt Box/Sphere.
