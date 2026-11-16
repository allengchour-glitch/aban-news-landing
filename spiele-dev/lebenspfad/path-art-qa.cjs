'use strict';
// Aufruf im Repo: node spiele-dev/lebenspfad/path-art-qa.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const THREE = require(path.join(root, 'js/vendor/three.min.js'));
const source = fs.readFileSync(path.join(root, 'lebenspfad.html'), 'utf8');
function arrayDeclaration(name) {
  const match = source.match(new RegExp('var\\s+' + name + '\\s*=\\s*\\[[\\s\\S]*?\\n\\];'));
  assert(match, name + ' muss als Array im Spiel definiert sein');
  return match[0];
}
const declarations = arrayDeclaration('CHAPTERS') + '\n' + arrayDeclaration('FORKS');
const context = vm.createContext({THREE, window: {}, Math: Object.create(Math)});
vm.runInContext(declarations, context);
const chapters = JSON.parse(JSON.stringify(context.CHAPTERS));
const forks = JSON.parse(JSON.stringify(context.FORKS));
// Derselbe Graph wie im Spiel; die Layout-Datei gehört dem Hauptagenten.
const layoutFile = path.join(root, 'js/lebenspfad/route-layout.js');
let points, layout;
if (fs.existsSync(layoutFile)) {
  vm.runInContext(fs.readFileSync(layoutFile, 'utf8'), context);
  layout = context.window.LPRouteLayout(THREE, {chapters: 8, perChapter: 18});
  points = layout.points;
} else {
  points = Array.from({length: 144}, (_, i) => ({x: -160 + i * 368 / 143, z: Math.cos(i / 18 * Math.PI) * 36}));
}
const fields = points.map((p, i) => ({x: p.x, z: p.z, type: i % 18 === 17 ? 'm' : 'e',
  disc: {position: {y: .28}}, rsock: i % 18 === 17 || i === 0 ? 2.55 : 1.85, yoff: 0}));
forks.forEach(fork => {
  const first = fields.length;
  const ps = layout ? layout.addFork(fork) : fork.types.map((_, j) => {
    const t = (j + 1) / (fork.types.length + 1), a = fields[fork.at], b = fields[fork.rejoin];
    return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t + Math.sin(t * Math.PI) * 14};
  });
  ps.forEach((p, j) => fields.push({x: p.x, z: p.z, type: fork.types[j], rsock: 1.7,
    disc: {position: {y: .28}}, yoff: 0, nxt: j + 1 === ps.length ? fork.rejoin : first + j + 1}));
  fields[fork.at].fork = {a: fork.at + 1, b: first};
});
function freeze(o) { Object.values(o).forEach(v => { if (v && typeof v === 'object') freeze(v); }); Object.freeze(o); }
const before = JSON.stringify({fields, forks, chapters});
freeze(fields); freeze(forks); freeze(chapters);
vm.runInContext(fs.readFileSync(path.join(root, 'js/lebenspfad/path-art.js'), 'utf8'), context);
context.Math.random = () => { throw Error('Kosmetik darf keine Zufallsfolge verbrauchen'); };
function build(coarse) { const scene = new THREE.Scene(); return {scene, art: context.window.LPPathArt(THREE,
  {scene, fields, forks, chapters, mainCount: 144, coarse})}; }
