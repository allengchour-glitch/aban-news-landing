# CLAUDE.md — Projekt-Gedächtnis

> 🔗 **ZUERST `SHARED-MEMORY.md` (Repo-Root) lesen** — mehrere Sessions arbeiten parallel auf diesem
> Repo + Shop; dort steht, wer was „besitzt" + der Live-Stand. CJ-Import/Katalog/Social = NUR diese Session.

Dieses Repo ist `aban-news-landing`, enthält aber mehrere Projekte. Das aktive, autonome
Arbeitsgebiet ist der **CJ-Dropship-Import für den Shopify-Shop LuxeStyle CH**.

## 🤖 Autonom-Auftrag (Dauerauftrag des Users)
Der User will den Shop **vollautonom betrieben — ohne ‚weiter' zu sagen. Oberstes Ziel: KUNDEN,
die KAUFEN.** Mehr Produkte sind dabei Mittel, nicht Selbstzweck. Bei jeder Dropship/Shop/CJ-Session:

> ⛔ **FEST (User 2026-06-20): VOLLER AUTOMODE — NIE FRAGEN.** „mache einfach alle verbesserung selber
> und so ohne zu fragen … mach einfach automode bot". KEINE AskUserQuestion, KEINE „Soll ich…?"-Rückfragen,
> KEINE Optionen-am-Ende. Einfach alle Verbesserungen selbst machen, committen, pushen, Stand melden.
> Nur echte User-only-Klicks (OAuth/Login/2FA, Bezahlungen, Ad-Budget, veröffentlichte Posts löschen) klar
> benennen — aber NICHT als Frage, sondern als „das musst du noch klicken"-Hinweis.

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
- **🌐 Browser-Agent (FEST, User 2026-06-12):** Der User hat **Brave + Playwright-MCP auf seinem PC-Claude**
  eingerichtet (Setup: `dropship/BROWSER-AGENT-SETUP.md`, Port 9222, Meta Business Suite eingeloggt).
  **Cloud-Sessions haben KEINEN Browser** — für Browser-Aufgaben (IG/FB aufräumen, Web-UI-Klicks) den User
  bitten, den Auftrag an seinen PC-Claude zu geben, ODER falls ein Browser-MCP in der Session auftaucht, direkt
  nutzen. **Dauerauftrag: IMMER maximal autonom arbeiten** — nicht fragen, machen; nur echte User-Klicks
  (Login/2FA, Löschen veröffentlichter Posts, Bezahlungen) klar benennen. **Bei Sperren/API-Lücken selbst
  einen Weg BAUEN** statt nur zu delegieren: z. B. lokales Browser-Skript via CDP an Brave
  (`automation/social-profile-polish.mjs`, `puppeteer-core`, Port 9222), eigenes Tool, anderer Endpoint.
  Profil-Edit-APIs: FB = ja (Graph, `fb-profile-polish.mjs`); IG/TikTok = NEIN → Browser-Skript/PC-Claude.
  **PC-FAKT (User 2026-06-12): der PC mit Brave-Agent (Port 9222, eingeloggt) LÄUFT IMMER** → Browser-Aufgaben
  jederzeit an PC-Claude delegierbar; Skripte: `automation/local/profil-politur-browser.mjs` (Playwright, lädt
  Profilbild automatisch) + `automation/social-profile-polish.mjs` (puppeteer).
