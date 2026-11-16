"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../..");
const THREE = require(path.join(root, "js/vendor/three.min.js"));
const guardedMath = Object.create(Math);
guardedMath.random = () => { throw Error("LPWaterside darf Math.random nicht verwenden"); };
// THREE bleibt ausserhalb des Sandbox-Kontexts: seine UUID-Erzeugung ist kein Spielzufall.
const context = { window: {}, Math: guardedMath, Float32Array,
  srand() { throw Error("Spielzufall verwendet"); } };
vm.createContext(context);
for (const file of ["waterside.js", "instance-chunks.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js/lebenspfad", file), "utf8"), context, { filename: file });
}
let passed = 0, failed = 0;
function test(name, run) {
  try { run(); passed++; console.log("OK " + name); }
  catch (error) { failed++; console.error("FEHLER " + name + ": " + error.message); }
}
function vertices(mesh, index) {
  const m = new THREE.Matrix4();
  mesh.updateWorldMatrix(true, false);
  if (mesh.isInstancedMesh) { mesh.getMatrixAt(index, m); m.premultiply(mesh.matrixWorld); }
  else m.copy(mesh.matrixWorld);
  const a = mesh.geometry.attributes.position, result = [];
  for (let i = 0; i < a.count; i++) result.push(new THREE.Vector3().fromBufferAttribute(a, i).applyMatrix4(m));
  return result;
}
function build(slope) {
  const basins = [
    { x: -90, z: -12, rx: 9, rz: 4.5, y: -.12 },
    { x: 30, z: 18, rx: 4, rz: 10, y: .16, legacy: true },
    { x: 320, z: -8, rx: 6.5, rz: 7.5, y: 2.2 }
  ];
  const fields = basins.flatMap(p => [
    { x: p.x + p.rx + 20, z: p.z + 3, type: "m", marker: Object.freeze({ value: 17 }) },
    { x: p.x - p.rx - 22, z: p.z - 8, type: "e" }
  ]);
  fields.forEach(Object.freeze); Object.freeze(fields);
  basins.forEach(Object.freeze); Object.freeze(basins);
  const terrainHeight = slope ? (x, z) => .33 + .001 * x + .004 * z : () => .33;
  const scene = new THREE.Scene(), before = JSON.stringify({ fields, basins });
  const result = context.window.LPWaterside(THREE, { scene, basins, fields, terrainHeight });
  assert.equal(JSON.stringify({ fields, basins }), before, "Eingaben wurden verändert");
  return { scene, basins, fields, terrainHeight, result };
}
let fixtures;
test("THREE r128, kein Modulzufall, unveränderte gefrorene Felder und Becken", () => {
  assert.equal(THREE.REVISION, "128");
  fixtures = [build(false), build(true)];
  const again = build(false);
  fixtures[0].result.roots.forEach((mesh, i) => {
    const other = again.result.roots[i];
    assert.deepEqual(mesh.geometry.attributes.position.array, other.geometry.attributes.position.array);
    if (mesh.isInstancedMesh) assert.deepEqual(mesh.instanceMatrix.array, other.instanceMatrix.array);
  });
});
test("Diskrete direkte Scene-Kinder, endliche Weltgeometrie und freie Feldscheiben", () => {
  assert.ok(fixtures);
  for (const f of fixtures) {
    assert.ok(f.result.roots.length > 0);
    assert.equal(new Set(f.result.roots).size, f.result.roots.length);
    for (const mesh of f.result.roots) {
      assert.equal(mesh.parent, f.scene); assert.equal(mesh.children.length, 0);
      assert.ok(mesh.isMesh); assert.equal(mesh.material.type, "MeshStandardMaterial");
      for (const a of Object.values(mesh.geometry.attributes)) assert.ok(a.array.every(Number.isFinite));
      const index = mesh.geometry.index;
      if (index) assert.ok(index.array.every(i => i >= 0 && i < mesh.geometry.attributes.position.count));
      for (let i = 0; i < (mesh.isInstancedMesh ? mesh.count : 1); i++) {
        for (const p of vertices(mesh, i)) {
          assert.ok([p.x, p.y, p.z].every(Number.isFinite));
          for (const field of f.fields) assert.ok(Math.hypot(p.x - field.x, p.z - field.z) > 5.5, "Dekoration verdeckt Feld");
        }
      }
    }
  }
});
test("Ufersäume folgen flachem/schrägem Rohgelände; Pflanzen liegen am jeweiligen Wasser", () => {
  assert.ok(fixtures);
  for (const f of fixtures) {
    const shores = f.result.roots.filter(m => !m.isInstancedMesh);
    assert.ok(shores.length > 0);
    for (const shore of shores) for (const p of vertices(shore)) {
      const basin = f.basins.reduce((a, b) => Math.hypot(p.x - a.x, p.z - a.z) < Math.hypot(p.x - b.x, p.z - b.z) ? a : b);
      const radial = Math.hypot((p.x - basin.x) / basin.rx, (p.z - basin.z) / basin.rz);
      assert.ok(radial > .8 && radial < 1.5, "Ufer liegt nicht am Beckenrand");
      assert.ok(p.y >= f.terrainHeight(p.x, p.z) - .35 - 1e-5, "Ufer im Gelände versunken");
      assert.ok(p.y >= basin.y - 1e-5, "Ufer unter Wasser");
    }
    const pads = f.result.roots.filter(m => m.isInstancedMesh && m.geometry.type === "CircleGeometry");
    assert.ok(pads.length > 0, "Keine Wasserpflanzen");
    for (const mesh of pads) for (let i = 0; i < mesh.count; i++) for (const p of vertices(mesh, i)) {
      assert.ok(f.basins.some(b => Math.hypot((p.x - b.x) / b.rx, (p.z - b.z) / b.rz) < 1 &&
        p.y >= b.y && p.y < b.y + .2), "Seerose ausserhalb/unterhalb des Wassers");
    }
  }
});
test("Stege überqueren den Wasserrand, Pfosten erreichen Grund, legacy erzeugt keinen Steg", () => {
  assert.ok(fixtures);
  for (const f of fixtures) {
    const wood = f.result.roots.filter(m => m.isInstancedMesh && m.geometry.type === "BoxGeometry");
    assert.ok(wood.length > 0);
    const decks = new Map();
    for (const mesh of wood) for (let i = 0; i < mesh.count; i++) {
      const points = vertices(mesh, i), box = new THREE.Box3().setFromPoints(points), center = box.getCenter(new THREE.Vector3());
      const b = f.basins.reduce((a, b) => center.distanceToSquared(new THREE.Vector3(a.x, center.y, a.z)) <
        center.distanceToSquared(new THREE.Vector3(b.x, center.y, b.z)) ? a : b);
      assert.ok(!b.legacy, "Steg am legacy-Becken");
      const size = box.getSize(new THREE.Vector3());
      if (size.y < .3) {
        assert.ok(box.min.y > b.y, "Deck unter Wasser");
        for (const p of points) assert.ok(p.y >= f.terrainHeight(p.x, p.z) - .35, "Deck im Gelände");
        if (!decks.has(b)) decks.set(b, []);
        decks.get(b).push(...points.map(p => Math.hypot((p.x - b.x) / b.rx, (p.z - b.z) / b.rz)));
      } else {
        assert.ok(box.min.y <= f.terrainHeight(center.x, center.z) - .35 + 1e-5, "Pfosten schwebt über Grund");
        assert.ok(box.max.y > b.y, "Pfosten endet unter Wasser");
      }
    }
    for (const b of f.basins.filter(b => !b.legacy)) {
      const radii = decks.get(b); assert.ok(radii && Math.min(...radii) < 1 && Math.max(...radii) > 1, "Steg erreicht Ufer/Wasser nicht");
    }
  }
});
test("Chunker akzeptiert jede Instanzquelle, echte Welt-Bounds und Fern-Frustum", () => {
  assert.ok(fixtures);
  for (const f of fixtures) {
    const sources = f.result.roots.filter(m => m.isInstancedMesh);
    const chunked = context.window.LPInstanceChunks(THREE, sources, { chunkSize: 32 });
    assert.equal(chunked.stats.skippedMeshes, 0);
    assert.equal(chunked.stats.chunkedMeshes, sources.length);
    assert.equal(chunked.stats.chunkedInstances, sources.reduce((n, m) => n + m.count, 0));
    for (const mesh of chunked.roots) for (let i = 0; i < mesh.count; i++) for (const p of vertices(mesh, i)) {
      assert.ok(mesh.geometry.boundingBox.containsPoint(p));
      assert.ok(p.distanceTo(mesh.geometry.boundingSphere.center) <= mesh.geometry.boundingSphere.radius + 1e-5);
    }
    const camera = new THREE.PerspectiveCamera(60, 1.5, .1, 100);
    camera.position.set(-90, 20, 35); camera.lookAt(-90, 0, -12); camera.updateMatrixWorld(true);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    assert.ok(chunked.roots.some(m => frustum.intersectsObject(m)), "Nahe Ufer fehlen");
    const far = chunked.roots.filter(m => m.geometry.boundingSphere.center.x > 250);
    assert.ok(far.length > 0); assert.ok(far.every(m => !frustum.intersectsObject(m)), "Ferne Ufer werden nicht verworfen");
    chunked.dispose(); assert.ok(sources.every(m => m.visible));
  }
});
console.log(`${passed} ok, ${failed} Fehler (THREE r${THREE.REVISION}; keine Browser-/FPS-Messung)`);
process.exitCode = failed ? 1 : 0;
