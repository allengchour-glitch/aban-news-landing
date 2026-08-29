/**
 * th-linien.mjs — welche Fahrbahnmarkierungen liegen auf der Mitte der Hauptstrassen?
 *
 * ⚠️ WOZU. Auf einer echten Strasse gibt es entweder eine SPERRLINIE (doppelt,
 * durchgezogen) ODER eine LEITLINIE (gestrichelt) — nie beides an derselben Stelle.
 * Die Nordstrasse hatte beides: 2 durchgezogene auf 57,70/58,30 und 16 Striche
 * dazwischen auf 58,00. Fuer die Suedstrasse war derselbe Fehler schon behoben,
 * der Kommentar dort nennt sie aber irrtuemlich »Nordstrasse« — deshalb blieb die
 * eine Haelfte stehen.
 *
 * Kein anderes Werkzeug sieht das: th-strassen filtert flache Markierungen ueber
 * MINH weg (sonst meldete es jede Haltelinie), th-belag nur lange Baender QUER zur
 * Strasse. Eine Doppelmarkierung laengs derselben Strasse faellt durch beide Netze.
 *
 * Ausgabe: je z-Lage die Zahl der flachen Baender und ihre Breiten.
 *   Erwartet sind vier Zeilen (±57,70 und ±58,30) mit je 3 Segmenten.
 *
 * Aufruf:  node spiele-dev/tools/th-linien.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const sonde = `function(){
  var bb=new THREE.Box3(),R=[];
  scene.traverse(function(o){
    if(!o.isMesh||!o.geometry)return;
    bb.setFromObject(o);
    if(bb.max.y>0.02)return;
    var bd=bb.max.z-bb.min.z; if(bd>0.5)return;
    var m=(bb.min.z+bb.max.z)/2;
    if(Math.abs(Math.abs(m)-58)>0.6)return;
    R.push({z:+m.toFixed(2),x:[+bb.min.x.toFixed(1),+bb.max.x.toFixed(1)],
            breit:+(bb.max.x-bb.min.x).toFixed(2),y:+bb.max.y.toFixed(4),typ:o.geometry.type});});
  R.sort(function(a,b){return a.z-b.z||a.x[0]-b.x[0];});
  return R;}`
mitSonden('traumhaus.html', { l2: sonde }, '_l2.html')
const { browser, page, jsFehler } = await spielOeffnen('_l2.html', { warten: 20000 })
const R = await page.evaluate(() => window.__th.l2())
await browser.close(); aufraeumen('_l2.html')
const g = {}; for (const r of R) { const k = r.z.toFixed(2); (g[k] = g[k] || []).push(r) }
for (const k of Object.keys(g).sort((a,b)=>a-b)) console.log(`z=${k}  n=${g[k].length}  breiten=${[...new Set(g[k].map(r=>r.breit))].join(',')}  y=${[...new Set(g[k].map(r=>r.y))].join(',')}`)
console.log('JS-Fehler:', jsFehler.length)
