// bausteine3d.js — Bausteine für die Pia-Serie ab Folge 3: Tiere, Soja, Trog, Wassersäule, Erde, Tor, Bäume, Bühne.
// Jeder Baustein ist eine Gruppe mit update(t, u): reine Funktion der Zeit (t in s) und eines Fortschritts u (0..1). Kein Zustand.
import * as THREE from 'three';
import { koerper, toon } from './toon.js';

const PI = Math.PI;
const glatt = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const rnd = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const K = (geom, farbe, o = { umriss: 0.03 }) => koerper(geom, farbe, o);
const mit = (m, x, y, z) => { m.position.set(x, y, z); return m; };

export function auge(g, x, y, z, r = 0.07) { const a = K(new THREE.SphereGeometry(r, 10, 8), 0x1d1d22, { umriss: 0.005 }); a.position.set(x, y, z); g.add(a); return a; }

/** Kuh (Länge etwa 2 m bei s = 1), blickt nach +x. */
export function kuh(o = {}) {
  const g = new THREE.Group(), s = o.s ?? 0.8, ph = o.ph ?? 0, fell = o.fell ?? 0xf5f1e8;
  const koerperM = K(new THREE.CapsuleGeometry(0.55, 1.0, 6, 12), fell); koerperM.rotation.z = PI / 2; koerperM.position.y = 1.05; g.add(koerperM);
  for (const [x, z] of [[-0.55, 0.28], [-0.55, -0.28], [0.55, 0.28], [0.55, -0.28]]) g.add(mit(K(new THREE.CylinderGeometry(0.1, 0.09, 0.75, 8), fell, { umriss: 0.02 }), x, 0.38, z));
  for (const [x, y, z, r] of [[-0.2, 1.5, 0.3, 0.26], [0.35, 1.2, -0.4, 0.22], [-0.5, 1.15, -0.35, 0.2]]) { const f = K(new THREE.SphereGeometry(r, 10, 8), 0x2a2a2e, { umriss: 0.005 }); f.scale.set(1, 0.5, 1); f.position.set(x, y, z); g.add(f); }
  const kopf = new THREE.Group(); kopf.position.set(1.05, 1.35, 0); g.add(kopf);
  kopf.add(K(new THREE.BoxGeometry(0.5, 0.45, 0.42), fell)); kopf.add(mit(K(new THREE.BoxGeometry(0.22, 0.26, 0.36), 0xf0a8a8, { umriss: 0.02 }), 0.3, -0.1, 0));
  auge(kopf, 0.12, 0.1, 0.2); auge(kopf, 0.12, 0.1, -0.2);
  for (const z of [0.3, -0.3]) kopf.add(mit(K(new THREE.SphereGeometry(0.1, 8, 6), 0x2a2a2e, { umriss: 0.01 }), -0.05, 0.22, z));
  const schwanz = new THREE.Group(); schwanz.position.set(-1.1, 1.45, 0); g.add(schwanz); schwanz.add(mit(K(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), 0x2a2a2e, { umriss: 0.01 }), 0, -0.4, 0));
  g.scale.setScalar(s);
  g.update = (t) => { kopf.rotation.z = -0.2 + 0.18 * Math.sin(t * 1.3 + ph); kopf.position.y = 1.35 - 0.05 * Math.sin(t * 1.3 + ph); schwanz.rotation.x = 0.35 * Math.sin(t * 2.6 + ph); };
  return g;
}

