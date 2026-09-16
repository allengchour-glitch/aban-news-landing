# COWORK-BEFEHL — Fassung 16.09.2026, 07:00 UTC

> Betreiber 16.09.: «mach das mit cowork oder so… egal wie hauptsache erledigt.»
> **Punkt 1 ist der wichtigste — dort liegen EUR 1'000.** Punkt 0 ist neu (16.09.,
> CJ-Messer-Rückerstattung USD 25.54) und in fünf Minuten erledigt.
> Alles andere ist unverändert und kann warten.
>
> Nichts erfinden, nichts bezahlen, **keine App deinstallieren, keinen Token widerrufen**
> (`autopilot2` trägt den ganzen Betrieb).

---

# 0. 🔪 CJ-ERSTATTUNG für die zurückgesandte Messer-Bestellung — USD 25.54

**Neu am 16.09., 5 Minuten Arbeit.** CJs Agentin Iris hat gemeldet, dass Auftrag
**DP2609071450210661800** zurückkam: verbotener Artikel (Messer), es gibt keine Linie in die
Schweiz. Sie schlägt selbst vor, die Rückerstattung zu beantragen.

**Gegengeprüft, nicht geglaubt:** Tracking `EQKPT8612701376YQ` steht auf
*Unsuccessful Delivery*, letzte Station **15.09.2026 14:15 SHANGHAI «Returned to Original
depot»**. Alle sieben Stationen lagen in China — das Paket hat das Land nie verlassen.

**Von hier aus geht es nicht:** `POST /api2.0/v1/disputes/create` antwortet
**Code 9009 «Order cannot be disputed»**, in allen vier geprüften Feld-Kombinationen. Die
Felder stimmten (CJ hatte sie einzeln abgefragt und zuletzt angenommen); es liegt an der
Bestellung selbst. Also Konsole.

## Was zu tun ist

1. **cjdropshipping.com** einloggen → **Orders** → Auftrag **DP2609071450210661800** suchen
2. **Dispute** / **Aftersales** öffnen (Anleitung, die CJ selbst geschickt hat:
   `https://cjdropshipping.com/article-details/172`)
3. Grund: **Paket zurückgesandt / nicht zustellbar**, Erwartung: **Rückerstattung**
4. Text unten einfügen, abschicken
5. **Fall-Nummer in `dropship/_cj_dispute_1017_ref.txt` schreiben** — dann verschwindet die
   Erinnerung aus der stündlichen Ampel von selbst

## Text zum Einfügen

```
Order DP2609071450210661800 (SKU CJYD272994802BY, Damascus folding knife) was returned.
Tracking EQKPT8612701376YQ shows "Unsuccessful Delivery"; the last scan on 2026-09-15
14:15 in Shanghai reads "Returned to Original depot". Your agent confirmed by e-mail that
the parcel was rejected because a knife is a prohibited item and there is no shipping line
to Switzerland for it.

The same product already failed for the same reason on our order #1016 (3 September).
We have fully refunded the end customer both times.

We request a refund of the order amount (USD 25.54) to our CJ balance.

Please also note: we have removed all blades from our store, so no further knife orders
will reach you from us.
```

## Was ich selbst schon erledigt habe

- Kundin/Kunde ist **voll erstattet** (CHF 40.90, zurück auf die Karte) — nichts mehr offen
- **207 Klingen aus dem Verkauf genommen**, darunter 95, für die CJ schon am 04.09.
  «keine CH-Versandoption» gemeldet hatte und die trotzdem kaufbar waren
- Die Importer legen Handklingen gar nicht mehr an, ein täglicher Wächter prüft es nach

---

# 1. ⭐ BIGBUY-TICKET — EUR 1'000.00, seit zwei Monaten fällig

## Warum das nicht per Mail geht (gemessen, nicht vermutet)

Seit dem 07.09. sind **fünf Mails** an `customers@bigbuy.eu` gegangen. Zurückgekommen sind
**zwei Antworten — wortgleich**, beide der identische Textbaustein:

> «the fastest and most efficient way to get a precise answer is by submitting a ticket in the
> Contact Area … 💳 **Administration** → Invoices, refunds, tax information»

Auf die eigentliche Mail vom 15.09. 08:31 UTC kam **gar keine Antwort**. Zum Abo-Ende hat
BigBuy **nichts** geschickt. **Der Kanal, den sie selbst zweimal nennen, ist noch nie benutzt
worden.** Eine sechste Mail ändert nichts.

**Und ich komme dort nicht hin:** `https://www.bigbuy.eu/en/contact` antwortet **HTTP 403** —
sowohl von unserer Server-IP als auch über den zweiten Ausgang (WebFetch, beide 16.09. 06:56).
BigBuy blockt alles, was kein echter Browser ist. Das ist der Grund, warum das hier steht und
nicht erledigt ist.

## Was zu tun ist

1. Im Browser (eingeloggt als Kunde **966388**) auf **https://www.bigbuy.eu/en/contact**
2. Reiter **Administration** (💳 Invoices, refunds, tax) — **am Rechner, nicht am Handy**
   (steht so in BigBuys eigener Antwort)
3. Formular ausfüllen mit dem Text unten, **abschicken**
4. **Ticket-Referenznummer notieren** und zurückmelden — ohne Referenz gibt es keinen Nachweis

## Text zum Einfügen

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

I have sent five emails to customers@bigbuy.eu since 7 September. The only replies were
the automated message asking me to open a ticket. This is that ticket.

Please:
1. Pay out EUR 1,000.00 to the corrected IBAN on record (21 characters, Valiant Bank AG,
   Bern, account holder Allen Chour). The bank details are already stored on the request
   of 8 September, 20:12 UTC.
