/**
 * th-material.mjs — wie viele Materialien sind exakte Zwillinge?
 *
 * Bildet fuer jedes Material einen Schluessel aus ALLEN sichtbaren Einstellungen
 * (Typ, Farbe, Rauheit, Metallgrad, Emission, Transparenz, Texturen, Seite,
 * envMapIntensity) und zaehlt, wie viele Objekte auf dieselbe Einstellung kommen.
 * Die Differenz `Material-Objekte - verschiedene Einstellungen` ist reine
 * Verschwendung: jedes eigene Material verhindert das Zusammenfassen von
 * Zeichenaufrufen und kostet eigene Uniform-Uebertragungen.
 *
 * ⚠️ NICHT jeder Zwilling ist ein Fehler: die 390 Fensterscheiben `a8c8dc` brauchen
 * ihre Eigenstaendigkeit, weil nur ein Teil von ihnen nachts leuchtet
 * (`dorfFenster` sammelt sie einzeln ein).
 *
 * Aufruf:  node spiele-dev/tools/th-material.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const sonde = `function(){
  var seen=new Set(), sig={}, gesamt=0;
  function schluessel(m){
    return [m.type,m.color&&m.color.getHexString(),m.roughness,m.metalness,
            m.emissive&&m.emissive.getHexString(),m.emissiveIntensity,m.transparent,m.opacity,
            m.map?(m.map.uuid):"-", m.envMapIntensity, m.flatShading, m.side].join("|");}
  scene.traverse(function(o){
    if(!o.isMesh&&!o.isInstancedMesh)return;
    (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){
      if(!m||seen.has(m.uuid))return; seen.add(m.uuid); gesamt++;
      var k=schluessel(m);
      if(!sig[k])sig[k]={n:0,bsp:m.type+" "+(m.color?m.color.getHexString():"")};
      sig[k].n++;});});
  var L=Object.keys(sig).map(function(k){return {k:k,n:sig[k].n,bsp:sig[k].bsp};});
  L.sort(function(a,b){return b.n-a.n;});
  return {materialien:gesamt, verschiedeneSignaturen:L.length,
          einsparbar:gesamt-L.length, top:L.slice(0,15)};}`
mitSonden('traumhaus.html', { mat: sonde }, '_mat.html')
const { browser, page, jsFehler } = await spielOeffnen('_mat.html', { warten: 25000 })
const R = await page.evaluate(() => window.__th.mat())
await browser.close(); aufraeumen('_mat.html')
console.log(`${R.materialien} Material-Objekte · ${R.verschiedeneSignaturen} verschiedene Einstellungen · ${R.einsparbar} sind Duplikate`)
console.log('\nGroesste Duplikat-Gruppen:')
for (const t of R.top) console.log(`  ${String(t.n).padStart(5)}x  ${t.bsp}   [${t.k.slice(0,90)}]`)
console.log('JS-Fehler:', jsFehler.length)
