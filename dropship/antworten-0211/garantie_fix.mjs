import fs from 'node:fs';import { g } from './sh.mjs';
const id='gid://shopify/Page/697899942273';
fs.mkdirSync('/home/user/aban-news-landing/dropship/handyhuellen-0211',{recursive:true});
const alt='Die Garantie von LuxeStyle CH: 30 Tage Geld zurück und 12 Monate Herstellergarantie auf Elektronik. Was abgedeckt ist und wer den Rückversand zahlt.';
fs.writeFileSync('/home/user/aban-news-landing/dropship/handyhuellen-0211/garantie-meta-vorher.txt',alt+'\n');
const neu='Garantie & Rückgabe bei LuxeStyle CH: 30 Tage Rückgaberecht, bei Defekt oder falscher Lieferung Ersatz oder Erstattung. Was abgedeckt ist und wer den Rückversand zahlt.';
const r=(await g(`mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{key value} userErrors{field message}}}`,{m:[{ownerId:id,namespace:'global',key:'description_tag',type:'single_line_text_field',value:neu}]})).metafieldsSet;
console.log(JSON.stringify(r));console.log(neu.length);
