# Aban Studio

> **DSGVO-konformes KI-Content-Studio (SaaS) für den DACH-Markt.**
> Ein Thema → fertiges Content-Paket (Text + Bild + Voiceover), DSGVO-konform,
> auf Deutsch, redaktionell qualitätsgeprüft, in Minuten.

Eigenständiges Schwesterprodukt zu [Aban News](https://abannews.de). Siehe die
Marktrecherche in [`../ki-geld-projekt/MARKTRECHERCHE.md`](../ki-geld-projekt/MARKTRECHERCHE.md)
für die strategische Begründung.

---

## Wertversprechen

- **Multi-API-Orchestrierung:** LLM-Text + Bildgenerierung + Voiceover (TTS) in einem Paket.
- **Qualitäts-Moat:** Jeder Text durchläuft den Aban Brand-Voice-Validator (30+ Anti-Hype-Regeln,
  0–10-Score, Auto-Retry) — kein KI-Slop.
- **DSGVO by design:** EU-Datenresidenz, FLUX (Black Forest Labs, Freiburg) für Bilder,
  EU-AI-Act-Art.-50-Kennzeichnung ab 2.8.2026 eingebaut.
- **Deutsch-first:** Tonalität (du/Sie), DACH-Kontext, lokale UX.

## Geschäftsmodell

€29/Monat-Basis-Abo (inkl. ~250 Credits) + Credit-Top-ups. API-COGS bleibt < 20 % des Preises
(1 Credit = €0,10 Kundenwert). Distribution über den bestehenden Newsletter.

---

## Architektur

```
Newsletter ──▶ Marketing-Site (statisch, CF Pages) ──▶ App (SvelteKit, CF Pages)
                                                            │ enqueue
                                                            ▼
            Supabase EU (Postgres+RLS, Auth, Storage) ◀── Stripe (Subs, Tax, Webhooks)
                                                            │ generation_jobs row
                                                            ▼
                    Orchestrator (FastAPI, Fly.io fra):
                    1) Fan-out parallel: Text → Bild → TTS
                    2) Brand-Voice-Validierung (wiederverwendeter Aban-Code)
                    3) AI-Act-Label + C2PA-Provenance stempeln
                    4) Assets → Supabase Storage
                    5) Credits atomar verbuchen (hold → settle)
                          │            │            │
                    OpenAI/Anthropic  FLUX(EU)   ElevenLabs
```

## Tech-Stack

| Layer | Wahl |
|---|---|
| Marketing-Site | Statisches HTML/CSS (Reuse aus Aban News), Cloudflare Pages |
| App-Frontend | SvelteKit, Cloudflare Pages (`app.aban.studio`) |
| AI-Orchestrierung | FastAPI (Python), Fly.io Frankfurt (`fra`) |
| DB/Auth/Storage | Supabase EU (`eu-central-1`) — Postgres + RLS + Auth + Storage |
| Job-Queue | DB-Tabelle `generation_jobs` (`FOR UPDATE SKIP LOCKED`) |
| Billing | Stripe Subscriptions + Stripe Tax (DE-USt/OSS) |
| AI-APIs | OpenAI/Anthropic (Text), FLUX/BFL (Bild, EU), ElevenLabs (TTS) |

## Repo-Layout

```
aban-studio/
├── apps/
│   ├── web/              # SvelteKit (Marketing + App)  [TODO W1–W4]
│   └── orchestrator/     # FastAPI AI-Orchestrierung
│       ├── providers/    # Provider-Interface (swap-friendly)
│       ├── voice/        # Brand-Voice-Validator (Reuse)
│       ├── compliance/   # AI-Act-Label + C2PA
│       └── billing/      # Credit hold/settle/refund
├── packages/db/migrations/   # Supabase SQL + RLS
├── infra/                # fly.toml, supabase config
└── compliance/           # DPA, SCC, TIA, ROPA, Lösch-Runbook
```

## Status

🟡 **W1 — Fundament** (in Arbeit): DB-Schema + RLS, Provider-Interface, AI-Act-Modul, Infra-Configs.

Roadmap (siehe Plan):
- **Phase 0:** Nachfrage über 2 Newsletter-Ausgaben validieren (Founding-Preis-CTA).
- **W1:** Supabase EU + Schema + RLS; SvelteKit-Scaffold; Marketing+Legal kopieren; Auth+Consent.
- **W2:** Orchestrator + 1 Text-Provider + Validator; Job-Queue; Realtime. Text-only E2E.
- **W3:** FLUX-Bild + TTS (parallel); Credit hold/settle; Review/Edit/Export-ZIP.
- **W4:** Stripe-Sub + Top-ups + Webhook; Stripe Tax; AI-Act-Labels + C2PA; Lösch-Endpoint. Soft-Launch.

## Setup (lokal, sobald Apps existieren)

1. `cp .env.example .env` und Keys eintragen (Supabase, Stripe, AI-Provider).
2. DB-Migrationen anwenden: `packages/db/migrations/*.sql` gegen die Supabase-EU-Instanz.
3. Orchestrator: `cd apps/orchestrator && pip install -r requirements.txt && uvicorn main:app`.
4. Web: `cd apps/web && npm install && npm run dev`.

## Compliance

EU-Datenresidenz (Supabase `eu-central-1`, Fly.io `fra`). US-Provider nur mit DPA + SCCs + TIA;
nur Thema/Marke gesendet, nie End-Kunden-PII. AI-Act-Art.-50-Kennzeichnung config-getrieben in
`apps/orchestrator/compliance/ai_act_label.py`. Details: `compliance/`.
