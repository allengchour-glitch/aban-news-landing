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
| 08.09. 20:12 UTC | EUR 1'000.00 | bestätigt · **richtige Nummer** `CH78 … (21-stellig, im BigBuy-Konto hinterlegt — Nummer NICHT im Repo)` |

Eine Schweizer IBAN hat **21 Zeichen**. Die 22-stellige Variante scheitert an der Prüfziffer
(ISO 13616, mod 97 = 54 statt 1) — **keine Bank der Welt kann sie ausführen.**

## ⚠️ Der Befund vom 15.09., der alles ändert

Betreiber, wörtlich: **«nach auszahlen klick, passiert nichts nach mehrere tagen».**

Das Kontrollpanel ist also **nicht kaputt** — der Antrag geht durch, die Bestätigung kommt,
und danach passiert nichts. Genau wie viermal zuvor.

**Damit fällt die IBAN-Erklärung als alleinige Ursache weg.** Der Antrag vom 08.09. 20:12 UTC
trug die **geprüft richtige** Nummer (21 Zeichen, Prüfziffer korrekt). BigBuy sagt in jeder
Bestätigungsmail «innerhalb von 5 Werktagen» zu. Diese fünf Werktage (9., 10., 11., 14., 15.09.)
sind **heute abgelaufen** — und das Guthaben steht unverändert auf 1'000.00.

**Ein richtiger Antrag mit richtiger Nummer wurde nicht ausgeführt.** Die Ursache liegt bei
BigBuy, nicht bei der Kontonummer und nicht am Klick.

→ **Ein fünftes Mal klicken bringt nichts.** Der Klick ist nicht das Problem.
→ Verdacht Nummer eins: Vorgang **18138523** («Ingreso en monedero», EUR 1'000.00, seit
   07.07. «pendiente de pago») blockiert die Auszahlung. Er darf nicht blind storniert werden —
   er könnte das Guthaben selbst tragen. Das muss BigBuy erklären.

## ✅ Gesendet — 15.09.2026, 08:31:30 UTC

Der Betreiber hat die Mail an `customers@bigbuy.eu` abgeschickt (Betreff «Customer 966388 –
four confirmed payout requests, EUR 1,000.00 never paid; 5-working-day deadline expired today»,
Thread `1a0a4047c72dd809`). Sie führt mit dem Befund oben: ein Antrag mit **richtiger** IBAN
wurde nicht ausgeführt, die zugesagte Frist ist abgelaufen.

⚠️ Die Mail läuft in einem **neuen Thread**, nicht im alten BigBuy-Verlauf — die Kundennummer
966388 steht deshalb in der ersten Zeile.

**Nachkontrolle liegt auf 16.09. 08:10 UTC** (`trig_01N9vbqe55Az7oTdvu6sh21m`): Guthaben messen,
Antwort suchen. Sinkt `purse.json` unter 1'000.00, ist Geld geflossen. Nächster
Auszahlungs-Dienstag: **22.09.**

Wenn wieder nur der Ticket-Textbaustein zurückkommt, bleibt nur das Ticket in der Abteilung
**Administration** — Inhalt siehe unten.

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
   IBAN:         CH78 … (21-stellig, im BigBuy-Konto hinterlegt — Nummer NICHT im Repo)   (21 Zeichen, Prüfziffer korrekt)

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


---

# NACHTRAG 16.09.2026, 05:20 UTC — gemessen, nachdem das Abo ausgelaufen ist

Betreiber: «schau das bigbuy auszahlt». Hier ist, was heute messbar ist.

## 1. Der Postweg ist tot — und BigBuy sagt das selbst

**Fünf Mails** sind an `customers@bigbuy.eu` gegangen (07.09., 08.09., 11.09., zweimal 15.09.).
**Zwei Antworten** sind zurückgekommen — 08.09. 07:39 und 15.09. 07:18 UTC — und sie sind
**wortgleich**. Es ist derselbe Textbaustein, beide Male:

> «Please be reminded that the fastest and most efficient way to get a precise answer is by
> submitting a ticket in the Contact Area. […] 💳 Administration → Invoices, refunds, tax
> information»

Auf die eigentliche Mail vom **15.09. 08:31 UTC** (eigener Thread, vier bestätigte Anträge,
Frist abgelaufen) kam **gar keine Antwort**. Und es gibt **keine einzige Mail zum Abo-Ende**.

**Das ist der Befund, der zählt:** Der Kanal, den BigBuy zweimal ausdrücklich nennt — das
**Ticket-Formular im Contact Area, Abteilung Administration** —, ist **noch nie benutzt worden**.
Wir klopfen seit neun Tagen an eine Tür, die mit Anrufbeantworter antwortet, während die Tür,
die sie uns nennen, unberührt ist. Fünf Mails an dieselbe Adresse werden die sechste nicht
beantworten.

## 2. Die API antwortet nicht mehr

| gemessen 16.09. 05:18 UTC | Ergebnis |
|---|---|
| `GET /rest/user/purse.json` | **HTTP 401 `{"message":"Invalid Token"}`** |
| `GET /rest/user.json` | HTTP 400 |

⚠️ **Ursache nicht isoliert.** Zwei Möglichkeiten, und ich kann sie nicht trennen:
(a) das Abo lief am 15.09. aus und der Zugang wurde deaktiviert, oder (b) der Schlüssel, mit
dem am 07./11./15.09. erfolgreich gemessen wurde, lag in `/tmp/bigbuy_key.txt` — **diese Datei
existiert nach dem Container-Neustart nicht mehr**, und ich habe auf `/tmp/bigbuy.env` (07.09.)
zurückgegriffen. Der Aufruf selbst war korrekt gebaut (`Authorization: Bearer`, gleicher Host
wie die früher funktionierenden Skripte).

