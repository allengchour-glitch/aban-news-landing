# ============================================================
#  GEHIRN-HACKS — Cinematic Clip Pipeline
#  Reproduzierbarer Build: XTTS-Daisy-Stimme -> Lip-Sync ->
#  Captions -> Kino-Render (Shots/DoF/Licht/IK-Figur).
#
#  Voraussetzung (einmalig):  make setup   (siehe XTTS-SETUP.md,
#  LIPSYNC-SETUP.md) — XTTS, openai-whisper, Rhubarb, ffmpeg.
#
#  Übliche Befehle:
#    make all              # Audio + alle 15 Clips
#    make audio            # nur Stimmen/Lip-Sync/Captions
#    make clips            # nur rendern (Audio muss existieren)
#    make clip-s6          # einen einzelnen Clip
#    make SCENES="s1 s2"   # Teilmenge
#    make schedule         # Redaktionsplan neu erzeugen
#    make clean            # Zwischenstände in /tmp aufräumen
# ============================================================

SCENES ?= s1 s2 s3 s4 s5 s6 s7 s8 s9 s10 s11 s12 s13 s14 s15
WORK   ?= /tmp
XI     ?= $(ELEVENLABS_API_KEY)          # ElevenLabs-Key (NICHT committen) via Umgebung
VOICE  ?= BswSp506E1rUw7uja1V5           # Mary Kai (deutsch, Social)
PY     ?= python3
S      := scripts

.PHONY: all audio clips schedule youtube shrink setup clean help
.DEFAULT_GOAL := help

## Audio + alle Clips
all: audio clips

## Stimmen (XTTS Daisy) + Rhubarb-Lip-Sync + Whisper-Captions für $(SCENES)
audio:
	cp sc_*.txt $(WORK)/
	XI=$(XI) VOICE=$(VOICE) $(PY) $(S)/eleven_pipeline.py $(SCENES)

## Alle Clips rendern, mit Ambiente veredeln und nach output/ kopieren (Audio muss da sein)
clips:
	@for k in $(SCENES); do \
	  echo ">>> render $$k"; \
	  $(PY) $(S)/anim_film.py $$k || { echo "FAILED $$k"; continue; }; \
	  bash $(S)/audio_dress.sh $$k; \
	  cp $(WORK)/clipdress_$$k.mp4 output/clipfilm_$$k.mp4; \
	done

## Einzelner Clip, z.B. make clip-s6
clip-%:
	$(PY) $(S)/anim_film.py $* && bash $(S)/audio_dress.sh $* && cp $(WORK)/clipdress_$*.mp4 output/clipfilm_$*.mp4

## Redaktionsplan (1 Video / 2 Tage) neu erzeugen
schedule:
	$(PY) scripts/make_schedule.py

## Direkt auf YouTube laden, terminiert laut schedule.csv (siehe YOUTUBE-UPLOAD.md)
youtube:
	$(PY) scripts/yt_upload.py

## Fertige Clips klein rendern (ffmpeg). 'make shrink' = ganzer output/-Ordner,
## 'make shrink-s6' = ein Clip, 'make shrink TARGET=8' = ~8 MB pro Clip.
shrink:
	$(PY) $(S)/shrink.py output $(if $(TARGET),--target-mb $(TARGET),) --suffix -small

shrink-%:
	$(PY) $(S)/shrink.py output/clipfilm_$*.mp4 $(if $(TARGET),--target-mb $(TARGET),)

## Hinweis auf die Setup-Dokumentation
setup:
	@echo "Siehe XTTS-SETUP.md und LIPSYNC-SETUP.md."
	@echo "Kurz: pip install TTS openai-whisper imageio imageio-ffmpeg pillow numpy torch"
	@echo "Rhubarb nach $(WORK)/rhubarb entpacken (Lip-Sync)."

## Zwischenstände aufräumen (Clips in output/ bleiben erhalten)
clean:
	rm -f $(WORK)/s*_raw.wav $(WORK)/s*_base.wav $(WORK)/clipfilm_s*.mp4

help:
	@grep -E '^##|^[a-zA-Z_-]+%?:' Makefile | sed 's/^## /  /; s/:.*//' | paste - - 2>/dev/null || \
	 grep -E '^##' Makefile | sed 's/^## /  /'
