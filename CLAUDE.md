# CLAUDE.md — Projekt-Gedächtnis

Dieses Repo ist `aban-news-landing`, enthält aber mehrere Projekte. Das aktive, autonome
Arbeitsgebiet ist der **CJ-Dropship-Import für den Shopify-Shop LuxeStyle CH**.

## 🤖 Autonom-Auftrag (Dauerauftrag des Users)
Der User will, dass der Shop **autonom weiter mit Produkten gefüllt wird — ohne dass er ‚weiter'
sagen muss.** Bei jeder Session, die Dropship/Shop/CJ betrifft:

1. **Lies zuerst `dropship/AUTONOMER-MODUS.md`** — das vollständige Runbook (Credentials,
   Ablauf, Filter, Pricing, Publish-Falle, bereits genutzte Keywords, aktueller Stand).
2. **Lies `dropship/CJ-IMPORT-LOG.md`** für die genaue Produktliste und Historie.
3. Dann **einfach loslegen**: nächste Charge importieren (1–4 saubere Produkte), live schalten,
   Log aktualisieren, committen, auf Branch `claude/dropship-lade-memory-SrAs5` pushen, Stand melden.
   Nicht nach Erlaubnis fragen — der Auftrag steht.

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
2026-05-31: **40 CJ-Produkte live** in 6 Kanälen. Weiter Richtung 50. Siehe Runbook §8 + Log.
