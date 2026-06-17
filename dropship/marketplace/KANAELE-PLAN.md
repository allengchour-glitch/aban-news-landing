# 🛒 LuxeStyle — „Überall verkaufen" (Multichannel-Plan)

Ziel: maximal viele **legale** Verkaufskanäle, um den echten Engpass (Reichweite) zu lösen.
Regel: offizielle **API** → sonst **Bulk-Feed/CSV** → sonst **PC-Claude im Browser** (Port 9222). Kein ToS-Bruch / kein Bot-Scraping (schützt das Konto).

## ⚖️ Wichtigste Regel: nur lager-fähige Ware auf Marktplätze
Marktplätze (Ricardo/Galaxus/eBay/Amazon) **bestrafen lange Lieferzeiten** mit schlechten Bewertungen → Konto-Risiko.
→ Nur **BigBuy** (Marke + EAN + EU-Lager, 2–7 Tage) und **Gelato/Printful** (EU-POD). **CJ-China-Artikel NICHT** auf Marktplätze.
Master-Feed: **`dropship/marketplace/luxestyle-master-export.csv`** (39 Produkte, 32 Marken, mit EAN — der wiederverwendbare Grundbaustein für ALLE Kanäle).

## 📊 Kanal-Matrix
| Kanal | Reichweite | Weg | Wer macht's |
|---|---|---|---|
| **Shopify-Storefront** (luxestyle.ch) | Basis | — | ✅ live |
| **Google Shopping** (Merchant Center) | hoch, gratis | Feed (Shopify-Sync) — verbunden | ✅ läuft; Feed clean halten (ich, API) |
| **Facebook/Instagram Shop** | hoch | Meta-Katalog via Shopify-Sales-Channel | OAuth-Login = **User**; Sync danach = automatisch |
| **TikTok Shop** | hoch (CH begrenzt) | Shopify-TikTok-Channel | Konto/Login = **User** |
| **Pinterest** | mittel | Katalog via Shopify | Login = **User** |
| **Ricardo.ch** | hoch (CH-Käufer!) | Profi-Konto + Bulk-CSV/API | Konto+Verif = **User**; CSV = ✅ ich; Einstellen = User/PC-Claude |
| **Galaxus/Digitec Marktplatz** | sehr hoch (CH #1) | Marketplace-Partner-Konto + Feed | Konto = **User** (Bewerbung); Feed = ✅ ich |
| **tutti.ch** | mittel (privat) | manuelle Inserate (kein Bulk-API) | **PC-Claude** im Browser oder manuell |
| **eBay.ch / Amazon.de** | sehr hoch | Verkäuferkonto + EAN-Feed | Konto = **User**; Feed = ✅ ich (EAN vorhanden!) |

## ✅ Was ich (Cloud, per API) autonom kann
- Master-CSV bauen/aktualisieren (✅ erledigt).
- Pro Kanal die CSV ins jeweilige Import-Format mappen (Ricardo/Galaxus/eBay/Amazon-Templates), sobald Kanal gewählt.
- Shopify-Produkte in alle verbundenen Sales-Channels publizieren (Google/FB/Pinterest/TikTok) — bereits 6 Kanäle.
- Google-Merchant-Feed sauber halten (EAN/`custom_product`).

## 🟡 Was nur User / PC-Claude kann (Konto/Login/Recht — legal nicht umgehbar)
- Verkäufer-/Partner-Konten anlegen + Identitäts-/Gewerbe-Verifizierung (Ricardo, Galaxus, eBay, Amazon).
- OAuth-Logins (Meta/TikTok/Pinterest-Katalog verbinden).
- UI-Einstellen, wo es kein Bulk-API gibt (tutti) → **PC-Claude über Browser-Port 9222**.

## ▶️ Empfohlene Reihenfolge (höchster CH-Hebel zuerst)
1. **Google Shopping** schärfen (läuft, gratis Reichweite) + **FB/IG-Shop** verbinden (OAuth = 1 User-Klick).
2. **Galaxus-Marktplatz** + **Ricardo** Profi-Konto beantragen (CH #1 + #2) → ich liefere die Feeds.
3. **eBay.ch/Amazon.de** mit dem EAN-Feed (BigBuy-Marken sind dort gut listbar).
4. **tutti** nur ergänzend (manuell/PC-Claude).
