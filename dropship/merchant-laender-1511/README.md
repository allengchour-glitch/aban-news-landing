# Merchant: warum Liechtenstein am 15.11.2026 einbrach (nur lesen)

**Anlass:**

- Merchant Center meldete am 15.11. um 22:24 UTC «Für einige Länder fehlen Versandinformationen» bei 261 181 Produkten.
- Die Mail von Google nennt für Liechtenstein 16:30 bis 22:30 UTC:
  - Kostenlose Einträge −33 % (232 323 → 155 502)
  - Shopping-Anzeigen −32 % (63 813 → 42 854)

**Werkzeug:** `automation/merchant_bildprobleme.py` hat zwei neue Modi. Beide lesen nur und geben keine Kontonummer aus.

- `laender` zählt je Problemcode die Länder und Berichtskontexte.
- `versand` liest die Versanddienste des Kontos.

Start über Actions «Merchant-Bildprobleme lesen» mit der Eingabe `modus`.

## Messung (GEMESSEN)

**Lauf `laender`:** 15.11. 23:07 bis 23:10 UTC, Lauf 43773061116, 168 000 Zeilen.

- `missing_shipping_no_shipping_service_defined_for_country` ist **nur in Liechtenstein** gesperrt:
  - 160 095 Artikel in den kostenlosen Einträgen
  - 72 017 Artikel in den Shopping-Anzeigen
  - Betroffen sind alle deutschen Angebote der Google-App (72 017 von 72 017) und fast alle Autofeed-Angebote.
- **Die Schweiz ist davon nicht betroffen.** In der Schweiz sind nur kleine Gruppen gesperrt:
  - 459 fehlende Pflichtangabe
  - 162 «persönliche Notlagen», nur Remarketing
  - 86 Werbeeinblendung im Bild
  - 70 Bild zu klein
  - einzelne Richtlinienfälle
- Die 7 000 französischen Angebote der App haben den Liechtenstein-Fehler nicht. Ursache unbekannt.
- 168 000 ist eine runde Zahl. Ob Google die Abfrage an dieser Stelle abschneidet, ist nicht geprüft.

**Lauf `versand`:** 15.11. 23:22 UTC, Lauf 43774438786.

- Im Konto stehen drei Versanddienste, alle nur für CH:
  - CHF 7.00
  - gratis ab CHF 45
  - CHF 15.00 (Shopify-Zone «International»)
- **Für LI gibt es keinen Dienst.**

**Weitere Belege:**

- Die Abannews-Sitzung las dasselbe um 23:18 UTC mit `merchant-versand.yml` (Trockenlauf).
- **Shopify:** Der Markt «Switzerland» umfasst CH und LI. Das Versandprofil hat eine Zone «Liechtenstein» mit «Standard Liechtenstein» für CHF 14.90 (aktiv, gelesen 23:25 UTC). Die Google-App überträgt diese Zone nicht ins Merchant Center.

## Zeitachse

| Zeit (UTC) | Ereignis | Quelle |
|---|---|---|
| 11.11. 18:57 | Dienst «Standard Liechtenstein» CHF 14.90 über die Merchant API angelegt | `merchant_versand.py` |
| 15.11. 18:43 | Reports zählen den Fehler nur 979-mal: der Dienst wirkt | Abannews-Sitzung |
| 15.11. 16:30 bis 22:30 | Liechtenstein −33 % | Mail von Google |
| 15.11. 23:18 / 23:22 | Der Dienst fehlt, nur noch die drei Schweizer Dienste | zwei Läufe |

**Hypothese (nicht belegt):** Die Google-App in Shopify schreibt die Versanddienste neu, wenn sich am Versand etwas ändert. Dabei hat sie den von Hand angelegten Liechtenstein-Dienst entfernt.

- Kandidat für den Auslöser: Am 15.11. um 22:17 UTC wurde die LED-Wasserwellen-Lampe in ein anderes Versandprofil verschoben.
- Das passt aber nicht zum Beginn des Fensters (16:30 UTC). Der Auslöser ist darum offen.

## Was zu tun ist

1. **Dienst wieder anlegen:**
   - Werkzeug `automation/merchant_versand.py`, Modus `schreiben`. Der Besitzer hat Variante A am 10.11. freigegeben.
   - Die Abannews-Sitzung hat das um 23:18 UTC vorbereitet. Darum hier **nicht doppelt geschrieben**.
   - Das Werkzeug schreibt nichts, wenn schon ein aktiver Liechtenstein-Dienst besteht.
2. **Damit er nicht wieder verschwindet:**
   - Eine tägliche Prüfung, die den Dienst nur dann anlegt, wenn er fehlt.
   - Oder Liechtenstein als Zielland herausnehmen (Entscheid des Besitzers).
   - Solange die Google-App die Dienste überschreibt, hält ein einmaliges Anlegen nicht.

**Wirkung auf Verkäufe:** klein. Liechtenstein ist ein kleiner Markt, bisher eine Bestellung (#1032). Anzeigen laufen nicht. Die Schweiz ist nicht betroffen.

## Stand 16.11.2026

- **Dienst wieder angelegt 15.11. 23:52 UTC** (Werkzeug `merchant_versand.py`, Modus `schreiben`, eigener Zweig). Ein Lauf eine Minute danach las vier Dienste: die drei Schweizer unverändert und «Standard Liechtenstein».
- **Täglicher Wächter gebaut** (Besitzer «a»): Workflow `merchant-versand.yml`, Zeitplan 05:29 UTC, Modus `waechter`, Schalter `dropship/merchant-versand-1111/WAECHTER`. Doku, Exit-Codes und Prüfung: `dropship/merchant-versand-1111/README.md`.
- **Ungemessen:** ob Google die Sperre in Liechtenstein aufhebt (Stunden bis Tage), wann die Google-App die Dienste das nächste Mal neu schreibt.
