// pruef_warum.mjs <titelteil> [kategorie-teil]: warum landet ein Produkt (nicht) in einer Kategorie
import fs from 'fs';
import { R, geschlechtPasst } from './pruef_kern.mjs';
import { GEN_JE_DATEI } from './geschlecht_gemeinsam.mjs';
const d = JSON.parse(fs.readFileSync('/tmp/mode_daten.json','utf8'));
const kor = fs.existsSync('g_korrekturen.json') ? JSON.parse(fs.readFileSync('g_korrekturen.json','utf8')) : {};
const t = process.argv[2].toLowerCase(), kteil = process.argv[3] || '';
const ps = d.filter(p => p.title.toLowerCase().includes(t)).slice(0, 4).map(p => kor[p.handle] ? { ...p, g: kor[p.handle].g } : p);   // g_korrekturen.json wird angewendet
for (const p of ps) {
  console.log('##', p.title, '|', p.g, '| tags:', (p.tags||[]).slice(0,6).join(','), '| type:', p.type);
  for (const f of ['damen-bekleidung','herren-bekleidung','kinder-baby-bekleidung','schuhe-accessoires']) {
    const j = JSON.parse(fs.readFileSync(f+'.json','utf8')); const gen = GEN_JE_DATEI[f](p);
    for (const k of j.kategorien) {
      if (kteil && !k.handle.includes(kteil)) continue;
      const g = p.g||'';
      const gOk = k.g_prefix.length ? k.g_prefix.some(x=>g.startsWith(x)) : true;
      if (!gOk && !kteil) continue;
      const tm = !k.titel_muss.length || k.titel_muss.some(s=>R(s).test(p.title));
      const tn = k.titel_nicht.findIndex(s=>R(s).test(p.title));
      const gn = k.g_nicht.some(x=>g.startsWith(x));
      const tg = k.tags_nicht.find(x=>(p.tags||[]).includes(x));
      const gp = geschlechtPasst(k, gen);
      console.log(`  ${k.handle.padEnd(32)} g:${gOk?'ok':'NEIN'} muss:${tm?'ok':'NEIN'} nicht:${tn<0?'ok':'TREFFER#'+tn+' '+k.titel_nicht[tn].slice(0,70)} gnicht:${gn?'TREFFER':'ok'} tag:${tg||'ok'} gesch(${gen}):${gp?'ok':'NEIN'}`);
    }
  }
}
