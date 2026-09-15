# BigBuy: EUR 1'000.00 zurückholen — Stand 15.09.2026

> Zweite Fassung. Die erste lag als **nicht committete** Datei im Arbeitsbaum und wurde von
> `automation/repo_vorspulen.sh` gelöscht (`git stash -u` … `git stash drop`, Zeilen 21/34).
> **Lehre: Ein Bericht, der nicht committet ist, existiert nicht** — beim nächsten Neustart
> ist er weg. Diese Datei wird sofort committet.

## Was gemessen ist (nicht geschätzt)

| Messung | Befehl | Ergebnis |
|---|---|---|
| Guthaben | `GET /rest/user/purse.json` | `"1000.00"` — **unverändert seit 15.07.** |
| Zugang lebt | `GET /rest/catalog/languages.json` | HTTP 200, obwohl das Abo heute endet |
| Auszahlung per API | 10 Endpunkte geprüft | **alle HTTP 400** — es gibt keinen Auszahlungs-Aufruf |

Geprüft und tot: `user/withdrawals`, `user/payments`, `user/bank-accounts`, `user/profile`,
`user/addresses`, `user/transactions`, `user/purse/transactions`, `user/invoices`, `user/orders`.
Nur `user/purse.json` antwortet. **Die Auszahlung ist ausschliesslich ein Klick bei BigBuy.**

**Der Beweis, auf den es ankommt:** Der Betrag steht seit dem 15. Juli auf den Cent gleich.
Wären die bestätigten Anträge je ausgeführt worden, stünde dort weniger. Es ist nie Geld geflossen —
die vier Bestätigungsmails beschreiben Vorgänge, die nicht stattgefunden haben.

## Die Vorgeschichte (aus dem Mailverkehr belegt)

| Datum | Betrag | Was passierte |
|---|---|---|
| 15.07.2026 | EUR 750.00 | bestätigt · Geld nie angekommen · hinterlegte IBAN war ein fremdes Konto |
| 16.08.2026 | EUR 1'000.00 | bestätigt · Geld nie angekommen · **IBAN mit 22 Zeichen** |
| 08.09. 20:00 UTC | EUR 1'000.00 | bestätigt · dieselbe kaputte 22-Zeichen-Nummer |
| 08.09. 20:12 UTC | EUR 1'000.00 | bestätigt · **richtige Nummer** `CH78 0630 0016 6038 0920 6` |

Eine Schweizer IBAN hat **21 Zeichen**. Die 22-stellige Variante scheitert an der Prüfziffer
(ISO 13616, mod 97 = 54 statt 1) — **keine Bank der Welt kann sie ausführen.**

## Der Weg, den BigBuy selbst vorschreibt

BigBuys Antwort vom 08.09. sagt es wörtlich: **Mail ist nicht der Weg, ein Ticket ist es.**

1. Kontaktbereich öffnen: **https://www.bigbuy.eu/en/contact#tabpanel3**
2. Abteilung **Administration** wählen (💳 «Invoices, refunds, tax information») — nicht
   Customer Service, nicht Logistics.
3. Formular ausfüllen, Kundennummer **966388** angeben.

> ⚠️ **BigBuy schreibt ausdrücklich: «The Contact Area is optimized for use via computer and
> not via mobile phone.»** Wer es am Handy versucht, scheitert am Formular, nicht an der Sache.
> **Das ist der erste Verdacht, wenn im Kontrollpanel «nichts geht».**

## Was im Ticket stehen muss

```
Kundennummer 966388 — LuxeStyle CH, Schweiz

1. Antrag vom 08.09.2026, 20:00 UTC STORNIEREN.
   Er trägt eine IBAN mit 22 Zeichen; eine Schweizer IBAN hat 21.
   Die Nummer scheitert an der ISO-13616-Prüfziffer und ist nicht ausführbar.

2. Antrag vom 08.09.2026, 20:12 UTC AUSFÜHREN (oder neu anlegen) auf:
   Kontoinhaber: Allen Chour
   Bank:         Valiant Bank AG, 3001 Bern, Schweiz
   IBAN:         CH78 0630 0016 6038 0920 6   (21 Zeichen, Prüfziffer korrekt)

3. SCHRIFTLICH BESTÄTIGEN, dass das Guthaben von EUR 1'000.00 nach dem
   Abo-Ende (15.09.2026) abrufbar bleibt und das Konto nicht mit dem
   Guthaben darin geschlossen wird.   ← die wichtigste Frage

4. ERKLÄREN, was Vorgang 18138523 ist («Ingreso en monedero», EUR 1'000.00,
   angelegt 07.07.2026, Status «pendiente de pago»). Nicht stornieren,
   bevor das geklärt ist — er könnte das Guthaben selbst tragen.
```

## Fallbacks, falls das Ticket auch scheitert

- **Mailentwurf liegt bereit** an `customers@bigbuy.eu` (Gmail-Entwurf, Betreff «Customer 966388 –
  wallet EUR 1,000.00 still unpaid after three confirmed requests»). Er enthält alles von oben
  und bittet zusätzlich darum, das Ticket stellvertretend zu eröffnen und die Referenz zu senden.
- **Zeitdruck ist geringer als befürchtet:** Der API-Zugang antwortet heute noch, obwohl das Abo
  ausläuft. Das Guthaben verfällt nicht am Stichtag — aber genau deshalb braucht es Punkt 3
  schriftlich.
- **Auszahlungen laufen dienstags.** Heute ist Dienstag; der nächste ist der 22.09.
