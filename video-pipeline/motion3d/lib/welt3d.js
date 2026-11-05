// welt3d.js — die 3D-Welt der Pia-Folge 2: Gelände, Garten, Wald, Dorf, Lagerfeuer, langer Tisch, Himmel mit Tageszeit.
// update(t) setzt alles zeitabhängig (reine Funktion von t): Licht, Himmel, Feuer, Wolken, Glühwürmchen, Gras im Wind.
import * as THREE from 'three';
import { koerper, toon, umriss } from './toon.js';

const PI = Math.PI;
const glatt = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, w) => a + (b - a) * w;
const rnd = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** Höhe des Geländes: flach in den Spielzonen, sanfte Hügel ringsum. */
export function hoehe(x, z) {
  const hug = 1.9 * Math.sin(x * 0.05 + 0.4) * Math.cos(z * 0.045) + 0.9 * Math.sin(x * 0.13 + 1.0) * Math.sin(z * 0.11) + 0.015 * Math.max(0, Math.hypot(x - 8, z + 2) - 26) ** 1.6;
  const flach = glatt(1 - (Math.hypot((x - 7) * 0.75, (z + 3) * 1.0) - 14) / 10);   // flache Spielzone um (7,-3)
  return hug * (1 - flach);
}

/** Zeitleiste der Tageszeit: Schlüssel (t, Sonnenrichtung, Farben). */
const TAG = [
  { t: 0,  sonne: [-5, 4, 7],  sonnenF: 0xffc79a, si: 1.7, himT: 0x7f9bd0, himH: 0xffb98a, hemH: 0xbfd3ff, hemB: 0x7d8d6a, hemI: 0.75, nebel: 0xffd7b8, stern: 0 },
  { t: 7,  sonne: [-3, 9, 6],  sonnenF: 0xfff0d0, si: 2.4, himT: 0x6db4ee, himH: 0xe8f3ff, hemH: 0xcfeaf5, hemB: 0x8fae55, hemI: 0.9,  nebel: 0xe6f1ff, stern: 0 },
  { t: 17, sonne: [6, 8, 6],   sonnenF: 0xffe3a8, si: 2.3, himT: 0x7ab6e8, himH: 0xffe9c4, hemH: 0xd6e8f2, hemB: 0x9bb25a, hemI: 0.85, nebel: 0xffeccc, stern: 0 },
  { t: 24, sonne: [10, 3, 4],  sonnenF: 0xff9a55, si: 2.0, himT: 0x4d3f7d, himH: 0xff9a5a, hemH: 0xc89a9a, hemB: 0x6f6a4a, hemI: 0.6,  nebel: 0xf2a070, stern: 0.1 },
  { t: 31, sonne: [12, 0.5, 2], sonnenF: 0x7a5fc0, si: 0.7, himT: 0x1b1d4a, himH: 0x6a4a8a, hemH: 0x5a5f9a, hemB: 0x3a4a3a, hemI: 0.5,  nebel: 0x4a3f70, stern: 0.8 },
  { t: 40, sonne: [12, 0.5, 2], sonnenF: 0x6a6fd0, si: 0.5, himT: 0x0b1030, himH: 0x2a2a60, hemH: 0x3a4a8a, hemB: 0x2a3a2a, hemI: 0.45, nebel: 0x23284d, stern: 1 }
];
const C = (h) => new THREE.Color(h);

