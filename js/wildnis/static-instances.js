(function (global) {
  "use strict";
  var owned = new WeakSet();
  var types = ["MeshBasicMaterial", "MeshLambertMaterial", "MeshPhongMaterial", "MeshStandardMaterial",
    "MeshPhysicalMaterial", "MeshNormalMaterial", "MeshMatcapMaterial", "MeshDepthMaterial", "MeshDistanceMaterial"];

  function validMatrix(matrix) {
    var e = matrix.elements, determinant = matrix.determinant();
    if (!e.every(Number.isFinite) || !Number.isFinite(determinant) || determinant <= 0 ||
        e[3] !== 0 || e[7] !== 0 || e[11] !== 0 || e[15] !== 1) return false;
    for (var a = 0; a < 3; a++) for (var b = a + 1; b < 3; b++) {
      var i = a * 4, j = b * 4;
      var dot = e[i] * e[j] + e[i + 1] * e[j + 1] + e[i + 2] * e[j + 2];
      if (Math.abs(dot) > 1e-10 * Math.hypot(e[i], e[i + 1], e[i + 2]) *
          Math.hypot(e[j], e[j + 1], e[j + 2])) return false;
    }
    return true;
  }
  function safeObject(THREE, object) {
    return object.visible && !(object.animations && object.animations.length) &&
      object.onBeforeRender === THREE.Object3D.prototype.onBeforeRender &&
      object.onAfterRender === THREE.Object3D.prototype.onAfterRender &&
      !object.isSkinnedMesh && !object.isInstancedMesh && !owned.has(object);
  }
  function eligible(THREE, mesh) {
    var m = mesh.material, g = mesh.geometry;
    if (!mesh.isMesh || mesh.children.length || mesh.customDepthMaterial || mesh.customDistanceMaterial ||
        (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length) ||
        !m || Array.isArray(m) || types.indexOf(m.type) < 0 || Object.getPrototypeOf(m) !== THREE[m.type].prototype ||
        !m.visible || m.transparent || m.transmission || !m.depthWrite || !m.depthTest || m.stencilWrite ||
        m.displacementMap || m.skinning || m.morphTargets || m.morphNormals ||
        (m.normalMap && m.normalMapType === THREE.ObjectSpaceNormalMap) ||
        (m.blending !== THREE.NormalBlending && m.blending !== THREE.NoBlending) ||
        m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile ||
        m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey ||
        !g || !g.isBufferGeometry || g.isInstancedBufferGeometry || Object.keys(g.morphAttributes || {}).length) return false;
    var p = g.attributes.position;
    if (!p || p.itemSize !== 3 || p.normalized || p.count < 3) return false;
    var index = g.index;
    if (index && (!index.isBufferAttribute || index.itemSize !== 1 || index.normalized ||
        index.usage !== THREE.StaticDrawUsage || !index.array.every(function (v) {
          return Number.isInteger(v) && v >= 0 && v < p.count;
        }))) return false;
    return Object.keys(g.attributes).every(function (name) {
      var attribute = g.attributes[name];
      return attribute.isBufferAttribute && !attribute.isInterleavedBufferAttribute &&
        !attribute.isInstancedBufferAttribute && attribute.usage === THREE.StaticDrawUsage &&
        attribute.count === p.count && attribute.array.every(Number.isFinite);
    });
  }
  // r128 verwendet dieselbe Geometrie für Culling und lokale Raytests: Bounds trennen.
  function installRaycast(THREE, batch, localBox) {
    var g = batch.geometry, rayGeometry = new THREE.BufferGeometry();
    rayGeometry.index = g.index; rayGeometry.attributes = g.attributes;
    rayGeometry.groups = g.groups; rayGeometry.drawRange = g.drawRange;
    rayGeometry.boundingBox = localBox.clone();
    rayGeometry.boundingSphere = localBox.getBoundingSphere(new THREE.Sphere());
    var proxy = new THREE.Mesh(rayGeometry, batch.material), matrix = new THREE.Matrix4(), hits = [];
    batch.raycast = function (raycaster, intersections) {
      for (var i = 0; i < batch.count; i++) {
        batch.getMatrixAt(i, matrix);
        proxy.matrixWorld.multiplyMatrices(batch.matrixWorld, matrix);
        hits.length = 0; proxy.raycast(raycaster, hits);
        hits.forEach(function (hit) { hit.instanceId = i; hit.object = batch; intersections.push(hit); });
      }
    };
    return rayGeometry;
  }
  /** Nur explizit statische Wurzeln; Szene, Quellen und Sichtbarkeit bleiben bis dispose() statisch.
   * roots sind bereits eingehängte InstancedMeshes im identischen Szenenraum.
   * Originalgeometrien, Materialien und Texturen gehören weiterhin dem Aufrufer. */
  global.NWStaticInstances = function (THREE, sources, options) {
    var size = options && Number.isFinite(options.chunkSize) && options.chunkSize > 0 ? options.chunkSize : 48;
    var roots = [], hidden = [], rayGeometries = [], seen = new Set(), groups = new Map(), disposed = false;
    var geometryIds=new WeakMap(),materialIds=new WeakMap(),geometryBuckets=new Map(),materialKeys=new Map(),nextGeometry=0;
    function geometryId(g){
      if(geometryIds.has(g))return geometryIds.get(g);
      var names=Object.keys(g.attributes).sort(),arrays=names.map(function(n){return g.attributes[n].array;});if(g.index)arrays.push(g.index.array);
      var hash=2166136261;arrays.forEach(function(a){var bytes=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);for(var i=0;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619);});
      var layout=names.map(function(n){var a=g.attributes[n];return [n,a.itemSize,a.normalized,a.array.constructor.name,a.count];});
      var key=JSON.stringify([hash>>>0,layout,g.groups,g.drawRange,!!g.index]),bucket=geometryBuckets.get(key)||[],match;
      for(var i=0;i<bucket.length;i++){var e=bucket[i];if(arrays.every(function(a,j){var b=e.arrays[j];return a.length===b.length&&a.every(function(v,k){return v===b[k];});})){match=e;break;}}
      if(!match){match={id:nextGeometry++,arrays:arrays};bucket.push(match);geometryBuckets.set(key,bucket);}geometryIds.set(g,match.id);return match.id;
    }
    function materialId(m){
      if(materialIds.has(m))return materialIds.get(m);
      function value(v,stack){
        if(v===undefined)return ["undefined"];if(v===null||typeof v==="string"||typeof v==="boolean")return v;
        if(typeof v==="number"&&Number.isFinite(v))return v;if(v&&v.isTexture)return ["texture",v.uuid];
        if(!v||typeof v!=="object"||stack.has(v))throw new Error("Unbekannter Materialwert");
        stack.add(v);var r=Array.isArray(v)?v.map(function(x){return value(x,stack);}):Object.keys(v).sort().map(function(k){return [k,value(v[k],stack)];});stack.delete(v);return r;
      }
      var ignore=new Set(["id","uuid","name","userData","version","needsUpdate","_listeners","onBeforeCompile","customProgramCacheKey"]);
      var key;try{key=JSON.stringify(Object.keys(m).filter(function(k){return !ignore.has(k);}).sort().map(function(k){return [k,value(m[k],new Set())];}));}catch(e){key="unique:"+m.uuid;}
      if(!materialKeys.has(key))materialKeys.set(key,materialKeys.size);var id=materialKeys.get(key);materialIds.set(m,id);return id;
    }
    var stats = { sourceMeshes: 0, eligibleMeshes: 0, skippedMeshes: 0, batchedMeshes: 0, batches: 0, instances: 0 };
    function dispose() {
      if (disposed) return;
      disposed = true;
      roots.forEach(function (root) {
        if (root.parent) root.parent.remove(root);
        root.dispose(); root.geometry.dispose();
      });
      rayGeometries.forEach(function (g) { g.dispose(); });
      hidden.forEach(function (entry) { entry.mesh.visible = entry.visible; });
    }
    Array.from(sources || []).forEach(function (source) {
      if (!source || !source.isObject3D) return;
      var scene = source, ancestorsSafe = true, animated = false;
      source.traverse(function (node) { if (node.animations && node.animations.length) animated = true; });
      for (var node = source; node; node = node.parent) {
        if (!safeObject(THREE, node) || (node.isGroup && node.renderOrder)) ancestorsSafe = false;
        scene = node;
      }
      source.updateWorldMatrix(true, true);
      // Identische Weltmatrizen benötigen eine unveränderte Szene als Elternobjekt.
      if (!scene.isScene || !scene.matrixWorld.equals(new THREE.Matrix4())) ancestorsSafe = false;
      function visit(mesh, safe) {
        safe = safe && safeObject(THREE, mesh) && !(mesh.isGroup && mesh.renderOrder);
        if (mesh.isMesh && !seen.has(mesh)) {
          seen.add(mesh); stats.sourceMeshes++;
          if (safe && eligible(THREE, mesh) && validMatrix(mesh.matrixWorld)) {
            var e = mesh.matrixWorld.elements;
            var key = [scene.uuid, geometryId(mesh.geometry), materialId(mesh.material), mesh.layers.mask,
              mesh.castShadow, mesh.receiveShadow, mesh.renderOrder, Math.floor(e[12] / size), Math.floor(e[14] / size)].join("/");
            if (!groups.has(key)) groups.set(key, { scene: scene, meshes: [] });
            groups.get(key).meshes.push(mesh); stats.eligibleMeshes++;
          } else stats.skippedMeshes++;
        }
        mesh.children.forEach(function (child) { visit(child, safe); });
      }
      visit(source, ancestorsSafe && !animated);
    });
    try {
      groups.forEach(function (group) {
        var meshes = group.meshes, first = meshes[0];
        if (meshes.length < 2) return;
        var geometry = first.geometry.clone(), batch;
        try { batch = new THREE.InstancedMesh(geometry, first.material, meshes.length); }
        catch (error) { geometry.dispose(); throw error; }
        roots.push(batch); owned.add(batch);
        batch.name = "NWStaticInstances"; batch.matrixAutoUpdate = false;
        batch.layers.mask = first.layers.mask; batch.castShadow = first.castShadow;
        batch.receiveShadow = first.receiveShadow; batch.renderOrder = first.renderOrder; batch.frustumCulled = true;
        var localBox = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
        var worldBox = new THREE.Box3(), temp = new THREE.Box3(), matrix = new THREE.Matrix4();
        meshes.forEach(function (mesh, i) {
          batch.setMatrixAt(i, mesh.matrixWorld);
          worldBox.union(temp.copy(localBox).applyMatrix4(mesh.matrixWorld));
          // Float32-Instanzpuffer und originale Double-Matrix konservativ einschließen.
          batch.getMatrixAt(i, matrix);
          worldBox.union(temp.copy(localBox).applyMatrix4(matrix));
        });
        worldBox.expandByScalar(Math.max(1, worldBox.min.length(), worldBox.max.length()) * 1e-7);
        geometry.boundingBox = worldBox;
        geometry.boundingSphere = worldBox.getBoundingSphere(new THREE.Sphere());
        rayGeometries.push(installRaycast(THREE, batch, localBox));
        batch.instanceMatrix.needsUpdate = true;
        group.scene.add(batch); batch.updateWorldMatrix(false, false);
        meshes.forEach(function (mesh) { hidden.push({ mesh: mesh, visible: mesh.visible }); mesh.visible = false; });
        stats.batchedMeshes += meshes.length; stats.instances += meshes.length; stats.batches++;
      });
    } catch (error) { dispose(); throw error; }
    return { roots: roots, stats: stats, dispose: dispose };
  };
})(window);
