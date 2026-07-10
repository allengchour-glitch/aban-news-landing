# 🎹 LuxeStyle Music-Producer — SKILL (selbst erlernt 2026-07-10)

> Vollständige, 100% royalty-freie Musikproduktion im Container. Keine geklauten Samples
> (Content-ID-Sperre!) — alles selbst synthetisiert/aus GM. Gilt für JEDES Genre.

## Setup (ephemer, einmalig pro Container)
```
apt-get update && apt-get install -y --no-install-recommends fluidsynth fluid-soundfont-gm sox
pip install --break-system-packages numpy scipy
```
SoundFont: `/usr/share/sounds/sf2/FluidR3_GM.sf2`

## Pipeline
1. **Recherche (Skill-Kern):** Agent(en) analysieren ~10 echte Top-Hits des Genres → Bauplan
   (BPM, Struktur in Takten, Drum-Pattern im 16tel-Raster, Bass-Typ, Melodie-Träger, Mix-Ziel-LUFS).
2. **Komposition:** `build_<genre>_midi.py` — schreibt MIDI (Melodie/Harmonie/Bass via GM) + optional
   Spec-Dateien nach /tmp: `<genre>_drums.txt` (DSP-Drums), `<genre>_reese.txt` (Reese-Bass),
   `<genre>_fx.txt` (DJ-FX), `<genre>_kicks.txt` (Sidechain-Timing).
3. **Render:** `bash render.sh <genre> [OUT.wav]` (Env LUFS=-9 für Club). Macht: FluidSynth →
   DSP-Layer (reese_synth/drum_synth/fx_synth) → mixdown.py (Sidechain-Pump) → sox-Reverb → ffmpeg-Master.

## Bausteine (alle wiederverwendbar, genre-übergreifend)
- `reese_synth.py` — echter Reese-Bass: 3 verstimmte Saws (Detune 5-25¢) + Filter-LFO + Mono-Sub.
- `drum_synth.py` — echte DSP-Drums statt dünnem GM: kick/k808/snare(3-Layer:Body200Hz+Crack1.5-5kHz+Top)/
  ghost/clap/rim/perc/hat/ohat. Erweiterbar.
- `fx_synth.py` — DJ-FX: riser/impact/downsweep/revreverb (Riser-Ende exakt auf Drop-Downbeat).
- `mixdown.py` — Sidechain-Pump (Musik+Bass ducken im Kick-Takt), Drums+FX voll.

## Pro-Regeln (aus 10-Hit-Analyse, gelten für Liquid DnB / anpassen je Genre)
1. 174 BPM Half-Time-Feel, Moll, simple 2-4-Akkord-Progression (Extended: Am9/Cmaj7/Em7).
2. Musik nach vorn (Piano/Vocal), nicht die Drums. Vocals: langer Hall + Delay, gelayert.
3. Bass 3-teilig: Mono-Sub (<80Hz, Sinus, sidechain) + Reese (gefiltert) — Sub pausiert am Phrasenende.
4. Two-Step mit Betonung: Downbeat+Backbeat laut, Ghosts −6..−12dB leiser = Groove. Humanisieren (Micro-Timing).
5. Arrangement mit Raum: Intro→Build(Riser)→Drop→Breakdown→Drop2. FX-Übergänge (Riser/Impact/Rev-Reverb).
6. Master gegen LUFS-Referenz (DnB -9, Streaming normalisiert eh), TP -1.2, nicht überkomprimieren.

## Genres bisher (automation/music/)
luxe-liquid-dnb ✅(freigegeben) · luxe-cinematic-house · luxe-orchestra · luxe-lounge-sax · luxe-premium ·
luxe-hype-pro. NEUES Genre: Agent-Recherche → build_<genre>_midi.py → render.sh. Marken-Video:
ffmpeg Logo + showwaves-Waveform (vertikal 1080x1920) → YouTube.
