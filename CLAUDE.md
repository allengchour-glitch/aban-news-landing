# CLAUDE.md — Projekt-Gedächtnis

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
   Produkte ergänzen. Committen, auf `claude/dropship-lade-memory-SrAs5` pushen, Stand melden.
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
- **Branch:** alles auf `claude/dropship-lade-memory-SrAs5`, PR #5. Nie nach main pushen.
- **Scheduler (`CronCreate`/`ScheduleWakeup`) ist hier nicht aktiv** → kein echter Cron-Loop
  über Stunden möglich; Autonomie = Charge für Charge in der laufenden Session, plus dieses
  Memory, damit jede neue Session nahtlos weitermacht.

## Stand
**📌 2026-06-05 (AKTUELLSTER STAND — zuerst lesen, dann 06-03 etc.):**

**Heute erledigt (live per API):**
- **Alle 6 neuen Produkte auf Premium-Text gehoben** (Aurélie 15416342675841, Bureau 15416343757185,
  Capucine 15416343986561, Lussa 15416470208897, Lina 15416491704705, Riva 15416493506945): Trust-Box
  (#faf7f2/#e8dcc4, 2×2-Tabelle) + Benefit-Bullets + „Warum bei LuxeStyle CH". Lehre: neue CJ-Produkte IMMER nachziehen.
- **Bilder-Check ganzer aktiver Katalog:** KEINE fehlenden/kaputten Bilder. Ganze Damenmode (29) + ~250 Sample alle READY.
  Einzige Macke behoben: **HEPA Luftreiniger (15401529540993)** + **Pillow Spray (15406134493569)** hatten ein VIDEO
  als 1. Medium → per `productReorderMedia` Foto nach vorn (korrektes Kachel-Thumbnail).

**🟡 VORGEMERKT „später" (User-Auftrag, Details in `dropship/SEITE-VERBESSERUNGEN.md` §VORGEMERKT):**
- **[C] 1-Bild-Gadget-Filler** (Mini-Massagepistole, Diffuser, Gewichtsdecke, Galaxus-Batch `15410836xxxxx` …):
  das 1 Bild durch ein sauberes ersetzen, dann User-Entscheid ob bleibt. **LEHRE:** diese Produkte haben KEINE
  gespeicherte CJ-pid/SKU; CJ-Keyword-Resuche unzuverlässig (Test „mini massage gun": 40 Treffer, 0 Hash-Match)
  → mehr Originale nur sicher mit echtem AliExpress-Link. **User-Entscheid C, aber „mach das später".**
- **[Kachel-Layout]** Startseite: alle 4 Produkt-Sektionen in `templates/index.json` haben
  `_product-card-gallery → "image_ratio":"adapt"` → ungleiche Kachelgrössen. **Fix:** auf **„square"** stellen
  (gleiche Box/Position, Desktop+Mobile). MAIN-Theme API-schreibgesperrt → Customizer ODER ich baue unveröff.
  Theme-Kopie (User tippt nur „Veröffentlichen"). Sektionen: ⭐Top10, ✨CJ Neuheiten, Highlights, 🔥Bestseller.

**⭐ BEWERTUNGEN AUTOMATISIEREN (laufend — User wählte Weg A = API):**
- **Tool gebaut & gepusht:** `automation/reviews-import.mjs` (Judge.me-API, importiert NUR ECHTE Reviews aus
  `dropship/reviews_seed.json`, no-op-safe) + Workflow `.github/workflows/reviews-import.yml` (manuell, DRY-Option).
- **User hat aktiviert:** Judge.me → „Review-Einreichungen über Integrationen (API)" = AN.
- **OFFEN/User-Input:** Judge.me **Privat-Token** holen (Shopify Apps → Judge.me → General Settings → Integrations
  → „View API Token" → **Private Token**) → als Secret `JUDGEME_PRIVATE_TOKEN` (+ `JUDGEME_SHOP_DOMAIN=au3j0y-hq.myshopify.com`)
  ODER im Chat einfügen + danach in Judge.me neu generieren. UND je Hero-Produkt eine **AliExpress-URL** (echte Quelle).
- **Empfohlene Alt-Route (kein Token):** Judge.mes **eingebauter AliExpress-Importer** (App → Import → AliExpress
  → URL → Produkt zuordnen). **REGEL: NUR ≥4★ importieren** (1–3★ drückte früher Sommerkleid auf 3,5★!).
- **Rating-Stand:** von 28 Damenmode haben NUR **Bali 4,93★(15)** + **Ibiza 4,47★(15)** Reviews; die anderen 26 = 0.
  Sterne-Widget auf Kacheln = Customizer (User). **NIEMALS Fake-Reviews (illegal).**

**📣 TIKTOK-KAMPAGNE (User füllte Catalog-Ad aus — beim Wiederaufnehmen prüfen):**
- **Pflichtfelder:** Destination URL = `https://luxestyle.ch/collections/sommer` · Identity = „Luxestyle.ch" ·
  Ad-Texte OHNE EMOJI (5 Preis-Anker-Texte geliefert, je <100 Z.).
- **⚠️ WARNUNG:** Preview zeigte HERREN-Artikel (New-York-Admirals-Tee, Herren-Sommershirt «Breeze») → Produkt-Set
  prüfen: Damen-Heroes statt zufälliger Herren, sonst getrennte Ad-Sets Damen/Herren.
- **Musik-Copyright-Warnung** in 2 Creatives → „Fix in editor" → **Commercial Music Library** (lizenzfrei). Reels
  künftig gleich mit Commercial-Library-Sound rendern. Budget-Tipp 42 CHF NICHT blind → erst 20/Tag testen.

**📲 META-APP für IG-AUTO-POSTING (laufend, User will „auto"):**
- App erstellen (developers.facebook.com): Name **„LuxeStyle Social"** (KEINE Wörter Insta/Instagram/Facebook/FB/Meta/Gram —
  sonst Ablehnung), E-Mail `info@luxestyle.ch`, App-Typ **Business**.
- **Fahrplan:** App → Produkt „Instagram"/Graph API → IG-Konto mit FB-Seite verknüpfen → **Token** mit
  `instagram_basic, instagram_content_publish, pages_show_list` → Token + IG-Business-Account-ID in **n8n**
  (`PUBLISH_WEBHOOK_URL`, `post-next-reel.mjs`). **Entwicklungsmodus reicht fürs eigene Konto** (keine App-Prüfung nötig).
- **VORAUSSETZUNG noch unbestätigt:** IG muss **Business/Creator** + mit **FB-Seite** verbunden sein (sonst kein API-Post).
- **Einfachere Alt-Route falls gewünscht:** Meta Business Suite Planer (business.facebook.com → Planer, kein App-Bau).

**🇺🇸 US-VERSAND (User-Frage):** CJ→US Standard (China-Lager) **~10–15 Werktage**, **CJ-US-Lager 2–6 Tage**, +1–3 Tage
Bearbeitung. **US-Produkte sind DSers-unmapped (keine CJ-pid)** → Lager nur in **DSers** prüfbar („Ship from" →
„United States" wählbar = US-Lager). Konsistenz-Falle: DE-Texte sagen „Versand aus Belp" — für US-Bestellungen FALSCH
→ EN-Versandtexte müssten realistische US-Lieferzeit nennen. Empfehlung: US nur mit Ship-from-US bewerben, sonst CH-Fokus.

**📌 2026-06-03 (vorheriger Stand — zuerst lesen):**
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
