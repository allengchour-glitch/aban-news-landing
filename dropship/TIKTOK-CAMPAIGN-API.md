# 🚀 TikTok-Kampagne per Marketing API (autonom aus der Cloud)

## Ehrlich: braucht App-Review (2-3 Tage) — KEIN Same-Day-Weg fürs echte Konto
Die Marketing API ist getrennt vom Content-Posting. Ohne genehmigte Marketing-API-App + autorisiertes Konto
geht KEIN echter API-Launch. Sandbox sofort (kein echtes Geld). Darum: HEUTE = manueller 5-Min-Klick; API = Zukunft.

## Token holen (User, einmalig)
1. business-api.tiktok.com/portal → My Apps → Create New
2. Scopes: Ads Management + Creative Management + Reporting → app_id + secret notieren
3. Redirect URL: https://luxestyle.ch/
4. Zum Review einreichen (2-3 Tage) ODER Sandbox-Toggle für Sofort-Tests (kein echtes Geld)
5. Nach Freigabe: Advertiser-Auth-URL öffnen → Konto 7646349875793182738 freigeben → auth_code
6. Token: POST /open_api/v1.3/oauth2/access_token/ {app_id,secret,auth_code} → access_token (langlebig)
7. Token als ENV TT_MKT_TOKEN setzen (NIE ins Repo) → dann: node automation/tiktok-campaign-api.mjs

## Tool macht dann selbst: campaign → video upload → identity → adgroup → ad (Traffic, CH, 20/Tag, See-Test-Reel)
