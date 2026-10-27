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
**📌 2026-10-27 vormittags (💸 Mengenrabatt LIVE · 🔴 KI-Ausfall im Nachtlauf gefunden und abgesichert · 🗂️ Taxonomie aller Nicht-Mode-Bereiche gebaut, nichts live):**
- **💸 Mengenrabatt LIVE seit 27.10. 06:36 UTC** (Besitzerentscheid vom selben Morgen, PR #2751): Tag `mengenrabatt-a` (4 761 Produkte, Marge ≥ 45 %: ab 2 Stück −5 %, ab 3 Stück −10 %) und `mengenrabatt-b` (1 747, Marge ≥ 37 %: ab 3 Stück −5 %), zwei Smart-Sammlungen `mengenrabatt-ab-2-stueck` / `-3-stueck` (HTTP 200), drei automatische Rabatte (`Mengenrabatt: …`, nicht stapelbar). Die zwei alten Pauschalrabatte («Bundle 2+ -10 %», «Mengenrabatt 10 % ab 3») enden exakt 06:36 (EXPIRED), Gratis-Versand ab **CHF 45** aktiv (Regel «ab 50» aus; versprochen bleibt «ab 50», Puffer für den Rabatt). Ausgeschlossen: Geräte/Technik, Marken, Gesperrtes, Kosten unbekannt, Preis ausserhalb 3–60 CHF, **Personalisiertes (172), Magnetarmbänder (30), Kosmetik mit Wirkwort (69)**, LED-/Smart-Haustierartikel. **Kundensicht am Warenkorb gemessen:** A 1× kein Rabatt, 2× −5 %, 3× −10 % (50.70 → 45.63, «Kostenloser Versand» angeboten); B 2× kein Rabatt, 3× −5 %; Produkt ohne Tag 3× kein Rabatt. Werkzeug `automation/mengenrabatt.mjs` (`plan|status|tags|sammlungen|rabatte|stopp`, Trockenlauf Vorgabe, 284 Tests, Freigabe `dropship/MENGENRABATT-FREI.txt`, Stopp = `LIVE=1 node automation/mengenrabatt.mjs stopp`); Marge ändert sich mit Preisen/Kosten → **wöchentlich `NEU=1 … plan`, bei Abweichung `LIVE=1 … tags`** (Routine «Mengenrabatt wöchentlich messen»). **Offen:** Hinweis «ab 2/3 Stück günstiger» auf der Produktseite (Theme-Entwurf, Veröffentlichen = Klick beim Besitzer).
- **🔴 Nachtlauf 27.10. (Run 40429252286, 00:53 → 06:08 UTC, GitHub-Verspätung 3 h):** 679 Produkte / 4 420 Varianten geschrieben, Ledger gesamt **2 263 geschrieben, 1 429 übersprungen** (von 29 534 Kandidaten). **Ab 01:14 fiel die Übersetzung aus** (304 Produkte «vorläufig» geparkt, Durchsatz 467 → ~40 Produkte/Std.): **Gemini HTTP 402 «prepayment credits are depleted»** und **`GROQ_API_KEY` ist kein Repo-Secret** (Probe: `groq=nein`; im Container liegen `GROQ_API_KEY`, `_2`, `_3`, Limit je Schlüssel und Modell 1 000 Anfragen/Tag, gemessen). **Absicherung (PR #2752):** der KI-Probeaufruf bricht die Nacht nicht mehr ab, Produkte mit zu übersetzenden Werten werden 20 h zurückgestellt (`KEIN_KI_UEBERSETZEN`, ohne CJ-Fracht), alle anderen laufen; der Job wird am Ende rot mit Anleitung; `nachDeutsch` fragt bis zu 3 Groq-Schlüssel (Secrets `GROQ_API_KEY`/`_2`/`_3`). **Beim Besitzer:** Gemini-Guthaben auffüllen (ai.studio/projects; betrifft auch Banner und Hoodie-Vorschau) **oder** Repo-Secret `GROQ_API_KEY` setzen. Qualität (26.10., 1 584 Produkte): 1 556 mit Auswahl, 11 854 von 11 856 Varianten mit eigenem Bild; Verdacht BILD_DOPPELT 87, ENGLISCH 21, EINZELWERT 14; älterer Bestand 529 Verdachtsfälle (OHNE_BILD 286 → `cj_variantenbilder.mjs` nach dem Nachtlauf). Bekannt: Grössenwerte «36 To 37» (englisches «To»).
- **🗂️ Taxonomie «Rest des Shops» (PR #2750, Entwurf, nichts live):** 13 Bereichsdateien in `dropship/taxonomie-2610-b/bereiche/` (handy, computer, spielzeug, unterhaltung, beauty, haus-bau, wohnen, schmuck-uhren, auto, sport, hobby-party, sportschuhe, tiere) = **404 neue Kategorien**, je Bereich gemessen und von einem unabhängigen Leser gegengeprüft (Fremdquote nachher 0–0,85 %), keine Handle-Kollision gegen den Shop und untereinander. Live erst nach dem Auswahl-Fix: `kategorien_anlegen.mjs`-Phasen tags/sammlungen, Menü, Reihenfolge nach Bewertung. **Entscheide beim Besitzer:** Inline-Skates (24) in Sportschuhe oder Sport & Outdoor; «Sportschuhe für Alltag & Freizeit» (176) behalten oder streichen; 14 echte Powerbanks heissen «Ladegerät/Ladestation» (Titelkorrektur nötig, Skill `titel-wahrheit`).
- **🧥 Tanja Keller (27.10. 08:51 UTC beantwortet, Auftrag des Besitzers «beantworte email an tanja wegen hoodie»):** Sie schickte ein NEUES Logo (`62844.jpg`, 1254 × 1254 px, quadratisch, + PDF «Druckangaben aktualisiert») und bat um eine unverbindliche Offerte mit Bildvorschau für **Variante B** zum Vergleich mit A. Antwort von `info@luxestyle.ch` im selben Verlauf: neue Vorschaubögen für B und A (Logo ist ihre Datei, unverändert eingesetzt, **kein Gemini nötig**: `compose2.py`/`sheets2.py` aus `dropship/hoodie-vorschau-2610/` mit den sauberen Fotos aus `/tmp/vz/gem`, Python `/tmp/vz/venv/bin/python`), Offerte B unverändert CHF 144.80 (2 × 38.90 + 60.00 + 7.00, Preise live gegengelesen), A CHF 296.80, Logo jetzt ca. 9 × 9 cm Brust / 24 × 24 cm Rücken (**1254 px auf 24 cm ≈ 133 dpi**, knapp → Aufbereitung in der Pauschale), Rechnung weiter nein (Pauschale bei Zusage, Rest vor Produktion). **Wartet auf Wahl A oder B.** Bögen: `wb-06720268fa-variante-{A-allover,B-klassisch}-neues-logo.jpg` im Shopify-CDN. **Offen beim Besitzer:** Versand CHF 7 in der Offerte, obwohl die Produktseiten «gratis ab CHF 50» sagen und seit 27.10. ab 45 gratis angeboten wird (beide Totale liegen darüber).
- **🧩 Theme:** das Theme `212498841991` ist bereits **MAIN (live)**. Neuer Entwurf **`212591444359`** («Horizon · LuxeStyle Premium (Entwurf 27.10. Mengenrabatt-Hinweis)» = Kopie des Live-Themes + Block `lux_mengenrabatt` nach den Kaufknöpfen, zeigt «ab 2/3 Stück günstiger» NUR bei Tag `mengenrabatt-a/-b`, im Vorschaumodus an drei Produkten gemessen, nicht live) → **Veröffentlichen = Klick beim Besitzer**; Vorschau `https://luxestyle.ch/?preview_theme_id=212591444359`.
- **🔧 Folge-PRs 27.10.:** #2754 Grossschreibung nach der Übersetzung (kleines Groq-Modell liefert «purpurrot»), #2755 «36 To 37» → «36–37» (48 Altprodukte mit «To»-Werten aus dem Abzug vom 26.10. sind NICHT repariert: `optionen_reparieren.mjs` kennt nur «Farbe»). **Grind 2.0 (PR #2756, Entwurf, nichts live):** zwei Prüfrunden eingearbeitet (34 + weitere Funde, 394 Mutanten 381 rot), Runde 3 + Endprüfer laufen; **Live erst nach Auswahl-Fix** (die sort-Collections fehlen noch, 5 von 10 Probe-Kandidaten scheitern an «keine sichere Google-Kategorie»). Offene Besitzerentscheide: Heikelware-Sperre (Medizin/Laser/Pyro), Kinderware nur nach Einzelprüfung, Netto-Mindestmarge.
- **Cloudflare-Bot-Prüfung (429, `cf-mitigated: challenge`)** sperrte den Container nach ~16 schnellen Storefront-Abfragen für ~15 Minuten (luxestyle.ch): Warenkorbtests mit Pausen von 2–4 s (`/tmp/mr/warenkorb2.sh`), nie umgehen.

**📌 2026-10-26 abends (🧥 Hoodie-Vorschau mit Gemini · ✅ Abgleich Shop↔CJ an allen 1 584 geschriebenen Produkten · 🔎 Search-Console-Mails · Preis- und Stecker-Fund behoben):**
- **🧥 Tanja Keller (2 Hoodies, Wikingsbrothers):** Mail mit Druckvorschau, Material und Kosten ging am 26.10. 18:47 UTC von `info@luxestyle.ch` an die Kundin (Antwort im Verlauf; wartet auf **Wahl A oder B**). Rezept, Skripte und alle Fallen: `dropship/hoodie-vorschau-2610/README.md` (Gemini 3 Pro Image, Kundenlogo vor dem Upload abdecken, Logo NACH der KI einsetzen). Logo = KI-Aufbereitung des kleinen Ausschnitts, **keine Druckdatei**. **Die erste Offerte hatte Fehler:** Material A war «70/30», richtig 96 % Polyester / 4 % Elastan (Lettland 95/5); Mustertext A passte nicht zur Vorlage; «innen angeraut» bei B unbelegt — alles in der Mail berichtigt. **Offen beim Besitzer:** Versand CHF 7 in der Offerte, die Produktseiten sagen «gratis ab CHF 50» (beide Totale liegen darüber) und bewerben Klarna-Rechnung; Logogrösse (Offerte Brust 9 cm / Rücken 24 cm, die Vorlage zeigt grössere Logos).
- **✅ Abgleich Shop↔CJ** (`automation/auswahl_abgleich_sammeln.mjs` + `auswahl_abgleich.mjs`, PR #2747; Messgerät nach unabhängiger Prüfung repariert, die erste Fassung meldete nur Fehlalarme): an **1 584 von 1 584** geschriebenen Produkten **0** Grössen-, Farb-, SKU- und Lager-Abweichungen (199 mit CJ-Bestand je Variante), **132** mit Befund ≥ mittel: 114× Kosten im Shop unter dem CJ-Preis (nur Buchführung, Preis liegt darüber), 6× Farbe nur über Code/«Style 1» (von Hand am Bild prüfen), 5× Preis weicht um ~1 CHF von der Schreibregel ab, 3× CJ-Variante fehlt, 1× Kosten fehlen, 1× bei CJ ohne Daten. Die **harten Funde sind behoben:** Hundegeschirr `reissfestes-hundegeschirr-19ab46` verkaufte L/XL unter dem CJ-Einkaufspreis (22.90 gegen 24.21/25.71 CHF) → 20 Varianten auf 24.90–32.90 (Regel `aufrunden90(CJ×Kurs×1.25)`); E-Scooter-Ladegerät hatte USA/Australien-Stecker live → 2 Varianten gelöscht. Rohdaten `/tmp/auswahl_abgleich_roh.jsonl` (Kopie im Scratchpad); Wiederholung: Sammler (fortsetzbar) + Auswertung.
- **🔎 Search-Console-Mails (26.10.):** «404/5xx in der Sitemap», «Gecrawlt – nicht indexiert»: Sonde über **3 004 Sitemap-Adressen** (alle Seiten/Sammlungen/Artikel, 1 425 Produkte de + 342 fr als Stichprobe) = **0 Fehler**. Ursache der 404: 282 Produkte seit 23.10. auf DRAFT (≥ 10 000 Entwürfe im Shop) und 161 archiviert, Google kennt sie noch aus der alten Sitemap — heilt von selbst. Nichts zu reparieren.
- **🔁 Tägliche Prüfung des Auswahl-Laufs (Auftrag des Besitzers 26.10. abends: «fix alles, auch wenn es Wochen geht»):** Routine **«Auswahl-Lauf täglich prüfen»** (`trig_014AWnT1TSnjdfVuQ9wJdyqw`, täglich 04:37 UTC, je eine frische Sitzung) liest den Nachtlauf (21:50 UTC), misst den Fortschritt im Ledger (Basis 26.10.: **1 584 geschrieben, 565 übersprungen, 29 534 Kandidaten**), repariert Ausfälle (Secrets, KI-Schlüssel, ffmpeg, Ledger-Push), startet einen verpassten Lauf von Hand (nur nach ≥ 20 h Abstand) und gleicht alle 3 Tage 10 neue Produkte gegen CJ ab. Pausieren: claude.ai → Geplante Aufgaben, oder `update_trigger enabled=false`. Der Index-Antrag-Stand: der Besitzer hat die 10 Anträge vom 26.10. gestellt.
- **⚠️ Container-Neustart etwa alle 25 Minuten** (26.10. 18:48 und 19:18 beobachtet): Hintergrundprozesse sterben, `/tmp` bleibt. Lange Läufe in fortsetzbaren Stücken im Vordergrund (≤ 9 Min) oder nach jedem Neustart per `ps` prüfen und neu starten; `send_later`-Erinnerungen überleben.

### Ältere Stand-Blöcke → `dropship/STAND-ARCHIV.md` (vollständig, verbatim; per `grep -n` durchsuchen)
Die Blöcke bis 26.10.2026 (früh) (Merchant-Feed, Sourcing, ChatGPT-Arbeit, SEO-Titel, Pilot 2.0 mit 20 Prüfungen, Bewertungen, Versand-Schwelle, Spiele/Webseite-Handschrift, Social-Maschine …) stehen im Archiv. Überschriften:

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
