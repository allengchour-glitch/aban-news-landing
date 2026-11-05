/* KB3D Welt: das Gebäude mit vier Räumen. Möbel und Geräte kommen aus den Modellen (K.model), Wände, Böden, Schilder,
   Förderband, Serverschränke und Kleinkram werden gebaut. Das Feste wird einmal gebaut, das Bewegte hat eigene Netze.
   Koordinaten: x nach Osten, z nach Süden (zur Kamera), y nach oben. Gebäude x -7..7, z -6..6 (dazu eine Laderampe im Osten).
   Chefbüro: NW, Krypto: NO, Shop: SW, Versand: SO. */
(function (K) {
  'use strict';
  var P = K.props, C = P.C, T = K.tex, PI = Math.PI, M = K.M, MD = K.model;

  /* Plätze: Raum, Nummer in der Reihenfolge der Datei, Lage, Blickrichtung (0 = nach Süden, PI = nach Norden), Art der Menschen. */
  var SEATS = [
    { room: 'Shop', i: 0, x: -5.0, z: 2.35, h: PI, kind: 'single', style: 'oak', chair: '#d9748f', who: 'woman' },
    { room: 'Shop', i: 1, x: -3.0, z: 2.35, h: PI, kind: 'single', style: 'oak', chair: '#d9748f', who: 'man' },
    { room: 'Shop', i: 2, x: -1.0, z: 2.35, h: PI, kind: 'dual', style: 'oak', chair: '#d9748f', who: 'woman' },
    { room: 'Shop', i: 3, x: -5.0, z: 4.05, h: 0, kind: 'single', style: 'white', chair: '#3f9a8c', who: 'man' },
    { room: 'Shop', i: 4, x: -3.0, z: 4.05, h: 0, kind: 'single', style: 'white', chair: '#3f9a8c', who: 'woman' },
    { room: 'Shop', i: 5, x: -1.0, z: 4.05, h: 0, kind: 'single', style: 'white', chair: '#3f9a8c', who: 'man' },
    { room: 'Versand', i: 0, x: 1.7, z: 1.15, h: 0, kind: 'single', style: 'metal', chair: '#e48a3f', items: false, who: 'worker' },
    { room: 'Versand', i: 1, x: 3.45, z: 1.15, h: 0, kind: 'single', style: 'metal', chair: '#e48a3f', items: false, who: 'worker' },
    { room: 'Versand', i: 2, x: 5.2, z: 1.15, h: 0, kind: 'single', style: 'metal', chair: '#e48a3f', items: false, who: 'worker' },
    { room: 'Krypto', i: 0, x: 1.3, z: -3.0, h: PI, kind: 'dual', style: 'dark', chair: '#37c8d8', who: 'man' },
    { room: 'Krypto', i: 1, x: 3.5, z: -3.0, h: PI, kind: 'tri', style: 'dark', chair: '#37c8d8', who: 'woman' },
    { room: 'Krypto', i: 2, x: 5.7, z: -3.0, h: PI, kind: 'dual', style: 'dark', chair: '#37c8d8', who: 'man' },
    { room: 'Krypto', i: 3, x: 2.4, z: -1.4, h: 0, kind: 'single', style: 'dark', chair: '#8a6fb0', who: 'woman' },
    { room: 'Krypto', i: 4, x: 4.6, z: -1.4, h: 0, kind: 'dual', style: 'dark', chair: '#8a6fb0', who: 'man' },
    { room: 'Chefbüro', i: 0, x: -3.6, z: -4.75, h: 0, kind: 'dual', style: 'exec', chair: '#1f2430', boss: true, who: 'man', sc: 1.25 }
  ];
  var PANTS = ['#3c4252', '#2f3a4d', '#4a4036', '#2b2f38', '#50566a'];
  var TOP = { oak: '#d6b88c', white: '#f0eee9', dark: '#3b4050', exec: '#6f4a31', metal: '#c3c9d1' };

  K.SEATS = SEATS;

  K.buildWorld = function (R) {
    var W = { R: R, statics: [], shadowStatics: [], inst: [], seats: [], leds: [], parcels: [], hands: null, belt: null, board: null, cards: [], sky: null, coin: null, crystal: null, models: {} };
    var B = new K.Builder();
    var LB = [new K.Builder(), new K.Builder(), new K.Builder()];
    var texCache = {}, ST = new K.Stack(), i, j;
    function tex(key, make, opt) { if (!texCache[key]) texCache[key] = R.texture(make(), opt || {}); return texCache[key]; }
    function quad(o) {
      var QB = new K.Builder();
      QB.push().t(o.x, o.y, o.z).ry(o.ry || 0).rx(o.rx || 0).rz(o.rz || 0).quad(o.w, o.h, o.col || [1, 1, 1], o.emi || 0, o.u0, o.v0, o.u1, o.v1);
      var m = R.mesh(QB);
      m.tex = o.tex || null;
      if (o.alpha != null) m.alpha = o.alpha;
      return m;
    }
    function stat(m) { W.statics.push(m); return m; }
    function sign(text, w, h, x, y, z, ry, fg, bg, edge, sub) {
      return stat(quad({ x: x, y: y, z: z, ry: ry, w: w, h: h, emi: 0.35, tex: tex('sign:' + text + (sub || ''), function () { return T.sign(text, fg, bg, edge, sub); }) }));
    }
    /* Modell holen (einmal je Kennung) und aufstellen: Ort, Drehung um y, Grösse, Farbwünsche. */
    function mdl(id, crease) {
      if (!(id in W.models)) W.models[id] = MD.has(id) ? MD.load(R, id, { crease: crease || 38 }) : null;
      return W.models[id];
    }
    function place(id, x, y, z, ry, sc, over, noShadow) {
      var mod = mdl(id);
      if (!mod) return null;
      var m = new Float32Array(16);
      ST.reset().t(x, y, z).ry(ry || 0);
      if (sc && sc !== 1) ST.s(sc, sc, sc);
      M.copy(m, ST.m);
      var it = { mod: mod, m: m, pal: over ? MD.palette(mod, over) : mod.pal, shadow: !noShadow, meshes: Object.keys(mod.groups).map(function (k) { return mod.groups[k]; }) };
      W.inst.push(it);
      return it;
    }

    /* ---------- Böden ---------- */
    function floorMesh(x0, z0, x1, z1, key, make, tile) {
      var FB = new K.Builder();
      FB.floor(x0, z0, x1, z1, 0, [1, 1, 1], 0, (x1 - x0) / tile, (z1 - z0) / tile);
      var m = R.mesh(FB);
      m.tex = tex(key, make, { repeat: true });
      stat(m);
    }
    floorMesh(-7, -6, 0, 0, 'fChef', function () { return T.parquet('#a9774b', 1); }, 2);
    floorMesh(-7, 0, 0, 6, 'fShop', function () { return T.parquet('#dcc298', 2); }, 2);
    floorMesh(0, 0, 7, 6, 'fVersand', function () { return T.concrete('#b0b4b9', 3); }, 2);
    floorMesh(0, -6, 7, 0, 'fKrypto', function () { return T.carpet('#232c45', 4); }, 2);

    /* Sockel, Rampe im Osten und weicher Schatten darunter */
    B.box(0, -0.36, 0, 15.2, 0.7, 13.2, '#3a3f4b');
    B.floor(-7.6, -6.6, 7.6, 6.6, -0.004, '#6f7684', 0);
    B.floor(-7.6, 6.0, 7.6, 6.06, 0.002, '#a7adb8', 0);
    B.floor(7.0, -6.0, 7.06, 6.06, 0.002, '#a7adb8', 0);
    B.box(9.0, -0.36, 3.0, 3.2, 0.7, 6.4, '#3a3f4b');
    B.floor(7.6, -0.2, 10.6, 6.2, -0.004, '#4b505b', 0);
    for (j = 0; j < 8; j++) B.floor(10.1, 0.1 + j * 0.8, 10.18, 0.55 + j * 0.8, -0.002, '#e8e6e0', 0);
    stat(quad({ x: 1.2, y: -0.72, z: 0.3, rx: -PI / 2, w: 27, h: 21, tex: tex('groundshadow', T.shadow), alpha: 0.9 }));

    /* ---------- Wände ---------- */
    var WH = 3.4, CAP = '#f6f3ec';
    function wall(x0, z0, x1, z1, col) {
      B.blk((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, WH, z1 - z0, col);
      B.blk((x0 + x1) / 2, WH, (z0 + z1) / 2, x1 - x0 + 0.02, 0.05, z1 - z0 + 0.02, CAP);
    }
    wall(-7.3, -6.3, 0, -6.0, '#ece4d6'); wall(0, -6.3, 7.3, -6.0, '#252c43');
    wall(-7.3, -6.0, -7.0, 0, '#ece4d6'); wall(-7.3, 0, -7.0, 6.3, '#f4e3d4');
    B.blk(-3.5, 0, -5.985, 7, 0.14, 0.03, '#6b4f3a'); B.blk(3.5, 0, -5.985, 7, 0.14, 0.03, '#171b2b');
    B.blk(-6.985, 0, -3.0, 0.03, 0.14, 6, '#6b4f3a'); B.blk(-6.985, 0, 3.0, 0.03, 0.14, 6, '#8a6d55');
    B.box(3.5, 0.3, -5.97, 6.8, 0.04, 0.02, '#37c8d8', 1);
    B.box(3.5, 3.15, -5.97, 6.8, 0.05, 0.02, '#c053e8', 1);

    /* ---------- Trennwände mit Durchgängen ---------- */
    function part(x0, z0, x1, z1, col) {
      B.cast = true;
      B.blk((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, 1.0, z1 - z0, col || '#d8d4cb');
      B.cast = false;
      B.blk((x0 + x1) / 2, 1.0, (z0 + z1) / 2, x1 - x0 + 0.02, 0.05, z1 - z0 + 0.02, CAP);
      B.blk((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0 + 0.02, 0.1, z1 - z0 + 0.02, '#8d8a82');
    }
    part(-7, -0.07, -3.2, 0.07, '#d9cdbb'); part(-2.0, -0.07, 2.0, 0.07); part(3.2, -0.07, 7, 0.07, '#d4d6dc');
    part(-0.07, -6, 0.07, -1.5, '#c9ccd8'); part(-0.07, -0.5, 0.07, 2.5, '#d8d4cb'); part(-0.07, 3.5, 0.07, 6, '#d8d4cb');
    [[-3.2, 0], [-2.0, 0], [2.0, 0], [3.2, 0], [0, -1.5], [0, -0.5], [0, 2.5], [0, 3.5]].forEach(function (p) {
      B.cast = true; B.blk(p[0], 0, p[1], 0.12, 2.1, 0.12, '#f1efe9'); B.cast = false;
    });
    B.box(-2.6, 2.1, 0, 1.3, 0.1, 0.12, '#f1efe9'); B.box(2.6, 2.1, 0, 1.3, 0.1, 0.12, '#f1efe9');
    B.box(0, 2.1, -1.0, 0.12, 0.1, 1.1, '#f1efe9'); B.box(0, 2.1, 3.0, 0.12, 0.1, 1.1, '#f1efe9');

    /* ---------- Fenster (Chefbüro Nord, Shop West) mit Himmel ---------- */
    var skyTex = R.texture(T.skyline(12), { mip: false });
    W.sky = { tex: skyTex };
    function winNorth(cx, cy, w, h) {
      var z = -5.985, c = '#fbfaf6';
      B.box(cx, cy + h / 2 + 0.04, z, w + 0.2, 0.08, 0.06, c); B.box(cx, cy - h / 2 - 0.04, z, w + 0.2, 0.08, 0.06, c);
      B.box(cx - w / 2 - 0.05, cy, z, 0.1, h, 0.06, c); B.box(cx + w / 2 + 0.05, cy, z, 0.1, h, 0.06, c);
      B.box(cx, cy, z, 0.05, h, 0.04, c); B.box(cx, cy, z, w, 0.04, 0.04, c);
      B.box(cx, cy - h / 2 - 0.1, z + 0.09, w + 0.36, 0.05, 0.24, c);
      stat(quad({ x: cx, y: cy, z: -5.995, w: w, h: h, tex: skyTex, emi: 0.95 }));
    }
    winNorth(-3.6, 1.85, 3.4, 1.8);
    for (i = 0; i < 4; i++) { B.box(-5.62 + i * 0.1, 1.75, -5.93, 0.09, 2.3, 0.06, i % 2 ? '#8a6f5a' : '#7a604d'); B.box(-1.58 - i * 0.1, 1.75, -5.93, 0.09, 2.3, 0.06, i % 2 ? '#8a6f5a' : '#7a604d'); }
    B.box(-3.6, 2.98, -5.9, 4.5, 0.04, 0.04, C.dark);
    function winWest(cz, cy, w, h) {
      var x = -6.985, c = '#fbfaf6';
      B.box(x, cy + h / 2 + 0.04, cz, 0.06, 0.08, w + 0.2, c); B.box(x, cy - h / 2 - 0.04, cz, 0.06, 0.08, w + 0.2, c);
      B.box(x, cy, cz - w / 2 - 0.05, 0.06, h, 0.1, c); B.box(x, cy, cz + w / 2 + 0.05, 0.06, h, 0.1, c);
      B.box(x, cy, cz, 0.04, h, 0.05, c);
      stat(quad({ x: -6.995, y: cy, z: cz, ry: PI / 2, w: w, h: h, tex: skyTex, emi: 0.95 }));
    }
    winWest(1.2, 2.85, 1.0, 0.6); winWest(5.0, 2.85, 1.0, 0.6);

    /* ---------- Schreibtische mit Stuhl (Modelle), Bildschirmflächen ---------- */
    SEATS.forEach(function (s, idx) {
      var hs = T.hashStr(s.room + s.i), sc = s.sc || 1, c = Math.cos(s.h), sn = Math.sin(s.h);
      function loc(lx, lz) { return [s.x + lx * c + lz * sn, s.z - lx * sn + lz * c]; }
      var o = { x: s.x, z: s.z, heading: s.h, seed: hs, screens: [] };
      var zc = 0.30 + 0.4 * sc, dc = loc(0, zc), top = TOP[s.style] || TOP.oak;
      var hasDesk = !!mdl('desk');
      if (hasDesk) {
        place('desk', dc[0], 0, dc[1], s.h, sc, { tischplatte: top, kante: K.shade(top, 0.78), gestell: s.style === 'dark' ? '#2b303c' : s.style === 'exec' ? '#3a2a1e' : '#4b5260', container: s.style === 'dark' ? '#30343f' : s.style === 'exec' ? '#5b3a26' : '#e6e3dc' });
        place('chair', s.x, 0, s.z, s.h + PI, s.boss ? 1.1 : 1, { polster: s.chair, akzent: K.shade(s.chair, 1.25) });
        var sp = loc(0, zc + 0.17 * sc - 0.004);
        o.screens.push({ x: sp[0], y: 1.12 * sc, z: sp[1], ry: s.h + PI, tilt: 0, w: 0.53 * sc, h: 0.29 * sc });
        if (s.kind === 'dual' || s.kind === 'tri') o.screens.push(P.panel(B, o, -0.55 * sc, zc + 0.12 * sc, -0.35, 0.5, 0.31, 0.86));
        if (s.kind === 'tri') o.screens.push(P.panel(B, o, 0.55 * sc, zc + 0.12 * sc, 0.35, 0.5, 0.31, 0.86));
        if (!s.boss && s.items !== false) P.deskItems(B, o);
      } else {
        o.kind = s.kind === 'single' ? 'monitor' : s.kind; o.style = s.style; o.chair = s.chair; o.w = s.w; o.high = s.boss; o.items = s.items;
        P.desk(B, o);
      }
      W.seats.push({ spec: s, idx: idx, key: s.room + ':' + s.i, o: o, screens: [], x: s.x, z: s.z, h: s.h, seed: hs });
    });

    /* ---------- Chefbüro ---------- */
    P.rug(B, -5.9, -5.4, -1.3, -2.1, '#2f4f5f', '#d8c9a8');
    place('bookshelf', -6.84, 0, -0.9, PI / 2, 1.15);
    B.box(-6.975, 1.75, -3.25, 0.05, 1.4, 3.4, '#8a6d55');
    B.box(-6.955, 1.75, -3.25, 0.02, 1.3, 3.3, '#c79a5f');
    B.box(-6.3, 1.75, -5.975, 1.42, 0.78, 0.05, C.metal);
    stat(quad({ x: -6.97, y: 2.05, z: -5.5, ry: PI / 2, w: 0.7, h: 0.9, tex: tex('poster0', function () { return T.poster(0); }), emi: 0.15 }));
    B.box(-6.985, 2.05, -5.5, 0.03, 0.96, 0.76, C.white);
    (function () {
      var s = SEATS[SEATS.length - 1];
      B.push().t(s.x, 0, s.z);
      B.box(0, 0.7585, 0.52, 1.0, 0.004, 0.45, '#2a2d34');
      for (j = 0; j < 4; j++) B.box(-0.62 + j * 0.01, 0.76 + j * 0.004, 0.62, 0.21, 0.004, 0.3, C.white);
      B.cylb(0.78, 0.75, 0.62, 0.05, 0.06, 0.02, 10, C.gold);
      B.cylb(0.78, 0.77, 0.62, 0.012, 0.012, 0.1, 6, C.gold);
      B.sph(0.78, 0.9, 0.62, 0.09, 0.09, 0.09, 12, 8, '#4a7fb0');
      B.torus(0.78, 0.9, 0.62, 0.1, 0.008, 18, 4, C.gold, 0, 0, PI * 2);
      B.box(-0.9, 0.775, 0.8, 0.12, 0.05, 0.16, C.dark);
      B.cylb(-0.95, 0.75, 0.48, 0.035, 0.03, 0.1, 8, C.dark);
      B.pop();
      stat(quad({ x: s.x + 0.1, y: 0.8, z: s.z + 1.28, ry: 0, w: 0.3, h: 0.075, rx: -0.25, emi: 0.25, tex: tex('plateDu', function () { return T.sign('Du', '#3a2a10', '#e1b64a', '#7a5b14'); }) }));
    })();
    place('sofa', -0.75, 0, -3.3, PI / 2, 1.0, { sofapolster: '#3f8f8f', sofakorpus: '#2f6f73' });
    place('table', -2.0, 0, -3.3, PI / 2, 0.5);
    P.mug(B, -2.0, 0.39, -3.15, C.white); P.mug(B, -1.9, 0.39, -3.45, C.red);
    place('armchair', -1.9, 0, -1.3, 0.35, 1.0, { 'm': '#d9845a' });
    place('lamp', -0.5, 0, -4.95, 0, 1.0);
    place('planter', -0.55, 0, -5.45, 0, 0.9);
    place('planter', -6.4, 0, -5.5, 0, 0.9);
    place('plant', -0.55, 0, -0.65, 0, 0.8);
    place('coatrack', -0.45, 0, -1.9, 0, 1.9);
    // Teeküche an der Trennwand zum Shop
    place('kitchen', -5.7, 0, -0.32, 0, 0.6);
    place('fridge', -4.35, 0, -0.38, 0, 0.8);
    P.waterCooler(B, -3.7, -0.4, PI);
    place('bin', -3.05, 0, -0.35, 0, 0.6);

    /* ---------- Kryptoraum ---------- */
    [1.0, 1.85, 2.7].forEach(function (x, k) { P.serverRack(B, LB, x, -5.6, 0, 20 + k); });
    sign('KRYPTO', 2.4, 0.6, 1.85, 2.75, -5.97, 0, '#7df0ff', '#10182a', '#37c8d8', 'Spielgeld, kein echtes Geld');
    B.box(5.05, 2.0, -5.97, 3.3, 1.9, 0.06, '#0b0f18');
    stat(quad({ x: 5.05, y: 2.0, z: -5.935, w: 3.1, h: 1.7, emi: 0.95, tex: tex('wallchart', function () { return T.screen('chart', 31); }) }));
    B.cast = true; B.cylb(6.25, 0, -0.9, 0.3, 0.38, 0.55, 16, '#2a3047'); B.cast = false;
    B.cylb(6.25, 0.55, -0.9, 0.33, 0.3, 0.04, 16, C.gold);
    P.coinStack(B, 6.6, -1.9, 5); P.coinStack(B, 6.28, -2.1, 3, '#d9a93a'); P.coinStack(B, 0.5, -0.9, 4);
    B.cast = true; B.cylb(0.9, 0, -0.9, 0.28, 0.34, 0.5, 8, '#2a3047'); B.cast = false;
    place('plant', 0.55, 0, -5.15, 0, 0.8);
    place('planter', 6.65, 0, -5.4, 0, 0.8);
    place('fridge', 6.6, 0, -4.4, -PI / 2, 0.8);
    place('relax', 5.9, 0, -4.6, PI, 1.4, { m: '#6b4fa0' });
    P.cableRun(B, [[1.0, -5.0], [1.0, -3.8], [1.3, -3.6]], '#111'); P.cableRun(B, [[2.7, -5.0], [2.7, -4.0], [3.5, -3.6]], '#111');
    P.cableRun(B, [[2.0, -5.0], [2.0, -2.2], [2.4, -1.9]], '#1c1f2a');
    P.extinguisher(B, 0.2, -5.95, 0);

    /* ---------- Shop ---------- */
    [0.95, 2.75, 4.55].forEach(function (z) { place('shopshelf', -6.55, 0, z, -PI / 2, 0.85); });
    sign('SHOP', 2.6, 0.65, -6.97, 2.7, 2.75, PI / 2, '#ffd7e3', '#c7456d', '#ffffff', 'LuxeStyle');
    P.mannequin(B, -6.2, 5.7, '#d9748f', 0.4); P.mannequin(B, -5.55, 5.75, '#3f9a8c', -0.3);
    place('counter', -2.6, 0, 5.55, PI, 0.6);
    P.bag(B, -3.5, 5.75, C.pink, 0.2); P.bag(B, -1.7, 5.7, C.teal, -0.2);
    P.clothesRack(B, -0.9, 5.45, 0.05);
    P.table(B, -4.15, 5.7, 0.42, 0.75, '#f1efe9');
    P.bag(B, -4.05, 5.65, C.orange, 0); B.cylb(-4.25, 0.75, 5.75, 0.05, 0.05, 0.12, 8, C.yellow);
    place('planter', -0.5, 0, 0.55, 0, 0.8);
    P.rug(B, -6.0, 2.92, -0.4, 3.46, '#d9748f', '#f3e3d6', 0.012);
    place('bin', -0.4, 0, 3.4, 0, 0.6);
    P.extinguisher(B, -0.3, 0.12, PI);

    /* ---------- Versand ---------- */
    var bz = 3.0, bx0 = 0.5, bx1 = 6.0;
    B.cast = true;
    B.blk((bx0 + bx1) / 2, 0.72, bz, bx1 - bx0, 0.13, 0.84, '#3b4252');
    for (j = 0; j <= 5; j++) { var lx = bx0 + 0.2 + j * ((bx1 - bx0 - 0.4) / 5); B.blk(lx, 0, bz - 0.34, 0.06, 0.72, 0.06, C.metalD); B.blk(lx, 0, bz + 0.34, 0.06, 0.72, 0.06, C.metalD); B.blk(lx, 0.25, bz, 0.04, 0.03, 0.68, C.metalD); }
    B.cast = false;
    B.blk((bx0 + bx1) / 2, 0.85, bz - 0.4, bx1 - bx0, 0.07, 0.03, C.metal); B.blk((bx0 + bx1) / 2, 0.85, bz + 0.4, bx1 - bx0, 0.07, 0.03, C.metal);
    B.cyl(bx0 - 0.02, 0.78, bz, 0.1, 0.1, 0.8, 12, C.metalD); B.cyl(bx1 + 0.02, 0.78, bz, 0.1, 0.1, 0.8, 12, C.metalD);
    B.blk(bx1 + 0.3, 0, bz + 0.4, 0.3, 0.45, 0.3, '#e48a3f'); B.box(bx1 + 0.3, 0.3, bz + 0.56, 0.1, 0.1, 0.01, C.green, 1);
    var beltM = (function () {
      var FB = new K.Builder();
      FB.floor(bx0, bz - 0.36, bx1, bz + 0.36, 0.7885, [1, 1, 1], 0, 11, 1.4);
      var m = R.mesh(FB); m.tex = tex('belt', T.belt, { repeat: true });
      return m;
    })();
    stat(beltM);
    W.belt = { mesh: beltM, x0: bx0, x1: bx1, z: bz, moving: true, mn: [bx0, 0, bz - 0.5], mx: [bx1 + 0.9, 1.5, bz + 0.5] };
    B.cast = true;
    B.blk(0.7, 0, 2.35, 0.1, 2.4, 0.1, C.metalD); B.blk(0.7, 0, 3.65, 0.1, 2.4, 0.1, C.metalD);
    B.cast = false;
    B.box(0.7, 2.4, 3.0, 0.14, 0.12, 1.4, '#e48a3f');
    sign('VERSAND', 1.25, 0.42, 0.78, 2.0, 3.0, PI / 2, '#fff3dc', '#b85a1c', '#ffd8a8', 'Bestellungen');
    for (j = 0; j < 19; j++) { var hx = 0.55 + j * 0.3; B.floor(hx, 2.52, hx + 0.15, 2.58, 0.014, '#e8bd45', 0); B.floor(hx, 3.42, hx + 0.15, 3.48, 0.014, '#e8bd45', 0); }
    P.pallet(B, 1.3, 4.8, 0.05, 3, 1); P.pallet(B, 2.7, 4.9, -0.1, 2, 2); P.pallet(B, 4.1, 4.85, 0.08, 1, 3);
    P.crates(B, 5.6, 4.9, 0.1, 3);
    if (!place('cart', 6.55, 0, 3.0, PI / 2, 0.6)) P.rollCage(B, 6.5, 3.0, 0, 6);
    place('bin', 0.4, 0, 1.0, 0, 0.6);
    place('plant', 6.6, 0, 0.6, 0, 0.8);
    P.extinguisher(B, 6.9, 5.0, -PI / 2);
    SEATS.filter(function (s) { return s.room === 'Versand'; }).forEach(function (s, k) {
      B.push().t(s.x, 0, s.z);
      P.tapeGun(B, -0.5, 0.75, 0.62, 0.4);
      P.labelPrinter(B, 0.62, 0.75, 0.78, 0);
      if (k === 1) P.scale(B, -0.55, 0.75, 0.9);
      if (k === 0) P.bubbleWrap(B, -0.5, 0.9, 0.95, 0);
      if (k === 2) { B.push().t(-0.5, 0.75, 0.9); P.parcel(B, 0.3, 0.2, 0.25, C.card); B.pop(); }
      B.pop();
    });
    B.cast = true; B.blk(3.9, 0, 0.45, 1.6, 1.2, 0.4, C.metal); B.cast = false;
    for (j = 0; j < 3; j++) B.blk(3.9, 0.32 + j * 0.38, 0.45, 1.56, 0.03, 0.38, '#7d8693');
    for (j = 0; j < 4; j++) { B.push().t(3.35 + j * 0.34, 0.35, 0.45); P.parcel(B, 0.28, 0.24, 0.3, j % 2 ? C.card : C.cardD); B.pop(); }
    // Lieferwagen an der Laderampe
    place('van', 8.8, 0, 3.0, PI, 0.62);

    /* ---------- feste Teile in den Speicher der Grafikkarte ---------- */
    var base = R.mesh(B);
    W.statics.unshift(base);
    W.shadowStatics.push(base);
    for (i = 0; i < LB.length; i++) W.leds.push(R.mesh(LB[i]));

    /* ---------- Bildschirmflächen (Textur wechselt mit dem Zustand) ---------- */
    var texScreen = {};
    W.screenTex = function (kind, seed) {
      var key = kind + ':' + (seed % 4);
      if (!texScreen[key]) texScreen[key] = { tex: R.texture(T.screen(kind, 100 + (seed % 4) * 13), { repeat: kind === 'code' }), kind: kind };
      return texScreen[key];
    };
    W.seats.forEach(function (seat) {
      seat.o.screens.forEach(function (sc, k) {
        var m = quad({ x: sc.x, y: sc.y, z: sc.z, ry: sc.ry, rx: sc.tilt, w: sc.w, h: sc.h, emi: 0.9, tex: null });
        m.screenIndex = k;
        seat.screens.push(m);
      });
    });

    /* ---------- Wanduhr ---------- */
    stat(quad({ x: -0.9, y: 2.5, z: -5.975, w: 0.62, h: 0.62, tex: tex('clockface', T.clock), emi: 0.3 }));
    var cb = new K.Builder(); cb.torus(-0.9, 2.5, -5.96, 0.31, 0.03, 24, 6, C.woodD, 0); stat(R.mesh(cb));
    var hb = new K.Builder(), mb = new K.Builder();
    hb.box(0, 0.085, 0, 0.026, 0.17, 0.012, '#1b1d24'); mb.box(0, 0.125, 0, 0.018, 0.25, 0.012, '#1b1d24');
    W.hands = { h: R.mesh(hb), m: R.mesh(mb), mh: M.ident(), mm: M.ident(), c: [-0.9, 2.5, -5.95] };

    /* ---------- Tafel und Pinnwand-Kärtchen (aus den Daten, Textur wird ersetzt) ---------- */
    var boardTex = R.texture(T.board('', ''), { mip: false });
    W.board = { mesh: quad({ x: -6.3, y: 1.75, z: -5.945, w: 1.3, h: 0.65, tex: boardTex, emi: 0.2 }), tex: boardTex, mn: [-7.0, 1.3, -6.0], mx: [-5.6, 2.2, -5.7], key: '' };
    for (i = 0; i < 5; i++) {
      var cz = -4.65 + i * 0.64, ct = R.texture(T.card('', 'du'), { mip: false });
      var cm = quad({ x: -6.93, y: 1.78 + (i % 2) * 0.08, z: cz, ry: PI / 2, rz: (i - 2) * 0.05, w: 0.52, h: 0.52, tex: ct, emi: 0.15 });
      W.cards.push({ mesh: cm, tex: ct, mn: [-7.0, 1.4, cz - 0.3], mx: [-6.8, 2.2, cz + 0.3], key: '', z: cz });
    }

    /* ---------- Bewegtes: Münze, Kristall, Pakete ---------- */
    var mb2 = new K.Builder();
    mb2.push().rx(PI / 2); P.coin(mb2, 0.5, 0.07, C.gold); mb2.pop();
    W.coin = { mesh: R.mesh(mb2), m: M.ident(), p: [6.25, 1.35, -0.9] };
    var xb = new K.Builder();
    xb.cyl(0, 0.2, 0, 0.0, 0.26, 0.4, 4, '#8a6fb0'); xb.cyl(0, -0.2, 0, 0.26, 0.0, 0.4, 4, '#b08fe0');
    W.crystal = { mesh: R.mesh(xb), m: M.ident(), p: [0.9, 0.95, -0.9] };
    [[0.5, 0.3, 0.4], [0.4, 0.26, 0.34], [0.58, 0.34, 0.44], [0.44, 0.28, 0.36]].forEach(function (sz, k) {
      var pb = new K.Builder(); P.parcel(pb, sz[0], sz[1], sz[2], k % 2 ? C.cardD : C.card);
      W.parcels.push({ mesh: R.mesh(pb), m: M.ident(), k: k, h: sz[1] });
    });

    /* ---------- Kamera-Ansichten ---------- */
    W.views = {
      alle: { tx: 1.0, ty: 0.7, tz: 0.2, dist: 29 },
      Shop: { tx: -3.4, ty: 0.7, tz: 3.1, dist: 12.5 },
      Versand: { tx: 3.9, ty: 0.7, tz: 3.1, dist: 12.5 },
      Krypto: { tx: 3.5, ty: 0.7, tz: -3.0, dist: 12.5 },
      'Chefbüro': { tx: -3.5, ty: 0.7, tz: -3.0, dist: 12.5 }
    };
    return W;
  };

  /* Pro Bild: Matrizen der bewegten Weltteile aktualisieren und alles Weltliche zeichnen. */
  K.drawWorld = function (W, R, t, hour, belt) {
    var i, j, m, it;
    for (i = 0; i < W.statics.length; i++) R.draw(W.statics[i], null);
    for (i = 0; i < W.shadowStatics.length; i++) R.shadow(W.shadowStatics[i], null);
    for (i = 0; i < W.inst.length; i++) {
      it = W.inst[i];
      for (j = 0; j < it.meshes.length; j++) { R.draw(it.meshes[j], it.m, it.pal); if (it.shadow) R.shadow(it.meshes[j], it.m); }
    }
    for (i = 0; i < W.leds.length; i++) {
      var on = Math.sin(t * (2.2 + i * 0.7) + i * 2.1) > -0.2;
      W.leds[i].tint = on ? null : [0.18, 0.18, 0.18];
      R.draw(W.leds[i], null);
    }
    m = W.coin.m; M.ident(m); m[12] = W.coin.p[0]; m[13] = W.coin.p[1] + Math.sin(t * 1.2) * 0.04; m[14] = W.coin.p[2];
    var c = Math.cos(t * 0.9), s = Math.sin(t * 0.9);
    m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
    R.draw(W.coin.mesh, m); R.shadow(W.coin.mesh, m);
    m = W.crystal.m; M.ident(m); m[12] = W.crystal.p[0]; m[13] = W.crystal.p[1] + Math.sin(t * 1.6) * 0.05; m[14] = W.crystal.p[2];
    c = Math.cos(t * -0.7); s = Math.sin(t * -0.7); m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
    R.draw(W.crystal.mesh, m);
    var H = W.hands, hh = (hour % 12) / 12 * PI * 2, mm = (hour % 1) * PI * 2;
    M.ident(H.mh); M.ident(H.mm);
    var ch = Math.cos(-hh), sh = Math.sin(-hh); H.mh[0] = ch; H.mh[1] = sh; H.mh[4] = -sh; H.mh[5] = ch; H.mh[12] = H.c[0]; H.mh[13] = H.c[1]; H.mh[14] = H.c[2];
    var cm = Math.cos(-mm), sm = Math.sin(-mm); H.mm[0] = cm; H.mm[1] = sm; H.mm[4] = -sm; H.mm[5] = cm; H.mm[12] = H.c[0]; H.mm[13] = H.c[1]; H.mm[14] = H.c[2] + 0.004;
    R.draw(H.h, H.mh); R.draw(H.m, H.mm);
    var Bl = W.belt;
    if (belt.moving) Bl.mesh.uvo[0] = -((t * 0.5) % 1);
    var n = Math.max(0, Math.min(4, belt.count | 0)), len = Bl.x1 - Bl.x0 - 0.7;
    for (i = 0; i < n; i++) {
      var P0 = W.parcels[i % W.parcels.length], pm = P0.m;
      var phase = belt.moving ? ((t * 0.5 / len) + i / Math.max(1, n)) % 1 : (i + 0.5) / Math.max(1, n) * 0.9;
      M.ident(pm);
      pm[12] = Bl.x0 + 0.4 + phase * len; pm[13] = 0.785; pm[14] = Bl.z + ((i % 2) ? 0.07 : -0.07);
      var a = 0.08 * (i - 1), ca = Math.cos(a), sa = Math.sin(a); pm[0] = ca; pm[2] = -sa; pm[8] = sa; pm[10] = ca;
      R.draw(P0.mesh, pm); R.shadow(P0.mesh, pm);
    }
  };
})(window.KB3D);
