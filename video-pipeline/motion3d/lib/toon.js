// toon.js — Toon-Look für three.js: stufiger Lichtverlauf, Umrisslinien (Inverted Hull), Randlicht, Schatten.
import * as THREE from 'three';

let RAMPE = null;
/** Stufenverlauf für MeshToonMaterial (Nearest-Filter = harte Stufen). */
export function rampe(stufen = 3) {
  if (RAMPE && RAMPE.userData.stufen === stufen) return RAMPE;
  const d = new Uint8Array(stufen);
  for (let i = 0; i < stufen; i++) d[i] = Math.round(70 + (185 * i) / Math.max(1, stufen - 1));
  RAMPE = new THREE.DataTexture(d, stufen, 1, THREE.RedFormat);
  RAMPE.minFilter = RAMPE.magFilter = THREE.NearestFilter; RAMPE.generateMipmaps = false; RAMPE.needsUpdate = true; RAMPE.userData.stufen = stufen;
  return RAMPE;
}

/** Toon-Material mit Randlicht (Fresnel), Farbe als Zahl oder CSS-String. */
export function toon(farbe, opt = {}) {
  const m = new THREE.MeshToonMaterial({ color: farbe, gradientMap: rampe(3), ...opt.material });
  const rim = opt.rim === undefined ? 0.35 : opt.rim, rimFarbe = new THREE.Color(opt.rimFarbe || 0xffe9b3);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rimStaerke = { value: rim }; sh.uniforms.rimFarbe = { value: rimFarbe };
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float rimStaerke;\nuniform vec3 rimFarbe;\nvoid main() {')
      .replace('#include <opaque_fragment>', `
        float rimF = pow(1.0 - clamp(dot(normalize(vViewPosition), normalize(vNormal)), 0.0, 1.0), 3.0);
        outgoingLight += rimFarbe * rimF * rimStaerke;
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'toon-rim';
  return m;
}

const umrissMaterialien = new Map();
/** Umrisslinie als zweites, nach aussen gedrücktes Gitter mit Rückseiten (dicke in Weltmassen). */
export function umriss(mesh, dicke = 0.025, farbe = 0x1d1d22) {
  const key = dicke + ':' + farbe;
  let mat = umrissMaterialien.get(key);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color: farbe, side: THREE.BackSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.dicke = { value: dicke };
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'uniform float dicke;\nvoid main() {').replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * dicke;');
    };
    mat.customProgramCacheKey = () => 'umriss' + key;
    umrissMaterialien.set(key, mat);
  }
  const h = new THREE.Mesh(mesh.geometry, mat); h.name = 'umriss'; h.castShadow = false; h.receiveShadow = false;
  mesh.add(h); return h;
}

/** Mesh mit Toon-Material und optionaler Umrisslinie. */
export function koerper(geom, farbe, o = {}) {
  const m = new THREE.Mesh(geom, toon(farbe, o));
  m.castShadow = o.schatten !== false; m.receiveShadow = o.empfang !== false;
  if (o.umriss !== 0) umriss(m, o.umriss || 0.03);
  return m;
}
