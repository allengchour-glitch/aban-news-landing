# 🔗 SHARED-MEMORY — Koordination aller Claude-Sessions (zuerst lesen!)

> **Mehrere Sessions arbeiten parallel auf DIESEM Repo (`allengchour-glitch/aban-news-landing`)
> UND demselben Shopify-Shop (LuxeStyle, `au3j0y-hq.myshopify.com` / luxestyle.ch).**
> Diese Datei verhindert, dass sie sich gegenseitig überschreiben. **Jede Session:** erst hier rein,
> dann die eigene Detail-Memory. **Nach grösseren Aktionen:** Abschnitt „Live-Stand" unten aktualisieren.
> Stand: 2026-06-08.

---

## 👥 Die Sessions & wem was „gehört" (Konflikte vermeiden)
| Session | Aufgabe | Detail-Memory | Branch |
|---|---|---|---|
| **abannews** | Newsletter/Hubs/Stripe-Shop auf abannews.com (KI-Content, GEO-Reports) | `PROJEKT.md` | eigene `claude/*` |
| **Luxestyle product** (CJ-Dropship) | CJ-Produktimport, Shop-Katalog, Social-Posten, Autopilot | `CLAUDE.md` + `dropship/*` | **`claude/luxestyle-product-CizQ6`** |
| **Dropshipping session** | (überschneidet sich mit ↑ — bitte abstimmen!) | `dropship/*` | — |
| **Lifestyle video project** | Reels/Clips/Video (braucht `YT_API_KEY`) | `video-prototypes/*`, `mediakit/*` | eigene |

> ⚠️ **Wichtigste Regel:** **CJ-Produktimport + Shop-Katalog + Social-Queue = nur die „Luxestyle product"-Session.**
> Andere Sessions: keine Produkte importieren / keine `social/posts_image.csv` ändern, sonst Dubletten/Konflikte.

## 🧱 Geteilte Ressourcen (alle teilen sich diese!)
- **1 Shopify-Shop** (LuxeStyle) — Zugriff über die **Shopify-MCP** (direkt in jeder Session, KEIN Key nötig).
- **1 Repo**, **1 `main`** → vor jedem Push `git pull --rebase`; **nie zwei Sessions gleichzeitig nach `main`**.
- **`social/posts_image.csv`** = Post-Queue (der Autopost-Bot committet sie auf `main`).
- **Bildpipeline** `automation/gen_image_gemini.py` (Vertex) ist für alle nutzbar.

## 🔑 Secrets-Status (geteilt — Stand 2026-06-08)
| Secret | Status |
|---|---|
| `GEMINI_API_KEY` | ✅ gesetzt (Billing aktiv) — KI-Bilder via Action |
| Meta (IG/FB/Threads) | ✅ gesetzt — Social-Posten läuft |
| `SHOPIFY_SHOP` + `SHOPIFY_CLIENT_ID/SECRET` | ✅ GESETZT (10.06.) — Autopilot/edited-product-images laufen |
| `CJ_EMAIL` + `CJ_API_KEY` | ❌ als Repo-Secret offen (in-Session vorhanden) |
| TikTok | ⏳ Reel-Autopost GEBAUT (FILE_UPLOAD, kein Domain-Verify) — fehlen nur 4 Secrets: TT_CLIENT_KEY/SECRET/ACCESS_TOKEN/REFRESH_TOKEN. Anleitung: `dropship/TIKTOK-AUTOPOST-AKTIVIEREN.md` |
| `YT_API_KEY` | ❌ offen (Video-Session) |
> Hinweis: Für Shopify-Arbeit **braucht keine Session einen Key** — das geht über die MCP. Keys nur für die Cron-Actions.

---

## 📊 LIVE-STAND (von jeder Session nach Aktionen aktualisieren)
**2026-06-11 — REPO IST JETZT PUBLIC (User-Entscheid) → Actions wieder gratis/unbegrenzt:**
- **🔓 `aban-news-landing` ist PUBLIC** (vorher privat). Grund: **Actions-Minuten waren an EINEM Tag
  aufgebraucht** (~3000 Min) → alle Cron-Jobs + Dispatches scheiterten beim Start (kein Runner, 0 Steps).
  Public = unbegrenzte Gratis-Actions → **alles läuft wieder.** Secret-Scan vor dem Umstellen: **sauber**
  (keine Klartext-Tokens im Code; GitHub-Secrets bleiben verschlüsselt/privat auch bei public). User: Buch +
  Strategie öffentlich = „egal".
