/* Privater Finanzmonitor: gelesene Cent-Beträge anzeigen, keine Kontozugriffe. */
(function(root){
  'use strict';
  var METRIKEN=['brutto','rabatte','rueckgaben','netto','versand','steuer','umsatz','ware','kostenluecke'];
  var snapshot=null,wahl='gesamt',hosts=[],anzeigeCache=null;
  function tag(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
  function betrag(v){return v===null||(Number.isSafeInteger(v)&&Math.abs(v)<=100000000000);}
  function pruefen(d){
    if(!d||d.version!==1||d.typ!=='privater-finanzmonitor'||!['CHF','EUR','USD'].includes(d.waehrung)||!tag(d.von)||!tag(d.bis)||d.von>d.bis||!Number.isFinite(Date.parse(d.gemessen))||!/(Z|[+-]\d\d:\d\d)$/.test(d.gemessen)||Date.parse(d.gemessen)>Date.now()+300000)throw Error('Finanzbericht oder Zeitraum ungültig.');
    if(Object.keys(d).some(function(k){return !['version','typ','waehrung','von','bis','gemessen','tage','werbung','werbung_vollstaendig','zusatzkosten','quellen'].includes(k);}))throw Error('Unbekannte Berichtsfelder.');
    if(!Array.isArray(d.tage)||!d.tage.length||d.tage.length>3660||!Array.isArray(d.werbung)||d.werbung.length>3660||typeof d.werbung_vollstaendig!=='boolean')throw Error('Tagesdaten fehlen.');
    var gesehen=new Set();
    d.tage.forEach(function(r){
      if(!r||!tag(r.tag)||r.tag<d.von||r.tag>d.bis||gesehen.has(r.tag)||Object.keys(r).some(function(k){return k!=='tag'&&!METRIKEN.includes(k);})||METRIKEN.some(function(k){return !betrag(r[k])||(k!=='ware'&&r[k]===null);}))throw Error('Ungültiger oder doppelter Umsatz-Tag.');
      if(r.brutto+r.rabatte+r.rueckgaben!==r.netto)throw Error('Umsatzbestandteile stimmen nicht überein.');
      gesehen.add(r.tag);
    });
    var anzahl=Math.round((Date.parse(d.bis)-Date.parse(d.von))/86400000)+1;
    if(anzahl!==d.tage.length)throw Error('Der Umsatzzeitraum hat Datenlücken.');
    var ads=new Set();d.werbung.forEach(function(r){if(!r||!tag(r.tag)||r.tag<d.von||r.tag>d.bis||ads.has(r.tag)||!betrag(r.betrag)||r.betrag===null||r.betrag<0||Object.keys(r).some(function(k){return !['tag','betrag'].includes(k);}))throw Error('Werbedaten ungültig.');ads.add(r.tag);});
    if(!d.zusatzkosten||Object.keys(d.zusatzkosten).sort().join(',')!=='fixkosten,gebuehren,versand'||Object.values(d.zusatzkosten).some(function(v){return !betrag(v)||(v!==null&&v<0);}))throw Error('Kostenstatus ungültig.');
    if(!d.quellen||Object.keys(d.quellen).sort().join(',')!=='ads,affiliate,lemon,shopify,stripe'||Object.values(d.quellen).some(function(v){return !['gemessen','nicht_verbunden','nicht_gemessen'].includes(v);})||d.quellen.shopify!=='gemessen')throw Error('Quellenstatus ungültig.');
    return JSON.parse(JSON.stringify(d));
  }
  function importieren(text){if(typeof text!=='string'||text.length>1500000)throw Error('Finanzbericht zu gross.');return pruefen(JSON.parse(text));}
  function datum(d){return d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(0,4);}
  function auswerten(d,filter){
    if(!d)return {geladen:false,umsatz:null,ausgaben:null,gewinn:null,monate:[],zeilen:[]};
    var von=d.von;
    if(filter==='monat')von=d.bis.slice(0,7)+'-01';
    if(filter==='30tage')von=new Date(Date.parse(d.bis)-29*86400000).toISOString().slice(0,10);
    if(von<d.von)von=d.von;
    var tage=d.tage.filter(function(t){return t.tag>=von&&t.tag<=d.bis;}),sum={};
    METRIKEN.forEach(function(k){var a=tage.filter(function(t){return t[k]!==null;});sum[k]=a.length?a.reduce(function(n,t){return n+t[k];},0):null;});
    var ads=d.werbung.filter(function(t){return t.tag>=von&&t.tag<=d.bis;});
    var werbung=ads.length?ads.reduce(function(n,t){return n+t.betrag;},0):d.werbung_vollstaendig?0:null;
    var zusatz=Object.assign({},d.zusatzkosten);if(von!==d.von)Object.keys(zusatz).forEach(function(k){zusatz[k]=null;});
    var posten=[sum.ware,werbung,zusatz.versand,zusatz.gebuehren,zusatz.fixkosten];
    var kosten=posten.some(function(v){return v!==null;})?posten.reduce(function(n,v){return n+(v===null?0:v);},0):null;
    var wareVoll=tage.every(function(t){return t.kostenluecke===0&&(t.netto===0||t.ware!==null);});
    var voll=wareVoll&&d.werbung_vollstaendig&&posten.every(function(v){return v!==null;});
    var gewinn=voll?sum.umsatz-sum.steuer-kosten:null;
    var monate={};tage.forEach(function(t){var m=t.tag.slice(0,7);monate[m]=(monate[m]||0)+t.umsatz;});
    return {geladen:true,von:von,bis:d.bis,umsatz:sum.umsatz,ausgaben:kosten,gewinn:gewinn,vollstaendig:voll,
      warenkosten:sum.ware,werbung:werbung,kostenluecke:sum.kostenluecke,wareVoll:wareVoll,
      zeilen:[['Bruttowarenumsatz',sum.brutto,'Shopify'],['Rabatte',sum.rabatte,'Shopify · bereits berücksichtigt'],['Warenrückgaben',sum.rueckgaben,'Shopify · bereits berücksichtigt'],['Nettowarenumsatz',sum.netto,'Shopify'],['Versandumsatz',sum.versand,'Shopify · Einnahme'],['Steuern',sum.steuer,'Shopify'],['Umsatz gesamt',sum.umsatz,'Shopify · nach Rückgaben, inkl. Steuern'],['Erfasste Warenkosten',sum.ware,wareVoll?'Shopify':'Shopify · unvollständig'],['Gemeldete Werbeausgaben',werbung,d.werbung_vollstaendig?'Werbung vollständig':'Google Ads · weitere Werbung nicht bestätigt'],['Versandkosten',zusatz.versand,'Ausgaben · von Versandumsatz getrennt'],['Zahlungsgebühren',zusatz.gebuehren,'Noch nicht verbunden'],['Laufende Kosten',zusatz.fixkosten,'Noch nicht vollständig erfasst'],['Bekannte Ausgaben',kosten,voll?'Vollständig':'Teilsumme · unvollständig'],['Gewinn nach Kosten',gewinn,voll?'Vor Ertragsteuern':'Nicht berechenbar: Kosten fehlen']],
      monate:Object.keys(monate).sort().map(function(m){return {monat:m,umsatz:monate[m]};})};
  }
  function geld(n,c){return n===null?'Unbekannt':new Intl.NumberFormat('de-CH',{style:'currency',currency:c||'CHF'}).format(n/100);}
  function anzeige(){if(anzeigeCache)return anzeigeCache;var r=auswerten(snapshot,wahl);anzeigeCache={werte:[geld(r.umsatz,snapshot&&snapshot.waehrung),geld(r.ausgaben,snapshot&&snapshot.waehrung),geld(r.gewinn,snapshot&&snapshot.waehrung)],zeitraum:r.geladen?datum(r.von)+' – '+datum(r.bis):'Private Datenquelle noch nicht geladen'};return anzeigeCache;}
  function laden(d){snapshot=pruefen(d);anzeigeCache=null;hosts.filter(function(h){return h.isConnected;}).slice().forEach(function(h){mount(h);});if(typeof document!=='undefined')document.dispatchEvent(new Event('kb-finanz-change'));}
  function mount(el,opt){
    opt=opt||{};if(opt.snapshot){snapshot=pruefen(opt.snapshot);anzeigeCache=null;}
    hosts=hosts.filter(function(h){return h.isConnected||h===el;});if(!hosts.includes(el))hosts.push(el);
    el.replaceChildren();
    function n(tag,text,cls){var a=document.createElement(tag);if(text!=null)a.textContent=text;if(cls)a.className=cls;return a;}
    var r=auswerten(snapshot,wahl),c=snapshot&&snapshot.waehrung||'CHF';
    el.classList.add('kb-finanzmonitor');
    el.appendChild(n('h2','Finanzen auf einen Blick'));
    el.appendChild(n('p',r.geladen?datum(r.von)+' – '+datum(r.bis)+' · '+c+' · Stand '+new Date(snapshot.gemessen).toLocaleString('de-CH'):'Umsatz, Ausgaben und Gewinn werden aus einem privaten Datenbericht angezeigt. Keine Beträge eintippen.','kb-finanz-hinweis'));
    if(snapshot&&Date.now()-Date.parse(snapshot.gemessen)>86400000)el.appendChild(n('p','Datenstand älter als 24 Stunden. Kein Live-Kontostand.','kb-finanz-alt'));
    var nav=n('div',null,'kb-finanz-zeit');
    [['gesamt','Gesamter Zeitraum'],['30tage','Letzte 30 Tage'],['monat',snapshot?new Date(snapshot.bis+'T12:00:00Z').toLocaleDateString('de-CH',{month:'long',year:'numeric'}):'Berichtsmonat']].forEach(function(pair){var b=n('button',pair[1]);b.type='button';b.setAttribute('aria-pressed',String(wahl===pair[0]));b.addEventListener('click',function(){wahl=pair[0];anzeigeCache=null;hosts.filter(function(h){return h.isConnected;}).slice().forEach(function(h){mount(h);});document.dispatchEvent(new Event('kb-finanz-change'));});nav.appendChild(b);});el.appendChild(nav);
    var cards=n('div',null,'kb-finanz-karten');
    [['Erfasster Umsatz',r.umsatz],['Bekannte Ausgaben',r.ausgaben],['Gewinn nach Kosten',r.gewinn]].forEach(function(pair){var a=n('article');a.append(n('span',pair[0]),n('strong',geld(pair[1],c)));if(pair[0]!=='Erfasster Umsatz')a.appendChild(n('small',r.vollstaendig?'Kosten vollständig':pair[0]==='Bekannte Ausgaben'?'Unvollständige Kostensumme':'Kosten fehlen'));cards.appendChild(a);});el.appendChild(cards);
    var wrap=n('div',null,'kb-finanz-tabelle'),table=n('table');table.appendChild(n('caption','Umsatz und Kosten · '+c));var head=n('thead'),tr=n('tr');['Position','Betrag','Quelle / Stand'].forEach(function(v){var th=n('th',v);th.scope='col';tr.appendChild(th);});head.appendChild(tr);table.appendChild(head);var body=n('tbody');
    var zeilen=r.geladen?r.zeilen:[['Umsatz gesamt',null,'Shopify / Zahlungsanbieter nicht geladen'],['Warenkosten',null,'Nicht geladen'],['Werbeausgaben',null,'Nicht geladen'],['Versandkosten',null,'Nicht geladen'],['Zahlungsgebühren',null,'Nicht geladen'],['Laufende Kosten',null,'Nicht geladen'],['Bekannte Ausgaben',null,'Keine vollständige Kostenquelle'],['Gewinn nach Kosten',null,'Ohne vollständige Kosten unbekannt']];
    zeilen.forEach(function(row){var t=n('tr'),th=n('th',row[0]);th.scope='row';th.appendChild(n('small',row[2],'kb-finanz-quelle-mobil'));t.append(th,n('td',geld(row[1],c)),n('td',row[2]));body.appendChild(t);});table.appendChild(body);wrap.appendChild(table);el.appendChild(wrap);
    if(r.monate.length){var chart=n('section',null,'kb-finanz-chart');chart.setAttribute('aria-label','Monatlicher Umsatz');chart.appendChild(n('h3','Umsatz je Monat'));var max=Math.max(1,...r.monate.map(function(m){return Math.abs(m.umsatz);}));r.monate.forEach(function(m){var row=n('div',null,'kb-finanz-balkenzeile');var bar=n('span',null,'kb-finanz-balken');bar.style.width=(100*Math.abs(m.umsatz)/max)+'%';if(m.umsatz<0)bar.classList.add('negativ');var track=n('div',null,'kb-finanz-spur');track.appendChild(bar);row.append(n('span',m.monat),track,n('b',geld(m.umsatz,c)));chart.appendChild(row);});el.appendChild(chart);}
    var quellen=n('details');quellen.appendChild(n('summary','Weitere Projekte und Datenquellen'));
    [['shopify','LuxeStyle / Shopify'],['ads','Google Ads'],['stripe','ABAN / Stripe'],['lemon','Abos / Lemon Squeezy'],['affiliate','Affiliate-Provisionen']].forEach(function(p){var status=snapshot?snapshot.quellen[p[0]]:'nicht_gemessen';quellen.appendChild(n('p',p[1]+': '+(status==='gemessen'?'Daten im Bericht enthalten':status==='nicht_verbunden'?'Nicht verbunden':'Nicht gemessen')));});el.appendChild(quellen);
    el.appendChild(n('p','Summen gelten nur für die enthaltenen Quellen und die gewählte Währung. Rückgaben nicht erneut vom Umsatz abziehen. Auszahlungen sind kein zusätzlicher Umsatz. Ohne vollständige Kosten gibt es keinen belastbaren Gesamtgewinn.','kb-finanz-hinweis'));
    var imports=n('details');imports.appendChild(n('summary','Privaten Datenbericht öffnen'));imports.appendChild(n('p','Einmal eine automatisch erstellte Berichtsdatei auswählen. Kein Abtippen. Die Datei bleibt im Browser und wird nicht hochgeladen.'));
    var file=n('input');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','Privaten Finanzbericht auswählen');var status=n('p');status.setAttribute('role','status');file.addEventListener('change',async function(){if(!file.files.length)return;try{if(file.files[0].size>1500000)throw Error('Bericht zu gross.');laden(importieren(await file.files[0].text()));}catch(e){status.textContent=e.message;}});imports.append(file,status);el.appendChild(imports);
    if(snapshot){var clear=n('button','Private Anzeige leeren');clear.type='button';clear.addEventListener('click',function(){snapshot=null;anzeigeCache=null;hosts.filter(function(h){return h.isConnected;}).slice().forEach(function(h){mount(h);});document.dispatchEvent(new Event('kb-finanz-change'));});el.appendChild(clear);}
  }
  var api={pruefen:pruefen,importieren:importieren,auswerten:auswerten,anzeige:anzeige,laden:laden,mount:mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;if(typeof window!=='undefined')root.KBFinanzen=api;
})(typeof window!=='undefined'?window:globalThis);
