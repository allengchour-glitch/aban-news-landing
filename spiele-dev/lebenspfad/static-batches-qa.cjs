const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = require('node:path').resolve(__dirname, '../..');
const context = { console, assert, performance };
context.window = context;
vm.createContext(context);
for (const file of ['js/vendor/three.min.js', 'js/lebenspfad/static-batches.js']) {
  vm.runInContext(fs.readFileSync(root + '/' + file, 'utf8'), context, { filename: file });
}
function fixture() {
  const T = THREE;
  let checks = 0;
  function test(name, fn) { fn(); checks++; console.log('ok', name); }
  function near(a, b, tolerance = 0.00004) {
    assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
  }
  function nearVector(a, b, tolerance) {
    near(a.x, b.x, tolerance); near(a.y, b.y, tolerance); near(a.z, b.z, tolerance);
  }
  function material() { return new T.MeshStandardMaterial({ color: 0xabcdef, roughness: 0.7 }); }
  function mesh(scene, geometry = new T.BoxGeometry(1, 2, 3), mat = material()) {
    const m = new T.Mesh(geometry, mat); scene.add(m); return m;
  }
  function triple(scene, mat = material()) {
    return [0, 1, 2].map(i => { const m = mesh(scene, undefined, mat.clone()); m.position.set(10 + i, 8, 9); return m; });
  }
  function assertBounds(root) {
    const g = root.geometry;
    assert.ok(g.boundingBox && g.boundingSphere);
    for (let i = 0; i < g.attributes.position.count; i++) {
      const v = new T.Vector3().fromBufferAttribute(g.attributes.position, i);
      assert.ok(g.boundingBox.containsPoint(v));
      assert.ok(v.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 0.00001);
    }
  }
  function addAttrs(geometry) {
    geometry.setAttribute('uv2', geometry.attributes.uv.clone());
    const color = new Uint8Array(geometry.attributes.position.count * 4);
    for (let i = 0; i < color.length; i++) color[i] = (i * 17) % 256;
    geometry.setAttribute('color', new T.BufferAttribute(color, 4, true));
    return geometry;
  }
  function checkMerged(sceneTransform) {
    const scene = new T.Scene();
    if (sceneTransform) {
      const ancestor = new T.Group(); ancestor.rotation.y = 0.2; ancestor.scale.set(1.2, 1.1, 1.3); ancestor.add(scene);
      scene.position.set(4, 5, 6); scene.rotation.set(0.1, 0.3, 0.2); scene.scale.set(1.4, 0.9, 1.1);
    }
    const sources = [0, 1, 2].map(i => {
      let g = addAttrs(new T.BoxGeometry(1, 2, 3));
      if (i === 1) g = g.toNonIndexed();
      const m = mesh(scene, g, new T.MeshStandardMaterial({ vertexColors: true }));
      m.position.set(10 + i * 2, 7 + i, 8 + i); m.rotation.set(i * 0.1, 0.3 + i * 0.2, 0.2); m.scale.set(1 + i * 0.2, 0.8, 1.3);
      m.castShadow = true; m.receiveShadow = true; m.renderOrder = 4; m.layers.set(2); m.frustumCulled = false;
      if (i === 2) { m.updateMatrix(); m.matrix.elements[4] += 0.1; m.matrixAutoUpdate = false; }
      return m;
    });
    const originalGeometry = sources.map(m => JSON.stringify(m.geometry.toJSON()));
    const originalMaterials = sources.map(m => JSON.stringify(m.material.toJSON()));
    const r = LPStaticBatches(T, sources, { chunkSize: 1000 });
    assert.deepEqual(r.stats, { sourceMeshes: 3, batchedMeshes: 3, batches: 1, triangles: 36 });
    const batch = r.roots[0]; assert.equal(batch.parent, scene); assert.equal(batch.material, sources[0].material);
    assert.equal(batch.castShadow, true); assert.equal(batch.receiveShadow, true); assert.equal(batch.renderOrder, 4);
    assert.equal(batch.layers.mask, 4); assert.equal(batch.frustumCulled, false); assertBounds(batch);
    let offset = 0, indexOffset = 0;
    for (const source of sources) {
      const originalNormal = new T.Matrix3().getNormalMatrix(source.matrixWorld);
      const mergedNormal = new T.Matrix3().getNormalMatrix(batch.matrixWorld);
      for (let i = 0; i < source.geometry.attributes.position.count; i++) {
        nearVector(new T.Vector3().fromBufferAttribute(source.geometry.attributes.position, i).applyMatrix4(source.matrixWorld),
          new T.Vector3().fromBufferAttribute(batch.geometry.attributes.position, offset + i).applyMatrix4(batch.matrixWorld), 0.00008);
        nearVector(new T.Vector3().fromBufferAttribute(source.geometry.attributes.normal, i).applyNormalMatrix(originalNormal),
          new T.Vector3().fromBufferAttribute(batch.geometry.attributes.normal, offset + i).applyNormalMatrix(mergedNormal));
        for (const name of ['uv', 'uv2', 'color']) {
          const a = source.geometry.attributes[name], b = batch.geometry.attributes[name];
          assert.equal(a.normalized, b.normalized); assert.equal(a.array.constructor, b.array.constructor);
          for (let j = 0; j < a.itemSize; j++) assert.equal(a.array[i * a.itemSize + j], b.array[(offset + i) * a.itemSize + j]);
        }
      }
      const count = source.geometry.index ? source.geometry.index.count : source.geometry.attributes.position.count;
      for (let i = 0; i < count; i++) assert.equal(batch.geometry.index.array[indexOffset++], offset + (source.geometry.index ? source.geometry.index.array[i] : i));
      offset += source.geometry.attributes.position.count;
    }
    sources.forEach((m, i) => { assert.equal(m.visible, false); assert.equal(JSON.stringify(m.geometry.toJSON()), originalGeometry[i]); assert.equal(JSON.stringify(m.material.toJSON()), originalMaterials[i]); });
    let ownDisposals = 0, forbiddenDisposals = 0;
    batch.geometry.addEventListener('dispose', () => ownDisposals++);
    sources.forEach(m => { m.geometry.addEventListener('dispose', () => forbiddenDisposals++); m.material.addEventListener('dispose', () => forbiddenDisposals++); });
    const second = LPStaticBatches(T, sources.concat(batch), { chunkSize: 1000 }); assert.equal(second.stats.batches, 0); second.dispose();
    r.dispose(); r.dispose(); assert.equal(ownDisposals, 1); assert.equal(forbiddenDisposals, 0); assert.equal(batch.parent, null);
    sources.forEach(m => { assert.equal(m.visible, true); assert.equal(m.parent, scene); });
  }
  test('merge: world positions, normals, UVs, uv2, normalized RGBA, indices, bounds, dispose', () => checkMerged(false));
  test('merge: transformed scene, ancestor, nonuniform scaling and manual shear', () => checkMerged(true));

  test('minimum size, visibility, supplied-only scope, de-duplication and spatial chunks', () => {
    const scene = new T.Scene(), sources = triple(scene), unseen = triple(scene), invisible = mesh(scene);
    invisible.visible = false;
    let r = LPStaticBatches(T, [sources[0], sources[1], sources[0]]); assert.equal(r.stats.sourceMeshes, 2); assert.equal(r.stats.batches, 0); r.dispose();
    sources[2].position.x = 60;
    r = LPStaticBatches(T, sources); assert.equal(r.stats.batches, 0); r.dispose();
    sources[2].position.x = 12;
    r = LPStaticBatches(T, [...sources, ...sources, invisible, null, new T.Group()]); assert.equal(r.stats.sourceMeshes, 4); assert.equal(r.stats.batches, 1);
    assert.ok(unseen.every(m => m.visible)); assert.equal(invisible.visible, false); r.dispose(); assert.equal(invisible.visible, false);
    const r2 = LPStaticBatches(T, sources); assert.equal(r2.stats.batches, 1); r2.dispose();
  });

  test('effective material signatures distinguish every requested and extra render value', () => {
    const edits = [
      m => m.color.setHex(0x112233), m => m.emissive.setHex(0x334455), m => m.emissiveIntensity = 0.2,
      m => m.roughness = 0.3, m => m.metalness = 0.7, m => m.map = new T.Texture(),
      m => m.lightMap = new T.Texture(), m => m.lightMapIntensity = 0.3, m => m.blending = T.NoBlending,
      m => m.alphaTest = 0.4, m => m.opacity = 0.7, m => m.side = T.DoubleSide, m => m.vertexColors = true,
      m => m.polygonOffset = true, m => m.polygonOffsetFactor = 2, m => m.envMapIntensity = 0.2,
      m => m.envMap = new T.Texture(), m => m.normalMap = new T.Texture(), m => m.normalScale.set(0.5, 0.7),
      m => m.aoMap = new T.Texture(), m => m.alphaMap = new T.Texture(), m => m.flatShading = true,
      m => m.depthFunc = T.AlwaysDepth, m => m.toneMapped = false, m => m.fog = false
    ];
    edits.forEach(edit => {
      const scene = new T.Scene(), a = triple(scene), varied = material(); edit(varied); const b = triple(scene, varied);
      const r = LPStaticBatches(T, [...a, ...b]); assert.equal(r.stats.batches, 2); assert.equal(r.stats.batchedMeshes, 6); r.dispose();
    });
    const scene = new T.Scene(), tex = new T.Texture(), a = material(), b = material(); a.map = tex; b.map = tex;
    a.name = 'eins'; b.name = 'zwei'; a.userData = { note: 'a' }; b.userData = { note: 'b' }; b.needsUpdate = true;
    const sources = [mesh(scene, undefined, a), mesh(scene, undefined, b), mesh(scene, undefined, a.clone())];
    const r = LPStaticBatches(T, sources); assert.equal(r.stats.batches, 1); r.dispose();
  });

  test('object render state, scene and attribute layouts cannot cross batches', () => {
    const edits = [m => m.castShadow = true, m => m.receiveShadow = true, m => m.renderOrder = 3,
      m => m.layers.set(3), m => m.frustumCulled = false, m => m.geometry.deleteAttribute('uv'),
      m => m.geometry.setAttribute('uv2', m.geometry.attributes.uv.clone()), m => addAttrs(m.geometry)];
    edits.forEach(edit => {
      const scene = new T.Scene(), a = triple(scene), b = triple(scene); b.forEach(edit);
      const r = LPStaticBatches(T, [...a, ...b]); assert.equal(r.stats.batches, 2); r.dispose();
    });
    const a = triple(new T.Scene()), b = triple(new T.Scene()); const r = LPStaticBatches(T, [...a, ...b]); assert.equal(r.stats.batches, 2); r.dispose();
  });

  test('unsupported meshes, buffers, materials and transforms safely remain visible', () => {
    const cases = [
      m => m.isSkinnedMesh = true, m => m.isInstancedMesh = true, m => m.add(new T.Object3D()),
      m => new T.Group().add(m), m => m.scale.x = -1, m => m.scale.set(-1, -1, 1), m => m.scale.y = 0,
      m => { m.matrixAutoUpdate = false; m.matrix.makeScale(-1, 1, 1); },
      m => m.geometry.deleteAttribute('normal'), m => m.geometry.isInstancedBufferGeometry = true,
      m => m.geometry.setAttribute('tangent', new T.BufferAttribute(new Float32Array(96), 4)),
      m => m.geometry.setAttribute('constructor', new T.BufferAttribute(new Float32Array(72), 3)),
      m => m.geometry.attributes.normal = new T.BufferAttribute(new Float32Array(48), 2),
      m => m.geometry.attributes.uv = new T.BufferAttribute(new Float32Array(6), 2),
      m => m.geometry.attributes.position.array[0] = NaN,
      m => m.geometry.attributes.normal.setUsage(T.DynamicDrawUsage),
      m => m.geometry.index.setUsage(T.DynamicDrawUsage),
      m => m.geometry.setAttribute('position', new T.InterleavedBufferAttribute(new T.InterleavedBuffer(new Float32Array(72), 3), 3, 0)),
      m => m.geometry.setAttribute('uv', new T.InstancedBufferAttribute(new Float32Array(48), 2)),
      m => m.geometry.morphAttributes.position = [m.geometry.attributes.position.clone()],
      m => m.morphTargetInfluences = [1], m => m.geometry.setDrawRange(3, 3), m => m.geometry.drawRange.count = NaN,
      m => m.geometry.index.array[0] = 9999, m => m.material = [m.material],
      m => m.material = new T.ShaderMaterial(), m => m.material = new T.RawShaderMaterial(),
      m => m.material.onBeforeCompile = function () {}, m => m.material.customProgramCacheKey = () => 'custom',
      m => m.onBeforeRender = function () {}, m => m.onAfterRender = function () {},
      m => m.material.transparent = true, m => m.material.visible = false, m => m.material.depthWrite = false,
      m => m.material.depthTest = false, m => m.material.blending = T.AdditiveBlending, m => m.material.stencilWrite = true,
      m => { m.material.normalMap = new T.Texture(); m.material.normalMapType = T.ObjectSpaceNormalMap; },
      m => m.material.displacementMap = new T.Texture(), m => m.customDepthMaterial = new T.MeshDepthMaterial(),
      m => m.animations.push(new T.AnimationClip('Bewegung', 1, [])), m => m.parent.scale.set(-1, -1, 1)
    ];
    cases.forEach((edit, i) => {
      const scene = new T.Scene(), sources = triple(scene); sources.forEach(edit);
      const r = LPStaticBatches(T, sources); assert.equal(r.stats.batches, 0, 'case ' + i); assert.ok(sources.every(m => m.visible)); r.dispose();
    });
    assert.equal(LPStaticBatches(T, [new T.Group(), null]).stats.sourceMeshes, 0);
  });

  test('merged Uint32 indices exceed 65535 without wrapping', () => {
    const scene = new T.Scene(); const sources = [0, 1, 2].map(() => mesh(scene, new T.PlaneGeometry(2, 2, 160, 160)));
    const r = LPStaticBatches(T, sources); assert.equal(r.stats.batches, 1); assert.equal(r.stats.triangles, 153600);
    const g = r.roots[0].geometry; assert.ok(g.index.array instanceof Uint32Array);
    assert.ok(Math.max(...g.index.array.subarray(g.index.count - 6)) > 65535); assertBounds(r.roots[0]); r.dispose();
  });

  function terrain(scene, transformed = false) {
    const g = new T.PlaneGeometry(560, 220, 200, 80).rotateX(-Math.PI / 2).translate(20, 0, 0);
    for (let i = 0; i < g.attributes.position.count; i++) {
      const x = g.attributes.position.getX(i), z = g.attributes.position.getZ(i);
      g.attributes.position.setY(i, Math.sin(x / 30) * Math.cos(z / 17));
    }
    g.computeVertexNormals(); addAttrs(g);
    if (!transformed) {
      const colors = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i++) colors[i] = (i % 101) / 100;
      g.setAttribute('color', new T.BufferAttribute(colors, 3));
    }
    const m = mesh(scene, g, new T.MeshStandardMaterial({ vertexColors: true }));
    m.castShadow = true; m.receiveShadow = true; m.renderOrder = 2; m.layers.enable(3);
    if (transformed) { scene.position.set(4, 3, 5); scene.rotation.y = 0.3; scene.scale.set(1.1, 0.9, 1.2); m.position.set(-5, 3, -7); m.rotation.set(0.1, 0.5, 0.2); m.scale.set(1.3, 0.7, 0.9); }
    return m;
  }
  function checkSplit(transformed) {
    const scene = new T.Scene(), source = terrain(scene, transformed);
    let forbiddenDisposals = 0;
    source.geometry.addEventListener('dispose', () => forbiddenDisposals++);
    source.material.addEventListener('dispose', () => forbiddenDisposals++);
    const before = JSON.stringify(source.geometry.toJSON()), matBefore = JSON.stringify(source.material.toJSON());
    const r = LPStaticBatches.split(T, source, { chunkSize: 48 });
    assert.equal(source.visible, false); assert.equal(source.parent, scene); assert.equal(r.stats.sourceMeshes, 1);
    assert.equal(r.stats.batchedMeshes, 1); assert.equal(r.stats.batches, r.roots.length); assert.equal(r.stats.triangles, 32000);
    assert.ok(r.roots.length > 20);
    const vertices = new Map(), expected = new Set();
    const pos = source.geometry.attributes.position, index = source.geometry.index.array;
    for (let i = 0; i < pos.count; i++) vertices.set(Array.from(pos.array.subarray(i * 3, i * 3 + 3)).join(','), i);
    for (let i = 0; i < index.length; i += 3) expected.add([index[i], index[i + 1], index[i + 2]].join(','));
    let disposeCount = 0, submittedTriangles = 0;
    const camera = new T.PerspectiveCamera(50, 1.6, 0.1, 180); camera.position.set(0, 50, 70); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const frustum = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    for (const chunk of r.roots) {
      assert.equal(chunk.parent, scene); assert.equal(chunk.material, source.material);
      assert.equal(chunk.castShadow, source.castShadow); assert.equal(chunk.receiveShadow, source.receiveShadow);
      assert.equal(chunk.renderOrder, source.renderOrder); assert.equal(chunk.layers.mask, source.layers.mask);
      assertBounds(chunk); assert.equal(chunk.matrixAutoUpdate, false);
      nearVector(new T.Vector3().setFromMatrixPosition(chunk.matrixWorld), new T.Vector3().setFromMatrixPosition(source.matrixWorld));
      const g = chunk.geometry, recovered = [];
      for (let i = 0; i < g.attributes.position.count; i++) {
        const original = vertices.get(Array.from(g.attributes.position.array.subarray(i * 3, i * 3 + 3)).join(','));
        assert.notEqual(original, undefined); recovered.push(original);
        for (const name of Object.keys(source.geometry.attributes)) {
          const a = source.geometry.attributes[name], b = g.attributes[name];
          assert.equal(a.normalized, b.normalized); assert.equal(a.array.constructor, b.array.constructor);
          for (let j = 0; j < a.itemSize; j++) assert.equal(a.array[original * a.itemSize + j], b.array[i * b.itemSize + j]);
        }
        nearVector(new T.Vector3().fromBufferAttribute(pos, original).applyMatrix4(source.matrixWorld), new T.Vector3().fromBufferAttribute(g.attributes.position, i).applyMatrix4(chunk.matrixWorld));
        nearVector(new T.Vector3().fromBufferAttribute(source.geometry.attributes.normal, original).applyNormalMatrix(new T.Matrix3().getNormalMatrix(source.matrixWorld)),
          new T.Vector3().fromBufferAttribute(g.attributes.normal, i).applyNormalMatrix(new T.Matrix3().getNormalMatrix(chunk.matrixWorld)));
      }
      let cell;
      for (let i = 0; i < g.index.count; i += 3) {
        const ids = [g.index.array[i], g.index.array[i + 1], g.index.array[i + 2]];
        assert.ok(expected.delete(ids.map(id => recovered[id]).join(',')), 'triangle lost, duplicated or reordered');
        const center = new T.Vector3(); ids.forEach(id => center.add(new T.Vector3().fromBufferAttribute(g.attributes.position, id)));
        center.multiplyScalar(1 / 3).applyMatrix4(chunk.matrixWorld);
        const current = [Math.floor(center.x / 48), Math.floor(center.z / 48)].join(',');
        if (cell === undefined) cell = current; else assert.equal(current, cell);
      }
      if (!transformed) { const bounds = g.boundingBox.getSize(new T.Vector3()); assert.ok(bounds.x <= 48 + 2 * 560 / 200); assert.ok(bounds.z <= 48 + 2 * 220 / 80); }
      if (frustum.intersectsObject(chunk)) submittedTriangles += g.index.count / 3;
      chunk.geometry.addEventListener('dispose', () => disposeCount++);
    }
    assert.equal(expected.size, 0); assert.equal(JSON.stringify(source.geometry.toJSON()), before); assert.equal(JSON.stringify(source.material.toJSON()), matBefore);
    assert.equal(LPStaticBatches(T, r.roots).stats.batches, 0);
    assert.equal(LPStaticBatches.split(T, source).stats.batches, 0);
    r.dispose(); r.dispose(); assert.equal(source.visible, true); assert.equal(disposeCount, r.roots.length); assert.equal(forbiddenDisposals, 0); assert.ok(r.roots.every(root => root.parent === null));
    console.log('terrain fixture', JSON.stringify({ transformed, chunks: r.roots.length, totalTriangles: 32000, frustumTriangles: submittedTriangles }));
    return r.stats;
  }
  test('split: full 32k terrain preserves every triangle, normal, UV, color and world position; tight bounds and dispose', () => checkSplit(false));
  test('split: rotated/scaled source and transformed scene preserve all data and world-space chunk assignment', () => checkSplit(true));

  test('split: no-op for nonindexed, invisible, child-bearing, shader, negative or single-chunk mesh', () => {
    const edits = [m => m.geometry = m.geometry.toNonIndexed(), m => m.visible = false, m => m.add(new T.Object3D()),
      m => m.material = new T.ShaderMaterial(), m => m.scale.x = -1, m => m.material = [m.material]];
    edits.forEach(edit => { const scene = new T.Scene(), m = terrain(scene); edit(m); const visible = m.visible;
      const r = LPStaticBatches.split(T, m); assert.equal(r.stats.batches, 0); assert.equal(m.visible, visible); assert.equal(scene.children.length, 1); r.dispose(); assert.equal(m.visible, visible); });
    const scene = new T.Scene(), m = mesh(scene); m.position.set(10, 10, 10);
    const r = LPStaticBatches.split(T, m); assert.equal(r.stats.batches, 0); assert.equal(m.visible, true); r.dispose();
    assert.equal(LPStaticBatches.split(T, new T.Group()).stats.sourceMeshes, 0); assert.equal(LPStaticBatches.split(T, null).stats.batches, 0);
  });

  test('fixture-only timings, furniture draw-count model and terrain culling model', () => {
    const scene = new T.Scene(), sources = [], mat = material();
    for (let chunk = 0; chunk < 10; chunk++) for (let i = 0; i < 30; i++) { const m = mesh(scene, new T.BoxGeometry(), mat); m.position.set(chunk * 48 + 5 + i / 10, 5, 5); sources.push(m); }
    const start = performance.now(), r = LPStaticBatches(T, sources); const mergeMs = performance.now() - start;
    assert.equal(r.stats.batches, 10); assert.equal(r.stats.batchedMeshes, 300); assert.equal(r.stats.triangles, 3600); r.dispose();
    const m = terrain(new T.Scene()); const before = performance.now(), split = LPStaticBatches.split(T, m); const splitMs = performance.now() - before; split.dispose();
    console.log('GEMESSEN isolated module fixture', JSON.stringify({ revision: T.REVISION, furnitureSources: 300, furnitureBatches: 10, mergeMs: +mergeMs.toFixed(2), terrainTriangles: 32000, terrainChunks: split.stats.batches, splitMs: +splitMs.toFixed(2) }));
  });
  console.log(`${checks} ok, 0 Fehler`);
}
try {
  vm.runInContext('(' + fixture.toString() + ')()', context, { filename: 'static-batches-fixture.js' });
} catch (error) {
  console.error(error.stack.split('\n').filter(line => line.length < 600).join('\n'));
  process.exitCode = 1;
}
