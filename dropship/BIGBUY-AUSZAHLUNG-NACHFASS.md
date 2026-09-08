# BigBuy-Auszahlung 1'000 € — Stand 08.09.2026 (Ursache gefunden: kaputte IBAN)

## Der Antrag vom 16.08. ist NICHT ausgeführt worden

Das war bis heute nicht prüfbar; mit dem Produktions-Schlüssel des Betreibers ist es gemessen:

| gemessen 07.09.2026 | Ergebnis |
|---|---|
| `GET /rest/user/purse.json` | **`"1000.00"`** (zweimal unabhängig gelesen) |
| Bestätigungsmail «wirksam innerhalb von 5 Werktagen» | 16.08. 11:12 UTC, `noreply@bigbuy.eu` |
| BigBuy-Mails seither (`from:bigbuy after:2026/08/15`) | **keine** ausser dieser Bestätigung und einem Bestellabschluss vom 15.08. |

**Das Geld liegt also drei Wochen nach Fristablauf unverändert im Konto.** Es gab keine
Ablehnung, keine Nachfrage, keine zweite Mail — der Antrag ist einfach nicht passiert.

⚠️ `/rest/user/moneybox.json` gibt es NICHT (HTTP 400). Der Topf heisst **purse**.
Die frühere Notiz «Moneybox 0.00 seit 07.07.» war am falschen Endpunkt gemessen.

## Der Weg ist Selbstbedienung, keine Support-Mail

Recherche vom 04.09. (BigBuy-Academy, in der Routine des Betreibers festgehalten):
Die Auszahlung wird **in der Konsole selbst beantragt**, und BigBuy bearbeitet Auszahlungen
**nur dienstags**.

| Datum | Wochentag | Bedeutung |
|---|---|---|
| **08.09.2026** | **Dienstag** | realistisch der letzte brauchbare Bearbeitungstag |
| 15.09.2026 | Dienstag | Frist — und zugleich der Tag, an dem das Abo endet. Darauf zu setzen ist ein Risiko |

## ⛔ KORREKTUR 08.09.2026: DIE URSACHE IST GEFUNDEN — die gespeicherte IBAN ist kaputt

Es gab nicht EINEN Antrag, sondern **zwei** — und beide sind von BigBuy bestätigt und
keiner je ausgefuehrt worden. Selbst nachgerechnet (ISO 13616, mod 97):

| Antrag | Betrag | IBAN-Laenge | Pruefziffer | Folge |
|---|---:|---:|---|---|
| 15.07.2026 | EUR 750 | 21 (korrekt) | **gueltig** | technisch ausfuehrbar — die Nummer gehoert laut Betreiber aber nicht ihm |
| 16.08.2026 | EUR 1'000 | **22** (eine zu viel) | **ungueltig** | keine Bank kann das ausfuehren — das Geld konnte nie weg |

**Der Unterschied ist der Punkt:** Eine ungueltige IBAN prallt ab, eine gueltige FREMDE zahlt
an einen Fremden. Beruhigend ist die Bilanz: Die Geldboerse steht unveraendert auf 1'000.00 —
haette das 750er-Geld sie verlassen und waere nicht zurueckgekommen, stuende dort weniger.
Das ist vereinbar mit «nie etwas hinausgegangen», aber kein Beweis; nur BigBuy weiss es.

## ⛔ Transaktion 18138523 NICHT stornieren — die frueherer Anweisung ist ZURUECKGEZOGEN

Hier stand bis zum 08.09. «stornieren, nicht bezahlen». **Das war gefaehrlich und ist falsch.**
Ich hatte die Konsolen-Beschriftung («faellige Zahlung») als Forderung GEGEN uns gelesen.
Am Objekt gelesen ist sie das Gegenteil: `order/18138523.json` gibt die Position
**«Ingreso en monedero»** — spanisch fuer *Einzahlung in die Geldboerse* —, Versandart
«Pack servicios, no requiere entrega», 1'000 EUR, angelegt 07.07.2026, Status «Pendiente de pago».

**Das ist die Einzahlung SELBST, nicht eine Rechnung an uns. Wer sie storniert, storniert
womoeglich genau den Vorgang, der die 1'000 EUR traegt.** Nicht anfassen, ohne BigBuy zu fragen.

⚠️ Offen und NICHT aufgeloest: Die Geldboerse steht auf 1'000.00, die Einzahlungs-Bestellung auf
«unbezahlt». Entweder wurde eingezahlt und der Datensatz nie geschlossen, oder die 1'000 stammen
von woanders. Das weiss nur BigBuy.

## Was der Betreiber tun sollte — der Kanal ist ein TICKET, keine Mail

⚠️ **BigBuys Support-Mail ist ein Autoresponder.** Auf die ausfuehrliche Anfrage vom 07.09. kam
am 08.09. 07:39 UTC eine Vorlage: «der schnellste Weg ist ein Ticket im Contact Area», Abteilung
**💳 Administration** (Invoices, refunds, tax information), «nur am Computer bedienbar, nicht am
Handy». **Keine der vier Fragen wurde beantwortet.** Wer dort per Mail nachfasst, landet im
Vorlagen-Kreis.

1. **Am Computer** einloggen → Contact Area → Abteilung **💳 Administration** → Ticket eroeffnen.
2. Im Ticket **zuerst die IBAN korrigieren** bzw. die richtige nennen — solange die gespeicherte
   Nummer 22 Zeichen hat, prallt jede Auszahlung ab, egal wie oft sie beantragt wird.
3. Nach dem Stand der beiden Antraege fragen (15.07. EUR 750, 16.08. EUR 1'000) und ausdruecklich
   fragen, **was der Datensatz 18138523 ist** — nicht ihn stornieren.
4. ⚠️ Nie den offenen Marketplace-Checkout (1'190 EUR/Jahr) abschicken.

Kundennr. **966388**. ⚠️ Bankdaten stehen in KEINER Repo-Datei — das Repo ist oeffentlich;
sie leben nur in der Mail.

## Automatische Kontrolle (läuft ohne Zutun)

- **Di 08.09. 06:30 UTC** — Erinnerung an den Bearbeitungstag, misst das Guthaben.
- **Di 08.09. 17:20 UTC gemessen: weiterhin `"1000.00"`** — am letzten Bearbeitungsdienstag
  mit Reserve ist nichts geflossen.
- **Fr 11.09. 07:00 UTC** — Gegenmessung: 0.00 = erledigt, 1000.00 = dritter Fehlschlag.

Ab jetzt braucht keine dieser Kontrollen den Betreiber: **das Guthaben ist von hier aus messbar.**
