# 6a — Cloudflare-Pages-Projekte: alle Radars + Shop

Eine Zeile pro Projekt. **Pro Zeile im CF-Dashboard:**
*Workers & Pages → Create application → Pages → Connect to Git → dieses Repo →*
*Build output directory =* `<Output>` *, Production branch =* `main` *→ danach*
*Custom domains → Set up a custom domain →* `<Domain>`.

> Schneller ohne Dashboard: `tools/cf_pages_setup.py` bzw. die Workflows
> `cf-pages-setup.yml` (Git-verbunden) / `cf-pages-deploy.yml` (Direct Upload, nur
> Token). Siehe [`CF-PAGES-SETUP.md`](CF-PAGES-SETUP.md). Build-Command überall:
> `cd <Ordner> && python generate.py` (reine Python-stdlib, kein Node nötig).

| # | Ordner | Projektname (CF) | Domain | Output | Status |
|---|--------|------------------|--------|--------|:------:|
| – | `ki-tools-radar` | `ki-tools-radar` | `radar.abannews.com` | `ki-tools-radar/dist` | ✅ live |
| 1 | `foerder-radar` | `foerder-radar` | `foerder.abannews.com` | `foerder-radar/dist` | ⏳ CF anlegen |
| 2 | `jobs-radar` | `jobs-radar` | `jobs.abannews.com` | `jobs-radar/dist` | ⏳ CF anlegen |
| 3 | `kurse-radar` | `kurse-radar` | `kurse.abannews.com` | `kurse-radar/dist` | ⏳ CF anlegen |
| 4 | `prompts-bibliothek` | `prompts-bibliothek` | `prompts.abannews.com` | `prompts-bibliothek/dist` | ⏳ CF anlegen |
| 5 | `agenturen-radar` | `agenturen-radar` | `agenturen.abannews.com` | `agenturen-radar/dist` | ⏳ CF anlegen |
| 6 | `dropshipping-radar` | `dropshipping-radar` | `dropshipping.abannews.com` | `dropshipping-radar/dist` | ⏳ CF anlegen *(POD-Shop, siehe 6b)* |
| 7 | `newsletter-radar` | `newsletter-radar` | `newsletter.abannews.com` | `newsletter-radar/dist` | ⏳ CF anlegen |
| 8 | `buchhaltung-radar` | `buchhaltung-radar` | `buchhaltung.abannews.com` | `buchhaltung-radar/dist` | ⏳ CF anlegen |
| 9 | `chatbot-radar` | `chatbot-radar` | `chatbot.abannews.com` | `chatbot-radar/dist` | ⏳ CF anlegen |
| 10 | `voice-radar` | `voice-radar` | `voice.abannews.com` | `voice-radar/dist` | ⏳ CF anlegen |
| 11 | `video-radar` | `video-radar` | `video.abannews.com` | `video-radar/dist` | ⏳ CF anlegen |
| 12 | `musik-radar` | `musik-radar` | `musik.abannews.com` | `musik-radar/dist` | ⏳ CF anlegen |
| 13 | `automatisierung-radar` | `automatisierung-radar` | `automatisierung.abannews.com` | `automatisierung-radar/dist` | ⏳ CF anlegen |
| 14 | `handwerk-radar` | `handwerk-radar` | `handwerk.abannews.com` | `handwerk-radar/dist` | ⏳ CF anlegen *(erst Daten verifizieren)* |

**14 offene Projekte** (+ `radar` ist bereits live). Diese Tabelle ist die Quelle
der Wahrheit für die Zuordnung; die Registry im Code (`RADARS` in
`tools/cf_pages_setup.py`) spiegelt sie 1:1.

## Reihenfolge-Empfehlung (Detail in `GO-LIVE-RADARS.md`)
1. `prompts` (reiner Content, Newsletter-Funnel)
2. `foerder` + `jobs` (inhaltsreich, höchster Sofort-Wert)
3. `kurse` + `dropshipping` + `video` + die übrigen Tool-Radars
4. `agenturen` + `handwerk` (erst echte Listings/Daten)

## Hinweise
- **DNS:** Liegt `abannews.com` bei Cloudflare, legt „Set up a custom domain" den
  CNAME automatisch an. Sonst CNAME `<sub>` → `<projekt>.pages.dev` manuell setzen.
- **Kein Build-Step nötig** außer `python generate.py` — CF erkennt `dist/` als Output.
- `automatisierung-radar` hat zusätzlich KI-/Edge-Funktionen (braucht Keys, siehe
  [`API-KEYS.md`](API-KEYS.md)); die statische Site läuft aber auch ohne.
