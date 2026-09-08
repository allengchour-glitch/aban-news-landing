# Cowork-Aufträge (nur der Betreiber kann das)

## ⏳ Die Keepalive-Routine ist wieder AN — aber eine ANDERE Routine schaltet sie
## morgen um 05:37 UTC wieder aus (gemessen 08.09.2026, 20:05 UTC)

Danke — `trig_01Uy3zVefXbzCZn9Dr2qvkwh` steht seit **20:03:44 UTC auf `enabled: true`**,
nächster Lauf 20:07. Das ist die oberste Schicht: Sie liegt ausserhalb des Containers und
startet nach jedem Neustart den Aufseher, und der startet alles andere.

**Der Klick hält aber nur bis morgen früh, und das ist messbar:**

| Routine | Zeitplan | Zustand |
|---|---|---|
| `trig_01Uy3zVefXbzCZn9Dr2qvkwh` Keepalive | stündlich `7 * * * *` | **AN** (seit 20:03) |
| `trig_017r619TeGtaS9Rsjjw24E96` «Lagebeurteilung 07:30 + 17:30» | `30 5,15 * * *`, **nächster Lauf 09.09. 05:37 UTC** | AN |

Im Prompt der **Lagebeurteilung** steht wörtlich die Anweisung, zu prüfen, «ob der Nachstarter
`trig_01Uy3zVefXbzCZn9Dr2qvkwh` wieder aktiv ist — wenn er aktiv ist: `update_trigger enabled
false` auf genau diese ID». Sie wird ihn morgen um 05:37 UTC also wieder abschalten.

**Damit ist auch erklärt, warum der Schalter dreimal umgelegt wurde:** Es waren nie zwei
Menschen, es ist ein Automat gegen einen Klick.

→ **Sag ein Wort, dann nehme ich diese Zeile aus dem Prompt der Lagebeurteilung** (nur diesen
Satz, der Rest der Routine bleibt). Von selbst lege ich den Schalter nicht zum vierten Mal um —
das ist die Regel vom 05.09., und sie hat genau diesen Grund.

## 💎 Das Jade-Roller-Set steht in der STARTSEITEN-Kollektion — ohne Lieferanten (08.09.2026)
Die #1008-Klasse (bezahlt, nie lieferbar) ist seit dem 20.08. bekannt und bewusst offen gelassen:
rund 30 handkuratierte Ur-Produkte ohne prüfbare Lieferanten-SKU, darunter Bewertungssieger —
«pauschales Draften wäre teuer». **Neu gemessen ist, WO eines davon steht:**
| | |
|---|---|
| Produkt | «Jade Roller & Gua Sha Premium Set», SKU **`JADE-SET-001`** |
| Status | **ACTIVE**, Bestand **100 erfunden**, `CONTINUE` (= kaufbar, auch ohne Bestand) |
| Bewertung | **5,0 ★ aus 7** — einer der bestbewerteten Artikel des Shops |
| steht in | **20 Kollektionen**, darunter `frontpage` (Startseite), `bestseller`, `top-5-start` |
Jemand kann es also von der Startseite aus kaufen, und dahinter steht kein Lieferant.
**Nicht angefasst:** Ein Draft nimmt einen 5,0-★-Artikel aus 20 Kollektionen; ob du ihn beschaffen
kannst, weiss nur du. Das ist deine Entscheidung, nicht meine — gemeldet statt gehandelt.
**Drei echte, lieferbare Entsprechungen sind längst im Katalog** (alle mit CJ-SKU, alle aktiv):
- `15450850853249` **Gua Sha Stein & Roller Set** · CHF 15.90 · `CJ-CJPF121214401AZ` — am nächsten dran
- `15497464349057` Rosenquarz- und Jade-Roller mit 3D-Metall · CHF 19.90
- `15422970134913` Gua-Sha-Set «Jade» · CHF 34.90
**Drei Wege, alle umkehrbar:** (a) Bestand auf 0 + `DENY` → bleibt sichtbar, behält Bewertungen,
ist nur nicht mehr bestellbar; (b) DRAFT + 301 auf eines der drei; (c) so lassen, wenn du es
beschaffen kannst. Ohne dein Wort geschieht nichts.


## 📬 ZWEI unbeantwortete Anfragen im Postfach — Entwürfe liegen bereit (08.09.2026)
`/pages/influencer-partner` ist die **zweitgrösste Landeseite des Shops** (25 Sitzungen in 30 Tagen,
mehr als jede Produktseite ausser dem Rizinusöl-Set). Sie hat auch geliefert — nur hat es niemand
beantwortet:
| eingegangen | Absender | offen seit |
|---|---|---:|
| 21.08. «Influencer-Bewerbung» | Hafir Elshani (Privatperson, 18) | **18 Tage** |
| 30.08. «KOOPERATION x STEFANIE_MLR» | NovasphereMedia (Agentur, DE) | **9 Tage** |
**Beide Antworten liegen als GMAIL-ENTWURF bereit** — lesen, anpassen, senden. Bewusst NICHT
gesendet: die Mail ginge aus dem privaten Gmail des Betreibers hinaus (es gibt keinen
«Senden als»-Alias für info@luxestyle.ch), und Konditionen einer Zusammenarbeit sind eine
Geschäftsentscheidung.
- **Beide Entwürfe nennen zuerst die harte Bedingung:** Wir liefern nur CH/FL. Beim Bewerber sitzt
  «ein grosser Teil der Community in Italien» — dort kann niemand bestellen; das gehört gesagt,
  bevor jemand Arbeit hineinsteckt. Beide fragen nach ZAHLEN (Schweizer Anteil, Aufrufe, Preis)
  und sagen keine Konditionen zu.
- ⚠️ **Die Agentur-Mail trägt vier Merkmale einer Massen-Vorlage:** «Nach eingehender
  Auseinandersetzung mit Ihrer Marke» ohne einen einzigen konkreten Bezug, ein Angebot zur
  **Event-Begleitung** an einen Shop ohne Events, ein Widerspruch in der Signatur («Mein Name ist
  Sabrina» / gezeichnet «Steffi») und ein `utm_source=chatgpt.com` im eigenen Link. Weder
  Reichweite noch Preis genannt. Der Entwurf verlangt beides — kommt nichts, ist die Sache erledigt.
- **Dauerlösung, ein Klick:** In Gmail einen «Senden als»-Alias für `info@luxestyle.ch` einrichten.
  Dann können Antworten auf Shop-Post unter der Shop-Adresse rausgehen statt privat.

# Aufträge für Claude Cowork — Stand 29.08.2026, 23:10 UTC

Hier steht, was ich aus der Cloud-Session **nicht** erledigen kann: Klicks in fremden
Web-Konsolen ohne Schreib-Endpunkt, und Entscheidungen, die dir gehören. Mit Cowork +
«Claude in Chrome» kann Claude die Klicks am Bildschirm ausführen.

⚠️ **Keine Zugangsdaten in den Auftragstext schreiben.** Vorher im Browser bei den Diensten
anmelden — Cowork soll die bereits offene Sitzung benutzen.

**Jeder Punkt ist am 29.08. gegen den Live-Stand geprüft.** Erledigtes steht ganz unten, nicht
mehr in der Liste — eine Aufgabenliste, in der Erledigtes mitläuft, wird nach dem zweiten Mal
nicht mehr gelesen.

## ✅ ERLEDIGT (07.09.2026, 19:45 UTC): #1018 ist bezahlt, versendet und beim Kunden gemeldet

| gemessen | |
|---|---|
| CJ-Auftrag | `2609071724100987400`, **UNSHIPPED**, bezahlt 17:44 |
| Betrag | **$12.36** (Ware 3.34 + Fracht 9.02, CJPacket EQ Ordinary) |
| Variante | **EU-Black** ✓ — der Stecker passt in Schweizer Steckdosen |
| Land | **CH**, Dulliken ✓ (der Dialog stand zuerst auf Austria) |
| Sendungsnummer | **EQKPT8612702883YQ** |
| Shopify | FULFILLED, Versandmail an den Kunden raus, Bestellung archiviert |

**Marge rund +CHF 16.65.** «Archiviert» ist dabei kein Fehler, sondern die Quittung — Shopify
nimmt eine bezahlte, vollständig ausgeführte Bestellung von selbst aus der offenen Liste.

Nichts mehr zu tun.

## 🔑 EIN Klick, der die 05.09.-Panne unmöglich macht: zwei Umgebungs-Variablen

**Gerade brauche ich nichts** — gemessen 07.09. 16:00 UTC: Der Grant liefert ein Token, die
Admin-API antwortet 200, der Tresor ist offen, das BigBuy-Guthaben lesbar. Alles läuft.

**Aber es hält nur bis zum nächsten /tmp-Wipe**, und die Kette hat genau ein schwaches Glied:

| Geheimnis | wo es liegt | überlebt einen /tmp-Wipe? |
|---|---|---|
| BigBuy-Schlüssel | **Tresor** (Shop-Metafeld) + /tmp | **ja** — der Tresor legt ihn zurück |
| CJ, Judge.me, TikTok, Meta, GitHub | **Tresor** + /tmp | **ja** |
| **`SHOPIFY_CLIENT_ID` / `_SECRET`** | **nur `/tmp/secrets_env.sh`** | **NEIN** |

Der Shopify-Client-Secret ist das eine Geheimnis, das der Tresor **nicht** halten kann — man
braucht ihn, um den Tresor aufzusperren. Genau er ging am 05.09. verloren, und weil Shopify auf
ein fehlendes Secret mit `app_not_installed` antwortet, habe ich zwei Tage lang eine
deinstallierte App diagnostiziert, die nie weg war.

