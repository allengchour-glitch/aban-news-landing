/**
 * th-katalog.mjs — erscheint jeder Katalog-Eintrag, wenn man ihn hinstellt?
 *
 * ⚠️ WOZU. Wer im Baumodus etwas kauft, das nie sichtbar wird, verliert Geld fuer
 * nichts und sieht keinen Fehler. Der Katalog hat ueber hundert Eintraege; sie
 * entstehen auf zwei ganz verschiedenen Wegen, und beide koennen still scheitern:
 * die einen laden `th_<id>.glb` (fehlende Datei = unsichtbar), die anderen baut
 * `applyFurn()` prozedural aus Quadern (`def.car`, `def.grow` und weitere Zweige).
 *
 * ⚠️ DARUM NICHT NACH DATEIEN SUCHEN. Der erste Versuch prueste per HTTP, ob
 * `th_<id>.glb` existiert, und meldete 11 Fehlende — darunter `wand`, `fenster`,
 * `tuer` und vier Bodenbelaege, die per Definition prozedural sind und nie eine
 * Datei hatten. Aus "keine Datei" folgt nicht "kaputt".
 *
 * Der Test stellt stattdessen jeden Eintrag wirklich hin und sieht nach, ob ein
 * Mesh mit Geometrie entstanden ist. Das gilt fuer beide Wege gleichermassen.
 *
 * Aufruf:  node spiele-dev/tools/th-katalog.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const sonde = `function(was){
  if(was==="stellen"){
    var ids=[];
    Object.keys(KATALOG).forEach(function(g){
      KATALOG[g].forEach(function(e){
        /* Waende, Fenster, Tueren und Boeden laufen ueber applyWall/applyFloor,
           nicht ueber applyFurn — sie gehoeren nicht in diese Pruefung. */
        if(e.paint)return;
        if(/^(wand|fenster|tuer)$/.test(e.id))return;
        if(/^boden/.test(e.id))return;
        ids.push({id:e.id, gruppe:g, name:e.n||e.id});});});
    /* Alle nebeneinander aufs Raster stellen, damit sich nichts ueberlagert. */
    furn.slice().forEach(function(f){if(f.mesh)scene.remove(f.mesh);if(f.plight)scene.remove(f.plight);});
    furn=[];
    ids.forEach(function(e,i){
      applyFurn(e.id, 2+(i%14), 2+((i/14)|0), 0, "k"+i);});
    window.__katIds=ids.map(function(e){return e.id;});
    return {gestellt:ids.length, ids:ids};}
  if(was==="pruefen"){
    var leer=[];
    furn.forEach(function(f){
      var hat=false;
      if(f.mesh)f.mesh.traverse(function(n){if(n.isMesh&&n.geometry)hat=true;});
      if(!hat)leer.push(f.id);});
    /* Das Auto haengt nicht in furn, sondern in window.autoRec. */
    /* ⚠️ AUCH DIE ZAEHLEN, DIE GAR NICHT IN furn LANDEN. 89 gestellt, 85 in der
       Liste — die Differenz schweigend hinzunehmen hiesse, vier Eintraege nicht
       geprueft zu haben und trotzdem „alle erscheinen" zu melden. */
    var drin={}; furn.forEach(function(f){drin[f.id]=1;});
    return {inFurn:furn.length, ohneMesh:leer, auto:!!(window.autoRec&&window.autoRec.mesh),
            nichtInFurn:(window.__katIds||[]).filter(function(id){return !drin[id];})};}
  return null;}`

mitSonden('traumhaus.html', { kat: sonde }, '_kat.html')
const { browser, page, jsFehler } = await spielOeffnen('_kat.html', { warten: 25000 })
const gestellt = await page.evaluate(() => window.__th.kat('stellen'))
/* ⚠️ NICHT AUF EINE FRIST WARTEN, SONDERN AUF RUHE. Mit festen 12 s meldete der Test
   53 von 89 Eintraegen als unsichtbar — und alle 53 trugen ein ⭐ im Namen, was zu
   sauber ist fuer einen echten Befund. Es waren schlicht die ueber loadTH geladenen
   Modelle, die noch unterwegs waren; die prozeduralen standen sofort da. Gemessen
   wurde also die Ladezeit, nicht die Vollstaendigkeit.
   Jetzt alle 3 s nachsehen und erst urteilen, wenn die Zahl dreimal gleich bleibt. */
let R = null, gleich = 0, vorher = -1
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(3000)
  R = await page.evaluate(() => window.__th.kat('pruefen'))
  if (R.ohneMesh.length === vorher) { if (++gleich >= 3) break } else { gleich = 0; vorher = R.ohneMesh.length }
  process.stdout.write(`\r… warte auf die Modelle: noch ${R.ohneMesh.length} ohne Mesh (${(i + 1) * 3} s)   `)
}
process.stdout.write('\r' + ' '.repeat(70) + '\r')
await browser.close()
aufraeumen('_kat.html')

console.log(`${gestellt.gestellt} Katalog-Eintraege hingestellt (ohne Waende, Fenster, Tueren, Boeden)`)
console.log(`${R.inFurn} davon in der Moebelliste · Auto separat: ${R.auto ? 'da' : 'fehlt'}\n`)
const fehlt = R.ohneMesh.filter((id) => !/auto|car/.test(id))
const unklar = (R.nichtInFurn || []).filter((id) => !/auto|car/.test(id))
if (unklar.length) {
  console.log(`ℹ️  ${unklar.length} landen nicht in der Moebelliste (eigener Weg wie das Auto):`)
  for (const id of unklar) { const e = gestellt.ids.find((x) => x.id === id); console.log(`   ${id.padEnd(20)} ${e ? e.gruppe + ' · ' + e.name : ''}`) }
  console.log()
}
if (!fehlt.length) console.log('✅ Jeder Eintrag in der Moebelliste erscheint')
else {
  if (fehlt.length) {
    console.log(`⚠️  ${fehlt.length} erscheinen NICHT — gekauft und unsichtbar:`)
    for (const id of fehlt) {
      const e = gestellt.ids.find((x) => x.id === id)
      console.log(`   ${id.padEnd(20)} ${e ? e.gruppe + ' · ' + e.name : ''}`)
    }
  }
  if (!R.auto) console.log('⚠️  Das Auto (window.autoRec) ist nicht entstanden')
}
console.log('\nJS-Fehler:', jsFehler.length)
