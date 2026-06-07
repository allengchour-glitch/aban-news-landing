# ✅ USER-CHECKLISTE — LuxeStyle Social-Maschine aktivieren

> **Zweck:** EINE Liste mit allem, was nur DU (im Browser/Admin) tun kannst, damit die autonome
> Content-Maschine (Bilder + Reels → Instagram/Facebook/Threads/TikTok, selbstlernend) scharf läuft.
> Alles Übrige ist gebaut, committet und no-op-safe — es wartet nur auf die Tokens/Klicks unten.
> Stand: 2026-06-07 · Fester Dropship-Branch `claude/luxestyle-product-CizQ6` (frühere SrAs5/LehDs sind in `main` gemergt).

---

## 🔴 A. Manuelle To-dos
- [ ] **1. `THREADS_ACCESS_TOKEN` als GitHub-Secret setzen** → Autopilot postet 2×/Tag von selbst.
      (Repo → Settings → Secrets and variables → Actions → New repository secret.)
- [ ] **2. Doppel-Facebook-Seiten löschen** — **nur „LuxeStyle CH" `1049840534888592` behalten**, die ABAN-Seite nicht.
- [ ] **3. PureMax-Reel auf Instagram löschen** (Altbestand, passt nicht zur Marke).
- [ ] **4. 🆕 TikTok-App-Audit beantragen** — IG+FB+Threads posten bereits automatisch; **TikTok ist technisch
      fertig & bewiesen** (Token ok, Reel gefunden, API akzeptiert), aber eine *nicht-auditierte* App darf nur auf
      **private** Konten posten — und ein Business-Konto kann nicht privat sein. → developers.tiktok.com → App
      „LuxeStyle Poster" → **Content Posting API → Review/Audit beantragen** (App-Beschreibung, Demo-Video,
      Datenschutz-URL). Nach Freigabe Repo-Variable `TT_PRIVACY_LEVEL` = `PUBLIC_TO_EVERYONE` → Cron postet öffentlich.

## ⏸️ B. Spam-Schutz
- [ ] Throttle aktiv (`MAX_PER_RUN=1`); nichts wird geballert. (Nur zur Info.)

---

## 🔑 C. Repo-Secrets für das Auto-Posting (Settings → Secrets → Actions)
**Meta (Instagram + Facebook + Threads) — für `social-meta-autopost.yml`:**
- [ ] `THREADS_ACCESS_TOKEN` + `THREADS_USER_ID`  → Threads
- [ ] `IG_USER_ID` + `IG_ACCESS_TOKEN` (oder gemeinsamer `META_ACCESS_TOKEN`)  → Instagram Business
- [ ] `FB_PAGE_ID` (= `1049840534888592`) + `FB_PAGE_ACCESS_TOKEN` (oder `META_ACCESS_TOKEN`)  → Facebook-Seite
- ℹ️ Token-Scopes: `instagram_basic, instagram_content_publish, pages_show_list, pages_manage_posts`.
- ℹ️ **Token-Lebensdauer:** Graph-Explorer-Tokens leben ~1-2h → „Erweiterten Token generieren" (60 Tage) oder System-User-Token.

**TikTok (Content Posting API v2) — für `tiktok-autopost.yml`:**
- [x] `TT_ACCESS_TOKEN` + `TT_REFRESH_TOKEN` + `TT_CLIENT_KEY` + `TT_CLIENT_SECRET` (gesetzt — Pipeline bewiesen)
- [ ] **Repo-Variable** `TT_PRIVACY_LEVEL`: aktuell `SELF_ONLY`; nach Audit (A.4) → `PUBLIC_TO_EVERYONE`.

**Gemini (Site-Kritik + Veo) — für `gemini-site-critique.yml` / `veo-hero-clip.yml`:**
- [x] `GEMINI_API_KEY` (gesetzt — Kritik-Pipeline läuft, postet Telegram-Digest + Report)

**Telegram (Tages-Digest 1×/Tag):**
- [ ] `TELEGRAM_BOT_TOKEN` (🔒 **bitte rotieren**, der alte wurde im Chat geteilt) + `TELEGRAM_CHAT_ID`

**Shopify (Crons — Client-Credentials der Custom-App):**
- [ ] `SHOPIFY_SHOP` = `au3j0y-hq.myshopify.com` · `SHOPIFY_CLIENT_ID` · `SHOPIFY_CLIENT_SECRET`

**Optional:**
- [ ] `JUDGEME_PRIVATE_TOKEN` + `JUDGEME_SHOP_DOMAIN=au3j0y-hq.myshopify.com` → echte Reviews (`reviews-import.mjs`).
- [ ] `YT_CLIENT_ID` / `YT_CLIENT_SECRET` / `YT_REFRESH_TOKEN` → YouTube-Shorts-Auto-Upload.

> Ohne Secrets passiert **nichts Schlimmes**: alle Workflows sind no-op-safe.

