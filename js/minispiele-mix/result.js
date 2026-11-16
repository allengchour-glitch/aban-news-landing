/* Nur eine eingebettete Mix-Runde meldet ihr endgültiges Ergebnis an die Spielleitung. */
(function(){
  'use strict';
  var token=new URLSearchParams(location.search).get('mix'),sent=false;
  var slug=location.pathname.split('/').pop().replace(/\.html$/,'');
  var active=window.parent!==window&&typeof token==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(token);
  window.MiniMix={finish:function(winner){
    if(!active||sent||[0,1,2].indexOf(winner)<0)return false;
    sent=true;parent.postMessage({type:'mini-mix-result',round:token,game:slug,winner:winner},location.origin);return true;
  }};
})();
