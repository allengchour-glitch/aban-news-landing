# 📺 YouTube-Lehre: „$1.1M mit Claude Code AI Ads" (Ecom with Simo) — 2026-06-26

> Gelernt mit dem neuen Tool `automation/yt_learn.mjs` (yt-dlp-Transkript). Video: Fashion-Dropshipping
> komplett über Claude Code auf Autopilot, >$1.1 Mio Umsatz. **Direkt auf LuxeStyle adaptierbar.**

## 🥇 DER WICHTIGSTE TEIL — Ad-Test-Formel (wann killen, wann skalieren)
Das hat uns gefehlt. **Klare Kill/Scale-Regeln statt Bauchgefühl** (Währung auf CHF gemünzt):

| Spend (Tag 1) | Bedingung | Aktion |
|---|---|---|
| 10 CHF | CPC > 1 **und** 0 Add-to-Cart | ❌ STOP |
| 20 CHF | 0 Add-to-Cart | ❌ STOP |
| 30 CHF | < 1 Verkauf | ❌ STOP |
| → 1 Verkauf Tag 1 | weiter Tag 2 bis 60 CHF | will **≥ 2 Verkäufe** |
| Winner | **Netto-Profit > 20 %** | ✅ Budget **verdoppeln** (30→60→…→6-8k/Tag) |

**Start immer 30 CHF/Tag, 1 Adset, alle Test-Ads rein.** So skaliert er von 30/Tag auf 15-20k-Umsatz-Tage.

## 🔁 Der ganze Prozess (Claude-Code-Autopilot)
1. **Produkt-Research:** Konkurrenz-Brands mit **≥ 5 Live-Ads** = skaliert = bewiesen. Deren **Top-3-Bestseller** je Brand. (Er nutzt Trend Track; wir: eigener Trend-Scan + bewiesene Nischen.)
2. **In den Shop:** Konkurrenz-Listings importieren → Claude Code macht **Titel/Beschreibung/Preis/Übersetzung** sauber & luxuriös (besser als Konkurrenz).
3. **Ads bauen:** pro Produkt **4 Marketing-Angles** (Haltbarkeit · Outdoor/Sport · Saison · Luxus-Studio) → trifft verschiedene Käufer. Er: Higgsfield. **Wir: Seedance (jetzt 2.5/4K).**
4. **Launch:** alle Test-Ads in 1 Adset, geplant. (Wir: `tiktok-campaign-port.mjs` / API.)
5. **Sourcing:** privater Agent (1688/Taobao), Faktura-Bilder, ~70 % Marge (Kosten ~10 → Verkauf ~50-55).
6. **Management:** Test-Formel oben → Verlierer killen, Gewinner verdoppeln.

## ✅ Was wir SOFORT übernehmen
- **Ad-Test-Formel** als feste Regel fürs Kampagnen-Management (Brain `ad_test_formel_2026`). Currency CHF, Budget-Cap 350 bleibt.
- **4 Angles pro Winner** in Seedance generieren (statt 1 Reel/Produkt).
- **≥5-Live-Ads-Filter** beim Produkt-Research (nur Bewiesenes testen).
- **70 %-Margen-Check** bei neuen Produkten.

## ⚠️ Unterschiede / Grenzen (ehrlich)
- Wir bleiben **strikt CH**, kein DE; Budget-Cap 350 (seine 6-8k/Tag erst nach bewiesenen Gewinnern + neuer Freigabe).
- Seine Paid-Apps (Trend Track/Copy/Higgsfield/Rapid Ads/Tim Drop) ersetzen wir durch eigene Tools + CJ/BigBuy.
- Kern-Engpass bleibt: **erst 1 sauber laufende, approved Ad** → dann Test-Formel anwenden.

## 🛠️ Tool
`node automation/yt_learn.mjs "<url>" --summary` — lernt aus jedem YouTube-Video (Transkript + AI-Lehren). Funktioniert auch, wenn Browser/WebFetch YouTube blockt.
