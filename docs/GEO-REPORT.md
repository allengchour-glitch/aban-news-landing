# GEO-Report-Abo — KI-Sichtbarkeit für Firmen (Grundgerüst)

**Idee:** Firmen wollen wissen, ob sie in KI-Antworten (ChatGPT/Perplexity) auftauchen — und wie
sie dahin kommen. Du lieferst dafür einen **monatlichen Report** (Abo, B2B).

## Was schon da ist
- `automation/geo_report.py` — erzeugt je Kunde einen ehrlichen Monats-Report → `reports/geo/<marke>-<YYYY-MM>.md`.
- `data/geo-clients.example.json` — Vorlage für die Kundenliste (→ kopieren nach `data/geo-clients.json`).
- **`.github/workflows/geo-report.yml`** — läuft am 1. jeden Monats, erzeugt die Reports und lädt sie
  als **privates Build-Artefakt** hoch (kein Commit → Kundendaten bleiben aus dem Repo). No-op ohne Liste/Key.
- **`downloads/muster/geo-report-MUSTER.md`** — fertiges **Beispiel-Report** (erfundene Berner Firma) zum
  Verschicken/Zeigen, damit Interessenten das Format sehen.
- Öffentliche Funnel-Seiten existieren: `ai-sichtbarkeit.html`, `ki-erwaehnungs-check.html`.

## So läuft's
1. `data/geo-clients.json` mit echten Kunden füllen (Marke, Website, 3–5 typische Suchfragen).
2. Monatlich `python3 automation/geo_report.py` (lokal oder als Cron-Workflow) → Reports.
3. Report als PDF/Mail an den Kunden (Versand = Mensch).

## Geld
- Abo **€29–99/Monat** pro Firma über Lemon Squeezy (Subscription). 5–10 Kunden = spürbarer MRR.
- Upsell: einmaliger „GEO-Audit" + Umsetzung der Tipps (Dienstleistung).

## Ehrlich
- Der Report ist eine **Einschätzung** (KI-Antworten schwanken, kein Live-Scrape) — klar gekennzeichnet.
- **Keine Garantie** auf Platzierung. Der Wert = klare, umsetzbare Maßnahmen + monatliches Dranbleiben.
- Akquise (die ersten Kunden) bleibt der menschliche Teil — am besten lokal/LinkedIn.

## Nächster Ausbau (optional)
- Telegram-Benachrichtigung, wenn neue Reports fertig sind.
- Report-HTML/PDF-Template (statt Markdown) für den Versand.
