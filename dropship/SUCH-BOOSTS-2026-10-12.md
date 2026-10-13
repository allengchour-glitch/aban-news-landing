# Such-Boosts — die richtige Ware oben in der Shop-Suche (12.10.2026)

## Befund (Workflow-Messrunde 12.10., Prüfer «Suche & Navigation»; selbst nachgemessen)

- **Wer sucht, kauft eher:** In den letzten 90 Tagen kamen 82 Sitzungen mit Suche zu 6,1 % in den Warenkorb, alle menschlichen Sitzungen nur zu 1,4 % (ShopifyQL `search_conversions` / `sessions`). Es sind aber nur ~2 Suchen pro Tag (165 Suchen, 119 Begriffe).
- **Echte Suchbegriffe, 90 Tage (GEMESSEN 21:45 UTC):** sommerkleid 9, ps5 games 5, katzen 4, games / solar helm / werkzeug / selbst gestalten / retro games / playstation je 3. Dazu ein Kostüm-Block mit rund 10 Suchen: kostüm, kostüm mit perücke, halloween kostüme, partner kostüm männer, nightwing costüm, cosplay, vampir, leatherface. Fast alle davon ohne Klick.
- **Die meisten Begriffe treffen schon gut** (sommerkleid 8/8 Sommerkleider, katzen, retro games, selbst gestalten, hängematte, kuscheldecke). **Schlecht waren:**
  - «halloween» und «halloween kostüme»: 0 von 8 ab Schweizer Lager. Alle 8 waren CJ-Masken und Pullover mit 10–20 Werktagen Lieferzeit.
  - «kostüm»: Platz 1–4 Zubehör (Handschuhe, Masken).
  - «geschenk für frau»: Platz 4 «Intim-Pflegeserum».
  - «powerbank»: nur 3 von 8 sind Powerbanks.
  - «tshirt männer»: nur 2 von 8 sind T-Shirts (Hemden vorn).
  - «staubsauger»: Platz 1 der Nagelstaubsauger.
  - «wichtelgeschenk»: eine Box für CHF 199.90 und ein Wollmantel.
  - «kerze»: Silikonformen.
  - «handwärmer»: Handschuhe vor den Handwärmern.
- **Der Hebel war ungenutzt.** Search & Discovery gleicht seine Produkt-Boosts mit dem Metafeld `shopify--discovery--product_search_boost.queries` ab. Typ list.single_line_text_field, Validierung `list.max = 10`, Admin `PUBLIC_READ_WRITE`. Die Zahl der gesetzten Werte (`metafieldsCount`) war **0** (GEMESSEN). Die Zeile «Boosts = Betreiber-Klick» im Bericht vom 05.10. ist damit widerlegt.

## Was gebaut ist

- **Regel `automation/data/such_boosts.json`:** 10 Begriffsfamilien, je höchstens 8 Produkte:
  - halloween (Anlass 31.10.)
  - kostueme
  - geschenk-frau und geschenk-mann
  - wichteln
  - powerbank
  - staubsauger
  - tshirt-herren
  - handwaermer
  - kerze
- **Quelle je Familie:** eine Kollektion in ihrer Reihenfolge, also z. B. die von der Bild-Jury kuratierten Geschenkwelten oder eine Bestseller-Sortierung, oder die Admin-Suche.
- **Titel-Muster:** Jede Familie hat Muster, die treffen müssen (`titel_ja`) und die nicht treffen dürfen (`titel_nein`).
- **Vielfalt:** Höchstens 2 Stück je Motiv, sonst wären es fünf Hexen nebeneinander.
- **Veto-Liste:** Begründete Ausnahmen aus der Sichtprüfung.
- **Skript `automation/such_boost.py`** (Selbsttest 16/16):
  - **Nur gute Ware:** aktiv, im Onlineshop, verfügbar, mindestens 2 Bilder. Gesperrt sind Intim/Erotik/Kosmetik, Klingen, Tabak und Duplikate. Die Gemini-Jury muss bestehen (durchgefallen = nicht geboostet).
  - **Anlass:** Nach dem Datum fällt die Familie weg. Kommt Direktversand nicht mehr rechtzeitig an, wird nur Ware ab Schweizer Lager geboostet (Lieferwerktage aus `data/anlass_kollektionen.json`).
  - **Fremde Begriffe bleiben stehen:** Das Skript schreibt nur die eigenen Begriffe. Was ein Mensch in der App gesetzt hat, bleibt erhalten (Stand-Datei `dropship/_such_boosts_stand.json`). Höchstens 10 Begriffe je Produkt.
  - **Rückweg:** Jede Änderung steht im Ledger `dropship/_such_boosts.tsv`, Rückweg über `metafieldsDelete`.
