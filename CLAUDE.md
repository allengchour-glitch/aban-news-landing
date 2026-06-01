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
2026-06-01: **511 aktive Produkte** in 6 Kanälen. **WICHTIGSTE ERKENNTNIS (Auswertung):** 1.596
Sessions/14T (wachsend), aber **0 Käufe, Conversion 0,0 %**, Add-to-Cart nur 0,13 %. **ROOT CAUSE:
kein aktives TikTok-Pixel** → TikTok optimiert blind, schickt breiten US-Traffic (356 Sessions US vs
823 CH) der nie kauft. Mobil 72 %. **Trichter oben kaputt, nicht das Produktangebot** → mehr Produkte
bringt aktuell NICHTS, erst Conversion fixen.
**Offene Prioritäten (Details im Log 2026-06-01):** (1) TikTok-Pixel via TikTok-Shopify-App verbinden
(Konto „LuxeStyle CH Ads"); (2) Kampagnen-Entwurf **1866807185899746** „LuxeStyle Mode CH – Sommer"
fertigstellen (blockiert bis Pixel aktiv); (3) altes Ad-Set auf CH begrenzen (US-Leck); (4) mobiles
Menü drawer_accordion einschalten (User-Klick, MENU-KOMPAKT-GALAXUS.md); (5) Reviews-App + WELCOME10-Popup.
**Geliefert:** EN-Creatives+Reels (manifest_en.tsv, render_story_creatives.sh ist sprachfähig via
CTA_TEXT/PROMO_TEXT), Markets-US/UK-Anleitung (MARKETS-US-UK-SETUP.md — US/UK existieren, deaktiviert,
erst nach EN-Übersetzung einschalten), Affiliate-Start-Kit (AFFILIATE-START-KIT.md, UpPromote 15 %).
Story-Reel-Skript `dropship/ads/render_story_reel.sh` (Ken-Burns + Musik).
**Kein echter 8/12h-Cron möglich** (§Scheduler) → Autonomie = Charge-für-Charge je Session + dieses Memory.
**Workflow neue Produkte:** Token-Cache `/tmp/cj_token.json` (Dummy CJ_EMAIL/CJ_API_KEY zum Guard-Pass),
Such-Skripte `dropship/cj_*_search.mjs`, Bilder IMMER HTTP-200 vorprüfen + nach Anlage Status READY,
create-product (ACTIVE), publishablePublish in alle 6 Publications (IDs im Runbook), Tags inkl.
gender/kategorie passend zu Smart-Collection-Regeln. **IMMER erst CJ-IMPORT-LOG lesen vor dem Anlegen
(Doppel-Import-Falle!).** Archiv-Rest löschen (~4.700, Admin-Bulk) weiter offen. Siehe Runbook §8–§10 + Log.
