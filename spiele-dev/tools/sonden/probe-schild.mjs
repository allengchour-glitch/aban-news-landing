/* Sonde: je Schild Lage und Tafel-Normale gegen die Fahrtrichtung der Spur, auf der es steht (Lane-Tabelle). */
import { mitSonden, spielOeffnen, aufraeumen } from '/home/user/aban-news-landing/spiele-dev/tools/th-lib.mjs'
const TMP = '_probe_schild_tmp.html'
mitSonden('traumhaus.html', {
  schilder: `function(){var out=[];var T=null;scene.children.forEach(function(o){if(o.isInstancedMesh&&o.instanceMatrix.count===80&&Array.isArray(o.material))T=o;});
    if(!T)return "keine Tafeln";var M=new THREE.Matrix4(),p=new THREE.Vector3(),n=new THREE.Vector3();
    var U=window._uebergaenge||[];
    for(var i=0;i<T.count;i++){T.getMatrixAt(i,M);p.setFromMatrixPosition(M);n.set(0,0,1).transformDirection(M);
      /* Zuordnung ueber die Geometrie: laengs der Streifenachse 3,2 m, quer dazu hb+0,76 — der NAECHSTE
         Uebergang war an T-Einmuendungen der falsche (zwei Uebergaenge 12 m auseinander, Schild dazwischen). */
      var u=null,bd=1e9;U.forEach(function(q){var ax=q[2]?Math.abs(p.x-q[0]):Math.abs(p.z-q[1]),ac=q[2]?Math.abs(p.z-q[1]):Math.abs(p.x-q[0]);
        var d=Math.abs(ax-3.2)+Math.abs(ac-(q[4]+0.76));if(d<bd){bd=d;u=q;}});
      if(!u||bd>0.5)continue;var quer=u[2],dx=p.x-u[0],dz=p.z-u[1];
      /* Rechtsverkehr: Strasse laengs x: Spur bei +z faehrt +x (kommt von -x). Strasse laengs z: Spur bei +x faehrt -z (kommt von +z). */
      var kommtVon=quer?(dz>0?-1:1):(dx>0?1:-1);   /* Vorzeichen der Achse, aus der der Verkehr kommt */
      var vor=quer?Math.sign(dx)===kommtVon:Math.sign(dz)===kommtVon;   /* Schild VOR dem Streifen aus Fahrersicht */
      var blick=quer?Math.sign(n.x)===kommtVon:Math.sign(n.z)===kommtVon; /* Tafel schaut dem Verkehr entgegen */
      var aufWeg=!!(window._aufViertelWeg&&window._aufViertelWeg(p.x,p.z,0.35));
      var RX9=(typeof RX!=="undefined")?RX:78;
      var aufHaupt=(Math.abs(Math.abs(p.z)-58)<8.3&&Math.abs(p.x)<RX9+30)||(Math.abs(Math.abs(p.x)-RX9)<5.3&&Math.abs(p.z)<80);
      out.push([+p.x.toFixed(1),+p.z.toFixed(1),quer,blick,!(aufWeg||aufHaupt)]);}
    return out;}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(6000)
const r = await page.evaluate(() => window.__th.schilder())
await browser.close(); aufraeumen(TMP)
if (typeof r === 'string') { console.log(r); process.exit(1) }
const falsch = r.filter(e => !(e[3] && e[4]))
console.log(`${r.length} Schilder zugeordnet · dem Verkehr zugewandt UND auf keiner Fahrbahn: ${r.length - falsch.length} · falsch: ${falsch.length}`)
for (const e of falsch) console.log('   ', JSON.stringify(e), '[x,z,quer,zumVerkehr,keineFahrbahn]')
