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
2026-05-31 (Nacht): **478 aktive Produkte** in 6 Kanälen. Diese Session +17 neue Produkte:
3 Mode, 5 Schuhe (neue Schuh-Kollektion + Menü-Tab + Collections schuhe/damen-schuhe/herren-schuhe),
2 Sommer-Gadgets, 4 Küche/Tech, 3 Taschen/Flaschen. Neue Subkats im Menü: 👟 Schuhe, 🍴 Küchengeräte,
🔌 Coole Gadgets. Werbe-Video `dropship/ads/render_neu.sh` (10 Produkte, Musik, Klick-CTA) geliefert.
Dashboard `dropship/luxestyle-dashboard.html`. Mobile-Menü „drawer_accordion" aktiv.
**CJ-Katalog SEHR ausgeschöpft:** jede Such-Charge ~50% Fehltreffer, real 1–4 saubere Treffer.
**Kein echter 8h-Cron möglich** (CLAUDE.md §Scheduler) → Autonomie = Charge-für-Charge je Session.
**Workflow neue Produkte:** Token-Cache `/tmp/cj_token.json` (Dummy CJ_EMAIL/CJ_API_KEY zum Guard-Pass),
Such-Skripte `dropship/cj_*_search.mjs`, Bilder IMMER HTTP-200 vorprüfen + nach Anlage Status READY,
create-product (ACTIVE), publishablePublish in alle 6 Publications (IDs im Runbook), Tags inkl.
gender/kategorie passend zu Smart-Collection-Regeln. Offene User-Klicks: TikTok-Kampagne (Bid=Highest
volume), Discord-Sales-App, Archiv-Rest löschen (~4.700, Admin-Bulk). Siehe Runbook §8–§10 + Log.
