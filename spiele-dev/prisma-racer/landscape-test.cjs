"use strict";
// Offline, ohne WebGL/Browser/Downloads. Altstand prüfen:
// RACER_HTML=/tmp/prisma-landschaft-vorher.html node spiele-dev/prisma-racer/landscape-test.cjs
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../..");
const file = path.resolve(process.env.RACER_HTML || path.join(root, "neon-racer.html"));
const html = fs.readFileSync(file, "utf8");
function match(re, text = html) {
  const m = text.match(re); assert(m, "Quellmarker fehlt: " + re); return m;
}
function local(url) {
  const p = path.resolve(root, url.split("?")[0].replace(/^\//, ""));
  assert(p.startsWith(root + path.sep), "Asset muss im Repository liegen"); return p;
}
const THREE = require(local(match(/<script src="([^"]*\/three\.min\.js(?:\?v=[a-f0-9]+)?)"/)[1]));
vm.runInNewContext(fs.readFileSync(local(match(/<script src="([^"]*\/GLTFLoader\.js(?:\?v=[a-f0-9]+)?)"/)[1]), "utf8"), { THREE, console });

// Klammerauszüge statt Kopien der erzeugenden Formeln. Unbekannte Syntax schlägt fehl.
function block(start, text = html) {
  const open = text.indexOf("{", start); assert(open >= start);
  let depth = 0, quote = "", line = false, comment = false;
  for (let i = open; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (line) { if (c === "\n") line = false; continue; }
    if (comment) { if (c === "*" && next === "/") { comment = false; i++; } continue; }
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; }
    if (c === "/" && next === "/") { line = true; i++; continue; }
    if (c === "/" && next === "*") { comment = true; i++; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === "{") depth++;
    if (c === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw Error("Quellblock nicht geschlossen");
}
function fn(name) { return block(match(new RegExp("function " + name + "\\(")).index); }
function run(source, context) { return vm.runInContext(source, context, { timeout: 1000 }); }
function argsOf(name, source) {
  const at = source.indexOf(name + "("); assert(at >= 0, name);
  let depth = 1, begin = at + name.length + 1, args = [];
  for (let i = begin; i < source.length; i++) {
    if (source[i] === "(") depth++;
    if (source[i] === ")" && --depth === 0) { args.push(source.slice(begin, i)); return args; }
    if (source[i] === "," && depth === 1) { args.push(source.slice(begin, i)); begin = i + 1; }
  }
  throw Error("Argumentliste fehlt: " + name);
}
// Für die aktuelle affine Zufallsformel werden die geschlossenen Extremwerte bewiesen,
// nicht nur zufällige Seeds getestet. Nicht-affine Änderungen benötigen ein neues Modell.
function affineBounds(expr, k) {
  let s = expr.replace(/\(\s*k\s*%\s*\d+\s*\?\s*[+-]?[\d.]+\s*:\s*[+-]?[\d.]+\s*\)/g,
    branch => String(vm.runInNewContext(branch, { k }, { timeout: 1000 })));
  const calls = s.match(/Math\.random\(\)/g) || []; assert(calls.length <= 1, "Affine Formel erwartet: " + expr);
  s = s.replace(/Math\.random\(\)/g, "r");
  assert(/^[\d.\s()+*r-]+$/.test(s), "Unbekannte Zufallsformel: " + expr);
  const a = vm.runInNewContext(s, { r: 0 }), b = vm.runInNewContext(s, { r: 1 });
  assert(Number.isFinite(a) && Number.isFinite(b)); return [Math.min(a, b), Math.max(a, b)];
}
const trackContext = vm.createContext({ THREE, Math, scene: new THREE.Scene(), IS_COARSE: false,
  roadMat: new THREE.MeshStandardMaterial(), _barCache: {},
  mat: c => new THREE.MeshStandardMaterial({ color: c, emissive: c }) });
run(match(/var HALF=[^;]+;/)[0] + match(/var N=[^;]+;/)[0] + match(/var VW=[^;]+;/)[0] + fn("centerX") +
  fn("roundedBarGeo") + fn("tileMesh") + fn("railMesh"), trackContext);
const { N, SP, BACK } = trackContext;
assert(N > 0 && N + BACK < 200 && SP > 0 && SP < 100, "Begrenztes Streckenraster");
const centreExpr = match(/return\s+([^;]+);/, fn("centerX"))[1];
let amplitude = 0;
const remainder = centreExpr.replace(/Math\.sin\([^()]+\)\s*\*\s*([\d.]+)/g, (_, a) => { amplitude += Math.abs(Number(a)); return ""; });
assert(amplitude > 0 && /^[\s+-]*$/.test(remainder), "centerX muss eine Sinussumme bleiben");
const positionLoop = block(match(/for\(var i=0;i<N\+BACK;i\+\+\)\{var segment=/).index);
const normalized = positionLoop.replace(/\s/g, "");
assert(normalized.includes("segment=Math.floor(dist/SP)+i-BACK") && normalized.includes("di=segment*SP") && normalized.includes("z=dist-di"), "Affines Treadmill-Raster erwartet");
const dummy = () => ({ position: new THREE.Vector3() });
for (const key of ["tiles", "leftRail", "rightRail", "midLine", "edgeL", "edgeR", "vergeL", "vergeR"])
  trackContext[key] = Array.from({ length: N + BACK }, (_, i) => key === "tiles" ? trackContext.tileMesh() :
    /Rail$/.test(key) ? trackContext.railMesh(0) : dummy());
trackContext.dist = 0; run(positionLoop, trackContext);
const road = trackContext.tiles, course = road.concat(trackContext.leftRail, trackContext.rightRail);
let halfExtent = 0, zMin = Infinity, zMax = -Infinity, roadTop = -Infinity;
for (const mesh of course) {
  mesh.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(mesh);
  halfExtent = Math.max(halfExtent, Math.abs(box.min.x - mesh.position.x), Math.abs(box.max.x - mesh.position.x));
  zMin = Math.min(zMin, box.min.z); zMax = Math.max(zMax, box.max.z);
}
// Rail-Mittelpunktversatz aus dem echten Positionsloop, nicht nur dessen Geometriebreite.
for (let i = 0; i < road.length; i++) for (const rails of [trackContext.leftRail, trackContext.rightRail]) {
  const b = new THREE.Box3().setFromObject(rails[i]), cx = road[i].position.x;
  halfExtent = Math.max(halfExtent, Math.abs(b.min.x - cx), Math.abs(b.max.x - cx));
}
for (const mesh of road) roadTop = Math.max(roadTop, new THREE.Box3().setFromObject(mesh).max.y);
const corridorX = amplitude + halfExtent;
// Innerhalb jeder Rasterperiode wächst z um [0, SP); alle Perioden sind damit enthalten.
zMax += SP;
const corridorRadius = Math.hypot(corridorX, Math.max(Math.abs(zMin), Math.abs(zMax)));

const hillStart = html.lastIndexOf("(function(){", html.indexOf("var hg=new THREE.IcosahedronGeometry"));
assert(hillStart >= 0); const hillsSource = block(hillStart) + ")();";
const positions = argsOf("h.position.set", hillsSource), scales = argsOf("h.scale.set", hillsSource);
assert.equal(positions.length, 3); assert.equal(scales.length, 3);
assert(/h\.rotation\.y=/.test(hillsSource) && !/h\.rotation\.(?:x|z|set)/.test(hillsSource), "Nur Y-Drehung der Hügel erwartet");
function hills(coarse, sequence) {
  let call = 0;
  const math = Object.create(Math); math.random = () => sequence[call++ % sequence.length];
  const context = vm.createContext({ THREE, Math: math, IS_COARSE: coarse, scene: new THREE.Scene() });
  run(hillsSource, context); context.scene.updateMatrixWorld(true); return context.scene.children;
}
function projectedRadius(geometry) {
  const a = geometry.attributes.position; let r = 0;
  for (let i = 0; i < a.count; i++) r = Math.max(r, Math.hypot(a.getX(i), a.getZ(i)));
  return r;
}
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
function verticalHits(meshes, x, z) {
  const bounds = new THREE.Box3(); meshes.forEach(m => bounds.expandByObject(m));
  ray.set(new THREE.Vector3(x, bounds.max.y + bounds.getSize(new THREE.Vector3()).y + 1, z), down);
  return ray.intersectObjects(meshes, false);
}
function pointSegmentDistance(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, -(a.x * dx + a.z * dz) / length)) : 0;
  return Math.hypot(a.x + t * dx, a.z + t * dz);
}
function triangleRadius(a, b, c) {
  const cross = (u, v) => u.x * v.z - u.z * v.x;
  const signs = [cross(a, b), cross(b, c), cross(c, a)];
  const area = cross({ x: b.x - a.x, z: b.z - a.z }, { x: c.x - a.x, z: c.z - a.z });
  if (Math.abs(area) > 1e-10 && (signs.every(v => v >= 0) || signs.every(v => v <= 0))) return 0;
  return Math.min(pointSegmentDistance(a, b), pointSegmentDistance(b, c), pointSegmentDistance(c, a));
}
function minTriangleRadius(meshes) {
  let min = Infinity, triangles = 0;
  for (const mesh of meshes) {
    const g = mesh.geometry, a = g.attributes.position, indices = g.index;
    const count = indices ? indices.count : a.count;
    assert(count % 3 === 0 && count < 100000, "Begrenzte Dreiecksgeometrie");
    for (let i = 0; i < count; i += 3) {
      const points = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(a, indices ? indices.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld));
      min = Math.min(min, triangleRadius(...points)); triangles++;
    }
  }
  return { min, triangles };
}

(async () => {
  let passed = 0, failed = 0;
  function test(name, body) {
    try { body(); passed++; console.log("PASS " + name); }
    catch (e) { failed++; console.error("FAIL " + name + "\n  " + e.message); }
  }
  const glbPath = local(match(/\.load\("([^"]*\/landscape_realm\.glb(?:\?v=[a-f0-9]+)?)"/)[1]);
  const buffer = fs.readFileSync(glbPath);
  assert(buffer.length <= 2 * 1024 * 1024, "GLB-Sonde auf 2 MiB begrenzt");
  assert.equal(buffer.toString("ascii", 0, 4), "glTF"); assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length); assert.equal(buffer.readUInt32LE(16), 0x4e4f534a);
  const metadata = JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
  assert(metadata.nodes.length < 128 && metadata.meshes.length < 32, "Begrenzte GLB-Szene");
  assert(!metadata.images?.length && !metadata.buffers.some(b => b.uri), "Nur eingebettete, texturfreie GLB-Ressourcen");
  const gltf = await new Promise((resolve, reject) => new THREE.GLTFLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), "", resolve, reject));
  const world = new THREE.Scene(), glbContext = vm.createContext({ g: gltf, scene: world, landscape: null });
  const callback = match(/var o=g\.scene;[\s\S]*?landscape=o;/)[0];
  run(callback, glbContext); world.updateMatrixWorld(true);
  const meshes = []; gltf.scene.traverse(n => { if (n.isMesh) { n.material.side = THREE.DoubleSide; meshes.push(n); } });
  const ring = minTriangleRadius(meshes);
  console.log("HTML " + file + " · THREE r" + THREE.REVISION);
  console.log(`Korridor inkl. Curbs: |x|≤${corridorX.toFixed(3)}, z=[${zMin.toFixed(3)},${zMax.toFixed(3)}], Radius≤${corridorRadius.toFixed(3)}, Fahrbahnoberkante=${roadTop.toFixed(3)}`);
  console.log(`GLB ${path.relative(root, glbPath)}: ${metadata.nodes.length} Nodes, ${metadata.meshes.length} Meshes, ${ring.triangles} echte Dreiecke, minimaler projizierter Dreiecksabstand=${ring.min.toFixed(3)}`);
  test("GLB-Loader und Metadaten stimmen überein; reales Ringzentrum bleibt leer", () => {
    assert.equal(meshes.length, metadata.meshes.length);
    const declared = metadata.meshes.flatMap(m => m.primitives).reduce((s, p) => s + metadata.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
    assert.equal(ring.triangles, declared); assert.equal(verticalHits(meshes, 0, 0).length, 0);
  });
  for (const coarse of [false, true]) test(`Hügel ${coarse ? "mobil" : "Desktop"}: alle affinen Zufallsextreme und beliebige Y-Drehung halten den Korridor frei`, () => {
    const sample = hills(coarse, [0.5]); let minimum = Infinity;
    assert(sample.length > 0 && sample.length <= 32);
    for (let k = 0; k < sample.length; k++) {
      const x = affineBounds(positions[0], k), sx = affineBounds(scales[0], k), sz = affineBounds(scales[2], k);
      const centreDistance = x[0] <= 0 && x[1] >= 0 ? 0 : Math.min(Math.abs(x[0]), Math.abs(x[1]));
      const support = projectedRadius(sample[k].geometry) * Math.max(...sx.map(Math.abs), ...sz.map(Math.abs));
      minimum = Math.min(minimum, centreDistance - support);
    }
    // Konkreter Raycast mit zulässigem mittigem Zufallswert und grossen Hügeln:
    // im alten HTML liegt der Hügel auf x=0 und ragt über die echte Fahrbahnhöhe.
    const witness = hills(coarse, [0.5, 0, 1 / 3, 1 - Number.EPSILON, 1 - Number.EPSILON, 1 - Number.EPSILON, 0]);
    const hits = verticalHits(witness, 0, witness[0].position.z).filter(h => h.point.y >= roadTop);
    console.log(`  Hügel-Grenze |x|≥${minimum.toFixed(3)}; Mittelachsen-Rayhits oberhalb Fahrbahn=${hits.length}`);
    assert.equal(hits.length, 0, "Alter Hügel verdeckt die Mittelachse: Y=" + hits[0]?.point.y.toFixed(3));
    assert(minimum > corridorX + 1e-6, `Hügel können in den Korridor ragen: ${minimum.toFixed(3)} ≤ ${corridorX.toFixed(3)}`);
    for (let k = 1; k < sample.length; k++) assert(sample[k - 1].position.x * sample[k].position.x < 0, "Hügel müssen Seiten abwechseln");
  });
  test("Alle transformierten GLB-Dreiecke liegen ausserhalb der gesamten sichtbaren Strecke, für jede Rasterphase und Streckendistanz", () => {
    assert(!/\blandscape\s*\.\s*(?:position|rotation|scale|quaternion|matrix|translate|rotate)/.test(html.replace(callback, "")), "Der Ring darf nach dem Laden nicht bewegt werden");
    assert(ring.min > corridorRadius + 1e-6, `Ring schneidet den Streckenkorridor: ${ring.min.toFixed(3)} ≤ ${corridorRadius.toFixed(3)}`);
  });
  test("Echte GLB-Raycasts entlang aller sichtbaren Tiles und drei Fahrspuren verdecken keine Fahrbahn", () => {
    // Enthält die Bildposition 54 sowie positive/negative Kurven und Rasterphasen.
    const distances = [0, 54, SP / 2, SP * 101 + SP / 2, SP * 301 + SP / 2, SP * 499];
    let rays = 0, witness = null;
    for (const dist of distances) {
      trackContext.dist = dist; run(positionLoop, trackContext);
      for (const tile of road) for (const lane of [-0.85, 0, 0.85]) {
        const x = tile.position.x + lane * trackContext.HALF, z = tile.position.z;
        const hit = verticalHits(meshes, x, z).find(h => h.point.y >= roadTop);
        rays++; if (hit && !witness) witness = { dist, x, z, y: hit.point.y, mesh: hit.object.name };
      }
    }
    console.log("  GLB-Raycasts=" + rays + (witness ? " · Überschneidung=" + JSON.stringify(witness) : " · keine Überschneidung"));
    assert.equal(witness, null, "Ring liegt über der Straße: " + JSON.stringify(witness));
  });
  console.log(`${passed} bestanden, ${failed} Fehler. Grenzen: Geometrie/Korridor, keine Bild-, Nebel-, Material- oder Leistungsprüfung; keine Browser/GPU.`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
