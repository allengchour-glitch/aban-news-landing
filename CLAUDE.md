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
**📌 2026-10-26 vormittags (👗👟👜 Mode-Taxonomie in allen vier Bereichen live · Menüs · Filter-Felder · 206 Banner · 903 Texte · Westen verengt · Tag-Kollation — PR #2737, gemergt):**
**Branch:** PR #2737 (`5c83461e4`), #2738 und #2739 sind per Squash in `main`. Folgearbeit läuft jeweils auf einem NEUEN Branch von `origin/main` (Force-Push ist per Projektregel gesperrt, ein gemergter Branch wird nicht weiterverwendet). **Vor jedem Branchwechsel die Ledger-Dateien `dropship/{kategorien,cj_varianten,cj_variantenbilder}_ledger.txt` (assume-unchanged) nach /tmp sichern und danach vergleichen** — ein Checkout kann lokale Anhänge still verwerfen (26.10.: 159 Zeilen, aus dem Reflog zurückgeholt). Alles live gemessen und aus Kundensicht geprüft. Gelernte Fallen stehen in den fünf neuen Projekt-Skills (`.claude/skills/`, Quellen `dropship/skill-entwuerfe-2610/`).
- **🗂️ 314 Mode-Kategorien** (Bekleidung 187 + Schuhe/Taschen/Accessoires 127; Tags `sort-…`): 0 Abweichungen, 127/127 Seiten HTTP 200. Abdeckung durch `sort-`-Kategorien **38 % → 76,1 %** der aktiven Produkte. Rezept: `MODE_BEREICHE=bekleidung,schuhe,taschen,accessoires KATALOG=<frisch> PREFIX=m- LIVE=1 PHASE=tags|sammlungen node automation/kategorien_anlegen.mjs` — **die Vorgabe von `MODE_BEREICHE` ist nur `bekleidung`!** Frischer Katalog: `AUS=/tmp/x.json node automation/katalog_titel_scan.mjs`.
- **🧭 Menüs live** (Sicherungen `dropship/menu-sicherung/main-menu-vor-{mode,schuhe,accessoires}-2610.json`): `node automation/mode_menue.mjs` / `ABSCHNITT=schuhe` / `ABSCHNITT=accessoires` (Trockenlauf Vorgabe, `LIVE=1` liest zurück). Taschen-Ast behält den Titel «Taschen & Rucksäcke» (andere Werkzeuge hängen darüber ein); Accessoires stehen in Damen/Herren vor «Schuhe»; Gruppen ohne Collection werden flach aufgelöst («Damen: Handtaschen»). 146 Menülinks HTTP 200.
- **🔎 Filter-Felder** `lux.unterfilter`/`lux.eltern` (268, `automation/kategorie_unterfilter.mjs`). Chips erscheinen NUR im Theme-Entwurf 212498841991 (dort auch: ähnliche Produkte 4→10, Knopf «Mehr aus [Kategorie]», Video-Zeile) → **Klick beim User** (Rückfall 187533001089).
- **🚨 Shopify-Tags sind diakritik-unempfindlich:** `tagsRemove` von `sort-x-langbörsen` entfernte auch das gerade gesetzte `sort-x-langborsen` (19 Produkte ~2 Min ohne Tag). Ursache war ein Umlaut-Handle (Shopify macht «ö» zu «o»); Test prüft jetzt alle 429 Handles/Tags auf `a-z0-9-`. Nach Tag-Änderungen den Zustand am Produkt lesen (Tag-Suche und Collection-Zähler hinken ~20 s nach). `kategorien_anlegen.mjs` überschreibt Sicherungen nicht mehr.
- **👕 «Western» enthält «Weste»:** `westen-gilets` hatte ~80 Western-Stiefel/-Kleider/-Armbänder und 72 Hundewesten (407 → 247 aktive Produkte, Daten in `kategorien_verengt_daten.json`). Der Prüfer zeigte nur 22 Ausreisser, weil Tier + Kleidung als «Kern» zählten → bei jedem Prüferfund die Google-Kategorie-Verteilung selbst aufschlüsseln. Titel-Regel-Collections mit Fremdkörpern: 98 → 5 → 0.
- **⭐ Bewertungen zuerst** in 260 Menü-Collections (`MENUE=1 LIVE=1 node automation/bewertung_zuerst.mjs`, rückgängig `BEST_SELLING=1`). **🖼️ 206 Pinnwand-Banner** live (`automation/kategorie_banner.mjs`; Gemini-Tor lehnt 9 Kategorien beharrlich ab → altes Bild bleibt; das Tor ist nicht deterministisch, Wiederholung lohnt).
- **📝 903 Texte live** (533 + 211 + 159): je Produkt Schreib-Agent → CLI-Prüfung → unabhängiger Gegenleser; Zusatzsperre «keine Wahl-Versprechen bei Produkten ohne Auswahl» (Leser fand nur 4 von 8). Zurückgehalten 11 (`dropship/texte-zurueckgehalten-2610.json`), 18 zu dünn; **93 mögliche Titelwidersprüche** (BEHAUPTUNG) in `dropship/titel-verdacht-2610-runde5.json` → nächste Titelrunde mit Skill `titel-wahrheit`.
- **🔌 Stecker per CJ-Schlüssel:** 19 Produkte/77 Varianten bereinigt + 1 Entwurf, frische Bulk-Probe 0 offen. **🧪 CI:** Job `tests` nutzt Sparse-Checkout (neue Ordner in `sparse-checkout` UND `paths`); `automation/ci_simulation.sh [REV]` baut ihn mit sauberem /tmp nach; Voice-Linter nimmt `.claude/**` aus.
- **⏳ Auswahl-Dauerlauf** hängt am Shopify-Tageslimit für neue Varianten (03:31, 07:03, 07:43, 08:26, 09:52 UTC weiter gesperrt, kein Mitternachts-Reset); läuft von selbst weiter (`/tmp/auswahl_durchlauf.log`).
- **🛒 CJ:** Doppelbestellung `#1028-K` (vom User von Hand angelegt, unbezahlt) in den CJ-Papierkorb gelegt; echte `LX1028` ist versandt (`EQKPT8613176643YQ`); Shopify #1028 am 26.10. 11:15 UTC mit Freigabe des Users auf «Erfüllt» gesetzt (CJPacket, 17TRACK-Link, Versandmail an den Kunden; `fulfillmentCreateV2`, Muster wie #1021–#1026). **🔎 Index:** alle Grundlisten-Seiten indexiert, nächste 10 in `dropship/INDEX-LISTE-2610.md`.
- **⚠️ Veraltete Routinen** (stündliche «Aufseher-Keepalive», 4-stündliche «Autonome Verbesserungsrunde», Stand 01.10.) NICHT ausgeführt: sie würden CJ-Runner starten (Variantenlimit, CJ-Punkte), `git add -A` und auf den fremden Branch `claude/luxestyle-status-tztnn1` pushen → User soll sie pausieren; die «Google-Index-Liste» wurde nur lesend bedient.
- **🟡 Beim User:** Theme-Entwurf veröffentlichen · TikTok-/YouTube-Adressen für die Video-Zeile · Tanja-Keller-Entwurf (Preis fehlt) · ChatGPT-Abo (`dropship/CHATGPT-AUFTRAEGE-2610.md`) · Routinen pausieren · die 10 Index-Anträge (`dropship/INDEX-LISTE-2610.md`).

**📌 2026-10-26 (🎛️ Auswahl-Dauerlauf für alle CJ-Produkte · Optionswerte repariert · Tassen · Text-Pipeline · CLAUDE.md von 255 KB auf 24 KB):**
Auftrag des Users in der Nacht: «fast allen Produkten fehlt die Auswahl» (wichtigstes), mehr Text, Kategorien/Filter selbst bauen, Pinterest-Banner, ChatGPT weiter nutzen?, TikTok/YouTube-Zeile, ähnliche Produkte. PR #2737, Branch `claude/luxestyle-projektor-2026-10-25`.
- **🚨 DER AUSWAHL-FEHLER WAR EIN SKU-FORMAT:** `cj_varianten_nachziehen.mjs` verstand nur 15-stellige Ziffern-pids; `CJYD…AZ` und `CJ-CJ…` wurden als «keine pid» übersprungen (69 von 525). Jetzt `strategien()` aus `lib/fakten_block.mjs` (pid → variantSku → productSku). **Gemessen: 29 278 Kandidaten** (`node automation/auswahl_kandidaten.mjs`, Bulk-Abfrage ohne CJ-Punkte), davon Stufe 1 (bewertet) 1 384, Stufe 2 (Kleidung/Schuhe/Ringe/Uhren/Taschen), Stufe 3 Rest. CJ führt bei rund einem Drittel nur EINE Variante — kein Auswahlproblem, nie raten (Ledger `UEBERSPRUNGEN`, 14 Tage Gedächtnis).
- **Dauerlauf:** `WORKERS=6 BATCH=40 STUFEN="1 2 3" nohup bash automation/auswahl_durchlauf.sh &` (Log `/tmp/auswahl_durchlauf.log`, Stopp: `touch /tmp/auswahl_stop`, Ledger `dropship/cj_varianten_ledger.txt`). ~14–19 Produkte/Min. Bei CJ-Drosselung (Exit 3) wartet er 30 Min. und macht weiter. **Nach einem Neustart der Umgebung:** `/tmp` ist weg → Kandidatenliste neu bauen, dann Dauerlauf neu starten (das Ledger im Repo verhindert Doppelarbeit). Fortschritt: `node automation/fortschritt_daten.mjs` + Dashboard-Artifact.
- **🔑 ZWEI FEHLER IN DEN GESCHRIEBENEN OPTIONEN (live bei Stichprobe gefunden, dann katalogweit gemessen = 41 Produkte, repariert):** (1) `FARB_RE_DE` prüfte nur den ANFANG → «Gold black», «Gold white» galten als «bereits deutsch»; jetzt ganzes Wort + Mehrwort-Zerlegung (`Rose Red Black` → `Rosenrot / Schwarz`); (2) Buchstaben-Kürzel unter «Color» (`A, B, C`) hiessen «Farbe: A» → Option «Modell», Werte «Modell A». **Zahlen sind NIE «Modell»** (Moissanit-Ring «5, 6, 7, 8» = Ringgrössen). Reparatur-Werkzeug `automation/optionen_reparieren.mjs` (Trockenlauf Vorgabe, 12 Tests).
- **🚨 SHOPIFY BEGRENZT NEUE VARIANTEN PRO TAG («Daily variant creation limit reached», `VARIANT_THROTTLE_EXCEEDED`) — gemessen ~9 500 neue Varianten, dann Schluss** (Auswahl-Lauf 21:43Z–03:31Z: 1 568 Produkte, 10 663 Varianten). Das Limit gilt für den GANZEN Shop — auch für CJ-Import und jede andere Sitzung. Der Lauf endet dann mit Exitcode 4 und wartet 40 Min. (`WARTE_VAR`); Produkte mit > 40 CJ-Varianten kommen später (`MAX_VARIANTEN=100`). Der Fehler zeigte sich zuerst als «alle Läufe rc=1, FERTIG» — **bei einem Dauerlauf immer den Grund des Endes im Log lesen, nicht nur «FERTIG».** Hochrechnung: 29 278 Kandidaten brauchen so Tage, nicht Stunden.
- **🔤 Englische Optionswerte:** 2 863 Produkte / 14 527 Werte («Silver Black-Ordinary») → `automation/optionen_uebersetzen.mjs` (Wörterbuch + KI mit Sicherungen, Trockenlauf Vorgabe, Zwischenspeicher `/tmp/optionen_uebersetzt.json`); Ausgabe-Prüfung bewusst streng nur für sicher fremde Wörter (`EN_AUSGABE_RE`). Grösse im Farbfeld («Gelb Hase, 100») bleibt ein eigener Strukturfehler.
- **📝 Seitenkopf:** `<!-- ls-var-v1 -->` (+ «Ausführung»-Hinweise) vom Auswahl-Lauf gehört zum Kopf (`zerlege`); vorher lehnte die Textlogik 49 von 220 fertigen Texten ab. 533 Texte live (313 + 220). Titel-Korrekturen: `dropship/titel-korrekturen-2610.md` (32, alt→neu).
- **🗂️ Tasse:** `lib/tassen_regel.mjs` prüft die Vorsilbe («Aschenbecher», «Zahnputzbecher», «Würfelbecher» sind keine Trinkgefässe, «Reisebecher» schon) → 27 Fehltreffer live entfernt. **Kategorie-Lücken-Analyse:** 35 419 von 56 636 Produkten liegen in keiner der 88 neuen `sort-`-Kategorien — fast alles Mode (Workflow «Mode-Taxonomie» läuft) und Altbestand mit Menü-Collections.
- **🧹 Verengte Alt-Collections (Daten statt Code):** `lib/kategorien_verengt.mjs` + `lib/kategorien_verengt_daten.json` (Ausschluss je Google-Kategorie-Präfix/Titelmuster, je Collection von Agenten vorgeschlagen und mit `automation/kategorie_regel_probe.mjs` gemessen; Erfassung `kategorien_verengen_erfassen.mjs`). Beispiel: «Handyhüllen & Cases» enthielt Hundehalsbänder und Konsolen-Hüllen — von 58 sind nur ~8 echte Handyhüllen. Wirkung erst nach `LIVE=1 PHASE=tags|sammlungen node automation/kategorien_anlegen.mjs`.
- **📝 Texte:** der Agenten-Prompt steht jetzt in `dropship/TEXT-AGENT-AUFTRAG.md` (ging vorher mit der Sitzung verloren). Zweiter Lauf 236 Produkte (nur Produkte mit CJ-Datenblatt im Zwischenspeicher `/tmp/cj_fakten_cache`, der beim Auswahl-Lauf mitwächst).
- **🔑 ChatGPT:** Empfehlung «behalten, aber nur mit Aufträgen, die Fehler finden» in `dropship/CHATGPT-AUFTRAEGE-2610.md` (Abo-Preis unbekannt → Entscheid beim User).
- **🪙 TOKEN-LEHRE:** CLAUDE.md wurde bei jedem Zug mitgeladen (255 KB ≈ 65 000 Token). Alle Stand-Blöcke vor dem 25.10. liegen jetzt VERBATIM in `dropship/STAND-ARCHIV.md`; CLAUDE.md trägt nur Kernfakten, den aktuellen Block und ein Überschriften-Verzeichnis. **Neue Stand-Blöcke kurz halten (≤ 30 Zeilen); Details in `dropship/*.md`.**
- **🟡 Beim User:** Theme-Entwurf 212498841991 veröffentlichen (Rückfall `187533001089`) · Tanja-Keller-Entwurf in Gmail (Preis fehlt, nicht gesendet) · Hoodie-Preis · Abo-Entscheid ChatGPT.

### Ältere Stand-Blöcke → `dropship/STAND-ARCHIV.md` (vollständig, verbatim; per `grep -n` durchsuchen)
Die Blöcke bis 26.10.2026 (früh) (Merchant-Feed, Sourcing, ChatGPT-Arbeit, SEO-Titel, Pilot 2.0 mit 20 Prüfungen, Bewertungen, Versand-Schwelle, Spiele/Webseite-Handschrift, Social-Maschine …) stehen im Archiv. Überschriften:

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
