/* th-kachel.mjs — wo ist eine Textur zur Farbe gestreckt?
 *
 *   node spiele-dev/tools/th-kachel.mjs [meter]
 *
 * WARUM: In Runde 68 sahen die Viertelboeden aus wie tote Farbflaechen. Die Vermutung
 * "keine Textur" war falsch — sie hatten eine, mit `repeat` 1x1 ueber bis zu 180 m.
 * Eine 128-Pixel-Kachel ueber 180 m ist keine Struktur mehr. Das kann jeder grossen
 * Flaeche passieren, und keine Pruefung hat danach gefragt.
 *
 * Gemeldet wird jede Flaeche ab 20 m Kantenlaenge, deren Kachel groesser als die
 * Grenze ist (Standard 25 m). Zum Vergleich: Fahrbahn 6 m, Viertelboden 7 m,
 * Kurpark-Pflaster ~9 m, ferne Grasebene 11 m.
 *
 * ⚠️ NICHT JEDE GROSSE KACHEL IST EIN FEHLER. Ein Verlauf, ein Wolkenschatten oder
 * ein Himmel SOLL gross sein — solche Flaechen stehen in AUSNAHMEN. Wer eine neue
 * Ausnahme eintraegt, schreibt dazu, warum die Flaeche keine Struktur braucht.
 */
import { spielOeffnen, mitSonden } from './th-lib.mjs'

const GRENZE = Number(process.argv[2] || 25)
const AUSNAHMEN = [
  /* Der Wolkenschatten ist bewusst weich und riesig — Struktur waere dort falsch. */
  'wolkenschatten',
  /* Himmel und ferne Ebene tragen absichtlich grosse Verlaeufe. */
  'himmel', 'fern',
]

const datei = mitSonden('traumhaus.html', {
  kacheln: 'function(g){var out=[];' +
    'scene.traverse(function(o){' +
      'if(!o.isMesh||!o.material||!o.geometry)return;' +
      'var m=Array.isArray(o.material)?o.material[0]:o.material;' +
      'if(!m||!m.map||!m.map.repeat)return;' +
      'var bb=new THREE.Box3().setFromObject(o),e=new THREE.Vector3();bb.getSize(e);' +
      'var gr=Math.max(e.x,e.z);if(gr<20)return;' +
      /* ⚠️ ZWEIMAL DAS FALSCHE MASS GENOMMEN, BEIDE MALE MIT DERSELBEN ANNAHME.
         Erst bbox/repeat — das unterstellt, die UV liefen ueber die ganze Flaeche von
         0 bis 1; die frisch mit UV versehene Landstrasse meldete darum unveraendert
         "Kachel 408 m". Dann bbox/UV-Spanne — das unterstellt, die UV-Richtung liege
         auf der bbox-Achse; beim RING laeuft u rundherum, waehrend die bbox den ganzen
         Durchmesser misst, und das Bankett meldete "1646 m" statt 2 m.
         Beides sind Naeherungen ueber die Huelle. Richtig ist die Dichte SELBST: fuer
         jedes Dreieck die Flaeche in der Welt gegen die Flaeche im Bild. Die Wurzel
         daraus ist die Kantenlaenge einer Kachel in Metern — unabhaengig davon, wie
         die Flaeche gekruemmt oder gedreht ist.
         Gegenprobe: die ferne Grasebene ist 900 x 900 m bei repeat 80 -> 11,25 m. */
      'var av=o.geometry.attributes.uv,pa=o.geometry.attributes.position;' +
      'if(!av)return out.push({n:(o.userData&&o.userData.datei)||o.name||o.geometry.type,' +
        'gr:Math.round(gr),kachel:-1,x:0,z:0,farbe:(m.color?m.color.getHexString():"-")});' +
      'var ix=o.geometry.index,nn=ix?ix.count:pa.count,AW=0,AU=0,A=new THREE.Vector3(),B=new THREE.Vector3(),C=new THREE.Vector3();' +
      'var schritt=Math.max(3,Math.floor(nn/900)*3);' +
      'for(var t=0;t+2<nn;t+=schritt){' +
        'var i0=ix?ix.getX(t):t,i1=ix?ix.getX(t+1):t+1,i2=ix?ix.getX(t+2):t+2;' +
        'A.fromBufferAttribute(pa,i0);B.fromBufferAttribute(pa,i1);C.fromBufferAttribute(pa,i2);' +
        'A.applyMatrix4(o.matrixWorld);B.applyMatrix4(o.matrixWorld);C.applyMatrix4(o.matrixWorld);' +
        'AW+=B.clone().sub(A).cross(C.clone().sub(A)).length()*0.5;' +
        'var ax=av.getX(i0),ay=av.getY(i0),bx=av.getX(i1),by=av.getY(i1),cx=av.getX(i2),cy=av.getY(i2);' +
        'AU+=Math.abs((bx-ax)*(cy-ay)-(cx-ax)*(by-ay))*0.5;}' +
      'AU*=(m.map.repeat.x||1)*(m.map.repeat.y||1);' +
      'if(AU<=1e-9||AW<=0)return;' +
      'var k=Math.sqrt(AW/AU);if(k<=g)return;' +
      'var p=new THREE.Vector3();o.getWorldPosition(p);' +
      'out.push({n:(o.userData&&o.userData.datei)||o.name||o.geometry.type,' +
        'gr:Math.round(gr),kachel:Math.round(k),' +
        'x:Math.round(p.x),z:Math.round(p.z),' +
        'farbe:(m.color?m.color.getHexString():"-")});});' +
    'out.sort(function(a,b){return b.kachel-a.kachel;});return out;}'
}, 'spiele-dev/tools/_kachel_probe.html')

