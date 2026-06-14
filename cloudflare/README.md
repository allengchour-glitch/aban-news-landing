# LuxeStyle Autopilot — Cloudflare Worker

Lässt die tägliche **Veredelungs- + Social-Pipeline auf Cloudflare** laufen, komplett **unabhängig von
GitHub Actions** (die zeitweise gesperrt sind). Cron Triggers steuern alles:

| Cron (UTC) | Task | Was passiert |
|---|---|---|
| `04:30` | **ENHANCE** | Nächstes kuratiertes Produktfoto → Gemini 2.5 Flash Image (produkt-treue Editorial-Szene) → JPG in **R2** → fertiger Post in die **KV-Queue** (mit Produktlink-Caption) |
| `05:15` & `05:25` | **REEL** | Veredeltes Bild als Start-Keyframe → **Luma** (ruhige Kamerafahrt, Produkt bleibt echt) → MP4 in **R2** → Video-Post in die Queue. Der 2. Lauf resümiert lange Renders (Zustand in KV). |
| `09:00` & `17:00` | **POST** | Nächster Queue-Eintrag (Bild **oder** Reel) → Meta-Graph-API → **Instagram + Facebook + (optional) Threads** |

Bild und Video liegen öffentlich unter `{PUBLIC_BASE}/enhanced/<name>.jpg` bzw. `{PUBLIC_BASE}/reels/<name>.mp4`
und werden vom Worker direkt aus R2 ausgeliefert — damit hat Meta die geforderte öffentliche Medien-URL.

> **Reels sind optional:** ohne `LUMA_API_KEY` ist der REEL-Task ein sauberer No-op; ENHANCE + POST laufen normal.

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
npx wrangler secret put LUMA_API_KEY          # optional, aktiviert die täglichen Reels
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

# 1 Reel rendern (Luma → R2 + Queue); ggf. 2× aufrufen bis das Video fertig ist
curl "https://luxestyle-autopilot.dein-name.workers.dev/run?task=reel&key=DEIN_RUN_KEY"

# Medien im Browser ansehen
#   https://luxestyle-autopilot.dein-name.workers.dev/enhanced/<name>.jpg
#   https://luxestyle-autopilot.dein-name.workers.dev/reels/<name>.mp4

# 1 Post absetzen (Bild oder Reel, IG/FB/Threads)
curl "https://luxestyle-autopilot.dein-name.workers.dev/run?task=post&key=DEIN_RUN_KEY"

# Live-Logs
npx wrangler tail
```

---

## 🖨️ Gelato-Fulfillment — eigenes Design → echter Druckauftrag

Schliesst die Lücke beim „Selbst gestalten"-Editor: Wenn ein Kunde **sein eigenes Design** auf ein
Print-on-Demand-Produkt (z. B. Loungewear-Hoodie) legt, hängt der Editor die fertige **Druckdatei-URL**
als Bestell-Eigenschaft an (`properties['🖼️ Druckdatei']`, Rückseite `'Hinten · 🖼️ Druckdatei'`).
Der Worker fängt den **Shopify-`orders/create`-Webhook** ab und legt daraus **automatisch einen
Gelato-Druckauftrag** an.

> No-op-sicher: ohne `GELATO_API_KEY` passiert nichts; Bestellungen ohne Druckdatei oder ohne
> SKU-Mapping werden übersprungen (Hinweis im Log). Idempotent (jede Order nur 1×). HMAC-geprüft.

**A. Secrets + Var setzen**

```bash
npx wrangler secret put GELATO_API_KEY          # Gelato-API-Key (Ecommerce/Order-API)
npx wrangler secret put SHOPIFY_WEBHOOK_SECRET   # = Signatur-Secret aus dem Shopify-Webhook (Schritt C)
# In wrangler.toml [vars]:  GELATO_DRAFT = "1"   → Testmodus (Entwurf, kein echter Druck). Später "0".
```

**B. SKU → Gelato-productUid-Map in KV ablegen** (welche Shopify-Variante = welches Gelato-Produkt):

> ✅ **Bereits fertig vorgebaut:** `cloudflare/gelato_map.json` (50 DTG-Varianten der 8 Swiss-Edition-Loungewear-
> Produkte, keyed nach Shopify-Variant-ID, Platzierung `front`). Einfach hochladen:

```bash
npx wrangler kv key put --binding=STATE gelato_map --path=gelato_map.json
```
Der Stickerei-Jogger «Edelweiss» ist bewusst NICHT dabei (Stickerei ≠ Foto-Upload). Neue Produkte später
ergänzen: `node ../automation/gelato_discover.mjs` (Key als Env-Var) listet Store/Produkte; productUids stehen
je Variante im Produkt-Detail. Fallback-Keys, falls keine Variant-ID/SKU passt: `product_id`.

<details><summary>Map manuell statt aus Datei</summary>

```bash
npx wrangler kv key put --binding=STATE gelato_map '{
  "55803254473089": { "productUid": "apparel_product_gca_sweatshirt_..._gpr_4-0_gildan_18000", "files": { "front":"front" } }
}'
```
</details>

**C. Shopify-Webhook anlegen** — Einstellungen → **Benachrichtigungen → Webhooks** →
„Webhook erstellen": Ereignis **Bestellungserstellung**, Format **JSON**,
URL = `{PUBLIC_BASE}/webhooks/orders/create`. Shopify zeigt danach das **Signatur-Secret** →
genau das als `SHOPIFY_WEBHOOK_SECRET` (Schritt A) setzen und neu deployen.

**D. Testen** (ohne echte Bestellung): RUN_KEY umgeht die HMAC-Prüfung für den Probelauf:

```bash
curl -X POST "https://…workers.dev/webhooks/orders/create?key=DEIN_RUN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"id":9001,"currency":"CHF","email":"test@luxestyle.ch",
       "shipping_address":{"first_name":"Test","last_name":"K","address1":"Bahnhofstr 1","city":"Zürich","zip":"8001","country_code":"CH"},
       "line_items":[{"id":1,"sku":"EDELWEISS-HOODIE-M","quantity":1,"title":"Hoodie",
         "properties":[{"name":"🖼️ Druckdatei","value":"https://res.cloudinary.com/dwyi6kkrl/image/upload/sample.png"}]}]}'
```
→ Mit `GELATO_DRAFT="1"` erscheint der Auftrag als **Entwurf** im Gelato-Dashboard (kein echter Druck).
Passt alles → `GELATO_DRAFT="0"` und neu deployen ⇒ Produktion läuft vollautomatisch.

## Kosten
- Gemini 2.5 Flash Image: ~$0.04/Bild × 1/Tag ≈ **$1.2/Monat**.
- Cloudflare Workers/R2/KV: im **Free-Tier** für dieses Volumen kostenlos.

## Sicherheits-Hinweise
- Alle Tokens nur als `wrangler secret` — **nie** in `wrangler.toml` oder Code.
- `RUN_KEY` schützt den manuellen `/run`-Endpoint; ohne korrekten Key → 403.
- Throttle: max. 1 Post pro POST-Cron (2×/Tag) → schützt einen jungen Account vor Spam-Blocks.
  Threads via `SKIP_THREADS=1` (in `[vars]`) abschaltbar.
