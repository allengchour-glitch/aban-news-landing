# 🔎 LuxeStyle — PURE CHECK-ANALYSE 2026-06-18 (volle Delegation, live-Daten)

> User „mach pure checkanalyse". Alles live aus Shopify-Analytics + Storefront + Repo-Health. Stand 19:30 CH.

## 1) TRAFFIC (30 Tage, 3'061 Sessions)
| Quelle | Sessions | Lesart |
|---|---|---|
| direct | 1'854 | grösstenteils **Bots/Junk** (typisch, ignorieren) |
| **social** | **1'151** | ✅ unser autonomes Posten zieht echte Reichweite |
| search | 49 | 🔴 **SEO praktisch tot** → Upside: Google Free Listings |
| unknown | 7 | – |

## 2) GEO — CH-Targeting funktioniert
- **Schweiz 1'626 (53 %)** · USA 720 (24 %) · Rest = global verstreut (Bot-/Junk-Direct).
- ✅ Strikt-CH-Strategie greift. US-Traffic (720) ist da, aber US-Markt ist deaktiviert → erst nach CH-Conversion.

## 3) 🔴 GRÖSSTER LEAK GEFUNDEN: MOBILE
| Gerät | Sessions | Warenkorb-Adds | ATC-Rate |
|---|---|---|---|
| **mobile** | **2'115 (69 %)** | **5** | **0,24 %** 🔴 |
| desktop | 881 | 9 | 1,0 % |
| tablet | 63 | 0 | – |
- **Mobil = 69 % des Traffics, konvertiert aber 4× schlechter als Desktop.** Das ist DER Conversion-Killer.
- Deckt sich mit der Recherche: mobile-first fehlt → langsame Ladezeit / kein Sticky-„In den Warenkorb" / Reibung.

## 4) FUNNEL (14 Tage)
`763 Sessions → 12 Warenkorb → 8 Kasse → 0 Kauf` — zwei Lecks: **(a) Session→Warenkorb (v.a. mobil)**, **(b) Kasse→Kauf (Zahlung)**. 0 Bestellungen.

## 5) PIXEL
- ✅ `D8EKVR3C77U6KT5BTBD0` korrekt installiert, feuert auf Home + PDP.
- ⚠️ **consent-gated** → lädt erst nach Cookie-„Alle akzeptieren". Banner-UX prominenter = mehr Pixel-Daten.
- 🧹 Aufräumen (User-Befugnis erteilt): nur D8EKVR behalten, D8EQE4/D85BAG entfernen (in Ads Manager / per Browser).

## 6) TECHNIK-HEALTH
- ✅ **Alle 106 .mjs + alle .py syntaxfehlerfrei.** Worker frisch deployed (Queue 34, cursor 12/34). KV-Spar-Fix drin.
- ✅ piper-Stimme verfügbar (Voiceover-Videos baubar).

## 🎯 PRIORITÄTEN (nach Impact)
1. **🔴 Mobile-Conversion fixen** [Theme/U] — mobile-first, <3s Ladezeit, Sticky-ATC. 69 % Traffic, 0,24 % ATC = hier liegt das meiste Geld.
2. **🇨🇭 Zahlung** [U] — TWINT + Kauf-auf-Rechnung (Kasse→Kauf-Leck).
3. **Reviews über der Falz** [Theme] — Vertrauen, +15–25 %.
4. **TikTok-Konto-Onboarding** [U] — Zahlungsdaten → dann Kampagne.
5. **SEO/Google Free Listings** [U/Theme] — search=49 = grosses Upside.
6. **Social läuft** [S, autonom] — Reichweite ist NICHT der Engpass; Content + Conversion sind es.

> Kern-Erkenntnis: Reichweite kommt (social 1'151). Es scheitert an **Mobile-UX + Zahlung**. Das sind Theme/User-Hebel —
> meine Lane (Social) liefert; der Flaschenhals liegt jetzt klar im Shop-Erlebnis auf dem Handy + am Checkout.
