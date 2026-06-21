# 🧠 ZWEITES GEHIRN — Einstiegspunkt (Map of Content)

> **Inspiration:** „Obsidian + Claude Code: So baust du dein zweites Gehirn" (Julian Ivanov).
> **Zweck:** EIN Einstieg, der alles verbindet, damit jede Session + der autonome Loop nahtlos weiterläuft —
> ohne dass der User etwas wiederholen muss. ZUERST DIESE DATEI LESEN, dann gezielt vertiefen.

## 🗺️ Memory-Karte (wo steht was)
| Datei | Inhalt | Wann lesen |
|---|---|---|
| `CLAUDE.md` (Root) | Daueraufträge + feste Regeln + Kernfakten (Login/Branch/Geo) | IMMER zuerst |
| `automation/brain/knowledge.json` | **164+ Regeln** (alle teuren Lehren, kategorisiert) — das Langzeitgedächtnis | bei Entscheidungen |
| `dropship/STATUS.md` | Live-Stand, neueste oben (was läuft / wartet) | jede Session |
| `automation/brain/BRAIN.md` | Auto-Dashboard: KPI, beste Hooks/Hashtags, nächste Social-Aktionen | Social-Session |
| `dropship/RESEARCH-2026-06-21.md` | Recherche-Briefs (Zahlung, Mobile-CRO, Social, Creatives, Sound) + Quellen | Strategie |
| `SHARED-MEMORY.md` (Root) | Koordination mit Theme/ChatGPT-Session (wer macht was) | bei Theme/Katalog |
| `dropship/CJ-IMPORT-LOG.md` | Produkt-Historie (Doppel-Import-Schutz) | vor Produkt-Anlage |

## 🎯 Aktueller Engpass + Top-Aktionen (LIVE — Stand 2026-06-21)
**Funnel 30T:** 3002 Sess → 17 Warenkorb (0,57%) → 13 Checkout → 0 Kauf. **✅ TWINT ist jetzt LIVE** (Hebel #1 erledigt).
**Neue Top-3 (nach Impact):**
1. **Buy-Intent-Traffic** — Pixel scharf + CH-Kampagne (PC-Queue `campaign-data`; braucht Brave 9222 + Ch0524-Login).
2. **Comment-to-DM (ManyChat/IG)** = 4–6× Link-in-Bio = stärkster organischer Social-Hebel (braucht IG-Verbindung = User).
3. **Mobile-ATC** (69% Traffic, 0,34%) — Theme-Session setzt Mobile-PDP-Spec um (`RESEARCH §2`, via SHARED-MEMORY).

## 🔁 Der autonome Loop (wie es OHNE User läuft)
- **PC (Windows, `SUPERBOT-SETUP.bat` = 1 Klick):** registriert Scheduled-Tasks:
  Update 05:00 · Produkte 03:30 · SEO 04:30 · Posten 10/19 · Engagement 09/12/15/21 · Giga-Bot 11:30/18:30 ·
  **LuxeCmd alle 10 Min** (holt Cloud-Befehle aus der Worker-Queue) · Health 6h · Learn 06:00 · YouTube So 07:00 · Follower 14:00.
- **Cloud-Worker `luxe-poster`:** Cron 6×/Tag IG/FB posten + Kommentar-Antwort. Befehls-Queue: `curl '…workers.dev/?key=Abanaban192%2B&cmd=<X>'`.
- **Cloud↔PC-Brücke:** Cloud legt Befehl in Queue → LuxeCmd führt am PC aus + pusht Screenshots/Reports zurück.
  Befehle: `campaign-data` · `profil` · `markt-profil` · `trust-fix` · `tt-delete-go` · `giga` · `seo` · `bigbuy-premium` …
- **Lernschleife:** `bash automation/brain/auto.sh` = analysieren → ins Gehirn lernen (Ratsche) → Queue mit Gewinnern füllen.
- **AI-Browser (Stagehand):** alle fragilen Browser-Bots via `automation/lib/ai-browser.mjs` (`ab.act(...)`), Playwright-Fallback.
- **Recherche-Schwarm:** jede Session Agenten (Netz+YouTube) zu den Engpässen; Lehren sofort in `knowledge.json`.

## 🧭 Entscheidungs-Protokoll (autonom vs. User)
- **AUTONOM (sofort machen, nicht fragen):** Katalog/SEO/Kollektionen/Trust-Texte, Posten, Bots, Bilder, Memory, Recherche,
  Kauf-Blocker, Code-Fixes. Committen auf `claude/luxestyle-product-CizQ6`, Stand melden.
- **NUR USER (echtes Geld/Konto/Admin):** Zahlungsanbieter aktivieren, Kampagnen-Budget, Konto-Logins, ManyChat-IG-Verbindung,
  Pixel-Identity-Verify, Theme-Layout (Theme-Session via SHARED-MEMORY).
- **Sicherheits-Grenzen (FEST):** keine Secrets ins Repo · strikt CH (kein DE) · keine Fake-Reviews/Fake-Scarcity (UWG) ·
  Budget nie eigenmächtig erhöhen · nie nach `main` pushen.

## ⏳ Wartet auf User (die wenigen Klicks)
1. ✅ ~~TWINT~~ (erledigt 2026-06-21).
2. **Kampagne:** Brave 9222 + Ch0524-Login → `campaign-data` läuft autonom durch (Stagehand-Wizard).
3. **ManyChat** mit Instagram verbinden (Comment-to-DM).
4. Echte Rechnung (PowerPay-App), Pixel-Identity-Verify, Judge.me-Token (Reviews).

## 🔄 Pflege (damit das Gehirn aktuell bleibt)
Jede Charge: Lehre → `knowledge.json` (rules), Stand → `STATUS.md`, Koordination → `SHARED-MEMORY.md`,
diese MOC bei Engpass-Wechsel nachführen. „Info ist das A und O" — erst Daten ziehen, dann handeln.