/** Schwein, blickt nach +x. */
export function schwein(o = {}) {
  const g = new THREE.Group(), s = o.s ?? 0.8, ph = o.ph ?? 0, rosa = 0xf2a6a6;
  const k = K(new THREE.CapsuleGeometry(0.42, 0.55, 6, 12), rosa); k.rotation.z = PI / 2; k.position.y = 0.62; g.add(k);
  for (const [x, z] of [[-0.35, 0.22], [-0.35, -0.22], [0.35, 0.22], [0.35, -0.22]]) g.add(mit(K(new THREE.CylinderGeometry(0.08, 0.07, 0.35, 8), rosa, { umriss: 0.02 }), x, 0.18, z));
  const kopf = new THREE.Group(); kopf.position.set(0.8, 0.72, 0); g.add(kopf);
  kopf.add(K(new THREE.SphereGeometry(0.3, 12, 10), rosa)); const r = K(new THREE.CylinderGeometry(0.14, 0.14, 0.14, 12), 0xe58a8a, { umriss: 0.02 }); r.rotation.z = PI / 2; r.position.set(0.3, -0.04, 0); kopf.add(r);
  auge(kopf, 0.18, 0.12, 0.16, 0.05); auge(kopf, 0.18, 0.12, -0.16, 0.05);
  for (const z of [0.18, -0.18]) { const o2 = K(new THREE.ConeGeometry(0.1, 0.18, 4), 0xe58a8a, { umriss: 0.01 }); o2.position.set(-0.02, 0.3, z); kopf.add(o2); }
  g.scale.setScalar(s);
  g.update = (t) => { kopf.rotation.z = -0.15 + 0.12 * Math.sin(t * 1.9 + ph); kopf.position.y = 0.72 - 0.04 * Math.sin(t * 1.9 + ph); };
  return g;
}

/** Huhn (klein), blickt nach +x. */
export function huhn(o = {}) {
  const g = new THREE.Group(), s = o.s ?? 1, ph = o.ph ?? 0;
  g.add(mit(K(new THREE.SphereGeometry(0.22, 12, 10), 0xffffff, { umriss: 0.02 }), 0, 0.38, 0));
  const kopf = new THREE.Group(); kopf.position.set(0.2, 0.62, 0); g.add(kopf);
  kopf.add(K(new THREE.SphereGeometry(0.11, 10, 8), 0xffffff, { umriss: 0.015 })); const sch = K(new THREE.ConeGeometry(0.045, 0.1, 6), 0xf5a02a, { umriss: 0.008 }); sch.rotation.z = -PI / 2; sch.position.set(0.12, -0.01, 0); kopf.add(sch);
  kopf.add(mit(K(new THREE.BoxGeometry(0.05, 0.08, 0.04), 0xd62839, { umriss: 0.006 }), 0, 0.12, 0)); auge(kopf, 0.07, 0.03, 0.08, 0.025); auge(kopf, 0.07, 0.03, -0.08, 0.025);
  for (const z of [0.07, -0.07]) g.add(mit(K(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 5), 0xf5a02a, { umriss: 0.006 }), 0, 0.12, z));
  g.scale.setScalar(s);
  g.update = (t) => { const p = Math.max(0, Math.sin(t * 2.2 + ph)); kopf.rotation.z = -0.9 * p; kopf.position.y = 0.62 - 0.14 * p; };
  return g;
}

/** Sojapflanze (etwa 0,8 m). */
export function soja(o = {}) {
  const g = new THREE.Group(), ph = o.ph ?? 0;
  g.add(mit(K(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 6), 0x4d8f3a, { umriss: 0.01 }), 0, 0.3, 0));
  for (let i = 0; i < 3; i++) { const b = K(new THREE.SphereGeometry(0.2, 8, 6), 0x6fbf4a, { umriss: 0.012 }); b.scale.set(1, 0.18, 0.6); const a = i * 2.1 + ph; b.position.set(Math.cos(a) * 0.22, 0.35 + i * 0.12, Math.sin(a) * 0.22); b.rotation.y = -a; g.add(b); }
  for (let i = 0; i < 3; i++) { const p = K(new THREE.CapsuleGeometry(0.035, 0.1, 3, 6), 0xc9b45a, { umriss: 0.008 }); const a = i * 2.1 + 0.9 + ph; p.position.set(Math.cos(a) * 0.08, 0.28 + i * 0.05, Math.sin(a) * 0.08); g.add(p); }
  g.update = (t) => { g.rotation.z = 0.04 * Math.sin(t * 1.5 + ph); };
  return g;
}

