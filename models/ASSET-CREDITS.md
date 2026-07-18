# Asset-Credits — kostenlose CC0-Game-Assets

Alle hier gelisteten Assets sind **CC0 / Public Domain** (frei für kommerzielle Nutzung,
keine Namensnennung erforderlich). Beschafft + aufbereitet am 2026-07-11 (Session `claude/anime-meshy`,
Asset-Beschaffung). Aufbereitung: heruntergeladen → in `models/cc0_*.glb` umbenannt → mit
`gltf-transform prune+dedup` normalisiert (Textur eingebettet) → für three.js **r128** verifiziert
(Playwright-Screenshot + Blender-Ground-Truth-Vergleich).

> Lizenz-Regel dieser Session: **NUR CC0 / gemeinfrei / „free for commercial use, no attribution
> required"**. Alles andere (CC-BY, non-commercial, editorial) wurde bewusst NICHT übernommen.
> Namensnennung ist bei CC0 freiwillig — hier dennoch dokumentiert für Nachvollziehbarkeit.

## Kenney — Nature Kit (CC0)
Quelle: https://kenney.nl/assets/nature-kit · Lizenz: CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
Format-Ursprung: `Models/GLTF format` (Vertex-Colors / separate Materialien — rendert nativ sauber in r128).

| Datei | Original | Nutzung |
|---|---|---|
| cc0_tree_default.glb | tree_default | Laubbaum (Wildnis/Deko) |
| cc0_tree_oak.glb | tree_oak | Eiche |
| cc0_tree_pine.glb | tree_pineRoundA | Nadelbaum |
| cc0_tree_palm.glb | tree_palm | Palme (Strand/tropisch) |
| cc0_bush.glb | plant_bushDetailed | Busch |
| cc0_mushroom_red.glb | mushroom_redGroup | Pilzgruppe (Fantasy) |
| cc0_flower_purple.glb | flower_purpleB | Blume |
| cc0_grass.glb | grass_large | Grasbüschel |
| cc0_rock_large.glb | rock_largeA | Felsen groß |
| cc0_rock_small.glb | rock_largeB | Felsen klein |
| cc0_log_stack.glb | log_stack | Holzstapel |
| cc0_cliff_rock.glb | cliff_block_rock | Klippenblock (Terrain) |

## Kenney — Survival Kit (CC0)
Quelle: https://kenney.nl/assets/survival-kit · Lizenz: CC0 1.0
Format-Ursprung: `Models/GLB format` (geteiltes Palette-Atlas `colormap.png` + KHR_texture_transform).
**Aufbereitung:** redundantes KHR_texture_transform (Identity, nur `texCoord:0`) entfernt und
Sampler auf NEAREST gestellt — sonst mittelt three.js r128 bei kleiner Darstellung die Mip-Level
des Palette-Atlas zu Matschbraun. Nach Fix identisch zur Blender-Referenz.

| Datei | Original | Nutzung |
|---|---|---|
| cc0_barrel.glb | barrel | Fass (Prop) |
| cc0_chest.glb | chest | Truhe (Loot) |
| cc0_crate.glb | box | Kiste |
| cc0_campfire.glb | campfire-pit | Lagerfeuer-Stelle |
| cc0_fence.glb | fence | Zaun |
| cc0_tent.glb | tent | Zelt |

## Kenney — Graveyard Kit (CC0)
Quelle: https://kenney.nl/assets/graveyard-kit · Lizenz: CC0 1.0
Aufbereitung wie Survival Kit (Atlas-Fix + NEAREST).

| Datei | Original | Nutzung |
|---|---|---|
| cc0_gravestone_cross.glb | gravestone-cross | Grabstein mit Kreuz |
| cc0_gravestone_round.glb | gravestone-round | Grabstein rund |
| cc0_crypt.glb | crypt-small | Gruft (Deko) |
| cc0_cross.glb | cross | Kreuz |
| cc0_coffin.glb | coffin | Sarg |
| cc0_pillar.glb | border-pillar | Zaun-/Grenzpfeiler |

## Poly Haven — HDRI (CC0)
| Datei | Quelle | Lizenz |
|---|---|---|
| textures/cc0_kloppenheim_field_1k.hdr | https://polyhaven.com/a/kloppenheim_06 (1k HDR) | CC0 1.0 |
Sonniges Feld/klarer Himmel — für Tageslicht-`scene.environment` (mit `RGBELoader.js`, `envMapIntensity` dimmen ~0.3).

