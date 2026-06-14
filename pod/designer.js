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
    front:'Front', back:'Back', tapHint:'Tip: drag to move · corner = resize & rotate · tap an image → crop, flip & filter',
    upHint:'PNG/JPG · transparent PNG for logos', uploading:'Uploading …', upErr:'Upload error: ', tooBig:'File too large (max 10 MB).',
    cta:'🛒 Add my design to cart', empty:'Add text, an image or a sticker first.',
    baking:'Preparing print file …', adding:'Adding …', added:'✓ Added! Redirecting …', addErr:'Could not add: ', stillUp:'Image still uploading – please wait …', noVar:'Please select a size/color above first.',
    fonts:['Modern Sans','Elegant Serif','Handwriting','Bold Display','Mono'],
    pSide:['Front','Back'], pPrintFile:'🖼️ Print file', pDesign:'🎨 Design', layerText:'Text', layerImage:'Image', layerSticker:'Sticker'
  } : {
    head:'Jetzt selbst gestalten', ph:'Dein Text …',
    addText:'➕ Text', addImg:'🖼️ Bild', addSticker:'⭐ Sticker',
    font:'Schrift', color:'Farbe', stickers:'Sticker wählen',
    front:'Vorne', back:'Hinten', tapHint:'Tipp: ziehen zum Verschieben · Ecke = skalieren & drehen · Bild antippen → zuschneiden, spiegeln & filtern',
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
  function getVariantId(f,fb){
    // 1) URL ?variant= — von praktisch allen Shopify-Themes bei Variantenwahl aktualisiert (robust, theme-unabhängig)
    try{ var uv=new URLSearchParams(window.location.search).get('variant'); if(uv) return uv; }catch(e){}
    // 2) Cart-Formular: gewählte bzw. versteckte Varianten-ID
    if(f){ var i=f.querySelector('[name="id"]:checked')||f.querySelector('[name="id"]'); if(i&&i.value) return i.value; }
    return fb||null;
  }
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
    // Varianten-bewusst: optionale Map {variantId: bildUrl} → Canvas zeigt die gewählte Variante (z.B. Farbe)
    var imgMap={}; try{ imgMap=JSON.parse(container.getAttribute('data-img-map')||'{}')||{}; }catch(e){ imgMap={}; }
    // Seitenverhältnis + Druckauflösung pro Produkt (Default: quadratisch 1200px → unverändert für bestehende Produkte)
    var RATIO=parseFloat(container.getAttribute('data-ratio')); if(!(RATIO>0)) RATIO=1;        // Höhe/Breite
    var REF=parseInt(container.getAttribute('data-ref'),10); if(!(REF>=600)) REF=1200;          // Basis-/Druckbreite px
    var sides=[{k:'front',label:T.front,img:imgFront}];
    if(imgBack&&imgBack!==imgFront) sides.push({k:'back',label:T.back,img:imgBack});
    // state.layers[side] = [ {id,type,text,font,color, src,printUrl,uploading, cx,cy,scale,rot} ]
    var state={active:'front', layers:{front:[],back:[]}, sel:null};
    function curLayers(){ return state.layers[state.active]; }
    function curImg(){ for(var i=0;i<sides.length;i++){ if(sides[i].k===state.active) return sides[i].img; } return imgFront; }
    // Hintergrundbild = Variantenbild (falls Map-Treffer) sonst Seitenbild
    function variantBg(){ try{ var vid=getVariantId(findForm(),fallbackVar); if(vid&&imgMap[vid]) return imgMap[vid]; }catch(e){} return curImg(); }
    function applyBg(){ if(stage) stage.style.backgroundImage="url('"+variantBg()+"')"; }
    function findLayer(id){ var a=curLayers(); for(var i=0;i<a.length;i++) if(a[i].id===id) return a[i]; return null; }

    container.innerHTML='';
    var wrap=el('div',{style:"border:1px solid #ece7df;border-radius:16px;overflow:hidden;background:#fff;font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:8px 0 16px;"});
    wrap.appendChild(el('div',{style:"background:#16151a;color:#fff;padding:12px 16px;font-weight:800;font-size:15px;"},'🎨 '+T.head));

    // ---- Vorschau / Leinwand ----
    var stage=el('div',{style:"position:relative;width:100%;aspect-ratio:1/"+RATIO+";background:#f4f1ec center/cover no-repeat;touch-action:none;user-select:none;overflow:hidden;"});
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
    // Freie Farbwahl (Color-Picker) zusätzlich zu den Swatches
    var ctxPick=el('input',{type:'color',value:'#111111',title:(EN?'Custom color':'Eigene Farbe'),style:"width:32px;height:32px;border:2px solid #e3e3e3;border-radius:50%;background:none;cursor:pointer;padding:0;"});
    ctxCw.appendChild(ctxPick);
    ctx.appendChild(ctxIn); ctx.appendChild(ctxFont); ctx.appendChild(ctxCw); body.appendChild(ctx);

    // Grössen-Regler (für JEDES ausgewählte Element: Text/Bild/Sticker)
    var sizeBar=el('div',{style:"display:none;align-items:center;gap:10px;background:#faf8f5;border:1px solid #ece7df;border-radius:12px;padding:9px 12px;margin-bottom:10px;"});
    sizeBar.appendChild(el('span',{style:"font-size:13px;font-weight:700;color:#16151a;white-space:nowrap;"}, (EN?'Size':'Grösse')));
    var ctxSize=el('input',{type:'range',min:'0.15',max:'3',step:'0.02',style:"flex:1;accent-color:#c1922f;"});
    sizeBar.appendChild(ctxSize); body.appendChild(sizeBar);

    // Druckgrösse-Presets (für jedes Element) + Auflösungs-Warnung
    var presetBar=el('div',{style:"display:none;gap:6px;margin-bottom:10px;flex-wrap:wrap;"});
    function preBtn(label,sc){ var b=el('button',{type:'button',style:"flex:1;min-width:70px;padding:8px 4px;border-radius:9px;border:1px solid #ddd;background:#fff;color:#16151a;font-weight:700;font-size:12.5px;cursor:pointer;"},label); b.addEventListener('click',function(){ var ly=findLayer(state.sel); if(!ly)return; ly.scale=sc; ctxSize.value=sc; layoutNode(ly); checkRes(ly); syncFormInputs(); }); return b; }
    presetBar.appendChild(el('span',{style:"font-size:12px;font-weight:700;color:#8a8a90;align-self:center;white-space:nowrap;margin-right:2px;"}, EN?'Print size:':'Druckgrösse:'));
    presetBar.appendChild(preBtn(EN?'Small':'Klein',0.6)); presetBar.appendChild(preBtn(EN?'Medium':'Mittel',1.0)); presetBar.appendChild(preBtn(EN?'Large':'Gross',1.5)); presetBar.appendChild(preBtn(EN?'Fill':'Füllend',2.0));
    body.appendChild(presetBar);
    var resWarn=el('div',{style:"display:none;background:#fff4f5;border:1px solid #f3c6cd;color:#b3122b;border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:12.5px;font-weight:600;"}, EN?'⚠️ Image may be too small for a sharp print — scale down or use a larger image.':'⚠️ Bild evtl. zu klein für scharfen Druck — kleiner skalieren oder grösseres Bild verwenden.');
    body.appendChild(resWarn);

    // Aktionsleiste für aktives Element: Duplizieren / Ebene nach vorne / hinten
    var actBar=el('div',{style:"display:none;gap:8px;margin-bottom:10px;"});
    function actBtn(label){ return el('button',{type:'button',style:"flex:1;padding:9px 6px;border-radius:9px;border:1px solid #ddd;background:#fff;color:#16151a;font-weight:700;font-size:13px;cursor:pointer;"},label); }
    var btnDup=actBtn(EN?'⧉ Duplicate':'⧉ Duplizieren'), btnFront=actBtn(EN?'↑ Front':'↑ Vorne'), btnBack=actBtn(EN?'↓ Back':'↓ Hinten');
    actBar.appendChild(btnDup); actBar.appendChild(btnFront); actBar.appendChild(btnBack); body.appendChild(actBar);

    // Bild-Bearbeitung (nur für Bild-Layer): Zuschneiden / Spiegeln / 90° / Filter
    var imgBar=el('div',{style:"display:none;gap:8px;margin-bottom:10px;flex-wrap:wrap;"});
    function imgBtn(label){ return el('button',{type:'button',style:"flex:1;min-width:84px;padding:9px 6px;border-radius:9px;border:1px solid #ddd;background:#fff;color:#16151a;font-weight:700;font-size:13px;cursor:pointer;"},label); }
    var btnCrop=imgBtn(EN?'✂️ Crop':'✂️ Zuschneiden'), btnFlip=imgBtn(EN?'↔️ Flip':'↔️ Spiegeln'), btnRot90=imgBtn('↻ 90°'), btnCut=imgBtn(EN?'🪄 Cut out':'🪄 Freistellen'), btnFrame=imgBtn(EN?'🖼️ Frame':'🖼️ Rahmen'), btnFilt=imgBtn('🎨 Filter');
    imgBar.appendChild(btnCrop); imgBar.appendChild(btnFlip); imgBar.appendChild(btnRot90); imgBar.appendChild(btnCut); imgBar.appendChild(btnFrame); imgBar.appendChild(btnFilt);
    body.appendChild(imgBar);
    // Filter-Panel (Schieberegler + S/W + Reset)
    var filtPanel=el('div',{style:"display:none;background:#faf8f5;border:1px solid #ece7df;border-radius:12px;padding:10px;margin-bottom:10px;"});
    function fSlider(lab,min,max,val){ var row=el('div',{style:"display:flex;align-items:center;gap:10px;margin-bottom:7px;"}); row.appendChild(el('span',{style:"font-size:12.5px;font-weight:700;color:#16151a;width:84px;"},lab)); var s=el('input',{type:'range',min:''+min,max:''+max,value:''+val,step:'1',style:"flex:1;accent-color:#c1922f;"}); row.appendChild(s); filtPanel.appendChild(row); return s; }
    var sBri=fSlider(EN?'Brightness':'Helligkeit',50,150,100), sCon=fSlider(EN?'Contrast':'Kontrast',50,150,100), sSat=fSlider(EN?'Saturation':'Sättigung',0,200,100), sSharp=fSlider(EN?'Sharpness':'Schärfe',0,100,0);
    var filtRow=el('div',{style:"display:flex;gap:8px;"});
    var btnGray=imgBtn(EN?'⚫ B/W':'⚫ S/W'), btnReset=imgBtn(EN?'↺ Reset':'↺ Zurücksetzen');
    filtRow.appendChild(btnGray); filtRow.appendChild(btnReset); filtPanel.appendChild(filtRow);
    body.appendChild(filtPanel);

    // Sticker-Bibliothek (Panel)
    var lib=el('div',{style:"display:none;background:#fff;border:1px solid #ece7df;border-radius:12px;padding:10px;margin-bottom:10px;max-height:240px;overflow:auto;"});
    var libHead=el('div',{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"});
    libHead.appendChild(el('div',{style:"font-weight:800;font-size:14px;"},T.stickers));
    var libClose=el('button',{type:'button',style:"border:none;background:#f0ece4;border-radius:8px;padding:5px 10px;font-weight:700;font-size:12px;cursor:pointer;"},'✕');
    libHead.appendChild(libClose); lib.appendChild(libHead);
    // Emoji-Palette (als Text-Element eingefügt → frei skalier-/färbbar, druckbar)
    var EMO=['❤️','⭐','😀','😍','😎','🔥','✨','🎉','👑','🌈','🌸','🌟','💎','☀️','🌊','🍀','🦋','🐱','🐶','🍕','☕','⚡','🎵','💪','🇨🇭','🏔️','🧀','🍫'];
    var emoWrap=el('div',{style:"display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;border-bottom:1px solid #ece7df;padding-bottom:10px;"});
    EMO.forEach(function(ch){ var b=el('button',{type:'button',style:"width:32px;height:32px;border:1px solid #ece7df;border-radius:8px;background:#faf8f5;cursor:pointer;font-size:18px;line-height:1;padding:0;"},ch); b.addEventListener('click',function(){ var ly=newText(); ly.text=ch; ly.scale=0.7; addLayer(ly); lib.style.display='none'; }); emoWrap.appendChild(b); });
    lib.appendChild(emoWrap);
    var libGrid=el('div',{style:"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;"});
    lib.appendChild(libGrid); body.appendChild(lib);
    libClose.addEventListener('click',function(){ lib.style.display='none'; });

    // Bild-Upload (verstecktes File-Input)
    var fi=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp',style:"display:none;"});
    body.appendChild(fi);

    var btnPrev=el('button',{type:'button',style:"width:100%;padding:12px;border:1px solid #ddd;border-radius:999px;background:#fff;color:#16151a;font-weight:700;font-size:14px;cursor:pointer;margin-top:2px;margin-bottom:8px;"}, EN?'👁️ Preview print file':'👁️ Druck-Vorschau anzeigen');
    btnPrev.addEventListener('click',function(){ deselect(); msg.style.color='#6b6b73'; msg.textContent=T.baking;
      bakeSide(state.active).then(function(blob){ msg.textContent=''; if(!blob){ msg.style.color='#b3122b'; msg.textContent=T.empty; return; }
        var url=URL.createObjectURL(blob);
        var ov=el('div',{style:"position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;font-family:'Helvetica Neue',Arial,sans-serif;"});
        ov.appendChild(el('div',{style:"color:#fff;font-weight:800;font-size:15px;margin-bottom:6px;text-align:center;"}, EN?'👁️ Exactly this gets printed':'👁️ Genau das wird gedruckt'));
        ov.appendChild(el('div',{style:"color:#cfcfd6;font-size:12.5px;margin-bottom:12px;text-align:center;max-width:340px;"}, EN?'Checkered = transparent (not printed). Only your design is printed onto the product.':'Karos = transparent (wird nicht gedruckt). Nur dein Motiv kommt aufs Produkt.'));
        var fr=el('div',{style:"background-color:#fff;background-image:linear-gradient(45deg,#e6e6e6 25%,transparent 25%),linear-gradient(-45deg,#e6e6e6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e6e6e6 75%),linear-gradient(-45deg,transparent 75%,#e6e6e6 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0;border-radius:10px;padding:8px;"});
        var im=el('img',{src:url,style:"display:block;max-width:82vw;max-height:58vh;"}); fr.appendChild(im); ov.appendChild(fr);
        var cl=el('button',{type:'button',style:"margin-top:14px;padding:11px 24px;border:none;border-radius:999px;background:#c1922f;color:#fff;font-weight:800;font-size:15px;cursor:pointer;"}, EN?'Close':'Schliessen');
        cl.addEventListener('click',function(){ ov.remove(); try{ URL.revokeObjectURL(url); }catch(_){} });
        ov.appendChild(cl); document.body.appendChild(ov);
      }).catch(function(){ msg.textContent=''; }); });
    body.appendChild(btnPrev);
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
      if(ly){ sizeBar.style.display='flex'; ctxSize.value=ly.scale; actBar.style.display='flex'; presetBar.style.display='flex'; }
      if(ly&&ly.type==='text'){ ctx.style.display='block'; ctxIn.value=ly.text||''; ctxFont.value=ly.font; if(/^#[0-9a-f]{6}$/i.test(ly.color)) ctxPick.value=ly.color; paintCtxSwatch(ly.color); }
      else ctx.style.display='none';
      var isImg=!!(ly&&ly.type==='image'); imgBar.style.display=isImg?'flex':'none'; if(!isImg) filtPanel.style.display='none';
      if(isImg) checkRes(ly); else resWarn.style.display='none';
      syncFormInputs();
    }
    function deselect(){ state.sel=null; for(var k in nodes){ nodes[k].frame.style.display='none'; nodes[k].handle.style.display='none'; nodes[k].del.style.display='none'; } ctx.style.display='none'; sizeBar.style.display='none'; actBar.style.display='none'; imgBar.style.display='none'; filtPanel.style.display='none'; presetBar.style.display='none'; resWarn.style.display='none'; }
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
      function onUp(e){ delete ptrs[e.pointerId]; start=null; try{ if(state.sel===layer.id){ ctxSize.value=layer.scale; checkRes(layer); } }catch(_){ } if(Object.keys(ptrs).length===0) syncFormInputs(); }
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

    function newText(){ return {id:'L'+(++UID),type:'text',text:'',font:FONTS[0].v,color:'#111111',cx:0.5,cy:0.42,scale:0.55,rot:0}; }
    function newEdit(){ return {cx0:0,cy0:0,cw:1,ch:1,flipH:false,flipV:false,rotQ:0,bri:100,con:100,sat:100,gray:0,bg:0,frame:0,sharp:0}; }
    function newImage(src,printUrl,uploading){ return {id:'L'+(++UID),type:'image',src:src,origSrc:src,printUrl:printUrl||'',uploading:!!uploading,cx:0.5,cy:0.5,scale:1,rot:0,edit:newEdit()}; }
    function newSticker(name){ var u=STICKER_BASE+name+'.png'; return {id:'L'+(++UID),type:'sticker',name:name,src:u,printUrl:u,uploading:false,cx:0.5,cy:0.5,scale:0.8,rot:0}; }

    // ---------- Bild-Bearbeitung (Crop/Spiegeln/Drehen/Filter) ----------
    function curImgLayer(){ var l=findLayer(state.sel); return (l&&l.type==='image')?l:null; }
    // Auflösungs-Check: warnen, wenn das Quellbild für die gewählte Druckgrösse zu klein ist
    function checkRes(layer){ if(!layer||layer.type!=='image'){ resWarn.style.display='none'; return; }
      var ow=layer._origW||0; if(!ow){ resWarn.style.display='none'; return; }
      var e=layer.edit||newEdit(); var effW=((e.rotQ%2)?e.ch:e.cw)*ow; var printW=layer.scale*REF*0.5;
      resWarn.style.display=(effW>0 && effW<printW*0.7)?'block':'none'; }
    // Helfer: Hintergrund entfernen (Ecken-Farbe keyen, weiche Kante)
    function removeBg(c,cv,tol){ var w=cv.width,h=cv.height; if(w<2||h<2) return; var d=c.getImageData(0,0,w,h),p=d.data;
      function px(x,y){ var i=(y*w+x)*4; return [p[i],p[i+1],p[i+2]]; }
      var cs=[px(0,0),px(w-1,0),px(0,h-1),px(w-1,h-1)],br=0,bg=0,bb=0; cs.forEach(function(a){br+=a[0];bg+=a[1];bb+=a[2];}); br/=4;bg/=4;bb/=4;
      var t2=tol*1.7; for(var i=0;i<p.length;i+=4){ var dr=p[i]-br,dg=p[i+1]-bg,db=p[i+2]-bb; var dist=Math.sqrt(dr*dr+dg*dg+db*db);
        if(dist<tol) p[i+3]=0; else if(dist<t2) p[i+3]=Math.round(p[i+3]*(dist-tol)/(t2-tol)); }
      c.putImageData(d,0,0); }
    // Helfer: Schärfen (3x3-Kernel, amt 0..1)
    function sharpen(c,cv,amt){ var w=cv.width,h=cv.height; if(w<3||h<3) return; var src=c.getImageData(0,0,w,h),s=src.data;
      var out=c.createImageData(w,h),o=out.data; o.set(s); var cen=1+4*amt;
      for(var y=1;y<h-1;y++){ for(var x=1;x<w-1;x++){ var b=(y*w+x)*4; for(var ch2=0;ch2<3;ch2++){ var i=b+ch2;
        var v=cen*s[i]-amt*(s[i-4]+s[i+4]+s[i-w*4]+s[i+w*4]); o[i]=v<0?0:v>255?255:v; } } }
      c.putImageData(out,0,0); }
    // Helfer: Rahmen zeichnen (1=weiss, 2=schwarz)
    function drawFrame(c,cv,frame){ var w=cv.width,h=cv.height; var bw=Math.max(2,Math.round(Math.min(w,h)*0.035)); c.save(); c.filter='none'; c.strokeStyle=(frame===2?'#111111':'#ffffff'); c.lineWidth=bw; c.strokeRect(bw/2,bw/2,w-bw,h-bw); c.restore(); }
    // rendert origSrc mit allen Edits (Crop → Rotation → Spiegeln → Filter → Freistellen → Schärfe → Rahmen)
    function renderEditCanvas(layer,maxW){ return loadImg(layer.origSrc||layer.src).then(function(im){
      var e=layer.edit||(layer.edit=newEdit());
      var sw=im.naturalWidth||im.width||1, sh=im.naturalHeight||im.height||1;
      var cx=Math.round(e.cx0*sw), cy=Math.round(e.cy0*sh), cw=Math.max(1,Math.round(e.cw*sw)), ch=Math.max(1,Math.round(e.ch*sh));
      var q=(((e.rotQ||0)%4)+4)%4, swap=(q===1||q===3); var outW=swap?ch:cw, outH=swap?cw:ch;
      var sc=(maxW&&outW>maxW)?maxW/outW:1;
      var cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(outW*sc)); cv.height=Math.max(1,Math.round(outH*sc));
      var c=cv.getContext('2d');
      try{ c.filter='brightness('+e.bri+'%) contrast('+e.con+'%) saturate('+e.sat+'%) grayscale('+e.gray+'%)'; }catch(_){}
      c.save(); c.translate(cv.width/2,cv.height/2); c.rotate(q*Math.PI/2); c.scale((e.flipH?-1:1)*sc,(e.flipV?-1:1)*sc);
      c.drawImage(im, cx,cy,cw,ch, -cw/2,-ch/2, cw,ch); c.restore();
      try{ c.filter='none'; }catch(_){}
      if(e.bg){ try{ removeBg(c,cv,e.bg); }catch(_){} }
      if(e.sharp){ try{ sharpen(c,cv,e.sharp/100); }catch(_){} }
      if(e.frame){ try{ drawFrame(c,cv,e.frame); }catch(_){} }
      return cv;
    }); }
    function previewEdit(layer){ renderEditCanvas(layer,700).then(function(cv){ var url=cv.toDataURL('image/png'); layer.src=url; var n=nodes[layer.id]; if(n&&n.content&&n.content.tagName==='IMG') n.content.src=url; layoutNode(layer); }).catch(function(){}); }
    function commitEdit(layer){ renderEditCanvas(layer,0).then(function(cv){ var url=cv.toDataURL('image/png'); layer.src=url; var n=nodes[layer.id]; if(n&&n.content&&n.content.tagName==='IMG') n.content.src=url; layoutNode(layer); checkRes(layer);
      if(IMG_ENABLED){ layer.uploading=true; layer.printUrl=''; syncFormInputs(); try{ cv.toBlob(function(b){ if(!b){ layer.uploading=false; syncFormInputs(); return; } uplBlob(b,function(err,u){ layer.uploading=false; if(!err&&u) layer.printUrl=u; syncFormInputs(); }); },'image/png'); }catch(_){ layer.uploading=false; } } else syncFormInputs();
    }).catch(function(){ layer.uploading=false; }); }
    var _filtT=null; function previewDeb(layer){ clearTimeout(_filtT); _filtT=setTimeout(function(){ previewEdit(layer); },50); }
    function setActive(btn,on){ btn.style.background=on?'#16151a':'#fff'; btn.style.color=on?'#fff':'#16151a'; }
    function refreshFiltUI(ly){ var e=ly.edit||newEdit(); sBri.value=e.bri; sCon.value=e.con; sSat.value=e.sat; sSharp.value=e.sharp; setActive(btnGray,!!e.gray); setActive(btnCut,!!e.bg); setActive(btnFrame,!!e.frame); }

    btnFlip.addEventListener('click',function(){ var ly=curImgLayer(); if(!ly)return; ly.edit.flipH=!ly.edit.flipH; commitEdit(ly); });
    btnRot90.addEventListener('click',function(){ var ly=curImgLayer(); if(!ly)return; ly.edit.rotQ=((ly.edit.rotQ||0)+1)%4; commitEdit(ly); });
    btnCut.addEventListener('click',function(){ var ly=curImgLayer(); if(!ly)return; ly.edit.bg=ly.edit.bg?0:45; setActive(btnCut,!!ly.edit.bg); commitEdit(ly); });
    btnFrame.addEventListener('click',function(){ var ly=curImgLayer(); if(!ly)return; ly.edit.frame=((ly.edit.frame||0)+1)%3; setActive(btnFrame,!!ly.edit.frame); commitEdit(ly); });
    btnFilt.addEventListener('click',function(){ var ly=curImgLayer(); if(!ly)return; refreshFiltUI(ly); filtPanel.style.display=(filtPanel.style.display==='none'||!filtPanel.style.display)?'block':'none'; });
    function onSlide(){ var ly=curImgLayer(); if(!ly)return; ly.edit.bri=parseInt(sBri.value,10); ly.edit.con=parseInt(sCon.value,10); ly.edit.sat=parseInt(sSat.value,10); ly.edit.sharp=parseInt(sSharp.value,10); previewDeb(ly); }
    function onSlideEnd(){ var ly=curImgLayer(); if(ly) commitEdit(ly); }
    [sBri,sCon,sSat,sSharp].forEach(function(s){ s.addEventListener('input',onSlide); s.addEventListener('change',onSlideEnd); });
    btnGray.addEventListener('click',function(){ var ly=curImgLayer(); if(!ly)return; ly.edit.gray=ly.edit.gray?0:100; setActive(btnGray,!!ly.edit.gray); commitEdit(ly); });
    btnReset.addEventListener('click',function(){ var ly=curImgLayer(); if(!ly)return; ly.edit=newEdit(); refreshFiltUI(ly); commitEdit(ly); });
    btnCrop.addEventListener('click',function(){ var ly=curImgLayer(); if(ly) openCrop(ly); });

    // Crop-Modal: Original anzeigen, Rechteck ziehen/grössen, übernehmen
    function openCrop(layer){ loadImg(layer.origSrc||layer.src).then(function(im){
      var ov=el('div',{style:"position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;font-family:'Helvetica Neue',Arial,sans-serif;"});
      ov.appendChild(el('div',{style:"color:#fff;font-weight:800;font-size:15px;margin-bottom:10px;"}, EN?'✂️ Crop image — drag the box':'✂️ Bild zuschneiden — Rahmen ziehen'));
      var box=el('div',{style:"position:relative;line-height:0;touch-action:none;"});
      var pic=el('img',{src:(layer.origSrc||layer.src),style:"display:block;max-width:88vw;max-height:62vh;user-select:none;-webkit-user-drag:none;"});
      box.appendChild(pic);
      var selB=el('div',{style:"position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.5);box-sizing:border-box;cursor:move;touch-action:none;"});
      var hnd=el('div',{style:"position:absolute;right:-12px;bottom:-12px;width:24px;height:24px;border-radius:50%;background:#c1922f;border:2px solid #fff;cursor:nwse-resize;touch-action:none;"});
      selB.appendChild(hnd); box.appendChild(selB);
      var bar=el('div',{style:"display:flex;gap:10px;margin-top:14px;"});
      var ok=el('button',{type:'button',style:"padding:12px 22px;border:none;border-radius:999px;background:#c1922f;color:#fff;font-weight:800;font-size:15px;cursor:pointer;"}, EN?'✓ Apply':'✓ Übernehmen');
      var ca=el('button',{type:'button',style:"padding:12px 22px;border:none;border-radius:999px;background:#fff;color:#16151a;font-weight:800;font-size:15px;cursor:pointer;"}, EN?'✕ Cancel':'✕ Abbrechen');
      bar.appendChild(ok); bar.appendChild(ca); ov.appendChild(box); ov.appendChild(bar); document.body.appendChild(ov);
      function dd(){ return {w:pic.clientWidth||1,h:pic.clientHeight||1}; }
      function setB(x,y,w,h){ selB.style.left=x+'px'; selB.style.top=y+'px'; selB.style.width=w+'px'; selB.style.height=h+'px'; }
      function getB(){ return {x:parseFloat(selB.style.left)||0,y:parseFloat(selB.style.top)||0,w:parseFloat(selB.style.width)||0,h:parseFloat(selB.style.height)||0}; }
      function init(){ var d=dd(); var e=layer.edit||newEdit(); setB(e.cx0*d.w,e.cy0*d.h,Math.max(30,e.cw*d.w),Math.max(30,e.ch*d.h)); }
      if(pic.complete) init(); else pic.onload=init;
      function clampB(){ var d=dd(),b=getB(); var x=Math.max(0,Math.min(b.x,d.w-30)),y=Math.max(0,Math.min(b.y,d.h-30)); var w=Math.max(30,Math.min(b.w,d.w-x)),h=Math.max(30,Math.min(b.h,d.h-y)); setB(x,y,w,h); }
      var drag=null;
      selB.addEventListener('pointerdown',function(ev){ if(ev.target===hnd) return; ev.preventDefault(); try{selB.setPointerCapture(ev.pointerId);}catch(_){} var b=getB(); drag={m:'move',px:ev.clientX,py:ev.clientY,x0:b.x,y0:b.y}; });
      hnd.addEventListener('pointerdown',function(ev){ ev.preventDefault(); ev.stopPropagation(); try{hnd.setPointerCapture(ev.pointerId);}catch(_){} var b=getB(); drag={m:'size',px:ev.clientX,py:ev.clientY,w0:b.w,h0:b.h}; });
      function mv(ev){ if(!drag)return; ev.preventDefault(); var b=getB(); if(drag.m==='move') setB(drag.x0+(ev.clientX-drag.px),drag.y0+(ev.clientY-drag.py),b.w,b.h); else setB(b.x,b.y,drag.w0+(ev.clientX-drag.px),drag.h0+(ev.clientY-drag.py)); clampB(); }
      function up(){ drag=null; }
      selB.addEventListener('pointermove',mv); hnd.addEventListener('pointermove',mv);
      selB.addEventListener('pointerup',up); hnd.addEventListener('pointerup',up); selB.addEventListener('pointercancel',up); hnd.addEventListener('pointercancel',up);
      ca.addEventListener('click',function(){ ov.remove(); });
      ok.addEventListener('click',function(){ var d=dd(),b=getB(); layer.edit.cx0=Math.max(0,b.x/d.w); layer.edit.cy0=Math.max(0,b.y/d.h); layer.edit.cw=Math.min(1-layer.edit.cx0,b.w/d.w); layer.edit.ch=Math.min(1-layer.edit.cy0,b.h/d.h); ov.remove(); commitEdit(layer); });
    }).catch(function(){}); }

    // Werkzeug-Aktionen
    btnText.addEventListener('click',function(){ lib.style.display='none'; addLayer(newText()); ctxIn.focus(); });
    btnSticker.addEventListener('click',function(){ ctx.style.display='none'; lib.style.display=lib.style.display==='none'?'block':'none'; loadStickers(); });
    if(btnImg){ btnImg.addEventListener('click',function(){ lib.style.display='none'; fi.click(); }); }

    // Kontext-Edits
    ctxIn.addEventListener('input',function(){ var ly=findLayer(state.sel); if(ly&&ly.type==='text'){ ly.text=ctxIn.value; layoutNode(ly); syncFormInputs(); } });
    ctxFont.addEventListener('change',function(){ var ly=findLayer(state.sel); if(ly&&ly.type==='text'){ ly.font=ctxFont.value; layoutNode(ly); syncFormInputs(); } });
    ctxCw.addEventListener('click',function(e){ var b=e.target.closest('[data-c]'); if(!b) return; var ly=findLayer(state.sel); if(ly&&ly.type==='text'){ ly.color=b.getAttribute('data-c'); paintCtxSwatch(ly.color); layoutNode(ly); syncFormInputs(); } });
    // Grössen-Regler → aktives Element live skalieren
    ctxSize.addEventListener('input',function(){ var ly=findLayer(state.sel); if(ly){ ly.scale=Math.max(0.06,Math.min(3,parseFloat(ctxSize.value)||ly.scale)); layoutNode(ly); checkRes(ly); syncFormInputs(); } });
    // Freie Farbwahl (nur Text)
    ctxPick.addEventListener('input',function(){ var ly=findLayer(state.sel); if(ly&&ly.type==='text'){ ly.color=ctxPick.value; paintCtxSwatch(ly.color); layoutNode(ly); syncFormInputs(); } });
    // Duplizieren
    btnDup.addEventListener('click',function(){ var ly=findLayer(state.sel); if(!ly) return; var c=JSON.parse(JSON.stringify(ly)); c.id='L'+(++UID); c.cx=Math.min(0.92,(ly.cx||0.5)+0.05); c.cy=Math.min(0.92,(ly.cy||0.5)+0.05); curLayers().push(c); makeNode(c); layoutNode(c); select(c.id); });
    // Ebenen-Reihenfolge
    function reorder(toFront){ var a=curLayers(),i=-1; for(var j=0;j<a.length;j++){ if(a[j].id===state.sel){ i=j; break; } } if(i<0) return; var ly=a.splice(i,1)[0]; var root=nodes[ly.id]&&nodes[ly.id].root; if(toFront){ a.push(ly); if(root) stage.appendChild(root); } else { a.unshift(ly); if(root) stage.insertBefore(root, stage.firstChild); } syncFormInputs(); }
    btnFront.addEventListener('click',function(){ reorder(true); });
    btnBack.addEventListener('click',function(){ reorder(false); });

    // Klick auf leere Leinwand → abwählen
    stage.addEventListener('pointerdown',function(e){ if(e.target===stage) deselect(); });

    // Bild-Upload
    fi.addEventListener('change',function(){ var f=fi.files&&fi.files[0]; if(!f) return; if(f.size>10*1024*1024){ msg.style.color='#b3122b'; msg.textContent=T.tooBig; return; }
      var rd=new FileReader(); rd.onload=function(){ var ly=newImage(rd.result,'',true); addLayer(ly); msg.style.color='#6b6b73'; msg.textContent=T.uploading;
        loadImg(rd.result).then(function(im){ ly._origW=im.naturalWidth||im.width; ly._origH=im.naturalHeight||im.height; if(state.sel===ly.id) checkRes(ly); }).catch(function(){});
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
    function setSide(k){ if(k===state.active) return; deselect(); clearStage(); state.active=k; applyBg();
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
      var cv=document.createElement('canvas'); cv.width=REF; cv.height=Math.round(REF*RATIO); var cxn=cv.getContext('2d');
      var seq=Promise.resolve();
      arr.forEach(function(l){ seq=seq.then(function(){
        var x=l.cx*REF, y=l.cy*cv.height;
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
    applyBg();
    // Variantenwechsel erkennen (Theme-Variantenwähler) → Canvas aktualisieren. Robust: Event + Polling.
    if(Object.keys(imgMap).length){
      var lastVid=null;
      function checkVar(){ var vid=null; try{ vid=getVariantId(findForm(),fallbackVar); }catch(e){} if(vid!==lastVid){ lastVid=vid; applyBg(); } }
      // Dokumentweit lauschen: Farb-/Grössen-Wähler liegen je nach Theme ausserhalb des Cart-Formulars
      document.addEventListener('change',function(){ checkVar(); },true);
      document.addEventListener('click',function(){ setTimeout(checkVar,60); },true);   // Button-Variantenwähler aktualisieren ?variant= erst nach dem Klick
      window.addEventListener('popstate',checkVar);
      try{ setInterval(checkVar,500); }catch(e){}
      checkVar();
    }
  }

  function initAll(){ var n=document.querySelectorAll('.lspod-designer'); Array.prototype.forEach.call(n,function(x){ if(x.getAttribute('data-init'))return; x.setAttribute('data-init','1'); try{ build(x); }catch(e){} }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
})();