/** Futtertrog mit Haufen Sojabohnen; u = Füllhöhe 0..1. */
export function trog(o = {}) {
  const g = new THREE.Group(), L = o.l ?? 4, holz = 0x8a5f3a;
  g.add(mit(K(new THREE.BoxGeometry(L, 0.12, 1.1), holz), 0, 0.5, 0));
  for (const z of [0.55, -0.55]) g.add(mit(K(new THREE.BoxGeometry(L, 0.5, 0.1), holz), 0, 0.75, z));
  for (const x of [L / 2, -L / 2]) g.add(mit(K(new THREE.BoxGeometry(0.1, 0.5, 1.2), holz), x, 0.75, 0));
  for (const x of [-L * 0.4, L * 0.4]) for (const z of [0.4, -0.4]) g.add(mit(K(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6), holz, { umriss: 0.02 }), x, 0.25, z));
  const haufen = K(new THREE.SphereGeometry(1, 16, 10), 0xd9b86c, { umriss: 0.02 }); haufen.position.y = 0.62; g.add(haufen);
  g.update = (t, u = 1) => { haufen.scale.set(L * 0.46, 0.05 + 0.5 * u, 0.5); };
  return g;
}

/** Würfel Tofu auf einem Teller. */
export function tofu(o = {}) {
  const g = new THREE.Group(); g.add(mit(K(new THREE.CylinderGeometry(0.45, 0.4, 0.05, 20), 0xffffff, { umriss: 0.015 }), 0, 0.03, 0));
  for (let i = 0; i < (o.n ?? 3); i++) g.add(mit(K(new THREE.BoxGeometry(0.22, 0.2, 0.22), 0xf7ecd0, { umriss: 0.012 }), -0.15 + i * 0.16, 0.16, (i % 2 ? 0.08 : -0.08)));
  return g;
}

/** Wassersäule: Glas (durchsichtig), unten Anteil Landwirtschaft in Grün, oben der Rest in Blau. u = Anteil Grün 0..0.7. */
export function wasserSaeule(o = {}) {
  const g = new THREE.Group(), h = o.h ?? 4, r = o.r ?? 0.9;
  const glas = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); glas.position.y = h / 2; g.add(glas);
  g.add(mit(K(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.12, 32), 0x4a4f57), 0, 0.06, 0));
  const blau = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.96, 1, 32), new THREE.MeshToonMaterial({ color: 0x3fa7e6 })); g.add(blau);
  const gruen = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, 1, 32), new THREE.MeshToonMaterial({ color: 0x5bbd4a })); g.add(gruen);
  g.update = (t, u = 0.7) => {
    const wasserH = h * 0.96, grH = wasserH * Math.max(0.001, u), blH = Math.max(0.001, wasserH - grH);
    gruen.scale.y = grH; gruen.position.y = 0.12 + grH / 2; blau.scale.y = blH; blau.position.y = 0.12 + grH + blH / 2;
  };
  return g;
}

/** Erde mit Kontinenten und einem orangen Viertel; u = wie weit das Viertel aufgeklappt ist. */
export function erde(o = {}) {
  const g = new THREE.Group(), R = o.r ?? 2, r = rnd(5);
  g.add(K(new THREE.SphereGeometry(R, 40, 28), 0x3a7fd4, { umriss: 0.04 }));
  for (let i = 0; i < 9; i++) { const lat = (r() - 0.5) * 2.2, lon = r() * 2 * PI; const k = K(new THREE.SphereGeometry(R * (0.22 + r() * 0.2), 10, 8), 0x58b24a, { umriss: 0.005 }); k.scale.set(1, 1, 0.12); const n = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)); k.position.copy(n.clone().multiplyScalar(R * 0.98)); k.lookAt(n.clone().multiplyScalar(5)); g.add(k); }
  const viertel = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 36, 24, 0, PI / 2), new THREE.MeshToonMaterial({ color: 0xff7a2f, transparent: true, opacity: 0.88, side: THREE.DoubleSide })); g.add(viertel);
  g.update = (t, u = 1) => { g.rotation.y = t * 0.18; viertel.visible = u > 0.02; viertel.scale.setScalar(0.4 + 0.6 * glatt(u)); };
  return g;
}

