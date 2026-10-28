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
**📌 2026-10-28 früh (🛍️ Schmuck LIVE: 82 Kategorien · 🎒 Rucksäcke-Plan · 🖨️ «Selbst gestalten»-Werkzeug gebaut · 🛒 #1030/#1031 · 🧾 Merchant Center · 🤖 Zweitmeinung Codex):**
- **🛍️ Schmuck LIVE (28.10. 00:00–00:30 UTC; Werkzeuge PR #2772, Ledger + Menü-Sicherung PR #2774):** `SCHMUCK=1 PREFIX=s-`: 82 Tags (**4 844 Zuweisungen, 0 Fehler**), 82 Sammlungen + 6 Gruppen-Sammlungen (Mitglieder = erwartet), Menü-Ast «Schmuck» (10 Köpfe, 56 Kinder; Sicherung `dropship/menu-sicherung/main-menu-vor-schmuck-2710.json`, Nachlesen «gleich», 0 Zielabweichungen), 42 Chip-Felder. **Kundensicht gemessen:** 88 von 88 Seiten HTTP 200 mit Produkten (1,4 s Pause je Abruf), Startseite verlinkt das neue Menü, `herz-schmuck` zeigt den Chip «Herz-Ringe». Ablauf und Fallen: Skill `kategorien-nach-google`, Abschnitt Schmuck. **Offen:** Titel-Wahrheit-Runde (39 von 231 Silber-Mitgliedern hängen allein am Titel), Besitzer-Entscheide mit Standard «bleibt»: `premium-schmuck` (manuell, 124, ohne Tag) fehlt auf der Gruppenseite, Sonnenbrillen unter Zubehör, 11 Smart Rings in `sub-ringe`, `sub-halsketten` fällt aus dem Menü (bleibt per Link erreichbar). Uhren bewusst ausgenommen.
- **🎒 Rucksäcke (PR #2773, Plan, NICHT live):** `bereiche/rucksaecke.json`: 14 Kategorien + 46 Chips in 3 Gruppen, Universum 2 443 Rucksäcke, 88,0 % in mindestens einer Kategorie, 0 Fremdkörper, zwei Gegenleserunden (Prüfer-Funde an Datei übergeben statt im Prompt, siehe Lehren). Ersetzt die zu engen `rucksaecke-laptop`/`-schule`/`-sport`. Live-Gang: Adapter `lib/bereich_taxonomie.mjs` (aus #2772, `BEREICH_GRUPPEN`/`BEREICH_PRAEFIX`) ist da, Gruppen-/Menü-Skripte analog `schmuck_gruppen/schmuck_menue` fehlen noch. Besitzer-Entscheide: Anti-Diebstahl als 15. Kategorie, Westen, Taillenformen, «Weitere Taschen» umbenennen. **Audit (PR #2769, `automation/unterteilung_audit.mjs`, `dropship/UNTERTEILUNG-AUDIT-2710.md`):** nach Rucksäcken ist **Kostüme (~1 500, ohne Plan)** die grösste Lücke.
- **🛒 Bestellungen:** **#1030** (CJ `SD2610272119180645400`, 25.70 USD) vom Besitzer bezahlt, UNSHIPPED 22:04 UTC; Tracking (CJPacket) in Shopify eintragen, sobald versendet (Erinnerung `trig_01Uzvyod5ZygumMj9LRNVKu6`, 28.10. 12:21 UTC). **#1031** (Kostüm Arabischer Scheich M/L, Fortura `98904`, Scuol, CHF 43.90): von Hand über die Fortura-Engine ausgelöst, `ORDERS_LX1031.xml` 22:56 UTC in `/home/ORDERS` (gemessen), Ledger-Zeile im Branch `claude/luxestyle-status-tztnn1` (Commit 112b67cf4b, per `create_or_update_file`); Lieferschein frühestens Mi (Fortura Mo-Fr), Erinnerung `trig_01117qGXkoAHy9ZJGWoAG96b` 28.10. 12:30 UTC. **Rezept von hier:** `git archive origin/claude/luxestyle-status-tztnn1 automation dropship/fortura dropship/_fortura_bestellungen.tsv dropship/_fortura_xml_aktiv | tar -x -C /tmp/pod/engine`, `/tmp/fortura_env.sh` (chmod 600) aus `FORTURA_FTP_USER/PW` schreiben, **zuerst ohne Schalterdatei** (Stufe 1 = nur Paket + Ledger, prüft Shopify), dann Schalter dazu und `python3 -B automation/fortura_bestell_engine.py` (Stufe 2 lädt hoch, vorher Liste von `/home/ORDERS`/`DESADV` lesen). Nur ein offener Fortura-Auftrag darf in Shopify stehen (die Engine sendet alle bezahlten offenen).
- **🧾 Merchant Center (Block A erledigt durch Browser-Claude, an Screenshots gegengelesen):** CH-Versand «flat_7.00» + «kostenloser versand» ab CHF 50.00 (Google erlaubt «gratis ab» plus Mindestwert nicht zusammen), LI CHF 14.90, Altregel «flat_15.00 … international» (nur CH) gelöscht; Rückgabe «Standard for Switzerland»/«…Liechtenstein» Verified, 30 Tage, Customer responsibility, `/pages/rueckgabe`. Gratis-Schwelle: Google **50** (Versprechen), Shopify-Checkout **45** (Puffer für Rabattcodes, `dropship/VERSAND-SCHWELLE.md`): nie «korrigieren». Offen am 28.10. (`dropship/BROWSER-BEFEHL-2710.md`): Block B (5 Index-Anträge) und Block C (alte Richtlinie «luxestyle return policy» mit «Free», 0 Produkte). **🎨 Kundenstimmen (PR #2768):** Theme `212656488839` live, je Produkt eine echte Judge.me-Bewertung (`lux.kundenstimmen`, `automation/kundenstimmen_bauen.mjs`).
- **🤖 Zweitmeinung aus anderer Modellfamilie (Besitzer: «nutze es»):** Codex CLI + GPT-6 Astra über ChatGPT-Pro-Login (Device-Code, vom Besitzer bestätigt); der `OPENAI_API_KEY` der Sitzung hat **kein Guthaben** (`credit_balance_exhausted`), das Anmelden damit blockierte die Sicherheitsprüfung als Datenabfluss. Aufruf: `npm install --prefix /tmp/codex-trial @openai/codex` (426 MB, Speicher knapp), `CODEX_HOME=/tmp/codex-trial/home`, `env -i PATH HOME CODEX_HOME codex exec -m gpt-6-astra -s read-only --skip-git-repo-check -C <leerer Ordner mit nur den zu prüfenden Dateien> - < prompt.txt`: Repo, Umgebungsvariablen und Schlüssel nie in den Sandkasten. **Wochenlimit des Besitzers nur noch 12 %** (Screenshot 27.10.): gezielt für Code mit Geldwirkung (je Review 14 000 bis 35 000 Tokens). Ergebnisse: `sku_nachziehen` 5 Logikfälle + 2 Testlücken, alle gegen den echten Code bestätigt, PR #2771 (137 Tests); POD-Schreibweg 4 Funde (2 deckungsgleich mit Prüfer 1), Preisregel ohne Fund. Ein Fund der Modellfamilie ist eine Behauptung: erst am echten Code nachstellen.
- **🖨️ «Selbst gestalten»: Material mit Preis + Samsung (Werkzeug gebaut, NICHTS live):** Branch `claude/luxestyle-pod-auswahl-2810`, `automation/pod_auswahl.mjs` + `lib/pod_auswahl_*.mjs`, README `dropship/pod-auswahl/README.md`. Plan: 165 neue Varianten (Poster 4+14, Hoodie 8+11, T-Shirt 9+24, iPhone 16+32, Samsung neu als DRAFT 84), Preise CHF Poster 25.90–141.90, Hoodie 57.90–79.90, T-Shirt 24.90–44.90, iPhone 21.90–29.90, Samsung 21.90–30.90 (bestehende Regel Netto ≥ 12 mit Kundenversand, unabhängig nachgerechnet, 0 Abweichungen). **LIVE ist für 4 von 5 Produkten gesperrt, Besitzer-Entscheide:** (a) **«Unisex Hoodie selbst gestalten» ist bei Printful das Sweatshirt Gildan 18000 (145), nicht der Hoodie 18500 (146)**: SKUs auf 5522–5529 (Einkauf +3.46 USD) oder Produkt «Sweatshirt» nennen; (b) Material-Metafeld `mm-google-shopping.material` leeren oder lassen; (c) 14 neue Varianten gibt es schon als eigene Produkte zu anderem Preis (T-Shirt dort Netto 11.70); (d) iPhone-Titel sagt MagSafe, 32 von 48 Varianten ohne; (e) Variantentitel wechseln auf «Material / …». **Bestell-Fix (`printful_sync.mjs`, `lib/printful_platzierung.mjs`):** Hüllen/Tassen/Flaschen gingen mit Seite «front» an Printful (Bug real, ob Bestellungen betroffen: Tag `printful-review` prüfen); Workflow `printful-sync` ist seit 13.06. pausiert; `printful_reprice.mjs` überspringt diese Produkte (`AUCH_AUSWAHL=1` hebt auf, würde 43 der 165 Preise senken). Tests 1 612 grün, Mutationsprobe 130/130; dritte Korrekturrunde (Schreibweg nach Zweitmeinung) lief am 28.10. früh.
- **⚠️ Lehren:** (1) Ein Workflow-Skript, das Befunde per `JSON.stringify(...).slice(0, 12000)` in den Korrektur-Prompt gibt, **schneidet Befunde ab** (drei Workflows verloren die Hälfte): Befunde als DATEI übergeben und die Zahl im Bericht gegenzählen. (2) `pgrep -f "<Skript>"` trifft den eigenen Befehl: ein Monitor lief 15 min «weiter», obwohl der Lauf fertig war; Prozess mit `ps -eo pid,etime,args | grep "[s]kript" | grep -v "bash -c"` prüfen. (3) Ein Worktree kostet 3,3 GB: bei weniger als 1 GB Rest scheitert die Worktree-Anlage der Workflows (nach dem Merge `git worktree remove`). (4) Ein Container-Neustart tötet Hintergrund-Workflows; `Workflow({scriptPath, resumeFromRunId})` setzt fort.

**📌 2026-10-27 nachts (🎨 Startseite im Entwurf-Theme neu · 🧪 Material nachgetragen: 4 538 Produkte · 📋 Merchant-Center-Bericht «Good»):**
- **🎨 Startseite (Entwurf `212645413255`, NICHT live, der Besitzer veröffentlicht):** Hero mit laufender Produktwand (Video aus 20 Katalogbildern, 20 s, nahtlose Schleife, Hochformat-Fassung für Handy/Tablet hochkant), Willkommen-Block, USP-Leiste mit Linien-Icons, «Selbst gestalten: Foto & Print» (6 KI-Beispielbilder, als solche beschriftet; Preis-Chips live aus den Produkten) statt Trend-Block, `scheme-2` neutral `#f0f0ee` (kein Beige), Navigation in eigener Zeile (`menu_row: bottom`, 12 Punkte statt 7 sichtbar), neues Mega-Menü (Spalten mit Überschriften, höchstens 9 Einzel-Links je Spalte, keine Silbentrennung). Link: `https://admin.shopify.com/store/au3j0y-hq/themes/212645413255/editor` · Vorschau `https://luxestyle.ch/?preview_theme_id=212645413255`. Bauanleitung, Skripte und Fallen: `dropship/startseite-2710/README.md`. Unabhängig geprüft (3 Prüfer + Gegenprüfer je Fund), behoben: Menü schnitt Links ab, Hero-Einzug, Handy ohne Fakten, Tablet hochkant, Videogewicht (Shopify kodiert bis 720p, ≈ 4 MB), Wortlaut «Lieferantenlager» statt «Hersteller», «Über 1'500 Artikel ab Schweizer Lager» (gemessen 1 653 lieferbar von 2 371 mit Tag; «2'400» zählte Ausverkauftes). **Bekannt/offen:** «Kauf auf Rechnung» in der USP-Leiste stammt aus dem Live-Bestand, die Rechnungsvariante von Klarna ist in echten Bestellungen nicht belegt; Haustiere-Menü hat zwei fast gleiche Einträge (Live-Menü, nicht angefasst); Sticky-Header ist mit der unteren Menüzeile höher.
- **🧪 Material (Besitzer: «bei selbstgestalten auch material zu auswahl und alle anderen nachtragen» → «Beides»):** `automation/material_nachtragen.mjs` + `lib/material.mjs` (141 Tests, Mutationsprobe) schreibt `mm-google-shopping.material` (feeds Merchant-Attribut UND die Zeile «Material» in «Spezifikationen & Details», Block `lux_spezifikationen`, live geprüft). **Gemessen (56 618 aktive):** 6 609 zeigen Material im Detailblock, 16 092 hatten das Metafeld, 10 die Option; **4 538 jetzt geschrieben** (1 234 aus dem Produkttext «Material: …», 149 aus dem CJ-Datenblatt, 4 von Hand belegt in `dropship/material_belege.json`, **3 151 englische Werte übersetzt**: Plastic, Cotton, Alloy …), 0 Fehler, Stichprobe frisch zurückgelesen. **28 170 bleiben leer: keine belegte Quelle** (CJs Grobfeld `materialNameEn` («Leather» deckt auch PU) wird bewusst NICHT benutzt). Sperren: Teilangaben (Futter/Sohle/Hauptstoff), Uhren und Geräte (Material meint nur ein Teil), Titel nennt anderen Stoff, Kunstleder-Hinweis, «PU» allein, «Titanstahl». Zwei Gegenleser-Runden (149 + 136 Einträge): erste 76 % einwandfrei → Regeln nachgeschärft; zweite 90 % bei Textquellen; Rest sind weiche Funde (Teil-/Marketingbegriffe). Rückgängig: `dropship/material_plan_2710.jsonl.gz` (alt/neu je Produkt). **Echte «Material»-Auswahl** gibt es nur, wo der Lieferant Material als Variante führt (CJ: 3 von 2 593 gepr. Produkten, vom Auswahl-Werkzeug schon abgedeckt, 13 im Shop); bei «Selbst gestalten» gibt es keine Materialvarianten (je Material ein eigenes Druckpartner-Produkt). Ohne Beleg blieben bei «Selbst gestalten»: Notizbuch, Magnet, Kissen. 100 «Leather» ohne Beleg und 99 «Titanstahl» stehen unverändert.
- **📋 Merchant-Center-Bericht Oktober (Screenshot des Besitzers):** «Good» (3 von 5); alle 6 Felder «Incomplete» = fehlende Angaben, nicht schlechte Werte. **Besitzer-Klicks** (kein MC-Zugang von hier): Versand (CH CHF 7, gratis ab 50; LI CHF 14.90; Bearbeitung 1–3 + Transport 9–17 Werktage), Rückgabe (30 Tage, Kunde zahlt Rücksendung, `/pages/rueckgabe`). Bilder gemessen: 98 % der aktiven Produkte haben ≥ 2 Bilder, Hauptbild ≥ 800 px kurze Seite bei 84 % (8 861 darunter, 6 935 davon 600–799 px).
- **🌙 Auswahl-Lauf (Actions, manuell 27.10. 18:52 UTC):** KI-Probe, Shopify-Zugang, Kandidaten ok, läuft im Schritt «Lauf (schreibt LIVE)». PR #2766 (Grind-2.0-Entscheide im Kopf) gemergt.

### Ältere Stand-Blöcke → `dropship/STAND-ARCHIV.md` (vollständig, verbatim; per `grep -n` durchsuchen)
Die Blöcke bis 27.10.2026 (spätabends) (Merchant-Feed, Sourcing, ChatGPT-Arbeit, SEO-Titel, Pilot 2.0 mit 20 Prüfungen, Bewertungen, Versand-Schwelle, Spiele/Webseite-Handschrift, Social-Maschine …) stehen im Archiv. Überschriften:

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
