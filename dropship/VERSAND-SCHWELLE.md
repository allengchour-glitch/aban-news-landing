# 🚚 Versand-Schwelle LuxeStyle — warum „ab CHF 50" richtig ist, obwohl die Regel 45 sagt

> **Kurz: Die Zahl im Text (50) und die Zahl in der Versandregel (45) sind absichtlich verschieden.**
> Wer nur eine der beiden sieht, hält die andere für einen Fehler und „korrigiert" sie kaputt.
> Das ist am 04.10.2026 zwei Sitzungen am selben Tag passiert. Vor jeder Änderung diese Seite lesen.

## Gemessen am 04.10.2026 (live, mit Gegenprobe)

**Versandregeln** (Admin-API, Profil „Allgemeines Profil", Zone Domestic/CH):

| Methode | Preis | Bedingung | aktiv |
|---|---|---|---|
| Standard | CHF 7.00 | — | ja |
| Standard (Range-Regel) | CHF 0.00 | Korb ≥ CHF 65 | ja |
| Kostenloser Versand | CHF 0.00 | Korb ≥ CHF 45 | **ja** |
| Kostenloser Versand | CHF 0.00 | Korb ≥ CHF 50 | nein |
| Kostenloser Versand | CHF 0.00 | Korb ≥ CHF 45 | nein (Dublette) |

**Gegenprobe an der echten Kasse** (Storefront-API, Warenkorb mit CH-Adresse):

- Korb CHF 54.90 → Optionen: *Kostenloser Versand CHF 0.00* **und** Standard CHF 7.00
- Korb CHF 44.90 → Option: **nur** Standard CHF 7.00

→ Die wirksame Schwelle ist **CHF 45 auf den Korbbetrag NACH Rabatt** (`cart.total_price`).

## Warum im Text trotzdem CHF 50 steht

Die Versandregel prüft den Betrag **nach Abzug von Rabatten**. Der meistbeworbene Code ist
**WELCOME10 (−10 %, aktiv bis 31.12.2027)**. Ein Korb mit CHF 45.90 Ware fällt mit diesem Code auf
CHF 41.31 — die Kasse verlangt dann CHF 7, obwohl die Seite „gratis ab 45" versprochen hätte.

**50 × 0,9 = 45** → „ab CHF 50 Warenwert" ist die kleinste Zahl, die das Versprechen auch mit einem
10 %-Code in **jedem** Korb hält. Darum steht 50 in Texten, Policy und Theme.

Belegt wird das von der Messung einer früheren Sitzung, die im Code steht
(`layout/theme.liquid`, Zeile ~377, `var SCHWELLE=4500`): gemessen am 09.09.2026 über
`/cart/shipping_rates.json` — 1 × 45.90 → gratis; 2 × 24.90 (Ware 49.80, nach damaligem
Automatik-Rabatt 44.82) → CHF 7. Der Balken rechnet deshalb bewusst gegen den Warenwert.

## Stand heute: der Shop ist konsistent

- **Versandrichtlinie (Policy):** „Gratis-Standardversand ab einem Bestellwert von CHF 50" ✅
  (die Notiz in PR #2526 „AGB sagt 65" ist überholt — live geprüft 04.10.)
- **Theme** (`templates/index.json`, Trust-Leiste + Vertrauenstext): „ab CHF 50" ✅
- **Warenkorb-Balken** (`layout/theme.liquid`): `SCHWELLE=4500` auf `total_price` ✅ (richtig, s. o.)
- **~2'300 aktive Produkte + 443 Collections:** „Gratis-Versand ab CHF 50" ✅
- **Automatik-Rabatte:** aktuell **keine** aktiv (der alte „2+ Artikel −10 %" ist weg; die 10–30 %
  sind alle Code-Rabatte). Die 50 schützt trotzdem weiter, weil die Codes beworben werden.

## Was am 04.10.2026 korrigiert wurde

- **7 Produktseiten** sagten im neuen FAQ-Block „gratis ab CHF 65" (zu hoch, von dieser Sitzung
  geschrieben) → auf 50 gesetzt.
- **5 Produktseiten** sagten „gratis ab CHF 45" (zu tief, von einer Parallelsitzung geschrieben,
  mit dem Zusatz „live in den Versandregeln geprüft" — die Messung stimmte, die Schlussfolgerung nicht)
  → auf 50 gesetzt.
- **365 weitere Objekte** hatte diese Sitzung bereits von 50 auf 45 „korrigiert", bevor der
  Theme-Kommentar auffiel → **vollständig zurückgesetzt und nachgeprüft** (377/377 wieder auf 50,
  0 Reste). Das Theme wurde ebenfalls zurückgesetzt.

## Offene Entscheidung (nur der User)

Mit **15 %-Codes** (FIRST15, INSTA15, BIRTHDAY15) hält die 50 nicht: 50 × 0,85 = 42.50 < 45.
Sauber wäre eine der drei Varianten:

1. Versandregel auf **CHF 40** senken → „ab CHF 50" hält bis −20 % Rabatt. (Kostet Marge.)
2. Die 15 %-Codes abschalten oder auf einen Mindestbestellwert setzen.
3. Text präzisieren: „Gratis-Versand ab CHF 45 Bestellwert **nach Rabatt**". Ehrlich, aber sperriger.

Bis dahin bleibt **50** die sichere Zahl. Nicht eigenmächtig ändern.

## Messwerkzeug

`tools/versandregel.mjs` erkennt Versand-Schwellen im Text und ignoriert Längen-, Liter-,
Watt- und Zoll-Angaben. `tools/versandregel_test.mjs` prüft beide Richtungen
(muss erkennen / darf nicht anschlagen) — vor jedem Masseneinsatz laufen lassen.

**Lehre:** Ein erstes, grobes Suchmuster meldete 23'611 „Fehler" — darunter „Länge von 50-65 cm",
„Fassungsvermögen von 70 Litern", „Wasserdichtigkeit von 50 Metern". Erst das enge, in beide
Richtungen geprüfte Muster zeigte die echte Lage: 12 Formulierungen, alle „CHF 50", alle **richtig**.
