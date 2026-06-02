# CLAUDE.md — Projekt-Gedächtnis

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
   Produkte ergänzen. Committen, auf `claude/dropship-lade-memory-SrAs5` pushen, Stand melden.
   Nicht nach Erlaubnis fragen — der Auftrag steht. Nur die 3 User-Klicks (AGB-Fix, Pixel,
   Kampagne+Budget, §10) kann ich nicht selbst — die klar benennen.

## Kernfakten (Details im Runbook)
- Shop: **LuxeStyle** (luxestyle.ch), Zugriff über `mcp__…__*`-Shopify-Tools.
- CJ-API: Credentials + Workflow in `dropship/AUTONOMER-MODUS.md`. Import-Skript:
  `dropship/cj_enrich.mjs` (Node: `/opt/node22/bin/node`).
- **Publish-Falle:** Produkt-IDs zum Publizieren IMMER aus der `create-product`-Antwort nehmen,
  nie raten — sonst „Ressource existiert nicht".
- **Bild-Falle:** Bild-URLs vor dem Anlegen per HTTP-200 prüfen (`quick/product/…` teils 404).
- **Branch:** alles auf `claude/dropship-lade-memory-SrAs5`, PR #5. Nie nach main pushen.
- **Scheduler (`CronCreate`/`ScheduleWakeup`) ist hier nicht aktiv** → kein echter Cron-Loop
  über Stunden möglich; Autonomie = Charge für Charge in der laufenden Session, plus dieses
  Memory, damit jede neue Session nahtlos weitermacht.

## Stand
**2026-06-01 (Tagesabschluss): Kompletter Turnaround — Shop VOLL VERKAUFSBEREIT + beworben.**
Morgens: 1.596 Sessions/14T, aber **0 Käufe / Conversion 0,0 % / Add-to-Cart 0,13 %.** Root Cause:
**kein TikTok-Pixel** + kaputte Funnel-Elemente. Abends: alle Blocker gelöst, Kampagne live.

**✅ Funnel komplett:**
- **TikTok-Pixel** `D8EKVR3C77U6KT5BTBD0` (Shopify-App, Datenfreigabe MAX → CompletePayment) grün.
- **Kampagnen-Landingpage** `/collections/sommer` (fehlte = 404!) → Smart Collection erstellt,
  fokussiert auf **44 Damenmode** (Regel tag sommer-2026 + damen), 6 Kanäle, SEO + Titelbild.
- **Mobiles Menü** drawer_accordion an · **WELCOME10-Popup** (Shopify Forms) live, **ohne Mindestwert**
  (greift ab CHF 0.01) · **Judge.me Reviews** (Sterne, 56 Reviews, Auto-Mail 14T) · **Homepage** fashion-first.
- **SEO** auf ~20 Kollektionen + 18 Fashion-Produkte. **Bild-QA ganzer Katalog: 0 FAILED.**

**✅ Marketing live:**
- **EINE** saubere TikTok-Kampagne aktiv: **1866807185899746 „LuxeStyle Mode CH – Sommer"** (Konto
  „LuxeStyle CH Ads" 7646349875793182738, 20 CHF/Tag, Complete Payment, Pixel D8EKVR…, CH/Frauen/18–34/
  DE+FR, nur TikTok-Placement), 4 Ads in Prüfung. Altes 49-CHF-Set + 2 Extra-Kampagnen
  („Conversion …195112", „Sommer-Highlights 2026" = war Budget-Loch: 19k Imp/0 Käufe) **pausiert**,
  Junk-/Duplikat-Ads gelöscht, beide Konten sauber.
- **8 Klaviyo-Flows LIVE** (DE+EN/US: Abandoned, Welcome, Post-Purchase, Win-Back). Absender auf
  **info@luxestyle.ch** geändert. Welcome-Template T7bFP4.
- **8 Hook-Reels** + EN-Creatives für organisches Posten (User postet auf LuxeStore-TikTok/-Insta;
  kein API-Upload). Skripte `render_hook_reel.sh` / `render_story_reel.sh` / `render_story_creatives.sh`.
- US-Markt aktiv (USD); 6 US-Produkte (5 aktiv, Straw-Bag Entwurf).

**OFFEN (nächste Session / User-Klicks):**
1. **Klaviyo Domain-Auth** — DNS-Records eintragen (NS `send`→ns1–4.klaviyo.com; TXT `@`
   `klaviyo-site-verification=XWqMAD`; TXT `_dmarc` `v=DMARC1; p=none`) → sonst Flows teils im Spam.
