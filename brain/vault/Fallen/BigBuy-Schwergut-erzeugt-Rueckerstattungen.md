---
tags: [falle, teuer-gelernt]
quelle: Order-Audit 2026-09-12
gelernt: 2026-09-12
---
# BigBuy-Schwergut erzeugt Rueckerstattungen

Von 14 Bestellungen seit Juli sind **drei echte Kundenbestellungen ueber CHF 869.62 unerfuellt
zurueckerstattet** worden — mehr Geld als die CHF 175.50, die aus den fuenf bezahlten Bestellungen
geblieben sind.

| Order | Produkt | SKU | CHF |
|---|---|---|---|
| #1006 | Kompakte Kuehlung (Klimagerät) | `BB-S0465893` | 426.51 |
| #1007 | Flexible Raumkuehlung (Klimagerät) | `BB-S91120937` | 265.90 |
| #1008 | Schlauchboot Intex, 366 cm | **`null`** | 177.21 |

Alle drei sind **BigBuy-Sperrgut**. Bei #1008 fehlte die Lieferanten-SKU vollstaendig — das
Produkt war von Anfang an nicht lieferbar. Genau die Fake-SKU-Falle (Master-Lesson 6) und die
Sperrgut-Regel (Master-Lesson 9), beide im Runbook, beide trotzdem passiert.

**Die Gegenprobe zeigt das Muster scharf:** alle fuenf BEZAHLTEN Bestellungen sind
CJ-Kleinware mit echter `CJ-`-SKU zwischen CHF 20.90 und 41.90, mit CJPacket-Tracking. Alle
drei Rueckerstattungen sind BigBuy zwischen CHF 177 und 427.

Behoben ist nur der Einzelfall: beide Klimageräte stehen auf DRAFT, das Boot existiert nicht
mehr. **Offen bleibt die Klasse:** 279 aktive BigBuy-Produkte, **keines mit Gewicht**, darunter
Markenware (Michael Kors, Jimmy Choo, Puma Ferrari, Oral-B). Eine eigene gemessene Runde wert.

**Regel: vor dem Aktivschalten eines BigBuy-Produkts pruefen, ob eine Lieferanten-SKU da ist
und ob es sich ueberhaupt in die Schweiz schicken laesst.** Ein Verkauf, der zurueckerstattet
werden muss, kostet mehr als kein Verkauf: er kostet das Vertrauen eines Kunden, den der Shop
alle zwoelf Tage nur einmal bekommt.


**Traegt der Skill `shopify-publizieren`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
