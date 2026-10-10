# Liechtenstein freigegeben (09.10.2026, Betreiber «ändere per api»)

## Gemessen

**CJ-Fracht** (Silikon-Hundeschüssel, `freightCalculate` 09.10. ~22:20 UTC):

| Ziel | Optionen | Günstigste Linien | Laufzeit |
|---|---|---|---|
| Schweiz | 16 | USD 8.66 | 7–10 Tage |
| Liechtenstein | 4 | Liquid Line USD 13.89 / PostNL USD 13.95 | 20–60 / 15–45 Tage |
| Liechtenstein | | DHL USD 37.19 | 3–7 Tage |

**Shopify vorher:**
- Markt «Switzerland» = [CH].
- Versandprofil «General profile»: Zone Domestic [CH] und Zone International (Rest der Welt, CHF 15).

## Getan

1. **Markt:** `marketUpdate` mit `conditionsToAdd.regionsCondition` → Markt = [CH, LI].
   - Danach gab der Testkorb für LI 0 Optionen und die Warnung `MERCHANDISE_OUT_OF_STOCK`. Im LI-Kontext war jedes Produkt
     `availableForSale: false`.
   - Die Zone «Rest der Welt» hat für ein neues Marktland also **nicht** gegriffen. Auch nach 5 Minuten nicht, es war keine
     Verzögerung.
2. **Versandzone:** `deliveryProfileUpdate` → Zone «Liechtenstein» [LI] mit Tarif «Standard Liechtenstein» CHF 14.90, ohne
   Gratisversand.
   - Testkorb danach: LI 1 Option (CHF 14.90, Korb 214.80), CH unverändert 2 Optionen, DE/US 0.
3. **Bestell-Automat** (`cj_order_engine.py`): Fracht, Ländercode, Land und Kanton kommen jetzt aus dem Lieferland.
   - Vorher stand fest `endCountryCode: "CH"`. Damit wäre für Vaduz eine Linie gewählt worden, die dorthin nicht fährt.
   - Andere Länder werden gemeldet, nicht bestellt.
4. **Aufseher:** `liechtenstein_raus` aus der Liste genommen. Der Lauf hätte LI täglich wieder aus Seiten und Rechtstexten
   gestrichen.
5. **Testkorb-Werkzeug:** `tools/testkorb_ausland.py` meldet LI jetzt als freigegeben. Alarm nur noch für DE/US.

## Offen: Texte (Betreiber-Klick)

Die Textänderung wurde in dieser Sitzung vom Klassifikator abgelehnt und **nicht** umgangen. Die Rechtstexte und Seiten
sagen also noch «nur Schweiz». Exakte Ersetzungen:

**Einstellungen → Richtlinien → Versandrichtlinie**
- «Wir liefern **ausschliesslich in die Schweiz**. … gültige Lieferadresse in der Schweiz an.»
  → «Wir liefern **in die Schweiz und nach Liechtenstein**. Ein Versand in andere Länder (z. B. in die EU oder in die USA)
  ist derzeit nicht möglich. Bitte gib bei der Bestellung eine gültige Lieferadresse in der Schweiz oder in Liechtenstein
  an.»
- Unter Versandkosten zusätzlich: «**Liechtenstein:** CHF 14.90 pro Bestellung, ohne Gratisversand. Die Lieferzeit nach
  Liechtenstein beträgt in der Regel 15–45 Tage.»

**AGB**
- Ziffer 5: «… Adresse innerhalb der Schweiz.» → «… Adresse in der Schweiz oder in Liechtenstein.»
- Ziffer 7: «Für Schweizer Kund:innen …» → «Für Kund:innen in der Schweiz und in Liechtenstein …»

**Rückgaberichtlinie**
- «… gilt für Lieferungen innerhalb der Schweiz.» → «… gilt für Lieferungen in die Schweiz und nach Liechtenstein.»

**Seiten**
- `faq`: «Wir liefern ausschliesslich innerhalb der Schweiz.» → «Wir liefern in die Schweiz und nach Liechtenstein.»
- `faq-versand-lieferung`: «Wir liefern ausschliesslich innerhalb der Schweiz. Bestellungen ins Ausland sind aktuell nicht
  möglich.» → «Wir liefern in die Schweiz und nach Liechtenstein. Nach Liechtenstein kostet der Versand pauschal CHF 14.90
  (ohne Gratisversand), und die Lieferung dauert länger: in der Regel 15–45 Tage. In andere Länder liefern wir derzeit
  nicht.»
- `rabatt-newsletter`: «Lieferung nur in die Schweiz.» → «Lieferung in die Schweiz und nach Liechtenstein.»
- `influencer-partner`: «Wir liefern ausschliesslich in die Schweiz.» → «Wir liefern nur in die Schweiz und nach
  Liechtenstein.»

