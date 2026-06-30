# 🌐 Browser-Auftrag für PC-Claude — Tracking-Pixel reparieren (Port-Bot 9222)

> **Für den PC-Claude mit Brave-Agent (Port 9222, eingeloggt in Meta / Shopify / Klaviyo).**
> Die Cloud-Session hat am Live-HTML von `luxestyle.ch` forensisch belegt, **warum der Verkaufs-Funnel
> leer ist**: die Tracking-Pixel sind kaputt/leer. Das kann nur ein eingeloggter Browser fixen — die
> Cloud-Session hat keinen. Optional vorab das Helfer-Skript laufen lassen (öffnet alle Tabs + liest die
> Meta-Pixel-ID): `node automation/local/tracking-fix-browser.mjs`.

## 🔬 Befund (hart, am Code belegt — 2026-06-30)
| Pixel | Status | Beleg im Storefront-HTML |
|---|---|---|
| **Facebook** | 🔴 TOT | `girally_facebook_id = '';` (leer) → `fbq('init','')` feuert ins Nichts |
| **Google Ads** | 🔴 TOT | `girally_google_id = '';` (leer) → keine Conversion |
| **Klaviyo Onsite** | 🔴 FEHLT | kein `klaviyo.js?company_id=XWqMAD` → „Viewed Product = 0" |
| **TikTok** | 🟢 LEBT | `TIKTOK_PIXEL_ID="D8EKVR3C77U6KT5BTBD0"` feuert |

**Folge:** Selbst der wenige Traffic wird von FB/Google/Klaviyo nicht erfasst → keine Retargeting-Audience,
keine Conversion-Messung, Klaviyo-Flows ohne Onsite-Trigger. Doppeltes Leck (zu wenig Traffic **und** kein Tracking).

## Fakten
- Shopify-Store: **LuxeStyle** · Admin `https://admin.shopify.com/store/au3j0y-hq`
- Storefront-Domain (richtig): **luxestyle.ch** — Klaviyo zeigt fälschlich auf **luxestyle.com.co**.
- Klaviyo `company_id` / public key: **XWqMAD** · Account-Währung steht falsch auf **USD** (→ CHF).
- Die FB/Google-IDs werden von der Shopify-App **„girally"** in das Theme injiziert (leere Variablen).

---

## A) Meta-Pixel-ID besorgen (Quelle für Schritt B)
1. Öffne **https://business.facebook.com/events_manager2** (Brave eingeloggt) → **Datenquellen / Data sources**.
2. **Existiert ein Pixel/Dataset?** → notiere die **15–16-stellige ID** (unter dem Pixel-Namen).
   - **Kein Pixel vorhanden?** → „**Datenquelle verbinden**" → **Web** → Pixel anlegen (Name z. B. „LuxeStyle CH"),
     Domain **luxestyle.ch**. ID notieren.
3. (Optional, beste Datenqualität) Im Pixel → **Einstellungen** → **Conversions-API** kannst du später aktivieren;
   für den Sofort-Fix reicht die Pixel-ID.

## B) Facebook + Google in der „girally"-App eintragen  → behebt 🔴 FB + 🔴 Google
1. **https://admin.shopify.com/store/au3j0y-hq/apps** → App **„girally"** öffnen (Feed/Pixel-App; ggf. Name
   wie „Facebook Feed", „Google Feed & Pixel" — die App, die `girally_*`-Variablen setzt).
2. In den App-Einstellungen das Feld **Facebook Pixel ID** finden → die ID aus Schritt A eintragen.
3. Falls vorhanden: **Google Ads Conversion ID / Merchant** eintragen (aus `ads.google.com`, sonst leer lassen).
4. **Speichern.**
5. **Gegencheck:** `https://luxestyle.ch` neu laden → Seitenquelltext → es darf **nicht** mehr
   `girally_facebook_id = ''` stehen, sondern die echte ID. (Oder Meta-Pixel-Helper-Extension = grün.)

## C) Klaviyo Onsite-Tracking gegen luxestyle.ch  → behebt 🔴 „Viewed Product = 0"
1. **https://www.klaviyo.com/integration/shopify** (eingeloggt).
2. Prüfe die verbundene Store-Domain. Steht sie auf **.com.co** oder fehlt das Onsite-Tracking:
   - **Shopify-Integration re-synchronisieren / neu verbinden** gegen **luxestyle.ch**.
   - **„Onsite tracking" / „Active on site" / Web-Feed AKTIVIEREN** (lädt `klaviyo.js` mit `company_id=XWqMAD`).
   - Alternativ in Shopify: Klaviyo-**App-Embed** im Theme-Customizer aktivieren (Theme → Anpassen →
     App-Einbettungen → Klaviyo „Onsite" einschalten).
3. **Gegencheck:** `https://luxestyle.ch` Quelltext → muss jetzt `static.klaviyo.com/onsite/js/klaviyo.js?company_id=XWqMAD` enthalten.

## D) Klaviyo-Account korrigieren (Kosmetik, aber sauber)  → Settings → Account
1. **https://www.klaviyo.com/settings/account**
2. **Website-URL:** `https://luxestyle.ch` (war `luxestyle.com.co`).
3. **Preferred currency:** **CHF** (war USD).
4. **Speichern.**

## E) Budget-Hinweis
🟢 **TikTok-Pixel lebt schon.** Wenn Budget freigeschaltet wird: **zuerst TikTok Ads** — dort trackt es ab Sekunde 1.
FB/Google erst, nachdem Schritt B grün ist.

---

## ✅ Fertig-Meldung an die Cloud-Session
Wenn die Gegenchecks (B5 + C3) grün sind, der Cloud-Session sagen:
**„Tracking gefixt — FB-Pixel <ID>, Klaviyo-Onsite aktiv"** → dann verifiziert die Cloud-Session autonom am
Live-HTML, dass alle Pixel feuern, und dokumentiert es in SHARED-MEMORY.

> Hinweis: Selektoren/Menüs der Apps können sich ändern — wo ein Feld nicht exakt so heisst, sinngemäss
> handeln (Pixel-ID = die 15–16-stellige Zahl; Onsite-Tracking = das, was `klaviyo.js` auf die Seite bringt).
