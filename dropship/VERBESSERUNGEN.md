# 💡 Verbesserungsvorschläge — laufendes Log (Dauerauftrag User 2026-06-13)

> Regel: in jeder Session 3–5 konkrete, priorisierte Vorschläge; Lehren sofort ins Memory.
> Ehrliche Priorisierung — der Engpass ist **Reichweite/Conversion (0 Käufe)**, nicht Katalog/Videos.

## 2026-06-15 (spät) — Autonom-Session: 5 priorisierte Vorschläge (recherchiert + live geprüft)
> Engpass bleibt **Session→Warenkorb** (0,32% ATC) + Reichweite. Quellen: shopify.com/twint.ch/meineinkauf.ch/opus.pro.
1. **🥇 TWINT + Apple Pay + Shop Pay an ATC/Checkout sichtbar** (THEME-Session). CH-Mobile-Zahlung = grösster Hebel,
   Shop Pay bis ~50% CVR-Lift. → in SHARED-MEMORY an Theme-Session übergeben.
2. **🥈 Sticky-ATC mobil + Grössen/Fit-Block ÜBER der Galerie** (THEME). Direkt gegen den ATC-Leak. → übergeben.
3. **🥉 2026-Mundart-Preis-Hooks im Content** — 8 Gewinner-Hooks + 5 Formate ins Gehirn (`hooks_2026_mundart`,
   `content_formats_2026`); Payoff/Preis in Sek.1, Cut 0.5–1.5s, 21–60s. ✅ erledigt diese Session.
4. **Marken als Social-/tutti-Magnete** (Casio/Citizen/Hugo Boss/Tommy/Morellato/Guess) — echte Marken ziehen
   am stärksten auf Marktplatz + Feed. ✅ in good_products.csv + tutti_listings.csv (jetzt 14).
5. **Mehr Gratis-CH-Kanäle** anstossen: anibis.ch, FB-Marketplace pro Stadt, **Google Business Profile** (User: 1× anlegen),
   Pinterest weiter füttern. ✅ dokumentiert in GRATIS-WERBUNG-SCHWEIZ.md. **Google Business = nächster User-Klick.**
> Bottleneck-ehrlich: #1/#2 (Theme-Conversion) + Pixel/Kampagne bringen Käufe; Katalog/Content sind bereits stark.

## 2026-06-15 — Recherche/Lernen (studiere weiter): 2026-Taktiken ins Gehirn
- **Algo 2026:** Saves/Shares/DMs/Watch-Time > Likes (IG+TikTok). → Save/Share/A-B-Formate konsequent (haben wir).
- **Format:** authentisch/unpoliert (Try-on/BTS/Kundenreaktion) schlägt Hochglanz; 1 Idee/Video; Hook Sek.1.
- **Cadence:** 4 starke/Woche > 7 vergessliche → bestätigt: NICHT 6×/Tag spammen (wir sind auf 3 Posts/Tag).
- **Conversion (Kalt-Traffic):** Trust ab Sek.1 (eigene Beschreibungen ✓, klare Lieferzeiten, saubere Bilder, Policies);
  Paid Meta = schnellster Erstverkauf → bestätigt Pixel/Kampagne als #1.
- **⚠️ 2 Risiko-Flags neu:** (1) Follow/Unfollow-Bot kann 2026 penalisiert werden (Follower-Engagement-Lücke) → vorsichtig.
  (2) Generische Discovery-Hashtags ziehen Low-Intent → Algo-Strafe → eher nischige CH-/Produkt-Tags + Trend-Sounds.
- Alles in `automation/brain/knowledge.json` → `rules.learned_2026`.

