# ✅ LuxeStyle — TODO (Handy-Durchklick)

> Sortiert nach Impact auf den **1. Verkauf**. Hak ab, was erledigt ist (`[ ]` → `[x]`).
> 🔴 = klicken (Settings) · 💻 = nur am PC (Brave Port 9222, eingeloggt) · 🤖 = läuft autonom.
> Stand-Quelle: `dropship/STATUS.md` (Auswertung) + `dropship/EIN-WEG-ZUM-1-KUNDEN.md`.

## 🔥 Zuerst — klärt das Checkout-Leck (4 Abbrüche CHF 43–72 in 14 T)
- [ ] **1. Testkauf bis zur Bezahlseite** — schließt TWINT/Karte ab? Welche Versandkosten am Ende? *(2 Min, wichtigster Punkt)*
- [ ] **2. 🔴 TWINT/Karten aktiv** → [Shopify Zahlungen](https://admin.shopify.com/store/au3j0y-hq/settings/payments) *(ohne = 0 Käufe möglich)*

## 📣 Dann — Reichweite mit Kaufabsicht
- [ ] **3. 🔴 TikTok Pixel + 1 CH-Kampagne + Budget** → [TikTok Ads](https://ads.tiktok.com/) *(Pixel D8EKVR…, CH/Frauen/18–34, Complete Payment, 20 CHF/Tag)*
- [ ] **4. 🔴 Google Free Listings AN** → [Merchant Center](https://merchants.google.com/) → Wachstum → Listings *(search = nur 4 Sessions/14T → reine Upside, Konto entsperrt)*
- [ ] **5. 🔴 Klaviyo URL→`.ch` + Währung→CHF** → [Klaviyo Konto](https://www.klaviyo.com/settings/account)

## 💻 PC-Browser (nur dort möglich — kein API)
- [ ] **6. `wrangler deploy`** (Worker `luxe-poster`) → schaltet Handy-Fernsteuerung + FB-Stories/Reels + Auto-Reply frei
- [ ] **7. tutti posten:** `AUTO_PUBLISH=1 node automation/local/tutti-post.mjs` *(16 Inserate bereit)*
- [ ] **8. Schweizer Follower:** `node automation/local/ch-follower-growth.mjs` *(noch nie gelaufen → 0 Wachstum bis Start)* + wöchentlich `ch-unfollow.mjs`
- [ ] **9. TikTok-Reels hochladen:** Tagestask `run-follower-daily.ps1` *(stumm — Trend-Sound in der App drauflegen)*

### 📱 Handy-Express (NUR nachdem #6 deployed ist + PC-Listener läuft)
Tippen löst am PC aus (Listener pollt alle 90 s):
- [ ] [⚡ deploy](https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B&cmd=deploy)
- [ ] [🛒 tutti](https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B&cmd=tutti)
- [ ] [👥 follower](https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B&cmd=follower)
- [ ] [🎵 tiktok](https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B&cmd=tiktok)

## 🤖 Läuft schon autonom (nichts zu tun)
- [x] IG/FB-Posting (Cron 3×/Tag, Queue 100+ Posts / 23+ Reels)
- [x] Klaviyo-Flows live (Abandoned Cart/Checkout, Welcome, Win-Back, Post-Purchase) + WELCOME10
- [x] 34 Produkte mit eigenem Produkt-Video
- [x] Katalog/Kategorien sauber, Menü premium, Merchant entsperrt

---
**Wenn 1–5 erledigt → sag „Auswertung"** → ich prüfe Käufe/ATC, verstärke Gewinner, droppe Verlierer.
