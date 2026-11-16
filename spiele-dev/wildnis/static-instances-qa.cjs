"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
global.window = global;
const base = path.resolve(__dirname, "../..");
const THREE = require(path.join(base, "js/vendor/three.min.js"));
vm.runInThisContext(
  fs.readFileSync(path.join(base, "js/wildnis/static-instances.js"), "utf8"),
);
assert.equal(THREE.REVISION, "128");
let checks = 0;
function test(name, run) {
  run();
  checks++;
  console.log("OK " + name);
}
function near(a, b, epsilon = 2e-5) {
  assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`);
}
function vector(a, b) {
  near(a.x, b.x);
  near(a.y, b.y);
  near(a.z, b.z);
}
function pair(scene, geometry, material, x = 100, z = 100) {
  const root = new THREE.Group();
  scene.add(root);
  const a = new THREE.Mesh(geometry, material),
    b = new THREE.Mesh(geometry, material);
  a.position.set(x, 0, z);
  b.position.set(x + 4, 0, z);
  root.add(a, b);
  return { root, a, b };
}
const geometry = new THREE.BoxGeometry(2, 3, 2);
const material = new THREE.MeshStandardMaterial();
let fixture, result;
test("Verschachtelte Weltmatrizen, keine doppelten Quellen, originale Knoten unverändert", () => {
  const scene = new THREE.Scene(),
    outer = new THREE.Group(),
    nested = new THREE.Group();
  scene.add(outer);
  outer.add(nested);
  outer.position.set(98, 3, 102);
  outer.rotation.y = 0.31;
  outer.scale.setScalar(1.25);
  nested.rotation.y = -0.18;
  nested.position.set(2, 1, 0);
  const meshes = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(geometry, material);
    nested.add(m);
    m.position.set(i * 3, i, 0);
    m.rotation.set(0.12, 0.2, -0.1);
    m.scale.set(1.2, 0.8, 1.5);
    m.layers.set(3);
    m.castShadow = true;
    m.receiveShadow = true;
    m.renderOrder = 7;
    return m;
  });
  scene.updateMatrixWorld(true);
  const matrices = meshes.map((m) => m.matrixWorld.clone());
  const before = [outer, nested, ...meshes].map((m) => ({
    parent: m.parent,
    auto: m.matrixAutoUpdate,
    local: m.matrix.clone(),
  }));
  const children = nested.children.slice();
  let added = 0;
  scene.addEventListener("added", () => {});
  const originalAdd = scene.add;
  scene.add = function (node) {
    assert.ok(meshes.every((m) => m.visible));
    added++;
    return originalAdd.call(this, node);
  };
  result = NWStaticInstances(THREE, [outer, nested, meshes[0], outer], {
    chunkSize: 48,
  });
  scene.add = originalAdd;
  assert.equal(added, 1);
  assert.equal(result.roots.length, 1);
  assert.equal(result.stats.batchedMeshes, 3);
  assert.equal(result.stats.sourceMeshes, 3);
  const batch = result.roots[0];
  assert.equal(batch.count, 3);
  assert.equal(batch.parent, scene);
  assert.equal(batch.frustumCulled, true);
  assert.ok(batch.matrixWorld.equals(new THREE.Matrix4()));
  assert.equal(batch.layers.mask, meshes[0].layers.mask);
  assert.equal(batch.castShadow, true);
  assert.equal(batch.receiveShadow, true);
  assert.equal(batch.renderOrder, 7);
  assert.equal(batch.material, material);
  assert.notEqual(batch.geometry, geometry);
  assert.deepEqual(nested.children, children);
  [outer, nested, ...meshes].forEach((m, i) => {
    assert.equal(m.parent, before[i].parent);
    assert.equal(m.matrixAutoUpdate, before[i].auto);
    assert.ok(m.matrix.equals(before[i].local));
  });
  assert.ok(outer.visible && nested.visible && meshes.every((m) => !m.visible));
  fixture = { scene, outer, nested, meshes, matrices, batch };
});
test("Jede Instanzmatrix entspricht Float32(matrixWorld); alle echten Vertices in Weltbounds", () => {
  const { batch, matrices } = fixture,
    p = geometry.attributes.position;
  matrices.forEach((sourceMatrix, i) => {
    const actual = new THREE.Matrix4();
    batch.getMatrixAt(i, actual);
    assert.deepEqual(
      actual.elements,
      Array.from(new Float32Array(sourceMatrix.elements)),
    );
    for (let v = 0; v < p.count; v++) {
      const local = new THREE.Vector3().fromBufferAttribute(p, v);
      const original = local.clone().applyMatrix4(sourceMatrix),
        instanced = local.clone().applyMatrix4(actual);
      vector(original, instanced);
      for (const point of [original, instanced]) {
        assert.ok(batch.geometry.boundingBox.containsPoint(point));
        assert.ok(batch.geometry.boundingSphere.containsPoint(point));
      }
    }
  });
});
test("Echte Raycasts liefern dieselben Treffer/Instanz-IDs bei entfernten Weltpositionen", () => {
  const { batch, meshes, matrices } = fixture;
  meshes.forEach((mesh, i) => {
    const center = new THREE.Vector3().setFromMatrixPosition(matrices[i]);
    const ray = new THREE.Raycaster(
      center.clone().add(new THREE.Vector3(0, 20, 0)),
      new THREE.Vector3(0, -1, 0),
    );
    const expected = [];
    mesh.raycast(ray, expected);
    assert.ok(expected.length);
    const actual = [];
    batch.raycast(ray, actual);
    const hits = actual.filter((h) => h.instanceId === i);
    assert.ok(hits.length);
    expected.sort((a, b) => a.distance - b.distance);
    hits.sort((a, b) => a.distance - b.distance);
    vector(hits[0].point, expected[0].point);
    near(hits[0].distance, expected[0].distance);
    assert.equal(hits[0].object, batch);
  });
});
test("Echter r128-Frustumtest sieht entfernte Instanzen und verwirft abgewandte Sicht", () => {
  const { batch } = fixture,
    center = batch.geometry.boundingSphere.center;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  camera.position.copy(center).add(new THREE.Vector3(0, 4, 30));
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  );
  assert.ok(frustum.intersectsObject(batch));
  const plain = new THREE.InstancedMesh(geometry, material, 1);
  plain.updateMatrixWorld();
  assert.equal(
    frustum.intersectsObject(plain),
    false,
    "Lokale Standardbounds würden fälschlich cullen",
  );
  camera.lookAt(camera.position.clone().add(new THREE.Vector3(0, 0, 30)));
  camera.updateMatrixWorld(true);
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  );
  assert.equal(frustum.intersectsObject(batch), false);
});
test("Dispose ist idempotent, stellt Sichtbarkeit her und entsorgt nur eigene Ressourcen", () => {
  let geometryDisposed = 0,
    materialDisposed = 0,
    textureDisposed = 0,
    ownDisposed = 0,
    buffersDisposed = 0;
  const texture = new THREE.Texture();
  material.map = texture;
  geometry.addEventListener("dispose", () => geometryDisposed++);
  material.addEventListener("dispose", () => materialDisposed++);
  texture.addEventListener("dispose", () => textureDisposed++);
  fixture.batch.geometry.addEventListener("dispose", () => ownDisposed++);
  fixture.batch.addEventListener("dispose", () => buffersDisposed++);
  result.dispose();
  result.dispose();
  assert.equal(ownDisposed, 1);
  assert.equal(buffersDisposed, 1);
  assert.equal(geometryDisposed + materialDisposed + textureDisposed, 0);
  assert.equal(fixture.batch.parent, null);
  assert.ok(fixture.meshes.every((m) => m.visible));
  material.map = null;
});
test("Material, Geometrie, Layer, Schatten, RenderOrder, XZ-Zellen und Szenen bleiben getrennt", () => {
  const scene = new THREE.Scene(),
    sources = [],
    pairs = [];
  function add(g, m, x, z, adjust) {
    const p = pair(scene, g, m, x, z);
    if (adjust) [p.a, p.b].forEach(adjust);
    sources.push(p.root);
    pairs.push(p);
  }
  add(geometry, material, 100, 100);
  const differentMaterial = material.clone();
  differentMaterial.color.setHex(0xff5522);
  add(geometry, differentMaterial, 100, 100);
  const differentGeometry = geometry.clone();
  differentGeometry.translate(1, 0, 0);
  add(differentGeometry, material, 100, 100);
  add(geometry, material, 100, 100, (m) => m.layers.set(2));
  add(geometry, material, 100, 100, (m) => {
    m.castShadow = true;
  });
  add(geometry, material, 100, 100, (m) => {
    m.receiveShadow = true;
  });
  add(geometry, material, 100, 100, (m) => {
    m.renderOrder = 3;
  });
  add(geometry, material, -20, 100);
  add(geometry, material, 100, -20);
  const second = new THREE.Scene(),
    other = pair(second, geometry, material);
  sources.push(other.root);
  const r = NWStaticInstances(THREE, sources);
  assert.equal(r.roots.length, 10);
  assert.equal(r.stats.instances, 20);
  r.roots.forEach((b) => assert.equal(b.count, 2));
  r.dispose();
});
test("Bytegleiche Geometrie- und Materialklone werden zusammengefasst, Unterschiede bleiben getrennt", () => {
  const scene = new THREE.Scene(),
    p = pair(scene, geometry, material);
  p.b.geometry = geometry.clone();
  p.b.material = material.clone();
  const r = NWStaticInstances(THREE, [p.root]);
  assert.equal(r.roots.length, 1);
  assert.equal(r.roots[0].count, 2);
  r.dispose();
  p.b.material.roughness = 0.37;
  const changed = NWStaticInstances(THREE, [p.root]);
  assert.equal(changed.roots.length, 0);
  assert(p.a.visible && p.b.visible);
  changed.dispose();
});
test("Unsichere Meshes und Hierarchien bleiben sichtbar; Alpha-Test ist erlaubt", () => {
  const scene = new THREE.Scene(),
    sources = [],
    excluded = [];
  function reject(change) {
    const p = pair(scene, geometry, material);
    change(p);
    sources.push(p.root);
    excluded.push(p);
  }
  reject((p) => {
    p.a.material = p.b.material = new THREE.MeshBasicMaterial({
      transparent: true,
    });
  });
  reject((p) => {
    p.a.material = p.b.material = [material];
  });
  reject((p) => {
    p.a.material = p.b.material = new THREE.ShaderMaterial();
  });
  for (const config of [
    { stencilWrite: true },
    { depthWrite: false },
    { displacementMap: new THREE.Texture() },
  ]) {
    reject((p) => {
      p.a.material = p.b.material = new THREE.MeshStandardMaterial(config);
    });
  }
  reject((p) => {
    const m = material.clone();
    m.onBeforeCompile = () => {};
    p.a.material = p.b.material = m;
  });
  reject((p) => {
    p.a.onBeforeRender = p.b.onBeforeRender = () => {};
  });
  reject((p) => {
    p.root.onAfterRender = () => {};
  });
  reject((p) => {
    p.root.animations = [
      new THREE.AnimationClip("move", 1, [
        new THREE.NumberKeyframeTrack(".position[x]", [0, 1], [0, 5]),
      ]),
    ];
  });
  reject((p) => {
    p.a.animations = [new THREE.AnimationClip("move", 1, [])];
  });
  reject((p) => {
    p.a.scale.x = p.b.scale.x = -1;
  });
  reject((p) => {
    p.root.scale.set(2, 1, 1);
    p.a.rotation.y = p.b.rotation.y = 0.4;
  });
  reject((p) => {
    p.root.visible = false;
  });
  reject((p) => {
    p.a.visible = p.b.visible = false;
  });
  reject((p) => {
    p.a.morphTargetInfluences = p.b.morphTargetInfluences = [0];
  });
  reject((p) => {
    const g = geometry.clone();
    g.morphAttributes.position = [g.attributes.position.clone()];
    p.a.geometry = p.b.geometry = g;
  });
  reject((p) => {
    const g = geometry.clone();
    g.attributes.position.array[0] = NaN;
    p.a.geometry = p.b.geometry = g;
  });
  reject((p) => {
    const g = geometry.clone();
    g.index.array[0] = 60000;
    p.a.geometry = p.b.geometry = g;
  });
  reject((p) => {
    p.root.clear();
    p.a = new THREE.SkinnedMesh(geometry, material);
    p.b = new THREE.SkinnedMesh(geometry, material);
    p.root.add(p.a, p.b);
  });
  reject((p) => {
    const parent = new THREE.Group();
    parent.animations = [new THREE.AnimationClip("move", 1, [])];
    scene.add(parent);
    parent.add(p.root);
  });
  const alpha = pair(
    scene,
    geometry,
    new THREE.MeshBasicMaterial({
      alphaTest: 0.5,
      alphaMap: new THREE.Texture(),
    }),
  );
  const singleton = new THREE.Mesh(geometry.clone(), material);
  scene.add(singleton);
  const visibility = excluded.map((p) => [p.a.visible, p.b.visible]);
  const r = NWStaticInstances(THREE, [...sources, alpha.root, singleton]);
  assert.equal(r.roots.length, 1);
  assert.equal(r.stats.batchedMeshes, 2);
  excluded.forEach((p, i) =>
    assert.deepEqual([p.a.visible, p.b.visible], visibility[i]),
  );
  const moving = excluded.find((p) => p.root.animations[0]?.tracks.length);
  const mixer = new THREE.AnimationMixer(moving.root);
  mixer.clipAction(moving.root.animations[0]).play();
  mixer.update(0.5);
  near(moving.root.position.x, 2.5);
  assert.ok(moving.a.visible && moving.b.visible);
  assert.ok(singleton.visible);
  r.dispose();
  assert.ok(alpha.a.visible && alpha.b.visible);
});
test("Transformierte Szene abgelehnt und Fehler nach Teilaufbau vollständig zurückgerollt", () => {
  const scene = new THREE.Scene(),
    p = pair(scene, geometry, material);
  scene.position.x = 3;
  let r = NWStaticInstances(THREE, [p.root]);
  assert.equal(r.roots.length, 0);
  assert.ok(p.a.visible);
  r.dispose();
  scene.position.x = 0;
  const otherMaterial = material.clone();
  otherMaterial.roughness = 0.24;
  const q = pair(scene, geometry, otherMaterial);
  const add = scene.add;
  let count = 0,
    disposed = 0;
  scene.add = function (node) {
    node.geometry.addEventListener("dispose", () => disposed++);
    if (++count === 2) throw new Error("synthetischer Fehler");
    return add.call(this, node);
  };
  assert.throws(
    () => NWStaticInstances(THREE, [p.root, q.root]),
    /synthetischer Fehler/,
  );
  scene.add = add;
  assert.ok([p.a, p.b, q.a, q.b].every((m) => m.visible));
  assert.equal(disposed, 2);
  assert.equal(scene.children.filter((n) => n.isInstancedMesh).length, 0);
});
console.log(`${checks} ok, 0 Fehler (Three.js r${THREE.REVISION})`);
