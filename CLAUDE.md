# CLAUDE.md — Projekt-Gedächtnis (KERN)

Dieses Repo ist `aban-news-landing`, enthält aber mehrere Projekte. Das aktive, autonome
Arbeitsgebiet ist der **CJ-Dropship-Import für den Shopify-Shop LuxeStyle CH**.

> ⚠️ **Diese Datei ist bewusst KURZ** (Betreiber 14.09.: «prompt zu lang immer»). Sie trägt nur Regeln,
> Dauerauftrag, Kernfakten und den aktuellen Stand. **Alle Tages-Lehren (Tagebuch, ~400 Abschnitte) stehen in
> `GEDAECHTNIS-JOURNAL.md`** — dort NEUE Lehren eintragen (oben), hier nur die Einzeile im Index unten.
> Suche über alles: `python3 tools/gedaechtnis.py "stichwort"`. Parallel-Sessions: `SHARED-MEMORY.md`.

## 📌 Aktueller Stand (16.09.2026, 07:30 UTC) — was JETZT gilt
- **🗓️ 12-TAGE-PLAN «Webseite pimpen» (01.–12.10.2026, Betreiber «pimpe 12 tage webseite mit allem drum und dran»): JEDE Verbesserungsrunde nimmt zuerst den Punkt des Tages aus `dropship/WEBSEITE-12-TAGE-PLAN.md`** (messen → ändern → nachmessen → dort abhaken). Hausregeln gelten weiter.
- **🚀 01.10.2026 ~16:20 UTC: GROW-PLAN AKTIV + GRIND WIEDER AN** (Betreiber: «cj runner go … grow plan aktiv, nutze aus und pimpe die webseite fülle die leeren kategorien und neuheiten von cj sachen mit allem drum und dran»). Gemessen `shop.plan.displayName` = «Shopify» (= Grow, 300 GB lt. Betreiber). `_GRIND_RUNNER_ZAHL` = 4, `_GRIND_PAUSE_BIS` = 0; Runner ruhen nur im Vorrang-Fenster 16:00–17:30 UTC. Speicher-Löschen A/B GESTOPPT (Fertig-Marken; bis dahin 6'526 Lieferantenbilder / 1,41 GB gelöscht). GROW-Zähler in der Ampel aus (`dropship/_grow_aktiv.txt`). 32 CJ-Suchaufträge (Saison Halloween/Herbst/Weihnachten/Winter + dünne Kollektionen) in `automation/cj_search_queue.txt`. **Die Zeilen unten zu «Grind PAUSIERT» / «Speicher voll bis 21.10.» sind damit überholt.**
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
- **📣 SOCIAL v2 seit 22.09. (Betreiber: «täglich mehrmals überall», «pure automation … lernen mehrmals täglich», Ads in ~1 Monat wenn alles sauber):** Autopilot postet Bild 6 h / Reel 8 h (IG+FB, ohne Meta-Token über Metricool) / **TikTok 8 h (27.09., vorher 12 h)** / **YouTube Shorts 12 h + Pinterest-Pins 24 h (27.09., vorher 6 h — 0 Klicks in 30 T)** (Metricool; Betreiber 27.09.: «du bist metricool master und sozial master», Kadenz nach Messung selbst entscheiden) / **IG-Karussell 24 h (seit 23.09., `ig_karussell_post.mjs`, Sets aus `tiktok_karussell.py FORMAT=ig`)**; Reel-Motor v2 holt CJ-Videos direkt und legt Reels bis zum Grow-Plan im Repo `social/reels/` ab (Dateispeicher voll); `social_lernen.mjs` schreibt alle 6 h `social/_lernen.json` + `dropship/SOCIAL-LERNEN.md`; Nachschub `queue_new_products.mjs` alle 12 h. ⚠️ ffmpeg hier ohne drawtext → Text nur über `reel/overlay.py`.
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
(TikTok-Ads seit 09/2026 AUS — alle 4 Kampagnen deaktiviert, gemessen 22.09.; **Konnektor «TikTok Ads» am 30.09. vom Betreiber verbunden** (ListConnectors: connected, enabledInChat) — Werkzeuge kommen erst in einer NEUEN Session an; **GEMESSEN 01.10.: angemeldet als TikTok-for-Business-Nutzer «Luxestylech329» (core_user_id 7654698230689793044) — 0 Werbekonten, 0 Business Center; `campaign_get` auf 7646349875793182738 = 40001 «No permission»** → **30.09. 18:35 legte der Betreiber unter diesem Login ein NEUES BC an: «Luxestyle_bc_p5gfcb» 7691398566996197382 (ADMIN) mit Werbekonto «Luxestyle_adv» 7691398659300179974 — Status STATUS_CONTRACT_PENDING, CHF, Guthaben 0, 0 Kampagnen, 0 Pixel, 0 Ausgaben; lesbar über den Konnektor.** Das alte Konto «LuxeStyle CH Ads» 7646349875793182738 (Pixel D8EKVR3C77U6KT5BTBD0, 4 Kampagnen, Historie) liegt weiter im BC 7640770639476817938 eines anderen Logins und ist NICHT erreichbar (Betreiber 01.10.: Konnektor-Login = info@luxestyle.ch, gemessen `user_info` i***o@luxestyle.ch; altes Konto vermutlich unter allengchour@gmail.com — Weg: dort im alten BC info@luxestyle.ch als Mitglied einladen + Werbekonto zuweisen, dann ohne Neuverbindung sichtbar); nur lesen/messen, Budget bleibt Betreiber-Entscheid; Google-Gratis-Listings erster Klick, Pinterest bringt 71 Sitzungen/30 T), Conversion
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
   **Regel für JEDEN Poster:** `postLock()`+`seen()`+`mark()` aus `post_guard.mjs` — EIN Lock (`/tmp/ig_post.lock`), EIN Ledger (`_posted_media.txt`), nie ein eigener Lockfile; erst claimen (`posting`), DANN posten, Ledger SOFORT nach IG-`media_publish` (vor dem langsamen FB-Schritt); Inhalts-Sperre über Video-Basenames (plattformübergreifend); **`igLiveHas()` fragt VOR dem Post die letzten 25 IG-Posts** (Plattform-Wahrheit schlägt jeden Ledger; gilt für Reel- UND Bild-Poster); nie dasselbe Video in zwei Queues (`dedup_queues.mjs`). Meta-Token ~60 Tage; Posts >500 Views nie löschen; Live-Löschen läuft seit 25.09. auf Betreiber-Auftrag über `ig_aufraeumen.mjs` (IG+FB-Zwilling, 5/Tag, nur mit Grund). **`dropship/_SOCIAL_STOPP` (17.09.–22.09.) hat der Betreiber am 22.09. selbst gelöscht → Poster laufen wieder; ein neuer Stopp wird nur vom Betreiber gesetzt oder entfernt.**
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
  **✅ KORRIGIERT 27./29.09.: Cloud-Sessions HABEN einen Browser** — `tools/browser.mjs` (Chromium 141 + globales Playwright, vertraut per SPKI genau den Proxy-CAs; Selbsttest 12/12, luxestyle.ch HTTP 200 in 390 px, nachgemessen 29.09.). Nur Dienste mit Anmeldung (IG, TikTok, Konsolen) bleiben PC-/Handy-Weg. ~~Cloud-Sessions haben KEINEN Browser~~ — für Anmelde-Aufgaben (IG/FB aufräumen, Web-UI-Klicks) den User
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
  anderer; `luxe-premium.wav` nur noch max. 1 von 4 Posts. **Gesperrt: `automation/music/_gesperrt.txt`** (26.09. luxe-lounge-sax, Betreiber «scheisse»). Marken-Video → `reels/luxestyle-brand-*-text.mp4`.

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
  im Profil-HTML) → Betreiber-Klick. Meta-Seiten-Token ohne Ablauf, **Datenzugang endet 05.10.2026 18:50 UTC und wird NICHT erneuert** (Betreiber 27.09.) → Autopilot postet IG/FB dann über Metricool.
