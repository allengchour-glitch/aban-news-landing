/* KB3D Figuren: die Menschen-Modelle (man, woman, worker) werden aus ihren Teilen zusammengesetzt und sitzen am Schreibtisch.
   Modell: Blick nach -z, Höhe 0 bis 1,8. Gesetzt wird: Hüfte auf Sitzhöhe, Beine gebeugt (fest eingebacken), Arme und Kopf bewegen sich.
   Haltungen: busy (tippt), rest (Kaffee), warn (Hand am Kopf), alarm (Arme hoch), sleep (schläft). */
(function (K) {
  'use strict';
  var PI = Math.PI, M = K.M, ST = new K.Stack();
  var HIP = 0.95, KNEE = 0.505, NECK = 1.52, EYEY = 1.67, SHX = 0.14, SHY = 1.47, ELX = 0.24, ELY = 1.16, DY = 0.42, LEGX = 0.08;
  var sin = Math.sin, cos = Math.cos;

  function sstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function mixv(a, b, t) { return a + (b - a) * t; }

  /* ---------- Bildchen für Sprechblasen, Dampf usw. ---------- */
  K.fx = function (R) {
    var G = K.tex.glyph, o = {};
    ['dots', 'q', 'ex', 'puff', 'glow', 'drop', 'spark'].forEach(function (k) { o[k] = R.texture(G(k), { mip: false }); });
    o.z = R.texture(G('z', '#5b6578'), { mip: false });
    return o;
  };

  /* Schultern und Ellbogen heller (Besitzer 05.11.): Punkte nahe den Gelenken von Rumpf und Armen werden bis +60 % aufgehellt, weich auslaufend.
     Dort liegen Arme und Schultern sonst im eigenen Schatten und wirken, besonders bei dunkler Haut, fast schwarz. Die Beine bleiben unberührt. */
  function jointLift(group, x, y, z) {
    var arm = group.indexOf('arm') === 0;
    if (!arm && group !== 'torso') return 0;
    var best = 0, s, d;
    for (s = -1; s <= 1; s += 2) {
      d = Math.sqrt((x - s * SHX) * (x - s * SHX) + (y - SHY) * (y - SHY) + z * z);
      best = Math.max(best, 1 - sstep(0.05, 0.19, d));
      if (arm) { d = Math.sqrt((x - s * ELX) * (x - s * ELX) + (y - ELY) * (y - ELY) + z * z); best = Math.max(best, 1 - sstep(0.04, 0.16, d)); }
    }
    return 0.8 * best;
  }
  K.jointLift = jointLift;

  /* ---------- Bausatz: Modelle, eingebackene Beine, kleine Zusatzteile (gemeinsam für alle Figuren) ---------- */
  K.figureKit = function (R) {
    var kit = { kinds: {}, extra: {} };
    ['man', 'woman', 'worker'].forEach(function (kind) {
      var mod = K.model.load(R, kind, { keep: true, crease: 55, lift: jointLift });
      if (!mod) return;
      var list = [];
      [-1, 1].forEach(function (s) {
        var sd = s < 0 ? 'N' : 'P', tm, sm;
        ST.reset();
        ST.t(s * LEGX, HIP, 0).rx(PI / 2).t(-s * LEGX, -HIP, 0);
        tm = M.copy(new Float32Array(16), ST.m);
        ST.t(s * LEGX, KNEE, 0).rx(-PI / 2).t(-s * LEGX, -KNEE, 0);
        sm = M.copy(new Float32Array(16), ST.m);
        if (mod.cpu['thigh' + sd]) list.push(['thigh' + sd, tm]);
        if (mod.cpu['shin' + sd]) list.push(['shin' + sd, sm]);
      });
      kit.kinds[kind] = { mod: mod, legs: K.model.bake(R, mod, list) };
    });
    // Zusatzteile in Modellkoordinaten (Blick nach -z)
    var B = new K.Builder();
    // Ein sanftes Lächeln, mit der Mundmatrix auch für Alarm und Schlaf verformt.
    for (var j = 0; j < 9; j++) {
      var x = (j - 4) * 0.005;
      B.sph(x, 1.608 + 0.007 * (x * x / 0.0004), -0.113, 0.004, 0.003, 0.004, 6, 4, '#80504a');
    }
    kit.extra.mouth = R.mesh(B);
    B = new K.Builder();
    [-1, 1].forEach(function (s) { B.torus(s * 0.042, 1.672, -0.118, 0.028, 0.0045, 14, 4, '#1c1f27', 0); });
    B.box(0, 1.676, -0.118, 0.03, 0.004, 0.004, '#1c1f27');
    kit.extra.glasses = R.mesh(B);
    B = new K.Builder();
    [-1, 1].forEach(function (s) {
      // Brauen und Lichtpunkte machen den Blick auch ohne Brille lesbar.
      B.push().t(s * 0.043, 1.702, -0.115).rz(s * -0.12).box(0, 0, 0, 0.035, 0.006, 0.006, '#60483d').pop();
      B.sph(s * 0.044 - 0.004, 1.679, -0.127, 0.004, 0.004, 0.003, 6, 4, '#fff8ed', 0.4);
    });
    kit.extra.face = R.mesh(B);
    B = new K.Builder();
    [-1, 1].forEach(function (s) {
      B.push().t(s * 0.047, 1.45, -0.126).rz(s * 0.36).box(0, 0, 0, 0.065, 0.075, 0.015, '#f5eee2').pop();
    });
    for (var j = 0; j < 3; j++) B.sph(0, 1.34 - j * 0.065, -0.14, 0.009, 0.009, 0.005, 6, 4, '#ece5d8');
    kit.extra.collar = R.mesh(B);
    B = new K.Builder();
    B.push().t(0, 1.69, 0).torus(0, 0, 0, 0.125, 0.009, 18, 4, '#20242e', 0, 0, PI);
    B.pop();
    [-1, 1].forEach(function (s) { B.cyl(s * 0.128, 1.675, 0, 0.034, 0.034, 0.035, 10, '#e2503c'); });
    // Kopfhörerbügel liegt in der xy-Ebene (von rechts nach links über den Kopf): passt bereits
    kit.extra.phones = R.mesh(B);
    B = new K.Builder();
    B.box(0, 1.30, -0.134, 0.045, 0.2, 0.01, '#8a2b35'); B.box(0, 1.41, -0.134, 0.06, 0.05, 0.012, '#8a2b35');
    B.box(0, 1.45, -0.128, 0.09, 0.05, 0.012, '#f2f0ec');
    kit.extra.tie = R.mesh(B);
    B = new K.Builder();
    B.cylb(0.287, 0.72, -0.04, 0.032, 0.03, 0.085, 10, '#f3efe8');
    B.box(0.32, 0.765, -0.04, 0.008, 0.045, 0.02, '#f3efe8');
    B.cylb(0.287, 0.8, -0.04, 0.027, 0.027, 0.004, 10, '#5b3a29');
    kit.mugMesh = R.mesh(B);
    return kit;
  };

  var HAUT = ['#f3d3b6', '#e2b48c', '#c68a5f', '#8d5b3e'];
  var HAAR = ['#2b1d14', '#5a3a22', '#a8672a', '#d9b45a', '#8f8f93', '#1b1b1f', '#7a2e1c'];
  var HEMD = ['#698ca6', '#81a591', '#c38a73', '#a093b7', '#c5aa74', '#78a6ad', '#8d99a3', '#c896a4', '#93aa77'];
  var HOSE = ['#3c4252', '#2f3a4d', '#4a4036', '#2b2f38', '#50566a'];
  var SCHUH = ['#2a2a2e', '#e8e6e0', '#6b4a35', '#1f3a5f'];

  /* Eine Figur. seat = {x, z, h}; opt = {kind, seed, boss, mug, glasses, phones} */
  function Figure(R, kit, seat, opt) {
    var k = kit.kinds[opt.kind] || kit.kinds.man;
    this.R = R; this.kit = kit; this.k = k; this.seat = seat; this.opt = opt;
    var hs = opt.seed >>> 0;
    this.ph = (hs % 628) / 100;
    var over = {};
    var shirt = opt.boss ? '#232c42' : HEMD[(hs >>> 3) % HEMD.length];
    over.shirt = shirt; over.oberteil = shirt; over.hemd = shirt;
    over.hose = opt.boss ? '#1c2030' : HOSE[(hs >>> 5) % HOSE.length];
    over.haut = HAUT[hs % HAUT.length];
    over.haar = HAAR[(hs >>> 7) % HAAR.length];
    over.schuh = opt.boss ? '#14171d' : SCHUH[(hs >>> 9) % SCHUH.length]; over.stiefel = over.schuh;
    this.pal = K.model.palette(k.mod, over);
    this.pose = 'rest';
    this.m = {};
    var names = ['torso', 'head', 'eyes', 'armUN', 'armLN', 'armUP', 'armLP', 'mouth', 'extraHead', 'tie', 'mug'];
    for (var i = 0; i < names.length; i++) this.m[names[i]] = new Float32Array(16);
    this.rootM = new Float32Array(16);
    this.glasses = !opt.boss && (hs >>> 11) % 3 === 0;
    this.phones = !opt.boss && (hs >>> 13) % 4 === 0 && !this.glasses;
    this.blink = 0;
    this.hx = seat.x; this.hz = seat.z;
    this.mugMesh = null;
    this.state = { s: 0 };
  }
  Figure.prototype.setPose = function (name) { this.pose = name; };

  /* Berechnet alle Matrizen für die Zeit t (Sekunden) in der aktuellen Haltung. */
  Figure.prototype.compute = function (t, still) {
    var s = this.seat, ph = this.ph, name = this.pose, tt = still ? 0 : t;
    var lean = 0.08, hx = 0.1, hy = 0, hz = 0, eye = 1, mo = 1, mw = 1, bounce = 0;
    var uN = 0.6, aN = -0.2, fN = 1.05, uP = 0.6, aP = -0.2, fP = 1.05;
    var sip = 0;
    var blinkT = (tt * 0.25 + ph) % 1;
    var blink = blinkT > 0.96 && name !== 'sleep' ? 0.1 : 1;
    switch (name) {
      case 'busy':
        lean = 0.10; hx = 0.16 + 0.03 * sin(1.3 * tt + ph); hy = 0.10 * sin(0.6 * tt + ph);
        uN = 0.30 + 0.04 * sin(7.5 * tt + ph); aN = -0.28; fN = 1.40 + 0.08 * sin(9 * tt + ph + 1.3);
        uP = 0.30 + 0.04 * sin(7.5 * tt + ph + PI); aP = -0.28; fP = 1.40 + 0.08 * sin(9 * tt + ph + 4.4);
        break;
      case 'rest': {
        lean = 0.03;
        var cyc = ((tt / 8) + ph / 6.28) % 1;
        sip = still ? 0.0 : Math.min(1, sstep(0, 0.16, cyc) - sstep(0.5, 0.68, cyc));
        hx = 0.05 - 0.14 * sip; hy = 0.08 * sin(0.4 * tt + ph) * (1 - sip);
        uN = 0.35; aN = -0.25; fN = 1.35;
        uP = mixv(0.35, 0.85, sip); aP = mixv(-0.25, -0.30, sip); fP = mixv(1.35, 2.6, sip);
        break;
      }
      case 'warn':
        lean = 0.05; hx = 0.06; hz = 0.12 + 0.05 * sin(0.9 * tt + ph); hy = 0.08 * sin(0.5 * tt);
        uN = 0.35; aN = -0.25; fN = 1.35;
        uP = 1.0; aP = -0.5; fP = 2.6 + 0.12 * sin(6 * tt + ph); mw = 0.8;
        break;
      case 'alarm':
        lean = -0.04; hx = -0.12; eye = 1.25; mo = 4.2; mw = 1.3;
        uN = 2.75 + 0.12 * sin(9 * tt + ph); uP = 2.75 + 0.12 * sin(9 * tt + ph + PI);
        aN = -0.5 - 0.22 * sin(9 * tt + ph); aP = -0.5 - 0.22 * sin(9 * tt + ph + PI);
        fN = 0.2; fP = 0.2; bounce = 0.035 * Math.abs(sin(5.5 * tt + ph));
        break;
      case 'sleep':
        lean = 0.62 + 0.02 * sin(1.6 * tt + ph); hx = 0.78; hz = 0.1; eye = 0.06; mo = 0.5; mw = 0.7;
        uN = 0.9; aN = -0.12; fN = 1.45; uP = 0.9; aP = -0.12; fP = 1.45;
        break;
      default: break;
    }
    eye *= name === 'alarm' ? 1 : blink;
    var S = ST, m = this.m;
    // Wurzel: Platz, Blickrichtung (Modell schaut nach -z, die Figur nach +z), Hüfte auf Sitzhöhe
    S.reset(); S.t(s.x, 0, s.z).ry(s.h + PI).t(0, -DY + bounce, 0);
    M.copy(this.rootM, S.m);
    // Rumpf: dreht um die Hüfte (Vorneigen = -z, also negativer Winkel)
    S.push(); S.t(0, HIP, 0).rx(-lean).t(0, -HIP, 0); M.copy(m.torso, S.m);
    M.copy(m.tie, S.m);
    //   Kopf
    S.push(); S.t(0, NECK, 0).rx(-hx).ry(hy).rz(hz).t(0, -NECK, 0); M.copy(m.head, S.m); M.copy(m.extraHead, S.m);
    S.push(); S.t(0, EYEY, 0).s(1, eye, 1).t(0, -EYEY, 0); M.copy(m.eyes, S.m); S.pop();
    S.push(); S.t(0, 1.612, -0.108).s(mw, mo, 1).t(0, -1.612, 0.108); M.copy(m.mouth, S.m); S.pop();
    S.pop();
    //   Arme
    var side, up, ab, fl;
    for (var i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      up = i === 0 ? uN : uP; ab = i === 0 ? aN : aP; fl = i === 0 ? fN : fP;
      var sd = i === 0 ? 'N' : 'P';
      S.push(); S.t(side * SHX, SHY, 0).rz(side * ab).rx(up).t(-side * SHX, -SHY, 0); M.copy(m['armU' + sd], S.m);
      S.t(side * ELX, ELY, 0).rx(fl).t(-side * ELX, -ELY, 0); M.copy(m['armL' + sd], S.m);
      if (sd === 'P') M.copy(m.mug, S.m);
      S.pop();
    }
    S.pop();
    this.sip = sip;
    // Kopfposition in der Welt (für Bildchen)
    var c = cos(s.h), sn = sin(s.h);
    this.hx = s.x + sn * 0.0; this.hz = s.z + c * 0.0;
    this.up = bounce;
  };

  /* Zeichnet die Figur (Palette-Teile mit der Figurenpalette, Zusatzteile in Eigenfarben). */
  Figure.prototype.draw = function (R, t, still) {
    this.compute(t, still);
    var k = this.k, g = k.mod.groups, m = this.m, pal = this.pal, ex = this.kit.extra;
    R.draw(k.legs, this.rootM, pal); R.shadow(k.legs, this.rootM);
    var names = ['torso', 'head', 'eyes', 'armUN', 'armLN', 'armUP', 'armLP'];
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      if (!g[n]) continue;
      R.draw(g[n], m[n], pal);
      if (i === 0 || i === 1 || i === 3 || i === 5) R.shadow(g[n], m[n]);
    }
    R.draw(ex.mouth, m.mouth);
    R.draw(ex.face, m.extraHead);
    if (this.opt.kind !== 'worker') R.draw(ex.collar, m.torso);
    if (this.glasses) R.draw(ex.glasses, m.extraHead);
    if (this.phones) R.draw(ex.phones, m.extraHead);
    if (this.opt.boss) R.draw(ex.tie, m.tie);
    if (this.pose === 'rest' && this.kit.mugMesh) R.draw(this.kit.mugMesh, m.mug);
  };

  K.Figure = Figure;
  K.figureLook = { HAUT: HAUT, HAAR: HAAR, HEMD: HEMD };
})(window.KB3D);
