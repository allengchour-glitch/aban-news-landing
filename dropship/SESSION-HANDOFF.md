# 🔄 SESSION-HANDOFF — Dropship LuxeStyle CH

> **Lies das zuerst in einer neuen Session.** Kompletter Kontext + nächster Schritt.
> Stand: 2026-05-30 · Branch: `claude/dropship-lade-memory-SrAs5` · PR #5 (Draft)

---

## ✅ STRATEGIE-ENTSCHEIDUNG (2026-05-30)
**CJ-only.** Allen bleibt bei CJdropshipping als einziger Quelle — Grund: günstigste Option
(0 € Abo, größtes Sortiment). KEINE Ergänzungsplattform (Spocket/Syncee verworfen).
→ Für schnellen CH-Versand stattdessen **CJ-Frankfurt-EU-Lager** nutzen: `CJ_COUNTRY=DE` im Importscript.

## ⚠️ THEME/ADMIN GEHT NICHT AUTONOM (getestet 2026-05-30)
Browser-Zugriff hilft NICHT für Shopify-Admin/Theme-Editor: Login-Wall
(`accounts.shopify.com/login`) + Cloudflare-Bot-Verification blocken headless-Browser.
Kein Passwort-Abfragen, kein Display. → Hero einsetzen, Markenfarben, Cookie-Banner,
Collections ausblenden bleiben **manuell beim User** (Theme-Editor/Admin).
Lesende Storefront-Screenshots gehen weiterhin (öffentlich).
Hero-Bild liegt bereit: `dropship/assets/hero-sommer-palmblatt.jpg`.
CJ-Limit am Abend des 2026-05-30 weiterhin erschöpft (mehrfach getestet) → Reset abwarten.

## 🔴 OFFENER NÄCHSTER SCHRITT (hier weitermachen)

**Autonomer CJ-Produkt-Import — Pipeline STEHT, Auth verifiziert. Blocker: CJ-Tageslimit.**

Allen will Produkte **autonom** importieren (nicht manuell in DSers klicken).
Recherche-Ergebnis: **Geht — über die CJ-API, nicht DSers.**

