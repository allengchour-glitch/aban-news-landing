# 🔐 System- & Login-Check — 2026-06-26 (User: "checke alles ab mit welche login")

## 1) Was läuft WO (Architektur)
| Läufer | Wann | Macht | Braucht PC an? |
|---|---|---|---|
| **VPS-Cron** (Hetzner) | täglich 04:00 + Poller alle 10 Min | API-Jobs: SEO, Feed, **Reader, Ad-Entscheid, CAPI**, Pixel-Check, Trend-Scan | ❌ nein (24/7) |
| **Cloudflare-Worker** | Cron 12/17/21 CH | **IG + FB posten** (Meta Graph-API) | ❌ nein (24/7) |
| **PC (cmd-poll)** | wenn PC an | Browser-Tasks: TikTok-Upload, Follower, Ad-Bot | ✅ ja |
| **Cloud-Session (ich)** | wenn du mich pingst | Code, Memory, Shopify-API, Lernen | – |

## 2) Logins / Accounts — Status
| Login | Wofür | Wo gespeichert | Status |
|---|---|---|---|
| **Shopify** (Custom-App, client_credentials) | Shop steuern (Produkte/Collections/Orders/Metafelder) | `/opt/luxe/.env` + PC `luxe-secrets.ps1` + meine MCP | ✅ **funktioniert** |
| **Meta** (IG + FB Graph-API) | IG/FB-Posting (Worker) | Cloudflare-Worker (wrangler secrets) + PC | ✅ läuft (Worker postet) |
| **TikTok** | Posten/Ads | **Browser-Login im PC-Brave** (Port 9222) | ⚠️ **nur Browser** — keine Marketing-API (Business-Verifizierung) |
| **TikTok Pixel** D8EKVR3C77U6KT5BTBD0 | Conversion-Tracking | Storefront (live) | ✅ feuert |
| **TikTok Events-API** Token `d0a7…` | Server-Tracking (CAPI) | gehört in `/opt/luxe/.env` als `TT_EVENTS_API_TOKEN` | ⏳ Token da, noch nicht in .env |
| **AI-Keys** Gemini/Groq/DeepSeek/xAI | Content-Gen + Browser-AI | `/opt/luxe/.env` (heute ergänzt) + PC | ✅ da |
| **Tailscale** (VPS↔PC) | VPS steuert PC-Brave | beide Geräte | ✅ verbunden |
| **Telegram** Bot | Benachrichtigungen | secrets | (optional) |

## 3) Was 24/7 OHNE dich läuft ✅
- VPS: SEO/Feed/Reader/Ad-Entscheid/CAPI/Pixel-Check (Cron)
- Worker: IG + FB Posting (Meta-API)
- Shopify-Mutationen (API)

## 4) Was den PC braucht (Browser-IP) ⚠️
- **TikTok**-Upload/Ads/Follower (Datacenter-IP wird geblockt → nur PC-Wohn-IP)
- → PC an + `CLOUD-AN.bat` = diese Tasks laufen; PC aus = sie warten

## 5) Ehrliche Lücken / offen
1. **TikTok-Ad live** = der eine fehlende Schritt. Bot-Weg erschöpft (Stagehand/OpenAI). **Realistisch: Shopify-App Smart+** (5 Min, du).
2. **Events-API-Token** noch nicht in `/opt/luxe/.env` (greift eh erst bei Käufen).
3. **Geister-Pixel** D8EQE4 + D85BAG in TikTok löschen (kosmetisch).
4. **Daily-Cron lief 04:00** vor meinem neuen Code → das volle neue Pipeline (Reader/Ad-Entscheid/CAPI) läuft **morgen 04:00** automatisch (oder ich queue es jetzt).

## Fazit
**Backend ist robust & grösstenteils 24/7-autonom.** Der einzige echte Engpass für die erste Ad ist ein **TikTok-Login-Schritt, den nur du/der PC physisch kann** — alles andere läuft per API/Worker ohne dich.
