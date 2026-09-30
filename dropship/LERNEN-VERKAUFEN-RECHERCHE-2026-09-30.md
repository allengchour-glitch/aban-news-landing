# Etwas verkaufen — die Recherche hinter dem Shop-Check (29./30.09.2026)

> Auftrag des Users: „nutze das ganze internet für info · eine app oder irgendetwas entwickeln
> programmieren zum verkaufen · surfe überall für infos", dann „maximum hilfe surfing suchen ·
> andere session shop seite" — die andere Session macht Shop und Webseite, diese Runde recherchiert.
>
> Jede Zeile ist markiert: **GEMESSEN** = hier selbst nachgeprüft, mit Zahl · **QUELLE** = fremde
> Angabe, plausibel, nicht nachgeprüft · **BEHAUPTUNG** = Verkaufsversprechen, ungeprüft.

---

## 1. Der Befund, der die Richtung entschieden hat

**QUELLE** (Auswertung von über 1000 KI-gebauten Geschäften): **70 Prozent bleiben unter 1000 im
Monat, 1–2 Prozent kommen über 50 000.** Der Engpass ist die Verteilung, nicht das Bauen. Ein
Reddit-Beitrag dazu heisst „99 % der Vibe-Coder werden nie einen Dollar verdienen".

**GEGENPROBE AM EIGENEN BESTAND, und sie stimmt bitter genau:** das Gedächtnis dieses Repos hält
seit dem 13.06.2026 fest, dass mehr Produkte, mehr Posts und mehr Videos bei LuxeStyle ein
**gemessener 0-Hebel** sind. Dieselbe Lehre, zwei Quellen, vier Monate auseinander.

**→ Folge für die Produktwahl:** nur etwas bauen, dessen Verteilung **eingebaut** ist.

---

## 2. Was das möglich macht — GEMESSEN

`https://<shop>/products.json` liefert auf **jedem** Shopify-Shop HTTP 200. Geprüft an
luxestyle.ch, gymshark.com, allbirds.com, www.waterdrop.de, ankerkraut.de, snocks.com, purelei.de,
de.holy.com, lfdy.com, codello.de, nomadi.de. Enthalten: Titel, Optionen **mit Werten**, alle
Varianten mit Preis, `compare_at_price`, SKU, Bilder. Kein Schlüssel, keine Anmeldung.

**QUELLE:** es ist Shopifys eigener öffentlicher Endpunkt; mehrere Anbieter nutzen ihn kommerziell
und nennen ihn „official endpoint requiring no API key", nutzbar „on public pages only".

**⚠️ NICHT enthalten ist der Einkaufspreis.** Eine Margenrechnung über einen fremden Shop geht
damit **nicht** — dafür braucht es weiter Zugangsdaten. Wer etwas anderes behauptet, hat es nicht
gemessen.

---

## 3. Die Konkurrenz — ehrlich, und einmal sogar selbst nachgemessen