- ❌ **DSers** hat KEINE Merchant-API zum Produktimport (nur Partner-„Supplier/Channel Apps").
- ✅ **CJdropshipping** Merchant-API funktioniert. **Auth am 2026-05-30 erfolgreich getestet**
  (`code:200 Success`, openId 38304). Credentials sind bekannt:
  `CJ_EMAIL=allengchour@gmail.com`, `CJ_API_KEY=<32-stelliger Key, NICHT im Repo>`.
  ⚠️ Key wurde im Chat geteilt → Allen sollte ihn in CJ rotieren; neuen Key als env setzen.
- Deine 8 Live-Produkte sind eh schon CJ-SKUs (`CJ-…`) → passt perfekt.

### ⛔ Aktueller Blocker (2026-05-30, geprüft 17:33)
CJ-API: `code:1600200 — daily request limit (1000/day) reached, made: 1000`.
Account-Kontingent heute aufgebraucht. **Reset: nach Mitternacht China-Zeit (CST).**
Mehrfach getestet — bleibt bis Reset gesperrt. → Morgen Script starten, läuft autonom.

### ▶️ MORGEN — EIN BEFEHL (Limit frei):
```
CJ_EMAIL=allengchour@gmail.com CJ_API_KEY=<key> CJ_COUNTRY=DE node dropship/cj_import.mjs
```
`CJ_COUNTRY=DE` = nur Frankfurt-EU-Lager-Artikel → 5-10 T CH-Versand statt 7-14 aus China.
Danach lege ich die Treffer via Shopify-MCP fulfillment-fähig an (siehe unten).

### ⭐ STRATEGIE-ENTSCHEIDUNG (2026-05-30): CJ-EU-Lager nutzen
Allen will CJ NICHT ersetzen, sondern um **EU-Lager-Sourcing** ergänzen (kein 2. Account).
→ CJ-Frankfurt-Lager (`countryCode=DE`) = 5–10 T CH-Versand statt 7–14 aus China.
→ API-verifiziert: `/product/list?countryCode=DE` filtert EU-Bestand. Script unterstützt `CJ_COUNTRY`.
→ Details: `dropship/EU-LAGER-STRATEGIE.md` (2-Tier-Logik Express vs. Standard, Versand-Badges).

### Startklar gebaut: `dropship/cj_import.mjs`
Liest Creds aus env, holt Token (gecached `/tmp/cj_token.json`), sucht die Kandidaten,
gibt JSON-Brief aus. **Aufruf mit EU-Lager-Filter:**
```
CJ_EMAIL=allengchour@gmail.com CJ_API_KEY=<key> CJ_COUNTRY=DE node dropship/cj_import.mjs
```
Danach pro Treffer via Shopify-MCP `create-product`: DE-Copy (LuxeStyle-Stil), Tags `cj-real`,
Marge ≥ 2.5× Kost, VK auf `.90`, Inventar `DENY`+untracked, Collection „Neu 2026", ACTIVE.

### Verifizierte CJ-API-Endpoints
- `POST /api2.0/v1/authentication/getAccessToken` `{email, apiKey}` → `data.accessToken` (1×/5min)
- danach Header: `CJ-Access-Token: <token>`
- `GET /api2.0/v1/product/list?pageNum=1&pageSize=5&productNameEn=<kw>` → Suche
- `GET /api2.0/v1/product/query?pid=<pid>` → Detail (Variants/SKUs/Bilder)

---

## ✅ Was bereits erledigt ist

1. **8 CJ-Dropship-Produkte LIVE geschaltet** (DRAFT→ACTIVE, 8/8 ok) auf luxestyle.ch.
   Liste mit SKUs: siehe `dropship/PRODUKT-PIPELINE.md` Abschnitt 1.
2. **Voll-Audit** des Katalogs (5.288 Produkte) via Shopify Admin API.
   Kernbefund: **nur 8 Produkte storeweit haben CJ-SKU** = einzige auto-fulfillbare Items.
   1.148 ACTIVE (manuell bestückt), ~4.130 Drafts ohne SKU (nicht fulfillbar).
3. **Marktrecherche Summer/CH 2026** (autonom): Store deckt Summer-Basics schon ab;
   8 echte Lücken-Kandidaten als Import-Brief dokumentiert.
4. **Committet + PR #5 (Draft):** `dropship/PRODUKT-PIPELINE.md`.

---

## 🧰 Umgebungs-Fakten (für die neue Session wichtig)

| Thema | Stand |
|---|---|
| Shopify | MCP verbunden (Store „LuxeStyle CH", luxestyle.ch, CHF, Basic). Voller Zugriff. |
| CJ-API | Erreichbar aus Umgebung (HTTPS 200). Braucht `CJ_EMAIL`+`CJ_API_KEY`. |
| DSers | Login-gated SPA, KEINE Merchant-API. Kein Desktop/Display (`DISPLAY` leer). |
| Browser | Playwright + headless Chromium installiert (`/opt/node22`). TLS-Proxy → `ignoreHTTPSErrors:true` nötig. |
| Semrush MCP | Verbunden, aber Plan deckt MCP NICHT ab → unbrauchbar. |
| WebSearch/WebFetch | Funktionieren (für Recherche genutzt). |
| Offene Bestellung | #1001, CHF 21.90, bezahlt, **unfulfilled** (ggf. erledigen). |

---

## 📂 Wichtige Dateien
- `dropship/PRODUKT-PIPELINE.md` — Ist-Zustand, 8 Live-SKUs, Marktrecherche, 8 Kandidaten, Workflow
- `dropship/SESSION-HANDOFF.md` — dieses Dokument

## 🚀 So startet die neue Session
Sag einfach: **„lies dropship/SESSION-HANDOFF.md"** — dann ist der ganze Kontext da.
Dann: CJ-API-Key besorgen/setzen → autonomer Import läuft.

## ⚠️ DON'Ts
- KEINE Produkte mit erfundenen/Fake-SKUs anlegen → genau das erzeugt den un-fulfillbaren
  Draft-Müll, der den Katalog schon verstopft. Nur echte CJ-SKUs.
- KEINE Passwörter/Keys im Klartext-Chat anfordern → env-Variablen bevorzugen.
- NICHT alle 4.130 Drafts blind live schalten (Saison-Mix, nicht fulfillbar).
