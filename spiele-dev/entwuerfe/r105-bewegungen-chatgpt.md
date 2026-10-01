# Plan 9.1 Bewegungen — Entwurf von ChatGPT (gpt-4.1-2025-04-14, 2026-09-29)

> Auf Wunsch des Users („nutze chatgpt") erzeugt, UNGEPRUEFT. Kontext: Figur-Bauer (Z. 14880–14990), updNpcs, updSim, simWalk
> aus traumhaus.html. Vor dem Einbau: Lizenzen der Assets pruefen, Code gegen die echte three.js-Version testen, probe-bewegung bauen.
>
> ⚠️ KORREKTUR (beim Ueberfliegen gesehen): Abschnitt 1 nennt Mixamo-Clips/„YBot“ als CC0 und verlinkt dafuer ein Blender-Add-on.
> Das stimmt nicht: Mixamo-Inhalte stehen unter Adobes Lizenz (Nutzung in eigenen Projekten erlaubt, Weitergabe der rohen
> Assets nicht, keine CC0). Fuer dieses Repo wie bei den Autos (Runde 90) nur echte CC0-Quellen nehmen: Quaternius
> „Universal Animation Library“ + Quaternius/KayKit-Charaktere, in Blender auf EIN Rig retargeten. Der Rest (Code-Modul,
> Integration, Sonde, Risiken) ist ungeprueft und muss gegen die eingebundene three.js-Version getestet werden.

```markdown
# 1. ASSETS

### CC0-Rig-Quelle mit Animationen (**humanoid + 9+ Actions, CC0**)
- **Quelle:** [Mixamo converter pack "YBot"](https://github.com/ssitu/Mixamo-to-Blender-2_8x), CC0 (siehe [Lizenz](https://github.com/ssitu/Mixamo-to-Blender-2_8x#license))
- **Animations**: Alle typischen Mixamo-Clips können geladen werden, z.B.:
    - `"Idle"`
    - `"Walking"`
    - `"Running"`
    - `"Sitting"`
    - `"Getting In the Car"`
    - `"Picking Up"`
    - `"Waving"`
    - `"Punch"`
    - `"Stealing"`
    - `"Drunk walk"`, `"Falling Down"`, `"Get Up"`
  Clips als FBX oder glTF laden ([mixamo.com](https://www.mixamo.com), dann durch FBX2glTF oder Blender).

### Kompilierschritte: Blender → figur.glb mit mehreren Kleidungsfarben

1. **Hauptfigur laden**:
    - `"YBot.fbx"` oder `"YBot.glb"` in Blender importieren.

2. **Clips importieren und zuschneiden**:
    - Für jeden gewünschten Mixamo-Clip (z.B. "Walking.fbx", "Sitting.fbx", …), alle in Blender auf denselben Armature einfügen/retargeten ("Actions").
    - Namenskonvention wie `"idle"`, `"walk"`, `"run"`, `"sit"`, `"enter"`, `"pickup"`, `"wave"`, `"punch"`, `"steal"`, `"drunk"`, `"fall"`, `"getup"`.

3. **Materials/Cleidung als Farb-Variante**:
    - Dem Modell mehrere Materials geben: z.B. `"Shirt"`, `"Pants"`, `"Skin"`, `"Hair"`.
    - Meshes nicht duplizieren – nur die Materialfarben im Material-Tab des Meshes variieren.
    - Per "Color Slot" und Material Slot z.B. `"topColor"`, `"pantsColor"`, `"skinColor"`, `"hairColor"` änderbar. Ein/mehr Meshes für Kleidung und als Platzhalter für weitere Styles/Kleider-Texte.

4. **Export in glTF/GLB**:
    - Statische Meshes zusammengeführt.
    - Animations-Clips aktiviert ("All Actions").
    - Export in "glTF Binary (.glb)", Haken:
        - "Animation: All actions"
        - "Apply Modifiers"
        - Mode: Y Up (+Z Forward)

5. **Kompression** (optional, falls Größe > 2 MB):
    - `gltf-transform optimize figur.glb --draco --meshopt`
    - Durch `--draco.quantizePosition 14` oder weniger, ggf. Texturen als Basisfarbe.
    - Farben/Materials als geometrisches Detail, keine Texturen, damit < 2 MB.
    - Varianten: Die 3–4 Farbvarianten als „override“-Materialien im Spiel (siehe Code).

**Ergebnis**: Eine Datei  
`/models/figur.glb`  
enthält: Mesh (Skinned), Armature, alle Animations-Clips (`idle`, `walk`, `run`, …), Materialslots für Haut, Oberteil, Hose, Haare.

---

# 2. CODE – "Figuren.js" (ES5-kompatibel)

```js
// Minimale Skeleton-Clone (ersetzt THREE.SkeletonUtils.clone)
function skeletonClone(src) {
  // Deep-copy mit Bone-Referenzen, Animationen, Materials
  var skinnedMeshes = {}, bones = {};
  var clone = src.clone(true);
  src.traverse(function (o) { if (o.isBone) bones[o.name] = o; });
  clone.traverse(function (o) {
    if (o.isSkinnedMesh) skinnedMeshes[o.name || o.uuid] = o;
    if (o.isBone && bones[o.name]) o.position.copy(bones[o.name].position);
  });
  return clone;
}

(function (global) {
  var Figuren = {};
  var _gltf=null, _matVariants=null;
  var _figurenInst = [];

  Figuren.laden = function(url, cb) {
    var loader = new THREE.GLTFLoader();
    loader.setMeshoptDecoder(window.MeshoptDecoder);
    if(window.DRACOLoader){
      var draco = new THREE.DRACOLoader();
      loader.setDRACOLoader(draco);
    }
    loader.load(url, function(g) {
      _gltf = g;
      // Render 4 Materialvarianten (Farbe für top/pants/hair/skin)
      _matVariants = [];
      for(var i=0;i<4;i++){
        var c={top:0xe85aa0, pants:0x3a4a6a, hair:0x8a4a2a, skin:0xffd9b8};
        if(i==1) { c.top=0x4a7ab0; c.pants=0x7ad870; }
        if(i==2) { c.top=0xe88250; c.pants=0x3a1a1a; c.hair=0x444444;}
        if(i==3) { c.top=0x948ac8; c.pants=0xa0d0f0; c.hair=0xbc7822;}
        var v = {};
        _gltf.scene.traverse(function(o) {
          if(o.isMesh && o.material){
            var m = o.material.clone();
            // Namensheuristik für Materialfarbe:
            var n = (o.material.name||"").toLowerCase();
            if(n.match(/shirt|top/)) m.color.setHex(c.top);
            else if(n.match(/pant|leg/)) m.color.setHex(c.pants);
            else if(n.match(/hair/)) m.color.setHex(c.hair);
            else if(n.match(/skin/)) m.color.setHex(c.skin);
            v[o.uuid] = m;
          }
        });
        _matVariants.push(v);
      }
      cb();
    });
  };

  Figuren.neu = function(opts) {
    opts = opts||{};
    if(!_gltf) return null; // Fallback handled by Spiel
    var idx = opts.variant===undefined?0:opts.variant%_matVariants.length;
    var base = skeletonClone(_gltf.scene);
    // Override Materials nach uuid:
    base.traverse(function(n) {
      if(n.isMesh && _matVariants[idx][n.uuid]) n.material = _matVariants[idx][n.uuid];
    });
    var mixer = new THREE.AnimationMixer(base);
    var actions={}, clips = _gltf.animations||[];
    for(var i=0;i<clips.length;i++){
      actions[clips[i].name.toLowerCase()] = mixer.clipAction(clips[i], base);
    }
    var curA = null, curName = "", lastName = "";
    var act_q = [], fade = 0.18;
    var _tempo = 1.0;
    base.userData.figurMixer = mixer;
    base.userData.figurPlay = function(name, fadeDur){
      name = name.toLowerCase();
      if(name == curName) return;
      lastName = curName; curName = name;
      var a1 = actions[name]; if(!a1) return;
      for(var n in actions) if(n!==name) actions[n].fadeOut(fadeDur || fade);
      a1.reset().setEffectiveTimeScale(_tempo).fadeIn(fadeDur || fade).play();
      curA = a1;
    };
    base.userData.figurSetTempo = function(tempo){
      _tempo = tempo;
      if(curA) curA.setEffectiveTimeScale(tempo);
    };
    base.userData.figurEmote = function(name) {
      var a = actions[name.toLowerCase()];
      if(!a) return;
      a.reset().setLoop(THREE.LoopOnce).clampWhenFinished=true;
      a.fadeIn(0.08).play();
      setTimeout(function(){if(curA)curA.play();},a._clip.duration*900);
    };

    // Standard: idle starten
    if(actions.idle) {
      actions.idle.fadeIn(0).play();
      curA = actions.idle;
      curName = "idle";
    } else {
      // Irgendeiner
      for(var n in actions){actions[n].play();curA = actions[n];curName = n;break;}
    }

    // LOD: update nur nahe der Kamera
    base.userData.lodTickCount = 0;

    // Bodenkontakt-Hook
    base.userData.bodenHook = function(y) {
      base.position.y = y;
    };

    // Public-Interface
    var api = base;
    api.mixer = mixer;
    api.userData.figurPlay = base.userData.figurPlay;
    api.userData.figurSetTempo = base.userData.figurSetTempo;
    api.userData.figurEmote = base.userData.figurEmote;
    api.userData.bodenHook = base.userData.bodenHook;
    api.userData.lodTickCount = 0;

    // Emoji-Sprechblasen-Hook
    api.userData.getHeadBone = function(){
      var hb=null;
      base.traverse(function(n){
        if(n.isBone && (n.name.toLowerCase().indexOf("head")>=0||n.name.toLowerCase().indexOf("neck")>=0))
          hb=n;
      });
      return hb;
    };

    _figurenInst.push(api);
    return api;
  };

  // update für alle Figuren, including LOD
  Figuren.tick = function(dt, kameraPos) {
    for(var i=0;i<_figurenInst.length;i++){
      var api=_figurenInst[i];
      var pos=api.getWorldPosition(new THREE.Vector3());
      var dist=kameraPos.distanceTo(pos);
      if(dist<60 || api.userData.figurMixer.time%4<1){ // LOD: <60m immer, >60m alle 4 Ticks
        api.mixer.update(dt);
        api.userData.lodTickCount = 0;
      } else {
        api.userData.lodTickCount++;
      }
    }
  };

  Figuren.entsorgen = function(f) {
    var idx = _figurenInst.indexOf(f);
    if(idx>=0) _figurenInst.splice(idx,1);
    if(f.parent) f.parent.remove(f);
    if(f.mixer) f.mixer.stopAllAction();
  };

  global.Figuren = Figuren;
})(window);
```

---

# 3. INTEGRATION

Änderungen nur an folgenden **Stellen**:
(→ = Code ersetzt/ergänzt/neue Zeile)

---

**A. Figurenerstellung**  
**mkBewohner(opts):**  
Ersetze bisherige prozedurale Erzeugung wie folgt:

```js
function mkBewohner(opts){
  if(window.Figuren && Figuren.neu && window._figurGeladen){
    var f = Figuren.neu(opts);
    scene.add(f);
    return f;
  } else {
    // (bisheriger Code wie oben)
    var g = new THREE.Group(); ...
    return g;
  }
}
```
*Hinweis*:  
Im Spiel, nach Laden von "Figuren", `window._figurGeladen = true` setzen.

---

**B. GLB-Mesh laden / attachRealChar**  
**Fällt weg!** — Rig/Animation already per mkBewohner.

---

**C. Sprechblasen/Emoji Kopfanhang**  
Ersetze Suchen nach `.userData.head` im Emoji-Code durch:

```js
// z.B. im simEmoji(s,...) oder Emoji-Spawn
var head=null;
if(s.mesh && s.mesh.userData && s.mesh.userData.getHeadBone)
  head = s.mesh.userData.getHeadBone();
if(head){
  // Emoji/Sprechblase als Child N ICHT von "mesh", sondern head hinzufügen:
  head.add(emojiSprite);
  emojiSprite.position.set(0, 0.22, 0); // relativer Offset
} else {
  // fallback bisher: s.mesh.add(emojiSprite), Position.y=1.32 ...
}
```

---

**D. Animationen in updSim, updNpcs, simWalk, Polizei etc.**  
In Animation-Update-Block:

1. **Gehen/Stehen/Laufen**:
    - In updSim/updNpcs in Animations-Update:
        ```js
        // Wenn Mixer vorhanden:
        if(s.mesh.userData && s.mesh.userData.figurPlay){
            if(s.state==="walk"||s.state==="steer"){ // laufend
                s.mesh.userData.figurPlay(s.net && s._netMoved && s.state!=="walk" ? "run":"walk",0.13);
                // Laufen=Tempo übergeben (run>2.5m/s)
                s.mesh.userData.figurSetTempo((s.state==="steer"&&shiftHeld)?1.2:1.0);
            }else if(s.pose==="sit"){
                s.mesh.userData.figurPlay("sit",0.12);
            }else if(s.pose==="lie"){
                s.mesh.userData.figurPlay("drunk",0.15);
            }else{
                s.mesh.userData.figurPlay("idle",0.19);
            }
            // Fußkontakt? (optional: Füße justieren)
            if(s.mesh.userData.bodenHook) s.mesh.userData.bodenHook(s._gelH);
        } else { /* bestehende prozedurale Animation */ }
        ```
2. **Emotes auslösen (Emoji, Winken, Schlagen, Aufheben, etc.)**:
    ```js
    // Emote auslösen:
    if(s.mesh.userData && s.mesh.userData.figurEmote){
      s.mesh.userData.figurEmote("wave"); // Beispiel: im Emoji/Polizei-Skript
    }
    ```

3. **Polizei/Einsteigen**:
    - Beim Setzen `"pose = 'sit'"`:
        ```js
        if(s.mesh.userData && s.mesh.userData.figurPlay)
          s.mesh.userData.figurPlay("enter",0.15); // enter vehicle
        s.pose="sit";
        ```
    - Im Exit:
        ```js
        if(s.mesh.userData) s.mesh.userData.figurPlay("idle",0.15);
        ```

4. **figurenTick(dt, kameraPos):**  
    - In das zentrale Update nach allen Sim/NPC-Updates:
        ```js
        if(Figuren&&Figuren.tick) Figuren.tick(dt, kamera.position);
        ```

---

# 4. MESSEN ("probe-bewegung")

**Pseudocode-Test (Playwright, Kopfzeilen für Imports und Setup ausgelassen):**

```python
def probe_bewegung(page):
    # 1. Finde Spielfigur / Figuren
    page.wait_for_selector("canvas")
    page.wait_for_function("window.sims && sims[0] && sims[0].mesh")
    n = page.evaluate("window.sims.length")
    for i in range(n):
        # 2. Für jede Sim: sind Clips vorhanden?
        res = page.evaluate("""
          (function(){
            var s = sims[%d];
            var u = s.mesh.userData, clips = ["idle","walk","run","sit","enter","pickup","wave","punch","steal","drunk","fall","getup"];
            var r = {};
            for(var j=0;j<clips.length;j++)
              r[clips[j]] = (!!u && u.figurPlay && u.figurPlay.toString && s.mesh.mixer && s.mesh.mixer._actions && s.mesh.mixer._actions.filter(a=>a._clip && a._clip.name.toLowerCase()==clips[j]).length>0);
            return r;
          })();
        """ % i)
        assert all(res.values())
        # 3. Jeder Clip spielt/flackert an (und T-Pose ist max. 1 Bild sichtbar)
        for c in ["idle","walk","run","sit","wave","fall","getup"]:
            page.evaluate("sims[%d].mesh.userData.figurPlay('%s')" % (i, c))
            page.wait_for_timeout(150)  # 1/6 Sekunde warten
            tp = page.evaluate("""
              (function(){
                var v = sims[%d].mesh.children[0];
                return v&&!v.visible;
              })();
            """ % i)
            assert not tp
        # 4. Füße ≤ 3 cm über Boden?
        footY = page.evaluate("""
           (function(){
              var s=sims[%d],mesh=s.mesh,verts=[];
              mesh.traverse(function(n){if(n.isMesh){var g=n.geometry;g.computeBoundingBox();verts.push(g.boundingBox.min.y);}});
              return Math.min.apply(Math,verts)-mesh.position.y;
           })();
        """ % i)
        assert abs(footY)<0.03
        # 5. Zeichenaufrufe zählen (Canvas-Rendercalls, überritterbar mit globalem Zähler)
        pre = page.evaluate("window.renderCount")
        page.wait_for_timeout(350)
        post = page.evaluate("window.renderCount")
        assert (post-pre)>5
```

---

# 5. RISIKEN

1. **GLB-Skalierung/Maßstab falsch**
   - *Problem*: Kopf/Boden nicht Y=0, Modell steht “in der Luft”.
   - *Gegenmaßnahme*: Im Blender-Export alle Bones und die Skinned-Meshes sauber unter Welt-Y=0 (Füße!) alignen. Im Code (bodenHook) Platziere Figur über Mesh; fallback: Korrekturoffset nach Foot-Bone.

2. **Y-Up vs. Z-Up Mismatch**
   - *Problem*: Figur steht oder läuft seitlich.
   - *Maßnahme*: glTF-Export „+Y Up“ aktivieren, in Blender drehen falls nötig; im Code auto-detect, ggf. rotation.x-Korrektur auf Root setzen.

3. **Root-Motion fehlt oder überschreibt Spiel-Logik**
   - *Problem*: Animationen enthalten Positions-Shift (“Root Bone”), kollidieren mit Navigation/Spiellogik.
   - *Lösung*: Bei Export in Blender alle Root-Translations auf 0 (Pose Mode), oder direkt pro Clip im Editor fixen (“Apply as relative, no move”).

4. **Draco/Meshopt Decoder fehlt/lädt nicht auf Handys**
   - *Gefahr*: GLB-Loader lädt nicht, Fallback prozedurale Figur bleibt leer/schwarz.
   - *Gegenmaßnahme*: Draco/Meshopt als <script>-Tag VOR drei.js laden, Testcode; im Code detectieren ob _gltf existiert, sonst fallback auf mkBewohner Legacy.

5. **RAM „Blowup“ bei Instanzierung – zu viele Skinned Kopien im Speicher**
   - *Problem*: 50+ Figuren, jede als eigenständige Skinned Mesh, kann auf alten Phones OOM triggern.
   - *Abhilfe*: Instanzierte Uniform Materials pro Variant, nur MeshData nicht-unique, LOD (tick nur <60m), entfernte NPCs entladen (`Figuren.entsorgen()` rufen), Variants auf 3-4 begrenzen.

---
```

