(function (global) {
  "use strict";

  var generated = new WeakSet();

  function validMatrix(matrix) {
    var e = matrix.elements;
    var determinant = matrix.determinant();
    return e.every(Number.isFinite) && e[3] === 0 && e[7] === 0 && e[11] === 0 &&
      e[15] === 1 && Number.isFinite(determinant) && determinant > 0;
  }

  // r128 skaliert Kugelradien nur mit der längsten Matrixspalte; Scherung auslassen.
  function noShear(matrix) {
    var e = matrix.elements;
    for (var a = 0; a < 3; a++) {
      for (var b = a + 1; b < 3; b++) {
        var i = a * 4, j = b * 4;
        var dot = e[i] * e[j] + e[i + 1] * e[j + 1] + e[i + 2] * e[j + 2];
        var length = Math.hypot(e[i], e[i + 1], e[i + 2]) * Math.hypot(e[j], e[j + 1], e[j + 2]);
        if (Math.abs(dot) > length * 1e-10) return false;
      }
    }
    return true;
  }

  function staticAttribute(THREE, attribute, size, count, instanced) {
    return attribute && attribute.isBufferAttribute && !attribute.isInterleavedBufferAttribute &&
      (!attribute.isInstancedBufferAttribute || (instanced && attribute.meshPerAttribute === 1)) && attribute.itemSize === size &&
      attribute.count >= count && attribute.array instanceof Float32Array && !attribute.normalized &&
      attribute.usage === THREE.StaticDrawUsage &&
      attribute.array.every(Number.isFinite);
  }

  function inspect(THREE, mesh) {
    if (!mesh || !mesh.isInstancedMesh || generated.has(mesh) || !mesh.visible ||
        !mesh.parent || !mesh.parent.isScene || mesh.children.length || mesh.animations.length ||
        mesh.customDepthMaterial || mesh.customDistanceMaterial ||
        mesh.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender ||
        mesh.onAfterRender !== THREE.Object3D.prototype.onAfterRender ||
        (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length) ||
        !Number.isInteger(mesh.count) || mesh.count < 1) return null;
    var material = mesh.material;
    var types = ["MeshBasicMaterial", "MeshLambertMaterial", "MeshPhongMaterial", "MeshStandardMaterial",
      "MeshPhysicalMaterial", "MeshNormalMaterial", "MeshMatcapMaterial", "MeshDepthMaterial", "MeshDistanceMaterial"];
    if (!material || Array.isArray(material) || types.indexOf(material.type) === -1 ||
        Object.getPrototypeOf(material) !== THREE[material.type].prototype || !material.visible ||
        material.transparent || material.transmission || !material.depthTest || !material.depthWrite ||
        material.stencilWrite || material.skinning || material.morphTargets || material.morphNormals ||
        material.displacementMap ||
        (material.blending !== THREE.NormalBlending && material.blending !== THREE.NoBlending) ||
        material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile ||
        material.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) return null;
    var geometry = mesh.geometry;
    if (!geometry || !geometry.isBufferGeometry || geometry.isInstancedBufferGeometry ||
        Object.keys(geometry.morphAttributes || {}).length) return null;
    var sizes = { position: 3, normal: 3, uv: 2, uv2: 2, color: 3, tangent: 4 };
    var position = geometry.attributes.position;
    if (!position || !staticAttribute(THREE, position, 3, 3, false)) return null;
    var names = Object.keys(geometry.attributes);
    for (var n = 0; n < names.length; n++) {
      var name = names[n], attribute = geometry.attributes[name];
      if (!Object.prototype.hasOwnProperty.call(sizes, name) ||
          !staticAttribute(THREE, attribute, sizes[name], position.count, false) ||
          attribute.count !== position.count) return null;
    }
    var index = geometry.index;
    if (index && (!index.isBufferAttribute || index.isInterleavedBufferAttribute || index.isInstancedBufferAttribute ||
        index.itemSize !== 1 || index.normalized || index.usage !== THREE.StaticDrawUsage ||
        !index.array.every(function (value) { return Number.isInteger(value) && value >= 0 && value < position.count; }))) return null;
    var elements = index ? index.count : position.count;
    if (elements % 3 || geometry.drawRange.start !== 0 || geometry.drawRange.count < elements ||
        !staticAttribute(THREE, mesh.instanceMatrix, 16, mesh.count, true) ||
        (mesh.instanceColor && !staticAttribute(THREE, mesh.instanceColor, 3, mesh.count, true))) return null;
    mesh.updateWorldMatrix(true, false);
    if (!validMatrix(mesh.matrix) || !validMatrix(mesh.matrixWorld) || !noShear(mesh.matrixWorld)) return null;
    var box = new THREE.Box3().setFromBufferAttribute(position);
    if (box.isEmpty()) return null;
    return { box: box, triangles: elements / 3 };
  }

  /**
   * Nur ausdrücklich übergebene STATISCHE InstancedMeshes direkt unter einer Scene.
   * X/Z-Zellen im Weltraum; lokale Instanzmatrizen und Farben bleiben bitgenau erhalten.
   * roots werden als Geschwister eingehängt. Quellen, Szene, Materialien und Instanzdaten
   * müssen bis dispose() statisch bleiben. Nicht unterstützte Quellen bleiben sichtbar.
   * stats.sourceInstances zählt aktive Instanzen aller eindeutigen Quellen;
   * chunkedInstances und totalTriangles zählen nur die erzeugten Batches.
   * dispose() entfernt eigene GPU-Puffer/Geometrien und stellt Sichtbarkeit wieder her.
   */
  global.LPInstanceChunks = function (THREE, meshes, options) {
    var chunkSize = options && Number.isFinite(options.chunkSize) && options.chunkSize > 0 ? options.chunkSize : 48;
    var roots = [], hidden = [], seen = new Set(), disposed = false;
    var stats = { sourceMeshes: 0, sourceInstances: 0, chunkedMeshes: 0, chunkedInstances: 0,
      skippedMeshes: 0, batches: 0, triangles: 0, totalTriangles: 0 };
    function dispose() {
      if (disposed) return;
      disposed = true;
      roots.forEach(function (root) {
        if (root.parent) root.parent.remove(root);
        root.dispose();
        root.geometry.dispose();
      });
      hidden.forEach(function (entry) { entry.mesh.visible = entry.visible; });
    }
    try {
      Array.from(meshes || []).forEach(function (mesh) {
        if (!mesh || !mesh.isInstancedMesh || seen.has(mesh)) return;
        seen.add(mesh);
        stats.sourceMeshes++;
        if (Number.isInteger(mesh.count) && mesh.count > 0) stats.sourceInstances += mesh.count;
        var info = inspect(THREE, mesh);
        if (!info) { stats.skippedMeshes++; return; }
        var chunks = new Map(), matrix = new THREE.Matrix4(), point = new THREE.Vector3();
        var box = new THREE.Box3(), valid = true;
        for (var i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          if (!validMatrix(matrix)) { valid = false; break; }
          point.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld);
          var key = Math.floor(point.x / chunkSize) + "," + Math.floor(point.z / chunkSize);
          if (!chunks.has(key)) chunks.set(key, { indices: [], box: new THREE.Box3() });
          var chunk = chunks.get(key);
          chunk.indices.push(i);
          chunk.box.union(box.copy(info.box).applyMatrix4(matrix));
        }
        if (!valid) { stats.skippedMeshes++; return; }
        chunks.forEach(function (chunk, key) {
          var geometry = mesh.geometry.clone();
          geometry.boundingBox = chunk.box.clone();
          geometry.boundingSphere = chunk.box.getBoundingSphere(new THREE.Sphere());
          var root = new THREE.InstancedMesh(geometry, mesh.material, chunk.indices.length);
          roots.push(root);
          generated.add(root);
          root.name = "LPInstanceChunk:" + mesh.name + ":" + key;
          root.position.copy(mesh.position);
          root.quaternion.copy(mesh.quaternion);
          root.scale.copy(mesh.scale);
          root.matrix.copy(mesh.matrix);
          root.matrixAutoUpdate = false;
          root.castShadow = mesh.castShadow;
          root.receiveShadow = mesh.receiveShadow;
          root.renderOrder = mesh.renderOrder;
          root.layers.mask = mesh.layers.mask;
          root.frustumCulled = true;
          root.instanceMatrix.setUsage(mesh.instanceMatrix.usage);
          if (mesh.instanceColor) {
            root.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(chunk.indices.length * 3), 3);
            root.instanceColor.setUsage(mesh.instanceColor.usage);
          }
          chunk.indices.forEach(function (oldIndex, newIndex) {
            root.instanceMatrix.array.set(mesh.instanceMatrix.array.subarray(oldIndex * 16, oldIndex * 16 + 16), newIndex * 16);
            if (root.instanceColor) root.instanceColor.array.set(mesh.instanceColor.array.subarray(oldIndex * 3, oldIndex * 3 + 3), newIndex * 3);
          });
          root.instanceMatrix.needsUpdate = true;
          if (root.instanceColor) root.instanceColor.needsUpdate = true;
          mesh.parent.add(root);
          root.updateWorldMatrix(false, false);
          stats.batches++;
        });
        hidden.push({ mesh: mesh, visible: mesh.visible });
        mesh.visible = false;
        stats.chunkedMeshes++;
        stats.chunkedInstances += mesh.count;
        stats.totalTriangles += info.triangles * mesh.count;
        stats.triangles = stats.totalTriangles;
      });
    } catch (error) {
      dispose();
      throw error;
    }
    return { roots: roots, stats: stats, dispose: dispose };
  };
})(window);
