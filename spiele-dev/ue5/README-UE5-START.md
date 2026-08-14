# 🎮 Unreal Engine 5 — Starterpaket (für deinen PC)

> **Warum dieses Paket?** Die Cloud-Session kann UE5 nicht ausführen (kein Editor, keine GPU).
> Deshalb: Claude schreibt hier Code + Anleitung, **du (oder dein PC-Claude) führst es auf dem PC aus.**
> Alles in diesem Ordner ist dafür gemacht, per Copy-Paste in ein frisches UE5-Projekt zu wandern.
> ⚠️ Ehrlichkeits-Hinweis: Dieser Code wurde hier **nicht kompiliert** (geht in der Cloud nicht) —
> er folgt der UE-5.4-API; Compiler-Meldungen bitte zurückmelden, dann fixt die nächste Session nach.

## Schritt 0 — Installation (einmalig, ~1 Stunde inkl. Download)

1. **Epic Games Launcher** installieren: https://store.epicgames.com/de/download
2. Im Launcher → Tab **Unreal Engine** → **Bibliothek** → `+` → neueste **UE 5.x** installieren
   (≈ 30–60 GB; SSD mit 100+ GB frei empfohlen).
3. Für C++: **Visual Studio 2022 Community** mit Workload „Spieleentwicklung mit C++"
   (der UE-Installer bietet das an). Nur-Blueprint geht auch ohne.

## Schritt 1 — Projekt anlegen (5 Minuten)

1. Launcher → Unreal Engine → **Starten** → Neues Projekt.
2. Vorlage **„Third Person"** (Spiele-Kategorie), **C++** (nicht nur Blueprint),
   Qualität „Maximum", Starterinhalt **AN**, Name: `MuenzJagd`.
3. Erster Start kompiliert Shader — dauert einmalig lange. Danach: Play-Knopf (▶) drücken →
   du läufst mit dem Mannequin durch die Beispiel-Map. Das ist die Basis.

## Schritt 2 — Erstes eigenes Spielziel: Münzen sammeln

Der Ordner `quellcode/` enthält zwei fertige C++-Klassen:

| Datei | Was sie tut |
|---|---|
| `MuenzePickup.h/.cpp` | Eine drehende Münze in der Welt. Läufst du hinein, zählt sie +1 und verschwindet mit Soundhaken. |
| `MuenzJagdGameMode.h/.cpp` | Zählt die eingesammelten Münzen und meldet „Alle gefunden!" |

**Einbauen:**
1. Im Editor: **Tools → New C++ Class** → als Parent einmal `Actor` (Name `MuenzePickup`) und
   einmal `GameModeBase` (Name `MuenzJagdGameMode`) anlegen — dadurch erzeugt UE die Projektdateien.
2. Die vier Dateien aus `quellcode/` über die erzeugten Dateien in `Source/MuenzJagd/` kopieren
   (Inhalt ersetzen). In beiden Dateien steht `MUENZJAGD_API` — heisst dein Projekt anders,
   das Makro entsprechend umbenennen (`<PROJEKTNAME>_API`).
3. In Visual Studio (oder Editor → Strg+Alt+F11 „Live Coding") **kompilieren**.
4. Editor: **World Settings → GameMode Override** = `MuenzJagdGameMode`.
5. Im Content-Browser `MuenzePickup` in die Welt ziehen (10–20 Stück verteilen).
   Jede Münze bekommt im Details-Panel unter „Muenze" ein **Static Mesh**
   (z. B. aus dem Starterinhalt: `Shape_Torus` oder `SM_ChamferCube`) und optional einen Sound.
6. ▶ Play: Münzen einsammeln, Zähler läuft im Log (und als Bildschirm-Meldung).

## Schritt 3 — HUD sichtbar machen (Blueprint, 10 Minuten)

1. Content-Browser → Rechtsklick → **User Interface → Widget Blueprint** → `WBP_HUD`.
2. Im Designer ein **Text**-Element oben links platzieren, „Bind" → neue Funktion:
   `GetGameMode → Cast to MuenzJagdGameMode → GezaehlteMuenzen` → zu Text verbinden
   (Format z. B. über „Append": `Münzen: {n}/{gesamt}`).
3. Level Blueprint (Toolbar → Blueprints → Open Level Blueprint):
   `Event BeginPlay → Create Widget (WBP_HUD) → Add to Viewport`.

## Schritt 4 — Aufs Handy? (ehrliche Einordnung)

UE5 exportiert **kein Browser-Spiel** mehr. Für dein Android-Handy heisst das: **APK bauen**
(Editor → Platforms → Android). Dafür braucht es einmalig Android Studio + SDK/NDK-Setup
(UE-Doku: „Android Quick Start") — das ist ein eigener Nachmittag. Empfehlung: erst auf dem
PC spielen/lernen; die Browser-Spiele (Traumhaus & Co.) bleiben der Handy-Weg.

## Wie es weitergeht

Melde einfach in einer Session: *„UE5: Schritt X hat geklappt / Fehler Y"* — dann liefert die
nächste Runde das nächste Paket (Gegner-KI, Timer & Highscore, eigenes Level, Speichern).
Roadmap-Idee für MuenzJagd: ⏱️ Zeitlimit → 🏃 Gegner, der dich jagt → 🏆 Highscore-Speicherung
→ 🌍 eigenes kleines Level mit Landscape-Tool → 📦 Verpacken als .exe für Freunde.
