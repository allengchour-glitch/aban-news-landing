# Google-Kategorie fein — «Kleidung (allgemein)» → echte Unterkategorie (29.09.2026, Betreiber «google push?» · «noch mehr?»)

## GEMESSEN (Bulk-Export, 49'237 aktive Produkte)
- 7'254 Produkte bei Google nur als `Apparel & Accessories > Clothing` (Mäntel, Röcke, Hemden, Leggings, Bademode gemischt).
- Weitere grosse Blöcke: Shoes 5'385, Electronics 4'126, (leer) 3'120 — nächste Kandidaten.

## GETAN
`automation/google_kategorie_fein.py` (täglich im Aufseher): nur Werte GENAU «Clothing», Titelregeln nach Vorrang,
jeder Zielpfad gegen Googles Taxonomie (5'595 Pfade) geprüft, Kinder/Baby/Kostüm bleiben aussen vor, kein Treffer = grob.
**6'826 eingeordnet, 0 Fehler, 428 bleiben grob** (Handschuhe, Hüte, unklare Titel). Stichprobe 8/8 zurückgelesen.

| Unterkategorie | Anzahl |
|---|---:|
| Shirts & Tops | 3'747 |
| Pants | ~780 |
| Outerwear > Coats & Jackets | ~550 |
| Dresses | ~385 |
| Skirts (inkl. «Jupe») | ~290 |
| Jumpsuits & Rompers | ~270 |
| Vests | ~150 |
| Activewear · Underwear & Socks · Outfit Sets · Shorts · Swimwear · Scarves · Sleepwear · Suits | je 30–130 |

Fallen, im Trockenlauf gefunden und behoben: Kapuzen-**Schal** → Oberteil («kapuzen»), «4er-Set Socken» → Outfit-Set
(Reihenfolge), «im jungen Casual-Stil» als Kinderartikel ausgeschlossen («jungen»), Mehrzahl/Komposita («Hosen»,
«Damenjeans», «Sweatpants», «Spitzentop»), Schweizerdeutsch «Jupe» = Rock.
Ledger `dropship/_google_kategorie_fein.tsv` (Handle · alt · neu) → rückholbar.
