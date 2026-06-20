# 🧭 ALLE WEGE — TikTok & Social posten (User 2026-06-19 „alle Wege nicht vergessen")

> Zentrale Übersicht ALLER Pfade + Status + was jeder braucht. **NICHT den User wiederholt nach denselben
> Tokens fragen** — Stand steht hier. Reihenfolge = Zuverlässigkeit für ÖFFENTLICHE Posts.

## ✅✅ TIKTOK-API LÖSUNG GEFUNDEN (2026-06-20) — App „luxe" (NICHT die Mini-Drama-App!)
**Es gibt eine ZWEITE, RICHTIGE App: „luxe"** (Web/Desktop-Typ, „Owned by you"). DIE nehmen wir für Content-Posting.
Die Mini-Drama-App „LuxeStyle Poster" bleibt unbrauchbar (siehe 🛑 unten) — NICHT verwechseln.

**App „luxe" — funktionierende Konfiguration (verifiziert, OAuth läuft):**
- **App ID:** `7648584035840903189`
- **Production Client key:** `awhvghmn5q2oh91i` — ⚠️ Production ist **Draft/pending** → OAuth gibt `unauthorized_client` → **NICHT Production nutzen**, bis App veröffentlicht/auditiert.
- **➡️ SANDBOX nutzen (funktioniert SOFORT für eigenes Konto):**
  - **Sandbox „luxe-sandbox" Client key:** `sbawgg40q8nkfuwl5k`
  - **Sandbox Client secret:** ⚠️ **NIE ins Repo** — gehört in `luxe-secrets.ps1`/ENV als `TT_CLIENT_SECRET` (bzw. transient gepastet).
  - **Target User:** `luxestyle.ch` ist im Sandbox registriert (seit 7.6.2026) ✅
  - **Products:** Login Kit + Content Posting API beide hinzugefügt ✅ · **Scopes:** user.info.basic, video.upload, video.publish ✅
  - **Platforms:** Web **UND** Desktop angehakt ✅ (Web war der fehlende Haken — ohne Web → `unauthorized_client/client_key`)
  - **Redirect URI (Sandbox):** exakt `https://luxestyle.ch/` (war fälschlich abannews.com → korrigiert) ✅
- **OAuth-Flow (Cloud, kein PC, kein localhost-Server):**
  1. Authorize-URL bauen: `https://www.tiktok.com/v2/auth/authorize/` mit `client_key=sbawgg40q8nkfuwl5k`,
     `scope=user.info.basic,video.upload`, `response_type=code`, `redirect_uri=https://luxestyle.ch/`,
     `state`, `code_challenge` (PKCE S256), `code_challenge_method=S256`. PKCE-Verifier merken (`/tmp/tt_oauth_sb.json`, ephemer).
  2. User öffnet URL (am Handy, eingeloggt) → „Autorisieren" → landet auf `https://luxestyle.ch/?code=…` → kopiert den `code`.
  3. **Token-Tausch** (Cloud): `POST https://open.tiktokapis.com/v2/oauth/token/` form-urlencoded mit
     `client_key=sbawgg40q8nkfuwl5k`, **`client_secret=<Sandbox-Secret aus ENV>`**, `code` (URL-DECODEN! %21→!),
     `grant_type=authorization_code`, `redirect_uri=https://luxestyle.ch/`, `code_verifier=<verifier>`.
     → access_token + refresh_token. ⚠️ Code ist nur ~Minuten gültig → sofort tauschen.
  4. **Posten:** `automation/tiktok-autopost.mjs` bzw. Content Posting API (PULL_FROM_URL mit CDN-Video).
     Unaudited Sandbox = **SELF_ONLY** → Video landet privat/Entwurf → User tippt 1× „öffentlich". (Das war der akzeptierte „1-Tap"-Weg.)
- **Lehre/Reihenfolge der Fehler (nicht neu diagnostizieren):** `redirect_uri`-Error = URI nicht/anders registriert ·
  `unauthorized_client/client_key` = (a) Web-Plattform fehlt ODER (b) Production-Draft → Sandbox nutzen ·
  `invalid_client` = falsches Secret zum Key (Sandbox-Key braucht Sandbox-Secret) · `invalid_request malformed` = Param/Secret fehlt.

## 🛑 KRITISCH (User 2026-06-20, mit Browser-Claude VERIFIZIERT): die App „LuxeStyle Poster" ist FALSCHER TYP
**Die bestehende App ist eine „Mini Drama"-App** (URL `developers.tiktok.com/portal/**drama**/7644952871552960533/…`).
Beweis im Portal: Security-Tab sagt **„Mini dramas on TikTok will only support requests to the trusted domains"**.
→ **KEIN Login Kit, KEIN Content Posting API, KEINE Redirect-URI** — nur „Trusted domains" (Domains OHNE Pfad/Wildcard)
+ Webhooks. **Darum kam `error_type=redirect_uri`: das Produkt existiert gar nicht.** Client-Key `mn971u4o67rakuol`
gehört zu DIESER Drama-App → **für Content-Posting UNBRAUCHBAR.**
- ⚠️ **NICHTS an dieser App ändern** — v.a. NICHT „Trusted domains" `https://luxestyle.ch/` anfassen, und **kein
  Pfad** wie `…/tiktok/callback` eintragen (Portal lehnt ab: „cannot include paths"). Webhook-Callback gibt 404 (egal).
- **Für die offizielle API braucht es eine NEUE App** (Typ **Web/Desktop**, nicht Drama) mit den Produkten
  **Login Kit + Content Posting API**. Content-Posting ist bis **App-Audit** nur **SELF_ONLY** (privat/Drafts → 1-Tap-Publish).
  Das ist Aufwand (neue App + ggf. Review) → **mit User abstimmen, NICHT eigenmächtig eine neue App anlegen.**

**STATUS TikTok-ohne-PC = derzeit KEIN gratis Sofort-Weg:**
- Weg „offizielle API" (1-Tap) = blockiert (App falscher Typ, neue App nötig).
- Weg „Browserbase Cloud-Browser" = scheitert auf Gratis-Plan (Rechenzentrums-IP: Login hält nicht / Session 410 / Google-Login
  blockt / QR kommt nicht durch — 3× live getestet 2026-06-20). Nur mit **Paid-Plan** (Residential-Proxy) — vom User abgelehnt.
- **→ Zuverlässig HEUTE nur: Weg 3 = PC** (Brave eingeloggt, ASCII-gefixte Skripte posten automatisch). ODER später neue API-App.
**User-Entscheid stand auf „API(1-Tap)+PC" — die API-Hälfte ist bis neue App vertagt; bis dahin trägt der PC.**

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