## 📌 OFFEN — User-Zusage: **Pixel + CH-Kampagne MORGEN (2026-06-14)**
Der User macht den #1-Hebel (TikTok/Meta-Pixel + bezahlte CH-Kampagne) morgen. → In der nächsten Session
**zuerst prüfen, ob Pixel/Kampagne live ist**, und Conversion-Funnel davor sauber machen:
- Ad-Landing-Kollektion (`/collections/sommer` bzw. Damen-Mode) auf saubere, **bewertete/Video-Produkte** ausrichten.
- Nur ≥4★-Produkte bewerben; <4★ raus.
- Die ~101 Produktvideos als **Ad-Creatives/Reels** bereitstellen (Gewinner-Format Produkt+CHF-Preis+Mundart).
- Nach Kampagnenstart: 2–3 Tage Daten → „Auswertung" (Add-to-Cart/Käufe vs. heute 0).

## 2026-06-14 — Vollgas-Audit (6 parallele Agenten) + autonome Fixes
User-Auftrag „1 Stunde Vollgas, 100 Agenten, alles verbessern, autonom". 6 Spezial-Agenten parallel
(Conversion · Bild-Compliance · Markt · Content · SEO · E-Mail). Wichtigste Funde + was SOFORT gefixt wurde:

**🔴 GRÖSSTER FUND (Conversion): Leak ist Session→Warenkorb (0,32 % ATC), nicht nur Reichweite.**
- **#1-Traffic-Produkt (Zirkonia-Ring, 64 Sess) ist ARCHIVED** → tote Ad-Landing. (NICHT auto-reaktiviert — User-Entscheid.)
- **✅ FIX: DACH-Markt (Deutschland & Österreich) war ENABLED mit `/de-de/`-Storefront** = Verstoss gegen Strikt-CH.
  → Web-Presence `/de-de/` **gelöscht** (kein DE-Storefront mehr). `enabled`-Flag per API nicht umlegbar (computed) →
  Shell ohne Storefront unerreichbar; voll entfernen kann User im Admin.
- **⚠️ Auch FR/IT/UK/US/EU/Global enabled** — laut Regel erst nach CH-Conversion; nicht eigenmächtig gekillt → User-Entscheid.
- **✅ FIX: `/collections/kleider` war 404** (echter Handle `sub-kleider`) → URL-Redirect erstellt.
- **✅ FIX: #3-Ad-Landing `highlights` fehlte in Pinterest+Google** → in alle 6 Publications publiziert.
- **🟡 OFFEN:** 3★-Sold-out-Kleid noch in `damen-mode`; ~19 aktive Rabattcodes → auf 1 Hero (WELCOME10) eindampfen;
  Shipping-Policy „weltweit" + Tippfehler `info@luxestyle.com` → `.ch`.

**🈲 Bild-Compliance (50 cj-real geprüft):** KEINE asiatische Schrift / kein „MADE IN CHINA".
- **✅ FIX: 5 Produkte mit Lieferanten-Watermark/Text-Overlay ARCHIVIERT** — Flow-Hose (EN-Overlay), Frost-Hemd
  («AMASING-CITY»), Active-Shorts («HIDKAT»), Brisa-Ventilator (Masz-Overlay), Aria-Kopfhörer («OpenBuds»/«R»-Logo).
- 🟡 Soft-Flags (Fremdmarke im Hintergrund): Como-Tasche (CÉLINE-Tüte), Estate-Sandalen (DIOR am Ärmel) — beobachten.
- **Charge 2 (Produkte 51–100): +11 archiviert** (englische Text-Overlay-Collagen: Ducky, Relax, Breeze, PureFlow,
  Paw, Tidy, Bloom, Libelle, Shelfy, Carousel, AquaDrip). **= 16 Produkte heute archiviert.**
- **🔴 SYSTEMISCHE LEHRE:** ~15–17 % der Auto-Import-`cj-real`-Produkte haben **englische Werbe-Text-Overlays auf
  dem Hauptbild** (Lieferanten-Marketing). Quelle = Auto-Import (vermutlich andere Session). → Import braucht einen
  **Bild-Overlay-Filter VOR dem Anlegen** (z.B. `automation/image-audit.mjs` mit `GEMINI_API_KEY` katalogweit laufen
  lassen), sonst muss jede Session weiter manuell QA'en.
