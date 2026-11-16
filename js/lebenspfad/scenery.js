(function (global) {
  "use strict";

  // Eigener, zustandsloser Hash: keinerlei Einfluss auf Spiel- oder Netzwerk-Zufall.
  function hash(seed, lane) {
    var n = Math.imul(seed + 1013, 374761393) ^ Math.imul(lane + 37, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  global.LPScenery = function (THREE, options) {
    var scene = options.scene, fields = options.fields || [], chapters = options.chapters || [];
    var terrainHeight = options.terrainHeight, coarse = !!options.coarse;
    var roots = [], placements = [], anchors = [], trees = [];
    var stats = { trees: 0, shrubs: 0, rocks: 0, instances: 0, drawTypes: 0, totalTriangles: 0,
      chapters: [], rejected: 0, coarse: coarse };
    var count = Math.min(8, chapters.length || Math.ceil(fields.length / 18));
    var greens = [0x38533b, 0x496544, 0x617649, 0x748158];
    var autumn = [0x996037, 0xb17b3d, 0xc29648, 0x795134];
    var needles = [0x29463b, 0x355647, 0x46634e, 0x567158];
    var bark = [0x604838, 0x73533e, 0x80644d, 0x59473b];
    var blossoms = [0xd9ad9f, 0xe6c9b2, 0xc88f88, 0xe8d9bc];
    function anchor(ci, offset, dx, dz, radius) {
      var f = fields[ci * 18 + offset];
      if (f) anchors.push({ x: f.x + dx, z: f.z + dz, radius: radius });
    }
    var chapterOffsets = [[7, -8], [8, 7], [-7, -8], [7, 8], [-8, -7], [7, -8], [-7, 8], [8, -8]];
    chapterOffsets.forEach(function (v, ci) {
      // Beide historischen Anker-Indizes freihalten.
      anchor(ci, 8, v[0], v[1], 6); anchor(ci, 9, v[0], v[1], 6);
      anchor(ci, 0, 0, -5, 6);
    });
    [[1,-5,-10], [2,5,-11], [4,-4,-12], [7,4,-7], [5,4,-9],
      [0,6,-6], [3,6,-9], [4,7,-6], [5,-6,-8], [6,5,-9], [7,-6,-7]].forEach(function (v) {
      anchor(v[0], 8, v[1], v[2], 6);
    });
    anchor(1, 4, -9, -9, 6); anchor(5, 4, -8, 9, 6);
    anchor(5, 9, 13, -11, 6); anchor(3, 8, -12, 10, 6);
    anchor(0, 5, 4.6, 6.4, 4); anchor(7, 17, 0, -6, 6);

    function fieldRadius(f) {
      return Number.isFinite(f.radius) ? Math.max(2, f.radius) :
        Number.isFinite(f.r) ? Math.max(2, f.r) : f.type === "m" ? 2.7 : 2.0;
    }
    function clear(x, z, footprint, height) {
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i], distance = Math.hypot(x - f.x, z - f.z);
        var needed = Math.max(fieldRadius(f) + footprint + 2.5, 5.5 + footprint);
        if (height >= 5) needed = Math.max(needed, 9 + Math.min(3, height - 5));
        if (distance < needed) return false;
      }
      for (var a = 0; a < anchors.length; a++) {
        if (Math.hypot(x - anchors[a].x, z - anchors[a].z) < anchors[a].radius + footprint) return false;
      }
      return true;
    }

    var buckets = {
      wood: { geometry: new THREE.CylinderGeometry(.65, 1, 1, 6), items: [] },
      leaves: { geometry: new THREE.IcosahedronGeometry(1, 0), items: [] },
      pine: { geometry: new THREE.ConeGeometry(1, 1, 7), items: [] },
      stone: { geometry: new THREE.IcosahedronGeometry(1, 0), items: [] }
    };
    var dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
    var color = new THREE.Color(), direction = new THREE.Vector3();
    function add(bucket, x, y, z, sx, sy, sz, shade, yaw, quaternion) {
      dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz);
      if (quaternion) dummy.quaternion.copy(quaternion);
      else dummy.rotation.set(0, yaw || 0, 0);
      dummy.updateMatrix();
      color.setHex(shade).convertSRGBToLinear();
      buckets[bucket].items.push({ matrix: dummy.matrix.clone(), color: color.clone() });
    }
    function limb(x, y, z, tx, ty, tz, radius, shade) {
      direction.set(tx - x, ty - y, tz - z);
      var length = direction.length();
      var q = new THREE.Quaternion().setFromUnitVectors(up, direction.normalize());
      add("wood", (x + tx) / 2, (y + ty) / 2, (z + tz) / 2, radius, length, radius, shade, 0, q);
    }
    function plant(p, seed) {
      var h = p.height, x = p.x, z = p.z, y = p.ground;
      var tone = Math.floor(hash(seed, 20) * 4), wood = bark[tone];
      var yaw = hash(seed, 21) * Math.PI * 2;
      limb(x, y, z, x, y + h * .74, z, h * .047, wood);
      if (p.kind === "pine" || p.kind === "snow-pine") {
        [[.44,.55,1], [.64,.43,.79], [.83,.34,.53]].forEach(function (layer, j) {
          var radius = p.width * layer[2], length = h * layer[1];
          add("pine", x, y + h * layer[0], z, radius, length, radius, needles[(tone + j) % 4], yaw + j * .29);
          if (p.kind === "snow-pine") {
            var cap = length * .68;
            add("pine", x, y + h * layer[0] + (length - cap) / 2 + .025,
              z, radius * .70, cap, radius * .70, j % 2 ? 0xe2e6df : 0xf0eee3, yaw + j * .29);
          }
        });
      } else {
        var palette = p.chapter === 6 ? autumn : greens;
        // Vier ineinandergreifende Kronen mit sichtbaren Gabeln statt Kugel auf Stiel.
        [[0,.73,0,.86,.27,.81], [.49,.59,.12,.71,.23,.67],
          [-.37,.65,.37,.75,.25,.70], [.08,.77,-.46,.66,.20,.65]].forEach(function (v, j) {
          var ox = p.width * (v[0] * Math.cos(yaw) - v[2] * Math.sin(yaw));
          var oz = p.width * (v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw));
          if (j > 0) limb(x, y + h * .42, z, x + ox, y + h * v[1], z + oz, h * .024, wood);
          add("leaves", x + ox, y + h * v[1], z + oz, p.width * v[3], h * v[4],
            p.width * v[5], palette[(tone + j) % 4], yaw + j * .81);
          if (p.kind === "flowering" && j > 0) {
            add("leaves", x + ox, y + h * (v[1] + .13), z + oz,
              p.width * .42, h * .095, p.width * .40, blossoms[(tone + j) % 4], yaw + j);
          }
          if (p.kind === "orchard" && j > 0) {
            add("leaves", x + ox + p.width * .43, y + h * (v[1] - .08), z + oz + p.width * .21,
              .12, .15, .12, j % 2 ? 0xac6240 : 0xc09a55, yaw);
          }
        });
      }
    }

    for (var ci = 0; ci < count; ci++) {
      var target = coarse ? (ci < 6 ? 19 : 18) : (ci < 4 ? 28 : 27);
      var planted = 0, start = ci * 18, available = Math.min(18, fields.length - start);
      if (available <= 0) continue;
      // Sechs reproduzierbare Hain-Mittelpunkte pro Kapitel, danach lokale Streuung.
      for (var attempt = 0; planted < target && attempt < 2100; attempt++) {
        var grove = attempt % 6, gs = ci * 97 + grove * 7919;
        var f = fields[start + Math.floor(hash(gs, 1) * available)];
        var angle = hash(gs, 2) * Math.PI * 2, distance = 17 + hash(gs, 3) * 15;
        var seed = ci * 100003 + attempt * 31;
        var spread = 3 + Math.min(6, Math.floor(attempt / 240));
        var x = f.x + Math.cos(angle) * distance + (hash(seed, 4) - .5) * spread * 2;
        var z = f.z + Math.sin(angle) * distance + (hash(seed, 5) - .5) * spread * 2;
        var pine = ci === 7 || hash(seed, 6) < (ci === 2 ? .5 : .18);
        var h = pine ? 5.1 + hash(seed, 7) * 2.6 : 3.6 + hash(seed, 7) * 3.3;
        if (ci === 5 && !pine) h = 3.7 + hash(seed, 7) * 1.1;
        var width = h * (pine ? .22 : .28), footprint = width * (pine ? 1 : 1.5);
        if (!clear(x, z, footprint, h) || trees.some(function (p) {
          return Math.hypot(x - p.x, z - p.z) < (footprint + p.footprint) * .77;
        })) { stats.rejected++; continue; }
        var ground = terrainHeight(x, z) - .35;
        if (!Number.isFinite(ground)) continue;
        var p = { type: "tree", kind: pine ? (ci === 7 ? "snow-pine" : "pine") :
          ci < 2 && hash(seed, 8) < .62 ? "flowering" : ci === 5 ? "orchard" : "broadleaf",
          chapter: ci, grove: grove, x: x, z: z, ground: ground, height: h, width: width, footprint: footprint };
        trees.push(p); placements.push(p); plant(p, seed); planted++;
      }
      stats.chapters.push(planted); stats.trees += planted;
    }
    // Einzelne flache Steine, mit Unterseite exakt auf dem Gelände.
    for (var ri = 0; ri < (coarse ? 42 : 64); ri++) {
      if (!trees.length) break;
      var tree = trees[Math.floor(hash(ri, 50) * trees.length)], ra = hash(ri, 51) * Math.PI * 2;
      var rx = tree.x + Math.cos(ra) * (tree.footprint + 1.1), rz = tree.z + Math.sin(ra) * (tree.footprint + 1.1);
      var rw = .27 + hash(ri, 52) * .43, rh = .19 + hash(ri, 53) * .28;
      if (!clear(rx, rz, rw, rh)) continue;
      var gy = terrainHeight(rx, rz) - .35;
      if (!Number.isFinite(gy)) continue;
      // Icosahedron(1,0) erreicht +/-0.8506508 entlang Y.
      var extent = buckets.stone.geometry.attributes.position;
      var minY = Infinity;
      for (var vi = 0; vi < extent.count; vi++) minY = Math.min(minY, extent.getY(vi));
      add("stone", rx, gy - minY * rh, rz, rw, rh, rw * .82,
        [0x8a8474, 0x9a9382, 0x756f62, 0xaaa18d][ri % 4], ra);
      placements.push({ type: "rock", x: rx, z: rz, ground: gy, height: rh * -minY * 2, footprint: rw });
      stats.rocks++;
    }

    // Niedrige Wegbegleiter: eigene Hash-Spuren lassen alle bisherigen Bäume unverändert.
    var shrubs = [], frost = [0x899b8b, 0xa6aea0, 0x768b7b, 0xb7beb1];
    var leafPositions = buckets.leaves.geometry.attributes.position, leafExtent = 0;
    for (var lv = 0; lv < leafPositions.count; lv++) leafExtent = Math.max(leafExtent, Math.abs(leafPositions.getY(lv)));
    for (var sc = 0; sc < count; sc++) {
      var shrubTarget = coarse ? 6 : sc < 6 ? 9 : 8, shrubCount = 0;
      var shrubAvailable = Math.min(18, fields.length - sc * 18);
      for (var sa = 0; shrubCount < shrubTarget && shrubAvailable > 0 && sa < 1600; sa++) {
        var ss = 700001 + sc * 100003 + sa * 43;
        var sf = fields[sc * 18 + Math.floor(hash(ss, 70) * shrubAvailable)];
        var a = hash(ss, 71) * Math.PI * 2, d = 6.4 + hash(ss, 72) * 4;
        var sx = sf.x + Math.cos(a) * d, sz = sf.z + Math.sin(a) * d;
        var sh = .5 + hash(ss, 73) * .6, footprint = .65;
        if (!clear(sx, sz, footprint, 1.1) || shrubs.some(function (p) {
          return Math.hypot(sx - p.x, sz - p.z) < 1.5;
        }) || trees.some(function (p) {
          return Math.hypot(sx - p.x, sz - p.z) < p.footprint + footprint;
        })) continue;
        var ground = terrainHeight(sx, sz) - .35;
        if (!Number.isFinite(ground)) continue;
        var shrub = { type: "shrub", chapter: sc, x: sx, z: sz, ground: ground, height: sh, footprint: footprint };
        var lobes = hash(ss, 74) < .5 ? 2 : 3, palette = sc === 6 ? autumn : sc === 7 ? frost : greens;
        for (var sl = 0; sl < lobes; sl++) {
          var ox = sl === 0 ? -.19 : sl === 1 ? .23 : .02, oz = sl === 2 ? .24 : 0;
          var scaleY = sh * (sl === 0 ? 1 : sl === 1 ? .78 : .65) / (2 * leafExtent);
          var shade = palette[(sc + sl + Math.floor(hash(ss, 75) * 4)) % 4];
          if (sc < 2 && sl === 2 && hash(ss, 76) < .55) shade = 0xc0a18d;
          add("leaves", sx + ox * Math.cos(a) - oz * Math.sin(a), ground + scaleY * leafExtent,
            sz + ox * Math.sin(a) + oz * Math.cos(a), sl === 0 ? .35 : .29,
            scaleY, sl === 0 ? .32 : .27, shade, a + sl * .7);
        }
        placements.push(shrub); shrubs.push(shrub); shrubCount++; stats.shrubs++;
      }
    }

    Object.keys(buckets).forEach(function (name) {
      var b = buckets[name];
      if (!b.items.length) { b.geometry.dispose(); return; }
      var material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: true });
      var mesh = new THREE.InstancedMesh(b.geometry, material, b.items.length);
      mesh.name = "LPScenery:" + name;
      b.items.forEach(function (item, i) { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, item.color); });
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage); mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.setUsage(THREE.StaticDrawUsage); mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = true; mesh.receiveShadow = true;
      // r128 kennt keine Instanz-Bounds; bis zum Chunker nicht mit Basis-Bounds cullen.
      mesh.frustumCulled = false; mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
      scene.add(mesh); roots.push(mesh);
      stats.instances += mesh.count;
      stats.totalTriangles += (b.geometry.index ? b.geometry.index.count : b.geometry.attributes.position.count) / 3 * mesh.count;
    });
    stats.drawTypes = roots.length;
    return { roots: roots, stats: stats, placements: placements };
  };
})(window);
