// Wandelt Modelle aus models/*.glb (CC0 bzw. eigenproduziert, Traumhaus-Spiel) in ein kompaktes Paket für das 3D-Büro um.
// Je Modell: Teile mit Farbplatz (Palette), Eckpunkte als 16-Bit-Zahlen, Dreiecke als 16-Bit-Zahlen, alles base64.
// Verkleinert wird je Teil durch Zusammenfassen von Eckpunkten in einem Raster (Vertex-Clustering).
// Aufruf: node glb2pack.mjs <Ausgabeordner> [modellId ...]   (ohne IDs: alle aus der Liste)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const MODELS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../models');

// Liste: id, Datei, Ziel-Dreiecke (nach Verkleinerung), Art ('human' teilt in Gruppen), Optionen
export const LISTE = [
  { id: 'man', file: 'th30_mensch_mann.glb', target: 3200, human: true },
  { id: 'woman', file: 'th30_mensch_frau.glb', target: 3200, human: true },
  { id: 'worker', file: 'th30_arbeiter.glb', target: 3400, human: true },
  { id: 'desk', file: 'th11_schreibtisch.glb', target: 3600 },
  { id: 'chair', file: 'th11_buerostuhl.glb', target: 2000 },
  { id: 'sofa', file: 'th11_sofa.glb', target: 1800 },
  { id: 'armchair', file: 'th_sessel.glb', target: 650 },
  { id: 'relax', file: 'th2_relaxsessel.glb', target: 200 },
  { id: 'shopshelf', file: 'th11_ladenregal.glb', target: 3600 },
  { id: 'bookshelf', file: 'th_buecherregal.glb', target: 560 },
  { id: 'planter', file: 'th11_pflanzkuebel_innen.glb', target: 2200 },
  { id: 'plant', file: 'th_pflanze.glb', target: 1200 },
  { id: 'fridge', file: 'th_kuehlschrank.glb', target: 340 },
  { id: 'lamp', file: 'th_lampe.glb', target: 300 },
  { id: 'table', file: 'th_tisch.glb', target: 540 },
  { id: 'van', file: 'th7_lieferwagen.glb', target: 3200 },
  { id: 'cart', file: 'th41_gepaeckkarre.glb', target: 3200 },
  { id: 'counter', file: 'th11_empfangstheke.glb', target: 3000 },
  { id: 'bin', file: 'th4_muelleimer.glb', target: 340 },
  { id: 'coatrack', file: 'th2_garderobe.glb', target: 190 },
  { id: 'kitchen', file: 'th11_kuechenzeile.glb', target: 2800 }
];

function readGLB(file) {
  const b = fs.readFileSync(file);
  const jl = b.readUInt32LE(12);
  const json = JSON.parse(b.slice(20, 20 + jl).toString('utf8'));
  let bin = null;
  let off = 20 + jl;
  while (off < b.length) {
    const cl = b.readUInt32LE(off), ct = b.readUInt32LE(off + 4);
    if (ct === 0x004e4942) { bin = b.slice(off + 8, off + 8 + cl); break; }
    off += 8 + cl;
  }
  return { json, bin };
}
const CS = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function readAcc(json, bin, i) {
  const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
  const n = NC[a.type], cs = CS[a.componentType], stride = bv.byteStride || cs * n;
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = new Float64Array(a.count * n);
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) {
    const o = base + k * stride + c * cs;
    let v;
    switch (a.componentType) {
      case 5126: v = dv.getFloat32(o, true); break;
      case 5123: v = dv.getUint16(o, true); break;
      case 5125: v = dv.getUint32(o, true); break;
      case 5121: v = dv.getUint8(o); break;
      case 5122: v = dv.getInt16(o, true); break;
      default: v = dv.getInt8(o);
    }
    out[k * n + c] = v;
  }
  return out;
}

// 4x4-Matrizen (spaltenweise)
const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul4(a, b) { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function trs(n) {
  if (n.matrix) return n.matrix.slice();
  const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
  const [x, y, z, w] = q;
  const R = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1];
  const S = [s[0], 0, 0, 0, 0, s[1], 0, 0, 0, 0, s[2], 0, 0, 0, 0, 1];
  const T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, t[0], t[1], t[2], 1];
  return mul4(T, mul4(R, S));
}
function xf(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }

