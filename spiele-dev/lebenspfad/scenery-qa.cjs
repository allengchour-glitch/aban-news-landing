"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path").resolve(__dirname, "../..");
const vm = require("node:vm");
const THREE = require(path + "/js/vendor/three.min.js");
const html = fs.readFileSync(path + "/lebenspfad.html", "utf8");
const fixture = { THREE };
vm.createContext(fixture);
// Echte Haupt- und Nebenrouten, ohne DOM, GLBs oder die grosse HTML-JSON-Zeile.
vm.runInContext(html.slice(html.indexOf("var CHAPTERS=["), html.indexOf("// ===================== Licht")), fixture);
const fields = fixture.pathPts.map((p, i) => ({ x: p.x, z: p.z, type: i % 18 === 17 || !i ? "m" : "e" }));
const chapters = JSON.parse(JSON.stringify(fixture.CHAPTERS));
const source = fs.readFileSync(path + "/js/lebenspfad/scenery.js", "utf8");
const guardedMath = Object.create(Math);
guardedMath.random = () => { throw Error("Globaler Zufall verwendet"); };
const context = { window: { NET: Object.freeze({ seed: 731 }) }, Math: guardedMath, Float32Array,
  srand() { throw Error("Spielzufall verwendet"); } };
vm.createContext(context);
vm.runInContext(source, context);
vm.runInContext(fs.readFileSync(path + "/js/lebenspfad/instance-chunks.js", "utf8"), context);
const terrainHeight = (x, z) => .33 + Math.sin(x * .03) * Math.cos(z * .04) * .6;
const original = JSON.stringify({ fields, chapters });
function build(coarse, inputFields = fields) {
  const scene = new THREE.Scene();
  return { scene, result: context.window.LPScenery(THREE, { scene, fields: inputFields, chapters, terrainHeight, coarse }) };
}
const desktop = build(false), repeat = build(false), mobile = build(true);
let checks = 0;
function test(name, fn) { fn(); checks++; console.log("OK " + name); }
test("Deterministisch, ohne Spielzustands- oder Eingabemutation", () => {
  assert.equal(JSON.stringify({ fields, chapters }), original);
  assert.equal(context.window.NET.seed, 731);
  assert.equal(JSON.stringify(desktop.result.placements), JSON.stringify(repeat.result.placements));
  desktop.result.roots.forEach((root, i) => {
    assert.deepEqual(root.instanceMatrix.array, repeat.result.roots[i].instanceMatrix.array);
    assert.deepEqual(root.instanceColor.array, repeat.result.roots[i].instanceColor.array);
  });
});
test("Budgets und Kapitel: Desktop 220, mobil 150, vier Draw-Typen, unter 50k Dreiecken", () => {
  for (const [built, target] of [[desktop, 220], [mobile, 150]]) {
    const r = built.result;
    assert.equal(r.stats.trees, target); assert.equal(r.stats.chapters.length, 8);
    assert.ok(r.stats.chapters.every(n => n >= 18));
    assert.equal(r.stats.drawTypes, 4); assert.ok(r.stats.totalTriangles <= 50000);
    assert.ok(r.placements.some(p => p.kind === "flowering" && p.chapter < 2));
    assert.ok(r.placements.some(p => p.kind === "orchard" && p.chapter === 5));
    assert.ok(r.placements.filter(p => p.chapter === 7 && p.type === "tree").every(p => p.kind === "snow-pine"));
  }
});
test("Alle Feldscheiben inklusive Nebenrouten und Frontbereich bleiben frei", () => {
  for (const built of [desktop, mobile]) for (const p of built.result.placements) {
    assert.ok(Number.isFinite(p.ground));
    assert.ok(Math.abs(p.ground - (terrainHeight(p.x, p.z) - .35)) < 1e-12);
    for (const f of fields) {
      const d = Math.hypot(p.x - f.x, p.z - f.z);
      assert.ok(d >= (f.type === "m" ? 2.7 : 2) + p.footprint + 2.5);
      assert.ok(d >= 5.5 + p.footprint);
      if (p.height >= 5) assert.ok(d >= 9 + Math.min(3, p.height - 5));
    }
    for (let ci = 0; ci < 8; ci++) {
      const offsets = [[7,-8],[8,7],[-7,-8],[7,8],[-8,-7],[7,-8],[-7,8],[8,-8]][ci];
      for (const offset of [8, 9]) {
        const f = fields[ci * 18 + offset];
        assert.ok(Math.hypot(p.x - f.x - offsets[0], p.z - f.z - offsets[1]) >= 6 + p.footprint);
      }
    }
  }
});
test("Endliche statische Instanzgeometrie, lineare sRGB-Farben, direkte Scene-Kinder", () => {
  for (const root of desktop.result.roots) {
    assert.equal(root.parent, desktop.scene); assert.equal(root.isInstancedMesh, true);
    assert.equal(root.material.type, "MeshStandardMaterial");
    assert.equal(root.children.length, 0); assert.equal(root.matrixAutoUpdate, false);
    assert.equal(root.instanceMatrix.usage, THREE.StaticDrawUsage);
    assert.ok(root.geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(root.instanceMatrix.array.every(Number.isFinite));
    assert.ok(root.instanceColor.array.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < root.count; i++) { root.getMatrixAt(i, matrix); assert.ok(matrix.determinant() > 0); }
  }
  const expected = [0x604838,0x73533e,0x80644d,0x59473b].map(hex => new THREE.Color(hex).convertSRGBToLinear());
  const wood = desktop.result.roots.find(r => r.name.endsWith(":wood"));
  const c = new THREE.Color(); wood.getColorAt(0, c);
  assert.ok(expected.some(e => Math.abs(c.r - e.r) < 1e-7 && Math.abs(c.g - e.g) < 1e-7 && Math.abs(c.b - e.b) < 1e-7));
});
test("Baum- und Strauchkronen bleiben geerdet und innerhalb des reservierten Fussabdrucks", () => {
  const trees = desktop.result.placements.filter(p => p.type === "tree" || p.type === "shrub");
  for (const root of desktop.result.roots.filter(r => /:(leaves|pine)$/.test(r.name))) {
    const m = new THREE.Matrix4(), center = new THREE.Vector3();
    for (let i = 0; i < root.count; i++) {
      root.getMatrixAt(i, m); center.setFromMatrixPosition(m);
      const owner = trees.reduce((best, p) => Math.hypot(center.x - p.x, center.z - p.z) <
        Math.hypot(center.x - best.x, center.z - best.z) ? p : best);
      for (let j = 0; j < root.geometry.attributes.position.count; j++) {
        const v = new THREE.Vector3().fromBufferAttribute(root.geometry.attributes.position, j).applyMatrix4(m);
        assert.ok(Math.hypot(v.x - owner.x, v.z - owner.z) <= owner.footprint + 1e-5);
        assert.ok(v.y >= owner.ground - 1e-5 && v.y <= owner.ground + owner.height + .03);
      }
    }
  }
});
test("70/48 niedrige Sträucher in allen Biomen, auch virtuelle Teichfelder bleiben frei", () => {
  for (const [built, target] of [[desktop, 70], [mobile, 48]]) {
    const shrubs = built.result.placements.filter(p => p.type === "shrub");
    assert.equal(built.result.stats.shrubs, target); assert.equal(shrubs.length, target);
    assert.equal(new Set(shrubs.map(p => p.chapter)).size, 8);
    for (const p of shrubs) {
      assert.ok(p.height >= .5 && p.height <= 1.1);
      assert.ok(p.footprint >= .5 && p.footprint <= .8);
      assert.ok(Math.min(...fields.map(f => Math.hypot(p.x - f.x, p.z - f.z))) <= 10.5, "Strauch zu weit vom Pfad");
    }
  }
  // Ein echter bisheriger Strauchstandort wird zur virtuellen Wasser-Sperrscheibe.
  const spot = desktop.result.placements.find(p => p.type === "shrub");
  const pond = { x: spot.x, z: spot.z, radius: 6.5 };
  const protectedFields = fields.concat([pond]), before = JSON.stringify(protectedFields);
  const protectedWorld = build(false, protectedFields);
  assert.equal(JSON.stringify(protectedFields), before);
  assert.equal(protectedWorld.result.stats.trees, 220);
  assert.equal(protectedWorld.result.stats.shrubs, 70);
  assert.equal(protectedWorld.result.stats.drawTypes, 4);
  assert.ok(protectedWorld.result.stats.totalTriangles < 50000);
  for (const p of protectedWorld.result.placements) {
    assert.ok(Math.hypot(p.x - pond.x, p.z - pond.z) >= pond.radius + p.footprint + 2.5);
  }
});
test("Bestehender Chunker akzeptiert alle Quellen, umfasst jede Krone und verwirft Fernzellen", () => {
  const r = context.window.LPInstanceChunks(THREE, desktop.result.roots, { chunkSize: 32 });
  assert.equal(r.stats.skippedMeshes, 0);
  assert.equal(r.stats.chunkedMeshes, desktop.result.roots.length);
  assert.equal(r.stats.chunkedInstances, desktop.result.stats.instances);
  assert.equal(r.stats.totalTriangles, desktop.result.stats.totalTriangles);
  const m = new THREE.Matrix4();
  for (const root of r.roots) for (let i = 0; i < root.count; i++) {
    root.getMatrixAt(i, m);
    for (let j = 0; j < root.geometry.attributes.position.count; j++) {
      const p = new THREE.Vector3().fromBufferAttribute(root.geometry.attributes.position, j).applyMatrix4(m);
      assert.ok(root.geometry.boundingBox.containsPoint(p));
      assert.ok(p.distanceTo(root.geometry.boundingSphere.center) <= root.geometry.boundingSphere.radius + 1e-6);
    }
  }
  const camera = new THREE.PerspectiveCamera(60, 1.5, .1, 80);
  camera.position.set(fields[0].x, 22, fields[0].z + 35);
  camera.lookAt(fields[0].x, 0, fields[0].z); camera.updateMatrixWorld(true);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const far = r.roots.filter(root => root.geometry.boundingSphere.center.x > 100);
  assert.ok(far.length > 0); assert.ok(far.every(root => !frustum.intersectsObject(root)));
  assert.ok(r.roots.some(root => frustum.intersectsObject(root)));
  r.dispose(); assert.ok(desktop.result.roots.every(root => root.visible));
});
console.log(JSON.stringify({ desktop: desktop.result.stats, coarse: mobile.result.stats }));
console.log(`${checks} ok, 0 Fehler (THREE r${THREE.REVISION}; keine Browser-/FPS-Messung)`);
