# YouTube-Runde 2: das Einsammeln gemessen — es gibt kein Anmeldefenster

**Datum:** 2026-09-13 (zweite Runde desselben Tages)
**Auftrag:** „weiter youtube lernen"
**Am Shop geändert:** nichts. Zwei Messgeräte wurden erweitert, ein Fehlurteil von heute Morgen
korrigiert.

Jede Zeile trägt ihre Herkunft: **GEMESSEN** = hier nachgeprüft · **QUELLE** = fremde Angabe,
plausibel · **BEHAUPTUNG** = Verkaufsversprechen, ungeprüft.

---

## 1 · Der Hauptbefund: das Anmeldefenster, das es nie gab

Der Engpass stand seit heute Morgen fest: **3 E-Mail-Abonnenten bei 1498 Kundendatensätzen**.
Das Gedächtnis erklärt das seit dem 1. Juni so: „**WELCOME10-Popup (Shopify Forms) live**,
ohne Mindestwert". Diese Runde hat nachgesehen, statt es zu glauben.

**GEMESSEN an fünf echten Seiten** (`tools/shop_conversion.mjs`, jetzt 20 Selbsttests):

| Seite | E-Mail-Feld steht bei | Anmeldefenster | Code im Klartext |
|---|---|---|---|
| Startseite (6,91 MB) | **99,2 %** | **NEIN** | WELCOME10 |
| Collection Geschenke unter 50 | 94,4 % | **NEIN** | WELCOME10 |
| Familien-Pyjama | 91,0 % | **NEIN** | WELCOME10 |
| Kapuzen-Poncho | 89,6 % | **NEIN** | WELCOME10 |
| Halloween-Umhang | 89,6 % | **NEIN** | WELCOME10 |

**Es gibt kein Anmeldefenster. Auf keiner Seite.** Geladen werden genau zwei fremde
Erweiterungen: das Partnerprogramm (`affliate-by-secomapp`) und Judge.me. **Kein
`shopify-forms`, kein `static.klaviyo.com/onsite/js/klaviyo.js`, kein Privy, Omnisend,
Justuno, OptiMonk.** Die 37 Treffer auf „popup" im Quelltext der Startseite sind ausnahmslos
etwas anderes: `aria-haspopup` an Suche und Menü, dazu die Einstellungen des
Judge.me-Bewertungsfensters.

**Das einzige E-Mail-Feld sitzt im Fuss der Seite** — bei der Startseite hinter 7,18 von
7,24 Millionen Zeichen. Es ist ein Theme-Formular (`email-signup__form`, Ziel
`/contact#contact_form`), an das ein handgeschriebenes Skript im Theme hängt, das die Adresse
zusätzlich an Klaviyos öffentliche Anmelde-Schnittstelle meldet (`custom_source: "Footer
Newsletter"`). Das funktioniert — nur sieht es kaum jemand.

### Der zweite Teil, der mindestens so schwer wiegt

**Der Rabattcode steht im Klartext auf jeder Seite**, ganz oben im Ankündigungsband:
„–10 % auf deine erste Bestellung mit Code WELCOME10". **GEMESSEN auf allen fünf Seiten.**

Damit gibt es für den Tausch „Adresse gegen Rabatt" nichts mehr zu tauschen. Wer den Code
ohnehin geschenkt bekommt, trägt für ihn keine E-Mail-Adresse ein. **3 Abonnenten in gut drei
Monaten sind nach dieser Messung kein Rätsel mehr, sondern die erwartbare Folge**: der Anreiz
ist verschenkt, und der einzige Eintrag steht hinter 90–99 % der Seite.

### Was daraus folgt — und was ausdrücklich nicht

- **Nicht** mehr Klaviyo-Strecken bauen. Acht Strecken für drei Empfänger sind schon zu viel.
- Der Hebel ist ein **Anmeldefenster mit einem Anreiz, den es nur gegen die Adresse gibt**.
  Das verlangt Schreibzugriff auf das aktive Theme → **`SHOPIFY_CLI_THEME_TOKEN`**, dasselbe
  Token, das schon für die schlanke Startseite fehlt. **Ein Token löst zwei der drei
  gemessenen Lücken.**
- **Solange das Ankündigungsband den Code verschenkt, bringt auch ein Fenster wenig.** Diese
  Reihenfolge ist wichtig: erst der Anreiz, dann das Fenster.

---

## 2 · Korrektur am eigenen Werkzeug: die „Einwilligungsseite" war keine

Heute Morgen meldete `tools/yt_lernen.mjs` bei zwei Videos „keine Videoseite (1 253 172 Bytes,
Einwilligungs- oder Fehlerseite)". Das war **eine falsche Diagnose im eigenen Messgerät** —
und sie hätte zwei brauchbare Quellen verworfen.

**GEMESSEN, acht Abrufe desselben Videos:** YouTube liefert zufällig **zwei Fassungen
derselben Seite**.

| | volle Fassung | reduzierte Fassung |
|---|---|---|
| `"shortDescription"` | ja | **nein** |
| `"viewCount":"167"` | ja | **nein** |
| `"attributedDescription"` | ja | **ja — mit dem echten Text** |
| `videoPrimaryInfoRenderer` Titel | ja | **ja — mit dem echten Titel** |
| `"title":{"simpleText"}` | echter Titel | **„Dieses Video gefällt dir?"** |
| Dauer, Kanalname | ja | nein |

Bei sechs Abrufen kam die volle Fassung **ein Mal**. Die alte Prüfung verlangte
`shortDescription` **und** `viewCount` — sie warf damit jede reduzierte Fassung weg, obwohl
Titel, Beschreibung, Datum und Aufrufzahl darin stehen.

