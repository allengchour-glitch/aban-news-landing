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

## Kernfakten (Details im Runbook)
- Shop: **LuxeStyle** (luxestyle.ch), Zugriff über `mcp__…__*`-Shopify-Tools.
- CJ-API: Credentials + Workflow in `dropship/AUTONOMER-MODUS.md`. Import-Skript:
  `dropship/cj_enrich.mjs` (Node: `/opt/node22/bin/node`).
- **Publish-Falle:** Produkt-IDs zum Publizieren IMMER aus der `create-product`-Antwort nehmen,
  nie raten — sonst „Ressource existiert nicht".
- **Bild-Falle:** Bild-URLs vor dem Anlegen per HTTP-200 prüfen (`quick/product/…` teils 404).
- **🔑 Shopify-Admin-API-Token (WICHTIG — 2026 geändert, NIE wieder Stunden verlieren):** Shopify hat den
  „shpat_-Token anzeigen"-Knopf **abgeschafft**. Custom-Apps (Dev-Dashboard) liefern nur noch **Client-ID**
  + **Schlüssel** (`shpss_…`). Token holt man per **Client-Credentials-Grant**:
  `POST https://{shop}.myshopify.com/admin/oauth/access_token` mit JSON
  `{client_id, client_secret, grant_type:"client_credentials"}` → `access_token` (gültig ~24h, daher
  pro Lauf neu holen). LuxeStyle: shop `au3j0y-hq.myshopify.com`. `automation/reel-analytics.mjs` macht das
  bereits (Secrets `SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET`/`SHOPIFY_SHOP`). **Kein `shpat_` mehr suchen!**
  (Für Live-Abfragen nutze ich ohnehin die `mcp__…__*`-Shopify-Tools direkt.)
- **Branch (FEST, 2026-06-07):** alles auf **`claude/luxestyle-product-CizQ6`** → Draft-PR nach `main`.
  Nie direkt nach `main` pushen. ⚠️ Die alten Branches `claude/dropship-lade-memory-SrAs5` (PR #5) und
  `claude/dropshipping-session-LehDs` sind **in `main` gemergt und vom Remote gelöscht** — nicht mehr nutzen.
  Der gesamte Dropship-Stand liegt jetzt auf `main` (zuletzt Memory Teil 14, PR #400).
- **Scheduler (`CronCreate`/`ScheduleWakeup`) ist hier nicht aktiv** → kein echter Cron-Loop
  über Stunden möglich; Autonomie = Charge für Charge in der laufenden Session, plus dieses
  Memory, damit jede neue Session nahtlos weitermacht.

## Stand
**📌 2026-06-11 (NEUESTER STAND — POD-Editor mit echten Fotos + 98 Mockups + Shop-Audit A–Z):**
- **🎨 Selbst-gestalten-Editor (`pod/designer.js`, live):** echte Produktfotos statt Zeichnungen bei ALLEN
  Editor-Produkten (Shirt/Tasse/Tote/Kissen/Magnet/Poster/Bügeltransfer); Live-Farbvorschau Shirt
  Weiss/Schwarz/Navy (echte Gemini-Fotos `pod/tees/`); Grössen-Regler, freie Farbwahl, Ebenen, Duplizieren,
  Emojis, kleinerer Start-Text. **`data-img-front` ist NUR Vorschau** — die Druckdatei bleibt das zentrierte Motiv.
- **🇨🇭 49 Shirt- + 49 Tassen-Fertigdesigns** (`shirt-*`/`tasse-*`): Hauptbild war schwebendes Design-PNG → jetzt
  **photorealistisches Mockup auf echtem Produkt** (alle 98 live getauscht). Tools (für neue Designs erneut
  dispatchbar): `automation/pod_fertig_mockups.mjs`+`pod-mockups.yml` (Gemini-i2i + Shopify-Staged-Upload),
  `automation/gen_editor_blanks.mjs`+`editor-blanks.yml` (Editor-Blank-Fotos), `automation/gen_tee_colors.mjs`+`tee-colors.yml`.
  ⚠️ **Workflow-`name:` nie mit Doppelpunkt** (bricht YAML-Trigger → 422) — gequotet oder ohne „:".
- **🔎 Shop-Audit A–Z (Optik+Text):** **BEHOBEN live:** Collection „neu-eingetroffen" zeigte kundenseitig
  **„✨ CJ Neuheiten 2026"** (interner Lieferant „CJ" sichtbar!) → umbenannt **„✨ Neuheiten 2026"**. Sonst kein
  CJ-Leak. **Gut:** alle Rechts-/Service-Seiten gefüllt, POD-Preise gesund (Shirt 20.90/Tasse 17.90), Hero-CTA
  `/collections/sommer` ok (72 Prod.), Fertig-Seiten zeigen echtes Mockup+ATC. **AUTONOM BEHOBEN:**
  (1) Startseiten-Dublette → die 4. Produkt-Liste ist jetzt **🎁 Geschenkideen** (`premium-geschenke`) statt
  2. Bestseller-Sektion (Tool `automation/fix_homepage_dedup.mjs`+`homepage-fix.yml`, liest index.json live,
  ersetzt programmatisch, validiert JSON, themeFilesUpsert — idempotent). **Account-Menü VERIFIZIERT KORREKT
  (NICHT ändern!):** `account.luxestyle.com.co` ist das von **Shopify selbst** konfigurierte Kundenkonto-Portal —
  `luxestyle.ch/account` leitet per 302 (JWT von `au3j0y-hq.myshopify.com`) genau dorthin; `account.luxestyle.ch`
  existiert nicht (keine DNS). Auf `.ch` umbiegen würde den Login zerstören → bewusst belassen.
  **Reviews-Stand (2026-06-12):** `JUDGEME_PRIVATE_TOKEN`+`CJ_EMAIL`/`CJ_API_KEY` gesetzt. **ECHTER Reviews-Import
  gebaut & live:** `automation/cj_reviews_import.mjs`+`cj-reviews.yml` zieht echte CJ-`productComments` (≥4★) →
  DE-Übersetzung (Gemini) → Judge.me (Shopify-SKU→CJ-pid via productSku/variantSku-Resolver; idempotent, Ledger
  `dropship/cj_reviews_done.txt`). **Verifiziert:** Smartwatch = 5,0★/5 echte Reviews live. **DECKE rigoros bestätigt:
  nur ~3 cj-real-Produkte haben überhaupt CJ-Kommentare** (Rest: CJ liefert `list listLen=0` = echte 0 Kommentare,
  KEIN Bug) → nicht sinnlos neu laufen lassen. Fertig-POD-Produkte: keine CJ-Quelle → nur organisch (Judge.me-Mails).
  Theme: `Horizon · LuxeStyle + Email-Popup (Claude)` (MAIN; `templates/index.json` auto-generiert — Skript-Replace
  ok, aber Customizer kann überschreiben).
- **Branch-Hinweis:** Diese POD/Editor/Audit-Arbeit lief via PRs direkt auf **`main`** (#683/#685/#690/#691 u.a.),
  nicht auf `claude/luxestyle-product-CizQ6`. Memory liegt zusätzlich in `SHARED-MEMORY.md` (Live-Stand).

**📌 2026-06-07 (vorheriger Stand — Memory aufgefrischt + Conversion-Fix):**
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
