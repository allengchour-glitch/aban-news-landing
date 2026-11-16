"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
global.window = global;
const THREE = require("../../js/vendor/three.min.js");
vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, "../../js/wildnis/visuals.js"), "utf8"),
);
let count = 0;
function test(name, f) {
  f();
  count++;
  console.log("OK " + name);
}
function active(scene) {
  const l = [];
  scene.traverse((o) => {
    if (o.isPointLight && o.layers.mask & 1) l.push(o);
  });
  return l;
}
test("Feste Lichtanzahl, Originalfarbe/Intensität unverändert, bewegte Quelle nachgeführt", () => {
  const s = new THREE.Scene(),
    sources = [];
  for (let i = 0; i < 20; i++) {
    const l = new THREE.PointLight(i ? 0xffbb66 : 0x55ffaa, 1, 30, 2);
    l.position.x = i * 2;
    s.add(l);
    sources.push(l);
  }
  const b = NWWildnisVisuals.lightBudget(THREE, s, 4);
  for (let i = 0; i < 15; i++) b.update(new THREE.Vector3(), 0.1);
  assert.equal(active(s).length, 4);
  assert.equal(b.stats().sources, 20);
  assert.equal(sources[0].intensity, 1);
  assert.equal(sources[0].color.getHex(), 0x55ffaa);
  sources[0].position.z = 4;
  b.update(new THREE.Vector3(), 0.1);
  assert(active(s).some((p) => p.position.z === 4));
  b.dispose();
  assert.equal(active(s).length, 20);
  assert(sources.every((l) => l.layers.mask === 1));
});
test("Nachträgliche Lichtgruppen, Unsichtbarkeit, eigene Layer und idempotentes Aufräumen", () => {
  const s = new THREE.Scene(),
    original = s.add,
    b = NWWildnisVisuals.lightBudget(THREE, s, 2),
    g = new THREE.Group(),
    l = new THREE.PointLight(0xff9900, 1, 10);
  g.add(l);
  s.add(g);
  b.update(new THREE.Vector3(), 1);
  assert.equal(b.stats().active, 1);
  g.visible = false;
  b.update(new THREE.Vector3(), 1);
  assert.equal(b.stats().active, 0);
  const other = new THREE.PointLight(0xffffff, 1, 10);
  other.layers.set(2);
  s.add(other);
  b.update(new THREE.Vector3(), 1);
  assert.equal(b.stats().active, 0);
  assert.equal(other.layers.mask, 4);
  b.dispose();
  b.dispose();
  assert.equal(s.add, original);
  assert.equal(l.layers.mask, 1);
  assert.equal(other.layers.mask, 4);
});
test("Entfernte Bauvorschauen werden freigegeben und können erneut registriert werden", () => {
  const s = new THREE.Scene(),
    b = NWWildnisVisuals.lightBudget(THREE, s, 2),
    g = new THREE.Group(),
    l = new THREE.PointLight(0xffffff, 1, 10);
  g.add(l);
  s.add(g);
  b.update(new THREE.Vector3(), 1);
  assert.equal(b.stats().sources, 1);
  s.remove(g);
  b.update(new THREE.Vector3(), 1);
  assert.equal(b.stats().sources, 0);
  assert.equal(l.layers.mask, 1);
  s.add(g);
  b.update(new THREE.Vector3(), 1);
  assert.equal(b.stats().sources, 1);
  assert.equal(b.stats().active, 1);
  b.dispose();
});
test("Lichtpool verarbeitet Tages-/Nachtwechsel ohne Wechsel der Shader-Lichtanzahl", () => {
  const s = new THREE.Scene(),
    g = new THREE.Group(),
    l = new THREE.PointLight(0xffffff, 2, 25);
  g.add(l);
  s.add(g);
  const b = NWWildnisVisuals.lightBudget(THREE, s, 3);
  for (const v of [false, true, false, true]) {
    l.visible = v;
    b.update(new THREE.Vector3(), 1);
    assert.equal(active(s).length, 3);
    assert.equal(b.stats().active, v ? 1 : 0);
  }
  b.dispose();
});
test("Entfernte Weltobjekte nur während des Zeichnens verborgen, auch nach Fehler restauriert", () => {
  const s = new THREE.Scene(),
    near = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
    ),
    far = near.clone(),
    off = near.clone();
  far.position.x = 500;
  off.visible = false;
  s.add(near, far, off);
  const b = NWWildnisVisuals.distanceCuller(THREE, s);
  assert.throws(
    () =>
      b.render(new THREE.Vector3(), 100, () => {
        assert(near.visible);
        assert(!far.visible);
        assert(!off.visible);
        throw Error("Test");
      }),
    /Test/,
  );
  assert(near.visible && far.visible && !off.visible);
  far.position.x = 2;
  b.render(new THREE.Vector3(), 100, () => assert(far.visible));
});
test("Himmel, animierte Figuren, große Flächen und globale Instanzen werden erhalten", () => {
  const s = new THREE.Scene(),
    m = new THREE.MeshBasicMaterial(),
    sky = new THREE.Mesh(new THREE.SphereGeometry(5), m.clone()),
    skin = new THREE.SkinnedMesh(new THREE.BoxGeometry(), m),
    wide = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), m),
    im = new THREE.InstancedMesh(new THREE.BoxGeometry(), m, 1);
  sky.material.fog = false;
  [sky, skin, wide, im].forEach((o) => {
    o.position.x = 500;
    s.add(o);
  });
  const b = NWWildnisVisuals.distanceCuller(THREE, s);
  b.render(new THREE.Vector3(), 100, () =>
    assert([sky, skin, wide, im].every((o) => o.visible)),
  );
});
test("Neue Kinder und verschachtelte Transformationen erhalten konservative Grenzen", () => {
  const s = new THREE.Scene(),
    g = new THREE.Group();
  g.position.x = 500;
  s.add(g);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  const b = NWWildnisVisuals.distanceCuller(THREE, s);
  b.render(new THREE.Vector3(), 100, () => assert(!g.visible));
  const span = new THREE.Mesh(
    new THREE.BoxGeometry(1000, 1, 1),
    new THREE.MeshBasicMaterial(),
  );
  g.add(span);
  b.render(new THREE.Vector3(), 100, () => assert(g.visible));
  assert(g.visible);
});
test("Bodenkontakt folgt dem Gelände, zeigt nach oben und gibt eigene Ressourcen frei", () => {
  global.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        createRadialGradient: () => ({ addColorStop() {} }),
        fillRect() {},
      }),
    }),
  };
  const scene = new THREE.Scene(),
    spots = [
      { x: 2, z: 3, r: 2 },
      { x: 12, z: -5, r: 1 },
    ],
    height = (x, z) => x * 0.02 + z * 0.03,
    copy = JSON.stringify(spots);
  const c = NWWildnisVisuals.contactPatches(THREE, scene, spots, height),
    p = c.mesh.geometry.attributes.position,
    n = c.mesh.geometry.attributes.normal;
  assert.equal(p.count, 50);
  for (let i = 0; i < p.count; i++) {
    assert(Math.abs(p.getY(i) - height(p.getX(i), p.getZ(i)) - 0.145) < 1e-5);
    assert(n.getY(i) > 0.99);
  }
  let disposed = 0;
  for (const o of [c.mesh.geometry, c.mesh.material, c.mesh.material.map])
    o.addEventListener("dispose", () => disposed++);
  c.dispose();
  c.dispose();
  assert.equal(disposed, 3);
  assert.equal(scene.children.length, 0);
  assert.equal(JSON.stringify(spots), copy);
});
console.log(count + " ok, 0 Fehler");
