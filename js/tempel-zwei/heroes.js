/* Tempel der Zwei: eigene Steinwaechter, THREE r128, ohne Loader/Texturen. */
(function (root) {
  "use strict";

  function create(THREE, opts) {
    opts = opts || {};
    var water = !!opts.water;
    var accent =
      opts.color === undefined ? (water ? 0x48dcf0 : 0xffa43d) : opts.color;
    var p = water
      ? {
          stone: 0xd1e0d9,
          light: 0xf3eee0,
          shade: 0x66858c,
          trim: 0x63a9b3,
          joint: 0x263e4b,
          groove: 0x365e6d,
          crest: 0x369bb5,
          glow: 0x8cfff4,
        }
      : {
          stone: 0xb96639,
          light: 0xe3a15b,
          shade: 0x774735,
          trim: 0xd68d44,
          joint: 0x403337,
          groove: 0x613a2b,
          crest: 0xe5792c,
          glow: 0xffe2a0,
        };
    var g = new THREE.Group();
    g.name = water ? "Aqua" : "Ember";
    var rig = new THREE.Group();
    rig.name = "guardian-rig";
    g.add(rig);
    var material = new THREE.MeshLambertMaterial({ vertexColors: true });
    var glowMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      toneMapped: false,
    });
    var matrix = new THREE.Matrix4(),
      quaternion = new THREE.Quaternion();
    var position = new THREE.Vector3(),
      scale = new THREE.Vector3();
    var euler = new THREE.Euler();

    // Ein Buffer pro Koerperteil: keine Materialgruppen und keine Extrusions-Drawcalls.
    function batch() {
      return { positions: [], normals: [], colors: [] };
    }
    function add(b, geometry, color, x, y, z, sx, sy, sz, rx, ry, rz) {
      position.set(x || 0, y || 0, z || 0);
      scale.set(
        sx === undefined ? 1 : sx,
        sy === undefined ? 1 : sy,
        sz === undefined ? 1 : sz,
      );
      euler.set(rx || 0, ry || 0, rz || 0);
      quaternion.setFromEuler(euler);
      matrix.compose(position, quaternion, scale);
      geometry.applyMatrix4(matrix);
      var flat = geometry.index ? geometry.toNonIndexed() : geometry;
      var v = flat.attributes.position,
        n = flat.attributes.normal;
      var c = new THREE.Color(color);
      for (var i = 0; i < v.count; i++) {
        b.positions.push(v.getX(i), v.getY(i), v.getZ(i));
        b.normals.push(n.getX(i), n.getY(i), n.getZ(i));
        b.colors.push(c.r, c.g, c.b);
      }
      if (flat !== geometry) flat.dispose();
      geometry.dispose();
    }
    function finish(b, parent, mat, name) {
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(b.positions, 3),
      );
      geometry.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(b.normals, 3),
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(b.colors, 3),
      );
      geometry.computeBoundingSphere();
      var mesh = new THREE.Mesh(geometry, mat || material);
      mesh.name = name;
      parent.add(mesh);
      return mesh;
    }
    // 108 Dreiecke; gemeinsame analytische Ecknormalen statt harter Wuerfelkanten.
    function rounded(radius) {
      var geo = new THREE.BoxGeometry(1, 1, 1, 3, 3, 3);
      var a = geo.attributes.position,
        n = geo.attributes.normal,
        core = 0.5 - radius;
      for (var i = 0; i < a.count; i++) {
        var x = a.getX(i),
          y = a.getY(i),
          z = a.getZ(i);
        x = Math.abs(x) < 0.49 ? Math.sign(x) * core : x;
        y = Math.abs(y) < 0.49 ? Math.sign(y) * core : y;
        z = Math.abs(z) < 0.49 ? Math.sign(z) * core : z;
        var cx = Math.max(-core, Math.min(core, x));
        var cy = Math.max(-core, Math.min(core, y));
        var cz = Math.max(-core, Math.min(core, z));
        var dx = x - cx,
          dy = y - cy,
          dz = z - cz;
        var length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        a.setXYZ(
          i,
          cx + (radius * dx) / length,
          cy + (radius * dy) / length,
          cz + (radius * dz) / length,
        );
        n.setXYZ(i, dx / length, dy / length, dz / length);
      }
      return geo;
    }
    function stone(b, c, x, y, z, w, h, d, r, tilt) {
      add(b, rounded(r || 0.18), c, x, y, z, w, h, d, 0, 0, tilt || 0);
    }
    function ball(b, c, x, y, z, w, h, d) {
      add(b, new THREE.SphereGeometry(1, 8, 4), c, x, y, z, w, h, d);
    }
    function disk(b, c, x, y, z, radius, depth) {
      add(
        b,
        new THREE.CylinderGeometry(radius, radius, depth, 10),
        c,
        x,
        y,
        z,
        1,
        1,
        1,
        Math.PI / 2,
      );
    }
    function line(b, points, c, radius, segments) {
      var curve = new THREE.CatmullRomCurve3(
        points.map(function (v) {
          return new THREE.Vector3(v[0], v[1], v[2]);
        }),
      );
      add(
        b,
        new THREE.TubeGeometry(curve, segments || 7, radius || 0.016, 3, false),
        c,
      );
    }
    function emblem(b, points, c, depth, x, y, z, size) {
      var shape = new THREE.Shape();
      shape.moveTo(points[0][0], points[0][1]);
      for (var i = 1; i < points.length; i++)
        shape.lineTo(points[i][0], points[i][1]);
      shape.closePath();
      add(
        b,
        new THREE.ExtrudeGeometry(shape, {
          depth: depth,
          bevelEnabled: true,
          bevelSegments: 1,
          bevelSize: 0.012,
          bevelThickness: 0.012,
          steps: 1,
          curveSegments: 3,
        }),
        c,
        x,
        y,
        z,
        size || 1,
        size || 1,
        1,
      );
    }

    var body = batch(),
      light = batch();
    stone(body, p.stone, 0, 0.85, 0, 0.73, 0.58, 0.49, 0.23);
    stone(body, p.shade, 0, 0.57, 0, 0.57, 0.16, 0.42);
    stone(body, p.trim, 0, 0.62, 0.04, 0.67, 0.13, 0.46);
    add(
      body,
      new THREE.CylinderGeometry(0.16, 0.19, 0.17, 8),
      p.joint,
      0,
      1.14,
      0,
    );
    // Versenkte Brustlinse, eine Element-Rune, dunkle Fugen statt aufgeklebter Textur.
    disk(body, p.trim, 0, 0.86, 0.253, 0.245, 0.055);
    disk(body, p.joint, 0, 0.86, 0.289, 0.195, 0.03);
    var flame = [
      [-0.1, -0.12],
      [-0.14, -0.02],
      [-0.06, 0.08],
      [-0.04, -0.01],
      [0.02, 0.17],
      [0.07, 0.08],
      [0.06, 0.01],
      [0.12, 0.07],
      [0.14, -0.04],
      [0.08, -0.12],
      [0, -0.15],
    ];
    var drop = [
      [0, 0.17],
      [-0.09, 0.04],
      [-0.13, -0.045],
      [-0.09, -0.12],
      [0, -0.15],
      [0.09, -0.12],
      [0.13, -0.045],
      [0.09, 0.04],
    ];
    emblem(light, water ? drop : flame, accent, 0.018, 0, 0.86, 0.314);
    line(
      light,
      [
        [-0.035, 0.81, 0.351],
        [-0.05, 0.86, 0.351],
        [-0.02, 0.91, 0.351],
      ],
      p.glow,
      0.012,
      4,
    );
    stone(body, p.light, 0, 0.61, 0.29, 0.14, 0.1, 0.06, 0.2);

    // Uebergrosser Helm und schwarzes, nach +Z blickendes Visier.
    stone(body, p.stone, 0, 1.405, -0.015, 0.97, 0.66, 0.72, 0.28);
    stone(body, p.trim, 0, 1.405, 0.3, 0.84, 0.49, 0.15, 0.29);
    stone(body, 0x101f28, 0, 1.425, 0.378, 0.735, 0.385, 0.075, 0.3);
    stone(body, p.light, 0, 1.165, 0.29, 0.64, 0.13, 0.22, 0.17);
    for (var side = -1; side <= 1; side += 2) {
      // Froehliche Augenboegen bleiben auch in der schraegen Spielkamera lesbar.
      var eye = [];
      for (var k = 0; k <= 6; k++) {
        var angle = (Math.PI * k) / 6;
        eye.push([
          side * 0.162 + Math.cos(angle) * 0.071,
          1.4 + Math.sin(angle) * 0.078,
          0.422,
        ]);
      }
      line(light, eye, p.glow, 0.026, 6);
      disk(body, p.shade, side * 0.443, 1.39, 0.02, 0.155, 0.15);
      stone(
        body,
        p.light,
        side * 0.4,
        1.53,
        0.17,
        0.115,
        0.2,
        0.24,
        0.18,
        -side * 0.17,
      );
      // Kurze Steinritzungen an Stirn und Kinn.
      line(
        body,
        [
          [side * 0.28, 1.655, 0.23],
          [side * 0.3, 1.61, 0.29],
          [side * 0.33, 1.6, 0.31],
        ],
        p.groove,
        0.009,
        3,
      );
    }

    if (water) {
      // Breite, eingerollte Wellenkrone; asymmetrisch statt zweiter Feuerflamme.
      var wave = new THREE.Shape();
      wave.moveTo(-0.21, 1.69);
      wave.bezierCurveTo(-0.27, 1.85, -0.11, 1.988, 0.04, 1.988);
      wave.bezierCurveTo(0.24, 1.988, 0.24, 1.79, 0.36, 1.82);
      wave.bezierCurveTo(0.46, 1.84, 0.45, 1.92, 0.42, 1.93);
      wave.bezierCurveTo(0.54, 1.89, 0.48, 1.7, 0.32, 1.73);
      wave.bezierCurveTo(0.13, 1.75, 0.16, 1.91, 0.04, 1.91);
      wave.bezierCurveTo(-0.07, 1.92, -0.12, 1.8, -0.05, 1.7);
      wave.closePath();
      add(
        body,
        new THREE.ExtrudeGeometry(wave, {
          depth: 0.13,
          bevelEnabled: true,
          bevelSegments: 1,
          bevelSize: 0.012,
          bevelThickness: 0.012,
          steps: 1,
          curveSegments: 3,
        }),
        p.crest,
        0,
        0,
        -0.1,
      );
      line(
        light,
        [
          [-0.17, 1.74, 0.045],
          [-0.15, 1.86, 0.045],
          [-0.04, 1.943, 0.045],
          [0.075, 1.94, 0.045],
          [0.18, 1.81, 0.045],
          [0.31, 1.77, 0.045],
        ],
        accent,
        0.016,
        10,
      );
      for (var s = -1; s <= 1; s += 2) {
        emblem(
          body,
          [
            [s * 0.42, 1.32],
            [s * 0.64, 1.42],
            [s * 0.58, 1.6],
            [s * 0.49, 1.49],
          ],
          p.trim,
          0.11,
          0,
          0,
          -0.16,
        );
      }
    } else {
      emblem(
        body,
        [
          [-0.23, 1.69],
          [-0.28, 1.81],
          [-0.11, 1.9],
          [-0.06, 1.988],
          [0.08, 1.93],
          [0.23, 1.84],
          [0.19, 1.71],
        ],
        p.crest,
        0.2,
        0,
        0,
        -0.15,
      );
      // Kupfermaeander in der Flammenkrone, passend zu den Tempel-Spiralen.
      line(
        body,
        [
          [-0.14, 1.77, 0.067],
          [-0.16, 1.83, 0.067],
          [-0.03, 1.89, 0.067],
          [0.09, 1.83, 0.067],
          [0.06, 1.76, 0.067],
          [-0.025, 1.79, 0.067],
        ],
        p.groove,
        0.021,
        7,
      );
      line(
        light,
        [
          [-0.075, 1.81, 0.074],
          [-0.04, 1.85, 0.074],
          [0.025, 1.82, 0.074],
        ],
        accent,
        0.016,
        3,
      );
    }
    finish(body, rig, material, "stone-helmet-torso");
    finish(light, rig, glowMaterial, "element-eyes-core");

    var arms = [],
      legs = [];
    for (var sign = -1; sign <= 1; sign += 2) {
      var arm = new THREE.Group();
      arm.position.set(sign * 0.46, 1.015, 0);
      rig.add(arm);
      var ab = batch();
      ball(ab, p.joint, 0, 0, 0, 0.155, 0.155, 0.15);
      stone(
        ab,
        p.stone,
        sign * 0.085,
        -0.095,
        0,
        0.32,
        0.3,
        0.36,
        0.24,
        sign * 0.23,
      );
      stone(
        ab,
        p.shade,
        sign * 0.145,
        -0.3,
        0.065,
        0.33,
        0.32,
        0.37,
        0.23,
        sign * 0.13,
      );
      // Gravur auf den Faeusten statt separater Finger/Materialien.
      line(
        ab,
        [
          [sign * 0.23, -0.36, 0.254],
          [sign * 0.08, -0.36, 0.254],
          [sign * 0.08, -0.22, 0.254],
          [sign * 0.2, -0.22, 0.254],
          [sign * 0.2, -0.29, 0.254],
          [sign * 0.145, -0.29, 0.254],
        ],
        p.trim,
        0.021,
        7,
      );
      finish(ab, arm, material, sign < 0 ? "arm-left" : "arm-right");
      arms.push(arm);
      var leg = new THREE.Group();
      leg.position.set(sign * 0.235, 0.53, 0);
      g.add(leg);
      var lb = batch();
      ball(lb, p.joint, 0, -0.01, 0, 0.14, 0.15, 0.13);
      stone(lb, p.stone, 0, -0.19, 0, 0.29, 0.29, 0.32, 0.2);
      stone(lb, p.shade, sign * 0.018, -0.41, 0.075, 0.35, 0.24, 0.49, 0.23);
      line(
        lb,
        [
          [-0.07, -0.47, 0.321],
          [-0.07, -0.38, 0.321],
        ],
        p.groove,
        0.01,
        1,
      );
      line(
        lb,
        [
          [0.07, -0.47, 0.321],
          [0.07, -0.38, 0.321],
        ],
        p.groove,
        0.01,
        1,
      );
      finish(lb, leg, material, sign < 0 ? "leg-left" : "leg-right");
      legs.push(leg);
    }

    // Bodenmarker haben eigene Materialien und sind kein Teil der bewegten Rig.
    var shadowGeo = new THREE.CircleGeometry(0.64, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    var shadow = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({
        color: 0x07151b,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    shadow.name = "ground-shadow";
    shadow.position.set(0, 0.018, 0);
    shadow.scale.set(1.06, 1, 0.79);
    g.add(shadow);
    var ringGeo = new THREE.RingGeometry(0.53, 0.62, 32);
    ringGeo.rotateX(-Math.PI / 2);
    var ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    ring.name = "selection-ping-ring";
    ring.position.y = 0.028;
    g.add(ring);
    g.userData.ring = ring;
    g.userData.templeHero = {
      rig: rig,
      arms: arms,
      legs: legs,
      stride: 0,
      phase: 0,
      water: water,
    };
    return g;
  }

  // Zeit/dt in Sekunden; moving ist Boolean oder Geschwindigkeit 0..1.
  // Weltposition, Blickrichtung, Ring-Opacity und Bodenschatten gehoeren dem Spiel.
  function animate(group, time, dt, moving, reduced) {
    var h = group && group.userData.templeHero;
    if (!h) return;
    if (reduced) {
      h.stride = 0;
      h.phase = 0;
      h.rig.position.y = 0;
      h.rig.rotation.set(0, 0, 0);
      for (var r = 0; r < 2; r++) {
        h.arms[r].rotation.set(0, 0, 0);
        h.legs[r].rotation.set(0, 0, 0);
        h.legs[r].position.y = 0.53;
      }
      return;
    }
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
    time = Number.isFinite(time) ? time : 0;
    var target =
      typeof moving === "number"
        ? Math.max(0, Math.min(1, moving))
        : moving
          ? 1
          : 0;
    h.stride += (target - h.stride) * (1 - Math.exp(-dt * 14));
    h.phase = (h.phase + dt * 10 * (0.45 + 0.55 * h.stride)) % (Math.PI * 2);
    var step = Math.sin(h.phase) * h.stride;
    var breath = Math.sin(time * 2.1 + (h.water ? 0.8 : 0));
    h.rig.rotation.z = step * 0.022;
    h.rig.rotation.x = h.stride * 0.025;
    h.rig.position.y = Math.abs(step) * 0.016;
    for (var i = 0; i < 2; i++) {
      var side = i === 0 ? -1 : 1;
      h.arms[i].rotation.x = side * step * 0.23;
      h.arms[i].rotation.z = side * (0.035 + breath * 0.012) * (1 - h.stride);
      var angle = -side * step * 0.25;
      h.legs[i].rotation.x = angle;
      // Stuetzhoehe der abgerundeten Sohle: Standfuss am Boden, anderer Fuss hebt ab.
      var c = Math.cos(angle),
        s = Math.sin(angle);
      var hy = 0.24 * c,
        dz = 0.49 * s;
      h.legs[i].position.y =
        0.41 * c +
        0.075 * s +
        0.27 * (Math.abs(hy) + Math.abs(dz)) +
        0.23 * Math.sqrt(hy * hy + dz * dz) +
        Math.max(0, side * step) * 0.038;
    }
  }

  root.TempleHeroes = { create: create, animate: animate };
})(window);
