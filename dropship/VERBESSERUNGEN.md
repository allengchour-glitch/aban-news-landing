# 💡 Verbesserungsvorschläge — laufendes Log (Dauerauftrag User 2026-06-13)

> Regel: in jeder Session 3–5 konkrete, priorisierte Vorschläge; Lehren sofort ins Memory.
> Ehrliche Priorisierung — der Engpass ist **Reichweite/Conversion (0 Käufe)**, nicht Katalog/Videos.

## 📌 OFFEN — User-Zusage: **Pixel + CH-Kampagne MORGEN (2026-06-14)**
Der User macht den #1-Hebel (TikTok/Meta-Pixel + bezahlte CH-Kampagne) morgen. → In der nächsten Session
**zuerst prüfen, ob Pixel/Kampagne live ist**, und Conversion-Funnel davor sauber machen:
- Ad-Landing-Kollektion (`/collections/sommer` bzw. Damen-Mode) auf saubere, **bewertete/Video-Produkte** ausrichten.
- Nur ≥4★-Produkte bewerben; <4★ raus.
- Die ~101 Produktvideos als **Ad-Creatives/Reels** bereitstellen (Gewinner-Format Produkt+CHF-Preis+Mundart).
- Nach Kampagnenstart: 2–3 Tage Daten → „Auswertung" (Add-to-Cart/Käufe vs. heute 0).

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
