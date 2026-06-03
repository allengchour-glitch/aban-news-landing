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

## ✅ ERLEDIGT per API (live, 2026-06-03)
- **Entscheidung: 30 Tage Rückgabe = Standard** (die Ankündigungsleiste verspricht das ohnehin allen Besuchern → rauf-geleveled statt Inkonsistenz).
- **`/collections/sommer`**, **`/collections/damen-mode`**, **`/collections/highlights`**: Beschreibung + SEO geschärft
  mit **Preis-Anker** („Designer-Look, fairer Preis · ab CHF 34.90/14"), Trust vereinheitlicht auf **30 Tage**, WELCOME10.
- Das sind die 3 Top-Landingpages der letzten Tage (Analytics: damen-mode 289 · sommer 194 · highlights 163 Sessions).
- **Offen (Customizer/du):** Ankündigungsleisten-Link-Fix · Hero-Text · Judge.me-Sterne · Trust-Icons · 1 Conversion-App.

## 🔴→✅ GELÖST: „Vorgestellte Produkte · Produkttitel CHF 19.99"-Platzhalter auf der Startseite (2026-06-03)
**Ursache (verifiziert):** Die Homepage-Sektion „✨ CJ Neuheiten 2026" (Horizon, `templates/index.json`,
`product_list_cjneu`) bindet die Kollektion **`neu-eingetroffen`** — diese war **NICHT im Online-Store
veröffentlicht** (`/collections/neu-eingetroffen` → 404). Horizon zeigt bei nicht auflösbarer Kollektion
**Demo-Platzhalter** + Default-Titel „Vorgestellte Produkte".
**Fix (per API, KEIN Theme):** `publishablePublish` der Kollektion `neu-eingetroffen` (ID 687980052865)
auf Publication **Onlineshop** (301970915713). Danach 200, Platzhalter verschwinden (CDN-Cache regeneriert).
**LEHRE:** Startseiten-Platzhalter = eine `product-list`-Sektion zeigt auf eine **unveröffentlichte/leere**
Kollektion. IMMER prüfen: `curl -o /dev/null -w "%{http_code}" https://luxestyle.ch/collections/<handle>` →
404 ⇒ per `publishablePublish` veröffentlichen. (Theme-Sektionen + ihre Collection-Bindung: `theme.files` lesbar,
MAIN nicht schreibbar.)
**KORREKTUR:** Mein früheres „Falschalarm/Halluzination" war falsch — die Platzhalter waren real (im roh-HTML
nur per `grep -o`, nicht mit Kontext-Pattern auffindbar, da minifiziert).
