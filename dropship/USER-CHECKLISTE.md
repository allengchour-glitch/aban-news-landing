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
- ℹ️ Token-Scopes: `instagram_basic, instagram_content_publish, pages_show_list, pages_manage_posts`.
      IG muss **Business/Creator** + mit der FB-Seite verbunden sein. Entwicklungsmodus reicht fürs eigene Konto.

**TikTok (Content Posting API v2) — für `tiktok-autopost.yml`:**
- [ ] `TT_ACCESS_TOKEN` (Pflicht — gültig 24h)
- [ ] `TT_REFRESH_TOKEN` + `TT_CLIENT_KEY` + `TT_CLIENT_SECRET` (optional, aber dringend empfohlen → Auto-Refresh)
- [ ] **Repo-Variable** `TT_PRIVACY_LEVEL` (Settings → Variables): bis zur App-Review **`SELF_ONLY`** (nur du siehst es),
      danach **`PUBLIC_TO_EVERYONE`**.
- ℹ️ **Setup:**
      1. TikTok for Developers → eigene App anlegen (Business/Creator).
      2. Scopes: `user.info.basic`, `video.upload`, `video.publish` (letzteres erst nach Audit aktiv).
      3. OAuth-Flow durchlaufen → `access_token` + `refresh_token` aus der Antwort kopieren.
      4. Optional: PAT mit `secrets:write` als `REPO_ADMIN_PAT` setzen, damit der Workflow die rotierten Tokens
         nach jedem Refresh selbst zurückschreibt (sonst muss `TT_ACCESS_TOKEN` alle 24h neu gesetzt werden).
- ℹ️ **Sandbox-Modus:** Solange die App nicht auditiert ist, landet jedes Video nur in deinem Profil
      (`SELF_ONLY`) — perfekt zum stillen Testen. Nach Audit Variable auf `PUBLIC_TO_EVERYONE` umstellen.

**Telegram (Tages-Digest 1×/Tag) — für `reel-analytics.yml`:**
- [ ] `TELEGRAM_BOT_TOKEN` (🔒 **bitte rotieren**, der alte wurde im Chat geteilt) + `TELEGRAM_CHAT_ID`

**Shopify (Kennzahlen im Digest + Rating-Lister) — Client-Credentials der Custom-App:**
- [ ] `SHOPIFY_SHOP` = `au3j0y-hq.myshopify.com` · `SHOPIFY_CLIENT_ID` · `SHOPIFY_CLIENT_SECRET`

**Optional:**
- [ ] `JUDGEME_PRIVATE_TOKEN` + `JUDGEME_SHOP_DOMAIN=au3j0y-hq.myshopify.com` → echte Reviews importieren (`reviews-import.mjs`).
- [ ] `YT_CLIENT_ID` / `YT_CLIENT_SECRET` / `YT_REFRESH_TOKEN` → YouTube-Shorts-Auto-Upload (Tool existiert).

> Ohne Secrets passiert **nichts Schlimmes**: alle Workflows sind no-op-safe (sauberer Leerlauf).

## 🚀 D. Aktivierung (damit der Cron überhaupt läuft)
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
- **TikTok-Autopilot** `automation/tiktok-autopost.mjs` (+ Workflow 1×/Tag) — Content Posting API v2, FILE_UPLOAD,
  Auto-Refresh, Sandbox-tauglich (SELF_ONLY bis Audit).
- **Bild-Generator** `automation/gen_post_image.py` (+ `image-render.yml`) — 5 Marken-JPGs/Tag (1080×1350 & 1080×1080).
- **Reel-Engine** mit **Dual-Export** (Musik-Version für FB/Ads + `-clean.mp4` tonarm für Trend-Sound in TikTok/IG).
- **Selbst-Lern-Schleife** `automation/learn_from_analytics.mjs` (+ `analytics-learn.yml`) — TikTok-Daten → beste Hashtags.
- **Tages-Digest** `reel-analytics.mjs` — 1×/Tag Telegram (Shop-Zahlen + Queue + Tagesreel).
- **Rating-Lister** `automation/list_by_rating.mjs` + **Reviews-Import** `automation/reviews-import.mjs` (≥4★).
