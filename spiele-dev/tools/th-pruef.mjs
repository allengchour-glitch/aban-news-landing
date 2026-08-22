#!/usr/bin/env node
/* th-pruef.mjs — Gesamtpruefung der Traumhaus-Stadt in einem Aufruf.
 *
 *   /opt/node22/bin/node spiele-dev/tools/th-pruef.mjs [datei.html] [--wartezeit 55000]
 *
 * Prueft in EINEM Lauf, was bisher jedes Mal einzeln gebaut wurde:
 *   * Objekte in Strassenkorridoren (Fahrbahn/Gehweg) — Sollwert 0
 *   * echte 3D-Ueberschneidungen zwischen Modellen, groesste zuerst
 *   * fehlende Modelle (404) und JS-Fehler — Sollwert je 0
 *   * Zeichenaufrufe/Dreiecke (Handy-Leistung)
 *   * Wirkung der Aufraeumstufen freiRaeumen/entwirren/entzerren
 *
 * BEKANNTER REST: eine Paarung mit ~6.3 m (Bergstation und die oberste
 * Seilbahnstuetze stehen absichtlich ineinander). Alles darueber ist neu.
 */
import { mitSonden, spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'

const datei = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'traumhaus.html'
const wi = process.argv.indexOf('--wartezeit')
let warten = wi > 0 ? +process.argv[wi + 1] : 55000
/* ⚠️ Die letzte Aufraeumstufe (freiRaeumen+entwirren) laeuft bei 50 s. Wer frueher
   misst, sieht Objekte auf der Strasse, die gleich noch weggeraeumt werden — genau
   dieser Messfehler hat schon zu falschen Befunden gefuehrt. */
if (warten < 52000) {
  console.log(`\x1b[33mHinweis:\x1b[0m ${warten} ms ist zu frueh — die letzte Aufraeumstufe laeuft bei 50 s. Auf 55000 angehoben.`)
  warten = 55000
}
const tmp = '_pruef_tmp.html'

const SONDE = `function(){
  var K=window._KORRIDORE||[];
  function korr(b){
    for(var i=0;i<K.length;i++){var k=K[i],l=k[1]==="x";
      var aMin=l?b.min.x:b.min.z,aMax=l?b.max.x:b.max.z;
      if(aMax<k[3]-1||aMin>k[4]+1)continue;
      var qMin=l?b.min.z:b.min.x,qMax=l?b.max.z:b.max.x;
      var ue=Math.min(qMax,k[2]+k[5])-Math.max(qMin,k[2]-k[5]);
      if(ue>0.4)return {n:k[0],ue:+ue.toFixed(1)};}
    return null;}
  var G=window._gebaeude||[],bb=[],auf=[];
  function datei(w){return (w.userData&&w.userData.datei)||w.name||"?";}
  G.forEach(function(w){
    /* Bewegte Objekte (Kran schwenkt, Boote/Zug/Bus fahren) haben KEINE feste
       Box — ihr Augenblickswert ist weder Platzierungsfehler noch Blocker
       (Kranausleger in 20 m Hoehe, Bus faehrt legitim AUF der Strasse). */
    if(w.userData&&(w.userData._bewegt||w._bewegt||w.userData.nieAusblenden))return;
    var b=new THREE.Box3().setFromObject(w);
    if(!isFinite(b.min.x)||b.max.y-b.min.y<0.45)return;   /* flache Deko darf am Rand liegen */
    bb.push({b:b,d:datei(w),x:+w.position.x.toFixed(0),z:+w.position.z.toFixed(0)});
    var k=korr(b);
    if(k)auf.push([+w.position.x.toFixed(0),+w.position.z.toFixed(0),k.ue,k.n]);});
  var paare=[];
  for(var a=0;a<bb.length;a++)for(var c=a+1;c<bb.length;c++){
    var A=bb[a].b,B=bb[c].b;
    var ox=Math.min(A.max.x,B.max.x)-Math.max(A.min.x,B.min.x);
    var oz=Math.min(A.max.z,B.max.z)-Math.max(A.min.z,B.min.z);
    var oy=Math.min(A.max.y,B.max.y)-Math.max(A.min.y,B.min.y);
    if(ox>1.0&&oz>1.0&&oy>1.0)
      paare.push([bb[a].x,bb[a].z,bb[c].x,bb[c].z,+Math.min(ox,oz).toFixed(1)]);}
  paare.sort(function(p,q){return q[4]-p[4];});
  /* ── STECKT DRIN ─────────────────────────────────────────────────────────
     Die Paarliste oben verlangt >1 m Ueberlappung in JEDER Achse. Damit ist
     sie fuer duenne Dinge blind: ein 0,40 m breites Bauzaunfeld kann komplett
     in einem Haus stehen und faellt nie auf — gemessen liefen sechs davon
     4,5 m durch eine Schulhauswand und vier durch die Markthalle, ohne dass
     eines der Werkzeuge etwas gemeldet haette. th-3d.mjs siebt bei 0,50 m und
     ist genauso blind.
     Dieser Test fragt darum nicht "wie tief", sondern "wie viel davon":
       * das kleine Objekt ist mindestens 6x kleiner (nur "klein in gross"),
       * sein MITTELPUNKT liegt im Grundriss des grossen,
       * mindestens 60 % seiner Grundflaeche liegen darin, und
       * die Hoehen ueberlappen sich um mehr als 0,50 m.
     Die Hoehenschranke haelt das Uebliche draussen: eine Bank auf dem
     Bahnsteig liegt zu 100 % im Grundriss der Platte, teilt mit ihr aber nur
     3 cm Hoehe — sie STEHT darauf, sie steckt nicht darin.
     ⚠️ Und der Kasten allein reicht nicht: eine Laterne unter einer Eiche liegt
     zu 100 % im KASTEN der Krone und teilt 4 m Hoehe mit ihr — sie steht aber
     nur darunter. Ein Baum, eine Hecke, ein Dach oder ein Geruest ist kein
     GEHAEUSE. Nur Objekte, die wirklich umschliessen, zaehlen als "gross". */
  var KEIN_GEHAEUSE=/baum|tree|eiche|birke|ahorn|pappel|fichte|tanne|weide|kastanie|linde|hecke|hedge|busch|bush|strauch|dach|geruest|kran|pylon|seil|bruecke|leitung|mast|antenne|zaun|gitter|tankstelle/i;
  var drin=[];
  for(var s1=0;s1<bb.length;s1++)for(var s2=0;s2<bb.length;s2++){
    if(s1===s2)continue;
    var K=bb[s1].b,GR=bb[s2].b;
    var fk=(K.max.x-K.min.x)*(K.max.z-K.min.z),fg=(GR.max.x-GR.min.x)*(GR.max.z-GR.min.z);
    if(fk<=0||fg<fk*6)continue;
    if(KEIN_GEHAEUSE.test(bb[s2].d))continue;
    var mx=(K.min.x+K.max.x)/2,mz=(K.min.z+K.max.z)/2;
    if(mx<GR.min.x||mx>GR.max.x||mz<GR.min.z||mz>GR.max.z)continue;
    var dx=Math.min(K.max.x,GR.max.x)-Math.max(K.min.x,GR.min.x);
    var dz=Math.min(K.max.z,GR.max.z)-Math.max(K.min.z,GR.min.z);
    var dy=Math.min(K.max.y,GR.max.y)-Math.max(K.min.y,GR.min.y);
    if(dy<=0.5)continue;
    var anteil=(dx*dz)/fk;
    if(anteil>0.6)drin.push([bb[s1].d,bb[s1].x,bb[s1].z,bb[s2].d,Math.round(anteil*100)]);}
  drin.sort(function(p,q){return q[4]-p[4];});
  var r=renderer.info.render;
  return {modelle:bb.length,korridor:auf,paare:paare,drin:drin,
          zeichenaufrufe:r.calls,dreiecke:r.triangles,
          freigeraeumt:window._freigeraeumt,entwirrt:window._entwirrt,entzerrt:window._entzerrt};}`

mitSonden(datei, { pruefung: SONDE }, tmp)
const { browser, page, jsFehler, fehlend } = await spielOeffnen(tmp, { warten })
const r = await page.evaluate(() => window.__th.pruefung())
await browser.close()
aufraeumen(tmp)

const ampel = (b) => (b ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m')
const groesste = r.paare.length ? r.paare[0][4] : 0
console.log(`\n── Traumhaus-Pruefung: ${datei} (${Math.round(warten / 1000)} s Ladezeit) ──`)
console.log(`  Modelle geladen        ${r.modelle}`)
console.log(`  ${ampel(r.korridor.length === 0)} Im Strassenkorridor    ${r.korridor.length}`)
console.log(`  ${ampel(groesste <= 6.4)} Ueberschneidungen      ${r.paare.length}, groesste ${groesste} m`)
console.log(`  ${r.drin.length ? '\x1b[33m•\x1b[0m' : '\x1b[32m✔\x1b[0m'} Steckt in einem Bau    ${r.drin.length}  (Sollwert 0 — Befunde mit th-3d.mjs bestaetigen)`)
console.log(`  ${ampel(fehlend.length === 0)} Fehlende Modelle       ${fehlend.length}${fehlend.length ? ' → ' + fehlend.slice(0, 6).join(', ') : ''}`)
console.log(`  ${ampel(jsFehler.length === 0)} JS-Fehler              ${jsFehler.length}${jsFehler.length ? '\n      ' + jsFehler.slice(0, 3).join('\n      ') : ''}`)
console.log(`  Zeichenaufrufe         ${r.zeichenaufrufe} · Dreiecke ${r.dreiecke}`)
console.log(`  Aufraeumstufen         freiRaeumen ${JSON.stringify(r.freigeraeumt)} · entwirren ${JSON.stringify(r.entwirrt)}`)
if (r.korridor.length) {
  console.log('\n  AUF DER STRASSE:')
  r.korridor.slice(0, 12).forEach((k) => console.log(`    (${k[0]}, ${k[1]})  ${k[2]} m in ${k[3]}`))
}
if (r.drin.length) {
  console.log('\n  STECKT DRIN (Mittelpunkt + >60 % der Grundflaeche im anderen, >0,5 m gemeinsame Hoehe):')
  r.drin.slice(0, 16).forEach((d) => console.log(`    ${d[0]} (${d[1]}, ${d[2]})  ${d[4]} % in  ${d[3]}`))
  if (r.drin.length > 16) console.log(`    … und ${r.drin.length - 16} weitere`)
}
if (groesste > 6.4) {
  console.log('\n  GROESSTE UEBERSCHNEIDUNGEN:')
  r.paare.slice(0, 8).forEach((p) => console.log(`    (${p[0]}, ${p[1]}) ↔ (${p[2]}, ${p[3]})  ${p[4]} m`))
}
/* "Steckt drin" ist bewusst KEIN Abbruchkriterium. Kastenlogik allein kann
   "unter einem Vordach" nicht von "in einer Wand" unterscheiden — die
   Zapfsaeulen unter dem Tankstellendach sind der Musterfall. Die Liste ist eine
   KANDIDATENLISTE: jeder Eintrag gehoert mit `th-3d.mjs <a> <b>` mesh-genau
   bestaetigt, bevor jemand etwas verschiebt. Sollwert bleibt 0. */
const ok = r.korridor.length === 0 && jsFehler.length === 0 && fehlend.length === 0 && groesste <= 6.4
console.log(`\n  ${ok ? '\x1b[32mBESTANDEN\x1b[0m' : '\x1b[31mNICHT BESTANDEN\x1b[0m'}\n`)
process.exit(ok ? 0 : 1)