- **⚠️ URSACHE der Minuten-Explosion (bitte beheben!):** **139 Workflows** im Repo. Die abannews-Session
  committet quasi pausenlos → jeder Push triggert viele `on: push`-Workflows (Content-Engine, Radars, Märkte,
  Gemini-Jobs). **→ abannews-Session sollte drosseln** (Path-Filter, weniger push-Trigger, Commits bündeln),
  sonst bleibt's ineffizient (jetzt zwar gratis, aber langsam/Queue). LuxeStyle-Workflows sind leicht (paar/Tag).
- **📈 NÄCHSTES (diese Session):** IG-Analyse mit echten Zahlen (ig-analyze.yml, läuft jetzt) → Captions/Hooks
  weiter schärfen. Caption-Gewinner-Formel ist schon live (queue_new_products.mjs + learned_pools.sh).

**2026-06-11 — Luxestyle product session (Browser-Agent + TikTok-Analyse + Autonom-Ausbau):**
- **🤖 BROWSER-AGENT LIVE (lokal, Brave):** `tools/browser/agent.py` läuft auf User-PC über Brave (Heim-IP,
  IG/TikTok blocken nicht). IG **+** TikTok eingeloggt (`~/.luxe-browser/*.json`). Befehle: login·check·
  ig-delete·tiktok-delete·**list**·**tiktok-upload**. Windows-Anleitung `tools/browser/WINDOWS-BRAVE-QUICKSTART.md`.
- **☁️ CLOUD-AGENT (Browserbase) = Fernsteuerung ohne PC:** Secrets `BROWSERBASE_API_KEY/PROJECT_ID/CONTEXT_ID`
  gesetzt. `agent_cloud.mjs` (context-create·login-start·login-release·check·ig/tiktok-delete·**tiktok-upload**)
  + Workflow `browser-action.yml` (Dispatch). **⚠️ IG-Login im Cloud-Context schlug fehl (Rechenzentrums-IP
  geblockt → /accounts/login).** Residential-Proxy nur mit BEZAHLTEM Browserbase-Plan (`BB_PROXY=1`). TikTok-
  Cloud-Login offen (gleiche Block-Gefahr — testen). Gratis-Plan-Fallback = lokaler Brave-Agent.
- **🎬 AUTONOME TIKTOK-MASCHINE gebaut:** `social/tiktok_queue.csv` (5 Veo-Clips, Gewinner-Captions) +
  `automation/tiktok-cloud-autopost.mjs` + Cron `tiktok-cloud-autopost.yml` (tägl. 09:40 UTC) → fährt den
  Cloud-Agenten. **Läuft hands-off, SOBALD TikTok im Browserbase-Context eingeloggt ist + die Cloud-IP nicht
  geblockt wird.** Sonst: Uploads lokal per Brave (`dropship/TIKTOK-UPLOAD-PLAN.md`).
- **💬 KOMMENTAR-AUTO-ANTWORT LIVE (Cloud):** `social-comment-reply.mjs` + Cron 3×/Tag → antwortet auf echte
  IG/FB-Kommentare (herzlich, Frage-/Preis-/Versand-Erkennung, Spam-Skip, dedup). Hands-off.