---

## Nicht übernommen (Lizenz-Hinweise)
- **Khronos „Fox".glb** (animiertes CC0-Mesh, aber **Rig/Animation = CC-BY 4.0**, Namensnennung
  erforderlich) → verworfen, weil die Session-Regel „no attribution required" verlangt.
- **Quaternius** (alle Packs CC0, ideal wären die *Ultimate Animated Animals*): Seite CC0-bestätigt,
  aber Download läuft über ein **itch.io-JS/CSRF-Widget** (Upload-IDs nicht im statischen HTML) → aus
  der Sandbox nicht skriptbar. Empfehlung: per PC-Claude/Browser manuell laden (quaternius.itch.io),
  dann hier mit gltf-transform aufbereiten — das würde animierte CC0-Tiere (Reh/Fuchs/Wolf/Vogel)
  für die Neon-Wildnis liefern.

## Werkzeuge (eingerichtet)
- `@gltf-transform/cli` 4.4.1 (global via `/opt/node22/bin/npm i -g`) — GLB prune/dedup/inspect.
- numpy in `/tmp/pymods` (für Blender-glTF-Export: `PYTHONPATH=/tmp/pymods blender -b -P …`).
- Blender 4.0.2 (Ground-Truth-Render nur mit **CYCLES/CPU** headless; EEVEE braucht libEGL = fehlt).

## Meshy.ai — generierte Assets (2026-07-12, Text→3D, private Lizenz)
Vom User bereitgestellte Credits. Prompt-getrieben, preview→refine, r128-Fix (prune/dedup + JPEG-Resize 1024).

| Datei | Prompt-Kern | Nutzung |
|---|---|---|
| mob_dragon.glb | fantasy dragon, glowing cyan wings | Drachen-Nacht-Boss |
| building_castle.glb | stone castle fortress with towers | Burg-Landmarke |
| item_relic.glb | glowing gem on ornate gold base | leuchtendes Relikt (Deko/Fund) |
| item_potion.glb | red health potion bottle | einsammelbarer Heiltrank (+40 HP) |

## Kenney — Fantasy Town Kit + City Roads (CC0) — Blender-poliert
Quelle: https://kenney.nl/assets/fantasy-town-kit · CC0 1.0. GLB-Format verweist auf externe
`Textures/colormap.png` → in Blender importiert + als GLB mit **eingebetteter** Textur re-exportiert
(flat-shading), sonst lädt r128 sie nicht. Tool: automation/polish_kenney_glb.py.

| Datei | Original | Nutzung |
|---|---|---|
| ftk_road/ftk_road_bend/ftk_road_corner | road* | Straßen/Wege (Dorf-Kreuz + Weg-Stummel) |
| ftk_stall | stall-red | Marktstand |
| ftk_fountain | fountain-round-detail | Dorf-Brunnen |
| ftk_cart | cart | Marktkarren |
| ftk_banner | banner-red | Banner (Deko) |
| ftk_lantern | lantern | Laterne (+Licht) |
| ftk_watermill | watermill | Mühlrad (Deko) |
| ftk_tree | tree-high-round | Baum |

> Ersetzt die früheren selbst-modellierten gen_*-Props (auf User-Wunsch entfernt).

## Kenney — Castle Kit + Mini-Dungeon + Food Kit (CC0) — Blender-poliert
Alle CC0, GLB→Blender (Textur eingebettet, flat-shading) via automation/polish_kenney_glb.py.
| Präfix | Kit | Inhalt |
|---|---|---|
| ck_* | Castle Kit | Turm, Mauer, Ecke, Tor, Flagge, Katapult, Baum |
| dk_* | Mini-Dungeon | Schwert, Speer, Rund-/Rechteckschild, Truhe, Fass |
| fd_* | Food Kit | Wurst, Kuchen, Burger, Ei (Loot) |

## Kenney — Mini Characters (CC0) — Blender-poliert
npc_ma..npc_fd = 8 menschliche Dorfbewohner-Modelle (character-male/female-a..d). Ersetzen die prozeduralen NPCs.

## Kenney — Furniture Kit (CC0) — Blender-poliert
fn_table/chair/chair2/stool/bed/plant/plant2/bookcase = Möbel (Tavernen-Ecke im Dorf, Bett als Bau-Objekt).

