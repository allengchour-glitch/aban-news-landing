/* KB3D Figuren: eigene runde Charaktermodelle (man, woman, worker) mit Farbpalette und beweglichen Gelenken.
   Modell: Blick nach -z, Höhe 0 bis 1,8. Gesetzt wird: Hüfte auf Sitzhöhe, Beine gebeugt (fest eingebacken), Arme und Kopf bewegen sich.
   Haltungen: busy (tippt), rest (Kaffee), warn (Hand am Kopf), alarm (Arme hoch), sleep (schläft). */
(function (K) {
  'use strict';
  var PI = Math.PI, M = K.M, ST = new K.Stack();
  var HIP = 0.95, KNEE = 0.505, NECK = 1.52, EYEY = 1.706, SHX = 0.14, SHY = 1.47, ELX = 0.24, ELY = 1.16, DY = 0.42, LEGX = 0.08;
  var sin = Math.sin, cos = Math.cos;

  function sstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function mixv(a, b, t) { return a + (b - a) * t; }
  // Fünfgliedriges Easing: Geschwindigkeit und Beschleunigung enden bei null.
  function weich(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * t * (t * (t * 6 - 15) + 10); }

  /* ---------- Bildchen für Sprechblasen, Dampf usw. ---------- */
  K.fx = function (R) {
    var G = K.tex.glyph, o = {};
    ['dots', 'q', 'ex', 'puff', 'glow', 'drop', 'spark'].forEach(function (k) { o[k] = R.texture(G(k), { mip: false }); });
    o.z = R.texture(G('z', '#5b6578'), { mip: false });
    return o;
  };

  /* Schultern und Ellbogen heller (Besitzer 05.11.): Punkte nahe den Gelenken von Rumpf und Armen werden bis +21 % aufgehellt, weich auslaufend.
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
    return 0.28 * best;
  }
  K.jointLift = jointLift;

  /* Runde, eigenständige Figuren. Die Gelenkkoordinaten bleiben mit den Haltungen kompatibel.
     Palette und CPU-Gruppen werden wie bei den übrigen Modellen geführt. */
  function characterModel(R, kind) {
    var names = ['Shirt', 'Hose', 'Haut', 'Haar', 'Auge', 'Schuh', 'Weiss', 'Wange', 'Iris'];
    var colors = ['#829eab', '#465063', '#e2b48c', '#553b2d', '#283342', '#33414b', '#fff8ef', '#d38d7c', '#54757a'];
    var model = { names: names, pal: new Float32Array(64), groups: {}, cpu: {} };
    colors.forEach(function (v, i) { var c = K.col(v); model.pal.set([c[0], c[1], c[2], 0], i * 4); });
    function group(name, make) {
      var B = new K.Builder();
      // Farbcodes adressieren die gemeinsame Figurenpalette im Shader.
      function sphere(x, y, z, rx, ry, rz, slot) { B.sph(x, y, z, rx, ry, rz, 14, 9, [slot / 16, 0, 0]); }
      make(B, sphere);
      var data = new Float32Array(B.a.subarray(0, B.n * 12));
      for (var i = 0; i < B.n; i++) data[i * 12 + 7] = jointLift(name, data[i * 12], data[i * 12 + 1], data[i * 12 + 2]);
      var cast = new Float32Array(B.n * 3);
      for (var j = 0; j < B.n; j++) cast.set(data.subarray(j * 12, j * 12 + 3), j * 3);
      var mesh = R.meshRaw(data, B.n, cast); mesh.pal = true; mesh.palette = model.pal;
      model.groups[name] = mesh; model.cpu[name] = { data: data, n: B.n };
    }
    // Geschlossene Ärmel aus einem weichen Radiusprofil entlang des Knochens.
    // Gemeinsame Endpunkte halten die Silhouette auch beim Beugen zusammen.
    function sleeve(B, ax, ay, bx, by, rings, depth, slot) {
      depth = depth || 1;
      var dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), ux = dy / len, uy = -dx / len;
      dx /= len; dy /= len;
      B._c([(slot || 0) / 16, 0, 0], 0); // Gemeinsame Palette für Stoff und Bündchen
      function vertex(ring, angle) {
        var row = rings[ring], prev = rings[Math.max(0, ring - 1)], next = rings[Math.min(rings.length - 1, ring + 1)];
        var slope = (next[1] - prev[1]) / Math.max(0.0001, next[0] - prev[0]);
        var c = Math.cos(angle), z = Math.sin(angle), radius = row[1], t = row[0];
        B._v(ax + dx * t + ux * radius * c, ay + dy * t + uy * radius * c, radius * z * depth,
             ux * c - dx * slope, uy * c - dy * slope, z / depth, angle / (2 * PI), t / len);
      }
      for (var j = 0; j < rings.length - 1; j++) for (var i = 0; i < 16; i++) {
        var a = i / 16 * 2 * PI, b = (i + 1) / 16 * 2 * PI;
        vertex(j, a); vertex(j + 1, a); vertex(j + 1, b);
        vertex(j, a); vertex(j + 1, b); vertex(j, b);
      }
    }

    group('torso', function (B, sp) {
      sleeve(B, 0, 0.99, 0, 1.51,
        [[-0.01, 0], [0, 0.12], [0.04, 0.148], [0.17, 0.16], [0.32, 0.16],
         [0.415, 0.166], [0.455, 0.152], [0.48, 0.11], [0.505, 0.06], [0.52, 0]], 0.65);
      sp(0, 0.99, 0.005, 0.145, 0.10, 0.105, 1);
      sp(0, 1.51, 0, 0.055, 0.07, 0.055, 2);
      // Stoffkragen statt eines harten Übergangs vom Rumpf zum Hals.
      B.push().t(0, 1.493, 0).rx(PI / 2);
      B.torus(0, 0, 0, 0.057, 0.009, 16, 5, [6 / 16, 0, 0]); B.pop();
    });
    group('head', function (B, sp) {
      sp(0, 1.69, 0, 0.178, 0.205, 0.16, 2);
      [-1, 1].forEach(function (d) {
        sp(d * 0.177, 1.685, 0.0, 0.03, 0.045, 0.03, 2);
        sp(d * 0.099, 1.645, -0.135, 0.027, 0.014, 0.009, 7);
        B.push().t(d * 0.065, 1.753, -0.153).rz(d * -0.12);
        sp(0, 0, 0, 0.030, 0.006, 0.008, 3); B.pop();
      });
      sp(0, 1.66, -0.157, 0.020, 0.026, 0.023, 2);
      // Haar liegt über und hinter der Stirn, nicht als starre Kappe im Gesicht.
      sp(0, 1.835, 0.028, 0.184, 0.09, 0.155, 3);
      sp(0, 1.73, 0.105, 0.16, 0.15, 0.075, 3);
      if (kind === 'worker') {
        // Kurze, seitlich strukturierte Frisur für die dritte Grundform.
        sp(-0.105, 1.81, -0.06, 0.075, 0.046, 0.09, 3);
        sp(0.075, 1.835, -0.055, 0.09, 0.045, 0.085, 3);
      } else if (kind === 'woman') {
        sp(-0.15, 1.72, 0.055, 0.055, 0.13, 0.09, 3);
        sp(0.15, 1.72, 0.055, 0.055, 0.13, 0.09, 3);
        sp(0.035, 1.82, 0.16, 0.08, 0.075, 0.065, 3);
        sp(-0.07, 1.83, -0.09, 0.09, 0.035, 0.065, 3);
      } else {
        B.push().t(-0.045, 1.855, -0.075).rz(-0.23);
        sp(0, 0, 0, 0.13, 0.055, 0.09, 3); B.pop();
      }
    });
    group('eyes', function (B, sp) {
      [-1, 1].forEach(function (d) {
        sp(d * 0.064, 1.706, -0.15, 0.031, 0.036, 0.020, 6);
        sp(d * 0.064, 1.704, -0.171, 0.016, 0.022, 0.009, 8);
        sp(d * 0.064, 1.704, -0.179, 0.010, 0.016, 0.005, 4);
        sp(d * 0.064 - 0.005, 1.716, -0.184, 0.005, 0.006, 0.003, 6);
      });
    });
    [-1, 1].forEach(function (d) {
      var side = d < 0 ? 'N' : 'P';
      group('armU' + side, function (B) {
        var len = Math.hypot(ELX - SHX, ELY - SHY);
        sleeve(B, d * SHX, SHY, d * ELX, ELY,
          [[-0.025, 0], [-0.015, 0.040], [0, 0.053], [0.045, 0.052],
           [0.14, 0.046], [len - 0.025, 0.040], [len + 0.012, 0.036], [len + 0.035, 0]]);
      });
      group('armL' + side, function (B, sp) {
        var wx = d * 0.25, wy = 0.935, len = Math.hypot(wx - d * ELX, wy - ELY);
        sleeve(B, d * ELX, ELY, wx, wy,
          [[-0.028, 0], [-0.014, 0.032], [0, 0.040], [0.05, 0.040],
           [0.13, 0.034], [len - 0.018, 0.029], [len + 0.008, 0.029], [len + 0.018, 0]]);
        // Schmale Stoffbündchen verdecken die Naht am Handgelenk.
        sleeve(B, d * ELX, ELY, wx, wy,
          [[len - 0.030, 0.031], [len - 0.010, 0.031], [len + 0.006, 0.029]], 1, 6);
        // Schmaleres Handgelenk, flache Handfläche, angedeutete Finger und Daumen.
        sp(wx, 0.92, 0, 0.026, 0.030, 0.024, 2);
        sp(wx, 0.883, -0.004, 0.031, 0.037, 0.021, 2);
        for (var i = 0; i < 4; i++) {
          var length = i === 1 || i === 2 ? 0.022 : 0.018;
          sp(wx + (i - 1.5) * 0.013, 0.846, -0.005, 0.0075, length, 0.008, 2);
        }
        B.push().t(wx - d * 0.033, 0.884, 0.002).rz(-d * 0.45);
        sp(0, 0, 0, 0.012, 0.024, 0.013, 2); B.pop();
      });
      group('thigh' + side, function (B, sp) { sp(d * LEGX, 0.73, 0, 0.067, 0.24, 0.075, 1); });
      group('shin' + side, function (B, sp) {
        sp(d * LEGX, 0.28, 0, 0.056, 0.24, 0.06, 1);
        sp(d * LEGX, 0.055, -0.05, 0.069, 0.05, 0.12, 5);
        sp(d * LEGX, 0.027, -0.05, 0.071, 0.017, 0.12, 6);
      });
    });
    return model;
  }

  K.figureKit = function (R) {
    var kit = { kinds: {}, extra: {} };
    ['man', 'woman', 'worker'].forEach(function (kind) {
      var mod = characterModel(R, kind), list = [];
      [-1, 1].forEach(function (d) {
        var sd = d < 0 ? 'N' : 'P';
        ST.reset().t(d * LEGX, HIP, 0).rx(PI / 2).t(-d * LEGX, -HIP, 0);
        list.push(['thigh' + sd, M.copy(new Float32Array(16), ST.m)]);
        ST.t(d * LEGX, KNEE, 0).rx(-PI / 2).t(-d * LEGX, -KNEE, 0);
        list.push(['shin' + sd, M.copy(new Float32Array(16), ST.m)]);
      });
      kit.kinds[kind] = { mod: mod, legs: K.model.bake(R, mod, list) };
    });
    // Zusatzteile in Modellkoordinaten (Blick nach -z)
    var B = new K.Builder();
    // Ein sanftes Lächeln, mit der Mundmatrix auch für Alarm und Schlaf verformt.
    for (var j = 0; j < 9; j++) {
      var x = (j - 4) * 0.005;
      B.sph(x, 1.607 + 0.010 * (x * x / 0.0004), -0.153, 0.004, 0.003, 0.004, 6, 4, '#80504a');
    }
    kit.extra.mouth = R.mesh(B);
    B = new K.Builder();
    [-1, 1].forEach(function (s) { B.torus(s * 0.064, 1.706, -0.19, 0.043, 0.0045, 14, 4, '#1c1f27', 0); });
    B.box(0, 1.709, -0.19, 0.045, 0.004, 0.004, '#1c1f27');
    kit.extra.glasses = R.mesh(B);
    B = new K.Builder();
    B.push().t(0, 1.75, 0).torus(0, 0, 0, 0.205, 0.009, 18, 4, '#20242e', 0, 0, PI);
    B.pop();
    [-1, 1].forEach(function (s) { B.cyl(s * 0.205, 1.72, 0, 0.034, 0.034, 0.035, 10, '#e2503c'); });
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
    // Benachbarte Plätze bekommen unterschiedliche Looks statt fast gleicher Hash-Bits.
    hs = Math.imul(hs ^ (hs >>> 16), 0x45d9f3b) >>> 0;
    hs = (hs ^ (hs >>> 16)) >>> 0;
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
    this.standardPal=new Float32Array(this.pal);this.standardGlasses=this.glasses;this.standardPhones=this.phones;this.rolle=null;
    this.blink = 0;
    this.hx = seat.x; this.hz = seat.z;
    this.mugMesh = null;
    this.state = { s: 0 };
    this._motion = { name: null, last: null, start: 0, from: new Float32Array(15), values: new Float32Array(15), target: new Float32Array(15) };
  }
  Figure.prototype.setPose = function (name) { this.pose = name; };
  // Fachrollen ändern Kleidung und Hilfsmittel, nicht das gemessene Arbeitssignal.
  Figure.prototype.setRole = function (name) {
    var farben={entwicklung:'#739eae',analyse:'#91ad99',kommunikation:'#b698ba',logistik:'#c1a479',leitung:'#6d839c'};
    name=Object.prototype.hasOwnProperty.call(farben,name)?name:'';
    if(this.rolle===name)return;
    this.rolle=name;this.pal.set(this.standardPal);
    this.glasses=this.standardGlasses;this.phones=this.standardPhones;
    if(!name||this.opt.boss)return;
    var c=K.col(farben[name]);this.pal.set([c[0],c[1],c[2],0],0);
    this.glasses=name==='analyse';this.phones=name==='kommunikation';
  };


  /* Ein ruhiger Bewegungsablauf je Haltung. Die Haltung bleibt ein abgeleiteter Messstand,
     keine Behauptung, dass die Sitzung im Hintergrund gerade arbeitet. */
  function poseWerte(v, name, t, still, ph) {
    var tt = still ? 0 : t, bewegung = still ? 0 : 1;
    var lean = 0.08, hx = 0.1, hy = 0, hz = 0, eye = 1, mo = 1, mw = 1;
    var uN = 0.6, aN = -0.2, fN = 1.05, uP = 0.6, aP = -0.2, fP = 1.05, sip = 0;
    switch (name) {
      case 'busy': {
        // Kurze Tippgruppen mit Pausen; beide Hände sind leicht versetzt.
        var cyc = (tt + ph * 1.7) % 7.4;
        var tippt = bewegung * (weich(0.3, 0.8, cyc) - weich(4.4, 5.2, cyc));
        lean = 0.10 + 0.007 * tippt;
        hx = 0.16 + bewegung * (0.015 * sin(0.9 * tt + ph) - 0.025 * (1 - tippt));
        hy = bewegung * (0.04 * sin(0.45 * tt + ph) + 0.025 * (1 - tippt));
        uN = 0.30 + tippt * 0.014 * sin(4.2 * tt + ph); aN = -0.28;
        fN = 1.40 + tippt * (0.034 * sin(7.1 * tt + ph) + 0.012 * sin(11 * tt + ph));
        uP = 0.30 + tippt * 0.012 * sin(3.8 * tt + ph + 1.8); aP = -0.28;
        fP = 1.40 + tippt * (0.030 * sin(6.3 * tt + ph + 2.4) + 0.010 * sin(10.1 * tt + ph));
        break;
      }
      case 'rest': {
        lean = 0.03;
        // Erst ruhen, dann anheben, halten und langsam absetzen; kein Sprung am Zyklusende.
        var kaffee = (tt + ph * 2.3) % 15.6;
        sip = still ? 0 : weich(3.2, 4.6, kaffee) - weich(6.2, 7.9, kaffee);
        hx = 0.05 - 0.14 * sip; hy = bewegung * 0.065 * sin(0.34 * tt + ph) * (1 - sip);
        hz = bewegung * 0.014 * sin(0.49 * tt + ph) * (1 - sip);
        uN = 0.35; aN = -0.25; fN = 1.35;
        uP = mixv(0.35, 0.85, sip); aP = mixv(-0.25, -0.30, sip); fP = mixv(1.35, 2.6, sip);
        break;
      }
      case 'warn':
        lean = 0.05; hx = 0.06 + bewegung * 0.012 * sin(0.55 * tt + ph);
        hz = 0.12 + bewegung * 0.026 * sin(0.7 * tt + ph); hy = bewegung * 0.045 * sin(0.4 * tt + ph);
        uN = 0.35; aN = -0.25; fN = 1.35;
        uP = 1.0; aP = -0.5; fP = 2.6 + bewegung * 0.018 * sin(1.1 * tt + ph); mw = 0.8;
        break;
      case 'alarm':
        lean = 0.01; hx = -0.04; eye = 1.12; mo = 1.4; mw = 1.05;
        uN = 0.4; uP = 2.4 + bewegung * 0.025 * sin(1.3 * tt + ph);
        aN = -0.25; aP = -0.38; fN = 1.3; fP = 0.35;
        break;
      case 'sleep':
        lean = 0.22 + bewegung * 0.008 * sin(1.0 * tt + ph);
        hx = 0.28 + bewegung * 0.008 * sin(0.5 * tt + ph); hz = 0.06; eye = 0.06; mo = 0.5; mw = 0.7;
        uN = 0.38; aN = -0.23; fN = 1.3; uP = 0.38; aP = -0.23; fP = 1.3;
        break;
      default: break;
    }
    // Nur die Oberkörperhaltung atmet; Beine und Sitzposition bleiben fest verankert.
    lean += bewegung * 0.0035 * sin(1.3 * tt + ph);
    var werte = [lean, hx, hy, hz, eye, mo, mw, uN, aN, fN, uP, aP, fP, sip,
      bewegung * 0.005 * sin(0.7 * tt + ph)];
    for (var i = 0; i < werte.length; i++) v[i] = werte[i];
  }

  /* Berechnet Matrizen; Messstand-Wechsel gleiten in die neue Haltung, statt zu springen. */
  Figure.prototype.compute = function (t, still) {
    var s = this.seat, ph = this.ph, name = this.pose, q = this._motion;
    t = Number.isFinite(t) ? t : 0;
    poseWerte(q.target, name, t, still, ph);
    if (still || q.last === null || t < q.last) {
      q.values.set(q.target); q.from.set(q.target); q.name = name; q.start = t - 1;
    } else {
      if (q.name !== name) { q.from.set(q.values); q.start = t; q.name = name; }
      var anteil = weich(0, 0.72, t - q.start);
      for (var i = 0; i < q.values.length; i++) q.values[i] = mixv(q.from[i], q.target[i], anteil);
    }
    q.last = t;
    var v = q.values, lean = v[0], hx = v[1], hy = v[2], hz = v[3], eye = v[4], mo = v[5], mw = v[6];
    var uN = v[7], aN = v[8], fN = v[9], uP = v[10], aP = v[11], fP = v[12], sip = v[13], twist = v[14], bounce = 0;
    // Kurzes weiches Schliessen und Öffnen statt eines harten Ein-Bild-Blinzelns.
    var blinkT = (t + ph * 3) % (5.4 + ph * 0.2);
    var blink = still ? 1 : 1 - 0.94 * (weich(0, 0.085, blinkT) - weich(0.11, 0.24, blinkT));
    eye *= blink;
    var S = ST, m = this.m;
    // Wurzel: Platz, Blickrichtung (Modell schaut nach -z, die Figur nach +z), Hüfte auf Sitzhöhe
    S.reset(); S.t(s.x, 0, s.z).ry(s.h + PI).t(0, -DY + bounce, 0);
    M.copy(this.rootM, S.m);
    // Rumpf: dreht um die Hüfte (Vorneigen = -z, also negativer Winkel)
    S.push(); S.t(0, HIP, 0).rx(-lean).ry(twist).t(0, -HIP, 0); M.copy(m.torso, S.m);
    M.copy(m.tie, S.m);
    //   Kopf
    S.push(); S.t(0, NECK, 0).rx(-hx).ry(hy).rz(hz).t(0, -NECK, 0); M.copy(m.head, S.m); M.copy(m.extraHead, S.m);
    S.push(); S.t(0, EYEY, 0).s(1, eye, 1).t(0, -EYEY, 0); M.copy(m.eyes, S.m); S.pop();
    S.push(); S.t(0, 1.612, -0.153).s(mw, mo, 1).t(0, -1.612, 0.153); M.copy(m.mouth, S.m); S.pop();
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
    if (this.glasses) R.draw(ex.glasses, m.extraHead);
    if (this.phones) R.draw(ex.phones, m.extraHead);
    if (this.opt.boss) R.draw(ex.tie, m.tie);
    if (this.pose === 'rest' && this.kit.mugMesh) R.draw(this.kit.mugMesh, m.mug);
  };

  K.Figure = Figure;
  K.figureLook = { HAUT: HAUT, HAAR: HAAR, HEMD: HEMD };
})(window.KB3D);
