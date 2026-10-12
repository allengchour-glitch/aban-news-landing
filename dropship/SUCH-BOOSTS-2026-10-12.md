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

## Offen / Risiken

- **Treffer-Logik:** Nicht dokumentiert ist, ob ein Boost nur bei genau gleicher Suchanfrage greift (VERMUTUNG). Deshalb stehen die Varianten ausdrücklich in der Liste (kostüm/kostüme, tshirt männer/t-shirt männer …). Die Messung nach 15 Minuten zeigt es.
- **Gilt nur für die Enter-Suche:** Ob Boosts auch die Vorschlagsliste beim Tippen ändern, ist nicht belegt.
- **Der Index zieht mit Verzug nach.**
