/* LuxeStyle — POD Gestalten-Widget (autonom, ohne Drittanbieter-App), zweisprachig DE/EN.
 * <script src> in POD-Produktbeschreibungen. Für jedes
 *   <div class="lspod-designer" data-img-front="…" data-img-back="…" [data-variant]>
 * rendert es ein Design-Tool: Umschalter VORNE/HINTEN, je Seite TEXT (Schrift/Farbe/Grösse/Platzierung)
 * und – sobald Cloudinary konfiguriert – LOGO/BILD-Upload, mit Live-Vorschau auf dem Produkt.
 * Add-to-cart legt die gewählte Variante MIT dem Design als Bestell-Eigenschaften ab und spiegelt das
 * Design in versteckte properties-Inputs des Formulars (auch normaler Kauf-Button trägt Design).
 *
 * Bild-Upload aktivieren: CLOUD + PRESET (öffentliche Cloudinary-Werte) setzen.
 */
(function(){
  if (window.__lspodDesignerLoaded) return; window.__lspodDesignerLoaded = true;

  var CLOUD='', PRESET='', IMG_ENABLED=!!(CLOUD&&PRESET);

  var locale=((window.Shopify&&Shopify.locale)||document.documentElement.lang||'de').toLowerCase();
  var EN=locale.indexOf('en')===0;
  var T = EN ? {
    head:'Design it yourself', ph:'Your text, name or slogan …', phPrev:'Your text here',
    font:'Font', color:'Color', size:'Size', place:'Placement', imgSize:'Image size',
    tabText:'✍️ Text', tabImg:'🖼️ Logo / Image', upTitle:'Upload logo or image', upHint:'PNG/JPG · transparent PNG for logos',
    remove:'✕ Remove image', uploading:'Uploading …', uploaded:'✓ Image uploaded', upErr:'Upload error: ', tooBig:'File too large (max 10 MB).',
    cta:'🛒 Add my design to cart', needText:'Please enter your text first.', needAny:'Enter text or upload an image.',
    stillUp:'Image still uploading – please wait …', noVar:'Please select a size/color above first.', adding:'Adding …', added:'✓ Added! Redirecting …', addErr:'Could not add: ',
    front:'Front', back:'Back', pos:['Top','Center','Bottom'], fonts:['Modern Sans','Elegant Serif','Handwriting','Bold Display','Mono'],
    pText:'Text', pFont:'Font', pColor:'Color', pTextPos:'Text pos.', pImg:'Image/Logo', pImgPos:'Image pos.'
  } : {
    head:'Jetzt selbst gestalten', ph:'Dein Text, Name oder Spruch …', phPrev:'Dein Text hier',
    font:'Schrift', color:'Farbe', size:'Grösse', place:'Platzierung', imgSize:'Bildgrösse',
    tabText:'✍️ Text', tabImg:'🖼️ Logo / Bild', upTitle:'Logo oder Bild hochladen', upHint:'PNG/JPG · transparentes PNG für Logos',
    remove:'✕ Bild entfernen', uploading:'Wird hochgeladen …', uploaded:'✓ Bild hochgeladen', upErr:'Upload-Fehler: ', tooBig:'Datei zu gross (max 10 MB).',
    cta:'🛒 Mit meinem Design in den Warenkorb', needText:'Bitte gib zuerst deinen Text ein.', needAny:'Gib einen Text ein oder lade ein Bild hoch.',
    stillUp:'Bild lädt noch hoch – kurz warten …', noVar:'Variante nicht gefunden – bitte oben Grösse/Farbe wählen.', adding:'Wird hinzugefügt …', added:'✓ Im Warenkorb! Weiterleitung …', addErr:'Konnte nicht hinzufügen: ',
    front:'Vorne', back:'Hinten', pos:['Oben','Mitte','Unten'], fonts:['Modern Sans','Elegant Serif','Handschrift','Bold Display','Mono'],
    pText:'Text', pFont:'Schrift', pColor:'Farbe', pTextPos:'Text-Platz', pImg:'Bild/Logo', pImgPos:'Bild-Platz'
  };

  var FONTVALS=["'Helvetica Neue',Arial,sans-serif","Georgia,'Times New Roman',serif","'Brush Script MT','Segoe Script',cursive","'Arial Black','Helvetica Neue',sans-serif","'Courier New',monospace"];
  var FONTS=FONTVALS.map(function(v,i){ return {n:T.fonts[i], v:v}; });
  var COLORS=['#111111','#ffffff','#c1922f','#b3122b','#1e4fd6','#1c8a4b','#e84393','#000080'];
  var POSV=['20%','50%','78%']; var POS=POSV.map(function(v,i){ return {n:T.pos[i], v:v}; });
  var ADD_URL=(window.Shopify&&Shopify.routes&&Shopify.routes.cart_add_url)||'/cart/add.js';
  var CART_URL=(window.Shopify&&Shopify.routes&&Shopify.routes.cart_url)||'/cart';

  function el(t,a,h){ var e=document.createElement(t); if(a) for(var k in a) e.setAttribute(k,a[k]); if(h!=null) e.innerHTML=h; return e; }
  function findForm(){ return document.querySelector('form[action*="/cart/add"]')||null; }
  function getVariantId(f,fb){ if(f){ var i=f.querySelector('[name="id"]:checked')||f.querySelector('[name="id"]'); if(i&&i.value) return i.value; } return fb||null; }
  function fontName(v){ return (FONTS.filter(function(f){return f.v===v;})[0]||{}).n||T.fonts[0]; }
  function posName(v){ return (POS.filter(function(p){return p.v===v;})[0]||{}).n||T.pos[1]; }
  function upl(file,cb){ var fd=new FormData(); fd.append('file',file); fd.append('upload_preset',PRESET);
    fetch('https://api.cloudinary.com/v1_1/'+CLOUD+'/auto/upload',{method:'POST',body:fd}).then(function(r){return r.json();})
    .then(function(j){ j.secure_url?cb(null,j.secure_url):cb(new Error((j.error&&j.error.message)||'failed')); }).catch(cb); }
  function dd(){ return {mode:'text',text:'',font:FONTS[0].v,color:'#111111',size:30,pos:'50%',imgLocal:'',imgUrl:'',imgUploading:false,imgSize:55,imgPos:'50%'}; }

  function build(container){
    var imgFront=container.getAttribute('data-img-front')||container.getAttribute('data-img')||'';
    var imgBack=container.getAttribute('data-img-back')||'';
    var fallbackVar=container.getAttribute('data-variant')||'';
    var sides=[{k:'front',label:T.front,img:imgFront}];
    if(imgBack&&imgBack!==imgFront) sides.push({k:'back',label:T.back,img:imgBack});
    var state={active:'front',d:{front:dd(),back:dd()}};
    function cur(){ return state.d[state.active]; }
    function curImg(){ for(var i=0;i<sides.length;i++){ if(sides[i].k===state.active) return sides[i].img; } return imgFront; }

    container.innerHTML='';
    var wrap=el('div',{style:"border:1px solid #ece7df;border-radius:16px;overflow:hidden;background:#fff;font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:8px 0 16px;"});
    wrap.appendChild(el('div',{style:"background:#16151a;color:#fff;padding:12px 16px;font-weight:800;font-size:15px;"},'🎨 '+T.head));
    var pv=el('div',{style:"position:relative;width:100%;aspect-ratio:1/1;background:#f4f1ec center/cover no-repeat;"});
    var imgEl=el('img',{style:"position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;pointer-events:none;"});
    var txt=el('div',{style:"position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:86%;text-align:center;word-break:break-word;pointer-events:none;line-height:1.1;"});
    pv.appendChild(imgEl); pv.appendChild(txt); wrap.appendChild(pv);
    var body=el('div',{style:"padding:14px 16px;"});

    var sideBtns={};
    if(sides.length>1){
      var sw=el('div',{style:"display:flex;gap:8px;margin-bottom:14px;background:#f4f1ec;padding:5px;border-radius:12px;"});
      sides.forEach(function(s){ var b=el('button',{type:'button','data-s':s.k,style:"flex:1;padding:11px;border-radius:9px;border:none;font-weight:800;font-size:14px;cursor:pointer;background:"+(s.k==='front'?'#fff':'transparent')+";color:#16151a;box-shadow:"+(s.k==='front'?'0 1px 3px rgba(0,0,0,.12)':'none')+";"},(s.k==='front'?'👕 ':'🔄 ')+s.label); sideBtns[s.k]=b; sw.appendChild(b); });
      body.appendChild(sw);
      sw.addEventListener('click',function(e){ var b=e.target.closest('[data-s]'); if(b) setSide(b.getAttribute('data-s')); });
    }
    function row(l){ var r=el('div',{style:"margin-bottom:12px;"}); r.appendChild(el('div',{style:"font-size:12px;font-weight:700;color:#6b6b73;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;"},l)); return r; }

    var tabs=null,tT,tI;
    if(IMG_ENABLED){
      tabs=el('div',{style:"display:flex;gap:8px;margin-bottom:14px;"});
      tT=el('button',{type:'button','data-m':'text',style:"flex:1;padding:11px;border-radius:10px;border:1px solid #16151a;background:#16151a;color:#fff;font-weight:700;font-size:14px;cursor:pointer;"},T.tabText);
      tI=el('button',{type:'button','data-m':'image',style:"flex:1;padding:11px;border-radius:10px;border:1px solid #ddd;background:#fff;color:#16151a;font-weight:700;font-size:14px;cursor:pointer;"},T.tabImg);
      tabs.appendChild(tT); tabs.appendChild(tI); body.appendChild(tabs);
    }

    var pText=el('div');
    var ti=el('input',{type:'text',maxlength:'40',placeholder:T.ph,style:"width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;border-radius:10px;font-size:15px;margin-bottom:12px;"});
    pText.appendChild(ti);
    var rF=row(T.font); var fs=el('select',{style:"width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;font-size:14px;"});
    FONTS.forEach(function(f){ var o=el('option',{value:f.v}); o.textContent=f.n; o.style.fontFamily=f.v; fs.appendChild(o); }); rF.appendChild(fs); pText.appendChild(rF);
    var rC=row(T.color); var cw=el('div',{style:"display:flex;flex-wrap:wrap;gap:10px;"});
    COLORS.forEach(function(c){ cw.appendChild(el('button',{type:'button','data-c':c,style:"width:38px;height:38px;border-radius:50%;border:2px solid #e3e3e3;background:"+c+";cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;color:"+(c.toLowerCase()==='#ffffff'||c==='#c1922f'?'#111':'#fff')+";"},'')); }); rC.appendChild(cw); pText.appendChild(rC);
    var rS=row(T.size); var sl=el('input',{type:'range',min:'14',max:'64',value:'30',style:"width:100%;height:28px;"}); rS.appendChild(sl); pText.appendChild(rS);
    var rP=row(T.place); var pw=el('div',{style:"display:flex;gap:8px;"});
    POS.forEach(function(p){ pw.appendChild(el('button',{type:'button','data-p':p.v,style:"flex:1;padding:11px;border:1.5px solid #ddd;border-radius:10px;background:#fff;color:#16151a;font-weight:700;font-size:13px;cursor:pointer;"},p.n)); }); rP.appendChild(pw); pText.appendChild(rP);
    body.appendChild(pText);

    var pImage=el('div',{style:"display:none;"}), fi,ust,isl,ipw,riS,riP,up,rm;
    if(IMG_ENABLED){
      up=el('div',{style:"border:2px dashed #d8d2c7;border-radius:12px;padding:18px;text-align:center;cursor:pointer;background:#faf8f5;margin-bottom:10px;"});
      up.innerHTML="<div style='font-size:26px'>⬆️</div><div style='font-weight:700;font-size:14px;margin-top:4px'>"+T.upTitle+"</div><div style='font-size:12px;color:#6b6b73;margin-top:2px'>"+T.upHint+"</div>";
      fi=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp',style:"display:none;"}); up.appendChild(fi);
      ust=el('div',{style:"font-size:12.5px;text-align:center;min-height:16px;margin-bottom:6px;"});
      rm=el('button',{type:'button',style:"display:none;width:100%;padding:8px;border:1px solid #ddd;border-radius:9px;background:#fff;color:#b3122b;font-weight:700;font-size:13px;cursor:pointer;margin-bottom:10px;"},T.remove);
      riS=row(T.imgSize); isl=el('input',{type:'range',min:'25',max:'95',value:'55',style:"width:100%;height:28px;"}); riS.appendChild(isl); riS.style.display='none';
      riP=row(T.place); ipw=el('div',{style:"display:flex;gap:8px;"}); POS.forEach(function(p){ ipw.appendChild(el('button',{type:'button','data-ip':p.v,style:"flex:1;padding:11px;border:1.5px solid #ddd;border-radius:10px;background:#fff;color:#16151a;font-weight:700;font-size:13px;cursor:pointer;"},p.n)); }); riP.appendChild(ipw); riP.style.display='none';
      pImage.appendChild(up); pImage.appendChild(ust); pImage.appendChild(rm); pImage.appendChild(riS); pImage.appendChild(riP); body.appendChild(pImage);
      up.addEventListener('click',function(){ if(cur().imgUploading) return; fi.click(); });
      fi.addEventListener('change',function(){ var f=fi.files&&fi.files[0]; if(!f)return; if(f.size>10*1024*1024){ ust.style.color='#b3122b'; ust.textContent=T.tooBig; return; }
        var rd=new FileReader(); rd.onload=function(){ cur().imgLocal=rd.result; render(); }; rd.readAsDataURL(f);
        riS.style.display=''; riP.style.display=''; rm.style.display='block'; cur().imgUploading=true; cur().imgUrl=''; up.style.opacity='0.6'; up.style.pointerEvents='none'; ust.style.color='#6b6b73'; ust.textContent=T.uploading;
        upl(f,function(err,url){ cur().imgUploading=false; up.style.opacity='1'; up.style.pointerEvents=''; if(err){ ust.style.color='#b3122b'; ust.textContent=T.upErr+err.message; return; } cur().imgUrl=url; ust.style.color='#1c8a4b'; ust.textContent=T.uploaded; render(); }); });
      rm.addEventListener('click',function(){ var d=cur(); d.imgLocal=''; d.imgUrl=''; d.imgUploading=false; fi.value=''; riS.style.display='none'; riP.style.display='none'; rm.style.display='none'; ust.textContent=''; up.style.opacity='1'; up.style.pointerEvents=''; render(); });
      isl.addEventListener('input',function(){ cur().imgSize=parseInt(isl.value,10); render(); });
      ipw.addEventListener('click',function(e){ var b=e.target.closest('[data-ip]'); if(!b)return; cur().imgPos=b.getAttribute('data-ip'); paintPos(ipw,'data-ip',cur().imgPos); render(); });
      tabs.addEventListener('click',function(e){ var b=e.target.closest('[data-m]'); if(b){ cur().mode=b.getAttribute('data-m'); paintTabs(); render(); } });
    }

    var cta=el('button',{type:'button',style:"width:100%;padding:16px;border:none;border-radius:999px;background:#c1922f;color:#fff;font-weight:800;font-size:16px;cursor:pointer;margin-top:4px;"},T.cta);
    var msg=el('div',{style:"text-align:center;font-size:13px;margin-top:8px;min-height:18px;"});
    body.appendChild(cta); body.appendChild(msg); wrap.appendChild(body); container.appendChild(wrap);

    function paintPos(group,attr,val){ Array.prototype.forEach.call(group.children,function(x){ var on=x.getAttribute(attr)===val; x.style.border='1.5px solid '+(on?'#16151a':'#ddd'); x.style.background=on?'#16151a':'#fff'; x.style.color=on?'#fff':'#16151a'; }); }
    function paintSwatch(val){ Array.prototype.forEach.call(cw.children,function(x){ var on=x.getAttribute('data-c')===val; x.style.border='2px solid '+(on?'#16151a':'#e3e3e3'); x.style.transform=on?'scale(1.12)':'none'; x.textContent=on?'✓':''; }); }
    function paintTabs(){ if(!IMG_ENABLED)return; var m=cur().mode; tT.style.background=m==='text'?'#16151a':'#fff'; tT.style.color=m==='text'?'#fff':'#16151a'; tT.style.borderColor=m==='text'?'#16151a':'#ddd'; tI.style.background=m==='image'?'#16151a':'#fff'; tI.style.color=m==='image'?'#fff':'#16151a'; tI.style.borderColor=m==='image'?'#16151a':'#ddd'; pText.style.display=m==='text'?'':'none'; pImage.style.display=m==='image'?'':'none'; }

    function syncControls(){ var d=cur(); ti.value=d.text; fs.value=d.font; sl.value=d.size; paintSwatch(d.color); paintPos(pw,'data-p',d.pos);
      if(IMG_ENABLED){ if(d.imgLocal){ riS.style.display=''; riP.style.display=''; rm.style.display='block'; isl.value=d.imgSize; paintPos(ipw,'data-ip',d.imgPos); ust.textContent=d.imgUrl?T.uploaded:(d.imgUploading?T.uploading:''); ust.style.color=d.imgUrl?'#1c8a4b':'#6b6b73'; } else { riS.style.display='none'; riP.style.display='none'; rm.style.display='none'; ust.textContent=''; } paintTabs(); } }
    function setSide(k){ state.active=k; for(var s in sideBtns){ var on=s===k; sideBtns[s].style.background=on?'#fff':'transparent'; sideBtns[s].style.boxShadow=on?'0 1px 3px rgba(0,0,0,.12)':'none'; } syncControls(); render(); }

    function buildProps(){ var props={}; sides.forEach(function(s){ var d=state.d[s.k]; var pre=sides.length>1?(s.label+' · '):'';
      if(d.text.trim()){ props[pre+'🎨 '+T.pText]=d.text.trim(); props[pre+T.pFont]=fontName(d.font); props[pre+T.pColor]=d.color; props[pre+T.pTextPos]=posName(d.pos); }
      if(d.imgUrl){ props[pre+'🖼️ '+T.pImg]=d.imgUrl; props[pre+T.pImgPos]=posName(d.imgPos); } }); return props; }
    function syncFormInputs(){ var form=findForm(); if(!form) return; Array.prototype.forEach.call(form.querySelectorAll('input[data-lspod="1"]'),function(x){ if(x.parentNode) x.parentNode.removeChild(x); }); var props=buildProps(); for(var k in props){ var i=document.createElement('input'); i.type='hidden'; i.setAttribute('data-lspod','1'); i.name='properties['+k+']'; i.value=props[k]; form.appendChild(i); } }

    function render(){ pv.style.backgroundImage="url('"+curImg()+"')"; var d=cur();
      var showPh=(!IMG_ENABLED||d.mode==='text')&&!d.text.trim();
      txt.textContent=d.text.trim()?d.text:(showPh?T.phPrev:'');
      txt.style.fontFamily=d.font; txt.style.color=d.color; txt.style.fontSize=d.size+'px'; txt.style.fontWeight='800';
      txt.style.opacity=d.text.trim()?'1':(showPh?'0.4':'0'); txt.style.top=d.pos;
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
      var uploading=false, any=false; sides.forEach(function(s){ var d=state.d[s.k]; if(d.imgUploading) uploading=true; if(d.text.trim()||d.imgUrl) any=true; });
      if(uploading){ msg.style.color='#b3122b'; msg.textContent=T.stillUp; return; }
      if(!any){ msg.style.color='#b3122b'; msg.textContent=IMG_ENABLED?T.needAny:T.needText; return; }
      var form=findForm(), vid=getVariantId(form,fallbackVar);
      if(!vid){ msg.style.color='#b3122b'; msg.textContent=T.noVar; return; }
      var props=buildProps();
      cta.disabled=true; cta.style.opacity='0.7'; msg.style.color='#6b6b73'; msg.textContent=T.adding;
      fetch(ADD_URL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({id:vid,quantity:1,properties:props})})
        .then(function(r){ if(!r.ok) return r.json().then(function(j){throw new Error(j.description||'Fehler');}); return r.json(); })
        .then(function(){ msg.style.color='#1c8a4b'; msg.textContent=T.added; window.location.href=CART_URL; })
        .catch(function(err){ cta.disabled=false; cta.style.opacity='1'; msg.style.color='#b3122b'; msg.textContent=T.addErr+err.message; });
    });

    syncControls(); render();
  }

  function initAll(){ var n=document.querySelectorAll('.lspod-designer'); Array.prototype.forEach.call(n,function(x){ if(x.getAttribute('data-init'))return; x.setAttribute('data-init','1'); try{ build(x); }catch(e){} }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
})();
