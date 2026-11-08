/* Nur die öffentliche Webansicht lädt den begrenzten Projektstatus nach. */
(function () {
  'use strict';
  var ids = ['dev_bauen', 'dev_pruefen', 'dev_angebot'];
  var felder = ['status','gemessen','gemessen_text','frisch_h','ereignis','ereignis_iso','befund','quelle','naechster_schritt','projekte','expertenplan'];
  var laeuft = false;
  function alterSignatur() {
    return window.__ROWS.filter(function(r){return ids.indexOf(r.id)>=0;}).map(function(r){
      return Date.now()-Date.parse(r.gemessen)>r.frisch_h*3600000 ? 'alt' : 'frisch';
    }).join('|');
  }
  var alterung = alterSignatur();
  window.__aktualisiereProjektstatus = async function () {
    if (document.hidden) return false;
    var jetzt = alterSignatur();
    if (jetzt !== alterung) {alterung=jetzt;window.__runAll();}
    if (laeuft) return false;
    laeuft = true;
    var controller = new AbortController();
    var timeout = setTimeout(function(){controller.abort();},10000);
    try {
      var res = await fetch('/buero-projektstatus.json', {cache:'no-store', credentials:'omit', signal:controller.signal});
      if (!res.ok) return false;
      var text = await res.text();
      if (text.length > 200000) return false;
      var data = JSON.parse(text), t = Date.parse(data.gemessen);
      if (data.version !== 1 || !isFinite(t) || t > Date.now() + 300000 || !Array.isArray(data.arbeitsplaetze) || data.arbeitsplaetze.length !== 3) return false;
      var updates = {}, valid = true;
      data.arbeitsplaetze.forEach(function(r) {
        if (!r || ids.indexOf(r.id) < 0 || updates[r.id] || ['gruen','rot','gelb','du'].indexOf(r.status) < 0 || Date.parse(r.gemessen) !== t || r.frisch_h !== 24) {valid=false;return;}
        updates[r.id] = r;
      });
      if (!valid || ids.some(function(id){return !updates[id];})) return false;
      var bisher = window.__ROWS.filter(function(r){return ids.indexOf(r.id)>=0;}).reduce(function(m,r){return Math.max(m,Date.parse(r.gemessen)||0);},0);
      if (t <= bisher) return false;
      window.__ROWS = window.__ROWS.map(function(r) {
        if (!updates[r.id]) return r;
        var n = Object.assign({},r);
        felder.forEach(function(k){if(Object.prototype.hasOwnProperty.call(updates[r.id],k))n[k]=updates[r.id][k];});
        return n;
      });
      alterung = alterSignatur();
      window.__runAll();
      return true;
    } catch (e) { return false; }
    finally { clearTimeout(timeout); laeuft = false; }
  };
  window.__aktualisiereProjektstatus();
  setInterval(window.__aktualisiereProjektstatus, 300000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)window.__aktualisiereProjektstatus();});
})();

/* Getrennter, begrenzter Abruf für Shop und Social Media. */
(function () {
  'use strict';
  var ids=['auswahl','schaufenster','waechter','autopilot','fortura','printful','social_meta','social_pinterest'];
  var felder=['status','gemessen','gemessen_text','frisch_h','ereignis','ereignis_iso','befund','quelle','naechster_schritt'];
  var gelesen=0, aktiv=false, signatur='';
  window.__aktualisiereAblaufstatus=async function(){
    if(document.hidden||aktiv)return false;
    var alt=window.__ROWS.filter(function(r){return ids.includes(r.id);}).map(function(r){return Date.now()-Date.parse(r.gemessen)>48*3600000;}).join('|');
    if(alt!==signatur){signatur=alt;window.__runAll();}
    aktiv=true;var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},10000);
    try{
      var res=await fetch('/buero-ablaufstatus.json',{cache:'no-store',credentials:'omit',signal:controller.signal});
      if(!res.ok)return false;var text=await res.text();if(text.length>50000)return false;
      var d=JSON.parse(text),t=Date.parse(d.gemessen),seen={};
      if(d.version!==1||!isFinite(t)||t>Date.now()+300000||t<=gelesen||!Array.isArray(d.arbeitsplaetze)||d.arbeitsplaetze.length!==ids.length)return false;
      for(var r of d.arbeitsplaetze){
        if(!r||!ids.includes(r.id)||seen[r.id]||!['gruen','gelb','rot'].includes(r.status)||r.frisch_h!==48)return false;
        var rt=Date.parse(r.gemessen);
        if(r.gemessen!==''&&(!isFinite(rt)||rt>t+300000))return false;
        if(r.gemessen===''&&r.status!=='gelb')return false;
        if(felder.some(function(k){return k!=='frisch_h'&&(typeof r[k]!=='string'||r[k].length>1200);}))return false;
        seen[r.id]=r;
      }
      window.__ROWS=window.__ROWS.map(function(row){
        var u=seen[row.id];if(!u)return row;
        // Bei Abruffehlern einen belegten vorherigen Lauf erhalten und altern lassen.
        if(!u.gemessen&&row.gemessen)return row;
        if(Date.parse(u.gemessen)<Date.parse(row.gemessen))return row;
        var n=Object.assign({},row);felder.forEach(function(k){n[k]=u[k];});return n;
      });gelesen=t;window.__runAll();return true;
    }catch(e){return false;}finally{clearTimeout(timer);aktiv=false;}
  };
  window.__aktualisiereAblaufstatus();
  setInterval(window.__aktualisiereAblaufstatus,300000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)window.__aktualisiereAblaufstatus();});
})();
