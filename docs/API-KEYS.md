# 6c — API-Keys: wo holen, wo setzen, nie ins Repo

> **Grundregel (gilt immer):** Keys sind Geheimnisse. **Niemals** in eine Datei im
> Repo schreiben, nicht in Commits, nicht in den Chat, nicht in HTML/JS. Nur als
> **Umgebungsvariable** (lokal), **GitHub-Repo-Secret** (CI/Workflows) oder
> **Cloudflare-Pages-Environment-Variable** (Edge-Funktionen). Diese Site nutzt
> bewusst kein Tracking — Keys gehören entsprechend sauber behandelt.

## `ANTHROPIC_API_KEY`

**Wo holen:** [console.anthropic.com](https://console.anthropic.com) → einloggen →
**API Keys** → *Create Key* → kopieren (wird nur einmal gezeigt).

**Wofür im Repo:**
- `automatisierung-radar/ai/ki_helfer.py` (Recherche/Content/Audit-Entwürfe) +
  Edge-Funktion `functions/api/ask.js` (Website-Frage-Assistent).
- `ki-schriftsteller/` (Roman-/Trilogie-Generator).
- optionale KI-Umschreibung im Hype-Filter (`functions/api/hype-check.js`).

**Wo setzen:**
| Kontext | Wie |
|---------|-----|
| Lokal (Python-Skripte) | `export ANTHROPIC_API_KEY=sk-ant-...` vor dem Aufruf |
| GitHub Actions (Audit-/Content-Workflows) | Repo → *Settings → Secrets and variables → Actions → New repository secret* → Name `ANTHROPIC_API_KEY` |
| Cloudflare Pages (Edge-Funktionen `functions/api/*`) | CF-Projekt → *Settings → Environment variables → Add* → `ANTHROPIC_API_KEY` (Production) |

> Ohne Key laufen die KI-Funktionen im **Fallback** (keine KI-Antwort, kein
> Hard-Fail) — die statischen Seiten bleiben unberührt.

## `ELEVENLABS_API_KEY`

**Wo holen:** [elevenlabs.io](https://elevenlabs.io) → einloggen → Profil →
**API Keys** (bzw. *Profile + API key*) → kopieren.

**Wofür im Repo:** Vertonung der Kurzvideos/Werbespots in `video-pipeline/`
(`generate_clips.py --voice`, `generate_promo.py --voice`). Optional
`ELEVENLABS_VOICE_ID` (Standard: eine mehrsprachige Stimme; deutsche Stimme
auswählen und gegentesten).

**Wo setzen:**
| Kontext | Wie |
|---------|-----|
| Lokal | `export ELEVENLABS_API_KEY=...` (optional `export ELEVENLABS_VOICE_ID=...`) |
| GitHub Actions (falls Vertonung automatisiert) | Repo-Secret `ELEVENLABS_API_KEY` |

> Ohne Key wird die Vertonung **sauber übersprungen** — Storyboard-Frames, VO-Text
> und Untertitel entstehen trotzdem.

## Schnell-Checkliste
- [ ] Key bei der jeweiligen Konsole erzeugt
- [ ] **nicht** ins Repo committet (kein `.env` mit echten Werten einchecken)
- [ ] als Repo-Secret / CF-Env-Var / lokale Env-Var gesetzt
- [ ] minimale Rechte / bei Verdacht auf Leak: Key rotieren

## Verwandt
- Cloudflare-Token für den Go-Live: [`CF-PAGES-SETUP.md`](CF-PAGES-SETUP.md)
  (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
- Bezahl-/Newsletter-Kanäle: [`NEWSLETTER-GELD.md`](NEWSLETTER-GELD.md).
