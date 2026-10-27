# CLAUDE.md — Projekt-Gedächtnis

> LuxeStyle Assist 2.4 (19.10.2026): Aktuelle Inhabervorgaben und `dropship/assistant/README.md` zuerst beachten. Zehn lokale Werkzeuge, 170 bestandene Regressionen, Selbsttest und echter isolierter Claude-Code-CLI-Pilot; keine Modellanfrage. Übergaben pinnen optional bis zu sechs Originalquellen und prüfen sie beim Wiederaufnehmen erneut. Feste Profile vergleichen bekannte Inputbytes vor/nach Tests; geänderte oder unlesbare Belege und neue unbekannte Pfade bleiben unbekannt. Kein eingefrorener Snapshot und kein Test eines automatisch ausgecheckten Ziel-Commits. Das aktuelle datierte Content-/Verkaufspaket liegt unter `dropship/owner-review-20261019/FREIGABEPAKET.md`: 18-Sekunden-Master weiterhin nur Storyboard, kein neuer Social-Write. Lokale Bereitschaft ist keine Live-Konto-, Rechte- oder Publikationsfreigabe; aktuelle Chat-Vorgaben gehen vor.

> 🔗 **ZUERST `SHARED-MEMORY.md` (Repo-Root) lesen** — mehrere Sessions arbeiten parallel auf diesem
> Repo + Shop; dort steht, wer was „besitzt" + der Live-Stand. CJ-Import/Katalog/Social = NUR diese Session.

Dieses Repo ist `aban-news-landing`, enthält aber mehrere Projekte.

> 🎮 **Spiele-Sessions** (neon-*/lebenspfad/wort-*): ZUERST `spiele-dev/RUNBOOK-SPIELE.md` lesen —
> fertige Skill-Bibliothek (Smoke/Screenshot/Vision-Loop, Meshy/HDRI/Musik-Rezepte, alle Fallen). Das aktive, autonome
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

## Kernfakten (Details im Runbook)
- **🔀 MERGE-REGEL (FEST, User 2026-10-01): PRs IMMER ohne Nachfrage nach `main` mergen**, sobald CI grün (bzw. nur
  vorbestehend rot) ist — Draft per `update_pull_request draft:false` freigeben, dann `merge_pull_request`. Nicht fragen.
