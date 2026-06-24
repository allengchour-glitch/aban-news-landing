# CLAUDE.md — Projekt-Gedächtnis

> 🔗 **ZUERST `SHARED-MEMORY.md` (Repo-Root) lesen** — mehrere Sessions arbeiten parallel auf diesem
> Repo + Shop; dort steht, wer was „besitzt" + der Live-Stand. CJ-Import/Katalog/Social = NUR diese Session.
> 🧠 **DANN `automation/brain/SECOND-BRAIN.md`** — das zweite Gehirn / Map of Content: EIN Einstiegspunkt, der
> alle Memory-Dateien, den aktuellen Engpass, den autonomen Loop und das Entscheidungs-Protokoll verbindet.

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
- **🧠 SELBST ENTSCHEIDEN + VERBESSERN, INFO IST DAS A UND O (FEST, User 2026-06-20 „entscheide verbessere selbst ohne zu fragen, merke. info ist a und o"):**
  Immer selbst entscheiden und umsetzen — NIE fragen (ausser echtem Geld/Budget oder Konto-Login). **Daten/Information
  haben oberste Priorität:** jede Session zuerst die echten Zahlen ziehen (Shopify-Analytics: Sessions/Quellen/abgebrochene
  Checkouts/Orders; Social-Analyse; Health-Check) BEVOR gehandelt wird — Entscheidungen daten-belegt, nicht aus dem Bauch.
  Recherche-Schwärme nutzen, Lehren sofort ins Gehirn (`knowledge.json`), Verbesserungen autonom umsetzen + committen +
  pushen. Ehrlich priorisieren am echten Engpass (aktuell: Bezahl-Schritt/Conversion + Buy-Intent-Traffic).
- **🤖 DAUERAUFTRAGS-BOT 24/7 OHNE PAUSE (FEST, User 2026-06-20 „installiere dauerauftragsbot 24/7 ohne pause mit allem"):**
  Der Bot läuft rund um die Uhr und macht ALLES autonom, ohne Nachfragen (ausser echtem Geld/Konto-Login):
  1. **TikTok = ERSTE PRIORITÄT** — posten (Giga-Bot: Browser live → API nach Audit), analysieren, lernen, engagen.
  2. **Produkte holen** aus ALLEN Kategorien — laufend tolle Produkte (BigBuy-Premium = bestes Material, am PC; CJ nur sauber QA'd).
  3. **SEO komplett MAXIMUM** — alle leeren Meta-Beschreibungen füllen (Cloud-Batches + PC `seo`-Task), idempotent.
  4. **Analyse Social + Kampagne** — regelmässig auswerten, Gewinner verstärken, Verlierer droppen (Ratsche).
  5. **Dublettenschutz IMMER** — jeder Post prüft die letzten 30 Posts (Worker) + Queue-Dedup; nie dasselbe x-mal.
  6. **Sub-Sub-Kategorien + Filter** — Katalog granular machen, Suchfilter verbessern (einfacher finden). Wenn **ChatGPT/Theme-Session
     Kategorien kritisiert → ICH behebe** (Kritik→Fix-Schleife, via SHARED-MEMORY koordinieren).
  7. **Kampagne** — die vom User freigegebene CH-Kampagne läuft bis ihr Budget (350 CHF, freigegeben) aufgebraucht ist.
     ⚠️ NIE Budget eigenmächtig erhöhen / neue Geld-Aktion ohne neue klare Freigabe. Sicherheitsfilter NIE umgehen.
  8. **„pimp alles"** — Shop/Produkt/Bilder/Texte/Reels laufend verbessern, einzigartig machen.
  Umsetzung: **`automation/local/SUPERBOT-SETUP.bat`** (ein Klick = alle PC-Tasks) + Cloud-Worker (IG/FB 24/7) +
  diese Cloud-Session (SEO/Katalog/Reels/Memory). Jede Charge: committen, Stand melden.

- **▶️ EINFACH MACHEN — NICHT FRAGEN (FEST, User 2026-06-18 „mach alles autonom, poste automatisch, muss nicht mehr sagen, sonst frag ChatGPT"):**
  Vollautonom handeln: scannen, fixen, posten, lernen — OHNE Rückfragen. Posting läuft automatisch (Worker + Metricool).
  Bei Theme/Katalog/Zahlung (TWINT/Rechnung = nicht per API, Anbieter-Install) → mit der **anderen Session (ChatGPT) via
  SHARED-MEMORY koordinieren**, statt den User zu fragen. Nur bei echtem Geld/Risiko (Kampagnen-Budget) oder Konto-Logins
  innehalten. Sonst: machen, dann kurz Stand melden.
- **🤖 SELBST-VERBESSERN (FEST, User 2026-06-18 „du bist der autonomste Bot für die Seite, verbessere Bot selber"):**
  In JEDER Session den Automations-Stack autonom prüfen (health-check, Syntax, Worker-Live-Status, Queue, Brain) und die
  **höchst-wirksame Schwäche selbst fixen** — ohne zu fragen. Maximum-Version anstreben: Worker postet 2×/Tag + engaged/
  analysiert 6×/Tag (Kommentar-Auto-Antwort), Brain lernt, Queue frisch (Worker liest queue.json LIVE von GitHub → Commit
  = sofort live, kein Deploy nötig fürs Content). Gratis-Scheduler (Metricool) = TikTok-Autopost ohne Dev-App. Jede
  Verbesserung committen + ins Memory. Engpass ehrlich priorisieren: Mobile-Conversion + Zahlung > Reichweite.
- **🖱️ KLICK-STARTER für ALLES (FEST, User 2026-06-18 „übernimm du mit einem Tool für Klick-Starter, merk dir das"):**
  Für jede PC-Aktion ein **einziges Doppelklick-`.bat`**, das ALLES selbst macht (Brave-Port sicherstellen, Seite öffnen,
  node-Tool starten) — **kein Tippen, kein git-pull, kein Listener**. User macht nur Doppelklick (+ ggf. 1× Login, das
  ist physisch unvermeidbar). Beispiele: `TIKTOK-KLICK.bat` (Reel posten), `KAMPAGNE-DRY/GO.bat`. Bei jeder neuen
  PC-Aufgabe SO einen Klick-Starter bauen statt mehrstufiger Anleitungen.
- **🛠️ „immer eine Lösung finden — sonst eine ANDERE Bot/Automation-Lösung" (FEST, User 2026-06-18):** Nie an einem
  klemmenden Weg hängenbleiben. Scheitert ein Automatik-Pfad (Listener/Worker/Brave-Port/Git-Lock), SOFORT einen
  alternativen, robusteren Weg suchen & bauen. **Bewährtes Muster: den fragilen Stack umgehen** — Browser-Tools
  **direkt** per `node …mjs` auf dem PC starten (kein git-pull → kein Git-Lock; kein Listener-Poll; kein Worker).
  Direkt-Starter: `automation/local/KAMPAGNE-DRY.bat` / `KAMPAGNE-GO.bat` (stellen Brave-Port selbst sicher, brauchen
  kein git). Lehre: Git-Lock ist IMMER nur PC-lokal (ein Prozess hält die Datei) — Cloud/Cloudflare nie betroffen;
  lösbar per `taskkill` des sperrenden Prozesses ODER indem man git ganz umgeht.
- **🔓 VOLLE DELEGATION + „merk dir alles" (FEST, User 2026-06-18):** Der User übergibt mir **alles** und volle Autonomie:
  selbst entscheiden & umsetzen, **auch Pixel-Sachen ändern/löschen** (Mehrfach-Pixel aufräumen: nur `D8EKVR3C77U6KT5BTBD0`
  behalten, `D8EQE4…`/`D85BAG…` weg), Konten/Kampagnen/Content nach bestem Wissen. Nicht ständig rückfragen — handeln,
  dann melden. ALLES Gelernte sofort ins Memory schreiben („merk dir alles"). Sicherheits-Grenzen bleiben (kein Geld
  ohne klare Freigabe = 350-Kampagne ist freigegeben; keine verbotenen Produkte; strikt CH; Secrets nie ins Repo).
- **🤖 „Bot PERFEKT einrichten + immer gratis Alternativen" (FEST, User 2026-06-18):** Den Automations-Bot robust & wartungs-
  arm aufsetzen. Bevorzugte Architektur (am wenigsten Fehlerquellen): **lokaler Windows-Task, der die node-Skripte DIREKT
  startet** (kein Cloudflare-Worker-Poll/KV-Limit, kein Listener-Dauerpoll, kein git-pull→kein Git-Lock). Worker bleibt nur
  fürs reine IG/FB-Cron-Posten. Bei Blockaden immer eine andere gratis Lösung suchen.
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
**📌 2026-06-23 (NACHT — 16-Themen-Lern-Phase + autonome Umsetzung):**
- **🧠 LERN-PHASE (Recherche-Schwärme, ~16 Themen):** TikTok-Ads · KI-Bot-Stack · CH-Konkurrenz · Kaufverhalten · Trends · CRO (PDP/Home/Checkout) ·
  virale Video-Formeln · WhatsApp (+CH-Compliance) · Gratis-SEO · Reviews/UGC · Klaviyo · AOV · Mobile-Speed · FB-Gruppen. **Gehirn 249 Regeln.**
  **KONVERGENZ aller Agenten:** Engpass = **Reviews (0★) + Mobile-Conversion**, NICHT Traffic. Komplette Roadmap: `dropship/LERN-ERGEBNIS-ROADMAP.md`.
- **✅ CLOUD-AUTONOM UMGESETZT:** 7 Frauen-Collections SEO-angereichert (Hochdeutsch keyword-reich) · Kampagnen-Bot **Traffic→Add-to-Cart** (TikTok-Lehre) ·
  **116 Produkte** vom „Grösse XS–XL"-Bug bereinigt (enrich-Regex `set\b` gefixt + VPS-Daily-Cleanup `strip_nonapparel_feedblock.mjs`) ·
  **Pixel-Healthcheck** (`luxe.pixel_status`, täglich, +Timeout-Fix) · top_products→Frauen-Winner · FB-Gruppen 5→14 (Frauen-Mode/Schmuck) + native Mundart-Captions (Ban-Schutz).
- **🎯 Pixel verifiziert feuert** (D8EKVR+ttq.page live). **🖥️ VPS läuft täglich 04:00** (verifiziert). **💻 PC aktiv** (auto-learn).
- **🔬 Klaviyo Abandoned-Checkout diagnostiziert** (Flow Vse76a): Timing 1h/24h/48h gut, ABER **Smart-Sending AN** (→aus), **Absender=„Aban"** (→LuxeStyle),
  **E3 in Draft** (→live), reply-to=Gmail. = User-UI-Fix (Klaviyo-API nur lesen). FB-Marketplace = CH nicht nutzbar (ToS) → FB-Gruppen/Shop stattdessen.
- **🔴 Engpass + NUR-USER:** ⭐ Reviews-Import (Judge.me) · 📱 Mobile-Speed/Sticky-ATC (Theme) · 📧 4 Klaviyo-Klicks · 🎬 Kampagne-Karte · 🚚 Versand 65→50. **Cloud-Machbares ist erledigt.**

**📌 2026-06-22 (SPÄT — 🖥️ VPS LIVE + 24/7-Autonomie-Architektur):**
- **🎉 HETZNER-VPS LÄUFT** (verifiziert: Metafeld `luxe.vps_last_run`=ubuntu-4gb-nbg1-1, 1. Lauf durch). Cron 04:00 täglich →
  Feed/SEO/Trend-Polish **autonom, PC-unabhängig**. `.env` ok (Shopify+Gemini+DeepSeek), Branch CizQ6. ⚠️ remote-`ghp_`-Token + alle Chat-Secrets ROTIEREN.
- **🤖 24/7-AUTONOMIE-ARCHITEKTUR (wichtig, ehrlich):** Ohne User laufen 24/7 = **VPS (API/Compute, 04:00)** + **Cloudflare-Worker (IG/FB-Posting 12/17/21 CH, Graph-API)**.
  **Browser-Tasks (TikTok-Upload, Follower, Auto-Klick Ads, Pinterest-Browser) brauchen einen ECHT-IP-Browser = NUR der PC** (Brave 9222) —
  die VPS-Rechenzentrums-IP wird von TikTok/IG geblockt (Browserbase-Lehre). Cloud-Session kann den PC-Port NICHT erreichen → steuert PC nur via Worker-Queue.
  → **Für 24/7-Browser: PC muss AN bleiben (CLOUD-AN.bat-Loop)**; dann führt der PC die gequeueten Tasks laufend aus. PC aus = Browser-Tasks warten.
- **Gequeued für PC (laufen sobald PC an):** audit-ig/tiktok/fb (alte Videos, braucht Gemini-Key in luxe-secrets.ps1), storefront-audit.
- Master-Liste aller Verbesserungen: `dropship/MASTER-TODO.md`. Brain 230 Regeln.

**📌 2026-06-22 (Daten-Sweep + CRO-Marktforschung + Ziel 100k + Klarna):**
- **📊 ECHTE DATEN 30T:** 7'070 Sessions (war 3'016 — Social zieht), ABER ATC 0.25% (**MOBIL 0.13% vs Desktop 1.2% = 9×-LEAK**),
  0 echte Käufe (1 Order = User-Testkauf, EXPIRED). **Zahlung verifiziert OK** (User: Test-Modus aus; Visa/MC/PayPal/TWINT +
  **Klarna aktiv** in Shopify Payments → Kauf-auf-Rechnung wahrscheinlich via Klarna abgedeckt; **Test-Checkout offen** ob Rechnungs-Option erscheint).
- **🎯 NORDSTERN CHF 100k/Jahr verankert** (`dropship/ZIEL-100K.md`): ~185 Best./Mt; bei 2% Conv ~9'250 Sess nötig = fast da →
  **Hebel #1 = CONVERSION, nicht Traffic** (Traffic fast da, kauft nur nicht).
- **🧠 CRO-WISSEN (6 Recherche-Agenten: YouTube + Markt/Konkurrenz/Trends/Kaufverhalten):** Engpass = **Trust + Mobile-PDP**.
  Top-Hebel: Reviews sichtbar (viele Produkte 0★), Mobile Sticky-ATC/Buy-Box, USP-Satz, Kauf-auf-Rechnung. → **Theme-Bauplan in SHARED-MEMORY**.
  **Copy + SEO-Metas sind bereits exzellent** (verifiziert) = NICHT die Schwäche. Trend-Winner: wasserfester Schmuck «See-Test», Bag Charms, Charm-Sets bündeln.
- **🚨 MARKTPLATZ-LEHRE:** Tutti/Anibis/Ricardo = SMG-Gruppe, **Tutti verbietet Dropshipping** + geteiltes Risk-Scoring →
  autonomes Tutti/Anibis-Dropship-Listing **DEAKTIVIERT** (Ban-Schutz, in VOLLAUTOMAT + run-follower-daily auskommentiert). FB-Marketplace kommerziell nur USA → FB-Gruppen.
- **🔁 DOPPELPOST-LEHRE:** gegen den ECHTEN veröffentlichten Stand deduppen (nicht nur Ledger — überlebt jetzt Rotation/git-resets).
- **🤖 AUTO-BESSER:** `top_products.csv` (Quelle des Auto-Posters) 3 Herren-Produkte → Frauen-Winner (wasserfest/personalisiert). Stack gesund (0 Syntaxfehler, Heartbeat frisch).
- **Kauf-auf-Rechnung-Anbieter:** Klarna (gratis, aktiv → erst testen) → sonst **Swissbilling** (kein Mindestumsatz, CH-Marke); **PEND/PowerPay = 100k-Mindestumsatz = Blocker**. Mail-Check: nichts eingerichtet.
- **🔴 Engpass:** Mobile-Conversion + Trust (Reviews/Rechnung). **Brain 216 Regeln.** Offen nur User: Test-Checkout · Theme-Conversion-Fixes · Kampagne auf ATC.


---
> 🗜️ **Stand-Historie gekürzt (2026-06-24):** Ältere Stand-Einträge (≤ 2026-06-21) wurden entfernt, um CLAUDE.md
> unter das 40k-Zeichen-Limit zu bringen (PC-Claude-Sessions liefen sonst nicht sauber). **Voll erhalten in der
> Git-History** (`git log -p CLAUDE.md`) + in `dropship/CJ-IMPORT-LOG.md` (Produkt-/Tageshistorie) und
> `dropship/AUTONOMER-MODUS.md` (Runbook §8–§10, CJ-Workflow, Publish-IDs). Alle festen Regeln/Daueraufträge stehen oben.
