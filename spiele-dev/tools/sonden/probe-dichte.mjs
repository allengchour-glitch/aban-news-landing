/* Messgeraet: Objektdichte je 40-m-Zelle (window._gebaeude + Strassenzellen), Welt +-460. */
import { mitSonden, spielOeffnen, aufraeumen } from '../th-lib.mjs'
const TMP = '_probe_dichte_tmp.html'
mitSonden('traumhaus.html', {
  dichte: `function(){var C=40,H=460,N=Math.ceil(2*H/C),Z={},S={};
    (window._gebaeude||[]).forEach(function(w){var x=w.position.x,z=w.position.z;if(Math.abs(x)>H||Math.abs(z)>H)return;
      var k=Math.floor((x+H)/C)+","+Math.floor((z+H)/C);Z[k]=(Z[k]||0)+1;});
    var K=window._KORRIDORE||[];
    function strasse(x,z){for(var i=0;i<K.length;i++){var k=K[i],l=k[1]==="x";var a=l?x:z,q=l?z:x;
        if(a>=k[3]&&a<=k[4]&&Math.abs(q-k[2])<k[5])return true;}
      var r=Math.hypot(x,z);if(Math.abs(r-200)<4.5)return true;
      var B=window._viertelBaender?window._viertelBaender():[];for(var j=0;j<B.length;j++){var b=B[j];var qq=b.a==="z"?z:x,ll=b.a==="z"?x:z;if(Math.abs(qq-b.c)<b.h&&ll>b.von&&ll<b.bis)return true;}
      return false;}
    var rows=[];for(var j=0;j<N;j++){var row="";for(var i=0;i<N;i++){var k=i+","+j,n=Z[k]||0;
      var cx=-H+(i+0.5)*C,cz=-H+(j+0.5)*C;var st=strasse(cx,cz)||strasse(cx-15,cz)||strasse(cx+15,cz)||strasse(cx,cz-15)||strasse(cx,cz+15);
      var wasser=window.imWasser?window.imWasser(cx,cz):false;var berg=window._bergHoehe?window._bergHoehe(cx,cz):0;
      row+=wasser?"~":berg>8?"^":n===0?(st?"=":"."):n<4?"1":n<12?"2":n<30?"3":"#";}rows.push(row);}
    return {N:N,C:C,H:H,rows:rows,gesamt:(window._gebaeude||[]).length};}`
}, TMP)
const { browser, page } = await spielOeffnen(TMP, { warten: 60000 })
const r = await page.evaluate(() => window.__th.dichte())
await browser.close(); aufraeumen(TMP)
console.log(`Objekte gesamt ${r.gesamt} · Zelle ${r.C} m · Welt +-${r.H} (Zeile = z von -${r.H}, Spalte = x von -${r.H})`)
console.log('Legende: . leer  = Strasse ohne Objekte  1 <4  2 <12  3 <30  # >=30  ~ Wasser  ^ Berg')
r.rows.forEach((row, j) => console.log(String(-r.H + j * r.C).padStart(5) + ' ' + row))
