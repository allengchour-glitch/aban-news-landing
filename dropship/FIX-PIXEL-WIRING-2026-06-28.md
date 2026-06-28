# 🚨 FIX: Kauf-Events gehen an den FALSCHEN (Geister-)Pixel (2026-06-28)

## Befund (live Storefront geprüft)
- **Ad-Landing + Homepage:** TikTok-Pixel **D8EKVR3C77U6KT5BTBD0** (echt, „LuxeStyle CH Pixel") feuert — aber nur **PageView** (consent-gesperrt).
- **Produktseite (web-pixels-manager / Shopify-TikTok-App):** Customer-Events-Pixel ist auf **D8EQE4JC77UAEKHUJCM0** gesetzt = der **GEISTER-Pixel** (in Events Manager 0 Events, „Missing events Critical").
- Kauf-Events sind verdrahtet (`AddToCart`, `Purchase` im Markup), aber sie gehen an **D8EQE4**, nicht an den echten Ad-Pixel.

## Folge (kritisch für Ads)
Eine TikTok-Kampagne optimiert auf **D8EKVR**. Da die ATC/Purchase-Events aber an **D8EQE4** (Geist) gehen, sieht die Ad **keine Conversions** → kann nicht auf Käufer optimieren → Budget-Verschwendung. + D8EKVR bekommt nur PageView (consent-gated).

## FIX (User, im Shopify-TikTok-App / Events Manager)
1. **Shopify Admin → Apps → TikTok → Einstellungen / Datenfreigabe:** als Pixel/Dataset für die Customer-Events den **echten Pixel „LuxeStyle CH Pixel" D8EKVR3C77U6KT5BTBD0** wählen (NICHT D8EQE4).
2. Danach **D8EQE4 + D85BAG löschen** (Geister, 0 Events) → Events Manager → Data sources → Remove.
3. **Consent entsperren** (separater, größerer Hebel): CH-Shop → Tracking ohne Opt-in-Pflicht / Consent-Default = akzeptiert (Theme/Settings) → D8EKVR feuert dann ALLE Events für ALLE Besucher.
4. **Verifizieren:** TikTok Pixel Helper / Events Manager Test-Event → ViewContent/AddToCart/Purchase erscheinen auf **D8EKVR**.

## Ziel-Zustand
EIN Pixel **D8EKVR** macht ALLES (PageView + ViewContent + AddToCart + InitiateCheckout + CompletePayment), consent-entsperrt → die Ad sieht echte Conversions → optimiert auf Käufer. + Server-CAPI (tiktok_capi.mjs, Token d0a7…) als Verstärkung.
