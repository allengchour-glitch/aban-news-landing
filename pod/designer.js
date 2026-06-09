/* LuxeStyle — POD Gestalten-Widget (autonom, ohne Drittanbieter-App)
 * Wird per <script src> in POD-Produktbeschreibungen geladen. Rendert für jedes
 * <div class="lspod-designer" data-img="<produktbild>"> ein Text-Design-Tool mit Live-Vorschau.
 * Beim Klick auf "In den Warenkorb mit Design" liest es die vom Kunden gewählte Variante
 * aus dem Shopify-Produktformular und legt sie per /cart/add.js MIT dem Design als
 * Bestell-Eigenschaften (properties) in den Warenkorb. Läuft komplett von alleine.
 */
(function(){
  if (window.__lspodDesignerLoaded) return; window.__lspodDesignerLoaded = true;

  var FONTS = [
    {n:'Modern Sans', v:"'Helvetica Neue',Arial,sans-serif"},
    {n:'Elegant Serif', v:"Georgia,'Times New Roman',serif"},
    {n:'Handschrift', v:"'Brush Script MT','Segoe Script',cursive"},
    {n:'Bold Display', v:"'Arial Black','Helvetica Neue',sans-serif"},
    {n:'Mono', v:"'Courier New',monospace"}
  ];
  var COLORS = ['#111111','#ffffff','#c1922f','#b3122b','#1e4fd6','#1c8a4b','#e84393','#000080'];
  var POS = [{n:'Oben',v:'18%'},{n:'Mitte',v:'50%'},{n:'Unten',v:'80%'}];

  function el(tag, attrs, html){
    var e=document.createElement(tag);
    if(attrs) for(var k in attrs) e.setAttribute(k, attrs[k]);
    if(html!=null) e.innerHTML=html;
    return e;
  }
  function findForm(node){
    return document.querySelector('form[action*="/cart/add"]') || null;
  }
  function getVariantId(form, fallback){
    if(form){
      var inp = form.querySelector('[name="id"]:checked') || form.querySelector('[name="id"]');
      if(inp && inp.value) return inp.value;
    }
    return fallback || null;
  }

  function build(container){
    var img = container.getAttribute('data-img') || '';
    var fallbackVar = container.getAttribute('data-variant') || '';
    var state = { text:'', font:FONTS[0].v, color:'#111111', size:30, pos:'50%' };

    container.innerHTML = '';
    var wrap = el('div',{style:"border:1px solid #ece7df;border-radius:16px;overflow:hidden;background:#fff;font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:8px 0 16px;"});
    wrap.appendChild(el('div',{style:"background:#16151a;color:#fff;padding:12px 16px;font-weight:800;font-size:15px;"},'🎨 Jetzt selbst gestalten'));

    var pv = el('div',{style:"position:relative;width:100%;aspect-ratio:1/1;background:#f4f1ec url('"+img+"') center/cover no-repeat;"});
    var txt = el('div',{style:"position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:86%;text-align:center;word-break:break-word;pointer-events:none;line-height:1.1;"});
    pv.appendChild(txt); wrap.appendChild(pv);

    var body = el('div',{style:"padding:14px 16px;"});
    var ti = el('input',{type:'text',maxlength:'40',placeholder:'Dein Text, Name oder Spruch …',style:"width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #ddd;border-radius:10px;font-size:15px;margin-bottom:12px;"});
    body.appendChild(ti);

    function row(label){ var r=el('div',{style:"margin-bottom:12px;"}); r.appendChild(el('div',{style:"font-size:12px;font-weight:700;color:#6b6b73;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;"},label)); return r; }

    var rF=row('Schrift'); var fs=el('select',{style:"width:100%;padding:9px 10px;border:1px solid #ddd;border-radius:10px;font-size:14px;"});
    FONTS.forEach(function(f){ var o=el('option',{value:f.v}); o.textContent=f.n; o.style.fontFamily=f.v; fs.appendChild(o); });
    rF.appendChild(fs); body.appendChild(rF);

    var rC=row('Farbe'); var cw=el('div',{style:"display:flex;flex-wrap:wrap;gap:8px;"});
    COLORS.forEach(function(c){ cw.appendChild(el('button',{type:'button','data-c':c,style:"width:30px;height:30px;border-radius:50%;border:2px solid "+(c==state.color?'#16151a':'#e3e3e3')+";background:"+c+";cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);"})); });
    rC.appendChild(cw); body.appendChild(rC);

    var rS=row('Grösse'); var sl=el('input',{type:'range',min:'14',max:'60',value:String(state.size),style:"width:100%;"}); rS.appendChild(sl); body.appendChild(rS);

    var rP=row('Platzierung'); var pw=el('div',{style:"display:flex;gap:8px;"});
    POS.forEach(function(p){ var b=el('button',{type:'button','data-p':p.v,style:"flex:1;padding:9px;border:1px solid "+(p.v==state.pos?'#16151a':'#ddd')+";border-radius:10px;background:"+(p.v==state.pos?'#16151a':'#fff')+";color:"+(p.v==state.pos?'#fff':'#16151a')+";font-weight:700;font-size:13px;cursor:pointer;"}); b.textContent=p.n; pw.appendChild(b); });
    rP.appendChild(pw); body.appendChild(rP);

    body.appendChild(el('div',{style:"font-size:12px;color:#6b6b73;background:#faf8f5;border:1px solid #ece7df;border-radius:10px;padding:9px 11px;margin-bottom:12px;"},'📷 Foto/Logo-Upload kommt in Kürze. Für Logo-/Mehrfarb-Designs: hier bestellen und Bild nachreichen – oder Text/Spruch direkt gestalten.'));

    var cta=el('button',{type:'button',style:"width:100%;padding:15px;border:none;border-radius:999px;background:#c1922f;color:#fff;font-weight:800;font-size:16px;cursor:pointer;"},'🛒 Mit meinem Design in den Warenkorb');
    var msg=el('div',{style:"text-align:center;font-size:13px;margin-top:8px;min-height:18px;"});
    body.appendChild(cta); body.appendChild(msg);
    wrap.appendChild(body); container.appendChild(wrap);

    function render(){
      txt.textContent = state.text || 'Dein Design';
      txt.style.fontFamily = state.font; txt.style.color = state.color;
      txt.style.fontSize = state.size+'px'; txt.style.fontWeight='800';
      txt.style.opacity = state.text ? '1' : '0.45'; txt.style.top = state.pos;
      txt.style.textShadow = (state.color.toLowerCase()==='#ffffff') ? '0 1px 3px rgba(0,0,0,.45)' : 'none';
    }
    render();

    ti.addEventListener('input', function(){ state.text=ti.value; render(); });
    fs.addEventListener('change', function(){ state.font=fs.value; render(); });
    sl.addEventListener('input', function(){ state.size=parseInt(sl.value,10); render(); });
    cw.addEventListener('click', function(e){ var b=e.target.closest('[data-c]'); if(!b)return; state.color=b.getAttribute('data-c'); Array.prototype.forEach.call(cw.children,function(x){x.style.border='2px solid #e3e3e3';}); b.style.border='2px solid #16151a'; render(); });
    pw.addEventListener('click', function(e){ var b=e.target.closest('[data-p]'); if(!b)return; state.pos=b.getAttribute('data-p'); Array.prototype.forEach.call(pw.children,function(x){x.style.border='1px solid #ddd';x.style.background='#fff';x.style.color='#16151a';}); b.style.border='1px solid #16151a';b.style.background='#16151a';b.style.color='#fff'; render(); });

    cta.addEventListener('click', function(){
      if(!state.text.trim()){ msg.style.color='#b3122b'; msg.textContent='Bitte gib zuerst deinen Text ein.'; ti.focus(); return; }
      var form = findForm(container);
      var vid = getVariantId(form, fallbackVar);
      if(!vid){ msg.style.color='#b3122b'; msg.textContent='Variante nicht gefunden – bitte oben Grösse/Farbe wählen.'; return; }
      var fontName=(FONTS.filter(function(f){return f.v===state.font;})[0]||{}).n||'Standard';
      var posName=(POS.filter(function(p){return p.v===state.pos;})[0]||{}).n||'Mitte';
      cta.disabled=true; cta.style.opacity='0.7'; msg.style.color='#6b6b73'; msg.textContent='Wird hinzugefügt …';
      fetch('/cart/add.js',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({ id:vid, quantity:1, properties:{
          '🎨 Design-Text':state.text.trim(), 'Schrift':fontName, 'Farbe':state.color, 'Platzierung':posName
        }})})
      .then(function(r){ if(!r.ok) return r.json().then(function(j){throw new Error(j.description||'Fehler');}); return r.json(); })
      .then(function(){ msg.style.color='#1c8a4b'; msg.textContent='✓ Im Warenkorb! Weiterleitung …'; window.location.href='/cart'; })
      .catch(function(err){ cta.disabled=false; cta.style.opacity='1'; msg.style.color='#b3122b'; msg.textContent='Konnte nicht hinzufügen: '+err.message; });
    });
  }

  function initAll(){
    var nodes=document.querySelectorAll('.lspod-designer');
    Array.prototype.forEach.call(nodes,function(n){ if(n.getAttribute('data-init'))return; n.setAttribute('data-init','1'); try{ build(n); }catch(e){} });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
})();
