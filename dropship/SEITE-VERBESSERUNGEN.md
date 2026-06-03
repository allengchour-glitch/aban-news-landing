# 🛠️ luxestyle.ch — Verbesserungen & Tools (Audit 2026-06-03)

Live-Audit der Startseite + Tool-Recherche. **Theme ist API-gesperrt → die meisten Fixes laufen über den
Customizer (du) bzw. App-Installation.** Ich kann Produkte/Kollektionen/SEO per API, aber keine Theme-Sections/Apps.

## 🔴 Dringend (Glaubwürdigkeit)
1. **Ankündigungsleiste verlinkt auf fremdes Admin (BESTÄTIGT, exakt lokalisiert):** Der Banner-Text
   „Gratis-Versand ab CHF 65 · –10% WELCOME10 · 30 Tage Rückgabe" hat
   `href="https://admin.shopify.com/store/aban-192/themes"` → Kunde landet im fremden Shopify-Login.
   → **Customizer → Ankündigungsleiste → Link-Feld** leeren ODER auf `/collections/sommer` setzen. (1 Min.)
2. ~~Platzhalter-Produkte „Produkttitel · CHF 19.99"~~ → **FALSCHALARM** (WebFetch-Halluzination). Live-HTML
   geprüft: Startseite zeigt **23 echte Produkte**. Kein Fix nötig.

## 🟠 Hoher Hebel (Conversion)
3. **Review-Sterne auf Produktkacheln/Startseite fehlen** (Judge.me ist installiert, Widget nicht auf den
   Kacheln aktiv). → Judge.me: „Star rating"-Widget auf Collection/Product-Cards aktivieren + Reviews importieren.
4. **Keine Zahlungs-Icons / Trust-Badges im Footer.** → Customizer-Footer: TWINT/Visa/MC/PayPal-Icons + „Sicher bezahlen / 30 Tage Rückgabe"-Badge.
5. **Sticky „In den Warenkorb"** fehlt (mobil). → App EA Sticky Add to Cart (gratis).

## 🟡 Feinschliff
6. **Hero-Headline conversion-schwach** („Premium-Looks für jeden Auftritt"). Schärfer + Nutzen/Preis-Anker
   (der TikTok-Gewinner): z.B. „Schweizer Sommer-Mode — Designer-Look, fairer Preis. –10% mit WELCOME10".
7. **Dynamische Gratis-Versand-Leiste** („Noch CHF X bis Gratis-Versand") statt statischem Banner → +AOV.

## 🧰 Empfohlene Tools (alle mit Gratis-Tier)
| Tool | Löst | Hinweis |
|---|---|---|
| **Judge.me** (installiert) | Review-Sterne auf Kacheln + Auto-Review-Mails | nur Widget aktivieren + Reviews importieren |
| **Hextom Free Shipping Bar** | dynamische „noch CHF X"-Leiste | bewiesen ~+11% AOV |
| **EasyApps Suite** | Popup + Free-Shipping-Bar + Countdown + Sticky-ATC in einem | 1 App statt 4, gratis |
| **EA Sticky Add to Cart** | Sticky-ATC mobil | falls nur das fehlt |
| **ReConvert** | Post-Purchase-Upsell nach Checkout | erst relevant, sobald Käufe fliessen |

**Reihenfolge:** Erst die 🔴-Glaubwürdigkeits-Fixes (kosten 0, sofort), dann Judge.me-Sterne, dann 1 Conversion-App
(EasyApps Suite deckt am meisten ab). App für App messen (sauberes Vorher/Nachher).

## Was ich autonom übernehmen kann (per API, kein Theme)
- Hero-/SEO-Texte als Vorschläge liefern (Theme-Eintrag = du).
- Judge.me-Reviews-Strategie + welche Produkte zuerst.
- Kollektions-Inhalte/SEO weiter optimieren.
- Nach jeder Änderung per ShopifyQL messen (ATC-Rate).

## ✍️ Fertige Texte (1× im Customizer einsetzen)
**Hero:**
- Headline: `Schweizer Sommer-Mode 2026 — Designer-Look, fairer Preis.`
- Subline: `Premium-Looks ab CHF 34.90 · Gratis-Versand ab CHF 65 · –10% mit Code WELCOME10`
- Button: `Sommer-Kollektion entdecken` → `/collections/sommer`

**Ankündigungsleiste (Text bleibt, nur Link fixen):**
`Gratis-Versand ab CHF 65 · –10% mit Code WELCOME10 · 30 Tage Rückgabe`  → Link: `/collections/sommer`

**Trust-Block (unter Hero oder im Footer, als Icon-Reihe):**
- ✓ Schweizer Shop · schnelle Lieferung
- ✓ Gratis-Versand ab CHF 65
- ✓ 30 Tage Rückgabe
- ✓ Sichere Zahlung: TWINT · Visa · Mastercard · PayPal

Quellen: Shopify App Store (Marketing & Conversion), Judge.me, Hextom, EasyApps Suite.
