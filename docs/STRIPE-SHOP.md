# Vollautonomer Shop (Stripe) — Grundgerüst

Anders als Lemon Squeezy erlaubt **Stripe** das Anlegen von Produkten, Preisen und Bezahllinks
**per API** → der Shop richtet sich selbst ein. Auslieferung geschützt über eine Cloudflare-Function.

## Wie es funktioniert
1. `automation/stripe_sync.py` liest `data/kit-catalog.json` und legt je Kit **idempotent** an:
   Produkt → Preis (EUR) → **Payment Link** (Redirect auf `danke-kit.html`). Schreibt `data/shop-products.json`.
2. Workflow `stripe-shop.yml` baut die Kits, legt sie unter **gehashtem Namen** in `downloads/kits/` ab
   (unrätbar dank `DOWNLOAD_SALT`) und ruft `stripe_sync.py`.
3. `shop.html` liest `data/shop-products.json` → Kauf-Buttons sind live.
4. Nach Zahlung leitet Stripe auf `danke-kit.html?session_id=…` → `functions/api/kit-download.js`
   **verifiziert die Zahlung serverseitig** und gibt den Download-Link frei.

## Einmalige Voraussetzung (du)
- **Stripe-Konto** anlegen, API-Key holen (https://dashboard.stripe.com/apikeys).
- **GitHub-Secrets:** `STRIPE_API_KEY`, `DOWNLOAD_SALT` (irgendein langer Zufallsstring).
- **Cloudflare-Pages → Settings → Environment variables:** dieselben `STRIPE_API_KEY` + `DOWNLOAD_SALT`
  (für die Download-Function). Niemals in den Code.
- Danach: Workflow **„Stripe-Shop (autonom)"** starten → fertig. Neue Branchen = `kit-catalog.json` ergänzen
  + Workflow erneut. Kein manuelles Hochladen mehr.

## Ehrlich
- Auslieferung ist **soft-gated**: Download-Link wird erst nach verifizierter Zahlung gezeigt, der
  Dateiname ist gehasht/unrätbar. Hartes DRM gibt es bei statischem Hosting nicht — für €12-Kits ok.
  Maximale Sicherheit später: Dateien in Cloudflare R2 + signierte URLs (Ausbau).
- Stripe ist **kein** Merchant of Record → bei dir (CH, MwSt-frei) unkritisch; bei EU-Umsatzschwellen
  ggf. später Steuer prüfen. Lemon Squeezy (MoR) bleibt die Alternative, wenn du das auslagern willst.
- Stripe-Gebühr ~1.5–2.9 % + fix pro Transaktion.

## Go-Live in 4 Schritten
1. **Secrets setzen:** GitHub → `STRIPE_API_KEY` (sk_…), `DOWNLOAD_SALT` (langer Zufallsstring).
2. **Cloudflare-Pages → Env:** dieselben `STRIPE_API_KEY` + `DOWNLOAD_SALT` (für die Download-Function).
3. **Workflow „Stripe-Shop (autonom)" starten** → Produkte/Links/ZIPs entstehen, `shop.html` wird live.
4. **Prüfen:**
   - `python3 tools/shop_selfcheck.py` (lokal) → zeigt, welche Kits live sind und ob die Kette stimmt.
     Mit `DOWNLOAD_SALT=… python3 tools/shop_selfcheck.py` werden auch die ZIP-Hash-Namen exakt geprüft.
   - Browser: `https://abannews.com/api/kit-download?session_id=cs_test_123abc`
     → muss `{"error":"Zahlung nicht gefunden."}` liefern (Gate lehnt unbezahlte/unbekannte Sessions ab).

Neue Branche dazu: nur `data/kit-catalog.json` ergänzen + Workflow erneut starten. `shop_selfcheck.py`
sagt dir danach, ob das neue Kit live ist.

## Status
Grundgerüst steht & ist no-op-sicher (ohne `STRIPE_API_KEY` passiert nichts). Aktivierung = Secrets setzen.
**Selbsttest:** `tools/shop_selfcheck.py` (Konsistenz Katalog ↔ Live-Produkte ↔ ZIPs ↔ Gate-Hash).
