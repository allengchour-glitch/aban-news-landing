# 🧰 LuxeStyle — FALLBACK-KATALOG („100 Möglichkeiten falls was nicht geht")

> User 2026-06-18: „100 andere Möglichkeiten falls was nicht geht." → Für JEDEN Blocker mehrere gratis Alternativen.
> Regel: nie hängenbleiben — nächste Option nehmen. Reihenfolge = empfohlen (robust → Notnagel).

## 1) PC-Bot / Browser-Automation klemmt (Listener/Worker/Brave/Git-Lock)
1. **Direkt-Start** (Gold): `node automation/local/<tool>.mjs` direkt am PC — kein git, kein Worker, kein Listener.
2. **VOLLAUTOMAT** (Windows-Task): `VOLLAUTOMAT-SETUP.bat` → läuft 5×/Tag direkt, kein KV/Listener/git-pull.
3. **Direkt-Starter-.bats**: `KAMPAGNE-DRY.bat`/`KAMPAGNE-GO.bat` (Brave-Port selbst, kein git).
4. **Git-Lock lösen**: `taskkill /F /IM powershell.exe & ... node.exe` → dann git; ODER frischer Klon; ODER git ganz umgehen.
5. **Worker-Queue** (`&cmd=`) nur wenn KV-Budget da; sonst meiden (KV-Limit).
6. **Handy-Promote/Manuell** als letzte Option.

## 2) Posten (IG/FB/TikTok) klemmt
1. **Cloudflare-Worker-Cron** (IG/FB, 11+19 CH) — läuft.
2. **VOLLAUTOMAT post-Modus** (TikTok-Upload direkt am PC).
3. **Meta Graph-API direkt** (`automation/*meta*`), Token vorausgesetzt.
4. **Manuell** in der App (Handy) · **Metricool/Buffer** Gratis-Plan · **Pinterest** (`pinterest_publish.mjs`).

## 3) TikTok-Kampagne starten
1. **Ads Manager manuell** (5 Min, sicher) — Specs in `PIXEL-STRATEGIE.md`.
2. **TikTok „Promote"** in der App (Handy, 2 Min, simpel).
3. **Bot** `tiktok-campaign-port.mjs` (wenn Konto-Onboarding fertig).
4. **Marketing-API** (später, App-Freigabe nötig).
5. **Spark Ad** aus bestem organischem Post (schlägt Studio-Creative).
6. **Neukunden-Ad-Credit** holen (verdoppelt Budget).
⚠️ Voraussetzung für alle: Werbekonto-Onboarding (Zahlungsdaten) abgeschlossen.

## 4) Video / Content
1. **ffmpeg-Builder** (persistiert in `automation/video/`): `build_wm_reel.py`, `build_hero_ad.py`, `build_jewelry_cinematic.py`, `build_montage*.py`, `assemble_*.py`.
2. **Stimme**: piper `/tmp/brand/kerstin.onnx` (Mundart/DE) — `VOICE_TEXT=… python3 build_wm_reel.py`.
3. **Luma** Bild→Video (`luma_autopilot.py`, Credits beachten).
4. **Text-Karten** (`gen_post_image.py`) · **manuell CapCut** als Notnagel.

## 5) Musik (alles legal/gratis)
1. **`automation/music/music_library.mjs pick --mood elegant|upbeat-pop|house`** (Kevin MacLeod CC-BY, Auto-Attribution).
2. **Fertige Tracks**: `luxe-hype-pro.mp3`, `luxe-house1/2.wav`, `luxe-hype1-3.wav`, `trend-luxe-*.wav`.
3. **MusicGen** (lokal, CC-BY-NC = NUR intern/Test, NIE Live-Ad) · **Suno** (PC, Gesang, Pro für Live-Ad).

## 6) KI-Text (nie Ausfall)
- **`automation/ai/ai_generate.mjs`**: groq→gemini→together→deepseek→openrouter→cloudflare→mistral→openai→**Template-Fallback**. Bricht nie.

## 7) Bilder
- **`automation/ai/image_gen.mjs`**: Pollinations (kein Key) → CF FLUX → HF.

## 8) Reichweite (gratis)
- Worker-Posting · VOLLAUTOMAT · Follower-Bot · **Influencer-Seeding** (`INFLUENCER-SEEDING.md`) · Pinterest · **tutti/anibis** (3/Tag) · FB-Gruppen · Google Free Listings · SEO.

## 9) Conversion (der eigentliche Engpass)
- **Reviews** über der Falz · **TWINT + Kauf-auf-Rechnung** · **Mobile-UX/Sticky-ATC** (69 % Traffic, 0,24 % ATC!) · **Klaviyo Abandoned-Cart** (live) · Trust-Badges.

## 10) Infrastruktur-Limits
- **KV-Limit (Worker)**: drain schreibt nur wenn nicht leer (gefixt) · weniger pollen · $5 Paid entfernt Limit · resettet täglich.
- **GitHub Actions gesperrt (kontoweit)**: → Cloudflare-Cron + lokaler Windows-Task statt Actions.
- **CJ/BigBuy 429 (Cloud-IP)**: vom PC laufen / inkrementell (10/Tag).

> Leitsatz: Erst die robusteste gratis Option, bei Blockade sofort die nächste. Lokaler Direkt-Start schlägt meist den Cloud-Umweg.