## Kenney — 8 weitere CC0-Kits (Blender-poliert, 82 Modelle) — 2026-07-12
Alle CC0, GLB→Blender (Textur eingebettet, flat-shading). Multi-Agent-Import.
| Präfix | Kit | Inhalt |
|---|---|---|
| nt_* | Nature Kit | Kiefer/Eiche/Palme/Laubbaum, Busch, Fels, Blumen, Pilz, Gras, Stumpf, Stamm (14) |
| sv_* | Survival Kit | Zelte, Lagerfeuer, Schlafsack, Holzstapel, Truhe, Fass, Eimer, Axt, Hammer, Fisch (14) |
| gy_* | Graveyard Kit | Grabsteine, Krypta, Sarg, Kreuz, Obelisk, Eisenzaun, toter Baum, Laterne, Kürbis, Urne (12) |
| pr_* | Pirate Kit | Truhe, Fässer, Kisten, Kanone, Palme, Ruderboot, Flagge, Wachturm, Flasche, Schaufel (12) |
| fu_* | Furniture Kit | Bett, Tisch, Stuhl, Bank, Regal, Sofa, Schrank, Pflanze, Lampe, Teppich (12) |
| dk2_* | Mini-Dungeon (Rest) | Münze, Falle, Banner, Säule, Tor, Treppe, Felsen, Holzgerüst (10) |
| an_* | Cube Pets | Kuh, Schwein, Huhn, Hund, Katze, Reh, Hase, Fuchs, Wildschwein, Biber (10) |

Neue Welt-Orte: 🪦 Friedhof, 🏕️ Survival-Camp, 🏴‍☠️ Schatz-Küste. Tiere über die Welt verteilt (Vieh nahe Dörfer, Wild im Wald).

## Kenney — 4 weitere CC0-Kits (50 Modelle) — 2026-07-12
| Präfix | Kit | Inhalt |
|---|---|---|
| wc_ | Pirate Kit (Boote) | Ruderboote, Segelboot, Steg/Pier, Leuchtturm, Wrack, Boje (12) |
| hd_ | Holiday Kit | Baum, Geschenke, Schneemann, Rentier, Laterne, Kranz, Zuckerstange, Lichter (12) |
| bk_ | Building Kit | Tür, Fenster, Treppe, Torbogen, Tor, Säule, Mauer, Plattform (12) |
| fg_ | Nature/Foliage | Gras-Sorten, Büsche, Blumen, Seerosen, Moos, Pilz, kleiner Baum (14) |

Integriert: Foliage in Pflanzen-Scatter · Seerosen+Boote+Steg an Seen · 🏛️ Ruinen-POI (bk_) · 🗼 Leuchtturm · 🎄 festliche Ecke im Anfangsdorf.

## Neon-/Sci-Fi-Fusion-Spiel (`nf_*` + `textures/tex_neon_*`) — 2026-07-13
Beschafft für das Neon-Fusion-Spiel (neon-survivor/colossus/abyss/duo). Alle CC0.
Aufbereitung GLBs: `gltf-transform` prune+dedup; Space-Station-Kit-GLBs referenzierten externe
`Textures/colormap.png` → eingebettet + identity `KHR_texture_transform` entfernt + Sampler
NEAREST (bekannter Palette-Atlas-Fix für r128). Quaternius-`.gltf` (Base64-Buffer) → GLB
konvertiert, Animationen erhalten. Verifiziert: glTF-Magic + Version 2 + JSON-Chunk parsebar +
keine externen URIs; Texturen per `file` = echte JPEG 1024×1024.

### Poly Haven — Texturen (CC0 1.0), 1k Diffuse JPG
Download via https://api.polyhaven.com/files/<slug> → `Diffuse/1k/jpg`.

| Datei (textures/) | Poly-Haven-Slug | Nutzung |
|---|---|---|
| tex_neon_metal_plate.jpg | metal_plate | Metall-Bodenplatten/Riffelblech (Boden) |
| tex_neon_grate.jpg | metal_grate_rusty | Gitter/Grate (Boden/Steg) |
| tex_neon_panel_blue.jpg | blue_metal_plate | Sci-Fi-Panel, blau lackiert (Wände) |
| tex_neon_metal_grid.jpg | rusty_metal_grid | Metall-Grid-Panel (Wände/Deko) |
| tex_neon_asphalt.jpg | asphalt_02 | dunkler Asphalt (Straßen/Arena-Boden) |
| tex_neon_concrete.jpg | concrete_floor_worn_001 | abgenutzter Beton (Boden) |
| tex_neon_corrugated.jpg | corrugated_iron_02 | Wellblech, galvanisiert (Wände/Dächer) |
| tex_neon_container.jpg | container_side | Container-Seite (Kisten/Barrieren-Skin) |

