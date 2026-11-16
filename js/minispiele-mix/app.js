(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);},R=window.MixRules,C=window.MixCatalog,KEY='aban_mini_mix_v1',run=null,frame=null,token='',timer=0,saved=null;
  function game(slug){return C.find(function(g){return g.s===slug;});}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(run));saved=R.restore(run);}catch(_){$('storageNotice').hidden=false;}}
  function load(){try{saved=R.restore(localStorage.getItem(KEY));}catch(_){saved=null;}}
  function resumeInfo(){load();$('resume').hidden=!saved;$('resumeInfo').hidden=!saved;if(saved)$('resumeInfo').textContent=saved.names.join(' · ')+' — '+saved.history.length+' von '+saved.deck.length+' Runden gewertet.';}
  function dispose(){clearTimeout(timer);token='';if(frame){frame.remove();frame=null;}$('arena').hidden=true;$('loadError').hidden=true;document.body.classList.remove('in-round');}
  function render(focus){
    dispose();$('lobby').hidden=true;$('match').hidden=false;var points=R.score(run),done=run.history.length,idx=run.phase==='result'?done-1:done,g=game(run.deck[Math.min(idx,run.deck.length-1)]);
    $('p1').textContent='1 · '+run.names[0];$('p2').textContent='2 · '+run.names[1];$('score1').textContent=points[0];$('score2').textContent=points[1];
    $('roundLabel').textContent=run.phase==='finished'?'Mix abgeschlossen':'Runde '+Math.min(idx+1,run.deck.length)+' / '+run.deck.length;
    $('roundList').replaceChildren();run.deck.forEach(function(slug,i){var li=document.createElement('li'),gg=game(slug);li.textContent=(i+1)+'. '+gg.n;li.className=i<done?'done':i===done?'current':'';if(i<done){var w=run.history[i];li.textContent+=' · '+(w===null?'ohne Punkte':w===0?'je 1 Punkt':run.names[w-1]+' +3');}$('roundList').appendChild(li);});
    $('stageTag').textContent=run.phase==='finished'?'Euer Ergebnis':run.phase==='result'?'Runde abgeschlossen':'Nächste Disziplin';
    $('stageIcon').textContent=run.phase==='finished'?'🏆':g.e;
    if(run.phase==='finished'){
      $('stageTitle').textContent=points[0]===points[1]?'Gemeinsamer Gleichstand!':run.names[points[0]>points[1]?0:1]+' gewinnt den Mix!';
      $('stageText').textContent=points[0]+' : '+points[1]+' Punkte über '+run.deck.length+' Disziplinen. Lust auf eine neue Mischung?';$('action').textContent='Neuen Mix zusammenstellen';
    }else if(run.phase==='result'){
      var winner=run.history[done-1];$('stageTitle').textContent=winner===null?'Runde abgebrochen':winner===0?'Unentschieden!':run.names[winner-1]+' holt die Runde!';
      $('stageText').textContent=g.n+' · '+(winner===null?'Keine Punkte vergeben.':winner===0?'Beide erhalten 1 Punkt.':'3 Punkte für Spieler '+winner+'.');$('action').textContent=done===run.deck.length?'Gesamtsieger ansehen':'Zur nächsten Runde';
    }else{
      $('stageTitle').textContent=g.n;$('stageText').textContent=g.d+'. '+run.names[0]+' spielt als Spieler 1, '+run.names[1]+' als Spieler 2. Die Anleitung folgt im Spiel.';$('action').textContent='Runde starten';
    }
    if(focus){$('stageTitle').focus();window.scrollTo(0,0);}
  }
  function finish(winner){if(!run||!R.finish(run,winner))return;save();render(true);}
  function startRound(){
    if(!run||!R.start(run))return;save();var slug=run.deck[run.history.length];
    token=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);frame=document.createElement('iframe');frame.title=game(slug).n+' – Runde '+(run.history.length+1);frame.src='/minispiele/'+slug+'.html?mix='+encodeURIComponent(token);frame.setAttribute('allow','autoplay');
    $('match').hidden=true;$('arena').hidden=false;document.body.classList.add('in-round');$('arenaRound').textContent='Runde '+(run.history.length+1)+' / '+run.deck.length+' · '+game(slug).n;
    $('frameSlot').replaceChildren(frame);timer=setTimeout(function(){$('loadError').hidden=false;},15000);
    frame.addEventListener('load',function(){clearTimeout(timer);try{if(!frame.contentWindow.MiniMix)throw Error('Spiel fehlt');$('loadError').hidden=true;frame.contentWindow.focus();}catch(_){$('loadError').hidden=false;}});
  }
  addEventListener('message',function(e){
    if(!run||run.phase!=='playing'||!frame||e.source!==frame.contentWindow||e.origin!==location.origin)return;
    if(e.data==='mini-back'){finish(null);return;}
    if(R.accepts(e,frame.contentWindow,location.origin,token,run.deck[run.history.length]))finish(e.data.winner);
  });
  $('setup').addEventListener('submit',function(e){e.preventDefault();run=R.create(Number(new FormData(e.target).get('rounds')),[$('name1').value,$('name2').value]);save();render(true);});
  $('resume').onclick=function(){load();if(saved){run=saved;render(true);}};
  $('action').onclick=function(){if(run.phase==='ready')startRound();else if(run.phase==='result'){R.next(run);save();render(true);}else showMenu();};
  function showMenu(){dispose();$('match').hidden=true;$('lobby').hidden=false;resumeInfo();$('setupTitle').scrollIntoView({block:'start'});$('name1').focus();}
  $('menu').onclick=showMenu;
  $('skip').onclick=function(){finish(null);};
  $('retry').onclick=function(){dispose();run.phase='ready';startRound();};
  C.forEach(function(g){var a=document.createElement('a');a.href=g.s+'.html';a.className='card';var emoji=document.createElement('span');emoji.className='emo';emoji.textContent=g.e;var name=document.createElement('strong');name.textContent=g.n;var desc=document.createElement('span');desc.textContent=g.d;a.append(emoji,name,desc);a.onclick=function(){try{localStorage.setItem('mini_last',g.s);}catch(_){}};$('grid').appendChild(a);});
  if(location.hash==='#einzeln')$('einzeln').open=true;
  resumeInfo();
})();
