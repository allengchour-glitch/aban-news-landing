# 💬 LuxeStyle — MAXIMUM AUTO-CHAT (User 2026-06-18 „chatresponder 100 apps montiere für maximum auto")

> Ziel: auf JEDEM Kanal automatisch antworten — gratis. Gemeinsame Brain: `automation/chat/responder.mjs`
> (zweisprachig DE/Mundart + EN, themen-erkennend, Spam/Verkäufer-Filter). Viele Comments sind englische
> Verkäufer → die werden gefiltert; echte EN-Kunden kriegen EN-Antwort, CH-Kunden Mundart.

## ✅ Läuft schon autonom (cloud, 0 Aufwand)
- **IG/FB-Kommentare:** Cloudflare-Worker, 6×/Tag, Cap 12, idempotent, Spam-Skip, zweisprachig. (aktiv nach `DEPLOY-WORKER`)

## 🔌 GRATIS-APPS zum „Montieren" (nach Aufwand/Impact) — das sind deine Anmeldungen
| App | Kanal | Gratis | Mounten |
|---|---|---|---|
| **Meta Business Suite** (hast du!) | IG/FB/WhatsApp **DMs** | ✅ nativ | „Posteingang → Automatisierungen → **Sofortantworten + FAQ**" einschalten = bestes, einfachstes Auto-DM |
| **ReplyRush** | Instagram DM | 1'500 DMs/Mt | replyrush.com – Konto + IG verbinden, Keyword→DM |
| **CreatorFlow** | Instagram DM | 500 DMs/Mt | creatorflow.so – Comment-to-DM-Flows |
| **Metricool Inbox** (verbunden ✅) | IG/FB/TikTok/Pinterest Kommentare+DMs | ✅ | 1 Inbox für alle – Saved Replies |
| **Shopify Inbox** | **Webseite-Chat** | ✅ gratis | App installieren → Auto-Begrüssung + Quick-Replies (Theme/du) |
| **AutoResponder.ai** | WhatsApp/IG (Android) | ✅ Tier | falls WhatsApp-Anfragen |

## 🛠️ Eigene Bots (PC-Browser, nutzen `responder.mjs`)
- **TikTok/IG DMs:** `automation/local/tiktok-dm-browser.mjs` / `ig-dm-browser.mjs`
- **tutti/anibis Käufer-Nachrichten:** baubar (`marktplatz-chat.mjs`) — sag Bescheid, dann bau ich's

## 🎯 Empfehlung fürs „Maximum" mit minimalem Aufwand
1. **Meta Business Suite → Sofortantworten + FAQ einschalten** (2 Min, deckt IG+FB-DMs nativ).
2. **Shopify Inbox** installieren (Webseite-Chat, gratis).
3. Worker läuft (Kommentare). Metricool als 1 Inbox für alles.
→ Damit antwortet auf **jedem** Kanal automatisch jemand — Kommentare (Worker) + DMs (Meta Suite) + Web (Shopify Inbox) + Rest (Metricool).
