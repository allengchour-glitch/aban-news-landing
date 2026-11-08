/* Geldplan: Cent-Rechnung und private Eingaben im Tab, ohne Netzwerk oder automatische dauerhafte Ablage. */
(function(root){
  'use strict';
  var FELDER=[['einnahmen','Einnahmen ohne Umsatzsteuer'],['erstattungen','Erstattungen'],['ware','Waren- / Leistungskosten'],['versand','Versandkosten'],['gebuehren','Zahlungsgebühren'],['werbung','Werbung'],['fixkosten','Laufende Kosten'],['ruecklage','Geplante Rücklage']];
  var KOSTEN=['ware','versand','gebuehren','werbung','fixkosten'];
  var WAEHRUNGEN=['CHF','EUR','USD'];
  function cent(text){
    if(text==null||String(text).trim()==='')return null;
    var s=String(text).trim();
    if(!/^\d{1,9}(?:[.,]\d{1,2})?$/.test(s))throw Error('Bitte einen positiven Betrag oder 0 mit höchstens zwei Nachkommastellen eingeben, ohne Tausenderzeichen.');
    var p=s.replace(',','.').split('.');return Number(p[0])*100+Number(((p[1]||'')+'00').slice(0,2));
  }
  function berechnen(werte){
    var n={},fehlend=[];
    FELDER.forEach(function(f){try{n[f[0]]=cent(werte[f[0]]);}catch(e){throw Error(f[1]+': '+e.message);}if(n[f[0]]===null)fehlend.push(f[1]);});
    var kosten=KOSTEN.reduce(function(s,k){return s+(n[k]===null?0:n[k]);},0);
    var netto=n.einnahmen!==null&&n.erstattungen!==null?n.einnahmen-n.erstattungen:null;
    var basis=netto!==null&&KOSTEN.every(function(k){return n[k]!==null;});
    var ergebnis=basis?netto-kosten:null;
    var rest=ergebnis!==null&&n.ruecklage!==null?ergebnis-n.ruecklage:null;
    var groesster=KOSTEN.filter(function(k){return n[k]!==null;}).sort(function(a,b){return n[b]-n[a]||a.localeCompare(b);})[0]||null;
    var schritte=[];
    if(fehlend.length)schritte.push('Daten ergänzen: '+fehlend.join(', ')+'. Unbekannte Kosten bleiben offen; 0 nur bei tatsächlich keinen Kosten eintragen.');
    if(ergebnis!==null&&ergebnis<0)schritte.push('Die erfassten Ausgaben übersteigen die Einnahmen nach Erstattungen. Zuerst die Deckungslücke prüfen.');
    if(groesster&&n[groesster]>0)schritte.push('Größter erfasster Kostenblock: '+FELDER.find(function(f){return f[0]===groesster;})[1]+'. Wirtschaftlichkeit prüfen und mögliche Einsparungen vergleichen.');
    if(rest!==null&&rest<0&&ergebnis>=0)schritte.push('Die geplante Rücklage ist höher als das Ergebnis aus den Angaben. Liquiditätsbedarf und Rücklagenziel prüfen.');
    if(ergebnis!==null&&ergebnis>0)schritte.push('Positives Ergebnis aus den erfassten Angaben. Vor zusätzlichen Ausgaben Zahlungsstand, Rücklagen und offene Verpflichtungen prüfen.');
    if(!schritte.length)schritte.push('Für eine belastbare Planung Einnahmen und vollständige Kosten desselben Zeitraums eintragen.');
    return {fehlend:fehlend,kosten:KOSTEN.some(function(k){return n[k]!==null;})?kosten:null,kostenVollstaendig:KOSTEN.every(function(k){return n[k]!==null;}),netto:netto,ergebnis:ergebnis,verbleibend:rest,marge:ergebnis!==null&&netto>0?100*ergebnis/netto:null,schritte:schritte};
  }
  function angebot(preis,variabel,fix){
    var p=cent(preis),v=cent(variabel),f=cent(fix);
    if(p===null||v===null||f===null)return {status:'Angaben fehlen',beitrag:null,auftraege:null};
    var b=p-v;
    return {status:b>0?'Kalkuliertes Szenario':'Preis deckt variable Kosten nicht',beitrag:b,auftraege:b>0?Math.ceil(f/b):null};
  }
  function importieren(text){
    var data=JSON.parse(text);
    if(!data||data.version!==1||WAEHRUNGEN.indexOf(data.waehrung)<0||!data.werte||typeof data.werte!=='object'||Array.isArray(data.werte))throw Error('Unbekanntes Importformat.');
    var werte={};
    Object.keys(data.werte).forEach(function(k){if(!FELDER.some(function(f){return f[0]===k;}))throw Error('Unbekanntes Betragsfeld.');});
    FELDER.forEach(function(f){var value=data.werte[f[0]];if(value!=null&&typeof value!=='string')throw Error('Beträge müssen als Text angegeben werden.');cent(value);werte[f[0]]=value==null?'':value;});
    if(data.zeitraum!=null&&(typeof data.zeitraum!=='string'||data.zeitraum.length>80))throw Error('Zeitraum ist ungültig.');
    return {waehrung:data.waehrung,zeitraum:data.zeitraum||'',werte:werte};
  }
  var hosts=[];
  var zustand={waehrung:'CHF',zeitraum:'',werte:{},preis:'',variabel:'',fix:''};
  function mount(el,opt){
    opt=opt||{};hosts=hosts.filter(function(h){return h.el.isConnected||h.el===el;});
    if(!hosts.some(function(h){return h.el===el;}))hosts.push({el:el,opt:opt});
    el.replaceChildren();
    function node(tag,text,cls){var n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
    function geld(n){return n===null?'Noch offen':new Intl.NumberFormat('de-CH',{style:'currency',currency:zustand.waehrung}).format(n/100);}
    var info=node('p','Privater Plan aus deinen Angaben. Alle Beträge für denselben Zeitraum und ohne Umsatzsteuer erfassen. Eingaben bleiben im Tab und werden nicht an die Büro-Statusquelle gesendet. Keine Währungsumrechnung.','kb-geld-hinweis');el.appendChild(info);
    var form=node('form');form.autocomplete='off';form.noValidate=true;
    var grid=node('div',null,'kb-geld-form');form.appendChild(grid);
    var periode=node('label','Zeitraum');var zeit=node('input');zeit.type='text';zeit.maxLength=80;zeit.placeholder='Zum Beispiel: November 2026';zeit.value=zustand.zeitraum;zeit.addEventListener('input',function(){zustand.zeitraum=zeit.value;});periode.appendChild(zeit);grid.appendChild(periode);
    var wl=node('label','Währung');var currency=node('select');WAEHRUNGEN.forEach(function(c){var o=node('option',c);o.value=c;currency.appendChild(o);});currency.value=zustand.waehrung;currency.addEventListener('change',function(){zustand.waehrung=currency.value;auswerten();});wl.appendChild(currency);grid.appendChild(wl);
    FELDER.forEach(function(f){var label=node('label',f[1]);var input=node('input');input.type='text';input.inputMode='decimal';input.autocomplete='off';input.placeholder='Offen – 0 nur wenn bestätigt';input.value=zustand.werte[f[0]]||'';input.dataset.geld=f[0];input.addEventListener('input',function(){zustand.werte[f[0]]=input.value;});label.appendChild(input);grid.appendChild(label);});
    var aktionen=node('div',null,'kb-geld-aktionen');var calc=node('button','Geldplan berechnen');calc.type='submit';aktionen.appendChild(calc);var reset=node('button','Eingaben löschen');reset.type='button';reset.addEventListener('click',function(){zustand={waehrung:'CHF',zeitraum:'',werte:{},preis:'',variabel:'',fix:''};hosts.filter(function(h){return h.el.isConnected||h.el===el;}).slice().forEach(function(h){mount(h.el,h.opt);});});aktionen.appendChild(reset);form.appendChild(aktionen);el.appendChild(form);
    var result=node('section',null,'kb-geld-ergebnis');result.setAttribute('aria-label','Ergebnis des Geldplans');result.setAttribute('aria-live','polite');el.appendChild(result);
    function auswerten(){result.replaceChildren();try{
      var r=berechnen(zustand.werte);var head=node('strong','Plan · '+(zustand.zeitraum||'Zeitraum noch offen'));result.appendChild(head);
      [['Einnahmen nach Erstattungen',r.netto],['Erfasste Ausgaben'+(r.kostenVollstaendig?'':' (unvollständig)'),r.kosten],['Ergebnis aus deinen Angaben',r.ergebnis],['Nach geplanter Rücklage',r.verbleibend]].forEach(function(pair){var p=node('p');p.append(node('span',pair[0]),node('b',geld(pair[1])));result.appendChild(p);});
      if(r.marge!==null)result.appendChild(node('p','Rechnerischer Ergebnisanteil: '+r.marge.toFixed(1).replace('.',',')+' %'));
      var ul=node('ul');r.schritte.forEach(function(s){ul.appendChild(node('li',s));});result.appendChild(ul);
      result.appendChild(node('small','Das ist eine Planung aus erfassten Beträgen, kein bestätigter Kontostand oder Jahresgewinn.'));
    }catch(e){result.appendChild(node('p',e.message));}}
    form.addEventListener('submit',function(e){e.preventDefault();auswerten();});auswerten();
    var scenario=node('details',null,'kb-geld-szenario');scenario.appendChild(node('summary','Pilotangebot kalkulieren'));
    scenario.appendChild(node('p','Rechenszenario für ein eigenes Angebot. Es ändert keine Verkaufspreise und sagt keine Kunden oder Einnahmen voraus.'));
    var sf=node('form');sf.autocomplete='off';sf.noValidate=true;var sg=node('div',null,'kb-geld-form');sf.appendChild(sg);
    [['preis','Nettoverkaufspreis pro Auftrag'],['variabel','Variable Kosten pro Auftrag'],['fix','Zu deckende fixe Kosten im Zeitraum']].forEach(function(f){var l=node('label',f[1]);var inp=node('input');inp.type='text';inp.inputMode='decimal';inp.dataset.angebot=f[0];inp.value=zustand[f[0]];inp.addEventListener('input',function(){zustand[f[0]]=inp.value;});l.appendChild(inp);sg.appendChild(l);});
    var sb=node('button','Angebot durchrechnen');sb.type='submit';sf.appendChild(sb);var sr=node('p');sr.setAttribute('role','status');sf.addEventListener('submit',function(e){e.preventDefault();try{var r=angebot(zustand.preis,zustand.variabel,zustand.fix);sr.textContent=r.status+'. '+(r.beitrag===null?'Alle drei Beträge ergänzen.':'Beitrag je Auftrag: '+geld(r.beitrag)+'. ')+(r.auftraege===null?'Keine positive Deckungsrechnung möglich.':'Rechnerisch nötige Aufträge zur Deckung der angegebenen Fixkosten: '+r.auftraege+'.');}catch(e){sr.textContent=e.message;}});scenario.append(sf,sr);el.appendChild(scenario);
    var importLabel=node('label','Privaten Geldplan importieren (JSON)');importLabel.className='kb-geld-import';var file=node('input');file.type='file';file.accept='.json,application/json';var status=node('p');status.setAttribute('role','status');
    file.addEventListener('change',async function(){if(!file.files.length)return;try{if(file.files[0].size>20000)throw Error('Datei ist zu groß.');var neu=importieren(await file.files[0].text());zustand=Object.assign({},neu,{preis:'',variabel:'',fix:''});hosts.filter(function(h){return h.el.isConnected||h.el===el;}).slice().forEach(function(h){mount(h.el,h.opt);});}catch(e){status.textContent=e.message;}});importLabel.append(file,node('small','Import ersetzt alle Eingaben; nicht enthaltene Beträge bleiben offen. Die Datei wird lokal gelesen.'));el.append(importLabel,status);
    var download=node('button','Angaben herunterladen');download.type='button';download.addEventListener('click',function(){try{berechnen(zustand.werte);var data={version:1,waehrung:zustand.waehrung,zeitraum:zustand.zeitraum,werte:zustand.werte};var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});var url=URL.createObjectURL(blob);var a=node('a');a.href=url;a.download='mein-geldplan.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);}catch(e){status.textContent=e.message;}});el.appendChild(download);
    var chance=node('details',null,'kb-geld-chancen');chance.appendChild(node('summary','Umsatzchancen vorbereiten'));
    chance.appendChild(node('p','Für einen ersten Verkauf ein klares Pilotangebot ausarbeiten: Umfang, Eingabequelle, Abnahme, Preis und Lieferung prüfen.'));
    var projekte=Array.isArray(opt.projekte)?opt.projekte:[];
    projekte.forEach(function(p){if(!p||typeof p.name!=='string'||!Array.isArray(p.schritte)||p.schritte.length!==7||p.schritte.some(function(s){return !s||typeof s.fertig!=='boolean';}))return;var next=p.schritte.find(function(s){return s.fertig!==true;});var card=node('article');card.append(node('b',p.name),node('p',next?'Offener Meilenstein: '+next.name:'Belegte Meilensteine vollständig. Verkaufserfolg getrennt messen.'));chance.appendChild(card);});
    if(!projekte.length)chance.appendChild(node('p','Projektstand im Entwicklerbüro prüfen; aktuell ist hier kein Projektbericht geladen.'));
    el.appendChild(chance);
  }
  function monitor(el,opt){
    if(!root.KBFinanzen){mount(el,opt);return;}
    el.replaceChildren();var table=document.createElement('div');el.appendChild(table);root.KBFinanzen.mount(table);
    var details=document.createElement('details');details.className='kb-geld-manuell';var summary=document.createElement('summary');summary.textContent='Eigene Planung (optional)';details.appendChild(summary);var plan=document.createElement('div');details.appendChild(plan);el.appendChild(details);
    var gestartet=false;details.addEventListener('toggle',function(){if(details.open&&!gestartet){gestartet=true;mount(plan,opt);}});
  }
  var api={cent:cent,berechnen:berechnen,angebot:angebot,importieren:importieren,mount:monitor};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;if(typeof window!=='undefined')root.KBGeld=api;
})(typeof window!=='undefined'?window:globalThis);
