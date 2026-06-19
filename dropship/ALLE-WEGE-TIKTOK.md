# 🧭 ALLE WEGE — TikTok & Social posten (User 2026-06-19 „alle Wege nicht vergessen")

> Zentrale Übersicht ALLER Pfade + Status + was jeder braucht. **NICHT den User wiederholt nach denselben
> Tokens fragen** — Stand steht hier. Reihenfolge = Zuverlässigkeit für ÖFFENTLICHE Posts.

## 🎵 TikTok (kein offizielles Public-API ohne Audit → mehrere Wege)
| # | Weg | Datei | Status | Was fehlt / Risiko |
|---|-----|-------|--------|--------------------|
| 1 | **PC-Brave (CDP 9222)** — Bot postet wie ein Mensch | `automation/local/tiktok-bot.mjs` / `tiktok-upload-browser.mjs` | ✅ funktioniert, **öffentlich**, kein Audit | Braucht **1× `START.bat`** am PC (PC an + TikTok eingeloggt). Danach Watchdog hält's am Leben. |
| 2 | **Browserbase Cloud-Browser** — kein PC | `automation/tiktok-cloud-autopost.mjs` + `tools/browser/agent_cloud.mjs` | ⚠️ eingerichtet, **läuft nicht** | (a) Runner war **GitHub Actions = gesperrt**. (b) Creds (`BROWSERBASE_API_KEY/PROJECT_ID/CONTEXT_ID`) sind GitHub-Secrets → **nicht in Cloud-Session**. **FIX:** die 3 als **ENV der Claude-Code-Umgebung** setzen → ich poste aus der Cloud. ⚠️ Gratis-Plan + Cloud-IP → TikTok-Captcha möglich (Residential-Proxy = bezahlt). |
| 3 | **Offizielle TikTok Content-Posting-API** | `automation/tiktok-autopost.mjs` + `tiktok-oauth.mjs` | ⚠️ Secrets gesetzt (GitHub), **SELF_ONLY** | Bis **App-Audit** (developers.tiktok.com → „LuxeStyle Poster" → Content Posting API → Review) nur **privat** → 1 Tipp „öffentlich" am Handy. Nach Audit: `TT_PRIVACY_LEVEL=PUBLIC_TO_EVERYONE` = voll auto. Runner = war GitHub Actions (tot). |
| 4 | **Metricool** (Gratis-Scheduler) | Dashboard/App | ✅ verbunden (TikTok+IG+FB+Pinterest) | Manuell/halb-auto über Metricool-Oberfläche; keine API-Creds hier. |
| 5 | **Worker-Befehlsqueue → PC-Listener** | Worker `&cmd=tiktok` → `pc-listener.ps1` | ⚙️ bereit | Funktioniert NUR wenn PC-Listener läuft (= Weg 1). Sonst stapeln sich Befehle. |

**Empfehlung:** Für **öffentlich-jetzt** = Weg 1 (1× START.bat) ODER Weg 2 (Creds in Umgebungs-ENV). Für **voll-auto-öffentlich ohne PC dauerhaft** = Weg 3 NACH App-Audit (der eine echte Schalter).

## 📣 Meta (IG + FB) — läuft schon aus der Cloud
| Weg | Status |
|-----|--------|
| **Cloudflare-Worker** (Cron 6×/Tag + Kommentar-Auto-Antwort) | ✅ LIVE, kein PC. Trigger: `…workers.dev/?key=…` |
| **Direkt Graph-API** (diese Session) | ✅ kann ich manuell auslösen (CDN-URL → /media bzw. /videos) |

## 📌 Pinterest
- Über **Metricool** (verbunden) ✅. Eigenes `pina_`-Token = App nicht freigegeben (consumer type) ❌. Bestehendes `pinterest-publish.yml` lief über GitHub Actions (tot).

## 🖼️ Inserate (tutti/anibis) + FB-Gruppen
- `automation/local/tutti-post.mjs` / `anibis-post.mjs` / `fb-group-post.mjs` — **nur PC-Brave** (Weg 1-Infrastruktur).

## 🧠 Grund-Wahrheit (merken, nicht neu diagnostizieren)
- **GitHub Actions ist kontoweit GESPERRT** → JEDER `.yml`-Cron ist tot (TikTok-Cloud, TikTok-API, Pinterest, Meta-Autopost-Workflows). Ersatz-Runner: **Cloudflare-Worker** (Meta) + **PC-Zeitpläne** (TikTok/Inserate) + **diese Cloud-Session** (wenn Creds in ENV).
- **Cloud-Session sieht keine GitHub-Secrets** → Creds, die ich nutzen soll, müssen in die **Umgebungs-ENV** oder werden gepastet.
- **Was nur der User kann:** PC `START.bat` (Weg 1), TikTok-App-Audit (Weg 3 public), Browserbase-Creds in Umgebungs-ENV (Weg 2), bezahlte Kampagne/Pixel.
