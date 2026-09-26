/* Sonde (Runde 100): stimmt die Lage, mit der das Entfernungs-Ausblenden (lodTakt) rechnet, noch mit der echten?
   node probe-lodlage.mjs [quelle] [vergleich.html]
   `lodAufbau` merkt sich je Kleinteil x/z aus der Weltmatrix — EINMAL. Werden Modelle danach verschoben (entwirren,
   freiRaeumen, Parkbuchten), rechnet lodTakt mit der alten Stelle: an der Kreuzung galten vier Pappeln als 97 m
   entfernt und blieben unsichtbar, obwohl sie 20 m neben der Figur standen (probe-zusammen, Bild „vor").
   Gezaehlt: Eintraege, deren gemerkte Lage > 1 m von der Weltmatrix abweicht, und davon die, die an der Kreuzung
   (78|58) deshalb falsch geschaltet sind (unsichtbar, obwohl nach echter Lage in Reichweite).
   Gegenprobe: ein Eintrag wird kuenstlich um 50 m versetzt — er muss als veraltet gezaehlt werden. */
import { mitSonden, spielOeffnen, aufraeumen, warteAufRuhe } from '../th-lib.mjs'
const [A = 'traumhaus.html', B] = process.argv.slice(2)
async function messe(quelle) {
  const TMP = '_probe_lodlage_tmp.html'
  mitSonden(quelle, {
    kam: `function(x,z,r,b,a){var s=sims[meinSi()]||sims[0];s.x=x;s.z=z;followSim=null;camTx=x;camTz=z;camRT=r;camR=r;camB=b;camA=a;updCam();
      if(typeof lodTakt==="function")lodTakt(x,z);return true;}`,
    lage: `function(gegen){var L=_lodKlein||[],alt=0,falsch=0,bsp=[],sp=spielerPos(),zf=Math.min(1,44/Math.max(24,camR));
      if(gegen&&L.length){L[0]._gx=L[0].x;L[0].x+=50;}
      for(var i=0;i<L.length;i++){var e=L[i],el=e.m.matrixWorld.elements,d=Math.hypot(el[12]-e.x,el[14]-e.z);
        if(d>1){alt++;
          var echt=Math.hypot(el[12]-sp.x,el[14]-sp.z),grenze=e.mittel?130:(e.nah?34*zf:78*zf);
          if(!e.m.visible&&echt<grenze){falsch++;if(bsp.length<6){var w=e.m;while(w.parent&&w.parent.type!=="Scene")w=w.parent;
            bsp.push(((w.userData&&w.userData.datei)||w.type)+" versetzt "+d.toFixed(1)+" m, echt "+echt.toFixed(0)+" m weg");}}}}
      if(gegen&&L.length){L[0].x=L[0]._gx;}
      return {n:L.length,alt:alt,falsch:falsch,bsp:bsp};}`
  }, TMP)
  const { browser, page } = await spielOeffnen(TMP, { warten: 60000 })
  await warteAufRuhe(page, { minSekunden: 150 }); await page.waitForTimeout(12000)
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__th.kam(78, 58, 44, 0.78, 0.8)); await page.waitForTimeout(1500) }
  const r = await page.evaluate(() => window.__th.lage(false)), g = await page.evaluate(() => window.__th.lage(true))
  await browser.close(); aufraeumen(TMP)
  return { r, g }
}
for (const q of [A, B].filter(Boolean)) {
  const { r, g } = await messe(q)
  console.log(`${q}: ${r.n} Kleinteile im LOD · gemerkte Lage veraltet (> 1 m): ${r.alt} · an der Kreuzung deshalb faelschlich unsichtbar: ${r.falsch}`)
  r.bsp.forEach((b) => console.log('   ' + b))
  console.log(`   Gegenprobe (ein Eintrag um 50 m versetzt): veraltet ${g.alt} (erwartet ${r.alt + 1}) ${g.alt === r.alt + 1 ? '✓' : '✗ MESSGERAET TAUGT NICHT'}`)
}