- **Charge 3 (101–150): +12 archiviert** (USB-C-Dock, Knoten-Halskette, Handy-Ständer «HAGIBIS», Auto-Lederpflege,
  Auto-Geruchsentferner «Hikmarion», Auto-Uhr, Auto-RGB-Ständer, Grillreiniger, Keramik-Vase «Craquelé»,
  Aroma-Diffuser «Aura», **Collagen-Masken (CHINESISCHE Schrift 額部護理!)**, Vitamin-C-Serum «BOTOX/West Month»).
  Borderline NICHT archiviert: Gua-Sha «Jade» (kleines «HEMP for U»-Label, sonst sauber) → Bild-Swap statt Archiv.
- **= 28 Produkte heute archiviert (150 neueste cj-real geprüft, ~19 % Trefferquote).** Charge 3 traf ~24 %.
- **🔑 SYSTEMISCHER FIX (User):** `GEMINI_API_KEY` setzen → `automation/image-audit.mjs` katalogweit laufen lassen
  (Gemini-Vision erkennt Overlays/asiatische Schrift) statt teurer Agent-Chargen. Ist der Key da, kann ich/jede Session
  den GANZEN Restkatalog (~1100 cj-real) in einem Lauf prüfen. Ohne Key: Agent-Chargen 151+ in künftigen Sessions.

**🧠 Content (gegen 0-Shares-Decke) — ins Gehirn verankert:** +5 distinkte Mundart-Hooks (POV, Vorher-Nachher,
A/B Gold/Silber, Share-an-Freundin, Save-Liste); **`rules.share_formats`** (Save-Liste · A/B-Split · Vorher-Nachher) +
`caption_rule` (HVC, Safe-Zone, CH-Tags). Genau diese aktive Beteiligung fehlte → 0 Shares.

**📈 Markt (CH 2026):** „Quiet Luxury" vorbei → Maximalismus. Grösste Käufe-Chancen: **1. Statement-/Charm-Schmuck**,
**2. Beauty-Tools & Parfum** (im Katalog dünn), **3. Herbst-Accessoires** (Schals/Beanies/Strumpfhosen) → nächster CJ-Import.

**📧 Klaviyo (User-Fixes):** `websiteUrl` = `luxestyle.com.co` → `.ch`; `preferredCurrency` USD → CHF; **kein
Browse-Abandonment-Flow** (grösster Flow-Hebel); doppelte Welcome-Flows entdoppeln; Birthday-Flow (Draft) live;
**Domain-Auth-DNS** bleibt Top-Block (sonst Spam).

**🔎 SEO:** Kollektionen haben bereits gute Metas → KEIN Massen-Überschreiben (wäre Regression). 20 CH-Keywords +
5 Blog-Themen für später dokumentiert.

## 2026-06-13 — TikTok-Analyse (frisch, `reports/tiktok_luxestyle.ch_2026-06-13.md`)
**Zahlen:** 36 Videos · 10 769 Views (+1 389 / +15 % seit 12.06.) · **Likes 161 (±0!)** · Komm. 5 (±0) · **Shares 0 (±0)** · Ø 299 V/Video.
- **🔴 Wachstum ist hohl:** +1 389 Views kamen fast nur von 2 neuen Produkt-Videos (Smart-Diffuser XXL **1 107 V = neuer #1**, Diver-Watch „CHF 32 statt 200 / 80 % günstiger als Rolex" 795+387 V) — aber **0,5–0,8 % Eng.** = reine passive Impressionen. Likes/Komm./Shares stehen exakt still → **Reichweiten-Decke** erreicht.
- **🟢 NEU bestätigtes Gewinner-Format: Preis-VERGLEICH-Hook „CHF X statt CHF Y / Z % günstiger als <Marke>"** + Specs. Top 8 sind alle Produkt+Preis(-Anker)+Specs. Mundart („Mach dys eiges Teil" 793) bleibt stark.
- **🔴 Kern-Lehre: 0 Shares im GANZEN Account = der Grund, warum TikTok nicht expandiert.** Test-Publikum (~300–1 100), schwaches Signal, kein Push. → **Share/Save-Trigger einbauen** („Speicher dir das", „1, 2 oder 3? In die Kommentare") — Shares/Saves > Likes für Reichweite.
- **🟡 Timing-Lücke:** 16–19 UTC fast leer = **18–21 Uhr CH-Primetime** verschenkt (gepostet wird 05/09/12/20 UTC, geballt Mo/Di). → Posts in CH-Feierabend schieben.
- **⚠️ Engagement-% bei Flop-Videos (15–19 %) = Nenner-Illusion** (31 V × 6 Likes). Nicht als Erfolg werten — absolute Views + Shares zählen.

