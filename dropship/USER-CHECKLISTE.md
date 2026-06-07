# ✅ USER-CHECKLISTE — LuxeStyle Social-Maschine aktivieren

> **Zweck:** EINE Liste mit allem, was nur DU (im Browser/Admin) tun kannst, damit die autonome
> Content-Maschine (Bilder + Reels → Instagram/Facebook/Threads/TikTok, selbstlernend) scharf läuft.
> Alles Übrige ist gebaut, committet und no-op-safe — es wartet nur auf die Tokens/Klicks unten.
> Stand: 2026-06-06 · Branch `claude/dropshipping-session-LehDs`.

---

## 🔴 A. Die 3 manuellen To-dos (aus dem Memory)
- [ ] **1. `THREADS_ACCESS_TOKEN` als GitHub-Secret setzen** → Autopilot postet 2×/Tag von selbst.
      (Repo → Settings → Secrets and variables → Actions → New repository secret.)
- [ ] **2. Doppel-Facebook-Seiten löschen** — **nur „LuxeStyle CH" `1049840534888592` behalten**, die ABAN-Seite nicht.
- [ ] **3. PureMax-Reel auf Instagram löschen** (Altbestand, passt nicht zur Marke).

## ⏸️ B. Heute drosseln (Spam-Schutz)
- [ ] Heute wurde schon viel gepostet → **erster automatischer Live-Lauf erst morgen.** Der Autopilot
      hat einen Throttle (`MAX_PER_RUN=1`); nichts wird geballert. (Nichts zu tun, nur zur Info.)

---

## 🔑 C. Repo-Secrets für das Auto-Posting (Settings → Secrets → Actions)
**Meta (Instagram + Facebook + Threads) — für `social-meta-autopost.yml`:**
- [ ] `THREADS_ACCESS_TOKEN` + `THREADS_USER_ID`  → Threads
- [ ] `IG_USER_ID` + `IG_ACCESS_TOKEN` (oder gemeinsamer `META_ACCESS_TOKEN`)  → Instagram Business
- [ ] `FB_PAGE_ID` (= `1049840534888592`) + `FB_PAGE_ACCESS_TOKEN` (oder `META_ACCESS_TOKEN`)  → Facebook-Seite
- ⚠️ **VERIFIZIERT 2026-06-07:** IG + Threads posten live OK; **FB schlägt mit nur `META_ACCESS_TOKEN` fehl**
      (`403 (#200) publish_actions deprecated`). FB braucht zwingend einen **Page-Token mit `pages_manage_posts`**
      als `FB_PAGE_ACCESS_TOKEN` (User-Token reicht NICHT). TikTok-Bildposts gehen NICHT über diesen Workflow.
- ℹ️ Token-Scopes: `instagram_basic, instagram_content_publish, pages_show_list, pages_manage_posts`.
      IG muss **Business/Creator** + mit der FB-Seite verbunden sein. Entwicklungsmodus reicht fürs eigene Konto.

**Telegram (Tages-Digest 1×/Tag) — für `reel-analytics.yml`:**
- [ ] `TELEGRAM_BOT_TOKEN` (🔒 **bitte rotieren**, der alte wurde im Chat geteilt) + `TELEGRAM_CHAT_ID`

