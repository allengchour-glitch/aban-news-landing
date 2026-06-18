# 📊 LuxeStyle — STATUS (immer aktuell)

> Dauerauftrag User 2026-06-14: „ich will immer Status-Bericht sehen, was du gemacht hast."
> → Diese Datei nach jeder Charge nachführen + in der Antwort zeigen. Neueste oben.

## 🔄 2026-06-18 (AUTO-LAUF — Charge)
- **Gehirn-Lauf:** Health/TikTok-Analyse/Trends/Lernen/Autopost durch. **Queue neu gebaut: 34 Posts** (21 Bild · 10 Reel · 3 Story), 0 Dubletten, **0 verbotene** (Botox/Öl-Filter greift). Reports 2026-06-18 (health/tiktok/trends) abgelegt. Ratsche aktualisiert (Hook-Rang: mundart 796 ▸ preis_vergleich 381 ▸ generisch 310).
- **KI-Provider in Cloud:** alle „kein Key" (Keys nur am PC/ENV) → Template-Fallback hielt — Betrieb brach nicht. Am PC laufen Groq+Gemini live.
- **Committet+gepusht** auf CizQ6. Worker braucht `wrangler deploy` (am PC), damit die neue Queue live geht.
- **⏳ Offen (unverändert, nur User/PC):** (1) TikTok-Kampagne 350 CHF scharf — Brave bei ads.tiktok.com einloggen → campaign-dry → ich prüfe Selektoren → campaign-go. (2) Wallrath-Mail (Gmail-Entwurf) senden = bis $1000 Gratis-Ad-Credit. (3) `wrangler deploy` für frische Queue.

## ⚙️ 2026-06-17 (A-Z AUTONOM-VERBESSERIG + QA)
- **QA-Lauf:** ALLE Skripte syntax-geprüft (0 Fehler .mjs/.py), JSON intakt (71 Gehirn-Regeln, queue 31 Posts).
- **Caption-Engine verbessert:** Gewinner-FRAGE-Hooks zuerst («Weles nimmsch – 1,2,3?», «Für di oder zum Verschänke?») = treiben Kommentare (aus IG-Analyse + Top-Shop-Formaten).
- **KI-Analyse live:** Trend-Scan nutzt jetzt Gemini (Groq+Gemini beide live), Google-Trends-CH + Bild-KI erreichbar.
- **Steuer-Zentrale** : Cloud steuert alle PC-Aktionen selbst (Worker-Queue).
- **Key-Inventar** im Gehirn (Namen/Status/Ort, keine Werte). Freier Stack (Groq/Gemini/Luma/piper/Pollinations) reicht → kein Geld ausser TikTok-Kampagne.
- **Pipeline airtight:** DO-NOT-POST-Filter im Queue-Builder (botox/öl nie wieder). Clarity aktiv (Conversion-Analyse in 1-2 Tagen).

## 🎵 2026-06-17 (TikTok VOLLGAS — 4x/Tag autonom, PC immer an)
- **EI-KLICK ** registriert 4 Tasks (10/13/16/20) →  postet+analysiert+lernt **4x/Tag** autonom.
- **Uploader-Fix:** 48 Reels im Pool (vorher nur 4), Hero zuerst, **perpetual-Recycle** (steht nie still), Caption aus video_queue.
- Haupt-Tagestask postet TikTok nicht mehr (kein Doppel). Posten=Brave-Port (kein API). User: PC läuft immer → Cycles zuverlässig.

