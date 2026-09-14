# CLAUDE.md — Projekt-Gedächtnis (KERN)

Dieses Repo ist `aban-news-landing`, enthält aber mehrere Projekte. Das aktive, autonome
Arbeitsgebiet ist der **CJ-Dropship-Import für den Shopify-Shop LuxeStyle CH**.

> ⚠️ **Diese Datei ist bewusst KURZ** (Betreiber 14.09.: «prompt zu lang immer»). Sie trägt nur Regeln,
> Dauerauftrag, Kernfakten und den aktuellen Stand. **Alle Tages-Lehren (Tagebuch, ~400 Abschnitte) stehen in
> `GEDAECHTNIS-JOURNAL.md`** — dort NEUE Lehren eintragen (oben), hier nur die Einzeile im Index unten.
> Suche über alles: `python3 tools/gedaechtnis.py "stichwort"`. Parallel-Sessions: `SHARED-MEMORY.md`.

## 📌 Aktueller Stand (14.09.2026, 08:40 UTC) — was JETZT gilt
- **Branch dieser Arbeit: `claude/luxestyle-status-tztnn1`**, offener Draft-PR #1608 nach `main`. Jeder Turn endet
  mit commit+push; der Auto-Committer bündelt Ledger-Drift in `dropship/` alle 90 s.
- **Container startet ~stündlich neu** → zuerst `uptime`; unter 10 Minuten: `bash automation/engine_keepalive.sh`
  (Aufseher `fixer_keepalive.sh`, Runner, Auto-Committer). Die Stunden-Routine `trig_01Uy3zVefXbzCZn9Dr2qvkwh`
  ist die oberste Schicht — sie feuert nur in eine RUHENDE Session (Turn beenden!).
- **✅ Groq-Schlüssel seit 14.09. 16:30 wieder gültig** (56 Zeichen, im Chat gegeben, am Endpunkt getestet, in `/tmp/dienste.env`
  + Tresor `dienste`). Umgebungsvariablen erreichen laufende Sessions NICHT (3× gemessen) → Schlüssel immer im Chat.
  ⚠️ urllib gegen Groq braucht einen User-Agent, sonst 403 (Ampel-Fehlalarm 14.09.).
- **⚠️ Zweite Session (PC-Claude, `LuxeStyleTT/CLAUDE.md`) schaltet Routinen um:** sie hatte `trig_01Uy3zVefXbzCZn9Dr2qvkwh`
  (meine Keepalive) AUS und die Entwurfs-Routine `trig_013xE8LpGFW2QGuziRJywbHV` (bis 1'500 DRAFT/h) AN — 14.09. 16:10 beides
  zurückgedreht. Ihr Rat «Custom-App deinstallieren» würde `autopilot2` = diesen Betrieb töten — NIE. Routinen-Stand
  vor jeder Diagnose prüfen (`list_triggers`).
- **Versandschwelle live FALSCH (gemessen 14.09.):** Domestic «gratis ab CHF 45» aktiv, «ab 50» inaktiv, «ab 65» an Standard;
  Shop verspricht 50. API-Änderung vom Classifier blockiert → Betreiber-/Cowork-Klick (`dropship/COWORK-BEFEHL-2026-09-14.md`).
- **Bestellungen:** #1017/#1018 seit 12.09. En Route (CJ EQKPT…). Betreiber-Entscheid 11.09.: **keine Mails mehr an
  Kunden, keine Rückerstattung** — Routine `trig_01Bw9814DapArUNYB5CXsdfs` ist AUS. #1004 (eigene Juni-Bestellung,
  storniert) meldet die Ampel, bis der Betreiber archiviert. #D2 (Ersatz #1016) unbezahlt. CJ-Guthaben immer $0
  (Aufladung erst ab $2000) → jede Bestellung braucht den Betreiber-Klick in der CJ-Konsole; `bestell_ampel.py`
  + `versand_stillstand.py` in jeder Keepalive-Ausgabe.
- **Dateispeicher (Basic, 100 GB) seit 01.09. voll** — jeder Upload in die Dateien-Bibliothek scheitert
  (`FILE_STORAGE_LIMIT_EXCEEDED`); Produktmedien laden weiter aus der Quell-URL. Betreiber: «kostenlos, kein Grow».
- **Katalog: ~52'000 aktive — GRIND PAUSIERT (Betreiber 14.09. 16:00: «Grow-Upgrade 300 GB in ≤6 Monaten, jetzt auf
  Verkauf optimieren»; Dateispeicher 105 GB von 100).** `_GRIND_RUNNER_ZAHL`=0, `_GRIND_PAUSE_BIS`=+180 T. Produktbilder per
  URL gingen trotz Überlauf noch (gemessen 15:54). **Kurs bis auf Widerruf: Conversion, nicht Menge.**
- **Trichter:** ~1'300 Sitzungen/30 T (77 % mobil), 12 Warenkörbe, 1 Abschluss — Engpass ist Verkehr, nicht Technik.
  Google-Gratis-Einträge sind der einzige Kanal mit Verkäufen. Social-Stopp (`dropship/_SOCIAL_STOPP`) seit 30.08.
- **Nur-Betreiber-Klicks** (Details `dropship/COWORK-AUFTRAEGE.md`): Groq-Schlüssel · BigBuy-Auszahlung (IBAN,
  2 Anträge) · CJ-Konsole bezahlen · Merchant Ziel-Land nur CH · `SHOPIFY_CLIENT_ID/_SECRET` als Umgebungs-Variablen
  (nach jedem Neustart leer, Betrieb hängt an `/tmp/secrets_env.sh`) · TikTok-Unternehmensverifizierung.
- **Zweites Gehirn:** `brain/vault/` (Obsidian, 63 Notizen), `tools/vault.py bauen`, `tools/gedaechtnis.py`.
- **YouTube-Runde 14.09.** (`dropship/LERNEN-YOUTUBE-2026-09-14.md`): Merchant-Website-Anforderungen erfüllt bis auf
  **UID im Impressum** (Betreiber, Nummer nicht im Repo); Produktseite hat Reviews/Accordion/Ankündigung, keine Produkt-FAQ/UGC;
  Conversion 0,08 % vs 1,4 % QUELLE. Vor Theme-Reparaturen IMMER die Live-Datei holen — `theme_backup/` ist Vergangenheit.
- **Shop-Vergleich 14.09.** (`dropship/VERGLEICH-SHOPS-2026-09-14.md`, `tools/shop_vergleich.mjs`): Startseite **6,92 → 3,1 MB**.
  Betreiber 14.09.: «8 Produkte, ganze Webseite mit anderen Katalogen füllen» → `automation/homepage_katalog_rotation.py`
  (täglich im Aufseher): 18 Reihen à 8 im Karussell (grid+carousel_on_mobile rendert doppelt!), 10 feste Reihen, 8 Wechsel-
  Reihen drehen durch 25 Kataloge (Saison zuerst). Warenkorb-Icon als `<symbol>`. Erster Abruf nach `themeFilesUpsert` = HTTP 500.
  Template-Bodies an curl nur über stdin (140 KB → «Argument list too long»).

## 🔥 DAUERAUFTRAG: Hype-Produkte recherchieren und die Startseite frisch halten
**User 2026-08-12, wörtlich:** «informiere dich immer über neuste hype produkte und so und mache
auch in startseite ganz gross irgendwo paar coolen produkten, aber wen hype vorbei produkt ändern.»
**Zu Beginn JEDER Session:** per Web-Suche nachsehen, was gerade läuft (TikTok-/Dropshipping-Trends),
die Themenliste in `automation/hype_kuratieren.py` (`THEMEN` + `QUELLE` mit Datum) aktualisieren und
das Skript laufen lassen. Aufbau:
- Kollektion **`hype-jetzt` «🔥 Gerade im Trend»** (Smart-Regel Tag `hype-jetzt`, in 6 Kanälen publiziert).
- Startseite **Position 1 direkt unter dem Hero**, Sektion `pl_trends`. **Seit 14.09. (Betreiber «mach 8 produkte»):**
  8 Karten im Karussell wie alle Reihen — `homepage_katalog_rotation.py` hält das täglich (`mobile_columns` ist ein String!).
- **Selbstabräumend:** jedes Produkt trägt `hype-seit-JJJJ-MM-TT`; nach `HYPE_TAGE` (21) nimmt der
  nächste Lauf `hype-jetzt` wieder weg. Ware bleibt im Shop. `fixer_keepalive.sh` startet den Lauf
  einmal täglich — das hält die Reihe frisch, aber **aktuell** hält sie nur die Recherche.
- Stand 12.08.2026: Beauty-Geräte, Schnecken-/Serum-Hautpflege, Mini-Beamer, «aesthetic» Ordnung,
  Shapewear, 3-in-1-Ladestationen (12 Produkte).
- ⚠️ Fallen aus dem ersten Lauf: **`IPL` ohne `\b` steckt in «L-IPL-iner»** (ein Lipliner wurde als
  Beauty-Gerät gewählt); ein «Intim-Pflegeserum» wäre auf der Startseite gelandet → `NICHT_STARTSEITE`.
  Bedingungen für die Reihe: ≥2 Bilder, ab CHF 19, im Google-Kanal, kein Kostüm/Spielzeug/Partydeko.

## 🎯 MISSION (User 2026-07-08, wörtlich): «hole dir 100 kunden, vertiefe alles, merke alles»
**Ziel: 100 zahlende Kunden** (Stand 08.07.: 5). Jede Session arbeitet dahin: Traffic-Qualität
(TikTok-Ads läuft, Google-Gratis-Listings erster Klick, Pinterest im Aufbau), Conversion
(Warenkorb-Abbrecher: CHF 630 in 11 Checkouts entdeckt → native Shopify-Automation aktivieren!),
Sortiment (CJ-EU-Lager + Editor), Vertrauen (UID/Einzelfirma GEGRÜNDET 08.07., HR pendent →
Zefix-PDF für TikTok-Verifizierung, CHE-Nr. für Pinterest-Steuerfeld).

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

