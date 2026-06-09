/* LuxeStyle — POD Gestalten-Widget (autonom, ohne Drittanbieter-App)
 * <script src> in POD-Produktbeschreibungen. Für jedes
 * <div class="lspod-designer" data-img="<produktbild>" [data-variant]> rendert es ein
 * Design-Tool mit Live-Vorschau: TEXT (Schrift/Farbe/Grösse/Platzierung) und – sobald
 * Cloudinary konfiguriert ist – LOGO/BILD-Upload. Add-to-cart legt die gewählte Variante
 * MIT dem Design als Bestell-Eigenschaften (properties) per /cart/add.js in den Warenkorb.
 *
 * Bild-Upload aktivieren: CLOUD + PRESET (öffentliche Cloudinary-Werte) unten setzen.
 */
(function(){
  if (window.__lspodDesignerLoaded) return; window.__lspodDesignerLoaded = true;

  // === Bild/Logo-Upload: öffentliche Cloudinary-Werte (unsigned) ===
  var CLOUD  = '';   // z.B. 'luxestyle'  (Cloud Name)
  var PRESET = '';   // z.B. 'luxe_unsigned' (Unsigned Upload Preset)
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

  function el(tag, attrs, html){ var e=document.createElement(tag); if(attrs) for(var k in attrs) e.setAttribute(k, attrs[k]); if(html!=null) e.innerHTML=html; return e; }
  function findForm(){ return document.querySelector('form[action*="/cart/add"]') || null; }
  function getVariantId(form, fb){ if(form){ var i=form.querySelector('[name="id"]:checked')||form.querySelector('[name="id"]'); if(i&&i.value) return i.value; } return fb||null; }

  function uploadToCloudinary(file, cb){
    var fd=new FormData(); fd.append('file',file); fd.append('upload_preset',PRESET);
    fetch('https://api.cloudinary.com/v1_1/'+CLOUD+'/auto/upload',{method:'POST',body:fd})
      .then(function(r){return r.json();})
      .then(function(j){ if(j.secure_url) cb(null,j.secure_url); else cb(new Error((j.error&&j.error.message)||'Upload fehlgeschlagen')); })
      .catch(cb);
  }

  function build(container){
    var img = container.getAttribute('data-img') || '';
    var fallbackVar = container.getAttribute('data-variant') || '';
    var state = { mode:'text', text:'', font:FONTS[0].v, color:'#111111', size:30, pos:'50%',
                  imgLocal:'', imgUrl:'', imgUploading:false, imgSize:55, imgPos:'50%' };

    container.innerHTML='';
    var wrap=el('div',{style:"border:1px solid #ece7df;border-radius:16px;overflow:hidden;background:#fff;font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:8px 0 16px;"});
    wrap.appendChild(el('div',{style:"background:#16151a;color:#fff;padding:12px 16px;font-weight:800;font-size:15px;"},'🎨 Jetzt selbst gestalten'));

    // Vorschau
    var pv=el('div',{style:"position:relative;width:100%;aspect-ratio:1/1;background:#f4f1ec url('"+img+"') center/cover no-repeat;"});
    var imgEl=el('img',{style:"position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:90%;display:none;pointer-events:none;"});
    var txt=el('div',{style:"position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:86%;text-align:center;word-break:break-word;pointer-events:none;line-height:1.1;"});
    pv.appendChild(imgEl); pv.appendChild(txt); wrap.appendChild(pv);

    var body=el('div',{style:"padding:14px 16px;"});

    // Tabs (nur wenn Bild aktiv)
    var tabs=null;
    if(IMG_ENABLED){
      tabs=el('div',{style:"display:flex;gap:8px;margin-bottom:14px;"});
      var tT=el('button',{type:'button','data-m':'text',style:"flex:1;padding:10px;border-radius:10px;border:1px solid #16151a;background:#16151a;color:#fff;font-weight:700;font-size:14px;cursor:pointer;"},'✍️ Text');
      var tI=el('button',{type:'button','data-m':'image',style:"flex:1;padding:10px;border-radius:10px;border:1px solid #ddd;background:#fff;color:#16151a;font-weight:700;font-size:14px;cursor:pointer;"},'🖼️ Logo / Bild');
      tabs.appendChild(tT); tabs.appendChild(tI); body.appendChild(tabs);
    }

    function row(label){ var r=el('div',{style:"margin-bottom:12px;"}); r.appendChild(el('div',{style:"font-size:12px;font-weight:700;color:#6b6b73;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;"},label)); return r; }

    // ---- TEXT-Panel ----
    var pText=el('div');
    var ti=el('input',{type:'text',maxlength:'40',placeholder:'Dein Text, Name oder Spruch …',style:"width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #ddd;border-radius:10px;font-size:15px;margin-bottom:12px;"});
    pText.appendChild(ti);
    var rF=row('Schrift'); var fs=el('select',{style:"width:100%;padding:9px 10px;border:1px solid #ddd;border-radius:10px;font-size:14px;"});
    FONTS.forEach(function(f){ var o=el('option',{value:f.v}); o.textContent=f.n; o.style.fontFamily=f.v; fs.appendChild(o); }); rF.appendChild(fs); pText.appendChild(rF);
    var rC=row('Farbe'); var cw=el('div',{style:"display:flex;flex-wrap:wrap;gap:8px;"});
    COLORS.forEach(function(c){ cw.appendChild(el('button',{type:'button','data-c':c,style:"width:30px;height:30px;border-radius:50%;border:2px solid "+(c==state.color?'#16151a':'#e3e3e3')+";background:"+c+";cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);"})); }); rC.appendChild(cw); pText.appendChild(rC);
    var rS=row('Grösse'); var sl=el('input',{type:'range',min:'14',max:'64',value:'30',style:"width:100%;"}); rS.appendChild(sl); pText.appendChild(rS);
    var rP=row('Platzierung'); var pw=el('div',{style:"display:flex;gap:8px;"});
    POS.forEach(function(p){ var b=el('button',{type:'button','data-p':p.v,style:"flex:1;padding:9px;border:1px solid "+(p.v==state.pos?'#16151a':'#ddd')+";border-radius:10px;background:"+(p.v==state.pos?'#16151a':'#fff')+";color:"+(p.v==state.pos?'#fff':'#16151a')+";font-weight:700;font-size:13px;cursor:pointer;"}); b.textContent=p.n; pw.appendChild(b); }); rP.appendChild(pw); pText.appendChild(rP);
    body.appendChild(pText);

    // ---- IMAGE-Panel ----
    var pImage=el('div',{style:"display:none;"});
    if(IMG_ENABLED){
      var up=el('div',{style:"border:2px dashed #d8d2c7;border-radius:12px;padding:18px;text-align:center;cursor:pointer;background:#faf8f5;margin-bottom:12px;"});
      up.innerHTML="<div style='font-size:26px'>⬆️</div><div style='font-weight:700;font-size:14px;margin-top:4px'>Logo oder Bild hochladen</div><div style='font-size:12px;color:#6b6b73;margin-top:2px'>PNG/JPG · transparentes PNG für Logos</div>";
      var fi=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp',style:"display:none;"});
      up.appendChild(fi);
      var ust=el('div',{style:"font-size:12.5px;text-align:center;min-height:16px;margin-bottom:10px;"});
      var riS=row('Bildgrösse'); var isl=el('input',{type:'range',min:'25',max:'95',value:'55',style:"width:100%;"}); riS.appendChild(isl); riS.style.display='none';
      var riP=row('Platzierung'); var ipw=el('div',{style:"display:flex;gap:8px;"});
      POS.forEach(function(p){ var b=el('button',{type:'button','data-ip':p.v,style:"flex:1;padding:9px;border:1px solid "+(p.v==state.imgPos?'#16151a':'#ddd')+";border-radius:10px;background:"+(p.v==state.imgPos?'#16151a':'#fff')+";color:"+(p.v==state.imgPos?'#fff':'#16151a')+";font-weight:700;font-size:13px;cursor:pointer;"}); b.textContent=p.n; ipw.appendChild(b); }); riP.appendChild(ipw); riP.style.display='none';
      pImage.appendChild(up); pImage.appendChild(ust); pImage.appendChild(riS); pImage.appendChild(riP);
      body.appendChild(pImage);

      up.addEventListener('click', function(){ fi.click(); });
      fi.addEventListener('change', function(){
        var f=fi.files&&fi.files[0]; if(!f) return;
        if(f.size>10*1024*1024){ ust.style.color='#b3122b'; ust.textContent='Datei zu gross (max 10 MB).'; return; }
        var rd=new FileReader(); rd.onload=function(){ state.imgLocal=rd.result; render(); }; rd.readAsDataURL(f);
        riS.style.display=''; riP.style.display='';
        state.imgUploading=true; state.imgUrl=''; ust.style.color='#6b6b73'; ust.textContent='Wird hochgeladen …';
        uploadToCloudinary(f, function(err,url){
          state.imgUploading=false;
          if(err){ ust.style.color='#b3122b'; ust.textContent='Upload-Fehler: '+err.message; return; }
          state.imgUrl=url; ust.style.color='#1c8a4b'; ust.textContent='✓ Bild hochgeladen';
        });
      });
      isl.addEventListener('input', function(){ state.imgSize=parseInt(isl.value,10); render(); });
      ipw.addEventListener('click', function(e){ var b=e.target.closest('[data-ip]'); if(!b)return; state.imgPos=b.getAttribute('data-ip'); Array.prototype.forEach.call(ipw.children,function(x){x.style.border='1px solid #ddd';x.style.background='#fff';x.style.color='#16151a';}); b.style.border='1px solid #16151a';b.style.background='#16151a';b.style.color='#fff'; render(); });

      tabs.addEventListener('click', function(e){ var b=e.target.closest('[data-m]'); if(!b)return; state.mode=b.getAttribute('data-m');
        tT.style.background=state.mode==='text'?'#16151a':'#fff'; tT.style.color=state.mode==='text'?'#fff':'#16151a'; tT.style.borderColor=state.mode==='text'?'#16151a':'#ddd';
        tI.style.background=state.mode==='image'?'#16151a':'#fff'; tI.style.color=state.mode==='image'?'#fff':'#16151a'; tI.style.borderColor=state.mode==='image'?'#16151a':'#ddd';
        pText.style.display=state.mode==='text'?'':'none'; pImage.style.display=state.mode==='image'?'':'none';
      });
    }

    // CTA
    var cta=el('button',{type:'button',style:"width:100%;padding:15px;border:none;border-radius:999px;background:#c1922f;color:#fff;font-weight:800;font-size:16px;cursor:pointer;margin-top:4px;"},'🛒 Mit meinem Design in den Warenkorb');
    var msg=el('div',{style:"text-align:center;font-size:13px;margin-top:8px;min-height:18px;"});
    body.appendChild(cta); body.appendChild(msg); wrap.appendChild(body); container.appendChild(wrap);

    function render(){
      // Text
      txt.textContent = state.text || (state.mode==='text'?'Dein Design':'');
      txt.style.fontFamily=state.font; txt.style.color=state.color; txt.style.fontSize=state.size+'px';
      txt.style.fontWeight='800'; txt.style.opacity=state.text?'1':(state.mode==='text'?'0.45':'0'); txt.style.top=state.pos;
      txt.style.textShadow=(state.color.toLowerCase()==='#ffffff')?'0 1px 3px rgba(0,0,0,.45)':'none';
      // Bild
      if(state.imgLocal){ imgEl.src=state.imgLocal; imgEl.style.display='block'; imgEl.style.width=state.imgSize+'%'; imgEl.style.maxWidth=state.imgSize+'%'; imgEl.style.top=state.imgPos; }
      else { imgEl.style.display='none'; }
    }
    render();

    ti.addEventListener('input', function(){ state.text=ti.value; render(); });
    fs.addEventListener('change', function(){ state.font=fs.value; render(); });
    sl.addEventListener('input', function(){ state.size=parseInt(sl.value,10); render(); });
    cw.addEventListener('click', function(e){ var b=e.target.closest('[data-c]'); if(!b)return; state.color=b.getAttribute('data-c'); Array.prototype.forEach.call(cw.children,function(x){x.style.border='2px solid #e3e3e3';}); b.style.border='2px solid #16151a'; render(); });
    pw.addEventListener('click', function(e){ var b=e.target.closest('[data-p]'); if(!b)return; state.pos=b.getAttribute('data-p'); Array.prototype.forEach.call(pw.children,function(x){x.style.border='1px solid #ddd';x.style.background='#fff';x.style.color='#16151a';}); b.style.border='1px solid #16151a';b.style.background='#16151a';b.style.color='#fff'; render(); });

    cta.addEventListener('click', function(){
      var hasText=!!state.text.trim(), hasImg=!!state.imgUrl;
      if(state.imgUploading){ msg.style.color='#b3122b'; msg.textContent='Bild lädt noch hoch – kurz warten …'; return; }
      if(!hasText && !hasImg){ msg.style.color='#b3122b'; msg.textContent=IMG_ENABLED?'Gib einen Text ein oder lade ein Bild hoch.':'Bitte gib zuerst deinen Text ein.'; return; }
      var form=findForm(); var vid=getVariantId(form, fallbackVar);
      if(!vid){ msg.style.color='#b3122b'; msg.textContent='Variante nicht gefunden – bitte oben Grösse/Farbe wählen.'; return; }
      var props={};
      if(hasText){ props['🎨 Design-Text']=state.text.trim(); props['Schrift']=(FONTS.filter(function(f){return f.v===state.font;})[0]||{}).n||'Standard'; props['Farbe']=state.color; props['Text-Platzierung']=(POS.filter(function(p){return p.v===state.pos;})[0]||{}).n||'Mitte'; }
      if(hasImg){ props['🖼️ Bild/Logo']=state.imgUrl; props['Bild-Platzierung']=(POS.filter(function(p){return p.v===state.imgPos;})[0]||{}).n||'Mitte'; }
      cta.disabled=true; cta.style.opacity='0.7'; msg.style.color='#6b6b73'; msg.textContent='Wird hinzugefügt …';
      fetch('/cart/add.js',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({id:vid,quantity:1,properties:props})})
        .then(function(r){ if(!r.ok) return r.json().then(function(j){throw new Error(j.description||'Fehler');}); return r.json(); })
        .then(function(){ msg.style.color='#1c8a4b'; msg.textContent='✓ Im Warenkorb! Weiterleitung …'; window.location.href='/cart'; })
        .catch(function(err){ cta.disabled=false; cta.style.opacity='1'; msg.style.color='#b3122b'; msg.textContent='Konnte nicht hinzufügen: '+err.message; });
    });
  }

  function initAll(){ var n=document.querySelectorAll('.lspod-designer'); Array.prototype.forEach.call(n,function(x){ if(x.getAttribute('data-init'))return; x.setAttribute('data-init','1'); try{ build(x); }catch(e){} }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
})();
