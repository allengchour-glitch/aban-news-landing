// pia3d.js — Pia als prozedurale 3D-Toon-Figur (Rundkopf, Kritzel-Stil des Referenzvideos, aber echtes 3D).
// ALLE Bewegung ist eine reine Funktion der Zeit: figur.setzeZeit(t) liefert bei gleichem t immer dasselbe Bild.
//
// Koordinaten (lokal): Pia blickt nach +z, links der Figur ist +x, oben +y. Einheiten ≈ Meter, Pia ≈ 3 m gross (Stilisierung).
// Gelenkwinkel in Bogenmass: *_vor = Schwung nach vorn, *_ab = Abspreizen zur Seite (nach aussen), Knie/Ellbogen = Beugung.
import * as THREE from 'three';
import { koerper, toon, umriss } from './toon.js';

const PI = Math.PI;
const glatt = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, w) => a + (b - a) * w;

export const NEUTRAL = Object.freeze({
  hy: 0, hx: 0, hz: 0, ry: 0,                    // Becken: Höhe, Neigung, Seitenneigung, Drehung
  sx: 0, sz: 0, sy: 0,                           // Wirbelsäule: vor, seitlich, Drehung
  kx: 0, ky: 0, kz: 0,                           // Kopf: nicken, drehen, kippen
  aL_vor: 0.05, aL_ab: 0.14, eL: 0.12, aR_vor: 0.05, aR_ab: 0.14, eR: 0.12,
  bL_vor: 0, kL: 0, fL: 0, bR_vor: 0, kR: 0, fR: 0,
  froh: 0, sorge: 0, lach: 0                     // Gesicht
});
const SCHLUESSEL = Object.keys(NEUTRAL);
const mischen = (a, b, w) => { const o = {}; for (const k of SCHLUESSEL) o[k] = lerp(a[k], b[k], w); return o; };
const mit = (o) => Object.assign({}, NEUTRAL, o);

