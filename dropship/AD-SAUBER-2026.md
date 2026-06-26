# 🎯 TikTok-Ad SAUBER NEU — Top-Ads (2026-06-26)

> User: „add sauber neu einrichten mit top ads". Alte Ad war **abgelehnt** (Adult-Grund, jetzt behoben).
> Diese Doku = die saubere, review-sichere Neueinrichtung mit den besten Creatives.

## ✅ Warum sauber jetzt
- **Katalog adult-sauber:** 2× gesweept (status:active, ~30 Adult-Begriffe) → 0 Treffer. Reject-Grund weg.
- **Landing verifiziert clean:** Collection „💧 Wasserfester Schmuck" (7 Schmuck-Produkte) + Code **WELCOME10 ACTIVE (−10%)**.
- **Pixel grün:** `pid=1 load=1 page=1 wpm=1`.

## 🥇 Top-Creatives (clean, on-brand, 4.8 Mbps = schärfste)
| # | Reel | Hook (Mundart) | Datei (lokal) | CDN |
|---|------|----------------|---------------|-----|
| 1 | **See-Test wasserfest** | „Bliebt das wirklich Gold? 💧 … lauft nid a." | `reels/seedance-wasserfest.mp4` | `0dff8a9a…4.8Mbps` |
| 2 | Herz-Muschel (Geschenk) | „S Härz vom Meer 🐚 … wasserfescht." | (CDN) | `b9428661…4.8Mbps` |
| 3 | Geburtsstein (personalisiert) | „Dini Farb, dini Gschicht 💎" | (CDN) | `39a9c5b0…4.8Mbps` |

Creative #1 ist der Default (bester Hook = See-Test, proven Top-Nische).

## ⚙️ Kampagnen-Spec (eingestellt, hart gecappt)
- **Objective:** Traffic → Collection (TikTok-Lehre: erst Traffic/ATC, Pixel-Daten sammeln)
- **Landing:** `https://luxestyle.ch/discount/WELCOME10?redirect=/collections/wasserfester-schmuck` (Auto-Rabatt −10%)
- **Budget:** DAILY 20 · **TOTAL-Cap 70 CHF** (innerhalb der freigegebenen 350) · zeitlich begrenzt → kann 350 nie sprengen
- **Geo:** Schweiz · **Sprache:** DE/FR · **Ad-Text:** Mundart-Hook + WELCOME10
- **Advertiser:** LuxeStyle CH Ads (`7646349875793182738`)

## 🚀 Ablauf (eingebaut, ein-Klick)
1. **DRY zuerst** — gequeued (`cloud-commands.json` → `campaign-dry`): baut die Kampagne mit Top-Creative + cleaner Landing
   und macht **Screenshots zur Kontrolle** (kein Spend). Läuft via PC-cmd-poll **oder** VPS-Brücke.
2. **Review** der Screenshots (`automation/local/campaign-shots/`) — passt das Ad? Landing korrekt?
3. **GO** — dann `campaign-traffic` queuen (AUTO_LAUNCH, real, 70-CHF-Cap). Top-Creative + clean Landing sind dort schon verdrahtet.

## 🌉 Wer führt aus
- **PC an + cmd-poll:** liest `cloud-commands.json`, fährt Brave, baut die Kampagne.
- **VPS-Brücke (neu):** kann denselben Port-Skript über Tailnet auf dem PC-Brave fahren (`CDP_URL=http://100.71.8.47:9222`).
- Real-Geld-Submit bleibt bewusst hinter DRY→Review→GO (Schutz vor Fehl-Launch).

## 📊 Danach
`automation/vps/tiktok-ads-read.mjs` liest Impr/Klicks/Spend aus der Ads-Seite → Metafeld `luxe.tiktok_stats`
→ jede Session (auch Cloud) meldet echte Views+Klicks. Pixel-Status: `luxe.pixel_status`.
