# 🌙 Abend-Arbeitsliste — LuxeStyle (alles, was nur DU machen kannst)

> Von oben nach unten abarbeiten — sortiert nach **Wirkung**. Jede Aufgabe mit Klick-für-Klick.
> Stand: 2026-06-08. Was Claude autonom konnte, ist erledigt (20 neue Produkte, Auto-Maschine, Posts, SEO).
> Diese Liste = die Klicks, die nur über deinen Browser/Login gehen.

---

## ⭐ 1. SECRETS SETZEN → schaltet die Voll-Automatik scharf (größter Hebel)
**Wirkung:** Danach holt der **Autopilot** 2×/Tag neue Produkte, die **Auto-Queue** reiht sie ein, der **Cron** postet sie an FB/Threads/IG — alles **ohne dich**.

**Wo:** GitHub → Repo `aban-news-landing` → **Settings → Secrets and variables → Actions → New repository secret**
Direktlink: https://github.com/allengchour-glitch/aban-news-landing/settings/secrets/actions

Diese **4 Secrets** anlegen (Gemini + Meta-Tokens sind schon gesetzt ✅):

| Name | Wert / Woher |
|---|---|
| `SHOPIFY_SHOP` | `au3j0y-hq.myshopify.com` |
| `SHOPIFY_CLIENT_ID` | aus deiner Custom-App (siehe unten) |
| `SHOPIFY_CLIENT_SECRET` | aus deiner Custom-App (`shpss_…`) |
| `CJ_EMAIL` | `allengchour@gmail.com` |
| `CJ_API_KEY` | von `developers.cjdropshipping.com` → **API Key** |

**Shopify Client-ID/Secret holen:**
1. Shopify-Admin → **Einstellungen → Apps und Vertriebskanäle → Apps entwickeln**
2. Deine Custom-App öffnen → **API-Anmeldedaten**
3. **Client-ID** + **Client-Secret** (`shpss_…`) kopieren
4. Unter **Konfiguration → Admin-API-Bereiche** sicherstellen: `write_products`, `read_products`, `write_publications` aktiv → **App neu installieren**, falls Scopes geändert.

**CJ API-Key holen:** `www.cjdropshipping.com/myCJ.html#/apikey` → **Generate** → kopieren.

> ✅ Test danach: Schreib mir „Secrets gesetzt" — ich löse einen End-to-End-Lauf aus und zeige dir, dass die Maschine selbstständig Produkte holt + postet.

---

