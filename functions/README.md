# Hype-Filter — Edge-API

Cloudflare Pages Functions für den Hype-Filter (`/hype-filter.html`).
Kein Build-Step: Cloudflare erkennt den `functions/`-Ordner automatisch und
deployt jede Datei als Route. Die Analyse-Engine ist reines JS ohne
Abhängigkeiten und läuft komplett am Edge.

## Dateien

| Datei | Zweck |
|-------|-------|
| `_engine.mjs` | Analyse-Engine (Hype-Lexikon, Score, Lesbarkeit, Umschreibung). Wird vom Route-Handler **und** vom Test importiert. |
| `api/hype-check.js` | Route `POST /api/hype-check` — Einzel- und Bulk-Analyse, optionale KI-Umschreibung. |
| `_engine.test.mjs` | Node-Test der Engine: `node functions/_engine.test.mjs` (17 Checks). |

Dateien mit `_`-Präfix sind keine Routen, nur Importe.

## Endpunkt: `POST /api/hype-check`

### 1) Einzeltext analysieren
```json
{ "text": "Dein Text…", "action": "analyze" }
```
Antwort (gekürzt):
```json
{
  "score": 42, "grade": "Etwas Hype", "verdict": "…",
  "metrics": { "wordCount": 38, "hypeDensity": 7.9, "avgSentenceLen": 19,
               "readingGrade": 11.2, "longSentenceCount": 1 },
  "findings": [ { "start": 7, "end": 20, "match": "revolutionäre",
                  "category": "superlativ", "replacements": ["neu", "…"] } ],
  "categories": [ … ], "suggestions": [ … ], "ruleRewrite": "…"
}
```
`findings` enthält Start-/End-Positionen fürs Highlighting im Frontend.

### 2) KI-Umschreibung
```json
{ "text": "Dein Text…", "action": "rewrite" }
```
Ist das Secret `ANTHROPIC_API_KEY` im Pages-Projekt gesetzt, kommt eine
Claude-Umschreibung (`aiRewriteSource: "claude"`), sonst die regelbasierte
Fassung (`aiRewriteSource: "fallback"`). Model über `HYPE_MODEL` überschreibbar
(Default `claude-sonnet-4-6`).

### 3) Bulk-Check (Premium-Basis)
```json
{ "texts": ["Text A", "Text B", "…"] }
```
Antwort: schlanke Kennzahlen pro Text (Score, Grade, Hype-Dichte, Top-Kategorien),
max. 25 Texte pro Anfrage (`truncated: true`, wenn mehr gesendet).

## Limits & Datenschutz
- Max. 20.000 Zeichen pro Text, max. 25 Texte pro Bulk-Anfrage.
- Kein Speichern, kein Tracking. Der Text wird nur für die Analyse verarbeitet;
  bei `rewrite` einmalig an die Anthropic-API geschickt.
- CORS offen (`*`) — die API ist bewusst auch für Fremdnutzung gedacht.

## Secrets setzen (optional, für KI-Umschreibung)
Cloudflare Dashboard → Pages-Projekt → Settings → Environment variables:
- `ANTHROPIC_API_KEY` = dein Anthropic-Key (als *Secret*).
- `HYPE_MODEL` = optional, z. B. `claude-sonnet-4-6`.

## Premium-Roadmap (Skizze)
Das Tool ist gratis und ohne Login. Monetarisierung später, gestaffelt:

1. **Gratis (jetzt):** Einzeltext-Analyse + regelbasierte Umschreibung, unbegrenzt.
2. **Newsletter-Gate:** KI-Umschreibung gegen E-Mail-Opt-in (beehiiv) — Funnel
   wie beim eBook. Technisch: Frontend schaltet `action:"rewrite"` erst nach Opt-in frei.
3. **Premium (Stripe, analog `founding.html`):**
   - **Bulk-Check** ganzer Seiten/Exporte (CSV-Upload → Score je Zeile). Endpunkt
     `{texts:[…]}` steht schon.
   - **API-Key** für Entwickler (Rate-Limit über Cloudflare KV/Turnstile).
   - **Team-Wörterbuch:** eigene Sperrliste zusätzlich zum `LEXICON`.
   - **Verlaufs-Report:** Score-Entwicklung über Zeit (KV/D1).
4. **B2B:** „Brand-Voice-Check als Service" — derselbe Validator, der intern jede
   aban-news-Ausgabe prüft, als bezahlte Schnittstelle für Agenturen/Redaktionen.

Erweiterung des Lexikons: neue Muster in `_engine.mjs` → `LEXICON` ergänzen
(`[regex, Label, Kategorie, Gewicht, [Alternativen]]`), Test ergänzen, fertig.
