# Netzstecker unklar — Stand 2026-11-23

CJ fuehrt diese Geraete in mehreren Steckerversionen; unser Shop hat EINE Variante, deren SKU nicht die EU-Version ist. Welche Version CJ schickt, ist damit nicht belegt. Entscheidung: Variante auf die EU-SKU umstellen (Betreiber) oder DRAFT.

- `16731870921095` 30W GaN Schnellladegerät Dual-Port USB-A & USB-C — CJ CN/EU/UK/US · unsere SKU `CJ-2611050410201620000` · EU-SKU `CJSJ357372808HS`
- `15496383594881` Mini Fast Charge 24W Wireless Charger — CJ EU/US · unsere SKU `CJ-1393463504740159488` · EU-SKU `CJCD113001801AZ`
- `15500069175681` Rasche Ladestation 24 — CJ EU/UK/US · unsere SKU `CJ-1710193675491352576` · EU-SKU `CJCD186374402BY`

## Auf DRAFT (keine EU-Version bei CJ)

- `15496384577921` 4-in-1 Wireless Charger für iPhone & Zubehör — nur US
- `15499698340225` Dreifach-Wireless-Ladeschale — nur CN

---
# Netzstecker unklar — ERLEDIGT 21.09.2026 (Betreiber «mach alles selber und fix»)

Die 29 Geräte mit Tag `stecker-unklar` sind umgebaut (`automation/cj_stecker_eu_varianten.py`,
Ledger `dropship/_cj_stecker_eu_varianten.txt`):

- **23 Geräte** haben jetzt eine echte **Farbauswahl** (2–7 Werte, deutsch), jede Variante mit ihrer CJ-EU-SKU.
- **4 Geräte** eine **Ausführungs-Auswahl** (z. B. «1 Akku + Ladegerät / 2 Akkus + Ladegerät», «Modell 113/116»).
- **1 Gerät** (Ionen-Lockenstab) hat die eindeutig zum Titel passende EU-Variante als einzige SKU (mit Ionen, CHF 24.90).
- **1 Gerät** ist Entwurf: der 2000-W-Haartrockner — CJ führt nur Bündel («Buy 1 Get 8 …», 12× Preisspreizung),
  welches Set die Kundin bekäme, ist nicht belegbar (Tag `stecker-unklar-buendel`).

Preise: heutiger Preis für alle Varianten bis 15 % über der günstigsten EU-Variante, teurere proportional
(auf .90), nie darunter. Lager wie zuvor (CJ-Ware, keine Bestandsführung). Bilder je Farbe kommen nach dem
Grow-Plan (~21.10., Dateispeicher). Jede Variante wurde nach dem Schreiben am Objekt zurückgelesen.

