/* Sonde (Runde 97): jedes Schild aus window._uebSchilder gegen seinen Uebergang pruefen.
   Eintrag je Schild (vom Baustein _zebraAllg geschrieben): [x, z, ry, Index des Uebergangs, dx, dz, umgeklappt].
   (dx|dz) = Fahrtrichtung der Spur, der das Schild gilt. Geprueft:
     zugewandt  — die Tafel (+z-Flaeche, Normale (sin ry | cos ry)) zeigt der ankommenden Spur entgegen (Skalarprodukt > 0,9)
     frei       — steht auf keiner Fahrbahn (window._aufStrasse mit 0,35 m Reserve; zweite, unabhaengige Meinung: th-strassen)
     nah        — hoechstens halbe Uebergangsbreite + 3,5 m vom Streifen entfernt
   Dazu: sind ALLE Instanzen gezeichnet (count = Anzahl Eintraege)? Mit zu kleiner Kapazitaet fallen die letzten still weg. */
import { mitSonden, spielOeffnen, aufraeumen } from '/home/user/aban-news-landing/spiele-dev/tools/th-lib.mjs'
const TMP = '_probe_schild_tmp.html'
mitSonden('traumhaus.html', {
  schilder: `function(){var S=window._uebSchilder||[],U=window._uebergaenge||[],out=[];
    S.forEach(function(e){var x=e[0],z=e[1],ry=e[2],u=U[e[3]],dx=e[4],dz=e[5];
      var nx=Math.sin(ry),nz=Math.cos(ry),zu=(nx*(-dx)+nz*(-dz))>0.9;
      var frei=!window._aufStrasse(x,z,0.35),nah=!!u&&Math.hypot(x-u[0],z-u[1])<(u[4]||5)+3.5;
      out.push([x,z,zu,frei,nah,!!e[6],e[3]]);});
    var T=null,P=null;scene.children.forEach(function(o){if(o.isInstancedMesh&&Array.isArray(o.material)&&o.material.length===6)T=o;});
    return {n:S.length,u:U.length,tafeln:T?T.count:-1,kap:T?T.instanceMatrix.count:-1,list:out};}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 30000 })
await page.waitForTimeout(6000)
const r = await page.evaluate(() => window.__th.schilder())
await browser.close(); aufraeumen(TMP)
const falsch = r.list.filter((e) => !(e[2] && e[3] && e[4]))
console.log(`${r.u} Uebergaenge · ${r.n} Schilder · gezeichnete Tafeln ${r.tafeln} (Kapazitaet ${r.kap})${r.tafeln === r.n ? ' ✓' : ' ✗ FEHLEN'}`)
console.log(`zugewandt + frei + nah: ${r.n - falsch.length} · falsch: ${falsch.length} · umgeklappt (auf die andere Streifenseite): ${r.list.filter((e) => e[5]).length}`)
for (const e of falsch) console.log('   ', JSON.stringify(e), '[x,z,zugewandt,frei,nah,umgeklappt,Uebergang]')