- **Wächter:**
  - Der Aufseher-Block SUCH-BOOSTS läuft täglich: Selbsttest → SCHARF → 15 Minuten warten → `--messen`.
  - Die Messung prüft die Enter-Suche je Familie und schreibt `dropship/SUCH-BOOSTS.md`.
  - Die Ampel `such_boosts()` meldet, wenn ein Begriff unter 6 von 8 Soll-Produkten liegt oder der Bericht älter als 2 Tage ist.
- **Neue Ware ohne Importer-Eingriff:** Der Lauf rechnet die Auswahl jeden Tag neu.

## Sichtprüfung (Kontaktbogen aller 73 Soll-Produkte)

11 Vetos, alle mit Grund in der Regeldatei:

| Grund | Anzahl |
|---|---|
| Verpackungsbild mit spanischem Herstellertext (Fyasa) | 1 |
| Englischer Werbetext im Hauptbild | 3 |
| Bild ≠ Titel (Akku-Hülle statt Powerbank, Polo statt T-Shirt, Smiley statt Streifen) | 3 |
| Collage aus zwei Bildern | 1 |
| Wikinger-Totenkopf-Print als erstes T-Shirt | 1 |
| Lieferanten-Wasserzeichen 1688.com | 1 |
| Fremdmarke auf der Verpackung | 1 |

## Was die Shopify-Hilfe sagt (QUELLE, help.shopify.com «Modifying search with Search & Discovery», gelesen 12.10. 22:40 UTC)

- «Changes to the metafield sync with the app's product boosts» — das Metafeld ist der offizielle Weg, auch für Flow und Apps (Matrixify nutzt dasselbe Feld).
- Bis zu 10 Begriffe je Produkt. Mehrwort-Begriffe sind erlaubt. Plural und häufige Tippfehler muss man **nicht** einzeln boosten, das übernimmt Shopify. Die Varianten in der Regel schaden nicht, sind aber überzählig.
- Boosts gelten nur für verfügbare Produkte und **nicht, wenn die Suchanfrage Suchsyntax enthält**. Shopify rät, nur wenige Produkte je Begriff zu boosten (bei uns ≤ 8).
- Wie lange es dauert, bis ein Boost wirkt, ist **nicht dokumentiert**.

## Erste Messung (12.10. 22:45 UTC, ~25 min nach dem Schreiben)

- Bei unserer IP (curl) sind «halloween» und «kostüm» Zeichen für Zeichen dieselben Seiten wie um 19:08: die bekannte veraltete Bot-Cache-Kopie.
- WebFetch (anderer Ausgang) zeigt bei «kostüm» ebenfalls noch die alte Reihenfolge, der Boost greift also noch nicht.
- Bei Begriffen, die vorher nie abgerufen wurden, stehen geboostete Produkte schon oben: «wichteln» 3/8 (Aroma-Diffuser, Sternzeichen-Anhänger, Kartenetui), «geschenk für frau» Platz 1 das geboostete Doppel-Armband.
- **Nachmessung 22:42 UTC (mit Cache-Brecher, ~55 min nach Lauf 1, ~20 min nach Lauf 2):** Die Boosts WIRKEN, aber verzögert. Oben stehen die Produkte aus Lauf 1, auch solche, die Lauf 2 per Veto wieder entfernt hatte:
  - «powerbank» Platz 1: die Akku-Hülle.
  - «staubsauger» Platz 1: der Sauger mit englischem Text.
  - «tshirt männer» Platz 2: das Totenkopf-Shirt.
  - Weitere Treffer: «geschenk für ihn» 6/8, «geschenk für mann» 5/8, «handwärmer» 4/6, «kerze» 3/4, «halloween» Platz 1 die Hexe aus dem Schweizer Lager.
  - «kostüm» noch 0/8, weil der Index noch nachzieht.
