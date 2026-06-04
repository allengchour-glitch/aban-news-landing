# Auto-Posting: Instagram · Facebook · Threads · TikTok

Ziel: die fertigen Reels aus `reels/` automatisch auf alle 4 Kanäle posten.
**Tokens gehören NIE in den Code** — nur in Repo-Secrets (`Settings → Secrets → Actions`)
bzw. in n8n-Credentials. Skripte lesen sie aus `process.env`.

---

## 1) Instagram + Facebook  → `social/meta_post.mjs`  (FERTIG)

Eine Meta-App deckt **beide** ab (App „LuxeStyle Social", App-ID 1680844973132194).

### Token mit den richtigen Rechten holen (einmalig, ~2 Min)
developers.facebook.com/tools/explorer → App **LuxeStyle Social** → Permissions anhaken:
`instagram_basic`, `instagram_content_publish`, `pages_show_list`,
`pages_manage_posts`, `business_management` → **Generate Access Token**.

> Das bisherige Token hatte nur Ads-/Lese-Rechte → konnte NICHT posten.

### Voraussetzungen
- IG-Konto muss **Business/Creator** sein und mit der **Facebook-Page** verknüpft
  (Meta Business Suite → Einstellungen → Instagram verbinden).
- **IG zieht Videos nur von einer öffentlichen HTTPS-URL** (kein Datei-Upload).
  → Reel vorher öffentlich machen, z. B. als **GitHub-Release-Asset** oder Shopify-CDN.

### Posten
```bash
export META_USER_TOKEN="EAAX..."          # nie committen
node social/meta_post.mjs --page "LuxeStyle CH" \
  --video "https://<oeffentliche-url>/reel.mp4" \
  --caption "Sommer-Looks ✨ -10% mit WELCOME10 · Gratis-Versand ab CHF 65 🇨🇭" \
  --dry         # erst Trockenlauf (prueft Konto/IG-Link), dann ohne --dry posten
```
`--ig` = nur Instagram · `--fb` = nur Facebook · ohne Flag = beide.

---

## 2) Threads → eigene API (separates Token)

Threads hat eine **eigene** Graph-API (`graph.threads.net`), NICHT dieselbe wie IG.
- App im Meta-Dashboard für **Threads** freischalten (Use case „Threads API").
- Token-Rechte: `threads_basic`, `threads_content_publish`.
- Flow analog IG: Container (`/me/threads` mit `media_type=VIDEO`, `video_url`) → `/me/threads_publish`.
- TODO: `social/threads_post.mjs` (baue ich, sobald Threads-App-Zugang + Token da sind).

## 3) TikTok → Content Posting API (separates Token, eigenes Dev-Portal)

TikTok ist komplett getrennt von Meta: developers.tiktok.com.
- App anlegen, Produkt **„Content Posting API"** aktivieren.
- Scopes: `video.publish` (Direct Post) bzw. `video.upload` (Entwurf in den TikTok-Posteingang).
- OAuth → `access_token` + `refresh_token` (Token kurzlebig, refreshen).
- Upload: `POST /v2/post/publish/video/init/` (PULL_FROM_URL mit öffentlicher Reel-URL
  oder FILE_UPLOAD) → Status pollen.
- **App-Review** nötig für öffentliches Direct-Posting; ohne Review nur „unaudited"
  (Posts privat/nur Tester sichtbar).
- TODO: `social/tiktok_post.mjs`.
- Hinweis: Es gibt bereits `tools/tiktok_analyze.py` (liest Performance) — das ist Read-only,
  nicht zum Posten.

---

## Reihenfolge / was als Nächstes passiert
1. **Neues Meta-Token mit den 3 Posting-Rechten** + IG↔Page verknüpft → IG+FB-Test (1 Reel, dann Rest).
2. Reel-Public-URL-Schritt (GitHub-Release-Asset) ins Skript/Workflow einbauen.
3. Threads-App-Zugang → `threads_post.mjs`.
4. TikTok-Dev-App + Content-Posting-API → `tiktok_post.mjs`.

Alle Tokens danach als Secrets hinterlegen: `META_USER_TOKEN`, `THREADS_TOKEN`,
`TIKTOK_ACCESS_TOKEN` / `TIKTOK_REFRESH_TOKEN`.