- **🗑️ Live-Post-LÖSCHEN (Stand 25.09.):** Betreiber «lösche die post die nicht passen automatisch» → `automation/ig_aufraeumen.mjs`
  (Aufseher täglich, Gründe TEXT/PRODUKT/DOPPEL, FB-Zwilling, >500 Aufrufe nie, 5/Tag; Journal Nachtrag 90). Die alte Zeile «geht NICHT» ist überholt.

## 🤖 Voll-Autonomie-Stack LIVE (2026-07-28 «mache alles auto die webseite»)
- **Stündliche Routine** `trig_01Uy3zVefXbzCZn9Dr2qvkwh` feuert automatisch in DIESE Session → startet tote Engines
  neu + committet. User muss Keepalive NICHT mehr manuell pasten. (Nativer Scheduler, Min-Intervall 1h.)
- **Dauerläufer (/tmp, Routine restartet sie):** cj_runner*.sh (Grind), autocommit.sh (merge-basiert, 90s Delay),
  reel_engine_runner.sh (CJ-Video→Reel), social_autopilot.sh (IG+FB 6h-Kadenz), fortura_img_runner.sh
  (Bild 2-5 Backfill → «Images per offer»), website_hygiene_runner.sh (strip_supplier_leaks alle 2h).
- **Auto-Website (Startseite selbst-frisch):** Homepage-Freshness-Reihen (neu-eingetroffen, trends-gadgets,
  elektronik-technik, wohnen-dekoration, blitzversand-schweiz, eu-lager-schnell, parfuem-damen) auf
  **sortOrder=CREATED_DESC** → neue CJ-Importe erscheinen automatisch oben. Bestseller/Premium bleiben BEST_SELLING.
