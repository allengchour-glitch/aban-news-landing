# 🗺️ Meshy → „geile Map" für Neon Survivor (Pipeline + Prompts)

> Ziel: echte 3D-Modelle statt Box-Platzhalter → richtig gute Optik. Tool: `automation/meshy_gen.py`
> (Text→3D, gibt `.glb`). GLTFLoader ist gevendort: `js/vendor/GLTFLoader.js` (r128, passt zur Core-Version).

## ⚠️ Blocker (was ICH brauche)
`MESHY_API_KEY` ist in dieser Cloud-Session **nicht** gesetzt → ich kann Meshy von hier nicht aufrufen.
Zwei Wege, das zu lösen:
1. **Key in die Cloud-Umgebung legen** (Environment-Secret `MESHY_API_KEY`) → dann generiere + verdrahte ich alles autonom + screenshot-verifiziert.
2. **Lokaler Claude** (hat den Key): die Prompts unten laufen lassen, `.glb` ins Repo pushen → ich binde sie ein + teste.

## Dateiablage
- **Web-Spiel (Neon Survivor):** Modelle müssen **deployed** werden → Ordner **`/models/`** im Repo-Root
  (NICHT `game/`, das ist vom Build ausgeschlossen). `meshy_gen.py` schreibt nach `game/assets/` →
  für Web danach `cp game/assets/<name>.glb models/<name>.glb`.
- **Godot (später):** `game/assets/` reicht (Godot importiert glTF nativ).

## Prompts (Map / Arena — der „geile" Look)
Mit `python3 automation/meshy_gen.py "<prompt>" <name>` einzeln, oder ASSETS in `meshy_gen.py` erweitern.

| name | Prompt | ersetzt im Spiel |
|---|---|---|
| `tower` | `low-poly futuristic neon skyscraper tower, dark metal with glowing cyan edge strips, sci-fi cyberpunk, game asset` | Skyline-Pylone (Backdrop) |
| `obelisk` | `low-poly glowing neon obelisk monument, faceted crystal core, magenta emissive, sci-fi arena centerpiece` | Zentrales Emblem |
| `crystal` | `small low-poly glowing energy crystal cluster, cyan, faceted, sci-fi game prop` | Boden-Deko / Orbs |
| `ship` | `sleek low-poly neon hover drone, cyan glowing core, smooth, top-down arena hero, game asset` | Spieler |
| `enemy` | `low-poly menacing angular enemy drone, red glowing core, spiky, sci-fi game asset` | Gegner-Würfel |
| `boss` | `huge low-poly demonic mech boss, golden glowing armor, intimidating, sci-fi game boss` | Endboss |
| `gate` | `low-poly neon archway gate, glowing rings, sci-fi, game asset` | Arena-Tor/Deko |

Tipp: `--no-refine` spart Credits (nur Geometrie). Für „geil" lieber mit Textur (refine).

## Integration (mache ich, sobald `.glb` da sind — getestet)
1. `<script src="/js/vendor/GLTFLoader.js"></script>` nach `three.min.js` in `neon-survivor.html`.
2. Loader mit **Box-Fallback** (kein Regress, wenn ein Modell fehlt):
   ```js
   var MODELS={ tower:"/models/tower.glb", ship:"/models/ship.glb", enemy:"/models/enemy.glb" };
   var ldr=new THREE.GLTFLoader();
   function useModel(key,onLoad){ if(!MODELS[key])return; ldr.load(MODELS[key],
     function(g){onLoad(g.scene);}, undefined, function(){/* Box bleibt */}); }
   ```
3. Pro Ziel: geladenes `g.scene` klonen, skalieren, an Stelle des Box-Platzhalters einsetzen
   (Pylone/Spieler/Gegner/Boss). Emissive/Bloom bleibt → Neon-Look erhalten.
4. Verifizieren: `node tools/game_smoke.cjs neon-survivor.html` + Screenshot.

## Warum erst jetzt vorbereitet, nicht gebaut
Ohne echte `.glb` kann ich den Loader nicht testen → kein ungetesteter Blind-Code ins Live-Spiel.
GLTFLoader ist gevendort, Prompts + Recipe stehen → sobald Key/Modelle da sind, ist es ein Drop-in.