function hash(art) {
  const digest = crypto.createHash('sha256');
  art.roots.filter(r => r.isMesh).forEach(r => Object.values(r.geometry.attributes).forEach(a => digest.update(Buffer.from(a.array.buffer))));
  return digest.digest('hex');
}
const result = build(false), art = result.art;
assert.equal(THREE.REVISION, '128');
assert.equal(fields.length, 175);
assert.equal(art.stats.mainLinks, 143);
assert.equal(art.stats.branchLinks, forks.reduce((sum, fork) => sum + fork.types.length + 1, 0));
assert.equal(art.stats.linkCount, 178);
const actual = new Set(art.links.map(l => `${l.from}:${l.to}`));
assert.equal(actual.size, 178);
assert(!actual.has('143:144'));
for (let i = 0; i < 143; i++) assert(actual.has(`${i}:${i + 1}`));
fields.forEach((f, i) => {
  if (f.fork) assert(actual.has(`${i}:${f.fork.b}`));
  if (f.nxt !== undefined) assert(actual.has(`${i}:${f.nxt}`));
});
art.links.forEach(link => {
  assert(Math.abs(link.start.y - (fields[link.from].disc.position.y + .01)) < 1e-9);
  assert(Math.abs(link.end.y - (fields[link.to].disc.position.y + .01)) < 1e-9);
  assert(link.width >= 1.25 && link.width <= 1.45);
  assert.equal(link.quarterPhase, link.from % 4);
});
assert.equal(art.stats.chapterMarkers, 8);
assert.equal(new Set(art.markers.map(m => m.label)).size, 8);
assert.deepEqual(Array.from(art.markers, m => m.field), [0, 18, 36, 54, 72, 90, 108, 126]);
assert(art.stats.triangles < 8000);
assert(art.stats.drawCalls + 8 < 30, 'Budget einschließlich acht Canvas-Schildern');
art.roots.forEach(mesh => {
  assert.equal(mesh.parent, result.scene);
  assert.equal(mesh.material.type, 'MeshStandardMaterial');
  for (const attr of Object.values(mesh.geometry.attributes)) for (const value of attr.array) assert(Number.isFinite(value));
  const box = mesh.geometry.boundingBox;
  assert(box.max.x - box.min.x < 60 && box.max.z - box.min.z < 60, 'Räumlich begrenzte Chunks');
  assert(Math.abs(box.min.y) < 1e-6);
  assert(box.max.y <= 2.25);
  const pos = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal;
  for (let i = 0; i < pos.count; i += 3) {
    if (Math.abs(pos.getY(i) - pos.getY(i + 1)) < 1e-7 && Math.abs(pos.getY(i) - pos.getY(i + 2)) < 1e-7) {
      assert(normal.getY(i) > .99, 'Deckflächen und Pfeile müssen nach oben zeigen');
    }
  }
});
const repeat = build(false), coarse = build(true);
assert.equal(hash(art), hash(repeat.art));
assert.equal(coarse.art.stats.linkCount, 178);
assert(coarse.art.stats.triangles < art.stats.triangles);
// Raycaster gegen die wirklichen Deckdreiecke, ohne die erhöhten Fugen/Pfeile.
let surfaceChecks = 0;
function checkSurface(model, samples, expectedPlane) {
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  model.scene.updateMatrixWorld(true);
  for (const [x, z] of samples) {
    ray.ray.origin.set(x, 10, z);
    const hit = ray.intersectObjects(model.art.roots, false).find(h => {
      if (h.face.normal.y < .5) return false;
      const p = h.object.geometry.attributes.position;
      return [h.face.a, h.face.b, h.face.c].every(i => Math.abs(p.getY(i) - expectedPlane(p.getX(i), p.getZ(i))) < 2e-6);
    });
    assert(hit, 'Raycaster muss die echte Wegoberfläche treffen');
    assert(Math.abs(model.art.surfaceAt(x, z) - hit.point.y) < 2e-6, 'surfaceAt muss mit der Geometrie übereinstimmen');
    surfaceChecks++;
  }
}
function samplesFor(link) {
  const dx = link.end.x - link.start.x, dz = link.end.z - link.start.z, len = Math.hypot(dx, dz);
  const bend = [1, .35, -1, -.35][link.quarterPhase] * Math.min(.12, link.centerDistance * .018);
  return [.19, .5, .81].flatMap(t => [-.46, 0, .46].map(side => {
    const offset = Math.sin(t * Math.PI) * bend + side * link.width;
    return [link.start.x + dx * t - dz / len * offset, link.start.z + dz * t + dx / len * offset];
  }));
}
for (const model of [result, coarse]) {
  checkSurface(model, model.art.links.flatMap(samplesFor), () => .29);
  assert.equal(model.art.surfaceAt(1e6, -1e6), 0);
  model.art.markers.forEach(m => assert.equal(model.art.surfaceAt(m.x, m.z), 0, 'Schilder sind keine Wegflächen'));
}
// Unterschiedliche Endhöhen, gebogene Ränder und zwei übereinander liegende Wege.
const rampFields = [
  {x: 30, z: -5, rsock: 1.85, disc: {position: {y: .28}}},
  {x: 36, z: -1, rsock: 1.85, disc: {position: {y: .88}}}
];
const rampScene = new THREE.Scene();
const ramp = {scene: rampScene, art: context.window.LPPathArt(THREE, {scene: rampScene, fields: rampFields, mainCount: 2})};
const rl = ramp.art.links[0], rdx = rl.end.x - rl.start.x, rdz = rl.end.z - rl.start.z;
const plane = (x, z) => rl.start.y + (rl.end.y - rl.start.y) * ((x - rl.start.x) * rdx + (z - rl.start.z) * rdz) / (rdx * rdx + rdz * rdz);
checkSurface(ramp, samplesFor(rl), plane);
assert.equal(ramp.art.surfaceAt(33 - 4, -3 + 6), 0, 'Außerhalb des gekrümmten Wegrands');
const stackedScene = new THREE.Scene();
const stackedFields = [...rampFields, ...rampFields.map((f, i) => ({...f, disc: {position: {y: f.disc.position.y + .5}}, nxt: i ? undefined : 3}))];
const stacked = context.window.LPPathArt(THREE, {scene: stackedScene, fields: stackedFields, mainCount: 2});
assert(Math.abs(stacked.surfaceAt(33, -3) - (plane(33, -3) + .5)) < 2e-6, 'Bei Überlagerung zählt die höchste Wegoberfläche');
ramp.art.dispose(); stacked.dispose();
assert.equal(JSON.stringify({fields, forks, chapters}), before);
art.dispose(); repeat.art.dispose(); coarse.art.dispose();
assert.equal(result.scene.children.length, 0);
console.log('GEMESSEN: ' + JSON.stringify(art.stats));
console.log('GEMESSEN: ' + surfaceChecks + ' Höhenabfragen gegen THREE.Raycaster');
console.log('Graph, Höhen, Flächenausrichtung, Budget, Determinismus, unveränderte Eingaben: ok, 0 Fehler');
