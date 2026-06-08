# ABAN Files — TODO für den Abend (2026-06-07)

> Modus: **Analysieren + Videos kontinuierlich besser machen für mehr Reichweite** — keine Video-Masse.

## 🔑 NUR DU (kurze Klicks — schalten Reichweite/Analyse frei)
1. **`YT_API_KEY` als Repo-Secret** (5 Min) — *wichtigster Punkt für „analysieren".*
   GitHub → Repo `aban-news-landing` → Settings → Secrets and variables → Actions → New secret
   → Name `YT_API_KEY`, Wert = ein YouTube-Data-API-v3-Key (console.cloud.google.com, API aktivieren).
   → Dann liest der Director **echte Views + Abonnenten** statt zu schätzen.
2. **Sicherheit: Keys rotieren**, die heute im Chat standen:
   - ElevenLabs-Key (`XI`) in elevenlabs.io neu generieren.
   - Meta-Token + App-Geheimcode (Facebook-App „LuxeStyle Social") zurücksetzen.
   → danach nur noch als **Repo-Secrets** hinterlegen, nie im Chat.
3. **Optional `XI` + `PEXELS` als Repo-Secrets** → CI kann künftig selbst rendern (du musst nie mehr Keys schicken).
4. **Optional:** alte **Hasen-Lifestyle-Videos** in YouTube Studio löschen (Pipeline ist gestoppt, alte Videos noch online).
5. **Optional (IG/TikTok-Autopost):** frisches Meta-Token mit `instagram_content_publish` → dann poste ich LuxeStyle-Reels auch dorthin (separat vom YouTube/ABAN-Thema).

## 🇩🇪 DEUTSCHE UNTERTITEL (CC-Spur) — fertig erzeugt
- **19 deutsche `.srt`** liegen in `video-prototypes/aban-files/srt/` (ep1–18, ep20), getimt + via Gemini übersetzt.
- **Sofort für die Live-Videos (manuell, kein Scope nötig):** YouTube Studio → Video → **Untertitel →
  Deutsch hinzufügen → Datei hochladen** → die passende `srt/<ep>.de.srt`.
- **Automatisch für künftige Uploads:** einmal YouTube **neu autorisieren mit `youtube.force-ssl`-Scope**
  (breiteres Refresh-Token) → dann lädt der Cron die deutsche CC-Spur automatisch mit hoch (Code ist fertig).
- ep19/21–36 bekommen ihre SRT erst beim Re-Render (sonst Ton ≠ Untertitel).

## 🤖 LÄUFT AUTONOM (kein Klick nötig)
- ✅ **ABAN postet gespaced** (Cron 3×/Tag) — ep15 „THE GLITCH" geht gerade hoch, dann ep16, ep17 …
- ✅ **Director wertet alle 4 h aus** → `reports/ABAN-DIRECTOR.md` (Abonnenten-first, 30-Tage-Pivot).
- ✅ **Hasen-YouTube-Cron beendet.**

## 🎬 CHEF-AUFGABE NÄCHSTE SESSION (Analyse → 1 Verbesserung)
1. Zuerst `reports/ABAN-DIRECTOR.md` + `reports/ABAN-STATS.md` lesen.
2. Top-Performer vs. Abbrecher erkennen → **EINE** gezielte Verbesserung umsetzen
   (Hook-Stil, Caption, Schnitt-Tempo, Thumbnail/Titel, Thema).
3. Höchstens 1 verbesserte Muster-Folge zum Gegentest — **kein** Queue-Spam.
4. Nach **ElevenLabs-Quota-Reset**: ep19/21/22/23–36 nur nachrendern, wenn die Analyse es stützt.

## 📌 Stand-Notiz
- Neu & top (Gemini 9/10, ~50 s): ep15, ep16, ep17, ep18, ep20 — auf main, in der Upload-Queue.
- Renderer robust (Decode-Validierung, `-t total`, yuv420p) + Abo-first-Director — auf main (PR #328).
