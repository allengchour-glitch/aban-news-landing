/* th-rampen.mjs — stehen alle Stunt-Rampen richtig, und wirkt jede einzeln?
 *
 * ⚠️ WOZU. th-reichweite hat gemessen: die Rampe ist die EINZIGE wiederholbare
 * Verdienstquelle, die schnell genug kommt (2 s Abklingzeit), um eine Serie bis zum
 * Deckel zu tragen — Muenzen brauchen 90 s. Solange es nur eine gab, hing die obere
 * Haelfte der Serien-Kurve an einem einzigen Ort der Karte.
 *
 * Geprueft wird darum: Anzahl, Lage (frei, nicht auf der Fahrbahn, flach, Abstand
 * zueinander) und — das Wichtigste — dass jede Rampe ihre EIGENE Abklingzeit hat.
 * Eine gemeinsame wuerde bedeuten, dass ein Sprung im Osten die Rampe im Westen sperrt.
 *
 * Aufruf:  node spiele-dev/tools/th-rampen.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_rampen_probe.html'
mitSonden('traumhaus.html', {
  rp: `function(was,a){
    if(was==="liste")return window._rampen.map(function(r){
      var w=wegVonStrasse(r.x,r.z);
      var h0=gelaendeH(r.x,r.z),dh=0;
      for(var p=-4;p<=4;p+=4)for(var q=-4;q<=4;q+=4)
        dh=Math.max(dh,Math.abs(gelaendeH(r.x+p,r.z+q)-h0));
      /* Platz fuer den Keil: 7 x 4 m um die Mitte */
      var frei=true;
      for(var p2=-5;p2<=5&&frei;p2+=2.5)for(var q2=-3;q2<=3&&frei;q2+=1.5)
        if(inSolid(r.x+p2,r.z+q2)||imBau(r.x+p2,r.z+q2))frei=false;
      /* Strasse in Reichweite? */
      var nah=false;
      for(var p3=-26;p3<=26&&!nah;p3+=4)for(var q3=-26;q3<=26&&!nah;q3+=4){
        var w2=wegVonStrasse(r.x+p3,r.z+q3);
        if(Math.abs(w2[0]-(r.x+p3))>0.01||Math.abs(w2[1]-(r.z+q3))>0.01)nah=true;}
      return {x:r.x,z:r.z,cd:r.cd,
        aufStrasse:(Math.abs(w[0]-r.x)>0.01||Math.abs(w[1]-r.z)>0.01),
        gefaelle:+dh.toFixed(2),platzFrei:frei,strasseNah:nah};});
    if(was==="setzCd"){window._rampen[a[0]].cd=a[1];return window._rampen.map(function(r){return r.cd;});}
    /* ⚠️ Die Abklingzeiten werden in autoFahr heruntergezaehlt — nur die Datenstruktur
       zu befragen prueft NICHT die Physik. Darum wird hier wirklich autoFahr getaktet:
       ein Auto besetzen, Tempo setzen, tick. Ohne das bestand der Test auch dann, wenn
       alle Rampen dieselbe Abklingzeit teilten. */
    if(was==="fahrTakt"){
      /* Am Spielstart gibt es noch kein Auto (man kauft eines). autoFahr braucht nur
         ein Objekt mit .mesh — also ein Platzhalter-Wagen, weit weg von jeder Rampe,
         damit kein Sprung ausgeloest wird und wirklich nur das Herunterzaehlen laeuft. */
      var _f=fahren,_d=driveCar,_k=window._carKmh;
      var _dummy=window.__probeCar;
      if(!_dummy){_dummy=new THREE.Object3D();_dummy.position.set(0,0.5,0);
        window.__probeCar={mesh:_dummy};}
      fahren=true;driveCar=window.__probeCar;window._carKmh=0;
      try{ autoFahr(a); }catch(e){ return "autoFahr wirft: "+e; }
      finally { fahren=_f;driveCar=_d;window._carKmh=_k; }
      return window._rampen.map(function(r){return +r.cd.toFixed(2);});}
    if(was==="cds")return window._rampen.map(function(r){return +r.cd.toFixed(2);});
    if(was==="alt")return window._rampe===window._rampen[0];
    /* Sichtbares Bauwerk: liegt an jeder Position auch wirklich Geometrie? */
    if(was==="koerper"){var n=0;scene.traverse(function(o){
      if(o.isMesh&&o.geometry&&o.geometry.type==="ExtrudeGeometry")n++;});return n;}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 45000 })
const R = (...a) => page.evaluate((x) => window.__th.rp(...x), a)
let ok = 0, fehl = 0
const check = (name, gut, detail) => {
  console.log((gut ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  gut ? ok++ : fehl++
}

const L = await R('liste')
console.log('  Rampen: ' + L.map((r) => '(' + r.x + ',' + r.z + ')').join(' '))
check('Mehr als eine Rampe in der Stadt', L.length >= 4, L.length + ' Rampen')
check('Keine steht auf der Fahrbahn', L.every((r) => !r.aufStrasse),
  L.filter((r) => r.aufStrasse).map((r) => r.x + '/' + r.z).join(', ') || 'keine')
check('Jede hat Platz fuer den Keil', L.every((r) => r.platzFrei),
  L.filter((r) => !r.platzFrei).map((r) => r.x + '/' + r.z).join(', ') || 'alle frei')
check('Jede steht flach (unter 25 cm Gefaelle auf 4 m)', L.every((r) => r.gefaelle < 0.25),
  'groesstes Gefaelle ' + Math.max(...L.map((r) => r.gefaelle)) + ' m')
check('Jede ist von einer Strasse aus erreichbar', L.every((r) => r.strasseNah))

let minAbstand = Infinity
for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++)
  minAbstand = Math.min(minAbstand, Math.hypot(L[i].x - L[j].x, L[i].z - L[j].z))
check('Sie stehen weit auseinander (nicht alle in einer Ecke)', minAbstand > 55,
  'kleinster Abstand ' + Math.round(minAbstand) + ' m')

check('Jede Rampe hat einen eigenen Koerper in der Szene', (await R('koerper')) >= L.length,
  (await R('koerper')) + ' Keile')

/* --- Das Entscheidende: eigene Abklingzeit je Rampe, IN DER PHYSIK --- */
await R('setzCd', [0, 2])
const gesetzt = await R('cds')
check('GEGENPROBE: die Sperre kommt ueberhaupt an', gesetzt[0] >= 1.9,
  JSON.stringify(gesetzt))
/* Und jetzt der eigentliche Beweis: autoFahr taktet die Abklingzeiten herunter.
   Teilen sich die Rampen EINE, springen die anderen auf denselben Wert. */
const getaktet = await R('fahrTakt', 0.1)
check('Eine gesperrte Rampe sperrt die anderen NICHT (nach echtem Physik-Takt)',
  Array.isArray(getaktet) && getaktet[0] > 1.5 && getaktet.slice(1).every((c) => c < 1.5),
  JSON.stringify(getaktet))

check('Der alte Einzelverweis _rampe zeigt weiter auf eine echte Rampe', await R('alt'))
check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 RAMPEN BESTANDEN' : '💥 RAMPEN FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
