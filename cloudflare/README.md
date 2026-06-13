# LuxeStyle Autopilot — Cloudflare Worker

Lässt die tägliche **Veredelungs- + Social-Pipeline auf Cloudflare** laufen, komplett **unabhängig von
GitHub Actions** (die zeitweise gesperrt sind). Cron Triggers steuern alles:

| Cron (UTC) | Task | Was passiert |
|---|---|---|
| `04:30` | **ENHANCE** | Nächstes kuratiertes Produktfoto → Gemini 2.5 Flash Image (produkt-treue Editorial-Szene) → JPG in **R2** → fertiger Post in die **KV-Queue** (mit Produktlink-Caption) |
| `09:00` & `17:00` | **POST** | Nächster Queue-Eintrag → Meta-Graph-API → **Instagram + Facebook + (optional) Threads** |

Das veredelte Bild liegt öffentlich unter `{PUBLIC_BASE}/enhanced/<name>.jpg` und wird vom Worker direkt
aus R2 ausgeliefert — damit hat Meta die geforderte öffentliche JPG-URL.

> Quelle der Produkte: `automation/good_products.csv` → eingebettet in `src/products.js`.
> Nach Änderungen an der CSV: `node sync-products.mjs` und neu deployen.

---

## Einmalige Einrichtung (≈10 Min)

**0. Voraussetzungen:** Node 18+, ein (kostenloser) Cloudflare-Account.

```bash
cd cloudflare
npm install
npx wrangler login            # öffnet Browser, Account autorisieren
```

**1. R2-Bucket + KV-Namespace anlegen**

```bash
npx wrangler r2 bucket create luxestyle-autopilot
npx wrangler kv namespace create STATE
```

Der KV-Befehl gibt eine `id = "…"` aus → in **`wrangler.toml`** bei `[[kv_namespaces]]` das
`REPLACE_WITH_KV_NAMESPACE_ID` ersetzen.

**2. Erst-Deploy (um die Worker-URL zu erfahren)**

```bash
npx wrangler deploy
```

Ausgabe enthält die URL, z. B. `https://luxestyle-autopilot.dein-name.workers.dev`.
→ Diese URL in **`wrangler.toml`** bei `PUBLIC_BASE` eintragen.

**3. Secrets setzen** (werden verschlüsselt bei Cloudflare gespeichert, nie im Code):

```bash
npx wrangler secret put GEMINI_API_KEY        # Google-AI-Studio-Key mit Billing
npx wrangler secret put IG_USER_ID            # Instagram-Business-Account-ID
npx wrangler secret put IG_ACCESS_TOKEN       # Long-Lived Token, Scope instagram_content_publish
npx wrangler secret put FB_PAGE_ID            # Facebook-Seiten-ID (1049840534888592 = LuxeStyle CH)
npx wrangler secret put FB_PAGE_ACCESS_TOKEN  # Token mit pages_manage_posts
npx wrangler secret put THREADS_ACCESS_TOKEN  # optional
npx wrangler secret put RUN_KEY               # frei wählbar, für den /run-Testaufruf
```

**4. Final deployen**

```bash
npx wrangler deploy
```

---

## Testen (ohne auf den Cron zu warten)

```bash
# Status
curl https://luxestyle-autopilot.dein-name.workers.dev/health

# 1 Bild veredeln (legt es in R2 + Queue)
curl "https://luxestyle-autopilot.dein-name.workers.dev/run?task=enhance&key=DEIN_RUN_KEY"

# veredeltes Bild im Browser ansehen
#   https://luxestyle-autopilot.dein-name.workers.dev/enhanced/<name>.jpg

# 1 Post absetzen (IG/FB/Threads)
curl "https://luxestyle-autopilot.dein-name.workers.dev/run?task=post&key=DEIN_RUN_KEY"

# Live-Logs
npx wrangler tail
```

---

## Kosten
- Gemini 2.5 Flash Image: ~$0.04/Bild × 1/Tag ≈ **$1.2/Monat**.
- Cloudflare Workers/R2/KV: im **Free-Tier** für dieses Volumen kostenlos.

## Sicherheits-Hinweise
- Alle Tokens nur als `wrangler secret` — **nie** in `wrangler.toml` oder Code.
- `RUN_KEY` schützt den manuellen `/run`-Endpoint; ohne korrekten Key → 403.
- Throttle: max. 1 Post pro POST-Cron (2×/Tag) → schützt einen jungen Account vor Spam-Blocks.
  Threads via `SKIP_THREADS=1` (in `[vars]`) abschaltbar.