### Kenney — Space Kit 2.0 (CC0)
Quelle: https://kenney.nl/assets/space-kit (`Models/GLTF format`, Material-Farben, keine Texturen).

| Datei | Original | Nutzung |
|---|---|---|
| nf_turret_single.glb | turret_single | Geschützturm (Gegner/Verteidigung) |
| nf_turret_double.glb | turret_double | Doppel-Geschützturm |
| nf_crystal.glb | rock_crystals | Energie-Kristalle (Pickup/Deko) |
| nf_crystal_large.glb | rock_crystalsLargeA | große Kristallformation |
| nf_barrels.glb | barrels | Fass-Gruppe (Props/Deckung) |
| nf_generator.glb | machine_generator | Generator (Ziel-Objekt/Deko) |
| nf_satellite.glb | satelliteDish | Satellitenschüssel (Landmarke) |
| nf_gate.glb | gate_simple | Sci-Fi-Tor/Spawn-Portal |

### Kenney — Space Station Kit 1.0 (CC0)
Quelle: https://kenney.nl/assets/space-station-kit (`Models/GLB format`, colormap-Atlas eingebettet, NEAREST).

| Datei | Original | Nutzung |
|---|---|---|
| nf_barrier.glb | structure-barrier | Barriere (Deckung/Arena-Rand) |
| nf_barrier_high.glb | structure-barrier-high | hohe Barriere |
| nf_container.glb | container | Sci-Fi-Kiste (Loot/Deckung) |
| nf_container_tall.glb | container-tall | hoher Container |

### Quaternius — Ultimate Space Kit (CC0 1.0)
Quelle: https://quaternius.com/packs/ultimatespacekit.html (Download = öffentlicher Google-Drive-Ordner
`17F8HlI2zPTlo32aieW5YPPwOk78xo-2m` → Characters/GLTF; License.txt im Ordner = CC0). Der frühere
itch.io-Blocker gilt also nicht für die Drive-Links — via `drive.google.com/uc?export=download&id=…` skriptbar.

| Datei | Original | Nutzung |
|---|---|---|
| nf_drone.glb | Enemy_Flying.gltf | Flugdrohnen-Gegner (**8 Animationen**, geriggt) |
| nf_robot_small.glb | Enemy_Small.gltf | kleiner Roboter-Gegner (**8 Animationen**) |
| nf_robot_large.glb | Enemy_Large.gltf | großer Roboter-Boss (**14 Animationen**) |

## Traumhaus-Spiel — Interior/Garten-Nachschub (`th2_*`) — 2026-07-14
Beschafft für traumhaus.html (Sims-Style Hausbau). Alle CC0 1.0. Namensschema `th2_<name>.glb`,
damit keine Kollision mit den bestehenden `th_*`/`fu_*` (Duplikat-Check gegen Mesh-Namen der
fu_*-GLBs gemacht — ⚠️ `fu_wardrobe.glb` enthält in Wahrheit `cabinetTelevision`, ist also ein
TV-Lowboard; ein echter Kleiderschrank fehlte → `th2_kleiderschrank`).
Verifiziert je Datei: glTF-Magic + Version 2 + JSON-Chunk parsebar + keine externen URIs + ≥1 Mesh.

### Kenney — Furniture Kit 2.0 (CC0), 18 Modelle
Quelle: https://kenney.nl/assets/furniture-kit · Lizenz: CC0 1.0. Format-Ursprung `Models/GLTF format`
(**Material-Farben, KEINE Texturen** → kein Blender/colormap-Fix nötig, nur `gltf-transform prune`+`dedup`).

