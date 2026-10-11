# Preise, Verkauf-Gewinn und Zahllink — 11.10.2026

Auftrag Betreiber: «preisanpassung, heute 2 verkauf aber wenig gewinn» · «google merchant push und ads» ·
«alles automatisieren» · «cj pay link verbessern bei bestellung».

## Gemessen
- **#1023 Magnetische 3-in-1-Ladestation:** Verkaufspreis 71.90, Kundin zahlte 63.81 (WELCOME10, 10 %).
  EK 48.73 CHF = CJ-Ware USD 46.95 + Fracht USD 12.57 (Detail-API). Gewinn ca. CHF 12 vor Zahlgebühr.
- **#1024 Bügeltransfer (Mister DTF, kein CJ):** A3 24.90 + A5 11.90, minus 10 %, plus Versand 7.00 = 40.12.
  Einkauf Mister DTF 38.60. Gewinn ca. CHF 1.50.
- **Transfer-Varianten hatten keinen Einkaufspreis** (`unitCost` null). Der Verlustschutz überspringt Varianten
  ohne EK. A5 (11.90) verlor pro Verkauf ca. CHF 7, obwohl Mister DTF nur A3-Bögen verkauft.
- **Google Ads, Sirène-Test (Tag 2):** 24 Sitzungen, alle auf fremden Produkten, 0 Warenkorb.
  Die Produktgruppe «Alles andere» ist noch aktiv.
- **CJ-Zahllink:** `payBalance` ist tot (Guthaben erst ab USD 2000). Die Zahllink-ID `P2109…` steht in keinem
  Bestellfeld der API und ist nicht gleich einer Bestell-ID (0 Treffer). Ein direkter Link pro Bestellung ist
  daher nicht erzeugbar.
- **CJ-Shopify-Connector** legt für jede Shopify-Bestellung eine leere Hülle an (`DP…`, Status CREATED, ohne Betrag):
  für #1022, #1023 und #1024. Hüllen sind nicht bezahlbar, verstopfen aber die Zahlungsliste.
- **CJ-Token** war seit 20:07 UTC abgelaufen. Erneuert über `CJ_API_KEY` (`authentication/getAccessToken`).

## Getan
1. **Preise:** Ladestation 71.90 → **75.90** (Gewinn bei 15 % Rabatt 9.40 → 12.65 CHF).
   Bügeltransfer A3 24.90 → **35.90**, A5 11.90 → **35.90** (A3 bei 15 %: +3.83 → +12.76 CHF; A5: −6.74 → +12.76 CHF).
2. **Einkaufspreis:** TRANSFER-A3 und TRANSFER-A5 je **22.80 CHF** (Bogen Öko-Tex 12.90 + A-Post 9.90).
3. **Automatik:** `automation/verkauf_gewinn_wache.py` läuft täglich im Aufseher (`fixer_keepalive.sh`).
   Sie prüft nur VERKAUFTE Varianten der letzten 60 Tage. Ziel: CHF 12 Gewinn bei 15 % Rabatt, gerundet auf .90,
   Versand 0 ab CHF 45, sonst 7.00. Nur HEBEN, höchstens +50 % je Lauf, höchstens 20 Änderungen.
   Protokoll `dropship/_verkauf_gewinn.tsv`, Stand `dropship/_verkauf_gewinn_stand.json`.
   Ampel-Zeile «VERKAUF-GEWINN» erscheint nur, wenn etwas offen ist.
4. **Handy-Benachrichtigung** zu neuen CJ-Bestellungen zeigt jetzt direkt die Liste der wartenden Bestellungen
   (`orderList?orderType=5`) statt der allgemeinen Seite.

## Nur der Betreiber kann
- **Google Ads:** «Alles andere» in der Produktgruppen-Struktur ausschliessen, oder die Kampagne bis dahin pausieren.
  Ohne Ausschluss zahlt der Test für fremde Produkte. Steuerdatei: `dropship/_werbetest_aktiv.json`.
- **Google Merchant:** Preisänderungen übernimmt der Shopify-Channel automatisch. Ein manuelles «Jetzt abrufen»
  geht nur im Merchant Center. Über die API ist kein Feed sichtbar (`productFeeds` leer).
- **CJ-Hüllen:** den CJ-Shopify-Connector trennen oder die leeren Hüllen in CJ entfernen.
- **Entscheid A5:** Mister DTF hat nur A3-Bögen. A5 hat also keinen Kostenvorteil; A5 streichen oder bewusst gleich bepreisen.
- **Ohne Einkaufspreis:** `LX-23-KRISTALL-SET-3-TEILIG` wurde verkauft, sein Gewinn ist unbekannt. Lieferantenpreis nötig.
