# 🌐 Browser-Auftrag für PC-Claude — Gelato Loungewear-Linie (+ Printful Activewear)

> **Für den PC-Claude mit Brave-Agent (Port 9222, eingeloggt).** Was die Cloud-Session NICHT kann
> (visuelles Design + Druckflächen-Platzierung im Gelato-Dashboard), erledigt PC-Claude hier.
> Danach macht die Cloud-Session den Shopify-Feinschliff (DE-Titel/SEO/Collection/Menü) autonom.
>
> **Fakten (von der Cloud-Session live geprüft, 2026-06-14):**
> - Gelato ist mit dem Shopify-Store **LuxeStyle** verbunden (`storeId f4af9557-9182-4125-abe9-5de0ca4c0661`).
> - Vorhanden: 10 Schweizer **Poster**. Apparel-Katalog hat **Hoodie/Sweatshirt/Jogger/Tee/Tank/Cropped/Mützen** —
>   **KEINE Leggings/Sport-BHs, KEIN Allover-Print** (das macht Printful, siehe unten).

## A) GELATO — „Swiss-Design Loungewear"-Kapsel anlegen
1. Öffne **https://dashboard.gelato.com** (Brave ist eingeloggt). Store-Auswahl: **LuxeStyle**.
2. Lege folgende Produkte an (**„Create product"** → Apparel). Empfohlene Starter-Kapsel (6 Stück):
   | Produkt (Gelato) | Schnitt | Druck | Design | Preis (CHF, Vorschlag) |
   |---|---|---|---|---|
   | **Hoodie** (Pullover) | Unisex | Brust zentriert | Edelweiss *oder* Matterhorn | 64.90 |
   | **Jogger-Pants** | Unisex | Bein/Hüfte klein | gleiches Design (Set zur Hoodie) | 59.90 |
   | **Sweatshirt** (Crewneck) | Unisex | Brust zentriert | Swiss Cow / Fondue-Art | 54.90 |
   | **T-Shirt** (Short-Sleeve) | Damen | Brust zentriert | Edelweiss | 34.90 |
   | **T-Shirt** (Short-Sleeve) | Herren | Brust zentriert | Matterhorn | 34.90 |
   | **Tank-Top** | Damen | Brust zentriert | Alpsee / Chalet | 29.90 |
3. **Design:** Verwende die **bestehenden Schweizer Motive** (die gleichen wie bei den Postern: Edelweiss, Matterhorn,
   Swiss Cow, Fondue, Alpsee, Chalet). Lade sie als zentrierten **Brustdruck** hoch (bei Hoodie/Sweatshirt/Tee/Tank).
   *Wichtig:* Motiv **zentriert + nicht zu gross** (Brustbereich), sauber auf dem Print-Feld platziert.
4. Pro Produkt: Titel auf Deutsch grob setzen (z. B. „Hoodie «Edelweiss» · Swiss Edition"), Farbe(n) wählen
   (Schwarz/Grau/Creme passen zum Motiv), dann **„Publish to LuxeStyle"** (Shopify).
5. **Fertig-Meldung:** Wenn die Produkte im Shopify-Shop erscheinen → der Cloud-Session sagen
   **„Gelato-Loungewear ist im Shop"**. Dann macht sie autonom: deutsche Titel/SEO, **Collection „Loungewear"** + Menü-Link,
   Cross-Sell (Hoodie+Jogger als Set), Bild-Alt-Texte.

## B) PRINTFUL — echte Activewear (Leggings + Sport-BH) — das kann Gelato NICHT
1. Öffne **https://www.printful.com** (Brave eingeloggt) → Store **LuxeStyle** (Shopify-App-Verbindung).
2. „Add product" → **Women's Leggings** (Allover-Print) + **Sports Bra** + optional **Biker Shorts**.
3. Design: ein **Allover-Pattern** (z. B. Edelweiss-Muster / Alpen-Print) — Printful-Editor füllt die ganze Fläche.
4. Preis CHF (Vorschlag): Leggings 49.90 · Sport-BH 39.90 · Biker-Shorts 34.90. → **Publish to store**.
5. Fertig-Meldung an die Cloud-Session: **„Printful-Activewear ist im Shop"** → ich mache den Feinschliff
   (DE-Titel/SEO, **Collection „Activewear"** + Menü, Set-Cross-Sell Leggings+Sport-BH).

## Hinweise
- **Nichts löschen/überschreiben** — nur neue Produkte anlegen + publishen.
- Schweiz: DDP/Lieferzeiten beachten (EU-Lager → trotzdem CH-Import möglich).
- Screenshots pro Schritt sind hilfreich (Beweis/Debug).
- Sobald „… ist im Shop" gemeldet ist, übernimmt die Cloud-Session **autonom** den Rest.
