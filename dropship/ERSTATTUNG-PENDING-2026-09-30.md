# Erstattete Bestellung zählte als Verkauf (30.09.2026, Verbesserungsrunde 08:25)

GEMESSEN: #1019 um 05:34 + 06:01 UTC voll erstattet (16.11 + 7.00 = 23.11), beide REFUND-Buchungen PENDING (Shopify Payments
bucht nach 1–2 Tagen). Solange steht `displayFinancialStatus` = PAID und `totalRefundedSet` = 0.00. Folge in drei Zählern:
- `bestell_ampel.py`: «erstattet» schon bei der Teilerstattung 16.11/23.11 (prüfte nur, OB es eine Rückerstattung gibt) — morgens behoben.
- `betreiber_ampel.py` GROW: **2/3** (#1019, #1020) statt **1/3** — die Betreiber-Zusage «bei 3 Verkäufen Grow-Plan» wäre zu früh ausgelöst.
- `verkauf_ziel.py`: 30 T **3** statt **2** Verkäufe, 7 T 2/7 statt 1/7.

GETAN: `automation/erstattung.py` (REFUND-Buchungen SUCCESS + PENDING summieren, 4 Kanarienvögel: #1019 voll, Teilerstattung,
gescheiterte Buchung, #1020 ohne) — alle drei Zähler nutzen es; GROW schliesst zudem stornierte Bestellungen aus.
Nachher: GROW 1/3 (#1020) · VERKAUF-ZIEL 30 T 2 · Ampel #1019 erstattet.
REGEL: Ein Betrag an Geld wird an den Buchungen gemessen, nie am Anzeigestatus oder an einem Summenfeld, das erst nach der Abwicklung stimmt.
