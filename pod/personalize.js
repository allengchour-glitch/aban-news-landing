/* LuxeStyle — Personalisierung-Widget (Text-Feld + Live-Vorschau), ohne Drittanbieter-App.
 * In Produktbeschreibung einbinden:
 *   <div class="ls-personalize"
 *        data-label="Gravur-Text"          // Name der Bestell-Eigenschaft
 *        data-ph="z. B. Name, Datum"        // Platzhalter
 *        data-max="30"                      // max. Zeichen
 *        data-mode="engrave|birthstone"     // Vorschau-Stil
 *        data-required="1"></div>           // optional: Pflichtfeld
 * Speichert den Text als line-item property (properties[<label>]) im normalen Warenkorb-Formular.
 * Live-Vorschau aktualisiert beim Tippen. Robust gegen Theme-View-Transitions (Horizon & Co.).
 */
(function(){
  function el(t,a,txt){ var e=document.createElement(t); if(a) for(var k in a){ if(k==='style') e.style.cssText=a[k]; else e.setAttribute(k,a[k]); } if(txt!=null) e.textContent=txt; return e; }
  function findForm(){ return document.querySelector('form[action*="/cart/add"]'); }

  function build(host){
    var label=host.getAttribute('data-label')||'Personalisierung';
    var max=parseInt(host.getAttribute('data-max')||'30',10);
    var ph=host.getAttribute('data-ph')||'Dein Text';
    var mode=host.getAttribute('data-mode')||'engrave';
    var required=host.getAttribute('data-required')==='1';

    var wrap=el('div',{style:"border:1px solid #ece7df;border-radius:14px;padding:14px 16px;background:#faf8f5;margin:14px 0;"});
    wrap.appendChild(el('div',{style:"font-weight:700;font-size:14px;margin-bottom:8px;color:#16151a;"},'✏️ '+label+(required?' *':'')));
    var input=el('input',{type:'text',maxlength:String(max),placeholder:ph,style:"width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d9d4cc;border-radius:10px;font-size:15px;color:#16151a;background:#fff;"});
    wrap.appendChild(input);
    var counter=el('div',{style:"text-align:right;font-size:11px;color:#8a8a90;margin-top:4px;"},'0/'+max);
    wrap.appendChild(counter);

    wrap.appendChild(el('div',{style:"font-size:11px;font-weight:700;color:#8a8a90;margin:12px 0 5px;letter-spacing:.04em;text-transform:uppercase;"},'Live-Vorschau'));
    var prev=el('div',{style:"min-height:54px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:linear-gradient(180deg,#fffdf9,#f1ece2);border:1px dashed #d4b896;padding:12px;"});
    var prevText=el('span',{style:"font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;letter-spacing:1px;color:#5a4a32;text-shadow:0 1px 0 #fff, 0 -1px 1px rgba(0,0,0,.22);font-weight:600;text-align:center;word-break:break-word;"},'');
    prev.appendChild(prevText); wrap.appendChild(prev);

    var note=el('div',{style:"font-size:11.5px;color:#8a8a90;margin-top:7px;"},'Gross-/Kleinschreibung wie eingegeben · wir bestätigen per E-Mail');
    wrap.appendChild(note);
    host.appendChild(wrap);

    function placeholderPrev(){ return mode==='birthstone' ? 'A · Mai' : (ph||'Dein Text'); }
    function sync(){
      var v=input.value.trim();
      counter.textContent=input.value.length+'/'+max;
      prevText.textContent = v || placeholderPrev();
      prevText.style.opacity = v ? '1' : '.4';
      var form=findForm(); if(!form) return;
      var h=host._h;
      if(!h){ h=el('input',{type:'hidden','data-lsp':'1'}); host._h=h; }
      h.name='properties['+label+']'; h.value=v;
      if(h.parentNode!==form) form.appendChild(h);
    }
    input.addEventListener('input',sync);
    // Pflichtfeld: ATC-Button blockieren bis ausgefüllt
    if(required){
      var form=findForm();
      var btn=form && (form.querySelector('[type=submit]')||form.querySelector('button'));
      input.addEventListener('input',function(){ if(btn){ btn.disabled=!input.value.trim(); btn.style.opacity=input.value.trim()?'':'0.5'; } });
      if(btn && !input.value.trim()){ btn.disabled=true; btn.style.opacity='0.5'; }
    }
    sync();
  }

  function initAll(){ var n=document.querySelectorAll('.ls-personalize'); Array.prototype.forEach.call(n,function(x){ if(x.getAttribute('data-init'))return; x.setAttribute('data-init','1'); try{ build(x); }catch(e){} }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
  try{ window.LSPERS={init:initAll}; }catch(e){}
  document.addEventListener('shopify:section:load', initAll);
  document.addEventListener('shopify:section:select', initAll);
  ['page:loaded','pageshow','popstate'].forEach(function(ev){ try{ window.addEventListener(ev,function(){ setTimeout(initAll,50); }); }catch(e){} });
  try{ new MutationObserver(function(){ if(document.querySelector('.ls-personalize:not([data-init])')) initAll(); }).observe(document.documentElement,{childList:true,subtree:true}); }catch(e){}
})();
