# BROWSER-CLAUDE AUFGABE — Printful-Trikot verknüpfen + erste Bestellung liefern

> Für den PC-/Browser-Claude (Brave CDP, echte IP, in Printful eingeloggt).
> Ziel: Das Shopify-Produkt „WM-Trikot selbst gestalten" mit einem echten Printful-Trikot verbinden,
> Auto-Fulfillment + Auto-Billing aktivieren, und die erste Bestellung #1005 (blank) über Printful ausliefern.
> Danach laufen künftige Trikot-Bestellungen vollautomatisch (Printful druckt → verschickt → Tracking → Kunde).

## Kontext
- Shop: LuxeStyle (Shopify `au3j0y-hq` / luxestyle.ch).
- Problem: „WM-Trikot selbst gestalten" ist ein selbst gebautes Produkt, NICHT mit Printful verknüpft → Bestellungen landen auf „manuell".
- Die anderen POD-Produkte (T-Shirt/Hoodie/Tasse) sind korrekt bei Printful und laufen automatisch — dieses Trikot soll genauso werden.

## Schritte (in printful.com)
1. **Login prüfen:** printful.com im LuxeStyle-Konto. Wenn NICHT eingeloggt → STOPP + melden (nicht raten, keine fremden Logins).
2. **Store prüfen:** Stores → der Shopify-Store „luxestyle"/„au3j0y-hq" muss verbunden sein.
3. **Trikot wählen:** Katalog → „jersey" suchen → ein Unisex Sport-/Fussball-Trikot (AOP, All-Over-Print), Grössen S–2XL. Muss in ROT gestaltbar sein.
4. **Printful-Produkt anlegen (BLANK-Basis):** Design = einfarbig ROT (Vollflächen-Rot), KEINE Schrift.
5. **Mit BESTEHENDEM Shopify-Produkt verknüpfen:** „Connect existing product" → „WM-Trikot selbst gestalten"
   (NICHT neu erstellen). Varianten nach Grösse/Farbe mappen (Rot zuerst; Weiss/Schwarz/Blau analog, falls Printful-Farben passen).
6. **Automatik an:** Settings → Stores → luxestyle → „Automatically fulfill imported orders" (Auto-Fulfillment) EIN
   + Zahlungsmethode hinterlegen (Auto-Billing). ⚠️ Das autorisiert laufende Auto-Abbuchungen durch Printful — vom User so gewollt.
7. **Erste Bestellung #1005 liefern (ohne Handversand):** Printful → Orders → „New order" (manuell) → das rote Trikot **XL, BLANK** (kein Druck) → Versand an:
   ```
   Alain Schutz
   Rue du Pavement 24
   1530 Payerne
   Schweiz
   +41 79 453 79 86
   ```
   → bestätigen + bezahlen. ⚠️ Das kostet echtes Geld (Printful-Produktion+Versand, ~CHF 15–25) — vom User für diese Bestellung freigegeben.
8. **Zurückmelden:** Printful-Produkt-ID + verknüpfte Shopify-Variante(n) + Tracking-Nr. der Alain-Bestellung (sobald da).

## Wichtig / Grenzen
- Nichts erfinden. Braucht ein Schritt einen Login/eine Zahlung, die nicht geht → STOPP + melden.
- STRIKT Schweiz. Kein anderes Land targeten.
- Personalisiert (Name/Nummer) ist NICHT Teil dieser Aufgabe — das läuft über die separate Druckdatei-Brücke
  (Cloud-Claude baut sie; sie liest die Bestell-Eigenschaft „🖼️ Druckdatei" und schickt sie per Printful-API).
  Diese Browser-Aufgabe richtet nur die BLANK-Basis + Auto-Flow ein.
