# COWORK-BEFEHL — Fassung 17.09.2026, 20:30 UTC

> **Zum Kopieren: der Block unten ist der ganze Auftrag.** Darunter stehen die Einzelheiten
> je Punkt (gewachsen über mehrere Tage, teils in unsortierter Reihenfolge — der Block ist
> die Wahrheit über die Prioritäten, die Abschnitte liefern die fertigen Texte).

```
Du hilfst beim Shop LuxeStyle CH (luxestyle.ch). Die Cloud-Session hat alles gemessen,
was von dort messbar war — du übernimmst genau das, was einen echten Browser oder SSH
braucht. Reihenfolge ist Absicht. Details: dropship/COWORK-BEFEHL.md im Repo
allengchour-glitch/aban-news-landing (Branch claude/luxestyle-status-tztnn1).

1) HETZNER-AGENT INSTALLIEREN (höchster Wert, du bist schon dran)
   Server 46.225.75.125. Ein Befehl als root:
     bash /opt/luxe-agent/repo/server/luxe-agent-setup.sh
   Falls der Klon fehlt, legt das Skript ihn an (eigener Klon /opt/luxe-agent/repo —
   NICHT /opt/abannews, dort macht ein Deploy-Poller alle 3 Min git reset --hard).
   Danach holt der Server alle 5 Minuten Aufträge aus auftraege/offen/*.json und pusht
   Quittungen zurück. Melde, ob der systemd-Timer luxe-agent.timer läuft.

2) ROOT-PASSWORT ROTIEREN
   Es stand im Klartext in einem Chat. Neues setzen, danach Passwort-Login abschalten
   (nur SSH-Key). Das neue Passwort NICHT in einen Chat schreiben.

3) CJ-ERSTATTUNG USD 25.54 — Frist 19.09. ca. 07:30 UTC
   Auftrag DP2609071450210661800 (Messer, aus Shanghai zurückgekommen, Tracking
   EQKPT8612701376YQ "Returned to Original depot" 15.09.). Der API-Weg ist zu:
   disputes/create gibt Code 9009 mit allen drei Bestell-IDs. Also: cjdropshipping.com
   einloggen → Dispute in der Konsole öffnen, Grund 6 "Product Returned", ODER im
   Chatfenster Iris Huang anschreiben. Fertiger Text in COWORK-BEFEHL.md Punkt 0.
   Fallnummer/Gutschrift danach in dropship/_cj_dispute_1017_ref.txt eintragen —
   dann verschwindet die Erinnerung aus der stündlichen Ampel von selbst.

4) BIGBUY EUR 1'000 — Ticket eröffnen
   Guthaben 1'000.00 gemessen, seit 15.07. unverändert, Abo ist ausgelaufen. Fünf Mails
   gingen raus, zurück kamen nur zwei wortgleiche Auto-Antworten — der Mailkanal ist tot.
   BigBuy nennt selbst das Ticket: bigbuy.eu/en/contact, Abteilung Administration.
   ⚠️ Von hier aus unmöglich: Cloudflare sperrt automatisierte Browser aus (gemessen,
   Ray ID a3ca2241ac1e86d9). Es braucht deinen echten Browser. Fertiger Formulartext in
   COWORK-BEFEHL.md Punkt 1. Ticketnummer nach dropship/_bigbuy_ticket_ref.txt.
   IBAN NICHT ins Repo schreiben — es ist öffentlich.

5) GOOGLE MERCHANT — ERST MESSEN, DANN ÄNDERN
   Im Gedächtnis steht "1'698 Produkte · Missing shipping info" — die Zahl ist vom 10.07.
   und seither NIE nachgeprüft. Bitte zuerst im Merchant-Konto nachsehen, ob es sie
   überhaupt noch gibt, und die heutige Zahl melden. Erst dann Lieferland auf NUR Schweiz
   stellen. Google lässt den Agenten-Browser grundsätzlich nicht anmelden ("Dieser Browser
   oder diese App ist unter Umständen nicht sicher") — deshalb dein Browser.

6) FORTURA-ZUGANG DAUERHAFT (2 Minuten, Claude-Einstellungen)
   FORTURA_FTP_USER und FORTURA_FTP_PW als Umgebungsvariablen eintragen. Sie liegen
   aktuell nur in /tmp und sind schon zweimal bei einem Neustart verschwunden (14.08.,
   17.09.), beide Male wochenlang unbemerkt.

GRENZEN — bitte strikt:
• KEINE Mails an Kunden senden. Entwürfe ja, senden nur nach Rückfrage beim Betreiber.
• Die Custom-App "autopilot2" NIE deinstallieren und ihren Token NIE widerrufen — sie
  trägt den ganzen Betrieb.
• Die stündliche Routine trig_01Uy3zVefXbzCZn9Dr2qvkwh NICHT abschalten. Sie startet
  keine CJ-Importe (der Grind ist im Repo aus), sondern die Kundenbetreuung. Sie wurde
  schon dreimal irrtümlich deaktiviert.
• Bot-Erkennung NICHT umgehen (keine gefälschte Kennung, keine versteckten
  Automatisierungs-Merkmale). An diesen Konten hängen der einzige Kanal mit belegten
  Verkäufen und eine offene Forderung.
• Keine Zugangsdaten ins Repo — es ist öffentlich.
• Nichts bezahlen ohne Rückfrage.

Bei jedem Punkt: erst messen, dann handeln, und melden was du GESEHEN hast — nicht was
du erwartet hast. Wenn etwas nicht geht, sag woran es lag; ein "erledigt" ohne Beleg ist
hier teurer als ein offener Punkt.
```

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

