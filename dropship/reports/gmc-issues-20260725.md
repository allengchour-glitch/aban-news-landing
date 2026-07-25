# Google-Merchant-Center-Fehler-Analyse (2026-07-25, 75'060 Zeilen)

## Auswertung (dedupliziert auf 36'959 einzigartige Produkte)
- **36'959 = «Over capacity for CSS Shopping ads»** — KEIN Produktfehler. Katalog > CSS-Ads-Kapazität.
  Betrifft nur bezahlte Shopping-Ads + Dynamic Remarketing, NICHT die Gratis-Listings. Rein informativ.
- **135 «Produktseite nicht erreichbar»** — alle gedraftet/gelöscht (Stichprobe 20 DRAFT / 5 gelöscht / 0 aktiv).
  = korrekt entfernte Ware, Google-Feed hinkt nach. Klärt sich beim nächsten Sync. Kein Handlungsbedarf.
- **20 Adult/Tabak** → aus allen Ad-Kanälen gezogen (Google/Meta/TikTok/Pinterest), Tag `adult-nicht-bewerben`,
  bleiben im Online-Store kaufbar. ✅ ERLEDIGT.
- **85 «Bild zu klein» (<500×500)** + 29 Werbe-Overlay + 16 «Bild nicht ladbar» + 6 fehlendes Bild → Bild-Qualität.
  Fortura-Bild-Backfill hilft bei manchen; Rest braucht Bild-Ersatz (offen, per Produkt).
