// pruef_diff.mjs <kategorie>: Mitgliederunterschied vorher (Abteilungsregeln, .json.vorher) gegen nachher (gemeinsame Regel, .json)
import fs from 'fs';
import { passt } from './pruef_kern.mjs';
import { GEN_JE_DATEI } from './geschlecht_gemeinsam.mjs';
const damenMod = await import('./damen-bekleidung_regeln.mjs'); const herrenGen = await import('./herren_gen.mjs'); const kinderMod = await import('./kinder-baby-bekleidung_regeln.mjs'); const saMod = await import('./sa_regeln.mjs');
const OLD = { 'damen-bekleidung': p => damenMod.geschlechtQuelle(p)[0], 'herren-bekleidung': p => herrenGen.geschlecht(p), 'kinder-baby-bekleidung': p => kinderMod.geschlechtQuelle(p)[0], 'schuhe-accessoires': p => saMod.geschlecht(p)[0] };
const d = JSON.parse(fs.readFileSync('/tmp/mode_daten.json','utf8'));
const alle = ['damen-bekleidung','herren-bekleidung','kinder-baby-bekleidung','schuhe-accessoires'];
const want = process.argv[2];
for (const f of alle) {
  const jn = JSON.parse(fs.readFileSync(f+'.json','utf8')), jo = JSON.parse(fs.readFileSync(f+'.json.vorher','utf8'));
  for (const k of jn.kategorien) {
    if (want && k.handle !== want) continue;
    const ko = jo.kategorien.find(x=>x.handle===k.handle);
    const neu = new Set(), alt = new Set();
    d.forEach((p,i)=>{ if (passt(k,p,GEN_JE_DATEI[f](p))) neu.add(i); if (ko && passt(ko,p,OLD[f](p))) alt.add(i); });
    const plus = [...neu].filter(i=>!alt.has(i)), minus = [...alt].filter(i=>!neu.has(i));
    if (!want) { console.log(String(alt.size).padStart(5), '->', String(neu.size).padStart(5), k.handle.padEnd(36), `+${plus.length} -${minus.length}`); continue; }
    console.log(k.handle, 'alt', alt.size, 'neu', neu.size);
    console.log('+ neu dabei:'); plus.slice(0,60).forEach(i=>console.log('   ', d[i].title.slice(0,90)));
    console.log('- weggefallen:'); minus.slice(0,60).forEach(i=>console.log('   ', d[i].title.slice(0,90)));
  }
}
