import { AdaptiveScale } from "./timing.mjs";
import { LEVELS, routeCache, eventX, clamp, LANE_WIDTH } from "./core.mjs";
const T = window.THREE;
function mesh(g, m, x = 0, y = 0, z = 0) {
  const a = new T.Mesh(g, m);
  a.position.set(x, y, z);
  return a;
}
// Statische Teile mit gleichem Material in einen Zeichenauftrag zusammenfassen.
function compact(group) {
  for (const child of group.children.slice()) if (child.isGroup) compact(child);
  const batches = new Map(),
    originals = new Set();
  for (const child of group.children.slice()) {
    if (!child.isMesh || child.name || Array.isArray(child.material)) continue;
    child.updateMatrix();
    const g = (
      child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone()
    ).applyMatrix4(child.matrix);
    if (!batches.has(child.material)) batches.set(child.material, []);
    batches.get(child.material).push(g);
    originals.add(child.geometry);
    group.remove(child);
  }
  for (const [material, parts] of batches) {
    const combined = new T.BufferGeometry();
    for (const name of ["position", "normal", "uv"]) {
      if (!parts.every((g) => g.attributes[name])) continue;
      const size = parts[0].attributes[name].itemSize,
        data = new Float32Array(
          parts.reduce((n, g) => n + g.attributes[name].array.length, 0),
        );
      let at = 0;
      for (const g of parts) {
        data.set(g.attributes[name].array, at);
        at += g.attributes[name].array.length;
      }
      combined.setAttribute(name, new T.BufferAttribute(data, size));
    }
    combined.computeBoundingSphere();
    const item = mesh(combined, material);
    item.name = "staticBatch";
    group.add(item);
    for (const g of parts) g.dispose();
  }
  for (const g of originals) g.dispose();
}
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d"),
    g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.12, "#ffffffcc");
  g.addColorStop(0.4, "#ffffff35");
  g.addColorStop(1, "#fff0");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(c);
}
function hullGeometry() {
  const s = new T.Shape();
  [
    [-0.13, -2.3],
    [-0.46, -0.7],
    [-2.25, 0.9],
    [-2.15, 1.35],
    [-0.62, 0.8],
    [-0.42, 1.5],
    [0.42, 1.5],
    [0.62, 0.8],
    [2.15, 1.35],
    [2.25, 0.9],
    [0.46, -0.7],
    [0.13, -2.3],
  ].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const g = new T.ExtrudeGeometry(s, {
    depth: 0.19,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.09,
    bevelThickness: 0.08,
  });
  g.rotateX(Math.PI / 2);
  return g;
}
function ship(color, tex) {
  const group = new T.Group(),
    white = new T.MeshStandardMaterial({
      color: 0x7f929c,
      metalness: 0.65,
      roughness: 0.27,
    }),
    dark = new T.MeshStandardMaterial({
      color: 0x16252e,
      metalness: 0.65,
      roughness: 0.28,
    }),
    accent = new T.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.3,
    });
  group.add(mesh(hullGeometry(), white));
  const spine = mesh(new T.SphereGeometry(0.5, 20, 12), dark, 0, 0.13, -0.35);
  spine.scale.set(0.65, 0.5, 2.9);
  group.add(spine);
  const glass = mesh(
    new T.SphereGeometry(0.38, 24, 12),
    new T.MeshStandardMaterial({
      color: 0x244a60,
      emissive: 0x122b3d,
      metalness: 0.95,
      roughness: 0.12,
    }),
    0,
    0.32,
    -0.65,
  );
  glass.scale.set(0.8, 0.6, 1.8);
  group.add(glass);
  const stripe = new T.BoxGeometry(0.075, 0.04, 1.7);
  for (const sign of [-1, 1]) {
    group.add(mesh(stripe, accent, sign * 0.42, 0.16, -0.15));
    const wingStripe = mesh(
      new T.BoxGeometry(0.13, 0.05, 1.55),
      accent,
      sign * 1.2,
      0.16,
      0.7,
    );
    wingStripe.rotation.y = sign * -0.83;
    group.add(wingStripe);
    const engine = mesh(
      new T.CylinderGeometry(0.21, 0.27, 0.95, 12),
      dark,
      sign * 0.63,
      -0.1,
      0.85,
    );
    engine.rotation.x = Math.PI / 2;
    group.add(engine);
    const nozzle = mesh(
      new T.TorusGeometry(0.19, 0.045, 6, 16),
      accent,
      sign * 0.63,
      -0.1,
      1.37,
    );
    group.add(nozzle);
    const flame = mesh(
      new T.ConeGeometry(0.15, 1.6, 12),
      new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
      sign * 0.63,
      -0.1,
      2.1,
    );
    flame.rotation.x = Math.PI / 2;
    flame.name = "flame";
    group.add(flame);
    const sprite = new T.Sprite(
      new T.SpriteMaterial({
        map: tex,
        color,
        transparent: true,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sprite.position.set(sign * 0.63, -0.1, 1.6);
    sprite.scale.set(2.6, 2.6, 1);
    sprite.name = "engineGlow";
    group.add(sprite);
    const fin = mesh(
      new T.BoxGeometry(0.07, 0.5, 0.7),
      accent,
      sign * 0.75,
      0.21,
      1,
    );
    fin.rotation.z = sign * -0.35;
    group.add(fin);
  }
  for (let i = 0; i < 4; i++)
    group.add(
      mesh(new T.BoxGeometry(0.37, 0.03, 0.04), dark, 0, 0.21, 0.35 + i * 0.16),
    );
  const guard = mesh(
    new T.SphereGeometry(2.5, 16, 8),
    new T.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    }),
    0,
    0,
    -0.15,
  );
  guard.scale.set(1, 0.25, 1.05);
  guard.name = "guard";
  guard.visible = false;
  group.add(guard);
  group.userData.color = color;
  compact(group);
  return group;
}
function terrain(seed, side) {
  const g = new T.PlaneGeometry(46, 240, 24, 80);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      edge = (x + 23) / 46;
    const ridge = Math.pow(side > 0 ? edge : 1 - edge, 1.7);
    const noise =
      Math.sin(x * 0.36 + seed) * Math.cos(z * 0.12 + seed) * 3 +
      Math.sin(z * 0.053 + x * 0.2) * 5 +
      Math.sin(x * 1.7 + z * 0.25) * 0.6;
    const h =
      -5 +
      ridge * (15 + noise) +
      Math.max(0, ridge - 0.2) * Math.abs(Math.sin(z * 0.07 + seed)) * 12;
    p.setY(i, h);
  }
  g.computeVertexNormals();
  return g;
}
export class FlightView {
  constructor(container) {
    if (!T) throw Error("Three.js konnte nicht geladen werden.");
    this.container = container;
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.outputEncoding = T.sRGBEncoding;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.88;
    container.append(this.renderer.domElement);
    this.scene = new T.Scene();
    this.scene.fog = new T.FogExp2(0x29303c, 0.0065);
    this.camera = new T.PerspectiveCamera(70, 1, 0.15, 650);
    this.camera.position.set(0, 5, 14);
    this.tex = glowTexture();
    this.level = -1;
    this.low = false;
    this.reduced = false;
    this.warmed = false;
    this.clock = 0;
    this.travel = 0;
    this.local = 0;
    this.oldPositions = [-2, 2];
    this.effects = [];
    this.scene.add(new T.HemisphereLight(0x809db6, 0x251a19, 0.65));
    this.sunLight = new T.DirectionalLight(0xffb67c, 1.3);
    this.sunLight.position.set(-28, 30, -65);
    this.scene.add(this.sunLight);
    this.rimLight = new T.DirectionalLight(0x9cdaff, 0.5);
    this.rimLight.position.set(15, 8, 12);
    this.scene.add(this.rimLight);
    this.skyUniforms = {
      top: { value: new T.Color(0x111c2e) },
      bottom: { value: new T.Color(0xc28860) },
      time: { value: 0 },
      mode: { value: 0 },
    };
    const skyMat = new T.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: T.BackSide,
      depthWrite: false,
      vertexShader:
        "varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec3 vP;uniform vec3 top;uniform vec3 bottom;uniform float time;uniform float mode;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}void main(){vec3 d=normalize(vP);float h=clamp(d.y*1.5+.1,0.,1.);vec3 col=mix(bottom,top,pow(h,.55));vec2 uv=d.xz/(abs(d.y)+.25)*2.;float n=noise(uv+time*.001)*.55+noise(uv*2.)*.25+noise(uv*4.)*.13;float clouds=smoothstep(.45,.7,n)*smoothstep(.01,.25,d.y);col=mix(col,bottom*.7,clouds*.45);float sun=pow(max(dot(d,normalize(vec3(-.35,.13,-1.))),0.),350.);col+=vec3(1.,.68,.34)*sun*(1.-mode*.3);float stars=step(.998,hash(floor(d.xz/(abs(d.y)+.3)*600.)))*smoothstep(.15,.5,d.y)*mode;col+=stars*.5;gl_FragColor=vec4(col,1.);}`,
    });
    this.scene.add(mesh(new T.SphereGeometry(500, 32, 20), skyMat));
    this.terrain = [];
    this.rockMat = new T.MeshStandardMaterial({
      color: 0x242b32,
      roughness: 0.92,
      flatShading: true,
      metalness: 0.08,
    });
    this.rockMat.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "varying vec3 vRock;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvRock=position;",
        );
      shader.fragmentShader =
        "varying vec3 vRock;\n" +
        shader.fragmentShader.replace(
          "#include <color_fragment>",
          "#include <color_fragment>\nfloat strata=sin(vRock.y*3.2+sin(vRock.z*.07)*1.2)*.09+sin(vRock.y*15.)*.035;float detail=sin(vRock.x*9.+sin(vRock.z*3.))*sin(vRock.z*12.)*.035;diffuseColor.rgb*=.85+strata+detail;",
        );
    };
    for (let j = 0; j < 3; j++) {
      const part = new T.Group();
      for (const side of [-1, 1]) {
        const a = mesh(
          terrain(4 + j * 7, side),
          this.rockMat,
          side * 44,
          -0.2,
          -120,
        );
        part.add(a);
      }
      this.scene.add(part);
      this.terrain.push(part);
    }
    this.waterUniforms = {
      time: { value: 0 },
      accent: { value: new T.Color(0xd69970) },
      base: { value: new T.Color(0x182d3a) },
    };
    this.water = new T.Mesh(
      new T.PlaneGeometry(42, 650, 1, 1),
      new T.ShaderMaterial({
        uniforms: this.waterUniforms,
        vertexShader:
          "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: `varying vec2 vUv;uniform float time;uniform vec3 accent;uniform vec3 base;void main(){float a=sin(vUv.y*1300.-time*8.+sin(vUv.x*50.)*2.);float b=sin(vUv.y*630.-time*4.+vUv.x*36.);float center=pow(max(0.,1.-abs(vUv.x-.38)*2.),5.);float shine=pow(max(0.,a*b),7.)*center;vec3 c=base+accent*shine*.4;float line=pow(max(0.,sin(vUv.x*230.+vUv.y*100.)),15.);gl_FragColor=vec4(c+line*.012,1.);}`,
      }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(0, -4.6, -280);
    this.scene.add(this.water);
    this.cliffs = [];
    const cliffGeo = new T.CylinderGeometry(0.65, 1, 1, 7, 10),
      cliffMat = new T.MeshStandardMaterial({
        color: 0x372d28,
        roughness: 0.94,
        flatShading: true,
      });
    const rockVertices = cliffGeo.attributes.position;
    for (let i = 0; i < rockVertices.count; i++) {
      const y = rockVertices.getY(i);
      const rough = 0.96 + Math.sin(y * 55) * 0.06;
      rockVertices.setX(i, rockVertices.getX(i) * rough);
      rockVertices.setZ(i, rockVertices.getZ(i) * rough);
    }
    cliffGeo.computeVertexNormals();
    this.cliffMat = cliffMat;
    this.cliffGeo = cliffGeo;
    new T.TextureLoader().load(
      "/assets/neon-flug/basalt-v1.webp",
      (texture) => {
        texture.encoding = T.sRGBEncoding;
        texture.wrapS = texture.wrapT = T.RepeatWrapping;
        texture.repeat.set(1.4, 5);
        texture.anisotropy = Math.min(
          4,
          this.renderer.capabilities.getMaxAnisotropy(),
        );
        cliffMat.color.set(0xb7afa2);
        cliffMat.map = texture;
        cliffMat.bumpMap = texture;
        cliffMat.bumpScale = 0.13;
        cliffMat.needsUpdate = true;
        const ground = texture.clone();
        ground.needsUpdate = true;
        ground.repeat.set(6, 20);
        this.rockMat.color.set(0x9b9b9b);
        this.rockMat.map = ground;
        this.rockMat.bumpMap = ground;
        this.rockMat.bumpScale = 0.2;
        this.rockMat.needsUpdate = true;
      },
    );
    for (let part = 0; part < 2; part++) {
      const rocks = new T.InstancedMesh(cliffGeo, cliffMat, 160);
      const dummy = new T.Object3D();
      for (let j = 0; j < 160; j++) {
        const side = j % 2 ? 1 : -1,
          along = Math.floor(j / 2);
        const height = 9 + Math.sin(along * 1.3) * 4 + ((along * 7) % 15);
        dummy.position.set(
          side * (22 + Math.sin(along * 0.7) * 2),
          height / 2 - 6,
          -along * 5,
        );
        dummy.scale.set(2.4 + ((along * 3) % 4), height, 3.8);
        dummy.rotation.set(0, along * 2.1, Math.sin(along) * 0.08);
        dummy.updateMatrix();
        rocks.setMatrixAt(j, dummy.matrix);
      }
      this.scene.add(rocks);
      this.cliffs.push(rocks);
    }
    this.props = [];
    const ruin = new T.MeshStandardMaterial({
      color: 0x1e2933,
      roughness: 0.85,
      metalness: 0.22,
    });
    const trim = new T.MeshStandardMaterial({
      color: 0xadeee6,
      emissive: 0x72c5c4,
      emissiveIntensity: 0.65,
    });
    this.propMatrix = new T.Object3D();
    this.propBatches = [
      new T.InstancedMesh(new T.BoxGeometry(1.8, 1, 2.4), ruin, 26),
      new T.InstancedMesh(new T.BoxGeometry(0.05, 1, 2.5), trim, 26),
      new T.InstancedMesh(new T.BoxGeometry(3, 0.7, 3.4), ruin, 26),
    ];
    for (const batch of this.propBatches) {
      batch.frustumCulled = false;
      this.scene.add(batch);
    }
    for (let i = 0; i < 26; i++)
      this.props.push({
        x: (i % 2 ? -1 : 1) * (19 + ((i * 7) % 9)),
        height: 8 + ((i * 13) % 19),
      });
    this.arch = new T.Group();
    const stone = new T.MeshStandardMaterial({
      color: 0x33424f,
      metalness: 0.5,
      roughness: 0.4,
    });
    const hoop = mesh(new T.TorusGeometry(24, 1.3, 6, 72), stone, 0, 15, -285);
    this.arch.add(hoop);
    const halo = mesh(
      new T.TorusGeometry(22.7, 0.18, 5, 96),
      trim,
      0,
      15,
      -285,
    );
    this.arch.add(halo);
    for (const side of [-1, 1])
      this.arch.add(
        mesh(new T.BoxGeometry(3, 25, 4), stone, side * 23, 2, -285),
      );
    this.scene.add(this.arch);
    this.ships = [ship(0x80e9e3, this.tex), ship(0xffab69, this.tex)];
    for (const a of this.ships) this.scene.add(a);
    const linkGeo = new T.BufferGeometry();
    linkGeo.setAttribute(
      "position",
      new T.BufferAttribute(new Float32Array(33 * 3), 3),
    );
    this.link = new T.Line(
      linkGeo,
      new T.LineBasicMaterial({
        color: 0x85e7dd,
        transparent: true,
        opacity: 0.5,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.scene.add(this.link);
    this.trails = [];
    for (let i = 0; i < 2; i++) {
      const geom = new T.BufferGeometry(),
        pos = new Float32Array(42 * 3),
        col = new Float32Array(42 * 3);
      for (let j = 0; j < 42; j++) {
        let c = new T.Color(i ? 0xffad71 : 0x7ce7ed).multiplyScalar(
          (1 - j / 42) * 0.8,
        );
        c.toArray(col, j * 3);
        pos[j * 3 + 2] = 1 + j * 0.5;
      }
      geom.setAttribute("position", new T.BufferAttribute(pos, 3));
      geom.setAttribute("color", new T.BufferAttribute(col, 3));
      const trail = new T.Points(
        geom,
        new T.PointsMaterial({
          size: 0.55,
          map: this.tex,
          vertexColors: true,
          transparent: true,
          blending: T.AdditiveBlending,
          depthWrite: false,
        }),
      );
      this.scene.add(trail);
      this.trails.push(trail);
    }
    this.events = [];
    this.ringMat = new T.MeshStandardMaterial({
      color: 0x9e8d70,
      metalness: 0.75,
      roughness: 0.27,
    });
    this.ringGlow = new T.MeshBasicMaterial({ color: 0x98ebdf });
    this.hazardMat = new T.MeshStandardMaterial({
      color: 0x3a2834,
      emissive: 0x37151a,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.6,
    });
    this.warnMat = new T.MeshBasicMaterial({ color: 0xff7867 });
    this.beacon = new T.Group();
    const beam = mesh(
      new T.CylinderGeometry(0.14, 0.8, 120, 20),
      new T.MeshBasicMaterial({
        color: 0xffd5a1,
        transparent: true,
        opacity: 0.3,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
      0,
      40,
      0,
    );
    this.beacon.add(beam);
    for (let i = 0; i < 3; i++) {
      const r = mesh(
        new T.TorusGeometry(5 + i * 1.5, 0.12, 8, 64),
        trim,
        0,
        i * 2,
        0,
      );
      this.beacon.add(r);
    }
    this.scene.add(this.beacon);
    const pgeo = new T.BufferGeometry(),
      pp = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      pp[i * 3] = (Math.random() - 0.5) * 80;
      pp[i * 3 + 1] = Math.random() * 40;
      pp[i * 3 + 2] = -Math.random() * 300;
    }
    pgeo.setAttribute("position", new T.BufferAttribute(pp, 3));
    this.dust = new T.Points(
      pgeo,
      new T.PointsMaterial({
        map: this.tex,
        size: 0.12,
        color: 0xffdfbc,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    this.scene.add(this.dust);
    this.rain = new T.LineSegments(
      new T.BufferGeometry(),
      new T.LineBasicMaterial({
        color: 0x9fe2ed,
        transparent: true,
        opacity: 0.25,
      }),
    );
    const rp = new Float32Array(180 * 6);
    for (let i = 0; i < 180; i++) {
      const x = (Math.random() - 0.5) * 45,
        y = Math.random() * 40,
        z = -Math.random() * 100;
      rp.set([x, y, z, x - 0.6, y - 1.5, z + 0.3], i * 6);
    }
    this.rain.geometry.setAttribute("position", new T.BufferAttribute(rp, 3));
    this.scene.add(this.rain);
    this.setLevel(0);
    this.resize = () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
    };
    addEventListener("resize", this.resize);
    this.adaptive = new AdaptiveScale();
    this.quality("auto");
    this.resize();
  }
  quality(value) {
    this.qualityMode = value;
    this.adaptive.reset();
    this.low =
      value === "low" ||
      (value === "auto" &&
        (navigator.maxTouchPoints > 0 || navigator.hardwareConcurrency <= 4));
    this.baseRatio = Math.min(
      devicePixelRatio,
      value === "low" ? 0.8 : this.low ? 1.15 : 1.5,
    );
    this.renderer.setPixelRatio(this.baseRatio);
    this.dust.visible = !this.low;
  }
  setLevel(i) {
    if (this.level === i) return;
    this.level = i;
    const l = LEVELS[i];
    this.scene.fog.color.set(l.fog);
    this.skyUniforms.top.value.set(l.sky);
    this.skyUniforms.bottom.value.set(
      i === 0 ? 0xbc8765 : i === 1 ? 0x426271 : 0x5f527c,
    );
    this.skyUniforms.mode.value = i === 2 ? 1 : 0;
    this.sunLight.color.set(l.accent);
    this.sunLight.intensity = i === 0 ? 1.3 : i === 1 ? 0.7 : 0.45;
    this.waterUniforms.accent.value.set(l.accent);
    this.rain.visible = i === 1;
    for (const g of this.events) {
      this.scene.remove(g);
      g.traverse((x) => {
        if (x.geometry) x.geometry.dispose();
        if (x.isSprite) x.material.dispose();
      });
    }
    this.events = [];
    for (const e of routeCache[i]) {
      const g = new T.Group();
      if (e.type === "ring" || e.type === "duet") {
        g.add(mesh(new T.TorusGeometry(2, 0.11, 8, 40), this.ringMat));
        g.add(mesh(new T.TorusGeometry(1.85, 0.055, 6, 48), this.ringGlow));
        const halo = new T.Sprite(
          new T.SpriteMaterial({
            map: this.tex,
            color: 0x72d4c5,
            transparent: true,
            opacity: 0.16,
            blending: T.AdditiveBlending,
            depthWrite: false,
          }),
        );
        halo.scale.set(6, 6, 1);
        g.add(halo);
        for (let j = 0; j < 4; j++) {
          const q = mesh(
            new T.BoxGeometry(0.3, 0.3, 0.22),
            this.ringMat,
            Math.cos((j * Math.PI) / 2) * 2,
            Math.sin((j * Math.PI) / 2) * 2,
            0,
          );
          q.rotation.z = (j * Math.PI) / 2;
          g.add(q);
        }
      } else {
        g.add(
          mesh(
            new T.CylinderGeometry(1.1, 1.7, 8, 6),
            this.hazardMat,
            0,
            -0.8,
            0,
          ),
        );
        for (let k = -2; k <= 2; k++) {
          const q = mesh(
            new T.TorusGeometry(1.35, 0.045, 4, 6),
            this.warnMat,
            0,
            k * 0.7,
            0,
          );
          q.rotation.x = Math.PI / 2;
          g.add(q);
        }
        g.add(mesh(new T.ConeGeometry(0.45, 0.65, 3), this.warnMat, 0, 4, 0));
      }
      if (e.type === "duet") {
        const pair = g.clone(true);
        for (const child of g.children) child.position.x -= LANE_WIDTH;
        for (const child of pair.children) child.position.x += LANE_WIDTH;
        g.add(pair);
      }
      compact(g);
      g.userData.event = e;
      this.scene.add(g);
      this.events.push(g);
    }
  }
  burst(x, color) {
    if (this.low) return;
    for (let i = 0; i < 12; i++) {
      const sprite = new T.Sprite(
        new T.SpriteMaterial({
          map: this.tex,
          color,
          transparent: true,
          blending: T.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sprite.position.set(x, 0.7, 0);
      sprite.scale.setScalar(0.3);
      this.scene.add(sprite);
      this.effects.push({
        sprite,
        life: 1,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 10,
        vz: Math.random() * 10,
      });
    }
  }
  update(s, local, mode, dt) {
    if (this.qualityMode === "auto" && mode === "game") {
      const scale = this.adaptive.sample(dt);
      if (scale !== null) this.renderer.setPixelRatio(this.baseRatio * scale);
    }
    dt = Math.min(dt, 0.1);
    this.clock += dt;
    this.local = local;
    this.setLevel(s?.level || 0);
    const playing =
      s &&
      ["playing", "paused", "result", "failed", "victory"].includes(s.phase);
    const tm = playing ? s.t : this.clock * 0.12;
    this.travel = tm * 22;
    this.skyUniforms.time.value = this.clock;
    this.waterUniforms.time.value = tm;
    const shift = this.travel % 240;
    for (let i = 0; i < 3; i++) this.terrain[i].position.z = shift - i * 240;
    this.cliffs.forEach(
      (g, i) => (g.position.z = (this.travel % 400) - i * 400),
    );
    this.props.forEach((p, i) => {
      const z = ((this.travel + i * 17) % 450) - 420,
        d = this.propMatrix;
      for (let part = 0; part < 3; part++) {
        d.position.set(
          p.x - (part === 1 ? 0.92 : 0),
          -4 + p.height * (part === 0 ? 0.5 : part === 1 ? 0.55 : 0.75),
          z,
        );
        d.scale.set(
          1,
          part === 0 ? p.height : part === 1 ? p.height * 0.7 : 1,
          1,
        );
        d.updateMatrix();
        this.propBatches[part].setMatrixAt(i, d.matrix);
      }
    });
    for (const batch of this.propBatches)
      batch.instanceMatrix.needsUpdate = true;
    this.arch.position.z = (this.travel * 0.25) % 100;
    this.dust.position.z = (this.clock * 2) % 30;
    this.events.forEach((g) => {
      const e = g.userData.event,
        z = -(e.t - tm) * 22;
      g.visible = playing && z < 16 && z > -330;
      g.position.set(e.type === "duet" ? 0 : eventX(e, tm), 0.7, z);
      if (e.type === "ring") g.rotation.z = this.reduced ? 0 : tm * 0.3 + e.id;
    });
    this.beacon.visible = playing;
    this.beacon.position.set(
      0,
      -0.5,
      -Math.max(-20, (LEVELS[this.level].duration - tm) * 22),
    );
    this.beacon.rotation.y = tm * 0.1;
    for (let i = 0; i < 2; i++) {
      const p = s?.players[i],
        g = this.ships[i],
        target = p ? p.x : i ? 2.7 : -2.7;
      const prev = g.position.x;
      g.position.x += (target - g.position.x) * Math.min(1, dt * 18);
      g.position.y = 0.65 + Math.sin(this.clock * 2.3 + i) * 0.07;
      g.position.z = i === local ? 1.2 : -4.8;
      g.rotation.z +=
        (clamp(
          ((g.position.x - prev) / Math.max(dt, 0.001)) * -0.024,
          -0.28,
          0.28,
        ) -
          g.rotation.z) *
        Math.min(1, dt * 9);
      g.rotation.x = Math.sin(this.clock * 1.4) * 0.025;
      g.visible = true;
      g.getObjectByName("guard").visible = !!p && p.hp > 0 && p.inv > 0;
      if (p && p.hp === 0) g.rotation.z = 0.6;
      const boost = p?.dash > 0 || s?.overdrive > 0;
      g.children.forEach((c) => {
        if (c.name === "flame") {
          c.scale.y = boost ? 2.4 : 1 + Math.sin(this.clock * 35) * 0.12;
        }
        if (c.name === "engineGlow") c.scale.setScalar(boost ? 4 : 2.3);
      });
      const a = this.trails[i].geometry.attributes.position;
      for (let j = 41; j > 0; j--) {
        a.setXYZ(j, a.getX(j - 1), a.getY(j - 1), a.getZ(j - 1) + dt * 22);
      }
      a.setXYZ(0, g.position.x, g.position.y, g.position.z + 1.7);
      a.needsUpdate = true;
      this.trails[i].visible = playing && p?.hp > 0;
    }
    this.link.visible = playing && !!s;
    if (s) {
      const a = this.ships[0].position,
        b = this.ships[1].position,
        points = this.link.geometry.attributes.position;
      for (let j = 0; j < 33; j++) {
        const f = j / 32;
        points.setXYZ(
          j,
          a.x + (b.x - a.x) * f,
          0.8 +
            Math.sin(f * Math.PI) * (0.35 + Math.sin(this.clock * 4) * 0.05),
          a.z + (b.z - a.z) * f,
        );
      }
      points.needsUpdate = true;
      const danger = s.players.some((p) => p.hp === 0);
      this.link.material.color.set(
        danger ? 0xff946b : s.overdrive > 0 ? 0xffd894 : 0x85e7dd,
      );
      this.link.material.opacity =
        s.overdrive > 0 ? 0.95 : 0.22 + (s.resonance || 0) * 0.005;
    }
    if (this.rain.visible) {
      this.rain.position.y = -(this.clock * 18) % 12;
      this.rain.position.z = (this.clock * 20) % 20;
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      e.sprite.position.x += e.vx * dt;
      e.sprite.position.y += e.vy * dt;
      e.sprite.position.z += e.vz * dt;
      e.sprite.material.opacity = e.life;
      if (e.life <= 0) {
        this.scene.remove(e.sprite);
        e.sprite.material.dispose();
        this.effects.splice(i, 1);
      }
    }
    const x = s?.players[local]?.x || 0;
    const targetX = playing ? x * 0.16 : Math.sin(this.clock * 0.08) * 1.5;
    this.camera.position.x += (targetX - this.camera.position.x) * dt * 3;
    this.camera.position.y = playing ? 4.3 : 5.5;
    this.camera.position.z = playing ? 13 : 16;
    const dash = s?.players[local]?.dash > 0 || s?.overdrive > 0;
    this.camera.fov +=
      ((dash && !this.reduced ? 78 : 70) - this.camera.fov) *
      Math.min(1, dt * 5);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(targetX * 0.5, 1.8, -35);
    if (mode === "briefing" && !this.warmed) {
      this.renderer.compile(this.scene, this.camera);
      this.warmed = true;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