**✅ Direkt umgesetzt (2 organische Hebel):**
- **Share/Save-Trigger** in alle 11 Captions des autonomen Posters (`automation/cloudflare/luxe-poster/src/queue.json`)
  eingebaut (variiert: 💾 Speichern / 👇 Markieren / Kommentar-Frage) — Bilder alle HTTP-200 geprüft.
- **CH-Primetime:** Cloudflare-Cron von `0 9,17` → **`0 16,19 UTC`** (= 18 & 21 Uhr CH-Feierabend) in `wrangler.toml`.
- **Caption-Format als FESTE Regel** im Poster-README verankert (Produkt+CHF-Preis [+Vergleich] · 1 Share/Save/Komm.-
  Trigger · CTA+WELCOME10+#bern) → künftige Posts befolgen es automatisch.

## 2026-06-14 — Bärndütsch „Mach dis eigete Teil" (User-Wunsch) + Geo-Regel CH-only
- **Bärndütsch-Post live (IG+FB):** «BÄRN»-Design (`social/designs/ch-baern.png` → jpg → Shopify-CDN) für die
  Selbst-gestalten-Linie (Tee ab CHF 32). Mundart = datenbelegter #1-Hook (Ø 793 V) + trifft #bern-Zielgruppe.
- **3 Bärndütsch winner_hooks ins Gehirn** (`knowledge.json`) → sortieren via Hook-Typ-Lernen automatisch nach
  vorne (Mundart zuerst). Künftige Captions nutzen sie.
- **🇨🇭 Geo-Regel FEST:** kein Deutschland-Ausbau (DE-Tags geblockt, CH-only) — Mundart filtert DE eh raus.

## 2026-06-14 — Live-Posten funktioniert + Hype-Gadgets gepostet
- **6 Posts heute live auf IG+FB** via Meta-Token (User pasted, transient): Camping-Ventilator, Gua-Sha, Onyx
  (zentriertes Bild), + 3 **Hype-Gadgets** (Smart-Diffuser XXL=unser #1-Performer, Galaxy-Projektor, Flame-Diffuser).
  User-Wunsch: „coole/hype Sachen, nicht random" → Gadget-Wow statt Mode-Basics.
- **🔧 LEHRE webp→jpg fürs Posten:** CJ-Gadget-Bilder sind `.webp` → IG akzeptiert nur JPEG. Lösung ohne Token in
  der Shell: `ffmpeg -i x.webp x.jpg` → `stagedUploadsCreate(IMAGE)` via MCP → Bytes per `curl` hochladen (file LAST)
  → `fileCreate(contentType:IMAGE)` → CDN-jpg-URL (Image-Staging gilt 24h, nicht Sekunden wie Video).
- **🔧 LEHRE IG-Timing:** zwischen `/{ig}/media` (Container) und `/media_publish` **~10–12 s warten**, sonst
  „Media ID is not available". FB `/photos` ist robuster (akzeptiert sofort, gelegentlich „reduce data" → 1× retry).
- **🔒 Repo ist PRIVAT** → raw.githubusercontent/jsDelivr-URLs liefern 404 (kein Hosting für Meta darüber). Bilder
  fürs Posten immer über Shopify-CDN hosten. (Betrifft auch die Ricardo-Feed-URL — ggf. anders hosten.)
- **Tageslimit beachtet:** 6 Posts = genug für heute (Spam-Schutz), morgen weiter. 3 Hype-Gadgets in `good_products.csv`
  aufgenommen → fließen in die Auto-Rotation.

## 2026-06-14 — Autonom („mach alles autonom"): Neuzugänge in die Schleife
- Die 2 neuen Sommer-Gadgets (Handventilator «Brisa», Camping-Ventilator «Nomad») in `good_products.csv`
  aufgenommen → fließen jetzt automatisch in die Autopost-Queue (17 Posts, beide drin, alle sauber).
- **Funnel verifiziert:** beide landen via Smart-Collections automatisch in `sommer-2026`, `gadgets`,
  `neu-eingetroffen`, Reise/Camping + Geschenke-Preis-Collections — kein manuelles Einsortieren nötig.
- Auto-Modus gelaufen: Gehirn lernte 3. Report (06-14) kumulativ, Pools aktualisiert.

## 2026-06-13 — 🧹 Autonome Katalog-Aufräumung („gestalte selber alles und lösche wenn sein muss")
Live-Stand: 1215 aktiv · 49 Draft · 4408 archiviert. **10 eindeutige Müll-Drafts archiviert** (alle getaggt
`bild-fehlt-nicht-live-schalten`/`stock-bild-pruefen` = Stock-Platzhalter, seit ~3 Wo nicht live-fähig): Sleep
Set, Nacken-Massage, LED-Stimmungslicht, Sound Machine, Galaxy-Projector, Silvester-Bundle, Wachsmalkreide,
Widerstandsbänder, Wandbilder-3er, Yoga-Matte. → Draft 49→39. **Bewusst BEHALTEN:** Schuhschrank
(`nicht-live-moebel-sperrig`, §5), 6 bildlose 3D-Druck-Konzepte (eigenständige PoD-Linie anderer Session),
Geschenkbox-Bundles (echte AI-Renders). **Entscheidung archivieren statt hart löschen** = reversibel, da teils
Fremd-Session. Aktive 1215 unangetastet. Regel: nur explizit als Nicht-live/Stock getaggten Ballast entfernen.

## 2026-06-13 — 🤖 AUTO-MODUS („muss nichts mehr das gleiche sagen")
EIN Befehl `bash automation/brain/auto.sh` kettet alles: analysieren (TikTok) → lernen (Gehirn) →
Autopost-Queue aus gelernten Captions+echten Preisen+Discovery-Tags+Save/Share-Triggern nachfüllen
(`automation/brain/build_queue.mjs` → Cloudflare-Poster `queue.json`, 15 saubere Produkte) → nächste
🔴/🟡-Aktionen + Follower-Befehl (PC-Claude) + manuelle Hebel ausgeben. Gehirn gibt jetzt auch `pools.json`
(maschinenlesbar) aus. Verankert in CLAUDE.md. End-to-end getestet, alle Captions Trigger+asiatenfrei.

## 2026-06-13 — 🧠 GEHIRN gebaut („installiere ein Gehirn das nur besser wird")
Selbstlernende Schleife `automation/brain/` (brain.mjs + knowledge.json + BRAIN.md + run.sh + README).
**Wird mit jedem Lauf besser (Ratsche):** kumulatives Gedächtnis über ALLE Reports (idempotent),
Konfidenz-Schwelle ≥3 Nutzungen (keine One-Hit-Tags), Blocklist bewiesener Verlierer (#luxestyle nie mehr im
Output), kuratierte Gewinner bleiben erhalten, append-only Entscheidungs-Log. Leitet automatisch die nächsten
🔴/🟡-Aktionen ab (z.B. „0 Shares → Trigger", „keine CH-Primetime → Zeit verschieben"). Alte
`learn_from_analytics.mjs` ist jetzt nur Shim aufs Gehirn (kann nicht mehr regressieren). Lauf: `bash
automation/brain/run.sh`. **Verankert in CLAUDE.md-Daueraufträgen.**

## 2026-06-13 — Von anderen Influencern/Top-Dropshippern gelernt (`reports/INFLUENCER-LEHREN-2026-06-13.md`)
Playbook erfolgreicher Organik-Dropship-Accounts (Minea/AutoDS-Tactics) vs. LuxeStyle abgeglichen. **Größte Lücke:
unser Content ist polierte KI-Produkt-Pans — der Algo pusht aber UGC/Demo/Problem-Lösung nativ.** Weitere Lehren:
Hook in 1–2 Sek = Problem/Neugier/Kontrast (nicht Katalog-Benennung); täglich 2–5 Posts > Mo/Di-Cluster; Trending-
Sounds; Discovery-Hashtags statt Marken-Sackgasse `#luxestyle`; **Conversion > Views**.
**✅ Sofort umgesetzt** in `automation/learned_pools.sh`: Discovery-Tags (#tiktokmademebuyit/#musthave/#produkttipp/
#gefundenauftiktok/#lifehack) ersetzen `#luxestyle`; Problem-/Neugier-Hook-Captions ergänzt.
**🔜 Manuell/PC-Claude:** echte Hands-on/UGC-Clips, Trending-Sounds auf `-clean.mp4`, täglicher Rhythmus.

## 2026-06-13 — Runde 1
**🔴 Höchster Hebel (nur DU kannst es, bringt Käufe):**
1. **TikTok-/Meta-Pixel + EINE saubere CH-Kampagne** (Ziel „Complete Payment", CH/Frauen 18–34, DE/FR, 20 CHF/Tag).
   Ohne bezahlte/organische Reichweite bleiben Shop & Videos wirkungslos. → §10-Klicks endlich setzen.
2. **AGB-/Impressum-Domain fixen** (Klaviyo/rechtlich) — Vertrauen + E-Mail-Zustellbarkeit.

**🟡 Conversion-Optik (ich kann viel davon, teils Customizer-Klick):**
3. **Bewertungssterne (Judge.me) auf die Ad-Landing-Produkte** + 3–5 echte Reviews je Hero (NIE Fake) → Social Proof.
4. **Sticky „In den Warenkorb" + Trust-Band** (Gratis-Versand ab 65 · 30 T Rückgabe · TWINT) auf Produktseiten.
5. **Sommerkleid 3,5★ & andere <4★ aus Ads/Landing raus** (bremst Conversion) — laufend QA.

**🟢 Content/Reichweite organisch (Guthaben nutzen):**
6. **Die ~90 Produktvideos als Reels/Stories** ausspielen (TikTok/IG/FB) — Gewinner-Format Produkt+CHF-Preis+Mundart.
   Luma-Flash-Guthaben (~550 Clips) gezielt für Reels/Stories statt nur PDP.
7. **CH-Follower-Maschine 1×/Tag** (PC-Claude) konsequent laufen lassen → organische Reichweite.

**Lehre dieser Session:** ray-3.2 ≈ $3/Clip (17× teurer als Flash ~$0.17). Immer Flash. Staging-Policy verfällt
in Sekunden → Bytes parallel hochladen. `luma-api-…`-Keys = Agents-API, `luma-<uuid>` = Dream-Machine.

## 2026-06-13 — Katalogweiter Asian-Schrift-Audit (Gemini Vision)
- **1198 aktive Produkte** via öffentliche `products.json` gescannt (`automation/asian_script_audit.py`, gemini-2.5-flash).
- Pass 1: 26 mit asiatischer Schrift/„MADE IN CHINA" markiert. **Pass 2 (streng, nur PROMINENTE Overlays/Banner/
  Liefersäcke)** → **11 echte Verstösse archiviert** (bulk-update-product-status). 15 Borderline (winzige Etiketten/
  Hallmarks/Hintergrund/False-Positive wie Reifenkompressor) bewusst BEHALTEN.
- **Lehre:** 2-Pass-Audit nötig — Pass 1 (asian:true) hat ~58% False/Borderline (Mini-Tags, 925-Hallmark,
  Hintergrund-Schilder). Erst „prominent overlay/banner/bag"-Filter trennt echte Verstösse sauber.
- **⚠️ Reaktivieren mit sauberem Bild (statt löschen):** Bali-Maxikleid (4,93★) + Tech-Hero-Box (Smartwatch 5★) —
  nur Hintergrund-Chinesisch → mit Alternativbild/Luma wieder ACTIVE setzen lohnt sich.
