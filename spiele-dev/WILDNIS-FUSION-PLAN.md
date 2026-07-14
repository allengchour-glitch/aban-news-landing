# Wildnis-Fusion: flug + jump + racer als Aktivitäten IN neon-wildnis (User-Auftrag 2026-07-13)

Basis: neon-wildnis.html (2860 Z., enthält schon Realm). Spawn-Stadt = (0,0), villages[] @1215 (Dorf 0 = big Spawn-Hauptstadt,
ringR=42, 22 Häuser @1504-1514). Welt-Reihenfolge: placeResources @328 → decorateWorld @1408 (layRoads @1034,
layVillagePaths @1066, decoVillageExtras @1276) → decorateWorldLate @1318 (farScatter/spotFar @1321f — HIER Stationen einbauen).

## Einbettungs-Strategie (Scout-Empfehlung): IFRAME-OVERLAY für alle 3
Erprobtes Lebenspfad-Muster: openMiniGame @3188 / 'mini-back' @3187 / closeMiniGame+onDone @3199.
Pro Spiel nachrüsten: (a) ?station-Param überspringt Startscreen, (b) bei Game-Over parent.postMessage('mini-back','*'),
(c) Belohnung via onDone → __nw.give('crystal',n)/Badge. Welt beim Overlay PAUSIEREN (2 WebGL-Kontexte = 5-10fps sonst).
- neon-flug (544 Z.): Rail-Flyer; loop @454, start @351, doDash @257, offerUpgrade @315. → Iframe „Flugfeld".
- neon-jump (742 Z.): Side-Platformer, buildLevel @297, doJump @515. → Iframe „Parcours" (native = Rewrite).
- neon-racer (585 Z.): Endlos-Racer, centerX @139, Zustand @441. → Iframe MVP „Rennstrecke"; nativ nur falls nahtlos gefordert.

## Stationen-Einbau in der Wildnis
- 3× spotFar in decorateWorldLate (Flugfeld spotFar(55), Parcours spotFar(60), Rennstrecke spotFar(75)) ODER Stadt-Kante ringR+20.
- Marker-Props (Windsack/Start-Banner dk2_banner/Karo-Bogen), Trigger: nearStation in findNear @2096, Dispatch in harvest @2134.
- Registry stations[] analog villages; Debug __nw.toStation(i). Minimap-Icons @2561.
- Quest-Brett am Spawn verweist auf Stationen (Text-Sprite-Muster @2673).

## „Home viel coole Sachen" — 10 Hub-Details (alle mit vorhandenen Assets machbar)
1 Marktplatz mit fd_pie/sausage/burger + Markt-NPC · 2 item_fountain + fn_bench/fn_stool + rastende NPCs ·
3 Taverne bd_inn + ftk_lantern + Warmlicht + Musikant-NPC · 4 Schmiede: sv_hammer/axe + Funken (burst) + Forge-Glow ·
5 Quest-Aushang-Brett · 6 Tier-Cluster ums Zentrum (regCritter @1338: an_dog/cat/chicken) ·
7 ftk_lantern entlang layRoads/Paths (Nacht!) · 8 Wassermühle am Fluss (buildRiver @1629, mkWindmillLive-Variante) ·
9 Bauernhof: cc0_fence-Pferch + an_cow/an_pig · 10 die 3 Stations-Tore als sichtbare Landmarken.

## Blender-Pipeline (RUNBOOK §Phase 2b @181-189, Teil 4 @321-340)
blender -b -P spiele-dev/blender_<name>.py → plain GLB (Draco AUS!) → gltf-transform resize 512/1024 + simplify 0.05 + prune/dedup → <500KB.
NIE webp-texture-compress (bricht r128). Kenney: automation/polish_kenney_glb.py (Textur EINBETTEN).
Neu zu schreiben: blender_station_props.py (Windsack, Karo-Startbogen, Zielbanner) nach Vorlage blender_nature.py
(benannte Objekte → cc0inst/loadCC0 @987/1001).

## Koop-Hinweis
Wildnis-Koop (?coop=CODE @2697) bleibt; Stationen im Koop: Overlay nur lokal, Partner sieht „ist im Flugfeld"-Blase (Statusflag via sendFast).

## Reihenfolge
1) Stationen+Tore+Trigger in Wildnis (Iframe-Overlay + mini-back-Nachrüstung in flug/jump/racer, Belohnungs-Rückkanal).
2) Hub-Details 1-10 + blender_station_props.py.
3) Redirects: neon-flug/jump/racer.html → neon-wildnis.html (Realm-Muster), Spiele-Hub-Links anpassen.
