# Token sparen & selber produzieren — Spickzettel

> Wo aban news KI-Tokens (= Geld) verbraucht und wie du es senkst, ohne Qualität zu verlieren.
> Stand: 2026-06-12. Zwei Töpfe: **Anthropic** (dein Key, kostet pro Aufruf) und **Gemini**
> (Automation, grosszügige Gratis-Stufe).

## 1. Wo überhaupt Tokens fliessen
| Endpoint / Job | Modell | Gated? | Kostenrisiko |
|---|---|---|---|
| `/api/demo` (Startseite „KI gratis testen") | **Haiku** (neu, war Sonnet) | nur Origin + 3/IP/Tag + 400/h | **öffentlich** → jetzt billig |
| `/api/chat` (Frag-aban) | Haiku | Pro/Limit | gering |
| `/api/ki-erwaehnung` (Sichtbarkeit) | Haiku | — | gering |
| `/api/generate` (KI-Studio) | Sonnet | **Pro-Lizenz** | zahlt der Pro-Kunde |
| `/api/hype-check` (Umschreiber) | Sonnet | **Pro** (sonst regelbasiert gratis) | nur Pro |
| `/api/audit-report` | Sonnet | bezahltes Produkt | nur Käufer |
| Automation (Entwürfe, Kritik, Bilder) | Gemini Flash | — | **Gratis-Stufe** |

**Wichtigste Erkenntnis:** Bis auf `/api/demo` ist jeder Anthropic-Aufruf hinter Pro/Bezahlung
oder einem Limit. Der einzige „offene Hahn" war die Demo — jetzt auf Haiku (~4–5× billiger).

## 2. Sofort-Hebel (kein Deploy nötig — nur Cloudflare-Env setzen)
Alle Modelle sind per Umgebungsvariable überschreibbar. Im Cloudflare-Pages-Projekt setzen:
- `DEMO_MODEL` = `claude-haiku-4-5-20251001` (Default, schon billig)
- `CHAT_MODEL` = `claude-haiku-4-5-20251001` (Default)
- `GENERATE_MODEL` / `HYPE_MODEL` / `VISIBILITY_MODEL` → bei Bedarf auf Haiku stellen, wenn dir
  die Qualität reicht. **Spart sofort, ganz ohne Code-Änderung.**

## 3. Weniger Tokens pro Aufruf
- **`max_tokens` knapp halten** (Demo 280, Chat 320 — schon gut). Je kürzer die Antwort, desto billiger.
- **✅ Ergebnis-Cache (umgesetzt in `/api/demo`)**: identische Eingabe → Antwort aus dem Edge-Cache
  (`caches.default`, 24 h), **0 Tokens** und kein Quota-Verbrauch. Der vorausgefüllte Demo-Default
  (der meistgeklickte Input) wird so nur einmal pro Tag wirklich generiert. Dasselbe Muster lässt sich
  später auf andere wiederkehrende, öffentliche Generierungen übertragen.
- **Prompt-Caching (Anthropic `cache_control`): hier NICHT sinnvoll.** Geprüft: die System-Prompts sind
  winzig (~60 Tokens) — weit unter der Cache-Mindestgrösse (~1024 Tokens). Bringt also nichts; erst
  relevant, falls mal grosse, gleichbleibende Kontexte/Anleitungen mitgeschickt werden.
- **Batch-API** (50 % günstiger) für nicht-Echtzeit-Jobs (z. B. Massen-Übersetzungen).

## 4. „Selber produzieren" — gratis statt bezahlt
- **Schon gratis & lokal (0 Tokens):** Rechnung/Mahnung/Angebot-Generator, Hype-Filter, Prompt-
  Baukasten, alle Rechner — reines Browser-JS. Kein API-Call. So viel wie möglich hierher verlagern.
- **Gemini-Gratis-Stufe** trägt die Automation (Entwürfe, Kritiken, Bilder). Bulk-/Hintergrund-Arbeit
  dort lassen, Anthropic nur für Pro-zahlende + Qualitäts-kritische Live-Antworten.
- **Lokales Modell (Ollama) auf dem Dauer-PC:** Der immer laufende PC (Brave-Agent) kann ein
  Gratis-Modell (z. B. Llama/Mistral via Ollama) hosten und Entwürfe/Übersetzungen liefern — 0 Cloud-
  Kosten. Sinnvoll für Massen-Übersetzungen der Hubs und Newsletter-Rohentwürfe; die Endredaktion
  bleibt bei dir/Anthropic. (Setup-Aufwand einmalig; spart laufende Kosten.)
- **Free-Tier-Alternativen** für Live-Tools, falls Anthropic-Kosten steigen: Groq (Llama, sehr schnell,
  grosse Gratis-Stufe) oder Gemini-Flash hinter denselben `/api/*`-Endpoints — ein Adapter, ein Env-Switch.

## 5. Faustregel
**Deterministisch → lokal (gratis). Bulk/Hintergrund → Gemini-Gratis/Ollama. Pro-zahlend & Live-
Qualität → Anthropic (Sonnet). Öffentlich-gratis → Haiku, eng limitiert.**
Heute ist genau so verdrahtet; der einzige offene Posten war die Demo (gefixt).
