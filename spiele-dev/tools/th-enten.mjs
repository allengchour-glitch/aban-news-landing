/* th-enten.mjs — prueft den Koop-Bonus beim Enten-Fuettern.
 *
 * Vorher brach die Fuetter-Schleife beim ERSTEN Bewohner im Uferring ab: ob der
 * zweite danebenstand, war der Szene egal. Jetzt zaehlt sie — dieser Test haelt
 * beide Faelle fest.
 *
 * Checks:
 *  1. Einer am Ufer -> normale Fuetterung, stats.enten +1, entenKoop bleibt 0
 *  2. Beide am Ufer -> Koop-Bonus, entenKoop +1, laengere Zieldauer, mehr Laune
 *  3. Das Ziel liegt zwischen beiden (nicht auf einem von beiden)
 *  4. Niemand im Ring -> nichts passiert
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_enten_probe.html'
mitSonden('traumhaus.html', {
  ente: `function(was,a,b){
    var S=ENTEN.SEE;
    if(was==="stell"){ /* a = Anzahl Bewohner an den Uferring (r=14) */
      for(var i=0;i<sims.length;i++){
        if(i<a){var w=i*1.1;sims[i].x=S.x+Math.cos(w)*14;sims[i].z=S.z+Math.sin(w)*14;
                sims[i].mesh.visible=true;sims[i].needs.spass=40;}
        else {sims[i].x=S.x+300;sims[i].z=S.z+300;}}
      ENTEN.cd=0;ENTEN.ziel=null;ENTEN.zielT=0;
      stats.enten=0;stats.entenKoop=0;return true;}
    if(was==="takt"){updEnten(0.05,performance.now());return true;}
    if(was==="messe"){ /* a Bewohner ans Ufer, Laune auf 40, EIN Takt, sofort lesen —
                          zwischen getrennten Aufrufen hebt die Spielschleife sie auf 100 */
      var S2=ENTEN.SEE;
      for(var j=0;j<sims.length;j++){
        if(j<a){var w2=j*1.1;sims[j].x=S2.x+Math.cos(w2)*14;sims[j].z=S2.z+Math.sin(w2)*14;
                sims[j].mesh.visible=true;}
        else {sims[j].x=S2.x+300;sims[j].z=S2.z+300;}
        sims[j].needs.spass=40;}
      ENTEN.cd=0;ENTEN.ziel=null;ENTEN.zielT=0;stats.enten=0;stats.entenKoop=0;
      updEnten(0.05,performance.now());
      return {koop:stats.entenKoop||0, laune:sims.map(function(s3){return Math.round(s3.needs.spass);})};}
    if(was==="stand")return {enten:stats.enten||0, koop:stats.entenKoop||0,
      zielT:+ENTEN.zielT.toFixed(1), cd:+ENTEN.cd.toFixed(1),
      ziel:ENTEN.ziel?[+ENTEN.ziel.x.toFixed(1),+ENTEN.ziel.z.toFixed(1)]:null,
      laune:sims.map(function(s){return Math.round(s.needs.spass);}),
      simPos:sims.map(function(s){return [+s.x.toFixed(1),+s.z.toFixed(1)];})};
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const S = (...a) => page.evaluate((args) => window.__th.ente(...args), a)
let ok = 0, fehl = 0
const check = (n, gut, d) => { console.log((gut ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : '')); gut ? ok++ : fehl++ }

/* 1. Einer am Ufer */
await S('stell', 1)
await S('takt')
let r = await S('stand')
check('einer: Fuetterung ausgeloest', r.enten === 1, JSON.stringify({enten: r.enten, koop: r.koop}))
check('einer: KEIN Koop-Bonus', r.koop === 0)
check('einer: Zieldauer 8 s', r.zielT > 7.5 && r.zielT <= 8, r.zielT + ' s')
const mEiner = await S('messe', 1)

/* 2. Beide am Ufer */
await S('stell', 2)
await S('takt')
r = await S('stand')
check('beide: Koop-Bonus gezaehlt', r.koop === 1, JSON.stringify({enten: r.enten, koop: r.koop}))
check('beide: laengere Zieldauer (12 s)', r.zielT > 11.5, r.zielT + ' s')
const mBeide = await S('messe', 2)
check('beide: mehr Laune als allein', mBeide.laune[0] - 40 > mEiner.laune[0] - 40,
  `allein +${mEiner.laune[0]-40}, zu zweit +${mBeide.laune[0]-40}`)
check('beide: auch der Partner bekommt Laune', mBeide.laune[1] > 40, '+' + (mBeide.laune[1] - 40))
if (r.ziel) {
  const [a, b] = r.simPos
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2
  check('Ziel liegt zwischen beiden', Math.hypot(r.ziel[0] - mx, r.ziel[1] - mz) < 0.5,
    `Ziel ${r.ziel} · Mitte (${mx.toFixed(1)},${mz.toFixed(1)})`)
} else check('Ziel liegt zwischen beiden', false, 'kein Ziel')
check('beide: kuerzere Wartezeit (20 s)', r.cd > 19 && r.cd <= 20, r.cd + ' s')

/* 3. Niemand am Ufer */
await S('stell', 0)
await S('takt')
r = await S('stand')
check('niemand am Ufer: nichts passiert', r.enten === 0 && r.koop === 0, JSON.stringify({enten: r.enten, koop: r.koop}))

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 ENTEN BESTANDEN' : '💥 ENTEN FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