/** Bewegungs-Clips: (lokale Zeit tl in s, Optionen) → Gelenke. Reine Funktionen. */
export const CLIPS = {
  idle: (tl) => { const a = Math.sin(tl * 2.1); return mit({ hy: 0.012 * a, sx: 0.02 * a, kz: 0.02 * Math.sin(tl * 0.9), ky: 0.12 * Math.sin(tl * 0.55), aL_vor: 0.05 + 0.02 * a, aR_vor: 0.05 - 0.02 * a }); },
  gehen: (tl, o = {}) => {
    const f = o.frq || 0.95, A = o.amp || 0.5, ph = tl * f * 2 * PI, s = Math.sin(ph), c = Math.cos(ph);
    return mit({
      hy: 0.05 * Math.cos(2 * ph) - 0.03, hz: 0.04 * s, ry: 0.10 * s, sy: -0.14 * s, sx: 0.05, ky: 0.06 * s, kz: -0.03 * s,
      bL_vor: A * s, bR_vor: -A * s, kL: 0.9 * A * Math.max(0, c), kR: 0.9 * A * Math.max(0, -c), fL: -0.2 * A * s, fR: 0.2 * A * s,
      aL_vor: -0.55 * A * s, aR_vor: 0.55 * A * s, eL: 0.25 + 0.2 * Math.max(0, s), eR: 0.25 + 0.2 * Math.max(0, -s)
    });
  },
  winken: (tl) => mit({ aR_vor: 0.2, aR_ab: 2.55 + 0.05 * Math.sin(tl * 3), eR: 0.55 + 0.55 * Math.sin(tl * 11), kz: 0.12, ky: -0.15, sx: 0.04, lach: 0.8, froh: 0.3, hx: 0.03 }),
  denken: (tl) => mit({ aR_vor: 1.45, aR_ab: 0.35, eR: 2.05, aL_vor: 0.9, aL_ab: 0.1, eL: 1.7, kz: 0.14 * Math.sin(tl * 0.9) + 0.08, kx: 0.1, ky: -0.18 + 0.1 * Math.sin(tl * 0.6), sorge: 0.8, sx: 0.04 }),
  jubeln: (tl) => { const h = Math.abs(Math.sin(tl * PI * 1.6)); return mit({ hy: 0.55 * h, aL_ab: 2.7, aR_ab: 2.7, aL_vor: 0.1, aR_vor: 0.1, eL: 0.2, eR: 0.2, kx: -0.12, bL_vor: 0.25 * h, bR_vor: -0.2 * h, kL: 0.5 * h, kR: 0.5 * h, froh: 1, lach: 1, sx: -0.05 }); },
  ruehren: (tl) => { const s = Math.sin(tl * 5.5); return mit({ aR_vor: 1.0 + 0.1 * s, aR_ab: 0.15, eR: 1.1 + 0.25 * Math.cos(tl * 5.5), aL_vor: 0.55, aL_ab: 0.25, eL: 0.9, sx: 0.12, kx: 0.14, ky: 0.18, lach: 0.7, hy: -0.02, kL: 0.1, kR: 0.1 }); },
  ernten: (tl) => { const b = glatt(0.5 + 0.5 * Math.sin(tl * 1.8 - 1.2)); return mit({ sx: 0.12 + 0.42 * b, hx: 0.08 * b, hy: -0.12 * b, kL: 0.4 * b, kR: 0.4 * b, bL_vor: 0.22 * b, bR_vor: 0.22 * b, aR_vor: 0.55 + 0.85 * b, aR_ab: 0.2, eR: 0.5, aL_vor: 0.5, eL: 0.4, kx: -0.3 * b, lach: 0.5, ky: 0.15 }); },
  tragen: (tl) => { const m = CLIPS.gehen(tl, { frq: 0.9, amp: 0.42 }); return Object.assign(m, { aL_vor: 0.85, aR_vor: 0.85, aL_ab: 0.35, aR_ab: 0.35, eL: 1.05, eR: 1.05, sx: 0.09, kx: 0.05, lach: 0.6 }); },
  anstossen: (tl) => { const s = glatt(0.5 + 0.5 * Math.sin(tl * 1.7 - 1.2)); return mit({ aR_vor: 0.7 + 0.6 * s, aR_ab: 0.5 + 0.5 * s, eR: 1.4 - 0.4 * s, aL_vor: 0.3, eL: 0.5, kz: -0.1, ky: -0.25, lach: 1, froh: 0.7, sx: -0.03, hy: 0.01 * Math.sin(tl * 2) }); },
  sitzen: (tl) => mit({ hy: -0.50, sx: 0.05 + 0.02 * Math.sin(tl * 2), bL_vor: 1.45, bR_vor: 1.45, kL: 1.45, kR: 1.45, fL: 0.1, fR: 0.1, aL_vor: 0.65, aR_vor: 0.7, eL: 0.9, eR: 0.7, lach: 0.7, ky: 0.2 * Math.sin(tl * 0.7), kz: 0.05 }),
  winkenKlein: (tl) => mit({ aR_vor: 0.3, aR_ab: 1.9, eR: 0.5 + 0.5 * Math.sin(tl * 9), lach: 0.7, kz: 0.08, sx: 0.03 }),
  staunen: (tl) => mit({ kx: -0.12, sx: -0.06, aL_ab: 0.7, aR_ab: 0.7, aL_vor: 0.3, aR_vor: 0.3, eL: 0.4, eR: 0.4, hy: 0.01 * Math.sin(tl * 3), lach: 0.2, froh: 0 }),
  zeigen: (tl) => mit({ aR_vor: 1.55, aR_ab: 0.3, eR: 0.08, aL_vor: 0.1, kx: -0.04, ky: -0.2, kz: 0.05, sx: 0.04, lach: 0.15, hy: 0.008 * Math.sin(tl * 2.2) }),
  ernst: (tl) => mit({ sorge: 0.9, kx: 0.16, aL_vor: 0.55, aR_vor: 0.55, aL_ab: 0.3, aR_ab: 0.3, eL: 1.3, eR: 1.3, sx: 0.05, hy: 0.01 * Math.sin(tl * 1.7), ky: 0.1 * Math.sin(tl * 0.5) }),
  rennen: (tl) => CLIPS.gehen(tl, { frq: 1.7, amp: 0.95 })
};

const SCHUH = 0x16161a, HAUT = 0xf9f7f1;

