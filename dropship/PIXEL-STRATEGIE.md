# 🎯 LuxeStyle — TikTok-Pixel-Strategie (POLISHED, für immer · für ALLE Sessions)

> User 2026-06-17 „polish mi Pixel, merk das für immer + teil's mit alle". Pixel = `D8EKVR3C77U6KT5BTBD0`
> (via Shopify-TikTok-App verbunden, sammelt Events). Diese Datei = das verbindliche Pixel-Playbook.

## 🔑 Kern-Lehre (teuer gelernt): EVENT-LEITER statt direkt auf „Kauf"
Bei **0–wenig Verkäufen** auf „Complete Payment" zu optimieren = der Pixel hat **keine Lerndaten**
(TikTok braucht ~50 Conversions/Woche pro Event) → Kampagne liefert schlecht/teuer. Darum stufenweise:

| Phase | Optimierungs-Event | Wann wechseln |
|---|---|---|
| **1. Start** | **View Content** (Produktansicht) | sofort — viele Events, Pixel lernt schnell die Zielgruppe |
| **2. Mitte** | **Add to Cart** | wenn Phase 1 stabil Traffic mit ATC bringt |
| **3. Ziel** | **Complete Payment** (Kauf) | erst wenn ~50 ATC/Woche zusammenkommen |

→ Im Kampagne-Bot via `TT_EVENT` steuerbar. **Default neu = „View Content"** (Phase 1), nicht „Complete Payment".
Hochstufen, sobald genug Events da sind (im Ads Manager sichtbar).

## 🧱 Kampagne-Konfig (verbindlich)
- **Ziel:** Website-Conversions · **Pixel:** D8EKVR3C77U6KT5BTBD0
- **Targeting:** Schweiz · Frauen · 18–34 · Sprachen Deutsch + Französisch · **nur TikTok-Placement**
- **Budget:** Lifetime-Cap **350 CHF** (hart, kein Überspend) · Tag ~25 CHF
- **Creative:** bestes Video (`reels/luxe-flagship-film.mp4` / `luxe-ultimate-ad.mp4`) · Identity „Luxestyle.ch"
- **Ziel-URL:** `luxestyle.ch/collections/sommer` (kampagnen-Landingpage, gesund)
- **Tool:** `automation/local/tiktok-campaign-port.mjs` (Brave-Port, kein API). Ablauf: `--dry` → Selektoren prüfen → `AUTO_LAUNCH=1`.

## 📊 Auswertungs-Regeln
- **Nach 2–3 Tagen** Ads-Manager prüfen: View-Content-Events da? CTR? CPC?
- **Add-to-Cart-Rate** (Shop-Analytics) ist der Schlüssel-Indikator — war historisch der Engpass (Session→ATC ~0,3 %).
- Gewinner-Creative behalten, Verlierer pausieren (Ratsche).
- **NIE** mehrere Auto-Smart-Kampagnen der TikTok-App offen lassen (Budget-Loch) → nur DIESE eine.

## 🈲 Sicherheit
- Nur **1** aktive Kampagne · Budget-Cap fix · Strikt Schweiz (kein Deutschland).
- Creative ohne Botox/Serum/asiat. Schrift/Watermark (siehe DO-NOT-POST).

## ⚠️ KORREKTUR (Recherche 2026-06-17): kleines Budget → TRAFFIC zuerst, nicht Conversion
- 25 CHF/Tag (350 total) ist ZU WENIG für Conversion-Optimierung (braucht ~50 Conv/Woche).
- **Phase 0 (350 CHF):** Ziel = **Traffic** oder **Video-Views** → günstige Klicks, baut Pixel-Daten + Reichweite.
- Lean: 1 Kampagne · 1 Ad-Group · 4 Creatives · 20%/Tag skalieren · 2–3 Wochen.
- **Erst mit mehr Budget / den bis 1000$ Neukunden-Credits** → auf «Website-Conversions» wechseln (dann Event-Leiter View Content→ATC→Kauf).

## 🔬 VERTIEFUNG (Tiefen-Recherche 2026-06-18, quellengeprüft) — Details: `dropship/TIEFEN-RECHERCHE-2026-06-18.md`
- **🆕 Gratis-Credit verdoppelt das Budget:** Neukunden-Matched-Spend «Spend $200 → get $200» (Tier 1, höher bis $6000) → 350 CHF effektiv ~550. ⚠️ CH **nicht explizit** in offizieller Länderliste (FR/DE/IE schon) → bei Anmeldung (getstarted.tiktok.com) / via Rep (Wallrath-Mail ist raus) verifizieren.
- **🎬 Spark Ads schlagen Studio-Ads klar:** CTR 2,4 % vs 1,0 %, Conversion 2,6 % vs 1,8 % (TikTok-Shop-Spark 3,84 % vs 1,12 %), CPM 20–30 % tiefer. → **bestes organisches Reel boosten** statt Studio-Creative («roh > poliert»).
- **Pixel-Leiter konkret:** Phase 1 Traffic/CPC (50–100 Klicks) → Phase 2 **Add-to-Cart** (besseres Lernsignal als View Content bei Mini-Budget) → Phase 3 Kauf. `content_id`=SKU bei allen Events.
- **Plattform-Minima:** Ad-Group $20/Tag, Kampagne $50; Conversion-Lernphase-Exit real ~$160/Tag → Traffic/ATC zuerst. CH-CPM ~$5–8 (Spark $1–4), CPC $0,30–1,50 (Spark $0,10–0,30).
