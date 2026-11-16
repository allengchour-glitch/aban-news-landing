/* Rundenspiel-Regeln. Keine Abhängigkeit vom Browser oder von einzelnen Spielständen. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MixRules=factory();})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  var games=['drei-gewinnt','vier-gewinnt','memory','schere-stein-papier','reaktions-duell','tap-duell','pong','tauziehen','mathe-duell','farb-klick','elfmeter','hoch-tief','simon','schlange-duell','ballon-pump','auto-rennen','maulwurf','quiz-buzzer','stapel-turm','punkte-jagd'];
  function name(value,fallback){return typeof value==='string'&&value.trim()?value.trim().slice(0,20):fallback;}
  function create(rounds,names,random){
    if([3,5,7].indexOf(rounds)<0)throw Error('Ungültige Rundenzahl');
    var deck=games.slice();random=random||Math.random;
    for(var i=deck.length-1;i>0;i--){var j=Math.floor(Math.max(0,Math.min(.999999,random()))*(i+1)),x=deck[i];deck[i]=deck[j];deck[j]=x;}
    return {v:1,deck:deck.slice(0,rounds),names:[name(names&&names[0],'Spieler 1'),name(names&&names[1],'Spieler 2')],history:[],phase:'ready'};
  }
  function restore(raw){
    try{
      var s=typeof raw==='string'?JSON.parse(raw):raw;
      if(!s||s.v!==1||!Array.isArray(s.deck)||[3,5,7].indexOf(s.deck.length)<0||new Set(s.deck).size!==s.deck.length||s.deck.some(function(g){return games.indexOf(g)<0;})||!Array.isArray(s.history)||s.history.length>s.deck.length||s.history.some(function(w){return [null,0,1,2].indexOf(w)<0;})||!Array.isArray(s.names)||s.names.length!==2||['ready','playing','result','finished'].indexOf(s.phase)<0)return null;
      if(s.phase==='finished'&&s.history.length!==s.deck.length||s.phase==='result'&&!s.history.length||['ready','playing'].indexOf(s.phase)>=0&&s.history.length===s.deck.length)return null;
      return {v:1,deck:s.deck.slice(),names:[name(s.names[0],'Spieler 1'),name(s.names[1],'Spieler 2')],history:s.history.slice(),phase:s.phase==='playing'?'ready':s.phase};
    }catch(_){return null;}
  }
  function score(s){return s.history.reduce(function(p,w){if(w===0){p[0]++;p[1]++;}else if(w===1||w===2)p[w-1]+=3;return p;},[0,0]);}
  function start(s){if(s.phase!=='ready')return false;s.phase='playing';return true;}
  function finish(s,w){if(s.phase!=='playing'||[null,0,1,2].indexOf(w)<0)return false;s.history.push(w);s.phase='result';return true;}
  function next(s){if(s.phase!=='result')return false;s.phase=s.history.length===s.deck.length?'finished':'ready';return true;}
  function accepts(event,source,origin,token,slug){var d=event.data;return event.source===source&&event.origin===origin&&!!d&&d.type==='mini-mix-result'&&d.round===token&&d.game===slug&&[0,1,2].indexOf(d.winner)>=0;}
  return {games:games,create:create,restore:restore,score:score,start:start,finish:finish,next:next,accepts:accepts};
});
