/* KB3D Requisiten: Möbel und Kleinkram als Bausteine. Jede Funktion schreibt in einen Builder B (Weltkoordinaten über den Stapel).
   B.cast = true heisst: wirft Schatten. Kleinteile werfen keinen, das spart Zeichenaufrufe. */
(function (K) {
  'use strict';
  var P = {};
  var PI = Math.PI;

  var C = {
    wood: '#c9a57a', woodD: '#8f6b47', woodL: '#e3cfa8', oak: '#d2ad7e', walnut: '#7b5538',
    white: '#f2f0ec', offwhite: '#e4e1da', grey: '#9aa1ab', greyL: '#c9ced6', greyD: '#4a5160', dark: '#262b37', black: '#14171d',
    metal: '#aeb6c2', metalD: '#7d8693',
    blue: '#4f6fa5', teal: '#3f9a8c', pink: '#d9748f', orange: '#e48a3f', yellow: '#e8bd45', red: '#d95555', green: '#58a56b', greenD: '#3d7d4e', purple: '#8a6fb0', cyan: '#37c8d8', gold: '#e1b64a',
    card: '#c49a63', cardD: '#a97f4d', tape: '#e6d3a8', leaf: '#4f9a5c', leafL: '#6fbf7a', pot: '#b9694a', skin: '#e2b48c'
  };
  P.C = C;

  var STY = {
    oak: { top: '#d6b88c', side: '#a98760', drawer: '#c19a6c' },
    white: { top: '#f0eee9', side: '#cfcac1', drawer: '#e4e0d8' },
    dark: { top: '#3a3f4b', side: '#2a2e38', drawer: '#343946' },
    exec: { top: '#6f4a31', side: '#573822', drawer: '#7b5238' },
    metal: { top: '#c7ccd4', side: '#8e96a3', drawer: '#a9b0bb' }
  };

  function loc(o, lx, lz) {
    var c = Math.cos(o.heading), s = Math.sin(o.heading);
    return [o.x + lx * c + lz * s, o.z - lx * s + lz * c];
  }

  /* ---------- Kleinkram auf dem Tisch (Tischfläche liegt bei y = 0.75, lokale Koordinaten) ---------- */
  var ITEMS = {
    mug: function (B, o, hs) {
      var cols = [C.white, C.red, C.teal, C.yellow, C.blue];
      B.cylb(-0.46, 0.75, 0.56, 0.036, 0.034, 0.09, 10, cols[hs % cols.length]);
      B.box(-0.5, 0.8, 0.56, 0.008, 0.05, 0.02, C.white);
      B.cylb(-0.46, 0.838, 0.56, 0.03, 0.03, 0.004, 10, '#5b3a29');
    },
    plant: function (B, o, hs) {
      B.cylb(0.56, 0.75, 0.97, 0.05, 0.04, 0.07, 10, C.pot);
      for (var i = 0; i < 5; i++) {
        var a = i / 5 * PI * 2 + hs;
        B.push().t(0.56 + Math.cos(a) * 0.025, 0.84, 0.97 + Math.sin(a) * 0.025).rz(Math.cos(a) * 0.5).rx(-Math.sin(a) * 0.5).cyl(0, 0.04, 0, 0.0, 0.025, 0.1, 6, i % 2 ? C.leaf : C.leafL).pop();
      }
    },
    cactus: function (B) {
      B.cylb(0.55, 0.75, 0.95, 0.045, 0.04, 0.06, 10, C.orange);
      B.cylb(0.55, 0.81, 0.95, 0.03, 0.032, 0.1, 8, C.greenD);
      B.sph(0.55, 0.915, 0.95, 0.03, 0.03, 0.03, 8, 6, C.greenD);
      B.cylb(0.585, 0.85, 0.95, 0.014, 0.016, 0.05, 6, C.greenD);
    },
    lamp: function (B) {
      B.cylb(0.62, 0.75, 0.62, 0.06, 0.065, 0.016, 12, C.dark);
      B.push().t(0.62, 0.757, 0.62).rz(0.1).box(0, 0.12, 0, 0.012, 0.24, 0.012, C.dark).pop();
      B.push().t(0.605, 0.99, 0.62).rz(-0.9).box(0, 0.07, 0, 0.012, 0.14, 0.012, C.dark).pop();
      B.push().t(0.54, 1.07, 0.62).rz(-0.5).cyl(0, -0.03, 0, 0.07, 0.03, 0.08, 12, C.yellow, 0.0).pop();
      B.sph(0.53, 1.03, 0.62, 0.02, 0.02, 0.02, 6, 4, '#fff7d6', 1);
    },
    notepad: function (B) {
      B.push().t(0.38, 0, 0.5).ry(0.2);
      B.box(0, 0.7565, 0, 0.15, 0.012, 0.2, C.white);
      B.box(0, 0.7635, -0.02, 0.12, 0.002, 0.1, '#cfd8e8');
      B.box(0.1, 0.76, 0.05, 0.01, 0.01, 0.12, C.red);
      B.pop();
    },
    phone: function (B) {
      B.push().t(-0.62, 0, 0.75).ry(0.5).box(0, 0.755, 0, 0.07, 0.01, 0.14, C.dark).box(0, 0.7605, 0, 0.06, 0.001, 0.12, '#445', 0.3).pop();
    },
    headphones: function (B) {
      B.push().t(0.4, 0.75, 0.9).torus(0, 0.06, 0, 0.065, 0.008, 14, 5, C.dark, 0, 0, PI).pop();
      B.cylb(0.335, 0.75, 0.9, 0.03, 0.03, 0.025, 10, C.red);
      B.cylb(0.465, 0.75, 0.9, 0.03, 0.03, 0.025, 10, C.red);
    },
    frame: function (B, o, hs) {
      B.push().t(-0.58, 0, 0.98).rx(-0.15);
      B.box(0, 0.82, 0, 0.1, 0.13, 0.012, C.dark);
      B.box(0, 0.82, -0.007, 0.08, 0.1, 0.002, ['#f2d8c8', '#d8e8f2', '#e9e2f4'][hs % 3]);
      B.pop();
    },
    stickies: function (B) {
      var cs = [C.yellow, C.pink, C.cyan];
      for (var i = 0; i < 3; i++) B.box(-0.22 + i * 0.07, 1.2 - (i % 2) * 0.03, 0.955, 0.05, 0.05, 0.003, cs[i]);
    },
    snack: function (B) {
      B.cylb(0.3, 0.75, 0.9, 0.07, 0.05, 0.04, 12, C.white);
      for (var i = 0; i < 4; i++) B.sph(0.3 + Math.cos(i * 1.6) * 0.03, 0.8, 0.9 + Math.sin(i * 1.6) * 0.03, 0.018, 0.018, 0.018, 6, 4, [C.orange, C.red, C.yellow, C.green][i]);
    },
    tissue: function (B) {
      B.blk(0.6, 0.75, 0.45, 0.12, 0.05, 0.07, C.cyan);
      B.box(0.6, 0.81, 0.45, 0.04, 0.03, 0.02, C.white);
    },
    figurine: function (B, o, hs) {
      B.cylb(-0.6, 0.75, 0.9, 0.025, 0.03, 0.01, 8, C.dark);
      B.cylb(-0.6, 0.76, 0.9, 0.012, 0.016, 0.05, 8, [C.red, C.blue, C.green][hs % 3]);
      B.sph(-0.6, 0.83, 0.9, 0.018, 0.018, 0.018, 8, 6, C.skin);
    }
  };
  var ITEM_KEYS = ['mug', 'plant', 'lamp', 'notepad', 'phone', 'headphones', 'frame', 'stickies', 'snack', 'tissue', 'figurine', 'cactus'];

  /* ---------- Stuhl ---------- */
  P.chair = function (B, col, hi) {
    B.cast = true;
    B.cylb(0, 0.18, 0, 0.028, 0.034, 0.24, 8, C.metalD);
    B.cast = false;
    for (var i = 0; i < 5; i++) {
      var a = i / 5 * PI * 2 + 0.3;
      B.push().t(0, 0.1, 0).ry(a).box(0.14, 0, 0, 0.28, 0.026, 0.045, C.black).pop();
      B.sph(Math.sin(a) * 0.27, 0.035, Math.cos(a) * 0.27, 0.032, 0.032, 0.032, 6, 4, C.dark);
    }
    B.cast = true;
    B.box(0, 0.43, 0, 0.48, 0.08, 0.46, col);
    B.box(0, 0.385, 0, 0.44, 0.01, 0.42, C.black);
    B.push().t(0, hi ? 0.84 : 0.72, -0.22).rx(-0.12);
    B.box(0, 0, 0, 0.46, hi ? 0.72 : 0.46, 0.07, col);
    if (hi) B.box(0, 0.42, 0.02, 0.4, 0.14, 0.06, col);
    B.pop();
    B.cast = false;
    for (var s = -1; s <= 1; s += 2) {
      B.box(s * 0.26, 0.62, 0.0, 0.045, 0.035, 0.3, C.black);
      B.box(s * 0.26, 0.535, 0.1, 0.03, 0.17, 0.03, C.black);
    }
  };

  /* ---------- Schreibtisch mit Stuhl, Beinen, Bildschirm(en) ---------- */
  P.desk = function (B, o) {
    var w = o.w || 1.5, st = STY[o.style || 'oak'], hs = o.seed >>> 0, i;
    o.screens = o.screens || [];
    B.push().t(o.x, 0, o.z).ry(o.heading);
    B.cast = true;
    B.box(0, 0.725, 0.72, w, 0.05, 0.8, st.top);
    B.blk(w / 2 - 0.03, 0, 0.72, 0.05, 0.70, 0.76, st.side);
    B.blk(-w / 2 + 0.25, 0, 0.72, 0.46, 0.70, 0.74, st.side);
    B.blk(0.12, 0.28, 1.08, w - 0.7, 0.42, 0.03, st.side);
    B.cast = false;
    for (i = 0; i < 3; i++) {
      B.box(-w / 2 + 0.25, 0.14 + i * 0.2, 0.343, 0.4, 0.17, 0.012, st.drawer);
      B.box(-w / 2 + 0.25, 0.19 + i * 0.2, 0.335, 0.12, 0.014, 0.012, C.metal);
    }
    B.box(0, 0.697, 0.72, w - 0.02, 0.012, 0.78, C.black);          // Unterseite der Platte
    // Stuhl
    P.chair(B, o.chair || C.greyD, o.high);
    // Beine der Figur (fest) und Schuhe
    var pants = o.pants || '#3c4252', shoe = o.shoe || '#2a2a2e';
    for (var s = -1; s <= 1; s += 2) {
      B.box(s * 0.1, 0.515, 0.2, 0.14, 0.13, 0.42, pants);
      B.box(s * 0.1, 0.26, 0.41, 0.125, 0.5, 0.125, pants);
      B.box(s * 0.1, 0.035, 0.485, 0.135, 0.07, 0.25, shoe);
      B.box(s * 0.1, 0.012, 0.49, 0.14, 0.024, 0.255, '#e8e6e0');
    }
    // Tastatur, Maus
    B.box(0, 0.7585, 0.44, 0.44, 0.016, 0.15, C.dark);
    for (i = 0; i < 4; i++) B.box(0, 0.7675, 0.39 + i * 0.033, 0.4, 0.003, 0.022, '#8a92a0');
    B.box(-0.34, 0.752, 0.46, 0.2, 0.003, 0.18, '#3a4152');
    B.sph(-0.34, 0.762, 0.47, 0.022, 0.014, 0.034, 8, 5, C.black);
    // Bildschirme
    var kind = o.kind || 'monitor';
    function panel(lx, lz, ang, pw, ph, ph0) {
      B.push().t(lx, ph0 + ph / 2, lz).ry(ang);
      B.box(0, 0, 0, pw, ph, 0.032, C.black);
      B.box(0, -ph / 2 - 0.004, 0.0, pw * 0.5, 0.012, 0.03, C.dark);
      B.pop();
      B.push().t(lx, 0.75, lz).ry(ang);
      B.box(0, 0.007, 0, 0.2, 0.014, 0.14, C.dark);
      B.box(0, 0.07, 0.01, 0.045, 0.14, 0.03, C.dark);
      B.pop();
      var p = loc(o, lx - 0.0185 * Math.sin(ang), lz - 0.0185 * Math.cos(ang));
      o.screens.push({ x: p[0], y: ph0 + ph / 2, z: p[1], ry: o.heading + PI + ang, tilt: 0, w: pw - 0.04, h: ph - 0.04 });
    }
    if (kind === 'monitor') panel(0, 0.98, 0, 0.62, 0.37, 0.86);
    else if (kind === 'dual') { panel(0.33, 0.97, 0.3, 0.5, 0.31, 0.86); panel(-0.33, 0.97, -0.3, 0.5, 0.31, 0.86); }
    else if (kind === 'tri') { panel(0, 1.0, 0, 0.5, 0.31, 0.86); panel(0.5, 0.92, 0.55, 0.5, 0.31, 0.86); panel(-0.5, 0.92, -0.55, 0.5, 0.31, 0.86); }
    else if (kind === 'laptop') {
      B.box(0, 0.7625, 0.7, 0.34, 0.015, 0.24, C.metalD);
      B.box(0, 0.771, 0.66, 0.3, 0.002, 0.12, C.dark);
      B.push().t(0, 0.77, 0.815).rx(0.2);
      B.box(0, 0.11, 0, 0.34, 0.22, 0.012, C.metalD);
      B.pop();
      var q = loc(o, 0, 0.829), q2 = loc(o, 0, 0.845);
      o.screens.push({ x: q[0], y: 0.77 + 0.11 * Math.cos(0.2), z: q[1], ry: o.heading + PI, tilt: -0.2, w: 0.3, h: 0.19 });
      o.logos = [{ x: q2[0], y: 0.77 + 0.11 * Math.cos(0.2), z: q2[1], ry: o.heading, tilt: 0.2, w: 0.12, h: 0.12 }];
    }
    // Kleinkram: drei Stück, nach Hash gewählt
    if (kind !== 'tri' && o.items !== false) {
      var pick = [], k = 0;
      while (pick.length < 3 && k < 30) {
        var key = ITEM_KEYS[(hs + k * 7) % ITEM_KEYS.length];
        if (pick.indexOf(key) < 0) pick.push(key);
        k++;
      }
      pick.forEach(function (key) { ITEMS[key](B, o, hs); });
    }
    B.pop();
    return o;
  };

  /* Kleinkram auf einem Schreibtisch (drei Stück nach Hash), Platz o = {x, z, heading, seed}. */
  P.deskItems = function (B, o) {
    var hs = o.seed >>> 0, pick = [], k = 0;
    B.push().t(o.x, 0, o.z).ry(o.heading);
    while (pick.length < 3 && k < 30) {
      var key = ITEM_KEYS[(hs + k * 7) % ITEM_KEYS.length];
      if (pick.indexOf(key) < 0) pick.push(key);
      k++;
    }
    pick.forEach(function (key) { ITEMS[key](B, o, hs); });
    B.pop();
  };
  /* Zusätzlicher Bildschirm neben dem Modell-Bildschirm. Gibt den Eintrag für die Bildfläche zurück. */
  P.panel = function (B, o, lx, lz, ang, pw, ph, ph0) {
    B.push().t(o.x, 0, o.z).ry(o.heading);
    B.push().t(lx, ph0 + ph / 2, lz).ry(ang);
    B.box(0, 0, 0, pw, ph, 0.032, C.black);
    B.box(0, -ph / 2 - 0.004, 0.0, pw * 0.5, 0.012, 0.03, C.dark);
    B.pop();
    B.push().t(lx, 0.75, lz).ry(ang);
    B.box(0, 0.007, 0, 0.2, 0.014, 0.14, C.dark);
    B.box(0, 0.07, 0.01, 0.045, 0.14, 0.03, C.dark);
    B.pop();
    B.pop();
    var p = loc(o, lx - 0.0185 * Math.sin(ang), lz - 0.0185 * Math.cos(ang));
    return { x: p[0], y: ph0 + ph / 2, z: p[1], ry: o.heading + PI + ang, tilt: 0, w: pw - 0.04, h: ph - 0.04 };
  };

  /* ---------- Pflanzen ---------- */
  P.plant = function (B, x, z, s, kind, seed) {
    s = s || 1;
    B.push().t(x, 0, z);
    B.cast = true;
    var pot = ['#b9694a', '#e4e0d8', '#4a5160', '#3f9a8c'][(seed || 0) % 4];
    B.cylb(0, 0, 0, 0.3 * s, 0.22 * s, 0.4 * s, 12, pot);
    B.cylb(0, 0.4 * s, 0, 0.29 * s, 0.29 * s, 0.03 * s, 12, '#4a3626');
    B.cast = false;
    var i, a;
    if (kind === 'palm') {
      B.cylb(0, 0.4 * s, 0, 0.04 * s, 0.06 * s, 1.0 * s, 8, '#7b5a3c');
      for (i = 0; i < 8; i++) {
        a = i / 8 * PI * 2;
        B.push().t(0, 1.4 * s, 0).ry(a).rz(-0.9).box(0.4 * s, 0, 0, 0.8 * s, 0.025, 0.2 * s, i % 2 ? C.leaf : C.leafL).pop();
      }
    } else if (kind === 'snake') {
      for (i = 0; i < 7; i++) {
        a = i / 7 * PI * 2 + 0.4;
        B.push().t(Math.cos(a) * 0.07 * s, 0.4 * s, Math.sin(a) * 0.07 * s).rz(Math.cos(a) * 0.12).rx(-Math.sin(a) * 0.12).cylb(0, 0, 0, 0.0, 0.05 * s, (0.7 + (i % 3) * 0.2) * s, 4, i % 2 ? C.greenD : C.leaf).pop();
      }
    } else {
      B.cylb(0, 0.4 * s, 0, 0.03 * s, 0.05 * s, 0.7 * s, 8, '#7b5a3c');
      var cs = [C.leaf, C.leafL, C.greenD];
      for (i = 0; i < 9; i++) {
        a = i * 2.4;
        B.sph(Math.cos(a) * 0.3 * s, (1.1 + (i % 3) * 0.22) * s, Math.sin(a) * 0.3 * s, 0.3 * s, 0.26 * s, 0.3 * s, 8, 6, cs[i % 3]);
      }
      B.sph(0, 1.55 * s, 0, 0.34 * s, 0.3 * s, 0.34 * s, 8, 6, C.leafL);
    }
    B.pop();
  };

  /* ---------- Regale ---------- */
  P.bookshelf = function (B, x, z, ry, w, h, seed) {
    var r = K.tex.rng(seed || 4), i, j;
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.blk(0, 0, 0, w, h, 0.04, C.walnut);                          // Rückwand
    B.blk(-w / 2 + 0.02, 0, 0.16, 0.04, h, 0.34, C.walnut);
    B.blk(w / 2 - 0.02, 0, 0.16, 0.04, h, 0.34, C.walnut);
    B.blk(0, h - 0.03, 0.16, w, 0.04, 0.34, C.walnut);
    B.cast = false;
    var levels = Math.max(3, Math.round(h / 0.42)), step = (h - 0.06) / levels;
    var cols = [C.red, C.blue, C.green, C.yellow, C.purple, C.teal, C.orange, C.white, C.dark];
    for (i = 0; i < levels; i++) {
      var y0 = 0.03 + i * step;
      B.blk(0, y0, 0.16, w - 0.06, 0.03, 0.32, C.wood);
      var xx = -w / 2 + 0.08;
      while (xx < w / 2 - 0.12) {
        var bw = 0.03 + r() * 0.035, bh = step * (0.55 + r() * 0.35);
        if (r() < 0.12) { xx += 0.16; continue; }
        B.blk(xx + bw / 2, y0 + 0.03, 0.16, bw, bh, 0.22, cols[(r() * cols.length) | 0]);
        xx += bw + 0.004;
      }
    }
    B.pop();
  };
  /* Warenregal mit bunten Kartons, Taschen und Schuhen. */
  P.shelfProducts = function (B, x, z, ry, w, h, seed) {
    var r = K.tex.rng(seed || 8), i;
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.blk(0, 0, 0, w, h, 0.04, C.white);
    B.blk(-w / 2 + 0.02, 0, 0.18, 0.04, h, 0.38, C.white);
    B.blk(w / 2 - 0.02, 0, 0.18, 0.04, h, 0.38, C.white);
    B.cast = false;
    var levels = 4, step = (h - 0.08) / levels;
    var cols = [C.pink, C.teal, C.orange, C.blue, C.yellow, C.purple, C.red, C.green];
    for (i = 0; i < levels; i++) {
      var y0 = 0.05 + i * step;
      B.blk(0, y0, 0.18, w - 0.06, 0.03, 0.36, C.offwhite);
      var xx = -w / 2 + 0.1;
      while (xx < w / 2 - 0.16) {
        var t = r(), c = cols[(r() * cols.length) | 0];
        if (t < 0.35) { var bw = 0.2 + r() * 0.1; B.blk(xx + bw / 2, y0 + 0.03, 0.18, bw, 0.14 + r() * 0.06, 0.26, c); B.blk(xx + bw / 2, y0 + 0.03, 0.18, bw + 0.004, 0.03, 0.262, C.white); xx += bw + 0.03; }
        else if (t < 0.65) { B.blk(xx + 0.09, y0 + 0.03, 0.2, 0.18, 0.24, 0.1, c); B.cylb(xx + 0.09, y0 + 0.27, 0.2, 0.05, 0.05, 0.01, 8, C.dark); xx += 0.22; }
        else { B.blk(xx + 0.1, y0 + 0.03, 0.2, 0.2, 0.08, 0.12, c); B.blk(xx + 0.1, y0 + 0.03, 0.2, 0.2, 0.025, 0.12, C.white); B.sph(xx + 0.17, y0 + 0.1, 0.2, 0.04, 0.03, 0.05, 6, 4, c); xx += 0.25; }
      }
    }
    B.pop();
  };

  /* ---------- Sitzmöbel ---------- */
  P.sofa = function (B, x, z, ry, w, col) {
    col = col || C.teal;
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.blk(0, 0.08, 0, w, 0.3, 0.9, col);
    B.blk(0, 0.38, -0.34, w, 0.5, 0.22, col);
    B.blk(-w / 2 + 0.11, 0.08, 0, 0.22, 0.5, 0.9, K.shade(col, 0.9));
    B.blk(w / 2 - 0.11, 0.08, 0, 0.22, 0.5, 0.9, K.shade(col, 0.9));
    B.cast = false;
    var n = Math.max(2, Math.round((w - 0.4) / 0.62));
    for (var i = 0; i < n; i++) B.blk(-w / 2 + 0.22 + (i + 0.5) * (w - 0.44) / n, 0.38, 0.06, (w - 0.44) / n - 0.02, 0.1, 0.62, K.shade(col, 1.12));
    for (var s = -1; s <= 1; s += 2) B.cylb(s * (w / 2 - 0.1), 0, 0.34, 0.025, 0.02, 0.08, 6, C.black);
    B.box(-w / 2 + 0.4, 0.66, -0.12, 0.34, 0.3, 0.1, C.yellow);
    B.pop();
  };
  P.armchair = function (B, x, z, ry, col) {
    P.sofa(B, x, z, ry, 0.95, col || C.orange);
  };
  P.table = function (B, x, z, r, h, top) {
    B.push().t(x, 0, z);
    B.cast = true;
    B.cylb(0, h - 0.04, 0, r, r, 0.04, 16, top || C.white);
    B.cylb(0, 0, 0, 0.03, 0.03, h - 0.04, 8, C.metalD);
    B.cylb(0, 0, 0, r * 0.5, r * 0.5, 0.025, 12, C.metalD);
    B.cast = false;
    B.pop();
  };
  P.rug = function (B, x0, z0, x1, z1, base, border, y) {
    y = y || 0.012;
    B.floor(x0, z0, x1, z1, y, border, 0);
    B.floor(x0 + 0.22, z0 + 0.22, x1 - 0.22, z1 - 0.22, y + 0.003, base, 0);
    B.floor(x0 + 0.32, z0 + 0.32, x1 - 0.32, z1 - 0.32, y + 0.006, K.shade(base, 1.14), 0);
    B.floor(x0 + 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5, y + 0.009, base, 0);
  };
  P.floorLamp = function (B, x, z, col) {
    B.push().t(x, 0, z);
    B.cylb(0, 0, 0, 0.16, 0.16, 0.03, 12, C.dark);
    B.cylb(0, 0.03, 0, 0.018, 0.018, 1.4, 6, C.dark);
    B.cyl(0, 1.58, 0, 0.12, 0.24, 0.3, 14, col || C.offwhite, 0.55);
    B.pop();
  };
  P.trash = function (B, x, z, col) {
    B.push().t(x, 0, z);
    B.cast = true;
    B.cylb(0, 0, 0, 0.19, 0.15, 0.42, 10, col || C.metalD);
    B.cast = false;
    B.cylb(0, 0.42, 0, 0.2, 0.2, 0.02, 10, C.dark);
    B.pop();
  };
  P.waterCooler = function (B, x, z, ry) {
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.blk(0, 0, 0, 0.36, 0.95, 0.36, C.white);
    B.cast = false;
    B.box(0, 0.7, 0.185, 0.14, 0.05, 0.02, C.blue); B.box(0.07, 0.6, 0.19, 0.03, 0.04, 0.03, C.red);
    B.cylb(0, 0.95, 0, 0.14, 0.14, 0.4, 12, '#7fb8e6', 0.12);
    B.sph(0, 1.35, 0, 0.14, 0.09, 0.14, 12, 6, '#7fb8e6', 0.12, 0, PI / 2);
    B.pop();
  };
  P.fridge = function (B, x, z, ry, h) {
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.blk(0, 0, 0, 0.55, h || 0.9, 0.55, C.white);
    B.cast = false;
    B.box(0.2, (h || 0.9) * 0.5, 0.285, 0.025, 0.4, 0.025, C.metal);
    B.box(0, (h || 0.9) * 0.62, 0.278, 0.5, 0.01, 0.01, C.greyL);
    B.pop();
  };
  P.counter = function (B, x, z, ry, w, d) {
    d = d || 0.6;
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.blk(0, 0, 0, w, 0.88, d, C.offwhite);
    B.blk(0, 0.88, 0, w + 0.06, 0.04, d + 0.06, C.walnut);
    B.cast = false;
    for (var i = 0; i < Math.floor(w / 0.5); i++) B.box(-w / 2 + 0.25 + i * 0.5, 0.45, d / 2 + 0.004, 0.46, 0.7, 0.008, C.greyL);
    B.pop();
  };
  P.coffeeMachine = function (B, x, y, z, ry) {
    B.push().t(x, y, z).ry(ry || 0);
    B.blk(0, 0, 0, 0.34, 0.3, 0.3, C.dark);
    B.blk(0, 0.3, 0, 0.34, 0.05, 0.3, C.metalD);
    B.box(0, 0.18, 0.16, 0.12, 0.08, 0.02, C.black);
    B.cylb(0, 0.0, 0.1, 0.03, 0.03, 0.1, 8, C.white);
    B.box(0.1, 0.22, 0.16, 0.03, 0.03, 0.01, C.green, 0.8);
    B.pop();
  };
  P.mug = function (B, x, y, z, col) {
    B.cylb(x, y, z, 0.035, 0.033, 0.08, 10, col || C.white);
    B.box(x + 0.04, y + 0.04, z, 0.008, 0.04, 0.02, col || C.white);
  };

  /* ---------- Serverschrank (Leuchtdioden getrennt, damit sie blinken können) ---------- */
  P.serverRack = function (B, LB, x, z, ry, seed) {
    var r = K.tex.rng(seed || 2), i, j;
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.blk(0, 0, 0, 0.7, 2.1, 0.8, '#232834');
    B.cast = false;
    B.blk(0, 0.02, 0.41, 0.62, 2.02, 0.02, '#161a22');
    for (i = 0; i < 9; i++) {
      var y = 0.2 + i * 0.2;
      B.box(0, y, 0.425, 0.58, 0.14, 0.012, i % 3 === 0 ? '#3a4254' : '#2d3342');
      B.box(-0.1, y, 0.433, 0.3, 0.02, 0.004, '#0e1117');
      B.box(0.18, y + 0.03, 0.433, 0.1, 0.012, 0.004, '#141820');
    }
    B.pop();
    // LEDs: jede Reihe getrennt in LB (ein Netz je Farbe/Phase)
    var cols = ['#34e07f', '#34e07f', '#ffb347', '#4aa8ff'];
    for (i = 0; i < 9; i++) {
      for (j = 0; j < 4; j++) {
        LB[(i + j) % LB.length].push().t(x, 0, z).ry(ry || 0).box(0.2 + j * 0.028, 0.2 + i * 0.2 + 0.03, 0.435, 0.012, 0.012, 0.004, cols[(i * 3 + j + ((r() * 4) | 0)) % cols.length], 1).pop();
      }
    }
  };

  /* ---------- Versand ---------- */
  P.parcel = function (B, w, h, d, col) {
    col = col || C.card;
    B.box(0, h / 2, 0, w, h, d, col);
    B.box(0, h / 2, 0, 0.06, h + 0.004, d + 0.004, C.tape);
    B.box(0, h / 2 + 0.002, 0, w + 0.004, h + 0.002, 0.05, C.tape);
    B.box(w * 0.22, h + 0.003, d * 0.18, w * 0.3, 0.003, d * 0.28, C.white);
    B.box(w * 0.22, h + 0.006, d * 0.18, w * 0.2, 0.002, 0.012, C.dark);
  };
  P.pallet = function (B, x, z, ry, n, seed) {
    var r = K.tex.rng(seed || 3), i;
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.blk(0, 0.0, 0, 1.2, 0.1, 0.8, C.woodD);
    B.cast = false;
    for (i = -1; i <= 1; i++) B.box(i * 0.5, 0.05, 0, 0.18, 0.06, 0.82, C.wood);
    var y = 0.1;
    for (var lv = 0; lv < n; lv++) {
      for (i = 0; i < 2; i++) {
        B.push().t(-0.3 + i * 0.6, y, 0).ry((r() - 0.5) * 0.08);
        B.cast = true; P.parcel(B, 0.5, 0.28, 0.6, lv % 2 ? C.card : C.cardD); B.cast = false;
        B.pop();
      }
      y += 0.28;
    }
    B.pop();
  };
  P.rollCage = function (B, x, z, ry, fill) {
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.blk(0, 0.12, 0, 0.8, 0.04, 0.7, C.metalD);
    B.cast = false;
    var i;
    for (i = 0; i < 4; i++) B.cylb(i % 2 ? 0.38 : -0.38, 0.16, i < 2 ? -0.33 : 0.33, 0.014, 0.014, 1.4, 6, C.yellow);
    for (var y = 0.5; y < 1.5; y += 0.32) { B.box(0, y, -0.33, 0.78, 0.012, 0.012, C.yellow); B.box(-0.38, y, 0, 0.012, 0.012, 0.66, C.yellow); }
    for (i = 0; i < 4; i++) B.sph(i % 2 ? 0.34 : -0.34, 0.06, i < 2 ? -0.28 : 0.28, 0.05, 0.05, 0.05, 6, 4, C.dark);
    if (fill) {
      for (i = 0; i < fill; i++) { B.push().t(-0.2 + (i % 2) * 0.4, 0.14 + Math.floor(i / 2) * 0.3, -0.05 + (i % 3) * 0.1); B.cast = true; P.parcel(B, 0.3, 0.26, 0.34, i % 2 ? C.card : C.cardD); B.cast = false; B.pop(); }
    }
    B.pop();
  };
  P.handTruck = function (B, x, z, ry) {
    B.push().t(x, 0, z).ry(ry || 0).rx(-0.2);
    B.box(-0.14, 0.55, 0, 0.025, 1.1, 0.025, C.blue); B.box(0.14, 0.55, 0, 0.025, 1.1, 0.025, C.blue);
    B.box(0, 1.08, 0, 0.32, 0.025, 0.025, C.blue); B.box(0, 0.5, 0, 0.3, 0.02, 0.02, C.blue);
    B.blk(0, 0.02, 0.1, 0.34, 0.015, 0.2, C.metal);
    B.pop();
    B.sph(x - 0.16, 0.08, z, 0.08, 0.08, 0.04, 8, 6, C.black); B.sph(x + 0.16, 0.08, z, 0.08, 0.08, 0.04, 8, 6, C.black);
  };
  P.scale = function (B, x, y, z) {
    B.push().t(x, y, z);
    B.blk(0, 0, 0, 0.34, 0.05, 0.28, C.metal);
    B.blk(0, 0.05, 0, 0.3, 0.012, 0.24, C.greyL);
    B.box(0.0, 0.07, 0.15, 0.14, 0.04, 0.04, C.dark); B.box(0, 0.075, 0.172, 0.1, 0.02, 0.004, '#8fe6a8', 1);
    B.pop();
  };
  P.tapeGun = function (B, x, y, z, ry) {
    B.push().t(x, y, z).ry(ry || 0);
    B.cylb(0, 0, 0, 0.06, 0.06, 0.05, 12, C.tape);
    B.cylb(0, 0.0, 0, 0.025, 0.025, 0.05, 8, C.dark);
    B.box(0.08, 0.04, 0, 0.1, 0.03, 0.025, C.red);
    B.pop();
  };
  P.bubbleWrap = function (B, x, y, z, ry) {
    B.push().t(x, y, z).ry(ry || 0).rz(PI / 2);
    B.cyl(0, 0, 0, 0.11, 0.11, 0.5, 14, '#cfe8f5');
    B.cyl(0, 0, 0, 0.04, 0.04, 0.52, 8, C.cardD);
    B.pop();
  };
  P.labelPrinter = function (B, x, y, z, ry) {
    B.push().t(x, y, z).ry(ry || 0);
    B.blk(0, 0, 0, 0.2, 0.12, 0.16, C.white);
    B.blk(0, 0.12, -0.02, 0.18, 0.02, 0.1, C.dark);
    B.box(0, 0.06, 0.081, 0.1, 0.012, 0.004, C.red, 0.7);
    B.box(0, 0.15, 0.1, 0.14, 0.003, 0.08, C.white);
    B.pop();
  };
  P.crates = function (B, x, z, ry, n) {
    B.push().t(x, 0, z).ry(ry || 0);
    var cs = [C.blue, C.orange, C.green];
    for (var i = 0; i < n; i++) {
      B.push().t((i % 2) * 0.02, i * 0.26, 0).cast = true;
      B.blk(0, 0, 0, 0.6, 0.25, 0.4, cs[i % 3]);
      B.cast = false;
      B.blk(0, 0.19, 0.201, 0.4, 0.04, 0.004, K.shade(cs[i % 3], 0.7));
      B.pop();
    }
    B.pop();
  };

  /* ---------- Geschäft ---------- */
  P.mannequin = function (B, x, z, col, ry) {
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.cylb(0, 0, 0, 0.2, 0.2, 0.03, 12, C.dark);
    B.cylb(0, 0.03, 0, 0.018, 0.018, 0.5, 6, C.metalD);
    B.cylb(0, 0.5, 0, 0.17, 0.26, 0.55, 12, col || C.pink);
    B.cast = false;
    B.cylb(0, 1.05, 0, 0.2, 0.17, 0.04, 12, K.shade(col || C.pink, 0.8));
    B.cylb(0, 1.09, 0, 0.17, 0.2, 0.32, 12, col || C.pink);
    B.cylb(0, 1.41, 0, 0.05, 0.06, 0.1, 8, C.offwhite);
    B.sph(0, 1.62, 0, 0.1, 0.13, 0.1, 10, 8, C.offwhite);
    B.pop();
  };
  P.clothesRack = function (B, x, z, ry) {
    B.push().t(x, 0, z).ry(ry || 0);
    B.cast = true;
    B.cylb(-0.7, 0, 0, 0.02, 0.02, 1.55, 6, C.metalD); B.cylb(0.7, 0, 0, 0.02, 0.02, 1.55, 6, C.metalD);
    B.box(0, 1.5, 0, 1.4, 0.025, 0.025, C.metal);
    B.box(-0.55, 0.02, 0, 0.04, 0.04, 0.6, C.metalD); B.box(0.55, 0.02, 0, 0.04, 0.04, 0.6, C.metalD);
    B.cast = false;
    var cs = [C.pink, C.teal, C.orange, C.blue, C.yellow, C.purple, C.red, C.green, C.white];
    for (var i = 0; i < 12; i++) {
      var gx = -0.62 + i * 0.113, c = cs[(i * 5) % cs.length];
      B.box(gx, 1.46, 0, 0.012, 0.045, 0.012, C.dark);
      B.blk(gx, 0.78 + (i % 3) * 0.04, 0, 0.05, 0.66 - (i % 3) * 0.04, 0.42, c);
    }
    B.pop();
  };
  P.register = function (B, x, y, z, ry) {
    B.push().t(x, y, z).ry(ry || 0);
    B.blk(0, 0, 0, 0.36, 0.1, 0.3, C.dark);
    B.push().t(0, 0.1, -0.06).rx(-0.4).box(0, 0.09, 0, 0.26, 0.18, 0.02, C.black).pop();
    B.push().t(0, 0.1, -0.06).rx(-0.4).box(0, 0.09, 0.012, 0.22, 0.14, 0.002, '#4aa8ff', 0.8).pop();
    B.box(0.0, 0.0, 0.13, 0.2, 0.06, 0.1, C.metalD);
    B.pop();
  };
  P.bag = function (B, x, z, col, ry) {
    B.push().t(x, 0, z).ry(ry || 0);
    B.blk(0, 0, 0, 0.26, 0.34, 0.12, col);
    B.torus(0, 0.34, 0, 0.07, 0.008, 12, 4, col, 0, 0, PI);
    B.pop();
  };

  /* ---------- Krypto ---------- */
  P.coin = function (B, r, h, col) {
    B.cyl(0, 0, 0, r, r, h, 28, col || C.gold);
    B.cyl(0, 0, 0, r * 0.82, r * 0.82, h * 1.2, 28, K.shade(col || C.gold, 0.85));
    B.cyl(0, 0, 0, r * 0.68, r * 0.68, h * 1.24, 28, col || C.gold);
  };
  P.coinStack = function (B, x, z, n, col) {
    for (var i = 0; i < n; i++) B.cylb(x + (i % 2) * 0.004, i * 0.045, z, 0.16, 0.16, 0.04, 14, i % 2 ? (col || C.gold) : K.shade(col || C.gold, 0.88));
  };
  P.cableRun = function (B, pts, col) {
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.sqrt(dx * dx + dz * dz);
      B.push().t((a[0] + b[0]) / 2, 0.012, (a[1] + b[1]) / 2).ry(Math.atan2(dx, dz)).box(0, 0, 0, 0.03, 0.02, len, col || C.black).pop();
    }
  };

  /* ---------- Wandstücke ---------- */
  P.frameBox = function (B, x, y, z, ry, w, h, depth, col) {
    B.push().t(x, y, z).ry(ry || 0);
    B.box(0, 0, 0, w, h, depth || 0.04, col || C.white);
    B.pop();
  };
  P.extinguisher = function (B, x, z, ry) {
    B.push().t(x, 0.9, z).ry(ry || 0);
    B.cylb(0, 0, 0, 0.055, 0.055, 0.34, 10, C.red);
    B.cylb(0, 0.34, 0, 0.02, 0.03, 0.05, 8, C.dark);
    B.box(0.05, 0.38, 0, 0.07, 0.015, 0.015, C.dark);
    B.pop();
  };
  P.ceilingLight = function (B, x, y, z, w, d) {
    B.box(x, y, z, w, 0.04, d, '#fffbe8', 1);
  };

  K.props = P;
})(window.KB3D);