- **📊 TIKTOK-ANALYSE (35 Videos, 10'766 Views):** `reports/tiktok_luxestyle.ch_2026-06-11.md`. Gewinner =
  PREIS in Caption + Lifestyle-Hook + Reichweiten-Tags (#schweiz Ø572/#foryou Ø598/#fyp Ø458). Schwäche:
  Engagement <1% (kein CTA). → **Gewinner-Formel in `automation/learned_pools.sh`** (Frage-CTA + Preis + 2 Reach-
  + 2 Nischen-Tags) speist `auto_render.sh`. Kein 1:1-Repost (Duplikat-Abwertung) → neue Clips im Top-Stil.


**2026-06-10 (Abend) — Luxestyle product session (ÜBERNAHME: ALLES POSTEN + Pro-Musik + Veo-Clips):**
- **📣 POSTING-OWNERSHIP (User 10.06.):** Diese Session übernimmt **ab jetzt das komplette Social-Posten**
  (Meta IG/FB/Threads-Queue, Reels, Veo-Clips, Bild-Posts). Andere Sessions: bitte **nicht** in
  `social/posts_image.csv` / `social/video_queue.csv` schreiben — sonst Dubletten.
- **🎬 ANIMIERTE VEO-CLIPS ins Live-Posting:** Die 10 fertigen `reels/veo-hero-*.mp4` (Bild→Video) waren
  auf toten `abannews.com`-URLs gestrandet. Neu: `automation/queue_veo_clips.mjs` + `veo-queue.yml` laden die
  **5 echten LuxeStyle-Mode-Clips** (Brise/Daisy/Sirène/Cosy/Nuit — live im Katalog verifiziert) auf die
  Shopify-CDN + reihen sie **gestaffelt (1/Tag, 13.–17.06.)** in `social/video_queue.csv` → Meta-Autopilot postet.
  ⚠️ **Die 5 Merch/POD-Clips (cattote/skulltee/mountaintee/quotemug/sunsethoodie) sind NICHT LuxeStyle** —
  gehören der abannews/Video-Session, bewusst **ausgeschlossen**. PR #612 → main gemergt, veo-queue dispatcht.
- **🎧 PRO-HYPE-MUSIK:** `automation/music/luxe-hype-pro.mp3` (FluidSynth GM-Instrumente, 808-Glide,
  Hi-Hat-Rolls, Intro→Drop, -13,4 LUFS) + reproduzierbare Toolchain `automation/music/produce/`. Liegt im
  Reel-Musik-Pool → `auto_render.sh` rotiert ihn automatisch in neue Reels.
- **📅 NÄCHSTER SCHRITT (User 10.06.): „beobachten ein paar Tage später, wenn gute Meta-Infos da sind".**
  → Posten läuft jetzt autonom durch (Veo-Clips 13.–17.06., Bild-Posts + Reels täglich). **In ~3–5 Tagen:**
  Meta-Analytics ziehen (Reach/Engagement/Saves/Profil-Besuche/Follows je Post) → auswerten welche Clips/Captions
  ziehen → Profil-Optimierung + bessere Hooks/CTAs für Follower. **Tools dafür da:** `automation/reel-analytics.mjs`,
  Meta-Graph-Insights. Diese Session hat KEINEN Selbst-Wecker → neue Session macht den Analytics-Pass.
- **💸 DATAHASH GEKÜNDIGT (User 10.06.):** Server-Side-Tracking-Tool DataHash war **redundant** zum nativen
  Setup → gekündigt. **Tracking läuft jetzt NUR nativ:** TikTok-Shopify-App (Datenfreigabe MAX → CompletePayment,
  Pixel D8EKVR) + Meta-Verkaufskanal-CAPI (beide gratis). **⚠️ Check beim ersten Kauf / Kampagnenstart:** im
  TikTok Events Manager prüfen, dass CompletePayment-Events weiter ankommen. Falls Events ausbleiben → DataHash
  war doch die Quelle → native Anbindung nachschärfen.
- **👀 TIKTOK-PROFIL gesichtet (Screenshots 10.06.):** @luxestyle.ch aktiv, viele Reels (Top-Views 1107/796/778),
  **TikTok-Shopping-Tags live** (Preis + „JETZT SHOPPEN") = echter Kaufpfad. ABER nur ~6 Follower (Views
  konvertieren nicht zu Follows). **🔴 Leak:** „Sommerkleid ärmellos CHF 32.90" (3,54★, `niedrig-bewertet-nicht-
  bewerben`) wird auf TikTok mit Shopping-Tag beworben → User muss den Post in der App löschen (kein API-Zugriff).
- **🤖 EINGELOGGTER BROWSER-AGENT gebaut** (`tools/browser/agent.py` + `BROWSER-AGENT-SETUP.md`): erweitert das
  öffentliche `browser.py` um eingeloggte Aktionen, die die offiziellen APIs NICHT können (IG/TikTok-Post löschen).
  **Sicher:** keine Passwörter — User loggt EINMAL von Hand ein (`agent.py login instagram <url>`), Session-Cookies
  liegen unter `~/.luxe-browser/<profil>.json` (gitignored, NIE committen). Dann `ig-delete`/`tiktok-delete --confirm`
  (mit before/after-Screenshots). **Läuft auf USER-Rechner** (Login braucht Bildschirm; Cloud-Session kann sich nicht
  selbst einloggen). **Für „Cloud-Claude klickt selbst" → Browserbase-Variante GEBAUT (User wählte B, 10.06.):**
  `tools/browser/agent_cloud.mjs` (CDP→Browserbase-Context) + Workflow `.github/workflows/browser-action.yml`
  (Dispatch: check/ig-delete/tiktok-delete, Screenshots als Artefakt). Setup `BROWSERBASE-SETUP.md`. **Offen (User):**
  3 Secrets `BROWSERBASE_API_KEY/PROJECT_ID/CONTEXT_ID` + Context **einmal einloggen** (Live-URL). Dann triggere ich
  Aktionen direkt. PR #615 → main gemergt (Workflow dispatch-bar).
  **🔴 DO-NOT-POST.txt war lokal stale (nicht weg)** — bali/augenmassage durchgehend geschützt; jetzt + Sommerkleid-Handle.

**2026-06-08 — Luxestyle product session:**
- **Polish-Session (Gemini 4/10):** Rückgabefrist→30 Tage (5 Coll.), Damen-Text gekürzt, Top-10-Bestseller premium-mode-first sortiert, SEO für 5 neue Sub-Collections, 2 Hero-Bilder generiert (dropship/hero/), Draft-Theme "Hero-Polish" angelegt. Hero-Kontrast-Bug-Ursache: scheme-6 existiert nicht → Customizer-Fix nötig (Live-Theme-API blockiert). Report: reports/site-critique-2026-06-08.md.
- **Katalog:** **238 `cj-real` aktiv** (heute +65 neue Produkte: Mode, Taschen, Schmuck, Schuhe, Home, Beauty, Gadget, Premium).
- **Navigation feiner (Charge 27):** Beauty & Home in Sub-Collections gesplittet + als Menü-Untermenüs
  (Hautpflege & Skincare · Wellness & Beauty-Tools · Deko & Wohnaccessoires · Beleuchtung & Lampen · Küche & Tisch),
  alle in 6 Kanäle publiziert. Mode/Schuhe/Schmuck haben bereits Damen/Herren-Untermenüs.
- **Autonome Social-/Sourcing-Maschine gebaut & auf `main`:**
  - `dropship/cj_autopilot.mjs` + `cj-autopilot.yml` (VOLL-AUTO: sucht→QA→Varianten→Gemini-Gate→ACTIVE+publish, 2×/Tag)
  - `automation/queue_new_products.mjs` + `social-queue-build.yml` (reiht neue Produkte autom. in die Post-Queue, 2×/Tag)
  - `automation/social-autopost-meta.mjs` (postet FB/Threads/IG, 2×/Tag) — **läuft schon** (heute 13+ Posts live)
- **Shop-Seiten:** „✨ Entdecken" (`/pages/entdecken`) + „🎨 Selbst gestalten" (`/pages/selbst-gestalten`) + Menü-Leisten.
- **Verbesserungen:** `premium-schmuck`-Menü-Collection auf 84 aufgefüllt (war Discoverability-Lücke); Conversion-Leaks gefixt.
- **Offen (User):** Shopify/CJ-Secrets setzen → dann läuft Sourcing+Posten vollautonom. Siehe **`dropship/ABEND-TODO.md`**.
- **Branch:** alles auf `claude/luxestyle-product-CizQ6` → Draft-PRs nach `main`. ⚠️ Dort steht `MAX_PER_RUN=8` (nur Branch, nicht mergen!).

**2026-06-08 — abannews / video sessions:** (bitte hier eintragen, was ihr am Shop/Repo ändert)

**2026-06-10 — abannews session (neue „Märkte"-Sektion):** `/maerkte.html` + `/en/maerkte.html` (Krypto+Aktien+
ETFs+Indizes+Rohstoffe, 42 Assets + Detailseiten, Live-Kurse CoinGecko/Yahoo, **Gemini-KI-Sentiment**, News, Rechner,
Mobile-Karten, Telegram-Digest). Nutzt geteilte Secrets `GEMINI_API_KEY` + `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHANNEL`/
`TELEGRAM_OWNER_ID`. Cron `markets-build.yml` Mo–Fr 06/16 UTC, commit `[skip ci]`. **Gehört der abannews-Session**
(PROJEKT.md Teil 17). Berührt KEINEN Shop/Katalog/Social. Branch `claude/abannews-growth-monetization-hm6wod` → PR.

**2026-06-09 — Luxestyle product session (Social-Maschine + Browser-Frage):**
- **Spam-Moderation LIVE (FB + IG):** `automation/social-comment-moderate.mjs` + `social-comment-moderate.yml`
  (3×/Tag, blendet Solicitation-/„zahl-mir-Geld"-Spam aus, echte Fragen bleiben; hide=reversibel). Workflow nutzt
  Sparse-Checkout (Repo ist riesig → sonst hängt der Checkout) + robuste Token-Wahl (FB/IG/META).
- **🔑 META-TOKEN-LEHRE (teuer gelernt):** FB-Seiten-Moderation/Posten braucht ein **Page-Token** (Typ „Page"
  aus `me/accounts` → access_token der Seite LuxeStyle CH `1049840534888592`). Ein **User-Token** (auch langlebig,
  alle Scopes) gibt für FB **code 190**. IG funktioniert mit User-Token. `FB_PAGE_ID=1049840534888592`,
  `IG_USER_ID=17841480560863361`. Page-Token in FB_PAGE_ACCESS_TOKEN **und** IG_ACCESS_TOKEN.
- **Content-Vielfalt:** `automation/good_products.csv` neu = breit gestreut (Herren/Gadgets/Home/Schmuck/Beauty/
  Accessoires + nur ~4 frische Kleider, interleaved) → keine Damenkleider-Wiederholung mehr. **Augenmassagegerät
  rausgenommen** (User will es nicht posten). Frische Einzel-Clips gerendert: `reels/clip-*.mp4` + `montage-2026-06-09.mp4`.
- **✅ REEL-HOSTING-PROBLEM GELÖST (09.06. nachmittags):** Meta/TikTok ziehen Videos per **öffentlicher URL**.
  Repo ist privat (raw=404) + abannews.com/reels=404 → früher blockiert. **Lösung: Shopify-Files-CDN.**
  Neues Tool `automation/upload_to_shopify_cdn.mjs` lädt eine lokale Datei (Reel/Bild) per
  `stagedUploadsCreate → GCS-POST → fileCreate(FILE) → poll READY` hoch und gibt eine **öffentliche
  `https://cdn.shopify.com/...mp4`-URL** aus (range-fähig, HTTP 206, von Meta abrufbar). Auth = dieselben
  Client-Credentials wie reel-analytics.mjs (SHOPIFY_SHOP/CLIENT_ID/SECRET). **Erstes Reel live gehostet:**
  `cdn.shopify.com/s/files/1/0943/6856/3585/files/luxestyle-reel-20260609.mp4` (diverser Mix, kein Kleider-Spam)
  → in `social/video_queue.csv` als `mix-20260609` status=ready eingetragen, abannews-Zeilen auf `needs-rehost`.
  **Volle Automation** (reel-render → CDN-Upload → Queue) braucht nur noch die Shopify-Secrets als **Repo-Secrets**
  (aktuell nur in-Session). Bis dahin: manueller Upload via dem Tool + Workflow-Dispatch.
- **✅ ERSTES REEL LIVE ÜBER DIE NEUE PIPELINE (09.06. 20:54 UTC):** `video-meta-autopost.yml` (dispatch auf Branch)
  hat das CDN-Reel `mix-20260609` veröffentlicht → **Instagram Reel** `18091803953356065` ✅ + **Threads**
  `17978311515020703` ✅. Pipeline end-to-end bewiesen.
- **✅ FB-TOKEN ERNEUERT + REEL AUF ALLEN 3 META-KANÄLEN LIVE (09.06. 22:29 UTC):** User hat ein langlebiges
  **Page-Token** gesetzt → `mix-20260609-fb` gepostet → **Facebook Video** `27101737179520083` ✅. Damit ist das
  Reel auf **Instagram + Threads + Facebook** live. **FB-Spam-Moderation** mit demselben Token per Dry-Run
  verifiziert: „Spam (DRY) ausgeblendet: 0", **keine code-190-Fehler mehr** → Moderation FB+IG wieder voll funktionsfähig.
  IG_ACCESS_TOKEN + THREADS_ACCESS_TOKEN gültig. **Meta-Stack komplett grün.**
- **🔧 CI-FIX:** `video-meta-autopost.yml` Checkout hing (großer Repo, viele committete .mp4) → auf shallow
  (`fetch-depth:1`) + Sparse-Checkout (nur Script + Queue) umgestellt → Checkout jetzt ~1s.
- **✅ 3 FRISCHE REELS (15 NEUE PRODUKTE) LIVE auf IG+FB+Threads (09.06. abends):** Auf User-Wunsch „nicht
  mehr die gleichen Produkte". Zuerst Post-Verlauf geprüft (good_products.csv 32 + posts_image.csv 35) → 15
  noch nie gepostete Produkte gewählt (Beauty: Gua-Sha/Vitamin-C; Herren: Marco-Sneaker/Costa-Set/Porto-Slides/
  Amalfi; Schuhe: Gala/Cloud; Schmuck: Onyx/Stella/Serpent/Coeur; Gadget: FlexHold; Damen: Lino/Roma). 3 Reels
  via `reel-render.yml`-Dispatch gerendert → je per Shopify-CDN hochgeladen → in `video_queue.csv` →
  alle 3 gepostet (fresh1 IG 18323863495286045, fresh2 17924169777356896, fresh3 18205019272347534).
- **🆕 `good_products.csv` ersetzt:** jetzt 15 frische Produkte im **sauberen 3-Spalten-Format** (name,url,label).
  Behebt Alt-Bug: 4-Spalten + `cut -f3-` zog den **Handle-Slug** mit ins on-Video-Label → jetzt sauberes Label.
  Pointer auf 0 zurückgesetzt. (⚠️ Reel-Render-Cron läuft von `main` mit ALTER good_products.csv — Branch-Stand
  wirkt nur bei Dispatch/Merge.)
- **⚠️ CRON-VON-MAIN:** geplante Auto-Posts (`video-meta-autopost`, `reel-render`) laufen vom **main**-Branch;
  neue CDN-Queue-Zeilen/Produkte liegen auf dem Dropship-Branch → bis Merge per **Workflow-Dispatch auf dem
  Branch** posten (so heute alle 3 gemacht). Für hands-off täglich: PR nach main mergen.
- **✅ CONVERSION-PASS (09.06. spät, live via MCP — NICHT zurücksortieren!):**
  - **Social-Proof-First auf den Top-Landing-Pages:** Manuelle Kollektionen umsortiert (sortOrder=MANUAL),
    sodass die **bewerteten Verkaufsschlager zuerst** stehen:
    · **Homepage „🔥 Hero-Favoriten" (`bestseller`, 486 Sess/#1):** Slim Wallet 5,0★/15 · Herrenuhr 5,0★/15 ·
    Jade Roller 5,0★/7 · Mini-Diffuser 4,8★ ganz oben (vorher unbewertete Galaxy/Salzlampe oben).
    · **„✨ Highlights" (`highlights`, 239 Sess/#2):** +6 Review-Gewinner zugefügt & nach oben (Bali 4,93 ·
    Plateau-Sandalen 4,71 · Mini-Kleid 4,65 · Resort-Set 4,64 · Ibiza 4,47 · Maxirock 4,35).
  - **Ad-Funnel `sommer` (72 Prod.) leak-gescannt: sauber** — alle bewerteten ≥4,35★, kein schlechtes Produkt.
  - **15 frische Reel-Produkte verifiziert:** alle 6 Kanäle, korrekte Kollektionen, SEO+Trust-Text vorhanden.
  - **3 verstümmelte SEO-Titel gefixt** (FlexHold/Coeur/Serpent — Auto-Generator hatte Compound-Wörter zerlegt).
  - Engpass bleibt **Reichweite** (3 User-Klicks: TikTok-Conversion-Kampagne + Pixel + Budget), nicht der Shop.

**2026-06-10 — Luxestyle product session (Branch nach `main` gemergt — alles live & automatisch):**
- **✅ 3 PRs nach `main` gemergt** (#586, #597, #603) → ALLE Workflows laufen jetzt vom **main**-Cron
  (Meta-Posts, Reels, Moderation, Bild-Gen) = hands-off. Branch bleibt `claude/luxestyle-product-CizQ6`.
- **✅ SHOPIFY-SECRET vom User gesetzt** (`SHOPIFY_SHOP`/`CLIENT_ID`/`SECRET`) → Admin-API-Workflows aktiv.
- **✅ 235 SCHRIFTLOSE EDIT-BILDER in die Produkt-Galerien** (alle cj-real außer Bali) via neuem
  `automation/upload_edited_product_images.py` + `edited-product-images.yml` (workflow_dispatch, **idempotent**
  via alt-Prefix „LuxeStyle-Edit", Bali ausgeschlossen, Throttle). `render_product_clean()` = ganzes Produkt
  scharf+veredelt auf unscharfem Marken-BG, **kein Text**. Lauf: 235 hochgeladen, 0 Fehler. Jederzeit per Klick
  wiederholbar (auch neue Produkte).
- **🖼️ SCHÄRFE/FORMAT-FIXES (gen_post_image):** `place_hero()` adaptiv (cover-scale ≤1.4 → Full-Bleed, sonst
  scharf-gerahmt) gegen unscharfe 750–800px-CJ-Fotos; echtes **1080×1920-Story-Format** mit Safe-Zones +
  optionalem **★-Rating-Badge**; **IG-Reel-Cover** via `thumb_offset` (kein weisses Intro mehr).
  **LEHRE:** `featuredImage` ist oft winziges Thumbnail (Bali 361px) — grösstes Produktbild nehmen.
- **🎵 Techno-Musik-Pool** `automation/music/` (Voltaic/Electrodoodle/Digital-Lemonade, Kevin MacLeod CC-BY),
  `auto_render.sh` rotiert + hängt CC-BY-Credit an Caption. **🚫 DO-NOT-POST.txt** (Bali, Augenmassage).
- **📣 SOCIAL-AUFTEILUNG (Best Practice, umgesetzt):** **Produktseiten = schriftlos**, **Social-Posts = MIT Text**
  (Marke+Titel+−10%-Pill → Angebot ohne Caption sichtbar = mehr Klicks). Heute live gepostet (IG+FB+Threads):
  Aurora (mit Text) · Ibiza-Edit (schriftlos) · Plateau-Sandalen (mit Text). 6 weitere mit-Text in `posts_image.csv`
  ready → Cron drippt 2×/Tag. Bild-Hosting für Social = **Shopify-CDN** (abannews.com war 404).
- **🎵 TikTok-Reel-Autopost GEBAUT** (`tiktok-autopost.mjs`, FILE_UPLOAD, kein Domain-Verify) → fehlen nur
  4 Secrets `TT_CLIENT_KEY/SECRET/ACCESS_TOKEN/REFRESH_TOKEN` (User-OAuth, `dropship/TIKTOK-AUTOPOST-AKTIVIEREN.md`).
  Es gibt **kein** TikTok-API-Tool in der Session — Posten geht nur über diese Action.
- **✅ Pixel `D8EKVR3C77U6KT5BTBD0` geht** (Conversion-Tracking live). Offen für Käufe: TikTok-Kampagne Ziel „Kauf" + Budget.
- **✅ SOCIAL HEUTE LIVE (10.06.):** Bild-Posts MIT Text auf IG+FB+Threads (Aurora · Plateau 4,7★ · Marco · Gua-Sha ·
  Onyx · Costa), Ibiza schriftlos; + 3 frische **Techno-Reels gestaffelt** (Reel 1 live, Reel 2/3 = 11./12.06.
  per Cron). Rest der mit-Text-Posts ready → Cron drippt 2×/Tag.
- **✅ AUTO-HOST REELS (hands-off):** `reel-render` (alle 4 h) lädt das Reel jetzt automatisch auf Shopify-CDN
  (`upload_to_shopify_cdn.mjs`) + reiht es in `social/video_queue.csv` (ready) ein → `video-meta-autopost`
  postet es. Kein manueller Upload mehr. (auto_render.sh + reel-render.yml mit SHOPIFY-Secrets.)
- **🧩 SOCIAL/SHOP-BILD-AUFTEILUNG:** Produktseiten = **schriftlos** (`render_product_clean`, 235 live),
  Social-Posts = **mit Text** (`render_card`/`render_story`). „verzogen"-Beschwerde geklärt: `render_story` ist
  echtes 1080×1920 (kein Strecken) + adaptives `place_hero`. **gen_post_image.py auf main verifiziert** —
  place_hero/render_story/render_product_clean/_excludes alle vorhanden (frühere „weg"-Anzeige war transient).
- **Reel-Vorrat:** 64 .mp4 gerendert (meist ältere); frische Techno-Reels gehen jetzt automatisch in die Queue.
- **🎨 VISUAL-FIXES (09.06. spät):** (1) **Story-Format 1080×1920** mit Safe-Zones in `gen_post_image.py`
  (`render_story`) — Feed-Bild als Story war seitlich abgeschnitten. (2) **IG-Reel-Cover** = Produkt-Frame
  statt weisses Intro (`thumb_offset` in video-autopost-meta). (3) **Schärfe-Fix `place_hero()`**: CJ-Fotos
  sind oft 750–800px → Full-Bleed = 2–2.5× Upscale = unscharf. Neu adaptiv: hochauflösend (cover-scale ≤1.4)
  bleibt immersiv Full-Bleed, niedrig aufgelöst → scharfes Produkt auf unscharfem BG. Reels nutzen
  `automation/frame_for_reel.py` vor dem ffmpeg-Render (reel-render.yml installiert `python3-pil`).
  (4) **Story-Rating-Badge** (★ 4,9 · N Bewertungen) für Social Proof. **LEHRE:** Das `featuredImage` ist oft
  ein winziges Thumbnail (Bali 361×448), grössere Bilder (1066px) existieren → für Top-Schärfe das grösste
  Produktbild nehmen.
- **🎵 TECHNO-MUSIK:** `automation/music/` = 3 royalty-free Tracks (Kevin MacLeod, CC-BY): Voltaic/Electrodoodle/
  Digital-Lemonade. `auto_render.sh` rotiert pro Reel + hängt CC-BY-Credit an die Caption. (Eingebackene Musik:
  nur royalty-free; echte Trend-Sounds nur in-app über die `-clean.mp4`.)
- **🚫 DO-NOT-POST-Liste:** `automation/DO-NOT-POST.txt` (case-insensitive Substring) — **bali**, **augenmassage**
  nie in Creatives. Respektiert von `gen_post_image` (Stories/Posts) + `auto_render.sh` (Reels). Bali bleibt als
  Produkt/Bestseller im Shop, nur **keine Bali-Marketing-Bilder** (User 10.06.).
- **✅ PIXEL GEHT (User 10.06.):** TikTok-Pixel funktioniert → Conversion-Tracking live. Damit kann die Kampagne
  endlich auf **Käufe** optimieren. Von den 3 Reichweiten-Blockern ist Pixel ✅; offen bleiben **Conversion-
  Kampagne mit Ziel „Kauf" + Budget**.
- **TikTok-Autopost** (`tiktok-autopost.yml`) braucht `TT_CLIENT_KEY/TT_CLIENT_SECRET/TT_REFRESH_TOKEN`
  (TikTok-Developer-App + Content-Posting-API, evtl. App-Review). Bis dahin: manuell posten.
- **🖥️ BROWSER-/CLOUD-BROWSER-FRAGE (User 09.06.):** Diese Session hat nur **Headless-Playwright**
  (Screenshots/Lesen öffentlicher Seiten). **KANN NICHT** in eingeloggte Konten klicken (TikTok-App, Shopify-Admin,
  Meta Business Suite) — kein authentifiziertes Browser-/Computer-Use-Tool angeschlossen, Logins sind sensibel.
  **Option für die Zukunft:** Ein **Cloud-Browser-/Browser-MCP-Tool** mit eingeloggten Sessions verbinden → dann
  könnte eine Session auch klickende Aktionen übernehmen (TikTok-Upload, Customizer-Klicks, Token holen). Aktuell
  Arbeitsteilung: Claude = API/Render/Posten, User = App-/Login-Klicks.
