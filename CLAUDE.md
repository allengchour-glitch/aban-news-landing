# CLAUDE.md — Projekt-Gedächtnis (KERN)

Dieses Repo ist `aban-news-landing`, enthält aber mehrere Projekte. Das aktive, autonome
Arbeitsgebiet ist der **CJ-Dropship-Import für den Shopify-Shop LuxeStyle CH**.

> ⚠️ **Diese Datei ist bewusst KURZ** (Betreiber 14.09.: «prompt zu lang immer»). Sie trägt nur Regeln,
> Dauerauftrag, Kernfakten und den aktuellen Stand. **Alle Tages-Lehren (Tagebuch, ~400 Abschnitte) stehen in
> `GEDAECHTNIS-JOURNAL.md`** — dort NEUE Lehren eintragen (oben), hier nur die Einzeile im Index unten.
> Suche über alles: `python3 tools/gedaechtnis.py "stichwort"`. Parallel-Sessions: `SHARED-MEMORY.md`.

## 📌 Aktueller Stand (16.09.2026, 07:30 UTC) — was JETZT gilt
- **🔪 KEINE KLINGEN MEHR IM VERKAUF (16.09.).** CJ schickte #1017 aus Shanghai zurück:
  verbotener Artikel, keine Linie CN→CH — auch nicht für Küchenmesser. **207 Klingen gedraftet**,
  davon 95 mit einem Lieferanten-Urteil vom 04.09., das nie vollstreckt wurde. Kunde voll
  erstattet (CHF 40.90 auf den Zahlweg). Die Regel hat jetzt zwei Fragen: `ist_klinge` = Werbung,
  **`ist_handklinge` = Versand**; Importer sperren VOR dem Anlegen; täglicher Wächter
  `automation/klinge_ch_wache.py` (Voll-Export, KEINE Titel-Suche). **`freightCalculate` = «ok»
  widerlegt eine Kategorie NICHT** — für #1017 gab es eine Versandoption, das Paket ging raus
  und kam zurück. ✅ CJ-Dispute **SH2609221642351280900** («Product Returned», USD 25.54) am 22.09.
  16:42 UTC vom Betreiber im Portal eröffnet, Status Pending — an der CJ-API bestätigt, Ampel misst
  `getDisputeList`; Wallet 0.00 bis zur Auszahlung.
- **💾 Dateispeicher: Betreiber-Entscheid 21.09. «grow plan, in einer monat machen, brauche zuerst kunde»** → Grow-Plan ~21.10.2026, bis dahin bleibt der Speicher voll (gewollt); Ampel informiert statt ruft, Routine erinnert am 21.10. Kurs bestätigt: **zuerst Kunden.** **Neu 23.09.: «wen noch 3 verkäufe dann upgrade ich grow 300 gb»** → Ampel zählt `GROW: n/3` (fremde Kunden-IDs, bezahlt, ab 23.09. 16:00 UTC, `dropship/_grow_bedingung.txt`); bei 3/3 dem Betreiber melden.
- **🤖 Seit 22.09. 07:02 UTC: Routine «Autonome Verbesserungsrunde» `trig_01XDyghjogoXy7aZ5MvJri1m` (alle 4 h, :25) feuert in die Cloud-Session** — misst, behebt EINE Klasse, pusht, meldet 3 Zeilen. Betreiber: «automation ki selbstständig starten». Daneben nur Wächter (Keepalive stündlich `trig_01Uy3z…`, Bestellwächter 2 h, Lagebeurteilung 2×/Tag). ⚠️ Nicht abschalten; Einwände in SHARED-MEMORY.md.
- **🇱🇮 Liechtenstein GESTRICHEN (22.09., Weg B):** Markt = nur CH, Texte sagen nur Schweiz; `liechtenstein_raus.py` hält das täglich. Weg A (LI einschalten) = 2 Betreiber-Häkchen, dann Texte zurück.
- **📣 SOCIAL v2 seit 22.09. (Betreiber: «täglich mehrmals überall», «pure automation … lernen mehrmals täglich», Ads in ~1 Monat wenn alles sauber):** Autopilot postet Bild 6 h / Reel 8 h (IG+FB) / TikTok 12 h / **YouTube Shorts 12 h + Pinterest-Pins 6 h (Metricool, seit 23.09.)** / **IG-Karussell 24 h (seit 23.09., `ig_karussell_post.mjs`, Sets aus `tiktok_karussell.py FORMAT=ig`)**; Reel-Motor v2 holt CJ-Videos direkt und legt Reels bis zum Grow-Plan im Repo `social/reels/` ab (Dateispeicher voll); `social_lernen.mjs` schreibt alle 6 h `social/_lernen.json` + `dropship/SOCIAL-LERNEN.md`; Nachschub `queue_new_products.mjs` alle 12 h. ⚠️ ffmpeg hier ohne drawtext → Text nur über `reel/overlay.py`.
- **⚙️ GitHub Actions läuft wieder seit 10.09. 18:26 UTC** (REST-API gemessen 22.09.; Sperre 13.06.–30.08., 0 Runs im
  Fenster): nur `push`/`pull_request`, **0 Schedule-Runs seit 12.06.** — 4 scharfe cron-Zeilen auf main (shop-guards,
  bestseller-refresh, shop-autopilot, image-audit) feuern trotzdem nicht; `metricool-schedule.yml` + Voice Linter
  scheitern bei jedem Push; 167 Workflows `active`. Nulldiät bleibt. Alle «Actions gesperrt»-Zeilen in
  SHARED-MEMORY.md sind ÜBERHOLT (dort markiert). GitLab `aban-ci` fällt seit 27.07. täglich (tote Variablen).
- **⛔ B2B bleibt AUS** (Betreiber 15.09.: «b2b sein lassen wen kosten»). Gemessen: 0 Firmen,
  0 B2B-Kataloge, Plan Basic. Ersatz = Seite «Firmen & Vereine» mit Anfrageformular.

