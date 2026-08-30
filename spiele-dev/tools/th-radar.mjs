/* th-radar.mjs — zeigt das Radar die Verdienst-Gelegenheiten wirklich an?
 *
 * ⚠️ WOZU. th-reichweite hat gemessen: Kettenglied 4 verlangt 66 m in 24,4 s. Machbar —
 * aber NUR, wenn man weiss, wohin. Wer sucht, verliert die Serie. Damit haengt die ganze
 * Serien-Mechanik daran, dass das Radar die naechste Muenze zeigt.
 *
 * Gemessen wird das am BILD, nicht am Code: die gezeichneten Muenz-Punkte werden im
 * Canvas ausgezaehlt (Farbe #ffe14a). Ein Blick in die Quelle wuerde nur zeigen, dass
 * eine Zeichen-Anweisung DASTEHT — nicht, dass sie laeuft.
 *
 * Aufruf:  node spiele-dev/tools/th-radar.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_radar_probe.html'
mitSonden('traumhaus.html', {
  rd: `function(was,a){
    if(was==="waechter")return {fensterGlobal:typeof window.pickups,
      inDerHuelle:(typeof pickups!=="undefined")?pickups.length:-1};
    if(was==="zeigen"){var m=document.getElementById("minimap");
      m.style.display="block";return m.style.display;}
    /* Muenz-Punkte auszaehlen: Fuellfarbe ist #ffe14a = 255/225/74. Toleranz, weil
       Antialiasing die Raender abschwaecht; der Kern bleibt eindeutig. */
    if(was==="punkte"){var m2=document.getElementById("minimap");
      var d=m2.getContext("2d").getImageData(0,0,m2.width,m2.height).data,n=0;
      for(var i=0;i<d.length;i+=4){
        if(Math.abs(d[i]-255)<12&&Math.abs(d[i+1]-225)<12&&Math.abs(d[i+2]-74)<26&&d[i+3]>200)n++;}
      return n;}
    if(was==="nah"){var m3=document.getElementById("minimap");
      var d3=m3.getContext("2d").getImageData(0,0,m3.width,m3.height).data,n3=0;
      for(var j=0;j<d3.length;j+=4){
        if(Math.abs(d3[j]-255)<14&&Math.abs(d3[j+1]-107)<16&&Math.abs(d3[j+2]-90)<20&&d3[j+3]>200)n3++;}
      return n3;}
    if(was==="serie"){KOMBO.n=a;KOMBO.t=a>0?99:0;komboHudUpd();return KOMBO.n;}
    if(was==="hetze"){HETZE.an=!!a;HETZE.t=a?60:0;HETZE.punkte=0;hetzeHudUpd();return HETZE.an;}
    if(was==="muenzen"){var akt=0;for(var k=0;k<pickups.length;k++)if(pickups[k].active)akt++;
      return {gesamt:pickups.length,aktiv:akt};}
    if(was==="ausschalten"){for(var q=0;q<pickups.length;q++){pickups[q].active=false;}return true;}
    if(was==="einschalten"){for(var r=0;r<pickups.length;r++){pickups[r].active=true;}return true;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const D = (...a) => page.evaluate((x) => window.__th.rd(...x), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

const w = await D('waechter')
console.log('  window.pickups = ' + w.fensterGlobal + ' · in der Huelle: ' + w.inDerHuelle + ' Muenzen')
await D('zeigen')
await page.waitForTimeout(1500)

const mz = await D('muenzen')
check('Es gibt aktive Muenzen zu zeichnen', mz.aktiv > 0, mz.aktiv + ' von ' + mz.gesamt)

const gezeichnet = await D('punkte')
console.log('  gezeichnete Muenz-Pixel: ' + gezeichnet)
check('Das Radar zeigt die Muenzen', gezeichnet > 0, gezeichnet + ' Pixel in Muenzfarbe')

/* Gegenprobe: ohne aktive Muenzen darf kein Punkt uebrig bleiben. Faellt sie durch,
   zaehlt der Zaehler etwas anderes (Strassenfarbe, Rand) und das Ergebnis oben ist
   wertlos. */
await D('ausschalten')
await page.waitForTimeout(1200)
const ohne = await D('punkte')
/* Schwelle 2 statt 0, und zwar begruendet: bei einer Sabotage, die das Muenz-Zeichnen
   gar nicht anfasst (Markierung dauerhaft an), kippte diese Pruefung mit EINEM Pixel —
   Kantenglaettung am roten Ring. Richtiges Ergebnis, falscher Grund. Im gesunden Lauf
   sind es exakt 0; 2 Pixel Luft trennen Rauschen von 48 gezeichneten Punkten, ohne
   irgendetwas Echtes durchzulassen. */
check('GEGENPROBE: ohne aktive Muenzen bleibt kein Punkt', ohne <= 2, ohne + ' Pixel')
await D('einschalten')
await page.waitForTimeout(1200)
const wieder = await D('punkte')
check('… und mit ihnen kommen sie zurueck', wieder > 0, wieder + ' Pixel')

/* --- Serien-Markierung: das naechste Ziel muss waehrend einer Kette hervorstechen --- */
await D('serie', 0)
await page.waitForTimeout(1000)
const ruhe = await D('nah')
await D('serie', 4)
await page.waitForTimeout(1200)
const jagd = await D('nah')
console.log('  Markierungs-Pixel ohne Serie: ' + ruhe + ' · mit Serie: ' + jagd)
check('Waehrend einer Serie wird die naechste Muenze markiert', jagd > ruhe, jagd + ' gegen ' + ruhe)
check('GEGENPROBE: ohne Serie gibt es keine Markierung', ruhe === 0, ruhe + ' Pixel')
await D('serie', 0)

/* --- Die Hetze braucht dieselbe Fuehrung. Sie startet IMMER mit Serie 0 — ohne diese
   Kopplung ist man in den ersten Sekunden der Runde blind, genau dann, wenn die Uhr
   schon laeuft. --- */
await D('hetze', true)
await page.waitForTimeout(1200)
const inHetze = await D('nah')
console.log('  Markierungs-Pixel in der Hetze (Serie 0): ' + inHetze)
check('Auch in der Hetze wird die naechste Muenze markiert', inHetze > 0, inHetze + ' Pixel')
await D('hetze', false)
await page.waitForTimeout(1200)
check('GEGENPROBE: nach der Hetze erlischt die Markierung wieder', (await D('nah')) === 0)

check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 RADAR BESTANDEN' : '💥 RADAR FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
