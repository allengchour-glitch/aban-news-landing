/* th-rand.mjs — Wie sieht der Rand des eigenen Grundstuecks aus?
 *
 * WOZU. Der User sagt: „in mitte gefaellt mir nicht die objekten rundum" und hat auf
 * zwei Bildern benannt, was gemeint ist — der Heckenwall und der graue Ring samt
 * Auffahrt. „Gefaellt mir nicht" ist Geschmack; damit laesst sich nicht arbeiten.
 * Dieses Werkzeug uebersetzt es in Zahlen, die man vorher und nachher vergleichen kann:
 *
 *   1. Wie GLEICHFOERMIG ist die Hecke? Laengste ununterbrochene Reihe, Hoehenspanne,
 *      Zahl verschiedener Pflanzenmodelle am Rand.
 *   2. Wie viel GRAUE VERSIEGELUNG liegt um das Baufenster? In Quadratmetern.
 *
 * ⚠️ UND ZWEI GEGENPROBEN, ohne die eine Verbesserung der Optik den Zweck zerstoert:
 *   a) Die Grenze muss LESBAR bleiben. Das Baugitter sieht man nur im Baumodus —
 *      ohne sichtbaren Rand steht man vor einer Wiese und weiss nicht, wo man bauen
 *      darf. Gemessen als GROESSTE LUECKE in der Heckenreihe.
 *   b) Im Baufenster selbst darf nichts stehen, sonst blockiert es das Bauen.
 *
 * ⚠️ INSTANZEN-FALLE (im Projekt dreimal zugeschlagen): die Hecke liegt in
 * InstancedMesh-Gruppen, und `userData.datei` haengt am Container, dessen Weltposition
 * der Ursprung ist. Wer die ausliest, bekommt die halbe Welt als „steht am Rand".
 * Darum wird jede Instanz-MATRIX einzeln ausgelesen. Und weil ein Modul aus mehreren
 * Teilnetzen besteht, wird nach Position entdoppelt — sonst zaehlt dieselbe Pflanze
 * sechsmal.
 *
 * Aufruf:  node spiele-dev/tools/th-rand.mjs
 */
import { spielOeffnen, mitSonden, aufraeumen } from './th-lib.mjs'