- **Lehre:** Der Such-Index übernimmt Metafeld-Änderungen erst nach mehr als 30 Minuten. Der Aufseher misst deshalb 60 Minuten nach dem Schreiben (vorher 15). Wer Vetos setzt, sieht die alte Wahl noch eine Weile in der Suche.

## Durchbruch: Metafeld allein indexiert nicht neu (13.10. 00:15–01:20 UTC)

- **Messung 90 min nach dem Schreiben (23:40 UTC):** Oben standen nur geboostete Produkte, die zusätzlich anders geändert worden waren, etwa die von der Geschenk-Welt getaggten («geschenk für ihn» 6/8). Kostüme ohne andere Änderung standen bei 0/8. Per Veto entfernte Produkte (Akku-Hülle) blieben auf Platz 1.
- **Schluss:** Ein reines `metafieldsSet` stösst die Such-Indexierung des Produkts nicht an. Die App übernimmt den Boost zwar, die Suche sieht ihn aber erst nach der nächsten echten Produktänderung.
- **Fix in `such_boost.py`:** Jedes geboostete Produkt bekommt den Tag `such-boost`. Fällt es aus dem Boost, wird der Tag entfernt; nie markierte Produkte bekommen Setzen + Entfernen als Anstoss. 74 Produkte plus 34 alte Entfernungen nachgestossen.
- **Messung 45 min nach dem Anstoss:**
  - «halloween» 8/8 (alles Kostüme ab Schweizer Lager), «halloween kostüm» 8/8
  - «kostüm» 8/8, «kostüme» 8/8
  - «geschenk für mann/ihn» 8/8, «geschenk für frau/sie» 7/8
  - «wichteln» 8/8, «wichtelgeschenk» 8/8
  - «powerbank» 7/8
  - «staubsauger» 8/8, «handstaubsauger» 8/8
  - «tshirt männer» 8/8
  - «handwärmer» 6/6, «kerze» 4/4
  - **Ampel: 0 Begriffe unter 6/8.**
- **Zwei Messfehler behoben:**
  - Die Messung rechnete die Auswahl neu, eine neue Jury-Runde wählte bei «powerbank» andere Produkte (Schein-0/8). Sie misst jetzt gegen die Stand-Datei, also gegen das tatsächlich Gesetzte.
  - Eine leere Seite war ein Abruf-Aussetzer. Jetzt gibt es 3 Versuche.
- **Allgemeine Lehre:** Wer per Metafeld etwas an der Storefront ändern will (Suche, Filter), muss prüfen, ob die Änderung ohne Produkt-Update überhaupt ankommt. Gemessen wird an der Live-Seite mit Cache-Brecher.

## Offen / Risiken

- **Treffer-Logik:** Nicht dokumentiert ist, ob ein Boost nur bei genau gleicher Suchanfrage greift (VERMUTUNG). Deshalb stehen die Varianten ausdrücklich in der Liste (kostüm/kostüme, tshirt männer/t-shirt männer …). Die Messung nach 15 Minuten zeigt es.
- **Gilt nur für die Enter-Suche:** Ob Boosts auch die Vorschlagsliste beim Tippen ändern, ist nicht belegt.
- **Der Index zieht mit Verzug nach.**
