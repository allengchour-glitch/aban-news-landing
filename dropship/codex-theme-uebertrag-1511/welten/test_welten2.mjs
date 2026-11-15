import { jsonc, aendereSektion, aendereSchemaLocale, aendereIndex, aendereCss, MOTIVE } from './welten2.mjs';
import { readFileSync } from 'node:fs';
const f = p => readFileSync(new URL('./sicherung/welten.' + p + '.nach', import.meta.url), 'utf8');
let ok = 0, bad = 0; const t = (n, c) => { if (c) ok++; else { bad++; console.log('FEHLER', n); } };
const s = aendereSektion(f('sections__luxe-edit-home.liquid'));
for (const m of MOTIVE) { t('zweig ' + m.key, s.includes(`lx_parts[1] == '${m.key}' and section.settings.worlds_${m.key}_image != blank`)); t('schema ' + m.key, s.includes(`"id":"worlds_${m.key}_image"`)); }
// die Schlüssel müssen zu den Welten der Liste passen
const liste = s.match(/assign lx_home_categories = '([^']+)'/)[1].split(',').map(x => x.split('|')[1]);
for (const m of MOTIVE) t('schluessel in liste ' + m.key, liste.includes(m.key));
const sch = s.slice(s.indexOf('{% schema %}') + 12, s.indexOf('{% endschema %}'));
const j = JSON.parse(sch); const ids = new Set(JSON.stringify(j).match(/worlds_[a-z]+_image/g)); t('14 bildwaehler', ids.size === 14);
// Beauty/Sport-Zweige unverändert vor den Bildwählern? (die festen Szenen gewinnen weiter)
t('beauty bleibt', s.includes("{% if lx_collection.handle == 'beauty-pflege' %}"));
for (const sp of ['de', 'en.default']) { const n = aendereSchemaLocale(f('locales__' + sp + '.schema.json'), sp === 'de' ? 'de' : 'en'); const jj = jsonc(n); t('locale ' + sp, MOTIVE.every(m => jj.luxe_world_cards[m.key + '_image'])); t('locale stufe1 ' + sp, jj.luxe_world_cards.gifts_image && jj.luxe_world_cards.kids_image); }
const ix = jsonc(aendereIndex(f('templates__index.json'))); const sec = Object.values(ix.sections).find(x => x.settings && x.settings.worlds_kids_image);
t('index 7 neue', MOTIVE.every(m => sec.settings['worlds_' + m.key + '_image'] === 'shopify://shop_images/' + m.datei)); t('index stufe1 bleibt', sec.settings.worlds_gifts_image.includes('geschenke'));
const css = aendereCss(f('assets__luxe-edit.css')); t('css 4:3', css.includes('aspect-ratio:4/3')); t('css hover bleibt einmal', css.split('lx-welten-1511:').length === 2);
// 4:3-Regel steht NACH Codex' 1:1-Regel (gleiche Spezifität, spätere gewinnt)
t('css reihenfolge', css.indexOf('.lx-worlds--photo-grid .lx-category-tile{aspect-ratio:1;') > 0 && css.indexOf('.lx-worlds--photo-grid .lx-category-tile{aspect-ratio:1;') < css.indexOf('lx-welten-1511b'));
let d = false; try { aendereCss(css) } catch { d = true } t('css nicht doppelt', d);
console.log(`ok ${ok}, fehler ${bad}`); process.exit(bad ? 1 : 0);
