// Gezielte Mutationsprobe (Fassung Korrekturrunde 16.11.): jeder Mutant aendert lx-kopf-bewegt.liquid in einer KOPIE (THEME_DIR),
// dann laufen die Pruefungen, die den Fehler finden sollen. Der echte Ordner theme/ bleibt unveraendert (vorher/nachher md5).
// Aufruf: node test/mutationsprobe.mjs [M01 W1 ...]
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
const HIER = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const QUELLE = path.join(HIER, 'theme', 'snippets', 'lx-kopf-bewegt.liquid');
const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
// [id, name, [[alt, neu], ...], test, gleichwertig?]
const M = [
  ['M01', 'Handy-Sperre im Skript fehlt', [["if(!mm('(min-width: 750px)'))return;", '']], ['nachbau', 'schmuck', 'm664']],
  ['M03', 'Textabstand neben dem Clip fehlt', [['.lx-kk.lx-kb-clip .lx-kk__text{padding-right:calc(var(--lxkb-w) * .9 + 1rem)}', '']], ['nachbau', 'schmuck', 'd1100']],
  ['M04', 'Ken Burns zu stark (1,12)', [['lxkb-a{to{transform:scale(1.08)', 'lxkb-a{to{transform:scale(1.12)']], ['nachbau', 'damen-mode', 'd']],
  ['M05', 'reduzierte Bewegung im Skript ignoriert', [["mm('(prefers-reduced-motion: reduce)')||", '']], ['faelle', 'reduziert']],
  ['M07', 'Datensparmodus ignoriert', [["(c&&(c.saveData||/2g/.test(c.effectiveType||'')))", 'false']], ['faelle', 'sparen']],
  ['M08', 'Autoplay-Sperre nicht abgefangen', [["if(p&&p.catch)p.catch(function(e){if(!e||e.name!=='AbortError')aus();});", '']], ['faelle', 'autoplay']],
  ['M09', 'Clip ausserhalb des Bildes nicht pausiert', [['sicht=e[e.length-1].isIntersecting;', 'sicht=true;']], ['faelle', 'weg']],
  ['M10', 'Verfuegbarkeit (Produkt und Ausfuehrung) nicht geprueft', [['lxkb_prod != blank and lxkb_prod.available == true', 'lxkb_prod != blank'], [' and lxkb_va.available == true', '']], ['faelle', 'ausverkauft']],
  ['M11', 'Bewegung ohne Skript (Ken Burns nicht an Klasse gebunden)', [['.lx-kk.lx-kb-drift .lx-kk__bilder img{animation:', '.lx-kk .lx-kk__bilder img{animation:']], ['faelle', 'ohnejs']],
  ['M12', 'Parallaxe schon oben (cover statt exit)', [['animation-range:exit 0% exit 100%', 'animation-range:cover 0% cover 100%']], ['nachbau', 'damen-mode', 'd']],
  ['M13', 'Knopf merkt die Wahl nicht', [["w.localStorage.setItem('lx-kb-halt',halt?'1':'0');", '']], ['faelle', 'knopf']],
  ['M14', 'Rueckfall-Skript fehlt', [["if(!(w.CSS&&CSS.supports&&CSS.supports('animation-timeline','view()'))){", 'if(false){']], ['faelle', 'rueckfall']],
  ['M15', 'Clip auch ab 750 px', [["st=tp&&tp.content&&mm('(min-width: 1100px)')?", 'st=tp&&tp.content?']], ['nachbau', 'schmuck', 'd800']],
  ['M16', 'Ken Burns startet vor dem Laden der Kopffotos (LCP)', [['function spaeter(){drift();', "k.classList.add('lx-kb-drift');function spaeter(){"]], ['lcp', 'damen-mode']],
  // neu in der Korrekturrunde
  ['W1a', 'Fotos wieder mit overflow:hidden (Ausschnitt aendert sich)', [['.lx-kk.lx-kb-an .lx-kk__bilder picture{overflow:clip}', '.lx-kk.lx-kb-an .lx-kk__bilder picture{overflow:hidden}']], ['nachbau', 'damen-mode', 'd']],
  ['W1b', 'clip-path immer statt nur als Rueckfall (Bildglaettung aendert sich)', [['.lx-kk.lx-kb-an .lx-kk__bilder picture{overflow:clip}', '.lx-kk.lx-kb-an .lx-kk__bilder picture{overflow:clip;clip-path:inset(0)}']], ['nachbau', 'damen-mode', 'd']],
  ['W2', 'Geschirr wieder mit Teekanne', [["when 'geschirr-tisch', 'kaffee-tee-trinken'\n      assign lxkb_id = 's09'", "when 'geschirr-tisch', 'kaffee-tee-trinken'\n      assign lxkb_id = 's08'"]], ['faelle', 'w2']],
  ['W3a', 'Mitgliedschaft nicht geprueft', [['if lxkb_c.handle == collection.handle', 'if true']], ['faelle', 'w3']],
  ['W3b', 'Enddatum Weihnachtskugeln nicht geprueft', [['if lxkb_heute > lxkb_bis', 'if false']], ['faelle', 'w3']],
  ['W4', 'AbortError entfernt den Clip', [["p.catch(function(e){if(!e||e.name!=='AbortError')aus();})", 'p.catch(aus)']], ['faelle', 'w4']],
  ['K1', 'Ausfuehrung nicht geprueft (nur Produkt)', [['if lxkb_va.id == lxkb_vnr and lxkb_va.available == true', 'if lxkb_va.id == lxkb_vnr']], ['faelle', 'k1']],
  ['K2a', 'Anhalten stoppt die CSS-Parallaxe nicht', [['.lx-kk.lx-kb-halt .lx-kk__bilder,.lx-kk.lx-kb-halt .lx-kb__clip{animation:none!important;translate:none!important}', '']], ['faelle', 'k2']],
  ['K2b', 'Anhalten friert den Skript-Rueckfall ein', [['if(pr)pr();', '']], ['faelle', 'k2']],
  ['K3a', 'Textabstand nicht an die Klasse gebunden', [['.lx-kk.lx-kb-clip .lx-kk__text{padding-right', '.lx-kk .lx-kk__text{padding-right']], ['faelle', 'k3']],
  ['K3b', 'Buehne als versteckter div statt template (Poster laedt ohne JS)', [['<template class="lx-kb-vorlage">', '<div hidden class="lx-kb-vorlage">'], ['</div></div></template>', '</div></div></div>']], ['faelle', 'k3']],
  ['K4', 'unter 1100 px laeuft das Video weiter', [['if(halt||!sicht||!breit)', 'if(halt||!sicht)']], ['faelle', 'k4']],
  ['K6', 'Rueckfall schreibt bei jedem Bild', [['if(y!==py){py=y;', 'if(true){py=y;']], ['faelle', 'k6']],
  ['M17', 'Bildpruefung in drift() weg (gleichwertig, weil drift erst nach load laeuft)', [['if(!im[i].complete){n++;', 'if(false){']], ['lcp', 'damen-mode'], true],
];
const nur = process.argv.slice(2);
const vorher = md5(QUELLE); const orig = fs.readFileSync(QUELLE, 'utf8');
const ergebnis = [];
if (process.env.NUR_ANWENDBAR) { for (const [id, , ers] of M) console.log(id, ers.every(([a]) => orig.split(a).length === 2) ? 'anwendbar' : 'NICHT anwendbar'); process.exit(0); }
for (const [id, name, ers, test, gleichwertig] of M) {
  if (nur.length && !nur.includes(id)) continue;
  if (ers.some(([a]) => orig.split(a).length !== 2)) { ergebnis.push([id, 'NICHT ANWENDBAR', name]); console.log(id, 'nicht anwendbar'); continue; }
  const dir = fs.mkdtempSync(path.join(HIER, 'mut_'));
  fs.mkdirSync(path.join(dir, 'snippets'));
  let txt = orig; for (const [a, n] of ers) txt = txt.replace(a, n);
  fs.writeFileSync(path.join(dir, 'snippets', 'lx-kopf-bewegt.liquid'), txt);
  const env = { ...process.env, THEME_DIR: dir };
  let args;
  if (test[0] === 'nachbau') { env.PROFILE = test[2]; args = ['test/nachbau_test.cjs', test[1]]; } else if (test[0] === 'lcp') args = ['test/lcp_pruefen.cjs', test[1]]; else args = ['test/faelle_test.cjs', test[1]];
  const r = spawnSync('/opt/node22/bin/node', args, { cwd: HIER, env, encoding: 'utf8', timeout: 500000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const fehl = out.split('\n').filter((z) => z.startsWith('FEHLER'));
  const erkannt = r.status !== 0 && fehl.length > 0;
  const status = erkannt ? 'ERKANNT' : r.status === 0 ? (gleichwertig ? 'UEBERLEBT (gleichwertig)' : 'UEBERLEBT') : 'UNGEKLAERT (Exit ' + r.status + ', ' + (r.error ? r.error.code : '') + ')';
  ergebnis.push([id, status, name, fehl.slice(0, 2).join(' | ').slice(0, 240)]);
  console.log(id, status, '|', fehl.slice(0, 1).join('').slice(0, 170));
  fs.rmSync(dir, { recursive: true, force: true });
}
const nachher = md5(QUELLE);
console.log('\nQuelle unveraendert:', vorher === nachher, vorher);
fs.writeFileSync(path.join(HIER, 'test', 'mutationsprobe_korrektur.json'), JSON.stringify({ zeit: new Date().toISOString(), quelle: vorher, ergebnis }, null, 1));
const zaehl = (f) => ergebnis.filter(f).length;
console.log(`${zaehl((x) => x[1] === 'ERKANNT')} erkannt, ${zaehl((x) => x[1] === 'UEBERLEBT')} überlebt, ${zaehl((x) => /gleichwertig/.test(x[1]))} gleichwertig überlebt, ${zaehl((x) => /NICHT/.test(x[1]))} nicht anwendbar, ${zaehl((x) => /UNGEKL/.test(x[1]))} ungeklärt, von ${ergebnis.length}`);
