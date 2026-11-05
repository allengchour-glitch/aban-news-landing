# Echtfell-Produkte auf Entwurf gesetzt (04.11.2026)

Auslöser: Der Besitzer schickte den TikTok-Beitrag «Kuscheldecke Hasenfell-Imitat Tie-Dye» mit «nimm das raus» und danach «oder kein hasenfell». Auslegung (meine, nicht bestätigt): keine echten Pelzprodukte im Shop; das Video selbst kann nur der Besitzer oder PC-Claude löschen (`dropship/BROWSER-BEFEHL-TIKTOK-LOESCHEN-0411.md`).

## Was geändert wurde (GEMESSEN: Status vorher ACTIVE, nachher frisch gelesen DRAFT)
Nur der Status, sonst nichts (Titel, Preise, Varianten, Bilder unverändert, Bestand 0 und nicht getrackt):

| Produkt | ID | Grund (aus dem eigenen Produkttext) |
|---|---|---|
| `wasserdichte-madchen-stiefel-mit-echtem-hasenf-626600` | 15454094393729 | «mit echtem Hasenfell gefüttert» |
| `warmer-schal-aus-fuchsfell-und-rexkaninchenfel-627600` | 15447889969537 | «Gefertigt aus Fuchsfell und Rexkaninchenfell» |
| `warme-winterhandschuhe-mit-fuchsfell-manschett-614000` | 15447921066369 | «Luxuriöse Fuchsfell-Manschette» (Fuchs, nicht Hase: bewusst mit aufgenommen) |

Dazu Rechtslage als Einschätzung (nicht juristisch geprüft): in der Schweiz müssen Pelzprodukte mit Tierart, Herkunft und Gewinnungsart deklariert sein (Pelzdeklarationsverordnung); die drei Produkte tragen keine solche Angabe.

Bereits vorher auf Entwurf (nicht angefasst): u. a. «Weinroter Kissenbezug aus Rex Kaninchenfell», «Damen Kurzmantel aus Baumwolle mit Pelzkragen».

## Rücknahme
`productUpdate` mit `status: ACTIVE` für die drei IDs (Admin-API, `gid://shopify/Product/<ID>`).

## Messung (nur lesend, Admin-API, 04.11. ca. 22:00 UTC)
321 Produkte mit Fell-Wörtern in Titel oder Tag, 249 mit Fell-Wort in Titel, Text oder Tag; starke Echtfell-Wörter («echtes/echtem …fell», «Rex-Kaninchen», «Echtpelz») in 15 Produkten (9 aktiv ohne Imitat-Wort im Umfeld): davon die drei oben, dazu `leder-und-fellmantel-mit-fleecefutter-608300` («echtes Schafsleder»; kein Pelz), `winterhandschuhe` und mehrere Texte, die «Kaninchenfell» nur als Stoffbeschreibung für Plüsch/Imitat nennen.

## Offen (Entscheid Besitzer)
Diese aktiven Kunstfell-Produkte tragen «Hasenfell»/«Kaninchenfell» im TITEL, obwohl der Text Plüsch/Imitat nennt und könnten für echtes Fell gehalten werden:
- `kuscheldecke-hasenfell-imitat-tie-dye-697984` (das Produkt im TikTok-Video; Titel sagt «Imitat»)
- `doppelseitiges-hasenfell-kissen-fur-sofa-748992` (Text: «weicher Plüsch»)
- `farbenfroher-hasenfell-pompon-rucksack-804864` (Text: «Hasenfell-Pompon», Material «Cord»; ob Pompon echt oder Kunstfell ist, nennt der Text nicht)
- `wohnzimmer-und-eingangsbereichs-fussmatte-mit-602700` (Text: «Imitationskaninchenfell-Textur», Polyester)
Vorschlag: Titel auf «Kunstfell»/«Plüsch» umstellen; Handles und Preise bleiben. Nicht ausgeführt, weil unklar ist, ob der Besitzer das Wort oder nur echte Pelze meint.

## 05.11.2026: Fell-Wörter in Titeln und Texten (Besitzer «weiter verb.», Fortsetzung von «nimm das raus» / «oder kein hasenfell»)
**Gemessen (nur lesend, `scan_echtfell.mjs`, 05.11. ca. 06:00 UTC):** 179 aktive Produkte, deren Titel, Text oder Tags Pelz-/Fell-Wörter tragen; 106 mit starkem Treffer im eigenen Text (Tierart + Fell, ohne die drei vom 04.11.), davon 66 ohne Imitat-Wort im Umfeld. Vollständige Liste nach der Änderung: `scan_0511.txt` («OHNE» = kein Imitat-/Plüsch-Wort in der Nähe).

