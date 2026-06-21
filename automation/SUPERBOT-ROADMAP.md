# 🤖 LuxeStyle Super-Bot — Selbst-Entwicklungs-Roadmap (2026-06-21)

> User-Mandat: „du steuerst alles, verbessere/entwickle/installiere/update dich". Recherche-belegt
> (Stagehand/BullMQ/Patchright/Worker-Health). Reihenfolge = Hebel. Jede Session: nächsten offenen Punkt bauen.

## ✅ Schon gebaut (die autonome Triade)
- **Selbst-Update:** `cmd-poll.ps1` pullt + startet sich neu + **Smoke-Test & Auto-Rollback** (kaputter Push → last-good).
- **Selbst-Check:** `LuxeHealth`-Task (alle 6h) + `post-health.mjs` (gepostet/doppel/Fehler + `failures.jsonl`).
- **Selbst-Heilung:** `automation/lib/resilience.mjs` (withRetry/errorSink/deadLetter/guard/heartbeat).
- **Heartbeat:** cmd-poll schreibt `reports/heartbeat.json` jeden Poll.
- **Doppelpost weg:** Ledger durabel + timestamped.

## 🔜 Nächste Stufen (nach Hebel)
### 1. AI-Selektoren (Stagehand) — größter Fragilitäts-Fix [HIGH]
Browser-Bots brechen bei UI-Änderungen. **Stagehand** (MIT, Browserbase) löst Aktionen zur Laufzeit gegen den
Accessibility-Tree (`act("click publish")`), **CDP-nativ → hängt an Brave 9222**, cached Selektoren, fragt LLM nur
bei Bruch. LLM über unseren Groq/Gemini-Router. **Plan:** `npm i @browserbasehq/stagehand` (PC), Wrapper
`automation/lib/ai-browser.mjs` (Stagehand wenn da, sonst Playwright-Fallback), dann Profil/ig-delete/Kampagne/
Markt nach und nach auf `act/extract` umstellen. → übersteht TikTok/IG-Redesigns.

### 2. Idempotente Jobs + Dead-Letter (BullMQ) [HIGH]
Jede Post/Browser-Aktion = retrybarer Job mit `attempts`+exponential-backoff+**Jitter** + **DLQ** + **stalled-job-
detection** (Heartbeat/Lock) → killt Hänger + Doppelpost. **Job-ID = Idempotenz-Key** (hash media+platform+Tag).
Braucht Redis am PC (oder leichtgewichtige Datei-Queue als Zwischenschritt).

### 3. Warme Sessions gegen Login-Ablauf [HIGH]
Cookies/localStorage **persistieren** + warme Sessions statt frischer Logins. ⚠️ `puppeteer-stealth` ist seit
Feb 2025 deprecated+detektiert → **Patchright/Camoufox** falls Stealth nötig. Offizielle APIs wo möglich (IG/FB Graph,
TikTok Content-Posting nach Audit) — Browser nur wo kein API.

### 4. Worker /health-Watchdog [MEDIUM]
Worker liest `heartbeat.json` (committed) → wenn stale > N Min → Telegram-Alarm. Schließt die „PC nicht beobachtbar"-Lücke.

### 5. Orchestrator + stateless Workers [MEDIUM]
Hub-and-Spoke FLACH halten (1 Orchestrator, flache Worker). ⚠️ 40% Multi-Agent scheitern, jeder Hop +950ms/3× Token —
nicht verschachteln.

**Quellen:** Stagehand/browser-use (github), BullMQ (oneuptime/dev.to), anti-bot 2026 (browserless), supervisor (truefoundry). Konfidenz HIGH bei Tooling.
