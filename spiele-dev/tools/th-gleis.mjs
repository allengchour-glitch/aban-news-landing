/**
 * th-gleis.mjs — liegt etwas auf dem Gleis?
 *
 * ⚠️ WOZU. Der Bahnsteig wurde ueber Jahre aus drei verschiedenen Vorstellungen
 * davon gebaut, wo seine Kante liegt: die alte Platte reichte bis z 113, die
 * th41-Module bis 111,4, ein Kommentar am Ring-Band nannte 111,8. Das Gleis liegt
 * auf z 112, die Schienen auf 110,7 und 113,3. Jede dieser Zahlen war falsch, und
 * kein Werkzeug konnte es sehen: th-3d vergleicht Modell gegen Modell, und Schienen
 * und Schwellen sind namenlose Boxen ohne `userData.datei`.
 *
 * Geprueft wird die Ueberdeckung der drei Baender des Gleiskoerpers:
 *   Schiene Nord  110,62…110,78     Schiene Sued  113,22…113,38
 *   Schwellen     111,70…112,30
 * Das Schotterbett (Oberkante 0,05, unter den Schienen) ist ausgenommen — es
 * GEHOERT dorthin.
 *
 * Aufruf:  node spiele-dev/tools/th-gleis.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const sonde = `function(){
  /* Gleiskoerper: Schienen 110,7 und 113,3 (je 0,16 breit), Schwellen 111,7…112,3 */
  var SCHIENE=[[110.62,110.78],[113.22,113.38]], SCHW=[111.70,112.30];
  var bb=new THREE.Box3(), T=[], schienen=[];
  scene.traverse(function(o){
    if(!o.isMesh||!o.geometry)return;
    bb.setFromObject(o);
    if(bb.max.x<-40||bb.min.x>40)return;            /* nur der Bahnhofsbereich */
    if(bb.max.z<109||bb.min.z>115)return;
    if(bb.max.y>3)return;                            /* Daecher/Masten interessieren hier nicht */
    var breit=bb.max.x-bb.min.x, tief=bb.max.z-bb.min.z;
    var ist=(tief<0.4&&breit>100);                   /* die Schiene selbst */
    if(ist){schienen.push([+bb.min.z.toFixed(2),+bb.max.z.toFixed(2),+bb.min.y.toFixed(2),+bb.max.y.toFixed(2)]);return;}
    if(bb.max.y<=0.05)return;                        /* Schotterbett und flache Belagsplatten */
    if(tief<0.7&&breit>3&&breit<4&&bb.max.y<0.2)return;   /* die Schwellen selbst */
    var kette=o,d=null;while(kette&&kette!==scene){if(kette.userData&&kette.userData.datei)d=kette.userData.datei;kette=kette.parent;}
    function ueber(band){var t=Math.min(bb.max.z,band[1])-Math.max(bb.min.z,band[0]);return t>0.02?+t.toFixed(2):0;}
    var s1=ueber(SCHIENE[0]),s2=ueber(SCHIENE[1]),sw=ueber(SCHW);
    if(!s1&&!s2&&!sw)return;
    T.push({was:d||o.name||o.geometry.type, x:[+bb.min.x.toFixed(1),+bb.max.x.toFixed(1)],
            z:[+bb.min.z.toFixed(2),+bb.max.z.toFixed(2)], y:[+bb.min.y.toFixed(2),+bb.max.y.toFixed(2)],
            schieneN:s1, schieneS:s2, schwellen:sw});});
  T.sort(function(a,b){return (b.schieneN+b.schieneS+b.schwellen)-(a.schieneN+a.schieneS+a.schwellen);});
  return {schienenGemessen:schienen, treffer:T};}`
mitSonden('traumhaus.html', { gleis: sonde }, '_gleis.html')
const { browser, page, jsFehler } = await spielOeffnen('_gleis.html', { warten: 22000 })
const R = await page.evaluate(() => window.__th.gleis())
await browser.close(); aufraeumen('_gleis.html')
console.log('Schienen gemessen (zmin,zmax,ymin,ymax):', JSON.stringify(R.schienenGemessen))
console.log(`${R.treffer.length} Bauteile ueber dem Gleiskoerper:`)
for (const t of R.treffer) console.log(`  ${t.was}  x${JSON.stringify(t.x)} z${JSON.stringify(t.z)} y${JSON.stringify(t.y)}  N=${t.schieneN} S=${t.schieneS} Schwellen=${t.schwellen}`)
console.log('JS-Fehler:', jsFehler.length)