## 🚀 D. Aktivierung
- [ ] Geplante Actions laufen vom Default-Branch (`main`) — die Tools liegen dort.
- [ ] **GitHub Pages** muss den Repo-Root servieren (für `reels/` + `social/static/*.jpg`).

---

## 🧹 G. Collection-Aufräumen — 2-Min-Admin-Task (Unpublishing ist API-seitig gesperrt)
> Die MCP-API blockt `publishableUnpublish` (Sicherheitslayer). Bitte diese **toten/Archiv-/Dubletten-Collections
> im Admin unpublishen** (Verkaufskanäle → alle aus) — reduziert den Kategorie-Wildwuchs, den deine Freunde
> bemängelt haben. Admin → Produkte → Sammlungen → je Collection „Aus Verkaufskanälen entfernen" (oder löschen).
> **NICHT** die 8 Menü-Collections oder `sommer`/`sommer-2026` anfassen.
- [ ] `[ARCHIV] Pet & Tierbedarf` · `[ARCHIV] Fitness & Sport` · `[ARCHIV] Tech & Gadgets` (3 Archiv-Reste)
- [ ] `🔋 Auto-Power` (3) · `🍴 Küchengeräte` (2) · `Accessories` (2) · `Home & Gadgets` (3) · `🍽️ Servieren` (4)
- [ ] `👠 Damen-Schuhe` (3) · `👞 Herren-Schuhe` (2) · `Strand & Bademode` (4) · `Self-Care & Wellness` (2) · `Schule & Büro` (3)
- [ ] `US / Summer 2026` (6, deaktivierter US-Markt) · `🏡 Home & Family` (9, „für später reserviert")
- [ ] Redundante Mini-Bundles: `🎁 Premium-Bundles — Spare CHF 19+` (4) · `🎁 Wellness-Box Bundles` (4) → Dublette zu `Bundles & Sets` (254)

## 🎨 E. Shop-Feinschliff — nur Theme-Editor/Admin
- [ ] **Kachel-Bildverhältnis „square"** (`templates/index.json`, 4 Produkt-Sektionen).
- [ ] **Judge.me-Sterne auf Produktkacheln** aktivieren.
- [ ] **Sticky „In den Warenkorb"** (mobil).
- [ ] **Hero** auf Mode (Text + echtes Model-Bild).
- [ ] **AGB-/Policy-Domain** `aban-192.myshopify.com` → `luxestyle.ch` (Scope `write_legal_policies` fehlt mir).
- [ ] **Klaviyo-Flows**: `.com.co` → `.ch` in Live-Mails.
- [ ] **~34 Nur-1-Bild-Produkte** (jüngere Autopilot-Importe) → 2./3. Bild von CJ ergänzen (bessere Heroes).
- [ ] `aban news Founding-Member` (Produkt-ID `15420720808321`, 0 Bilder) gehört zum **abannews-Projekt** —
      prüfen, ob es im LuxeStyle-Shop sichtbar ist; falls ja, ausblenden.

## 📣 F. Reichweite (nur du — Werbekonto/Login)
- [ ] **TikTok-Pixel** aktiv + EINE saubere Kampagne („Complete Payment", CH/Frauen/18–34, 20 CHF/Tag testen).
- [ ] **App-Scopes** der Custom-App erweitern (`read_products`,`write_products`,`write_publications`,`write_collections`)
      → dann laufen SEO-/Rotations-/Health-**Crons** voll unbeaufsichtigt (in-Session geht es bereits via MCP).

---

## ✅ H. Autonom erledigt (Session 2026-06-07, live via Shopify-API)
- **Menü verschlankt:** 18 Top-Kategorien + ~50 Unterpunkte → **8 flache Kategorien** (kein Drop-down-Gewühl mehr).
- **13 echte Bild-Dubletten archiviert** (Re-Importe desselben CJ-Produkts; reversibel).
- **56 Kategorie-Collections mit SEO** (Title + Description) befüllt (vorher `seo:null`).
- **Bild-QA:** ganzer Katalog (519 Produkte) — **0 FAILED-Bilder**.
- **Gebaut & committet:** TikTok-Autopilot + OAuth-Helfer, Gemini-Site-Kritik-Pipeline, Veo-Hero-Clip-Generator.

## 🤖 Was bereits AUTONOM gebaut & committet ist (läuft, sobald C+D erledigt)
- **Meta-Autopilot** `automation/social-autopost-meta.mjs` — IG+FB+Threads ✅ getestet.
- **TikTok-Autopilot** `automation/tiktok-autopost.mjs` — wartet auf Audit (A.4).
- **Gemini-Site-Kritik** `automation/gemini-site-critique.mjs` (+ `gemini-site-critique.yml`) — wöchentlich, Desktop+Mobil.
- **Veo-Hero-Clip** `automation/veo-hero-clip.mjs` — on-demand cineastische 9:16-Clips.
- **Bild-Generator** `gen_post_image.py` · **Reel-Engine** (Dual-Export) · **Lern-Schleife** · **Tages-Digest** · **Rating-Lister**.
