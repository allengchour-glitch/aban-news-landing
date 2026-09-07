# BigBuy-Auszahlung 1'000 € — Stand 07.09.2026, 15:40 UTC (ERSTMALS GEMESSEN)

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

## Was der Betreiber am Dienstag tun sollte

1. Konsole → Geldbörse: Ist der Antrag vom 16.08. **noch offen gelistet** oder verschwunden?
   Ist er weg, neu stellen. (Kundennr. **966388**.)
2. Die offene Transaktion **18138523** (1'000 €, «fällige Zahlung», Banküberweisung)
   **stornieren, NICHT bezahlen.** ⚠️ Vermutung, nicht belegt: Sie könnte der Grund sein,
   warum die Auszahlung nicht ausgeführt wurde — solange BigBuy 1'000 € als fällige
   Einzahlung führt, ist das Guthaben womöglich gebunden. Das ist am Objekt zu prüfen,
   nicht zu glauben.
3. ⚠️ Nie den offenen Marketplace-Checkout (1'190 €/Jahr) abschicken.

## Erst wenn der Dienstag nichts bringt — dieser Text ins Support-Ticket

> Betreff: Auszahlung aus der Geldbörse noch nicht eingetroffen (Kundennr. 966388)
>
> Guten Tag
>
> Am 16.08.2026 habe ich die Auszahlung meines Geldbörsen-Guthabens beantragt und von
> Ihnen die Bestätigung erhalten, dass die Rückzahlung «innerhalb von 5 Werktagen wirksam»
> wird. Diese Frist ist seit drei Wochen abgelaufen; das Guthaben von 1'000 € steht in
> meinem Konto unverändert da, und eine Gutschrift ist nicht eingetroffen.
>
> Bitte teilen Sie mir den Stand der Überweisung mit (Ausführungsdatum, Referenz). Falls
> die Auszahlung nicht ausgeführt wurde, bitte ich um umgehende Ausführung — mein Abo
> endet am 15.09.2026.
>
> Zur Sicherheit weise ich zudem darauf hin, dass die offene Transaktion **18138523**
> storniert und NICHT aus dem Guthaben bezahlt werden soll.
>
> Freundliche Grüsse
> Alleng Chour · Kundennr. 966388

## Automatische Kontrolle (läuft ohne Zutun)

- **Di 08.09. 06:30 UTC** — Erinnerung an den Bearbeitungstag, misst das Guthaben.
- **Fr 11.09. 07:00 UTC** — Gegenmessung: 0.00 = erledigt, 1000.00 = zweiter Fehlschlag,
  dann geht der Support-Text raus.

Ab jetzt braucht keine dieser Kontrollen den Betreiber: **das Guthaben ist von hier aus messbar.**
