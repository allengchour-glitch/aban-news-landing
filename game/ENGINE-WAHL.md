# 🛠️ Engine-Entscheidung: Godot (nicht Unreal/Unity)

> Recherchiert Juni 2026 für: **solo + KI-gestützt, Verkauf auf Steam + Android + iOS, GTX-3070-Laptop,
> Casual/Roguelite.** Entscheidung steht — bitte nicht ohne Grund umwerfen.

## Ergebnis: **Godot 4.x**

| Kriterium | Godot ✅ | Unreal 5 | Unity |
|---|---|---|---|
| Lizenz | gratis, MIT, **0 Royalty** | 5 % > $1 Mio | Seat-Fees > Schwelle |
| Build-Größe | **50–200 MB** | 500 MB+ (leer!) | 35–60 MB |
| Mobile (Android/iOS) | leicht, klein | schwer zu optimieren | gut |
| **KI-schreibbar (Text)** | **ja (GDScript + .tscn)** | nein (Blueprints visuell / C++ kompilieren) | teils (C#) |
| 3070-Laptop | leicht, schnelle Iteration | schwer | mittel |
| Casual/Roguelite | ideal | overkill | ok |
| Ein Codebase → alle Stores | **ja** | ja (aber schwer) | ja |

## Warum NICHT Unreal 5 (obwohl es geil aussieht)
- **Unser Workflow bricht:** Cloud-Claude schreibt Code als **Text** → der lokale Claude testet/baut. UE5
  ist Blueprints (visuell, nicht als Text editierbar) oder C++ (kompilier-/setup-schwer) → die Cloud kann
  nicht mitbauen. Godots Text-Dateien sind genau dafür gemacht.
- Riesige Builds + Mobile-Optimierungsaufwand + Editor-Schwere = falsch für Casual + Mobile.
- UE5 lohnt nur bei **fotorealistischem AAA** (PC/Konsole). Das ist nicht unser Ziel.

## Rollen (wer macht was)
- **Cloud-Claude:** Recherche (kein GPU nötig), GDScript + Szenen-Text, Game-Design, Web-Prototypen, Memory.
- **Lokaler Claude (GTX 3070):** Godot ausführen/testen/fixen, **Maps/Level**, **Blender-Modelle**, Builds/Export.
- **Maps:** prozedural per Code (Cloud schreibt) ODER handgebaut im Godot-Editor (lokal). Kein UE5-Map-Tool nötig.

> Falls später ein reines **PC-Fotorealismus-Showcase** gewünscht ist, kann UE5 ein *separates* Projekt sein —
> aber das Haupt-Spiel (Steam + Mobile + Web, KI-gebaut) bleibt Godot.
