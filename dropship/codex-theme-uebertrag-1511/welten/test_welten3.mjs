import { jsonc, aendereSektion, aendereSchemaLocale, aendereIndex, aendereCss, MOTIVE, HUND } from './welten3.mjs';
import { readFileSync } from 'node:fs';
const f = p => readFileSync(new URL('./sicherung/welten2.' + p + '.nach', import.meta.url), 'utf8');
let ok = 0, bad = 0; const t = (n, c) => { if (c) ok++; else { bad++; console.log('FEHLER', n); } };
const s = aendereSektion(f('sections__luxe-edit-home.liquid'));
for (const m of MOTIVE) { t('zweig ' + m.key, s.includes(`lx_parts[1] == '${m.key}' and section.settings.worlds_${m.key}_image != blank %}`)); t('merker ' + m.key, s.includes(`worlds_${m.key}_image %}{% assign lx_eigenes_motiv = true %}`)); t('schema ' + m.key, s.includes(`"id":"worlds_${m.key}_image"`)); }
t('merker zurueckgesetzt', s.includes('{% assign lx_world_image = lx_collection.image %}{% assign lx_eigenes_motiv = false %}'));
t('beauty fest nur ohne motiv', s.includes("{% if lx_collection.handle == 'beauty-pflege' and lx_eigenes_motiv == false %}"));
t('sport fest nur ohne motiv', s.includes("{% elsif lx_collection.handle == 'sport-outdoor' and lx_eigenes_motiv == false %}"));
const liste = s.match(/assign lx_home_categories = '([^']+)'/)[1].split(',').map(x => x.split('|')[1]);
t('beauty/sport schluessel', liste.includes('beauty') && liste.includes('sport'));
const j = JSON.parse(s.slice(s.indexOf('{% schema %}') + 12, s.indexOf('{% endschema %}'))); t('16 bildwaehler', new Set(JSON.stringify(j).match(/worlds_[a-z]+_image/g)).size === 16);
for (const sp of ['de', 'en.default']) { const jj = jsonc(aendereSchemaLocale(f('locales__' + sp + '.schema.json'), sp === 'de' ? 'de' : 'en')); t('locale ' + sp, MOTIVE.every(m => jj.luxe_world_cards[m.key + '_image']) && jj.luxe_world_cards.dogs_image); }
const ix = jsonc(aendereIndex(f('templates__index.json'))); const sec = Object.values(ix.sections).find(x => x.settings && x.settings.worlds_kids_image);
t('index beauty/sport', MOTIVE.every(m => sec.settings['worlds_' + m.key + '_image'] === 'shopify://shop_images/' + m.datei));
t('index hund neu', sec.settings.worlds_dogs_image === 'shopify://shop_images/' + HUND.datei);
t('index rest bleibt', sec.settings.worlds_gaming_image.includes('gaming') && sec.settings.worlds_kids_image.includes('kinder'));
const css = aendereCss(f('assets__luxe-edit.css'));
t('css c', css.includes('lx-welten-1511c')); t('css hyphens', css.includes('hyphens:auto')); t('css tablet', css.includes('(min-width:761px) and (max-width:1099px)')); t('css hund', css.includes('[data-category-handle="hundewelt"]'));
t('css reihenfolge', css.indexOf('lx-welten-1511b') < css.indexOf('lx-welten-1511c'));
let d = false; try { aendereCss(css) } catch { d = true } t('css nicht doppelt', d);
console.log(`ok ${ok}, fehler ${bad}`); process.exit(bad ? 1 : 0);
