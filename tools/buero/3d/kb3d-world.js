/* KB3D Welt: gemeinsamer Campus für Webansicht und Claude-Paket (Design campus-einheitlich-16).
   Sieben eigene Pavillons (je rund 10,4 × 8 m) stehen in zwei Spalten mit Gassen dazwischen: Chefbüro und Krypto, Shop und Versand, dann der
   Campusplatz mit dem Zentralmonitor, danach Social Media, Entwicklerbüro und das YouTube-Studio. Jeder Raum hat eine hohe Rückwand im Norden
   mit einem grossen Liveboard (Monitor mit Zahlen aus den Zeilen dieses Raums) und davor genug Platz zwischen den Schreibtischen.
   Möbel und Geräte kommen aus den Modellen (K.model), Wände, Böden, Schilder, Förderband, Serverschränke und Kleinkram werden gebaut.
   Das Feste wird einmal gebaut, das Bewegte hat eigene Netze.
   Koordinaten: x nach Osten, z nach Süden (zur Kamera), y nach oben. Je Raum gilt eine Raum-Koordinate: u nach Osten, v nach Süden,
   Ursprung an der nordwestlichen Aussenecke des Raums. Die Gassen liegen 0,15 m tiefer als die Raumböden. */
(function (K) {
  'use strict';
  var P = K.props, C = P.C, T = K.tex, PI = Math.PI, M = K.M, MD = K.model;

  var RW = 10.4, RD = 8.0, WH = 3.8, CAP = '#f2f4ef', GY = -0.15;      // Raumbreite, Raumtiefe, Wandhöhe, Cap-Farbe, Höhe der Gassen
  var BW = 4.8, BH = 2.4, BY = 1.85;                                    // Liveboard: Breite, Höhe (2:1), Mittelhöhe

  /* Räume: nordwestliche Aussenecke und Art der Westwand (hoch = Aussenwand, niedrig = zur Gasse) */
  var ROOMS = {
    'Chefbüro': { x0: -11.8, z0: -12.6, west: 'hoch' },
    'Krypto': { x0: 1.4, z0: -12.6, west: 'niedrig' },
    'Shop': { x0: -11.8, z0: -1.2, west: 'hoch' },
    'Versand': { x0: 1.4, z0: -1.2, west: 'niedrig' },
    'Social Media': { x0: -11.8, z0: 14.4, west: 'hoch' },
    'Entwicklerbüro': { x0: 1.4, z0: 14.4, west: 'niedrig' },
    'YouTube-Studio': { x0: -11.8, z0: 25.8, west: 'hoch' }
  };

  /* Plätze: Raum, Nummer in der Reihenfolge der Datei, Lage im Raum (u, v), Blickrichtung (0 = nach Süden, PI = nach Norden), Art der Menschen. */
  var SEATS = [
    { room: 'Shop', i: 0, u: 2.1, v: 3.1, h: PI, kind: 'single', style: 'oak', chair: '#ba8997', who: 'woman' },
    { room: 'Shop', i: 1, u: 4.6, v: 3.1, h: PI, kind: 'single', style: 'oak', chair: '#ba8997', who: 'man' },
    { room: 'Shop', i: 2, u: 7.1, v: 3.1, h: PI, kind: 'dual', style: 'oak', chair: '#ba8997', who: 'woman' },
    { room: 'Shop', i: 3, u: 9.3, v: 3.1, h: PI, kind: 'single', style: 'oak', chair: '#ba8997', who: 'man' },
    { room: 'Shop', i: 4, u: 3.3, v: 5.3, h: 0, kind: 'single', style: 'white', chair: '#769b8a', who: 'man' },
    { room: 'Shop', i: 5, u: 5.8, v: 5.3, h: 0, kind: 'single', style: 'white', chair: '#769b8a', who: 'woman' },
    { room: 'Shop', i: 6, u: 8.3, v: 5.3, h: 0, kind: 'single', style: 'white', chair: '#769b8a', who: 'man' },
    { room: 'Versand', i: 0, u: 2.5, v: 2.6, h: 0, kind: 'single', style: 'metal', chair: '#c69563', items: false, who: 'worker' },
    { room: 'Versand', i: 1, u: 5.3, v: 2.6, h: 0, kind: 'single', style: 'metal', chair: '#c69563', items: false, who: 'worker' },
    { room: 'Versand', i: 2, u: 8.1, v: 2.6, h: 0, kind: 'single', style: 'metal', chair: '#c69563', items: false, who: 'worker' },
    { room: 'Krypto', i: 0, u: 2.7, v: 3.7, h: PI, kind: 'dual', style: 'dark', chair: '#679aa0', who: 'man' },
    { room: 'Krypto', i: 1, u: 5.5, v: 3.7, h: PI, kind: 'tri', style: 'dark', chair: '#679aa0', who: 'woman' },
    { room: 'Krypto', i: 2, u: 8.3, v: 3.7, h: PI, kind: 'dual', style: 'dark', chair: '#679aa0', who: 'man' },
    { room: 'Krypto', i: 3, u: 4.0, v: 5.9, h: 0, kind: 'single', style: 'dark', chair: '#8a6fb0', who: 'woman' },
    { room: 'Krypto', i: 4, u: 6.9, v: 5.9, h: 0, kind: 'dual', style: 'dark', chair: '#8a6fb0', who: 'man' },
    { room: 'Social Media', i: 0, u: 2.6, v: 3.5, h: 0, kind: 'dual', style: 'oak', chair: '#a093b7', who: 'woman' },
    { room: 'Social Media', i: 1, u: 5.3, v: 3.5, h: 0, kind: 'single', style: 'oak', chair: '#ba8997', who: 'man' },
    { room: 'Social Media', i: 2, u: 8.0, v: 3.5, h: 0, kind: 'dual', style: 'oak', chair: '#769b8a', who: 'woman' },
    { room: 'Entwicklerbüro', i: 0, u: 2.6, v: 3.5, h: 0, kind: 'dual', style: 'white', chair: '#679aa0', who: 'man' },
    { room: 'Entwicklerbüro', i: 1, u: 5.3, v: 3.5, h: 0, kind: 'tri', style: 'white', chair: '#a093b7', who: 'woman' },
    { room: 'Entwicklerbüro', i: 2, u: 8.0, v: 3.5, h: 0, kind: 'single', style: 'white', chair: '#769b8a', who: 'man' },
    { room: 'YouTube-Studio', i: 0, u: 2.6, v: 3.5, h: 0, kind: 'dual', style: 'dark', chair: '#a093b7', who: 'woman' },
    { room: 'YouTube-Studio', i: 1, u: 5.3, v: 3.5, h: 0, kind: 'tri', style: 'dark', chair: '#679aa0', who: 'man' },
    { room: 'YouTube-Studio', i: 2, u: 8.0, v: 3.5, h: 0, kind: 'single', style: 'white', chair: '#ba8997', who: 'woman' },
    /* Der Platz des Besitzers kommt zuletzt (die Seite nimmt immer den letzten Platz für ihn). */
    { room: 'Chefbüro', i: 0, u: 5.3, v: 4.6, h: 0, kind: 'dual', style: 'exec', chair: '#1f2430', boss: true, who: 'man', sc: 1.25 }
  ];
  var PANTS = ['#3c4252', '#2f3a4d', '#4a4036', '#2b2f38', '#50566a'];
  var TOP = { oak: '#d6b88c', white: '#f0eee9', dark: '#3b4050', exec: '#edf2ef', metal: '#c3c9d1' };
  SEATS.forEach(function (s) { var r = ROOMS[s.room]; s.x = r.x0 + s.u; s.z = r.z0 + s.v; });
  K.DESIGN_VERSION = 'campus-einheitlich-16';
  K.SEATS = SEATS;
  K.ROOMS = ROOMS;
  K.ROOM_SIZE = [RW, RD];

  K.buildWorld = function (R) {
    var W = { R: R, statics: [], shadowStatics: [], inst: [], seats: [], leds: [], parcels: [], hands: null, belt: null, board: null, cards: [], sky: null, coin: null, crystal: null, models: {}, live: {}, rooms: ROOMS, boardSize: [BW, BH] };
    var B = new K.Builder();
    var LB = [new K.Builder(), new K.Builder(), new K.Builder()];
    var texCache = {}, ST = new K.Stack(), i, j;
    function tex(key, make, opt) { if (!texCache[key]) texCache[key] = R.texture(make(), opt || {}); return texCache[key]; }
    var wingX = 0, wingZ = 0;
    var THEMEN = { 'Chefbüro': ['#e4e7df', '#385c54'], 'Krypto': ['#d2dedf', '#355a68'], 'Shop': ['#ede5d8', '#9e7561'], 'Versand': ['#e0e5da', '#7c8d6b'], 'Social Media': ['#e6deea', '#867395'], 'Entwicklerbüro': ['#dbe7e4', '#477c79'], 'YouTube-Studio': ['#dde2ec', '#576f97'] };
    function beginRoom(name) { var d = ROOMS[name]; wingX = d.x0; wingZ = d.z0; B.push().t(wingX, 0, wingZ); }
    function endRoom() { B.pop(); wingX = 0; wingZ = 0; }
    function quad(o) {
      var QB = new K.Builder();
      QB.push().t(o.x + wingX, o.y, o.z + wingZ).ry(o.ry || 0).rx(o.rx || 0).rz(o.rz || 0).quad(o.w, o.h, o.col || [1, 1, 1], o.emi || 0, o.u0, o.v0, o.u1, o.v1);
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
      ST.reset().t(x + wingX, y, z + wingZ).ry(ry || 0);
      if (sc && sc !== 1) ST.s(sc, sc, sc);
      M.copy(m, ST.m);
      var it = { mod: mod, m: m, pal: over ? MD.palette(mod, over) : mod.pal, shadow: !noShadow, meshes: Object.keys(mod.groups).map(function (k) { return mod.groups[k]; }) };
      W.inst.push(it);
      return it;
    }
    function floorMesh(x0, z0, x1, z1, key, make, tile, y) {
      var FB = new K.Builder();
      FB.floor(x0 + wingX, z0 + wingZ, x1 + wingX, z1 + wingZ, y || 0, [1, 1, 1], 0, (x1 - x0) / tile, (z1 - z0) / tile);
      var m = R.mesh(FB);
      m.tex = tex(key, make, { repeat: true });
      stat(m);
    }

    /* ---------- Gelände: Plattform mit Gassen, Rampe im Osten, weicher Schatten darunter ---------- */
    B.box(0, -0.5, 11.5, 26.4, 0.7, 52, '#334d4a');
    floorMesh(-13.2, -14.5, 13.2, 37.5, 'campusStein', function () { return T.concrete('#d5dbcf', 51); }, 3.2, GY + 0.004);
    // Gestufter Sockel und dezente Lichtfugen statt einer grauen, ungegliederten Platte.
    B.box(0, -0.78, 11.5, 27.0, 0.16, 52.6, '#a0b4a8');
    B.box(13.22, -0.29, 17.3, 0.045, 0.045, 37.8, '#d9d0af', 0.4);
    B.box(-13.22, -0.29, 11.5, 0.045, 0.045, 51.7, '#d9d0af', 0.4);
    B.box(14.8, -0.5, 2.8, 3.2, 0.7, 8.4, '#3a3f4b');
    B.floor(13.2, -1.4, 16.4, 7.0, GY + 0.004, '#4b505b', 0);
    for (j = 0; j < 8; j++) B.floor(15.9, -1.1 + j * 1.0, 15.98, -0.55 + j * 1.0, GY + 0.007, '#e8e6e0', 0);
    stat(quad({ x: 1.5, y: -0.9, z: 11.5, rx: -PI / 2, w: 46, h: 76, tex: tex('groundshadow', T.shadow), alpha: 0.9 }));

    /* ---------- Hülle eines Raums: Boden, Plattformrand, hohe Nord- und (aussen) Westwand, niedrige übrige Wände mit Durchgängen ---------- */
    function huelle(name, o) {
      var thema = THEMEN[name], t = 0.18, wand = o.wand || thema[0], sockel = thema[1], LOW = 0.95, hoch = ROOMS[name].west === 'hoch';
      floorMesh(0, 0, RW, RD, o.key, o.floor, o.tile || 2);
      B.blk(RW / 2, GY, RD / 2, RW + 0.4, -GY - 0.004, RD + 0.4, '#b9c4bf');
      B.blk(RW / 2, 0, t / 2, RW, WH, t, wand);
      B.box(RW / 2, WH + 0.035, t / 2, RW + 0.16, 0.07, t + 0.1, CAP);
      B.box(RW / 2, 0.09, t + 0.018, RW - 0.1, 0.18, 0.036, sockel);
      function low(x0, z0, x1, z1) {
        B.cast = true; B.blk((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, LOW, z1 - z0, wand); B.cast = false;
        B.box((x0 + x1) / 2, LOW + 0.03, (z0 + z1) / 2, x1 - x0 + 0.06, 0.06, z1 - z0 + 0.06, CAP);
      }
      function rahmen(x, z, vert) {      // Türrahmen: zwei Pfosten und ein Sturz
        B.cast = true; B.blk(x[0], 0, z[0], 0.12, 2.1, 0.12, '#f1efe9'); B.blk(x[1], 0, z[1], 0.12, 2.1, 0.12, '#f1efe9'); B.cast = false;
        B.box((x[0] + x[1]) / 2, 2.16, (z[0] + z[1]) / 2, vert ? 0.12 : Math.abs(x[1] - x[0]) + 0.12, 0.1, vert ? Math.abs(z[1] - z[0]) + 0.12 : 0.12, '#f1efe9');
      }
      if (hoch) {
        B.blk(t / 2, 0, RD / 2, t, WH, RD, wand);
        B.box(t / 2, WH + 0.035, RD / 2, t + 0.1, 0.07, RD + 0.1, CAP);
        B.box(t + 0.018, 0.09, RD / 2, 0.036, 0.18, RD - 0.1, sockel);
      } else if (o.westLuecke) { low(0, 0, t, o.westLuecke[0]); low(0, o.westLuecke[1], t, RD); rahmen([t / 2, t / 2], [o.westLuecke[0], o.westLuecke[1]], true); }
      else low(0, 0, t, RD);
      // Südwand (niedrig) mit Durchgang
      if (o.sued) { low(0, RD - t, o.sued[0], RD); low(o.sued[1], RD - t, RW, RD); rahmen([o.sued[0], o.sued[1]], [RD - t / 2, RD - t / 2], false); }
      else low(0, RD - t, RW, RD);
      // Ostwand (niedrig) mit Durchgang
      if (o.ost) { low(RW - t, 0, RW, o.ost[0]); low(RW - t, o.ost[1], RW, RD); rahmen([RW - t / 2, RW - t / 2], [o.ost[0], o.ost[1]], true); }
      else low(RW - t, 0, RW, RD);
      // Warme Lichtfugen, farbige Sockel und Akustiklamellen gliedern jeden Pavillon.
      B.box(RW / 2, WH - 0.15, t + 0.035, RW - 0.4, 0.045, 0.035, '#fff1d1', 0.8);
      B.box(RW / 2, 0.08, RD - t - 0.025, RW - 0.5, 0.035, 0.025, '#e4d9b8', 0.45);
      if (name !== 'Chefbüro') {
        B.box(1.45, 1.7, t + 0.016, 2.1, 3.08, 0.03, thema[1]);
        for (var a = 0; a < 11; a++) B.box(0.5 + a * 0.19, 1.7, t + 0.055, 0.075, 3.08, 0.06, '#bba17f');
      }
    }
    // Ein abgerundetes Gehäuse: Geometrie statt scharfkantiger Quader an den Monitoren.
    function gehaeuse(x, y, z, w, h, d, r, col, emi, builder) {
      var G = builder || B;
      G.push().t(x, y, z).rx(PI / 2);
      G.box(0, 0, 0, w - 2 * r, d, h, col, emi);
      G.box(0, 0, 0, w, d, h - 2 * r, col, emi);
      [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) {
        G.cyl(sx * (w / 2 - r), 0, sz * (h / 2 - r), r, r, d, 12, col, emi);
      }); });
      G.pop();
    }
    /* Das Liveboard an der Nordwand: Rahmen, Leuchtleiste, Bild (wird von W.updateLive gezeichnet). uc = Mitte in u. */
    function liveBoard(name, uc) {
      var d = ROOMS[name], t = 0.18, rahmenB = new K.Builder();
      rahmenB.t(wingX, 0, wingZ);
      gehaeuse(uc, BY, t + 0.04, BW + 0.42, BH + 0.42, 0.12, 0.14, '#82969a', 0, rahmenB);
      gehaeuse(uc, BY, t + 0.07, BW + 0.24, BH + 0.24, 0.1, 0.10, '#122b35', 0, rahmenB);
      var caseMesh = stat(R.mesh(rahmenB)); caseMesh.roughness = 0.48; caseMesh.specular = 0.34;
      B.box(uc, BY - BH / 2 - 0.2, t + 0.1, BW + 0.2, 0.045, 0.03, '#7ad6c4', 0.5);
      B.box(uc, BY + BH / 2 + 0.2, t + 0.1, BW + 0.2, 0.03, 0.03, '#7ad6c4', 0.35);
      var tx = R.texture(T.liveboard(null), { mip: false });
      var m = stat(quad({ x: uc, y: BY, z: t + 0.145, w: BW, h: BH, emi: 1, tex: tx }));
      var cx = d.x0 + uc, cz = d.z0 + t + 0.145;
      W.live[name] = { room: name, mesh: m, caseMesh: caseMesh, tex: tx, key: '', c: [cx, BY, cz], w: BW, h: BH, mn: [cx - BW / 2 - 0.15, BY - BH / 2 - 0.15, cz - 0.12], mx: [cx + BW / 2 + 0.15, BY + BH / 2 + 0.15, cz + 0.35], az: 0 };
    }
    var skyTex = R.texture(T.skyline(12), { mip: false });
    W.sky = { tex: skyTex };
    function winWest(cz, cy, w, h) {      // Fenster in der hohen Westwand (nur Räume mit Aussenwand)
      var x = 0.18, c = '#fbfaf6';
      B.box(x, cy + h / 2 + 0.04, cz, 0.06, 0.08, w + 0.2, c); B.box(x, cy - h / 2 - 0.04, cz, 0.06, 0.08, w + 0.2, c);
      B.box(x, cy, cz - w / 2 - 0.05, 0.06, h, 0.1, c); B.box(x, cy, cz + w / 2 + 0.05, 0.06, h, 0.1, c);
      B.box(x, cy, cz, 0.04, h, 0.05, c);
      stat(quad({ x: x + 0.005, y: cy, z: cz, ry: PI / 2, w: w, h: h, tex: skyTex, emi: 0.95 }));
    }

    /* ---------- Schreibtische mit Stuhl (Modelle), Bildschirmflächen ---------- */
    SEATS.forEach(function (s, idx) {
      var hs = T.hashStr(s.room + s.i), sc = s.sc || 1, c = Math.cos(s.h), sn = Math.sin(s.h);
      function loc(lx, lz) { return [s.x + lx * c + lz * sn, s.z - lx * sn + lz * c]; }
      var o = { x: s.x, z: s.z, heading: s.h, seed: hs, screens: [] };
      var zc = 0.30 + 0.4 * sc, dc = loc(0, zc), top = TOP[s.style] || TOP.oak;
      var hasDesk = !!mdl('desk');
      if (hasDesk) {
        place('desk', dc[0], 0, dc[1], s.h, sc, { tischplatte: top, kante: K.shade(top, 0.78), gestell: s.style === 'dark' ? '#2b303c' : s.style === 'exec' ? '#344a53' : '#4b5260', container: s.style === 'dark' ? '#30343f' : s.style === 'exec' ? '#dce6e3' : '#e6e3dc' });
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
    // Weiche Kontaktflächen unter Tisch und Stuhl: aus vorhandener Schatten-Textur,
    // statisch und unabhängig von der Zahl der laufenden Aufgaben.
    var kontakt = tex('moebelKontakt', T.shadow);
    W.seats.forEach(function (seat) {
      var s = seat.spec, sc = s.sc || 1, c = Math.cos(s.h), sn = Math.sin(s.h), dz = 0.30 + 0.4 * sc;
      stat(quad({ x: s.x + dz * sn, y: 0.018, z: s.z + dz * c, rx: -PI / 2, w: 2.05 * sc, h: 1.5 * sc, tex: kontakt, alpha: 0.2 }));
      stat(quad({ x: s.x, y: 0.019, z: s.z, rx: -PI / 2, w: 1.1 * sc, h: 1.1 * sc, tex: kontakt, alpha: 0.12 }));
    });
    /* Arbeitsort-Schilder: kleine Aufsteller auf dem Tisch. Wer zur Kamera schaut (h = 0), bekommt es vorn in der Mitte vor den Bildschirm,
       wer wegschaut (h = PI), seitlich am Rand der Figur, damit weder Figur noch Bildschirm das Schild verdecken. Das Chefbüro hat keins. */
    W.seats.forEach(function (seat) {
      var s = seat.spec;
      if (s.boss) return;
      var c = Math.cos(s.h), sn = Math.sin(s.h);
      var lx = s.h === 0 ? 0 : -0.62, lz = s.h === 0 ? 1.03 : 0.36;
      var sx = s.x + lx * c + lz * sn, sz = s.z - lx * sn + lz * c;
      B.box(sx, 0.757, sz, 0.3, 0.012, 0.075, C.dark);
      B.box(sx, 0.785, sz - 0.014, 0.05, 0.05, 0.014, C.dark);
      seat.signPos = { x: sx, y: 0.855, z: sz };
    });
    // Schreibtischunterlagen geben jedem Arbeitsplatz eine klare, ruhige Fläche.
    SEATS.forEach(function (s) {
      var sc = s.sc || 1;
      B.push().t(s.x, 0, s.z).ry(s.h);
      B.box(0, 0.755 * sc, 0.67 * sc, 0.78 * sc, 0.008, 0.38 * sc, s.room === 'Krypto' ? '#647c7c' : s.room === 'Shop' ? '#b0bdac' : s.boss ? '#50685f' : '#879a99');
      B.pop();
    });

    /* =============================== CHEFBÜRO =============================== */
    beginRoom('Chefbüro');
    huelle('Chefbüro', { key: 'fChef', floor: function () { return T.parquet('#b4c6c3', 1); }, sued: [6.6, 9.2] });
    // Geldmanager-Wand (links) und Liveboard (rechts) an der Nordwand
    W.moneyPanel = { mn: [ROOMS['Chefbüro'].x0 + 0.3, 0.75, ROOMS['Chefbüro'].z0 + 0.1], mx: [ROOMS['Chefbüro'].x0 + 4.7, 3.05, ROOMS['Chefbüro'].z0 + 0.45] };
    B.box(2.5, 1.9, 0.235, 4.4, 2.3, 0.09, '#233d48');
    B.box(2.5, 0.72, 0.29, 4.2, 0.045, 0.05, '#7ad6c4', 0.4);
    var geldTex = tex('geldwand', T.geldwand), geldKey = '';
    stat(quad({ x: 2.5, y: 1.9, z: 0.285, w: 4.2, h: 2.1, emi: 0.7, tex: geldTex }));
    W.updateMoney = function (info) { var key = JSON.stringify(info); if (key !== geldKey) { R.retex(geldTex, T.geldwand(info)); geldKey = key; } };
    liveBoard('Chefbüro', 7.6);
    // Uhr über der Geldwand
    stat(quad({ x: 2.5, y: 3.3, z: 0.19, w: 0.62, h: 0.62, tex: tex('clockface', T.clock), emi: 0.3 }));
    var cb = new K.Builder(); cb.torus(2.5 + ROOMS['Chefbüro'].x0, 3.3, 0.18 + ROOMS['Chefbüro'].z0 + 0.02, 0.31, 0.03, 24, 6, C.woodD, 0); stat(R.mesh(cb));
    var hb = new K.Builder(), mb = new K.Builder();
    hb.box(0, 0.085, 0, 0.026, 0.17, 0.012, '#1b1d24'); mb.box(0, 0.125, 0, 0.018, 0.25, 0.012, '#1b1d24');
    W.hands = { h: R.mesh(hb), m: R.mesh(mb), mh: M.ident(), mm: M.ident(), c: [2.5 + ROOMS['Chefbüro'].x0, 3.3, 0.18 + ROOMS['Chefbüro'].z0 + 0.04] };
    // Pinnwand an der Westwand: Tafel mit der grossen Zahl und fünf Kärtchen
    B.box(0.2, 3.28, 4.0, 0.03, 0.035, 6.2, '#c5f4e5', 0.5);
    var boardTex = R.texture(T.board('', ''), { mip: false });
    W.board = { mesh: quad({ x: 0.2, y: 2.35, z: 1.5, ry: PI / 2, w: 1.3, h: 0.65, tex: boardTex, emi: 0.2 }), tex: boardTex, key: '',
      mn: [ROOMS['Chefbüro'].x0, 1.9, ROOMS['Chefbüro'].z0 + 0.8], mx: [ROOMS['Chefbüro'].x0 + 0.5, 2.8, ROOMS['Chefbüro'].z0 + 2.2],
      lp: [ROOMS['Chefbüro'].x0 + 0.3, 2.95, ROOMS['Chefbüro'].z0 + 1.5], sp: [ROOMS['Chefbüro'].x0 + 0.5, 2.35, ROOMS['Chefbüro'].z0 + 1.5] };
    for (i = 0; i < 5; i++) {
      var cz = 2.9 + i * 0.75, ct = R.texture(T.card('', 'du'), { mip: false });
      var cm = quad({ x: 0.2, y: 1.72 + (i % 2) * 0.08, z: cz, ry: PI / 2, rz: (i - 2) * 0.05, w: 0.52, h: 0.52, tex: ct, emi: 0.15 });
      var gx = ROOMS['Chefbüro'].x0, gz = ROOMS['Chefbüro'].z0 + cz;
      W.cards.push({ mesh: cm, tex: ct, mn: [gx, 1.35, gz - 0.3], mx: [gx + 0.45, 2.15, gz + 0.3], key: '', z: gz, lp: [gx + 0.25, 2.3 + (i % 2) * 0.08, gz], sp: [gx + 0.4, 1.8, gz] });
    }
    P.rug(B, 3.0, 3.5, 7.7, 6.6, '#2f4f5f', '#d8c9a8');
    place('bookshelf', 0.55, 0, 7.2, PI / 2, 1.15);
    place('sofa', 9.65, 0, 4.2, PI / 2, 1.0, { sofapolster: '#3f8f8f', sofakorpus: '#2f6f73' });
    place('table', 8.2, 0, 4.2, PI / 2, 0.5);
    P.mug(B, 8.2, 0.39, 4.35, C.white); P.mug(B, 8.3, 0.39, 4.05, C.red);
    place('armchair', 8.6, 0, 6.2, 0.35, 1.0, { 'm': '#d9845a' });
    place('lamp', 10.0, 0, 1.0, 0, 1.0);
    place('planter', 9.9, 0, 7.3, 0, 0.9);
    place('planter', 0.8, 0, 0.9, 0, 0.9);
    place('plant', 10.0, 0, 3.0, 0, 0.8);
    place('coatrack', 10.0, 0, 7.0, 0, 1.9);
    // Teeküche an der Südwand
    place('kitchen', 1.9, 0, 7.45, 0, 0.6);
    place('fridge', 3.4, 0, 7.4, 0, 0.8);
    P.waterCooler(B, 4.4, 7.3, PI);
    place('bin', 5.1, 0, 7.4, 0, 0.6);
    endRoom();
    // Pult des Besitzers: Namensschild, Unterlage, Kaffee, Globus (global, am Platz des Besitzers)
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

    /* =============================== KRYPTO =============================== */
    beginRoom('Krypto');
    huelle('Krypto', { key: 'fKrypto', floor: function () { return T.carpet('#354550', 4); }, tile: 2, westLuecke: [4.6, 6.8] });
    sign('KRYPTO', 2.4, 0.6, 2.0, 2.95, 0.2, 0, '#7df0ff', '#10182a', '#37c8d8', 'Spielgeld, kein echtes Geld');
    liveBoard('Krypto', 6.9);
    B.cast = true; B.cylb(9.6, 0, 6.9, 0.3, 0.38, 0.55, 16, '#2a3047'); B.cast = false;
    B.cylb(9.6, 0.55, 6.9, 0.33, 0.3, 0.04, 16, C.gold);
    P.coinStack(B, 9.95, 5.9, 5); P.coinStack(B, 9.45, 5.75, 3, '#d9a93a'); P.coinStack(B, 0.9, 7.2, 4);
    B.cast = true; B.cylb(9.6, 0, 4.9, 0.28, 0.34, 0.5, 8, '#2a3047'); B.cast = false;
    place('plant', 3.9, 0, 0.8, 0, 0.8);
    place('planter', 9.95, 0, 0.8, 0, 0.8);
    place('fridge', 9.9, 0, 2.3, -PI / 2, 0.8);
    place('relax', 9.0, 0, 2.5, PI, 1.4, { m: '#6b4fa0' });
    P.cableRun(B, [[1.1, 1.4], [1.1, 3.1], [2.3, 3.5]], '#111'); P.cableRun(B, [[2.8, 1.4], [2.8, 2.8], [4.9, 3.4]], '#111');
    P.extinguisher(B, 0.4, 0.4, 0);
    endRoom();
    [1.0, 1.9, 2.8].forEach(function (u, k) { P.serverRack(B, LB, ROOMS['Krypto'].x0 + u, ROOMS['Krypto'].z0 + 0.62, 0, 20 + k); });
    W.coinP = [ROOMS['Krypto'].x0 + 9.6, 1.35, ROOMS['Krypto'].z0 + 6.9];
    W.crystalP = [ROOMS['Krypto'].x0 + 9.6, 0.95, ROOMS['Krypto'].z0 + 4.9];

    /* =============================== SHOP =============================== */
    beginRoom('Shop');
    huelle('Shop', { key: 'fShop', floor: function () { return T.parquet('#dfcdae', 2); }, ost: [5.4, 7.3] });
    liveBoard('Shop', 5.2);
    [1.3, 3.3, 5.3, 7.0].forEach(function (z) { place('shopshelf', 0.55, 0, z, -PI / 2, 0.85); });
    sign('SHOP', 2.6, 0.65, 0.2, 2.9, 4.3, PI / 2, '#ffd7e3', '#c7456d', '#ffffff', 'LuxeStyle');
    for (i = 0; i < 12; i++) B.box(0.2, 0.63, 0.7 + i * 0.62, 0.055, 1.12, 0.045, i % 2 ? '#b99b78' : '#a98860');
    winWest(1.4, 2.85, 1.0, 0.6);
    P.mannequin(B, 1.5, 7.2, '#d9748f', 0.4); P.mannequin(B, 2.4, 7.25, '#3f9a8c', -0.3);
    P.clothesRack(B, 3.7, 7.1, 0.05);
    P.table(B, 5.2, 7.2, 0.42, 0.75, '#f1efe9');
    P.bag(B, 5.3, 7.15, C.orange, 0); B.cylb(5.1, 0.75, 7.25, 0.05, 0.05, 0.12, 8, C.yellow);
    place('counter', 7.6, 0, 7.15, PI, 0.6);
    P.bag(B, 6.4, 7.2, C.pink, 0.2); P.bag(B, 8.9, 7.15, C.teal, -0.2);
    P.rug(B, 1.0, 3.95, 9.6, 4.55, '#d9748f', '#f3e3d6', 0.012);
    place('planter', 9.9, 0, 0.8, 0, 0.8);
    place('bin', 9.9, 0, 4.4, 0, 0.6);
    place('plant', 0.9, 0, 7.5, 0, 0.7);
    P.extinguisher(B, 10.1, 7.6, PI);
    endRoom();

    /* =============================== VERSAND =============================== */
    beginRoom('Versand');
    huelle('Versand', { key: 'fVersand', floor: function () { return T.concrete('#c4c7c1', 3); }, ost: [3.9, 6.9] });
    liveBoard('Versand', 5.2);
    var bz = 5.0, bx0 = 1.3, bx1 = 8.9;
    B.cast = true;
    B.blk((bx0 + bx1) / 2, 0.72, bz, bx1 - bx0, 0.13, 0.84, '#3b4252');
    for (j = 0; j <= 7; j++) { var lx = bx0 + 0.2 + j * ((bx1 - bx0 - 0.4) / 7); B.blk(lx, 0, bz - 0.34, 0.06, 0.72, 0.06, C.metalD); B.blk(lx, 0, bz + 0.34, 0.06, 0.72, 0.06, C.metalD); B.blk(lx, 0.25, bz, 0.04, 0.03, 0.68, C.metalD); }
    B.cast = false;
    B.blk((bx0 + bx1) / 2, 0.85, bz - 0.4, bx1 - bx0, 0.07, 0.03, C.metal); B.blk((bx0 + bx1) / 2, 0.85, bz + 0.4, bx1 - bx0, 0.07, 0.03, C.metal);
    B.cyl(bx0 - 0.02, 0.78, bz, 0.1, 0.1, 0.8, 12, C.metalD); B.cyl(bx1 + 0.02, 0.78, bz, 0.1, 0.1, 0.8, 12, C.metalD);
    B.blk(bx1 + 0.35, 0, bz + 0.5, 0.3, 0.45, 0.3, '#e48a3f'); B.box(bx1 + 0.35, 0.3, bz + 0.66, 0.1, 0.1, 0.01, C.green, 1);
    var beltM = (function () {
      var FB = new K.Builder();
      FB.floor(bx0 + ROOMS['Versand'].x0, bz - 0.36 + ROOMS['Versand'].z0, bx1 + ROOMS['Versand'].x0, bz + 0.36 + ROOMS['Versand'].z0, 0.7885, [1, 1, 1], 0, 14, 1.4);
      var m = R.mesh(FB); m.tex = tex('belt', T.belt, { repeat: true });
      return m;
    })();
    stat(beltM);
    var vx = ROOMS['Versand'].x0, vz = ROOMS['Versand'].z0;
    W.belt = { mesh: beltM, x0: bx0 + vx, x1: bx1 + vx, z: bz + vz, moving: true, mn: [bx0 + vx, 0, bz + vz - 0.5], mx: [bx1 + vx + 0.9, 1.5, bz + vz + 0.5],
      lp: [vx + 4.2, 1.55, bz + vz], sp: [vx + 5.0, 1.2, bz + vz] };
    B.cast = true;
    B.blk(0.9, 0, bz - 0.65, 0.1, 2.4, 0.1, C.metalD); B.blk(0.9, 0, bz + 0.65, 0.1, 2.4, 0.1, C.metalD);
    B.cast = false;
    B.box(0.9, 2.4, bz, 0.14, 0.12, 1.4, '#e48a3f');
    sign('VERSAND', 1.25, 0.42, 0.98, 2.0, bz, PI / 2, '#fff3dc', '#b85a1c', '#ffd8a8', 'Bestellungen');
    for (j = 0; j < 26; j++) { var hx = 1.1 + j * 0.3; B.floor(hx, bz - 0.5, hx + 0.15, bz - 0.44, 0.014, '#e8bd45', 0); B.floor(hx, bz + 0.44, hx + 0.15, bz + 0.5, 0.014, '#e8bd45', 0); }
    P.pallet(B, 2.4, 7.0, 0.05, 3, 1); P.pallet(B, 4.0, 7.1, -0.1, 2, 2); P.pallet(B, 5.6, 7.05, 0.08, 1, 3);
    P.crates(B, 7.4, 7.0, 0.1, 3);
    if (!place('cart', 9.7, 0, bz, PI / 2, 0.6)) P.rollCage(B, 9.6, bz, 0, 6);
    place('bin', 0.6, 0, 1.4, 0, 0.6);
    place('plant', 9.95, 0, 0.9, 0, 0.8);
    P.extinguisher(B, 10.2, 7.7, -PI / 2);
    SEATS.filter(function (s) { return s.room === 'Versand'; }).forEach(function (s, k) {
      B.push().t(s.u, 0, s.v);
      P.tapeGun(B, -0.5, 0.75, 0.62, 0.4);
      P.labelPrinter(B, 0.62, 0.75, 0.78, 0);
      if (k === 1) P.scale(B, -0.55, 0.75, 0.9);
      if (k === 0) P.bubbleWrap(B, -0.5, 0.9, 0.95, 0);
      if (k === 2) { B.push().t(-0.5, 0.75, 0.9); P.parcel(B, 0.3, 0.2, 0.25, C.card); B.pop(); }
      B.pop();
    });
    B.cast = true; B.blk(9.0, 0, 0.75, 1.6, 1.2, 0.4, C.metal); B.blk(1.4, 0, 0.75, 1.6, 1.2, 0.4, C.metal); B.cast = false;
    for (j = 0; j < 3; j++) { B.blk(9.0, 0.32 + j * 0.38, 0.75, 1.56, 0.03, 0.38, '#7d8693'); B.blk(1.4, 0.32 + j * 0.38, 0.75, 1.56, 0.03, 0.38, '#7d8693'); }
    for (j = 0; j < 4; j++) { B.push().t(8.45 + j * 0.34, 0.35, 0.75); P.parcel(B, 0.28, 0.24, 0.3, j % 2 ? C.card : C.cardD); B.pop(); }
    place('van', 14.6 - vx, GY, 2.8 - vz, PI, 0.62);
    endRoom();

    /* Studios: Social Media, Entwicklerbüro, YouTube-Studio */
    function studioBoard(name, key, titel, sub, breite) {
      liveBoard(name, 5.2);
      sign(titel, breite, 0.42, 5.2, 3.55, 0.2, 0, '#f2f4ef', '#426d67', '#d8dfd7', sub);
    }
    /* =============================== SOCIAL MEDIA =============================== */
    beginRoom('Social Media');
    huelle('Social Media', { key: 'fSocial', floor: function () { return T.parquet('#d6c9b8', 8); }, sued: [6.8, 9.4] });
    studioBoard('Social Media', 'fSocial', 'SOCIAL MEDIA', 'Planung · Ergebnisse · Metricool', 3.4);
    P.rug(B, 0.9, 2.4, 9.5, 5.6, '#a397af', '#e0d5c4', 0.012);
    B.cylb(1.3, 0, 6.5, 0.2, 0.2, 0.035, 16, '#39424b');
    B.box(1.3, 0.7, 6.5, 0.035, 1.4, 0.035, '#636974');
    B.torus(1.3, 1.65, 6.5, 0.28, 0.035, 24, 6, '#fff0cf', 0.7);
    B.box(1.3, 1.62, 6.49, 0.13, 0.19, 0.06, '#303643');
    place('plant', 9.7, 0, 7.0, 0, 0.75);
    place('plant', 0.8, 0, 0.9, 0, 0.75);
    place('sofa', 5.2, 0, 7.1, PI, 0.65, { sofapolster: '#a093b7', sofakorpus: '#786c88' });
    winWest(2.0, 2.85, 1.0, 0.6);
    winWest(6.2, 2.85, 1.0, 0.6);
    endRoom();
    /* =============================== ENTWICKLERBÜRO =============================== */
    beginRoom('Entwicklerbüro');
    huelle('Entwicklerbüro', { key: 'fDev', floor: function () { return T.parquet('#d6c9b8', 9); }, westLuecke: [4.8, 6.8] });
    studioBoard('Entwicklerbüro', 'fDev', 'ENTWICKLUNG', 'Produktbau · Prüfstand · Verkaufsunterlagen', 3.8);
    P.rug(B, 0.9, 2.4, 9.5, 5.6, '#7f9e9c', '#d8ddcf', 0.012);
    place('planter', 9.7, 0, 7.1, 0, 0.65);
    place('bookshelf', 1.0, 0, 7.3, 0, 0.8);
    P.table(B, 5.2, 7.0, 0, 0.72, '#d9c5a5');
    B.box(5.0, 0.76, 7.0, 0.18, 0.12, 0.18, '#7da6a6');
    B.box(5.25, 0.80, 7.0, 0.15, 0.20, 0.15, '#c4aa7c');
    B.box(5.45, 0.74, 7.05, 0.16, 0.08, 0.16, '#a093b7');
    endRoom();
    /* =============================== YOUTUBE-STUDIO =============================== */
    beginRoom('YouTube-Studio');
    huelle('YouTube-Studio', { key: 'fYoutube', floor: function () { return T.parquet('#d6c9b8', 12); }, sued: [6.8, 9.4] });
    studioBoard('YouTube-Studio', 'fYoutube', 'YOUTUBE-STUDIO', 'Originale Ideen · Videos · echte Messwerte', 5.0);
    P.rug(B, 0.9, 2.4, 9.5, 5.6, '#596f91', '#a7bcd4', 0.012);
    place('plant', 0.9, 0, 7.0, 0, 0.8);
    place('plant', 9.8, 0, 0.9, 0, 0.8);
    place('sofa', 5.2, 0, 7.1, 0, 0.65, { sofapolster: '#697b9b' });
    winWest(2.0, 2.85, 1.0, 0.6);
    winWest(6.2, 2.85, 1.0, 0.6);
    endRoom();

    /* =============================== CAMPUSPLATZ =============================== */
    // Zentralmonitor: breites, niedriges Brett auf zwei Pfosten (weit genug von den Räumen, damit er sie nicht verdeckt)
    var CZ = 11.0, CW = 8.8, CH = 4.4, CY = 2.75;
    gehaeuse(0, 0.12, CZ, 10.1, 0.32, 1.4, 0.14, '#335254');
    B.box(-4.2, 1.1, CZ - 0.06, 0.18, 2.0, 0.3, '#819998'); B.box(4.2, 1.1, CZ - 0.06, 0.18, 2.0, 0.3, '#819998');
    var zentralB = new K.Builder();
    gehaeuse(0, CY, CZ - 0.02, CW + 0.62, CH + 0.62, 0.28, 0.22, '#9db0ab', 0, zentralB);
    gehaeuse(0, CY, CZ + 0.02, CW + 0.30, CH + 0.30, 0.26, 0.15, '#132f3a', 0, zentralB);
    var zentralCase = stat(R.mesh(zentralB)); zentralCase.roughness = 0.48; zentralCase.specular = 0.34;
    B.box(0, CY + CH / 2 + 0.22, CZ, CW + 0.10, 0.035, 0.3, '#cce8de', 0.4);
    var ovTex = R.texture(T.liveboardUebersicht(null), { mip: false });
    var ovM = stat(quad({ x: 0, y: CY, z: CZ + 0.16, w: CW, h: CH, emi: 1, tex: ovTex }));
    W.overview = { mesh: ovM, caseMesh: zentralCase, tex: ovTex, key: '', c: [0, CY, CZ + 0.16], w: CW, h: CH, az: 0 };
    W.campusPanel = { mn: [-CW / 2 - 0.15, CY - CH / 2 - 0.15, CZ - 0.1], mx: [CW / 2 + 0.15, CY + CH / 2 + 0.15, CZ + 0.35] };
    // Sitzbereiche und Pflanzen auf dem Platz
    [-8.2, 8.2].forEach(function (x) {
      B.box(x, 0.38, 12.6, 2.9, 0.18, 0.85, '#b99a73');
      B.box(x, 0.74, 12.26, 2.9, 0.64, 0.12, '#7b9c91');
      B.box(x - 1.1, 0.15, 12.6, 0.14, 0.35, 0.6, '#405862');
      B.box(x + 1.1, 0.15, 12.6, 0.14, 0.35, 0.6, '#405862');
      place('planter', x, 0, 8.5, 0, 0.72);
    });
    place('planter', -4.8, 0, 8.6, 0, 0.7); place('planter', 4.8, 0, 8.6, 0, 0.7);
    stat(quad({ x: 0, y: 0.026, z: 13.3, rx: -PI / 2, w: 5.0, h: 0.7, tex: tex('campusplatz', function () { return T.sign('CAMPUSPLATZ', '#345d59', '#d9e5de', '#d9e5de'); }) }));
    // Türkise Randlinien der Plattform
    B.floor(-13.2, 6.9, 13.2, 7.02, GY + 0.01, '#68b8ad', 0.2);
    B.floor(-13.2, 14.0, 13.2, 14.12, GY + 0.01, '#68b8ad', 0.2);
    // Gartenterrasse: Besprechungsecke, offene Pergola, Wasser und breite Wege.
    // Reine Raumgestaltung; Wasserbewegung bildet keine betriebliche Aktivität ab.
    B.box(6.6, GY + 0.05, 29.8, 10.4, 0.1, 8.0, '#879a83');
    for (j = 0; j < 23; j++) B.box(6.6, GY + 0.12, 26.0 + j * 0.34, 10.0, 0.04, 0.3, j % 2 ? '#c8ae88' : '#bfa47d');
    [[2.1, 26.5], [6.1, 26.5], [2.1, 31.6], [6.1, 31.6]].forEach(function (p) {
      B.cylb(p[0], GY + 0.14, p[1], 0.06, 0.06, 2.8, 8, '#56766a');
    });
    B.box(4.1, 2.73, 26.5, 4.25, 0.14, 0.16, '#45675b');
    B.box(4.1, 2.73, 31.6, 4.25, 0.14, 0.16, '#45675b');
    // Wenige Dachlatten lassen die Kamera und die Sicht auf die Terrasse frei.
    for (j = 0; j < 5; j++) B.box(2.1 + j, 2.85, 29.05, 0.095, 0.12, 5.4, '#93ad97');
    B.cylb(4.1, GY + 0.14, 28.9, 0.08, 0.18, 0.7, 12, '#4d695e');
    B.cyl(4.1, 0.74, 28.9, 0.95, 0.95, 0.09, 32, '#e7ddc9');
    [[2.7, 28.9], [5.5, 28.9], [4.1, 27.5], [4.1, 30.3]].forEach(function (p) {
      B.cylb(p[0], GY + 0.14, p[1], 0.29, 0.22, 0.45, 16, '#81988c');
      B.cyl(p[0], 0.49, p[1], 0.3, 0.3, 0.08, 16, '#e8cfab');
    });
    // Rundes Wasserbecken mit flachem Rand. Alle Ringe teilen dasselbe Netz.
    var fx = 9.0, fz = 29.8;
    B.cylb(fx, GY + 0.14, fz, 1.45, 1.5, 0.37, 40, '#627e72');
    B.cyl(fx, 0.385, fz, 1.28, 1.28, 0.035, 40, '#69a69f', 0.18);
    B.push().t(fx, 0.43, fz).rx(-PI / 2).torus(0, 0, 0, 1.36, 0.095, 40, 6, '#d9d4bc').pop();
    B.cylb(fx, 0.39, fz, 0.18, 0.32, 0.39, 16, '#a4b5a0');
    B.cyl(fx, 0.8, fz, 0.42, 0.42, 0.1, 24, '#d9d4bc');
    var eau = new K.Builder();
    [0.38, 0.68, 0.98].forEach(function (r) { eau.push().rx(-PI / 2).torus(0, 0, 0, r, 0.014, 32, 4, '#c9eece', 0.2).pop(); });
    W.garden = { mesh: R.mesh(eau), m: M.ident(), x: fx, z: fz, y: 0.412 };
    [[2.1, 32.7], [6.4, 32.7], [10.9, 26.7], [10.9, 32.7]].forEach(function (p) { place('planter', p[0], GY + 0.14, p[1], 0, 0.85); });
    // Klare Wegmarkierungen und niedrige Leuchten; die Mitte bleibt frei begehbar.
    [-9.3, -6.2, -3.1, 3.1, 6.2, 9.3].forEach(function (x) {
      B.box(x, GY + 0.018, 8.0, 1.8, 0.025, 0.1, '#b7c6b3');
      B.box(x, GY + 0.018, 13.5, 1.8, 0.025, 0.1, '#b7c6b3');
    });
    [[-12.5, 8.4], [12.5, 8.4], [-12.5, 24.1], [12.5, 24.1], [0, 34.7]].forEach(function (p) {
      B.blk(p[0], GY, p[1], 0.16, 0.55, 0.16, '#45675b');
      B.box(p[0], GY + 0.46, p[1], 0.18, 0.1, 0.18, '#fff0cb', 0.8);
    });

    // Laternen in den Gassen
    [[0, -3.0], [0, 8.2], [0, 24.0]].forEach(function (p) { B.cylb(p[0], GY, p[1], 0.05, 0.05, 2.6, 8, '#39424b'); B.sph(p[0], 2.75 + GY, p[1], 0.16, 0.16, 0.16, 10, 6, '#fff0cf', 0.8); });

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
    var ortTex = {};
    W.ortTex = function (art, kurz) {
      var key = (art || 'du') + '|' + (kurz || '');
      if (!ortTex[key]) ortTex[key] = R.texture(T.ortSchild(art || 'du', kurz || ''), {});
      return ortTex[key];
    };
    W.seats.forEach(function (seat) {
      if (!seat.signPos) return;
      seat.sign = quad({ x: seat.signPos.x, y: seat.signPos.y, z: seat.signPos.z, rx: -0.42, w: 0.36, h: 0.18, emi: 0.45, tex: null });
    });

    /* ---------- Liveboards und Zentralmonitor: Bilder aus den Zeilen (Texturen werden ersetzt) ---------- */
    W.updateLive = function (modelle) {
      modelle = modelle || {};
      Object.keys(W.live).forEach(function (name) {
        var b = W.live[name], mo = modelle[name] || null, key = JSON.stringify(mo);
        if (key !== b.key) { b.key = key; R.retex(b.tex, T.liveboard(mo)); }
      });
      var ok = JSON.stringify(modelle.__uebersicht || null);
      if (ok !== W.overview.key) { W.overview.key = ok; R.retex(W.overview.tex, T.liveboardUebersicht(modelle.__uebersicht || null)); }
    };

    /* ---------- Bewegtes: Münze, Kristall, Pakete ---------- */
    var mb2 = new K.Builder();
    mb2.push().rx(PI / 2); P.coin(mb2, 0.5, 0.07, C.gold); mb2.pop();
    W.coin = { mesh: R.mesh(mb2), m: M.ident(), p: W.coinP };
    var xb = new K.Builder();
    xb.cyl(0, 0.2, 0, 0.0, 0.26, 0.4, 4, '#8a6fb0'); xb.cyl(0, -0.2, 0, 0.26, 0.0, 0.4, 4, '#b08fe0');
    W.crystal = { mesh: R.mesh(xb), m: M.ident(), p: W.crystalP };
    [[0.5, 0.3, 0.4], [0.4, 0.26, 0.34], [0.58, 0.34, 0.44], [0.44, 0.28, 0.36]].forEach(function (sz, k) {
      var pb = new K.Builder(); P.parcel(pb, sz[0], sz[1], sz[2], k % 2 ? C.cardD : C.card);
      W.parcels.push({ mesh: R.mesh(pb), m: M.ident(), k: k, h: sz[1] });
    });

    /* ---------- Kamera-Ansichten: Mitte des Raums, Abstand passend zur Raumgrösse ---------- */
    W.views = { alle: { tx: 1.5, ty: 0.4, tz: 12.5, dist: 68 }, 'Campusplatz': { tx: 0, ty: 1.4, tz: 10.6, dist: 25 } };
    Object.keys(ROOMS).forEach(function (n) { var d = ROOMS[n]; W.views[n] = { tx: d.x0 + 5.2, ty: 0.7, tz: d.z0 + 4.4, dist: 15.5 }; });
    return W;
  };

  /* Pro Bild: Matrizen der bewegten Weltteile aktualisieren und alles Weltliche zeichnen. */
  K.drawWorld = function (W, R, t, hour, belt, still) {
    // Reduzierte Bewegung friert auch die dekorative Welt ein; Uhrzeit bleibt echt.
    if (still) t = 0;
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
    if (W.garden) {
      var g = W.garden, wave = 1 + Math.sin(t * 0.65) * 0.06;
      M.ident(g.m); g.m[0] = wave; g.m[10] = wave; g.m[12] = g.x; g.m[13] = g.y; g.m[14] = g.z;
      R.draw(g.mesh, g.m);
    }
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
