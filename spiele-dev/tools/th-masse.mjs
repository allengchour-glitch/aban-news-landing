/**
 * th-masse.mjs — woraus besteht die Szene, und wie viele Materialien kostet das?
 *
 * Zaehlt je Modelldatei die Meshes UND die Zahl VERSCHIEDENER Materialien. Der
 * Quotient ist der Test: ein Modell, das zehnmal in der Welt steht, darf nicht
 * zehnmal so viele Materialien haben wie eines, das einmal dasteht.
 *
 * ⚠️ Genau daran hing der Parse-Cache: GLTFLoader hat keinen, jeder `GL.load`
 * legte neue Geometrien und Materialien an. th33_parklaterne kam so auf 108
 * Materialien fuer 27 Laternen; mit `_glbHol` sind es 9.
 *
 * Aufruf:  node spiele-dev/tools/th-masse.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const sonde = `function(){
  var proDatei={}, proGeo={}, ohne=0, gesamt=0, mats=new Set(), matsProDatei={};
  scene.traverse(function(o){
    gesamt++;
    if(!o.isMesh)return;
    if(o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){mats.add(m.uuid);}); }
    var d=null,k=o;while(k&&k!==scene){if(k.userData&&k.userData.datei)d=k.userData.datei;k=k.parent;}
    if(!d){ohne++;proGeo[o.geometry.type]=(proGeo[o.geometry.type]||0)+1;return;}
    proDatei[d]=(proDatei[d]||0)+1;
    if(!matsProDatei[d])matsProDatei[d]=new Set();
    (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){matsProDatei[d].add(m.uuid);});});
  function top(obj,n){return Object.keys(obj).sort(function(a,b){return obj[b]-obj[a];}).slice(0,n)
    .map(function(k){return [k,obj[k],matsProDatei[k]?matsProDatei[k].size:null];});}
  return {objekteGesamt:gesamt, materialien:mats.size, ohneDatei:ohne,
          topDateien:top(proDatei,18), topGeoOhneDatei:top(proGeo,10)};}`
mitSonden('traumhaus.html', { masse: sonde }, '_masse.html')
const { browser, page, jsFehler } = await spielOeffnen('_masse.html', { warten: 25000 })
const R = await page.evaluate(() => window.__th.masse())
await browser.close(); aufraeumen('_masse.html')
console.log(`Objekte ${R.objekteGesamt} · verschiedene Materialien ${R.materialien} · Meshes ohne Datei ${R.ohneDatei}`)
console.log('\nModelle mit den meisten Meshes (Datei · Meshes · verschiedene Materialien):')
for (const [d, n, m] of R.topDateien) console.log(`  ${String(n).padStart(6)}  ${String(m).padStart(5)} Mat.  ${d}`)
console.log('\nMeshes ohne Datei nach Geometrie:')
for (const [g, n] of R.topGeoOhneDatei) console.log(`  ${String(n).padStart(6)}  ${g}`)
console.log('JS-Fehler:', jsFehler.length)
