# 📡 LIVE — was läuft (zum Mitlesen)

> Stand: 2026-06-21 spät · Kanal: CLOUD-AN (selbstheilend + Autostart + Watchdog 6min + act-Timeout 45s) · Modus: **immer Bot, nie fragen, selbst checken/erledigen**
>
> ⚠️ **PC-Kanal aktuell eingefroren** (Heartbeat steht bei 22:00Z / Head `9385a8d0`; Queue-Bots noch nicht gelaufen).
> Die Watchdog/Timeout-Fixes greifen erst nach 1 sauberem Neustart (SUPERBOT). Cloud arbeitet derweil API-seitig weiter.

## ✅ Heute autonom erledigt (Auszug)
- **TWINT live** + Funnel bewiesen (Order #1003) · **ATC-Rate 0,57% → 3,2%** (102 Kauf-Blocker-Fixes greifen!)
- **AI-Bot gemeistert:** Stagehand gelöst (sh.act, CDP-WS, Gemini) + **gelernt warum er hängt** (DOM-settle auf SPAs) → 3-fach-Timeout
- **CLOUD-AN** selbstheilend + Autostart (nie wieder Deadlock/Klick) · git-npm-Bug gefixt
- **Startseite kuratiert:** 3 Leichen raus, Top-bewertete + Marken-Heroes (Guess/Casio/D&G) rein, alle 23 ACTIVE
- **2 Text-Overlay-Bilder archiviert** (Flame/Y-Lifting) · Kollektions-SEO geprüft (top) + Bestseller-Body 14→30
- **BigBuy-Marken verifiziert top** (echte EAN/GTIN = Google-Shopping-Motor) · Trust/CHF49→65 katalogweit
- **Pixel-Konten geklärt** (7646 = Pixel+332CHF, via Shopify-Kanal) · Bots gebaut: Kampagne, CAPI-Datenfreigabe, Post-Audit, Marktplatz
- **Gehirn: 185+ Regeln** · Dropship-Automation-Playbook, Creator/Conversion/Google/CH-Recht gelernt

## 🎯 NEU: Weg „ohne dich zu steuern" gefunden (Recherche 2026-06-21)
Der PC hängt, weil **API-Arbeit + Browser-Arbeit am selben Heim-Browser kleben**. ~70–80 % brauchen
GAR keinen Browser → gehören auf reine API-Calls. Lösung: **n8n auf €4-VPS** (Always-on, selbstheilend
via Docker, Cron+Retry+Telegram-Alert) macht alle API-Jobs nativ + ein **Cloud-Browser** (Skyvern, CH-
Residential-IP) übernimmt den kleinen Rest (TikTok/IG/FB/Marktplätze). **Kein PC, keine Klicks mehr.**
→ Voller Plan + Kosten + Migration: **`dropship/ZERO-STEERING-BLUEPRINT.md`**.
**Empfehlung:** Weg C zuerst (~€4/Mo, killt 70–80 % der PC-Abhängigkeit, 0 Browser-Kosten); Cloud-Browser
später. → **User-Entscheid 2026-06-21: „vorerst nur PC"** (kein VPS/Geld). Blueprint bleibt für später
dokumentiert; PC-Kanal bleibt der Weg (bei Einfrieren = 1 SUPERBOT-Klick).

## 📊 Frische Zahlen (7T, 2026-06-21)
1275 Sessions · 9 ATC (0,7 %) · 8 erreichten Checkout · **1 abgeschlossen = 1 Verkauf** (Funnel bewiesen).
→ Bottleneck: **Checkout-Abschluss** (8→1, 7 brechen am letzten Schritt ab) + **zu wenig Kauf-Intent-Traffic**
(Pixel-Kampagne, hängt am PC-Browser). Hebel unverändert: Buy-Intent-Traffic + Checkout-Completion.

## 🔄 In der Queue (laufen autonom über CLOUD-AN, sobald Kanal frei)
| Befehl | Macht |
|---|---|
| `shopify-campaign-go` | Pixel-Kampagne: Sammlung favoriten → Schweiz → 10 CHF → Senden |
| `datasharing-go` | Datenfreigabe = Maximum (CAPI an) |
| `feed-polish` + `seo` | Google-Merchant-Felder (Free Listings) + Meta |
| `audit-ig/tiktok/fb` | Vision-Check alter Posts → Verstösse löschen |
| `markt-profil` | tutti/ricardo Profile (anibis ✅) |
| `bigbuy-premium` | Mehr Premium-Marken importieren |

## ⏳ Wartet auf User (Konto-Klicks, kein Bot kann sie)
1. **Datenfreigabe = Maximum** in TikTok- + Meta-Kanal (CAPI) — der Bot versucht's, sonst 2 Klicks
2. Pixel-Kampagne starten (Bot macht's, sonst 3 Klicks)
3. `BIGBUY_TOKEN` in luxe-secrets.ps1 (für mehr Importe)

## 🎯 Hebel-Ranking (datenbelegt)
1. **Zahlung** ✅ TWINT live · 2. **Search/Google-Listings** (14%-Kanal! BigBuy-GTINs) · 3. **Buy-Intent-Traffic** (Pixel-Kampagne) · 4. **Mobile-CRO** (Theme-Session) · 5. **Social** (ManyChat-DM + mehr Posten)

## 👀 Wo du nachschaust (Handy: GitHub)
- **Diese Datei** `dropship/LIVE.md` · Verlauf `dropship/STATUS.md` · Theme-Aufträge `SHARED-MEMORY.md`
- Screenshots `automation/local/*-shots/` · Reports `reports/*.json`
- **Oder schreib mir „status"** → ich paste den Überblick hier rein.

## 🤖 So läuft's (autonom)
Ich (Cloud) → Befehl in Queue → PC (CLOUD-AN, alle 2 Min, selbstheilend) führt aus + pusht zurück → ich prüfe + ziehe nach + lerne ins Gehirn. **Du musst nichts — kannst alles mitlesen.**