const TMP = 'spiele-dev/tools/_rand_probe.html'
mitSonden('traumhaus.html', {
  rand: `function(){
    /* Das Baufenster ist BAUW x BAUH Zellen a CS Metern, der Rand liegt knapp
       ausserhalb. Die Masse kommen AUS DER WELT, nicht aus dem Test — ruecken die
       Grenzen, folgt das Werkzeug. */
    var BW=BAUW*CS/2+3, BH=BAUH*CS/2+3;
    var innen=[], grau=[], pflanzen={}, imFenster=[];
    function amRand(x,z){
      var dx=Math.abs(Math.abs(x)-(BW+2.4)), dz=Math.abs(Math.abs(z)-(BH+2.4));
      return (dx<3.5 && Math.abs(z)<BH+4) || (dz<3.5 && Math.abs(x)<BW+4);
    }
    var M=new THREE.Matrix4(),P=new THREE.Vector3(),Q=new THREE.Quaternion(),S=new THREE.Vector3();
    var gesehen={};
    scene.traverse(function(o){
      if(o.isInstancedMesh){
        /* ⚠️ NACH GRUPPEN GETRENNT, NICHT IN EINEN TOPF. Am Rand stehen mehrere
           Instanz-Gruppen (Hecke, Zaeune der Nachbarn, Poller). Zusammengezaehlt
           ergaben sie 226 „Pflanzen" bei 98 Heckenplaetzen — und der 11,5 m breite
           Zugang im Norden verschwand, weil andere Gruppen ihn auffuellten. Eine
           Gesamtzahl verdeckt genau das, was man sehen will. */
        var gruppe=o.geometry.uuid;
        for(var i=0;i<o.count;i++){
          o.getMatrixAt(i,M); M.premultiply(o.matrixWorld); M.decompose(P,Q,S);
          if(!amRand(P.x,P.z))continue;
          /* ⚠️ ENTDOPPELN IM RASTER, NICHT NACH EXAKTER POSITION. Ein Heckenmodul
             besteht aus SECHS Teilnetzen, jedes mit eigenem lokalem Versatz — ihre
             Weltpositionen unterscheiden sich um Zentimeter. Die erste Fassung
             entdoppelte auf 0,1 m genau und zaehlte jede Pflanze sechsmal: 579 statt
             98, und eine „laengste Reihe" von 185 bei 98 vorhandenen Plaetzen. Eine
             Zahl, die groesser ist als das Ganze, ist ein Messfehler. */
          var k=Math.round(P.x/1.5)+'|'+Math.round(P.z/1.5);
          if(gesehen[k])continue; gesehen[k]=1;
          innen.push({x:+P.x.toFixed(2),z:+P.z.toFixed(2),h:+(S.y).toFixed(3),g:gruppe});
        }
        return;
      }
      if(!o.isMesh||!o.geometry)return;
      /* Flache graue Flaechen im Grundstuecksbereich = Versiegelung. */
      o.getWorldPosition(P);
      if(P.y>0.35)return;
      if(Math.abs(P.x)>BW+8||Math.abs(P.z)>BH+8)return;
      var g=o.geometry.parameters||{}, a=0;
      if(o.geometry.type==='PlaneGeometry'&&g.width) a=g.width*g.height;
      else if(o.geometry.type==='BoxGeometry'&&g.width) a=g.width*g.depth;
      if(!a)return;
      o.getWorldScale(S); a*=Math.abs(S.x*S.z);
      /* ⚠️ DIE WELT-UEBERLAGERUNGEN LIEGEN IM URSPRUNG — und damit mitten im
         Grundstueck. Rasen-Ebene (460x460), Fern-Ebene (600x600) und Wolkenschatten
         (760x760) sind bei (0|0) zentriert und rutschten durch den Filter: die erste
         Messung meldete 1'195'677 m² Versiegelung auf 4'212 m² Grundstueck. Wer nach
         dem MITTELPUNKT filtert, erwischt jede Flaeche, die zufaellig dort zentriert
         ist. Also: was groesser ist als das Grundstueck, ist keine Versiegelung DES
         Grundstuecks.
         ⚠️ UND KEIN TEXTUR-FILTER. Hier stand einmal „was eine Textur traegt, ist
         Boden, kein Belag" — damit verschwand ausgerechnet der gepflasterte Rundweg
         (197 m² je Seite) aus der Liste, denn sein Beton hat eine Textur. Die
         Groessenregel allein sortiert die Welt-Ebenen schon aus. */
      if(a>(2*BW)*(2*BH))return;
      var c=(o.material&&o.material.color)?o.material.color:null;
      if(!c)return;
      var mx=Math.max(c.r,c.g,c.b), mn=Math.min(c.r,c.g,c.b);
      var satt=mx>0?(mx-mn)/mx:0;
      if(mx<0.45||satt>0.25)return;             /* nur helle, fast farblose Flaechen */
      grau.push({a:Math.round(a), f:'#'+c.getHexString(), x:+P.x.toFixed(1), z:+P.z.toFixed(1)});
    });
    /* Was steht als MODELL am Rand, und was im Baufenster? */
    (window._gebaeude||[]).forEach(function(w){
      var d=w.userData&&w.userData.datei; if(!d)return;
      w.getWorldPosition(P);
      if(amRand(P.x,P.z)) pflanzen[d]=(pflanzen[d]||0)+1;
      if(Math.abs(P.x)<BW-3&&Math.abs(P.z)<BH-3) imFenster.push(d+' ('+P.x.toFixed(0)+'|'+P.z.toFixed(0)+')');
    });
    return {BW:BW,BH:BH,stellen:innen,grau:grau,pflanzen:pflanzen,imFenster:imFenster};
  }`
}, TMP)

const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 45000 })
const R = await page.evaluate(() => window.__th.rand())
await browser.close()
aufraeumen(TMP)

/* ---- Auswertung ---- */
const S = R.stellen
if (!S.length) { console.log('❌ 0 Randobjekte gefunden — das kann nicht sein, Messgeraet pruefen'); process.exit(1) }

/* ⚠️ NUR DIE GROESSTE GRUPPE IST DIE HECKE. Alles andere am Rand (Zaeune, Poller)
   gehoert nicht in dieselbe Rechnung — sonst misst man die Hecke durch fremde Objekte
   hindurch. Die uebrigen Gruppen werden trotzdem genannt, damit nichts still
   verschwindet. */
