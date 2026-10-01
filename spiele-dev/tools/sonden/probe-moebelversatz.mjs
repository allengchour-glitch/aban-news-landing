/* Sonde (Runde 101): steht das Moebelmodell auf seiner Belegung?
   furnCells belegt bei gerader Groesse (2x1, 2x2, 1x2) die Zellen gx … gx+1, gebaut wird das Modell
   aber auf der Mitte der ANKERzelle cx(gx). Gemessen wird je Katalog-Eintrag (ohne Autos und Hund),
   in Drehung 0 und 1: Huellbox des fertigen Modells gegen das Rechteck der belegten Zellen.
     versatz   — Mitte der Huellbox minus Mitte der Belegung (m), x und z
     ueber     — wie weit das Modell ueber die Belegung hinausragt (m, groesste Seite)
   Gegenprobe: ein 1x1-Eintrag, kuenstlich um 1 m verschoben, muss als Versatz gemeldet werden.
   Aufruf: node spiele-dev/tools/sonden/probe-moebelversatz.mjs */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_moebelversatz_tmp.html'
mitSonden('traumhaus.html', {
  mvSetzen: `function(){var gx=BAUX0+(BAUW>>1),gy=BAUY0+(BAUH>>1),n=0;
    for(var k in KATALOG)KATALOG[k].forEach(function(d){if(d.car||d.pet||d.paint||/^(wand|fenster|tuer|boden)/.test(d.id))return;   /* Bauwerkzeuge haben kein Modell */
      [0,1].forEach(function(r){applyFurn(d.id,gx,gy,r,"mv_"+d.id+"_"+r);n++;});});
    return {gx:gx,gy:gy,n:n};}`,
  mvMessen: `function(schieben){var out=[],offen=0,fehlt=[];
    furn.forEach(function(f){if(!f.fid||f.fid.indexOf("mv_")!==0)return;
      if(!f.mesh){offen++;fehlt.push(f.id);return;}
      if(schieben&&f.fid===schieben){f.mesh.position.x+=1;f.mesh.updateMatrix();} /* eingefroren: lokale Matrix selbst nachziehen */
      f.mesh.updateMatrixWorld(true);
      var bb=new THREE.Box3().setFromObject(f.mesh);if(bb.isEmpty()){offen++;return;}
      var cs=furnCells(f),x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
      cs.forEach(function(c){x0=Math.min(x0,cx(c[0])-CS/2);x1=Math.max(x1,cx(c[0])+CS/2);z0=Math.min(z0,cz(c[1])-CS/2);z1=Math.max(z1,cz(c[1])+CS/2);});
      var vx=(bb.min.x+bb.max.x)/2-(x0+x1)/2,vz=(bb.min.z+bb.max.z)/2-(z0+z1)/2;
      var ue=Math.max(x0-bb.min.x,bb.max.x-x1,z0-bb.min.z,bb.max.z-z1,0);
      var s=f.def.size||[1,1];
      out.push({id:f.id,rot:f.rot,w:s[0],d:s[1],vx:+vx.toFixed(2),vz:+vz.toFixed(2),ue:+ue.toFixed(2),
        bx:+(bb.max.x-bb.min.x).toFixed(2),bz:+(bb.max.z-bb.min.z).toFixed(2)});});
    return {offen:offen,fehlt:fehlt,list:out};}`
}, TMP)
const { browser, page, jsFehler } = await spielOeffnen(TMP, { warten: 30000 })
const s = await page.evaluate(() => window.__th.mvSetzen())
let r
for (let i = 0; i < 40; i++) { await page.waitForTimeout(1500); r = await page.evaluate(() => window.__th.mvMessen()); if (!r.offen) break }
/* Gegenprobe: erster 1x1-Eintrag um 1 m verschieben */
const eins = r.list.find((e) => e.w === 1 && e.d === 1 && e.rot === 0)
const g = eins ? await page.evaluate((fid) => window.__th.mvMessen(fid), `mv_${eins.id}_0`) : null
await browser.close(); aufraeumen(TMP)
console.log(`gesetzt ${s.n} an Zelle (${s.gx}|${s.gy}) · nicht geladen ${r.offen}${r.offen ? ' (' + [...new Set(r.fehlt)].join(', ') + ')' : ''} · JS-Fehler ${jsFehler.length}`)
const gerade = r.list.filter((e) => e.w % 2 === 0 || e.d % 2 === 0)
const ungerade = r.list.filter((e) => !(e.w % 2 === 0 || e.d % 2 === 0))
const v = (e) => Math.hypot(e.vx, e.vz)
const zeile = (e) => `  ${e.id.padEnd(18)} ${e.w}x${e.d} r${e.rot}  Versatz ${String(e.vx).padStart(5)} | ${String(e.vz).padStart(5)} m  ragt ${e.ue} m  Box ${e.bx}×${e.bz}`
console.log(`\nGERADE Groesse (${gerade.length} Faelle): Versatz > 0,3 m bei ${gerade.filter((e) => v(e) > 0.3).length}, ragt > 0,3 m ueber die Belegung bei ${gerade.filter((e) => e.ue > 0.3).length}`)
gerade.sort((a, b) => v(b) - v(a)).forEach((e) => console.log(zeile(e)))
console.log(`\nUNGERADE Groesse (${ungerade.length} Faelle): Versatz > 0,3 m bei ${ungerade.filter((e) => v(e) > 0.3).length}, ragt > 0,3 m bei ${ungerade.filter((e) => e.ue > 0.3).length}`)
ungerade.filter((e) => v(e) > 0.3 || e.ue > 0.3).sort((a, b) => b.ue - a.ue).forEach((e) => console.log(zeile(e)))
if (g && eins) {
  const e2 = g.list.find((e) => e.id === eins.id && e.rot === 0)
  console.log(`\nGegenprobe: ${eins.id} um 1 m verschoben → Versatz ${e2.vx} m ${Math.abs(e2.vx - eins.vx - 1) < 0.05 ? '✓ erkannt' : '✗ NICHT erkannt'}`)
}
