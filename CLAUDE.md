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
**📌 2026-10-28 spätabends (🧾 Google-Schaufenster gemergt, Test an 5 Produkten gelaufen, voller Lauf wartet auf den Besitzer · 🔎 alle Index-Seiten indexiert · 🎁 Gutschein: Aktivierung fehlt · 🧪 Wegwerf-Probe gemessen):**
- **🧾 Merchant-Center-Quote (PR #2786 gemergt, `automation/gmc_schaufenster.mjs`, Doku `dropship/GMC-SCHAUFENSTER-2810.md`):** hält die Varianten auf dem Kanal «Google & YouTube» unter 90 000 (Quote 150 000, GEMESSEN 514 931 Varianten). Regel: «nie» (Sperrtag, keine Kategorie, Prüf-Tags, schwach bewertet, Lizenzname) vor Stufe 1 Fortura vor **Stufe 0 bewährt** (bestellt oder ab 4 Sternen bei 3 Stimmen, importierte CJ-Bewertungen) vor Ausschlussfeld vor Stufe 2 Marge A/B vor Stufe 3 (Budget, Deckel 15 % je Kategorie). Zwei Prüfrunden (6 unabhängige Prüfer, jeder Fund einzeln nachgestellt): kein Blocker; behoben u.a. «Stufe 0 ist in JavaScript falsy» (hätte alle bewährten Produkte doch abgewählt), 7 von 14 verkauften Produkten wären gegangen, Lizenzfiguren, schwach Bewertete, Fake-Shop prüft jetzt den Abfragetext. Tests 159 + 44, Mutationsprobe 54 von 54. **Trockenlauf gegen den echten Shop:** 27 931 Produkte gehen, 514 931 → 83 897 Varianten, 0 der 18 bestellten Produkte im Abwahl-Plan.
- **Test an 5 Produkten 19:26 UTC (LIVE, `ONLY=`):** die App darf den Kanal verlassen und wieder betreten (`zuruecksetzen` an einem Produkt: zurück, ACTIVE); frisch lesen hinkt ~1 Minute hinterher (erste Prüfung «1 Defekt», zweite 514 917 = −14, 0 Defekte); Shop-Seiten HTTP 200. **Vier Produkte sind jetzt vom Kanal** (`minions-hd-…`, `multifunktionaler-manueller-massageroller-…`, `wickelunterlage-aus-baumwolle-…`, `jumpsuit-mit-blazer-kragen-…`), Manifest `dropship/gmc_schaufenster_manifest.jsonl`. **Der volle Lauf (27 931 Produkte) wurde vom Berechtigungssystem der Sitzung blockiert** (Massenänderung an geteilter Ressource) und nicht umgangen: `LIVE=1 PHASE=abwaehlen MAX=alle node automation/gmc_schaufenster.mjs`, Freigabedatei `dropship/GMC-SCHAUFENSTER-FREI.txt` liegt (Besitzer-Chat 28.10. «aber zuerst merchant fix»), Rücknahme `PHASE=zuruecksetzen`. Danach `PHASE=pruefen` (zweimal, mit einer Minute Abstand), Besitzer-Screenshots «Needs attention»/«All products» nach Google-Verarbeitung (Stunden bis Tage). Wiederholung mindestens wöchentlich, besser täglich nach dem Auswahl-Lauf (Plan allein schreibt nichts). Offene Entscheide: Ausschlussfeld bei 4 424 günstigen Marge-A/B-Produkten, Feed-Regel RISIKO (baby/kinder), Polster 6 087 Varianten (Budget ~95 000?), 41 Fortura-Produkte mit `bild-zu-klein` (Bilder ersetzen).
- **🔎 Index (GSC gemessen 28.10. ~18:00 UTC):** alle 10 geprüften Sammlungen «Gesendet und indexiert» (die 8 vom Besitzer beantragten um 17:57 UTC gecrawlt, `damen-kleider-abend` und `geschenke-fuer-kinder` seit 27.10.); der Besitzer meldete «alle indexiert». Die Routine `trig_014Jo16tokZP9MiCTeoH41SS` hat für diese Liste nichts mehr offen.
- **🎁 Geschenkgutschein (Besitzer 28.10. «3 ja»):** `LIVE=1 node dropship/geschenkgutschein-2810/geschenkgutschein.mjs` um 19:12 UTC: `productCreate` meldet `Gift card products can only be created after they have been activated` (Code `GIFT_CARDS_NOT_ACTIVATED`, QUELLE shopify.dev `GiftCardProductSetUserErrorCode`); nichts angelegt. **Besitzer muss Geschenkgutscheine im Shopify-Admin einmal aktivieren** (Weg im Admin nicht belegt, vermutlich Produkte → Geschenkgutscheine). Danach den Befehl wiederholen. Das Variantenlimit war um 19:13 UTC frei (Reset-Messung: am 28.10. um 14:3x noch gesperrt, 19:13 frei).
- **🧪 Wegwerf-Probe (19:13 UTC, `pod-auswahl/README.md` Schritte A–G, Ergebnis `scratchpad/probe/probe-ergebnis.json`):** A Anlegen ok; B Wert ohne Variante steht nur in `optionValues` (`hasVariants:false`), nicht in `values`; C doppelter Wert = `OPTION_VALUE_ALREADY_EXISTS`; D `productVariantsBulkCreate` mit neuem Wert legt den Wert an; E Variante auf leeren Wert → `hasVariants:true`; F2 Löschen eines Werts mit Varianten = `OPTION_VALUE_HAS_VARIANTS`; G Wegwerf-Produkt gelöscht, Rest 0. Übertragung in README und Attrappe, dann Samsung-DRAFT: offen (Aufgabe #58).
- **🔧 Bewertungs-Import:** zwölf bestätigte Codex-Funde im Scratch behoben (9 behoben, 3 bewusst offen; Standard `DRY_RUN` ist jetzt Trockenlauf, live nur mit `DRY_RUN=0`; `cj-reviews.yml` setzt es schon), 12 von 12 Mutanten erkannt; als PR noch nicht aufgebaut (Aufgabe #57, `/tmp/cm/cjrev` gegen `/tmp/cm/cjrev_orig`, 1003 Diffzeilen). Offene Fragen daraus: `uncertain` ins Ledger?, leere Zeichenketten bei der Übersetzung, 503 beim POST.
- **⚠️ Lehren:** (1) `0` ist in JavaScript falsy: eine Stufe 0 braucht `=== null`-Vergleiche (der Test fand es, nicht das Lesen). (2) Ein Fake-Shop, der Felder ohne Blick auf den Abfragetext liefert, lässt kaputte Abfragen grün (5 von 6 Mutationen); er muss nur liefern, was die Abfrage verlangt. (3) `check` (Quality Check) hängt manchmal im Checkout (`git fetch --depth=1` über die 5 Minuten des Jobs), dreimal in Folge, bevor ein Schritt lief: ein PR ohne `.py`/`.json`/Root-`.html`-Änderung kann ohne ihn gemergt werden, JSON-Gültigkeit lokal prüfen. (4) Der Voice-Linter schliesst `dropship/**` aus, seine «cancelled»-Läufe sind kein Befund.

**📌 2026-10-28 abends (🤖 Codex-Mods fertig · 🧾 Merchant-Quote gemessen · 🔋 Autonomie-Audit · 🔐 Push-Protection):**
- **🤖 Codex-Mods (PR dieses Eintrags, `codex-mods/`, `AGENTS.md`, `automation/codex_zweitmeinung*.mjs`):** Plugin `luxe-codex` für die Codex CLI (gebaut gegen 0.165.0): Leitplanken-Hook (Force-Push, `pkill`, `git add -A`, `_SOCIAL_STOPP`, `LIVE=1` ohne Trockenlauf, Geheimnisse), Schreibzähler + Sparmodus, die lesenden Befehle als Skills, Zweitmeinung-Läufer (leerer Sandkasten, `env -i`, Geheimnis-Vorsuche). Workflow mit 105 Agenten: je Komponente bauen, unabhängig prüfen, jeden Fund einzeln gegenprüfen, bestätigte beheben. **Funde bestätigt/behoben:** Leitplanken 23/24, Zähler+Modus 21/21, Befehle 18/18, Zweitmeinung 24/19 (Rest als «offen» im Bericht). **Tests:** hook_io 67, leitplanken 1 071, schreibzaehler 695, modus 151, befehle 703, Läufer 364; Mutationsproben 25/25, 20/20, 30/30, 23/23 erkannt; CI eingehängt (+45 s). **NICHT bestätigt (laut Binärdatei, kein echter Lauf):** Werkzeugnamen und Eingabeform für Shell/Patch, ob Codex `deny` als Sperre behandelt, `${CLAUDE_PLUGIN_ROOT}`-Ersetzung, Einheit von `timeout`; Hooks laufen erst nach Vertrauen des Besitzers (`/hooks`), der Schalter `--dangerously-bypass-hook-trust` wird NICHT benutzt; `LUXE_CODEX_LERNEN=1` zeigt die echten Formen. Anleitung: `codex-mods/README.md`.
- **🔋 Codex-Konto (Besitzer-Screenshots 28.10.):** Tarif **Plus** (Token: aktiv 17.10.–17.11.), Wochenlimit 68 %, 5-Stunden-Limit hebt sich um die in der Meldung genannte Uhrzeit **in UTC** (GEMESSEN: «try again at 5:20 PM» = 17:20 UTC, Mini-Aufruf danach frei; meine «MEZ»-Annahme war falsch). **Modell: `gpt-6.1-sol` mit `medium`** (Katalog: «near-Astra performance at a lower cost»; Credit-Preis QUELLE learn.chatgpt.com 28.10.: Sol 5× günstiger als Astra, Terra 10×, Luna 100×); ein leerer Mini-Aufruf kostet rund 4 800 Tokens Grundaufwand. **Pro (Aufpreis rund 83) ist offen:** Entscheid nach einem Messlauf (Ja, wenn zwei Ziele mehr als die Hälfte des 5-Stunden-Fensters brauchen); Besitzer will Pro kündigen/runterstufen, sobald der Shop autonom läuft (`dropship/AUTONOMIE-AUDIT-2810.md`, folgt).
- **🧾 Merchant-Center-Quote (Besitzer-Screenshot):** «Shopping ads quota limit reached» + «Over capacity for Shopping ads», je 236 000 Artikel (60 %). QUELLE Google Help `support.google.com/merchants/answer/16564100`: **150 000 Artikel je Bereich, ein Artikel = eine Variante**. **GEMESSEN (Bulk, 28.10.):** auf dem Kanal «Google & YouTube» (`gid://shopify/Publication/302872297857`) liegen 54 745 Produkte / **514 931 Varianten**; 20 433 tragen `excluded_destination:["Shopping_ads"]` (wer das Feld schreibt: unbekannt). Werkzeug `automation/gmc_schaufenster.mjs` (Schaufenster ≤ 90 000 Varianten: Fortura/CH-Lager + Marge A/B immer, Rest nach Budget; Trockenlauf: 27 807 Produkte gehen, 514 931 → rund 84 000) ist gebaut und gegengelesen, **LIVE erst nach Prüfung, PR folgt**; Rücknahme per `PHASE=aufnehmen`. Doku `dropship/GMC-SCHAUFENSTER-2810.md`. Google Ads: Besitzer hat noch CHF 58, erst nach dem Fix.
- **🔋 Autonomie-Audit (Workflow, nur lesend, 9 Agenten):** 23 Pflichtkriterien für «läuft autonom»: **6 erfüllt, 14 offen, 3 unbekannt**. Grösste Lücken: kein dauerhafter Betreiber für Bestand/Lieferbarkeit/Preis-Wächter, «grün» heisst nicht «gearbeitet» (12 von 14 grünen Autopilot-Läufen hohl), CJ-Lieferbarkeit nicht flächendeckend, Merchant-Feed-Job 5 von 5 rot (HTTP 401), 718 ausverkaufte Fortura-Produkte ACTIVE. «0 Fehler» ist kein beweisbares Kriterium: stattdessen Schwellen mit Messquelle, z. B. «14 Tage in Folge».
- **🔐 Lehre Push-Protection (28.10.):** Fake-Zugangsdaten in Tests (`shpat_…`, `shpss_…`, `xoxb-…`, `-----BEGIN PRIVATE KEY-----`) **nie als ganze Zeichenkette** in Testdateien: GitHub lehnt den Push als «Push cannot contain secrets» ab (GH013). Sie entstehen zur Laufzeit (`shp${'at_'}…`, `'shp' + 'ss_'`). Vor jedem Commit von Tests: Muster in den hinzugefügten Zeilen suchen; die Freigabe-Links der Sperre nie benutzen, ein Amend VOR dem ersten erfolgreichen Push genügt.

**📌 2026-10-28 nachmittags (💶 «ich brauche mehr Verkäufe»: Diagnose · Halloween ehrlich · Gutschein · Bio-Links · Codex-Funde):**
- **Diagnose (Workflow `verkaufs-diagnose`: 5 lesende Analysten, Synthese, Gegenprüfung; alles GEMESSEN am 28.10. mit ShopifyQL/Search Console/TikTok/Klaviyo/Metricool):** Schweiz 1 309 Sitzungen in 30 Tagen → 11 Käufe (0,84 %); China 496 und USA 382 Sitzungen ohne Kauf (Rauschen); Warenkorb→Kauf 25–29 % (Branchenwert «30 %» ist BEHAUPTUNG). **Bezahlter TikTok-Test: CHF 143.71, 859 Klicks, 0 Käufe; kein Pixel, kein Katalog, Business Center unverifiziert** → keine neue Kampagne vor Pixel. ChatGPT-Verweise: 4 von 11 Käufen, aber 3 davon am 27.10. (n = 4, Spanne 0,5–4,7 %: kein belegter Motor). **Engpass = Besucher mit Kaufabsicht**, nicht Seite oder Kasse. Lieferzeit gemessen (CJ, n = 12): Median 10 Wt, höchstens 12; Equick Median 11; Fortura ungemessen (#1031 ist der erste Messpunkt). Bestellschluss-Daten für Weihnachten NICHT ohne Besitzer-Ja anzeigen. Weggelassen mit Grund: neue bezahlte Kampagne vor Pixel, Kassen-Rückholung ausbauen, WELCOME10 nur nach Anmeldung.
- **Plan A (autonom) Stand:** A1 Halloween ehrlich ERLEDIGT (PR #2783); A5 Fortura-Engine gehärtet ERLEDIGT; offen: A2 Vorher-Zahlen/Testkunden taggen/Klaviyo-Testmails abstellen, A3 Lieferzeit-Lesejob (täglich `logistic/trackInfo`), A4 Schaufenster (Sirène/Aurora/Provence und Sommerartikel aus Position 1–3, nur Produkte mit unverändertem Preis nach vorn), A6 Fasnacht-/Kostüm-Seiten (Auftakt 11.11.), A7 Produktseite mobil (Hypothese), A8 Weihnachts-Kuratierung.
- **Halloween ehrlich (28.10. 13:07 UTC, PR #2783, `dropship/halloween-ehrlich-2810/`):** Fortura-Ware zeigt 2.–3.11., also nach Halloween; Ankündigungsleiste (MAIN-Theme + Startseiten-Entwurf 212645413255), Sammlung `halloween` (Beschreibung, SEO) und fünf Metricool-Beiträge (28.–31.10.) sagen jetzt «Lieferung nach Halloween … Datum auf der Produktseite», kein Datum zugesagt. Sicherungen in `vorher/`.
- **Besitzer-Antworten 28.10.:** Klarna «Kauf auf Rechnung» in der Schweiz **AKTIV** (die USP-Zeile stimmt); **Geschenkgutschein ja** (CHF 25/50/100, digital, `dropship/geschenkgutschein-2810/geschenkgutschein.mjs`, DRAFT, Veröffentlichen und Bedingungen entscheidet der Besitzer; am 28.10. blockiert `VARIANT_THROTTLE_EXCEEDED`, Versuch 19:10 UTC `trig_01UPiUbbP9jxZ5ty6msQCX1N`, das Skript räumt bei Fehlern auf); Merchant-Center-Blöcke B/C **später**; **Bio-Links mit UTM ja** (`dropship/BROWSER-BEFEHL-BIO-LINKS-2810.md`, an PC-Claude zu geben); TikTok-Pixel unbeantwortet.
- **Index (GSC gemessen):** nach Antrag indexiert: silberringe, schul-studentenrucksaecke, wander-outdoor-rucksaecke; die zehn Anträge vom 26.10. und die Liste vom 27.10. sind komplett indexiert (Anträge wirken innerhalb von Stunden, das Kontingent ist der Engpass, ca. 3–5 Anträge). Offen für morgen in dieser Reihenfolge: laptop-business-rucksaecke, herz-schmuck, kinder-lauflernschuhe, rucksaecke, damen-strickjacken-cardigan; Routine `trig_014Jo16tokZP9MiCTeoH41SS` (09:50 CET) trägt es.
- **Codex-Kampagne Runde 2 (6 von 8 Zielen, kein Blocker, 80 bestätigte Funde in `dropship/CODEX-FUNDE-2810.md`, alle OFFEN):** wichtig: Printful-Sync (doppelter Auftrag bei Tag-Fehler, Seitenblättern, stille Überspringung, Druckdatei-Prüfung gibt bei Fehler frei, `printful_reprice` ignoriert Versand), Material (Rückgängig-Plan wird überschrieben, «Seide (Imitat)»→«Seide», Titanstahl-Sperre umgangen mit 9 Live-Einträgen), CJ-Varianten (Preisbasis, unbekannte Kosten, SKU-Doppelvergabe), Fortura-Sperre nur pro Rechner, Google-Feed (nur erste Variante, Handle über 50 Zeichen, GTIN-Prüfziffer, Steuerzeichen stoppen den ganzen Feed). `google-feed` und `cj-reviews` ohne Abschlussbericht (Limit «try again at 5:20 PM»), Wiederholung `trig_01XxPFD9t2XcAxMbo1M7Fp7G` 17:30 UTC.

### Ältere Stand-Blöcke → `dropship/STAND-ARCHIV.md` (vollständig, verbatim; per `grep -n` durchsuchen)
Die Blöcke bis 28.10.2026 (vormittags/mittags) (Merchant-Feed, Sourcing, ChatGPT-Arbeit, SEO-Titel, Pilot 2.0 mit 20 Prüfungen, Bewertungen, Versand-Schwelle, Spiele/Webseite-Handschrift, Social-Maschine …) stehen im Archiv. Überschriften:

- 2026-10-28 (🎒 Rucksäcke LIVE: 60 Kategorien/Chips · 🛍️ Schmuck LIVE: 82 Kategorien · 🖨️ «Selbst gestalten»-Werkzeug gebaut · 🛒 #1030/#1031 · 🧾 Merchant Center · 🤖 Zweitmeinung Codex)
- 2026-10-27 nachts (🎨 Startseite im Entwurf-Theme neu · 🧪 Material nachgetragen: 4 538 Produkte · 📋 Merchant-Center-Bericht «Good»)
- 2026-10-27 spätabends (🔧 SKU-Nachziehen für Stecker-Produkte — PR #2763 · 🔎 10 Index-Anträge gestellt · 🚚 Babyphone gesperrt)
- 2026-10-27 abends (🚚 Falsche Lieferzeit auf 1 312 Fortura-Produkten korrigiert · 🛒 Bestellung #1029 bei CJ angelegt · ✅ Routinen-Kontrolle · 📣 14 Weihnachts-Beiträge geplant)
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
