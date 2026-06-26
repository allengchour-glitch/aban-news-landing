# 🎵 TikTok-Musik-Masterplan (gelernt + umgesetzt) — 2026-06-26

> User: „irgendwo tiktok musik lernen im youtube?" → 3 Tutorials via `yt_learn.mjs` gelernt, 3 KI-Agenten ausgewertet,
> mit offiziellen TikTok-Quellen abgeglichen. **Korrigiert unsere bisherige Musik-Regel.**

## 🧠 Die Wahrheit (endlich klar)
Unser Shop ist ein TikTok-**Business-Account**. Das ändert alles:

| | Personal-Account | **Business-Account (wir)** |
|---|---|---|
| Trend-Pop-Sounds | ✅ alle | ❌ gesperrt (Lizenz) |
| Musik-Quelle | ganzer Katalog | **Commercial Music Library (CML)** — 1M lizenzierte Songs |
| Eigene MP3 einbacken | ✅ | ✅ |

**Unsere alte Regel** („stumm hochladen, User legt Trend-Sound drauf") gilt **nur für Personal-Accounts** → korrigiert.

## 📊 Warum Sound Pflicht ist (Daten aus „Start with sound", TikTok/Kantar)
- **+72%** Stop-Rate, wenn die Ad Audio hat
- **+6%** Kaufabsicht · **+9%** Markenpräferenz mit Musik
- **Sound = 8×** mehr Markenerinnerung als Logo/Farben/Slogan
- **75%** verbinden sich besser mit Marken mit eigenem „Sonic-Branding"
→ **Stumme Ads underperformen. Nie stumm bewerben.**

## ✅ Unsere 3-Wege-Strategie (umgesetzt)
1. **TikTok-ADS (bezahlt):** Sound-On-Creative mit **eingebackener CC-BY-Musik** (Kevin MacLeod) →
   `automation/make_sound_ad.mjs`. Ad-Creative = `reels/seedance-wasserfest-sound.mp4` (in campaign-bridge/cmd-poll verdrahtet).
   *Alternativ:* in der TikTok-Ad-UI direkt einen CML-Track wählen.
2. **TikTok ORGANISCH (Business):** in-app **Commercial Sounds** nutzen; **Favoriten-Bibliothek** aufbauen —
   beim Feed-Scrollen Audio antippen: **lässt es sich favorisieren = lizenziert; gesperrt = nicht speicherbar** (eingebauter Filter!).
   Discover-Land = **Schweiz**. (Befehl `tiktok-sound` im cmd-poll postet bereits mit CML.)
3. **Meta (IG/FB):** eigene CC-BY-Musik einbacken (kein CML nötig) — wie bisher.

## 🛠️ Neue/genutzte Tools
- `automation/make_sound_ad.mjs --in <reel> [--mood elegant]` → Sound-On-Ad mit legaler Musik (getestet ✅).
- `automation/music/music_library.mjs` → Kevin-MacLeod-CC-BY-Katalog (Attribution automatisch).
- `cmd-poll` Befehl `tiktok-sound` → organischer Post mit TikTok-CML.

## ⚖️ Legal/CH
- CML = pre-cleared, royalty-free, schützt vor Takedowns. CC-BY (Kevin MacLeod) = kommerziell ok mit Attribution (`automation/music/CREDITS.md`).
- KEINE Trend-Pop-Sounds in Business-Content/Ads (Lizenz-Risiko, Takedown).

## ▶️ To-Do (User, 1×)
- Beim echten Ad-Launch: entweder das Sound-On-Creative nutzen (automatisch) **oder** in der Ad-UI einen aktuellen CML-Track wählen, der zur CH-Mode/Schmuck-Zielgruppe passt.