**QUELLE:** kostenlose Shopify-Audits gibt es reichlich: Privy „Shopify Store Grader",
`audit.shopifyhelpcenter.com` („100+ Checks, 12 Kategorien, 60 Sekunden"), ScaleFront, LOGEIX,
StoreAudit, commercerank. Die Kategorie „Gratis-Audit" ist also **nicht leer**.

**GEMESSEN, und das ist der wichtigste Wettbewerbsbefund:** ich habe den führenden dieser Prüfer
mit einem echten Browser selbst auf luxestyle.ch losgelassen. Sein Ergebnisbericht ist 9837 Zeichen
lang und enthält:

| gesucht | Ergebnis |
|---|---|
| „variant" / „Variant" | **kommt nicht vor** |
| „compare at" / „compare_at" | **kommt nicht vor** |
| „Farbe" | **kommt nicht vor** |
| unsere wörtlichen Belege (`Set 3-GreenSXL`, `Sliver`, `Hand sweep`, …) | **keiner** |
| in der Kopfzeile | **„PRODUCTS DETECTED: –"** |

**→ Alle diese Werkzeuge messen die Shop-Ebene** (SEO, Tempo, Conversion, Trust). **Den Katalog
misst keines.** Das ist der Unterschied, und er ist nicht behauptet, sondern nachgesehen.

**QUELLE, zweiter Teil des Marktes:** Werkzeuge zum **Reparieren** von Variantennamen gibt es
reichlich im App Store — PS: Bulk Variant Editor, Replaceit, SpurIT, Super Sheet, Renaim. Sie
verlangen aber, dass der Händler **schon weiss**, welche Produkte kaputt sind. **Niemand findet
sie.** Finden gegen Reparieren ist die Lücke.

**QUELLE:** **CleanShelf** im App Store prüft „language and duplicate products" — der nächste
Nachbar. Unterschied: er verlangt eine Installation, unser Weg nicht.

---

## 4. Preisanker am Markt — QUELLE

| Leistung | Preis |
|---|---|
| werkzeuggestütztes Audit, einmalig | 39 USD |
| Audit von Hand (JadePuma) | 150 USD |
| technisches SEO-Audit | 500–2500 USD |
| Agentur-Audit, 1–3 Wochen | 1500–5000 USD |
| „Profiteer – Cost of Goods Sold" (App) | 15 USD/Monat, **Bewertung 3,2 von 17** |

Die schwache Bewertung des COGS-Nachbarn ist ein Hinweis auf eine unbefriedigte Nachfrage —
**BEHAUPTUNG**, 17 Bewertungen sind keine Datenlage.

---

## 5. Gratis-Werkzeug als Türöffner — QUELLE, mit einer Warnung

- HubSpots „Website Grader" hat über die Laufzeit **rund 10 Mio. Leads** gebracht.
- Ein Anbieter berichtet **500 neue Leads im Monat** nach Einbau eines Audit-Widgets.
- Ein SEO-Fallbeispiel: **120+ qualifizierte Leads/Monat aus 7000 Besuchern**.
- Umwandlungsraten: Gratis-Werkzeuge und Rechner **28–42 %**, Gratis-Audits **18–32 %**.

**⚠️ Diese Zahlen kommen durchweg von Anbietern, die Lead-Werkzeuge verkaufen.** Sie zeigen die
Bauform, nicht das zu erwartende Ergebnis. Für diesen Shop gilt die eigene Messung: 1248
Sessions/30 Tage und 3 E-Mail-Abonnenten — **ohne Besucher wandelt auch ein 40-Prozent-Werkzeug
nichts um.**

---

## 6. Wo die Händler sind — QUELLE

- **r/shopify** 340 000+ Mitglieder · **r/reviewmyshopify** 34 000+ (ausdrücklich für Shop-Kritik)
- **Shopify Community** (offiziell) 900 000+ Händler und Partner
- Discord: **Talk Shop**, Shopify Community Discord (11 000+), Mavenport (~40 000)
- Facebook: „Ecommerce Entrepreneurs" (~50 000), „Shopify Entrepreneurs Community" (100 000+)

**⚠️ Und die Regeln, die man vorher lesen muss:**
- r/shopify duldet Eigenwerbung „für echte Händlerhilfe", die häufigste Löschung sind
  **Partner-Beiträge, die wie Anzeigen klingen.** 90/10-Regel: neun von zehn Beiträgen echte Hilfe.
- Die **Shopify Community verbietet** Eigenwerbung ausserhalb des „Ask and Offer"-Boards
  ausdrücklich, ebenso „DM me for more info" und das Abwerben in private Nachrichten.

---

## 7. 🔴 Der Befund, der einen naheliegenden Plan STREICHT — QUELLE, rechtlich

**Kaltakquise per E-Mail ist in der Schweiz wie in Deutschland auch im B2B ohne vorherige
Einwilligung rechtlich problematisch.**

- **Schweiz:** Art. 3 Abs. 1 lit. o UWG verbietet unlautere Massenwerbung über elektronische
  Kanäle — verlangt Einwilligung **plus** korrekte Absenderangabe **plus** Abmeldehinweis;
  Ausnahme nur bei bestehender Kundenbeziehung.
- **Deutschland:** die Lockerung für Unternehmen betrifft **Telefonwerbung**, nicht E-Mail. Für
  E-Mail gibt es diese Ausnahme nicht, „im B2B genauso wie im B2C".

**→ Der verlockende Plan „wir messen fremde Shops und mailen den Händlern ihren Befund" ist
damit vom Tisch.** Die Verteilung muss **eingehend** sein: das Werkzeug wird gefunden, nicht
verschickt. **Ich habe niemanden kontaktiert.**

---

## 8. Wenn es doch eine App werden soll — QUELLE

- **App-Prüfung**: erste Durchsicht 4–7 Werktage, im Schnitt 7–14; mit Nachforderungen
  2–4 Wochen bis zur Veröffentlichung, derzeit teils 4+ Wochen.
- Ab April 2026 müssen **neue öffentliche Apps ausschliesslich auf der GraphQL-Admin-API** bauen.
- Ab 26.03.2026 gelten **strengere Bildregeln** für Listings (echte Oberfläche, keine
  Browserfenster, kein Logo-Only, jedes Bild einmalig).
- „Built for Shopify" verlangt u. a. **50 Netto-Installationen** auf Bezahlplänen und p95 < 500 ms.
- **↔️ WIDERSPRUCH IN DEN QUELLEN, nicht auflösbar:** eine Seite nennt **99 USD einmalig** für den
  Partner-Zugang, eine andere „kostenlos, keine Vorabkosten". Die offizielle Seite, die ich geholt
  habe, **nennt keine Gebühr**. → Vor einer Entscheidung beim Anbieter selbst prüfen; **hier keine
  Zahl behaupten.**

---

## 9. Was die Händler wirklich beschäftigt — QUELLE, und es mahnt zur Demut

Die am häufigsten genannten Beschwerden 2026 sind **Support** („4 Stunden in der Warteschlange",
Chatbot-Schleifen), **App-Ballast und Tempo**, **Gebührenstruktur**, **Kontosperren und
eingefrorene Auszahlungen**, **Ausfälle**.

**Katalog-Hygiene steht in keiner dieser Listen.** Das Produkt löst also ein Problem, von dem
viele Händler nicht wissen, dass sie es haben — deshalb ist der **Befund am eigenen Shop** der
ganze Verkauf, nicht die Beschreibung.

---

## 10. Was aus der Recherche gebaut wurde (siehe Stand-Block in `CLAUDE.md`)

`functions/_katalog_audit.mjs` (die Prüfer, genau einmal) · `tools/katalog_audit.mjs`
(Kommandozeile, 84 Selbsttests) · `functions/api/shop-check.js` (öffentliche Funktion) ·
`functions/_shop-check.test.mjs` (27 Prüfungen) · `functions/_katalog_bericht.mjs` (der Bericht,
also das Bezahlte) · `shop-check.html` (die Seite).

**Die Gegenprobe, die es erst brauchbar macht — GEMESSEN 30.09.2026, zehn Shops, je eine Seite:**

| Shop | geprüft | Produkte mit **Defekt** |
|---|---|---|
| gymshark.com | 250 | **0** |
| allbirds.com | 250 | **0** |
| ankerkraut.de | 250 | **0** |
| snocks.com | 250 | **0** |
| codello.de | 250 | 1 |
| purelei.de | 250 | 4 |
| de.holy.com | 206 | 8 |
| luxestyle.ch | 250 | 9 |
| www.waterdrop.de | 169 | 11 |
| nomadi.de | 250 | 19 |
| lfdy.com | 250 | 25 |

**Vier gepflegte Kataloge ergeben null.** Ein Prüfer, der auch dort ausschlägt, wäre wertlos.

### Vier Fehlalarme, jeder erst an einem FREMDEN Shop gefunden

1. **Mengenrabatt** — der „Digitale Präzisions-Messschieber" hat Varianten `2 Stück`/`3 Stück`/
   `5 Stück`. Die Stückzahl erklärt den Preis vollständig.
2. **Zweite Option** — der „Rizinusöl-Wickel" unterscheidet `Bauchwickel` und `Set Bauch + Nacken`.
   Daraus die belastbare Regel: **mehr als eine Option = es variiert mehr als die Farbe.**
3. **Zusammengesetzte Farben** — `sandrot` und `rasengrün` **sind** Farben; meine Prüfung verlangte
   einen Wortanfang. **Die Wortgrenzen-Falle in umgekehrter Richtung: zu streng statt zu locker.**
4. **Der peinlichste:** die Streichpreis-Prüfung schlug auch bei `compare_at_price` **gleich** dem
   Preis oder **0.00** an. Gemessen: ankerkraut.de hat **269** Varianten mit gleichem Wert,
   purelei.de **559** mit 0.00 — **Shopify zeigt in beiden Fällen gar keinen durchgestrichenen
   Preis an.** Mit der alten Regel hätte das Gerät einer gepflegten Marke **158 Rechtsprobleme**
   gemeldet, die sie nicht hat.

**→ Die Regel, die daraus wurde: ein Befund muss etwas sein, das die Kundschaft tatsächlich zu
sehen bekommt.** Eine Kategorie fiel durch die Korrekturen von 80 auf 7 Befunde.

### Und daraus die Schweregrade

`nomadi.de` führt Markenware, die Varianten heissen `heritage black` und `Moon Black` — die
**offiziellen** Farbnamen von Bugaboo und Cybex. 69 davon als „Defekt" zu melden wäre falsch
gewesen. Seit dem 30.09. trennt das Gerät **Defekt** (objektiv falsch, für die Kundschaft sichtbar)
von **Hinweis** (einen Blick wert, kann eine gute Erklärung haben).

---

## 11. Womit bezahlt wird — GEMESSEN, und es war der nützlichste Fund

Das Repo hat **bereits** eine funktionierende Bezahl- und Lizenzschiene:
`functions/_pro.mjs` validiert **Lemon-Squeezy**-Lizenzschlüssel (Monat/Jahr), **fünf** Edge-
Funktionen benutzen sie schon (`ki-erwaehnung`, `hype-check`, `pro-validate`, `audit-report`,
`generate`), der Laden ist `abannews.lemonsqueezy.com`, Preisstufen CHF 19/39/49 in `produkte.html`.

**Es musste also keine Zahlung gebaut werden.** Modell: Zahlen und drei Belege je Fehlerart
**gratis**, die vollständige Liste hinter **aban Pro**.

**⛔ Der naheliegende Weg war der falsche, und das ist gemessen:** ein digitales Produkt im
bestehenden Shopify-Shop zu verkaufen geht **nicht** — `test-digital-products-connection` meldet,
dass die Digital-Products-App bei LuxeStyle **gar nicht installiert** ist. Und die Zielgruppe
passt nicht: Schweizer Tierbedarf-Kundschaft kauft kein Händler-Werkzeug.

---

## 12. Offen, und nur der User kann es

1. **Merge nach `main`** — Cloudflare Pages baut von `main`, vorher ist `/shop-check.html` nicht live.
2. **Preisentscheid**: volle Liste in aban Pro, oder Einzelkauf CHF 39.
3. **Ob überhaupt jemand angesprochen wird** — und wenn, dann **eingehend** (Community-Hilfe,
   Suche), nicht per Kaltakquise-Mail (§7).
4. Partner-Zugang: die 99-USD-Frage beim Anbieter selbst klären (§8).
