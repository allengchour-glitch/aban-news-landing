# CLAUDE.md — Projekt-Gedächtnis

> 🔗 **ZUERST `SHARED-MEMORY.md` (Repo-Root) lesen** — mehrere Sessions arbeiten parallel auf diesem
> Repo + Shop; dort steht, wer was „besitzt" + der Live-Stand. CJ-Import/Katalog/Social = NUR diese Session.

Dieses Repo ist `aban-news-landing`, enthält aber mehrere Projekte. Das aktive, autonome
Arbeitsgebiet ist der **CJ-Dropship-Import für den Shopify-Shop LuxeStyle CH**.

## 🤖 Autonom-Auftrag (Dauerauftrag des Users)
Der User will den Shop **vollautonom betrieben — ohne ‚weiter' zu sagen. Oberstes Ziel: KUNDEN,
die KAUFEN.** Mehr Produkte sind dabei Mittel, nicht Selbstzweck. Bei jeder Dropship/Shop/CJ-Session:

1. **Lies zuerst `dropship/AUTONOMER-MODUS.md`** — vollständiges Runbook inkl. **§9 Master-Lessons**
   (alle teuer gelernten Fallen) und **§10 Kunden gewinnen** (was autonom geht, was nur der User kann).
2. **Lies `dropship/CJ-IMPORT-LOG.md`** für Produktliste & Historie.
3. Dann **einfach loslegen** (Conversion-First-Routine, §10): Autopilot-Drafts veredeln → ACTIVE →
   publizieren; QA auf FAILED-Bilder; Heroes/Copy/Collections/SEO verbessern; bei Bedarf 1–2 saubere
   Produkte ergänzen. Committen, auf **`claude/luxestyle-product-CizQ6`** pushen (fester Dropship-Branch,
   vom User 2026-06-07 festgelegt), Draft-PR nach `main`, Stand melden.
   Nicht nach Erlaubnis fragen — der Auftrag steht. Nur die 3 User-Klicks (AGB-Fix, Pixel,
   Kampagne+Budget, §10) kann ich nicht selbst — die klar benennen.

