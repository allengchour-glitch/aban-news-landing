(function (global) {
  "use strict";

  // Gedämpfte Wiesen, warmer Herbst und blaugrauer Kalk statt Neon-Gras.
  var BIOMES = [
    [0x88a878, 0x688b66, 0xb4b595],
    [0x72966f, 0x527560, 0xa7b290],
    [0x949f73, 0x738565, 0xbcb596],
    [0xb1a176, 0x8a906a, 0xc7ba96],
    [0xb49b77, 0x8b8968, 0xc9b49a],
    [0xa39971, 0x7c8867, 0xbfb69a],
    [0xa18c72, 0x827f67, 0xc3b19b],
    [0xafbec0, 0x8eaaa9, 0xc8ced0]
  ];

  function clamp(value, lo, hi) { return Math.max(lo, Math.min(hi, value)); }
  function smooth(lo, hi, value) {
    var t = clamp((value - lo) / (hi - lo), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function hash(x, z) {
    var n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ 0x51f2b6a1;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }
  function noise(x, z) {
    var ix = Math.floor(x), iz = Math.floor(z);
    var fx = smooth(0, 1, x - ix), fz = smooth(0, 1, z - iz);
    var a = hash(ix, iz), b = hash(ix + 1, iz);
    var c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
  }

  /**
   * Einmalig erzeugtes, indiziertes Terrain für THREE r128.
   * heightAt liefert die alte Rohhöhe; sichtbarer Boden = heightAt(x,z) - 0.35.
   * Mesh/Szene, Shadow-Flags und LPStaticBatches.split bleiben beim Aufrufer.
   * Alle Zufallswerte sind lokal; weder Math.random noch Spiel-Seed werden benutzt.
   */
  global.LPLandscapeTerrain = function (THREE, options) {
    options = options || {};
    var points = Array.from(options.pathPoints || []).filter(function (p) {
      return p && Number.isFinite(p.x) && Number.isFinite(p.z);
    }).map(function (p) { return { x: p.x, z: p.z }; });
    var chapterCount = options.chapters && options.chapters.length || 8;
    var pads = (options.pads || []).filter(function(p){return Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.radius)&&p.radius>0;});
    var basins = Array.from(options.basins || []).filter(function (basin) {
      return basin && Number.isFinite(basin.x) && Number.isFinite(basin.z) &&
        Number.isFinite(basin.rx) && Number.isFinite(basin.rz) && Number.isFinite(basin.y) &&
        basin.rx > 0 && basin.rz > 0;
    }).map(function (basin) {
      return { x: basin.x, z: basin.z, rx: basin.rx, rz: basin.rz, y: basin.y };
    });
    var segments = [], connected = [];
    for (var p = 1; p < points.length; p++) {
      var a = points[p - 1], b = points[p];
      var dx = b.x - a.x, dz = b.z - a.z, lengthSq = dx * dx + dz * dz;
      // Angefügte Nebenrouten niemals mit langen Geraden durchs Brett verbinden.
      if (lengthSq > 0 && lengthSq <= 196) {
        connected[p - 1] = connected[p] = true;
        segments.push({ x: a.x, z: a.z, dx: dx, dz: dz, inverse: 1 / lengthSq,
          minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x),
          minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z) });
      }
    }
    var isolated = points.filter(function (point, i) { return !connected[i]; });

    function distanceToPath(x, z, limit) {
      var best = limit === undefined ? 1e12 : limit * limit;
      for (var i = 0; i < isolated.length; i++) {
        var px = x - isolated[i].x, pz = z - isolated[i].z;
        var pointDistance = px * px + pz * pz;
        if (pointDistance < best) best = pointDistance;
      }
      for (var j = 0; j < segments.length; j++) {
        var s = segments[j];
        // Erst den billigen Abstand zur Segment-Box prüfen.
        var bx = x < s.minX ? s.minX - x : x > s.maxX ? x - s.maxX : 0;
        var bz = z < s.minZ ? s.minZ - z : z > s.maxZ ? z - s.maxZ : 0;
        if (bx * bx + bz * bz >= best) continue;
        var sx = x - s.x, sz = z - s.z;
        var t = (sx * s.dx + sz * s.dz) * s.inverse;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var ex = sx - s.dx * t, ez = sz - s.dz * t;
        var segmentDistance = ex * ex + ez * ez;
        if (segmentDistance < best) best = segmentDistance;
      }
      return Math.sqrt(best);
    }

    function heightAt(x, z) {
      var distance = distanceToPath(x, z, 30);
      // Breiter Sockel hält auch interpolierte Dreiecke unter Feld und Wegkante.
      if (distance <= 5) return 0.33;
      var shoulder = smooth(10, 30, distance);
      var warp = (noise(x * 0.013 + 31, z * 0.016 - 9) - 0.5) * 17;
      var broad = noise((x + warp) * 0.024 + 7, z * 0.025 + 19);
      var folds = noise(x * 0.053 - 11, (z + warp) * 0.049 + 6);
      var detail = noise(x * 0.115 + 43, z * 0.11 - 27);
      var hills = 1.0 + broad * broad * 9.5 + folds * 2.6 + detail * 0.55;
      // Entfernte Flanken bilden eine Landschaft statt einer gleichmässigen Welle.
      var backdrop = smooth(30, 85, Math.abs(z)) * broad * 3.8;
      var height = 0.33 + shoulder * (hills + backdrop);
      for(var pad=0;pad<pads.length;pad++){var site=pads[pad],distanceToPad=Math.hypot(x-site.x,z-site.z);if(distanceToPad<site.radius+3)height+=(.33-height)*(1-smooth(site.radius,site.radius+3,distanceToPad));}
      for (var i = 0; i < basins.length; i++) {
        var basin = basins[i];
        var radius = Math.hypot((x - basin.x) / basin.rx, (z - basin.z) / basin.rz);
        if (radius >= 1.25) continue;
        // y ist die sichtbare Wasserhöhe, height bleibt die historische Rohhöhe.
        var floor = basin.y - 0.5, shore = basin.y + 0.39;
        var carved = radius <= 1 ? floor + (shore - floor) * smooth(0.72, 1, radius) :
          shore + (height - shore) * smooth(1, 1.25, radius);
        height += (carved - height) * smooth(5, 8, distance);
      }
      return height;
    }

    var palette = BIOMES.map(function (colors) {
      return colors.map(function (hex) { return new THREE.Color(hex).convertSRGBToLinear(); });
    });
    var soil = new THREE.Color(0xb7af92).convertSRGBToLinear();
    var sand = new THREE.Color(0xbeb298).convertSRGBToLinear();
    var silt = new THREE.Color(0x808f82).convertSRGBToLinear();
    var mixed = new THREE.Color(), second = new THREE.Color();

    function biomePosition(x, z) {
      // Gebogene Grenzen; Übergänge bleiben auf der Skala eines ganzen Kapitels.
      var warp = (noise(x * 0.018 + 17, z * 0.027 + 41) - 0.5) * 13;
      return clamp((x + 160 + warp) / 46, 0, Math.min(7, chapterCount - 1));
    }

    function colorAt(x, z, target, knownHeight) {
      target = target || new THREE.Color();
      var biome = biomePosition(x, z), first = Math.floor(biome);
      var next = Math.min(7, chapterCount - 1, first + 1);
      var blend = smooth(0, 1, biome - first);
      var patch = noise(x * 0.072 + 6, z * 0.067 - 14);
      var shade = smooth(0.43, 0.87, patch) * 0.46;
      mixed.copy(palette[first][0]).lerp(palette[first][1], shade);
      second.copy(palette[next][0]).lerp(palette[next][1], shade);
      target.copy(mixed).lerp(second, blend);
      var elevation = (knownHeight === undefined ? heightAt(x, z) : knownHeight) - 0.33;
      var chalk = smooth(3.8, 11, elevation) * 0.36;
      mixed.copy(palette[first][2]).lerp(palette[next][2], blend);
      target.lerp(mixed, chalk);
      // Äcker und trockene Wiesen als grosse weiche Flecken, kein Pixel-Konfetti.
      var meadow = smooth(0.56, 0.82, noise(x * 0.031 - 23, z * 0.039 + 9));
      target.lerp(soil, meadow * 0.12 * (1 - smooth(6, 7, biome)));
      for (var b = 0; b < basins.length; b++) {
        var basin = basins[b];
        var radius = Math.hypot((x - basin.x) / basin.rx, (z - basin.z) / basin.rz);
        if (radius >= 1.32) continue;
        var protection = smooth(5, 8, distanceToPath(x, z));
        var bank = smooth(0.82, 0.97, radius) * (1 - smooth(1.12, 1.32, radius));
        target.lerp(silt, (1 - smooth(0.75, 1, radius)) * 0.48 * protection);
        target.lerp(sand, bank * 0.67 * protection);
      }
      return target.multiplyScalar(0.95 + noise(x * 0.16 + 4, z * 0.15 + 7) * 0.09);
    }

    var widthSegments = 160, depthSegments = 64;
    var columns = widthSegments + 1, rows = depthSegments + 1;
    var positions = new Float32Array(columns * rows * 3);
    var colors = new Float32Array(positions.length);
    var indices = new Uint16Array(widthSegments * depthSegments * 6);
    var minHeight = Infinity, maxHeight = -Infinity, color = new THREE.Color();
    for (var row = 0; row < rows; row++) {
      for (var column = 0; column < columns; column++) {
        var x = -260 + column * 560 / widthSegments;
        var z = -110 + row * 220 / depthSegments;
        // Unregelmässige Facetten, aber unveränderte gerade Aussenkanten.
        if (column > 0 && column < widthSegments && row > 0 && row < depthSegments) {
          x += (hash(column + 971, row - 211) - 0.5) * 1.3;
          z += (hash(column - 491, row + 719) - 0.5) * 1.3;
        }
        var offset = (row * columns + column) * 3;
        // Float32-Koordinaten auch für Höhen/Farben nutzen: identische Stichproben.
        positions[offset] = x; positions[offset + 2] = z;
        x = positions[offset]; z = positions[offset + 2];
        var height = heightAt(x, z) - 0.35;
        positions[offset + 1] = height;
        minHeight = Math.min(minHeight, height); maxHeight = Math.max(maxHeight, height);
        colorAt(x, z, color, height + 0.35);
        colors[offset] = color.r; colors[offset + 1] = color.g; colors[offset + 2] = color.b;
      }
    }
    var cursor = 0;
    for (var rz = 0; rz < depthSegments; rz++) {
      for (var cx = 0; cx < widthSegments; cx++) {
        var v = rz * columns + cx, right = v + 1, below = v + columns, diagonal = below + 1;
        if ((cx + rz) % 2) {
          indices[cursor++] = v; indices[cursor++] = below; indices[cursor++] = right;
          indices[cursor++] = right; indices[cursor++] = below; indices[cursor++] = diagonal;
        } else {
          indices[cursor++] = v; indices[cursor++] = below; indices[cursor++] = diagonal;
          indices[cursor++] = v; indices[cursor++] = diagonal; indices[cursor++] = right;
        }
      }
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    var uvs = new Float32Array(columns * rows * 2);
    for (var uv = 0; uv < columns * rows; uv++) {
      uvs[uv * 2] = positions[uv * 3] * .16;
      uvs[uv * 2 + 1] = positions[uv * 3 + 2] * .16;
    }
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    // Ein kleines, wiederholtes Bodenkorn statt glatter Plastikflächen.
    var grain = new Uint8Array(64 * 64 * 4);
    for (var pixel = 0; pixel < 64 * 64; pixel++) {
      var value = 216 + Math.floor(hash(pixel % 64, Math.floor(pixel / 64)) * 39);
      grain[pixel * 4] = grain[pixel * 4 + 1] = grain[pixel * 4 + 2] = value;
      grain[pixel * 4 + 3] = 255;
    }
    var texture = new THREE.DataTexture(grain, 64, 64, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true; texture.needsUpdate = true;
    var material = new THREE.MeshStandardMaterial({
      map: texture, vertexColors: true, flatShading: true, roughness: 0.98, metalness: 0
    });
    material.name = "Lebenspfad · Wiesen und Kalk";
    // Requisiten auf die tatsächlich gerenderten, versetzten Dreiecke stellen.
    // Die analytische Höhenkurve allein kann zwischen Gitterpunkten abweichen.
    function surfaceHeightAt(x, z) {
      var column = Math.floor((x + 260) * widthSegments / 560);
      var row = Math.floor((z + 110) * depthSegments / 220);
      for (var r = Math.max(0, row - 1); r <= Math.min(depthSegments - 1, row + 1); r++) {
        for (var c = Math.max(0, column - 1); c <= Math.min(widthSegments - 1, column + 1); c++) {
          var start = (r * widthSegments + c) * 6;
          for (var triangle = 0; triangle < 2; triangle++) {
            var a = indices[start + triangle * 3] * 3;
            var b = indices[start + triangle * 3 + 1] * 3;
            var d = indices[start + triangle * 3 + 2] * 3;
            var ax = positions[a], az = positions[a + 2], bx = positions[b], bz = positions[b + 2], dx = positions[d], dz = positions[d + 2];
            var denominator = (bz - dz) * (ax - dx) + (dx - bx) * (az - dz);
            var u = ((bz - dz) * (x - dx) + (dx - bx) * (z - dz)) / denominator;
            var v = ((dz - az) * (x - dx) + (ax - dx) * (z - dz)) / denominator;
            var w = 1 - u - v;
            if (u >= -1e-7 && v >= -1e-7 && w >= -1e-7)
              return positions[a + 1] * u + positions[b + 1] * v + positions[d + 1] * w + .35;
          }
        }
      }
      return heightAt(x, z);
    }
    var disposed = false;
    return {
      geometry: geometry,
      material: material,
      heightAt: heightAt,
      surfaceHeightAt: surfaceHeightAt,
      distanceToPath: distanceToPath,
      colorAt: colorAt,
      palette: BIOMES.map(function (entry) { return entry.slice(); }),
      stats: {
        vertices: columns * rows, triangles: indices.length / 3,
        widthSegments: widthSegments, depthSegments: depthSegments,
        width: 560, depth: 220, centerX: 20,
        minHeight: minHeight, maxHeight: maxHeight,
        pathPoints: points.length, pathSegments: segments.length,
        flatRadius: 10, protectedPathRadius: 5, heightOffset: 0.35, basins: basins.length,
        bufferBytes: positions.byteLength + colors.byteLength + uvs.byteLength +
          geometry.attributes.normal.array.byteLength + indices.byteLength,
        textureBytes: grain.byteLength
      },
      dispose: function () {
        if (disposed) return;
        disposed = true;
        geometry.dispose(); texture.dispose(); material.dispose();
      }
    };
  };
})(window);
