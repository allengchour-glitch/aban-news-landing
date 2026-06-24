# 🔎 Recherche-Synthese 2026-06-24 — CRO-Hebel + virale Produkte (autonom, 2 Web-Agenten)

> User-Auftrag: „youtube und suche selber verbesserung" → 2 parallele Recherche-Agenten (Web/YouTube),
> Ergebnisse hier festgehalten + sofort die sicheren, **ehrlichen** Hebel live umgesetzt.

## ✅ Bereits LIVE umgesetzt (diese Session, MAIN-Theme 187533001089)
1. **Rotierende Announcement-Bar** (`sections/header-group.json`) — statt 1 statischer Zeile jetzt 4 rotierende,
   Schweiz-Trust zuerst (stärkster Hebel bei 0 Reviews):
   - 🇨🇭 Schweizer Shop · 🚚 Gratis-Versand ab CHF 65 · ↩️ 30 Tage Rückgabe
   - 🎁 –10% erste Bestellung WELCOME10
   - ✨ Geprüfte Markenqualität · 🔒 Sichere Bezahlung
   - 📦 Versand aus EU-Lager · 2–7 Werktage
   Backup: `/tmp/header-group.backup.json`. Verifiziert live.
2. **Geschätztes Lieferdatum auf der Produktseite** (`templates/product.json`, neuer `lux_delivery`
   custom-liquid-Block nach Buy-Button) — rechnet aus Versandzeit (3–7 Tage) ein konkretes **deutsches**
   Datum: „Lieferung voraussichtlich 28. Juni – 2. Juli · Versand aus EU-Lager". Backup: `/tmp/product.backup.json`.
   Ehrlich (kein Fake-Countdown), konkrete Daten konvertieren laut Research +X%.

## 📋 CRO-Backlog (priorisiert, aus Agenten-Research — Quellen unten)
**HOCH (ohne Reviews/Ads umsetzbar):**
- **Gratis-Versand-Fortschrittsbalken im Cart-Drawer** („Noch CHF 18 bis Gratis-Versand") — „höchster Hebel im Cart"
  (Cartylabs). ⚠️ Vorher blockiert: Cart-Drawer-Blöcke sind STATIC → braucht custom-liquid in der Cart-Drawer-Section,
  nochmal prüfen ob via section-level custom-liquid lösbar.
- **Express-Checkout (Shop Pay/Apple/Google/TWINT) über den Line-Items** — +10–20% Mobile-Conversion. **TWINT muss
  der User in Payments aktivieren** (User-Klick) — erst dann ehrlich bewerbbar.
- **Cart = Drawer statt /cart-Seite** (Toggle) — gewinnt in 90% der Tests. Prüfen ob schon Drawer.
- **Mobile Above-the-Fold + Varianten als Pills** statt Dropdown (44px Targets).
- **Echter Low-Stock-Hinweis** NUR bei `inventory_quantity<10` & tracked. ⚠️ BigBuy ist untracked → NICHT faken
  (Fake-Scarcity = −12% + Trust-Tod).

**MITTEL:**
- Produkt-Video (15–30s) als 2./3. Galeriebild (+10–25% PDP→ATC).
- „Häufig zusammen gekauft" via Search&Discovery-App / `recommendations.products`.
- Checkout-Trust-Badges (Winter '26: Checkout-UI-Extensions auf allen bezahlten Plänen).

**NIEDRIG (gated, kein Fake):**
- „Bekannt aus / As seen in"-Logo-Strip → erst wenn echte Erwähnung existiert.
- Echter Countdown NUR bei realer Sale-Deadline (nie perpetuierlich).
- Review-Capture (Judge.me) für Bestellung #1 scharf halten.

## 🔥 Virale/Trend-Produkte 2026 (für nächste BigBuy-Wellen — DE/ES-Keywords)
**TIER A (zuerst, Premium + BigBuy-wahrscheinlich + Synergie):**
1. **Lichtwecker/Sonnenaufgang-Wecker** — ES `despertador de luz / despertador amanecer`
2. **Ultraschallreiniger (Schmuck/Brille)** — Synergie mit Schmuck+Sonnenbrillen — ES `limpiador ultrasónico / limpiador de joyas`
3. **Selbstheizende Smart-Tasse / Temperatur-Tasse** — ES `taza calentadora / taza con control de temperatura`
4. **Kaltluft-/Nebulizing-Aroma-Diffusor (wasserlos)** — Synergie Parfum — ES `difusor de aire frío / difusor nebulizador`
5. **Rotlicht-Therapie-Maske/-Wand** — #1 Wellness-Device 2026 — ES `mascarilla de fotones LED / máscara terapia luz roja`
6. **Skulpturale RGB-Design-Lampe / LED-Wellen-Wandleuchte** — ES `lámpara de pie RGB diseño / luz ambiente`

**TIER B:** 7. Akku-Spin-Scrubber · 8. Fußhängematte Schreibtisch · 9. Smart-Pflanzensensor ·
10. **Touch-/Fernbeziehungs-Lampen-Paar** (emotional, Top-Marge, ES `lámparas de amistad / lámparas a distancia`) ·
11. Schall-Zahnbürste · 12. Infrarot-Kniebandage · 13. **Aromatherapie-Diffuser-Halskette** (Schmuck+Parfum-Synergie) ·
14. **Whisky-Steine/Gläser-Geschenkset** (ES `piedras de whisky / set de vasos de whisky`) · 15. Filter-/Ionen-Duschkopf.

**Schon vorhanden — NICHT duplizieren:** Galaxy/Sunset/Mond/Aurora-Projektoren, LED-Strips, Massagepistolen,
Haltungskorrektoren, Smartwatches.
**ES-Keywords wichtig** (BigBuy = spanischer Lieferant). Makro-Themen 2026: Schlaf&Recovery, „no-phone bedroom",
Spa-zuhause, skulpturales Licht, befriedigendes Reinigen, emotionale Paar-Geschenke, WFH-Komfort.
Problemlöser > „cooler Junk".

## Quellen
CRO: easyappsecom (PDP-CRO, Urgency-Guide), Cartylabs 80-Fixes, Sutton Commerce, Ryze 14 Tactics,
Shopify Trust-Badges-Guide, Neat Digital Horizon-Guide, AdsX Summer '26.
Produkte: Sell The Trend, AutoDS Q1-2026, CJ Dropshipping Jan-2026, Printify TikTok 2026, Wareable Red-Light,
Apartment Therapy CES 2026, BGR Smart-Home 2026.
