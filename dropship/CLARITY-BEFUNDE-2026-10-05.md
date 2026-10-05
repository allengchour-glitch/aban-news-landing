# Clarity-Befunde (Betreiber, 05.10.2026, 6 Sitzungen, 0 Käufe) → Massnahmen

| # | Befund (Betreiber) | Gemessen/geprüft hier | Massnahme | Stand |
|---|---|---|---|---|
| 1 | Newsletter-Popup + Cookie-Banner 2–7 s nach Ankunft gleichzeitig; mobil ganzer Bildschirm, desktop über «In den Warenkorb» | Popup `custom_liquid_lxpopup` öffnete bei 40 % Scroll (Handy-Produktseite ≈ 2–3 s) + Exit-Intent | Tor: nie vor 20 s (mobil 30 s), nie neben Cookie-Banner, nie Warenkorb/Konto; dann 60 % Scroll / Exit-Intent (nur Desktop) / 45–75 s. Handy-Browser: 3/8/15/19 s zu. Wächter `popup_tor_wache.py` (Aufseher, 6 h) | ✅ live 05.10. ~22:30 UTC |
| 2 | Mobil 8,5 s Ladezeit (Facebook-App, Augenmassagegerät) | `mobil_tempo_patch.py` läuft täglich; FIX-12H Punkt 22 offen (Hero-picture 102 KB, doppeltes fbevents.js) | PageSpeed mobil messen, App-Embeds (Pixel doppelt) = Betreiber-Klick; Hextom-Converter am 05.10. vom Betreiber gelöscht ✅ | offen |
| 3 | Kristall-Set: 2 min nur «Versand & Rückgabe» gelesen, kein Kauf | Gratisversand ab CHF 50 steht im Ankündigungsband; Produktseite? | Versand-/Lieferzeit-Zeile direkt unter dem Preis prüfen/ergänzen | offen (nächste Runde) |
| 4 | TikTok-Besuch 20 min, 0 Klicks (Hintergrund-Tab) | Sitzungsdauer-Metrik verfälscht; TikTok-Ads sind AUS → organischer TikTok-Link | Landeseiten: Preis + CTA im 1. Viewport (390 px) | offen |
| 5 | Checkout nicht in Clarity (checkouts.shopify.com) | richtig | Shopify Analytics Checkout-Trichter | Hinweis |
