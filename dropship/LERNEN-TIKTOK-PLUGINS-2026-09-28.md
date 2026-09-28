# «Claude 5 besten Plugins» — TikTok @sebastiankauffmann (Betreiber-Link 28.09.2026)

Quelle: https://www.tiktok.com/@sebastiankauffmann/video/7687330842636537121 (64 s, 1'145 Likes), gelesen über den
Hetzner-Server (Cloud-Proxy + WebFetch blocken tiktok.com): Caption, deutsche ASR-Untertitel, 13 Standbilder
(`auftraege/ergebnis/tiktok-plugins-20260928-*.png`, Skript `automation/browser/tiktok_video_lesen.mjs`).
Marken: GEMESSEN = hier geprüft · QUELLE = Video/Katalog · BEHAUPTUNG = Werbeaussage ohne Beleg.
Hinweis: Das Video endet mit «schreib Plugin in die Kommentare» — Lead-Magnet des Creators (Skill «recherchieren»).

| # | Plugin | Was es laut Video tut | Marke | Im Anthropic-Plugin-Verzeichnis? | Nutzen für LuxeStyle |
|---|---|---|---|---|---|
| 1 | oh-my-claudecode (Yeachan-Heo) | «19 Agenten» planen/bauen/prüfen | QUELLE (Folie: 39'130 Sterne) | nein (GEMESSEN, SearchPlugins) | gering — Workflow-/Agent-Werkzeuge sind hier schon eingebaut |
| 2 | graphify (Graphify-Labs) | Wissensgraph des Projekts, «bis 70 % weniger Token» | Sterne QUELLE, 70 % BEHAUPTUNG | nein | mittel — Repo hat `tools/gedaechtnis.py` + Vault; ein Graph über ~2'000 Skripte könnte Doppelbau verhindern, erst messen |
| 3 | «das SEO-Plugin» (im Video nicht benannt) | «Website bei Google ganz oben» | BEHAUPTUNG | mehrere SEO-Plugins vorhanden (SearchFit SEO, SEO-AEO-GEO Ultimate, SEO GSC Wizard — alle community) | mittel — Google-Gratis-Einträge sind der einzige Kanal mit Verkäufen; Semrush-Konnektor ist schon verbunden |
| 4 | Superpowers (obra / Jesse Vincent) | strukturiertes Arbeitssystem (brainstorm → plan → execute, TDD, Verifikation) | QUELLE (250'000 Sterne laut Video); im Verzeichnis als «partner» | ja, v6.4.1, mit **SessionStart-Hook** (privileged) | fraglich — der Hook lädt «using-superpowers» in jede Sitzung; «brainstorming» stellt Rückfragen → kann die autonomen Routinen (Keepalive, 4-h-Runde) anhalten |
| 5 | hyperframes | Motion Graphics / Animationen, «schneidet komplette Videos» | QUELLE | nein | am interessantesten für «jeder Post ein Meisterwerk» (Reels mit animierten Preis-/Faktenkarten statt ffmpeg-Overlay) — braucht eigene Prüfung (Lizenz, Chromium-Render, Takt) |

Empfehlung (nicht installiert — Plugins mit Hooks laufen in jeder Sitzung mit, Betreiber-Entscheid):
1. **hyperframes zuerst prüfen** (Nutzen für die Reel-Qualität), in einer Probe ausserhalb der Poster.
2. SEO: kein Plugin nötig, solange Semrush + eigene Wächter laufen; ein GSC-Plugin wäre nur mit Search-Console-Zugang sinnvoll.
3. Superpowers nicht in dieser autonomen Umgebung (SessionStart-Hook + Rückfrage-Skills).
