
document.addEventListener('DOMContentLoaded',function(){
  try{
    var wurzel=document.querySelector('.product-details, .product__description, [data-product-description], .rte');
    if(!wurzel) return;
    // ⚠️ CH-Lager-Seiten haben schon ein Lieferdatum-Widget am Kauf-Knopf («Lieferung
    // voraussichtlich 16.–18. Aug»). Zwei Datumszusagen auf einer Seite verwirren — dann
    // gilt die bestehende, besser platzierte (15.08.2026).
    if(/Lieferung voraussichtlich/.test(document.body.textContent||'')) return;
    // ⚠️ ALLE Angaben einsammeln und die KONSERVATIVSTE nehmen (15.08.2026): der erste
    // Treffer war beim Geschenkbox-Test «7–14 Tage» aus einem Nebensatz, während der
    // Lieferblock «8–16 Werktage» sagt — die Box versprach schneller, als das Produkt
    // liefern kann. Ein zu frühes Datum ist schlimmer als gar keines.
    var alle=[...(wurzel.textContent||'').matchAll(/(\d+)\s*[\u2013\u2014-]\s*(\d+)\s*(Werktage|Tage)/g)]
      .map(function(x){return {lo:parseInt(x[1],10),hi:parseInt(x[2],10),werk:x[3]==='Werktage'};})
      .filter(function(x){return x.lo>0&&x.hi>=x.lo&&x.hi<60;});
    if(!alle.length) return;
    alle.sort(function(a,b){return (b.hi*(b.werk?1.4:1))-(a.hi*(a.werk?1.4:1));});
    var lo=alle[0].lo, hi=alle[0].hi, werk=alle[0].werk;
    if(!(lo>0&&hi>=lo&&hi<60)) return;
    function plus(n){var d=new Date();var s=0;while(s<n){d.setDate(d.getDate()+1);var w=d.getDay();if(!werk||(w!==0&&w!==6))s++;}return d;}
    var T=['So','Mo','Di','Mi','Do','Fr','Sa'],M=['Jan','Feb','März','Apr','Mai','Juni','Juli','Aug','Sep','Okt','Nov','Dez'];
    function f(d){return T[d.getDay()]+', '+d.getDate()+'. '+M[d.getMonth()];}
    var a=plus(lo+1),b=plus(hi+1);
    var box=document.createElement('div');
    box.className='ls-lieferdatum';
    box.style.cssText='margin:10px 0;padding:9px 13px;border-radius:10px;font-size:.95em;'
      +(hi<=2?'background:#eefaf0;border:1px solid #cdeed4':'background:#f4f6fb;border:1px solid #dde3ef');
    box.innerHTML='📦 Voraussichtliche Lieferung: <strong>'+f(a)+' – '+f(b)+'</strong>'
      +' <span style="opacity:.7">(bei Bestellung heute)</span>';
    var ziel=wurzel.querySelector('.ls-liefer')||wurzel.firstElementChild;
    if(ziel&&ziel.parentNode) ziel.parentNode.insertBefore(box,ziel);
    else wurzel.insertBefore(box,wurzel.firstChild);
  }catch(e){}
});