## 🔁 Daueraufträge (FEST)
- **„update dich immer"** (2026-06-12): Memory nach jeder Charge nachführen.
- **📈 ÖFTER ANALYSIEREN — Meta + TikTok (FEST, User 2026-06-14 „analysiere öfters in meta tiktok und so"):**
  In JEDER Session **zuerst `bash automation/brain/auto.sh`** (TikTok-Analyse + Lernen) UND einen **Meta-Check**
  (IG/FB-Engagement: via `automation/reel-analytics.mjs` / Graph-Insights, sobald `META_ACCESS_TOKEN` da; sonst
  öffentlich/Metricool). Lehren ins Gehirn (`knowledge.json`), Stand in `dropship/STATUS.md`. Ziel: Performance
  laufend beobachten, Gewinner verstärken, Verlierer droppen (Ratsche). Pro Markt getrennt (CH zuerst).
- **🆙 ASSETS AUF CDN HEBEN — Eigenfähigkeit (FEST, 2026-06-14):** Lokale Videos/Bilder per **Shopify-MCP** ins CDN
  bringen — KEINE Creds nötig: `stagedUploadsCreate` (Mutation) → Bytes per `curl -F` an die GCS-`url` POSTen
  (HTTP 201) → `fileCreate(contentType:FILE)` → `node(id)` pollen bis `READY` → öffentliche `cdn.shopify.com`-URL.
  Mehrere Dateien in EINEM stagedUploadsCreate batchen (1 curl je Datei, dann 1 fileCreate). Damit kann ich
  versteckte/neue Assets selbst in die Posting-Pipeline (`social/video_queue.csv` → Gehirn-Queue) bringen.
  ⚠️ Policy/Signature beim curl EXAKT kopieren (Tippfehler = HTTP 400). NUR LuxeStyle-Assets (kein abannews).
- **📊 STATUS-BERICHT (2026-06-14 „ich will immer Status sehen, was du gemacht hast"):** `dropship/STATUS.md`
  nach JEDER Charge nachführen (was läuft autonom · was wartet auf User · Verlauf neueste oben) UND in der
  Antwort eine kurze Status-Zusammenfassung zeigen.
- **🤖 AUTO-MODUS (2026-06-13 „muss nichts mehr das gleiche sagen"):** EIN Befehl macht alles —
  **`bash automation/brain/auto.sh`**: (1) analysieren (TikTok), (2) lernen (Gehirn, kumulativ+Ratsche),
  (3) Autopost-Queue aus gelernten Captions/Hashtags+echten Preisen nachfüllen, (4) nächste 🔴/🟡-Aktionen
  + Follower-/Manuell-Hebel ausgeben. In JEDER Social-Session laufen lassen, dann **`automation/brain/BRAIN.md`**
  lesen und die roten/gelben Aktionen abarbeiten. Lehren/Regeln NUR in `automation/brain/knowledge.json` (`rules`)
  pflegen — NIE `learned_pools.sh`/`pools.json`/`queue.json` direkt editieren (werden überschrieben).
  Ratsche: bewiesene Verlierer bleiben geblockt, Gewinner erhalten → fällt nie zurück.
  **Follower** (`automation/local/ch-follower-growth.mjs` + `ch-unfollow.mjs`) läuft nur am PC-Claude (Browser/CDP).
- **🧠 „lerne von selber + klaue Ideen von Top-Leuten" (FEST, 2026-06-14):** Regelmäßig Memory nachführen,
  selbstständig dazulernen (Gehirn-Schleife), und **bei jedem Content-Schub Ideen von erfolgreichen Creators/
  Shops studieren & adaptieren** (Hooks/Formate/Schnitt/Sounds). Nicht von Null erfinden — kopieren was nachweislich zieht.
- **🎵 REEL-SOUND-REGEL (FEST, 2026-06-14):** **TikTok-Reels = STUMM hochladen** (User legt Trend-Sound in der App
  drauf — Trend-Sounds gehen lizenzrechtlich nur in-app). **Meta/IG+FB-Reels = eigene coole Musik einbacken.**
  Musik-Stil an Content + Gewinner-Vibes anlehnen; laufend besser werden.
- **🎵 MUSIK = `automation/music/music_library.mjs` (NEU 2026-06-14, „alle legale und gratis — mach ein super Tool"):**
  Der GM-Synth/fluidsynth-Sound war dem User **„zu billig"**. Standard ist jetzt das Tool: liefert **kommerziell-freie**
  Tracks (Kevin MacLeod / incompetech, **CC-BY 4.0**, Katalog `catalog.json`, 11 verifiziert) und schreibt die
  **Pflicht-Attribution automatisch nach `automation/music/CREDITS.md`**. `node …/music_library.mjs list` ·
  `pick --mood elegant [--vocals] [--dur 60] [--out x.wav]`. Cache `automation/music/lib/` ist gitignored (re-downloadbar).
  ⚠️ **Bug-Lehre:** in WAV-Konvertierung `-stream_loop -1` NUR mit `-t` (sonst loopt ffmpeg unendlich → 25-GB-Datei, Disk voll).
  **Gesang:** kommerziell-frei gibt's kaum → echte Songs MIT Gesang nur via `--engine suno` (PC-Port, gratis-Konto;
  **für Live-Ad Suno Pro nötig**). `--engine musicgen` (lokal CPU, instrumental) ist CC-BY-**NC** = NUR intern/Test,
  nie in einen Live-Ad. Alte Generatoren (`make_signature_track.py`/`make_trend_tracks.py`, fluidsynth) = nur Fallback.
- **🧰 GRATIS-VOLLAUTOMATIONS-STACK + KI-FALLBACK (FEST, User 2026-06-17 „alles gratis Versionen … falls einer nicht mehr geht … richtige Vollautomation"):**
  EIN Multi-Provider-KI-Router **`automation/ai/ai_generate.mjs`** für ALLE Text/Content-KI — probiert
  **groq → gemini → openrouter → cloudflare → mistral → openai** der Reihe nach durch; fällt ein Key/Provider
  aus (Quota/429/down), nimmt er automatisch den nächsten; **ohne jeden Key = Template-Fallback** → Automation
  bricht NIE. Keys NUR aus ENV (NIE im Repo). **Gratis empfohlen: `GROQ_API_KEY` (#1, console.groq.com)** +
  `GEMINI_API_KEY`. **`automation/health-check.mjs`** zeigt welche Provider/Tools leben (Report `reports/health-*.json`).
  **`automation/trends/trend_scan.mjs`** = Trends+Musik regelmässig analysieren (Google-Trends-CH gratis ohne Key +
  KI-Ideen, STRIKT CH/Mundart). **`automation/setup-free-stack.sh`** baut den Stack reproduzierbar auf (yt-dlp/gallery-dl/
  Pillow/Checks). Alles in `auto.sh` (Schritte 1/3/6) + PC-Task (9b) verdrahtet. ⚠️ OpenAI-Key des Users = Quota leer (429) → nur als Fallback.
- **🐢 FOLLOWER LANGSAM (FEST, User 2026-06-17 „wachse langsam follower"):** `ch-follower-growth.mjs` bewusst NIEDRIGE
  Caps (IG 30 / TikTok 22), 25–70 s Pausen, Stopp bei Block. Ziel 1 Mio = NACHHALTIG über Monate, nie Spitzen (Ban=Totalverlust).
- **🈂️ SAFE-ZONE-TEXT-REGEL (FEST, User 2026-06-14 „schrift unten achtung"):** TikTok/IG/Reels blenden **unten ~20 %**
  (Caption/CTA/Fortschrittsbalken) und **rechts ~12 %** (Icons) ein. Eingebrannter Text MUSS da raus → **endet bei ~78 %
  Höhe (y≤1500 von 1920)**, nie ganz unten, sonst Textbrei mit der Plattform-Caption. Gilt für ALLE Reels/Videos.
  Umgesetzt im Marken-Video-Builder; `render_masterpiece.sh` (Caption-Band y=1560–1900) noch NACHZIEHEN.
- **🎬 MARKEN-VIDEO-BUILDER `dropship/ads/render_brand_video.py` (NEU 2026-06-14):** 60s + 30s, 1080×1920, Kerstin-VO
  (piper, auto-Download), Musik aus dem Tool, alle Kategorien inkl. „Selbst gestalten", Ken-Burns + xfade + Safe-Zone-
  Captions + Grade. Output `reels/luxestyle-brand-{60,30}s.mp4`. Reproduzierbar; ENV `MUSIC_ID`/`OUTDIR`.
- **🎬 REEL-MEISTERWERK-PIPELINE (2026-06-14):** Luma `ray-flash-2` (Bild→Video, Key `luma-6ac…`, ~9672 Credits) →
  9:16-Finish (unscharfer BG-Fill + Mundart/Preis-HOOK-Text 1. Sek + dezenter CTA, ffmpeg) → **60fps Bewegungs-
  Interpolation** (`minterpolate=fps=60:mi_mode=mci` = flüssiger, User-Wunsch 2026-06-14) → 2 Exporte:
  `-9x16.mp4` (stumm/TikTok) + `-9x16-meta.mp4` (mit Musik/Meta). JEDES Reel einzeln per Frame QA'en (Asiaten-Regel +
  kein Warping). Output in `reels/`.
- **„schlage immer Verbesserungen vor + lerne daraus" (2026-06-13):** In JEDER Session proaktiv 3–5 konkrete,
  priorisierte Verbesserungsvorschläge machen (nicht nur abarbeiten), und jede Lehre sofort ins Memory schreiben.
  Ehrlich priorisieren: der Engpass ist **Reichweite/Conversion (0 Käufe)**, nicht Katalog/Videos — Vorschläge
  daran ausrichten. Vorschläge-Log: `dropship/VERBESSERUNGEN.md`.

## Kernfakten (Details im Runbook)
- Shop: **LuxeStyle** (luxestyle.ch), Zugriff über `mcp__…__*`-Shopify-Tools.
- **🇨🇭 GEO-REGEL (FEST, User 2026-06-14 „falls in Deutschland erweitere nicht"):** Shop bleibt STRIKT
  Schweiz — KEIN Ausbau nach Deutschland/Österreich. Kein DE-Markt/EUR-Pricing/DE-Stadt- oder #deutschland-Tags/
  DE-Ad-Targeting. CH-Tags (#schweiz/#schweizmode/#ootdschweiz) + **Mundart** bevorzugen (Mundart filtert DE
  automatisch raus). Deutschland-Tags sind im Gehirn (`knowledge.json` blocked_hashtags) gesperrt.
  **SCHWEIZWEIT (User 2026-06-14 „nicht nur Bern"):** ganz CH ansprechen — Zürich/Basel/Luzern/Genf/Bern rotieren,
  nicht auf eine Stadt fixieren. #bern ist nur EINER von vielen CH-Tags.
- **🌍 INTERNATIONAL (FEST, User 2026-06-14 „und wenn das international wird"):** Andere Märkte (US/UK/FR …) sind
  MÖGLICH, aber **Deutschland bleibt immer aus** und alles strikt getrennt: pro Markt eigene Währung+Sprache+Content
  über **Shopify Markets**; CH/Mundart-Content bleibt CH-targeted (nie an US/FR); Gehirn lernt **pro Markt getrennt**
  (eigene Hashtag-Pools/Hooks). **Reihenfolge: zuerst CH konvertieren lassen (Pixel/Kampagne), DANN das bewiesene
  Rezept auf US/UK kopieren.** US/UK-Märkte existieren bereits angelegt (deaktiviert, `MARKETS-US-UK-SETUP.md`).
- CJ-API: Credentials + Workflow in `dropship/AUTONOMER-MODUS.md`. Import-Skript:
  `dropship/cj_enrich.mjs` (Node: `/opt/node22/bin/node`).
- **Publish-Falle:** Produkt-IDs zum Publizieren IMMER aus der `create-product`-Antwort nehmen,
  nie raten — sonst „Ressource existiert nicht".
- **Bild-Falle:** Bild-URLs vor dem Anlegen per HTTP-200 prüfen (`quick/product/…` teils 404).
- **🈲 ASIATISCHE-SCHRIFT-REGEL (FEST, User 2026-06-13 „merke dir das"):** NIE Produktbilder mit
  **chinesischer/asiatischer Schrift** auf Verpackung/Overlay (z. B. 文艺车玩) ODER Lieferanten-Text wie
  **„MADE IN CHINA" / Marken-Watermark (ZHUMENG o. ä.)** live lassen oder posten. **Jedes Bild vor Anlegen UND
  vor dem Posten ansehen.** Häufige Quelle: **Auto-Importe** (oft die andere Session). Wenn entdeckt:
  Produkt **archivieren** (status ARCHIVED), aus `automation/cloudflare/luxe-poster/src/queue.json` nehmen,
  FB-Post per Graph-API löschen (`DELETE /{post_id}`). **⚠️ Instagram-API kann veröffentlichte Posts NICHT
  löschen** → IG-Post nur in der App ODER via PC-Claude `ig-delete` entfernen. Katalogweit aufräumen:
  `automation/image-audit.mjs` (Gemini-Vision erkennt asiatische Schrift/Overlays) — braucht `GEMINI_API_KEY`.
- **🔑 Shopify-API-Login (WICHTIG — VERIFIZIERT 2026-06-16, NIE wieder Stunden verlieren):**
  **`shpat_` git's NÜMME sit 2026** (User bestätigt 2×). Login-Wäg = **Client-Credentials-Grant** mit ere
  Custom-App (Dev-Dashboard): `POST https://au3j0y-hq.myshopify.com/admin/oauth/access_token` mit JSON
  `{client_id, client_secret, grant_type:"client_credentials"}` → `access_token` (gültig ~24h, pro Lauf neu).
  **⚠️ TEUER GELERNT — 3 Fallen:**
  1. **Die App MUSS uf de Shop INSTALLIERT si** (Dev-Dashboard → «App installiere» → uf de Berächtigungs-Sytä
     wirklich «Installieren» klicke → «Installationen: 1»). Sünsch: Fehler **`app_not_installed`** (egal ob Creds stimmen).
  2. **`atkn_`-«App-Automatisierungs-Token» FUNKTIONIERT NID** gäge d'Admin-API (401 «Invalid API key») — NID bruche.
     Nur de **client_credentials access_token** lauft.
  3. Es gab e FALSCHI App (Client-ID `c77dde5c…`, nid installiert) → immer `app_not_installed`.
  ✅ **RICHTIGI App (verifiziert, volle write_products-Scopes): Client-ID `ffe6c3a1326affdd7f461760ac1a8950`**
  (Secret `shpss_…` = NUR i `luxe-secrets.ps1`/Secrets, NIE is Repo). Shop `au3j0y-hq.myshopify.com`.
  Skript-ENV: `SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET` (ODER direkt `SHOPIFY_TOKEN`=fertige access_token).
  - **Katalogweite Änderige (Kategorie/Feed):** über d'Skript `automation/feed_polish.mjs` /
    `automation/enrich_apparel_descriptions.mjs` mit em access_token (gedrosselti Mutatione, idempotent +
    resümierbar, MAX/Lauf). Für Live-Abfrage/Einzeländerig sünsch d'`mcp__…__*`-Shopify-Tools direkt.
- **Branch (FEST, 2026-06-07):** alles auf **`claude/luxestyle-product-CizQ6`** → Draft-PR nach `main`.
  Nie direkt nach `main` pushen. ⚠️ Die alten Branches `claude/dropship-lade-memory-SrAs5` (PR #5) und
  `claude/dropshipping-session-LehDs` sind **in `main` gemergt und vom Remote gelöscht** — nicht mehr nutzen.
  Der gesamte Dropship-Stand liegt jetzt auf `main` (zuletzt Memory Teil 14, PR #400).
- **Scheduler (`CronCreate`/`ScheduleWakeup`) ist hier nicht aktiv** → kein echter Cron-Loop
  über Stunden möglich; Autonomie = Charge für Charge in der laufenden Session, plus dieses
  Memory, damit jede neue Session nahtlos weitermacht.

## Stand
**📌 2026-06-17 (ROLLEN-SPLIT — diese Session = NUR SOCIAL):**
- **🤝 ZUSTÄNDIGKEIT (User 2026-06-17 „andere session macht webseite sauber mit chatgpt, du bist für posting alle sozial tiktok meta videos, follower, chatten"):**
  Diese Session macht **ausschliesslich Social/Marketing** — Posting (TikTok+Meta), Videos/Reels, Bilder-mit-Text, Follower-Wachstum, Kommentar/DM-Chat, Engagement.
  **Webseite/Theme/Katalog-Struktur = andere Session (mit ChatGPT)** → NICHT mehr anfassen (nur lesen für Content/Preise). Koordination via SHARED-MEMORY.
- **⭐ VIDEO-REGEL: 1 A-Video (User „nur 1 A video, sonst loop für kritik" — fürs TikTok-Pixel-Ad):** `reels/luxe-hero-ad.mp4` = das EINE Hero-Creative,
  iterativ verbessern (Kritik-Schleife) statt viele streuen. Builder `/tmp/hero_ad.py`-Muster (16 Top-Produkt, 1.15s-Schnitt, Hook 1. Sek, CTA, upbeat-pop).
- **🖼️ TEXT-IM-BILD = STANDARD (User „mit text videos und bilder ab iz"):** Posts nutzen veredelte Karten (`gen_post_image.py` → `social/text_image_map.json`),
  NICHT nackte Produktbilder. `build_queue.mjs` macht Map-Lookup + nutzt **nur Top-Produkte** (`automation/top_products.csv`, 22; User „nutze nur top produkten").
- **📈 FOLLOWER (User „level hoch, 1 million"):** `ch-follower-growth.mjs` Caps IG 55 / TikTok 45 (sicher, PC-Brave-CDP, täglich). Worker+TikTok-Upload = „ab und zue cools poste".

**📌 2026-06-17 (REICHWEITI AKTIVIERT + 87 NEUI PRODUKT + Windows-Bug-Fix):**
- **🛍️ 87 neui Produkt (BigBuy EU, 7 Runden):** Outdoor 24 · Garten 12 · Küche 12 · Elektriker/Werkzüg 25 · Bademode 14.
  Alli markäni Ware (Bosch/NWS/JOKARI/Adidas/Speedo/Ysabel Mora…), echti Vendors, QA'd, feed-ready. Neui Kollektione:
  `elektriker-werkzeug`, `garten-balkon` + im Haupt-Menü «🔧 Werkzeug & Garten». Methode/IDs: `dropship/bigbuy-outdoor-import.md`.
  **⚠️ Knipex/Wera = 0 Lager bi BigBuy** (6000 gscannt) → nid importierbar; AliExpress-Fakes verbote. BigBuy listet Marke ≠ am Lager → IMMER per Hersteller-ID über mehreri Roots scanne.
- **🛒 MERCHANT-FEED 100%:** Kategorie 5747 · condition 6480 · **identifier_exists/custom_product 5232** (gröscht Ablehnigs-Grund weg) · Mode-Key-Details 2044. Skript `feed_polish.mjs`/`enrich_apparel_descriptions.mjs`/Merchant-identifier-Bulk.
- **🔍 BILD-AUDIT (Gemini Vision, `automation/image-audit.mjs`):** ganzä Katalog geprüft + **autonom gheilt** (schlächti Bilder glöscht, suuberi behalte). Nur Bild-Hygiene (Watermark/asiat.Schrift/Vorher-Nachher), **NIE Marke** (sünsch Fehlalarm auf Adidas/YSL/POD). Report-Modus default. Key-Format `AQ.Ab8…` funktioniert, Modell `gemini-2.5-flash` + `thinkingBudget:0`. Botox-Knockoff-Serum entfernt.
- **🐛 WINDOWS-BUG GEFIXT (wichtige Lehre):** `new URL(x,import.meta.url).pathname` git uf **Windows** `/C:/…` → `path.resolve` macht `C:\C:\…` → alli PC-Scripts (TikTok-Upload, brain, build_queue, Autopost…) gschytered. **Fix in 24 Skripten: `fileURLToPath(new URL(...))`.** → TikTok-Upload + Gehirn + Queue laufe jetzt am PC.
- **📡 REICHWEITI AKTIVIERT:** luxe-poster-Worker **LIVE deployed** (Crons `0 7,10,12,15,17,19` = 6×/Tag IG/FB, KV `662199…86ee9`). **TikTok-Upload verifiziert** (`--dry` findet Datei-Input → postet mit `node automation/local/tiktok-upload-browser.mjs`). Scheduled-Task «LuxeMarketing» registriert (täglich 10:00). 22 Flaggschiff-Produkt in Reel-/IG-FB-Post-Queue (Bärndütsch).
- **⚠️ PC-GIT-LOCK (offen, User):** `C:\Users\allen\aban-news-landing` isch vo eme Prozess (Editor/Explorer) gsperrt → git reset/pull/merge schiitered («Permission denied» / «in use»). **Lösig: frischä Klon nach `C:\luxe`** (`git clone -b claude/luxestyle-product-CizQ6 … C:\luxe`) + Scheduled-Task uf `C:\luxe\…` zeige. `luxe-secrets.ps1` liit i `C:\Users\allen` (NID im Repo) → bliebt. Alte Ordner nach Neustart löschbar.
- **🔴 Engpass unverändert:** 0 Orders. Worker postet jetzt zwar — fehlt no **TikTok-Pixel + bezahlti CH-Kampagne** (nur User) für kaufwillige Reichweiti.

**📌 2026-06-16 (ABEND — Worker LIVE + Shop-Struktur + Autonomie-Upgrade):**
- **✅ AUTONOMIE-UPGRADE:** Cloudflare-Skills sind in Claude Code installiert (beim `wrangler deploy` automatisch, 11 Skills inkl. `wrangler`/`cloudflare`).
  → **In künftigen Sessions kann ich den luxe-poster-Worker SELBST deployen/verwalten** (kein PowerShell mehr nötig). Cloudflare-Marketplace `cloudflare/skills` added.
- **✅ WORKER LIVE & autonom:** luxe-poster deployed (Cron 7/10/12/15/17/19 UTC = CH 12/17/21 posten + Analyse), KV LUXE_KV `662199…86ee9` **fest in wrangler.toml** (kein git-pull-Konflikt mehr).
  Handy-Befehlsqueue (`&cmd=`) + 1-Tap (`tap.html`) verifiziert live; PC-Listener läuft. **Neu im Code (committet): `&health`/post_log (Observability), `&dedupe` (FB-Doppel-Posts löschen), Stories=Text-Reels** — die brauchen noch EINEN sauberen Deploy (`git pull` DANN `wrangler deploy`; letzter war stale = Grösse unverändert).
- **⚠️ WORKER-TEST-FALLE (teuer gelernt):** Unbekannte URL-Parameter fallen im Worker auf `run()` durch → **POSTEN**. Darum Worker NUR mit DEPLOYTEN Routen antippen; vor Bestätigung nichts testen. `&queue=`/`&clearqueue` setzen cursor=0 → Re-Post → NICHT nutzen. (Drei versehentliche Posts so entstanden.)
- **🛍️ SHOP-STRUKTUR (live via API, voller Zugriff genutzt):** 5 neue Schmuck-Produkte (Fenrir/Aurelia/Lagune/Samsara/Olivia, Meisterwerk+Video+Musik). **6 falsch-gelabelte Marken-„Sonnenbrillen"→„Brille"** (Citizen/MK/Tous, Misrepresentation-Fix). **🧸 Spielzeug (147) in 13 Smart-Sub-Collections** unterteilt + per `menuUpdate` als L3 ins main-menu gehängt (Struktur 1:1 erhalten).
- **🎬 VIDEO-PIPELINE poliert:** `render_price_reveal.sh` v3 = Ken-Burns + warmer Grade + Vignette + **Musik (music_library, CC-BY)**; SILENT=1 = stumm/TikTok. **A/B- & Save-Listen-Reels** (`render_ab_reel.sh`/`render_savelist_reel.sh`) gegen 0-Shares.
- **🔴 Engpass unverändert:** 0 Orders → Reichweite. Nur-User: TikTok-Pixel/Kampagne + Google Free Listings. (Bezahlung TWINT bestätigt ok.)

**📌 2026-06-16 (AUSWERTUNG-WENDE + Video-Rollout 34 + Handy-TODO):**
- **📊 AUSWERTUNG 14T (live via Shopify):** 1.206 Sessions · **0 Orders** · ABER **4 abgebrochene Checkouts** (CHF 71.90/43/69/69
  + 1 älterer 129.90). → **Echte Käufer kommen bis in den Checkout & brechen am LETZTEN Schritt ab — NICHT (nur) Reichweite!**
  Shop technisch sauber geprüft (kein Passwort, CHF, Checkout aktiv, Storefront+PDP HTTP 200, Recovery-Flows live).
  Traffic: social **535** (autonomes Posten zieht) · direct 664 (Junk) · **search 4** (SEO ≈ tot → Free Listings = Upside).
  **NEUE Engpass-Hierarchie:** (1) Bezahl-/Abschluss-Schritt (TWINT/Karte testen!), (2) Buy-Intent-Traffic/Pixel, (3) SEO/Free Listings.
  **LEHRE:** Abbrüche mit echten CHF-Werten = Kaufabsicht da; Recovery-Mails greifen nur wenn E-Mail im Checkout erfasst.
- **🎬 34 Produkte mit eigenem Produkt-Video** (7 Marken + 3 Wasserfest + 13 Caps + 11 Schmuck/Brille/Ring) via Cloud-Pipeline
  (ffmpeg Price-Reveal → stagedUpload curl 204 → productCreateMedia VIDEO). Skript `dropship/ads/render_price_reveal.sh`. Lieferanten-Videos=0.
- **📋 NEUE DOCS (merken/teilen):** `TODO.md` (Repo-Root, **Handy-Durchklick** mit Direkt-Links + Checkboxen),
  `dropship/EIN-WEG-ZUM-1-KUNDEN.md` (alle Hebel nach Impact). Auswertung-Verlauf in `dropship/STATUS.md`.
- **🔴 Bleibt User (kein API-Weg, geprüft):** Testkauf+TWINT, Pixel/Kampagne, Google Free Listings, `wrangler deploy`,
  Klaviyo URL→.ch+CHF (Klaviyo hat KEINE Konto-Update-API). 💻 PC-Browser: tutti/Follower/TikTok-Upload (kein API).
- **⚠️ Worker `&cmd=tutti` etc. NOCH NICHT live** → Befehlsqueue-Route erst nach `wrangler deploy` aktiv (bis dahin postet ein
  Worker-Hit nur den nächsten IG/FB-Queue-Eintrag). Schweizer-Follower-Tool ist committet, aber **noch nie gelaufen** (kein Ledger).

**📌 2026-06-16 (Neue Kategorien autonom + Sortier-Fixes — CJ-Token aus /tmp/cj_token.json funktionierte):**
- **🧢 Caps & Hüte (`caps-hute`): 14 Caps** angelegt (Baseball/Bucket/Cord/5-Panel/Denim/Beret/Docker), alle Bild-QA'd
  (1 Monogramm-Knockoff verworfen), ACTIVE/6 Kanäle/kaufbar, deutsche Texte + Grössen-Hinweis.
- **💧 Wasserfester Schmuck (`wasserfester-schmuck`): 6 Edelstahl-Stücke** + Ohrhänger (HERO-Nische aus Research),
  Verkaufswinkel anlauffrei/hypoallergen/am-See + Pflege-Hinweis.
- **🌸 Parfum & Düfte (`parfum-duefte`): 48 Marken-Parfums** gesammelt (Smart-Rule TYPE=Parfum, self-füllend) —
  es gab ~48 Düfte (D&G/Hugo Boss/CK/Kenzo/YSL/Lancôme…) OHNE Parfum-Kollektion. Mehr Marken-Parfum = BigBuy (Import-Session).
- **🗂️ Sortier-Fix:** 💎 Ohrringe-Smart-Regel war nur `TITLE~Ohrring` (verpasste Ohrhänger/Creolen) → disjunktiv + TAG=ohrringe erweitert.
  **LEHRE (Gehirn `rules.kategorisierung`):** Smart-Collections per TITLE sind brittle → Tag-Match ergänzen; nach Import-Wellen prüfen ob Kategorie-Kollektion fehlt.
- **📣 Meta-Queue** um 10 BigBuy-Marken-Posts erweitert (nicht nur CJ), git-gesteuert (self-heilend, live ab `wrangler deploy`).
- **QA-REGEL verschärft:** CJ-Einträge mit **Name/Bild-Mismatch** ODER eingebranntem **Overlay-Text** verwerfen (Misrepresentation-Schutz, v.a. Merchant-Re-Review).

**📌 2026-06-15 (NEUESTER STAND — Autonomes Posten OHNE GitHub + Handy-Fernsteuerung):**
- **🚨 GitHub Actions KONTOWEIT GESPERRT** („Actions has been disabled for this user", 422 bei dispatch). Kein
  Repo-Toggle hilft (account-level). → **Kein Cron-Workflow läuft.** `git push`/PR-Merge gehen weiter. Ersatz =
  Cloudflare-Worker (gratis Cron) + PC-Tagestask. (User-Fix nur via GitHub-Billing/Support.)
- **✅ AUTONOMES POSTEN (so läuft es jetzt, MERKEN):**
  · **IG + FB** = Cloudflare-Worker `luxe-poster` (Cron 3×/Tag 12/17/21 CH) — **kein PC/GitHub nötig**. Handy-Trigger
    `https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B` (`+`=`%2B`). Postet nächste Queue-Zeile.
  · **💬 Kommentar-Auto-Antwort** im Worker eingebaut (IG+FB, themen-erkennend, Spam-Skip, KV-idempotent) — läuft bei
    jedem Cron, Trigger `&replies=1`. **Braucht 1× `wrangler deploy`** (Worker-Code aktualisieren).
  · **🛒 tutti + 🎵 TikTok** haben **KEIN API** → nur über den eingeloggten **Brave-Port 9222 am PC**. Laufen im
    PC-Tagestask `run-follower-daily.ps1` (tutti `tutti-post.mjs` AUTO_PUBLISH=1 Cap2/Tag; TikTok `tiktok-upload-browser.mjs`).
- **📱 HANDY-FERNSTEUERUNG (NEU, MERKEN):** Worker hat eine **Befehlswarteschlange** — Handy pusht `&cmd=tutti|tiktok|
  follower|all|deploy`, der **PC-Listener** `automation/local/pc-listener.ps1` (Start: `START-LISTENER.bat`) pollt alle
  90 s `&drain=1` und führt es am PC aus. So steuerst du die PC-Browser-Aufgaben komplett vom Handy (`control.html`-Knöpfe
  🛒/🎵/⚡). Auch `&del=<POST_ID>` (einen FB-Post löschen). **Cloud kann den PC NICHT direkt erreichen** — nur über diese Queue.
- **✅ Google Merchant:** beide Policy-Tippfehler gefixt + Rückgaberichtlinie konfiguriert + **Re-Review abgeschickt 15.06.**
  (NICHT nochmal!). Märkte CH-only. **tutti-Inserate** `dropship/tutti_listings.csv` (11: 7 CJ + 4 Marken) + FB-CH-Gruppen-Posts fertig.

**📌 2026-06-14 (grosse autonome Session):**
- **🎵 Musik-Tool** `automation/music/music_library.mjs` (kommerziell-frei, Kevin MacLeod CC-BY 4.0, Auto-Attribution
  `CREDITS.md`) ersetzt den „zu billigen" GM-Synth. **🎬 Marken-Video 60s+30s** (`render_brand_video.py`).
- **🈂️ SAFE-ZONE-TEXTREGEL** (User „schrift unten achtung"): eingebrannter Text endet bei ~78 % Höhe, nie unter der
  Plattform-Caption. Im Gehirn (`rules.production`) + `finish_reel.sh` + `render_masterpiece.sh`. Alle 4 Reels neu gerendert.
- **🤖 Vollgas-Audit (6 parallele Agenten):** Conversion-Leak = Session→Warenkorb (0,32 % ATC). **LIVE gefixt:**
  DACH-`/de-de/`-Storefront gelöscht (Strikt-CH!), `/collections/kleider`-404→Redirect, `highlights` in 6 Kanäle.
  **🈲 28 Produkte mit Watermark/Overlay/asiat. Schrift archiviert** (150 cj-real geprüft, ~19 % Treffer → Auto-Import
  braucht Bildfilter; `image-audit.mjs` + `GEMINI_API_KEY`). Markt 2026: Statement-Schmuck/Beauty/Herbst-Accessoires.
- **📱 Worker erweitert:** postet jetzt **FB-Stories + echte FB-Reels** (vorher übersprungen) → FB-Nudges erledigt.
- **🆙 9 Videos auf CDN gehoben + in Gehirn-Queue:** 4 Safe-Zone-Reels + Marken-Video + **5 «Selbst-gestalten»-Veo-Clips**
  (versteckt, einzigartiger POD-Content). **Tages-Rotation** im Reel-Picker (23 Reels rotieren über ~4 Tage = Vielfalt).
- **🔴 OFFEN nur User:** (1) `wrangler deploy` (FB-Stories + neue Queue), (2) **Pixel + CH-Kampagne**,
  (3) Zirkonia-Ring (archiviert, aber Top-Ad-Landing), (4) `GEMINI_API_KEY` (Katalog-Bild-Audit), (5) Klaviyo
  `websiteUrl`/Währung + Browse-Abandonment-Flow. FR/IT/UK/US/Global-Märkte enabled → erst nach CH-Conversion.

**📌 2026-06-13 (16 neue Produkte hand-kuratiert + 3 Video-Pipelines):**
- **🛍️ +16 neue cj-real-Produkte** (Runden 1–6, CJ-Access-Token transient) — alle ACTIVE, Bild visuell QA-geprüft,
  in alle 6 Publications publiziert. Methode: gezielt suchen → **jedes Bild ansehen** → nur saubere Treffer
  (keine Text-Overlays/Collagen/Asiaten-Hauptbilder). Runde 6 via **6 parallele Recherche-Agenten**. Liste +
  IDs in `dropship/CJ-IMPORT-ZIELE-2026.md`. Gefüllte Lücken: Haustier, Pool/Strand, Grill, Garten, Schmuck (S925),
  Reise/Outdoor (Camping-Stuhl, Weekender), Audio (Retro-Plattenspieler-Speaker), Beleuchtung.
- **🎬 PRODUKT-VIDEOS — 3 Pipelines gebaut & committet** (`dropship/PRODUKT-VIDEOS.md`, alle no-op-sicher):
  CJ-`productVideo` ist praktisch immer leer → Videos selbst holen. **C (empfohlen, copyright-sauber):**
  `automation/luma_product_video.mjs` = Luma Image-to-Video aus dem Produkt-Hauptbild. **A:**
  `automation/local/ae-video-fetch.mjs` = AliExpress-Video über PC-Claude-Browser (AE blockt Cloud-Scraping 403).
  **B:** `automation/aliexpress_video_api.mjs` = AE Open-Platform-API (signiert). Gemeinsamer Attach-Baustein
  `automation/attach_video_to_product.mjs` (stagedUpload VIDEO + productCreateMedia). Ziel-Liste `dropship/ae-targets.csv`.
- **🔑 Luma-Key (2026-06-14 verifiziert):** Der RICHTIGE Key beginnt `luma-6ac83c2b-…` (Dream Machine, „lumalabs")
  → getestet OK, **Guthaben 9 672 Credits** (≈ $96 ≈ ~550 Flash-Clips). Der `luma-api-XgM…`-Key ist FALSCH (Agents,
  403/teuer). **Key-WERT NIE ins Repo** — User pastet ihn transient bzw. als Secret `LUMA_API_KEY`. Attach aus der
  Cloud via **MCP (stagedUploadsCreate+productCreateMedia) + `curl` für die Bytes**.
- **🏦 LUMA-GUTHABEN (für später gemerkt, User 2026-06-13):** Dream-Machine-Konto (Flash) hat **~10 000 Credits
  ≈ $100 ≈ ~550 Flash-Clips** (1 Credit ≈ $0.01). **Für künftige Videos/Reels/Stories nutzen — immer `ray-flash-2`
  (günstig), NIE ray-3.2 (~$3/Clip, Agents-Konto leer).** Details + Tools: `dropship/PRODUKT-VIDEOS.md`.
  Bisher **~90 Produktvideos** live; Rest des Katalogs + Social-Reels/Stories damit machbar.

**📌 2026-06-12 (Autonomie verankert + Schweizer-Follower-Maschine):**
- **🔒 AUTONOMIE-REGEL (FEST, User 2026-06-12 „verankern"):** Laufender Betrieb = **vollautonom ohne PowerShell**
  für den User — über GitHub-Secrets + Workflows, ausgelöst per Zeitplan ODER **einem Tipp auf dem Handy-Widget**
  (`control.html`, Doku `dropship/HANDY-STEUERUNG.md`; Android = App „HTTP Shortcuts", Token nur Actions:write).
  Autonom: TikTok-Analyse (täglich), IG/FB Bild+Reel posten, TikTok-Entwürfe, Metricool öffentlich, **FB-Profil per
  Graph-API** (`fb-profile-polish.yml`), Shop/Produkte/SEO/Reviews via Shopify-MCP. **EINZIGE Browser-Ausnahme:
  IG/TikTok Profil-Edit UND Follower-Wachstum** — dafür gibt es bei KEINEM Anbieter eine API → läuft NUR über den
  **immer laufenden PC-Claude (Brave-Agent, Port 9222)**; der User tippt dafür **keine Konsole**, sagt nur eine Chat-Zeile.
- **🇨🇭 Schweizer-Follower-Maschine gebaut (`automation/local/ch-follower-growth.mjs`, eigenständig, Playwright-CDP):**
  Holt ECHTE CH-Follower (NIE Kauf/Fakes) durch gezieltes Folgen+Liken der Zielgruppe unter CH-Hashtags
  (#schweizmode/#ootdschweiz/#zürichstyle/#swissmade/**#bern**/#berncity … IG · #schweiz/#fypschweiz/#swisstiktok/**#bern** … TikTok).
  **Sicher gegen Sperren:** Tages-Caps (IG 40/TikTok 30), randomisierte Pausen 25–70 s, idempotenter Ledger
  `ch-growth-ledger.txt`, **keine Auto-Kommentare**, Stopp bei „Action blocked". Läuft am PC-Claude:
  `node ch-follower-growth.mjs` (1×/Tag = stetiges Wachstum). Doku: `dropship/CH-FOLLOWER-WACHSTUM.md`.
  **+ Entfolge-Begleiter `automation/local/ch-unfollow.mjs`** (User „ja bau"): entfolgt nach ~14 Tagen die
  Nicht-Zurückfolger (Ledger mit Zeitstempel; behält „Folgt dir"-Accounts in `ch-unfollow-kept.txt`); Cap 50/Lauf,
  Pausen 20–55 s, idempotent. 1×/Woche am PC-Claude. Hält die Following/Follower-Ratio sauber.
- **🔁 „update dich immer" (FEST, User 2026-06-12):** Memory **laufend** aktuell halten — nach jeder Charge CLAUDE.md/
  Report-Dateien nachführen, damit jede neue Session nahtlos weitermacht. Reports unter `reports/`.
- **📊 Social-Analyse 2026-06-12 (`reports/ANALYSE-SOCIAL-2026-06-12.md`):** TikTok 40 Videos / 9 380 Views / Ø 234 /
  **0 Shares** → Engpass = **Reichweite**, NICHT Content. **Gewinner-Format (datenbelegt): Produkt + konkreter Preis**
  (Boho-Midi CHF 39.90 = 797 V) **+ Mundart** („Mach dys eiges Teil" 792 V). **Verlierer: generische Marken-/Kategorie-
  Karten** (6–19 V) → NICHT mehr einreihen. **Poliert:** 21 offene Captions (Bild+Video) mit echtem CHF-Preis (live aus
  Shopify) nach dem Produktnamen + **#bern** ergänzt. Künftig Posting-Mix = mehr Produkt+Preis & Mundart.
- **📘 Meta-Audit:** 55 IG/FB-Posts live; Posten steht seit ~11.06. (Actions-Sperre). Engagement-Insights nur mit
  Graph-Token (Secrets, nicht in Cloud) → via `analytics-learn`/PC-Claude. 06-08 hatte 26 Posts (Spam) → künftig
  2–3 hochwertige/Tag. **🛍️ Produkt-Analyse:** bewertet (Social-Proof) = Smartwatch 5,0★/Gemüseschneider 5,0★/
  Robo-Ventilator 5,0★; **8 neue Produkt-Posts** (3 bewertet + 5 nie gepostet: Gala/FlexHold/Glow/Cloud/Lino) in
  `social/posts_image.csv` eingereiht (ready, 13.–16.06., Gewinner-Format). Nächster Hebel bleibt Reichweite.
- **💬 DM-Auto-Antwort (User „habe viele"):** API-Weg bleibt von Meta blockiert (App-Review nötig). NEU & heute
  nutzbar: **`automation/local/ig-dm-browser.mjs`** (Browser über PC-Claude, Themen-Erkennung inkl. Retoure/
  Bestellung/Design, idempotent `ig-dm-done.json`, Cap 15, `--dry`). API-Templates (`ig-dm-reply.mjs`) ebenfalls
  erweitert. **🎞️ Alle Formate gefüllt:** +8 Stories (`story_queue.csv`, CDN), 11 Reels ready, 8 Produkt-Posts.
  **📱 `control.html`/`HANDY-STEUERUNG.md`** jetzt 9 Buttons (inkl. 📖 Story, 💬 DMs, 📌 Pinterest).
- **📌 PINTEREST — KOLLISION VERMIEDEN (User 2026-06-13 „übernimm pins, nicht kollidieren/doppelt"):** Beim Mergen
  entdeckt: eine andere Session hat bereits ein **vollständiges Pinterest-System auf `main`** (`pinterest-publish.yml`
  + `automation/pinterest_publish.mjs` + `dropship/pinterest_pins.csv` = 103 Marken-Pins, idempotent via
  `dropship/pinterest_done.txt`, nutzt **dasselbe** Secret `PINTEREST_ACCESS_TOKEN`). Mein zweites System hätte
  **doppelt gepostet** → **mein Duplikat wieder entfernt** (`pinterest-autopost.*`, `pinterest_queue.csv`). Es gilt
  EIN System (das bestehende auf main). **Der vom User gesetzte Token aktiviert dieses bestehende System direkt** —
  läuft 2×/Woche (Mo&Do), sobald Actions frei ist. Handy-Button 📌 → `pinterest-publish.yml`.
- **🛍️ Kollektions-QA (User „sticker gehören nicht in taschen?"):** „Tasche «Merci/Matterhorn/Hoi»" = echte Tote-Bags
  (korrekt). ABER 3 Fremdkörper in „👜 Taschen & Rucksäcke" (Smart-Regel TITEL enthält „Tasche" zu breit) → behoben
  durch Umbenennen „Tasche/Tragetasche"→„Beutel": Gartenwerkzeug-Set, Widerstandsbänder, XL-Strandtuch (live via MCP).
- **🧹 Shop-weites Kollektions-Audit (User 2026-06-13 „saubere sachen"):** Ursache = zu breite „TITEL enthält"-Smart-
  Regeln. Fix-Muster = **konjunktiv (ALL) mit NOT_CONTAINS** statt disjunktiv (behält echte Treffer, wirft Fremdkörper):
  • 📿 Halsketten 152→75 (Regel: enthält „Kette" UND NICHT „Licht"/„Rucksack" → Lichterketten raus)
  • 💫 Armbänder 51→46 (enthält „Armband" UND NICHT „Uhr"/„Mücken" → Mesh-Uhren/Mückenband raus)
  • 👗 Röcke 33→7 (enthält „Rock" UND NICHT „Trock"/„Rocket" → Haartrockner/Trockenblumen/Rocket-Sticker raus)
  Kleider/Haustier geprüft = sauber. **NICHT auf disjunktiv zurückdrehen!** Alle Änderungen live via Shopify-MCP.

**📌 2026-06-07 (NEUESTER STAND — ZUERST LESEN: Memory aufgefrischt + Conversion-Fix):**
- **Branch-Reset:** Alle früheren Dropship-Branches (SrAs5/LehDs) sind **in `main` gemergt + gelöscht**.
  Neuer **fester Dropship-Branch: `claude/luxestyle-product-CizQ6`** (Draft-PR #401 nach `main`). Künftige
  Sessions hier committen. `dropship/SESSION-HANDOFF.md` ist **veraltet** (Stand 30.05.) — nicht mehr als
  Wahrheit nehmen; aktuell sind **dieses Dokument**, `dropship/USER-CHECKLISTE.md` (offene User-To-dos) und
  `dropship/CJ-IMPORT-LOG.md`.
- **Bestand verifiziert (live via Shopify-MCP):** **517 Produkte aktiv, davon 171 `cj-real`.** 0 Autopilot-Drafts.
- **🖼️ Voll-QA aller 171 cj-real:** 0 FAILED-Bilder, alle Media READY. Einziger Altbefund: LED-Schreibtischlampe 1 Bild.
- **🎯 Conversion-Leak behoben:** „Sommerkleid ärmellos · Schwarz" (3,54★/26 Rev.) aus Ad-Landing `/collections/sommer`
  (Tag `sommer-2026` entfernt) + Home-Page entfernt, Tag `niedrig-bewertet-nicht-bewerben` gesetzt. Bleibt in
  `damen-mode`/`kleider` kaufbar. Echte Review-Gewinner: Slim Wallet 5,0★, Herrenuhr 5,0★, Jade Roller 5,0★,
  Mini Robo-Diffuser 4,8★, Bali 4,93★, Ibiza 4,47★.
- **CJ-Creds** waren nicht gesetzt → keine neuen Importe. Kernengpass unverändert: **Reichweite** (3 User-Klicks §10).

**📌 2026-06-06 (ÜBERGABE — ZUERST LESEN: Social-Maschine wird gebaut):**
- **🎯 Grosser User-Auftrag:** vollautonome, **selbstlernende Content-Maschine** — 5 Bild-Posts + 1–2 Reels/Tag,
  gestaffelt, für **Instagram, Facebook, TikTok, Threads**; nur gut bewertete Produkte (≥4★); Reels „nicht
  wackeln" + Trend-Musik (Pro-Edit, beide Musik-Versionen); **Telegram-Status 1×/Tag**; Profil selbst
  analysieren + besser werden + Abonnenten gewinnen; ganzen Shop verbessern + Log-Punkte beheben.
  **Plan freigegeben** → Umsetzung phasenweise auf `claude/dropshipping-session-LehDs`.
- **🔑 WICHTIGSTE LEHRE:** Eine frühere Session hatte **Threads/IG/FB-Posting per Meta-Graph-API zum Laufen**
  (Scopes `pages_manage_posts`/`instagram_content_publish`, CDN, **JPG-Pflicht**, Autopilot 2×/Tag) — aber
  **NIE committet → verloren** (Tokens nicht persistent). **→ Diesmal ALLES committen.** Autopilot wird als
  `automation/social-autopost-meta.mjs` + Workflow neu & persistent gebaut.
- **Tokens sind weg (nicht persistent)** → neue Session braucht **frische Tokens vom User** vor dem Posten.
  **EIN Schritt für Dauerbetrieb:** `THREADS_ACCESS_TOKEN` als GitHub-Secret → Autopilot läuft 2×/Tag selbst.
- **Heute schon viel gepostet → Tempo drosseln** (Spam-Schutz); erster Live-Lauf erst morgen. Theme-Hover ist
  aktiv, **Katalog bleibt unangetastet**. WebP→JPG-Pipeline für Bestseller-Bilder dokumentiert.
- **🟡 3 manuelle User-To-dos:** (1) `THREADS_ACCESS_TOKEN`-Secret setzen; (2) Doppel-FB-Seiten löschen —
  **nur „LuxeStyle CH" `1049840534888592` behalten**, ABAN nicht; (3) PureMax-Reel auf IG löschen.
- **Branch-Hinweis korrigiert:** `SrAs5` **existiert** auf dem Remote (neuester committeter Dropship-Stand
  bis 06-05: Premium-Texte, `reviews-import.mjs`). Diese Session arbeitet auf **LehDs** und hat das
  `reviews-import`-Tool gezielt von SrAs5 übernommen (Render-Engine/Musik/good_products sind identisch).
- **✅ GEBAUT & COMMITTET diese Session (alles persistent!):**
  - `automation/social-autopost-meta.mjs` + `.github/workflows/social-meta-autopost.yml` — **Meta-Autopilot**
    IG+FB+Threads (Graph-API, JPG-Pflicht, Throttle, no-op-safe), Cron 2×/Tag.
  - `automation/gen_post_image.py` + `image-render.yml` — **Bild-Generator** (5 JPG-Posts/Tag, 1080×1350+1080×1080,
    Markenband/Preis-Anker), Queue `social/posts_image.csv`, 5 Start-Creatives in `social/static/`.
  - `dropship/ads/render_premium_reel.sh` — **Dual-Export** (`<slug>.mp4` Musik + `<slug>-clean.mp4` für Trend-Sound).
  - `automation/learn_from_analytics.mjs` + `analytics-learn.yml` — **Selbst-Lern-Schleife** (TikTok → Hashtag-Pools,
    `learned_pools.sh` überschreibt auto_render-Defaults). `post-next-reel.mjs`: Telegram nur noch 1×/Tag (Digest).
  - `automation/list_by_rating.mjs` — **Rating-Lister** (≥4★ → `dropship/rated_products.csv`).
  - **`dropship/USER-CHECKLISTE.md`** — ALLE Tokens/Secrets/Klicks zum Scharfschalten (zuerst lesen für Aktivierung!).
- **Aktivierung offen (User):** Secrets setzen + Branch→`main` mergen (Cron läuft nur von main). Siehe Checkliste.

**📌 2026-06-06 (Conversion-QA-Lauf — vorher):**
- **Session ohne CJ-Creds:** `CJ_EMAIL`/`CJ_API_KEY` waren NICHT gesetzt → keine neuen Importe.
  Shopify-MCP war verbunden → Conversion-First-Routine (§10) gefahren. **Branch dieser Session:
  `claude/dropshipping-session-LehDs`**. Neue PR auf diesem Branch.
- **Voll-QA 182 cj-real Live-Produkte: 0 FAILED-Bilder.** Funnel verifiziert: WELCOME10 ACTIVE
  (10%, bis 31.08.2026), alle 6 Policies da. Landing `sommer` (52 Prod./6 Kanäle) gesund;
  `damen-mode` (292) war nur in 1–2 Kanälen → jetzt in alle 6 publiziert.
- **Möbel-Draft bereinigt:** „Shoe Rack In Wood" = sperriges Holzmöbel (§5) → aus Veredelungs-Queue
  genommen (Tag `nicht-live-moebel-sperrig`, bleibt DRAFT).
- **🔴 0 Bestellungen/14T bleibt** — Engpass ist NICHT Katalog/Funnel (beide top), sondern Reichweite.
  Autonom ist alles Mögliche getan. Es fehlen die 3 User-Klicks (§10): AGB-Domain, Pixel,
  Kampagne+Budget. **+ CJ-Creds als Env-Secrets, falls neue Produkte gewünscht.**

**📌 2026-06-05 (vorheriger Stand — Quelle: SrAs5):**
- **Reviews-Automation (Weg A=API):** Tool `automation/reviews-import.mjs` + `.github/workflows/reviews-import.yml`
  + Seed `dropship/reviews_seed.json` (importiert NUR echte ≥4★-Reviews, no-op-safe). User-Input offen:
  `JUDGEME_PRIVATE_TOKEN` (+ `JUDGEME_SHOP_DOMAIN=au3j0y-hq.myshopify.com`) als Secret. **NIE Fake-Reviews.**
  Rating-Stand: von 28 Damenmode nur **Bali 4,93★** + **Ibiza 4,47★** mit Reviews, Rest 0.
- **Meta-App für IG-Auto-Posting (Fahrplan):** App „LuxeStyle Social" (Business-Typ, KEINE Wörter
  Insta/FB/Meta/Gram im Namen), Scopes `instagram_basic, instagram_content_publish, pages_show_list`;
  IG muss Business/Creator + mit FB-Seite verbunden sein. Entwicklungsmodus reicht fürs eigene Konto.
- **TikTok-Catalog-Ad (User füllte aus):** Destination `luxestyle.ch/collections/sommer`, Identity „Luxestyle.ch",
  Ad-Texte OHNE Emoji. ⚠️ Produkt-Set zeigte Herren-Artikel → Damen-Heroes prüfen. Musik-Copyright-Warnung →
  **Commercial Music Library** nutzen. Budget erst 20 CHF/Tag testen.
- **Kachel-Layout-Fix (Theme):** `templates/index.json` alle 4 Produkt-Sektionen `image_ratio:"adapt"` → auf
  **„square"** (gleichmässige Kacheln). MAIN-Theme schreibgesperrt → Customizer/Theme-Kopie (User).
- **US-Versand:** CJ-China ~10–15 Werktage, CJ-US-Lager 2–6 Tage; US-Produkte DSers-unmapped → nur mit
  Ship-from-US bewerben, sonst CH-Fokus.

**📌 2026-06-03 (vorheriger Stand):**
- **VIDEO-PRODUKTION macht die andere Session** (GEHIRN-HACKS/ABAN Files, `video-prototypes/`) — ich (Dropship)
  baue dort NICHT weiter. ABER gesichert: **piper-TTS funktioniert im Container** (XTTS scheiterte) → Voiceover-
  Reels sind hier baubar. Rezept in `video-prototypes/HANDOFF.md`. LuxeStyle-PoC: `reels/script-sommer-20260603-1834.mp4`
  (piper-Voiceover + B-Roll pro Satz + Hook + geduckter Beat, reines ffmpeg). **TikTok-Analyzer** `tools/tiktok_analyze.py`
  (`--insecure` im Sandbox) zieht echte @luxestyle.ch-Performance — Lehre: Preis-Anker-Caption schlägt generische 20:1.
- **Gratis-Reel-Pipeline komplett & auf `main`** (Cron-Workflows laufen nur vom Default-Branch):
  `reel-render.yml` (alle 4h Reel aus `automation/good_products.csv` → `reels/auto-*.mp4`, nur geprüfte Produkte),
  `reel-autopost.yml` (alle 4h nächstes `ready`-Reel posten), `reel-analytics.yml` (alle 2T Report).
- **Autopost OHNE Make** — Eigentool wie abannews `social/post.py`: `post-next-reel.mjs` postet direkt per
  **Telegram** + über **n8n** (`PUBLISH_WEBHOOK_URL`, gratis self-hosted, `social/n8n-publish-workflow.json`) an
  IG/TikTok. Make nur Legacy-Alias. User-Setup: Secrets `TELEGRAM_BOT_TOKEN/CHAT_ID` (sofort) bzw. `PUBLISH_WEBHOOK_URL` (n8n).
- **Caption-Engine:** 5 rotierende produktspezifische Captions + 3 Hashtag-Sets (kein Triplicate-Spam).
- **Rating-Audit (Judge.me-Metafelder):** fast alle Produkte `rating=null`. Verifiziert ≥4,3★: **Bali 4,93★**,
  **Ibiza 4,47★**. **Sommerkleid ärmellos 3,54★** → bleibt aus Ads/Reels; Judge.me-Review-Fix nur per Admin (User-TODO).
- **Themen-Vielfalt:** `good_products.csv` = 14 Einträge, Accessoires (Strohtasche + Cat-Eye-Sonnenbrille, echte
  Lifestyle-Shots) interleaved zwischen Kleidern. Schmuck-Freisteller bewusst NICHT (Regel 1). Reels validiert 1080×1920.
- **Feedback-Memory:** `dropship/REEL-REGELN.md` (alle Lehren). **User-Auftrag steht: weiter autonom, dann committen + PR.**
  Merge nach `main` nur über die PR (GitHub-MCP war zeitweise rate-limited). 🔒 Telegram-Token noch rotieren.

**📌 2026-06-02 (vorheriger Stand):**
- **Shop voll optimiert (alles live, per API):** 144 Bild-Alt-Texte (ganzer Fashion-Katalog), 64 Produkt-SEO-Metas
  (Kleider+Accessoires+Schmuck), alle 20 Kleider mit cm-Grössentabelle+Trust, 15 Kollektionen starker Text/SEO,
  Menü fashion-first (70 Links). Audit: `dropship/SHOP-DESIGN-AUDIT.md`. Customizer-Auftrag: `dropship/CUSTOMIZER-TODO-FUER-CLAUDE.md`.
- **Customizer (User/Browser-Claude) erledigt+verifiziert:** Hero „Sommer-Mode 2026 — Premium-Looks für jeden
  Auftritt" + Button→`/collections/sommer` (lädt live), Ankündigung „Gratis-Versand ab 65 · –10% WELCOME10 · 30T
  Rückgabe", „View all"→„Alle anzeigen". LAUNCH30 abgelaufen (kein Konflikt). OFFEN: Button-LABEL „Damenmode
  entdecken" (bei Fetch noch alt → prüfen), Hero-MODEL-FOTO (User-Upload), Sticky-ATC + Judge.me-Sterne auf Kacheln,
  ⚠️ Admin-URL im Ankündigungs-Link-Feld fixen.
- **2 Premium-Reels freigegeben & posting-bereit** (Telegram msg 54 «Eleganz», 61 «Sommer»; Buttons dran) →
  Make-Pipeline postet nach Tap. luxestyle_premium.mp4(#52) auch frei.
- **🔴 KERNPROBLEM bleibt: 0 Käufe.** AUSWERTUNG 2.6. (14T): 1.971 Sessions, ABER **~0% Add-to-Cart**, 0 Käufe.
  Traffic 7T: direct 772 (Bot/Junk) + tiktok 557 (breit/low-intent); Geo CH 832/US 196 (richtig); Landing richtig
  (sommer/damen-mode). Bestand kaufbar (tracked:false). → **Nicht der Shop, sondern Traffic-Qualität.**
  **NÄCHSTE AKTIONEN:** (1) 2-Min-ATC→Checkout-Beweistest am Handy. (2) NUR User: TikTok-Kampagne Ziel
  „Conversions/Complete Payment", Pixel D8EKVR, CH/Frauen/18–34/DE+FR, Premium-Reels; alle Auto-/Reichweite-
  Kampagnen AUS. (3) Pixel henne-ei: erst „Add to Cart"-Optimierung bis Events, dann „Kauf". Details: CJ-IMPORT-LOG 2.6.

**2026-06-01 (Tagesabschluss): Kompletter Turnaround — Shop VOLL VERKAUFSBEREIT + beworben.**
Morgens: 1.596 Sessions/14T, aber **0 Käufe / Conversion 0,0 % / Add-to-Cart 0,13 %.** Root Cause:
**kein TikTok-Pixel** + kaputte Funnel-Elemente. Abends: alle Blocker gelöst, Kampagne live.

**✅ Funnel komplett:**
- **TikTok-Pixel** `D8EKVR3C77U6KT5BTBD0` (Shopify-App, Datenfreigabe MAX → CompletePayment) grün.
- **Kampagnen-Landingpage** `/collections/sommer` (fehlte = 404!) → Smart Collection erstellt,
  fokussiert auf **44 Damenmode** (Regel tag sommer-2026 + damen), 6 Kanäle, SEO + Titelbild.
- **Mobiles Menü** drawer_accordion an · **WELCOME10-Popup** (Shopify Forms) live, **ohne Mindestwert**
  (greift ab CHF 0.01) · **Judge.me Reviews** (Sterne, 56 Reviews, Auto-Mail 14T) · **Homepage** fashion-first.
- **SEO** auf ~20 Kollektionen + 18 Fashion-Produkte. **Bild-QA ganzer Katalog: 0 FAILED.**

**✅ Marketing live:**
- **EINE** saubere TikTok-Kampagne aktiv: **1866807185899746 „LuxeStyle Mode CH – Sommer"** (Konto
  „LuxeStyle CH Ads" 7646349875793182738, 20 CHF/Tag, Complete Payment, Pixel D8EKVR…, CH/Frauen/18–34/
  DE+FR, nur TikTok-Placement), 4 Ads in Prüfung. Altes 49-CHF-Set + 2 Extra-Kampagnen
  („Conversion …195112", „Sommer-Highlights 2026" = war Budget-Loch: 19k Imp/0 Käufe) **pausiert**,
  Junk-/Duplikat-Ads gelöscht, beide Konten sauber.
- **8 Klaviyo-Flows LIVE** (DE+EN/US: Abandoned, Welcome, Post-Purchase, Win-Back). Absender auf
  **info@luxestyle.ch** geändert. Welcome-Template T7bFP4.
- **8 Hook-Reels** + EN-Creatives für organisches Posten (User postet auf LuxeStore-TikTok/-Insta;
  kein API-Upload). Skripte `render_hook_reel.sh` / `render_story_reel.sh` / `render_story_creatives.sh`.
- US-Markt aktiv (USD); 6 US-Produkte (5 aktiv, Straw-Bag Entwurf).

**OFFEN (nächste Session / User-Klicks):**
1. **Klaviyo Domain-Auth** — DNS-Records eintragen (NS `send`→ns1–4.klaviyo.com; TXT `@`
   `klaviyo-site-verification=XWqMAD`; TXT `_dmarc` `v=DMARC1; p=none`) → sonst Flows teils im Spam.
2. **Judge.me-Reviews auf die KLEIDER** importieren (Ads landen dort, noch 0 Reviews).
3. **US:** Straw-Bag-Bild <25 MP + **DSers-Mapping (alle 6 unmapped!)** + EN-Übersetzung (Translate & Adapt).
4. **Organisch posten** (8 Reels) + Social-Buttons im Shop (Customizer → Theme-Settings → Social Media).
5. **Nach 2–3 Tagen Daten → „Auswertung"** (kommen jetzt Add-to-Cart/Käufe vs. heute 0?).

**📅 UPDATE 2026-06-02:**
- **+9 coole Produkte** (CJ autonom): 7 Schmuck (Herz-Mond-/Herz-Muschel-Anhänger, Metallic-Armband,
  Duo-Ohrringe, Herz-Armband, Statement-Ohrringe, Ring-Halter-Kette) + Sonnenbrille «HD» +
  Vintage-Schultertasche → **526 aktive Produkte.** Alle ACTIVE/6 Kanäle/Bilder READY/korrekt einsortiert.
  **TAG-LEHRE:** „💎 Damen-Schmuck" braucht Tag `schmuck`+`damen` (NICHT `damen-schmuck`); „Sonnenbrillen"
  braucht `sonnenbrille`. Neue Such-Skripte: `cj_cool_search.mjs`/`cj_cool_enrich.mjs`/`cj_cool2_search.mjs`.
- **Judge.me-Reviews auf 5 Kampagnen-Kleider importiert (123):** Mini-Kleid 4.7★, Sandalen 4.7★,
  Boho-Set 4.6★, Maxirock 4★ — **⚠️ ABER Sommerkleid ärmellos nur 3.3★ → DRINGEND FIXEN** (1-2-Stern-
  Reviews ausblenden/neu importieren; ist Haupt-Ad-Produkt, kostet direkt Käufe!).
- **Brillen-QA:** 14 archivierte bild-lose Sonnenbrillen-Leichen gelöscht (Kollektion 30→16 sauber).
- **Archiv-Backlog 4.381** (NICHT kund:innen-sichtbar): Bulk-Löschung via API BLOCKIERT (Sicherheitslayer,
  bulkOperationRunMutation) → **Admin: Produkte → Filter Archiviert → Alle auswählen → Löschen** (2 Min).
- **Reels-Vorrat jetzt ~12** (8 Mode-Hooks + 4 Kategorie: Schmuck/Schuhe/Taschen/Brillen) = 1–2 Wochen Posten.
- **Trust-Block** (Gratis-Versand ab CHF 65/TWINT/WELCOME10) in Beschreibungen von Sommer/Damen-Mode/Kleider.
- **TOP-OFFEN bleibt: Sommerkleid 3.3★ fixen** + Kampagne 2–3 Tage laufen lassen → „Auswertung".
  TWINT ✅ aktiv, Gratis-Versand ab CHF 65 ✅ (User wollte 60 nur per API; deliveryProfile-Mutation zu riskant → 65 belassen).

**📅 UPDATE 2026-06-02 (Abend) — Tiefen-Audit + Premium-Kampagne:**
- **Auswertung (677 Sess/3T, weiter 0 Käufe):** Landingpages sommer/damen-mode/home/gadgets/Zirkonia-Ring/highlights.
  1 abgebrochener Checkout in 14T (Funnel geht grundsätzlich). Such-Begriffe via API nicht abrufbar.
- **WURZEL des Müll-Traffics gefunden:** Die **TikTok-Shopify-App erstellt automatisch WELTWEITE „Smart"-
  Kampagnen.** Das weltweite Ring-Leck („Conversion 20260601195112", 50+ Länder/1,65 Mrd) ist bereits
  PAUSIERT. 3 Auto-Smart-Entwürfe (Sales2026…) im Zweitkonto noch da → MÜSSEN gelöscht + App-Auto-Ads AUS.
- **„LuxeStyle Mode CH – Sommer" lieferte nie:** Anzeigengruppe PAUSIERT („Änderung nicht genehmigt") →
  nur 14 Sessions. → Durch neue Premium-Kampagne ersetzen.
- **3 Pixel** — nur `D8EKVR3C77U6KT5BTBD0` (Shopify-verbunden) verwenden; D8EQE4 („pix") + D85BAG ignorieren/löschen.
- **PREMIUM-Reel gebaut:** `dropship/ads/render_premium_reel.sh` → `luxestyle_premium.mp4` (19,6s, edles
  Intro/Outro, 6 Mode-Shots, langsame Fades, elegant-Track). Für die neue Kampagne.
- **Brillen bereinigt:** 4 klar-glasige raus (Spice/Pliage/Clubmaster/Statement), 1 neue getönte «Street»
  importiert. **NEUE CJ-Skripte:** cj_cool_search/_enrich/_cool2/_brillen_search. Lehre: CJ-„UV400" ≠ immer getönt.
- **Archiv 4.381:** Bulk-API blockiert → Admin-Bulk löschen.
**AKTIONSPLAN (Reihenfolge):** (1) TikTok-App Auto-Smart-Kampagnen AUS + 3 Entwürfe + Vatertag-Test löschen;
(2) Sommerkleid 3.3★ → 4.5★ fixen; (3) NEUE Premium-Kampagne (luxestyle_premium.mp4, Pixel D8EKVR, CH/
Frauen/18–34/DE+FR, Complete Payment, 20 CHF/Tag, policy-konform) + alle anderen pausiert lassen;
(4) Reels organisch posten; (5) 2–3 Tage laufen → „Auswertung".
**📅 UPDATE 2026-06-02 (Reels #2+#3):** 2 neue Premium-Reels im #52-Stil, **nur echte Model-/Lifestyle-Shots**
(weisse Freisteller, Mirror-Selfie, Varianten-Grid bewusst verworfen): **«Eleganz»** (Noir/Sirène/Lumea/
Provence/Casa, 17s) + **«Sommer/Boho»** (Brise/Daisy/Dos-Nu/Bluette, 15s), beide elegant.wav + Marken-Intro/
Outro. Einzeln an Telegram (msg 54/55) zur Freigabe geschickt. **User meldet Make.com-Approval-Pipeline
„fertig"** (scenarios/6001019) → nach „ja" postet die Pipeline. Reels: /tmp/relA, /tmp/relB.

**🎥 VIDEO-REVIEW-WORKFLOW (User-Wunsch, Detail im Log):** Reels EINZELN per Telegram-Bot (curl sendVideo,
chat_id 164567631) zur Vorschau schicken → User antwortet in Telegram (Claude liest via getUpdates) mit
ja/nein/Kommentar → bei „ja" freigegeben. Posten = manuell/Make.com (Claude kann nicht auf TikTok posten).
Make.com-Pipeline (alle 8h) + Approval-Button-Payload im Log. Präferenz: Premium-Look, Mode+Schmuck+
Accessoires, KEINE Gadgets. `luxestyle_premium_mix.mp4` ist freigegeben. Skript render_premium_reel.sh (SEG/T via Env).

**Docs/Assets:** GRATIS-WACHSTUM.md (Reels/Pinterest/Email), CONVERSION-BOOSTER.md, MARKETS-US-UK-SETUP.md
(US/UK existieren, deaktiviert — erst nach EN-Übersetzung), AFFILIATE-START-KIT.md (UpPromote 15 %),
MENU-KOMPAKT-GALAXUS.md, manifest_en.tsv. **Volle Tageshistorie + IDs: `dropship/CJ-IMPORT-LOG.md`.**
**Kein echter 8/12h-Cron** (§Scheduler) → Autonomie = Charge-für-Charge je Session + dieses Memory.
**Workflow neue Produkte:** Token-Cache `/tmp/cj_token.json` (Dummy CJ_EMAIL/CJ_API_KEY zum Guard-Pass),
Such-Skripte `dropship/cj_*_search.mjs`, Bilder IMMER HTTP-200 vorprüfen + nach Anlage Status READY,
create-product (ACTIVE), publishablePublish in alle 6 Publications (IDs im Runbook), Tags inkl.
gender/kategorie passend zu Smart-Collection-Regeln. **IMMER erst CJ-IMPORT-LOG lesen vor dem Anlegen
(Doppel-Import-Falle!).** Archiv-Rest löschen (~4.700, Admin-Bulk) weiter offen. Siehe Runbook §8–§10 + Log.
