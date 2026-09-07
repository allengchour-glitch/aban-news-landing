/* th-vielfalt.mjs — was steht hundertmal exakt gleich in der Welt?
 *
 *   node spiele-dev/tools/th-vielfalt.mjs [mindestzahl]
 *
 * WARUM: Am Grundstuecksrand standen 588 Hecken-Instanzen mit EINER Groesse und ZWEI
 * Drehungen — im Bild eine Reihe voellig gleicher Kugeln. Das ist der Eindruck, den
 * der User "zu KI-generiert" nennt, und er entsteht nicht aus schlechten Modellen,
 * sondern aus fehlender Streuung. Kein Werkzeug hat danach gefragt.
 *
 * Gemeldet wird jede Gruppe ab `mindestzahl` gleichartiger Dinge mit ihrer Streuung:
 * wie viele verschiedene Groessen und Drehungen kommen darin vor.
 *
 * ⚠️ ZWEI FALLEN, BEIDE HIER SCHON ZUGESCHLAGEN:
 *  1. `mesh.scale` ist die LOKALE Skalierung. Ein Baum ist eine Gruppe; wird die
 *     Gruppe skaliert, bleibt die Kugel darin auf 1 — und 620 verschieden grosse
 *     Baumkronen sehen aus wie 620 gleiche. Gemessen wird die WELT-Skalierung.
 *  2. Eine `InstancedMesh` taucht beim Durchlaufen der Szene nur EINMAL auf. Wer
 *     Objekte zaehlt, sieht die 588er-Hecke als ein einziges Objekt und uebersieht
 *     sie vollstaendig. Ihre Vielfalt steckt in der Matrixliste.
 *
 * ⚠️ NICHT JEDE GLEICHFOERMIGKEIT IST EIN FEHLER. Strassenlaternen, Poller, Schilder
 * und Fahrzeuge sind INDUSTRIEPRODUKTE — die sollen gleich aussehen. Gemeint sind
 * gewachsene Dinge: Hecken, Buesche, Blumen, Steine, Schilf. Die Liste sortiert
 * darum nur; welche Zeile ein Fund ist, entscheidet ein Mensch.
 */
import { spielOeffnen, mitSonden } from './th-lib.mjs'

const MIN = Number(process.argv[2] || 20)

const datei = mitSonden('traumhaus.html', {
  vielfalt: 'function(min){var G={},out=[];' +
    'function schluessel(o,m){return (o.geometry.type||"?")+"|"+((m&&m.color)?m.color.getHexString():"-");}' +
    'scene.traverse(function(o){' +
      'if(!o.isMesh||!o.geometry||!o.material)return;' +
      'var m=Array.isArray(o.material)?o.material[0]:o.material;' +
      'var nam=(o.userData&&o.userData.datei)||o.name||(m&&m.name)||"";' +
      'if(o.isInstancedMesh){' +
        'if(o.count<min)return;' +
        'var M=new THREE.Matrix4(),P=new THREE.Vector3(),Q=new THREE.Quaternion(),S=new THREE.Vector3();' +
        'var sk={},dr={};' +
        'for(var i=0;i<o.count;i++){o.getMatrixAt(i,M);M.decompose(P,Q,S);' +
          'sk[Math.round(S.x*200)+"|"+Math.round(S.y*200)+"|"+Math.round(S.z*200)]=1;' +
          'var e=new THREE.Euler().setFromQuaternion(Q);dr[Math.round(e.y*200)]=1;}' +
        'out.push({n:o.count,art:"Instanzen",name:nam||schluessel(o,m),' +
          'groessen:Object.keys(sk).length,drehungen:Object.keys(dr).length});return;}' +
      /* Einzelmeshes nach Geometrie + Farbe buendeln — die Welt-Matrix zaehlt. */
      'var k=schluessel(o,m)+"|"+nam;' +
      'if(!G[k])G[k]={n:0,name:nam,art:"Einzelteile",sk:{},dr:{},bsp:schluessel(o,m)};' +
      'var q=G[k];q.n++;' +
      'var WS=new THREE.Vector3(),WQ=new THREE.Quaternion();' +
      'o.matrixWorld.decompose(new THREE.Vector3(),WQ,WS);' +
      'q.sk[Math.round(WS.x*200)+"|"+Math.round(WS.y*200)+"|"+Math.round(WS.z*200)]=1;' +
      'var we=new THREE.Euler().setFromQuaternion(WQ);q.dr[Math.round(we.y*200)]=1;});' +
    'for(var k2 in G){var q2=G[k2];if(q2.n<min)continue;' +
      'out.push({n:q2.n,art:q2.art,name:q2.name||q2.bsp,' +
        'groessen:Object.keys(q2.sk).length,drehungen:Object.keys(q2.dr).length});}' +
    'out.sort(function(a,b){' +
      'var va=(a.groessen+a.drehungen)/a.n, vb=(b.groessen+b.drehungen)/b.n;' +
      'if(va!==vb)return va-vb;return b.n-a.n;});' +
    'return out.slice(0,24);}'
}, 'spiele-dev/tools/_vielfalt_probe.html')

const { browser, page, jsFehler } = await spielOeffnen(datei, { warten: 55000 })
const L = await page.evaluate((m) => window.__th.vielfalt(m), MIN)
console.log('\nGruppen ab ' + MIN + ' gleichartigen Dingen, die eintoenigsten zuerst:')
console.log('  Anzahl  Groessen  Drehungen  Streuung  Art          Was')
for (const q of L) {
  const streu = ((q.groessen + q.drehungen) / q.n).toFixed(2)
  console.log('  ' + String(q.n).padStart(5) + String(q.groessen).padStart(9) + String(q.drehungen).padStart(10) +
    streu.padStart(10) + '  ' + q.art.padEnd(12) + ' ' + String(q.name).slice(0, 34))
}
console.log('\nStreuung = (Groessen + Drehungen) / Anzahl. 0,03 heisst: 100 Dinge teilen sich')
console.log('drei Auspraegungen. Bei Industrieprodukten (Laternen, Poller, Schilder) ist das')
console.log('richtig so — bei Gewachsenem (Hecken, Buesche, Blumen, Steinen) nicht.')
console.log('\nJS-Fehler: ' + (jsFehler.length ? JSON.stringify(jsFehler.slice(0, 2)) : 'keine'))
await browser.close()
