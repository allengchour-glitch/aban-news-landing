/* th-umfeld.mjs — was steht in einem Weltbereich? Gebaeude, Kollider, Strasse, flache Flaechen.
 *
 *   node spiele-dev/tools/th-umfeld.mjs <x0> <z0> <x1> <z1> [<x0> <z0> <x1> <z1> ...]
 *
 * WOZU (Runde 92): "Ort gesucht, nicht geraten" — vor dem Setzen eines Objekts fragt man das
 * Spiel, was dort schon steht. Bisher brauchte das drei Werkzeuge (th-flaeche fuer Boeden,
 * th-plaetze fuer freie Punkte, th-3d fuer Modelle) und einen Screenshot. Hier kommt alles
 * fuer einen Ausschnitt: die Gebaeude mit Weltbox, eine Karte im Meterraster
 * (# Kollider, = GPS-Strasse, . frei) und die flachen Boeden mit Farbe.
 * Mehrere Ausschnitte in EINEM Lauf — jeder Lauf kostet zwei Minuten.
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const nums = process.argv.slice(2).map(Number)
if (nums.length < 4 || nums.length % 4 || nums.some(isNaN)) { console.log('Aufruf: th-umfeld.mjs <x0> <z0> <x1> <z1> [...]'); process.exit(1) }
const boxes = []; for (let i = 0; i < nums.length; i += 4) boxes.push(nums.slice(i, i + 4))
const TMP = 'spiele-dev/tools/_umfeld_probe.html'
mitSonden('traumhaus.html', {
  umfeld: `function(ax0,az0,ax1,az1){
    var X0=Math.min(ax0,ax1),X1=Math.max(ax0,ax1),Z0=Math.min(az0,az1),Z1=Math.max(az0,az1);
    var out={gebaeude:[],flaechen:[],karte:[]},bb=new THREE.Box3(),s=new THREE.Vector3();
    (window._gebaeude||[]).forEach(function(g){if(!g.parent)return;bb.setFromObject(g);if(bb.isEmpty())return;
      if(bb.max.x<X0||bb.min.x>X1||bb.max.z<Z0||bb.min.z>Z1)return;bb.getSize(s);
      if(Math.max(s.x,s.z)>120)return;
      out.gebaeude.push({datei:(g.userData&&g.userData.datei)||g.name||"?",x:+g.position.x.toFixed(1),z:+g.position.z.toFixed(1),
        box:[+bb.min.x.toFixed(1),+bb.min.z.toFixed(1),+bb.max.x.toFixed(1),+bb.max.z.toFixed(1)],h:+s.y.toFixed(1)});});
    scene.traverse(function(n){if(!n.isMesh||n.isInstancedMesh||!n.geometry||n.isSprite)return;
      bb.setFromObject(n);if(bb.isEmpty())return;bb.getSize(s);
      /* flach heisst: niedrig UND am Boden — sonst zaehlen Fensterbaenke und Dachkanten mit (580 Treffer im ersten Lauf) */
      if(s.y>0.3||bb.min.y>0.4||Math.max(s.x,s.z)>120||Math.max(s.x,s.z)<0.6)return;
      if(bb.max.x<X0||bb.min.x>X1||bb.max.z<Z0||bb.min.z>Z1)return;
      var m=Array.isArray(n.material)?n.material[0]:n.material,c=m&&m.color?"#"+m.color.getHexString():"?";
      out.flaechen.push({typ:n.geometry.type.replace("Geometry",""),c:c,box:[+bb.min.x.toFixed(1),+bb.min.z.toFixed(1),+bb.max.x.toFixed(1),+bb.max.z.toFixed(1)],y:+bb.max.y.toFixed(3)});});
    for(var z=Math.floor(Z0);z<=Z1;z++){var row="";
      for(var x=Math.floor(X0);x<=X1;x++){var b=imBau(x+0.5,z+0.5),r=gpsStrasse(x+0.5,z+0.5);row+=b?"#":(r?"=":".");}
      out.karte.push((z<0?"":" ")+z+" "+row);}
    return out;}`,
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 70000 })
for (const b of boxes) {
  const R = await page.evaluate((v) => window.__th.umfeld(...v), b)
  console.log(`\n══ Bereich x ${b[0]}..${b[2]}  z ${b[1]}..${b[3]} ══`)
  console.log(`Gebaeude (${R.gebaeude.length}):`)
  for (const g of R.gebaeude.sort((a, c) => a.z - c.z)) console.log(`  ${g.datei.padEnd(34)} (${g.x}|${g.z})  Box x ${g.box[0]}..${g.box[2]}  z ${g.box[1]}..${g.box[3]}  h ${g.h}`)
  console.log(`Flache Boeden (${R.flaechen.length}):`)
  for (const f of R.flaechen.sort((a, c) => a.box[1] - c.box[1])) console.log(`  ${f.typ.padEnd(8)} ${f.c}  x ${f.box[0]}..${f.box[2]}  z ${f.box[1]}..${f.box[3]}  y ${f.y}`)
  console.log('Karte (# Kollider, = Strasse, . frei; Zeile = z, Spalte ab x ' + Math.floor(b[0]) + '):')
  for (const r of R.karte) console.log('  ' + r)
}
console.log('\nJS-Fehler:', jsFehler.length)
await browser.close(); aufraeumen(TMP)