const nachGruppe = {}
for (const p of S) (nachGruppe[p.g] = nachGruppe[p.g] || []).push(p)
const gruppen = Object.values(nachGruppe).sort((a, b) => b.length - a.length)
const hecke = gruppen[0]
console.log(`\nInstanz-Gruppen am Rand: ${gruppen.map(g => g.length).join(' + ')} = ${S.length} Stueck`)

/* Reihen: die vier Seiten getrennt, je nach Laengsrichtung sortiert. */
const seiten = { nord: [], sued: [], west: [], ost: [] }
for (const p of hecke) {
  if (Math.abs(p.z) > R.BH) (p.z > 0 ? seiten.nord : seiten.sued).push(p)
  else (p.x > 0 ? seiten.ost : seiten.west).push(p)
}
let groessteLuecke = 0, laengsteReihe = 0, luecken = 0, zugangBreite = 0
for (const [name, arr] of Object.entries(seiten)) {
  const quer = (name === 'nord' || name === 'sued')
  arr.sort((a, b) => (quer ? a.x - b.x : a.z - b.z))
  let reihe = 1
  for (let i = 1; i < arr.length; i++) {
    const d = quer ? arr[i].x - arr[i - 1].x : arr[i].z - arr[i - 1].z
    /* ⚠️ DER ZUGANG IM NORDEN IST GEWOLLT, KEIN FEHLER. Bei x ≈ 0 laesst die Welt
       die Hecke absichtlich aus (`if(Math.abs(hx)>5)`), sonst kaeme man nicht auf sein
       eigenes Grundstueck. Die erste Fassung zaehlte diese 9-Meter-Oeffnung als
       groesste Luecke und meldete die UNVERAENDERTE Welt als „Grenze nicht lesbar".
       Wer dem geglaubt haette, haette sich die eigene Einfahrt zugepflanzt — genau
       die Falle aus Lehre 3 des Projektgedaechtnisses. */
    if (name === 'nord' && arr[i - 1].x < 0 && arr[i].x > 0) { zugangBreite = d; continue }
    if (d > 3.0) { luecken++; if (d > groessteLuecke) groessteLuecke = d; if (reihe > laengsteReihe) laengsteReihe = reihe; reihe = 1 }
    else reihe++
  }
  if (reihe > laengsteReihe) laengsteReihe = reihe
}
const hoehen = hecke.map(p => p.h)
const hMin = Math.min(...hoehen), hMax = Math.max(...hoehen)
const grauFlaeche = R.grau.reduce((s, g) => s + g.a, 0)
const arten = Object.keys(R.pflanzen)

console.log(`\n🌿 TH-RAND · Baufenster ${(R.BW * 2).toFixed(0)} x ${(R.BH * 2).toFixed(0)} m`)
console.log(`Hecke (groesste Gruppe): ${hecke.length} Module`)
console.log(`  laengste ununterbrochene Reihe: ${laengsteReihe} Module am Stueck`)
console.log(`  Luecken (> 3 m): ${luecken} · groesste ${groessteLuecke.toFixed(1)} m · ` +
  `Zugang im Norden ${zugangBreite.toFixed(1)} m (gewollt, zaehlt nicht mit)`)
console.log(`  Hoehenspanne: ${hMin.toFixed(2)} … ${hMax.toFixed(2)} (Faktor ${(hMax / hMin).toFixed(2)})`)
console.log(`  verschiedene Modelle am Rand: ${arten.length}${arten.length ? ' (' + arten.join(', ') + ')' : ''}`)
console.log(`\n🩶 Graue Versiegelung ums Baufenster: ${grauFlaeche} m² in ${R.grau.length} Flaechen`)
R.grau.sort((a, b) => b.a - a.a).slice(0, 6).forEach(g => console.log(`   ${String(g.a).padStart(5)} m²  ${g.f}  bei (${g.x}|${g.z})`))

console.log(`\n🔍 GEGENPROBEN`)
const lesbar = groessteLuecke <= 8
console.log(`   Grenze lesbar (groesste Luecke ≤ 8 m): ${lesbar ? '✅' : '❌'} ${groessteLuecke.toFixed(1)} m`)
const frei = R.imFenster.length === 0
console.log(`   Baufenster frei: ${frei ? '✅ nichts drin' : '❌ ' + R.imFenster.slice(0, 5).join(', ')}`)
console.log(`JS-Fehler: ${jsFehler.length ? jsFehler.slice(0, 2).join(' | ') : 'keine'}`)
process.exit(lesbar && frei ? 0 : 1)
