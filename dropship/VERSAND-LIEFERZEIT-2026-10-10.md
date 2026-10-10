# Lieferzeit je Versandtarif gesetzt (10.10.2026, Betreiber «1 erledige du»)

## Gemessen

- **Google** führte für die Schweiz 2–6 Tage Lieferzeit (Diagnose 09.10.: flat_7.00 «4–6 Tage», gratis «2–5 Tage»).
- **Die Kasse** zeigte beim Tarif «Standard» CHF 7.00 eine Transitzeit von **3–5 Tagen** (`minTransitTime` 259200 s, `maxTransitTime` 432000 s).
- Die anderen Tarife hatten gar keine Zeit: «Kostenloser Versand» ab CHF 45, «International» CHF 15, «Standard Liechtenstein» CHF 14.90 und Zendrop «[Free Shipping]».
- **Die Versandrichtlinie** sagt: Direktversand ab Lieferantenlager (der grösste Teil des Sortiments) **10–20 Werktage**. Nach Liechtenstein laufen die CJ-Linien 15–45 Tage (Liquid Line/PostNL).
- **Schreibbar ist die Transitzeit nur in der Admin-API-Version `unstable`.** Dort gibt es `DeliveryMethodDefinition.rateGroups` → `DeliveryRateDefinition.minTransitTime/maxTransitTime` und zum Schreiben `rateGroupsToUpdate.rateDefinitionsToUpdate` (Shopify-Changelog vom 24.02.2026).
- In 2026-01 und 2026-10 fehlen die Felder in `DeliveryMethodDefinitionInput`. Deshalb stand das bisher als Betreiber-Klick in der Liste.

## Getan

`deliveryProfileUpdate` (Version `unstable`), Preise und Bedingungen unverändert. Vorher-Stand liegt in `dropship/_versand_transit_vorher_2026-10-10.json`.

| Profil / Zone | Tarif | Preis | vorher | jetzt |
|---|---|---|---|---|
| General / Domestic (CH) | Standard | CHF 7.00 | 3–5 T | **10–20 T** |
| General / Domestic (CH) | Kostenloser Versand ab CHF 45 | 0 | – | **10–20 T** |
| General / Liechtenstein | Standard Liechtenstein | CHF 14.90 | – | **15–45 T** |
| General / International | International | CHF 15.00 | – | 10–20 T (kein Markt, nur für Google-Feedländer) |
| Zendrop / CH | [Free Shipping] | USD 0 | – | 10–20 T (Tarif in USD, beim ersten Versuch abgelehnt: «multiple currencies») |

- **Zurückgelesen:** alle 5 Tarife haben die neue Zeit, die Bedingung «≥ CHF 45» ist unverändert.
- **Testkorb** (`tools/testkorb_ausland.py`): CH 2 Optionen, LI 1 Option (CHF 14.90), DE/US 0. Unverändert.
- **Nicht angefasst:** 27 App-Profile von Gelato (Druck auf Bestellung, Regel «Editor/POD heilig»; nur T-Shirts mit 18 und Hoodies mit 24 Varianten tragen Ware) und «Shopify Collective». Die App setzt dort Preise und Zeiten selbst.

**Wächter `automation/versand_transit_wache.py`** mit Regel `automation/data/versand_transit_regel.json`:
- Er prüft täglich jeden aktiven Tarif aller eigenen Profile: CH 10–20, LI 15–45, Rest 10–20 Tage.
- Ein neuer Tarif ohne Zeit wird mit `--scharf` nachgezogen, der Preis bleibt.
- Er prüft auch, ob die Versandrichtlinie die Sätze noch enthält, aus denen die Zahlen stammen. Fehlt ein Satz, gilt die Regel als veraltet.
- Lauf: «VERSAND-LIEFERZEIT: 5 Tarife mit ehrlicher Lieferzeit».

## Offen

- **Google** übernimmt die Versand-Einstellungen zeitversetzt. Am 11./12.10. Diagnose nachmessen (`google_feedback_wache.py`) und die Lieferzeit im Merchant Center ansehen (Betreiber, falls gewünscht).
- **Die Kasse zeigt jetzt «10–20 Werktage».** Das ist ehrlich, kann aber Käufe kosten. Fortura-Ware (Schweizer Lager, 1–2 T) hängt im selben Profil. Ein eigenes Profil «Blitzversand» mit 1–2 T wäre der nächste Schritt, falls Fortura-Ware wieder zählt.

## Lehre

**«Geht nicht über die API» gilt nur für die Version, in der man nachgesehen hat.** Die Transitzeit fehlte in 2026-01 und 2026-10, steht aber in `unstable` (Changelog Feb. 2026). Vor «Betreiber-Klick» die Shopify-Doku durchsuchen und die Introspektion über alle Versionen laufen lassen (`2026-10`, `2027-01`, `unstable`).