2. Confirm in writing what happened to the requests of 15 July and 16 August — returned
   to the wallet, still pending, or paid to another account.
3. Explain record 18138523 ("Ingreso en monedero", EUR 1,000, 07/07/2026, "Pendiente de
   pago"). I have not cancelled it and will not cancel it without your explanation.
4. My subscription ended on 15 September 2026. Please confirm in writing that the wallet
   balance is unaffected by the account closure, and how it will be paid out now.
5. Please give me a ticket reference number and an expected payment date.
```

⚠️ **Die IBAN steht bewusst NICHT in dieser Datei** (das Repo ist öffentlich). Sie ist bei
BigBuy schon hinterlegt — der Antrag vom 08.09. 20:12 UTC trägt die richtige, 21-stellige
Nummer. Falls das Formular sie trotzdem verlangt: aus dem Online-Banking abschreiben.

## Punkt 4 ist neu und wichtig

Das Abo ist am 15.09. ausgelaufen, und **niemand hat uns je schriftlich gesagt, was mit dem
Guthaben eines beendeten Kontos passiert**. Das gehört festgehalten, bevor es jemandem
einfällt, es als verfallen zu behandeln.

## Wenn nach 14 Tagen nichts kommt

BigBuy S.L.U. sitzt in Valencia. Übliche nächste Schritte: **förmliche Zahlungsaufforderung
per Einschreiben** an die spanische Firmenadresse mit Frist, und die **EU-Verbraucher-/
ODR-Schlichtung**. Beides setzt voraus, dass ein Ticket mit Referenznummer existiert —
deshalb ist Schritt 4 oben nicht optional.

---

# Die übrigen Punkte (unverändert, nicht dringend)

**2. GOOGLE MERCHANT: LIEFERLAND NUR SCHWEIZ.** ⭐ Der grösste freie Hebel.
merchants.google.com → Einstellungen → Versand & Rückgabe → jeden Versanddienst öffnen →
Lieferland **nur Schweiz** (Deutschland und andere entfernen). Danach Produkte → Diagnose:
Zahl «Missing shipping info» vorher/nachher melden (zuletzt ~1'700).
Google-Gratis-Einträge sind der einzige Kanal mit belegten Verkäufen.

**5. STARTSEITEN-META-BESCHREIBUNG.** Gemessen 15.09. über `shop { description }`: **211
Zeichen**, endend mit «… und nach Deutschland». Der Shop liefert **nur in die Schweiz**.
Keine Mutation vorhanden (`shopUpdate` existiert nicht) — nur im Admin:
Onlineshop → Einstellungen → «Titel und Meta-Beschreibung» → ersetzen durch:

```
Mode, Schmuck, Beauty & Gadgets aus der Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe, Kauf auf Rechnung mit Klarna oder TWINT.
```
(133 Zeichen, keine Deutschland-Zusage.) Speichern, Zeichenzahl melden.

**7. CHAT EINSCHALTEN.** Installiert sind **zwei** Chat-Apps («Messaging»/Shopify Inbox und
«Chatty»/Avada). Auf luxestyle.ch ist **kein Chat-Knopf sichtbar**, im Theme steht **kein**
Chat-App-Embed. Onlineshop → Themes → Anpassen → App-Embeds → Chat einschalten → Speichern.
⚠️ **Nachtrag 16.09.: Avada zuerst prüfen, nicht blind einschalten.** Die Avada-Seite
`/pages/avada-faqs` war öffentlich erreichbar und zeigte nur «Loading…» — die App hat dort
nichts gerendert. Sie ist entweder deinstalliert oder defekt. Seite ist abgemeldet und per 301
auf `/pages/faq` umgeleitet. Wenn Avada nichts mehr rendert, ist **Shopify Inbox** die richtige
Wahl und Avada gehört deinstalliert. Danach melden, **welche** der beiden den Knopf liefert.

**10. BING WEBMASTER TOOLS** (ChatGPT sucht über Bing): bing.com/webmasters → luxestyle.ch →
Sitemaps → prüfen, ob `https://luxestyle.ch/sitemap.xml` eingereicht ist; sonst einreichen.
Zahl «indexierte Seiten» melden.

**4. NUR PRÜFEN, NICHTS ÄNDERN:** Einstellungen → Apps → App entwickeln: Liste der eigenen Apps
mit «letzte Aktivität» abschreiben. Nichts deinstallieren, keinen Token widerrufen.

**9. NUR ENTSCHEIDEN: US-Markt für ChatGPT?** Empfehlung unverändert **nein** (USD, US-Versand,
englische Texte, CH-Lager nicht lieferbar).

---

# ✅ Geschlossen — nicht mehr anfassen

**1. Versandschwelle 45 → 50: ENDGÜLTIG NEIN.** Am 15.09. mit vier echten Warenkörben über die
Storefront-API gemessen: Shopify prüft «≥ 45» auf dem Betrag **nach** dem automatischen
10-%-Rabatt. Mit zwei Artikeln beginnt der Gratisversand deshalb bei **genau CHF 50 vor
Rabatt** — exakt das, was der Shop verspricht. Wer auf 50 umstellt, schiebt die echte Schwelle
auf CHF 55.56 und macht aus einer eingehaltenen Zusage ein gebrochenes Versprechen.

**6. BigBuy-Abschied** — erledigt, 0 aktive BigBuy-Produkte. Kein Klick nötig.

**8. «Ballast-Apps entfernen» — Begründung war falsch.** Gemessen 15.09.: **0 ScriptTags**,
weder Hextom noch SEOWILL als App-Embed im Theme. Beide laden nichts. Deinstallieren ist
Aufräumen, kein Geschwindigkeitsgewinn.