/** Baum (rund, Toon). */
export function baum(o = {}) {
  const g = new THREE.Group(), s = o.s ?? 1;
  g.add(mit(K(new THREE.CylinderGeometry(0.2, 0.28, 1.6, 7), 0x7a5230, { umriss: 0.025 }), 0, 0.8, 0));
  g.add(mit(K(new THREE.SphereGeometry(1.3, 10, 8), o.farbe ?? 0x4f9d4a, { umriss: 0.04 }), 0, 2.5, 0));
  g.add(mit(K(new THREE.SphereGeometry(0.9, 10, 8), 0x62b25a, { umriss: 0.03 }), 0.7, 3.2, 0.2));
  g.scale.setScalar(s); return g;
}

/** Strichcode-Schild («Ware»). */
export function warenschild(o = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#111'; const r = rnd(9);
  for (let i = 0; i < 46; i++) { const w = 3 + Math.floor(r() * 7); x.fillRect(30 + i * 9.8, 30, w, 150); }
  x.font = 'bold 44px system-ui, Arial'; x.fillText('WARE  4 0 0 7 1 3', 40, 232);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(o.b ?? 3, (o.b ?? 3) / 2), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); return m;
}

/** Tor des «Systems»: dunkle Pfosten, Bogen, Warenschild. */
export function tor(o = {}) {
  const g = new THREE.Group(), grau = 0x3a3d44;
  for (const x of [-2.2, 2.2]) g.add(mit(K(new THREE.BoxGeometry(0.6, 4.2, 0.6), grau), x, 2.1, 0));
  g.add(mit(K(new THREE.BoxGeometry(5.4, 0.7, 0.7), grau), 0, 4.3, 0));
  for (let i = -3; i <= 3; i++) g.add(mit(K(new THREE.BoxGeometry(0.08, 3.6, 0.08), 0x1d1d22, { umriss: 0.01 }), i * 0.5, 1.9, 0.1));
  const w = warenschild({ b: 3 }); w.position.set(0, 3.0, 0.45); g.add(w);
  g.update = (t, u = 0) => { w.rotation.z = 0.05 * Math.sin(t * 1.4); };
  return g;
}

/** Bühne: runde Bodenfläche mit Baumkranz, damit die Einstellung nicht im Leeren steht. */
export function buehne(scene, ox, farbe = 0x7cb04e, seed = 3) {
  const g = new THREE.Group(); g.position.set(ox, 0, 0); scene.add(g);
  const boden = new THREE.Mesh(new THREE.CircleGeometry(70, 64), toon(farbe, { rim: 0 })); boden.rotation.x = -PI / 2; boden.position.y = 0.01; boden.receiveShadow = true; g.add(boden);
  const r = rnd(seed);
  for (let i = 0; i < 18; i++) { const a = (i / 18) * 2 * PI + r() * 0.2, d = 30 + r() * 8; const b = baum({ s: 1.2 + r() * 0.8 }); b.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.add(b); }
  return g;
}

/** Tortendiagramm (steht aufrecht): ein Viertel orange, drei Viertel blau; das Viertel schiebt sich bei u heraus. */
export function torte(o = {}) {
  const g = new THREE.Group(), r = o.r ?? 2.2, d = 0.5;
  const rest = K(new THREE.CylinderGeometry(r, r, d, 48, 1, false, PI / 2, 3 * PI / 2), o.rest ?? 0x3a7fd4, { umriss: 0.04 });
  const viertel = new THREE.Group(); viertel.add(K(new THREE.CylinderGeometry(r, r, d, 24, 1, false, 0, PI / 2), o.viertel ?? 0xff7a2f, { umriss: 0.04 }));
  const innen = new THREE.Group(); innen.rotation.x = PI / 2; innen.rotation.y = o.drehung ?? PI * 0.75; innen.add(rest); innen.add(viertel); g.add(innen);
  g.update = (t, u = 1) => { const q = glatt(u), mid = PI / 4; viertel.position.set(Math.sin(mid) * 0.7 * q, 0, Math.cos(mid) * 0.7 * q); g.rotation.z = 0.04 * Math.sin(t * 1.2); g.position.y += 0; };
  return g;
}
