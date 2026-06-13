# 🧠 LuxeStyle Automation-Gehirn — vollautonomer Betrieb (Stand 2026-06-13)

Ziel (User): „installiere ein Gehirn, volle Automation, ständig Verbesserung, Kontrolle neuer Produkte,
Webseite auf höchstem Niveau." Hier ist das komplette System — **gratis, ohne GitHub Actions** (die sind
account-weit gesperrt), läuft auf **Cloudflare** (keine Kreditkarte).

## 🟢 Die 2 Cron-Worker (das Gehirn)
| Worker | Was | Cron | Setup |
|---|---|---|---|
| **`workers/shop-brain/`** | Prüft neueste Produkte, setzt **fehlende SEO + Kategorie** automatisch (Google-Feed) | alle 6 h | KV + Shopify-Client-Credentials |
| **`workers/pinterest-cron/`** | Postet Pins aus `pinterest_pins.csv` (187 Stück) | Mo & Do | KV + Pinterest-Token (Standard-Access nötig) |

→ Beide deployst du einmal mit `npx wrangler deploy` (Anleitung je im README). Danach **läuft alles von selbst.**

## ✅ Was schon automatisch/verbunden ist (verifiziert)
- **Verkaufskanäle:** alle Produkte auf 6 Kanälen publiziert — **Onlineshop, Shop, TikTok, Facebook/Instagram,
  Google & YouTube, Pinterest**. (Google + Pinterest = bereits verbunden → SEO/Kategorie-Arbeit füttert sie live.)
- **Reviews:** Judge.me installiert (Sterne, Auto-Review-Mails).
- **E-Mail:** Klaviyo (8 Flows: Abandoned, Welcome, Post-Purchase, Win-Back).
- **Discount:** WELCOME10 aktiv bis 31.08.

## 🧩 Apps — was du (nur du, per OAuth-Klick) ggf. noch hinzufügen kannst
**Ich kann keine Apps installieren** (Shopify verlangt deinen Klick im App-Store). Die wichtigen sind schon da.
Optional sinnvoll (gratis-Tier):
- **Shopify Search & Discovery** (bessere interne Suche + „wird oft zusammen gekauft") — gratis, empfohlen.
- **Shopify Email** (Gratis-Kampagnen als Klaviyo-Ergänzung).
- (Sticky-ATC / Sterne-auf-Kacheln laufen über das **Theme/Customizer**, nicht über Apps — siehe
  `dropship/CUSTOMIZER-OPTIMIERUNG.md`.)

## 🔁 Wartungs-Tools (manuell oder via Worker)
- `automation/catalog_enrich.py` — Kategorie + SEO für neue Produkte (gleiche Logik wie Shop-Brain, lokal/CI).
- `automation/gen_pinterest_polish.py` / `gen_pinterest_new.py` — neue polierte Pins rendern.
- `automation/google_category_assign.py` — Taxonomie-Kategorien.
- `automation/seo_catalog_fix.py` — Auto-SEO-Korrektur über den ganzen Katalog.

## 🚦 Was das Gehirn NICHT kann (ehrlich)
- **Theme-Optik** (Banner-Sektion, Sticky-ATC, Sterne auf Kacheln, Startseiten-Rhythmus): nur Customizer →
  `dropship/CUSTOMIZER-OPTIMIERUNG.md` (für dich / PC-Claude).
- **Traffic mit Kaufabsicht** (der eigentliche Engpass): Google Free Listings laufen bereits; Pinterest +
  TikTok-Kampagne brauchen deine Klicks (Pinterest Standard-Access, Ads-Budget).

---
**Kurz:** Deploye die 2 Worker → der Shop pflegt neue Produkte ab dann selbst (SEO/Kategorie) und postet Pinterest
automatisch. Den Rest (Optik/Conversion) erledigt der Customizer-Plan. *Erstellt 2026-06-13.*
