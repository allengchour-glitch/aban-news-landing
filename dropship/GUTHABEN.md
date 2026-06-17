# 💰 LuxeStyle — Guthaben/Credits (haargnau, Stand 2026-06-17)

> User „mach e Liste, analysiere alles haargnau". Direkt per API geprüft = ✅. TikTok-Ad-Konten
> = nur im Ads Manager sichtbar (kein API) → per Browser-Tool `tiktok-credits-check.mjs` (PC).

## ✅ Direkt per API geprüft (exakt)
| Dienst | Guthaben | Bedeutung |
|---|---|---|
| **Luma** (Video) | **9'099 Credits** (~$90) | ~550 ray-flash-2-Clips → genug für SEHR viele Reels |
| **HeyGen** (Avatar) | **API 4** / Plan 1'065 | API-Credits fast leer → Avatar-Video erst nach API-Aufladung; Studio (16'500 Dashboard) geht im Webapp |
| **DeepSeek** (KI) | **$0.00** (leer) | erst nach Aufladen nutzbar; Router fällt auf Groq/Gemini |
| **OpenAI** (KI) | Key gültig, **Chat-Quota leer** (429) | nur Fallback |
| **Groq** (KI) | gratis-Tier, **live** | KI-Router #1 (kein Saldo nötig) |
| **Gemini** (KI+Vision) | gratis-Tier, **live** | KI #2 + Bild-Vision |

## 🟡 Nur im Dashboard/Ads Manager (kein API → Browser/PC)
| Dienst | Status |
|---|---|
| **TikTok Ads** | 2 Rechnungen (19.05. + 01.06., Beträge im PDF). **Mehrere Ad-Konten mit evtl. unterschiedlichem Guthaben/Coupons** — nur im Ads Manager sichtbar → `tiktok-credits-check.mjs`. Plus: gratis 30-Tage-Wachstumsprogramm angeboten (Rep Michael Wallrath, 3 Anrufe) → evtl. Ad-Guthaben. |
| **TikTok-Pixel** | D8EKVR3C77U6KT5BTBD0 aktiv (+ alte D8EQE4 / D85BAG ignorieren) |
| **BigBuy** | Token gültig, kein Credit-System (Quota-limitiert) |
| **Shopify / Cloudflare / Pinterest** | kein Credit (gratis-Tier / Token) |

## 👉 Nächster Schritt für TikTok-Konto-Guthaben
`tiktok-credits-check.mjs` (Brave-CDP) öffnet TikTok Ads Manager → Finanzen/Coupons jedes Kontos →
Screenshot ins Repo → Cloud-Claude liest die exakten Guthaben. Trigger: Handy `cmd=credits` oder PC.
