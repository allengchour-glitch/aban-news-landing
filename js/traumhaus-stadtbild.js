/* Gruene Sitzplaetze fuer die ganze Stadt. Ein Modell je Baum/Bank, gemeinsam gezeichnet. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TraumStadtbild = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create(T, scene, pois, safe) {
    var root = new T.Group(), placements = [], chunks = [], LIMIT = 120;
    root.name = 'Gruene Stadtplaetze';
    root.updateMatrix(); root.matrixAutoUpdate = false;
    scene.add(root);
    var counts = { trees: 0, benches: 0, objects: 0, instances: 0, chunks: 0, meshes: 0, places: 0 };
    var sites = (Array.isArray(pois) ? pois : []).filter(function (p) {
      return p && typeof p.name === 'string' && Number.isFinite(p.x) && Number.isFinite(p.z);
    });
    function hash(name) {
      var n = 2166136261;
      for (var i = 0; i < name.length; i++) n = Math.imul(n ^ name.charCodeAt(i), 16777619);
      return n >>> 0;
    }
    function free(x, z, radius) {
      if (typeof safe !== 'function' || !safe(x, z, radius)) return false;
      if (placements.some(function (p) { return Math.hypot(x - p.x, z - p.z) < radius + p.radius + .5; })) return false;
      /* Randpunkte mitpruefen: sichere Mitte allein schuetzt keine Baumkrone oder Bank. */
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        if (!safe(x + Math.cos(a) * (radius - .25), z + Math.sin(a) * (radius - .25), .25)) return false;
      }
      return true;
    }
    /* Erst jeden Ort beruecksichtigen, danach einen zweiten Sitz-/Gruenpunkt ergaenzen. */
    var decorated = Object.create(null);
    for (var pass = 0; pass < 2 && placements.length < LIMIT; pass++) {
      for (var si = 0; si < sites.length && placements.length < LIMIT; si++) {
        var site = sites[si], key = site.name + '|' + site.x + '|' + site.z;
        if ((decorated[key] || 0) > pass) continue;
        var kind = pass === 0 ? 'tree' : 'bench', radius = kind === 'tree' ? 3 : 2.5;
        var seed = hash(key), start = (seed % 16) * Math.PI / 8 + pass * Math.PI;
        var placed = false;
        for (var ring = site.courtyard ? 6 : 16; ring <= (site.courtyard ? 10 : 28) && !placed; ring += 4) {
          for (var angle = 0; angle < 16 && !placed; angle++) {
            var a = start + angle * Math.PI / 8, x = site.x + Math.cos(a) * ring, z = site.z + Math.sin(a) * ring;
            if (!free(x, z, radius)) continue;
            var rotation = Math.atan2(x - site.x, z - site.z), c = Math.abs(Math.cos(rotation)), s = Math.abs(Math.sin(rotation));
            placements.push({
              kind: kind, name: site.name, x: x, z: z, radius: radius, rotation: rotation,
              /* Physischer Grundriss: unter der Baumkrone bleibt Platz zum Gehen. */
              w: kind === 'tree' ? 1.9 : c * 2.8 + s * 1.05,
              d: kind === 'tree' ? 1.9 : s * 2.8 + c * 1.05,
              variant: seed % 3
            });
            decorated[key] = (decorated[key] || 0) + 1;
            placed = true;
          }
        }
      }
    }
    counts.places = Object.keys(decorated).length;
    counts.objects = placements.length;
    if (!placements.length) return { root: root, counts: counts, placements: placements, tick: function () {} };

    /* Bauteile werden EINMAL zu farbigen Grundmodellen verbunden, nicht pro Platz. */
    var dummy = new T.Object3D();
    function merged(parts) {
      var positions = [], normals = [], colors = [];
      parts.forEach(function (part) {
        var g = part.geo.index ? part.geo.toNonIndexed() : part.geo.clone();
        dummy.position.set(part.x || 0, part.y || 0, part.z || 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(part.w || 1, part.h || 1, part.d || 1);
        dummy.updateMatrix();
        g.applyMatrix4(dummy.matrix);
        var p = g.getAttribute('position'), normal = g.getAttribute('normal'), color = new T.Color(part.color);
        for (var i = 0; i < p.count; i++) {
          positions.push(p.getX(i), p.getY(i), p.getZ(i));
          normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
          colors.push(color.r, color.g, color.b);
        }
        g.dispose();
      });
      var geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      geometry.computeBoundingSphere();
      return geometry;
    }
    var cube = new T.BoxGeometry(1, 1, 1), cylinder = new T.CylinderGeometry(.5, .5, 1, 8);
    var foliage = new T.IcosahedronGeometry(1, 1);
    var tree = merged([
      { geo: cylinder, y: .36, w: 1.8, h: .7, d: 1.8, color: 0x9c9c86 },
      { geo: cylinder, y: .72, w: 1.55, h: .06, d: 1.55, color: 0x574b35 },
      { geo: cylinder, y: 2.0, w: .3, h: 2.7, d: .3, color: 0x74593d },
      { geo: foliage, y: 4.2, w: 1.85, h: 2.1, d: 1.7, color: 0x6f9559 },
      { geo: foliage, x: .65, y: 4.8, z: .18, w: 1.05, h: 1.2, d: 1.1, color: 0x88a96b }
    ]);
    var benchParts = [];
    [-.24, 0, .24].forEach(function (z) { benchParts.push({ geo: cube, y: .66, z: z, w: 2.8, h: .13, d: .2, color: 0xa67c50 }); });
    [.98, 1.23].forEach(function (y) { benchParts.push({ geo: cube, y: y, z: .43, w: 2.8, h: .18, d: .12, color: 0xa67c50 }); });
    [-1.05, 1.05].forEach(function (x) { benchParts.push({ geo: cube, x: x, y: .32, w: .14, h: .64, d: .92, color: 0x435952 }); });
    benchParts.push({ geo: cube, y: .3, z: .35, w: 2.3, h: .13, d: .13, color: 0x435952 });
    var bench = merged(benchParts);
    cube.dispose(); cylinder.dispose(); foliage.dispose();
    var material = new T.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    /* Weicher Bodenkontakt ohne Schattenkamera oder Lichtquelle. */
    var size = 32, pixels = new Uint8Array(size * size * 4);
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var d = Math.hypot((x + .5 - size / 2) / (size / 2), (y + .5 - size / 2) / (size / 2));
      var k = (y * size + x) * 4;
      pixels[k] = 24; pixels[k + 1] = 35; pixels[k + 2] = 26;
      pixels[k + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - d), 1.35));
    }
    var texture = new T.DataTexture(pixels, size, size, T.RGBAFormat);
    texture.magFilter = T.LinearFilter; texture.minFilter = T.LinearFilter; texture.needsUpdate = true;
    var shade = new T.PlaneGeometry(1, 1); shade.rotateX(-Math.PI / 2);
    [tree, bench, shade].forEach(function (geometry) { geometry.boundingSphere = new T.Sphere(new T.Vector3(0, 3, 0), 64); });
    var shadeMaterial = new T.MeshBasicMaterial({ map: texture, transparent: true, opacity: .36, depthWrite: false });
    var byChunk = Object.create(null);
    placements.forEach(function (p) {
      var gx = Math.floor(p.x / 80), gz = Math.floor(p.z / 80), key = gx + '|' + gz;
      var chunk = byChunk[key] || (byChunk[key] = { x: gx * 80 + 40, z: gz * 80 + 40, tree: [], bench: [], shadow: [] });
      chunk[p.kind].push(p); chunk.shadow.push(p);
      if (p.kind === 'tree') counts.trees++; else counts.benches++;
    });
    Object.keys(byChunk).forEach(function (key) {
      var chunk = byChunk[key], group = new T.Group();
      group.position.set(chunk.x, 0, chunk.z); group.updateMatrix(); group.matrixAutoUpdate = false;
      root.add(group); chunk.group = group; chunks.push(chunk);
      ['tree', 'bench', 'shadow'].forEach(function (kind) {
        var rows = chunk[kind];
        if (!rows.length) return;
        var mesh = new T.InstancedMesh(kind === 'tree' ? tree : kind === 'bench' ? bench : shade, kind === 'shadow' ? shadeMaterial : material, rows.length);
        /* Drei r128 prueft sonst nur die Grundgeometrie am Chunk-Ursprung. */
        mesh.frustumCulled = false;
        rows.forEach(function (p, i) {
          dummy.position.set(p.x - chunk.x, kind === 'shadow' ? .12 : 0, p.z - chunk.z);
          dummy.rotation.set(0, p.rotation, 0);
          var height = p.kind === 'tree' ? .92 + p.variant * .05 : 1;
          dummy.scale.set(kind === 'shadow' ? (p.kind === 'tree' ? 4.8 : 3.9) : 1, kind === 'shadow' ? 1 : height, kind === 'shadow' ? (p.kind === 'tree' ? 4.8 : 2.3) : 1);
          dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true; mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
        group.add(mesh); counts.meshes++; counts.instances += rows.length;
      });
    });
    counts.chunks = chunks.length;
    var wasNight = null;
    function tick(x, z, night) {
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      chunks.forEach(function (chunk) {
        var dx = Math.max(0, Math.abs(x - chunk.x) - 40), dz = Math.max(0, Math.abs(z - chunk.z) - 40);
        chunk.group.visible = dx * dx + dz * dz <= 180 * 180;
      });
      night = !!night;
      if (night !== wasNight) {
        wasNight = night;
        shadeMaterial.opacity = night ? .15 : .36;
      }
    }
    return { root: root, counts: counts, placements: placements, tick: tick };
  }
  return { create: create };
});
