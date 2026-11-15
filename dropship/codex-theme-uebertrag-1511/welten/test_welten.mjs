import { jsonc, aendereSektion, aendereSchemaLocale, aendereIndex, aendereCss, MOTIVE } from './welten_bilder.mjs';
import { readFileSync, readdirSync } from 'node:fs';
const dir=new URL('../sicherung', import.meta.url).pathname; const f=p=>readFileSync(dir+'/'+readdirSync(dir).find(n=>n.startsWith('uebertrag.'+p+'.nach-')),'utf8');
let ok=0, bad=0; const t=(n,c)=>{ if(c){ok++}else{bad++;console.log('FEHLER',n)} };
const s=aendereSektion(f('sections__luxe-edit-home.liquid'));
for(const m of MOTIVE){ t('zweig '+m.key, s.includes(`lx_parts[1] == '${m.key}' and section.settings.worlds_${m.key}_image != blank`)); t('schema '+m.key, s.includes(`"id":"worlds_${m.key}_image"`)); }
// Schema-JSON gültig
const sch=s.slice(s.indexOf('{% schema %}')+12, s.indexOf('{% endschema %}')); try{ const j=JSON.parse(sch); t('schema json', true); const ids=JSON.stringify(j).match(/worlds_[a-z]+_image/g); t('7 bildwaehler', new Set(ids).size===7);}catch(e){t('schema json '+e.message,false)}
// Reihenfolge: neue Zweige zwischen jewellery und endif
const iJ=s.indexOf("lx_parts[1] == 'jewellery'"), iW=s.indexOf("lx_parts[1] == 'women'"), iE=s.indexOf('{% endif %}', iJ); t('reihenfolge', iJ<iW && iW<iE);
for(const sp of ['de','en.default']){ const raw=f('locales__'+sp+'.schema.json'); const n=aendereSchemaLocale(raw, sp==='de'?'de':'en'); const j=jsonc(n); t('locale '+sp, MOTIVE.every(m=>j.luxe_world_cards[m.key+'_image'])); t('locale alt erhalten '+sp, j.luxe_world_cards.kids_image && j.luxe_world_cards.jewellery_image);}
const ix=aendereIndex(f('templates__index.json')); const jx=jsonc(ix); const sec=Object.values(jx.sections).find(x=>x.settings&&x.settings.worlds_kids_image); t('index 5 neue', MOTIVE.every(m=>sec.settings['worlds_'+m.key+'_image']==='shopify://shop_images/'+m.datei)); t('index kids bleibt', sec.settings.worlds_kids_image.includes('kinder-baby'));
const css=aendereCss(f('assets__luxe-edit.css')); t('css zusatz', css.endsWith('}\n') && css.includes('prefers-reduced-motion:no-preference')); let doppelt=false; try{aendereCss(css)}catch(e){doppelt=true} t('css nicht doppelt', doppelt);
// Fehlender Anker wirft
let w=false; try{aendereSektion('x')}catch(e){w=true} t('anker fehlt wirft', w);
console.log(`ok ${ok}, fehler ${bad}`); process.exit(bad?1:0);
