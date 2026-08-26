/* th-stich.mjs — prueft den Verkehr auf dem Achterbahn-Stich (L-Weg mit Bogen).
 *
 * Checks:
 *  1. Mindestens 2 Wagen sind der Stich-Route zugeteilt
 *  2. Jeder Stich-Wagen liegt IM Asphaltband (Westast |z-173|<=4.2, Suedast |x+190|<=4.2)
 *  3. Rechtsverkehr: Westfahrer noerdlich (z<173), Ostfahrer suedlich (z>173)
 *  4. Die gerundete Ecke hat KEINEN Rotationssprung (max. Kursaenderung pro Meter klein)
 *  5. 60 s simuliert (updVerkehr direkt getickt, umgeht die dt-Deckelung):
 *     kein Wagen verlaesst je das Band, beide Enden werden gewendet
 *  6. Kein Wagen steht dauerhaft (Ampel-Falle: die Bogenlaenge kreuzt sonst die 58)
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_stich_probe.html'
mitSonden('traumhaus.html', {
  st: `function(was,a){
    function imBand(x,z){
      if(z>=168.8&&z<=177.2&&x>=-194.2&&x<=-96)return true;      /* Westast */
      if(x>=-194.2&&x<=-185.8&&z>=168.8&&z<=209.8)return true;   /* Suedast + Vorplatz */
      return false;}
    var W=verkehr.filter(function(v){return v.route.axis==="stich";});
    if(was==="anzahl")return W.length;
    if(was==="lage")return W.map(function(v){
      return {x:+v.mesh.position.x.toFixed(2),z:+v.mesh.position.z.toFixed(2),
              pos:+v.pos.toFixed(1),rdir:v.rdir,imBand:imBand(v.mesh.position.x,v.mesh.position.z)};});
    if(was==="ecke"){ /* Kurs entlang des Bogens abtasten */
      var mx=0,vor=null;
      for(var s=STICH.la-6;s<=STICH.la+STICH.bo+6;s+=0.25){
        var p=stichPkt(s),k=Math.atan2(p[3],p[2]);
        if(vor!==null){var d=Math.abs(k-vor);if(d>Math.PI)d=2*Math.PI-d;if(d>mx)mx=d;}
        vor=k;}
      return +(mx*180/Math.PI).toFixed(2);}   /* Grad pro 0,25 m */
    if(was==="lauf"){ /* a Sekunden simulieren, Extremwerte sammeln */
      var raus=0,wendeMin=0,wendeMax=0,steht=0,minP=1e9,maxP=-1e9,seiteFalsch=0;
      var start=W.map(function(v){return v.pos;});
      for(var t=0;t<a*20;t++){
        updVerkehr(0.05);
        for(var i=0;i<W.length;i++){var v=W[i];
          if(!imBand(v.mesh.position.x,v.mesh.position.z))raus++;
          if(v.pos<minP)minP=v.pos; if(v.pos>maxP)maxP=v.pos;
          if(v.pos<=0.01)wendeMin++; if(v.pos>=STICH.len-0.01)wendeMax++;
          /* Spurseite nur auf dem Westast pruefen (dort ist z die Querachse) */
          if(v.pos>4&&v.pos<STICH.la-4){
            var westw=(v.rdir>0);
            if(westw&&v.mesh.position.z>=173)seiteFalsch++;
            if(!westw&&v.mesh.position.z<=173)seiteFalsch++;}}}
      var bewegt=W.filter(function(v,i){return Math.abs(v.pos-start[i])>1;}).length;
      return {raus:raus,wendeMin:wendeMin,wendeMax:wendeMax,bewegt:bewegt,n:W.length,
              minP:+minP.toFixed(2),maxP:+maxP.toFixed(2),len:+STICH.len.toFixed(2),
              seiteFalsch:seiteFalsch};}
    return null;}`,
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 55000 })
const S = (...a) => page.evaluate((args) => window.__th.st(...args), a)
let ok = 0, fehl = 0
const check = (n, gut, d) => { console.log((gut ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : '')); gut ? ok++ : fehl++ }

const anz = await S('anzahl')
check('Wagen auf der Stich-Route', anz >= 2, anz + ' Wagen')
const lage = await S('lage')
check('alle im Asphaltband', lage.every((w) => w.imBand), JSON.stringify(lage))
const grad = await S('ecke')
check('Ecke ohne Rotationssprung', grad < 4, grad + '° pro 0,25 m (Bogen R=5)')
const L = await S('lauf', 60)
check('60 s Fahrt: nie neben der Strasse', L.raus === 0, L.raus + ' Austritte')
check('Wagen fahren wirklich', L.bewegt === L.n, L.bewegt + '/' + L.n + ' bewegt')
check('an beiden Enden gewendet', L.wendeMin > 0 && L.wendeMax > 0, `Einmuendung ${L.wendeMin}× · Vorplatz ${L.wendeMax}×`)
check('Bogenlaenge bleibt im Bereich', L.minP >= 0 && L.maxP <= L.len + 0.01, `pos ${L.minP}..${L.maxP} (len ${L.len})`)
check('Rechtsverkehr auf dem Westast', L.seiteFalsch === 0, L.seiteFalsch + ' Verstoesse')
check('0 JS-Fehler', jsFehler.length === 0, jsFehler.join(' | ') || '')
console.log(`\n${fehl === 0 ? '🎉 STICH BESTANDEN' : '💥 STICH FEHLGESCHLAGEN'} — ${ok} ok, ${fehl} Fehler`)
await browser.close()
aufraeumen(TMP)
process.exit(fehl === 0 ? 0 : 1)