export function erzeugePia(opt = {}) {
  const kleid = opt.kleid ?? 0xb9763f, flicken = opt.flicken ?? 0xe3c58a, haarFarbe = opt.haar ?? 0x2a1a13, schleife = opt.schleife === null ? null : (opt.schleife ?? 0xe76f51);
  const s = opt.skala ?? 1;
  const wurzel = new THREE.Group(); wurzel.scale.setScalar(s);
  const huefte = new THREE.Group(); huefte.position.y = 1.0; wurzel.add(huefte);
  const raum = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const schwarz = () => toon(SCHUH, { rim: 0.15 });
  const zyl = (r, l, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 10), mat); m.position.y = -l / 2; m.castShadow = true; return m; };

  // Beine
  const bein = {};
  for (const seite of ['L', 'R']) {
    const sx = seite === 'L' ? 0.2 : -0.2;
    const oberschenkel = raum(huefte, sx, 0, 0); oberschenkel.add(zyl(0.055, 0.5, schwarz()));
    const knie = raum(oberschenkel, 0, -0.5, 0); knie.add(zyl(0.055, 0.5, schwarz()));
    const fuss = raum(knie, 0, -0.5, 0);
    const schuh = koerper(new THREE.SphereGeometry(0.16, 20, 14), SCHUH, { umriss: 0.015, rim: 0.2 }); schuh.scale.set(1.15, 0.62, 1.9); schuh.position.set(0, -0.04, 0.14); fuss.add(schuh);
    bein[seite] = { oberschenkel, knie, fuss };
  }

  // Rumpf: Tunika mit ausgefranstem Saum und Flicken
  const rumpf = raum(huefte, 0, 0.05, 0);
  const tg = new THREE.CylinderGeometry(0.3, 0.5, 1.0, 24, 4, false); const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { if (tp.getY(i) < -0.49) { const a = Math.atan2(tp.getZ(i), tp.getX(i)); tp.setY(i, -0.5 - 0.07 * Math.abs(Math.sin(a * 5))); } }
  tg.computeVertexNormals();
  const tunika = koerper(tg, kleid, { umriss: 0.03, rim: 0.4 }); tunika.position.y = 0.3; rumpf.add(tunika);
  const flick = (x, y, r, farbe) => { const rad = lerp(0.5, 0.3, (y + 0.2) / 1.0); const m = koerper(new THREE.CylinderGeometry(r, r, 0.03, 14), farbe, { umriss: 0.012 }); m.rotation.x = PI / 2; m.position.set(x, y + 0.3 - 0.3, Math.sqrt(Math.max(0.01, rad * rad - x * x)) + 0.005); rumpf.add(m); };
  flick(-0.14, 0.25, 0.1, flicken); flick(0.17, -0.02, 0.085, flicken);

  // Arme
  const arm = {};
  for (const seite of ['L', 'R']) {
    const sx = seite === 'L' ? 0.37 : -0.37;
    const schulter = raum(rumpf, sx, 0.72, 0); schulter.add(zyl(0.05, 0.56, schwarz()));
    const ellbogen = raum(schulter, 0, -0.56, 0); ellbogen.add(zyl(0.05, 0.56, schwarz()));
    const hand = raum(ellbogen, 0, -0.56, 0);
    const handsch = koerper(new THREE.SphereGeometry(0.17, 22, 16), HAUT, { umriss: 0.02, rim: 0.25 }); handsch.scale.set(0.95, 1.2, 0.8); handsch.position.y = -0.14; hand.add(handsch);
    const daumen = koerper(new THREE.SphereGeometry(0.075, 14, 10), HAUT, { umriss: 0.012 }); daumen.scale.set(0.8, 1.15, 0.8); daumen.position.set(seite === 'L' ? -0.13 : 0.13, -0.07, 0.04); hand.add(daumen);
    arm[seite] = { schulter, ellbogen, hand };
  }
  // Requisiten (je nach Clip sichtbar)
  const requisit = {};
  {
    const loeffel = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), toon(0x8a5f3a, { rim: 0 })); st.position.y = -0.55; st.castShadow = true; loeffel.add(st);
    const kopfL = koerper(new THREE.SphereGeometry(0.1, 12, 8), 0x8a5f3a, { umriss: 0.01 }); kopfL.scale.set(1, 0.55, 1.4); kopfL.position.y = -1.08; loeffel.add(kopfL); loeffel.position.set(0, -0.12, 0.05); loeffel.rotation.x = -0.5; arm.R.hand.add(loeffel); requisit.loeffel = loeffel;
    const becher = new THREE.Group(); const bm = koerper(new THREE.CylinderGeometry(0.15, 0.11, 0.3, 14), 0xd9a458, { umriss: 0.015 }); bm.position.y = -0.3; becher.add(bm); becher.position.set(0, -0.05, 0.12); arm.R.hand.add(becher); requisit.becher = becher;
    const korb = new THREE.Group(); const kb = koerper(new THREE.CylinderGeometry(0.42, 0.32, 0.34, 18), 0xc9954a, { umriss: 0.02 }); kb.position.y = -0.1; korb.add(kb);
    const gem = [[0x4fb069, -0.12, 0.07], [0xef476f, 0.1, 0.1], [0xf78c1f, 0.0, 0.12]]; for (const [f, x, z] of gem) { const g = koerper(new THREE.SphereGeometry(0.13, 12, 10), f, { umriss: 0.012 }); g.position.set(x, 0.1, z); korb.add(g); }
    const henkel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 6, 20, PI), toon(0x8a6226, { rim: 0 })); henkel.position.y = 0.05; korb.add(henkel);
    korb.position.set(0.0, -0.22, 0.46); arm.L.hand.add(korb); requisit.korb = korb;
    for (const k of Object.keys(requisit)) requisit[k].visible = false;
  }

  // Kopf
  const hals = raum(rumpf, 0, 0.88, 0);
  const kopf = raum(hals, 0, 0.74, 0);
  const schaedel = koerper(new THREE.SphereGeometry(0.62, 48, 32), HAUT, { umriss: 0.038, rim: 0.3 }); kopf.add(schaedel);
  const aufKopf = (az, el, r = 0.62) => new THREE.Vector3(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az));
  const setze = (m, az, el, r = 0.62, ra = 1.0) => { const p = aufKopf(az, el, r * ra); m.position.copy(p); m.lookAt(p.clone().multiplyScalar(2)); kopf.add(m); return m; };
  const dunkel = toon(0x1d1d22, { rim: 0 });
  const augenGr = []; const augen = new THREE.Group(); kopf.add(augen);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), dunkel); e.scale.set(0.7, 1.0, 0.35); const p = aufKopf(sx * 0.34, 0.06, 0.6); e.position.copy(p); e.lookAt(p.clone().multiplyScalar(2)); augen.add(e); augenGr.push(e); }
  const froh = new THREE.Group(); kopf.add(froh);
  for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 6, 16, PI), dunkel); const p = aufKopf(sx * 0.34, 0.06, 0.615); a.position.copy(p); a.lookAt(p.clone().multiplyScalar(2)); froh.add(a); }
  froh.visible = false;
  const wangen = []; for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), new THREE.MeshBasicMaterial({ color: 0xff8f7a, transparent: true, opacity: 0.45 })); setze(w, sx * 0.58, -0.22, 0.621); wangen.push(w); }
  // Brauen
  const brauen = []; for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.028, 0.02), dunkel); const g = new THREE.Group(); const p = aufKopf(sx * 0.34, 0.33, 0.615); g.position.copy(p); g.lookAt(p.clone().multiplyScalar(2)); g.add(b); kopf.add(g); brauen.push({ g, sx }); }
  // Mund: Lächeln (Bogen), Sorgenbogen, offener Mund (Lippen)
  const mundG = new THREE.Group(); { const p = aufKopf(0, -0.3, 0.615); mundG.position.copy(p); mundG.lookAt(p.clone().multiplyScalar(2)); kopf.add(mundG); }
  const lachBogen = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 6, 20, PI), dunkel); lachBogen.rotation.z = PI; mundG.add(lachBogen);
  const offen = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ color: 0x4a1a1e })); offen.position.z = 0.004; offen.visible = false; mundG.add(offen);
  const innen = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20, PI, PI), new THREE.MeshBasicMaterial({ color: 0xffffff })); innen.position.z = 0.006; innen.visible = false; mundG.add(innen);

  // Haare: gefüllt, Pony, Locken, Glanz, Schleife
  const hm = toon(haarFarbe, { rim: 0.5, rimFarbe: 0x8a6650 });
  const haar = new THREE.Group(); kopf.add(haar);
  // Volumen hinter dem Kopf (rahmt das Gesicht von der Seite und hinten)
  const hinten = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), hm); hinten.scale.set(0.66, 0.78, 0.5); hinten.position.set(0, -0.06, -0.2); hinten.castShadow = true; umriss(hinten, 0.03); haar.add(hinten);
  const kappe = new THREE.Mesh(new THREE.SphereGeometry(0.67, 40, 24, 0, 2 * PI, 0, 1.42), hm); kappe.rotation.x = -0.18; kappe.castShadow = true; umriss(kappe, 0.025); haar.add(kappe);
  const pony = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), hm); pony.scale.set(1.3, 0.46, 0.5); pony.position.set(-0.1, 0.44, 0.47); pony.rotation.set(-0.5, 0, 0.3); pony.castShadow = true; umriss(pony, 0.02); haar.add(pony);
  for (const sx of [-1, 1]) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), hm); sp.scale.set(0.55, 1.0, 0.8); sp.position.set(sx * 0.58, 0.04, 0.06); sp.castShadow = true; umriss(sp, 0.02); haar.add(sp); }
  const locken = [];
  for (const sx of [-1, 1]) {
    const lg = new THREE.Group(); lg.position.set(sx * 0.55, -0.12, -0.04); haar.add(lg);
    const l = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), hm); l.scale.set(0.15, 0.4, 0.17); l.position.y = -0.3; l.castShadow = true; umriss(l, 0.025); lg.add(l); locken.push({ lg, sx });
  }
  const glanz = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xa77b5e, transparent: true, opacity: 0.55 })); glanz.scale.set(1.5, 0.25, 0.5); glanz.position.set(0.22, 0.54, 0.34); glanz.rotation.set(-0.7, 0.3, -0.5); haar.add(glanz);
  if (schleife !== null) {
    const sch = new THREE.Group(); sch.position.set(-0.34, 0.56, 0.12); sch.rotation.set(-0.3, 0.2, 0.25); haar.add(sch);
    for (const sx of [-1, 1]) { const f = koerper(new THREE.SphereGeometry(0.11, 14, 10), schleife, { umriss: 0.012, rim: 0.2 }); f.scale.set(1.3, 0.8, 0.5); f.position.x = sx * 0.12; f.rotation.z = sx * 0.4; sch.add(f); }
    sch.add(koerper(new THREE.SphereGeometry(0.06, 10, 8), 0xf08a6b, { umriss: 0.01 }));
  }

  // Schatten-Blob unter der Figur (zusätzlich zum Schlagschatten, weich)
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ color: 0x14141c, transparent: true, opacity: 0.18 })); blob.rotation.x = -PI / 2; blob.position.y = 0.02; wurzel.add(blob);

  let lippen = null, lippenFps = 30;
  const api = {
    wurzel, huefte, rumpf, kopf, hals, arm, bein, requisit,
    /** Hüllkurve der Stimme (0..1 je Bild) für die Lippenbewegung. */
    setzeLippen(arr, fps = 30) { lippen = arr; lippenFps = fps; },
    /** Gelenke setzen (Objekt wie NEUTRAL), t nur für Blinzeln, Haare, Lippen. */
    anwenden(j, t, opt2 = {}) {
      huefte.position.y = 1.0 + j.hy; huefte.rotation.set(-j.hx, j.ry, j.hz);
      rumpf.rotation.set(-j.sx, j.sy, j.sz);
      hals.rotation.set(0, 0, 0); kopf.rotation.set(-j.kx, j.ky, j.kz);
      for (const [k, S] of [['L', 'L'], ['R', 'R']]) {
        const sg = k === 'L' ? 1 : -1;
        arm[k].schulter.rotation.set(-j['a' + S + '_vor'], 0, sg * j['a' + S + '_ab']);
        arm[k].ellbogen.rotation.set(-j['e' + S], 0, 0);
        bein[k].oberschenkel.rotation.set(-j['b' + S + '_vor'], 0, 0);
        bein[k].knie.rotation.set(j['k' + S], 0, 0);
        bein[k].fuss.rotation.set(j['f' + S], 0, 0);
      }
      // Gesicht: Blinzeln, froh (geschlossene Bögen), Sorge-Brauen, Lächeln/Offen (Lippen)
      const ph = (t % 3.4), blink = ph > 3.25 ? Math.max(0.08, Math.abs(ph - 3.325) / 0.075) : 1;
      const zu = Math.max(blink >= 1 ? 0 : 1 - blink, j.froh > 0.5 ? 1 : 0);
      augen.scale.y = j.froh > 0.5 ? 0.0001 : Math.min(1, blink); froh.visible = j.froh > 0.5;
      for (const b of brauen) { b.g.rotation.z = b.sx * (j.sorge * 0.5) - b.sx * j.lach * 0.08; b.g.position.y = aufKopf(0, 0.33 + j.sorge * 0.02 + j.lach * 0.03, 0.615).y; }
      let auf = 0; if (lippen && lippen.length) { const i = Math.min(lippen.length - 1, Math.max(0, Math.round(t * lippenFps))); auf = lippen[i] || 0; }
      lachBogen.visible = auf < 0.08; offen.visible = auf >= 0.08; innen.visible = auf >= 0.08 && auf > 0.3;
      lachBogen.rotation.z = j.sorge > 0.4 ? 0 : PI; lachBogen.scale.set(0.8 + 0.5 * j.lach, 0.5 + 0.7 * j.lach, 1);
      offen.scale.set(0.9 + 0.2 * auf, 0.18 + 0.85 * auf, 1); innen.scale.set(0.9 + 0.2 * auf, 0.18 + 0.85 * auf, 1);
      // Haare: weiches Nachschwingen
      const sw = Math.sin(t * 1.9 + 0.6) * 0.05 + (opt2.tempo || 0) * 0.25;
      for (const l of locken) { l.lg.rotation.z = l.sx * (0.12 + 0.04 * Math.sin(t * 1.7)) + (opt2.wind || 0); l.lg.rotation.x = -(0.04 + sw) - j.sx * 0.5 - (opt2.tempo || 0) * 0.4; }
      for (const k of Object.keys(requisit)) requisit[k].visible = opt2.requisit === k;
    }
  };
  return api;
}

