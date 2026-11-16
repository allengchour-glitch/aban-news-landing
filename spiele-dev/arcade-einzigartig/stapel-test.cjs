'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(process.env.STAPEL_SOURCE||path.join(__dirname,'../../minispiele/stapel-turm.html'),'utf8');
function fn(name){const m=html.match(new RegExp('  function '+name+'\\([^)]*\\)\\{[\\s\\S]*?\\n  \\}'));return m?m[0]:'';}
function result(a,b,width=100){const c={baseW:width,towers:{1:a.map(w=>({w})),2:b.map(w=>({w}))},ovEmoji:{},ovTitle:{},ovText:{},ovBtn:{},ov:{classList:{remove(){}}},setTimeout:f=>f()};vm.createContext(c);vm.runInContext(fn('towerPrecision')+'\n'+fn('precisionText')+'\n'+fn('endGame')+'\nendGame();',c);return c;}
assert.match(result([100,90,80],[100,65,40]).ovTitle.textContent,/Spieler 1.*gewinnt/,'Gleiche Höhe: breiterer Turm gewinnt statt altem Remis');
assert.match(result([100],[100,40]).ovTitle.textContent,/Spieler 2.*gewinnt/,'Höhe bleibt Hauptziel');
assert.match(result([100,80],[100,80]).ovTitle.textContent,/Unentschieden/);
assert.equal(result([100,90,80],[100,65,40]).ovTitle.textContent,result([200,180,160],[200,130,80],200).ovTitle.textContent,'Skalierung ändert keinen Sieger');
console.log('4 Originalfunktions-Prüfungen grün');
