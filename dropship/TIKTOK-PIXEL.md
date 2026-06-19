# 🎯 TikTok-PIXEL — Autonomie in allen Varianten (User 2026-06-19 „pixel autonom in alle variante, fallback")

> **Pixel-ID: `D8EKVR3C77U6KT5BTBD0`** · **Status: LIVE auf luxestyle.ch** (verifiziert 2026-06-19).
> Monitor: `automation/tiktok-pixel-check.mjs` (prueft alle Varianten, meldet wenn etwas nicht geht). No-op-sicher.

## ✅ Aktive Varianten (Redundanz = wenn eine ausfaellt, traegt die andere)
1. **Browser-Pixel (Theme-Snippet)** — `TIKTOK_PIXEL_ID="D8EKVR3C77U6KT5BTBD0"` + ttq base code im Storefront-HTML.
   **Consent-gated** (DSGVO): feuert erst nach Cookie-„Alle akzeptieren" (`lx-consent-granted`).
2. **Shopify-TikTok-App Web-Pixel** — der TikTok-Verkaufskanal (Publication „TikTok") injiziert einen Web-Pixel
   (Customer-Events-Sandbox) → sendet CompletePayment etc. automatisch.

## 🛟 Fallback-Kette (falls Browser-Pixel mal nicht feuert)
- **(a)** Shopify-TikTok-App im Admin neu verbinden (Kanal „TikTok" → Pixel D8EKVR… waehlen, Datenfreigabe MAX).
- **(b)** Theme-Snippet pruefen (ttq base code im theme.liquid; Consent-Banner muss sichtbar sein, sonst feuert nichts).
- **(c)** **Server-side TikTok Events API** (zuverlaessigste Variante, umgeht Adblocker/iOS/No-Consent):
  Shopify-Order-Webhook → Cloud-Worker → `POST business-api.tiktok.com/.../event/track` mit Pixel-ID + Access-Token.
  Braucht: Pixel-ID (haben) + TikTok-Access-Token (OAuth, wie Posting). NICHT noch eingerichtet — bei Bedarf bauen.

## ⚠️ Wichtigster Hebel JETZT
Der Browser-Pixel feuert **nur nach Cookie-Zustimmung** → der **Consent-Banner muss prominent + funktionierend** sein,
sonst sammelt der Pixel kaum Daten (= Kampagnen-Optimierung leidet). Banner/Theme = Theme-Session (SHARED-MEMORY).

## 🤖 Autonomie
`automation/tiktok-pixel-check.mjs` laeuft im Bot-Zyklus + `improve.sh` → prueft regelmaessig, dass der Pixel in
mind. einer Variante feuert. Meldet 🔴 wenn KEINE Variante aktiv → dann Fallback-Kette abarbeiten.

## 🔴 Was nur der User kann (kein API-Weg)
- TikTok-Ads-Konto mit dem Pixel verknuepfen + **bezahlte Conversion-Kampagne** starten (der eigentliche Reichweite-Hebel).
- Im TikTok Events Manager pruefen, ob Events ankommen (Test-Event-Tool).
