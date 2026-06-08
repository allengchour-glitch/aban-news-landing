# 🔗 SHARED-MEMORY — Koordination aller Claude-Sessions (zuerst lesen!)

> **Mehrere Sessions arbeiten parallel auf DIESEM Repo (`allengchour-glitch/aban-news-landing`)
> UND demselben Shopify-Shop (LuxeStyle, `au3j0y-hq.myshopify.com` / luxestyle.ch).**
> Diese Datei verhindert, dass sie sich gegenseitig überschreiben. **Jede Session:** erst hier rein,
> dann die eigene Detail-Memory. **Nach grösseren Aktionen:** Abschnitt „Live-Stand" unten aktualisieren.
> Stand: 2026-06-08.

---

## 👥 Die Sessions & wem was „gehört" (Konflikte vermeiden)
| Session | Aufgabe | Detail-Memory | Branch |
|---|---|---|---|
| **abannews** | Newsletter/Hubs/Stripe-Shop auf abannews.com (KI-Content, GEO-Reports) | `PROJEKT.md` | eigene `claude/*` |
| **Luxestyle product** (CJ-Dropship) | CJ-Produktimport, Shop-Katalog, Social-Posten, Autopilot | `CLAUDE.md` + `dropship/*` | **`claude/luxestyle-product-CizQ6`** |
| **Dropshipping session** | (überschneidet sich mit ↑ — bitte abstimmen!) | `dropship/*` | — |
| **Lifestyle video project** | Reels/Clips/Video (braucht `YT_API_KEY`) | `video-prototypes/*`, `mediakit/*` | eigene |

> ⚠️ **Wichtigste Regel:** **CJ-Produktimport + Shop-Katalog + Social-Queue = nur die „Luxestyle product"-Session.**
> Andere Sessions: keine Produkte importieren / keine `social/posts_image.csv` ändern, sonst Dubletten/Konflikte.

## 🧱 Geteilte Ressourcen (alle teilen sich diese!)
- **1 Shopify-Shop** (LuxeStyle) — Zugriff über die **Shopify-MCP** (direkt in jeder Session, KEIN Key nötig).
- **1 Repo**, **1 `main`** → vor jedem Push `git pull --rebase`; **nie zwei Sessions gleichzeitig nach `main`**.
- **`social/posts_image.csv`** = Post-Queue (der Autopost-Bot committet sie auf `main`).
- **Bildpipeline** `automation/gen_image_gemini.py` (Vertex) ist für alle nutzbar.

## 🔑 Secrets-Status (geteilt — Stand 2026-06-08)
| Secret | Status |
|---|---|
| `GEMINI_API_KEY` | ✅ gesetzt (Billing aktiv) — KI-Bilder via Action |
| Meta (IG/FB/Threads) | ✅ gesetzt — Social-Posten läuft |
| `SHOPIFY_SHOP` + `SHOPIFY_CLIENT_ID/SECRET` | ❌ offen → für Autopilot/Auto-Queue (User, ABEND-TODO §1) |
| `CJ_EMAIL` + `CJ_API_KEY` | ❌ als Repo-Secret offen (in-Session vorhanden) |
| TikTok | ⏳ Audit nötig |
| `YT_API_KEY` | ❌ offen (Video-Session) |
> Hinweis: Für Shopify-Arbeit **braucht keine Session einen Key** — das geht über die MCP. Keys nur für die Cron-Actions.

---

## 📊 LIVE-STAND (von jeder Session nach Aktionen aktualisieren)
**2026-06-08 — Luxestyle product session:**
- **Katalog:** **204 `cj-real` aktiv** (heute +31 neue Produkte: Mode, Taschen, Schmuck, Schuhe, Home, Gadget, Premium;
  zuletzt Charge 11+12: Jeans-Shorts, Make-up-Tasche, Kerzenwärmer-Lampe, Herren-Jeans, Sommerkleid, Blazer, Henley).
- **Autonome Social-/Sourcing-Maschine gebaut & auf `main`:**
  - `dropship/cj_autopilot.mjs` + `cj-autopilot.yml` (VOLL-AUTO: sucht→QA→Varianten→Gemini-Gate→ACTIVE+publish, 2×/Tag)
  - `automation/queue_new_products.mjs` + `social-queue-build.yml` (reiht neue Produkte autom. in die Post-Queue, 2×/Tag)
  - `automation/social-autopost-meta.mjs` (postet FB/Threads/IG, 2×/Tag) — **läuft schon** (heute 13+ Posts live)
- **Shop-Seiten:** „✨ Entdecken" (`/pages/entdecken`) + „🎨 Selbst gestalten" (`/pages/selbst-gestalten`) + Menü-Leisten.
- **Verbesserungen:** `premium-schmuck`-Menü-Collection auf 84 aufgefüllt (war Discoverability-Lücke); Conversion-Leaks gefixt.
- **Offen (User):** Shopify/CJ-Secrets setzen → dann läuft Sourcing+Posten vollautonom. Siehe **`dropship/ABEND-TODO.md`**.
- **Branch:** alles auf `claude/luxestyle-product-CizQ6` → Draft-PRs nach `main`. ⚠️ Dort steht `MAX_PER_RUN=8` (nur Branch, nicht mergen!).

**2026-06-08 — abannews / video sessions:** (bitte hier eintragen, was ihr am Shop/Repo ändert)
