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


## 05.11.2026 nachmittags: CJ-Datenblatt gegen die 13 «Kaninchenfell»-Texte, Nerz und Pelzkragen (Besitzer «weiter verb»)
**Frage:** Ist «Kaninchenfell»/«Nerz» in den Produkttexten echtes Fell oder Plüsch? Die Vermutung vom Vormittag («sehr wahrscheinlich Plüsch-Übersetzung») hat das Datenblatt NICHT bestätigt: CJ nennt bei den meisten ausdrücklich «Rabbit fur»/«Mink fur» als Stoff (Kindersocken «90 %», Neugeborenen-Kleidung «100 %», Hemd «100 % Rabbit Fur», Laufschuhe «Inner material: rabbit fur»). Ob das Wort ein Übersetzungs- oder Vorlagenfehler des Lieferanten ist, lässt sich aus dem Datenblatt nicht belegen.

**Regel (vorab festgelegt):** ENTWURF, wenn das CJ-Datenblatt (Titel, Material, Beschreibung) ein echtes Tier zusammen mit «fur»/«Fell»/«Pelz» als Material, Hauptstoff, Zusammensetzung oder Innenmaterial nennt und im selben Feld kein Faux-/Imitat-/Plüsch-Hinweis steht. BLEIBT bei Faux/Plush/Imitat, Stoffnamen wie «mink velvet», Farbnamen («Nerzgrau», «Angora Rot») und reinen Haar-/Faserangaben ohne «fur». Es wird nur der Status geändert, kein Text.

**Vorgehen (GEMESSEN 05.11. 14:0x–14:14 UTC):** `dossier.mjs` sammelte 85 Dossiers (Shop-Text, CJ-Datenblatt, Bilder; 0 ohne Datenblatt). 23 Kandidaten wurden von **zwei voneinander unabhängigen Lesern blind** nach der Regel beurteilt (Workflow `wf_f90e8077-d2f`, 6 Agenten, ohne mein Urteil zu kennen). 16 von 17 meiner Einordnungen «ENTWURF» wurden von beiden Lesern bestätigt; bei der 17. (Blockstrickweste, «Plush» + «Rabbit Fur») urteilten beide anders (BLEIBT), das gilt. Keine meiner «BLEIBT»-Einordnungen wurde gekippt.

**LIVE 05.11. 14:14 UTC auf ENTWURF (16 Produkte, frisch zurückgelesen alle DRAFT, Storefront 404, Sicherung `fell_folge_sicherung.json`, Belege `fell_folge_liste.json`):**
hooded-cardigan-sweatshirt-mit-fledermausarmel-603400 · strick-cardigan-mit-rundhals-und-knopfen-626200 · kapuzen-cardigan-mit-strickknopfen-615500 · retro-ubergangsjacke-fur-herren-634200 · kleidung-fur-neugeborene-720768 · fruhlings-colorblock-jacke-fur-herren-603200 · racing-carbon-laufschuhe-657100 · elegantes-abendkleid-fur-damen-628700 · retro-warmer-mantel-mit-kapuze-610000 · rutschfeste-bodensocken-fur-kinder-764224 · herren-kapuzen-sweatshirt-aus-cord-630900 · herren-hemd-mit-revers-und-kurzen-armeln-607700 · corduroy-baby-set-striped-2-teilig-605600 · handgemachter-quasten-pullover-aus-nerzfell-635500 · herren-strickjacke-mit-polokragen-612000 · clover-blossom-nerz-wimpernverlangerung-767936.
**Rücknahme:** `ZURUECK=1 LIVE=1 node dropship/pelz-0411/fell_folge.mjs` (setzt ACTIVE nur bei Produkten, die jetzt DRAFT sind). Wer die Ware für Plüsch hält, schaltet sie zurück und lässt den Text anpassen; ich habe bewusst weder «Kaninchenfell» noch «Plüsch» behauptet, weil beides unbelegt ist.

**Bleibt aktiv (Leser einig BLEIBT):** `faux-fur-decke-im-tie-dye-look-627100` (CJ-Titel «Faux Fur … Plush», Polyester), `samt-kissenbezug-mit-schlaufenmuster-188160` («rabbit fur» nur im Farbnamen, Loop Velvet), `katzen-kapuzenpullover-mit-fleecefutter-635400` («mink velvet» = Samtstoff), `falsche-nerzwimpern-3d-mk-13-5-paar-593858` («Premium Faux Mink»), `3d-nerzhaar-wimpern-7f9eeb` und `bedruckte-weste-aus-denim-ee3ba9` («mink hair», Haar nicht Fell; die Weste nennt «1 %», der Shop-Text «aus Nerzhaar gefertigt» ist darum zweifelhaft). **Grenzfall:** `mannliche-v-ausschnitt-blockstrickweste-601800` («Fabric Name: Plush», aber «Main Fabric Material: Rabbit Fur»): beide Leser sagten BLEIBT wegen «Plush»; bleibt aktiv, Entscheid beim Besitzer.

## Weitere Messungen am 05.11. nachmittags (nichts geändert)
- **Haar-/Faserklasse** (`scan_tierhaar.mjs`, `scan_tierhaar.txt`-Ausgabe im Scratch): 13 aktive Produkte nennen «Kaninchenhaar»/«Hasenhaar»/«Angorakaninchenhaar» als Material oder Anteil (Corduroy-Jeansjacke, Jacke im American Style, Polo-Mix, Kissenbezug, Jeans mit Modal-Anteil, Baby-Bodensocken «50 %», ärmelloses Spitzentop, Kaschmir-Stricktop «Hasenhaar», Kinder-Hausschuhe, Anti-Pilling-Strickjacke) und zwei Löwenkopf-Sandalen mit «echtem Kaninchenhaar» als Zierbälle. Das sind Fasern bzw. Zierfell, nicht «Fell» als Hauptstoff; nicht Teil der Regel oben, **Entscheid Besitzer** (Vorschlag: die zwei Sandalen mit «echtem Kaninchenhaar» ebenfalls auf Entwurf).
- **Pelzkragen-Gruppe** (62 Treffer): 40 sind Fehlalarme, ihr Text sagt ausdrücklich «ohne/kein Pelzkragen» (CJ: «No fur collar»); 6 nennen «Fur Collar: Yes» (einer davon ausdrücklich «Faux Fur», Text «Kunstpelz»: in Ordnung); 16 weitere nennen Fell-Kragen/-Besatz ohne Tierart und ohne Faux-Hinweis. Für diese 22 ist weder echtes noch künstliches Fell belegt; **bleiben aktiv, Entscheid Besitzer** (Schweizer Pelzdeklaration verlangt bei echtem Pelz Tierart/Herkunft/Gewinnungsart; nicht juristisch geprüft).
- **Lamm-/Schaf-/Schafsfell** (35 Treffer, echte Leder-/Shearling-Ware): wie am Vormittag nicht angefasst.
- **Lehre:** Die Wortsuche «Pelzkragen» findet vor allem VERNEINTE Aussagen («ohne Pelzkragen»): vor dem Zählen den Satz lesen, nicht nur das Wort. Und: Eine «Plüsch-Übersetzung» ist eine Annahme, bis das Datenblatt sie trägt; bei CJ stand das Gegenteil.
