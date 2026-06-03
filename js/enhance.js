/* aban news — progressive enhancement (shared)
   - Adds "Kopieren" buttons to every <pre> code block (prompts, snippets)
   - "/" focuses a search field if the page has one
   Self-contained: injects its own CSS. ES5-safe. No dependencies. */
(function(){
  'use strict';

  // 1) Copy buttons on all <pre> blocks
  var pres = document.querySelectorAll('main pre, article pre, .wrap pre, pre');
  if (pres.length) {
    var css = document.createElement('style');
    css.textContent =
      '.pre-wrap{position:relative}' +
      '.pre-wrap > pre{padding-top:2.4rem}' +
      '.copy-code{position:absolute;top:.5rem;right:.5rem;background:var(--c-accent,#d97706);color:#fff;border:none;' +
      'border-radius:6px;font-family:inherit;font-weight:600;font-size:.75rem;line-height:1;padding:.4rem .6rem;' +
      'cursor:pointer;opacity:.9;transition:opacity .12s ease,background .12s ease;z-index:2}' +
      '.copy-code:hover{opacity:1}.copy-code.done{background:var(--c-success,#059669)}' +
      '@media print{.copy-code{display:none}}';
    document.head.appendChild(css);

    Array.prototype.forEach.call(pres, function(pre){
      if (pre.closest && pre.closest('.pre-wrap')) return; // already enhanced
      var wrap = document.createElement('div');
      wrap.className = 'pre-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-code';
      btn.textContent = 'Kopieren';
      btn.setAttribute('aria-label', 'In die Zwischenablage kopieren');
      btn.addEventListener('click', function(){
        try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pre.innerText); } catch(e){}
        btn.classList.add('done'); btn.textContent = '✓ Kopiert';
        setTimeout(function(){ btn.classList.remove('done'); btn.textContent = 'Kopieren'; }, 1500);
      });
      wrap.appendChild(btn);
    });
  }

  // 2) "/" focuses an existing search field (if any) — quality-of-life
  var search = document.querySelector('#g-search, #f-search, input[type="search"]');
  if (search) {
    document.addEventListener('keydown', function(e){
      if (e.key === '/') {
        var t = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
        if (t !== 'input' && t !== 'textarea' && t !== 'select') { e.preventDefault(); search.focus(); }
      }
    });
  }
})();