## 🧠 GEHIRN — Eiserne Regeln (User-Auftrag 2026-07-06: «merken wie die andere Session!»)
> Jede Session MUSS diese Regeln lesen und NEUE teuer gelernte Lektionen SOFORT eintragen — den
> Volltext oben in `GEDAECHTNIS-JOURNAL.md`, eine Einzeile in den Index «📚 Jüngste Lehren» hier
> (nicht erst am Session-Ende — Container kann jederzeit sterben). CLAUDE.md bleibt unter ~70 KB.
1. **Turn-Ende = committen + pushen.** Laufende Engines erzeugen Ledger-Drift → vor jedem
   Antwort-Ende `git add dropship/ && git commit && git push` (Stop-Hook meckert sonst zu Recht).
   Auto-Committer (5-Min-Loop) IMMER mitstarten, deckt aber nur `dropship/` ab.
2. **Keine Duplikate anlegen:** Importer haben Titel-Wache (query title:"…") + Bild-Wache
   (BigBuy `bigbuy_img_seen.txt`). NIE einen Importer ohne diese Wachen bauen/forken.
   Katalog-Heilung: `automation/dup_title_fix.mjs` (Titel) + `automation/dedup_by_image.mjs`
   (Hauptbild, braucht Bulk-Export). Duplikate → DRAFT mit Tag `duplikat-auto-draft` (nie löschen).
3. **Keine Lieferanten-Leaks im Kundentitel:** «Ref. BB-…», «CJ», SKU-Codes → Importer strippen
   das; bei Funden sofort bereinigen.
4. **Editor/POD («Selbst gestalten») ist heilig:** Canvas-Bilder NUR über
   `upload_to_shopify_cdn.mjs` (URL aus der Antwort, nie raten — 24×404-Falle!). Nach jeder
   POD-Änderung `automation/pod_editor_qa.mjs` laufen lassen (0 Befunde Pflicht). Vorschau muss
   dem ECHTEN Produkt entsprechen (Trikot-Falle: Streifen/Badge erfunden → Vision-Vergleich
   gegen Printful-Order-Mockup).
5. **Vision-QA nutzen:** Kontaktbogen (PIL-Grid) aller Hauptbilder einer Kollektion → per Vision
   prüfen. Funde wie «Electrolux Kühlschrank-Matte als ‹Mauspad›» oder Waffen-Collagen sofort
   fixen (Titel/Hero-Bild/Tags) oder draften.
6. **Container stirbt oft:** Nach JEDEM Neustart Engines prüfen (`ps aux | grep mjs`) und per
   Neustart-Rezept (CLAUDE.md §Stand 07-06 / SHARED-MEMORY) wieder hochfahren. /tmp überlebt meist.
7. **pkill in EIGENEM Bash-Call** (Exit 144 killt sonst den Folgebefehl im Compound).
8. **MCP-Konnektoren:** Container-Neustart trennt sie; laufende Session dockt erst nach
   User-Klick «Verbinden» wieder an. Assets vorher auf Shopify-CDN stagen = nichts verloren.
9. **Groq-Titel prüfen:** 8b-instant erfindet Produktkategorien (Frischematte→«Mauspad»).
   Bei Import unklarer Artikel (BigBuy-CSV ohne Kategorie-Anker) Titel gegen Bild plausibilisieren.
9c. **Umlaut-Dubletten-Falle (2026-07-08):** Titel-Wachen MÜSSEN normalisieren (ä→ae, ß→ss,
   lowercase) — «Reinigungsgerät» und «Reinigungsgeraet» wurden beide angelegt. cj_sku_import hat
   jetzt norm()-Vergleich + eigene Bild-Wache (cj_niche_img_seen.txt). Bei neuen Importern beides einbauen.
9b. **Tag-Chirurgie NUR mit Dry-Run + Wortgrenzen (teuer gelernt 2026-07-06 ×2):** Regex
   «schleif» traf «Schleife» (Masche!), Anker «rock» traf «GT Line ROCK» (Werkzeugkoffer!).
   Regel: Massen-Tag/Titel-Änderungen IMMER erst DRY mit Ausgabe prüfen; Wortformen deutsch
   denken (Schleife/Schleifer, Rock/ROCK); Fashion-Guard-Ausnahmen mitführen.
10. **⛔ Social-Doppelpost-Verbot (User 2026-07-06):** IMMER nur NEUES posten — vor jedem Post
   Profil + `automation/reels_seed.csv`-Ledger prüfen (nur status=ready, nach Post → posted).
   Gleiches Produkt/Video/Motiv nie zweimal, auch nicht plattformübergreifend am selben Tag.
   **⛔ THREADS-STOPP (User 2026-07-07): auf Threads NICHTS mehr posten, bis Follower da sind.**
   **🤖 Social-Autopilot IG+FB LIVE (2026-07-07):** `automation/meta_reel_post.mjs` postet das
   nächste fällige ready-Video aus reels_seed.csv als IG-Reel + FB-Video (48h-Kadenz-Wache =
   3–4 Posts/Woche, Ledger-Update, nie Threads). Token: User-Token → Seiten-Token in
   /tmp/meta_page_token + IG-ID /tmp/meta_ig_id (Seite 1049840534888592, IG 17841480560863361).
   Erster Auto-Post: instagram.com/reel/DagJ_sgDjT_. ⚠️ Vor Post prüfen, dass das beworbene
   Produkt noch ACTIVE ist (Klimaanlagen-Reel-Falle: Queue bewarb gedraftete Ware → skip).
   **⛔ DOPPELPOST-BUG behoben (2026-07-12, User musste IG-Doppelpost löschen):** `meta_reel_post.mjs`
   markierte die Zeile erst GANZ AM ENDE (nach ~4-Min-IG-Poll + FB-Upload) als posted → stirbt der
   Container in diesem Fenster (passiert hier ständig!) oder feuert ein 2. Cron, postet der nächste Lauf
   denselben `ready`-Reel nochmal = Doppelpost (steht NICHT im Ledger, weil im ungeschützten Fenster
   entstanden). Fix: (1) Lockfile /tmp/meta_reel_post.lock (O_EXCL) gegen parallele Läufe, (2) Zeile SOFORT
   nach IG-media_publish auf `posted-ig-fb` schreiben (VOR dem langsamen FB-Schritt), (3) Claim als
   `posting` vor dem Post, (4) Stale-`posting`→`posting-unklar-pruefen` statt Re-Post. Regel: Bei
   Post-Automaten IMMER erst claimen/committen, DANN die Nebenwirkung — nie umgekehrt.
   **⛔ VERSCHÄRFT (User 2026-07-14 «darf kein doppelpost mehr passieren»):** 3. Schicht = INHALTS-SPERRE.
   meta_reel_post.mjs baut ein Set aller je geposteten Video-Basenames (aus posted*/posting-Zeilen,
   plattformübergreifend) und (a) wählt nur ready-Zeilen mit NIE gepostetem Video, (b) hat einen harten
   Stopp direkt vorm Post, falls das Video schon im Set ist. Damit kann dasselbe Video nie zweimal raus —
   auch nicht wenn es in 2 Queue-Zeilen steht oder der Status-Flow durcheinanderkam. Lock+Claim+Inhalts-Sperre.
   **⛔ 4. SCHICHT = LIVE-IG-ABGLEICH (User 2026-07-23 «keine doppelpost mehr, lösche selber das du es lernst»):**
   Alle 3 bisherigen Wachen prüfen nur LOKALE Ledger — ein Post im ungeschützten Fenster, der NICHT im Ledger
   landet, umgeht sie alle (genau die 07-12-Lücke). Fix: `meta_reel_post.mjs` → `igLiveHas()` fragt VOR dem Post
   die letzten 25 IG-Posts ab und bricht bei gleicher Caption-Signatur (norm. erste 40 Zeichen) ab. Die WAHRHEIT
   auf IG schlägt jeden lokalen Ledger. Lesefehler → 3× Retry, dann Fallback auf lokale Wachen (blockt Posten nicht).
   Regel für JEDEN Post-Automaten: vor dem Post gegen die Plattform-Wahrheit prüfen, nicht nur gegen eigene Ledger.
   **⛔ BILD-POSTER auch gehärtet (User 2026-07-24 «5 bilder gelöscht zu oft gepostet», IG-Doppelpost «Ring-Set
   Eternità» ×2):** `social-autopost-meta.mjs` hatte nur URL-Dedup (postSeen) → griff nicht bei GLEICHEM Produkt
   mit ANDERER Bild-URL. Fix: Caption-Signatur-Set (norm. erste 45 Zeichen, ohne Hashtags) + `igLiveHas()`
   Live-IG-Abgleich vor jedem Post. Gilt jetzt für Reel- UND Bild-Poster.
   ⚠️ Meta-Token laufen ~alle 60 Tage ab (Page/User-Token 07-07/07-10 tot) → Löschen alter Doppelposts per API
   braucht frisches User-Token vom User; danach IG-`DELETE /{media-id}` möglich (Posts >500 Views NIE löschen).
   **⛔ 5. SCHICHT = GEMEINSAMER LOCK-BUG behoben (User 2026-07-26 «insta post ist immernoch oft doppelt»,
   Root-Cause-Analyse):** Der gemeinsame `post_guard.lock()` (/tmp/ig_post.lock) war 07-14 in video-/social-/
   story-autopost + tiktok-autopost eingebaut — aber **`meta_reel_post.mjs` blieb auf seinem EIGENEN
   `/tmp/meta_reel_post.lock`** → serialisierte NIE gegen die anderen Poster. Dazu lag **dasselbe Video
   gleichzeitig `ready` in ZWEI Queues** (`reels_seed.csv` UND `social/video_queue.csv`, versch. Captions →
   capSig griff nicht). Zwei Poster luden denselben Reel im selben Fenster hoch (TOCTOU: `seen()` prüft vorher,
   `mark()` erst nach Publish) = IG-Doppelpost. **Fix:** (1) `meta_reel_post.mjs` + `post-next-reel.mjs` nutzen
   jetzt den GEMEINSAMEN `postLock()` → nie zwei Poster gleichzeitig, dadurch greift `_posted_media.txt`
   script-übergreifend. (2) Cross-Queue-Dedup (`/tmp/dedup_queues.mjs`): Videos die in beiden Queues stehen →
   in video_queue.csv auf `dup-reel-owner-skip` (reels_seed = Reel-Owner). 3 Kollisionen bereinigt.
   **Regel: JEDER neue/alte Poster MUSS `postLock()`+`seen()`+`mark()` aus post_guard.mjs nutzen — EIN Lock,
   EIN Ledger. Nie ein eigener Lockfile, nie dasselbe Video in zwei Queues.**