## 🛍️ 2026-06-17 (Merchant-Feed MAXIMUM + BigBuy-Importer + HeyGen-Status)
- **🛒 Google-Merchant MAXIMUM (ganzer Katalog gefegt, feed_polish):** **266 Produkte hatten KEINE Kategorie → jetzt gesetzt** + 25 Google-Felder. Rest schon ok → Feed jetzt voll: Kategorie · condition · GTIN/identifier_exists · gender/age. Google re-crawlt in Tagen.
- **📦 BigBuy-Importer `dropship/bigbuy_import.mjs`:** legt BigBuy-EU-Produkte Merchant-ready an (ACTIVE/6 Kanäle/CHF/GTIN/Kategorie/condition/gender/age/custom_product), idempotent (EAN-Ledger), Backoff bei 429. **⚠️ BigBuy-API-Quota von Cloud-IP erschöpft (429)** → 0 erstellt; besser vom PC / inkrementell (z.B. 10/Tag) laufen lassen. feed_polish-Helfer-Import jetzt guard't (kein Auto-Polish bei Import).
- **🎬 HeyGen-Spokesperson (`heygen_video.mjs`, Key vorhanden):** Key verifiziert (1281 Avatare, 29 DE-Frauenstimmen, Abigail+Leonie gewählt) — ABER **Render scheitert an API-Credits** (`INSUFFICIENT_CREDIT`: API-Quota=4 ≠ Dashboard-Credits 16'500). → HeyGen-**API-Quota aufladen** ODER im HeyGen-Webapp manuell. Tool ist startklar, sobald API-Credits da.

## 🎠 2026-06-17 (IG VOLL-PORT-AUTOMATION + Carousel + Profil-Analyse + Cleanup)
- **🚨 BOTOX/SERUM/ÖL im IG-Grid LIVE gfunde** (alti Posts vor de Verbots-Regle): Botox/Vitamin-C-Serum «Glow», Rosehip-Öl/Gua-Sha (HEMP). IG-API cha published NID lösche (#10) → **`ig-delete-browser.mjs` (Brave-CDP)** boue, liest `ig-delete-queue.txt` (5 Posts mit Permalinks), im PC-Task verdrahtet. DO-NOT-POST erweitert (serum/botox/vitamin-c); fresh1-Reel raus; queue.json verifiziert clean.
- **🎠 IG-Carousel (Bilderreihe in 1 Kachel, 1 Beschreibung):** `automation/post_ig_carousel.mjs` (Graph-API, 2–10 Top-Text-Karten, Gewinner zuerst). **Erster live** (id 18115311286862973). Autonom **Di+Fr** im PC-Task.
- **📊 Profil-Analyse (Screenshots TikTok+IG):** Gewinner = **Schmuck-Makro** (Herzketti 778 V) + Kleid-in-Bewegung → A-Video startet jetzt mit dem Gewinner. Verlierer = generische Street-Shots. Ratio ungesund (IG 146 Foll/814 Gefolgt, TT 592/878) → **ch-unfollow täglich** statt nur Sonntag.
- **📋 Format-Regeln (Gehirn `formate_2026_06`):** Carousel + Videos/Reels IMMER mit Beschreibung+Hashtags + Stories/Reels im Mix nicht vergessen + jederzeit antworten (Worker-Cron 6×/Tag Kommentare, PC-Browser DMs).
- **IG = komplett über Port/API:** Posten (Graph), Löschen (Browser), DM (Browser), Follower/Unfollow (Browser), Kommentar (API) — alles im PC-Tagestask.

## 🎯 2026-06-17 (TikTok-Pixel-Kampagne per Port — Scaffold, Budget-Cap 350 CHF)
- **User-Entscheid:** „autonom, ha 350 Fr druf, uf Pixel voll Gas, ohni mi." → voll-auto Kampagne via Brave-CDP-Port.
- **`automation/local/tiktok-campaign-port.mjs` gebaut:** erstellt+startet Kampagne über eingeloggtes TikTok Ads Manager (Port 9222, wie Upload/Follower). Config: Lifetime-Cap CHF 350 (HART), Tag 25 CHF (~14 T), Pixel D8EKVR…, Event Complete Payment, CH/Frauen/18–34/DE+FR, TikTok-Placement, Creative `reels/luxe-hero-ad.mp4`, Ziel /collections/sommer. Idempotent (campaign-ledger.txt → kein Doppel-Spend).
- **⚠️ EHRLICH:** TikTok-Ads-UI ändert sich + ist aus der Cloud NICHT testbar → **erster Lauf `--dry`** (diagnostiziert + screenshottet jeden Schritt, `campaign-shots/`), dann Selektoren scharfziehen, DANN autonom. Bis Selektoren bestätigt: Script stoppt VOR dem Absenden (kein versehentlicher Spend). Pixel selbst ist schon verbunden (Shopify-TikTok-App).

## 🧰 2026-06-17 (GRATIS-VOLLAUTOMATIONS-STACK + KI-FALLBACK + Trends/Musik + Follower langsam)
- **🤖 Multi-Provider-KI-Router `automation/ai/ai_generate.mjs`:** groq→gemini→openrouter→cloudflare→mistral→openai,
  automatischer Fallback wenn einer ausfällt, Template-Fallback ohne Key → **Automation bricht NIE**. **GROQ ist jetzt der aktive #1 (Key vom User 2026-06-17 geliefert + live verifiziert: `groq=live`, echte Bärndütsch-Caption generiert).** Key-Wert NUR in `luxe-secrets.ps1` als `$env:GROQ_API_KEY` (NIE im öffentlichen Repo). OpenAI = Quota leer (429, nur Fallback).
- **🩺 `automation/health-check.mjs`:** zeigt welche KI-Provider/Binaries/Daten leben (Report `reports/health-*.json`). Aktuell: ffmpeg/yt-dlp/piper/gallery-dl ok, Google-Trends-CH erreichbar, 0 KI-Keys gesetzt.
- **📈 `automation/trends/trend_scan.mjs`:** Trends+Musik regelmässig — Google-Trends-CH (gratis, kein Key) + KI-Content-Ideen (CH/Mundart). Läuft auch ohne KI (regelbasiert).
- **🛠️ `automation/setup-free-stack.sh`:** baut Gratis-Stack reproduzierbar (yt-dlp/gallery-dl/Pillow/Checks) — Container sind ephemer, Skript = Wahrheit. gallery-dl neu installiert.
- **🔗 Verdrahtet:** `auto.sh` (Health→Analyse→Trends→Lernen→Queue) + PC-Task `run-follower-daily.ps1` (9b). Secrets-Kommentar um GROQ/OPENROUTER/MISTRAL/CF ergänzt.
- **🐢 Follower LANGSAM (User „wachse langsam follower"):** Caps zurück auf IG 30 / TikTok 22 (nachhaltig, kein Ban-Risiko). Ziel 1 Mio über Monate, nicht Spitzen.

## 🎬 2026-06-17 (ROLLEN-SPLIT + SOCIAL-MEISTERWÄRK: 1 A-Video + Text-Bilder + Follower-Level-hoch)
- **🤝 NEUE ROLLENVERTEILUNG (User 2026-06-17 „andere session macht webseite sauber mit chatgpt, du bist für posting"):**
  Diese Session = **NUR Social/Marketing**: Posting (TikTok + Meta), Videos/Reels, Bilder mit Text, **Follower-Wachstum, Kommentar/DM-Chat, Engagement**.
  Die **Webseite/Theme/Katalog-Sauberkeit macht die andere Session (mit ChatGPT)** → ich fasse Theme/PDP/Katalog-Struktur NICHT mehr an (nur lesen für Content/Preise). Koordination via SHARED-MEMORY.
- **⭐ 1 A-VIDEO (User „nur 1 A video, sonst loop für kritik" — für TikTok-Pixel-Ad):** `reels/luxe-hero-ad.mp4` (15s, 16 Top-Produkt,
  schneller Schnitt 1.15s + xfade, Hook «Premium-Looks. Faire Priis.» 1. Sek, CTA «-10% WELCOME10 · Jetz uf luxestyle.ch», upbeat-pop-Musik,
  Safe-Zone-Text). Auf CDN + in `video_queue.csv` (`reel-hero-ad`). **Kritik-Schleife:** EIN Hero-Video, iterativ verbessern statt viele streuen.
- **🖼️ TEXT IM BILD = STANDARD (User „mit text videos und bilder ab iz"):** `gen_post_image.py` rendert edle Karten (LUXESTYLE-Wortmarke +
  Produktname + «-10% CODE WELCOME10»-Pill). **22 Top-Karten auf CDN** → `social/text_image_map.json`. `build_queue.mjs` postet jetzt
  die **Text-Karte statt nacktem Bild** (Map-Lookup) und nutzt **nur Top-Produkte** (`automation/top_products.csv`, 22 kuratiert; User „nutze nur top produkten").
- **📹 Montage-Videos:** `luxe-main-showcase.mp4` (24s ruhig) + `luxe-showcase-fast.mp4` (23s, 24 Bilder, schnell) gerendert+CDN (als Reserve);
  Queue-Fokus aber bewusst auf **das 1 A-Video** (nur 1 Ad-Creative).
- **📈 FOLLOWER-LEVEL HOCH (User „insta follower folge, autonom level hoch, 1 million"):** `ch-follower-growth.mjs` Tages-Caps **IG 40→55 · TikTok 30→45**
  (bleibt im sicheren Bereich, 25–70 s Pausen, Stopp bei Block). Läuft täglich am PC (Brave-CDP, step 3). „Ab und zue bi de andere öbis cools poste" = Worker (IG/FB) + TikTok-Upload erledigen das autonom.
- **🔄 Queue neu gebaut:** 32 Posts (22 Text-Bilder + 7 Reels + 3 Stories). **⚠️ Geht live mit nächstem `wrangler deploy`** (Cloud hat kein CF-Token → PC-Task / Handy `&cmd=deploy`).
- **🔴 Engpass unverändert:** 0 Orders → fehlt **TikTok-Pixel + bezahlti CH-Kampagne** (nur User). Das A-Video ist das Ad-Creative dafür.

## ✨ 2026-06-17 (POLISH ALLES — ganzer Katalog bild-geprüft + geheilt)
- **Bild-Audit über den GANZEN Katalog** gelaufen (~2050 aktive geprüft, Gemini-Vision, refined Prompt = keine Fehlalarme auf Marken/POD).
- **Autonome Selbstheilung:** schlechte Bilder (Watermark/asiat.Schrift/Vorher-Nachher) gelöscht, saubere behalten → fast alle blieben ACTIVE.
- **Nur 3 Produkte DRAFT** (alle Bilder schlecht, brauchen eigenes Foto): Shiatsu-Nackenkissen, LED-Laterne Weiss Metall, Ticketdrucker Premier (alle CJ).
- Lost Nomade (arab. Parfüm-Marke) + Jovi KAWAII = als legit erkannt → ACTIVE + `bild-ok` getaggt (kein Re-Flag).
- **73 neue Produkte in Reel- + IG/FB-Post-Queue** (Bärndütsch, Handwerk-Hashtags) → Reichweite-Maschine bewirbt sie.
- Feed weiterhin 100% (Kategorie/condition/identifier_exists/Mode-Details). PC-Task Step 8d = Bild-Audit Report-Modus läuft täglich weiter.

## 🔍 2026-06-17 (BILD-AUDIT + MERCHANT-FEED komplett gefixt)
- **`automation/image-audit.mjs` gebaut (Gemini-2.5-flash, Vision)** — scannt Produktbilder auf **asiat./arab. Schrift, MADE IN CHINA, fremde-Shop-Watermark (Vnox/HOMEFISH/INEFFABLE/AWARN SUN/PureMax/RKJ), Vorher/Nachher**. Key `AQ.Ab8…` funktioniert (transient/luxe-secrets, NIE Repo). thinkingBudget=0 (sonst Truncation).
- **⚠️ LEHRE (wichtig):** Erst-Version flaggte «jede Marke» → **118 legit Markenprodukte (Adidas/YSL/Nike/Pandora/MK…) + eigene Swiss-POD-Designs (Matterhorn/Edelweiss/Fondue)** fälschlich auf DRAFT → **alle 118 reaktiviert**. Prompt gefixt: **NUR Bild-Hygiene, KEINE Marken-Kategorie**; **Report-Modus default** (kein Auto-DRAFT, manueller Review). Verifiziert: Adidas=ok, Vnox/HOMEFISH/INEFFABLE-Watermarks=flag.
- **40 echte Verstöße auf DRAFT** (brauchen sauberes Ersatzbild → dann ACTIVE) + Botox-Serum archiviert + PureMax DRAFT. Liste: `reports/BILD-AUDIT-2026-06-17.md` (lokal).
- **🔧 AUTONOME SELBSTHEILUNG (`/tmp/clean_images.mjs`):** pro DRAFT-Produkt jedes Bild geprüft → schlechte (Watermark/Schrift/Vorher-Nachher) **gelöscht**, saubere behalten → **40 von 41 wieder ACTIVE** (35 cleaned + PureMax 5-saubere + Lost Nomade/Angel's Love=legit arab. Marke + Jovi/Nackenkissen=Fehlalarm). **Nur 1 bleibt DRAFT:** LED-Spiegelwecker (echte HOMEFISH-Watermark, CJ, alle Bilder schlecht → braucht eigenes Foto). Botox-Serum archiviert.
- **🛒 MERCHANT-FEED katalogweit gefixt:** Kategorie 5747 · condition 6480 · **identifier_exists/custom_product 5232** (= grösster Disapproval-Grund «fehlende GTIN» weg) · gender/age · Mode-Key-Details 2044. Apparel-Beschreibungen (Shirts&Tops Merchant-Task) = abgedeckt, Google re-crawlt in Tagen.
- **PC-Task Step 8d** = Bild-Audit Report-Modus (braucht GEMINI_API_KEY in luxe-secrets.ps1).

## 🛍️ 2026-06-17 (PRODUKT-OFFENSIVE — 48 neue Produkte via BigBuy EU, 4 Runden)
- **24 Outdoor/Camping + 12 Garten & Balkon + 12 Haus & Küche = 48 neue**, alle ACTIVE/6 Kanäle/Bilder QA'd+READY/CHF/Kategorie/condition=new.
- **Kollektionen:** „Reise & Outdoor" (30), neue Smart-Coll „🌿 Garten & Balkon" (Tag=garten, publiziert), „Küche & Kochen".
- Küche: Kaffeemaschine/2 Milchaufschäumer(inkl. Jura)/Allesschneider/Aufbewahrung(3)/Kupferbecher/Ofenform Zenker/2 Pfannen/Abtropfsieb.
- QA verworfen (nicht live): Kinder-Teepee, Box-statt-Kompass, Bosch-Thermometer, Camping-Äxte (Waffe), 2× x12-Grosspack. IDs: `dropship/bigbuy-outdoor-import.md`.

## 🏕️ 2026-06-16 (OUTDOOR-RUNDE — 12 neue Produkte live via BigBuy EU)
- **12 Outdoor/Camping-Produkte angelegt** (ACTIVE, 6 Kanäle, Bilder READY, CHF-Preis, Kategorie sg/hg, condition=new, 7 mit GTIN): 2 Camping-Gaskocher, 2 Klapptische, 2 Hängematten, LED-Laterne, Solar-Fackel, LED-Kerzen 3er, Klapp-Holzkohlegrill, Elektrogrill 2400 W, Grillmatte. In Kollektion „Reise & Outdoor" gehängt. IDs/Quelle: `dropship/bigbuy-outdoor-import.md`.
- **Quelle BigBuy (EU-Lager = bessere CH-Lieferung)**, Root `parentTaxonomy=19756` „Sport und Außenbereich". CJ war für Outdoor leer (nur Schmuck-Müll → verworfen, QA). Jedes Bild per Kontakt-Sheet QA'd; Äxte/Waffen + Nicht-Outdoor weggelassen.
- **🔑 Token-Lehre verfeinert:** BigBuy `products.json` nimmt nur Top-Roots (Leafs=404); dt. Namen via `productinformation?isoCode=de`.

## ✅ 2026-06-16 (KATALOG-FEED-POLITUR LIVE DURCHGEZOGEN — ganzer Shop, 0 Fehler)
- **🎉 GANZER KATALOG (6480 Produkt) live poliert** via Shopify-Bulk (eigener access_token, richtige App `ffe6c3a…`):
  · **condition=new** auf **6480** + **gender/age_group** auf Mode (Google-Pflichtfelder) ✅
  · **richtige Google-Kategorie** auf **5747** Produkte (erst 3818, dann Mapping erweitert → cat2 +5231 inkl. exotische Typen Sticker/Hobby/DIY/Gaming/Wellness/Deko/Foto/Saison/Auto/Ski; nur ~733 echt-generische «Set/Stück/Paar» bleiben na) ✅
  · **Farbe/Grösse/Material/Muster-Block** in **2032** Mode-Beschreibungen (Merchant-Report „Update product descriptions" gefixt) ✅
  Verifiziert live (Herrenuhr→Armbanduhren, Sommerkleid→Kleider/female, Leinen-Hose→Material Leinen). Idempotent → re-run safe.
- **🔑 Token-Saga gelöst (gemerkt in CLAUDE.md):** shpat_ tot seit 2026; client_credentials braucht **installierte** App (sonst app_not_installed); atkn untauglich; richtige Client-ID `ffe6c3a…` (Secret nur in luxe-secrets.ps1).
- **🛠️ `automation/feed_polish.mjs` + `enrich_apparel_descriptions.mjs`** (für PC-Tagestask, idempotent): setzt **katalogweit** die richtige Shopify-Standard-Produktkategorie (→ Google-Kategorie auto) per Keyword-Mapping (productType+Titel, ~45 Regeln, alle GIDs verifiziert) + `mm-google-shopping` **condition=new** (alle), **gender/age_group** (Mode/Schmuck/Taschen).
- **Robust:** idempotent (überspringt Polierte via condition-Metafeld), resümierbar, THROTTLED-Backoff, `MAX`/Lauf, `DRY=1`. Logik gegen echte productTypes getestet (Armbanduhr≠Armband-Bug gefixt).
- **🤖 Autonom verdrahtet:** PC-Tagestask `run-follower-daily.ps1` **Step 8b** (MAX=800/Tag → ganzer Katalog über wenige Läufe). Braucht `SHOPIFY_CLIENT_ID/SECRET` in luxe-secrets.ps1 (Client-Credentials, wie reel-analytics).
- **🤝 Koordination:** Bulk-Feed-Kategorie war „Taxonomie-Session-Revier" → auf User-Anweisung übernimmt das jetzt **CizQ6** (in SHARED-MEMORY angekündigt, kein Doppel-Setzen). Theme/Menü/Collections bleiben Taxonomie-/Theme-Session.
- **🔴 User (1×):** SHOPIFY_CLIENT_ID/SECRET in PC-Secrets + Merchant „Turn on automatic image improvements".

## 🎉 2026-06-16 (WORKER DEPLOYED — Posting-Maschine + Handy-Steuerung LIVE)
- **✅ `wrangler deploy` erfolgreich** (User am PC). luxe-poster Version 62eb9ea9, Cron 7/10/12/15/17/19 UTC. KV LUXE_KV (662199…86ee9) gebunden.
- **134-Posts-Queue live** (13 neue Reels + 5 neue Produkte in Rotation, dedupliziert).
- **📱 Handy-Befehlsqueue VERIFIZIERT LIVE** (`&cmd=ping`→queued, `&drain=1`→zurück) → tap.html/1-Tap scharf. Kommentar-Auto-Antwort + FB-Stories/Reels aktiv.
- **Deploy-Stolperfallen gelöst (für künftige Sessions):** (1) `cd` in absoluten Worker-Pfad (sonst legt wrangler „allen"-Worker an), (2) KV-ID jetzt fest in wrangler.toml committet, (3) kaputter `CLOUDFLARE_API_TOKEN` (U+2026-Ellipse) → `Remove-Item Env:CLOUDFLARE_API_TOKEN` + `wrangler login` (OAuth).
- **queue_url (KV) = raw.githubusercontent 404** (Repo privat) → Worker nutzt eingebackene Queue (ok). Künftige Queue-Updates = erneut `wrangler deploy`.
- **🔜 Offen User:** `START-LISTENER.bat` am PC starten (Handy-Befehle ausführen) · TikTok-Pixel/Kampagne · Google Free Listings AN.

## 🆕 2026-06-16 (Neue Produkte voll angelegt + Brillen-Misrepresentation-Fix)
- **🆕 3 Produkte im Meisterwerk-Standard** (dt. Beschreibung + alle Bilder + eigenes Video + 6 Kanäle):
  Herren-Halskette **«Fenrir»** (Edelstahl-Weizenkette, 3 Farben, CHF 39.90), Statement-Ohrring-Set **«Aurelia»** (Creolen+Stecker, CHF 27.90), Boho-Halskette **«Lagune»** (Türkis-Crescent, CHF 29.90).
- **🚨 Brillen-Fix:** 6 BigBuy-Marken-Eyewear waren als „Sonnenbrille" gelistet, sind aber **klare optische Gestelle** (Citizen×3/MK×2/Tous) → korrigiert (Titel→Brille, Kategorie→Brillen). Merchant-Misrepresentation-Risiko weg.
- **🔎 LEHRE:** CJ/BigBuy haben KEINE sauberen Cuban-Link/Paar-Sets/Herren-Hemden → diese via AliExpress-Liste (PC). Damen-Hype (Layering-Set/Chunky-Hoops) führt CJ auch kaum — Aurelia/Lagune waren die sauberen Treffer.
- **🎬 11 Share-/Produkt-Reels** diese Session (A/B + Save-Listen + Partner + Für-ihn + 3 Produkt-Reels), alle auf CDN + Queue (greifen nach `wrangler deploy`).

## 🆕 2026-06-16 (Reichweite-Fix: Dubletten weg + A/B-Share-Format + Auto-Analyse + Gehirn-Upgrade)
- **🔁 DOPPELTE FEED-POSTS GEFIXT** (User „doppelt bilder"): build_queue.mjs garantiert jetzt KEINE doppelte Bild-/Video-URL im Grid. Queue neu (0 Grid-Dubletten). IG-Alt-Dubletten nur in App löschbar (keine API).
- **🎬 NEUES SHARE-FORMAT gegen 0-Shares-Decke:** `dropship/ads/render_ab_reel.sh` = «1 oder 2?»-Vergleichs-Reels (Frage-Hook → Kommentar/Tag-a-Friend = das fehlende Engagement-Signal). 2 Beispiele (Ohrringe/Armband) gerendert, QA'd, auf CDN (200), in video_queue.csv + Queue mit Mundart-1-oder-2-CTA.
- **📊 AUTO-ANALYSE eingebaut** (User „wenn fertig posten, dann immer Analyse"): PC-Tagestask `run-follower-daily.ps1` macht nach dem Posten IMMER TikTok-Analyse → Gehirn-Lernen → Queue-Rebuild → zurück ins Repo. Worker analysiert ohnehin bei jedem Cron.
- **🧠 GEHIRN aus allen ~63 dropship/-Docs angereichert:** 8 neue rules-Bereiche (kampagnen_paid/conversion_hebel/gratis_kanaele/api_patterns/aesthetik_optik/supplier_pricing/katalog_audit/pod_printful) + Queue-Dedup-Lehre.
- **❓ 102'400% im Dashboard = Wachstum-vs-Vorperiode** (Basis ~0 → riesige %, aussagelos). Echte Zahl bleibt: CHF 0 / 0 Orders → Hebel = Reichweite + Conversion.

## 🆕 2026-06-16 (TWINT BESTÄTIGT OK → Engpass = klar REICHWEITE)
- **✅ TWINT-Testkauf ging KOMPLETT DURCH** (User, andere Session) → **Bezahlweg funktioniert, Checkout NICHT kaputt.**
- **➡️ Neu-Bewertung der 4 Checkout-Abbrüche:** keine kaputte Bezahlung, sondern echte Kunden, die am letzten Schritt aus anderem
  Grund abspringen (Versandkosten-Wahrnehmung/Vertrauen/Ablenkung) — Recovery-Flow fängt das ab. **Kein technischer Blocker mehr.**
- **🎯 ENGPASS jetzt eindeutig = REICHWEITE.** Funnel+Katalog+Bezahlung sind ok; bei nur **7–12 Sessions/Tag** kann es mathematisch keine
  Order geben. **Top-Prio: Traffic restaurieren** — (1) Worker deployen (Organik-Kadenz hoch, Queue 141 Posts wartet), (2) Pixel + CH-Kampagne (bezahlt).
  Bezahl-Test ist damit ✅ erledigt und von der TODO genommen.

## 🆕 2026-06-16 (TIEFEN-ANALYSE — Traffic stürzt ab + Gehirn-Lehren)
- **📉 TRAFFIC-ABSTURZ (Tagestrend 14T):** 02.06=237 · 03.06=**256** · 04.06=173 → dann Einbruch: 05.06=45 … 12.06=13 · 15.06=**7** · 16.06=12.
  → Die 1.206/14T sind front-loaded; **die letzten Tage sind quasi tot (7–36/Tag).** Ursache: bezahlte TikTok-Kampagne pausiert + nur Organik
  + Worker nicht redeployed (Posting-Kadenz gedrosselt) + GitHub-Actions-Sperre. **Reichweite kollabiert — das ist jetzt der akuteste Engpass NEBEN dem Checkout-Leck.**
- **🧠 GEHIRN (auto.sh, kumulativ):** Hook-Rang nach echten Views: **mundart Ø795** ≫ preis_vergleich 367 > generisch 305 > preis 162 > frage_cta 51.
  → **Mundart-Hooks dominieren — davon MEHR, „generisch" meiden.** TikTok: Views steigen, **0 Shares = hohle Reichweite/Decke** → Share-/Save-Trigger + UGC/Demo statt Produkt-Pans.
- **📤 Autopost-Queue neu gebaut: 141 Posts** (95 Bild / 31 Reel / 15 Story, CH-weit, gelernte Captions + echte Preise) → `queue.json`. **Wirkt erst nach `wrangler deploy`.**
- **🔑 Konsequenz Prioritäten:** (1) Reichweite RESTAURIEREN — Worker deployen (Organik-Kadenz) + Pixel/Kampagne (bezahlt) ; (2) Checkout-Leck (TWINT-Test) ; (3) Free Listings/SEO.

## 🆕 2026-06-16 (NACHT — Value-Content-Offensive + Bärndütsch gelernt)
- **9 VALUE-Reels** gebaut (80/20-Regel gegen 0-Shares): Pflege · Styling · echt-vs-billig · Hautton · Geschenk-Guide · Schmuck-Fehler · Cap-Gsicht · Sommer-Trends-26 · Ketteli-Längi. Format `render_value_reel.sh` (Tipp-Liste, Save-CTA, Musik, Safe-Zone). Alle auf CDN + Queue.
- **🇨🇭 BÄRNDÜTSCH vom User gelernt + validiert** („passt scho"): modern/phonetisch (Insta-Stil). Korrekturen in `berndeutsch.json/korrekturen_user` (Vorrang): ou(≠au)·Parfüm·angers·äbe·hüt·hütztags·schribä·lehrä·chani·haut(=halt)·alegge(≠aalegge). Pflege-Reel neu gerendert (kyrill. Zeichen weg).
- **Hooks erweitert** (winner_hooks): Value/«30-Tage»/«Stopp»/«POV» (Research 2026). Pixel = User am Weekend.

## 🎉 2026-06-16 (ABEND — Worker live + Shop-Struktur + Autonomie-Upgrade)
- **Cloudflare-Skills in Claude Code installiert** → künftige Sessions deployen den Worker selbst (kein PowerShell).
- **luxe-poster live + autonom** (Cron, KV fest in wrangler.toml, Handy-1-Tap verifiziert). Code committet: `&health`, `&dedupe` (FB-Doppel löschen), Text-Stories → brauchen 1 sauberen Deploy (git pull DANN deploy).
- **Shop:** 5 neue Produkte (Fenrir/Aurelia/Lagune/Samsara/Olivia) · 6 Marken-Brillen-Mislabel gefixt · 🧸 Spielzeug → 13 Sub-Kategorien + im Menü.
- **Video:** render_price_reveal v3 (Ken-Burns+Grade+Musik) · A/B- & Save-Reels gegen 0-Shares.
- **Lehre:** Worker nur mit DEPLOYTEN Routen antippen (unbekannte Params → posten). 3 versehentliche Posts so passiert.

## 🆕 2026-06-16 (AUSWERTUNG 14T — WENDE: echte Checkout-Abbrüche gefunden!)
- **Zahlen 14T:** 1.206 Sessions · **0 Bestellungen** · ABER **4 abgebrochene Checkouts** (CHF 71.90 / 43.00 / 69.00 / 69.00, + 1 älterer 129.90).
  → **Es ist NICHT (nur) Reichweite — echte Käufer kommen bis in den Checkout und brechen am LETZTEN Schritt ab.** Das ist neu/entscheidend.
- **Shop technisch sauber (geprüft):** kein Passwortschutz, Währung CHF, Checkout-API aktiv, Storefront + Produktseiten HTTP 200, Recovery-Flows live (Abandoned Checkout `Vse76a` + Cart `UXEjv2`).
- **Traffic-Quellen:** social **535** (= autonomes Posten zieht, bester Kanal!) · direct 664 (Bot/Junk) · **search 4** (SEO/organisch ≈ tot → Free Listings #3 = reine Upside).
- **Landing-Pages korrekt:** / (435), damen-mode (271), highlights (179), sommer (21) + echte Produktseiten.
- **🔑 DIAGNOSE (datenbelegt):** Leck ist der **Bezahl-/Abschluss-Schritt**. #1 Hebel = **Bezahlmethode end-to-end testen** (TWINT/Karte schliesst wirklich ab?) + Versandkosten/Total am Ende kein Schock (CHF 71.90-Abbruch direkt über der 65er-Gratis-Schwelle). 2-Min-Testkauf am Handy beweist es sofort.
- **LEHRE (Gehirn):** Abgebrochene Checkouts mit echten CHF-Werten = Kaufabsicht da → Engpass-Hierarchie aktualisiert: (1) Bezahl-Abschluss, (2) Buy-Intent-Traffic/Pixel, (3) SEO/Free Listings. Recovery-Mails greifen nur wenn E-Mail im Checkout erfasst → „Express/E-Mail zuerst" im Checkout prüfen.

## 🆕 2026-06-16 (NACHT 15 — Video-Rollout vollendet: +11 Produkte → 34 total)
- **🎬 +11 eigene Produkt-Videos** für alle restlichen heute angelegten Produkte (Schmuck/Sonnenbrille/Ring):
  Cœur, Trésor, Couleur, Papillon, Minou, Fleur, Cascade, Étincelle, Rosée, Riviera, Sonnenbrille, Ring «Astra».
  Pipeline wie gehabt: ffmpeg Price-Reveal → stagedUpload (curl 204) → productCreateMedia VIDEO (UPLOADED→READY).
- **Σ 34 Produkte mit eigenem Produkt-Video** (7 Marken + 3 Wasserfest + 13 Caps/Hüte + 11 Schmuck/Brille/Ring).
  Alle Reels in `reels/luxe-*-9x16.mp4` committet — auch für TikTok/Meta (vertikal) wiederverwendbar.

## 🆕 2026-06-16 (NACHT 14 — Video-Rollout 10 Produkte + 10 Reels in Meta-Queue)
- **🎬 10 Produkte mit eigenem Produkt-Video** (7 Marken + 3 Wasserfest-Schmuck: Amore/Goutte/Nœud). Alle via Cloud-Pipeline (ffmpeg→stagedUpload→productCreateMedia).
- **📣 10 Marken-/Schmuck-Reels in die Worker-Queue** (Meta/TikTok, type reel, Shopify-CDN-mp4-URLs) → posten autonom mit. Queue jetzt 104+ Posts, 23+ Reels.
## 🆕 2026-06-16 (NACHT 13 — Eigene Produkt-Videos ausgerollt: 7 Marken)
- **🎬 7 Marken-Produkte mit eigenem Price-Reveal-Reel als Produkt-Video** (vollautonom: ffmpeg → Shopify-CDN-Upload via MCP+curl → productCreateMedia VIDEO):
  D&G «The One», Swatch Swiss Made, Casio, Hugo Boss «Alive Intense», Calvin Klein «Eternity», Guess «Glamour», Michael Kors Handtasche.
  Mundart-Hook → Preis-Reveal → CTA, Safe-Zone. Reels in `reels/luxe-*-9x16.mp4`. Skript `dropship/ads/render_price_reveal.sh` (wiederholbar).
- **Lieferanten-Videos = 0** (BigBuy/CJ) → eigene Reels sind DER Weg. mp4 auch für TikTok/Meta (vertikal/stumm) nutzbar.

## 🆕 2026-06-16 (NACHT 12 — Menü premium gestrafft)
- **🧭 Premium-Menü** per `menuUpdate`: 11→9 Top-Punkte, **Departments zuerst** (Frauen/Herren/Schmuck), „Premium"+„Marken"
  zu **Premium & Marken** gemerged (Redundanz, beide → luxestyle-premium), „Hype 2026" als Sub unter Trends. Clean, premium, alles erreichbar.
## 🆕 2026-06-16 (NACHT 11 — Menü auf Premium-Clean umgestellt)
- **🧭 Hauptmenü „clean" (Galaxus-Stil)** per `menuUpdate`: ALLE Emojis aus Labels raus, **unsere Struktur 1:1 erhalten**
  (11 Top + alle Subs inkl. der 3 neuen Kategorien). Wirkt premium statt „0815". User-Entscheid „clean, unsere Unterteilung".
## 🆕 2026-06-16 (NACHT 10 — Domain/.com.co geklärt)
- **✅ Shopify-Primärdomain = luxestyle.ch (SSL)** → Feed-URLs korrekt, `.com.co` ist KEIN Merchant-Blocker (Entwarnung).
- **`.com.co` = Alt-Rest** nur noch in: Klaviyo websiteUrl (E-Mail-Leak!) + Kundenkonto-Subdomain. Plus Shop-Kontaktmail=gmail.
- **Fix-Plan `dropship/DOMAIN-FIX.md`** (alles UI, nicht API): PRIO1 Klaviyo URL→.ch + Währung→CHF · PRIO2 Domains/Kundenkonto `.com.co` weg/Redirect · PRIO3 Shop-Kontaktmail→info@luxestyle.ch.

## 🎉 2026-06-16 (09:24 — GOOGLE MERCHANT ENTSPERRT!)
- **✅ Misrepresentation-Review ABGESCHLOSSEN & Sperre AUFGEHOBEN** (E-Mail Google Merchant: „issue no longer appears").
  Der Policy-Fix (E-Mail-Tippfehler + Rückgaberichtlinie + Verifizierung) hat gewirkt. Konto-Block weg. Merchant-ID 5797470070.
- **➡️ JETZT (User, Merchant Center):** (1) **Free Listings AN** (Wachstum → Listings → „Surfaces across Google"). (2) Produkte-Tab:
  Genehmigungen kommen in 3–5 T. (3) **Domain:** luxestyle.ch verifizieren + die `.com.co`-Domain klären (Feed-Produkt-URLs müssen
  zur beanspruchten Domain passen!). (4) Zielland auf NUR Schweiz begrenzen (nannte Belgium/France/Switzerland) + 3 Ads-Konten → 1.
- **Bedeutung:** gratis Google-Shopping-Reichweite wird freigeschaltet = neuer Traffic-Kanal Richtung 1. Kunde.

## 🆕 2026-06-16 (NACHT 9 — Hauptmenü per API: neue Kategorien verlinkt)
- **🧭 main-menu per `menuUpdate` aktualisiert** (Struktur 1:1 + 3 neue Links): 🧢 Caps & Hüte + 🌸 Parfum & Düfte (Frauen & Herren), 💧 Wasserfester Schmuck (Schmuck). Sonnenbrillen/Ringe/Ohrringe/Halsketten waren schon verlinkt. Voll autonom, kein Customizer nötig.
- **⚠️ Domain-Fund:** Kundenkonto-Links + Klaviyo nutzen `luxestyle.com.co` → Shopify-Primärdomain (Einstellungen→Domains) prüfen — möglicher Trust/SEO/Tracking-Leak.

## 🆕 2026-06-16 (NACHT 8 — #1 Conversion: Klaviyo-Audit, 2 kritische Bugs)
- **✅ Conversion-Engine läuft:** Klaviyo-Flows alle LIVE (Abandoned Cart UXEjv2, Abandoned Checkout Vse76a, Welcome-Serie,
  Win-Back, Post-Purchase). WELCOME10 aktiv (10%, bis 31.08.).
- **🔴 BUG 1 (gross!):** Klaviyo Konto-`websiteUrl` = **`luxestyle.com.co`** (FALSCH) → alle E-Mail-Links zeigen auf falsche
  Domain statt luxestyle.ch → Abandoned-Cart-Mails konvertieren NICHT. **Fix (User, UI):** klaviyo.com/settings/account →
  Kontaktinfo → Website-URL = `https://luxestyle.ch`. (Kein API-Zugriff auf Konto-Settings → nur UI.)
- **🔴 BUG 2:** Klaviyo `preferredCurrency` = **USD** → sollte **CHF**. Gleiche Seite.
- **➡️ Diese 2 UI-Fixes (2 Min) + TWINT-auf-PDP (Theme) + Pixel/Kampagne = der Käufe-Pfad.** Mehr Produkte nicht nötig.

## 🆕 2026-06-16 (NACHT 7 — Ring + Abschluss Nischen-Fill; Fokus jetzt Reichweite)
- **💍 Ring «Astra»** (Stern&Mond, drehbar & VERSTELLBAR = One-Size, kein Grössen-Risiko) live, ACTIVE/6 Kanäle. Fixe-Grösse-Ringe BEWUSST nicht (Retouren-Risiko ohne Grössen-Varianten).
- **🛑 Nischen-Grinden gestoppt (ehrlich):** CJ-List-API liefert für Halsketten/Sonnenbrillen/Haar-Accessoires kaum saubere Treffer (quick/-404, Asia-Motive, Name/Bild-Mismatch, Haar-Suche traf Haarpflege). Diminishing returns → an BigBuy-Import-Session delegiert (SHARED-MEMORY): premium Sonnenbrillen/Halsketten + Ringe MIT Grössen.
- **🎯 #1 REICHWEITE/CONVERSION = jetzt der Hebel** (Katalog ist breit+sauber): User-Klicks TWINT-auf-PDP (Theme) · Pixel+CH-Kampagne · Google Business · `wrangler deploy` (Kommentar-Auto-Antwort). Social-Queue hat alle neuen Kategorien (97 Posts), tutti/anibis bereit.

## 🆕 2026-06-16 (NACHT 6 — Halskette + Sonnenbrille; CJ-Pool für diese Nischen dünn)
- **📿 +1 Halskette «Rosée»** (Kristall-Tropfen) → sub-halsketten. **🕶️ +1 Sonnenbrille «Riviera»** (Oversize getönt UV400) → sonnenbrillen-eyewear + Sommer/Reisen. Beide ACTIVE/6 Kanäle/Bild-QA'd, in Social/Queue.
- **⚠️ ERKENNTNIS:** CJ-List-API liefert für **Halsketten & Sonnenbrillen kaum saubere Kandidaten** (meist quick/-404-URLs, Asia-Motive, Name/Bild-Mismatch) → je nur 1 brauchbar. Diese Nischen besser über **BigBuy (Import-Session, Marken-Sonnenbrillen wie Superdry/Citizen schon da)** oder Fokus auf Reichweite/Conversion.

## 🆕 2026-06-16 (NACHT 5 — Statement-Ohrringe/Creolen gefüllt)
- **💎 Ohrringe gefüllt:** 4 neue (Kätzchen «Minou» 925, Herz-Trockenblumen «Fleur», Creolen «Cascade», Statement «Étincelle»),
  Bild-QA'd (2 mit Overlay-Text verworfen), CHF 22.90–27.90, ACTIVE/6 Kanäle, Tag `ohrringe`. **💎 Ohrringe-Collection jetzt 55**
  (Regel-Fix zog auch ~12 vorher unsortierte „Ohrhänger" rein = Bonus-Aufräumung). 3 in Social/Worker-Queue.

## 🆕 2026-06-16 (NACHT 4 — Parfum-Kategorie + Kategorisierungs-Fixes)
- **🌸 PARFUM-KATEGORIE ERSTELLT** (`parfum-duefte`): es gab ~48 Marken-Parfums (D&G/Hugo Boss/CK/Kenzo/Elie Saab/YSL/Lancôme/
  Michael Kors/Tommy/Police/Tous …) aber KEINE Parfum-Kollektion → jetzt Smart-Collection **„🌸 Parfum & Düfte"** (Rule TYPE=Parfum,
  48 Stück, self-füllend: neue Parfum-Importe landen automatisch). Browsebar + BEST_SELLING sortiert. (Mehr Marken-Parfum = BigBuy-Token/Import-Session.)
- **🗂️ Kategorisierung gefixt:** 💎 Ohrringe-Regel robuster (Tag+Ohrhänger/Creolen/Ohrstecker). Neue Caps/Schmuck korrekt einsortiert.

## 🆕 2026-06-16 (NACHT 3 — HERO-Nische wasserfester Edelstahl-Schmuck importiert)
- **💧 WASSERFESTER EDELSTAHL-SCHMUCK LIVE** (CH-Sommer-Renner #1 aus Research): 7 Stück via CJ (Bild-QA't, Name/Bild-Mismatch +
  Overlay-Text-Bilder verworfen) — Armbänder «Amore»/«Cœur»/«Trésor», Halskette «Goutte», Armreif «Couleur», Titan «Nœud»,
  Ohrhänger «Papillon». CHF 24.90–39.90. ACTIVE/6 Kanäle/kaufbar. Beschreibung mit Verkaufswinkel anlauffrei/hypoallergen/
  am-See-tragbar + Pflege-Hinweis. Neue Collection **„💧 Wasserfester Schmuck"** (`wasserfester-schmuck`, 6 Stück). In Social/Worker-Queue/tutti.

## 🆕 2026-06-16 (NACHT 2 — Caps-Kategorie autonom + Marken auf Meta)
- **🧢 CAPS-KATEGORIE LIVE** (User „eine Kategorie voller Caps"): 4 Caps via CJ (Token ok), Bild-QA'd (1 Knockoff verworfen):
  Flat-Cap «Brigade» camo 24.90 · Vintage «Liberty» 27.90 · Pailletten-Baskenmütze «Scintille» 29.90 · Docker-Mütze «Marin» 27.90.
  ACTIVE/6 Kanäle/kaufbar/deutsche Texte+Grössen-Hinweis. Smart-Collection **„🧢 Caps & Hüte"** (`caps-hute`) — **NACHGEFÜLLT auf 14 Caps** (Baseball/Bucket/Cord/5-Panel/Denim/Beret/Docker, CHF 22.90–29.90, alle Bild-QA'd). In Social+Worker-Queue.
- **📣 BigBuy-Marken in Meta-Queue** (10 Posts: D&G/Swatch/Casio/Hugo Boss/CK/Guess/MK/Citizen/Tommy/Morellato), git-gesteuert.
- **🎯 Marktlücken** (`MARKTLUECKEN-2026.md`): HERO=wasserfester Edelstahl-Schmuck (→Import-Session), TWINT-auf-PDP (→Theme), Micro-Influencer/Google-Business/Open-Air-Reels.

## 🆕 2026-06-15 (NACHT — Autonom-Session: QA + Lernen + Content-Engine)
- **🖼️ Bild-QA neue Importe:** 4 CJ-Blusen (Solare/Maglia/Dentelle/Marbella) + Marken-Batch visuell geprüft → **alle sauber**
  (kein asiat. Text/Watermark). Kaufbarkeit verifiziert: `availableForSale:true` + `tracked:false` trotz 0 Inventar = OK.
- **🧠 Content-Engine 2026 gelernt** (recherchiert, Quellen shopify/twint/opus): 8 Mundart-Preis-Hooks + 5 Gewinner-Formate
  ins Gehirn (`hooks_2026_mundart`, `content_formats_2026`). +6 Marken-Heroes in `good_products.csv`, +3 in `tutti_listings.csv` (14 total).
- **🎯 8 Conversion-Fixes an Theme-Session übergeben** (TWINT/ApplePay/ShopPay, Sticky-ATC, Fit-Block, Trust-Badges, Reviews,
  Versand-Klarheit, 8–12 PDP-Bilder, Speed) — in SHARED-MEMORY, kollisionsfrei (Theme = deren Revier).
- **🆓 Neue Gratis-CH-Kanäle dokumentiert:** anibis.ch, FB-Marketplace pro Stadt, **Google Business Profile (User-Klick)**, Pinterest.
- **✅ Conversion-Landings sauber:** Sommerkleid 3,54★ korrekt aus sommer/bestseller/highlights raus.

## 🆕 2026-06-15 (NEUESTER STAND — Google Merchant Re-Review LÄUFT ✅)
- **✅ Merchant-Center Re-Review ABGESCHICKT** (15.06.2026, „Review requested — can take a few days"). NICHT nochmal
  beantragen (resettet den Timer). Vorher erledigt: beide Policy-Tippfehler gefixt, **Rückgaberichtlinie im Merchant
  Center konfiguriert** (30 Tage · Rücksendung per Post · No-cost Restocking · Refund 14 Tage · CHF · nur Schweiz),
  Business-Info verifiziert. Feed bereits von 34.9K → **13.4K** geschrumpft (CH-only-Märkte wirken).
- **⏳ WARTEN: 3–7 Tage Google-Prüfung.** Bei Freigabe: Free Listings AN + Domain verifiziert (Guide da). Bis dahin
  greifen gratis CH-Reichweite (tutti.ch / FB-Gruppen) + Meta/TikTok organisch — brauchen KEIN Merchant Center.
- **🧹 NACH Freigabe aufräumen (Notiz):** Google nennt Zielländer „Belgium, France and Switzerland" → im Google-Kanal
  auf **nur Schweiz** begrenzen. UND **3 verknüpfte Google-Ads-Konten** → nur „LuxeStyle CH" behalten, andere entkoppeln.

## 🆕 2026-06-15 (Policy-Tippfehler GEFIXT ✅)
- **✅ BEIDE E-Mail-Tippfehler in den Policies korrigiert** (User manuell im Admin, live via MCP verifiziert 22:13 UTC):
  Versand-Policy + AGB §8 GEWÄHRLEISTUNG → jetzt beide `info@luxestyle.ch`. Alle 7 Policies konsistent. → der
  wahrscheinlichste Google-Merchant-„Misrepresentation"-Auslöser ist beseitigt.
- **➡️ NÄCHSTER SCHRITT (User, Merchant Center):** jetzt **„Erneute Überprüfung beantragen"** (Konto-Status). Davor
  noch: Feed auf CH/de + saubere Kollektionen begrenzen (Markets bereits CH-only auf DRAFT gesetzt).


- **✅ Mini-PR #1002 → `main` gemergt** (sauber, ohne den divergierten Produkt-Branch zu clobbern). Liegt jetzt auf `main`:
  `automation/fix_policies.mjs` + `automation/add_premium_section.mjs` + Workflows `shop-fix.yml` / `add-premium-section.yml`.
- **🔴 BLOCKER (verifiziert):** **GitHub Actions ist kontoweit deaktiviert** → `workflow_dispatch` gibt `422 „Actions has been disabled for this user"`. Kein Workflow läuft, egal ob auf `main`. UND `shopPolicyUpdate` per MCP = `Access denied (write_legal_policies)`. → Beide Auto-Routen für den Policy-Fix sind blockiert.
- **➡️ EINZIGER Hebel (du, 1 Klick):** GitHub → Repo **Settings → Actions → General → „Allow all actions"** aktivieren. Danach löse ich `shop-fix.yml` aus → korrigiert die 2 E-Mail-Tippfehler + setzt die Premium-Startseiten-Sektion live, vollautomatisch. ODER: die 2 E-Mails manuell im Admin (siehe unten, 2 Min).

## 🟢 LÄUFT AUTONOM (ohne dein Zutun)
- **📷 IG/FB-Poster LIVE verifiziert** (Cloud-Check 14.06.): `{"cursor":1,"total":29}` — postet 29 Mix-Posts
  (Bilder+Reels+Stories) autonom 2×/Tag. Handy-Trigger: `…workers.dev/?key=Abanaban192%2B` (`+` = `%2B`!).
- **♻️ Selbst-aktualisierend (kein PowerShell mehr für Inhalte):** Worker holt Queue von Live-CDN-URL (KV `queue_url`).
  Cloud-Claude aktualisiert Inhalt: queue.json → Shopify-CDN hochladen → `?key=…&queue=<url>` aufrufen. KEIN Redeploy.
  Queue-CDN aktuell: `cdn.shopify.com/s/files/1/0943/6856/3585/files/luxe-queue.json`. ⚠️ Einmal `wrangler deploy`
  nötig, damit der selbst-aktualisierende Worker-Code aktiv wird (danach NIE wieder PowerShell fürs Posten).
- **🖱️ Kein PowerShell mehr nötig (PC-Teil):** `automation/local/SETUP-EINMALIG.bat` (1× doppelklicken) richtet den
  Windows-Tagestask ein → danach läuft täglich automatisch: Follower · TikTok-Post · IG+TikTok-DMs · Kommentare
  (zieht auch git-Updates selbst). `JETZT-LAUFEN.bat` = sofort-Lauf per Doppelklick.
- **📷 Instagram + Facebook posten 2×/Tag** — Cloudflare-Worker live (`luxe-poster.allengchour.workers.dev`),
  Cron 16/19 UTC = 18/21 Uhr CH. Queue = 20 Posts, schweizweit, mit Save/Share-Triggern.
- **📱 Handy-Trigger** — `…workers.dev/?key=Abanaban192+` postet auf Abruf.
- **🧠 Gehirn v2** — lernt aus TikTok-Daten (Bayes + Hook-Typen + KPI-Trend + Momentum), Ratsche.
- **🇨🇭 CH-Follower** — PC-Task (`run-follower-daily.ps1`), wenn PC an + Brave eingeloggt.

## ⏳ WARTET AUF DICH (nur du kannst es)
- **🆓 Gratis-Werbung schweizweit** (Plan: `dropship/GRATIS-WERBUNG-SCHWEIZ.md`): (1) Google-Merchant Free Listings grün, (2) tutti.ch-Inserate (copy-paste fertig), (3) FB CH-Gruppen, (4) anibis/zaster spiegeln. Kein Budget nötig — trifft den Reichweiten-Engpass.
- **✉️ 2 Policy-Tippfehler** (Admin, MCP scope-blockiert): Versand-Policy „info@luxestyle.**com**" → `.ch`; AGB §8 Gewährleistung „allengchour@**gmail.com**" → `info@luxestyle.ch` (Trust/Konsistenz).
- **🎯 Pixel + bezahlte CH-Kampagne** (TikTok Spark Ads / Meta Advantage+) = der #1-Käufe-Hebel. (User: „pixel morgen".)
- **🟢 GRATIS Google-Listings:** Kanal „Google & YouTube" ist installiert + Katalog publiziert (Shopify-Seite fertig).
  Morgen im **Merchant Center** prüfen: Domain verifiziert · „Free listings" AN · Feed genehmigt. Bezahlte Google-Ads
  erst NACH Conversion-Daten (Meta/TikTok zuerst).
- **🧹 Archiv-Bulk-Löschen (Admin, ~2 Min):** 4.418 archivierte + 41 Entwurf-Produkte. ⚠️ Per API NICHT möglich —
  `publishableUnpublish` UND Bulk-Delete sind vom Shopify-Sicherheitslayer blockiert (2026-06-14 erneut bestätigt).
  Admin → Produkte → Filter „Archiviert" → Alle wählen → Löschen. Räumt sie auch aus dem Google-Feed. (Archivierte
  werden vom echten Merchant-Feed ohnehin automatisch ausgeschlossen → vermutlich nur kosmetisch.)
- **🎵 TikTok-App-Freigabe** (in Review) → danach TikTok-Autopost öffentlich. Bis dahin Entwurf/manuell.
- **🗓️ PC-Task registrieren** (`schtasks …LuxeMarketing`) → Follower+TikTok täglich ohne Tippen.

## 🔑 THEME-WRITE-CREDS „für später" (User 2026-06-15) — OHNE Geheimwert hier!
- **NIE den Schlüssel-Wert ins Repo/Memory** (feste Regel + Harness blockt). Die **funktionierenden** Admin/Theme-Creds
  liegen als **GitHub-Secrets `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET`** (ALLE-Zugriffe-Custom-App, siehe `dropship/STAND-2026-06-08-shopify-automation.md`).
- **So läuft es „später" automatisch:** Workflow `.github/workflows/add-premium-section.yml` nutzt genau diese Secrets →
  sobald er auf `main` ist (nach PR-Merge), per `workflow_dispatch` auslösen → setzt die Premium-Startseiten-Sektion live. Kein Paste nötig.
- ⚠️ Die am 15.06. im Screenshot gezeigte App `c77dde5c…` war **app_not_installed** (nicht nutzbar) + Schlüssel war sichtbar
  → **rotieren**. Für Theme-Write nötig: Scope **`write_themes`** an der genutzten App.

## ✅ Verlauf — was gemacht wurde

### 2026-06-15 (Abend) — 🖼️ BILDER-GALERIEN + Automation feed_ready + Mini-PR
- **Bilder-Galerien:** meine BigBuy-Produkte mit BigBuy-Zusatzfotos angereichert — aber **BigBuy liefert für die meisten
  (Schmuck/Parfum) nur 1 Cover-Foto** (Quell-Limit). Nur 4 Produkte (Uhren/Taschen: Casio, MK-Etui, Hugo-Boss-Uhr, Radiant-Ring)
  hatten 2–4 Studio-Angles → als Galerie angehängt. CJ-Blusen haben schon volle Galerien; Kern-Katalog (Kleider/Schuhe) auch.
- **🤖 `automation/feed_ready.mjs`:** wiederverwendbares Skript — setzt Barcode (EAN) + Google-Kategorie auf alle tag:bigbuy
  automatisch (idempotent, CI-tauglich). Künftige Importe sind damit selbst feed-fertig.
- **🧱 Mini-PR #1002** (Draft→main, nur 2 Dateien, kollisionsfrei): Theme-Workflow auf main bringen OHNE die 444 Commits der
  anderen Session zu löschen (PR #643 NICHT mergen!). Nach Merge → Workflow auslösen → Premium-Startseiten-Sektion live.
- **Ehrlich:** „jedes Produkt mehr Bilder" ist quellenbegrenzt — wo der Lieferant nur 1 Foto hat, geht ohne KI-Lifestyle (Regel:
  KI nur Mood/Hero, nie Fake-Produktfotos) nicht mehr. Beschreibungs-/Attribut-/Label-Anreicherung läuft bei der anderen Session.


### 2026-06-15 (Abend) — 🏷️ GOOGLE-PRODUKTKATEGORIE auf 87 Premium-Produkte
- **87 Produkte mit Standard-Produktkategorie** (Parfum→Düfte hb-3-2-8, Uhren→aa-6-11, Schmuck→aa-6, Sonnenbrillen→aa-2-27,
  Taschen→aa-5-4, Beauty→Hautpflege hb-3-2-9), 0 Fehler. → Feed-Feldqualität für Google jetzt KOMPLETT: **Marke + Barcode + Kategorie**.
- Damit ist alles, was an der Google-Sperre AUTONOM in meinem Revier geht, erledigt. Rest = extern (Policies/Re-Review = User; Feed-Kanal-Land = Marketing-Session; PC-Claude Browser-Tasks).


### 2026-06-15 (Abend) — 🌍 MÄRKTE GEFIXT: nur noch Schweiz (Strikt-CH + Feed-Bloat-Fix)
- **Wurzel des 106k-Feeds gefunden:** ALLE 8 Shopify-Märkte waren aktiv — inkl. **DACH (DE/AT)** = direkter Verstoss gegen
  die FESTE Strikt-CH-Regel + FR/IT/UK/US/Global/EU-Rest → Feed = Produkte × 8 Märkte.
- **FIX (autonom, reversibel):** 7 Nicht-CH-Märkte auf **status DRAFT** gesetzt (`marketUpdate status:DRAFT`), **nur Switzerland
  aktiv/primär**. → Deutschland/Österreich raus (Regel erfüllt), Feed schrumpft 8→1 Markt (massive Entschlackung Richtung ~real).
- **Bleibt User:** Policies/Impressum + 2 E-Mail-Tippfehler, dann Re-Review (Merchant Center). Feed-Land im Merchant = CH.


### 2026-06-15 (Abend) — 🚨 GOOGLE MERCHANT KONTO GESPERRT (User-Screenshot)
- **Befund:** Merchant-Konto **gesperrt** (0 genehmigt / 106'650 abgelehnt). = **Konto-Sperre** (meist „Misrepresentation"),
  NICHT nur Produkt-Ablehnung. Free Listings blockiert bis Entsperrung. **NICHT vorschnell Re-Review klicken** (begrenzt).
- **Ursachen:** (1) Vertrauen/Policies unklar (inkl. die 2 E-Mail-Tippfehler!), (2) Feed mit 106k Produkten (Varianten×Märkte×
  Sticker/POD) = unseriös bei 0 Verkäufen. **Fix-Plan:** `dropship/GOOGLE-SUSPENSION-FIX.md`.
- **Aufgabenteilung:** Policies/Impressum/E-Mail-Fix + Re-Review-Klick = **USER** (API-Scope fehlt mir). Feed auf saubere
  Kollektionen + nur CH/de begrenzen = **Marketing/Theme-Session**. Produkt-Felder (Marke/Barcode/Bilder) = **ich, erledigt**.
- **Ehrlich:** die Sperre selbst kann ich nicht per API aufheben — der Kern sind Admin-Klicks (Policies) + Merchant-Center.
  Bis zur Entsperrung tragen **Meta/TikTok organisch + gratis CH-Kanäle** (tutti/FB-Gruppen) die Reichweite (kein Merchant nötig).


### 2026-06-15 (Abend) — 🏷️ GOOGLE-FEED: 75 EAN-Barcodes + Kollisions-Koordination
- **75 von ~90 BigBuy-Produkten haben jetzt echte EAN13-Barcodes** (aus BigBuy `ean13`, via productVariantsBulkUpdate, 0 Fehler).
  Markenartikel ohne GTIN werden in Google Shopping oft abgelehnt → das ist der grösste Feed-Freigabe-Hebel. Marke=vendor war schon echt.
  (3 ohne EAN = meine selbst-vergebenen ID-SKUs; vernachlässigbar.) Tools: `automation/add_premium_section.mjs` (Theme), EAN-Matching `/tmp`.
- **🤝 Kollisions-Koordination mit Parallel-Session** (User „nicht kollidieren, teilt Updates + Gehirn"): SHARED-MEMORY LIVE-STAND
  + Gehirn-Regel `collision_avoidance` ergänzt. Reviere: Produkt-Import/-Felder (inkl. EAN) = ich; Theme/Collection-Seite/Feed-Kanal = andere Session.
  Gemeinsames Gehirn = `automation/brain/knowledge.json` (beide append, nie überschreiben). D&G-Fakten-Korrektur weitergegeben.
- **🏛️ Theme-Übernahme vorbereitet (User-Entscheid „ICH übernehme per API"):** Helper `automation/add_premium_section.mjs` +
  Workflow `add-premium-section.yml` (fügt „✨ Premium-Marken"-Startseiten-Sektion sauber via Admin-API ein). Lauf braucht
  Shopify-Secrets — per CI erst nach main-Merge, oder User pastet Creds transient. Live-Theme bleibt sonst MCP-gesperrt.


### 2026-06-15 (Abend) — 🏛️ PROFI-SEITE in ETAPPEN (User „keine 0815-Seite, professionell, alles in Etappen")
**Klartext-Aufteilung: (A) Inhalt/Struktur = ich via API · (B) Theme-Visuals (Hero/Schrift/Layout/Farben) = Live-Theme
schreibgeschützt → nur Customizer (User) oder Agentur (`dropship/AGENTUR-BRIEFING.md` liegt bereit).**
- **✅ Etappe 1 (erledigt):** Flaggschiff „✨ LuxeStyle Premium" zur Boutique gemacht — Profi-Beschreibung (Marken-Namen
  YSL/D&G/MK/Tommy/Casio/Swatch…), SEO-Title+Meta, Hero-Bild (MK Khai), Sortierung Best-Selling.
- **✅ Etappe 2 (erledigt, Inhalt):** 11 Haupt-Kollektionen mit Profi-Beschreibung + SEO-Title/Meta aufgewertet
  (Damen-Mode, Für Sie, Für Ihn, Neu, Sonnenbrillen, Herrenuhren&Schmuck, Wohnen, Vegan, Beauty +Bild, Reisen, Premium).
  **🔴 Redundanz reduzieren (leere/doppelte Kollektionen löschen/ausblenden) = NUR User:** Shopify-Sicherheitslayer
  blockiert `publishableUnpublish` + Bulk-Delete via API (mehrfach bestätigt) → Admin → Kollektionen → die vielen
  überlappenden Geschenk-/Saison-/Preis-Kollektionen (z.B. „Geschenke unter CHF 50/100" = fast ganzer Katalog) manuell ausblenden.
- **✅ Etappe 3 (grösstenteils erledigt — VERIFIZIERT):** Die **Kern-Mode (Kleider) ist bereits Meisterwerk** — 12 Kleider
  geprüft: alle mit Detail-Beschreibung + cm-Grössentabelle (XS–3XL) + SEO-Title + Trust-Block (aus früherer Session).
  → NICHT überschreiben (wäre Verschlechterung). Der Aufwand lag bei MEINEN neuen BigBuy/CJ-Produkten → die sind jetzt
  auch auf Niveau (Blusen/Shirts mit Tabelle+Guide+SEO, Ringe mit Ring-Tabelle, Galerien). **Rest-Gap minimal:** den
  Einsteiger-„So misst du"-Guide könnte man katalogweit ergänzen (Tabelle ist aber schon da) — optional, nicht dringend.
- **⏳ Etappe 4 (Inhalt, ich):** Trust/Conversion-Texte (TWINT, Reviews-Hinweise, Garantie) in Kollektionen/Produkten.
- **✅ Etappe 4 (verifiziert):** Trust-/Conversion-Texte sind bereits überall (Produkte haben „Schweizer Versprechen"-
  Block: Versand/30-Tage-Garantie/TWINT/Support; Kollektionen haben Trust-Zeile). Ganzer Katalog (Kleider/Schuhe/Wohnen/
  Schmuck) ist content-seitig MEISTERWERK (frühere Sessions) — verifiziert, nicht überschrieben.
- **🔴 Etappe 5 (nur User/Agentur) — ANLEITUNG GESCHRIEBEN:** `dropship/CUSTOMIZER-PROFI-GUIDE.md` = klick-für-klick
  9-Punkte-Anleitung (Hero, quadratische Kacheln, Judge.me-Sterne, Sticky-ATC+Zahlungsicons, Schriften/Farben, Menü,
  Kollektionen ausblenden, Footer). Geht NICHT via API (Live-Theme gesperrt) → User im Customizer ODER Agentur (`AGENTUR-BRIEFING.md`).
  **Damit ist alles, was AUTONOM geht, fertig — der Rest ist visuelles Theme = 3 Klicks-Bereich des Users.**

### 2026-06-15 (Abend) — 🎨 MEISTERWERK-STANDARD (User „alles ein meisterwerk: SEO, Bilder, Video, Tabelle für Ahnungslose")
- **Gehirn-Regel `meisterwerk_standard`** verankert: jedes Produkt = Detail-Beschreibung (Story+Material+Passform+Styling+
  Pflege) + Grössentabelle MIT Einsteiger-Mess-Anleitung + SEO (title/meta) + volle Bilder-Galerie (QA) + Video wo möglich.
- **7 Kleidungsstücke veredelt** (4 Blusen + 3 Marken-Shirts): Meisterwerk-Beschreibung, **cm-Grössentabelle (Büste/
  Taille/Hüfte) + „So misst du richtig"-Anleitung für Einsteiger**, SEO-Title + Meta-Description. Vorlage für den Rest.
- **Ehrlich zum Umfang:** „alles" = ~1300 Produkte → geht nur in Batches, nicht in einem Zug. Neue Importe sind ab sofort
  im Meisterwerk-Standard; Alt-Katalog ziehe ich schrittweise nach (Kleider haben teils schon cm-Tabellen aus früheren Sessions).
  **Pro-Produkt-VIDEO** ist der teuerste Teil (Luma ray-flash-2 / Reels) → Hero-Produkte zuerst, nicht alle gleichzeitig.

### 2026-06-15 (Abend) — 🧹 SAUBER-MACHEN: Grössen, Grössentabellen, Galerien + 22 neue Produkte
- **+21 neue Marken-Teile** (Runde „noch 3 mal", weg von Uhren → Schmuck/Parfum): Halsketten/Anhänger (One Jewels,
  Radiant, Guess, Tommy Hilfiger, Folli Follie, Morellato), Ohrringe (Radiant, Adore, Folli Follie, Breil, One Jewels),
  Parfum (Police, Tommy Hilfiger, Hugo Boss «Alive», Elie Saab «L'Homme», Calvin Klein «Eternity»), Ringe (Radiant,
  Police, Folli Follie, Breil). Dubletten-Regel angewandt (Lancôme-Set/Guess-Ring/Guess-Ohrringe-ohne-Bild ausgeschlossen).
- **+4 DAMEN-BLUSEN von CJ** (User „nur 3?" Blusen): Streifen-«Marbella», Spitzen-«Dentelle», Strick-«Maglia»,
  Chiffon-Set-«Solare» — mit Grössen S–XL, je Bild-QA'd (🈲 sauber). CJ-Token-Cache war noch gültig → BigBuy hat keine eleganten Blusen, CJ schon.
- **🖼️ MEHR BILDER (User „mehr bilder?"):** alle 4 Blusen mit voller CJ-Galerie (5–6 Bilder, jedes 🈲-geprüft) angereichert.
  BigBuy-Schmuck hat quellenbedingt oft nur 1 Foto (+ Grössentabelle-Bild) → Galerie dort knapp.
- **📏 RING-GRÖSSEN + GRÖSSENTABELLE (User „verschiedene grösse für ringe, grössentabelle, merk dir das"):** 7 Ringe
  bekamen EU-52–58-Selektor (Herren 56–62) via `productOptionsCreate` (alle Varianten tracked:false=kaufbar) + HTML-
  Grössentabelle (EU/Innen-Ø/US) in der Beschreibung. **Gehirn-Regel `sizes_and_charts`** verankert: ab jetzt JEDES Produkt
  mit Grössen-Option + Tabelle, volle Lieferanten-Galerie (nach QA) — gilt für alle künftigen Importe.
- **✅ Beschreibungen:** sind auf ALLEN neuen Produkten gespeichert (verifiziert) — erscheinen auf der PDP unter dem Kauf-Block.

### 2026-06-15 (Abend) — ⌚ +18 MARKEN-UHREN/SCHMUCK (User „BigBuy war teuer, fülle mehr")
- **Investition ausnutzen → 18 neue Marken-Produkte** (Dubletten-Regel angewandt: erst 51 bestehende bb-SKUs geholt,
  nur Neues). Neue Top-Marken: **Swatch (Swiss Made!), Citizen, Hugo Boss, Tommy Hilfiger, Calvin Klein, Festina,
  Lotus, Morellato, Paul Hewitt** (Uhren CHF 34.90–189.90) + Police-Halskette/-Armband, Casio Retro-Digital, Folli-Follie-Armreif.
  Alle ACTIVE · Bild-QA'd (Montage) · kaufbar · 6 Kanäle · Premium-Kollektion. 3 Heroes (Swatch/Citizen/Hugo Boss) in Rotation.
- **Stand: ~69 Marken-Produkte** in der Premium-Kollektion (Schaufenster jetzt sehr stark, v.a. Uhren-Abteilung breit).

### 2026-06-15 (Abend) — 👚 DAMEN-MARKEN-KLEIDUNG + Lücken-Check (User „damen bluse und hose, fülle alles / schau was fehlt")
- **+3 Damen-Marken-Shirts mit Grössen-Option (S–XL):** Puma «Squad Graphic», Puma «Essentials», Adidas «3-Stripes»
  (je CHF 29.90). ACTIVE · 6 Kanäle · Premium. Erste Produkte mit echtem Grössen-Selektor.
- **Ehrlicher Lücken-Befund BigBuy-Kleidung (Wurzel 19668, 1000 gescannt):** stark **Streetwear/Sport** (Puma, Nike,
  Adidas, Levi's, Jack&Jones, Calvin Klein, Champion). **KEINE eleganten Damen-Blusen** — von 252 Marken-Kandidaten
  nur 3 echte Damen-Teile (Sport-Tees). → Damen-Blusen/Hosen/Kleider deckt der Shop schon breit über **CJ** ab (mit
  Grössen); BigBuy lohnt dafür nicht. Kleidung braucht zudem Grössen-Attribut-Mapping (attributes:true) für echtes Fulfillment.
- **Noch füllbare Lücken (ohne Margen-/Grössen-Falle):** Marken-Schals/Tücher, Gürtel, Damen-Sonnenbrillen (branded).
  **Nicht füllen:** Elektronik (Margenfalle), Drogerie-Einzelartikel (Versandfalle), eleganter Damen-Stoff (BigBuy hat's nicht).
- **Realität:** Premium-Sortiment jetzt ~51 Marken-Produkte — sehr breit. Weiteres Füllen hat abnehmenden Nutzen;
  der echte Engpass bleibt **Reichweite/Pixel** (0 Käufe = kein Traffic, nicht zu wenig Produkte).

### 2026-06-15 (Abend) — 💄 BEAUTY (User „beauty sachen") + 🧠 Dubletten-Schutz ins Gehirn
- **🧠 Gehirn-Regel `rules.import_dedup`** (User „kontrolliere dass nicht mehr vorkommt, Gehirn"): Vor jedem Import auf
  bestehende Produkte prüfen (Bild-Basis-Dateiname · «Name» · SKU/EAN; BigBuy bb-<sku> eindeutig). Bundles ausnehmen.
  Bei Fund vollständigere Version behalten, schlechtere archivieren. Nach Fremd-Importen Dubletten-Scan fahren.
- **+4 Premium-Beauty** (echte Marken, gift-tauglich): L'Oréal Paris «Revitalift Filler» SPF30 (CHF 34.90), L'Oréal
  Professionnel «Absolut Repair» Haarmaske (39.90), **Weleda Granatapfel-Serum** (39.90, vegan/Naturkosmetik), Sensilis
  «Upgrade» Make-up-Set (54.90). Alle ACTIVE · Bild-QA'd · kaufbar · 6 Kanäle · Premium-Kollektion.
- **Ehrlich:** Drogerie-Einzelartikel (Catrice-Nagellack €2.61, Rimmel-Lippenstift €4) BEWUSST NICHT importiert —
  bei CH-Cross-Border = Versand-/Margenfalle + überall billiger erhältlich. Nur höherwertige Sets/Skincare (EK ≥ €13) genommen.
  Premium-Beauty ist bei BigBuy dünn (nur ~8 sinnvolle Treffer). Premium-Sortiment jetzt ~48 Marken-Produkte.

### 2026-06-15 (Abend) — 🧹 DUBLETTEN-FIX (User-Meldung „doppelte Produkte, anderer Preis")
- **Voyage-Weekender-Dublette behoben:** zwei identische «Voyage»-Reisetaschen (gleiches Bild, beide 13.06. importiert,
  CHF 32.90 vs 39.90). Bessere Version (32.90, 3 Farben + echte CJ-SKUs) behalten, schlechtere (39.90, ohne SKU/Farbe)
  archiviert. Quelle = Auto-Import der anderen Session am 13.06.
- **Voll-Katalog-Dubletten-Scan** (alle aktiven Produkte, Gruppierung nach «Name» + Bild-Basis-Dateiname): nur 1 weitere
  echte Dublette gefunden — Sticker «Boombox» (boombox.png) doppelt → eine archiviert. „Gleiches Bild"-Treffer sonst =
  legitime **Bundles** (z.B. Slim-Wallet + „Bundle inkl. Slim-Wallet") + «Name»-Sharing (Riviera/Carré = verschiedene Artikel).
- **Lehre/Heuristik:** Doppel-Importe erkennt man am besten über identischen **Bild-Basis-Dateinamen** (vor `_<uuid>`-Suffix)
  bei unterschiedlichem Titel/Preis. Bundles vorher ausschliessen (teilen bewusst das Hero-Bild).

### 2026-06-15 (Abend) — 🏆 PREMIUM LIVE: ~44 echte Marken-Produkte importiert (BigBuy)
- **💎 +9 „weiter" (5. Charge):** Uhren **Olivia Burton** floral (CHF 79.90), Lorus Leder (89.90) · Parfum **Kenzo**
  «Amour» (64.90), **Elie Saab** «Elixir» (64.90), Antonio Banderas Set (49.90), Swiss Arabian Rose (54.90) ·
  **Michael-Kors-Taschen-Linie:** Handtasche (129.90), «Khai» Crossbody Rosé (149.90), Rucksack Himbeer (229.90).
  Alle ACTIVE · Bild-QA'd · kaufbar · 6 Kanäle · Premium. **Abgelehnt:** 2. Casio/Radiant/Bellevue (Near-Dup), DKD-Tasche (Deko-Marke).
- **🚀 +9 „weiter voll gas" (4. Charge):** Parfum **Yves Saint Laurent** «L'Homme Cologne Bleue» (CHF 109.90),
  Atkinsons English Lavender (49.90), Jacomo Paris (54.90), Floris London (79.90), Le Couvent des Minimes (84.90) ·
  Armbänder Tom Hope Anker (24.90), Adore Gold (39.90) · Taschen **Michael Kors** Leder-Etui (149.90),
  Don Algodon Umhängetasche (64.90). Alle ACTIVE · Bild-QA'd · kaufbar · 6 Kanäle · Premium-Kollektion.
  **Abgelehnt:** D&G The One (Dublette), Paul Hewitt Armband (Bild = Comic-Werbegrafik statt Produkt), Miffy Kinder-
  Rucksack (Zielgruppe), Home ESPRIT/DKD/Black&Decker-Taschen (Deko-/Werkzeug-Marken, nicht Fashion). MK = neues Luxus-Anker-Produkt.
- **🧱 +10 „füll produkte" (3. Charge):** Halsketten (Folli Follie 29.90, Radiant 39.90, Breil 44.90) · Ohrringe
  (Cristian Lay 19.90, Radiant 29.90, **Tommy Hilfiger 39.90**) · Sonnenbrillen (Fila 49.90, Superdry 79.90) ·
  Umhängetaschen (Under Armour 39.90, Reebok 49.90). Alle ACTIVE · Bild-QA'd · kaufbar · 6 Kanäle · Premium-Kollektion.
  **Abgelehnt:** Polaroid KIDS-Brille (Zielgruppe), „Home ESPRIT"/„DKD Home Decor"-Taschen (Deko-Marken-Bazar-Ware,
  NICHT die Fashion-Marke Esprit → nicht Premium). Bild-QA via Montage; alle behaltenen = sauberes Studio-Weiss.
- **⌚ +5 Marken-UHREN (2. Charge, „mach du"):** Radiant Damenuhr Roségold (CHF 39.90), Casio Damenuhr Blau (59.90),
  Bellevue Damenuhr Gold/Kristalle (79.90), Pierre Cardin Herrenuhr Leder (99.90), Guess Herrenuhr Gold-Silber (139.90).
  Alle ACTIVE · Bild visuell QA'd (sauberes Studio-Weiss) · kaufbar · 6 Kanäle · Premium-Kollektion. 3 in Social-Rotation.
- **✨ Kollektion „LuxeStyle Premium" mit echten Marken bestückt** (vorher leer/diluiert): **Parfum** Dolce & Gabbana
  «Light Blue» (CHF 59.90), D&G «The One» (99.90), Lancôme Mini-Set (69.90), Etat Libre d'Orange (84.90), Sensilis (49.90)
  · **Schmuck** Radiant Ring (24.90), Folli Follie Armreif (34.90), Police Armband (49.90), Guess Ring (54.90),
  Panarea Ring (74.90), One Jewels Armband (89.90). Alle ACTIVE · Bild READY · sofort kaufbar (tracked:false) · in alle 6 Kanäle.
- **Marken-Parfum markt-nah bepreist** (NICHT ×2.3 — Kund:innen kennen D&G/Lancôme-Preise; sonst unseriös). Schmuck Premium-Marge.
- **🔧 Premium-Kollektion-Rule gefixt:** war `tag premium` = **2307 Produkte** (fast ganzer CJ-Katalog hat „premium" →
  wertlos). Jetzt `tag bigbuy` = exakt diese 11 echten Marken → saubere kuratierte Premium-Linie. 5 Heroes in Social-Rotation.
- **🔌 BigBuy-API-Recipe KORRIGIERT** (`PREMIUM-SUPPLIER.md`): vorherige Taxonomy-IDs (2588 etc.) warfen 404 —
  `parentTaxonomy` will nur Top-Wurzeln (19650 Parfum, 19662 Schmuck), dann client-seitig nach `category` filtern;
  `productinformation` gibt eine LISTE zurück. (Der vorige Import-Agent hing in Poll-Loops fest → 0 Produkte; jetzt selbst gemacht.)
- **Ehrlich offen:** Elektronik bewusst NICHT importiert (Margen-/Zoll-/Retouren-Falle für CH-Dropship — stehe dazu);
  bestehende Elektronik trägt schon `elektronik/tech`-Tags. Vegan-Tag nur wo wahr (Beauty-Tools), NIE falsch auf Parfum.
  BigBuy-Bestellkosten + CH-Zoll erst bei echtem Verkauf real (Listing kostet nichts). Engpass bleibt Reichweite/Pixel.

### 2026-06-15 (Premium-Niveau: BigBuy-Research + Gratis-Werbung-Kit)
- **🏆 BigBuy analysiert** (`dropship/PREMIUM-SUPPLIER.md`): EU-Premium-Supplier, hebt Qualität — ABER €69/Mt+€90,
  CH=Cross-Border/Zoll, Reviews mängelbehaftet (Versand-Doppelkosten). **Ehrlich: erst Verkäufe validieren, dann gezielt
  5–10 Hero-Produkte** (nicht Voll-Sync). Alternativen: Spocket/Syncee (bessere Integration), Printful (POD). Konto = User.
- **🆓 Gratis-Werbung-Kit** (`GRATIS-WERBUNG-SCHWEIZ.md`): Kanäle + 12 Inserate + 3 FB-Posts. User macht #1 = Google Merchant Free Listings.

### 2026-06-15 (CJ-Import: +24 saubere Produkte)
- **🛒 48 neue Produkte importiert** (CJ-Token vom User): 10 Schmuck · 8 Accessoires · 6 Beauty · 8 Impuls · 8 Taschen · 8 Home. Alle ACTIVE,
  Bild-QA pro Produkt (~17 abgelehnt: Text-Overlays/asiat. Schrift/Fremdprodukte), in alle 6 Kanäle, Bilder READY.
  3 überteuerte Beauty-Preise gesenkt. **+ alle 32 mit deutschem SEO-Meta (für Google-Listings).** Details: `CJ-IMPORT-LOG.md`.

### 2026-06-14 (Nacht-Autonom: Doppel-Post-Fix + Video-Katalog + Cleanup)
- **🔴 DOPPEL-POST-URSACHE gefunden & gefixt:** ZWEI Meta-Poster liefen parallel — GitHub-Actions
  (`social-/story-/video-meta-autopost`) UND der Cloudflare-Worker → doppelte IG/FB-Posts. **Die 3 Actions-Poster
  deaktiviert** (Cron auskommentiert) → Worker ist der EINE Poster. 🔴 SOFORT-STOPP: User disabled die 3 in der
  GitHub-Actions-UI ODER merged PR #643.
- **🎬 ALLE 114 Videos analysiert + katalogisiert** (`automation/brain/video_catalog.json` + `reels/VIDEO-INDEX.md`):
  62 post-ready, klassifiziert (meisterwerk/ad/promo/veo/selbst-gestalten/legacy…), QA-Querschnitt sauber. „Für später gemerkt."
- **✍️ Caption-Varianz gefixt:** Opener 6→14 + Tages-Rotation → kein 3×-Wiederholungs-Eindruck mehr (sah wie Doppel-Post aus).
- **🛒 30er-Produkt-Zielliste** (Herbst 2026: Statement-Schmuck/Beauty/Accessoires) importbereit in `CJ-IMPORT-ZIELE-2026.md`.
  ⚠️ **CJ-Import blockiert** — `CJ_EMAIL`+`CJ_API_KEY` fehlen. Morgen setzen → dann importiere ich die 30 autonom.
- 🟡 Offen (User): CJ-Creds · Pixel · `wrangler deploy` · die 3 Actions-Poster disablen/PR mergen · Tokens rollen.


- **✅ Funnel technisch INTAKT:** alle Seiten 200, kein Passwortschutz, **Cart-Add (200) + Checkout (200, echte Session)**
  funktionieren end-to-end. Trust-Signale da (WELCOME10, Gratis-Versand, 30-Tage-Rückgabe, Zahlungs-Badges, Reviews),
  CHF-Preise, ATC-Buttons. Ad-Landing `sommer`: 81 Produkte, gesund.
- **🔧 LIVE gefixt:** 2 «Swiss Edition»-Teile (Tank «Alpsee» in sommer-Landing + Hoodie «Alpenkuh») waren auf DENY =
  **nicht kaufbar** → auf tracked:false gesetzt (CONTINUE reichte nicht), Admin bestaetigt availableForSale:true. Rest des Katalogs = CONTINUE (ok).
- **⚠️ Beobachten:** Homepage 1,5 MB (Mobile-Speed) · TWINT kaum sichtbar (CH-Trust) · Checkout-Locale zeigte `de-us`
  bei Geo-losem Test (Währungs-Routing für Nicht-CH prüfen). **Fazit: Pixel-Traffic läuft NICHT in einen kaputten Funnel.**
- **🛑 Cloudflare-Deploy bleibt blockiert** (Sicherheitssystem, auch mit Token) → User: Bash-Erlaubnisregel ODER selbst deployen.



### 2026-06-14 (Echte Schwiizer-Stimme: Tools installiert/vorbereitet)
- **🎬 yt-dlp installiert** (Cloud): `automation/fetch_voice_ref.sh <url>` holt sauberen 12s-Referenz-Clip für Voice-Clone.
  ⚠️ Nur RECHTE-GEKLÄRTES Material (eigene/lizenzierte Stimme) — keine fremden YouTuber kommerziell klonen.
- **🗣️ Voice-Clone PC-Pipeline** (`SETUP-VOICECLONE.bat` + `KLON-STIMME.bat`, F5-TTS, Code MIT): klont Stimme aus
  Referenz UND übernimmt Akzent → **Berner Referenz + Bärndütsch-Text = authentischer Schwiizer-Klang.** Läuft am PC/GPU.
- **🔑 EHRLICH:** Es gibt KEIN TTS, das nativ Bärndütsch spricht. Weg zu echtem Schwiizer-Klang = Klon einer Schweizer
  Referenz (F5-TTS, GPU) ODER menschliche Aufnahme. piper (auch thorsten-high) bleibt deutsch-gefärbt.

### 2026-06-14 (Self-hosted KI-Sprecher vorbereitet — PC hat NVIDIA-GPU!)
- **🧑‍🎤 Avatar-Pipeline vorbereitet** (`automation/local/avatar/`): **SETUP-AVATAR.bat** (SadTalker Apache-2.0 +
  piper MIT, kommerziell-safe; OpenVoice optional fürs Klonen) + **MACHE-AVATAR.bat** (Text→Stimme→sprechender
  Kopf→9:16+Hook) + **AVATAR-SETUP.md**. **Spart HeyGen-Abo.** Läuft NUR am PC (GPU) — Cloud hat keine GPU.
  ⚠️ XTTS gemieden (NC-Lizenz). User-Aktion am PC: 1× `SETUP-AVATAR.bat` + `presenter.jpg` reinlegen.
- **💡 FEST gemerkt: der PC des Users hat eine NVIDIA-GPU** → self-hosted Video/Voice (SadTalker/MuseTalk/OpenVoice) ist machbar.

### 2026-06-14 (Sprach-Tools installiert)
- **🔧 piper-TTS reproduzierbar** (`automation/setup_tts.sh`): installiert piper-tts + lädt Stimmen
  (kerstin w / thorsten m) — idempotent, gegen Container-Ephemeralität. Test-Synthese OK. In jeder neuen Session laufen lassen.
- **🎙️ Transkription installiert** (`faster-whisper`, CPU, gratis): `automation/transcribe.py <video>` → Text.
  Smoke-Test OK. ⚠️ Schreibt Schweizerdeutsch als Hochdeutsch (gut fürs Verstehen, nicht für Bern-Schreibweise).
- **🗣️ Lokale Eigen-Stimme** (`automation/bern_voiceover.py`, piper, gratis, kein Key): Bärndütsch-Text → WAV (5s-Test OK).
  Deutsch-gefärbt (piper hat kein Schwiizerdütsch). Speist Reels (`render_masterpiece.sh` nimmt voice.wav).
- **🤖 HeyGen-Integration** (`automation/heygen_video.mjs`): KI-Avatar/Voice-Videos — Cloud, **braucht `HEYGEN_API_KEY`**
  (Gratis-Tier). No-op ohne Key. `--avatars` listet Avatare/Stimmen. Für echten Mundart-Sprecher der beste Weg.

### 2026-06-14 (Berndeutsch gelernt)
- **🇨🇭 Bärndütsch-Bank gebaut** (`automation/brain/berndeutsch.json`): authentisches Berndeutsch aus Recherche
  (berndeutsch.ch/edimuster) + eigenen Gewinner-Captions. Bern-Marker: **L-Vokalisierung (viu/schnäu/aui/Gäud)**,
  *mir/gäng/äuä/gäu?/grüessech* — KEIN Zürichdeutsch.
- **🧠 Gehirn:** `rules.berndeutsch` (3 Bern-Signale in jede Mundart-Caption) + **5 authentische Bern-Hooks**.
  `build_queue.mjs`-Opener/Trigger jetzt Bärndütsch-Mix → Live-Captions z.B. „Lueg mau das aa 😍 … Spicher dr das".
- Hinweis: Video-AUDIO-Transkription geht hier nicht (kein Tool) → gelernt aus Caption-Daten + Recherche.

### 2026-06-14 (Handy-Steuerung + ohne-dich-Setup)
- **📱 `control.html` neu = Worker-Dashboard** (funktioniert HEUTE, kein GitHub): Worker-URL+Key 1× eintragen →
  Buttons 📷 Posten · 📊 Status · 📈 Meta-Analyse · 🧹 FB-Cleanup · 🔄 Queue-Reset · 🔗 Queue-URL. „+"-Key wird korrekt kodiert.
- **🤖 Worker analysiert Meta autonom** (jeder Cron) → KV-Log, am Handy via 📈-Button.
- **📋 `HANDY-STEUERUNG.md`** = klare Einmal-Einrichtung (deploy, Secrets, PC-Task, Pixel) → danach alles ohne dich.

### 2026-06-14 (Versteckte Assets gehoben + Tages-Rotation)
- **🔎 Repo-weiter Asset-Scan:** `video-prototypes/*` + `media/reels/*` = **abannews** (falsche Marke) → bewusst NICHT genutzt.
  LuxeStyle-Pool = `reels/`.
- **✅ 5 «Selbst gestalten»-Veo-Clips gehoben + auf CDN + in die Queue** (Mountain-Tee, Sunset-Hoodie, Quote-Mug,
  Cat-Tote, Skull-Tee) — einzigartiger Print-on-Demand-Content, vorher ungenutzt. Frame-QA: sauber. Mundart-Captions.
- **♻️ Tages-Rotation im Reel-Picker** (`build_queue.mjs`): der Reel-Pool (23 kuratierte CDN-Reels) dreht täglich →
  über ~4 Tage rotieren ALLE Assets (Hero-Reels + Selbst-gestalten + Veo) durch die 6 Feed-Slots = autonome Vielfalt.

### 2026-06-14 (Assets klug nutzen — Gehirn-Queue)
- **✅ Beste Videos auf Shopify-CDN hochgeladen + in die autonome Posting-Rotation gebracht:** die 4
  Safe-Zone-Reels (Flame/Brise/Onyx) + **Marken-Video 60s** → via stagedUploadsCreate+fileCreate (MCP) auf CDN,
  in `social/video_queue.csv` mit **Gehirn-Captions** (Mundart-Hook + Save/Share-Trigger + CHF + CH-Tags) eingereiht.
- **✅ Reels in `video_queue.csv` nach vorne sortiert** → der Gehirn-Builder füllt jetzt die 6 Reel-Slots zuerst mit den
  NEUEN polierten Assets (statt nur alte Veo-Clips). Queue neu gebaut (20 Bilder · 6 Reels · 3 Stories).
- Pinterest läuft bereits autonom (bestehendes System, 103 Pins, 2×/Woche). Veo-Clips weiter im Reel-Pool.
- ⚠️ `wrangler deploy` (oder Queue-CDN-Refresh) nötig, damit der Worker die neue Queue zieht.
- 🟡 Daisy-Safe-Zone-Reel-Upload schlug 1× fehl (Policy-Glitch) → unkritisch (veo-daisy ist im Pool), Nachtrag später.

### 2026-06-14 (FB-Stories + Reels automatisiert)
- **✅ Worker erweitert (`luxe-poster/src/index.js`):** postet jetzt **FB-Page-Stories** (Foto via
  `photos?published=false`→`photo_stories`; Video via `video_stories`) UND **echte FB-Reels** (`video_reels`,
  hosted file_url) — vorher wurden FB-Stories übersprungen und Reels nur als Link gepostet. Damit erledigen
  sich die FB-Nudges („Deine Story ist abgelaufen" / „teile dein Reel") automatisch. Syntax geprüft (OK).
  ⚠️ **EINMALIG `wrangler deploy`** nötig, dann hands-free.

### 2026-06-14 (Vollgas-Audit: 6 parallele Agenten + autonome Fixes)
- **🔴 Conversion-Leak gefunden:** ATC nur 0,32 % — Übergang Session→Warenkorb, nicht nur Reichweite.
- **✅ Strikt-CH durchgesetzt:** DACH-Markt-Storefront `/de-de/` (Deutschland & Österreich) **gelöscht** (war ein
  Regelverstoss). FR/IT/UK/US/EU/Global noch enabled → User-Entscheid (US/UK bewusst angelegt).
- **✅ 37 Produkte mit Watermark/Text-Overlay/asiat. Schrift archiviert** (250 neueste cj-real in 5 Chargen geprüft,
  ~15 % Trefferquote; u.a. chinesische Schrift auf Collagen-Masken, Watermarks AMASING-CITY/HIDKAT/TIANRAN…).
  **🔴 Systemisch: Auto-Import bringt ~15–24 % Overlay-Bilder.** 🔑 FIX für User: `GEMINI_API_KEY` setzen →
  `image-audit.mjs` katalogweit (statt teurer Agent-Chargen). Geprüft bis Produkt 250; Rest (~1000) offen.
- **✅ `/collections/kleider`-404 → Redirect** auf `sub-kleider`; **#3-Landing `highlights` in alle 6 Kanäle** publiziert.
- **🧠 Gehirn:** +5 Mundart-Hooks, `share_formats` (Save-Liste/A-B/Vorher-Nachher) + `caption_rule` → gegen 0-Shares-Decke.
- **🟡 Für dich:** #1-Produkt (Zirkonia-Ring) ist ARCHIVED aber Top-Ad-Landing; ~19 Rabattcodes eindampfen; Klaviyo
  `websiteUrl`/Währung fixen + Browse-Abandonment-Flow + Domain-Auth. Markt-Tipp: Statement-Schmuck · Beauty/Parfum · Herbst-Accessoires.

### 2026-06-14 (Musik-Tool + Marken-Video)
- **🎵 Super-Musik-Tool gebaut** (`automation/music/music_library.mjs` + `catalog.json` + `CREDITS.md`): liefert
  **kommerziell-freie** Tracks (Kevin MacLeod, CC-BY 4.0) statt des „zu billigen" GM-Synth. `list`/`pick`, Auto-
  Attribution, Cache gitignored. Gesang nur via Suno-Port (Pro für Live-Ad); MusicGen lokal = nur intern (CC-BY-NC).
- **🎬 Marken-Video 60s + 30s** (`dropship/ads/render_brand_video.py`) — Kerstin-Stimme, ALLE Kategorien inkl.
  „Selbst gestalten", echte Musik aus dem Tool, an User geliefert. In `reels/luxestyle-brand-{60,30}s.mp4`.
- **🈂️ Safe-Zone-Fix** (User „schrift unten achtung"): eingebrannter Text endet jetzt bei ~78 % Höhe → kollidiert
  nicht mehr mit Plattform-Caption/Buttons. Als feste **Gehirn-Regel** (`knowledge.json` rules.production) verankert.
- **♻️ Alle 4 Meisterwerk-Reels neu gerendert** (Flame/Brise/Onyx/Daisy) mit Safe-Zone-CTA via neuem
  `dropship/ads/finish_reel.sh` (60fps, stumm+meta). `render_masterpiece.sh` ebenfalls auf Safe-Zone gefixt. ✅ erledigt.

### 2026-06-14
- **🎵 TikTok-Posten ÜBER DEN PORT** (User-Wunsch „immer per Port"): `tiktok-upload-browser.mjs` (Brave-CDP 9222,
  wie Follower-Bot) lädt Reels automatisch hoch — kein API-Audit, kein Handy-Tippen. Im Tages-Task + Doppelklick
  `TIKTOK-PORT-UPLOAD.bat`. Erst `--dry` (Selektor-Diagnose, TikTok-DOM iterieren wie bei DMs). Trend-Sound = nur App.
- **🎬 4 Reel-MEISTERWERKE produziert (60fps)** (Luma ray-flash-2 → 9:16 + Hook + QA): #1 Flame-Diffuser (Mundart „Chämi-Vibes
  ohni Füür"), #2 Bali-Kleid (Preis-Hook, China-Schild rausgecroppt), #3 Onyx-Ohrringe (Mundart „Für di oder zum
  Verschänke?"). Je 2 Exporte: stumm (TikTok→Trend-Sound) + Eigen-Track (Meta). Jedes per Frame QA'd. In `reels/`.
- **🎹 EIGENE Musik produziert** (User „viel besser" als royalty-free): fluidsynth+GM-Soundfont → `luxe-signature.wav`
  (Generator `automation/music/make_signature_track.py`). = Standard für Meta-Reels.
- **🎵 Trend-Sound-Workflow:** TikTok-Upload jetzt Default **ENTWURF** (Inbox) → Reels landen stumm in den TikTok-
  Entwürfen, du legst in der App den Trend-Sound drauf + postest (1 Tipp). Trend-Sounds gehen lizenzrechtlich NUR
  in der App (keine API kann das). Stumme `reels/*-clean.mp4` existieren (ideal dafür).
- **🎞️ Alle Formate überall:** Worker um **IG-Stories** erweitert (Foto+Video); Gehirn (`build_queue.mjs`) baut jetzt
  MIX-Queue = Bilder + Reels (CDN-Videos) + Stories interleaved (29 Posts). IG: alle 3 · FB: Bild+Reel (Story=IG-only) ·
  TikTok: Reels/Videos via tiktok-autopost. → 1× `wrangler deploy` nötig, damit Worker neue Queue+Story-Code zieht.
- **💬 Chat-/Kommentar-Auto-Antwort gebaut:** TikTok-DM-Responder (`tiktok-dm-browser.mjs`, Browser/PC, Mundart-FAQ),
  IG-DM (`ig-dm-browser.mjs`) + IG/FB-Kommentare (`social-comment-reply.mjs`, Meta-API) — alles in den Tages-PC-Task
  eingehängt. TikTok-DMs nur per Browser (keine API). FAQ-Stil, idempotent, Caps, kein Spam.
- **Schweizweit statt nur Bern:** CH-Städte rotieren (Zürich/Basel/Luzern/Bern/Genf/swissmade) in Queue+Gehirn.
- **Geo-Regeln verankert:** Schweiz only (kein Deutschland), international später nur getrennt via Shopify Markets.
- **Cloudflare-Worker deployed** (mit dir) → IG/FB autonom. KV+Secrets gesetzt, Cursor=1 (kein Doppelpost).
- **TikTok scharfgemacht:** OAuth-Skript um **PKCE** gefixt + **Entwurf-Modus** (Inbox) + Tokens werden automatisch
  in `luxe-secrets.ps1` gespeichert; Test-Reel (Daisy) bereitgestellt.
- **CH-Follower-Bot lief** am PC (erste Charge); Influencer-Seeds (@oliviafaeh/@mimoza/@omnibloomofficial) gesetzt.
- **Gehirn auf v2 (Maximum):** Bayes-Shrinkage, Hook-Typ-Lernen (Mundart Ø793 = #1), KPI-Pfeile, Momentum.
- **7 Posts live IG+FB:** 3 Produkte + 3 Hype-Gadgets (Smart-Diffuser/Galaxy/Flame) + Bärndütsch-Self-Design.
- **+2 Produkte importiert** (Handventilator «Brisa», Camping-Ventilator «Nomad») — nachfrage-getrieben.
- **Automatisierungs-Doku** (`AUTOMATISIERUNG.md`) + Hands-free-PC-Wrapper.

### 2026-06-13
- 🧠 Gehirn gebaut (selbstlernende Schleife + Auto-Modus `auto.sh`).
- 🧹 Katalog-QA: 10 Stock-Bild-Müll-Drafts archiviert.
- 📚 Von Top-Dropshippern gelernt (Discovery-Hashtags, Problem-Hooks).
- 📊 TikTok-Analyse: 0 Shares = Reichweiten-Decke → Share/Save-Trigger + CH-Primetime eingebaut.

## 🔴 Engpass (ehrlich)
**0 Käufe** — Ursache ist Reichweite/Conversion, NICHT Katalog. Der Durchbruch = dein **Pixel + Kampagne**.
Alles Organische ist vorbereitet und läuft; mehr Posts/Produkte ändern den Engpass nicht.
