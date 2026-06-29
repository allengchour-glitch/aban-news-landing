# 🔑 Was der User HAT — Inventar (User 2026-06-29 „merke dir das was ich habe")

⚠️ **NUR NAMEN — NIE Werte ins Repo.** Die echten Keys liegen in `%USERPROFILE%\luxe-secrets.ps1` (PC) bzw. `/opt/luxe/.env` (VPS).
Der Bot (`cmd-poll.ps1` → `Ensure-Campaign`) lädt sie aus **`luxe-secrets.ps1`** — Keys MÜSSEN dort stehen (nicht nur in `ikikk.txt`!).

## Vorhandene Keys (vom User bestätigt 2026-06-29, Screenshot ikikk.txt)
- **FAL_KEY** ✅ — fal.ai (Seedance Bild→Video, der KI-Dreh-Video-Weg)
- **GEMINI_API_KEY** ✅ — Nano-Banana (Hero-Hintergründe) + Vision-QA
- **ELEVENLABS_API_KEY** ✅ — Stimme (Bettina, viel besser als piper) [Key 2026-06-29 geliefert]
- **LUMA_API_KEY** ✅ — Luma (Alternative Bild→Video; früher 403, Key neu da)
- **MESHY_API_KEY** ✅ — Meshy (3D-Modelle)
- **GROQ_API_KEY** ✅ · **DEEPSEEK_API_KEY** ✅ — Text/Caption-KI (Router-Fallbacks)
- **META_ACCESS_TOKEN** — IG/FB (Scopes prüfen: pages_manage_posts fehlte mal)
- **TT_CLIENT_KEY/SECRET/ACCESS_TOKEN/REFRESH_TOKEN** — TikTok Content-Posting (Reels hochladen)
- **SHOPIFY_CLIENT_ID/SECRET** — Admin-API (client_credentials)
- ⚠️ Noch NICHT gesehen: TikTok **Marketing**-API-Token (TT_MKT_TOKEN) — für API-Kampagnen (anderer als Content-Posting).

→ Damit ist der **komplette KI-Video-Stack fahrbar**: GEMINI (BG) + FAL/Seedance (Dreh) + ELEVENLABS (Stimme). Voraussetzung: alle 3 in `luxe-secrets.ps1`.

## Video-Lehre (TikTok Smart+ Upload, 2026-06-29)
- Bot kann Video per `setInputFiles` selbst hochladen (Reel aus dem Repo, PC hat es via git).
- ⚠️ `luma-test-wasserfest-9x16.mp4` → TikTok meldet **„Fehlgeschlagen — Optimierung erforderlich"** (Specs passen nicht ganz).
  Fix: Im Upload-Dialog Haken **„Fehlgeschlagene Videos optimieren"** an + **„Hochladen"** → TikTok optimiert selbst.
  Besser: Reels vor Upload auf TikTok-Specs bringen (≥720p, H.264, korrekte Bitrate) ODER ein bereits TikTok-konformes Reel nehmen.

## Ad-Stand (Smart+ Formular, 2026-06-29)
Bot füllt autonom: Sammlung (wasserfester-schmuck), Identität=**aban**, Optimierung=**Kauf**, Budget **30** (TikTok-Min, 15 abgelehnt), Anzeigentext (Mundart), Video-Upload.
**„Senden" = echtes Geld = NUR User** (Sicherheitsfilter blockt Auto-Geld korrekt — User-Regel „Sicherheitsfilter NIE umgehen").
