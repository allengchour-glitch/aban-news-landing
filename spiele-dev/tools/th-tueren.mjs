/**
 * th-tueren.mjs — wo hat ein Gebaeude seine Oeffnung?
 *
 * Braucht man, um einem durchlaufbaren Haus einen Kollider MIT TUER zu geben:
 * addSolid(x,z,w,d,{a,at,c,w}) kann eine Luecke aussparen, aber nur, wenn man weiss,
 * wo sie liegt. Geraten ist sie schnell an der falschen Wand.
 *
 * ⚠️ NICHT IN DIE TIEFE TASTEN. Der erste Versuch nahm eine Probe 0,45 m hinter der
 * Fassade — das ist INNEN. Eine Wand ist 0,2…0,3 m dick, die Probe lag also stets im
 * leeren Innenraum, und die Kathedrale meldete alle vier Seiten zu 90 % offen.
 * Richtig ist: nur Teile betrachten, die die Fassade BERUEHREN (0,6 m Toleranz), und
 * ihre Ausdehnung laengs der Wand als gedeckt markieren. Was ungedeckt bleibt, ist die
 * Oeffnung.
 *
 * Gemessen wird auf Wandhoehe — 0,3…2,0 m ueber der EIGENEN Sohle, nicht absolut
 * (die Berghuette steht auf 43 m).
 *
 * Aufruf:  node spiele-dev/tools/th-tueren.mjs [regex]
 *          node spiele-dev/tools/th-tueren.mjs 'kirche|laden'
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'
const sonde = `function(muster){
  var re=new RegExp(muster,"i"), out=[];
  (window._gebaeude||[]).forEach(function(w){
    var d=(w.userData&&w.userData.datei)||"";
    if(!re.test(d))return;
    var bb=new THREE.Box3().setFromObject(w);
    if(!isFinite(bb.min.x))return;
    var sohle=bb.min.y;
    /* Nur Wandhoehe: 0,3…2,0 m ueber der eigenen Sohle — dort ist eine Tuer eine Luecke. */
    var teile=[], tb=new THREE.Box3();
    w.traverse(function(m){
      if(!m.isMesh||!m.geometry)return;
      tb.setFromObject(m);
      if(!isFinite(tb.min.x))return;
      if(tb.max.y<sohle+0.3||tb.min.y>sohle+2.0)return;
      teile.push({x0:tb.min.x,x1:tb.max.x,z0:tb.min.z,z1:tb.max.z});});
    if(!teile.length)return;
    var wx0=1e9,wx1=-1e9,wz0=1e9,wz1=-1e9;
    teile.forEach(function(t){
      if(t.x0<wx0)wx0=t.x0; if(t.x1>wx1)wx1=t.x1;
      if(t.z0<wz0)wz0=t.z0; if(t.z1>wz1)wz1=t.z1;});
    /* Je Seite in 0,25-m-Zellen abtasten: wo kein Wandteil die Zelle beruehrt, ist Luecke. */
    /* ⚠️ NICHT IN DIE TIEFE TASTEN. Der erste Versuch nahm eine Probe 0,45 m hinter
       der Fassade — das ist INNEN. Eine Wand ist 0,2…0,3 m dick, also lag die Probe
       stets im leeren Innenraum, und die Kirche meldete alle vier Seiten zu 90 %
       offen. Richtig ist: nur Teile betrachten, die die Fassade BERUEHREN, und ihre
       Ausdehnung laengs der Wand als gedeckt markieren. Was ungedeckt bleibt, ist
       die Oeffnung. */
    function luecke(seite){
      var SCHRITT=0.25, NAH=0.6;
      var laengs = (seite==="N"||seite==="S") ? "x" : "z";
      var a0 = laengs==="x" ? wx0 : wz0, a1 = laengs==="x" ? wx1 : wz1;
      var n=Math.max(4,Math.round((a1-a0)/SCHRITT)), frei=[];
      var an=teile.filter(function(t){
        if(seite==="N")return t.z1>=wz1-NAH;
        if(seite==="S")return t.z0<=wz0+NAH;
        if(seite==="O")return t.x1>=wx1-NAH;
        return t.x0<=wx0+NAH;});
      if(!an.length)return null;
      for(var i=0;i<n;i++){
        var a=a0+(i+0.5)*(a1-a0)/n, hit=false;
        for(var k=0;k<an.length;k++){var t=an[k];
          var u0 = laengs==="x" ? t.x0 : t.z0, u1 = laengs==="x" ? t.x1 : t.z1;
          if(a>=u0-0.05&&a<=u1+0.05){hit=true;break;}}
        frei.push(hit?0:1);}
      var best=0,bi=-1,cur=0,ci=-1;
      for(var j=0;j<frei.length;j++){
        if(frei[j]){ if(cur===0)ci=j; cur++; if(cur>best){best=cur;bi=ci;} }
        else cur=0;}
      if(best<2)return null;
      var breite=best*(a1-a0)/n, mitte=a0+(bi+best/2)*(a1-a0)/n;
      return {seite:seite, breite:+breite.toFixed(1), mitte:+mitte.toFixed(1),
              zellen:best+"/"+n, teile:an.length};}
    out.push({was:d, wand:{x:[+wx0.toFixed(1),+wx1.toFixed(1)],z:[+wz0.toFixed(1),+wz1.toFixed(1)]},
              gross:(+(wx1-wx0).toFixed(1))+"x"+(+(wz1-wz0).toFixed(1)),
              mitte:(+((wx0+wx1)/2).toFixed(1))+"|"+(+((wz0+wz1)/2).toFixed(1)),
              luecken:["N","S","O","W"].map(luecke).filter(Boolean)});});
  return out;}`
mitSonden('traumhaus.html', { tuer: sonde }, '_tuer.html')
const { browser, page, jsFehler } = await spielOeffnen('_tuer.html', { warten: 30000 })
const MUSTER = process.argv[2] || '.'
const R = await page.evaluate((m) => window.__th.tuer(m), MUSTER)
await browser.close(); aufraeumen('_tuer.html')
for (const e of R) {
  console.log(`\n${e.was}   Wand ${e.gross} um ${e.mitte}   (x ${e.wand.x[0]}…${e.wand.x[1]}, z ${e.wand.z[0]}…${e.wand.z[1]})`)
  if (!e.luecken.length) console.log('   keine Wandluecke gefunden — allseitig geschlossen')
  for (const l of e.luecken) console.log(`   Luecke ${l.seite}: ${l.breite} m breit, Mitte ${l.mitte}  (${l.zellen} Zellen frei, ${l.teile} Wandteile an der Seite)`)
}
console.log('\nJS-Fehler:', jsFehler.length)
