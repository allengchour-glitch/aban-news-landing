# Draft-Ersatz — Entwürfe, die bei Google noch ranken (05.10.2026, ~09:15–09:45 UTC)

Bereich «draft-ersatz» (Betreiber «fix mal weiter semrush»). Semrush-Einheiten: **0** (nur CSVs vom 02.10.).
Ledger mit Altwerten: `dropship/semrush/_draft_ersatz_2026-10-05.tsv` (20 Zeilen + Kopf: 4 redirect-umgestellt, 4 produkt-seo-titel,
4 produkt-seo-meta, 3 cj-suchauftrag, 5 belassen).

## Gemessen (Admin-GraphQL über `kaufwille_zeile.gql`)
- DRAFT-Ranking-URLs aus `SEITE2-HEBEN-2026-10-05.md`, deren 301 auf eine **Kollektion** zeigt: **11** (Casio, Katzenklo-Möbel,
  Wasserkanister, Pool-Liege, Plüsch-Löwe, Eisseide-Kissen, Polaroid, Kuppelzelt, Clinique, Givenchy, Corduroy) + der
  Sternenhimmel-Projektor «Nova» aus der Kannibalisierungs-Runde = 12. Alle 12: `status DRAFT`, je genau 1 Redirect.
- Je Begriff Shop-Suche `status:active <wort>` (3–7 Suchwörter je Fall) + Kontaktbogen der Hauptbilder (Vision) + Beschreibung + Varianten
  (`availableForSale`, `onlineStoreUrl`, Ziel-Pfad selbst ohne Redirect, kein POD-Tag).
- Bildbefunde an den Entwürfen: Kuppelzelt-Entwurf 823809 zeigt als Hauptbild eine **Zeltleinen-Spannerin** (falsches Bild); der
  «Corduroy Rucksack» 633000 ist laut Bild und Varianten eine **Schultasche/Lunch-Bag**; Katzenklo-Möbel und Polaroid ohne ladbares Bild.

## (a) Gleichwertiges Produkt aktiv → Redirect umgestellt + SEO (beide Felder, ≤ 60 / ≤ 155 Zeichen inkl. Marke)
| Begriff (Vol/Platz) | Entwurf → vorher | jetzt → Produkt | SEO-Titel neu |
|---|---|---|---|
| löwe plüschtier (170/38) | plusch-lowe-27-cm-fga49507 → /collections/spielzeug-pluesch | kleiner-pluschlowe-fga86866 (Unitoys-Löwe wie der Entwurf, CHF 35.90 statt 33.50, 1/1 kaufbar) | Löwe Plüschtier – kleiner Plüschlöwe in Braun \| LuxeStyle (57) |
| eisseide (140/26) | langes-kissen-aus-eisseide-kuhlend-629200 → /collections/kissen-wohntextilien | atmungsaktives-cartoon-eisseidenkissen-fur-den-612400 (Dekokissen aus Eisseide, CHF 14.90 statt 15.90) | Eisseide-Kissen mit Cartoon-Motiv, atmungsaktiv \| LuxeStyle (59) |
| kuppelzelt (110/36) | polyester-kuppelzelt-fur-camping-823809 → /collections/camping-schlafen | faltbares-regenfestes-2-personen-zelt-629700 (Bild: Kuppelzelt mit gekreuzten Stangen, CHF 134.90) | Kuppelzelt für 2 Personen – regenfest & faltbar \| LuxeStyle (59) |
| liege lounge (110/31) | aufblasbare-pool-liege-lounge-xl → /collections/pool (Bestand seit Juli) | aufblasbare-wasserliege-fur-pool-und-see-629800 (Luftliege mit Kopfteil, CHF 43.90) | Aufblasbare Lounge-Liege für Pool und See \| LuxeStyle (53) |

- Metas ohne Zahlen aus Beschreibungstexten (alle 4 Ziele haben genau 1 Variante; Farben aus Beschreibung NICHT genannt, weil nur 1 Variante;
  «Vier-Jahreszeiten» beim Zelt weggelassen = Lieferantenbehauptung). Altwerte im Ledger.
- Schreiben: `urlRedirectUpdate` + `productUpdate(seo{title,description})`, 0 userErrors. **Admin-Rücklesen 4/4** (Ziel + SEO identisch).
- **WebFetch live 4/4:** jeder alte Entwurfs-Pfad lädt das neue Produkt mit neuem `<title>`, Preis und «In den Warenkorb legen».
- Pool-Liege stand in `_google_nachfrage_luecke.tsv` als «saison-später» (inflatable pool lounger, April) — der Auftrag ist damit hinfällig, solange 629800 aktiv ist.

## (b) Kein gleichwertiges Produkt → CJ-Suchauftrag VORNE in `automation/cj_search_queue.txt`
Eingefügt mit `queue_vorne()` aus `google_nachfrage_luecke.py` (nach dem Kopfkommentar, vor den Advent-Aufträgen; der Runner nimmt die ersten 4):
- `search:cat litter box furniture` — katzenklo möbel 320/Mt, Platz 26. Im Shop nur Katzentoiletten und ein Wand-Klo, kein Schrank. Der Entwurf
  war `cj-nicht-versendbar-ch` (EU-Lager) → ein Treffer muss eine CH-Versandoption haben (Wache `cj_versand_ch_guard`).
