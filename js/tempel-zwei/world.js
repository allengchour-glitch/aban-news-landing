/* Tempel der Zwei: statische Kulisse, ohne Lichtquellen oder Kollisionen. */
(function () {
  "use strict";
  window.TempleWorld = {
    build: function (T, scene) {
      var root = new T.Group();
      root.name = "Tempel · Basalt und Kupfer";
      var seed = 72041;
      function rand() {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 4294967296;
      }
      function canvas(w, h) {
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
      }
      function texture(c) {
        var t = new T.CanvasTexture(c);
        t.encoding = T.sRGBEncoding;
        t.anisotropy = 2;
        return t;
      }

      // Ein zusammenhängender Plattenplan: keine periodische Kieseltextur.
      function floorMap() {
        var c = canvas(1024, 4096),
          q = c.getContext("2d"),
          sx = c.width / 20,
          sz = c.height / 102;
        q.fillStyle = "#252e32";
        q.fillRect(0, 0, c.width, c.height);
        var row = 0;
        for (var y = 0; y < c.height; y += 124) {
          var x = row++ % 2 ? -100 : -12;
          while (x < c.width) {
            var w = 125 + rand() * 105,
              h = 120;
            var a = 60 + Math.floor(rand() * 22),
              b = a + 5;
            q.fillStyle = "rgb(" + b + "," + (a + 9) + "," + (a + 11) + ")";
            q.beginPath();
            q.moveTo(x + 5, y + 3);
            q.lineTo(x + w - 9, y + 3);
            q.lineTo(x + w - 3, y + 9);
            q.lineTo(x + w - 3, y + h - 8);
            q.lineTo(x + w - 10, y + h - 2);
            q.lineTo(x + 4, y + h - 2);
            q.closePath();
            q.fill();
            q.strokeStyle = "rgba(194,184,156,.24)";
            q.lineWidth = 2;
            q.stroke();
            q.fillStyle = "rgba(15,23,29,.22)";
            q.fillRect(x + 8, y + h - 6, w - 16, 3);
            for (var n = 0; n < 24; n++) {
              q.fillStyle =
                rand() > 0.5 ? "rgba(220,203,166,.08)" : "rgba(5,12,20,.09)";
              q.fillRect(
                x + 8 + rand() * (w - 18),
                y + 8 + rand() * 101,
                2 + rand() * 12,
                1 + rand() * 2,
              );
            }
            if (rand() > 0.65) {
              q.strokeStyle = "rgba(17,25,29,.5)";
              q.lineWidth = 1.5;
              q.beginPath();
              q.moveTo(x + w * 0.3, y + 3);
              q.lineTo(x + w * 0.39, y + 22);
              q.lineTo(x + w * 0.34, y + 38);
              q.lineTo(x + w * 0.48, y + 63);
              q.stroke();
            }
            x += w;
          }
        }
        // Leise, breite Patina statt flächigem Leuchten.
        [-5, -28, -52, -76].forEach(function (z, i) {
          var cy = (z + 96) * sz,
            g = q.createRadialGradient(512, cy, 10, 512, cy, 410);
          g.addColorStop(
            0,
            i % 2 ? "rgba(29,124,128,.17)" : "rgba(187,124,57,.19)",
          );
          g.addColorStop(1, "rgba(25,32,36,0)");
          q.fillStyle = g;
          q.fillRect(0, cy - 410, 1024, 820);
        });
        [1.0, 19.0].forEach(function (u) {
          q.fillStyle = "#87704c";
          q.fillRect(u * sx, 0, 3, c.height);
          q.fillStyle = "#2b393a";
          q.fillRect(u * sx + 5, 0, 6, c.height);
        });
        // Griechischer Mäander als eingelassener Rand; das Zentrum bleibt ruhig.
        q.strokeStyle = "#9e8057";
        q.lineWidth = 2.5;
        [23, 1001].forEach(function (x) {
          for (var v = 24; v < 4070; v += 66) {
            q.beginPath();
            q.moveTo(x, v);
            q.lineTo(x + 12, v);
            q.lineTo(x + 12, v + 45);
            q.lineTo(x - 9, v + 45);
            q.lineTo(x - 9, v + 15);
            q.lineTo(x + 3, v + 15);
            q.lineTo(x + 3, v + 32);
            q.stroke();
          }
        });
        return texture(c);
      }
      function stoneMap() {
        var c = canvas(256, 256),
          q = c.getContext("2d");
        q.fillStyle = "#b8b6ac";
        q.fillRect(0, 0, 256, 256);
        for (var i = 0; i < 3600; i++) {
          q.fillStyle =
            rand() > 0.5 ? "rgba(255,241,215,.10)" : "rgba(32,43,49,.10)";
          q.fillRect(
            rand() * 256,
            rand() * 256,
            1 + rand() * 10,
            1 + rand() * 3,
          );
        }
        q.strokeStyle = "rgba(31,39,44,.18)";
        q.lineWidth = 2;
        q.beginPath();
        q.moveTo(0, 77);
        q.lineTo(62, 85);
        q.lineTo(98, 115);
        q.lineTo(126, 110);
        q.stroke();
        return texture(c);
      }
      var stone = stoneMap(),
        floor = floorMap();
      var materials = {
        floor: new T.MeshLambertMaterial({ map: floor, color: 0xffffff }),
        basalt: new T.MeshLambertMaterial({
          map: stone,
          color: 0x596473,
          vertexColors: true,
        }),
        sand: new T.MeshLambertMaterial({
          map: stone,
          color: 0xc7ad81,
          vertexColors: true,
        }),
        copper: new T.MeshLambertMaterial({
          color: 0xbb8050,
          emissive: 0x382016,
          emissiveIntensity: 0.16,
          vertexColors: true,
        }),
        amber: new T.MeshBasicMaterial({ color: 0xffbd69, vertexColors: true }),
        aqua: new T.MeshBasicMaterial({ color: 0x70d7d8, vertexColors: true }),
        cliff: new T.MeshLambertMaterial({
          color: 0x465562,
          vertexColors: true,
        }),
        mist: new T.MeshBasicMaterial({
          color: 0x698d9a,
          transparent: true,
          opacity: 0.07,
          depthWrite: false,
          side: T.DoubleSide,
        }),
      };
      // Hex-Paletten sind sRGB; r128 erwartet lineare Materialfarben.
      Object.keys(materials).forEach(function (key) {
        if (key !== "floor") materials[key].color.convertSRGBToLinear();
      });
      var buckets = {},
        prototypes = {},
        pieces = 0;
      var matrix = new T.Matrix4(),
        quaternion = new T.Quaternion(),
        euler = new T.Euler(),
        pos = new T.Vector3(),
        scale = new T.Vector3();
      var point = new T.Vector3(),
        normal = new T.Vector3(),
        normalMatrix = new T.Matrix3();
      function proto(key, make) {
        if (!prototypes[key]) prototypes[key] = make();
        return prototypes[key];
      }
      var cube = proto("cube", function () {
        return new T.BoxGeometry(1, 1, 1);
      });
      var column = proto("column", function () {
        return new T.CylinderGeometry(0.82, 1, 1, 8, 1);
      });
      var rock = proto("rock", function () {
        return new T.IcosahedronGeometry(1, 0);
      });
      function add(mat, geo, x, y, z, w, h, d, rx, ry, rz, tint) {
        var b =
          buckets[mat] || (buckets[mat] = { p: [], n: [], uv: [], c: [] });
        pos.set(x, y, z);
        scale.set(w, h, d);
        euler.set(rx || 0, ry || 0, rz || 0);
        quaternion.setFromEuler(euler);
        matrix.compose(pos, quaternion, scale);
        normalMatrix.getNormalMatrix(matrix);
        var p = geo.attributes.position,
          n = geo.attributes.normal,
          uv = geo.attributes.uv,
          idx = geo.index;
        var count = idx ? idx.count : p.count,
          shade = tint === undefined ? 0.84 + rand() * 0.25 : tint;
        for (var k = 0; k < count; k++) {
          var j = idx ? idx.getX(k) : k;
          point.fromBufferAttribute(p, j).applyMatrix4(matrix);
          normal
            .fromBufferAttribute(n, j)
            .applyMatrix3(normalMatrix)
            .normalize();
          b.p.push(point.x, point.y, point.z);
          b.n.push(normal.x, normal.y, normal.z);
          b.uv.push(uv ? uv.getX(j) : 0, uv ? uv.getY(j) : 0);
          b.c.push(shade, shade, shade);
        }
        pieces++;
      }
      function box(mat, x, y, z, w, h, d, ry, tint) {
        add(mat, cube, x, y, z, w, h, d, 0, ry || 0, 0, tint);
      }
      function ring(mat, x, z, r, width, y, segments) {
        var key = "r" + r + ":" + width + ":" + (segments || 48);
        var geo = proto(key, function () {
          return new T.RingGeometry(r - width, r, segments || 48);
        });
        add(mat, geo, x, y, z, 1, 1, 1, -Math.PI / 2, 0, 0, 1);
      }
      function line(mat, x1, z1, x2, z2, width, y) {
        var dx = x2 - x1,
          dz = z2 - z1;
        box(
          mat,
          (x1 + x2) / 2,
          y - 0.002,
          (z1 + z2) / 2,
          width,
          0.004,
          Math.hypot(dx, dz),
          Math.atan2(dx, dz),
          1,
        );
      }
      function spiral(mat, x, z, size, y, turn) {
        var v = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-0.55, 1],
          [-0.55, -0.55],
          [0.55, -0.55],
          [0.55, 0.55],
          [0, 0.55],
          [0, 0],
        ];
        for (var i = 1; i < v.length; i++) {
          var a = v[i - 1],
            b = v[i];
          line(
            mat,
            x + a[0] * size * turn,
            z + a[1] * size,
            x + b[0] * size * turn,
            z + b[1] * size,
            0.06,
            y,
          );
        }
      }
      // Oberkante null; Einlagen liegen höchstens 0,023 über dem Laufboden.
      box("floor", 0, -0.16, -45, 20, 0.32, 102, 0, 1);
      [-5, -28, -52, -76].forEach(function (z, room) {
        ring("copper", 0, z, 4.15, 0.1, 0.012);
        ring("copper", 0, z, 3.87, 0.035, 0.014);
        ring("basalt", 0, z, 3.65, 0.35, 0.01);
        var sides = room === 2 ? 12 : 8;
        for (var k = 0; k < sides; k++) {
          var a = (k / sides) * Math.PI * 2,
            r = 3.5;
          box(
            k % 2 ? "aqua" : "amber",
            Math.cos(a) * r,
            0.016,
            z + Math.sin(a) * r,
            0.12,
            0.006,
            0.42,
            -a,
            0.67,
          );
        }
        if (room === 0) {
          spiral("copper", -1.05, z, 0.7, 0.02, 1);
          spiral("copper", 1.05, z, 0.7, 0.02, -1);
        } else if (room === 1) {
          for (var f = 0; f < 3; f++) {
            line(
              "copper",
              -2.5,
              z - 1.3 + f * 1.2,
              0,
              z - 0.5 + f * 1.2,
              0.065,
              0.02,
            );
            line(
              "copper",
              0,
              z - 0.5 + f * 1.2,
              2.5,
              z - 1.3 + f * 1.2,
              0.065,
              0.02,
            );
          }
        } else if (room === 2) {
          ring("copper", 0, z, 2.6, 0.09, 0.018, 4);
          ring("copper", 0, z, 1.85, 0.075, 0.019, 4);
          ring("aqua", 0, z, 0.7, 0.045, 0.021, 24);
        } else {
          // Iris-Intarsie aus acht gebogenen Kupfersegmenten.
          for (var t = 0; t < 8; t++) {
            var angle = (t * Math.PI) / 4;
            line(
              "copper",
              Math.cos(angle) * 0.65,
              z + Math.sin(angle) * 0.65,
              Math.cos(angle + 0.55) * 2.8,
              z + Math.sin(angle + 0.55) * 2.8,
              0.11,
              0.021,
            );
          }
          ring("amber", 0, z, 0.7, 0.04, 0.023, 24);
        }
        // Flache Randkanäle bleiben außerhalb der interaktiven Plattformen.
        [-1, 1].forEach(function (side) {
          line("copper", side * 8.7, z + 7.2, side * 8.7, z - 7.2, 0.16, 0.01);
          line(
            side < 0 ? "amber" : "aqua",
            side * 8.7,
            z + 7.2,
            side * 8.7,
            z - 7.2,
            0.035,
            0.016,
          );
        });
      });
      [-16, -40, -62, -86].forEach(function (z) {
        [-0.61, 0.61].forEach(function (dz) {
          line("copper", -9.5, z + dz, 9.5, z + dz, 0.07, 0.018);
        });
      });

      function pillar(x, z, height, sand, broken) {
        var m = sand ? "sand" : "basalt";
        box("basalt", x, 0.22, z, 1.9, 0.44, 1.9);
        box(m, x, 0.63, z, 1.58, 0.38, 1.58);
        var shaft = height - 1.65;
        add(
          m,
          column,
          x,
          0.82 + shaft / 2,
          z,
          0.68,
          shaft,
          0.68,
          0,
          Math.PI / 8,
          0,
        );
        // Acht Facetten mit vier Stegen und abgesetzten Kupferbändern.
        box("copper", x, 1.03, z, 1.28, 0.13, 1.28);
        box("copper", x, height - 0.96, z, 1.17, 0.15, 1.17);
        for (var side = -1; side <= 1; side += 2) {
          box(
            "copper",
            x + side * 0.485,
            height / 2,
            z + 0.485,
            0.055,
            height - 2.3,
            0.055,
          );
          box(
            "copper",
            x + side * 0.485,
            height / 2,
            z - 0.485,
            0.055,
            height - 2.3,
            0.055,
          );
        }
        if (!broken) {
          box(m, x, height - 0.65, z, 1.48, 0.35, 1.48);
          box("sand", x, height - 0.34, z, 1.8, 0.27, 1.8);
          box("copper", x, height - 0.16, z, 1.88, 0.085, 1.88);
          // Voluten als kantige, sichtbar auskragende Kapitelle.
          [-1, 1].forEach(function (s) {
            box(m, x, height - 0.59, z + s * 0.73, 0.87, 0.48, 0.34);
          });
        } else {
          add(
            "sand",
            rock,
            x,
            height - 0.55,
            z,
            0.72,
            0.38,
            0.68,
            0.2,
            0.4,
            0.15,
          );
        }
      }
      // Keilsteine in der seitlichen YZ-Ebene; keine Querbalken im Kamerablick.
      function sideArch(x, z, radius, spring, broken, material) {
        var n = 11;
        for (var j = 0; j < n; j++) {
          if (broken && (j === 5 || j === 6 || j === 7)) continue;
          var a = ((j + 0.5) / n) * Math.PI;
          add(
            material || "sand",
            cube,
            x,
            spring + Math.sin(a) * radius,
            z + Math.cos(a) * radius,
            0.78,
            0.66,
            ((radius * Math.PI) / n) * 0.94,
            a - Math.PI / 2,
            0,
            0,
          );
        }
        for (var k = 0; k < 8; k++) {
          if (broken && k > 3) continue;
          var a2 = ((k + 0.5) / 8) * Math.PI;
          add(
            "copper",
            cube,
            x - (x > 0 ? 0.41 : -0.41),
            spring + Math.sin(a2) * (radius + 0.36),
            z + Math.cos(a2) * (radius + 0.36),
            0.045,
            0.055,
            ((radius * Math.PI) / 8) * 0.91,
            a2 - Math.PI / 2,
            0,
            0,
          );
        }
      }
      [-1, 1].forEach(function (s) {
        // Niedriger Rand an der Kamera; offener Eingang und offene Decke.
        box("basalt", s * 10.35, 0.28, -45, 1.45, 0.56, 102);
        box("sand", s * 10.35, 0.6, -45, 1.48, 0.11, 102);
        box("copper", s * 9.64, 0.39, -45, 0.035, 0.12, 102);
        var locations = [-2, -11, -21, -33, -45, -57, -68, -81, -92];
        locations.forEach(function (z, i) {
          var height = i < 2 ? 5.8 : i < 4 ? 6.8 : i < 6 ? 7.3 : 8.5;
          pillar(s * 11.0, z, height, i < 4, i === (s < 0 ? 4 : 2));
        });
        [
          { z: -6.5, r: 4.5, h: 4.8, b: false },
          { z: -27, r: 6, h: 5.6, b: s < 0 },
          { z: -51, r: 6, h: 6.0, b: s > 0 },
          { z: -74.5, r: 6.5, h: 7.2, b: false },
        ].forEach(function (a, i) {
          sideArch(s * 11.0, a.z, a.r, a.h, a.b, i < 2 ? "sand" : "basalt");
          // Friese mit wiederkehrenden, tief gerahmten Reliefplatten.
          var top = a.h + a.r + 0.6;
          box("basalt", s * 11.0, top, a.z, 1.25, 0.55, a.r * 2 + 1.4);
          box("copper", s * 10.35, top - 0.22, a.z, 0.08, 0.075, a.r * 2 + 1.4);
          for (var k = -2; k <= 2; k++) {
            box("sand", s * 10.3, top, a.z + k * 1.9, 0.15, 0.39, 0.85);
            box("copper", s * 10.2, top, a.z + k * 1.9, 0.06, 0.18, 0.44);
          }
        });
        // Türpfosten sitzen vollständig hinter den seitlichen Kollisionsflächen.
        [-16, -40, -62, -86].forEach(function (z, i) {
          box("basalt", s * 10.8, 2.3, z, 2.0, 4.6, 2.0);
          box("sand", s * 10.8, 4.65, z, 2.3, 0.35, 2.3);
          box("copper", s * 9.72, 2.3, z + 0.25, 0.08, 3.3, 0.58);
          box(
            s < 0 ? "amber" : "aqua",
            s * 9.665,
            2.3,
            z + 0.25,
            0.025,
            2.5,
            0.085,
            0,
            0.78,
          );
          for (var k = 0; k < 3; k++)
            box("sand", s * 9.73, 0.8 + k * 1.2, z - 0.58, 0.12, 0.15, 0.36);
        });
        // Vier Kammern: Vestibül / Zisterne / Resonanz / Iris-Heiligtum.
        [-5, -28, -52, -76].forEach(function (z, i) {
          var sideMat = s < 0 ? "amber" : "aqua";
          box("basalt", s * 12.6, 2.0, z, 1.8, 4.0, 3.8);
          box("sand", s * 12.6, 4.1, z, 2.1, 0.28, 4.2);
          box("copper", s * 11.62, 2.6, z, 0.12, 2.2, 1.4);
          box(sideMat, s * 11.54, 2.6, z, 0.025, 1.65, 0.11, 0, 0.67);
          if (i === 1) {
            box("basalt", s * 13.5, 0.65, z, 3.2, 1.3, 12);
            box("aqua", s * 13.5, 1.32, z, 2.5, 0.025, 11.3, 0, 0.38);
            for (var f = 0; f < 3; f++)
              box(
                "aqua",
                s * (14.0 + f * 0.22),
                -1.3,
                z - 3 + f * 0.31,
                0.1,
                5.1 - f * 0.7,
                0.14,
                0,
                0.35 + f * 0.1,
              );
          }
          if (i === 2) {
            for (var f = 0; f < 3; f++) {
              box(
                "copper",
                s * (13.6 + f * 0.9),
                3.3 + f * 0.65,
                z - 1.3 + f * 1.3,
                0.44,
                6.6 + f * 1.3,
                0.55,
              );
              box(
                sideMat,
                s * (13.6 + f * 0.9),
                6.75 + f * 1.3,
                z - 1.3 + f * 1.3,
                0.23,
                0.18,
                0.29,
                0,
                0.8,
              );
            }
          }
          if (i === 3) {
            box("basalt", s * 14.3, 5.2, z, 3.6, 10.4, 6.0);
            box("sand", s * 14.3, 10.6, z, 4.0, 0.4, 6.5);
            box("copper", s * 12.43, 6.2, z, 0.13, 6.8, 1.4);
            box(sideMat, s * 12.34, 6.2, z, 0.03, 4.8, 0.13, 0, 0.57);
          }
        });
        // Tief gestaffelte Felswände und zerfallene Außenarkaden.
        for (var k = 0; k < 13; k++) {
          var z = 8 - k * 9,
            x = s * (24 + rand() * 7),
            h = 8 + rand() * 17;
          add(
            "cliff",
            rock,
            x,
            h * 0.35 - 5,
            z,
            4 + rand() * 5,
            h,
            5 + rand() * 5,
            rand() * 0.4,
            rand(),
            rand() * 0.2,
            0.55 + rand() * 0.45,
          );
          add(
            "cliff",
            rock,
            s * (16.2 + rand() * 2),
            -5,
            z,
            2.2 + rand() * 2,
            5 + rand() * 3,
            5.2,
            0.1,
            rand(),
            0.1,
            0.75,
          );
          if (k % 3 === 1) {
            pillar(s * 19, z, 9 + rand() * 4, false, true);
            sideArch(s * 19, z - 4, 4, 6.5, true, "basalt");
          }
        }
        for (var k = 0; k < 10; k++) {
          var z = -4 - k * 9.5,
            x = s * (12.8 + rand() * 3);
          add(
            k % 3 ? "basalt" : "sand",
            cube,
            x,
            0.4 + rand() * 0.5,
            z,
            1.3 + rand(),
            0.7 + rand(),
            1.1 + rand(),
            rand() * 0.5,
            rand() * 3,
            rand() * 0.4,
          );
        }
      });
      // Ferner Triumphbogen, hoch über dem Ausgang und außerhalb der Spielfläche.
      [-1, 1].forEach(function (s) {
        box("basalt", s * 13, 7, -104, 4, 14, 4);
        box("sand", s * 13, 14.2, -104, 4.8, 0.5, 4.8);
      });
      for (var k = 0; k < 19; k++) {
        var a = ((k + 0.5) / 19) * Math.PI;
        add(
          "sand",
          cube,
          Math.cos(a) * 13,
          14 + Math.sin(a) * 9,
          -104,
          2.12,
          1.2,
          2.0,
          0,
          0,
          a - Math.PI / 2,
        );
        add(
          "copper",
          cube,
          Math.cos(a) * 13,
          14 + Math.sin(a) * 9,
          -102.96,
          1.8,
          0.1,
          0.06,
          0,
          0,
          a - Math.PI / 2,
        );
      }
      // Nebelschichten im äußeren Abgrund; nie vor Figuren oder Plattformen.
      [-1, 1].forEach(function (s) {
        for (var i = 0; i < 3; i++)
          box(
            "mist",
            s * (22 + i * 3),
            -3.4 - i * 1.8,
            -48,
            22,
            0.015,
            140,
            0,
            1,
          );
      });

      var stats = {
        drawCalls: 0,
        triangles: 0,
        vertices: 0,
        pieces: pieces,
        batches: {},
        floorTop: 0.023,
        architectureMinAbsX: 9.6,
      };
      Object.keys(buckets).forEach(function (key) {
        var b = buckets[key],
          g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(b.p, 3));
        g.setAttribute("normal", new T.Float32BufferAttribute(b.n, 3));
        g.setAttribute("uv", new T.Float32BufferAttribute(b.uv, 2));
        if (materials[key].vertexColors)
          g.setAttribute("color", new T.Float32BufferAttribute(b.c, 3));
        g.computeBoundingBox();
        g.computeBoundingSphere();
        var mesh = new T.Mesh(g, materials[key]);
        mesh.name = "Tempel · " + key;
        mesh.userData.templeBatch = key;
        root.add(mesh);
        stats.drawCalls++;
        stats.triangles += b.p.length / 9;
        stats.vertices += b.p.length / 3;
        stats.batches[key] = {
          triangles: b.p.length / 9,
          vertices: b.p.length / 3,
        };
      });
      Object.keys(prototypes).forEach(function (key) {
        prototypes[key].dispose();
      });
      root.userData.stats = stats;
      scene.add(root);
      // Kollisionslisten, bestehende Meshes und die Beleuchtung gehören dem Aufrufer.
      return {
        root: root,
        stats: stats,
        dispose: function () {
          scene.remove(root);
          root.children.forEach(function (m) {
            m.geometry.dispose();
          });
          Object.keys(materials).forEach(function (k) {
            materials[k].dispose();
          });
          floor.dispose();
          stone.dispose();
        },
      };
    },
  };
})();
