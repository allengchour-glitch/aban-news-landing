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

---

## 📋 BEFEHL (copy-paste für PC-Claude) — komplette „Swiss Edition Loungewear"-Kapsel
> Voraussetzung: Gelato-Dashboard offen + eingeloggt, Store = **LuxeStyle**. Lege die **8 Produkte** unten an.
> Pro Produkt: **Create product → Apparel → Produkt wählen → Schnitt/Farbe → Design zentriert auf Brust (mittelgross,
> sauber) → Titel → Publish to LuxeStyle.** Designs = **dieselben Schweizer Motive wie bei den vorhandenen Postern**
> (aus deiner Gelato-Design-Bibliothek; sonst die gleiche Bilddatei erneut hochladen). **Nur anlegen + publishen,
> nichts löschen.** Danach melden: „Gelato-Loungewear ist im Shop".

| # | Gelato-Produkt | Schnitt | Farbe | Motiv (Design) | Druck-Platzierung | DE-Titel | Preis CHF |
|---|---|---|---|---|---|---|---|
| 1 | **Hoodie** (Pullover) | Unisex | Heather Grey | Edelweiss (Vintage Botanical) | Brust zentriert, mittel | Hoodie «Edelweiss» · Swiss Edition | 64.90 |
| 2 | **Jogger Pants** | Unisex | Heather Grey | Edelweiss (klein) | linke Hüfte/Oberschenkel, klein | Jogger «Edelweiss» · Swiss Edition | 59.90 |
| 3 | **Sweatshirt** (Crewneck) | Unisex | Black | Matterhorn Sunset | Brust zentriert | Sweatshirt «Matterhorn» · Swiss Edition | 54.90 |
| 4 | **Hoodie** (Pullover) | Unisex | Natural/Cream | Swiss Alpine Cow (Floral Crown) | Brust zentriert | Hoodie «Alpenkuh» · Swiss Edition | 64.90 |
| 5 | **T-Shirt** (Short-Sleeve) | Damen | White | Edelweiss | Brust zentriert | Damen-Shirt «Edelweiss» · Swiss Edition | 34.90 |
| 6 | **T-Shirt** (Short-Sleeve) | Herren | White | Matterhorn | Brust zentriert | Herren-Shirt «Matterhorn» · Swiss Edition | 34.90 |
| 7 | **Tank-Top** | Damen | White | Alpsee Reflection | Brust zentriert | Damen-Tank «Alpsee» · Swiss Edition | 29.90 |
| 8 | **Sweatshirt** (Crewneck) | Unisex | Heather Grey | Retro Fondue Art | Brust zentriert | Sweatshirt «Fondue» · Swiss Edition | 54.90 |

**Regeln:** Motiv zentriert + nicht zu gross (Brustbereich), sauber im Druckfeld. Alle verfügbaren Grössen aktiviert lassen
(S–2XL). #1 + #2 sind ein **Set** (gleiches Motiv/Farbe). Jedes Produkt **einzeln „Publish to LuxeStyle"**.
Wenn alle 8 im Shopify-Shop sind → der Cloud-Session melden: **„Gelato-Loungewear ist im Shop"** → sie macht DE-Titel/SEO,
Collection „Loungewear" + Menü, Cross-Sell (Hoodie+Jogger), Werbe-Queue.
