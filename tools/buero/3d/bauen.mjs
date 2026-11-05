// Bündelt das 3D-Büro für das Dashboard: ein Code-Paket und mehrere Modell-Pakete (je unter 256 KB, das Limit des Speichers).
// Aufruf: node bauen.mjs <Ausgabeordner>     (liest models/*.glb über pack/glb2pack.mjs, siehe dort die Liste)
import fs from 'node:fs';
import path from 'node:path';
import { LISTE, convert } from './pack/glb2pack.mjs';

const HIER = path.dirname(new URL(import.meta.url).pathname);
const out = process.argv[2];
if (!out) { console.error('Ausgabeordner fehlt'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const LIMIT = 232 * 1024;

// 1) Code: Reihenfolge wie die Abhängigkeiten
const MODULE = ['kb3d-engine.js', 'kb3d-tex.js', 'kb3d-props.js', 'kb3d-model.js', 'kb3d-figur.js', 'kb3d-world.js', 'kb3d-buero.js'];
const code = MODULE.map((f) => '/* ==== ' + f + ' ==== */\n' + fs.readFileSync(path.join(HIER, f), 'utf8')).join('\n');
fs.writeFileSync(path.join(out, 'kb3d-code.js'), code);
console.log('kb3d-code.js', Math.round(code.length / 1024) + ' KB');

// 2) Modelle: je Modell eine Zeile, auf Dateien verteilt (grösste zuerst)
const eintraege = LISTE.map((e) => {
  const r = convert(e);
  const js = 'window.KB3D_PACK[' + JSON.stringify(e.id) + ']=' + JSON.stringify({ ...r.head, d: r.bytes.toString('base64') }) + ';\n';
  return { id: e.id, js, tris: r.tris };
}).sort((a, b) => b.js.length - a.js.length);
const dateien = [];
for (const e of eintraege) {
  let d = dateien.find((x) => x.size + e.js.length <= LIMIT);
  if (!d) { d = { size: 0, teile: [] }; dateien.push(d); }
  d.teile.push(e); d.size += e.js.length;
}
let tris = 0;
dateien.forEach((d, i) => {
  const text = 'window.KB3D_PACK=window.KB3D_PACK||{};\n' + d.teile.map((e) => e.js).join('');
  fs.writeFileSync(path.join(out, 'kb3d-pack-' + (i + 1) + '.js'), text);
  d.teile.forEach((e) => { tris += e.tris; });
  console.log('kb3d-pack-' + (i + 1) + '.js', Math.round(text.length / 1024) + ' KB', d.teile.map((e) => e.id).join(','));
});
console.log('Modelle:', eintraege.length, 'Dreiecke:', tris, 'Dateien:', dateien.length);