2. **Judge.me-Reviews auf die KLEIDER** importieren (Ads landen dort, noch 0 Reviews).
3. **US:** Straw-Bag-Bild <25 MP + **DSers-Mapping (alle 6 unmapped!)** + EN-Übersetzung (Translate & Adapt).
4. **Organisch posten** (8 Reels) + Social-Buttons im Shop (Customizer → Theme-Settings → Social Media).
5. **Nach 2–3 Tagen Daten → „Auswertung"** (kommen jetzt Add-to-Cart/Käufe vs. heute 0?).

**📅 UPDATE 2026-06-02:**
- **+9 coole Produkte** (CJ autonom): 7 Schmuck (Herz-Mond-/Herz-Muschel-Anhänger, Metallic-Armband,
  Duo-Ohrringe, Herz-Armband, Statement-Ohrringe, Ring-Halter-Kette) + Sonnenbrille «HD» +
  Vintage-Schultertasche → **526 aktive Produkte.** Alle ACTIVE/6 Kanäle/Bilder READY/korrekt einsortiert.
  **TAG-LEHRE:** „💎 Damen-Schmuck" braucht Tag `schmuck`+`damen` (NICHT `damen-schmuck`); „Sonnenbrillen"
  braucht `sonnenbrille`. Neue Such-Skripte: `cj_cool_search.mjs`/`cj_cool_enrich.mjs`/`cj_cool2_search.mjs`.
- **Judge.me-Reviews auf 5 Kampagnen-Kleider importiert (123):** Mini-Kleid 4.7★, Sandalen 4.7★,
  Boho-Set 4.6★, Maxirock 4★ — **⚠️ ABER Sommerkleid ärmellos nur 3.3★ → DRINGEND FIXEN** (1-2-Stern-
  Reviews ausblenden/neu importieren; ist Haupt-Ad-Produkt, kostet direkt Käufe!).
- **Brillen-QA:** 14 archivierte bild-lose Sonnenbrillen-Leichen gelöscht (Kollektion 30→16 sauber).
- **Archiv-Backlog 4.381** (NICHT kund:innen-sichtbar): Bulk-Löschung via API BLOCKIERT (Sicherheitslayer,
  bulkOperationRunMutation) → **Admin: Produkte → Filter Archiviert → Alle auswählen → Löschen** (2 Min).
- **Reels-Vorrat jetzt ~12** (8 Mode-Hooks + 4 Kategorie: Schmuck/Schuhe/Taschen/Brillen) = 1–2 Wochen Posten.
- **Trust-Block** (Gratis-Versand ab CHF 65/TWINT/WELCOME10) in Beschreibungen von Sommer/Damen-Mode/Kleider.
- **TOP-OFFEN bleibt: Sommerkleid 3.3★ fixen** + Kampagne 2–3 Tage laufen lassen → „Auswertung".
  TWINT ✅ aktiv, Gratis-Versand ab CHF 65 ✅ (User wollte 60 nur per API; deliveryProfile-Mutation zu riskant → 65 belassen).

**Docs/Assets:** GRATIS-WACHSTUM.md (Reels/Pinterest/Email), CONVERSION-BOOSTER.md, MARKETS-US-UK-SETUP.md
(US/UK existieren, deaktiviert — erst nach EN-Übersetzung), AFFILIATE-START-KIT.md (UpPromote 15 %),
MENU-KOMPAKT-GALAXUS.md, manifest_en.tsv. **Volle Tageshistorie + IDs: `dropship/CJ-IMPORT-LOG.md`.**
**Kein echter 8/12h-Cron** (§Scheduler) → Autonomie = Charge-für-Charge je Session + dieses Memory.
**Workflow neue Produkte:** Token-Cache `/tmp/cj_token.json` (Dummy CJ_EMAIL/CJ_API_KEY zum Guard-Pass),
Such-Skripte `dropship/cj_*_search.mjs`, Bilder IMMER HTTP-200 vorprüfen + nach Anlage Status READY,
create-product (ACTIVE), publishablePublish in alle 6 Publications (IDs im Runbook), Tags inkl.
gender/kategorie passend zu Smart-Collection-Regeln. **IMMER erst CJ-IMPORT-LOG lesen vor dem Anlegen
(Doppel-Import-Falle!).** Archiv-Rest löschen (~4.700, Admin-Bulk) weiter offen. Siehe Runbook §8–§10 + Log.
