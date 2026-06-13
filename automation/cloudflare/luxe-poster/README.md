# luxe-poster — autonomes IG/FB-Posting via Cloudflare Worker (Cron)

Ersetzt die gesperrte GitHub-Actions fürs Social-Posting. Postet die nächste Queue-Zeile
(`src/queue.json` = Produkt + CHF-Preis + Shopify-CDN-Bild) über die Meta-Graph-API.
Medien sind öffentliche CDN-URLs → kein ffmpeg/Server nötig, läuft gratis auf Cloudflare.

## Einrichtung (einmalig, ~5–10 Min)
```bash
npm i -g wrangler
cd automation/cloudflare/luxe-poster
wrangler login                      # Cloudflare-Konto verbinden (Browser)

# 1) KV-Namespace anlegen → die ausgegebene id in wrangler.toml bei id="…" eintragen
wrangler kv namespace create LUXE_KV

# 2) Secrets setzen (Werte hast nur du)
wrangler secret put META_ACCESS_TOKEN     # langlebiger Page-/User-Token „LuxeStyle CH"
wrangler secret put TRIGGER_KEY           # frei wählbar (für manuellen Test)

# 3) Deploy
wrangler deploy
```
Danach läuft der **Cron automatisch** (2×/Tag, siehe `wrangler.toml` → `crons`). **Kein Nachfragen mehr.**

## Manuell testen / Status
```
https://luxe-poster.<dein-subdomain>.workers.dev/?key=DEIN_TRIGGER_KEY            # postet 1×
https://luxe-poster.<dein-subdomain>.workers.dev/?key=DEIN_TRIGGER_KEY&status=1   # zeigt cursor/total
```

## Token (1× erzeugen, dann ~nie erneuern)
developers.facebook.com → Graph API Explorer (App „LuxeStyle Social") → Scopes
`pages_show_list, pages_manage_posts, instagram_basic, instagram_content_publish`
→ Token generieren → in „Access Token Debugger" **Extend** (langlebiger User-Token).
Der Worker findet die Page + IG-ID daraus selbst (`/me/accounts`) und cached sie in KV.

## Queue nachfüllen
`src/queue.json` ergänzen (image = öffentliche CDN-URL, caption = Text) → `wrangler deploy`.
Reels/Videos: `{"type":"reel","video":"<mp4-url>","caption":"…"}` (IG Reel; FB als Link-Fallback).
Cursor steht in KV (Key `cursor`); zum Neustart: `wrangler kv key put --binding LUXE_KV cursor 0`.

## Grenzen
- TikTok öffentlich + Follower-Wachstum gehen NICHT über API → PC-Claude/Browserbase.
- Luma-Video-Generierung läuft besser auf GitLab/PC (CPU-Limits der Workers).