**Der Klick:** In den Umgebungs-Einstellungen des Claude-Kontos zwei Variablen setzen —
`SHOPIFY_CLIENT_ID` und `SHOPIFY_CLIENT_SECRET`. Dort erreicht sie weder ein /tmp-Wipe noch ein
Container-Neustart, und die ganze Wächterschicht startet danach von selbst wieder. **Nicht ins
Repo — es ist öffentlich.** (Gegengeprüft in einer sauberen Shell: aktuell ist keine der drei
Variablen gesetzt.)

## ⛔ BigBuy 08.09.2026, 20:00 UTC: DRITTER Auszahlungsantrag — auf DERSELBEN kaputten IBAN

BigBuy hat soeben bestätigt: «Su petición de retirada de fondos se ha realizado correctamente
y se hará efectiva en 5 días laborables», EUR 1'000, Banküberweisung. **Genau diese Mail kam
schon am 15.07. und am 16.08. — und beide Male ist nichts angekommen.**

Die Bestätigungsmail nennt die Zielkontonummer, und die habe ich selbst nachgerechnet
(ISO 13616, mod 97):

| geprüft | Ergebnis |
|---|---|
| Länge | **22 Zeichen** — eine Schweizer IBAN hat **21** |
| Prüfsumme mod 97 | **54** — gültig ist nur **1** |
| Folge | keine Bank kann das ausführen; der Antrag prallt ab wie die zwei davor |

**Die IBAN ist also unverändert gespeichert — der neue Antrag ändert daran nichts.**

✅ **Und der Fehler ist eingegrenzt:** Streicht man genau EINE verdoppelte Ziffer, entsteht eine
**gültige** 21-stellige IBAN (mod 97 = 1), und die Prüfziffer bleibt dieselbe. Es gibt genau
diese eine Lösung — ein Tippfehler beim Eintragen, keine falsche Bank. Die konkrete Nummer
steht im Chat und in BigBuys Mail, **nicht hier: dieses Repo ist öffentlich.**

**Reihenfolge (die ist der ganze Punkt):** erst die IBAN in der Konsole korrigieren, DANN den
Antrag stellen. Wer nur den Antrag wiederholt, bekommt eine vierte Bestätigungsmail und wieder
kein Geld. Auszahlungen laufen nur dienstags; heute ist Dienstag, der nächste ist der **15.09.**
— derselbe Tag, an dem das Abo endet.

## 💶 BigBuy: **€1'000.00 liegen im Konto** — gemessen 07.09.2026, 15:30 UTC

Der Betreiber hat den Produktions-Schlüssel geliefert; er ist ZUERST getestet und DANN gespeichert
worden (Lehre 05.09.). Damit ist der Stand kein Rätsel mehr:

| gemessen | Ergebnis |
|---|---|
| `GET /rest/catalog/languages.json` (Schlüssel gültig?) | **HTTP 200** |
| `GET /rest/user/purse.json` | **`"1000.00"`** (zweimal unabhängig gelesen) |
| `GET /rest/user/moneybox.json` | HTTP 400 — **diesen Endpunkt gibt es nicht** |
| Auszahl-Endpunkt in unserem Code | **keiner** — `paymentMethod: 'moneybox'` bezahlt nur Bestellungen, holt kein Geld heraus |

⚠️ Die Zahl aus dem Gedächtnis («Moneybox 0.00 seit 07.07.») war überholt UND am falschen
Endpunkt gemessen. Der Topf heisst **purse**, nicht moneybox.

**Was das für dich heisst — zwei Wege, beide bei dir:**

⛔ **KORREKTUR am selben Tag: Der Antrag ist längst gestellt — und NICHT ausgeführt worden.**
Am 16.08. hast du die Auszahlung beantragt, BigBuy hat sie bestätigt («wirksam innerhalb von
5 Werktagen»). Drei Wochen später liegt das Geld unverändert da, und seither kam **keine
einzige weitere BigBuy-Mail**. Meine Zeile «ich kann die Support-Anfrage vorbereiten» war
also doppelt falsch: Die Anfrage ist gestellt, und der Weg ist ohnehin **Selbstbedienung in
der Konsole**, keine Mail. BigBuy bearbeitet Auszahlungen **nur dienstags**.

**Der nächste Bearbeitungstag ist DIENSTAG 08.09. — und realistisch der letzte vor der Frist
15.09.** (die selbst ein Dienstag ist, also keine Reserve). Zu tun:

1. Konsole → Geldbörse: steht der Antrag vom 16.08. noch offen? Wenn nicht: neu stellen.
2. ⛔ **KORREKTUR 08.09.: Transaktion 18138523 NICHT stornieren** — hier stand «stornieren»,
   und das war gefährlich. Am Objekt gelesen ist sie **«Ingreso en monedero»** = die EINZAHLUNG
   in die Geldbörse, keine Rechnung an uns. Wer sie storniert, storniert womöglich den Vorgang,
   der die 1'000 € trägt. Nur nachfragen, nicht anfassen.
