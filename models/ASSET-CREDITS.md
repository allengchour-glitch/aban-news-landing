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
