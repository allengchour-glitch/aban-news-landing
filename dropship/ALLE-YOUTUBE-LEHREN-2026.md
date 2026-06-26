# 📺 ALLE YouTube-Lehren (geprüft mit yt_learn.mjs + KI-Agenten) — 2026-06-26

> Alle vom User geschickten Links durchgelernt (Transkript via `yt-dlp`, je 1 KI-Agent zur Auswertung).
> Ehrliche Verdikte — nicht alles taugt für uns.

| Video | Kanal | Verdikt | Was wir übernehmen |
|---|---|---|---|
| **$1.1M mit Claude Code AI Ads** | Ecom with Simo | ✅ **GOLD** | Ad-Test-Formel (Kill/Scale) → `ad_manager.mjs`; 4 Angles/Winner; ≥5-Live-Ads-Research; 70% Marge |
| **Google AI Studio (gratis Funnel)** | iampauljames | 🟡 Pilot | Gemini baut gratis Landing-Pages + Klaviyo-Mails (CH/Mundart). Nicht vor Reviews. |
| **Seedance 2.0 in 4K** | Julian Ivanov | 🟡 übernommen | Kurze EN-Ad-Prompts, „no music", Produkt-Sheet-Referenz (Original-Foto) → in `seedance_video.mjs` |
| **Grok & Flow (gratis Video)** | BigWiz Media | 🔴 verworfen | Paid-Extensions, Lizenz unklar (Ad-Risiko), 16:9 falsch. Nur Charakter-Tagging-Idee. |
| **Seedance 2.5 & 4K** | Dan Kieft | 🟡 warten | 2.5 erst Anfang Juli, teurer. 720/1080p reicht für TikTok. Nach Launch fal.ai-IDs prüfen. |

## ✅ Was ich SOFORT umgesetzt habe (dieser Session)
1. **`automation/ad_manager.mjs`** — Simo-Kill/Scale-Formel automatisiert: liest echte Zahlen + Verkäufe → STOP/KEEP/SCALE → Metafeld `luxe.ad_decision`. Getestet (4 Szenarien korrekt). Im VPS-Cron.
2. **`automation/vps/campaign-bridge.sh`** — baut das saubere Top-Ad **vom VPS aus** im PC-Brave (Tailscale). DRY = sicher (Screenshots), `GO=1` = real (70-CHF-Cap).
3. **`automation/seedance_video.mjs`** — Default-Prompt auf kurze Ad-Keywords + „no music" umgestellt (Julian-Lehre).
4. **`automation/yt_learn.mjs`** — YouTube-Lernen für jede Session (yt-dlp-Transkript).
5. **Gehirn: 342 Regeln** (alle 5 Videos verankert).

## 🎯 Die Ad-Test-Formel (Herzstück, CHF)
Start **30/Tag, 1 Adset**. `ad_manager.mjs` entscheidet automatisch:
- 10 Spend: CPC>1 & 0 Warenkorb → **STOP**
- 20 Spend: 0 Warenkorb → **STOP**
- 30 Spend: 0 Verkauf → **STOP** · 1+ Verkauf → Tag 2 bis 60
- 60 Spend: <2 Verkäufe → **STOP** · ≥2 → **KEEP**
- Netto-Profit >20% → **SCALE** (Budget verdoppeln)

⚠️ ATC (Warenkorb) sieht man nur in TikTok Ads → der VPS-Reader liefert das nach (`ADS_ATC=`).

## 🟡 Nächste Experimente (geplant, nicht Prio vor Reviews)
- Gemini-Gratis-Landing-Page als schneller Mobile-Lander für eine TikTok-Kampagne (A/B vs. Shopify-Collection).
- Produkt-Sheet-Referenzbilder für konsistentere Seedance-Reels.