| Datei | Original | Nutzung |
|---|---|---|
| th2_spuele.glb | kitchenSink | Küchen-Spüle (Unterschrank + Becken) |
| th2_haengeschrank.glb | kitchenCabinetUpperDouble | Küchen-Hängeschrank |
| th2_kuechentheke.glb | kitchenBar | Küchentheke/Bar-Element |
| th2_kaffeemaschine.glb | kitchenCoffeeMachine | Kaffeemaschine (Deko Küche) |
| th2_toaster.glb | toaster | Toaster (Deko Küche) |
| th2_waschbecken.glb | bathroomSink | Bad-Waschbecken (Säule) |
| th2_badspiegel.glb | bathroomMirror | Badspiegel (Wand) |
| th2_badschrank.glb | bathroomCabinetDrawer | Badschrank mit Schublade |
| th2_waschmaschine.glb | washer | Waschmaschine |
| th2_ecksofa.glb | loungeSofaCorner | Ecksofa (Wohnzimmer) |
| th2_relaxsessel.glb | loungeChairRelax | Relax-/Liegesessel |
| th2_stehlampe.glb | lampRoundFloor | Stehlampe (fu_lamp = nur Tischlampe) |
| th2_deckenlampe.glb | lampSquareCeiling | Deckenlampe |
| th2_einzelbett.glb | bedSingle | Einzelbett |
| th2_etagenbett.glb | bedBunk | Etagenbett (Kinderzimmer) |
| th2_nachttisch.glb | sideTableDrawers | Nachttisch mit Schubladen |
| th2_kleiderschrank.glb | bookcaseClosedDoors | Kleiderschrank (hoher Schrank mit Türen) |
| th2_garderobe.glb | coatRackStanding | Stand-Garderobe (Flur) |

### Kenney — City Kit Suburban 2.0 + Coaster Kit (CC0), 3 Garten-Modelle
Quellen: https://kenney.nl/assets/city-kit-suburban · https://kenney.nl/assets/coaster-kit · CC0 1.0.
GLB-Format referenziert externe `Textures/colormap.png` → Blender-Embed (polish_kenney_glb.py-Muster,
flat-shading) + `gltf-transform resize 512/prune/dedup` + Sampler NEAREST (Palette-Atlas-r128-Fix).

| Datei | Original (Kit) | Nutzung |
|---|---|---|
| th2_blumenbeet.glb | planter (Suburban) | Pflanzkasten/Blumenbeet (Garten) |
| th2_gartenzaun.glb | fence (Suburban) | Gartenzaun-Segment |
| th2_gartenbank.glb | bench (Coaster) | Garten-/Parkbank |

> Nicht beschafft: Sonnenschirm + dedizierter Gartenstuhl — in keinem curl-baren CC0-Kit gefunden
> (Kenney: kein Garten-Kit; Quaternius Furniture/Modular-Streets ohne Schirm; itch.io/KayKit über
> Proxy nicht ladbar; OpenGameArt-CC0-Treffer nur Hand-Regenschirm = Stil-Mismatch). Grill/Pool
> existieren bereits als th_grill/th_pool; Gartenstuhl-Ersatz: th_gruenstuhl/th2_gartenbank.

## Neon-Wildnis — Natur/Dorf-Nachschub (`nw_*`) — 2026-07-15
Beschafft für neon-wildnis.html (schönere Felsen, wertige Blumen, Dorf-Leben, Wege-Deko). Alle CC0 1.0.
Namensschema `nw_<name>.glb`. **Duplikat-Check gegen Original-Namen** der bestehenden nt_/fg_/cc0_/ftk_/sv_-GLBs
(Node-Namen aus dem JSON-Chunk extrahiert) — alle 27 Picks sind neue Originale.
Verifiziert je Datei: glTF-Magic + Version 2 + JSON-Chunk parsebar + ≥1 Mesh + keine externen URIs + <300 KB.

### Kenney — Nature Kit 2.1 (CC0), 21 Modelle
Quelle: https://kenney.nl/assets/nature-kit · Lizenz: CC0 1.0. Format `Models/GLTF format` (= .glb,
self-contained, **Material-Farben + KHR_materials_unlit** — gleiches Muster wie die r128-verifizierten
cc0_*-Nature-Assets, rendert nativ). Aufbereitung: nur `gltf-transform prune`+`dedup`. Alle 2,6–23 KB.

