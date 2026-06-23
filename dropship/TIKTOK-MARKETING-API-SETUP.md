# 🔌 TikTok Marketing API — Setup (für Klicks/Kosten/Conversions autonom lesen)

> ⚠️ **WICHTIG:** Die **Marketing API** (Ads/Reporting) ist NICHT die Content-Posting-API (die „luxe"-App fürs Posten).
> Andere Domain (`business-api.tiktok.com`), anderer Token, Header **`Access-Token`** (NICHT `Bearer`).
> Damit liest man **Klicks, Kosten (spend), CPC, Conversions, complete_payment** = die Pixel-(D8EKVR)-attribuierten Ergebnisse.

## 📋 Schritte (du, ~30 Min + Review)
1. **Entwickler werden:** `business-api.tiktok.com/portal` → mit dem TikTok-for-Business-Konto einloggen, das „LuxeStyle CH Ads" besitzt → Entwickler-Terms akzeptieren.
2. **App erstellen:** My Apps → Create App → Name, Firma, App-URL `luxestyle.ch`, **Redirect/Callback-URL** (z.B. `https://luxestyle.ch/tiktok-callback` — muss exakt matchen). Produkt **Marketing API** aktivieren.
3. **Credentials kopieren:** App-Seite zeigt **App ID + Secret**.
4. **Scopes:** **Ads Management + Reporting** anfragen.
5. **OAuth:** „Advertiser authorization URL" der App im Browser öffnen → als LuxeStyle-Ad-Konto-Inhaber **Authorize** → Redirect enthält `auth_code` (kopieren, läuft in Minuten ab!).
6. **Token holen** (1 POST, server-seitig):
   `POST https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/` mit `{app_id, secret, auth_code, grant_type:"authorization_code"}` → Antwort enthält **access_token** + **advertiser_ids** + **refresh_token (~1 Jahr)**.

## 📊 Lese-Endpoint (Klicks/Kosten)
```
GET https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/
Header: Access-Token: <access_token>
?advertiser_id=<ID>&report_type=BASIC&data_level=AUCTION_CAMPAIGN
&dimensions=["stat_time_day","campaign_id"]
&metrics=["spend","impressions","clicks","cpc","ctr","conversion","cost_per_conversion","complete_payment","complete_payment_roas"]
&start_date=...&end_date=...&page_size=1000
```

## 🔑 ENV (für die VPS-`.env` — NIE in den Chat!)
```
TIKTOK_APP_ID=        TIKTOK_APP_SECRET=        TIKTOK_REDIRECT_URI=
TIKTOK_ACCESS_TOKEN=  TIKTOK_REFRESH_TOKEN=     TIKTOK_ADVERTISER_ID=
TIKTOK_PIXEL_ID=D8EKVR3C77U6KT5BTBD0
```

## ⚠️ Top-3-Fallen
1. **Falsche API-Familie:** `developers.tiktok.com` (Login/Posting, `Bearer`) ≠ Ads-API (`business-api.tiktok.com`, `Access-Token`). Die „luxe"-App taugt NICHT fürs Reporting.
2. **Redirect/auth_code:** Callback muss zeichengenau matchen; `auth_code` ist Einweg + läuft in Minuten ab → sofort tauschen.
3. **Pixel-Events nicht roh lesbar:** Pixel-Ergebnisse kommen über `report/integrated/get` (conversion/complete_payment), nicht als Roh-Hits.

## 🟢 Sandbox = sofort, ohne Approval
Im Portal **Sandbox-Ad-Konto** anlegen → OAuth + Reporting **sofort testbar** (Code bauen). Produktion (echtes Konto) = App-Review **~paar Tage–2 Wochen** (prüft Datenschutz + Use-Case).

## 🤖 Was ICH dann mache:
Sobald **`TIKTOK_ACCESS_TOKEN` + `TIKTOK_ADVERTISER_ID` in der VPS-`.env`** sind, baue ich **`tiktok-stats.mjs`** (täglicher VPS-Job): zieht spend/clicks/conversions → stempelt ins Shop-Metafeld `luxe.tiktok_stats` → **ich sehe Klicks+Kosten dann autonom** (wie `pixel_status`).

## Reihenfolge-Empfehlung:
1. **Zuerst Kampagne live** (sonst 0 Daten). 2. **Dann** API (Sandbox → Review → Token in VPS). 3. Ich baue den Stats-Job.
Quelle: business-api.tiktok.com/portal/docs · developers.tiktok.com/doc/oauth-user-access-token-management
