/* LuxeStyle — POD Gestalten-Widget (autonom, ohne Drittanbieter-App)
 * <script src> in POD-Produktbeschreibungen. Für jedes
 *   <div class="lspod-designer" data-img-front="…" data-img-back="…" [data-img] [data-variant]>
 * rendert es ein Design-Tool: Umschalter VORNE/HINTEN, je Seite TEXT (Schrift/Farbe/Grösse/Platzierung)
 * und – sobald Cloudinary konfiguriert – LOGO/BILD-Upload, alles mit Live-Vorschau auf dem Produkt.
 * Add-to-cart legt die gewählte Variante MIT dem Design als Bestell-Eigenschaften per /cart/add.js ab.
 *
 * Bild-Upload aktivieren: CLOUD + PRESET (öffentliche Cloudinary-Werte) setzen.
 */
(function(){
  if (window.__lspodDesignerLoaded) return; window.__lspodDesignerLoaded = true;

  // === Bild/Logo-Upload: öffentliche Cloudinary-Werte (unsigned) ===
  var CLOUD  = '';   // Cloud Name
  var PRESET = '';   // Unsigned Upload Preset
  var IMG_ENABLED = !!(CLOUD && PRESET);

  var FONTS = [
    {n:'Modern Sans', v:"'Helvetica Neue',Arial,sans-serif"},
    {n:'Elegant Serif', v:"Georgia,'Times New Roman',serif"},
    {n:'Handschrift', v:"'Brush Script MT','Segoe Script',cursive"},
    {n:'Bold Display', v:"'Arial Black','Helvetica Neue',sans-serif"},
    {n:'Mono', v:"'Courier New',monospace"}
  ];
  var COLORS = ['#111111','#ffffff','#c1922f','#b3122b','#1e4fd6','#1c8a4b','#e84393','#000080'];
  var POS = [{n:'Oben',v:'20%'},{n:'Mitte',v:'50%'},{n:'Unten',v:'78%'}];

  function el(t,a,h){ var e=document.createElement(t); if(a) for(var k in a) e.setAttribute(k,a[k]); if(h!=null) e.innerHTML=h; return e; }
  function findForm(){ return document.querySelector('form[action*="/cart/add"]')||null; }
  function getVariantId(f,fb){ if(f){ var i=f.querySelector('[name="id"]:checked')||f.querySelector('[name="id"]'); if(i&&i.value) return i.value; } return fb||null; }
  function fontName(v){ return (FONTS.filter(function(f){return f.v===v;})[0]||{}).n||'Standard'; }
  function posName(v){ return (POS.filter(function(p){return p.v===v;})[0]||{}).n||'Mitte'; }
  function upload(file, cb){ var fd=new FormData(); fd.append('file',file); fd.append('upload_preset',PRESET);
    fetch('https://api.cloudinary.com/v1_1/'+CLOUD+'/auto/upload',{method:'POST',body:fd}).then(function(r){return r.json();})
    .then(function(j){ j.secure_url?cb(null,j.secure_url):cb(new Error((j.error&&j.error.message)||'Upload fehlgeschlagen')); }).catch(cb); }
  function dd(){ return {mode:'text',text:'',font:FONTS[0].v,color:'#111111',size:30,pos:'50%',imgLocal:'',imgUrl:'',imgUploading:false,imgSize:55,imgPos:'50%'}; }

  function build(container){
    var imgFront = container.getAttribute('data-img-front') || container.getAttribute('data-img') || '';
    var imgBack  = container.getAttribute('data-img-back') || '';
    var fallbackVar = container.getAttribute('data-variant') || '';
    var sides = [{k:'front',label:'Vorne',img:imgFront}];
    if(imgBack && imgBack!==imgFront) sides.push({k:'back',label:'Hinten',img:imgBack});

    var state = { active:'front', d:{ front:dd(), back:dd() } };
    function cur(){ return state.d[state.active]; }
    function curImg(){ for(var i=0;i<sides.length;i++){ if(sides[i].k===state.active) return sides[i].img; } return imgFront; }

    container.innerHTML='';
    var wrap=el('div',{style:"border:1px solid #ece7df;border-radius:16px;overflow:hidden;background:#fff;font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:8px 0 16px;"});
    wrap.appendChild(el('div',{style:"background:#16151a;color:#fff;padding:12px 16px;font-weight:800;font-size:15px;"},'🎨 Jetzt selbst gestalten'));

    var pv=el('div',{style:"position:relative;width:100%;aspect-ratio:1/1;background:#f4f1ec center/cover no-repeat;"});
    var imgEl=el('img',{style:"position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;pointer-events:none;"});
    var txt=el('div',{style:"position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:86%;text-align:center;word-break:break-word;pointer-events:none;line-height:1.1;"});
    pv.appendChild(imgEl); pv.appendChild(txt); wrap.appendChild(pv);

    var body=el('div',{style:"padding:14px 16px;"});

    // Seiten-Umschalter (nur wenn 2 Seiten)
    var sideBtns={};
    if(sides.length>1){
      var sw=el('div',{style:"display:flex;gap:8px;margin-bottom:14px;background:#f4f1ec;padding:5px;border-radius:12px;"});
      sides.forEach(function(s){ var b=el('button',{type:'button','data-s':s.k,style:"flex:1;padding:10px;border-radius:9px;border:none;font-weight:800;font-size:14px;cursor:pointer;background:"+(s.k==='front'?'#fff':'transparent')+";color:#16151a;box-shadow:"+(s.k==='front'?'0 1px 3px rgba(0,0,0,.12)':'none')+";"}); b.textContent=(s.k==='front'?'👕 ':'🔄 ')+s.label; sideBtns[s.k]=b; sw.appendChild(b); });
      body.appendChild(sw);
      sw.addEventListener('click',function(e){ var b=e.target.closest('[data-s]'); if(!b)return; setSide(b.getAttribute('data-s')); });
    }

    function row(l){ var r=el('div',{style:"margin-bottom:12px;"}); r.appendChild(el('div',{style:"font-size:12px;font-weight:700;color:#6b6b73;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;"},l)); return r; }

    // Tabs Text|Bild
    var tabs=null,tT,tI;
    if(IMG_ENABLED){
      tabs=el('div',{style:"display:flex;gap:8px;margin-bottom:14px;"});
      tT=el('button',{type:'button','data-m':'text',style:"flex:1;padding:10px;border-radius:10px;border:1px solid #16151a;background:#16151a;color:#fff;font-weight:700;font-size:14px;cursor:pointer;"},'✍️ Text');
      tI=el('button',{type:'button','data-m':'image',style:"flex:1;padding:10px;border-radius:10px;border:1px solid #ddd;background:#fff;color:#16151a;font-weight:700;font-size:14px;cursor:pointer;"},'🖼️ Logo / Bild');
      tabs.appendChild(tT); tabs.appendChild(tI); body.appendChild(tabs);
    }

    // TEXT-Panel
    var pText=el('div');
    var ti=el('input',{type:'text',maxlength:'40',placeholder:'Dein Text, Name oder Spruch …',style:"width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #ddd;border-radius:10px;font-size:15px;margin-bottom:12px;"});
    pText.appendChild(ti);
    var rF=row('Schrift'); var fs=el('select',{style:"width:100%;padding:9px 10px;border:1px solid #ddd;border-radius:10px;font-size:14px;"});
    FONTS.forEach(function(f){ var o=el('option',{value:f.v}); o.textContent=f.n; o.style.fontFamily=f.v; fs.appendChild(o); }); rF.appendChild(fs); pText.appendChild(rF);
    var rC=row('Farbe'); var cw=el('div',{style:"display:flex;flex-wrap:wrap;gap:8px;"});
    COLORS.forEach(function(c){ cw.appendChild(el('button',{type:'button','data-c':c,style:"width:30px;height:30px;border-radius:50%;border:2px solid #e3e3e3;background:"+c+";cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);"})); }); rC.appendChild(cw); pText.appendChild(rC);
    var rS=row('Grösse'); var sl=el('input',{type:'range',min:'14',max:'64',value:'30',style:"width:100%;"}); rS.appendChild(sl); pText.appendChild(rS);
    var rP=row('Platzierung'); var pw=el('div',{style:"display:flex;gap:8px;"});
    POS.forEach(function(p){ var b=el('button',{type:'button','data-p':p.v,style:"flex:1;padding:9px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#16151a;font-weight:700;font-size:13px;cursor:pointer;"}); b.textContent=p.n; pw.appendChild(b); }); rP.appendChild(pw); pText.appendChild(rP);
    body.appendChild(pText);

    // IMAGE-Panel
    var pImage=el('div',{style:"display:none;"}), fi,ust,isl,ipw,riS,riP;
    if(IMG_ENABLED){
      var up=el('div',{style:"border:2px dashed #d8d2c7;border-radius:12px;padding:18px;text-align:center;cursor:pointer;background:#faf8f5;margin-bottom:12px;"});
      up.innerHTML="<div style='font-size:26px'>⬆️</div><div style='font-weight:700;font-size:14px;margin-top:4px'>Logo oder Bild hochladen</div><div style='font-size:12px;color:#6b6b73;margin-top:2px'>PNG/JPG · transparentes PNG für Logos</div>";
      fi=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp',style:"display:none;"}); up.appendChild(fi);
      ust=el('div',{style:"font-size:12.5px;text-align:center;min-height:16px;margin-bottom:10px;"});
      riS=row('Bildgrösse'); isl=el('input',{type:'range',min:'25',max:'95',value:'55',style:"width:100%;"}); riS.appendChild(isl); riS.style.display='none';
      riP=row('Platzierung'); ipw=el('div',{style:"display:flex;gap:8px;"}); POS.forEach(function(p){ var b=el('button',{type:'button','data-ip':p.v,style:"flex:1;padding:9px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#16151a;font-weight:700;font-size:13px;cursor:pointer;"}); b.textContent=p.n; ipw.appendChild(b); }); riP.appendChild(ipw); riP.style.display='none';
      pImage.appendChild(up); pImage.appendChild(ust); pImage.appendChild(riS); pImage.appendChild(riP); body.appendChild(pImage);
      up.addEventListener('click',function(){ fi.click(); });
      fi.addEventListener('change',function(){ var f=fi.files&&fi.files[0]; if(!f)return; if(f.size>10*1024*1024){ ust.style.color='#b3122b'; ust.textContent='Datei zu gross (max 10 MB).'; return; }
        var rd=new FileReader(); rd.onload=function(){ cur().imgLocal=rd.result; render(); }; rd.readAsDataURL(f);
        riS.style.display=''; riP.style.display=''; cur().imgUploading=true; cur().imgUrl=''; ust.style.color='#6b6b73'; ust.textContent='Wird hochgeladen …';
        upload(f,function(err,url){ cur().imgUploading=false; if(err){ ust.style.color='#b3122b'; ust.textContent='Upload-Fehler: '+err.message; return; } cur().imgUrl=url; ust.style.color='#1c8a4b'; ust.textContent='✓ Bild hochgeladen'; }); });
      isl.addEventListener('input',function(){ cur().imgSize=parseInt(isl.value,10); render(); });
      ipw.addEventListener('click',function(e){ var b=e.target.closest('[data-ip]'); if(!b)return; cur().imgPos=b.getAttribute('data-ip'); render(); paintPos(ipw,'data-ip',cur().imgPos); });
      tabs.addEventListener('click',function(e){ var b=e.target.closest('[data-m]'); if(!b)return; cur().mode=b.getAttribute('data-m'); paintTabs(); });
    }

    var cta=el('button',{type:'button',style:"width:100%;padding:15px;border:none;border-radius:999px;background:#c1922f;color:#fff;font-weight:800;font-size:16px;cursor:pointer;margin-top:4px;"},'🛒 Mit meinem Design in den Warenkorb');
    var msg=el('div',{style:"text-align:center;font-size:13px;margin-top:8px;min-height:18px;"});
    body.appendChild(cta); body.appendChild(msg); wrap.appendChild(body); container.appendChild(wrap);

    function paintPos(group,attr,val){ Array.prototype.forEach.call(group.children,function(x){ var on=x.getAttribute(attr)===val; x.style.border='1px solid '+(on?'#16151a':'#ddd'); x.style.background=on?'#16151a':'#fff'; x.style.color=on?'#fff':'#16151a'; }); }
    function paintSwatch(val){ Array.prototype.forEach.call(cw.children,function(x){ x.style.border='2px solid '+(x.getAttribute('data-c')===val?'#16151a':'#e3e3e3'); }); }
    function paintTabs(){ if(!IMG_ENABLED) return; var m=cur().mode; tT.style.background=m==='text'?'#16151a':'#fff'; tT.style.color=m==='text'?'#fff':'#16151a'; tT.style.borderColor=m==='text'?'#16151a':'#ddd'; tI.style.background=m==='image'?'#16151a':'#fff'; tI.style.color=m==='image'?'#fff':'#16151a'; tI.style.borderColor=m==='image'?'#16151a':'#ddd'; pText.style.display=m==='text'?'':'none'; pImage.style.display=m==='image'?'':'none'; }

    function syncControls(){
      var d=cur(); ti.value=d.text; fs.value=d.font; sl.value=d.size; paintSwatch(d.color); paintPos(pw,'data-p',d.pos);
      if(IMG_ENABLED){ if(d.imgLocal){ riS.style.display=''; riP.style.display=''; isl.value=d.imgSize; paintPos(ipw,'data-ip',d.imgPos); ust.textContent=d.imgUrl?'✓ Bild hochgeladen':(d.imgUploading?'Wird hochgeladen …':''); ust.style.color=d.imgUrl?'#1c8a4b':'#6b6b73'; } else { riS.style.display='none'; riP.style.display='none'; ust.textContent=''; } paintTabs(); }
    }
    function setSide(k){ state.active=k; if(sideBtns.front){ for(var s in sideBtns){ var on=s===k; sideBtns[s].style.background=on?'#fff':'transparent'; sideBtns[s].style.boxShadow=on?'0 1px 3px rgba(0,0,0,.12)':'none'; } } syncControls(); render(); }

    function buildProps(){
      var props={};
      sides.forEach(function(s){ var d=state.d[s.k]; var pre=sides.length>1?(s.label+' · '):'';
        if(d.text.trim()){ props[pre+'🎨 Text']=d.text.trim(); props[pre+'Schrift']=fontName(d.font); props[pre+'Farbe']=d.color; props[pre+'Text-Platz']=posName(d.pos); }
        if(d.imgUrl){ props[pre+'🖼️ Bild/Logo']=d.imgUrl; props[pre+'Bild-Platz']=posName(d.imgPos); } });
      return props;
    }
    function syncFormInputs(){
      var form=findForm(); if(!form) return;
      Array.prototype.forEach.call(form.querySelectorAll('input[data-lspod="1"]'), function(x){ if(x.parentNode) x.parentNode.removeChild(x); });
      var props=buildProps();
      for(var k in props){ var i=document.createElement('input'); i.type='hidden'; i.setAttribute('data-lspod','1'); i.name='properties['+k+']'; i.value=props[k]; form.appendChild(i); }
    }
    function render(){
      pv.style.backgroundImage="url('"+curImg()+"')";
      var d=cur();
      txt.textContent=d.text||((!IMG_ENABLED||d.mode==='text')?'Dein Design':'');
      txt.style.fontFamily=d.font; txt.style.color=d.color; txt.style.fontSize=d.size+'px'; txt.style.fontWeight='800';
      txt.style.opacity=d.text?'1':((!IMG_ENABLED||d.mode==='text')?'0.45':'0'); txt.style.top=d.pos;
      txt.style.textShadow=(d.color.toLowerCase()==='#ffffff')?'0 1px 3px rgba(0,0,0,.45)':'none';
      if(d.imgLocal){ imgEl.src=d.imgLocal; imgEl.style.display='block'; imgEl.style.width=d.imgSize+'%'; imgEl.style.maxWidth=d.imgSize+'%'; imgEl.style.top=d.imgPos; } else { imgEl.style.display='none'; }
      try{ syncFormInputs(); }catch(e){}
    }

    ti.addEventListener('input',function(){ cur().text=ti.value; render(); });
    fs.addEventListener('change',function(){ cur().font=fs.value; render(); });
    sl.addEventListener('input',function(){ cur().size=parseInt(sl.value,10); render(); });
    cw.addEventListener('click',function(e){ var b=e.target.closest('[data-c]'); if(!b)return; cur().color=b.getAttribute('data-c'); paintSwatch(cur().color); render(); });
    pw.addEventListener('click',function(e){ var b=e.target.closest('[data-p]'); if(!b)return; cur().pos=b.getAttribute('data-p'); paintPos(pw,'data-p',cur().pos); render(); });

    cta.addEventListener('click',function(){
      var uploading=false, any=false;
      sides.forEach(function(s){ var d=state.d[s.k]; if(d.imgUploading) uploading=true; if(d.text.trim()||d.imgUrl) any=true; });
      if(uploading){ msg.style.color='#b3122b'; msg.textContent='Bild lädt noch hoch – kurz warten …'; return; }
      if(!any){ msg.style.color='#b3122b'; msg.textContent=IMG_ENABLED?'Gib einen Text ein oder lade ein Bild hoch.':'Bitte gib zuerst deinen Text ein.'; return; }
      var form=findForm(), vid=getVariantId(form,fallbackVar);
      if(!vid){ msg.style.color='#b3122b'; msg.textContent='Variante nicht gefunden – bitte oben Grösse/Farbe wählen.'; return; }
      var props=buildProps();
      cta.disabled=true; cta.style.opacity='0.7'; msg.style.color='#6b6b73'; msg.textContent='Wird hinzugefügt …';
      fetch('/cart/add.js',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({id:vid,quantity:1,properties:props})})
        .then(function(r){ if(!r.ok) return r.json().then(function(j){throw new Error(j.description||'Fehler');}); return r.json(); })
        .then(function(){ msg.style.color='#1c8a4b'; msg.textContent='✓ Im Warenkorb! Weiterleitung …'; window.location.href='/cart'; })
        .catch(function(err){ cta.disabled=false; cta.style.opacity='1'; msg.style.color='#b3122b'; msg.textContent='Konnte nicht hinzufügen: '+err.message; });
    });

    syncControls(); render();
  }

  function initAll(){ var n=document.querySelectorAll('.lspod-designer'); Array.prototype.forEach.call(n,function(x){ if(x.getAttribute('data-init'))return; x.setAttribute('data-init','1'); try{ build(x); }catch(e){} }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
})();
