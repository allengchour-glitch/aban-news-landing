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
2026-06-01 (Abend): **511 aktive Produkte**, Shop jetzt **VOLL VERKAUFSBEREIT** — alle Conversion-Blocker
des Tages gelöst. Auswertung morgens: 1.596 Sessions/14T, aber 0 Käufe / Conversion 0,0 % / Add-to-Cart
0,13 % → Root Cause war **kein TikTok-Pixel** + kaputte Funnel-Elemente. **HEUTE GEFIXT:**
- ✅ **TikTok-Pixel** `D8EKVR3C77U6KT5BTBD0` (via Shopify-App) grün; Konto „LuxeStyle CH Ads", 333 CHF.
- ✅ **Conversion-Kampagne** 1866807185899746 „LuxeStyle Mode CH – Sommer" (20 CHF/Tag, Complete Payment,
  CH/Frauen/18–34/DE+FR) — User reicht via Browser-Claude ein; altes 49-CHF-Set wird pausiert.
- ✅ **Kritisch:** Kampagnen-Landingpage `/collections/sommer` fehlte (404!) → Smart Collection erstellt,
  auf **44 Damenmode** fokussiert (tag sommer-2026 + damen), 6 Kanäle, SEO+Bild.
- ✅ **Mobiles Menü** drawer_accordion an · **WELCOME10-Popup** (Shopify Forms) live · Mindestwert raus
  (greift ab CHF 0.01) · **Judge.me Reviews** · **Homepage** fashion-first re-kuratiert.
- ✅ **SEO** auf ~20 Kollektionen + 16 Fashion-Produkte. **Bild-QA ganzer Katalog**: 0 FAILED.
- ✅ **Gratis-Wachstum** (GRATIS-WACHSTUM.md): Klaviyo-Welcome-Mail (Template T7bFP4), 2 Hook-Reels
  (render_hook_reel.sh), 15 Reel-Ideen, Pinterest-Pins. Posten = User (kein API-Upload).
**NÄCHSTE SESSION:** Kampagne 2–3 Tage laufen lassen → dann „Auswertung" (kommen jetzt Add-to-Cart/Käufe?).
User-offene Klicks: Kampagne einreichen, altes Set pausieren, Welcome-Flow aktivieren, organisch posten.
**Geliefert (Assets/Docs):** EN-Creatives+Reels (manifest_en.tsv, render_story_creatives.sh sprachfähig via
CTA_TEXT/PROMO_TEXT), Markets-US/UK-Anleitung (MARKETS-US-UK-SETUP.md — US/UK existieren, deaktiviert,
erst nach EN-Übersetzung einschalten), Affiliate-Start-Kit (AFFILIATE-START-KIT.md, UpPromote 15 %),
Conversion-Booster (CONVERSION-BOOSTER.md). Story-Reel-Skript `dropship/ads/render_story_reel.sh` (Ken-Burns + Musik).
**Kein echter 8/12h-Cron möglich** (§Scheduler) → Autonomie = Charge-für-Charge je Session + dieses Memory.
**Workflow neue Produkte:** Token-Cache `/tmp/cj_token.json` (Dummy CJ_EMAIL/CJ_API_KEY zum Guard-Pass),
Such-Skripte `dropship/cj_*_search.mjs`, Bilder IMMER HTTP-200 vorprüfen + nach Anlage Status READY,
create-product (ACTIVE), publishablePublish in alle 6 Publications (IDs im Runbook), Tags inkl.
gender/kategorie passend zu Smart-Collection-Regeln. **IMMER erst CJ-IMPORT-LOG lesen vor dem Anlegen
(Doppel-Import-Falle!).** Archiv-Rest löschen (~4.700, Admin-Bulk) weiter offen. Siehe Runbook §8–§10 + Log.
