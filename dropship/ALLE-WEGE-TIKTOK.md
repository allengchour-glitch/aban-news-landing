# 🧭 ALLE WEGE — TikTok & Social posten (User 2026-06-19 „alle Wege nicht vergessen")

> Zentrale Übersicht ALLER Pfade + Status + was jeder braucht. **NICHT den User wiederholt nach denselben
> Tokens fragen** — Stand steht hier. Reihenfolge = Zuverlässigkeit für ÖFFENTLICHE Posts.

## ⏭️ NÄCHSTER SCHRITT (User 2026-06-19 Abend „schaue morgen, bin am Handy") — HIER weitermachen
**User-Entscheid (AskUserQuestion):** TikTok künftig ohne PC = **Weg 1 (offizielle TikTok-API, gratis, 1 Tap)
+ Weg 3 (PC als Voll-Auto-Backup)**. **NICHT** Browserbase-Paid (Option 2 abgelehnt, keine Mtl-Kosten).

**TikTok-API-OAuth hängt an EINER Sache: die Redirect-URI passt nicht.**
- Login-URL wurde erzeugt (PKCE, scope `user.info.basic,video.upload` = Drafts/Inbox = „1 Tap"), Client-Key `mn971u4o67rakuol`.
- Beim Autorisieren kam **`error=invalid_request&error_type=redirect_uri`** → `http://localhost:8723/callback`
  ist in der App **nicht hinterlegt**.
- **TODO morgen:** developers.tiktok.com → Manage apps → „LuxeStyle Poster" → Login Kit → **„Redirect URI"** prüfen.
  Entweder den dort eingetragenen Wert verwenden, ODER **`https://luxestyle.ch/`** eintragen+speichern.
  Dann Login-URL neu mit exakt diesem `redirect_uri` bauen → User autorisiert → kopiert `?code=...` aus der
  Adresszeile → **diese Cloud-Session tauscht Code→Token** (kein localhost-Server nötig, kein PC).
  Cloud-OAuth-Muster: PKCE-Verifier in `/tmp/tt_oauth.json` (ephemer → neu erzeugen), Token-Tausch
  `POST https://open.tiktokapis.com/v2/oauth/token/` mit client_key/secret/code/code_verifier/redirect_uri.
- Danach posten: `automation/tiktok-autopost.mjs` (Token in ENV `TT_ACCESS_TOKEN`/`TT_REFRESH_TOKEN`,
  NIE ins Repo) → Video landet in TikTok-Entwürfen → User tippt 1× „Posten".

**Browserbase (Weg 2) — getestet, Lehre festgehalten:** Keys gültig (Projekt „Production", Concurrency 3),
Context `f1689a15-1613-453b-bf9d-9ec1aa7f8b1a` angelegt, Login-Live-URL funktionierte. ABER **Gratis-Plan =
nur Rechenzentrums-IP** → Proxy gibt HTTP 402 → **TikTok behält die Anmeldung NICHT** (jede Session andere IP,
sofort ausgeloggt). Voll-Auto-TikTok via Browserbase ginge **nur mit Paid-Plan** (Residential-CH-Proxy,
`BB_PROXY=1`) — vom User abgelehnt. Context bleibt für IG/FB-Einzelaktionen nutzbar.

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