| Datei | Original | Nutzung |
|---|---|---|
| nw_fels_a.glb | rock_largeC | Fels-Variante (schönere Steine!) |
| nw_fels_b.glb | rock_largeE | Fels-Variante |
| nw_stein_gross_a.glb | stone_largeA | grauer Stein groß |
| nw_stein_gross_b.glb | stone_largeD | grauer Stein groß, Variante |
| nw_klippe.glb | cliff_large_rock | großer Klippenblock (Terrain-Akzent) |
| nw_blume_lila.glb | flower_purpleC | Blume lila (hoch) |
| nw_blume_rot.glb | flower_redB | Blume rot |
| nw_blume_gelb.glb | flower_yellowB | Blume gelb |
| nw_blume_gelb_hoch.glb | flower_yellowC | Blume gelb hoch |
| nw_busch_gross.glb | plant_bushLargeTriangle | großer Dreiecks-Busch |
| nw_schilf.glb | grass_leafsLarge | Schilf/hohes Blattgras (Ufer) |
| nw_stumpf_alt.glb | stump_old | alter Baumstumpf |
| nw_pilz_braun.glb | mushroom_tanGroup | braune Pilz-Gruppe |
| nw_pilz_rot_hoch.glb | mushroom_redTall | hoher roter Pilz |
| nw_zaun_tor.glb | fence_gate | Zaun mit Tor (Dorf/Gehege) |
| nw_schild.glb | sign | Holz-Schild (Wege-Deko) |
| nw_meilenstein.glb | statue_obelisk | Meilenstein/Obelisk (Wegmarke) |
| nw_holzstapel_gross.glb | log_stackLarge | großer Holzstapel (Dorf) |
| nw_kuerbis.glb | crop_pumpkin | Kürbis (Feld/Dorf) |
| nw_weizen.glb | crops_wheatStageB | Weizen-Reihe (Feld, Heu-Ersatz) |
| nw_topf_gross.glb | pot_large | großer Tontopf (Dorf-Deko) |

### Kenney — Fantasy Town Kit 2.0 + Survival Kit 2.0 (CC0), 6 Modelle
Quellen: https://kenney.nl/assets/fantasy-town-kit · https://kenney.nl/assets/survival-kit · CC0 1.0.
GLB referenziert externe `Textures/colormap.png` → **Blender-Embed** (polish_kenney_glb.py-Muster,
flat-shading) + `gltf-transform resize 512` + prune + dedup + **Sampler NEAREST** (Palette-Atlas-r128-Fix,
identity KHR_texture_transform entfernt). PNG eingebettet, 15–78 KB.

| Datei | Original (Kit) | Nutzung |
|---|---|---|
| nw_marktstand_gruen.glb | stall-green (Fantasy Town) | Marktstand grün (Variante zu ftk_stall) |
| nw_marktstand_bank.glb | stall-bench (Fantasy Town) | Markt-Verkaufsbank |
| nw_brunnen_eckig.glb | fountain-square (Fantasy Town) | eckiger Brunnen (Variante) |
| nw_karren_hoch.glb | cart-high (Fantasy Town) | hoher Karren (Variante zu ftk_cart) |
| nw_fass_offen.glb | barrel-open (Survival) | offenes Fass (Dorf-Prop) |
| nw_wegweiser.glb | signpost (Survival) | mehrarmiger Wegweiser |

> Verworfen/nicht beschafft: **Heuballen** (existiert in keinem der 3 Kits — Ersatz: nw_weizen/nw_kuerbis
> als Feld-Deko), **Fass-Stapel** (kein Kit hat gestapelte Fässer — Ersatz: nw_fass_offen + cc0_barrel
> kombinieren), **Seerose** (fg_lilypad/fg_lilypad_small existieren bereits = Duplikat), einfacher
> Nature-Kit-Zaun `fence_simple` (cc0_fence + th2_gartenzaun decken das ab).

## Neon-Wildnis — animierte CHARAKTER-Helden (`nwhero_*`) — 2026-07-15
Beschafft für die Helden-Charakterauswahl in neon-wildnis.html (CHARACTERS-Liste). **13 geriggte, animierte
CC0-Figuren** von **Quaternius** — für Silhouetten-Vielfalt: 7 Fantasy-Menschen (gemeinsames Anim-Set) +
6 skurrile Monster/Nicht-Menschen (eigenes Anim-Set). Namensschema `nwhero_<klasse>.glb`. Alle CC0 1.0.
**KEINE Duplikate** zu den bestehenden Helden (class_mage/ranger/titan = Meshy; anime_* = Anime-Meshy;
hero_meshy_combat2 = Meshy). Quaternius-Blocky-Stil ist eine neue, dritte Optik.

