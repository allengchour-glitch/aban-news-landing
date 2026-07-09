# 🛒 BigBuy-Produkte auf eBay verkaufen — Setup (einmalig, ~20 Min)

**Stand: 2026-07-09.** Die Pipeline ist fertig (`automation/ebay_listing_pipeline.mjs`) und
im DRY-Run getestet. Es fehlen nur die eBay-Verkäufer-Zugänge — die kann **nur der User**
erzeugen (Browser-Login + OAuth-Zustimmung). Danach listet die Pipeline autonom.

## Warum das erlaubt ist
eBay verbietet Dropshipping **von Einzelhändlern** (z. B. Amazon → eBay). Erfüllung direkt
durch einen **Grosshändler** (BigBuy) ist ausdrücklich erlaubt. Wichtig: Lieferzeit ehrlich
angeben (BigBuy EU-Lager: meist 3–7 Werktage DE).

## Die 4 Schritte (nur du)
1. **eBay-Verkäuferkonto** (falls nicht vorhanden): verkaufen.ebay.de → gewerblich empfohlen.
2. **Developer-Keyset**: developer.ebay.com → „Create Application Keys" (Production).
   → `EBAY_SELL_CLIENT_ID` + `EBAY_SELL_CLIENT_SECRET`
3. **OAuth-Zustimmung** (einmalig): developer.ebay.com → „User Tokens" → „Get a Token from
   eBay via Your Application" → Scopes mindestens `sell.inventory` → einloggen, zustimmen
   → **Refresh-Token** kopieren → `EBAY_SELL_REFRESH_TOKEN` (gültig ~18 Monate).
4. **Business Policies** (einmalig im Verkäuferkonto, „Verkäufereinstellungen → Richtlinien"):
   - Zahlungs-Richtlinie → `EBAY_PAYMENT_POLICY_ID`
   - Versand-Richtlinie (3–7 Werktage, versichert) → `EBAY_FULFILLMENT_POLICY_ID`
   - Rückgabe-Richtlinie (14/30 Tage) → `EBAY_RETURN_POLICY_ID`
   - Standort anlegen (Inventory-Location) → `EBAY_MERCHANT_LOCATION_KEY`
   (Policy-IDs zeigt die Sell-API `getFulfillmentPolicies` etc. — oder ich hole sie per API,
   sobald Schritt 2–3 da sind.)

## Danach (mache ich autonom)
```bash
# Kandidaten prüfen (DRY, Default):
node automation/ebay_listing_pipeline.mjs
# Echt listen:
LIVE=1 node automation/ebay_listing_pipeline.mjs
```
- Quelle: `dropship/ebay_listings.json` (kuratiert; wächst mit jedem BigBuy-Import).
- Preisformel: `(EK + Versandpuffer €6) × 1.55`, eBay-Gebühr (~15 %) eingepreist, auf .90.
  Aktuell: Polaroid-Brille → **€34.90** (EK €12.82) · Folli-Follie-Tasche → **€30.90** (EK €10.67).
- Idempotent per SKU (`bb-…`) — mehrfach laufen lassen ist sicher.

## Fulfillment bei Verkauf (wichtig!)
eBay-Verkauf → **BigBuy-Bestellung an die Käuferadresse** auslösen (API vorhanden, PayPal als
Zahlungsmittel beim BigBuy-Konto hinterlegt ✅). Solange das nicht automatisiert ist: bei
jedem Verkauf melden — ich löse die Bestellung dann per API aus (oder baue den Auto-Loop,
sobald erster Verkauf da ist).

## Secrets — NIEMALS ins Repo
Alle o. g. Werte nur als Session-ENV oder GitHub-/Cloudflare-Secrets.
