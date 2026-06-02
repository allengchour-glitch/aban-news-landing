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
PY     ?= python3
S      := scripts

.PHONY: all audio clips schedule youtube setup clean help
.DEFAULT_GOAL := help

## Audio + alle Clips
all: audio clips

## Stimmen (XTTS Daisy) + Rhubarb-Lip-Sync + Whisper-Captions für $(SCENES)
audio:
	cp sc_*.txt $(WORK)/
	$(PY) $(S)/pipeline_xtts.py $(SCENES)

## Alle Clips rendern und nach output/ kopieren (Audio muss da sein)
clips:
	@for k in $(SCENES); do \
	  echo ">>> render $$k"; \
	  $(PY) $(S)/anim_film.py $$k || { echo "FAILED $$k"; continue; }; \
	  cp $(WORK)/clipfilm_$$k.mp4 output/; \
	done

## Einzelner Clip, z.B. make clip-s6
clip-%:
	$(PY) $(S)/anim_film.py $* && cp $(WORK)/clipfilm_$*.mp4 output/

## Redaktionsplan (1 Video / 2 Tage) neu erzeugen
schedule:
	$(PY) scripts/make_schedule.py

## Direkt auf YouTube laden, terminiert laut schedule.csv (siehe YOUTUBE-UPLOAD.md)
youtube:
	$(PY) scripts/yt_upload.py

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
