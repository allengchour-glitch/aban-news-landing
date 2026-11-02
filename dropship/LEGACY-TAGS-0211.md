# Alte Tag-Sammlungen: Fremdprodukte entfernt (2.11.2026)

Auftrag Besitzer: «ja neue regel umstellen» (nach der Kategorien-Prüfung, `POD-BILDER-0211.md`).

## Befund (GEMESSEN, frischer Katalog 56 529 Produkte, 706 Menü-Sammlungen)
101 Menü-Sammlungen hängen noch an alten Tags (`kat-*`, `beauty`+`hautpflege`, `spielzeug`, …) oder Titelregeln. Der Vergleich mit den neuen `sort-`-Sammlungen zeigt: die meisten sind **bewusst breite Eltern-Listen** (z. B. `damen-schuhe` 2 220 Produkte gegen `sort-damen-sandalen` 1 044, `fur-ihn`, `beauty-pflege`) oder Marketing-Listen (`geschenkwelt-*`, `ch-lager`, `premium`, `weihnachten`). Sie pauschal auf eine `sort-`-Regel umzustellen würde sie auf ein Unterthema schrumpfen und die Menü-Eltern leeren. **Darum nicht pauschal umgestellt, sondern die Fremdprodukte gezielt aus den alten Tags genommen.**

## Geändert (LIVE, `tagsRemove`, 104 Produkte; frisch gelesen: bei allen 104 Tag weg)
| Sammlung | Tag | entfernt | Was |
|---|---|---|---|
| `sub-taschen` | `kat-taschen` | 16 | Kleidung mit Taschen (Cardigan «Plüschtaschen», Taschenhemd, Jumpsuit …) |
| `hautpflege-skincare` | `hautpflege` | 36 | Stoff-/Sportmasken (UV-, Sturmhauben-, Trainingsmasken) |
| `jacken-outdoor` | `kat-jacke-outdoor` | 3 | 2 Haustier-Jacken, 1 Wandhalterung |
| `sub-aroma-diffuser` | `kat-aroma` | 6 | Bento-Box, Vorratsglas «aromadicht», Auto-Lufterfrischer/-Luftbefeuchter, Duschkopf |
| `sub-deko` | `kat-deko` | 3 | Waschbeckenarmatur, 2 Schlüsselanhänger |
| `spielzeug` | `spielzeug` | 40 | Haustier-Spielzeug und -Kleidung (Google-Bereich Tiere) |
Gegenproben vor dem Schreiben: bekannt richtige Treffer (Rucksack, Handtasche, Hyaluron, Winterjacke, Aroma Diffuser) wurden 0-mal getroffen. Skripte, Plan mit allen Produkt-IDs und Titeln in `dropship/legacy-tags-0211/`.

## Grenzen / unbekannt
- Der Sammlungs-Zähler (`productsCount`) bewegte sich auch nach 3 Minuten nicht; die Storefront-Seite von `sub-aroma-diffuser` (287 Produkte, ganz gelesen) zeigt keinen der Fremdartikel mehr, `jacken-outdoor` nur die ersten 250 von 693 geprüft.
- Die alten Tags können beim nächsten Import/Autopilot-Lauf wieder gesetzt werden (Ursache der Tag-Vergabe nicht untersucht); dann Skript `fix_legacy.mjs` wiederholen.
- Nicht angefasst: `kissen-wohntextilien` (Nackenkissen, Stillkissen sind echte Kissen), `werkzeug-maschinen` (Motorrad-Werkzeug ist Werkzeug), `handy-zubehoer` (76 Randfälle, Urteil offen), Marketing-Listen.
