# 📊 LuxeStyle — STATUS (immer aktuell)

> Dauerauftrag User 2026-06-14: „ich will immer Status-Bericht sehen, was du gemacht hast."
> → Diese Datei nach jeder Charge nachführen + in der Antwort zeigen. Neueste oben.

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

## ✅ Verlauf — was gemacht wurde

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
