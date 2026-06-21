# 💰 Geld verdienen — der kürzeste Weg (Stand 2026-06-21)

Alles Code-seitige ist fertig und getestet (`bash automation/selftest.sh` = grün).
Hier die **echten Einnahmequellen** und was sie zum Laufen braucht.

## 1) Digitaler Shop (Branchen-KI-Kits) — direktes Geld
- ✅ **22 Produkte kaufbar**, alle mit Stripe-Zahlungslink (`data/shop-products.json`).
- ✅ **34 Kit-ZIPs** liegen bereit (`downloads/kits/`), Shop-Selfcheck: 0 Fehler.
- 🔴 **Damit nach der Zahlung das Kit ausgeliefert wird**, brauchen die Functions zwei
  Cloudflare-Pages-Secrets: **`STRIPE_API_KEY`** (Zahlung prüfen) + **`DOWNLOAD_SALT`** (ZIP-Hash).
  → Ohne diese zahlt jemand, bekommt aber keinen Download. **Das ist DER Geld-Blocker.**

**So freischalten (ein Befehl, von deiner erlaubten IP / PC-Claude):**
```bash
export CLOUDFLARE_API_TOKEN=…        # Pages:Edit + D1:Edit
bash automation/setup-cloudflare.sh abannews
# fragt nacheinander STRIPE_API_KEY, DOWNLOAD_SALT, GROQ_API_KEY ab
```
Danach **Kauf-Test**: ein Kit über den Stripe-Link kaufen → der Download muss kommen.

## 2) eBay-Affiliate — läuft bereits
- ✅ `/api/ebay` mit echtem Affiliate-Tracking; verdient bei Klick+Kauf automatisch mit.
- Hebel = **Traffic** auf die Kaufberater-/Angebote-Seiten (siehe Punkt 4).

## 3) Premium-Newsletter — optional
- Stripe/beehiiv-Links sind im Shop/Hub verlinkt. Läuft, sobald Reichweite da ist.

## 4) Reichweite = der eigentliche Umsatz-Hebel (kein Code nötig)
Es liegt ein **fertiger Content-Vorrat** bereit (gratis erzeugt, `freegen/`):
- **451 Hub-Reels** + **6 Promo-Reels** + **9 Karussells** (in den ZIPs/Lieferungen).
- Neue jederzeit: `GROQ_API_KEY=… python3 automation/freegen_carousel.py "Thema"` bzw.
  `… python3 automation/freegen_bot.py --count 5`.

**Posten** (das bringt die Besucher → Shop & eBay):
- Täglich 1 Reel + 1 Karussell auf Instagram/TikTok/LinkedIn, Link in Bio → abannews.com.
- Das Posten selbst muss über dich / PC-Claude laufen (kein Social-API in der Cloud-Session).

## Reihenfolge zum ersten Umsatz
1. `setup-cloudflare.sh abannews` ausführen (Secrets + D1) → **Kauf-Test bestehen**.
2. D1-Binding-Klick im Dashboard (siehe Skript-Ausgabe).
3. Content posten (Vorrat ist da) → Traffic → Shop-Käufe + eBay-Provision.

> Code & Tools sind fertig und grün. Was noch fehlt, ist ausschließlich **Konto-Zugang
> (Cloudflare-Secrets)** und **Verteilung (Posten)** — beides nur von dir machbar.
