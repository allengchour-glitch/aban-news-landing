# Digital-Shop — KI-Starter-Kits (Grundgerüst)

**Idee:** Verkaufe kompakte, ehrliche Branchen-Pakete (Spickzettel + Prompts + Checkliste) als
Sofort-Download. Passiv, weltweit, Lemon Squeezy regelt MwSt (Merchant of Record).

## Was schon da ist
- `automation/build_product_pack.py` — baut pro Branche ein Paket → `downloads/packs/<slug>/`
  (PDF + `prompts.md` + `checkliste.md` + `LIESMICH.txt`). Ohne Gemini-Key: ehrlicher Fallback-Prompt-Satz.
- `shop.html` — Storefront, liest die Pakete aus `js/shop-config.js`.
- `js/shop-config.js` — pro Paket Titel/Preis/Checkout-Link (leer = „bald verfügbar", kein toter Button).

## So bringst du es live (3 Schritte)
1. Pakete bauen: `python3 automation/build_product_pack.py --slugs aerzte,handwerker,steuerberater`
   → Inhalte in `downloads/packs/<slug>/` prüfen/feinschleifen (Qualität = dein Teil).
2. In **Lemon Squeezy** je Paket ein Produkt (Digital, Datei-Upload als ZIP) anlegen → Checkout-Link kopieren.
3. Link in `js/shop-config.js` beim passenden Paket bei `buy` eintragen → Button auf `shop.html` ist live.

## Geld
- €9–19 pro Paket, einmalig. Skaliert über alle 262 Branchen (Pakete sind schnell generiert).
- Bundle-Idee: „3 Branchen-Kits" als Sparpaket.

## Ehrlich
- Inhalte aus echten Anwendungsfällen + geprüften Prompts — keine Fake-Versprechen, kein Weiterverkauf erlaubt.
- Wert entsteht durch Kuratierung: die generierten Pakete vor dem Verkauf einmal gegenlesen.
