(function (global) {
  'use strict';

  // Nur Darstellung: Felder, Graph und Spiel-Zufallsfolge bleiben unberührt.
  global.LPPathArt = function (T, options) {
    var fields = options.fields, scene = options.scene;
    var mainCount = options.mainCount || 144, chapters = options.chapters || [];
    var roots = [], links = [], markers = [], chunks = new Map(), textures = [], labelMaterials = [];
    var roadLinks = [];
    function triangleHeight(x, z, a, b, c) {
      var bx = b[0] - a[0], bz = b[2] - a[2], cx = c[0] - a[0], cz = c[2] - a[2];
      var det = bx * cz - bz * cx;
      if (Math.abs(det) < 1e-12) return -Infinity;
      var px = x - a[0], pz = z - a[2];
      var u = (px * cz - pz * cx) / det, v = (bx * pz - bz * px) / det;
      if (u < -1e-9 || v < -1e-9 || u + v > 1 + 1e-9) return -Infinity;
      return a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]);
    }
    // Nur Deckflächen; keine Schilder, Fugen oder Pfeile. Keine Allokation im Frame.
    function surfaceAt(x, z) {
      var highest = 0;
      for (var i = 0; i < roadLinks.length; i++) {
        var road = roadLinks[i];
        if (x < road.minX || x > road.maxX || z < road.minZ || z > road.maxZ) continue;
        for (var j = 0; j < road.quads.length; j++) {
          var q = road.quads[j];
          highest = Math.max(highest, triangleHeight(x, z, q[0], q[1], q[2]), triangleHeight(x, z, q[0], q[2], q[3]));
        }
      }
      return highest;
    }
    var stats = {linkCount: 0, mainLinks: 0, branchLinks: 0, chevrons: 0,
      chapterMarkers: 0, triangles: 0, chunkCount: 0, drawCalls: 0};
    var material = new T.MeshStandardMaterial({vertexColors: true, roughness: .94, flatShading: true});
    var colors = {};
    function color(hex) {
      if (!colors[hex]) colors[hex] = new T.Color(hex).convertSRGBToLinear();
      return colors[hex];
    }
    function vertex(x, y, z) { return [x, y, z]; }
    function triangle(a, b, c, hex) {
      var key = Math.floor((a[0] + b[0] + c[0]) / 144) + ':' + Math.floor((a[2] + b[2] + c[2]) / 144);
      if (!chunks.has(key)) chunks.set(key, {positions: [], colors: []});
      var chunk = chunks.get(key), rgb = color(hex);
      [a, b, c].forEach(function (p) {
        chunk.positions.push(p[0], p[1], p[2]); chunk.colors.push(rgb.r, rgb.g, rgb.b);
      });
      stats.triangles++;
    }
    function quad(a, b, c, d, hex) { triangle(a, b, c, hex); triangle(a, c, d, hex); }
    function top(f) { return f.disc && f.disc.position ? f.disc.position.y + .13 : .41 + (f.yoff || 0); }
    function radius(f, index) { return f.rsock ? Math.max(.9, f.rsock - .3) : index >= mainCount ? 1.45 : f.type === 'm' ? 2.2 : 1.5; }
    function addLink(from, to, branch) {
      if (!fields[from] || !fields[to] || from === to) return;
      var a = fields[from], b = fields[to], dx = b.x - a.x, dz = b.z - a.z;
      var length = Math.hypot(dx, dz);
      if (!(length > .01)) return;
      var ux = dx / length, uz = dz / length, nx = -uz, nz = ux;
      var insetA = Math.min(radius(a, from) - .12, length * .38);
      var insetB = Math.min(radius(b, to) - .12, length * .38);
      var ax = a.x + ux * insetA, az = a.z + uz * insetA;
      var bx = b.x - ux * insetB, bz = b.z - uz * insetB;
      var ya = top(a) - .12, yb = top(b) - .12;
      var quarterPhase = from % 4, bend = [1, .35, -1, -.35][quarterPhase] * Math.min(.12, length * .018);
      var width = branch ? 1.28 : 1.42, half = width / 2, inner = half - .115;
      var segments = options.coarse ? 2 : 3, rows = [];
      var sage = branch && quarterPhase % 2 === 0;
      var paving = sage ? [0xb9bf9f, 0xc4c8ac] : branch ? [0xd6c59f, 0xdfcfad] : [0xe0d4be, 0xe9ddc8];
      var rim = branch ? 0x8e9c7c : 0xb8a27c, side = branch ? 0x7f876b : 0xa28c6b;
      for (var s = 0; s <= segments; s++) {
        var t = s / segments, offset = Math.sin(t * Math.PI) * bend;
        var x = ax + (bx - ax) * t + nx * offset, z = az + (bz - az) * t + nz * offset;
        var y = ya + (yb - ya) * t;
        rows.push([-half, -inner, inner, half].map(function (w) { return vertex(x + nx * w, y, z + nz * w); }));
      }
      var road = {minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, quads: []};
      for (var k = 0; k < segments; k++) {
        var deck = [rows[k][0], rows[k][3], rows[k + 1][3], rows[k + 1][0]].map(function (v) { return v.map(Math.fround); });
        deck.forEach(function (v) {
          road.minX = Math.min(road.minX, v[0]); road.maxX = Math.max(road.maxX, v[0]);
          road.minZ = Math.min(road.minZ, v[2]); road.maxZ = Math.max(road.maxZ, v[2]);
        });
        road.quads.push(deck);
      }
      roadLinks.push(road);
      for (var j = 0; j < segments; j++) {
        var p = rows[j], q = rows[j + 1];
        // Blick von oben: Steinmitte, beide Randbänder, bis zum Boden geschlossene Seiten.
        for (var band = 0; band < 3; band++) quad(p[band], p[band + 1], q[band + 1], q[band], band === 1 ? paving[(j + quarterPhase) % 2] : rim);
        quad(p[0], q[0], vertex(q[0][0], 0, q[0][2]), vertex(p[0][0], 0, p[0][2]), side);
        quad(q[3], p[3], vertex(p[3][0], 0, p[3][2]), vertex(q[3][0], 0, q[3][2]), side);
        if (j > 0) {
          var seamA = vertex(p[1][0], p[1][1] + .002, p[1][2]);
          var seamB = vertex(p[2][0], p[2][1] + .002, p[2][2]);
          quad(seamA, seamB, vertex(seamB[0] + ux * .018, seamB[1], seamB[2] + uz * .018),
            vertex(seamA[0] + ux * .018, seamA[1], seamA[2] + uz * .018), rim);
        }
      }
      if (from % 3 === 1 && length - insetA - insetB > .65) {
        var mx = (ax + bx) / 2 + nx * bend, mz = (az + bz) / 2 + nz * bend, my = (ya + yb) / 2 + .008;
        function cue(along, across) { return vertex(mx + ux * along + nx * across, my, mz + uz * along + nz * across); }
        quad(cue(.08, 0), cue(.23, 0), cue(-.02, -.25), cue(-.17, -.25), 0x9d885f);
        quad(cue(-.17, .25), cue(-.02, .25), cue(.23, 0), cue(.08, 0), 0x9d885f);
        stats.chevrons++;
      }
      links.push({from: from, to: to, branch: branch, quarterPhase: quarterPhase, width: width,
        start: {x: ax, y: ya, z: az}, end: {x: bx, y: yb, z: bz}, centerDistance: length});
      stats.linkCount++; stats[branch ? 'branchLinks' : 'mainLinks']++;
    }
    for (var n = 0; n < Math.min(mainCount, fields.length) - 1; n++) addLink(n, n + 1, false);
    // Einstiege folgen fork.b, niemals der Array-Nachbarschaft 143 → 144.
    for (var f = 0; f < Math.min(mainCount, fields.length); f++) {
      if (fields[f].fork && Number.isInteger(fields[f].fork.b)) addLink(f, fields[f].fork.b, true);
    }
    for (var b = mainCount; b < fields.length; b++) {
      if (Number.isInteger(fields[b].nxt)) addLink(b, fields[b].nxt, true);
    }

    function box(x, y, z, w, h, d, hex) {
      var a = vertex(x - w / 2, y, z - d / 2), b = vertex(x + w / 2, y, z - d / 2);
      var c = vertex(x + w / 2, y, z + d / 2), e = vertex(x - w / 2, y, z + d / 2);
      function up(p) { return vertex(p[0], p[1] + h, p[2]); }
      quad(up(e), up(c), up(b), up(a), hex);
      [[a, b], [b, c], [c, e], [e, a]].forEach(function (p) { quad(p[0], up(p[0]), up(p[1]), p[1], hex); });
    }
    var numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    chapters.forEach(function (chapter, ci) {
      var index = Math.floor(ci * mainCount / chapters.length), field = fields[index];
      if (!field) return;
      var next = fields[Math.min(index + 1, mainCount - 1)], prev = fields[Math.max(0, index - 1)];
      var dx = next.x - prev.x, dz = next.z - prev.z, length = Math.hypot(dx, dz) || 1;
      var nx = -dz / length, nz = dx / length, distance = radius(field, index) + 2.0;
      function clearance(sign) {
        var x = field.x + nx * distance * sign, z = field.z + nz * distance * sign, best = Infinity;
        fields.forEach(function (other, oi) {
          best = Math.min(best, Math.hypot(x - other.x, z - other.z) - radius(other, oi));
        });
        return best;
      }
      var sign = clearance(1) >= clearance(-1) ? 1 : -1;
      var x = field.x + nx * distance * sign, z = field.z + nz * distance * sign;
      var label = (numerals[ci] || ci + 1) + ' · ' + (chapter.n || chapter.name || 'Kapitel ' + (ci + 1));
      box(x, 0, z, .34, .16, .34, 0xb4a488);
      box(x, .1, z, .14, 2.05, .14, 0x877356);
      box(x, 2.12, z, .27, .12, .27, 0xc8aa68);
      box(x, 1.3, z, .22, .12, .22, 0xc8aa68);
      markers.push({field: index, chapter: ci + 1, label: label, x: x, z: z});
      stats.chapterMarkers++;
      // In Node ohne Canvas bleiben die Marker prüfbar; im Browser genau acht Texturen.
      if (!global.document) return;
      var canvas = global.document.createElement('canvas'); canvas.width = 768; canvas.height = 144;
      var ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.fillStyle = '#f1e5ce'; ctx.fillRect(0, 0, 768, 144);
      ctx.strokeStyle = '#b39b67'; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 756, 132);
      ctx.fillStyle = '#534c39'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 84px sans-serif'; ctx.fillText(label, 384, 74, 712);
      var texture = new T.CanvasTexture(canvas); texture.encoding = T.sRGBEncoding;
      var labelMaterial = new T.SpriteMaterial({map: texture, color: 0xffffff});
      var sprite = new T.Sprite(labelMaterial); sprite.position.set(x, 1.81, z + .24); sprite.scale.set(3.0, .5625, 1);
      sprite.name = 'lp-path-chapter-' + (ci + 1); scene.add(sprite); roots.push(sprite);
      textures.push(texture); labelMaterials.push(labelMaterial);
    });
    var bounds = new T.Box3();
    chunks.forEach(function (data, key) {
      var geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(data.positions, 3));
      geometry.setAttribute('color', new T.Float32BufferAttribute(data.colors, 3));
      geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      var mesh = new T.Mesh(geometry, material); mesh.name = 'lp-path-cell-' + key;
      mesh.userData.lpPathArt = {cell: key, chunkSize: 48}; mesh.receiveShadow = true;
      scene.add(mesh); roots.push(mesh); bounds.union(geometry.boundingBox);
    });
    stats.chunkCount = chunks.size; stats.drawCalls = roots.length;
    stats.bounds = {minX: bounds.min.x, maxX: bounds.max.x, minY: bounds.min.y,
      maxY: bounds.max.y, minZ: bounds.min.z, maxZ: bounds.max.z};
    return {roots: roots, stats: stats, links: links, markers: markers, bounds: bounds, surfaceAt: surfaceAt,
      dispose: function () {
        roots.forEach(function (root) { if (root.parent) root.parent.remove(root); if (root.geometry) root.geometry.dispose(); });
        textures.forEach(function (texture) { texture.dispose(); });
        labelMaterials.forEach(function (mat) { mat.dispose(); }); material.dispose();
      }};
  };
})(typeof window !== 'undefined' ? window : globalThis);
