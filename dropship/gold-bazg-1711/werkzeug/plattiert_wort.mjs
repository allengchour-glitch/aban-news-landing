import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
const R = { goldplattiert: /goldplattier|gold-plattier|gold plattier|platin-?plattier|plaqu[eé]|doubl[eé]\b|gold[- ]?filled|goldgefüllt|gold-füllung|goldfüllung/, elektroplattiert: /(?<!gold)elektroplattier|elektro-plattier/, vergoldet: /vergold|gold[- ]plated|goldplated/, plattiert_allgemein: /plattier/ };
const z = Object.fromEntries(Object.keys(R).map((k) => [k, { titel: 0, nurText: 0, h: [] }]));
let n = 0;
for await (const l of createInterface({ input: createReadStream('produkte_voll.jsonl'), crlfDelay: Infinity })) {
  if (!l.trim()) continue; const p = JSON.parse(l); n++;
  const t = (p.title || '').toLowerCase(), d = ((p.description || '') + ' ' + (p.options || []).map((o) => o.values.join(' ')).join(' ')).toLowerCase();
  for (const [k, re] of Object.entries(R)) { if (re.test(t)) { z[k].titel++; z[k].h.push(p.handle); } else if (re.test(d)) { z[k].nurText++; z[k].h.push(p.handle); } }
}
console.log('Produkte', n);
for (const [k, v] of Object.entries(z)) console.log(k, 'im Titel', v.titel, '| nur im Text/Optionen', v.nurText, '| zusammen', v.h.length);
import { writeFileSync } from 'node:fs'; writeFileSync('plattiert_wort.json', JSON.stringify(z));
