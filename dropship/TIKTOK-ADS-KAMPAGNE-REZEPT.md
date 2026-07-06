# TikTok-Ads-Kampagne — fertiges Rezept (Stand 2026-07-06)

> Ausführbar von JEDER Session mit verbundenem TikTok-Ads-MCP
> (`https://business-api.tiktok.com/open_mcp/tt-ads-mcp-flat`, Tools `mcp__TikTok_Ads__*`).
> Alle Assets liegen bereits öffentlich auf der Shopify-CDN. Reihenfolge strikt einhalten.

## Fertige Assets (öffentlich, HTTP-200-verifiziert)
- **Video** (12,8 s, 1080×1920, 5 Viral-Produkte, Hook «Welcher Look ist deiner?», luxe-premium-Musik, kein Voiceover):
  `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/auto-20260706-1647_84d645be-770b-4c16-bff3-6e19c892163c.mp4?v=1783357581`
- **Cover** (9:16 JPG, Frame @1,5 s):
  `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/ad_cover_3ba315c9-90bc-4aa1-8fdc-9b7074aef188.jpg?v=1783357586`

## Feste IDs (verifiziert Juli 2026)
| Was | Wert |
|---|---|
| advertiser_id | `7646349875793182738` («LuxeStyle CH Ads») |
| Business Center (bc_id) | `7640770639476817938` |
| Pixel (Code / pixel_id) | `D8EKVR3C77U6KT5BTBD0` / `7646354888245739527` (Event SHOPPING) |
| Identity (BC_AUTH_TT «Luxestyle.ch») | identity_id `58a7b00c-ffa0-5de4-8abb-d7609912782b`, identity_authorized_bc_id `7640770639476817938` |
| Schweiz location_id | `2658434` |

## Schritte
1. **Video hochladen** — `file_video_ad_upload`: advertiser_id, `upload_type=UPLOAD_BY_URL`, `video_url=<Video-URL oben>`, `flaw_detect=true`, `auto_fix_enabled=true`, `auto_bind_enabled=true` → `video_id` merken.
2. **Cover hochladen** — `file_image_ad_upload`: `upload_type=UPLOAD_BY_URL`, `image_url=<Cover-URL oben>` → `image_id` merken.
3. **Kampagne** — `campaign_create`: `objective_type=WEB_CONVERSIONS`, `campaign_name="LuxeStyle CH Conversion Juli 2026"`, `budget_mode=BUDGET_MODE_INFINITE` (kein CBO — Budget liegt auf der Adgroup).
4. **Adgroup** — `adgroup_create`:
   - `promotion_type=WEBSITE`, `placements=["PLACEMENT_TIKTOK"]` (kein Pangle/Global)
   - `location_ids=["2658434"]`, `gender=GENDER_FEMALE`, `age_groups=["AGE_18_24","AGE_25_34"]`, `languages=["de","fr"]`
   - `budget_mode=BUDGET_MODE_DAY`, `budget=20` (CHF), `schedule_type=SCHEDULE_FROM_NOW`
   - `optimization_goal=CONVERT`, `optimization_event=SHOPPING`, `pixel_id=7646354888245739527`
   - `billing_event=OCPM`, `pacing=PACING_MODE_SMOOTH`
5. **Ad** — `ad_create` (creatives-Array):
   - `identity_type=BC_AUTH_TT` + identity_id + identity_authorized_bc_id (s. o.) — Custom-Identities sind auf neuen Konten für TikTok-Placement deprecated!
   - `ad_format=SINGLE_VIDEO`, `video_id` aus Schritt 1, `image_ids=[<image_id aus Schritt 2>]`
   - `ad_text="Sommer-Hits aus der Schweiz. Gratis-Versand ab CHF 65. 10 Prozent Rabatt mit Code WELCOME10."` (≤100 Zeichen, **KEINE Emojis** — Policy-Falle!)
   - `call_to_action=SHOP_NOW`, `landing_page_url=https://luxestyle.ch/collections/viral-hits`
     (Alternative: `/collections/sommer`)
6. **Kontostand prüfen** — `advertiser_balance_get` bzw. `bc_balance_get` (bc_id oben). Bei 0 CHF: Kampagne bleibt stehen → **User muss aufladen** (einziger User-Klick).
7. **Review-Status** — `ad_review_info_get` nach ~1 h prüfen; Ablehnungsgrund ggf. beheben (meist Text/Musik-Policy).

## Lehren (nicht wiederholen)
- Ad-Texte ohne Emoji; Commercial-Music-Library-Musik ist im Reel schon berücksichtigt (Eigenproduktion luxe-premium.wav).
- TikTok-Shopify-App legt automatisch WELTWEITE Smart-Kampagnen an → nach Anlage prüfen, dass keine Auto-Kampagnen aktiv sind.
- Nur Pixel D8EKVR… verwenden (D8EQE4/D85BAG sind Karteileichen).

---
## ✅ AUSGEFÜHRT 2026-07-06 17:35 UTC (Ergebnis)
- video_id: `v10033g50000d95ud0nog65pdp922tg0` · image_id: `ad-site-i18n-sg/20260706c7c71e7754e8b4504d9fbc5d`
- Kampagne: `1869987705486481` · Adgroup: `1869987760755842` (Start 18:00 UTC) · Ad: `1869987634760786`
- Review: **is_approved=true / ALL_AVAILABLE** (sofort genehmigt) · Guthaben: CHF 332.18
- Fix nötig gewesen: `bid_type=BID_TYPE_NO_BID` ergänzen (sonst Fehler 40002 «Please enter a cost per conversion»)