- `search:collapsible water container with tap` — camping wasserkanister 210/Mt, Platz 34. Kein Kanister aktiv (Suchtreffer nur Luftbefeuchter/Kunstblut).
- `search:corduroy backpack` — corduroy rucksack 90/Mt, Platz 28. Aktiv nur eine Corduroy-Bauchtasche (624000).
- **Nach dem Import:** Ledger-Zeilen `cj-suchauftrag` nennen die Redirect-ID und das heutige Kollektionsziel → Redirect auf das neue ACTIVE+kaufbare
  Produkt umstellen (Bild prüfen, CJ-Textsuche streut), dann SEO-Titel/Meta auf den Begriff, Zahlen aus Varianten.

## Belassen (begründet)
- **Casio illuminator** (320/21) → herren-uhren, **Polaroid sonnenbrille damen** (140/36) → sonnenbrillen-alle, **dramatically/Clinique** (110/37) → hautpflege,
  **Givenchy Pi** (110/38) → parfum-duefte: Markenware → keine Markensuche bei CJ; ein No-Name-Produkt ist kein gleichwertiger Ersatz (Polaroid 48.90 vs.
  no-name 15.90). Clinique zusätzlich Kosmetik zum Auftragen. `sonnenbrillen-damen` wäre spezifischer, ist aber selbst ein Redirect (→ sonnenbrillen-alle)
  und hat eine Fehlregel (zieht Schmetterlings-Broschen/Kissen) — nicht als Ziel genutzt. Alle 4 Kollektionsziele: kein Redirect auf dem Pfad (gemessen).
- **Sternenhimmel-Projektor «Nova»** → sub-beleuchtung: «lampe mit sternenhimmel» rankt mit der Kollektion besser (43) als mit dem Produkt (48), die
  Kollektion trägt den Begriff seit heute im Text; aktiver Zwilling «Cosmos» 240961 existiert, aber die Bündelung auf die Kollektion bleibt.

## Kannibalisierung — live gegengeprüft (7 Fälle aus `_kannibalisierung_2026-10-05.tsv` / `POSITIONEN.md`)
| Begriff | rankende Seite | Zielseite | Befund live |
|---|---|---|---|
| beige jumpsuit | 624900 ACTIVE 48/48, SEO «Beige Jumpsuit, ärmellos mit V-Ausschnitt» | 604500 ACTIVE 18/18, «Eleganter ärmelloser Jumpsuit mit V-Ausschnitt» (58) | Titel verschieden ✓ |
| oranger overall | 602100 ACTIVE 96/96, «Oranger Overall mit langen Ärmeln» | 610000 ACTIVE 4/4, «Oranger Jumpsuit mit V-Ausschnitt» | ✓ |
| schminkpinsel set | 776704 ACTIVE 1/1, «Schminkpinsel-Set, 10 Stück» | 873408 ACTIVE 1/1, «Make-up-Pinsel-Set für präzises Auftragen» | ✓ |
| stahlkappen | 695168 ACTIVE 24/24, «Stahlkappenschuhe – sicherer Arbeitsschuh» (53) | 636600 ACTIVE 9/9, «Sicherheitsschuhe mit Stahlkappe» | ✓ |
| fitness tracker ring | 606100 ACTIVE 4/4, «Fitness Ring Smart mit Gesundheits-Tracking» (55) | 614500 ACTIVE 21/21, «Smart Ring mit Fitness- und Gesundheits-Tracking» (60 = Grenze) | ✓ |
| auto tracker | gps-auto-tracker-a3b10f DRAFT → 301 /products/fahrzeug-tracker-604900 | 604900 ACTIVE 1/1, online, Pfad ohne Redirect | Ziel kaufbar ✓ |
| lampe mit sternenhimmel | /collections/beleuchtung-lampen → 301 sub-beleuchtung | Nova DRAFT → 301 /collections/sub-beleuchtung | sub-beleuchtung ohne Redirect, 9 Publikationen ✓ |
Kein Eingriff nötig. Alle 5 Doppelpaare ACTIVE, online, ohne POD-Tag, keine Redirects auf den Pfaden.

## Offen
- 3 CJ-Aufträge warten auf den Queue-Runner; Redirects danach umstellen (Ledger).
- Produkttyp falsch an zwei Zielen: 629800 Wasserliege = «Aufbewahrung & Organizer», ebenso Sofa-Bezug 616900 (anderer Bereich).
- Entwurf 823809 trägt ein falsches Hauptbild (Zeltleinen-Spanner) — bleibt Entwurf, nur Notiz.
- `sonnenbrillen-damen`: Smart-Regel «schmetterling»/«oversized» zieht Fremdware; Kollektion selbst wegeleitet (anderer Bereich).
- Wirkung erst messbar, wenn Google neu crawlt; Semrush-Konto ist leer (README 09:30) → Nachmessung nur über Positions-Kampagne/eigenen Tracker.
