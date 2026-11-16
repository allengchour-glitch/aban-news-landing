/* Tempel-Requisiten. Nur Darstellung; Kollisionen und Rätselzustände bleiben beim Spiel. */
(function () {
  "use strict";
  window.TempleProps = function (T, scene, p) {
    var stone = 0x394750,
      edge = 0x75828a,
      copper = 0xb58a53,
      dark = 0x17282c;
    function batch(build) {
      var parts = [];
      function add(geo, col, x, y, z, sx, sy, sz, rx, ry, rz) {
        var g = geo.index ? geo.toNonIndexed() : geo.clone();
        var m = new T.Matrix4().compose(
          new T.Vector3(x || 0, y || 0, z || 0),
          new T.Quaternion().setFromEuler(
            new T.Euler(rx || 0, ry || 0, rz || 0),
          ),
          new T.Vector3(sx || 1, sy || 1, sz || 1),
        );
        g.applyMatrix4(m);
        var c = new T.Color(col).convertSRGBToLinear(),
          a = new Float32Array(g.attributes.position.count * 3);
        for (var i = 0; i < a.length; i += 3) {
          a[i] = c.r;
          a[i + 1] = c.g;
          a[i + 2] = c.b;
        }
        g.setAttribute("color", new T.BufferAttribute(a, 3));
        parts.push(g);
        return g;
      }
      var api = {
        add: add,
        box: function (c, x, y, z, w, h, d, rx, ry, rz) {
          return add(
            new T.BoxGeometry(w, h, d),
            c,
            x,
            y,
            z,
            1,
            1,
            1,
            rx,
            ry,
            rz,
          );
        },
        cyl: function (c, x, y, z, rt, rb, h, n) {
          return add(new T.CylinderGeometry(rt, rb, h, n || 8), c, x, y, z);
        },
        torus: function (c, x, y, z, r, t, rx, ry) {
          return add(
            new T.TorusGeometry(r, t, 4, 16),
            c,
            x,
            y,
            z,
            1,
            1,
            1,
            rx,
            ry,
          );
        },
        link: function (c, a, b, r) {
          var v = new T.Vector3().subVectors(b, a),
            g = new T.CylinderGeometry(r * 0.65, r, v.length(), 6);
          g.applyMatrix4(
            new T.Matrix4().makeRotationFromQuaternion(
              new T.Quaternion().setFromUnitVectors(
                new T.Vector3(0, 1, 0),
                v.clone().normalize(),
              ),
            ),
          );
          var mid = a.clone().add(b).multiplyScalar(0.5);
          add(g, c, mid.x, mid.y, mid.z);
        },
      };
      build(api);
      var merged = new T.BufferGeometry();
      ["position", "normal", "color"].forEach(function (key) {
        var len = parts.reduce(function (n, g) {
            return n + g.attributes[key].array.length;
          }, 0),
          arr = new Float32Array(len),
          off = 0;
        parts.forEach(function (g) {
          arr.set(g.attributes[key].array, off);
          off += g.attributes[key].array.length;
        });
        merged.setAttribute(key, new T.BufferAttribute(arr, 3));
      });
      parts.forEach(function (g) {
        g.dispose();
      });
      merged.computeBoundingSphere();
      return merged;
    }
    function ornament(root, fn) {
      var mesh = new T.Mesh(
        batch(fn),
        new T.MeshLambertMaterial({ vertexColors: true }),
      );
      root.add(mesh);
      return mesh;
    }
    function replace(root, fn) {
      root.geometry.dispose();
      root.geometry = batch(fn);
      root.material = new T.MeshLambertMaterial({ vertexColors: true });
    }
    p.gates.forEach(function (g, index) {
      replace(g, function (b) {
        b.box(stone, 0, 0, 0, 18.9, 2.8, 0.85);
        b.box(dark, 0, 0.04, 0.45, 18.4, 2.35, 0.06);
        [-1, 1].forEach(function (s) {
          b.box(copper, 0, s * 1.25, 0.49, 19, 0.12, 0.08);
        });
        for (var i = -4; i <= 4; i++) {
          var x = i * 2.05;
          b.box(edge, x, 0, 0.51, 1.8, 2.1, 0.09);
          b.box(stone, x, 0.04, 0.58, 1.58, 1.85, 0.08);
          b.torus(copper, x, 0.15, 0.65, 0.48, 0.035, 0, 0);
          b.box(copper, x, -0.03, 0.67, 0.42, 0.42, 0.055, 0, 0, Math.PI / 4);
          b.box(dark, x, 0, 0.71, 0.12, 0.68, 0.04);
        }
        b.box(copper, 0, 0, 0.73, 0.14, 2.7, 0.09);
      });
      g.userData.art = index;
    });
    [p.plateA, p.plateB].forEach(function (o, i) {
      o.geometry.dispose();
      o.geometry = new T.CylinderGeometry(1.2, 1.25, 0.12, 32);
      o.material.color.setHex(i ? 0x397c98 : 0x9b5b39);
      ornament(o, function (b) {
        b.cyl(stone, 0, -0.05, 0, 1.39, 1.5, 0.16, 12);
        b.torus(copper, 0, 0.035, 0, 1.28, 0.045, Math.PI / 2);
        for (var k = 0; k < 8; k++) {
          var a = (k * Math.PI) / 4;
          b.box(
            copper,
            Math.sin(a) * 1.31,
            0.055,
            Math.cos(a) * 1.31,
            0.09,
            0.035,
            0.19,
            0,
            a,
          );
        }
      });
    });
    replace(p.vines, function (b) {
      for (var i = 0; i < 7; i++) {
        var x = -1.4 + i * 0.45;
        var a = new T.Vector3(x, -1.3, 0),
          v = new T.Vector3(x + Math.sin(i) * 0.25, 1.15, 0.1);
        b.link(i % 2 ? 0x41684a : 0x274e3c, a, v, 0.1);
        for (var j = 0; j < 4; j++) {
          var side = j % 2 ? 1 : -1,
            yy = -0.9 + j * 0.55;
          b.add(
            new T.SphereGeometry(1, 6, 4),
            0x547d4c,
            x + side * 0.24,
            yy,
            0.08,
            0.34,
            0.14,
            0.18,
            0,
            0,
            side * 0.55,
          );
        }
      }
    });
    replace(p.plantPot, function (b) {
      b.cyl(0x815139, 0, 0, 0, 0.84, 0.56, 0.8, 12);
      b.cyl(copper, 0, 0.34, 0, 0.89, 0.89, 0.12, 12);
      b.cyl(0x233332, 0, 0.41, 0, 0.74, 0.74, 0.035, 12);
      b.torus(0xa5704d, 0, -0.2, 0, 0.64, 0.035, Math.PI / 2);
    });
    replace(p.plant, function (b) {
      b.cyl(0x426549, 0, 0, 0, 0.055, 0.08, 0.65, 7);
      for (var i = 0; i < 7; i++) {
        var a = i * 2.4;
        b.add(
          new T.SphereGeometry(1, 7, 4),
          i % 2 ? 0x80aa5a : 0x426c4a,
          Math.sin(a) * 0.21,
          -0.17 + i * 0.06,
          Math.cos(a) * 0.21,
          0.32,
          0.07,
          0.16,
          0,
          a,
          -0.3,
        );
      }
    });
    [p.lever, p.lever2].forEach(function (o) {
      replace(o, function (b) {
        b.cyl(copper, 0, -0.25, 0, 0.075, 0.1, 1.35, 8);
        b.cyl(stone, 0, -0.85, 0, 0.32, 0.38, 0.2, 8);
        b.add(new T.IcosahedronGeometry(0.23, 1), 0x8cdaca, 0, 0.47, 0);
        b.torus(copper, 0, 0.47, 0, 0.26, 0.045, Math.PI / 2);
      });
    });
    [p.syncA, p.syncB].forEach(function (o, i) {
      o.geometry.dispose();
      o.geometry = new T.CylinderGeometry(0.56, 0.74, 1.8, 8);
      o.material.color.setHex(i ? 0x347e96 : 0x9c6541);
      ornament(o, function (b) {
        b.cyl(stone, 0, -0.78, 0, 0.94, 1.03, 0.24, 8);
        b.cyl(copper, 0, 0.83, 0, 0.75, 0.68, 0.16, 8);
        // Frontzeichen vor die nach unten breiter werdende Säule setzen.
        b.torus(copper, 0, 0.3, 0.71, 0.34, 0.045, 0);
        b.box(dark, 0, 0.3, 0.58, 0.55, 0.65, 0.28);
        b.box(
          i ? 0x8ae9f3 : 0xffb86a,
          0,
          0.3,
          0.74,
          0.26,
          0.34,
          0.05,
          0,
          0,
          Math.PI / 4,
        );
        for (var k = 0; k < 4; k++) {
          var a = (k * Math.PI) / 2;
          b.box(
            copper,
            Math.sin(a) * 0.57,
            -0.05,
            Math.cos(a) * 0.57,
            0.07,
            1.2,
            0.07,
          );
        }
      });
    });
    p.shads.forEach(function (o) {
      o.geometry.dispose();
      o.geometry = new T.CylinderGeometry(1.36, 1.42, 0.12, 32);
      o.material.color.setHex(0x574475);
      ornament(o, function (b) {
        b.cyl(stone, 0, -0.05, 0, 1.49, 1.55, 0.13, 12);
        b.torus(copper, 0, 0.05, 0, 1.26, 0.03, Math.PI / 2);
        for (var i = 0; i < 3; i++)
          b.torus(0xb9a6dd, 0, 0.07, 0, 0.24 + i * 0.3, 0.018, Math.PI / 2);
      });
    });
    var remove = [];
    p.guard.children.forEach(function (c) {
      if (c !== p.pivot) remove.push(c);
    });
    remove.forEach(function (c) {
      p.guard.remove(c);
    });
    ornament(p.guard, function (b) {
      b.cyl(stone, 0, 0.25, 0, 1.7, 2.1, 0.5, 12);
      b.cyl(copper, 0, 0.55, 0, 1.45, 1.7, 0.14, 12);
      b.cyl(dark, 0, 2.1, 0, 0.78, 1.1, 3.1, 10);
      for (var k = 0; k < 6; k++) {
        var a = (k * Math.PI) / 3;
        b.box(
          edge,
          Math.sin(a) * 0.86,
          2,
          Math.cos(a) * 0.86,
          0.32,
          2.7,
          0.32,
          0,
          a,
        );
        b.cyl(copper, 0, 1 + k * 0.55, 0, 1.02, 1.02, 0.1, 12);
      }
      b.cyl(stone, 0, 3.8, 0, 1.36, 1.04, 0.6, 12);
      b.cyl(edge, 0, 4.35, 0, 1.33, 1.33, 0.8, 12);
      b.cyl(copper, 0, 4.83, 0, 1.5, 1.33, 0.16, 12);
      for (var i = 0; i < 8; i++) {
        var a = (i * Math.PI) / 4;
        b.add(
          new T.ConeGeometry(0.2, 0.56, 4),
          i % 2 ? edge : copper,
          Math.sin(a) * 1.08,
          5.13,
          Math.cos(a) * 1.08,
        );
      }
    });
    p.eye.geometry.dispose();
    p.eye.geometry = new T.SphereGeometry(0.53, 16, 10);
    p.eye.scale.set(1, 0.86, 0.42);
    p.eye.position.z = 1.23;
    p.lid.geometry.dispose();
    p.lid.geometry = new T.TorusGeometry(0.58, 0.11, 6, 24);
    p.lid.position.z = 1.29;
    p.lid.material.color.setHex(copper);
    ornament(p.pivot, function (b) {
      b.add(
        new T.SphereGeometry(0.19, 12, 8),
        dark,
        0,
        0,
        1.48,
        0.65,
        1.9,
        0.3,
      );
      b.torus(0xf1ce87, 0, 0, 1.43, 0.4, 0.035, 0);
      for (var i = 0; i < 8; i++) {
        var a = (i * Math.PI) / 4;
        b.box(
          copper,
          Math.sin(a) * 0.77,
          Math.cos(a) * 0.77,
          1.09,
          0.13,
          0.34,
          0.2,
          0,
          0,
          -a,
        );
      }
    });
    p.beam.geometry.dispose();
    p.beam.geometry = new T.CylinderGeometry(0.08, 0.3, 14, 8, 1, true);
    p.beam.rotation.x = Math.PI / 2;
    p.beam.material.opacity = 0.25;
    p.beamFloor.position.y = -4.3;
    var beamCanvas = document.createElement("canvas");
    beamCanvas.width = 64;
    beamCanvas.height = 256;
    var ctx = beamCanvas.getContext("2d"),
      fade = ctx.createLinearGradient(0, 0, 64, 0);
    fade.addColorStop(0, "rgba(255,255,255,0)");
    fade.addColorStop(0.45, "rgba(255,255,255,.85)");
    fade.addColorStop(0.55, "rgba(255,255,255,.85)");
    fade.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 64, 256);
    p.beamFloor.material.map = new T.CanvasTexture(beamCanvas);
    p.beamFloor.material.needsUpdate = true;
    [p.altF, p.altW].forEach(function (o) {
      o.geometry.dispose();
      o.geometry = new T.CylinderGeometry(0.78, 1, 1.7, 8);
      ornament(o, function (b) {
        b.cyl(stone, 0, -0.68, 0, 1.02, 1.15, 0.25, 8);
        for (var i = 0; i < 4; i++) {
          var a = (i * Math.PI) / 2;
          b.box(
            copper,
            Math.sin(a) * 0.73,
            0,
            Math.cos(a) * 0.73,
            0.1,
            1.3,
            0.1,
          );
        }
      });
    });
    replace(p.altFlame, function (b) {
      b.add(new T.OctahedronGeometry(1), 0xff9b40, 0, 0, 0, 0.48, 0.73, 0.4);
      b.add(
        new T.OctahedronGeometry(1),
        0xffd28a,
        -0.15,
        -0.12,
        0.19,
        0.22,
        0.46,
        0.22,
      );
      b.add(
        new T.OctahedronGeometry(1),
        0xff7033,
        0.25,
        0.1,
        -0.06,
        0.2,
        0.45,
        0.2,
      );
    });
    p.altFlame.material.dispose();
    p.altFlame.material = new T.MeshBasicMaterial({ vertexColors: true });
    var ripple = new T.Mesh(
      new T.RingGeometry(0.4, 0.47, 24),
      new T.MeshBasicMaterial({
        color: 0xc5f5ff,
        transparent: true,
        opacity: 0.65,
        side: T.DoubleSide,
      }),
    );
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = 0.13;
    p.altWater.add(ripple);
    p.podium.geometry.dispose();
    p.podium.geometry = new T.CylinderGeometry(2.6, 2.8, 0.1, 32);
    p.podium.position.y = 0.015;
    p.podium.material.color.setHex(0x667b76);
    p.podium.material.emissiveIntensity = 0.08;
    ornament(p.podium, function (b) {
      b.torus(copper, 0, 0.06, 0, 2.3, 0.055, Math.PI / 2);
      b.torus(copper, 0, 0.06, 0, 1.8, 0.035, Math.PI / 2);
    });
    p.torches.forEach(function (tc) {
      var st = tc.fl.parent.children[0];
      replace(st, function (b) {
        b.cyl(copper, 0, 0, 0, 0.12, 0.24, 0.95, 8);
        b.cyl(stone, 0, -0.4, 0, 0.3, 0.4, 0.18, 8);
        b.cyl(copper, 0, 0.46, 0, 0.37, 0.16, 0.25, 8);
      });
      tc.fl.geometry.dispose();
      tc.fl.geometry = new T.IcosahedronGeometry(0.23, 1);
      tc.fl.geometry.scale(1, 1.8, 1);
    });
  };
})();
