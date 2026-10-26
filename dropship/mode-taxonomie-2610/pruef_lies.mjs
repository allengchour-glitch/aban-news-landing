// pruef_lies.mjs <datei-stichprobe...>: kompakte Ausgabe der Stichprobendateien
import fs from 'fs';
for (const h of process.argv.slice(2)) {
  const t = fs.readFileSync(`/tmp/mode_taxonomie/pruef_stichproben/${h}.txt`, 'utf8').trim().split('\n');
  console.log(`### ${h}`);
  for (const l of t) { const [n, handle, title, meta] = l.split('\t'); const m = meta.replace(/\[|\]/g,'').split('|'); console.log(`${n} ${title.slice(0,88)}  <${m[0].slice(0,22)}|${m[1]}>`); }
}
