# ABAN Files — Gewinner-Analyse (YouTube Shorts)

> Datenbasiert aus den Kanal-Aufrufen (Stand 2026-06-08, User-Screenshots). Ziel: das
> **Format**, das funktioniert, statt blind weiterzuposten. Wird per `automation/aban_yt_stats.mjs`
> (+ Workflow) automatisch fortgeschrieben — Wiederholung in ~2 Tagen.

## Befund: nicht die Menge, das FORMAT entscheidet
**Gewinner (viele Aufrufe) — echte Menschen / reale, warme Footage:**
| Aufrufe | Clip |
|--:|---|
| **1.527** | Bauarbeiter (Warnweste/Helm) — echte Menschen, Alltag |
| **605** | Geiger auf der Straße — echter Mensch, warm |
| **250** | Roboter „It is a quarantine" |
| 116 | „ground, fleshlings" |
| 37 | Statuen („learns the version") |

**Flops — dunkle, gesichtslose KI-Sci-Fi/Conspiracy (das ABAN-Files-Standardformat):**
„your flag" 3 · „on this planet" 5 · „dark, and taught them" 4 · „report to ours" 4 ·
„a warning you failed" 4 · „understand. Every data center" 8 · „knocking" 2 · „explanation" 7 …
→ fast alle **2–8 Aufrufe**, viele neue **0**.

**Spanne: ~200× Unterschied** zwischen dem besten und den typischen Clips.

## Das Muster (was die Gewinner gemeinsam haben)
1. **Ein Mensch / ein echtes Gesicht** im Bild — kein abstrakter Render.
2. **Warmes, reales Footage** (Tageslicht, Alltag) statt dunkler, kühler KI-Sci-Fi-Optik.
3. **Greifbares, menschliches Thema** (Arbeit, Musik) statt abstrakter Verschwörung.
4. Hook bleibt wichtig — aber hier entscheidet sichtbar der **Bild-Stil** in den ersten 1–2 s.

## Empfehlung
- **Dunklen Conspiracy-KI-Stil zurückfahren** (er performt messbar nicht; Auto-Cron pausiert).
- **Nächste Videos im Gewinner-Muster:** echte Menschen, warm, alltäglich/relatable, Gesicht im ersten Frame.
- **Direkt übertragbar auf LuxeStyle:** echte Mode/Menschen-Footage (wie die 1527/605-Clips), kein abstrakter KI-Look — passt zum Shop und zu dem, was hier nachweislich Reichweite holt.

## Methodik / Wiederholung
`automation/aban_yt_stats.mjs` zieht per YouTube Data API (`YT_API_KEY`) die `viewCount` zu allen
IDs aus `video-prototypes/aban-files/video_ids.json`, verknüpft Titel/Hook aus `aban_scripts.json`
und schreibt `reports/aban-yt-stats-<datum>.md` (sortiert). Workflow `aban-yt-stats.yml` läuft
**täglich** → damit ist „in 2 Tagen nochmal" automatisch abgedeckt; Trend (wächst der Gewinner-Stil?) wird sichtbar.
