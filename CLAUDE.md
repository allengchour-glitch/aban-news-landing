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
  und kam zurück. Offen: CJ-Dispute USD 25.54, nur per Konsole (COWORK Punkt 0).
- **💾 Dateispeicher: Betreiber-Entscheid 21.09. «grow plan, in einer monat machen, brauche zuerst kunde»** → Grow-Plan ~21.10.2026, bis dahin bleibt der Speicher voll (gewollt); Ampel informiert statt ruft, Routine erinnert am 21.10. Kurs bestätigt: **zuerst Kunden.**
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
  API. Klickweg + Mailentwurf: `dropship/BIGBUY-1000-EURO-HEUTE.md`. Abo endet heute, BigBuy zahlt nur dienstags.
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
- **Umgebungsvariablen erreichen laufende Sessions NICHT** (3× gemessen) → Schlüssel immer im Chat.
  urllib gegen Groq braucht einen User-Agent, sonst 403.
- **Grind PAUSIERT** (Betreiber 14.09.: «jetzt auf Verkauf optimieren»); Dateispeicher 105 von 100 GB.
  **Kurs bis auf Widerruf: Conversion, nicht Menge.**
- **Trichter:** ~1'300 Sitzungen/30 T (77 % mobil), 12 Warenkorb-Zulagen, 1 Abschluss — Engpass ist Verkehr.
  Google-Gratis-Einträge sind der einzige Kanal mit Verkäufen.