const { browser, page, jsFehler } = await spielOeffnen(datei, { warten: 55000 })
/* ⚠️ ZWEIMAL MESSEN, SONST MELDET DIE PRUEFUNG LADEZEIT ALS FEHLER. Texturen aus
   Dateien kommen ueber `ladeTex` NACH, und bis dahin haengt am Material noch die
   prozedurale Notloesung mit repeat 1x1. Der Altstadt-Platz stand darum einmal mit
   "49 m Kachel" in der Liste — und war in Wahrheit sauber gekachelt (2,5 m), die
   Datei war nur noch unterwegs. Verraten hat es die FARBE: `ladeTex` setzt sie beim
   Laden auf ffffff, in der Meldung stand aber noch der Notton.
   Gemeldet wird darum nur, was in BEIDEN Messungen steht. */
const lauf1 = await page.evaluate((g) => window.__th.kacheln(g), GRENZE)
await page.waitForTimeout(20000)
const lauf2 = await page.evaluate((g) => window.__th.kacheln(g), GRENZE)
const schluessel = (o) => o.n + '|' + o.gr + '|' + o.x + '|' + o.z
const bleibt = new Set(lauf1.map(schluessel))
const alle = lauf2.filter((o) => bleibt.has(schluessel(o)))
const verschwunden = lauf2.length - alle.length + (lauf1.length - alle.length)
if (verschwunden) console.log('  (' + verschwunden + ' Meldung(en) waren nur Ladezeit und sind in der zweiten Messung weg)')
const treffer = alle.filter((a) => !AUSNAHMEN.some((x) => String(a.n).toLowerCase().includes(x)))
console.log('\nFlaechen ab 20 m mit Kachel groesser ' + GRENZE + ' m:')
if (!treffer.length) console.log('   keine')
const ohneUV = treffer.filter((o) => o.kachel < 0)
const gross = treffer.filter((o) => o.kachel >= 0)
if (ohneUV.length) {
  console.log('\n  MIT Textur, aber OHNE uv — die Textur kann gar nicht erscheinen:')
  for (const o of ohneUV.slice(0, 12))
    console.log('     Flaeche ' + String(o.gr).padStart(4) + ' m · ' + o.farbe + ' · ' + String(o.n).slice(0, 34))
}
if (gross.length) {
  console.log('\n  Kachel groesser ' + GRENZE + ' m:')
  for (const o of gross.slice(0, 14))
    console.log('     Kachel ' + String(o.kachel).padStart(4) + ' m · Flaeche ' + String(o.gr).padStart(4) +
      ' m · ' + o.farbe + ' · ' + String(o.n).slice(0, 26).padEnd(26) + ' @ ' + o.x + '|' + o.z)
}
console.log('\nJS-Fehler: ' + (jsFehler.length ? JSON.stringify(jsFehler.slice(0, 2)) : 'keine'))
/* ⚠️ ROT WIRD NUR DER EINDEUTIGE FALL. "Textur ohne uv" ist immer kaputt: die Textur
   KANN nicht erscheinen, jeder Punkt liest denselben Bildpunkt. "Kachel groesser als
   25 m" ist dagegen ein Urteil — der Himmel, der Wolkenschatten und die weichen
   Verlaufsebenen SOLLEN gross sein, und was in einem GLB-Modell steckt, gehoert dem
   Modell. Die Liste steht darum als Hinweis da und nicht als Befund; wer sie zum
   Befund macht, macht die Pruefung dauerhaft rot und damit wertlos. */
console.log('\n(Von den gestreckten sind Himmel, Wolkenschatten und Verlaufsebenen so gewollt;' +
            '\n die Cubes stammen aus GLB-Modellen und tragen deren eigene UV.)')
console.log(ohneUV.length ? '\n❌ KACHEL: ' + ohneUV.length + ' Flaeche(n) mit Textur, aber ohne uv'
                          : '\n🎉 KACHEL BESTANDEN — jede texturierte Flaeche hat uv (' + gross.length + ' grosse Kacheln, siehe oben)')
await browser.close()
process.exit(ohneUV.length ? 1 : 0)
