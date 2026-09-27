# Musik-Proben — NICHT in Rotation, bis der Betreiber «gut» sagt

- ✅ `epic-anime-vidiq1.wav` (27.09.2026, FREIGEGEBEN → automation/music/luxe-epic-anime.wav) — vidIQ `vidiq_generate_music` (25 Credits, lizenzfrei laut Anbieter),
  Prompt: episches Anime-Opening, Fiedel + Tin Whistle, E-Gitarren, Live-Drums, Orchester, ~165 BPM, instrumental.
  Anlass: Betreiber zu den GM-SoundFont-Stücken «hört sich beschissen an … nimm instrumente wie top sounds».
  Blinder A/B gegen luxe-anime-opening (eigene GM-Produktion): vidIQ gewinnt (8.5/10). Gemastert −12.9 LUFS, −1.4 dBTP.
  Nach Freigabe: nach automation/music/ verschieben, in CREDITS.txt (ORIGINAL, ~BPM) eintragen, einstiege.py, Pools.
- ❌ `house-mixkit-juni.wav` (Betreiber 27.09.: «house ist besser geworden aber passt mir nicht» → NICHT in Rotation) (27.09.2026 aus dem alten Memory geholt) — `dropship/ads/ad_music.mp3`, Commit 0b0eeb3e2 (08.06.2026):
  «lizenzfreier House-Track (Mixkit, kommerziell frei)», Titel unbekannt, 288 s. Original −9.4 LUFS / +3.2 dBTP → gemastert
  −13.4 LUFS / −1.2 dBTP. Beste 11-s-Fenster ab 174.25 / 188.5 / 161.5 s. mixkit.co ist von der Cloud aus gesperrt (Proxy 403).
- 27.09.2026 vier weitere vidIQ-Stücke (100 Credits, Rest 15), aufgenommen mit `produce/musik_aufnehmen.py --probe`, Hörprobe
  4 × 12 s an den Betreiber: 1 `luxe-anime-battle` (~174 BPM) · 2 `luxe-adventure-uplift` (Schätzung ~185, Prompt 140 — vor
  Rotation Tempo prüfen) · 3 `luxe-fashion-elegant` (~120, für Beauty/Schmuck) · 4 `luxe-celtic-rock` (~160).
  Freigabe → `python3 produce/musik_aufnehmen.py _probe/<name>.wav <name> "<beschreibung>" [--bpm N]` (ohne --probe) + Pools.
