---
tags: [projekt, reichweite, laeuft]
quelle: SHARED-MEMORY.md
gelernt: 2026-06-27
---
# Google Merchant Center — die grösste Gratis-Reichweite

Konto `LuxeStyle CH` (5797470070). Google hat über die **native Shopify-Integration** den ganzen
Katalog gezogen: **38 937 Angebote**, davon für die Schweiz **32 812 freigegeben (84,3 %)**.

Das ist die grösste kostenlose Reichweite, die der Shop hat — und im Gegensatz zu Social Media
mit **Kaufabsicht**. Siehe [[Masse-ist-kein-Hebel]].

## Eigener Feed als Reserve

`automation/autopilot/merchant_feed.mjs` deckt cj-real plus BigBuy ab (3186 Produkte, Marken- und
Safety-Artikel ausgeschlossen wegen Google-Policy). Datei liegt auf Branch `brain/intel`,
öffentliche URL für „Scheduled Fetch":

```
https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/brain/intel/automation/autopilot/google-merchant-feed.xml
```

⚠️ Diese URL hängt an der öffentlichen Erreichbarkeit des Repos — siehe
[[GitHub-Spam-Markierung]].

## Offen

- **„Product page unavailable" bei 13 416 Angeboten** (Online-Store-Crawl) → fixen, dann
  „Request website check"
- DE und US: Country-Setup unvollständig (Versand)
- 151 webp-Bilder, 36 als adult geflaggt, 9 recalled

Verwandt: [[LuxeStyle]] · [[GitLab-Ersatz]]