// Alle Dreiecke eines Modells als Teile: { node, name, mat, pos(Float64 3V), idx(Uint32 3T), cen }
function parts(json, bin) {
  const out = [];
  const sc = json.scenes[json.scene || 0];
  sc.nodes.forEach((r) => (function walk(ni, pm) {
    const n = json.nodes[ni], m = mul4(pm, trs(n));
    if (n.mesh != null) {
      json.meshes[n.mesh].primitives.forEach((pr) => {
        if (pr.mode != null && pr.mode !== 4) return;
        const pos = readAcc(json, bin, pr.attributes.POSITION);
        const V = pos.length / 3;
        const wp = new Float64Array(pos.length);
        for (let v = 0; v < V; v++) { const q = xf(m, [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]); wp[v * 3] = q[0]; wp[v * 3 + 1] = q[1]; wp[v * 3 + 2] = q[2]; }
        let idx;
        if (pr.indices != null) idx = Uint32Array.from(readAcc(json, bin, pr.indices));
        else { idx = new Uint32Array(V); for (let v = 0; v < V; v++) idx[v] = v; }
        out.push({ node: ni, name: n.name || '', mat: pr.material != null ? pr.material : -1, pos: wp, idx, trans: [m[12], m[13], m[14]] });
      });
    }
    (n.children || []).forEach((c) => walk(c, m));
  })(r, I4()));
  return out;
}

// Verkleinern: Eckpunkte in Rasterzellen zusammenfassen
function bboxOf(pos) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let v = 0; v < pos.length; v += 3) for (let c = 0; c < 3; c++) { if (pos[v + c] < mn[c]) mn[c] = pos[v + c]; if (pos[v + c] > mx[c]) mx[c] = pos[v + c]; }
  return { mn, mx };
}
function clusterOnce(pos, idx, N, bb) {
  const ext = Math.max(bb.mx[0] - bb.mn[0], bb.mx[1] - bb.mn[1], bb.mx[2] - bb.mn[2], 1e-6), cell = ext / N;
  const V = pos.length / 3, key = new Map(), remap = new Int32Array(V), sum = [], cnt = [];
  for (let v = 0; v < V; v++) {
    const ix = Math.floor((pos[v * 3] - bb.mn[0]) / cell), iy = Math.floor((pos[v * 3 + 1] - bb.mn[1]) / cell), iz = Math.floor((pos[v * 3 + 2] - bb.mn[2]) / cell);
    const k = ix + (N + 2) * (iy + (N + 2) * iz);
    let id = key.get(k);
    if (id === undefined) { id = sum.length / 3; key.set(k, id); sum.push(0, 0, 0); cnt.push(0); }
    remap[v] = id; sum[id * 3] += pos[v * 3]; sum[id * 3 + 1] += pos[v * 3 + 1]; sum[id * 3 + 2] += pos[v * 3 + 2]; cnt[id]++;
  }
  const np = new Float64Array(sum.length);
  for (let i = 0; i < cnt.length; i++) { np[i * 3] = sum[i * 3] / cnt[i]; np[i * 3 + 1] = sum[i * 3 + 1] / cnt[i]; np[i * 3 + 2] = sum[i * 3 + 2] / cnt[i]; }
  const seen = new Set(), ni = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = remap[idx[t]], b = remap[idx[t + 1]], c = remap[idx[t + 2]];
    if (a === b || b === c || a === c) continue;
    const s = [a, b, c].sort((x, y) => x - y).join(',');
    if (seen.has(s)) continue;
    seen.add(s); ni.push(a, b, c);
  }
  return { pos: np, idx: Uint32Array.from(ni) };
}
function decimate(p, target) {
  const tris = p.idx.length / 3;
  if (tris <= Math.max(target, 40)) return { pos: p.pos, idx: p.idx };
  const bb = bboxOf(p.pos);
  let lo = 2, hi = 160, best = clusterOnce(p.pos, p.idx, hi, bb);
  if (best.idx.length / 3 <= target) return best;
  while (lo < hi) {
    const mid = (lo + hi) >> 1, r = clusterOnce(p.pos, p.idx, mid, bb);
    if (r.idx.length / 3 >= target) { best = r; hi = mid; } else lo = mid + 1;
  }
  return best;
}
function compact(pos, idx) {
  // unbenutzte Eckpunkte entfernen
  const used = new Int32Array(pos.length / 3).fill(-1); let n = 0; const np = [];
  const ni = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) { const v = idx[i]; if (used[v] < 0) { used[v] = n++; np.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); } ni[i] = used[v]; }
  return { pos: Float64Array.from(np), idx: ni };
}

// Gruppe eines Menschenteils nach Lage (Modell: vorne = -z, Höhe 0 bis ca. 1,8; Seiten N = x<0, P = x>0)
function humanGroup(p, mname) {
  const [x, y] = p.trans;
  if (mname === 'Auge') return 'eyes';
  const side = x < 0 ? 'N' : 'P';
  if (p.name === 'Loft' || p.name === 'Loft.001') return 'torso';
  if (Math.abs(x) < 0.12 && y >= 1.515) return 'head';
  if (Math.abs(x) >= 0.12 && y >= 0.72) return y >= 1.2 ? 'armU' + side : 'armL' + side;
  if (Math.abs(x) >= 0.06 && y < 1.0) return y >= 0.62 ? 'thigh' + side : 'shin' + side;
  return 'torso';
}