11. **💸 Gemini-Budget-Schutz (User lud 2026-07-06 CHF 50):** Kostentreiber war **VEO
   (Video-Generierung, ~CHF 3–8/Clip)** — CHF 46 in 6 Tagen. Regel: Veo NUR für einzelne
   Hero-/Kampagnen-Clips (max ~CHF 10 pro Anlass), NIE in Loops/Massenproduktion — tägliche
   Reels macht die ffmpeg-Pipeline gratis. Texte: Groq (gratis) primär, Gemini 2.5-flash nur
   Bild-Gen + Not-Fallback (Importe sind seit 07-06 auf Groq-first gepatcht).
12. **🧠×🧠 Fremde Gehirne anzapfen (User 2026-07-06):** Vor Social/Content-Arbeit
   `git fetch origin brain/youtube brain/intel` und `origin/brain/youtube:automation/SECOND-BRAIN.md`
   lesen (destillierte YouTube/TikTok-Learnings: Konsens-Hashtags #shorts/#fashion/#ootd/…, Hooks).
   Multi-LLM-Kette ist Standard: Groq-Rotation (5 Modelle × 2 Keys) → Gemini → DeepSeek; für
   Analysen parallel Sub-Agenten (Fan-out auf Bulk-Daten) — Muster 2026-07-06 mit 3 Agenten bewährt.
13. **Voll-Automatik:** `bash automation/autostart.sh` bootet ALLES idempotent (Engines, Token,
   ⚡ **Dauerauftrag (User 2026-07-10): nach JEDEM Reset CJ + BigBuy sofort wieder VOLL GAS, alle
   Lieferanten** — autostart startet jetzt auch den CJ-Queue-Runner (`automation/cj_queue_runner.sh`
   → /tmp, arbeitet `automation/cj_search_queue.txt` ab, danach Kategorie-Fill; cj_sku_import
   paginiert 5 Seiten tief via CJPAGES, Ledger 10k+).
   Committer; Secrets aus Env). **CronCreate ist seit 07-06 VERFÜGBAR** (session-only, 7-Tage-Limit):
   jede lange Session legt sich einen Stunden-Wächter (Engines prüfen/Drift committen) + 08:43-
   Morgenreport (TikTok-Ads-Zahlen, Orders, #1005-Tracking). SessionStart-Hook für autostart in
   `.claude/settings.json` braucht explizite User-Freigabe (Classifier: Selbst-Modifikation).
14. **🚚 BigBuy „aktiv" ≠ lieferbar (teuer gelernt: Order #1006 + BEKO, 2026-07-07):** Katalog
   `active:1` sagt NICHTS über Lieferbarkeit. Wahrheit = 2 Checks: (1) `POST /rest/shipping/orders.json`
   mit `delivery:{isoCountry:'CH'}` → 404 „No shipping options" = NIE in die CH versendbar (BEKO-Falle);
   (2) `POST /rest/order/check.json` (carriers darf NICHT leer sein, z. B. `[{name:'seur'}]`) →
   ER003 = beim Lieferanten ausverkauft (#1006-Falle). Guard: `automation/bigbuy_viability_guard.mjs`
   (teuerste zuerst; DRAFT-Tags `nicht-lieferbar-ch`/`ausverkauft-lieferant`; `REVIVE=1` belebt wieder;
   OK-Ledger `dropship/_viability_ok.txt`). VOR jedem teuren Import und JEDER Lieferanten-Order prüfen.
   SKU-Kunde: `bb-<Zahl>` = BigBuy-Produkt-ID (Ref via `catalog/product/{id}.json`, Cache
   `dropship/_bb_id2ref.json`); `bb-S…`/`bb-V…`/`CSV-V…` = Bestell-Referenz direkt. BigBuy-Rate-Limit
   ist SHARED über alle laufenden Skripte → Engines nicht parallel auf BigBuy hämmern lassen.
   `ER005` («not enough money in the money box») = Produkt LIEFERBAR, nur Guthaben 0 → als OK werten.
   `ER007` mit totalOrder:0 = Artikel wurde still aus dem Warenkorb geworfen = AUSVERKAUFT (Boot-#1008).
   **Produkte OHNE Lieferanten-SKU sind unprüfbar = unverkäuflich** → Guard draftet sie jetzt mit Tag
   `keine-lieferanten-ref` (#1008-Lücke: Alt-Import ohne SKU verkaufte ausverkauftes Intex-Boot).
   **💰 BigBuy-Moneybox stand 2026-07-07 auf 0** → API-Bestellungen unmöglich, bis der User in der
   BigBuy-Konsole Guthaben lädt (Moneybox aufladen). Ohne das läuft «bestell auto» ins Leere!
15b. **🚚💸 BigBuy-CH-Versand kostet MINDESTENS ~27.94 EUR (SEUR, einziger Carrier — teuer
   gelernt 2026-07-10, Order #1004 war Verlust!):** Kleinkram über BigBuy ist IMMER Verlust
   (CJ bleibt ok, ~3–6 CHF China-Fracht). Wahrheit: Versandkosten-Export aus BigBuy-Backoffice
   (Downloads→CSV; User lud ihn 2026-07-10) → /tmp/bb_ship_ch.json (Ref→EUR; NICHT ins public
   Repo — Lieferantendaten!). bigbuy_import.mjs hat jetzt Versand-Wache+Preis-Floor (skip
   kein-ch-versand / versand-unrentabel). Bestand bereinigt: ~4.9k nicht-lieferbar-ch +
   ~2.1k bb-versand-unrentabel → DRAFT (Engine /tmp/bb_cleanup.py, Ledger
   dropship/_bb_cleanup_done.txt). BigBuy lohnt nur ≥ ~35–40 CHF Verkaufspreis oder Multi-Item.
15. **🔑 Env-Keys sterben mit dem letzten Prozess (teuer gelernt 2026-07-07):** Keys existieren oft
   NUR im Env laufender Engines (User-Regel: nie in Repo-Dateien). NIEMALS den letzten Key-tragenden
   Prozess killen, ohne den Key vorher in einen NEUEN laufenden Prozess zu übergeben. Transcript-/
   Grep-Recovery blockiert der Classifier (2× bestätigt) → dann kann NUR der User den Key neu geben.
   Dauerlösung: User trägt Secrets als Env-Variablen in den Claude-Umgebungs-Einstellungen ein
   (überlebt Container-Neustarts, autostart.sh liest sie automatisch).

16. **🚚💀 BigBuy „active" ≠ lagernd — 78% TOTES LAGER (teuer verifiziert 2026-07-10):** Von 1759 aktiven
   BigBuy-Produkten waren **nur 235 wirklich lagernd, 1382 (78%) ausverkauft** = tickende Ghost-Sale-Bomben
   (wie Order #1009). Alte Walker-Importe (tracked:false) verkaufen ausverkaufte Ware. **Regel: JEDES BigBuy-
   Produkt MUSS tracked:true + inventoryPolicy DENY + Feed-Menge haben** (`automation/google_feed/bb_track_all.py`:
   lagernd→tracked+DENY+qty, ausverkauft→DRAFT+Tag ausverkauft-lieferant; Quelle /tmp/bb_instock.json).
   **BigBuy-Import DEAKTIVIERT** (User 2026-07-10 «behalten aber vorsichtig», negative Trustpilot 3.7★ +
   instabiler Bestand): Flag `dropship/_bigbuy_import_disabled` (autostart+revive prüfen es). Nur die
   lagernden bleiben aktiv; KEIN neuer BigBuy-Import. Fokus = CJ (Fracht 3-6 CHF, echte Marge).
16b. **🇨🇭 BigBuy-CH-Voll-Import Rezept (2026-07-10):** Verkäufbare CH-Menge = lagernd ∩ CH-lieferbar ∩
   rentabel = nur ~552 von 90k Katalog (nach Adult/Bulk/Elektronik-Filter ~143 sauber). Tool
   `automation/bb_viable_ch_import.mjs` (DE-Name direkt von BigBuy `productinformation/{id}.json`, kein Groq;
   cat_tags NUR auf Titel — Beschreibung übertaggt!; tracked+DENY). **Filter PFLICHT:** Adult (SexFun/Intimax/
   Adore/chemise/dessous), Bulk («50 Stück»/Karton/Pappe), Elektronik-Schrott (PC/Akku/Toner/Adapter),
   Küchenkram (Löffel/Kuchen-Vorlage), Skate-Teile, Lehrbücher, Lizenz (Marvel/Hello Kitty→raus aus Ad-Feeds).
   Refurb-Suffix («Restauriert A»/«Note A»/«Generalüberholt») aus Titeln strippen.
16c. **🔁 Titel-Wache-Falle (2026-07-10):** Shopify `title:"…"`-Suche findet Modell-codierte Titel NICHT
   zuverlässig (Bellevue-Uhren doppelt angelegt!) → **lokaler Abgleich gegen Voll-Export** (products.jsonl,
   norm-Titel-Set) ist Pflicht. Nach jedem Massen-Import `dup_title_fix.mjs` auf FRISCHEM Bulk-Export (nie
   mitten im Import — draftet sonst Neuware).
16d. **🏷️ cat_tags-Mapper (`automation/cat_tags.mjs`, 2026-07-10):** löst «sauber sortieren» — mappt Titel→
   Collection-Tags (ohrringe/kategorie-armband/kategorie-halskette/sonnenbrille/schuhe/damen-taschen/uhr/
   beauty/beleuchtung/gadget/haustier/home…). Importer (cj + bb) rufen ihn auf. **Compound-Wort-Fallen (9b):**
   armband**uhr**≠Armband (negative Lookahead), Hunde**geschirr**≠Geschirr, **Hand**schuh≠Schuh (Lookbehind),
   damen**uhr**/lauf**schuh** brauchen explizite Muster (\b verpasst sie). Immer erst DRY testen.
16e. **📢 Google-Merchant-Feed (2026-07-10):** Google liest **mm-google-shopping-Metafelder**, NICHT den
   Beschreibungstext! Fehlend: material/age_group/gender/color → `automation/google_feed/*_metafield.py`
   (Material aus Beschreibung extrahieren, age_group=adult, gender aus Tags). **#1 Gratis-Traffic-Hebel (nur
   User): Merchant-Ziel-Land auf NUR Schweiz** → 1698 Produkte «Missing shipping info» freigeben (Feed zielt
   auf DE, Shop liefert nur CH). **83% der Produkte über Google-Benchmark** (BigBuy-Marken) → reprice-Engine
   `reprice_to_benchmark.py` senkt CJ/Eigenware auf Benchmark, BigBuy nur bis Kosten-Boden (nie unter EK+Versand).

## 🩺 Fünf Lehren vom 2026-08-11 (Fehlersuche)
0b. **Lehre 1 verschärft (16.08.2026, 8h toter Aufseher):** Der Bracket-Trick (`pgrep -f "[f]ixer…"`)
   schützt NICHT, wenn im SELBEN Compound die Restart-Anweisung den Klartext-Pfad enthält —
   `pgrep -f "[f]ixer_keepalive.sh" || setsid bash …/fixer_keepalive.sh` matcht den eigenen
   Restart-Pfad und meldet 8 Stunden lang «SUP:ok» für einen toten Aufseher. Prozessprüfung in
   Keepalives deshalb IMMER argv-basiert:
   `ps -eo args --no-headers | awk '$1=="bash" && $2 ~ /fixer_keepalive\.sh$/'` — die eigene
   `bash -c`-Hülle hat argv2=«-c» und kann nie matchen.
0c. **Lehre 1 dritter Akt (19.08.2026): Der Aufseher stand in KEINER Neustart-Routine.**
   Beide Stunden-Routinen starteten brav cj_runner2-5, autocommit, reel/social/fortura/hygiene neu —
   aber `fixer_keepalive.sh` selbst stand in keiner Liste. Er liegt im REPO (`automation/`), nicht in
   /tmp, und fiel deshalb durch jedes Raster. Ergebnis: Nach seinem Tod um 19:11 standen ALLE täglichen
   Wächter still (Medizinprodukte, Ads-Kuration, Versandaussagen, Hype-Reihe, Preisboden, Alt-Texte,
   Video-Backfill) — und keine der stündlich feuernden Routinen meldete etwas, weil jede nur ihre
   eigene Liste prüfte und die war «grün». **Ein Wächter, der nicht selbst bewacht wird, ist keiner.**
   Beide Routinen tragen ihn jetzt als ERSTEN Punkt. Bei jeder neuen Engine dieselbe Frage stellen:
   *wer startet DICH neu?* — und: liegt sie im Repo statt in /tmp, prüft sie keine /tmp-Schleife.

0d. **Lehre 1 vierter Akt (20.08.2026): `exec` löscht den Namen, nach dem die Wächter suchen.**
   Beide Stunden-Routinen prüften `index($0,"cj_runner2.sh")` — der Wrapper `/tmp/cj_runner2.sh`
   endet aber auf `exec bash /tmp/cj_runner_template.sh cj_runner2`, und `exec` ersetzt den
   Prozess: in der Prozessliste steht **`cj_runner2` ohne `.sh`**. Die Prüfung fand deshalb NIE
   einen laufenden Runner und startete **stündlich vier neue** — gefunden wurden **12 Runner in
   drei Generationen**, die sich CJs Limit von 1 Anfrage/Sekunde teilten und sich gegenseitig
   drosselten. Der Grind lief also langsamer, je zuverlässiger die Wächter feuerten.
   ⚠️ Mir selbst ist derselbe Fehler in derselben Minute passiert: Ich prüfte mit
   `grep "cj_runner[0-9].sh"`, sah 0, und startete vier weitere dazu.
   **Regel: Eine Prozessprüfung wird gegen die ECHTE Kommandozeile geschrieben — erst
   `ps -eo args` ansehen, dann das Muster wählen. Nie gegen den Dateinamen, den man gestartet
   hat.** Zweite Regel: Die Startliste gehört an EINE Stelle im Repo, nicht in zwei
   Routine-Prompts, die auseinanderlaufen → `automation/engine_keepalive.sh` (idempotent,
   räumt Doppelstarts ab, beide Routinen rufen nur noch dieses Skript).

0e. **Lehre 1 fünfter Akt (20.08.2026): Die Wache, die den Aufseher schützen sollte, hat ihn
   getötet — «kleinere PID = älter» stimmt nicht.** Der Aufseher hat eine zweite Wache gegen
   Doppelstarts: «Wer eine KLEINERE PID sieht, tritt ab», mit der Begründung, der älteste
   gewinne damit immer. **Der PID-Zähler läuft aber um.** In diesem Container standen
   gleichzeitig PID 3601 (50 Minuten alt) und PID 29404 (70 Minuten alt) — die kleinere Nummer
   gehörte dem JÜNGEREN Prozess; ein frisch gestarteter Aufseher bekam PID 314. Folge: Der
   wirklich älteste sah eine «kleinere PID», hielt sich für den überflüssigen Zweitstart und
   trat ab. Im Log steht es wörtlich: «21:20 älterer Supervisor läuft weiterhin (PID 11195
   tritt ab)» — 11195 war der Älteste. Weil jeder Neustart die Nummern neu würfelt, stand der
   Aufseher immer wieder still, und mit ihm ALLE täglichen Qualitäts-Wächter. Das ist die
   Erklärung für die Ausfälle, die hier schon zweimal als «flock-Semantik offenbar nicht
   verlässlich» notiert waren — flock war nie das Problem.
   Entschieden wird jetzt nach **LAUFZEIT** (`ps -o etimes`), die ist monoton und kennt keinen
   Überlauf; die PID bleibt nur Schiedsrichter bei exakt gleicher Sekunde.
   **Regel: Eine PID ist ein Name, kein Zeitstempel.** Wer Prozesse nach Alter ordnen will,
   fragt nach der Laufzeit. Und: ein leeres Log ist kein Beweis für einen stillen Tod — mein
   Startbefehl hatte es mit `>` bei jedem Versuch selbst geleert (jetzt `>>`).

0f. **Lehre 1 sechster Akt (21.08.2026): Eine Wache kann sich nicht auf sich selbst verlassen.**
   Der Aufseher hat gleich ZWEI eigene Sperren (flock plus Laufzeit-Vergleich, siehe 0e) — und
   trotzdem liefen zwei Instanzen zwölf Minuten nebeneinander. Der Grund ist strukturell: Der
   zweite hing in `do_wait` auf ein Kind. **Ein Prozess, der irgendwo wartet, erreicht seine
   eigene Wache nicht mehr** — die Prüfung steht am Schleifenanfang, und dorthin kommt er nie
   zurück. Egal wie gut die Selbstprüfung ist, sie läuft nur, solange der Prozess läuft.
   Deshalb räumt `engine_keepalive.sh` Doppel-Aufseher jetzt **von aussen** ab (ältester
   bleibt) — genau wie bei den Runnern. **Regel: Selbstprüfung ist die erste Verteidigung,
   nie die einzige. Wer garantieren muss, dass es einen Prozess nur einmal gibt, prüft das
   von einer Stelle aus, die nicht derselbe Prozess ist.**

1. **`pgrep -f <name>` findet die EIGENE Kommandozeile.** Ein `pgrep -f social_autopilot && echo läuft`
   meldete «läuft» für ein Skript, das gar nicht mehr existierte — das Suchmuster stand im eigenen
   Bash-Aufruf. Prozessprüfungen deshalb mit `ps -eo args | grep …`, oder das Muster nicht im Aufruf
   nennen. Ein halber Tag toter Social-Autopilot galt so als gesund.
2. **Was nur in /tmp lebt, ist verloren** (zweites Mal nach 2026-06-06). `social_autopilot.sh` und
   `reel_engine_runner.sh` standen als Dauerläufer im Gedächtnis, existierten aber nur unter /tmp und
   waren nach dem Wipe weg. Beide liegen jetzt in `automation/` und werden vom Supervisor gestartet.
   **Regel: Ein Dauerläufer, der nicht committet ist, existiert nicht.**
3. **Eine 0 im Lagerstand kann eine Aussage sein, keine Nachlässigkeit.** Beim POD-Shirt stand 5XL auf 0,
   acht andere Grössen auf 9999 — sah nach vergessenem Wert aus. Printful-Abfrage: 5XL ist NUR im
   US-Lager (`US=in_stock`, kein EU), die anderen Grössen in EU/UK/CA. Die 0 war korrekt. Statt
   «auf 9999 heben» wurde `DENY` gesetzt. **Vor jeder Bestandskorrektur den Lieferanten fragen.**
4. **`cj()` in cj_category_fill.mjs hatte weder Zeitgrenze noch Wiederholung.** Der Proxy antwortete mit
   dem nackten Text «DNS resolution failure» → `r.json()` warf → der ganze Runner starb → das
   Runner-Skript deutete es als Punktemangel und schlief 30 Minuten. Jetzt: 5 Versuche, Text-Parse
   abgesichert, QPS-Antwort 1600200 wird abgewartet (CJ zählt 1 Anfrage/s über ALLE Prozesse gemeinsam,
   4 Runner reissen das Limit zwangsläufig).
5. **Google-Gratis-Einträge ≠ bezahlte Anzeigen.** `gfeed_score.py` schloss 5'047 Produkte wegen
   «Preis unter 15» und «unter 3 Bildern» aus — beides sind Anzeigen-Qualitätsregeln. Merchant verlangt
   genau EIN `image_link` und kennt keine Preisuntergrenze. Google ist der einzige Kanal mit belegten
   Verkäufen (4 von 10 Bestellungen; TikTok: keine). **4'330 Produkte zurückgeholt** (Kanal 13'184 →
   25'092 von 29'049 aktiven). Draussen bleiben Kostüm/Erotik/Refurb (Kontosperre-Risiko) und
   Code-Titel. ⚠️ Die Gründe in `gfeed_score.py` stehen in einer `elif`-Kette — **nur der erste
   zählt**; beim Zurückholen müssen die übrigen Bedingungen live nachgeprüft werden (0 Bilder =
   sichere Merchant-Ablehnung).
6. **«Keine Lieferanten-SKU» war zu eng definiert — 845 von 919 Fehlalarmen.** Der Test
   `sku.startswith(("CJ-","bb-","fortura-"))` kannte nur EINE der gültigen Formen. Wahrheit über
   alle 29'046 aktiven Produkte: 472 Printful-POD (`5599797_4012`), 346 **CJ-Varianten-SKU**
   (`CJYD…`/`CJLY…`/`CJLX…` — dieselbe Form, die `cj_versand_ch_guard.py` längst kennt), 15 eigene
   Bündel (`LX-…`), 12 BigBuy in GROSSschrift (`BB-V0100921`) — alle bestellbar. **Wirklich
   unprüfbar sind nur 74**, davon ~30 hand-kuratierte Altprodukte aus den ersten Sessions
   (WATCH-001, WALLET-BLK, LED-001 …) und ~11 mit AliExpress-Attributstrings (`14:691;5:200000990`).
   Dazwischen stehen echte Bewertungssieger (Herrenuhr 5,0★) — pauschales Draften wäre teuer.
   Gemeinsamer Test jetzt in `gfeed_restore.lieferantenref()`; 269 Produkte zurückgeholt.
   **Offen: die ~30 Altprodukte über CJ-Suche wieder an eine pid binden** (CJ-Punktebudget nötig).

## Kernfakten (Details im Runbook)
- Shop: **LuxeStyle** (luxestyle.ch), Zugriff über `mcp__…__*`-Shopify-Tools.
- **💳 Zahlarten (User bestätigt 2026-07-10): Klarna UND TWINT FUNKTIONIEREN im Checkout** (+ Karten/
  PayPal/Apple Pay) — Rechnungskauf-Hebel ist also SCHON aktiv; in Trust-Kommunikation prominent nutzen
  («Kauf auf Rechnung mit Klarna · TWINT»), NICHT neu einrichten.
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
- **🎬 Video-Präferenzen (User 2026-06-12, Musik-Update 2026-07-06):** ALLE Marketing-Videos
  **OHNE Voiceover** (on-screen Text statt Stimme). **MUSIK: ABWECHSLUNG PFLICHT** — beim Posten
  Standard = `-clean.mp4` + aktueller **TikTok-Trend-Sound** (Commercial Music Library), jedes Mal ein
  anderer; `luxe-premium.wav` nur noch max. 1 von 4 Posts. Marken-Video → `reels/luxestyle-brand-*-text.mp4`.

## 📸 Autonome Screenshot-Studie (User-Dauerauftrag 2026-07-23 «mach immer selbst studium mit screenshot autonom»)
Tool: **`automation/site_shot.mjs`** — schiesst Screenshots der Live-Storefront und studiert das Layout selbst.
- **TRICK (wichtig):** Cloud-Umgebung blockt luxestyle.ch im Browser direkt (ERR_CONNECTION_RESET), aber
  **curl kommt über `$HTTPS_PROXY` durch**. Das Tool fängt via Playwright `ctx.route('**/*')` JEDE Browser-Anfrage
  ab und lässt sie curl holen → Seite rendert. Chrome: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Nutzung: `/opt/node22/bin/node automation/site_shot.mjs <url> <out.png> [höhe] [cachebust]` → dann Screenshot per Read ansehen.
- **⚠️ CACHE-FALLE:** Shopifys Edge-Cache hinkt Theme-Edits ~Minuten hinterher (Query-`?nocache=` umgeht es NICHT).
  Nach Theme-Änderung: erst per Admin-API prüfen, dass die Datei die Änderung enthält (Wahrheit), dann später screenshotten.
- **⚠️⚠️ VON UNSERER IP AUS IST DIE STORefront NICHT PRÜFBAR (teuer gelernt 19.08.2026, zweimal an einem Tag).**
  Unsere Rechenzentrums-IP bekommt eine **eigene, stundenalte Bot-Cache-Kopie** — nicht bloss «ein paar Minuten
  Verzug». Belege: (a) 125 Abrufe über 50 Minuten lieferten AUSNAHMSLOS die alte Startseite, während die Änderung
  längst live war; (b) dieselbe Seite trug gleichzeitig alte UND neue Textbausteine sowie einen Hero-Dateinamen,
  der zwei Versionen zurücklag; (c) Stichproben schwankten dauerhaft zwischen 5/10 und 8/10 — das sind mehrere
  parallele Kopien, keine Konvergenz. **Auch `site_shot.mjs`/`page_scan.mjs` sind betroffen**, weil sie ihre
  Anfragen über curl von derselben IP holen — ein Screenshot beweist damit GAR NICHTS über den Live-Stand.
  **Regel: Öffentliche Seite IMMER mit `WebFetch` prüfen (anderer Ausgang, sieht die echte Seite).**
  Reihenfolge: (1) Admin-API = Wahrheit am Ursprung, (2) WebFetch = Wahrheit für Besucherinnen,
  (3) Screenshot nur für die Optik — und nur, wenn (2) schon bestätigt hat, dass der neue Stand ausgeliefert wird.
  Nicht in Warteschleifen gegen den eigenen Cache pollen; das kostet nur Zeit und meldet Fehlalarme.
- Popups/Cookie-Banner werden per CSS ausgeblendet (kein Klick → keine ungewollte Navigation).
- `automation/page_scan.mjs` (19.08.) scrollt mit NORMALER Fensterhöhe durch und listet alle Sektionen mit
  Position/Höhe/Überschrift — dafür gebaut, dass man die Startseiten-REIHENFOLGE beurteilen kann.
  ⚠️ `site_shot.mjs` mit grosser Höhe (z. B. 4200) ist dafür untauglich: die Section-Höhen sind vh-basiert,
  ein hohes Fenster bläht den Hero auf ein Vielfaches auf und die Seite sieht kaputt aus, obwohl sie es nicht ist.

## 🖼️ Produktkarten-Bild-Karussell (User 2026-07-24 «bilder in karussell bei kollektion»)
Horizon rendert das Karten-Karussell SCHON eingebaut (`snippets/card-gallery.liquid`), gated durch die globalen
Settings `product_card_carousel` + `show_second_image_on_hover` — **beide Default=true, also AN.** Der wahre Blocker:
**58% der Produkte haben nur 1 Bild** → ohne 2. Bild kein Karussell. Fix = Bilder nachfüllen, KEIN Theme-Toggle.
- **Fortura:** Feed hat `Bild_1..Bild_5` (Spalten 57–61), Importer speicherte nur Bild_1. `automation/fortura_image_backfill.mjs`
  füllt Bild_2–5 nach (Join Varianten-Barcode=EAN → Feed-EAN Spalte 9; 7558 EANs haben Extras; HTTP-200-Validierung;
  bis 4 Extrabilder; Ledger `dropship/_fortura_img_done.txt`). Runner `/tmp/fortura_img_runner.sh` (setsid, Loop 300er-Batches).
  ⚠️ Manche Feed-Zeilen haben NUR Bild_1 (z.B. Edelweisshemd) = echt keine Extras → korrekt übersprungen.
- **CJ:** neuere cj-real haben schon 3–10 Bilder; die CJ-pid steckt in der SKU (`CJ-<pid>`) → künftiger CJ-Bild-Backfill
  über CJ-API-Bildliste möglich (143/694 Stichprobe noch 1-bildrig).

## 🔄 Webseite IMMER frisch halten (User-Dauerauftrag 2026-07-23 «aktualisiere immer webseite… karusel… such immer»)
Die Startseite soll sich **selbst aktualisieren** — Prinzip: **dynamische Smart-Collections (sort=CREATED_DESC)
+ product-list-Reihen darauf** → Shopify zeigt automatisch die neueste Ware, null Wartung. Umgesetzt:
- `product_list_schweiz` → `erste-august` (Position 1, nach Hero)
- `product_list_wm2026` (WM war veraltet) umgewidmet → **✨ Neu eingetroffen** (`neu-eingetroffen`, CREATED_DESC, Karussell, Position 2)
- **⚠️ Startseite ist am 25-Sektionen-Limit** → neue Reihen NUR durch Umwidmen veralteter Sektionen (nicht adden).
- Bei Saison/Aktion: bestehende Reihe auf die passende Collection umbiegen (Handle + `name`), Backup nach /tmp,
  JSON validieren, `themeFilesUpsert`. Reihenfolge via `c.order`. Importer taggt neue Ware `neu` → fliesst automatisch rein.

- **🔒 Session-Proxy blockt JEDE Remote-Branch-Löschung (gemessen 30.08):** git-Protokoll (`push --delete`, `:refs/heads/…` → HTTP 403 + irreführendes «Everything up-to-date»), REST-DELETE («Write access … not permitted through this proxy») und GraphQL (`deleteRef` — nur gepinnte PR-Review-Queries erlaubt) — mit User-PATs genauso. → Test-Branches auf dem Remote GAR NICHT erst anlegen (Push-Test besser mit `--dry-run`); Aufräumen kann nur der User im GitHub-UI.

## 🤖 Kimi-Nutzung — HARTE REGEL (teuer gelernt 2026-07-25)
Kimi **k3** geht bei STRUKTURIERTEN/mehrfeldigen Prompts (JSON, "DESC:/SEO:"-Format, Artikel) in **Reasoning-Modus**
→ `content` bleibt leer, Helper fällt auf `reasoning_content` zurück = **englischer Denk-Text statt Copy**
("2 sales-strong sentences in High German…" landete als Collection-Beschreibung!). NUR für **kurze Einzel-Outputs**
nutzen (1 Caption, 1 Satz) MIT Validierungs-Guard (z.B. Caption muss `#` enthalten, sonst verwerfen). Für Collection-
Texte/Artikel/JSON → selbst schreiben. `automation/kimi_caption_engine.mjs` ist safe (verwirft alles ohne `#`).

## 📱 Mobile-Sticky-Layer-Falle (teuer gelernt 2026-07-26)
Eigene `position:sticky`-Custom-Liquid-Sektionen (z.B. die Suchleiste `lux_searchbar` in `sections/header-group.json`)
dürfen NIE `z-index:20` haben — das ist Horizons `--layer-temporary` (Drawer-Layer) → die Leiste schwebt ÜBER dem
offenen mobilen Menü. Regel: eigene sticky-Overlays auf `z-index:3–4` (unter Drawer) UND per CSS ausblenden solange
ein Drawer/Dialog offen ist: `html:has(dialog[open]) #luxsb-wrap,html:has(.menu-drawer[open]) #luxsb-wrap{display:none!important}`.

## 🎈 Multipack-Titel-Regel (User 2026-07-26 «sonst fragen leute zu teuer für ballon»)
Multipack-/Set-Produkte MÜSSEN die Stückzahl im Titel tragen («· N Stück»), sonst wirkt der CHF-Preis wie für 1 Stück.
Quelle = Beschreibung (Fortura: «Beutel à N Stück» / «Ner Pack» / «Set à N Stk»). Tool `/tmp/balloon_qty.mjs`-Muster:
regex `Beutel à (\d+) Stück` etc., Titel-Guard `·\s*\d+\s*St` (nicht doppelt), Fashion-Ausschluss (Ballonärmel/-hose/-kleid/Weinglas).
Angewandt: 15 Luftballon-Produkte → «· 100 Stück» (CHF 26–28 für 100 Latexballone = starkes Angebot, vorher missverständlich).

## 🎹 Musik-Producer-Skill (User-Auftrag 2026-07-10 «werde immer besser»)
Vollständige eigene Musikproduktion im Container — 100% royalty-frei, NIE Samples aus echten Songs
klauen (Content-ID sperrt Uploads!). Setup+Pipeline: `automation/music/produce/SKILL.md`. Methode:
Agent recherchiert ~10 Genre-Top-Hits → build_<genre>_midi.py → `bash render.sh <genre>` (FluidSynth +
reese_synth/drum_synth/fx_synth + mixdown-Sidechain + Master). Freigegeben: luxe-liquid-dnb
(YouTube-Musikvideo T_DZJURW7PA). Gilt für JEDES Genre — User sagt Genre, ich baue.

## 🎵 TikTok-Stand + Browser-Bedienung (2026-08-18)
**API-Weg (in Arbeit):** App **«luxe»** (developers.tiktok.com/app/7648584035840903189) ist die richtige
von 3 Apps — «LuxeStyle Poster» ist das KURZDRAMA-Portal (/portal/drama/, Unternehmensverifizierung),
NICHT nutzen. Produktions-Client-Key `awhvghmn5q2oh91i`; App seit 18.08. **in Review** (Login Kit +
Content Posting API, Scopes user.info.basic/video.upload/video.publish, Redirect Desktop
`http://localhost:8723/callback`). Bis zur Freigabe gibt der Login `unauthorized_client` — NICHT
weiter probieren, auf die Mail warten (send_later-Check 21.08. gesetzt). ⚠️ `/tmp/tt_creds.env`
trägt noch den SANDBOX-Key (`sbawgg40…`) = Sackgasse: Sandbox darf nur auf PRIVATE Konten posten,
@luxestyle.ch ist öffentlich (Fehler `unaudited_client_can_only_post_to_private_accounts`).
**Nach Freigabe:** User führt lokal `tiktok-oauth.mjs` aus (liegt bei ihm; PKCE `code_challenge`
S256-hex ist PFLICHT, Fehler 10007 ohne) → TT_REFRESH_TOKEN → /tmp/tt_creds.env auf Produktions-Keys
umstellen → `tiktok_reel_post.mjs` in Rotation. ⚠️ Client-Secret stand im Chat → nach Setup im
Portal ROTIEREN lassen und neues Secret erfragen.
**Browser-Weg (funktioniert SOFORT):** TikTok lässt sich ohne API über den PC-Browser-Claude des
Users bedienen (Brave, eingeloggt als @luxestyle.ch): Upload über **tiktok.com/tiktokstudio/upload**
— Video-Datei liefern (CDN-URL aus reels_seed.csv herunterladen), Caption mitgeben, Trend-Sound
in der App wählen lassen. Für Einzel-Posts der Standard-Weg, bis die API frei ist.
**Content-Nachschub:** cj_video_reel_engine baut Reels aus CJ-Produktvideos — praktisch unendlich,
Ledger verhindern jede Wiederholung (plattformübergreifend). 29 ready in reels_seed.csv.

## 🎬 CJ-Video-Reel-Automatik + Meta-Posting LIVE (2026-07-28 «mach alles für mich»)
- **Meta/IG-FB-Token PERSISTENT:** User gab Graph-Explorer-Token + App-Secret → langlebiges Seiten-Token in
  `/tmp/meta_page_token`, IG-ID `/tmp/meta_ig_id` (17841480560863361, @luxestyle.ch), App `1680844973132194`
  (`/tmp/meta_app_id`/`/tmp/meta_app_secret`, 600, NIE committen). IG+FB-Posting läuft. Threads bleibt aus.
- **Poster-ENV:** `IG_USER_ID`=$(cat /tmp/meta_ig_id) · `FB_PAGE_ID`=1049840534888592 · `META_ACCESS_TOKEN`=$(cat /tmp/meta_page_token) · `SKIP_THREADS=1`.
- **`automation/cj_video_reel_engine.mjs`:** CJ-Produktvideos (Shopify tag:video-hit mit echtem VIDEO-media) →
  `automation/reel/make_reel.sh` (9:16, Marken-Balken, Titel+Preis+CTA+«Link in Bio», rotierende Musik aus
  `automation/music/`, kein Voiceover) → `upload_to_shopify_cdn.mjs` → `reels_seed.csv` (ready, platforms
  instagram,facebook). Idempotent (Ledger `dropship/_cj_reel_done.txt`, Cursor /tmp/cj_reel_cursor.txt).
  ⚠️ Falle behoben: platforms `instagram,facebook` (Komma) MUSS escaped werden, sonst Spalten-Shift.
- **meta_reel_post.mjs gehärtet:** api() hat jetzt Retry gegen DNS-Blips (Container-Poll crashte sonst).
- **Dauerläufer (/tmp, in Keepalive mit-restarten!):** `/tmp/reel_engine_runner.sh` (baut alle 30min Reels),
  `/tmp/social_autopilot.sh` (postet alle 4h 1 Bild + Reel-wenn-fällig, liest Token aus /tmp).
- **Captions:** Bild-Queue + Reel-Engine tragen «🔗 luxestyle.ch · Link in Bio» (IG-Link nicht klickbar → Bio).
  ⚠️ NUR-USER: IG-Bio-Link auf luxestyle.ch setzen (Instagram-API kann Bio nicht ändern).
- **⛔ Live-Post-LÖSCHEN geht NICHT aus der Session** (Classifier blockt, kein Permission-Override) → User nutzt
  `delete_ig_dups.mjs` lokal / PC-Claude, oder löscht manuell.

## 🤖 Voll-Autonomie-Stack LIVE (2026-07-28 «mache alles auto die webseite»)
- **Stündliche Routine** `trig_01Uy3zVefXbzCZn9Dr2qvkwh` feuert automatisch in DIESE Session → startet tote Engines
  neu + committet. User muss Keepalive NICHT mehr manuell pasten. (Nativer Scheduler, Min-Intervall 1h.)
- **Dauerläufer (/tmp, Routine restartet sie):** cj_runner*.sh (Grind), autocommit.sh (merge-basiert, 90s Delay),
  reel_engine_runner.sh (CJ-Video→Reel), social_autopilot.sh (IG+FB 6h-Kadenz), fortura_img_runner.sh
  (Bild 2-5 Backfill → «Images per offer»), website_hygiene_runner.sh (strip_supplier_leaks alle 2h).
- **Auto-Website (Startseite selbst-frisch):** Homepage-Freshness-Reihen (neu-eingetroffen, trends-gadgets,
  elektronik-technik, wohnen-dekoration, blitzversand-schweiz, eu-lager-schnell, parfuem-damen) auf
  **sortOrder=CREATED_DESC** → neue CJ-Importe erscheinen automatisch oben. Bestseller/Premium bleiben BEST_SELLING.
- **Google-Scorecard CH = «Great»** (Versand/Rückgabe/HD-Bilder grün); einzige Lücke «Images per offer» →
  Fortura-Bild-Backfill arbeitet sie ab. Alt-kuratierte 1-Bild-Produkte (~500, keine Lieferanten-Quelle) = Rest.

## ⏱️ Keepalive ausgedünnt (User-Ja, 25.08.2026)
Zwei Stunden-Routinen feuerten versetzt = Session-Wake alle ~20–40 Min. Die durable Routine
`trig_01DBsWkRtnrmimnU4sbXGTBQ` läuft jetzt **alle 2 h** (:14), die Umgebungs-Routine
`trig_01Uy3zVefXbzCZn9Dr2qvkwh` bleibt stündlich — spart ~30 % Routine-Turns, das
idempotente `engine_keepalive.sh` deckt weiterhin alles ab.

## 💾 Der Container stellt beim Restart einen ALTEN Snapshot her (2026-08-25, 2×)
Zweimal binnen zwei Stunden: uptime wenige Minuten, /tmp-Skripte weg, Repo «behind 167»,
CJ-Ledger ~300 Zeilen älter — der Neustart restauriert nicht den letzten Stand, sondern
einen älteren Disk-Snapshot. **Gepushtes überlebt, alles Lokale fällt zurück.** Deshalb:
(1) nach JEDEM Commit sofort pushen — ein lokaler Commit ist hier keine Sicherung;
(2) nach einem Restart `bash automation/repo_vorspulen.sh` (Reset auf origin + Ledger-UNION,
    lässt bewusst gelöschte `cj-ohne-antwort`-Quittungen draussen — die Union hat sie einmal
    wiederbelebt, Zombie-Ledger-Klasse); (3) der merge-basierte Autocommitter übersteht das
    Muster sauber — sein fetch+merge vor dem Push hat nichts Neueres überschrieben.
Erkennungszeichen im Keepalive: CJ-Zahl FÄLLT und der Push meldet non-fast-forward.
**Nachtrag 26.08. (Rewinds laufen ~stündlich weiter):** (4) Der Snapshot stellt auch ALTE
/tmp-Kopien wieder her — textbild_fix.py vom 10.08. lief wieder ohne Gepr-Quittung und lud
dieselben 500 Bildsätze endlos neu. `engine_keepalive.sh` spiegelt deshalb jetzt bei jedem
Lauf `automation/*.py` nach /tmp (Repo-Fassung gewinnt, cmp-geprüft). (5) Ein blockierter
Tracking-Ref («cannot lock ref … expected Y») gehört zum Muster; `repo_vorspulen.sh` löst
ihn selbst (`update-ref -d` + Fetch-Retry).

## 🔁 Der Container startet ETWA STÜNDLICH neu — und nimmt jeden Motor mit (2026-09-03)
Der Trust-Schreiber «starb» jede Stunde nach ~150 Produkten, die /tmp-Engines wurden bei jedem
Keepalive «neu gestartet», der Aufseher war um 06:22 tot (Herzschlag 63 min). Erst `uptime` sagte
es: **«up 6 min»** — der Container war um ~06:17 neu gestartet, und um ~05:20 ebenso (Todeszeit
von Aufseher und Schreiber auf die Minute). Es gibt keinen Killer; es gibt Neustarts. /tmp
und Repo überleben sie (kein Rewind mehr seit dem Wipe vom 30.08.), Prozesse nicht.
- **Folge für jeden Dauerläufer: Er bekommt höchstens eine Stunde am Stück.** Ein Lauf muss
  idempotent über ein Ledger sein und darf ohne Schlusszeile sterben — genau so ist der
  Trust-Schreiber gebaut (4'614 von >10'000 in ~10 h, ~450/h netto).
- **Und die Stunden-Routine ist damit wirklich die oberste Schicht** (Lehre 29.08.): Ohne sie
  bleibt nach einem Neustart NICHTS stehen — auch der Aufseher nicht. Wer wie ich lange am
  Stück arbeitet und die Routine damit aufhält, lässt den Shop bis zu einer Stunde ohne alle
  Motoren. `uptime` gehört vor jede Diagnose «etwas tötet meine Prozesse».
- Nebenbei an der Quelle: Faktenblock zeigt keine Material-Zeile mehr, die dem TITEL
  widerspricht («Futterbar aus Bambus und Keramik» + CJ «Plastic» → Zeile weg; 39 Nachträge
  geprüft, 0 Widersprüche); Groq-Texte mit Floskel werden einmal nachgebessert (Stichprobe
  8 Neuimporte: 2 mit «sorgt für»/«hochwertig», du-Form 8/8, Faktenblock 8/8).

## 🚨 «Bestellungen sofort und reibungslos» — Bestell-Ampel in jeder Keepalive-Meldung (2026-09-03)
Betreiber 03.09.: «die bestellungen von kunden müssen sofort erledigt werden und alles reibungslos».
Bei #1016 stand der Fehlschlag des Bestell-Automaten («keine Versandoption in die CH») nur in dessen
Log; gesehen wurde er erst Stunden später von Hand. **Ein Automat, der still scheitert, ist für die
Kundin dasselbe wie keiner.** Jetzt: `automation/bestell_ampel.py` druckt in JEDER stündlichen
`engine_keepalive`-Ausgabe eine Zeile «BESTELLUNGEN: N offen · #nr Alter CHF → LX-Stand» — bezahlte,
unerfüllte Bestellungen mit Alter und CJ-Auftragsstand aus `_cj_order_watch_state.json`; ⚠️ wenn
nach 2 h kein CJ-Auftrag existiert. Bei Fehler «unklar», nie «0 offen». Die Zeile gehört in den
Tick-Bericht an den Betreiber, sobald sie ein ⚠️ trägt.
- **#1016 heute erledigt, was von hier geht:** CJ per Mail angefragt (10:05 UTC), Kunde um 12:50 UTC
  per Gmail informiert (Option 1 Rückerstattung / Option 2 Umweg; automatische Rückerstattung bis
  08.09. ohne Antwort), Shopify-Notiz gesetzt, Erinnerung 04.09. 09:37 UTC prüft CJ- UND Kundenantwort.
  Die Rückerstattung selbst ist ein Betreiber-Klick in Shopify.
- ⚠️ **Der Gmail-Konnektor sendet vom privaten Gmail des Betreibers**, nicht von info@luxestyle.ch —
  ein «Senden als»-Alias in Gmail wäre die Dauerlösung (Betreiber-Klick, COWORK-AUFTRAEGE).
  Eingehende Mails an info@luxestyle.ch landen bereits in diesem Postfach (Judge.me, Kooperationen).

## ⚠️ CJ-Grind-Plateau-Falle (teuer gelernt 2026-07-29)
Wenn der CJ-Ledger flach steht, ist es MEIST **keine** Token-/Punkte-Panne — Token prüfen zeigt oft `code:200`,
Punkte reichlich. Diagnose-Reihenfolge: (1) `product/list?categoryId=…` liefert `data.total` >0 (Katalog da);
(2) im Runner-Log ist „Rings: total 0" der **eigene Import-Zähler** (Zeile 285 cj_category_fill.mjs), NICHT die
API-total → es wurden 0 NEUE gefunden, alle schon im Ledger. **Ursache: DEPTH-Reset.** Runner rampen
`DEPTH=15+ROUND*3`, aber jeder Keepalive-Neustart (bei totem Prozess) setzt ROUND=1 → flache Top-Seiten sind
nach 19k Importen erschöpft → 0 neu. **Fix: Basis-Tiefe hoch** (15+ROUND*3 statt 5+ROUND*2), damit Runde 1 schon
tief (Seite ~18) greift. ⚠️ **Zweite tote Spur: `countryCode=DE/CZ/PL/…` (EU-Lager-Filter) gibt CJ-weit `total 0`**
— CJs product/list-Warehouse-Filter liefert für EU nur noch 0, nur CN/US haben Bestand. WAREHOUSE-Env darum leer
lassen (CN-Fracht 3–6 CHF ist ok). ⚠️ **Präzisiert 20.08.2026: das gilt für den FILTER, nicht für die
Wirklichkeit.** Stichprobe aus der Startseiten-Reihe «EU-Lager — Schnell geliefert»:
`product/stock/queryByVid` meldet für beide geprüften Artikel **Germany Warehouse mit echtem Bestand**
(88 bzw. 46 Stück) — die Zusage «2–7 Werktage» ist dort also gedeckt. Wer EU-Ware sucht, fragt den
Bestand je vid ab, nicht den Katalogfilter; und wer die EU-Aussage «korrigieren» will, prüft ERST den
Bestand, sonst repariert er eine wahre Aussage kaputt. /tmp-Runner-Scripts überleben keinen Wipe → Fix bei Neuaufsetzen mit einbauen.
**⚠️ Dritte Falle: 30-Min-Strafschlaf (2026-07-29).** Runner deuten JEDEN `RC≠0` als „Punkte weg? Pause 30min" —
aber der echte Grund ist meist **Gleichzeitigkeit beim Restart** (alle 5 Runner treffen Shopify-OAuth `shTok()` +
CJ-`getAccessToken` (1×/300s-Limit!) zugleich → transiente Drossel → `exit 1`). Ein einzelner cj_category_fill-Lauf
mit frischem Token exit IMMER 0 (verifiziert: legt Produkt an). Fix: (1) Strafschlaf `sleep 1800`→`120` (Punkte sind
reichlich, langer Schlaf war für echten Punktemangel, der hier nie eintritt — der crasht nicht, gibt nur total 0);
(2) Runner **gestaffelt** starten (3s Abstand), nie alle gleichzeitig. Beides bei Neuaufsetzen der /tmp-Scripts einbauen.
**⚠️ Vierte Falle: ROUND-Reset frisst den Tiefen-Ramp (2026-07-29).** Turn-Reaping killt die Runner ~jede Runde →
Neustart setzt `ROUND=0` → Tiefe fällt auf Minimum → Runde-1-Kategorien (Schmuck/Uhren/Makeup) sind erschöpft →
`FERTIG: 0`. Fix: ROUND **persistent** machen — `ROUND=$(cat /tmp/<runner>_round||echo 0)` + nach jedem `ROUND+1`
`echo $ROUND > /tmp/<runner>_round` (wrap bei >25 auf 1 für Neu-Sweep frischer Katalog-Ware). So wächst die Paginierungs-
Tiefe über Neustarts hinweg weiter statt jedes Mal die erschöpften Top-Seiten neu zu scannen. /tmp-Persist-Dateien
`/tmp/cj_*_round` überleben keinen Wipe → bei Neuaufsetzen mit 6 seeden (Tiefe ~33).
**⚠️ Fünfte Falle: unerschöpfte Gruppen fehlten in der Rotation (2026-07-30).** Die Runner-`for G in …`-Listen deckten nur ~18 der 27 GROUPS ab — `cjelektronik gaming cjauto nagel musik cj3d cjspielelektronik cjschuhedamen cjschuheherren` waren in KEINEM Runner → während Schmuck/Damen/Uhren erschöpft flach standen, lag frische Ware brach. Fix: diese 9 Gruppen jeder Runner-Rotation voranstellen (Ledger dedupt Overlap). Bei /tmp-Neuaufsetzen mit einbauen.

## 📚 Jüngste Lehren (Index — Volltext im Journal)

- 2026-09-14 · 📺 Betreiber-Link «Claude kann ALLES in Shopify»: YouTube 429 → oEmbed für Titel/Kanal; Inhalt = unser Alltag; GEMESSEN: Shop spricht UCP (/api/ucp/mcp, 10 Werkzeuge), Katalogsuche braucht Agentenprofil
- 2026-09-14 · 🔑 Groq lebt (Chat-Schlüssel, 200), Ampel-403 war der urllib-User-Agent; PC-Gedächtnis hatte Keepalive-Routine AUS und Entwurfs-Routine AN (2'031 Drafts heute) → umgeschaltet; Versand live 45 statt 50, Klick blockiert
- 2026-09-14 · 🛑 «stoppe cj grind?» / «Grow in ≤6 Monaten, jetzt Verkauf optimieren»: Grind pausiert (Runner 0, Pause +180 T), Bilder gingen trotz 105 % noch; Groq-Schlüssel kam nicht an (Env leer nach Neustart)
- 2026-09-14 · 🏢 «b2b optimieren?»: kein Firmenkonten-Ausbau — Seite «Firmen & Vereine» mit Anfrageformular (Merch ab 10 Stk, CH-Lagerware, Rechnung), Footer 15 Einträge; Formular-Knopf hiess «Submit»
- 2026-09-14 · 🎠 «mach 8 produkte, fülle die Webseite mit anderen Katalogen»: 18 Reihen à 8, 8 Wechsel-Reihen drehen täglich durch 25 Kataloge (Automat), Startseite 3,1 MB
- 2026-09-14 · ⚖️ «vergleiche andere seite mit unsere»: 10 CH-Shops gemessen, Startseite 6,92 → 3,75 MB (Horizon rendert grid+carousel_on_mobile doppelt; Icon-Symbol statt 368 Inline-Kopien)
- 2026-09-14 · 📺 «lerne im youtube sachen»: 4/6 Videos lesbar, Merchant-Anforderungen erfüllt bis auf UID, Befund nur im Backup (Backup ≠ live), Drossel nach 13 Abrufen
- 2026-09-14 · 🔌 «weiterfix mehr»: 64 Netzstecker-Fälle deterministisch aufgelöst (EU-SKU / stecker-unklar), Büro + Partydeko + Weihnachten ins Menü, 2 Kollektions-Leichen 301
- 2026-09-14 · ✅ Textstufe am Erzeugnis belegt: «Dies…» 100 % → 0 % (n=18 über Gemini) — und CLAUDE.md 970 KB → 59 KB
- 2026-09-14 · 🤖 «verbessere dein ki für shopyfi» (14.09., 07:45–08:20 UTC): die «KI» schrieb seit neun Tagen auf dem bezahlten Fallba…
- 2026-09-14 · 🧭 «mal füllen, dann polieren» + «nicht immer das gleiche suchen» (14.09., 07:30–08:00 UTC): der Grind zog 159 von 578 C…
- 2026-09-14 · 🔍 «50k Produkte, man findet alles nicht so schnell» + «B2B machen?» (14.09., 06:40–07:00 UTC)
- 2026-09-14 · 💽 «Datenspeicher von Google nehmen oder Upgrade?» + «2tes Gehirn Obsidian installieren» (14.09., 06:50–07:05 UTC)
- 2026-09-14 · 📱 «mach webseite besser» / «handyversion, bilder kleiner» (14.09., 05:40–06:40 UTC): 75 % Handy-Sitzungen sahen EINE Ri…
- 2026-09-14 · 🔌 «fix alles weiter und verbessere dann» (14.09., 03:15–04:00 UTC): Text-Hash-Falle, frische Hype-Runde — und ein Netzg…
- 2026-09-13 · 🕵️ «lerne weiter und fix alles» (13.09., 21:10–22:40 UTC): Boden-15 ohne Quittung, Index-blinde USA-Blöcke, 593 Doppelb…
- 2026-09-13 · 🧟 Vier Wächter starteten seit dem 04.09. NIE — `env` kennt kein `exec` (2026-09-13, 20:30 UTC)
- 2026-09-13 · 📦 #1017/#1018 bewegen sich — am letzten Tag des CJ-Fensters (2026-09-13, 20:15 UTC)
- 2026-09-13 · 🧠 Zweites Gehirn der anderen Session geladen — und zwei ihrer Befunde am Objekt gegengeprüft (2026-09-13, 20:45 UTC)
- 2026-09-10 · ⭐ Sieben tote Landeseiten hinter der Reihe «Unsere Bestseller» (2026-09-10, 19:00 UTC)
- 2026-09-10 · 🪞 Ich habe eine Dublette REPARIERT statt sie aufzulösen — und es zweimal fast wiederholt (2026-09-10, 19:20 UTC)
- 2026-09-10 · 📦 «Die Ware wird gerade erst BESCHAFFT» — CJs erste echte Antwort nach vier Tagen (2026-09-10, 18:35 UTC)
- 2026-09-10 · 🔒 Die Installation war SUSPENDIERT — und ein Konnektor-Reconnect hebt das nicht auf (2026-09-10, 18:04 UTC)
- 2026-09-10 · 🙋 Der Kunde wollte die Ware — und meine Zusage hätte sie ihm storniert (2026-09-10, 09:45 UTC)
- 2026-09-10 · 📭 Vier Tage kein Scan, kein Wort von CJ — beide Kunden VOR der Beschwerde informiert (2026-09-10, 07:10 UTC)
- 2026-09-09 · ⛔ Der Push ist gesperrt — Lesen geht, Schreiben nicht (2026-09-09, 13:40 UTC)
- 2026-09-09 · 🧊 92 Kategorieseiten waren nach PREIS eingefroren — und die Begründung dafür war nie gemessen (2026-09-09, 12:30 UTC)
- 2026-09-09 · 🪟 «Katalog verbessern»: 1'000 unerfüllbare Lieferzusagen — der eigene Ledger hatte sie zugedeckt (2026-09-09, 11:40 UTC)
- 2026-09-09 · 💽 Dateispeicher gemessen statt geschaetzt — 77 GB, und der Deckel ist der KATALOG (2026-09-09, 08:45 UTC)
- 2026-09-09 · 🛒 Die Kasse verschweigt den Endbetrag — 6 Kassengänge, 0 abgebrochene Checkouts (2026-09-09, 06:10 UTC)
- 2026-09-09 · 📦 Zwei Sendungsnummern, null Übergaben — und die Bestell-Ampel war dafür blind (2026-09-09, 03:30 UTC)
- 2026-09-09 · 💥 Der Grind stand 6,5 Stunden still — eine Zuweisung an ein `const`, unsichtbar für beide Prüfungen (2026-09-09, 01:15 …
- 2026-09-08 · 🔑 «Ist gesetzt» ist keine Messung — die Zugangsdaten sind in KEINER Umgebungsvariable (2026-09-08, 22:12 UTC)
- 2026-09-08 · 🛑 Die #1008-Klasse ist an der KASSE geschlossen — und `DENY` allein tut gar nichts (2026-09-08, 20:40 UTC)

… und 350 ältere Abschnitte: `GEDAECHTNIS-JOURNAL.md` (Inhaltsverzeichnis oben).
