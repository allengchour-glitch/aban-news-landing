# 🎬 TikTok-Upload-Plan (datenbasiert, 2026-06-11)

> Basis: Analyse aller 35 Profil-Videos (`reports/tiktok_luxestyle.ch_2026-06-11.md`).
> **Formel der Gewinner:** Nutzen-Hook → Produkt + PREIS → **Frage-CTA** (Kommentare!) → WELCOME10 →
> 5 Hashtags = 2 Reichweite (#schweiz/#foryou/#fyp) + 2 Nische + #luxestyle.
> **Beste Zeiten:** 11:00 oder 22:00 CH · auch Mi–So posten (bisher fast nur Mo/Di).
> **Repost-Entscheid:** KEINE 1:1-Reposts (Duplikat-Abwertung, Originale bleiben live) —
> stattdessen NEUE Clips im Gewinner-Stil (animierte Veo-Clips waren noch nie auf TikTok).

## Reihenfolge (1 Upload/Tag, je 1 Befehl in PowerShell)

**1. Brise (Bestseller-Kleid, animiert):**
```
python agent.py tiktok-upload "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/veo-hero-brise-2026-06-08.mp4?v=1781129159" --caption "Sommerkleid unter CHF 40 ☀️ Off-Shoulder «Brise» — welche Farbe wäre deins? Kommentier 👇 −10% Code WELCOME10 → luxestyle.ch #schweiz #foryou #sommerkleid #ootdschweiz #luxestyle"
```

**2. Sirène (Abendkleid, animiert):**
```
python agent.py tiktok-upload "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/veo-hero-sirene-2026-06-08.mp4?v=1781129173" --caption "CHF 49.90 statt Designer-Preis 👀 Abendkleid «Sirène» mit Schleppe — Wow oder zu viel? Sag's uns 👇 −10% WELCOME10 → luxestyle.ch #schweiz #fyp #abendkleid #eveninglook #luxestyle"
```

**3. Daisy (Polka-Dot, animiert):**
```
python agent.py tiktok-upload "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/veo-hero-daisy-2026-06-08.mp4?v=1781129167" --caption "Retro-Vibes für CHF 34.90 🎀 Polka-Dot «Daisy» — 1, 2 oder lieber schlicht? Kommentier 👇 −10% WELCOME10 → luxestyle.ch #schweiz #foryou #vintagestyle #sommerkleid #luxestyle"
```

**4. Nuit (Tasche, animiert):**
```
python agent.py tiktok-upload "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/veo-hero-nuit-2026-06-08.mp4?v=1781129187" --caption "Nur CHF 24.90 🌙 Crossbody «Nuit» im Vintage-Look — Braun, Schwarz oder Weiss? 👇 −10% WELCOME10 → luxestyle.ch #schweiz #fyp #handbag #aestheticfashion #luxestyle"
```

**5. Cosy (Cardigan, animiert):**
```
python agent.py tiktok-upload "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/veo-hero-cosy-2026-06-08.mp4?v=1781129181" --caption "Der perfekte Layer für laue Abende 🤍 Cardigan «Cosy» CHF 34.90 in vielen Farben — welche nimmst du? 👇 −10% WELCOME10 → luxestyle.ch #schweiz #foryou #cardigan #cozyoutfit #luxestyle"
```

> Tipp: Beim Upload in TikTok zusätzlich einen **Trend-Sound leise drüberlegen** (Commercial Music
> Library) — 3 der Top-7-Videos waren 60s-Clips mit Musik.

## 🗑️ Aufräum-Kandidaten (löschen via `python agent.py tiktok-delete <url> --confirm`)
| Grund | Views | URL |
|---|---:|---|
| bewirbt 3,54★-Sommerkleid (CHF 32) | 793 | https://www.tiktok.com/@luxestyle.ch/video/7646533327716879638 |
| Duplikat desselben Kleids | 57 | https://www.tiktok.com/@luxestyle.ch/video/7646534055915310358 |
| Müll-Caption „#EmClimaUltraLeve" | 50 | https://www.tiktok.com/@luxestyle.ch/video/7646671226676497686 |
| generischer Sammelpost, 22 Views | 22 | https://www.tiktok.com/@luxestyle.ch/video/7649344181550402838 |
| generischer Sammelpost, 31 Views | 31 | https://www.tiktok.com/@luxestyle.ch/video/7649335640634477846 |

> Beim Öffnen vor dem Löschen kurz prüfen, dass es wirklich das gemeinte Video ist (`--confirm` weglassen = Probelauf mit Screenshot).