**Und die gestrige Lehre war nur halb richtig.** Notiert war: „YouTubes Einwilligungsseite ist
über 50 000 Bytes gross und heisst ‚Like this video?'". **Gemessen ist es keine
Einwilligungsseite, sondern genau diese reduzierte Fassung** — und der Satz steht dort unter
`"title":{"simpleText"}`, während der echte Titel zwei Felder weiter vollständig vorhanden ist.
Wer nur die erste Titelquelle nimmt, bekommt die Gefällt-mir-Frage als Videotitel.

**Behoben** (`tools/yt_lernen.mjs`, Selbsttests **11 → 24**):

- `volleFassung()` und `reduzierteFassung()` getrennt; `istVideoseite()` akzeptiert beide.
- Titelquellen in neuer Reihenfolge — `"title":{"simpleText"}` steht **bewusst hinten**.
- Beschreibung ersatzweise aus `attributedDescription`, Aufrufe aus „1'234 Aufrufe",
  Datum aus „03.03.2025".
- **Die Dauer wird in der reduzierten Fassung NICHT geraten.** `lengthText` steht dort zwar —
  aber es gehört zu einem Vorschlagsvideo aus der Seitenspalte. Beim Test lieferte es 38:45
  für ein Video, das 14 Minuten dauert. Unbekannt bleibt unbekannt.
- `hole()` versucht es bis zu viermal, weil die volle Fassung zufällig kommt
  (`YT_VERSUCHE=n` regelt das). Jeder Anlauf zählt auf das Drosselungs-Budget.

**Gegenproben im Selbsttest:** die reduzierte Fassung wird erkannt, ihr Titel ist „Echter
Titel" und **nicht** „Dieses Video gefällt dir?", die Dauer bleibt 0, „vor 3 Monaten" ergibt
kein Datum, eine grosse Seite ohne Videofelder gilt weiter nicht als Videoseite.

---

## 3 · Was die Videos hergaben

Fünf Videos ausgewertet. **Die Suche liefert zu diesem Thema fast nur kleine Kanäle**
(167 bis 27 878 Aufrufe) — kein Vergleich zum offiziellen Shopify-Video von heute Morgen mit
106 388 Aufrufen.

**Brauchbar, weil es kein Verkaufsvideo ist** (Seguno, ein Shopify-E-Mail-Anbieter,
03.03.2025, 167 Aufrufe): das Kapitelverzeichnis benennt die Reihenfolge, in der man an ein
Anmeldefenster herangeht — **QUELLE**:

```
1:19  Fehlgebrauch von Anmeldefenstern vermeiden
2:07  erst das heutige Seitenerlebnis bewerten
8:08  den Besucher führen statt nur fragen
9:43  Kaufhürden entfernen
13:24 Fenster testen, Willkommensnachricht
17:06 Leistung des Fensters überwachen
```

Der erste und der zweite Punkt sind genau die, die hier übersprungen wurden: **bewerten, was
die Seite heute tut** — das hat diese Runde nachgeholt, und es kam heraus, dass es gar kein
Fenster gibt.

**Ein Befund über die Quellen selbst (GEMESSEN):** das meistgesehene der fünf Videos
(„So steigern Sie Ihre Conversion-Rate bei Shopify", 27 878 Aufrufe) trägt in seiner
Beschreibung **neun Partnerlinks zu kostenpflichtigen Erweiterungen** — Ladezeit, Website-Audit,
Bündel, Warenkorb-Schieber, SMS, E-Mail-Fenster, Abonnements, Nachkauf-Verkauf,
Bewertungen. Die Kapitel sind brauchbar, die Werkzeugempfehlungen sind bezahlte Platzierungen.
**Sechs der neun Bausteine stehen hier ohnehin schon** (Warenkorb-Schublade, Bewertungen,
Nachkauf, Gratisversand-Balken, sticky-ATC, Lieferdatum).

**Ein Widerspruch zur gestrigen Zahl, ehrlich notiert:** ein Kanal betitelt ein Kapitel
ausdrücklich „**Revenue Per Recipient: A Misleading Metric**" — also genau die Kennzahl
(3.65 je Empfänger), die heute Morgen als QUELLE ins Gedächtnis ging. **Beides sind fremde
Behauptungen.** Bei drei Abonnenten ist die Frage ohnehin ohne Bedeutung; sie wird es erst,
wenn das Einsammeln läuft.

---

## 4 · Was jetzt zu tun wäre, in dieser Reihenfolge

1. **`SHOPIFY_CLI_THEME_TOKEN`** (nur der User, App *Theme Access*, Scope `write_themes`).
   Damit gehen beide: schlanke Startseite **und** Anmeldefenster.
2. **Den Anreiz nicht mehr verschenken.** WELCOME10 aus dem Ankündigungsband nehmen und
   stattdessen dort sagen, dass es den Gutschein für Abonnenten gibt.
3. **Erst dann** ein Fenster bauen — Verzögerung, Zielregeln, Handy-Fassung, und die Leistung
   messen (`tools/shop_conversion.mjs` zeigt Feldposition und Fenster-Werkzeug).
4. **Nicht:** weitere Strecken, mehr Produkte, Bewertungen erfinden, fremde Seiten klonen.

## Nachprüfen

```
node tools/shop_conversion.mjs --selbsttest     # 20 Pruefungen
node tools/shop_conversion.mjs                  # 5 Live-Seiten
node tools/yt_lernen.mjs --selbsttest           # 24 Pruefungen
YT_VERSUCHE=3 node tools/yt_lernen.mjs --voll <id>
```
