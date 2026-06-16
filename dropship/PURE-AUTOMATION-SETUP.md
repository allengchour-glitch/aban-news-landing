# 🤖 PURE AUTOMATION — Einrichtung (einmal machen, dann hands-off)

> Ziel: Shop läuft so autonom wie technisch möglich. **3 Ebenen.** Ebene 1 (Cloud) läuft nach
> **einem** Deploy für immer ohne PC/GitHub. Ebene 2 (PC) deckt die Browser-only-Aufgaben ab.
> Ebene 3 (Conversion) läuft bereits. Unten: was geht pure-cloud, was braucht 1× PC, was ist Hard-Limit.

---

## ✅ EBENE 1 — Cloud-Engine (Cloudflare Worker `luxe-poster`) — ZERO-TOUCH nach 1× Deploy
**Was sie kann (alles automatisch, Gratis-Cron, kein PC/GitHub):**
- Postet **IG + FB + TikTok-Entwurf** 3×/Tag (CH 12/17/21 Uhr) — Queue **loopt endlos** (läuft nie leer).
- **Kommentar-Auto-Antwort** (themen-erkennend, Spam-Skip, idempotent) bei jedem Cron.
- **Meta-Analyse** 6×/Tag (Engagement → KV-Log, abrufbar via `?insights=1`).
- **FB-Stories + FB-Reels** + alte-FB-Posts-Cleanup.
- Inhalt **ohne Redeploy** aktualisierbar: `?key=…&queue=<URL>` zeigt auf eine Live-JSON (sonst eingebackene `queue.json`).

**Einmal einrichten (PC, ~5 Min):**
```
cd automation/cloudflare/luxe-poster
npx wrangler kv namespace create LUXE_KV      # gibt eine id aus
# → die id in wrangler.toml bei [[kv_namespaces]] statt REPLACE_WITH_KV_ID eintragen
npx wrangler secret put META_ACCESS_TOKEN     # Langzeit-Page-Token (Graph API)
npx wrangler secret put TRIGGER_KEY           # = Abanaban192+  (für Handy-Trigger)
# optional TikTok-Direktposten:
npx wrangler secret put TT_CLIENT_KEY
npx wrangler secret put TT_CLIENT_SECRET
npx wrangler secret put TT_REFRESH_TOKEN
npx wrangler deploy
```
**Danach:** läuft auf Cloudflare-Cron für immer. Kein erneuter Deploy nötig, außer der Code ändert sich.
Dieser eine Deploy aktiviert auch: Handy-Befehlsqueue (`&cmd=`), `&replies=1`, FB-Stories/Reels.

**Status prüfen (Handy/Browser):**
`https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B&status=1` → Cursor/Queue-Länge.

---

## 💻 EBENE 2 — PC-Tagestask (Browser-only, kein API möglich)
Diese drei gehen **prinzipiell nicht aus der Cloud** (Instagram/TikTok/tutti haben kein Post-/Follow-API):
tutti-Inserate, Schweizer-Follower-Wachstum, TikTok-Reel-Upload.

**Einmal als Windows-Aufgabe einrichten → dann täglich automatisch:**
1. Brave/Chrome **dauerhaft** mit `--remote-debugging-port=9222` laufen lassen, eingeloggt bei IG + TikTok + tutti.
2. `automation/local/run-follower-daily.ps1` als **geplante Aufgabe** (Windows Task Scheduler, 1×/Tag) eintragen.
   Macht: Follower-Wachstum (Caps IG 40/TikTok 30) + tutti (2/Tag) + TikTok-Upload + wöchentlich Unfollow.
3. Optional **Handy-Fernsteuerung**: `automation/local/pc-listener.ps1` (Start: `START-LISTENER.bat`) dauerhaft laufen lassen
   → pollt alle 90 s die Worker-Befehlsqueue → du tippst am Handy `&cmd=tutti|follower|tiktok|all`.

> Hard-Limit: Ohne laufenden PC + eingeloggten Browser gibt es für diese drei **keinen** Automatik-Weg. Das ist Plattform-bedingt.

---

## ✅ EBENE 3 — Conversion (läuft schon pure-auto, nichts zu tun)
- Klaviyo-Flows live: Abandoned Cart/Checkout, Welcome, Win-Back, Post-Purchase. WELCOME10 aktiv.
- Feuern automatisch bei jedem Traffic/Abbruch (Recovery-Mail nur wenn E-Mail im Checkout erfasst).

---

## ⚠️ Bekannte Lücken / Hard-Limits
- **GitHub Actions kontoweit GESPERRT** → kein Cron dort. Deshalb läuft alles über Cloudflare-Worker + PC-Task.
  (Pinterest-Autopost hing an Actions → ruht bis Actions frei ODER in den Worker portiert.)
- **Klaviyo Konto-URL/Währung** (`.com.co`/USD): nur UI, keine API → 1× manuell.
- **Bezahl-Abschluss** (TWINT/Karte) + **Ads-Pixel/Kampagne**: brauchen dich (kein API/Budget-Weg).

---

## 🎯 Reihenfolge für „läuft von selbst"
1. **Ebene 1 deployen** (5 Min PC) → Cloud postet + antwortet + analysiert für immer.
2. **Ebene 2 als Task einrichten** (10 Min PC) → Browser-Aufgaben täglich automatisch.
3. **Die 5 Conversion-Klicks** aus `TODO.md` (TWINT/Pixel/Free Listings/Klaviyo) → damit der Traffic auch kauft.
Danach: nur noch „Auswertung" sagen, wenn du Zahlen sehen willst.
