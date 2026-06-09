# KI-Werkzeug AI Worker — „echte KI" scharfschalten (verlustsicher)

Kleiner Cloudflare-Worker, der das KI-Werkzeug (`ki-werkzeug.html` / `en/ki-werkzeug.html`)
von **Vorlagen** auf **echte KI** umstellt — **ohne** dass du je drauflegst.

## Warum dieser Worker
- **API-Key bleibt geheim** (serverseitig, nie im Browser).
- **Verlustsicher** (deine Vorgabe „Pro = unbegrenzt, nicht dass ich minus mache"):
  harte Tages-Obergrenzen **pro IP** *und* **global** in Cloudflare KV. Selbst bei Missbrauch
  sind die Kosten gedeckelt. Mit dem günstigen `gemini-2.0-flash`-Modell kostet ein Aufruf
  Bruchteile eines Rappens → 500 Aufrufe/Tag liegen weit unter den Pro-Einnahmen.

## Einrichtung (~10 Min, einmalig)

1. **Wrangler einloggen**
   ```bash
   cd workers/ki-werkzeug-ai
   npx wrangler login
   ```
2. **KV-Namespace anlegen** und die ausgegebene `id` in `wrangler.toml` bei
   `REPLACE_WITH_KV_NAMESPACE_ID` eintragen:
   ```bash
   npx wrangler kv namespace create CAP_KV
   ```
3. **Secrets setzen**
   ```bash
   npx wrangler secret put GEMINI_API_KEY      # dein Google-AI-Studio-Key (mit Budget-Limit!)
   npx wrangler secret put PRO_TOKEN           # optional: hebt das IP-Limit für Pro
   ```
   👉 Setz im Google-AI-Studio/Cloud-Console zusätzlich ein **Ausgaben-Limit** auf dem Key —
   doppelter Boden.
4. **Deployen**
   ```bash
   npx wrangler deploy
   ```
   Du bekommst eine URL wie `https://ki-werkzeug-ai.<dein-subdomain>.workers.dev`.
   (Optional: eigene Route `https://abannews.com/api/generate` via Cloudflare-Dashboard → Workers Routes.)

5. **Frontend verbinden** — in `ki-werkzeug.html` **und** `en/ki-werkzeug.html` die Konstante setzen:
   ```js
   const AI_ENDPOINT = "https://abannews.com/api/generate"; // bzw. die workers.dev-URL
   ```
   und in `runText()` den vorbereiteten Phase-2-Zweig aktivieren (Kommentar
   `// PHASE 2: if(AI_ENDPOINT){ genWithAI(...) }`). Der Worker liefert `{ text }`.

## Test
```bash
curl -s https://<deine-worker-url>/api/health
curl -s -X POST https://<deine-worker-url>/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"type":"produkt","branche":"Friseur","thema":"Herren-Haarschnitt","kw":"ohne Termin, zentral","ton":"freundlich","lang":"de"}'
```

## Stellschrauben (`wrangler.toml` → `[vars]`)
| Var | Default | Bedeutung |
|-----|---------|-----------|
| `GLOBAL_DAILY_CAP` | 500 | harte Gesamt-Obergrenze/Tag (Verlustschutz) |
| `IP_DAILY_CAP` | 30 | pro Besucher/Tag (Pro-Token ⇒ ×5) |
| `GEMINI_MODEL` | gemini-2.0-flash | günstig; für mehr Qualität `-pro` |
| `ALLOW_ORIGIN` | https://abannews.com | CORS |

> Hinweis: Der Pro-Status im Browser (`localStorage`) ist nur UX und umgehbar.
> Die **echte** Kosten-/Fair-Use-Bremse macht dieser Worker (serverseitig). Genau so gewollt.