- **🟥 „VORBESTEHEND ROT" IST KONKRET: drei Checks melden IMMER `failure`, und das ist kein Fehler.**
  `Workers Builds: aban-news-landing` · `Workers Builds: aban-a` · `Workers Builds: ki-verzeichnis`.
  Der Cloudflare-Bot schreibt im PR-Kommentar selbst **„⚠️ Deployment skipped"** — GitHub zeigt das als
  roten Check. Belegt am 17.10. an **7 Commits in 3 PRs** (#2658–#2660), jedes Mal gleich, jedes Mal in
  derselben Sekunde, in der der Check startet. Für `aban-a` und `ki-verzeichnis` gibt es im Repo gar kein
  Worker-Verzeichnis. **Nicht jagen, nicht neu starten, nicht als Blocker behandeln.** Die echten Checks
  sind `check`, `Brand-Voice check on changed .md files` und `Deploy to Cloudflare Pages`;
  `Pre-deploy validation` endet regelmässig als `cancelled`.
  **🔧 SEIT 18.10. GIBT ES DEN SCHALTER DAZU (vorher hiess es nur „nicht jagen"):** Ursache gemessen —
  im Repo existiert für keinen der drei Namen eine `wrangler.toml` (nur `workers/*`: aban-inserate-brain,
  aban-site-brain, ki-werkzeug-ai, shop-brain, pinterest-cron), und die Hauptseite geht als Cloudflare
  **Pages** über `cf-deploy-mainsite.yml` raus. Die drei Bau-Auslöser hängen also im Cloudflare-Konto und
  können nie etwas bauen. Abstellen: Actions → **„Workers Builds aufräumen"** (`cf-builds-abschalten.yml`)
  → erst `pruefen`, dann `abschalten`. Löscht den **Bau-Auslöser** (`DELETE /builds/triggers/{uuid}`), nicht
  die Repo-Verbindung — eine Verbindung kann mehrere Worker tragen. Vorgabe ist Trockenlauf; ein Auslöser auf
  einem fremden Repo wird nie angefasst (`automation/lib/cf_builds.mjs`, 20 Tests). **Das Token braucht das
  Recht „Workers CI Write"** — fehlt es, meldet der Lauf das und ändert nichts. Alternativ von Hand:
  Cloudflare → Workers & Pages → Worker → Settings → Builds → Disconnect.
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
- **🤖 Modellwahl (FEST, User 2026-10-25: „ändere model haiku selber für einfache aufgaben, automatisch"):** Das
  Hauptmodell einer Sitzung stellt nur der User per `/model` um. Dafür **einfache, mechanische Teilaufgaben
  automatisch an Subagenten mit `model: "haiku"` geben** (Agent-Tool; in `Workflow` per `agent(..., {model:'haiku'})`):
  zählen, Seiten/Links/Bilder abklopfen (HEAD, Status), Listen umformatieren, Dateien suchen, Messläufe nur lesend
  auswerten. **Beim Hauptmodell bleiben:** jedes Urteil (Bildqualität, Rechtliches, Lieferbarkeit), Code mit
  Geldwirkung, Shop-/Theme-Schreibzugriffe, Reviews. Ein Haiku-Befund ist eine **Behauptung** — Zahlen, die in eine
  Entscheidung gehen, am Rohergebnis stichprobenartig gegenprüfen (Messgerät zuerst prüfen).

## Stand
**📌 2026-10-27 spätabends (🔧 SKU-Nachziehen für Stecker-Produkte — PR #2763 · 🔎 10 Index-Anträge gestellt):**
- **🔧 Folge von #1029:** `automation/cj_varianten_nachziehen.mjs` hat den Zweig `SKU_NACHZIEHEN`: bleibt nach dem Stecker-Filter genau EINE von mehreren CJ-Varianten, wird die mehrdeutige SKU `CJ-<pid>` durch deren Variantennummer ersetzt (NUR die SKU, `productVariantsBulkUpdate`). Regeln (`lib/sku_nachziehen.mjs`, rein): Euro-Stecker ausdrücklich im Schlüssel; verworfene Varianten unterscheiden sich NUR im Stecker (`steckerBasis`); Einkaufspreis ≤ +5 % über dem billigsten; Nummer in der Form der Bestell-Engine (Zeichensatz `[A-Za-z0-9._ -]{6,80}`); Frachtlinie CN→CH für die bleibende Variante; Ziel-SKU nicht schon bei einem anderen Produkt (nackt/«CJ-», Schreibweise egal). Unklar → `zurückgestellt: SKU mehrdeutig: …` (7 Tage, Zähler `SKU_MEHRDEUTIG`), nie raten. Eigener Ledger-Ausgang **`SKU_GESETZT`** (14 Tage, Zeile `SKU alt → neu`, zählt NICHT als GESCHRIEBEN). Deckel `MAX_SKU_SCHREIBEN` je 20 h, frisch aus dem Ledger gezählt (Vorgabe 25, im Nacht-Workflow **5**; erst nach sauberen Nächten anheben). Zwei Prüfrunden mit je 3 unabhängigen Prüfern, 153 Mutanten, alle Auflagen umgesetzt; Tests: lib 118, stecker 20, sku 23, lauf 71.
- **Gemessen, nicht geschätzt:** im ganzen Ledger «nur 1 Variante» sind nur **2** Produkte betroffen (nicht ~200): `baby-und-senioren-uberwachungskamera-vb610-179456` (27.10. 18:24 UTC live gesetzt, `CJ-1528980514412179456` → `CJZN148912002BY`, einzige echte Schreibprobe, gegengelesen: Preis 55.90, Kosten 44.9, 1 Variante, ACTIVE; Ledger-Zeile liegt NICHT im Repo, Einmal-Lauf mit `LEDGER=/tmp/…`) und das 800-W-Ladegerät (SKU war schon `CJSJ244325301AZ`). Die Heizdecke trägt von Hand `CJ-CJYD301744802BY` (der Abgleich-Prüfer meldet dafür SKU_NICHT_BEI_CJ; die nackte Form wäre sauberer — offen).
- **Offene Funde der Prüfer (nicht Teil des PR):** (1) `digitales-babyphone-mit-4-3-zoll-display-384640` ist ACTIVE (CHF 68.90), CJ meldet für alle 4 Varianten **0 Frachtlinien CN→CH** (Gewicht 12.4 kg verdächtig) → Lieferbarkeits-Wächter/Besitzer. (2) `stecker_cj.mjs` erkennt einen Stecker MITTEN im Schlüssel nicht («Lotus Pink-EU-28mm»/«-US-28mm»): `automatische-lockenstange-600000` (6 Varianten bleiben, US/UK würden im Auswahl-Bau Auswahlwerte). (3) Fail-sicher `unklar` bleiben: `haarstyling-kamm-fur-glatte-haare-943232` (+16 %), `kaltluft-haarglatter-276096` (+22 %), `soyamilch-maschine-611200`, `faszien-massagegerat-219264`; Besitzerentscheid, ob ein Aufpreis der EU-Variante genügt. (4) `bluetooth-gamepad-612300`: Stamm-SKU `CJ-CJYX2431628` statt Variante bei genau einer CJ-Variante, vom Werkzeug nicht erfasst.
- **Weiter offen (Details im Archiv, Block «nachmittags»):** Tanja Keller zahlt Rechnung D3 CHF 296.80 bis Di 3.11. (Eingang; bei Überweisung #D3 von Hand als bezahlt markieren, Erinnerung `trig_019eQJcEAbBfD76uHCHmc7nd` 3.11. 08:00 UTC; gedruckt erst nach Zahlung UND schriftlicher Freigabe der letzten Vorschau). Bestellung #1029: `LX1029`/`SD2610271545420653500` ist bezahlt (Status UNSHIPPED), Tracking (CJPacket) in Shopify eintragen, sobald CJ versendet (Erinnerung `trig_01VFBJPbXKnER983LeLJ8E38`, 28.10. 11:47 UTC); die leere CJ-App-Hülle `DP2610271501340648100` NICHT bezahlen.
- **🎨 Theme live:** Besitzer hat am 27.10. 18:38 UTC das Theme `212591444359` («Horizon · LuxeStyle Premium (Entwurf 27.10. Men…)») veröffentlicht (Startseite und `damen-kleider` danach 200, ohne Liquid-Fehler); vorher live war `212498841991` («Entwurf 25.10. b», jetzt unveröffentlicht, Rückfall möglich). **KI-Schlüssel:** Besitzer hat Gemini-Guthaben nachgeladen und `GROQ_API_KEY4` gesetzt; Code und Workflow lesen jetzt bis zu vier Groq-Schlüssel (PR #2764). Der Probeaufruf des nächsten Nachtlaufs zeigt `gemini=ja groq4=ja`. **Meta-Anzeigenkonto:** «LuxeStyle CH», ID `549770431724` (Besitzer = Kontoinhaber, Screenshot 27.10.); eine Kampagne kann nur der Besitzer anlegen (kein Meta-Werkzeug in der Sitzung).
- **🚚 Babyphone gesperrt:** `digitales-babyphone-mit-4-3-zoll-display-384640` stand ACTIVE (CHF 68.90), CJ liefert für alle 4 Varianten keine Versandlinie CN→CH → mit `lieferbarkeit_guard.mjs` (LIVE, HANDLES=…) auf DRAFT + Tag `cj-nicht-versendbar-ch` gesetzt. **🔌 Stecker mitten im Schlüssel** (`lib/stecker_cj.mjs`, `mitteStecker`): «Lotus Pink-EU-28mm»/«-US-28mm»/«-UK-28mm» wird nur erkannt, wenn die Struktur es belegt (gleiche Segmentzahl, ein Land-Segment mit ≥ 2 Ländern, je Land derselbe Satz übriger Segmente); Schuh-/Kleidergrössen («Black-US-8»/«Black-EU-41») bleiben unberührt. Gegen 2 598 Datenblätter gemessen: genau 1 Unterschied (`luftung-fur-schwei-arbeiten-628600`, 6 von 8 Varianten fremd). **Grind-2.0-Entscheide:** Besitzer will dazu NICHT mehr gefragt werden (27.10.) — Heikelware, Kinderware, Netto-Mindestmarge selbst festlegen und nur das Ergebnis melden.
- **🔎 Index:** Besitzer hat am 27.10. alle 10 Links der Liste beantragt (`geschenke-fuer-kinder` + `damen-blusen-hemden`, `damen-blusen`, `damen-kleider-abend`, `damen-ballerinas`, `herren-businessschuhe`, `herren-aktentaschen`, `herren-freizeitschuhe`, `herren-hosen-cargo`, `damen-geldboersen`). Nächste: `herren-geldboersen`, `kinder-lauflernschuhe`, `damen-strickjacken-cardigan`.

**📌 2026-10-27 abends (🚚 Falsche Lieferzeit auf 1 312 Fortura-Produkten korrigiert · 🛒 Bestellung #1029 bei CJ angelegt, wartet auf Zahlung · ✅ Routinen-Kontrolle · 📣 14 Weihnachts-Beiträge geplant):**
- **🛒 Bestellung #1029 (Konstantin Stürz, Basel, «Heizbare Kuscheldecke mit Ärmeln und Kapuze» `…-606000`, bezahlt CHF 81.81 nach WELCOME10):** Die CJ-App legte nur eine leere Hülle an (`DP2610271501340648100`, ohne Variante — **nicht bezahlen**). Die Bestell-Engine (`cj_order_engine.py`, nur auf Branch `claude/luxestyle-status-tztnn1`) stoppte zu Recht: bei CJ hat das Produkt 4 Varianten (US 110 V / **EU 230 V** / UK / AU, gleiche Farbe), im Shop nur «Default Title» mit der `CJ-<pid>`-SKU. Besitzer 27.10.: «eu version» → von Hand **`LX1029` = `SD2610271545420653500`** angelegt (Wegwerf-Kopie der Engine mit fester Zuordnung auf die EU-Variante `CJYD301744802BY`, vid `2607290840401607200`; CJPacket EQ Sensitive 6–10 Tage; Ware $33.78 + Fracht $41.61 = **$75.39**, Marge ≈ CHF 19.34 vor Gebühr). Bei CJ gegengelesen: genau 1 Auftrag, Adresse und Variante stimmen, Status CREATED; Shopify-Bestellnotiz gesetzt; Erinnerung `trig_01VFBJPbXKnER983LeLJ8E38` (28.10. 11:47 UTC). **Offen beim Besitzer: nur `SD2610271545420653500` in der CJ-Konsole bezahlen** (CJs `payBalance` nimmt diese IDs nicht), danach Tracking in Shopify eintragen (Anbieter CJPacket, erst dann geht die Versandmail). Der erste Versuch, den Auftrag anzulegen, wurde vom Auto-Modus-Prüfer abgelehnt und erst nach der ausdrücklichen Freigabe des Besitzers wiederholt. **Der Artikel ist weiter ohne Auswahl, ohne Spannungs-/Steckerangabe und trägt das Bild «100% ETL CERTIFIED»** (US-Zeichen, nicht für CH): Vorschlag «230 V (EU-Version)» in den Text, Bild raus, `node automation/cj_varianten_nachziehen.mjs <handle>` (Trockenlauf) — noch nicht entschieden. **Lehre:** CJ-Produkte mit `CJ-<pid>`-SKU und Stecker-Varianten bleiben in der Engine hängen; nie raten, welche Variante gemeint ist.
- **🚚 Lieferzeit-Satz (PR #2761, `automation/lieferzeit_fortura.mjs`, LIVE 27.10. ab 15:16 UTC):** 734 aktive Fortura-Artikel (Tag `ch-lager`, OHNE `profil-ch-lager`) sagten «Lieferung in nur 1–2 Werktagen (DPD)», 13 weitere «meist in 2–3 Werktagen bei dir»; dieselbe Seite zeigt beim Kaufen-Knopf «Lieferung voraussichtlich 11.–25. Nov.» (10–20 Werktage), der Satz steht im JSON-LD (der Block selbst ist auf der Seite ausgeblendet). Ersetzt durch «Versand ab Schweizer Lager mit DPD – der voraussichtliche Lieferzeitraum steht beim Artikel und in der Kasse» (keine Zahl): **747 aktive + 565 Entwürfe mit `ch-lager` = 1 312 Texte**, Ledger `dropship/lieferzeit_fortura_ledger.tsv` (Spalte alt A/P). Danach gemessen: aktive Produkte mit «Werktagen (DPD)» 734 → **0**; neuer Satz in genau 747 aktiven + 565 Entwürfen und in 0 Profil-Artikeln (1 624 unberührt); Trockenlauf «747 sauber». Ablauf: Trockenlauf → 3 unabhängige Prüfer (Wahrheit/Code/Automaten, alle «ok mit Auflagen», kein Blocker; umgesetzt: Rücklesen exakt gegen den Plan, fester Ledger-Pfad, Abbruch nach 10 Fehlern, Exitcode, breitere Kurz-Zusage-Erkennung, «Lieferzeitraum» statt «Lieferdatum») → Probe mit 3 → voll (744, 0 Fehler) → Entwürfe (565, 0 Fehler). 42 Tests, 8 von 10 Mutanten rot (2 gleichwertig).
- **⚠️ GRENZE (nicht als «erledigt» melden):** behoben ist der PRODUKTTEXT. Akkordeon in `templates/product.json`, FAQ-Assistent, Versand-Seiten und Kollektion `blitzversand-schweiz` sagen weiter «ab Schweizer Lager meist 2–3 Werktage» neben dem 10–20-Werktage-Datum (mit «meist/Richtwerte» abgesichert). Heilung = Profil Stufe 3 (`ch_lager_profil.py`, Entscheid der anderen Sitzung, Branch `claude/luxestyle-status-tztnn1`, nicht in main). Die Kasse wurde heute NICHT selbst gemessen (die andere Sitzung am 13.10.). 97 der 747 sind ausverkauft und zeigen trotzdem «Bestelle jetzt – Lieferung voraussichtlich» (Theme). «mit DPD» steht nicht in der Versandrichtlinie (sie nennt Post und DHL). 3 639 Entwürfe ohne `ch-lager` (3 322 `alt-einzelgroesse-ersetzt`, übrige `duplikat-auto-draft`) tragen den alten Satz weiter, nur latent. `delivery_block.mjs` nie mit `dry_run=false` starten. **Nach neuen Fortura-Importen oder einem Stufenwechsel wieder Trockenlauf** (Hinweis steht in `SHARED-MEMORY.md`).
- **✅ Routinen-Kontrolle 14:30:** Bestseller Refresh (Lauf 11:42 UTC) und Shop Autopilot (12:39 UTC) laufen wieder; Logs gelesen, kein «Unexpected token»; Bestseller-Sammlung 10/10 ACTIVE; Autopilot 250 geprüft, 20 SEO-Titel gesetzt, 0 FAILED-Bilder, Text «Gratis-Versand ab CHF 50», «CHF 65» 0 Treffer.
- **📣 Social:** 14 IG+FB-Beiträge (Wichtel-/Weihnachtsvorlauf) für 2.–15.11. in Metricool geplant und per `getScheduledPosts` gegengelesen (Texte «Ab Schweizer Lager · Lieferdatum beim Artikel» bzw. «Lieferung 10–20 Werktage · Für Weihnachten bis Mitte November bestellen»). Pinterest ausgelassen (Board-Name nicht auflösbar, numerische boardId fehlt). **Nächste Charge 16.–30.11. um den 12.11. mit frischen Daten planen.**
- **🔎 Index:** `/collections/geschenke-fuer-kinder` steht auf «Gecrawlt – zurzeit nicht indexiert» (Abruf 10.09., Text seit 26.10. neu): in der Search Console neu beantragen (`dropship/INDEX-LISTE-2710.md`, Abschnitt 3).

### Ältere Stand-Blöcke → `dropship/STAND-ARCHIV.md` (vollständig, verbatim; per `grep -n` durchsuchen)
Die Blöcke bis 27.10.2026 (nachmittags) (Merchant-Feed, Sourcing, ChatGPT-Arbeit, SEO-Titel, Pilot 2.0 mit 20 Prüfungen, Bewertungen, Versand-Schwelle, Spiele/Webseite-Handschrift, Social-Maschine …) stehen im Archiv. Überschriften:

- 2026-10-27 nachmittags (🧥 Tanja zahlt Variante A: Rechnung + QR gesendet · 🚀 Grind 2.0 gemergt, inert · 🔎 Index-Liste · 🔧 Optionsreparatur)
- 2026-10-27 vormittags (💸 Mengenrabatt LIVE · 🔴 KI-Ausfall im Nachtlauf gefunden und abgesichert · 🗂️ Taxonomie aller Nicht-Mode-Bereiche gebaut, nichts live)
- 2026-10-26 abends (🧥 Hoodie-Vorschau mit Gemini · ✅ Abgleich Shop↔CJ an allen 1 584 geschriebenen Produkten · 🔎 Search-Console-Mails · Preis- und Stecker-Fund behoben)
- 2026-10-26 vormittags (👗👟👜 Mode-Taxonomie in allen vier Bereichen live · Menüs · Filter-Felder · 206 Banner · 903 Texte · Westen verengt · Tag-Kollation — PR #2737)
- 2026-10-26 nachts (🎛️ Auswahl-Dauerlauf für alle CJ-Produkte · Optionswerte repariert · Tassen · Text-Pipeline · CLAUDE.md von 255 KB auf 24 KB)
- 2026-10-25/26 (🗂️ Kategorien nach Google-Kategorie neu geordnet · Auswahl · Stecker · Fakten-Block · Bewertungen zuerst — PR #2737)
- 2026-10-24 abends, später (🔎 Firecrawl auf Wunsch „max“: billigerer Einkauf für die Widmann-Artikel — Weg gefunden, Preise unbekannt)
- 2026-10-24 abends (💶 Auf Wunsch des Besitzers: 9 Widmann-Artikel über 2× ohne Verlust gesenkt)
- 2026-10-24 spätnachmittags (🔥 Firecrawl: Widmann gegen Galaxus gemessen — 60 % teurer, Median 1.29)
- 2026-10-24 mittags (🤖 ChatGPTs drei offene Entwürfe abgearbeitet — zwei stille Blocker, eine Zahl aufgeklärt)
- 2026-10-24 vormittags (🚚 „Sourcing Succeeded" heisst NICHT lieferbar — 3 von 4 neuen Treffern fallen durch)
- 2026-10-24 (🔎 Google: die Seite nannte Google 2662 Adressen, die es so nicht gibt — PR #2721)
- 2026-10-24 früh (🛒 Fortura im Merchant-Feed · 29 Lizenz-Artikel abgefangen · „70 % ausgeschlossen" aufgeklärt)
- 2026-10-24 nachts, später (✅ Erste CJ-Sourcing-Antwort: lieferbar, rentabel, live — 16 bleiben offen)
- 2026-10-24 nachts (🛒 CJ Prime ausgemessen: eine von drei Leistungen ist über die API erreichbar)
- 2026-10-23 nachts (🚚 Elf von elf Erstattungen hatten denselben Grund — jetzt gibt es einen Wächter dafür)
- 2026-10-23 nachts (🤖 ChatGPTs Arbeit nachgeprüft — ein echter Blocker behoben, eine Versand-Regel gekippt)
- 2026-10-23 abends (🛍️ Interne Querverweise: Fläche vermessen, zu breites Ziel-Muster abgefangen)
- 2026-10-23 (✅ SEO-Titel FERTIG — 56 668 aktive Produkte, 0 offen; dazu zwei Bremsen gelöst)
- 2026-10-21 (🔒 Pilot 2.0: Folge-PR R20 (PR #2707) zur 20. Prüfung — kein Blocker, 1 wichtig + 8 klein, dazu 2 Kampagnenfunde (1 behoben, 1 dokumentiert), bleibt GESPERRT)
- 2026-10-21 nachts (🔒 Pilot 2.0: Folge-PR R17 + R18 + R19 (PR #2706) — 17. Prüfung (kein Blocker, 4 wichtig + 5 klein), 18. Prüfung (kein B
- 2026-10-20 (🔒 Pilot 2.0: Folge-PR zur 15. Runde — 16. Prüfung (1 Blocker + 6 wichtig + 8 klein) und 17 eigene Funde (E28–E44; E43/E44 sind Fuzzer-Artefakte) behoben, bleibt GESPERRT)
- 2026-10-19 abends (🔒 Pilot 2.0: Folge-PR zur 14. Runde — 15. Prüfung (1 Blocker + 1 wichtig + 1 Testnetz-Lücke + 4 klein) und 20 eigene Funde (E8–E27) behoben, bleibt GESPERRT)
- 2026-10-19 (🔒 Pilot 2.0: 14. Prüfung — 1 Blocker unter einer Bedingung + 3 wichtig + 6 klein + 7 eigene Funde (E1–E7) behoben, bleibt GESPERRT)
- 2026-10-18 (⚡ Futures: Risiko-Stufe 1,75× wählbar — User: «funktioniert der Bot schon mit Trading?» → «mach future trading, zu wenig Rendite»)
- 2026-10-18 (🔒 Pilot 2.0: 13. Prüfung — 3 Blocker + 3 wichtig + 3 klein + 5 eigene Funde behoben, bleibt GESPERRT)
- 2026-10-18 abends (🧹 Aufräum-Runde: 80 Kategorieseiten lieferten 404, drei Werkzeuge waren blind)
- 2026-10-18 (📋 Aufgabenliste für die nächste Sitzung — alles heute live gemessen)
- 2026-10-18 (⭐ 775 echte Bewertungen live — zwei Importer-Fehler derselben Klasse gefunden)
- 2026-10-17 spätnachts (👁️ Bewertungen sind da, aber 55 gut bewertete Produkte sind DRAFT)
- 2026-10-17 spätabends (⭐ Bewertungs-Import: er HAT Bewertungen live gestellt und „0" gemeldet)
- 2026-10-17 abends (🛒 Google Merchant: Feed war schwach, zwei Fehler im Sperrmuster, Lücke vermessen)
- 2026-10-17 (🔑 60 Skripte liefen ins Leere + Rizinusöl-Themenbereich gebaut)
- 2026-10-04 (🔍 Shop-QA-Tag: 4 falsch beschriftete Top-Seiten, 37 % blinder Fleck im Review-Import, ein selbst verursachter Verlustverkauf)
- 2026-10-14 nachts (💰 «Max Profit 2»: Pilot 2.0 mit Hebel — Empfehlung 1,75×, schlägt den Live-Pilot mit 1,75×)
- 2026-10-14 spätabends (💰 «Max Profit» ehrlich gerechnet — Empfehlung 1,75×, effizienter wäre Pilot 2.0)
- 2026-10-14 spätnachts (🔒 Pilot 2.0: 12. Prüfung — 3 Blocker + 3 wichtig + 4 klein + 4 eigene Funde behoben, bleibt GESPERRT)
- 2026-10-14 nachts (🔒 Pilot 2.0: 11. Prüfung — 1 Blocker + 5 wichtig + 5 klein + 3 aus der Schlussprobe behoben, bleibt GESPERRT)
- 2026-10-14 abends (🔒 Pilot 2.0: 10. Prüfung — 2 Blocker + 4 wichtig + 4 klein behoben, bleibt GESPERRT)
- 2026-10-14 nachmittags (🔒 Pilot 2.0: 9. Prüfung — 2 Blocker + 5 wichtig + 3 klein behoben, bleibt GESPERRT)
- 2026-10-14 (🔒 Pilot 2.0: Funde der 8. Prüfung behoben — bleibt GESPERRT)
- 2026-10-13 abends (👥 Copy-Trading · 🐸 Meme/Top 10/alles · 📰 News-Wächter — alle Protokolle VORAB committet)
- 2026-10-13 (⏱️ Scalping ehrlich getestet → verliert; Pilot 2.0 nach 5 Prüfungen weiter gesperrt)
- 2026-10-12 (🤖 KI-Bot übernommen — Schattenbuch auf GitHub, NUR Spielgeld)
- 2026-10-04 (🚚 Versand-Schwelle: Beinahe-Schaden abgewendet + „Mini-Kühlschrank" war eine Insulin-Kühlbox)
- 2026-10-04 (Review-Grind: Creds entschlüsselt, Resolver + Quota-Falle gefixt)
- 2026-10-01 (🏥 Alle Krankenkassen vergleichen 2027 — `krankenkassen-vergleich-2027.html`)
- 2026-10-01 (🏥 Krankenkassen-Wechsel-Paket CHF 12 — saisonal: Frist 30.11.)
- 2026-10-01 (🧠 Gehirn-Idee → „Pensions-Check Schweiz" CHF 14 + Gratis-Seite `rentenluecke-rechner.html`)
- 2026-10-01 (📦 Umzugs-Paket Schweiz CHF 12 + Gratis-Seite `wohnung-kuendigen-schweiz.html`)
- 2026-10-01 (🧭 Meisterwerk-Produkt „Finanz-Kompass Schweiz" CHF 24 (seit 01.10. abends, vorher 29), einzeln CHF 52)
- 2026-10-01 (🔑 Etsy: Platzhalter-Schlüssel gefunden)
- 2026-10-01 (💰 Preise gesenkt + Stripe-Preisfalle behoben)
- 2026-09-30 (🛒 Produkte 4+5 nach SUCHNACHFRAGE + 🤖 Etsy-Upload automatisch)
- 2026-09-25 (🛒 3. Produkt „Budget-Plan Schweiz" CHF 19)
- 2026-09-25 (🛒 2. Produkt „Schulden-Plan Schweiz" CHF 27 + 🔒 LECK: `content/` war öffentlich)
- 2026-09-25 (📱 LuxeStyle Android-App — native, Google Play bereit)
- 2026-09-24 (🛒 neues Produkt „Strategie-Prüfstand" CHF 29 + Shop-Lecks)
- 2026-09-23 (🔓 LIVE-DEPLOY: echte Ursache gefunden — ein eingecheckter Symlink)
- 2026-09-11 (Produktraster dichter — „Bilder kleiner, mehr Produkte sehen")
- 2026-09-07 (🔓 REVIEW-GRIND ENTSPERRT — CJ-Auth-Bug gefunden, „Decke" war falsch)
- 2026-07-05 (🎉 ERSTE VERKÄUFE — Order-Audit live verifiziert)
- 2026-09-07 (Handschrift-Runden: Spiel + Webseite „nicht so KI-generiert" — 8 PRs, alle gemessen)
- 2026-09-02 (Webseite: „Frag aban"-Assistent entfernt — User: „ohne die Chatfenster, alles eleganter")
- 2026-08-30 (🚨 URSACHE GEFUNDEN — das GitHub-Konto ist als SPAM markiert)
- 2026-06-13 (vorheriger Stand — ⚠️ GitHub-Actions-Sperre + Autonom-Spielregeln + ehrliche Daten)
- 2026-06-12 (Marktlücken + Unterkategorien + Menü-Umbau)
- 2026-06-11 (POD-Editor mit echten Fotos + 98 Mockups + Shop-Audit A–Z)
- 2026-06-07 (vorheriger Stand — Memory aufgefrischt + Conversion-Fix)
- 2026-06-06 (ÜBERGABE — ZUERST LESEN: Social-Maschine wird gebaut)
- 2026-06-06 (Conversion-QA-Lauf — vorher)
- 2026-06-05 (vorheriger Stand — Quelle: SrAs5)
- 2026-06-03 (vorheriger Stand)
- 2026-06-02 (vorheriger Stand)
