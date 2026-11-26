# Produktdaten-Mängel 24.11.: Titel-Wahrheit erledigt (26.11.2026)

Grundlage: `PRODUKTDATEN-MAENGEL.md` (25 Zeilen). Je Produkt live gelesen (Admin GraphQL), Bilder angesehen, CJ-Datenblatt gelesen (`cj_fakten_block.mjs`, `KEIN_LLM=1`). Skill `titel-wahrheit`.
Ablauf: Trockenlauf → Sicherung und Plan committet und gepusht (`da6293272`) → LIVE 26.11. 21:18 UTC → je Produkt frisch zurückgelesen (11 von 11 GLEICH) → zweiter Trockenlauf 11× «schon im Soll» → Shop-Seiten 11 von 11 HTTP 200, H1 und `<title>` neu.
Werkzeug, Plan mit Beleg je Titel, Sicherung, Protokolle: `titel-wahrheit/`. Rücknahme: `ZURUECK=1 LIVE=1 NODE_USE_ENV_PROXY=1 node dropship/startseite-saison-2411/titel-wahrheit/titel_wahrheit.mjs` (Repo-Wurzel). Handles (Adressen) unverändert.

## A. Titel korrigiert (11)

SEO-Titel mitgezogen (wiederholte den Fehler überall). SEO-Beschreibung nur dort ersetzt, wo sie den Fehler wiederholte; bei Uhr und Geldbörse unverändert. Ein SEO-Titel gleich dem Produkttitel liest Shopify als `null` zurück (gewollt).

| Produkt (Handle) | alt → neu | Beleg |
|---|---|---|
| `weihnachtskranz-turkranz-girlande-aus-holz-618900` | Weihnachtskranz – Türkranz Girlande aus Holz → **Weihnachts-Türkranz mit roten Blüten und Laterne** | CJ-Varianten nur «Red Flower Storm Lantern 43/50 cm»; Bild: Kunsttannen-Kranz, kein Holz sichtbar. «aus Holz» gestrichen, kein neues Materialwort |
| `damen-kapuzenpullover-mit-weihnachtsmotiv-626900` | Damen-Kapuzenpullover mit Weihnachtsmotiv → **Damen-Rundhalspullover mit Weihnachtsmotiv** | alle Bilder Rundhals, keine Kapuze; CJ «Style: Pullover» («Hoodie» = 卫衣-Übersetzung) |
| `keramik-weihnachtsmann-spardose-632500` | Keramik Weihnachtsmann Spardose → **Keramik-Weihnachtsmann-Dose mit Deckel** | CJ «Storage Tank», Variante «Christmas Storage Tank»; Bild: Kopf = Deckel, kein Schlitz. Packliste «Savings Bank» widerspricht, Bild entscheidet |
| `kapuzenpullover-mit-weihnachtsmuster-fur-damen-612600` | Kapuzenpullover mit Weihnachtsmuster für Damen → **Damen-Rundhalspullover mit Tiermotiv, locker geschnitten** | alle 12 Bilder Rundhals; Motiv Hase/Rotkehlchen, ein Fuchs; CJ «Loose fit», Packliste «Sweatshirt» |
| `selbstgemachte-christbaumschmuck-set-617500` | DIY Christbaumschmuck-Set, Häkelbaum → **Häkel-Materialpaket: Weihnachtsbaum zum Selbermachen** | CJ «DIY Material Package», Packliste «1* DIY Material Package»; Bilder zeigen fertige Bäume, darum steht «Materialpaket» jetzt im Titel |
| `weihnachtsornamente-aus-stroh-elch-eichhornche-613600` | Weihnachtsornamente aus Stroh – Elch, Eichhörnchen, Reh → **Weihnachtsfigur aus Stroh – Fuchs, Eichhörnchen oder Reh** | CJ-Varianten Fox/Squirrel/Deer, kein Elch; Packliste 1 Stück; Bild: stehende Figuren |
| `plusch-hausschuh-fur-herren-flache-sohle-627700` | Plüsch Hausschuh für Herren – flache Sohle → **Plüsch-Hausschuhe mit Bärenmotiv, flache Sohle, Gr. 36–45** | Grössen 36/37 (passt 35/36) bis 44/45, 1 Paar, Bärenkopf im Bild; «für Herren» gestrichen |
| `automatische-skelett-damenuhr-c466ca` | Automatische Skelett-Damenuhr → **Damenuhr in Skelett-Optik, 35,5 mm** | CJ-Name «automatic … mechanical» gegen CJ-Feld «Movement type: Quartz»: Uhrwerk unbekannt, «Automatische» gestrichen; 35,5 mm aus CJ |
| `bar-set-mit-golddraht-glas-626600` | Bar-Set mit Golddraht-Glas → **Karaffe und Gläser mit Golddraht-Dekor, einzeln oder als Set** | CJ-Packliste je Variante: Karaffe / 2 Gläser / Karaffe + 2 Gläser; «ab CHF 81.90» ist eine Einzelvariante |
| `vintage-crazy-horse-leder-handtasche-262656` | Vintage Crazy Horse Leder Handtasche → **Vintage-Reisetasche aus geprägtem Crazy-Horse-Leder** | Bild: Weekender 52 × 27 × 26 cm; CJ 36–55 l, «genuine leather, first layer cowhide», «Embossed Crazy Horse» |
| `handtasche-aus-echtem-leder-clutch-605900` | Handtasche aus echtem Leder – Clutch → **Lange Damen-Geldbörse aus echtem Leder mit Überschlag** | Bild: lange Überschlag-Börse mit Kartenfächern; CJ 100 g, «Multiple card slots», «First-layer cowhide» |