## 📌 Stand vom 15.09.2026
- **BigBuy ist zu Ende.** Abo «Pack Ecommerce» lief am 15.09. aus (gekündigt 16.08.). `bigbuy_abschied.py`
  hat 274 Produkte gedraftet; **0 aktive mit BigBuy-Merkmal**. Seine Abfrage traf nur `tag:bigbuy` — 136
  Produkte mit `bb-…`-SKU wären bestellbar geblieben; Auswahl ist jetzt Tag ODER SKU. Die PC-Routine
  `trig_01Fks8G3…` (16.09. 05:00) ist ein Doppel und findet nichts mehr vor.
- **Folgeschäden des Abschieds behoben:** «Premium & Marken» hatte die Regel `Tag=bigbuy` → jetzt
  `Tag=premium` (41 aktiv); 27 Ratgeber-Links von leeren auf gefüllte Kategorien umgebogen.
  **118 von 518 Kollektionen ohne kaufbare Ware — aber nur 2 davon im Onlineshop sichtbar** (beide erledigt: abgemeldet + 301). Die übrigen 116 waren nie veröffentlicht, kosten nichts (`dropship/LEERE-KOLLEKTIONEN-2026-09-15.md`).
- **Hauptmenü hatte sechs tote Links** (`/en/collections/…` = 404, u. a. «Schmuck & Uhren»). Repariert;
  `menue_links.py` dekodiert jetzt Emoji-Handles und prüft den Pfad statt nur den Handle.
- **⛔ Cowork-Punkt 1 ZURÜCKGEZOGEN:** «Versandschwelle 45 → 50» hätte rabattierten Körben den Gratisversand
  nehmen können (automatischer 10-%-Rabatt ab 2 Artikeln seit 01.06.). Ersetzt durch zwei Testkörbe.
- **Weihnachten 2026 gefüllt:** 4 → 166 Artikel, Text neu (er bewarb drei Adventskalender ohne Lieferant).
- **Startseite mobil repariert:** die gestrige Kundenstimmen-Sektion machte die Seite 1488 px breit;
  jetzt 390/390 gemessen. «verifizierte Bewertungen» gestrichen (Judge.me: 0 verifizierte Käufe).
- **✅ ERLEDIGT 17.09.: die sendende Routine `trig_01KAnvaXU7rbVVBbaUqrg6ci` ist weg.** Sie hiess «Drafts schreiben»
  und SENDETE (15.09. 06:23 eine Rückerstattungs-Zusage an #1017 gegen den Entscheid vom 11.09., dazu die BigBuy-Mail
  vom 08.09. wortgleich erneut). Der Betreiber hat sie abgeschaltet. **Zwei unabhängige Belege am 17.09. 07:50:**
  (1) `list_triggers` zeigt 11 Routinen, sie ist in keiner — auch nicht im Rohtext; (2) **wichtiger**, der Postausgang
  der letzten 2 Tage enthält NUR eigene Mails, obwohl ihr 06:xx-Fenster längst durch war.
  ⚠️ Die Lehre bleibt: **jeden Kundenentwurf VOR dem Senden gegen den frischen Thread lesen** — ein Automat kann
  in der Zwischenzeit etwas zugesagt haben, und eine Zusage im Thread bindet uns.
- **💶 BigBuy-Guthaben EUR 1'000.00 gemessen (seit 15.07. unverändert = nie ausgezahlt).** Kein Auszahlungs-Endpunkt in der
  API. Klickweg + Mailentwurf: `dropship/BIGBUY-1000-EURO.md`. Abo endet heute, BigBuy zahlt nur dienstags.
- **~~#1017/#1018 fahren~~ — FALSCH, korrigiert 16.09.:** alle sieben Stationen lagen in China;
  «Schweizer Post» war das Feld `lastMileCarrier` (Plan, keine Station). #1017 kam zurück und ist
  erstattet. #1018 (E-Scooter-Ladegerät, anderer Kunde) ist davon nicht betroffen.
- **Antwort auf «Was könnte man noch machen?»:** `dropship/WEBSITE-IDEEN-2026-09-15.md` (39 geprüfte
  Massnahmen, 8 verworfene, Vollständigkeits-Kritik mit 8 Lücken).

## 📌 Stand vom 14.09.2026 (gekürzt — Volltext im Journal)
- **Branch `claude/luxestyle-status-tztnn1`**, offener Draft-PR #1608 nach `main`.
- **Container startet ~stündlich neu** → zuerst `uptime`; unter 10 Min: `bash automation/engine_keepalive.sh`.
  Stunden-Routine `trig_01Uy3zVefXbzCZn9Dr2qvkwh` ist die oberste Schicht (feuert nur in eine RUHENDE Session).
  ⚠️ Die PC-Session hat sie schon dreimal abgeschaltet — zu Sessionbeginn `list_triggers` prüfen.
- **Umgebungsvariablen erreichen die laufende Session erst mit einem späteren Container-Neustart** (gemessen 23.09.: Metricool-Token nach dem 5. Neustart) → nach jedem Neustart `env | grep -c NAME` messen; bis dahin Schlüssel im Chat.
  urllib gegen Groq braucht einen User-Agent, sonst 403.
- **Grind PAUSIERT** (Betreiber 14.09.: «jetzt auf Verkauf optimieren»); Dateispeicher 105 von 100 GB.
  **Kurs bis auf Widerruf: Conversion, nicht Menge.**
- **Trichter:** ~1'300 Sitzungen/30 T (77 % mobil), 12 Warenkorb-Zulagen, 1 Abschluss — Engpass ist Verkehr.
  Google-Gratis-Einträge sind der einzige Kanal mit Verkäufen.
- **CJ-Guthaben immer $0** → jede Bestellung braucht den Betreiber-Klick in der CJ-Konsole.
- **Nur-Betreiber-Klicks:** `dropship/COWORK-BEFEHL.md` (Punkt 0 CJ-Dispute ✅ 22.09. erledigt, Punkt 1 BigBuy EUR 1'000,
  Punkte C–H vom 22.09.: Bankangaben auf main, Meta-Datenzugang 05.10., Absender-E-Mail, Google-Feed, BigBuy-Frage, Entscheide).