## Lehre

**«Rest der Welt» deckt ein neues Marktland nicht ab.** Erst eine eigene Zone mit dem Land macht es lieferbar. Gemessen wurde
das am Testkorb, nicht an der Konfiguration: Im LI-Kontext galt jedes Produkt als «ausverkauft».

## Nachtrag 10.10.2026 07:10 UTC — Google sieht Liechtenstein, aber noch keinen Versand

- **Google-Diagnosen 10.10. 06:58 (52'383 aktive): «Missing shipping info in some countries [LI]» bei 28'195 Produkten.** Am 09.10. um 11:43, also vor der Freigabe, waren es 785.
- Die Markt-Erweiterung macht Liechtenstein für Google zum Zielland. Die Versandzone «Liechtenstein» (CHF 14.90) liegt im Standardprofil, in dem fast alle Produkte stecken (gemessen per `deliveryProfiles`). Die App «Google & YouTube» übernimmt Versand-Einstellungen zeitversetzt. 8 h nach der Freigabe war der Abgleich noch nicht durch.
- **Die Schweiz ist davon NICHT betroffen.** Die Meldung gilt nur für [LI].
- Nachmessen am 11.10. mit `google_feedback_wache.py` (täglich im Aufseher). Steht die Zahl nach 48 h noch hoch, braucht es einen Betreiber-Klick im Merchant Center: Versand-Einstellungen neu importieren bzw. die automatische Übernahme prüfen.
- Profil «Zendrop» (40 Varianten) hat nur eine CH-Zone, LI fehlt dort. Gering, Zendrop-Ware ist Altbestand.
- **10.10. ~07:30 UTC, Betreiber-Screenshots der App «Google & YouTube» → Einstellungen:** Produktsynchronisierung, «Länder und Sprachen» und **«Versandinformationen» stehen auf «Aktiviert»**. Die automatische Übernahme der Versandzonen ist also an, für den Abgleich ist kein Klick nötig. Produkttitel/-beschreibungen stehen auf «Deaktiviert» und bleiben so (sonst nähme Google die SEO-Titel mit «| LuxeStyle CH»). Nächster Schritt: 11.10. nachmessen. Bleibt «Missing shipping info [LI]» hoch, im Merchant Center unter «Shipping and returns» nachsehen, ob der LI-Service angekommen ist.
- **10.10. ~07:40 UTC, Betreiber-Screenshot Merchant Center → Shipping and returns:** 4 Regeln, alle «Complete», Land Switzerland (Spalte abgeschnitten):
  - flat_7.00 CHF, **4–6 Tage**
  - price_based ×2, **2–5 Tage** (gratis ab CHF 45 / ab CHF 65)
  - flat_15.00 CHF, **2–5 Tage** (Shopify-Zone «International», Rest der Welt)

  **Die LI-Regel (flat_14.90) fehlt noch**, sie ist nicht synchronisiert. Am 11.10. nachsehen.

  **⚠️ NEUER BEFUND, Lieferzeit:** Google führt 2–6 Tage, die Produktseiten der CJ-Ware sagen «Lieferung 10–20 Werktage» (CJ CN→CH 7–20 Tage). Nur Fortura (CH-Lager) schafft 1–2 Tage.
  - Das ist ein falsches Versprechen in den Gratis-Einträgen, Kundenärger und ein Risiko «Misrepresentation».
  - Herkunft der Zeiten klären (Shopify-Versandzeit-Einstellung? App-Vorgabe?) und richtig setzen. Bei gemischter Ware eventuell per `shipping_label` CH-Lager vs. Asien trennen.
  - Nicht von Hand im Merchant Center ändern, der Sync aus Shopify überschreibt es womöglich.
- **10.10. ~07:55 UTC, Herkunft der Google-Lieferzeit geklärt:**
  - Laut Shopify-Hilfe übernimmt die Google-App die **Transitzeit des einzelnen Versandtarifs** (Einstellungen → Versand und Zustellung). Ohne Transitzeit setzt Google typische Landes-Lieferzeiten ein (→ 2–5 Tage); die Bearbeitungszeit kommt aus dem Shopify-Durchschnitt.
  - **Über die Admin-API nicht setzbar.** Per Introspektion gemessen: `DeliveryMethodDefinitionInput` = id, name, description, active, rateDefinition, participant, Bedingungen — kein Transitzeit-Feld.
  - Also ein Betreiber-Klick: General profile → Zone Domestic → jeden Tarif bearbeiten → «Transitzeit» so lang wie ehrlich möglich (CJ 10–20 Werktage), dazu LI + International.
  - Der Betreiber sendet einen Screenshot der Auswahl. App-Einstellung «Versandinformationen automatisch importieren» bleibt (Screenshot 07:50 bestätigt).
