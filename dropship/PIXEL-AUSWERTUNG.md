# 🎯 PIXEL-AUSWERTUNG — LuxeStyle CH (Stand 2026-06-23)

## Was der Pixel erfasst (30 Tage, = Events an TikTok)
| Pixel-Event | Anzahl | Bewertung |
|---|---|---|
| PageView / ViewContent | **7.387** | ✅ reichlich — Pixel feuert sauber |
| AddToCart | **21** (0,28 %) | ⚠️ zu wenig für Kampagnen-Optimierung |
| InitiateCheckout | 17 | ⚠️ wenig |
| CompletePayment | 1 (Testkauf) | ❌ ~0 |

**Pixel-Verdikt:** technisch einwandfrei (feuert, AddToCart verdrahtet, Datenfreigabe `optimized`). Das Problem ist NICHT der Pixel, sondern zu wenig Kauf-Absicht im Funnel.

## 🔴 KRITISCH — Funnel nach Quelle (30T)
| Quelle | Sessions | AddToCart | ATC-Rate |
|---|---:|---:|---:|
| direct | 5.582 | 19 | 0,34 % |
| **social** | **1.763** | **0** | **0,00 %** |
| search | 34 | 2 | **5,9 %** |

**Social-Traffic konvertiert zu 0 %.** Unsere Posts bringen Reichweite, aber keine Käufer (Scroller).
Search konvertiert am besten (Kaufabsicht), hat aber kaum Volumen → SEO/Google = Upside.

## 💡 Konsequenzen
1. **Kampagne (wenn live): Event-Leiter, NICHT direkt auf Kauf.**
   - Start „ViewContent"/„Traffic" (genug Events) → ab ~50 ATC/Woche auf „AddToCart" → dann „CompletePayment".
   - TikTok braucht ~50 Conversion-Events/Woche pro Stufe zum Lernen; aktuell 5 ATC/Woche = zu wenig für ATC-Start.
2. **Social-Content muss kauf-intentiver werden:** Produkt + konkreter CHF-Preis + klarer Nutzen + 1 Produkt-CTA
   (Preis-Vergleich/Save-Format helfen) statt nur schöner Bilder. Auf bewertete/vertrauenswürdige Seiten lenken.
3. **Echter Engpass bleibt Conversion/Trust** (ATC 0,28 % gesamt, Social 0 %): Mobile-PDP + Reviews (Theme-Session).
   Reichweite ist NICHT das Problem — die Umwandlung in Kaufabsicht ist es.
4. **SEO ausbauen** (search 5,9 % ATC): Meta-Beschreibungen/Collections (läuft via VPS/Cloud).

## 🟡 Nur-User (für echte Pixel-Kaufdaten)
- ads.tiktok.com Business-Onboarding → Kampagne auf Event-Leiter starten (Bot `campaign-go` vorbereitet).
- Optional: TikTok-Marketing-API-Token → VPS liest Klicks/Kosten autonom (`luxe.tiktok_stats`).

## Quelle der Zahlen
Shopify-Analytics (ShopifyQL `FROM sessions`), 30-Tage-Fenster, abgefragt 2026-06-23.
