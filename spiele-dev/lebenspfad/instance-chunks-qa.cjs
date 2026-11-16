"use strict";
const assert = require("node:assert/strict");
const path = require('node:path').resolve(__dirname, '../..');
const THREE = require(path + "/js/vendor/three.min.js");
global.window = {};
require(path + "/js/lebenspfad/instance-chunks.js");
const split = window.LPInstanceChunks;
assert.equal(THREE.REVISION, "128");
let checks = 0;
function test(name, fn) { fn(); checks++; console.log("OK " + name); }
function close(a, b) { assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`); }
function vector(a, b) { close(a.x, b.x); close(a.y, b.y); close(a.z, b.z); }
function snapshot(mesh) {
  return { matrix: Array.from(mesh.instanceMatrix.array), colors: mesh.instanceColor && Array.from(mesh.instanceColor.array),
    positions: Array.from(mesh.geometry.attributes.position.array), box: mesh.geometry.boundingBox,
    sphere: mesh.geometry.boundingSphere, world: mesh.matrixWorld.elements.slice() };
}
function create(scene, positions, color = true) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 4, 6), new THREE.MeshStandardMaterial(), positions.length + 2);
  const object = new THREE.Object3D();
  positions.forEach((p, i) => {
    object.position.set(...p); object.rotation.set(i * .12, i * .35, i * .07);
    object.scale.set(1 + i * .1, .7 + i * .04, 1.3 + i * .2); object.updateMatrix();
    mesh.setMatrixAt(i, object.matrix);
    if (color) mesh.setColorAt(i, new THREE.Color(.13 * i, .17 * i, .91 - i * .09));
  });
  mesh.count = positions.length; scene.add(mesh); return mesh;
}
let scene = new THREE.Scene();
scene.position.set(7, -4, 11); scene.rotation.y = .24; scene.scale.setScalar(1.2);
let source = create(scene, [[-120, 0, -100], [-119, 3, -101], [0, 2, 0], [2, -1, 2], [90, 4, 80], [210, 1, 180]]);
source.position.set(13, 3, -4); source.rotation.set(.2, .4, -.1); source.scale.set(1.4, .8, 2);
source.castShadow = true; source.receiveShadow = true; source.renderOrder = 7; source.layers.set(2);
scene.updateMatrixWorld(true);
const before = snapshot(source);
const result = split(THREE, [source, source], { chunkSize: 48 });
test("r128: aktive Counts, eindeutige Quellen, Dreiecke, mehrere Chunks", () => {
  assert.equal(result.stats.sourceMeshes, 1); assert.equal(result.stats.sourceInstances, 6);
  assert.equal(result.stats.chunkedInstances, 6); assert.equal(result.stats.totalTriangles, 72);
  assert.equal(result.roots.reduce((n, root) => n + root.count, 0), source.count);
  assert.ok(result.roots.length > 1); assert.equal(source.visible, false);
});
test("Instanzmatrizen, Farben und Weltgeometrie bitgenau bzw. numerisch gleich", () => {
  const originals = new Map();
  for (let i = 0; i < source.count; i++) originals.set(Array.from(source.instanceMatrix.array.slice(i * 16, i * 16 + 16)).join(), i);
  const found = new Set();
  result.roots.forEach(root => {
    assert.deepEqual(root.matrix.elements, source.matrix.elements);
    assert.deepEqual(root.matrixWorld.elements, source.matrixWorld.elements);
    assert.equal(root.matrixAutoUpdate, false); assert.equal(root.frustumCulled, true);
    assert.equal(root.material, source.material); assert.equal(root.parent, scene);
    for (const key of ["castShadow", "receiveShadow", "renderOrder"]) assert.equal(root[key], source[key]);
    assert.equal(root.layers.mask, source.layers.mask);
    for (let j = 0; j < root.count; j++) {
      const values = Array.from(root.instanceMatrix.array.slice(j * 16, j * 16 + 16));
      const i = originals.get(values.join()); assert.ok(i !== undefined); assert.ok(!found.has(i)); found.add(i);
      assert.deepEqual(Array.from(root.instanceColor.array.slice(j * 3, j * 3 + 3)), before.colors.slice(i * 3, i * 3 + 3));
      const m1 = new THREE.Matrix4(), m2 = new THREE.Matrix4(); source.getMatrixAt(i, m1); root.getMatrixAt(j, m2);
      for (let v = 0; v < source.geometry.attributes.position.count; v++) {
        const original = new THREE.Vector3().fromBufferAttribute(source.geometry.attributes.position, v).applyMatrix4(m1).applyMatrix4(source.matrixWorld);
        const actual = new THREE.Vector3().fromBufferAttribute(root.geometry.attributes.position, v).applyMatrix4(m2).applyMatrix4(root.matrixWorld);
        vector(original, actual);
      }
    }
  });
  assert.equal(found.size, source.count);
});
test("Chunk-Bounds umfassen jede transformierte Basisbox und alle Eckpunkte", () => {
  const base = new THREE.Box3().setFromBufferAttribute(source.geometry.attributes.position);
  result.roots.forEach(root => {
    const expected = new THREE.Box3(), matrix = new THREE.Matrix4();
    for (let i = 0; i < root.count; i++) {
      root.getMatrixAt(i, matrix); expected.union(base.clone().applyMatrix4(matrix));
      for (let v = 0; v < root.geometry.attributes.position.count; v++) {
        const point = new THREE.Vector3().fromBufferAttribute(root.geometry.attributes.position, v).applyMatrix4(matrix);
        assert.ok(root.geometry.boundingBox.containsPoint(point));
        assert.ok(point.distanceTo(root.geometry.boundingSphere.center) <= root.geometry.boundingSphere.radius + 1e-7);
      }
    }
    vector(root.geometry.boundingBox.min, expected.min); vector(root.geometry.boundingBox.max, expected.max);
    assert.notEqual(root.geometry, source.geometry);
    assert.notEqual(root.geometry.attributes.position.array, source.geometry.attributes.position.array);
  });
  assert.deepEqual(snapshot(source), before);
});
test("r128-Frustum: nah sichtbar, jenseits Far-Plane verworfen, Randüberhang sichtbar", () => {
  const s = new THREE.Scene(), mesh = create(s, [[0, 0, -10], [0, 0, -500]], false);
  const r = split(THREE, [mesh]);
  const camera = new THREE.PerspectiveCamera(60, 1, .1, 50); camera.updateMatrixWorld(true);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const near = r.roots.find(root => root.geometry.boundingSphere.center.z > -100);
  const far = r.roots.find(root => root.geometry.boundingSphere.center.z < -100);
  assert.equal(frustum.intersectsObject(near), true); assert.equal(frustum.intersectsObject(far), false);
  assert.equal(near.instanceColor, null);
  const edge = create(s, [[60, 0, -15]], false);
  edge.setMatrixAt(0, new THREE.Matrix4().compose(new THREE.Vector3(60, 0, -15), new THREE.Quaternion(), new THREE.Vector3(60, 1, 1)));
  const e = split(THREE, [edge]); assert.equal(frustum.intersectsObject(e.roots[0]), true);
  r.dispose(); e.dispose();
});
test("Negativzellen und Chunk-Grenzen, world X/Z statt nur lokale Translation", () => {
  const s = new THREE.Scene(), mesh = create(s, [[-48.1, 0, 0], [-48, 0, 0], [-.1, 0, 0], [0, 0, 0], [48, 0, 0]], false);
  const r = split(THREE, [mesh]); assert.equal(r.roots.length, 4); r.dispose();
  const rotated = create(s, [[-30, 0, 0], [30, 0, 0]], false); rotated.position.x = 5; rotated.rotation.y = Math.PI / 2;
  const rr = split(THREE, [rotated]); assert.equal(rr.roots.length, 2);
  assert.ok(rr.roots.every(root => root.name.includes(":0,"))); rr.dispose();
});
test("Unsichere Quellen bleiben unverändert sichtbar", () => {
  const cases = [
    m => { m.material.transparent = true; }, m => { m.material = [m.material]; },
    m => { m.animations.push({}); }, m => { m.geometry.morphAttributes.position = [m.geometry.attributes.position.clone()]; },
    m => { m.geometry.setAttribute("offset", new THREE.InstancedBufferAttribute(new Float32Array(3), 3)); },
    m => { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }, m => { m.onBeforeRender = function () {}; },
    m => { m.material.onBeforeCompile = function () {}; }, m => { m.material.displacementMap = new THREE.Texture(); },
    m => { m.setMatrixAt(0, new THREE.Matrix4().makeScale(-1, 1, 1)); },
    m => { m.instanceMatrix.array[0] = NaN; }, m => { const group = new THREE.Group(); m.parent.add(group); group.add(m); },
    m => { m.matrixAutoUpdate = false; m.matrix.elements[4] = 2; },
    m => { m.count = 0; }
  ];
  cases.forEach(change => {
    const s = new THREE.Scene(), mesh = create(s, [[0, 0, -10]]); change(mesh);
    const r = split(THREE, [mesh]); assert.equal(r.roots.length, 0); assert.equal(mesh.visible, true); r.dispose();
  });
  const s = new THREE.Scene(), mesh = create(s, [[0, 0, 0]]); mesh.visible = false;
  const r = split(THREE, [mesh]); assert.equal(r.roots.length, 0); r.dispose(); assert.equal(mesh.visible, false);
});
test("Cleanup: eigene Instanzpuffer/Geometrien je einmal, Quellen nie entsorgt", () => {
  let geoDisposed = 0, instancesDisposed = 0, sourceDisposed = 0;
  source.geometry.addEventListener("dispose", () => sourceDisposed++);
  source.material.addEventListener("dispose", () => sourceDisposed++);
  source.addEventListener("dispose", () => sourceDisposed++);
  result.roots.forEach(root => {
    root.addEventListener("dispose", () => instancesDisposed++);
    root.geometry.addEventListener("dispose", () => geoDisposed++);
  });
  const repeated = split(THREE, result.roots); assert.equal(repeated.roots.length, 0); repeated.dispose();
  result.dispose(); result.dispose();
  assert.equal(geoDisposed, result.roots.length); assert.equal(instancesDisposed, result.roots.length);
  assert.equal(sourceDisposed, 0); assert.equal(source.visible, true);
  assert.ok(result.roots.every(root => root.parent === null)); assert.deepEqual(snapshot(source), before);
});
console.log(`${checks} ok, 0 Fehler (THREE r${THREE.REVISION}; keine FPS-Messung)`);
