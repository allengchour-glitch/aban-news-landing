/* Nur eine eingebettete Mix-Runde erhält Darstellung und Ergebnis-Brücke. */
(function(){
  'use strict';
  // Quelle jeder Zuordnung: statische Labels in minispiele/<slug>.html.
  // Keine Statuscontainer, Punktestände, Spielfelder oder Ergebnis-HTML ersetzen.
  var games={
    'drei-gewinnt':{labels:[['#cardX .who','❌ Spieler 1',1],['#cardO .who','⭕ Spieler 2',2]]},
    'vier-gewinnt':{labels:[]}, // Nur dynamischer Zugtext und Punktestände vorhanden.
    'memory':{labels:[['#pc1 .pname','🔴 Spieler 1',1],['#pc2 .pname','🔵 Spieler 2',2]]},
    'schere-stein-papier':{labels:[['#bottom .pname','💧 Spieler 1',1],['#top .pname','🌸 Spieler 2',2]]},
    'reaktions-duell':{start:true,watch:true,labels:[['#lbl1','Spieler 1',1],['#lbl2','Spieler 2',2]]},
    'tap-duell':{start:true,back:'button.backbtn',labels:[
      ['#halfTop .who','🔴 Spieler 1',1],['#halfBottom .who','🔵 Spieler 2',2],
      ['#endOverlay .scorebox.p1 .lbl','🔴 Spieler 1',1],['#endOverlay .scorebox.p2 .lbl','🔵 Spieler 2',2]]},
    'pong':{start:true,labels:[['#scP1 .name','🔴 Rot (unten)',1],['#scP2 .name','🔵 Blau (oben)',2]]},
    'tauziehen':{start:true,labels:[['#pad1 .lbl','Spieler 1 (Rot)',1],['#pad2 .lbl','Spieler 2 (Blau)',2]]},
    'mathe-duell':{start:true,labels:[['#halfBot .label','🔴 Spieler 1',1],['#halfTop .label','🔵 Spieler 2',2]]},
    'farb-klick':{start:'btnStart',back:'button.zurueck',labels:[['#hUnten .name','🟢 Spieler 1',1],['#hOben .name','🟠 Spieler 2',2]]},
    'elfmeter':{labels:[['#card1 .name','🔴 Spieler 1',1],['#card2 .name','🔵 Spieler 2',2]]},
    'hoch-tief':{back:'button#back',labels:[['#pc1 .name','🔴 Spieler 1',1],['#pc2 .name','🔵 Spieler 2',2]]},
    'simon':{start:true,labels:[['#card1 .name','🔵 Spieler 1',1],['#card2 .name','🔴 Spieler 2',2]]},
    'schlange-duell':{start:true,labels:[['#hud .s-blue .name','🔵 Blau',1],['#hud .s-pink .name','🩷 Pink',2]]},
    'ballon-pump':{back:'button.backbtn',labels:[['#half0 .who','🔴 Spieler 1',1],['#half1 .who','🔵 Spieler 2',2]]},
    'auto-rennen':{start:true,back:'button.backbtn',labels:[]}, // Farbe, Gang und Fortschritt stehen im selben Text.
    'maulwurf':{start:true,labels:[['#half1 .hdr > span:first-child','🔴 Spieler 1',1],['#half2 .hdr > span:first-child','🔵 Spieler 2',2]]},
    'quiz-buzzer':{labels:[['#sc1 .name','🔴 Spieler 1',1],['#sc2 .name','🔵 Spieler 2',2]]},
    'stapel-turm':{labels:[['#sc1 .n','🔴 Spieler 1',1],['#sc2 .n','🔵 Spieler 2',2]]},
    'punkte-jagd':{start:true,back:'button.backbtn',labels:[
      ['#fieldTop .half-info > span:first-child','🔴 Spieler 1',1],['#fieldBottom .half-info > span:first-child','🔵 Spieler 2',2]]}
  };
  var params=new URLSearchParams(location.search),token=params.get('mix'),sent=false;
  var slug=location.pathname.split('/').pop().replace(/\.html$/,'');
  var active=window.parent!==window&&typeof token==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(token)&&
    Object.prototype.hasOwnProperty.call(games,slug);
  var ready=false,begun=false,startButton=null;
  window.MiniMix={
    active:active,
    sound:params.get('sound')==='1',
    // Der Parent ruft erst nach Einführung, Countdown und Frame-load auf.
    // Keine vorgemerkten Klicks, keine Wiederholung und kein künstlicher Autostart.
    begin:function(){
      if(!active||!ready||begun||sent||!startButton||startButton.disabled)return false;
      begun=true;
      startButton.click();
      return true;
    },
    finish:function(winner){
      if(!active||sent||[0,1,2].indexOf(winner)<0)return false;
      sent=true;parent.postMessage({type:'mini-mix-result',round:token,game:slug,winner:winner},location.origin);return true;
    }
  };

  // Auch document-Getter und DOM-Listener bleiben außerhalb des Mix unberührt.
  // Die kleine Ergebnis-Brücke funktioniert weiterhin in VMs ohne DOM.
  if(!active||typeof document==='undefined')return;
  var game=games[slug];
  var names=[1,2].map(function(p){return (params.get('p'+p)||'').trim().slice(0,20);});

  function decorateLabel(spec){
    var label=document.querySelector(spec[0]);
    if(!label)return;
    var p=spec[2],name='P'+p+(names[p-1]?' · '+names[p-1]:'');
    var replacement=spec[1].replace(/Spieler [12]|Blau|Rot|Pink/,function(){return name;});
    function update(){
      // Exakter Quelltext und reines Textlabel: spätere Spielsignale bleiben erhalten.
      if(label.children.length===0&&label.textContent.trim()===spec[1]){
        label.textContent=replacement;
        label.classList.add('mix-player-label');
      }
    }
    update();
    if(game.watch&&typeof MutationObserver==='function'){
      // Nur Reaktion schreibt dieselben Namenslabels erneut. Keine Beobachtung des Spielfelds.
      var observer=new MutationObserver(function(){
        observer.disconnect();
        update();
        observe();
      });
      function observe(){observer.observe(label,{childList:true,characterData:true,subtree:true});}
      observe();
    }
  }

  function onReady(){
    if(ready)return;
    ready=true;
    document.documentElement.classList.add('mix-embedded');
    document.documentElement.setAttribute('data-mix-game',slug);
    var css=document.createElement('link');
    css.rel='stylesheet';
    css.href='/css/minispiele-mix-embedded.css?v=83a47abf40da';
    document.head.appendChild(css);
    var landscape=document.createElement('link');
    landscape.rel='stylesheet';
    landscape.href='/css/minispiele-mix-landscape.css?v=d5bd7446b6f5';
    landscape.addEventListener('load',function(){
      requestAnimationFrame(function(){window.dispatchEvent(new Event('resize'));});
    });
    document.head.appendChild(landscape);
    game.labels.forEach(decorateLabel);
    var back=document.querySelector(game.back||'button.back');
    if(back&&back.children.length===0&&back.textContent.trim()==='← Zurück'){
      back.textContent='Runde unterbrechen';
      back.classList.add('mix-back');
    }
    if(game.start){
      var button=document.getElementById(game.start===true?'startBtn':game.start);
      if(button&&button.tagName==='BUTTON'&&typeof button.click==='function'){
        startButton=button;
        // Auch ein manueller Originalstart darf durch begin() nicht wiederholt werden.
        button.addEventListener('click',function(){begun=true;},{once:true});
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onReady,{once:true});
  else onReady();
})();
