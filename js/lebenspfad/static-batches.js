(function (global) {
  "use strict";

  var generated = new WeakSet();

  function helpers(THREE) {
    var signatures = new WeakMap();
    var scenes = new Map();
    var sizes = { position: [3], normal: [3], uv: [2], uv2: [2], color: [3, 4] };
    var materialTypes = [
      "MeshBasicMaterial", "MeshLambertMaterial", "MeshPhongMaterial",
      "MeshStandardMaterial", "MeshPhysicalMaterial", "MeshNormalMaterial",
      "MeshMatcapMaterial", "MeshDepthMaterial", "MeshDistanceMaterial"
    ];
    var ignoredMaterialKeys = new Set([
      "id", "uuid", "name", "userData", "version", "needsUpdate", "_listeners",
      "onBeforeCompile", "customProgramCacheKey"
    ]);

    // Nicht nur Farben: sämtliche eingebauten Materialwerte und Textur-UUIDs vergleichen.
    function valueKey(value, stack) {
      if (value === undefined) return ["undefined"];
      if (value === null || typeof value === "string" || typeof value === "boolean") return value;
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (!value || typeof value !== "object" || stack.has(value)) throw new Error("Materialwert nicht unterstützt");
      if (value.isTexture) return ["texture", value.uuid];
      var prototype = Object.getPrototypeOf(value);
      var plain = prototype === null || Object.getPrototypeOf(prototype) === null;
      if (!Array.isArray(value) && !plain &&
          !value.isColor && !value.isVector2 && !value.isVector3 && !value.isVector4 &&
          !value.isMatrix3 && !value.isMatrix4 && !value.isPlane && !value.isQuaternion) {
        throw new Error("Materialobjekt nicht unterstützt");
      }
      stack.add(value);
      var result = Array.isArray(value) ? value.map(function (entry) {
        return valueKey(entry, stack);
      }) : Object.keys(value).sort().map(function (key) {
        return [key, valueKey(value[key], stack)];
      });
      stack.delete(value);
      return result;
    }

    function materialKey(material) {
      if (!material || Array.isArray(material) || !material.isMaterial) return null;
      if (signatures.has(material)) return signatures.get(material);
      var key = null;
      // Transparenz, Sonderblending und Stencil benötigen ihre ursprüngliche Zeichenfolge.
      // Objekt-Normalmaps und Displacement hängen vom ursprünglichen lokalen Raum ab.
      if (materialTypes.indexOf(material.type) !== -1 &&
          Object.getPrototypeOf(material) === THREE[material.type].prototype &&
          material.onBeforeCompile === THREE.Material.prototype.onBeforeCompile &&
          material.customProgramCacheKey === THREE.Material.prototype.customProgramCacheKey &&
          material.visible && !material.transparent && !material.transmission &&
          material.depthTest && material.depthWrite && !material.stencilWrite &&
          (material.blending === THREE.NormalBlending || material.blending === THREE.NoBlending) &&
          !material.skinning && !material.morphTargets && !material.morphNormals &&
          !material.displacementMap &&
          !(material.normalMap && material.normalMapType === THREE.ObjectSpaceNormalMap)) {
        try {
          key = JSON.stringify(Object.keys(material).filter(function (name) {
            return !ignoredMaterialKeys.has(name);
          }).sort().map(function (name) {
            return [name, valueKey(material[name], new Set())];
          }));
        } catch (error) {
          // Unbekannte Erweiterungen bleiben unverändert als Einzel-Mesh erhalten.
        }
      }
      signatures.set(material, key);
      return key;
    }

    function validMatrix(matrix) {
      var elements = matrix.elements;
      var determinant = matrix.determinant();
      return elements.every(Number.isFinite) && elements[3] === 0 && elements[7] === 0 &&
        elements[11] === 0 && elements[15] === 1 &&
        Number.isFinite(determinant) && determinant > 0;
    }

    function positiveScale(object) {
      return object.scale.x > 0 && object.scale.y > 0 && object.scale.z > 0;
    }

    function sceneInfo(scene) {
      if (scenes.has(scene)) return scenes.get(scene);
      scene.updateWorldMatrix(true, false);
      var valid = true;
      for (var parent = scene; parent; parent = parent.parent) {
        if (!positiveScale(parent) || !validMatrix(parent.matrix)) valid = false;
      }
      var info = valid && validMatrix(scene.matrixWorld) ? {
        id: scenes.size,
        inverse: new THREE.Matrix4().copy(scene.matrixWorld).invert()
      } : null;
      scenes.set(scene, info);
      return info;
    }

    function geometryInfo(geometry) {
      if (!geometry || !geometry.isBufferGeometry || geometry.isInstancedBufferGeometry ||
          Object.keys(geometry.morphAttributes || {}).length) return null;
      var attributes = geometry.attributes;
      var names = Object.keys(attributes).sort();
      if (!attributes.position || !attributes.normal) return null;
      var count = attributes.position.count;
      if (!Number.isInteger(count) || count < 3) return null;
      var layout = [];
      for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var attribute = attributes[name];
        if (!Object.prototype.hasOwnProperty.call(sizes, name) || !attribute || !attribute.isBufferAttribute ||
            attribute.isInterleavedBufferAttribute || attribute.isInstancedBufferAttribute ||
            sizes[name].indexOf(attribute.itemSize) === -1 || attribute.count !== count ||
            attribute.usage !== THREE.StaticDrawUsage) return null;
        var type = Object.prototype.toString.call(attribute.array);
        if (type !== "[object Float32Array]" && !(name === "color" && attribute.normalized &&
            (type === "[object Uint8Array]" || type === "[object Uint16Array]"))) return null;
        if ((name === "position" || name === "normal") && attribute.normalized) return null;
        if (attribute.array.length !== count * attribute.itemSize ||
            !attribute.array.every(Number.isFinite)) return null;
        layout.push([name, attribute.itemSize, attribute.normalized, type]);
      }
      var index = geometry.index;
      var indexCount = index ? index.count : count;
      if (!Number.isInteger(indexCount) || indexCount < 3 || indexCount % 3 !== 0 ||
          geometry.drawRange.start !== 0 || !(geometry.drawRange.count >= indexCount)) return null;
      if (index) {
        var indexType = Object.prototype.toString.call(index.array);
        if (!index.isBufferAttribute || index.isInterleavedBufferAttribute || index.isInstancedBufferAttribute ||
            index.itemSize !== 1 || index.normalized || index.usage !== THREE.StaticDrawUsage || index.array.length !== indexCount ||
            ["[object Uint8Array]", "[object Uint16Array]", "[object Uint32Array]"].indexOf(indexType) === -1 ||
            !index.array.every(function (entry) { return entry < count; })) return null;
      }
      // Gruppen sind bei genau einem Material in THREE r128 wirkungslos.
      return { names: names, layout: layout, count: count, indexCount: indexCount };
    }

    function inspect(mesh) {
      if (!mesh || !mesh.isMesh || generated.has(mesh) || mesh.isSkinnedMesh || mesh.isInstancedMesh || mesh.children.length ||
          !mesh.parent || !mesh.parent.isScene || !mesh.visible || !positiveScale(mesh) ||
          mesh.customDepthMaterial || mesh.customDistanceMaterial || mesh.animations.length ||
          (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length) ||
          mesh.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender ||
          mesh.onAfterRender !== THREE.Object3D.prototype.onAfterRender) return null;
      var signature = materialKey(mesh.material);
      if (signature === null) return null;
      var geometry = geometryInfo(mesh.geometry);
      if (!geometry) return null;
      var info = sceneInfo(mesh.parent);
      if (!info) return null;
      mesh.updateWorldMatrix(false, false);
      if (!validMatrix(mesh.matrix) || !validMatrix(mesh.matrixWorld)) return null;
      return { signature: signature, geometry: geometry, scene: info };
    }
    return { inspect: inspect };
  }

  function getChunkSize(options) {
    return options && Number.isFinite(options.chunkSize) && options.chunkSize > 0 ? options.chunkSize : 48;
  }

  function allocateGeometry(THREE, source, names, count) {
    var geometry = new THREE.BufferGeometry();
    var arrays = {};
    names.forEach(function (name) {
      var attribute = source.attributes[name];
      arrays[name] = new attribute.array.constructor(count * attribute.itemSize);
      geometry.setAttribute(name, new THREE.BufferAttribute(arrays[name], attribute.itemSize, attribute.normalized));
    });
    return { geometry: geometry, arrays: arrays };
  }

  function makeRoot(THREE, source, geometry, name) {
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    var root = new THREE.Mesh(geometry, source.material);
    root.name = name;
    root.castShadow = source.castShadow;
    root.receiveShadow = source.receiveShadow;
    root.renderOrder = source.renderOrder;
    root.layers.mask = source.layers.mask;
    root.frustumCulled = source.frustumCulled;
    generated.add(root);
    return root;
  }

  function newResult() {
    var roots = [];
    var hidden = [];
    var disposed = false;
    return {
      roots: roots,
      hidden: hidden,
      stats: { sourceMeshes: 0, batchedMeshes: 0, batches: 0, triangles: 0 },
      dispose: function () {
        if (disposed) return;
        disposed = true;
        roots.forEach(function (root) {
          if (root.parent) root.parent.remove(root);
          root.geometry.dispose();
        });
        hidden.forEach(function (entry) { entry.mesh.visible = entry.visible; });
        // Geteilte Materialien, Texturen und Quellgeometrien gehören dem Aufrufer.
      }
    };
  }

  function publicResult(result) {
    return { roots: result.roots, stats: result.stats, dispose: result.dispose };
  }

  /**
   * Nur ausdrücklich übergebene, statische Szene-Kinder zusammenfassen.
   * roots: neue Meshes, bereits in ihrer ursprünglichen Szene eingehängt.
   * stats: eindeutige Quell-Meshes, versteckte Meshes, Batches und Batch-Dreiecke.
   * Transformationen, Sichtbarkeit und Materialwerte bleiben bis dispose() statisch.
   * dispose() entfernt eigene Geometrien und stellt Originalsichtbarkeit wieder her.
   */
  global.LPStaticBatches = function (THREE, meshes, options) {
    var chunkSize = getChunkSize(options);
    var result = newResult();
    var roots = result.roots;
    var hidden = result.hidden;
    var stats = result.stats;
    var seen = new Set();
    var groups = new Map();
    var inspect = helpers(THREE).inspect;

    Array.from(meshes || []).forEach(function (mesh) {
      if (!mesh || !mesh.isMesh || seen.has(mesh)) return;
      seen.add(mesh);
      stats.sourceMeshes++;
      var eligible = inspect(mesh);
      if (!eligible) return;
      var geometry = eligible.geometry;
      var info = eligible.scene;
      var scene = mesh.parent;
      var world = mesh.matrixWorld.elements;
      var cell = [12, 13, 14].map(function (axis) { return Math.floor(world[axis] / chunkSize); });
      var key = JSON.stringify([
        info.id, cell, eligible.signature, geometry.layout, mesh.castShadow, mesh.receiveShadow,
        mesh.renderOrder, mesh.layers.mask, mesh.frustumCulled
      ]);
      if (!groups.has(key)) groups.set(key, { scene: scene, info: info, cell: cell, entries: [] });
      groups.get(key).entries.push({ mesh: mesh, geometry: geometry });
    });

    function makeBatch(group) {
      var entries = group.entries;
      if (entries.length < 3) return;
      var first = entries[0].mesh;
      var names = entries[0].geometry.names;
      var vertexCount = 0;
      var indexCount = 0;
      entries.forEach(function (entry) {
        vertexCount += entry.geometry.count;
        indexCount += entry.geometry.indexCount;
      });
      var origin = new THREE.Vector3(
        (group.cell[0] + 0.5) * chunkSize,
        (group.cell[1] + 0.5) * chunkSize,
        (group.cell[2] + 0.5) * chunkSize
      ).applyMatrix4(group.info.inverse);
      var allocated = allocateGeometry(THREE, first.geometry, names, vertexCount);
      var geometry = allocated.geometry;
      var arrays = allocated.arrays;
      var indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
      var vertexOffset = 0;
      var indexOffset = 0;
      var transform = new THREE.Matrix4();
      var normalMatrix = new THREE.Matrix3();
      var vector = new THREE.Vector3();
      entries.forEach(function (entry) {
        var source = entry.mesh.geometry;
        // Szene bleibt Elternobjekt: nur den lokalen Mesh-Raum in den Chunk-Raum backen.
        transform.copy(entry.mesh.matrix);
        transform.elements[12] -= origin.x;
        transform.elements[13] -= origin.y;
        transform.elements[14] -= origin.z;
        normalMatrix.getNormalMatrix(transform);
        names.forEach(function (name) {
          var attribute = source.attributes[name];
          var target = arrays[name];
          var offset = vertexOffset * attribute.itemSize;
          if (name !== "position" && name !== "normal") {
            target.set(attribute.array, offset);
            return;
          }
          for (var i = 0; i < attribute.count; i++) {
            vector.fromBufferAttribute(attribute, i);
            if (name === "position") vector.applyMatrix4(transform);
            else vector.applyNormalMatrix(normalMatrix);
            vector.toArray(target, offset + i * 3);
          }
        });
        for (var i = 0; i < entry.geometry.indexCount; i++) {
          indices[indexOffset++] = vertexOffset + (source.index ? source.index.array[i] : i);
        }
        vertexOffset += entry.geometry.count;
      });
      // Erst nach vollständig erfolgreichem Aufbau Originale verstecken.
      if (!arrays.position.every(Number.isFinite) || !arrays.normal.every(Number.isFinite)) {
        geometry.dispose();
        return;
      }
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      var batch = makeRoot(THREE, first, geometry, "LPStaticBatch");
      batch.position.copy(origin);
      batch.updateMatrix();
      batch.matrixAutoUpdate = false;
      roots.push(batch);
      group.scene.add(batch);
      batch.updateWorldMatrix(false, false);
      entries.forEach(function (entry) {
        hidden.push({ mesh: entry.mesh, visible: entry.mesh.visible });
        entry.mesh.visible = false;
      });
      stats.batchedMeshes += entries.length;
      stats.batches++;
      stats.triangles += indexCount / 3;
    }

    try {
      groups.forEach(makeBatch);
    } catch (error) {
      result.dispose();
      throw error;
    }
    return publicResult(result);
  };

  /**
   * Ein großes indiziertes Mesh nach Dreiecksmittelpunkten in Welt-X/Z aufteilen.
   * Randdreiecke dürfen den Chunk überragen; weder schneiden noch Normalen neu berechnen.
   * Weniger als zwei belegte Chunks oder ungeeignete Quellen bleiben unverändert.
   * Rückgabe und dispose() entsprechen LPStaticBatches; batchedMeshes ist hier 0 oder 1.
   */
  global.LPStaticBatches.split = function (THREE, mesh, options) {
    var result = newResult();
    result.stats.sourceMeshes = mesh && mesh.isMesh ? 1 : 0;
    var eligible = helpers(THREE).inspect(mesh);
    if (!eligible || !mesh.geometry.index) return publicResult(result);
    var chunkSize = getChunkSize(options);
    var source = mesh.geometry;
    var names = eligible.geometry.names;
    var index = source.index.array;
    var chunks = new Map();
    var centroid = new THREE.Vector3();
    var vertex = new THREE.Vector3();
    for (var i = 0; i < index.length; i += 3) {
      centroid.set(0, 0, 0);
      for (var corner = 0; corner < 3; corner++) {
        centroid.add(vertex.fromBufferAttribute(source.attributes.position, index[i + corner]));
      }
      centroid.multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld);
      if (!Number.isFinite(centroid.x) || !Number.isFinite(centroid.z)) return publicResult(result);
      var key = Math.floor(centroid.x / chunkSize) + "," + Math.floor(centroid.z / chunkSize);
      if (!chunks.has(key)) chunks.set(key, []);
      chunks.get(key).push(i);
    }
    if (chunks.size < 2) return publicResult(result);
    try {
      chunks.forEach(function (triangles) {
        var remap = new Map();
        var originalVertices = [];
        var localIndices = [];
        triangles.forEach(function (offset) {
          for (var corner = 0; corner < 3; corner++) {
            var oldIndex = index[offset + corner];
            if (!remap.has(oldIndex)) {
              remap.set(oldIndex, remap.size);
              originalVertices.push(oldIndex);
            }
            localIndices.push(remap.get(oldIndex));
          }
        });
        var allocated = allocateGeometry(THREE, source, names, originalVertices.length);
        var geometry = allocated.geometry;
        names.forEach(function (name) {
          var attribute = source.attributes[name];
          var target = allocated.arrays[name];
          originalVertices.forEach(function (oldIndex, newIndex) {
            target.set(attribute.array.subarray(oldIndex * attribute.itemSize, (oldIndex + 1) * attribute.itemSize),
              newIndex * attribute.itemSize);
          });
        });
        var indices = originalVertices.length > 65535 ? new Uint32Array(localIndices) : new Uint16Array(localIndices);
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        var root = makeRoot(THREE, mesh, geometry, "LPStaticChunk");
        root.position.copy(mesh.position);
        root.quaternion.copy(mesh.quaternion);
        root.scale.copy(mesh.scale);
        root.matrix.copy(mesh.matrix);
        root.matrixAutoUpdate = false;
        result.roots.push(root);
        mesh.parent.add(root);
        root.updateWorldMatrix(false, false);
        result.stats.batches++;
        result.stats.triangles += triangles.length;
      });
      result.hidden.push({ mesh: mesh, visible: mesh.visible });
      mesh.visible = false;
      result.stats.batchedMeshes = 1;
    } catch (error) {
      result.dispose();
      throw error;
    }
    return publicResult(result);
  };
})(window);