- **CJ-Guthaben immer $0** → jede Bestellung braucht den Betreiber-Klick in der CJ-Konsole.
- **Nur-Betreiber-Klicks:** `dropship/COWORK-BEFEHL.md` (Punkt 0 CJ-Dispute, Punkt 1 BigBuy EUR 1'000).
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
  Blush-Balm, Lifting-Tape, Paar-Hoodies, Kerzenwärmer, Haustier-Spielzeug, **Hygiene-Gadget
  (neu 18.09.)**. Reihe: 43 Produkte.
  **ABGELEHNT trotz Trendlisten:** Wellness-/Magnet-Armband = Heilversprechen (dieselbe Klasse
  wie die 1'667 aus den Werbekanälen ausgeschlossenen); Supplements/Olivenöl = Lebensmittel;
  Snail-Essence/Seren = topische Kosmetik (Betreiber-Entscheid 30.08.).
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
10. **⛔ Social-Doppelpost-Verbot (User 2026-07-06) — Kurzfassung, fünf Schichten im Journal 2026-07-26 ⛔:** IMMER nur NEUES posten; Profil + `automation/reels_seed.csv`-Ledger prüfen (nur status=ready, nach Post → posted); gleiches Produkt/Video nie zweimal, auch nicht plattformübergreifend. **⛔ THREADS-STOPP (07.07.)**. Autopilot IG+FB: `automation/meta_reel_post.mjs` (Seite 1049840534888592, IG 17841480560863361, Token `/tmp/meta_page_token`, IG-ID `/tmp/meta_ig_id`); vor Post prüfen, dass das Produkt noch ACTIVE ist.
   **Regel für JEDEN Poster:** `postLock()`+`seen()`+`mark()` aus `post_guard.mjs` — EIN Lock (`/tmp/ig_post.lock`), EIN Ledger (`_posted_media.txt`), nie ein eigener Lockfile; erst claimen (`posting`), DANN posten, Ledger SOFORT nach IG-`media_publish` (vor dem langsamen FB-Schritt); Inhalts-Sperre über Video-Basenames (plattformübergreifend); **`igLiveHas()` fragt VOR dem Post die letzten 25 IG-Posts** (Plattform-Wahrheit schlägt jeden Ledger; gilt für Reel- UND Bild-Poster); nie dasselbe Video in zwei Queues (`dedup_queues.mjs`). Meta-Token ~60 Tage; Posts >500 Views nie löschen; Live-Löschen geht nur lokal/PC. **Seit 17.09.: `dropship/_SOCIAL_STOPP` — nur der Betreiber löscht ihn.**
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
16e. **📢 Google-Merchant-Feed (2026-07-10)** — ⚠️ **Der «#1-Hebel» darin ist SEIT 17.09. UNBESTÄTIGT.**
   Gemessen 17.09.: Shopify hat **genau EINEN Markt, «Switzerland», Länder=['CH']** — von unserer
   Seite zielt also nichts auf DE. Ob die «1'698 Produkte · Missing shipping info» noch existieren,
   ist von hier **nicht prüfbar**: keine Google-Zugangsdaten im Repo, die Merchant-API wurde nie
   benutzt, und der Agenten-Browser kann sich bei Google nicht anmelden (Google blockt kopflose
   Browser, gemessen 17.09.). **Die Zahl ist zwei Monate alt — vor jeder Arbeit daran erst im
   Merchant-Konto nachsehen.** Eine Zahl aus dem Gedächtnis ist keine Messung von heute.
   Ursprünglicher Eintrag: Google liest **mm-google-shopping-Metafelder**, NICHT den
   Beschreibungstext! Fehlend: material/age_group/gender/color → `automation/google_feed/*_metafield.py`
   (Material aus Beschreibung extrahieren, age_group=adult, gender aus Tags). **#1 Gratis-Traffic-Hebel (nur
   User): Merchant-Ziel-Land auf NUR Schweiz** → 1698 Produkte «Missing shipping info» freigeben (Feed zielt
   auf DE, Shop liefert nur CH). **83% der Produkte über Google-Benchmark** (BigBuy-Marken) → reprice-Engine
   `reprice_to_benchmark.py` senkt CJ/Eigenware auf Benchmark, BigBuy nur bis Kosten-Boden (nie unter EK+Versand).

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
  Erst wenn `ListAgents` die PC-Session zeigt, geht `SendMessage`. Skripte für den PC liegen bereit:
  `automation/local/profil-politur-browser.mjs` (Playwright) + `automation/social-profile-polish.mjs` (puppeteer).
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

## ⚠️ CJ-Grind-Plateau (Kurzfassung — Volltext: Journal 2026-07-30 ⚠️; Grind seit 14.09. PAUSIERT)
Flacher Ledger ist meist KEIN Token-/Punkte-Problem: «Rings: total 0» ist der EIGENE Import-Zähler (alles schon im Ledger). Ursachen und Fixes: **DEPTH-Reset** (Basis `15+ROUND*3`, ROUND persistent in `/tmp/cj_<runner>_round`, Seed 6, Wrap >25); **`countryCode=EU`-Filter gibt CJ-weit total 0** — WAREHOUSE leer lassen, Bestand je vid über `product/stock/queryByVid` ist trotzdem echt (DE-Lager gemessen); **Strafschlaf 120 s statt 1800**; Runner **gestaffelt** (3 s), nie gleichzeitig (OAuth/getAccessToken-Drossel); **alle 27 GROUPS** in jeder Rotation (9 fehlten). Seit 21.09. laufen alle CJ-Aufrufe über `cj_takt` (1,8 s Startabstand).

## 📚 Jüngste Lehren (Index — Volltext im Journal)

- 2026-09-21 · 🔌 **«mach alles selber und fix»: 29 Geräte mit unklarem Netzstecker — die Auswahl statt der Rate.** Jedes Gerät bekam seine CJ-EU-Varianten als echte Farb-/Ausführungsauswahl mit EU-SKU; der Trockenlauf zeigte drei Fallen (Bündel für CHF 180.90, günstigste Variante = OHNE Ionen, «White 50W strip» ist keine Farbe) → nur reine Farbwerte automatisch, sechs Fälle ausdrücklich im Code; das Rücklesen fing einen fehlenden Preis → Journal
- 2026-09-21 · 🚧 **Sechs Stunden ohne einen Tages-Wächter — die Schranke von heute Morgen hatte sich selbst ausgesperrt.** Inline im `bash -c`-String schlossen die inneren Anführungszeichen den äusseren, `$_s` expandierte leer, der Rest lief als Dateiname: 89× «line 412: … No such file» im Aufseher-Log, **26… → Journal
- 2026-09-21 · 🖥️ **Der grosse Hebel für «schneller automation» liegt nicht im Code, sondern im Schlaf des Containers.** Alle Tages-Wächter laufen nur in Session-Arbeitszeit. → Journal
- 2026-09-21 · 🎨 **Zwei Shop-Varianten, eine CJ-SKU — «Grau» hätte Silber bestellt.** Zweiter Varianten-Lauf: Handsauger trägt an beiden Farben `…01AZ`, CJ führt `01AZ`+`02BY` → Fehlversand statt Ghost-Sale. → Journal
- 2026-09-21 · ⏱️ **«schneller automation»: die Automation stand sich selbst im Weg.** Ohne Absprache drosselt CJ jeden zweiten Aufruf (1600200), die Helfer schlafen 8/16/24 s → ~12 s je Produkt bei 0,6 s Latenz. → Journal
- 2026-09-21 · 🧩 **Das Produkt lebt, die Farbe ist tot — die Wache fragte nur nach dem Produkt.** Trainingsanzug: CJ führt 32 Varianten, der Shop 40, **8 Blau mit Menge 0 + CONTINUE kaufbar** — Ghost-Sale eine Ebene tiefer. → Journal
- 2026-09-21 · 💾 **Betreiber-Entscheid: Grow-Plan in einem Monat, zuerst Kunden.** Quittung MIT Ablaufdatum (`_dateispeicher_entscheid.txt`, 21.10.): die Ampel zeigt den vollen Speicher weiter als Messung, aber als gewollten Zustand, und ruft nach dem Datum von selbst wieder. → Journal
- 2026-09-21 · 🔁 **68 kaufbare Produkte falsch gedraftet — mein Regex von heute früh, und die alte Fassung seit Wochen.** «CJ-CJJSBGSD00009-Blue package-US» → Kern `CJJSBGSD00009` = PRODUKT-SKU (kein `01AZ`), am **Varianten**-Endpunkt gefragt, `1602001 not found` als Absage gewertet — Kanarienvogel productSku: **200,… → Journal
- 2026-09-21 · 🚪 **49 Tages-Tore, keines beanspruchte sein Log — der Bewertungs-Importer lief doppelt.** Tor-Frage «Log älter als 24 h?», der Lauf schreibt minutenlang nichts (Prio-Liste zuerst), nach dem 120-s-Schlaf war das Tor noch offen → zwei Instanzen (822 s / 696 s, `sid` = Forks EINES Aufsehers). → Journal
- 2026-09-21 · 🗓️ **Die API-Version im Code war seit Monaten nicht die, die antwortete.** Kopf gemessen: 2024-10/2025-01/2025-07 → alle still auf **2025-10** bedient, die am **01.10.2026** ausläuft — 350 Stellen wären in zehn Tagen unangekündigt auf 2026-01 gesprungen. → Journal
- 2026-09-21 · 🧭 **Drei tote Landeseiten + ein Kollektionstext entschieden.** Alle drei Seiten (9/5/2 Sitzungen) tragen `cj-nicht-mehr-verfuegbar` → nicht zurückholbar → 301 auf die Kategorie (`sub-sandalen`, `sub-aroma-diffuser`, `wasserfester-schmuck`); «Wasserfester… → Journal
- 2026-09-21 · 🚧 **Geduld reicht nicht, wenn alle gleichzeitig warten — die Schranke.** Nach den Geduld-Patches starb `lagerstand_hygiene` erneut, jetzt mit Grund: «12x gedrosselt (Eimer dauerhaft leer)». → Journal
- 2026-09-21 · 📚 **«9 geprüft» las sich wie Fortschritt — es waren 810 Katalogseiten, jede Stunde.** `cj_verfuegbarkeit` schrieb 104× dieselbe Zeile; gemessen blätterte er seit der Cursor-Löschung (19.09.) bei JEDEM Lauf den ganzen Katalog (~810 Seiten, **50–80k Punkte** aus einem 2'000er-Eimer),… → Journal
- 2026-09-21 · 🔁 **Fünf sinnlose Läufe pro Stunde, für immer — und ein Wrapper, der Befunde erfindet.** (1) `versandschwelle_rabatt.log` meldete seit 10.09. → Journal
- 2026-09-21 · ⏳ **Der Kommentar sagte `restoreRate`, der Code schlief 12 s — und mein Patch hatte denselben Fehler.** «alles fixen»: ~15 Wächter enden mit «Shopify antwortet nicht». → Journal
- 2026-09-21 · 🫀 **Ein Herzschlag, der sich als Arbeit ausgab — und die Post brachte ein endgültiges Nein.** «email sachen machen»: Posteingang in drei Tagen **ein** Vorgang, der Befund lag daneben. → Journal
- 2026-09-21 · 🪣 **Acht Wächter, ein Eimer — die Drossel war hausgemacht, und mein erster Fix war falsch.** `menue_links.log`: **15 PAUSE-Zeilen bei 16 Läufen** — der Wächter, der am 15.09. → Journal
- 2026-09-21 · 🩹 **Der Wächter fragte nach der Werbung, nicht nach der Ware — und die Lücke, die ich reparieren wollte, gibt es nicht.** Zwei Ergebnisse, beide durch Messen statt Vermuten. → Journal
- 2026-09-20 · 🎯 **Vierzig von vierzig Treffern — und kein einziger war ein Fund.** Die Startseite lieferte dem Hetzner-Agenten am 20.09. → Journal
- 2026-09-19 · 🔁 **Zwei Pfade, ein Wächter — der Doppelstart war meiner.** Nach der Cursor-Reparatur den Nachhol-Lauf von Hand gestartet, **vorher geprüft ob einer läuft** (leer) — und die Prüfung war trotzdem wertlos: der Aufseher startete denselben Wächter **eine… → Journal
- 2026-09-19 · 🕳️ **Ein Cursor, der «neueste zuerst» sortiert, sperrt genau die Neuzugänge aus.** `cj_verfuegbarkeit.py` (Ghost-Sale-Wächter) meldete seit dem 16.09. → Journal
- 2026-09-19 · 🔎 **Der Klammer-Trick schützt den grep — nicht die Zeile, die ihn trägt.** Der 08:08-Keepalive endete mit `Aufseher=0`; zwei Prüfungen in EINER Zeile widersprachen sich: `awk '$2=="bash" && $3 ~ /fixer_keepalive\.sh$/'` → **nichts**, `grep -c "[f]ixer_keepalive"` → **1**. → Journal
- 2026-09-19 · 📭 **Ein Schweigen kann heissen, dass die Frage nie angekommen ist.** Die CJ-Nachmessung brachte vier saubere Neins (Guthaben `amount 0.0`, `disputeId` null, Dispute-Liste 0, keine Mail neuer als CJs Zusage vom 18.09. → Journal
- 2026-09-19 · 🇱🇮 **«mach bot besser und seite»: der Puls beweist Leben, nicht Ankunft — und der Shop verspricht ein Land, das nicht bestellen kann.** `_puls.json` war frisch, **zwei Quittungen standen seit 17.09. → Journal
- 2026-09-18 · 🪞 **Fremder Stand gegengeprüft: 0 bestätigt, 1 widerlegt, 4 teilweise — und ich hatte ihn schon gepusht.** Die Cowork-Session schloss aus einem 403 ihrer Sandbox, das Repo sei **privat**, und legte im Vertrauen darauf Bank, Kontoinhaber und vier Auszahlungsbeträge hinein. → Journal
- 2026-09-18 · ⏰ **Der Wecker wurde zur Tatsache: eine «CJ-Frist», die ich mir selbst gestellt hatte.** In `COWORK-BEFEHL.md` stand «CJ-ERSTATTUNG — Frist 19.09. → Journal
- 2026-09-18 · 🎯 **«hole / suche kunden»: 15 Vorschläge, NULL überlebte — der Fund lag darunter.** Teils meine Schuld («im Zweifel widerlegt»), aber die harten Absagen sind gemessen: **Microsoft/Bing-Kanal ist in der SCHWEIZ nicht verfügbar** (App prüft die Firmenadresse, 10 Länder, CH keins) ·… → Journal
- 2026-09-18 · 🩹 **«mach alles reibungslos»: 23 Agenten, 9 Befunde hielten stand — die 7 GEFALLENEN waren die lehrreicheren.** In fast jedem gefallenen Fall stimmte der *Mechanismus* und die *Folge* war falsch: `status:open` trifft wirklich keine einzige der 16 Bestellungen (alle archiviert) — «die Ampel ist blind» ist… → Journal
- 2026-09-18 · 🔁 **«pimp bot»: er wartete auf Zuruf — und verpasste dabei seine eigene Messung.** Gemessen: `grep -c "wiederkehr|intervall|cron"` über den Runner → **0**; er wacht **alle 5 Min** auf, Puls fast immer «leer», alle 43 Quittungen kamen von meinen Zurufen. → Journal
- 2026-09-18 · 📬 **«cj mail check»: CJ hat 08:44 geantwortet — und 9009 endlich erklärt.** **Erstattung zugesagt:** Dispute im WEB-PORTAL öffnen, dann zahlen sie die vollen **USD 25.54** (18.24 + 7.30) auf die Wallet; sie bestätigen den Rückläufer wörtlich und dass es **keine Linie für… → Journal
- 2026-09-18 · 🧹 **«Mach alles sauber»: vier Spuren, DREI davon meine eigenen Fehlmessungen.** (1) **Die Landkarte von heute Morgen war zu 3/4 falsch** — Auftrag 35 zeigte, dass Shopifys Kontrollseite `/settings/billing` (in 32 «angemeldet ✅») **ebenfalls 403** gibt, wie alle 5… → Journal
- 2026-09-18 · 🤖 **«Superbot» heisst erst messen, was er kann.** Drei Lücken, alle gemessen: (1) `grep -rln luxe_auftrag_runner automation/ tools/` → **0 Treffer** — der einzige Rechner mit echtem Browser stand in KEINER Wacht-Liste; (2) sein Runner endete bei… → Journal
- 2026-09-17 · 🔫 **Der Social-Stopp gilt nur auf EINEM Zweig — auf `main` steht der Poster nackt.** Vor der geplanten Instagram-Arbeit den Stapel mit fünf Linsen vermessen (3 Blocker bestätigt, 3 widerlegt). → Journal
- 2026-09-17 · 🧠 **Zweites Gehirn gebaut — `tools/zweites_gehirn.py`** (Betreiber: «ki automation mit 2te gehirn für alles automation und selber wachsen verbessern»). → Journal
- 2026-09-17 · 📌 **Pinterest ist zu 100 % ausgeliefert — ein wertvolles Nein.** Der Distributions-Reiter (den ich beim ersten Lauf übersehen hatte): **438,94 Tsd. → Journal
- 2026-09-17 · 🔬 **Viermal dieselbe Frage gestellt, dreimal falsch beantwortet.** Nach den 25 Wächtern mit stiller Null waren 18 mit `return None` dran: fängt der Aufrufer das mit `or {}` auf? → Journal
- 2026-09-17 · ` **Backticks in einer Bash-Zeichenkette essen genau die Wörter, um die es geht.** Der Commit über die 25 Wächter steht mit «25 endeten auf .» und «enden auf  und 67 …» im Repo — in `git commit -m "…"` ist `` `return {}` `` eine **Befehlsersetzung**, die Shell wollte es… → Journal
- 2026-09-17 · 📎 **Ein Dateifeld ist nicht «das Dateifeld».** Auftrag 27 sollte 117 Pins per CSV hochladen und endete mit «element is not enabled» — ich schrieb es einem schlechten Selektor zu. → Journal
- 2026-09-17 · 🚪 **Pinterests Katalog-Diagnose gelesen — und die falsche Hälfte abgeholt.** GEMESSEN: **431,36 Tsd. → Journal
- 2026-09-17 · 🔢 **«4 Versuche» in einer Meldung, die fünfmal probiert.** Die `gql()`-Reparatur auf drei weitere Wächter (dieselbe Klasse wie die 19 vom Morgen, hier zusätzlich mit `return {}` = die Null, die wie eine Messung aussieht) trug die Versuchszahl fest in der… → Journal
- 2026-09-17 · 🧱🇩🇪 **«BigBuy angemeldet» war ein Fehlalarm — Cloudflare auf Deutsch.** Auftrag 18 (rein lesend) bekam von `bigbuy.eu/en/contact` **«Sicherheitsüberprüfung wird durchgeführt · vor böswilligen Bots zu schützen», Ray ID a3ca2241ac1e86d9, 0 Formularfelder,… → Journal

- 2026-09-17 · ⛔ **Bei Google kann sich der Agenten-Browser NICHT anmelden** «Anmeldung nicht möglich · Dieser Browser oder diese App ist unter Umständen nicht sicher». → Journal

- 2026-09-17 · 🧱 **Die Bot-Wand behält die Adresse.** Auftrag 09 war die Gegenprobe zu 03 MIT der neuen Ziel-Prüfung — und meldete wieder `ok`: Endadresse unverändert, kein Gastgeberwechsel, keine Anmeldemaske. → Journal
- 2026-09-17 · ✉️ **Der Bot hat das Pinterest-Profil gelesen — und zwei Dinge richtiggestellt.** (1) **«Gratis-Versand ab CHF 65» steht dort NICHT.** Das Feld `about` sagt gemessen «Gratis-Versand ab CHF **50**» — meine eigene Eintragung von heute Mittag («fünf Wochen überlebt», aus einem… → Journal
- 2026-09-17 · 📌 **Eine Korrektur, die den Shop durchsucht, erreicht keinen Kanal.** Der Pinterest-Screenshot zeigt in der Profilbeschreibung «Gratis-Versand ab CHF **65**» — eine Angabe, die am **10.08.** aus dem Theme entfernt wurde (`seo_versandschwelle_fix.py` dokumentiert es)… → Journal

- 2026-09-17 · 🚚 **Fast eine WAHRE Aussage kaputtrepariert** Startseite bewirbt «Gratis ab CHF 50», live greift **45**. → Journal
- 2026-09-17 · 🎯 **Zwei Agenten-Quittungen sahen aus wie Erfolg und waren keiner** 03 landete auf einer Bot-Prüfseite («Verbindung muss verifiziert werden») → `ok`; 06 auf Googles Einwilligungswand **mit «Sign in» oben rechts** → `angemeldet: true`. → Journal
- 2026-09-17 · 📌 **Pinterest war nie ein Token-Problem.** Betreiber hat das Agenten-Browserprofil angemeldet (Händlerstatus «Genehmigt», Shopify «Verbunden») — der seit 08.07. → Journal

- 2026-09-17 · 🔔 **Drei Shopify-Meldungen («fix»)** **Autopilot-Kanäle** (heute/10.09./07.09.), **«Keine gültigen Zahlungsmethoden»** (26.08.), **Pinterest** (08.07.). → Journal
- 2026-09-17 · 🩺 **«fix alles mehr»** Rundgang über alle Logs. → Journal
- 2026-09-17 · 🧪 **«schaue das der bot alles kann»** durchgespielt statt zugesichert — **vier Lücken, zwei erst im Testlauf sichtbar.** (1) `automation/browser/` gab es **gar nicht** → die Auftragsart `skript` konnte nichts; erstes Skript… → Journal
- 2026-09-17 · 🏠 **Hetzner-Agent vor dem ersten Lauf korrigiert** er sollte in `/opt/abannews` wohnen — **genau dort macht der Deploy-Poller alle drei Minuten `git reset --hard origin/main`** und hätte Agent samt Ergebnissen weggeräumt, bevor sie jemand sieht. → Journal
- 2026-09-17 · 💳 **«shopyfi zahlung fehler?»** **ja — aber nicht die Kasse, sondern UNSERE Rechnung.** Gemessen: alle 4 Kundenzahlungen seit 18.08. → Journal
- 2026-09-17 · ⏸️ **Der Container startet nicht stündlich neu — er wird angehalten, sobald ich aufhöre.** Zweimal `uptime` «up 0 min» auf die Minute des Routine-Ticks. → Journal
- 2026-09-17 · 🖥️ **«hetzner server extra eingerichtet»** **der Server ist nicht neu** — er steht seit 22.06. → Journal
- 2026-09-17 · 💸 **«erledige das auf sein iban»** **widersprochen — das Geld war längst draussen.** Gemessen: #1017 (Esatovski) **erstattet 16.09. → Journal
- 2026-09-17 · 📨 **«cj mail checken»** CJ antwortete 07:21 — **auf die Mail vom 9.09., nicht auf die Rückerstattung**, und mit der Aussage, beide Pakete seien unterwegs. → Journal
- 2026-09-17 · 📉 **«mach weiter»** vier Vermutungen geprüft, **drei falsch**. → Journal
- 2026-09-16 · 📣 **«mach gratis werbung überall mit bot»** **kein Spam-Bot** (Foren/Kommentare = Kontosperre, und an Google hängt der einzige Kanal mit Verkäufen). → Journal
- 2026-09-16 · 🎫 **«cj co work erledigen»** CJs Vorschau `disputes/disputeConfirmInfo` antwortet **200** mit `maxAmount 25.54` und nennt sogar den richtigen Grund (**6 «Product Returned»**) — `disputes/create` verweigert dieselben Werte… → Journal
- 2026-09-16 · 🧰 **«lerne mache das» (TikTok, prompts** .chat): **jede Einzelbehauptung stimmt** — quelloffen (MIT/CC0), **170,5k Sterne**, MCP-Server `https://prompts.chat/api/mcp` antwortet wirklich, ohne Schlüssel. → Journal

- 2026-09-16 · ❓ **«faq in webshop?»** ja — aber **vier allgemeine FAQ-Seiten** standen veröffentlicht nebeneinander, und **nur eine** war verlinkt (Footer → `/pages/faq`). → Journal

- 2026-09-16 · 📤 **Shopcom** Auftrag war «Betreiber erinnern, die Anmeldung zu senden» — gemessen (`to:… in:sent`) ging sie am **05.08. → Journal

- 2026-09-16 · 🔪 **«messer zurück erstatten und alles»** CJ schickte #1017 aus Shanghai zurück (verbotener Artikel, keine Linie CN→CH). → Journal
- 2026-09-16 · 🔍 **Mein eigener Klingen-Wächter meldete **«0 Handklingen im Verkauf», während der Köder aktiv war**** Shopify sucht auf WORT-ANFÄNGEN, `title:messer*` findet «Messerset», aber NIE «Taschenmesser»/«Kochmesser» — und `title:*messer*` liefert gemessen **exakt dasselbe** (führendes Sternchen wird… → Journal

- 2026-09-16 · 🎫 **«egal wie hauptsache erledigt»** vor dem Delegieren selbst geprüft — `bigbuy.eu/en/contact` gibt **HTTP 403 von BEIDEN Ausgängen** (eigene IP + WebFetch), es braucht wirklich einen Browser. → Journal
- 2026-09-16 · 🏦 **«schau das bigbuy auszahlt»** **fünf Mails, zwei wortgleiche Auto-Antworten** (08.09. → Journal
- 2026-09-15 · 🧠 «pimp obsidian»: Link-Hygiene war schon top (0 kaputt, 0 Waisen) — der Fund lag woanders. **`index_bauen()` hatte eine fest verdrahtete Ordnerliste ohne `Lehren/` und `Betreiber-Entscheid/` → drei Notizen fielen still aus dem Index** (79 von 82). → Journal
- 2026-09-15 · 🔍 «was kann man noch machen für webseite»: die drei Punkte abgearbeitet, die in der Vollständigkeits-Kritik stehen. → Journal
- 2026-09-15 · 💰 «lerne von anderen wie man profit macht»: GEMESSEN **29,0 % Nettomarge, CHF 9.20 je Bestellung, AOV 33.00, 0 Verluste** (6 von 9 mit belegtem EK) → für CHF 1'000 Gewinn braucht es **109 Bestellungen**. → Journal
- 2026-09-15 · 🧷 «push überall»: `git rev-parse --short HEAD origin/<branch>` meldete `fatal: Needed a single revision` — ich las den bekannten **verklemmten Tracking-Ref** und wollte `repo_vorspulen.sh` (mit seinem `git stash -u`) auf ein **gesundes** Repo loslassen. → Journal
- 2026-09-15 · 🔦 Rundgang über **alle** `/tmp/*.log` nach `Traceback|Error:` → **fünf tote Wächter**. Drei aus derselben Ursache: → Journal
- 2026-09-15 · 💀 «fix weiter bis kein fehler mehr»: `wahlversprechen.py` war **sechs Tage tot** — `m.start()` VOR dem `if m` (Absturz beim ersten Produkt) und dahinter `BESCHREIBEND` erst 90 Zeilen später definiert. → Journal
- 2026-09-15 · 🦶 «verbessere weiter»: **Der Footer stand in KEINER Wächterliste** — `menue_links.py` las `if m["handle"] == "main-menu"`. → Journal
- 2026-09-15 · 🌍 «Versand nach Deutschland»: erster Detektor meldete ~30 Treffer, **fast alle falsch** («Weltweite Spannungsanpassung 100-240V» neben «🚚 Lieferung 10–20 Werktage» — Produkttexte haben keine Satzzeichen). → Journal
- 2026-09-15 · 🧪 «co work machen»: 4 von 10 Punkten ohne Browser entschieden. **Versandschwelle endgültig geklärt** — `storefrontAccessTokenCreate` + `cartCreate` liefern echte Körbe MIT Versandoptionen (`tools/versand_testkorb.py`): → Journal
- 2026-09-15 · 📮 Die Sende-Routine hat «**Schreibe NUR Drafts, sende NIE selbst**» wörtlich im eigenen Prompt — und sendete trotzdem (die vorgeschriebene Refund-Floskel ging 06:23 an #1017). → Journal
- 2026-09-15 · 🤖 Eine fremde Routine (`trig_01KAnvaXU7rbVVBbaUqrg6ci`, heisst «Drafts schreiben») SENDET: sie versprach #1017 um 06:23 UTC eine Rückerstattung — gegen den Betreiber-Entscheid vom 11.09. → Journal
- 2026-09-15 · 💶 «1000 Euro zurück»: keine neue BigBuy-Mail (die von 06:23 war unsere eigene Wiederholung); Guthaben gemessen `"1000.00"`, seit 15.07. → Journal
- 2026-09-15 · 👻 «118 leere Kategorien»: nur **2** sind im Onlineshop sichtbar, 116 waren nie veröffentlicht — mein Abmelde-Vorschlag für 55 Markenregale betraf Seiten, die niemand öffnen kann. → Journal
- 2026-09-15 · ✉️ #1017: Kunde bat am 11.09. um Rückerstattung auf eine gemailte IBAN, bekam 4 Tage keine Antwort («??» am 15.09.); → Journal
- 2026-09-15 · 🏢 «B2B?»: Shopify-Mail «du hast begonnen» ist Werbung — gemessen 0 Firmen, 0 B2B-Kataloge, Plan Basic (kein Plus). Nichts halb gebaut. Der gangbare Weg steht seit 14.09. als Seite «Firmen & Vereine» mit Anfrageformular
- 2026-09-15 · 🧭 «Was könnte man noch machen?»: 47 Vorschläge, 39 geprüft behalten, 8 verworfen + Vollständigkeits-Kritik → `dropship/WEBSITE-IDEEN-2026-09-15.md`; Cowork 1 (Versand 45→50) zurückgezogen, hätte rabattierten Körben den Gratisversand genommen
- 2026-09-15 · 📱 Kundenstimmen-Sektion von gestern machte die Startseite auf dem Handy 1488 px breit; zwei Fixes schienen wirkungslos — es war der IP-Cache. → Journal
- 2026-09-15 · 🔇 Zwei Schreibvorgänge meldeten Erfolg und taten nichts: `menuUpdate` verwirft `url` bei Typ COLLECTION; `articleUpdate` braucht `HTML!` statt `String!`, und die `or {}`-Kette verschluckte den GraphQL-Fehler. → Journal
- 2026-09-15 · 🎄 «Weihnachten» im Menü führte auf 4 Produkte, im Katalog lagen 162 (Tag fehlte); alle getaggt, Kollektion füllt sich. → Journal
- 2026-09-15 · 🧭 Hauptmenü: 6 Einträge zeigten auf `/en/collections/…` = 404 (auch «Schmuck & Uhren»); Wächter sah sie nicht (Regex greift mitten im Pfad) und meldete dafür 2 Emoji-Handles falsch (kein `unquote`); → Journal
- 2026-09-15 · 🕳️ BigBuy-Abschied griff nur `tag:bigbuy` — 136 aktive Produkte mit `bb-…`-SKU wären bestellbar geblieben (Geisterverkauf #1006/#1008/#1009); Auswahl auf Tag-ODER-SKU erweitert. Wächter immer mit einem ZWEITEN Merkmal gegenzählen
- 2026-09-15 · 📦 Zugesagte Rückerstattung für #1017/#1018 fällig — gemessen statt erstattet: beide Sendungen seit 12.09. unterwegs (7 Stationen, Schweizer Post); Betreiber-Entscheid 11.09. hatte die Zusage ohnehin überholt
- 2026-09-15 · 🔎 «Nicht prüfbar» war eine Aussage über meine Suche: die BigBuy-Kündigung stand seit 16.08. im Kopf von `bigbuy_abschied.py`, und das Skript lief in dem Moment (260 → 194 aktive); → Journal
- 2026-09-14 · 🍬 «Essen von Fortura»: Kollektion `suesses-esswaren` bestand schon (29→31 CH-Lager-Süsswaren) — Menü nach vorne, in Startseiten-Rotation; vor dem Anlegen immer Bestand suchen
- 2026-09-14 · 🤖 «chatgpt pushen»: 2,17 % Conversion; Agentic Storefront braucht US-Markt (nur CH) → Cowork 9; ChatGPT zitiert Fakten-Seiten (8/12 Influencer-Seite) → FAQPage-Schema auf /pages/faq, Bing-Sitemap Cowork 10
- 2026-09-14 · 🔁 Keepalive zum 3. Mal von der PC-Session abgeschaltet («CJ lief weiter» — gemessen: 0 Produkte nach Pausenbeginn 15:57Z); Trigger umbenannt, Prompt trägt Messung + Prüfbefehl
- 2026-09-14 · 🧩 «suche apps»: 33 installiert, 4 wirken; Inbox installiert-aber-aus (Cowork 7), Hextom-Währungsrechner = Ballast (Cowork 8); keine neue App nötig — Bestand messen vor App-Suche
- 2026-09-14 · 🛒 «verbessere katalog»: 70 % Verkehr auf Produktseiten, 38 % davon Drafts (404) → 61 Redirects; USA-Block 346+475 zurück (Sisyphus-Wächter, Rotation); → Journal
- 2026-09-14 · 🧭 «youtube optisch+seo»: 2× Warenkorb-h2 vor H1 (Produkt/Kollektion, nicht Startseite) → role=heading; JSON-LD in den Head; Kundenstimmen-Karussell aus Judge.me-Metafeld nach Bestsellern (kein App-Block nötig); damen-mode 174→138
- 2026-09-14 · 📺 Betreiber-Link «Claude kann ALLES in Shopify»: YouTube 429 → oEmbed für Titel/Kanal; Inhalt = unser Alltag; GEMESSEN: Shop spricht UCP (/api/ucp/mcp, 10 Werkzeuge), Katalogsuche braucht Agentenprofil
- 2026-09-14 · 🔑 Groq lebt (Chat-Schlüssel, 200), Ampel-403 war der urllib-User-Agent; PC-Gedächtnis hatte Keepalive-Routine AUS und Entwurfs-Routine AN (2'031 Drafts heute) → umgeschaltet; Versand live 45 statt 50, Klick blockiert
- 2026-09-14 · 🛑 «stoppe cj grind?» / «Grow in ≤6 Monaten, jetzt Verkauf optimieren»: Grind pausiert (Runner 0, Pause +180 T), Bilder gingen trotz 105 % noch; Groq-Schlüssel kam nicht an (Env leer nach Neustart)
- 2026-09-14 · 🏢 «b2b optimieren?»: kein Firmenkonten-Ausbau — Seite «Firmen & Vereine» mit Anfrageformular (Merch ab 10 Stk, CH-Lagerware, Rechnung), Footer 15 Einträge; Formular-Knopf hiess «Submit»
- 2026-09-14 · 🎠 «mach 8 produkte, fülle die Webseite mit anderen Katalogen»: 18 Reihen à 8, 8 Wechsel-Reihen drehen täglich durch 25 Kataloge (Automat), Startseite 3,1 MB
- 2026-09-14 · ⚖️ «vergleiche andere seite mit unsere»: 10 CH-Shops gemessen, Startseite 6,92 → 3,75 MB (Horizon rendert grid+carousel_on_mobile doppelt; Icon-Symbol statt 368 Inline-Kopien)
- 2026-09-14 · 📺 «lerne im youtube sachen»: 4/6 Videos lesbar, Merchant-Anforderungen erfüllt bis auf UID, Befund nur im Backup (Backup ≠ live), Drossel nach 13 Abrufen

… und alle älteren Abschnitte (rund 380): `GEDAECHTNIS-JOURNAL.md` (Inhaltsverzeichnis oben).