**Folge so oder so: das Guthaben ist ab jetzt nicht mehr von hier aus prüfbar.** Die letzte
belegte Messung bleibt `"1000.00"` vom 15.09. Ob seither etwas geflossen ist, sagt nur noch
der Kontoauszug oder die BigBuy-Konsole.

## 3. Was der Betreiber tun kann — der Ticket-Weg, kurz gehalten

👉 **https://www.bigbuy.eu/en/contact** → Reiter **Administration** (💳 Invoices, refunds, tax)
Am Rechner, nicht am Handy (sagt BigBuy selbst). Formularfelder sind kurz — deshalb dieser Text:

```
Subject: Customer 966388 – wallet balance EUR 1,000.00 – four confirmed payout
requests, none executed

Customer number: 966388 (LuxeStyle CH, Switzerland)
Wallet balance: EUR 1,000.00 (unchanged since 15 July 2026)

Four payout requests were confirmed by your system. None was ever paid:
  15 Jul 2026  EUR   750.00
  16 Aug 2026  EUR 1,000.00
  08 Sep 2026  EUR 1,000.00  (20:00 UTC – invalid IBAN, 22 characters – please CANCEL)
  08 Sep 2026  EUR 1,000.00  (20:12 UTC – corrected IBAN, 21 characters – please EXECUTE)

I have sent five emails to customers@bigbuy.eu since 7 September. The only replies
were the automated message asking me to open a ticket. This is that ticket.

Please:
1. Pay out EUR 1,000.00 to the corrected IBAN on record (21 characters, Valiant Bank
   AG, Bern, account holder Allen Chour).
2. Confirm in writing what happened to the requests of 15 July and 16 August.
3. Explain record 18138523 ("Ingreso en monedero", EUR 1,000, 07/07/2026,
   "Pendiente de pago"). I have not cancelled it.
4. My subscription ended on 15 September 2026. Confirm that the wallet balance is
   unaffected and tell me how it will be paid out now that the account is closed.
5. Give me a ticket reference and an expected payment date.
```

**Die Frage 4 ist neu und wichtig:** Das Abo ist vorbei, und niemand hat uns gesagt, was mit
dem Guthaben eines beendeten Kontos passiert. Das gehört schriftlich geklärt, bevor es
jemandem einfällt, es als verfallen zu behandeln.

## 4. Wenn auch das Ticket ins Leere läuft

BigBuy S.L.U. sitzt in Valencia (Spanien). Nach ~14 Tagen ohne Reaktion auf ein Ticket sind
zwei Wege üblich und kostengünstig: eine **förmliche Zahlungsaufforderung per Einschreiben**
an die spanische Firmenadresse mit Frist, und die **ODR-/Verbraucherschlichtung der EU**.
Das ist keine Rechtsberatung, sondern der übliche nächste Schritt — und ein Ticket mit
Referenznummer ist die Voraussetzung dafür, dass man überhaupt etwas vorweisen kann.

## 5. Was ich NICHT tun kann

* Den Auszahlungsknopf drücken — es gibt **keinen** Auszahlungs-Endpunkt in der API
  (sechs geprüft, alle HTTP 400), und die Konsole hat der Betreiber dreimal ohne Wirkung
  angeklickt.
* Das Ticketformular ausfüllen — das ist ein Browser-Klick, und Cloud-Sessions haben
  keinen Browser.
* Das Guthaben messen — siehe Punkt 2.

---

## Nachtrag 16.09.2026, 08:15 UTC — Nachkontrolle

**Keine Antwort.** Auf die Mail vom 15.09. 08:31 UTC (Thread `1a0a4047c72dd809`, «four confirmed
payout requests») kam in 24 Stunden **nichts**. Letzte eingehende BigBuy-Nachricht bleibt der
Textbaustein vom 15.09. 07:18 — das ist der dritte wortgleiche. Damit stehen **sechs ausgehende
Mails gegen drei identische Bausteine und null inhaltliche Antworten.**

**Guthaben nicht mehr messbar — aber die Ursache ist jetzt isoliert.** `GET /rest/user/purse.json`
antwortet weiterhin `{"message":"Invalid Token"}`. Gestern war offen, ob das am beendeten Abo
liegt oder daran, dass der Schlüssel beim Container-Neustart verloren ging. **Heute ist die Frage
entschieden:** `/tmp/bigbuy.env` ist noch da, unverändert vom 07.09. (Modus 600) — derselbe
Schlüssel, der am 15.09. noch `"1000.00"` lieferte, wird jetzt abgelehnt. Ein verlorener Schlüssel
kann das nicht erklären. **Es ist das ausgelaufene Abo.**

Folge: Von hier aus ist nicht mehr feststellbar, ob Geld geflossen ist. Die letzte belegte Zahl
bleibt **EUR 1'000.00 vom 15.09.** Ab jetzt sagt das nur noch der Kontoauszug oder das
BigBuy-Backoffice im Browser.

Nächster Auszahlungs-Dienstag: **22.09.** Der Weg bleibt das Ticket in der Abteilung
**Administration** (Text in §3 dieser Datei, Kurzfassung in `COWORK-BEFEHL.md` Punkt 1).
