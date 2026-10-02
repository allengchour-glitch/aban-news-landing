# Filter auf den Kollektionsseiten: Farbe, Grösse, Kategorie, Produkttyp (02.10.2026)

Betreiber: «feinkategorie filter verbessern?»

## GEMESSEN (Live-Seiten + Admin-API)
| Befund | Zahl |
|---|---|
| Facetten auf /collections/gadgets, beauty-pflege, sub-kleider | Produkttyp · Anbieter (im Theme ausgeblendet) · Verfügbarkeit · Preis · «Farbe» |
| Quelle der Facette «Farbe» | Produktoption **«Farbe & Grösse»**, die nur **8 Produkte** tragen (Param `filter.v.option.farbe & grösse`) |
| Werte von «Farbe» auf sub-kleider (3'160 Kleider, 50 der ersten 100 mit Option «Farbe») | 4: «Gelb», «Gelb-0XL», «Gelb-1XL», «Gelb-2XL» |
| Grössen- oder Kategorie-Facette | keine |
| Produkte mit Option «Farbe» / «Grösse» | 14'767 / 16'510 |
| Verschiedene Rohwerte der Option «Farbe» | **35'545**; die 30 häufigsten decken 43 % |
| Verschiedene Produkttypen (aktiv) | **151**: «Gadget» 912 + «Gadgets» 488, «Beauty Tools»/«Beauty-Tool»/«Beauty-Tools», «Küche»/«Küche & Haushalt»/«Küchenhelfer» … |
| color-pattern-Metaobjekte vorher | 21 Stück, doppelt angelegt, teils falsch verknüpft (Gold → Taxonomie «Gray», Weiss → «Rose gold») |
| Smart-Kollektionen mit TYPE-Regel | 17 (u. a. spielzeug-* mit UND-Anker «Spielzeug», beauty-selfcare mit 6 Typen) |

Die Filter selbst lassen sich NUR in der App Search & Discovery einstellen. Dafür gibt es keine API (shopify.dev:
«filters need to be created in the Shopify admin»).

## GETAN
1. **Produkttyp entdoppelt:** `automation/produkttyp_vereinheitlichen.py`. 49 Abbildungen (Dubletten und Einzelstücke → bestehender Haupttyp). **2'620 Produkte** umgelegt, Entwürfe eingeschlossen.
   - Sperre: Eine Abbildung wird verweigert, wenn ein Produkt dadurch aus einer der 17 TYPE-Regel-Kollektionen fiele (ODER-Liste kennt alt, aber nicht neu / UND-Anker / NOT_EQUALS). Ergebnis: 0 gesperrt, weil die Karte so gebaut ist.
   - Editor/POD bleibt unberührt: 31 «Tasche»-Produkte.
   - Gemischte Sammeltypen wie «Haushalt & Wohnen» (Partybecher neben Tischleuchte), «Trend-Produkt» und «Kinder» bleiben bewusst stehen.
   - Ledger `_produkttyp_ledger.tsv`, Rückweg `--zurueck`. Der Lauf ist täglich im Aufseher, weil die Importer die Dubletten neu erzeugen.
   - `kategorie_wache.py` kennt jetzt auch «Sonnenbrillen» und «Hüte & Caps».
2. **Genormtes Farbfeld:** `automation/farbmuster_filter.py`. 19 eigene Grundfarben (`lux-farbe-*`) mit Farbpunkt, verknüpft mit Shopifys Taxonomie-Farbwerten (gemessen an aa-1-4).
   - Rohwert → Grundfarbe per Wortliste mit Vorrang: Roségold vor Gold, Rosarot = Pink, Weinrot = Rot, «Rotation» und «Rose Print» = keine Farbe. Selbsttest 19/19.
   - Je Produkt die Vereinigung aller Farbwerte. Gesetzt wird nur dort, wo das Feld leer ist oder von uns stammt.
   - **13'435 Produkte** (alle zurückgelesen). Ausgelassen: 1'087 Farb-Optionen ohne Farbwort («Muster 2», «Set 1», «Farbton 3») und 421 Produkte, deren Kategorie nicht in der Bedingungsliste des Felds steht.
   - Läuft täglich im Aufseher für Neuimporte.
3. **Betreiber-Klick** (`COWORK-BEFEHL.md`, oberster Block, ~5 Min): Filter «Farbe» (Quelle «Farbe & Grösse») löschen. Danach hinzufügen: Farbe aus dem Kategorie-Metafeld (Farbfelder), Grösse aus der Option «Grösse», Kategorie aus der Produktkategorie. Anbieter entfernen.

## Fallen (teuer gelernt)
- **`shopify.color-pattern` ist an die Kategorie gebunden.** Gesetzt werden kann es nur, wenn die Produktkategorie ein Taxonomie-Merkmal «Color» hat. Sonst meldet Shopify «Owner subtype does not match the metafield definition's constraints», und `metafieldsSet` verwirft die GANZE 25er-Charge. Deshalb wird vorher gefiltert (76 Kategorien mit Farbmerkmal).
- **Ein color-pattern-Metaobjekt braucht «Base pattern»** (`pattern_taxonomy_reference`, hier Solid 2874 bzw. Rainbow 24502). Die Fähigkeit `publishable` gibt es für diesen Typ nicht.
- `metafieldsSet` liefert `owner{… on Product{id}}`, nicht `ownerId`. Der falsche Feldname liess den ersten Lauf in die Wiederholungsschleife laufen.
- Eine Facette heisst im HTML wie ihre QUELLE (`filter.v.option.farbe & grösse`), nicht wie ihre Beschriftung («Farbe»). Wer nur die Beschriftung sieht, hält den Filter für vorhanden.

## OFFEN
- Betreiber-Klick in Search & Discovery (siehe oben). Danach messe ich 5 Kollektionen nach: Werte und Treffer je Farbe/Grösse.
- 34'932 aktive Produkte ohne Farb-Option, z. B. Schmuck oder Uhren in einer Farbe. Das Farbwort im Titel wäre eine zweite Quelle (Muster in `farbe_metafeld.py`, Wortgrenzen). Erst nach dem Klick, wenn die Facette sichtbar ist.
- Kollektionen mit > 5'000 Produkten zeigen bei Shopify grundsätzlich keine Filter. Dort bleiben die Tag-Chips.

## NACHGEMESSEN 02.10. ~21:00 UTC (nach dem Betreiber-Klick, 4 Live-Seiten)
- **Farbe ✅:** Quelle jetzt `filter.v.t.shopify.color-pattern`. Die Werte sind Farbfelder mit deutschen Namen (Beige, Blau …). sub-kleider zeigt 19 Farben (vorher 4 «Gelb»-Werte), gadgets 18, beauty-pflege 16, uhren 10.
- **Grösse ✅:** `filter.v.option.grösse`, sub-kleider 49 Werte. Darunter ist Lieferanten-Kauderwelsch in Grössenwerten: beauty-pflege «L Code-Need To Order Without Toolkit».
- **Kategorie ❌:** Auf keiner der 4 Seiten gibt es eine Kategorie-Facette. Schritt 5 ist nicht gespeichert oder heisst in der App anders.
- **Anbieter:** Der Filter existiert noch (`filter.p.vendor`), ist im Theme aber ausgeblendet.
- **Endstand ~21:20 UTC (sub-kleider, gadgets, uhren):** Verfügbarkeit · Preis · Produkttyp · Farbe · Grösse. Alle Beschriftungen sind deutsch. Der Anbieter-Filter ist entfernt. Einen Kategorie-Filter bietet die App nicht an, er entfällt.