- **🎬 Video-Präferenzen (FEST, User 2026-06-12 — `dropship/VIDEO-PRAEFERENZEN.md`):** ALLE Marketing-
  Videos **OHNE Voiceover** (on-screen Text statt Stimme) + Musik = **`automation/music/luxe-premium.wav`**
  (die „neue Musik"). Marken-Video → `reels/luxestyle-brand-*-text.mp4`.

## Stand
**📌 2026-06-15 (📧 KLAVIYO-DIAGNOSE — HARTE FUNNEL-DATEN, neue Richtung „eigene Reichweite"):**
- **Semrush-MCP = NICHT im User-Plan** (kein Zugang) → SEO-Keyword-Daten darüber nicht möglich (Plan: semrush.com/mcp-access).
- **Klaviyo-MCP verbunden** (Account `XWqMAD`, Sender info@luxestyle.ch, TZ Zürich). **E-Mail-Infra ist VOLL gebaut:**
  10 Live-Flows (Welcome DE+EN, Abandoned Cart/Checkout DE+EN, Win-Back DE+EN, Post-Purchase DE+EN, VIP) + 3 Entwürfe.
  **ABER 3 Broadcast-Kampagnen (Flash-Sale, Vatertag, Summer-Push) sind ALLE Entwurf — NIE verschickt** (vom 26.05., teils veraltet).
- **🔴 HARTE ZAHLEN (Klaviyo metric-aggregates, letzte 90 Tage, unabhängige 2. Quelle):**
  **Placed Order = 0 · Checkout Started = 0 · Viewed Product = 0** (alle Monate März–Juni je 0). Flow-Report 90T = LEER
  (Flows haben ~0 Mails versendet, mangels Auslöser/Audience). **= Bestätigt endgültig: Engpass ist 100% REICHWEITE/Traffic,
  NICHT der Shop.** Kein Shop-Polish/SEO/E-Mail-Draft ändert das — es fehlen schlicht Besucher, die kaufen.
- **⚠️ Möglicher Tracking-Bug (User prüfen):** Klaviyo-Account-`website_url` = **luxestyle.com.co**, Live-Shop = **luxestyle.ch**.
  `Viewed Product`=0 deutet auf nicht-feuerndes Onsite-Tracking (Klaviyo-JS evtl. auf falscher Domain) ODER echt ~0 engagierter Traffic.
  Server-seitige Shopify-Events (Placed/Checkout) sind aber autoritativ → 0 Verkäufe ist real.
- **Lehre für künftige Sessions:** E-Mail kann erst Umsatz bringen, wenn es eine Audience gibt. Audience entsteht aus
  (a) konvertierendem Traffic, der sich via WELCOME10-Popup einträgt, oder (b) Kontakt-Import. Beides hängt am REICH­WEITEN-
  Unlock (User-§10: Kampagne+Pixel+Budget). **Nicht weiter ins Leere optimieren** — der Hebel liegt beim User.
- **✅ Sendebereite Draft-Kampagne gebaut (User OK, NICHT verschickt):** „Sommer 2026 · Neue Looks + WELCOME10"
  (Klaviyo-Campaign-ID `01KV58TANGVR948JTV7P5650PT`, Status Draft), Premium-HTML-Template `RLxtU7` (CTA→/collections/sommer,
  Kleider/Schuhe/Schmuck-Links, WELCOME10-Box, Abmelde-Link), Zielgruppe Liste „Newsletter Subscribers" (`T2VHfu`),
  Absender info@luxestyle.ch. **Versand klickt nur der User im UI.** Ersetzt inhaltlich die 3 veralteten Drafts.
- **⚠️ Klaviyo-MCP kann KEINE Kampagnen archivieren/löschen** (kein update/delete-campaign-Tool) → die 3 alten Drafts
  (Flash-Sale/Vatertag/Summer-Push) muss der User im Klaviyo-UI archivieren. **Kampagne ANLEGEN ist auto-mode-gated**
  (Safety-Classifier blockt „Broadcast an echte Kunden" ohne explizites User-OK) — vor dem nächsten Mal explizit bestätigen lassen.

**📌 2026-06-15 (🧹 SHOP-SEO-/QUALITÄTS-BEREINIGUNG — autonom, „alle 4 Bereiche"):**
- **62 Produkte mit echten Defekten gefixt** (live via Shopify-MCP, gebatchte `productUpdate`-Aliase):
  - **10 Schweiz-Poster hatten ENGLISCHE Titel** + rohen POD-Text („…Premium Semi-Glossy Paper Print in 29 Sizes") →
    deutsche Titel + SEO. Grösster sichtbarer Defekt (English auf DE-Shop).
  - **22 Swiss-POD-Items ohne SEO** (12 Schweiz-Sticker + 10 Schweiz-Poster, neuer Batch) → SEO-Titel im Shop-Muster.
  - **6 Schweiz-Magnete** ohne SEO → SEO-Titel+Description.
  - **~24 kaputte Auto-SEO-Titel** (Defekt: „ … – Wort – Wort |…", inkl. **Herren-Mode**: Jogginghose, Stoffhose,
    Cordhose, Hemd, Outdoor-Jacke, Jogging-Set, Anzughose) → saubere Titel.
- **Methode:** `products(sortKey:UPDATED_AT)` paginiert (~590 Produkte/4 Seiten gescannt). Defekte konzentriert in der
  06-11-Import-Charge (IDs ~15411xxx/15413xxx) + neuem Swiss-POD-Batch (15427xxx). Rest des Katalogs (Sticker etc.) SEO-sauber.
- **Lehre:** Der Auto-SEO-Generator mancher Importe macht (a) englische Titel bei POD-Postern, (b) „ – "-verstümmelte
  Titel mit „|…", (c) gar keine SEO bei neuen Batches. Beim Anlegen IMMER `title` (DE) + `seo.title` direkt mitgeben.
- **⚠️ Offen (optional):** Tiefere Katalogseiten (>590) nicht gescannt — vermutlich sauber (Sticker-Muster konsistent);
  bei Bedarf Pagination ab letztem Cursor fortsetzen.
- **🔗 KAPUTTE CROSS-SELL-LINKS gefixt (wichtig, breit):** Viele Produkt-Beschreibungen (Veredelungs-Footer „Mehr X
  entdecken →") verlinkten auf NICHT existierende Collections → 404. Geprüft: `kleider`→war schon per Redirect ok;
  **`taschen-sub` + `damen-schmuck-sub` waren echt 404** → per **URL-Redirect gefixt** (`urlRedirectCreate`:
  taschen-sub→sub-taschen, damen-schmuck-sub→premium-schmuck). **Eleganter Fix: 2 Redirects statt hunderte Edits.**
  Funktionierende Footer-Handles: schuhe✓ damen-mode✓ sonnenbrillen-eyewear✓. **Lehre:** Veredelungs-Footer nutzten
  teils falsche Handles (sub-X vs X-sub) → bei neuen Cross-Sell-Links IMMER gegen echte Collection-Handles prüfen.
- **🎨 3 Look-Collections Hero-Banner gesetzt** (abend-look/office-look/strand-look hatten kein Bild) — Produktbild als Hero.
- **🔎 Abend-QA-Sweep (autonom):** Footer-Cross-Sell anderer Kategorien (Herren/Beauty/Deko/Haustier/Auto/Uhren) geprüft →
  **keine weiteren kaputten Collection-Links** (Problem war nur Fashion/Schmuck, gefixt). Zudem „Gratis-Versand ab CHF 50"
  (statt 65) gefunden — aber **ausschliesslich in ARCHIVED/DRAFT-Produkten** (Gadget/Pet/Küche-„✦"-Vorlage), **0 ACTIVE** →
  **kein Live-Defekt**, bewusst NICHT editiert (archivierter Junk). **Live-Katalog verifiziert sauber.** Lehre: CHF50/65
  nicht jagen — nur Archiv-Altlast (gehört zum Lösch-Backlog).

**📌 2026-06-15 (🎨 SWISS-EDITION WELLE-1 DESIGNS autonom generiert — 9 druckfertige PNGs):**
- **`automation/render_swiss_edition.py`** (Pillow + Anton-Font, KEINE Bild-API nötig) rendert **transparente
  Druck-PNGs ~2900px** (≈25cm@300dpi) im Design-System (Swiss-Rot/Anthrazit/Off-White/Sage). Output: `pod/swiss-edition/`.
- **17 Designs total:** Welle-1-Typo (9): hoi-zaeme · merci-vilmal · chuchichaeschtli · gmuetlech · sali-zaeme · erste-august
  (Swiss-Kreuz) · hopp-schwiiz · feierabig · grueezi. **Welle-2-Line-Art (3, `render_swiss_welle2.py`):** schwiizer-alpe (TOP,
  Berg-Panorama+rote Sonne) · matterhorn-zermatt · edelweiss (botanisch verbessert). **Zusatz (`render_swiss_extra.py`):**
  swiss-made (Emblem) + **Städte-Serie** zueri/baern/basel/luzaern (je Regional-Markt, Template beliebig erweiterbar).
  **Manifest** (`pod/swiss-edition/README.md`). **Wiederkehrender Bug-Fix:** Caption-Unterkante IMMER via `im.getbbox()[3]` messen
  (nicht fixe Offsets) — sonst überlappt die rote Caption den Haupttext.
- **Vorschau-Mockups** (`render_swiss_mockups.py` → `pod/swiss-edition/mockups/`): Design auf echter Garment-Farbe, alle dem User aufs Handy geschickt.
- **⚠️ Ink↔Garment:** Off-White-Designs (chuchichaeschtli, sali-zaeme) NUR auf dunkle Garments. Alle visuell geprüft.
- **Nächster Schritt:** PC-Claude lädt die PNGs bei Gelato hoch (DTG, Front, mittig) → Cloud-Session macht Titel/SEO/Collection/Map.
  Line-Art geht doch programmatisch (Pillow-Polylinien) — nur botanisch/komplex (Edelweiss) bleibt Schwachpunkt ohne Vektor/KI.

**📌 2026-06-15 (💳 STRIPE→GELATO-BRÜCKE gebaut — der „ohne-Shopify"-Weg, autonom):**
- **`cloudflare/src/stripe.js` + Worker-Routen** `/stripe/checkout` (Checkout-Session, CHF, Adresse) +
  `/webhooks/stripe` (checkout.session.completed → Gelato-Druck). Nutzt dieselbe `gelato_map` + `createGelatoOrder`
  wie der Shopify-Pfad (gelato.js: `createGelatoOrder`/`loadMap`/`mapEntry` exportiert). **Stripe-Signatur geprüft**
  (STRIPE_WEBHOOK_SECRET), **idempotent** (Event-ID in KV), **no-op-sicher** (ohne STRIPE_SECRET_KEY → 503).
  Mock-Tests grün: paid→Gelato-draft, Idempotenz, no-key→503, Checkout→URL, fremde Events ignoriert.
- **Storefront-Demo** `pod/stripe-checkout-demo.html` (GitHub Pages): Motiv→Cloudinary→`/stripe/checkout`→Stripe→Druck.
  **KOMPLETT OHNE Shopify** — Webhook lege ich per Stripe-API selbst an (kein MCP-Block, kein manueller Schritt).
- **User-To-do (README §Stripe):** `wrangler secret put STRIPE_SECRET_KEY` (sk_test_…) + Stripe-Webhook anlegen →
  `STRIPE_WEBHOOK_SECRET` setzen → in der Demo `CATALOG` (gemappte Variant-IDs + Preise) eintragen. Dann End-to-End live.


---
**📚 Ältere Historie (≤2026-06-14)** ausgelagert → `dropship/CLAUDE-ARCHIV.md` (hält CLAUDE.md unter dem 40k-Limit).
**🧠 AKTUELLER Live-Stand:** `SHARED-MEMORY.md` (Teil 27–64: ~390 neue Produkte, Theme-CRO/SEO per API, Google sauber, Research umgesetzt).
