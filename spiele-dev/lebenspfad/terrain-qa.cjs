const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '../..');
const context = { console, assert, performance };
context.window = context;
vm.createContext(context);
for (const file of ['js/vendor/three.min.js', 'js/lebenspfad/terrain.js', 'js/lebenspfad/static-batches.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
// Die echten Kapitel, 144 Wegfelder und alle Nebenrouten aus dem Spiel verwenden.
const html = fs.readFileSync(path.join(root, 'lebenspfad.html'), 'utf8');
const start = html.indexOf('var CHAPTERS=['), end = html.indexOf('function chapterOf(', start);
assert.ok(start >= 0 && end > start, 'Pfad-Fixture im Spiel nicht gefunden');
vm.runInContext(html.slice(start, end), context, { filename: 'echte-lebenspfad-wege.js' });
function fixture() {
  let checks = 0;
  function test(name, run) { run(); checks++; console.log('ok', name); }
  function near(a, b, tolerance = 0.00001) { assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`); }
  const T = THREE;
  const options = { pathPoints: pathPts, chapters: CHAPTERS };
  const before = JSON.stringify(options);
  let seed = 71833;
  window.NET = { seed };
  window.srand = () => { throw new Error('Terrain darf keinen Spielzufall konsumieren'); };
  const time = performance.now(), terrain = LPLandscapeTerrain(T, options);
  const buildMs = performance.now() - time;
  const g = terrain.geometry, pos = g.attributes.position;

  test('echtes r128, endliche Höhen, gültige Geometrie und feste Ausdehnung', () => {
    assert.equal(T.REVISION, '128');
    assert.equal(g.index.count / 3, 20480);
    assert.ok(g.index.array instanceof Uint16Array);
    assert.equal(pos.count, 10465);
    assert.ok(g.index.array.every(index => index < pos.count));
    for (const attribute of Object.values(g.attributes)) assert.ok(attribute.array.every(Number.isFinite));
    near(g.boundingBox.min.x, -260); near(g.boundingBox.max.x, 300);
    near(g.boundingBox.min.z, -110); near(g.boundingBox.max.z, 110);
    assert.ok(g.boundingBox.max.y > 5 && g.boundingBox.max.y < 17);
    for (let i = 0; i < pos.count; i++) {
      near(pos.getY(i), terrain.heightAt(pos.getX(i), pos.getZ(i)) - 0.35);
      const n = new T.Vector3().fromBufferAttribute(g.attributes.normal, i);
      near(n.length(), 1);
      assert.ok(n.y > 0.5, 'Keine senkrechten Grate oder umgedrehten Flächen');
      assert.ok(g.boundingBox.containsPoint(new T.Vector3().fromBufferAttribute(pos, i)));
    }
  });

  test('alle echten Felder und Nebenrouten haben 4,5 Einheiten ebenen Boden', () => {
    const mesh = new T.Mesh(g, terrain.material);
    mesh.updateMatrixWorld();
    const ray = new T.Raycaster();
    for (const point of pathPts) {
      for (let angle = 0; angle < 8; angle++) {
        const a = angle * Math.PI / 4;
        const x = point.x + Math.cos(a) * 4.5, z = point.z + Math.sin(a) * 4.5;
        near(terrain.heightAt(x, z), 0.33);
        ray.set(new T.Vector3(x, 30, z), new T.Vector3(0, -1, 0));
        const hit = ray.intersectObject(mesh)[0];
        assert.ok(hit, 'Weg muss vollständig im Terrain liegen');
        assert.ok(hit.point.y < 0, 'Interpolierter Boden darf das Brett nicht durchstossen');
        near(hit.point.y, -0.02, 0.008);
      }
    }
  });

  test('Kosmetik bleibt deterministisch und verändert weder Eingaben noch Spiel-Seed', () => {
    const again = LPLandscapeTerrain(T, options);
    for (const name of Object.keys(g.attributes)) {
      assert.deepEqual(g.attributes[name].array, again.geometry.attributes[name].array);
    }
    assert.deepEqual(g.index.array, again.geometry.index.array);
    assert.equal(JSON.stringify(options), before);
    assert.equal(NET.seed, seed);
    for (const [x, z] of [[-200, -60], [-57, 40], [117, 62], [243, -73]]) {
      assert.equal(terrain.heightAt(x, z), again.heightAt(x, z));
    }
    again.dispose();
  });

  test('sanfte Übergänge und gedämpfte lineare Farben ohne ausgebrannte Schneeflächen', () => {
    let maxColorDelta = 0, maxSlope = 0;
    for (let x = -220; x <= 270; x += 1) {
      for (const z of [-65, -38, 0, 42, 70]) {
        const a = terrain.colorAt(x, z), b = terrain.colorAt(x + 0.05, z);
        assert.ok([a.r, a.g, a.b].every(value => value > 0 && value < 0.7));
        maxColorDelta = Math.max(maxColorDelta, Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
        maxSlope = Math.max(maxSlope, Math.abs(terrain.heightAt(x + 0.05, z) - terrain.heightAt(x, z)) / 0.05);
      }
    }
    assert.ok(maxColorDelta < 0.012, `Farbabriss ${maxColorDelta}`);
    assert.ok(maxSlope < 1, `Steiler Grat ${maxSlope}`);
    console.log('GEMESSEN', JSON.stringify({ maxColorDelta, maxSlope }));
  });

  test('Teichböden, Wasserlinie und Uferübergang verwenden sichtbare Welthöhen', () => {
    const basins = [{ x: -60, z: 58, rx: 10, rz: 8, y: 0.12 }, { x: 150, z: -55, rx: 12, rz: 9, y: 0.04 }];
    const ponds = LPLandscapeTerrain(T, { ...options, basins });
    assert.equal(ponds.stats.basins, 2);
    for (const basin of basins) {
      near(ponds.heightAt(basin.x, basin.z), basin.y - 0.5);
      assert.ok(ponds.heightAt(basin.x + basin.rx * 0.95, basin.z) - 0.35 < basin.y);
      assert.ok(ponds.heightAt(basin.x + basin.rx, basin.z) - 0.35 > basin.y);
      near(ponds.heightAt(basin.x + basin.rx * 1.25, basin.z), terrain.heightAt(basin.x + basin.rx * 1.25, basin.z));
      near(ponds.heightAt(basin.x, basin.z + basin.rz * 1.25), terrain.heightAt(basin.x, basin.z + basin.rz * 1.25));
    }
    for (const point of pathPts) near(ponds.heightAt(point.x, point.z), 0.33);
    // Selbst ein irrtümlich auf einem Weg platzierter Teich lässt Felder intakt.
    const point = pathPts[20];
    const unsafe = LPLandscapeTerrain(T, { ...options, basins: [{ x: point.x, z: point.z, rx: 4, rz: 3, y: 0.04 }] });
    near(unsafe.heightAt(point.x, point.z), 0.33);
    unsafe.dispose(); ponds.dispose();
  });

  test('echte 48er-Chunks erhalten Dreieckzahl und alle Terrain-Attribute', () => {
    const scene = new T.Scene(), mesh = new T.Mesh(g, terrain.material);
    mesh.receiveShadow = true; scene.add(mesh);
    const split = LPStaticBatches.split(T, mesh, { chunkSize: 48 });
    assert.ok(split.stats.batches > 20);
    assert.equal(split.stats.triangles, 20480);
    assert.equal(mesh.visible, false);
    for (const chunk of split.roots) {
      assert.ok(chunk.geometry.boundingBox && chunk.geometry.boundingSphere);
      assert.ok(chunk.geometry.attributes.normal && chunk.geometry.attributes.color);
      assert.equal(chunk.material, terrain.material);
    }
    split.dispose(); assert.equal(mesh.visible, true);
    console.log('GEMESSEN', JSON.stringify({ revision: T.REVISION, buildMs: +buildMs.toFixed(2), chunks: split.stats.batches, ...terrain.stats }));
  });

  test('Requisitenhöhe stimmt zwischen versetzten Vertices mit echtem Raycaster überein', () => {
    const mesh = new T.Mesh(g, terrain.material);
    mesh.updateMatrixWorld(true);
    const ray = new T.Raycaster();
    for (let i = 0; i < 50; i++) {
      const x = -259.7 + ((i * 117.391) % 559.4), z = -109.7 + ((i * 39.17) % 219.4);
      ray.set(new T.Vector3(x, 100, z), new T.Vector3(0, -1, 0));
      const hits = ray.intersectObject(mesh);
      assert.ok(hits.length, 'Strahl verfehlt echtes Terrain');
      near(terrain.surfaceHeightAt(x,z)-.35, hits[0].point.y, .00002);
    }
  });

  test('leerer Pfad ist zulässig, dispose ist idempotent', () => {
    const empty = LPLandscapeTerrain(T);
    assert.ok(Number.isFinite(empty.heightAt(0, 0)));
    let disposals = 0;
    empty.geometry.addEventListener('dispose', () => disposals++);
    empty.material.addEventListener('dispose', () => disposals++);
    empty.dispose(); empty.dispose(); assert.equal(disposals, 2);
  });
  terrain.dispose();
  console.log(`${checks} ok, 0 Fehler`);
}
try {
  vm.runInContext('(' + fixture.toString() + ')()', context, { filename: 'terrain-fixture.js' });
} catch (error) {
  console.error(error.stack.split('\n').filter(line => line.length < 600).join('\n'));
  process.exitCode = 1;
}
