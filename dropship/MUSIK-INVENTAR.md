# 🎵 LuxeStyle — MUSIK-INVENTAR (geprüft 2026-06-18, damit nichts „vergessen" wird)

> User „du hast Musik-Apps vergessen". Hier der GEPRÜFTE Ist-Stand — was WIRKLICH da ist vs. nur Option.

## ✅ WIRKLICH installiert / vorhanden
- **fluidsynth** + SoundFonts (`FluidR3_GM.sf2`, `default-GM.sf2`) → GM-Synth. ⚠️ Klingt „billig" (User-Kritik). Nur Fallback.
- **sox**, **ffmpeg** → Audio-Schnitt/Mix.
- **`automation/music/music_library.mjs`** → Katalog **Kevin MacLeod (CC-BY 4.0)**, instrumental, kommerziell-frei, Auto-Attribution. Moods: cinematic/elegant/house/lofi/upbeat-pop. (User findet's etwas dated, aber LEGAL für Live-Ads.)
- **Fertige Tracks** in `automation/music/`: `luxe-hype-pro.mp3`, `luxe-house1/2.wav`, `luxe-hype1-3.wav`, `trend-luxe-*.wav`.
- Generatoren: `make_signature_track.py`, `make_trend_tracks.py` (fluidsynth-basiert, = der „billige" Sound).

## ❌ NICHT installiert / NICHT vorhanden (nur als Option besprochen)
- **Pixabay** — KEIN API-Key, KEINE Integration im Repo. (Pixabay-Musik = nur manueller Download, keine saubere API.)
- **Suno** — KEINE Anbindung. Nur als `--engine suno`-Doku (PC-Brave-Port, gratis Konto; Live-Ad bräuchte Pro). NICHT aktiv.
- **MusicGen / AudioCraft** — NICHT installiert (kein audiocraft-Paket). Wäre eh CC-BY-NC = nur intern/Test, nie Live-Ad.

## 🎯 Realistische Wege zu GUTER, gratis+legaler Musik
1. **TikTok = stumm hochladen, Trend-Sound IN DER APP drauf' legen** (gratis, legal, bester Reach). = bestehende Reel-Sound-Regel.
2. **IG/FB-Reels:** kommerziell-freie Musik einbacken — bestes Gratis = **Kevin MacLeod (music_library)** ODER über einen **Gratis-Scheduler/Editor mit eigener Commercial-Library** (Metricool/CapCut).
3. **Katalog aufwerten:** moderne CC0/CC-BY-Tracks (z.B. von Free Music Archive) manuell in `catalog.json` ergänzen (To-do).
4. **Suno PC** (gratis Konto, modern + Gesang) nur über PC-Browser; für Live-Ad Suno Pro.

> Fazit: Es gibt KEINE installierte „moderne Musik-App". Der legale Gratis-Standard ist Kevin MacLeod (Backing) +
> TikTok-In-App-Trend-Sounds. Für modern/Gesang braucht's Suno (PC) oder bezahlt.