**TikTok (Content Posting API v2) — `tiktok-autopost.yml` (Reels/Video, FILE_UPLOAD):**
- Tool + App **fertig** (App „LuxeStyle Poster", ID `7644952871552960533`). ⚠️ **Test 07.06.: noch No-op — `TT_ACCESS_TOKEN`
  ist NICHT gesetzt.** D. h. die **4 Token-Secrets fehlen noch** (der „erfolgreiche" Lauf 06.06. war ein leerer No-op).
- **So holst du den Token (App existiert schon, nur autorisieren):**
  1. In der App: **Content Posting API** + **Login Kit** aktiv, Scope **`video.publish`**; **Client key/secret** notieren; Redirect-URI eintragen.
  2. Browser: `https://www.tiktok.com/v2/auth/authorize/?client_key=<KEY>&scope=video.publish&response_type=code&redirect_uri=<REDIRECT>&state=x` → zustimmen → `code` aus Adresszeile kopieren.
  3. `curl -X POST https://open.tiktokapis.com/v2/oauth/token/ -d "client_key=<KEY>&client_secret=<SECRET>&code=<CODE>&grant_type=authorization_code&redirect_uri=<REDIRECT>"` → liefert `access_token` + `refresh_token`.
- [ ] **4 Secrets setzen:** `TT_ACCESS_TOKEN` (24h), `TT_REFRESH_TOKEN`, `TT_CLIENT_KEY`, `TT_CLIENT_SECRET` (für Auto-Refresh).
  ⚠️ `TT_ACCESS_TOKEN` muss gesetzt sein — das Skript refresht nur, wenn ein Access-Token vorhanden ist.
- [ ] **Repo-Variable** `TT_PRIVACY_LEVEL`: bis App-Audit **`SELF_ONLY`** (nur du) → nach Audit **`PUBLIC_TO_EVERYONE`**.
- [ ] Optional PAT **`REPO_ADMIN_PAT`** (`secrets: write`) → Workflow persistiert rotierte Tokens selbst.
- ℹ️ Postet **Reels** aus `reels_seed.csv` (Video, FILE_UPLOAD → **keine Domain-Verifizierung nötig**). Für öffentliche Posts zusätzlich **App-Audit**.

**Shopify (Kennzahlen im Digest + Rating-Lister) — Client-Credentials der Custom-App:**
- [ ] `SHOPIFY_SHOP` = `au3j0y-hq.myshopify.com` · `SHOPIFY_CLIENT_ID` · `SHOPIFY_CLIENT_SECRET`

**Optional:**
- [ ] `JUDGEME_PRIVATE_TOKEN` + `JUDGEME_SHOP_DOMAIN=au3j0y-hq.myshopify.com` → echte Reviews importieren (`reviews-import.mjs`).
- [ ] `YT_CLIENT_ID` / `YT_CLIENT_SECRET` / `YT_REFRESH_TOKEN` → YouTube-Shorts-Auto-Upload (Tool existiert).

> Ohne Secrets passiert **nichts Schlimmes**: alle Workflows sind no-op-safe (sauberer Leerlauf).

## 🚀 D. Aktivierung (damit der Cron überhaupt läuft)
- 🛠️ **Queue pflegen:** `node automation/social-queue.mjs status|add|add-product|requeue`
      (Bild-Posts einfach einreihen/erneut einreihen — schreibt `social/posts_image.csv`).
- [ ] **Branch nach `main` mergen** (PR). Geplante GitHub Actions laufen NUR vom Default-Branch.
- [ ] **GitHub Pages** muss den Repo-Root servieren (tut es bereits für `reels/`). Die Post-Bilder liegen
      unter `social/static/*.jpg` und sind dann öffentlich als `https://abannews.com/social/static/…` (Meta-JPG-Pflicht ✅).

---

## 🎨 E. Shop-Feinschliff — nur im Theme-Editor/Admin lösbar (Katalog bleibt unangetastet)
- [ ] **Kachel-Bildverhältnis** auf **„square"**: `templates/index.json`, alle 4 Produkt-Sektionen
      (`Top10`, `CJ Neuheiten`, `Highlights`, `Bestseller`) haben `image_ratio:"adapt"` → ungleiche Kacheln.
- [ ] **Judge.me-Sterne auf den Produktkacheln** aktivieren (Judge.me → Settings → Widgets → Collection/Home).
- [ ] **Sticky „In den Warenkorb"-Button** (mobil) — Theme-Produkt-Template oder App.
- [ ] **Hero** auf Mode ausrichten (Text „Sommer-Mode 2026 …" + echtes Model-Bild statt Platzhalter).
- [ ] **AGB-/Policy-Domain** `aban-192.myshopify.com` → `luxestyle.ch` (Admin → Einstellungen → Richtlinien;
      mir fehlt der Scope `write_legal_policies`).
- [ ] **Klaviyo-Flows**: ggf. `.com.co` → `.ch` in Live-Mails ersetzen (Flow-Editor).

## 📣 F. Reichweite (nur du — Werbekonto/Login)
- [ ] **TikTok-Pixel** prüfen/aktiv halten + EINE saubere Kampagne (Ziel „Complete Payment",
      CH/Frauen/18–34, Budget erst **20 CHF/Tag** testen). Destination `luxestyle.ch/collections/sommer`,
      Ad-Texte ohne Emoji, Musik aus der **Commercial Music Library**.
- [ ] **App-Scopes** der Custom-App erweitern (`read_products`,`write_products`,`write_publications`,`write_collections`),
      App neu installieren → dann laufen SEO-/Rotations-/Health-Tools voll unbeaufsichtigt.

---

## 🤖 Was bereits AUTONOM gebaut & committet ist (läuft, sobald C+D erledigt)
- **Meta-Autopilot** `automation/social-autopost-meta.mjs` (+ Workflow 2×/Tag) — IG+FB+Threads, JPG-Pflicht, Throttle.
- **Bild-Generator** `automation/gen_post_image.py` (+ `image-render.yml`) — 5 Marken-JPGs/Tag (1080×1350 & 1080×1080).
- **Reel-Engine** mit **Dual-Export** (Musik-Version für FB/Ads + `-clean.mp4` tonarm für Trend-Sound in TikTok/IG).
- **Selbst-Lern-Schleife** `automation/learn_from_analytics.mjs` (+ `analytics-learn.yml`) — TikTok-Daten → beste Hashtags.
- **Tages-Digest** `reel-analytics.mjs` — 1×/Tag Telegram (Shop-Zahlen + Queue + Tagesreel).
- **Rating-Lister** `automation/list_by_rating.mjs` + **Reviews-Import** `automation/reviews-import.mjs` (≥4★).