/**
 * Zeitleiste für eine Figur: Segmente (Clip + Übergang) und Bahn (Position/Blickrichtung). Reine Funktion von t.
 *   segmente: [{ t0, t1, clip: 'gehen', opt: {frq:.95}, requisit: 'korb' }]  (zeitlich geordnet, Übergang `blende` s)
 *   bahn: [{ t, x, z, ry, lin: true }]  Keyframes; zwischen Keyframes weich (oder linear bei lin)
 */
export function spieler(figur, segmente, bahn = [], opt = {}) {
  const blende = opt.blende ?? 0.35, y0 = opt.y ?? (() => 0);
  const seg = [...segmente].sort((a, b) => a.t0 - b.t0);
  const gelenkeBei = (t) => {
    let i = seg.findIndex((x) => t >= x.t0 && t < x.t1); if (i < 0) i = t < seg[0].t0 ? 0 : seg.length - 1;
    const cur = seg[i]; const tl = t - cur.t0;
    let j = CLIPS[cur.clip](tl, cur.opt || {});
    // Übergang vom vorigen Segment (am Anfang) und zum nächsten (am Ende)
    const vor = seg[i - 1]; if (vor && tl < blende) { const w = glatt(tl / blende); j = mischen(CLIPS[vor.clip](t - vor.t0, vor.opt || {}), j, w); }
    const nach = seg[i + 1]; if (nach && cur.t1 - t < 0 && false) j = j;
    return { j, seg: cur };
  };
  const bahnBei = (t) => {
    if (!bahn.length) return { x: 0, z: 0, ry: 0, v: 0 };
    if (t <= bahn[0].t) return { x: bahn[0].x, z: bahn[0].z, ry: bahn[0].ry || 0, v: 0 };
    const n = bahn.length; if (t >= bahn[n - 1].t) return { x: bahn[n - 1].x, z: bahn[n - 1].z, ry: bahn[n - 1].ry || 0, v: 0 };
    let k = 0; while (k < n - 2 && t >= bahn[k + 1].t) k++;
    const a = bahn[k], b = bahn[k + 1], u = (t - a.t) / (b.t - a.t), w = a.lin ? u : glatt(u);
    let dr = (b.ry || 0) - (a.ry || 0); while (dr > PI) dr -= 2 * PI; while (dr < -PI) dr += 2 * PI;
    const dist = Math.hypot(b.x - a.x, b.z - a.z), v = dist / (b.t - a.t);
    return { x: lerp(a.x, b.x, w), z: lerp(a.z, b.z, w), ry: (a.ry || 0) + dr * glatt(Math.min(1, u * 2)), v: a.lin ? v : v * 1.5 * (1 - Math.abs(2 * u - 1)) };
  };
  return {
    figur,
    setzeZeit(t) {
      const { j, seg: sg } = gelenkeBei(t), p = bahnBei(t);
      figur.wurzel.position.set(p.x, y0(p.x, p.z), p.z); figur.wurzel.rotation.y = p.ry;
      figur.anwenden(j, t, { requisit: sg.requisit, tempo: Math.min(1, p.v / 3) * 0.2 });
    }
  };
}