- **Vor Theme-Reparaturen IMMER die Live-Datei holen** — `theme_backup/` ist Vergangenheit.
- **Startseite:** 18 Reihen à 8 im Karussell, 8 Wechsel-Reihen drehen täglich durch 25 Kataloge
  (`automation/homepage_katalog_rotation.py`). ⚠️ grid+carousel_on_mobile rendert DOPPELT.

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
- **Stand 18.09.2026** (⚠️ hier stand bis heute «12.08.» — die Datei selbst war am 13.09. und
  03.09. aktualisiert worden. **Die massgebliche Angabe ist `QUELLE` in `hype_kuratieren.py`,
  nicht diese Zeile**; wer nur hier nachsieht, hält eine frische Recherche für fünf Wochen alt).
  Themen aktuell: Beauty-Gerät, Mini-Beamer, Ordnung/aesthetic, Shapewear, 3-in-1-Ladestation,
  Blush-Balm, Lifting-Tape, Paar-Hoodies, Kerzenwärmer, Haustier-Spielzeug, Hygiene-Gadget (18.09.),
  **Sternenhimmel-Projektor, Hunde-Trinkflasche, Mini-Staubsauger (neu 23.09., am Bestand gemessen; Kanarienvögel:
  «Quarzuhr mit Sternenhimmel-Ziffer», «Hundeleine mit Trinkflasche» bleiben draussen)**. Reihe: 41 Produkte (18 neu am 23.09.).
  **ABGELEHNT trotz Trendlisten:** Wellness-/Magnet-Armband = Heilversprechen (dieselbe Klasse
  wie die 1'667 aus den Werbekanälen ausgeschlossenen); Supplements/Olivenöl = Lebensmittel;
  Snail-Essence/Seren = topische Kosmetik (Betreiber-Entscheid 30.08.).
- ⚠️ Fallen aus dem ersten Lauf: **`IPL` ohne `\b` steckt in «L-IPL-iner»** (ein Lipliner wurde als
  Beauty-Gerät gewählt); ein «Intim-Pflegeserum» wäre auf der Startseite gelandet → `NICHT_STARTSEITE`.
  Bedingungen für die Reihe: ≥2 Bilder, ab CHF 19, im Google-Kanal, kein Kostüm/Spielzeug/Partydeko.

## 🎯 MISSION (User 2026-07-08, wörtlich): «hole dir 100 kunden, vertiefe alles, merke alles»
**Ziel: 100 zahlende Kunden** (gemessen 22.09.: **4 behaltene externe Kunden** #1005/#1011/#1014/#1018 — Zählregel
`customer.id` + `numberOfOrders`, nie Mail-Domain oder Bestellnummer; dazu 5 erstattete Bestellungen von 4 weiteren
externen IDs, 6 Eigenbestellungen EINER Kunden-ID, 1 abgelaufen; die alte «5» vom 08.07. zählte #1004 = Betreiber mit). Jede Session arbeitet dahin: Traffic-Qualität
(TikTok-Ads seit 09/2026 AUS — alle 4 Kampagnen deaktiviert, gemessen 22.09.; Google-Gratis-Listings erster Klick, Pinterest bringt 71 Sitzungen/30 T), Conversion
(Warenkorb-Abbrecher: CHF 630 in 11 Checkouts entdeckt → native Shopify-Automation aktivieren!),
Sortiment (CJ-EU-Lager + Editor), Vertrauen (⚠️ gemessen 22.09.: **keine UID, kein HR-Eintrag** — Shop-Policy
LEGAL_NOTICE «Handelsregister: Nicht eingetragen (Umsatz < CHF 100'000)», Impressum ohne UID, Betreiber 14.09. «hat
keine» → TikTok-Zefix-Verifizierung und Pinterest-Steuerfeld derzeit NICHT machbar; die frühere Zeile «HR pendent →
Zefix-PDF/CHE-Nr.» war ein Plan ohne Grundlage).

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
10. **⛔ Social-Doppelpost-Verbot (User 2026-07-06) — Kurzfassung, fünf Schichten im Journal 2026-07-26 ⛔:** IMMER nur NEUES posten; Profil + `automation/reels_seed.csv`-Ledger prüfen (nur status=ready, nach Post → posted); gleiches Produkt/Video nie zweimal, auch nicht plattformübergreifend. **⛔ THREADS-STOPP (07.07.)**. Autopilot IG+FB: `automation/meta_reel_post.mjs` (Seite 1049840534888592, IG 17841480560863361, Token `/tmp/meta_page_token`, IG-ID `/tmp/meta_ig_id`); vor Post prüfen, dass das Produkt noch ACTIVE ist.
   **Regel für JEDEN Poster:** `postLock()`+`seen()`+`mark()` aus `post_guard.mjs` — EIN Lock (`/tmp/ig_post.lock`), EIN Ledger (`_posted_media.txt`), nie ein eigener Lockfile; erst claimen (`posting`), DANN posten, Ledger SOFORT nach IG-`media_publish` (vor dem langsamen FB-Schritt); Inhalts-Sperre über Video-Basenames (plattformübergreifend); **`igLiveHas()` fragt VOR dem Post die letzten 25 IG-Posts** (Plattform-Wahrheit schlägt jeden Ledger; gilt für Reel- UND Bild-Poster); nie dasselbe Video in zwei Queues (`dedup_queues.mjs`). Meta-Token ~60 Tage; Posts >500 Views nie löschen; Live-Löschen geht nur lokal/PC. **`dropship/_SOCIAL_STOPP` (17.09.–22.09.) hat der Betreiber am 22.09. selbst gelöscht → Poster laufen wieder; ein neuer Stopp wird nur vom Betreiber gesetzt oder entfernt.**
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
16e. **📢 Google-Merchant-Feed (2026-07-10)** — ⛔ **Der «#1-Hebel» (Merchant-Ziel-Land, «1'698 Missing shipping
   info») ist TOT — gemessen 22.09.:** Google-Diagnosen sind OHNE Konto lesbar, die App «Google & YouTube» schreibt
   sie als `product.feedback`. Vollscan 51'326 aktive: 21'485 Meldungen (alle REQUIRES_ACTION), 21'180 «Over capacity
   for Shopping ads (CSS program) [CH]» (nur Shopping Ads), **0 Meldungen mit «shipping»**. Free-Listings-Blocker:
   371 «Product page unavailable», 26 «Image too small», 18 «Unable to show image», 7 «Promotional overlay»,
   3 «Guns and Parts» (Klingen-/Waffen-Klasse prüfen). Zielland = **Shopify Markets** (1 Markt CH), Versand = Kanal-
   Einstellung «Automatically import shipping settings» aus dem General-Profil (Shopify Help) — der Ort der Einstellung
   ist Shopify, nicht das GMC. Wächter seit 23.09.: `google_feedback_wache.py` (täglich, Ampel «GOOGLE: …», Bericht `dropship/GOOGLE-FEEDBACK.md`; nach App trennen — die App «Shop» schreibt 33'863 eigene Meldungen). Weiter gültig: Google liest
   **mm-google-shopping-Metafelder**, nicht den Beschreibungstext (`automation/google_feed/*_metafield.py`).
   ⚠️ `reprice_to_benchmark.py` ist ein SCHLAFENDER Preissenker ohne EK-Boden (`max(cur·0,6, 14.90)`) — nicht starten.

## 🩺 Fünf Lehren vom 2026-08-11 + Aufseher-Akte 0b–0f (Kurzfassung — Volltext: Journal 2026-08-21 🩺)
- **Prozessprüfung** IMMER argv-basiert gegen die ECHTE Kommandozeile (`ps -eo args | awk '$1=="bash" && $2 ~ /fixer_keepalive\.sh$/'`): `pgrep -f` findet die eigene Zeile, der Bracket-Trick schützt nur den grep, nicht den Klartext daneben; `exec` löscht das `.sh` aus argv (12 Runner in 3 Generationen, 20.08.).
- **Alter = `ps -o etimes`, nie PID** (Zähler läuft um; der älteste Aufseher trat ab, 20.08.). **Doppelte Aufseher räumt `engine_keepalive.sh` von AUSSEN ab** — Selbstprüfung ist die erste Verteidigung, nie die einzige (ein wartender Prozess erreicht seine eigene Wache nicht, 21.08.).
- **Ein Wächter, der nicht selbst bewacht wird, ist keiner:** der Aufseher steht als ERSTER Punkt in `engine_keepalive.sh`, der EINZIGEN Startliste (nicht in zwei Routine-Prompts). Frage bei jeder neuen Engine: *wer startet DICH?* Log mit `>>`, nie `>`.
- **Nur-/tmp = verloren:** Dauerläufer gehören ins Repo (`automation/`). Eine 0 im Lagerstand kann eine Aussage sein (Printful 5XL nur US) → Lieferant fragen, DENY statt 9999. CJ-Helfer brauchen Timeout + Retry + QPS-Wartezeit (1600200).
- **Google-Gratis-Einträge ≠ Ads:** Merchant verlangt EIN `image_link`, keine Preisuntergrenze — 4'330 zurückgeholt; `gfeed_score.py` hat eine `elif`-Kette (nur der erste Grund zählt). Draussen bleiben Kostüm/Erotik/Refurb/Code-Titel.
- **Lieferantenref-Formen** (CJ-Varianten-SKU `CJYD…`, Printful `5599797_4012`, `LX-…`, `BB-V…`) → gemeinsamer Test `gfeed_restore.lieferantenref()`; 845 von 919 waren Fehlalarme. Offen: ~30 hand-kuratierte Altprodukte ohne pid.

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
  **⚠️ PC-FAKT VON 2026-06-12 WIDERLEGT (gemessen 17.09.2026):** «der PC läuft immer» stimmt, aber das genügt NICHT.
  Port 9222 ist **lokal** (steht so im Setup-Dokument) und von der Cloud aus grundsätzlich unerreichbar — geprüft
  über `localhost`, `127.0.0.1` und `host.docker.internal`, alle drei ohne Antwort. `ListAgents` findet keine
  erreichbare Session, und ALLE Bridge-Sessions (`environment_kind: bridge`) melden `computer_unreachable`,
  die jüngste seit **15.09. 03:44**. **Damit ein Browser-Auftrag delegierbar ist, braucht es auf dem PC eine
  LAUFENDE Claude-Code-Sitzung mit Remote-Control-Verbindung** — ein eingeschalteter PC allein reicht nicht.
  Erst wenn `ListAgents` die PC-Session zeigt, geht `SendMessage`. Skripte für den PC: `automation/local/profil-politur-browser.mjs` (seit 23.09. ein CDP-Wrapper um
  `automation/browser/social_profil_politur.mjs`; die Juni-Fassung war ein Torso) + `automation/social-profile-polish.mjs` (puppeteer).
  **Ohne Bridge ist der Handy-Browser des Betreibers der schnellere Weg** — BigBuy-Ticket, CJ-Konsole,
  Google Merchant und Shopify-Dateien laufen alle im mobilen Browser.
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
  bis 4 Extrabilder; Ledger `dropship/_fortura_img_done.txt`). Runner **`automation/fortura_img_runner.sh`**
  (17.09. wiederhergestellt — lag nur in /tmp und war weg; Lehre 2 zum dritten Mal).
  **✅ GEMESSEN 17.09.: diese Arbeit ist FERTIG.** 2'408 aktive Fortura-Produkte, davon 1'552 mit
  Karussell und 856 mit nur einem Bild — für diese 856 hat der Feed keine Zusatzbilder, alle im
  Ledger. ⚠️ Die frühere Lesart «4'403 von 7'558 offen» war ein Vergleich zweier Grundgesamtheiten:
  7'774 = EANs IM FEED mit Extras (Lieferant), 4'403 = geprüfte SHOP-Produkte. Es waren nie 3'100 offen.
  🔑 Zugang in `/tmp/fortura_env.sh` (600) — stirbt bei jedem Neustart; Ampel meldet «FORTURA-ZUGANG WEG».
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
  ✅ IG-Bio-Link GESETZT (gemessen 22.09.: `website` = luxestyle.ch). ⚠️ TikTok-Bio-Link NICHT gesetzt (0× `bioLink`
  im Profil-HTML) → Betreiber-Klick. Meta-Seiten-Token ohne Ablauf, aber **Datenzugang endet 05.10.2026 18:50 UTC**.
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

## ⚠️ CJ-Grind-Plateau (Kurzfassung — Volltext: Journal 2026-07-30 ⚠️; Grind seit 14.09. PAUSIERT)
Flacher Ledger ist meist KEIN Token-/Punkte-Problem: «Rings: total 0» ist der EIGENE Import-Zähler (alles schon im Ledger). Ursachen und Fixes: **DEPTH-Reset** (Basis `15+ROUND*3`, ROUND persistent in `/tmp/cj_<runner>_round`, Seed 6, Wrap >25); **`countryCode=EU`-Filter gibt CJ-weit total 0** — WAREHOUSE leer lassen, Bestand je vid über `product/stock/queryByVid` ist trotzdem echt (DE-Lager gemessen); **Strafschlaf 120 s statt 1800**; Runner **gestaffelt** (3 s), nie gleichzeitig (OAuth/getAccessToken-Drossel); **alle 27 GROUPS** in jeder Rotation (9 fehlten). Seit 21.09. laufen alle CJ-Aufrufe über `cj_takt` (1,8 s Startabstand).

## 📚 Jüngste Lehren (Index — Volltext im Journal)

- 2026-09-24 · 🔁 **Shopify-Aussetzer 02:17 legte 6 Tagesläufe bis morgen still (Log-Alter-Tor zählt Absturz als Lauf) → `absturz_nachholen` an 48 Toren (≥ 60 min, ≤ 3×/Tag).** Zeitstempel ≠ Erfolg → Journal Nachtrag 65
- 2026-09-24 · 🔌 **Konnektoren gemessen: Metricool-MCP liest Analytik (TikTok Ø 1 s von 11 s), Dropbox privat + keine Binär-Uploads, vidIQ ohne Kanal, Coupler leer (braucht Search Console/GA4), Porter nicht in der Sitzung.** «Verbunden» ≠ Daten → Journal Nachtrag 64
- 2026-09-24 · 🎨 **«weiter polishen»: «Herstellerlager» an 3 Quellen + 711 Texten + 13 Seiten + Versand-Richtlinie → «Lieferantenlager» (Nachzählung 0); Bewertungs-Nachholer fand nie seine Quittungen (Ledger Zahl-ID, Liste Handle → «h:»-Zeilen, 1'934 offen); Lizenzfiguren (53 Fortura) nicht selbst bewerben (Karussell+Pinterest am Titel); «Wasserfeste Maniküre» 14 Designs bei 1 Variante → echte Auswahl (`auswahl_nachruesten.py`, nur mit vorhandenen Bildern, WebFetch bestätigt); «36 Farben … Set» = 36 Einzelfarben bei CJ → Titel für Mensch.** Liste und Ledger brauchen denselben Schlüssel; viele Bilder beweisen keine Auswahl → Journal Nachtrag 63
- 2026-09-24 · 🎠 **«warum nicht mehr bilder in karusell»: Kürbis-Set 4 Slides — 3 Motive nur als 600 px (MIN_KANTE 700), Kleid in 4 Farben galt dem Graustufen-aHash als 1 Motiv. IG jetzt bis 8 Slides, 600er füllen hinter den grossen auf, Doppel = gleiche Form UND Farbe (Schwelle 12, an echten Paaren geeicht); 5 wartende Sets neu: 4× 8 Slides.** Ein Doppel-Filter muss sehen, was die Betrachterin sieht → Journal Nachtrag 62
- 2026-09-24 · ⭐ **«bewertungen push»: erst ehrlich, dann mehr — 10'976 Bewertungen, nur 38 unter 4★, weil der Tagesstarter `MIN_SCORE=4` setzte (Skript-Standard seit 23.08. = alle, UWG); Ersatzname «Verifizierter Käufer» war falsch → Starter alle Stufen, Nachhol-Modus 1–3★ für 2'072 Produkte. Fortura-Bestand 34 Tage eingefroren (hing am pausierten Import-Runner) → 3'847 Varianten nachgeführt, 248 auf 0, eigener Tagesstarter. Aufseher-Tor kannte keinen ISO-Zeitstempel vor FERTIG.** Bei jeder Regel auch die Aufrufer lesen → Journal Nachtrag 61
- 2026-09-24 · 🧾 **Post-Quittung lag im Stash: `repo_vorspulen.sh` spielte nur `dropship/*.txt` zurück, der Smartwatch-Bildpost 02:13 (IG DdpyPQLFFjb) stand im Repo als `ready` → Link-in-Bio/FB-Link ohne Produkt. `quittung_rueckspiel.py` (vorwärts, unter Post-Lock, nur verlustfrei schreibbare CSVs) läuft jetzt im Vorspulen; Ampel misst fehlende Quittungen statt Stashes. «Trend-Produkt» war nie Sammeltyp → zweite Regelwelle, 8 Wortfallen im Trockenlauf (Multi-FUNK-tion, Spiegelglanz, Lippenglanz-STIFT …), 459 kategorisiert, 188 bewusst offen.** Eine Queue mit Status-Spalte ist ein Ledger → Journal Nachtrag 60
- 2026-09-24 · 📚 **Ratgeber-Runde 2 live (Halloween-Deko 997 W, Katzenspielzeug 1'010 W); Prüfer-Befunde behoben (Skelett-Karte bei Bestand 1 → Fakten + Ersatzlink, «Hersteller» → «Lieferantenlager»); Prüfer-«offen» selbst gebaut: `ratgeber_ohne_ware.py` Klasse C (ausverkauft DENY), `kategorie_wache.py` Halloween-Titelregel, 13 Produkte umkategorisiert.** Karte sagt nur, was ein Produktfeld belegt; ein leerer neuer Wächter braucht einen synthetischen Test → Journal Nachtrag 59
- 2026-09-24 · 📏 **Zwei Klassen aus der Ratgeber-Prüfung: «Verfügbare Grössen: S, M, L» bei einer Variante (812 am Vollexport, 452 bereinigt, Regex in wahlversprechen + klassen_kontrolle) und drei Dimensionen im Farbwert («Grey-60x50x H37cm», 21 Produkte, 19 getrennt, X/x/× vereinheitlicht).** Neue Regex erst an den Treffern lesen — die erste Fassung zählte 497 Faktenblock-Zeilen mit → Journal Nachtrag 58
- 2026-09-24 · 🖼️ **Werbetext-Bilder scharf: 94 Treffer → 45 entfernt (≥7 W, Sichtprüfung 24/24), 26 als letztes Zweitbild behalten (Nachfüller-Arbeit bleibt), 23 unter 7 W zur Sichtung; Aufseher-Tageslauf hielt die Sperre → einreihen statt killen. Zwei Ratgeber (Kratzbaum, Hundebett) per Workflow live, Prüfer fand Produktseiten-Klassen (Grössen im Text bei einer Variante, drei Dimensionen im Farbwert).** `Article` hat kein seo/onlineStoreUrl → Metafelder; Karten-Fakten aus Varianten, nicht aus dem Text → Journal Nachtrag 57
- 2026-09-24 · 🔑 **Keywordplan (@ecomfabio-Methode, 5 Agenten): 4'600 Suggest-Keywords in 18 Clustern, 12 Kollektions-SEO-Felder live, Ratgeber- und Ads-Plan ohne Start (`dropship/KEYWORDPLAN-2026-09.md`); Prüfer 12/12 byteweise, 0 Schäden, 4 Textfehler (halloween-2026 als Landeseite, 353→350, CH-Marktplätze fehlten in der Negativliste, test/testsieger doppelt).** Jede fremde Zahl mit Marke UND Rohdatei; DRAFT ≠ 404 bei Redirect → Journal Nachtrag 55
- 2026-09-24 · 🔁 **Kollektionen mit gleicher Regel: 13 Paare, `kollektion_doppel.py` täglich (Bleiberin → 301). Zwei Fallen im ersten Lauf: «publiziert» zählte Inbox/POS mit (9 Markenpaare hatten NIE eine Online-Store-Adresse), 9 Verlierer trugen dormante Redirects — «already taken» ohne Ziel-Lesung wertete eine Kette als ok.** Online Store = Pflicht, erst Redirect dann Abmelden → Journal Nachtrag 54
- 2026-09-23 · 🎃 **Halloween: zwei Kollektionen mit derselben Regel (230/230) → Startseite auf `halloween`, 2026er abgemeldet + 301; Agent-B-Nachbesserung: CTA-Umbruch am Bindestrich, Familienwache für Top-Sets, Pin-OCR-Tor — das «textfreie» Ersatzbild war der Verpackungskarton (Tesseract blind für Schmuckschrift), Text-Pin schon live → Betreiber.** Sichtbogen bleibt Pflicht vor jedem Pin → Journal Nachtrag 53
- 2026-09-23 · 🎬 **Videoschnitt v9 fertig (59/59): TikTok-Sehdauer 1,2–1,5 s unabhängig von der Länge → Hook nie Sekunde 0, Schnitt auf den Kick, Produkt 56–100 %, Tor am Ergebnis; `make_reel.sh` las START nie (Bug); fremdes Creator-Video in der ready-Queue verworfen; Halloween-Tag 34 nachgetragen (173→203); 3 Aufseher parallel + Zeitpräfix brach PAUSE/FERTIG-Erkennung.** Wer das Logformat ändert, ändert die Verträge aller Leser → Journal Nachtrag 52
- 2026-09-23 · 🖼️ **Bild-Nachfüller v2: «unklar» (464/593) war der leere CJ-Eimer, «not found» der falsche Endpunkt (AZ = Varianten-SKU → `variantSku=`, 200 mit 5 Bildern), Bildhost per Proxy 403 → PAUSE statt «nichts-brauchbar», Ledger je Zeile + Datum, Rücklesen READY/FAILED, Welle 2 «/w2» selbstmessend.** Nicht-200 lesen, nicht zählen → Journal Nachtrag 51
- 2026-09-23 · 🪣 **CJ-Punkte-Eimer um 16:36 leer (123'710) — Varianten-Wache hämmerte 2'095× weiter, jetzt Exit 3 bei 16900500; Netz-Politik sperrt CJ-Bildhosts + TikTok (Proxy 403) → Kanarienvogel vor jedem Fremdhost-Lauf, 403 ≠ tote Ware; Semrush ohne Einheiten; Bild-Ledger verlor 50 Zeilen (offener WriteStream vs. Rebase → appendFileSync je Zeile); Halloween: 40 ungetaggte, zwei Kollektionen, 0 Posts.** Ein Tagesbudget ohne Verteilung frisst der erste Läufer → Journal Nachtrag 50
- 2026-09-23 · 🧾 **Kollektionen: «Nach Preis sortiert» entging der Regex (5 Kollektionen, «0 von 11» war falsches Grün), 12 tote Marken ausserhalb der Liste, SKU-Leck baby-kids → 12 Bausteine nach Messung der echten Ware, Vollscan 353: 0/0; Server-gc ohne Gewinn (echte Historie), /opt/luxe/repo von cron benutzt; Zapfventil-Hauptbild getauscht (Google zielt aufs Bild); «Geschenke bis 30» von 50'291 auf Tag geschenk eingegrenzt.** Eine Prüfung über die Planliste findet nur, was im Plan steht → Journal Nachtrag 49
- 2026-09-23 · 🔑 **US-Damengrössen «14W…26W» wurden Watt (142 Werte, 8 Produkte) → `_vorbereiten`-Marke + Optionskontext, 143 repariert; GitHubs Push-Schutz fing eine aus dem Chat kopierte Schlüssel-Gegenprobe in `wartung.test.mjs` ab → synthetisch, Commits neu geschrieben; Server-Wartung nach 19 Prüfer-Befunden (Allowlist-Crontab, Entropie-Schwärzen, Journal-Filter, Sperre/trap/Stash-Schutz).** `wert_de()`=None heisst «nicht ändern», nicht «verworfen»; Testdaten nie aus dem Chat → Journal Nachtrag 48
- 2026-09-23 · ⛔ **Meta sperrte nach 120 Löschungen + 7 Caption-Korrekturen («Spam»): Schreiber müssen eine Sperre als Stoppsignal lesen (`fb_caption_korrektur.mjs` bricht ab, 45 s Takt, täglich weiter). Server-Platte 100 % durch `git gc` auf fast voller Platte (+3 GB alte `tmp_pack`-Reste) → `server/platte-schlank.sh`: erst Reste/Verwaistes löschen, dann verpacken.** → Journal Nachtrag 47
- 2026-09-23 · 🗑️ **«JA fb löschen»: 120 FB-Beiträge weg (DOPPEL/PRODUKT/TON), 23 mit nur falscher Caption bleiben stehen. Der Lauf meldete «92 Fehler»: gelöschte Seiten-Posts antworten beim Rücklesen mit Code 10, nicht 100 → Wahrheit = Seiten-Listing; `fb_qualitaet_loeschen.mjs`.** Scharfe Läufe voll ins Log, nie durch `tail` → Journal Nachtrag 46
- 2026-09-23 · 🔓 **Social-Max integriert + zwei Sperr-Klassen an der Wurzel: Stimme wäre per edge-tts (keine Werbelizenz) bei 50 % live gegangen → opt-in; `rebase.autoStash` liess «unmerged» Dateien ohne MERGE_HEAD → `git_sichern.sh` (Merge, kein Autostash) für Motor/Committer/mich; Deadlock Text-Sperre ⟷ Shopify-Schranke (6 Wächter bis 3 h) → wer fd 8 hält, wartet nie; Heilversprechen-Vollscan 26 (23 entschärft, 3 gedraftet).** Sperren in fester Reihenfolge; neue Fähigkeit mit Rechtsfrage startet aus → Journal Nachtrag 45
- 2026-09-23 · 🧬 **Konfliktmarker im Repo: `autocommit.sh` liess einen gescheiterten Merge offen, der nächste `add -A dropship/`+commit schloss ihn MIT Markern ab (Server, 3 Commits) → `_kategorie_stand.json` unlesbar. Jetzt Auflösen je Dateiart (Ledger Union, Zustand eigene, Code Abbruch) + Marker-Sperre vor dem Push, Durchlauf `--einmal` (Server übernimmt ohne Neustart).** Wer automatisch merged, erkennt den offenen Merge VOR dem nächsten `add` → Journal Nachtrag 44
- 2026-09-23 · 🔑 **Social-Messung umgesetzt (1): Karussell-Slides `01.jpg` kollidierten im gemeinsamen Ledger (jedes 2. Set = «Doppelpost») → `mediaKey` mit Set-Ordner; Kristall-Quittung lag im Autostash (nur `igLiveHas` schützte) → nachgetragen + 573 Ledger-Zeilen per Union; Klingenregel englisch + «Messer mit Hülle» = Klinge im Paket (14 neu, 0 weg, 6 gedraftet); Kollektion «Gerade auf Instagram» für den Bio-Link.** Ein Zubehörwort im Titel ist kein Zubehör im Paket; Diff über den Voll-Export statt nur Kanarienvögel → Journal Nachtrag 43
- 2026-09-23 · 🔗 **«Direktlinks kommentieren bei jedem Post»: klickbar nur auf Facebook (IG/TikTok nein, Shorts seit 08/2023 nein, Pinterest = Pin selbst) → `fb_link_kommentar.mjs` (Link aus Text/Queue/Caption, FB-Reel = Post+Reel → Doppel-Sperre), 7 live, Autopilot 30 Min.** Erst prüfen, wo der Link wirkt → Journal Nachtrag 42
- 2026-09-23 · 🎵 **Server-Agent tot = Platte voll durch Voll-Klon (5 GB Historie + Reels) → `server/luxe-agent-schlank.sh` (flach+sparse, Patch statt Rebase). Musik v2: Stück nach Warengruppe, Einstieg am Energie-Fenster statt Intro, −14 LUFS, keine Wiederholung unter 3.** Wer ins Repo schreibt, füllt jede Platte, die es klont → Journal Nachtrag 41
- 2026-09-23 · 📡 **«metricool maximal nutzen»: 6 Kanäle verbunden, 1 genutzt → YouTube Shorts (`NETZ=youtube`, 12 h) + Pinterest-Produktpins (`metricool_pinterest_pin.mjs`, 6 h, Direktlink+UTM) + Bestzeit-Planung + TikTok-Werbekennzeichnung; Ampel `METRICOOL 24 h`.** API-Doku offen: `app.metricool.com/api/swagger.json` → Journal Nachtrag 40
- 2026-09-23 · 🏷️ **Merchant «Missing product price» 1'220: 0 von 426k Varianten ohne Preis — die Seite trägt ein zweites Product-JSON-LD von Judge.me ohne offers (gleiche @id) → Betreiber schaltet Judge.me-JSON-LD ab (API nur lesend). Dazu 14 Audit-Klassen behoben (Google-Sperrtags 87, Knappheitsfloskel 114, Reel-Hashtags, CJ-Vorrang, Helvetismen, 17 tote Links).** Feld-Meldung ≠ Feld fehlt → Journal Nachtrag 39
- 2026-09-23 · 🏷️ **Kategorie-Lauf mappte Sammeltypen pauschal (Grillpfanne = Aufbewahrung) → Titelregeln + `KORREKTUR=1` (nur Pauschalwerte zurücknehmen); FERTIG-Tor las ganzes Log; Zombie 04:07 ungeklärt → Falle; Grow-Zähler «3 Verkäufe → Grow 300 GB».** Typ ≠ Ware → Journal Nachtrag 38
- 2026-09-23 · 🔤 **Bild-Posts mit englischem Lieferanten-Text (Betreiber-Raster): 4 von 69 wartenden ≥4 Wörter → `social_queue_saeubern.py` `bildtext-skip` (OCR, Cache je URL, täglich). Google «Image too small» = Variantenbilder, nicht Hauptbilder → bewusst gelassen.** Ein Google-Befund nennt das Symptom, nicht das Bild → Journal Nachtrag 37
- 2026-09-23 · 💗 **«pinke steine 2mal?»: Gua-Sha-Set 02:11 + Jade Roller 08:26 — zwei Produkte, acht Sperren sagten «neu». Neunte Schicht `warenFamilie()`/`familieKuerzlich()` in `post_guard.mjs` (12 Gruppen, 72 h, ein Ledger für Bild/Reel/Karussell), aus IG gesät.** Doppelpost ist, was die Betrachterin als gleich sieht → Journal Nachtrag 36
- 2026-09-23 · 🎠 **Verbesserungsrunde 6: Karussell-Baustein (TikTok, Meisterwerk, seit heute IG) starb 02:11 am leeren Eimer — jede Drosselung zählte als Fehlversuch (8 × 6 s).** Jetzt Wartezeit aus throttleStatus + Etikette; `py_compile` OK, aber erst der Import zeigte den NameError → Journal Nachtrag 35
- 2026-09-23 · 💊 **Google «Inappropriate image» (445) als Bildprüfer: 3 Sexartikel unter neutralem Namen (Knebel als «Werkzeug») → `adult-auto-draft`; 6 Arzneimittel-Packungen («Nail Fungus Treatment», «Eczema & Psoriasis») hinter längst entschärften Titeln → `arzneimittel-ohne-zulassung`; 4 Hauptbilder getauscht.** `bild_heilversprechen.py` täglich (2 OCR-Lesarten, `OMP_THREAD_LIMIT=1`, Kantengrenze). **Ein entschärfter Titel über einer Arzneimittel-Packung ist Tarnung** → Journal Nachtrag 34
- 2026-09-23 · ⚡ **Kategorie-Lauf 100/min bei Eimer 1999/2000: 25 aliasierte productUpdate laufen bei Shopify SERIELL — Batching spart Anfragen, nicht Zeit.** 3 Arbeiter → 350/min (Eimer 1701), Laufsperre im Skript, Keepalive 3c startet den Nachlauf nach jedem Neustart neu (`$REPO` war dort nie gesetzt); erweiterte Tabelle: unbekannte Typen 4'181 → 280 → Journal Nachtrag 33
- 2026-09-23 · 🏷️ **Shop-Kanal «nicht auffindbar» (33'863): einziges Unterscheidungsmerkmal war die leere Produktkategorie — 46'215 von 50'462 aktiven ohne Taxonomie (Importer setzen nur productType).** `kategorie_wache.py` (54 Typen → verifizierte IDs, 25er-Mutationen, Rücklesen, Ledger, Ampel «KATEGORIE»), scharfer Lauf über 42'034 gestartet; 4 Typen bewusst nicht geraten. Google «Product page unavailable» 369 = veralteter Google-Stand nach Rückholung → Journal Nachtrag 32
- 2026-09-23 · 🪞 **«jede sozail profile verschönern»: FB per API fertig (Info/Beschreibung/https/Profilbild/neues Titelbild im Slide-Stil, Cover via Foto `published=false` + `cover=<id>`); IG/TikTok/Pinterest als Agenten-Auftrag `social_profil_politur.mjs` (liest vorher, schreibt bei Abweichung, liest zurück) — das PC-Skript war seit Juni ein 70-Zeilen-Torso.** Betreiber: Agent-Neustart (COWORK J), TikTok-Bio-Link, IG-Website https → Journal Nachtrag 31
- 2026-09-23 · 🔎 **Google-Feedback-Wächter (Task #100): Lauf 1 zählte 33'863 Meldungen der App «Shop» als Google-Blocker — `product.feedback` trägt ALLE Kanal-Apps, erst nach App trennen.** Google Free-Listings-Blocker 1'957 (Title under review 836, Inappropriate image 445, Product page unavailable 369 — alle mit onlineStoreUrl, Ursache offen); Shop-Kanal 33'863 «nicht auffindbar» = neuer Befund. Bestandszähler: created_at-Partition statt Preisbänder (54'214 waren +7 % Überzählung), `updated_at:>-2d` ist keine Shopify-Syntax → Journal Nachtrag 29
- 2026-09-23 · 🗣️ **Bildkanal sprach noch die Scam-Sprache vom Sommer: 70 wartende Kimi-Captions ohne Preis mit Klarna-Filler, der v2-Nachschub hätte «Designer-Preis»/«WELCOME10»/Threads geschrieben.** `bild_queue_captions_ehrlich.py` (Preis live, Laden-Zeile, Sach-Tags; täglich), Nachschub auf dieselben Bausteine. **Tonalitäts-Regel gilt für jeden Schreiber eines Kanals** → Journal Nachtrag 28

… Einzeilen vom 14.–22.09.2026 (128, zwanzig vom 21.09., dreiundzwanzig vom 22.09.) am 23.09. und sieben vom 23.09. am 24.09. VERBATIM ins Journal verschoben (Abschnitt «📚 Index-Archiv» am
Dateiende — CLAUDE.md muss unter ~70 KB bleiben); alle älteren Abschnitte (rund 380): `GEDAECHTNIS-JOURNAL.md`
(Inhaltsverzeichnis oben). Suche über alles: `python3 tools/gedaechtnis.py "stichwort"`.
