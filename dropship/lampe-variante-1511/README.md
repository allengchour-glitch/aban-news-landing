# LED-Wasserwellen-Lampe: Hauptausführung war nicht kaufbar (behoben 15.11.2026)

Produkt `led-wasserwellen-projektionsleuchte-677504` (Bestseller, Bestellungen #1026 und #1028, Produkt der Scroll-Szene).
Ausführung «3W-16 Farben, Stecker quadratisch, 1 Stück», CHF 21.90, Variante `55889781162369`.

## Befund (GEMESSEN)
- Admin: `availableForSale` true, `CONTINUE`. Shop: `.js` `available:false`, JSON-LD `OutOfStock`, in allen Märkten. Die 17 Geschwister waren kaufbar.
- Ursache: die Variante lag im Versandprofil **«Shopify Collective»**, und dieses Profil hat **0 Versandzonen**. Ohne Zone kann Shopify die Variante nirgendhin liefern und zeigt sie als ausverkauft. Die Geschwister liegen im «Allgemeinen Profil». Wie sie dorthin kam: unbekannt.
- Erster Versuch (22:00 UTC, `variante_kaufbar.mjs`): Bestandsführung aus (`tracked` false, wie die Geschwister). Half nicht, bleibt aber so (gleich wie die Geschwister). Rücknahme `ZURUECK=1 LIVE=1 node variante_kaufbar.mjs`.

## Behebung
- 22:17 UTC `variante_profil.mjs`: Variante ins «Allgemeine Profil» (`deliveryProfileUpdate`, `variantsToAssociate`), frisch gelesen gleich. Shop danach `available:true`. Rücknahme `ZURUECK=1 LIVE=1 node variante_profil.mjs`.
- 22:19 UTC: sieben Ausführungsnamen eingedeutscht («3W-16color plug in crown-3PCS» → «3W-16 Farben, Stecker Krone, 3 Stück», «1 PC» → «1 Stück»), mit `automation/optionswerte_umbenennen.mjs`, Trockenlauf vorher, frisch gelesen: 18 Varianten, Preise und Bilder unverändert.

## Gegenprobe katalogweit (`profile_alle.mjs`, nur lesend)
56 Versandprofile. Mit Varianten und ohne Schweiz: nur «Shopify Collective» (jetzt 4 Parfum-Entwürfe). «Zendrop» liefert nicht nach Liechtenstein, enthält aber nur 1 archiviertes und 1 Entwurfsprodukt. **Lehre:** zeigt der Shop eine Variante als ausverkauft, die Shopify als verkaufbar führt, zuerst `productVariant { deliveryProfile { name } }` lesen.