- **Google-Scorecard CH = «Great»** (GEMESSEN Mail 29.09.: Versandkosten/Rückgabefrist/Rückgabekosten «Exceptional», HD-Bilder «Good», Bilder/Angebot «Incomplete», Lieferzeit fehlt ganz; Mail 30.09. = Scorecard DEUTSCHLAND «Good», alle 6 «Incomplete» — DE ist noch Feed-Land, Shop liefert nur CH → Betreiber-Klick: DE aus Feed-Ländern entfernen); einzige Lücke «Images per offer» →
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

- 2026-10-03 · 🎁 **Plan-Tag 3 Rest: «Geschenke bis CHF 30» (Menü, 9 Kanäle) oben 12/24 Partydeko + 11/24 Schmuck → Welt `unter30` in `geschenk_unterwelten.py` (Preisband je Welt 12–30, 8 Warenarten, 10 Kanarienvögel draussen); Bildtausch-Pilot: Tausch 83 % frei vs. Kontrolle 42 % → echter Gewinn ~+40 Pkt., Klasse schon ausgerollt.** Aufzählungs-Punkte Glied für Glied messen; A/B-Ledger beim Ausrollen nie überschreiben → `dropship/GESCHENKE-UNTER-30-2026-10-03.md`
- 2026-10-03 · 🪣 **Verbesserungsrunde: farbe_metafeld + textbild_fix starben nachts «12x gedrosselt» — Bildtausch schrieb über `heilversprechen_wache.gql` (5 Importeure, kein Boden); 15 importierte gql-Helfer ohne `nachlauf` gepatcht + Gehirn-Regel `helfer-ohne-eimer` (16/16).** Etikette gehört in den Helfer, nicht in jeden Aufrufer → `dropship/EIMER-HELFER-2026-10-03.md`
- 2026-10-03 · 🔧 **«fix alles» Google-Blocker (790): Bildtausch gemessen 76 % frei vs. 21 % unberührt → 171 neu (Gemini allein bei leerem Groq, «tausch-g»), Adult 92 + Überlagerung 8 in derselben Runde; «Image too small» = 45 Variantenbilder → `google_variantenbild_gross.py` (fileUpdate, 600 px); «Product page unavailable» 129 alle kaufbar → Anstoss alle 3 T; Tabak-/Marken-Titel korrigiert.** Bildbefund kann ein Variantenbild meinen → `dropship/GOOGLE-BLOCKER-FIX-2026-10-03.md`
- 2026-10-02 · 🧟 **«mach 1 bis 4»: 150× «Produktdetails doppelt» kam täglich zurück — Verursacher = PC-Aufgabe «LuxeMarketing» (`enrich_apparel_descriptions.mjs`, alter Branch CizQ6), erkennt Erledigtes nur an `ls-feed-details`, die Vereinigung entfernte genau das → Kommentar-Markierung im Block, 150 vereint; Gadgets ohne Raucherzubehör (Typ-Regel); `groessenwert_kauderwelsch.py`; Farbfeld aus Titel (nur ganzes deutsches Farbwort, 1'773).** Zombie ohne Container-Spur → Git-Verlauf aller Branches + PC-Skripte → `dropship/FILTER-FEINKATEGORIE-2026-10-02.md`
- 2026-10-02 · 📦 **«ab wann bei iris cj melden»: #1020 als ⛔ «63h ohne Scan» gemeldet, CJ zeigt «Label created, Warehouse processing» seit 30.09. 04:48 — gemessen Übergabe 1–5 T → `versand_stillstand.py`: Info ab 48 h mit «Iris erst ab …», ⛔ «JETZT Iris melden» ab 120 h.** Alarm-Schwelle an der gemessenen Normalzeit → Journal 02.10.
- 2026-10-02 · 🎛️ **«feinkategorie filter verbessern?»: Facette «Farbe» las die Option «Farbe & Grösse» (8 Produkte; Kleider zeigten nur «Gelb»), keine Grösse/Kategorie, 151 Produkttypen → `produkttyp_vereinheitlichen.py` (2'620, Sperre gegen TYPE-Regeln, POD nie) + `farbmuster_filter.py` (19 Grundfarben → shopify.color-pattern, 13'612; nur Kategorien mit Merkmal «Color», sonst kippt die Charge), täglich; Filter-Umstellung = Betreiber-Klick Search & Discovery (keine API).** Facette nach Quelle prüfen, nicht nach Beschriftung → `dropship/FILTER-FEINKATEGORIE-2026-10-02.md`
- 2026-10-02 · 🧭 **«passe webseite alles an»: Hauptmenü «🎁 Geschenke & Weihnachten» an Platz 1 (Weihnachten, Sie/Ihn/Kinder, Hochzeit oben; neu Wimpern, Fahrzeuge & RC, LED-Strips; 183 Links geprüft, Backup `_hauptmenue_backup_2026-10-02.json`); Rotation: Weihnachten ab 01.10. (Lieferzeit 10–20 WT → bis 20.12.), zwei Saison-Reihen nach oben, Geschenk-Welten im Pool; live per WebFetch: Trend → Herbst → Halloween → Weihnachten.** Saisonfenster an der Lieferzeit ausrichten, nicht am Kalender → Journal 02.10.
- 2026-10-02 · 🎁 **Tag 3+4 vorgezogen: Geschenk-Welten zeigten oben 22/24 Schmuck / 22/24 Uhren / 16/24 Babykleider (Zuordnung, nicht Sortierung) → `geschenk_unterwelten.py` (400 je Welt nach Warenart, reihum, täglich); 27 dünne Kategorien → 20 (7 Regeln erweitert, Rest kuratiert/Saison); `google_fein_ki` pausiert 6 h bei leerem Zweitprüfer-Kontingent statt Gemini zu bezahlen.** Nach `collectionUpdate` füllt Shopify asynchron — auf Soll-Menge warten, nicht auf «≥» → Journal 02.10.
- 2026-10-02 · 🚚 **Gratisversand-Entscheid (Betreiber «entscheide du»): Versprechen = CHF 50 überall; Tarif ≥ 45 nach Rabatt bleibt (50 × 0,9, Bündelrabatt); Automatik-Rabatt «ab CHF 49» → «ab CHF 50», Code FREESHIP49 (0×) aus; Wächter OK.** 45 ist Technik, 50 ist das Versprechen — Texte nie auf 45 → Journal 02.10.
- 2026-10-02 · 🐾 **Tierschutz/Biozid: SEO-Lauf zeigte «Anti-Bell Halsband» mit Kontaktstiften im Bild (Text sagte nur «Vibration»); TSchV 76 Abs. 6 verbietet JEDEN Bellstopper (Zweck genügt), Floh-Halsbänder = Biozid mit Zulassungspflicht → Bildprüfung 35 Kandidaten (13 Strom, 4 davon ohne Wirkwort), 35 DRAFT, 4 Regeln + `nicht` je Regel in `tierschutz_geraet.json` (Node = Python 10/10); Nebenfunde Abhör-Tracker (StGB 179sexies) + JBL-Nachahmung gedraftet.** Rechts-Klassen brauchen eine ZWECK-Regel neben der Wirk-Regel → `dropship/TIERSCHUTZ-BIOZID-2026-10-02.md`
- 2026-10-02 · 📈 **Semrush ausgenutzt (~38–40k/50k): 836 Produktarten-Volumen + 40 Kollektions-Zuordnungen (`suchvolumen.fuer_kollektion(titel, handle)`), 12 doppelt geprüfte Sortimentslücken vorne in der CJ-Suchliste, 103 Produkt-SEO-Titel (Gegenprüfer verwarf 38/141; `--aus`, Meta aus geprüftem Titel), 46 Kollektions-SEO (`seo_kollektion_suchbegriff.py`, live), Ratgeber nur echte Fragen; `api_units` = Konto-Differenz → nur nacheinander messen, Filterwert als String.** Nachmessung 08.10., KÜNDIGEN vor 09.10. → `dropship/semrush/README.md`
- 2026-10-02 · 🏷️ **Verbesserungsrunde: nach der Preissenkung 12/18 Reels preis-veraltet, Tages-Reparatur schon gelaufen → `reel_neu_rendern.py` holt Shopify-Produktvideo als Rückfall + Preis-Modus ohne alte Datei, Aufseher-Reparatur alle 3 h solange preis-veraltet wartet; 2 neu gerendert, ready 8, 32 warten auf Server-Quellen.** Nach Massen-Preisänderung sofort Säuberer + MODUS=preis → `dropship/REEL-PREIS-NACH-SENKUNG-2026-10-02.md`
- 2026-10-02 · 💸 **Preise (Betreiber «entscheide selber» → «15 % Reserve»): 24 Codes > 15 % aus (0× benutzt), `preis_verlustschutz` RABATT 0.15, gesperrte Varianten trugen Lockpreise («ab 14.90», 3'405 behoben), `preis_senken.py` senkte 350'008 Varianten / 34'486 Produkte im Median −11 % (0 Fehler; nur Band alter–neuer Boden, min. CHF 14.90), 7 Ratgeber ohne tote Codes, 64 SEO-Titel mit Semrush-Suchbegriff (`seo_suchbegriff_titel.py`).** Codes in Texten mitprüfen → Journal 02.10.
- 2026-10-02 · 📈 **Semrush-Testabo aktiv bis 09.10. (KÜNDIGEN — Erinnerungen 08./09.10. gesetzt): luxestyle.ch 556 Begriffe Top 100, Verkehr ≈ 0; 38 auf Platz 16–30 mit KD 8–25 (ballettschuhe 590/Mt, Platz 29); 478 Suchvolumen zu 350 Kollektionen → `suchvolumen.py`, SEO-Autopilot wählt nach Volumen; ~5'190/50'000 Einheiten.** Daten in `dropship/semrush/` bleiben nach dem Abo → `dropship/semrush/README.md`
- 2026-10-02 · 🤖 **«werbungen wie soro … tools selber»: 2 der letzten 4 Bestellungen über ChatGPT (#1021, #1018, direkt Produktseite), ChatGPT-Sitzungen 2→7→16/Monat; ChatGPT/Copilot lesen Bing, Shopify hat kein IndexNow → `indexnow_melden.py` täglich (≤ 10k, 30-T-Sperre, Schlüssel CDN + Redirect), 1. Lauf 10'000 HTTP 200; verworfen nach Messung: Titel-Optimierer, Warenkorb-Rückholung (1 Abbruch/30 T), Chatbot/Upsell.** Kaufquelle je Bestellung messen → `dropship/WERBE-TOOLS-SELBST-GEBAUT-2026-10-02.md`
- 2026-10-02 · 🧾 **«2021 ist bezahlt»: ich las CJ «UNSHIPPED» als unbezahlt — es heisst «bezahlt, wartet auf Versand» (LX1021 bezahlt 30.09. 23:37) → `bestell_ampel.py` schreibt den CJ-Status deutsch aus + Tracking.** Rohstatus nie ungedeutet melden → Journal 02.10.
- 2026-10-02 · 🔎 **«weiter push überall»: Google 84 → 10 Sitz./Woche; 61/185 Google-Landeseiten (150 T) sind Entwürfe = 57 % der Google-Sitzungen (Dry Bag 82, Rizinus-Set 55), der 301 auf den 10L-Dry-Bag brachte 0 — Google listet nur Kaufbares; CJ-Queue war leer → `google_nachfrage_luecke.py` täglich: tote Google-Seiten mit Nachfrage → generischer CJ-Suchauftrag VORNE (Hausregeln am Titel, Lager-Tags zählen nicht, Marke/eigen/Saison), Erstlauf 8 Aufträge.** Vor dem Draften Ersatz importieren → `dropship/GOOGLE-NACHFRAGE-LUECKE-2026-10-02.md`
- 2026-10-02 · 🇱🇮 **Verbesserungsrunde: Google-Ampel 723 → 2'568 — 1'771 «Missing shipping info … [LI]» = nur Liechtenstein (Shop liefert nur CH, Schweizer Einträge unberührt) → `google_feedback_wache.py` zählt Meldungen ohne «CH» getrennt (Kanarienvögel 4/4); Betreiber optional: LI im Merchant Center als Zielland entfernen.** Land in der Klammer zuerst lesen → `dropship/GOOGLE-LAENDER-2026-10-02.md`
- 2026-10-02 · 🔁 **«mache das besser»: 231/320 Artikel ohne Produktlink → `seo_autopilot.py --auffrischen` (15/Tag, Text unverändert, Blöcke «Passend dazu im Shop» + FAQ/JSON-LD, ersetzbar); Produkte nur, wenn der Titel das von Gemini genannte Produkt-Suchwort trägt (erste Kollektion/längstes Wort gaben live Quarzuhr zur Salzlampe, Baumwolle zu Seide); Groq = 200k Tokens/Tag JE MODELL → Massenlauf auf gpt-oss-20b, Tageslimit = sofortiger Abbruch.** Relevanz vor Menge → `dropship/SEO-AUTOPILOT-BESSER-ALS-SORO-2026-10-02.md`
- 2026-10-02 · ✍️ **«mach besser als soro»: 331 Artikel brachten 90 T ~45 Sitzungen/0 Warenkörbe → `seo_autopilot.py` täglich im Aufseher: CH-Google-Vorschläge je Menü-Kollektion, nur Themen mit ≥ 6 kaufbaren Produkten (Live-Preis), Kannibalisierungs-Schutz, Fakten-Tor (Gemini schreibt, Zweitprüfer prüft, Heilversprechen/Du/ss/Konkurrenz/Preis-Link-Regeln), FAQ-JSON-LD, `--messen`; Kanarienvögel 8/8; erster Artikel live (Hochzeitsgast-Kleider).** Sie-Erkennung nur mitten im Satz → `dropship/SEO-AUTOPILOT-BESSER-ALS-SORO-2026-10-02.md`
- 2026-10-02 · 🔁 **OpenAI-Guthaben leer (429 `insufficient_quota` — kein Drosseln!), DeepSeek 402 → `automation/zweitmodell.py` (`chat_json`: ChatGPT, sonst Groq gpt-oss-120b / qwen3.8-27b-Vision; > 5 Bilder → Raster, Marke `/tmp/openai_leer` 6 h) in cj_variante_bild, gemini_jury, google_bild_tausch, kauderwelsch, google_fein_ki (zweistufig gegen 413); #1021-Kanarienvogel wieder richtig.** Bei 429 den Körper lesen → `dropship/ZWEITMODELL-GROQ-2026-10-02.md`
- 2026-10-02 · 🧭 **«google push und coole fein kategorien»: ~7'100 Google-Kanal-Produkte in groben Zweigen → `google_fein_ki.py` (Gemini + ChatGPT wählen aus den echten Unterpfaden des bisherigen Werts, nur bei Einigkeit; 2 Arbeiter, 4 = ChatGPT-429) im Aufseher; 40 Kinderkleider aa-1 → aa-1-25; neue selbstpflegende Kollektionen per `PRODUCT_CATEGORY_ID_WITH_DESCENDANTS`: Babykleidung 133 · Strampler & Bodys 30 · Baby- & Kinder-Sets 66, im Menü als HTTP-Link (COLLECTION-Typ = `/en/` 404).** Kategorie-Regel macht Kollektionen wartungsfrei → `dropship/GOOGLE-FEIN-KI-2026-10-02.md`
- 2026-10-02 · 👶 **Verbesserungsrunde: Ampel 285 ohne Shopify-Kategorie — Grind legte neue Typen «Baby & Kinder» (96 Kinderkleidung) + «Büro & Home Office» (7) an, die Wache rät nicht; Google: 92× nur «Baby & Toddler», 4× age_group adult → KINDERREGELN auf aa-1-25 + Lehrmodell-Regel (141 gesetzt, 96/96 zurückgelesen) + `kinder_google_pfad.py` (Babyzweig + age_group, 162 Metafelder, Kanarienvögel 8/8), beides stündlich.** Nach dem Einschalten eines Importers zuerst «unbekannte Typen» lesen → `dropship/KATEGORIE-KINDER-2026-10-02.md`
- 2026-10-02 · 🎬 **«grow videos push»: Video-Nachtrag fand bei 375/403 Prüfungen KEIN CJ-Video (93 % Leerlauf, Vorrang = sichtbar statt mit Video), während der Video-Index 1'068 CJ-pids MIT Video kennt (512 aktive Produkte, nie im Nachtrag) und 107 rohe CJ-Videos schon lokal lagen (Server-Downloads der Reels) → `video_lokal_anhaengen.mjs` (ohne CJ-Punkte, READY verfolgt, Bild vorn; Probe 3/3) + `video_prio_index.py` (Vorrang nur mit Video) im Aufseher; Grow-Deckel 1'000.** Erst prüfen, ob das Gesuchte schon da ist, dann teuer suchen → `dropship/GROW-VIDEOS-2026-10-02.md`
- 2026-10-02 · 💾 **«nutze grow speicherplatz»: 56 wartende Reels von GitHub ins Shopify-CDN (`reel_cdn_umzug.py`, Prüfung Grösse/Typ, atomar nur noch-ready-Zeilen, 0 Fehler), Handy-Set mit Bild wieder ACTIVE; TikTok-Queue meldete trotz Grow «Speicher voll» — `fileErrors` einer per fileUpdate ersetzten Datei ist eine HISTORIE (September-Fehler blieben, Datei READY + CDN aktuell) → Inhaltsprüfung in tiktok_cowork_auftrag + tiktok_jetzt; Bild-/Video-Nachtrag läuft im CJ-Vorrangfenster (Punkte leer bis 16:00 UTC).** Fehlerlisten an Objekten sind Geschichte, nicht Zustand → `dropship/GROW-SPEICHER-NUTZEN-2026-10-02.md`

… Einzeilen vom 14.–22.09.2026 (128, zwanzig vom 21.09., dreiundzwanzig vom 22.09.) am 23.09. und zweiunddreissig vom 23.09. am 24./25.09. sowie die ältesten vom 24.09. am 26.09., fünf vom 26.09. und eine vom 27.09. am 29.09. und dreizehn vom 24./25.09. am 28./29.09. sowie sieben vom 27.09. am 29.09. und alle vom 27.09.–01.10. am 02.10. VERBATIM ins Journal verschoben (Abschnitt «📚 Index-Archiv» am
Dateiende — CLAUDE.md muss unter ~70 KB bleiben); alle älteren Abschnitte (rund 380): `GEDAECHTNIS-JOURNAL.md`
(Inhaltsverzeichnis oben). Suche über alles: `python3 tools/gedaechtnis.py "stichwort"`.