## Was zu tun ist — ZWEI Wege, beide ohne Formular (Stand 16.09. 16:30)

**Die Dispute-Schaltfläche ist für diese Bestellung zu.** `POST /disputes/create` antwortet
**Code 9009 «Order cannot be disputed»** — mit allen drei IDs, die CJ für denselben Auftrag führt
(`DP2609071450210661800`, `2609071450210669900`, `CJ26090754529958107451`) und allen Pflichtfeldern.
Es liegt an der Bestellung, nicht am Aufruf.

**⛔ Iris' Mail ist ein No-Reply** — «Please do not reply to this automatically generated email».
Antworten darauf verpufft.

### Weg A — Mail, ist schon fertig (empfohlen, 1 Klick)

Im Gmail liegt ein **fertiger Entwurf** an `support@cjdropshipping.com`, **im laufenden Thread**
(«Shipping to Switzerland for a folding knife …»). Das ist der Kanal, der bei uns schon zweimal
gewirkt hat — dort hat CJ am 04.09. die Messer-Linie überhaupt erst geöffnet.
**Nur öffnen, lesen, senden.** Er nennt die Messung (Tracking, Rücksendung in Shanghai), den
Betrag USD 25.54, den 9009-Fehler und bittet CJ, den Dispute selbst zu eröffnen oder direkt zu
erstatten.

### Weg B — Chat mit Iris (wenn es schneller gehen soll)

cjdropshipping.com einloggen → **Chatfenster unten links** (oder
`https://chat.cjdropshipping.com/#/chat/openChat`) → Iris Huang. Text:

```
Hi Iris, thanks for the notice about DP2609071450210661800 (knife, CJYD272994802BY).
Tracking EQKPT8612701376YQ shows "Unsuccessful Delivery", returned to depot in
Shanghai on 15 Sept. I tried to open a dispute but the API returns 9009
"Order cannot be disputed" for all three order IDs. Could you please open the
dispute for me or refund the USD 25.54 to my balance? I have already refunded my
customer and removed all blades from my store.
```

**Danach: Fall-/Ticketnummer in `dropship/_cj_dispute_1017_ref.txt` schreiben** — dann verschwindet
die Erinnerung von selbst aus der stündlichen Ampel.

### ⚠️ Eine Zahlenverwechslung, damit niemand stolpert