Quelle-Download = öffentliche Google-Drive-Ordner der jeweiligen Pack-Seite (License.txt im Ordner = CC0 1.0
Universal, „LowPoly Models by @Quaternius"). Skriptbar via `drive.google.com/uc?export=download&id=<fileId>`
(Ordner-Listing über die Drive-Folder-HTML, `_DRIVE_ivd`-Blob → id/name; \x22/\x5b entescapen).

- **Ultimate Animated Character Pack** — Seite `quaternius.com/packs/ultimatedanimatedcharacter.html`,
  Drive-Folder `1sNi1AfenfPRrvRt5yfaj5QMMd6KKcUJ5` → Unterordner **glTF** `1UNNT0MeVX0O04RGgu8aLkKe3fwB9_t-A`.
- **Ultimate Monsters Pack** — Seite `quaternius.com/packs/ultimatemonsters.html`,
  Drive-Folder `18m4KpzpEzhC9wl7jzr6dUc0N8Jozr79C` → **Big/glTF** `1sOXLt5U3ofaujPlQRL11s4ub2UsqN8V8`.

**Aufbereitung (Node + `@gltf-transform` 4.4.1, Skript-Kette):** Die `.gltf` sind self-contained
(base64-Buffer, Textur als bufferView eingebettet — **keine** externen URIs, keine Atlas-Datei nötig).
Pipeline je Datei: **Animationen umbenennen auf das heroAct-Schema (lowercase idle/walk/run/attack/…) +
ungenutzte Clips verwerfen** → `resample()` (redundante Keyframes) → `prune()` → `dedup()` → plain GLB.
Skinned/animiert **bewahrt** (Skin + JOINTS_0 + alle Anim-Channels auf Joints verifiziert). **KEIN Draco/WebP.**
Die 3 schwersten (Viking/Wizard/Witch, ~2 MB Quell-Geometrie ≈ 9,8 k Verts f32) zusätzlich mit
**`quantize()` (KHR_mesh_quantization**, position 14-bit — von three.js r128 nativ unterstützt, ist *nicht*
Draco) auf <900 KB gedrückt; die übrigen 10 sind plain (unquantisiert).

**⚠️ Clip-Namen kritisch fürs Anim-System `heroAct`/`makeRig`** (neon-wildnis.html): der Rig sucht Actions
per Name `idle/walk/run/attack/attack2/attack3/cast/charge_release/dash_attack/dodge/hit/victory/taunt/wave`
(ONESHOT-Set feuert einmalig, Fallback auf ersten Clip wenn kein `idle`). Darum wurden die Quaternius-
Originalnamen auf dieses Schema gemappt.

### Fantasy-Menschen (Ultimate Animated Character Pack) — 9 Clips: `idle, walk, run, attack, attack2, attack3, dodge, hit, victory`
Original-Anim-Set (17): Idle/Walk/Run/SwordSlash/Punch/Shoot_OneHanded/Roll/RecieveHit/Victory (+ Death,
Defeat, Jump, PickUp, SitDown, StandUp, Run_Carry, Walk_Carry = verworfen). Mapping: SwordSlash→attack,
Punch→attack2, Shoot_OneHanded→attack3, Roll→dodge, RecieveHit→hit. Vertex-Farben (keine Textur).

| Datei | KB | Original | Held-Idee | Clips |
|---|---|---|---|---|
| nwhero_ritter.glb | 751 | Knight_Male | 🛡️ Ritter (Schwert) | idle,walk,run,attack,attack2,attack3,dodge,hit,victory |
| nwhero_wikinger.glb | 735¹ | Viking_Male | 🪓 Barbar/Wikinger | idle,walk,run,attack,attack2,attack3,dodge,hit,victory |
| nwhero_magier.glb | 736¹ | Wizard | 🔮 Magier (Stab, Hut) | idle,walk,run,attack,attack2,attack3,dodge,hit,victory |
| nwhero_elf.glb | 715 | Elf | 🏹 Elf/Bogenschütze (Shoot=attack3) | idle,walk,run,attack,attack2,attack3,dodge,hit,victory |
| nwhero_pirat.glb | 714 | Pirate_Male | 🏴‍☠️ Pirat | idle,walk,run,attack,attack2,attack3,dodge,hit,victory |
| nwhero_hexe.glb | 752¹ | Witch | 🧙‍♀️ Hexe (Spitzhut) | idle,walk,run,attack,attack2,attack3,dodge,hit,victory |
| nwhero_goblin.glb | 683 | Goblin_Male | 👺 Goblin-Krieger (skurril) | idle,walk,run,attack,attack2,attack3,dodge,hit,victory |

¹ mit KHR_mesh_quantization (r128-kompatibel).

### Monster/Nicht-Menschen (Ultimate Monsters Pack, Big) — 8 Clips: `idle, walk, run, attack, attack2, hit, dodge, wave`
Original-Anim-Set (14): Idle/Walk/Run/Punch/Weapon/HitReact/Duck/Wave (+ Death, Jump, Jump_Idle, Jump_Land,
No, Yes = verworfen). Mapping: Punch→attack, Weapon→attack2, HitReact→hit, Duck→dodge, Wave→wave
(heroAct nutzt `wave` als Fallback für victory/taunt). Textur (Monster-Atlas) im Buffer eingebettet.

| Datei | KB | Original | Held-Idee | Clips |
|---|---|---|---|---|
| nwhero_alien.glb | 541 | Alien | 👽 Alien (skurril) | idle,walk,run,attack,attack2,dodge,hit,wave |
| nwhero_ork.glb | 540 | Orc | 🧌 Ork-Krieger | idle,walk,run,attack,attack2,dodge,hit,wave |
| nwhero_totenork.glb | 545 | Orc_Skull | 💀 Totenschädel-Ork (skurril) | idle,walk,run,attack,attack2,dodge,hit,wave |
| nwhero_daemon.glb | 528 | Demon | 😈 Dämon | idle,walk,run,attack,attack2,dodge,hit,wave |
| nwhero_pilzkoenig.glb | 490 | MushroomKing | 🍄 Pilzkönig (skurril) | idle,walk,run,attack,attack2,dodge,hit,wave |
| nwhero_yeti.glb | 491 | Yeti | 🦍 Yeti | idle,walk,run,attack,attack2,dodge,hit,wave |

> **Verworfen/nicht beschafft:** *Roboter*- und *Alien*-Einzelpacks (`animatedrobot`/`animatedalien`,
> Drive-Folder `18MU0RtRu9G6SU6uSZ_zMQFmVkRlB4zH5` / `1ADdETHqjSIEUhjKjhLB9hQjeppXEqcvL`) liefern **nur
> FBX/OBJ/Blend, keinen glTF-Ordner** → bräuchten Blender-FBX-Konvertierung; stattdessen deckt der
> Monsters-Pack Alien (nwhero_alien) + skurrile Silhouetten ohne Blender ab. *Ninja* (Character-Pack) +
> *Magier/Kriegerin* bewusst ausgelassen, wo `anime_ninja/anime_mage/anime_warrior` das Thema schon
> abdecken. Zivil-Typen (Doctor/Chef/Suit/Worker/Casual) = kein Fantasy-Fit, übersprungen. Restliche
> Monster (Dino/Frog/Bunny/Birb/Cactoro/Tribal/Fish/Yeti-Varianten) = Reserve für später.

> **Einbau (andere Session, neon-wildnis.html):** neue Einträge in die `CHARACTERS`-Liste, z. B.
> `{id:"ritter", emo:"🛡️", name:"Ritter", desc:"Schwertkämpfer", file:"nwhero_ritter.glb", scale:1.05, glow:"soft"}`.
> Die Clip-Namen passen bereits auf `heroAct`; `scale` ~1.0–1.1 (Quaternius-Figuren sind ~4 Units hoch, etwas
> grösser als anime_*). `glow:"soft"` (keine Neon-Emissive-Verstärkung nötig).

## th3_* — Eigenbau-Props (Blender-Agenten-Schwarm, 2026-07-18)
16 Low-Poly-Stadtprops, prozedural per bpy 5.0.1 vom Agenten-Schwarm gebaut (je Asset 1 Builder +
1 unabhängiger QA-Re-Import, 32 Agenten, 0 Fehler). Eigenwerke, keine externen Quellen:
Rutsche, Schaukel, Sandkasten, Wippe, Karussell (Spielplatz) · Marktstand, Brezel-/Süßwagen, Kiosk ·
Litfaßsäule, Briefkasten (CH), Hydrant, Bushäuschen, Blumenkübel · Picknicktisch, Ruderboot, Steg.