## ⏰ 1b. DSers-Pro-Trial läuft am **9. Juni** ab → in 24h voll ausnützen, dann kündigen
**Plan:** 1 Tag vorher kündigen ✅ (kein Doppel-Abo — nur **ein** DSers-Eintrag in Shopify-Billing, bitte gegenchecken).
**Nur Pro-Aktionen nutzen, deren Ergebnis nach dem Downgrade BLEIBT** (Free hat ein Produkt-Limit → nicht 20'000 importieren, sonst verlieren sie Sync/Auto-Preis):
1. **Automatic Pricing Rule einmal anwenden** (×2.8, Endung .90) → gesetzte Preise bleiben dauerhaft.
2. **Supplier Optimizer über den ganzen DSers-Bestand** → schnellere/günstigere Lieferanten (Ship-from-CH/EU); Mapping bleibt.
3. **Die 6 unmapped US-Produkte fertig mappen** (sonst nicht bestellbar) — dauerhaft.
4. **Kuratierten Winner-Batch importieren — nur so viele, wie Free dauerhaft trägt**, voll gemappt + Pricing-Rule drauf.
5. **Bundle/BOGO-Mapping** für Sets (Pro-only) — bleibt aktiv.
> Hinweis: Unser Katalog (206) läuft über die **CJ-API**, nicht DSers. Pro-Features greifen nur auf AliExpress-Produkte,
> die DU in DSers importierst. Grösster bleibender Wert = **Punkt 1–3**. Danach kündigen.

## 🎨 2. „SELBST GESTALTEN" — echter Live-Designer auf der Webseite
**Wirkung:** Kunden gestalten T-Shirts/Hoodies/Tassen selbst (Text, Foto, Logo) → Druck via Printful. Ersetzt das Wunsch-Design-Formular.

1. **Printful installieren:** Shopify App-Store → „Printful" → **Add app** → Konto verbinden.
2. **Designer-App installieren:** Shopify App-Store → **„Kickflip"** (Alternativen: Teeinblue, Zakeke) → **Add app**.
3. In Kickflip: **Printful als Fulfillment** verbinden, 1 Basis-Produkt (z. B. T-Shirt) als „customizable" anlegen.
4. **Schreib mir „Designer steht"** → ich hänge den „Gestalten"-Button + Basis-Produkte (T-Shirt/Hoodie/Tasse) in die Seite/Menü „🎨 Selbst gestalten" ein.

---

## 🛠️ 3. CUSTOMIZER-FEINSCHLIFF (Theme-Editor → „Anpassen")
**Wirkung:** Vertrauen + Conversion + richtige Marke.

1. **Footer-Social-Links fixen** (zeigen aktuell auf „Abannews"!):
   Customizer → unten **Footer** bzw. **Theme-Einstellungen → Social Media** → eigene Links eintragen:
   - Facebook: `https://www.facebook.com/1049840534888592`
   - Instagram: `https://www.instagram.com/luxestyle.ch`
   - Threads: `https://www.threads.net/@luxestyle.ch`
2. **Judge.me-Sterne auf Produktkacheln** aktivieren (Judge.me-App → Widgets → „Star rating" als Theme-App-Embed an).
3. **Sticky „In den Warenkorb"** (mobil) — falls Theme-Option vorhanden, an.
4. **Kachel-Bildverhältnis „square"** — Customizer → Produkt-Sektionen → image_ratio = square.

---

## 📣 4. REICHWEITE — der eigentliche Verkaufs-Engpass (0 Käufe trotz Traffic)
**Wirkung:** Ohne das verkauft der beste Shop nichts.

1. **TikTok-Pixel** + **EINE** saubere Kampagne: Ziel **„Complete Payment"**, CH / Frauen / 18–34 / DE+FR, 20 CHF/Tag Test, nur TikTok-Placement. Alle Auto-/Smart-Kampagnen AUS.
2. **Meta-Pixel** (falls Meta-Ads geplant).
3. **AGB-/Policy-Domain:** Shopify → Einstellungen → **Richtlinien** → in den Texten `aban-192.myshopify.com` → `luxestyle.ch` ersetzen.

---

## 📲 5. TIKTOK-POSTING freischalten
**Wirkung:** Dann postet die Maschine auch auf TikTok automatisch (aktuell nur FB/Threads/IG).
1. `developers.tiktok.com` → App **„LuxeStyle Poster"** → **Content Posting API** → **Review/Audit beantragen** (Beschreibung, Demo-Video, Datenschutz-URL).
2. Nach Freigabe: Repo-Variable `TT_PRIVACY_LEVEL = PUBLIC_TO_EVERYONE`.

---

## 🧹 6. AUFRÄUMEN (2 Min, optional)
Shopify → Sammlungen → tote Archiv-Collections **„Aus Verkaufskanälen entfernen"** (nicht die 8 Menü-Collections / `sommer`):
`[ARCHIV] Pet & Tierbedarf`, `[ARCHIV] Fitness & Sport`, `[ARCHIV] Tech & Gadgets` u. a.

---

## 🔁 Reihenfolge-Tipp
**1 (Secrets) → 4 (Reichweite)** bringen am meisten. **2 (Designer)** ist das coole neue Feature.
Schreib mir nach jedem Schritt das Stichwort („Secrets gesetzt" / „Designer steht" / „Pixel läuft") — dann übernehme ich sofort den automatisierbaren Rest.
