/**
 * th-belag.mjs — flaches Strassenzubehoer, das in eine FREMDE Fahrbahn ragt.
 *
 * ⚠️ WOZU. th-strassen prueft `bandVon(o.position.x, o.position.z)` — also den
 * MITTELPUNKT eines Objekts. Ein 106 m langer Bordstein laengs der Querstrasse hat
 * seinen Mittelpunkt bei z = 0, mitten im Feld, und faellt damit durch; ausserdem
 * greift dort der `gr > 60`-Filter (Himmelskuppel, zusammengefasste Zeilen).
 * Beides zusammen macht genau die Bauteile unsichtbar, die per Konstruktion lang
 * und duenn sind: Bordsteine, Erdstreifen, Gehwege, Randmarkierungen.
 *
 * Dieses Werkzeug testet darum die AUSDEHNUNG statt der Position, und zwar nur fuer
 * lange, duenne, flache Teile (Schmalseite <= 3 m, Langseite >= 20 m, Oberkante
 * <= 1 m). Es meldet, wie weit so ein Band in die Belagsflaeche einer Strasse ragt,
 * die QUER zu ihm liegt — laengs ist erlaubt, dort gehoert es hin.
 *
 * Aufruf:  node spiele-dev/tools/th-belag.mjs
 */
import { mitSonden, spielOeffnen, aufraeumen } from './th-lib.mjs'

const sonde = `function(){
  /* Fahrbahnen als Rechtecke: Mitte, halbe Belagsbreite, Anfang und Ende laengs */
  var B=[{n:"Hauptstrasse Nord", a:"z",c: 58,h:8.05,von:-102,bis:102},
         {n:"Hauptstrasse Sued", a:"z",c:-58,h:8.05,von:-102,bis:102},
         {n:"Querstrasse Ost",   a:"x",c: 78,h:5.05,von:-69,bis:69},
         {n:"Querstrasse West",  a:"x",c:-78,h:5.05,von:-69,bis:69}];
  var T=[],bb=new THREE.Box3();
  scene.traverse(function(o){
    if(!o.isMesh||!o.geometry)return;
    bb.setFromObject(o);
    var bw=bb.max.x-bb.min.x, bd=bb.max.z-bb.min.z;
    if(Math.min(bw,bd)>3||Math.max(bw,bd)<20)return;    /* nur lange, duenne Baender */
    if(bb.max.y>1)return;                               /* nur flaches Zubehoer */
    var laengsX = bw>bd;                                /* laeuft in x oder in z? */
    for(var i=0;i<B.length;i++){var b=B[i];
      /* Nur QUER liegende Baender koennen hineinragen. Ein Band laengs der Strasse
         gehoert dorthin (Gehweg, Randlinie) und wird nicht gemeldet. */
      if((b.a==="z")===laengsX)continue;
      var lo=(b.a==="z")?bb.min.z:bb.min.x, hi=(b.a==="z")?bb.max.z:bb.max.x;
      var qlo=(b.a==="z")?bb.min.x:bb.min.z, qhi=(b.a==="z")?bb.max.x:bb.max.z;
      if(qhi<b.von||qlo>b.bis)continue;                 /* nicht auf der Laenge der Strasse */
      var tief=Math.min(hi,b.c+b.h)-Math.max(lo,b.c-b.h);
      if(tief<=0.1)continue;                     /* 0,05 m ist exaktes Anstossen, kein Fehler */
      T.push({band:b.n, tief:+tief.toFixed(2),
              was:o.geometry.type+" "+(+bw.toFixed(2))+"x"+(+bd.toFixed(2)),
              bei:(+((bb.min.x+bb.max.x)/2).toFixed(1))+"|"+(+((bb.min.z+bb.max.z)/2).toFixed(1)),
              reicht:(+lo.toFixed(2))+" … "+(+hi.toFixed(2)),
              kante:(b.c>0?(b.c-b.h):(b.c+b.h))});}});
  T.sort(function(a,b){return b.tief-a.tief;});
  return T;}`

mitSonden('traumhaus.html', { belag: sonde }, '_belag.html')
const { browser, page, jsFehler } = await spielOeffnen('_belag.html', { warten: 25000 })
const T = await page.evaluate(() => window.__th.belag())
await browser.close()
aufraeumen('_belag.html')

if (!T.length) console.log('✅ Kein flaches Belagsteil ragt in eine fremde Fahrbahn.')
for (const t of T)
  console.log(`⚠️  ${t.tief.toFixed(2)} m in ${t.band} (Kante ${t.kante})  ${t.was}  Mitte ${t.bei}  reicht ${t.reicht}`)
console.log(`\n${T.length} Treffer · JS-Fehler: ${jsFehler.length}`)
