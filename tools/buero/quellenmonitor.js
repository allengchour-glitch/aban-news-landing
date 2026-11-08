/* Private Messwerte im Browser; Live-Dashboards öffnen beim jeweiligen Anbieter. */
(function(root){
  'use strict';
  function objekt(o,keys){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(function(k){return !keys.includes(k);}))throw Error('Unbekanntes Berichtsformat.');}
  function zahl(n){return n===null||(Number.isSafeInteger(n)&&n>=0);}
  function geld(n){return n===null||(Number.isSafeInteger(n)&&Math.abs(n)<=100000000000);}
  function datum(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&isFinite(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
  function zeit(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&datum(v.slice(0,10))&&isFinite(Date.parse(v))&&Date.parse(v)<=Date.now()+300000;}
  function pruefen(d){
    objekt(d,['version','typ','erstellt','konten','shop','ga4','suche','merchant']);
    if(d.version!==1||d.typ!=='privater-quellenmonitor'||!zeit(d.erstellt))throw Error('Unbekannter oder undatierter Quellenbericht.');
    objekt(d.konten,['ga4','merchant','shop']);
    if(typeof d.konten.ga4!=='string'||typeof d.konten.merchant!=='string'||typeof d.konten.shop!=='string'||!/^\d{1,20}$/.test(d.konten.ga4)||!/^\d{1,20}$/.test(d.konten.merchant)||!/^[a-z0-9][a-z0-9-]{0,62}$/.test(d.konten.shop))throw Error('Ungültige Kontozuordnung.');
    objekt(d.shop,['tag','gemessen','waehrung','umsatz','netto','bestellungen','besucher','sitzungen']);
    if(!datum(d.shop.tag)||!zeit(d.shop.gemessen)||!['CHF','EUR','USD'].includes(d.shop.waehrung)||!geld(d.shop.umsatz)||!geld(d.shop.netto)||!['bestellungen','besucher','sitzungen'].every(function(k){return zahl(d.shop[k]);}))throw Error('Ungültige Shop-Messung.');
    objekt(d.ga4,['gemessen','fenster_minuten','aktive']);
    if(!zeit(d.ga4.gemessen)||d.ga4.fenster_minuten!==30||!zahl(d.ga4.aktive))throw Error('Ungültige Echtzeitmessung.');
    if(!Array.isArray(d.suche)||d.suche.length>10)throw Error('Ungültiger Suchbericht.');
    var gesehen=new Set();d.suche.forEach(function(s){
      objekt(s,['domain','gemessen','von','bis','klicks','impressionen','vorlaeufig']);
      if(typeof s.domain!=='string'||!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(s.domain)||gesehen.has(s.domain)||!zeit(s.gemessen)||!datum(s.von)||!datum(s.bis)||s.von>s.bis||!zahl(s.klicks)||!zahl(s.impressionen)||typeof s.vorlaeufig!=='boolean')throw Error('Ungültige Suchmessung.');
      gesehen.add(s.domain);
    });
    objekt(d.merchant,['gemessen','geprueft','eingeschraenkt','abgelehnt','teil','probleme']);
    if(!zeit(d.merchant.gemessen)||!['geprueft','eingeschraenkt','abgelehnt'].every(function(k){return zahl(d.merchant[k]);})||typeof d.merchant.teil!=='boolean'||!Array.isArray(d.merchant.probleme)||d.merchant.probleme.length>50)throw Error('Ungültiger Merchant-Bericht.');
    if(d.merchant.geprueft!==null&&d.merchant.eingeschraenkt!==null&&d.merchant.abgelehnt!==null&&d.merchant.eingeschraenkt+d.merchant.abgelehnt>d.merchant.geprueft)throw Error('Merchant-Statuszahlen widersprechen sich.');
    d.merchant.probleme.forEach(function(p){objekt(p,['code','anzahl']);if(typeof p.code!=='string'||! /^[a-z0-9_]{1,120}$/.test(p.code)||!zahl(p.anzahl))throw Error('Ungültiger Merchant-Hinweis.');});
    return JSON.parse(JSON.stringify(d));
  }
  function links(d){return {
    analytics:d?'https://analytics.google.com/analytics/web/#/p'+d.konten.ga4+'/realtime/overview':'https://analytics.google.com/',
    shop:'https://admin.shopify.com/analytics/live',
    search:d&&d.suche.length?'https://search.google.com/search-console/performance/search-analytics?resource_id='+encodeURIComponent('sc-domain:'+d.suche[0].domain):'https://search.google.com/search-console/',
    merchant:d?'https://merchants.google.com/mc/overview?a='+d.konten.merchant:'https://merchants.google.com/'
  };}
  function uhr(s){return new Date(s).toLocaleString('de-CH',{timeZone:'Europe/Zurich'});}
  function z(n){return n===null||n===undefined?'Nicht gemessen':new Intl.NumberFormat('de-CH').format(n);}
  function betrag(n,c){return n===null||n===undefined?'Nicht geladen':new Intl.NumberFormat('de-CH',{style:'currency',currency:c}).format(n/100);}
  function berichtstag(d){return d?d.shop.tag:'heute';}
  function alt(s,jetzt){return jetzt-Date.parse(s)>5*60000;}
  function n(tag,text,klasse){var el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(klasse)el.className=klasse;return el;}
  function mount(el,opt){
    opt=opt||{};var data=opt.snapshot?pruefen(opt.snapshot):null;
    function malen(meldung){
      el.replaceChildren();el.classList.add('kb-quellenmonitor');
      var h=n('h2','Google und Shop');h.tabIndex=-1;el.appendChild(h);
      el.appendChild(n('p',data?'Privater Datenstand · Bericht erstellt '+uhr(data.erstellt):'Private Zahlen sind noch nicht geladen. Die Live-Ansichten öffnen geschützt bei Google oder Shopify.','kb-quellen-hinweis'));
      var nav=n('nav',undefined,'kb-quellen-links');nav.setAttribute('aria-label','Geschützte Datenquellen');var urls=links(data);
      [['analytics','GA4 Echtzeit'],['shop','Shopify Live View'],['search','Search Console'],['merchant','Merchant Center']].forEach(function(p){var a=n('a',p[1]);a.href=urls[p[0]];a.target='_blank';a.rel='noopener noreferrer';nav.appendChild(a);});el.appendChild(nav);
      var karten=n('div',undefined,'kb-quellen-karten');
      function karte(titel,wert,hinweis){var a=n('article');a.append(n('h3',titel),n('strong',wert),n('p',hinweis));karten.appendChild(a);}
      karte('GA4 · 30-Minuten-Fenster',data?z(data.ga4.aktive):'Nicht geladen',data?'GA4-Messung vom '+uhr(data.ga4.gemessen)+(alt(data.ga4.gemessen,Date.now())?' · ältere Messung':''):'GA4 zählt gemeldete Nutzer; kein vollständiger Besucherzähler.');
      karte('Umsatz gesamt · '+berichtstag(data,Date.now()),data?betrag(data.shop.umsatz,data.shop.waehrung):'Privat',data?'Shopify · '+data.shop.tag+' · laufender Tag. Kein Gewinn.':'Beträge bleiben ohne privaten Bericht verborgen.');
      karte('Shop-Besucher · '+berichtstag(data,Date.now()),data?z(data.shop.besucher):'Nicht geladen',data?'Shopify · '+data.shop.tag+' · '+z(data.shop.sitzungen)+' Sitzungen':'Besucher und Sitzungen werden getrennt gemessen.');
      karte('Bestellungen · '+berichtstag(data,Date.now()),data?z(data.shop.bestellungen):'Nicht geladen',data?'Shopify-Abfrage: '+uhr(data.shop.gemessen):'Keine Bestell- oder Kundendaten öffentlich enthalten.');
      el.appendChild(karten);
      var table=n('table');var caption=n('caption','Google-Suche · Web-Ergebnisse');table.appendChild(caption);var head=n('thead'),tr=n('tr');['Webseite / Zeitraum','Klicks','Impressionen','Datenstand'].forEach(function(t){var th=n('th',t);th.scope='col';tr.appendChild(th);});head.appendChild(tr);table.appendChild(head);var body=n('tbody');
      if(data&&data.suche.length)data.suche.forEach(function(s){var row=n('tr');[s.domain+' · '+s.von+' – '+s.bis,z(s.klicks),z(s.impressionen),s.vorlaeufig?'Enthält vorläufige Tage':'Abgeschlossener Bericht'].forEach(function(t){row.appendChild(n('td',t));});body.appendChild(row);});
      else{var row=n('tr'),cell=n('td','Suchdaten nicht geladen. Search Console liefert verzögerte Berichte, keine Echtzeitbesucher.');cell.colSpan=4;row.appendChild(cell);body.appendChild(row);}table.appendChild(body);var wrap=n('div',undefined,'kb-quellen-tabelle');wrap.appendChild(table);el.appendChild(wrap);
      var mc=n('section');mc.appendChild(n('h3','Merchant Center · Produktstatus'));
      mc.appendChild(n('p',data?z(data.merchant.geprueft)+' geprüfte Feed-Einträge · '+(data.merchant.teil?'Teilauszug; gesamter Katalog nicht bestätigt':'gemeldeter Auszug vollständig'):'Kein privater Produktstatus geladen.'));
      if(data){mc.appendChild(n('p',z(data.merchant.eingeschraenkt)+' eingeschränkt geeignet · '+z(data.merchant.abgelehnt)+' nicht geeignet oder abgelehnt · nur dieser Auszug.'));
        var list=n('ul');var namen={missing_shipping_no_shipping_service_defined_for_country:'Versandangaben für Zielmärkte',item_limit_reached_ads_css:'Produktlimit',image_unwanted_overlays:'Überlagerungen im Produktbild',personal_hardships_policy_violation:'Richtlinie: persönliche Notlagen',identity_and_belief_policy_violation:'Richtlinie: Identität und Überzeugungen'};
        data.merchant.probleme.forEach(function(p){list.appendChild(n('li',(namen[p.code]||p.code)+': '+z(p.anzahl)+' Vorkommen im Auszug'));});mc.appendChild(list);
        mc.appendChild(n('p','Problemzahlen können sich überschneiden und werden nicht zu einer Gesamtsumme addiert. Abgerufen: '+uhr(data.merchant.gemessen),'kb-quellen-hinweis'));
      }el.appendChild(mc);
      var aktionen=n('div',undefined,'kb-quellen-links');var label=n('label','Privaten Datenstand laden');var input=n('input');input.type='file';input.accept='.json,application/json';label.appendChild(input);aktionen.appendChild(label);
      var clear=n('button','Private Zahlen ausblenden');clear.type='button';clear.disabled=!data;clear.addEventListener('click',function(){data=null;malen('Private Anzeige geleert. Die ursprüngliche Datei bleibt erhalten.');});aktionen.appendChild(clear);
      if(typeof opt.auftrag==='string'&&opt.auftrag){var fresh=n('a','Neu im Chat abrufen');fresh.href='https://chatgpt.com/?q='+encodeURIComponent(opt.auftrag);fresh.target='_blank';fresh.rel='noopener noreferrer';aktionen.appendChild(fresh);}el.appendChild(aktionen);
      var status=n('p',meldung||'');status.setAttribute('role','status');el.appendChild(status);
      input.addEventListener('change',async function(){try{var f=input.files[0];if(!f)return;if(f.size>256*1024)throw Error();var next=pruefen(JSON.parse(await f.text()));data=next;malen('Privater Datenstand geladen. Keine Übertragung und kein automatischer Kontosync.');}catch(e){status.textContent='Datei nicht geladen: kein gültiger privater Quellenbericht.';input.value='';}});
      el.appendChild(n('p','Diese Zahlen sind ein gespeicherter Datenstand. Sie aktualisieren sich hier nicht automatisch. Für laufende Echtzeitdaten die geschützte Anbieteransicht öffnen. Keine Zugangsdaten eingeben; Umsatz ist kein Gewinn.','kb-quellen-hinweis'));
    }
    malen();return {setzen:function(d){data=pruefen(d);malen();},leeren:function(){data=null;malen();}};
  }
  var api={pruefen:pruefen,links:links,alt:alt,berichtstag:berichtstag,mount:mount};root.KBQuellen=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