function srgb(c) { return c.map((v) => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2)); }

export function convert(entry) {
  const { json, bin } = readGLB(path.join(MODELS_DIR, entry.file));
  const all = parts(json, bin);
  const matInfo = json.materials || [];
  const slotOf = new Map(), pal = [], names = [];
  function slot(mi) {
    if (slotOf.has(mi)) return slotOf.get(mi);
    const m = matInfo[mi] || {}, pb = m.pbrMetallicRoughness || {};
    const bc = pb.baseColorFactor || [0.7, 0.7, 0.7, 1];
    const em = m.emissiveFactor && Math.max(...m.emissiveFactor) > 0.3 ? 1 : 0;
    const c = em ? srgb(m.emissiveFactor.map((v, i) => Math.max(v, bc[i] * 0.2))) : srgb(bc.slice(0, 3));
    const s = pal.length; pal.push([+c[0].toFixed(3), +c[1].toFixed(3), +c[2].toFixed(3), em]); names.push(m.name || ('m' + mi));
    slotOf.set(mi, s);
    return s;
  }
  const total = all.reduce((a, p) => a + p.idx.length / 3, 0);
  const ratio = Math.min(1, entry.target / total);
  const outParts = [];
  const groups = [];
  all.forEach((p) => {
    const mat = matInfo[p.mat] || {};
    const pb = mat.pbrMetallicRoughness || {};
    if (pb.baseColorTexture || mat.alphaMode === 'BLEND') return;     // Texturen und Glas lassen wir weg
    const t = Math.max(24, Math.round(p.idx.length / 3 * ratio));
    const d = decimate(p, t);
    const c = compact(d.pos, d.idx);
    if (!c.idx.length) return;
    const g = entry.human ? humanGroup(p, mat.name || '') : 'all';
    if (groups.indexOf(g) < 0) groups.push(g);
    outParts.push({ g: groups.indexOf(g), s: slot(p.mat), pos: c.pos, idx: c.idx });
  });
  // gemeinsame Box, 16-Bit-Raster
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  outParts.forEach((p) => { const b = bboxOf(p.pos); for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], b.mn[c]); mx[c] = Math.max(mx[c], b.mx[c]); } });
  let V = 0, T = 0;
  outParts.forEach((p) => { V += p.pos.length / 3; T += p.idx.length / 3; });
  const posQ = new Int16Array(V * 3), idxQ = new Uint16Array(T * 3), table = [];
  let v0 = 0, t0 = 0;
  outParts.forEach((p) => {
    const vn = p.pos.length / 3, tn = p.idx.length / 3;
    for (let i = 0; i < p.pos.length; i++) { const c = i % 3, span = mx[c] - mn[c] || 1; posQ[v0 * 3 + i] = Math.round((p.pos[i] - mn[c]) / span * 65535) - 32768; }
    for (let i = 0; i < p.idx.length; i++) idxQ[t0 * 3 + i] = p.idx[i] + v0;
    table.push([p.g, p.s, v0, vn, t0, tn]);
    v0 += vn; t0 += tn;
  });
  const buf = Buffer.concat([Buffer.from(posQ.buffer), Buffer.from(idxQ.buffer)]);
  return {
    id: entry.id, from: entry.file, trisBefore: total, tris: T, verts: V,
    head: { b: [...mn, ...mx].map((x) => +x.toFixed(4)), pal, n: names, g: groups, p: table, V, T },
    bytes: buf
  };
}

if (process.argv[1] && process.argv[1].endsWith('glb2pack.mjs')) {
  const outDir = process.argv[2];
  const only = process.argv.slice(3);
  fs.mkdirSync(outDir, { recursive: true });
  let sumB = 0, sumT = 0;
  for (const e of LISTE) {
    if (only.length && only.indexOf(e.id) < 0) continue;
    try {
      const r = convert(e);
      const b64 = r.bytes.toString('base64');
      const js = 'window.KB3D_PACK=window.KB3D_PACK||{};window.KB3D_PACK[' + JSON.stringify(e.id) + ']=' + JSON.stringify({ ...r.head, d: b64 }) + ';\n';
      fs.writeFileSync(path.join(outDir, 'pack-' + e.id + '.js'), js);
      sumB += js.length; sumT += r.tris;
      console.log(e.id.padEnd(10), String(r.trisBefore).padStart(6), '->', String(r.tris).padStart(5), 'Dreiecke', String(r.verts).padStart(6), 'Punkte', Math.round(js.length / 1024) + ' KB', 'Gruppen=' + r.head.g.join(','));
    } catch (err) { console.log(e.id, 'FEHLER', err.message); }
  }
  console.log('Summe:', Math.round(sumB / 1024) + ' KB,', sumT, 'Dreiecke');
}
