# Neon-Fusion: duo + survivor + colossus + abyss → EIN Spiel (User-Auftrag 2026-07-13)

**Basis: neon-survivor.html** (kompletteste Schleife: 10-Min-Run, 5 Phasen, XP/Upgrades/Meta/Chars).
Alte Seiten danach als Redirect-Stubs (Muster neon-realm.html: meta refresh 3s + location.replace 2.5s + Fallback-Link).

## Was woher kommt
- **colossus → Boss-Engine**: COLOSSI-Array (Z.333: Wächter 900HP / Seraph 1300 / Nexus 1900, je 3 Phasen),
  buildBoss 277, bossThink 431, teleLine/teleRing-Telegraphie 327/329/551-563, Storm ab P2 (stormTick 181).
  In survivor als Boss-Wellen einbauen — Telegraphie ist der grösste Qualitätsgewinn.
  Modelle boss_warden/seraph/nexus.glb sind schon verdrahtet (loadModel/fitModel colossus Z.245-255 = kopierbare Einbau-Routine!).
- **abyss → Loot+Skills**: RARITY Z.209, AFFIX Z.210 (6 Affixe als f(p)-Mutationen), rollRarity 216, dropLoot 217,
  applyLoot 219; Skills Nova/Blink/Heilen mit CD-UI. Survivor hat RARITY+spawnLoot ohne Affixe → andocken.
- **duo → Koop-Stack**: /js/mp.js (233 Z., spielunabhängig: MP.host("survivor")/MP.join, 4-Zeichen-Code, Host-autoritativ,
  reliable/fast, Watchdog). net=null/'host'/'client' (duo Z.346), simFrame 770 / visFrame 796. KI-Partner updAI 717.
  Band-Mechanik updBand 561 (BAND_RANGE=15, DoT 16/s + Slow) als optionales Koop-Feature.
  Lokal: P1 WASD / P2 Pfeile.

## Konflikte (bei Merge zwingend lösen)
- Globale Namen: alle nutzen G/S, mat(), player, scene, enemies, spawnEnemy/hitEnemy/killEnemy, beep, loop, reset → Namespaces pro Modul.
- Keys: LEER = survivor-Ability vs colossus/duo-Dash/Hieb; Pfeile = survivor-Move vs P2; 1-3 = abyss-Skills vs duo-Emotes → zentrales Input-Mapping.
- UI-IDs: #hud/.overlay/#start/#over/#win/#muteBtn kollidieren → vereinheitlichen.
- localStorage: ns_/na_/co_/nd_ getrennt lassen (save-kompatibel).
- Renderer: nur EINE Instanz; survivor/abyss ACES+sRGB, colossus Schatten (mobil teuer) → Schatten optional.

## Optik-Overhaul („pixelig/keine Textur")
Grund: Gegner/Spieler in allen 4 = emissive Primitive. Fix:
- Gegner-GLBs: mn_slime(_spiky) swarm/splitter · mn_bat Flieger · mn_skeleton Standard · mn_zombie Tank ·
  mn_orc Nahkampf · mn_ghost Shooter · mn_golem Panzer · mn_demon(_blue)/mn_vampire Elite · mn_dragon/mn_yeti Boss · mn_mimic Loot-Trick.
  ⚠️ r128: skinned GLB nie klonen → fresh load / SkeletonUtils? Muster: fresh GLTFLoader().load pro Spawn + BBox-th-Normierung (wie neon-wildnis MOBS).
- Loot-Optik: wp_sword/staff/bow/dagger/hammer/axe/shield(_golden)/gem/coins/key/potion statt Oktaeder, nach Rarity.
- Held: char.glb (colossus/duo nutzen es), Alternativen class_mage/ranger/titan.glb → passt zu survivors CHARS.
- Boden: tex_cobble/stone/grass/dirt(+_n Normalmaps) statt Flat-Plane; HDR sky_1k.hdr als Environment/IBL.
- NEU beschafft (2026-07-13): textures/tex_neon_asphalt|concrete|container|corrugated|grate|metal_grid|metal_plate.jpg (PolyHaven CC0) für Arena-Boden/Deko.
- Gemeinsame Layer einmalig: Bloom-Shader (survivor+abyss identisch), beep(), Shader-Himmel/Sonne/Aurora, Pool-getMesh.

## Persistenz/Hooks
- survivor: ns_muted/best/name/profile/leaderboard/cores/meta/char/scrapTip (Z.611-765); Debug window.__ns Z.1011.
- abyss: na_muted/na_best · colossus: co_best · duo: nd_muted/nd_opt.

## Phasenplan
1. Fusion-Basis: survivor + colossus-Bosse (Telegraphie!) als Boss-Wellen + GLB-Bosse. Smoke+Playwright.
2. abyss-Loot (Affixe aufs bestehende RARITY) + 3 Skill-Slots.
3. duo-Koop: mp.js andocken (MP.host("nsurv")), lokal P2 Pfeile, KI-Partner, optional Band.
4. Optik: Gegner/Loot/Held-GLBs + Boden-Texturen + IBL; mobil dpr≤2, Schatten aus.
5. Redirects duo/colossus/abyss → Basis-Seite (+ Titel/SEO-Update, Spiele-Hub-Links anpassen).
