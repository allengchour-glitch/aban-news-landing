/* Rundenspiel-Regeln. Keine Abhängigkeit vom Browser oder von einzelnen Spielständen. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MixRules=factory();})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  var games=['drei-gewinnt','vier-gewinnt','memory','schere-stein-papier','reaktions-duell','tap-duell','pong','tauziehen','mathe-duell','farb-klick','elfmeter','hoch-tief','simon','schlange-duell','ballon-pump','auto-rennen','maulwurf','quiz-buzzer','stapel-turm','punkte-jagd'];
  var groups={
    'drei-gewinnt':'kopf','vier-gewinnt':'kopf','memory':'kopf','schere-stein-papier':'kopf','mathe-duell':'kopf','hoch-tief':'kopf','simon':'kopf','quiz-buzzer':'kopf',
    'reaktions-duell':'tempo','tap-duell':'tempo','farb-klick':'tempo','maulwurf':'tempo','punkte-jagd':'tempo',
    'pong':'geschick','tauziehen':'geschick','elfmeter':'geschick','schlange-duell':'geschick','ballon-pump':'geschick','auto-rennen':'geschick','stapel-turm':'geschick'
  },sequence=0;
  function name(value,fallback){return typeof value==='string'&&value.trim()?value.trim().slice(0,20):fallback;}
  function validId(value){return typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value);}
  function validAvatars(value){return Array.isArray(value)&&value.length===2&&Number.isInteger(value[0])&&Number.isInteger(value[1])&&value[0]>=0&&value[0]<=5&&value[1]>=0&&value[1]<=5;}
  function draw(random){var value=random();return typeof value==='number'&&!Number.isNaN(value)?Math.max(0,Math.min(.999999,value)):0;}
  function newId(random){
    var entropy=typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Math.floor(draw(random||Math.random)*0x100000000).toString(36);
    return 'mix-'+Date.now().toString(36)+'-'+(++sequence).toString(36)+'-'+entropy;
  }
  function legacyId(deck,names){
    // Nur unveränderliche Inhalte: dieselbe alte Partie behält ihre ID in jeder Phase.
    var text=JSON.stringify([deck,names]),a=2166136261,b=5381;
    for(var i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
    return 'legacy-'+(a>>>0).toString(36)+'-'+(b>>>0).toString(36);
  }
  function create(rounds,names,random,options){
    if([3,5,7].indexOf(rounds)<0)throw Error('Ungültige Rundenzahl');
    if(options===undefined)options={};
    if(!options||typeof options!=='object'||Array.isArray(options)||options.id!==undefined&&!validId(options.id)||options.avatars!==undefined&&!validAvatars(options.avatars))throw Error('Ungültige Match-Metadaten');
    var deck=games.slice();random=random||Math.random;
    for(var i=deck.length-1;i>0;i--){var j=Math.floor(draw(random)*(i+1)),x=deck[i];deck[i]=deck[j];deck[j]=x;}
    var first=[],seen=[];
    deck.forEach(function(g){if(seen.indexOf(groups[g])<0){seen.push(groups[g]);first.push(g);}});
    deck=first.concat(deck.filter(function(g){return first.indexOf(g)<0;}));
    return {v:1,id:options.id===undefined?newId(random):options.id,avatars:options.avatars===undefined?[0,1]:options.avatars.slice(),deck:deck.slice(0,rounds),names:[name(names&&names[0],'Spieler 1'),name(names&&names[1],'Spieler 2')],history:[],phase:'ready'};
  }
  function restore(raw){
    try{
      var s=typeof raw==='string'?JSON.parse(raw):raw;
      if(!s||s.v!==1||!Array.isArray(s.deck)||[3,5,7].indexOf(s.deck.length)<0||new Set(s.deck).size!==s.deck.length||Array.from(s.deck).some(function(g){return games.indexOf(g)<0;})||!Array.isArray(s.history)||s.history.length>s.deck.length||Array.from(s.history).some(function(w){return [null,0,1,2].indexOf(w)<0;})||!Array.isArray(s.names)||s.names.length!==2||['ready','playing','result','finished'].indexOf(s.phase)<0)return null;
      if(s.phase==='finished'&&s.history.length!==s.deck.length||s.phase==='result'&&!s.history.length||['ready','playing'].indexOf(s.phase)>=0&&s.history.length===s.deck.length)return null;
      if(s.id!==undefined&&!validId(s.id)||s.avatars!==undefined&&!validAvatars(s.avatars))return null;
      var names=[name(s.names[0],'Spieler 1'),name(s.names[1],'Spieler 2')];
      return {v:1,id:s.id===undefined?legacyId(s.deck,names):s.id,avatars:s.avatars===undefined?[0,1]:s.avatars.slice(),deck:s.deck.slice(),names:names,history:s.history.slice(),phase:s.phase==='playing'?'ready':s.phase};
    }catch(_){return null;}
  }
  function rematch(run,random){
    var s=restore(run);if(!s)throw Error('Ungültige Partie');
    var id=newId(random);if(id===s.id)id=newId(random);
    return {v:1,id:id,avatars:s.avatars.slice(),deck:s.deck.slice(),names:s.names.slice(),history:[],phase:'ready'};
  }
  function score(s){return s.history.reduce(function(p,w){if(w===0){p[0]++;p[1]++;}else if(w===1||w===2)p[w-1]+=3;return p;},[0,0]);}
  function start(s){if(s.phase!=='ready')return false;s.phase='playing';return true;}
  function finish(s,w){if(s.phase!=='playing'||[null,0,1,2].indexOf(w)<0)return false;s.history.push(w);s.phase='result';return true;}
  function next(s){if(s.phase!=='result')return false;s.phase=s.history.length===s.deck.length?'finished':'ready';return true;}
  function accepts(event,source,origin,token,slug){var d=event.data;return event.source===source&&event.origin===origin&&!!d&&d.type==='mini-mix-result'&&d.round===token&&d.game===slug&&[0,1,2].indexOf(d.winner)>=0;}
  return {games:games,groups:groups,create:create,restore:restore,rematch:rematch,score:score,start:start,finish:finish,next:next,accepts:accepts};
});