**Geändert (LIVE 05.11. ca. 06:10 UTC, Sicherung `fell_sicherung.json`, frisch zurückgelesen, Storefront geprüft):**
| Produkt | vorher | nachher |
|---|---|---|
| `kuscheldecke-hasenfell-imitat-tie-dye-697984` | Kuscheldecke Hasenfell-Imitat Tie-Dye | Kuscheldecke Kunstfell Tie-Dye (Text: «luxuriösen Kunstfell») |
| `farbenfroher-hasenfell-pompon-rucksack-804864` | Farbenfroher Hasenfell-Pompon Rucksack | Farbenfroher Pompon-Rucksack (ob der Pompon echt ist, nennt kein Text) |
| `doppelseitiges-hasenfell-kissen-fur-sofa-748992` | Doppelseitiges Hasenfell-Kissen für Sofa | Doppelseitiges Plüsch-Kissen für Sofa (Text sagt «weicher Plüsch») |
| `wohnzimmer-und-eingangsbereichs-fussmatte-mit-602700` | … Fussmatte mit Kaninchenfell | … Fussmatte mit Kunstfell-Textur (Text sagt «Imitationskaninchenfell-Textur») |
| `cheviot-lounge-sesselhusse-mit-kaninchenfell-p-625100` | … Sesselhusse mit Kaninchenfell-Plüsch | … Sesselhusse aus Samt und Plüsch |
| `vielseitiger-baumwollmantel-mit-pelzkragen-622900` | ACTIVE | **ENTWURF** (eigener Text: «Pelzkragen aus Marderhundfell») |
| `chinesische-tigerkopf-slipper-fur-damen-030017` | ACTIVE | **ENTWURF** (eigener Text: «mit echtem Kaninchenfell … verziert») |
Handles, Preise, Varianten, Bilder blieben. Der SEO-Titel der Fussmatte und der Sesselhusse liest die Admin-API jetzt als `null`: Shopify nimmt dann den Produkttitel (Storefront zeigt den neuen Titel). **Rücknahme:** `ZURUECK=1 LIVE=1 node dropship/pelz-0411/fell_titel.mjs` (Sicherung wird vorher geprüft, das Skript ist wiederholbar).

**Bewusst NICHT angefasst (Entscheid des Besitzers):**
1. **13 Kleidungs-/Schuhprodukte, deren Text «Kaninchenfell» als Material nennt** (Cardigans «Kaninchenfell-Gewebe», Hemd und Neugeborenen-Kleidung «100 % Kaninchenfell», Socken «90 %», Laufschuhe «Innenmaterial», Abendkleid, Mantel, Weste, Jacken). Das ist sehr wahrscheinlich eine Übersetzung für Plüsch-/Flauschstoffe (ein Hemd aus 100 % Kaninchenfell gibt es nicht), aber nicht belegt. Vorschlag: Wort durch «Plüsch» ersetzen oder auf Entwurf, je nach CJ-Datenblatt.
2. **24 Produkte mit Lamm-/Schaf-/Schafsfell** (Stiefel, Sandalen, Lenkradbezug «echtes Lammfell», Mäntel): echte tierische Ware (Leder/Shearling), nicht Teil von «kein Hasenfell». Ob das gewollt ist und ob die Pelzdeklaration (Tierart, Herkunft, Gewinnungsart) nötig ist, entscheidet der Besitzer (nicht juristisch geprüft).
3. **9 Produkte mit «Nerz»** (u. a. Quasten-Pullover «aus Nerzfell», Wimpern «Nerzhaar», Nerz-Samt-Stoffe): meist Stoff-/Wimpernbegriffe, ungeprüft.
4. Mehrere Pelzkragen-Mäntel (Poncho, Minikleid, Kurzmäntel) nennen den Kragen nur «Pelzkragen», ohne Tierart: unbelegt, ob echt.

**Lehre:** Die Messung vom 04.11. suchte nur starke Wörter wie «echtes … fell» und «Echtpelz» und übersah Tierarten ohne diese Wörter («Marderhundfell», «echtem Kaninchenfell»): ein Scan über Tierarten im eigenen Text fand zwei weitere Produkte mit ausdrücklichem Echtfell. Messgerät ist die Wortliste in `scan_echtfell.mjs`; `fell_titel.mjs` schreibt nur mit `LIVE=1`.