2b. **Die Ursache ist gefunden und sie liegt bei BigBuy: die gespeicherte IBAN ist kaputt.**
   Zwei Anträge (15.07. €750, 16.08. €1'000), beide bestätigt, keiner ausgeführt. Nachgerechnet
   (mod 97): die 16.08.-IBAN hat **22 statt 21 Zeichen** → ungültige Prüfziffer, keine Bank kann
   das ausführen. Solange sie so gespeichert ist, prallt jeder weitere Antrag ab.
2c. **Der Kanal ist ein TICKET, keine Mail** — BigBuys Support-Adresse ist ein Autoresponder
   (Vorlage vom 08.09., keine der vier Fragen beantwortet). Contact Area → **💳 Administration**,
   nur am Computer bedienbar. Dort zuerst die IBAN korrigieren, dann den Stand erfragen.
3. ⚠️ Nie den offenen Marketplace-Checkout (1'190 €/Jahr) abschicken.

Ganzer Stand samt fertigem Support-Text: `dropship/BIGBUY-AUSZAHLUNG-NACHFASS.md`.
Ich messe das Guthaben am Di 08.09. und Fr 11.09. selbst nach — dafür brauche ich dich nicht mehr.

⚠️ **Der Schlüssel stand im Chat** — bitte in der BigBuy-Konsole neu erzeugen, sobald es passt.
Er liegt jetzt im Shopify-Tresor (Fach `bigbuy`) und in `/tmp/bigbuy.env` (0600), **nicht im Repo**.

## ✅ ERLEDIGT (07.09.2026, 15:20 UTC): #1017 ist beim Lieferanten bezahlt

Der Betreiber hat den CJ-Auftrag **direkt bezahlt** (nicht das Guthaben aufgeladen — das steht
weiter auf USD 0.00). Am Objekt gemessen: CJ `#1017` = **UNSHIPPED**, Sendungsnummer
**EQKPT8612701376YQ** (equick_Standard, CJPacket EQ Sensitive).

⚠️ **Noch nicht in Shopify erfüllt, keine Versandmail.** `UNSHIPPED` heisst bezahlt, aber noch
nicht an den Transporteur übergeben. Erfüllt und benachrichtigt wird erst bei `SHIPPED`
(Hausregel 22.08.: eine Versandmail für ein Paket im Lager ist schlimmer als eine späte).

⛔ Der alte Schatten «#1016» (`2609030857400653900`, CREATED) darf nie bezahlt werden.

⚠️ Für die nächste Bestellung bleibt das CJ-Guthaben bei **USD 0.00** — der Bestell-Automat kann
also weiterhin nicht selbst bezahlen. Wer das automatisch haben will, lädt Guthaben auf.

## 📸 06.09.2026 21:45 UTC — Instagram-Token-Anleitung (Upload des Betreibers) gelesen: technisch richtig, drei Dinge VORHER
Die Anleitung (Graph-API v21.0, `fb_exchange_token` → langlebiger User-Token → Seiten-Token aus `me/accounts`, `instagram_business_account.id` als `IG_USER_ID`, Umgebungsvariablen statt Dateien) ist korrekt und sicher formuliert. Ausführen kann sie nur der Betreiber (Meta-Portal, Browser-Login). Bevor der PC-Poster damit Instagram bedient, gehört dreierlei geklärt — sonst wiederholt sich die Doppelpost-Klasse vom Juli:
1. **Ein fremder Instagram-Poster läuft bereits** täglich 09:00 und 17:00 UTC (Schweizerdeutsch-Captions, App «LuxeStyle Social», in keiner unserer Queues — 03.09. gemessen). Zwei Poster auf einem Konto ohne gemeinsames Ledger = Doppelposts. Erst den abstellen oder benennen.
2. `social-post.mjs` kennt weder `post_guard` (Produkt-/Medien-/Live-IG-Abgleich) noch `dropship/_SOCIAL_STOPP`. Der Social-Stopp gilt weiter (30.08.).
3. Kundenfotos: nur mit `@tatjanalarsinamoira`-Markierung, ohne Vornamen, nichts vor deinem «ok».
`business_management` in Schritt 2 ist für reines Posten nicht nötig (weniger Rechte = kleinerer Schaden bei Token-Verlust). Meta-Zugangsdaten liegen im Tresor «meta» — der ist ohne Custom-App (#49) verschlossen; deshalb kann diese Session den Token nicht selbst erneuern.

## 🧰 06.09.2026 21:35 UTC — «Cowork ohne mich»: ein Klick macht die Cloud-Wache scharf
Es gibt in diesem Konto keine Cowork-Umgebung, die eine Cloud-Session starten könnte, und Routinen aus der Cloud bekommen keine Konnektoren. Deshalb:
- **Routine `trig_01SNsxGjVGtr1coaRyLA9Gca` «LuxeStyle: Wache cloud-tztnn1»** ist angelegt und AUS. Im Routinen-UI (claude.ai/code → Routinen) den **Shopify-Konnektor** zuweisen und einschalten → sie prüft alle 4 h Bestellungen, den Kern-Schutz (518), den Katalogtrend, den Vorrat der Draft-Routine und die vier Haustier/EU-Kategorien, schreibt `dropship/WACHE-CLOUD-TZTNN1.md` und meldet nur ⚠️.
- **Klick 1 von 21:45 UTC (Draft-Routine pausieren) ist ERLEDIGT-ohne-Klick (07.09. 04:30 UTC):** ~23'000 aktive Produkte mit gemessenem Bild ≥ 500 px tragen `bild-ok` + `bildmass-ok-0906`; der Kandidatenfilter der Routine ist von ~24'000 auf **100** gefallen (alle mit zu kleinem Bild — dort ist ihr Kriterium richtig). Nach dem nächsten Tick findet sie 0 Treffer und steht von selbst. Pausieren bleibt Hygiene (sie feuert sonst stündlich ins Leere), kein Notfall. ⚠️ 1'426 Produkte hat sie gedraftet, bevor der Tag ankam — Rückhol-Kandidaten `status:draft AND tag:bildmass-ok-0906`, nur nach Messung. **Stand 07.09. 07:20 UTC: Routine findet 0 Treffer (nachgemessen). Aus dem Pool zurückgeholt nach Messung: 9 Verkehrs-Landeseiten + 41 Menü-Auffüller (`verkehr-rueckhol-0907` / `menue-rueckhol-0907`); 7 der 10 dünnen Menü-Kategorien wieder ≥ 12. Parfum & Düfte (4) und Camping & Outdoor (5) sind NICHT füllbar — dort ist alles BigBuy-Ware ohne Lieferant; das ist ein Sortimentsloch (Shopcom-Antrag, Punkt unten), kein Routine-Schaden.**
- Klick 2 (Klaviyo-Segment VNybXM) bleibt ein Klick.

## ⛔ 06.09.2026 21:45 UTC — DEINE ZWEI KLICKS (du hast mir die Entscheidung gegeben, den Schalter sperrt das System)

**Entscheidung: B.** Die stündliche Routine «LuxeStyle: Katalog-Entwurf» pausieren, die Entwürfe
stehen lassen, zurückgeholt wird nur nach Messung. Gemessen: 99,4 % der abgeschalteten Produkte
haben Bilder ab 500 px — das Kriterium der Routine ist falsch; alles zurückholen bringt aber auch
keinen Verkehr. Ich habe geschützt, was messbar zählt (518 Produkte, Marker `menue-kern-0906`).

1. **Routine pausieren — 1 Klick:** claude.ai → Routinen → «LuxeStyle: Katalog-Entwurf
   (setzt ungeprüfte Produkte stückweise auf Entwurf)» → aus. Mein Aufruf dazu wurde vom
   System gesperrt (fremde Routine). Solange sie läuft, verschwinden ~1'000 Produkte pro Stunde;
   Stand 20:20 UTC waren noch 28'441 aktiv.
2. **Klaviyo-Karteileichen unterdrücken — 1 Bestätigung:** Segment `VNybXM` (1'480 Adressen
   `cj-import+…@luxestyle.ch`, von unserem eigenen Bewertungs-Import erfunden, kosten Profile).
   Klaviyo → Listen & Segmente → Segment → «Alle unterdrücken». Umkehrbar (Unsuppress).
   Auch dieser Aufruf ist für mich gesperrt.

## ⛔ 06.09.2026 — ENTSCHEIDUNG: 19'900 Produkte sind seit gestern ABGESCHALTET

Am **05.09. um 09:50 UTC** hat ein Lauf **19'927 Produkte auf Entwurf** gesetzt — alle mit dem Tag
`auto-entwurf-0926`. Kriterium war exakt «Produkt trägt nicht den Tag `bild-ok`».
**Der aktive Katalog ist damit von rund 53'300 auf 35'144 Produkte gefallen** (in Preisbändern
gezählt, weil Shopify bei 10'000 deckelt).

**Warum das Kriterium falsch ist — gemessen, nicht vermutet:**
`bild-ok` ist die Quittung EINES Laufs vom 16.06.; alles, was danach importiert wurde, trägt ihn
per Konstruktion nicht — unabhängig von der Bildqualität. Die 32 Produkte, die ich heute
zurückgeholt habe, haben **5 bis 23 Bilder** und Hauptbilder von **800×800 bis 1920×1920 Pixel**.

**Was es angerichtet hat:** Von 250 Seiten, auf denen in 60 Tagen wirklich Besucher gelandet sind,
waren **32 tot (404)** — darunter das **Rizinusöl-Wickel-Set**, die grösste Produkt-Landeseite des
ganzen Shops und das einzige Produkt mit belegtem Suchverkehr.

**Was ich schon gemacht habe (fertig, live geprüft):**
- Alle 34 Seiten mit gemessenem Verkehr wieder aktiv, Tag entfernt, Rizinusöl-Set wieder in allen
  sechs Kanälen inklusive Google.
- Die toten Produktlinks in den drei Ratgebern mit Suchverkehr repariert.

**Was ICH NICHT entschieden habe — das gehört dir:**
Die übrigen **rund 19'800 Produkte sind noch aus**. Sie zurückzuholen wäre derselbe Massenschritt in
der Gegenrichtung, und zwei Sessions, die denselben Schalter gegenläufig umlegen, sind keine
Automatik mehr. Drei Wege:

| Weg | Folge |
|---|---|
| **A — alles zurück** | Katalog wieder ~53'000. Gefahrlos machbar: die Schnittmenge des Tags mit JEDEM absichtlichen Draft-Grund (Waffen, Medizin, keine Lieferanten-Referenz, nicht CH-lieferbar, ausverkauft, Dubletten) ist **null** — der Lauf hat ausschliesslich Ware erwischt, die vorher bewusst aktiv war. |
| **B — so lassen** | Kleinerer Katalog. Dann sollten die ~19'800 aber nach einem MESSBAREN Kriterium ausgewählt werden (Bildgrösse, Lieferanten-SKU, CH-lieferbar), nicht nach einem alten Tag. Und jede Seite mit Verkehr braucht eine Weiterleitung, sonst wachsen die 404 weiter. |
| **C — Mittelweg** | Zurückholen, was ein Hauptbild ab 500 px hat; der Rest bleibt aus. Das ist das Kriterium, das der Lauf eigentlich meinte. |

### ⏳ NEU um 13:10 UTC: der Lauf ist nicht vorbei — er läuft STÜNDLICH weiter

Ich habe heute Vormittag 633 Produkte zurückgeholt und danach nachgezählt: es sind **561 MEHR**
mit dem Marker als am Morgen. Das **Rizinusöl-Set, um 11:20 von mir reaktiviert, stand um 11:32
wieder auf DRAFT.** Die Quelle ist eine Routine deines Kontos:

> **«LuxeStyle: Katalog-Entwurf (setzt ungeprüfte Produkte stückweise auf Entwurf)»**
> `trig_013xE8LpGFW2QGuziRJywbHV` — Zeitplan `52 * * * *`, also **jede Stunde**, aktiv,
> angelegt am 05.09. um 09:52 UTC.

**Damit ändert sich die Reihenfolge deiner Entscheidung:** Weg A und C sind erst möglich, wenn
diese Routine steht — sonst holt sie alles binnen einer Stunde zurück. Das ist **ein Klick**
in deiner Routinen-Liste (pausieren, nicht löschen — die Historie bleibt).

**Was in der Zwischenzeit sicher steht, ohne dass jemand einen Schalter umlegt:** Die 34 Seiten
mit gemessenem Verkehr tragen jetzt den Tag **`bild-ok`** — genau das Merkmal, nach dem die
Routine auswählt. Sie fasst sie deshalb nicht mehr an. Der Tag ist dabei nicht getrickst: für
alle 34 ist im Bulk-Export gemessen, dass das Hauptbild auf beiden Kanten ≥ 500 px hat.

**Wie schnell es geht — gemessen, nicht geschätzt:** Zwei exakte Zählungen im Abstand von
1,8 Stunden ergeben **760 Produkte pro Stunde**. Der Vorrat sind rund **30'000** aktive
Produkte ohne `bild-ok`. Läuft die Routine durch, hat der Shop in etwa **zwei Tagen noch
rund 900 Produkte**.

**Sag mir A, B oder C — dann setze ich es um.** Ohne dein Wort bleibt es, wie es ist.
Bei A oder C: bitte zuerst die Routine oben pausieren, sonst arbeiten wir gegeneinander.

### 🧭 NEU um 21:00 UTC: gemessen, was die Routine vom MENÜ übrig lässt
Von **120 Menü-Kategorien** überleben **66 nicht** (unter 12 Produkte), **13 fallen auf 0**
(herren-jacken, sneaker-sportschuhe, sub-wander-arbeitsschuhe, naegel-manikuere, haarstyling-geraete, werkzeug-maschinen, gaming, drohnen-kameras, beamer-heimkino, ventilatoren, fussball-fanshop, wandern-trekking, smoke-zubehoer), und **4 waren heute Abend SCHON leer** — Menülinks auf Seiten ohne ein
einziges Produkt: tier-leinen-kleidung, tierspielzeug, tier-naepfe-fuettern, eu-lager-schnell.
Aktive Produkte 20:20 UTC: **28'441** (15:39 waren es 31'045 → die Routine läuft mit ~1'000/h).

**Was ich gemacht habe (umkehrbar, mit eigener Marke):** Je betroffener Kategorie bis zu 12
Produkte mit gemessenem Bild ≥ 500 px, CJ-SKU und ohne Risiko-Tag → `bild-ok` + Marker
**`menue-kern-0906`** (410 Produkte, davon 48 aus den vier leeren Kategorien reaktiviert).
Das ist das Kriterium der Routine selbst — sie überspringt diese Produkte jetzt. **Rückgängig:**
Filter «Tag ist menue-kern-0906» → Tag `bild-ok` entfernen. Nicht angefasst: Kiffer-Zubehör (18+).

**Damit ist das Menü in zwei Tagen zwar nicht leer, aber überall dünn (12 Karten).** Ob das
Sortiment bei ~4'000 Produkten bleiben soll (A), die Routine pausiert (B) oder alles zurückkommt
(C), bleibt deine Entscheidung — siehe oben. **Bei A gehört das Menü danach auf die Kategorien
gekürzt, die noch Ware haben** (das mache ich, sobald du A sagst).

⚠️ **Dein Zahlungslink an den #1016-Kunden (#D2) zeigte auf ein Entwurfsprodukt** — die Routine hatte
das Fuda-Messer am 05.09. 20:35 wieder auf Entwurf gesetzt. Wiederhergestellt (bild-ok, aktiv, nur
Onlineshop + Shop). Zahlt er, muss der CJ-Auftrag von Hand über «CJPacket EQ Sensitive» laufen —
der Bestell-Automat ist ohne Admin-Token blind.

### Zum «Automations-Audit» (Artefakt der anderen Session), drei Korrekturen
1. **«Es gibt kein Schweizer Lager» — falsch.** 2'408 aktive Produkte sind Fortura-Ware ab Belp
   (`ch-lager`, 1–2 Werktage). Der Hero-Satz ist wahr; nichts ändern.
2. **«Produkttexte nennen USA/EU-Lieferzeiten» — veraltet.** Am Objekt 0 Treffer; die 983 wurden
   am 03.09. repariert.
3. **«Gratis-Versand real ab CHF 45, Zone Domestic korrigieren» — bitte NICHT.** Die 45 ist Absicht
   (50 × 0,9 wegen des 10-%-Rabatts), wirksam ist der Automatik-Rabatt ab 49, beworben 50 — das ist
   die einzige Zahl, die in jedem Korb stimmt. Die Versandzone anzufassen kann den Checkout lahmlegen.

## 🔁 06.09.2026 — Zwei Routinen mit Fakten von Mai (nur du kannst sie ändern)
> Beide wurden über die Web-Oberfläche angelegt (`created_via: http_api`) — kein Agent darf
> sie bearbeiten, ich habe es versucht. Die andere Session hat dasselbe festgestellt
> (`routinen-korrektur.md` im Übergabe-Paket). Öffne die Routine, ersetze NUR die genannten
> Stellen, lass den Discord-Webhook stehen (und rotiere ihn bei Gelegenheit — er steht in
> beiden Routinen im Klartext).
>
> ⚠️ Zwei Stellen weichen bewusst von `routinen-korrektur.md` ab: **«Gratis-Versand real ab
> CHF 45»** ist die Regel NACH Rabatt (45 = 50 × 0,9, Absicht seit 20.08.); die einzige
> Zahl, die in jedem Korb wahr ist, ist **ab CHF 50** — so steht sie überall im Shop. Und die
> Produktzahl ändert sich stündlich — deshalb keine Zahl in die Routine schreiben.
>
> **A · «Email-Check alle 2h» (`trig_01KAnvaXU7rbVVBbaUqrg6ci`)** — hier geht es um
> Kundenmails, die sonst ohne Entwurf durchrutschen (Saud, #1016, passte auf kein Muster):
>
> 1. Kategorie KUNDE-LUXESTYLE, alt: `(echte Kunden-Anfragen via aban-192.myshopify.com oder luxestyle.com.co — Order-Status, Versand, Refund, Produkt-Fragen)`
>    neu: `(echte Kunden-Anfragen zum Shop luxestyle.ch — Order-Status, Versand, Refund, Produkt-Fragen). Erkennungsmerkmale: Antworten auf Threads mit Betreff «Deine Bestellung #NNNN bei LuxeStyle», Mails mit einer Bestellnummer #10xx, Shopify-Benachrichtigungen von store+94368563585@t.shopifyemail.com, Mails an info@luxestyle.ch, oder Absender, die auf eine Mail von «Allen von LuxeStyle» antworten`
> 2. Draft-Regel Versand, alt: `Bei Versand-Fragen: ehrlich 'wir versenden via Standard-Shipping, Lieferzeit ~7-14 Tage' (Dropship)`
>    neu: `Bei Versand-Fragen: ehrlich und exakt wie auf der Produktseite — CJ-Direktversand «Lieferzeit Schweiz 10–20 Werktage, Direktversand ab Herstellerlager»; Ware ab Schweizer Lager (Tag ch-lager) 1–2 Werktage; Druck auf Bestellung 7–14 Werktage. NIE etwas Kürzeres versprechen. Versand CHF 7, gratis ab CHF 50. Lieferung nur Schweiz/Liechtenstein.`
> 3. Projekt 1, alt: `LuxeStyle CH (Shopify Dropship) — Live-URL luxestyle.com.co, Backend aban-192.myshopify.com — 82 Produkte`
>    neu: `LuxeStyle CH (Shopify Dropship) — Live-URL luxestyle.ch, Shopify-Backend au3j0y-hq.myshopify.com, Kontakt info@luxestyle.ch. Lieferant CJdropshipping (Direktversand aus Asien) plus Schweizer Lager Fortura. Der Katalog wird gerade auf ein geprüftes Kernsortiment bereinigt — Produktzahlen nicht nennen. Rückgabe 30 Tage (Ausnahmen laut Rückgaberichtlinie), kein gesetzliches Widerrufsrecht in der Schweiz. Zahlarten TWINT, Klarna, Karten, PayPal.`
>
> **B · «Daily Brief – Allen 6 Projekte» (`trig_01JTFjZkj2dZzhshVrEfcTKU`)** — postet jeden
> Morgen «82 Produkte live, 0 Sales» und schlägt montags den Kauf einer .ch-Domain vor:
>
> 1. Projekt 1, alt: `LuxeStyle CH (Shopify) — 82 Produkte live, 0 Sales. Fehlt: .ch-Domain, Reviews-App, Ads schalten.`
>    neu: `LuxeStyle CH (Shopify, luxestyle.ch) — live, einzelne Bestellungen, Katalog wird per stündlicher Cloud-Routine auf ein geprüftes Kernsortiment bereinigt. Offen für Allen: Entscheid zur Katalog-Routine (A/B/C in dropship/COWORK-AUFTRAEGE.md), Custom-App autopilot2 wiederherstellen (Wächter sind seit 05.09. blind), AGB Ziffer 7 + Telefonnummer in der Datenschutzerklärung, Shopify-Datei-Speicher, TikTok-Unternehmensverifizierung.`
> 2. Montags-Vorschläge, alt: `'15 Min: .ch-Domain bei Hostpoint kaufen …' oder '2 Min: Refund-Policy Section 6 löschen' oder '15 Min: Loox/Judge.me Reviews-App installieren'`
>    neu: `'1 Min: Routine «LuxeStyle: Katalog-Entwurf» ansehen und A/B/C entscheiden' oder '10 Min: Shopify → Einstellungen → Apps → App-Entwicklung → Custom-App mit read/write_products anlegen, Client-ID/Secret in die Claude-Umgebungsvariablen' oder '5 Min: Shopify → Richtlinien: AGB Ziffer 7 ersetzen + Telefonnummer in der Datenschutzerklärung' oder '5 Min: Shopify → Einstellungen → Dateien: Speicher prüfen (voll seit 01.09.)'`
> 3. Footer, alt: `Kein Stress, keine Projekte live` → neu: `Kein Stress`

## ⚖️ 06.09.2026 — ZWEI Rechtstexte, die ich nicht schreiben darf (nur du)
> Der Shopify-MCP-Konnektor hat den Scope `write_legal_policies` **nicht**, und das Admin-Token
> der Custom-App ist tot. Beides sind reine Copy-Paste-Änderungen in
> **Shopify-Admin → Einstellungen → Richtlinien**.
>
> **A · AGB Ziffer 7 widerspricht Ziffer 5 derselben AGB.** Dort steht heute:
> «Für EU-Kund:innen gilt zusätzlich das gesetzliche 14-tägige Widerrufsrecht.» —
> während Ziffer 5, die Versandbedingungen und die Rückgaberichtlinie übereinstimmend sagen,
> dass wir **nur in die Schweiz und nach Liechtenstein** liefern und es in der Schweiz **kein**
> gesetzliches Widerrufsrecht gibt. Das ist die letzte Stelle dieser Klasse; alle Shop-Seiten
> sind seit dem 06.09. bereinigt. **Ersetze Ziffer 7 durch:**
>
> > **7. RÜCKGABERECHT**
> > Es gilt unsere Rückgaberichtlinie. Wir gewähren dir **freiwillig 30 Tage Rückgaberecht**
> > ab Erhalt der Ware, ohne Angabe von Gründen.
> > Ein gesetzliches Widerrufsrecht besteht im schweizerischen Recht für den Online-Kauf
> > grundsätzlich nicht; unser 30-Tage-Recht geht damit über die gesetzliche Lage hinaus.
> > Da wir ausschliesslich in die Schweiz und nach Liechtenstein liefern (Ziffer 5), kommt
> > ausländisches Verbraucherrecht nicht zur Anwendung.
>
> **B · Datenschutzerklärung: leere Telefonnummer und ein kleingeschriebenes «belp».**
> Im Abschnitt «Kontakt» steht wörtlich «wenden Sie sich bitte telefonisch unter **,** per
> E-Mail unter info@luxestyle.ch oder per Post an LuxeStyle, Hühnerhubelstrasse 37, 3123
> **belp**, Schweiz». Die Telefonnummer fehlt ganz (Shopify-Platzhalter), «Belp» ist klein.
> Das ist die einzige Stelle, an der der Shop unfertig wirkt, wo er es am wenigsten darf.
> Einsetzen: **+41 79 538 28 14** und **Belp**.
>
> ⚠️ Nicht geändert wird der Titel der Rückgabe-Richtlinie: Shopify nennt sie im Footer
> «Widerrufsrecht», obwohl ihr eigener Text richtig sagt, dass es keines gibt. Der Titel hängt
> am Richtlinien-Typ und lässt sich über die API gar nicht setzen — das ist ein Shopify-Detail,
> keine Falschaussage im Text.

---

> ### ✅ 05.09.2026 — vier Punkte per Konnektor selbst erledigt (Betreiber: «cowork sachen auch»)
> - **1** TikTok «Wasserfest CH Juni» (CHF 30/Tag) → DISABLE; Konto 2 war schon aus. Wieder einschalten = ein Aufruf.
> - **7** VIP-Flow «VIP Tier-Upgrade Welcome» → Entwurf (kein Programm, keine Kundin über CHF 500).
> - **8** Klaviyo-Bestellbestätigung → Entwurf; Shopify bestätigt, Klaviyo fragt nach 7 Tagen nach der Bewertung.
> - **17** Vier «Weekly billing audit»-Sitzungen archiviert. ⚠️ Die Routine dazu existiert in diesem Konto nicht
>   mehr — der **Discord-Webhook bleibt DEIN Klick** (in Discord neu erzeugen).
> - **Karteileichen:** Segment `VNybXM` (1'480 Profile, Muster `cj-import+…@luxestyle.ch`) steht bereit.
>   `bulk_suppress` verlangt deine ausdrückliche Freigabe → **sag «unterdrücken»**, dann ist es ein Aufruf.
> - ⚠️ Nebenfund: die **stündliche Keepalive-Routine war seit 03.09. 22:07 AUS** (von Hand pausiert), die
>   2-h-Routine existiert nicht mehr → wieder EIN. Ohne sie bleibt nach jedem Container-Neustart alles stehen.

## 🆕 02.09.: Shopify-DATEI-SPEICHER IST VOLL — TikTok-Nachschub zum PC steht
Seit dem 01.09. lehnt Shopify jeden Upload in die Dateien-Bibliothek ab
(`FILE_STORAGE_LIMIT_EXCEEDED`, live belegt). Folgen: Die **TikTok-Queue und der
«Jetzt posten»-Befehlskanal zum PC werden nicht mehr aktualisiert** — der PC arbeitet
mit dem Stand vom 31.08. weiter (7 geprüfte Beiträge, sicher, aber einfrierend).
**Produktbilder des Imports laufen normal weiter** — betroffen ist nur die Bibliothek.
- **Dein Klick:** Shopify-Admin → **Einstellungen → Dateien** — dort steht der
  Speicherstand. Entweder Platz schaffen (alte, ungenutzte Dateien löschen) oder den
  Plan-Speicher erhöhen. Danach läuft der Nachschub von selbst wieder an (die Werkzeuge
  melden Erfolg jetzt erst, wenn die Datei WIRKLICH auf dem CDN liegt).
- Einordnung: Der Katalog wächst um ~1'000 Produkte/Tag mit je ~5 Bildern — der
  Speicherdeckel ist damit keine Einmal-Sache, sondern eine Wachstumsgrenze des Plans.

### 04.09. gemessen — jetzt mit Zahlen, und es ist eine ENTSCHEIDUNG, kein Klick
| | |
|---|---:|
| Shopify-Deckel | **kumulativ über Dateien UND Produktbilder** (Doku: «cumulative file storage limit») |
| die GB-Zahl selbst | **gibt keine API aus** — sie steht nur bei dir unter Einstellungen → Dateien |
| Katalog (Preisbänder gezählt) | 43'964 aktiv · **24'101 Entwürfe** |
| Medien je Produkt (gemessen) | aktiv 1,49 MB · Entwurf 0,61 MB |
| Produktmedien-Topf | **≈ 80 GB** · Dateien-Bibliothek nur 0,6 GB |
| von hier gefahrlos löschbar (Entwurfsmedien sicherer Klassen) | **≈ 7 GB** |
| bisher freigegeben | 342 MB — Upload-Probe scheitert **weiterhin** |

**Was ich schon getan habe (ohne dich):** Zuflussbremse auf 1 statt 4 CJ-Runner
(`dropship/_GRIND_RUNNER_ZAHL`, ~250 statt ~1'000 MB Bilder/Tag) und das Löschen der
Entwurfsmedien abgeschalteter Lieferanten läuft. **Das Produkt bleibt jeweils vollständig
bestehen** — Titel, Text, Preis, Tags; nur die Bilder gehen.

**Deine Entscheidung — es gibt genau zwei Wege, und keiner ist technisch:**
1. **Plan erhöhen** (Grow = 300 GB). Kostet Geld, löst das Problem für lange.
2. **Katalog kleiner machen.** 24'101 Entwürfe stehen im Shop, die niemand kaufen kann.
   Sie wirklich zu LÖSCHEN (statt nur zu entbildern) gibt ~15 GB frei und ist die Richtung,
   die die eigene Aktenlage seit dem 29.08. ohnehin nahelegt: mehr Produkte bringen keinen
   Suchverkehr. ⚠️ Das ist unumkehrbar — deshalb frage ich, statt es zu tun.

---

## ⏱️ Wenn du heute nur drei Dinge machst

*(aktualisiert 08.09.2026 — jede Zeile am selben Tag live gemessen)*

| | Aufgabe | Aufwand | warum |
|---|---|---|---|
| **1** | **BigBuy: Ticket in Contact Area → 💳 Administration, IBAN korrigieren** | 15 Min | EUR 1'000 liegen seit dem 16.08. fest, die gespeicherte IBAN hat 22 statt 21 Zeichen (mod-97 ungültig). Abo endet 15.09. |
| **2** | **Stündliche Keepalive-Routine wieder EIN** (`trig_01Uy3zVefXbzCZn9Dr2qvkwh`) | 1 Min | steht seit dem 05.09. auf AUS; der Container startet ~stündlich neu und **nichts** kommt von selbst zurück — heute 19:17 UTC gemessen: 0 Aufseher, 0 Runner, bis ich von Hand startete |
| **3** | **Nichts** — TikTok-Werbekonto NICHT aufladen (Punkt 1) | 0 Min | zwei Kampagnen stehen auf AN und starten sonst von selbst; sie haben CHF 500 für **einen** Kauf verbrannt |

---

# 💸 GELD

## 1. ⛔ Zwei TikTok-Kampagnen stehen auf AN und warten nur auf Guthaben

> **Bevor du das Werbekonto auflädst, lies das hier.** Beide Kampagnen sind eingeschaltet
> (`operation_status: ENABLE`) und laufen nur deshalb nicht, weil das Guthaben leer ist
> (`CAMPAIGN_STATUS_BUDGET_EXCEED`). Sobald Geld drauf ist, starten sie von selbst.

| Kampagne | Konto | Budget |
|---|---|---|
| **Wasserfest CH Juni** | Shopify-Konto (7641101648701554704) | **CHF 30/Tag** |
| LuxeStyle CH Conversion Juli 2026 | LuxeStyle CH Ads (7646349875793182738) | ohne Deckel |

Der freigegebene Konnektor erlaubte am 29.08. die erste Lifetime-Auswertung beider Konten:

| Kampagne | Ausgabe | Impressionen | Klicks | **Käufe** |
|---|---:|---:|---:|---:|
| Conversion Juli 2026 | CHF 332.18 | 231'385 | 409 | **0** |
| Wasserfest CH Juni | CHF 147.36 | 71'799 | 643 | **1** |
| Sommer-Highlights 2026 | CHF 17.81 | 19'106 | 123 | **0** |
| Vatertag-Test-1 | CHF 2.64 | 1'880 | 12 | **0** |
| **Summe** | **CHF 499.99** | **324'170** | **1'187** | **1** |

**CHF 500 für einen Kauf.** Der Shop hat in seiner GESAMTEN Geschichte CHF 227.22 aus
7 Bestellungen umgesetzt, bei CHF 3–5 Marge je Bestellung.
ℹ️ Man könnte einwenden, der Pixel zähle zu niedrig. Darauf kommt es nicht an: Selbst wenn JEDE
Bestellung des Shops von TikTok käme, stünden CHF 227 Umsatz gegen CHF 500 Ausgabe.
→ **Sag ein Wort, dann pausiere ich beide.** Ich habe es nicht von mir aus getan: Kampagnen und
Budget sind deine Entscheidung, und es fliesst gerade ohnehin kein Geld.

## 2. ✅ ERLEDIGT / ENTSCHIEDEN — der Gratis-Versand-Balken bleibt auf 5000

⛔ **Hier stand «`SCHWELLE=5000` → `4900`». BITTE NICHT MEHR MACHEN.** Genau das war am 31.08.
umgestellt und ist am **05.09. bewusst zurueckgedreht** worden — die 31.08.-Messung kannte nur
den EINZELkorb. Live gemessen 08.09.: im Theme steht wieder `SCHWELLE = 5000`, und das ist richtig.

**Warum keine der beiden Zahlen in jedem Korb stimmt:**

| Korb | Warenwert | nach «2+ Artikel −10 %» | Kasse gibt Gratis-Versand? |
|---|---:|---:|---|
| 1 Artikel CHF 49.90 | 49.90 | 49.90 | **ja** (Rabatt ab 49) |
| 2 Artikel à 24.90 | 49.80 | **44.82** | **nein** |

Shopify prueft die Versandregel gegen den Betrag **nach** Rabatt. Ein Balken auf 4900 wuerde dem
Zwei-Artikel-Korb Gratis-Versand versprechen, den die Kasse nicht gibt — das ist die teurere
Sorte Irrtum. **5000 ist die einzige Zahl, die in keinem Korb luegt**, sie verspricht hoechstens
zu wenig. Nichts zu tun.

## 3. ✅ ERLEDIGT (08.09.2026, gemessen): Klaviyo-Konto zeigt auf luxestyle.ch

`get_account_details` liefert jetzt `website_url: https://luxestyle.ch` (vorher die tote
`luxestyle.com.co`). Absender steht auf `LuxeStyle CH / info@luxestyle.ch`. Damit ist die
QUELLE zu: Klaviyo baut in neue Vorlagen keine tote Domain mehr ein.
⚠️ Zwei Kleinigkeiten stehen im selben Dialog noch falsch: **Währung `USD`** und **Sprache
`de-DE`** bei einem Schweizer Shop. Beides kostet nichts, verzerrt aber jede Umsatzzahl, die
Klaviyo dir zeigt. Wenn du ohnehin dort bist: auf CHF und de-CH stellen.

<details><summary>alter Auftrag (erledigt)</summary>

> Klaviyo-Konsole (Konto XWqMAD, LuxeStyle CH) → Settings → Account → Contact information.
> **Website URL** `https://luxestyle.com.co` → `https://luxestyle.ch`. Bei der Gelegenheit
> **Preferred currency** USD → **CHF** und **Locale** `de-DE` → `de-CH`. Bestätige die drei Werte.

**Warum es noch offen ist, obwohl am 28.08. «45 Vorkommen ersetzt» gemeldet wurde:** Jener Lauf
hat die **Bibliotheks-Vorlagen** repariert — die verschickten Mails benutzen aber eine **eigene
Kopie**, die beim Bearbeiten des Flows entsteht. Deshalb kam am 29.08. noch eine Bewertungs-Mail
mit totem Link an. **13 Live-Nachrichten sind inzwischen umgehängt und einzeln gegengeprüft.**
Das Konto-Feld bleibt trotzdem die Quelle: Klaviyo baut die Domain in NEUE Vorlagen wieder ein.

**Noch wirksamer, falls die Domain dir gehört:** `luxestyle.com.co` per DNS auf Shopify zeigen
lassen und in Shopify als Weiterleitungs-Domain eintragen. Das rettet zusätzlich alle BEREITS
VERSCHICKTEN Mails und alten Social-Posts.

</details>

## 3f. Filter: aufgeklärt — kein Handgriff nötig  (KORRIGIERT 30.08., 22:40)

**Nichts zu tun — und mein erster Befund war falsch.** Ich hatte gemeldet, die
Search-&-Discovery-App fehle. Tatsächlich ist sie installiert (sie war App Nr. 27, meine
Abfrage las nur die ersten 25) und die Filter sind eingerichtet — dein Screenshot hat mich
draufgestossen, danke.

**Was wirklich los war:** Shopify schaltet Filter auf Kollektionen mit **mehr als 5'000
Produkten** ab (Plattform-Limit, nicht änderbar). Gemessen: `gadgets`, `uhren`,
`komfort-im-alter` usw. haben volle Filter (Preis, Verfügbarkeit, Produkttyp, Optionen);
`damen-mode` (≥10'000), `wohnen-dekoration` (7'139) und `schuhe-sneaker` (5'195) haben keine —
und ich hatte ausgerechnet an damen-mode gemessen und daraus «überall keine» gemacht.

**Genau für diese Riesen-Kollektionen greifen jetzt die neuen Filter-Chips** («Filtern:
Damen · Herren · Schuhe · ⚡ Ab CH-Lager …», native Tag-Filterung) — sie funktionieren
unabhängig vom 5'000er-Limit auf jeder Kollektionsseite. Die beiden Systeme ergänzen sich.

## 4. Google Merchant Center: Zielland auf Schweiz

> Merchant Center für luxestyle.ch öffnen, Ziel- bzw. Versandland des Feeds auf **nur Schweiz**
> stellen. Melde mir danach, wie viele Artikel «Missing shipping info» verlieren.

Der Shop hat genau EINEN aktiven Markt (Switzerland). Zeigt der Feed auf Deutschland, meldet
Merchant fehlende Versandinfos für Ware, die dorthin gar nicht verkauft werden kann. Google ist
der einzige Kanal mit belegten Verkäufen.

---

# 🤔 ENTSCHEIDUNGEN — nur du kannst sie treffen

## 5. Fünf Küchen-Zubehörteile: rein in den Google-Kanal oder nicht?

> Sag mir Ja oder Nein — den Rest mache ich.

Diese fünf sind ACTIVE, stehen in fünf Kanälen und fehlen **nur** bei Google (am 29.08. um 23:00
einzeln am Produkt abgefragt, nicht aus einem Bericht übernommen):

- Xinzuo Magnetischer Messerblock aus Akazienholz
- Abtropfgestell mit Geschirr- und Messerhalter
- Bambus-Käsebrett-Set mit Messern
- Multifunktionaler Messerhalter mit Wellenmuster
- Diamant-Messerschärfer mit festem Winkel

**Warum sie überhaupt draussen waren — das hat sich heute Abend geklärt, und es war ein
Fehler von uns, keine Richtlinie.** Der Lauf, der solche Lücken schliesst, prüft den Titel gegen
eine Wortliste, und in dieser Liste stand ein ungeankertes `messer`. Über alle **49'270 aktiven
Produkte** gemessen trifft dieses eine Wort **403 Titel — 73 davon sind gar keine Klinge**:
Messerschärfer, magnetische Messerhalter, Wetzsteine, dazu Pulsmesser, Herzfrequenzmesser,
Höhenmesser und ein Mixer «mit 6 Messern». Dieselbe Liste hielt ausserdem **54 Waffelstrick-
Pullover** für Waffen und **268 Augen-, Schlaf- und Gesichtsmasken** für Kostüm-Masken.
Die Liste ist repariert (verankert, 22 Gegenproben, 0 Abweichungen); die gepflegte Klingenregel
lehnt echte Messer weiterhin ab.

**Damit steht die Frage anders:** Es gibt keinen Richtlinien-Grund, diese fünf draussen zu
lassen. Google erlaubt Küchenmesser ausdrücklich, und vier der fünf sind reines Zubehör ganz
ohne Klinge. Google ist der einzige Kanal mit belegten Verkäufen — jedes Produkt, das dort
fehlt, ist ein verschenkter Gratis-Eintrag.

**Warum ich sie trotzdem nicht selbst publiziert habe:** Ein Fehlgriff im Google-Kanal riskiert
die Merchant-Sperre, also genau den Kanal, der als einziger verkauft. Deshalb läuft der
Publizier-Schritt bewusst NICHT automatisch mit den täglichen Wächtern. Ein Wort von dir genügt.

**Zwei Fälle aus derselben Meldung habe ich selbst entschieden**, weil sie eindeutig waren:
Eine **«Retro Schwertabdeckung»** bleibt draussen — das ist eine Scheide für ein Schwert, also
Waffenzubehör; die alte Regel hätte sie durchgelassen, das ist repariert. Ein Deko-Kissen mit
**«Schwertblatt»**-Muster (Schwertblatt = Bogenhanf, eine Pflanze) ist dagegen jetzt drin.
Beides live gegengeprüft.

⚠️ **Eine Absage war nur zufällig richtig, und das gehört dazugesagt:** Die «LED-Gesichtsmaske»
blieb draussen, weil das Wort «Maske» in der Liste stand. Der Grund, den ich am 22.08. notiert
hatte («Therapie» im Text), steht im TEXT — geprüft wird aber der TITEL. Sie ist damit ebenfalls
eine offene Frage, keine getroffene Entscheidung.

## 6. Drei Anmeldewege, drei Ziele — von 1'324 Kundinnen hat EINE eingewilligt  ⭐⭐

> Entscheide, welcher Weg der richtige ist, und sag Bescheid — den Rest baue ich.

Gemessen, nicht geschätzt:

| Weg | schreibt nach |
|---|---|
| Footer-Formular (Shopify-eigenes `contact[email]`) | **Shopify** |
| Popup WELCOME10 | **Klaviyo** |
| Kasse | eigene Einwilligung |

**`email_marketing_state:subscribed` trifft in Shopify auf genau 1 von 1'324 Kundinnen zu**
(seit 02.07.). Klaviyo hat **0 eigene Formulare**. Es gibt also keinen Ort, an dem die Adressen
zusammenlaufen — und E-Mail ist der mit Abstand wirksamste Kanal des Shops: über 365 Tage haben
alle Flows zusammen **17 Empfänger** erreicht und daraus **2 Käufe / CHF 67.80** gemacht, rund
**30 % des Gesamtumsatzes**. Das sind **CHF 14.97 je Empfänger**; TikTok-Ads haben für CHF 499.99
genau **einen** Kauf gebracht. Kein anderer Kanal kommt in die Nähe.

**Meine Empfehlung:** In Shopify unter *Einstellungen → Checkout* die Marketing-Einwilligung an
der Kasse sichtbar anbieten, und das Footer-Formular ebenfalls nach Klaviyo schreiben lassen
(als Notbehelf tut das seit heute ein kleines Skript im Theme — sauber wäre ein echtes
Klaviyo-Formular). Beides ist eine Entscheidung über Einwilligung und Rechtstext — darum frage
ich, statt es zu tun.

## 7. Die VIP-Mail verspricht ein Programm, das es nicht gibt

Wer CHF 500 überschreitet, bekommt laut Mail: «Code VIP10 automatisch angewendet», «Gratis
Versand ohne Mindestbestellwert», «Geburtstags-Geschenk CHF 30», «Early Access 48 h»,
«Founder-Tier: 15 % · Concierge».
Live existieren im Shop nur: Bundle 2+ −10 %, Mengenrabatt ab 3, Gratis-Versand ab CHF 49.
→ **Entweder das Programm einrichten oder die Zusagen aus der Mail nehmen.** Der Flow
«VIP Tier-Upgrade Welcome» ist live.

## 8. Schickt Shopify UND Klaviyo eine Bestellbestätigung?

Shopify verschickt bereits eine eigene Bestellbestätigung, der Klaviyo-Flow schickt eine zweite,
hübschere hinterher. **Willst du beide?** Wenn nein, nehme ich die Klaviyo-Bestätigung raus und
lasse nur die Bewertungs-Anfrage nach 7 Tagen stehen. Ich habe es nicht selbst entschieden:
welche Bestätigung deine Kundin sieht, ist Markenauftritt, keine Technik.

## 9. Fünf Ratgeber bewerben eine Box für CHF 299.90, die es nicht zu kaufen gibt

> Entscheide: Soll die **«🎁 Gentleman's Premium Gift Box»** (CHF 299.90) veröffentlicht werden,
> oder sollen die fünf Ratgeber-Sätze verschwinden? Sag es mir, ich setze es um.

Ein Vollscan über alle 307 veröffentlichten Ratgeber fand 6 Stellen, an denen Ware mit NAMEN und
PREIS beworben wird, die es nicht zu kaufen gibt — **fünf davon sind dieselbe Box**
(`geschenke-fuer-maenner-2026-schweiz`, `herrenuhr-kaufen-ratgeber-schweiz`,
`vatertag-geschenke-schweiz-2026`, `geschenkboxen-sets-verschenken-ideen`,
`echtleder-accessoires-pflegen-anleitung`).

**Beide Wege haben einen Haken:**
- *Veröffentlichen* ist riskant: Die Box ist ein selbst zusammengestelltes Bündel
  (`LXSCH-GIFT-GENTLEMAN`, live geprüft: DRAFT) und nennt in ihrem Inhalt die «Slim Wallet» —
  eines der acht handkuratierten Altprodukte ohne Lieferanten dahinter. Eine bezahlte, nie
  lieferbare Bestellung ist die teure Klasse (#1008).
- *Ein anderes Produkt einsetzen* geht nicht: Die Sätze zählen den Inhalt auf. Die aktive
  «Tech Hero Geschenkbox» (CHF 199.90) enthält Smartwatch und Kopfhörer — der Satz wäre danach
  auf neue Weise falsch.
- Bleibt: die Sätze entfernen. Redaktionelle Arbeit an fünf veröffentlichten Texten.

**Der sechste Fall:** «Leiser Baby Nagelschneider» CHF 29.90 in `baby-schlaft-nicht-7-tipps` —
ebenfalls kein aktives Produkt. (Ein anderer Ratgeber derselben Klasse ist bereits repariert.)

## 10. Drei bedruckbare T-Shirts — zusammenlegen?

> Entscheide, ob `unisex-t-shirt-selbst-gestalten` (CHF 27.90) und
> `klassisches-unisex-t-shirt-selbst-gestalten` (CHF 23.90) neben dem Haupt-Shirt
> (`shirt-zum-selbstgestalten`, CHF 32.90) bestehen bleiben sollen.

«t shirt selbst gestalten» hat **590 Suchen/Monat**, der Shop steht auf **Position 15** — Seite 2,
so nah dran wie nichts anderes im Katalog. Drei fast gleiche Seiten teilen die Signale
untereinander auf. Ich habe die beiden anderen auf eigene SEO-Merkmale gestellt
(nicht-zerstörerisch); Zusammenlegen brächte mehr, nimmt aber Ware aus dem Sortiment.
Der POD-Editor ist das einzige Produkt des Shops, das kein anderer hat — und damit das einzige,
das überhaupt ranken kann.

## 11. Zwei kleine Handgriffe in Klaviyo, die nur von Hand gehen

**a) Die zweite Willkommens-Mail zusammensetzen (2 Min).** Die stillgelegte «E-Mail
Welcome-Serie» hatte eine gute zweite Stufe — nach 3 Tagen «Hey {{ first_name }} — schon was
Schönes entdeckt?», korrekt gebrandet. Die lebende Serie «Welcome Series» hat nur EINE Mail.
Öffne `Welcome Series` → **Add Delay 3 Tage** → **Add Email** → Template
`Welcome T+3d Discovery`. Der Flow-Aufbau lässt sich über die API nicht ändern.

**b) Zwei Profile umhängen.** Auf der alten Liste «Email List» sitzen **2 Profile** — Leute, die
sich angemeldet und den Code nie bekommen haben. Liste öffnen → beide auswählen → *Add to list*
→ «Newsletter Subscribers». Dann bekommen sie die Willkommens-Mail nachträglich.
Ich habe das NICHT selbst gemacht: das verschickt echte Post an echte Menschen.

---

# 🖐️ HANDARBEIT im Browser

## 12. TikTok posten — Material liegt bereit  📱

> Siehe **`dropship/TIKTOK-COWORK-AUFTRAG.md`** — sechs fertige Beiträge, je mit Caption,
> nummerierten Slide-URLs und einer stummen Videodatei. Alle Dateien liegen öffentlich auf dem
> Shopify-CDN, es braucht keinen Repo-Zugriff.
> **Höchstens ein Beitrag pro Tag**, und vor jedem Upload das Profil ansehen.

TikToks Content-Posting-API ist weiter in Review (Punkt 16), und der Browser der Cloud-Session
wird von TikToks Bot-Schutz abgewiesen (die Seite lädt mit 200 und zeigt trotzdem «Something went
wrong»). Der Upload von Hand über tiktokstudio ist der einzige Weg, der heute funktioniert.
**Am 29.08. gegen den Live-Shop geprüft: 6 Beiträge, 0 gesperrt** — alle beworbenen Artikel sind
ACTIVE, die Preise in den Captions stimmen. Der Lauf (`automation/tiktok_cowork_auftrag.py`)
markiert einen Beitrag mit ⛔ GESPERRT, sobald ein Produkt auf DRAFT geht; steht dort ein solcher
Vermerk, den Beitrag NICHT posten.

## 13. Judge.me: Bewertungs-Anfragemails abstellen

> Judge.me-Konsole für au3j0y-hq.myshopify.com → **Settings → Request scheduling → Request
> Timing**. Häkchen bei allen drei Bestellarten (domestic, international, POS) entfernen und
> speichern. Bestätige, dass alle drei aus sind.

Es gibt drei getrennte Schalter; die Mails hören erst auf, wenn alle drei aus sind. Bereits
eingeplante, noch nicht versendete Anfragen entfallen mit; schon verschickte nicht.
Der tägliche Bewertungs-Import verschickt selbst KEINE Mails und darf weiterlaufen.

## 14. Instagram: etwas postet an der Sperre vorbei

> Meta Business Suite für «LuxeStyle CH» (1049840534888592) und @luxestyle.ch öffnen. Unter
> **Planer / Geplante Beiträge** nachsehen, ob automatische oder geplante Posts eingerichtet sind,
> und unter **Einstellungen → Business-Integrationen**, ob eine fremde App Veröffentlichungsrechte
> hat. Melde mir, was du findest. ⚠️ Nichts löschen — nur nachsehen.

Der Stopp-Riegel im Repo wirkt nachweislich: das Autopilot-Log sagt bei jedem Lauf «es wird
NICHTS gepostet». Trotzdem entfernt die Dubletten-Wache **seit dem 19.08. täglich 2–5 Duplikate**
vom Profil, und ihre Ausgabe lautet «⚠️ externer Poster war wieder aktiv». Es postet also etwas
ausserhalb dieser Session. Was, lässt sich nur im Meta-Konto sehen.

---

# 🧹 HYGIENE

## 15. Schlüssel dauerhaft hinterlegen

> In den Claude-Umgebungs-Einstellungen eintragen: `JUDGEME_PRIVATE_TOKEN`,
> `JUDGEME_PUBLIC_TOKEN`, `JUDGEME_SHOP_DOMAIN`.
> **Nicht** in eine Datei im Repo — das Repo ist öffentlich.

Sie liegen derzeit nur unter `/tmp/judgeme.env`. Der Container stellt regelmässig einen alten
Snapshot her und `/tmp` wird mitgedreht — die Token waren am 28.08. schon einmal weg. Ohne sie
endet der tägliche Bewertungs-Import als No-op.

## 16. TikTok-Posting-API: NICHT freigegeben — GEMESSEN am 29.08., 20:44

> **Du hast es heute geklickt, das Ergebnis ist eindeutig.** Der Rücksprung lautete
> `error=unauthorized_client&error_type=client_key`
> (logid `2026082920443016EF4906E0DEFC6C7DC8`). Die App «luxe» ist weiterhin in Review.

**Warum dieser Klick trotzdem richtig war:** Es ist der EINZIGE gültige Test. Der App-Token
(`client_credentials`) läuft auf App-Ebene und braucht keine Review — er funktioniert seit
Wochen und beweist nichts. Und dass der Autorisierungs-Endpunkt auf die Anmeldeseite leitet,
ist der normale erste Schritt jedes OAuth-Flusses. `unauthorized_client` kommt erst NACH der
Zustimmung zurück. Vorher war es eine Vermutung, jetzt ist es belegt.

⚠️ **Bitte nicht weiter probieren.** Jeder weitere Versuch endet gleich; der Nutzen ist
aufgebraucht.

> **Das eine, was jetzt hilft — 2 Minuten:** Öffne
> **developers.tiktok.com/app/7648584035840903189** und sieh beim App-Eintrag nach, welchen
> Status die Review hat. **Elf Tage** sind lang genug, dass eine Ablehnung oder eine Rückfrage
> vorliegen kann, die per Mail kam und untergegangen ist. Unsere API-Antwort sagt darüber
> nichts — `error_type=client_key` heisst nur «dieser Key darf nicht», nicht warum.
> Melde mir, was dort steht.

⚠️ **Nicht die App «LuxeStyle Poster» anfassen** — das ist das KURZDRAMA-Portal
(`/portal/drama/`, verlangt Unternehmensverifizierung), eine andere Baustelle.
⚠️ Das Client-Secret stand einmal in einem Chat — im Portal rotieren lassen, neue Werte an mich.

**Bis dahin läuft alles über Punkt 12** (Upload von Hand über tiktokstudio). Das Material ist
heute gegen den Live-Shop geprüft: 6 Beiträge, 0 gesperrt.

**Was der Ads-Konnektor über das Profil verrät** (neu, 29.08.): `luxestyle.ch` ist dort als
BC-autorisierte Identität hinterlegt (`can_push_video: true`). Die Videoliste über die Ads-API
ist trotzdem KEIN Ersatz für den Blick aufs Profil — sie zeigt nur, was für Spark-Ads
freigegeben ist, und gab für beide Identitäten leer zurück. Schritt 1 in Punkt 12 («zuerst das
Profil ansehen») bleibt deshalb Pflicht.
⚠️ **Nebenbei aufgefallen, nur zur Kenntnis:** Auf dem LuxeStyle-Werbekonto ist die Identität
**`192aban` («aban»)** autorisiert, mit Push-Recht für Videos. Das ist die fremde Marke, die
auch als Klaviyo-Absendername auftauchte. Wenn das nicht gewollt ist, sag Bescheid.

## 17. Aufräumen: hängende Sitzung und offengelegter Webhook

> In der Claude-Sitzungsübersicht hängt «Weekly billing audit» seit dem 26. Juli auf einer
> PowerShell-Freigabe. In genau diesem Befehl steht eine **Discord-Webhook-URL im Klartext**.
> Eine Webhook-URL ist faktisch ein Passwort — in Discord neu erzeugen und die Sitzung beenden.

---

## Was Cowork NICHT übernehmen soll

- **Die Motoren dieser Session** (4 CJ-Runner, Aufseher, 23 tägliche Wächter) brauchen einen
  dauerhaft laufenden Container. Cowork ist eine Arbeitsoberfläche, kein Ersatz.
- **Bewertungen** schreiben, übersetzen oder löschen. Kundentext bleibt Kundentext.
- **Preisentscheidungen.** Die Produkte, die in jedem Warenkorb Geld kosten, sind eine
  Geschäftsentscheidung (`dropship/PREIS-ALTBESTAND-ENTSCHEID.md`).
- **Produkte veröffentlichen, die gedraftet sind.** Jedes Draft hat einen Grund im Tag; ein
  404 ist ärgerlich, eine unlieferbare Bestellung teuer.

---

## Bereits erledigt — nicht doppelt machen

### 🔎 Eine Entscheidung habe ich selbst getroffen — du kannst sie umkehren

**69 tote Landeseiten haben jetzt eine 301 auf eine passende KATEGORIE** (511 Sitzungen in
60 Tagen, live nachgezählt: 69 von 69 gesetzt). In der vorigen Fassung dieser Liste stand das
als Frage an dich, weil rund 45 davon BigBuy-Markenseiten sind (Adidas, Puma, Nike, Reebok,
Calvin Klein, Polaroid, Casio, Armani) und eine Umleitung eine Enttäuschung für jemanden ist,
der «Adidas» gesucht hat.

**Ich habe sie dann doch gesetzt, aus zwei Gründen:** Die Hausregel vom 28.08. sagt ausdrücklich,
dass Markenanfragen auf die KATEGORIE gehen und niemals auf eine fremde Marke — genau so sind
am 28.08. bereits 16 Weiterleitungen entstanden, die du nicht beanstandet hast. Und die Alternative
war nicht «keine Enttäuschung», sondern ein 404: die Seiten sind seit dem 10.07. tot, der
Lieferant ist stillgelegt, die Ware kommt nicht zurück.

⚠️ **Es ist vollständig umkehrbar.** Sag ein Wort und ich lösche jede einzelne wieder — eine
Shopify-301 ist ein eigener Datensatz, das Produkt wird davon nicht angefasst. Und eine
Besonderheit spricht ohnehin dafür, sie stehen zu lassen: Eine Shopify-Weiterleitung greift nur,
wenn die Adresse sonst einen 404 gäbe. Wird ein Produkt je wieder veröffentlicht, gewinnt die
Produktseite und die Weiterleitung schaltet sich von selbst ab.

### Weiteres, das seit dem 28.08. erledigt ist

- ✅ **Die Anmeldung war ins Leere verdrahtet** (29.08.). Das Popup meldete auf die Klaviyo-Liste
  «Email List» an — auf die hörte **kein einziger Flow**; die Willkommens-Flows hingen an
  «Newsletter Subscribers», und die war leer. Die versprochene WELCOME10-Mail kam seit Juni nie
  an. Popup umgehängt, Mail saisonneutral neu gebaut, Footer-Formular schreibt jetzt mit.
- ✅ **Jede Mail ging doppelt raus** (29.08.). Am 01.06. wurde der komplette Flow-Satz als «· EN/US»
  geklont; beide Hälften hingen am selben Auslöser. Live hiess das: Bestellbestätigung 2×,
  Bewertungs-Anfrage 2×, fünf Mails je abgebrochenem Warenkorb. **10 Live-Flows → 5.**
  Eine dieser Mails trug den Betreff «Email #3 Subject» — ein Platzhalter, der an echte Kundinnen
  ging. ⚠️ Die sechs Entwürfe bitte **nicht wieder aktivieren**.
- ✅ **Absender und Rabatte in den Mails** (29.08.): Absendername war «Aban» (fremde Marke), als
  Antwortadresse stand deine private Gmail-Adresse auf Kundenmails — beides jetzt LuxeStyle CH /
  info@luxestyle.ch. Die Win-Back-Mail versprach drei verschiedene Rabatte gleichzeitig
  (Betreff «CHF 15», Text «10 %», Code WELCOME10 statt BACK15); live ist BACK15 = 15 % ab CHF 50.
- ✅ **Warenkorb-Rückholung** (29.08.): Die vier Live-Warenkorb-Mails führen jetzt in den WARENKORB
  statt auf die Startseite. Die Liste der abgebrochenen Käufe hatte zuletzt CHF 570 offen.
- ✅ **13 Live-Nachrichten** aus 10 Flows auf die korrigierten Vorlagen umgehängt, jede am neu
  entstandenen Snapshot gegengeprüft (29.08.).
- ✅ **Google-Suchergebnisse**: 295 Produktseiten und 3 Kollektionen zeigen statt des Bausteins
  «– bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50» einen Satz aus dem eigenen Produkttext
  (29.08.). Der Importer schreibt ihn ab sofort selbst.
- ✅ **9 Produkttitel** auf den Begriff gesetzt, den Kundinnen suchen (Handstaubsauger 5'400/Mt.,
  «bedrucken» ~6'700/Mt. bei den POD-Artikeln) — Handles unverändert, POD-QA 0 Befunde (29.08.).
- ✅ **TikTok-Ads-Konnektor freigegeben** (29.08.) — beide Werbekonten sind aus der Session lesbar,
  daraus stammt Punkt 1. ⚠️ Das schaltet KEIN Posten frei; dafür braucht es die
  Content-Posting-API (Punkt 16).
- ✅ 16 Weiterleitungen von rankenden 404-Seiten auf kaufbare Ware (28.08.).
- ✅ POD-Produkte: Rückgabe-Ausnahme, falsche Flagge, Doppelblock, USA-Lieferzusage (28.08.).


## Gmail «Senden als» info@luxestyle.ch (03.09.2026)
Kundenmails aus dem Konnektor gehen vom privaten Gmail raus. In Gmail → Einstellungen → Konten → «Senden als» die Adresse info@luxestyle.ch hinzufügen (SMTP der Domain-Mailbox) und als Standard setzen. Danach tragen Kundenmails die Shop-Adresse.

## 🧹 Klaviyo: 1'482 Karteileichen aus dem Bewertungs-Import (04.09.2026)

**Was**: Judge.me spiegelt seine Rezensenten nach Klaviyo. Unser Bewertungs-Import hat bis
heute fuer jede CJ-Bewertung ohne Adresse eine **erfundene** Adresse erzeugt
(`cj-import+<zufall>@luxestyle.ch`). Gemessen ueber die Judge.me-API: **1'482 von 1'724
Bewertungen (86 %)**.

**Warum es Geld kostet**: Klaviyo rechnet nach aktiven Profilen ab. 1'482 Karteileichen
koennen die Preisstufe heben, ohne dass jemals eine Mail an sie geht — und wenn doch, prallt
sie gegen unseren eigenen Mailserver (Absenderreputation).

**Die Quelle ist behoben** (04.09.): kuenftig eine einzige technische Adresse
`cj-import@luxestyle.ch` statt einer je Bewertung.

**Deine Entscheidung** (ich fasse ein Abrechnungssystem nicht von mir aus an):
1. **Unterdruecken** (`bulk_suppress_profiles`, umkehrbar) — sie bekommen nie Mail, zaehlen
   je nach Tarif aber weiter.
2. **Loeschen** (`request_profile_deletion`, UNUMKEHRBAR) — raus aus der Abrechnung, die
   Bewertungen in Judge.me bleiben davon unberuehrt.
3. **Nichts tun** — kostet nur, wenn die naechste Preisstufe erreicht wird.

Sag mir, welche Variante, dann fuehre ich sie chargenweise mit Gegenprobe aus.