## B. Titel stimmt, nicht geändert (5)

| Produkt | Warum der Titel bleibt | Offener Mangel (nicht Titel) |
|---|---|---|
| `usb-musik-stern-mit-weihnachtslicht-609100` Schneekugel-Laterne | Bilder zeigen Schneekugel-Laternen; CJ-Material «Plastic resin, water» belegt die Flüssigkeit | Text «88 × 15 cm» (CJ-Wert, unplausibel); Variante «Alter Panda Kissen» (CJ «old man holding bear»); Flüssigkeit im Versand ungeklärt |
| `alpaka-fleece-set-hut-schal-handschuhe-651600` | CJ-Packliste «Hat + scarf + gloves», Galeriebilder 2 ff. zeigen das Set | Hauptbild zeigt nur die Mütze (Bild nach vorn tauschen) |
| `kariertes-fleecehemd-fur-herren-650000` | CJ «Fleece-lined Men's … Shirt», «thickening» | Themen-Fit Winter, KI-Modellbilder (nur Startseite) |
| `kristall-whiskyglas-luxus-design-613200` | Bilder: Tumbler; CJ-Name «Crystal Whiskey Wine Glass», Material «Crystal» | Fliesstext «Geliefert wird ein Kristall-Weinglas» (Übersetzung von 酒杯) ist falsch |
| `aroma-diffusor-aus-holz-3b7c22` | CJ-Name «Wood aroma diffuser», Holzsockel im Bild | Fliesstext (1 l Tank, Vasenform, mechanisch) passt nicht zum Glaskolben-Vernebler im Bild; Produkttyp «Werkzeug & Heimwerken» |

## C. Uhren mit fremdem Logo: nicht umbenannt, Entscheid beim Besitzer (4)

| Produkt | Logo | Zusätzlich |
|---|---|---|
| `premium-damenuhr-aus-edelstahl-mit-saphirglas-094208` | OLEVS | – |
| `quarzuhr-fur-damen-mit-farbverlauf-a9cdbd` | Kimio | – |
| `quadratische-mechanische-herrenarmbanduhr-622900` | Chenxi | Gehäuse erinnert an Luxus-Replika |
| `personalisierbare-armbanduhr-fur-damen-736896` | Schriftzug (wohl «Scottie») | **Titel «Personalisierbare» ist ebenfalls unbelegt** (CJ «Personalized» = 个性, keine Gravur im Datenblatt); nach Vorgabe nicht umbenannt. Variante «weiß Noodles» |

## D. Nur Bild oder Einblendung (5), nichts geändert

| Produkt | Mangel |
|---|---|
| `glasierte-weihnachtsbaum-ornamente-634900` | alle Bilder unter 500 px (Tag `bild-zu-klein`); Variantennamen «5Er Set Mit Lichtern Gold» |
| `weihnachtsornament-cartoon-rot-canin-618600` | Hauptbild mit Bearbeitungsspuren (gestreckter Streifen, verwischte Stelle) |
| `weihnachtskugeln-antik-8-cm-12-stuck-623200` | englische Einblendung «8CM 12PCS» auf dem Hauptbild |
| `wollschal-fur-winter-einfarbig-630800` | Spiegel-Selfie, Produkt kaum erkennbar |
| `retro-postmann-umhangetasche-626400` | Hauptbild nur Seitenansicht |

## Folgearbeit (nicht in diesem Auftrag, ungemessen)

- **Fliesstexte nennen bei 10 der 11 Produkte noch die alte Behauptung** (Stand vor dem Lauf gelesen): «Dieser Kapuzenpullover» (626900, 612600), «Spardose» (632500), «mit Elch» und «10 cm Durchmesser» (613600), «Hausschuh für Herren» (627700), «aus Holz gefertigt / Material: Holz» (618900), «hohle mechanische Uhrwerk» (c466ca), «Das Set enthält» für alle Varianten (626600), «Diese robuste Handtasche» (262656), «Die Clutch» und englische Farbnamen (605900). Nach Skill-Reihenfolge Titel → Text der nächste Schritt.
- **Bilder:** Kranz-Hauptbild zeigt den Lastwagen-Kranz, geliefert wird laut CJ nur der Kranz mit roten Blüten und Laterne (Galerie mit 6 Modellen); Alpaka-Hauptbild nur Mütze.
- **Varianten-/Kategorie-Daten:** Bar-Set-Varianten «Goldfaden Topfstecker» / «Golddraht Weinglas» (gemeint: Karaffe mit Stopfen / 2 Gläser); Pullover 626900 Farben «1291», «FLRYL40»; Hausschuh trägt Produkttyp «Spielzeug & Spiele» und Spielzeug-Tags; Kategorie-Tags nach Titeländerung neu rechnen (Skill `kategorien-nach-google`).
- **Ledger:** `dropship/kategorien_ledger.txt` gibt es auf diesem Zweig nicht; die 11 Einträge `titel <handle>` stehen in `titel-wahrheit/live.txt`.
- Google sieht die neuen Titel erst nach dem nächsten Feed-Lauf bzw. Crawl.
