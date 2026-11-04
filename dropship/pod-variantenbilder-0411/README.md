# «Selbst gestalten»: Variantenbilder aus dem Printful-Katalog (04.11.2026)

**Auslöser:** Besitzer 03./04.11. «kopiere auch alle Beispielbilder» und «such Fehler bei Selbst gestalten, agiere wie ein Mensch».
Die Galeriefotos der Printful-Produktseiten waren schon kopiert (`dropship/POD-BILDER-0211.md`); es fehlten die **Bilder je Farbe und Material**.

## Messung (GEMESSEN 04.11.2026, Shopify Admin + Printful-Katalog `GET /products/variant/<id>`)

- Von 38 «Selbst gestalten»-Produkten trug nur **eines** an den Varianten ein eigenes Bild (das klassische Unisex-T-Shirt, aber mit der **Rückansicht** bei allen 8 Grössen). Wechselte die Kundin die Farbe, blieb die Galerie stehen, und im Warenkorb erschien das Vorschaubild der falschen Farbe (Audit-Fund, Playwright, 04.11.).
- Die Printful-Variantennummer steckt in der Shop-SKU (`<Auftrag>_<Variante>`); 328 Varianten, alle im Katalog gefunden, 0 Fehler.
- Nur 8 Produkte haben mehr als ein Aussehen (Farbe oder Material): Shirt (3 Farben), Unisex-T-Shirt (3 Materialien), Unisex-Hoodie (2), Poster (5 Bilder für 18 Varianten, matt und Foto-Glanzpapier sind bei Printful dasselbe Foto), Baumwolltasche (12 Farben), Bio-Jutebeutel (2), dazu das klassische T-Shirt (Rückansicht ersetzen). Alle anderen Produkte unterscheiden sich nur in der Grösse: dort bringt ein Variantenbild nichts.

## Was geschrieben wurde (LIVE 04.11.2026 ca. 06:30–06:40 UTC, Ledger `ledger.json`, Zustand davor `vorher.json`)

| Produkt | Bilder | Varianten | Status im Shop |
|---|---|---|---|
| `shirt-zum-selbstgestalten` | 3 (Weiss, Schwarz, Marineblau) | 15 | aktiv |
| `unisex-t-shirt-selbst-gestalten` | 3 (Ringgarn, Bio, Heavyweight) | 25 | aktiv |
| `unisex-hoodie-selbst-gestalten` | 2 (Sweatshirt, Hoodie) | 13 | aktiv |
| `poster-zum-selbstgestalten` | 5 | 18 | aktiv |
| `bio-jutebeutel-selbst-gestalten` | 2 | 2 | aktiv |
| `klassisches-unisex-t-shirt-selbst-gestalten` | 1 (Vorderansicht ersetzt die Rückansicht) | 8 | aktiv |
| `baumwolltasche-mit-langen-henkeln-selbst-gestalten` | 12 Farben | 12 | **Entwurf** (nicht im Shop sichtbar) |

Jedes Produkt wurde nach dem Schreiben frisch gelesen (jede Variante trägt das geplante Medium) und auf der Storefront (`/products/<handle>.js`) gegengeprüft: 0 Varianten ohne Bild, 0 Rückansichten.

## Galerie-Ergänzung

Drei Lifestyle-Beispielfotos von Printful beim Badeanzug (`einteiliger-allover-badeanzug-selbst-gestalten`, 14 → 17 Medien, LIVE 04.11., Beleg `galerie-ergaenzung.json`). Die übrigen 11 «neuen» Bilder der Printful-Seiten waren englische Infografiken, Verpackungs- oder Platzhalterfotos und wurden nicht übernommen.

## Bewusst NICHT gemacht

- **Handyhüllen** (Samsung 84, iPhone 48 Varianten): die Katalogbilder zeigen ein bestimmtes Modell; ein Bild je Material wäre bei jedem anderen Modell ein falsches Gerät. Bilder je Modell wären 46 bzw. 16 zusätzliche Fotos in der Galerie → Entscheid des Besitzers.
- **Produkte mit nur einer Farbe**: nichts zu unterscheiden.
- **Neue Farben**: das Shop-Angebot kennt zum Beispiel beim Shirt nur 3 von 84 Farben des Printful-Rohlings; mehr Farben bräuchten neue Varianten (Tageslimit ~9 500), ein Farbbild je Farbe im Editor und die Zuordnung im Printful-Sync (Besitzer-Entscheid, Audit-Bericht folgt).

## Rücknahme

`ZURUECK=1 LIVE=1 HANDLES=<handle> node automation/pod_variantenbilder.mjs` löst die im Ledger gebundenen Bilder von den Varianten (die Medien bleiben in der Galerie). Die alte Rückansicht des klassischen T-Shirts bleibt ebenfalls in der Galerie; den Zustand vor der Änderung hält `vorher.json` (Variante → Bild- und Medien-ID).

## Werkzeug und Tests

- `automation/pod_variantenbilder.mjs` (Trockenlauf Vorgabe, `LIVE=1` schreibt), Rechenkern `automation/lib/pod_variantenbilder.mjs`, Test `automation/lib/pod_variantenbilder_test.mjs` (23 Prüfungen, in der CI; Mutationsprobe 13 von 13 erkannt, die letzte erst nach dem Test «Grenze ist bewusst 12»).
- Der Printful-Zwischenspeicher `printful-cache.json` entsteht beim Lauf und ist ignoriert (`.gitignore`): Bild-URLs ändern sich, ein alter Zwischenspeicher darf nicht wiederverwendet werden.
- Regeln: höchstens 12 verschiedene Bilder je Produkt (sonst bläht sich die Galerie auf); gleiche Bilder (Prüfsumme) werden zu einem Medium; vorhandene gute Eigenbilder werden nie überschrieben; Rückansichten (Dateiname `-back-`) werden ersetzt.
- **Lehren:** (1) `productVariantsBulkUpdate` mit `mediaSrc` ignoriert Shopify; Medien legt man mit `productUpdate(media:…)` an, findet sie über den Alt-Text und bindet sie mit `productVariantAppendMedia`. (2) Grössen derselben Farbe haben bei Printful eigene Dateinamen: ein Vertreter-Bild je Aussehen wählen, sonst wirft ein einzelnes defektes Bild alle anderen aus dem Plan (erster Trockenlauf: 13 statt 18 Varianten beim Poster). (3) Sieben Produkte der Liste sind Entwurf (`laptop-sleeve`, `wm-trikot`, `tote`, `baby-jersey-body`, `baumwolltasche`, `premium-hoodie`, `urban-umhangetasche`): ihre Storefront-Adresse liefert 404, das ist kein Fehler.
