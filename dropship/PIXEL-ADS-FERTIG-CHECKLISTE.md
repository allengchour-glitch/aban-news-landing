# ✅ PIXEL + ADS „FERTIG MACHEN" — komplette Abschluss-Checkliste (2026-06-28)

## ✅ FERTIG (von mir, API/Code — nichts mehr zu tun)
- Pixel D8EKVR verifiziert eingebaut + feuert PageView (live geprüft)
- Conversion-Funnel komplett: Hook + Garantie-Block auf wasserfest-Collection, allen 7 wasserfest-PDPs, Herz-Muschel, Geburtsstein, + Trust-Blocks auf damen-mode/sommer/highlights
- Ad-Creative (Sound-On See-Test-Reel) + clean Landing (WELCOME10 → wasserfester-schmuck) + Mundart-Ad-Text — startklar
- Kill/Scale-Engine (Simo-Formel) läuft autonom (luxe.ad_decision)
- Server-CAPI gebaut (tiktok_capi.mjs) — wartet nur auf Token
- Reader gebaut (luxe.tiktok_stats/ad_decision) — liest Ad-Zahlen automatisch

## 🔴 NUR DU (Konto/Settings/Token — Cloud kann das nicht) — in Reihenfolge der Wirkung:

### 1. Pixel-Verdrahtung fixen (KRITISCH für Ad-Optimierung)
Shopify Admin → Apps → TikTok → Datenfreigabe/Einstellungen → Pixel/Dataset auf **„LuxeStyle CH Pixel" D8EKVR3C77U6KT5BTBD0** stellen (aktuell zeigt der App-Pixel auf den Geist D8EQE4 → Kauf-Events gehen ins Leere). Detail: FIX-PIXEL-WIRING-2026-06-28.md

### 2. Geister-Pixel löschen
Events Manager → Data sources → **D8EQE4** + **D85BAG** entfernen (0 Events, verwirren nur).

### 3. Consent entsperren (höchster Daten-Hebel)
Theme/Settings: CH-Shop → Tracking ohne Opt-in-Pflicht / Consent-Default = akzeptiert → D8EKVR feuert ALLE Events für ALLE Besucher (statt nur nach Cookie-Klick).

### 4. Meta-Token fixen (organischer Traffic = #1 für Verkäufe ohne Ad)
Neuer Meta-Token mit 6 Scopes (pages_manage_posts + IG-publish) → wrangler secret. Detail: FIX-META-TOKEN-2026-06-28.md

### 5. TikTok-Ad live schalten
**Smart+ in der Shopify-App** (5 Min, einfachster Weg) ODER Marketing-API-Token besorgen → dann läuft tiktok-campaign-api.mjs deterministisch. (Browser-Bot ist tot, bestätigt.)

### 6. (Optional) CAPI aktivieren
Events-API-Token (d0a7…) in /opt/luxe/.env als TT_EVENTS_API_TOKEN → server-seitiges Tracking läuft automatisch.

## Reihenfolge-Tipp
Für ERSTE VERKÄUFE am schnellsten: **#4 (Meta-Token)** → organischer Traffic auf den fertigen Funnel. Für bezahlte Ads sauber: **#1 + #3 + #5**.
