/* LuxeStyle — POD Gestalten-Widget v6 (freier Editor: verschieben/skalieren/drehen),
 * zweisprachig DE/EN, ohne Drittanbieter-App.
 * <script src> in POD-Produktbeschreibungen. Für jedes
 *   <div class="lspod-designer" data-img-front="…" data-img-back="…" [data-variant]>
 * rendert es ein Design-Tool: Umschalter VORNE/HINTEN, je Seite eine LAYER-Leinwand mit
 *   • + Text  (Schrift/Farbe wählbar)
 *   • + Logo/Bild hochladen  (sobald Cloudinary konfiguriert)
 *   • + Sticker  (KI-Bibliothek, social/stickers/index.json)
 * Jedes Element lässt sich frei VERSCHIEBEN (Drag), SKALIEREN + DREHEN (Eck-Handle / Pinch).
 * Add-to-cart legt die gewählte Variante mit dem Design als Bestell-Eigenschaften ab und – sobald
 * Cloudinary gesetzt – bäckt eine echte DRUCKDATEI (PNG) je bedruckter Seite und hängt deren URL an.
 *
 * Aktivieren von Bild-Upload/Druckdatei: CLOUD + PRESET (öffentliche Cloudinary-Werte) setzen.
 */
(function(){
  if (window.__lspodDesignerLoaded) return; window.__lspodDesignerLoaded = true;

  var CLOUD='dwyi6kkrl', PRESET='pigto8ba', IMG_ENABLED=!!(CLOUD&&PRESET);
  var STICKER_BASE='https://abannews.com/social/stickers/';
  var STICKER_INDEX=STICKER_BASE+'index.json';
  var REF=1200; // Referenz-/Druckauflösung (px) der quadratischen Designfläche

  var locale=((window.Shopify&&Shopify.locale)||document.documentElement.lang||'de').toLowerCase();
  var EN=locale.indexOf('en')===0;
  var T = EN ? {
    head:'Design it yourself', ph:'Your text …',
    addText:'➕ Text', addImg:'🖼️ Image', addSticker:'⭐ Sticker',
    font:'Font', color:'Color', stickers:'Pick a sticker',
    front:'Front', back:'Back', tapHint:'Tip: drag to move · pull the corner to resize & rotate',
    upHint:'PNG/JPG · transparent PNG for logos', uploading:'Uploading …', upErr:'Upload error: ', tooBig:'File too large (max 10 MB).',
    cta:'🛒 Add my design to cart', empty:'Add text, an image or a sticker first.',
    baking:'Preparing print file …', adding:'Adding …', added:'✓ Added! Redirecting …', addErr:'Could not add: ', stillUp:'Image still uploading – please wait …', noVar:'Please select a size/color above first.',
    fonts:['Modern Sans','Elegant Serif','Handwriting','Bold Display','Mono'],
    pSide:['Front','Back'], pPrintFile:'🖼️ Print file', pDesign:'🎨 Design', layerText:'Text', layerImage:'Image', layerSticker:'Sticker'
  } : {
    head:'Jetzt selbst gestalten', ph:'Dein Text …',
    addText:'➕ Text', addImg:'🖼️ Bild', addSticker:'⭐ Sticker',
    font:'Schrift', color:'Farbe', stickers:'Sticker wählen',
    front:'Vorne', back:'Hinten', tapHint:'Tipp: ziehen zum Verschieben · an der Ecke skalieren & drehen',
    upHint:'PNG/JPG · transparentes PNG für Logos', uploading:'Wird hochgeladen …', upErr:'Upload-Fehler: ', tooBig:'Datei zu gross (max 10 MB).',
    cta:'🛒 Mit meinem Design in den Warenkorb', empty:'Füge zuerst Text, ein Bild oder einen Sticker hinzu.',
    baking:'Druckdatei wird erstellt …', adding:'Wird hinzugefügt …', added:'✓ Im Warenkorb! Weiterleitung …', addErr:'Konnte nicht hinzufügen: ', stillUp:'Bild lädt noch hoch – kurz warten …', noVar:'Variante nicht gefunden – bitte oben Grösse/Farbe wählen.',
    fonts:['Modern Sans','Elegant Serif','Handschrift','Bold Display','Mono'],
    pSide:['Vorne','Hinten'], pPrintFile:'🖼️ Druckdatei', pDesign:'🎨 Design', layerText:'Text', layerImage:'Bild', layerSticker:'Sticker'
  };

  var FONTVALS=["'Helvetica Neue',Arial,sans-serif","Georgia,'Times New Roman',serif","'Brush Script MT','Segoe Script',cursive","'Arial Black','Helvetica Neue',sans-serif","'Courier New',monospace"];
  // Canvas-taugliche Font-Strings (Web-sichere Familien) parallel zu FONTVALS, {S}=Pixel
  var FONTCANVAS=["bold {S}px Arial,Helvetica,sans-serif","bold {S}px Georgia,'Times New Roman',serif","{S}px 'Brush Script MT','Segoe Script',cursive","900 {S}px 'Arial Black',Arial,sans-serif","bold {S}px 'Courier New',monospace"];
  var FONTS=FONTVALS.map(function(v,i){ return {n:T.fonts[i], v:v, c:FONTCANVAS[i]}; });
  var COLORS=['#111111','#ffffff','#c1922f','#b3122b','#1e4fd6','#1c8a4b','#e84393','#000080'];
  var ADD_URL=(window.Shopify&&Shopify.routes&&Shopify.routes.cart_add_url)||'/cart/add.js';
  var CART_URL=(window.Shopify&&Shopify.routes&&Shopify.routes.cart_url)||'/cart';

  function el(t,a,h){ var e=document.createElement(t); if(a) for(var k in a) e.setAttribute(k,a[k]); if(h!=null) e.innerHTML=h; return e; }
  function findForm(){ return document.querySelector('form[action*="/cart/add"]')||null; }
  function getVariantId(f,fb){ if(f){ var i=f.querySelector('[name="id"]:checked')||f.querySelector('[name="id"]'); if(i&&i.value) return i.value; } return fb||null; }
  function fontByVal(v){ return FONTS.filter(function(f){return f.v===v;})[0]||FONTS[0]; }
  // Cloudinary: Datei-Upload (eigenes Bild) bzw. Blob-Upload (gebackene Druckdatei)
  function uplFile(file,cb){ var fd=new FormData(); fd.append('file',file); fd.append('upload_preset',PRESET);
    fetch('https://api.cloudinary.com/v1_1/'+CLOUD+'/auto/upload',{method:'POST',body:fd}).then(function(r){return r.json();})
    .then(function(j){ j.secure_url?cb(null,j.secure_url):cb(new Error((j.error&&j.error.message)||'failed')); }).catch(cb); }
  function uplBlob(blob,cb){ var fd=new FormData(); fd.append('file',blob); fd.append('upload_preset',PRESET);
    fetch('https://api.cloudinary.com/v1_1/'+CLOUD+'/auto/upload',{method:'POST',body:fd}).then(function(r){return r.json();})
    .then(function(j){ j.secure_url?cb(null,j.secure_url):cb(new Error((j.error&&j.error.message)||'failed')); }).catch(cb); }
  function corsUrl(u){ // fürs Canvas-Backen: Sticker (abannews) über Cloudinary-Fetch laden → CORS ok
    if(CLOUD && u.indexOf('abannews.com')>=0) return 'https://res.cloudinary.com/'+CLOUD+'/image/fetch/'+encodeURIComponent(u);
    return u; }

  var UID=0;
  function build(container){
    var imgFront=container.getAttribute('data-img-front')||container.getAttribute('data-img')||'';
    var imgBack=container.getAttribute('data-img-back')||'';
    var fallbackVar=container.getAttribute('data-variant')||'';
    var sides=[{k:'front',label:T.front,img:imgFront}];
    if(imgBack&&imgBack!==imgFront) sides.push({k:'back',label:T.back,img:imgBack});
    // state.layers[side] = [ {id,type,text,font,color, src,printUrl,uploading, cx,cy,scale,rot} ]
    var state={active:'front', layers:{front:[],back:[]}, sel:null};
    function curLayers(){ return state.layers[state.active]; }
    function curImg(){ for(var i=0;i<sides.length;i++){ if(sides[i].k===state.active) return sides[i].img; } return imgFront; }
    function findLayer(id){ var a=curLayers(); for(var i=0;i<a.length;i++) if(a[i].id===id) return a[i]; return null; }

    container.innerHTML='';
    var wrap=el('div',{style:"border:1px solid #ece7df;border-radius:16px;overflow:hidden;background:#fff;font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:8px 0 16px;"});
    wrap.appendChild(el('div',{style:"background:#16151a;color:#fff;padding:12px 16px;font-weight:800;font-size:15px;"},'🎨 '+T.head));

    // ---- Vorschau / Leinwand ----
    var stage=el('div',{style:"position:relative;width:100%;aspect-ratio:1/1;background:#f4f1ec center/cover no-repeat;touch-action:none;user-select:none;overflow:hidden;"});
    wrap.appendChild(stage);
    wrap.appendChild(el('div',{style:"font-size:11.5px;color:#8a8a90;padding:6px 16px 0;text-align:center;"},T.tapHint));

    var body=el('div',{style:"padding:12px 16px 16px;"});

    // Seiten-Umschalter
    var sideBtns={};
    if(sides.length>1){
      var sw=el('div',{style:"display:flex;gap:8px;margin-bottom:12px;background:#f4f1ec;padding:5px;border-radius:12px;"});
      sides.forEach(function(s){ var b=el('button',{type:'button','data-s':s.k,style:"flex:1;padding:11px;border-radius:9px;border:none;font-weight:800;font-size:14px;cursor:pointer;background:"+(s.k==='front'?'#fff':'transparent')+";color:#16151a;box-shadow:"+(s.k==='front'?'0 1px 3px rgba(0,0,0,.12)':'none')+";"},(s.k==='front'?'👕 ':'🔄 ')+s.label); sideBtns[s.k]=b; sw.appendChild(b); });
      body.appendChild(sw);
      sw.addEventListener('click',function(e){ var b=e.target.closest('[data-s]'); if(b) setSide(b.getAttribute('data-s')); });
    }

    // Werkzeugleiste
    var tools=el('div',{style:"display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;"});
    function toolBtn(label){ return el('button',{type:'button',style:"flex:1;min-width:90px;padding:11px 8px;border-radius:10px;border:1.5px solid #16151a;background:#16151a;color:#fff;font-weight:800;font-size:14px;cursor:pointer;"},label); }
    var btnText=toolBtn(T.addText), btnSticker=toolBtn(T.addSticker);
    tools.appendChild(btnText); tools.appendChild(btnSticker);
    var btnImg=null;
    if(IMG_ENABLED){ btnImg=toolBtn(T.addImg); tools.appendChild(btnImg); }
    body.appendChild(tools);

    // Kontextleiste (Schrift/Farbe für aktives Text-Layer)
    var ctx=el('div',{style:"display:none;background:#faf8f5;border:1px solid #ece7df;border-radius:12px;padding:10px;margin-bottom:10px;"});
    var ctxIn=el('input',{type:'text',maxlength:'40',placeholder:T.ph,style:"width:100%;box-sizing:border-box;padding:10px;border:1px solid #ddd;border-radius:9px;font-size:15px;margin-bottom:8px;"});
    var ctxFont=el('select',{style:"width:100%;padding:9px;border:1px solid #ddd;border-radius:9px;font-size:14px;margin-bottom:8px;"});
    FONTS.forEach(function(f){ var o=el('option',{value:f.v}); o.textContent=f.n; o.style.fontFamily=f.v; ctxFont.appendChild(o); });
    var ctxCw=el('div',{style:"display:flex;flex-wrap:wrap;gap:8px;"});
    COLORS.forEach(function(c){ ctxCw.appendChild(el('button',{type:'button','data-c':c,style:"width:32px;height:32px;border-radius:50%;border:2px solid #e3e3e3;background:"+c+";cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);color:"+(c.toLowerCase()==='#ffffff'||c==='#c1922f'?'#111':'#fff')+";font-size:15px;line-height:1;"},'')); });
    ctx.appendChild(ctxIn); ctx.appendChild(ctxFont); ctx.appendChild(ctxCw); body.appendChild(ctx);

    // Sticker-Bibliothek (Panel)
    var lib=el('div',{style:"display:none;background:#fff;border:1px solid #ece7df;border-radius:12px;padding:10px;margin-bottom:10px;max-height:240px;overflow:auto;"});
    var libHead=el('div',{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"});
    libHead.appendChild(el('div',{style:"font-weight:800;font-size:14px;"},T.stickers));
    var libClose=el('button',{type:'button',style:"border:none;background:#f0ece4;border-radius:8px;padding:5px 10px;font-weight:700;font-size:12px;cursor:pointer;"},'✕');
    libHead.appendChild(libClose); lib.appendChild(libHead);
    var libGrid=el('div',{style:"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;"});
    lib.appendChild(libGrid); body.appendChild(lib);
    libClose.addEventListener('click',function(){ lib.style.display='none'; });

    // Bild-Upload (verstecktes File-Input)
    var fi=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp',style:"display:none;"});
    body.appendChild(fi);

    var cta=el('button',{type:'button',style:"width:100%;padding:16px;border:none;border-radius:999px;background:#c1922f;color:#fff;font-weight:800;font-size:16px;cursor:pointer;margin-top:4px;"},T.cta);
    var msg=el('div',{style:"text-align:center;font-size:13px;margin-top:8px;min-height:18px;"});
    body.appendChild(cta); body.appendChild(msg); wrap.appendChild(body); container.appendChild(wrap);

    // ---------- Layer-Render ----------
    var nodes={}; // id -> {root, content, frame, handle, del}
    function stagePx(){ var r=stage.getBoundingClientRect(); return {w:r.width||1,h:r.height||1,r:r}; }

    function makeNode(layer){
      var root=el('div',{'data-lid':layer.id,style:"position:absolute;left:0;top:0;transform-origin:center center;cursor:grab;will-change:transform;"});
      var content;
      if(layer.type==='text'){ content=el('div',{style:"white-space:pre;font-weight:800;line-height:1.05;text-align:center;pointer-events:none;"}); }
      else { content=el('img',{style:"display:block;pointer-events:none;-webkit-user-drag:none;"}); content.src=layer.src; }
      root.appendChild(content);
      var frame=el('div',{style:"position:absolute;inset:-6px;border:1.5px dashed #16151a;border-radius:6px;display:none;pointer-events:none;"});
      var handle=el('div',{style:"position:absolute;right:-13px;bottom:-13px;width:26px;height:26px;border-radius:50%;background:#16151a;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);display:none;cursor:nwse-resize;touch-action:none;color:#fff;font-size:12px;line-height:22px;text-align:center;"},'⤡');
      var del=el('div',{style:"position:absolute;left:-13px;top:-13px;width:26px;height:26px;border-radius:50%;background:#b3122b;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);display:none;cursor:pointer;font-size:13px;line-height:22px;text-align:center;font-weight:900;touch-action:none;"},'✕');
      root.appendChild(frame); root.appendChild(handle); root.appendChild(del);
      stage.appendChild(root);
      nodes[layer.id]={root:root,content:content,frame:frame,handle:handle,del:del};
      attachGestures(layer,root,handle,del);
      return nodes[layer.id];
    }

    function layoutNode(layer){
      var n=nodes[layer.id]; if(!n) return; var sp=stagePx();
      if(layer.type==='text'){
        n.content.textContent=layer.text||T.ph;
        var f=fontByVal(layer.font);
        n.content.style.fontFamily=f.v; n.content.style.color=layer.color;
        n.content.style.fontSize=(layer.scale*sp.w*0.12)+'px';
        n.content.style.opacity=layer.text?'1':'0.45';
        n.content.style.textShadow=(layer.color.toLowerCase()==='#ffffff')?'0 1px 3px rgba(0,0,0,.45)':'none';
      } else {
        n.content.style.width=(layer.scale*sp.w*0.5)+'px'; n.content.style.height='auto';
      }
      var x=layer.cx*sp.w, y=layer.cy*sp.h;
      n.root.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-50%) rotate('+layer.rot+'deg)';
    }

    function select(id){
      state.sel=id;
      for(var k in nodes){ var on=(k===id); nodes[k].frame.style.display=on?'block':'none'; nodes[k].handle.style.display=on?'block':'none'; nodes[k].del.style.display=on?'block':'none'; nodes[k].root.style.zIndex=on?'5':'1'; }
      var ly=findLayer(id);
      if(ly&&ly.type==='text'){ ctx.style.display='block'; ctxIn.value=ly.text||''; ctxFont.value=ly.font; paintCtxSwatch(ly.color); }
      else ctx.style.display='none';
      syncFormInputs();
    }
    function deselect(){ state.sel=null; for(var k in nodes){ nodes[k].frame.style.display='none'; nodes[k].handle.style.display='none'; nodes[k].del.style.display='none'; } ctx.style.display='none'; }
    function paintCtxSwatch(val){ Array.prototype.forEach.call(ctxCw.children,function(x){ var on=x.getAttribute('data-c')===val; x.style.border='2px solid '+(on?'#16151a':'#e3e3e3'); x.style.transform=on?'scale(1.12)':'none'; x.textContent=on?'✓':''; }); }

    // ---------- Gesten: Drag / Resize+Rotate / Pinch ----------
    function attachGestures(layer,root,handle,del){
      var ptrs={}; var start=null;
      function center(){ var sp=stagePx(); return {x:layer.cx*sp.w+sp.r.left, y:layer.cy*sp.h+sp.r.top}; }
      function onDown(e,viaHandle){
        e.preventDefault(); e.stopPropagation(); select(layer.id);
        try{ (viaHandle?handle:root).setPointerCapture(e.pointerId); }catch(_){ }
        ptrs[e.pointerId]={x:e.clientX,y:e.clientY,handle:viaHandle};
        var ids=Object.keys(ptrs);
        if(ids.length===2){ var a=ptrs[ids[0]],b=ptrs[ids[1]];
          start={mode:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y)||1,ang0:Math.atan2(b.y-a.y,b.x-a.x),scale0:layer.scale,rot0:layer.rot};
        } else if(viaHandle){ var c=center();
          start={mode:'transform',cx:c.x,cy:c.y,d0:Math.hypot(e.clientX-c.x,e.clientY-c.y)||1,ang0:Math.atan2(e.clientY-c.y,e.clientX-c.x),scale0:layer.scale,rot0:layer.rot};
        } else { var sp=stagePx();
          start={mode:'drag',px:e.clientX,py:e.clientY,cx0:layer.cx,cy0:layer.cy,sw:sp.w,sh:sp.h}; }
      }
      function onMove(e){
        if(!start || !(e.pointerId in ptrs)) return; e.preventDefault();
        ptrs[e.pointerId].x=e.clientX; ptrs[e.pointerId].y=e.clientY;
        if(start.mode==='pinch'){ var ids=Object.keys(ptrs); if(ids.length<2) return; var a=ptrs[ids[0]],b=ptrs[ids[1]];
          var d=Math.hypot(a.x-b.x,a.y-b.y), ang=Math.atan2(b.y-a.y,b.x-a.x);
          layer.scale=Math.max(0.06,Math.min(3,start.scale0*(d/start.d0)));
          layer.rot=start.rot0+(ang-start.ang0)*180/Math.PI;
        } else if(start.mode==='transform'){ var d2=Math.hypot(e.clientX-start.cx,e.clientY-start.cy), ang2=Math.atan2(e.clientY-start.cy,e.clientX-start.cx);
          layer.scale=Math.max(0.06,Math.min(3,start.scale0*(d2/start.d0)));
          layer.rot=start.rot0+(ang2-start.ang0)*180/Math.PI;
        } else { layer.cx=Math.max(0,Math.min(1,start.cx0+(e.clientX-start.px)/start.sw));
          layer.cy=Math.max(0,Math.min(1,start.cy0+(e.clientY-start.py)/start.sh)); }
        layoutNode(layer);
      }
      function onUp(e){ delete ptrs[e.pointerId]; start=null; if(Object.keys(ptrs).length===0) syncFormInputs(); }
      root.addEventListener('pointerdown',function(e){ onDown(e,false); });
      handle.addEventListener('pointerdown',function(e){ onDown(e,true); });
      root.addEventListener('pointermove',onMove);
      handle.addEventListener('pointermove',onMove);
      root.addEventListener('pointerup',onUp); root.addEventListener('pointercancel',onUp);
      handle.addEventListener('pointerup',onUp); handle.addEventListener('pointercancel',onUp);
      del.addEventListener('click',function(e){ e.stopPropagation(); removeLayer(layer.id); });
      del.addEventListener('pointerdown',function(e){ e.stopPropagation(); });
    }

    function addLayer(layer){ curLayers().push(layer); makeNode(layer); layoutNode(layer); select(layer.id); }
    function removeLayer(id){ var a=curLayers(); for(var i=0;i<a.length;i++){ if(a[i].id===id){ a.splice(i,1); break; } } if(nodes[id]){ nodes[id].root.remove(); delete nodes[id]; } if(state.sel===id) deselect(); syncFormInputs(); }

    function newText(){ return {id:'L'+(++UID),type:'text',text:'',font:FONTS[0].v,color:'#111111',cx:0.5,cy:0.42,scale:1,rot:0}; }
    function newImage(src,printUrl,uploading){ return {id:'L'+(++UID),type:'image',src:src,printUrl:printUrl||'',uploading:!!uploading,cx:0.5,cy:0.5,scale:1,rot:0}; }
    function newSticker(name){ var u=STICKER_BASE+name+'.png'; return {id:'L'+(++UID),type:'sticker',name:name,src:u,printUrl:u,uploading:false,cx:0.5,cy:0.5,scale:0.8,rot:0}; }

    // Werkzeug-Aktionen
    btnText.addEventListener('click',function(){ lib.style.display='none'; addLayer(newText()); ctxIn.focus(); });
    btnSticker.addEventListener('click',function(){ ctx.style.display='none'; lib.style.display=lib.style.display==='none'?'block':'none'; loadStickers(); });
    if(btnImg){ btnImg.addEventListener('click',function(){ lib.style.display='none'; fi.click(); }); }

    // Kontext-Edits
    ctxIn.addEventListener('input',function(){ var ly=findLayer(state.sel); if(ly&&ly.type==='text'){ ly.text=ctxIn.value; layoutNode(ly); syncFormInputs(); } });
    ctxFont.addEventListener('change',function(){ var ly=findLayer(state.sel); if(ly&&ly.type==='text'){ ly.font=ctxFont.value; layoutNode(ly); syncFormInputs(); } });
    ctxCw.addEventListener('click',function(e){ var b=e.target.closest('[data-c]'); if(!b) return; var ly=findLayer(state.sel); if(ly&&ly.type==='text'){ ly.color=b.getAttribute('data-c'); paintCtxSwatch(ly.color); layoutNode(ly); syncFormInputs(); } });

    // Klick auf leere Leinwand → abwählen
    stage.addEventListener('pointerdown',function(e){ if(e.target===stage) deselect(); });

    // Bild-Upload
    fi.addEventListener('change',function(){ var f=fi.files&&fi.files[0]; if(!f) return; if(f.size>10*1024*1024){ msg.style.color='#b3122b'; msg.textContent=T.tooBig; return; }
      var rd=new FileReader(); rd.onload=function(){ var ly=newImage(rd.result,'',true); addLayer(ly); msg.style.color='#6b6b73'; msg.textContent=T.uploading;
        uplFile(f,function(err,url){ ly.uploading=false; if(err){ msg.style.color='#b3122b'; msg.textContent=T.upErr+err.message; return; } ly.printUrl=url; msg.textContent=''; syncFormInputs(); });
      }; rd.readAsDataURL(f); fi.value=''; });

    // Sticker-Bibliothek laden
    var stickersLoaded=false, STK=[];
    function loadStickers(){ if(stickersLoaded) return; stickersLoaded=true;
      libGrid.innerHTML="<div style='grid-column:1/-1;color:#8a8a90;font-size:13px;text-align:center;padding:10px'>…</div>";
      fetch(STICKER_INDEX,{cache:'no-store'}).then(function(r){return r.json();}).then(function(list){ STK=list||[]; renderStickers(); })
        .catch(function(){ STK=['heart-red','star-gold','smiley-yellow','daisy-flower','cat-cute','dog-cute','butterfly','rainbow','lightning','crown','coffee','peace','moon-stars','mushroom-retro','cherry','flame','word-love','word-vibes']; renderStickers(); }); }
    function renderStickers(){ libGrid.innerHTML=''; if(!STK.length){ libGrid.innerHTML="<div style='grid-column:1/-1;color:#8a8a90;font-size:13px;text-align:center;padding:10px'>—</div>"; return; }
      STK.forEach(function(name){ var b=el('button',{type:'button',style:"border:1px solid #ece7df;border-radius:10px;background:#faf8f5;padding:6px;cursor:pointer;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;"});
        var im=el('img',{src:STICKER_BASE+name+'.png',loading:'lazy',style:"max-width:100%;max-height:100%;pointer-events:none;"}); b.appendChild(im);
        b.addEventListener('click',function(){ addLayer(newSticker(name)); lib.style.display='none'; }); libGrid.appendChild(b); }); }

    // ---------- Seiten ----------
    function clearStage(){ for(var k in nodes){ nodes[k].root.remove(); } nodes={}; }
    function setSide(k){ if(k===state.active) return; deselect(); clearStage(); state.active=k; stage.style.backgroundImage="url('"+curImg()+"')";
      for(var s in sideBtns){ var on=s===k; sideBtns[s].style.background=on?'#fff':'transparent'; sideBtns[s].style.boxShadow=on?'0 1px 3px rgba(0,0,0,.12)':'none'; }
      curLayers().forEach(function(l){ makeNode(l); layoutNode(l); }); syncFormInputs(); }

    // ---------- Bestell-Properties ----------
    function sideSummary(side){ var arr=state.layers[side]||[]; if(!arr.length) return ''; return arr.map(function(l){
      if(l.type==='text') return T.layerText+': "'+(l.text||'')+'"';
      if(l.type==='sticker') return T.layerSticker+': '+l.name;
      return T.layerImage; }).join(' · '); }
    function buildProps(){ var props={}; var multi=sides.length>1;
      sides.forEach(function(s,si){ var arr=state.layers[s.k]||[]; if(!arr.length) return; var pre=multi?(T.pSide[si]+' · '):'';
        var sum=sideSummary(s.k); if(sum) props[pre+T.pDesign]=sum;
        if(s._printUrl) props[pre+T.pPrintFile]=s._printUrl; }); return props; }
    function syncFormInputs(){ var form=findForm(); if(!form) return; Array.prototype.forEach.call(form.querySelectorAll('input[data-lspod="1"]'),function(x){ if(x.parentNode) x.parentNode.removeChild(x); });
      var props=buildProps(); for(var k in props){ var i=document.createElement('input'); i.type='hidden'; i.setAttribute('data-lspod','1'); i.name='properties['+k+']'; i.value=props[k]; form.appendChild(i); } }

    // ---------- Druckdatei backen (Canvas) ----------
    function loadImg(src){ return new Promise(function(res,rej){ var im=new Image(); im.crossOrigin='anonymous'; im.onload=function(){ res(im); }; im.onerror=function(){ rej(new Error('img')); }; im.src=src; }); }
    function bakeSide(sideKey){ var arr=state.layers[sideKey]||[]; if(!arr.length) return Promise.resolve(null);
      var cv=document.createElement('canvas'); cv.width=REF; cv.height=REF; var cxn=cv.getContext('2d');
      var seq=Promise.resolve();
      arr.forEach(function(l){ seq=seq.then(function(){
        var x=l.cx*REF, y=l.cy*REF;
        if(l.type==='text'){ if(!l.text) return; cxn.save(); cxn.translate(x,y); cxn.rotate(l.rot*Math.PI/180);
          var f=fontByVal(l.font); var px=l.scale*REF*0.12; cxn.font=f.c.replace('{S}',Math.round(px)); cxn.fillStyle=l.color; cxn.textAlign='center'; cxn.textBaseline='middle';
          if(l.color.toLowerCase()==='#ffffff'){ cxn.shadowColor='rgba(0,0,0,.4)'; cxn.shadowBlur=px*0.12; }
          cxn.fillText(l.text,0,0); cxn.restore(); return; }
        var src=l.type==='sticker'?corsUrl(l.src):(l.printUrl||l.src);
        return loadImg(src).then(function(im){ var w=l.scale*REF*0.5; var h=w*(im.height/im.width||1); cxn.save(); cxn.translate(x,y); cxn.rotate(l.rot*Math.PI/180); cxn.drawImage(im,-w/2,-h/2,w,h); cxn.restore(); }).catch(function(){});
      }); });
      return seq.then(function(){ return new Promise(function(res){ try{ cv.toBlob(function(b){ res(b); },'image/png'); }catch(e){ res(null); } }); });
    }

    // ---------- Add to cart ----------
    cta.addEventListener('click',function(){
      var any=sides.some(function(s){ return (state.layers[s.k]||[]).length>0; });
      if(!any){ msg.style.color='#b3122b'; msg.textContent=T.empty; return; }
      var uploading=false; sides.forEach(function(s){ (state.layers[s.k]||[]).forEach(function(l){ if(l.uploading) uploading=true; }); });
      if(uploading){ msg.style.color='#b3122b'; msg.textContent=T.stillUp; return; }
      var form=findForm(), vid=getVariantId(form,fallbackVar);
      if(!vid){ msg.style.color='#b3122b'; msg.textContent=T.noVar; return; }
      cta.disabled=true; cta.style.opacity='0.7'; deselect();
      function finish(){ var props=buildProps(); msg.style.color='#6b6b73'; msg.textContent=T.adding;
        fetch(ADD_URL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({id:vid,quantity:1,properties:props})})
          .then(function(r){ if(!r.ok) return r.json().then(function(j){throw new Error(j.description||'Fehler');}); return r.json(); })
          .then(function(){ msg.style.color='#1c8a4b'; msg.textContent=T.added; window.location.href=CART_URL; })
          .catch(function(err){ cta.disabled=false; cta.style.opacity='1'; msg.style.color='#b3122b'; msg.textContent=T.addErr+err.message; });
      }
      if(!IMG_ENABLED){ finish(); return; } // ohne Cloudinary: Design-Beschreibung (Text/Sticker) reicht
      msg.style.color='#6b6b73'; msg.textContent=T.baking;
      var chain=Promise.resolve();
      sides.forEach(function(s){ chain=chain.then(function(){ return bakeSide(s.k).then(function(blob){ if(!blob) return; return new Promise(function(res){ uplBlob(blob,function(err,url){ if(!err&&url) s._printUrl=url; res(); }); }); }); }); });
      chain.then(finish).catch(finish);
    });

    // init
    stage.style.backgroundImage="url('"+curImg()+"')";
  }

  function initAll(){ var n=document.querySelectorAll('.lspod-designer'); Array.prototype.forEach.call(n,function(x){ if(x.getAttribute('data-init'))return; x.setAttribute('data-init','1'); try{ build(x); }catch(e){} }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
})();