export function erzeugeWelt(scene, opt = {}) {
  const T = opt.dauer || 40;
  const zeit = { value: 0 };
  const r = rnd(7);
  const alle = {};

  /* ---------- Gelände mit Vertexfarben und Weg ---------- */
  const WEG = [[-3, 0.5], [3, -0.5], [8, -2.5], [12, -4.5], [14, -7.5]];
  const distWeg = (x, z) => { let d = 1e9; for (let i = 0; i < WEG.length - 1; i++) { const [ax, az] = WEG[i], [bx, bz] = WEG[i + 1], dx = bx - ax, dz = bz - az, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); d = Math.min(d, Math.hypot(x - (ax + u * dx), z - (az + u * dz))); } return d; };
  const gg = new THREE.PlaneGeometry(300, 300, 200, 200); gg.rotateX(-PI / 2);
  const gp = gg.attributes.position, col = new Float32Array(gp.count * 3), c1 = C(0x97c35c), c2 = C(0x6fa04c), c3 = C(0xd9c28a), c4 = C(0x4d7a46), tmp = new THREE.Color();
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i), h = hoehe(x, z); gp.setY(i, h);
    const n = 0.5 + 0.5 * Math.sin(x * 0.7) * Math.cos(z * 0.6) + 0.2 * Math.sin(x * 2.3 + z * 1.7);
    tmp.copy(c1).lerp(c2, Math.min(1, Math.max(0, n * 0.6))).lerp(c4, Math.min(1, Math.max(0, (h - 2) * 0.25)));
    const dw = distWeg(x, z); if (dw < 1.5) tmp.lerp(c3, glatt(1 - dw / 1.5));
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals();
  const boden = new THREE.Mesh(gg, toon(0xffffff, { rim: 0, material: { vertexColors: true } })); boden.receiveShadow = true; scene.add(boden);

  /* ---------- Hilfen für Instanzen ---------- */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
  function instanzen(geom, farbe, liste, o = {}) {
    const mat = toon(farbe, { rim: o.rim ?? 0.2, material: o.material });
    const im = new THREE.InstancedMesh(geom, mat, liste.length); im.castShadow = o.schatten ?? true; im.receiveShadow = true;
    const cc = new THREE.Color();
    liste.forEach((it, i) => { q.setFromEuler(new THREE.Euler(it.rx || 0, it.ry || 0, it.rz || 0)); v3.set(it.x, it.y, it.z); const s = it.s ?? 1; sc.set(it.sx ?? s, it.sy ?? s, it.sz ?? s); m4.compose(v3, q, sc); im.setMatrixAt(i, m4); if (it.f !== undefined) { cc.set(it.f); im.setColorAt(i, cc); } });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    if (o.umriss !== 0) { const om = new THREE.InstancedMesh(geom, umrissMat(o.umriss || 0.04), liste.length); om.instanceMatrix = im.instanceMatrix; om.castShadow = false; om.receiveShadow = false; scene.add(om); }
    scene.add(im); return im;
  }
  const umrissCache = new Map();
  function umrissMat(d) {
    if (umrissCache.has(d)) return umrissCache.get(d);
    const m = new THREE.MeshBasicMaterial({ color: 0x1d1d22, side: THREE.BackSide });
    m.onBeforeCompile = (sh) => { sh.uniforms.dicke = { value: d }; sh.vertexShader = sh.vertexShader.replace('void main() {', 'uniform float dicke;\nvoid main() {').replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * dicke;'); };
    m.customProgramCacheKey = () => 'iumriss' + d; umrissCache.set(d, m); return m;
  }
  const windMat = (mat, stark = 0.1) => { mat.onBeforeCompile = ((alt) => (sh) => { alt && alt(sh); sh.uniforms.uZeit = zeit; sh.vertexShader = sh.vertexShader.replace('void main() {', 'uniform float uZeit;\nvoid main() {').replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed.x += sin(uZeit * 1.6 + instanceMatrix[3].x * 0.9 + instanceMatrix[3].z * 0.5) * ${stark.toFixed(3)} * max(0.0, position.y);`); })(mat.onBeforeCompile); mat.customProgramCacheKey = () => 'wind' + stark; };

  /* ---------- Gras, Blumen, Weizen ---------- */
  {
    const gras = []; for (let i = 0; i < 2600; i++) { const x = -20 + r() * 60, z = -22 + r() * 40; if (distWeg(x, z) < 1.1) continue; if (Math.hypot(x - 14, z + 8) < 2.2) continue; gras.push({ x, y: hoehe(x, z) - 0.02, z, sy: 0.5 + r() * 0.7, sx: 0.8, sz: 0.8, ry: r() * PI, f: r() > 0.5 ? 0x7fb450 : 0x5f9b45 }); }
    const gm = instanzen(new THREE.ConeGeometry(0.07, 0.5, 4), 0xffffff, gras, { umriss: 0, rim: 0, schatten: false }); windMat(gm.material, 0.25);
    const fl = []; const fk = [0xffffff, 0xffe066, 0xff8fa3, 0xc8a2ff]; for (let i = 0; i < 260; i++) { const x = -18 + r() * 52, z = -20 + r() * 36; if (distWeg(x, z) < 1.0) continue; fl.push({ x, y: hoehe(x, z) + 0.32, z, s: 0.1 + r() * 0.05, f: fk[i % 4] }); }
    instanzen(new THREE.SphereGeometry(1, 8, 6), 0xffffff, fl, { umriss: 0, rim: 0.1, schatten: false });
    const st = []; for (let i = 0; i < 260; i++) { const x = -8 + r() * 4 - (i % 2) * 0, z = 3 + r() * 9; st.push({ x: -9 + r() * 6, y: hoehe(x, z) + 0.5, z: -6 + r() * 7, sy: 1, rz: (r() - 0.5) * 0.2, f: 0xe3b84a }); }
    const wm = instanzen(new THREE.CylinderGeometry(0.02, 0.03, 1.1, 5), 0xffffff, st, { umriss: 0, rim: 0.2, schatten: false }); windMat(wm.material, 0.12);
  }

  /* ---------- Wald, Berge ---------- */
  {
    const stamm = [], kronen = [], k2 = [];
    for (let i = 0; i < 90; i++) { const x = -34 + r() * 80, z = -34 - r() * 40 + (i % 3) * 8; if (Math.abs(x - 10) < 8 && z > -30) continue; const s = 1.4 + r() * 1.4, h = hoehe(x, z);
      stamm.push({ x, y: h + s * 0.9, z, sy: s, sx: s * 0.7, sz: s * 0.7 }); kronen.push({ x, y: h + s * 2.7, z, s: s * 1.6, f: [0x4c8a50, 0x5da35a, 0x3f7a4a][i % 3], ry: r() * 6 }); k2.push({ x: x + (r() - 0.5), y: h + s * 3.9, z, s: s * 1.15, f: 0x79b46a }); }
    for (let i = 0; i < 22; i++) { const x = 24 + r() * 14, z = -16 + r() * 24; const s = 1.3 + r() * 1.2, h = hoehe(x, z); stamm.push({ x, y: h + s * 0.9, z, sy: s, sx: s * 0.7, sz: s * 0.7 }); kronen.push({ x, y: h + s * 2.7, z, s: s * 1.6, f: 0x5da35a }); }
    instanzen(new THREE.CylinderGeometry(0.2, 0.3, 1.8, 8), 0x8a5f3a, stamm, { umriss: 0.05 });
    instanzen(new THREE.IcosahedronGeometry(1, 1), 0xffffff, kronen, { umriss: 0.07 });
    instanzen(new THREE.IcosahedronGeometry(1, 1), 0xffffff, k2, { umriss: 0.06 });
    const berge = []; for (let i = 0; i < 9; i++) berge.push({ x: -120 + i * 38 + r() * 12, y: -4, z: -150 - r() * 25, sx: 28 + r() * 14, sy: 40 + r() * 30, sz: 28 + r() * 10, f: i % 2 ? 0x8fa8cf : 0x7f9bc4 });
    const bm = instanzen(new THREE.ConeGeometry(1, 1, 7), 0xffffff, berge, { umriss: 0, rim: 0, schatten: false });
    const kap = berge.map((b) => ({ x: b.x, y: b.y + b.sy * 0.72, z: b.z, sx: b.sx * 0.32, sy: b.sy * 0.34, sz: b.sz * 0.32, f: 0xf2f7ff })); instanzen(new THREE.ConeGeometry(1, 1, 7), 0xffffff, kap, { umriss: 0, rim: 0.4, schatten: false });
  }

  /* ---------- Garten: Beete, Gemüse, Zaun ---------- */
  {
    for (let b = 0; b < 3; b++) { const bz = -2.2 + b * 1.7; const bett = koerper(new THREE.BoxGeometry(7.5, 0.35, 1.0), 0x7a5230, { umriss: 0.03 }); bett.position.set(3.2, 0.17, bz); bett.rotation.y = 0; scene.add(bett);
      const erde = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.05, 0.8), toon(0x4a3426, { rim: 0 })); erde.position.set(3.2, 0.36, bz); scene.add(erde); }
    const gem = []; for (let b = 0; b < 3; b++) for (let i = 0; i < 12; i++) { const x = 0.2 + i * 0.55, z = -2.2 + b * 1.7 + (i % 2 ? 0.12 : -0.12); gem.push({ x, y: 0.62, z, s: 0.26 + (i % 3) * 0.04, f: b === 0 ? 0x4fb069 : b === 1 ? 0x8ac926 : 0x6fcf7f }); }
    instanzen(new THREE.IcosahedronGeometry(1, 1), 0xffffff, gem, { umriss: 0.06 });
    const tom = []; for (let i = 0; i < 18; i++) tom.push({ x: 0.3 + (i % 9) * 0.8, y: 0.45, z: -2.2 + 1.7 + ((i < 9) ? -0.1 : 0.2), s: 0.12, f: i % 3 ? 0xef476f : 0xf78c1f }); instanzen(new THREE.SphereGeometry(1, 10, 8), 0xffffff, tom, { umriss: 0.07 });
    const pf = []; for (let i = 0; i < 16; i++) pf.push({ x: -2 + i * 0.7, y: 0.6, z: 2.6 + Math.sin(i) * 0.05, sy: 0.6 }); instanzen(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6), 0x9a7a52, pf, { umriss: 0.03 });
    const lat = koerper(new THREE.BoxGeometry(11, 0.08, 0.08), 0x9a7a52, { umriss: 0.02 }); lat.position.set(3.2, 0.9, 2.6); scene.add(lat);
  }

  /* ---------- Dorf: Häuser mit Fenstern (leuchten abends) ---------- */
  const fenster = [];
  {
    const haus = (x, z, ry, w, d, hh, wand, dach) => {
      const g = new THREE.Group(); g.position.set(x, hoehe(x, z), z); g.rotation.y = ry; scene.add(g);
      const k = koerper(new THREE.BoxGeometry(w, hh, d), wand, { umriss: 0.05 }); k.position.y = hh / 2; g.add(k);
      const rf = koerper(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.9, 4), dach, { umriss: 0.06 }); rf.rotation.y = PI / 4; rf.position.y = hh + 0.95; rf.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(rf);
      const tuer = koerper(new THREE.BoxGeometry(0.9, 1.7, 0.1), 0x7a5230, { umriss: 0.02 }); tuer.position.set(0, 0.85, d / 2 + 0.03); g.add(tuer);
      for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffc060, emissiveIntensity: 0, roughness: 1 })); f.position.set(sx * w * 0.32, hh * 0.58, d / 2 + 0.04); g.add(f); fenster.push(f);
        const rahmen = koerper(new THREE.BoxGeometry(0.95, 0.95, 0.06), 0x6a4a2c, { umriss: 0.012, schatten: false }); rahmen.position.set(sx * w * 0.32, hh * 0.58, d / 2 + 0.02); g.add(rahmen); }
      const sch = koerper(new THREE.BoxGeometry(0.45, 1.2, 0.45), 0x9a8a7a, { umriss: 0.03 }); sch.position.set(w * 0.28, hh + 1.5, -d * 0.2); g.add(sch);
    };
    haus(11, 1.5, -0.5, 4.2, 3.4, 2.7, 0xf3e3c8, 0xc0553a); haus(18, -1, 0.35, 4.6, 3.6, 3.0, 0xefd9b4, 0x8a5f3a); haus(22.5, -9.5, 0.9, 4.0, 3.4, 2.6, 0xf6ecd8, 0xd1495b); haus(4, -14, -0.2, 4.4, 3.8, 2.8, 0xe9d6b8, 0x5a7a8a);
  }

  /* ---------- Lagerfeuer mit Dreibein, Topf, Dampf, Funken ---------- */
  const feuer = { pos: new THREE.Vector3(14, hoehe(14, -8), -8) };
  {
    const g = new THREE.Group(); g.position.copy(feuer.pos); scene.add(g);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * PI; const s = koerper(new THREE.SphereGeometry(0.2, 8, 6), 0x8a8f98, { umriss: 0.03 }); s.scale.set(1, 0.7, 1); s.position.set(Math.cos(a) * 0.8, 0.12, Math.sin(a) * 0.8); g.add(s); }
    for (let i = 0; i < 4; i++) { const l = koerper(new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8), 0x6a4630, { umriss: 0.02 }); l.rotation.z = PI / 2; l.rotation.y = i * PI / 4; l.position.y = 0.18; g.add(l); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * 2 * PI + 0.5; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.9, 6), toon(0x6b4a2f, { rim: 0 })); st.position.set(Math.cos(a) * 0.55, 1.35, Math.sin(a) * 0.55); st.rotation.z = -Math.cos(a) * 0.38; st.rotation.x = Math.sin(a) * 0.38; st.castShadow = true; g.add(st); }
    const topf = koerper(new THREE.SphereGeometry(0.55, 24, 16, 0, 2 * PI, 0.0, PI * 0.62), 0x4a4f57, { umriss: 0.035 }); topf.rotation.x = PI; topf.position.y = 1.7; g.add(topf);
    const kette = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4), new THREE.MeshBasicMaterial({ color: 0x1d1d22 })); kette.position.y = 2.25; g.add(kette);
    const fm = (f) => new THREE.MeshBasicMaterial({ color: f, transparent: true, opacity: 0.95 });
    const flammen = [[0xff8a1f, 1.0, 0.0], [0xffc83d, 0.72, 0.4], [0xfff2a8, 0.42, 0.9]].map(([f, s, ph], i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s + 0.1, 1.3 * s + 0.2, 10), fm(f)); m.position.y = 0.2 + 0.55 * s; g.add(m); return { m, s, ph, y0: 0.2 + 0.55 * s }; });
    const licht = new THREE.PointLight(0xff9a40, 0, 14, 1.6); licht.position.set(0, 1.1, 0); g.add(licht);
    const dampf = []; for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false })); g.add(m); dampf.push(m); }
    const fk = []; const fp = new Float32Array(60 * 3); const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    const funken = new THREE.Points(fgeo, new THREE.PointsMaterial({ color: 0xffd27a, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false })); g.add(funken);
    alle.feuer = { flammen, licht, dampf, funken, fp };
  }

  /* ---------- Langer Tisch mit Bänken, Speisen, Laternen ---------- */
  const laternen = [];
  {
    const tg = new THREE.Group(); tg.position.set(16.5, hoehe(16.5, -3), -3); scene.add(tg);
    const platte = koerper(new THREE.BoxGeometry(10, 0.14, 1.9), 0xd9a458, { umriss: 0.03 }); platte.position.y = 1.18; tg.add(platte);
    const tuch = koerper(new THREE.BoxGeometry(10.2, 0.03, 0.9), 0xfff4e0, { umriss: 0.015 }); tuch.position.y = 1.27; tg.add(tuch);
    for (const sx of [-4.4, -1.5, 1.5, 4.4]) for (const sz of [-0.7, 0.7]) { const b = koerper(new THREE.CylinderGeometry(0.07, 0.08, 1.15, 8), 0x6a4630, { umriss: 0.02 }); b.position.set(sx, 0.58, sz); tg.add(b); }
    for (const sz of [-1.65, 1.65]) { const bank = koerper(new THREE.BoxGeometry(9.6, 0.12, 0.5), 0x9a6a3a, { umriss: 0.03 }); bank.position.set(0, 0.5, sz); tg.add(bank); for (const sx of [-4, -1.3, 1.3, 4]) { const bb = koerper(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 6), 0x6a4630, { umriss: 0.015 }); bb.position.set(sx, 0.25, sz); tg.add(bb); } }
    const speisen = [[0xef476f, 0.16], [0x4fb069, 0.15], [0xf78c1f, 0.14], [0xe3b84a, 0.18]];
    for (let i = 0; i < 11; i++) { const x = -4.4 + i * 0.88, z = (i % 2 ? 0.25 : -0.25); const teller = koerper(new THREE.CylinderGeometry(0.34, 0.3, 0.05, 20), 0xffffff, { umriss: 0.015 }); teller.position.set(x, 1.31, z); tg.add(teller);
      const [f, rr2] = speisen[i % 4]; const sp = koerper(new THREE.SphereGeometry(rr2, 12, 10), f, { umriss: 0.015 }); sp.position.set(x - 0.05, 1.4, z); tg.add(sp); const sp2 = koerper(new THREE.SphereGeometry(rr2 * 0.8, 12, 10), speisen[(i + 1) % 4][0], { umriss: 0.015 }); sp2.position.set(x + 0.1, 1.38, z + 0.06); tg.add(sp2); }
    const topfT = koerper(new THREE.CylinderGeometry(0.42, 0.36, 0.5, 20), 0x4a4f57, { umriss: 0.03 }); topfT.position.set(0, 1.58, 0); tg.add(topfT);
    // Laternen an Pfosten und Lichterkette
    for (const sx of [-5.3, 5.3]) { const pf = koerper(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8), 0x6a4630, { umriss: 0.03 }); pf.position.set(sx, 1.8, 0); tg.add(pf); }
    const kette = []; for (let i = 0; i <= 18; i++) { const u = i / 18, x = -5.3 + u * 10.6, y = 3.55 - 0.7 * Math.sin(u * PI); const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffc060, emissiveIntensity: 0, roughness: 1 })); b.position.set(x, y, 0.0); tg.add(b); laternen.push(b); }
    const lampe = new THREE.PointLight(0xffb060, 0, 16, 1.5); lampe.position.set(0, 3.0, 0); tg.add(lampe); alle.lampe = lampe;
    alle.tisch = tg;
  }

  /* ---------- Himmel, Sonne, Wolken, Sterne, Glühwürmchen ---------- */
  const himmel = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { oben: { value: C(0x6db4ee) }, horizont: { value: C(0xe8f3ff) }, sonnenRichtung: { value: new THREE.Vector3(0, 1, 0) }, sonnenFarbe: { value: C(0xfff0d0) } },
    vertexShader: 'varying vec3 vR; void main(){ vR = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 oben; uniform vec3 horizont; uniform vec3 sonnenRichtung; uniform vec3 sonnenFarbe; varying vec3 vR; void main(){ float h = clamp(vR.y, 0.0, 1.0); vec3 c = mix(horizont, oben, pow(h, 0.55)); float s = max(dot(normalize(vR), normalize(sonnenRichtung)), 0.0); c += sonnenFarbe * (pow(s, 12.0) * 0.45 + pow(s, 220.0) * 1.4); gl_FragColor = vec4(c, 1.0); }'
  }));
  scene.add(himmel);
  const sonneM = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false, depthWrite: false })); scene.add(sonneM);
  const sterne = (() => { const n = 500, p = new Float32Array(n * 3), rs = rnd(3); for (let i = 0; i < n; i++) { const a = rs() * 2 * PI, e = 0.12 + rs() * 1.3; p[i * 3] = Math.cos(a) * Math.cos(e) * 380; p[i * 3 + 1] = Math.sin(e) * 380; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 380; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(pts); return pts; })();
  const wolken = []; for (let i = 0; i < 9; i++) { const g = new THREE.Group(); const x0 = -90 + r() * 180, y = 40 + r() * 25, z = -90 - r() * 60; for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false })); s.scale.set(9 + r() * 6, 4 + r() * 2.5, 5); s.position.set((k - 2) * 8, r() * 2, r() * 3); g.add(s); } g.position.set(x0, y, z); scene.add(g); wolken.push({ g, x0, v: 0.8 + r() * 0.8 }); }
  const gluehw = (() => { const n = 70, p = new Float32Array(n * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff6a8, size: 0.16, transparent: true, opacity: 0, depthWrite: false })); scene.add(pts); return { pts, p, n }; })();

  /* ---------- Licht ---------- */
  const hem = new THREE.HemisphereLight(0xcfeaf5, 0x8fae55, 0.9); scene.add(hem);
  const sonne = new THREE.DirectionalLight(0xfff0cf, 2.4); sonne.castShadow = true;
  sonne.shadow.mapSize.set(opt.schattenGroesse || 2048, opt.schattenGroesse || 2048); sonne.shadow.bias = -0.0006; sonne.shadow.normalBias = 0.05;
  Object.assign(sonne.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 }); scene.add(sonne); scene.add(sonne.target);
  scene.fog = new THREE.Fog(0xffd7b8, 40, 190);

  const tagBei = (t) => {
    let i = 0; while (i < TAG.length - 2 && t >= TAG[i + 1].t) i++;
    const a = TAG[i], b = TAG[i + 1], w = glatt((t - a.t) / (b.t - a.t));
    const mix = (k) => C(a[k]).lerp(C(b[k]), w);
    return { sonne: new THREE.Vector3().fromArray(a.sonne).lerp(new THREE.Vector3().fromArray(b.sonne), w), sonnenF: mix('sonnenF'), si: lerp(a.si, b.si, w), himT: mix('himT'), himH: mix('himH'), hemH: mix('hemH'), hemB: mix('hemB'), hemI: lerp(a.hemI, b.hemI, w), nebel: mix('nebel'), stern: lerp(a.stern, b.stern, w), nacht: glatt((t - 22) / 12) };
  };

  const api = {
    sonne, boden, feuer, alle,
    /** Alles für Zeit t setzen; fokus = Punkt, um den der Schatten geführt wird (Kamera-Ziel). */
    update(t, fokus) {
      zeit.value = t;
      const tg = tagBei(Math.min(t, 40));
      sonne.color.copy(tg.sonnenF); sonne.intensity = tg.si; hem.color.copy(tg.hemH); hem.groundColor.copy(tg.hemB); hem.intensity = tg.hemI;
      const f = fokus || new THREE.Vector3(10, 0, -4); sonne.target.position.copy(f); sonne.position.copy(f).add(tg.sonne.clone().normalize().multiplyScalar(40));
      scene.fog.color.copy(tg.nebel); scene.background = tg.nebel;
      himmel.material.uniforms.oben.value.copy(tg.himT); himmel.material.uniforms.horizont.value.copy(tg.himH); himmel.material.uniforms.sonnenRichtung.value.copy(tg.sonne); himmel.material.uniforms.sonnenFarbe.value.copy(tg.sonnenF);
      sonneM.position.copy(tg.sonne.clone().normalize().multiplyScalar(300)); sonneM.lookAt(0, 0, 0); sonneM.material.color.copy(tg.sonnenF).lerp(C(0xffffff), 0.5); sonneM.visible = tg.sonne.y > 0.2;
      sterne.material.opacity = tg.stern;
      for (const w of wolken) w.g.position.x = w.x0 + t * w.v;
      const nacht = tg.nacht;
      for (const fz of fenster) fz.material.emissiveIntensity = glatt((t - 20) / 6) * 1.4;
      for (const l of laternen) l.material.emissiveIntensity = glatt((t - 20) / 6) * 1.6;
      alle.lampe.intensity = glatt((t - 20) / 6) * 14;
      // Feuer: Flackern aus Sinussummen
      const F = alle.feuer; const an = glatt((t - 8.5) / 1.2); const fl = (a2, ph) => 0.5 + 0.5 * Math.sin(t * a2 + ph);
      for (const o of F.flammen) { o.m.scale.set(0.85 + 0.25 * fl(13 + o.ph * 3, o.ph * 5), (0.8 + 0.5 * fl(9 + o.ph * 4, o.ph * 3)) * an, 0.85 + 0.25 * fl(11, o.ph)); o.m.position.y = o.y0 * (0.8 + 0.3 * an); o.m.rotation.y = t * 1.3 + o.ph; o.m.visible = an > 0.02; }
      F.licht.intensity = an * (16 + 5 * fl(17, 1) + 3 * fl(29, 2));
      F.dampf.forEach((m, i) => { const u = ((t * 0.35 + i / F.dampf.length) % 1); m.position.set(Math.sin(u * 5 + i) * 0.25, 2.0 + u * 2.4, Math.cos(u * 4 + i) * 0.2); m.scale.setScalar(0.6 + u * 1.6); m.material.opacity = 0.5 * Math.sin(u * PI) * glatt((t - 9.5) / 1.5); });
      for (let i = 0; i < 60; i++) { const u = ((t * 0.6 + i * 0.137) % 1), a = i * 2.4; F.fp[i * 3] = Math.sin(a + t * 0.8) * 0.4 * u + Math.sin(a * 3) * 0.1; F.fp[i * 3 + 1] = 0.5 + u * 3.2; F.fp[i * 3 + 2] = Math.cos(a + t * 0.8) * 0.4 * u; } F.funken.geometry.attributes.position.needsUpdate = true; F.funken.material.opacity = an * 0.9;
      // Glühwürmchen (nur abends)
      const g = gluehw; for (let i = 0; i < g.n; i++) { const a = i * 1.91; g.p[i * 3] = 6 + Math.sin(a * 3.1 + t * 0.35 + i) * 14; g.p[i * 3 + 1] = 0.8 + 1.8 * (0.5 + 0.5 * Math.sin(a * 2.3 + t * 0.7)); g.p[i * 3 + 2] = -4 + Math.cos(a * 1.7 + t * 0.3) * 12; } g.pts.geometry.attributes.position.needsUpdate = true; g.pts.material.opacity = glatt((t - 21) / 5) * (0.55 + 0.4 * Math.sin(t * 3));
    }
  };
  return api;
}