Iris schrieb am **10.09.**: «DP2609071450210661800 (#1018), DP2609071724090988900 (#1017)» —
das ist **vertauscht**. CJs eigene `getOrderDetail` gibt für `DP2609071450210661800` den
`orderNum` **#1017** zurück, mit der Messer-SKU, der Adresse in Pratteln und dem Tracking, das
zurückkam. Die Bestellung ist also eindeutig **#1017**; die Rückerstattung an die Kundschaft ging
an die richtige.

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

## 📨 NACHTRAG 17.09. 07:35 UTC — CJ hat geantwortet, aber am Thema vorbei

**CJ antwortete heute 07:21 UTC** — auf meine Mail vom **9. September** (die steckengebliebenen
Pakete), nicht auf die Rückerstattungs-Anfrage von gestern Abend. Und die Antwort enthält für
#1017 eine Aussage, die nachweislich falsch ist:

> «Both parcels completed inspection and were officially picked up and scanned by the carrier
> on September 12 … Live tracking details and full route events are now actively updating»

**Selbst gemessen (`logistic/getTrackInfo`, 17.09.):**

| | Stationen | letzter Stand |
|---|---|---|
| **#1017 Messer** `EQKPT8612701376YQ` | 8, **alle in China** | **«Returned to Original depot», SHANGHAI, 15.09. 14:15** — Status *Unsuccessful Delivery* |
| **#1018 Ladegerät** `EQKPT8612702883YQ` | 10 | **«Departed from original airport», 17.09. 02:20** — hat China heute früh verlassen, Status *En Route* |

Für #1018 stimmt CJs Aussage also. Für #1017 nicht — es ist zurück in ihrem Shanghaier Depot,
was ihre eigene Agentin Iris am 16.09. selbst geschrieben hat.

**Korrektur ist raus** (17.09. 07:35, Thread `1a066a03bf2c8dd2`): Messung, Rückerstattungs-
forderung USD 25.54, der 200-gegen-9009-Widerspruch, dazu die Bitte um ein realistisches
Lieferfenster für #1018 und der Hinweis, dass die EQ-Sensitive-Linie Klingen für die CH gar
nicht erst annehmen sollte.

**Dispute heute erneut versucht — weiterhin `9009`**, `disputeId` und `disputeOpenedId` beide
leer, `orderStatus` SHIPPED. Der API-Weg bleibt zu.

⏱️ **Wenn CJ binnen 48 h nicht auf die Rückerstattung eingeht**, bleibt nur der Konsolen-Weg
unten. Nachfass-Termin läuft (18.09. 17:00 UTC).

---

## ✅ ERLEDIGT am 16.09. 21:30 UTC — die Mail ist RAUS

**Weg A ist gegangen.** Die Mail liegt bei `support@cjdropshipping.com`, im laufenden Thread
`1a066a03bf2c8dd2` («Shipping to Switzerland for a folding knife …») — also in genau dem
Kanal, in dem CJ am 07.09. geantwortet und die Messer-Linie geöffnet hat.
Nachricht-ID `1a0ac1cecc23a58d`.

**Neu darin, und das stärkste Argument:** CJs eigene API widerspricht sich.

| Aufruf | Antwort |
|---|---|
| `POST disputes/disputeConfirmInfo` (orderId = **cjOrderCode**) | **200** — mit `maxAmount 25.54`, dem Posten `2609071450210665200` und einer Gründe-Liste, die **Grund 6 «Product Returned»** enthält |
| `POST disputes/create` mit exakt diesen Werten | **9009 «Order cannot be disputed»** |

Geprüft wurden Grund 6 und 10, `expectType` 1 und 2, `refundType` 1 und 2 und alle drei
Bestell-IDs — **jede Kombination 9009**. `getDisputeList` zeigt 0 Disputes, `getOrderDetail`
zeigt `disputeId: null`; es blockiert also kein bestehender Fall.

> **Lehre:** Der Vorschau-Endpunkt sagt «200» und nennt sogar den Grund, den man nehmen soll —
> der Schreib-Endpunkt verweigert trotzdem. **Eine Vorschau, die «ok» sagt, ist keine Erlaubnis
> zu handeln.** Erst der schreibende Aufruf entscheidet.
>
> Zweite Lehre aus demselben Lauf: Die Feldfehler (`disputeReasonId must be not null` usw.)
> kommen **vor** der Zulässigkeitsprüfung. Dass sie erscheinen, beweist **nicht**, dass die
> Bestellung reklamierbar ist — ich hatte genau das kurz geglaubt, und es war falsch.

## Was für dich übrig bleibt — nur, falls CJ nicht antwortet

Der **Konsolen-Weg ist ungeprüft** und damit weiterhin die Rückfallebene: cjdropshipping.com →
Bestellung #1017 → Dispute, **Grund «Product Returned»**, Betrag USD 25.54. Dass die API 9009
sagt, heisst nicht zwingend, dass die Konsole es auch tut — sie ist ein anderes System, und
`disputeConfirmInfo` liefert die Maske ja vollständig. Alternativ Chat mit Iris (Text unten).

**Fallnummer oder Gutschrift nach `dropship/_cj_dispute_1017_ref.txt`** — dann verschwindet
die Zeile aus der stündlichen Ampel.

## Was ich selbst schon erledigt habe

- Kundin/Kunde ist **voll erstattet** (CHF 40.90, zurück auf die Karte) — nichts mehr offen
- **207 Klingen aus dem Verkauf genommen**, darunter 95, für die CJ schon am 04.09.
  «keine CH-Versandoption» gemeldet hatte und die trotzdem kaufbar waren
- Die Importer legen Handklingen gar nicht mehr an, ein täglicher Wächter prüft es nach

---

# 0b. 📌 PINTEREST — drei Dinge, gemessen am 17.09. im Agenten-Browser

Der Screenshot aus dem Business Hub zeigte «Händlerstatus genehmigt · Shopify verbunden» —
das war **dein** Brave. Der **Agenten-Browser** auf dem Hetzner ist bei Pinterest **nicht**
angemeldet: sein Screenshot der Profilseite zeigt «Anmelden / Registrieren» oben rechts
(`auftraege/ergebnis/07-pinterest-upload-1-profil.png`). Shopify Admin und BigBuy sind dort
angemeldet, Pinterest und Google Merchant nicht.

**1. Im Agenten-Browser bei Pinterest anmelden** (gleicher Weg wie bei Shopify:
`bash /opt/luxe-agent/repo/server/luxe-profil-anmelden.sh`, Tunnel, `chrome://inspect`).
Danach lädt der Agent die 117 Pins selbst hoch — der Auftrag liegt fertig im Repo.

**2. ⚠️ Die Profilbeschreibung ist falsch.** Dort steht wörtlich:

> «Gratis-Versand ab CHF **65** · −10% mit Code WELCOME10»

Richtig sind **CHF 50**. Die 65 war eine alte Angabe, die am **10.08.** aus dem Theme
entfernt wurde (`automation/seo_versandschwelle_fix.py` dokumentiert genau das) — auf dem
Pinterest-Profil hat sie **fünf Wochen überlebt**, weil die Korrektur nur den Shop
durchsucht hat und keinen Kanal. Pinterest lässt die Beschreibung nicht über die API ändern;
das ist ein Klick im Profil.

**3. Die sechs Boards der Warteschlange gibt es nicht.** Auf dem Konto stehen *Soziales*
(92 Pins), *Tech & Gadgets*, *Leder & Accessoires*, *Schlaf & Aromatherapie*,
*Küche & Genuss*. Die CSV nennt *Herrenmode Schweiz, Schmuck & Accessoires, Sommerkleider &
Damenmode 2026, Wellness & Beauty, Home & Geschenkideen, Schuhe & Sandalen*. Vor dem Upload
müssen diese sechs Boards existieren — sonst verwirft Pinterest die Zeilen still.
(Gute Nachricht nebenbei: die 92 Pins in *Soziales* der letzten Woche zeigen, dass die
Shopify-Anbindung von sich aus Pins erzeugt. Der Kanal ist nicht tot.)

---

# 1. ⭐ BIGBUY-TICKET — EUR 1'000.00, seit zwei Monaten fällig

> ## ⚠️ FÜR COWORK: DAS GEHT NUR MIT DEINEM SICHTBAREN BROWSER
> Gemessen am 17.09.2026 vom Hetzner-Agenten (kopfloses Chromium, bei BigBuy angemeldet):
> **sieben BigBuy-Adressen, alle sieben Cloudflare-Wand.** `/en/contact` liefert
> «Sicherheitsüberprüfung wird durchgeführt · um sich vor böswilligen Bots zu schützen»,
> Ray ID a3ca2241ac1e86d9, **0 Formularfelder**. Dazu: REST-API tot (`purse.json` = 401,
> gegengeprüft — der absichtlich FALSCHE Schlüssel gibt identische Antworten), Mail tot
> (6 Mails, 3 wortgleiche Auto-Antworten: 08.09., 15.09., 17.09. 12:50).
>
> **Bitte nicht versuchen, die Bot-Erkennung zu umgehen** (Kennung fälschen, Automatisierungs-
> Merkmale verstecken). Das ist der Weg, auf dem Konten gesperrt werden — und an diesem Konto
> hängt eine offene Forderung. Ein normaler, sichtbarer Browser mit einem Menschen davor
> bekommt die Seite ohne Wand; genau das ist Coworks Vorteil.
>
> **Reihenfolge:** einloggen als Kunde **966388** (`allengchour@gmail.com`) → `/en/contact`
> → Reiter **💳 Administration** → Text unten einfügen → absenden → **Referenznummer notieren**
> und nach `dropship/_bigbuy_ticket_ref.txt` schreiben (eine Zeile genügt). Dann verschwindet
> die Mahnzeile aus der stündlichen Ampel von selbst.


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

## Was zu tun ist — mit BigBuys eigenen Links (aus ihrer Mail vom 08.09. und 15.09.)

**Am Rechner, nicht am Handy** — das schreibt BigBuy selbst zweimal:
«the Contact Area is optimized for use via computer and not via mobile phone».

1. Im Browser als Kunde **966388** einloggen (`allengchour@gmail.com`)
2. **https://www.bigbuy.eu/en/contact** öffnen
3. Reiter **💳 Administration** («Invoices, refunds, tax information»)

   ⚠️ **Nach dem NAMEN klicken, nicht nach dem Anker.** BigBuys eigene Mail gibt für
   *Administration* UND für *Technical Support* denselben Anker `#tabpanel3` an — einer
   von beiden ist falsch. Der Reiter heisst **Administration** mit dem Kreditkarten-Symbol;
   *Logistics and After-sales* ist `#tabpanel2`, *Customer service* `#tabpanel5`.
4. Formular mit dem Text unten ausfüllen, **abschicken**
5. **Ticket-Referenznummer notieren** und mir schicken → ich trage sie in
   `dropship/_bigbuy_ticket_ref.txt` ein, dann verschwindet die Erinnerung aus der Ampel

**Wenn der Reiter nicht auffindbar ist**, hat BigBuy zwei eigene Videos mitgeschickt:
- Contact Area allgemein: https://www.loom.com/share/1ae26618819341bfabc4d87228c3fd7c
- Ticket anlegen (Schritt für Schritt): https://www.loom.com/share/b5afba93c37d4b3791490b23a4cd00b8

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

## Punkt 3 — Fortura-Zugang: ERLEDIGT (17.09.2026), eine Kleinigkeit bleibt

Der Betreiber hat die Zugangsdaten am 17.09. geliefert (Kundennr. 544341,
`webtransfer.fortura.ch`). Liegen in `/tmp/fortura_env.sh`, Modus 600 — **nicht im Repo**,
das ist öffentlich. Gegengeprüft: das Passwort steht in keiner Repo-Datei und in keinem Commit.

**Gemessen, nicht angenommen:**
- Anmeldung + Feed: **20'086 Zeilen, 10,1 MB** nach `/tmp/fortura_feed.csv` (Exit 0).
- Bild-Nachschub: **gescannt 2'408, gefixt 0** — und das ist kein Fehler, sondern das Ende
  der Arbeit. Von **2'408 aktiven Fortura-Produkten haben 1'552 ein Karussell, 856 nur ein
  Bild** — und für diese 856 hat der Feed schlicht keine Zusatzbilder. Sie stehen alle
  bereits als geprüft im Ledger.

⚠️ **Korrektur einer eigenen Zahl von heute Nachmittag:** Ich hatte «4'403 von ~7'558»
geschrieben und daraus ~3'100 offene Produkte abgeleitet. Das war ein Vergleich zweier
verschiedener Grundgesamtheiten: **7'774 ist die Zahl der EANs IM FEED mit Zusatzbildern**
(Lieferantenseite), 4'403 die Zahl der **von uns geprüften Shop-Produkte**. Der Shop hat in
dieser Warengruppe überhaupt nur 2'408 aktive Artikel. Es waren nie 3'100 offen.

### Was noch offen ist (2 Minuten, nur du)

`/tmp` überlebt keinen Container-Neustart — am **14.08.** und am **17.09.** ist der Zugang
genau so verschwunden, beide Male **unbemerkt**, weil die Fehlermeldung nur im Log des
Feed-Holers stand. Dauerlösung: **`FORTURA_FTP_USER` und `FORTURA_FTP_PW` als
Umgebungsvariablen in den Claude-Einstellungen** hinterlegen (nicht im Chat, nicht im Repo).

Bis dahin meldet sich die Lücke jetzt von selbst: die **Betreiber-Ampel** trägt eine Zeile
«🔑 FORTURA-ZUGANG WEG», sobald die Datei fehlt — und sie verschwindet wieder, sobald der
Zugang da ist (in beide Richtungen gegengeprüft).
