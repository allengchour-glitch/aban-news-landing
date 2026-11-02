# 🎬 Video-Präferenzen — LuxeStyle (FEST, vom User 2026-06-12)

> Diese Regeln gelten für ALLE Marken-/Marketing-Videos (Reels, TikTok, FB/IG). Bei jeder neuen
> Session ZUERST lesen und befolgen. Geändert nur auf ausdrücklichen User-Wunsch.

## Standing Rules
1. **Stimme: seit 2.11.2026 erlaubt und erwünscht (Besitzer: «mit Hochdeutsch … gesprochene Stimme»), vorher galt «KEIN Voiceover» (12.6.2026).**
   Hochdeutsch (nicht Mundart), kurze Sätze (≤ 160 Zeichen, ≈ 8 s), keine Preise, Rabatte, Lieferzeiten, Bewertungen oder Versprechen.
   Stimme lokal und gratis mit Piper (`SPRECHER=…` in `dropship/reel-vorlage/reel_karte.sh`, Vorgabe `de_DE-thorsten-high`, Alternative `de_DE-ramona-low`);
   die Musik duckt unter der Stimme. On-screen-Text bleibt zusätzlich. Ältere Marken-Videos (`*-text.mp4`) bleiben stumm.
2. **Musik rotiert, nie zweimal hintereinander dasselbe Stück, und kommt von Mixkit** (Besitzer 2.11.2026: «kann man andere Musik nehmen … nie das gleiche»,
   danach «die selbst gemachte ist das Schrecklichste … nimm von irgendwo lieber»; löst die Festlegung auf `luxe-premium.wav` ab). Wahl:
   `dropship/reel-vorlage/musik_waehlen.sh` (fünf Mixkit-Stücke, Lizenz ohne Namensnennung, Log `dropship/reel-vorlage/musik-log.txt`).
   **Keine selbst synthetisierten `luxe-*`-Stücke mehr in Reels.** Kevin-MacLeod-Stücke (CC BY) nur mit Quellenangabe in der Caption.
3. **Text statt `%`** in ffmpeg-`drawtext` → „PROZENT" schreiben (sonst unsichtbar). Keine Emoji in `drawtext`
   (fehlen in DejaVu → leere Kästchen); Emoji nur in Captions.
4. **Render-Outputs IMMER nach `reels/` kopieren**, bevor man sie sendet/postet (sonst hängt der Download).
5. **Captions:** IG = „Link in Bio" (keine klickbaren Links); FB = Link ok. Ehrliche Claims (weltweiter
   Versand 8–14 Tage, kein „Swiss made").

## Aktiver Stand (2026-06-12)
- Marken-Video: `reels/luxestyle-brand-{60s,30s}-text.mp4` (kein VO, Premium-Musik) = bevorzugt.
  Die `-mann.mp4`/`*.mp4`-Stimmen-Varianten existieren noch, werden aber NICHT mehr für neue Posts genutzt.
- Schmuck-TikTok: `reels/luxestyle-schmuck-tiktok.mp4` (Text + Hype-Beat) → 13.06. auf IG+FB eingeplant.
